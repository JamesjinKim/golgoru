import { Urgency } from '@/lib/types';

const config: Record<Urgency, { label: string; bg: string; color: string; border: string }> = {
  즉시: { label: '🔴 즉시 연결 필요',   bg: '#fef2f2', color: '#b91c1c', border: '#fca5a5' },
  당일: { label: '🟠 오늘 중 상담 필요', bg: '#fff7ed', color: '#c2410c', border: '#fdba74' },
  일반: { label: '🟢 상담 예약 가능',    bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
};

export default function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const c = config[urgency];
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: 50,
      fontSize: 13,
      fontWeight: 600,
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      letterSpacing: '-0.16px',
    }}>
      {c.label}
    </span>
  );
}
