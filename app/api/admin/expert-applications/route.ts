import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin/auth';
import type { ExpertApplicationStatus } from '@/lib/admin/types';

const SELECT = 'id,name,phone,vertical,message,status,created_at';
const STATUSES: ExpertApplicationStatus[] = ['new', 'contacted', 'done'];

// 입점신청 목록 조회 (어드민). ?status= 필터, ?q= 성명·연락처 검색. 미처리(신규) 우선.
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const status = req.nextUrl.searchParams.get('status')?.trim();
  const q = req.nextUrl.searchParams.get('q')?.trim();

  let query = supabaseAdmin
    .from('expert_applications')
    .select(SELECT)
    // status 알파벳순(contacted<done<new)이 아니라 신규를 먼저 보기 위해 created_at 최신순만 사용
    .order('created_at', { ascending: false });

  if (status && STATUSES.includes(status as ExpertApplicationStatus)) {
    query = query.eq('status', status);
  }
  if (q) {
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[admin/expert-applications] list error:', error);
    return NextResponse.json({ error: '목록 조회 실패' }, { status: 500 });
  }
  return NextResponse.json({ applications: data ?? [], total: (data ?? []).length });
}
