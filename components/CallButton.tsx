'use client';
import Link from 'next/link';
import { Vertical } from '@/lib/types';
import { G, SHADOW_FRAP } from '@/lib/tokens';
import { expertCallLabel } from '@/lib/constants';
import { logCall } from '@/lib/experts/logCall';

const buttonStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  width: '100%', padding: '16px 20px',
  background: G.greenAccent, color: '#fff',
  borderRadius: 50, fontSize: 16, fontWeight: 800,
  letterSpacing: '-0.16px', textDecoration: 'none',
  boxShadow: SHADOW_FRAP, transition: 'all 0.2s ease',
  boxSizing: 'border-box' as const,
} as const;

export default function CallButton({ phone, name, vertical, license, expertId, source = 'detail' }: { phone: string; name: string; vertical: Vertical; license?: string | null; expertId: string; source?: 'detail' | 'contact' | 'card' }) {
  // 전화번호는 로그인 사용자에게만. 비로그인(phone 빈 값)이면 전화 대신 로그인 유도.
  if (!phone) {
    return (
      <Link href="/login" style={buttonStyle}>
        <LockIcon />
        로그인하고 전화번호 보기
      </Link>
    );
  }
  return (
    <a
      href={`tel:${phone}`}
      style={buttonStyle}
      onClick={() => logCall(expertId, vertical, source)}
      onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
      onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
      onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <PhoneIcon />
      {name} {expertCallLabel({ vertical, license })}
    </a>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>
    </svg>
  );
}
