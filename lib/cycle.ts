export type Phase = "menstrual" | "follicular" | "ovulation" | "luteal";

// ── Normalized model (mirrors the sheet tables) ──

export interface Cycle {
  id: string;               // `${username}_${startDate}` — stable PK
  startDate: string;        // day 1 (period start), ISO date
  periodEndDate?: string;   // last bleeding day
  cycleLength?: number;     // days to next period start (set when next cycle begins)
  periodLength?: number;    // bleeding days (derived from flow logs / onboarding)
}

export interface DayLog {
  date: string;
  cramps: "none" | "mild" | "moderate" | "severe";
  energy: "high" | "medium" | "low" | "exhausted";
  mood: "happy" | "calm" | "anxious" | "irritable" | "sad" | "energetic" | "fatigued";
  bloating: "none" | "mild" | "severe";
  sleep: "good" | "poor" | "insomnia";
  cravings: "none" | "sweet" | "salty" | "everything";
  flow?: "none" | "light" | "medium" | "heavy";
  notes?: string;
}

export interface BloomSettings {
  pcosMode?: boolean;
  paused?: boolean;             // pregnancy / break — stops predictions & reminders
  defaultCycleLength?: number;  // from onboarding
  defaultPeriodLength?: number; // from onboarding
}

export interface BloomData {
  cycles: Cycle[];
  logs: DayLog[];
  settings: BloomSettings;
}

const STORAGE_KEY = "bloom_data";
const MS_DAY = 86400000;

export function emptyData(): BloomData {
  return { cycles: [], logs: [], settings: {} };
}

// ── Date helpers ──
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / MS_DAY);
}
function addDaysStr(date: string, n: number): string {
  const d = new Date(date); d.setDate(d.getDate() + n);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Lazy import to avoid circular deps — sync.ts imports from cycle.ts
function syncAfterSave() {
  import("./sync").then((m) => m.syncToSheet()).catch(() => {});
}

// ── Local cache (mirror of sheet) ──
export function loadData(): BloomData {
  if (typeof window === "undefined") return emptyData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const d = JSON.parse(raw);
    return { cycles: d.cycles ?? [], logs: d.logs ?? [], settings: d.settings ?? {} };
  } catch {
    return emptyData();
  }
}

export function saveData(data: BloomData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Mutations ──
export function saveLog(log: DayLog) {
  const data = loadData();
  const idx = data.logs.findIndex((l) => l.date === log.date);
  if (idx >= 0) data.logs[idx] = log;
  else data.logs.push(log);

  // Keep the current cycle's derived period length fresh.
  if (data.cycles.length) {
    const cur = data.cycles[data.cycles.length - 1];
    const pl = derivePeriodLength(cur, data.logs);
    if (pl) { cur.periodLength = pl; cur.periodEndDate = addDaysStr(cur.startDate, pl - 1); }
  }

  saveData(data);
  syncAfterSave();
}

// A flow log only starts a NEW cycle if the last period began long enough ago
// (avoids re-triggering mid-period or on spotting).
export function isNewPeriodStart(data: BloomData, date: string): boolean {
  if (data.cycles.length === 0) return true;
  const last = data.cycles[data.cycles.length - 1];
  return daysBetween(last.startDate, date) > 12;
}

// Recompute cycle lengths (and fill missing period lengths) after any insert/delete.
function recomputeCycles(data: BloomData) {
  data.cycles.sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  const cs = data.cycles;
  for (let i = 0; i < cs.length; i++) {
    cs[i].cycleLength = i < cs.length - 1 ? daysBetween(cs[i].startDate, cs[i + 1].startDate) : undefined;
    if (!cs[i].periodLength) cs[i].periodLength = derivePeriodLength(cs[i], data.logs);
  }
}

// Insert a period start at any date (today or back-dated). Chronologically
// correct and idempotent — ignores a duplicate within a day of an existing one.
export function addPeriodStart(date: string, username = "me") {
  const data = loadData();
  if (data.cycles.some((c) => Math.abs(daysBetween(c.startDate, date)) <= 1)) return;
  data.cycles.push({ id: `${username}_${date}`, startDate: date });
  recomputeCycles(data);
  if (data.settings.paused) data.settings = { ...data.settings, paused: false }; // logging a period resumes tracking
  saveData(data);
  syncAfterSave();
}

// Back-compat alias used by the flow auto-detect path.
export const startPeriod = addPeriodStart;

export function deleteCycle(id: string) {
  const data = loadData();
  data.cycles = data.cycles.filter((c) => c.id !== id);
  recomputeCycles(data);
  saveData(data);
  syncAfterSave();
}

// Cycle lengths outside this range are treated as skipped/forgotten periods.
const MIN_PLAUSIBLE = 15;
const MAX_PLAUSIBLE = 60;
export function isLikelySkipped(cycleLength?: number): boolean {
  return !!cycleLength && cycleLength > MAX_PLAUSIBLE;
}

// ── Settings ──
export function getSettings(): BloomSettings {
  return loadData().settings ?? {};
}
export function updateSettings(patch: Partial<BloomSettings>) {
  const data = loadData();
  data.settings = { ...data.settings, ...patch };
  saveData(data);
  syncAfterSave();
}
export function setPcosMode(on: boolean) {
  updateSettings({ pcosMode: on });
}
export function setPaused(on: boolean) {
  updateSettings({ paused: on });
}

// ── Derivations ──

// Period length = consecutive flow days from the cycle's start.
export function derivePeriodLength(cycle: Cycle, logs: DayLog[]): number | undefined {
  let len = 0;
  for (let i = 0; i <= 14; i++) {
    const d = addDaysStr(cycle.startDate, i);
    const log = logs.find((l) => l.date === d);
    const bleeding = !!log && !!log.flow && log.flow !== "none";
    if (bleeding) len = i + 1;
    else if (i > 0) break; // first dry day after bleeding ends the period
  }
  return len > 0 ? len : undefined;
}

export function getDefaultCycleLength(data: BloomData): number {
  return data.settings.defaultCycleLength ?? 28;
}
export function getDefaultPeriodLength(data: BloomData): number {
  return data.settings.defaultPeriodLength ?? 5;
}

export function getAverageCycleLength(data: BloomData): number {
  // Exclude implausible lengths (skipped/forgotten periods) so they don't skew predictions.
  const done = data.cycles.filter((c) => c.cycleLength && c.cycleLength >= MIN_PLAUSIBLE && c.cycleLength <= MAX_PLAUSIBLE);
  if (done.length === 0) return getDefaultCycleLength(data);
  const recent = done.slice(-6);
  return Math.round(recent.reduce((s, c) => s + (c.cycleLength as number), 0) / recent.length);
}

export function getAveragePeriodLength(data: BloomData): number {
  const done = data.cycles.filter((c) => c.periodLength && c.periodLength > 0);
  if (done.length === 0) return getDefaultPeriodLength(data);
  const recent = done.slice(-6);
  return Math.round(recent.reduce((s, c) => s + (c.periodLength as number), 0) / recent.length);
}

// Adaptive phase boundaries based on the user's real period & cycle length.
export function getCurrentPhase(data: BloomData): { phase: Phase; dayOfCycle: number } {
  if (data.cycles.length === 0) return { phase: "follicular", dayOfCycle: 1 };
  const last = data.cycles[data.cycles.length - 1];
  const dayOfCycle = daysBetween(last.startDate, todayLocal()) + 1;

  const cycleLen = getAverageCycleLength(data);
  const periodLen = last.periodLength ?? getDefaultPeriodLength(data);
  const ovulationDay = Math.max(periodLen + 3, cycleLen - 14);

  let phase: Phase;
  if (dayOfCycle <= periodLen) phase = "menstrual";
  else if (dayOfCycle < ovulationDay - 1) phase = "follicular";
  else if (dayOfCycle <= ovulationDay + 1) phase = "ovulation";
  else phase = "luteal";

  return { phase, dayOfCycle: Math.max(dayOfCycle, 1) };
}

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getPredictions(data: BloomData) {
  if (data.cycles.length === 0) return null;
  const last = data.cycles[data.cycles.length - 1];
  const avgLength = getAverageCycleLength(data);
  const start = new Date(last.startDate);
  const nextPeriod = new Date(start); nextPeriod.setDate(start.getDate() + avgLength);
  const ovulation = new Date(nextPeriod); ovulation.setDate(nextPeriod.getDate() - 14);
  const fertileStart = new Date(ovulation); fertileStart.setDate(ovulation.getDate() - 2);
  const fertileEnd = new Date(ovulation); fertileEnd.setDate(ovulation.getDate() + 2);
  const today = new Date();
  const daysUntilPeriod = Math.ceil((nextPeriod.getTime() - today.getTime()) / MS_DAY);
  return { nextPeriod, ovulation, fertileStart, fertileEnd, daysUntilPeriod, avgLength };
}

// PCOS-aware: a window sized by observed cycle variability.
export function getPredictionWindow(data: BloomData) {
  const pred = getPredictions(data);
  if (!pred) return null;
  const lengths = data.cycles.filter((c) => c.cycleLength && c.cycleLength > 0).map((c) => c.cycleLength as number);
  let spread = 7;
  if (lengths.length >= 2) {
    const min = Math.min(...lengths), max = Math.max(...lengths);
    spread = Math.min(14, Math.max(4, Math.ceil((max - min) / 2)));
  }
  const early = new Date(pred.nextPeriod); early.setDate(early.getDate() - spread);
  const late = new Date(pred.nextPeriod); late.setDate(late.getDate() + spread);
  return { ...pred, early, late, spread };
}

// How many days past the expected period we are (uses the PCOS window edge
// when PCOS mode is on, otherwise the point prediction). null if not late.
export function getLateInfo(data: BloomData): { daysLate: number; suggestPause: boolean } | null {
  if (data.settings.paused) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let threshold: Date | null = null;
  if (data.settings.pcosMode) {
    const w = getPredictionWindow(data);
    threshold = w ? new Date(w.late) : null;
  } else {
    const p = getPredictions(data);
    threshold = p ? new Date(p.nextPeriod) : null;
  }
  if (!threshold) return null;
  threshold.setHours(0, 0, 0, 0);
  const daysLate = Math.floor((today.getTime() - threshold.getTime()) / MS_DAY);
  // Beyond ~45 days overdue, nagging is unhelpful — suggest pausing instead.
  return daysLate > 0 ? { daysLate, suggestPause: daysLate > 45 } : null;
}

export function isPaused(data: BloomData): boolean {
  return !!data.settings.paused;
}

export const PHASE_META: Record<Phase, { label: string; color: string; bg: string; emoji: string; description: string }> = {
  menstrual: { label: "Menstrual", color: "text-rose-600", bg: "bg-rose-50", emoji: "🌑", description: "Rest and restore. Your body is doing important work." },
  follicular: { label: "Follicular", color: "text-violet-600", bg: "bg-violet-50", emoji: "🌱", description: "Energy is rising. A great time to start new things." },
  ovulation: { label: "Ovulation", color: "text-amber-600", bg: "bg-amber-50", emoji: "🌕", description: "Peak energy and confidence. Your power window." },
  luteal: { label: "Luteal", color: "text-indigo-600", bg: "bg-indigo-50", emoji: "🌘", description: "Turn inward. Nourish and prepare." },
};
