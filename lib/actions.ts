import type { Phase, DayLog } from './cycle';

export interface ActionItem {
  icon: string;
  title: string;
  sub: string;
}

const MAX_ITEMS = 5;

// ── Phase baselines ──
// Specific, measurable, research-backed reminders for a typical day in each phase.
const BASE: Record<Phase, ActionItem[]> = {
  menstrual: [
    { icon: '🚶', title: 'Gentle walk', sub: '15–20 min — keeps stiffness & cramps down' },
    { icon: '🫘', title: 'Iron-rich foods', sub: 'Lentils, spinach, red meat + vitamin C to absorb' },
    { icon: '🐟', title: 'Omega-3s', sub: 'Salmon, walnuts, flax — lowers prostaglandins' },
    { icon: '💧', title: 'Water', sub: '2–2.5 L — eases bloating & fatigue' },
    { icon: '😴', title: 'Sleep', sub: '8–9 h, consistent bedtime to restore' },
  ],
  follicular: [
    { icon: '🏋️', title: 'Strength training', sub: '45 min — rising estrogen boosts strength' },
    { icon: '🥚', title: 'Protein', sub: '~1.6 g/kg — builds on the energy upswing' },
    { icon: '🥬', title: 'Fermented + prebiotic foods', sub: 'Yogurt, kimchi, fiber for gut & estrogen' },
    { icon: '💧', title: 'Water', sub: '2 L' },
    { icon: '🎯', title: 'Start something new', sub: 'Best phase for fresh projects & decisions' },
  ],
  ovulation: [
    { icon: '🔥', title: 'Peak workout', sub: '45–60 min HIIT — testosterone aids power' },
    { icon: '🥦', title: 'Cruciferous veg', sub: 'Broccoli, cauliflower — supports estrogen clearance' },
    { icon: '🫐', title: 'Antioxidants', sub: 'Berries & colorful produce for the metabolic peak' },
    { icon: '💧', title: 'Water', sub: '2.5 L — high metabolic demand' },
    { icon: '🗣️', title: 'Tackle high-stakes tasks', sub: 'Confidence & verbal fluency peak now' },
  ],
  luteal: [
    { icon: '🚶', title: 'Moderate movement', sub: '30 min aerobic — lifts mood more than rest' },
    { icon: '🍠', title: 'Complex carbs', sub: 'Oats, sweet potato — steadies serotonin' },
    { icon: '🌰', title: 'Magnesium', sub: '200–400 mg — pumpkin seeds, dark chocolate' },
    { icon: '🧂', title: 'Lower sodium', sub: 'Cuts water retention & bloating' },
    { icon: '☕', title: 'No caffeine after noon', sub: 'Protects late-luteal sleep' },
    { icon: '🍽️', title: 'Eat enough', sub: 'Metabolism is +100–300 cal/day now' },
  ],
};

// ── Symptom-triggered overrides ──
// Each takes priority over the phase baseline. Ordered roughly by how much
// relief they offer for that symptom.
function symptomOverrides(log?: DayLog): ActionItem[] {
  if (!log) return [];
  const out: ActionItem[] = [];

  // Cramps
  if (log.cramps === 'severe') {
    out.push({ icon: '🔥', title: 'Heat therapy 38–40°C', sub: '15–20 min — rivals ibuprofen for cramps' });
    out.push({ icon: '🐟', title: 'Omega-3 + magnesium', sub: 'Anti-inflammatory, calms uterine contractions' });
  } else if (log.cramps === 'moderate' || log.cramps === 'mild') {
    out.push({ icon: '🔥', title: 'Warm compress', sub: '15 min on lower abdomen' });
  }

  // Bloating
  if (log.bloating === 'severe') {
    out.push({ icon: '🔄', title: 'Clockwise belly massage', sub: '5 min — follows colon, releases gas' });
    out.push({ icon: '🧂', title: 'Cut salt today', sub: 'Sodium pulls fluid into tissues' });
  }

  // Mood
  if (log.mood === 'sad' || log.mood === 'anxious') {
    out.push({ icon: '🌳', title: '20 min aerobic', sub: 'Raises BDNF & serotonin fast' });
    out.push({ icon: '🫁', title: '4-7-8 breathing', sub: 'Calms nervous system in ~90 sec' });
    out.push({ icon: '🫂', title: 'Connect with someone', sub: 'Oxytocin counters low serotonin' });
  } else if (log.mood === 'irritable') {
    out.push({ icon: '🧘', title: 'Aerobic 20–30 min', sub: 'Boosts serotonin & GABA' });
    out.push({ icon: '🫁', title: 'Box breathing', sub: '4-4-4-4 to defuse irritability' });
  }

  // Energy
  if (log.energy === 'exhausted' || log.energy === 'low') {
    out.push({ icon: '🛌', title: 'Rest, don’t fully stop', sub: '10 min light movement beats total rest' });
    out.push({ icon: '🫘', title: 'Iron + B12', sub: 'Common fatigue driver — pair with vitamin C' });
  }

  // Sleep
  if (log.sleep === 'insomnia' || log.sleep === 'poor') {
    out.push({ icon: '🌙', title: 'Magnesium before bed', sub: 'Supports GABA & sleep onset' });
    out.push({ icon: '📵', title: 'No screens 1 h before bed', sub: 'Blue light delays melatonin' });
    out.push({ icon: '🌡️', title: 'Cool, dark room', sub: '18–20°C for deeper sleep' });
  }

  // Cravings
  if (log.cravings === 'sweet' || log.cravings === 'everything') {
    out.push({ icon: '🍓', title: 'Fruit + protein swap', sub: 'Steadies blood sugar vs. refined sugar' });
    out.push({ icon: '🍫', title: 'Dark chocolate over candy', sub: 'Magnesium hit without the crash' });
  } else if (log.cravings === 'salty') {
    out.push({ icon: '🥜', title: 'Nuts or olives', sub: 'Salt craving with minerals, not chips' });
  }

  return out;
}

// Returns up to MAX_ITEMS: symptom-specific first, then phase baseline, deduped by title.
export function getActionItems(phase: Phase, log?: DayLog): ActionItem[] {
  const merged = [...symptomOverrides(log), ...BASE[phase]];
  const seen = new Set<string>();
  const out: ActionItem[] = [];
  for (const item of merged) {
    if (seen.has(item.title)) continue;
    seen.add(item.title);
    out.push(item);
    if (out.length === MAX_ITEMS) break;
  }
  return out;
}
