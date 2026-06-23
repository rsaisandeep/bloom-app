-- Run once in the Supabase SQL editor (after partner-mode.sql).

-- 1. Scope the cycles primary key per user --------------------------------------
-- cycle_id is generated as `${username}_${date}` and often defaults to
-- `me_${date}`, so it is NOT unique across users — two users logging a period on
-- the same date collided on the global PK. Make (user_id, cycle_id) the key so
-- each user's ids only need to be unique within their own data.
-- NOTE: if your existing PK constraint isn't named `cycles_pkey`, adjust the
-- DROP below (check: select conname from pg_constraint where conrelid='cycles'::regclass and contype='p').
alter table cycles drop constraint if exists cycles_pkey;
alter table cycles add constraint cycles_pkey primary key (user_id, cycle_id);

-- 2. Task-completion sync (daily focus checklist) -------------------------------
-- Lets the checklist follow a user across devices and lets an accepted partner
-- see which tasks are struck. Read-only for partners (no write policy for them).
create table if not exists task_completions (
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       text not null,
  done       jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);
alter table task_completions enable row level security;

drop policy if exists "own task completions" on task_completions;
create policy "own task completions" on task_completions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "partners read task completions" on task_completions;
create policy "partners read task completions" on task_completions for select
  using (user_id in (select owner_id from partner_links where viewer_id = auth.uid() and status = 'accepted'));
