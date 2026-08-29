import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import ConsentForm from '@/components/auth/ConsentForm';
import { getCurrentUserProfile } from '@/lib/auth/user';
import { hasRequiredConsent } from '@/lib/auth/consent';
import { hasCompleteProfile } from '@/lib/auth/profileFields';
import { resolveAuthReturnTo } from '@/lib/auth/profile';
import { G } from '@/lib/tokens';

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo: rawReturnTo } = await searchParams;
  const host = (await headers()).get('host') ?? 'localhost:3000';
  const origin = `http://${host}`;
  const returnTo = resolveAuthReturnTo(origin, rawReturnTo ?? null);

  const { user, profile } = await getCurrentUserProfile();
  if (!user) redirect('/login');
  if (hasRequiredConsent(profile) && hasCompleteProfile(profile)) redirect(returnTo);

  return (
    <div style={{
      maxWidth: 380, margin: '0 auto', minHeight: 'var(--app-vh, 100dvh)',
      padding: '48px 24px 40px', background: G.cream,
      display: 'flex', flexDirection: 'column',
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
        fontSize: 12, fontWeight: 800, padding: '5px 11px', borderRadius: 20,
        background: '#e8f5ee', color: G.houseGreen, border: '1px solid #cbe6d7', marginBottom: 14,
      }}>
        가입 진행 중
      </span>
      <ConsentForm returnTo={returnTo} />
    </div>
  );
}
