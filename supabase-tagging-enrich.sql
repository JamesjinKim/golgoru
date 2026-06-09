-- =====================================================================
-- 시드 전문가 카테고리 태깅 보강 (1개 → 3개)
-- 목적: 카테고리별 전문가 수를 늘려 추천이 3~5명 풍성하게 보이도록.
-- 전제: supabase-categories.sql 적용됨(이미 1개씩 태깅된 상태)
-- 재실행 안전: on conflict do nothing
-- Supabase SQL Editor 에서 실행.
-- =====================================================================

-- 각 전문가에 기존 배정(offset 0) 외에 offset +1, +2 카테고리를 추가
-- → 전문가당 서로 다른 중분류 3개. (모든 직업 중분류 수 >= 4 이므로 3개 항상 distinct)
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
join generate_series(1, 2) as off on true            -- +1, +2 추가 배정
join cats c on c.vertical = r.vertical
           and c.cn = ((r.rn + off) % c.ccnt)
on conflict do nothing;

-- ── 확인용 ───────────────────────────────────────────────────────────
-- 전문가당 카테고리 수 (3 기대):
-- select expert_id, count(*) from expert_categories group by expert_id order by count(*) limit 5;
-- 카테고리별 전문가 수 (여러 명 기대):
-- select c.code, c.label, count(ec.*) n
--   from categories c left join expert_categories ec on ec.category_code = c.code
--   where c.level = 1 group by c.code, c.label order by c.code;
