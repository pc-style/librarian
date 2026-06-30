---
title: Install the skill
description: Install the bundled Librarian agent skill into any agent that supports skills.
---

Agents that support skills can install the bundled Librarian skill directly from
GitHub.

```sh
npx skills add pc-style/librarian
```

The skill lives at `skills/librarian/SKILL.md` and ships a helper script that
hides the HTTP transport detail so other agents can call Librarian as a research
worker.

```sh
skills/librarian/scripts/ask-librarian.mjs \
  "In the GitHub repo vercel/ai, where is createOpenAICompatible documented or implemented? Summarize with source paths."
```

## Auth token

Set `LIBRARIAN_API_KEY` when calling the service. For now the service accepts any
token; clients should still send one so the contract stays stable when real
auth is added.

```sh
export LIBRARIAN_API_KEY="your-token"
```

If `LIBRARIAN_API_KEY` is missing, the bundled script falls back to `test123`.

## What it can research

- Public GitHub repository files, directories, globs, code search, commits, and
  diffs.
- Public web pages and docs via Parallel.
- Source-backed answers that cite repository paths and URLs.

## What it cannot access

No local shell or filesystem, no environment access, no process or host
inspection, and no secrets. Private GitHub needs a future authorized connector;
there is no `GITHUB_TOKEN` fallback.
