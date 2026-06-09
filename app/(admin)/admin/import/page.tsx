'use client';
import { useState } from 'react';

interface RowError { row: number; field: string; message: string }
interface ValidateRes {
  total: number; valid: number; errorCount: number;
  errors: RowError[]; preview: Record<string, unknown>[];
}
interface CommitRes {
  total: number; inserted: number; skippedExisting: number; rowErrors: number;
}

export default function CsvImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [validateRes, setValidateRes] = useState<ValidateRes | null>(null);
  const [commitRes, setCommitRes] = useState<CommitRes | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
      <h1 className="mb-4 text-lg font-bold text-slate-900">전문가 CSV 일괄등록</h1>

      <ol className="mb-5 space-y-1 text-sm text-slate-600">
        <li>① <a href="/api/admin/experts/template" className="text-blue-600">템플릿 CSV 다운로드</a> (헤더·예시 포함)</li>
        <li>② specialties는 <code>|</code> 구분 (예: 형사|사기), vertical은 lawyer/doctor/labor/patent/tax/adjuster/appraiser</li>
        <li>③ 파일 선택 → 검증 → 미리보기 확인 → 등록</li>
      </ol>

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
          등록 완료 — 총 {commitRes.total} · 신규 <b>{commitRes.inserted}</b> · 기존중복 skip {commitRes.skippedExisting} · 오류행 {commitRes.rowErrors}
        </div>
      )}
    </div>
  );
}
