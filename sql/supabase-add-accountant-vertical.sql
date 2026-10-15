-- =====================================================================
-- 회계사 (accountant) 직역 신설 + 카테고리(ACC-01~04) 시드 + 김한솔 회계사 등록
-- 기획: accountant-vertical-plan.md (방안 1: 하이브리드 교차 추천 반영)
-- 재실행 안전(idempotent). Supabase SQL Editor 에서 실행하세요.
-- =====================================================================

-- ── 1) experts 테이블 vertical 제약조건 갱신 ──────────────────────────
alter table experts drop constraint if exists experts_vertical_check;
alter table experts add constraint experts_vertical_check
  check (vertical in ('lawyer', 'accountant', 'doctor', 'labor', 'patent', 'tax', 'adjuster', 'appraiser'));

-- ── 2) categories 테이블 vertical 제약조건 갱신 ────────────────────────
alter table categories drop constraint if exists categories_vertical_check;
alter table categories add constraint categories_vertical_check
  check (vertical in ('lawyer', 'accountant', 'doctor', 'labor', 'patent', 'tax', 'adjuster', 'appraiser'));

-- ── 3) 회계사 중분류 카테고리 (ACC-01 ~ ACC-04) 시드 ──────────────────
insert into categories (code, parent_code, vertical, level, label, is_active) values
  ('ACC-01', null, 'accountant', 1, '회계감사', true),
  ('ACC-02', null, 'accountant', 1, 'M&A 자문', true),
  ('ACC-03', null, 'accountant', 1, '회생·파산', true),
  ('ACC-04', null, 'accountant', 1, '가업상속설계', true)
on conflict (code) do update set
  label = excluded.label,
  vertical = excluded.vertical,
  level = excluded.level,
  is_active = excluded.is_active;

-- ── 4) 1호 회계사(김한솔) 전문가 등록 ────────────────────────────────
-- 전화번호 010-9597-9696 기준으로 중복 생성 방지
do $$
declare
  v_expert_id uuid;
begin
  select id into v_expert_id from experts where phone = '010-9597-9696' limit 1;

  if v_expert_id is null then
    v_expert_id := gen_random_uuid();
    insert into experts (
      id, name, vertical, license, specialties, region, phone, experience_years, bio,
      status, weekday_start, weekday_end, weekend_available, night_available, is_active, created_at
    ) values (
      v_expert_id,
      '김한솔',
      'accountant',
      '회계사',
      array['회계감사', 'M&A', '회생·파산', '가업상속설계'],
      '전국',
      '010-9597-9696',
      13,
      '안세회계법인 파트너 · 前 삼정KPMG 13년. 대기업 감사와 M&A부터 중소기업 회생, 가업승계까지 함께하는 재무 파트너입니다.',
      'available',
      '09:00',
      '18:00',
      false,
      false,
      true,
      now()
    );
  else
    update experts set
      name = '김한솔',
      vertical = 'accountant',
      license = '회계사',
      specialties = array['회계감사', 'M&A', '회생·파산', '가업상속설계'],
      region = '전국',
      experience_years = 13,
      bio = '안세회계법인 파트너 · 前 삼정KPMG 13년. 대기업 감사와 M&A부터 중소기업 회생, 가업승계까지 함께하는 재무 파트너입니다.',
      status = 'available',
      weekday_start = '09:00',
      weekday_end = '18:00',
      weekend_available = false,
      night_available = false,
      is_active = true
    where id = v_expert_id;
  end if;

  -- 카테고리 매핑 (ACC-01 ~ ACC-04)
  insert into expert_categories (expert_id, category_code) values
    (v_expert_id, 'ACC-01'),
    (v_expert_id, 'ACC-02'),
    (v_expert_id, 'ACC-03'),
    (v_expert_id, 'ACC-04')
  on conflict (expert_id, category_code) do nothing;
end $$;
