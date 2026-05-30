"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export type AutomationInput = {
  name: string;
  projectId: string | null;
  trigger: Record<string, unknown>;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>[];
  enabled?: boolean;
};

export async function createAutomation(orgId: string, orgSlug: string, input: AutomationInput) {
  const user = await requireUser();
  if (!input.name.trim()) return { error: "Name is required." };
  if (!input.trigger?.type) return { error: "Pick a trigger." };
  if (!input.actions?.length) return { error: "Add at least one action." };

  const supabase = await createClient();
  const { error } = await supabase.from("automations").insert({
    org_id: orgId,
    project_id: input.projectId,
    name: input.name.trim(),
    trigger: input.trigger,
    conditions: input.conditions,
    actions: input.actions,
    enabled: input.enabled ?? true,
    created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath(`/${orgSlug}/settings/automations`);
  return { error: null };
}

export async function updateAutomation(id: string, orgSlug: string, input: AutomationInput) {
  await requireUser();
  if (!input.name.trim()) return { error: "Name is required." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("automations")
    .update({
      name: input.name.trim(),
      project_id: input.projectId,
      trigger: input.trigger,
      conditions: input.conditions,
      actions: input.actions,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/${orgSlug}/settings/automations`);
  return { error: null };
}

export async function toggleAutomation(id: string, orgSlug: string, enabled: boolean) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("automations").update({ enabled }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/${orgSlug}/settings/automations`);
  return { error: null };
}

export async function deleteAutomation(id: string, orgSlug: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("automations").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/${orgSlug}/settings/automations`);
  return { error: null };
}
