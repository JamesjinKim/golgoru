# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

골고루 SOS — 긴급 법률·노무·세무·의료·손해사정·변리·감정평가 상황을 음성/텍스트로 입력하면 적합한 전문가를 추천하는 양면시장 플랫폼. Next.js 16 App Router + React 19 + Supabase + Gemini + Tailwind v4, TypeScript strict.

## Commands

```bash
npm run dev      # next dev --webpack (Turbopack root set in next.config.js, but dev forces webpack)
npm run build    # next build
npm run start    # production server
npx tsc --noEmit # type-check (the only "test" gate — see Testing below)
```

There is **no lint script and no test runner**. `tests/experts-repository.contract.ts` is a compile-time contract, not an executed test: it exercises the `ExpertRepository` interface so `tsc` fails if an implementation drifts from the shape. Verify code by type-checking.

## Environment

Create `.env.local` by hand (no `.env.example` is committed; the vars below are the full set). Both Supabase keys and `GEMINI_API_KEY` fall back to placeholders so the app boots without them — features silently degrade rather than crash.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — client/anon Supabase access
- `SUPABASE_SECRET_KEY` — service-role key, server-only (admin CRUD)
- `GEMINI_API_KEY` — absent → text classify uses local fallback, audio classify returns 503
- `GOLGORU_DATA_SOURCE` — `supabase` selects the live repo; anything else (default) selects mock data

## Architecture

**Route groups.** `app/(site)/` is the consumer flow (SOS input → result → expert detail/browse). `app/(admin)/` is the operator dashboard. `app/api/` splits the same way: public routes vs `app/api/admin/*`.

**Auth boundary lives in `proxy.ts`, not middleware.** This Next.js version renames the middleware entrypoint to `proxy` (exported `proxy()` + `config.matcher`). It guards `/admin/:path*` and `/api/admin/:path*`: unauthenticated → redirect to `/admin/login` (or 401 JSON for API), authenticated-on-login-page → `/admin`. Consumer routes are outside the matcher and unaffected. Route handlers additionally call `requireAdmin()` (`lib/admin/auth.ts`), which checks the `admin_users` table for role `super_admin` | `operator`.

**Data-source abstraction.** Never import a concrete repository. Call `getExpertRepository()` (`lib/experts/repository.ts`); it returns the mock or Supabase implementation based on `getExpertDataSource()`. Both implement the same `ExpertRepository` interface (`listRecommended` / `listBrowse` / `findById` / `findCategoriesByExpertId`). Browse pagination is **opaque cursor**: Supabase uses keyset `(status, name, id)`, mock uses a base64 offset — both look identical to the client, so don't decode cursors outside the repo.

**Two Supabase clients** (`lib/supabase.ts`): `supabase` (anon, safe for client) and `supabaseAdmin` (service role — server only, used by admin routes and the Supabase repository).

**Classification** (`lib/gemini.ts`) is the matching engine. Text path: Gemini `flash-lite` with thinking off → on missing key or 429/503/500, falls back to `localClassify` (keyword `RULES` table). Audio path (`classifyAudio`): one Gemini `flash` call transcribes + classifies; it **cannot** fall back (no source text), so missing key → `GeminiConfigError` (503) and empty transcript → 422. `app/api/classify/route.ts` branches on content-type (`multipart/form-data` = audio, JSON = text) and maps these error statuses to user-facing Korean messages.

**Taxonomy.** 7 `Vertical`s and normalized category codes (`LAW-01`, `MED-03`, `PAT-06`, …) drive routing. The code list in `lib/gemini.ts` (`CATEGORY_GUIDE`) must stay in sync with `docs/02-design/features/experts-taxonomy.design.md` and the `categories` table. Display labels and call-button text are centralized in `lib/constants.ts` (`VERTICAL_LABEL`, `expertTitle`, `categoryChipLabel`); the `tax` vertical is shown as 세무사.

## Database

All SQL lives in `sql/` (one folder, `supabase-*.sql`). It is applied by hand in the SQL Editor, in order (each is idempotent / re-run-safe):
`sql/supabase-setup.sql` (experts) → `sql/supabase-admin-setup.sql` (admin_users) → `sql/supabase-schema-v2.sql` (status/hours, requests, likes) → category + seed files (`sql/supabase-categories*.sql`, `sql/supabase-*-categories.sql`, `sql/supabase-seed-*.sql`). Each file's header comments state its prerequisites.

## Docs

`docs/` follows a PDCA layout (`01-plan`, `02-design`, `03-analysis`, `04-report`, `decisions`, `issues`, `sprint`). Feature design specs live in `docs/02-design/features/*.design.md` and are referenced from code comments by section (e.g. "설계 §4.2") — when changing a feature, update the matching design doc.

## 모든 답변은 한글로 할것!
