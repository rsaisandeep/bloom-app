@AGENTS.md

# Bloom — Navigation Map

Period-tracker PWA. Next.js 16 (App Router) + Supabase + web-push. This is the single source of truth for "which file do I change?" — jump here first instead of searching the tree. Keep it current when files move. (`FILE_MAP.md` was merged into this file.)

## Which file do I change?

| I want to change… | Touch |
|---|---|
| Cycle math / phase / predictions / `BloomData` type | `lib/cycle.ts` (core model, largest file) |
| Day-level "what day is it" logic | `lib/day.ts`, `lib/useAppDay.ts` |
| Derived stats / insights numbers | `lib/insights.ts`; outlier detection `lib/anomalies.ts` |
| Article content / phase→article matching | `lib/articles.ts`, `lib/symptomArticles.ts`, `lib/matcher.ts` |
| Doctor-summary export | `lib/export.ts`, `components/DoctorSummary.tsx` |
| In-app nudges / tips copy | `lib/nudges.ts` |
| A page's layout/content | `app/<route>/page.tsx` (see Routes below) |
| A modal / bottom-sheet | matching `components/*Sheet.tsx` / `*Modal.tsx` |
| Nav / header / tab bar | `components/BottomNav.tsx`, `TopBar.tsx`, `Hamburger.tsx`, `NavWrapper.tsx` |
| Theming / global CSS / fonts | `app/globals.css`, `app/layout.tsx` |

## Backend / data
- `lib/supabase.ts` — Supabase client (env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- `lib/api.ts` — auth (signUp/login/logout), `profiles` table writes.
- `lib/data.ts` — remote persistence. **Note:** `fetchFromSheet`/`saveToSheet` are legacy names — implementation is Supabase, not Google Sheets.
- `lib/sync.ts` — fire-and-forget push to Supabase after mutations.
- `lib/actions.ts` — high-level add/edit/delete cycle actions.
- `lib/importData.ts` + `components/ImportSheet.tsx` — bulk data import.
- `lib/cycle.ts` — **core domain model** (`BloomData` type, localStorage load/save, cycle math/predictions). Largest + most important file.
- `lib/sampleData.ts` — seed/sample data.

## Push notifications + cron
- `lib/webpush.ts` — server-side web-push send. `lib/usePushNotifications.ts` — client subscribe hook. `components/NotificationBell.tsx` — UI toggle.
- API: `app/api/push/{subscribe,unsubscribe,preferences,send}/route.ts`.
- `app/api/cron/daily-reminders/route.ts` — Vercel cron; sends daily reminders.
- Env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_MAILTO`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `CRON_SECRET`.

## UI
- Routes (`app/<route>/page.tsx`): `/` (home — phase ring + log trigger), `calendar`, `insights`, `reports` (recommendations), `read` (phase articles), `onboarding`, `login`, `choose-username`, `profile`.
- API routes: `app/api/{delete-account,login-by-username,recommendations}/route.ts` + push/cron above.
- Components in `components/`; shadcn primitives in `components/ui/` (badge, progress, tabs).
- Recommendations are **local keyword matching** (`lib/matcher.ts` + `data/phases/*.json`), not an LLM call. No `ANTHROPIC_API_KEY` is wired in.
- PWA: `app/manifest.ts`, `public/sw.js`, `lib/useInstall.ts` + `components/InstallPrompt.tsx`.

## Workflow
- Auto-deploys via Vercel on push to main — always `git push` after committing changes.
- `npm run dev` / `build` / `lint`.
