# 카카오 로그인 + 로그인/가입/동의 플로우 설계

- 작성일: 2026-07-03
- 대상: golgoru SOS 사용자(consumer) 인증
- 기준 목업: `골고루SOS-로그인-가입-동의-mockup.html` (2026-07-01 rev 2)
- 관련 문서: `README.md` (카카오 콘솔 설정 1~7단계, 개인정보/제3자 제공 법적 요구)

## 1. 배경과 목표

golgoru의 사용자 로그인은 이미 Supabase Auth의 `signInWithOAuth`로 동작한다.
현재 `UserAuthChip`의 "로그인" 버튼이 곧바로 구글 OAuth를 띄우고,
`app/auth/callback/route.ts`가 세션 교환 + 프로필 upsert를 수행한다.

이 위에 다음을 추가한다.

1. **카카오 로그인** — Supabase Kakao Provider 방식. `signInWithOAuth`의 provider만 `'kakao'`로 지정.
2. **로그인/가입/동의 4화면 플로우** — 목업(①로그인 ②가입 ③동의 ④시작)을 재현.
3. **콜백 후 동의 게이트** — 신규 가입자는 필수 동의(이용약관·개인정보 수집·제3자 제공)를 1회 통과해야 서비스 이용 가능.

### 핵심 원칙

**기존 Supabase OAuth 파이프라인(콜백·세션·프로필 upsert)은 건드리지 않고, 그 위에 UI 4화면과 동의 게이트만 얹는다.**
카카오 추가는 provider 문자열 확장 수준으로 처리하고, `proxy.ts`·admin 인증·profile 매핑은 무수정으로 둔다.

### 비목표 (YAGNI)

- 이메일/비밀번호 자체 로그인 — OAuth(구글/카카오)만.
- 카카오 비즈앱 이메일 심사 — 우선 닉네임만으로 시작(README §87). 이메일 필수화는 별도 과제.
- 카카오 친구/메시지 API (샘플 `dev-node/app.js`의 기능) — 로그인과 무관, 이식하지 않음.

## 2. 전체 흐름

```
[① /login]  카카오/구글 버튼 → signInWithOAuth(provider) → /auth/callback
[② /signup] 카카오/구글로 가입 → (동일 OAuth) → /auth/callback
                                                      │
                                          exchangeCodeForSession
                                          upsertUserProfileFromAuthUser
                                                      │
                                    ┌─────────────────┴──────────────────┐
                              필수 동의 완료?                        미완료(신규)
                                    │                                    │
                              returnTo로 이동                    /consent 로 리다이렉트
                              [④ 시작 화면]                       필수3 체크 → 동의 저장
                                                                        │
                                                                  returnTo로 이동 [④]
```

- **동의 게이트는 OAuth 콜백 성공 이후**에 건다. 구글/카카오 공통. 이메일 미제공·중복가입 등 변수를 콜백 시점에 확인할 수 있어 안전하다.
- 이미 동의한 재로그인 사용자는 게이트를 그냥 통과 → 목업 ①(로그인)의 동작과 일치.
- ④ 시작 화면은 새 화면이 아니라 **기존 홈에 환영 토스트만 얹는다**(`?welcome=1`).

## 3. 라우트 · 컴포넌트 구조

기존 consumer 영역(`app/(site)/`) 아래에 신설한다. proxy matcher(`/`, `/admin/*`) 밖이라 인증 경계에 영향 없음.

### 신규 라우트

| 경로 | 역할 |
|---|---|
| `app/(site)/login/page.tsx` | ① 로그인 — 카카오/구글 버튼 + "가입하기 →" 링크 |
| `app/(site)/signup/page.tsx` | ② 가입 — 카카오로/구글로 가입 + "로그인 →" 링크 |
| `app/(site)/consent/page.tsx` | ③ 동의 게이트 — 필수3 + 선택1, 게이팅 |

④ 시작 화면: 기존 `app/(site)/page.tsx`에 `?welcome=1`일 때 환영 토스트만 표시.

`/login` ↔ `/signup`은 목업의 하단 링크로 상호 이동한다(① "가입하기 →", ② "로그인 →"). 두 화면의 OAuth 버튼은 동일한 `signInWithOAuth`를 호출하며, 신규/기존 여부는 콜백 후 동의 게이트가 판별한다(별도 분기 불필요).

### 신규 컴포넌트

| 파일 | 역할 |
|---|---|
| `components/auth/OAuthButtons.tsx` | 카카오/구글 버튼(목업 스타일 재현). `mode="login"\|"signup"`. `signInWithOAuth` 실패 시 catch하여 "카카오 로그인 준비 중" 안내 |
| `components/auth/ConsentForm.tsx` | 동의 체크박스 4개 + 전체동의 + 게이팅(client). 필수3 미체크 시 [동의하고 시작] disabled |

### 신규 API / 헬퍼 / SQL

| 파일 | 역할 |
|---|---|
| `app/api/auth/consent/route.ts` | `POST` — `supabaseAdmin`으로 동의 타임스탬프 저장 후 결과 반환 |
| `lib/auth/consent.ts` | `hasRequiredConsent(profile)` 판정 헬퍼 |
| `supabase-consent-setup.sql` | `profiles`에 동의 컬럼 4개 추가(idempotent) |

### 기존 파일 수정 (최소)

| 파일 | 변경 |
|---|---|
| `lib/auth/startUserLogin.ts` | provider 인자 추가: `startUserLogin(provider: 'google' \| 'kakao')`. 기본값 유지로 기존 호출부 호환 |
| `components/UserAuthChip.tsx` | 비로그인 상태의 "로그인" 버튼 클릭 → 즉시 OAuth 대신 `router.push('/login')`. 로그인 상태의 칩/로그아웃 동작은 무변경 |
| `app/auth/callback/route.ts` | upsert 직후 `hasRequiredConsent` 확인 → 미완료면 `/consent?returnTo=...`로 리다이렉트 |

### 무수정 (영향 없음 확인)

`proxy.ts`, `lib/admin/auth.ts`, `lib/auth/profile.ts`(`mapAuthUserToProfileRow`), 기존 OAuth 세션 파이프라인, `lib/auth/supabaseServer.ts` / `supabaseBrowser.ts`.

## 4. 동의 데이터 모델

목업 ③의 항목과 README §45~69의 법적 요구(개인정보보호법 제15·17조)를 `profiles`에 저장한다.
항목별 타임스탬프로 분리 — 각 동의의 별도 고지/동의를 감사 로그로 남기기 위함.

```sql
-- supabase-consent-setup.sql (신규, 재실행 안전)
alter table profiles
  add column if not exists terms_agreed_at      timestamptz,  -- (필수) 서비스 이용약관
  add column if not exists privacy_agreed_at    timestamptz,  -- (필수) 개인정보 수집·이용
  add column if not exists thirdparty_agreed_at timestamptz,  -- (필수) 개인정보 제3자 제공
  add column if not exists marketing_agreed_at  timestamptz;  -- (선택) 마케팅 활용·광고 수신
```

- **동의 완료 판정**: 필수 3개(`terms`, `privacy`, `thirdparty`)가 모두 non-null → 완료. `lib/auth/consent.ts`의 `hasRequiredConsent(profile)`로 캡슐화.
- **저장 경로**: `/consent`의 [동의하고 시작] → `POST /api/auth/consent`(선택 항목 체크 여부 전달) → `supabaseAdmin`으로 4개 타임스탬프 업데이트(선택 미동의 시 `marketing_agreed_at`은 null 유지) → returnTo로 리다이렉트.
- **게이트**: `app/auth/callback/route.ts`가 upsert 직후 `hasRequiredConsent` 확인 → 미완료면 `/consent`로.
- 동의 컬럼은 `mapAuthUserToProfileRow`의 upsert 대상에서 제외 → 기존 프로필 로직과 독립.

## 5. 에러 처리 · 엣지 케이스

| 상황 | 처리 |
|---|---|
| 카카오 이메일 미제공 (README §87) | `email` null 허용(이미 nullable). 라벨은 닉네임(`display_name`) — 목업 ④ "김○○"과 일치 |
| Kakao Provider 미설정 상태에서 카카오 버튼 클릭 | `signInWithOAuth`가 에러 → `OAuthButtons`에서 catch → "카카오 로그인 준비 중입니다" 안내. 설정 완료 후 자동 동작 |
| 동의 화면에서 이탈/뒤로 | 세션은 생성됨. 콜백 게이트가 다음 로그인 콜백마다 재판정. 단 이번 범위의 게이트는 **콜백 시점 한정** — 세션 유지 중 직접 홈 접근 시 우회 가능. 실기능(SOS 제출) 시점 상시 가드는 후속 과제(비목표). MVP는 가입 직후 1회 통과로 법적 최소 요건 충족 |
| 이미 동의한 사용자 재로그인 | `hasRequiredConsent` true → `/consent` 건너뜀 |
| `GOLGORU_DATA_SOURCE=mock` / Supabase 미설정 | 기존처럼 조용히 degrade. 동의 API도 config 없으면 no-op |
| OAuth 콜백 실패 | 기존 `/?auth=error` 흐름 재사용 |

## 6. 카카오 콘솔 · Supabase 설정 (사용자 작업 — 미완료)

README §71~104의 1~7단계를 준용. 현재 미완료 상태이며, 코드는 설정 없이 먼저 작성 가능(placeholder 폴백).

1. 카카오 개발자 계정 + 애플리케이션 생성
2. 앱 키 확인 — **REST API 키** = Supabase의 Client ID
3. 보안 → **Client Secret** 생성·활성화
4. 카카오 로그인 활성화 + 동의항목에서 `profile_nickname` 필수 동의
5. Supabase → Authentication → Providers → **Kakao Enable** + 위 두 키 입력 → 표시되는 **Callback URL** 복사
6. 카카오 콘솔 → 카카오 로그인 → **Redirect URI**에 5의 Callback URL 등록
7. 앱 설정 → 플랫폼 → Web → **사이트 도메인** 등록 (개발 `http://localhost:3000`, 배포 도메인)

> 키는 카카오 → Supabase 방향, Callback URL은 Supabase → 카카오 방향(양방향).
> 이메일은 비즈앱 심사 필요 — 우선 닉네임만으로 시작.

## 7. 검증

- 유일한 검증 게이트는 `npx tsc --noEmit` (CLAUDE.md — lint/test runner 없음).
- 각 구현 단계 종료 시 타입체크 통과 확인.
- 콘솔 설정 완료 후 로컬에서 카카오/구글 각각 OAuth → 동의 → 홈 도달 수동 확인.
