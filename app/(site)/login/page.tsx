import Link from 'next/link';
import OAuthButtons from '@/components/auth/OAuthButtons';
import BrandMark from '@/components/BrandMark';
import { G } from '@/lib/tokens';

export default function LoginPage() {
  return (
    <div style={shell}>
      <div style={brand}>
        <BrandMark size={58} />
        <h1 style={{ margin: '6px 0 0', fontSize: 22, letterSpacing: '-0.5px', color: G.textBlack }}>골고루 SOS</h1>
        <p style={{ margin: 0, color: G.textSoft, fontSize: 13 }}>긴급할 때, 30초 전문가 추천</p>
      </div>

      <div style={{ marginTop: 34 }}>
        <OAuthButtons mode="login" />
      </div>

      <div style={divider}><span>또는</span></div>

      <p style={footLink}>
        아직 회원이 아니신가요?{' '}
        <Link href="/signup" style={footAnchor}>가입하기 →</Link>
      </p>
    </div>
  );
}

const shell: React.CSSProperties = {
  maxWidth: 380, margin: '0 auto', minHeight: '100dvh',
  padding: '64px 24px 40px', display: 'flex', flexDirection: 'column',
  justifyContent: 'center', background: G.cream,
};
const brand: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
};
const divider: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#aab0b9', fontSize: 12, margin: '18px 0',
};
const footLink: React.CSSProperties = {
  textAlign: 'center', fontSize: 13, color: G.textSoft, margin: '8px 0 0',
};
const footAnchor: React.CSSProperties = {
  color: G.houseGreen, fontWeight: 700, textDecoration: 'none',
};
