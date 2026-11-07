-- Lessons from the textbook. Run once in Supabase → SQL Editor → New query → Run.
-- 1) the teacher uploads textbook audio for lessons (folder "lesson/" in the "audio" storage)
--    — already allowed for the signed-in teacher by schema.sql.
-- 2) students record voice answers: they may ADD files only to the folder "rec/" (not change or delete anything)
drop policy if exists "students upload recordings" on storage.objects;
create policy "students upload recordings" on storage.objects for insert to anon
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = 'rec');
notify pgrst, 'reload schema';
