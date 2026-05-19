---
template: plan
version: 1.2
feature: admin-dashboard
date: 2026-05-19
author: Kim KJ
project: golgoru-sos
version_project: 0.1.0
---

# admin-dashboard Planning Document

> **Summary**: 전문가 등록·관리 + 접속자/권한 관리를 위한 운영자 어드민 대시보드. 소비자 SOS 앱과 **소스·인증·라우트가 명확히 분리**된 영역으로 구축한다.
>
> **Project**: golgoru-sos
> **Version**: 0.1.0
> **Author**: Kim KJ
> **Date**: 2026-05-19
> **Status**: Draft
> **상위 맥락**: [golgoru-sos.plan.md](golgoru-sos.plan.md) (수요 엔진 MVP). 본 기능은 전략 [platform-domains §2-1 멤버관리 / §2-10 권한·감사] 의 운영자 측 구현.

---

## 1. Overview

### 1.1 Purpose

운영자가 (1) **전문가 등록·수정·활성/비활성 관리**, (2) **접속자/권한 관리**(역할 기반 접근 + 관리 행위 감사 로그)를 수행하는 어드민 대시보드. 소비자용 SOS 앱과 코드·인증·배포 경계를 분리해 보안·유지보수 혼선을 제거한다.

### 1.2 Background

- 현 `app/admin/page.tsx`는 **단순 비밀번호 게이트 + mock 데이터**(`MOCK_EXPERTS`). 실 DB 미연결(`NEXT_PUBLIC_SUPABASE_URL` 미설정), 역할·감사 없음.
- 전략 SSoT(platform-domains §2-10)는 **다층 역할 + 감사 로그**를 Phase 1 필수로 규정.
- 소비자 앱은 **무로그인** 원칙(모래시계 §2-1). 어드민은 정반대(강한 인증). 한 코드/라우트에 섞이면 보안 사고·실수 위험 → **분리가 핵심 요구**.
- visactor-next-template은 시각화 특화로 본 CRUD+인증 용도에 부적합 → 채택하지 않음(사전 자문 결론).

### 1.3 Related Documents

- 상위: `docs/01-plan/features/golgoru-sos.plan.md`
- 전략: `../golgoru/docs/platform-domains.md` §2-1, §2-10 / `product-strategy-foundation.md`
- 메모리: [[expert-recommendation-random]] (전문가 노출은 랜덤 추천 — 어드민에서 품질 랭킹 노출 금지)

---

## 2. Scope

### 2.1 In Scope (MVP v1.0)

- [ ] **소스 분리 구조 확립** (§6.4) — 어드민 전용 라우트 그룹·디렉토리·인증 경계
- [ ] Supabase 실연결 (프로젝트 URL/키, `experts` 테이블, RLS) — 선결
- [ ] 전문가 CRUD: 목록/등록/수정/활성·비활성 (Supabase 영속)
- [ ] **전문가 일괄 등록**: CSV(주), Excel(.xlsx, 선택) 업로드 + 다운로드용 템플릿 + 검증·미리보기 후 일괄 insert
- [ ] 어드민 인증: Supabase Auth 기반 로그인 (env 단순비번 대체)
- [ ] 역할(Role) 최소셋: super_admin / operator (RBAC 골격)
- [ ] 관리 행위 감사 로그(생성·수정·비활성: 누가/언제/무엇)
- [ ] 접속자/세션 조회(읽기): 최근 관리자 로그인·행위 목록

### 2.2 Out of Scope (차기)

- KPI·차트 대시보드(이중 KPI — 전략 Phase 2, 시각화 도구는 이때 검토)
- platform-domains 10개 도메인 전체(콘텐츠 파이프라인·감수·정산·CRM)
- 소비자 회원/세션 분석, 푸시, 결제
- 멀티테넌트 5버티컬 분리 운영(전략 Phase 2~3)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 어드민 소스/라우트/인증을 소비자 앱과 분리 (혼선 방지) | High | Pending |
| FR-02 | Supabase 실연결 + `experts` 테이블·RLS | High | Pending |
| FR-03 | 전문가 목록·등록·수정·활성토글 (영속) | High | Pending |
| FR-04 | Supabase Auth 어드민 로그인 (하드코딩/단순비번 폐기) | High | Pending |
| FR-05 | 역할 기반 접근(super_admin/operator) | Medium | Pending |
| FR-06 | 관리 행위 감사 로그 적재·조회 | Medium | Pending |
| FR-07 | 접속자(관리자 세션·행위) 조회 화면 | Medium | Pending |
| FR-08 | 전문가 노출 정책은 랜덤 추천 유지 — 어드민에 품질 랭킹 UI 비노출 | Medium | Pending |
| FR-09 | 전문가 CSV 일괄 업로드: 행 단위 스키마 검증·오류 리포트·미리보기 후 일괄 insert | High | Pending |
| FR-10 | 표준 템플릿(CSV) 다운로드 제공 (컬럼·예시·작성 규칙 포함) | High | Pending |
| FR-11 | Excel(.xlsx) 업로드 지원 (CSV로 정규화 처리) | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Method |
|----------|----------|--------|
| Security | 어드민 라우트 미인증 100% 차단(미들웨어), 소비자 경로와 인증 격리 | 수동/접근 테스트 |
| Privacy | 전문가 연락처=PII, RLS·역할로 접근 통제, 감사 로그 | RLS 정책 검토 |
| Separation | 소비자 빌드/번들에 어드민 코드 미포함(또는 명확 격리) | 번들·구조 점검 |
| Cost | Supabase Free + 기존 Vercel 내 — 추가 비용 0 시작 | 청구서 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 어드민이 별도 경계(라우트/인증/디렉토리)에서 동작, 소비자 흐름 무영향(회귀 0)
- [ ] Supabase 실데이터로 전문가 CRUD 정상
- [ ] 미인증 사용자 어드민 접근 차단
- [ ] 관리 행위 감사 로그 기록·조회
- [ ] 빌드 통과, 소비자 SOS E2E 회귀 없음

### 4.2 Quality Criteria

- [ ] Lint/TypeScript 0 에러
- [ ] 어드민 비밀번호/시크릿 소스 하드코딩 0 (이전 사고 재발 방지)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Supabase 미연결(선결 미충족) | High | High | 착수 1순위: 실 프로젝트 URL/키·테이블·RLS·Auth 활성 (D-01) |
| 소비자/어드민 코드 혼선 → 보안 사고 | High | Medium | §6.4 분리 구조 강제(라우트 그룹·미들웨어·디렉토리 규약) |
| 어드민 공개 노출 | High | Medium | Supabase Auth + 미들웨어 인증, 환경변수 비번 폐기 |
| 전문가 연락처 PII 유출 | High | Medium | RLS·역할 통제, 감사 로그, 서버 전용 키 |
| 스코프 크리프(10도메인) | Medium | High | MVP=전문가CRUD+인증+감사만, 나머지 차기 |
| 랜덤 추천 원칙 훼손(어드민에 랭킹 도입) | Medium | Low | FR-08 명시, 설계서 제약화 [[expert-recommendation-random]] |
| 일괄 업로드 불량 데이터 → SOS 오라우팅(잘못된 vertical/연락처) | High | Medium | 행단위 강검증·미리보기·부분성공·중복감지(§6.5), 잘못된 vertical 거부 |

---

## 6. Architecture Considerations

### 6.1 Project Level

| Level | Selected |
|-------|:--------:|
| Starter | ☐ |
| **Dynamic** (BaaS 연동) | ☑ |
| Enterprise | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Options | Recommended | Rationale |
|----------|---------|-------------|-----------|
| 어드민 UI | Refine / shadcn+TanStack 직접 / 템플릿 | **shadcn/ui + TanStack Table (확정 D-04)** | MVP 범위 한정 + §6.4 강한 분리 + 기존 인라인스타일 앱과 가볍게 격리. Tailwind는 어드민 한정 도입 |
| 인증 | Supabase Auth / NextAuth / 단순비번 | **Supabase Auth** | 기존 스택, RLS·역할 연계 |
| DB/권한 | Supabase Postgres + RLS | **확정** | 이미 스택, PII·역할 통제 적합 |
| 시각화 | (없음) / Tremor/VisActor | **없음(MVP)** | 차트는 Phase 2 KPI 단계 |
| 소스 분리 | 라우트그룹 인앱 / 모노레포 / 별도레포 | **인앱 분리(지금)** + 모노레포(성장 시) | 인프라 churn 0, 즉시 적용. §6.4 |

### 6.2.1 어드민 UI 선택 가이드 (D-04)

| 기준          | **Refine** (refine.dev)        | **shadcn/ui + TanStack Table** (직접) |
|--------------|--------------------------------|----------------------------------------|
| 성격          | CRUD/어드민 **메타프레임워크** (로직 제공) | 복붙형 **컴포넌트 모음** (코드 소유, 직접 조립) |
| 기본 제공      | data/auth provider(Supabase 공식), RBAC, 목록·폼·라우팅 스캐폴딩 | UI 프리미티브만(테이블·폼·다이얼로그). 데이터·인증·RBAC는 직접 |
| FR-04~07 적합 | ★★★ (인증·역할·CRUD 자동화 많음)     | ★★☆ (Supabase 직접 연동·가드 직접 작성) |
| 기존 스택 정합  | 추상 레이어·규약 추가(Next16/§6.4 경계와 통합 주의) | 가장 가벼움·강한 격리 용이. 단 **Tailwind 미설치 → 도입 필요**(어드민 영역 한정 가능) |
| 의존성/락인     | 프레임워크 의존, 학습곡선             | 런타임 락인 0, 전부 내 코드 |
| CSV 임포트(§6.5) | 폼·검증 유틸 활용 가능             | react-hook-form+zod로 검증 직접(투명) |
| 적합 상황      | 어드민이 **10도메인급으로 성장**·역할 다양·빠른 스캐폴딩 | MVP가 **전문가CRUD+임포트+기본권한**으로 한정·풀컨트롤 선호 |

**선택 한 줄 가이드**
- **Refine** → 어드민을 전략 10도메인으로 키울 예정 + CRUD/RBAC 빨리 깔고 싶음(추상 수용).
- **shadcn 최소** → 범위를 전문가 관리·임포트·기본 인증으로 좁게 유지 + 기존 앱과 가볍게·강하게 분리(Tailwind 어드민 한정 도입 감수).

> 권고: 본 MVP 범위가 한정적이고 §6.4 강한 분리·기존 인라인스타일 앱이라 **shadcn 최소 구성**도 충분히 합리적. 단 향후 멤버·감수·정산 등 도메인 확장이 확실하면 **Refine**가 총비용 우위. 최종은 D-04에서 사용자 확정.

### 6.3 Clean Architecture

```
Dynamic — 소비자/어드민 디렉토리·라우트·인증 분리(§6.4)
```

### 6.4 소스 분리 전략 ⭐ (핵심 요구)

**원칙: "소비자 앱과 어드민은 같은 저장소·배포라도 코드·라우트·인증이 절대 섞이지 않는다."**

| 영역 | 소비자 (기존, 무로그인) | 어드민 (신규, 인증필수) |
|------|------------------------|------------------------|
| 라우트 | `app/(site)/` 또는 `app/` 루트(`/`, `/result`, `/expert`) | **`app/(admin)/admin/...`** 라우트 그룹 (전용 layout) |
| API | `app/api/classify`, `app/api/experts` | **`app/api/admin/**`** (전부 인증 가드) |
| 컴포넌트 | `components/` (기존) | **`components/admin/`** 전용 |
| 로직 | `lib/` (gemini, audio 등) | **`lib/admin/`** (queries, auth, audit) |
| 타입 | `lib/types.ts` (공유 도메인) | 공유 + `lib/admin/types.ts` (어드민 전용) |
| 인증 경계 | 없음(공개) | `middleware.ts`에서 `/admin`·`/api/admin` 매처로 세션 검증 |
| 네이밍 규약 | — | 어드민 파일/폴더는 항상 `admin/` 하위. 루트 혼재 금지 |

- **대안(문서화만, 미채택)**: pnpm/turbo 모노레포 `apps/web` + `apps/admin` + `packages/shared`. 규모·팀 확장 시 전환. 지금은 인앱 분리가 비용 0·즉시.
- **검증 포인트**: 소비자 번들에 어드민 코드 미혼입(라우트 그룹·동적 import), 소비자 E2E 회귀 0.

### 6.5 전문가 일괄 업로드 설계 방향 (FR-09~11)

- **포맷**: CSV 주(主) — UTF-8(BOM 허용). Excel은 선택: 클라이언트에서 SheetJS로 CSV 정규화 후 동일 파이프라인. 의존성 최소화 위해 MVP는 CSV 우선, xlsx는 Low.
- **템플릿**: `experts` 스키마 기준 헤더 고정 CSV 다운로드 — `name,vertical,specialties,region,phone,experience_years,bio,youtube_url,is_available,is_active`. 예시행·작성규칙 포함.
- **배열 컬럼 인코딩**: `specialties`(Postgres `text[]`)는 CSV에서 **`|` 구분**(예: `형사|성범죄|사기`). 규칙을 템플릿·검증에 명시.
- **검증(서버, `lib/admin/`)**: 행 단위 — `vertical` ∈ {lawyer,labor,adjuster,tax,doctor}, 필수값(name/vertical/region/phone), `experience_years` 정수, 전화 형식, 중복(phone 기준) 감지. **오류 행은 사유와 함께 리포트**.
- **흐름**: 업로드 → 파싱·검증 → **미리보기(정상/오류 행 구분)** → 운영자 확정 → 정상 행만 일괄 insert(부분 성공 허용) → 결과 요약 + 감사 로그(FR-06) 적재.
- **위치**: `app/api/admin/experts/import` + `lib/admin/csv.ts` + `components/admin/` — §6.4 분리 경계 준수. 파일 크기 상한·서버 검증 필수(보안).

---

## 7. Convention Prerequisites

- [x] `tsconfig.json`, Next 16 설정 존재
- [ ] `docs/01-plan/conventions.md` 미작성 — 어드민 분리 규약은 본 문서 §6.4가 1차 기준
- 환경변수(서버): `NEXT_PUBLIC_SUPABASE_URL`(**미설정→설정 필요**), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, Supabase Auth 관련. 기존 `NEXT_PUBLIC_ADMIN_PASSWORD`는 FR-04로 **폐기 예정**.

### 7.x 선결 조건 (착수 전)

| # | 항목 | 담당 |
|---|------|------|
| D-01 | 실 Supabase 프로젝트 + URL/키 발급, `.env.local`·Vercel 등록 | 운영자/개발 |
| D-02 | `experts` 테이블 + RLS + (필요시) `audit_log` 스키마 적용 (`supabase-setup.sql` 기반 확장) | 개발 |
| D-03 | Supabase Auth 활성 + 최초 super_admin 계정 | 운영자 |
| D-04 | ✅ 확정: **shadcn/ui + TanStack Table** (2026-05-19) | 결정 완료 |
| D-05 | ✅ 확정 2026-05-19 — design §4.1 (헤더 고정, `specialties` `|`, phone `^[0-9-]{7,20}$` 중복키, vertical 5종 enum, 기본값 규칙) | 결정 완료 |

---

## 8. Next Steps

1. [ ] D-04(어드민 UI 방식) 사용자 결정
2. [ ] `/pdca design admin-dashboard` — §6.4 분리 구조·인증·스키마 상세 설계
3. [ ] D-01~D-03 선결 환경 준비
4. [ ] 구현 → 검증(소비자 회귀 0 포함)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-19 | 초안 — 어드민 대시보드, 소스 분리(§6.4) 1급 요구 반영 | Kim KJ |
| 0.2 | 2026-05-19 | 전문가 CSV/Excel 일괄 업로드 추가 (FR-09~11, §6.5, D-05) | Kim KJ |
| 0.3 | 2026-05-19 | 어드민 UI 선택 가이드 §6.2.1 추가 (Refine vs shadcn, D-04) | Kim KJ |
