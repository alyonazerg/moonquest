-- Login by code only. Run once in Supabase → SQL Editor → New query → Run.
-- After it, the names of the students are not visible to anybody who is not signed in:
-- a student types her personal code and the site finds out who she is.

-- 1) students (not signed in) can not read the list of students any more
revoke select on students from anon;
drop policy if exists "read students" on students;

-- 2) wrong codes are counted for everybody together: after 15 wrong codes in 10 minutes
--    the login waits 10 minutes (so nobody can try all the codes one by one)
create table if not exists pin_attempts (at timestamptz default now());
alter table pin_attempts enable row level security; -- no policies: only the function below uses it

create or replace function login_by_pin(p text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int; recent int; r jsonb;
begin
  delete from pin_attempts where at < now() - interval '1 day';
  select count(*) into recent from pin_attempts where at > now() - interval '10 minutes';
  if recent >= 15 then raise exception 'Too many wrong codes. Please wait 10 minutes.'; end if;
  select count(*) into n from students where pin = trim(p) and trim(coalesce(p, '')) <> '';
  if n = 0 then insert into pin_attempts default values; return null; end if;
  if n > 1 then raise exception 'Two students have the same code. Ask your teacher.'; end if;
  select jsonb_build_object('id', id, 'name', name, 'course', course, 'current_unit', current_unit)
    into r from students where pin = trim(p);
  return r;
end $$;

-- 3) a logged-in student gets her own name, course and current units (with her code)
create or replace function student_info(sid uuid, p text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not check_student(sid, p) then raise exception 'Wrong student code'; end if;
  return (select jsonb_build_object('id', id, 'name', name, 'course', course, 'current_unit', current_unit) from students where id = sid);
end $$;

revoke execute on function login_by_pin(text), student_info(uuid, text) from public;
grant execute on function login_by_pin(text), student_info(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
