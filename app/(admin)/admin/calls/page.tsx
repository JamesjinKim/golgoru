'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/admin/adminFetch';
import { VERTICAL_LABEL, VISIBLE_VERTICALS } from '@/lib/constants';
import type { Vertical } from '@/lib/types';

interface CallRow {
  id: string;
  user_id: string | null;
  expert_id: string | null;
  expert_name: string | null;
  vertical: string | null;
  source: string | null;
  created_at: string;
}

const vLabel = (v: string | null) => (v ? VERTICAL_LABEL[v as Vertical] ?? v : '—');
const SOURCE_LABEL: Record<string, string> = { detail: '상세 하단', contact: '상세 연락처', card: '목록 카드' };

export default function AdminCallsPage() {
  const [logs, setLogs] = useState<CallRow[]>([]);
  const [byVertical, setByVertical] = useState<Record<string, number>>({});
  const [byExpert, setByExpert] = useState<Record<string, number>>({});
  const [vertical, setVertical] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (v: string) => {
    setLoading(true);
    setError('');
    try {
      const qs = v ? `?vertical=${encodeURIComponent(v)}` : '';
      const res = await adminFetch(`/api/admin/call-logs${qs}`);
      if (!res.ok) {
        setError('목록을 불러오지 못했습니다.');
        setLogs([]);
        return;
      }
      const data = (await res.json()) as {
        logs: CallRow[]; byVertical: Record<string, number>; byExpert: Record<string, number>;
      };
      setLogs(data.logs);
      setByVertical(data.byVertical ?? {});
      setByExpert(data.byExpert ?? {});
    } catch {
      setError('목록을 불러오지 못했습니다.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(''); }, [load]);

  const fmt = (s: string) => `${s.slice(0, 10)} ${s.slice(11, 16)}`;

  // 전문가별 상위 (홍보 지표)
  const topExperts = Object.entries(byExpert).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div style={{ padding: '20px 0' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>통화 기록 ({logs.length})</h1>
      <p style={{ color: '#6b7480', fontSize: 13, margin: '0 0 16px' }}>
        사용자가 전문가 전화 버튼을 눌러 연결을 시도한 기록입니다. 어떤 전문가·분야가 많이 연결되는지 분석에 활용하세요.
      </p>

      {/* 직역별 + 전문가별 집계 */}
      {(Object.keys(byVertical).length > 0 || topExperts.length > 0) && (
        <div style={{ marginBottom: 16 }}>
          {Object.keys(byVertical).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {Object.entries(byVertical).sort((a, b) => b[1] - a[1]).map(([v, n]) => (
                <span key={v} style={chip('#157a4e', '#e8f5ee', '#cbe6d7')}>{vLabel(v)} {n}</span>
              ))}
            </div>
          )}
          {topExperts.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {topExperts.map(([name, n]) => (
                <span key={name} style={chip('#8a5a00', '#fff4e5', '#ffd591')}>{name} {n}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={vertical}
          onChange={(e) => { setVertical(e.target.value); load(e.target.value); }}
          style={{ height: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 14 }}
        >
          <option value="">전체 직역</option>
          {VISIBLE_VERTICALS.map((v) => <option key={v} value={v}>{vLabel(v)}</option>)}
        </select>
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
                <th style={th}>전문가</th>
                <th style={th}>직역</th>
                <th style={th}>클릭 위치</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                  <td style={td}>{fmt(l.created_at)}</td>
                  <td style={td}>{l.expert_name ?? '(삭제됨)'}</td>
                  <td style={td}>{vLabel(l.vertical)}</td>
                  <td style={td}>{l.source ? (SOURCE_LABEL[l.source] ?? l.source) : '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td style={td} colSpan={4}>통화 기록이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const chip = (color: string, bg: string, border: string): React.CSSProperties => ({
  fontSize: 12.5, fontWeight: 700, color, background: bg, border: `1px solid ${border}`,
  borderRadius: 999, padding: '4px 11px',
});
const th: React.CSSProperties = { padding: '8px 10px', fontWeight: 700, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '9px 10px', whiteSpace: 'nowrap' };
