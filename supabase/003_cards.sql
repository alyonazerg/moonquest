-- Cards attached to units, cards made by students. Run once in Supabase → SQL Editor → New query → Run.

-- the unit a student is studying now (new cards go there)
alter table students add column if not exists current_unit text;
grant select (id, name, course, created_at, current_unit) on students to anon;

-- a set can be attached to a unit and can belong to a student
alter table sets add column if not exists unit_key text;
alter table sets add column if not exists student_id uuid references students(id) on delete cascade;

-- students may add and edit their own card sets (never the teacher's)
create policy "students add own sets" on sets for insert to anon with check (student_id is not null);
create policy "students edit own sets" on sets for update to anon using (student_id is not null) with check (student_id is not null);

notify pgrst, 'reload schema';
