# 완료 보고서: 소셜 로그인(구글·카카오) + 로그인/가입/동의 플로우 + 커스텀 도메인

- 상태: **구글 로그인 프로덕션 실동작 / 카카오 보류(비즈앱 전환 대기)**
- 완료일: 2026-07-05
- 프로덕션: https://golgorusos.co.kr (커스텀 도메인), https://golgoru-sos.vercel.app (병존)
- 설계: [2026-07-03-kakao-login-design.md](../superpowers/specs/2026-07-03-kakao-login-design.md)
- 계획: [2026-07-03-kakao-login.md](../superpowers/plans/2026-07-03-kakao-login.md)

이 문서는 카카오 로그인·동의 플로우·도메인 연결 작업의 **완료 기록 SSoT**다.
과거 README에 흩어져 있던 "지금 할 일 / 당신이 할 일" 진행형 안내와 SDD 실행 로그를 여기로 통합했다.

## 1. 구현 범위 (완료)

기존 Supabase OAuth 파이프라인 위에 로그인/가입/동의 4화면 플로우를 얹었다. `proxy.ts`·admin 인증·기존 세션 파이프라인은 무수정.

**신규 파일**
- 라우트: `app/(site)/login`, `app/(site)/signup`, `app/(site)/consent`, `app/api/auth/consent`
- 컴포넌트: `components/auth/OAuthButtons.tsx`, `ConsentForm.tsx`, `WelcomeToast.tsx`, `components/BrandMark.tsx`
- 로직: `lib/auth/consent.ts`(`hasRequiredConsent`)
- DB: `supabase-consent-setup.sql` (profiles 동의 4컬럼, 프로덕션 적용됨)

**수정 파일**
- `lib/auth/startUserLogin.ts` (provider 인자화 + returnTo)
- `components/UserAuthChip.tsx` (로그인 버튼 → `/login`)
- `app/auth/callback/route.ts` (콜백 후 동의 게이트 + 홈 복귀 시 welcome)
- `app/(site)/page.tsx` (WelcomeToast)

**흐름**: `/login`·`/signup` → OAuth → `/auth/callback` → (신규자면 `/consent` 동의 게이트) → 홈 `?welcome=1`. 동의는 필수 3개(이용약관·개인정보 수집·제3자 제공), 재로그인 동의완료자는 게이트 통과.

## 2. 커밋 (17beb1f ~ fc91cf8)

`feature/kakao-login` 브랜치 → main 병합(머지 `0e09196`) → 프로덕션 배포. 주요 커밋:
- 설계/계획: `17beb1f`, `87bfe31`
- 구현: `23d0eb8`(SQL) → `734a545`(헬퍼) → `28fd2cd`(provider) → `70e38df`(버튼) → `9a6be16`(페이지) → `bb85cf9`(API) → `95e778c`(폼) → `5b471f4`(동의페이지) → `1034579`(게이트) → `3a3e12f`(토스트)
- 버그수정: `0571f68`(returnTo 홈 고정), `63ae0c5`(환영토스트/이모지), `a98678b`(로고 SVG)
- 카카오 보류: `fc91cf8`

## 3. 도메인 연결 (완료)

- **`golgorusos.co.kr`** — 가비아 계정 `golgoru1107`에서 DNS 설정
  - A `@` → `76.76.21.21` (Vercel)
  - CNAME `www` → `cname.vercel-dns.com`
- Vercel 프로젝트 golgoru-sos에 두 도메인 추가, `www` → 메인 **307 리다이렉트**
- HTTPS 자동 발급. `golgoru-sos.vercel.app` 기본 도메인도 병존 유지
- Supabase Redirect URLs: `golgorusos.co.kr/**`, `golgoru-sos.vercel.app/**`, `localhost:3000/**` 등록

## 4. 카카오 보류 — KOE205 원인과 해제 조건

**구글은 프로덕션 실동작.** 카카오는 아래 이유로 보류(`OAuthButtons.tsx`의 `KAKAO_ENABLED = false`).

**근본 원인 (systematic-debugging으로 확정)**
- Supabase가 카카오에 `account_email`을 **항상 필수로 요청** (`scope=account_email+profile_image+profile_nickname`, 서버 하드코딩)
- 카카오 앱은 `account_email` **"권한 없음"** (비즈앱/비즈니스 인증 미전환)
- → 카카오가 권한 없는 항목 요청을 거부 → **KOE205**
- 코드 `signInWithOAuth({ scopes })`로는 제거 불가 — supabase-js의 scopes는 기본 scope에 **추가만** 하고 대체하지 않음
- Supabase `Allow users without email` 토글도 요청 scope 자체는 바꾸지 않음

**해제 조건 (다음 세션 재개점)**
1. 카카오 **비즈니스 인증(비즈앱 전환)** — 사업자 정보 입력 + 심사
2. 카카오 콘솔 동의항목에서 `account_email`을 **선택 동의**로 활성화
3. `components/auth/OAuthButtons.tsx`의 `KAKAO_ENABLED = true` 로 변경

**이미 완료된 카카오 설정** (전환만 하면 재사용)
- Supabase Kakao Provider 활성화 + Client ID(`ec968566...`)/Secret 입력됨
- 카카오 콘솔 Redirect URI에 `https://dmyxxnkqyzkvkxvpwild.supabase.co/auth/v1/callback` 등록됨
- 카카오 로그인 활성화 ON, 닉네임 필수 동의 설정됨
- 콘솔 UI 참고: Client Secret·Redirect URI는 [앱 설정 → 플랫폼 키 → REST API 키] 안. 사이트 도메인(Web 플랫폼)은 서버 OAuth라 불필요.

## 5. 남은 숙제

- 카카오 비즈앱 전환 → `KAKAO_ENABLED = true` (위 §4)
- 노출된 카카오 키 재발급 (이전 세션에 터미널/채팅 노출 이력)
- 콜백 게이트는 **콜백 시점 한정** — 세션 유지 중 홈 직접 접근 시 우회 가능. SOS 제출 시점 상시 동의 가드는 후속 과제(설계 §5 비목표)

## 6. 테스트 유저 삭제 (신규 가입 재테스트용)

Supabase 대시보드 Auth → Users에서 직접 삭제 시 `profiles`·`admin_users`는 `on delete cascade`로 자동 삭제. FK(requests/admin_audit) 걸리면 해당 참조를 먼저 null 처리 후 삭제.
