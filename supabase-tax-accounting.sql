-- 세무 영역 단일화 (tax vertical = 세무사)
-- 실행: Supabase SQL Editor
--
-- 배경: 현장 운영상 세무·회계/회계사 표현을 쓰지 않고 세무사/세무로 단일화한다.
-- 내부 vertical 코드는 기존 호환을 위해 tax 로 유지하고, 표시용 license 는 세무사로 정규화한다.

begin;

-- 1) 표시용 자격 컬럼 (비면 직역 라벨로 폴백)
alter table experts add column if not exists license text;

-- 2) 기존 tax 전문가 중 license 가 없거나 회계사로 남은 데이터를 세무사로 정규화
update experts
set license = '세무사'
where vertical = 'tax'
  and (license is null or btrim(license) = '' or license = '회계사' or license = '세무·회계');

-- 3) 과거 시드/운영 데이터에 남은 회계사 명칭을 세무사 명칭으로 정규화
update experts
set name = replace(name, '회계사', '세무사'),
    bio = case when bio is null then null else replace(replace(bio, '회계감사·세무', '세무'), '회계사', '세무사') end
where vertical = 'tax'
  and (name like '%회계사%' or bio like '%회계사%' or bio like '%회계감사%');

commit;

-- 확인
-- select name, vertical, license, bio from experts where vertical = 'tax' order by name;
