-- =====================================================================
-- admin-dashboard 선결(D-02): Supabase SQL Editor에서 그대로 실행
-- 전제: 기존 supabase-setup.sql(experts 테이블)이 이미 적용돼 있어야 함
-- 설계 근거: docs/02-design/features/admin-dashboard.design.md §3
-- =====================================================================

-- 1) 어드민 계정·역할 (auth.users 와 1:1)
create table if not exists admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('super_admin','operator')),
  created_at timestamptz default now()
);
alter table admin_users enable row level security;

-- 본인 행 조회 / super_admin 은 전체 조회
create policy "admin self select" on admin_users
  for select using (
    auth.uid() = id
    or exists (select 1 from admin_users a where a.id = auth.uid() and a.role = 'super_admin')
  );
-- insert/update 는 클라이언트 차단(서버 service role 로만). 별도 정책 없음 = 거부.

-- 2) 감사·접속 로그 (쓰기 행위 + 로그인 성공/실패 = FR-07)
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  actor_email text,
  action text not null,            -- expert.create|update|deactivate|delete|import | auth.login.success|auth.login.fail
  target_table text,
  target_id text,
  detail jsonb,
  created_at timestamptz default now()
);
alter table audit_log enable row level security;

-- 인증된 어드민만 조회. insert 는 서버(service role, RLS 우회)만.
create policy "audit select for admins" on audit_log
  for select using (
    exists (select 1 from admin_users a where a.id = auth.uid())
  );

-- 3) experts: 기존 "활성 공개 select" 정책 유지(소비자용).
--    어드민 쓰기는 service role 키로 수행(RLS 우회) → 추가 정책 불필요.

-- =====================================================================
-- D-03: 최초 super_admin 만들기 (대시보드 + 아래 1줄)
--   ① Supabase 대시보드 → Authentication → Users → "Add user"
--      (이메일/비번 생성, Auto Confirm 체크) → 생성된 user의 UUID 복사
--   ② 아래 <UUID>, <EMAIL> 치환 후 실행:
-- insert into admin_users (id, email, role)
--   values ('<UUID>', '<EMAIL>', 'super_admin');
-- =====================================================================
