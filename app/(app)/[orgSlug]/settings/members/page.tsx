import { redirect } from "next/navigation";
import { getActiveOrg, getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canManageMembers } from "@/lib/rbac";
import { MembersManager } from "@/components/org/members-manager";
import { SettingsLayout } from "@/components/settings/settings-layout";
import type { Profile } from "@/lib/database.types";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [org, user] = await Promise.all([getActiveOrg(orgSlug), getUser()]);
  if (!canManageMembers(org.role)) redirect(`/${orgSlug}`);

  const supabase = await createClient();
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("id, role, user_id, created_at, profiles(*)")
      .eq("org_id", org.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("invitations")
      .select("*")
      .eq("org_id", org.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <SettingsLayout>
      <div className="mx-auto max-w-4xl px-8 py-8">
        <MembersManager
          orgId={org.id}
          orgSlug={orgSlug}
          currentUserId={user!.id}
          currentRole={org.role}
          members={(members ?? []).map((m) => ({
            id: m.id,
            role: m.role,
            user_id: m.user_id,
            profile: m.profiles as unknown as Profile,
          }))}
          invites={invites ?? []}
        />
      </div>
    </SettingsLayout>
  );
}
