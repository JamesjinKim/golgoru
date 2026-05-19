'use client';
import Link from 'next/link';
import { Expert } from '@/lib/types';
import { G, SHADOW_CARD, SHADOW_HIGHLIGHT } from '@/lib/tokens';
import { VERTICAL_LABEL } from '@/lib/constants';

export default function ExpertCard({ expert, highlight }: { expert: Expert; highlight?: boolean }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16,
      boxShadow: highlight ? SHADOW_HIGHLIGHT : SHADOW_CARD,
      overflow: 'hidden', animation: 'gg-fade 0.4s ease',
    }}>
      <Link href={`/expert/${expert.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
        <div
          style={{ padding: '16px 16px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}
          onPointerDown={e => (e.currentTarget.style.background = '#f9f9f9')}
          onPointerUp={e => (e.currentTarget.style.background = 'transparent')}
          onPointerLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${G.greenAccent}, ${G.starbucksGreen})`,
              color: '#fff', fontSize: 18, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              letterSpacing: '-0.16px',
            }}>
              {expert.name.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' as const }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: G.textBlack, letterSpacing: '-0.16px' }}>
                  {expert.name} {VERTICAL_LABEL[expert.vertical]}
                </span>
                {typeof expert.rating === 'number' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, color: G.gold, fontWeight: 700 }}>
                    <StarIcon /> {expert.rating.toFixed(1)}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: G.textSoft, marginTop: 2, letterSpacing: '-0.16px' }}>
                {expert.specialties?.slice(0, 2).join(' · ')} 전문
              </div>
              <div style={{ fontSize: 12, color: G.textSoft, letterSpacing: '-0.16px' }}>
                {expert.region} · 경력 {expert.experience_years}년
              </div>
            </div>
            <ChevronRightIcon />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: expert.is_available ? G.greenLight : 'rgba(203,162,88,0.15)',
              color: expert.is_available ? G.starbucksGreen : '#7a5a1a',
              padding: '5px 10px', borderRadius: 50,
              fontSize: 11, fontWeight: 800, letterSpacing: '-0.16px',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: expert.is_available ? G.greenAccent : G.gold,
                boxShadow: expert.is_available ? '0 0 0 3px rgba(0,117,74,0.18)' : 'none',
                animation: expert.is_available ? 'gg-blink 1.4s ease-in-out infinite' : 'none',
              }}/>
              {expert.is_available ? '지금 통화 가능' : '15분 내 회신'}
            </span>
            {typeof expert.case_count === 'number' && (
              <span style={{ fontSize: 11, color: G.textSoft, letterSpacing: '-0.16px' }}>
                상담 {expert.case_count}건
              </span>
            )}
          </div>
        </div>
      </Link>

      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '10px 16px 14px', borderTop: `1px solid ${G.hairline}`, gap: 10,
      }}>
        <span style={{
          flex: 1, fontSize: 13, color: G.textSoft,
          fontFamily: 'ui-monospace, SFMono-Regular, monospace', letterSpacing: '-0.16px',
        }}>
          📞 {expert.phone}
        </span>
        <a
          href={`tel:${expert.phone}`}
          onClick={e => e.stopPropagation()}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: expert.is_available ? G.greenAccent : '#fff',
            color: expert.is_available ? '#fff' : G.greenAccent,
            border: `1.5px solid ${G.greenAccent}`,
            borderRadius: 50, padding: '9px 16px',
            fontSize: 13, fontWeight: 800, letterSpacing: '-0.16px',
            textDecoration: 'none', transition: 'transform 0.15s ease',
            whiteSpace: 'nowrap' as const,
          }}
          onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
          onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <PhoneIcon /> 전화 연결
        </a>
      </div>
    </div>
  );
}

function StarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.textSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}
