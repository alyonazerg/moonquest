-- Moonquest database. Run once in Supabase → SQL Editor → New query → Run.

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  course text,
  created_at timestamptz default now()
);

create table if not exists sets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null default 'words',       -- 'words' | 'verbs'
  items jsonb not null default '[]'::jsonb,  -- [{en, ru, pic}] or [{base, v2, v3, ru}]
  created_at timestamptz default now()
);

create table if not exists assignments (
  student_id uuid references students(id) on delete cascade,
  set_id uuid references sets(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (student_id, set_id)
);

create table if not exists progress (
  student_id uuid references students(id) on delete cascade,
  key text not null,                          -- e.g. 'as2/u2/quiz' or 'set:<id>/flash'
  stars int default 0,
  correct int,
  total int,
  mistakes jsonb default '[]'::jsonb,
  plays int default 0,
  data jsonb,                                 -- Anki schedule for flashcard decks
  updated_at timestamptz default now(),
  primary key (student_id, key)
);

create table if not exists audio (
  text text primary key,
  path text not null
);

-- Row level security: the teacher (signed in) can do everything;
-- students (not signed in) can read names, sets and audio, and write only their progress.
alter table students enable row level security;
alter table sets enable row level security;
alter table assignments enable row level security;
alter table progress enable row level security;
alter table audio enable row level security;

create policy "teacher all students" on students for all to authenticated using (true) with check (true);
create policy "teacher all sets" on sets for all to authenticated using (true) with check (true);
create policy "teacher all assignments" on assignments for all to authenticated using (true) with check (true);
create policy "teacher all progress" on progress for all to authenticated using (true) with check (true);
create policy "teacher all audio" on audio for all to authenticated using (true) with check (true);

create policy "read students" on students for select to anon using (true);
-- students see names only; PIN codes stay with the teacher
alter table students add column if not exists pin text;
revoke select on students from anon;
grant select (id, name, course, created_at) on students to anon;
create or replace function student_login(sid uuid, p text) returns boolean
  language sql security definer set search_path = public
  as $$ select exists (select 1 from students where id = sid and pin = p) $$;
grant execute on function student_login(uuid, text) to anon;
create policy "read sets" on sets for select to anon using (true);
create policy "read assignments" on assignments for select to anon using (true);
create policy "read audio" on audio for select to anon using (true);
create policy "read progress" on progress for select to anon using (true);
create policy "write progress" on progress for insert to anon with check (true);
create policy "update progress" on progress for update to anon using (true) with check (true);

-- Storage for recorded voice (public read, teacher upload)
insert into storage.buckets (id, name, public) values ('audio', 'audio', true) on conflict (id) do nothing;
create policy "teacher upload audio" on storage.objects for insert to authenticated with check (bucket_id = 'audio');
create policy "teacher update audio" on storage.objects for update to authenticated using (bucket_id = 'audio');
create policy "public read audio" on storage.objects for select using (bucket_id = 'audio');
