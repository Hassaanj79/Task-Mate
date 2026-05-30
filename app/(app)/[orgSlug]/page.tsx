import { Home } from "lucide-react";
import { getActiveOrg, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProjectGrid } from "@/components/project/project-grid";
import { Topbar } from "@/components/app/topbar";
import type { Profile } from "@/lib/database.types";

export default async function OrgDashboard({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [org, profile] = await Promise.all([getActiveOrg(orgSlug), getProfile()]);

  const supabase = await createClient();
  const [{ data: projects }, { data: statuses }, { data: taskRows }, { data: memberRows }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("*")
        .eq("org_id", org.id)
        .is("parent_id", null)
        .order("created_at", { ascending: true }),
      supabase
        .from("task_statuses")
        .select("id, project_id, position")
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
      </div>
      </div>
    </div>
  );
}
