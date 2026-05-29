import { createClient } from "@/lib/supabase/client";
import type {
  Attachment,
  Comment,
  Label,
  Profile,
  Task,
  TaskStatus,
} from "@/lib/database.types";

// Query key factories.
export const qk = {
  tasks: (projectId: string) => ["tasks", projectId] as const,
  task: (taskId: string) => ["task", taskId] as const,
  statuses: (projectId: string) => ["statuses", projectId] as const,
  comments: (taskId: string) => ["comments", taskId] as const,
  subtasks: (taskId: string) => ["subtasks", taskId] as const,
  attachments: (taskId: string) => ["attachments", taskId] as const,
  activity: (taskId: string) => ["activity", taskId] as const,
  taskLabels: (projectId: string) => ["task_labels", projectId] as const,
};

export type TaskWithLabels = Task & { label_ids: string[] };

export async function fetchStatuses(projectId: string): Promise<TaskStatus[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("task_statuses")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchTasks(projectId: string): Promise<TaskWithLabels[]> {
  const supabase = createClient();
  const [{ data: tasks, error }, { data: links }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .is("parent_id", null)
      .order("position", { ascending: true }),
    supabase.from("task_labels").select("task_id, label_id"),
  ]);
  if (error) throw error;

  const byTask = new Map<string, string[]>();
  for (const l of links ?? []) {
    const arr = byTask.get(l.task_id) ?? [];
    arr.push(l.label_id);
    byTask.set(l.task_id, arr);
  }
  return (tasks ?? []).map((t) => ({ ...t, label_ids: byTask.get(t.id) ?? [] }));
}

export async function fetchTask(taskId: string): Promise<TaskWithLabels | null> {
  const supabase = createClient();
  const [{ data: task, error }, { data: links }] = await Promise.all([
    supabase.from("tasks").select("*").eq("id", taskId).maybeSingle(),
    supabase.from("task_labels").select("label_id").eq("task_id", taskId),
  ]);
  if (error) throw error;
  if (!task) return null;
  return { ...task, label_ids: (links ?? []).map((l) => l.label_id) };
}

export async function fetchSubtasks(parentId: string): Promise<Task[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type CommentWithAuthor = Comment & { author: Profile | null };

export async function fetchComments(taskId: string): Promise<CommentWithAuthor[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*, author:profiles!comments_author_id_fkey(*)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((c) => ({
    ...(c as unknown as Comment),
    author: (c as unknown as { author: Profile | null }).author,
  }));
}

export async function fetchAttachments(taskId: string): Promise<Attachment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type ActivityWithActor = {
  id: string;
  action: string;
  meta: Record<string, unknown> | null;
  created_at: string;
  actor: Profile | null;
};

export async function fetchActivity(taskId: string): Promise<ActivityWithActor[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, action, meta, created_at, actor:profiles!activity_log_actor_id_fkey(*)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ActivityWithActor[];
}

export type OrgActivity = {
  id: string;
  action: string;
  meta: Record<string, unknown> | null;
  created_at: string;
  actor: Profile | null;
  task: { id: string; title: string; project_id: string } | null;
};

export async function fetchOrgActivity(
  orgId: string,
  limit = 20,
): Promise<OrgActivity[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select(
      "id, action, meta, created_at, actor:profiles!activity_log_actor_id_fkey(*), task:tasks(id, title, project_id)",
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as OrgActivity[];
}

export type NotificationRow = {
  id: string;
  type: string;
  body: string | null;
  read: boolean;
  created_at: string;
  actor: Profile | null;
  task: { id: string; title: string; project_id: string } | null;
};

// RLS restricts rows to the current recipient automatically.
export async function fetchNotifications(orgId: string): Promise<NotificationRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, type, body, read, created_at, actor:profiles!notifications_actor_id_fkey(*), task:tasks(id, title, project_id)",
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  return (data ?? []) as unknown as NotificationRow[];
}

export async function fetchLabels(orgId: string): Promise<Label[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("labels")
    .select("*")
    .eq("org_id", orgId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
