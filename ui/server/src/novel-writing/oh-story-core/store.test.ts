import { describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadOhStoryCoreSuite, ohStoryCoreRoot } from './store'

test('loads a locked suite from workspace/.mangaforge/oh-story-core', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'oh-story-core-'))
  const root = ohStoryCoreRoot(workspace)
  await mkdir(join(root, 'skills', 'story-review'), { recursive: true })
  await writeFile(join(root, 'pack.json'), JSON.stringify({
    source_url: 'https://github.com/worldwonderer/oh-story-claudecode',
    revision: 'abc1234',
    installed_at: '2026-08-14T00:00:00.000Z',
    skills: ['story-review', 'story-deslop', 'story-long-write'],
  }))
  await writeFile(join(root, 'skills', 'story-review', 'SKILL.md'), '---\nname: story-review\n---\n# review\n')
  const suite = loadOhStoryCoreSuite(workspace)
  expect(suite?.revision).toBe('abc1234')
  expect(suite?.skills['story-review']?.skill_markdown).toContain('# review')
})

test('returns null when the suite is missing', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'oh-story-core-missing-'))
  expect(loadOhStoryCoreSuite(workspace)).toBeNull()
})

describe('oh-story core store safety', () => {
  test('loads markdown references and omits skills without SKILL.md', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'oh-story-core-refs-'))
    const root = ohStoryCoreRoot(workspace)
    await mkdir(join(root, 'skills', 'story-review', 'references'), { recursive: true })
    await writeFile(join(root, 'pack.json'), JSON.stringify({
      source_url: 'https://github.com/worldwonderer/oh-story-claudecode',
      revision: 'abc1234',
      installed_at: '2026-08-14T00:00:00.000Z',
      skills: ['story-review', 'story-deslop'],
    }))
    await writeFile(join(root, 'skills', 'story-review', 'SKILL.md'), '# review\n')
    await writeFile(join(root, 'skills', 'story-review', 'references', 'checklist.md'), '开头有钩子')
    await writeFile(join(root, 'skills', 'story-review', 'references', 'notes.txt'), 'skip me')
    const suite = loadOhStoryCoreSuite(workspace)
    expect(suite?.skills['story-review']?.references).toEqual([
      { file: 'checklist.md', text: '开头有钩子' },
    ])
    expect(suite?.skills['story-deslop']).toBeUndefined()
  })

  test('returns null when pack.json is a symlink', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'oh-story-core-symlink-'))
    const root = ohStoryCoreRoot(workspace)
    await mkdir(root, { recursive: true })
    const target = join(workspace, 'outside-pack.json')
    await writeFile(target, JSON.stringify({
      source_url: 'https://github.com/worldwonderer/oh-story-claudecode',
      revision: 'abc1234',
      installed_at: '2026-08-14T00:00:00.000Z',
      skills: ['story-review'],
    }))
    await symlink(target, join(root, 'pack.json'))
    expect(loadOhStoryCoreSuite(workspace)).toBeNull()
  })

  test('ignores pack.json skill ids outside the locked core set', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'oh-story-core-locked-ids-'))
    const root = ohStoryCoreRoot(workspace)
    await mkdir(join(root, 'skills', 'story-review'), { recursive: true })
    await mkdir('/tmp/x', { recursive: true })
    await writeFile(join(root, 'pack.json'), JSON.stringify({
      source_url: 'https://github.com/worldwonderer/oh-story-claudecode',
      revision: 'abc1234',
      installed_at: '2026-08-14T00:00:00.000Z',
      skills: ['/tmp/x'],
    }))
    await writeFile(join(root, 'skills', 'story-review', 'SKILL.md'), '# review\n')
    await writeFile('/tmp/x/SKILL.md', '# escaped\n')
    const suite = loadOhStoryCoreSuite(workspace)
    expect(suite?.skills['/tmp/x']).toBeUndefined()
    expect(Object.keys(suite?.skills || {})).toEqual(['story-review'])
    expect(suite?.skills['story-review']?.skill_markdown).toContain('# review')
  })

  test('omits skill ids that escape the suite root', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'oh-story-core-escape-'))
    const root = ohStoryCoreRoot(workspace)
    await mkdir(join(root, 'skills', 'story-review'), { recursive: true })
    await writeFile(join(root, 'pack.json'), JSON.stringify({
      source_url: 'https://github.com/worldwonderer/oh-story-claudecode',
      revision: 'abc1234',
      installed_at: '2026-08-14T00:00:00.000Z',
      skills: ['story-review', '../escape'],
    }))
    await writeFile(join(root, 'skills', 'story-review', 'SKILL.md'), '# review\n')
    const suite = loadOhStoryCoreSuite(workspace)
    expect(suite?.skills['story-review']?.skill_markdown).toContain('# review')
    expect(suite?.skills['../escape']).toBeUndefined()
  })
})
