import { defineTool } from "eve/tools";
import { z } from "zod";
import { parallelRequest } from "../lib/librarian/parallel.js";

export default defineTool({
  description: "Read the contents of a public web page at a URL using Parallel Extract.",
  inputSchema: z.object({
    url: z.string().url().describe("Public URL to fetch."),
    objective: z.string().optional().describe("Natural-language description of what to find on the page."),
    searchQueries: z.array(z.string().min(1)).optional().describe("Short keyword queries used with the objective to focus excerpts."),
    fullContent: z.boolean().default(false).describe("Return full markdown content when true; otherwise return focused excerpts. Use true for short documentation pages, API references, or pages where exact option names/signatures matter."),
    forceRefetch: z.boolean().default(false).describe("Request a fresh fetch where supported. Parallel may still apply its own fetch policy."),
  }),
  async execute({ url, objective, searchQueries, fullContent, forceRefetch }) {
    const payload = await parallelRequest({
      endpoint: "/v1/extract",
      body: {
        urls: [url],
        objective,
        search_queries: searchQueries,
        max_chars_total: fullContent ? 80_000 : 16_000,
        advanced_settings: {
          full_content: {
            enabled: fullContent,
          },
          fetch: {
            cache_policy: forceRefetch ? "refresh" : "default",
          },
        },
      },
    });

    const response = payload as {
      extract_id?: string;
      session_id?: string;
      results?: Array<{
        url?: string;
        title?: string;
        publish_date?: string | null;
        excerpts?: string[];
        full_content?: string | null;
      }>;
      errors?: Array<{
        url?: string;
        error_type?: string;
        http_status_code?: number;
        content?: string;
      }>;
      warnings?: unknown;
      usage?: unknown;
    };

    return {
      extractId: response.extract_id,
      sessionId: response.session_id,
      results: (response.results ?? []).map((result) => ({
        url: result.url,
        title: result.title,
        publishDate: result.publish_date,
        excerpts: result.excerpts ?? [],
        fullContent: result.full_content,
      })),
      errors: response.errors ?? [],
      warnings: response.warnings,
      usage: response.usage,
    };
  },
});
