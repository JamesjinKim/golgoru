# 이슈 카드: W1-04 — Gemini 분류 프롬프트 개선

## 담당
AI Engineer

## 배경
현재 `lib/gemini.ts`의 분류 정확도를 측정하고, 프롬프트를 개선하여 vertical/category/urgency 분류 성능을 높여야 합니다.

## 완료 조건
- [ ] 현재 프롬프트 전문을 문서화 (현재 버전)
- [ ] 테스트 케이스 10건 이상 준비 (각 vertical별)
- [ ] 프롬프트 변형 실험 결과 기록 (성공/실패 케이스)
- [ ] 최종 프롬프트를 `docs/prompts/classify.md`에 기록

## 참고 파일
- `lib/gemini.ts`
- `lib/types.ts` (ClassifyResult)
- `app/api/classify/route.ts`

## 작업 순서
1. 현재 프롬프트 전문을 추출하여 기록
2. vertical별 샘플 질의 10건을 준비
3. 프롬프트 변형(예: few-shot, 명확한 출력 형식 지정) 실험
4. 잘못 분류된 케이스를 분석하여 규칙 추가
5. 개선된 프롬프트를 코드에 반영하고 문서화
