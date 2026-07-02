import { defineTool } from "eve/tools";
import { z } from "zod";
import { githubRequest, hasUserGitHubAuth, normalizeLimit, normalizePagedOffset } from "../lib/librarian/github.js";

export const AUTHENTICATED_REPOSITORY_PAGE_SIZE = 100;
const MAX_AUTHENTICATED_REPOSITORY_PAGES = 10;

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

interface GitHubAccount {
  type?: string;
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
    const start = normalizePagedOffset(offset, max);
    const page = Math.floor(start / max) + 1;
    const canUseUserAuth = hasUserGitHubAuth(ctx);

    if (organization) {
      const account = (await githubRequest(ctx, {
        path: `/users/${encodeURIComponent(organization)}`,
        authenticated: canUseUserAuth,
      })) as GitHubAccount;

      if (!pattern && !language && (account.type === "Organization" || !canUseUserAuth)) {
        const ownerReposPath =
          account.type === "Organization"
            ? `/orgs/${encodeURIComponent(organization)}/repos`
            : `/users/${encodeURIComponent(organization)}/repos`;
        const payload = (await githubRequest(ctx, {
          path: ownerReposPath,
          authenticated: canUseUserAuth,
          searchParams: { per_page: max, page, sort: "updated", direction: "desc", type: "all" },
        })) as RepositoryItem[];

        return {
          source: "owner_repositories",
          organization,
          ownerType: account.type,
          repositories: payload.map(formatRepository),
          offset: start,
          truncated: payload.length === max,
        };
      }

      const ownerQualifier = account.type === "Organization" ? "org" : "user";
      const query = [
        `${ownerQualifier}:${organization}`,
        pattern ? `${pattern} in:name,description` : undefined,
        language ? `language:${language}` : undefined,
      ]
        .filter(Boolean)
        .join(" ");
      const payload = (await githubRequest(ctx, {
        path: "/search/repositories",
        authenticated: canUseUserAuth,
        searchParams: { q: query, per_page: max, page, sort: "updated" },
      })) as RepositorySearchResponse;

      return {
        source: "owner_repository_search",
        organization,
        ownerType: account.type,
        query,
        totalCount: payload.total_count,
        incompleteResults: payload.incomplete_results,
        repositories: payload.items.map(formatRepository),
        offset: start,
      };
    }

    if (canUseUserAuth) {
      const collected = await collectAuthenticatedRepositories(ctx, { pattern, language, start, max });

      return {
        source: "authenticated_user_repositories",
        repositories: collected.repositories.map(formatRepository),
        offset: start,
        searchedPages: collected.searchedPages,
        truncated: collected.truncated,
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

export async function collectAuthenticatedRepositories(
  ctx: Parameters<typeof githubRequest>[0],
  options: { pattern: string | undefined; language: string | undefined; start: number; max: number },
) {
  const repositories: RepositoryItem[] = [];
  let searchedPages = 0;

  for (let page = 1; page <= MAX_AUTHENTICATED_REPOSITORY_PAGES; page += 1) {
    searchedPages = page;
    const payload = (await githubRequest(ctx, {
      path: "/user/repos",
      authenticated: true,
      searchParams: {
        per_page: AUTHENTICATED_REPOSITORY_PAGE_SIZE,
        page,
        sort: "updated",
        affiliation: "owner,collaborator,organization_member",
      },
    })) as RepositoryItem[];

    repositories.push(...payload.filter((repo) => matchesRepository(repo, options.pattern, options.language)));

    if (repositories.length >= options.start + options.max || payload.length < AUTHENTICATED_REPOSITORY_PAGE_SIZE) {
      return {
        repositories: repositories.slice(options.start, options.start + options.max),
        searchedPages,
        truncated: payload.length === AUTHENTICATED_REPOSITORY_PAGE_SIZE,
      };
    }
  }

  return {
    repositories: repositories.slice(options.start, options.start + options.max),
    searchedPages,
    truncated: true,
  };
}

export function matchesRepository(repo: RepositoryItem, pattern: string | undefined, language: string | undefined) {
  const normalizedPattern = pattern?.toLowerCase();
  const matchesPattern = normalizedPattern
    ? repo.full_name.toLowerCase().includes(normalizedPattern) || (repo.description?.toLowerCase().includes(normalizedPattern) ?? false)
    : true;
  const matchesLanguage = language ? repo.language?.toLowerCase() === language.toLowerCase() : true;
  return matchesPattern && matchesLanguage;
}

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
