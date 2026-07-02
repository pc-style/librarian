import assert from "node:assert/strict";
import test from "node:test";
import { collectAuthenticatedRepositories, matchesRepository } from "./list_repositories.js";

const originalFetch = globalThis.fetch;

const ctx = {
  session: { auth: { current: { principalType: "user" } } },
  getToken: async () => ({ token: "test-token" }),
  requireAuth: () => undefined,
};

function repo(index: number, overrides: Partial<{ full_name: string; description: string | null; language: string | null }> = {}) {
  return {
    full_name: `owner/repo-${index}`,
    private: false,
    description: `Repository ${index}`,
    html_url: `https://github.com/owner/repo-${index}`,
    language: "TypeScript",
    stargazers_count: index,
    updated_at: "2026-07-02T00:00:00Z",
    ...overrides,
  };
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
}

test("collectAuthenticatedRepositories exits once the requested slice is available and marks full pages truncated", async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (input) => {
    calls.push(String(input));
    return jsonResponse(Array.from({ length: 100 }, (_, index) => repo(index)));
  }) as typeof fetch;

  try {
    const result = await collectAuthenticatedRepositories(ctx, { pattern: undefined, language: undefined, start: 1, max: 1 });

    assert.equal(calls.length, 1);
    assert.deepEqual(
      result.repositories.map((item) => item.full_name),
      ["owner/repo-1"],
    );
    assert.equal(result.searchedPages, 1);
    assert.equal(result.truncated, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("collectAuthenticatedRepositories keeps paging until pagination ends naturally", async () => {
  const pages = [
    Array.from({ length: 100 }, (_, index) => repo(index, { language: "JavaScript" })),
    [repo(101, { language: "TypeScript" })],
  ];
  const calls: string[] = [];
  globalThis.fetch = (async (input) => {
    const url = new URL(String(input));
    const page = Number(url.searchParams.get("page") ?? "1");
    calls.push(String(input));
    return jsonResponse(pages[page - 1] ?? []);
  }) as typeof fetch;

  try {
    const result = await collectAuthenticatedRepositories(ctx, { pattern: undefined, language: "typescript", start: 0, max: 2 });

    assert.equal(calls.length, 2);
    assert.deepEqual(
      result.repositories.map((item) => item.full_name),
      ["owner/repo-101"],
    );
    assert.equal(result.searchedPages, 2);
    assert.equal(result.truncated, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("matchesRepository filters pattern and language case-insensitively", () => {
  assert.equal(matchesRepository(repo(1, { full_name: "Owner/Useful-Tool" }), "useful", undefined), true);
  assert.equal(matchesRepository(repo(1, { description: "GraphQL Gateway" }), "gateway", undefined), true);
  assert.equal(matchesRepository(repo(1, { language: "TypeScript" }), undefined, "typescript"), true);
  assert.equal(matchesRepository(repo(1), "missing", undefined), false);
  assert.equal(matchesRepository(repo(1, { language: "TypeScript" }), undefined, "go"), false);
  assert.equal(matchesRepository(repo(1, { full_name: "Owner/Useful-Tool", language: "TypeScript" }), "useful", "go"), false);
});
