import type { Metadata } from 'next';
import Link from 'next/link';
import { G } from '@/lib/tokens';
import {
  TERMS,
  TERM_KEYS,
  TERM_PROCESSOR,
  TERM_VERSION,
} from '@/lib/legal/consent-terms';

export const metadata: Metadata = {
  title: '약관 및 정책 · 골고루',
  description: '골고루 SOS의 서비스 이용약관, 개인정보 수집·이용, 제3자 제공, 마케팅 수신 동의 문서를 모아봅니다.',
};

/**
 * 약관 목록(/terms).
 *
 * 약관 전문은 /terms/[key]에 이미 있었지만 상위 /terms가 없어 404였다.
 * Play Console 스토어 등록정보의 약관 URL과 앱 설정 화면이 가리킬
 * 대표 주소가 필요하므로 목록 페이지를 둔다.
 */
export default function TermsIndexPage() {
  return (
    <div style={{
      maxWidth: 380, margin: '0 auto', minHeight: 'var(--app-vh, 100dvh)',
      padding: '40px 24px 48px', background: G.cream,
    }}>
      <h1 style={{
        fontSize: 20, fontWeight: 800, margin: '0 0 4px',
        letterSpacing: '-0.4px', color: G.textBlack,
      }}>
        약관 및 정책
      </h1>
      <p style={{ color: G.textSoft, fontSize: 13, margin: '0 0 18px' }}>
        골고루 SOS 이용에 적용되는 문서입니다.
      </p>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {TERM_KEYS.map((key) => {
          const doc = TERMS[key];
          return (
            <Link
              key={key}
              href={`/terms/${key}`}
              style={{
                display: 'block', textDecoration: 'none',
                background: '#fff', border: `1px solid ${G.hairline}`,
                borderRadius: 13, padding: '14px 15px',
              }}
            >
              <span style={{
                display: 'block', fontSize: 14.5, fontWeight: 800,
                color: G.textBlack, marginBottom: 3,
              }}>
                {doc.title}{' '}
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: doc.required ? G.houseGreen : G.textSoft,
                }}>
                  {doc.required ? '(필수)' : '(선택)'}
                </span>
              </span>
              <span style={{ display: 'block', fontSize: 12.5, lineHeight: 1.6, color: G.textSoft }}>
                {doc.summary}
              </span>
            </Link>
          );
        })}

        {/* 개인정보처리방침은 consent-terms가 아니라 별도 문서(lib/legal/privacy-policy.ts)다. */}
        <Link
          href="/privacy"
          style={{
            display: 'block', textDecoration: 'none',
            background: '#fff', border: `1px solid ${G.hairline}`,
            borderRadius: 13, padding: '14px 15px',
          }}
        >
          <span style={{
            display: 'block', fontSize: 14.5, fontWeight: 800,
            color: G.textBlack, marginBottom: 3,
          }}>
            개인정보처리방침
          </span>
          <span style={{ display: 'block', fontSize: 12.5, lineHeight: 1.6, color: G.textSoft }}>
            개인정보를 어떻게 수집·이용·보관·파기하는지 안내합니다
          </span>
        </Link>
      </nav>

      <p style={{ fontSize: 11, color: G.textSoft, margin: '20px 0 16px' }}>
        처리자: {TERM_PROCESSOR} · 문서 버전 {TERM_VERSION}
      </p>

      <Link
        href="/"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 13.5, fontWeight: 700, color: G.houseGreen, textDecoration: 'none',
        }}
      >
        ← 홈으로
      </Link>
    </div>
  );
}
