"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { OrgRole } from "@/lib/database.types";

const ASSIGNABLE: OrgRole[] = ["admin", "member", "guest"];

export async function inviteMember(
  orgId: string,
  orgSlug: string,
  formData: FormData,
) {
  await requireUser();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "member") as OrgRole;
  if (!email) return { error: "Email is required." };
  if (!ASSIGNABLE.includes(role)) return { error: "Invalid role." };

  const supabase = await createClient();
  // upsert-style: replace any prior invite for this email in this org.
  const { error } = await supabase
    .from("invitations")
    .upsert(
      {
        org_id: orgId,
        email,
        role,
        status: "pending",
        invited_by: (await requireUser()).id,
      },
      { onConflict: "org_id,email" },
    );

  if (error) return { error: error.message };
  revalidatePath(`/${orgSlug}/settings/members`);
  return { error: null };
}

export async function revokeInvite(inviteId: string, orgSlug: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("invitations").delete().eq("id", inviteId);
  if (error) return { error: error.message };
  revalidatePath(`/${orgSlug}/settings/members`);
  return { error: null };
}

const ALL_ROLES: OrgRole[] = ["owner", "admin", "member", "guest"];

export async function changeMemberRole(
  memberId: string,
  orgSlug: string,
  role: OrgRole,
) {
  const user = await requireUser();
  if (!ALL_ROLES.includes(role)) return { error: "Invalid role." };
  const supabase = await createClient();

  // Look up the target row so we can reason about org + current role.
  const { data: target } = await supabase
    .from("organization_members")
    .select("org_id, role, user_id")
    .eq("id", memberId)
    .maybeSingle();
  if (!target) return { error: "Member not found." };

  // The caller's own role in that org decides what they may grant.
  const { data: me } = await supabase
    .from("organization_members")
    .select("role")
    .eq("org_id", target.org_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) return { error: "Not a member of this workspace." };

  // Only an owner may grant or revoke the owner role.
  if ((role === "owner" || target.role === "owner") && me.role !== "owner")
    return { error: "Only an owner can change the owner role." };

  const { error } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("id", memberId);
  if (error) return { error: error.message };
  revalidatePath(`/${orgSlug}/settings/members`);
  return { error: null };
}

export async function removeMember(memberId: string, orgSlug: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId);
  if (error) return { error: error.message };
  revalidatePath(`/${orgSlug}/settings/members`);
  return { error: null };
}

// Called from /invite/[token]: joins the signed-in user to the org via the
// SECURITY DEFINER RPC, which checks the token + email match server-side.
export async function acceptInvitation(token: string) {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", {
    p_token: token,
  });
  if (error) return { error: error.message };

  const { data: org } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", data as string)
    .single();

  revalidatePath("/", "layout");
  if (org?.slug) redirect(`/${org.slug}`);
  redirect("/");
}
