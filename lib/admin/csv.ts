import Papa from 'papaparse';
import { z } from 'zod';
import { ExpertInput } from './types';

// D-05 / 설계 §6.5 — CSV 계약 (운영시간·3단계 상태·카테고리 포함)
// 내부 표준 키는 영문(컬럼 순서 기준). 한글 헤더·값은 아래 별칭으로 흡수.
export const CSV_HEADERS = [
  'name', 'vertical', 'specialties', 'region', 'phone',
  'experience_years', 'bio', 'youtube_url',
  'weekday_start', 'weekday_end', 'weekend_available', 'night_available', 'status',
  'category_codes', 'is_active',
] as const;

// 다운로드 템플릿에 쓰는 한글 헤더 (CSV_HEADERS 와 1:1 순서)
export const KOREAN_HEADERS = [
  '이름', '직업', '전문분야', '지역', '전화번호',
  '경력', '소개', '유튜브URL',
  '평일시작', '평일종료', '주말상담', '야간상담', '상담상태',
  '카테고리코드', '노출',
] as const;

// category_codes 는 선택 컬럼 — 없는 CSV도 허용(헤더 누락 검사에서 제외)
const OPTIONAL_HEADERS: string[] = ['category_codes'];

// 헤더 별칭: 한글/변형 → 표준 영문 키 (영문 헤더는 그대로 통과)
const HEADER_ALIASES: Record<string, string> = {
  ...Object.fromEntries(KOREAN_HEADERS.map((k, i) => [k, CSV_HEADERS[i]])),
  '전화': 'phone', '유튜브': 'youtube_url', '주말': 'weekend_available', '야간': 'night_available',
  '상태': 'status', '카테고리': 'category_codes', '활성': 'is_active', '노출여부': 'is_active',
};

const VERTICALS = ['lawyer', 'doctor', 'labor', 'patent', 'tax', 'adjuster', 'appraiser'] as const;
const STATUSES = ['available', 'delayed', 'unavailable'] as const;

// 값 별칭: 한글 → 영문 코드 (영문도 그대로 허용)
const VERTICAL_ALIAS: Record<string, string> = {
  '변호사': 'lawyer', '의사': 'doctor', '노무사': 'labor', '변리사': 'patent',
  '세무사': 'tax', '손해사정사': 'adjuster', '감정평가사': 'appraiser',
};
const STATUS_ALIAS: Record<string, string> = {
  '가능': 'available', '상담가능': 'available',
  '지연': 'delayed', '응답지연': 'delayed',
  '불가': 'unavailable', '상담불가': 'unavailable',
};

// 에러 표시용: 영문 키 → 한글명
const FIELD_KO: Record<string, string> =
  Object.fromEntries(CSV_HEADERS.map((k, i) => [k, KOREAN_HEADERS[i]]));

const boolField = (def: boolean) =>
  z.preprocess((v) => {
    const s = String(v ?? '').trim().toLowerCase();
    if (s === '') return def;
    if (s === 'true' || s === 'y' || s === 'yes' || s === '예' || s === 'o') return true;
    if (s === 'false' || s === 'n' || s === 'no' || s === '아니오' || s === 'x') return false;
    return s; // 잘못된 값 → 아래 boolean 검증서 실패
  }, z.boolean());

// 'HH:mm' (빈 값 → undefined)
const timeField = z.preprocess(
  (v) => { const s = String(v ?? '').trim(); return s === '' ? undefined : s; },
  z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:mm 형식').optional(),
);

const rowSchema = z.object({
  name: z.string().trim().min(1, '이름 필수').max(50),
  vertical: z.preprocess(
    (v) => { const s = String(v ?? '').trim(); return VERTICAL_ALIAS[s] ?? s; },
    z.enum(VERTICALS, { message: `직업은 변호사·의사·노무사·변리사·세무사·손해사정사·감정평가사 (또는 영문코드) 중 하나` }),
  ),
  specialties: z.preprocess(
    (v) => String(v ?? '').split('|').map((s) => s.trim()).filter(Boolean),
    z.array(z.string()),
  ),
  region: z.string().trim().min(1, '지역 필수').max(50),
  phone: z.string().trim().regex(/^[0-9-]{7,20}$/, '전화 형식(숫자·하이픈 7~20)'),
  experience_years: z.preprocess((v) => {
    const s = String(v ?? '').trim();
    return s === '' ? 0 : Number(s);
  }, z.number().int('정수').min(0).max(80)),
  bio: z.preprocess((v) => String(v ?? '').trim() || undefined, z.string().max(300).optional()),
  youtube_url: z.preprocess(
    (v) => String(v ?? '').trim() || undefined,
    z.string().url('URL 형식').optional(),
  ),
  weekday_start: timeField,
  weekday_end: timeField,
  weekend_available: boolField(false),
  night_available: boolField(false),
  status: z.preprocess(
    (v) => { const s = String(v ?? '').trim(); return s === '' ? 'available' : (STATUS_ALIAS[s] ?? s.toLowerCase()); },
    z.enum(STATUSES, { message: `상담상태는 가능·지연·불가 (또는 available/delayed/unavailable) 중 하나` }),
  ),
  // 카테고리 코드: '|' 구분, 형식 예) LAW-01 또는 TAX-02-01. 빈 값이면 []
  category_codes: z.preprocess(
    (v) => String(v ?? '').split('|').map((s) => s.trim().toUpperCase()).filter(Boolean),
    z.array(z.string().regex(/^[A-Z]{3}-\d{2}(-\d{2})?$/, '카테고리 코드 형식(예: LAW-01)')),
  ),
  is_active: boolField(true),
});

export interface RowError { row: number; field: string; message: string; }
export interface ParseResult {
  total: number;
  valid: ExpertInput[];
  errors: RowError[];
  duplicatePhonesInFile: string[];
}

export function parseExpertsCsv(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: true,
    // 한글/영문 헤더를 표준 영문 키로 정규화
    transformHeader: (h) => { const t = h.trim(); return HEADER_ALIASES[t] ?? t; },
  });

  const headers = parsed.meta.fields ?? [];
  const missing = CSV_HEADERS.filter((h) => !OPTIONAL_HEADERS.includes(h) && !headers.includes(h));
  if (missing.length) {
    const ko = missing.map((h) => FIELD_KO[h] ?? h);
    return {
      total: 0, valid: [], duplicatePhonesInFile: [],
      errors: [{ row: 0, field: 'header', message: `헤더 누락: ${ko.join(', ')}` }],
    };
  }

  const valid: ExpertInput[] = [];
  const errors: RowError[] = [];
  const seen = new Map<string, number>();
  const dups = new Set<string>();

  parsed.data.forEach((raw, i) => {
    const rowNo = i + 2; // 1=헤더
    const r = rowSchema.safeParse(raw);
    if (!r.success) {
      for (const issue of r.error.issues) {
        const key = String(issue.path[0] ?? '?');
        errors.push({ row: rowNo, field: FIELD_KO[key] ?? key, message: issue.message });
      }
      return;
    }
    const phone = r.data.phone;
    if (seen.has(phone)) {
      dups.add(phone);
      errors.push({ row: rowNo, field: '전화번호', message: `파일 내 중복 전화번호 (${phone})` });
      return;
    }
    seen.set(phone, rowNo);
    valid.push(r.data as ExpertInput);
  });

  return { total: parsed.data.length, valid, errors, duplicatePhonesInFile: [...dups] };
}

export function buildTemplateCsv(): string {
  // 한글 헤더 + 한글 값 예시 (직업=변호사, 상담상태=가능). 영문 코드도 허용됨.
  const example = [
    '김변호', '변호사', '형사|성범죄|사기', '서울 강남', '02-1234-5678',
    '12', '형사 전문 12년', 'https://youtu.be/q8ywJUQtAmk',
    '09:00', '18:00', 'N', 'N', '가능', 'LAW-01|LAW-02', 'Y',
  ];
  // 앞에 UTF-8 BOM(﻿) → Excel(Windows)에서 한글 안 깨짐. 업로드 파서는 BOM을 벗겨냄.
  return `﻿${KOREAN_HEADERS.join(',')}\n${example.join(',')}\n`;
}
