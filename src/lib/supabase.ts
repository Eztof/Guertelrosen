import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

/**
 * TODO: HIER EINTRAGEN (Supabase Dashboard → Project Settings → API)
 */
const SUPABASE_URL = "https://amqirtrnoopriimopnns.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtcWlydHJub29wcmlpbW9wbm5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTczNDUsImV4cCI6MjA4NjEzMzM0NX0.9ZHxjsmkTOHzcUzPShES2V1PeeMYfWPR7J7mWCWbT2Y";

/**
 * “Gerät merken”:
 * - Wir nutzen persistSession=false (Supabase speichert NICHT automatisch).
 * - Wenn “merken” aktiv ist, speichern wir {access_token, refresh_token} in localStorage
 *   und stellen die Session beim Start wieder her.
 */
const REMEMBER_PREF_KEY = "kv7g_remember_device";
const REMEMBER_TOKENS_KEY = "kv7g_remember_tokens_v1";

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,       // wichtig: wir speichern selbst
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return supabase;
}

export function getRememberPreference(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(REMEMBER_PREF_KEY);
  return raw === null ? true : raw === "true";
}

export function setRememberPreference(value: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REMEMBER_PREF_KEY, String(value));
  if (!value) {
    localStorage.removeItem(REMEMBER_TOKENS_KEY);
  }
}

type StoredTokens = { access_token: string; refresh_token: string };

export async function restoreRememberedSessionIfPossible() {
  if (typeof window === "undefined") return;
  const remember = getRememberPreference();
  if (!remember) return;

  const raw = localStorage.getItem(REMEMBER_TOKENS_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw) as StoredTokens;
    if (!parsed?.access_token || !parsed?.refresh_token) return;
    const sb = getSupabase();
    await sb.auth.setSession({
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token
    });
  } catch {
    localStorage.removeItem(REMEMBER_TOKENS_KEY);
  }
}

export function persistSessionIfNeeded(session: Session | null) {
  if (typeof window === "undefined") return;

  const remember = getRememberPreference();
  if (!remember) {
    localStorage.removeItem(REMEMBER_TOKENS_KEY);
    return;
  }

  if (!session) {
    localStorage.removeItem(REMEMBER_TOKENS_KEY);
    return;
  }

  const tokens: StoredTokens = {
    access_token: session.access_token,
    refresh_token: session.refresh_token
  };
  localStorage.setItem(REMEMBER_TOKENS_KEY, JSON.stringify(tokens));
}