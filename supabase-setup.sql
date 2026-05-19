-- Supabase SQL Editor에서 실행하세요

create table if not exists experts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  vertical text not null check (vertical in ('lawyer', 'labor', 'adjuster', 'tax', 'doctor')),
  specialties text[] not null default '{}',
  region text not null,
  phone text not null,
  experience_years integer not null default 0,
  bio text,
  youtube_url text,
  is_available boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- 공개 읽기 허용 (소비자 조회용)
alter table experts enable row level security;

create policy "누구나 활성 전문가 조회 가능"
  on experts for select
  using (is_active = true);

-- 샘플 데이터 (테스트용 — 실제 데이터로 교체 필요)
insert into experts (name, vertical, specialties, region, phone, experience_years, bio, is_available) values
  ('김법률', 'lawyer', array['형사','성범죄','사기'], '서울 강남', '02-000-0001', 12, '형사 전문 12년, 긴급 대응 강점', true),
  ('박노무', 'labor', array['해고','임금체불','직장괴롭힘'], '서울 강서', '02-000-0002', 8, '노동법 전문, 즉시 상담 가능', true),
  ('이사정', 'adjuster', array['교통사고','산재','보험금'], '경기 수원', '02-000-0003', 10, '손해사정 10년, 보험금 극대화', false),
  ('최세무', 'tax', array['세무조사','법인세','부가세'], '서울 종로', '02-000-0004', 15, '세무조사 대응 전문', true),
  ('정의사', 'doctor', array['응급상담','만성질환','건강검진'], '서울 서초', '02-000-0005', 20, '응급 의료 상담, 24시간 대응', false);
