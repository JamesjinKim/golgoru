-- supabase-recommendation-logs-setup.sql
-- 추천 분석 로그(A): 사용자가 문제를 입력해 전문가 추천을 받을 때, 분석/추천 요청 정보를 저장한다.
-- 어드민이 조회해 분석·홍보에 활용(어떤 분야·긴급도 요청이 많은지 등).
-- 사전조건: supabase-setup.sql(experts) 등 기본 스키마. auth.users는 Supabase 기본 제공.
-- 재실행 안전(idempotent).
--
-- 저장 시점: app/api/classify/route.ts 가 Gemini 분석 성공 후 이 테이블에 insert(fire-and-forget).
-- 조회: 어드민(/admin/requests)이 service role(supabaseAdmin)로 조회.
-- 보관기간: 추천 분석은 단기(설계상 24시간) — 자동 파기(pg_cron 등)는 후속 단계에서 도입.
--            현재는 저장·조회까지만. 약관(lib/legal/consent-terms.ts privacy)에 보관 정책 반영.

create table if not exists recommendation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,  -- 로그인 사용자(SOS 입력은 로그인 필수)
  query text not null,            -- 사용자가 입력한 문제 원문(음성이면 Gemini 받아쓰기 transcript)
  input_type text not null default 'text' check (input_type in ('text','voice')),
  vertical text not null,         -- 분석된 직역(lawyer 등)
  category text,                  -- 분석된 카테고리 라벨(예: 형사)
  category_code text,             -- 정규화 코드(예: LAW-01), 없을 수 있음
  urgency text,                   -- 즉시/당일/일반
  created_at timestamptz not null default now()
);

create index if not exists reclog_created_idx on recommendation_logs (created_at desc);
create index if not exists reclog_vertical_idx on recommendation_logs (vertical);

alter table recommendation_logs enable row level security;
-- 삽입/조회는 전부 서버 service role(supabaseAdmin)로 수행한다.
-- 클라이언트 직접 접근 정책을 만들지 않음 = 익명/유저 직접 접근 거부.
