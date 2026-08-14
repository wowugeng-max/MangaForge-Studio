# Writing Skill Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users install extra 去AI味 writing skills from public GitHub repos into a workspace-global disk registry, run them after the three builtins in the sequential full-chapter pass, and uninstall them from the settings modal — builtins stay hardcoded and non-removable.

**Architecture:** Disk is the registry: `{workspace}/.mangaforge/writing-skill-packs/{id}/` holds `pack.json` + `SKILL.md` + optional `references/*.md`, written atomically like the canvas Skill Pack installer (temp dir + rename). `WritingSkillId` widens to `string`; the builtin literal union survives as `BuiltinWritingSkillId` and all special-case logic (fiction mode, humanizer sleeve, soul-leak gate) stays keyed to builtin literals. `resolveWritingSkillsEnabled` stays a pure function and gains an `installed` parameter; callers fetch the installed list from the new `installed-store`. Installed skills compile through a generic prompt path (frontmatter-stripped full SKILL.md + all references sorted by filename).

**Tech Stack:** TypeScript, bun:test, JSZip (already a server dependency via the canvas installer), Express route-registration pattern, Ant Design.

**Spec:** `docs/superpowers/specs/2026-08-14-writing-skill-marketplace-design.md`

**Commit policy:** This repo’s user rule wins over the skill’s “commit every task” default. Skip every Commit step unless the user explicitly asks to commit.

---

## File map

Create (server):

- `ui/server/src/novel-writing/writing-skills/installed-store.ts` — scan/read installed packs, bounds validation, mtime-keyed cache
- `ui/server/src/novel-writing/writing-skills/installed-store.test.ts`
- `ui/server/src/novel-writing/writing-skills/install-github.ts` — URL validation, HEAD sha lock, codeload zip download, markdown-only extraction, atomic install/replace, uninstall
- `ui/server/src/novel-writing/writing-skills/install-github.test.ts`
- `ui/server/src/novel-writing/writing-skills/load-installed.ts` — read + frontmatter-strip installed pack markdown (parallel to `load-vendor.ts`, because vendor resolves from `import.meta.dir` while installed packs live in the runtime workspace)
- `ui/server/src/novel-writing/writing-skills/load-installed.test.ts`
- `ui/server/src/novel-writing/writing-skills/registry-catalog.test.ts`
- `ui/server/src/routes/novel-writing-skill-routes.ts` — GET catalog / POST install / DELETE :id
- `ui/server/src/routes/novel-writing-skill-routes.test.ts`

Modify (server):

- `ui/server/src/novel-writing/writing-skills/types.ts` — `BuiltinWritingSkillId`, `WritingSkillId = string`, `installed` resolve input
- `ui/server/src/novel-writing/writing-skills/registry.ts` — `isBuiltinWritingSkillId`, `buildWritingSkillCatalog`, `resolveWritingSkillStageLabel`
- `ui/server/src/novel-writing/writing-skills/resolve-enabled.ts` — dynamic ids, installed default off, stale-id filtering
- `ui/server/src/novel-writing/writing-skills/resolve-enabled.test.ts`
- `ui/server/src/novel-writing/writing-skills/load-vendor.ts` — tighten types to `BuiltinWritingSkillId`
- `ui/server/src/novel-writing/writing-skills/compile-pass-prompt.ts` — generic installed-skill path
- `ui/server/src/novel-writing/writing-skills/compile-pass-prompt.test.ts`
- `ui/server/src/novel-writing/writing-skills/index.ts` — re-exports
- `ui/server/src/novel-writing-service/service/writing-skill-humanize-methods.ts` — installed packs into resolve, load-at-pass-start, progress label
- `ui/server/src/novel-writing-service/service/writing-skill-humanize-methods.test.ts`
- `ui/server/src/novel-writing-service/service/generate-chapter-post-draft-finalize.ts` — use runner-provided progress label
- `ui/server/src/routes/novel-editor/revision-run-view.ts` — accept installed ids in `skill_progress`, server-side name lookup
- `ui/server/src/routes/novel-editor/revision-run-view.test.ts`
- `ui/server/src/routes/novel-run-routes.ts`, `ui/server/src/routes/novel-editor/register-revision.ts` — pass installed name map to the projection
- `ui/server/src/novel-writing/chapter-prose-storage-patch.test.ts` — regression only (ids are already bounded strings)
- `ui/server/src/routes/novel-project-config-routes.ts` — writing-skills-config GET/PUT resolve with installed
- `ui/server/src/routes/novel-project-config-routes.test.ts`
- `ui/server/src/routes/novel.ts` — register the new routes

Modify (web):

- `ui/web/src/pages/novel-workspace/writingSkillsModel.ts` — `WritingSkillCatalogItem`, `normalizeWritingSkillCatalog`, catalog-aware resolve
- `ui/web/src/pages/novel-workspace/writingSkillsModel.test.ts`
- `ui/web/src/pages/novel-workspace/ProjectSettingsModal.tsx` — dynamic rows, uninstall Popconfirm, revision short sha, GitHub install input
- `ui/web/src/pages/novel-workspace/ProjectSettingsModal.test.ts`
- `ui/web/src/pages/novel-workspace/workspace-center-editor-controls.tsx` — catalog prop
- `ui/web/src/pages/novel-workspace/useNovelProjectWorkspaceUiState.ts`, `shell/use-novel-workspace-base-model.tsx`, `shell/build-novel-workspace-ready-runtime.tsx`, `shell/workspace-view-props-area.ts`, `shell/workspace-area-view.tsx`, `WorkspaceCenter.tsx` — thread `writingSkillsCatalog`

Do not touch:

- `ui/server/src/skills/pack-installer.ts` (the canvas installer body; only `path-safety.ts` helpers are imported)
- `ui/server/src/novel-writing/writing-skills/vendor/**` markdown
- `ChapterTaskStage` enum, v2 receipt structure

---

### Task 1: installed-store — disk registry scan with cache

**Files:**
- Create: `ui/server/src/novel-writing/writing-skills/installed-store.ts`
- Test: `ui/server/src/novel-writing/writing-skills/installed-store.test.ts`

- [ ] **Step 1: Write the failing store test**

```ts
import { describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  MAX_INSTALLED_REFERENCE_COUNT,
  MAX_INSTALLED_SKILL_MD_BYTES,
  invalidateInstalledWritingSkillPackCache,
  getInstalledWritingSkillNameMap,
  listInstalledWritingSkillPacks,
  writingSkillPacksRoot,
} from './installed-store'

async function writePack(workspace: string, id: string, options: {
  name?: string
  installedAt?: string
  skillMd?: string
  references?: Record<string, string>
  packJson?: Record<string, unknown> | null
} = {}) {
  const dir = join(writingSkillPacksRoot(workspace), id)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'SKILL.md'), options.skillMd ?? `---\nname: ${options.name || id}\n---\n# ${id}\n正文规则。`)
  for (const [file, text] of Object.entries(options.references || {})) {
    await mkdir(join(dir, 'references'), { recursive: true })
    await writeFile(join(dir, 'references', file), text)
  }
  if (options.packJson !== null) {
    await writeFile(join(dir, 'pack.json'), JSON.stringify(options.packJson ?? {
      id,
      source_url: `https://github.com/acme/${id}`,
      owner: 'acme',
      repo: id,
      revision: 'a'.repeat(40),
      installed_at: options.installedAt || '2026-08-14T00:00:00.000Z',
      name: options.name || id,
      description: '安装包描述',
    }))
  }
  return dir
}

describe('installed writing skill store', () => {
  test('scans valid packs sorted by installed_at asc with reference files sorted by name', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'wsk-store-'))
    await writePack(workspace, 'newer-pack', { installedAt: '2026-08-14T02:00:00.000Z' })
    await writePack(workspace, 'older-pack', {
      installedAt: '2026-08-14T01:00:00.000Z',
      name: '旧包',
      references: { 'b.md': '乙', 'a.md': '甲' },
    })
    invalidateInstalledWritingSkillPackCache()
    const packs = await listInstalledWritingSkillPacks(workspace)
    expect(packs.map(pack => pack.id)).toEqual(['older-pack', 'newer-pack'])
    expect(packs[0]).toMatchObject({
      id: 'older-pack',
      name: '旧包',
      description: '安装包描述',
      owner: 'acme',
      repo: 'older-pack',
      revision: 'a'.repeat(40),
      reference_files: ['a.md', 'b.md'],
    })
    expect(packs[0].dir).toBe(join(writingSkillPacksRoot(workspace), 'older-pack'))
    expect(await getInstalledWritingSkillNameMap(workspace)).toEqual({
      'older-pack': '旧包',
      'newer-pack': 'newer-pack',
    })
  })

  test('returns an empty list when the packs directory does not exist', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'wsk-store-'))
    invalidateInstalledWritingSkillPackCache()
    expect(await listInstalledWritingSkillPacks(workspace)).toEqual([])
  })

  test('skips invalid packs: bad pack.json, missing SKILL.md, oversized SKILL.md, too many references, bad id', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'wsk-store-'))
    await writePack(workspace, 'good-pack', {})
    await writePack(workspace, 'no-meta', { packJson: null })
    await writePack(workspace, 'bad-meta', { packJson: { id: 'mismatch' } })
    const noSkill = await writePack(workspace, 'no-skill', {})
    await (await import('node:fs/promises')).rm(join(noSkill, 'SKILL.md'))
    await writePack(workspace, 'huge-skill', { skillMd: 'x'.repeat(MAX_INSTALLED_SKILL_MD_BYTES + 1) })
    await writePack(workspace, 'many-refs', {
      references: Object.fromEntries(
        Array.from({ length: MAX_INSTALLED_REFERENCE_COUNT + 1 }, (_, index) => [`r${index}.md`, '内容']),
      ),
    })
    await writePack(workspace, 'Bad_Id', {})
    invalidateInstalledWritingSkillPackCache()
    const packs = await listInstalledWritingSkillPacks(workspace)
    expect(packs.map(pack => pack.id)).toEqual(['good-pack'])
  })

  test('caches by root mtime and picks up newly installed packs', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'wsk-store-'))
    await writePack(workspace, 'first-pack', { installedAt: '2026-08-14T01:00:00.000Z' })
    invalidateInstalledWritingSkillPackCache()
    const first = await listInstalledWritingSkillPacks(workspace)
    const second = await listInstalledWritingSkillPacks(workspace)
    expect(second).toBe(first) // cache hit returns the same array
    await writePack(workspace, 'second-pack', { installedAt: '2026-08-14T02:00:00.000Z' })
    invalidateInstalledWritingSkillPackCache()
    const third = await listInstalledWritingSkillPacks(workspace)
    expect(third.map(pack => pack.id)).toEqual(['first-pack', 'second-pack'])
  })
})
```

- [ ] **Step 2: Run and confirm FAIL**

Run: `cd ui/server && bun test src/novel-writing/writing-skills/installed-store.test.ts`

Expected: FAIL because `./installed-store` does not exist.

- [ ] **Step 3: Implement the store**

```ts
import { lstat, readFile, readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export const WRITING_SKILL_PACK_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/
export const MAX_INSTALLED_SKILL_MD_BYTES = 256 * 1024
export const MAX_INSTALLED_REFERENCE_BYTES = 512 * 1024
export const MAX_INSTALLED_REFERENCE_COUNT = 8
export const MAX_INSTALLED_REFERENCES_TOTAL_BYTES = 2 * 1024 * 1024
const MAX_PACK_JSON_BYTES = 16 * 1024

export type InstalledWritingSkillPack = {
  id: string
  name: string
  description: string
  source_url: string
  owner: string
  repo: string
  revision: string
  installed_at: string
  dir: string
  reference_files: string[]
}

const cache = new Map<string, { mtimeMs: number; packs: InstalledWritingSkillPack[] }>()

export function writingSkillPacksRoot(workspace: string): string {
  return join(resolve(String(workspace || '')), '.mangaforge', 'writing-skill-packs')
}

export function invalidateInstalledWritingSkillPackCache(): void {
  cache.clear()
}

function warnSkip(id: string, reason: string): null {
  console.warn(`[writing-skills] skipping invalid installed pack "${id}": ${reason}`)
  return null
}

async function readInstalledWritingSkillPack(root: string, id: string): Promise<InstalledWritingSkillPack | null> {
  const dir = join(root, id)
  try {
    const dirInfo = await lstat(dir)
    if (dirInfo.isSymbolicLink() || !dirInfo.isDirectory()) return warnSkip(id, 'not a regular directory')

    const packJsonPath = join(dir, 'pack.json')
    const packInfo = await lstat(packJsonPath)
    if (packInfo.isSymbolicLink() || !packInfo.isFile() || packInfo.size > MAX_PACK_JSON_BYTES) {
      return warnSkip(id, 'pack.json missing or not a regular bounded file')
    }
    const record = JSON.parse(await readFile(packJsonPath, 'utf8')) as Record<string, unknown>
    if (
      !record || typeof record !== 'object' || Array.isArray(record)
      || record.id !== id
      || typeof record.source_url !== 'string'
      || typeof record.owner !== 'string'
      || typeof record.repo !== 'string'
      || typeof record.revision !== 'string'
      || typeof record.installed_at !== 'string'
      || !Number.isFinite(Date.parse(record.installed_at))
      || typeof record.name !== 'string' || !record.name.trim()
      || (record.description !== undefined && typeof record.description !== 'string')
    ) return warnSkip(id, 'invalid pack.json shape')

    const skillInfo = await lstat(join(dir, 'SKILL.md'))
    if (skillInfo.isSymbolicLink() || !skillInfo.isFile()) return warnSkip(id, 'SKILL.md missing')
    if (skillInfo.size > MAX_INSTALLED_SKILL_MD_BYTES) return warnSkip(id, 'SKILL.md exceeds bounds')

    const referenceFiles: string[] = []
    let referencesTotal = 0
    try {
      const referencesDir = join(dir, 'references')
      const referencesInfo = await lstat(referencesDir)
      if (referencesInfo.isSymbolicLink() || !referencesInfo.isDirectory()) {
        return warnSkip(id, 'references is not a regular directory')
      }
      for (const file of (await readdir(referencesDir)).sort()) {
        if (!/\.md$/i.test(file)) continue
        const referenceInfo = await lstat(join(referencesDir, file))
        if (referenceInfo.isSymbolicLink() || !referenceInfo.isFile()) {
          return warnSkip(id, `reference is not a regular file: ${file}`)
        }
        if (referenceInfo.size > MAX_INSTALLED_REFERENCE_BYTES) {
          return warnSkip(id, `reference exceeds bounds: ${file}`)
        }
        referencesTotal += referenceInfo.size
        referenceFiles.push(file)
      }
      if (referenceFiles.length > MAX_INSTALLED_REFERENCE_COUNT) return warnSkip(id, 'too many references')
      if (referencesTotal > MAX_INSTALLED_REFERENCES_TOTAL_BYTES) return warnSkip(id, 'references exceed total bounds')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }

    return {
      id,
      name: record.name.trim().slice(0, 120),
      description: String(record.description || '').slice(0, 500),
      source_url: record.source_url,
      owner: record.owner,
      repo: record.repo,
      revision: record.revision,
      installed_at: record.installed_at,
      dir,
      reference_files: referenceFiles,
    }
  } catch (error) {
    return warnSkip(id, String(error))
  }
}

export async function listInstalledWritingSkillPacks(workspace: string): Promise<InstalledWritingSkillPack[]> {
  const root = writingSkillPacksRoot(workspace)
  let rootInfo
  try {
    rootInfo = await stat(root)
  } catch {
    return []
  }
  if (!rootInfo.isDirectory()) return []
  const cached = cache.get(root)
  if (cached && cached.mtimeMs === rootInfo.mtimeMs) return cached.packs

  const packs: InstalledWritingSkillPack[] = []
  for (const entry of await readdir(root)) {
    if (entry.startsWith('.') || !WRITING_SKILL_PACK_ID_RE.test(entry)) continue
    const pack = await readInstalledWritingSkillPack(root, entry)
    if (pack) packs.push(pack)
  }
  packs.sort((a, b) => a.installed_at.localeCompare(b.installed_at) || a.id.localeCompare(b.id))
  cache.set(root, { mtimeMs: rootInfo.mtimeMs, packs })
  return packs
}

export async function getInstalledWritingSkillNameMap(workspace: string): Promise<Record<string, string>> {
  const packs = await listInstalledWritingSkillPacks(workspace)
  return Object.fromEntries(packs.map(pack => [pack.id, pack.name]))
}
```

- [ ] **Step 4: Re-run store tests**

Run: `cd ui/server && bun test src/novel-writing/writing-skills/installed-store.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit** (skip unless the user asked)

---

### Task 2: install-github — install, replace, uninstall

**Files:**
- Create: `ui/server/src/novel-writing/writing-skills/install-github.ts`
- Test: `ui/server/src/novel-writing/writing-skills/install-github.test.ts`

Mirror the canvas installer patterns from `ui/server/src/skills/pack-installer.ts` (HEAD sha resolve with 403/429 archive-redirect fallback, codeload download, two-pass zip validation, temp dir + atomic rename) but keep the module fully separate. Import only the generic helpers `SkillPathError` and `validateSkillPackArchiveEntry` from `ui/server/src/skills/path-safety.ts` (its per-file limits — 256 KiB for `SKILL.md`, 512 KiB otherwise — already match this spec). Error-code mapping decisions (spec has a closed set): unsafe/corrupt archives (traversal, symlink, invalid zip) → `DOWNLOAD_FAILED`; every size/count violation → `BOUNDS_EXCEEDED`.

- [ ] **Step 1: Write the failing installer test**

```ts
import { describe, expect, test } from 'bun:test'
import JSZip from 'jszip'
import { access, mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  invalidateInstalledWritingSkillPackCache,
  listInstalledWritingSkillPacks,
  writingSkillPacksRoot,
} from './installed-store'
import {
  extractWritingSkillArchive,
  installWritingSkillPackFromGitHub,
  normalizeWritingSkillPackId,
  parseWritingSkillGitHubUrl,
  uninstallWritingSkillPack,
} from './install-github'

const SHA_A = '0123456789abcdef0123456789abcdef01234567'
const SHA_B = 'fedcba9876543210fedcba9876543210fedcba98'

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

function goodArchive(marker = '正文规则A') {
  return zipBytes([
    { name: 'My-Style-Pack-main/SKILL.md', content: `---\nname: 我的文风包\ndescription: 换文风\n---\n# My Style\n${marker}` },
    { name: 'My-Style-Pack-main/references/b.md', content: '参考乙' },
    { name: 'My-Style-Pack-main/references/a.md', content: '参考甲' },
    { name: 'My-Style-Pack-main/scripts/run.py', content: 'raise RuntimeError()' },
    { name: 'My-Style-Pack-main/README.md', content: 'readme' },
  ])
}

describe('writing skill GitHub installer', () => {
  test('accepts only bare public github.com repo URLs', () => {
    const parsed = parseWritingSkillGitHubUrl('https://github.com/acme/My-Style-Pack')
    expect(parsed).toEqual({
      owner: 'acme',
      repo: 'My-Style-Pack',
      id: 'my-style-pack',
      canonical_url: 'https://github.com/acme/My-Style-Pack',
    })
    expect(parseWritingSkillGitHubUrl('https://github.com/acme/My-Style-Pack.git').id).toBe('my-style-pack')
    for (const value of [
      'http://github.com/acme/demo',
      'https://gitlab.com/acme/demo',
      'https://github.com/acme/demo?x=1',
      'https://github.com/acme/demo#x',
      'https://github.com/acme/demo/tree/main',
      'https://github.com/acme/demo/',
      'https://user:pw@github.com/acme/demo',
      'https://github.com:8443/acme/demo',
      ' https://github.com/acme/demo',
      'https://github.com/acme',
      'not a url',
    ]) {
      expect(() => parseWritingSkillGitHubUrl(value)).toThrow(expect.objectContaining({ code: 'INVALID_URL' }))
    }
  })

  test('normalizes repo names to bounded lowercase ids and rejects builtin collisions', () => {
    expect(normalizeWritingSkillPackId('My_Style.Pack')).toBe('my-style-pack')
    expect(() => normalizeWritingSkillPackId('-'.repeat(3))).toThrow(expect.objectContaining({ code: 'INVALID_URL' }))
    expect(() => normalizeWritingSkillPackId(`x${'y'.repeat(80)}`)).toThrow(expect.objectContaining({ code: 'INVALID_URL' }))
    expect(() => parseWritingSkillGitHubUrl('https://github.com/acme/fiction-humanizer-zh'))
      .toThrow(expect.objectContaining({ code: 'ID_CONFLICT_BUILTIN' }))
  })

  test('extracts only root SKILL.md and references/*.md', async () => {
    const extracted = await extractWritingSkillArchive(await goodArchive())
    expect(extracted.skill_markdown_raw).toContain('# My Style')
    expect(extracted.references.map(reference => reference.file)).toEqual(['a.md', 'b.md'])
    expect(JSON.stringify(extracted)).not.toContain('RuntimeError')
    expect(JSON.stringify(extracted)).not.toContain('readme')
  })

  test('rejects archives without a root SKILL.md', async () => {
    const archive = await zipBytes([{ name: 'demo-main/docs/SKILL.md', content: 'nested' }])
    await expect(extractWritingSkillArchive(archive)).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_MD_MISSING' }),
    )
  })

  test('rejects traversal, symlink, and bounds violations', async () => {
    const traversal = await zipBytes([{ name: '../escape/SKILL.md', content: 'bad' }])
    await expect(extractWritingSkillArchive(traversal)).rejects.toThrow(
      expect.objectContaining({ code: 'DOWNLOAD_FAILED' }),
    )
    const symlink = await zipBytes([
      { name: 'demo-main/SKILL.md', content: 'ok' },
      { name: 'demo-main/references/link.md', content: 'outside', unixPermissions: 0o120777 },
    ])
    await expect(extractWritingSkillArchive(symlink)).rejects.toThrow(
      expect.objectContaining({ code: 'DOWNLOAD_FAILED' }),
    )
    const hugeSkill = await zipBytes([{ name: 'demo-main/SKILL.md', content: 'x'.repeat(256 * 1024 + 1) }])
    await expect(extractWritingSkillArchive(hugeSkill)).rejects.toThrow(
      expect.objectContaining({ code: 'BOUNDS_EXCEEDED' }),
    )
    const manyRefs = await zipBytes([
      { name: 'demo-main/SKILL.md', content: 'ok' },
      ...Array.from({ length: 9 }, (_, index) => ({ name: `demo-main/references/r${index}.md`, content: '内容' })),
    ])
    await expect(extractWritingSkillArchive(manyRefs)).rejects.toThrow(
      expect.objectContaining({ code: 'BOUNDS_EXCEEDED' }),
    )
  })

  test('installs atomically, takes name/description from frontmatter, and is idempotent per revision', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'wsk-install-'))
    const archive = await goodArchive()
    const calls: string[] = []
    const fetchImpl = githubFetch(
      { [`https://codeload.github.com/acme/My-Style-Pack/zip/${SHA_A}`]: archive },
      SHA_A,
      calls,
    )
    invalidateInstalledWritingSkillPackCache()
    const pack = await installWritingSkillPackFromGitHub({
      url: 'https://github.com/acme/My-Style-Pack',
      workspace,
      fetchImpl,
    })
    expect(pack).toMatchObject({
      id: 'my-style-pack',
      name: '我的文风包',
      description: '换文风',
      owner: 'acme',
      repo: 'My-Style-Pack',
      revision: SHA_A,
      source_url: 'https://github.com/acme/My-Style-Pack',
      reference_files: ['a.md', 'b.md'],
    })
    const dir = join(writingSkillPacksRoot(workspace), 'my-style-pack')
    expect(await readFile(join(dir, 'SKILL.md'), 'utf8')).toContain('# My Style')
    expect(await readFile(join(dir, 'references', 'a.md'), 'utf8')).toBe('参考甲')
    expect(JSON.parse(await readFile(join(dir, 'pack.json'), 'utf8'))).toMatchObject({ id: 'my-style-pack', revision: SHA_A })
    await expect(access(join(dir, 'scripts'))).rejects.toThrow()

    const zipDownloads = () => calls.filter(url => url.includes('codeload.github.com')).length
    expect(zipDownloads()).toBe(1)
    const again = await installWritingSkillPackFromGitHub({
      url: 'https://github.com/acme/My-Style-Pack',
      workspace,
      fetchImpl,
    })
    expect(again.installed_at).toBe(pack.installed_at)
    expect(zipDownloads()).toBe(1) // same revision: no second archive download
  })

  test('replaces the whole directory on a new revision and keeps installed_at stable', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'wsk-install-'))
    invalidateInstalledWritingSkillPackCache()
    const first = await installWritingSkillPackFromGitHub({
      url: 'https://github.com/acme/My-Style-Pack',
      workspace,
      fetchImpl: githubFetch({ [`https://codeload.github.com/acme/My-Style-Pack/zip/${SHA_A}`]: await goodArchive() }, SHA_A),
    })
    const updatedArchive = await zipBytes([
      { name: 'My-Style-Pack-main/SKILL.md', content: '---\nname: 我的文风包\n---\n# My Style v2\n正文规则B' },
    ])
    const second = await installWritingSkillPackFromGitHub({
      url: 'https://github.com/acme/My-Style-Pack',
      workspace,
      fetchImpl: githubFetch({ [`https://codeload.github.com/acme/My-Style-Pack/zip/${SHA_B}`]: updatedArchive }, SHA_B),
    })
    expect(second.revision).toBe(SHA_B)
    expect(second.installed_at).toBe(first.installed_at)
    const dir = join(writingSkillPacksRoot(workspace), 'my-style-pack')
    expect(await readFile(join(dir, 'SKILL.md'), 'utf8')).toContain('v2')
    await expect(access(join(dir, 'references'))).rejects.toThrow() // old references replaced away
  })

  test('maps download failures to DOWNLOAD_FAILED', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'wsk-install-'))
    await expect(installWritingSkillPackFromGitHub({
      url: 'https://github.com/acme/My-Style-Pack',
      workspace,
      fetchImpl: async () => jsonResponse({}, 500),
    })).rejects.toThrow(expect.objectContaining({ code: 'DOWNLOAD_FAILED' }))
  })

  test('uninstall removes installed packs and refuses builtins / missing ids', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'wsk-install-'))
    invalidateInstalledWritingSkillPackCache()
    await installWritingSkillPackFromGitHub({
      url: 'https://github.com/acme/My-Style-Pack',
      workspace,
      fetchImpl: githubFetch({ [`https://codeload.github.com/acme/My-Style-Pack/zip/${SHA_A}`]: await goodArchive() }, SHA_A),
    })
    await expect(uninstallWritingSkillPack(workspace, 'fiction-humanizer-zh')).rejects.toThrow(
      expect.objectContaining({ code: 'BUILTIN_NOT_REMOVABLE' }),
    )
    await expect(uninstallWritingSkillPack(workspace, 'never-installed')).rejects.toThrow(
      expect.objectContaining({ code: 'NOT_INSTALLED' }),
    )
    await uninstallWritingSkillPack(workspace, 'my-style-pack')
    expect(await listInstalledWritingSkillPacks(workspace)).toEqual([])
    await expect(uninstallWritingSkillPack(workspace, 'my-style-pack')).rejects.toThrow(
      expect.objectContaining({ code: 'NOT_INSTALLED' }),
    )
  })
})
```

- [ ] **Step 2: Run and confirm FAIL**

Run: `cd ui/server && bun test src/novel-writing/writing-skills/install-github.test.ts`

Expected: FAIL because `./install-github` does not exist.

- [ ] **Step 3: Implement the installer**

```ts
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import JSZip from 'jszip'
import { SkillPathError, validateSkillPackArchiveEntry } from '../../skills/path-safety'
import { WRITING_SKILL_IDS } from './types'
import {
  MAX_INSTALLED_REFERENCE_BYTES,
  MAX_INSTALLED_REFERENCE_COUNT,
  MAX_INSTALLED_REFERENCES_TOTAL_BYTES,
  MAX_INSTALLED_SKILL_MD_BYTES,
  WRITING_SKILL_PACK_ID_RE,
  invalidateInstalledWritingSkillPackCache,
  listInstalledWritingSkillPacks,
  writingSkillPacksRoot,
  type InstalledWritingSkillPack,
} from './installed-store'

export const MAX_WRITING_SKILL_ARCHIVE_BYTES = 128 * 1024 * 1024
export const MAX_WRITING_SKILL_EXTRACTED_BYTES = 4 * 1024 * 1024
const GITHUB_REDIRECT_STATUSES = new Set([301, 302, 307, 308])

export type WritingSkillInstallErrorCode =
  | 'INVALID_URL'
  | 'ID_CONFLICT_BUILTIN'
  | 'SKILL_MD_MISSING'
  | 'BOUNDS_EXCEEDED'
  | 'DOWNLOAD_FAILED'
  | 'BUILTIN_NOT_REMOVABLE'
  | 'NOT_INSTALLED'
  | 'INSTALL_FAILED'

export class WritingSkillInstallError extends Error {
  readonly code: WritingSkillInstallErrorCode
  readonly cause?: unknown

  constructor(code: WritingSkillInstallErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'WritingSkillInstallError'
    this.code = code
    this.cause = cause
  }
}

export type WritingSkillRepoSource = {
  owner: string
  repo: string
  id: string
  canonical_url: string
}

export function normalizeWritingSkillPackId(repo: string): string {
  const id = String(repo || '')
    .toLowerCase()
    .replace(/[._]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!WRITING_SKILL_PACK_ID_RE.test(id)) {
    throw new WritingSkillInstallError('INVALID_URL', `Repository name cannot become a writing skill id: ${repo}`)
  }
  return id
}

export function parseWritingSkillGitHubUrl(source: string): WritingSkillRepoSource {
  if (
    typeof source !== 'string'
    || source.trim() !== source
    || /[\s\\]/.test(source)
    || !/^https:\/\/github\.com\/[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*(?:\.git)?$/.test(source)
  ) {
    throw new WritingSkillInstallError('INVALID_URL', `Invalid GitHub repository URL: ${source}`)
  }
  let url: URL
  try {
    url = new URL(source)
  } catch {
    throw new WritingSkillInstallError('INVALID_URL', `Invalid GitHub URL: ${source}`)
  }
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.search || url.hash || url.username || url.password) {
    throw new WritingSkillInstallError('INVALID_URL', `Only public github.com HTTPS URLs are allowed: ${source}`)
  }
  const match = url.pathname.match(/^\/([A-Za-z0-9][A-Za-z0-9._-]*)\/([A-Za-z0-9][A-Za-z0-9._-]*?)(?:\.git)?$/)
  if (!match || match[1] === '.' || match[1] === '..' || match[2] === '.' || match[2] === '..') {
    throw new WritingSkillInstallError('INVALID_URL', `Invalid GitHub repository URL: ${source}`)
  }
  const owner = match[1]
  const repo = match[2]
  const id = normalizeWritingSkillPackId(repo)
  if ((WRITING_SKILL_IDS as readonly string[]).includes(id)) {
    throw new WritingSkillInstallError('ID_CONFLICT_BUILTIN', `"${id}" is a builtin writing skill id`)
  }
  return { owner, repo, id, canonical_url: `https://github.com/${owner}/${repo}` }
}

function parseWritingSkillArchiveRedirect(location: string, source: WritingSkillRepoSource): string {
  let url: URL
  try {
    url = new URL(location)
  } catch (error) {
    throw new WritingSkillInstallError('DOWNLOAD_FAILED', 'GitHub archive fallback returned an invalid redirect URL', error)
  }
  const lexical = /^https:\/\/codeload\.github\.com\/[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*\/zip\/[0-9a-fA-F]{40}$/.test(location)
  const parts = url.pathname.split('/')
  const [empty, owner, name, format, sha] = parts
  if (
    !lexical
    || url.protocol !== 'https:'
    || url.hostname !== 'codeload.github.com'
    || url.port || url.search || url.hash || url.username || url.password
    || parts.length !== 5
    || empty !== ''
    || owner?.toLowerCase() !== source.owner.toLowerCase()
    || name?.toLowerCase() !== source.repo.toLowerCase()
    || format !== 'zip'
    || !/^[0-9a-f]{40}$/i.test(sha ?? '')
  ) {
    throw new WritingSkillInstallError('DOWNLOAD_FAILED', 'GitHub archive fallback returned an untrusted redirect')
  }
  return sha
}

async function cancelResponseBody(response: Response): Promise<void> {
  try { await response.body?.cancel() } catch { /* cleanup must not mask installer errors */ }
}

export async function resolveWritingSkillHeadRevision(
  source: WritingSkillRepoSource,
  fetchImpl: typeof fetch,
): Promise<string> {
  const headUrl = `https://api.github.com/repos/${source.owner}/${source.repo}/commits/HEAD`
  let headResponse: Response
  try {
    headResponse = await fetchImpl(headUrl, { headers: { accept: 'application/vnd.github+json' } })
  } catch (error) {
    throw new WritingSkillInstallError('DOWNLOAD_FAILED', `Unable to fetch ${headUrl}`, error)
  }
  if (headResponse.ok) {
    try {
      const head = await headResponse.json() as { sha?: unknown }
      if (typeof head.sha !== 'string' || !/^[0-9a-f]{40}$/i.test(head.sha)) throw new Error('missing sha')
      return head.sha
    } catch (error) {
      throw new WritingSkillInstallError('DOWNLOAD_FAILED', 'GitHub HEAD response did not contain a valid commit SHA', error)
    }
  }
  await cancelResponseBody(headResponse)
  if (headResponse.status !== 403 && headResponse.status !== 429) {
    throw new WritingSkillInstallError('DOWNLOAD_FAILED', `GitHub HEAD request failed: ${headResponse.status}`)
  }
  let fallbackResponse: Response
  try {
    fallbackResponse = await fetchImpl(`https://github.com/${source.owner}/${source.repo}/archive/HEAD.zip`, {
      method: 'HEAD',
      redirect: 'manual',
    })
  } catch (error) {
    throw new WritingSkillInstallError('DOWNLOAD_FAILED', `Unable to resolve GitHub archive HEAD for ${source.owner}/${source.repo}`, error)
  }
  const fallbackStatus = fallbackResponse.status
  const location = fallbackResponse.headers.get('location')
  await cancelResponseBody(fallbackResponse)
  if (!GITHUB_REDIRECT_STATUSES.has(fallbackStatus)) {
    throw new WritingSkillInstallError('DOWNLOAD_FAILED', `GitHub archive fallback failed: ${fallbackStatus}`)
  }
  if (!location) {
    throw new WritingSkillInstallError('DOWNLOAD_FAILED', 'GitHub archive fallback did not return a redirect location')
  }
  return parseWritingSkillArchiveRedirect(location, source)
}

function archiveEntryType(entry: JSZip.JSZipObject): 'file' | 'directory' | 'symlink' {
  const mode = typeof entry.unixPermissions === 'number' ? entry.unixPermissions : 0
  if (mode && (mode & 0xf000) === 0xa000) return 'symlink'
  if (entry.dir) return 'directory'
  return 'file'
}

const SELECTED_ARCHIVE_PATH_RE = /^(SKILL\.md|references\/[^/]+\.md)$/

export type ExtractedWritingSkillArchive = {
  skill_markdown_raw: string
  references: Array<{ file: string; text: string }>
}

export async function extractWritingSkillArchive(bytes: Uint8Array): Promise<ExtractedWritingSkillArchive> {
  if (bytes.byteLength > MAX_WRITING_SKILL_ARCHIVE_BYTES) {
    throw new WritingSkillInstallError('BOUNDS_EXCEEDED', `Archive exceeds ${MAX_WRITING_SKILL_ARCHIVE_BYTES} bytes`)
  }
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(bytes)
  } catch (error) {
    throw new WritingSkillInstallError('DOWNLOAD_FAILED', 'Invalid ZIP archive', error)
  }
  const entries = Object.values(zip.files)
  const names = entries.map(entry => entry.name.replaceAll('\\', '/'))
  const firstSegments = names.filter(Boolean).map(name => name.split('/')[0]).filter(Boolean)
  const commonRoot = firstSegments.length === names.filter(Boolean).length
    && firstSegments.length > 0
    && new Set(firstSegments).size === 1
    ? firstSegments[0]
    : undefined

  const seen = new Set<string>()
  const picked: Array<{ path: string; entry: JSZip.JSZipObject }> = []
  for (const entry of entries) {
    const type = archiveEntryType(entry)
    const safeName = entry.name.replaceAll('\\', '/')
    const original = (entry.unsafeOriginalName ?? entry.name).replaceAll('\\', '/')
    const sizeHint = Number((entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0)
    const name = commonRoot && safeName.startsWith(`${commonRoot}/`) ? safeName.slice(commonRoot.length + 1) : safeName
    const selected = Boolean(name && SELECTED_ARCHIVE_PATH_RE.test(name))
    try {
      // Every repository entry gets path/symlink validation; size limits apply
      // only to the markdown payload that can be installed.
      validateSkillPackArchiveEntry(original, type, selected ? sizeHint : 0)
    } catch (error) {
      if (error instanceof SkillPathError && error.code === 'SKILL_FILE_TOO_LARGE') {
        throw new WritingSkillInstallError('BOUNDS_EXCEEDED', error.message, error)
      }
      throw new WritingSkillInstallError('DOWNLOAD_FAILED', `Unsafe archive entry: ${original}`, error)
    }
    if (!name || !selected || type !== 'file') continue
    if (seen.has(name)) throw new WritingSkillInstallError('DOWNLOAD_FAILED', `Duplicate archive entry: ${name}`)
    seen.add(name)
    picked.push({ path: name, entry })
  }
  if (picked.filter(file => file.path !== 'SKILL.md').length > MAX_INSTALLED_REFERENCE_COUNT) {
    throw new WritingSkillInstallError('BOUNDS_EXCEEDED', `More than ${MAX_INSTALLED_REFERENCE_COUNT} reference files`)
  }

  let extractedTotal = 0
  let referencesTotal = 0
  let skillMarkdownRaw: string | null = null
  const references: Array<{ file: string; text: string }> = []
  for (const file of picked) {
    let content: Uint8Array
    try {
      content = await file.entry.async('uint8array')
    } catch (error) {
      throw new WritingSkillInstallError('DOWNLOAD_FAILED', `Cannot read archive entry: ${file.path}`, error)
    }
    const limit = file.path === 'SKILL.md' ? MAX_INSTALLED_SKILL_MD_BYTES : MAX_INSTALLED_REFERENCE_BYTES
    if (content.byteLength > limit) {
      throw new WritingSkillInstallError('BOUNDS_EXCEEDED', `Archive entry exceeds ${limit} bytes: ${file.path}`)
    }
    extractedTotal += content.byteLength
    if (extractedTotal > MAX_WRITING_SKILL_EXTRACTED_BYTES) {
      throw new WritingSkillInstallError('BOUNDS_EXCEEDED', 'Extracted archive exceeds size limit')
    }
    const text = new TextDecoder().decode(content)
    if (file.path === 'SKILL.md') {
      skillMarkdownRaw = text
    } else {
      referencesTotal += content.byteLength
      if (referencesTotal > MAX_INSTALLED_REFERENCES_TOTAL_BYTES) {
        throw new WritingSkillInstallError('BOUNDS_EXCEEDED', 'References exceed total size limit')
      }
      references.push({ file: file.path.slice('references/'.length), text })
    }
  }
  if (skillMarkdownRaw === null) {
    throw new WritingSkillInstallError('SKILL_MD_MISSING', 'Repository root has no SKILL.md')
  }
  references.sort((a, b) => a.file.localeCompare(b.file))
  return { skill_markdown_raw: skillMarkdownRaw, references }
}

export function parseWritingSkillFrontmatterMeta(raw: string): { name?: string; description?: string } {
  const text = String(raw || '').replace(/^\uFEFF/, '')
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) return {}
  const meta: { name?: string; description?: string } = {}
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^(name|description):\s*(.+?)\s*$/)
    if (!pair) continue
    const value = pair[2].replace(/^["']|["']$/g, '').trim()
    if (!value) continue
    if (pair[1] === 'name' && meta.name === undefined) meta.name = value.slice(0, 120)
    if (pair[1] === 'description' && meta.description === undefined) meta.description = value.slice(0, 500)
  }
  return meta
}

async function readResponseBytes(response: Response, limit: number): Promise<Uint8Array> {
  const reader = response.body?.getReader()
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength > limit) throw new WritingSkillInstallError('BOUNDS_EXCEEDED', 'Archive exceeds size limit')
    return bytes
  }
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      const chunk = next.value instanceof Uint8Array ? next.value : new Uint8Array(next.value)
      total += chunk.byteLength
      if (total > limit) {
        await reader.cancel()
        throw new WritingSkillInstallError('BOUNDS_EXCEEDED', 'Archive exceeds size limit')
      }
      chunks.push(chunk)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

export async function installWritingSkillPackFromGitHub(input: {
  url: string
  workspace: string
  fetchImpl?: typeof fetch
}): Promise<InstalledWritingSkillPack> {
  const fetchImpl = input.fetchImpl ?? fetch
  const source = parseWritingSkillGitHubUrl(input.url)
  const revision = await resolveWritingSkillHeadRevision(source, fetchImpl)
  const installedPacks = await listInstalledWritingSkillPacks(input.workspace)
  const existing = installedPacks.find(pack => pack.id === source.id)
  if (existing && existing.revision === revision && existing.source_url === source.canonical_url) {
    return existing
  }

  const archiveUrl = `https://codeload.github.com/${source.owner}/${source.repo}/zip/${revision}`
  let archiveResponse: Response
  try {
    archiveResponse = await fetchImpl(archiveUrl)
  } catch (error) {
    throw new WritingSkillInstallError('DOWNLOAD_FAILED', `Unable to download ${archiveUrl}`, error)
  }
  if (!archiveResponse.ok) {
    throw new WritingSkillInstallError('DOWNLOAD_FAILED', `Archive download failed: ${archiveResponse.status}`)
  }
  const contentLength = Number(archiveResponse.headers.get('content-length') ?? 0)
  if (contentLength > MAX_WRITING_SKILL_ARCHIVE_BYTES) {
    throw new WritingSkillInstallError('BOUNDS_EXCEEDED', 'Archive exceeds size limit')
  }
  const bytes = await readResponseBytes(archiveResponse, MAX_WRITING_SKILL_ARCHIVE_BYTES)
  const extracted = await extractWritingSkillArchive(bytes)
  const meta = parseWritingSkillFrontmatterMeta(extracted.skill_markdown_raw)
  const record = {
    id: source.id,
    source_url: source.canonical_url,
    owner: source.owner,
    repo: source.repo,
    revision,
    // Keep the original install time on re-install so catalog order is stable.
    installed_at: existing?.installed_at ?? new Date().toISOString(),
    name: meta.name || source.repo,
    description: meta.description || '',
  }

  const root = writingSkillPacksRoot(input.workspace)
  await mkdir(root, { recursive: true })
  const temp = await mkdtemp(join(root, `.tmp-${source.id}-`))
  try {
    await writeFile(join(temp, 'SKILL.md'), extracted.skill_markdown_raw, 'utf8')
    if (extracted.references.length) {
      await mkdir(join(temp, 'references'), { recursive: true })
      for (const reference of extracted.references) {
        await writeFile(join(temp, 'references', reference.file), reference.text, 'utf8')
      }
    }
    await writeFile(join(temp, 'pack.json'), JSON.stringify(record, null, 2), 'utf8')

    const destination = join(root, source.id)
    let displaced: string | null = null
    if (existing) {
      displaced = join(root, `.tmp-replace-${source.id}-${Date.now()}`)
      await rename(destination, displaced)
    }
    await rename(temp, destination)
    if (displaced) await rm(displaced, { recursive: true, force: true }).catch(() => undefined)
    invalidateInstalledWritingSkillPackCache()
    return {
      ...record,
      dir: destination,
      reference_files: extracted.references.map(reference => reference.file),
    }
  } catch (error) {
    if (error instanceof WritingSkillInstallError) throw error
    throw new WritingSkillInstallError('INSTALL_FAILED', 'Writing skill installation failed', error)
  } finally {
    await rm(temp, { recursive: true, force: true }).catch(() => undefined)
  }
}

export async function uninstallWritingSkillPack(workspace: string, id: string): Promise<void> {
  if ((WRITING_SKILL_IDS as readonly string[]).includes(id)) {
    throw new WritingSkillInstallError('BUILTIN_NOT_REMOVABLE', `Builtin writing skill cannot be removed: ${id}`)
  }
  if (!WRITING_SKILL_PACK_ID_RE.test(String(id || ''))) {
    throw new WritingSkillInstallError('NOT_INSTALLED', `Writing skill is not installed: ${id}`)
  }
  const root = writingSkillPacksRoot(workspace)
  const displaced = join(root, `.tmp-remove-${id}-${Date.now()}`)
  try {
    await rename(join(root, id), displaced)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new WritingSkillInstallError('NOT_INSTALLED', `Writing skill is not installed: ${id}`)
    }
    throw new WritingSkillInstallError('INSTALL_FAILED', `Unable to remove writing skill: ${id}`, error)
  }
  await rm(displaced, { recursive: true, force: true }).catch(() => undefined)
  invalidateInstalledWritingSkillPackCache()
}
```

- [ ] **Step 4: Re-run installer tests**

Run: `cd ui/server && bun test src/novel-writing/writing-skills/install-github.test.ts src/novel-writing/writing-skills/installed-store.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit** (skip unless the user asked)

---

### Task 3: Registry, types, and resolve accept dynamic ids

**Files:**
- Modify: `ui/server/src/novel-writing/writing-skills/types.ts`
- Modify: `ui/server/src/novel-writing/writing-skills/registry.ts`
- Modify: `ui/server/src/novel-writing/writing-skills/resolve-enabled.ts`
- Modify: `ui/server/src/novel-writing/writing-skills/resolve-enabled.test.ts`
- Modify: `ui/server/src/novel-writing/writing-skills/load-vendor.ts`
- Modify: `ui/server/src/novel-writing/writing-skills/index.ts`
- Create: `ui/server/src/novel-writing/writing-skills/registry-catalog.test.ts`

- [ ] **Step 1: Write failing catalog + resolve tests**

Create `registry-catalog.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { buildWritingSkillCatalog, resolveWritingSkillStageLabel } from './registry'

const NEWER_PACK = {
  id: 'my-style-pack',
  name: '我的文风包',
  description: '换文风',
  revision: 'a'.repeat(40),
  source_url: 'https://github.com/acme/My-Style-Pack',
  installed_at: '2026-08-14T02:00:00.000Z',
}
const OLDER_PACK = {
  ...NEWER_PACK,
  id: 'older-pack',
  name: '旧包',
  installed_at: '2026-08-14T01:00:00.000Z',
}

describe('writing skill catalog merge', () => {
  test('builtins keep fixed order, installed packs follow by installed_at asc', () => {
    const catalog = buildWritingSkillCatalog([NEWER_PACK, OLDER_PACK])
    expect(catalog.map(entry => entry.id)).toEqual([
      'fiction-humanizer-zh',
      'remove-ai-flavor',
      'humanizer-zh',
      'older-pack',
      'my-style-pack',
    ])
    expect(catalog[0]).toMatchObject({ builtin: true, supports_mode: true, default_enabled: true })
    expect(catalog[1]).toMatchObject({ builtin: true, supports_mode: false })
    expect(catalog[3]).toMatchObject({
      id: 'older-pack',
      label: '旧包',
      builtin: false,
      supports_mode: false,
      default_enabled: false,
      revision: 'a'.repeat(40),
      source_url: 'https://github.com/acme/My-Style-Pack',
      installed_at: '2026-08-14T01:00:00.000Z',
    })
  })

  test('drops installed entries that collide with builtin ids or have a bad shape', () => {
    const catalog = buildWritingSkillCatalog([
      { ...NEWER_PACK, id: 'fiction-humanizer-zh' },
      { ...NEWER_PACK, id: 'Bad_Id' },
    ])
    expect(catalog).toHaveLength(3)
  })

  test('stage label uses the pack name for installed skills, the id as fallback', () => {
    expect(resolveWritingSkillStageLabel('fiction-humanizer-zh')).toBe('写作skill · 小说去AI味')
    expect(resolveWritingSkillStageLabel('my-style-pack', [NEWER_PACK])).toBe('写作skill · 我的文风包')
    expect(resolveWritingSkillStageLabel('gone-pack', [NEWER_PACK])).toBe('写作skill · gone-pack')
  })
})
```

Add to `resolve-enabled.test.ts` (keep every existing case):

```ts
const INSTALLED = [
  { id: 'older-pack', installed_at: '2026-08-14T01:00:00.000Z' },
  { id: 'my-style-pack', installed_at: '2026-08-14T02:00:00.000Z' },
]

test('installed packs default to disabled and keep installed_at order when enabled', () => {
  const off = resolveWritingSkillsEnabled({ installed: INSTALLED })
  expect(off.enabled['my-style-pack']).toBe(false)
  expect(off.ids).toEqual(['fiction-humanizer-zh', 'remove-ai-flavor'])

  const on = resolveWritingSkillsEnabled({
    installed: INSTALLED,
    project: {
      reference_config: {
        writing_skills: {
          enabled: { 'my-style-pack': true, 'older-pack': true, 'humanizer-zh': true },
        },
      },
    },
  })
  expect(on.ids).toEqual([
    'fiction-humanizer-zh',
    'remove-ai-flavor',
    'humanizer-zh',
    'older-pack',
    'my-style-pack',
  ])
})

test('silently filters stale ids that are no longer installed', () => {
  const resolved = resolveWritingSkillsEnabled({
    project: { reference_config: { writing_skills: { enabled: { 'uninstalled-pack': true } } } },
  })
  expect(resolved.ids).toEqual(['fiction-humanizer-zh', 'remove-ai-flavor'])
  expect('uninstalled-pack' in resolved.enabled).toBe(false)
})

test('generation override can flip an installed pack on', () => {
  const resolved = resolveWritingSkillsEnabled({
    installed: INSTALLED,
    override: { enabled: { 'my-style-pack': true } },
  })
  expect(resolved.ids).toEqual(['fiction-humanizer-zh', 'remove-ai-flavor', 'my-style-pack'])
})
```

- [ ] **Step 2: Run and confirm FAIL**

Run: `cd ui/server && bun test src/novel-writing/writing-skills/registry-catalog.test.ts src/novel-writing/writing-skills/resolve-enabled.test.ts`

Expected: FAIL — `buildWritingSkillCatalog` / `resolveWritingSkillStageLabel` do not exist, `installed` is ignored.

- [ ] **Step 3: Implement types, registry, resolve**

`types.ts` — replace the id types (everything else stays):

```ts
export const WRITING_SKILL_IDS = [
  'fiction-humanizer-zh',
  'remove-ai-flavor',
  'humanizer-zh',
] as const

export type BuiltinWritingSkillId = typeof WRITING_SKILL_IDS[number]

// Widened for installed marketplace packs. Builtin special-case logic must
// key on BuiltinWritingSkillId literals, never on this alias.
export type WritingSkillId = string

export type WritingSkillEnabledMap = Record<string, boolean>

export type WritingSkillDefinition = {
  id: BuiltinWritingSkillId
  label: string
  description: string
  defaultEnabled: boolean
}

export type WritingSkillsInstalledInput = ReadonlyArray<{ id: string; installed_at?: string }>
```

and add `installed` to the resolve input:

```ts
export type WritingSkillsResolveInput = {
  project?: {
    reference_config?: {
      writing_skills?: WritingSkillsConfig
    }
  } | null
  override?: WritingSkillsConfig | Record<string, unknown> | null
  installed?: WritingSkillsInstalledInput
}
```

`WritingSkillPassReport.id` and `WritingSkillHumanizeReport.enabled_ids` keep type `WritingSkillId` (now `string`) — no edit needed beyond the alias change.

`registry.ts` — add (keep everything already there; `WRITING_SKILL_STAGE_LABEL` becomes `Record<BuiltinWritingSkillId, string>`):

```ts
import { WRITING_SKILL_PACK_ID_RE } from './installed-store'
import type { BuiltinWritingSkillId } from './types'

export { WRITING_SKILL_PACK_ID_RE }
export const WRITING_SKILL_PACK_LABEL_MAX = 40

export function isBuiltinWritingSkillId(value: unknown): value is BuiltinWritingSkillId {
  return typeof value === 'string' && (WRITING_SKILL_IDS as readonly string[]).includes(value)
}

// Legacy alias kept for existing call sites (revision-run-view, resolve-enabled).
export const isWritingSkillId = isBuiltinWritingSkillId

export function isWritingSkillPackIdShape(value: unknown): boolean {
  return typeof value === 'string' && WRITING_SKILL_PACK_ID_RE.test(value)
}

export type WritingSkillCatalogEntry = {
  id: string
  label: string
  description: string
  builtin: boolean
  supports_mode: boolean
  default_enabled: boolean
  revision?: string
  source_url?: string
  installed_at?: string
}

export function buildWritingSkillCatalog(
  installed: ReadonlyArray<{
    id: string
    name: string
    description: string
    revision: string
    source_url: string
    installed_at: string
  }> = [],
): WritingSkillCatalogEntry[] {
  const builtins: WritingSkillCatalogEntry[] = WRITING_SKILL_CATALOG.map(definition => ({
    id: definition.id,
    label: definition.label,
    description: definition.description,
    builtin: true,
    supports_mode: definition.id === 'fiction-humanizer-zh',
    default_enabled: definition.defaultEnabled,
  }))
  const packs: WritingSkillCatalogEntry[] = [...installed]
    .filter(pack => isWritingSkillPackIdShape(pack?.id) && !isBuiltinWritingSkillId(pack.id))
    .sort((a, b) => a.installed_at.localeCompare(b.installed_at) || a.id.localeCompare(b.id))
    .map(pack => ({
      id: pack.id,
      label: String(pack.name || pack.id).slice(0, WRITING_SKILL_PACK_LABEL_MAX),
      description: String(pack.description || '').slice(0, 500),
      builtin: false,
      supports_mode: false,
      default_enabled: false,
      revision: pack.revision,
      source_url: pack.source_url,
      installed_at: pack.installed_at,
    }))
  return [...builtins, ...packs]
}

export function resolveWritingSkillStageLabel(
  id: string,
  installed: ReadonlyArray<{ id: string; name?: string }> = [],
): string {
  if (isBuiltinWritingSkillId(id)) return WRITING_SKILL_STAGE_LABEL[id]
  const pack = installed.find(item => item.id === id)
  const name = String(pack?.name || id).slice(0, WRITING_SKILL_PACK_LABEL_MAX)
  return `写作skill · ${name}`
}
```

Note: `isWritingSkillId` was previously declared as a function in `registry.ts` — replace that declaration with the alias above (same behavior).

`resolve-enabled.ts` — full new body (imports first):

```ts
import {
  DEFAULT_FICTION_HUMANIZER_MODE,
  DEFAULT_WRITING_SKILLS_ENABLED,
  WRITING_SKILL_IDS,
  isBuiltinWritingSkillId,
  isFictionHumanizerMode,
  isWritingSkillPackIdShape,
} from './registry'
import type {
  FictionHumanizerMode,
  ResolvedWritingSkills,
  WritingSkillEnabledMap,
  WritingSkillsConfig,
  WritingSkillsInstalledInput,
  WritingSkillsResolveInput,
} from './types'

function asEnabledRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (record.enabled && typeof record.enabled === 'object' && !Array.isArray(record.enabled)) {
    return record.enabled as Record<string, unknown>
  }
  return record
}

function asConfigRecord(value: unknown): WritingSkillsConfig | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as WritingSkillsConfig
}

function resolveMode(...layers: Array<unknown>): FictionHumanizerMode {
  let mode = DEFAULT_FICTION_HUMANIZER_MODE
  for (const layer of layers) {
    const config = asConfigRecord(layer)
    if (isFictionHumanizerMode(config?.fiction_humanizer_mode)) {
      mode = config.fiction_humanizer_mode
    }
  }
  return mode
}

function sortedInstalledIds(installed: WritingSkillsInstalledInput | undefined): string[] {
  return [...(installed || [])]
    .filter(pack => isWritingSkillPackIdShape(pack?.id) && !isBuiltinWritingSkillId(pack.id))
    .sort((a, b) => String(a.installed_at || '').localeCompare(String(b.installed_at || '')) || a.id.localeCompare(b.id))
    .map(pack => pack.id)
}

function mergeEnabledFlags(
  base: WritingSkillEnabledMap,
  incoming: Record<string, unknown> | null,
  ids: readonly string[],
): WritingSkillEnabledMap {
  if (!incoming) return { ...base }
  const next = { ...base }
  for (const id of ids) {
    if (!Object.prototype.hasOwnProperty.call(incoming, id)) continue
    if (typeof incoming[id] !== 'boolean') continue
    next[id] = incoming[id]
  }
  return next
}

export function pickWritingSkillsOverride(options: any): WritingSkillsResolveInput['override'] {
  return options?.writing_skills ?? options?.writingSkills ?? null
}

function resolveProjectModelId(projectWritingSkills: unknown): number | undefined {
  const config = asConfigRecord(projectWritingSkills)
  const value = config?.model_id
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined
}

export function resolveWritingSkillsEnabled(
  input: WritingSkillsResolveInput = {},
): ResolvedWritingSkills {
  const installedIds = sortedInstalledIds(input.installed)
  const catalogIds: string[] = [...WRITING_SKILL_IDS, ...new Set(installedIds)]
  const defaults: WritingSkillEnabledMap = {
    ...DEFAULT_WRITING_SKILLS_ENABLED,
    ...Object.fromEntries(installedIds.map(id => [id, false] as const)),
  }
  const projectWritingSkills = input.project?.reference_config?.writing_skills
  const projectEnabled = asEnabledRecord(projectWritingSkills)
  const overrideEnabled = asEnabledRecord(input.override)
  const enabled = mergeEnabledFlags(
    mergeEnabledFlags(defaults, projectEnabled, catalogIds),
    overrideEnabled,
    catalogIds,
  )
  const modelId = resolveProjectModelId(projectWritingSkills)
  return {
    enabled,
    ids: catalogIds.filter(id => enabled[id]),
    fiction_humanizer_mode: resolveMode(projectWritingSkills, input.override),
    ...(modelId !== undefined ? { model_id: modelId } : {}),
  }
}

export function normalizeWritingSkillsEnabled(
  value: unknown,
  installed: WritingSkillsInstalledInput = [],
): WritingSkillEnabledMap {
  const installedIds = sortedInstalledIds(installed)
  const defaults: WritingSkillEnabledMap = {
    ...DEFAULT_WRITING_SKILLS_ENABLED,
    ...Object.fromEntries(installedIds.map(id => [id, false] as const)),
  }
  return mergeEnabledFlags(defaults, asEnabledRecord(value), [...WRITING_SKILL_IDS, ...installedIds])
}
```

`load-vendor.ts` — change the id typing only (`SKILL_DIR: Record<BuiltinWritingSkillId, string>`, `REFERENCE_FILES: Record<BuiltinWritingSkillId, readonly string[]>`, `loadVendorSkillMarkdown(id: BuiltinWritingSkillId, referenceFile?: string)`), importing `BuiltinWritingSkillId` from `./types`.

`index.ts` — add to the existing re-exports:

```ts
export {
  WRITING_SKILL_PACK_ID_RE,
  WRITING_SKILL_PACK_LABEL_MAX,
  buildWritingSkillCatalog,
  isBuiltinWritingSkillId,
  isWritingSkillPackIdShape,
  resolveWritingSkillStageLabel,
} from './registry'
export type { WritingSkillCatalogEntry } from './registry'
export type { BuiltinWritingSkillId, WritingSkillsInstalledInput } from './types'
```

- [ ] **Step 4: Re-run the tests plus the neighbours that share these types**

Run:

```
cd ui/server && bun test \
  src/novel-writing/writing-skills/registry-catalog.test.ts \
  src/novel-writing/writing-skills/resolve-enabled.test.ts \
  src/novel-writing/writing-skills/load-vendor.test.ts \
  src/novel-writing/writing-skills/accept-candidate.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit** (skip unless the user asked)

---

### Task 4: Installed-pack loader and generic compile path

**Files:**
- Create: `ui/server/src/novel-writing/writing-skills/load-installed.ts`
- Test: `ui/server/src/novel-writing/writing-skills/load-installed.test.ts`
- Modify: `ui/server/src/novel-writing/writing-skills/compile-pass-prompt.ts`
- Modify: `ui/server/src/novel-writing/writing-skills/compile-pass-prompt.test.ts`
- Modify: `ui/server/src/novel-writing/writing-skills/index.ts`

- [ ] **Step 1: Write failing loader + compile tests**

Create `load-installed.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { InstalledWritingSkillPack } from './installed-store'
import { loadInstalledWritingSkillPrompt, stripInstalledSkillFrontmatter } from './load-installed'

async function fixturePack(): Promise<InstalledWritingSkillPack> {
  const dir = join(await mkdtemp(join(tmpdir(), 'wsk-load-')), 'my-style-pack')
  await mkdir(join(dir, 'references'), { recursive: true })
  await writeFile(join(dir, 'SKILL.md'), '---\nname: 我的文风包\ndescription: 换文风\n---\n# My Style\n只改语气，不改剧情。')
  await writeFile(join(dir, 'references', 'b.md'), '参考乙')
  await writeFile(join(dir, 'references', 'a.md'), '参考甲')
  return {
    id: 'my-style-pack',
    name: '我的文风包',
    description: '换文风',
    source_url: 'https://github.com/acme/My-Style-Pack',
    owner: 'acme',
    repo: 'My-Style-Pack',
    revision: 'a'.repeat(40),
    installed_at: '2026-08-14T00:00:00.000Z',
    dir,
    reference_files: ['b.md', 'a.md'],
  }
}

describe('installed skill loader', () => {
  test('strips only frontmatter and keeps the full body', () => {
    expect(stripInstalledSkillFrontmatter('---\nname: x\n---\n# Title\n\n## Star\n正文保留')).toBe('# Title\n\n## Star\n正文保留')
    expect(stripInstalledSkillFrontmatter('# No Frontmatter')).toBe('# No Frontmatter')
  })

  test('loads SKILL.md without frontmatter and references sorted by filename', async () => {
    const prompt = loadInstalledWritingSkillPrompt(await fixturePack())
    expect(prompt.id).toBe('my-style-pack')
    expect(prompt.name).toBe('我的文风包')
    expect(prompt.skill_markdown).toContain('# My Style')
    expect(prompt.skill_markdown).not.toContain('name: 我的文风包')
    expect(prompt.references.map(reference => reference.file)).toEqual(['a.md', 'b.md'])
    expect(prompt.references[0].text).toBe('参考甲')
  })
})
```

Add to `compile-pass-prompt.test.ts` (keep every existing case):

```ts
const INSTALLED_PROMPT = {
  id: 'my-style-pack',
  name: '我的文风包',
  skill_markdown: '# My Style\n只改语气，不改剧情。',
  references: [
    { file: 'a.md', text: '参考甲' },
    { file: 'b.md', text: '参考乙' },
  ],
}

test('installed skills compile through the generic path with full SKILL.md and all references', () => {
  const prompt = compileWritingSkillPassPrompt({
    skillId: 'my-style-pack',
    sourceText: SOURCE,
    installed: INSTALLED_PROMPT,
  })
  expect(prompt).toContain('我的文风包')
  expect(prompt).toContain('# My Style')
  expect(prompt).toContain('【参考 · a.md】')
  expect(prompt).toContain('【参考 · b.md】')
  expect(prompt.indexOf('【参考 · a.md】')).toBeLessThan(prompt.indexOf('【参考 · b.md】'))
  expect(prompt).toContain('只输出改写后正文')
  expect(prompt).toContain(SOURCE)
  expect(prompt).not.toContain('档位：')
  expect(prompt).not.toContain('【小说安全套 · humanizer-zh】')
})

test('installed skills without a loaded payload throw instead of silently compiling', () => {
  expect(() => compileWritingSkillPassPrompt({
    skillId: 'my-style-pack',
    sourceText: SOURCE,
  })).toThrow('missing installed skill payload')
})
```

- [ ] **Step 2: Run and confirm FAIL**

Run:

```
cd ui/server && bun test \
  src/novel-writing/writing-skills/load-installed.test.ts \
  src/novel-writing/writing-skills/compile-pass-prompt.test.ts
```

Expected: FAIL — `./load-installed` missing, `installed` input unknown to the compiler.

- [ ] **Step 3: Implement loader and compiler branch**

`load-installed.ts`:

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { InstalledWritingSkillPack } from './installed-store'

export type InstalledWritingSkillPrompt = {
  id: string
  name: string
  skill_markdown: string
  references: Array<{ file: string; text: string }>
}

export function stripInstalledSkillFrontmatter(raw: string): string {
  return String(raw || '')
    .replace(/^\uFEFF/, '')
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
    .trim()
}

export function loadInstalledWritingSkillPrompt(pack: InstalledWritingSkillPack): InstalledWritingSkillPrompt {
  const skillMarkdown = stripInstalledSkillFrontmatter(readFileSync(join(pack.dir, 'SKILL.md'), 'utf8'))
  const references = [...pack.reference_files]
    .sort((a, b) => a.localeCompare(b))
    .map(file => ({
      file,
      text: readFileSync(join(pack.dir, 'references', file), 'utf8').trim(),
    }))
  return { id: pack.id, name: pack.name, skill_markdown: skillMarkdown, references }
}
```

`compile-pass-prompt.ts` — add the `installed` input and route non-builtin ids to a generic compiler; the builtin body stays byte-for-byte as it is today, only narrowed behind `isBuiltinWritingSkillId`:

```ts
import { loadVendorSkillMarkdown } from './load-vendor'
import { isBuiltinWritingSkillId } from './registry'
import type { InstalledWritingSkillPrompt } from './load-installed'
import type { FictionHumanizerMode, WritingSkillId } from './types'

// SHARED_FICTION_CONTRACT, HUMANIZER_ZH_FICTION_SAFETY, resolveGenre, modeLines: unchanged.

type CompileWritingSkillPassPromptInput = {
  skillId: WritingSkillId
  mode?: FictionHumanizerMode
  sourceText: string
  project?: any
  contextPackage?: any
  chunk?: { index: number; total: number }
  installed?: InstalledWritingSkillPrompt
}

function chunkLine(chunk?: { index: number; total: number }): string {
  return chunk && chunk.total > 1
    ? `这是第 ${chunk.index + 1}/${chunk.total} 段，前后文已锁定，不要改本章未给出的情节。`
    : ''
}

function compileInstalledSkillPassPrompt(input: CompileWritingSkillPassPromptInput): string {
  const installed = input.installed
  if (!installed || installed.id !== input.skillId) {
    throw new Error(`missing installed skill payload for ${input.skillId}`)
  }
  const title = input.project?.title ? `项目：${input.project.title}` : ''
  const parts = [
    `任务：按写作 skill「${installed.name}」（${installed.id}）对小说正文做改写。只输出改写后正文。`,
    title,
    ...SHARED_FICTION_CONTRACT,
    chunkLine(input.chunk),
    '【SKILL.md】',
    installed.skill_markdown,
  ]
  for (const reference of installed.references) {
    parts.push(`【参考 · ${reference.file}】`, reference.text)
  }
  parts.push('【原文】', String(input.sourceText || '').trim())
  return parts.filter(Boolean).join('\n')
}

export function compileWritingSkillPassPrompt(input: CompileWritingSkillPassPromptInput): string {
  const skillId = input.skillId
  if (!isBuiltinWritingSkillId(skillId)) return compileInstalledSkillPassPrompt(input)
  const mode = input.mode === 'rewrite' ? 'rewrite' : 'polish'
  const title = input.project?.title ? `项目：${input.project.title}` : ''
  const parts = [
    `任务：按 ${skillId} 对小说正文做去 AI 味改写。只输出改写后正文。`,
    title,
    skillId === 'fiction-humanizer-zh' ? modeLines(mode).join('') : '',
    ...SHARED_FICTION_CONTRACT,
    chunkLine(input.chunk),
    '【SKILL.md】',
    loadVendorSkillMarkdown(skillId),
  ]
  if (skillId === 'fiction-humanizer-zh') {
    for (const file of ['ai-fiction-patterns.md', 'scene-rewrite.md', 'chapter-checklist.md']) {
      parts.push(`【参考 · ${file}】`, loadVendorSkillMarkdown('fiction-humanizer-zh', file))
    }
    if (resolveGenre(input.project, input.contextPackage)) {
      parts.push('【参考 · genre-notes.md】', loadVendorSkillMarkdown('fiction-humanizer-zh', 'genre-notes.md'))
    }
  }
  if (skillId === 'humanizer-zh') parts.push(...HUMANIZER_ZH_FICTION_SAFETY)
  parts.push('【原文】', String(input.sourceText || '').trim())
  return parts.filter(Boolean).join('\n')
}

// compileWritingSkillRevisionDirectives stays as the '' stub it is today.
```

`index.ts` — add:

```ts
export { loadInstalledWritingSkillPrompt, stripInstalledSkillFrontmatter } from './load-installed'
export type { InstalledWritingSkillPrompt } from './load-installed'
export { listInstalledWritingSkillPacks, getInstalledWritingSkillNameMap, invalidateInstalledWritingSkillPackCache } from './installed-store'
export type { InstalledWritingSkillPack } from './installed-store'
```

- [ ] **Step 4: Re-run loader + compile tests**

Run the Step 2 command.

Expected: PASS (existing builtin compile cases included).

- [ ] **Step 5: Commit** (skip unless the user asked)

---

### Task 5: Runner, progress labels, run-view projection, storage regression

**Files:**
- Modify: `ui/server/src/novel-writing-service/service/writing-skill-humanize-methods.ts`
- Modify: `ui/server/src/novel-writing-service/service/writing-skill-humanize-methods.test.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-post-draft-finalize.ts`
- Modify: `ui/server/src/routes/novel-editor/revision-run-view.ts`
- Modify: `ui/server/src/routes/novel-editor/revision-run-view.test.ts`
- Modify: `ui/server/src/routes/novel-run-routes.ts`
- Modify: `ui/server/src/routes/novel-editor/register-revision.ts`
- Modify: `ui/server/src/novel-writing/chapter-prose-storage-patch.test.ts`

- [ ] **Step 1: Write failing runner + projection + storage tests**

Add to `writing-skill-humanize-methods.test.ts` (reuse the existing `makeMethods`, `SOURCE`, `PASS_A`, `PASS_B`, `standardTarget` fixtures; add imports `mkdir`, `mkdtemp`, `writeFile` from `node:fs/promises`, `tmpdir` from `node:os`, `join` from `node:path`, and `invalidateInstalledWritingSkillPackCache` from `../../novel-writing/writing-skills/installed-store`):

```ts
async function installFixturePack(workspace: string) {
  const dir = join(workspace, '.mangaforge', 'writing-skill-packs', 'my-style-pack')
  await mkdir(join(dir, 'references'), { recursive: true })
  await writeFile(join(dir, 'SKILL.md'), '---\nname: 我的文风包\n---\n# My Style\n只改语气，不改剧情。')
  await writeFile(join(dir, 'references', 'a.md'), '参考甲')
  await writeFile(join(dir, 'pack.json'), JSON.stringify({
    id: 'my-style-pack',
    source_url: 'https://github.com/acme/My-Style-Pack',
    owner: 'acme',
    repo: 'My-Style-Pack',
    revision: 'a'.repeat(40),
    installed_at: '2026-08-14T00:00:00.000Z',
    name: '我的文风包',
    description: '换文风',
  }))
  invalidateInstalledWritingSkillPackCache()
}

test('runs an installed pack after the builtins with the generic prompt and pack-name label', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'wsk-runner-'))
  await installFixturePack(workspace)
  const { methods, calls } = makeMethods(task => (task.includes('# My Style') ? PASS_B : PASS_A))
  const progress: Array<[string, string | undefined]> = []
  const result = await methods.runWritingSkillHumanizePass(
    workspace,
    {
      reference_config: {
        writing_skills: {
          enabled: {
            'remove-ai-flavor': false,
            'humanizer-zh': false,
            'my-style-pack': true,
          },
        },
      },
    },
    standardTarget,
    SOURCE,
    undefined,
    {
      onSkillProgress: async (id: string, meta?: { label?: string }) => {
        progress.push([id, meta?.label])
      },
    },
  )
  expect(calls).toHaveLength(2)
  expect(calls[1]).toContain('# My Style')
  expect(calls[1]).toContain('【参考 · a.md】')
  expect(calls[1]).not.toContain('name: 我的文风包')
  expect(progress).toEqual([
    ['fiction-humanizer-zh', '写作skill · 小说去AI味'],
    ['my-style-pack', '写作skill · 我的文风包'],
  ])
  expect(result.final_text).toBe(PASS_B)
  expect(result.report.enabled_ids).toEqual(['fiction-humanizer-zh', 'my-style-pack'])
  expect(result.report.passes.map(pass => pass.id)).toEqual(['fiction-humanizer-zh', 'my-style-pack'])
})

test('skips an installed pack whose files disappeared before the pass started', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'wsk-runner-'))
  const { methods, calls } = makeMethods(() => PASS_A)
  const result = await methods.runWritingSkillHumanizePass(
    workspace,
    {
      reference_config: {
        writing_skills: {
          enabled: {
            'remove-ai-flavor': false,
            'humanizer-zh': false,
            'my-style-pack': true, // stale project config; nothing on disk
          },
        },
      },
    },
    standardTarget,
    SOURCE,
  )
  expect(calls).toHaveLength(1) // only fiction-humanizer-zh ran
  expect(result.report.enabled_ids).toEqual(['fiction-humanizer-zh'])
})
```

In `revision-run-view.test.ts`:

1. In the `test.each` invalid-skill-progress table, replace the row `{ name: 'unknown skill id', skill_progress: { skill_id: 'evil-skill', index: 1, total: 2 } }` with `{ name: 'malformed skill id', skill_progress: { skill_id: 'Evil_Skill!', index: 1, total: 2 } }` (id-shaped unknown ids are now valid).
2. Add:

```ts
test('projects installed skill progress using the server-side pack name', () => {
  const checkpoint = initialCheckpoint()
  checkpoint.phases.generate_candidate = {
    status: 'running',
    attempt: 1,
    started_at: '2030-01-01T00:00:00.500Z',
  }
  ;(checkpoint as any).skill_progress = {
    skill_id: 'my-style-pack',
    index: 4,
    total: 4,
    label: 'EVIL_STORED_LABEL',
  }
  const view = buildPublicEditorRevisionRun(runWithCheckpoint(checkpoint), {
    installedSkillNames: { 'my-style-pack': '我的文风包' },
  })
  expect((view as any).skill_progress).toMatchObject({
    skill_id: 'my-style-pack',
    index: 4,
    total: 4,
    label: '我的文风包',
  })
  expect(JSON.stringify(view)).not.toContain('EVIL_STORED_LABEL')
})

test('falls back to the bounded id when the installed pack is unknown', () => {
  const checkpoint = initialCheckpoint()
  checkpoint.phases.generate_candidate = {
    status: 'running',
    attempt: 1,
    started_at: '2030-01-01T00:00:00.500Z',
  }
  ;(checkpoint as any).skill_progress = { skill_id: 'gone-pack', index: 1, total: 1 }
  const view = buildPublicEditorRevisionRun(runWithCheckpoint(checkpoint))
  expect((view as any).skill_progress?.label).toBe('gone-pack')
})
```

Add to `chapter-prose-storage-patch.test.ts` (production code is already bounded-string safe; this pins the contract):

```ts
test('keeps installed writing-skill ids as bounded strings in the persisted report', () => {
  const normalized = normalizeWritingSkillHumanizeForStorage({
    version: 'writing_skill_humanize_v2',
    enabled_ids: ['fiction-humanizer-zh', 'my-style-pack'],
    passes: [{ id: 'my-style-pack', accepted: true, before_chars: 100, after_chars: 120, chunk_count: 1 }],
  })
  expect(normalized?.enabled_ids).toEqual(['fiction-humanizer-zh', 'my-style-pack'])
  expect(normalized?.passes?.[0]).toMatchObject({ id: 'my-style-pack', accepted: true })
})
```

(Import `normalizeWritingSkillHumanizeForStorage` from `./chapter-prose-storage-patch` if the test file does not already.)

- [ ] **Step 2: Run and confirm FAIL**

Run:

```
cd ui/server && bun test \
  src/novel-writing-service/service/writing-skill-humanize-methods.test.ts \
  src/routes/novel-editor/revision-run-view.test.ts \
  src/novel-writing/chapter-prose-storage-patch.test.ts
```

Expected: FAIL — runner ignores installed packs and sends no `label`; run view rejects non-builtin ids. The storage test may already pass; that is fine.

- [ ] **Step 3: Implement**

`writing-skill-humanize-methods.ts`:

Add imports:

```ts
import {
  isBuiltinWritingSkillId,
  listInstalledWritingSkillPacks,
  loadInstalledWritingSkillPrompt,
  resolveWritingSkillStageLabel,
  type InstalledWritingSkillPack,
  type InstalledWritingSkillPrompt,
} from '../../novel-writing/writing-skills'
```

`rewriteChunk` input gains `installedPrompt?: InstalledWritingSkillPrompt`; the compile call becomes:

```ts
const task = compileWritingSkillPassPrompt({
  skillId,
  mode,
  sourceText: chunk.text,
  project,
  contextPackage,
  chunk,
  installed: input.installedPrompt,
})
```

In `runWritingSkillHumanizePass`, before resolving:

```ts
let installedPacks: InstalledWritingSkillPack[] = []
try {
  installedPacks = await listInstalledWritingSkillPacks(activeWorkspace)
} catch {
  installedPacks = []
}
const resolved = resolveWritingSkillsEnabled({
  project,
  override: pickWritingSkillsOverride(options),
  installed: installedPacks,
})
```

The full pass loop becomes (only the marked lines are new; the accept/fingerprint/report logic is identical to today):

```ts
for (const [passIndex, id] of resolved.ids.entries()) {
  throwIfAborted(options)
  let installedPrompt: InstalledWritingSkillPrompt | undefined            // new
  if (!isBuiltinWritingSkillId(id)) {                                     // new
    const pack = installedPacks.find(item => item.id === id)              // new
    try {                                                                 // new
      installedPrompt = pack ? loadInstalledWritingSkillPrompt(pack) : undefined // new
    } catch {                                                             // new
      installedPrompt = undefined                                         // new
    }                                                                     // new
    // Uninstalled between resolve and pass start: treat as "not enabled" and skip.
    if (!installedPrompt) continue                                        // new
  }                                                                       // new
  await options.onSkillProgress?.(id, {
    index: passIndex + 1,
    total: resolved.ids.length,
    label: resolveWritingSkillStageLabel(id, installedPacks),             // new
  })
  const passInput = currentText
  const beforeChars = countProseChars(passInput)
  const chunks = chunkWritingSkillChapter(passInput)
  try {
    const rewritten: string[] = []
    for (const chunk of chunks) {
      const chunkText = await rewriteChunk({
        activeWorkspace,
        project,
        contextPackage,
        chunk,
        skillId: id,
        mode: resolved.fiction_humanizer_mode,
        wordTarget,
        modelId,
        skillModelId: resolved.model_id,
        installedPrompt,                                                  // new
        options,
      })
      if (!chunkText) throw new Error('writing_skill_empty_candidate')
      rewritten.push(chunkText)
    }
    const gate = acceptWritingSkillCandidate({
      sourceText: passInput,
      candidateText: rewritten.join('\n\n'),
      enabledIds: [id],
      wordTarget,
      contextPackage,
    })
    if (!gate.accepted) {
      passes.push({
        id,
        ...(id === 'fiction-humanizer-zh' ? { mode: resolved.fiction_humanizer_mode } : {}),
        accepted: false,
        reason: gate.reason,
        before_chars: beforeChars,
        after_chars: beforeChars,
        chunk_count: chunks.length,
      })
      continue
    }

    currentText = gate.text
    const fingerprint = fingerprintSelect(passInput, currentText, { stage: 'writing_skill_humanize' })
    if (!fingerprint.accepted) {
      warnings.push(fingerprint.reason || 'writing_skill_fingerprint')
    } else {
      currentText = fingerprint.text
    }
    passes.push({
      id,
      ...(id === 'fiction-humanizer-zh' ? { mode: resolved.fiction_humanizer_mode } : {}),
      accepted: true,
      before_chars: beforeChars,
      after_chars: countProseChars(currentText),
      chunk_count: chunks.length,
    })
  } catch (error: any) {
    if (isChapterTaskCancellation(error)) throw error
    currentText = passInput
    passes.push({
      id,
      ...(id === 'fiction-humanizer-zh' ? { mode: resolved.fiction_humanizer_mode } : {}),
      accepted: false,
      reason: redactAndBoundCredentialText(
        String(error?.message || error || ''),
        240,
      ) || 'writing_skill_pass_failed',
      before_chars: beforeChars,
      after_chars: beforeChars,
      chunk_count: chunks.length,
    })
  }
}
```

The per-pass `installedPrompt` is read once before the chunk loop, so a mid-pass uninstall keeps using in-memory text (spec 失败与安全 section). The final report block is unchanged.

`generate-chapter-post-draft-finalize.ts` — the `onSkillProgress` callback becomes:

```ts
onSkillProgress: async (skillId: string, progress?: { index?: number; total?: number; label?: string }) => {
  const skillIndex = Number(progress?.index)
  const skillTotal = Number(progress?.total)
  const hasCounter = Number.isInteger(skillIndex) && Number.isInteger(skillTotal)
    && skillIndex >= 1 && skillTotal >= 1
  const baseLabel = String(
    progress?.label
    || WRITING_SKILL_STAGE_LABEL[skillId as BuiltinWritingSkillId]
    || skillId,
  ).slice(0, 60)
  await onStage('writing_skill_humanize', {
    status: 'running',
    skill_id: skillId,
    label: hasCounter ? `${baseLabel}（${skillIndex}/${skillTotal}）` : baseLabel,
    ...(hasCounter ? { skill_index: skillIndex, skill_total: skillTotal } : {}),
  })
},
```

Change the file’s `type WritingSkillId` import to `type BuiltinWritingSkillId` (from `../../novel-writing/writing-skills`).

`revision-run-view.ts`:

```ts
import {
  WRITING_SKILL_IDS,
  WRITING_SKILL_STAGE_LABEL,
  type BuiltinWritingSkillId,
} from '../../novel-writing/writing-skills'

const INSTALLED_SKILL_PROGRESS_ID = /^[a-z0-9][a-z0-9-]{0,63}$/
const MAX_SKILL_PROGRESS_COUNT = 16
const MAX_SKILL_PROGRESS_LABEL = 60

export type EditorRevisionRunViewOptions = {
  installedSkillNames?: Record<string, string>
}

function safeSkillProgress(
  value: unknown,
  options?: EditorRevisionRunViewOptions,
): NonNullable<PublicEditorRevisionRun['skill_progress']> | null {
  const progress = parseJsonObject(value)
  if (!progress) return null
  const skillId = progress.skill_id
  if (typeof skillId !== 'string') return null
  const builtin = (WRITING_SKILL_IDS as readonly string[]).includes(skillId)
  if (!builtin && !INSTALLED_SKILL_PROGRESS_ID.test(skillId)) return null
  const index = finiteInteger(progress.index)
  const total = finiteInteger(progress.total)
  if (index === null || total === null
    || index < 1 || index > MAX_SKILL_PROGRESS_COUNT
    || total < 1 || total > MAX_SKILL_PROGRESS_COUNT
    || index > total) return null
  const startedAt = safeString(progress.started_at, 80)
  const startedDate = new Date(startedAt)
  const label = builtin
    ? WRITING_SKILL_STAGE_LABEL[skillId as BuiltinWritingSkillId]
    : safeString(options?.installedSkillNames?.[skillId] || skillId, MAX_SKILL_PROGRESS_LABEL)
  return {
    skill_id: skillId,
    index,
    total,
    label,
    ...(startedAt && Number.isFinite(startedDate.getTime()) ? { started_at: startedDate.toISOString() } : {}),
  }
}
```

`buildPublicEditorRevisionRun(run: NovelRunRecord, options?: EditorRevisionRunViewOptions)` threads `options` into `safeSkillProgress(checkpoint.skill_progress, options)`. `buildEditorRevisionDiagnostics(run, options?)` forwards `options` to its internal `buildPublicEditorRevisionRun` call. Both parameters are optional so untouched callers still compile.

Callers — in `ui/server/src/routes/novel-run-routes.ts` and `ui/server/src/routes/novel-editor/register-revision.ts`, for each handler that calls `buildPublicEditorRevisionRun`, fetch the name map once per request and pass it:

```ts
import { getInstalledWritingSkillNameMap } from '../novel-writing/writing-skills'
// (in register-revision.ts the relative path is '../../novel-writing/writing-skills')

const installedSkillNames = await getInstalledWritingSkillNameMap(ctx.getWorkspace())
...
buildPublicEditorRevisionRun(run, { installedSkillNames })
```

Update every call site in those two files (list/get/dashboard-normalize in `novel-run-routes.ts`; the status GET, cancel, closure, and retry responses in `register-revision.ts`). The store cache makes this cheap. Where a handler builds many runs, fetch the map once before the loop.

`chapter-prose-storage-patch.ts`: no production change — `normalizePersistedHumanizeString` already persists ids as 240-char bounded strings.

- [ ] **Step 4: Re-run Step 2 plus the surrounding integration tests**

```
cd ui/server && bun test \
  src/novel-writing-service/service/writing-skill-humanize-methods.test.ts \
  src/routes/novel-editor/revision-run-view.test.ts \
  src/novel-writing/chapter-prose-storage-patch.test.ts \
  src/novel-writing-service/service/generate-chapter-post-draft-finalize.test.ts \
  src/routes/novel-editor/revision-worker.test.ts
```

Expected: PASS. If `generate-chapter-post-draft-finalize.test.ts` asserts the old two-argument `onSkillProgress` shape, extend the mock’s meta object with `label` — the assertions on emitted labels stay valid because builtin labels are unchanged.

- [ ] **Step 5: Commit** (skip unless the user asked)

---

### Task 6: HTTP routes — catalog / install / delete + config routes learn installed ids

**Files:**
- Create: `ui/server/src/routes/novel-writing-skill-routes.ts`
- Test: `ui/server/src/routes/novel-writing-skill-routes.test.ts`
- Modify: `ui/server/src/routes/novel.ts`
- Modify: `ui/server/src/routes/novel-project-config-routes.ts`
- Modify: `ui/server/src/routes/novel-project-config-routes.test.ts`

- [ ] **Step 1: Write failing route tests**

Create `novel-writing-skill-routes.test.ts` (harness mirrors `novel-project-config-routes.test.ts`, plus a `delete` method):

```ts
import { afterEach, describe, expect, test } from 'bun:test'
import JSZip from 'jszip'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { invalidateInstalledWritingSkillPackCache } from '../novel-writing/writing-skills/installed-store'
import { registerNovelWritingSkillRoutes } from './novel-writing-skill-routes'

const workspaces: string[] = []

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

function routeHarness() {
  const handlers = new Map<string, any>()
  const app: any = {}
  for (const method of ['get', 'put', 'post', 'delete']) {
    app[method] = (path: string, handler: any) => {
      handlers.set(`${method.toUpperCase()} ${path}`, handler)
      return app
    }
  }
  return { app, handlers }
}

async function callRoute(handler: any, req: any) {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) { this.statusCode = code; return this },
    json(body: any) { this.body = body; return this },
  }
  await handler(req, res)
  return res
}

const SHA = '0123456789abcdef0123456789abcdef01234567'

async function packArchive() {
  const zip = new JSZip()
  zip.file('My-Style-Pack-main/SKILL.md', '---\nname: 我的文风包\ndescription: 换文风\n---\n# My Style\n只改语气。')
  zip.file('My-Style-Pack-main/references/a.md', '参考甲')
  return zip.generateAsync({ type: 'uint8array' })
}

function githubFetch(archive: Uint8Array) {
  return async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.endsWith('/commits/HEAD')) {
      return new Response(JSON.stringify({ sha: SHA }), { status: 200 })
    }
    if (url === `https://codeload.github.com/acme/My-Style-Pack/zip/${SHA}`) return new Response(archive)
    return new Response('{}', { status: 404 })
  }
}

describe('novel writing skill routes', () => {
  test('catalog lists builtins first, then installed by installed_at; install and delete round-trip', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'wsk-routes-'))
    workspaces.push(workspace)
    invalidateInstalledWritingSkillPackCache()
    const { app, handlers } = routeHarness()
    registerNovelWritingSkillRoutes(app, {
      getWorkspace: () => workspace,
      fetchImpl: githubFetch(await packArchive()),
    })

    const empty = await callRoute(handlers.get('GET /api/novel/writing-skills/catalog'), {})
    expect(empty.statusCode).toBe(200)
    expect(empty.body.ok).toBe(true)
    expect(empty.body.skills.map((skill: any) => skill.id)).toEqual([
      'fiction-humanizer-zh',
      'remove-ai-flavor',
      'humanizer-zh',
    ])
    expect(empty.body.skills[0]).toMatchObject({ builtin: true, supports_mode: true })
    expect(empty.body.skills[2]).toMatchObject({ builtin: true, supports_mode: false })

    const installed = await callRoute(handlers.get('POST /api/novel/writing-skills/install'), {
      body: { url: 'https://github.com/acme/My-Style-Pack' },
    })
    expect(installed.statusCode).toBe(200)
    expect(installed.body.ok).toBe(true)
    expect(installed.body.skill).toMatchObject({
      id: 'my-style-pack',
      label: '我的文风包',
      builtin: false,
      supports_mode: false,
      revision: SHA,
      source_url: 'https://github.com/acme/My-Style-Pack',
    })

    const catalog = await callRoute(handlers.get('GET /api/novel/writing-skills/catalog'), {})
    expect(catalog.body.skills.map((skill: any) => skill.id)).toEqual([
      'fiction-humanizer-zh',
      'remove-ai-flavor',
      'humanizer-zh',
      'my-style-pack',
    ])

    const removed = await callRoute(handlers.get('DELETE /api/novel/writing-skills/:id'), {
      params: { id: 'my-style-pack' },
    })
    expect(removed.statusCode).toBe(200)
    expect(removed.body).toEqual({ ok: true })
    const after = await callRoute(handlers.get('GET /api/novel/writing-skills/catalog'), {})
    expect(after.body.skills).toHaveLength(3)
  })

  test('install maps error codes: INVALID_URL 400, DOWNLOAD_FAILED 502', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'wsk-routes-'))
    workspaces.push(workspace)
    invalidateInstalledWritingSkillPackCache()
    const { app, handlers } = routeHarness()
    registerNovelWritingSkillRoutes(app, {
      getWorkspace: () => workspace,
      fetchImpl: async () => new Response('{}', { status: 500 }),
    })
    const install = handlers.get('POST /api/novel/writing-skills/install')

    const invalid = await callRoute(install, { body: { url: 'https://gitlab.com/acme/demo' } })
    expect(invalid.statusCode).toBe(400)
    expect(invalid.body.error_code).toBe('INVALID_URL')

    const conflict = await callRoute(install, { body: { url: 'https://github.com/acme/fiction-humanizer-zh' } })
    expect(conflict.statusCode).toBe(400)
    expect(conflict.body.error_code).toBe('ID_CONFLICT_BUILTIN')

    const download = await callRoute(install, { body: { url: 'https://github.com/acme/My-Style-Pack' } })
    expect(download.statusCode).toBe(502)
    expect(download.body.error_code).toBe('DOWNLOAD_FAILED')
  })

  test('delete refuses builtins with 400 and missing packs with 404', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'wsk-routes-'))
    workspaces.push(workspace)
    invalidateInstalledWritingSkillPackCache()
    const { app, handlers } = routeHarness()
    registerNovelWritingSkillRoutes(app, { getWorkspace: () => workspace })
    const remove = handlers.get('DELETE /api/novel/writing-skills/:id')

    const builtin = await callRoute(remove, { params: { id: 'humanizer-zh' } })
    expect(builtin.statusCode).toBe(400)
    expect(builtin.body.error_code).toBe('BUILTIN_NOT_REMOVABLE')

    const missing = await callRoute(remove, { params: { id: 'never-here' } })
    expect(missing.statusCode).toBe(404)
    expect(missing.body.error_code).toBe('NOT_INSTALLED')
  })
})
```

Add to `novel-project-config-routes.test.ts` (writing skills describe block; reuse `routeHarness`, `callRoute`, `context`):

```ts
test('writing-skills-config includes installed packs with default off and persists their toggles', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'writing-skills-config-'))
  workspaces.push(workspace)
  const { mkdir, writeFile } = await import('node:fs/promises')
  const packDir = join(workspace, '.mangaforge', 'writing-skill-packs', 'my-style-pack')
  await mkdir(packDir, { recursive: true })
  await writeFile(join(packDir, 'SKILL.md'), '---\nname: 我的文风包\n---\n# My Style')
  await writeFile(join(packDir, 'pack.json'), JSON.stringify({
    id: 'my-style-pack',
    source_url: 'https://github.com/acme/My-Style-Pack',
    owner: 'acme',
    repo: 'My-Style-Pack',
    revision: 'a'.repeat(40),
    installed_at: '2026-08-14T00:00:00.000Z',
    name: '我的文风包',
    description: '',
  }))
  const { invalidateInstalledWritingSkillPackCache } = await import('../novel-writing/writing-skills/installed-store')
  invalidateInstalledWritingSkillPackCache()

  const project = await createNovelProject(workspace, { title: 'installed-skills', reference_config: {} })
  const { app, handlers } = routeHarness()
  registerNovelProjectConfigRoutes(app, context(workspace) as any)

  const before = await callRoute(
    handlers.get('GET /api/novel/projects/:id/writing-skills-config'),
    { params: { id: String(project.id) } },
  )
  expect(before.body.config.enabled['my-style-pack']).toBe(false)

  const saved = await callRoute(
    handlers.get('PUT /api/novel/projects/:id/writing-skills-config'),
    { params: { id: String(project.id) }, body: { config: { enabled: { 'my-style-pack': true } } } },
  )
  expect(saved.body.config.enabled['my-style-pack']).toBe(true)

  const after = await callRoute(
    handlers.get('GET /api/novel/projects/:id/writing-skills-config'),
    { params: { id: String(project.id) } },
  )
  expect(after.body.config.enabled['my-style-pack']).toBe(true)
})
```

- [ ] **Step 2: Run and confirm FAIL**

Run:

```
cd ui/server && bun test \
  src/routes/novel-writing-skill-routes.test.ts \
  src/routes/novel-project-config-routes.test.ts
```

Expected: FAIL — routes file missing; config routes drop the installed key.

- [ ] **Step 3: Implement routes and registration**

`novel-writing-skill-routes.ts`:

```ts
import type { Express } from 'express'
import {
  buildWritingSkillCatalog,
  isBuiltinWritingSkillId,
  listInstalledWritingSkillPacks,
} from '../novel-writing/writing-skills'
import {
  WritingSkillInstallError,
  installWritingSkillPackFromGitHub,
  uninstallWritingSkillPack,
} from '../novel-writing/writing-skills/install-github'

type WritingSkillRoutesContext = {
  getWorkspace: () => string
  fetchImpl?: typeof fetch
}

function installErrorStatus(code: string): number {
  if (code === 'DOWNLOAD_FAILED') return 502
  if (code === 'NOT_INSTALLED') return 404
  if (['INVALID_URL', 'ID_CONFLICT_BUILTIN', 'SKILL_MD_MISSING', 'BOUNDS_EXCEEDED', 'BUILTIN_NOT_REMOVABLE'].includes(code)) {
    return 400
  }
  return 500
}

export function registerNovelWritingSkillRoutes(app: Express, ctx: WritingSkillRoutesContext) {
  app.get('/api/novel/writing-skills/catalog', async (_req, res) => {
    try {
      const installed = await listInstalledWritingSkillPacks(ctx.getWorkspace())
      res.json({ ok: true, skills: buildWritingSkillCatalog(installed) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/writing-skills/install', async (req, res) => {
    try {
      const pack = await installWritingSkillPackFromGitHub({
        url: String(req.body?.url || ''),
        workspace: ctx.getWorkspace(),
        ...(ctx.fetchImpl ? { fetchImpl: ctx.fetchImpl } : {}),
      })
      const skill = buildWritingSkillCatalog([pack]).find(entry => !entry.builtin)
      res.json({ ok: true, skill })
    } catch (error) {
      if (error instanceof WritingSkillInstallError) {
        return res.status(installErrorStatus(error.code)).json({
          ok: false,
          error_code: error.code,
          error: error.message,
        })
      }
      res.status(500).json({ error: String(error) })
    }
  })

  app.delete('/api/novel/writing-skills/:id', async (req, res) => {
    try {
      const id = String(req.params.id || '')
      if (isBuiltinWritingSkillId(id)) {
        return res.status(400).json({
          ok: false,
          error_code: 'BUILTIN_NOT_REMOVABLE',
          error: 'builtin writing skills cannot be removed',
        })
      }
      // Uninstall never touches project configs; stale enabled ids are
      // silently filtered by resolveWritingSkillsEnabled.
      await uninstallWritingSkillPack(ctx.getWorkspace(), id)
      res.json({ ok: true })
    } catch (error) {
      if (error instanceof WritingSkillInstallError) {
        return res.status(installErrorStatus(error.code)).json({
          ok: false,
          error_code: error.code,
          error: error.message,
        })
      }
      res.status(500).json({ error: String(error) })
    }
  })
}
```

In `ui/server/src/routes/novel.ts`, add the import and register right after `registerNovelProjectControlRoutes(app, { ... })`:

```ts
import { registerNovelWritingSkillRoutes } from './novel-writing-skill-routes'
...
registerNovelWritingSkillRoutes(app, { getWorkspace })
```

In `novel-project-config-routes.ts`, update the two writing-skills handlers:

```ts
import { listInstalledWritingSkillPacks } from '../novel-writing/writing-skills'
```

GET:

```ts
const installed = await listInstalledWritingSkillPacks(activeWorkspace)
const resolved = resolveWritingSkillsEnabled({ project, installed })
```

PUT — fetch `installed` the same way before the mutation, then:

```ts
const enabled = normalizeWritingSkillsEnabled(requestConfig.enabled ?? requestConfig, installed)
```

and inside `mutate`, both `resolveWritingSkillsEnabled(...)` calls gain `installed` in their input objects. Everything else (mode, model_id handling) stays.

- [ ] **Step 4: Re-run Step 2 tests**

Expected: PASS.

- [ ] **Step 5: Commit** (skip unless the user asked)

---

### Task 7: Web model — catalog hydration with builtin fallback

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/writingSkillsModel.ts`
- Modify: `ui/web/src/pages/novel-workspace/writingSkillsModel.test.ts`

- [ ] **Step 1: Write failing model tests**

Add to `writingSkillsModel.test.ts` (keep every existing case; extend imports with `BUILTIN_WRITING_SKILL_CATALOG`, `normalizeWritingSkillCatalog`):

```ts
test('hydrates the catalog from the API response and falls back to builtins', () => {
  expect(normalizeWritingSkillCatalog(null)).toEqual(BUILTIN_WRITING_SKILL_CATALOG)
  expect(normalizeWritingSkillCatalog({ ok: true })).toEqual(BUILTIN_WRITING_SKILL_CATALOG)
  const normalized = normalizeWritingSkillCatalog({
    ok: true,
    skills: [
      { id: 'fiction-humanizer-zh', label: '服务端标签', builtin: true, supports_mode: true },
      {
        id: 'my-style-pack',
        label: '我的文风包',
        description: '换文风',
        builtin: false,
        supports_mode: false,
        revision: 'a'.repeat(40),
        source_url: 'https://github.com/acme/My-Style-Pack',
        installed_at: '2026-08-14T00:00:00.000Z',
      },
      { id: 'BAD ID', label: 'x', builtin: false },
      { id: 'sneaky-builtin', label: 'x', builtin: true },
    ],
  })
  expect(normalized.slice(0, 3)).toEqual(BUILTIN_WRITING_SKILL_CATALOG)
  expect(normalized).toHaveLength(4)
  expect(normalized[3]).toMatchObject({
    id: 'my-style-pack',
    label: '我的文风包',
    builtin: false,
    supports_mode: false,
    revision: 'a'.repeat(40),
  })
})

test('resolves installed skills from the catalog with default off', () => {
  const catalog = normalizeWritingSkillCatalog({
    skills: [{ id: 'my-style-pack', label: '我的文风包', builtin: false, supports_mode: false }],
  })
  const off = resolveWritingSkillsEnabled({ catalog })
  expect(off.enabled['my-style-pack']).toBe(false)
  expect(off.ids).toEqual(['fiction-humanizer-zh', 'remove-ai-flavor'])
  const on = resolveWritingSkillsEnabled({ catalog, override: { enabled: { 'my-style-pack': true } } })
  expect(on.ids).toEqual(['fiction-humanizer-zh', 'remove-ai-flavor', 'my-style-pack'])
})
```

- [ ] **Step 2: Run and confirm FAIL**

Run: `cd ui/web && bun test src/pages/novel-workspace/writingSkillsModel.test.ts`

Expected: FAIL — new exports missing.

- [ ] **Step 3: Implement the model**

In `writingSkillsModel.ts`:

Widen the types (keep `WRITING_SKILL_IDS` and `DEFAULT_WRITING_SKILLS_ENABLED` as they are):

```ts
export type WritingSkillId = string
export type WritingSkillEnabledMap = Record<string, boolean>
```

Replace the `WRITING_SKILL_CATALOG` declaration with the richer item type (same three entries, superset fields — existing consumers only read `id`/`label`/`description`):

```ts
export type WritingSkillCatalogItem = {
  id: string
  label: string
  description: string
  builtin: boolean
  supports_mode: boolean
  revision?: string
  source_url?: string
  installed_at?: string
}

export const WRITING_SKILL_CATALOG: WritingSkillCatalogItem[] = [
  {
    id: 'fiction-humanizer-zh',
    label: '小说去AI味',
    description: '补铺垫、过程、余波，修对白和章末钩子。',
    builtin: true,
    supports_mode: true,
  },
  {
    id: 'remove-ai-flavor',
    label: '去句壳',
    description: '拆「不是…而是」「真正…的是」等助手句壳。',
    builtin: true,
    supports_mode: false,
  },
  {
    id: 'humanizer-zh',
    label: '维基去AI词',
    description: '去宣传腔和 AI 高频词。开启时禁止作者第一人称旁白。',
    builtin: true,
    supports_mode: false,
  },
]

export const BUILTIN_WRITING_SKILL_CATALOG = WRITING_SKILL_CATALOG

const WRITING_SKILL_PACK_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/

export function normalizeWritingSkillCatalog(value: unknown): WritingSkillCatalogItem[] {
  const raw = value as { skills?: unknown } | null
  const skills = Array.isArray(raw?.skills) ? raw!.skills : null
  if (!skills) return [...BUILTIN_WRITING_SKILL_CATALOG]
  const installed: WritingSkillCatalogItem[] = []
  for (const item of skills) {
    if (!item || typeof item !== 'object') continue
    const entry = item as Record<string, unknown>
    const id = String(entry.id || '')
    if ((WRITING_SKILL_IDS as readonly string[]).includes(id)) continue // builtins always come from the hardcoded fallback
    if (entry.builtin === true) continue
    if (!WRITING_SKILL_PACK_ID_RE.test(id)) continue
    installed.push({
      id,
      label: String(entry.label || id).slice(0, 40),
      description: String(entry.description || '').slice(0, 500),
      builtin: false,
      supports_mode: false,
      ...(typeof entry.revision === 'string' ? { revision: entry.revision.slice(0, 64) } : {}),
      ...(typeof entry.source_url === 'string' ? { source_url: entry.source_url.slice(0, 300) } : {}),
      ...(typeof entry.installed_at === 'string' ? { installed_at: entry.installed_at.slice(0, 80) } : {}),
    })
  }
  return [...BUILTIN_WRITING_SKILL_CATALOG, ...installed]
}
```

Make the merge and resolve catalog-aware:

```ts
function mergeEnabledFlags(
  base: WritingSkillEnabledMap,
  incoming: Record<string, unknown> | null,
  ids: readonly string[],
): WritingSkillEnabledMap {
  if (!incoming) return { ...base }
  const next = { ...base }
  for (const id of ids) {
    if (!Object.prototype.hasOwnProperty.call(incoming, id)) continue
    if (typeof incoming[id] !== 'boolean') continue
    next[id] = incoming[id]
  }
  return next
}

export function resolveWritingSkillsEnabled(input: {
  project?: { reference_config?: { writing_skills?: { enabled?: Record<string, unknown> } } } | null
  override?: { enabled?: Record<string, unknown> } | Record<string, unknown> | null
  catalog?: WritingSkillCatalogItem[]
} = {}) {
  const catalog = input.catalog?.length ? input.catalog : BUILTIN_WRITING_SKILL_CATALOG
  const ids = catalog.map(item => item.id)
  const defaults: WritingSkillEnabledMap = Object.fromEntries(catalog.map(item => [
    item.id,
    item.builtin ? DEFAULT_WRITING_SKILLS_ENABLED[item.id] ?? false : false,
  ]))
  const enabled = mergeEnabledFlags(
    mergeEnabledFlags(defaults, asEnabledRecord(input.project?.reference_config?.writing_skills), ids),
    asEnabledRecord(input.override),
    ids,
  )
  return {
    enabled,
    ids: ids.filter(id => enabled[id]),
    fiction_humanizer_mode: resolveMode(
      input.project?.reference_config?.writing_skills,
      input.override,
    ),
  }
}
```

`writingSkillsPayload`, `writingSkillsSettingsPayload`, `normalizeWritingSkillsModelId` stay unchanged (they already take `Record<string, boolean>`-compatible maps).

- [ ] **Step 4: Re-run web model tests**

Run: `cd ui/web && bun test src/pages/novel-workspace/writingSkillsModel.test.ts`

Expected: PASS (existing cases included — defaults, override merge, payload shape).

- [ ] **Step 5: Commit** (skip unless the user asked)

---

### Task 8: Settings modal marketplace UI + generation bar from the catalog

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/ProjectSettingsModal.tsx`
- Modify: `ui/web/src/pages/novel-workspace/ProjectSettingsModal.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/workspace-center-editor-controls.tsx`
- Modify: `ui/web/src/pages/novel-workspace/writingSkillsModel.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/useNovelProjectWorkspaceUiState.ts`
- Modify: `ui/web/src/pages/novel-workspace/shell/use-novel-workspace-base-model.tsx`
- Modify: `ui/web/src/pages/novel-workspace/shell/build-novel-workspace-ready-runtime.tsx`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-view-props-area.ts`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-area-view.tsx`
- Modify: `ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx`

- [ ] **Step 1: Extend the source-scan tests first**

In `ProjectSettingsModal.test.ts`, inside the existing modal source-scan test (next to the `/writing-skills-config` assertions), add:

```ts
expect(modal).toContain('/writing-skills/catalog')
expect(modal).toContain('normalizeWritingSkillCatalog')
expect(modal).toContain('writingSkillCatalog.map(skill =>')
expect(modal).toContain('skill.supports_mode')
expect(modal).toContain('skill.builtin')
expect(modal).toContain('skill.revision.slice(0, 7)')
expect(modal).toContain('Popconfirm')
expect(modal).toContain('卸载')
expect(modal).toContain('从 GitHub 安装')
expect(modal).toContain('/novel/writing-skills/install')
expect(modal).toContain('/novel/writing-skills/${')
```

In `writingSkillsModel.test.ts`, extend the generation-bar source scan:

```ts
expect(controls).toContain('writingSkillsCatalog')
expect(controls).toContain('catalog.map(skill =>')
expect(uiState).toContain('writingSkillsCatalog')
expect(center).toContain('writingSkillsCatalog={writingSkillsCatalog}')
```

- [ ] **Step 2: Run and confirm FAIL**

Run:

```
cd ui/web && bun test \
  src/pages/novel-workspace/writingSkillsModel.test.ts \
  src/pages/novel-workspace/ProjectSettingsModal.test.ts
```

Expected: FAIL on every new `toContain`.

- [ ] **Step 3: Implement the modal**

`ProjectSettingsModal.tsx`:

Imports: add `Input`, `Popconfirm` to the antd import; add `BUILTIN_WRITING_SKILL_CATALOG`, `normalizeWritingSkillCatalog`, `type WritingSkillCatalogItem` to the `writingSkillsModel` import (the `WRITING_SKILL_CATALOG` import can be dropped once the render below no longer uses it).

State (next to the existing writing-skills state):

```ts
const [writingSkillCatalog, setWritingSkillCatalog] = useState<WritingSkillCatalogItem[]>(BUILTIN_WRITING_SKILL_CATALOG)
const [installUrl, setInstallUrl] = useState('')
const [installing, setInstalling] = useState(false)
const [uninstallingId, setUninstallingId] = useState('')
```

Load effect: extend the existing `Promise.all` to also fetch the catalog — a catalog failure must NOT set `loadFailed` (builtin fallback keeps the UI usable):

```ts
Promise.all([
  apiClient.get(`/novel/projects/${projectId}/editor-revision-config`),
  apiClient.get(`/novel/projects/${projectId}/writing-skills-config`),
  apiClient.get('/novel/writing-skills/catalog').catch(() => null),
])
  .then(([revision, skills, catalogResponse]) => {
    if (active) {
      const catalog = normalizeWritingSkillCatalog(catalogResponse?.data)
      setWritingSkillCatalog(catalog)
      setTimeoutSeconds(normalizeProjectEditorRevisionTimeout(revision.data?.config?.timeout_seconds))
      setStoryStateMaxTokens(normalizeProjectStoryStateMaxTokens(revision.data?.config?.story_state_max_tokens))
      const resolvedWritingSkills = resolveWritingSkillsEnabled({
        override: skills.data?.config,
        catalog,
      })
      setWritingSkillsEnabled(resolvedWritingSkills.enabled)
      setFictionHumanizerMode(resolvedWritingSkills.fiction_humanizer_mode)
      setWritingSkillsModelId(normalizeWritingSkillsModelId(skills.data?.config?.model_id))
    }
  })
```

Handlers (place above the render):

```ts
const refreshWritingSkillCatalog = async () => {
  try {
    const response = await apiClient.get('/novel/writing-skills/catalog')
    setWritingSkillCatalog(normalizeWritingSkillCatalog(response.data))
  } catch {
    setWritingSkillCatalog(BUILTIN_WRITING_SKILL_CATALOG)
  }
}

const installWritingSkill = async () => {
  const url = installUrl.trim()
  if (!url) return
  setInstalling(true)
  try {
    await apiClient.post('/novel/writing-skills/install', { url })
    setInstallUrl('')
    await refreshWritingSkillCatalog()
    message.success('写作 skill 安装成功')
  } catch (error: any) {
    message.error(error?.response?.data?.error_code || error?.response?.data?.error || '写作 skill 安装失败')
  } finally {
    setInstalling(false)
  }
}

const uninstallWritingSkill = async (id: string) => {
  setUninstallingId(id)
  try {
    await apiClient.delete(`/novel/writing-skills/${id}`)
    setWritingSkillsEnabled(current => {
      const next = { ...current }
      delete next[id]
      return next
    })
    await refreshWritingSkillCatalog()
    message.success('写作 skill 已卸载')
  } catch (error: any) {
    message.error(error?.response?.data?.error_code || '写作 skill 卸载失败')
  } finally {
    setUninstallingId('')
  }
}
```

Render — replace the `WRITING_SKILL_CATALOG.map(...)` block with:

```tsx
{writingSkillCatalog.map(skill => (
  <Space key={skill.id} align="start">
    <Switch
      checked={writingSkillsEnabled[skill.id] ?? false}
      aria-label={skill.label}
      disabled={loading || loadFailed}
      onChange={checked => setWritingSkillsEnabled(current => ({
        ...current,
        [skill.id]: checked,
      }))}
    />
    {skill.supports_mode && (
      <Select
        aria-label="小说去AI味档位"
        value={fictionHumanizerMode}
        options={[
          { value: 'polish', label: '精修' },
          { value: 'rewrite', label: '重写' },
        ]}
        disabled={!writingSkillsEnabled['fiction-humanizer-zh'] || loading || loadFailed}
        onChange={setFictionHumanizerMode}
        style={{ width: 88 }}
      />
    )}
    <Space direction="vertical" size={0}>
      <Space size={8}>
        <Text>{skill.label}</Text>
        {!skill.builtin && skill.revision && (
          <Text type="secondary" code>{skill.revision.slice(0, 7)}</Text>
        )}
        {!skill.builtin && (
          <Popconfirm
            title={`卸载写作 skill「${skill.label}」？`}
            okText="卸载"
            cancelText="取消"
            onConfirm={() => uninstallWritingSkill(skill.id)}
          >
            <Button size="small" danger loading={uninstallingId === skill.id}>卸载</Button>
          </Popconfirm>
        )}
      </Space>
      <Text type="secondary">{skill.description}</Text>
    </Space>
  </Space>
))}
<Space.Compact style={{ width: '100%' }}>
  <Input
    aria-label="从 GitHub 安装"
    placeholder="https://github.com/{owner}/{repo} — 从 GitHub 安装写作 skill"
    value={installUrl}
    onChange={event => setInstallUrl(event.target.value)}
    onPressEnter={installWritingSkill}
    disabled={installing}
  />
  <Button type="primary" loading={installing} onClick={installWritingSkill}>安装</Button>
</Space.Compact>
```

The 精修/重写 Select and the 写作skill模型 Select keep their current behavior; the save PUT is untouched (`writingSkillsEnabled` now naturally carries installed ids).

`workspace-center-editor-controls.tsx` — add the catalog prop:

```tsx
export function WorkspaceCenterWritingSkillsControl({
  writingSkillsEnabled,
  onWritingSkillsEnabledChange,
  fictionHumanizerMode,
  onFictionHumanizerModeChange,
  writingSkillsCatalog,
}: {
  writingSkillsEnabled?: WritingSkillEnabledMap
  onWritingSkillsEnabledChange?: (enabled: WritingSkillEnabledMap) => void
  fictionHumanizerMode?: FictionHumanizerMode
  onFictionHumanizerModeChange?: (mode: FictionHumanizerMode) => void
  writingSkillsCatalog?: WritingSkillCatalogItem[]
}) {
  const catalog = writingSkillsCatalog?.length ? writingSkillsCatalog : WRITING_SKILL_CATALOG
  const current = writingSkillsEnabled || DEFAULT_WRITING_SKILLS_ENABLED
  const mode = fictionHumanizerMode || DEFAULT_FICTION_HUMANIZER_MODE
  const modeDisabled = !current['fiction-humanizer-zh']
  return (
    <div className="novel-word-target-control novel-writing-skills-control" aria-label="去AI味写作skill">
      {catalog.map(skill => (
        <Tooltip key={skill.id} title={skill.description}>
          <Button
            size="small"
            type="default"
            className={`novel-word-preset novel-btn-crystal ${current[skill.id] ? 'novel-btn-crystal-local is-selected' : 'novel-btn-crystal-display'}`}
            onClick={() => onWritingSkillsEnabledChange?.({
              ...current,
              [skill.id]: !current[skill.id],
            })}
          >
            {skill.label}
          </Button>
        </Tooltip>
      ))}
      {(['polish', 'rewrite'] as const).map(item => (
        <Button
          key={item}
          size="small"
          disabled={modeDisabled}
          aria-label={item === 'polish' ? '精修' : '重写'}
          className={`novel-word-preset novel-btn-crystal ${!modeDisabled && mode === item ? 'novel-btn-crystal-local is-selected' : 'novel-btn-crystal-display'}`}
          onClick={() => onFictionHumanizerModeChange?.(item)}
        >
          {item === 'polish' ? '精修' : '重写'}
        </Button>
      ))}
    </div>
  )
}
```

(Import `type WritingSkillCatalogItem` from `./writingSkillsModel`.)

Thread the catalog through the same files that already pass `writingSkillsEnabled`:

- `useNovelProjectWorkspaceUiState.ts`: next to the `writingSkillsEnabled` state add
  `const [writingSkillsCatalog, setWritingSkillsCatalog] = useState<WritingSkillCatalogItem[]>(BUILTIN_WRITING_SKILL_CATALOG)`
  and return `writingSkillsCatalog, setWritingSkillsCatalog` next to `writingSkillsEnabled, setWritingSkillsEnabled` (extend the model import with `BUILTIN_WRITING_SKILL_CATALOG, type WritingSkillCatalogItem`).
- `shell/use-novel-workspace-base-model.tsx`:
  - destructure `writingSkillsCatalog, setWritingSkillsCatalog` from the ui-state hook (line ~369 area);
  - extend the existing hydrate effect (line ~483) to `resolveWritingSkillsEnabled({ project: selectedProject, catalog: writingSkillsCatalog })` and add `writingSkillsCatalog` to its dependency array;
  - add a catalog fetch effect right before that hydrate effect (import `apiClient` from `'../../../api/client'` if not already imported, plus `BUILTIN_WRITING_SKILL_CATALOG, normalizeWritingSkillCatalog` from `'../writingSkillsModel'`):

```ts
useEffect(() => {
  let active = true
  apiClient.get('/novel/writing-skills/catalog')
    .then(response => { if (active) setWritingSkillsCatalog(normalizeWritingSkillCatalog(response.data)) })
    .catch(() => { if (active) setWritingSkillsCatalog(BUILTIN_WRITING_SKILL_CATALOG) })
  return () => { active = false }
}, [selectedProject?.id, setWritingSkillsCatalog])
```

  - add `writingSkillsCatalog` to the two returned model objects next to the existing `writingSkillsEnabled` entries (lines ~1009 and ~1160).
- `shell/build-novel-workspace-ready-runtime.tsx`: add `writingSkillsCatalog` next to both `writingSkillsEnabled` occurrences (destructure + pass-through).
- `shell/workspace-view-props-area.ts`: add `writingSkillsCatalog` to the destructure and `writingSkillsCatalog: writingSkillsCatalog,` to the returned props next to `writingSkillsEnabled`.
- `shell/workspace-area-view.tsx`: add `writingSkillsCatalog: any` to the props type, destructure it, and pass `writingSkillsCatalog={writingSkillsCatalog}` on `<WorkspaceCenter ...>` next to the existing `writingSkillsEnabled` prop.
- `WorkspaceCenter.tsx`: add `writingSkillsCatalog?: import('./writingSkillsModel').WritingSkillCatalogItem[]` to the props type, destructure it, and pass `writingSkillsCatalog={writingSkillsCatalog}` to `<WorkspaceCenterWritingSkillsControl ...>`.

- [ ] **Step 4: Re-run web tests**

Run the Step 2 command.

Expected: PASS.

- [ ] **Step 5: Commit** (skip unless the user asked)

---

### Task 9: Regression sweep

**Files:** anything still assuming the closed builtin id union.

- [ ] **Step 1: Search for stale assumptions**

```
cd /Users/ruiyaosong/MangaForge-Studio
rg -n "Record<WritingSkillId" ui/server/src ui/web/src
rg -n "isWritingSkillId\(" ui/server/src
rg -n "WRITING_SKILL_IDS as readonly string\[\]\)\.includes" ui/server/src
rg -n "WRITING_SKILL_STAGE_LABEL\[" ui/server/src
```

For each hit, decide: builtin-only logic (fiction mode, humanizer sleeve, soul-leak gate, vendor loading, stage-label tables) must use `BuiltinWritingSkillId` / `isBuiltinWritingSkillId`; anything that can see installed ids must treat them as bounded strings. Expected remaining hits after Tasks 3–5: `load-vendor.ts` (builtin-typed, correct), `accept-candidate.ts` (`enabledIds.includes('humanizer-zh')`, correct as strings), `registry.ts` internals, `revision-run-view.ts` (already updated).

- [ ] **Step 2: Run the focused server and web suites**

```
cd ui/server && bun test \
  src/novel-writing/writing-skills/installed-store.test.ts \
  src/novel-writing/writing-skills/install-github.test.ts \
  src/novel-writing/writing-skills/registry-catalog.test.ts \
  src/novel-writing/writing-skills/resolve-enabled.test.ts \
  src/novel-writing/writing-skills/load-vendor.test.ts \
  src/novel-writing/writing-skills/load-installed.test.ts \
  src/novel-writing/writing-skills/compile-pass-prompt.test.ts \
  src/novel-writing/writing-skills/accept-candidate.test.ts \
  src/novel-writing/writing-skills/chunk-chapter.test.ts \
  src/novel-writing/writing-skills/length-bounds.test.ts \
  src/novel-writing/chapter-prose-storage-patch.test.ts \
  src/novel-writing-service/service/writing-skill-humanize-methods.test.ts \
  src/novel-writing-service/service/generate-chapter-post-draft-finalize.test.ts \
  src/routes/novel-writing-skill-routes.test.ts \
  src/routes/novel-project-config-routes.test.ts \
  src/routes/novel-editor/revision-run-view.test.ts \
  src/routes/novel-editor/revision-worker.test.ts \
  src/routes/novel-editor/revision-writing-skill-humanize.test.ts \
  src/routes/novel-generation/builders.mcp.test.ts

cd ui/web && bun test \
  src/pages/novel-workspace/writingSkillsModel.test.ts \
  src/pages/novel-workspace/ProjectSettingsModal.test.ts
```

Expected: all PASS. If a test fails only because a mock still types `onSkillProgress` with two fixed meta fields or indexes `WRITING_SKILL_STAGE_LABEL` with a plain string, fix the mock/cast — do not weaken production validation.

- [ ] **Step 3: Commit** (skip unless the user asked)

---

## Spec coverage

| Spec item | Task |
| --- | --- |
| Builtins not removable, toggle only | 6 (routes 400), 8 (no uninstall button on builtin rows) |
| Workspace-global install; project-level enable | 1 (store), 6 (config routes with installed) |
| Fixed order: builtins first, installed by installed_at asc | 3 (catalog + resolve), 6 (catalog route) |
| Source format: bare github.com URL, root SKILL.md, optional references/*.md, HEAD revision lock | 2 |
| Disk layout `{workspace}/.mangaforge/writing-skill-packs/{id}/` with pack.json | 1, 2 |
| id = lowercased repo name `[a-z0-9][a-z0-9-]{0,63}` | 2 (`normalizeWritingSkillPackId`) |
| name/description from frontmatter, repo-name/empty fallback | 2 (`parseWritingSkillFrontmatterMeta`) |
| Atomic writes (temp dir + rename); uninstall via rename-then-delete | 2 |
| installed-store: scan/read, cache with mtime invalidation, skip invalid packs with warning | 1 |
| install-github: URL matrix, sha resolve (API + codeload fallback), markdown-only extraction, traversal/symlink rejection, path-safety helper reuse | 2 |
| Idempotent same revision / whole-directory replace on new revision | 2 |
| Bounds: zip 128MiB, SKILL.md 256KiB, ref 512KiB, 8 refs, refs 2MiB, extract 4MiB | 1 (scan), 2 (extract) |
| GET catalog response shape, supports_mode only fiction-humanizer-zh | 3, 6 |
| POST install error codes INVALID_URL / ID_CONFLICT_BUILTIN / SKILL_MD_MISSING / BOUNDS_EXCEEDED / DOWNLOAD_FAILED with 400/502 | 2, 6 |
| DELETE: installed ok / builtin 400 BUILTIN_NOT_REMOVABLE / missing 404; never edits project config | 2, 6 |
| `WritingSkillId` → string; builtin literals + special-case logic preserved | 3 (types), 4 (compile), 5 (runner/finalize) |
| resolve: dynamic ids, installed default off, output order, stale-id filter, installed injected as a parameter (no IO) | 3 |
| compile: generic path — frontmatter-stripped full SKILL.md + refs sorted by filename; no mode line / sleeve | 4 |
| Loader for installed packs reads from the workspace (parallel to vendor loader) | 4 |
| Progress label = pack name recomputed server-side, bounded, stored label untrusted | 3 (label helper), 5 (runner meta + run-view) |
| v2 receipt unchanged; storage id validation = bounded strings | 5 (regression test; ids already bounded) |
| Web: catalog hydration from GET with builtin hardcoded fallback | 7 |
| Settings modal: toggle + description per skill, uninstall Popconfirm + revision short sha, GitHub URL install, mode/model Selects unchanged | 8 |
| Generation bar renders from the same catalog; override semantics unchanged | 7, 8 |
| Concurrency: temp-dir installs, rename-based uninstall; mid-run uninstall = skip at pass start, in-flight pass keeps memory text | 2, 5 |
| Non-goals (no private repos, no scripts, no manual sort, no auto-update, canvas installer untouched) | file map (“Do not touch”), 2 (markdown-only extraction) |

## Type names locked by this plan

- `InstalledWritingSkillPack` — `{ id, name, description, source_url, owner, repo, revision, installed_at, dir, reference_files }`
- `listInstalledWritingSkillPacks(workspace)` / `getInstalledWritingSkillNameMap(workspace)` / `invalidateInstalledWritingSkillPackCache()` / `writingSkillPacksRoot(workspace)`
- `WRITING_SKILL_PACK_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/`
- `MAX_INSTALLED_SKILL_MD_BYTES` / `MAX_INSTALLED_REFERENCE_BYTES` / `MAX_INSTALLED_REFERENCE_COUNT` / `MAX_INSTALLED_REFERENCES_TOTAL_BYTES` / `MAX_WRITING_SKILL_ARCHIVE_BYTES` / `MAX_WRITING_SKILL_EXTRACTED_BYTES`
- `WritingSkillInstallError` with `code: WritingSkillInstallErrorCode` (`INVALID_URL | ID_CONFLICT_BUILTIN | SKILL_MD_MISSING | BOUNDS_EXCEEDED | DOWNLOAD_FAILED | BUILTIN_NOT_REMOVABLE | NOT_INSTALLED | INSTALL_FAILED`)
- `parseWritingSkillGitHubUrl(url)` → `{ owner, repo, id, canonical_url }`; `normalizeWritingSkillPackId(repo)`; `resolveWritingSkillHeadRevision(source, fetchImpl)`; `extractWritingSkillArchive(bytes)` → `{ skill_markdown_raw, references }`; `parseWritingSkillFrontmatterMeta(raw)`; `installWritingSkillPackFromGitHub({ url, workspace, fetchImpl? })`; `uninstallWritingSkillPack(workspace, id)`
- `BuiltinWritingSkillId` (literal union) / `WritingSkillId = string` / `WritingSkillEnabledMap = Record<string, boolean>`
- `isBuiltinWritingSkillId(value)` / `isWritingSkillPackIdShape(value)` (legacy alias `isWritingSkillId` kept)
- `WritingSkillCatalogEntry` (server) / `buildWritingSkillCatalog(installed)` / `resolveWritingSkillStageLabel(id, installed?)` / `WRITING_SKILL_PACK_LABEL_MAX = 40`
- `resolveWritingSkillsEnabled({ project, override, installed })`; `normalizeWritingSkillsEnabled(value, installed?)`; `WritingSkillsInstalledInput`
- `InstalledWritingSkillPrompt` — `{ id, name, skill_markdown, references }`; `loadInstalledWritingSkillPrompt(pack)`; `stripInstalledSkillFrontmatter(raw)`
- `compileWritingSkillPassPrompt({ skillId, mode?, sourceText, project?, contextPackage?, chunk?, installed? })`
- runner progress meta: `options.onSkillProgress?.(id, { index, total, label })`
- `buildPublicEditorRevisionRun(run, options?: EditorRevisionRunViewOptions)` with `{ installedSkillNames?: Record<string, string> }`
- `registerNovelWritingSkillRoutes(app, { getWorkspace, fetchImpl? })`
- web: `WritingSkillCatalogItem` / `BUILTIN_WRITING_SKILL_CATALOG` / `normalizeWritingSkillCatalog(value)` / `resolveWritingSkillsEnabled({ project?, override?, catalog? })` / prop `writingSkillsCatalog`

## Spec ambiguities resolved by this plan

1. **Repo names outside `[a-z0-9-]`** — spec only says “仓库名小写规范化”; `normalizeWritingSkillPackId` lowercases, maps `.`/`_` runs to `-`, trims dashes, and rejects with `INVALID_URL` if the result still fails the id regex.
2. **Unsafe archives** — spec’s closed error-code set has no archive-specific code; traversal / symlink / corrupt zip map to `DOWNLOAD_FAILED` (502-worthy untrusted artifact), size/count violations map to `BOUNDS_EXCEEDED` (400).
3. **Same id from a different repo** — spec only defines same-repo reinstall; this plan replaces the existing pack (last install wins, update semantics).
4. **`installed_at` on update** — kept from the previous install so catalog ordering stays stable across revision updates.
5. **Run-view pack-name lookup** — `buildPublicEditorRevisionRun` takes an optional `installedSkillNames` map (callers fetch it via the cached store); if the map is absent or the pack is gone, the label falls back to the bounded id.
