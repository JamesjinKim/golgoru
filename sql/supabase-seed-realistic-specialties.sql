-- =====================================================================
-- 더미 전문가 specialties 다양화 (운영 전 현실화)
-- 문제: supabase-seed-experts.sql 이 직역별 10명에게 동일한 specialties 템플릿을
--       복붙 → 리스트 카드가 전부 "형사 · 민사 전문" 처럼 똑같이 보임.
-- 해결: 직역별 풍부한 풀에서 전문가마다 서로 다른 3개를 슬라이딩 배정.
--       (실제 운영은 어드민 폼/CSV 의 개별 입력으로 자연 해소되며, 이 SQL 은 기존 시드용)
-- 재실행 안전(idempotent): UPDATE 라 몇 번 돌려도 동일 결과.
-- Supabase SQL Editor 에서 실행.
-- =====================================================================

with pool as (
  select * from (values
    ('lawyer',    array['형사변호','성범죄','사기·횡령','이혼·가사','상속·유류분','부동산분쟁','명예훼손','교통사고','민사소송','기업법무']),
    ('doctor',    array['응급의학','내과','순환기내과','정신건강','건강검진','소아청소년','피부과','정형외과','가정의학','내분비내과']),
    ('labor',     array['부당해고','임금체불','퇴직금','직장내괴롭힘','산업재해','노동위원회','징계대응','임금체계','4대보험','노사관계']),
    ('patent',    array['특허출원','상표','디자인','실용신안','해외출원·PCT','저작권등록','특허침해','상표분쟁','IP컨설팅','기술이전']),
    ('tax',       array['세무조사','상속·증여','양도소득세','부가세','법인세','기장대리','절세컨설팅','가지급금','종합소득세','조세불복']),
    ('adjuster',  array['교통사고','산업재해','화재·재산','보험금분쟁','배상책임','후유장해','대인보상','대물보상','휴업손해','보험심사']),
    ('appraiser', array['부동산평가','토지보상','경매감정','담보감정','자산평가','동산평가','수용보상','임대료감정','개발부담금','권리분석'])
  ) as t(vertical, items)
),
ranked as (
  select e.id, e.vertical,
         row_number() over (partition by e.vertical order by e.created_at, e.id) - 1 as rn
  from experts e
)
update experts e
set specialties = array[
  p.items[1 + ( r.rn      % array_length(p.items, 1))],
  p.items[1 + ((r.rn + 3) % array_length(p.items, 1))],
  p.items[1 + ((r.rn + 6) % array_length(p.items, 1))]
]
from ranked r
join pool p on p.vertical = r.vertical
where e.id = r.id;

-- ── 확인용 (선택 실행) ──────────────────────────────────────────────
-- select vertical, name, specialties from experts
--  where vertical = 'lawyer' order by name;
