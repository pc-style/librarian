---
name: librarian
description: Access the public Librarian research service for source-backed answers about GitHub repositories and public web pages. Use this skill whenever the user asks you to research a GitHub repo, inspect public source files, search commit history, compare repository diffs, read public docs/pages, or answer questions that need concise citations from repo/web evidence. This is especially useful when you do not have direct network access, when you want a dedicated research subagent, or when the user mentions Librarian.
---

# Librarian

Use the hosted Librarian service to get fast, source-backed findings about GitHub repositories and public web pages.

Service domain: `https://librarian.pcstyle.dev`

## Authentication

Send an auth token on every request:

```http
Authorization: Bearer <token>
```

Use the environment variable `LIBRARIAN_API_KEY`. If it is not set, use `test123` for now:

```bash
export LIBRARIAN_API_KEY="test123"
```

The service currently accepts any token, but callers should already use the bearer-token contract so future auth can be enabled without changing clients.

## Quick usage

Prefer the bundled script when shell access is available:

```bash
skills/librarian/scripts/ask-librarian.mjs "In the GitHub repo vercel/ai, where is createOpenAICompatible documented or implemented? Summarize with source paths."
```

Or from inside this skill directory:

```bash
./scripts/ask-librarian.mjs "What is Amp's TypeScript SDK for? Use https://ampcode.com/manual/sdk/typescript"
```

The script reads `LIBRARIAN_API_KEY` and falls back to `test123`.

## When to use Librarian

Use Librarian for:

- Questions about public GitHub repositories: files, directories, symbols, docs, package setup, examples, tests, commits, and diffs.
- Public web research where the answer should cite pages or docs.
- Repo-plus-web questions, such as whether a public SDK can plausibly integrate into a public project.
- Requests where a user wants a direct answer with evidence, not a browsing transcript.

Do not use Librarian for:

- Local filesystem inspection. Librarian cannot see your local checkout.
- Secret or environment-variable inspection.
- Private GitHub data unless the deployed service has been configured with an authorized connector for that user/session.
- Tasks that require making changes to a repository; Librarian researches and answers.

## How to ask good questions

Include exact identifiers when possible:

- GitHub repo: `owner/repo` or a GitHub repository URL.
- File paths, symbols, package names, error strings, branch/ref names, or docs URLs.
- The answer shape you want: “summarize with source paths,” “return concise evidence,” “compare these two refs,” etc.

Good examples:

```text
In the GitHub repo charmbracelet/skate, what is the project and where are the CLI entrypoint or main command files? Give source-backed paths.
```

```text
What is Amp's TypeScript SDK for, and what are the main integration surfaces? Use these sources: https://ampcode.com/manual/sdk/typescript https://ampcode.com/manual/sdk https://ampcode.com/news/typescript-sdk
```

```text
In vercel/next.js, what files at the repository root indicate package manager and TypeScript setup? Return concise evidence.
```

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
