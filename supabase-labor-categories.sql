-- =====================================================================
-- 노무사(LAB) 카테고리 v2 — 노동사건 승격(7중분류 + 22세부)
-- 설계: docs/02-design/features/experts-taxonomy.design.md §4.4
-- 전제: supabase-categories.sql 적용됨 (기존 LAB-01~06 초안 대체)
-- ⚠️ 시드 전문가 재태깅 포함 — 노무사 expert_categories 를 초기화 후 재배정.
--    (테스트 시드 기준. 운영 데이터에선 태깅 섹션 제외하고 실행)
-- 재실행 안전. Supabase SQL Editor 에서 실행.
-- =====================================================================

-- 1) 기존 LAB 태깅·카테고리 제거 (FK 순서: 태깅 → level-2 → level-1)
delete from expert_categories where category_code like 'LAB%';
delete from categories where vertical = 'labor' and level = 2;
delete from categories where vertical = 'labor' and level = 1;

-- 2) 신규 중분류 (level-1)
insert into categories (code, parent_code, vertical, level, label) values
  ('LAB-01', null, 'labor', 1, '노동사건'),
  ('LAB-02', null, 'labor', 1, '산재'),
  ('LAB-03', null, 'labor', 1, '기업 노무 자문'),
  ('LAB-04', null, 'labor', 1, 'HR 컨설팅'),
  ('LAB-05', null, 'labor', 1, '산업안전'),
  ('LAB-06', null, 'labor', 1, '노사관계'),
  ('LAB-07', null, 'labor', 1, '건설노무')
on conflict (code) do nothing;

-- 3) 세부 (level-2)
insert into categories (code, parent_code, vertical, level, label) values
  ('LAB-01-01', 'LAB-01', 'labor', 2, '부당해고'),
  ('LAB-01-02', 'LAB-01', 'labor', 2, '임금체불'),
  ('LAB-01-03', 'LAB-01', 'labor', 2, '퇴직금'),
  ('LAB-01-04', 'LAB-01', 'labor', 2, '징계'),
  ('LAB-01-05', 'LAB-01', 'labor', 2, '직장내괴롭힘'),
  ('LAB-01-06', 'LAB-01', 'labor', 2, '노동위원회사건'),
  ('LAB-03-01', 'LAB-03', 'labor', 2, '기업자문'),
  ('LAB-03-02', 'LAB-03', 'labor', 2, '급여·4대보험 아웃소싱'),
  ('LAB-04-01', 'LAB-04', 'labor', 2, '임금체계구축'),
  ('LAB-04-02', 'LAB-04', 'labor', 2, '평가제도'),
  ('LAB-04-03', 'LAB-04', 'labor', 2, '채용제도'),
  ('LAB-04-04', 'LAB-04', 'labor', 2, '근로시간체계'),
  ('LAB-04-05', 'LAB-04', 'labor', 2, '직무분석·평가'),
  ('LAB-05-01', 'LAB-05', 'labor', 2, '안전보건체계구축'),
  ('LAB-05-02', 'LAB-05', 'labor', 2, '위험성평가'),
  ('LAB-05-03', 'LAB-05', 'labor', 2, '산업안전 노동청대응'),
  ('LAB-06-01', 'LAB-06', 'labor', 2, '단체교섭'),
  ('LAB-06-02', 'LAB-06', 'labor', 2, '파업대응'),
  ('LAB-06-03', 'LAB-06', 'labor', 2, '노사관계전략'),
  ('LAB-06-04', 'LAB-06', 'labor', 2, '노조대응자문'),
  ('LAB-07-01', 'LAB-07', 'labor', 2, '건설일용근로자관리'),
  ('LAB-07-02', 'LAB-07', 'labor', 2, '건설노무신고대행')
on conflict (code) do nothing;

-- 4) 시드 노무사 재태깅 (level-1 중분류 3개씩 순환 배정)
insert into expert_categories (expert_id, category_code)
with ranked as (
  select id, row_number() over (order by created_at, id) - 1 as rn
  from experts where vertical = 'labor'
),
cats as (
  select code, row_number() over (order by code) - 1 as cn, count(*) over () as ccnt
  from categories where vertical = 'labor' and level = 1
)
select r.id, c.code
from ranked r
join generate_series(0, 2) as off on true
join cats c on c.cn = ((r.rn + off) % c.ccnt)
on conflict do nothing;

-- 확인:
-- select code, label from categories where vertical='labor' order by code;
