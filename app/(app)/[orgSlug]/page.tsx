import { Home } from "lucide-react";
import { getActiveOrg, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProjectGrid } from "@/components/project/project-grid";
import { Topbar } from "@/components/app/topbar";
import { DashboardPanels } from "@/components/screens/dashboard-panels";
import type { Profile } from "@/lib/database.types";

export default async function OrgDashboard({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [org, profile] = await Promise.all([getActiveOrg(orgSlug), getProfile()]);

  const supabase = await createClient();
  const [
    { data: projects },
    { data: statuses },
    { data: taskRows },
    { data: memberRows },
    { data: myTaskRows },
    { data: activityRows },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("org_id", org.id)
      .is("parent_id", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("task_statuses")
      .select("id, project_id, position, name, color")
      .eq("org_id", org.id),
    supabase
      .from("tasks")
      .select("project_id, status_id, assignee_id, due_date")
      .eq("org_id", org.id)
      .is("parent_id", null)
      .is("archived_at", null),
    supabase
      .from("organization_members")
      .select("profiles(*)")
      .eq("org_id", org.id),
    supabase
      .from("tasks")
      .select("id, title, due_date, status_id, project_id, projects(name, color, icon)")
      .eq("org_id", org.id)
      .eq("assignee_id", profile?.id ?? "")
      .is("parent_id", null)
      .is("archived_at", null)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(8),
    supabase
      .from("activity_log")
      .select(
        "id, action, created_at, actor:profiles!activity_log_actor_id_fkey(*), task:tasks(title, project_id)",
      )
      .eq("org_id", org.id)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  // Each project's "done" status = the column with the highest position.
  const doneByProject = new Map<string, { id: string; position: number }>();
  for (const s of statuses ?? []) {
    const cur = doneByProject.get(s.project_id);
    if (!cur || s.position > cur.position)
      doneByProject.set(s.project_id, { id: s.id, position: s.position });
  }

  const stats = new Map<
    string,
    { total: number; done: number; assignees: Set<string> }
  >();
  // eslint-disable-next-line react-hooks/purity -- server render, evaluated per request
  const soonCutoff = Date.now() + 7 * 86400000;
  let assignedToMe = 0;
  let dueSoon = 0;
  let completed = 0;

  for (const t of taskRows ?? []) {
    const st = stats.get(t.project_id) ?? {
      total: 0,
      done: 0,
      assignees: new Set<string>(),
    };
    st.total += 1;
    const doneId = doneByProject.get(t.project_id)?.id;
    const isDone = t.status_id === doneId;
    if (isDone) st.done += 1;
    if (t.assignee_id) st.assignees.add(t.assignee_id);
    stats.set(t.project_id, st);

    if (isDone) completed += 1;
    else {
      if (t.assignee_id === profile?.id) assignedToMe += 1;
      if (t.due_date) {
        const due = new Date(t.due_date).getTime();
        if (due <= soonCutoff) dueSoon += 1;
      }
    }
  }

  const members = (memberRows ?? [])
    .map((r) => r.profiles as unknown as Profile)
    .filter(Boolean);
  const memberById = new Map(members.map((m) => [m.id, m]));

  const projectsWithStats = (projects ?? []).map((p) => {
    const st = stats.get(p.id) ?? { total: 0, done: 0, assignees: new Set() };
    return {
      ...p,
      taskCount: st.total,
      doneCount: st.done,
      pct: st.total ? Math.round((st.done / st.total) * 100) : 0,
      assignees: [...st.assignees]
        .map((id) => memberById.get(id))
        .filter(Boolean) as Profile[],
    };
  });

  // "My upcoming tasks" — assigned to me, not done.
  const statusColorById = new Map(
    (statuses ?? []).map((s) => [s.id, s.color] as const),
  );
  const upcoming = (myTaskRows ?? [])
    .filter((t) => t.status_id !== doneByProject.get(t.project_id)?.id)
    .slice(0, 5)
    .map((t) => {
      const proj = t.projects as unknown as {
        name: string;
        color: string | null;
        icon: string | null;
      } | null;
      return {
        id: t.id,
        title: t.title,
        due: t.due_date,
        projectId: t.project_id,
        projectName: proj?.name ?? "Project",
        projectColor: proj?.color ?? null,
        projectIcon: proj?.icon ?? null,
        statusColor: t.status_id ? statusColorById.get(t.status_id) ?? null : null,
      };
    });

  const activity = (activityRows ?? []).map((a) => {
    const actor = a.actor as unknown as Profile | null;
    const task = a.task as unknown as { title: string; project_id: string } | null;
    return {
      id: a.id,
      action: a.action,
      created_at: a.created_at,
      actor,
      taskTitle: task?.title ?? "a task",
      projectId: task?.project_id ?? null,
    };
  });

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Home"
        icon={<Home className="size-[19px] text-muted-foreground" />}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <ProjectGrid
          orgId={org.id}
          orgSlug={orgSlug}
          role={org.role}
          userName={profile?.full_name ?? profile?.email?.split("@")[0] ?? "there"}
          stats={{
            assignedToMe,
            dueSoon,
            completed,
            projectCount: projectsWithStats.filter((p) => !p.archived).length,
          }}
          projects={projectsWithStats}
        />
        <DashboardPanels orgSlug={orgSlug} upcoming={upcoming} activity={activity} />
      </div>
      </div>
    </div>
  );
}
