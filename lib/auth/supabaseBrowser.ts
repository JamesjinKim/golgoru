'use client';
import { createBrowserClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'placeholder';

export const userSupabaseBrowser = () => createBrowserClient(URL, ANON);
