'use client';
import { useEffect, useState } from 'react';
import { VERTICAL_LABEL, VISIBLE_VERTICALS } from '@/lib/constants';
import type { Vertical } from '@/lib/types';

interface RowError { row: number; field: string; message: string }
interface ValidateRes {
  total: number; valid: number; errorCount: number;
  errors: RowError[]; preview: Record<string, unknown>[];
}
interface CommitRes {
  total: number; inserted: number; skippedExisting: number; categoriesLinked: number; rowErrors: number;
}
type Cat = { code: string; vertical: Vertical; level: number; label: string };

// 컬럼 가이드 (한글 헤더 기준 · 템플릿과 동일 순서)
const COLS: { key: string; desc: string; required: boolean; example: string }[] = [
  { key: '이름', desc: '전문가 이름', required: true, example: '김변호' },
  { key: '직업', desc: '변호사·의사·노무사·변리사·세무사·손해사정사 (영문코드도 가능)', required: true, example: '변호사' },
  { key: '전문분야', desc: '표시용 텍스트, | 로 구분', required: false, example: '형사|사기' },
  { key: '지역', desc: '활동 지역', required: true, example: '서울 강남' },
  { key: '전화번호', desc: '숫자·하이픈, 중복 불가', required: true, example: '02-1234-5678' },
  { key: '경력', desc: '경력(년), 숫자', required: false, example: '12' },
  { key: '소개', desc: '한 줄 소개', required: false, example: '형사 전문 12년' },
  { key: '유튜브URL', desc: '유튜브 링크', required: false, example: 'https://youtu.be/..' },
  { key: '평일시작', desc: '평일 상담 시작 (HH:mm)', required: false, example: '09:00' },
  { key: '평일종료', desc: '평일 상담 종료 (HH:mm)', required: false, example: '18:00' },
  { key: '주말상담', desc: '주말 가능 (Y/N)', required: false, example: 'N' },
  { key: '야간상담', desc: '야간 가능 (Y/N)', required: false, example: 'N' },
  { key: '상담상태', desc: '가능·지연·불가 (영문 available/delayed/unavailable도 가능)', required: false, example: '가능' },
  { key: '카테고리코드', desc: '전문 분야 코드, | 로 구분 (아래 표 참고)', required: false, example: 'LAW-01|LAW-03' },
  { key: '노출', desc: '노출 여부 (Y/N)', required: false, example: 'Y' },
];

// 노출 직역만 (감정평가사 등 숨김 제외)
const VORDER: Vertical[] = VISIBLE_VERTICALS;

export default function CsvImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [validateRes, setValidateRes] = useState<ValidateRes | null>(null);
  const [commitRes, setCommitRes] = useState<CommitRes | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cats, setCats] = useState<Cat[]>([]);

  useEffect(() => {
    fetch('/api/admin/categories').then((r) => r.json()).then((d) => setCats(d.categories ?? [])).catch(() => {});
  }, []);

  const send = async (mode: 'validate' | 'commit') => {
    if (!file) return;
    setBusy(true); setError('');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/admin/experts/import?mode=${mode}`, { method: 'POST', body: fd });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(j.error || '처리 실패'); return; }
    if (mode === 'validate') { setValidateRes(j); setCommitRes(null); }
    else { setCommitRes(j); setValidateRes(null); setFile(null); }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-lg font-bold text-slate-900">전문가 CSV 일괄등록</h1>
      <p className="mb-5 text-sm text-slate-500">아래 형식에 맞춰 CSV를 만들어 업로드하세요. 템플릿을 받아 채우면 가장 쉽습니다.</p>

      {/* 데이터 입력 방법 */}
      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">📋 데이터 입력 방법</h2>
          <a href="/api/admin/experts/template"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
            ⬇ 템플릿 CSV 다운로드
          </a>
        </div>

        <div className="overflow-x-auto rounded-md border border-slate-100">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-2 py-1.5 font-medium">컬럼</th>
                <th className="px-2 py-1.5 font-medium">설명</th>
                <th className="px-2 py-1.5 font-medium">필수</th>
                <th className="px-2 py-1.5 font-medium">예시</th>
              </tr>
            </thead>
            <tbody>
              {COLS.map((c) => (
                <tr key={c.key} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-mono text-slate-800">{c.key}</td>
                  <td className="px-2 py-1.5 text-slate-600">{c.desc}</td>
                  <td className="px-2 py-1.5">
                    {c.required
                      ? <span className="rounded bg-red-100 px-1.5 py-0.5 font-semibold text-red-600">필수</span>
                      : <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">선택</span>}
                  </td>
                  <td className="px-2 py-1.5 font-mono text-slate-500">{c.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 rounded-md bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-800">
          <b>형식 규칙</b> · 여러 값은 <code className="rounded bg-amber-100 px-1">|</code> 로 구분 (예: <code className="rounded bg-amber-100 px-1">형사|사기</code>)
          · 예/아니오는 <code className="rounded bg-amber-100 px-1">Y</code>/<code className="rounded bg-amber-100 px-1">N</code> (또는 true/false)
          · 시간은 <code className="rounded bg-amber-100 px-1">HH:mm</code> · 빈 칸은 기본값 적용
          · <b>카테고리코드</b> 는 비워도 되며, 비우면 전문가 등록 후 <b>수정 화면에서 칩으로 선택</b> 가능
        </div>
      </section>

      {/* 카테고리 코드 참조 */}
      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-bold text-slate-900">🏷 카테고리 코드 (직업별)</h2>
        <p className="mb-3 text-xs text-slate-500">
          전문가가 다루는 분야 코드를 <code className="rounded bg-slate-100 px-1">카테고리코드</code> 칸에 <code className="rounded bg-slate-100 px-1">|</code> 로 넣으세요. 직업에 맞는 코드만 인정됩니다.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {VORDER.map((v) => {
            const list = cats.filter((c) => c.level === 1 && c.vertical === v);
            if (!list.length) return null;
            return (
              <details key={v} className="rounded-md border border-slate-100 bg-slate-50/50 p-2">
                <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                  {VERTICAL_LABEL[v]} <span className="font-mono text-slate-400">({v})</span> · {list.length}개
                </summary>
                <ul className="mt-2 space-y-1">
                  {list.map((c) => (
                    <li key={c.code} className="flex items-center gap-2 text-xs">
                      <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-800 ring-1 ring-slate-200">{c.code}</code>
                      <span className="text-slate-600">{c.label}</span>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </section>

      {/* 업로드 */}
      <div className="mb-4 flex items-center gap-3">
        <input type="file" accept=".csv,text/csv"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setValidateRes(null); setCommitRes(null); }} />
        <button disabled={!file || busy} onClick={() => send('validate')}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50">검증</button>
        <button disabled={!validateRes || validateRes.valid === 0 || busy} onClick={() => send('commit')}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50">
          정상 {validateRes?.valid ?? 0}건 등록
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {validateRes && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <p className="mb-2">총 {validateRes.total}행 · 정상 <b className="text-green-700">{validateRes.valid}</b> · 오류 <b className="text-red-600">{validateRes.errorCount}</b></p>
          {validateRes.errors.length > 0 && (
            <div className="mb-3 max-h-40 overflow-auto rounded bg-red-50 p-2 text-xs text-red-700">
              {validateRes.errors.map((e, i) => (
                <div key={i}>{e.row}행 [{e.field}] {e.message}</div>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-500">미리보기(최대 20): {validateRes.preview.map((p) => String(p.name)).join(', ')}</p>
        </div>
      )}

      {commitRes && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          등록 완료 — 총 {commitRes.total} · 신규 <b>{commitRes.inserted}</b> · 카테고리 연결 <b>{commitRes.categoriesLinked}</b> · 기존중복 skip {commitRes.skippedExisting} · 오류행 {commitRes.rowErrors}
        </div>
      )}
    </div>
  );
}
