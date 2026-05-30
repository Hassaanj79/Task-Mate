"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { STATUS_COLORS, LABEL_COLORS, POSITION_STEP } from "@/lib/constants";
import type { TaskPriority } from "@/lib/database.types";

export type ImportRow = {
  title: string;
  status?: string;
  priority?: string;
  assignee?: string;
  due?: string;
  labels?: string;
  description?: string;
};

const PRIORITY_MAP: Record<string, TaskPriority> = {
  urgent: "urgent",
  critical: "urgent",
  highest: "urgent",
  high: "high",
  medium: "medium",
  med: "medium",
  normal: "medium",
  low: "low",
  lowest: "low",
  none: "none",
  "no priority": "none",
};

function mapPriority(v?: string): TaskPriority {
  if (!v) return "none";
  return PRIORITY_MAP[v.toLowerCase().trim()] ?? "none";
}

function toTiptap(text?: string) {
  const t = (text ?? "").trim();
  if (!t) return null;
  return {
    type: "doc",
    content: t.split(/\n+/).map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  };
}

function parseDue(v?: string): string | null {
  if (!v?.trim()) return null;
  const d = new Date(v.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function importTasks(
  orgId: string,
  orgSlug: string,
  projectName: string,
  rows: ImportRow[],
) {
  const user = await requireUser();
  if (!projectName.trim()) return { error: "Project name is required." };
  if (rows.length === 0) return { error: "No rows to import." };

  const supabase = await createClient();

  // 1. Project
  const { data: project, error: pErr } = await supabase
    .from("projects")
    .insert({ org_id: orgId, name: projectName.trim(), created_by: user.id })
    .select("id")
    .single();
  if (pErr || !project) return { error: pErr?.message ?? "Could not create project." };
  const projectId = project.id;

  // 2. Lookups: members (assignee match) + existing labels
  const [{ data: memberRows }, { data: existingLabels }] = await Promise.all([
    supabase.from("organization_members").select("profiles(id, email, full_name)").eq("org_id", orgId),
    supabase.from("labels").select("id, name").eq("org_id", orgId),
  ]);
  const members = (memberRows ?? [])
    .map((r) => r.profiles as unknown as { id: string; email: string; full_name: string | null })
    .filter(Boolean);
  const memberByKey = new Map<string, string>();
  for (const m of members) {
    if (m.email) memberByKey.set(m.email.toLowerCase(), m.id);
    if (m.full_name) memberByKey.set(m.full_name.toLowerCase().trim(), m.id);
  }

  const labelByName = new Map<string, string>();
  for (const l of existingLabels ?? []) labelByName.set(l.name.toLowerCase().trim(), l.id);

  // 3. Status map — create columns on demand, in first-seen order.
  const statusByName = new Map<string, string>();
  let statusPos = 0;
  async function ensureStatus(name: string): Promise<string | null> {
    const key = name.toLowerCase().trim();
    if (!key) return null;
    if (statusByName.has(key)) return statusByName.get(key)!;
    const { data, error } = await supabase
      .from("task_statuses")
      .insert({
        org_id: orgId,
        project_id: projectId,
        name: name.trim(),
        color: STATUS_COLORS[statusPos % STATUS_COLORS.length],
        position: statusPos,
      })
      .select("id")
      .single();
    statusPos += 1;
    if (error || !data) return null;
    statusByName.set(key, data.id);
    return data.id;
  }

  async function ensureLabel(name: string): Promise<string | null> {
    const key = name.toLowerCase().trim();
    if (!key) return null;
    if (labelByName.has(key)) return labelByName.get(key)!;
    const { data, error } = await supabase
      .from("labels")
      .insert({ org_id: orgId, name: name.trim(), color: LABEL_COLORS[labelByName.size % LABEL_COLORS.length] })
      .select("id")
      .single();
    if (error || !data) return null;
    labelByName.set(key, data.id);
    return data.id;
  }

  // 4. Rows
  const posByStatus = new Map<string, number>();
  let created = 0;

  for (const row of rows) {
    const title = (row.title ?? "").trim();
    if (!title) continue;

    const statusId = row.status ? await ensureStatus(row.status) : null;
    const posKey = statusId ?? "none";
    const n = (posByStatus.get(posKey) ?? 0) + 1;
    posByStatus.set(posKey, n);

    const assigneeId = row.assignee
      ? memberByKey.get(row.assignee.toLowerCase().trim()) ?? null
      : null;

    const { data: task, error: tErr } = await supabase
      .from("tasks")
      .insert({
        org_id: orgId,
        project_id: projectId,
        status_id: statusId,
        title,
        description: toTiptap(row.description) as never,
        priority: mapPriority(row.priority),
        assignee_id: assigneeId,
        due_date: parseDue(row.due),
        position: n * POSITION_STEP,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (tErr || !task) continue;
    created += 1;

    // labels (comma or semicolon separated)
    const names = (row.labels ?? "")
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const ln of names) {
      const labelId = await ensureLabel(ln);
      if (labelId)
        await supabase
          .from("task_labels")
          .insert({ task_id: task.id, label_id: labelId, org_id: orgId });
    }
  }

  revalidatePath(`/${orgSlug}`, "layout");
  return { error: null, projectId, created };
}
