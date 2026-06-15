import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/admin/supabaseServer';

export async function POST() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
