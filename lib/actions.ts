import type { Phase, DayLog } from './cycle';
import { PHASE_META } from './cycle';

export interface ActionItem {
  icon: string;
  title: string;
  sub: string;
  group: string; // what this task targets (a check-in symptom, fertility, or the phase)
}

export interface ActionGroup {
  group: string;
  items: ActionItem[];
}

// ── Phase baselines ──
// Specific, measurable, research-backed reminders for a typical day in each phase.
// `group` is filled in per-phase by getActionGroups.
const BASE: Record<Phase, Omit<ActionItem, 'group'>[]> = {
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

// ── Symptom-triggered tasks, tagged with the check-in they target ──
// Each item names the group ("what it's targeting") so the home screen can
// show them under a header per symptom.
function symptomOverrides(log?: DayLog): ActionItem[] {
  if (!log) return [];
  const out: ActionItem[] = [];

  // Cramps
  if (log.cramps === 'severe') {
    out.push({ group: 'Cramps', icon: '🔥', title: 'Heat therapy 38–40°C', sub: '15–20 min — rivals ibuprofen for cramps' });
    out.push({ group: 'Cramps', icon: '🐟', title: 'Omega-3 + magnesium', sub: 'Anti-inflammatory, calms uterine contractions' });
  } else if (log.cramps === 'moderate' || log.cramps === 'mild') {
    out.push({ group: 'Cramps', icon: '🔥', title: 'Warm compress', sub: '15 min on lower abdomen' });
  }

  // Bloating
  if (log.bloating === 'severe') {
    out.push({ group: 'Bloating', icon: '🔄', title: 'Clockwise belly massage', sub: '5 min — follows colon, releases gas' });
    out.push({ group: 'Bloating', icon: '🧂', title: 'Cut salt today', sub: 'Sodium pulls fluid into tissues' });
  }

  // Mood
  if (log.mood === 'sad' || log.mood === 'anxious') {
    out.push({ group: 'Mood', icon: '🌳', title: '20 min aerobic', sub: 'Raises BDNF & serotonin fast' });
    out.push({ group: 'Mood', icon: '🫁', title: '4-7-8 breathing', sub: 'Calms nervous system in ~90 sec' });
    out.push({ group: 'Mood', icon: '🫂', title: 'Connect with someone', sub: 'Oxytocin counters low serotonin' });
  } else if (log.mood === 'irritable') {
    out.push({ group: 'Mood', icon: '🧘', title: 'Aerobic 20–30 min', sub: 'Boosts serotonin & GABA' });
    out.push({ group: 'Mood', icon: '🫁', title: 'Box breathing', sub: '4-4-4-4 to defuse irritability' });
  }

  // Energy
  if (log.energy === 'exhausted' || log.energy === 'low') {
    out.push({ group: 'Energy', icon: '🛌', title: 'Rest, don’t fully stop', sub: '10 min light movement beats total rest' });
    out.push({ group: 'Energy', icon: '🫘', title: 'Iron + B12', sub: 'Common fatigue driver — pair with vitamin C' });
  }

  // Sleep
  if (log.sleep === 'insomnia' || log.sleep === 'poor') {
    out.push({ group: 'Sleep', icon: '🌙', title: 'Magnesium before bed', sub: 'Supports GABA & sleep onset' });
    out.push({ group: 'Sleep', icon: '📵', title: 'No screens 1 h before bed', sub: 'Blue light delays melatonin' });
    out.push({ group: 'Sleep', icon: '🌡️', title: 'Cool, dark room', sub: '18–20°C for deeper sleep' });
  }

  // Cravings
  if (log.cravings === 'sweet' || log.cravings === 'everything') {
    out.push({ group: 'Cravings', icon: '🍓', title: 'Fruit + protein swap', sub: 'Steadies blood sugar vs. refined sugar' });
    out.push({ group: 'Cravings', icon: '🍫', title: 'Dark chocolate over candy', sub: 'Magnesium hit without the crash' });
  } else if (log.cravings === 'salty') {
    out.push({ group: 'Cravings', icon: '🥜', title: 'Nuts or olives', sub: 'Salt craving with minerals, not chips' });
  }

  // Cervical mucus — fertile-window signal
  if (log.cervicalMucus === 'eggwhite' || log.cervicalMucus === 'watery') {
    out.push({ group: 'Fertility', icon: '🌱', title: "You're likely fertile", sub: 'Egg-white/watery mucus = peak fertility. Log an ovulation test' });
  }

  // Multi-select symptoms
  const sx = log.symptoms ?? [];
  if (sx.includes('headache')) out.push({ group: 'Symptoms', icon: '💧', title: 'Hydrate + magnesium', sub: 'Common menstrual-migraine triggers' });
  if (sx.includes('acne')) out.push({ group: 'Symptoms', icon: '🧴', title: 'Gentle skincare', sub: 'Hormonal breakouts ease post-period — avoid over-scrubbing' });
  if (sx.includes('backache')) out.push({ group: 'Symptoms', icon: '🔥', title: 'Heat on lower back', sub: '15–20 min — relaxes referred uterine pain' });
  if (sx.includes('tender_breasts')) out.push({ group: 'Symptoms', icon: '👕', title: 'Supportive bra + lower caffeine', sub: 'Eases luteal breast tenderness' });
  if (sx.includes('nausea')) out.push({ group: 'Symptoms', icon: '🫚', title: 'Ginger + small meals', sub: 'Settles prostaglandin-driven nausea' });
  if (sx.includes('fatigue')) out.push({ group: 'Symptoms', icon: '🫘', title: 'Iron + B12', sub: 'Pair with vitamin C; common fatigue driver' });

  return out;
}

// Flat, de-duped list of every applicable task (symptom-targeted first, then the
// phase baseline). Order is preserved so checkbox indexing stays stable.
export function getActionItems(phase: Phase, log?: DayLog): ActionItem[] {
  const phaseLabel = `${PHASE_META[phase].label} phase`;
  const baseline: ActionItem[] = BASE[phase].map((i) => ({ ...i, group: phaseLabel }));
  const merged = [...symptomOverrides(log), ...baseline];
  const seen = new Set<string>();
  const out: ActionItem[] = [];
  for (const item of merged) {
    if (seen.has(item.title)) continue;
    seen.add(item.title);
    out.push(item);
  }
  return out;
}

// Same tasks, grouped by what they target, headers in first-seen order.
export function getActionGroups(phase: Phase, log?: DayLog): ActionGroup[] {
  const groups: ActionGroup[] = [];
  const byName = new Map<string, ActionGroup>();
  for (const item of getActionItems(phase, log)) {
    let g = byName.get(item.group);
    if (!g) { g = { group: item.group, items: [] }; byName.set(item.group, g); groups.push(g); }
    g.items.push(item);
  }
  return groups;
}
