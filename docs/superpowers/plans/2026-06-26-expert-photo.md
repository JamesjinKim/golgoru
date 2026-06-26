# 전문가 미니 사진 아바타 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전문가 아바타에 실제 사진을 표시한다. 관리자가 어드민에서 사진을 업로드하면 서버가 자동으로 중앙 정사각 크롭+256×256 webp로 표준화해 Supabase Storage에 저장하고, UI는 사진이 있으면 사진을, 없으면 기존 이니셜을 보여준다.

**Architecture:** 데이터(컬럼+타입+repo) → Storage 업로드 라우트(sharp 변환) → 어드민 폼 UI → 표시 공통 컴포넌트(`<ExpertAvatar>`)로 3곳 통합. 사진 없는 전문가가 다수이므로 이니셜 폴백이 메인, 사진은 보너스.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Supabase(Storage + Postgres), `sharp`(이미지 변환), 인라인 스타일 + `lib/tokens`.

**설계 출처:** [docs/02-design/features/expert-photo.design.md](../../02-design/features/expert-photo.design.md)

## Global Constraints

- 검증 게이트는 **`npx tsc --noEmit`** 뿐 (테스트 러너 없음). 각 코드 task 종료 시 실행해 통과 확인.
- 데이터 소스 추상화: 절대 구체 repository를 직접 import 금지. `getExpertRepository()` 사용. mock·supabase 양쪽이 `ExpertRepository` 인터페이스 동일 구현 — `photo_url` 누락 시 `tests/experts-repository.contract.ts`가 `tsc`에서 실패.
- 어드민 라우트는 `proxy.ts` 매처(`/api/admin/*`) + 라우트 내 `requireAdmin()`(`lib/admin/auth.ts`) 이중 가드.
- 서버 전용 Supabase는 `supabaseAdmin`(service role). 클라이언트 직접 Storage 쓰기 금지.
- Next.js 런타임 코드(`next.config.js` images, `next/image`)는 AGENTS.md 규칙 — Next 16 형식 준수(확인 완료: `remotePatterns` 객체 배열).
- 이미지 표준: 중앙 정사각 크롭 → **256×256** → **webp**. 업로드 상한 **2MB**, 허용 포맷 jpg/png/webp.
- Storage 버킷명: **`expert-photos`**, 경로 `{expert_id}.webp`, public 읽기.
- 커밋 메시지 끝에: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## File Structure

| 파일 | 책임 | 작업 |
|---|---|---|
| `supabase-expert-photo.sql` | `experts.photo_url` 컬럼 추가(idempotent) | Create |
| `lib/types.ts` | `Expert.photo_url` 필드 | Modify |
| `lib/mock-data.ts` | mock 전문가에 `photo_url` (대부분 null, 1~2개 샘플 URL) | Modify |
| `lib/experts/supabase-repository.ts` | `SELECT` 상수에 `photo_url` 추가 | Modify |
| `lib/experts/photo.ts` | sharp 변환 헬퍼(중앙크롭+256+webp), 파일 검증 | Create |
| `app/api/admin/experts/[id]/photo/route.ts` | 업로드(POST)·삭제(DELETE) 라우트 | Create |
| `components/ExpertAvatar.tsx` | 사진/이니셜 폴백 공통 컴포넌트 | Create |
| `components/ExpertCard.tsx` | 아바타를 `<ExpertAvatar>`로 교체 | Modify |
| `app/(site)/expert/[id]/page.tsx` | 아바타를 `<ExpertAvatar>`로 교체(76px) | Modify |
| `components/admin/ExpertForm.tsx` | 사진 업로드/미리보기 UI | Modify |
| `next.config.js` | Supabase Storage 호스트 `remotePatterns` | Modify |

---

## Task 1: 데이터 계층 (컬럼 + 타입 + repo 정합)

**Files:**
- Create: `supabase-expert-photo.sql`
- Modify: `lib/types.ts:14-33` (Expert 인터페이스)
- Modify: `lib/experts/supabase-repository.ts:5` (SELECT 상수)
- Modify: `lib/mock-data.ts` (각 전문가 항목)

**Interfaces:**
- Produces: `Expert.photo_url?: string | null` — 이후 모든 task가 이 필드를 읽음.

- [ ] **Step 1: SQL 마이그레이션 파일 작성**

Create `supabase-expert-photo.sql`:

```sql
-- =====================================================================
-- expert-photo: experts 에 photo_url 추가 (미니 사진 아바타)
-- 설계: docs/02-design/features/expert-photo.design.md
-- 전제: supabase-setup.sql 적용됨. 재실행 안전(idempotent).
-- =====================================================================
alter table experts add column if not exists photo_url text;
```

- [ ] **Step 2: Expert 타입에 필드 추가**

`lib/types.ts` 의 `Expert` 인터페이스, `youtube_url` 줄 아래에 추가:

```ts
  youtube_url?: string;
  photo_url?: string | null; // Supabase Storage public URL. 없으면 이니셜 폴백
```

- [ ] **Step 3: supabase repository SELECT 에 컬럼 추가**

`lib/experts/supabase-repository.ts:5` 의 `SELECT` 상수 끝(`created_at` 뒤)에 `,photo_url` 추가:

```ts
const SELECT = 'id,name,vertical,license,specialties,region,phone,experience_years,bio,youtube_url,status,weekday_start,weekday_end,weekend_available,night_available,is_active,created_at,photo_url';
```

- [ ] **Step 4: mock-data 에 photo_url 반영**

`lib/mock-data.ts` 의 각 전문가 객체에 `photo_url: null` 추가(첫 1개는 동작 확인용 샘플 공개 이미지 URL로 둬도 됨). 누락하면 `tsc` 계약 테스트가 잡지는 않으나(옵셔널 필드라) 일관성 위해 명시. 최소 1개는 실제 표시 테스트용으로:

```ts
    name: '김민준',
    vertical: 'lawyer',
    photo_url: null,
```

- [ ] **Step 5: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음(통과).

- [ ] **Step 6: 커밋**

```bash
git add supabase-expert-photo.sql lib/types.ts lib/experts/supabase-repository.ts lib/mock-data.ts
git commit -m "feat(expert-photo): photo_url 컬럼·타입·repo 정합

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: 표시 공통 컴포넌트 `<ExpertAvatar>` + 3곳 교체

> 업로드보다 표시를 먼저 한다 — Task 1에서 mock에 샘플 URL을 넣으면 업로드 없이도 화면에서 즉시 검증 가능하기 때문.

**Files:**
- Create: `components/ExpertAvatar.tsx`
- Modify: `components/ExpertCard.tsx:25-33` (아바타 div)
- Modify: `app/(site)/expert/[id]/page.tsx:56-65` (아바타 div, 76px)
- Modify: `next.config.js`

**Interfaces:**
- Produces: `<ExpertAvatar expert={Expert} size={number} gradientTo?: 'green'|'gold' />` — Task 4의 ExpertForm 미리보기도 사용.

- [ ] **Step 1: next.config.js 에 Supabase 호스트 등록**

`lib/supabase.ts` 또는 env에서 Supabase URL 호스트명을 확인한다(예: `<project>.supabase.co`). `next.config.js` 를 수정:

```js
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/expert-photos/**',
      },
    ],
  },
};

module.exports = nextConfig;
```

- [ ] **Step 2: ExpertAvatar 컴포넌트 작성**

Create `components/ExpertAvatar.tsx`:

```tsx
import Image from 'next/image';
import { Expert } from '@/lib/types';
import { G } from '@/lib/tokens';

export default function ExpertAvatar({
  expert,
  size = 48,
  gradientTo = 'green',
}: {
  expert: Pick<Expert, 'name' | 'photo_url'>;
  size?: number;
  gradientTo?: 'green' | 'gold';
}) {
  const ring = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    overflow: 'hidden' as const,
  };

  if (expert.photo_url) {
    return (
      <div style={ring}>
        <Image
          src={expert.photo_url}
          alt={`${expert.name} 프로필 사진`}
          width={size}
          height={size}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }

  const to = gradientTo === 'gold' ? G.gold : G.starbucksGreen;
  return (
    <div
      style={{
        ...ring,
        background: `linear-gradient(135deg, ${G.greenAccent}, ${to})`,
        color: '#fff',
        fontSize: Math.round(size * 0.375),
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        letterSpacing: '-0.16px',
      }}
    >
      {expert.name.charAt(0)}
    </div>
  );
}
```

- [ ] **Step 3: ExpertCard 아바타 교체**

`components/ExpertCard.tsx`: 상단에 `import ExpertAvatar from './ExpertAvatar';` 추가. `width: 48 … {expert.name.charAt(0)}` 의 아바타 `<div>`(라인 25-33 블록 전체)를 다음으로 교체:

```tsx
            <ExpertAvatar expert={expert} size={48} />
```

- [ ] **Step 4: 미니홈피 아바타 교체**

`app/(site)/expert/[id]/page.tsx`: `import ExpertAvatar from '@/components/ExpertAvatar';` 추가. 76px gold 아바타 `<div>`(라인 56-65 블록)를 교체:

```tsx
            <ExpertAvatar expert={expert} size={76} gradientTo="gold" />
```

- [ ] **Step 5: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과.

- [ ] **Step 6: 수동 확인**

Run: `npm run dev` 후 추천/브라우즈 카드와 전문가 상세에서 (a) photo_url=null 전문가는 이니셜 원, (b) Task1 샘플 URL 전문가는 사진이 원형으로 꽉 차게(찌그러짐 없이) 표시되는지 확인.

- [ ] **Step 7: 커밋**

```bash
git add components/ExpertAvatar.tsx components/ExpertCard.tsx "app/(site)/expert/[id]/page.tsx" next.config.js
git commit -m "feat(expert-photo): ExpertAvatar 공통 컴포넌트 + 카드/미니홈피 적용

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: 업로드 라우트 (sharp 변환 + Storage)

**Files:**
- Create: `lib/experts/photo.ts`
- Create: `app/api/admin/experts/[id]/photo/route.ts`
- Modify: `package.json` (sharp 의존성)

**Interfaces:**
- Consumes: `supabaseAdmin`(`lib/supabase.ts`), `requireAdmin`(`lib/admin/auth.ts`).
- Produces: `POST /api/admin/experts/{id}/photo` → `{ photo_url }`; `DELETE` → `{ ok: true }`.

- [ ] **Step 1: sharp 설치**

Run:
```bash
npm install sharp
```
Expected: package.json dependencies 에 `sharp` 추가됨.

- [ ] **Step 2: 변환·검증 헬퍼 작성**

Create `lib/experts/photo.ts`:

```ts
import sharp from 'sharp';

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateUpload(file: { type: string; size: number }): string | null {
  if (!ALLOWED.has(file.type)) return '지원하지 않는 형식입니다 (jpg/png/webp).';
  if (file.size > MAX_UPLOAD_BYTES) return '파일이 너무 큽니다 (최대 2MB).';
  return null;
}

// 중앙 정사각 크롭 → 256×256 → webp
export async function toSquareWebp(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .resize(256, 256, { fit: 'cover', position: 'centre' })
    .webp({ quality: 82 })
    .toBuffer();
}
```

- [ ] **Step 3: 업로드/삭제 라우트 작성**

Create `app/api/admin/experts/[id]/photo/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { validateUpload, toSquareWebp } from '@/lib/experts/photo';

const BUCKET = 'expert-photos';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '파일이 없습니다.' }, { status: 422 });
  }
  const invalid = validateUpload({ type: file.type, size: file.size });
  if (invalid) return NextResponse.json({ error: invalid }, { status: 422 });

  const webp = await toSquareWebp(Buffer.from(await file.arrayBuffer()));
  const objectPath = `${id}.webp`;

  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(objectPath, webp, { contentType: 'image/webp', upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(objectPath);
  // 캐시 무력화: 같은 경로 덮어쓰기라 쿼리스트링으로 버전
  const photo_url = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: dbErr } = await supabaseAdmin
    .from('experts')
    .update({ photo_url })
    .eq('id', id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ photo_url });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  await supabaseAdmin.storage.from(BUCKET).remove([`${id}.webp`]);
  const { error } = await supabaseAdmin.from('experts').update({ photo_url: null }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

> ⚠️ `requireAdmin()` 의 실제 반환 형태를 `lib/admin/auth.ts` 에서 확인할 것. 위는 `{ ok: boolean }` 가정 — 다르면(예: throw 또는 user 반환) 기존 어드민 라우트(`app/api/admin/experts/route.ts`) 의 사용 패턴에 맞춰 가드 코드를 수정한다. **반드시 같은 파일의 기존 호출 방식을 그대로 따른다.**

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과. (`sharp` 타입은 패키지 내장.)

- [ ] **Step 5: Supabase 버킷 생성 (대시보드 — 수동)**

Supabase Dashboard → Storage → New bucket: 이름 `expert-photos`, **Public** 체크. (쓰기는 service-role 키로만 하므로 추가 정책 불필요. 읽기 public.)

- [ ] **Step 6: 커밋**

```bash
git add lib/experts/photo.ts "app/api/admin/experts/[id]/photo/route.ts" package.json package-lock.json
git commit -m "feat(expert-photo): 업로드 라우트 + sharp 중앙크롭 256 webp

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: 어드민 폼 업로드 UI

**Files:**
- Modify: `components/admin/ExpertForm.tsx`

**Interfaces:**
- Consumes: `POST/DELETE /api/admin/experts/{id}/photo` (Task 3), `<ExpertAvatar>` (Task 2).

- [ ] **Step 1: 사진 상태·핸들러 추가**

`components/ExpertForm.tsx` 상단에 `import ExpertAvatar from '@/components/ExpertAvatar';` 추가. 컴포넌트 내부 상태 영역(`const [saving, ...]` 근처)에 추가:

```tsx
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial?.photo_url ?? null);
  const [uploading, setUploading] = useState(false);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !initial?.id) return; // 신규 전문가는 저장 후 업로드
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/admin/experts/${initial.id}/photo`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '업로드 실패');
      setPhotoUrl(json.photo_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 실패');
    } finally {
      setUploading(false);
    }
  }
```

- [ ] **Step 2: 업로드 UI 블록 추가**

폼 필드 영역(이름 input 근처, 적절한 위치)에 미리보기+파일선택 추가:

```tsx
        <div className="col-span-2 flex items-center gap-3">
          <ExpertAvatar expert={{ name: form.name || '?', photo_url: photoUrl }} size={56} />
          <div className="flex flex-col gap-1 text-xs text-slate-500">
            {initial?.id ? (
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} disabled={uploading} />
            ) : (
              <span>전문가를 먼저 저장한 뒤 사진을 업로드할 수 있습니다.</span>
            )}
            {uploading && <span>업로드 중…</span>}
          </div>
        </div>
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과. (`React.ChangeEvent` 사용 위해 `import { useState } from 'react'` 가 이미 있음 — `React` 네임스페이스가 없으면 타입을 `import type { ChangeEvent } from 'react'` 로 바꾸고 `ChangeEvent<HTMLInputElement>` 사용.)

- [ ] **Step 4: 수동 확인**

`npm run dev` → 어드민 로그인 → 기존 전문가 편집 → 사진 업로드 → 미리보기가 정사각 원으로 갱신되는지, 목록/상세에도 반영되는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add components/admin/ExpertForm.tsx
git commit -m "feat(expert-photo): 어드민 폼 사진 업로드 UI

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage** (expert-photo.design.md 대비):
- §3 데이터(컬럼·타입·repo) → Task 1 ✅
- §4 Storage(버킷·정책) → Task 3 Step5(버킷), 정책은 public 버킷+service-role 쓰기로 충족 ✅
- §5 업로드(라우트·sharp·검증·ExpertForm) → Task 3 + Task 4 ✅
- §6 표시(ExpertAvatar 추출·3곳·next.config) → Task 2 ✅ (ExpertForm은 §6에서 표시 위치 중 하나지만 미리보기로 Task4에서 처리)
- §2 결정(중앙크롭·256·webp·2MB·어드민전용) → Task 3 헬퍼·라우트 ✅

**Placeholder scan:** 모든 코드 블록 실제 코드. `requireAdmin()` 반환형은 "기존 라우트 패턴 따르라"는 명시적 지시로 처리(가정 표시).

**Type consistency:** `photo_url` 명칭 전 task 일관. `ExpertAvatar` props(`expert`/`size`/`gradientTo`)가 Task2 정의 ↔ Task4 사용 일치. `toSquareWebp`/`validateUpload` 시그니처 Task3 내부 일관.

**알려진 확인 필요점(실행 중 해소):**
1. `requireAdmin()` 실제 반환 형태 → 기존 `app/api/admin/experts/route.ts` 패턴 확인 후 맞춤.
2. Supabase URL 호스트명 → `*.supabase.co` 와일드카드로 커버하나, 실제 프로젝트 URL 확인 권장.
3. `lib/tokens` 에 `G.gold`/`G.greenAccent`/`G.starbucksGreen` 존재 확인(기존 코드가 이미 사용 중이므로 존재함).
