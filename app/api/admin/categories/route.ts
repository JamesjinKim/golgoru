import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin/auth';

// 어드민 폼용: 직업별 카테고리(중분류) 목록. middleware 로 /api/admin/* 인증.
export async function GET() {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('code,vertical,level,label')
    .eq('is_active', true)
    .order('code', { ascending: true });

  if (error) {
    console.error('[admin/categories] list error:', error);
    return NextResponse.json({ error: '카테고리 조회 실패' }, { status: 500 });
  }
  return NextResponse.json({ categories: data ?? [] });
}
