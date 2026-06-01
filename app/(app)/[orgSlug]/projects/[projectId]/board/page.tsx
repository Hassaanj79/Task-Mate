import { createClient } from "@/lib/supabase/server";
import { BoardView } from "@/components/board/board-view";
import type { TaskWithLabels } from "@/lib/queries";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const [{ data: statuses }, { data: tasks }, { data: links }] = await Promise.all([
    supabase
      .from("task_statuses")
      .select("*")
      .eq("project_id", projectId)
      .order("position", { ascending: true }),
    supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .is("parent_id", null)
      .is("archived_at", null)
      .order("position", { ascending: true }),
    supabase.from("task_labels").select("task_id, label_id"),
  ]);

  const byTask = new Map<string, string[]>();
  for (const l of links ?? []) {
    const arr = byTask.get(l.task_id) ?? [];
    arr.push(l.label_id);
    byTask.set(l.task_id, arr);
  }

  const ids = (tasks ?? []).map((t) => t.id);
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: cmts } = await supabase
      .from("comments")
      .select("task_id")
      .in("task_id", ids);
    for (const c of cmts ?? [])
      counts.set(c.task_id, (counts.get(c.task_id) ?? 0) + 1);
  }

  const initialTasks: TaskWithLabels[] = (tasks ?? []).map((t) => ({
    ...t,
    label_ids: byTask.get(t.id) ?? [],
    comment_count: counts.get(t.id) ?? 0,
  }));

  return (
    <BoardView initialStatuses={statuses ?? []} initialTasks={initialTasks} />
  );
}
