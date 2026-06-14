export type Phase = "menstrual" | "follicular" | "ovulation" | "luteal";

export interface CycleEntry {
  startDate: string; // ISO date string
  endDate?: string;
  cycleLength?: number;
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

export interface BloomData {
  cycles: CycleEntry[];
  logs: DayLog[];
}

const STORAGE_KEY = "bloom_data";

export function loadData(): BloomData {
  if (typeof window === "undefined") return { cycles: [], logs: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { cycles: [], logs: [] };
  } catch {
    return { cycles: [], logs: [] };
  }
}

export function saveData(data: BloomData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function saveLog(log: DayLog) {
  const data = loadData();
  const idx = data.logs.findIndex((l) => l.date === log.date);
  if (idx >= 0) data.logs[idx] = log;
  else data.logs.push(log);
  saveData(data);
}

export function startPeriod(date: string) {
  const data = loadData();
  // Close previous cycle if open
  if (data.cycles.length > 0) {
    const last = data.cycles[data.cycles.length - 1];
    if (!last.endDate) {
      last.endDate = date;
      const start = new Date(last.startDate);
      const end = new Date(date);
      last.cycleLength = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }
  }
  data.cycles.push({ startDate: date });
  saveData(data);
}

export function getCurrentPhase(cycles: CycleEntry[]): { phase: Phase; dayOfCycle: number } {
  if (cycles.length === 0) return { phase: "follicular", dayOfCycle: 1 };

  const lastCycle = cycles[cycles.length - 1];
  const start = new Date(lastCycle.startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  const dayOfCycle = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const avgLength = getAverageCycleLength(cycles);

  let phase: Phase;
  if (dayOfCycle <= 5) phase = "menstrual";
  else if (dayOfCycle <= 13) phase = "follicular";
  else if (dayOfCycle <= 16) phase = "ovulation";
  else phase = "luteal";

  return { phase, dayOfCycle };
}

export function getAverageCycleLength(cycles: CycleEntry[]): number {
  const completed = cycles.filter((c) => c.cycleLength && c.cycleLength > 0);
  if (completed.length === 0) return 28;
  const recent = completed.slice(-6);
  return Math.round(recent.reduce((s, c) => s + (c.cycleLength ?? 28), 0) / recent.length);
}

export function getPredictions(cycles: CycleEntry[]) {
  if (cycles.length === 0) return null;
  const last = cycles[cycles.length - 1];
  const avgLength = getAverageCycleLength(cycles);
  const start = new Date(last.startDate);
  const nextPeriod = new Date(start);
  nextPeriod.setDate(start.getDate() + avgLength);
  const ovulation = new Date(nextPeriod);
  ovulation.setDate(nextPeriod.getDate() - 14);
  const fertileStart = new Date(ovulation);
  fertileStart.setDate(ovulation.getDate() - 2);
  const fertileEnd = new Date(ovulation);
  fertileEnd.setDate(ovulation.getDate() + 2);

  const today = new Date();
  const daysUntilPeriod = Math.ceil((nextPeriod.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return { nextPeriod, ovulation, fertileStart, fertileEnd, daysUntilPeriod, avgLength };
}

export const PHASE_META: Record<Phase, { label: string; color: string; bg: string; emoji: string; description: string }> = {
  menstrual: {
    label: "Menstrual",
    color: "text-rose-600",
    bg: "bg-rose-50",
    emoji: "🌑",
    description: "Rest and restore. Your body is doing important work.",
  },
  follicular: {
    label: "Follicular",
    color: "text-violet-600",
    bg: "bg-violet-50",
    emoji: "🌱",
    description: "Energy is rising. A great time to start new things.",
  },
  ovulation: {
    label: "Ovulation",
    color: "text-amber-600",
    bg: "bg-amber-50",
    emoji: "🌕",
    description: "Peak energy and confidence. Your power window.",
  },
  luteal: {
    label: "Luteal",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    emoji: "🌘",
    description: "Turn inward. Nourish and prepare.",
  },
};
