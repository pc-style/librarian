import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { defineAgent } from "eve";

const pioneer = createOpenAICompatible({
  name: "pioneer",
  baseURL: "https://api.pioneer.ai/v1",
  headers: {
    "X-API-Key": process.env.PIONEER_API_KEY ?? "",
  },
  includeUsage: true,
});

export default defineAgent({
  model: pioneer(process.env.PIONEER_MODEL_ID ?? "pioneer/auto"),
  modelContextWindowTokens: Number(process.env.PIONEER_CONTEXT_WINDOW_TOKENS ?? 128_000),
});
