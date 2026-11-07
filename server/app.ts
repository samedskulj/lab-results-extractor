import { HTTPException } from "hono/http-exception";
import {
  AskRequestSchema,
  CommentaryRequestSchema,
  ExplainRequestSchema,
  ExtractRequestSchema,
  LetterRequestSchema,
  type ExtractorId,
} from "../shared/types.ts";
import { createApi, isLive, parseBody } from "./lib/index.ts";
import { ask, draftLetter, explain, extractResults, summarise } from "./pipeline.ts";
import { listSamples } from "./samples.ts";

function requireAvailable(extractor: ExtractorId): ExtractorId {
  if (extractor === "claude" && !isLive()) {
    throw new HTTPException(400, { message: "Claude needs an ANTHROPIC_API_KEY in .env. The rule-based engine works without one." });
  }
  return extractor;
}

export const app = createApi()
  .get("/samples", async (c) => c.json(await listSamples()))
  .post("/extract", async (c) => {
    const { text, extractor } = await parseBody(c, ExtractRequestSchema);
    return c.json(await extractResults(text, requireAvailable(extractor)));
  })
  .post("/commentary", async (c) => {
    const { results, extractor } = await parseBody(c, CommentaryRequestSchema);
    return c.json(await summarise(results, requireAvailable(extractor)));
  })
  .post("/explain", async (c) => {
    const { results, extractor } = await parseBody(c, ExplainRequestSchema);
    return c.json(await explain(results, requireAvailable(extractor)));
  })
  .post("/ask", async (c) => {
    const { results, extractor, question, history } = await parseBody(c, AskRequestSchema);
    return c.json(await ask(results, question, history, requireAvailable(extractor)));
  })
  .post("/letter", async (c) => {
    const { results, extractor, patient_name } = await parseBody(c, LetterRequestSchema);
    return c.json(await draftLetter(results, patient_name, requireAvailable(extractor)));
  });
