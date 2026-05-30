-- New workspaces start with task-type labels (Bug, Feature request, …).
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

  insert into public.labels (org_id, name, color) values
    (v_org.id, 'Bug',             'oklch(0.6 0.18 25)'),
    (v_org.id, 'Feature request', 'oklch(0.62 0.13 250)'),
    (v_org.id, 'Technical Debt',  'oklch(0.7 0.13 70)'),
    (v_org.id, 'Improvement',     'oklch(0.64 0.13 155)'),
    (v_org.id, 'Documentation',   'oklch(0.6 0.14 300)'),
    (v_org.id, 'Research',        'oklch(0.65 0.15 350)'),
    (v_org.id, 'Design',          'oklch(0.66 0.15 42)'),
    (v_org.id, 'Chore',           'oklch(0.62 0.02 260)');

  return v_org;
end;
$$;
