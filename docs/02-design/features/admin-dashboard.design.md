---
template: design
version: 1.2
feature: admin-dashboard
date: 2026-05-19
author: Kim KJ
project: golgoru-sos
version_project: 0.1.0
---

# admin-dashboard Design Document

> **Summary**: 소비자 SOS 앱과 **소스·라우트·인증·스타일이 격리된** 운영자 어드민. shadcn/ui + TanStack Table + Supabase(Auth/Postgres/RLS). 전문가 CRUD + CSV 일괄 업로드 + 역할/감사.
>
> **Project**: golgoru-sos · **Version**: 0.1.0 · **Author**: Kim KJ · **Date**: 2026-05-19 · **Status**: Draft
> **Planning Doc**: [admin-dashboard.plan.md](../../01-plan/features/admin-dashboard.plan.md) (v0.3). 상위 맥락 [golgoru-sos.plan.md](../../01-plan/features/golgoru-sos.plan.md)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 Schema | 본 문서 §3 | ✅ |
| Phase 2 Convention | 본 문서 §10 + plan §6.4 | ✅ |

---

## 0. 확정 결정 (Plan에서 인계)

| # | 결정 |
|---|------|
| D-04 | 어드민 UI = **shadcn/ui + TanStack Table** (+ react-hook-form + zod) |
| 인증 | **Supabase Auth** (operator 이메일/비번), 역할 RBAC |
| DB | **Supabase Postgres + RLS** |
| 소스 분리 | **인앱 라우트 그룹** (`app/(admin)/`), 인프라 분리 없음 (plan §6.4) |
| 시각화 | 없음 (Phase 2) |

---

## 1. Overview

### 1.1 Design Goals

- 어드민을 소비자 앱과 **물리적·논리적으로 격리**(라우트/코드/인증/스타일) — 소비자 회귀 0
- 전문가 CRUD + **CSV 일괄 업로드**(검증·미리보기·부분성공)
- Supabase Auth 기반 역할(super_admin/operator) + 관리 행위 감사
- 기존 무Tailwind·인라인스타일 소비자 앱을 **건드리지 않고** shadcn(Tailwind) 도입

### 1.2 Design Principles

- 분리 우선: 어드민 산출물은 전부 `*/admin/*` 경계 안
- 최소 의존: shadcn(복붙)·TanStack·zod·CSV 파서만. 프레임워크 락인 없음
- 서버 신뢰 경계: 인증·검증·일괄 insert는 서버(Route Handler)에서, service role 키 서버 전용
- 데이터 품질: 잘못된 `vertical`·연락처는 SOS 오라우팅 유발 → 강검증

---

## 2. Architecture

### 2.1 Component Diagram

```
┌───────────────────────── app/ (Next 16 App Router) ─────────────────────────┐
│                                                                              │
│  app/layout.tsx (소비자 루트, 인라인스타일 — 변경 없음)                          │
│   ├ app/page.tsx /result /expert ...   (공개, 무로그인)                        │
│   └ app/api/classify · api/experts     (공개)                                 │
│                                                                              │
│  app/(admin)/layout.tsx  ← 여기서만 admin.css(Tailwind+shadcn) import          │
│   ├ app/(admin)/admin/login                                                   │
│   ├ app/(admin)/admin            (전문가 목록·CRUD)                            │
│   ├ app/(admin)/admin/import     (CSV 업로드 마법사)                           │
│   └ app/(admin)/admin/audit      (감사·접속 로그)                              │
│  app/api/admin/**  (전부 인증 가드)                                            │
│                                                                              │
│  proxy.ts  matcher=['/admin/:path*','/api/admin/:path*'] → 세션 검증      │
│                                                                              │
│  components/admin/*   lib/admin/* (queries·auth·csv·audit)                     │
└──────────────────────────────────────────────────────────────────────────────┘
                       │ supabaseAdmin (service role, 서버)
                       ▼
        Supabase: experts · admin_users · audit_log  (+ RLS)
```

### 2.2 Data Flow

**CRUD**: 어드민 화면 → `/api/admin/experts` (미들웨어 인증 통과) → `lib/admin/experts.ts` → supabaseAdmin → audit_log 적재 → 응답.

**CSV 일괄 업로드 (2-step)**:
```
[템플릿 다운로드] GET /api/admin/experts/template  → CSV 첨부

[1) 검증]  파일 선택 → POST /api/admin/experts/import?mode=validate (multipart)
   서버: 파싱 → 행별 zod 검증 → { validRows[], errors[{row,field,message}] } 반환
   화면: 정상/오류 행 미리보기 (오류는 사유 표시, 커밋 제외)

[2) 커밋]  운영자 확인 → POST /api/admin/experts/import?mode=commit (검증 통과분만)
   서버: supabaseAdmin 일괄 insert(부분성공) → 결과요약 + audit_log 1건 → 응답
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `app/(admin)/layout.tsx` | `admin.css`(Tailwind v4+shadcn tokens) | 어드민 한정 스타일 |
| `components/admin/*` | shadcn/ui, @tanstack/react-table, react-hook-form, zod | UI·테이블·폼·검증 |
| `lib/admin/auth.ts` | `@supabase/ssr` | 세션·역할 |
| `lib/admin/csv.ts` | CSV 파서(papaparse) (xlsx: SheetJS, 선택) | 파싱·정규화 |
| `lib/admin/experts.ts` `audit.ts` | `lib/supabase.ts`(supabaseAdmin) | 영속·감사 |
| `proxy.ts` | `@supabase/ssr` | 라우트 인증 경계 |

신규 npm: `@supabase/ssr`, `tailwindcss@4`, shadcn 관련(Radix), `@tanstack/react-table`, `react-hook-form`, `zod`, `papaparse`. (`xlsx`는 FR-11, Low — 차순위)

### 2.4 소스 분리 구조 (plan §6.4 구체화) ⭐ — 멀티 root 채택 (v0.3)

- **멀티 root 레이아웃**: 소비자=`app/(site)/`(layout+globals.css+page/result/expert), 어드민=`app/(admin)/`(독립 layout). 최상위 `app/layout.tsx` 없음. **URL 불변**(라우트 그룹은 경로 미포함: `/`,`/result`,`/expert`,`/admin*` 그대로).
- 어드민은 `app/(admin)/layout.tsx`가 자체 `<html><body class="admin-root">` 보유 + admin.css import + 데스크톱 반응형 셸(`max-w-screen-2xl`).
- 기존 `app/admin/page.tsx`(mock+단순비번) 제거 → `app/(admin)/admin/*`.
- 코드: `components/admin/`, `lib/admin/`, `app/api/admin/**`. 공유는 `lib/types.ts`만.
- **결정 변경 이유**: 단일 root 유지 시 (a) 소비자 모바일셸(`maxWidth:430`)·globals reset이 어드민에 강제 적용돼 데스크톱 어드민 불가, (b) C-1(스타일 누수) 미해결. 멀티 root가 둘 다 근본 해결(소비자 이동은 라우트 그룹이라 URL·동작 무변경, 회귀 0 검증됨).

### 2.5 Tailwind 격리 — 멀티 root 로 해결 (v0.3, C-1 종결)

- **최종 결정**: §2.4 멀티 root 채택으로 소비자/어드민이 **별도 `<html>` 문서** → 그룹 간 이동은 풀 리로드(Next route-groups 동작) → admin.css(표준 `@import 'tailwindcss'`, preflight 포함)가 소비자로 **누수 불가**. preflight-off 같은 우회 불필요.
- Tailwind v4: 부분 import는 `@source` 누락 시 유틸리티 0개 생성 버그 → 표준 `@import 'tailwindcss'` + `@source '../app/(admin)'`,`'../components/admin'`로 확정.
- **검증(런타임 확인됨)**: 소비자 CSS 청크에 tailwind/`--tw-` 0건, 어드민 청크에 유틸리티 생성·로드. 소비자 `/`·`/result`·`/api/classify` 회귀 0.

#### (구) 2.5 단일 root 가정 — 폐기 (참고)

- **문제(정정)**: "admin.css를 `(admin)/layout.tsx`에만 import하면 소비자 무영향"은 **거짓**. 근거: `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md` — *Next.js는 라우트 이동 시 스타일시트를 언마운트하지 않음(conflicts 가능)*. 본 앱의 소비자/어드민은 **단일 root `app/layout.tsx` 공유**(`(admin)/layout.tsx`는 중첩 레이아웃). 따라서 `/admin` 방문 후 클라이언트 네비게이션으로 `/`·`/result` 이동 시 Tailwind preflight(전역 `*` reset)가 잔존 → 인라인스타일 소비자 페이지가 깨질 수 있음. `app/globals.css`는 이미 전역 `*` reset·`:root` 토큰·`body` 스타일 보유 → 충돌면 실재.
- **결정 (확정, "필요 시" → 필수)**: **Tailwind preflight(전역 base reset) 전역 적용 금지 + 어드민 컨테이너 스코프.**
  - Tailwind v4 설정에서 base/preflight 레이어를 전역에 방출하지 않음(preflight 비활성). 소비자 전역 CSS(`app/globals.css`) 불변.
  - 어드민 전용 reset·shadcn CSS 변수·base는 **`.admin-root` 래퍼 셀렉터 하위로만** 스코프(`@layer`/셀렉터 한정). `app/(admin)/layout.tsx`가 `<div className="admin-root">`로 감싸고 그 안에서만 shadcn 토큰·base 유효.
  - 유틸리티 클래스는 전역 클래스명이라 무해(소비자가 그 클래스를 안 씀). 위험은 **base reset 누수뿐**이므로 그것만 차단하면 충분.
- **대안(문서화, 미채택)**: 멀티 root layout(`(site)`/`(admin)` 각각 root) — 그룹 간 풀 리로드로 CSS 드롭 보장(`route-groups.md` 근거)이나, 소비자 페이지를 `(site)`로 **이동 리팩터링** 필요 → 방금 배포된 소비자 앱 회귀 위험 재유입(§2.4와 충돌). 향후 어드민 비중 커지면 재검토.
- **검증 포인트(§8)**: 배포 정적 비교뿐 아니라 **(필수) `/admin` 진입 → 클라이언트 네비게이션으로 `/`·`/result`·`/expert` 이동 후 시각·레이아웃 회귀 0**(SPA 네비 케이스), 소비자 번들에 admin/tailwind 청크 미포함.
- 호환: Next 16 + React 19 — shadcn(Radix)·TanStack Table v8 React 19 지원은 설치 시 빌드 게이트로 실검증(§11.2 step2, §12 Non-blocker).

### 2.6 인증 경계 (Next 16 proxy 규칙)

`proxy.ts` matcher `['/admin/:path*', '/api/admin/:path*']`:
- 세션 없음 + 페이지 → `/admin/login` 리다이렉트
- 세션 없음 + `/api/admin/*` → 401 JSON
- 세션 있음 → `admin_users`의 role 확인(서버 핸들러에서 권한 분기, 예: 삭제는 super_admin)
- 소비자 라우트는 matcher 밖 → 영향 없음

---

## 3. Data Model

### 3.1 experts (기존, 재사용)

`supabase-setup.sql`의 `experts` 사용. 변경: 없음(스키마), 단 RLS 정책 추가(§3.4).

### 3.2 admin_users (신규)

```sql
create table admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('super_admin','operator')),
  created_at timestamptz default now()
);
alter table admin_users enable row level security;
```

### 3.3 audit_log (신규)

```sql
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  actor_email text,
  action text not null,             -- expert.create|update|deactivate|delete|import | auth.login.success|auth.login.fail (FR-07 접속 이력)
  target_table text,
  target_id text,
  detail jsonb,                     -- {before,after} 또는 import 요약
  created_at timestamptz default now()
);
alter table audit_log enable row level security;
```

### 3.4 RLS 정책 (요지)

| 테이블 | 정책 |
|--------|------|
| experts | 기존 "활성 공개 select"(소비자) 유지 + 어드민 쓰기는 **service role**(서버, RLS 우회)로만 |
| admin_users | 본인 select; super_admin 전체 select. 일반 insert 금지(운영자 수동/super) |
| audit_log | insert=서버(service role), select=인증 어드민 |

> 어드민 쓰기는 `supabaseAdmin`(service role, 서버 전용)로 수행하고 행위 주체는 세션에서 추출해 audit_log에 기록. service role 키는 클라이언트 노출 절대 금지(기존 `lib/supabase.ts` 패턴 유지).

---

## 4. API Specification (`app/api/admin/**`, 전부 미들웨어 인증)

| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/admin/experts` | 목록(검색·페이지) | operator+ |
| POST | `/api/admin/experts` | 단건 생성 | operator+ |
| PUT | `/api/admin/experts/:id` | 수정 | operator+ |
| PATCH | `/api/admin/experts/:id` | 활성/비활성 토글 | operator+ |
| DELETE | `/api/admin/experts/:id` | 삭제 | **super_admin** |
| GET | `/api/admin/experts/template` | CSV 템플릿 다운로드 | operator+ |
| POST | `/api/admin/experts/import?mode=validate` | CSV 검증·미리보기 | operator+ |
| POST | `/api/admin/experts/import?mode=commit` | 검증분 일괄 insert | operator+ |
| GET | `/api/admin/audit` | 감사·접속 로그 조회 | operator+ |

**import 응답(validate)**
```json
{ "total": 120, "valid": 117,
  "errors": [{ "row": 5, "field": "vertical", "message": "허용값 아님: 'lawer'" }],
  "preview": [{ "name":"김변호","vertical":"lawyer","specialties":["형사","사기"], ... }] }
```

**공통 에러**: 401(미인증)·403(권한부족)·400(형식)·413(파일초과)·422(검증 전부 실패)·500.

### 4.1 CSV 스키마 (D-05 ✅ 확정 2026-05-19)

헤더(고정·순서 무관, 대소문자 정확): `name,vertical,specialties,region,phone,experience_years,bio,youtube_url,is_available,is_active`
- `name` (필수): 1~50자
- `vertical` (필수): `lawyer|labor|adjuster|tax|doctor` 정확히 일치 (그 외 행 거부)
- `specialties` (선택): **`|` 구분** → `text[]` (예: `형사|성범죄|사기`). 공백 trim, 빈 항목 제거
- `region` (필수): 1~50자 (예: `서울 강남`)
- `phone` (필수): `^[0-9-]{7,20}$` (숫자·하이픈만). **중복 판정 키**
- `experience_years` (선택): 정수 0~80, 미입력 시 0
- `bio` (선택): ~300자
- `youtube_url` (선택): http(s) URL 또는 빈값
- `is_available` (선택): `true|false`, 미입력 시 `true`
- `is_active` (선택): `true|false`, 미입력 시 `true`
- 인코딩: UTF-8(BOM 허용). 헤더 불일치/필수 누락/enum 위반/형식 위반 행은 사유와 함께 거부, 정상 행만 commit(부분 성공). 파일 내·DB 기존 phone 중복은 skip+리포트.

---

## 5. UI/UX Design

### 5.1 화면

| 화면 | 경로 | 구성 |
|------|------|------|
| 로그인 | `/admin/login` | 이메일/비번(Supabase Auth), 실패 안내 |
| 전문가 목록 | `/admin` | TanStack Table(검색·정렬·페이지·활성토글·행수정/삭제), [신규][CSV 업로드] |
| 신규/수정 | 모달 또는 `/admin/expert/[id]` | react-hook-form + zod, vertical 셀렉트, specialties 태그입력 |
| CSV 업로드 | `/admin/import` | ①템플릿 다운로드 ②파일 선택 ③검증 미리보기(정상/오류 탭) ④커밋 ⑤결과요약 |
| 감사/접속 | `/admin/audit` | audit_log 테이블(쓰기 행위 + 로그인 접속 이력, 주체·시각 필터) |

> 목록 정렬은 운영 편의용(이름/지역 등)이며 **소비자 노출 추천은 랜덤 유지(plan FR-08, [[expert-recommendation-random]])** — 어드민 정렬이 소비자 매칭에 영향 없음 명시.

### 5.2 Component List (`components/admin/`)

`AdminShell`(레이아웃·네비), `ExpertTable`, `ExpertForm`, `CsvImportWizard`, `ImportPreview`, `AuditTable`, shadcn 프리미티브(button/table/dialog/input/select/toast).

---

## 6. Error Handling

| Code | 상황 | 처리 |
|------|------|------|
| 401 | 미인증 | 페이지→/admin/login, API→JSON 401 |
| 403 | 권한 부족(예: operator가 삭제) | "권한이 없습니다" |
| 400 | CSV 비형식/헤더 불일치 | 헤더 안내 + 템플릿 링크 |
| 413 | 업로드 파일 초과(상한 예: 2MB/≈수천행) | "파일이 큽니다" |
| 422 | 모든 행 검증 실패 | 오류 리포트 표시, 커밋 비활성 |
| 부분성공 | 일부 행 오류 | 정상분만 insert, 결과요약(성공/실패 수)+오류 CSV 다운로드 |

---

## 7. Security Considerations

- [x] 미들웨어 인증 경계(`/admin`,`/api/admin`), 소비자 라우트 비포함
- [x] Supabase Auth 세션(@supabase/ssr 쿠키), 역할 서버 검증(삭제=super_admin)
- [x] service role 키 서버 전용(`lib/supabase.ts`), 클라 노출 0
- [x] 하드코딩 시크릿/비번 0 (이전 사고 재발 방지 — plan §4.2)
- [x] 전문가 연락처 PII: RLS·역할·감사 로그
- [x] CSV 업로드: 서버 검증·파일 크기 상한·행 수 제한·문자열 sanitize
- [x] 모든 쓰기 행위 + **로그인 성공/실패**(FR-07) audit_log 기록(주체=세션 uid 또는 시도 이메일). `/admin/audit` 화면이 행위·접속 이력 통합 조회

---

## 8. Test Plan

| 유형 | 케이스 |
|------|--------|
| 인증 | 미인증 `/admin` 차단·리다이렉트 / `/api/admin` 401 / operator 삭제 403 |
| CRUD | 생성·수정·활성토글·삭제 + audit_log 적재 확인 |
| CSV | 정상 일괄 / 일부 오류(부분성공) / 헤더불일치(400) / 전부오류(422) / vertical 오타 거부 / specialties `|` 파싱 / 중복 phone |
| 격리 | **(필수) `/admin` 진입 후 클라이언트 네비게이션으로 `/`·`/result`·`/expert` 이동 시 시각·레이아웃 회귀 0** (SPA 네비 — C-1) / 정적 진입 회귀 0 / 소비자 번들에 admin·tailwind 청크 미포함 / `.admin-root` 밖으로 base reset 누수 0 |
| 호환 | Next16/React19 + shadcn/Radix/TanStack 정상 빌드·동작 |

---

## 9. Clean Architecture

| Component | Layer | Location |
|-----------|-------|----------|
| Admin 화면/위저드 | Presentation | `app/(admin)/**`, `components/admin/**` |
| 인증·CSV·감사·쿼리 | Application/Infra | `lib/admin/{auth,csv,experts,audit}.ts` |
| Route Handlers | Application | `app/api/admin/**` |
| experts/admin_users/audit_log 타입 | Domain | `lib/types.ts`(공유) + `lib/admin/types.ts` |
| proxy 인증 | Infra(boundary) | `proxy.ts` |

의존 방향: (admin)Presentation → api(Application) → lib/admin(Infra) → Supabase. 소비자 레이어와 **교차 import 금지**.

---

## 10. Coding Convention

| 항목 | 규약 |
|------|------|
| 어드민 파일 위치 | 항상 `*/admin/*` 하위. 루트 혼재 금지 |
| 스타일 | 어드민=Tailwind/shadcn(`admin.css`는 (admin)layout만), 소비자=기존 인라인 유지 |
| 검증 | zod 스키마 1곳(`lib/admin/csv.ts`)에서 폼·CSV 공용 |
| 네이밍 | 컴포넌트 PascalCase, 파일 camelCase, 폴더 kebab/소문자 |
| 시크릿 | env만, 하드코딩 금지. service role 서버 전용 |
| env 변수명 | **truth = `lib/supabase.ts` 현행**(`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_SECRET_KEY`). golgoru-sos.plan §7 구버전 명칭(ANON/SERVICE_ROLE)은 무시 (m-1) |
| 감사 용어 | 리소스·API·URL·파일 모두 **`audit`** 로 통일 (access 미사용) (m-3) |

---

## 11. Implementation Guide

### 11.1 File Structure (신규/변경)

```
proxy.ts                         # 신규: 인증 경계
app/(admin)/
  layout.tsx                          # 신규: admin.css import, AdminShell
  admin/login/page.tsx                # 신규
  admin/page.tsx                      # 신규(기존 app/admin/page.tsx 대체)
  admin/import/page.tsx               # 신규
  admin/audit/page.tsx                # 신규(감사+로그인 접속 이력)
app/admin/page.tsx                    # 제거
app/api/admin/experts/route.ts        # 보강(실 Supabase·인증·audit)
app/api/admin/experts/[id]/route.ts   # 보강(PUT/PATCH/DELETE)
app/api/admin/experts/template/route.ts  # 신규
app/api/admin/experts/import/route.ts    # 신규(validate|commit)
app/api/admin/audit/route.ts          # 신규
lib/admin/{auth,csv,experts,audit,types}.ts  # 신규
components/admin/*                     # 신규
styles/admin.css                       # 신규(Tailwind v4 + shadcn tokens)
supabase: admin_users, audit_log, experts RLS  # 마이그레이션
```

### 11.2 Implementation Order

1. [ ] 선결 D-01~03: Supabase 실연결 + experts/admin_users/audit_log + RLS + Auth + super_admin 계정
2. [ ] Tailwind v4 + shadcn 설치, `admin.css` (admin)layout 한정 import → **소비자 회귀 0 확인**
3. [ ] `proxy.ts` 인증 경계 + `lib/admin/auth.ts`
4. [ ] `app/(admin)` 라우트 그룹·AdminShell·로그인, 기존 `app/admin/page.tsx` 제거
5. [ ] 전문가 CRUD API(실 Supabase·audit) + ExpertTable/Form
6. [ ] CSV: template/import(validate·commit) + Wizard/Preview + zod 스키마
7. [ ] 감사/접속 화면
8. [ ] 통합·격리·회귀 QA(§8) → 빌드

### 11.3 Acceptance Criteria

- 미인증 어드민 접근 차단, operator/super 권한 분기 동작
- CSV 정상/부분성공/거부 시나리오 정상, audit 적재
- 소비자 SOS 흐름·외관 회귀 0, 소비자 번들에 admin/tailwind 미포함
- 하드코딩 시크릿 0, 빌드/타입 0 에러

---

## 12. Open Decisions / Out of Scope

| 항목 | 차단성 | 상태/판정 |
|------|--------|-----------|
| **D-01~03** Supabase 실연결·`experts`/`admin_users`/`audit_log`+RLS·Auth·super_admin 계정 (plan §7.x) | **Hard Blocker** | 미충족 시 §11.2 step2~8 전 구현 mock 한정. 착수 전 필수 |
| **C-1** §2.5 Tailwind 격리 재설계 반영 | **Hard Blocker** | ✅ 본 v0.2에서 확정(preflight 전역금지+`.admin-root` 스코프). step2 검증 게이트 |
| **D-05** CSV 컬럼·규칙 확정(§4.1) | ✅ 해소 | 2026-05-19 §4.1로 확정 — step6 게이트 해제 |
| shadcn/Radix/TanStack × React 19 호환 | Non-blocker | §11.2 step2 설치+빌드 게이트로 실검증 |
| operator 셀프가입 vs super_admin 수동발급 | Non-blocker | 기준안=수동 발급, 추후 |
| FR-07 접속 로그 범위(§3.3 로그인 이벤트 포함으로 해소) | Non-blocker | M-2 반영: audit_log에 `auth.login.*` 포함 |
| xlsx(FR-11) | Non-blocker | 차순위(CSV 우선) |
| KPI/차트·10도메인 | 범위 외 | Phase 2~3 |

> **plan §7.x ↔ design 선결 대응**: D-01/D-02/D-03 = Hard Blocker(인프라), D-04 = ✅확정(shadcn), D-05 = Soft Blocker(데이터 계약, commit만 차단). D-01~03와 D-05는 독립 — D-01~03 충족 시 D-05 미결이어도 step2~5(격리/인증/CRUD) 진행 가능, step6(CSV commit)에서 D-05 게이트.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-19 | 초안 — shadcn+Supabase, 소스/스타일 격리, 전문가 CRUD+CSV 임포트, 인증/RLS/감사 | Kim KJ |
| 0.2 | 2026-05-19 | design-validator 반영: C-1 §2.5 재설계(preflight 전역금지+.admin-root 스코프, Next16 CSS 비언마운트 근거), M-1 §12 차단성 등급, M-2 FR-07 로그인 이벤트 audit화, M-3 audit 용어 통일, m-1 env truth | Kim KJ |
| 0.3 | 2026-05-19 | 멀티 root 채택(§2.4/§2.5): 소비자=app/(site)·어드민=app/(admin) 독립 root. C-1 아키텍처로 종결, 데스크톱 반응형 어드민. 구현·런타임 검증 완료(소비자 회귀 0) | Kim KJ |
