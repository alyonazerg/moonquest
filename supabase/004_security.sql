-- Security update. Run once in Supabase → SQL Editor → New query → Run.
-- After it, students (not signed in) can no longer read or change data directly:
-- they save progress and their own words only through functions that check their personal code.

-- 1) no direct access for students to progress and to writing card sets
drop policy if exists "read progress" on progress;
drop policy if exists "write progress" on progress;
drop policy if exists "update progress" on progress;
drop policy if exists "students add own sets" on sets;
drop policy if exists "students edit own sets" on sets;

-- 2) wrong codes are counted: after 5 wrong tries the student has to wait 10 minutes
create table if not exists login_attempts (student_id uuid, at timestamptz default now());
alter table login_attempts enable row level security; -- no policies: only the functions below use it

create or replace function check_student(sid uuid, p text) returns boolean
language plpgsql security definer set search_path = public as $$
declare ok boolean; recent int;
begin
  select count(*) into recent from login_attempts where student_id = sid and at > now() - interval '10 minutes';
  if recent >= 5 then raise exception 'Too many wrong codes. Please wait 10 minutes.'; end if;
  select exists (select 1 from students where id = sid and pin = p) into ok;
  if not ok then insert into login_attempts (student_id) values (sid); end if;
  return ok;
end $$;

create or replace function student_login(sid uuid, p text) returns boolean
language sql security definer set search_path = public as $$ select check_student(sid, p) $$;

-- 3) progress of one student, only with her code
create or replace function get_progress(sid uuid, p text) returns setof progress
language plpgsql security definer set search_path = public as $$
begin
  if not check_student(sid, p) then raise exception 'Wrong student code'; end if;
  return query select * from progress where student_id = sid;
end $$;

create or replace function save_progress(sid uuid, p text, rec jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not check_student(sid, p) then raise exception 'Wrong student code'; end if;
  insert into progress (student_id, key, stars, correct, total, mistakes, plays, data, updated_at)
  values (sid, left(rec->>'key', 200), least(coalesce((rec->>'stars')::int, 0), 3), (rec->>'correct')::int, (rec->>'total')::int,
          coalesce(rec->'mistakes', '[]'::jsonb), coalesce((rec->>'plays')::int, 0), nullif(rec->'data', 'null'::jsonb), now())
  on conflict (student_id, key) do update set
    stars = greatest(progress.stars, excluded.stars), correct = excluded.correct, total = excluded.total,
    mistakes = excluded.mistakes, plays = excluded.plays, data = coalesce(excluded.data, progress.data), updated_at = now();
end $$;

-- 4) a student's own card set ("My words"), only with her code
create or replace function save_student_set(sid uuid, p text, s jsonb) returns sets
language plpgsql security definer set search_path = public as $$
declare r sets;
begin
  if not check_student(sid, p) then raise exception 'Wrong student code'; end if;
  if jsonb_array_length(coalesce(s->'items', '[]'::jsonb)) > 300 then raise exception 'Too many cards'; end if;
  if (s->>'id') is not null then
    update sets set title = left(s->>'title', 120), items = s->'items', unit_key = s->>'unit_key'
      where id = (s->>'id')::uuid and student_id = sid returning * into r;
    if r.id is null then raise exception 'This is not your set'; end if;
  else
    insert into sets (title, kind, items, unit_key, student_id)
      values (left(s->>'title', 120), 'words', s->'items', s->>'unit_key', sid) returning * into r;
  end if;
  return r;
end $$;

-- 5) daily limit for the AI function (counted by the server)
create table if not exists ai_usage (day date primary key, n int default 0);
alter table ai_usage enable row level security;
create or replace function ai_take(max_per_day int) returns boolean
language plpgsql security definer set search_path = public as $$
declare cur int;
begin
  insert into ai_usage (day, n) values (current_date, 1)
    on conflict (day) do update set n = ai_usage.n + 1 returning n into cur;
  return cur <= max_per_day;
end $$;

-- who may call what
revoke execute on function check_student(uuid, text) from public, anon, authenticated;
revoke execute on function ai_take(int) from public, anon, authenticated;
grant execute on function check_student(uuid, text), ai_take(int) to service_role;
grant execute on function student_login(uuid, text), get_progress(uuid, text), save_progress(uuid, text, jsonb), save_student_set(uuid, text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
