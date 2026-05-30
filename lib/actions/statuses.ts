"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function createStatus(
  orgId: string,
  projectId: string,
  name: string,
  color: string,
) {
  await requireUser();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Column name is required." };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("task_statuses")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("task_statuses").insert({
    org_id: orgId,
    project_id: projectId,
    name: trimmed,
    color,
    position: (last?.position ?? -1) + 1,
  });
  if (error) return { error: error.message };
  return { error: null };
}

// Persist a new ordering of board columns.
export async function reorderStatuses(updates: { id: string; position: number }[]) {
  await requireUser();
  const supabase = await createClient();
  for (const u of updates) {
    const { error } = await supabase
      .from("task_statuses")
      .update({ position: u.position })
      .eq("id", u.id);
    if (error) return { error: error.message };
  }
  return { error: null };
}

export async function renameStatus(id: string, name: string) {
  await requireUser();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Column name is required." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_statuses")
    .update({ name: trimmed })
    .eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

export async function setStatusColor(id: string, color: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_statuses")
    .update({ color })
    .eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

// Tasks in this column have status_id set to null (FK on delete set null).
export async function deleteStatus(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("task_statuses").delete().eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}
