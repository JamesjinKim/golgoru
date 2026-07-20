'use client';
import { useEffect, useState } from 'react';
import { VERTICAL_LABEL, VISIBLE_VERTICALS } from '@/lib/constants';
import { adminFetch } from '@/lib/admin/adminFetch';
import type { Vertical } from '@/lib/types';

type Cat = {
  code: string; parent_code: string | null; vertical: Vertical;
  level: number; label: string; is_active: boolean;
};
// 노출 직역만 (감정평가사 등 숨김 제외)
const VORDER: Vertical[] = VISIBLE_VERTICALS;
const field = 'rounded-md border border-slate-300 px-2 py-1 text-sm';

export default function CategoriesAdminPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [add, setAdd] = useState({ vertical: 'lawyer' as Vertical, level: '1', parent_code: '', code: '', label: '' });

  const load = async () => {
    const r = await adminFetch('/api/admin/categories?all=1');
    const j = await r.json();
    const list: Cat[] = j.categories ?? [];
    setCats(list);
    setLabels(Object.fromEntries(list.map((c) => [c.code, c.label])));
  };
  useEffect(() => { load(); }, []);

  const patch = async (code: string, body: object, failMsg: string) => {
    setBusy(true); setMsg('');
    const r = await adminFetch(`/api/admin/categories/${encodeURIComponent(code)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    setBusy(false);
    if (!r.ok) { const j = await r.json().catch(() => ({})); setMsg(j.error || failMsg); return false; }
    // 저장 성공 → 이 code 한 행만 로컬 반영. 전체 load()를 하면 다른 행에서 편집 중이던(아직
    // 저장 안 한) 입력값이 DB값으로 덮어써지므로, 개별 저장이 서로 간섭하지 않도록 국소 갱신한다.
    const updated: Cat = await r.json().catch(() => null);
    if (updated) {
      setCats((prev) => prev.map((c) => (c.code === code ? updated : c)));
      setLabels((prev) => ({ ...prev, [code]: updated.label }));
    }
    return true;
  };
  const create = async () => {
    setBusy(true); setMsg('');
    const r = await adminFetch('/api/admin/categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...add, level: Number(add.level), parent_code: add.level === '2' ? add.parent_code : null }),
    });
    setBusy(false);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(j.error || '추가 실패'); return; }
    setMsg(`추가됨: ${add.code.toUpperCase()}`);
    setAdd({ vertical: add.vertical, level: '1', parent_code: '', code: '', label: '' });
    load();
  };
  const copy = (code: string) => { navigator.clipboard?.writeText(code); setMsg(`코드 복사됨: ${code}`); };

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-lg font-bold text-slate-900">카테고리 관리</h1>
      <p className="mb-3 text-sm text-slate-500">전문 분야 코드를 직업별로 조회·수정하고, CSV 일괄등록 시 이 코드를 참고하세요. (코드 클릭 = 복사)</p>

      <div className="mb-4 rounded-md bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-800">
        ⚠️ <b>새로 추가한 코드</b>는 AI 자동분류에 즉시 반영되지 않습니다(분류 프롬프트 갱신 필요). 조회·라벨수정·CSV 참고·전문가 폼 선택·매칭에는 바로 유효합니다.
      </div>

      {msg && <p className="mb-3 text-sm text-blue-600">{msg}</p>}

      {/* 카테고리 추가 */}
      <details className="mb-5 rounded-lg border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-bold text-slate-800">+ 카테고리 추가</summary>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-slate-500">직업
            <select className={field} value={add.vertical} onChange={(e) => setAdd({ ...add, vertical: e.target.value as Vertical })}>
              {VORDER.map((v) => <option key={v} value={v}>{VERTICAL_LABEL[v]} ({v})</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500">구분
            <select className={field} value={add.level} onChange={(e) => setAdd({ ...add, level: e.target.value })}>
              <option value="1">중분류</option>
              <option value="2">세부</option>
            </select>
          </label>
          {add.level === '2' && (
            <label className="flex flex-col gap-1 text-xs text-slate-500">상위코드
              <input className={field} placeholder="LAW-01" value={add.parent_code} onChange={(e) => setAdd({ ...add, parent_code: e.target.value })} />
            </label>
          )}
          <label className="flex flex-col gap-1 text-xs text-slate-500">코드
            <input className={field} placeholder="LAW-10" value={add.code} onChange={(e) => setAdd({ ...add, code: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500">라벨
            <input className={field} placeholder="새 분야명" value={add.label} onChange={(e) => setAdd({ ...add, label: e.target.value })} />
          </label>
          <button disabled={busy || !add.code || !add.label} onClick={create}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50">추가</button>
        </div>
      </details>

      {/* 직업별 목록 */}
      <div className="space-y-3">
        {VORDER.map((v) => {
          const list = cats.filter((c) => c.vertical === v);
          return (
            <details key={v} open className="rounded-lg border border-slate-200 bg-white">
              <summary className="cursor-pointer px-4 py-2.5 text-sm font-bold text-slate-800">
                {VERTICAL_LABEL[v]} <span className="font-mono text-slate-400">({v})</span> · {list.length}개
              </summary>
              <table className="w-full border-t border-slate-100 text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-1.5 font-medium">코드</th>
                    <th className="px-3 py-1.5 font-medium">구분</th>
                    <th className="px-3 py-1.5 font-medium">라벨</th>
                    <th className="px-3 py-1.5 font-medium">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.code} className={`border-t border-slate-100 ${c.is_active ? '' : 'opacity-50'}`}>
                      <td className="px-3 py-1.5">
                        <button onClick={() => copy(c.code)} title="클릭하여 복사"
                          className={`font-mono ${c.level === 2 ? 'pl-3 text-slate-500' : 'text-slate-800'} hover:underline`}>
                          {c.code}
                        </button>
                      </td>
                      <td className="px-3 py-1.5 text-xs text-slate-400">{c.level === 1 ? '중분류' : '세부'}</td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <input className={`${field} w-48`} value={labels[c.code] ?? ''}
                            onChange={(e) => setLabels({ ...labels, [c.code]: e.target.value })} />
                          {labels[c.code] !== c.label && (
                            <button disabled={busy} onClick={() => patch(c.code, { label: labels[c.code] }, '수정 실패')}
                              className="rounded bg-blue-600 px-2 py-1 text-xs text-white disabled:opacity-50">저장</button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <button disabled={busy} onClick={() => patch(c.code, { is_active: !c.is_active }, '상태 변경 실패')}
                          className={`rounded px-2 py-0.5 text-xs ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                          {c.is_active ? '활성' : '비활성'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          );
        })}
      </div>
    </div>
  );
}
