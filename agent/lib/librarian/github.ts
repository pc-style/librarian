import { connect } from "@vercel/connect/eve";

const connector = process.env.VERCEL_CONNECT_GITHUB_CONNECTOR;

const githubAuth = connector
  ? connect({
      connector,
      principalType: "user",
      tokenParams: {
        scopes: ["repo", "read:user"],
      },
    })
  : null;

interface ToolContextWithAuth {
  getToken(provider: NonNullable<typeof githubAuth>): Promise<{ token: string }>;
  requireAuth(provider: NonNullable<typeof githubAuth>): void;
}

interface GitHubRequestOptions {
  path: string;
  searchParams?: Record<string, string | number | boolean | undefined>;
  accept?: string;
  authenticated?: boolean;
  raw?: boolean;
}

interface GitHubErrorBody {
  message?: string;
  documentation_url?: string;
}

const RESERVED_GITHUB_PATH_SEGMENTS = new Set([
  "about",
  "collections",
  "events",
  "explore",
  "features",
  "join",
  "login",
  "marketplace",
  "organizations",
  "orgs",
  "pricing",
  "search",
  "settings",
  "sponsors",
  "topics",
]);

export function parseRepository(repository: string) {
  const trimmed = repository.trim();
  const urlMatch = trimmed.match(/github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/#?]+?)(?:\.git)?(?:[/#?].*)?$/i);
  const slashMatch = trimmed.match(/^(?<owner>[^/\s]+)\/(?<repo>[^/\s]+)$/);
  const match = urlMatch ?? slashMatch;

  if (!match?.groups) {
    throw new Error("Repository must be `owner/repo` or a GitHub repository URL.");
  }

  const owner = match.groups.owner;
  const repo = match.groups.repo.replace(/\.git$/i, "");

  if (RESERVED_GITHUB_PATH_SEGMENTS.has(owner.toLowerCase())) {
    throw new Error(
      "Do not pass GitHub search, profile, or organization URLs as repositories. Use `owner/repo` or a repository URL.",
    );
  }

  return { owner, repo };
}

export function normalizeLimit(limit: number | undefined, fallback: number, max: number) {
  if (limit === undefined) return fallback;
  return Math.min(Math.max(Math.trunc(limit), 1), max);
}

export function normalizeOffset(offset: number | undefined) {
  if (offset === undefined) return 0;
  return Math.max(Math.trunc(offset), 0);
}

export function normalizePagedOffset(offset: number | undefined, limit: number) {
  const normalized = normalizeOffset(offset);
  if (normalized % limit !== 0) {
    throw new Error(`offset must be divisible by limit (${limit}).`);
  }
  return normalized;
}

export function lineNumbered(content: string, startLine = 1) {
  return content
    .split("\n")
    .map((line, index) => `${startLine + index}: ${line}`)
    .join("\n");
}

export function applyReadRange(content: string, readRange?: [number, number]) {
  if (!readRange) {
    return {
      content,
      startLine: 1,
      endLine: content.split("\n").length,
      truncatedToRange: false,
    };
  }

  const [rawStart, rawEnd] = readRange;
  const startLine = Math.max(Math.trunc(rawStart), 1);
  const endLine = Math.max(Math.trunc(rawEnd), startLine);
  const lines = content.split("\n");

  return {
    content: lines.slice(startLine - 1, endLine).join("\n"),
    startLine,
    endLine: Math.min(endLine, lines.length),
    truncatedToRange: true,
  };
}

export function globToRegExp(pattern: string) {
  let source = "^";

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const next = pattern[index + 1];

    if (char === "*" && next === "*") {
      source += ".*";
      index += 1;
    } else if (char === "*") {
      source += "[^/]*";
    } else if (char === "?") {
      source += "[^/]";
    } else if ("\\^$+?.()|{}[]".includes(char)) {
      source += `\\${char}`;
    } else {
      source += char;
    }
  }

  source += "$";
  return new RegExp(source);
}

export async function githubRequest(ctx: ToolContextWithAuth, options: GitHubRequestOptions) {
  const url = new URL(options.raw ? options.path : `https://api.github.com${options.path}`);

  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = {
    accept: options.accept ?? "application/vnd.github+json",
    "user-agent": "eve-librarian-agent",
    "x-github-api-version": "2022-11-28",
  };

  if (options.authenticated && githubAuth) {
    const { token } = await ctx.getToken(githubAuth);
    headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (response.status === 401 && options.authenticated && githubAuth) {
    ctx.requireAuth(githubAuth);
  }

  if (!response.ok) {
    let body: GitHubErrorBody | undefined;
    try {
      body = (await response.json()) as GitHubErrorBody;
    } catch {
      body = undefined;
    }

    if ((response.status === 401 || response.status === 403 || response.status === 404) && !options.authenticated && githubAuth) {
      return githubRequest(ctx, { ...options, authenticated: true });
    }

    if ((response.status === 401 || response.status === 403 || response.status === 404) && !githubAuth) {
      throw new Error(
        `GitHub request failed (${response.status}). Public access was not enough, and Vercel Connect GitHub auth is not configured. Set VERCEL_CONNECT_GITHUB_CONNECTOR to enable user authorization. ${body?.message ?? ""}`.trim(),
      );
    }

    throw new Error(`GitHub request failed (${response.status}): ${body?.message ?? response.statusText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return response.json() as Promise<unknown>;
  return response.text();
}
