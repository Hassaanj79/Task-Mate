-- ============================================================
-- Security hardening (audit + Supabase advisors)
--   C2  block admin -> owner self-escalation + protect last owner
--   C1  validate notify recipient is an org member
--   H1  per-project attachment storage (IDOR fix)
--   H3  gate apply_automation_action on actor project-write access
--   M2  tighten notifications insert policy
--   L1  comments create requires write access (guests read-only)
--   M4  invitation expiry
--   --  restrict public-bucket listing; revoke anon EXECUTE on mutators
-- ============================================================

-- ------------------------------------------------------------
-- C2: org_role change guard (defense-in-depth behind the action)
--   * only an existing owner may grant the 'owner' role
--   * the last remaining owner cannot be demoted or removed
--   First-owner bootstrap (signup / create_organization) is allowed
--   because there are no prior members in the org at that point.
-- ------------------------------------------------------------
create or replace function public.enforce_member_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') then
    if new.role = 'owner'
       and exists (select 1 from organization_members where org_id = new.org_id)
       and not has_org_role(new.org_id, array['owner']) then
      raise exception 'Only an owner can grant the owner role';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner'
     and (select count(*) from organization_members where org_id = old.org_id and role = 'owner') <= 1 then
    raise exception 'Cannot remove the last owner of a workspace';
  end if;

  if tg_op = 'DELETE' and old.role = 'owner'
     and (select count(*) from organization_members where org_id = old.org_id and role = 'owner') <= 1 then
    raise exception 'Cannot remove the last owner of a workspace';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;

drop trigger if exists trg_member_role_change on organization_members;
create trigger trg_member_role_change
  before insert or update or delete on organization_members
  for each row execute function public.enforce_member_role_change();

-- ------------------------------------------------------------
-- M4: invitation expiry
-- ------------------------------------------------------------
alter table public.invitations
  add column if not exists expires_at timestamptz not null default (now() + interval '14 days');

create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer
set search_path = public as $$
declare
  inv     invitations%rowtype;
  v_email text;
begin
  select * into inv from invitations where token = p_token;
  if inv.id is null then
    raise exception 'Invitation not found';
  end if;
  if inv.status <> 'pending' then
    raise exception 'Invitation is no longer valid';
  end if;
  if inv.expires_at is not null and inv.expires_at < now() then
    raise exception 'Invitation has expired';
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
  return inv.org_id;
end; $$;

-- ------------------------------------------------------------
-- M2: notifications — recipient must be a member, actor must be self
-- (definer inserts from apply_automation_action bypass RLS, unaffected)
-- ------------------------------------------------------------
drop policy if exists "notif: member create" on public.notifications;
create policy "notif: member create" on public.notifications
  for insert with check (
    is_org_member(org_id)
    and actor_id = auth.uid()
    and exists (select 1 from organization_members m
                where m.org_id = notifications.org_id and m.user_id = recipient_id)
  );

-- ------------------------------------------------------------
-- L1: comments create requires write access (guests are read-only)
-- ------------------------------------------------------------
drop policy if exists "comments: access create" on public.comments;
create policy "comments: access create" on public.comments
  for insert with check (can_write_task(task_id) and author_id = auth.uid());

-- ------------------------------------------------------------
-- H1: attachment storage is project-aware.
-- Path = org_id/task_id/filename -> foldername[2] = task_id.
-- ------------------------------------------------------------
drop policy if exists "attachments read"   on storage.objects;
drop policy if exists "attachments write"  on storage.objects;
drop policy if exists "attachments delete" on storage.objects;

create policy "attachments read" on storage.objects for select
  using (bucket_id = 'attachments'
         and can_access_task( (storage.foldername(name))[2]::uuid ));
create policy "attachments write" on storage.objects for insert
  with check (bucket_id = 'attachments'
              and can_write_task( (storage.foldername(name))[2]::uuid ));
create policy "attachments delete" on storage.objects for delete
  using (bucket_id = 'attachments'
         and can_write_task( (storage.foldername(name))[2]::uuid ));

-- ------------------------------------------------------------
-- Public-bucket listing: scope SELECT so clients can't enumerate every
-- file. Public object URLs still render (public buckets bypass RLS on
-- the render path); only the list API is gated.
-- ------------------------------------------------------------
drop policy if exists "org-logos read" on storage.objects;
create policy "org-logos read" on storage.objects for select
  using (bucket_id = 'org-logos'
         and is_org_member( (storage.foldername(name))[1]::uuid ));

drop policy if exists "avatars read" on storage.objects;
create policy "avatars read" on storage.objects for select
  using (bucket_id = 'avatars'
         and (storage.foldername(name))[1] = auth.uid()::text);

-- ------------------------------------------------------------
-- C1 + H3: apply_automation_action
--   * actor must have write access to the task's project
--   * 'notify' to a raw uuid must be an org member (no cross-tenant inject)
-- ------------------------------------------------------------
create or replace function public.apply_automation_action(
  p_org    uuid,
  p_task   uuid,
  p_actor  uuid,
  p_action jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a_type text := p_action->>'type';
  cfg    jsonb := coalesce(p_action->'config', '{}'::jsonb);
  v_task tasks%rowtype;
  rec_id uuid;
begin
  select * into v_task from tasks where id = p_task and org_id = p_org;
  if v_task.id is null then
    return; -- task gone (deleted/archived race) — no-op
  end if;

  -- actor must be able to write the task's project (covers org membership,
  -- role, and per-project private access). Skip silently otherwise.
  if not exists (
    select 1 from projects p
    join organization_members m on m.org_id = p.org_id and m.user_id = p_actor
    where p.id = v_task.project_id
      and m.role in ('owner','admin','member')
      and ( p.created_by = p_actor
            or p.visibility = 'workspace'
            or m.role in ('owner','admin')
            or exists (select 1 from project_members pm
                       where pm.project_id = p.id and pm.user_id = p_actor) )
  ) then
    return;
  end if;

  if a_type = 'set_status' then
    update tasks set status_id = nullif(cfg->>'status_id','')::uuid where id = p_task;

  elsif a_type = 'set_priority' then
    update tasks set priority = (cfg->>'priority')::task_priority where id = p_task;

  elsif a_type = 'set_assignee' then
    update tasks set assignee_id = nullif(cfg->>'assignee_id','')::uuid where id = p_task;

  elsif a_type = 'set_due' then
    if (cfg->>'mode') = 'clear' then
      update tasks set due_date = null where id = p_task;
    elsif (cfg->>'mode') = 'shift' then
      update tasks set due_date = coalesce(due_date, now()) + ((cfg->>'days')::int || ' days')::interval where id = p_task;
    elsif (cfg->>'mode') = 'set' then
      update tasks set due_date = (cfg->>'date')::timestamptz where id = p_task;
    end if;

  elsif a_type = 'add_label' then
    insert into task_labels (task_id, label_id, org_id)
    values (p_task, (cfg->>'label_id')::uuid, p_org)
    on conflict do nothing;

  elsif a_type = 'remove_label' then
    delete from task_labels where task_id = p_task and label_id = (cfg->>'label_id')::uuid;

  elsif a_type = 'add_comment' then
    insert into comments (org_id, task_id, author_id, body)
    values (p_org, p_task, p_actor,
            jsonb_build_object('type','doc','content',
              jsonb_build_array(jsonb_build_object('type','paragraph','content',
                jsonb_build_array(jsonb_build_object('type','text','text', coalesce(cfg->>'text','')))))));

  elsif a_type = 'notify' then
    if (cfg->>'recipient') = 'assignee' and v_task.assignee_id is not null then
      insert into notifications (org_id, recipient_id, actor_id, type, task_id, body)
      values (p_org, v_task.assignee_id, p_actor, 'automation', p_task, cfg->>'message');
    elsif (cfg->>'recipient') = 'creator' then
      insert into notifications (org_id, recipient_id, actor_id, type, task_id, body)
      values (p_org, v_task.created_by, p_actor, 'automation', p_task, cfg->>'message');
    elsif (cfg->>'recipient') = 'admins' then
      insert into notifications (org_id, recipient_id, actor_id, type, task_id, body)
      select p_org, m.user_id, p_actor, 'automation', p_task, cfg->>'message'
      from organization_members m
      where m.org_id = p_org and m.role in ('owner','admin');
    else
      rec_id := nullif(cfg->>'recipient','')::uuid;
      -- only notify a raw uuid if it belongs to this org (no cross-tenant inject)
      if rec_id is not null and exists (
           select 1 from organization_members m
           where m.org_id = p_org and m.user_id = rec_id) then
        insert into notifications (org_id, recipient_id, actor_id, type, task_id, body)
        values (p_org, rec_id, p_actor, 'automation', p_task, cfg->>'message');
      end if;
    end if;
  end if;

  insert into activity_log (org_id, task_id, actor_id, action, meta)
  values (p_org, p_task, p_actor, 'automation_' || a_type, cfg);
end;
$$;

-- ------------------------------------------------------------
-- Reduce attack surface: these mutating SECURITY DEFINER RPCs all rely on
-- auth.uid(); the anon role has no business calling them.
-- ------------------------------------------------------------
revoke execute on function public.apply_automation_action(uuid, uuid, uuid, jsonb) from anon, public;
grant  execute on function public.apply_automation_action(uuid, uuid, uuid, jsonb) to authenticated;
revoke execute on function public.accept_invitation(text)        from anon, public;
grant  execute on function public.accept_invitation(text)        to authenticated;
revoke execute on function public.create_organization(text,text) from anon, public;
grant  execute on function public.create_organization(text,text) to authenticated;
