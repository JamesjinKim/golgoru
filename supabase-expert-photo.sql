-- =====================================================================
-- expert-photo: experts 에 photo_url 추가 (미니 사진 아바타)
-- 설계: docs/02-design/features/expert-photo.design.md
-- 전제: supabase-setup.sql 적용됨. 재실행 안전(idempotent).
-- =====================================================================
alter table experts add column if not exists photo_url text;
