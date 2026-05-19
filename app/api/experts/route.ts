import { NextRequest, NextResponse } from 'next/server';
import { MOCK_EXPERTS } from '@/lib/mock-data';
import { Vertical } from '@/lib/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vertical = searchParams.get('vertical') as Vertical | null;
  const urgency = searchParams.get('urgency');

  if (!vertical) {
    return NextResponse.json({ error: 'vertical 파라미터가 필요합니다.' }, { status: 400 });
  }

  let experts = MOCK_EXPERTS.filter(e => e.vertical === vertical && e.is_active);

  if (urgency === '즉시') {
    const available = experts.filter(e => e.is_available);
    if (available.length > 0) experts = available;
  }

  // 랜덤 추천: 회원 서열화 불만 + 변호사법 §34(중개) 리스크 회피.
  // 품질 랭킹(경력순 등) 금지 — 후보 풀에서 무작위 셔플 후 노출.
  for (let i = experts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [experts[i], experts[j]] = [experts[j], experts[i]];
  }
  experts = experts.slice(0, 3);

  return NextResponse.json({ experts, total: experts.length });
}
