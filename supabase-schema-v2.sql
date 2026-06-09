-- =====================================================================
-- schema v2: experts(상태·운영시간) + requests + likes (핵심 루프)
-- 설계: docs/02-design/features/experts-schema.design.md
-- 전제: supabase-setup.sql / supabase-admin-setup.sql 적용됨
-- 재실행 안전(idempotent). Supabase SQL Editor에서 그대로 실행.
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

-- ── 2) requests: 상담 요청 (F-05) ───────────────────────────────────
create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references experts(id) on delete cascade,
  session_id text not null,                 -- 익명 소비자 세션 UUID
  user_id uuid references auth.users(id),   -- 향후 계정(nullable)
  query text not null,                      -- 입력 상황
  vertical text not null,
  urgency text check (urgency in ('즉시','당일','일반')),
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  expert_reply text,                        -- 전문가 1회 답변
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists requests_expert_idx on requests (expert_id);
create index if not exists requests_session_idx on requests (session_id);

drop trigger if exists set_requests_updated_at on requests;
create trigger set_requests_updated_at
  before update on requests
  for each row execute function set_experts_updated_at();  -- setup.sql 의 공용 함수 재사용

alter table requests enable row level security;
-- insert: 공개(익명 소비자도 요청 가능)
drop policy if exists "anyone insert request" on requests;
create policy "anyone insert request" on requests
  for insert with check (true);
-- select: 본인(요청한 세션은 서버에서 처리) / 어드민·전문가는 service role 로 조회
-- 전문가 본인 조회는 전문가 인증 도입 시 확장. MVP는 service role(RLS 우회).

-- ── 3) likes: 좋아요 (F-08) ─────────────────────────────────────────
create table if not exists likes (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references experts(id) on delete cascade,
  session_id text not null,
  created_at timestamptz default now(),
  constraint likes_unique unique (expert_id, session_id)  -- 중복 방지
);
create index if not exists likes_expert_idx on likes (expert_id);

alter table likes enable row level security;
-- insert/select 는 서버(service role)에서 "상담 요청 이력 존재" 검증 후 수행.
-- 직접 클라 insert 차단(정책 없음 = 거부).
