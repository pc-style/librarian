---
title: Tool surface
description: Librarian maps the documented Amp librarian tool surface onto these repository and web primitives.
---

Librarian maps the documented Amp librarian tool surface onto these repository
and web primitives. Tools run inside the eve agent; public callers send a
natural-language query and let the agent choose which tools to use.

## GitHub

### `read_github`

Read a file from a GitHub repository, or list a directory if the path resolves
to one.

- `repository` (string, required). `owner/repo` or repository URL.
- `path` (string, required). File or directory path.
- `read_range` ([number, number], optional). Start and end line. Required for
  files over 128 KB.

Returned file contents include line numbers. Directory listings use trailing
slashes for subdirectories.

### `search_github`

Search for code patterns inside a single GitHub repository.

- `repository` (string, required).
- `pattern` (string, required). GitHub code search query.
- `path` (string, optional). Limit search to a path.
- `limit` (number, optional). Default 30, max 100.

Supports boolean operators (`AND`, `OR`, `NOT`) and qualifiers (`language:`,
`path:`, `extension:`, `in:`).

### `commit_search`

Search commit history in a single GitHub repository.

- `repository` (string, required).
- `query` (string, optional). Search commit messages and author info.
- `author` (string, optional). Filter by username or email.
- `since` / `until` (ISO 8601, optional). Date bounds.
- `path` (string, optional). Filter by file or directory.
- `limit` (number, optional). Default 50, max 100.

### `glob_github`

Find files matching a glob pattern in a GitHub repository.

- `repository` (string, required).
- `filePattern` (string, required). Glob pattern.
- `limit` (number, optional). Default 100.

### `list_directory_github`

List the contents of a directory in a GitHub repository.

- `repository` (string, required).
- `path` (string, required). Empty string or `.` for root.
- `limit` (number, optional). Default 100, max 1000.

### `list_repositories`

List GitHub repositories, prioritizing repositories the caller can access.

- `pattern` (string, optional). Match repository names.
- `organization` (string, optional).
- `language` (string, optional).
- `limit` (number, optional). Default 30, max 100.

### `diff`

Get a diff between two commits, branches, or tags in a single repository.

- `repository` (string, required).
- `base` (string, required). Commit SHA, branch, or tag.
- `head` (string, required). Commit SHA, branch, or tag.
- `includePatches` (boolean, optional). Default `false`; includes unified diff
  hunks when true.

## Web

### `web_search`

Search the web for information relevant to a research objective.

- `objective` (string, required). Natural-language research goal.
- `search_queries` (string[], optional). Short keyword queries.
- `max_results` (number, optional). Default 5.

### `read_web_page`

Read the contents of a web page at a URL.

- `url` (string, required).
- `objective` (string, optional). Returns relevant excerpts if set.
- `searchQueries` (string[], optional).
- `fullContent` (boolean, optional). Return full page content even with an
  objective.
- `forceRefetch` (boolean, optional). Default `false`; force a fresh fetch.

With only a `url`, returns the page converted to Markdown. With an
`objective`, returns relevant excerpts unless `fullContent` is true. Not
intended for localhost or non-public URLs.

## What it cannot do

No local shell, no filesystem, no environment access, no process or host
inspection, and no secrets. Private GitHub requires a future authorized
connector flow; there is no `GITHUB_TOKEN` fallback. The boundary keeps the
worker narrow and auditable.
