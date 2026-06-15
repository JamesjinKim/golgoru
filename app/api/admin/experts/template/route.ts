import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { buildTemplateCsv } from '@/lib/admin/csv';

export async function GET() {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  return new NextResponse(buildTemplateCsv(), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="experts-template.csv"',
    },
  });
}
