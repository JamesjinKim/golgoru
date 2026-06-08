# ADR 001 — Admin 인증 강화 방식

상태: proposed
날짜: 2026-06-08

## 결정
관리자 페이지는 Supabase Auth + RLS 정책을 통해 보호한다.
기존 `admin/login` 세션을 쿠키 기반으로 전환한다.

## 이유
- 현재 admin 라우트는 인증 미들웨어가 약해 비인가 접근 가능성이 있음
- 서버 사이드 세션을 사용해야 CSRF/XSS 위험이 줄어듦
- Supabase SSR 라이브러리가 이미 포함되어 있어 도입 비용이 낮음

## 결과
- `app/api/admin/**` 접근 전 인증 검증 추가
- `lib/admin/supabaseServer.ts` 세션 확인 로직 강화
