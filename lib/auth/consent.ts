export interface ConsentTimestamps {
  terms_agreed_at: string | null;
  privacy_agreed_at: string | null;
  thirdparty_agreed_at: string | null;
  marketing_agreed_at: string | null;
}

// 필수 3개(이용약관·개인정보 수집·제3자 제공)가 모두 기록되면 동의 완료.
export function hasRequiredConsent(
  profile: Partial<ConsentTimestamps> | null | undefined,
): boolean {
  if (!profile) return false;
  return Boolean(
    profile.terms_agreed_at &&
      profile.privacy_agreed_at &&
      profile.thirdparty_agreed_at,
  );
}
