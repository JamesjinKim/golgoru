-- 세무·회계 통합 (Option A: 단일 tax 도메인 + 자격 표시)
-- 실행: Supabase SQL Editor. DDL 포함이라 REST/CLI 불가.
--
-- 배경: tax 도메인은 세무사·회계사 두 자격이 함께 상담한다.
-- vertical='tax' 풀에 두 자격을 모두 두고, 표시용 자격은 license 컬럼으로 구분한다.
-- (추천 로직은 vertical 단위라 코드 변경 없이 두 자격이 함께 추천된다.)

-- 1) 표시용 자격 컬럼 (비면 직역 라벨로 폴백)
alter table experts add column if not exists license text;

-- 2) 기존 세무 전문가 → 자격 '세무사'
update experts
set license = '세무사'
where vertical = 'tax' and license is null;

-- 3) 시드 일부(06~10)를 회계사로 전환 — 자격·이름 동시 변경
update experts
set license = '회계사',
    name = replace(name, '세무사', '회계사')
where vertical = 'tax'
  and name in ('세무사 06', '세무사 07', '세무사 08', '세무사 09', '세무사 10');

-- 확인
-- select name, vertical, license from experts where vertical='tax' order by name;
