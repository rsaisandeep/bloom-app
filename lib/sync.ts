import { supabase } from './supabase';
import { loadData } from './cycle';
import { saveToSheet } from './data';

// Fire-and-forget sync to Supabase after any data mutation.
export function syncToSheet() {
  if (typeof window === 'undefined') return;
  // Viewers never push — they're holding a partner's data in cache (see saveToSheet).
  if (localStorage.getItem('bloom_view_owner')) return;
  supabase.auth.getUser().then(({ data }) => {
    if (!data.user) return;
    saveToSheet(loadData()).catch(() => {});
  });
}
