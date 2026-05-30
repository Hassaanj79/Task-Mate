import { redirect } from "next/navigation";
import { getActiveOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canManageMembers } from "@/lib/rbac";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { AutomationsManager } from "@/components/automations/automations-manager";
import type { Automation, Profile } from "@/lib/database.types";

export default async function AutomationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getActiveOrg(orgSlug);
  // Automations are workspace config — admins/owners only.
  if (!canManageMembers(org.role)) redirect(`/${orgSlug}`);

  const supabase = await createClient();
  const [
    { data: automations },
    { data: projects },
    { data: statuses },
    { data: labels },
    { data: memberRows },
  ] = await Promise.all([
    supabase
      .from("automations")
      .select("*")
      .eq("org_id", org.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, name")
      .eq("org_id", org.id)
      .eq("archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("task_statuses")
      .select("id, name, color, project_id")
      .eq("org_id", org.id),
    supabase.from("labels").select("id, name, color").eq("org_id", org.id).order("name"),
    supabase.from("organization_members").select("profiles(*)").eq("org_id", org.id),
  ]);

  const members = (memberRows ?? [])
    .map((r) => r.profiles as unknown as Profile)
    .filter(Boolean);

  return (
    <SettingsLayout>
      <div className="mx-auto max-w-4xl px-8 py-8">
        <AutomationsManager
          orgId={org.id}
          orgSlug={orgSlug}
          automations={(automations ?? []) as Automation[]}
          projects={projects ?? []}
          statuses={statuses ?? []}
          labels={labels ?? []}
          members={members}
        />
      </div>
    </SettingsLayout>
  );
}
