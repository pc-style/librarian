import { defineTool } from "eve/tools";
import { z } from "zod";
import { githubRequest, normalizeLimit, normalizeOffset, parseRepository } from "../lib/librarian/github.js";

interface CodeSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: Array<{
    name: string;
    path: string;
    html_url: string;
    repository?: {
      full_name: string;
    };
    score?: number;
  }>;
}

export default defineTool({
  description: "Search for code patterns inside a single GitHub repository.",
  inputSchema: z.object({
    repository: z.string().min(1).describe("GitHub repository as owner/repo or a repository URL."),
    pattern: z.string().min(1).describe("GitHub code search query. Supports GitHub code search qualifiers."),
    path: z.string().optional().describe("Optional path qualifier to limit search."),
    limit: z.number().int().positive().max(100).optional(),
    offset: z.number().int().nonnegative().optional(),
  }),
  async execute({ repository, pattern, path, limit, offset }, ctx) {
    const { owner, repo } = parseRepository(repository);
    const max = normalizeLimit(limit, 30, 100);
    const start = normalizeOffset(offset);
    const page = Math.floor(start / max) + 1;
    const query = [`repo:${owner}/${repo}`, pattern, path ? `path:${path}` : undefined].filter(Boolean).join(" ");
    const payload = (await githubRequest(ctx, {
      path: "/search/code",
      searchParams: { q: query, per_page: max, page },
    })) as CodeSearchResponse;

    return {
      repository: `${owner}/${repo}`,
      query,
      totalCount: payload.total_count,
      incompleteResults: payload.incomplete_results,
      offset: start,
      results: payload.items.map((item) => ({
        name: item.name,
        path: item.path,
        repository: item.repository?.full_name,
        url: item.html_url,
        score: item.score,
      })),
    };
  },
});
