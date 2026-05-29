-- ============================================================
-- Fix: org-creation bootstrap (chicken-and-egg with RLS)
--
-- `insert ... returning` (PostgREST return=representation) checks the new
-- row against the SELECT policy `is_org_member(id)`. A just-created org has
-- no membership yet, so the creator is not a member -> RLS rejects the
-- RETURNING row with "new row violates row-level security policy".
-- The follow-up organization_members insert hits the same wall (the manage
-- policy requires you to already be owner/admin).
--
-- Solution: do org + owner-membership creation in one SECURITY DEFINER RPC.
-- Also let a creator read their own org (defensive; helps any RETURNING path).
-- ============================================================

-- Creator can always read the orgs they created (covers RETURNING + bootstrap).
drop policy if exists "orgs: creator read" on organizations;
create policy "orgs: creator read" on organizations
  for select using (created_by = auth.uid());

-- Atomic org + owner membership creation, bypassing RLS safely.
create or replace function public.create_organization(p_name text, p_slug text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org public.organizations;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (p_name, p_slug, v_uid)
  returning * into v_org;

  insert into public.organization_members (org_id, user_id, role)
  values (v_org.id, v_uid, 'owner');

  return v_org;
end;
$$;

grant execute on function public.create_organization(text, text) to authenticated;
