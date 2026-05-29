"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { POSITION_STEP } from "@/lib/constants";
import type { TaskPriority } from "@/lib/database.types";

async function logActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  taskId: string,
  actorId: string,
  action: string,
  meta?: Record<string, unknown>,
) {
  await supabase.from("activity_log").insert({
    org_id: orgId,
    task_id: taskId,
    actor_id: actorId,
    action,
    meta: meta ?? null,
  });
}

export async function createTask(input: {
  orgId: string;
  projectId: string;
  statusId: string | null;
  title: string;
  parentId?: string | null;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const title = input.title.trim();
  if (!title) return { error: "Title is required." };

  // Place at the bottom of the target column.
  let position = POSITION_STEP;
  if (input.statusId) {
    const { data: last } = await supabase
      .from("tasks")
      .select("position")
      .eq("project_id", input.projectId)
      .eq("status_id", input.statusId)
      .is("parent_id", null)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last) position = Number(last.position) + POSITION_STEP;
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      org_id: input.orgId,
      project_id: input.projectId,
      status_id: input.statusId,
      parent_id: input.parentId ?? null,
      title,
      position,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not create task." };
  await logActivity(supabase, input.orgId, data.id, user.id, "created");
  return { error: null, id: data.id };
}

export async function updateTaskFields(
  taskId: string,
  orgId: string,
  patch: {
    title?: string;
    description?: unknown;
    priority?: TaskPriority;
    assignee_id?: string | null;
    due_date?: string | null;
    status_id?: string | null;
  },
) {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update(patch as never)
    .eq("id", taskId);
  if (error) return { error: error.message };

  const action = Object.keys(patch)[0] ?? "updated";
  await logActivity(supabase, orgId, taskId, user.id, `updated_${action}`, patch as Record<string, unknown>);
  return { error: null };
}

// Persist a drag: new column + fractional position between neighbours.
export async function moveTask(
  taskId: string,
  orgId: string,
  statusId: string | null,
  position: number,
) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status_id: statusId, position })
    .eq("id", taskId);
  if (error) return { error: error.message };
  await logActivity(supabase, orgId, taskId, user.id, "status_changed", {
    status_id: statusId,
  });
  return { error: null };
}

export async function deleteTask(taskId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function setTaskLabel(
  taskId: string,
  orgId: string,
  labelId: string,
  attach: boolean,
) {
  await requireUser();
  const supabase = await createClient();
  if (attach) {
    const { error } = await supabase
      .from("task_labels")
      .insert({ task_id: taskId, label_id: labelId, org_id: orgId });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("task_labels")
      .delete()
      .eq("task_id", taskId)
      .eq("label_id", labelId);
    if (error) return { error: error.message };
  }
  return { error: null };
}

export async function createLabel(orgId: string, name: string, color: string) {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("labels")
    .insert({ org_id: orgId, name: name.trim(), color })
    .select("*")
    .single();
  if (error) return { error: error.message };
  return { error: null, label: data };
}
