-- Personal PIN codes for students. Run once in Supabase → SQL Editor.
alter table students add column if not exists pin text;
revoke select on students from anon;
grant select (id, name, course, created_at) on students to anon;
create or replace function student_login(sid uuid, p text) returns boolean
  language sql security definer set search_path = public
  as $$ select exists (select 1 from students where id = sid and pin = p) $$;
grant execute on function student_login(uuid, text) to anon;
