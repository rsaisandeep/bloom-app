export interface Article {
  slug: string;
  category: 'Phase' | 'Nutrition' | 'Movement' | 'Wellbeing' | 'Health';
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
    slug: 'understanding-pcos',
    category: 'Health',
    title: 'Understanding PCOS',
    subtitle: 'The most common hormonal disorder in women',
    emoji: '🩺',
    readMins: 6,
    accent: '#0d9488',
    tint: 'rgba(224,247,244,0.85)',
    sections: [
      { heading: 'What PCOS is', body: 'Polycystic ovary syndrome (PCOS, often called PCOD) is a hormonal and metabolic condition, not just an ovary problem. The ovaries make slightly more androgens (male-type hormones) than usual, which can interrupt the monthly release of an egg. The "cysts" in the name are actually small, undeveloped follicles — not harmful cysts — so the label is a bit misleading.' },
      { heading: 'How common is it', body: 'PCOS is the most common endocrine disorder in women of reproductive age. Global estimates range from about 6% to 20% depending on the diagnostic criteria used, with around 12% of adult women affected under the widely used Rotterdam criteria. In India, pooled studies put prevalence near 11%, with individual studies ranging from roughly 9% to 22%. In short: if it affects you, you are far from alone.' },
      { heading: 'The three signs doctors look for', body: 'Diagnosis usually follows the Rotterdam criteria — you need any 2 of these 3: (1) irregular or absent ovulation (irregular, very long, or missing periods); (2) signs of high androgens, either on a blood test or physically (acne, excess hair growth, scalp hair thinning); (3) polycystic-looking ovaries on an ultrasound. Because only 2 of 3 are needed, PCOS looks different from person to person.' },
      { heading: 'Insulin resistance: the hidden engine', body: 'Up to ~70% of women with PCOS have insulin resistance, where the body needs more insulin to manage blood sugar. High insulin pushes the ovaries to make more androgens, which worsens irregular cycles — a self-reinforcing loop. This is why PCOS is increasingly understood as a metabolic condition, and why blood-sugar-friendly habits help so much.' },
      { heading: 'Symptoms beyond periods', body: 'PCOS can show up as irregular or missing periods, acne, oily skin, excess hair on the face or body (hirsutism), thinning hair on the scalp, weight gain that is hard to shift, fatigue, and difficulty conceiving. Many people also experience mood changes. Symptoms can be mild or significant, and they can shift over time.' },
      { heading: 'Why it matters long-term', body: 'Left unmanaged, PCOS raises the risk of type 2 diabetes, high cholesterol, cardiovascular disease, and — because of infrequent periods — endometrial (uterine lining) changes. This is not meant to alarm you: it is exactly why early awareness and steady habits are so powerful. Most of these risks are strongly influenced by the same insulin-friendly lifestyle that eases day-to-day symptoms.' },
      { heading: 'The hopeful part', body: 'PCOS is highly manageable. The genetic tendency does not disappear, but symptoms, hormone levels, and cycle regularity can improve dramatically — and for many people, normalise — with the right routine. Tracking your cycle and symptoms is the first step to understanding your own pattern. The next article covers exactly how food and tracking can turn things around.' },
      { heading: 'A note', body: 'This is educational information, not a diagnosis. If you have irregular periods, unexplained weight changes, excess hair growth, or trouble conceiving, see a doctor or gynaecologist — PCOS is straightforward to evaluate with a conversation, a blood test, and sometimes an ultrasound.' },
    ],
  },
  {
    slug: 'reversing-pcos',
    category: 'Health',
    title: 'Working With PCOS: Food & Tracking',
    subtitle: 'Evidence-based ways to restore your rhythm',
    emoji: '🔄',
    readMins: 6,
    accent: '#16a34a',
    tint: 'rgba(232,248,238,0.85)',
    sections: [
      { heading: 'Can PCOS really be reversed?', body: 'Honestly: the underlying predisposition stays, so "cure" is the wrong word — but remission is very real. International guidelines name lifestyle change as the first-line treatment, ahead of medication. Many women restore regular ovulation and clear their symptoms through consistent food and movement habits. The goal is not perfection; it is a steady pattern your body can rely on.' },
      { heading: 'Why tracking is your superpower', body: 'You cannot manage what you cannot see. Logging your periods, symptoms, energy, and cravings reveals your personal pattern — how long your cycle really runs, when symptoms flare, whether changes are helping. Over a few months this turns vague frustration into clear feedback, and it gives your doctor real data instead of guesswork. For PCOS, where cycles are irregular by definition, tracking is especially valuable.' },
      { heading: 'The real lever: blood sugar', body: 'Because insulin resistance drives most PCOS, steadying blood sugar is the highest-impact change. Studies show women who improve insulin sensitivity often see symptoms ease even without much weight change — the active ingredient is insulin sensitivity, not the number on the scale. Most food advice for PCOS comes back to this one idea: avoid sharp blood-sugar spikes.' },
      { heading: 'How to eat for steadier insulin', body: 'Favour low-glycaemic, high-fibre foods (whole grains, legumes, vegetables, whole fruit over juice). Pair carbs with protein and healthy fats to blunt the sugar spike — e.g. fruit with nuts, rice with dal and vegetables. Mediterranean and anti-inflammatory patterns, plus omega-3s (fish, flax, walnuts), have the strongest evidence. Cut back on sugary drinks, refined flour, and ultra-processed snacks, which spike insulin hardest.' },
      { heading: 'A simple plate', body: 'An easy template: half the plate non-starchy vegetables, a quarter lean protein (eggs, fish, chicken, tofu, paneer, legumes), a quarter slow carbs (millets, oats, brown rice, whole-grain roti), plus a little healthy fat. Eating protein or veg before carbs in a meal further flattens the post-meal sugar rise. You do not need to be perfect — most meals trending this way is what counts.' },
      { heading: 'Movement that targets insulin', body: 'Both aerobic exercise (brisk walking, cycling, dancing) and resistance training (weights, bodyweight) improve insulin sensitivity and reproductive outcomes. Muscle is a glucose sponge, so building a little strength helps your body handle carbs. Even a 10–15 minute walk after meals measurably lowers blood-sugar spikes. Consistency beats intensity.' },
      { heading: 'The 5% rule', body: 'If weight loss is relevant for you, the evidence is encouraging: losing just 5% of body weight can boost ovulation frequency and improve hormone levels, and weight loss restores regular periods in up to ~40% of women with PCOS. Modest, sustainable change — not extreme dieting — delivers most of the benefit. And remember, the mechanism is improved insulin sensitivity, which you gain from the habits themselves.' },
      { heading: 'Consistency over perfection', body: 'PCOS responds to rhythm, not heroics. Pick one or two changes — a post-meal walk, protein at breakfast, swapping sugary drinks — and let them become automatic before adding more. Track as you go so you can see what works for your body. Combined with your doctor\'s guidance, these steady habits are how many people quietly turn PCOS around.' },
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
