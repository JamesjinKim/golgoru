-- =====================================================================
-- 카테고리 정규화: categories + expert_categories (score 없음)
-- + 직업 7개로 축소(회계사 제거) + 카테고리 시드 + 시드 전문가 태깅
-- 설계: docs/02-design/features/experts-taxonomy.design.md
-- 전제: supabase-setup.sql / schema-v2 / seed-experts 적용됨
-- 재실행 안전(idempotent). Supabase SQL Editor 에서 실행.
-- =====================================================================

-- ── 0) 직업 7개로 축소 (회계사 제거) ────────────────────────────────
delete from experts where vertical = 'accountant';   -- 시드 회계사 10명 제거
alter table experts drop constraint if exists experts_vertical_check;
alter table experts add constraint experts_vertical_check
  check (vertical in ('lawyer','doctor','labor','patent','tax','adjuster','appraiser'));

-- ── 1) 테이블 ───────────────────────────────────────────────────────
create table if not exists categories (
  code         text primary key,                 -- 'LAW-01' / 'LAW-01-01'
  parent_code  text references categories(code),
  vertical     text not null
                 check (vertical in ('lawyer','doctor','labor','patent','tax','adjuster','appraiser')),
  level        int  not null,                     -- 1 중분류 / 2 세부
  label        text not null,
  is_active    boolean not null default true
);
create index if not exists categories_vertical_idx on categories (vertical);

create table if not exists expert_categories (
  expert_id     uuid references experts(id) on delete cascade,
  category_code text references categories(code),
  primary key (expert_id, category_code)
);
create index if not exists expert_categories_code_idx on expert_categories (category_code);

-- 공개 읽기(소비자 매칭용) — categories 만. expert_categories 는 서버(service role)로만.
alter table categories enable row level security;
drop policy if exists "categories public read" on categories;
create policy "categories public read" on categories for select using (is_active = true);

-- ── 2) 카테고리 시드 — level-1 중분류 (7직업) ──────────────────────
insert into categories (code, parent_code, vertical, level, label) values
  -- 변호사
  ('LAW-01', null, 'lawyer', 1, '형사'),
  ('LAW-02', null, 'lawyer', 1, '민사·계약'),
  ('LAW-03', null, 'lawyer', 1, '부동산·임대차'),
  ('LAW-04', null, 'lawyer', 1, '가사'),
  ('LAW-05', null, 'lawyer', 1, '기업법무'),
  ('LAW-06', null, 'lawyer', 1, '행정'),
  ('LAW-07', null, 'lawyer', 1, '의료'),
  ('LAW-08', null, 'lawyer', 1, 'IT·금융·지식재산'),
  ('LAW-09', null, 'lawyer', 1, '기타'),
  -- 의사
  ('MED-01', null, 'doctor', 1, '응급·급성증상'),
  ('MED-02', null, 'doctor', 1, '내과·만성질환'),
  ('MED-03', null, 'doctor', 1, '정신건강'),
  ('MED-04', null, 'doctor', 1, '건강검진·예방'),
  ('MED-05', null, 'doctor', 1, '진료과안내·세컨드오피니언'),
  -- 노무사 (v2: 노동사건 승격 — level-2 세부는 supabase-labor-categories.sql)
  ('LAB-01', null, 'labor', 1, '노동사건'),
  ('LAB-02', null, 'labor', 1, '산재'),
  ('LAB-03', null, 'labor', 1, '기업 노무 자문'),
  ('LAB-04', null, 'labor', 1, 'HR 컨설팅'),
  ('LAB-05', null, 'labor', 1, '산업안전'),
  ('LAB-06', null, 'labor', 1, '노사관계'),
  ('LAB-07', null, 'labor', 1, '건설노무'),
  -- 변리사
  ('PAT-01', null, 'patent', 1, '특허'),
  ('PAT-02', null, 'patent', 1, '상표'),
  ('PAT-03', null, 'patent', 1, '디자인'),
  ('PAT-04', null, 'patent', 1, '실용신안'),
  ('PAT-05', null, 'patent', 1, '해외출원·PCT'),
  ('PAT-06', null, 'patent', 1, '저작권(등록·상담)'),
  -- 세무사
  ('TAX-01', null, 'tax', 1, '기장'),
  ('TAX-02', null, 'tax', 1, '재산제세'),
  ('TAX-03', null, 'tax', 1, '조사불복'),
  ('TAX-04', null, 'tax', 1, '컨설팅'),
  -- 손해사정사
  ('INS-01', null, 'adjuster', 1, '보험금청구'),
  ('INS-02', null, 'adjuster', 1, '자동차'),
  ('INS-03', null, 'adjuster', 1, '재산'),
  ('INS-04', null, 'adjuster', 1, '배상책임'),
  ('INS-05', null, 'adjuster', 1, '특수보험'),
  -- 감정평가사
  ('APR-01', null, 'appraiser', 1, '부동산감정평가'),
  ('APR-02', null, 'appraiser', 1, '토지보상·수용'),
  ('APR-03', null, 'appraiser', 1, '경매·담보감정'),
  ('APR-04', null, 'appraiser', 1, '자산·동산평가')
on conflict (code) do nothing;

-- ── 2-1) level-2 세부 (확정 코드만: 세무사 재산제세) ────────────────
--   변호사·손해사정사 세부(성범죄/실손 등)는 설계문서 §4에 정의됨.
--   leaf 단위 라우팅/어드민 카테고리 UI 도입 시 함께 시드 (Phase 2).
insert into categories (code, parent_code, vertical, level, label) values
  ('TAX-02-01', 'TAX-02', 'tax', 2, '양도'),
  ('TAX-02-02', 'TAX-02', 'tax', 2, '상속'),
  ('TAX-02-03', 'TAX-02', 'tax', 2, '증여')
on conflict (code) do nothing;

-- ── 3) 시드 전문가 ↔ 카테고리 태깅 (직업별 level-1 순환 배정) ───────
--   각 전문가에 그 직업의 중분류 1개를 순환 배정 (테스트용).
insert into expert_categories (expert_id, category_code)
with ranked as (
  select e.id, e.vertical,
         row_number() over (partition by e.vertical order by e.created_at, e.id) - 1 as rn
  from experts e
),
cats as (
  select vertical, code,
         row_number() over (partition by vertical order by code) - 1 as cn,
         count(*) over (partition by vertical) as ccnt
  from categories where level = 1
)
select r.id, c.code
from ranked r
join cats c on c.vertical = r.vertical and c.cn = (r.rn % c.ccnt)
on conflict do nothing;

-- ── 4) 확인용 ───────────────────────────────────────────────────────
-- select vertical, count(*) from categories group by vertical order by vertical;
-- select c.vertical, c.code, count(ec.*) tagged
--   from categories c left join expert_categories ec on ec.category_code = c.code
--   where c.level = 1 group by c.vertical, c.code order by c.code;
