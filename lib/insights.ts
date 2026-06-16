// "Your patterns" — per-user trends derived from logged history.
// Pure functions over BloomData; no network, no new infra.
import {
  type BloomData,
  type Phase,
  type DayLog,
  getAverageCycleLength,
  getAveragePeriodLength,
  getCycleLengthStdDev,
  getDefaultPeriodLength,
} from "./cycle";

const MS_DAY = 86400000;
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / MS_DAY);
}

export const PHASES: Phase[] = ["menstrual", "follicular", "ovulation", "luteal"];

export const SYMPTOM_META: Record<string, { label: string; emoji: string }> = {
  headache: { label: "Headache", emoji: "🤕" },
  acne: { label: "Acne", emoji: "💢" },
  backache: { label: "Backache", emoji: "🔙" },
  tender_breasts: { label: "Tender breasts", emoji: "💗" },
  nausea: { label: "Nausea", emoji: "🤢" },
  fatigue: { label: "Fatigue", emoji: "😮‍💨" },
};

const MOOD_LABEL: Record<DayLog["mood"], string> = {
  happy: "Happy", calm: "Calm", anxious: "Anxious", irritable: "Irritable",
  sad: "Sad", energetic: "Energetic", fatigued: "Fatigued",
};

const ENERGY_SCORE: Record<DayLog["energy"], number> = {
  high: 3, medium: 2, low: 1, exhausted: 0,
};
const ENERGY_LABEL = ["Very low", "Low", "Moderate", "High"];

// Which cycle phase a past-dated log fell in. null = no cycle covers it
// (e.g. before tracking began, or inside a long skipped-period gap).
export function phaseForDate(data: BloomData, date: string): Phase | null {
  const sorted = [...data.cycles].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  let cyc = null as (typeof sorted)[number] | null;
  for (const c of sorted) {
    if (c.startDate <= date) cyc = c;
    else break;
  }
  if (!cyc) return null;
  const dayOfCycle = daysBetween(cyc.startDate, date) + 1;
  if (dayOfCycle < 1) return null;
  const cycleLen = cyc.cycleLength ?? getAverageCycleLength(data);
  const periodLen = cyc.periodLength ?? getDefaultPeriodLength(data);
  if (dayOfCycle > cycleLen + 5) return null; // log sits in a gap, not a real cycle
  const ovulationDay = Math.max(periodLen + 3, cycleLen - 14);
  if (dayOfCycle <= periodLen) return "menstrual";
  if (dayOfCycle < ovulationDay - 1) return "follicular";
  if (dayOfCycle <= ovulationDay + 1) return "ovulation";
  return "luteal";
}

export interface SymptomFreq { key: string; label: string; emoji: string; count: number; pct: number; }
export interface PhaseMood { phase: Phase; topMood: string | null; energy: number | null; energyLabel: string; count: number; }

export interface Insights {
  loggedDays: number;
  cycleStats: { history: number[]; avg: number; periodAvg: number; stdDev: number; irregular: boolean } | null;
  symptoms: SymptomFreq[];
  byPhase: PhaseMood[];
  correlations: string[];
  enough: boolean; // enough history to show meaningful patterns
}

function topKey<T extends string>(counts: Record<T, number>): T | null {
  let best: T | null = null, n = -1;
  for (const k in counts) if (counts[k] > n) { n = counts[k]; best = k as T; }
  return n > 0 ? best : null;
}

export function computeInsights(data: BloomData): Insights {
  const logs = data.logs ?? [];
  const loggedDays = logs.length;

  // Cycle length / variability
  const history = data.cycles.filter((c) => c.cycleLength).map((c) => c.cycleLength!).slice(-6);
  const stdDev = getCycleLengthStdDev(data);
  const cycleStats = history.length
    ? { history, avg: getAverageCycleLength(data), periodAvg: getAveragePeriodLength(data), stdDev, irregular: stdDev >= 3 }
    : null;

  // Symptom frequency (from the symptothermal multi-select)
  const symCount: Record<string, number> = {};
  for (const l of logs) for (const s of l.symptoms ?? []) symCount[s] = (symCount[s] ?? 0) + 1;
  const symptoms: SymptomFreq[] = Object.entries(symCount)
    .map(([key, count]) => ({
      key,
      label: SYMPTOM_META[key]?.label ?? key,
      emoji: SYMPTOM_META[key]?.emoji ?? "•",
      count,
      pct: Math.round((count / loggedDays) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Mood + energy aggregated by phase
  const buckets: Record<Phase, { mood: Record<string, number>; energy: number[] }> =
    { menstrual: { mood: {}, energy: [] }, follicular: { mood: {}, energy: [] }, ovulation: { mood: {}, energy: [] }, luteal: { mood: {}, energy: [] } };
  for (const l of logs) {
    const ph = phaseForDate(data, l.date);
    if (!ph) continue;
    buckets[ph].mood[l.mood] = (buckets[ph].mood[l.mood] ?? 0) + 1;
    buckets[ph].energy.push(ENERGY_SCORE[l.energy]);
  }
  const byPhase: PhaseMood[] = PHASES.map((phase) => {
    const b = buckets[phase];
    const count = b.energy.length;
    const moodKey = topKey(b.mood);
    const energy = count ? b.energy.reduce((s, n) => s + n, 0) / count : null;
    return {
      phase,
      topMood: moodKey ? MOOD_LABEL[moodKey as DayLog["mood"]] : null,
      energy,
      energyLabel: energy == null ? "—" : ENERGY_LABEL[Math.round(energy)],
      count,
    };
  });

  const correlations = deriveCorrelations(data, logs, byPhase);
  const enough = loggedDays >= 4 || (cycleStats?.history.length ?? 0) >= 2;

  return { loggedDays, cycleStats, symptoms, byPhase, correlations, enough };
}

// Conservative, sample-gated heuristics — only surface a pattern when there's
// enough data behind it to not be noise.
function deriveCorrelations(data: BloomData, logs: DayLog[], byPhase: PhaseMood[]): string[] {
  const out: string[] = [];
  const byDate = new Map(logs.map((l) => [l.date, l]));

  // Poor sleep → next-day low energy
  let badSleep = 0, thenLow = 0;
  for (const l of logs) {
    if (l.sleep === "poor" || l.sleep === "insomnia") {
      const next = byDate.get(addDay(l.date, 1));
      if (next) { badSleep++; if (next.energy === "low" || next.energy === "exhausted") thenLow++; }
    }
  }
  if (badSleep >= 3 && thenLow / badSleep >= 0.5) {
    out.push(`Poor sleep is usually followed by low energy the next day (${thenLow}/${badSleep} times).`);
  }

  // Cravings concentrated in luteal phase
  const lutealCrave = pctWith(logs, data, "luteal", (l) => !!l.cravings && l.cravings !== "none");
  const otherCrave = pctWith(logs, data, "other", (l) => !!l.cravings && l.cravings !== "none");
  if (lutealCrave.n >= 3 && lutealCrave.pct - otherCrave.pct >= 20) {
    out.push(`Cravings spike in your luteal phase — ${lutealCrave.pct}% of those days vs ${otherCrave.pct}% otherwise.`);
  }

  // Dominant mood callout for the phase with the clearest signal
  const strong = byPhase
    .filter((p) => p.count >= 3 && p.topMood)
    .sort((a, b) => b.count - a.count)[0];
  if (strong) out.push(`You most often feel ${strong.topMood!.toLowerCase()} during your ${strong.phase} phase.`);

  return out;
}

function pctWith(logs: DayLog[], data: BloomData, scope: Phase | "other", pred: (l: DayLog) => boolean) {
  let n = 0, hit = 0;
  for (const l of logs) {
    const ph = phaseForDate(data, l.date);
    if (!ph) continue;
    const inScope = scope === "other" ? ph !== "luteal" : ph === scope;
    if (!inScope) continue;
    n++; if (pred(l)) hit++;
  }
  return { n, pct: n ? Math.round((hit / n) * 100) : 0 };
}

function addDay(date: string, n: number): string {
  const d = new Date(date); d.setDate(d.getDate() + n);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
