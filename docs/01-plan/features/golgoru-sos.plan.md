---
template: plan
version: 1.2
feature: golgoru-sos
date: 2026-05-19
author: Kim KJ
project: golgoru-sos
version_project: 0.1.0
---

# golgoru-sos Planning Document (프로젝트 맥락 통합본)

> **Summary**: 골고루 5개 전문직 버티컬을 잇는 "문제 → 전문가 매칭 엔진"의 첫 구현체. 이 저장소(golgoru-sos)는 전략 워크스페이스 `../golgoru`에서 도출된 **수요 엔진(Demand Engine) SOS MVP**를 실제 코드로 구현한다.
>
> **Project**: golgoru-sos
> **Version**: 0.1.0
> **Author**: Kim KJ
> **Date**: 2026-05-19
> **Status**: Baseline — MVP 구현 진행 중(do). 본 문서는 후속 PDCA에 맥락을 전달하는 통합 플랜.
> **출처**: `/Users/kimkookjin/Projects/golgoru/` 전략 문서 8종 분석·정리

---

## 0. 두 저장소의 관계 (가장 먼저 이해할 것)

| 저장소 | 역할 | 산출물 |
|--------|------|--------|
| `Projects/golgoru` | **전략·기획 워크스페이스** (코드 없음) | 비즈니스 전망, 제품 전략 SSoT, 콘텐츠/도메인/브랜드 전략, 린 검증 방법론 |
| `Projects/golgoru-sos` | **실제 구현 (이 저장소)** | SOS 전문가 매칭 웹앱 = 전략의 **수요 엔진(Demand Engine) Phase 1 MVP** |

- `golgoru`의 SSoT는 [`product-strategy-foundation.md`]이며, 모든 제품 결정은 그 원칙과 충돌 불가.
- `golgoru-sos`는 그 전략 중 **"문제 → 전문가 매칭"** 한 조각을 먼저 검증하는 실행체다.
- 따라서 이 저장소의 기능 결정은 §4 전략 원칙을 **설계 제약**으로 받는다.

---

## 1. Overview

### 1.1 Purpose

> "긴급 상황에서 30초 안에 적합한 전문가 전화번호를 받는 SOS 앱"

소비자가 자연어(텍스트/음성)로 상황을 입력하면, AI가 5개 버티컬 중 적합한 전문가군과 긴급도를 분류하고, 즉시 통화 가능한 전문가 1~3명을 추천·연결한다.

### 1.2 Background (Why — 왜 이 사업이 되는가)

- (주)골고루보상은 변호사·공인노무사·손해사정사·세무사·의사 5개 전문직을 유료 멤버로 보유, 유튜브 5채널 운영 중.
- **공급(전문가) 측 수요는 이미 검증됨** — 전문가는 "인지도 + 자기만족 + 고객 유치" 3중 효과에 반응. 더 이상 검증 대상 아님.
- **미검증 핵심 4질문 (이 MVP가 답해야 할 것)**:
  1. 일반 소비자가 돈 내고 쓸 것인가? (B2C WTP)
  2. 멀티 버티컬이 소비자에게 혼란이 아닌 매력인가?
  3. 추천 매칭이 만족스러운 경험을 만드는가?
  4. 유튜브 유입이 웹 플랫폼으로 실제 전환되는가?
- 현행 웹(golgoruteam.co.kr)은 디렉토리 + 카카오 CS 수준으로 **긴급 매칭·수요 엔진 자체가 없음** → 이 앱이 그 공백을 채움.

### 1.3 Related Documents (전략 출처)

- SSoT: `../golgoru/docs/product-strategy-foundation.md` — 통합 전략 원칙
- Why: `../golgoru/docs/business-analysis.md` — 5버티컬 시장 전망
- 도메인: `../golgoru/docs/platform-domains.md` — 10개 관리 도메인 (매칭 엔진 = Phase 1 핵심)
- 콘텐츠: `../golgoru/docs/viral-hybrid-strategy.md` — 70:30 유입 미끼 전략
- 브랜드: `../golgoru/docs/brand-positioning-discussion.md` — 평평한 입구/수직 프로필, 7→49→343→777 로드맵
- 리스크 점검: `../golgoru/docs/startup-coaching-checkpoint.md` — 중립 성공 점검
- 원본 MVP 기획/설계: `../golgoru/docs/01-plan|02-design/features/sos-expert-matching-mvp.*`
- 본 저장소 음성 설계: [voice-input-gemini.design.md](../../02-design/features/voice-input-gemini.design.md)

---

## 2. Scope

### 2.1 In Scope (SOS MVP v1.0 — 수요 엔진)

| # | 기능 | 우선순위 | 구현 상태(현재) |
|---|------|----------|----------------|
| F-01 | 자연어 텍스트 입력 | P0 | ✅ 구현됨 (`SosInput.tsx`) |
| F-02 | 음성 입력 | P0 | ⚠️ Web Speech API(iOS 미지원) → `voice-input-gemini`로 개선 설계 완료 |
| F-03 | AI 버티컬 분류 + 긴급도 판단 | P0 | ✅ Gemini 2.5 Flash-Lite(thinking off, ~1.5s) + 로컬 키워드 폴백 (`lib/gemini.ts`) |
| F-04 | 전문가 추천 1~3명 표시 | P0 | ✅ (`/result`, `ExpertCard`) |
| F-05 | 전화번호 표시 + tel: 연결 | P0 | ✅ (`CallButton`) |
| F-06 | 전문가 프로필 상세 | P1 | ✅ (`/expert/[id]`) |
| F-07 | 유튜브 영상 링크 | P1 | ✅ |
| F-08 | 전문가 DB 어드민 | P1 | ✅ (`/admin`, 단순 비밀번호 인증) |

### 2.2 Out of Scope (v2 이후 — 전략상 Phase 2~3)

- 앱 내 채팅/영상통화, 소비자 회원가입/로그인, 결제·매칭 수수료
- 리뷰/평점, 매칭 이력 DB(problems/matches 테이블), 푸시 알림
- 공급 엔진 풀셋(심사·감수 워크플로우·정산), 콘텐츠 파이프라인, 이중 KPI 대시보드
- 네이티브 앱(현재 웹/PWA 우선, RN은 후순위)

> **주의**: 전략 문서의 `problems`/`matches` 테이블·스코어링 가중치·데이터 플라이휠은
> Phase 2 이후. 현재 DB는 `experts` 단일 테이블만 존재(매칭 기록 미적재).

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 자연어 입력 → 버티컬+긴급도 분류 (5버티컬: lawyer/labor/adjuster/tax/doctor) | High | Done |
| FR-02 | 음성 입력 전 브라우저 지원 (iOS Safari 포함) | High | Designed (voice-input-gemini) |
| FR-03 | 분류 결과 기반 전문가 Top 1~3 추천 (is_available 우선, 경력 내림차순) | High | Done |
| FR-04 | tel: 링크로 즉시 전화 연결 | High | Done |
| FR-05 | 운영자 전문가 CRUD 어드민 | Medium | Done |
| FR-06 | Gemini 장애 시 로컬 키워드 폴백으로 서비스 지속 | High | Done |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| Performance | 입력 → 추천 결과 도달 10초 이내 (Gemini 응답 포함) | 수동/QA 측정 |
| Compatibility | iPhone SE(375px)~Pro Max(430px) 모바일 정상, iOS Safari 음성 동작 | 실기기 |
| Cost | MVP 거의 무료 (Vercel Hobby + Supabase Free + Gemini Free) | 청구서 |
| Reliability | 외부 AI 장애 시에도 분류 결과 반환(폴백) | 장애 주입 |
| Compliance | 추천이 "중개·알선"이 아닌 "정보 제공" 구조 (§5 규제) | 법무 검토 |

---

## 4. 전략 원칙 (제품 설계의 절대 제약 — SSoT 발췌)

이 8개 원칙은 `golgoru` SSoT에서 확정된 것으로, 기능 결정 시 우선 적용한다.

1. **만들지 말고 팔아라** — 코드보다 검증 우선. MVP는 검증 도구.
2. **전문가 직업군 선택은 시스템의 몫** — 소비자는 "내 문제"만 입력. 홈에 전문직 카테고리 타일 금지, 자연어 입력창 단일 진입(모래시계 아키텍처).
3. **공급은 독립, 수요는 통합** — 소비자 입구 1개 → AI 분류 → 5버티컬 백엔드(멀티테넌트).
4. **매칭이 심장, 콘텐츠는 연료** — 유튜브/콘텐츠는 유입 미끼, 매칭이 수익 엔진. (이 저장소 = 매칭/심장)
5. **룰 70% + AI 30%** — MVP는 LLM 1콜 분류 + 단순 룰 추천. 딥러닝 금지. 데이터 플라이휠로 후에 정교화.
6. **규제는 설계 제약** — 합법 구조가 기능보다 먼저(§5).
7. **데이터가 해자** — 매칭 기록 누적이 경쟁력(Phase 2 problems/matches에서 실현).
8. **777은 숫자가 아닌 브랜드** — 평평한 입구 + 수직(자부심) 프로필. 7→49→343→777 단계 성장.

### 4.1 경쟁 해자 (다른 플랫폼이 못 하는 것)

로톡(변호사)·강남언니(성형)·삼쩜삼(세무)는 단일 버티컬. 골고루는 **교차 문제**(예: 교통사고 → 변호사+손해사정사+의사) 동시 매칭 가능한 유일 플랫폼. 단, "소비자에게 직업 분류를 강요하지 않을 때만" 유효.

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **규제 — 변호사법 §34 / 의료법 §27 (중개·알선·유인 금지)** | High (형사처벌·서비스 중단) | Medium | "매칭 중개"가 아닌 **정보 제공/플랫폼 이용료** 구조로만 설계. 로톡·강남언니 판례 학습. 수익화 전 법무 자문 필수. 수수료 모델 MVP 배제 |
| **치킨앤에그 — 공급 전문가 풀 부족** | High | High | 전문가 5명이면 "그 변호사가 그 변호사" 반복 → 버티컬별 시드 전문가 우선 확보. 미달 시 7→49→343→777 단계 로드맵으로 희소성 프레이밍 |
| **수요 미검증 — 소비자 WTP 불명** | High | High | 앱 완성과 병행해 "전화1→매칭1→결제1" 수동 실험. 미끼 AI 진단 1개로 유입 A/B |
| **유튜브 조회수 ≠ 전환** | Medium | High | 유튜브→웹 외부링크 클릭률, 웹→전화 전환율 실측 후 의사결정 |
| **음성입력 iOS 미지원** | Medium | High (확정) | `voice-input-gemini` 설계로 MediaRecorder+Gemini 오디오 전환 |
| **자원 분산 (대표가 콘텐츠·영업·개발·운영 동시)** | Medium | Medium | "지금 가장 중요한 1가지" = 수요 엔진 검증으로 집중 |

---

## 6. Architecture Considerations

### 6.1 Project Level

| Level | Selected |
|-------|:--------:|
| Starter | ☐ |
| **Dynamic** (BaaS 연동 풀스택) | ☑ |
| Enterprise | ☐ |

### 6.2 Key Architectural Decisions (as-built)

| Decision | Selected | Rationale |
|----------|----------|-----------|
| Framework | Next.js 16 App Router + React 19 | 모래시계 단일 입구·SSR·API Route 일체화 |
| AI 분류 | 텍스트=Gemini 2.5 Flash-Lite(thinking off), 오디오=2.5 Flash(thinking off) + 로컬 폴백 | 무료 티어(2.0-flash는 limit:0), thinking off로 7s→~1.5s, 장애 내성 |
| Backend/DB | Supabase (Postgres + RLS, `experts` 단일 테이블) | 자동 REST·무료 시작·운영 부담 0 |
| 음성 | (현행) Web Speech API → (개선) MediaRecorder + Gemini 오디오 | iOS Safari 지원 확보 |
| 호스팅 | Vercel (Hobby 무료 → Pro 단계 승급) | 가성비 + 자동 확장, Next.js 정합 |
| 어드민 인증 | 환경변수 단순 비밀번호 | MVP 범위, 복잡 auth 배제 |

### 6.3 데이터 모델 현황 vs 전략 목표

```
[현재 구현]  experts (단일 테이블, RLS: 활성 전문가 공개 조회)
[전략 목표]  experts + problems(문제 제출) + matches(매칭 결과) → 데이터 플라이휠
             → Phase 2 진입 시 추가. 현재는 매칭 기록 미적재(검증 단계라 의도적).
```

---

## 7. Convention Prerequisites

- [x] `CLAUDE.md` / `AGENTS.md` 존재 — "이 Next.js는 학습데이터와 다름, node_modules 문서 먼저 읽을 것" 규칙 명시
- [ ] `docs/01-plan/conventions.md` 미작성 (Phase 2 필요 시)
- [x] `tsconfig.json` / Next 16 설정 존재
- 환경변수: `GEMINI_API_KEY`(서버), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`(서버), `ADMIN_PASSWORD`(서버)

---

## 8. 로드맵 (전략 단계 정합)

| Stage | 전문가 풀 | 기간 | 이 저장소의 역할 |
|-------|----------|------|------------------|
| Phase 0 (린 검증) | 7 Founders | 현재 | SOS MVP = 검증 도구 + 수동 실험 병행 |
| Phase 1 (MVP) | 49 Pioneers | Go 후 0~3M | **수요 엔진(이 앱)** + 시드 전문가 + 음성 개선 |
| Phase 2 | 343 Architects | 3~9M | problems/matches 테이블, 스코어링, 감수 워크플로우 |
| Phase 3 | 777 Masters | 9M~ | 자동 정산, B2B CRM, 외부 API, 콘텐츠 파이프라인 |

> "777은 목표가 아닌 정상(頂上)" — 일시 모집 아닌 단계 성장으로 미달·품질희석 리스크 방어.

---

## 9. Next Steps

1. [ ] 본 통합 플랜을 후속 PDCA의 맥락 기준 문서로 사용
2. [ ] `voice-input-gemini` 설계 검토 → `/pdca do voice-input-gemini` 구현 진입
3. [ ] (전략 병행) 수요 검증: 전화1→매칭1→결제1 수동 실험, 미끼 AI 진단 A/B
4. [ ] 수익화 착수 전 변호사법/의료법 법무 자문 (구조 합법성 확정)
5. [ ] Phase 2 진입 조건 충족 시 `problems`/`matches` 스키마 → `/phase-1-schema`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-19 | golgoru 전략 문서 8종 분석·통합 초안 (맥락 전달용) | Kim KJ |
