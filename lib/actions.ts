import type { Phase, DayLog } from './cycle';
import { PHASE_META, isInputValidForPhase } from './cycle';

export interface ActionItem {
  icon: string;
  title: string;
  sub: string;
  group: string; // what this task targets (a check-in symptom, fertility, or the phase)
  weight?: number; // higher = more urgent/severe; drives sort order. Defaulted per source.
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
function symptomOverrides(phase: Phase, log?: DayLog): ActionItem[] {
  if (!log) return [];
  const out: ActionItem[] = [];

  // Cramps
  if (log.cramps === 'severe') {
    out.push({ group: 'Cramps', icon: '🔥', title: 'Heat therapy 38–40°C', sub: '15–20 min — rivals ibuprofen for cramps', weight: 100 });
    out.push({ group: 'Cramps', icon: '🐟', title: 'Omega-3 + magnesium', sub: 'Anti-inflammatory, calms uterine contractions', weight: 100 });
  } else if (log.cramps === 'moderate' || log.cramps === 'mild') {
    out.push({ group: 'Cramps', icon: '🔥', title: 'Warm compress', sub: '15 min on lower abdomen' });
  }

  // Bloating
  if (log.bloating === 'severe') {
    out.push({ group: 'Bloating', icon: '🔄', title: 'Clockwise belly massage', sub: '5 min — follows colon, releases gas', weight: 85 });
    out.push({ group: 'Bloating', icon: '🧂', title: 'Cut salt today', sub: 'Sodium pulls fluid into tissues', weight: 85 });
  }

  // Mood
  if (log.mood === 'sad' || log.mood === 'anxious') {
    out.push({ group: 'Mood', icon: '🌳', title: '20 min aerobic', sub: 'Raises BDNF & serotonin fast', weight: 90 });
    out.push({ group: 'Mood', icon: '🫁', title: '4-7-8 breathing', sub: 'Calms nervous system in ~90 sec', weight: 90 });
    out.push({ group: 'Mood', icon: '🫂', title: 'Connect with someone', sub: 'Oxytocin counters low serotonin', weight: 90 });
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

  // Cervical mucus — fertile-window signal (only meaningful in the fertile phases)
  if (isInputValidForPhase(phase, 'cervicalMucus') &&
      (log.cervicalMucus === 'eggwhite' || log.cervicalMucus === 'watery')) {
    out.push({ group: 'Fertility', icon: '🌱', title: "You're likely fertile", sub: 'Egg-white/watery mucus = peak fertility. Log an ovulation test', weight: 95 });
  }

  // Multi-select symptoms — each tagged with the specific symptom it targets
  const sx = log.symptoms ?? [];

  if (sx.includes('headache')) {
    out.push({ group: 'Headache', icon: '💧', title: 'Hydrate now', sub: 'Dehydration is the fastest headache trigger — 500 ml water' });
    out.push({ group: 'Headache', icon: '🌰', title: 'Magnesium-rich snack', sub: 'Pumpkin seeds, dark chocolate — low Mg spikes menstrual migraines' });
    out.push({ group: 'Headache', icon: '🧊', title: 'Cold compress on forehead', sub: '10–15 min — constricts vessels, blunts migraine onset' });
  }

  if (sx.includes('acne')) {
    out.push({ group: 'Acne', icon: '🧴', title: 'Gentle cleanser only', sub: 'Hormonal breakouts — over-scrubbing worsens inflammation' });
    out.push({ group: 'Acne', icon: '🚫', title: 'Avoid touching your face', sub: 'High-androgen phase triggers sebum; hands transfer bacteria' });
    out.push({ group: 'Acne', icon: '🥬', title: 'Cut dairy & high-GI foods', sub: 'Both raise IGF-1, which amplifies hormonal acne' });
  }

  if (sx.includes('backache')) {
    out.push({ group: 'Backache', icon: '🔥', title: 'Heat pad on lower back', sub: '15–20 min — relaxes referred uterine pain' });
    out.push({ group: 'Backache', icon: '🧘', title: 'Child pose + cat-cow', sub: '5 min of these two stretches relieves lumbar tension quickly' });
    out.push({ group: 'Backache', icon: '🐟', title: 'Omega-3 today', sub: 'Anti-inflammatory — reduces prostaglandin-driven back pain' });
  }

  if (sx.includes('tender_breasts')) {
    out.push({ group: 'Tender breasts', icon: '👕', title: 'Supportive bra', sub: 'Reduce movement — luteal breast tenderness peaks before period' });
    out.push({ group: 'Tender breasts', icon: '☕', title: 'Lower caffeine', sub: 'Methylxanthines in caffeine worsen breast cyst tenderness' });
    out.push({ group: 'Tender breasts', icon: '🌰', title: 'Vitamin E + magnesium', sub: 'Both shown to reduce cyclic mastalgia in trials' });
  }

  if (sx.includes('nausea')) {
    out.push({ group: 'Nausea', icon: '🫚', title: 'Ginger + small meals', sub: 'Settles prostaglandin-driven nausea; 1 g ginger beats placebo' });
    out.push({ group: 'Nausea', icon: '🍋', title: 'Cold water + lemon', sub: 'Sipping cold citrus water calms nausea faster than dry eating' });
    out.push({ group: 'Nausea', icon: '🍞', title: 'Bland carb snack', sub: 'Plain crackers or toast stabilise blood sugar that worsens nausea' });
  }

  if (sx.includes('fatigue')) {
    out.push({ group: 'Fatigue', icon: '🫘', title: 'Iron + B12', sub: 'Pair with vitamin C; most common menstrual fatigue driver' });
    out.push({ group: 'Fatigue', icon: '🛌', title: '10-min rest, not full stop', sub: 'Light movement beats total rest for restoring energy' });
    out.push({ group: 'Fatigue', icon: '🍠', title: 'Complex carbs now', sub: 'Sweet potato or oats sustain energy without the crash' });
  }

  if (sx.includes('dizziness')) {
    out.push({ group: 'Dizziness', icon: '🫘', title: 'Increase iron-rich foods', sub: 'Low iron is a common dizziness driver — lentils + vitamin C' });
    out.push({ group: 'Dizziness', icon: '💧', title: 'Hydrate and sit slowly', sub: 'Orthostatic dizziness is common — rise gradually to steady blood pressure' });
    out.push({ group: 'Dizziness', icon: '🧂', title: 'Light salty snack', sub: 'A pinch of sodium helps blood pressure stabilise quickly' });
  }

  if (sx.includes('hot_flashes')) {
    out.push({ group: 'Hot flashes', icon: '👕', title: 'Wear breathable layers', sub: 'Easy to remove — helps you shed heat fast' });
    out.push({ group: 'Hot flashes', icon: '❄️', title: 'Cool water on wrists', sub: 'Pulse-point cooling drops core temp in ~30 sec' });
    // Fertility framing only holds around ovulation.
    if (phase === 'ovulation') {
      out.push({ group: 'Hot flashes', icon: '🌡️', title: 'This may be ovulation', sub: 'Temp spikes 0.2–0.5°C at ovulation — log it as a fertility signal' });
    }
  }

  if (sx.includes('chills')) {
    // The basal-temperature framing is only accurate in the luteal phase.
    if (phase === 'luteal') {
      out.push({ group: 'Chills', icon: '🌡️', title: 'Post-ovulation temp drop is normal', sub: 'BBT falls slightly before period; chills can accompany it' });
      out.push({ group: 'Chills', icon: '🧣', title: 'Layer up + warm drink', sub: 'Your basal temp dips in late luteal — body is not fighting an illness' });
    }
    out.push({ group: 'Chills', icon: '🛁', title: 'Warm bath or shower', sub: 'Raises skin temp, reduces the perceived cold sensation' });
  }

  if (sx.includes('diarrhea')) {
    out.push({ group: 'Diarrhea', icon: '⚡', title: 'Electrolyte drink', sub: 'Cycle-related prostaglandins can speed gut motility — replace lost salts' });
    out.push({ group: 'Diarrhea', icon: '🍌', title: 'BRAT foods today', sub: 'Banana, rice, applesauce, toast — gentle on a reactive gut' });
    out.push({ group: 'Diarrhea', icon: '🌡️', title: 'May be hormonal, not a bug', sub: 'Prostaglandins can act on the bowel — usually resolves in 1–2 days' });
  }

  if (sx.includes('constipation')) {
    out.push({ group: 'Constipation', icon: '🥦', title: 'Increase fibre today', sub: 'Progesterone slows motility in luteal phase; veggies + beans help' });
    out.push({ group: 'Constipation', icon: '💧', title: 'Drink 2.5 L water', sub: 'Fibre needs water to work — dehydration worsens constipation' });
    out.push({ group: 'Constipation', icon: '🚶', title: 'Walk 20 min', sub: 'Physical movement is one of the fastest ways to stimulate the bowel' });
  }

  if (sx.includes('joint_pain')) {
    out.push({ group: 'Joint pain', icon: '🍛', title: 'Anti-inflammatory foods', sub: 'Turmeric (curcumin) + omega-3 reduce cytokine-driven joint pain' });
    out.push({ group: 'Joint pain', icon: '🔥', title: 'Warm compress on joints', sub: 'Increases circulation and reduces stiffness within minutes' });
    out.push({ group: 'Joint pain', icon: '🧘', title: 'Gentle range-of-motion', sub: 'Slow joint circles maintain mobility without stressing inflamed tissue' });
  }

  if (sx.includes('pelvic_pain')) {
    out.push({ group: 'Pelvic pain', icon: '🔥', title: 'Heat pad on lower abdomen', sub: '15–20 min — relaxes smooth muscle, rivals ibuprofen for mild pain' });
    out.push({ group: 'Pelvic pain', icon: '🧘', title: 'Knees-to-chest pose', sub: 'Releases pelvic floor tension; hold 60 sec each side' });
    out.push({ group: 'Pelvic pain', icon: '📋', title: 'Log pain timing & cycle day', sub: 'Mid-cycle pelvic pain = mittelschmerz; recurring = worth flagging to a doctor' });
  }

  if (sx.includes('leg_cramps')) {
    out.push({ group: 'Leg cramps', icon: '🍌', title: 'Potassium + magnesium', sub: 'Bananas and pumpkin seeds replenish cramp-easing electrolytes' });
    out.push({ group: 'Leg cramps', icon: '💧', title: 'Hydrate well today', sub: 'Dehydration worsens muscle cramping — keep fluids up' });
    out.push({ group: 'Leg cramps', icon: '🦵', title: 'Calf stretch against a wall', sub: '30-sec hold, 3 reps — immediate relief for cramp tightness' });
  }

  if (sx.includes('low_libido')) {
    out.push({ group: 'Low libido', icon: '🌡️', title: 'This is phase-normal', sub: 'Libido drops in late luteal & menstrual phase as progesterone peaks' });
    out.push({ group: 'Low libido', icon: '🧘', title: 'Prioritise rest today', sub: 'Fatigue and stress are the top suppressors of libido — recovery helps' });
    out.push({ group: 'Low libido', icon: '🌱', title: 'Expect a rebound at follicular', sub: 'Rising estrogen post-period typically restores desire within days' });
  }

  return out;
}

// Goal-targeted tasks. Goals come from onboarding (multi-select); tasks are added
// only when relevant to the current phase so they feel timely, not generic.
function goalOverrides(phase: Phase, goals: string[]): ActionItem[] {
  const out: ActionItem[] = [];

  if (goals.includes('conceive')) {
    if (phase === 'follicular') {
      out.push({ group: 'Conceiving', icon: '🌡️', title: 'Log your BBT each morning', sub: 'Before getting up — the temp shift confirms ovulation' });
      out.push({ group: 'Conceiving', icon: '💧', title: 'Watch cervical mucus', sub: 'Egg-white/watery = your fertile window is opening' });
    } else if (phase === 'ovulation') {
      out.push({ group: 'Conceiving', icon: '❤️', title: 'Your fertile window is now', sub: 'Best 2–3 days to try — time intercourse around ovulation' });
      out.push({ group: 'Conceiving', icon: '🧪', title: 'Use an ovulation test', sub: 'A positive LH test means ovulation in ~24–36 h' });
    }
  }

  if (goals.includes('symptoms') && (phase === 'luteal' || phase === 'menstrual')) {
    out.push({ group: 'Symptom prep', icon: '🧂', title: 'Pre-empt PMS this week', sub: 'Lower salt, caffeine & sugar to soften the luteal dip' });
    out.push({ group: 'Symptom prep', icon: '📝', title: 'Log symptoms daily now', sub: 'Most patterns show up late-luteal — tracking sharpens them' });
  }

  return out;
}

// Flat, de-duped list of every applicable task. Each task carries a `weight`
// (severity/urgency); the list is sorted weight-descending so the most pressing
// task surfaces first. Severe symptom tasks outrank goal tasks, which outrank
// the phase baseline. Source defaults: symptom 70, goal 60, baseline 20 — the
// severe symptom branches set their own higher weight.
export function getActionItems(phase: Phase, log?: DayLog, goals: string[] = []): ActionItem[] {
  const phaseLabel = `${PHASE_META[phase].label} phase`;
  const baseline: ActionItem[] = BASE[phase].map((i) => ({ ...i, group: phaseLabel, weight: 20 }));
  const goalItems = goalOverrides(phase, goals).map((i) => ({ ...i, weight: i.weight ?? 60 }));
  const symptomItems = symptomOverrides(phase, log).map((i) => ({ ...i, weight: i.weight ?? 70 }));
  const merged = [...goalItems, ...symptomItems, ...baseline];
  const seen = new Set<string>();
  const out: ActionItem[] = [];
  for (const item of merged) {
    if (seen.has(item.title)) continue;
    seen.add(item.title);
    out.push(item);
  }
  // Stable sort by weight (descending) — same-weight items keep first-seen order,
  // so dedup precedence (goal > symptom > baseline) is preserved within a tier.
  return out.sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
}

// Same tasks, grouped by what they target, headers in first-seen order.
export function getActionGroups(phase: Phase, log?: DayLog, goals: string[] = []): ActionGroup[] {
  const groups: ActionGroup[] = [];
  const byName = new Map<string, ActionGroup>();
  for (const item of getActionItems(phase, log, goals)) {
    let g = byName.get(item.group);
    if (!g) { g = { group: item.group, items: [] }; byName.set(item.group, g); groups.push(g); }
    g.items.push(item);
  }
  return groups;
}
