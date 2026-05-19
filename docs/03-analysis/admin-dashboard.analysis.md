---
template: analysis
version: 1.2
feature: admin-dashboard
date: 2026-05-19
author: Kim KJ
phase: check
matchRate: 96
---

# admin-dashboard Gap Analysis (PDCA Check)

> **대상**: 설계 `docs/02-design/features/admin-dashboard.design.md` (v0.2) ↔ 구현
> **수행**: bkit:gap-detector (읽기 전용, grep 교차검증)
> **일자**: 2026-05-19
> **Match Rate**: **96%** · Critical 0 · Major 0 · 선결 갭 0 → **Report 진행 가능**

---

## 1. 요약

설계 핵심 결정 4종(§2.4 소스분리 / §2.5 C-1 Tailwind 격리 / §2.6 미들웨어 / §4.1 D-05 CSV 계약)이 코드에 **충실·정확 반영**됨이 grep 교차검증으로 확정. 선결 D-01~03(Supabase 실연결)·D-05(CSV) 모두 충족. Critical/Major 0. 유일한 경계 항목은 zod 스키마 중복(c-1, 권장 개선). 나머지는 코드를 진실원천으로 하는 경미한 문서 동기화.

브라우저 QA(사용자): 어드민 로그인·데이터 조회 동작 확인. 초기 CSS 미적용은 Tailwind v4 `@source` 누락이 원인 → 수정 완료(빌드 산출물 유틸리티 생성·preflight 시그니처 0건 확인).

## 2. 설계 핵심 결정 반영 판정

| 결정 | 구현 | 판정 |
|------|------|:----:|
| §2.4 소스 분리 | 어드민=`app/(admin)`/`components/admin`/`lib/admin`/`app/api/admin/**` 한정, 소비자 교차 import 0, 기존 `app/admin/page.tsx` 제거, 소비자 라우트 불변 | ✅ |
| §2.5 C-1 격리 | `styles/admin.css`: preflight 미import(theme+utilities만)+`@source`+`.admin-root` 스코프 / `(admin)/layout.tsx`만 import / `app/layout.tsx` 미import / postcss @tailwindcss | ✅ |
| §2.6 미들웨어 | matcher `/admin`·`/api/admin`, 미인증 페이지→`/admin/login`·API→401, `/api/admin/auth` 예외, 소비자 미포함 | ✅ |
| §3 RLS/감사 | supabaseAdmin(service role) 쓰기 + `logAudit` 기록, `admin_users`/`audit_log`/`experts` | ✅ |
| §4 / §4.1 D-05 | CRUD+template+import(validate/commit, 부분성공·phone 중복 skip)+audit, 권한(삭제=super_admin via `requireAdmin('super_admin')`), 에러코드, CSV 계약(헤더10·vertical enum·`|`·phone 정규식·기본값) | ✅ |
| FR-08 랜덤추천 보호 | 소비자 `/api/experts` 무작위 셔플 잔존, 어드민과 분리 — 매칭 영향 0 | ✅ |

## 3. 갭 목록

### Critical 0 · Major 0

### 경계(권장 개선)
| ID | 위치 | 내용 | 조치 |
|----|------|------|------|
| c-1 | `lib/admin/csv.ts` ↔ `components/admin/ExpertForm.tsx` | zod 스키마 중복 정의 — 설계 §10 "검증 스키마 1곳 공용" 위반. 규칙 분기 시 전문가 데이터 품질→SOS 오라우팅 리스크 | 공통 필드 검증을 `lib/admin/expertSchema.ts`로 추출해 CSV·폼이 합성. (입력 shape 차이 — CSV는 `|`문자열/bool문자열 전처리, 폼은 raw — 때문에 "코어 검증자 공유"가 현실적) |

### Minor (문서 동기화, 코드=truth)
- 설계 §5.2가 shadcn 프리미티브 나열했으나 구현은 Tailwind 유틸 직접 조립(shadcn CLI 미사용 — C-1 격리상 의도적). 설계 표기와 실제 차이 → 설계 노트 1줄 권장(코드가 정답).
- `app/api/admin/auth/{login,logout}` 는 설계 §4 표에 명시 없으나 §2.6 인증 흐름상 필수 — 설계 §4에 행 추가 권장.

## 4. 권고

- **96% ≥ 90%, Critical/Major 0 → Report 진행 가능, iterate 불요.**
- 권장: **c-1(스키마 중복) 해소**를 report 전/후 처리. 데이터 품질 경로라 가치 높음. Minor 문서 2건은 report 시 잔여로 이관.
- 선결 갭 없음(D-01~03·D-05 충족).

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-19 | gap-detector 분석, Match 96%, c-1(zod 중복) 권장 | Kim KJ |
