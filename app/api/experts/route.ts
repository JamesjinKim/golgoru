import { NextRequest, NextResponse } from 'next/server';
import { getExpertRepository } from '@/lib/experts/repository';
import type { Vertical } from '@/lib/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vertical = searchParams.get('vertical') as Vertical | null;
  const urgency = searchParams.get('urgency');

  if (!vertical) {
    return NextResponse.json({ error: 'vertical 파라미터가 필요합니다.' }, { status: 400 });
  }

  const experts = await getExpertRepository().listRecommended({ vertical, urgency });

  return NextResponse.json({ experts, total: experts.length });
}
