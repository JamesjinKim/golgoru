import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { G } from '@/lib/tokens';
import { TERMS, TERM_KEYS, TERM_VERSION, type TermKey } from '@/lib/legal/consent-terms';

// /terms/service · /terms/privacy · /terms/thirdparty · /terms/marketing 4경로를 사전 생성
export function generateStaticParams() {
  return TERM_KEYS.map((key) => ({ key }));
}

function isTermKey(k: string): k is TermKey {
  return (TERM_KEYS as string[]).includes(k);
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  if (!isTermKey(key)) return { title: '약관 · 골고루' };
  return { title: `${TERMS[key].title} · 골고루` };
}

export default async function TermPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!isTermKey(key)) notFound();
  const doc = TERMS[key];

  return (
    <div style={{ maxWidth: 380, margin: '0 auto', minHeight: '100dvh', padding: '40px 24px 48px', background: G.cream }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.4px', color: G.textBlack }}>
        {doc.title}{' '}
        <span style={{ fontSize: 12.5, fontWeight: 700, color: doc.required ? G.houseGreen : G.textSoft }}>
          {doc.required ? '(필수)' : '(선택)'}
        </span>
      </h1>
      <p style={{ color: G.textSoft, fontSize: 13, margin: '0 0 18px' }}>{doc.summary}</p>

      {doc.sections.map((sec) => (
        <section key={sec.heading} style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 14.5, fontWeight: 800, color: G.houseGreen, margin: '0 0 6px' }}>
            {sec.heading}
          </h2>
          {sec.body.map((p, i) => (
            <p key={i} style={{ fontSize: 13.5, lineHeight: 1.7, color: G.textBlack, margin: '0 0 6px' }}>
              {p}
            </p>
          ))}
        </section>
      ))}

      <p style={{ fontSize: 11, color: G.textSoft, margin: '20px 0 16px' }}>
        처리자: (주)골고루보상 · 문서 버전 {TERM_VERSION}
      </p>

      <Link
        href="/consent"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 13.5, fontWeight: 700, color: G.houseGreen, textDecoration: 'none',
        }}
      >
        ← 동의 화면으로 돌아가기
      </Link>
    </div>
  );
}
