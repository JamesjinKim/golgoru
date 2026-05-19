import { NextRequest, NextResponse } from 'next/server';
import { MOCK_EXPERTS } from '@/lib/mock-data';

// 목데이터 기반 in-memory store (서버 재시작 시 초기화됨)
let store = [...MOCK_EXPERTS];

export async function GET() {
  return NextResponse.json({ experts: store });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const newExpert = {
    ...body,
    id: `mock-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  store = [newExpert, ...store];
  return NextResponse.json(newExpert, { status: 201 });
}
