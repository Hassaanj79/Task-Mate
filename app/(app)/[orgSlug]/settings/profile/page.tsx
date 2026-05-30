import { getActiveOrg, getProfile } from "@/lib/auth";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { ROLE_LABEL } from "@/lib/rbac";

export default async function ProfileSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [org, profile] = await Promise.all([getActiveOrg(orgSlug), getProfile()]);
  if (!profile) return null;

  return (
    <SettingsLayout>
      <div className="mx-auto max-w-3xl px-8 py-8">
        <ProfileSettings profile={profile} roleLabel={ROLE_LABEL[org.role]} />
      </div>
    </SettingsLayout>
  );
}
