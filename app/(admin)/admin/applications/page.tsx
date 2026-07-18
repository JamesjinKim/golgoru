'use client';

import { useEffect, useState, useCallback } from 'react';
import { VERTICAL_LABEL } from '@/lib/constants';
import { adminFetch } from '@/lib/admin/adminFetch';
import type { ExpertApplication, ExpertApplicationStatus } from '@/lib/admin/types';

const STATUS_LABEL: Record<ExpertApplicationStatus, string> = {
  new: '신규',
  contacted: '연락완료',
  done: '완료',
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'new', label: '신규' },
  { value: 'contacted', label: '연락완료' },
  { value: 'done', label: '완료' },
];

export default function AdminApplicationsPage() {
  const [rows, setRows] = useState<ExpertApplication[]>([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (statusFilter: string, query: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (query) params.set('q', query);
      const qs = params.toString();
      const res = await adminFetch(`/api/admin/expert-applications${qs ? `?${qs}` : ''}`);
      if (!res.ok) {
        setError('목록을 불러오지 못했습니다.');
        setRows([]);
        return;
      }
      const data = (await res.json()) as { applications: ExpertApplication[] };
      setRows(data.applications);
    } catch {
      setError('목록을 불러오지 못했습니다.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(status, q); }, [load, status, q]);

  const changeStatus = async (id: string, next: ExpertApplicationStatus) => {
    // 낙관적 업데이트 후 실패 시 재조회
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)));
    const res = await adminFetch(`/api/admin/expert-applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      setError('상태 변경에 실패했습니다.');
      load(status, q);
    }
  };

  const fmtDate = (s: string) => s.slice(0, 10);

  return (
    <div style={{ padding: '20px 0' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>입점신청 ({rows.length})</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 14 }}
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="성명·연락처 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') load(status, q); }}
          style={{ height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 14, minWidth: 200 }}
        />
        <button
          type="button"
          onClick={() => load(status, q)}
          style={{ height: 38, padding: '0 16px', borderRadius: 8, border: 0, background: '#157a4e', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
        >
          검색
        </button>
      </div>

      {error && <p style={{ color: '#d64545', fontWeight: 600 }}>{error}</p>}
      {loading ? (
        <p style={{ color: '#6b7480' }}>불러오는 중…</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e6e9ef', color: '#6b7480' }}>
                <th style={th}>신청일</th>
                <th style={th}>성명(업체명)</th>
                <th style={th}>연락처</th>
                <th style={th}>희망분야</th>
                <th style={th}>문의 내용</th>
                <th style={th}>상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                  <td style={td}>{fmtDate(r.created_at)}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{r.name}</td>
                  <td style={td}>{r.phone}</td>
                  <td style={td}>{r.vertical ? VERTICAL_LABEL[r.vertical] : '—'}</td>
                  <td style={{ ...td, whiteSpace: 'normal', maxWidth: 320, color: '#475467' }}>
                    {r.message || '—'}
                  </td>
                  <td style={td}>
                    <select
                      value={r.status}
                      onChange={(e) => changeStatus(r.id, e.target.value as ExpertApplicationStatus)}
                      style={{
                        height: 30, padding: '0 8px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                        border: '1px solid #d0d5dd',
                        background: r.status === 'new' ? '#fff4e5' : r.status === 'contacted' ? '#e8f1ff' : '#eef7ee',
                        fontWeight: 700,
                        color: r.status === 'new' ? '#b25e00' : r.status === 'contacted' ? '#1d4ed8' : '#1a7f37',
                      }}
                    >
                      {(Object.keys(STATUS_LABEL) as ExpertApplicationStatus[]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td style={td} colSpan={6}>입점신청이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: '8px 10px', fontWeight: 700, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '9px 10px', whiteSpace: 'nowrap', verticalAlign: 'top' };
