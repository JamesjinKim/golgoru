# 이슈 카드: W1-06 — 기본 테스트 3건 추가

## 담당
QA / DevOps

## 배경
`tests/experts-repository.contract.ts`만 존재하고, 핵심 경로에 대한 테스트가 없습니다. 기본 동작을 보장하는 테스트를 추가합니다.

## 완료 조건
- [ ] `/api/classify` POST 요청에 대한 단위 테스트 1건
- [ ] `/api/experts` 쿼리 파라미터 검증 테스트 1건
- [ ] `lib/experts/repository.ts` CRUD 계약 테스트 1건
- [ ] 테스트 실행 방법을 README.md에 추가

## 참고 파일
- `tests/experts-repository.contract.ts`
- `app/api/classify/route.ts`
- `app/api/experts/route.ts`
- `lib/experts/repository.ts`

## 작업 순서
1. 테스트 러너 결정 (Jest/Vitest) — 현재 설정 확인
2. `/api/classify` 테스트: 입력 검증, 성공 케이스 목업
3. `/api/experts` 테스트: 필수 쿼리 누락 시 400 응답 확인
4. Repository 테스트: Supabase를 mock하여 CRUD 계약 검증
5. README.md에 테스트 실행 커맨드 추가
