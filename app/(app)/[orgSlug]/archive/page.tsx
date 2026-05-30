import { getActiveOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ArchiveView, type ArchivedItem } from "@/components/screens/archive-view";

export default async function ArchivePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getActiveOrg(orgSlug);
  const supabase = await createClient();

  const [{ data: tasks }, { data: projects }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, archived_at, project_id, projects(name)")
      .eq("org_id", org.id)
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, name, color, icon, archived_at")
      .eq("org_id", org.id)
      .eq("archived", true)
      .order("archived_at", { ascending: false }),
  ]);

  const taskItems: ArchivedItem[] = (tasks ?? []).map((t) => ({
    id: t.id,
    kind: "task",
    title: t.title,
    subtitle:
      (t.projects as unknown as { name: string } | null)?.name ?? "Project",
    archivedAt: t.archived_at!,
    color: null,
    icon: null,
  }));

  const projectItems: ArchivedItem[] = (projects ?? []).map((p) => ({
    id: p.id,
    kind: "project",
    title: p.name,
    subtitle: "Project",
    archivedAt: p.archived_at ?? new Date().toISOString(),
    color: p.color,
    icon: p.icon,
  }));

  return (
    <ArchiveView
      orgSlug={orgSlug}
      projects={projectItems}
      tasks={taskItems}
    />
  );
}
