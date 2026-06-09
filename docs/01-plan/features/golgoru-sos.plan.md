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

## 0. 전체 서비스 구성 및 아키텍처 (가장 먼저 이해할 것)

> **⚠️ 아키텍처 결정 (2026-06-09 정정)**: MVP 검증 단계의 소비자 앱은 **Next.js 웹(PWA)** 으로 구현·검증한다. 저장소에 이미 동작하는 웹 소비자 플로우([app/(site)/](../../../app/(site)/))·어드민·웹 기반 음성입력이 존재하며, 전략 원칙 #1("만들지 말고 팔아라 — MVP는 검증 도구")·#4("유튜브 유입") 및 "거의 무료" 예산과 1인 자원 제약상 두 번째 코드베이스(Flutter) 도입은 검증을 지연시킨다. **Flutter 네이티브 앱은 수요 검증 이후 Phase 2의 옵션으로 미룬다**(아래 표 참조). 푸시 알림 등 Flutter 고유 가치 항목은 §2가 이미 "배포 직전 마지막 단계"로 분리해 둠.

| 영역 | 플랫폼 | 주요 역할 | 산출물 및 특징 |
|---|---|---|---|
| **소비자 앱 (MVP)** | **Next.js 웹 / PWA (Vercel)** | 일반 사용자 상황 입력(텍스트/음성), AI 추천 결과 확인, 상담 요청 | 모바일 브라우저 우선. `tel:`/`sms:`는 모바일 브라우저 네이티브 동작. 홈 화면 추가(PWA)로 앱 유사 체감 |
| **백엔드** | **Supabase** | Auth, Database, Storage, Edge Functions, Realtime | API Serverless 아키처 (Gemini API Key는 Edge Functions/서버 라우트에서 보안 관리) |
| **관리자 페이지** | **Next.js + Vercel** | 전문가 등록/관리, 상담 요청 내역 모니터링 | 운영자 전용 어드민 대시보드 웹 ([app/(admin)/](../../../app/(admin)/) 구현됨) |
| **전문가 미니홈피** | **Next.js + Vercel** | 전문가별 공개 프로필 및 상세 정보 제공 | 웹 라우트로 제공([app/(site)/expert/[id]](../../../app/(site)/expert/)). 향후 네이티브 앱 도입 시 WebView 타겟 |
| **(Phase 2 옵션) 네이티브 앱** | **Flutter (Android/iOS)** | 푸시 알림(FCM/APNs) 등 네이티브 고유 기능이 검증으로 필요해질 때 | 수요 검증 완료 후 착수 결정. MVP 범위 아님 |

- 모든 제품 결정은 `Projects/golgoru`의 SSoT인 [`product-strategy-foundation.md`] 원칙을 준수합니다.
- 이 저장소(`golgoru-sos`)는 위 구성 요소들(소비자 웹 + 어드민 + 미니홈피)의 전체 소스코드와 기획 설계를 통합 관리합니다.

---

## 1. Overview

### 1.1 Purpose

> "긴급 상황에서 30초 안에 적합한 전문가를 확인하고 상담 요청을 보내는 SOS 서비스"

소비자가 자연어(텍스트/음성)로 상황을 입력하면, AI가 의미를 분석하여 적합한 전문가군과 긴급도를 분류하고, 즉시 대응 가능한 전문가 3~5명을 추천합니다. 사용자는 전문가의 미니홈피(웹뷰)를 확인하고 전화, 문자, 또는 상담 요청을 보낼 수 있습니다.

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

| # | 기능 | 우선순위 | 설명 |
|---|------|----------|------|
| **F-01** | 자연어 텍스트/음성 입력 | P0 | 소비자 웹앱에서 사용자 상황을 자연어로 텍스트 혹은 음성 입력 ([SosInput.tsx](../../../components/SosInput.tsx)) |
| **F-02** | AI 버티컬 분류 + 긴급도 판단 | P0 | Gemini API 기반 자연어 분석을 통해 5개 직군 분류 및 긴급도 자동 산출 (서버 라우트 `/api/classify` 경유, 키 서버 보관) |
| **F-03** | 전문가 추천 3~5명 표시 | P0 | 기본 모드(분야 적합도 우선) 및 긴급 모드(지역/거리/상태 가중) 기반의 카드형 추천 UI 제공 |
| **F-04** | 전문가 상세 미니홈피 | P0 | Next.js 웹 라우트로 전문가 공개 프로필 표시 (네이티브 앱 도입 시 WebView 타겟) |
| **F-05** | 상담 요청 프로세스 | P0 | 사용자가 전문가에게 상담 요청을 전송하고, 전문가는 요청 목록을 확인하여 수락/거절 및 간단 답변 전송 |
| **F-06** | 전문가 DB 어드민 | P1 | Next.js 기반 어드민 대시보드에서 전문가 추가/수정, 초대 링크 발송 기능 제공 |
| **F-07** | 전문가 상태 및 운영시간 관리 | P1 | 평일/야간/주말 운영 시간 스키마 설계 및 상담 상태(3종: 가능, 지연, 불가) 매칭 적용 |
| **F-08** | 가입자 기반 '좋아요' 평가 | P1 | **비즈니스 규칙**: 실제 상담 요청(연결 시도) 이력이 존재하는 사용자(세션 UUID 또는 계정)만 좋아요 평가 기능 권한 부여 |

> **⚠️ 구현 시점 유의사항 (중요)**
> - **실제 전화/문자 연결 (`tel:`, `sms:`) 및 푸시 알림 (FCM/APNs/알림톡)**은 MVP 구현의 가장 마지막 단계(배포 직전 디바이스 테스트 단계)에 도입합니다. 
> - **현재 개발 단계**에서는 알림 및 실제 전화/문자 연동 없이, UI 및 데이터 상태 전송(상담 요청 등록 -> 전문가 앱 내 요청 목록 수동 갱신/상태 업데이트) 중심으로 핵심 비즈니스 로직을 구축합니다.

### 2.2 Out of Scope (v2 이후 — 전략상 Phase 2~3)

- 앱 내 실시간 1:1 채팅방 및 화상통화 기능 (상담 요청 + 전문가 답변 메시지 1회까지만 MVP 스코프)
- 유료 결제 및 매칭 수수료 과금 모델
- 전문가 본인의 미니홈피 직접 프로필 수정 기능 (MVP는 어드민 등록 및 관리만 지원)
- 별점 평가 방식 (좋아요만 도입)
- AI 추천 이유 필수 표시 기능 (차기 업그레이드 검토)

> **주의**: 전략 문서의 `problems`/`matches` 테이블·스코어링 가중치·데이터 플라이휠은 Phase 2 이후. 현재 DB는 `experts` 및 `requests` (상담 요청용) 테이블만 존재(완전한 데이터 플라이휠 누적은 미적재).


---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| **FR-01** | 자연어 입력 → 버티컬+긴급도 분류 (5버티컬: lawyer/labor/adjuster/tax/doctor) | High | Gemini API 연동 완료 (Edge Function 구현 필요) |
| **FR-02** | 음성 입력 (웹 하이브리드 STT: Web Speech API + iOS Safari Gemini 오디오 폴백) | High | Designed/Implemented (voice-input-gemini) |
| **FR-03** | AI 분류 기반 전문가 Top 3~5명 추천 (기본 모드 vs 긴급 모드 추천 룰 적용) | High | Pending |
| **FR-04** | 전문가 미니홈피 표시 및 `tel:`, `sms:` 링크 연동 (모바일 브라우저 네이티브 동작) | High | Pending |
| **FR-05** | 상담 요청 프로세스 (상담 요청 생성 -> 전문가 앱 내 목록 조회 -> 수락/거절 및 답변) | High | Pending |
| **FR-06** | 실제 상담 연결(요청) 이력이 있는 사용자만 '좋아요' 평가 기능 제공 | High | Pending |
| **FR-07** | 어드민을 통한 전문가 등록/수정 및 초대 이메일 발송 | Medium | Pending |
| **FR-08** | Gemini 장애 시 로컬 키워드 폴백으로 서비스 지속 | High | Done |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement / Method |
|----------|----------|-------------|
| **Performance** | 상황 입력 → AI 분석 → 추천 결과 화면 도달 8초 이내 | 실기기 및 에뮬레이터 QA 측정 |
| **Compatibility** | Android 및 iOS 모바일 디바이스 지원 (다양한 해상도 최적화) | Android/iOS 실기기 테스트 |
| **WebView Integration** | 웹뷰 내부의 전화/문자 버튼이 네이티브 다이얼러 및 문자앱을 정상 호출 | Flutter WebView Controller URL Scheme 파싱 가드 |
| **Security** | Gemini API Key 등 민감 정보의 안전한 백엔드 관리 | Supabase Edge Functions 서버 측 호출만 허용 |
| **Compliance** | 추천이 "중개·알선"이 아닌 "정보 제공/단순 연결" 구조 유지 | 법무 자문 및 수수료 수취 배제 |


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
| **Dynamic** (Flutter + BaaS 하이브리드) | ☑ |
| Enterprise | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| **Framework** | Next.js 16 웹/PWA (소비자 + 어드민 + 미니홈피 단일 저장소) | MVP 검증 속도·무비용·유튜브 유입 정합. Flutter는 Phase 2 옵션(§0) |
| **AI 분류** | Next.js 서버 라우트 `/api/classify` + Gemini API (Flash-Lite, thinking off) | API Key의 안전한 관리를 위해 서버 측에서 Gemini 호출. 향후 Supabase Edge Function 이관 가능 |
| **Backend/DB** | Supabase (Postgres + RLS + Auth + Edge Functions) | 서버 구축 비용 최소화 및 Flutter/Next.js 통합 백엔드 활용 |
| **인증** | Supabase Auth | 전문가 Flutter 앱 로그인 및 어드민 로그인 통합 인증 |
| **상태 관리/운영시간** | DB 스키마 설계 반영 | 평일/주말 운영시간 및 야간 상담 여부를 전문가 테이블에 포함하여 관리 |
| **웹뷰 기기 연동** | WebView Controller URL Scheme 파싱 가드 | 웹뷰(Next.js) 내 `tel:`, `sms:` 클릭 시 단말기 다이얼러/문자 앱 연결 핸들링 |

### 6.3 데이터 모델 현황 vs MVP 최종 목표

```
[현재 구현 계획] 
- experts: 전문가 기본 인적 사항, 활동 분야, 상세 운영시간, 상담 상태
- requests: 사용자의 상담 요청 사항, 매칭 전문가 ID, 수락/거절 상태 및 답변 메시지
- likes: 상담 요청/연결 완료 이력이 확인된 사용자의 좋아요 평가 내역 (중복 방지 정책 적용)

[전략 목표 (Phase 2 이후)]
- problems(소비자 상세 문제 분석 데이터) + matches(실제 매칭 및 피드백 로그 데이터)
- 데이터 플라이휠 고도화 및 추천 알고리즘 딥러닝 전환
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

1. [ ] **(선결 1순위)** 실 Supabase 프로젝트 연결 + experts/requests/likes/audit_log 테이블 스키마·RLS·Auth 활성 (admin-dashboard D-01)
2. [ ] 소비자 핵심 루프 E2E 완성: 입력 → `/api/classify` 분류 → 추천 3~5명 → 상담요청(`requests`) 등록을 실데이터로
3. [ ] Next.js 어드민 대시보드(전문가 등록 + 초대 링크 이메일 발송) 실연결 마무리
4. [ ] 소비자 웹앱 PWA화(매니페스트·홈 화면 추가·기본 오프라인 셸)로 모바일 앱 유사 체감 확보
5. [ ] 수동 검증 실험 병행("전화1→매칭1") — WTP/유튜브 전환 실측 (코드 완성과 무관하게 즉시)
6. [ ] MVP 핵심 기능 완료 후, 배포 직전 단계에서 웹 푸시/알림톡 등 알림 및 실제 전화 연결 테스트
7. [ ] 수익화 착수 전 변호사법/의료법 법무 자문 (구조 합법성 확정)
8. [ ] (Phase 2 옵션) 수요 검증 후 Flutter 네이티브 앱 필요성 재평가 — 푸시/스토어 노출이 검증으로 확인될 때만


---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-19 | golgoru 전략 문서 8종 분석·통합 초안 (맥락 전달용) | Kim KJ |
| 0.2 | 2026-06-09 | **아키텍처 정정**: MVP 소비자 앱 = Next.js 웹/PWA로 확정(코드 현실 정합). Flutter는 Phase 2 옵션으로 강등. §0·F-01~05·FR-02~04·§6.2·§9 갱신 | Kim KJ |
