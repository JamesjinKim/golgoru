'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { G } from '@/lib/tokens';

type ItemKey = 'terms' | 'privacy' | 'thirdparty' | 'marketing';
const ITEMS: { key: ItemKey; required: boolean; label: string }[] = [
  { key: 'terms', required: true, label: '서비스 이용약관' },
  { key: 'privacy', required: true, label: '개인정보 수집·이용' },
  { key: 'thirdparty', required: true, label: '개인정보 제3자 제공' },
  { key: 'marketing', required: false, label: '마케팅 활용·광고 수신' },
];

export default function ConsentForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [checked, setChecked] = useState<Record<ItemKey, boolean>>({
    terms: false, privacy: false, thirdparty: false, marketing: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const allChecked = ITEMS.every((it) => checked[it.key]);
  const requiredDone = useMemo(
    () => ITEMS.filter((it) => it.required).every((it) => checked[it.key]),
    [checked],
  );

  const toggle = (key: ItemKey) => setChecked((p) => ({ ...p, [key]: !p[key] }));
  const toggleAll = () => {
    const next = !allChecked;
    setChecked({ terms: next, privacy: next, thirdparty: next, marketing: next });
  };

  const submit = async () => {
    if (!requiredDone || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/consent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ marketing: checked.marketing }),
      });
      if (!res.ok) {
        setError('동의 저장에 실패했습니다. 다시 시도해 주세요.');
        setSubmitting(false);
        return;
      }
      const dest = returnTo === '/' ? '/?welcome=1' : returnTo;
      router.replace(dest);
    } catch {
      setError('동의 저장에 실패했습니다. 다시 시도해 주세요.');
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 19, fontWeight: 800, margin: '10px 0 4px', letterSpacing: '-0.4px', color: G.textBlack }}>
        약관에 동의해 주세요
      </h1>
      <p style={{ color: G.textSoft, fontSize: 13.5, margin: '0 0 18px' }}>
        서비스 시작을 위해 아래 항목에 동의가 필요해요.
      </p>

      <button type="button" onClick={toggleAll} style={{ ...allBox, ...(allChecked ? allBoxOn : null) }}>
        <Box on={allChecked} />
        <span style={{ fontSize: 15, fontWeight: 800 }}>전체 동의 (선택 포함)</span>
      </button>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {ITEMS.map((it) => (
          <button key={it.key} type="button" onClick={() => toggle(it.key)} style={itemRow}>
            <Box on={checked[it.key]} />
            <span style={{ fontSize: 14, flex: 1, textAlign: 'left' }}>
              <b style={{ color: it.required ? G.houseGreen : G.textSoft, fontWeight: 800 }}>
                {it.required ? '(필수)' : '(선택)'}
              </b>{' '}
              {it.label}
            </span>
          </button>
        ))}
      </div>

      <p style={{ minHeight: 16, margin: '14px 0 6px', fontSize: 12, fontWeight: 600, textAlign: 'center', color: G.red, visibility: requiredDone ? 'hidden' : 'visible' }}>
        필수 항목에 동의해야 시작할 수 있어요
      </p>

      <button
        type="button"
        onClick={submit}
        disabled={!requiredDone || submitting}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: 50, borderRadius: 13, border: 0,
          fontSize: 15, fontWeight: 800, fontFamily: 'inherit',
          cursor: !requiredDone || submitting ? 'not-allowed' : 'pointer',
          background: requiredDone ? G.starbucksGreen : '#c7ccd3',
          color: requiredDone ? '#fff' : '#eef0f3',
          boxShadow: requiredDone ? '0 6px 16px rgba(21,122,78,.32)' : 'none',
        }}
      >
        {submitting ? '처리 중…' : '동의하고 시작'}
      </button>

      {error && (
        <p style={{ color: G.red, fontSize: 12.5, fontWeight: 700, textAlign: 'center', margin: '10px 0 0' }}>{error}</p>
      )}
    </div>
  );
}

function Box({ on }: { on: boolean }) {
  return (
    <span style={{
      width: 22, height: 22, borderRadius: 7, flex: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 13, fontWeight: 900,
      background: on ? G.starbucksGreen : 'transparent',
      border: `2px solid ${on ? G.starbucksGreen : '#cfd4db'}`,
    }} aria-hidden>✓</span>
  );
}

const allBox: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 11, width: '100%',
  padding: '15px 14px', border: `1.5px solid ${G.starbucksGreen}`,
  borderRadius: 13, background: '#e8f5ee', cursor: 'pointer',
  marginBottom: 8, fontFamily: 'inherit', textAlign: 'left',
};
const allBoxOn: React.CSSProperties = { background: '#dcf0e5' };
const itemRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 11, width: '100%',
  padding: '13px 6px', cursor: 'pointer', border: 0,
  borderBottom: '1px solid #f1f3f6', background: 'transparent',
  fontFamily: 'inherit',
};
