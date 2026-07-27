import { NextRequest, NextResponse } from 'next/server';
import { getExpertRepository } from '@/lib/experts/repository';
import { getCurrentUserProfile } from '@/lib/auth/user';
import { stripPhoneIfGuest } from '@/lib/experts/maskPhone';
import type { Vertical } from '@/lib/types';
import { VISIBLE_VERTICALS } from '@/lib/constants';

// UI 노출 직역만 필터로 허용 (숨김 직역은 URL 직접 호출 시 무시 → 전체 반환)
const VERTICALS: Vertical[] = VISIBLE_VERTICALS;

// seed·cursor·로그인 상태에 따라 응답이 달라지므로 매 요청 실행(빌드 타임 프리렌더 캐시 방지).
export const dynamic = 'force-dynamic';

// 둘러보기(미니홈피 디렉터리) 커서 페이지네이션. 하단 도달 시 클라이언트가 append 호출
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vRaw = searchParams.get('vertical');
  const vertical = vRaw && VERTICALS.includes(vRaw as Vertical) ? (vRaw as Vertical) : null;
  const categoryCode = searchParams.get('category') || null;
  const cursor = searchParams.get('cursor') || null;
  // 세션 랜덤 seed(공정 셔플). 정수만 허용, 없으면 undefined → 가나다순 폴백
  const seedRaw = Number(searchParams.get('seed'));
  const seed = Number.isFinite(seedRaw) && seedRaw > 0 ? Math.floor(seedRaw) : undefined;

  const { experts: raw, nextCursor } = await getExpertRepository().listBrowse({
    vertical,
    categoryCode,
    cursor,
    seed,
  });

  // 전화번호는 로그인 사용자에게만 (비로그인이면 phone 제거 → 우회 방지)
  const { user } = await getCurrentUserProfile();
  const experts = stripPhoneIfGuest(raw, Boolean(user));

  return NextResponse.json({ experts, nextCursor });
}
