import { type BloomData, type Phase, hasGoal } from './cycle';

export interface Nudge {
  id: string;
  icon: string;
  title: string;
  message: string;
  href?: string; // optional nav target
}

const STORAGE_KEY = 'bloom_nudge_dismissed';

function getDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(raw.split(',').filter(Boolean)) : new Set();
  } catch { return new Set(); }
}

export function dismissNudge(id: string) {
  try {
    const d = getDismissed();
    d.add(id);
    localStorage.setItem(STORAGE_KEY, [...d].join(','));
  } catch {}
}

export function getActiveNudge(data: BloomData, phase: Phase): Nudge | null {
  const dismissed = getDismissed();
  const { logs, settings } = data;
  if (logs.length < 3) return null;

  const candidates: Nudge[] = [];

  // BBT: 7+ days logged, never tracked BBT
  if (!logs.some((l) => l.bbt != null) && logs.length >= 7) {
    candidates.push({
      id: 'bbt_intro',
      icon: '🌡️',
      title: 'Try BBT tracking',
      message: 'Morning temperature readings confirm ovulation and sharpen your predictions over time.',
    });
  }

  // Cervical mucus: follicular/ovulation phase, never logged
  if (!logs.some((l) => l.cervicalMucus && l.cervicalMucus !== 'none') &&
      (phase === 'follicular' || phase === 'ovulation')) {
    candidates.push({
      id: 'cm_intro',
      icon: '💧',
      title: 'Cervical mucus gives real-time signals',
      message: "Logging it around ovulation week gives you a live indicator of your fertile window.",
    });
  }

  // Read tab: hasn't visited yet
  const hasVisitedRead = typeof window !== 'undefined'
    ? sessionStorage.getItem('bloom_read_visited')
    : true;
  if (!hasVisitedRead && logs.length >= 5) {
    candidates.push({
      id: 'read_intro',
      icon: '📖',
      title: 'Learn about your current phase',
      message: "The Read tab has articles tailored to where you are in your cycle right now.",
      href: '/read',
    });
  }

  // TTC: never logged ovulation test
  if (hasGoal(settings, 'conceive') && !logs.some((l) => l.ovulationTest && l.ovulationTest !== 'none')) {
    candidates.push({
      id: 'ovtest_intro',
      icon: '🔬',
      title: 'Track ovulation test results',
      message: "Logging LH test results helps confirm your fertile window more precisely.",
    });
  }

  return candidates.find((c) => !dismissed.has(c.id)) ?? null;
}
