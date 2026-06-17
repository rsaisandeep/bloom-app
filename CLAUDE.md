@AGENTS.md

# Bloom — Navigation Map

Period-tracker PWA. Next.js 16 (App Router) + Supabase. ~5k lines. This map exists so you can jump to the right file without searching the whole tree — keep it current when files move.

## Backend / data
- `lib/supabase.ts` — Supabase client (env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- `lib/api.ts` — auth (signUp/login/logout), `profiles` table writes.
- `lib/data.ts` — remote persistence. **Note:** `fetchFromSheet`/`saveToSheet` are legacy names — implementation is Supabase, not Google Sheets.
- `lib/sync.ts` — fire-and-forget push to Supabase after mutations.
- `lib/cycle.ts` — **core domain model** (`BloomData` type, localStorage load/save, cycle math/predictions). Largest + most important file (420 lines).

## Domain logic
- `lib/insights.ts` — derived stats. `lib/matcher.ts` — article matching. `lib/articles.ts` — article content.
- `lib/day.ts` / `lib/useAppDay.ts` — "current day" abstraction. `lib/export.ts` — doctor-summary export.

## UI
- Routes: `app/*/page.tsx` (home, calendar, insights, onboarding, login, profile, read, reports).
- API routes: `app/api/delete-account/`, `app/api/recommendations/`.
- Components in `components/`; shadcn primitives in `components/ui/`.
- PWA: `app/manifest.ts`, `public/sw.js`, `lib/useInstall.ts`.

## Workflow
- Auto-deploys via Vercel on push to main — always `git push` after committing changes.
- `npm run dev` / `build` / `lint`.
