-- supabase-call-logs-setup.sql
-- 통화 연결 로그(B): 로그인 사용자가 전문가 전화 버튼을 눌러 연결을 시도하면 그 이벤트를 저장한다.
-- 웹은 실제 통화 성사 여부를 알 수 없으므로 "전화 걸기 시도(버튼 클릭)"를 연결 이벤트로 기록한다.
-- 어드민이 조회해 어떤 전문가·분야가 많이 연결되는지 분석·홍보에 활용.
-- 사전조건: supabase-setup.sql(experts). auth.users는 Supabase 기본 제공. 재실행 안전.
--
-- 저장: app/api/calls/route.ts 가 sendBeacon 이벤트를 받아 insert(user_id는 서버 세션으로 재확정).
-- 조회: 어드민(/admin/calls)이 service role(supabaseAdmin)로 조회.
-- 보관기간: 약관상 "접수 시점부터 3년간 보관 후 파기"(consent-terms.ts). 3년 후 파기는 후속.

create table if not exists call_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,   -- 전화 건 로그인 사용자
  expert_id uuid references experts(id) on delete set null,    -- 연결 시도한 전문가
  vertical text,                -- 전문가 직역(분석용)
  source text,                  -- 클릭 위치: 'detail'(상세 하단버튼)|'contact'(상세 연락처)|'card'(목록/추천 카드)
  created_at timestamptz not null default now()
);

create index if not exists calllog_created_idx on call_logs (created_at desc);
create index if not exists calllog_expert_idx on call_logs (expert_id);

alter table call_logs enable row level security;
-- 삽입/조회는 전부 서버 service role(supabaseAdmin)로 수행. 클라이언트 직접 접근 정책 없음 = 거부.
