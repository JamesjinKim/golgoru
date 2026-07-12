'use client';

import { useState } from 'react';
import Link from 'next/link';
import { G } from '@/lib/tokens';
import { VISIBLE_VERTICALS, VERTICAL_LABEL } from '@/lib/constants';
import { isValidPhone } from '@/lib/auth/profileFields';

export default function ExpertApplyForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vertical, setVertical] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (submitting) return;
    setError('');

    const n = name.trim();
    const p = phone.trim();
    if (!n || !p) {
      setError('성명(업체명)과 연락처를 입력해 주세요.');
      return;
    }
    if (!isValidPhone(p)) {
      setError('연락처 형식이 올바르지 않습니다. (예: 010-1234-5678)');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/expert-applications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: n, phone: p, vertical, message: message.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? '접수에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }
      setDone(true);
    } catch {
      setError('접수에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 8px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: G.textBlack, margin: '0 0 8px' }}>
          입점 신청이 접수되었습니다
        </h2>
        <p style={{ fontSize: 14, color: G.textSoft, lineHeight: 1.6, margin: '0 0 24px' }}>
          담당자가 확인 후 입력해 주신 연락처로<br />빠르게 연락드리겠습니다.
        </p>
        <Link
          href="/experts"
          style={{
            display: 'inline-block', padding: '13px 28px', borderRadius: 50,
            background: G.starbucksGreen, color: '#fff', textDecoration: 'none',
            fontSize: 14, fontWeight: 700, letterSpacing: '-0.16px',
          }}
        >
          전문가 둘러보기로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div>
      <label style={labelStyle}>성명 (업체명) <span style={{ color: G.red }}>*</span></label>
      <input
        style={inputStyle}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="예: 홍길동 / OO법률사무소"
        maxLength={60}
      />

      <label style={labelStyle}>연락처 <span style={{ color: G.red }}>*</span></label>
      <input
        style={inputStyle}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="010-1234-5678"
        inputMode="tel"
        maxLength={20}
      />

      <label style={labelStyle}>희망 전문분야</label>
      <select
        style={{ ...inputStyle, color: vertical ? G.textBlack : '#aab0b9' }}
        value={vertical}
        onChange={(e) => setVertical(e.target.value)}
      >
        <option value="">선택 안 함</option>
        {VISIBLE_VERTICALS.map((v) => (
          <option key={v} value={v} style={{ color: G.textBlack }}>{VERTICAL_LABEL[v]}</option>
        ))}
      </select>

      <label style={labelStyle}>문의 내용 (선택)</label>
      <textarea
        style={{ ...inputStyle, height: 96, padding: '12px 14px', resize: 'vertical' }}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="자격/경력, 지역, 문의사항 등을 자유롭게 남겨 주세요."
        maxLength={500}
      />

      {error && (
        <p style={{ color: G.red, fontSize: 13, fontWeight: 600, margin: '2px 0 12px' }}>{error}</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
          background: submitting ? '#9bb9ac' : G.starbucksGreen, color: '#fff',
          fontSize: 15, fontWeight: 800, letterSpacing: '-0.16px',
          cursor: submitting ? 'default' : 'pointer', fontFamily: 'inherit', marginTop: 6,
        }}
      >
        {submitting ? '접수 중…' : '입점 신청하기'}
      </button>

      <p style={{ fontSize: 11.5, color: G.textSoft, lineHeight: 1.6, margin: '14px 0 0' }}>
        입력하신 정보는 입점 상담 목적으로만 이용되며, 담당자 연락 후 파기됩니다.
      </p>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 700, color: G.textBlack,
  margin: '0 0 6px', letterSpacing: '-0.16px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', height: 46, borderRadius: 11, padding: '0 14px',
  border: '1.5px solid #cfd4db', background: '#fff',
  fontSize: 14, fontFamily: 'inherit', marginBottom: 14,
  boxSizing: 'border-box',
};
