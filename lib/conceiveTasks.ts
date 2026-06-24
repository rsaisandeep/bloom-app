export type ConceiveTask = { icon: string; title: string; sub: string };

// Daily support checklist for the partner of someone who is trying to conceive.
// Shown only when the tracker has the 'conceive' goal. The viewer (partner)
// ticks these off; the tracker sees them read-only. Stored in task_completions
// under the viewer's own user_id (one row per day), reusing the same number[]
// index format as the home focus checklist.
export const PARTNER_CONCEIVE_TASKS: ConceiveTask[] = [
  { icon: '💊', title: 'Take a daily multivitamin', sub: 'Zinc, folate, vitamin C & selenium support sperm health' },
  { icon: '🥗', title: 'Eat antioxidant-rich foods', sub: 'Fruit, veg, nuts & whole grains' },
  { icon: '🚭', title: 'No smoking, limit alcohol', sub: 'Both lower sperm count & quality' },
  { icon: '🧊', title: 'Keep cool', sub: 'Skip hot tubs & saunas; no laptop on the lap' },
  { icon: '🏃', title: 'Move — but not to excess', sub: '~30 min of moderate exercise' },
  { icon: '😴', title: 'Sleep 7–8 hrs & de-stress', sub: 'Poor sleep & stress affect fertility' },
  { icon: '☕', title: 'Limit caffeine', sub: 'Keep to about 2 cups a day' },
  { icon: '❤️', title: 'Be there for her fertile window', sub: 'Time intimacy & offer support' },
];
