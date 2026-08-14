import { describe, expect, test } from 'bun:test'
import JSZip from 'jszip'
import { access, mkdir, mkdtemp, readFile } from 'node:fs/promises'
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

  test('extracts a unique nested skill from skills/, .claude/skills/, or a one-level folder', async () => {
    const skillsLayout = await zipBytes([
      { name: 'kit-main/README.md', content: 'readme' },
      { name: 'kit-main/skills/my-style/SKILL.md', content: '---\nname: 嵌套文风\n---\n# Nested\n正文规则嵌套' },
      { name: 'kit-main/skills/my-style/references/a.md', content: '参考甲' },
      { name: 'kit-main/skills/my-style/scripts/run.py', content: 'raise RuntimeError()' },
    ])
    const fromSkills = await extractWritingSkillArchive(skillsLayout)
    expect(fromSkills.skill_markdown_raw).toContain('正文规则嵌套')
    expect(fromSkills.references.map(reference => reference.file)).toEqual(['a.md'])
    expect(JSON.stringify(fromSkills)).not.toContain('RuntimeError')

    const claudeLayout = await zipBytes([
      { name: 'kit-main/.claude/skills/voice-pack/SKILL.md', content: '# Claude skill\n只改语气。' },
    ])
    expect((await extractWritingSkillArchive(claudeLayout)).skill_markdown_raw).toContain('只改语气')

    const folderLayout = await zipBytes([
      { name: 'kit-main/voice-pack/SKILL.md', content: '# Folder skill\n一层目录。' },
      { name: 'kit-main/voice-pack/references/tip.md', content: '提示' },
    ])
    const fromFolder = await extractWritingSkillArchive(folderLayout)
    expect(fromFolder.skill_markdown_raw).toContain('一层目录')
    expect(fromFolder.references.map(reference => reference.file)).toEqual(['tip.md'])
  })

  test('extracts SKILL.md two levels down under a bundle folder like 纯净版skill/', async () => {
    const archive = await zipBytes([
      { name: 'kit-main/README.md', content: 'readme' },
      { name: 'kit-main/纯净版skill/novel-writing/SKILL.md', content: '---\nname: 小说写作\n---\n# Writing\n正文。' },
      { name: 'kit-main/纯净版skill/novel-humanizer/SKILL.md', content: '---\nname: 去AI味\n---\n# Humanizer\n去味。' },
      { name: 'kit-main/纯净版skill/scripts/README.md', content: 'scripts' },
      { name: 'kit-main/纯净版skill/novel-logic/examples/info.md', content: '例子' },
    ])
    const writing = await extractWritingSkillArchive(archive)
    expect(writing.skill_markdown_raw).toMatch(/正文|去味/)
    const workspace = await mkdtemp(join(tmpdir(), 'wsk-install-'))
    invalidateInstalledWritingSkillPackCache()
    await installWritingSkillPackFromGitHub({
      url: 'https://github.com/acme/ai-fiction-writer',
      workspace,
      fetchImpl: githubFetch(
        { [`https://codeload.github.com/acme/ai-fiction-writer/zip/${SHA_A}`]: archive },
        SHA_A,
      ),
    })
    expect((await listInstalledWritingSkillPacks(workspace)).map(pack => pack.id).sort()).toEqual([
      'novel-humanizer',
      'novel-writing',
    ])
  })

  test('prefers a root SKILL.md when a nested skill also exists', async () => {
    const archive = await zipBytes([
      { name: 'kit-main/SKILL.md', content: '# Root skill\n根目录优先。' },
      { name: 'kit-main/skills/other/SKILL.md', content: '# Nested\n不该用这个。' },
    ])
    const extracted = await extractWritingSkillArchive(archive)
    expect(extracted.skill_markdown_raw).toContain('根目录优先')
    expect(extracted.skill_markdown_raw).not.toContain('不该用这个')
  })

  test('installs every nested skill in a collection repo', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'wsk-install-'))
    invalidateInstalledWritingSkillPackCache()
    const archive = await zipBytes([
      { name: 'kit-main/skills/voice-pack/SKILL.md', content: '---\nname: 语气包\n---\n# Voice\n语气。' },
      { name: 'kit-main/skills/pacing-pack/SKILL.md', content: '---\nname: 节奏包\n---\n# Pacing\n节奏。' },
    ])
    await installWritingSkillPackFromGitHub({
      url: 'https://github.com/acme/ai-fiction-writer',
      workspace,
      fetchImpl: githubFetch(
        { [`https://codeload.github.com/acme/ai-fiction-writer/zip/${SHA_A}`]: archive },
        SHA_A,
      ),
    })
    const installed = await listInstalledWritingSkillPacks(workspace)
    expect(installed.map(pack => pack.id).sort()).toEqual(['pacing-pack', 'voice-pack'])
    expect(installed.map(pack => pack.name).sort()).toEqual(['节奏包', '语气包'])
    expect(await readFile(join(writingSkillPacksRoot(workspace), 'voice-pack', 'SKILL.md'), 'utf8')).toContain('语气')
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

  // Carry-forward from Task 1 review: the store must serve fresh data after
  // install / replace / uninstall without callers clearing the cache manually.
  test('store returns fresh data end-to-end after install, replace, and uninstall', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'wsk-install-'))
    invalidateInstalledWritingSkillPackCache()
    // Prime the store cache with an empty (but existing) packs root.
    await mkdir(writingSkillPacksRoot(workspace), { recursive: true })
    expect(await listInstalledWritingSkillPacks(workspace)).toEqual([])

    await installWritingSkillPackFromGitHub({
      url: 'https://github.com/acme/My-Style-Pack',
      workspace,
      fetchImpl: githubFetch({ [`https://codeload.github.com/acme/My-Style-Pack/zip/${SHA_A}`]: await goodArchive() }, SHA_A),
    })
    const afterInstall = await listInstalledWritingSkillPacks(workspace)
    expect(afterInstall.map(pack => [pack.id, pack.revision])).toEqual([['my-style-pack', SHA_A]])

    await installWritingSkillPackFromGitHub({
      url: 'https://github.com/acme/My-Style-Pack',
      workspace,
      fetchImpl: githubFetch(
        { [`https://codeload.github.com/acme/My-Style-Pack/zip/${SHA_B}`]: await goodArchive('正文规则B') },
        SHA_B,
      ),
    })
    const afterReplace = await listInstalledWritingSkillPacks(workspace)
    expect(afterReplace.map(pack => [pack.id, pack.revision])).toEqual([['my-style-pack', SHA_B]])

    await uninstallWritingSkillPack(workspace, 'my-style-pack')
    expect(await listInstalledWritingSkillPacks(workspace)).toEqual([])
  })
})
