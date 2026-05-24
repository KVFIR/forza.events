-- Allow Activity (anon) to upload event covers (pilot; tighten with auth later)

create policy "event cover upload"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'event-covers');

create policy "event cover update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'event-covers');
