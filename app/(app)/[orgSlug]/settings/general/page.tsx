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
      <div className="mx-auto max-w-2xl px-8 py-8">
        <GeneralSettings
          orgId={org.id}
          orgSlug={orgSlug}
          name={org.name}
          slug={org.slug}
          role={org.role}
        />
      </div>
    </SettingsLayout>
  );
}
