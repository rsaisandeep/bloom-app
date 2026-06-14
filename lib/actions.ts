import type { Phase, DayLog } from './cycle';

export interface ActionItem {
  icon: string;
  title: string;
  sub: string;
}

// Predefined, reminder-style action items per phase.
// Concise and checkable — derived from the same science as the insights.
const BASE: Record<Phase, ActionItem[]> = {
  menstrual: [
    { icon: '🚶', title: 'Gentle walk', sub: '20 min, low intensity' },
    { icon: '💧', title: 'Water', sub: '2 L — eases bloating' },
    { icon: '🌿', title: 'Iron + magnesium', sub: 'Spinach, lentils, dark chocolate' },
    { icon: '😴', title: 'Sleep', sub: '8–9 h to restore' },
  ],
  follicular: [
    { icon: '🏃', title: 'Exercise', sub: '45 min strength or cardio' },
    { icon: '💧', title: 'Water', sub: '2 L' },
    { icon: '🥚', title: 'Protein + fermented foods', sub: 'Eggs, yogurt, kimchi' },
    { icon: '🌅', title: 'Sleep', sub: '7–8 h' },
  ],
  ovulation: [
    { icon: '🔥', title: 'Peak workout', sub: '45–60 min, go hard' },
    { icon: '💧', title: 'Water', sub: '2.5 L' },
    { icon: '🥦', title: 'Cruciferous veg', sub: 'Broccoli, antioxidants' },
    { icon: '😴', title: 'Sleep', sub: '7–8 h' },
  ],
  luteal: [
    { icon: '🧘', title: 'Moderate movement', sub: '30 min walk or pilates' },
    { icon: '🍫', title: 'Magnesium + complex carbs', sub: 'Oats, sweet potato, seeds' },
    { icon: '💧', title: 'Water, less salt', sub: '2 L — reduces bloating' },
    { icon: '☕', title: 'No caffeine after noon', sub: 'Protects sleep' },
  ],
};

// Symptom-triggered overrides that take priority over a base slot.
function symptomOverrides(log?: DayLog): ActionItem[] {
  if (!log) return [];
  const extra: ActionItem[] = [];
  if (log.cramps === 'severe' || log.cramps === 'moderate')
    extra.push({ icon: '🔥', title: 'Heat therapy', sub: '15 min on lower abdomen' });
  if (log.bloating === 'severe')
    extra.push({ icon: '🧂', title: 'Cut salt today', sub: 'Limits water retention' });
  if (log.energy === 'low' || log.energy === 'exhausted')
    extra.push({ icon: '🛌', title: 'Extra rest', sub: 'Lighten your load' });
  if (log.sleep === 'insomnia' || log.sleep === 'poor')
    extra.push({ icon: '🌙', title: 'Magnesium before bed', sub: 'Screens off 1 h prior' });
  if (log.cravings === 'sweet' || log.cravings === 'everything')
    extra.push({ icon: '🍓', title: 'Swap sugar for fruit', sub: 'Pair with protein' });
  return extra;
}

// Returns up to 4 items: symptom-specific ones first, then phase base, deduped by title.
export function getActionItems(phase: Phase, log?: DayLog): ActionItem[] {
  const overrides = symptomOverrides(log);
  const merged = [...overrides, ...BASE[phase]];
  const seen = new Set<string>();
  const out: ActionItem[] = [];
  for (const item of merged) {
    if (seen.has(item.title)) continue;
    seen.add(item.title);
    out.push(item);
    if (out.length === 4) break;
  }
  return out;
}
