import { expect, test } from 'bun:test'
import JSZip from 'jszip'
import { access, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { installOhStoryCoreSuite } from './install'
import { loadOhStoryCoreSuite, ohStoryCoreRoot } from './store'
import { OH_STORY_CORE_SOURCE_URL } from './types'

const SHA_A = '0123456789abcdef0123456789abcdef01234567'
const SHA_B = 'fedcba9876543210fedcba9876543210fedcba98'
const NOW_A = '2026-08-14T12:00:00.000Z'
const NOW_B = '2026-08-14T13:00:00.000Z'

async function zipBytes(entries: Array<{ name: string; content?: string; unixPermissions?: number }>) {
  const zip = new JSZip()
  for (const entry of entries) {
    zip.file(entry.name, entry.content ?? '', entry.unixPermissions !== undefined
      ? { unixPermissions: entry.unixPermissions, createFolders: false }
      : { createFolders: false })
  }
  return zip.generateAsync({ type: 'uint8array', platform: 'UNIX' })
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function githubFetch(archives: Record<string, Uint8Array>, sha: string, calls: string[] = []) {
  return async (input: RequestInfo | URL) => {
    const url = String(input)
    calls.push(url)
    if (url.endsWith('/commits/HEAD')) return jsonResponse({ sha })
    const archive = archives[url]
    if (archive) return new Response(archive)
    return jsonResponse({}, 404)
  }
}

function archiveUrl(sha: string) {
  return `https://codeload.github.com/worldwonderer/oh-story-claudecode/zip/${sha}`
}

function coreArchive(prefix: string, reviewBody = '# story-review') {
  return zipBytes([
    { name: `${prefix}/skills/story-review/SKILL.md`, content: reviewBody },
    { name: `${prefix}/skills/story-deslop/SKILL.md`, content: '# story-deslop' },
    { name: `${prefix}/skills/story-long-write/SKILL.md`, content: '# story-long-write' },
    { name: `${prefix}/skills/story-review/references/quality-checklist.md`, content: '开头有钩子' },
    { name: `${prefix}/skills/story-review/scripts/run.sh`, content: 'echo should-not-extract' },
    { name: `${prefix}/skills/story-deslop/scripts/check-ai-patterns.js`, content: 'module.exports = 1' },
    { name: `${prefix}/skills/story-deslop/scripts/check-degeneration.js`, content: 'module.exports = 2' },
    { name: `${prefix}/skills/story-deslop/scripts/normalize-punctuation.js`, content: 'module.exports = 3' },
    { name: `${prefix}/skills/story-setup/SKILL.md`, content: '# setup\n\nagents_version: 25\n' },
    { name: `${prefix}/skills/story-setup/references/codex/agents/story-architect.toml`, content: 'name = "story-architect"\n' },
    { name: `${prefix}/skills/story-setup/references/codex/agents/character-designer.toml`, content: 'name = "character-designer"\n' },
    { name: `${prefix}/skills/story-setup/references/codex/agents/narrative-writer.toml`, content: 'name = "narrative-writer"\n' },
    { name: `${prefix}/skills/story-setup/references/codex/agents/consistency-checker.toml`, content: 'name = "consistency-checker"\n' },
    { name: `${prefix}/.agents/skills`, content: '', unixPermissions: 0xa000 },
  ])
}

test('installs locked oh-story skills from a fixture zip and skips scripts', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'oh-story-install-'))
  const archive = await coreArchive('oh-story-claudecode-abc')
  await installOhStoryCoreSuite(workspace, {
    fetchImpl: githubFetch({ [archiveUrl(SHA_A)]: archive }, SHA_A),
    now: NOW_A,
  })

  const suite = loadOhStoryCoreSuite(workspace)
  expect(suite?.revision).toBe(SHA_A)
  expect(suite?.source_url).toBe(OH_STORY_CORE_SOURCE_URL)
  expect(suite?.installed_at).toBe(NOW_A)
  expect(suite?.skills['story-review']?.skill_markdown).toContain('# story-review')
  expect(suite?.skills['story-review']?.references).toEqual([
    { file: 'quality-checklist.md', text: '开头有钩子' },
  ])
  expect(suite?.skills['story-deslop']?.skill_markdown).toContain('# story-deslop')
  expect(suite?.skills['story-long-write']?.skill_markdown).toContain('# story-long-write')

  const root = ohStoryCoreRoot(workspace)
  await expect(access(join(root, 'skills', 'story-review', 'scripts'))).rejects.toThrow()
  await expect(access(join(root, 'skills', 'story-review', 'scripts', 'run.sh'))).rejects.toThrow()
  await access(join(root, 'skills', 'story-deslop', 'scripts', 'check-ai-patterns.js'))
  await access(join(root, 'skills', 'story-deslop', 'scripts', 'check-degeneration.js'))
  await access(join(root, 'skills', 'story-deslop', 'scripts', 'normalize-punctuation.js'))
})

test('same revision re-extracts when deslop scripts are missing', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'oh-story-install-scripts-'))
  const bare = await zipBytes([
    { name: 'oh-story-claudecode-abc/skills/story-review/SKILL.md', content: '# story-review' },
    { name: 'oh-story-claudecode-abc/skills/story-deslop/SKILL.md', content: '# story-deslop' },
    { name: 'oh-story-claudecode-abc/skills/story-long-write/SKILL.md', content: '# story-long-write' },
  ])
  const withScripts = await coreArchive('oh-story-claudecode-abc')
  const calls: string[] = []
  const fetchImpl = githubFetch({ [archiveUrl(SHA_A)]: bare }, SHA_A, calls)

  await installOhStoryCoreSuite(workspace, { fetchImpl, now: NOW_A })
  const root = ohStoryCoreRoot(workspace)
  await expect(access(join(root, 'skills', 'story-deslop', 'scripts', 'check-ai-patterns.js'))).rejects.toThrow()

  const refill = githubFetch({ [archiveUrl(SHA_A)]: withScripts }, SHA_A, calls)
  await installOhStoryCoreSuite(workspace, { fetchImpl: refill, now: NOW_B })
  await access(join(root, 'skills', 'story-deslop', 'scripts', 'check-ai-patterns.js'))
  expect(calls.filter((url) => url.includes('codeload.github.com'))).toHaveLength(2)
})

test('same-revision reinstall is idempotent and keeps installed_at', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'oh-story-install-same-'))
  const archive = await coreArchive('oh-story-claudecode-abc')
  const calls: string[] = []
  const fetchImpl = githubFetch({ [archiveUrl(SHA_A)]: archive }, SHA_A, calls)

  await installOhStoryCoreSuite(workspace, { fetchImpl, now: NOW_A })
  const first = loadOhStoryCoreSuite(workspace)
  const zipDownloads = () => calls.filter((url) => url.includes('codeload.github.com')).length
  expect(zipDownloads()).toBe(1)

  await installOhStoryCoreSuite(workspace, { fetchImpl, now: NOW_B })
  const again = loadOhStoryCoreSuite(workspace)
  expect(again?.revision).toBe(SHA_A)
  expect(again?.installed_at).toBe(first?.installed_at)
  expect(again?.installed_at).toBe(NOW_A)
  expect(zipDownloads()).toBe(1)
})

test('different revision replaces the suite directory', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'oh-story-install-replace-'))
  await installOhStoryCoreSuite(workspace, {
    fetchImpl: githubFetch({ [archiveUrl(SHA_A)]: await coreArchive('oh-story-claudecode-abc') }, SHA_A),
    now: NOW_A,
  })

  await installOhStoryCoreSuite(workspace, {
    fetchImpl: githubFetch(
      { [archiveUrl(SHA_B)]: await coreArchive('oh-story-claudecode-def', '# story-review v2') },
      SHA_B,
    ),
    now: NOW_B,
  })

  const suite = loadOhStoryCoreSuite(workspace)
  expect(suite?.revision).toBe(SHA_B)
  expect(suite?.installed_at).toBe(NOW_B)
  expect(suite?.skills['story-review']?.skill_markdown).toContain('v2')
})
