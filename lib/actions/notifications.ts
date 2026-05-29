"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function markNotificationsRead(orgId: string, ids?: string[]) {
  await requireUser();
  const supabase = await createClient();
  let q = supabase.from("notifications").update({ read: true }).eq("org_id", orgId);
  if (ids && ids.length > 0) q = q.in("id", ids);
  const { error } = await q;
  if (error) return { error: error.message };
  return { error: null };
}
