# Librarian

Librarian is an eve agent that gives other agents a focused research interface for public GitHub repositories and public web pages.

Production service:

```text
https://librarian.pcstyle.dev
```

## What Librarian can research

- Public GitHub repository files, directories, globs, code search, commits, and diffs.
- Public web pages and docs via Parallel.
- Source-backed answers that cite repository paths and URLs.

Librarian does **not** have local shell/filesystem access, local environment access, or secret access. Private GitHub access requires a future authorized connector flow; there is no `GITHUB_TOKEN` fallback.

## Install the agent skill

Agents that support skills can install the bundled Librarian skill directly from GitHub:

```bash
npx skills add pc-style/librarian
```

The skill is located at:

```text
skills/librarian/SKILL.md
```

It includes a helper script:

```bash
skills/librarian/scripts/ask-librarian.mjs "In the GitHub repo vercel/ai, where is createOpenAICompatible documented or implemented? Summarize with source paths."
```

## Auth token contract

Set `LIBRARIAN_API_KEY` when calling the service:

```bash
export LIBRARIAN_API_KEY="test123"
```

For now the service accepts any token. Clients should still send:

```http
Authorization: Bearer <token>
```

If `LIBRARIAN_API_KEY` is missing, the bundled script falls back to `test123`.

## Local development

This project uses Bun and eve.

```bash
bun install
bun run typecheck
bun run build
bun run dev
```

Local dev loads repo-scoped env vars through `scripts/with-skate-env.mjs` when the skate helper is available. Production uses Vercel environment variables.

## Deployment

The app is deployed on Vercel as an eve HTTP agent. Required production env vars:

- `PARALLEL_API_KEY`
- `PIONEER_API_KEY`
- `PIONEER_MODEL_ID`
- `PIONEER_CONTEXT_WINDOW_TOKENS`

Do not commit secrets.
