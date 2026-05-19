import { NextRequest, NextResponse } from 'next/server';
import { classifyQuery, classifyAudio, GeminiConfigError } from '@/lib/gemini';

const MAX_AUDIO_BYTES = 2.5 * 1024 * 1024; // 설계 §4.3: 정상 60s WAV ≈1.9MB, 초과는 비정상

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? '';

  // ── 음성 경로 (multipart/form-data) ──────────────────────────────
  if (contentType.includes('multipart/form-data')) {
    let audio: File | null = null;
    try {
      const form = await req.formData();
      const f = form.get('audio');
      if (f instanceof File) audio = f;
    } catch {
      return NextResponse.json({ error: '오디오 전송에 실패했습니다. 다시 녹음해주세요.' }, { status: 400 });
    }

    if (!audio || audio.size === 0) {
      return NextResponse.json({ error: '다시 녹음해주세요.' }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: '녹음이 너무 깁니다. 짧게 다시 녹음해주세요.' }, { status: 413 });
    }

    try {
      const base64 = Buffer.from(await audio.arrayBuffer()).toString('base64');
      const result = await classifyAudio(base64, 'audio/wav');
      return NextResponse.json(result);
    } catch (err: unknown) {
      if (err instanceof GeminiConfigError) {
        return NextResponse.json(
          { error: '음성 분석을 일시적으로 사용할 수 없습니다. 텍스트로 입력해주세요.' },
          { status: 503 },
        );
      }
      const status = (err as { status?: number })?.status;
      if (status === 422) {
        return NextResponse.json(
          { error: '음성이 인식되지 않았습니다. 다시 시도해주세요.' },
          { status: 422 },
        );
      }
      console.error('[classify] audio error:', err);
      return NextResponse.json(
        { error: '분류 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 500 },
      );
    }
  }

  // ── 텍스트 경로 (application/json, 기존 동작 불변) ────────────────
  const { query } = await req.json();

  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return NextResponse.json({ error: '상황을 입력해주세요.' }, { status: 400 });
  }

  try {
    const result = await classifyQuery(query.trim());
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[classify] error:', err);
    return NextResponse.json(
      { error: '분류 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 },
    );
  }
}
