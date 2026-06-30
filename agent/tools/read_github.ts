import { defineTool } from "eve/tools";
import { z } from "zod";
import { applyReadRange, githubRequest, lineNumbered, parseRepository } from "../lib/librarian/github.js";

interface ContentFile {
  type: string;
  name: string;
  path: string;
  size?: number;
  download_url?: string | null;
  html_url?: string;
}

interface ContentDirectoryItem {
  name: string;
  path: string;
  type: string;
  size?: number;
  html_url?: string;
}

export default defineTool({
  description: "Read a file from a GitHub repository, or list a directory if the path resolves to one.",
  inputSchema: z.object({
    repository: z.string().min(1).describe("GitHub repository as owner/repo or a repository URL."),
    path: z.string().min(1).describe("File or directory path."),
    read_range: z
      .tuple([z.number().int().positive(), z.number().int().positive()])
      .optional()
      .describe("Optional inclusive 1-based line range [start, end]."),
  }),
  async execute({ repository, path, read_range }, ctx) {
    const { owner, repo } = parseRepository(repository);
    const cleanPath = path.replace(/^\/+|\/+$/g, "");
    const encodedPath = cleanPath.split("/").map(encodeURIComponent).join("/");
    const payload = await githubRequest(ctx, {
      path: `/repos/${owner}/${repo}/contents/${encodedPath}`,
    });

    if (Array.isArray(payload)) {
      return {
        repository: `${owner}/${repo}`,
        path: cleanPath,
        kind: "directory",
        entries: (payload as ContentDirectoryItem[]).map((item) => ({
          name: item.name,
          path: item.type === "dir" ? `${item.path}/` : item.path,
          type: item.type,
          size: item.size,
          url: item.html_url,
        })),
      };
    }

    const file = payload as ContentFile;
    if (file.type !== "file" || !file.download_url) {
      return {
        repository: `${owner}/${repo}`,
        path: cleanPath,
        kind: file.type,
        message: "Path is not a readable file.",
      };
    }

    const content = await githubRequest(ctx, {
      path: file.download_url,
      raw: true,
      accept: "text/plain",
    });

    if (typeof content !== "string") {
      throw new Error("Expected raw GitHub file content to be text.");
    }

    if (file.size && file.size > 128_000 && !read_range) {
      return {
        repository: `${owner}/${repo}`,
        path: cleanPath,
        kind: "file",
        size: file.size,
        url: file.html_url,
        message: "File is larger than 128 KB. Call read_github again with read_range to read a specific line range.",
      };
    }

    const ranged = applyReadRange(content, read_range);

    return {
      repository: `${owner}/${repo}`,
      path: cleanPath,
      kind: "file",
      size: file.size,
      url: file.html_url,
      startLine: ranged.startLine,
      endLine: ranged.endLine,
      truncatedToRange: ranged.truncatedToRange,
      content: lineNumbered(ranged.content, ranged.startLine),
    };
  },
});
