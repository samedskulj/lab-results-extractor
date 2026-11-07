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
  const message = err.message ?? "";
  if (/invalid login credentials/i.test(message)) return "That email and password don't match. Check them and try again.";
  if (/already registered|already been registered/i.test(message)) return "An account with this email already exists. Sign in instead.";
  if (/email not confirmed/i.test(message)) return "Confirm your email first: open the link we sent you, then sign in.";
  if (/at least d+ characters|weak password|password should/i.test(message)) return "Choose a stronger password: at least 8 characters.";
  if (/same as the old|different from the old/i.test(message)) return "Choose a password you haven't used before.";
  if (/rate limit|too many/i.test(message)) return "Too many attempts for now. Wait a minute and try again.";
  if (/fetch|network/i.test(err.message ?? "")) return "Can't reach the server. Check your connection and try again.";
  return err.message ?? "Something went wrong.";
}
