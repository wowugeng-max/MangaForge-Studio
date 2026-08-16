import { describe, expect, test } from 'bun:test'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { OH_STORY_REVIEWER_AGENTS, ohStoryCoreAgentsDir, ohStoryCoreRoot } from '../../novel-writing/oh-story-core/store'
import { deployKernelPackMounts } from './pack-mounts'

function seedPack(ws: string, opts: { agents?: readonly string[] } = {}) {
  const skillDir = join(ohStoryCoreRoot(ws), 'skills', 'story-review')
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: story-review\n---\n')
  writeFileSync(join(ohStoryCoreRoot(ws), 'pack.json'), JSON.stringify({ revision: 'r', skills: ['story-review'], agents_version: 25 }))
  for (const agent of opts.agents ?? OH_STORY_REVIEWER_AGENTS) {
    mkdirSync(ohStoryCoreAgentsDir(ws), { recursive: true })
    writeFileSync(join(ohStoryCoreAgentsDir(ws), `${agent}.toml`), `name = "${agent}"\n`)
  }
}

describe('deployKernelPackMounts', () => {
  test('symlinks skill and deploys four reviewer toml + .story-deployed', () => {
    const ws = mkdtempSync(join(tmpdir(), 'pack-mounts-'))
    seedPack(ws)
    const projectDir = mkdtempSync(join(tmpdir(), 'pack-mounts-dir-'))
    const result = deployKernelPackMounts({ workspace: ws, projectDir, skillName: 'story-review', mounts: ['skill_tree', 'agents'] })
    expect(result.missingReviewers).toEqual([])
    const link = join(projectDir, '.agents', 'skills', 'story-review')
    expect(lstatSync(link).isSymbolicLink()).toBe(true)
    expect(readlinkSync(link)).toBe(join(ohStoryCoreRoot(ws), 'skills', 'story-review'))
    for (const agent of OH_STORY_REVIEWER_AGENTS) {
      expect(existsSync(join(projectDir, '.codex', 'agents', `${agent}.toml`))).toBe(true)
    }
    const sentinel = readFileSync(join(projectDir, '.story-deployed'), 'utf8')
    expect(sentinel).toContain('agents_version: 25')
    expect(sentinel).toContain('target_cli: codex')
  })

  test('pack missing toml falls back to repo templates', () => {
    const ws = mkdtempSync(join(tmpdir(), 'pack-mounts-'))
    seedPack(ws, { agents: ['story-architect'] })
    const projectDir = mkdtempSync(join(tmpdir(), 'pack-mounts-dir-'))
    const result = deployKernelPackMounts({ workspace: ws, projectDir, skillName: 'story-review', mounts: ['agents'] })
    expect(result.missingReviewers).toEqual([])
    const fallbackToml = readFileSync(join(projectDir, '.codex', 'agents', 'narrative-writer.toml'), 'utf8')
    expect(fallbackToml).toContain('name = "narrative-writer"')
  })

  test('missing skill dir reports null skillPath', () => {
    const ws = mkdtempSync(join(tmpdir(), 'pack-mounts-'))
    const projectDir = mkdtempSync(join(tmpdir(), 'pack-mounts-dir-'))
    const result = deployKernelPackMounts({ workspace: ws, projectDir, skillName: 'story-review', mounts: ['skill_tree'] })
    expect(result.skillPath).toBeNull()
  })
})
