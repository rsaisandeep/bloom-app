import { type BloomData } from './cycle';

export type AnomalyType = 'short_cycle' | 'long_period' | 'cycle_irregular';

export interface Anomaly {
  type: AnomalyType;
  title: string;
  message: string;
}

const MIN_PLAUSIBLE = 15;
const MAX_PLAUSIBLE = 60;

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(date: string, n: number): string {
  const d = new Date(date); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function detectAnomalies(data: BloomData): Anomaly[] {
  const out: Anomaly[] = [];
  const { cycles, logs } = data;
  if (cycles.length < 1) return out;

  const completed = cycles.filter(
    (c) => c.cycleLength && c.cycleLength >= MIN_PLAUSIBLE && c.cycleLength <= MAX_PLAUSIBLE,
  );

  // Short cycle: most recent completed cycle < 21 days
  if (completed.length >= 1) {
    const last = completed[completed.length - 1];
    if (last.cycleLength! < 21) {
      out.push({
        type: 'short_cycle',
        title: 'Short cycle noted',
        message: `Your last cycle was ${last.cycleLength} days — shorter than typical. Occasional short cycles are normal, but worth tracking.`,
      });
    }
  }

  // Long period: current active cycle has 8+ consecutive logged flow days
  if (cycles.length >= 1) {
    const cur = cycles[cycles.length - 1];
    const today = todayStr();
    const daysIn = Math.round((new Date(today).getTime() - new Date(cur.startDate).getTime()) / 86400000);
    if (daysIn <= 14 && !cur.periodEndDate) {
      let flowDays = 0;
      for (let i = 0; i <= daysIn; i++) {
        const d = addDays(cur.startDate, i);
        const log = logs.find((l) => l.date === d);
        if (log?.flow && log.flow !== 'none') { flowDays++; }
        else if (flowDays > 0) break;
      }
      if (flowDays > 8) {
        out.push({
          type: 'long_period',
          title: 'Period lasting a while',
          message: `${flowDays} days of flow logged. Periods over 7 days are worth mentioning to a doctor.`,
        });
      }
    }
  }

  // Irregular cycles: stdDev ≥ 6 days across recent completed cycles
  if (completed.length >= 3) {
    const recent = completed.slice(-4).map((c) => c.cycleLength!);
    const mean = recent.reduce((s, n) => s + n, 0) / recent.length;
    const std = Math.sqrt(recent.reduce((s, n) => s + (n - mean) ** 2, 0) / recent.length);
    if (std >= 6) {
      const min = Math.min(...recent), max = Math.max(...recent);
      out.push({
        type: 'cycle_irregular',
        title: 'Cycle length varies',
        message: `Recent cycles range ${min}–${max} days. High variability can be normal — tracking helps identify patterns.`,
      });
    }
  }

  return out;
}
