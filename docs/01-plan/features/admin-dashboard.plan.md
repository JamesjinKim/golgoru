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

운영자가 (1) **전문가 등록·수정·상태 관리 및 초대 링크 발송**, (2) **사용자 상담 요청 목록 모니터링**, (3) **접속자/권한 관리**를 수행하는 어드민 대시보드와 사용자가 조회하는 **전문가 개별 미니홈피 웹 서비스**를 구축합니다. 이 Next.js 프로젝트는 Flutter 모바일 앱과 완전히 분리된 독립 웹 환경으로 개발됩니다.

### 1.2 Background

- 소비자 앱은 Flutter로 모바일 환경에서 작동하므로 Next.js 프로젝트는 오직 **운영 관리 목적(Admin) 및 공유용 웹 프로필(미니홈피)** 역할로 제한하여 보안 경계를 명확히 구분합니다.
- 어드민 등록 프로세스: 운영자가 전문가 이메일 등 기본 정보 등록 -> 해당 이메일로 비밀번호 설정 초대 링크 자동 발송 -> 전문가가 비밀번호 설정 후 Flutter 앱 로그인.
- 어드민 인증은 Supabase Auth 기반 로그인 및 세션 제어를 기반으로 견고하게 구현합니다.

### 1.3 Related Documents

- 상위: `docs/01-plan/features/golgoru-sos.plan.md`
- 전략: `../golgoru/docs/platform-domains.md` §2-1, §2-10 / `product-strategy-foundation.md`
- 메모리: [[expert-recommendation-random]] (전문가 노출은 랜덤 추천 — 어드민에서 품질 랭킹 노출 금지)

---

## 2. Scope

### 2.1 In Scope (MVP v1.0)

- [ ] **어드민/미니홈피 웹 아키텍처** — Next.js 기반 단일 웹 저장소에서 어드민과 전문가용 공개 프로필 페이지(WebView 타겟) 동시 제공
- [ ] **Supabase 실연결** (URL, anon key, service role key를 통한 Server-side 관리 및 RLS 설정)
- [ ] **전문가 계정 초대 발송 시스템** — 운영자가 기본 인적 사항 입력 후 Supabase Auth를 통해 비밀번호 설정용 이메일 초대 링크 발송
- [ ] **전문가 CRUD 및 상태/운영시간 관리** — 전문가 정보 추가/수정, 운영 시간(평일, 주말, 야간) 및 상담 상태(3종) 관리
- [ ] **전문가 일괄 등록** — CSV 업로드 및 파싱, 스키마 정합성(운영시간 포함) 검증 후 일괄 등록 기능
- [ ] **상담 요청 모니터링** — Flutter 앱에서 적재되는 `requests` 테이블 데이터 조회 및 수락/거절 결과 확인
- [ ] **어드민 인증 및 권한 제어** — Supabase Auth 기반 관리자(super_admin / operator) 로그인 처리 및 감사 로그(Audit Log) 적재

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
| **FR-01** | 어드민 영역(`/admin`)과 공개 미니홈피 영역(`/profile`)의 명확한 라우팅 및 레이아웃 분리 | High | Pending |
| **FR-02** | Supabase 연결 및 `experts`, `requests`, `likes`, `audit_log` 테이블 스키마/RLS 적용 | High | Pending |
| **FR-03** | 전문가 상세 정보 CRUD (활동 분야, 평일/주말 운영시간, 야간 상담 가능 여부 포함) | High | Pending |
| **FR-04** | 전문가 이메일 초대 발송 시스템 (Supabase Auth 기반 임시 계정 및 활성화 이메일 발송) | High | Pending |
| **FR-05** | Supabase Auth 기반 어드민 로그인 및 역할 제어 (super_admin, operator) | High | Pending |
| **FR-06** | 어드민 내 관리자 활동(등록, 수정, 활성 변경 등) 감사 로그 자동 기록 | Medium | Pending |
| **FR-07** | 일반 사용자가 보낸 상담 요청(`requests`) 리스트 실시간 모니터링 | Medium | Pending |
| **FR-08** | 전문가 CSV 일괄 업로드 (성명, 직군, 상세 운영시간, 상태 필드 유효성 강검증) | High | Pending |
| **FR-09** | 어드민 내부 데이터 템플릿(CSV) 다운로드 기능 제공 | High | Pending |

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
| D-04 | ✅ 확정: **shadcn/ui + TanStack Table** 적용 | 결정 완료 |
| D-05 | ✅ 확정: CSV 일괄 업로드 컬럼 스키마 및 데이터 유효성 검증 포맷 정의 | 결정 완료 |

---

## 8. Next Steps

1. [ ] Supabase Database에 `experts`, `requests`, `likes`, `audit_log` 테이블 생성 및 RLS 정책 적용 (`supabase-setup.sql` 기반 수정)
2. [ ] Next.js 어드민용 이메일 발송 기능을 위한 Supabase Auth/SMTP 연동 확인
3. [ ] shadcn/ui 기반의 어드민 UI 레이아웃 빌딩 및 라우팅 격리 적용
4. [ ] 전문가 CRUD 및 이메일 초대 링크 발송 기능 구현
5. [ ] CSV 파서(`lib/admin/csv.ts`) 및 일괄 업로드 폼 모듈 개발
6. [ ] 일반 사용자 상담 요청(`requests`) 리스트 모니터링 화면 개발


---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-19 | 초안 — 어드민 대시보드, 소스 분리(§6.4) 1급 요구 반영 | Kim KJ |
| 0.2 | 2026-05-19 | 전문가 CSV/Excel 일괄 업로드 추가 (FR-09~11, §6.5, D-05) | Kim KJ |
| 0.3 | 2026-05-19 | 어드민 UI 선택 가이드 §6.2.1 추가 (Refine vs shadcn, D-04) | Kim KJ |
