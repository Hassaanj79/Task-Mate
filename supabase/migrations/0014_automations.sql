-- ============================================================
-- Workflows / Automations (V1)
-- Trigger -> Conditions -> Actions. Org-scoped, RLS-protected.
-- ============================================================

create table if not exists public.automations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  project_id  uuid references projects(id) on delete cascade,   -- null = whole workspace
  name        text not null,
  enabled     boolean not null default true,
  trigger     jsonb not null,                                   -- { type, config }
  conditions  jsonb not null default '{"op":"and","rules":[]}',
  actions     jsonb not null default '[]',                      -- [{ type, config }]
  run_count   int not null default 0,
  last_run_at timestamptz,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);
create index if not exists automations_org_idx on public.automations(org_id, enabled);
create index if not exists automations_project_idx on public.automations(project_id);

create table if not exists public.automation_runs (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  automation_id uuid references automations(id) on delete cascade,
  task_id       uuid references tasks(id) on delete set null,
  status        text not null,            -- 'success' | 'failed' | 'skipped'
  event_id      text,                     -- idempotency key per emitted event
  event         jsonb,
  result        jsonb,
  error         text,
  created_at    timestamptz not null default now()
);
create index if not exists automation_runs_auto_idx on public.automation_runs(automation_id, created_at desc);
create unique index if not exists automation_runs_idem
  on public.automation_runs(automation_id, event_id) where event_id is not null;

alter table public.automations     enable row level security;
alter table public.automation_runs enable row level security;

-- automations: members read; owners/admins manage
create policy "automations: member read" on public.automations
  for select using (is_org_member(org_id));
create policy "automations: admin manage" on public.automations
  for all using (has_org_role(org_id, array['owner','admin']))
  with check (has_org_role(org_id, array['owner','admin']));

-- runs: members read, members insert (engine runs in the member's request)
create policy "runs: member read" on public.automation_runs
  for select using (is_org_member(org_id));
create policy "runs: member insert" on public.automation_runs
  for insert with check (is_org_member(org_id));

-- ============================================================
-- apply_automation_action: perform one action as the engine.
-- SECURITY DEFINER (bypasses RLS) but validates org membership so a
-- non-member can never drive it. Actions never re-enter the app layer,
-- so they cannot trigger further automations (no loops in V1).
-- ============================================================
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
  if not is_org_member(p_org) then
    raise exception 'Not a member of this organization';
  end if;

  select * into v_task from tasks where id = p_task and org_id = p_org;
  if v_task.id is null then
    return; -- task gone (deleted/archived race) — no-op
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
    -- recipients: 'assignee' | 'creator' | 'admins' | a user uuid
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
      if rec_id is not null then
        insert into notifications (org_id, recipient_id, actor_id, type, task_id, body)
        values (p_org, rec_id, p_actor, 'automation', p_task, cfg->>'message');
      end if;
    end if;
  end if;

  -- record that an automation touched the task
  insert into activity_log (org_id, task_id, actor_id, action, meta)
  values (p_org, p_task, p_actor, 'automation_' || a_type, cfg);
end;
$$;

grant execute on function public.apply_automation_action(uuid, uuid, uuid, jsonb) to authenticated;

-- ============================================================
-- Scheduled: due-date automations. For triggers of type 'due_date',
-- config.when in ('today','overdue') with optional days offset.
-- Runs daily; applies each rule's actions to matching tasks.
-- ============================================================
create or replace function public.run_due_automations()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r   automations%rowtype;
  t   record;
  act jsonb;
  whenv text;
begin
  for r in select * from automations where enabled and trigger->>'type' = 'due_date' loop
    whenv := coalesce(r.trigger->'config'->>'when','today');
    for t in
      select * from tasks
      where org_id = r.org_id
        and archived_at is null
        and due_date is not null
        and (r.project_id is null or project_id = r.project_id)
        and (
          (whenv = 'today'   and due_date::date = current_date) or
          (whenv = 'overdue' and due_date < now())
        )
    loop
      for act in select * from jsonb_array_elements(r.actions) loop
        perform apply_automation_action(r.org_id, t.id, r.created_by, act);
      end loop;
    end loop;
    update automations set run_count = run_count + 1, last_run_at = now() where id = r.id;
  end loop;
end;
$$;

revoke execute on function public.run_due_automations() from public;

-- run every day at 08:00 UTC
select cron.schedule('run-due-automations', '0 8 * * *', $$select public.run_due_automations()$$);

alter publication supabase_realtime add table public.automation_runs;
