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
const SPAWN_OK = {
  subagent_threads: [{ thread_id: 's', parent_thread_id: 't', agent: 'story-architect' }],
  agent_hints: ['story-architect'],
}

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
    const pass = await runPostHarvestGates({ ...base, spawnEvidence: SPAWN_OK, readArtifactText: textReader({ '审稿/第002章.md': 'Fallback: none\nEffective Mode: multi\n正文' }) })
    expect(pass.failedCode).toBeNull()
    const solo = await runPostHarvestGates({ ...base, spawnEvidence: SPAWN_OK, readArtifactText: textReader({ '审稿/第002章.md': 'Fallback: solo (agents unavailable)\n正文' }) })
    expect(solo.failedCode).toBe('SOLO_FALLBACK')
    const missing = await runPostHarvestGates({ ...base, artifacts: [], readArtifactText: textReader({}) })
    expect(missing.failedCode).toBe('SOLO_FALLBACK')
  })

  test('mid-report solo mention does not trip the gate', async () => {
    const { ws, project, chapter } = await seed()
    const result = await runPostHarvestGates({
      workspace: ws, projectId: project.id, chapterId: chapter.id, contract: reviewContract,
      artifacts: [{ rel_path: '审稿/第002章.md', artifact_kind: 'review_report' }], warnings: [],
      spawnEvidence: SPAWN_OK,
      readArtifactText: textReader({ '审稿/第002章.md': 'Fallback: none\n第三段提到 solo 模式的风险。' }),
    })
    expect(result.failedCode).toBeNull()
  })

  test('full review with zero spawn evidence gates NO_SPAWN', async () => {
    const { ws, project, chapter } = await seed()
    const base = {
      workspace: ws, projectId: project.id, chapterId: chapter.id, contract: reviewContract,
      artifacts: [{ rel_path: '审稿/第002章.md', artifact_kind: 'review_report' }],
      warnings: [],
      readArtifactText: textReader({ '审稿/第002章.md': 'Fallback: none\n正文' }),
    }
    const none = await runPostHarvestGates({ ...base, spawnEvidence: { subagent_threads: [], agent_hints: [] } })
    expect(none.failedCode).toBe('NO_SPAWN')
    const ok = await runPostHarvestGates({
      ...base,
      spawnEvidence: { subagent_threads: [{ thread_id: 's', parent_thread_id: 't', agent: 'story-architect' }], agent_hints: ['story-architect'] },
    })
    expect(ok.failedCode).toBeNull()
  })

  test('apply contract ignores missing spawn evidence', async () => {
    const { ws, project, chapter } = await seed()
    await createNovelReview(ws, {
      project_id: project.id, review_type: 'oh_story_review',
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_text_hash: ohStoryChapterTextHash(EIGHT_PARAGRAPHS), report_text: 'r' }),
    })
    const keep = EIGHT_PARAGRAPHS + '\n\n新增段。'
    const result = await runPostHarvestGates({
      workspace: ws, projectId: project.id, chapterId: chapter.id, contract: applyContract,
      artifacts: [{ rel_path: '正文/第002章_二.md', artifact_kind: 'chapter_text' }],
      warnings: [],
      spawnEvidence: { subagent_threads: [], agent_hints: [] },
      readArtifactText: textReader({ '正文/第002章_二.md': keep }),
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

const baseOpenContract: any = {
  id: 'oh-story-core.story-long-write.open', verb: 'open_book', capability: 'outline',
  skill_name: 'story-long-write',
  gates: ['reject_chapter_text_artifact', 'require_outline_mix'],
  outputs: [], write_scope: ['设定/', '大纲/'], commit: { mode: 'manual', domain_writes: [] },
  invoke: { mention: '$story-long-write', prompt: 'x' }, projection: { mounts: ['skill_tree'] },
}
const art = (kind: string, rel: string) => ({ rel_path: rel, artifact_kind: kind, vault_path: '' })
const okOpenArtifacts = [
  art('world_doc', '设定/世界观.md'),
  art('character_sheet', '设定/角色/楚弦.md'),
  art('outline_doc', '大纲/大纲.md'),
  art('outline_doc', '大纲/细纲_第001章.md'),
]

describe('verb gates', () => {
  const run = (artifacts: any[], warnings: any[] = [], contract = baseOpenContract) =>
    runPostHarvestGates({
      workspace: '/tmp/nowhere', projectId: 1, chapterId: 0, contract,
      artifacts, warnings, readArtifactText: () => '',
    })

  test('clean open_book harvest passes', async () => {
    const gate = await run(okOpenArtifacts)
    expect(gate.failedCode).toBeNull()
  })
  test('正文/ prefix diff outside write_scope gates the candidate', async () => {
    const gate = await run(okOpenArtifacts, [{ warning: 'write_outside_scope', rel_path: '正文/第001章_偷跑.md' }])
    expect(gate.failedCode).toBe('REJECT_CHAPTER_TEXT')
    expect(gate.failedStatus).toBe('gated')
  })
  test('chapter_text artifact gates the candidate', async () => {
    const gate = await run([...okOpenArtifacts, art('chapter_text', '设定/伪装.md')])
    expect(gate.failedCode).toBe('REJECT_CHAPTER_TEXT')
  })
  test('two 细纲 without any 总纲 fail outline mix as failed', async () => {
    const gate = await run([
      art('world_doc', '设定/世界观.md'), art('character_sheet', '设定/角色/楚弦.md'),
      art('outline_doc', '大纲/细纲_第001章.md'), art('outline_doc', '大纲/细纲_第002章.md'),
    ])
    expect(gate.failedCode).toBe('KIND_COUNT_BELOW_MIN')
    expect(gate.failedStatus).toBe('failed')
  })
  test('outline mix treats 第N章 in heading as 细纲 when filename lacks it', async () => {
    const gate = await runPostHarvestGates({
      workspace: '/tmp/nowhere', projectId: 1, chapterId: 0, contract: baseOpenContract,
      artifacts: [
        art('world_doc', '设定/世界观.md'), art('character_sheet', '设定/角色/楚弦.md'),
        art('outline_doc', '大纲/大纲.md'), art('outline_doc', '大纲/细纲.md'),
      ],
      warnings: [],
      readArtifactText: textReader({
        '大纲/大纲.md': '# 全书大纲\n卷纲',
        '大纲/细纲.md': '# 第003章 初入怪谈\n细纲',
      }),
    })
    expect(gate.failedCode).toBeNull()
  })
  test('outline mix ignores 第N章 in 总纲 body; mix with filename or heading 细纲 passes', async () => {
    const masterBody = '# 全书大纲\n第1章 初入怪谈的卷纲摘要'
    const shared = [
      art('world_doc', '设定/世界观.md'), art('character_sheet', '设定/角色/楚弦.md'),
      art('outline_doc', '大纲/大纲.md'),
    ]
    const byFilename = await runPostHarvestGates({
      workspace: '/tmp/nowhere', projectId: 1, chapterId: 0, contract: baseOpenContract,
      artifacts: [...shared, art('outline_doc', '大纲/细纲_第001章.md')],
      warnings: [],
      readArtifactText: textReader({
        '大纲/大纲.md': masterBody,
        '大纲/细纲_第001章.md': '# 第001章\n细纲',
      }),
    })
    expect(byFilename.failedCode).toBeNull()
    const byHeading = await runPostHarvestGates({
      workspace: '/tmp/nowhere', projectId: 1, chapterId: 0, contract: baseOpenContract,
      artifacts: [...shared, art('outline_doc', '大纲/细纲.md')],
      warnings: [],
      readArtifactText: textReader({
        '大纲/大纲.md': masterBody,
        '大纲/细纲.md': '# 第001章\n细纲',
      }),
    })
    expect(byHeading.failedCode).toBeNull()
  })
  test('required kind count below template min fails', async () => {
    const gate = await run([
      art('world_doc', '设定/世界观.md'), art('character_sheet', '设定/角色/楚弦.md'),
      art('outline_doc', '大纲/大纲.md'),
    ])
    expect(gate.failedCode).toBe('KIND_COUNT_BELOW_MIN')
    expect(gate.failedStatus).toBe('failed')
  })
  test('reject_outline_artifact fires on 大纲/ prefix', async () => {
    const deslop: any = {
      ...baseOpenContract, id: 'oh-story-core.story-deslop.file', verb: 'deslop_chapter',
      capability: 'rewrite', gates: ['reject_outline_artifact'], write_scope: ['正文/'],
    }
    const gate = await run([art('chapter_text', '正文/第002章_x.md')], [{ warning: 'write_outside_scope', rel_path: '大纲/细纲_第002章.md' }], deslop)
    expect(gate.failedCode).toBe('REJECT_OUTLINE')
    expect(gate.failedStatus).toBe('gated')
  })
})
