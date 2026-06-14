import { GoogleGenAI } from '@google/genai';
import { ClassifyResult, Vertical, Urgency } from './types';

let _ai: GoogleGenAI | null = null;
function getAI() {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  return _ai;
}

// 직업별 카테고리 코드 (level-1 중분류). experts-taxonomy.design.md §4 와 동기화.
const CATEGORY_GUIDE = `카테고리 코드 (선택한 vertical 안에서 가장 맞는 1개):
- lawyer: LAW-01 형사 | LAW-02 민사·계약 | LAW-03 부동산·임대차 | LAW-04 가사 | LAW-05 기업법무 | LAW-06 행정 | LAW-07 의료(소송) | LAW-08 IT·금융·지식재산(IT개인정보·저작권분쟁·소송·엔터) | LAW-09 기타(회생·파산 등)
- doctor: MED-01 응급·급성증상 | MED-02 내과·만성질환 | MED-03 정신건강 | MED-04 건강검진·예방 | MED-05 진료과안내·세컨드오피니언
- labor: LAB-01 노동사건(부당해고·임금체불·퇴직금·징계·직장내괴롭힘·노동위) | LAB-02 산재 | LAB-03 기업노무자문 | LAB-04 HR컨설팅 | LAB-05 산업안전 | LAB-06 노사관계 | LAB-07 건설노무
- patent: PAT-01 특허 | PAT-02 상표 | PAT-03 디자인 | PAT-04 실용신안 | PAT-05 해외출원·PCT | PAT-06 저작권(등록·상담)
- tax: TAX-01 기장 | TAX-02 재산제세(양도·상속·증여) | TAX-03 조사불복(세무조사) | TAX-04 컨설팅(가지급금·이익소각)
- adjuster: INS-01 보험금청구 | INS-02 자동차 | INS-03 재산(화재·침수·도난) | INS-04 배상책임 | INS-05 특수보험
- appraiser: APR-01 부동산감정평가 | APR-02 토지보상·수용 | APR-03 경매·담보감정 | APR-04 자산·동산평가`;

const CLASSIFY_PROMPT = `당신은 골고루 SOS 서비스의 AI 분류기입니다.
사용자가 처한 긴급 상황을 분석하여 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

버티컬(직업) 분류 기준:
- lawyer(변호사): 형사·민사·계약·사기·이혼·성추행·폭행, 그리고 의료'소송'·행정소송 등 법적 분쟁
- doctor(의사): 증상·응급·진단·건강 이상 등 건강 상담 (의료 '소송'은 lawyer)
- labor(노무사): 해고·임금체불·퇴직금·직장 내 괴롭힘·징계·산업재해
- patent(변리사): 특허·상표·디자인·실용신안 등 지식재산권 출원·침해. 저작권은 '등록·상담'만 변리사(저작권 분쟁·소송은 lawyer)
- tax(세무·회계: 세무사·회계사): 세무조사·세금신고·기장·양도/상속/증여세·절세 컨설팅·회계감사
- adjuster(손해사정사): 교통사고·산재·화재·재산 보험금, 배상책임 등 보험 손해사정
- appraiser(감정평가사): 부동산 감정평가·토지 보상/수용·경매 감정

규칙: 노동→labor, 세금→tax, 특허·상표→patent 로 보낸다(변호사 아님). 단 의료'소송'·행정소송은 lawyer.
저작권: 등록·출원·상담은 patent(PAT-06), 분쟁·침해·소송은 lawyer(LAW-08). 개인정보·콘텐츠분쟁은 lawyer(LAW-08).

${CATEGORY_GUIDE}

긴급도 기준:
- 즉시: 경찰/병원/사고현장 등 지금 당장 필요한 상황
- 당일: 오늘 내로 해결이 필요한 상황
- 일반: 며칠 내 상담으로 충분한 상황

응답 형식 (JSON만, 마크다운 코드블록 없이):
{"vertical":"...","category_code":"...","category":"...","urgency":"...","keywords":[...],"summary":"..."}`;

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
type Rule = { vertical: Vertical; code: string; category: string; urgency: Urgency; keywords: string[] };

const RULES: Rule[] = [
  { vertical: 'labor',    code: 'LAB-01', category: '노동사건(부당해고)',  urgency: '즉시', keywords: ['해고', '해직', '권고사직', '잘렸', '잘리'] },
  { vertical: 'labor',    code: 'LAB-01', category: '노동사건(임금체불)',  urgency: '당일', keywords: ['월급', '임금', '급여', '체불', '안 줘', '못 받', '퇴직금'] },
  { vertical: 'labor',    code: 'LAB-01', category: '노동사건(괴롭힘)',    urgency: '당일', keywords: ['직장', '괴롭힘', '상사', '갑질', '왕따'] },
  { vertical: 'labor',    code: 'LAB-02', category: '산재',                urgency: '당일', keywords: ['산재', '업무상 재해', '산업재해', '산재 신청'] },
  { vertical: 'adjuster', code: 'INS-02', category: '교통사고 보험', urgency: '즉시', keywords: ['교통사고', '사고 났', '차 사고', '충돌', '접촉사고'] },
  { vertical: 'adjuster', code: 'INS-01', category: '보험금 청구',   urgency: '당일', keywords: ['보험', '보험금', '산재', '손해사정'] },
  { vertical: 'tax',      code: 'TAX-03', category: '조사불복',      urgency: '즉시', keywords: ['세무조사', '세무서', '국세청', '세금조사'] },
  { vertical: 'tax',      code: 'TAX-02', category: '재산제세',      urgency: '일반', keywords: ['세금', '양도세', '상속세', '증여세', '절세'] },
  { vertical: 'doctor',   code: 'MED-01', category: '응급 증상',     urgency: '즉시', keywords: ['응급', '쓰러', '호흡', '심장', '의식', '가슴통증'] },
  { vertical: 'doctor',   code: 'MED-02', category: '건강 상담',     urgency: '당일', keywords: ['증상', '아파', '통증', '병원', '진단'] },
  { vertical: 'lawyer',   code: 'LAW-01', category: '형사(성범죄)',  urgency: '즉시', keywords: ['성추행', '성희롱', '무고', '강제추행', '성폭력'] },
  { vertical: 'lawyer',   code: 'LAW-01', category: '형사 사건',     urgency: '즉시', keywords: ['경찰', '조사', '체포', '고소', '형사', '사기', '속았', '돈 떼'] },
  { vertical: 'lawyer',   code: 'LAW-04', category: '이혼/가사',     urgency: '일반', keywords: ['이혼', '양육', '가사', '위자료', '친권'] },
  { vertical: 'lawyer',   code: 'LAW-03', category: '부동산·임대차', urgency: '일반', keywords: ['전세', '보증금', '임대차', '명도', '권리금'] },
  { vertical: 'patent',   code: 'PAT-01', category: '특허',          urgency: '일반', keywords: ['특허', '실용신안', '지식재산', '특허침해'] },
  { vertical: 'patent',   code: 'PAT-02', category: '상표',          urgency: '일반', keywords: ['상표', '브랜드 도용', '디자인권'] },
  { vertical: 'patent',   code: 'PAT-06', category: '저작권(등록·상담)', urgency: '일반', keywords: ['저작권 등록', '저작권 출원', '저작물 등록'] },
  { vertical: 'appraiser', code: 'APR-01', category: '부동산 감정평가', urgency: '일반', keywords: ['감정평가', '부동산 평가', '시가 산정'] },
  { vertical: 'appraiser', code: 'APR-02', category: '토지보상·수용', urgency: '일반', keywords: ['토지 보상', '수용', '보상금 산정', '경매 감정'] },
];

function localClassify(query: string): ClassifyResult {
  for (const rule of RULES) {
    if (rule.keywords.some(kw => query.includes(kw))) {
      return {
        vertical: rule.vertical,
        category_code: rule.code,
        category: rule.category,
        urgency: rule.urgency,
        keywords: rule.keywords.filter(kw => query.includes(kw)),
        summary: `${rule.category} 관련 상황으로 분류되었습니다.`,
      };
    }
  }
  // 기본값: 법률 일반 (코드 없이 vertical 폴백)
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
      category_code: parsed.category_code ?? undefined,
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
    category_code: parsed.category_code ?? undefined,
    category: parsed.category ?? '법률 상담',
    urgency: parsed.urgency as Urgency,
    keywords: parsed.keywords ?? [],
    summary: parsed.summary ?? `${parsed.category ?? ''} 관련 상황으로 분류되었습니다.`,
    transcript,
  };
}
