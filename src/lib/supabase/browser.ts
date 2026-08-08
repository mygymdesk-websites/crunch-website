"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "./config";

let cached: SupabaseClient | null = null;

/**
 * Browser Supabase client, used for OTP sign-in and the admin session.
 *
 * Returns null when the project isn't configured yet, so auth UI can render a
 * clear "not connected" state instead of the page exploding at import time.
 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  cached ??= createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cached;
}
