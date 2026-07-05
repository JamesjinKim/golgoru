import { NextRequest, NextResponse } from 'next/server';
import { getExpertRepository } from '@/lib/experts/repository';
import type { Vertical } from '@/lib/types';
import { VISIBLE_VERTICALS } from '@/lib/constants';

// UI 노출 직역만 필터로 허용 (숨김 직역은 URL 직접 호출 시 무시 → 전체 반환)
const VERTICALS: Vertical[] = VISIBLE_VERTICALS;

// 둘러보기(미니홈피 디렉터리) 커서 페이지네이션. 하단 도달 시 클라이언트가 append 호출
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vRaw = searchParams.get('vertical');
  const vertical = vRaw && VERTICALS.includes(vRaw as Vertical) ? (vRaw as Vertical) : null;
  const categoryCode = searchParams.get('category') || null;
  const cursor = searchParams.get('cursor') || null;

  const { experts, nextCursor } = await getExpertRepository().listBrowse({
    vertical,
    categoryCode,
    cursor,
  });

  return NextResponse.json({ experts, nextCursor });
}
