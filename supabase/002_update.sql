-- Update for an existing Moonquest database. Run once in Supabase → SQL Editor → New query → Run.

-- 1) Personal codes: students see only names, codes stay with the teacher
alter table students add column if not exists pin text;
revoke select on students from anon;
grant select (id, name, course, created_at) on students to anon;
create or replace function student_login(sid uuid, p text) returns boolean
  language sql security definer set search_path = public
  as $$ select exists (select 1 from students where id = sid and pin = p) $$;
grant execute on function student_login(uuid, text) to anon;

-- 2) Anki-style flashcards: schedule of every card
alter table progress add column if not exists data jsonb;
