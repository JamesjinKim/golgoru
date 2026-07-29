'use client';
import Link from 'next/link';
import { G, SHADOW_CARD } from '@/lib/tokens';
import { logCall } from '@/lib/experts/logCall';

// 전문가 상세 '연락처' 섹션의 전화 링크(client). phone 있으면 tel: + 통화 로깅(source='contact'),
// 없으면(비로그인) 로그인 유도. 상세 페이지가 server 컴포넌트라 onClick을 못 붙여 분리했다.
export default function ContactCallLink({ phone, expertId, vertical }: { phone: string; expertId: string; vertical: string }) {
  const box: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '13px 16px', background: '#fff', borderRadius: 12,
    boxShadow: SHADOW_CARD, textDecoration: 'none',
    fontSize: 15, fontWeight: 700, letterSpacing: '-0.16px',
  };

  if (!phone) {
    return (
      <Link href="/login" style={{ ...box, color: G.textSoft }}>
        🔒 전화번호는 로그인 후 확인할 수 있어요
        <span style={{ marginLeft: 'auto', fontSize: 11, color: G.greenAccent, fontWeight: 700 }}>로그인 →</span>
      </Link>
    );
  }
  return (
    <a
      href={`tel:${phone}`}
      onClick={() => logCall(expertId, vertical, 'contact')}
      style={{ ...box, color: G.textBlack }}
    >
      <PhoneRawIcon />
      {phone}
      <span style={{ marginLeft: 'auto', fontSize: 11, color: G.greenAccent, fontWeight: 700 }}>탭하면 연결</span>
    </a>
  );
}

function PhoneRawIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke={G.greenAccent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>
    </svg>
  );
}
