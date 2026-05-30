import { redirect } from "next/navigation";
import { getActiveOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canManageMembers } from "@/lib/rbac";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { ImportWizard } from "@/components/settings/import-wizard";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getActiveOrg(orgSlug);
  if (!canManageMembers(org.role)) redirect(`/${orgSlug}`);

  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("org_id", org.id)
    .eq("archived", false)
    .order("created_at", { ascending: true });

  return (
    <SettingsLayout>
      <div className="mx-auto max-w-3xl px-8 py-8">
        <ImportWizard orgId={org.id} orgSlug={orgSlug} projects={projects ?? []} />
      </div>
    </SettingsLayout>
  );
}
