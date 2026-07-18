-- supabase-expert-youtube-multi.sql
-- 전문가 유튜브 링크 멀티(최대 3개) 지원. 재실행 안전(idempotent).
-- 사전조건: supabase-setup.sql 로 experts 테이블(youtube_url 포함)이 존재해야 함.

-- 1) 배열 컬럼 추가 (기존 단일 youtube_url 은 폴백용으로 당분간 유지)
alter table experts add column if not exists youtube_urls text[] not null default '{}';

-- 2) 최대 3개 제약
alter table experts drop constraint if exists experts_youtube_urls_max3;
alter table experts add constraint experts_youtube_urls_max3
  check (array_length(youtube_urls, 1) is null or array_length(youtube_urls, 1) <= 3);

-- 3) 기존 단일 링크 백필 (배열이 비어있고 기존 url 이 있을 때만)
update experts
  set youtube_urls = array[youtube_url]
  where youtube_url is not null and youtube_url <> ''
    and (youtube_urls is null or youtube_urls = '{}');
