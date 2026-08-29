import type { Metadata } from 'next';
import Link from 'next/link';
import { G } from '@/lib/tokens';
import {
  PRIVACY_POLICY,
  PRIVACY_POLICY_VERSION,
  PRIVACY_POLICY_EFFECTIVE_DATE,
  COMPANY_INFO,
} from '@/lib/legal/privacy-policy';

export const metadata: Metadata = {
  title: '개인정보처리방침 · 골고루 SOS',
  description: '골고루 SOS가 이용자의 개인정보를 어떻게 수집·이용·보관·파기하는지 안내합니다.',
};

export default function PrivacyPolicyPage() {
  return (
    <div style={{
      maxWidth: 380, margin: '0 auto', minHeight: 'var(--app-vh, 100dvh)',
      padding: '40px 24px 48px', background: G.cream,
    }}>
      <h1 style={{
        fontSize: 20, fontWeight: 800, margin: '0 0 4px',
        letterSpacing: '-0.4px', color: G.textBlack,
      }}>
        개인정보처리방침
      </h1>
      <p style={{ color: G.textSoft, fontSize: 13, margin: '0 0 22px' }}>
        {COMPANY_INFO.serviceName} · 시행일 {PRIVACY_POLICY_EFFECTIVE_DATE}
      </p>

      {PRIVACY_POLICY.map((sec) => (
        <section key={sec.heading} style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 14.5, fontWeight: 800, color: G.houseGreen, margin: '0 0 8px' }}>
            {sec.heading}
          </h2>

          {sec.body.map((p, i) => (
            <p key={i} style={{ fontSize: 13.5, lineHeight: 1.7, color: G.textBlack, margin: '0 0 6px' }}>
              {p}
            </p>
          ))}

          {sec.table && (
            <div style={{ overflowX: 'auto', margin: '10px 0 0' }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse',
                fontSize: 12.5, lineHeight: 1.5,
              }}>
                <thead>
                  <tr>
                    {sec.table.columns.map((c) => (
                      <th key={c} style={{
                        textAlign: 'left', padding: '7px 8px',
                        background: G.greenLight, color: G.houseGreen,
                        fontWeight: 800, whiteSpace: 'nowrap',
                        border: `1px solid ${G.hairline}`,
                      }}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sec.table.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{
                          padding: '7px 8px', color: G.textBlack,
                          border: `1px solid ${G.hairline}`, verticalAlign: 'top',
                        }}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <div style={{
        marginTop: 26, paddingTop: 16, borderTop: `1px solid ${G.hairline}`,
        fontSize: 11.5, lineHeight: 1.7, color: G.textSoft,
      }}>
        <p style={{ margin: '0 0 3px' }}>{COMPANY_INFO.name}</p>
        <p style={{ margin: '0 0 3px' }}>사업자등록번호: {COMPANY_INFO.businessNumber}</p>
        <p style={{ margin: '0 0 3px' }}>주소: {COMPANY_INFO.address}</p>
        <p style={{ margin: '0 0 3px' }}>문의: {COMPANY_INFO.contactEmail}</p>
        <p style={{ margin: '8px 0 0' }}>문서 버전 {PRIVACY_POLICY_VERSION}</p>
      </div>

      <Link
        href="/"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 20,
          fontSize: 13.5, fontWeight: 700, color: G.houseGreen, textDecoration: 'none',
        }}
      >
        ← 홈으로 돌아가기
      </Link>
    </div>
  );
}
