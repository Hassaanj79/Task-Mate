-- Project icon (Task Mate design: each project has a Lucide-style icon).
alter table public.projects add column if not exists icon text not null default 'folder';
