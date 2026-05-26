-- Revoke anonymous storage writes; covers upload via upload-cover Edge Function (service role).

drop policy if exists "event cover upload" on storage.objects;
drop policy if exists "event cover update" on storage.objects;
