import { getActiveOrg, getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MyTasksView, type MyTask } from "@/components/screens/my-tasks-view";

export default async function MyTasksPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [org, user] = await Promise.all([getActiveOrg(orgSlug), getUser()]);
  const supabase = await createClient();

  const [{ data: tasks }, { data: projects }, { data: statuses }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, due_date, priority, status_id, project_id")
        .eq("org_id", org.id)
        .eq("assignee_id", user!.id)
        .is("parent_id", null)
        .is("archived_at", null),
      supabase.from("projects").select("id, name, color, icon").eq("org_id", org.id),
      supabase
        .from("task_statuses")
        .select("id, name, color, position, project_id")
        .eq("org_id", org.id),
    ]);

  // Each project's "done" status = highest position.
  const doneByProject = new Map<string, { id: string; pos: number }>();
  for (const s of statuses ?? []) {
    const cur = doneByProject.get(s.project_id);
    if (!cur || s.position > cur.pos)
      doneByProject.set(s.project_id, { id: s.id, pos: s.position });
  }
  const statusById = new Map((statuses ?? []).map((s) => [s.id, s]));
  const projectById = new Map((projects ?? []).map((p) => [p.id, p]));

  const rows: MyTask[] = (tasks ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    due_date: t.due_date,
    priority: t.priority,
    projectId: t.project_id,
    projectName: projectById.get(t.project_id)?.name ?? "Project",
    projectColor: projectById.get(t.project_id)?.color ?? null,
    projectIcon: projectById.get(t.project_id)?.icon ?? null,
    statusName: t.status_id ? statusById.get(t.status_id)?.name ?? null : null,
    statusColor: t.status_id ? statusById.get(t.status_id)?.color ?? null : null,
    done: t.status_id === doneByProject.get(t.project_id)?.id,
  }));

  return <MyTasksView orgSlug={orgSlug} tasks={rows} />;
}
