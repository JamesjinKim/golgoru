import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';

// 어드민 세션 유효성 확인용 경량 엔드포인트.
// 유효하면 200(email·role), 아니면 requireAdmin 이 401/403 반환.
// 유효 세션일 때 getUser() 가 필요 시 토큰을 갱신하므로 keep-alive 역할도 겸한다.
export async function GET() {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;
  return NextResponse.json({ email: guard.identity.email, role: guard.identity.role });
}
