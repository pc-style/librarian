import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  githubRequest,
  hasUserGitHubAuth,
  lineNumbered,
  normalizeLimit,
  normalizePagedOffset,
  parseRepository,
} from "../lib/librarian/github.js";

const MAX_CONTEXTUALIZED_RESULTS = 20;

interface CodeSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: Array<{
    name: string;
    path: string;
    html_url: string;
    url: string;
    repository?: {
      full_name: string;
    };
    score?: number;
    text_matches?: Array<{
      object_url?: string;
      object_type?: string;
      property?: string;
      fragment?: string;
      matches?: Array<{
        text?: string;
        indices?: [number, number];
      }>;
    }>;
  }>;
}

export default defineTool({
  description: "Search for code patterns inside a single GitHub repository.",
  inputSchema: z.object({
    repository: z.string().min(1).describe("GitHub repository as owner/repo or a repository URL."),
    pattern: z
      .string()
      .min(1)
      .describe(
        "GitHub code search query. Supports boolean operators such as AND, OR, and NOT, plus qualifiers such as language:, path:, extension:, and in:.",
      ),
    path: z.string().optional().describe("Optional path qualifier to limit search."),
    limit: z.number().int().positive().max(100).optional(),
    offset: z.number().int().nonnegative().optional(),
  }),
  async execute({ repository, pattern, path, limit, offset }, ctx) {
    const { owner, repo } = parseRepository(repository);
    const max = normalizeLimit(limit, 30, 100);
    const start = normalizePagedOffset(offset, max);
    const page = Math.floor(start / max) + 1;
    const query = [`repo:${owner}/${repo}`, pattern, path ? `path:${path}` : undefined].filter(Boolean).join(" ");
    const payload = (await githubRequest(ctx, {
      path: "/search/code",
      accept: "application/vnd.github.text-match+json",
      searchParams: { q: query, per_page: max, page },
    })) as CodeSearchResponse;

    const canUseUserAuth = hasUserGitHubAuth(ctx);
    const contextualizedLimit = canUseUserAuth ? MAX_CONTEXTUALIZED_RESULTS : 0;
    const contextualizedResults = await Promise.all(
      payload.items.slice(0, contextualizedLimit).map(async (item) => ({
        path: item.path,
        snippets: await snippetsForItem(ctx, item, canUseUserAuth),
      })),
    );
    const snippetsByPath = new Map(contextualizedResults.map((result) => [result.path, result.snippets]));

    return {
      repository: `${owner}/${repo}`,
      query,
      totalCount: payload.total_count,
      incompleteResults: payload.incomplete_results,
      offset: start,
      contextualizedCount: contextualizedResults.length,
      contextualizedLimit,
      results: payload.items.map((item) => ({
        name: item.name,
        path: item.path,
        repository: item.repository?.full_name,
        url: item.html_url,
        score: item.score,
        snippets: snippetsByPath.get(item.path) ?? snippetsFromTextMatches(item.text_matches),
      })),
    };
  },
});

async function snippetsForItem(ctx: Parameters<typeof githubRequest>[0], item: CodeSearchResponse["items"][number], authenticated: boolean) {
  const rawSnippets = snippetsFromTextMatches(item.text_matches);
  if (rawSnippets.length === 0) return [];

  try {
    const content = await githubRequest(ctx, {
      path: item.url,
      raw: true,
      accept: "application/vnd.github.raw+json",
      authenticated,
    });

    if (typeof content !== "string") return rawSnippets;

    let searchStartIndex = 0;
    return rawSnippets.map((snippet) => {
      const startIndex = content.indexOf(snippet.fragment, searchStartIndex);
      const numbered = addLineNumbers(content, snippet, searchStartIndex);
      if (startIndex !== -1) searchStartIndex = startIndex + snippet.fragment.length;
      return numbered;
    });
  } catch {
    return rawSnippets;
  }
}

export function snippetsFromTextMatches(textMatches: CodeSearchResponse["items"][number]["text_matches"]) {
  return (textMatches ?? [])
    .filter((match) => match.fragment)
    .map((match) => ({
      objectType: match.object_type,
      property: match.property,
      fragment: match.fragment ?? "",
      matchedText: match.matches?.map((textMatch) => textMatch.text).filter(Boolean) ?? [],
    }));
}

export function addLineNumbers(content: string, snippet: ReturnType<typeof snippetsFromTextMatches>[number], searchStartIndex = 0) {
  // GitHub text-match fragments do not include file offsets, so line mapping is best-effort.
  const startIndex = content.indexOf(snippet.fragment, searchStartIndex);
  if (startIndex === -1) return snippet;

  const startLine = content.slice(0, startIndex).split("\n").length;
  const endLine = startLine + snippet.fragment.split("\n").length - 1;

  return {
    ...snippet,
    startLine,
    endLine,
    content: lineNumbered(snippet.fragment, startLine),
  };
}
