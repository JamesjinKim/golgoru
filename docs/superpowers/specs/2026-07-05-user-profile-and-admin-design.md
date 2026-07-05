# 프로필 수집(가입 시) + 어드민 사용자 조회 설계

- 작성일: 2026-07-05
- 대상: golgoru 사용자 프로필 수집 및 운영자 조회
- 관련: [2026-07-03-kakao-login-design.md](2026-07-03-kakao-login-design.md)(로그인/동의 플로우), [auth-login-and-domain.report.md](../../04-report/auth-login-and-domain.report.md)
- 배경: 소셜 로그인으로 `profiles`에 사용자가 쌓이기 시작했으나 (1) 실명·전화·지역 등 프로필 정보를 수집하지 않고 (2) 운영자가 사용자를 조회할 화면이 없다. 투자자 요청상 사용자 정보 수집이 비즈니스 요구사항.

## 1. 목표와 범위

두 서브 기능을 하나의 설계로 묶되 구현 순서는 A → B.

- **서브 A — 프로필 수집**: OAuth 가입 직후, 동의 화면(`/consent`)에서 실명·전화·성별·지역을 **필수 입력**받아 저장.
- **서브 B — 어드민 사용자 조회**: 운영자가 `/admin/users`에서 사용자 목록을 조회(조회 전용).

### 비목표 (YAGNI)

- 사용자 상세 페이지, role 변경/계정 정지 등 admin 쓰기 액션 — 이번 범위 밖.
- 상담요청(`requests`) 3년 장기저장·이력 표시 — 별도 기능(스키마만 존재, 수집 흐름 미구현).
- 프로필 수정 화면(사용자 본인이 나중에 수정) — 후속 과제.
- 페이지네이션 — 사용자 수가 적어 후순위. 단 `{ list, total }` 반환으로 확장점만 유지.

### 핵심 원칙

기존 패턴을 재사용한다. 프로필 입력은 **새 라우트를 만들지 않고 기존 `/consent` 화면을 확장**한다. admin 조회는 **experts 목록 패턴**(`requireAdmin` + `supabaseAdmin` + TanStack Table)을 그대로 따른다.

## 2. 데이터 모델 (서브 A)

`profiles`에 프로필 컬럼 4개 추가. 신규 SQL 파일, idempotent.

```sql
-- supabase-profile-fields-setup.sql
-- 사전조건: supabase-user-auth.sql (profiles), supabase-consent-setup.sql (동의 컬럼)
alter table profiles
  add column if not exists full_name text,   -- 실명 (display_name=OAuth 닉네임과 별개)
  add column if not exists phone      text,   -- 휴대폰 (010-XXXX-XXXX)
  add column if not exists gender     text,   -- 'male' | 'female' | 'unspecified'
  add column if not exists region     text;   -- 지역 (시/도 + 시/군/구), 지역 기반 전문가 매칭용
```

> 주소는 **전체 주소가 아니라 지역(시/도 + 시/군/구)** 만 수집한다. 목적이 지역 기반 전문가 매칭이라 상세 주소는 불필요하고, 입력 마찰·개인정보 민감도를 낮춘다. 컬럼명은 `region`. 예: "서울특별시 강남구".

- **판정 헬퍼**: `hasCompleteProfile(profile)` — `full_name`, `phone`, `gender`, `region`이 모두 non-empty면 완료. `lib/auth/profileFields.ts`(신규)에 정의.
- `UserProfile` 타입(`lib/auth/profile.ts`)에 4개 필드 추가.
- `created_at`: 정렬/가입일 표시에 필요. `profiles`에 없으면 이 SQL에 `add column if not exists created_at timestamptz default now()` 추가(구현 시 스키마 확인).

## 3. 동의 화면 확장 (서브 A)

기존 `/consent`(`app/(site)/consent/page.tsx` + `components/auth/ConsentForm.tsx`)를 확장한다. 새 라우트 없음.

- `ConsentForm`에 **프로필 입력 섹션** 추가: 이름(text), 전화(text, 010 형식), 성별(라디오 male/female/unspecified), 지역(시/도 + 시/군/구).
- **지역 입력 방식**: 자유 텍스트는 표기 불일치("서울"/"서울시"/"서울특별시")로 매칭이 깨지므로 **드롭다운 2단계**(시/도 선택 → 시/군/구 선택)로 정규화. 시/도·시/군/구 목록은 정적 상수(`lib/constants` 또는 신규 `lib/regions.ts`). 저장은 `region`에 "시/도 시/군/구" 한 문자열로 합쳐 저장(예: "서울특별시 강남구"). 상세 행정동까지는 수집 안 함.
- **[동의하고 시작] 활성 조건**: 기존 `requiredDone`(필수 동의 3개) **AND** 프로필 4개 입력 완료.
- 전화번호 형식 검증: `01[016789]-?\d{3,4}-?\d{4}` 수준의 클라이언트 검증. 실패 시 안내.
- 제출 → `POST /api/auth/consent` 확장: body에 `{ marketing, profile: { full_name, phone, gender, region } }`. 서버가 동의 타임스탬프 + 프로필 필드를 함께 `profiles` update.
- 서버 재검증: API에서 프로필 4개 값이 비어있지 않은지 확인 후 저장(클라이언트 우회 방지). 하나라도 비면 400.

## 4. 게이트 (서브 A)

콜백 게이트(`app/auth/callback/route.ts`)의 판정을 확장.

- 기존: `hasRequiredConsent(consentRow)` false → `/consent`.
- 변경: `hasRequiredConsent(row) && hasCompleteProfile(row)` 둘 다 true여야 통과. 하나라도 미완료면 `/consent`로.
- 한 화면에서 동의+프로필을 모두 받으므로 게이트 목적지는 `/consent` 그대로. 조회 컬럼에 프로필 4개 추가.
- 재로그인 시: 이미 동의·프로필 완료한 유저는 통과(불필요한 재입력 없음).

## 5. 어드민 사용자 조회 (서브 B)

experts 목록 패턴을 그대로 따른다.

**신규 파일**
- `app/api/admin/users/route.ts` — GET. `requireAdmin()` 가드 → `supabaseAdmin.from('profiles').select(...)`. 검색 `?q=` → `email`/`full_name`/`display_name` ilike. `.order('created_at', desc)`. 반환 `{ list, total }`.
- `app/(admin)/admin/users/page.tsx` — client, TanStack Table. 컬럼: 이메일 · 이름(full_name) · 성별 · 전화 · 지역(region) · 가입일 · 필수동의(✓/✗, `hasRequiredConsent` 재사용) · 마케팅(✓/—).

**수정 파일**
- `components/admin/AdminNav.tsx` — `LINKS`에 `{ href: '/admin/users', label: '사용자' }` 추가.

**보안**: `profiles` RLS는 "본인만 조회"라 반드시 서버에서 `supabaseAdmin`(service role) 사용. proxy.ts가 `/admin/*`·`/api/admin/*` 이미 가드 + API가 `requireAdmin()` 재확인(defense in depth). 조회(GET)는 감사 로그 없음(기존 experts GET과 동일).

## 6. 법적 연계 (중요)

이름·전화·지역·성별은 개인정보다. `/consent`의 **"개인정보 수집·이용" 동의 항목이 이 수집 항목을 근거로 커버**해야 한다(개인정보 보호법 제15조: 수집 목적·항목·보유 기간·거부권 고지).

- 동의 문구에 수집 항목(이름·전화·성별·지역)과 목적(전문가 상담 연결·지역 기반 매칭·본인 식별)을 명시해야 함.
- `docs/legal/privacy-consent-v2026-06-26.md` 문구 업데이트 필요.
- **본 설계는 기술 구조를 정의할 뿐, 실제 동의 문구·보유기간의 법적 적정성은 별도 검토(런칭 전 변호사 확인)가 필요하다.**

## 7. 에러 처리 · 엣지 케이스

| 상황 | 처리 |
|---|---|
| 프로필 일부 미입력으로 제출 | 클라이언트: 버튼 비활성. 서버: 400 |
| 전화번호 형식 오류 | 클라이언트 안내, 제출 차단 |
| 카카오 등 이메일 미제공 계정 | email null 허용(기존). full_name은 별도 필수 입력이라 식별 가능 |
| 프로필 입력 화면 이탈 | 세션 유지되나 게이트가 다음 콜백마다 재판정(콜백 시점 한정, 기존 §5 비목표와 동일) |
| Supabase 미설정 | 기존처럼 degrade. consent API 503, admin은 supabaseAdmin lazy proxy로 크래시 없음 |

## 8. 검증

- 게이트: `npx tsc --noEmit`.
- 수동: 신규 유저 OAuth → `/consent`에서 동의+프로필 입력 → 홈. 미입력 시 버튼 비활성 확인. 재로그인 시 `/consent` 건너뜀. `/admin/users`에서 목록·검색·프로필 필드 표시 확인.

## 9. 구현 순서

1. 서브 A: SQL → 헬퍼/타입 → `POST /api/auth/consent` 확장 → `ConsentForm` 프로필 섹션 → 콜백 게이트 확장.
2. 서브 B: `GET /api/admin/users` → `/admin/users` 페이지 → AdminNav.
3. (연계) 동의 문구 업데이트는 법적 검토 항목으로 표시.
