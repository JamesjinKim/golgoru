# 이슈 카드: W1-05 — Frontend 컴포넌트 공통화

## 담당
Frontend Dev

## 배경
여러 페이지에서 `style={{...}}` 인라인 스타일과 중복된 아이콘/카드 패턴이 반복되고 있습니다. 공통 컴포넌트로 추출하여 유지보수성을 높여야 합니다.

## 완료 조건
- [ ] `components/` 아래에 공통 컴포넌트 3개 이상 생성 (`Card`, `Button`, `Badge`)
- [ ] `Home`, `ResultPage`, `AdminExpertsPage`에서 중복 인라인 스타일을 컴포넌트로 대체
- [ ] 기존 디자인 토큰(`lib/tokens.ts`)과 연동
- [ ] 시각적 회귀가 없는지 로컬 확인

## 참고 파일
- `app/(site)/page.tsx`
- `app/(site)/result/page.tsx`
- `app/(admin)/admin/page.tsx`
- `lib/tokens.ts`
- `components/SosInput.tsx`

## 작업 순서
1. 현재 중복 스타일 패턴을 스캔 (box-shadow, radius, padding 등)
2. 공통 컴포넌트 인터페이스 설계
3. `components/ui/` 디렉토리에 컴포넌트 생성
4. 한 페이지부터 점진적으로 마이그레이션
5. 전 페이지 적용 후 로컬 빌드 확인
