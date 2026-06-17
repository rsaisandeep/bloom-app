// Generic CSV importer — maps another app's export (Flo, Clue, Apple Health, etc.)
// into Bloom's data model. Flo has no one-tap export: users request a GDPR data
// dump (emailed JSON) whose schema is undocumented/unstable, so we accept a CSV
// the user produces and let them map columns. Robust + future-proof vs a brittle
// Flo-specific JSON parser.
import type { BloomData, DayLog, Cycle } from "./cycle";

// Bloom fields we can import into. `date` is required; the rest are optional.
export const IMPORT_FIELDS = [
  { key: "date", label: "Date", required: true },
  { key: "flow", label: "Period flow" },
  { key: "mood", label: "Mood" },
  { key: "energy", label: "Energy" },
  { key: "cramps", label: "Cramps" },
  { key: "symptoms", label: "Symptoms" },
  { key: "bbt", label: "Temperature (BBT)" },
  { key: "weight", label: "Weight" },
  { key: "notes", label: "Notes" },
] as const;
export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];
export type Mapping = Partial<Record<ImportFieldKey, string>>; // field → CSV header

export interface ParsedCSV { headers: string[]; rows: Record<string, string>[]; }

// Minimal RFC-4180-ish CSV parser (handles quoted cells, commas, escaped quotes).
export function parseCSV(text: string): ParsedCSV {
  const clean = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const records: string[][] = [];
  let row: string[] = [], cell = "", inQ = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQ) {
      if (ch === '"') { if (clean[i + 1] === '"') { cell += '"'; i++; } else inQ = false; }
      else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); records.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  row.push(cell); records.push(row);
  const headers = (records.shift() ?? []).map((h) => h.trim());
  const rows = records
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()])));
  return { headers, rows };
}

// Auto-detect which CSV header feeds each Bloom field, by fuzzy name match.
const HINTS: Record<ImportFieldKey, string[]> = {
  date: ["date", "day", "logged", "time"],
  flow: ["flow", "period", "bleeding", "menstrual", "menstruation"],
  mood: ["mood", "feeling", "emotion"],
  energy: ["energy", "vitality"],
  cramps: ["cramp", "pain"],
  symptoms: ["symptom", "symptoms", "tags", "feelings"],
  bbt: ["bbt", "temp", "temperature", "basal"],
  weight: ["weight", "mass"],
  notes: ["note", "notes", "comment"],
};
export function autoMap(headers: string[]): Mapping {
  const m: Mapping = {};
  const lower = headers.map((h) => ({ h, l: h.toLowerCase() }));
  for (const f of IMPORT_FIELDS) {
    const hints = HINTS[f.key];
    const hit = lower.find(({ l }) => hints.some((hint) => l === hint))
      ?? lower.find(({ l }) => hints.some((hint) => l.includes(hint)));
    if (hit) m[f.key] = hit.h;
  }
  return m;
}

// ── Value normalizers (other apps use varied labels) ──
function normFlow(v: string): DayLog["flow"] | undefined {
  const s = v.toLowerCase();
  if (!s || /none|no|nope|false|0/.test(s)) return s === "" ? undefined : "none";
  if (/spot|very light|light/.test(s)) return "light";
  if (/heavy|strong/.test(s)) return "heavy";
  if (/medium|moderate|normal|yes|true|period|menstru|bleed/.test(s)) return "medium";
  return "medium";
}
function normEnum<T extends string>(v: string, allowed: readonly T[], aliases: Record<string, T> = {}): T | undefined {
  const s = v.toLowerCase().trim();
  if (!s) return undefined;
  if (aliases[s]) return aliases[s];
  return allowed.find((a) => a === s || s.includes(a)) as T | undefined;
}
function normDate(v: string): string | undefined {
  if (!v) return undefined;
  // already ISO
  const isoM = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoM) return `${isoM[1]}-${isoM[2]}-${isoM[3]}`;
  // DD/MM/YYYY or MM/DD/YYYY or D-M-YY etc — assume DD/MM/YYYY (Flo/India default)
  const m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    let [, a, b, y] = m;
    if (y.length === 2) y = "20" + y;
    const day = a.padStart(2, "0"), mon = b.padStart(2, "0");
    return `${y}-${mon}-${day}`;
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}
function normNum(v: string): number | undefined {
  const n = parseFloat(v.replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? undefined : n;
}

const MOODS = ["happy", "calm", "anxious", "irritable", "sad", "energetic", "fatigued"] as const;
const ENERGY = ["high", "medium", "low", "exhausted"] as const;
const CRAMPS = ["none", "mild", "moderate", "severe"] as const;

export interface ImportResult { data: BloomData; logCount: number; cycleCount: number; dateRange: { from: string; to: string } | null; skipped: number; }

// Build logs + cycles from mapped rows and MERGE into existing data
// (imported values win for overlapping dates; existing untouched dates kept).
export function buildImport(parsed: ParsedCSV, mapping: Mapping, existing: BloomData): ImportResult {
  const get = (row: Record<string, string>, key: ImportFieldKey) => (mapping[key] ? row[mapping[key]!] ?? "" : "");
  const byDate = new Map<string, DayLog>(existing.logs.map((l) => [l.date, { ...l }]));
  let skipped = 0;
  const importedDates: string[] = [];

  for (const row of parsed.rows) {
    const date = normDate(get(row, "date"));
    if (!date) { skipped++; continue; }
    const base = byDate.get(date) ?? {
      date, cramps: "none", energy: "medium", mood: "calm",
      bloating: "none", sleep: "good", cravings: "none",
    } as DayLog;

    const flow = mapping.flow ? normFlow(get(row, "flow")) : base.flow;
    if (flow !== undefined) base.flow = flow;
    const mood = normEnum(get(row, "mood"), MOODS, { excited: "energetic", tired: "fatigued", angry: "irritable", stressed: "anxious" });
    if (mood) base.mood = mood;
    const energy = normEnum(get(row, "energy"), ENERGY, { "very low": "exhausted", normal: "medium" });
    if (energy) base.energy = energy;
    const cramps = normEnum(get(row, "cramps"), CRAMPS, { yes: "moderate", strong: "severe" });
    if (cramps) base.cramps = cramps;
    const symRaw = get(row, "symptoms");
    if (symRaw) base.symptoms = symRaw.split(/[;,|]/).map((s) => s.trim().toLowerCase().replace(/\s+/g, "_")).filter(Boolean);
    const bbt = mapping.bbt ? normNum(get(row, "bbt")) : undefined;
    if (bbt && bbt > 30 && bbt < 45) base.bbt = bbt;
    const weight = mapping.weight ? normNum(get(row, "weight")) : undefined;
    if (weight && weight > 20) base.weight = weight;
    const notes = get(row, "notes");
    if (notes) base.notes = notes;

    byDate.set(date, base);
    importedDates.push(date);
  }

  const logs = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));

  // Derive period-start dates: a bleeding day whose previous day wasn't bleeding,
  // and >12 days after the last detected start.
  const bleeding = new Set(logs.filter((l) => l.flow && l.flow !== "none").map((l) => l.date));
  const sortedBleed = [...bleeding].sort();
  const starts: string[] = [];
  for (const d of sortedBleed) {
    const prev = new Date(new Date(d).getTime() - MS_DAY_LOCAL).toISOString().slice(0, 10);
    if (bleeding.has(prev)) continue; // mid-period, not a start
    const last = starts[starts.length - 1];
    if (last && (new Date(d).getTime() - new Date(last).getTime()) / MS_DAY_LOCAL <= 12) continue;
    starts.push(d);
  }

  // Merge derived starts with existing cycles (dedupe within 1 day).
  const cycleMap = new Map<string, Cycle>(existing.cycles.map((c) => [c.startDate, { ...c }]));
  for (const s of starts) {
    const dup = [...cycleMap.keys()].some((k) => Math.abs((new Date(k).getTime() - new Date(s).getTime()) / MS_DAY_LOCAL) <= 1);
    if (!dup) cycleMap.set(s, { id: `me_${s}`, startDate: s });
  }
  const cycles = [...cycleMap.values()].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  // Recompute cycle lengths
  for (let i = 0; i < cycles.length; i++) {
    cycles[i].cycleLength = i < cycles.length - 1
      ? Math.round((new Date(cycles[i + 1].startDate).getTime() - new Date(cycles[i].startDate).getTime()) / MS_DAY_LOCAL)
      : cycles[i].cycleLength;
  }

  const range = importedDates.length
    ? { from: importedDates.reduce((a, b) => (a < b ? a : b)), to: importedDates.reduce((a, b) => (a > b ? a : b)) }
    : null;

  return {
    data: { cycles, logs, settings: existing.settings },
    logCount: importedDates.length,
    cycleCount: starts.length,
    dateRange: range,
    skipped,
  };
}

const MS_DAY_LOCAL = 86400000;

// ── Native Flo JSON import ──────────────────────────────────────────────
// Flo's data export (GDPR dump) is JSON, not CSV. The meaningful structured
// data lives in operationalData.cycles[], each carrying period_start_date /
// period_end_date. (Verified against github.com/SaraVieira/flo-to-drip, which
// reads exactly those two fields.) Per-day symptom logs aren't reliably present,
// so we reconstruct period-flow logs from the cycle date ranges.

interface FloCycle { period_start_date?: string; period_end_date?: string }
interface FloExport { operationalData?: { cycles?: FloCycle[] } }

function diffDays(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / MS_DAY_LOCAL);
}
function addDays(date: string, n: number): string {
  return new Date(new Date(date).getTime() + n * MS_DAY_LOCAL).toISOString().slice(0, 10);
}
function defaultLog(date: string): DayLog {
  return { date, cramps: "none", energy: "medium", mood: "calm", bloating: "none", sleep: "good", cravings: "none" };
}

// Pull the cycle start/end dates out of a parsed Flo export (lenient on shape).
export function parseFloCycles(json: unknown): { startDate: string; endDate?: string }[] {
  const cycles = (json as FloExport)?.operationalData?.cycles;
  if (!Array.isArray(cycles)) return [];
  const out: { startDate: string; endDate?: string }[] = [];
  for (const c of cycles) {
    const start = normDate(String(c?.period_start_date ?? ""));
    if (!start) continue;
    const end = normDate(String(c?.period_end_date ?? ""));
    out.push({ startDate: start, endDate: end });
  }
  return out;
}

export function isFloExport(json: unknown): boolean {
  return Array.isArray((json as FloExport)?.operationalData?.cycles);
}

// Build cycles + reconstructed period-flow logs from a Flo JSON export, merged
// into existing data (existing dates/cycles preserved; Flo fills the gaps).
export function buildFloImport(json: unknown, existing: BloomData): ImportResult {
  const parsed = parseFloCycles(json);
  const byDate = new Map<string, DayLog>(existing.logs.map((l) => [l.date, { ...l }]));
  const cycleMap = new Map<string, Cycle>(existing.cycles.map((c) => [c.startDate, { ...c }]));
  const importedDates: string[] = [];

  for (const { startDate, endDate } of parsed) {
    const dup = [...cycleMap.keys()].some((k) => Math.abs(diffDays(k, startDate)) <= 1);
    if (!dup) {
      const cyc: Cycle = { id: `me_${startDate}`, startDate };
      if (endDate && endDate >= startDate) {
        cyc.periodEndDate = endDate;
        cyc.periodLength = diffDays(startDate, endDate) + 1;
      }
      cycleMap.set(startDate, cyc);
    }
    // Reconstruct flow logs for each bleeding day so reports/predictions have data.
    const span = endDate && endDate >= startDate ? diffDays(startDate, endDate) : 0;
    for (let i = 0; i <= span; i++) {
      const d = addDays(startDate, i);
      const base = byDate.get(d) ?? defaultLog(d);
      base.flow = i <= 1 ? "heavy" : i === span ? "light" : "medium";
      byDate.set(d, base);
      importedDates.push(d);
    }
  }

  const logs = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  const cycles = [...cycleMap.values()].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  for (let i = 0; i < cycles.length; i++) {
    cycles[i].cycleLength = i < cycles.length - 1 ? diffDays(cycles[i].startDate, cycles[i + 1].startDate) : cycles[i].cycleLength;
  }

  const range = importedDates.length
    ? { from: importedDates.reduce((a, b) => (a < b ? a : b)), to: importedDates.reduce((a, b) => (a > b ? a : b)) }
    : null;

  return {
    data: { cycles, logs, settings: existing.settings },
    logCount: new Set(importedDates).size,
    cycleCount: parsed.length,
    dateRange: range,
    skipped: 0,
  };
}
