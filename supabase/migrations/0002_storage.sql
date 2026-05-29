-- ============================================================
-- Storage bucket + policies for task attachments
-- Path convention: org_id/task_id/filename
-- Run after 0001_init.sql.
-- ============================================================

-- Private bucket for attachments
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Read: any member of the org that owns the first path segment
create policy "attachments read" on storage.objects for select
  using (bucket_id = 'attachments'
         and is_org_member( (storage.foldername(name))[1]::uuid ));

-- Write: members (owner/admin/member) of the owning org
create policy "attachments write" on storage.objects for insert
  with check (bucket_id = 'attachments'
              and has_org_role( (storage.foldername(name))[1]::uuid, array['owner','admin','member']));

-- Delete: members of the owning org
create policy "attachments delete" on storage.objects for delete
  using (bucket_id = 'attachments'
         and has_org_role( (storage.foldername(name))[1]::uuid, array['owner','admin','member']));
