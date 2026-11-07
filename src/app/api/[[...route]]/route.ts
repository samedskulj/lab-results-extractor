import { handle } from "hono/vercel";
import { app } from "../../../../server/app.ts";

// The Hono API (/api/*) runs inside Next.js as one catch-all route handler.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = handle(app);
export { handler as GET, handler as POST };
