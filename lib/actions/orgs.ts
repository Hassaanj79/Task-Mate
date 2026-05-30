"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "workspace";
}

export async function createOrg(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Workspace name is required." };

  const supabase = await createClient();

  // Ensure a unique slug.
  let slug = slugify(name);
  const suffix = Math.abs(hashCode(user.id + name)).toString(36).slice(0, 5);
  slug = `${slug}-${suffix}`;

  // Org + owner membership are created atomically by a SECURITY DEFINER RPC.
  // Doing it client-side hits an RLS bootstrap wall: the RETURNING row is
  // checked against the org SELECT policy (is_org_member) before the
  // membership row exists, and the membership insert itself requires you to
  // already be an admin. The RPC sidesteps both safely.
  const { data: org, error } = await supabase.rpc("create_organization", {
    p_name: name,
    p_slug: slug,
  });

  if (error || !org) return { error: error?.message ?? "Could not create workspace." };

  revalidatePath("/", "layout");
  redirect(`/${org.slug}`);
}

export async function updateOrg(orgId: string, slug: string, formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const str = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : v;
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      email: str("email"),
      phone: str("phone"),
      address: str("address"),
      website: str("website"),
      business_type: str("business_type"),
      company_size: str("company_size"),
      description: str("description"),
    })
    .eq("id", orgId);

  if (error) return { error: error.message };
  revalidatePath(`/${slug}`, "layout");
  return { error: null };
}

export async function setOrgLogo(orgId: string, slug: string, logoUrl: string | null) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ logo_url: logoUrl })
    .eq("id", orgId);
  if (error) return { error: error.message };
  revalidatePath(`/${slug}`, "layout");
  return { error: null };
}

export async function deleteOrg(orgId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("organizations").delete().eq("id", orgId);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect("/");
}

function hashCode(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}
