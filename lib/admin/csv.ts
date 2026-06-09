import Papa from 'papaparse';
import { z } from 'zod';
import { ExpertInput } from './types';

// D-05 / 설계 §6.5 — CSV 계약 (운영시간·3단계 상태·카테고리 포함)
export const CSV_HEADERS = [
  'name', 'vertical', 'specialties', 'region', 'phone',
  'experience_years', 'bio', 'youtube_url',
  'weekday_start', 'weekday_end', 'weekend_available', 'night_available', 'status',
  'category_codes', 'is_active',
] as const;

// category_codes 는 선택 컬럼 — 없는 CSV도 허용(헤더 누락 검사에서 제외)
const OPTIONAL_HEADERS = ['category_codes'];

const VERTICALS = ['lawyer', 'doctor', 'labor', 'patent', 'tax', 'adjuster', 'appraiser'] as const;
const STATUSES = ['available', 'delayed', 'unavailable'] as const;

const boolField = (def: boolean) =>
  z.preprocess((v) => {
    const s = String(v ?? '').trim().toLowerCase();
    if (s === '') return def;
    if (s === 'true' || s === 'y' || s === 'yes') return true;
    if (s === 'false' || s === 'n' || s === 'no') return false;
    return s; // 잘못된 값 → 아래 boolean 검증서 실패
  }, z.boolean());

// 'HH:mm' (빈 값 → undefined)
const timeField = z.preprocess(
  (v) => { const s = String(v ?? '').trim(); return s === '' ? undefined : s; },
  z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:mm 형식').optional(),
);

const rowSchema = z.object({
  name: z.string().trim().min(1, 'name 필수').max(50),
  vertical: z.enum(VERTICALS, { message: `vertical은 ${VERTICALS.join('|')} 중 하나` }),
  specialties: z.preprocess(
    (v) => String(v ?? '').split('|').map((s) => s.trim()).filter(Boolean),
    z.array(z.string()),
  ),
  region: z.string().trim().min(1, 'region 필수').max(50),
  phone: z.string().trim().regex(/^[0-9-]{7,20}$/, 'phone 형식(숫자·하이픈 7~20)'),
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
    (v) => { const s = String(v ?? '').trim().toLowerCase(); return s === '' ? 'available' : s; },
    z.enum(STATUSES, { message: `status는 ${STATUSES.join('|')} 중 하나` }),
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
    transformHeader: (h) => h.trim(),
  });

  const headers = parsed.meta.fields ?? [];
  const missing = CSV_HEADERS.filter((h) => !OPTIONAL_HEADERS.includes(h) && !headers.includes(h));
  if (missing.length) {
    return {
      total: 0, valid: [], duplicatePhonesInFile: [],
      errors: [{ row: 0, field: 'header', message: `헤더 누락: ${missing.join(', ')}` }],
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
        errors.push({ row: rowNo, field: String(issue.path[0] ?? '?'), message: issue.message });
      }
      return;
    }
    const phone = r.data.phone;
    if (seen.has(phone)) {
      dups.add(phone);
      errors.push({ row: rowNo, field: 'phone', message: `파일 내 중복 phone (${phone})` });
      return;
    }
    seen.set(phone, rowNo);
    valid.push(r.data as ExpertInput);
  });

  return { total: parsed.data.length, valid, errors, duplicatePhonesInFile: [...dups] };
}

export function buildTemplateCsv(): string {
  const example = [
    '김변호', 'lawyer', '형사|성범죄|사기', '서울 강남', '02-1234-5678',
    '12', '형사 전문 12년', 'https://youtube.com/@example',
    '09:00', '18:00', 'N', 'N', 'available', 'LAW-01|LAW-02', 'true',
  ];
  return `${CSV_HEADERS.join(',')}\n${example.join(',')}\n`;
}
