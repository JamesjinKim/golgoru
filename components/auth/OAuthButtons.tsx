'use client';

import { useState } from 'react';
import { startUserLogin, type OAuthProvider } from '@/lib/auth/startUserLogin';
import { G } from '@/lib/tokens';

const LABEL: Record<OAuthProvider, Record<'login' | 'signup', string>> = {
  kakao: { login: '카카오 로그인', signup: '카카오로 가입' },
  google: { login: '구글 로그인', signup: '구글로 가입' },
};

// 카카오 디벨로퍼에서 account_email 동의항목이 승인되어(KOE205 원인 해소, 2026-07-08)
// 카카오 로그인을 활성화한다. 콜백·프로필 매핑·동의 게이트는 provider 공통이라
// 켜는 즉시 구글과 동일한 흐름(로그인 → /consent 필수·선택 동의 + 프로필 입력 → 홈)을 탄다.
const KAKAO_ENABLED = true;

export default function OAuthButtons({ mode }: { mode: 'login' | 'signup' }) {
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState('');

  const go = async (provider: OAuthProvider) => {
    if (provider === 'kakao' && !KAKAO_ENABLED) {
      setError('카카오 로그인은 준비 중입니다. 지금은 구글 로그인을 이용해 주세요.');
      return;
    }
    setPending(provider);
    setError('');
    try {
      // 로그인/가입 전용 페이지에서 시작하므로, 인증 완료 후 이 페이지로 되돌아오지 않도록 홈으로 복귀.
      await startUserLogin(provider, '/');
      // 성공 시 페이지가 OAuth로 리다이렉트되므로 여기 이후 코드는 도달하지 않음.
    } catch {
      setError(
        provider === 'kakao'
          ? '카카오 로그인 준비 중입니다. 잠시 후 다시 시도해 주세요.'
          : '구글 로그인 연결에 실패했습니다.',
      );
      setPending(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      <button
        type="button"
        onClick={() => go('kakao')}
        disabled={pending !== null}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          width: '100%', height: 50, borderRadius: 13, border: 0,
          background: '#fee500', color: '#191600',
          fontSize: 15, fontWeight: 800, letterSpacing: '-0.2px',
          fontFamily: 'inherit', cursor: pending ? 'default' : 'pointer',
          opacity: !KAKAO_ENABLED ? 0.55 : (pending && pending !== 'kakao' ? 0.6 : 1),
        }}
      >
        {pending === 'kakao'
          ? '연결 중…'
          : KAKAO_ENABLED
            ? LABEL.kakao[mode]
            : `${LABEL.kakao[mode]} (준비 중)`}
      </button>

      <button
        type="button"
        onClick={() => go('google')}
        disabled={pending !== null}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          width: '100%', height: 50, borderRadius: 13,
          background: '#fff', color: '#1f2430', border: '1px solid #dadfe6',
          fontSize: 15, fontWeight: 800, letterSpacing: '-0.2px',
          fontFamily: 'inherit', cursor: pending ? 'default' : 'pointer',
          opacity: pending && pending !== 'google' ? 0.6 : 1,
        }}
      >
        <GoogleIcon /> {pending === 'google' ? '연결 중…' : LABEL.google[mode]}
      </button>

      {error && (
        <p style={{ color: G.red, fontSize: 12.5, fontWeight: 700, textAlign: 'center', margin: '4px 0 0' }}>
          {error}
        </p>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.8 6.1C12.2 13.3 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16.9z" />
      <path fill="#FBBC05" d="M10.3 28.6c-.5-1.4-.7-2.9-.7-4.6s.3-3.2.7-4.6l-7.8-6.1C.9 16.3 0 20 0 24s.9 7.7 2.5 10.7l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.3-4.5 2.1-8.8 2.1-6.4 0-11.8-3.8-13.7-9.1l-7.8 6.1C6.4 42.6 14.6 48 24 48z" />
    </svg>
  );
}
