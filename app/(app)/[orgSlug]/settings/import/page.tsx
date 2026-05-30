import { redirect } from "next/navigation";
import { getActiveOrg } from "@/lib/auth";
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

  return (
    <SettingsLayout>
      <div className="mx-auto max-w-3xl px-8 py-8">
        <ImportWizard orgId={org.id} orgSlug={orgSlug} />
      </div>
    </SettingsLayout>
  );
}
