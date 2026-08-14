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
