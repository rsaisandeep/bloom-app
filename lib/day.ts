// The app's logical day rolls over at 5 AM local time, not midnight.
// A log or focus checklist touched at 2 AM still belongs to the previous day,
// so "Today's focus" only resets once you're properly into the next morning.

const DAY_START_HOUR = 5;

/** Plain local YYYY-MM-DD for a given date (no boundary shift). */
export function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** The current logical day key, where the day starts at 5 AM local time. */
export function appDayKey(now: Date = new Date()): string {
  const d = new Date(now);
  d.setHours(d.getHours() - DAY_START_HOUR);
  return localDateStr(d);
}
