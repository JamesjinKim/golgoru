'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/admin/adminFetch';
import { VERTICAL_LABEL, VISIBLE_VERTICALS } from '@/lib/constants';
import type { Vertical } from '@/lib/types';

interface LogRow {
  id: string;
  user_id: string | null;
  query: string;
  input_type: 'text' | 'voice';
  vertical: string;
  category: string | null;
  category_code: string | null;
  urgency: string | null;
  created_at: string;
}

const vLabel = (v: string) => VERTICAL_LABEL[v as Vertical] ?? v;

export default function AdminRequestsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [byVertical, setByVertical] = useState<Record<string, number>>({});
  const [q, setQ] = useState('');
  const [vertical, setVertical] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (query: string, v: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (v) params.set('vertical', v);
      const qs = params.toString();
      const res = await adminFetch(`/api/admin/recommendation-logs${qs ? `?${qs}` : ''}`);
      if (!res.ok) {
        setError('목록을 불러오지 못했습니다.');
        setLogs([]);
        return;
      }
      const data = (await res.json()) as { logs: LogRow[]; byVertical: Record<string, number> };
      setLogs(data.logs);
      setByVertical(data.byVertical ?? {});
    } catch {
      setError('목록을 불러오지 못했습니다.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load('', ''); }, [load]);

  // ISO → 'YYYY-MM-DD HH:MM' (Date 파싱 없이 슬라이스)
  const fmt = (s: string) => `${s.slice(0, 10)} ${s.slice(11, 16)}`;

  return (
    <div style={{ padding: '20px 0' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>상담 분석 ({logs.length})</h1>
      <p style={{ color: '#6b7480', fontSize: 13, margin: '0 0 16px' }}>
        사용자가 입력한 문제와 AI 분석 결과입니다. 어떤 분야·긴급도 요청이 많은지 분석에 활용하세요.
      </p>

      {/* 직역별 집계 */}
      {Object.keys(byVertical).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {Object.entries(byVertical)
            .sort((a, b) => b[1] - a[1])
            .map(([v, n]) => (
              <span key={v} style={{
                fontSize: 12.5, fontWeight: 700, color: '#157a4e',
                background: '#e8f5ee', border: '1px solid #cbe6d7',
                borderRadius: 999, padding: '4px 11px',
              }}>
                {vLabel(v)} {n}
              </span>
            ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="문제 내용 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') load(q, vertical); }}
          style={{ height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 14, minWidth: 200 }}
        />
        <select
          value={vertical}
          onChange={(e) => { setVertical(e.target.value); load(q, e.target.value); }}
          style={{ height: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 14 }}
        >
          <option value="">전체 직역</option>
          {VISIBLE_VERTICALS.map((v) => <option key={v} value={v}>{vLabel(v)}</option>)}
        </select>
        <button
          type="button"
          onClick={() => load(q, vertical)}
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
                <th style={th}>일시</th>
                <th style={th}>입력</th>
                <th style={th}>직역</th>
                <th style={th}>카테고리</th>
                <th style={th}>긴급도</th>
                <th style={{ ...th, whiteSpace: 'normal' }}>문제 내용</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                  <td style={td}>{fmt(l.created_at)}</td>
                  <td style={td}>{l.input_type === 'voice' ? '🎙️ 음성' : '⌨️ 텍스트'}</td>
                  <td style={td}>{vLabel(l.vertical)}</td>
                  <td style={td}>{l.category ?? '—'}</td>
                  <td style={td}>{l.urgency ?? '—'}</td>
                  <td style={{ ...td, whiteSpace: 'normal', maxWidth: 360, color: '#334' }}>{l.query || '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td style={td} colSpan={6}>기록이 없습니다.</td></tr>
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
