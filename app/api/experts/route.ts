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

  experts = experts
    .sort((a, b) =>
      (b.is_available ? 1 : 0) - (a.is_available ? 1 : 0) ||
      b.experience_years - a.experience_years
    )
    .slice(0, 3);

  return NextResponse.json({ experts, total: experts.length });
}
