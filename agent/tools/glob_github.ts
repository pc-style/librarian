import { defineTool } from "eve/tools";
import { z } from "zod";
import { githubRequest, globToRegExp, normalizeLimit, normalizePagedOffset, parseRepository } from "../lib/librarian/github.js";

interface RepoInfo {
  default_branch: string;
}

interface TreeResponse {
  tree: Array<{
    path?: string;
    type?: string;
    size?: number;
    url?: string;
  }>;
  truncated?: boolean;
}

export default defineTool({
  description: "Find files matching a glob pattern in a GitHub repository.",
  inputSchema: z.object({
    repository: z.string().min(1).describe("GitHub repository as owner/repo or a repository URL."),
    filePattern: z.string().min(1).describe("Glob pattern, for example **/*.ts or docs/**/*.md."),
    limit: z.number().int().positive().max(1000).optional(),
    offset: z.number().int().nonnegative().optional(),
  }),
  async execute({ repository, filePattern, limit, offset }, ctx) {
    const { owner, repo } = parseRepository(repository);
    const repoInfo = (await githubRequest(ctx, { path: `/repos/${owner}/${repo}` })) as RepoInfo;
    const tree = (await githubRequest(ctx, {
      path: `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(repoInfo.default_branch)}`,
      searchParams: { recursive: "1" },
    })) as TreeResponse;

    const matcher = globToRegExp(filePattern);
    const matches = tree.tree
      .filter((item) => item.type === "blob" && item.path && matcher.test(item.path))
      .map((item) => ({ path: item.path, size: item.size, gitUrl: item.url }));

    const max = normalizeLimit(limit, 100, 1000);
    const start = normalizePagedOffset(offset, max);

    return {
      repository: `${owner}/${repo}`,
      filePattern,
      totalMatches: matches.length,
      matches: matches.slice(start, start + max),
      offset: start,
      truncated: tree.truncated === true || start + max < matches.length,
    };
  },
});
