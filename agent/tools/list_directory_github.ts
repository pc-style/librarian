import { defineTool } from "eve/tools";
import { z } from "zod";
import { githubRequest, normalizeLimit, parseRepository } from "../lib/librarian/github.js";

interface ContentItem {
  name: string;
  path: string;
  type: "file" | "dir" | "symlink" | "submodule";
  size?: number;
  html_url?: string;
}

export default defineTool({
  description: "List the contents of a directory in a GitHub repository.",
  inputSchema: z.object({
    repository: z.string().min(1).describe("GitHub repository as owner/repo or a repository URL."),
    path: z.string().default("").describe("Directory path; empty string or . for repository root."),
    limit: z.number().int().positive().max(1000).optional().describe("Maximum entries to return."),
  }),
  async execute({ repository, path, limit }, ctx) {
    const { owner, repo } = parseRepository(repository);
    const cleanPath = path === "." ? "" : path.replace(/^\/+|\/+$/g, "");
    const encodedPath = cleanPath.split("/").map(encodeURIComponent).join("/");
    const payload = await githubRequest(ctx, {
      path: `/repos/${owner}/${repo}/contents/${encodedPath}`,
    });

    if (!Array.isArray(payload)) {
      return {
        repository: `${owner}/${repo}`,
        path: cleanPath,
        kind: "file",
        message: "Path resolved to a file, not a directory. Use read_github to read file contents.",
      };
    }

    const max = normalizeLimit(limit, 100, 1000);
    const entries = (payload as ContentItem[]).slice(0, max).map((item) => ({
      name: item.name,
      path: item.type === "dir" ? `${item.path}/` : item.path,
      type: item.type,
      size: item.size,
      url: item.html_url,
    }));

    return {
      repository: `${owner}/${repo}`,
      path: cleanPath,
      entries,
      truncated: payload.length > entries.length,
    };
  },
});
