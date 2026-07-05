-- supabase-appraiser-cleanup.sql
-- 감정평가사(appraiser) 샘플 데이터 삭제 (영업팀 요청, 2026-07-06 프로덕션 적용됨).
-- 감정평가사는 UI에서 숨김 처리(lib/constants HIDDEN_VERTICALS)된 상태였고,
-- 샘플 인물/카테고리를 실제로 제거해 DB에서도 정리한다.
-- 사전조건: supabase-setup.sql(experts), supabase-schema-v2.sql / categories 계열 적용됨.
-- FK 순서 때문에 매핑 → 전문가 → 카테고리 순으로 삭제한다. 재실행 안전(idempotent).
--
-- 참고: requests / likes 에는 감정평가사 참조가 0건이었음(삭제 시점 확인).
--       다시 감정평가사를 도입하려면 카테고리(APR-01~04) 시드부터 재적용해야 함.

-- STEP 1: 감정평가사 전문가 ↔ 카테고리 매핑 삭제 (30건)
delete from expert_categories
where expert_id in (select id from experts where vertical = 'appraiser');

-- STEP 2: 감정평가사 전문가 삭제 (10건: "감정평가사 01"~"10" 샘플)
delete from experts where vertical = 'appraiser';

-- STEP 3: 감정평가 카테고리 정의 삭제 (APR-01~04, 4건)
delete from categories where vertical = 'appraiser';
