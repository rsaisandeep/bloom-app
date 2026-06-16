import { supabase } from './supabase';
import { loadData } from './cycle';
import { saveToSheet } from './data';

// Fire-and-forget sync to Supabase after any data mutation.
export function syncToSheet() {
  if (typeof window === 'undefined') return;
  supabase.auth.getUser().then(({ data }) => {
    if (!data.user) return;
    saveToSheet(loadData()).catch(() => {});
  });
}
