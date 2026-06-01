-- ============================================================
-- Issue type on tasks (Jira-style): task | bug | feature | story | improvement
-- ============================================================
alter table public.tasks
  add column if not exists type text not null default 'task'
  check (type in ('task','bug','feature','story','improvement'));
