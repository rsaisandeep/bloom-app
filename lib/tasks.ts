import { supabase } from './supabase';

// Daily-focus checklist completion, synced so it follows the user across devices
// and so an accepted partner (viewer) can see which tasks are struck vs pending.
// `done` is the list of flattened task indices, matching the home screen's local
// `bloom_actions_<day>` cache. Reads degrade to null if the table isn't migrated.

export async function fetchTaskDone(date: string, ownerId?: string): Promise<number[] | null> {
  const uid = ownerId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from('task_completions')
    .select('done')
    .eq('user_id', uid)
    .eq('date', date)
    .maybeSingle();
  if (error) return null;
  return Array.isArray(data?.done) ? (data!.done as number[]) : null;
}

export async function saveTaskDone(date: string, done: number[]): Promise<void> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return;
  await supabase
    .from('task_completions')
    .upsert({ user_id: uid, date, done, updated_at: new Date().toISOString() }, { onConflict: 'user_id,date' });
}
