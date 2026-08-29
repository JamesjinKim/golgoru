import type { Metadata } from 'next';
import Link from 'next/link';
import { G } from '@/lib/tokens';
import ExpertApplyForm from '@/components/ExpertApplyForm';

export const metadata: Metadata = {
  title: '전문가 입점 신청 · 골고루',
  description: '골고루 SOS에 전문가로 입점 신청하세요. 담당자가 확인 후 연락드립니다.',
};

export default function ExpertApplyPage() {
  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100dvh', background: G.cream }}>
      <header style={{
        paddingTop: 54, paddingBottom: 12, paddingLeft: 20, paddingRight: 20,
        display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: `1px solid ${G.hairline}`, background: G.cream,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/experts" aria-label="뒤로" style={{ display: 'flex', color: G.textSoft, textDecoration: 'none' }}>
          <BackIcon />
        </Link>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px', color: G.starbucksGreen }}>
          전문가 입점 신청
        </h1>
      </header>

      <main style={{ padding: '20px 24px 48px' }}>
        <p style={{ fontSize: 14, color: G.textSoft, lineHeight: 1.6, margin: '0 0 22px', letterSpacing: '-0.16px' }}>
          간단한 정보만 남겨 주시면 담당자가 확인 후 연락드립니다.
          <br />변호사·노무사·세무사·변리사·손해사정사·병원 전문가를 모십니다.
        </p>
        <ExpertApplyForm />
      </main>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
