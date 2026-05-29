import { createClient } from "@/lib/supabase/server";
import { ListView } from "@/components/list/list-view";
import type { TaskWithLabels } from "@/lib/queries";

export default async function ListPage({
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
      .order("position", { ascending: true }),
    supabase.from("task_labels").select("task_id, label_id"),
  ]);

  const byTask = new Map<string, string[]>();
  for (const l of links ?? []) {
    const arr = byTask.get(l.task_id) ?? [];
    arr.push(l.label_id);
    byTask.set(l.task_id, arr);
  }
  const initialTasks: TaskWithLabels[] = (tasks ?? []).map((t) => ({
    ...t,
    label_ids: byTask.get(t.id) ?? [],
  }));

  return <ListView initialStatuses={statuses ?? []} initialTasks={initialTasks} />;
}
