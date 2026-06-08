---
template: analysis
version: 1.2
feature: admin-dashboard
date: 2026-05-19
author: Kim KJ
phase: check
matchRate: 97
round: 2
---

# admin-dashboard Gap Analysis (PDCA Check) — 2회차 재검증

> **대상**: 설계 `docs/02-design/features/admin-dashboard.design.md` **(v0.3 — 멀티루트 채택)** ↔ 구현
> **수행**: bkit:gap-detector (읽기 전용, Read/Grep 파일 단위 교차검증)
> **일자**: 2026-05-19
> **회차**: 2회차 — 1회차 96%는 **구 설계 v0.2(단일루트+preflight 전역금지)** 기준. 본 회차는 **갱신 설계 v0.3(멀티루트, §2.4/§2.5 종결)** 기준 신규 기준선.
> **Match Rate**: **97%** · Critical 0 · Major 0 · 선결 갭 0 → **Report 진행 가능, iterate 불요**

---

## 1. Analysis Overview

### 1.1 Purpose

설계 v0.3(멀티루트 최종 결정)와 실제 구현 간 정합성 검증. 전 세션 식별 쟁점 2건(설계문서 멀티루트 동기화 갭 / c-1 zod 중복)을 파일 근거로 확정 판정.

### 1.2 Scope

- 설계: `docs/02-design/features/admin-dashboard.design.md` (v0.3)
- 구현: `app/(admin)/**`, `app/(site)/**`, `app/api/admin/**`, `lib/admin/**`, `components/admin/**`, `proxy.ts`, `styles/admin.css`, `supabase-admin-setup.sql`
- 일자: 2026-05-19

---

## 2. 설계 핵심 결정 반영 판정 (Design vs Implementation)

| 결정 | 구현 근거 (파일:라인) | 판정 |
|------|----------------------|:----:|
| §2.4 멀티루트 소스분리 | 소비자=`app/(site)/{layout,page,result,expert}` · 어드민=`app/(admin)/{layout,admin/*}` 독립 root. 최상위 `app/layout.tsx` **없음**(glob 확인). 홈 `/`=`app/(site)/page.tsx` 내 정의(route-groups.md L32 요건 충족). `app/admin/page.tsx` 제거됨(glob: No files). 어드민↔소비자 교차 import 0(`(site)` 내 `@/lib/admin`·`@/components/admin` grep 0건) | ✅ |
| §2.5 C-1 Tailwind 격리 (v0.3) | `styles/admin.css:5-7` 표준 `@import 'tailwindcss'`(preflight **포함**)+`@source '../app/(admin)'`+`'../components/admin'`+`.admin-root` 베이스. `app/(admin)/layout.tsx:2`만 import, `app/(site)/layout.tsx`는 `./globals.css`만. 별도 `<html>` 2개 → route-groups.md L30 풀 리로드로 누수 불가 | ✅ |
| §2.6 인증 경계 (proxy) | `proxy.ts:42-43` matcher `['/admin/:path*','/api/admin/:path*']`, `:23-30` 미인증 페이지→`/admin/login`·`/api/admin/*`→401 JSON, `:21` `/api/admin/auth` 예외, `:33-37` 로그인상태 재방문 리다이렉트. 소비자 라우트 matcher 밖 | ✅ |
| §3 데이터모델·RLS·감사 | `supabase-admin-setup.sql`: `admin_users`(L8-13)·`audit_log`(L25-34)·RLS 정책(L17-21,38-41)·D-03 super_admin 부트스트랩(L47-53) 모두 §3.2~3.4와 일치. `lib/admin/audit.ts:14-26` service role insert, `lib/admin/auth.ts:12-19` admin_users role 조회 | ✅ |
| §4 API 명세 (9 엔드포인트) | GET/POST `/api/admin/experts`(route.ts), PUT/PATCH/DELETE `/[id]`(route.ts, DELETE=`requireAdmin('super_admin')` :50), GET `/template`, POST `/import?mode=validate\|commit`, GET `/audit` — 메서드·경로·권한 전부 일치 | ✅ |
| §4.1 D-05 CSV 계약 | `lib/admin/csv.ts`: 헤더10(`:6-9`)·vertical enum(`:11,24`)·`|`specialties(`:25-28`)·phone `^[0-9-]{7,20}$`(`:30`)·exp 0~80(`:31-34`)·is_*기본 true(`:13-20,40-41`)·BOM strip(`:53`)·헤더누락 검출(`:60-66`)·파일내 phone dedup(`:83-88`). `import/route.ts:48-54` DB phone 중복 skip·부분성공 | ✅ |
| §6 에러코드 | 401(auth.ts:28)·403(auth.ts:31)·400(import:21,23 / experts POST:30)·413(import:24 2MB)·422(import:33)·500(전 route) 전부 구현 | ✅ |
| §7 보안 | 미들웨어 경계·Supabase Auth 쿠키(@supabase/ssr)·service role 서버전용(`lib/supabase.ts:5,11`)·소스 하드코딩 시크릿 0(grep `ADMIN_PASSWORD` 소스 0건)·CSV 서버검증·로그인 성공/실패 audit(`auth/login/route.ts:17,26,30`) | ✅ |
| §10 컨벤션 | 어드민 파일 `*/admin/*` 한정·`admin.css` (admin)layout만·네이밍(PascalCase 컴포넌트/camelCase 파일/소문자 폴더)·env truth=`lib/supabase.ts`(`.env.local`·`proxy.ts`·`supabaseServer/Browser.ts` 전부 NEXT_PUBLIC_SUPABASE_URL/PUBLISHABLE_KEY/SECRET_KEY 일관)·audit 용어 통일(access 0건) | ✅ (단 "zod 1곳" 위반 = c-1) |
| FR-08 랜덤추천 보호 | 소비자 `app/api/experts/route.ts:23-27` Fisher-Yates 셔플 잔존, 어드민과 완전 분리. 어드민 목록 정렬 기능 미구현(영향원 자체 없음) — 매칭 영향 0 | ✅ |

**Match Rate 산출 (핵심 기능 가중)**

```
┌──────────────────────────────────────────────────────────┐
│  Overall Match Rate: 97%                                  │
├──────────────────────────────────────────────────────────┤
│  핵심(인증/CRUD/CSV/감사, 가중 70%):  100% (전부 ✅)       │
│  격리·아키텍처(멀티루트 C-1, 가중 20%): 100% (✅)          │
│  부가 UI/문서정합(가중 10%):           ~70% (Minor 다수)  │
│  ─ 차감 사유: c-1 컨벤션 위반(경계) + 문서 동기화 갭(코드=truth) │
└──────────────────────────────────────────────────────────┘
```

---

## 3. 갭 목록 (심각도별)

### Critical: 0 · Major: 0

### 경계 (Convention 위반 — 권장 개선)

| ID | 위치 | 내용 | 권고 조치 |
|----|------|------|-----------|
| **c-1** | `lib/admin/csv.ts:22-42` ↔ `components/admin/ExpertForm.tsx:8-19` | zod 스키마 **독립 중복 정의**. 두 스키마가 `name`(min1/max50)·`vertical` enum(lawyer\|labor\|adjuster\|tax\|doctor)·`phone` `^[0-9-]{7,20}$`·`experience_years` int 0~80·`bio` max300·`youtube_url` URL·`is_available/is_active`를 각각 작성. 설계 **§10 "zod 스키마 1곳(`lib/admin/csv.ts`)에서 폼·CSV 공용"** 명시 위반. 한쪽만 규칙 변경 시 폼/CSV 검증 분기 → 잘못된 전문가 데이터 유입 → 설계 §1.2 "잘못된 vertical·연락처 = SOS 오라우팅" 리스크 | 공통 필드 코어 검증을 `lib/admin/expertSchema.ts`로 추출, CSV(전처리: `|`문자열·bool문자열)·폼(raw)이 코어 검증자를 합성. 입력 shape 차이로 "단일 스키마"는 비현실 → "코어 검증자 공유 + 어댑터" 권장 |

### Minor — 설계 문서 동기화 갭 (코드=truth, **설계를 v0.3 멀티루트 구현에 맞춰 동기화 권고**)

> 전 세션 쟁점 1 확정: 구현은 v0.3 멀티루트로 정확 리팩터링됐으나 **설계 본문 일부에 구버전 단일루트 서술이 잔존**. 멀티루트는 design-validator C-1 채택 최종결정이므로 **구현 되돌림이 아니라 설계 문서를 구현에 동기화**해야 함.

| ID | 설계 위치 | 잔존 구버전 서술 | 실제 구현 | 권고 |
|----|-----------|------------------|-----------|------|
| d-sync-1 | §2.1 Component Diagram (L62-78) | `app/layout.tsx (소비자 루트, 인라인스타일)` / `app/page.tsx /result /expert` / `app/(admin)/layout.tsx ← 여기서만 import` (중첩 레이아웃 전제) / `lib/admin/* (queries·auth·csv·audit)` | `app/(site)/layout.tsx`(소비자 독립 root) + `app/(admin)/layout.tsx`(어드민 독립 root), 최상위 `app/layout.tsx` 없음 | 다이어그램을 `app/(site)/` 독립 root 기준으로 재작성 |
| d-sync-2 | §2.2 Data Flow (L86) | CRUD 흐름 `→ lib/admin/experts.ts → supabaseAdmin` | `lib/admin/experts.ts` **미존재**(glob 0건). CRUD 로직은 `app/api/admin/experts/route.ts`·`[id]/route.ts`에 인라인, `@/lib/supabase` supabaseAdmin 직접 호출 | `lib/admin/experts.ts` 표기 삭제 또는 "route handler 인라인"으로 정정 |
| d-sync-3 | §2.3 Dependencies (L108) | `lib/admin/experts.ts` `audit.ts` 행 | `experts.ts` 미존재 (audit.ts만 존재). `lib/admin/supabaseServer.ts`·`supabaseBrowser.ts`(실재)는 표 누락 | 의존 표를 실제 파일군으로 정정 |
| d-sync-4 | §9 Clean Architecture (L296) | `lib/admin/{auth,csv,experts,audit}.ts` | `experts.ts` 미존재 | `{auth,csv,audit,types,supabaseServer,supabaseBrowser}.ts`로 정정 |
| d-sync-5 | §11.1 File Structure (L337) | `lib/admin/{auth,csv,experts,audit,types}.ts` / `app/(site)` 미언급 / `app/admin/page.tsx 제거`만 | `experts.ts` 없음, `supabaseServer/Browser.ts` 신규 존재, 소비자 전체가 `app/(site)/`로 이동됨 | 파일구조에 `app/(site)/**` 이동 + `supabaseServer/Browser.ts` 반영, `experts.ts` 삭제 |
| d-sync-6 | §12 (L368) | "C-1 ✅ 본 v0.2에서 확정(preflight 전역금지+`.admin-root` 스코프)" | v0.3에서 멀티루트로 종결 → preflight 포함 표준 import로 변경됨(설계 §2.5 v0.3과 §12 L368 자기모순) | §12 C-1 행을 "v0.3 멀티루트로 종결"로 정정 |

### Minor — 부가 기능 미구현 (C-1 격리상 의도적, 코드=truth)

| ID | 설계 | 구현 | 비고 |
|----|------|------|------|
| m-1 | §5.2 `AdminShell/ExpertTable/CsvImportWizard/ImportPreview/AuditTable` + shadcn 프리미티브(button/dialog/select/toast) | `components/admin/`에 `AdminNav`·`ExpertForm`만. 테이블/위저드/프리뷰는 페이지에 인라인. shadcn CLI 미사용, Tailwind 유틸 직접 조립 | C-1 격리상 shadcn CLI 회피 의도적. 설계 §5.2 노트 1줄 권장 |
| m-2 | §5.1/§0(D-04) "react-hook-form + zod", specialties 태그입력 | `ExpertForm.tsx` `useState`+수동 `zod.safeParse`(rhf 미사용, 의존성엔 설치됨). specialties는 `|` 텍스트 input | 동작 동일. 설계 표기 정정 또는 노트 권장 |
| m-3 | §5.1/§4 "목록(검색·**정렬·페이지**)" | `experts/route.ts` 검색만(`q`→name/region ilike), limit/offset/page 없음. `admin/page.tsx`는 `getCoreRowModel`만(정렬/페이지 모델 미사용) | 데이터 규모 작아 비차단. 향후 행수 증가 시 페이지네이션 필요 |
| m-4 | §6/§4 "오류 CSV 다운로드" | `import/route.ts:78` 오류를 JSON `errors[]` 반환, 화면 인라인 표시. CSV 다운로드 없음 | nice-to-have, §4.1 계약 외. 설계 노트 권장 |
| m-5 | §4 API 표 | `app/api/admin/auth/{login,logout}` 표 누락(§2.6 흐름상 필수) | 설계 §4에 행 2개 추가 권장 |

### Minor — 1회차 분석 자체 정정

- 1회차(96%) §2.5 판정 서술 "preflight 미import(theme+utilities만)"은 **폐기된 v0.2 가정 기준**. 현 코드 `styles/admin.css:5`는 표준 full `@import 'tailwindcss'`(preflight 포함) = v0.3 설계와 정확 일치. 본 회차에서 기준선 재정렬(품질 등락 아님).

---

## 4. 선결 조건 충족 확인 (D-01~03 / D-05)

| 선결 | 근거 | 판정 |
|------|------|:----:|
| D-01~02 Supabase 실연결·테이블·RLS | `.env.local` 실 자격증명(NEXT_PUBLIC_SUPABASE_URL=실 프로젝트). `supabase-admin-setup.sql` admin_users/audit_log/RLS DDL 버전관리됨. 1회차 사용자 브라우저 QA로 로그인·데이터 조회 동작 확인 | ✅ 충족 |
| D-03 super_admin 계정 | `supabase-admin-setup.sql:47-53` 부트스트랩 절차 문서화. QA로 어드민 로그인 확인 | ✅ 충족 |
| D-05 CSV 계약 | §2 §4.1 행 참조 — 코드 완전 일치 | ✅ 충족 |

**선결 갭: 없음.**

---

## 5. 권고

- **97% ≥ 90%, Critical/Major 0, 선결 갭 0 → Report 진행 가능. iterate 불요.**
- **우선 권장(경계, 데이터 품질 경로 — report 전 처리 가치 높음)**: c-1 zod 중복 해소(`lib/admin/expertSchema.ts` 코어 검증자 추출, CSV·폼 합성).
- **설계 문서 동기화(전 세션 쟁점 1)**: d-sync-1~6 — **설계를 v0.3 멀티루트 구현에 맞춰 갱신**(구현 되돌림 아님; 멀티루트는 C-1 채택 최종결정). report 시 "설계 문서 갱신 필요" 항목으로 이관.
- Minor m-1~m-5: 코드가 truth, report 잔여로 이관(설계 노트 1~2줄).

---

## 6. Design Document Updates Needed

- [ ] §2.1 다이어그램 → `app/(site)`/`app/(admin)` 멀티루트 기준 재작성
- [ ] §2.2/§2.3/§9/§11.1 → `lib/admin/experts.ts` 삭제, `supabaseServer/Browser.ts` 반영, `app/(site)/**` 이동 반영
- [ ] §12 C-1 행 → "v0.3 멀티루트로 종결"로 정정 (v0.2 preflight-금지 자기모순 제거)
- [ ] §4 API 표 → `/api/admin/auth/{login,logout}` 행 추가
- [ ] §5.1/§5.2 → react-hook-form/shadcn 프리미티브/정렬·페이지/오류CSV "미구현(의도적)" 노트
- [ ] §10 "zod 1곳" → c-1 해소 후 `lib/admin/expertSchema.ts` SSOT로 갱신

---

## 7. Next Steps

- [ ] c-1 스키마 SSOT 추출 (Act, 권장)
- [ ] 설계 문서 d-sync-1~6 동기화 (문서 갱신)
- [ ] `/pdca report admin-dashboard` 진행 (≥90% 충족)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-19 | 1회차 (구 설계 v0.2 기준, Match 96%, c-1 권장) | Kim KJ |
| 0.2 | 2026-05-19 | 2회차 재검증 (갱신 설계 v0.3 멀티루트 기준). Match 97%. 전 세션 쟁점 2건 확정: c-1 zod 중복(경계, 파일·라인 근거) / 설계 멀티루트 동기화 갭 d-sync-1~6(설계→구현 동기화 권고). 선결 D-01~03·D-05 충족. Critical/Major 0 → Report 진행 가능 | Kim KJ |
