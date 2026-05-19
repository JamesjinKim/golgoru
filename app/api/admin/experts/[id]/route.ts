import { NextRequest, NextResponse } from 'next/server';
import { MOCK_EXPERTS } from '@/lib/mock-data';

// 목데이터 기반 — DB 연결 전 디자인 검증용
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const expert = MOCK_EXPERTS.find(e => e.id === id);
  if (!expert) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ...expert, ...body });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const expert = MOCK_EXPERTS.find(e => e.id === id);
  if (!expert) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ...expert, ...body });
}
