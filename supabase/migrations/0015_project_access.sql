-- ============================================================
-- Per-project access control.
-- visibility = 'workspace' (every org member) | 'private' (only added
-- members, plus org owners/admins). project_members lists explicit access.
-- ============================================================

alter table public.projects
  add column if not exists visibility text not null default 'workspace'
  check (visibility in ('workspace','private'));

create table if not exists public.project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  org_id     uuid not null references organizations(id) on delete cascade,
  added_by   uuid references profiles(id),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index if not exists project_members_user_idx on public.project_members(user_id);

alter table public.project_members enable row level security;
create policy "pm: member read" on public.project_members
  for select using (is_org_member(org_id));
create policy "pm: admins manage" on public.project_members
  for all using (has_org_role(org_id, array['owner','admin']))
  with check (has_org_role(org_id, array['owner','admin']));

-- ---- access helpers (SECURITY DEFINER, used inside policies) ----
create or replace function public.can_access_project(p_project uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from projects p
    join organization_members m on m.org_id = p.org_id and m.user_id = auth.uid()
    where p.id = p_project
      and ( p.created_by = auth.uid()
            or p.visibility = 'workspace'
            or m.role in ('owner','admin')
            or exists (select 1 from project_members pm
                       where pm.project_id = p.id and pm.user_id = auth.uid()) )
  );
$$;

create or replace function public.can_write_project(p_project uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from projects p
    join organization_members m on m.org_id = p.org_id and m.user_id = auth.uid()
    where p.id = p_project
      and m.role in ('owner','admin','member')
      and ( p.created_by = auth.uid()
            or p.visibility = 'workspace'
            or m.role in ('owner','admin')
            or exists (select 1 from project_members pm
                       where pm.project_id = p.id and pm.user_id = auth.uid()) )
  );
$$;

create or replace function public.can_access_task(p_task uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(can_access_project((select project_id from tasks where id = p_task)), false);
$$;

create or replace function public.can_write_task(p_task uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(can_write_project((select project_id from tasks where id = p_task)), false);
$$;

grant execute on function public.can_access_project(uuid) to authenticated, anon;
grant execute on function public.can_write_project(uuid)  to authenticated, anon;
grant execute on function public.can_access_task(uuid)    to authenticated, anon;
grant execute on function public.can_write_task(uuid)     to authenticated, anon;

-- ---- rewrite project-scoped policies to respect access ----

-- projects: inline column checks (NOT can_access_project) so INSERT ... RETURNING
-- works — a STABLE helper that re-selects the projects table can't see the
-- just-inserted row mid-statement and would reject the RETURNING.
drop policy if exists "projects: member read" on projects;
drop policy if exists "projects: member write" on projects;
create policy "projects: access read" on projects
  for select using (
    is_org_member(org_id) and (
      created_by = auth.uid()
      or visibility = 'workspace'
      or has_org_role(org_id, array['owner','admin'])
      or exists (select 1 from project_members pm where pm.project_id = id and pm.user_id = auth.uid())
    )
  );
create policy "projects: access write" on projects
  for all using (
    has_org_role(org_id, array['owner','admin','member']) and (
      created_by = auth.uid()
      or visibility = 'workspace'
      or has_org_role(org_id, array['owner','admin'])
      or exists (select 1 from project_members pm where pm.project_id = id and pm.user_id = auth.uid())
    )
  ) with check (is_org_member(org_id));

-- tasks
drop policy if exists "tasks: member read" on tasks;
drop policy if exists "tasks: member write" on tasks;
create policy "tasks: access read" on tasks
  for select using (can_access_project(project_id));
create policy "tasks: access write" on tasks
  for all using (can_write_project(project_id)) with check (can_write_project(project_id));

-- task_statuses
drop policy if exists "statuses: member read" on task_statuses;
drop policy if exists "statuses: member write" on task_statuses;
create policy "statuses: access read" on task_statuses
  for select using (can_access_project(project_id));
create policy "statuses: access write" on task_statuses
  for all using (can_write_project(project_id)) with check (can_write_project(project_id));

-- task_labels (scope via task)
drop policy if exists "task_labels: member read" on task_labels;
drop policy if exists "task_labels: member write" on task_labels;
create policy "task_labels: access read" on task_labels
  for select using (can_access_task(task_id));
create policy "task_labels: access write" on task_labels
  for all using (can_write_task(task_id)) with check (can_write_task(task_id));

-- comments (read by task access; create still requires author = self)
drop policy if exists "comments: member read" on comments;
drop policy if exists "comments: member create" on comments;
create policy "comments: access read" on comments
  for select using (can_access_task(task_id));
create policy "comments: access create" on comments
  for insert with check (can_access_task(task_id) and author_id = auth.uid());

-- attachments
drop policy if exists "attachments: member read" on attachments;
drop policy if exists "attachments: member write" on attachments;
create policy "attachments: access read" on attachments
  for select using (can_access_task(task_id));
create policy "attachments: access write" on attachments
  for all using (can_write_task(task_id)) with check (can_write_task(task_id));

-- activity_log (task-scoped where present)
drop policy if exists "activity: member read" on activity_log;
drop policy if exists "activity: member insert" on activity_log;
create policy "activity: access read" on activity_log
  for select using (
    case when task_id is null then is_org_member(org_id) else can_access_task(task_id) end
  );
create policy "activity: access insert" on activity_log
  for insert with check (
    case when task_id is null then is_org_member(org_id) else can_access_task(task_id) end
  );
