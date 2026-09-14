import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import DeleteAccountForm from '@/components/auth/DeleteAccountForm';
import { getCurrentUserProfile } from '@/lib/auth/user';
import { COMPANY_INFO } from '@/lib/legal/privacy-policy';
import { G } from '@/lib/tokens';

export const metadata: Metadata = {
  title: '설정 — 골고루 SOS',
  description: '계정 정보 확인, 개인정보 열람·정정·삭제 요청, 회원 탈퇴를 할 수 있습니다.',
};

/**
 * 계정 설정 화면.
 *
 * 개인정보처리방침 제9항이 "권리 행사는 앱 내 설정 화면 또는 이메일로 요청"이라고
 * 안내하므로, 그 "앱 내 설정 화면"이 실제로 존재해야 한다.
 * 또한 Google Play는 계정을 생성하는 앱에 앱 내 계정 삭제 경로를 요구한다.
 */
export default async function SettingsPage() {
  const { user, profile } = await getCurrentUserProfile();
  // /login은 returnTo 쿼리를 읽지 않는다(OAuthButtons가 로그인 페이지에서는 '/'로 복귀).
  // 로그인 후에는 홈으로 가므로 설정은 다시 눌러 들어온다.
  if (!user) redirect('/login');

  const rows: [string, string][] = [
    ['이메일', profile?.email ?? user.email ?? '—'],
    ['이름', profile?.full_name ?? '—'],
    ['휴대폰 번호', profile?.phone ?? '—'],
    ['지역', profile?.region ?? '—'],
  ];

  return (
    <div style={{
      minHeight: 'var(--app-vh, 100dvh)', background: G.cream,
      padding: '20px 20px 40px',
    }}>
      <Link
        href="/"
        style={{
          display: 'inline-block', fontSize: 13, fontWeight: 700,
          color: G.textSoft, textDecoration: 'none', marginBottom: 14,
        }}
      >
        ← 홈으로
      </Link>

      <h1 style={{
        fontSize: 21, fontWeight: 800, letterSpacing: '-0.4px',
        color: G.textBlack, margin: '0 0 18px',
      }}>
        설정
      </h1>

      <Section title="내 계정">
        <dl style={{ margin: 0 }}>
          {rows.map(([label, value], i) => (
            <div
              key={label}
              style={{
                display: 'flex', justifyContent: 'space-between', gap: 12,
                padding: '11px 0',
                borderTop: i === 0 ? 0 : `1px solid ${G.hairline}`,
              }}
            >
              <dt style={{ fontSize: 13.5, color: G.textSoft, flex: 'none' }}>{label}</dt>
              <dd style={{
                fontSize: 13.5, fontWeight: 600, color: G.textBlack, margin: 0,
                textAlign: 'right', overflowWrap: 'anywhere',
              }}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="개인정보">
        <p style={{ fontSize: 13, lineHeight: 1.7, color: G.textSoft, margin: '0 0 12px' }}>
          개인정보의 열람·정정·삭제·처리정지를 요청하실 수 있습니다.
          아래 이메일로 요청하시면 지체 없이 조치합니다.
        </p>
        <a
          href={`mailto:${COMPANY_INFO.contactEmail}?subject=${encodeURIComponent('[골고루 SOS] 개인정보 관련 요청')}`}
          style={{
            display: 'inline-block', fontSize: 13.5, fontWeight: 700,
            color: G.greenAccent, textDecoration: 'underline', textUnderlineOffset: 2,
          }}
        >
          {COMPANY_INFO.contactEmail}
        </a>
        <div style={{ marginTop: 14, display: 'flex', gap: 14 }}>
          <Link href="/privacy" style={linkStyle}>개인정보처리방침</Link>
          <Link href="/terms" style={linkStyle}>약관 및 정책</Link>
        </div>
      </Section>

      <Section title="회원 탈퇴">
        <DeleteAccountForm />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 18 }}>
      <h2 style={{
        fontSize: 13, fontWeight: 800, color: G.houseGreen,
        margin: '0 0 8px', letterSpacing: '-0.2px',
      }}>
        {title}
      </h2>
      <div style={{
        background: '#fff', border: `1px solid ${G.hairline}`,
        borderRadius: 13, padding: 15,
      }}>
        {children}
      </div>
    </section>
  );
}

const linkStyle = {
  fontSize: 12.5, fontWeight: 700, color: G.textSoft,
  textDecoration: 'underline', textUnderlineOffset: 2,
} as const;
