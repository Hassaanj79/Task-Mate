import { notFound } from "next/navigation";
import { getActiveOrg, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProjectProvider } from "@/components/project/project-context";
import { ProjectHeader } from "@/components/project/project-header";
import { TaskPanel } from "@/components/task/task-panel";
import type { Profile } from "@/lib/database.types";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; projectId: string }>;
}) {
  const { orgSlug, projectId } = await params;
  const [org, user] = await Promise.all([getActiveOrg(orgSlug), requireUser()]);

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, color, icon, org_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project || project.org_id !== org.id) notFound();

  const { data: memberRows } = await supabase
    .from("organization_members")
    .select("profiles(*)")
    .eq("org_id", org.id);

  const members = (memberRows ?? [])
    .map((r) => r.profiles as unknown as Profile)
    .filter(Boolean);

  return (
    <ProjectProvider
      orgId={org.id}
      orgSlug={orgSlug}
      projectId={project.id}
      projectName={project.name}
      role={org.role}
      members={members}
      currentUserId={user.id}
    >
      <div className="flex h-full flex-col">
        <ProjectHeader
          projectId={project.id}
          projectName={project.name}
          projectColor={project.color}
          projectIcon={project.icon}
          orgSlug={orgSlug}
        />
        <div className="min-h-0 flex-1">{children}</div>
      </div>
      <TaskPanel />
    </ProjectProvider>
  );
}
