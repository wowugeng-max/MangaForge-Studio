import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BUILTIN_KERNEL_CONTRACTS } from '../contracts/builtin'
import type { KernelPromptVars } from '../template'
import { harvestKernelArtifacts, writeKernelSnapshot } from './snapshot'

const reviewContract = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-review.full')!
const deslopContract = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-deslop.file')!

const vars: KernelPromptVars = {
  scope_files: '正文/第002章_违背规则的绝对防御.md',
  chapter_no: '2', chapter_pad: '002', chapter_title: '违背规则的绝对防御',
  previous_chapter_file: '', report_path: '审稿/第002章.md', review_path: '', skill_name: 'story-review',
  user_brief_file: '',
}

function seedProject() {
  const projectDir = mkdtempSync(join(tmpdir(), 'harvest-proj-'))
  mkdirSync(join(projectDir, '正文'), { recursive: true })
  writeFileSync(join(projectDir, '正文/第002章_违背规则的绝对防御.md'), '原文段一。\n\n段二。')
  return projectDir
}

describe('snapshot & harvest', () => {
  test('review run collects report as review_report, tracking as tracking_doc, scope violations warn', () => {
    const projectDir = seedProject()
    const snapshotDir = mkdtempSync(join(tmpdir(), 'harvest-snap-'))
    const manifest = writeKernelSnapshot(projectDir, snapshotDir)
    mkdirSync(join(projectDir, '审稿'), { recursive: true })
    writeFileSync(join(projectDir, '审稿/第002章.md'), 'Fallback: none\n报告正文')
    mkdirSync(join(projectDir, '追踪/逐章记录'), { recursive: true })
    writeFileSync(join(projectDir, '追踪/逐章记录/第002章.md'), '# 记录')
    mkdirSync(join(projectDir, '.story-review'), { recursive: true })
    writeFileSync(join(projectDir, '.story-review/state.md'), 'state')
    writeFileSync(join(projectDir, '越界.md'), 'x')
    const artifactsDir = mkdtempSync(join(tmpdir(), 'harvest-art-'))
    const result = harvestKernelArtifacts({ projectDir, artifactsDir, manifest, contract: reviewContract, vars })
    const kinds = Object.fromEntries(result.artifacts.map(a => [a.rel_path, a.artifact_kind]))
    expect(kinds['审稿/第002章.md']).toBe('review_report')
    expect(kinds['追踪/逐章记录/第002章.md']).toBe('tracking_doc')
    expect(result.artifacts.some(a => a.rel_path.startsWith('.story-review/'))).toBe(false)
    expect(result.warnings).toEqual([{ warning: 'write_outside_scope', rel_path: '越界.md' }])
    expect(result.missingRequired).toEqual([])
  })

  test('required report missing -> missingRequired lists rendered glob', () => {
    const projectDir = seedProject()
    const manifest = writeKernelSnapshot(projectDir, mkdtempSync(join(tmpdir(), 'harvest-snap-')))
    const result = harvestKernelArtifacts({ projectDir, artifactsDir: mkdtempSync(join(tmpdir(), 'harvest-art-')), manifest, contract: reviewContract, vars })
    expect(result.missingRequired).toEqual(['审稿/第002章.md'])
  })

  test('rewrite run with unchanged chapter file -> missingRequired (防空跑入库)', () => {
    const projectDir = seedProject()
    const manifest = writeKernelSnapshot(projectDir, mkdtempSync(join(tmpdir(), 'harvest-snap-')))
    const untouched = harvestKernelArtifacts({ projectDir, artifactsDir: mkdtempSync(join(tmpdir(), 'harvest-art-')), manifest, contract: deslopContract, vars })
    expect(untouched.missingRequired).toEqual(['正文/第002章_*.md'])
    writeFileSync(join(projectDir, '正文/第002章_违背规则的绝对防御.md'), '润色后段一。\n\n段二。')
    const changed = harvestKernelArtifacts({ projectDir, artifactsDir: mkdtempSync(join(tmpdir(), 'harvest-art-')), manifest, contract: deslopContract, vars })
    expect(changed.missingRequired).toEqual([])
    expect(changed.artifacts[0].artifact_kind).toBe('chapter_text')
  })

  test('glob priority follows outputs order: 角色 file is character_sheet, not world_doc', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'harvest-proj-'))
    mkdirSync(join(projectDir, '设定/角色'), { recursive: true })
    writeFileSync(join(projectDir, '设定/角色/楚弦.md'), '# 楚弦')
    writeFileSync(join(projectDir, '设定/世界观.md'), '# 世界观')
    const artifactsDir = mkdtempSync(join(tmpdir(), 'harvest-art-'))
    const contract: any = {
      ...reviewContract,
      write_scope: ['设定/'],
      outputs: [
        { artifact_kind: 'character_sheet', glob: '设定/角色/*.md', binding: 'characters.upsert', required: true },
        { artifact_kind: 'world_doc', glob: '设定/**/*.md', binding: 'worldbuilding.upsert', required: true },
      ],
    }
    const result = harvestKernelArtifacts({ projectDir, artifactsDir, manifest: {}, contract, vars })
    const byPath = Object.fromEntries(result.artifacts.map(a => [a.rel_path, a.artifact_kind]))
    expect(byPath['设定/角色/楚弦.md']).toBe('character_sheet')
    expect(byPath['设定/世界观.md']).toBe('world_doc')
  })
})
