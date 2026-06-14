export interface Article {
  slug: string;
  category: 'Phase' | 'Nutrition' | 'Movement' | 'Wellbeing';
  title: string;
  subtitle: string;
  emoji: string;
  readMins: number;
  accent: string; // hex
  tint: string;   // rgba bg
  sections: { heading: string; body: string }[];
}

export const ARTICLES: Article[] = [
  {
    slug: 'menstrual-phase',
    category: 'Phase',
    title: 'The Menstrual Phase',
    subtitle: 'Days 1–5 · Rest & release',
    emoji: '🌑',
    readMins: 4,
    accent: '#dc2626',
    tint: 'rgba(252,232,232,0.85)',
    sections: [
      { heading: 'What is happening', body: 'Your period marks day 1 of the cycle. Both estrogen and progesterone are at their lowest, which is why energy often dips and you may feel more inward. The uterine lining sheds, and this is a normal, healthy reset rather than something to push through.' },
      { heading: 'How you may feel', body: 'Lower energy, mild-to-moderate cramps, a need for more sleep, and a quieter mood are all typical. Some people also notice clearer thinking by days 3–4 as hormones begin a slow climb again.' },
      { heading: 'Nourish', body: 'Iron is lost with menstrual blood, so iron-rich foods (lentils, spinach, red meat, tofu) paired with vitamin C help replenish stores. Warm, cooked foods and magnesium (dark chocolate, pumpkin seeds) can ease cramping. Stay well hydrated to reduce bloating.' },
      { heading: 'Move gently', body: 'Light movement — walking, restorative yoga, gentle stretching — supports circulation and can relieve cramps without taxing a low-energy system. There is no need for intense training; honour the rest your body is asking for.' },
      { heading: 'Self-care', body: 'Heat on the lower abdomen, early nights, and lighter commitments where possible. This is a natural low point in the month — planning gentler days here pays off in the energy you regain afterward.' },
    ],
  },
  {
    slug: 'follicular-phase',
    category: 'Phase',
    title: 'The Follicular Phase',
    subtitle: 'Days 6–13 · Rise & begin',
    emoji: '🌱',
    readMins: 4,
    accent: '#7c3aed',
    tint: 'rgba(237,233,255,0.85)',
    sections: [
      { heading: 'What is happening', body: 'After your period, estrogen rises steadily as follicles in the ovary mature. This is the cycle\'s upswing: energy, mood, and mental sharpness tend to climb day by day toward ovulation.' },
      { heading: 'How you may feel', body: 'More motivated, social, and creative. Many people find this is their best window for starting projects, problem-solving, and tackling things that felt heavy the week before.' },
      { heading: 'Nourish', body: 'Rising estrogen pairs well with fresh, vibrant foods — leafy greens, sprouted grains, fermented foods, and lean protein. Lighter, raw-leaning meals often feel good now as digestion is robust.' },
      { heading: 'Move', body: 'Your body can handle and benefit from higher intensity: strength training, cardio, dance, or trying a new class. Muscles recover well and you are building toward your peak.' },
      { heading: 'Make it count', body: 'Front-load demanding work, important conversations, and new beginnings into this phase. The hormonal tailwind is real — use it.' },
    ],
  },
  {
    slug: 'ovulation-phase',
    category: 'Phase',
    title: 'The Ovulatory Phase',
    subtitle: 'Days 14–16 · Peak & connect',
    emoji: '🌕',
    readMins: 3,
    accent: '#d97706',
    tint: 'rgba(255,243,232,0.85)',
    sections: [
      { heading: 'What is happening', body: 'A surge in luteinising hormone releases an egg. Estrogen peaks and testosterone gives a brief lift, so this is typically the high point of energy, confidence, and libido in the cycle.' },
      { heading: 'How you may feel', body: 'Most outgoing, verbally fluent, and physically strong. Skin often looks its best. Some people feel a brief one-sided twinge (mittelschmerz) as the egg releases — usually harmless.' },
      { heading: 'Nourish', body: 'Support this metabolically active window with antioxidant-rich produce, fibre to help process the estrogen peak (cruciferous vegetables like broccoli), and plenty of water. Light, colourful meals suit the high energy.' },
      { heading: 'Move & connect', body: 'A great time for peak workouts, presentations, dates, and social events. If you are tracking fertility, this is the fertile window — the few days around ovulation.' },
    ],
  },
  {
    slug: 'luteal-phase',
    category: 'Phase',
    title: 'The Luteal Phase',
    subtitle: 'Days 17–28 · Wind down & nest',
    emoji: '🌘',
    readMins: 5,
    accent: '#4f46e5',
    tint: 'rgba(233,237,255,0.85)',
    sections: [
      { heading: 'What is happening', body: 'After ovulation, progesterone rises to prepare the body for a possible pregnancy. If none occurs, both progesterone and estrogen fall in the days before your period — the hormonal shift behind PMS.' },
      { heading: 'How you may feel', body: 'The early luteal phase can feel calm and steady. The late luteal phase (the few days pre-period) is when irritability, anxiety, bloating, breast tenderness, cravings, and fatigue commonly appear. This is physiology, not a personal failing.' },
      { heading: 'Nourish', body: 'Progesterone raises your metabolic rate, so genuine hunger increases — eat enough. Complex carbohydrates (oats, sweet potato, whole grains) support serotonin and steady mood. Magnesium and B6 (bananas, leafy greens, legumes) can ease PMS, and reducing salt, caffeine, and alcohol helps with bloating and sleep.' },
      { heading: 'Move', body: 'Match movement to your falling energy: strength and steady cardio early in the phase, shifting to walking, pilates, and yoga as your period approaches. Forcing high intensity late luteal often backfires.' },
      { heading: 'Self-care', body: 'Protect sleep, lower your social and work load where you can, and treat self-criticism that spikes here with extra kindness — it usually lifts the moment your period starts. Tracking symptoms across a few cycles helps you anticipate and plan for this phase.' },
    ],
  },
  {
    slug: 'cycle-syncing-basics',
    category: 'Wellbeing',
    title: 'Cycle Syncing, Simply',
    subtitle: 'Living with your rhythm, not against it',
    emoji: '🔄',
    readMins: 3,
    accent: '#6E3482',
    tint: 'rgba(245,235,250,0.9)',
    sections: [
      { heading: 'The idea', body: 'Your hormones follow a roughly monthly rhythm, and so do your energy, mood, and recovery. Cycle syncing means loosely matching your food, movement, and workload to the phase you are in — leaning into the high-energy follicular and ovulatory weeks, and easing off during menstruation and the late luteal phase.' },
      { heading: 'Why track', body: 'Everyone\'s cycle is individual. A few months of logging reveals your personal patterns — when energy reliably dips, when cravings hit, how long your cycle truly runs — which makes predictions and recommendations genuinely yours rather than textbook averages.' },
      { heading: 'Start small', body: 'You do not need to overhaul your life. Pick one lever — maybe scheduling demanding work for your follicular phase, or planning gentler days before your period — and build from there. Bloom learns alongside you.' },
    ],
  },
];

export function getArticle(slug: string) {
  return ARTICLES.find((a) => a.slug === slug);
}
