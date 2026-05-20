import SosInput from '@/components/SosInput';
import { G } from '@/lib/tokens';

export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: G.cream }}>
      <header style={{
        paddingTop: 54, paddingBottom: 8,
        paddingLeft: 20, paddingRight: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${G.hairline}`,
        background: G.cream,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SosIcon />
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.16px', color: G.starbucksGreen }}>
            골고루
          </span>
        </div>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: `1px solid ${G.hairline}`, background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: G.textSoft, fontWeight: 700, fontSize: 13, cursor: 'pointer',
        }}>유</div>
      </header>

      <main style={{ flex: 1, padding: '16px 20px 24px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: G.greenLight, color: G.starbucksGreen,
            padding: '4px 10px', borderRadius: 50,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
            textTransform: 'uppercase' as const, marginBottom: 12,
          }}>
            <ShieldIcon /> 24시간 응급 추천
          </div>
          <h1 style={{
            margin: 0, fontSize: 26, lineHeight: 1.25, fontWeight: 800,
            color: G.starbucksGreen, letterSpacing: '-0.4px',
          }}>지금 어떤 상황인가요?</h1>
          <p style={{
            margin: '8px 0 0', fontSize: 14, lineHeight: 1.5,
            color: G.textSoft, letterSpacing: '-0.16px',
          }}>말하거나 입력하면, 적합한 전문가를 바로 추천해 드려요.</p>
        </div>
        <SosInput />
      </main>

      <footer style={{
        padding: '12px 20px 24px', textAlign: 'center',
        fontSize: 11, color: G.textSoft, letterSpacing: '-0.16px',
      }}>
        긴급 범죄·생명 위협 시에는{' '}
        <span style={{ color: G.red, fontWeight: 700 }}>112</span>·
        <span style={{ color: G.red, fontWeight: 700 }}>119</span>로 먼저 신고해 주세요.
      </footer>
    </div>
  );
}

function SosIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r="13" fill="#c82014"/>
      <text x="14" y="16.5" textAnchor="middle" fontSize="8.5" fontWeight="800"
            fontFamily="'NanumSquareNeo', 'Inter', sans-serif" fill="#fff" letterSpacing="0.3">SOS</text>
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
