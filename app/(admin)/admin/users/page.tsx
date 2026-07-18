'use client';

import { useEffect, useState, useCallback } from 'react';
import { hasRequiredConsent } from '@/lib/auth/consent';
import { adminFetch } from '@/lib/admin/adminFetch';

interface UserRow {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  gender: string | null;
  phone: string | null;
  region: string | null;
  created_at: string;
  terms_agreed_at: string | null;
  privacy_agreed_at: string | null;
  thirdparty_agreed_at: string | null;
  marketing_agreed_at: string | null;
}

const GENDER_LABEL: Record<string, string> = { male: '남', female: '여', unspecified: '-' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (query: string) => {
    setLoading(true);
    setError('');
    try {
      const url = query ? `/api/admin/users?q=${encodeURIComponent(query)}` : '/api/admin/users';
      const res = await adminFetch(url);
      if (!res.ok) {
        setError('목록을 불러오지 못했습니다.');
        setUsers([]);
        return;
      }
      const data = (await res.json()) as { users: UserRow[] };
      setUsers(data.users);
    } catch {
      setError('목록을 불러오지 못했습니다.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(''); }, [load]);

  const fmtDate = (s: string) => {
    // ISO → YYYY-MM-DD (Date 파싱 없이 문자열 슬라이스)
    return s.slice(0, 10);
  };

  return (
    <div style={{ padding: '20px 0' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>사용자 ({users.length})</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="이메일·이름 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') load(q); }}
          style={{ height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 14, minWidth: 220 }}
        />
        <button
          type="button"
          onClick={() => load(q)}
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
                <th style={th}>이메일</th>
                <th style={th}>이름</th>
                <th style={th}>성별</th>
                <th style={th}>전화</th>
                <th style={th}>지역</th>
                <th style={th}>가입일</th>
                <th style={th}>필수동의</th>
                <th style={th}>마케팅</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                  <td style={td}>{u.email ?? '—'}</td>
                  <td style={td}>{u.full_name ?? u.display_name ?? '—'}</td>
                  <td style={td}>{u.gender ? (GENDER_LABEL[u.gender] ?? u.gender) : '—'}</td>
                  <td style={td}>{u.phone ?? '—'}</td>
                  <td style={td}>{u.region ?? '—'}</td>
                  <td style={td}>{fmtDate(u.created_at)}</td>
                  <td style={td}>{hasRequiredConsent(u) ? '✓' : '✗'}</td>
                  <td style={td}>{u.marketing_agreed_at ? '✓' : '—'}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td style={td} colSpan={8}>사용자가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: '8px 10px', fontWeight: 700, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '9px 10px', whiteSpace: 'nowrap' };
