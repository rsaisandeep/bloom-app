# Bloom App — File Map with Tags

Use this file to identify which files to read before making any change.
Tags are change-category labels. Read only files matching the relevant tag(s).

---

## Tags Legend

| Tag | When to use |
|-----|-------------|
| `#data-model` | Changing cycle/log/settings data structures |
| `#backend` | Modifying Google Sheets API or Apps Script backend |
| `#auth` | Login, registration, session storage |
| `#ui-modal` | Any modal/bottom-sheet component |
| `#ui-nav` | Navigation bar, routing, page layout |
| `#ui-page` | A specific app page |
| `#phase-logic` | Phase calculation, predictions, day classification |
| `#sync` | localStorage ↔ Sheets sync, sanitize logic |
| `#recommendations` | AI/LLM recommendations API route |
| `#articles` | Read tab / phase-based articles |
| `#styles` | Global CSS, theming, fonts |
| `#config` | Next.js, TypeScript, package, deploy config |
| `#mobile-migration` | Future: replace Sheets with a real DB for mobile |

---

## File → Tags Map

### App Pages (`app/`)

| File | Tags | Purpose |
|------|------|---------|
| `app/page.tsx` | `#ui-page #phase-logic #ui-modal` | Home tab — phase ring, cards, log trigger |
| `app/calendar/page.tsx` | `#ui-page #data-model #ui-modal` | Calendar tab — day grid, log history |
| `app/reports/page.tsx` | `#ui-page #recommendations #sync` | Reports tab — AI recommendations, caching |
| `app/insights/page.tsx` | `#ui-page #phase-logic #data-model` | Insights tab |
| `app/read/page.tsx` | `#ui-page #articles` | Read tab — phase-matched articles |
| `app/login/page.tsx` | `#auth #ui-page` | Login + register form |
| `app/onboarding/page.tsx` | `#auth #data-model #ui-page` | First-run cycle setup |
| `app/profile/page.tsx` | `#auth #data-model #ui-page` | Profile/settings/logout |
| `app/layout.tsx` | `#ui-nav #styles #auth` | Root layout, font, AuthGuard wrapper |
| `app/globals.css` | `#styles` | Global CSS variables, base styles |
| `app/api/recommendations/route.ts` | `#recommendations` | Server route — calls Claude API for phase recs |

### Components (`components/`)

| File | Tags | Purpose |
|------|------|---------|
| `components/LogSheet.tsx` | `#ui-modal #data-model #sync` | Daily symptom log bottom-sheet |
| `components/PeriodStartModal.tsx` | `#ui-modal #data-model #sync #backend` | Period start/end modal — always fetches from sheet on open |
| `components/Hamburger.tsx` | `#ui-modal #ui-nav` | Side-drawer menu (portal) |
| `components/InfoModal.tsx` | `#ui-modal` | "How Bloom works" info sheet |
| `components/TopBar.tsx` | `#ui-nav #styles` | Sticky top header |
| `components/BottomNav.tsx` | `#ui-nav` | Bottom tab bar |
| `components/NavWrapper.tsx` | `#ui-nav` | Layout wrapper around pages |
| `components/AuthGuard.tsx` | `#auth` | Redirects unauthenticated users |
| `components/ui/` | `#styles` | shadcn/ui primitives (badge, button, card, etc.) |

### Lib (`lib/`)

| File | Tags | Purpose |
|------|------|---------|
| `lib/cycle.ts` | `#data-model #phase-logic` | All cycle mutations + phase/prediction logic |
| `lib/data.ts` | `#sync #backend #data-model` | `fetchFromSheet`, `saveToSheet`, `sanitize` — **always use `sanitize(loadData())`** |
| `lib/api.ts` | `#backend #auth` | Apps Script URL, fetch wrappers |
| `lib/actions.ts` | `#data-model #sync` | High-level data actions (add/edit/delete cycle) |
| `lib/sync.ts` | `#sync #mobile-migration` | Sync orchestration logic |
| `lib/day.ts` | `#phase-logic #data-model` | Day-level helpers |
| `lib/matcher.ts` | `#phase-logic #articles` | Phase-to-article matching |
| `lib/articles.ts` | `#articles` | Article data/types |
| `lib/useAppDay.ts` | `#phase-logic #sync` | Hook: current day + phase |
| `lib/utils.ts` | `#styles` | `cn()` utility |

### Backend (`google-apps-script/`)

| File | Tags | Purpose |
|------|------|---------|
| `google-apps-script/Code.gs` | `#backend #auth #data-model #mobile-migration` | Sheets backend — register/login/loadAll/saveAll; `fmtDate()` converts Date→string |

### Data (`data/phases/`)

| File | Tags | Purpose |
|------|------|---------|
| `data/phases/menstrual.json` | `#articles #recommendations` | Menstrual phase article content |
| `data/phases/follicular.json` | `#articles #recommendations` | Follicular phase article content |
| `data/phases/ovulation.json` | `#articles #recommendations` | Ovulation phase article content |
| `data/phases/luteal.json` | `#articles #recommendations` | Luteal phase article content |

### Config

| File | Tags | Purpose |
|------|------|---------|
| `package.json` | `#config` | Dependencies, scripts |
| `tsconfig.json` | `#config` | TypeScript config |
| `next.config.*` | `#config` | Next.js config |
| `.env.local` | `#config #backend` | `NEXT_PUBLIC_BLOOM_API_URL` — Apps Script URL |
| `.vercel/project.json` | `#config` | Vercel project binding |
| `CLAUDE.md` | — | Claude instructions for this project |

---

## Quick Change → Files Lookup

| Change type | Read these files |
|-------------|-----------------|
| Add a new symptom field | `lib/cycle.ts`, `components/LogSheet.tsx`, `google-apps-script/Code.gs`, `lib/data.ts` |
| Fix phase calculation | `lib/cycle.ts`, `lib/day.ts`, `lib/useAppDay.ts` |
| Change sync/fetch behavior | `lib/data.ts`, `lib/sync.ts`, `lib/api.ts` |
| Add a new page/tab | `app/layout.tsx`, `components/BottomNav.tsx`, `components/NavWrapper.tsx` |
| Fix modal behavior | the specific `components/*.tsx` modal + `app/page.tsx` if triggered from home |
| Change auth flow | `app/login/page.tsx`, `app/onboarding/page.tsx`, `components/AuthGuard.tsx`, `lib/api.ts` |
| Update recommendations | `app/api/recommendations/route.ts`, `app/reports/page.tsx` |
| Mobile/DB migration | `google-apps-script/Code.gs`, `lib/data.ts`, `lib/api.ts`, `lib/sync.ts` — replace these 4 |

---

## Mobile Migration Note (`#mobile-migration`)

The 4 files that form the Sheets integration layer are the only ones that need replacing for a DB migration:
- `google-apps-script/Code.gs` → replace with DB API (Supabase/Firebase)
- `lib/api.ts` → point to new backend URL/SDK
- `lib/data.ts` → replace `fetchFromSheet`/`saveToSheet` with DB calls
- `lib/sync.ts` → update sync logic if offline-first

All page/component/cycle logic remains unchanged.
