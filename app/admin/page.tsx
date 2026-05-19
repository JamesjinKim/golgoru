'use client';
import { useState } from 'react';
import { Expert, Vertical } from '@/lib/types';

const G = {
  greenAccent: '#00754A',
  cream:       '#f2f0eb',
  ceramic:     '#edebe9',
  red:         '#c82014',
  textBlack:   'rgba(0,0,0,0.87)',
  textSoft:    'rgba(0,0,0,0.58)',
  hairline:    '#e7e7e7',
};

const VERTICAL_LABELS: Record<Vertical, string> = {
  lawyer:    '변호사',
  labor:     '노무사',
  adjuster:  '손해사정사',
  tax:       '세무사',
  doctor:    '의사',
};

const EMPTY_FORM = {
  name: '', vertical: 'lawyer' as Vertical,
  specialties: '', region: '', phone: '',
  experience_years: '', bio: '', youtube_url: '',
  is_available: true, is_active: true,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px',
  border: `1px solid ${G.hairline}`, borderRadius: 8,
  fontSize: 14, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
  background: '#fff',
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, color: G.textSoft, display: 'block',
  marginBottom: 4, fontWeight: 600,
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [experts, setExperts] = useState<Expert[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const checkAuth = () => {
    if (pw === process.env.NEXT_PUBLIC_ADMIN_PASSWORD || pw === 'golgoru2026') {
      setAuthed(true); loadExperts();
    } else { alert('비밀번호가 틀렸습니다.'); }
  };

  const loadExperts = async () => {
    const res = await fetch('/api/admin/experts');
    const data = await res.json();
    setExperts(data.experts ?? []);
  };

  const handleSave = async () => {
    setSaving(true); setMsg('');
    const payload = {
      ...form,
      specialties: form.specialties.split(',').map(s => s.trim()).filter(Boolean),
      experience_years: Number(form.experience_years),
    };
    const url = editId ? `/api/admin/experts/${editId}` : '/api/admin/experts';
    const res = await fetch(url, {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setMsg(editId ? '수정 완료!' : '등록 완료!');
      setForm(EMPTY_FORM); setEditId(null); loadExperts();
    } else { setMsg('저장 실패. 다시 시도해주세요.'); }
    setSaving(false);
  };

  const handleEdit = (e: Expert) => {
    setEditId(e.id);
    setForm({
      name: e.name, vertical: e.vertical,
      specialties: e.specialties.join(', '),
      region: e.region, phone: e.phone,
      experience_years: String(e.experience_years),
      bio: e.bio ?? '', youtube_url: e.youtube_url ?? '',
      is_available: e.is_available, is_active: e.is_active,
    });
  };

  const handleToggle = async (id: string, field: 'is_available' | 'is_active', value: boolean) => {
    await fetch(`/api/admin/experts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    loadExperts();
  };

  if (!authed) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', gap: 16,
        padding: '0 20px', background: G.cream,
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: G.textBlack }}>골고루 어드민</h1>
        <input
          type="password" value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && checkAuth()}
          placeholder="비밀번호 입력"
          style={{ ...inputStyle, maxWidth: 320, padding: '12px 16px' }}
        />
        <button onClick={checkAuth} style={{
          width: '100%', maxWidth: 320, padding: '12px 0',
          background: G.greenAccent, color: '#fff',
          border: 'none', borderRadius: 50,
          fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
        }}>로그인</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24, background: G.cream, minHeight: '100vh' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: G.textBlack }}>골고루 어드민</h1>

      {/* 등록/수정 폼 */}
      <div style={{ background: G.ceramic, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: G.textBlack }}>
          {editId ? '전문가 수정' : '새 전문가 등록'}
        </h2>
        {([
          { label: '이름', key: 'name', type: 'text' },
          { label: '지역', key: 'region', type: 'text' },
          { label: '전화번호', key: 'phone', type: 'tel' },
          { label: '경력(년)', key: 'experience_years', type: 'number' },
          { label: '전문분야 (콤마 구분)', key: 'specialties', type: 'text' },
          { label: '소개', key: 'bio', type: 'text' },
          { label: '유튜브 URL', key: 'youtube_url', type: 'url' },
        ] as const).map(({ label, key, type }) => (
          <div key={key}>
            <label style={labelStyle}>{label}</label>
            <input
              type={type}
              value={form[key] as string}
              onChange={e => setForm({ ...form, [key]: e.target.value })}
              style={inputStyle}
            />
          </div>
        ))}
        <div>
          <label style={labelStyle}>버티컬</label>
          <select
            value={form.vertical}
            onChange={e => setForm({ ...form, vertical: e.target.value as Vertical })}
            style={inputStyle}
          >
            {Object.entries(VERTICAL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {(['is_available', 'is_active'] as const).map(field => (
            <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: G.textBlack, cursor: 'pointer' }}>
              <input type="checkbox" checked={form[field]} onChange={e => setForm({ ...form, [field]: e.target.checked })} />
              {field === 'is_available' ? '통화 가능' : '활성'}
            </label>
          ))}
        </div>
        {msg && <p style={{ fontSize: 13, textAlign: 'center', color: msg.includes('완료') ? G.greenAccent : G.red }}>{msg}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 1, padding: '10px 0',
            background: saving ? G.ceramic : G.greenAccent,
            color: saving ? G.textSoft : '#fff',
            border: 'none', borderRadius: 50,
            fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
          }}>
            {saving ? '저장 중…' : editId ? '수정 저장' : '등록'}
          </button>
          {editId && (
            <button onClick={() => { setEditId(null); setForm(EMPTY_FORM); }} style={{
              flex: 1, padding: '10px 0',
              background: '#fff', color: G.textBlack,
              border: `1px solid ${G.hairline}`, borderRadius: 50,
              fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>취소</button>
          )}
        </div>
      </div>

      {/* 전문가 목록 */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: G.textBlack, marginBottom: 12 }}>
          전문가 목록 ({experts.length}명)
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {experts.map(e => (
            <div key={e.id} style={{
              background: '#fff', border: `1px solid ${G.hairline}`,
              borderRadius: 12, padding: '12px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 14, color: G.textBlack }}>{e.name}</span>
                <span style={{ fontSize: 12, color: G.textSoft, marginLeft: 8 }}>{VERTICAL_LABELS[e.vertical]}</span>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {e.is_available && (
                    <span style={{ fontSize: 11, background: '#d4e9e2', color: '#006241', padding: '2px 6px', borderRadius: 4 }}>통화가능</span>
                  )}
                  {!e.is_active && (
                    <span style={{ fontSize: 11, background: G.ceramic, color: G.textSoft, padding: '2px 6px', borderRadius: 4 }}>비활성</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => handleToggle(e.id, 'is_available', !e.is_available)} style={{
                  fontSize: 12, padding: '4px 8px',
                  border: `1px solid ${G.hairline}`, borderRadius: 8,
                  background: '#fff', color: G.textBlack, cursor: 'pointer', fontFamily: 'inherit',
                }}>{e.is_available ? '통화OFF' : '통화ON'}</button>
                <button onClick={() => handleEdit(e)} style={{
                  fontSize: 12, padding: '4px 8px',
                  border: `1px solid ${G.hairline}`, borderRadius: 8,
                  background: '#fff', color: G.textBlack, cursor: 'pointer', fontFamily: 'inherit',
                }}>수정</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
