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

// Strips time component from any ISO datetime string (e.g. "2026-06-15T00:00:00.000Z" → "2026-06-15").
// Sheets auto-converts date strings to Date objects; Code.gs fmtDate() fixes this server-side,
// but this guards against stale cache entries written before that fix.
function isoDate(s: string | undefined): string | undefined {
  if (!s) return undefined;
  return s.length > 10 && s.includes('T') ? s.slice(0, 10) : s;
}

function sanitize(data: BloomData): BloomData {
  return {
    ...data,
    cycles: data.cycles.map((c) => ({
      ...c,
      startDate: isoDate(c.startDate) ?? c.startDate,
      periodEndDate: isoDate(c.periodEndDate),
    })),
    logs: data.logs.map((l) => ({ ...l, date: isoDate(l.date) ?? l.date })),
  };
}

export { sanitize };

export async function fetchFromSheet(): Promise<BloomData> {
  if (!apiReady()) return loadData();
  const session = getSession();
  if (!session) return loadData();
  try {
    const r = await apiLoadAll(session.username, session.password);
    if (r.ok && r.data) {
      const data = sanitize({ cycles: r.data.cycles ?? [], logs: r.data.logs ?? [], settings: r.data.settings ?? {} });
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
