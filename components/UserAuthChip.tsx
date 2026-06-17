'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/lib/auth/profile';
import { formatUserLabel } from '@/lib/auth/profile';
import { userSupabaseBrowser } from '@/lib/auth/supabaseBrowser';
import { G } from '@/lib/tokens';

interface UserAuthChipProps {
  profile: Pick<UserProfile, 'display_name' | 'email' | 'avatar_url'> | null;
}

export default function UserAuthChip({ profile }: UserAuthChipProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const signedIn = Boolean(profile);

  const login = async () => {
    setLoading(true);
    setError('');
    const supabase = userSupabaseBrowser();
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const redirectTo = `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (oauthError) {
      setError('로그인 연결에 실패했습니다.');
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError('');
    const supabase = userSupabaseBrowser();
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) {
      setError('로그아웃에 실패했습니다.');
      setLoading(false);
      return;
    }
    router.refresh();
    setLoading(false);
  };

  if (signedIn) {
    return (
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          maxWidth: 88, minHeight: 31, padding: '7px 10px',
          borderRadius: 50, background: '#fff', border: `1px solid ${G.hairline}`,
          color: G.houseGreen, fontSize: 12, fontWeight: 800,
          letterSpacing: '-0.16px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          <span style={{
            width: 7, height: 7, flexShrink: 0, borderRadius: '50%',
            background: G.greenAccent,
          }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {formatUserLabel(profile)}
          </span>
        </span>
        <button
          type="button"
          onClick={logout}
          disabled={loading}
          style={{
            border: 0, background: 'transparent', color: G.textSoft,
            fontSize: 12, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
            padding: 0, fontFamily: 'inherit',
          }}
        >
          {loading ? '처리 중' : '로그아웃'}
        </button>
        {error && <AuthError text={error} />}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={login}
        disabled={loading}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '7px 13px', borderRadius: 50,
          background: '#fff', border: `1px solid ${G.hairline}`,
          color: G.textSoft, fontSize: 13, fontWeight: 700,
          letterSpacing: '-0.16px', cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit',
          opacity: loading ? 0.68 : 1,
        }}
      >
        <PersonIcon /> {loading ? '연결 중' : '로그인'}
      </button>
      {error && <AuthError text={error} />}
    </div>
  );
}

function AuthError({ text }: { text: string }) {
  return (
    <span style={{
      position: 'absolute', top: 'calc(100% + 6px)', right: 0,
      width: 148, color: G.red, fontSize: 11, fontWeight: 700,
      lineHeight: 1.35, textAlign: 'right',
    }}>
      {text}
    </span>
  );
}

function PersonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}
