-- supabase-recommendation-logs-cleanup.sql
-- recommendation_logs 24시간 자동 파기 (약관 이행: "분석 완료 후 24시간 이내 파기").
-- Supabase pg_cron으로 매시간 24h 경과 행을 삭제한다.
-- 사전조건: supabase-recommendation-logs-setup.sql 적용됨.
--   ⚠️ Supabase 대시보드 > Database > Extensions 에서 pg_cron 활성화가 선행돼야 한다.
--      (또는 아래 create extension이 권한상 실행되면 자동 활성.)
-- 재실행 안전: 같은 job명은 unschedule 후 재등록.

create extension if not exists pg_cron;

-- 기존 동일 job 있으면 제거(재실행 안전) 후 재등록
do $$
begin
  perform cron.unschedule('purge_recommendation_logs');
exception when others then
  null;  -- 없으면 무시
end $$;

select cron.schedule(
  'purge_recommendation_logs',
  '0 * * * *',  -- 매시 정각
  $$ delete from recommendation_logs where created_at < now() - interval '24 hours' $$
);

-- 등록 확인: select jobid, schedule, command from cron.job where jobname = 'purge_recommendation_logs';
