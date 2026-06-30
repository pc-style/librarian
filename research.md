# Research: Vercel AI Gateway model/free-credit replacement for Pioneer

## Summary
I could not perform live web search in this delegated run because no web search/fetch tool was available, so current free-credit policy and live model catalog availability are **not confidently verified** here. The deploy-safe implementation direction is still clear from the installed eve docs: use a plain string model id in `agent/agent.ts` to route through Vercel AI Gateway, which authenticates on Vercel via project OIDC without provider API keys; outside Vercel, set `AI_GATEWAY_API_KEY`. [eve deployment docs](node_modules/eve/docs/guides/deployment.md)

## Findings
1. **Replacing Pioneer with Vercel AI Gateway should use string model IDs, not `@ai-sdk/openai-compatible`.** eve documents that `model: "provider/model"` routes through Vercel AI Gateway; direct provider packages/objects bypass Gateway. This is the correct shape for deploy-safe Vercel auth and avoids needing `PIONEER_API_KEY`. [eve deployment docs](node_modules/eve/docs/guides/deployment.md)

2. **Vercel-hosted deployments can authenticate to Gateway through project OIDC.** The installed eve deployment guide says gateway model IDs authenticate through Vercel OIDC on Vercel; outside Vercel, use `AI_GATEWAY_API_KEY`. This means the app should not need provider-specific keys for Gateway-routed models, but local `eve dev` may need `AI_GATEWAY_API_KEY` if testing Gateway locally. [eve deployment docs](node_modules/eve/docs/guides/deployment.md)

3. **Requested model IDs are not live-verified in this run.** The likely Gateway-ID pattern is `provider/model`, but exact current IDs for `glm 5.2`, `gpt-5.4-mini`, `claude/haiku 4.5`, and `gpt-5.4-nano` require checking the live Vercel AI Gateway model catalog. Candidate IDs seen/assumed in the current working tree are:
   - `zai/glm-5.2`
   - `openai/gpt-5.4-mini`
   - `anthropic/claude-haiku-4.5`
   - `openai/gpt-5.4-nano`
   These must be validated against the live Gateway catalog before relying on them in production.

4. **Free-credit/free-model policy could not be verified.** The requested question asks whether Vercel free credits can use the preferred models. That is policy/catalog data from Vercel's live docs/dashboard, and it was not accessible with the tools provided. Do not assume these models are free or covered by a zero-dollar daily credit until confirmed in Vercel AI Gateway documentation/dashboard.

5. **Best deploy-safe recommendation given available evidence:** use Vercel AI Gateway with env-configurable primary model and fallback list, but do not hardcode unverified IDs as final truth. Recommended shape:
   ```ts
   import { defineAgent } from "eve";

   const model = process.env.EVE_MODEL ?? "zai/glm-5.2";

   export default defineAgent({
     model,
     modelContextWindowTokens: Number(process.env.EVE_CONTEXT_WINDOW_TOKENS ?? 128_000),
     modelOptions: {
       providerOptions: {
         gateway: {
           models: [
             "openai/gpt-5.4-mini",
             "anthropic/claude-haiku-4.5",
             "openai/gpt-5.4-nano",
           ],
         },
       },
     },
   });
   ```
   This preserves the preference order while allowing quick model override with `EVE_MODEL` if a candidate ID is unavailable or not free-credit eligible.

## Sources
- Kept: eve deployment docs (`node_modules/eve/docs/guides/deployment.md`) — confirms model-string Gateway routing, Vercel OIDC Gateway auth, and local `AI_GATEWAY_API_KEY` behavior.
- Kept: Vercel AI Gateway docs (`https://vercel.com/docs/ai-gateway`) — intended primary source for policy/catalog, but not fetched in this run.
- Kept: Vercel AI Gateway model catalog (`https://vercel.com/ai-gateway/models`) — intended primary source for exact model IDs and availability, but not fetched in this run.
- Dropped: Commentary/blog sources — not used because live primary-source access was unavailable and commentary would be weaker than Vercel's catalog/docs.

## Gaps
- Exact current Vercel AI Gateway model IDs for the four requested models are unverified.
- Whether each requested model is usable with Vercel free credits/free daily allowance is unverified.
- Need one follow-up with live web access or Vercel dashboard/catalog access to confirm:
  1. Does `zai/glm-5.2` exist in Gateway?
  2. If not, what is the closest GLM 5.2/GLM model ID?
  3. Are `openai/gpt-5.4-mini`, `anthropic/claude-haiku-4.5`, and `openai/gpt-5.4-nano` exact Gateway IDs?
  4. Which of those is covered by free credits or has a free route?

## Supervisor coordination
No supervisor contact was available/used. Blocker: live web search/fetch tools were unavailable in this subagent run, so policy/model-catalog verification could not be completed confidently.
