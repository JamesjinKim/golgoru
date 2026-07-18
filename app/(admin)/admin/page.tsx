'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  useReactTable, getCoreRowModel, flexRender, createColumnHelper,
} from '@tanstack/react-table';
import { Expert } from '@/lib/types';
import { ExpertForm } from '@/components/admin/ExpertForm';
import { adminFetch } from '@/lib/admin/adminFetch';
import { STATUS_LABEL, VERTICAL_LABEL, displayLicense } from '@/lib/constants';

const col = createColumnHelper<Expert>();

const STATUS_BADGE: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  delayed: 'bg-amber-100 text-amber-700',
  unavailable: 'bg-slate-200 text-slate-500',
};

export default function AdminExpertsPage() {
  const [rows, setRows] = useState<Expert[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Expert | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async (query = '') => {
    setLoading(true);
    const res = await adminFetch(`/api/admin/experts${query ? `?q=${encodeURIComponent(query)}` : ''}`);
    const data = await res.json();
    setRows(data.experts ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (e: Expert) => {
    await adminFetch(`/api/admin/experts/${e.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !e.is_active }),
    });
    load(q);
  };
  const remove = async (e: Expert) => {
    if (!confirm(`${e.name} 삭제? (super_admin 전용)`)) return;
    const res = await adminFetch(`/api/admin/experts/${e.id}`, { method: 'DELETE' });
    if (!res.ok) { const j = await res.json().catch(() => ({})); setMsg(j.error || '삭제 실패'); return; }
    load(q);
  };

  const columns = useMemo(() => [
    col.accessor('name', { header: '이름' }),
    col.accessor('vertical', {
      header: '직업',
      cell: (c) => {
        const v = VERTICAL_LABEL[c.getValue()] ?? c.getValue();
        // displayLicense: '회계' 표기 제거 후, 라벨과 같으면(예: tax "세무사") 중복 병기 생략
        const lic = displayLicense(c.row.original.license);
        return lic && lic !== v ? `${v} · ${lic}` : v;
      },
    }),
    col.accessor('status', {
      header: '상담상태',
      cell: (c) => {
        const s = c.getValue();
        return (
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[s] ?? 'bg-slate-100 text-slate-600'}`}>
            {STATUS_LABEL[s] ?? s}
          </span>
        );
      },
    }),
    col.accessor('category_codes', {
      header: '카테고리',
      cell: (c) => {
        const codes = c.getValue() ?? [];
        return <span className="text-xs text-slate-500">{codes.length ? codes.join(', ') : '—'}</span>;
      },
    }),
    col.accessor('region', { header: '지역' }),
    col.accessor('phone', { header: '전화' }),
    col.accessor('experience_years', { header: '경력' }),
    col.accessor('is_active', {
      header: '활성',
      cell: (c) => (
        <button onClick={() => toggleActive(c.row.original)}
          className={`rounded px-2 py-0.5 text-xs ${c.getValue() ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
          {c.getValue() ? '활성' : '비활성'}
        </button>
      ),
    }),
    col.display({
      id: 'actions', header: '',
      cell: (c) => (
        <div className="flex gap-2">
          <button onClick={() => setEditing(c.row.original)} className="text-xs text-blue-600">수정</button>
          <button onClick={() => remove(c.row.original)} className="text-xs text-red-600">삭제</button>
        </div>
      ),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [q]);

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-lg font-bold text-slate-900">전문가 ({rows.length})</h1>
        <input
          placeholder="이름·지역 검색" value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(q)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <button onClick={() => load(q)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">검색</button>
        <button onClick={() => setCreating(true)} className="ml-auto rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white">+ 신규</button>
      </div>
      {msg && <p className="mb-3 text-sm text-red-600">{msg}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-3 py-2 font-medium">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-6 text-slate-400" colSpan={9}>불러오는 중…</td></tr>
            ) : table.getRowModel().rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                {r.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <ExpertForm
          initial={editing ?? undefined}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(q); }}
        />
      )}
    </div>
  );
}
