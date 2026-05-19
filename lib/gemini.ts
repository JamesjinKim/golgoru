import { GoogleGenAI } from '@google/genai';
import { ClassifyResult, Vertical, Urgency } from './types';

let _ai: GoogleGenAI | null = null;
function getAI() {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  return _ai;
}

const CLASSIFY_PROMPT = `당신은 골고루 SOS 서비스의 AI 분류기입니다.
사용자가 처한 긴급 상황을 분석하여 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

버티컬 분류 기준:
- lawyer: 법적 분쟁, 경찰, 형사, 민사, 계약, 사기, 이혼, 성추행, 폭행 등
- labor: 해고, 임금체불, 직장 내 괴롭힘, 노동 분쟁, 근로계약 등
- adjuster: 교통사고, 산재, 보험금, 손해배상, 화재 등
- tax: 세무조사, 세금, 절세, 상속, 세금계산서, 부가세 등
- doctor: 증상, 응급, 진단, 처방, 건강 이상, 병원 등

긴급도 기준:
- 즉시: 경찰/병원/사고현장 등 지금 당장 필요한 상황
- 당일: 오늘 내로 해결이 필요한 상황
- 일반: 며칠 내 상담으로 충분한 상황

응답 형식 (JSON만, 마크다운 코드블록 없이):
{"vertical":"...","category":"...","urgency":"...","keywords":[...],"summary":"..."}`;

// 오디오 입력용: 받아쓰기 + 분류를 1콜로 (설계 §4.2)
const AUDIO_CLASSIFY_PROMPT = `${CLASSIFY_PROMPT}

추가 지시: 먼저 첨부된 한국어 음성을 그대로 받아쓰기(transcript)한 뒤, 그 내용으로 위 분류를 수행하세요.
응답 형식 (JSON만, 마크다운 코드블록 없이):
{"transcript":"받아쓴 원문","vertical":"...","category":"...","urgency":"...","keywords":[...],"summary":"..."}`;

// 운영 설정 오류(키 부재 등) — route에서 503으로 매핑 (설계 §4.3)
export class GeminiConfigError extends Error {
  status = 503;
  constructor(message: string) {
    super(message);
    this.name = 'GeminiConfigError';
  }
}

// ── 로컬 키워드 분류기 (Gemini 할당량 초과 시 폴백) ──────────────────
type Rule = { vertical: Vertical; category: string; urgency: Urgency; keywords: string[] };

const RULES: Rule[] = [
  { vertical: 'labor',    category: '부당해고',       urgency: '즉시', keywords: ['해고', '해직', '권고사직', '잘렸', '잘리'] },
  { vertical: 'labor',    category: '임금체불',        urgency: '당일', keywords: ['월급', '임금', '급여', '체불', '안 줘', '못 받'] },
  { vertical: 'labor',    category: '직장 내 괴롭힘',  urgency: '당일', keywords: ['직장', '괴롭힘', '상사', '갑질', '왕따'] },
  { vertical: 'adjuster', category: '교통사고',        urgency: '즉시', keywords: ['교통사고', '사고 났', '차 사고', '충돌', '접촉사고'] },
  { vertical: 'adjuster', category: '보험금 분쟁',     urgency: '당일', keywords: ['보험', '보험금', '산재', '손해'] },
  { vertical: 'tax',      category: '세무조사',        urgency: '즉시', keywords: ['세무조사', '세무서', '국세청', '세금조사'] },
  { vertical: 'tax',      category: '세금 상담',       urgency: '일반', keywords: ['세금', '부가세', '종합소득세', '상속세', '절세'] },
  { vertical: 'doctor',   category: '응급 증상',       urgency: '즉시', keywords: ['응급', '쓰러', '호흡', '심장', '의식'] },
  { vertical: 'doctor',   category: '건강 상담',       urgency: '당일', keywords: ['증상', '아파', '통증', '병원', '진단'] },
  { vertical: 'lawyer',   category: '성범죄 무고',     urgency: '즉시', keywords: ['성추행', '성희롱', '무고', '강제추행', '성폭력'] },
  { vertical: 'lawyer',   category: '형사 사건',       urgency: '즉시', keywords: ['경찰', '조사', '체포', '고소', '형사'] },
  { vertical: 'lawyer',   category: '사기 피해',       urgency: '당일', keywords: ['사기', '속았', '피해', '돈 떼'] },
  { vertical: 'lawyer',   category: '이혼/가사',       urgency: '일반', keywords: ['이혼', '양육', '가사', '위자료', '친권'] },
];

function localClassify(query: string): ClassifyResult {
  for (const rule of RULES) {
    if (rule.keywords.some(kw => query.includes(kw))) {
      return {
        vertical: rule.vertical,
        category: rule.category,
        urgency: rule.urgency,
        keywords: rule.keywords.filter(kw => query.includes(kw)),
        summary: `${rule.category} 관련 상황으로 분류되었습니다.`,
      };
    }
  }
  // 기본값: 법률 일반
  return {
    vertical: 'lawyer',
    category: '법률 상담',
    urgency: '일반',
    keywords: [],
    summary: '법률 전문가 상담이 필요한 상황으로 분류되었습니다.',
  };
}

// ── 메인 함수: Gemini 우선, 429/오류 시 로컬 폴백 ────────────────────
export async function classifyQuery(query: string): Promise<ClassifyResult> {
  // Gemini API 키가 없으면 바로 로컬 분류
  if (!process.env.GEMINI_API_KEY) {
    return localClassify(query);
  }

  try {
    // flash-lite + thinking off: 분류 지연 7s→~1.5s (단순 구조화 작업이라 품질 영향 미미)
    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: `${CLASSIFY_PROMPT}\n\n사용자 입력: ${query}`,
      config: { thinkingConfig: { thinkingBudget: 0 } },
    });

    const text = response.text?.trim() ?? '';
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(cleaned);

    return {
      vertical: parsed.vertical as Vertical,
      category: parsed.category,
      urgency: parsed.urgency as Urgency,
      keywords: parsed.keywords,
      summary: parsed.summary,
    };
  } catch (err: unknown) {
    // 429 할당량 초과 또는 기타 API 오류 → 로컬 분류로 폴백
    const status = (err as { status?: number })?.status;
    if (status === 429 || status === 503 || status === 500) {
      console.warn('[gemini] API quota exceeded, falling back to local classifier');
      return localClassify(query);
    }
    throw err;
  }
}

// ── 오디오 분류: 받아쓰기 + 분류 1콜 (설계 §4.2) ──────────────────
// 오디오는 원문이 없어 로컬 폴백 불가. 키 부재 → 503, API 오류 → throw.
export async function classifyAudio(
  audioBase64: string,
  mimeType: string,
): Promise<ClassifyResult> {
  if (!process.env.GEMINI_API_KEY) {
    console.error('[gemini] GEMINI_API_KEY missing — audio classify unavailable');
    throw new GeminiConfigError('GEMINI_API_KEY is not configured');
  }

  let parsed: { transcript?: string } & Partial<ClassifyResult>;
  try {
    // 오디오는 받아쓰기 충실도 위해 flash 유지, thinking만 off로 지연 단축 (iOS 폴백 경로)
    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { inlineData: { mimeType, data: audioBase64 } },
        { text: AUDIO_CLASSIFY_PROMPT },
      ],
      config: { thinkingConfig: { thinkingBudget: 0 } },
    });
    const text = response.text?.trim() ?? '';
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    parsed = JSON.parse(cleaned);
  } catch (err: unknown) {
    console.error('[gemini] audio classify failed:', err);
    throw err; // 오디오는 transcript 없이 로컬 분류 불가 → route에서 500
  }

  const transcript = (parsed.transcript ?? '').trim();
  if (!transcript) {
    // 받아쓰기 실패 — 무음/잡음. 클라이언트가 재시도 안내.
    const e = new Error('빈 transcript');
    (e as { status?: number }).status = 422;
    throw e;
  }

  return {
    vertical: parsed.vertical as Vertical,
    category: parsed.category ?? '법률 상담',
    urgency: parsed.urgency as Urgency,
    keywords: parsed.keywords ?? [],
    summary: parsed.summary ?? `${parsed.category ?? ''} 관련 상황으로 분류되었습니다.`,
    transcript,
  };
}
