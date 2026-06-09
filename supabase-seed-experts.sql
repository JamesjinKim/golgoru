-- =====================================================================
-- 8개 분야 확장 + 분야별 10명 테스트 시드 (총 80명)
-- 분야: 변호사·의사·노무사·변리사·회계사·세무사·손해사정사·감정평가사
-- 전제: supabase-setup.sql / supabase-schema-v2.sql 적용됨
-- 재실행 안전(idempotent): 제약 재생성 + on conflict(phone) do nothing
-- Supabase SQL Editor 에서 그대로 실행.
-- =====================================================================

-- ── 1) vertical 체크 제약을 8개 분야로 갱신 ─────────────────────────
alter table experts drop constraint if exists experts_vertical_check;
alter table experts add constraint experts_vertical_check
  check (vertical in ('lawyer','doctor','labor','patent','accountant','tax','adjuster','appraiser'));

-- ── 2) (선택) setup.sql 기본 샘플 5명 제거 → 분야별 정확히 10명 유지 ──
delete from experts
  where phone in ('02-000-0001','02-000-0002','02-000-0003','02-000-0004','02-000-0005');

-- ── 3) 분야별 10명 생성 (8 분야 × 10 = 80) ──────────────────────────
insert into experts
  (name, vertical, specialties, region, phone, experience_years, bio, status,
   weekday_start, weekday_end, weekend_available, night_available, is_active)
select
  v.label || ' 테스트' || lpad(g::text, 2, '0'),
  v.key,
  v.specialties,
  (array['서울 강남','서울 서초','서울 종로','경기 수원',
         '인천 연수','부산 해운대','대구 수성','광주 서구'])[1 + ((v.idx + g) % 8)],
  '02-' || lpad((v.idx * 100 + g)::text, 4, '0') || '-' || lpad((v.idx * 100 + g)::text, 4, '0'),
  4 + (g * 2),
  v.label || ' 분야 테스트 전문가입니다. (시드 데이터)',
  case when g <= 6 then 'available'
       when g <= 8 then 'delayed'
       else 'unavailable' end,
  '09:00', '18:00',
  (g % 2 = 0),   -- 주말 상담 (짝수번)
  (g % 3 = 0),   -- 야간 상담 (3의 배수)
  true
from (values
  (1, 'lawyer',     '변호사',     array['형사','민사','이혼·가사']),
  (2, 'doctor',     '의사',       array['응급의학','내과','건강상담']),
  (3, 'labor',      '노무사',     array['부당해고','임금체불','직장내괴롭힘']),
  (4, 'patent',     '변리사',     array['특허출원','상표','지식재산권분쟁']),
  (5, 'accountant', '회계사',     array['외부감사','재무자문','기업회계']),
  (6, 'tax',        '세무사',     array['세무조사','상속·증여','부가세']),
  (7, 'adjuster',   '손해사정사', array['교통사고','산재','보험금분쟁']),
  (8, 'appraiser',  '감정평가사', array['부동산평가','토지보상','경매감정'])
) as v(idx, key, label, specialties),
  generate_series(1, 10) as g
on conflict (phone) do nothing;

-- ── 4) 확인용 (실행 후 분야별 카운트) ───────────────────────────────
-- select vertical, count(*) from experts group by vertical order by vertical;
