// Single source of truth: Google Sheets (normalized tables).
// localStorage is a display cache shown instantly while the sheet loads.

import type { BloomData } from './cycle';
import { loadData, saveData, emptyData } from './cycle';
import { apiLoadAll, apiSaveAll } from './api';

function getSession(): { username: string; password: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('bloom_session');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

const apiReady = () => !!process.env.NEXT_PUBLIC_BLOOM_API_URL;

export async function fetchFromSheet(): Promise<BloomData> {
  if (!apiReady()) return loadData();
  const session = getSession();
  if (!session) return loadData();
  try {
    const r = await apiLoadAll(session.username, session.password);
    if (r.ok && r.data) {
      const data: BloomData = { cycles: r.data.cycles ?? [], logs: r.data.logs ?? [], settings: r.data.settings ?? {} };
      saveData(data);
      return data;
    }
  } catch {}
  return loadData();
}

export async function saveToSheet(data: BloomData): Promise<boolean> {
  saveData(data); // cache first for instant UI
  if (!apiReady()) return true;
  const session = getSession();
  if (!session) return true;
  try {
    const r = await apiSaveAll(session.username, session.password, data);
    return !!r.ok;
  } catch {
    return false;
  }
}

export { emptyData };
