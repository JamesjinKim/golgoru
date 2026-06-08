# 이슈 카드: W1-02 — 전문가 데이터 소스 단일화

## 담당
Tech Lead

## 배경
`mock-repository.ts`가 존재하고, 실제 Supabase와 어느 쪽이 사용되는지 명확하지 않음. 운영 환경에서는 반드시 Supabase만 사용해야 함.

## 완료 조건
- [ ] `lib/experts/repository.ts` 인터페이스를 유지하면서 구현체를 Supabase로 제한
- [ ] `mock-repository.ts`를 레거시로 표시하거나 제거
- [ ] `tests/experts-repository.contract.ts`가 실제 동작하는지 확인
- [ ] `supabase-setup.sql` 스키마와 `Expert` 타입이 일치하는지 검증

## 참고 파일
- `lib/experts/repository.ts`
- `lib/experts/supabase-repository.ts`
- `lib/experts/mock-repository.ts`
- `lib/types.ts`
- `supabase-setup.sql`

## 작업 순서
1. 현재 프로젝트에서 mock repo가 실제 사용되는지 grep 확인
2. 사용되지 않으면 `mock-repository.ts` 제거 또는 주석으로 레거시 표시
3. `supabase-repository.ts`의 필드 매핑을 타입과 대조
4. 타입 불일치 시 schema 또는 타입 중 하나를 조정
