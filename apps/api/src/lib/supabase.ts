import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../index";

export function createSupabaseClient(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}

export function createSupabaseAdmin(env: Env, authHeader?: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
}
