-- Sub-projects: a project may belong to a parent project.
alter table public.projects
  add column if not exists parent_id uuid references public.projects(id) on delete cascade;
create index if not exists projects_parent_idx on public.projects(parent_id);
