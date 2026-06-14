-- =====================================================================
-- 변리사 저작권(등록·상담) 추가 + 변호사 LAW-08 라벨 경계화
-- 설계: docs/02-design/features/experts-taxonomy.design.md §4.1, §4.5
-- 전제: supabase-categories.sql 적용됨
-- 재실행 안전(idempotent). Supabase SQL Editor 에서 실행.
--
-- 배경: 저작권은 '등록·상담'은 변리사(PAT-06), '분쟁·소송'은 변호사(LAW-08)로
--       행위 기준 분리. AI 분류 규칙은 lib/gemini.ts 에 반영됨.
-- =====================================================================

-- ── 1) 변리사: 저작권(등록·상담) 카테고리 추가 ──────────────────────
insert into categories (code, parent_code, vertical, level, label)
values ('PAT-06', null, 'patent', 1, '저작권(등록·상담)')
on conflict (code) do update
  set label = excluded.label,
      vertical = excluded.vertical,
      level = excluded.level,
      is_active = true;

-- ── 2) 변호사 LAW-08: IT·지식재산 → IT·금융·지식재산 ────────────────
--   (저작권 '등록·상담'은 변리사로 분리, LAW-08에는 저작권 분쟁·소송만 잔류)
update categories
   set label = 'IT·금융·지식재산'
 where code = 'LAW-08';

-- ── 확인용 (선택 실행) ──────────────────────────────────────────────
-- select code, vertical, label from categories
--  where code = 'LAW-08' or vertical = 'patent' order by code;
