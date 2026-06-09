import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit } from '@/lib/admin/audit';
import { parseExpertsCsv } from '@/lib/admin/csv';

const MAX_BYTES = 2 * 1024 * 1024; // ≈ 수천 행

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const mode = req.nextUrl.searchParams.get('mode') ?? 'validate';

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get('file');
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: '파일 전송 실패' }, { status: 400 });
  }
  if (!file || file.size === 0) return NextResponse.json({ error: 'CSV 파일이 필요합니다.' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: '파일이 너무 큽니다(최대 2MB).' }, { status: 413 });

  const text = await file.text();
  const result = parseExpertsCsv(text);

  if (result.errors.some((e) => e.field === 'header')) {
    return NextResponse.json({ error: result.errors[0].message, ...result }, { status: 400 });
  }
  if (result.valid.length === 0) {
    return NextResponse.json({ error: '유효한 행이 없습니다.', ...result }, { status: 422 });
  }

  if (mode === 'validate') {
    return NextResponse.json({
      mode: 'validate',
      total: result.total,
      valid: result.valid.length,
      errorCount: result.errors.length,
      errors: result.errors.slice(0, 200),
      preview: result.valid.slice(0, 20),
    });
  }

  // mode=commit — DB 기존 phone 중복 제외 후 일괄 insert (부분 성공)
  const phones = result.valid.map((v) => v.phone);
  const { data: existing } = await supabaseAdmin
    .from('experts').select('phone').in('phone', phones);
  const existSet = new Set((existing ?? []).map((e: { phone: string }) => e.phone));

  const toInsert = result.valid.filter((v) => !existSet.has(v.phone));
  const skippedExisting = result.valid.length - toInsert.length;

  let inserted = 0;
  let categoriesLinked = 0;
  if (toInsert.length) {
    // experts 테이블엔 category_codes 컬럼이 없으므로 분리해서 insert
    const expertRows = toInsert.map((v) => {
      const r: Record<string, unknown> = { ...v };
      delete r.category_codes;
      return r;
    });
    const { data, error } = await supabaseAdmin.from('experts').insert(expertRows).select('id,phone');
    if (error) {
      console.error('[admin/import] insert error:', error);
      return NextResponse.json({ error: '일괄 등록 실패' }, { status: 500 });
    }
    inserted = data?.length ?? 0;

    // 카테고리 연결: DB에 존재하는 코드만 expert_categories 로
    const idByPhone = new Map((data ?? []).map((r: { id: string; phone: string }) => [r.phone, r.id]));
    const { data: cats } = await supabaseAdmin.from('categories').select('code');
    const known = new Set((cats ?? []).map((c: { code: string }) => c.code));
    const ecRows: { expert_id: string; category_code: string }[] = [];
    for (const row of toInsert) {
      const id = idByPhone.get(row.phone);
      if (!id) continue;
      for (const code of row.category_codes ?? []) {
        if (known.has(code)) ecRows.push({ expert_id: id, category_code: code });
      }
    }
    if (ecRows.length) {
      const { error: ecErr } = await supabaseAdmin.from('expert_categories').insert(ecRows);
      if (!ecErr) categoriesLinked = ecRows.length;
      else console.error('[admin/import] expert_categories error:', ecErr);
    }
  }

  await logAudit({
    actorId: guard.identity.userId, actorEmail: guard.identity.email,
    action: 'expert.import', targetTable: 'experts',
    detail: { total: result.total, inserted, skippedExisting, categoriesLinked, rowErrors: result.errors.length },
  });

  return NextResponse.json({
    mode: 'commit',
    total: result.total,
    inserted,
    skippedExisting,
    categoriesLinked,
    rowErrors: result.errors.length,
    errors: result.errors.slice(0, 200),
  });
}
