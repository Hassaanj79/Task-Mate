-- ============================================================
-- Per-user notifications (e.g. @mentions in comments)
-- ============================================================
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  actor_id     uuid references profiles(id) on delete set null,
  type         text not null,                       -- 'mention'
  task_id      uuid references tasks(id) on delete cascade,
  comment_id   uuid references comments(id) on delete cascade,
  body         text,                                -- short snippet
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists notifications_recipient_idx
  on public.notifications(recipient_id, read, created_at desc);

alter table public.notifications enable row level security;

-- Recipient sees and manages only their own notifications.
create policy "notif: recipient read" on public.notifications
  for select using (recipient_id = auth.uid());
create policy "notif: recipient update" on public.notifications
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "notif: recipient delete" on public.notifications
  for delete using (recipient_id = auth.uid());
-- Any org member may create a notification for a co-member.
create policy "notif: member create" on public.notifications
  for insert with check (is_org_member(org_id));

alter publication supabase_realtime add table public.notifications;
