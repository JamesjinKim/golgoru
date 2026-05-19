import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit } from '@/lib/admin/audit';

const SELECT = 'id,name,vertical,specialties,region,phone,experience_years,bio,youtube_url,is_available,is_active,created_at';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const q = req.nextUrl.searchParams.get('q')?.trim();
  let query = supabaseAdmin.from('experts').select(SELECT).order('created_at', { ascending: false });
  if (q) query = query.or(`name.ilike.%${q}%,region.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) {
    console.error('[admin/experts] list error:', error);
    return NextResponse.json({ error: '목록 조회 실패' }, { status: 500 });
  }
  return NextResponse.json({ experts: data ?? [], total: data?.length ?? 0 });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.vertical || !body?.region || !body?.phone) {
    return NextResponse.json({ error: 'name·vertical·region·phone 필수' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('experts')
    .insert({
      name: body.name,
      vertical: body.vertical,
      specialties: body.specialties ?? [],
      region: body.region,
      phone: body.phone,
      experience_years: body.experience_years ?? 0,
      bio: body.bio ?? null,
      youtube_url: body.youtube_url ?? null,
      is_available: body.is_available ?? true,
      is_active: body.is_active ?? true,
    })
    .select(SELECT)
    .single();

  if (error) {
    console.error('[admin/experts] create error:', error);
    return NextResponse.json({ error: '생성 실패' }, { status: 500 });
  }

  await logAudit({
    actorId: guard.identity.userId, actorEmail: guard.identity.email,
    action: 'expert.create', targetTable: 'experts', targetId: data.id,
    detail: { name: data.name, vertical: data.vertical },
  });
  return NextResponse.json(data, { status: 201 });
}
