-- supabase-drop-requests-likes.sql
-- 죽은 스키마 정리(2026-07-29): requests(F-05)·likes(F-08) 테이블 제거.
-- 이 두 테이블은 초기 설계에만 있고 애플리케이션 코드에서 전혀 사용되지 않았으며
-- (from/insert/select 0건, 타입 참조 0건, FK 참조 0건, 데이터 0행 확인), 상담 추천
-- 로그는 recommendation_logs(supabase-recommendation-logs-setup.sql)로 대체되었다.
-- 재실행 안전(idempotent). Supabase SQL Editor에서 실행.

-- requests에 딸린 트리거/정책은 테이블 DROP 시 함께 제거되므로 별도 정리 불필요.
drop table if exists requests cascade;
drop table if exists likes cascade;
