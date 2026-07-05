-- supabase-profile-fields-setup.sql
-- 사전조건: supabase-user-auth.sql(profiles), supabase-consent-setup.sql(동의 컬럼).
-- 재실행 안전(idempotent). SQL Editor에 붙여 실행.

alter table profiles
  add column if not exists full_name text,   -- 실명 (display_name=OAuth 닉네임과 별개)
  add column if not exists phone     text,   -- 휴대폰 (010-XXXX-XXXX)
  add column if not exists gender    text,   -- 'male' | 'female' | 'unspecified'
  add column if not exists region    text;   -- 지역 시/도 명칭 (예: 서울특별시)
