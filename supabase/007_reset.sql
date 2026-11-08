-- Reset progress (stars, results) of a game, a unit or a lesson. Run once in Supabase → SQL Editor → New query → Run.
-- A student may clear only her own rows (with her code); the signed-in teacher can clear any student's rows.
create or replace function reset_progress(sid uuid, p text, keys text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not check_student(sid, p) then raise exception 'Wrong student code'; end if;
  delete from progress where student_id = sid and key = any(keys);
end $$;
revoke execute on function reset_progress(uuid, text, text[]) from public;
grant execute on function reset_progress(uuid, text, text[]) to anon, authenticated;
notify pgrst, 'reload schema';
