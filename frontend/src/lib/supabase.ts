import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function decodeProjectRefFromJwt(token?: string): string | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const decoded = JSON.parse(atob(padded));
    return typeof decoded.ref === "string" ? decoded.ref : null;
  } catch {
    return null;
  }
}

function projectRefFromUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).host;
    const [ref] = host.split(".");
    return ref || null;
  } catch {
    return null;
  }
}

const urlProjectRef = projectRefFromUrl(supabaseUrl);
const keyProjectRef = decodeProjectRefFromJwt(supabaseAnonKey);

export const supabaseConfigError = !supabaseUrl || !supabaseAnonKey
  ? "Supabase Auth is not configured for this frontend yet."
  : urlProjectRef && keyProjectRef && urlProjectRef !== keyProjectRef
    ? "Supabase Auth config is invalid: the project URL and anon key belong to different projects."
    : null;

export const isSupabaseConfigured = !supabaseConfigError;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
