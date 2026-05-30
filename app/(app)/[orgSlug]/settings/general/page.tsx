import { getActiveOrg } from "@/lib/auth";
import { GeneralSettings } from "@/components/org/general-settings";
import { SettingsLayout } from "@/components/settings/settings-layout";

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getActiveOrg(orgSlug);

  return (
    <SettingsLayout>
      <div className="mx-auto max-w-3xl px-8 py-8">
        <GeneralSettings org={org} role={org.role} />
      </div>
    </SettingsLayout>
  );
}
