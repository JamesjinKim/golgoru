# 이슈 카드: W1-03 — Admin 인증 실제 보호 적용

## 담당
Backend Dev

## 배경
관리자 페이지(`app/(admin)/admin/**`)는 로그인 UI는 있으나, API Route와 페이지 접근에 대한 실제 보호가 필요한지 확인 필요.

## 완료 조건
- [ ] `app/api/admin/**` 모든 Route에 인증 검증 미들웨어 적용
- [ ] 서버 사이드에서 Supabase 세션/쿠키를 확인하도록 변경
- [ ] 비인가 접근 시 401 응답 또는 로그인 페이지 리다이렉트
- [ ] 인증 흐름 전체 문서화 (쿠키 이름, 만료, 갱신)

## 참고 파일
- `app/api/admin/**`
- `lib/admin/supabaseServer.ts`
- `lib/admin/auth.ts`
- `app/(admin)/admin/login/page.tsx`

## 작업 순서
1. 기존 admin 라우트의 보호 수준 확인
2. Supabase SSR 라이브러리를 사용하여 쿠키 기반 세션 검증 구현
3. 미들웨어 또는 각 Route 핸들러에 검증 추가
4. Postman/curl로 비인가 접근 테스트
