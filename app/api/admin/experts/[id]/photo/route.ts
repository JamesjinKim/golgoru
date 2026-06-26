import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { validateUpload, toSquareWebp } from '@/lib/experts/photo';

const BUCKET = 'expert-photos';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '파일이 없습니다.' }, { status: 422 });
  }
  const invalid = validateUpload({ type: file.type, size: file.size });
  if (invalid) return NextResponse.json({ error: invalid }, { status: 422 });

  const webp = await toSquareWebp(Buffer.from(await file.arrayBuffer()));
  const objectPath = `${id}.webp`;

  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(objectPath, webp, { contentType: 'image/webp', upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(objectPath);
  // 캐시 무력화: 같은 경로 덮어쓰기라 쿼리스트링으로 버전
  const photo_url = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: dbErr } = await supabaseAdmin
    .from('experts')
    .update({ photo_url })
    .eq('id', id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ photo_url });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const { id } = await params;
  await supabaseAdmin.storage.from(BUCKET).remove([`${id}.webp`]);
  const { error } = await supabaseAdmin.from('experts').update({ photo_url: null }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
