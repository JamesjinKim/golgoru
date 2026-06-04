# Supabase Data Source Development Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the approved mock-data demo stable while developing the real Supabase-backed service path in the same git repository.

**Architecture:** Use one Next.js codebase with a data-source switch. The demo deployment uses mock data, while staging and later production use Supabase through the same repository interfaces. Vercel projects are separated so team-facing demo stability and real-data development do not block each other.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Postgres/RLS, Vercel deployments, Gemini classification API.

---

## 1. Operating Decision

| Decision | Direction |
|---|---|
| Git repository | Keep one repository: `golgoru-sos` |
| Vercel projects | Split deployments: demo and staging |
| Demo data | Keep mock data for the Golgoru team demo |
| Development data | Use Supabase for real service verification |
| Switch mechanism | `GOLGORU_DATA_SOURCE=mock` or `GOLGORU_DATA_SOURCE=supabase` |
| First engineering target | Remove the public-service/admin data split |

The fixed design version remains the visual baseline. Data changes must not alter the approved hero, result, or expert profile layout unless a task explicitly says so.

## 2. Related Documents

| Purpose | File |
|---|---|
| Data-flow and ERD diagnosis | `docs/03-analysis/data-flow-erd-integrity.analysis.md` |
| Product strategy and MVP scope | `docs/01-plan/features/golgoru-sos.plan.md` |
| Admin dashboard plan | `docs/01-plan/features/admin-dashboard.plan.md` |
| Supabase base schema | `supabase-setup.sql` |
| Supabase admin schema | `supabase-admin-setup.sql` |

## 3. Development Navigation Map

| Stage | Output | Status Gate |
|---|---|---|
| 0. Baseline lock | Current approved design remains available | `npm run build` passes before data work |
| 1. Data-source boundary | Public code calls repository functions, not raw `MOCK_EXPERTS` | Mock mode output stays unchanged |
| 2. Supabase read path | Public recommendation/detail can read Supabase experts | Admin-created expert appears in staging |
| 3. DB integrity hardening | `experts` constraints and validation align | Invalid expert data is rejected consistently |
| 4. Service event model | Intake, match, and contact concepts exist | User flow can be measured |
| 5. Vercel split | Demo and staging projects use different env values | Demo remains mock, staging uses Supabase |
| 6. Release discipline | Small commits per stage | Each commit has a verified build |

## 4. File Responsibility Map

### Existing Files to Modify

| File | Responsibility |
|---|---|
| `app/api/experts/route.ts` | Public expert recommendation endpoint |
| `app/(site)/expert/[id]/page.tsx` | Public expert profile detail |
| `app/(site)/result/page.tsx` | Recommendation result UI and future match-event hook point |
| `components/CallButton.tsx` | Future contact-event hook point |
| `lib/mock-data.ts` | Demo expert source |
| `lib/supabase.ts` | Supabase clients |
| `lib/types.ts` | Shared domain types |
| `supabase-setup.sql` | Public service database schema |
| `supabase-admin-setup.sql` | Admin/RLS/audit schema |

### New Files to Create

| File | Responsibility |
|---|---|
| `lib/experts/data-source.ts` | Parse and expose the selected data source |
| `lib/experts/repository.ts` | Public repository interface and selector |
| `lib/experts/mock-repository.ts` | Mock implementation for demo |
| `lib/experts/supabase-repository.ts` | Supabase implementation for staging/production |
| `lib/experts/validation.ts` | Shared expert row normalization and runtime validation |
| `lib/events/repository.ts` | Service-event write interface |
| `lib/events/supabase-repository.ts` | Supabase event writes |
| `lib/events/noop-repository.ts` | No-op event implementation for demo |

## 5. Global Prerequisites

- [x] Before editing Next.js runtime files, read the relevant local Next.js 16 guide in `node_modules/next/dist/docs/`.

Run:

```bash
rg --files node_modules/next/dist/docs
```

Expected: local Next.js documentation files are listed.

- [x] Confirm the current branch and dirty files before editing.

Run:

```bash
git status --short
```

Expected: existing unrelated files are visible and are not reverted.

- [x] Confirm the current approved design still builds.

Run:

```bash
npm run build
```

Expected: `next build` completes successfully.

## 6. Stage 0: Baseline Lock

**Purpose:** Protect the approved mock-data design while real data work begins.

- [ ] Record the approved baseline commit hash.

Run:

```bash
git rev-parse HEAD
```

Expected: returns the commit that includes the accepted hero image design.

- [ ] Keep the existing mock data file as the demo seed.

File: `lib/mock-data.ts`

Expected: no visual or field-name changes are made during Stage 0.

- [ ] Add this checklist to version control in the next documentation commit.

Run:

```bash
git add docs/superpowers/plans/2026-06-05-supabase-data-source-development-checklist.md
git commit -m "docs: add Supabase data source development checklist"
```

Expected: only this checklist and any intentionally selected analysis docs are committed.

## 7. Stage 1: Data-Source Boundary

**Purpose:** Make public service code depend on a repository interface instead of raw mock data.

### Task 1.1: Add data-source selector

**Files:**
- Create: `lib/experts/data-source.ts`

- [x] Create the data-source parser.

```ts
export type ExpertDataSource = 'mock' | 'supabase';

export function getExpertDataSource(): ExpertDataSource {
  const value = process.env.GOLGORU_DATA_SOURCE;

  if (value === 'supabase') {
    return 'supabase';
  }

  return 'mock';
}
```

- [x] Verify the selector defaults to mock when the env var is absent.

Run:

```bash
npm run build
```

Expected: build succeeds without requiring Supabase env values for demo mode.

### Task 1.2: Add repository contract

**Files:**
- Create: `lib/experts/repository.ts`
- Create: `lib/experts/mock-repository.ts`
- Create: `lib/experts/supabase-repository.ts`

- [x] Create the repository interface.

```ts
import { Expert, Urgency, Vertical } from '@/lib/types';
import { getExpertDataSource } from './data-source';
import { mockExpertRepository } from './mock-repository';
import { supabaseExpertRepository } from './supabase-repository';

export interface ExpertRepository {
  listRecommended(input: { vertical: Vertical; urgency?: Urgency | string | null }): Promise<Expert[]>;
  findById(id: string): Promise<Expert | null>;
}

export function getExpertRepository(): ExpertRepository {
  return getExpertDataSource() === 'supabase'
    ? supabaseExpertRepository
    : mockExpertRepository;
}
```

- [x] Move the existing mock filter/shuffle logic into `mock-repository.ts`.

```ts
import { MOCK_EXPERTS } from '@/lib/mock-data';
import { Expert, Urgency, Vertical } from '@/lib/types';
import { ExpertRepository } from './repository';

function shuffleExperts(experts: Expert[]): Expert[] {
  const shuffled = [...experts];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const mockExpertRepository: ExpertRepository = {
  async listRecommended({ vertical, urgency }: { vertical: Vertical; urgency?: Urgency | string | null }) {
    let experts = MOCK_EXPERTS.filter((expert) => expert.vertical === vertical && expert.is_active);

    if (urgency === '즉시') {
      const available = experts.filter((expert) => expert.is_available);
      if (available.length > 0) {
        experts = available;
      }
    }

    return shuffleExperts(experts).slice(0, 3);
  },

  async findById(id: string) {
    return MOCK_EXPERTS.find((expert) => expert.id === id) ?? null;
  },
};
```

- [x] Add a Supabase repository shell that is only selected in Supabase mode.

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { Expert, Urgency, Vertical } from '@/lib/types';
import { ExpertRepository } from './repository';

const SELECT = 'id,name,vertical,specialties,region,phone,experience_years,bio,youtube_url,is_available,is_active,created_at';

function shuffleExperts(experts: Expert[]): Expert[] {
  const shuffled = [...experts];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const supabaseExpertRepository: ExpertRepository = {
  async listRecommended({ vertical, urgency }: { vertical: Vertical; urgency?: Urgency | string | null }) {
    let query = supabaseAdmin
      .from('experts')
      .select(SELECT)
      .eq('vertical', vertical)
      .eq('is_active', true);

    if (urgency === '즉시') {
      query = query.order('is_available', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('[experts] supabase list error:', error);
      return [];
    }

    let experts = (data ?? []) as Expert[];

    if (urgency === '즉시') {
      const available = experts.filter((expert) => expert.is_available);
      if (available.length > 0) {
        experts = available;
      }
    }

    return shuffleExperts(experts).slice(0, 3);
  },

  async findById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('experts')
      .select(SELECT)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      return null;
    }

    return data as Expert;
  },
};
```

### Task 1.3: Route public API through repository

**Files:**
- Modify: `app/api/experts/route.ts`

- [x] Replace direct `MOCK_EXPERTS` usage with `getExpertRepository()`.

Expected shape:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getExpertRepository } from '@/lib/experts/repository';
import { Vertical } from '@/lib/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vertical = searchParams.get('vertical') as Vertical | null;
  const urgency = searchParams.get('urgency');

  if (!vertical) {
    return NextResponse.json({ error: 'vertical 파라미터가 필요합니다.' }, { status: 400 });
  }

  const experts = await getExpertRepository().listRecommended({ vertical, urgency });

  return NextResponse.json({ experts, total: experts.length });
}
```

- [x] Verify mock mode remains stable.

Run:

```bash
npm run build
```

Expected: build succeeds and `/api/experts?vertical=lawyer&urgency=즉시` returns mock experts when `GOLGORU_DATA_SOURCE` is absent.

## 8. Stage 2: Public Detail Supabase Read Path

**Purpose:** Ensure expert cards and profile pages use the same source.

### Task 2.1: Update expert detail page

**Files:**
- Modify: `app/(site)/expert/[id]/page.tsx`

- [x] Replace direct `MOCK_EXPERTS.find()` with repository lookup.

Expected shape:

```ts
import { getExpertRepository } from '@/lib/experts/repository';

export default async function ExpertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const expert = await getExpertRepository().findById(id);
  if (!expert) notFound();

  return (
    // existing approved UI remains unchanged
  );
}
```

- [x] Verify mock expert links still work.

Run:

```bash
npm run build
```

Expected: build succeeds. In mock mode, `/expert/lawyer-1` resolves.

### Task 2.2: Verify Supabase expert detail path

**Files:**
- Modify only if needed: `lib/experts/supabase-repository.ts`

- [ ] Insert or confirm one active Supabase expert from the admin dashboard.

Expected: row has `id`, `vertical`, `specialties`, `phone`, `is_active=true`.

- [ ] Run local app in Supabase mode.

Run:

```bash
GOLGORU_DATA_SOURCE=supabase npm run dev
```

Expected: local server starts and public result/detail pages read Supabase experts.

## 9. Stage 3: Database Integrity Hardening

**Purpose:** Make Supabase reject invalid service data before it reaches users.

### Task 3.1: Strengthen `experts` constraints

**Files:**
- Modify: `supabase-setup.sql`

- [ ] Add a unique phone constraint.

```sql
alter table experts
  add constraint experts_phone_unique unique (phone);
```

- [ ] Add an experience-year range constraint.

```sql
alter table experts
  add constraint experts_experience_years_range
  check (experience_years >= 0 and experience_years <= 80);
```

- [ ] Add a non-empty specialties constraint.

```sql
alter table experts
  add constraint experts_specialties_non_empty
  check (array_length(specialties, 1) >= 1);
```

- [ ] Add `updated_at` for future admin edits.

```sql
alter table experts
  add column if not exists updated_at timestamptz default now();
```

### Task 3.2: Align server validation with DB rules

**Files:**
- Modify: `app/api/admin/experts/route.ts`
- Modify: `app/api/admin/experts/[id]/route.ts`
- Modify: `lib/admin/csv.ts`

- [ ] Confirm single-create, update, and CSV import reject the same invalid cases:
  - phone duplicate
  - invalid vertical
  - empty specialties
  - experience below `0`
  - experience above `80`
  - invalid YouTube URL

- [ ] Verify build.

Run:

```bash
npm run build
```

Expected: build succeeds after validation and SQL file changes.

## 10. Stage 4: Service Event ERD

**Purpose:** Move from a static directory to a measurable SOS service.

### Task 4.1: Add user problem intake table

**Files:**
- Modify: `supabase-setup.sql`

- [ ] Add `problem_intakes`.

```sql
create table if not exists problem_intakes (
  id uuid primary key default gen_random_uuid(),
  raw_query text,
  transcript text,
  vertical text not null check (vertical in ('lawyer', 'labor', 'adjuster', 'tax', 'doctor')),
  category text not null,
  urgency text not null check (urgency in ('즉시', '당일', '일반')),
  keywords text[] not null default '{}',
  summary text not null,
  source text not null check (source in ('text', 'audio')),
  created_at timestamptz not null default now()
);
```

### Task 4.2: Add recommendation match table

**Files:**
- Modify: `supabase-setup.sql`

- [ ] Add `recommendation_matches`.

```sql
create table if not exists recommendation_matches (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid references problem_intakes(id) on delete set null,
  expert_id uuid references experts(id) on delete set null,
  vertical text not null check (vertical in ('lawyer', 'labor', 'adjuster', 'tax', 'doctor')),
  position integer not null check (position >= 1 and position <= 3),
  data_source text not null check (data_source in ('mock', 'supabase')),
  created_at timestamptz not null default now()
);
```

### Task 4.3: Add contact event table

**Files:**
- Modify: `supabase-setup.sql`

- [ ] Add `contact_events`.

```sql
create table if not exists contact_events (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid references problem_intakes(id) on delete set null,
  expert_id uuid references experts(id) on delete set null,
  event_type text not null check (event_type in ('profile_view', 'phone_click')),
  vertical text not null check (vertical in ('lawyer', 'labor', 'adjuster', 'tax', 'doctor')),
  created_at timestamptz not null default now()
);
```

## 11. Stage 5: Event Capture Flow

**Purpose:** Capture enough data to evaluate service quality without adding user login.

### Task 5.1: Return intake ID from classification

**Files:**
- Modify: `app/api/classify/route.ts`
- Create: `lib/events/repository.ts`
- Create: `lib/events/supabase-repository.ts`
- Create: `lib/events/noop-repository.ts`

- [ ] In mock mode, return classification result without DB write.

Expected: demo remains deterministic and does not need Supabase credentials.

- [ ] In Supabase mode, insert one `problem_intakes` row and return `intake_id`.

Expected JSON shape:

```json
{
  "vertical": "lawyer",
  "category": "형사",
  "urgency": "즉시",
  "keywords": ["고소", "경찰"],
  "summary": "경찰 조사 대응이 필요한 상황",
  "intake_id": "uuid"
}
```

### Task 5.2: Persist recommendation matches

**Files:**
- Modify: `app/api/experts/route.ts`
- Modify: `app/(site)/result/page.tsx`

- [ ] Pass `intake_id` from `sessionStorage` to `/api/experts`.

Expected request:

```txt
/api/experts?vertical=lawyer&urgency=즉시&intake_id=uuid-string
```

- [ ] In Supabase mode, insert up to three `recommendation_matches` rows.

Expected: each row records `intake_id`, `expert_id`, `vertical`, `position`, and `data_source`.

### Task 5.3: Persist contact events

**Files:**
- Modify: `components/CallButton.tsx`
- Create or modify: `app/api/events/contact/route.ts`

- [ ] Add a non-blocking `phone_click` event before `tel:` navigation.

Expected: call action still opens the phone app even when event logging fails.

- [ ] Record `profile_view` when a Supabase-backed expert profile is opened.

Expected: profile view is measurable without requiring user login.

## 12. Stage 6: Vercel Project Split

**Purpose:** Give Golgoru team a stable mock demo while staging uses real data.

### Task 6.1: Demo project environment

**Vercel project:** `golgoru-sos-demo`

- [ ] Set demo env values.

```txt
GOLGORU_DATA_SOURCE=mock
GEMINI_API_KEY=Vercel project environment value
```

Expected: no Supabase service key is needed for the demo project.

### Task 6.2: Staging project environment

**Vercel project:** `golgoru-sos-staging`

- [ ] Set staging env values.

```txt
GOLGORU_DATA_SOURCE=supabase
NEXT_PUBLIC_SUPABASE_URL=Vercel project environment value
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=Vercel project environment value
SUPABASE_SECRET_KEY=Vercel project environment value
GEMINI_API_KEY=Vercel project environment value
```

Expected: staging can read/write Supabase through server routes.

### Task 6.3: Deployment verification

- [ ] Deploy demo and confirm the mock expert names still appear.
- [ ] Deploy staging and confirm an admin-created expert appears in public recommendation results.
- [ ] Confirm staging deletion/deactivation removes the expert from public results.

## 13. Stage 7: Verification Checklist

Run these checks before each push that changes runtime behavior.

- [ ] Build passes.

```bash
npm run build
```

- [ ] Mock recommendation works without Supabase env.

```bash
npm run dev
```

Expected: result page returns mock experts.

- [ ] Supabase recommendation works with Supabase env.

```bash
GOLGORU_DATA_SOURCE=supabase npm run dev
```

Expected: result page returns active Supabase experts.

- [ ] Admin CRUD still writes to Supabase.

Expected: create, update, deactivate, CSV validate/import, and audit log continue to work.

- [ ] Demo visual baseline remains unchanged.

Expected: approved hero design and result page layout are not altered by data-source work.

## 14. Commit Plan

Use small commits so demo stability can be recovered quickly.

| Commit | Scope | Suggested message |
|---|---|---|
| 1 | Development checklist | `docs: add Supabase data source development checklist` |
| 2 | Repository interface and mock adapter | `refactor: add expert data source boundary` |
| 3 | Supabase public read adapter | `feat: read public experts from Supabase` |
| 4 | Expert detail repository lookup | `refactor: route expert detail through repository` |
| 5 | DB constraints | `chore: harden expert data constraints` |
| 6 | Intake/match/contact schema | `feat: add SOS service event schema` |
| 7 | Event capture routes | `feat: capture SOS service events` |
| 8 | Vercel env documentation | `docs: document demo and staging deployment envs` |

## 15. Completion Criteria

- [ ] The Golgoru team demo can stay on mock data indefinitely.
- [ ] Staging can use Supabase without changing source branches.
- [ ] Public recommendation and expert detail read from the same selected source.
- [ ] Admin-created Supabase experts can be seen by consumers in staging.
- [ ] Basic SOS service events can be stored and inspected.
- [ ] Each stage has a build or deployment check recorded before push.

## 16. Self-Review

- Spec coverage: The plan covers mock demo preservation, Supabase development, single-repo strategy, Vercel project split, data integrity, ERD expansion, event capture, verification, and commit order.
- Concrete-step scan: The plan contains concrete file paths, environment keys, commands, expected outcomes, and schema snippets.
- Type consistency: The plan uses the existing `Expert`, `Vertical`, and `Urgency` domain types and keeps `mock`/`supabase` as the only data-source values.
