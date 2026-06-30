import { defineAgent } from "eve";

const DEFAULT_MODEL = "zai/glm-5.2-fast";

const MODEL_CONTEXT_WINDOW_TOKENS: Record<string, number> = {
  "zai/glm-5.2-fast": 1_000_000,
  "zai/glm-5.2": 1_000_000,
  "openai/gpt-5.4-mini": 400_000,
  "anthropic/claude-haiku-4.5": 200_000,
  "openai/gpt-5.4-nano": 128_000,
};

const GATEWAY_FALLBACK_MODELS = [
  "openai/gpt-5.4-mini",
  "anthropic/claude-haiku-4.5",
  "openai/gpt-5.4-nano",
] as const;

const model = process.env.EVE_MODEL ?? DEFAULT_MODEL;

export default defineAgent({
  model,
  modelContextWindowTokens: Number(
    process.env.EVE_CONTEXT_WINDOW_TOKENS ??
      MODEL_CONTEXT_WINDOW_TOKENS[model] ??
      128_000,
  ),
  modelOptions: {
    providerOptions: {
      gateway: {
        models: [...GATEWAY_FALLBACK_MODELS],
      },
    },
  },
});
