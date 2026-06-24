'use client';
import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/env';

export const userSupabaseBrowser = () =>
  createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey());
