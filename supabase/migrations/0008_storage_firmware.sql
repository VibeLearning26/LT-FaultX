-- 0008_storage_firmware.sql
-- Firmware storage bucket + policies. Only admins may upload/read/delete
-- firmware objects from the browser. The backend (service role) bypasses RLS.
--
-- NOTE: storage.objects RLS is managed by Supabase; these policies are applied
-- to the storage.objects table for the 'firmware' bucket.

insert into storage.buckets (id, name, public)
values ('firmware', 'firmware', false)
on conflict (id) do nothing;

-- Admin read
drop policy if exists firmware_read_admin on storage.objects;
create policy firmware_read_admin on storage.objects
  for select
  using (bucket_id = 'firmware' and public.is_admin());

-- Admin upload
drop policy if exists firmware_insert_admin on storage.objects;
create policy firmware_insert_admin on storage.objects
  for insert
  with check (bucket_id = 'firmware' and public.is_admin());

-- Admin update
drop policy if exists firmware_update_admin on storage.objects;
create policy firmware_update_admin on storage.objects
  for update
  using (bucket_id = 'firmware' and public.is_admin())
  with check (bucket_id = 'firmware' and public.is_admin());

-- Admin delete
drop policy if exists firmware_delete_admin on storage.objects;
create policy firmware_delete_admin on storage.objects
  for delete
  using (bucket_id = 'firmware' and public.is_admin());
