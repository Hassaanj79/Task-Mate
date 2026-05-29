import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Organization, OrgRole, Profile } from "@/lib/database.types";

// Current authenticated user (or null). Cached per request.
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// Require a session; redirect to /login otherwise. Returns the user.
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data;
});

export type MembershipOrg = Organization & { role: OrgRole };

// All orgs the current user belongs to, with their role in each.
export const getUserOrgs = cache(async (): Promise<MembershipOrg[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("role, organizations(*)")
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data
    .filter((row) => row.organizations)
    .map((row) => ({
      ...(row.organizations as unknown as Organization),
      role: row.role as OrgRole,
    }));
});

// Resolve the active org by slug from the URL. Redirects if the user
// isn't a member (RLS would hide it anyway, this is the friendly path).
export async function getActiveOrg(slug: string): Promise<MembershipOrg> {
  const orgs = await getUserOrgs();
  const org = orgs.find((o) => o.slug === slug);
  if (!org) redirect("/");
  return org;
}
