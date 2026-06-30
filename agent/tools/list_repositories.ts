import { defineTool } from "eve/tools";
import { z } from "zod";
import { githubRequest, normalizeLimit, normalizeOffset } from "../lib/librarian/github.js";

interface RepositoryItem {
  full_name: string;
  private?: boolean;
  description?: string | null;
  html_url: string;
  language?: string | null;
  stargazers_count?: number;
  updated_at?: string;
}

interface RepositorySearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: RepositoryItem[];
}

export default defineTool({
  description: "List GitHub repositories, prioritizing repositories the user can access when Vercel Connect GitHub auth is configured.",
  inputSchema: z.object({
    pattern: z.string().optional().describe("Repository name or text pattern."),
    organization: z.string().optional().describe("GitHub organization or user to list repositories for."),
    language: z.string().optional().describe("Optional primary language filter."),
    limit: z.number().int().positive().max(100).optional(),
    offset: z.number().int().nonnegative().optional(),
  }),
  async execute({ pattern, organization, language, limit, offset }, ctx) {
    const max = normalizeLimit(limit, 30, 100);
    const start = normalizeOffset(offset);
    const page = Math.floor(start / max) + 1;

    if (organization) {
      const payload = (await githubRequest(ctx, {
        path: `/orgs/${encodeURIComponent(organization)}/repos`,
        searchParams: { per_page: max, page, sort: "updated" },
      })) as RepositoryItem[];

      const filtered = payload.filter((repo) => {
        const matchesPattern = pattern ? repo.full_name.toLowerCase().includes(pattern.toLowerCase()) : true;
        const matchesLanguage = language ? repo.language?.toLowerCase() === language.toLowerCase() : true;
        return matchesPattern && matchesLanguage;
      });

      return {
        source: "organization_repositories",
        organization,
        repositories: filtered.map(formatRepository),
        offset: start,
      };
    }

    const qualifiers = [pattern ?? "stars:>0", language ? `language:${language}` : undefined].filter(Boolean).join(" ");
    const payload = (await githubRequest(ctx, {
      path: "/search/repositories",
      searchParams: { q: qualifiers, per_page: max, page, sort: "updated" },
    })) as RepositorySearchResponse;

    return {
      source: "repository_search",
      query: qualifiers,
      totalCount: payload.total_count,
      incompleteResults: payload.incomplete_results,
      repositories: payload.items.map(formatRepository),
      offset: start,
    };
  },
});

function formatRepository(repo: RepositoryItem) {
  return {
    fullName: repo.full_name,
    private: repo.private,
    description: repo.description,
    url: repo.html_url,
    language: repo.language,
    stars: repo.stargazers_count,
    updatedAt: repo.updated_at,
  };
}
