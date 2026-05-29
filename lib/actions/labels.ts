"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function createLabelAction(orgId: string, name: string, color: string) {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("labels")
    .insert({ org_id: orgId, name: name.trim(), color })
    .select("*")
    .single();
  if (error) return { error: error.message };
  return { error: null, label: data };
}

export async function updateLabelAction(
  id: string,
  patch: { name?: string; color?: string },
) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("labels").update(patch).eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteLabelAction(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("labels").delete().eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}
