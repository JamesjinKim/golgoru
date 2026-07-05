# 프로필 수집 + 어드민 사용자 조회 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** OAuth 가입 직후 동의 화면에서 프로필(이름·전화·성별·지역)을 필수 입력받아 저장하고, 운영자가 `/admin/users`에서 사용자를 조회한다.

**Architecture:** 기존 `/consent` 화면(ConsentForm)과 동의 API를 확장해 프로필을 함께 받는다(새 라우트 없음). 콜백 게이트에 프로필 완료 조건을 추가한다. admin 조회는 experts 목록 패턴(`requireAdmin` + `supabaseAdmin` + client fetch)을 그대로 따른다.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase(`@supabase/ssr`), TypeScript strict, 인라인 스타일 + `lib/tokens.ts`(`G`).

## Global Constraints

- 검증 게이트는 `npx tsc --noEmit` 하나뿐. lint/test runner 없음. 각 태스크는 타입체크 통과로 검증.
- 스타일: 새 CSS 파일 금지. 인라인 스타일 + `import { G } from '@/lib/tokens'`.
- 인증/프로필 DB 접근은 기존 관례대로 `supabaseAdmin`(`lib/supabase.ts`) 직접 사용. `profiles` RLS는 본인 전용이라 admin 조회는 반드시 서버에서 service role로.
- 모든 UI 문구는 한글.
- SQL은 손수 적용(SQL Editor), idempotent.
- 지역은 **시/도 17개 드롭다운**만. 값은 시/도 명칭 한 문자열(예: "서울특별시"). 시/군/구는 후속.
- 성별 값: `'male' | 'female' | 'unspecified'`.
- 전화 형식 검증 정규식: `/^01[016789]-?\d{3,4}-?\d{4}$/`.
- `profiles.created_at`는 이미 존재(추가 불필요).
- 브랜치: main에서 작업 중. 작업 시작 전 `git checkout -b feature/user-profile` 로 새 브랜치 생성.

## File Structure

**신규**
- `supabase-profile-fields-setup.sql` — profiles에 full_name/phone/gender/region 추가
- `lib/regions.ts` — 시/도 17개 상수
- `lib/auth/profileFields.ts` — ProfileFields 타입 + hasCompleteProfile + 검증 헬퍼
- `app/api/admin/users/route.ts` — GET 사용자 목록
- `app/(admin)/admin/users/page.tsx` — 사용자 목록 페이지

**수정**
- `lib/auth/profile.ts` — UserProfile에 프로필 4필드 추가
- `lib/auth/user.ts` — getCurrentUserProfile select에 4필드 추가
- `app/api/auth/consent/route.ts` — 프로필 저장 + 서버 검증
- `components/auth/ConsentForm.tsx` — 프로필 입력 섹션
- `app/auth/callback/route.ts` — 게이트에 hasCompleteProfile 추가
- `components/admin/AdminNav.tsx` — 사용자 링크

**무수정:** proxy.ts, lib/admin/auth.ts, lib/auth/supabaseServer.ts, hasRequiredConsent(재사용).

---

### Task 1: DB — 프로필 컬럼 추가

**Files:**
- Create: `supabase-profile-fields-setup.sql`

**Interfaces:**
- Produces: `profiles`에 `full_name`, `phone`, `gender`, `region` (모두 `text`, nullable) 추가.

- [ ] **Step 1: SQL 파일 작성**

```sql
-- supabase-profile-fields-setup.sql
-- 사전조건: supabase-user-auth.sql(profiles), supabase-consent-setup.sql(동의 컬럼).
-- 재실행 안전(idempotent). SQL Editor에 붙여 실행.

alter table profiles
  add column if not exists full_name text,   -- 실명 (display_name=OAuth 닉네임과 별개)
  add column if not exists phone     text,   -- 휴대폰 (010-XXXX-XXXX)
  add column if not exists gender    text,   -- 'male' | 'female' | 'unspecified'
  add column if not exists region    text;   -- 지역 시/도 명칭 (예: 서울특별시)
```

- [ ] **Step 2: 커밋**

```bash
git add supabase-profile-fields-setup.sql
git commit -m "feat(profile): 프로필 필드 컬럼 SQL 추가"
```

> 실제 DB 적용(SQL Editor 실행)은 사용자 수동 작업.

---

### Task 2: 시/도 상수

**Files:**
- Create: `lib/regions.ts`

**Interfaces:**
- Produces: `export const REGIONS: string[]` — 17개 시/도 명칭 배열.

- [ ] **Step 1: lib/regions.ts 작성**

```typescript
// lib/regions.ts
// 지역 기반 전문가 매칭용 시/도 목록 (17개 광역시·도). 시/군/구 세분화는 후속.
export const REGIONS = [
  '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시',
  '대전광역시', '울산광역시', '세종특별자치시', '경기도', '강원특별자치도',
  '충청북도', '충청남도', '전북특별자치도', '전라남도', '경상북도',
  '경상남도', '제주특별자치도',
] as const;
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 3: 커밋**

```bash
git add lib/regions.ts
git commit -m "feat(profile): 시/도 17개 지역 상수"
```

---

### Task 3: 프로필 필드 타입 + 판정/검증 헬퍼

**Files:**
- Create: `lib/auth/profileFields.ts`
- Modify: `lib/auth/profile.ts`, `lib/auth/user.ts`

**Interfaces:**
- Produces:
  - `interface ProfileFields { full_name: string | null; phone: string | null; gender: string | null; region: string | null; }`
  - `hasCompleteProfile(p: Partial<ProfileFields> | null | undefined): boolean` — 4필드 모두 non-empty
  - `isValidPhone(phone: string): boolean` — 전화 형식 검증
  - `UserProfile`가 `ProfileFields`를 포함하도록 확장.
- Consumes: `UserProfile`(`lib/auth/profile.ts`).

- [ ] **Step 1: profileFields.ts 작성**

```typescript
// lib/auth/profileFields.ts
export interface ProfileFields {
  full_name: string | null;
  phone: string | null;
  gender: string | null;
  region: string | null;
}

export type Gender = 'male' | 'female' | 'unspecified';

const PHONE_RE = /^01[016789]-?\d{3,4}-?\d{4}$/;

export function isValidPhone(phone: string): boolean {
  return PHONE_RE.test(phone.trim());
}

// 실명·전화·성별·지역이 모두 채워지면 프로필 완료.
export function hasCompleteProfile(
  p: Partial<ProfileFields> | null | undefined,
): boolean {
  if (!p) return false;
  return Boolean(
    p.full_name?.trim() &&
      p.phone?.trim() &&
      p.gender?.trim() &&
      p.region?.trim(),
  );
}
```

- [ ] **Step 2: profile.ts의 UserProfile 확장**

`lib/auth/profile.ts` 상단 import에 ProfileFields 추가, 인터페이스 확장. 기존:

```typescript
import type { ConsentTimestamps } from './consent';

export type UserProfileRole = 'user' | 'expert' | 'admin';

export interface UserProfile extends ConsentTimestamps {
  id: string;
  role: UserProfileRole;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}
```

변경 후:

```typescript
import type { ConsentTimestamps } from './consent';
import type { ProfileFields } from './profileFields';

export type UserProfileRole = 'user' | 'expert' | 'admin';

export interface UserProfile extends ConsentTimestamps, ProfileFields {
  id: string;
  role: UserProfileRole;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}
```

그리고 `mapAuthUserToProfileRow`의 반환 객체에 프로필 4필드 기본값(null)을 추가한다. 기존 return 블록(동의 필드 4개 뒤)에 이어서:

```typescript
    terms_agreed_at: null,
    privacy_agreed_at: null,
    thirdparty_agreed_at: null,
    marketing_agreed_at: null,
```

를 다음으로 교체:

```typescript
    terms_agreed_at: null,
    privacy_agreed_at: null,
    thirdparty_agreed_at: null,
    marketing_agreed_at: null,
    full_name: null,
    phone: null,
    gender: null,
    region: null,
```

- [ ] **Step 3: user.ts의 select 확장**

`lib/auth/user.ts`의 `getCurrentUserProfile` 안 profiles select 문자열을 확장. 기존:

```typescript
    .select('id,role,display_name,email,avatar_url,terms_agreed_at,privacy_agreed_at,thirdparty_agreed_at,marketing_agreed_at')
```

변경 후:

```typescript
    .select('id,role,display_name,email,avatar_url,terms_agreed_at,privacy_agreed_at,thirdparty_agreed_at,marketing_agreed_at,full_name,phone,gender,region')
```

> `upsertUserProfileFromAuthUser`의 insert/update는 프로필 컬럼을 건드리지 않는다(기존 그대로). 신규 insert 시 mapAuthUserToProfileRow가 null을 넣으므로 hasCompleteProfile은 false → 게이트 동작.

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 5: 커밋**

```bash
git add lib/auth/profileFields.ts lib/auth/profile.ts lib/auth/user.ts
git commit -m "feat(profile): 프로필 필드 타입 + hasCompleteProfile/isValidPhone 헬퍼"
```

---

### Task 4: 동의 저장 API에 프로필 저장 추가

**Files:**
- Modify: `app/api/auth/consent/route.ts`

**Interfaces:**
- Consumes: `isValidPhone`(`lib/auth/profileFields.ts`).
- Produces: `POST /api/auth/consent`가 body `{ marketing?: boolean, profile: { full_name, phone, gender, region } }`를 받아 동의 타임스탬프 + 프로필을 함께 저장. 프로필 값 검증 실패 시 400.

- [ ] **Step 1: route.ts 수정**

기존 body 파싱 + update 부분을 교체. 기존:

```typescript
  let marketing = false;
  try {
    const body = (await req.json()) as { marketing?: unknown };
    marketing = body?.marketing === true;
  } catch {
    /* body 없으면 marketing=false */
  }

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      terms_agreed_at: now,
      privacy_agreed_at: now,
      thirdparty_agreed_at: now,
      marketing_agreed_at: marketing ? now : null,
    })
    .eq('id', user.id);
```

변경 후 (파일 상단 import에 `import { isValidPhone } from '@/lib/auth/profileFields';` 추가):

```typescript
  let marketing = false;
  let profile: { full_name?: unknown; phone?: unknown; gender?: unknown; region?: unknown } = {};
  try {
    const body = (await req.json()) as {
      marketing?: unknown;
      profile?: typeof profile;
    };
    marketing = body?.marketing === true;
    profile = body?.profile ?? {};
  } catch {
    /* body 파싱 실패 → 아래 검증에서 400 */
  }

  const fullName = typeof profile.full_name === 'string' ? profile.full_name.trim() : '';
  const phone = typeof profile.phone === 'string' ? profile.phone.trim() : '';
  const gender = typeof profile.gender === 'string' ? profile.gender.trim() : '';
  const region = typeof profile.region === 'string' ? profile.region.trim() : '';

  if (!fullName || !phone || !gender || !region) {
    return NextResponse.json({ error: '프로필 정보를 모두 입력해 주세요.' }, { status: 400 });
  }
  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: '전화번호 형식이 올바르지 않습니다.' }, { status: 400 });
  }
  if (!['male', 'female', 'unspecified'].includes(gender)) {
    return NextResponse.json({ error: '성별 값이 올바르지 않습니다.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      terms_agreed_at: now,
      privacy_agreed_at: now,
      thirdparty_agreed_at: now,
      marketing_agreed_at: marketing ? now : null,
      full_name: fullName,
      phone,
      gender,
      region,
    })
    .eq('id', user.id);
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 3: 커밋**

```bash
git add app/api/auth/consent/route.ts
git commit -m "feat(profile): 동의 API에 프로필 저장 + 서버 검증"
```

---

### Task 5: ConsentForm에 프로필 입력 섹션 추가

**Files:**
- Modify: `components/auth/ConsentForm.tsx`

**Interfaces:**
- Consumes: `REGIONS`(`lib/regions.ts`), `isValidPhone`(`lib/auth/profileFields.ts`), `G`(`lib/tokens.ts`).
- Produces: 동의 체크 + 프로필 입력(이름/전화/성별/지역). 필수 동의 AND 프로필 완료여야 제출 활성. 제출 시 `{ marketing, profile }` 전송.

- [ ] **Step 1: ConsentForm.tsx 수정**

파일 상단 import 추가:

```tsx
import { REGIONS } from '@/lib/regions';
import { isValidPhone } from '@/lib/auth/profileFields';
```

컴포넌트 내 state에 프로필 필드 추가. 기존 `const [error, setError] = useState('');` 바로 다음에 삽입:

```tsx
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [region, setRegion] = useState('');

  const phoneValid = phone === '' || isValidPhone(phone);
  const profileDone =
    fullName.trim() !== '' &&
    isValidPhone(phone) &&
    gender !== '' &&
    region !== '';
```

제출 가능 조건을 `requiredDone` → `requiredDone && profileDone`로 바꾼다. `submit` 함수의 첫 줄과 fetch body, 그리고 버튼 disabled/스타일에서 사용. 기존 `submit`의 가드:

```tsx
  const submit = async () => {
    if (!requiredDone || submitting) return;
```

변경:

```tsx
  const canSubmit = requiredDone && profileDone;
  const submit = async () => {
    if (!canSubmit || submitting) return;
```

fetch body 교체. 기존:

```tsx
        body: JSON.stringify({ marketing: checked.marketing }),
```

변경:

```tsx
        body: JSON.stringify({
          marketing: checked.marketing,
          profile: { full_name: fullName.trim(), phone: phone.trim(), gender, region },
        }),
```

- [ ] **Step 2: 프로필 입력 UI 삽입**

동의 항목 목록(`</div>` 닫은 뒤, "필수 항목에 동의해야…" 안내 `<p>` 앞)에 프로필 섹션을 삽입한다. 기존 위치 — 동의 리스트를 닫는 `      </div>` 다음 줄에 아래를 삽입:

```tsx
      <div style={{ marginTop: 20, marginBottom: 4 }}>
        <p style={{ fontSize: 14, fontWeight: 800, color: G.textBlack, margin: '0 0 10px' }}>
          기본 정보 입력
        </p>

        <input
          type="text"
          placeholder="이름 (실명)"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          style={inputStyle}
        />

        <input
          type="tel"
          placeholder="휴대폰 번호 (010-1234-5678)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ ...inputStyle, borderColor: phoneValid ? '#cfd4db' : G.red }}
        />
        {!phoneValid && (
          <p style={{ color: G.red, fontSize: 11.5, fontWeight: 600, margin: '-6px 0 8px 2px' }}>
            휴대폰 번호 형식을 확인해 주세요
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {([['male', '남성'], ['female', '여성'], ['unspecified', '선택 안 함']] as const).map(
            ([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setGender(val)}
                style={{
                  flex: 1, height: 44, borderRadius: 11, fontFamily: 'inherit',
                  fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                  border: `1.5px solid ${gender === val ? G.starbucksGreen : '#cfd4db'}`,
                  background: gender === val ? '#e8f5ee' : '#fff',
                  color: gender === val ? G.houseGreen : G.textSoft,
                }}
              >
                {label}
              </button>
            ),
          )}
        </div>

        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          style={{ ...inputStyle, color: region ? G.textBlack : '#aab0b9' }}
        >
          <option value="">지역 (시/도) 선택</option>
          {REGIONS.map((r) => (
            <option key={r} value={r} style={{ color: G.textBlack }}>{r}</option>
          ))}
        </select>
      </div>
```

그리고 파일 하단 스타일 상수들 옆에 `inputStyle` 추가:

```tsx
const inputStyle: React.CSSProperties = {
  width: '100%', height: 46, borderRadius: 11, padding: '0 14px',
  border: '1.5px solid #cfd4db', background: '#fff',
  fontSize: 14, fontFamily: 'inherit', marginBottom: 10,
  boxSizing: 'border-box',
};
```

- [ ] **Step 3: 제출 버튼 활성 조건을 canSubmit으로 교체**

버튼의 `disabled`와 스타일에서 `requiredDone`을 `canSubmit`으로 바꾼다. 기존:

```tsx
        disabled={!requiredDone || submitting}
        style={{
          ...
          cursor: !requiredDone || submitting ? 'not-allowed' : 'pointer',
          background: requiredDone ? G.starbucksGreen : '#c7ccd3',
          color: requiredDone ? '#fff' : '#eef0f3',
          boxShadow: requiredDone ? '0 6px 16px rgba(21,122,78,.32)' : 'none',
```

변경 (4곳의 `requiredDone` → `canSubmit`):

```tsx
        disabled={!canSubmit || submitting}
        style={{
          ...
          cursor: !canSubmit || submitting ? 'not-allowed' : 'pointer',
          background: canSubmit ? G.starbucksGreen : '#c7ccd3',
          color: canSubmit ? '#fff' : '#eef0f3',
          boxShadow: canSubmit ? '0 6px 16px rgba(21,122,78,.32)' : 'none',
```

그리고 "필수 항목에 동의해야 시작할 수 있어요" 안내 `<p>`의 visibility 조건도 canSubmit 기준으로 바꾸고 문구를 조정. 기존:

```tsx
      <p style={{ minHeight: 16, margin: '14px 0 6px', fontSize: 12, fontWeight: 600, textAlign: 'center', color: G.red, visibility: requiredDone ? 'hidden' : 'visible' }}>
        필수 항목에 동의해야 시작할 수 있어요
      </p>
```

변경:

```tsx
      <p style={{ minHeight: 16, margin: '14px 0 6px', fontSize: 12, fontWeight: 600, textAlign: 'center', color: G.red, visibility: canSubmit ? 'hidden' : 'visible' }}>
        필수 동의와 기본 정보를 모두 입력해야 시작할 수 있어요
      </p>
```

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 5: 커밋**

```bash
git add components/auth/ConsentForm.tsx
git commit -m "feat(profile): 동의 화면에 프로필 입력(이름·전화·성별·지역) 통합"
```

---

### Task 6: 콜백 게이트에 프로필 완료 조건 추가

**Files:**
- Modify: `app/auth/callback/route.ts`

**Interfaces:**
- Consumes: `hasCompleteProfile`(`lib/auth/profileFields.ts`).
- Produces: 콜백 후 `hasRequiredConsent && hasCompleteProfile` 둘 다여야 통과, 아니면 `/consent`.

- [ ] **Step 1: route.ts 수정**

파일 상단 import에 추가:

```typescript
import { hasCompleteProfile } from '@/lib/auth/profileFields';
```

consentRow select 문자열에 프로필 4필드 추가. 기존:

```typescript
    .select('terms_agreed_at,privacy_agreed_at,thirdparty_agreed_at,marketing_agreed_at')
```

변경:

```typescript
    .select('terms_agreed_at,privacy_agreed_at,thirdparty_agreed_at,marketing_agreed_at,full_name,phone,gender,region')
```

게이트 판정 조건 확장. 기존:

```typescript
  if (!hasRequiredConsent(consentRow)) {
```

변경:

```typescript
  if (!hasRequiredConsent(consentRow) || !hasCompleteProfile(consentRow)) {
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 3: 커밋**

```bash
git add app/auth/callback/route.ts
git commit -m "feat(profile): 콜백 게이트에 프로필 완료 조건 추가"
```

---

### Task 7: 어드민 사용자 조회 API

**Files:**
- Create: `app/api/admin/users/route.ts`

**Interfaces:**
- Consumes: `requireAdmin`(`lib/admin/auth.ts`), `supabaseAdmin`(`lib/supabase.ts`).
- Produces: `GET /api/admin/users` — `{ users, total }`. `?q=` 검색(email/full_name/display_name ilike).

- [ ] **Step 1: route.ts 작성**

```typescript
// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin/auth';

const SELECT =
  'id,email,display_name,full_name,gender,phone,region,created_at,terms_agreed_at,privacy_agreed_at,thirdparty_agreed_at,marketing_agreed_at';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const q = req.nextUrl.searchParams.get('q')?.trim();
  let query = supabaseAdmin.from('profiles').select(SELECT).order('created_at', { ascending: false });
  if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%,display_name.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) {
    console.error('[admin/users] list error:', error);
    return NextResponse.json({ error: '목록 조회 실패' }, { status: 500 });
  }
  return NextResponse.json({ users: data ?? [], total: (data ?? []).length });
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 3: 커밋**

```bash
git add "app/api/admin/users/route.ts"
git commit -m "feat(admin): 사용자 목록 조회 API (GET /api/admin/users)"
```

---

### Task 8: 어드민 사용자 목록 페이지 + 네비 링크

**Files:**
- Create: `app/(admin)/admin/users/page.tsx`
- Modify: `components/admin/AdminNav.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/users` (`{ users, total }`), `hasRequiredConsent`(`lib/auth/consent.ts`).
- Produces: `/admin/users` 페이지 + nav 링크.

- [ ] **Step 1: page.tsx 작성**

experts 페이지의 client fetch 패턴을 단순화해 사용(TanStack Table 대신 순수 테이블 — audit 페이지 수준, 사용자 적은 단계라 충분).

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { hasRequiredConsent } from '@/lib/auth/consent';

interface UserRow {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  gender: string | null;
  phone: string | null;
  region: string | null;
  created_at: string;
  terms_agreed_at: string | null;
  privacy_agreed_at: string | null;
  thirdparty_agreed_at: string | null;
  marketing_agreed_at: string | null;
}

const GENDER_LABEL: Record<string, string> = { male: '남', female: '여', unspecified: '-' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (query: string) => {
    setLoading(true);
    setError('');
    try {
      const url = query ? `/api/admin/users?q=${encodeURIComponent(query)}` : '/api/admin/users';
      const res = await fetch(url);
      if (!res.ok) {
        setError('목록을 불러오지 못했습니다.');
        setUsers([]);
        return;
      }
      const data = (await res.json()) as { users: UserRow[] };
      setUsers(data.users);
    } catch {
      setError('목록을 불러오지 못했습니다.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(''); }, [load]);

  const fmtDate = (s: string) => {
    // ISO → YYYY-MM-DD (Date 파싱 없이 문자열 슬라이스)
    return s.slice(0, 10);
  };

  return (
    <div style={{ padding: '20px 0' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>사용자 ({users.length})</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="이메일·이름 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') load(q); }}
          style={{ height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 14, minWidth: 220 }}
        />
        <button
          type="button"
          onClick={() => load(q)}
          style={{ height: 38, padding: '0 16px', borderRadius: 8, border: 0, background: '#157a4e', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
        >
          검색
        </button>
      </div>

      {error && <p style={{ color: '#d64545', fontWeight: 600 }}>{error}</p>}
      {loading ? (
        <p style={{ color: '#6b7480' }}>불러오는 중…</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e6e9ef', color: '#6b7480' }}>
                <th style={th}>이메일</th>
                <th style={th}>이름</th>
                <th style={th}>성별</th>
                <th style={th}>전화</th>
                <th style={th}>지역</th>
                <th style={th}>가입일</th>
                <th style={th}>필수동의</th>
                <th style={th}>마케팅</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                  <td style={td}>{u.email ?? '—'}</td>
                  <td style={td}>{u.full_name ?? u.display_name ?? '—'}</td>
                  <td style={td}>{u.gender ? (GENDER_LABEL[u.gender] ?? u.gender) : '—'}</td>
                  <td style={td}>{u.phone ?? '—'}</td>
                  <td style={td}>{u.region ?? '—'}</td>
                  <td style={td}>{fmtDate(u.created_at)}</td>
                  <td style={td}>{hasRequiredConsent(u) ? '✓' : '✗'}</td>
                  <td style={td}>{u.marketing_agreed_at ? '✓' : '—'}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td style={td} colSpan={8}>사용자가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: '8px 10px', fontWeight: 700, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '9px 10px', whiteSpace: 'nowrap' };
```

- [ ] **Step 2: AdminNav에 링크 추가**

`components/admin/AdminNav.tsx`의 `LINKS` 배열에 사용자 링크 추가. 기존:

```tsx
const LINKS = [
  { href: '/admin', label: '전문가' },
  { href: '/admin/categories', label: '카테고리' },
  { href: '/admin/import', label: 'CSV 일괄등록' },
  { href: '/admin/audit', label: '감사·접속' },
];
```

변경:

```tsx
const LINKS = [
  { href: '/admin', label: '전문가' },
  { href: '/admin/users', label: '사용자' },
  { href: '/admin/categories', label: '카테고리' },
  { href: '/admin/import', label: 'CSV 일괄등록' },
  { href: '/admin/audit', label: '감사·접속' },
];
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 4: 커밋**

```bash
git add "app/(admin)/admin/users/page.tsx" components/admin/AdminNav.tsx
git commit -m "feat(admin): 사용자 목록 페이지 + 네비 링크"
```

---

### Task 9: 수동 통합 검증 + 문서 링크

**Files:**
- Modify: `docs/04-report/auth-login-and-domain.report.md` (프로필 수집 완료 추가) — 선택

**Interfaces:** 없음 (검증/문서).

- [ ] **Step 1: 로컬 E2E 수동 확인**

전제: `supabase-profile-fields-setup.sql`를 Supabase SQL Editor에 적용.

`npm run dev` 후:
1. (신규 유저) OAuth 로그인 → `/consent` 도착 → 동의 3개 체크 + 이름·전화·성별·지역 입력 → [동의하고 시작] 활성 확인 → 클릭 → 홈 도달
2. 프로필 일부 비우면 버튼 비활성 확인. 전화 형식 틀리면 안내 표시
3. 로그아웃 후 재로그인 → 이미 완료했으니 `/consent` 건너뜀
4. `/admin`(운영자) 로그인 → nav "사용자" 클릭 → `/admin/users`에서 방금 가입한 사용자의 이름·전화·성별·지역·동의 표시 확인. 검색 동작 확인

- [ ] **Step 2: 커밋 (문서 갱신 시)**

```bash
git add docs/04-report/auth-login-and-domain.report.md
git commit -m "docs(profile): 프로필 수집 + 사용자 조회 완료 기록"
```

---

## Self-Review

**1. Spec coverage:**
- §2 DB 4컬럼 → Task 1 ✓ / created_at 이미 존재 확인 → 스키마 추가 불필요(설계 조건 해소)
- §2 hasCompleteProfile → Task 3 ✓ / UserProfile 확장 → Task 3 ✓
- §3 ConsentForm 프로필 섹션 + 시/도 드롭다운 + 전화검증 + 제출 조건 → Task 5 ✓ / §3 서버 재검증 → Task 4 ✓
- §4 게이트 hasCompleteProfile → Task 6 ✓
- §5 admin API + 페이지 + AdminNav → Task 7,8 ✓
- §6 법적 연계 → 문서(별도 법적 검토 항목), 코드 태스크 아님 — 계획서 범위 밖(설계에 명시)
- §7 엣지케이스(미입력 400/버튼 비활성, 전화형식, 이메일 미제공) → Task 4,5 ✓
- 지역 시/도 17개 → Task 2 ✓

**2. Placeholder scan:** 모든 코드 스텝에 실제 코드. "적절한 처리" 류 없음. ✓

**3. Type consistency:** `hasCompleteProfile(Partial<ProfileFields>)` → Task 6 consentRow(4필드 select), Task 3 정의 일치. `ProfileFields` 필드명(full_name/phone/gender/region) 전 태스크 일치. `isValidPhone` Task 3 정의 → Task 4,5 사용 일치. admin API 반환 `{ users, total }` → Task 8 page에서 `data.users` 사용 일치. `hasRequiredConsent(u)` — u는 UserRow(동의 4필드 포함)라 `Partial<ConsentTimestamps>` 호환. ✓
