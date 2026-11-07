import { handle } from "hono/vercel";
import { app } from "../../../../server/app.ts";

// The Hono API (/api/*) runs inside Next.js as one catch-all route handler.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// AI reads of photos and PDFs can take longer than the default serverless limit.
export const maxDuration = 60;

const handler = handle(app);
export { handler as GET, handler as POST };
