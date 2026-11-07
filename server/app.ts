import { HTTPException } from "hono/http-exception";
import {
  AskRequestSchema,
  CommentaryRequestSchema,
  ExplainRequestSchema,
  ExtractRequestSchema,
  LetterRequestSchema,
  TranscribeRequestSchema,
} from "../shared/types.ts";
import { createApi, isLive, parseBody, requireSignIn } from "./lib/index.ts";
import { ask, draftLetter, explain, extractResults, summarise, transcribeFile } from "./pipeline.ts";

/** Fail early with a plain sentence when the server has no AI credentials. */
function requireAi() {
  if (!isLive()) throw new HTTPException(503, { message: "The AI assistant isn't set up on this server yet. Add ANTHROPIC_API_KEY to .env." });
}

export const app = createApi()
  // The health route is registered first and answers on its own; everything below needs a signed-in doctor and the AI.
  .use("*", requireSignIn)
  .use("*", async (_c, next) => {
    requireAi();
    await next();
  })
  .post("/transcribe", async (c) => c.json(await transcribeFile(await parseBody(c, TranscribeRequestSchema))))
  .post("/extract", async (c) => {
    const { text, region } = await parseBody(c, ExtractRequestSchema);
    return c.json(await extractResults(text, region));
  })
  .post("/commentary", async (c) => c.json(await summarise((await parseBody(c, CommentaryRequestSchema)).results)))
  .post("/explain", async (c) => c.json(await explain((await parseBody(c, ExplainRequestSchema)).results)))
  .post("/ask", async (c) => {
    const { results, question, history } = await parseBody(c, AskRequestSchema);
    return c.json(await ask(results, question, history));
  })
  .post("/letter", async (c) => {
    const { results, patient_name } = await parseBody(c, LetterRequestSchema);
    return c.json(await draftLetter(results, patient_name));
  });
