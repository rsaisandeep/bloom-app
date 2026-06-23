-- Partner (view-only) mode — run once in the Supabase SQL editor.
-- Adds a viewer/tracker account type + gender to profiles, a consent-based
-- partner_links table, and READ-ONLY RLS so an accepted viewer can see (never
-- edit) the owner's cycles/logs/settings. No write policy is granted to
-- partners, so read-only is enforced by the database, not just the UI.

-- 1. profiles ----------------------------------------------------------------
alter table profiles add column if not exists gender text;
alter table profiles add column if not exists account_type text not null default 'tracker'; -- 'tracker' | 'viewer'
alter table profiles add column if not exists last_active_at timestamptz;

-- 2. partner_links -----------------------------------------------------------
create table if not exists partner_links (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,  -- the person being tracked
  viewer_id  uuid not null references auth.users(id) on delete cascade,  -- the partner who views
  status     text not null default 'pending',                           -- 'pending' | 'accepted'
  created_at timestamptz not null default now(),
  unique (owner_id, viewer_id)
);
alter table partner_links enable row level security;

-- Both parties can see a link that involves them.
drop policy if exists "see own partner links" on partner_links;
create policy "see own partner links" on partner_links for select
  using (owner_id = auth.uid() or viewer_id = auth.uid());

-- Only the owner can create the invite (and only as themselves).
drop policy if exists "owner invites" on partner_links;
create policy "owner invites" on partner_links for insert
  with check (owner_id = auth.uid());

-- Either party can update the link's status (viewer accepts; either can change).
drop policy if exists "respond to invite" on partner_links;
create policy "respond to invite" on partner_links for update
  using (owner_id = auth.uid() or viewer_id = auth.uid());

-- Either party can remove the link.
drop policy if exists "remove link" on partner_links;
create policy "remove link" on partner_links for delete
  using (owner_id = auth.uid() or viewer_id = auth.uid());

-- 3. read-only access to the owner's data for accepted viewers ----------------
-- These are ADDITIVE: Postgres OR-combines multiple permissive SELECT policies,
-- so the existing "user can read own rows" policies keep working. We add no
-- insert/update/delete policy for partners — that's what makes it read-only.
drop policy if exists "partners read cycles" on cycles;
create policy "partners read cycles" on cycles for select
  using (user_id in (select owner_id from partner_links where viewer_id = auth.uid() and status = 'accepted'));

drop policy if exists "partners read logs" on daily_logs;
create policy "partners read logs" on daily_logs for select
  using (user_id in (select owner_id from partner_links where viewer_id = auth.uid() and status = 'accepted'));

drop policy if exists "partners read settings" on settings;
create policy "partners read settings" on settings for select
  using (user_id in (select owner_id from partner_links where viewer_id = auth.uid() and status = 'accepted'));
