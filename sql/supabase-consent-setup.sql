-- supabase-consent-setup.sql
-- 사전조건: supabase-setup.sql 로 profiles 테이블이 존재해야 함.
-- 재실행 안전(idempotent). SQL Editor에 붙여 실행.

alter table profiles
  add column if not exists terms_agreed_at      timestamptz,  -- (필수) 서비스 이용약관
  add column if not exists privacy_agreed_at    timestamptz,  -- (필수) 개인정보 수집·이용
  add column if not exists thirdparty_agreed_at timestamptz,  -- (필수) 개인정보 제3자 제공
  add column if not exists marketing_agreed_at  timestamptz;  -- (선택) 마케팅 활용·광고 수신
