import { defineTool } from "eve/tools";
import { z } from "zod";
import { githubRequest, parseRepository } from "../lib/librarian/github.js";

interface CompareResponse {
  status: string;
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  html_url: string;
  base_commit?: { sha: string };
  merge_base_commit?: { sha: string };
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
    blob_url?: string;
    raw_url?: string;
  }>;
  commits?: Array<{
    sha: string;
    html_url: string;
    commit: {
      message: string;
      author?: { name?: string; email?: string; date?: string };
    };
  }>;
}

export default defineTool({
  description: "Get a diff between two commits, branches, or tags in a single GitHub repository.",
  inputSchema: z.object({
    repository: z.string().min(1).describe("GitHub repository as owner/repo or a repository URL."),
    base: z.string().min(1).describe("Base commit SHA, branch, or tag."),
    head: z.string().min(1).describe("Head commit SHA, branch, or tag."),
    includePatches: z.boolean().default(false).describe("Include unified diff hunks when true."),
  }),
  async execute({ repository, base, head, includePatches }, ctx) {
    const { owner, repo } = parseRepository(repository);
    const encodedBase = encodeURIComponent(base);
    const encodedHead = encodeURIComponent(head);
    const payload = (await githubRequest(ctx, {
      path: `/repos/${owner}/${repo}/compare/${encodedBase}...${encodedHead}`,
    })) as CompareResponse;

    return {
      repository: `${owner}/${repo}`,
      base,
      head,
      status: payload.status,
      aheadBy: payload.ahead_by,
      behindBy: payload.behind_by,
      totalCommits: payload.total_commits,
      url: payload.html_url,
      mergeBase: payload.merge_base_commit?.sha,
      commits: payload.commits?.map((commit) => ({
        sha: commit.sha,
        url: commit.html_url,
        message: commit.commit.message,
        author: commit.commit.author?.name,
        authorEmail: commit.commit.author?.email,
        authoredAt: commit.commit.author?.date,
      })),
      files: payload.files?.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        blobUrl: file.blob_url,
        rawUrl: file.raw_url,
        patch: includePatches ? file.patch : undefined,
      })),
    };
  },
});
