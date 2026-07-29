-- =====================================================================
-- schema v2: experts(3단계 상태 + 운영시간)
-- 설계: docs/02-design/features/experts-schema.design.md
-- 전제: supabase-setup.sql / supabase-admin-setup.sql 적용됨
-- 재실행 안전(idempotent). Supabase SQL Editor에서 그대로 실행.
--
-- 참고: 초기 설계에 있던 requests(F-05)·likes(F-08) 테이블은 코드에서 사용되지 않아
--   (죽은 스키마) 2026-07-29 제거함(sql/supabase-drop-requests-likes.sql로 DROP).
--   상담 추천 로그는 recommendation_logs(supabase-recommendation-logs-setup.sql)로 대체됨.
-- =====================================================================

-- ── 1) experts v2: 3단계 상태 + 운영시간 ────────────────────────────
alter table experts add column if not exists status text;
alter table experts add column if not exists weekday_start time;
alter table experts add column if not exists weekday_end time;
alter table experts add column if not exists weekend_available boolean not null default false;
alter table experts add column if not exists night_available boolean not null default false;

-- status 백필 (기존 is_available 기준) 후 not null + 기본값 + 체크
update experts set status = case when is_available then 'available' else 'delayed' end
  where status is null;
alter table experts alter column status set default 'available';
alter table experts alter column status set not null;

do $$ begin
  if not exists (select 1 from pg_constraint
    where conrelid = 'experts'::regclass and conname = 'experts_status_check') then
    alter table experts add constraint experts_status_check
      check (status in ('available','delayed','unavailable'));
  end if;
end $$;

-- 주의: is_available 은 코드 전환(SELECT/UI/CSV)이 status 로 끝난 뒤 별도 실행:
--   alter table experts drop column is_available;
