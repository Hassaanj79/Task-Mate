-- ============================================================
-- Soft-delete / archive with 30-day retention.
-- Archived rows keep `archived_at`; a daily job purges anything older
-- than 30 days. Recovering clears `archived_at`.
-- ============================================================

alter table public.tasks    add column if not exists archived_at timestamptz;
alter table public.projects add column if not exists archived_at timestamptz;
create index if not exists tasks_archived_idx    on public.tasks(archived_at);
create index if not exists projects_archived_idx on public.projects(archived_at);

-- Backfill: existing archived projects get an archived_at so they age out too.
update public.projects set archived_at = now()
  where archived = true and archived_at is null;

-- Permanently remove anything archived more than 30 days ago.
create or replace function public.purge_archived()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.tasks
    where archived_at is not null and archived_at < now() - interval '30 days';
  delete from public.projects
    where archived_at is not null and archived_at < now() - interval '30 days';
end;
$$;

revoke execute on function public.purge_archived() from public;
