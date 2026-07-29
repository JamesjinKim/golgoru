import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/auth/user';
import { supabaseAdmin } from '@/lib/supabase';

// 로그인 상태에 따라 달라지므로 매 요청 실행(프리렌더 캐시 방지)
export const dynamic = 'force-dynamic';

const SOURCES = new Set(['detail', 'contact', 'card']);

// 통화 연결 로그(B): 전문가 전화 버튼 클릭 이벤트를 기록. fire-and-forget — 실패해도 사용자 흐름 안 막음.
// user_id는 클라이언트 값을 신뢰하지 않고 서버 세션(getCurrentUserProfile)으로 재확정한다(위·변조 방지).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const expertId = typeof body?.expertId === 'string' ? body.expertId : null;
    const vertical = typeof body?.vertical === 'string' ? body.vertical : null;
    const source = typeof body?.source === 'string' && SOURCES.has(body.source) ? body.source : null;
    if (!expertId) return NextResponse.json({ ok: false }, { status: 400 });

    const { user } = await getCurrentUserProfile();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    await supabaseAdmin.from('call_logs').insert({
      user_id: user.id,
      expert_id: expertId,
      vertical,
      source,
    });
  } catch (err) {
    console.error('[calls] 통화 로그 저장 실패(무시):', err);
  }
  return NextResponse.json({ ok: true });
}
