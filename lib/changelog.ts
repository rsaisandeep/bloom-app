export type ChangelogEntry = { version: string; date: string; title: string; items: string[] };

// Newest first. Shown in the "What's new" sheet from the menu.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.2.0',
    date: 'June 2026',
    title: 'Partner mode & a fresh new feel',
    items: [
      'Partner mode — add a partner by username so they can view your cycle (read-only, consent-based).',
      'Trying to conceive? Your partner gets their own daily support checklist; you see what they tick off.',
      'Whole-app theming that shifts colour with your current cycle phase.',
      'Springy, Apple-style animations on menus, sheets and cards.',
      'Pick your account type (tracker or partner) at signup, with a gender field.',
    ],
  },
  {
    version: '0.1.0',
    date: 'Launch',
    title: 'Everything Bloom does',
    items: [
      'Cycle tracking — log period start & end, with smart late/early prompts.',
      'Phases & predictions — menstrual, follicular, ovulation & luteal, plus next-period and fertile-window forecasts.',
      'Daily check-ins — flow, cramps, mood, energy, sleep, cravings, BBT, cervical mucus, ovulation & pregnancy tests, and more.',
      'Today’s focus — personalised food, movement & self-care tasks tuned to your phase and goals.',
      'Reports & insights — your patterns, common symptoms, cycle/period trends and phase recommendations.',
      'Calendar view of your whole cycle history.',
      'Article library — guides on phases, conditions, fertility and wellbeing.',
      'PCOS mode — prediction ranges instead of fixed dates.',
      'Goals — track, manage symptoms, conceive or general wellness.',
      'Install as an app (PWA) and use it offline.',
    ],
  },
];
