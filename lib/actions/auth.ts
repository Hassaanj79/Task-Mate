"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export type AuthState = { error: string } | null;

export async function signInWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/");

  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect(redirectTo || "/");
}

export async function signUpWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const redirectTo = String(formData.get("redirect") ?? "/") || "/";

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 6)
    return { error: "Password must be at least 6 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || null },
      // After email confirmation, land back on wherever they came from
      // (e.g. an /invite/[token] page) so they can join the inviting org.
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
    },
  });
  if (error) return { error: error.message };

  // If email confirmation is required there is no session yet — preserve the
  // destination so the post-confirm sign-in returns to the invite.
  if (!data.session) {
    redirect(`/login?check_email=1&redirect=${encodeURIComponent(redirectTo)}`);
  }

  redirect(redirectTo);
}

export async function signInWithGoogle(formData: FormData) {
  const redirectTo = String(formData.get("redirect") ?? "/");
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? siteUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
    },
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  if (data.url) redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
