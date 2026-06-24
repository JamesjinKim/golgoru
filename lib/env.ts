const SUPABASE_PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const SUPABASE_PLACEHOLDER_KEY = 'placeholder';

function requireEnv(name: string, value: string | undefined, invalidValues: string[] = []) {
  if (!value || invalidValues.includes(value)) {
    throw new Error(`${name} is not configured. Create .env.local from .env.example.`);
  }
  return value;
}

export function hasSupabasePublicConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== SUPABASE_PLACEHOLDER_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== SUPABASE_PLACEHOLDER_KEY,
  );
}

export function getSupabaseUrl() {
  return requireEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL, [
    SUPABASE_PLACEHOLDER_URL,
  ]);
}

export function getSupabasePublishableKey() {
  return requireEnv(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    [SUPABASE_PLACEHOLDER_KEY],
  );
}

export function getSupabaseSecretKey() {
  return requireEnv('SUPABASE_SECRET_KEY', process.env.SUPABASE_SECRET_KEY, [
    SUPABASE_PLACEHOLDER_KEY,
  ]);
}
