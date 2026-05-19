---
template: design
version: 1.2
feature: voice-input-gemini
date: 2026-05-19
author: Kim KJ
project: golgoru-sos
version_project: 0.1.0
---

# voice-input-gemini Design Document

> **Summary**: 하이브리드 STT — 지원 브라우저(Chrome/Edge/Android)는 Web Speech API로 **실시간 받아쓰기**(지연 0·비용 0), iOS Safari 등 미지원 브라우저는 MediaRecorder→Gemini 2.5 Flash 오디오 폴백. 받아쓰기와 분류를 분리하여 분류는 제출 시 텍스트 경로로 수행. iOS 포함 전 브라우저 지원 + 다수 사용자 실시간 체감.
>
> **Project**: golgoru-sos
> **Version**: 0.1.0
> **Author**: Kim KJ
> **Date**: 2026-05-19
> **Status**: Draft
> **Planning Doc**: 상위 맥락 [golgoru-sos.plan.md](../../01-plan/features/golgoru-sos.plan.md) — 본 기능은 그 MVP의 **F-02(음성입력)** 개선 항목. 기능 단위 요구사항(R1~R5)은 §0 (사전 상담으로 확정)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | Schema Definition | N/A (DB 스키마 변경 없음) |
| Phase 2 | Coding Conventions | N/A (기존 코드 컨벤션 준수) |
| Phase 3 | Mockup | ✅ 기존 `SosInput.tsx` UI 유지 |
| Phase 4 | API Spec | 본 문서 §4 |

---

## 0. Requirements Summary (상위 Plan의 기능 단위 구체화)

본 기능은 [golgoru-sos.plan.md](../../01-plan/features/golgoru-sos.plan.md)의 **F-02(음성 입력, P0)** 를 구현 가능한 수준으로 구체화한 것이다. 별도 feature plan 문서를 만들지 않고, 사전 상담(AskUserQuestion)으로 확정한 요구사항을 여기 둔다. 각 항목은 상위 Plan의 결정사항과 추적 연결된다.

| # | 요구사항 | 확정값 | 상위 Plan 근거 |
|---|---------|--------|----------------|
| R1 | 음성 처리 방식 | **Gemini 오디오 직전송** (받아쓰기 + 분류 1콜) | Plan §4 원칙5 "룰70+AI30, LLM 1콜", §6.2 음성 결정 행 |
| R2 | 초기 운영 규모/예산 | **MVP·거의 무료** (Vercel Hobby + Supabase Free + Gemini Free 티어) | Plan §3.2 NFR(Cost), §6.2 호스팅 결정 |
| R3 | 브라우저 호환 | **iOS Safari 포함 전 브라우저** 동작 (현재 미지원 해소) | Plan §2 F-02 상태(⚠️ iOS 미지원), §5 리스크 "음성입력 iOS 미지원" |
| R4 | 폴백 | Gemini 실패 시 기존 로컬 키워드 분류기 유지 | Plan FR-06, §6.2 분류 결정(장애 내성) |
| R5 | 호스팅 제약 | Vercel Hobby: 함수 타임아웃 10s, 요청 본문 4.5MB 한도 내 동작 | Plan §6.2 호스팅(Hobby→Pro 단계 승급) |

> **추적성**: 상위 Plan의 전략 원칙(§4)·리스크(§5)와 충돌 시 Plan이 우선(SSoT). 본 §0은 그 제약 안에서의 기능 결정이다.

**문제 정의**: 현재 `components/SosInput.tsx`는 `webkitSpeechRecognition`을 사용 → 아이폰 Safari에서 음성 입력 불가. 긴급 상황 서비스 특성상 모바일·iPhone 사용자 비중이 커 핵심 기능이 다수 사용자에게 동작하지 않음. (Plan §5 리스크 테이블에 "음성입력 iOS 미지원, 확정"으로 등재 → 본 설계가 그 완화책)

---

## 1. Overview

### 1.1 Design Goals

- 전 브라우저(특히 iOS Safari)에서 음성 입력 동작
- STT 전용 인프라/API 추가 없이 기존 Gemini 호출 1회로 받아쓰기 + 분류 동시 처리
- 기존 텍스트 입력 흐름과 응답 스키마(`ClassifyResult`) 최대 재사용 — 변경 표면 최소화
- Vercel 무료 티어 제약(10s, 4.5MB) 안에서 안정 동작
- Gemini 장애 시에도 서비스 지속 (로컬 폴백 유지)

### 1.2 Design Principles

- **최소 변경**: 신규 엔드포인트 대신 기존 `/api/classify` 확장, 응답 타입 확장만
- **격리**: 음성 인코딩 로직을 별도 모듈로 분리해 `SosInput.tsx` 비대화 방지
- **점진적 향상(Graceful degradation)**: 마이크 미지원/거부 시 텍스트 입력으로 자연 폴백
- **포맷 신뢰성 우선**: 브라우저별 코덱 차이를 클라이언트에서 흡수 (§2.4 결정)

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────┐   ┌─────────────────────────┐   ┌──────────────┐
│  Client (Next.js/React)      │   │  Server (Route Handler) │   │  Gemini 2.5  │
│  SosInput.tsx                │   │  /api/classify (POST)   │   │  Flash       │
│                              │   │                         │   │              │
│  [지원] Web Speech API ──────┼─▶ textarea (실시간, 서버 미경유)│              │
│  [iOS] useAudioRecorder      │   │                         │   │              │
│        +encodeWav ───────────┼──▶│ FormData→ classifyAudio ┼──▶│ audio→transcr│
│  제출 시: query 텍스트 ───────┼──▶│ JSON → classifyQuery    ┼──▶│ text→분류    │
└──────────────────────────────┘   │   └ localClassify(폴백) │◀──┘ fallback    │
                                   └─────────────────────────┘
```

- **STT 경로 분기**: Web Speech 지원 시 브라우저 내 실시간 처리(서버·Gemini 미경유, 지연 0). 미지원(iOS Safari)만 오디오 업로드 폴백.
- **받아쓰기 ≠ 분류**: 두 경로 모두 결과는 textarea의 transcript뿐. **분류는 항상 제출 시 텍스트 경로(`classifyQuery`)로 분리** → STT 지연 경로에서 분류 추론 제거.

기존 Supabase(experts 조회)·결과 화면(`/result`)·라우팅은 **변경 없음**.

### 2.2 Data Flow

```
[마이크 버튼 탭]
  → Web Speech API 지원? ───────────────────────────────────┐
  ├─ 예(Chrome/Edge/Android):                                │
  │    SpeechRecognition(ko-KR, interim, continuous)         │
  │    → 말하는 동안 textarea에 실시간 누적(서버 미경유, 지연 0)│
  │    → [정지] 최종 텍스트 확정                                │
  └─ 아니오(iOS Safari 등):                                    │
       getUserMedia (거부 시 → 텍스트 입력 안내, 종료)          │
       → MediaRecorder 녹음(최대 60s, 파형 피드백)              │
       → encodeWav(16kHz mono) → FormData POST /api/classify   │
       → classifyAudio → transcript 추출(분류값은 미사용)        │
  ↓ (공통)                                                     │
  textarea = transcript  → 사용자 검토/수정                     │
  → [전문가 찾기] → POST /api/classify (JSON, classifyQuery)    │
  → 분류 결과 세션 저장 → /result 이동
```

> **결정 1 — 검토 단계 유지**: 법률·의료 오분류 리스크가 크므로 음성→즉시 이동이 아니라 transcript를 textarea에 채워 사용자가 검토/수정 후 제출하는 2단계 유지.
> **결정 2 — 받아쓰기/분류 분리**: 분류는 STT 경로가 아닌 **제출 시 텍스트 경로**에서만 수행. iOS 폴백의 `classifyAudio`가 반환하는 분류값은 버리고 transcript만 사용(편집 시 stale 방지 + STT 지연 경로 단축). 코드 단순성 위해 `classifyAudio`는 그대로 두되 호출측에서 transcript만 취함.

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `SosInput.tsx` | `useAudioRecorder`, `encodeWav` | 녹음·인코딩 호출 |
| `useAudioRecorder` (hook) | `MediaRecorder`, `getUserMedia` | 브라우저 녹음 |
| `encodeWav` (util) | `AudioContext` (OfflineAudioContext) | webm/mp4 → WAV PCM16k 변환 |
| `/api/classify/route.ts` | `lib/gemini.ts` | 분류 위임 |
| `lib/gemini.ts` | `@google/genai` | 텍스트/오디오 분류, 로컬 폴백 |

신규 npm 의존성 **없음** (`@google/genai`·React·Next 기존 사용분으로 충분).

### 2.4 핵심 기술 결정: 오디오 포맷

- **문제**: `MediaRecorder` 출력 코덱이 브라우저별 상이 — Chrome `audio/webm;codecs=opus`, Safari `audio/mp4`. Gemini 인라인 오디오 허용 포맷은 wav/mp3/aiff/aac/ogg/flac 계열로, webm은 보장되지 않음.
- **결정**: 녹음 Blob을 클라이언트에서 **16kHz mono 16-bit PCM WAV**로 재인코딩 후 전송. WAV는 Gemini가 보장 지원하며 브라우저 독립적.
- **용량 검증**: 16kHz·mono·16bit = 32KB/s. 최대 60초 = **~1.9MB** → Vercel 4.5MB 본문 한도, Gemini 20MB 인라인 한도 모두 통과.
- **트레이드오프**: 클라이언트 인코딩 코드(~60줄) 추가 vs. 서버 transcode(ffmpeg, Vercel serverless 부적합) 회피 + 포맷 신뢰성 확보. → 클라이언트 인코딩 채택.

### 2.5 핵심 기술 결정: 하이브리드 STT (지연 해소)

- **문제(측정)**: Gemini 오디오 배치 1콜 방식은 "발화 종료까지 무표시 → 업로드 → 멀티모달 추론"이라 8초 발화 기준 왕복 **7.8s / 12.4s / 18.2s**(편차 큼). 긴급 SOS UX 낙제.
- **결정**: STT를 **하이브리드**로 분기.
  - Web Speech API 지원(Chrome/Edge/Android Chrome): 브라우저 내 `SpeechRecognition`으로 **실시간 interim 표시**(서버·Gemini 미경유, 지연 0, 비용 0).
  - 미지원(iOS Safari): 기존 MediaRecorder→Gemini 오디오 폴백(느리지만 동작).
  - 분류는 STT에서 분리 → 제출 시 텍스트 경로(`classifyQuery`)에서만. STT 임계 경로에서 분류 추론 제거.
- **근거**: 다수 사용자(Web Speech 지원)가 즉시 실시간 체감, 추가 비용·인프라 0, 최단 적용. iOS 실시간은 후속 과제(클라우드 스트리밍 STT / Gemini Live).
- **트레이드오프**: 코드 경로 2개(분기 복잡도) vs. 실시간성·무비용. → 채택. iOS는 기능 동작 보장(실시간성은 열위) 수용.

### 2.6 핵심 기술 결정: 분류 지연 최적화

- **문제(측정)**: 제출 시 분류가 `gemini-2.5-flash` 기본(thinking on)이라 5~7s(최대 18s 편차). 측정: thinking on 7.2s vs thinking off 1.6~2.1s vs flash-lite 1.4~1.7s.
- **결정**: 텍스트 분류 = **`gemini-2.5-flash-lite` + `thinkingConfig.thinkingBudget=0`** (단순 구조화 작업이라 품질 영향 미미, vertical 정확도 유지). 오디오(iOS 폴백) = `gemini-2.5-flash` 유지하되 thinking off (받아쓰기 충실도 우선, 지연 단축).
- **실측 결과**: 제출 분류 7s→**1.0~2.4s**.
- **대안 기각**: "로컬 즉시 분류 + Gemini 보정"은 SOS에서 결과가 사용자 눈앞에서 바뀌는 UX·규제(오분류 후 교체) 리스크 → thinking off로 충분해 불채택.

---

## 3. Data Model

DB 스키마 변경 없음. 애플리케이션 타입만 확장.

### 3.1 Entity Definition (`lib/types.ts` 확장)

```typescript
// 기존
export interface ClassifyResult {
  vertical: Vertical;
  category: string;
  urgency: Urgency;
  keywords: string[];
  summary: string;
}

// 확장: 음성 경로에서 받아쓴 원문 포함 (텍스트 경로는 미포함/optional)
export interface ClassifyResult {
  vertical: Vertical;
  category: string;
  urgency: Urgency;
  keywords: string[];
  summary: string;
  transcript?: string;   // 음성 입력 시 Gemini 받아쓰기 결과. 텍스트 입력 시 undefined
}
```

### 3.2 Entity Relationships

N/A (관계형 변경 없음).

### 3.3 Database Schema

N/A — `experts` 테이블·RLS 정책 변경 없음.

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/classify` | 텍스트(JSON) **또는** 음성(FormData) 상황 분류 | None (공개) |

기존 단일 엔드포인트를 **Content-Type 분기**로 확장 (신규 엔드포인트 미추가).

### 4.2 Detailed Specification

#### `POST /api/classify` — 텍스트 (기존, 변경 없음)

**Request** `Content-Type: application/json`
```json
{ "query": "회사에서 갑자기 해고 통보를 받았어요" }
```

#### `POST /api/classify` — 음성 (신규)

**Request** `Content-Type: multipart/form-data`
- `audio`: WAV 파일 (16kHz mono PCM, ≤ ~1.9MB)

**Response (200 OK)** — 텍스트/음성 공통 스키마
```json
{
  "vertical": "labor",
  "category": "부당해고",
  "urgency": "즉시",
  "keywords": ["해고", "통보"],
  "summary": "부당해고 관련 긴급 상황으로 분류되었습니다.",
  "transcript": "회사에서 갑자기 해고 통보를 받았어요"
}
```

**서버 처리 로직 (`route.ts`)**
```
if (contentType startsWith "application/json")  → 기존 classifyQuery(query)
else if (multipart/form-data)                   → audio 추출
    → 누락/형식오류/길이 0 → 400
    → audio 크기 > 2.5MB (클라 60s 캡 ≈1.9MB 우회/비정상 대용량) → 413
    → arrayBuffer → base64
    → classifyAudio(base64, "audio/wav")
catch → 500 (단 GEMINI_API_KEY 미설정은 503)
```

**`lib/gemini.ts` 신규 함수**
```
classifyAudio(audioBase64, mimeType) :
  - GEMINI_API_KEY 없음 → 503 (운영 설정 오류, 서버 로그). 오디오는 로컬 분류 불가(원문 없음) → 클라는 텍스트 입력 안내
  - Gemini generateContent(model=gemini-2.5-flash,  // 2.0-flash 계열은 무료 쿼터 limit:0이라 2.5-flash 채택
        contents=[ inlineData{mimeType, data}, AUDIO_CLASSIFY_PROMPT ])
  - 프롬프트: 받아쓰기 + 기존 CLASSIFY_PROMPT 분류 기준 → transcript 포함 JSON 1개 반환
  - 파싱 성공 → ClassifyResult(+transcript)
  - 429/503/500 → localClassify(parsed.transcript) 시도, transcript 없으면 throw
```

### 4.3 Error Responses

| Code | 상황 | 클라이언트 처리 |
|------|------|----------------|
| 400 | audio 누락/비WAV/길이 0 | "다시 녹음해주세요" 안내 |
| 413 | 오디오 > 2.5MB (클라 60s 캡 ≈1.9MB 우회/비정상 대용량) | "녹음이 너무 깁니다" 안내 |
| 422 | 음성 미인식 / 빈 transcript (무음·잡음) | "음성이 인식되지 않았습니다" 재시도 안내 |
| 503 | GEMINI_API_KEY 미설정 등 운영 설정 오류 | 서버 로그 + "잠시 후 다시" + 텍스트 입력 권유 (오디오 로컬 폴백 불가) |
| 500 | Gemini 오류 + transcript 없음 | 기존 에러 문구 재사용 |

> **413 임계값 근거**: §2.4 기준 60초 WAV ≈ 1.9MB. 정상 캡 동작 시 413 미발생이 정상이며, 413은 클라이언트 캡 우회·조작 등 **비정상 대용량 방어선**(Vercel 4.5MB 인프라 한도 도달 전 차단). §6.1 사용자 메시지 트리거 조건과 일치.

---

## 5. UI/UX Design

### 5.1 Screen Layout

기존 `SosInput.tsx` 레이아웃 **그대로 유지**. 마이크 버튼·파형 애니메이션·"듣는 중…" 라벨 재사용. 동작만 SpeechRecognition → MediaRecorder로 교체.

### 5.2 User Flow

```
홈 → [마이크 탭] → (권한 허용) → 녹음 중(파형) → [탭하여 정지]
   → "분석 중…" 스피너 → textarea에 받아쓴 문장 표시
   → 사용자 검토/수정 → [전문가 찾기] → /result (기존 그대로)

권한 거부 시: "마이크 권한이 필요합니다. 텍스트로 입력해주세요" → textarea 포커스
미지원 시:   동일하게 텍스트 입력 폴백
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `SosInput` | `components/SosInput.tsx` | UI·녹음 트리거·결과 표시 (수정) |
| `useAudioRecorder` | `lib/audio/useAudioRecorder.ts` | getUserMedia·MediaRecorder 캡슐화 (신규) |
| `encodeWav` | `lib/audio/encodeWav.ts` | Blob → 16kHz mono WAV (신규) |

---

## 6. Error Handling

### 6.1 Error Code Definition

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| 400 | 상황을 입력해주세요 / 다시 녹음해주세요 | 빈 입력·오디오 누락 | 재입력 유도 |
| 413 | 녹음이 너무 깁니다 | 오디오 > 2.5MB (클라 캡 우회/비정상) | 재녹음(짧게) 유도 |
| 503 | 잠시 후 다시 시도해주세요 | GEMINI_API_KEY 미설정 등 운영 오류 | 서버 로그 알림 + 텍스트 입력 권유 |
| 500 | 분류 중 오류가 발생했습니다 | Gemini 장애·파싱 실패 | 토스트 + 텍스트 입력 권유 |
| (클라) | 마이크 권한이 필요합니다 | getUserMedia 거부 | textarea 폴백 |
| (클라) | 음성이 인식되지 않았습니다 | 무음·transcript 빈값 | 재시도 안내 |

### 6.2 Error Response Format

기존 형식 유지: `{ "error": "사용자 친화 메시지" }` + HTTP status. (전면 표준화는 범위 외 — §12)

---

## 7. Security Considerations

- [x] 입력 검증: audio MIME·크기 서버 검증, 빈 transcript 차단
- [x] `GEMINI_API_KEY` 서버 전용(Route Handler) — 클라이언트 노출 금지 유지
- [x] HTTPS 강제 (Vercel 기본)
- [x] 오디오 비영속: 서버에서 메모리 처리 후 폐기, 디스크/DB 저장 안 함 (긴급 상담 민감정보)
- [ ] Rate limiting: 음성=Gemini 비용 유발 → MVP는 클라이언트 60s 캡 + 단일 동시요청 제한. 인프라 레벨 레이트리밋은 확장 시 (§12)
- [x] 마이크 권한: 사용자 명시적 동의(getUserMedia) 외 자동 녹음 없음

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| 수동/Zero-Script QA | 음성→분류 E2E, 폴백 경로 | qa-monitor + 실기기 |
| 단위 | `encodeWav` 출력 헤더/샘플레이트 | Vitest (선택) |
| 통합 | `/api/classify` JSON·FormData 분기 | 수동 fetch |

### 8.2 Test Cases (Key)

- [ ] Happy: 한국어 30초 음성 → transcript 정확 + vertical 분류 정상
- [ ] iOS Safari 실기기에서 녹음→분류 정상 (핵심 수용 기준)
- [ ] Chrome/Edge/Android Chrome 정상
- [ ] 마이크 권한 거부 → 텍스트 폴백 동작, 크래시 없음
- [ ] Gemini 429 → 로컬 폴백 (transcript 기반) 분류
- [ ] 무음/0.5초 녹음 → 친화적 에러
- [ ] 60초 초과 방지(클라 캡) 및 본문 한도 미초과
- [ ] 텍스트 입력 경로 회귀 없음(기존 기능 무변)

---

## 9. Clean Architecture

> §9.1~9.3(레이어 구조·의존 규칙·import 규칙)은 별도 `conventions.md` 미작성 상태(Plan §7)이므로 **기존 프로젝트 코드 관례를 그대로 따른다**. 본 기능 고유 배치만 §9.4에 기재.

### 9.4 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| `SosInput` | Presentation | `components/SosInput.tsx` |
| `useAudioRecorder` | Presentation(hook) | `lib/audio/useAudioRecorder.ts` |
| `encodeWav` | Infrastructure(util) | `lib/audio/encodeWav.ts` |
| `classifyAudio` / `classifyQuery` | Infrastructure | `lib/gemini.ts` |
| `route handler` | Application | `app/api/classify/route.ts` |
| `ClassifyResult` 타입 | Domain | `lib/types.ts` |

의존 방향: Presentation → Application(route) → Infrastructure(gemini) → Domain(types). 기존 구조와 동일, 위반 없음.

---

## 10. Coding Convention Reference

> §10.1~10.3(네이밍·import 순서·환경변수 규칙)은 기존 프로젝트 코드 관례를 따른다(별도 `conventions.md` 미작성, Plan §7). 본 기능 고유 적용만 §10.4에 기재.

### 10.4 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| 컴포넌트 네이밍 | 기존 PascalCase 유지 (`SosInput`) |
| 훅/유틸 파일 | camelCase (`useAudioRecorder.ts`, `encodeWav.ts`) |
| 폴더 | `lib/audio/` (kebab/소문자, 기존 `lib/` 패턴 일치) |
| 환경변수 | `GEMINI_API_KEY` 서버 전용 유지 (기존 명칭 불변) |
| 에러 처리 | 기존 `{ error }` 응답 형식 답습 |
| 주석 | 기존 한국어 주석 스타일 유지 |

---

## 11. Implementation Guide

### 11.1 File Structure (변경/신규)

```
lib/
├── audio/
│   ├── useAudioRecorder.ts   # 신규: 녹음 훅
│   └── encodeWav.ts          # 신규: WAV 인코더
├── gemini.ts                 # 수정: classifyAudio() 추가
└── types.ts                  # 수정: ClassifyResult.transcript? 추가
components/
└── SosInput.tsx              # 수정: SpeechRecognition → MediaRecorder
app/api/classify/
└── route.ts                  # 수정: Content-Type 분기 (JSON|FormData)
```

### 11.2 Implementation Order

1. [ ] `lib/types.ts` — `transcript?` 필드 추가 (영향 최소, 먼저)
2. [ ] `lib/audio/encodeWav.ts` — Blob → 16kHz mono WAV
3. [ ] `lib/audio/useAudioRecorder.ts` — getUserMedia·MediaRecorder·권한 처리
4. [ ] `lib/gemini.ts` — `classifyAudio()` + 오디오 프롬프트 + 폴백
5. [ ] `app/api/classify/route.ts` — Content-Type 분기
6. [ ] `components/SosInput.tsx` — 녹음 훅 연동, 기존 UI 재사용, 폴백 분기
7. [ ] 통합·실기기 QA (iOS Safari 우선) — §8.2

### 11.3 Acceptance Criteria

- iOS Safari 실기기에서 음성 입력 → 정확한 분류·결과 화면 도달
- 텍스트 입력 경로 회귀 0
- Vercel Hobby 배포에서 60초 음성 분류가 10초 타임아웃 내 응답(초과 빈발 시 §12로 Pro 승급 트리거)
- Gemini 장애 시 로컬 폴백으로 서비스 지속

---

## 12. Open Decisions / Out of Scope

| 항목 | 상태 | 비고 |
|------|------|------|
| 음성→즉시 결과 이동(검토 단계 생략) | **미결** | 현재 설계는 검토 유지. 사용성 테스트 후 재결정 |
| Vercel Hobby 10s 타임아웃 초과 빈도 | **모니터링** | QA에서 측정 → 잦으면 Pro($20/mo) 승급 (확장 경로) |
| 인프라 레벨 Rate limiting | 범위 외 | 사용자 증가 시 별도 PDCA |
| 에러 응답 포맷 전면 표준화 | 범위 외 | 기존 `{error}` 답습 |
| 오디오 임시 저장(품질 개선용 학습 데이터) | 범위 외 | 민감정보 — 별도 동의 설계 필요 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-19 | Initial draft (Gemini 오디오 직전송 음성입력) | Kim KJ |
| 1.1 | 2026-05-19 | 하이브리드 STT 전환 (§2.1/§2.2/§2.5): Web Speech 실시간 + iOS Gemini 폴백, 받아쓰기/분류 분리 | Kim KJ |
| 1.2 | 2026-05-19 | 분류 지연 최적화 (§2.6): 텍스트 flash-lite + thinking off, §4.3 422 행 추가 | Kim KJ |
