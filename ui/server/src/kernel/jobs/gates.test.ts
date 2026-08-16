// ui/server/src/kernel/jobs/gates.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelProject, createNovelReview } from '../../novel'
import { ohStoryChapterTextHash } from '../../novel-writing/oh-story-core/chapter-text-hash'
import { BUILTIN_KERNEL_CONTRACTS } from '../contracts/builtin'
import { runPostHarvestGates } from './gates'

const reviewContract = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-review.full')!
const applyContract = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-apply.surgical')!

const EIGHT_PARAGRAPHS = Array.from({ length: 8 }, (_, i) => `原文段${i}。`).join('\n\n')

async function seed(chapterText = EIGHT_PARAGRAPHS) {
  const ws = mkdtempSync(join(tmpdir(), 'gates-'))
  const project = await createNovelProject(ws, { title: '书' })
  const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: chapterText })
  return { ws, project, chapter }
}

function textReader(map: Record<string, string>) {
  return (artifact: any) => map[artifact.rel_path] ?? ''
}

describe('runPostHarvestGates', () => {
  test('review passes when Fallback line is none; solo line gates', async () => {
    const { ws, project, chapter } = await seed()
    const base = {
      workspace: ws, projectId: project.id, chapterId: chapter.id, contract: reviewContract,
      artifacts: [{ rel_path: '审稿/第002章.md', artifact_kind: 'review_report' }],
      warnings: [],
    }
    const pass = await runPostHarvestGates({ ...base, readArtifactText: textReader({ '审稿/第002章.md': 'Fallback: none\nEffective Mode: multi\n正文' }) })
    expect(pass.failedCode).toBeNull()
    const solo = await runPostHarvestGates({ ...base, readArtifactText: textReader({ '审稿/第002章.md': 'Fallback: solo (agents unavailable)\n正文' }) })
    expect(solo.failedCode).toBe('SOLO_FALLBACK')
    const missing = await runPostHarvestGates({ ...base, artifacts: [], readArtifactText: textReader({}) })
    expect(missing.failedCode).toBe('SOLO_FALLBACK')
  })

  test('mid-report solo mention does not trip the gate', async () => {
    const { ws, project, chapter } = await seed()
    const result = await runPostHarvestGates({
      workspace: ws, projectId: project.id, chapterId: chapter.id, contract: reviewContract,
      artifacts: [{ rel_path: '审稿/第002章.md', artifact_kind: 'review_report' }], warnings: [],
      readArtifactText: textReader({ '审稿/第002章.md': 'Fallback: none\n第三段提到 solo 模式的风险。' }),
    })
    expect(result.failedCode).toBeNull()
  })

  test('apply gates: stale review, empty chapter, rewrote too much', async () => {
    const { ws, project, chapter } = await seed()
    const artifacts = [{ rel_path: '正文/第002章_二.md', artifact_kind: 'chapter_text' }]
    const noReview = await runPostHarvestGates({
      workspace: ws, projectId: project.id, chapterId: chapter.id, contract: applyContract,
      artifacts, warnings: [], readArtifactText: textReader({ '正文/第002章_二.md': EIGHT_PARAGRAPHS }),
    })
    expect(noReview.failedCode).toBe('OH_STORY_APPLY_NO_REVIEW')
    await createNovelReview(ws, {
      project_id: project.id, review_type: 'oh_story_review',
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_text_hash: ohStoryChapterTextHash(EIGHT_PARAGRAPHS), report_text: 'r' }),
    })
    const rewrote = await runPostHarvestGates({
      workspace: ws, projectId: project.id, chapterId: chapter.id, contract: applyContract,
      artifacts, warnings: [], readArtifactText: textReader({ '正文/第002章_二.md': '全新段。' }),
    })
    expect(rewrote.failedCode).toBe('OH_STORY_APPLY_REWROTE_TOO_MUCH')
    const empty = await runPostHarvestGates({
      workspace: ws, projectId: project.id, chapterId: chapter.id, contract: applyContract,
      artifacts, warnings: [], readArtifactText: textReader({ '正文/第002章_二.md': '  \n ' }),
    })
    expect(empty.failedCode).toBe('CHAPTER_FILE_MISSING')
    const keep = EIGHT_PARAGRAPHS + '\n\n新增段。'
    const ok = await runPostHarvestGates({
      workspace: ws, projectId: project.id, chapterId: chapter.id, contract: applyContract,
      artifacts, warnings: [{ warning: 'write_outside_scope', rel_path: '越界.md' }],
      readArtifactText: textReader({ '正文/第002章_二.md': keep }),
    })
    expect(ok.failedCode).toBeNull()
    expect(ok.results.some(r => r.gate === 'write_outside_scope' && r.message === '越界.md')).toBe(true)
  })
})
