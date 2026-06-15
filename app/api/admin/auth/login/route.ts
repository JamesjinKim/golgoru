import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/admin/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { logAudit } from '@/lib/admin/audit';

// 미들웨어 matcher의 /api/admin/auth 예외 경로 — 로그인 전 접근 가능
export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: '이메일/비밀번호를 입력하세요.' }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    await logAudit({ actorEmail: email, action: 'auth.login.fail', detail: { reason: error?.message } });
    return NextResponse.json({ error: '로그인 실패' }, { status: 401 });
  }

  // 어드민 등록 여부 확인 (admin_users 미등록 = 어드민 아님)
  const { data: admin } = await supabaseAdmin
    .from('admin_users').select('role').eq('id', data.user.id).single();
  if (!admin) {
    await supabase.auth.signOut();
    await logAudit({ actorId: data.user.id, actorEmail: email, action: 'auth.login.fail', detail: { reason: 'not an admin' } });
    return NextResponse.json({ error: '어드민 권한이 없습니다.' }, { status: 403 });
  }

  await logAudit({ actorId: data.user.id, actorEmail: email, action: 'auth.login.success' });
  return NextResponse.json({ ok: true, role: admin.role });
}
