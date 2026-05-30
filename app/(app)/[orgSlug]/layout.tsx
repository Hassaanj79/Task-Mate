import { getActiveOrg, getProfile, getUser, getUserOrgs } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/app/shell";
import type { Profile } from "@/lib/database.types";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [org, orgs, profile, user] = await Promise.all([
    getActiveOrg(orgSlug),
    getUserOrgs(),
    getProfile(),
    getUser(),
  ]);

  const supabase = await createClient();
  const [{ data: projects }, myTasksRes, inboxRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, color, icon, parent_id")
      .eq("org_id", org.id)
      .eq("archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org.id)
      .eq("assignee_id", user!.id)
      .is("parent_id", null)
      .is("archived_at", null),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org.id)
      .eq("read", false),
  ]);

  return (
    <Shell
      data={{
        profile: profile as Profile | null,
        currentUserId: user!.id,
        orgs,
        activeSlug: orgSlug,
        activeOrg: org,
        projects: projects ?? [],
        role: org.role,
        counts: {
          myTasks: myTasksRes.count ?? 0,
          inbox: Math.min(inboxRes.count ?? 0, 99),
        },
      }}
    >
      {children}
    </Shell>
  );
}
