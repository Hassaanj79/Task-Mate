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

export async function changeMemberRole(
  memberId: string,
  orgSlug: string,
  role: OrgRole,
) {
  await requireUser();
  const supabase = await createClient();
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
