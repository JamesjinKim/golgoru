import { NextRequest, NextResponse } from 'next/server';
import { getExpertRepository } from '@/lib/experts/repository';
import { getCurrentUserProfile } from '@/lib/auth/user';
import { isHiddenVertical } from '@/lib/constants';
import type { Vertical } from '@/lib/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vertical = searchParams.get('vertical') as Vertical | null;
  const urgency = searchParams.get('urgency');
  const categoryCode = searchParams.get('category');

  if (!vertical) {
    return NextResponse.json({ error: 'vertical 파라미터가 필요합니다.' }, { status: 400 });
  }

  // 숨김 직역(병원 등, 런칭 보류)은 추천하지 않는다 → 빈 결과. result 페이지가 "추천할 전문가 없음" 표시.
  if (isHiddenVertical(vertical)) {
    return NextResponse.json({ experts: [], total: 0 });
  }

  // 로그인 사용자의 광역(시/도)을 세션에서 확인 → 지역 우선 추천. 없으면 전 지역 폴백
  const { profile } = await getCurrentUserProfile();
  const region = profile?.region ?? null;

  const experts = await getExpertRepository().listRecommended({ vertical, urgency, categoryCode, region });

  return NextResponse.json({ experts, total: experts.length });
}
