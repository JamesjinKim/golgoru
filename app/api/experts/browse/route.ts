import { NextRequest, NextResponse } from 'next/server';
import { getExpertRepository } from '@/lib/experts/repository';
import type { Vertical } from '@/lib/types';

const VERTICALS: Vertical[] = ['lawyer', 'doctor', 'labor', 'patent', 'tax', 'adjuster', 'appraiser'];

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
