export interface ProfileFields {
  full_name: string | null;
  phone: string | null;
  gender: string | null;
  region: string | null;
}

export type Gender = 'male' | 'female' | 'unspecified';

const PHONE_RE = /^01[016789]-?\d{3,4}-?\d{4}$/;

export function isValidPhone(phone: string): boolean {
  return PHONE_RE.test(phone.trim());
}

// 실명·전화·성별·지역이 모두 채워지면 프로필 완료.
export function hasCompleteProfile(
  p: Partial<ProfileFields> | null | undefined,
): boolean {
  if (!p) return false;
  return Boolean(
    p.full_name?.trim() &&
      p.phone?.trim() &&
      p.gender?.trim() &&
      p.region?.trim(),
  );
}
