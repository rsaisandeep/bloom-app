// Single source of truth: Google Sheets.
// localStorage is only a display cache (shown instantly while sheet loads).

import type { BloomData } from './cycle';
import { loadData, saveData } from './cycle';
import { apiLoadData, apiSaveData } from './api';

function getSession(): { username: string; password: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('bloom_session');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

const apiReady = () => !!process.env.NEXT_PUBLIC_BLOOM_API_URL;

// Always fetch from sheet; fall back to local cache only on network error.
export async function fetchFromSheet(): Promise<BloomData> {
  if (!apiReady()) return loadData();
  const session = getSession();
  if (!session) return loadData();
  try {
    const r = await apiLoadData(session.username, session.password);
    if (r.ok && r.data) {
      saveData(r.data); // keep local cache in sync
      return r.data;
    }
  } catch {}
  return loadData();
}

// Save to sheet immediately (awaited). Also updates local cache.
export async function saveToSheet(data: BloomData): Promise<boolean> {
  saveData(data); // update cache first for instant UI
  if (!apiReady()) return true;
  const session = getSession();
  if (!session) return true;
  try {
    const r = await apiSaveData(session.username, session.password, data);
    return !!r.ok;
  } catch {
    return false;
  }
}
