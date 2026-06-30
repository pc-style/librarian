import { defineTool } from "eve/tools";
import { z } from "zod";
import { githubRequest, normalizeLimit, normalizeOffset, parseRepository } from "../lib/librarian/github.js";

interface CommitSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: Array<{
    sha: string;
    html_url: string;
    commit: {
      message: string;
      author?: {
        name?: string;
        email?: string;
        date?: string;
      };
      committer?: {
        name?: string;
        email?: string;
        date?: string;
      };
    };
    author?: {
      login?: string;
    } | null;
  }>;
}

export default defineTool({
  description: "Search commit history in a single GitHub repository.",
  inputSchema: z.object({
    repository: z.string().min(1).describe("GitHub repository as owner/repo or a repository URL."),
    query: z.string().optional().describe("Text search over commit messages and author information."),
    author: z.string().optional().describe("Filter by author username or email."),
    since: z.string().optional().describe("ISO 8601 earliest commit date."),
    until: z.string().optional().describe("ISO 8601 latest commit date."),
    path: z.string().optional().describe("Filter commits touching a file or directory."),
    limit: z.number().int().positive().max(100).optional(),
    offset: z.number().int().nonnegative().optional(),
  }),
  async execute({ repository, query, author, since, until, path, limit, offset }, ctx) {
    const { owner, repo } = parseRepository(repository);
    const max = normalizeLimit(limit, 50, 100);
    const start = normalizeOffset(offset);
    const page = Math.floor(start / max) + 1;
    const terms = [
      `repo:${owner}/${repo}`,
      query,
      author ? `author:${author}` : undefined,
      since ? `committer-date:>=${since}` : undefined,
      until ? `committer-date:<=${until}` : undefined,
      path ? `path:${path}` : undefined,
    ].filter(Boolean);

    const payload = (await githubRequest(ctx, {
      path: "/search/commits",
      accept: "application/vnd.github+json",
      searchParams: { q: terms.join(" "), per_page: max, page },
    })) as CommitSearchResponse;

    return {
      repository: `${owner}/${repo}`,
      query: terms.join(" "),
      totalCount: payload.total_count,
      incompleteResults: payload.incomplete_results,
      offset: start,
      commits: payload.items.map((item) => ({
        sha: item.sha,
        url: item.html_url,
        message: item.commit.message,
        author: item.author?.login ?? item.commit.author?.name,
        authorEmail: item.commit.author?.email,
        authoredAt: item.commit.author?.date,
        committedAt: item.commit.committer?.date,
      })),
    };
  },
});
