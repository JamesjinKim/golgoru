-- =====================================================================
-- 변리사(patent) 전문가 ↔ 카테고리 재배정 (PAT-06 포함 6개 순환)
-- 설계: docs/02-design/features/experts-taxonomy.design.md §4.5
-- 전제: supabase-categories-copyright.sql 적용됨 (PAT-06 존재)
--
-- 문제: 기존 태깅은 PAT-06 추가 전 5개 기준(rn % 5)으로 배정 → PAT-06 0명.
-- 해결: 변리사 전문가만 6개 기준(rn % 6)으로 재순환. 다른 직역은 건드리지 않음.
--   결과(10명): PAT-01~04 각 2명, PAT-05·06 각 1명.
-- 재실행 안전(idempotent). Supabase SQL Editor 에서 실행.
-- =====================================================================

begin;

-- 1) 기존 변리사 태깅만 제거 (patent 카테고리에 걸린 것)
delete from expert_categories ec
using categories c
where ec.category_code = c.code
  and c.vertical = 'patent';

-- 2) 변리사만 6개 카테고리로 순환 재배정 (기존 시드 로직과 동일, ccnt=6)
insert into expert_categories (expert_id, category_code)
with ranked as (
  select e.id, e.vertical,
         row_number() over (partition by e.vertical order by e.created_at, e.id) - 1 as rn
  from experts e
  where e.vertical = 'patent'
),
cats as (
  select vertical, code,
         row_number() over (partition by vertical order by code) - 1 as cn,
         count(*) over (partition by vertical) as ccnt
  from categories
  where level = 1 and vertical = 'patent'
)
select r.id, c.code
from ranked r
join cats c on c.vertical = r.vertical and c.cn = (r.rn % c.ccnt)
on conflict do nothing;

commit;

-- ── 확인용 (선택 실행) ──────────────────────────────────────────────
-- select c.code, c.label, count(ec.expert_id) tagged
--   from categories c
--   left join expert_categories ec on ec.category_code = c.code
--  where c.vertical = 'patent'
--  group by c.code, c.label order by c.code;
