# Librarian

Librarian is an eve agent that gives other agents a focused research interface for public GitHub repositories and public web pages.

Production service:

```text
https://librarian.pcstyle.dev
```

## Amp compatibility target

This service is modeled after Amp's built-in `librarian` subagent surface described in the reverse-engineered notes. In Amp, the top-level caller invokes:

```ts
librarian({ query: string })
```

This eve service maps the same research task to the HTTP session message:

```json
{ "message": "<query>" }
```

The bundled skill and script hide that transport detail so other agents can call Librarian as a research worker.

The original Amp client binary exposes tool names and UI/action metadata, but not the server-side Librarian prompt text. This app recreates the documented behavior and tool surface rather than claiming to contain Amp's original private prompt.

## Tool surface

The app exposes the same repository and web research tool names identified for Amp's Librarian:

- GitHub read/search/list/diff tools:
  - `read_github`
  - `search_github`
  - `commit_search`
  - `list_directory_github`
  - `list_repositories`
  - `glob_github`
  - `diff`
- Web tools:
  - `web_search`
  - `read_web_page`

These tools are used internally by the eve agent. Public callers normally send a natural-language query through the session API or the installed skill.

## What Librarian can research

- Public GitHub repository files, directories, globs, code search, commits, and diffs.
- Public web pages and docs via Parallel.
- Source-backed answers that cite repository paths and URLs.

Librarian does **not** have local shell/filesystem access, local environment access, process inspection, host inspection, or secret access. Private GitHub access requires an authenticated eve session and a configured Vercel Connect GitHub connector; there is no `GITHUB_TOKEN` fallback.

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

## API contract

The script uses eve's HTTP session API:

1. `POST /eve/v1/session` with JSON `{ "message": "..." }`.
2. Read `sessionId` from the response.
3. `GET /eve/v1/session/:sessionId/stream` and collect `message.completed` events.

Set these headers:

```http
Content-Type: application/json
Authorization: Bearer ${LIBRARIAN_API_KEY:-test123}
```

If implementing your own client, stream events are newline-delimited JSON. Return the last completed assistant message as Librarian's answer.

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
- `EVE_MODEL` (optional, defaults to `zai/glm-5.2-fast` in `agent/agent.ts`)
- `EVE_CONTEXT_WINDOW_TOKENS` (optional override)

Vercel-hosted model calls use Vercel AI Gateway via project OIDC. Set `AI_GATEWAY_API_KEY` only when testing Gateway-routed models outside Vercel.

Do not commit secrets.
