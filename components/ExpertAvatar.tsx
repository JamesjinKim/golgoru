import Image from 'next/image';
import { Expert } from '@/lib/types';
import { G } from '@/lib/tokens';

export default function ExpertAvatar({
  expert,
  size = 48,
  gradientTo = 'green',
  boxShadow,
  fontSize,
}: {
  expert: Pick<Expert, 'name' | 'photo_url'>;
  size?: number;
  gradientTo?: 'green' | 'gold';
  boxShadow?: string;
  fontSize?: number;
}) {
  const ring = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    overflow: 'hidden' as const,
    ...(boxShadow ? { boxShadow } : {}),
  };

  if (expert.photo_url) {
    return (
      <div style={ring}>
        <Image
          src={expert.photo_url}
          alt={`${expert.name} 프로필 사진`}
          width={size}
          height={size}
          unoptimized
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }

  const to = gradientTo === 'gold' ? G.gold : G.starbucksGreen;
  return (
    <div
      style={{
        ...ring,
        background: `linear-gradient(135deg, ${G.greenAccent}, ${to})`,
        color: '#fff',
        fontSize: fontSize ?? Math.round(size * 0.375),
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        letterSpacing: '-0.16px',
      }}
    >
      {expert.name.charAt(0)}
    </div>
  );
}
