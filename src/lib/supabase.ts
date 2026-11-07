import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * The browser's Supabase client, or null when the project isn't configured.
 * Without it the dashboard still works; sign-in and saving across devices are simply off.
 */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key, { auth: { persistSession: true, detectSessionInUrl: true } }) : null;

/** Turn Supabase errors into a sentence a doctor can act on. */
export function explainSupabaseError(err: { message?: string; code?: string } | null | undefined): string {
  if (!err) return "Something went wrong.";
  if (err.code === "PGRST205" || /schema cache|does not exist/i.test(err.message ?? "")) {
    return "Saving isn't set up yet: run supabase/migrations/0001_readout.sql in the Supabase SQL editor.";
  }
  if (/rate limit/i.test(err.message ?? "")) return "Too many sign-in emails for now. Wait a minute and try again.";
  if (/fetch|network/i.test(err.message ?? "")) return "Can't reach the server. Check your connection and try again.";
  return err.message ?? "Something went wrong.";
}
