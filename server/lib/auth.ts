import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Sign-in is enforced whenever Supabase is configured, and always in production. */
const authRequired = () => Boolean(supabaseUrl() && supabaseKey()) || process.env.NODE_ENV === "production";

/**
 * Only signed-in doctors can use the AI routes. The browser sends its Supabase access token;
 * Supabase itself says whether the token is valid, so no secret is needed here.
 */
export const requireSignIn: MiddlewareHandler = async (c, next) => {
  if (!authRequired()) return next();
  if (!supabaseUrl() || !supabaseKey()) throw new HTTPException(503, { message: "Sign-in isn't set up on this server." });

  const token = c.req.header("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new HTTPException(401, { message: "Sign in to continue." });

  const res = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: supabaseKey()! },
  }).catch(() => undefined);
  if (!res) throw new HTTPException(503, { message: "Can't reach the sign-in service. Try again in a moment." });
  if (!res.ok) throw new HTTPException(401, { message: "Your session has expired. Sign in again." });
  return next();
};
