import { defineTool } from "eve/tools";
import { z } from "zod";
import { parallelRequest } from "../lib/librarian/parallel.js";

export default defineTool({
  description: "Search the web for information relevant to a research objective using Parallel Search.",
  inputSchema: z.object({
    objective: z.string().min(1).describe("Natural-language research goal."),
    search_queries: z.array(z.string().min(1)).min(1).max(5).optional().describe("Concise keyword queries, ideally 2-3 queries of 3-6 words each."),
    max_results: z.number().int().positive().max(20).optional().describe("Maximum results to return."),
  }),
  async execute({ objective, search_queries, max_results }) {
    const payload = await parallelRequest({
      endpoint: "/v1/search",
      body: {
        objective,
        search_queries: search_queries ?? [objective],
        mode: "advanced",
        max_chars_total: 12_000,
      },
    });

    const response = payload as {
      search_id?: string;
      session_id?: string;
      results?: Array<{
        url?: string;
        title?: string;
        publish_date?: string | null;
        excerpts?: string[];
      }>;
      warnings?: unknown;
      usage?: unknown;
    };

    return {
      searchId: response.search_id,
      sessionId: response.session_id,
      results: (response.results ?? []).slice(0, max_results ?? 5).map((result) => ({
        url: result.url,
        title: result.title,
        publishDate: result.publish_date,
        excerpts: result.excerpts ?? [],
      })),
      warnings: response.warnings,
      usage: response.usage,
    };
  },
});
