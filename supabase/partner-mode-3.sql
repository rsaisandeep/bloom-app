-- Run once in the Supabase SQL editor (after partner-mode-2.sql).

-- Let a tracker (owner) read their accepted viewers' task_completions, so the
-- partner-support tasks the viewer ticks show up read-only on the tracker's
-- home. (The existing "partners read task completions" policy only covers the
-- other direction: viewer reading the owner's tasks.)
drop policy if exists "owners read viewer task completions" on task_completions;
create policy "owners read viewer task completions" on task_completions for select
  using (user_id in (select viewer_id from partner_links where owner_id = auth.uid() and status = 'accepted'));
