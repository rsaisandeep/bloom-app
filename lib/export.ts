// Data export + doctor-ready summary. No external deps: CSV via Blob download,
// PDF via the browser's print-to-PDF (see DoctorSummary modal).
import {
  type BloomData,
  getAverageCycleLength,
  getAveragePeriodLength,
  getCycleLengthStdDev,
} from "./cycle";
import { computeInsights, type SymptomFreq } from "./insights";

const LOG_COLUMNS = [
  "date", "flow", "cramps", "energy", "mood", "bloating", "sleep",
  "cravings", "cervicalMucus", "bbt", "sex", "ovulationTest", "pregnancyTest",
  "pill", "water", "weight", "symptoms", "notes",
] as const;

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = Array.isArray(v) ? v.join("; ") : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Full daily-log export — one row per logged day, every symptom field.
export function buildLogsCSV(data: BloomData): string {
  const rows = [...data.logs].sort((a, b) => (a.date < b.date ? -1 : 1));
  const lines = [LOG_COLUMNS.join(",")];
  for (const log of rows) {
    lines.push(LOG_COLUMNS.map((c) => csvCell((log as unknown as Record<string, unknown>)[c])).join(","));
  }
  return lines.join("\n");
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface CycleRow { start: string; end?: string; cycleLength?: number; periodLength?: number; }
export interface DoctorSummary {
  generatedOn: string;
  dateRange: { from: string; to: string } | null;
  cycleCount: number;
  avgCycle: number;
  cycleRange: { min: number; max: number } | null;
  avgPeriod: number;
  regularity: { irregular: boolean; stdDev: number };
  recentCycles: CycleRow[];
  topSymptoms: SymptomFreq[];
  loggedDays: number;
}

export function buildSummary(data: BloomData): DoctorSummary {
  const insights = computeInsights(data);
  const completed = data.cycles.filter((c) => c.cycleLength && c.cycleLength >= 15 && c.cycleLength <= 60);
  const lens = completed.map((c) => c.cycleLength as number);
  const dates = data.cycles.map((c) => c.startDate).sort();
  const recentCycles: CycleRow[] = [...data.cycles]
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
    .slice(0, 12)
    .map((c) => ({ start: c.startDate, end: c.periodEndDate, cycleLength: c.cycleLength, periodLength: c.periodLength }));

  return {
    generatedOn: new Date().toISOString().slice(0, 10),
    dateRange: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
    cycleCount: data.cycles.length,
    avgCycle: getAverageCycleLength(data),
    cycleRange: lens.length ? { min: Math.min(...lens), max: Math.max(...lens) } : null,
    avgPeriod: getAveragePeriodLength(data),
    regularity: { irregular: getCycleLengthStdDev(data) >= 3, stdDev: Math.round(getCycleLengthStdDev(data) * 10) / 10 },
    recentCycles,
    topSymptoms: insights.symptoms,
    loggedDays: insights.loggedDays,
  };
}
