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

운영자가 (1) **전문가 등록·수정·상태 관리 및 초대 링크 발송**, (2) **사용자 상담 요청 목록 모니터링**, (3) **접속자/권한 관리**를 수행하는 어드민 대시보드와 사용자가 조회하는 **전문가 개별 미니홈피 웹 서비스**를 구축합니다. 어드민 영역은 소비자 웹앱과 라우트·인증·번들이 명확히 분리된 영역(`/admin`)으로 개발됩니다(§6.4).

### 1.2 Background

- MVP는 소비자/어드민/미니홈피가 동일 Next.js 저장소 내에서 라우트 그룹으로 분리 운영되므로, 어드민 영역은 §6.4의 강한 경계(라우트·인증·번들 분리)로 소비자 영역과 보안 경계를 명확히 구분합니다.
- 어드민 등록 프로세스: 운영자가 전문가 이메일 등 기본 정보 등록 -> 해당 이메일로 비밀번호 설정 초대 링크 자동 발송 -> 전문가가 비밀번호 설정 후 전문가용 로그인.
- 어드민 인증은 Supabase Auth 기반 로그인 및 세션 제어를 기반으로 견고하게 구현합니다.

### 1.3 Related Documents

- 상위: `docs/01-plan/features/golgoru-sos.plan.md`
- 전략: `../golgoru/docs/platform-domains.md` §2-1, §2-10 / `product-strategy-foundation.md`
- 메모리: [[expert-recommendation-random]] (전문가 노출은 랜덤 추천 — 어드민에서 품질 랭킹 노출 금지)

---

## 2. Scope

### 2.1 In Scope (MVP v1.0)

- [x] **어드민/공개 웹 아키텍처** — Next.js 단일 저장소에서 어드민(`(admin)`)과 소비자/공개 전문가 페이지(`(site)`) 라우트 그룹 분리 제공
- [x] **Supabase 실연결** (URL, publishable/secret key를 통한 Server-side 관리 및 RLS 설정)
- [x] **전문가 CRUD 및 상태/운영시간·카테고리 관리** — 전문가 추가/수정, 운영 시간(평일·주말·야간), 상담 상태(3종), 전문 카테고리 칩
- [x] **전문가 일괄 등록** — CSV 업로드·파싱, 스키마 강검증(운영시간·상태·카테고리), 한글 헤더/값 + BOM
- [x] **카테고리 관리** — `/admin/categories` 직업별 코드 조회·라벨수정·활성토글·추가 (CSV 입력 참고)
- [x] **어드민 인증 및 권한 제어** — Supabase Auth 기반 관리자(super_admin / operator) 로그인 + 감사 로그(Audit Log)

### 2.1.x Post-MVP (향후 요구사항에 따라 적용)

- [ ] **전문가 계정 초대 발송 시스템 (FR-04)** — 운영자 등록 → Supabase Auth 비밀번호 설정 이메일 초대. *전문가 로그인이 필요해질 때 착수* (D-03 SMTP 설정 동반)
- [ ] **상담 요청 모니터링 (FR-07)** — `requests` 리스트 조회·수락/거절 확인. *상담요청 루프(Post-MVP)와 함께 착수*

### 2.2 Out of Scope (차기)


- KPI·차트 대시보드(이중 KPI — 전략 Phase 2, 시각화 도구는 이때 검토)
- platform-domains 10개 도메인 전체(콘텐츠 파이프라인·감수·정산·CRM)
- 소비자 회원/세션 분석, 푸시, 결제
- 멀티테넌트 직업별(7직업) 분리 운영(전략 Phase 2~3)

---

## 3. Requirements

### 3.1 Functional Requirements

> **구현 현황 기준일: 2026-06-11.** 실제 코드 기준으로 Status 갱신. FR-04·FR-07은 MVP 미구현(향후 요구사항에 따라 적용 예정).

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| **FR-01** | 어드민 영역(`/admin`)과 공개 전문가 페이지 영역의 명확한 라우팅 및 레이아웃 분리 | High | ✅ Done (`(admin)` vs `(site)` 그룹) |
| **FR-02** | Supabase 연결 및 `experts`, `requests`, `likes`, `audit_log`(+ `categories`, `expert_categories`) 테이블 스키마/RLS 적용 | High | ✅ Done |
| **FR-03** | 전문가 상세 정보 CRUD (활동 분야·카테고리, 평일/주말 운영시간, 야간 상담 가능 여부 포함) | High | ✅ Done |
| **FR-04** | 전문가 이메일 초대 발송 시스템 (Supabase Auth 기반 임시 계정 및 활성화 이메일 발송) | High | ⏸ **Post-MVP** — MVP 미구현, 향후 요구사항에 따라 적용 (전문가 로그인 필요 시) |
| **FR-05** | Supabase Auth 기반 어드민 로그인 및 역할 제어 (super_admin, operator) | High | ✅ Done |
| **FR-06** | 어드민 내 관리자 활동(등록, 수정, 활성 변경, 카테고리 등) 감사 로그 자동 기록 | Medium | ✅ Done |
| **FR-07** | 일반 사용자가 보낸 상담 요청(`requests`) 리스트 실시간 모니터링 | Medium | ⏸ **Post-MVP** — MVP 미구현, 향후 요구사항에 따라 적용 (상담요청 루프와 함께) |
| **FR-08** | 전문가 CSV 일괄 업로드 (성명, 직군, 상세 운영시간, 상태, 카테고리 유효성 강검증) | High | ✅ Done (한글 헤더·값 + BOM) |
| **FR-09** | 어드민 내부 데이터 템플릿(CSV) 다운로드 기능 제공 | High | ✅ Done |

### 3.2 Non-Functional Requirements

| Category | Criteria | Method |
|----------|----------|--------|
| **Security** | 미인증 사용자 어드민 경로(`/admin`) 접근 완전 차단 (Next.js Middleware 활용) | 로그인 세션 가드 테스트 |
| **Privacy** | 전문가 연락처 및 개인 정보 RLS(Row Level Security)로 조회 권한 엄격 통제 | Supabase RLS Policy 검증 |
| **Separation** | 공개 미니홈피 웹뷰 경로(`/profile/[id]`)와 어드민 경로의 번들/인증 정보 공유 엄금 | 번들 분리 상태 점검 |
| **Cost** | Supabase Free tier 및 Vercel Hobby tier 내에서 추가 비용 없이 구동 | 리소스 모니터링 및 청구서 |


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
| 어드민 UI | Refine / shadcn / **Tailwind 직접 + TanStack** | **Tailwind + TanStack Table (확정 개정 2026-06-11 — shadcn/ui 미도입)** | MVP 범위 한정·풀컨트롤·의존성 최소. 테이블 로직은 TanStack, UI는 Tailwind 직접 작성. shadcn은 어드민 대규모 성장 시 재검토 |
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

> **결정(개정 2026-06-11)**: 위 비교는 초기 검토 기록. 실제 구현은 **shadcn/ui 미도입 — Tailwind 직접 + TanStack Table**로 확정. 의존성 최소·풀컨트롤·MVP 범위 한정이 이유. 향후 어드민이 10도메인/멤버관리/대시보드로 성장하면 shadcn(또는 Refine) 도입을 그때 재검토(작을 때 도입이 리트로핏보다 저렴 — 성장 확정 시점에 결정).

### 6.3 Clean Architecture

```
Dynamic — 어드민 영역과 공개 미니홈피 영역의 디렉토리·라우트·인증 분리(§6.4)
```

### 6.4 소스 분리 전략 ⭐ (핵심 요구)

**원칙: "공개 미니홈피 프로필 영역과 어드민 대시보드 영역은 코드·라우트·인증 경계를 완벽히 분리한다."**

| 영역 | 공개 미니홈피 (`/profile`, 공개) | 어드민 대시보드 (`/admin`, 인증필수) |
|------|------------------------|------------------------|
| **라우트** | `app/(profile)/profile/[id]` (웹뷰/공유 뷰) | **`app/(admin)/admin/...`** 라우트 그룹 (전용 layout) |
| **API** | `app/api/profile/**` (조회 전용) | **`app/api/admin/**`** (감사로그/인증 가드) |
| **컴포넌트** | `components/profile/` | **`components/admin/`** |
| **로직/쿼리** | `lib/profile/` | **`lib/admin/`** (queries, auth, audit) |
| **인증 경계** | 없음 (공개 접근) | `middleware.ts`에서 `/admin` 및 `/api/admin` 세션 검증 |

- **검증 포인트**: 공개 미니홈피 웹뷰의 페이지 번들에 관리자 전용 어드민 모듈/코드가 누출되지 않도록 최적화.

### 6.5 전문가 일괄 업로드 설계 방향 (FR-08~09)

- **포맷**: CSV (UTF-8, BOM 허용)
- **템플릿**: `experts` 스키마 기준 헤더 고정 CSV 다운로드 — `name,vertical,specialties,region,phone,experience_years,bio,youtube_url,weekday_start,weekday_end,weekend_available,night_available,status`.
- **운영시간 및 상태 포맷**:
  - `weekday_start/end`: HH:mm 형식 (예: `09:00`, `18:00`)
  - `weekend_available` / `night_available`: `Y` 또는 `N`
  - `status`: `available`(상담 가능), `delayed`(응답 지연 가능), `unavailable`(상담 불가)
  - `specialties`(배열형): `|` 구분 기호 사용 (예: `교통사고|손해배상|개인회생`)
- **검증(서버)**: 행 단위 스키마 검증 진행. 유효하지 않은 포맷이나 잘못된 enum 값은 에러 리포트에 기재하여 다운로드 제공.
- **흐름**: 업로드 → 서버 검증 및 파싱 → 미리보기(오류 발생 행 및 원인 명시) → 운영자 승인 → 일괄 등록 처리.


---

## 7. Convention Prerequisites

- [x] `tsconfig.json`, Next 16 설정 존재
- [ ] `docs/01-plan/conventions.md` 미작성 — 어드민 분리 규약은 본 문서 §6.4가 1차 기준
- 환경변수(서버): `NEXT_PUBLIC_SUPABASE_URL`(**미설정→설정 필요**), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, Supabase Auth 관련. 기존 `NEXT_PUBLIC_ADMIN_PASSWORD`는 FR-04로 **폐기 예정**.

### 7.x 선결 조건 (착수 전)

| # | 항목 | 담당 |
|---|------|------|
| D-01 | 실 Supabase 프로젝트 + URL/키 발급, `.env.local`·Vercel 등록 | 운영자/개발 |
| D-02 | `experts`, `requests`, `likes`, `audit_log` 테이블 스키마 및 RLS 정책 적용 | 개발 |
| D-03 | Supabase Auth 이메일 초대 템플릿(비밀번호 재설정 페이지 링크 포함) 및 SMTP 설정 | 운영자/개발 |
| D-04 | ✅ 확정(개정 2026-06-11): **Tailwind 직접 + TanStack Table** (shadcn/ui 미도입) | 결정 완료 |
| D-05 | ✅ 확정: CSV 일괄 업로드 컬럼 스키마 및 데이터 유효성 검증 포맷 정의 | 결정 완료 |

---

## 8. Next Steps

**완료 (MVP)**
1. [x] Supabase 테이블 생성·RLS (`experts`/`requests`/`likes`/`audit_log` + `categories`/`expert_categories`)
2. [x] Tailwind 직접 + TanStack 어드민 UI, 라우팅 격리(`(admin)`)
3. [x] 전문가 CRUD(운영시간·상태·카테고리) + 감사 로그
4. [x] CSV 파서(`lib/admin/csv.ts`)·일괄 업로드(한글 헤더/값·BOM)·템플릿
5. [x] 카테고리 관리 화면(`/admin/categories`)

**Post-MVP (향후 요구사항에 따라 적용)**
6. [ ] (FR-04) Supabase Auth/SMTP 연동 + 전문가 계정 초대 이메일 발송 — *전문가 로그인 필요 시*
7. [ ] (FR-07) 상담 요청(`requests`) 리스트 모니터링 화면 — *상담요청 루프와 함께*


---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-19 | 초안 — 어드민 대시보드, 소스 분리(§6.4) 1급 요구 반영 | Kim KJ |
| 0.2 | 2026-05-19 | 전문가 CSV/Excel 일괄 업로드 추가 (FR-09~11, §6.5, D-05) | Kim KJ |
| 0.3 | 2026-05-19 | 어드민 UI 선택 가이드 §6.2.1 추가 (Refine vs shadcn, D-04) | Kim KJ |
| 0.4 | 2026-06-11 | 코드 정합화 — D-04를 **Tailwind+TanStack(shadcn 미도입)** 으로 개정, FR Status 현행화, **FR-04·FR-07을 Post-MVP**(향후 적용)로 이동, categories/카테고리 관리·한글 CSV 반영 | Kim KJ |
