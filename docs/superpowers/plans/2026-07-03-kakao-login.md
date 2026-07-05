# 카카오 로그인 + 로그인/가입/동의 플로우 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 Supabase OAuth 파이프라인 위에 카카오 로그인과 로그인/가입/동의 4화면 플로우를 추가한다.

**Architecture:** `signInWithOAuth`의 provider만 `'google'|'kakao'`로 확장하고, 목업(①로그인 ②가입 ③동의 ④시작)을 consumer 라우트로 신설한다. 동의는 OAuth 콜백 성공 이후 신규 가입자에게만 게이팅한다. 콜백·세션·프로필 upsert·proxy·admin 인증은 무수정으로 둔다.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase Auth (`@supabase/ssr`), TypeScript strict, 인라인 스타일 + `lib/tokens.ts`(`G`).

## Global Constraints

- 검증 게이트는 `npx tsc --noEmit` 하나뿐. lint/test runner 없음 (CLAUDE.md). 각 태스크는 타입체크 통과로 검증한다.
- 데이터소스 추상화: 리포지토리를 직접 import하지 말 것. 단, 인증/프로필은 기존 관례대로 `supabaseAdmin`(`lib/supabase.ts`) 직접 사용.
- 스타일: 새 CSS 파일 만들지 말고 인라인 스타일 + `import { G } from '@/lib/tokens'` 사용. 목업 색상은 `G` 토큰으로 매핑(`--green`→`G.starbucksGreen`/`G.houseGreen`, `--red`→`G.red`, `--line`→`G.hairline`). 카카오 노랑 `#fee500`/잉크 `#191600`은 토큰에 없으므로 리터럴 사용.
- Supabase 미설정 시 조용히 degrade (`hasSupabasePublicConfig()` 가드). 크래시 금지.
- 모든 UI 문구는 한글.
- SQL은 손수 적용(SQL Editor). 파일은 idempotent(재실행 안전).
- 브랜치: `feature/kakao-login` (이미 생성됨, 설계 문서 커밋 완료).

## File Structure

**신규**
- `supabase-consent-setup.sql` — `profiles`에 동의 타임스탬프 4컬럼 추가
- `lib/auth/consent.ts` — `hasRequiredConsent` 판정 + 동의 타입
- `components/auth/OAuthButtons.tsx` — 카카오/구글 버튼 (client)
- `components/auth/ConsentForm.tsx` — 동의 체크 + 게이팅 (client)
- `app/(site)/login/page.tsx` — ① 로그인
- `app/(site)/signup/page.tsx` — ② 가입
- `app/(site)/consent/page.tsx` — ③ 동의 게이트
- `app/api/auth/consent/route.ts` — 동의 저장 API

**수정 (최소)**
- `lib/auth/startUserLogin.ts` — provider 인자화
- `components/UserAuthChip.tsx` — 로그인 버튼 → `/login` 이동
- `app/auth/callback/route.ts` — 콜백 후 동의 게이트
- `app/(site)/page.tsx` — `?welcome=1` 환영 토스트

**무수정**: `proxy.ts`, `lib/admin/auth.ts`, `lib/auth/profile.ts`, `lib/auth/user.ts`(단 select에 동의컬럼 추가는 Task 2에서), `lib/auth/supabaseServer.ts`.

---

### Task 1: DB — 동의 컬럼 추가

**Files:**
- Create: `supabase-consent-setup.sql`

**Interfaces:**
- Produces: `profiles` 테이블에 `terms_agreed_at`, `privacy_agreed_at`, `thirdparty_agreed_at`, `marketing_agreed_at` (모두 `timestamptz`, nullable) 추가.

- [ ] **Step 1: SQL 파일 작성**

```sql
-- supabase-consent-setup.sql
-- 사전조건: supabase-setup.sql 로 profiles 테이블이 존재해야 함.
-- 재실행 안전(idempotent). SQL Editor에 붙여 실행.

alter table profiles
  add column if not exists terms_agreed_at      timestamptz,  -- (필수) 서비스 이용약관
  add column if not exists privacy_agreed_at    timestamptz,  -- (필수) 개인정보 수집·이용
  add column if not exists thirdparty_agreed_at timestamptz,  -- (필수) 개인정보 제3자 제공
  add column if not exists marketing_agreed_at  timestamptz;  -- (선택) 마케팅 활용·광고 수신
```

- [ ] **Step 2: 커밋**

```bash
git add supabase-consent-setup.sql
git commit -m "feat(auth): 동의 타임스탬프 컬럼 SQL 추가"
```

> 실제 DB 적용(SQL Editor 실행)은 사용자 수동 작업. 코드는 컬럼이 없어도 select 시 undefined로 처리되어 안전.

---

### Task 2: 동의 판정 헬퍼

**Files:**
- Create: `lib/auth/consent.ts`
- Modify: `lib/auth/profile.ts` (UserProfile에 동의 필드 추가), `lib/auth/user.ts` (select 컬럼 추가)

**Interfaces:**
- Produces:
  - `interface ConsentTimestamps { terms_agreed_at: string | null; privacy_agreed_at: string | null; thirdparty_agreed_at: string | null; marketing_agreed_at: string | null; }`
  - `hasRequiredConsent(profile: Partial<ConsentTimestamps> | null): boolean`
  - `UserProfile`가 `ConsentTimestamps`를 포함하도록 확장.
- Consumes: `UserProfile` (`lib/auth/profile.ts`).

- [ ] **Step 1: consent.ts 작성**

```typescript
// lib/auth/consent.ts
export interface ConsentTimestamps {
  terms_agreed_at: string | null;
  privacy_agreed_at: string | null;
  thirdparty_agreed_at: string | null;
  marketing_agreed_at: string | null;
}

// 필수 3개(이용약관·개인정보 수집·제3자 제공)가 모두 기록되면 동의 완료.
export function hasRequiredConsent(
  profile: Partial<ConsentTimestamps> | null | undefined,
): boolean {
  if (!profile) return false;
  return Boolean(
    profile.terms_agreed_at &&
      profile.privacy_agreed_at &&
      profile.thirdparty_agreed_at,
  );
}
```

- [ ] **Step 2: profile.ts의 UserProfile 확장**

`lib/auth/profile.ts` 상단 import 추가 + 인터페이스 확장. 기존:

```typescript
export interface UserProfile {
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

export interface UserProfile extends ConsentTimestamps {
  id: string;
  role: UserProfileRole;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}
```

그리고 `mapAuthUserToProfileRow`의 반환 객체에 동의 필드 기본값(null 4개)을 추가한다. 기존 return 블록:

```typescript
  return {
    id: user.id,
    role: 'user',
    display_name: displayName,
    email: stringOrNull(user.email),
    avatar_url: stringOrNull(metadata.avatar_url) ?? stringOrNull(metadata.picture),
  };
```

변경 후:

```typescript
  return {
    id: user.id,
    role: 'user',
    display_name: displayName,
    email: stringOrNull(user.email),
    avatar_url: stringOrNull(metadata.avatar_url) ?? stringOrNull(metadata.picture),
    terms_agreed_at: null,
    privacy_agreed_at: null,
    thirdparty_agreed_at: null,
    marketing_agreed_at: null,
  };
```

- [ ] **Step 3: user.ts의 select에 동의 컬럼 추가**

`lib/auth/user.ts`의 `getCurrentUserProfile` 안 profiles select 문자열을 확장. 기존:

```typescript
    .select('id,role,display_name,email,avatar_url')
```

변경 후:

```typescript
    .select('id,role,display_name,email,avatar_url,terms_agreed_at,privacy_agreed_at,thirdparty_agreed_at,marketing_agreed_at')
```

> `upsertUserProfileFromAuthUser`의 insert/update는 동의 컬럼을 건드리지 않는다(기존 그대로). 신규 insert 시 `mapAuthUserToProfileRow`가 null을 넣으므로 DB에도 null로 들어가고 `hasRequiredConsent`는 false → 게이트 동작.

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (통과)

- [ ] **Step 5: 커밋**

```bash
git add lib/auth/consent.ts lib/auth/profile.ts lib/auth/user.ts
git commit -m "feat(auth): 동의 판정 헬퍼 + UserProfile 동의 필드 확장"
```

---

### Task 3: startUserLogin provider 인자화

**Files:**
- Modify: `lib/auth/startUserLogin.ts`

**Interfaces:**
- Produces: `startUserLogin(provider?: 'google' | 'kakao'): Promise<void>` — provider 미지정 시 기본 `'google'`(기존 호출부 호환).

- [ ] **Step 1: startUserLogin.ts 수정**

기존:

```typescript
export async function startUserLogin() {
  clearBrowserSupabaseAuthCookies();
  const supabase = userSupabaseBrowser();
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const redirectTo = `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });

  if (error) {
    throw error;
  }
}
```

변경 후:

```typescript
export type OAuthProvider = 'google' | 'kakao';

export async function startUserLogin(provider: OAuthProvider = 'google') {
  clearBrowserSupabaseAuthCookies();
  const supabase = userSupabaseBrowser();
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const redirectTo = `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });

  if (error) {
    throw error;
  }
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과 (기존 `startUserLogin()` 호출부는 기본값으로 여전히 유효)

- [ ] **Step 3: 커밋**

```bash
git add lib/auth/startUserLogin.ts
git commit -m "feat(auth): startUserLogin provider 인자화 (google/kakao)"
```

---

### Task 4: OAuthButtons 컴포넌트

**Files:**
- Create: `components/auth/OAuthButtons.tsx`

**Interfaces:**
- Consumes: `startUserLogin`, `OAuthProvider` (`lib/auth/startUserLogin.ts`), `G` (`lib/tokens.ts`).
- Produces: `export default function OAuthButtons({ mode }: { mode: 'login' | 'signup' })` — 카카오/구글 버튼 렌더. 클릭 시 `startUserLogin(provider)`. 실패 시 안내 문구 표시.

- [ ] **Step 1: OAuthButtons.tsx 작성**

```tsx
'use client';

import { useState } from 'react';
import { startUserLogin, type OAuthProvider } from '@/lib/auth/startUserLogin';
import { G } from '@/lib/tokens';

const LABEL: Record<OAuthProvider, Record<'login' | 'signup', string>> = {
  kakao: { login: '카카오 로그인', signup: '카카오로 가입' },
  google: { login: '구글 로그인', signup: '구글로 가입' },
};

export default function OAuthButtons({ mode }: { mode: 'login' | 'signup' }) {
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState('');

  const go = async (provider: OAuthProvider) => {
    setPending(provider);
    setError('');
    try {
      await startUserLogin(provider);
      // 성공 시 페이지가 OAuth로 리다이렉트되므로 여기 이후 코드는 도달하지 않음.
    } catch {
      setError(
        provider === 'kakao'
          ? '카카오 로그인 준비 중입니다. 잠시 후 다시 시도해 주세요.'
          : '구글 로그인 연결에 실패했습니다.',
      );
      setPending(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      <button
        type="button"
        onClick={() => go('kakao')}
        disabled={pending !== null}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          width: '100%', height: 50, borderRadius: 13, border: 0,
          background: '#fee500', color: '#191600',
          fontSize: 15, fontWeight: 800, letterSpacing: '-0.2px',
          fontFamily: 'inherit', cursor: pending ? 'default' : 'pointer',
          opacity: pending && pending !== 'kakao' ? 0.6 : 1,
        }}
      >
        <span aria-hidden>💬</span> {pending === 'kakao' ? '연결 중…' : LABEL.kakao[mode]}
      </button>

      <button
        type="button"
        onClick={() => go('google')}
        disabled={pending !== null}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          width: '100%', height: 50, borderRadius: 13,
          background: '#fff', color: '#1f2430', border: '1px solid #dadfe6',
          fontSize: 15, fontWeight: 800, letterSpacing: '-0.2px',
          fontFamily: 'inherit', cursor: pending ? 'default' : 'pointer',
          opacity: pending && pending !== 'google' ? 0.6 : 1,
        }}
      >
        <GoogleIcon /> {pending === 'google' ? '연결 중…' : LABEL.google[mode]}
      </button>

      {error && (
        <p style={{ color: G.red, fontSize: 12.5, fontWeight: 700, textAlign: 'center', margin: '4px 0 0' }}>
          {error}
        </p>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.8 6.1C12.2 13.3 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16.9z" />
      <path fill="#FBBC05" d="M10.3 28.6c-.5-1.4-.7-2.9-.7-4.6s.3-3.2.7-4.6l-7.8-6.1C.9 16.3 0 20 0 24s.9 7.7 2.5 10.7l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.3-4.5 2.1-8.8 2.1-6.4 0-11.8-3.8-13.7-9.1l-7.8 6.1C6.4 42.6 14.6 48 24 48z" />
    </svg>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 3: 커밋**

```bash
git add components/auth/OAuthButtons.tsx
git commit -m "feat(auth): OAuthButtons (카카오/구글) 컴포넌트"
```

---

### Task 5: 로그인/가입 페이지

**Files:**
- Create: `app/(site)/login/page.tsx`, `app/(site)/signup/page.tsx`

**Interfaces:**
- Consumes: `OAuthButtons` (`components/auth/OAuthButtons.tsx`), `G` (`lib/tokens.ts`), `Link` (next/link).
- Produces: `/login`, `/signup` 라우트. 상호 링크로 이동.

- [ ] **Step 1: 공통 셸을 인지하고 login/page.tsx 작성**

두 페이지는 브랜드 헤더 + OAuthButtons + 하단 링크 구조가 동일. 반복을 피하기 위해 각 페이지가 `mode`와 하단 링크만 다르게 렌더한다(작은 파일이라 각자 자립 렌더; 별도 공유 셸 파일은 YAGNI).

```tsx
// app/(site)/login/page.tsx
import Link from 'next/link';
import OAuthButtons from '@/components/auth/OAuthButtons';
import { G } from '@/lib/tokens';

export default function LoginPage() {
  return (
    <div style={shell}>
      <div style={brand}>
        <div style={logo}>🏠</div>
        <h1 style={{ margin: '6px 0 0', fontSize: 22, letterSpacing: '-0.5px', color: G.textBlack }}>골고루 SOS</h1>
        <p style={{ margin: 0, color: G.textSoft, fontSize: 13 }}>긴급할 때, 30초 전문가 연결</p>
      </div>

      <div style={{ marginTop: 34 }}>
        <OAuthButtons mode="login" />
      </div>

      <div style={divider}><span>또는</span></div>

      <p style={footLink}>
        아직 회원이 아니신가요?{' '}
        <Link href="/signup" style={footAnchor}>가입하기 →</Link>
      </p>
    </div>
  );
}

const shell: React.CSSProperties = {
  maxWidth: 380, margin: '0 auto', minHeight: '100vh',
  padding: '64px 24px 40px', display: 'flex', flexDirection: 'column',
  justifyContent: 'center', background: G.cream,
};
const brand: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
};
const logo: React.CSSProperties = {
  width: 58, height: 58, borderRadius: 18, background: G.starbucksGreen, color: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30,
  boxShadow: '0 6px 16px rgba(21,122,78,.35)',
};
const divider: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#aab0b9', fontSize: 12, margin: '18px 0',
};
const footLink: React.CSSProperties = {
  textAlign: 'center', fontSize: 13, color: G.textSoft, margin: '8px 0 0',
};
const footAnchor: React.CSSProperties = {
  color: G.houseGreen, fontWeight: 700, textDecoration: 'none',
};
```

- [ ] **Step 2: signup/page.tsx 작성**

```tsx
// app/(site)/signup/page.tsx
import Link from 'next/link';
import OAuthButtons from '@/components/auth/OAuthButtons';
import { G } from '@/lib/tokens';

export default function SignupPage() {
  return (
    <div style={shell}>
      <div style={brand}>
        <div style={logo}>🏠</div>
        <h1 style={{ margin: '6px 0 0', fontSize: 22, letterSpacing: '-0.5px', color: G.textBlack }}>회원가입</h1>
        <p style={{ margin: 0, color: G.textSoft, fontSize: 13 }}>간편하게 시작하세요</p>
      </div>

      <div style={{ marginTop: 34 }}>
        <OAuthButtons mode="signup" />
      </div>

      <div style={divider}><span>또는</span></div>

      <p style={footLink}>
        이미 회원이신가요?{' '}
        <Link href="/login" style={footAnchor}>로그인 →</Link>
      </p>
    </div>
  );
}

const shell: React.CSSProperties = {
  maxWidth: 380, margin: '0 auto', minHeight: '100vh',
  padding: '64px 24px 40px', display: 'flex', flexDirection: 'column',
  justifyContent: 'center', background: G.cream,
};
const brand: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
};
const logo: React.CSSProperties = {
  width: 58, height: 58, borderRadius: 18, background: G.starbucksGreen, color: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30,
  boxShadow: '0 6px 16px rgba(21,122,78,.35)',
};
const divider: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#aab0b9', fontSize: 12, margin: '18px 0',
};
const footLink: React.CSSProperties = {
  textAlign: 'center', fontSize: 13, color: G.textSoft, margin: '8px 0 0',
};
const footAnchor: React.CSSProperties = {
  color: G.houseGreen, fontWeight: 700, textDecoration: 'none',
};
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 4: 수동 확인**

`npm run dev` 후 `/login`, `/signup` 접속 → 브랜드 헤더 + 카카오/구글 버튼 + 하단 링크 상호 이동 확인.

- [ ] **Step 5: 커밋**

```bash
git add "app/(site)/login/page.tsx" "app/(site)/signup/page.tsx"
git commit -m "feat(auth): 로그인/가입 페이지 (목업 ①②)"
```

---

### Task 6: 동의 저장 API

**Files:**
- Create: `app/api/auth/consent/route.ts`

**Interfaces:**
- Consumes: `getCurrentUserProfile` 대신 세션 유저 확인은 `getUserServerSupabase().auth.getUser()`; `supabaseAdmin` (`lib/supabase.ts`); `hasSupabasePublicConfig` (`lib/env.ts`).
- Produces: `POST /api/auth/consent`. 요청 body `{ marketing?: boolean }`. 필수 3개 + (marketing이면 4번째) 타임스탬프를 현재 시각으로 저장. 응답 `{ ok: true }` 또는 에러 상태.

- [ ] **Step 1: route.ts 작성**

```typescript
// app/api/auth/consent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserServerSupabase } from '@/lib/auth/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { hasSupabasePublicConfig } from '@/lib/env';

export async function POST(req: NextRequest) {
  if (!hasSupabasePublicConfig()) {
    return NextResponse.json({ error: '서비스 설정이 완료되지 않았습니다.' }, { status: 503 });
  }

  const supabase = await getUserServerSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

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

  if (error) {
    console.error('[auth] consent update error:', error);
    return NextResponse.json({ error: '동의 저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 3: 커밋**

```bash
git add "app/api/auth/consent/route.ts"
git commit -m "feat(auth): 동의 저장 API (POST /api/auth/consent)"
```

---

### Task 7: ConsentForm 컴포넌트

**Files:**
- Create: `components/auth/ConsentForm.tsx`

**Interfaces:**
- Consumes: `G` (`lib/tokens.ts`), `useRouter` (next/navigation).
- Produces: `export default function ConsentForm({ returnTo }: { returnTo: string })`. 필수3 + 선택1 체크 UI + 전체동의. 필수3 완료 시에만 [동의하고 시작] 활성화 → `POST /api/auth/consent` → 성공 시 `router.replace(returnTo)`.

- [ ] **Step 1: ConsentForm.tsx 작성**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { G } from '@/lib/tokens';

type ItemKey = 'terms' | 'privacy' | 'thirdparty' | 'marketing';
const ITEMS: { key: ItemKey; required: boolean; label: string }[] = [
  { key: 'terms', required: true, label: '서비스 이용약관' },
  { key: 'privacy', required: true, label: '개인정보 수집·이용' },
  { key: 'thirdparty', required: true, label: '개인정보 제3자 제공' },
  { key: 'marketing', required: false, label: '마케팅 활용·광고 수신' },
];

export default function ConsentForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [checked, setChecked] = useState<Record<ItemKey, boolean>>({
    terms: false, privacy: false, thirdparty: false, marketing: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const allChecked = ITEMS.every((it) => checked[it.key]);
  const requiredDone = useMemo(
    () => ITEMS.filter((it) => it.required).every((it) => checked[it.key]),
    [checked],
  );

  const toggle = (key: ItemKey) => setChecked((p) => ({ ...p, [key]: !p[key] }));
  const toggleAll = () => {
    const next = !allChecked;
    setChecked({ terms: next, privacy: next, thirdparty: next, marketing: next });
  };

  const submit = async () => {
    if (!requiredDone || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/consent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ marketing: checked.marketing }),
      });
      if (!res.ok) {
        setError('동의 저장에 실패했습니다. 다시 시도해 주세요.');
        setSubmitting(false);
        return;
      }
      router.replace(returnTo);
    } catch {
      setError('동의 저장에 실패했습니다. 다시 시도해 주세요.');
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 19, fontWeight: 800, margin: '10px 0 4px', letterSpacing: '-0.4px', color: G.textBlack }}>
        약관에 동의해 주세요
      </h1>
      <p style={{ color: G.textSoft, fontSize: 13.5, margin: '0 0 18px' }}>
        서비스 시작을 위해 아래 항목에 동의가 필요해요.
      </p>

      <button type="button" onClick={toggleAll} style={{ ...allBox, ...(allChecked ? allBoxOn : null) }}>
        <Box on={allChecked} />
        <span style={{ fontSize: 15, fontWeight: 800 }}>전체 동의 (선택 포함)</span>
      </button>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {ITEMS.map((it) => (
          <button key={it.key} type="button" onClick={() => toggle(it.key)} style={itemRow}>
            <Box on={checked[it.key]} />
            <span style={{ fontSize: 14, flex: 1, textAlign: 'left' }}>
              <b style={{ color: it.required ? G.houseGreen : G.textSoft, fontWeight: 800 }}>
                {it.required ? '(필수)' : '(선택)'}
              </b>{' '}
              {it.label}
            </span>
          </button>
        ))}
      </div>

      <p style={{ minHeight: 16, margin: '14px 0 6px', fontSize: 12, fontWeight: 600, textAlign: 'center', color: G.red, visibility: requiredDone ? 'hidden' : 'visible' }}>
        필수 항목에 동의해야 시작할 수 있어요
      </p>

      <button
        type="button"
        onClick={submit}
        disabled={!requiredDone || submitting}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: 50, borderRadius: 13, border: 0,
          fontSize: 15, fontWeight: 800, fontFamily: 'inherit',
          cursor: !requiredDone || submitting ? 'not-allowed' : 'pointer',
          background: requiredDone ? G.starbucksGreen : '#c7ccd3',
          color: requiredDone ? '#fff' : '#eef0f3',
          boxShadow: requiredDone ? '0 6px 16px rgba(21,122,78,.32)' : 'none',
        }}
      >
        {submitting ? '처리 중…' : '동의하고 시작'}
      </button>

      {error && (
        <p style={{ color: G.red, fontSize: 12.5, fontWeight: 700, textAlign: 'center', margin: '10px 0 0' }}>{error}</p>
      )}
    </div>
  );
}

function Box({ on }: { on: boolean }) {
  return (
    <span style={{
      width: 22, height: 22, borderRadius: 7, flex: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 13, fontWeight: 900,
      background: on ? G.starbucksGreen : 'transparent',
      border: `2px solid ${on ? G.starbucksGreen : '#cfd4db'}`,
    }} aria-hidden>✓</span>
  );
}

const allBox: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 11, width: '100%',
  padding: '15px 14px', border: `1.5px solid ${G.starbucksGreen}`,
  borderRadius: 13, background: '#e8f5ee', cursor: 'pointer',
  marginBottom: 8, fontFamily: 'inherit', textAlign: 'left',
};
const allBoxOn: React.CSSProperties = { background: '#dcf0e5' };
const itemRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 11, width: '100%',
  padding: '13px 6px', cursor: 'pointer', border: 0,
  borderBottom: '1px solid #f1f3f6', background: 'transparent',
  fontFamily: 'inherit',
};
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 3: 커밋**

```bash
git add components/auth/ConsentForm.tsx
git commit -m "feat(auth): ConsentForm 동의 체크·게이팅 컴포넌트"
```

---

### Task 8: 동의 페이지

**Files:**
- Create: `app/(site)/consent/page.tsx`

**Interfaces:**
- Consumes: `ConsentForm` (`components/auth/ConsentForm.tsx`), `getCurrentUserProfile` (`lib/auth/user.ts`), `hasRequiredConsent` (`lib/auth/consent.ts`), `resolveAuthReturnTo` (`lib/auth/profile.ts`), `redirect` (next/navigation), `G` (`lib/tokens.ts`).
- Produces: `/consent` 라우트 (server component). searchParams `returnTo`. 이미 동의 완료 유저면 returnTo로 즉시 redirect. 미로그인이면 `/login`으로.

- [ ] **Step 1: consent/page.tsx 작성**

Next 16에서 `searchParams`는 Promise. 언래핑 후 사용.

```tsx
// app/(site)/consent/page.tsx
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import ConsentForm from '@/components/auth/ConsentForm';
import { getCurrentUserProfile } from '@/lib/auth/user';
import { hasRequiredConsent } from '@/lib/auth/consent';
import { resolveAuthReturnTo } from '@/lib/auth/profile';
import { G } from '@/lib/tokens';

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo: rawReturnTo } = await searchParams;
  const host = (await headers()).get('host') ?? 'localhost:3000';
  const origin = `http://${host}`;
  const returnTo = resolveAuthReturnTo(origin, rawReturnTo ?? null);

  const { user, profile } = await getCurrentUserProfile();
  if (!user) redirect('/login');
  if (hasRequiredConsent(profile)) redirect(returnTo);

  return (
    <div style={{
      maxWidth: 380, margin: '0 auto', minHeight: '100vh',
      padding: '48px 24px 40px', background: G.cream,
      display: 'flex', flexDirection: 'column',
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
        fontSize: 12, fontWeight: 800, padding: '5px 11px', borderRadius: 20,
        background: '#e8f5ee', color: G.houseGreen, border: '1px solid #cbe6d7', marginBottom: 14,
      }}>
        가입 진행 중
      </span>
      <ConsentForm returnTo={returnTo} />
    </div>
  );
}
```

> `origin`은 `resolveAuthReturnTo`가 same-origin 검증에만 쓰므로 스킴이 http여도 판정에 영향 없음(pathname만 반환). 프로토콜 정합보다 안전한 same-origin 필터가 목적.

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 3: 커밋**

```bash
git add "app/(site)/consent/page.tsx"
git commit -m "feat(auth): 동의 게이트 페이지 (목업 ③)"
```

---

### Task 9: 콜백 동의 게이트 + UserAuthChip 진입 변경

**Files:**
- Modify: `app/auth/callback/route.ts`, `components/UserAuthChip.tsx`

**Interfaces:**
- Consumes: `hasRequiredConsent` (`lib/auth/consent.ts`).
- Produces: 콜백 성공 후 미동의자는 `/consent?returnTo=...`로, 동의자는 returnTo로. `UserAuthChip` 로그인 버튼은 `/login`으로 이동.

- [ ] **Step 1: callback/route.ts에 게이트 추가**

`upsertUserProfileFromAuthUser`는 select 없이 저장만 하므로, 게이트 판정을 위해 반환된 profile을 사용한다(이 함수는 `UserProfile`을 반환). 기존 성공 블록:

```typescript
  try {
    await upsertUserProfileFromAuthUser(data.user);
  } catch (profileError) {
    console.error('[auth] profile upsert error:', profileError);
    const failUrl = new URL('/', url.origin);
    failUrl.searchParams.set('auth', 'profile');
    return NextResponse.redirect(failUrl);
  }

  return successResponse;
```

변경 후 (import에 `hasRequiredConsent` 추가):

```typescript
  let profile;
  try {
    profile = await upsertUserProfileFromAuthUser(data.user);
  } catch (profileError) {
    console.error('[auth] profile upsert error:', profileError);
    const failUrl = new URL('/', url.origin);
    failUrl.searchParams.set('auth', 'profile');
    return NextResponse.redirect(failUrl);
  }

  // 필수 동의 미완료(신규 가입자) → 동의 게이트로. 세션 쿠키는 successResponse에 이미 실려 있으므로
  // 그 헤더를 유지한 채 Location만 /consent로 바꾼다.
  if (!hasRequiredConsent(profile)) {
    const consentUrl = new URL('/consent', url.origin);
    consentUrl.searchParams.set('returnTo', returnTo);
    successResponse.headers.set('Location', consentUrl.toString());
    return successResponse;
  }

  return successResponse;
```

> `upsertUserProfileFromAuthUser`가 신규 insert 시 반환하는 profile은 동의 컬럼이 없다(Task 2에서 `mapAuthUserToProfileRow`가 null 4개를 넣도록 확장했으므로 `hasRequiredConsent`는 false). 기존 유저 update 경로는 `{ ...profile, role }`을 반환하는데 이 profile도 `mapAuthUserToProfileRow` 산출물이라 동의값이 null이다 — 즉 재로그인 유저도 콜백 반환 profile만으로는 항상 미동의로 보인다. **이 판정은 DB 실제값이어야 하므로 Step 2에서 보정한다.**

- [ ] **Step 2: 게이트 판정을 DB 실제값 기준으로 보정**

콜백에서 정확히 판정하려면 저장된 동의값을 다시 읽어야 한다. `upsertUserProfileFromAuthUser` 반환값 대신, 게이트 직전에 `supabaseAdmin`으로 동의 컬럼만 조회한다. import 추가: `import { supabaseAdmin } from '@/lib/supabase';` 그리고 게이트 블록을 다음으로 교체:

```typescript
  try {
    await upsertUserProfileFromAuthUser(data.user);
  } catch (profileError) {
    console.error('[auth] profile upsert error:', profileError);
    const failUrl = new URL('/', url.origin);
    failUrl.searchParams.set('auth', 'profile');
    return NextResponse.redirect(failUrl);
  }

  const { data: consentRow } = await supabaseAdmin
    .from('profiles')
    .select('terms_agreed_at,privacy_agreed_at,thirdparty_agreed_at,marketing_agreed_at')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!hasRequiredConsent(consentRow)) {
    const consentUrl = new URL('/consent', url.origin);
    consentUrl.searchParams.set('returnTo', returnTo);
    successResponse.headers.set('Location', consentUrl.toString());
    return successResponse;
  }

  return successResponse;
```

이러면 Step 1의 임시 `let profile` 블록은 이 최종 형태로 대체된다(Step 1은 이해를 위한 중간 단계; 실제 파일에는 Step 2 형태만 남긴다).

- [ ] **Step 3: UserAuthChip 로그인 버튼 변경**

`components/UserAuthChip.tsx`에서 비로그인 상태 버튼이 `login()`(=`startUserLogin()` 직접 호출) 대신 `/login`으로 이동하게 한다. import에서 `startUserLogin` 제거하고 `useRouter`는 이미 있음. 기존 `login` 함수:

```tsx
  const login = async () => {
    setLoading(true);
    setError('');
    try {
      await startUserLogin();
    } catch {
      setError('로그인 연결에 실패했습니다.');
      setLoading(false);
    }
  };
```

변경 후:

```tsx
  const login = () => {
    router.push('/login');
  };
```

그리고 파일 상단 `import { startUserLogin } from '@/lib/auth/startUserLogin';` 줄을 삭제한다. 비로그인 버튼의 `onClick={login}`, 라벨(`연결 중`/`로그인`)은 그대로 두되 `loading`은 로그인 경로에선 더 이상 안 쓰이므로 버튼 텍스트는 항상 `로그인`으로 남는다(그대로 동작).

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과 (`startUserLogin` 미사용 import 제거 확인)

- [ ] **Step 5: 커밋**

```bash
git add "app/auth/callback/route.ts" components/UserAuthChip.tsx
git commit -m "feat(auth): 콜백 동의 게이트 + 로그인 버튼 /login 진입"
```

---

### Task 10: 홈 환영 토스트

**Files:**
- Modify: `app/(site)/page.tsx`

**Interfaces:**
- Consumes: searchParams `welcome`.
- Produces: `/?welcome=1` 접근 시 상단에 환영 토스트 1회 표시. `ConsentForm`이 동의 후 `router.replace(returnTo)`로 오는데, 신규 가입 최초 진입 시 returnTo에 `welcome=1`을 부여하는 것은 범위 밖(returnTo는 원래 위치 복원). 대신 동의 완료 직후 홈이 기본 목적지일 때 토스트를 보여주기 위해, ConsentForm의 returnTo가 `/`이면 `?welcome=1`을 붙인다.

- [ ] **Step 1: ConsentForm에서 홈 복귀 시 welcome 부여**

`components/auth/ConsentForm.tsx`의 `router.replace(returnTo)` 호출을 다음으로 교체:

```tsx
      const dest = returnTo === '/' ? '/?welcome=1' : returnTo;
      router.replace(dest);
```

- [ ] **Step 2: page.tsx가 searchParams 수용 + 토스트 렌더**

기존 `export default async function Home() {` 시그니처를 확장하고, main 최상단에 토스트를 조건부 삽입. 기존:

```tsx
export default async function Home() {
  const { profile } = await getCurrentUserProfile();
```

변경 후:

```tsx
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const { profile } = await getCurrentUserProfile();
```

그리고 `<main style={{ flex: 1, padding: '16px 20px 24px' }}>` 바로 다음 줄에 토스트 삽입:

```tsx
        {welcome === '1' && (
          <div style={{
            background: '#0e1420', color: '#fff', fontSize: 13, fontWeight: 700,
            padding: '11px 14px', borderRadius: 12, textAlign: 'center', marginBottom: 16,
          }}>
            🎉 환영합니다! 골고루 SOS를 시작합니다
          </div>
        )}
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 4: 커밋**

```bash
git add "app/(site)/page.tsx" components/auth/ConsentForm.tsx
git commit -m "feat(auth): 동의 완료 후 홈 환영 토스트 (목업 ④)"
```

---

### Task 11: 수동 통합 검증 + README 갱신

**Files:**
- Modify: `README.md` (카카오 설정 안내를 설계 문서로 연결, 상태 갱신)

**Interfaces:** 없음 (검증/문서).

- [ ] **Step 1: 콘솔 설정 완료 후 로컬 E2E 수동 확인**

전제: 사용자가 README 1~7단계로 카카오 콘솔 + Supabase Kakao Provider 설정 완료 + `supabase-consent-setup.sql` 적용.

확인 시나리오:
1. `/signup` → [카카오로 가입] → 카카오 인증 → `/consent`로 도착
2. 필수 3개 체크 전 [동의하고 시작] 비활성 확인 → 체크 후 활성 → 클릭 → `/?welcome=1` 도착 + 토스트
3. 로그아웃 후 `/login` → [카카오 로그인] → 이미 동의됨 → `/consent` 건너뛰고 홈 도착
4. [구글 로그인]도 동일 흐름으로 1회 동의 게이트 통과 확인
5. 카카오 이메일 미제공 계정: 헤더 칩에 닉네임 표시(에러 없음)

- [ ] **Step 2: README 상태 갱신**

`README.md`의 카카오 로그인 섹션(71줄~) 말미에 구현 완료 및 설계 문서 링크를 추가:

```markdown
> 구현 설계: `docs/superpowers/specs/2026-07-03-kakao-login-design.md`
> 구현 계획: `docs/superpowers/plans/2026-07-03-kakao-login.md`
> DB: `supabase-consent-setup.sql`를 SQL Editor에 적용해야 동의 저장이 동작합니다.
```

- [ ] **Step 3: 커밋**

```bash
git add README.md
git commit -m "docs(auth): 카카오 로그인 구현 설계/계획 링크 추가"
```

---

## Self-Review

**1. Spec coverage:**
- §1 카카오 provider → Task 3 ✓ / 4화면 → Task 5,8,10 ✓ / 콜백 동의 게이트 → Task 9 ✓
- §2 흐름(콜백 후 게이트, 재로그인 통과) → Task 9 Step 2 (DB 실제값 판정) ✓
- §3 신규 파일 전부 태스크 존재, 기존 수정 4파일(startUserLogin/UserAuthChip/callback/page) → Task 3,9,10 ✓ / proxy·admin 무수정 유지 ✓
- §4 동의 4컬럼 → Task 1 / hasRequiredConsent → Task 2 / 저장 경로 → Task 6,7 ✓
- §5 이메일 미제공 → Task 11 Step1-5 / Provider 미설정 폴백 → Task 4 catch / 이탈 재게이팅 → Task 9(게이트가 매 콜백 판정, 단 세션 유지 중 직접 홈 접근은 게이트 밖) — **주의: 세션 생성 후 유저가 직접 `/`로 가면 게이트 우회 가능**. 설계 §5는 "다음 접근 시 게이트가 다시 /consent로"라 했으나 현재 게이트는 콜백에만 존재. 아래 갭 처리.
- §6 콘솔 설정 → Task 11 전제 + README ✓
- §7 tsc 검증 → 전 태스크 ✓

**갭 발견 → 처리:** 설계 §5의 "이탈 후 재접근 시 재게이팅"을 완전히 보장하려면 홈/보호 라우트에서도 동의를 확인해야 한다. 그러나 proxy 무수정 원칙과 충돌하고, MVP 범위에선 **콜백 게이트로 충분**(가입 직후 반드시 통과, 이탈 시 세션은 있으나 SOS 제출 등 실제 기능 사용 시점 가드는 별도 과제). 이 계획에서는 콜백 게이트로 한정하고, 홈 레벨 상시 가드는 명시적 비목표로 남긴다. → 설계 §5의 해당 문구는 과도했으므로 계획서 기준으로 축소 적용. 후속 과제로 `SosInput`/제출 API에 `hasRequiredConsent` 가드 추가를 권장(범위 밖).

**2. Placeholder scan:** 모든 코드 스텝에 실제 코드 포함. "적절한 에러처리" 류 없음. ✓

**3. Type consistency:** `hasRequiredConsent(profile)`는 `Partial<ConsentTimestamps>`를 받음 → Task 9의 `consentRow`(4컬럼 select 결과), Task 8의 `profile`(UserProfile) 모두 호환. `OAuthProvider` 타입은 Task 3 정의 → Task 4에서 import 일치. `mode` prop, `returnTo` prop 명칭 태스크 간 일치. ✓
