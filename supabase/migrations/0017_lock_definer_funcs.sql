-- ============================================================
-- Reduce exposed SECURITY DEFINER surface (Supabase advisor 0028/0029).
-- Trigger + cron functions are never meant to be called over the API.
-- RLS helper functions only need to run for the authenticated role
-- (policies call them as the querying user); revoke anon.
-- ============================================================

-- Trigger / cron functions: no client should call these directly.
revoke execute on function public.handle_new_user()             from public, anon, authenticated;
revoke execute on function public.enforce_member_role_change()  from public, anon, authenticated;
revoke execute on function public.purge_archived()              from public, anon, authenticated;
revoke execute on function public.run_due_automations()         from public, anon, authenticated;

-- RLS helpers: keep for authenticated (needed by policy evaluation), drop anon.
revoke execute on function public.is_org_member(uuid)            from anon;
revoke execute on function public.has_org_role(uuid, text[])     from anon;
revoke execute on function public.can_access_project(uuid)       from anon;
revoke execute on function public.can_write_project(uuid)        from anon;
revoke execute on function public.can_access_task(uuid)          from anon;
revoke execute on function public.can_write_task(uuid)           from anon;
