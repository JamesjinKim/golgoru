import { NextRequest, NextResponse } from 'next/server';
import { classifyQuery, classifyAudio, GeminiConfigError } from '@/lib/gemini';
import { getCurrentUserProfile } from '@/lib/auth/user';
import { supabaseAdmin } from '@/lib/supabase';
import type { ClassifyResult } from '@/lib/types';

const MAX_AUDIO_BYTES = 2.5 * 1024 * 1024; // 설계 §4.3: 정상 60s WAV ≈1.9MB, 초과는 비정상

// 추천 분석 로그(A) 저장. 어드민 분석·홍보용. fire-and-forget: 실패해도 분류 응답을 막지 않는다.
// SOS 입력은 로그인 필수(SosInput이 비로그인 차단)라 user가 대개 존재. 없으면 스킵.
async function logRecommendation(result: ClassifyResult, query: string, inputType: 'text' | 'voice') {
  try {
    const { user } = await getCurrentUserProfile();
    if (!user) return;
    await supabaseAdmin.from('recommendation_logs').insert({
      user_id: user.id,
      query,
      input_type: inputType,
      vertical: result.vertical,
      category: result.category ?? null,
      category_code: result.category_code ?? null,
      urgency: result.urgency ?? null,
    });
  } catch (err) {
    console.error('[classify] recommendation log 저장 실패(무시):', err);
  }
}

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
      // 음성은 원문이 없으므로 Gemini 받아쓰기(transcript)를 query로 저장
      await logRecommendation(result, result.transcript ?? '', 'voice');
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
    const trimmed = query.trim();
    const result = await classifyQuery(trimmed);
    await logRecommendation(result, trimmed, 'text');
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[classify] error:', err);
    return NextResponse.json(
      { error: '분류 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 },
    );
  }
}
