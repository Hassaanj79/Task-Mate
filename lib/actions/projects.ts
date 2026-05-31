"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getTemplate } from "@/lib/templates";
import { POSITION_STEP } from "@/lib/constants";

export async function createProject(
  orgId: string,
  orgSlug: string,
  formData: FormData,
) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "oklch(0.66 0.15 42)");
  const icon = String(formData.get("icon") ?? "folder");
  const description = String(formData.get("description") ?? "").trim() || null;
  const parentId = String(formData.get("parent_id") ?? "").trim() || null;
  const visibility =
    String(formData.get("visibility") ?? "workspace") === "private"
      ? "private"
      : "workspace";
  if (!name) return { error: "Project name is required." };

  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      org_id: orgId,
      parent_id: parentId,
      name,
      color,
      icon,
      description,
      visibility,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !project) return { error: error?.message ?? "Could not create project." };

  // Private project: grant the creator access so they keep seeing it.
  if (visibility === "private") {
    await supabase
      .from("project_members")
      .insert({ project_id: project.id, user_id: user.id, org_id: orgId, added_by: user.id });
  }

  const template = getTemplate(String(formData.get("template") ?? "blank"));

  // Seed board columns from the template; capture ids ordered by position.
  const { data: createdStatuses, error: statusError } = await supabase
    .from("task_statuses")
    .insert(
      template.statuses.map((s, i) => ({
        org_id: orgId,
        project_id: project.id,
        name: s.name,
        color: s.color,
        position: i,
      })),
    )
    .select("id, position");
  if (statusError) return { error: statusError.message };

  const statusByIndex = (createdStatuses ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((s) => s.id);

  // Seed workspace labels from the template, skipping any that already exist.
  if (template.labels.length > 0) {
    const { data: existing } = await supabase
      .from("labels")
      .select("name")
      .eq("org_id", orgId);
    const have = new Set((existing ?? []).map((l) => l.name.toLowerCase()));
    const toCreate = template.labels.filter((l) => !have.has(l.name.toLowerCase()));
    if (toCreate.length > 0) {
      await supabase
        .from("labels")
        .insert(toCreate.map((l) => ({ org_id: orgId, name: l.name, color: l.color })));
    }
  }

  // Seed starter tasks into their columns.
  if (template.tasks.length > 0) {
    const perColumn = new Map<number, number>();
    const rows = template.tasks.map((t) => {
      const n = perColumn.get(t.status) ?? 0;
      perColumn.set(t.status, n + 1);
      return {
        org_id: orgId,
        project_id: project.id,
        status_id: statusByIndex[t.status] ?? null,
        title: t.title,
        priority: t.priority ?? "none",
        position: (n + 1) * POSITION_STEP,
        created_by: user.id,
      };
    });
    await supabase.from("tasks").insert(rows);
  }

  revalidatePath(`/${orgSlug}`, "layout");
  return { error: null, projectId: project.id };
}

export async function updateProject(
  projectId: string,
  orgSlug: string,
  formData: FormData,
) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "oklch(0.66 0.15 42)");
  const icon = String(formData.get("icon") ?? "folder");
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) return { error: "Project name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ name, color, icon, description })
    .eq("id", projectId);

  if (error) return { error: error.message };
  revalidatePath(`/${orgSlug}`, "layout");
  return { error: null };
}

export async function setProjectArchived(
  projectId: string,
  orgSlug: string,
  archived: boolean,
) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      archived,
      archived_at: archived ? new Date().toISOString() : null,
    })
    .eq("id", projectId);
  if (error) return { error: error.message };
  revalidatePath(`/${orgSlug}`, "layout");
  return { error: null };
}

export async function deleteProject(projectId: string, orgSlug: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) return { error: error.message };
  revalidatePath(`/${orgSlug}`, "layout");
  return { error: null };
}

export async function setProjectVisibility(
  projectId: string,
  orgId: string,
  orgSlug: string,
  visibility: "workspace" | "private",
) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ visibility })
    .eq("id", projectId);
  if (error) return { error: error.message };
  // Going private: ensure the editor keeps access.
  if (visibility === "private") {
    await supabase
      .from("project_members")
      .insert({ project_id: projectId, user_id: user.id, org_id: orgId, added_by: user.id })
      .select()
      .maybeSingle();
  }
  revalidatePath(`/${orgSlug}`, "layout");
  return { error: null };
}

export async function addProjectMember(
  projectId: string,
  orgId: string,
  orgSlug: string,
  userId: string,
) {
  const user = await requireUser();
  const supabase = await createClient();

  // The project must belong to this org, and the user being granted access
  // must already be a member of it — no cross-tenant grafting.
  const { data: project } = await supabase
    .from("projects")
    .select("org_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project || project.org_id !== orgId) return { error: "Project not found." };

  const { data: target } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!target) return { error: "That user is not a member of this workspace." };

  const { error } = await supabase
    .from("project_members")
    .insert({ project_id: projectId, user_id: userId, org_id: orgId, added_by: user.id });
  if (error && !error.message.includes("duplicate")) return { error: error.message };
  revalidatePath(`/${orgSlug}`, "layout");
  return { error: null };
}

export async function removeProjectMember(
  projectId: string,
  orgSlug: string,
  userId: string,
) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath(`/${orgSlug}`, "layout");
  return { error: null };
}
