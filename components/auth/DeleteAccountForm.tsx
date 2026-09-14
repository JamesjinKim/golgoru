'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { G } from '@/lib/tokens';
import { DELETE_CONFIRM_PHRASE } from '@/lib/auth/deleteAccount';
import { clearBrowserSupabaseAuthCookies } from '@/lib/auth/cookies';
import { clearSosSession } from '@/lib/sosSession';

export default function DeleteAccountForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = confirm.trim() === DELETE_CONFIRM_PHRASE && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirm: confirm.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? '탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        setSubmitting(false);
        return;
      }
    } catch {
      setError('탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      setSubmitting(false);
      return;
    }

    // 기기에 남은 상담 내용과 인증 쿠키를 정리한 뒤 메인으로 보낸다.
    clearSosSession();
    clearBrowserSupabaseAuthCookies();
    router.replace('/');
    router.refresh();
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          border: `1px solid ${G.hairline}`, background: '#fff', color: G.red,
          fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
          padding: '12px 14px', borderRadius: 11, cursor: 'pointer', width: '100%',
          textAlign: 'left',
        }}
      >
        회원 탈퇴 (계정 및 개인정보 삭제)
      </button>
    );
  }

  return (
    <div style={{
      border: `1.5px solid ${G.red}`, borderRadius: 12, padding: 15, background: '#fff',
    }}>
      <p style={{ fontSize: 14, fontWeight: 800, color: G.textBlack, margin: '0 0 8px' }}>
        정말 탈퇴하시겠어요?
      </p>
      <p style={{ fontSize: 13, lineHeight: 1.65, color: G.textSoft, margin: '0 0 10px' }}>
        탈퇴하면 계정과 프로필 정보(이름·휴대폰 번호·지역), 그동안의 상담 요청 내용이
        즉시 삭제되며 되돌릴 수 없습니다.
      </p>
      <p style={{ fontSize: 12.5, lineHeight: 1.6, color: G.textSoft, margin: '0 0 14px' }}>
        다만 전문가 연결(통화) 기록은 분쟁 대응을 위해 개인정보처리방침에 따라
        3년간 보관되며, 회원님을 식별할 수 없는 형태로 남습니다.
      </p>

      <label
        htmlFor="delete-confirm"
        style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: G.textBlack, marginBottom: 6 }}
      >
        확인을 위해 <b style={{ color: G.red }}>{DELETE_CONFIRM_PHRASE}</b> 를 입력해 주세요
      </label>
      <input
        id="delete-confirm"
        type="text"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder={DELETE_CONFIRM_PHRASE}
        autoComplete="off"
        style={{
          width: '100%', height: 46, borderRadius: 11, padding: '0 13px',
          border: `1.5px solid ${G.inputBorder}`, fontSize: 14.5, fontFamily: 'inherit',
          boxSizing: 'border-box', marginBottom: 12, background: '#fff', color: G.textBlack,
        }}
      />

      {error && (
        <p style={{ color: G.red, fontSize: 12.5, fontWeight: 700, margin: '0 0 10px' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => { setOpen(false); setConfirm(''); setError(''); }}
          disabled={submitting}
          style={{
            flex: 1, height: 46, borderRadius: 11, fontFamily: 'inherit',
            fontSize: 14, fontWeight: 700, cursor: submitting ? 'default' : 'pointer',
            border: `1.5px solid ${G.inputBorder}`, background: '#fff', color: G.textSoft,
          }}
        >
          취소
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          style={{
            flex: 1, height: 46, borderRadius: 11, fontFamily: 'inherit',
            fontSize: 14, fontWeight: 800, cursor: canSubmit ? 'pointer' : 'default',
            border: 0, background: canSubmit ? G.red : '#e3e3e3',
            color: canSubmit ? '#fff' : '#9aa0a6',
          }}
        >
          {submitting ? '처리 중…' : '탈퇴하기'}
        </button>
      </div>
    </div>
  );
}
