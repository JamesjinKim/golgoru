---
template: analysis
version: 1.2
feature: voice-input-gemini
date: 2026-05-19
author: Kim KJ
phase: check
matchRate: 98
round: 2
---

# voice-input-gemini Gap Analysis (PDCA Check) — 2회차 재검증

> **대상**: 설계 `docs/02-design/features/voice-input-gemini.design.md` ↔ 구현
> **수행**: bkit:gap-detector (읽기 전용, grep 교차검증)
> **일자**: 2026-05-19
> **회차**: 2회차 — 1회차 96%는 **폐기된 구 설계(Gemini 오디오 직전송)** 기준. 본 회차는 **갱신 설계(§2.5 하이브리드 STT / §2.6 분류 thinking-off)** 기준 신규 기준선.
> **Match Rate**: **98%**
> **판정**: ≥90% · Critical/Major 0 · 선결 갭 0 → **Report 유지 가능, iterate 불필요**

---

## 1. 종합 점수

| 카테고리 | 점수 |
|----------|:----:|
| 설계 일치 (§2.1/§2.2/§2.5/§2.6/§4) | 98% |
| 아키텍처 준수 (§9.4) | 100% |
| 컨벤션 준수 (§10.4) | 100% |
| **종합** | **98%** |

1회차 96%(구 설계) → 2회차 98%(갱신 설계) — 비교 기준이 다르므로 품질 등락이 아닌 **재정렬 기준선**.

## 2. 신규 설계 반영 판정

### §2.5 하이브리드 STT — PASS (정확 반영)

| 설계 요구 | 구현 | 판정 |
|-----------|------|:----:|
| Web Speech 지원 시 SpeechRecognition(ko-KR, interim, continuous) 실시간 | `SosInput.tsx:101-137` startSpeech, onresult→setQuery 실시간 누적 | ✅ |
| speechSupported 경로 분기 | `:29-33,58,173` getSpeechRecognition / handleVoice | ✅ |
| 미지원→MediaRecorder→encodeWav→Gemini 폴백 | `:174` startRecording, `:140-165` stopAndTranscribe | ✅ |
| 권한거부/미지원 텍스트 폴백 | `useAudioRecorder.ts:85-90`, `handleVoice:175` | ✅ |
| 받아쓰기≠분류 분리(분류는 제출 시) | router.push/sessionStorage는 handleSubmit(`:84-86`)에만, 음성경로 0 | ✅ |

### §2.6 분류 지연 최적화 — PASS (정확 반영)

| 설계 요구 | 구현 | 판정 |
|-----------|------|:----:|
| 텍스트 = gemini-2.5-flash-lite + thinkingBudget:0 | `lib/gemini.ts:95,97` | ✅ |
| 오디오 = gemini-2.5-flash + thinkingBudget:0 | `lib/gemini.ts:137,142` | ✅ |
| "로컬 즉시+보정" 기각 | 해당 패턴 없음, localClassify는 장애 폴백(R4)만 | ✅ |

### §2.1/§2.2 다이어그램·흐름 / §4 API / 회귀 — PASS

- 코드 분기 구조가 §2.1 3분기·§2.2 흐름과 1:1 대응. 음성경로 router.push 없음(검토 단계 유지).
- §4.2 Content-Type 분기 유지, 에러코드 400/413/422/503/500 전부 구현.
- 텍스트 경로·기존 UI(마이크·파형·라벨) 무회귀. webkitSpeechRecognition 잔존은 §2.5 의도적 재도입(갭 아님).

## 3. 발견된 차이

### Critical 0 · Major 0

### Minor (문서 정합, 코드 무관) — 처리 현황

| ID | 내용 | 상태 |
|----|------|:----:|
| M-1 | 설계 §4.3 표에 422 행 누락 (코드는 처리) | ✅ **본 세션 정정** (422 행 추가) |
| Version History | §2.5/§2.6 변경 미기재 | ✅ **본 세션 정정** (v1.1/v1.2 추가) |
| M-2~M-4 | 1회차 지적 Minor 문서 정정 | 잔여(비차단) |

### 알려진 잔여 (갭 아님)

- §8.2 무음→422: Gemini 환각으로 미트리거 가능 (코드 결함 아님, 빈-transcript 로직 자체는 정상). 실런타임 QA 필요.
- 브라우저 수동 QA(H1~H5)·iOS 실기기: 정적 분석 범위 밖, 미수행.

## 4. 교차검증 근거 (grep)

- 모델명: `lib/gemini.ts` lite 1건(텍스트 :95) + flash 1건(오디오 :137)
- `thinkingBudget:0`: 정확히 2건 (:97, :142)
- `SpeechRecognition`/`webkitSpeechRecognition`: SosInput :29-33,58,102 (의도적 재도입)
- `router.push`/`sessionStorage`/`classifyResult`: handleSubmit :84-86 에만 → 받아쓰기/분류 분리 확정

## 5. 진행 판정

**98% ≥ 90%, Critical/Major 0, 선결 갭 0 → Report 유지/진행 가능. iterate 불필요.**
잔여: M-2~M-4 문서 정정(비차단), 브라우저/iOS 수동 QA(별도).

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-19 | 1회차 분석 (구 설계, Match 96%) | Kim KJ |
| 0.2 | 2026-05-19 | 2회차 재검증 (갱신 설계 §2.5/§2.6, Match 98%) + M-1·Version History 정정 반영 | Kim KJ |
