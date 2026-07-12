-- supabase-expert-application-setup.sql
-- 전문가 입점신청 접수 테이블. 재실행 안전(idempotent). SQL Editor에 붙여 실행.
--
-- 공개(비로그인) 제출은 서버 API(app/api/expert-applications)에서 service role
-- (supabaseAdmin)로만 insert 한다. 따라서 RLS 는 enable 하되 정책을 두지 않아
-- anon/authenticated 의 직접 접근은 차단하고, service role 만 접근하도록 한다.

create table if not exists expert_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,             -- 성명 또는 업체명
  phone text not null,            -- 연락처
  vertical text                   -- 희망 전문분야(직역 코드). null 허용
    constraint expert_applications_vertical_check
    check (vertical is null or vertical in ('lawyer','doctor','labor','patent','tax','adjuster','appraiser')),
  message text,                   -- 문의 내용(선택)
  status text not null default 'new'
    constraint expert_applications_status_check
    check (status in ('new','contacted','done')),
  created_at timestamptz not null default now()
);

alter table expert_applications enable row level security;
-- 정책 없음: service role(supabaseAdmin)만 접근. anon/authenticated 직접 접근 차단.

-- 미처리(신규) 우선, 최신순 조회용 인덱스
create index if not exists expert_applications_status_created_idx
  on expert_applications (status, created_at desc);
