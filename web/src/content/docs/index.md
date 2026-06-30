---
title: Librarian
description: An eve research agent that gives other agents a focused interface for public GitHub repositories and public web pages.
template: splash
hero:
  tagline: A focused research worker for public repositories and the web.
  actions:
    - text: Read the API
      link: /reference/api/
      variant: primary
      icon: right-arrow
    - text: Install the skill
      link: /install/
      variant: minimal
    - text: View source
      link: https://github.com/pc-style/librarian
      variant: minimal
      icon: external
---

Librarian is an eve agent that gives other agents a single, narrow surface for
inspecting GitHub repositories and reading public pages, then returning
source-backed answers.

It is modeled after Amp's built-in `librarian` subagent. The top-level caller
invokes a research task as a natural-language query, and Librarian uses its
repository and web tools in parallel, then converges on a final answer that
cites repository paths and URLs.

## How it works

1. **Post a query.** A single message to `/eve/v1/session` starts a research
   turn.
2. **Parallel research.** GitHub read, search, glob, diff, and web tools run
   together, then converge.
3. **Cited answer.** The final assistant message cites repository paths and
   page URLs.

## Tool surface

Librarian exposes the same repository and web research tool names identified
for Amp's Librarian.

- **GitHub**: `read_github`, `search_github`, `commit_search`,
  `glob_github`, `list_directory_github`, `list_repositories`, `diff`
- **Web**: `web_search`, `read_web_page`

These tools run inside the eve agent. Public callers normally send a
natural-language query through the session API or the installed skill, and let
the agent choose which tools to use.

## Different by constraint

Librarian has no local shell, no filesystem, no environment access, no process
or host inspection, and no secrets. Private GitHub requires a future authorized
connector flow; there is no `GITHUB_TOKEN` fallback. The constraint is the
point: a narrow, auditable research worker.

> The original Amp client binary exposes tool names and UI metadata, but not the
> server-side Librarian prompt text. This service recreates the documented
> behavior and tool surface rather than claiming to contain Amp's private
> prompt.
