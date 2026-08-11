# GitHub Skill Pack Rate-limit Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make public GitHub Skill Pack installation recover from anonymous REST `403`/`429` rate limits without a token while preserving immutable SHA pinning and existing archive security.

**Architecture:** Keep the GitHub REST `commits/HEAD` endpoint as the primary revision resolver. Add one strict parser for GitHub's official archive redirect and call that fallback only after a `403` or `429`; then reuse the existing SHA-pinned codeload download and atomic skills-only extraction path.

**Tech Stack:** TypeScript, Bun, Hono server modules, JSZip, Bun test, Fetch `Response` API.

---

## File Structure

- Modify `ui/server/src/skills/pack-installer.ts`: add strict archive-redirect parsing and rate-limit-aware revision resolution; leave archive extraction and local Pack installation unchanged.
- Modify `ui/server/src/skills/pack-installer.test.ts`: add parser security tests, `403`/`429` fallback integration tests, and non-rate-limit behavior assertions.
- Reference `docs/superpowers/specs/2026-08-11-github-skill-pack-rate-limit-fallback-design.md`: approved behavior and security contract; no implementation edits expected.

### Task 1: Strict GitHub Archive Redirect Parser

**Files:**
- Modify: `ui/server/src/skills/pack-installer.ts:61-86`
- Test: `ui/server/src/skills/pack-installer.test.ts:7-43`

- [ ] **Step 1: Write failing parser tests**

Add `parseGitHubArchiveRedirect` to the import list and test one valid canonical redirect, one valid case-normalized redirect, and a table of invalid locations:

```ts
import {
  installGitHubSkillPack,
  installLocalSkillPack,
  parseGitHubArchiveRedirect,
  parsePublicGitHubUrl,
  readPackRecord,
} from './pack-installer'

test('accepts only an exact GitHub codeload redirect for the requested repository', () => {
  const repo = parsePublicGitHubUrl('https://github.com/minimax-ai/minimax-h3')
  const sha = 'fa6891ff7cdaaa03fa4497e89ac64ff169219acf'

  expect(parseGitHubArchiveRedirect(
    `https://codeload.github.com/MiniMax-AI/MiniMax-H3/zip/${sha}`,
    repo,
  )).toBe(sha)

  for (const location of [
    `http://codeload.github.com/MiniMax-AI/MiniMax-H3/zip/${sha}`,
    `https://evil.example/MiniMax-AI/MiniMax-H3/zip/${sha}`,
    `https://user@codeload.github.com/MiniMax-AI/MiniMax-H3/zip/${sha}`,
    `https://codeload.github.com:444/MiniMax-AI/MiniMax-H3/zip/${sha}`,
    `https://codeload.github.com/MiniMax-AI/MiniMax-H3/zip/${sha}?download=1`,
    `https://codeload.github.com/MiniMax-AI/MiniMax-H3/zip/${sha}#fragment`,
    `https://codeload.github.com/other/MiniMax-H3/zip/${sha}`,
    `https://codeload.github.com/MiniMax-AI/other/zip/${sha}`,
    'https://codeload.github.com/MiniMax-AI/MiniMax-H3/zip/HEAD',
    'https://codeload.github.com/MiniMax-AI/MiniMax-H3/tar/fa6891ff7cdaaa03fa4497e89ac64ff169219acf',
    '/MiniMax-AI/MiniMax-H3/zip/fa6891ff7cdaaa03fa4497e89ac64ff169219acf',
  ]) {
    expect(() => parseGitHubArchiveRedirect(location, repo)).toThrow(
      expect.objectContaining({ code: 'SKILL_PACK_DOWNLOAD_FAILED' }),
    )
  }
})
```

- [ ] **Step 2: Run the parser test and verify RED**

Run:

```bash
cd ui/server
bun test src/skills/pack-installer.test.ts --test-name-pattern 'exact GitHub codeload redirect'
```

Expected: FAIL because `parseGitHubArchiveRedirect` is not exported.

- [ ] **Step 3: Implement the strict parser**

Add the function next to `parsePublicGitHubUrl`:

```ts
export function parseGitHubArchiveRedirect(location: string, repo: PublicGitHubRepo): string {
  let url: URL
  try { url = new URL(location) } catch (error) {
    throw new SkillPackInstallError(
      'SKILL_PACK_DOWNLOAD_FAILED',
      'GitHub archive fallback returned an invalid redirect URL',
      error,
    )
  }
  const parts = url.pathname.split('/')
  const valid =
    url.protocol === 'https:' &&
    url.hostname === 'codeload.github.com' &&
    !url.port && !url.search && !url.hash && !url.username && !url.password &&
    parts.length === 5 && parts[0] === '' && parts[3] === 'zip' &&
    parts[1].toLowerCase() === repo.owner.toLowerCase() &&
    parts[2].toLowerCase() === repo.repo.toLowerCase() &&
    /^[0-9a-f]{40}$/i.test(parts[4])
  if (!valid) {
    throw new SkillPackInstallError(
      'SKILL_PACK_DOWNLOAD_FAILED',
      'GitHub archive fallback returned an untrusted redirect',
    )
  }
  return parts[4]
}
```

- [ ] **Step 4: Run the parser test and verify GREEN**

Run:

```bash
cd ui/server
bun test src/skills/pack-installer.test.ts --test-name-pattern 'exact GitHub codeload redirect'
```

Expected: `1 pass`, `0 fail`.

- [ ] **Step 5: Commit the parser contract**

```bash
git add ui/server/src/skills/pack-installer.ts ui/server/src/skills/pack-installer.test.ts
git commit -m "test: define GitHub archive redirect contract"
```

### Task 2: REST Rate-limit Fallback Resolution

**Files:**
- Modify: `ui/server/src/skills/pack-installer.ts:330-354`
- Test: `ui/server/src/skills/pack-installer.test.ts:45-120`

- [ ] **Step 1: Write the failing `403`/`429` fallback tests**

Add a parameterized installer test that observes request URLs and fetch options:

```ts
test.each([403, 429])('falls back to the GitHub archive redirect after REST status %d', async (status) => {
  const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
  const sha = 'fa6891ff7cdaaa03fa4497e89ac64ff169219acf'
  const archive = await zipBytes([
    { name: `demo-${sha}/skills/demo/SKILL.md`, content: '---\nname: demo\n---\nprompt' },
  ])
  const calls: Array<{ url: string; method?: string; redirect?: RequestRedirect }> = []
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, method: init?.method, redirect: init?.redirect })
    if (url.endsWith('/commits/HEAD')) return response({}, status)
    if (url === 'https://github.com/acme/demo/archive/HEAD.zip') {
      return new Response(null, {
        status: 302,
        headers: { location: `https://codeload.github.com/acme/demo/zip/${sha}` },
      })
    }
    if (url === `https://codeload.github.com/acme/demo/zip/${sha}`) return new Response(archive)
    return response({}, 404)
  }

  const result = await installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl })

  expect(result.revision).toBe(sha)
  expect(await readFile(join(result.path, 'skills/demo/SKILL.md'), 'utf8')).toContain('name: demo')
  expect(calls).toEqual([
    { url: 'https://api.github.com/repos/acme/demo/commits/HEAD', method: undefined, redirect: undefined },
    { url: 'https://github.com/acme/demo/archive/HEAD.zip', method: 'HEAD', redirect: 'manual' },
    { url: `https://codeload.github.com/acme/demo/zip/${sha}`, method: undefined, redirect: undefined },
  ])
})
```

Add failure-path assertions before production changes:

```ts
test('does not use the archive fallback for non-rate-limit REST failures', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
  const calls: string[] = []
  const fetchImpl = async (input: RequestInfo | URL) => {
    calls.push(String(input))
    return response({}, 404)
  }
  await expect(installGitHubSkillPack('https://github.com/acme/missing', { workspace, fetchImpl })).rejects.toThrow(
    expect.objectContaining({ code: 'SKILL_PACK_DOWNLOAD_FAILED' }),
  )
  expect(calls).toEqual(['https://api.github.com/repos/acme/missing/commits/HEAD'])
})

test('rejects an invalid or missing GitHub archive fallback redirect', async () => {
  for (const fallback of [
    new Response(null, { status: 200 }),
    new Response(null, { status: 302 }),
    new Response(null, { status: 302, headers: { location: 'https://evil.example/archive.zip' } }),
  ]) {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const fetchImpl = async (input: RequestInfo | URL) => String(input).endsWith('/commits/HEAD')
      ? response({}, 403)
      : fallback
    await expect(installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_PACK_DOWNLOAD_FAILED' }),
    )
  }
})
```

- [ ] **Step 2: Run fallback tests and verify RED**

Run:

```bash
cd ui/server
bun test src/skills/pack-installer.test.ts --test-name-pattern 'falls back to the GitHub archive redirect'
```

Expected: both cases FAIL with `GitHub HEAD request failed: 403` / `429`, proving the current user-visible failure is covered.

- [ ] **Step 3: Extract revision resolution and add the fallback**

Add constants and helpers near the GitHub parser functions:

```ts
const GITHUB_REDIRECT_STATUSES = new Set([301, 302, 307, 308])

async function resolveGitHubRevision(repo: PublicGitHubRepo, fetchImpl: typeof fetch): Promise<string> {
  const headUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/commits/HEAD`
  let headResponse: Response
  try {
    headResponse = await fetchImpl(headUrl, { headers: { accept: 'application/vnd.github+json' } })
  } catch (error) {
    throw new SkillPackInstallError('SKILL_PACK_DOWNLOAD_FAILED', `Unable to fetch ${headUrl}`, error)
  }

  if (headResponse.ok) {
    try {
      const head = await headResponse.json() as { sha?: unknown }
      if (typeof head.sha !== 'string' || !/^[0-9a-f]{40}$/i.test(head.sha)) throw new Error('missing sha')
      return head.sha
    } catch (error) {
      throw new SkillPackInstallError(
        'SKILL_PACK_DOWNLOAD_FAILED',
        'GitHub HEAD response did not contain a valid commit SHA',
        error,
      )
    }
  }

  if (headResponse.status !== 403 && headResponse.status !== 429) {
    throw new SkillPackInstallError(
      'SKILL_PACK_DOWNLOAD_FAILED',
      `GitHub HEAD request failed: ${headResponse.status}`,
    )
  }

  const fallbackUrl = `https://github.com/${repo.owner}/${repo.repo}/archive/HEAD.zip`
  let fallbackResponse: Response
  try {
    fallbackResponse = await fetchImpl(fallbackUrl, { method: 'HEAD', redirect: 'manual' })
  } catch (error) {
    throw new SkillPackInstallError(
      'SKILL_PACK_DOWNLOAD_FAILED',
      `Unable to resolve GitHub archive HEAD for ${repo.owner}/${repo.repo}`,
      error,
    )
  }
  if (!GITHUB_REDIRECT_STATUSES.has(fallbackResponse.status)) {
    throw new SkillPackInstallError(
      'SKILL_PACK_DOWNLOAD_FAILED',
      `GitHub archive fallback failed: ${fallbackResponse.status}`,
    )
  }
  const location = fallbackResponse.headers.get('location')
  if (!location) {
    throw new SkillPackInstallError(
      'SKILL_PACK_DOWNLOAD_FAILED',
      'GitHub archive fallback did not return a redirect location',
    )
  }
  return parseGitHubArchiveRedirect(location, repo)
}
```

Replace the inline REST resolution block in `installGitHubSkillPack` with:

```ts
const revision = await resolveGitHubRevision(repo, fetchImpl)
```

Do not change the fixed-SHA `archiveUrl`, `readExisting`, `extractArchive`, or
atomic rename logic.

- [ ] **Step 4: Run the entire installer suite and verify GREEN**

Run:

```bash
cd ui/server
bun test src/skills/pack-installer.test.ts
```

Expected: all installer tests pass with `0 fail`; the exact count increases by
the parser, parameterized fallback, and failure-path cases.

- [ ] **Step 5: Commit the rate-limit fallback**

```bash
git add ui/server/src/skills/pack-installer.ts ui/server/src/skills/pack-installer.test.ts
git commit -m "fix: bypass GitHub Skill Pack API rate limits"
```

### Task 3: Real Rate-limited MiniMax Acceptance and Regression Verification

**Files:**
- Verify: `ui/server/src/skills/pack-installer.ts`
- Verify: `ui/server/src/skills/pack-installer.test.ts`

- [ ] **Step 1: Confirm the external precondition**

Run:

```bash
curl -sS -D - -o /dev/null \
  -H 'Accept: application/vnd.github+json' \
  -H 'User-Agent: MangaForge-Studio' \
  https://api.github.com/repos/MiniMax-AI/MiniMax-H3/commits/HEAD
```

Expected in the current reproduction environment: HTTP `403` and
`x-ratelimit-remaining: 0`. If the quota has reset, use a test-only `fetchImpl`
that returns `403` for only the REST URL while performing real network requests
for the GitHub archive redirect and codeload URL.

- [ ] **Step 2: Install MiniMax-H3 in a temporary workspace through the real fallback**

From `ui/server`, run a Bun one-off script that:

```ts
import { access, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { installGitHubSkillPack } from './src/skills/pack-installer'
import { createSkillRegistry } from './src/skills/registry'

const workspace = await mkdtemp(join(tmpdir(), 'mf-minimax-rate-limit-'))
try {
  const result = await installGitHubSkillPack(
    'https://github.com/MiniMax-AI/MiniMax-H3',
    { workspace },
  )
  const skills = await createSkillRegistry(workspace).list({ includeBuiltins: false })
  await access(join(result.path, 'skills/h3-prompt-writing/SKILL.md'))
  if (skills.length !== 9) throw new Error(`Expected 9 Skills, received ${skills.length}`)
  console.log(JSON.stringify({ revision: result.revision, skillCount: skills.length }))
} finally {
  await rm(workspace, { recursive: true, force: true })
}
```

Expected: exit `0`, a 40-character revision, and `skillCount: 9`. The temporary
workspace is deleted in `finally`; no real MangaForge workspace is modified.

- [ ] **Step 3: Run focused and broader server regression suites**

Run:

```bash
cd ui/server
bun test src/skills src/routes/skills.test.ts
bun test src/routes/providers.test.ts src/routes/generate.test.ts src/llm/provider-runtime*.test.ts
```

Expected: both commands exit `0` with `0 fail`.

- [ ] **Step 4: Run production builds and boundary checks**

Run from the repository root:

```bash
bun run check:refactor-boundaries
bun run build:server
bun run build:web
git diff --check
```

Expected: every command exits `0`. Existing Vite chunk-size or mixed-import
warnings are non-blocking if no new warning is introduced by these server-only
changes.

- [ ] **Step 5: Perform an independent security review**

Request review of the complete diff against the approved design. The reviewer
must specifically inspect:

- fallback occurs only for `403`/`429`;
- redirects are manual and never automatically followed;
- protocol, host, credentials, port, query, fragment, owner, repository,
  archive type, and 40-character SHA are all validated;
- archive security and skills-only extraction remain unchanged;
- no user workspace or novel path is modified.

Expected: no unresolved Critical or Important finding.

- [ ] **Step 6: Commit any review correction separately, then verify the final tree**

If review finds an actionable issue, first add a failing regression test, run it
to observe RED, apply the minimal correction, and rerun Steps 3-4. Commit that
focused correction separately.

Run:

```bash
git status --short --branch
git log -3 --oneline
```

Expected: the feature branch is clean, includes the design/plan and focused
implementation commits, and contains no change to `workspace/assets.json`.
