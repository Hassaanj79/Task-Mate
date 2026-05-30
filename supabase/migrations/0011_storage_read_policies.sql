-- Fix logo/avatar uploads: `.upload()` reads the new object back (RETURNING),
-- which is checked against a SELECT policy. Without one, the upload fails with
-- "new row violates row-level security policy". These buckets are public, so
-- allow reads of their object rows.
create policy "org-logos read" on storage.objects
  for select using (bucket_id = 'org-logos');
create policy "avatars read" on storage.objects
  for select using (bucket_id = 'avatars');
