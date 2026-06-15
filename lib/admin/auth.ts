import { NextResponse } from 'next/server';
import { getServerSupabase } from './supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { AdminIdentity, AdminRole } from './types';

// 세션 → admin_users 역할 조회. 어드민 아니면 null.
export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .select('role, email')
    .eq('id', user.id)
    .single();
  if (error || !data) return null;

  return { userId: user.id, email: data.email ?? user.email ?? '', role: data.role as AdminRole };
}

// Route Handler 가드: 미인증 401, 권한부족 403. 통과 시 identity 반환.
export async function requireAdmin(
  minRole: AdminRole = 'operator',
): Promise<{ identity: AdminIdentity } | { response: NextResponse }> {
  const identity = await getAdminIdentity();
  if (!identity) {
    return { response: NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 }) };
  }
  if (minRole === 'super_admin' && identity.role !== 'super_admin') {
    return { response: NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 }) };
  }
  return { identity };
}
