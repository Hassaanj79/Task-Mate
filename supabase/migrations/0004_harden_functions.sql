-- ============================================================
-- Security hardening (from Supabase advisors)
-- ============================================================

-- Pin search_path on the trigger function.
create or replace function public.touch_updated_at()
returns trigger language plpgsql
set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- Postgres grants EXECUTE to PUBLIC by default, which exposes these via
-- /rest/v1/rpc to the anon role. Restrict to the roles that should call them.

-- Trigger-only: never call directly.
revoke execute on function public.handle_new_user() from public;

-- Signed-in users only (anon has no use for these and would just error).
revoke execute on function public.accept_invitation(text) from public;
grant execute on function public.accept_invitation(text) to authenticated;

revoke execute on function public.create_organization(text, text) from public;
grant execute on function public.create_organization(text, text) to authenticated;

-- Note: is_org_member / has_org_role intentionally remain executable — RLS
-- policies reference them and evaluate with the querying role's privileges.
