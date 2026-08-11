# GitHub Skill Pack Rate-limit Fallback Design

**Date:** 2026-08-11

**Status:** Approved in conversation

## Context

MangaForge installs a public GitHub Skill Pack by first calling GitHub's REST
`commits/HEAD` endpoint, reading a 40-character commit SHA, and then downloading
the archive for that fixed revision from `codeload.github.com`. This preserves a
stable installed revision, but anonymous GitHub REST requests share a limit of
60 requests per hour per public IP.

The observed failure is a reproducible `403` with
`X-RateLimit-Remaining: 0`. The repository URL is valid and its archive remains
downloadable, so rejecting the installation at this point is an avoidable
dependency on the anonymous REST quota.

## Goals

- Install public GitHub Skill Packs without requiring a GitHub token.
- Preserve immutable 40-character commit SHA pinning.
- Recover automatically when the REST HEAD lookup returns `403` or `429`.
- Keep all existing archive, extraction, path, symlink, size, and atomicity
  protections unchanged.
- Keep the change within the Canvas Skill Pack installer; do not affect the
  novel workspace or add general Git tooling.

## Non-goals

- Supporting private GitHub repositories or GitHub authentication.
- Accepting branches, tags, tree URLs, arbitrary archive URLs, or non-GitHub
  hosts from the user.
- Retrying unrelated REST failures such as a missing repository response.
- Invoking a local `git` executable.

## Chosen Approach

Keep the REST `commits/HEAD` lookup as the primary resolver. When it returns
`403` or `429`, request the repository's official web archive endpoint:

```text
https://github.com/<owner>/<repo>/archive/HEAD.zip
```

The request uses `HEAD` and manual redirect handling. GitHub resolves HEAD and
returns a redirect whose location contains the immutable commit SHA:

```text
https://codeload.github.com/<owner>/<repo>/zip/<40-character-sha>
```

The installer validates the redirect instead of following it automatically.
Only a `301`, `302`, `307`, or `308` response with an HTTPS URL on
`codeload.github.com`, no credentials, port, query, or fragment, and the exact
owner/repository/path shape above is accepted. The owner and repository
components must match the already validated source URL using GitHub's
ASCII-case-insensitive name semantics, and the final component must be a
hexadecimal 40-character SHA.

After resolution, the existing fixed-revision codeload download path is used.
No mutable `HEAD` archive is installed directly.

Rejected alternatives:

- `git ls-remote` avoids REST limits but adds a dependency on an installed Git
  executable and complicates packaged cross-platform behavior.
- Requiring a GitHub token increases quota but adds secrets, settings, and user
  configuration for a public-repository workflow.
- Downloading `codeload/.../zip/HEAD` directly loses the immutable revision
  identity required for idempotence and audit metadata.

## Data Flow

1. Parse and canonicalize the public GitHub repository URL as today.
2. Request the REST `commits/HEAD` endpoint.
3. If successful, validate and use its SHA exactly as today.
4. If the response status is `403` or `429`, request the official archive HEAD
   endpoint with redirects disabled.
5. Validate the redirect location against the exact codeload contract and
   extract the SHA.
6. Download the archive for that SHA, apply all existing byte and extraction
   limits, and atomically install only its `skills/` payload.
7. Record the canonical repository URL and resolved SHA in `pack.json`.

## Error Behavior

- REST statuses other than `403` and `429` retain the existing typed download
  failure behavior.
- A network failure during the REST request remains a download failure; it does
  not silently switch hosts.
- A fallback response without an allowed redirect status or `Location`
  header fails with `SKILL_PACK_DOWNLOAD_FAILED`.
- A redirect to another host, repository, path shape, or non-SHA revision is
  rejected with `SKILL_PACK_DOWNLOAD_FAILED` before any redirected request.
- Archive download and validation errors keep their existing typed codes.

The error detail should identify whether REST resolution or the rate-limit
fallback failed without exposing local paths or response bodies.

## Security

- User input remains restricted to public `https://github.com/<owner>/<repo>`
  repository roots.
- Redirect following is manual, so the fallback cannot become an SSRF primitive.
- The location is parsed as a URL and compared component by component; string
  prefix matching is insufficient.
- Only the already validated owner and repository are accepted in the codeload
  path.
- No credentials or GitHub token are introduced.
- Existing original ZIP filename validation, traversal rejection, symlink
  rejection, compressed/archive size limits, selected `skills/` extraction,
  and atomic rename behavior remain authoritative.

## Testing Strategy

Implementation follows a RED/GREEN TDD cycle.

Installer tests cover:

- REST `403` resolves through a valid archive redirect and installs the fixed
  SHA revision.
- REST `429` uses the same fallback.
- A valid primary REST response does not call the fallback.
- REST failures other than `403`/`429` do not call the fallback.
- Missing, malformed, cross-host, credentialed, queried, mismatched-repository,
  and non-SHA redirect locations fail before archive download.
- Existing concurrent install, archive limit, traversal, symlink, and
  skills-only extraction tests remain green.

Acceptance verification includes a real MiniMax-H3 installation while the
current public IP has `X-RateLimit-Remaining: 0`, registry discovery of all nine
Skills including `h3-prompt-writing`, focused and broader server tests, Server
and Web builds, refactor-boundary checks, and an independent security review.

## Acceptance Criteria

- Installing `https://github.com/MiniMax-AI/MiniMax-H3` succeeds without a
  GitHub token when the anonymous REST limit is exhausted.
- The installed Pack revision is the exact 40-character SHA returned by the
  validated GitHub archive redirect.
- No arbitrary redirect is followed.
- Existing installation safety limits and Skill discovery behavior are
  unchanged.
- No novel workspace code or runtime path is modified.
