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

  test('rejects a SKILL.md that grew beyond bounds after install', async () => {
    const pack = await fixturePack()
    await writeFile(join(pack.dir, 'SKILL.md'), 'x'.repeat(256 * 1024 + 1))
    expect(() => loadInstalledWritingSkillPrompt(pack)).toThrow(/writing_skill_pack_bounds_exceeded/)
  })

  test('rejects a reference that grew beyond bounds after install', async () => {
    const pack = await fixturePack()
    await writeFile(join(pack.dir, 'references', 'a.md'), 'x'.repeat(512 * 1024 + 1))
    expect(() => loadInstalledWritingSkillPrompt(pack)).toThrow(/writing_skill_pack_bounds_exceeded/)
  })

  test('rejects reference lists that exceed the count or total-size bounds', async () => {
    const tooMany = await fixturePack()
    tooMany.reference_files = Array.from({ length: 9 }, (_, index) => `${index}.md`)
    expect(() => loadInstalledWritingSkillPrompt(tooMany)).toThrow(/writing_skill_pack_bounds_exceeded/)

    const tooBig = await fixturePack()
    const halfMib = 'x'.repeat(512 * 1024)
    for (const file of ['c.md', 'd.md', 'e.md', 'f.md', 'g.md']) {
      await writeFile(join(tooBig.dir, 'references', file), halfMib)
    }
    tooBig.reference_files = ['a.md', 'b.md', 'c.md', 'd.md', 'e.md', 'f.md', 'g.md']
    expect(() => loadInstalledWritingSkillPrompt(tooBig)).toThrow(/writing_skill_pack_bounds_exceeded/)
  })
})
