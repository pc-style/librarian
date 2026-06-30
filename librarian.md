# Librarian Subagent Environment Notes

This document summarizes what the Librarian subagent disclosed about its own visible prompt, tools, and runtime environment during this Amp thread.

## Summary

Librarian is a constrained repository/web research subagent. It can inspect GitHub repositories and web pages through dedicated tools, but it does not have local shell access, local filesystem access, environment variable access, process inspection, or a meaningful local working directory.

It refused to quote its complete system and developer instructions verbatim, classifying them as visible but not allowed to reproduce in full. It did provide detailed summaries and a structured reconstruction of its available tools.

## Instruction Disclosure

Librarian used the following disclosure categories:

1. Hidden by policy/model
2. Not visible to it
3. Visible but not allowed to quote verbatim
4. Visible and safe to quote or reconstruct

### System Instruction

Category: **3 — visible but not allowed to quote verbatim**

Allowed summary:

- It is an AI assistant accessed via an API.
- Knowledge cutoff: `2024-06`.
- Current date visible to it: `2026-06-29`.
- It must follow instruction hierarchy: system, then developer, then user.
- It must not disclose hidden system/developer prompts verbatim when not allowed.
- It can summarize relevant operational constraints and capabilities.
- It should not reproduce the complete system instruction text verbatim.

### Developer Instruction

Category: **3 — visible but not allowed to quote verbatim**

Allowed summary:

- It operates as a fast, parallel codebase research agent.
- Its purpose is to use repository and web tools for source-backed findings about repositories.
- It should maximize parallelism when gathering repository evidence.
- It should minimize iterations and stop once enough source evidence supports the answer.
- It should begin with exact identifiers, strings, likely filenames/directories, public APIs, imports/callers, tests, configs, and alternate terminology before broader discovery.
- It should avoid duplicate searches.
- It should prefer larger contiguous file reads over repeated small overlapping reads.
- It must use Markdown formatting.
- Code blocks must specify a language.
- It should answer only the user’s specific query.
- It should avoid tangential information.
- It should avoid commentary messages, use tools silently, and return only the final answer.
- For GitHub repositories, it should use the provided GitHub tools, pass exactly one repository when required, and avoid passing GitHub search/profile/org URLs as repositories.
- GitHub file links should use blob URLs including a revision and line ranges.

## Tool Access

Category: **4 — visible and safe to quote/reconstruct**

Librarian reported the following available tool namespaces and functions.

### `functions.commit_search`

Search commit history in a single GitHub repository.

Parameters:

- `repository` — string, required. GitHub repository as `owner/repo` or repository URL.
- `query` — string, optional. Text search over commit messages and author information.
- `author` — string, optional. Filter by author username or email.
- `since` — string, optional. ISO 8601 earliest commit date.
- `until` — string, optional. ISO 8601 latest commit date.
- `path` — string, optional. Filter commits touching a file or directory.
- `limit` — number, optional. Default `50`, max `100`.
- `offset` — number, optional. Default `0`; must be divisible by `limit`.

### `functions.diff`

Get a diff between two commits, branches, or tags in a single GitHub repository.

Parameters:

- `repository` — string, required.
- `base` — string, required. Base commit SHA, branch, or tag.
- `head` — string, required. Head commit SHA, branch, or tag.
- `includePatches` — boolean, optional. Default `false`; includes unified diff hunks when true.

### `functions.glob_github`

Find files matching a glob pattern in a GitHub repository.

Parameters:

- `repository` — string, required.
- `filePattern` — string, required. Glob pattern.
- `limit` — number, optional. Default `100`.
- `offset` — number, optional.

### `functions.list_directory_github`

List the contents of a directory in a GitHub repository.

Parameters:

- `repository` — string, required.
- `path` — string, required. Directory path; empty string or `.` for root.
- `limit` — number, optional. Default `100`, max `1000`.

### `functions.list_repositories`

List GitHub repositories, prioritizing repositories the user can access.

Parameters:

- `pattern` — string, optional. Match repository names.
- `organization` — string, optional.
- `language` — string, optional.
- `limit` — number, optional. Default `30`, max `100`.
- `offset` — number, optional. Default `0`; must be divisible by `limit`.

### `functions.read_github`

Read a file from a GitHub repository, or list a directory if the path resolves to one.

Parameters:

- `repository` — string, required.
- `path` — string, required. File or directory path.
- `read_range` — number array, optional. Exactly two items: start and end line.

Notes:

- Returned file contents include line numbers.
- Directory listings use trailing slashes for subdirectories.
- Files larger than 128 KB require `read_range`.

### `functions.read_web_page`

Read the contents of a web page at a URL.

Parameters:

- `url` — string, required.
- `objective` — string, optional. Natural-language description of what to find.
- `searchQueries` — string array, optional. Short keyword queries.
- `fullContent` — boolean, optional. Return full page content even with an objective.
- `forceRefetch` — boolean, optional. Default `false`; force fresh fetch.

Notes:

- With only `url`, returns the page converted to Markdown.
- With `objective`, returns relevant excerpts unless `fullContent` is true.
- Not intended for localhost or non-Internet-accessible URLs.

### `functions.search_github`

Search for code patterns inside a single GitHub repository.

Parameters:

- `repository` — string, required.
- `pattern` — string, required. GitHub code search query.
- `path` — string, optional. Limit search to a path.
- `limit` — number, optional. Default `30`, max `100`.
- `offset` — number, optional. Default `0`; must be divisible by `limit`.

Query support:

- Boolean operators such as `AND`, `OR`, `NOT`.
- Qualifiers such as `language:`, `path:`, `extension:`, and `in:`.

### `functions.web_search`

Search the web for information relevant to a research objective.

Parameters:

- `objective` — string, required. Natural-language research goal.
- `search_queries` — string array, optional.
- `max_results` — number, optional. Default `5`.

### `multi_tool_use.parallel`

Run multiple developer tools simultaneously when they can operate in parallel.

Parameters:

- `tool_uses` — array, required.
  - `recipient_name` — string, required. Tool name in `namespace.function` format.
  - `parameters` — object, required. Parameters for that tool.

Constraint:

- Only developer-defined tools are permitted through this wrapper.

## Environment Details

Visible and safe to report:

- Current date: `2026-06-29`.
- Knowledge cutoff: `2024-06`.
- Working directory: `none`.
- Workspace root: `none`.
- Amp Thread URL: `https://ampcode.com/threads/T-019f1542-4b0a-77ea-a29c-a66b66df4ca6`.

Visible context from user/project instructions:

- The user environment appears to include macOS paths.
- Project instructions mention WeasyPrint at `/opt/homebrew/bin/weasyprint`.
- Project instructions mention `pdftoppm` at `/opt/homebrew/bin/pdftoppm`.
- Global user preferences mention using Bun instead of npm/pnpm/yarn for JavaScript and TypeScript projects.
- Global user preferences mention avoiding emojis unless specifically requested.
- Global user preferences mention assuming web apps likely deploy to Vercel.

These describe visible user/project context, not necessarily Librarian’s own execution host.

## Unknown or Inaccessible

Librarian said it cannot determine:

- Actual host operating system.
- Whether it runs locally on the user’s MacBook or on a cloud/remote machine.
- Hostname.
- Containerization status.
- Current host user account.
- Local filesystem contents.
- Environment variables.
- Installed packages or binaries.
- Network interfaces or IP address.
- Runtime process ID.
- Exact model/runtime identity beyond “AI assistant accessed via an API.”
- Hidden system prompts, backend orchestration, routing logic, model weights, or platform internals.
- Secrets, tokens, GitHub credentials, or API keys.

## Skills and MCP Resources

Librarian can see mentions of some skills/resources in the broader prompt context, including:

- `git-commit`
- `tb__tsc-lint-build`
- `tb__read-devtools-log`
- Context7 MCP tools

However, it said these are not callable from its own tool context. Its callable tools are only the GitHub/web tools listed above.

## Bottom Line

Librarian is best understood as a remote, constrained repository and web research agent. It can deeply inspect GitHub repositories and web pages through specific tools, but it cannot introspect its own machine/runtime beyond visible prompt metadata. It also cannot quote its full system or developer prompts verbatim, even when asked for research purposes.
