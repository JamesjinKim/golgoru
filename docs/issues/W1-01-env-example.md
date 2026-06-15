# 이슈 카드: W1-01 — `.env.example` 작성, 환경 변수 감사

## 담당
Backend Dev

## 배경
환경 변수 명세가 문서화되어 있지 않아, 새 개발자가 `.env.local`을 설정하기 어렵고, 불필요한 시크릿이나 누락 변수가 있을 수 있습니다.

## 완료 조건
- [ ] 실제 사용 중인 환경 변수를 모두 추출하여 `.env.example` 최신화
- [ ] 각 변수에 용도, 필수 여부, 예시 주석 추가
- [ ] `.gitignore`에 `.env.local`, `.env.*.local`이 포함되어 있는지 확인
- [ ] 불필요하게 남은 환경 변수가 없으면 `.env.local` 정리

## 참고 파일
- `.env.local` (Secret이므로 읽지 않고 팀원에게 공유 필요)
- `supabase-setup.sql`
- `lib/supabase.ts`
- `lib/gemini.ts`

## 작업 순서
1. 코드베이스에서 `process.env.*` 및 `NEXT_PUBLIC_*` 참조를 모두 검색
2. 각 변수의 사용처와 필수 여부를 정리
3. `.env.example`에 주석과 함께 작성
4. README.md의 "개발 환경" 섹션과 연동 확인
