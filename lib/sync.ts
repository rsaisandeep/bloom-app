import { apiSaveAll } from './api';
import { loadData } from './cycle';

// Fire-and-forget sync to Google Sheets after any data mutation.
// Reads session from localStorage — safe to call on every save.
export function syncToSheet() {
  if (!process.env.NEXT_PUBLIC_BLOOM_API_URL) return;
  if (typeof window === 'undefined') return;

  const raw = localStorage.getItem('bloom_session');
  if (!raw) return;

  try {
    const { username, password } = JSON.parse(raw);
    const data = loadData();
    apiSaveAll(username, password, data).catch(() => {
      // Silent failure — localStorage is source of truth
    });
  } catch {
    // ignore
  }
}
