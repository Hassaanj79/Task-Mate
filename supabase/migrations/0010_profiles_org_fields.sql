-- ============================================================
-- Workspace + profile detail fields, and public buckets for
-- logos / avatars.
-- ============================================================

-- Organization (workspace) details
alter table public.organizations add column if not exists email         text;
alter table public.organizations add column if not exists phone         text;
alter table public.organizations add column if not exists address       text;
alter table public.organizations add column if not exists website       text;
alter table public.organizations add column if not exists business_type text;
alter table public.organizations add column if not exists company_size  text;
alter table public.organizations add column if not exists description   text;

-- Profile details (email + full_name + avatar_url already exist)
alter table public.profiles add column if not exists phone     text;
alter table public.profiles add column if not exists job_title text;
alter table public.profiles add column if not exists bio       text;
alter table public.profiles add column if not exists timezone  text;

-- Public buckets for images.
insert into storage.buckets (id, name, public) values
  ('org-logos', 'org-logos', true),
  ('avatars',   'avatars',   true)
on conflict (id) do nothing;

-- org-logos: path = org_id/...; admins of that org may write. Public read.
create policy "org-logos write" on storage.objects for insert
  with check (bucket_id = 'org-logos'
    and has_org_role((storage.foldername(name))[1]::uuid, array['owner','admin']));
create policy "org-logos update" on storage.objects for update
  using (bucket_id = 'org-logos'
    and has_org_role((storage.foldername(name))[1]::uuid, array['owner','admin']));
create policy "org-logos delete" on storage.objects for delete
  using (bucket_id = 'org-logos'
    and has_org_role((storage.foldername(name))[1]::uuid, array['owner','admin']));

-- avatars: path = user_id/...; only that user may write. Public read.
create policy "avatars write" on storage.objects for insert
  with check (bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars update" on storage.objects for update
  using (bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars delete" on storage.objects for delete
  using (bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text);
