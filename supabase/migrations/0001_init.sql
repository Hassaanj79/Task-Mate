-- ============================================================
-- TaskFlow initial schema + multi-tenant RLS
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type org_role as enum ('owner', 'admin', 'member', 'guest');
create type task_priority as enum ('none', 'low', 'medium', 'high', 'urgent');
create type invite_status as enum ('pending', 'accepted', 'revoked');

-- ------------------------------------------------------------
-- profiles : 1-1 mirror of auth.users (public-readable basics)
-- ------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- organizations (tenants)
-- ------------------------------------------------------------
create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  logo_url    text,
  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now()
);

create table organization_members (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  role        org_role not null default 'member',
  created_at  timestamptz not null default now(),
  unique (org_id, user_id)
);
create index on organization_members(user_id);
create index on organization_members(org_id);

create table invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  email       text not null,
  role        org_role not null default 'member',
  token       text not null unique default encode(gen_random_bytes(24),'hex'),
  status      invite_status not null default 'pending',
  invited_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now(),
  unique (org_id, email)
);

-- ------------------------------------------------------------
-- projects
-- ------------------------------------------------------------
create table projects (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  description text,
  color       text default '#6366f1',
  archived    boolean not null default false,
  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now()
);
create index on projects(org_id);

-- board columns, per project
create table task_statuses (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null,
  color       text default '#94a3b8',
  position    int  not null default 0
);
create index on task_statuses(project_id);

-- labels, per org
create table labels (
  id      uuid primary key default gen_random_uuid(),
  org_id  uuid not null references organizations(id) on delete cascade,
  name    text not null,
  color   text default '#64748b'
);

create table tasks (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  project_id   uuid not null references projects(id) on delete cascade,
  status_id    uuid references task_statuses(id) on delete set null,
  parent_id    uuid references tasks(id) on delete cascade,
  title        text not null,
  description  jsonb,                       -- Tiptap JSON
  priority     task_priority not null default 'none',
  assignee_id  uuid references profiles(id) on delete set null,
  due_date     timestamptz,
  position     numeric not null default 1000, -- fractional ordering within a column
  created_by   uuid not null references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on tasks(org_id);
create index on tasks(project_id);
create index on tasks(status_id);
create index on tasks(assignee_id);

create table task_labels (
  task_id   uuid not null references tasks(id) on delete cascade,
  label_id  uuid not null references labels(id) on delete cascade,
  org_id    uuid not null references organizations(id) on delete cascade,
  primary key (task_id, label_id)
);

create table comments (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  task_id     uuid not null references tasks(id) on delete cascade,
  author_id   uuid not null references profiles(id),
  body        jsonb not null,              -- Tiptap JSON
  created_at  timestamptz not null default now()
);
create index on comments(task_id);

create table attachments (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  task_id      uuid not null references tasks(id) on delete cascade,
  storage_path text not null,
  file_name    text not null,
  uploaded_by  uuid not null references profiles(id),
  created_at   timestamptz not null default now()
);

create table activity_log (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  task_id     uuid references tasks(id) on delete cascade,
  actor_id    uuid references profiles(id),
  action      text not null,               -- e.g. 'status_changed'
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index on activity_log(task_id);

-- ============================================================
-- Helper functions (SECURITY DEFINER -> bypass RLS, no recursion)
-- ============================================================
create or replace function public.is_org_member(p_org uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from organization_members m
    where m.org_id = p_org and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(p_org uuid, p_roles text[])
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from organization_members m
    where m.org_id = p_org and m.user_id = auth.uid()
      and m.role::text = any(p_roles)
  );
$$;

-- ============================================================
-- Auto-provision profile + first org on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
declare new_org uuid;
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email,
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'avatar_url');

  insert into public.organizations (name, slug, created_by)
  values (coalesce(new.raw_user_meta_data->>'full_name','My') || '''s Workspace',
          'org-' || substr(new.id::text,1,8), new.id)
  returning id into new_org;

  insert into public.organization_members (org_id, user_id, role)
  values (new_org, new.id, 'owner');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep tasks.updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger trg_tasks_touch before update on tasks
  for each row execute function public.touch_updated_at();

-- ============================================================
-- Enable RLS everywhere
-- ============================================================
alter table profiles              enable row level security;
alter table organizations         enable row level security;
alter table organization_members  enable row level security;
alter table invitations           enable row level security;
alter table projects              enable row level security;
alter table task_statuses         enable row level security;
alter table labels                enable row level security;
alter table tasks                 enable row level security;
alter table task_labels           enable row level security;
alter table comments              enable row level security;
alter table attachments           enable row level security;
alter table activity_log          enable row level security;

-- ---- profiles ----
create policy "profiles: self read/write" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
-- members can see profiles of people in shared orgs
create policy "profiles: visible to co-members" on profiles
  for select using (
    exists (
      select 1 from organization_members me
      join organization_members them on them.org_id = me.org_id
      where me.user_id = auth.uid() and them.user_id = profiles.id
    )
  );

-- ---- organizations ----
create policy "orgs: members read" on organizations
  for select using (is_org_member(id));
create policy "orgs: any auth user can create" on organizations
  for insert with check (created_by = auth.uid());
create policy "orgs: admins update" on organizations
  for update using (has_org_role(id, array['owner','admin']));
create policy "orgs: owner delete" on organizations
  for delete using (has_org_role(id, array['owner']));

-- ---- organization_members ----
create policy "members: read own org" on organization_members
  for select using (is_org_member(org_id));
create policy "members: admins manage" on organization_members
  for all using (has_org_role(org_id, array['owner','admin']))
  with check (has_org_role(org_id, array['owner','admin']));

-- ---- invitations ----
create policy "invites: admins manage" on invitations
  for all using (has_org_role(org_id, array['owner','admin']))
  with check (has_org_role(org_id, array['owner','admin']));

-- ---- generic org-scoped tables (read = member, write = member) ----
-- projects
create policy "projects: member read" on projects
  for select using (is_org_member(org_id));
create policy "projects: member write" on projects
  for all using (is_org_member(org_id) and has_org_role(org_id, array['owner','admin','member']))
  with check (is_org_member(org_id) and has_org_role(org_id, array['owner','admin','member']));

-- task_statuses
create policy "statuses: member read" on task_statuses
  for select using (is_org_member(org_id));
create policy "statuses: member write" on task_statuses
  for all using (has_org_role(org_id, array['owner','admin','member']))
  with check (has_org_role(org_id, array['owner','admin','member']));

-- labels
create policy "labels: member read" on labels
  for select using (is_org_member(org_id));
create policy "labels: member write" on labels
  for all using (has_org_role(org_id, array['owner','admin','member']))
  with check (has_org_role(org_id, array['owner','admin','member']));

-- tasks (guests can read but not write)
create policy "tasks: member read" on tasks
  for select using (is_org_member(org_id));
create policy "tasks: member write" on tasks
  for all using (has_org_role(org_id, array['owner','admin','member']))
  with check (has_org_role(org_id, array['owner','admin','member']));

-- task_labels
create policy "task_labels: member read" on task_labels
  for select using (is_org_member(org_id));
create policy "task_labels: member write" on task_labels
  for all using (has_org_role(org_id, array['owner','admin','member']))
  with check (has_org_role(org_id, array['owner','admin','member']));

-- comments (author can edit/delete own; members create; all members read)
create policy "comments: member read" on comments
  for select using (is_org_member(org_id));
create policy "comments: member create" on comments
  for insert with check (is_org_member(org_id) and author_id = auth.uid());
create policy "comments: author modify" on comments
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "comments: author or admin delete" on comments
  for delete using (author_id = auth.uid() or has_org_role(org_id, array['owner','admin']));

-- attachments
create policy "attachments: member read" on attachments
  for select using (is_org_member(org_id));
create policy "attachments: member write" on attachments
  for all using (has_org_role(org_id, array['owner','admin','member']))
  with check (has_org_role(org_id, array['owner','admin','member']));

-- activity_log (read-only to members; inserts via server)
create policy "activity: member read" on activity_log
  for select using (is_org_member(org_id));
create policy "activity: member insert" on activity_log
  for insert with check (is_org_member(org_id));

-- ============================================================
-- Invitation acceptance helper (SECURITY DEFINER)
-- Lets an invited user join an org by presenting a valid token,
-- without granting blanket insert rights on organization_members.
-- ============================================================
create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer
set search_path = public as $$
declare
  inv         invitations%rowtype;
  v_email     text;
  v_org       uuid;
begin
  select * into inv from invitations where token = p_token;
  if inv.id is null then
    raise exception 'Invitation not found';
  end if;
  if inv.status <> 'pending' then
    raise exception 'Invitation is no longer valid';
  end if;

  select email into v_email from profiles where id = auth.uid();
  if v_email is null then
    raise exception 'No authenticated user';
  end if;
  if lower(v_email) <> lower(inv.email) then
    raise exception 'Invitation was issued to a different email';
  end if;

  insert into organization_members (org_id, user_id, role)
  values (inv.org_id, auth.uid(), inv.role)
  on conflict (org_id, user_id) do nothing;

  update invitations set status = 'accepted' where id = inv.id;
  v_org := inv.org_id;
  return v_org;
end; $$;

-- Allow a signed-in invitee to read the invitation that matches their email,
-- so the accept page can show org/role before accepting.
create policy "invites: invitee can read own" on invitations
  for select using (
    status = 'pending'
    and lower(email) = lower((select email from profiles where id = auth.uid()))
  );

-- ============================================================
-- Realtime: add core collaborative tables to the publication
-- (Realtime must also be enabled in the dashboard for some setups)
-- ============================================================
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table task_statuses;
alter publication supabase_realtime add table activity_log;
