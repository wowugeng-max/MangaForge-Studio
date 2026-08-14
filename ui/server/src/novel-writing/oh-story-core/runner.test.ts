import { createHash } from 'node:crypto'
import { expect, test } from 'bun:test'
import { ohStoryChapterTextHash } from './chapter-text-hash'
import {
  extractOhStoryDeslopChapterText,
  OH_STORY_APPLY_NO_REVIEW,
  OH_STORY_APPLY_REWROTE_TOO_MUCH,
  OH_STORY_APPLY_STALE_REVIEW,
  runOhStoryCoreAction,
} from './runner'

test('story-review saves a review and does not call updateChapterText', async () => {
  const saves: any[] = []
  const updates: any[] = []
  const result = await runOhStoryCoreAction({
    workspace: '/tmp/ws',
    project: { id: 3, title: '怪谈世界' },
    chapter: { id: 61, chapter_no: 1, chapter_text: '楚弦咽气的时候。' },
    action: 'review',
    executeAgent: async () => ({ content: '## 编辑审稿\n开篇力：70' }),
    loadSuite: () => ({
      revision: 'abc',
      skills: { 'story-review': { skill_markdown: '# review', references: [] } },
    }),
    saveReview: async (row) => { saves.push(row); return { id: 1 } },
    updateChapterText: async (row) => { updates.push(row) },
  })
  expect(saves[0].review_type).toBe('oh_story_review')
  expect(saves[0].payload.skill_id).toBe('story-review')
  expect(saves[0].payload.chapter_text_hash).toBe(
    createHash('sha256').update('楚弦咽气的时候。', 'utf8').digest('hex'),
  )
  expect(updates).toEqual([])
  expect(result.changed).toBe(false)
})

test('story-deslop updates chapter text from the model body', async () => {
  const updates: any[] = []
  const agentCalls: any[] = []
  const result = await runOhStoryCoreAction({
    workspace: '/tmp/ws',
    project: { id: 3, title: '怪谈世界' },
    chapter: { id: 61, chapter_no: 1, chapter_text: '命运仿佛在和他开玩笑。' },
    action: 'deslop',
    modelId: 281,
    executeAgent: async (...args: any[]) => {
      agentCalls.push(args)
      return { content: '他点了根烟，没说话。' }
    },
    loadSuite: () => ({
      revision: 'abc',
      skills: { 'story-deslop': { skill_markdown: '# deslop', references: [] } },
    }),
    scanDeslopText: async () => ({ findings: [], log: '' }),
    normalizeDeslopText: async (text) => ({ text, log: '' }),
    saveReview: async () => ({ id: 2 }),
    updateChapterText: async (row) => { updates.push(row) },
  })
  expect(updates[0].chapter_text).toBe('他点了根烟，没说话。')
  expect(result.changed).toBe(true)
  expect(agentCalls[0][5].modelId).toBe('281')
})

test('story-deslop writes only the polished chapter after 润色后全文', async () => {
  const updates: any[] = []
  const result = await runOhStoryCoreAction({
    workspace: '/tmp/ws',
    project: { id: 3, title: '怪谈世界' },
    chapter: { id: 61, chapter_no: 1, chapter_text: '楚弦咽气的时候。' },
    action: 'deslop',
    executeAgent: async () => ({
      content: [
        '## AI味检测报告',
        '### 整体评估',
        '- AI味等级：中度',
        '### 润色后全文',
        '',
        '楚弦咽气的时候，雷达绿线扯成了死灰。',
      ].join('\n'),
    }),
    loadSuite: () => ({
      revision: 'abc',
      skills: { 'story-deslop': { skill_markdown: '# deslop', references: [] } },
    }),
    scanDeslopText: async () => ({ findings: [], log: '' }),
    normalizeDeslopText: async (text) => ({ text, log: '' }),
    saveReview: async () => ({ id: 3 }),
    updateChapterText: async (row) => { updates.push(row) },
  })
  expect(updates[0].chapter_text).toBe('楚弦咽气的时候，雷达绿线扯成了死灰。')
  expect(result.chapter_text).toBe('楚弦咽气的时候，雷达绿线扯成了死灰。')
})

test('story-deslop does not write a detection report as chapter text', async () => {
  const updates: any[] = []
  let error: any
  try {
    await runOhStoryCoreAction({
      workspace: '/tmp/ws',
      project: { id: 3, title: '怪谈世界' },
      chapter: { id: 61, chapter_no: 1, chapter_text: '楚弦咽气的时候。' },
      action: 'deslop',
      executeAgent: async () => ({
        content: '## AI味检测报告\n### 整体评估\n- AI味等级：中度\n',
      }),
      loadSuite: () => ({
        revision: 'abc',
        skills: { 'story-deslop': { skill_markdown: '# deslop', references: [] } },
      }),
      scanDeslopText: async () => ({ findings: [], log: '' }),
      normalizeDeslopText: async (text) => ({ text, log: '' }),
      saveReview: async () => ({ id: 4 }),
      updateChapterText: async (row) => { updates.push(row) },
    })
  } catch (caught) {
    error = caught
  }
  expect(updates).toEqual([])
  expect(error?.code).toBe('OH_STORY_CORE_NOT_PROSE')
})

test('extractOhStoryDeslopChapterText keeps plain prose unchanged', () => {
  expect(extractOhStoryDeslopChapterText('他点了根烟，没说话。')).toBe('他点了根烟，没说话。')
})

test('story-deslop does not write empty model output over existing chapter text', async () => {
  const updates: any[] = []
  let error: any
  try {
    await runOhStoryCoreAction({
      workspace: '/tmp/ws',
      project: { id: 3, title: '怪谈世界' },
      chapter: { id: 61, chapter_no: 1, chapter_text: '楚弦咽气的时候。' },
      action: 'deslop',
      executeAgent: async () => ({ content: '', error: 'Provider request failed 403' }),
      loadSuite: () => ({
        revision: 'abc',
        skills: { 'story-deslop': { skill_markdown: '# deslop', references: [] } },
      }),
      scanDeslopText: async () => ({ findings: [], log: '' }),
      normalizeDeslopText: async (text) => ({ text, log: '' }),
      saveReview: async () => ({ id: 2 }),
      updateChapterText: async (row) => { updates.push(row) },
    })
  } catch (caught) {
    error = caught
  }
  expect(updates).toEqual([])
  expect(error?.code).toBe('OH_STORY_CORE_EMPTY_OUTPUT')
  expect(String(error?.message || '')).toContain('403')
})

test('story-review does not save an empty report when the model failed', async () => {
  const saves: any[] = []
  let error: any
  try {
    await runOhStoryCoreAction({
      workspace: '/tmp/ws',
      project: { id: 3, title: '怪谈世界' },
      chapter: { id: 61, chapter_no: 1, chapter_text: '楚弦咽气的时候。' },
      action: 'review',
      executeAgent: async () => ({ content: '' }),
      loadSuite: () => ({
        revision: 'abc',
        skills: { 'story-review': { skill_markdown: '# review', references: [] } },
      }),
      saveReview: async (row) => { saves.push(row); return { id: 1 } },
      updateChapterText: async () => {},
    })
  } catch (caught) {
    error = caught
  }
  expect(saves).toEqual([])
  expect(error?.code).toBe('OH_STORY_CORE_EMPTY_OUTPUT')
})

test('missing suite throws OH_STORY_CORE_NOT_INSTALLED', async () => {
  let error: any
  try {
    await runOhStoryCoreAction({
      workspace: '/tmp/ws',
      project: { id: 3, title: '怪谈世界' },
      chapter: { id: 61, chapter_no: 1, chapter_text: '楚弦咽气的时候。' },
      action: 'review',
      executeAgent: async () => ({ content: 'should not run' }),
      loadSuite: () => null,
      saveReview: async () => ({ id: 1 }),
      updateChapterText: async () => {},
    })
  } catch (caught) {
    error = caught
  }
  expect(error?.code).toBe('OH_STORY_CORE_NOT_INSTALLED')
})

const applyBase = {
  workspace: '/tmp/ws',
  project: { id: 3, title: '怪谈世界' },
  chapter: { id: 61, chapter_no: 1, chapter_text: '楚弦咽气的时候。' },
  action: 'apply' as const,
  loadSuite: () => null,
  saveReview: async () => ({ id: 9 }),
}

test('apply refuses when there is no matching review', async () => {
  const updates: any[] = []
  let error: any
  try {
    await runOhStoryCoreAction({
      ...applyBase,
      executeAgent: async () => ({ content: 'should not run' }),
      findLatestOhStoryReview: async () => null,
      updateChapterText: async (row) => { updates.push(row) },
    })
  } catch (caught) {
    error = caught
  }
  expect(updates).toEqual([])
  expect(error?.code).toBe(OH_STORY_APPLY_NO_REVIEW)
})

test('apply refuses a review without hash or with a different hash', async () => {
  const text = '楚弦咽气的时候。'
  for (const review of [
    { id: 1, payload: { chapter_id: 61, report_text: '建议' } },
    { id: 2, payload: { chapter_id: 61, report_text: '建议', chapter_text_hash: ohStoryChapterTextHash(`${text}改`) } },
  ]) {
    const updates: any[] = []
    let error: any
    try {
      await runOhStoryCoreAction({
        ...applyBase,
        executeAgent: async () => ({ content: 'should not run' }),
        findLatestOhStoryReview: async () => review,
        updateChapterText: async (row) => { updates.push(row) },
      })
    } catch (caught) {
      error = caught
    }
    expect(updates).toEqual([])
    expect(error?.code).toBe(OH_STORY_APPLY_STALE_REVIEW)
  }
})

test('apply writes only the prose after 修订后全文 and saves oh_story_apply', async () => {
  const text = '楚弦咽气的时候。'
  const saves: any[] = []
  const updates: any[] = []
  const result = await runOhStoryCoreAction({
    ...applyBase,
    modelId: 281,
    executeAgent: async () => ({
      content: '=== 故事审查报告 ===\n### 修订后全文\n\n楚弦把烟按进了烟灰缸。',
    }),
    findLatestOhStoryReview: async () => ({
      id: 13560,
      payload: {
        chapter_id: 61,
        report_text: '### 修改建议\n删掉解释。',
        chapter_text_hash: ohStoryChapterTextHash(text),
      },
    }),
    saveReview: async (row) => { saves.push(row); return { id: 88 } },
    updateChapterText: async (row) => { updates.push(row) },
  })
  expect(updates[0]).toMatchObject({
    chapter_text: '楚弦把烟按进了烟灰缸。',
    source: 'oh_story_apply',
  })
  expect(saves[0].review_type).toBe('oh_story_apply')
  expect(saves[0].payload.source_review_id).toBe(13560)
  expect(saves[0].payload.chapter_text_hash).toBe(ohStoryChapterTextHash(text))
  expect(result.changed).toBe(true)
  expect(result.chapter_text).toBe('楚弦把烟按进了烟灰缸。')
})

test('apply does not write a review report as chapter text', async () => {
  const updates: any[] = []
  let error: any
  try {
    await runOhStoryCoreAction({
      ...applyBase,
      executeAgent: async () => ({ content: '=== 故事审查报告（solo）===\n### 修改建议\n再改一刀。' }),
      findLatestOhStoryReview: async () => ({
        id: 1,
        payload: {
          chapter_id: 61,
          report_text: '建议',
          chapter_text_hash: ohStoryChapterTextHash('楚弦咽气的时候。'),
        },
      }),
      updateChapterText: async (row) => { updates.push(row) },
    })
  } catch (caught) {
    error = caught
  }
  expect(updates).toEqual([])
  expect(error?.code).toBe('OH_STORY_CORE_NOT_PROSE')
})

function tenParagraphs(changed: number) {
  return Array.from({ length: 10 }, (_, i) => (
    i < changed ? `第${i + 1}段改过了。` : `第${i + 1}段原文。`
  )).join('\n\n')
}

test('apply writes when most original paragraphs are kept', async () => {
  const original = tenParagraphs(0)
  const updates: any[] = []
  const result = await runOhStoryCoreAction({
    ...applyBase,
    chapter: { id: 61, chapter_no: 1, chapter_text: original },
    executeAgent: async () => ({ content: `### 修订后全文\n\n${tenParagraphs(2)}` }),
    findLatestOhStoryReview: async () => ({
      id: 1,
      payload: {
        chapter_id: 61,
        report_text: '### 修改建议\n改前两段。',
        chapter_text_hash: ohStoryChapterTextHash(original),
      },
    }),
    updateChapterText: async (row) => { updates.push(row) },
  })
  expect(updates[0].chapter_text).toBe(tenParagraphs(2))
  expect(result.changed).toBe(true)
})

test('apply refuses a full-chapter polish and does not write', async () => {
  const original = tenParagraphs(0)
  const updates: any[] = []
  let error: any
  try {
    await runOhStoryCoreAction({
      ...applyBase,
      chapter: { id: 61, chapter_no: 1, chapter_text: original },
      executeAgent: async () => ({ content: `### 修订后全文\n\n${tenParagraphs(10)}` }),
      findLatestOhStoryReview: async () => ({
        id: 1,
        payload: {
          chapter_id: 61,
          report_text: '### 修改建议\n改前两段。',
          chapter_text_hash: ohStoryChapterTextHash(original),
        },
      }),
      updateChapterText: async (row) => { updates.push(row) },
    })
  } catch (caught) {
    error = caught
  }
  expect(updates).toEqual([])
  expect(error?.code).toBe(OH_STORY_APPLY_REWROTE_TOO_MUCH)
})

test('deslop file mode sends prescan findings and writes normalized text', async () => {
  const prompts: string[] = []
  const scans: string[] = []
  const saves: any[] = []
  const updates: any[] = []
  const result = await runOhStoryCoreAction({
    workspace: '/tmp/ws',
    project: { id: 3, title: '怪谈世界' },
    chapter: { id: 61, chapter_no: 1, chapter_text: '声音不大，却带着杀意。' },
    action: 'deslop',
    executeAgent: async (_stage, _contract, _agent, _project, context) => {
      prompts.push(String(context.task || ''))
      return { content: '### 润色后全文\n\n他开口了。' }
    },
    loadSuite: () => ({
      revision: 'abc',
      skills: { 'story-deslop': { skill_markdown: '# deslop', references: [] } },
    }),
    scanDeslopText: async (text, phase) => {
      scans.push(`${phase}:${text}`)
      return {
        findings: phase === 'prescan'
          ? [{ severity: 'blocking', type: 'voice-contrast', excerpt: '声音不大' }]
          : [],
        log: phase,
      }
    },
    normalizeDeslopText: async (text) => ({ text: `${text}收。`, log: 'normalized' }),
    saveReview: async (row) => { saves.push(row); return { id: 9 } },
    updateChapterText: async (row) => { updates.push(row) },
  })
  expect(prompts[0]).toContain('声音不大')
  expect(prompts[0]).toContain('voice-contrast')
  expect(prompts).toHaveLength(1)
  expect(scans[0]).toBe('prescan:声音不大，却带着杀意。')
  expect(updates[0].chapter_text).toBe('他开口了。收。')
  expect(saves[0].payload.file_mode).toBe(true)
  expect(saves[0].payload.rounds).toBe(1)
  expect(result.chapter_text).toBe('他开口了。收。')
})

test('deslop file mode reruns when blocking findings remain, up to three rounds', async () => {
  const prompts: string[] = []
  let scanCount = 0
  await runOhStoryCoreAction({
    workspace: '/tmp/ws',
    project: { id: 3, title: '怪谈世界' },
    chapter: { id: 61, chapter_no: 1, chapter_text: '原文。' },
    action: 'deslop',
    executeAgent: async (_stage, _contract, _agent, _project, context) => {
      prompts.push(String(context.task || ''))
      return { content: `### 润色后全文\n\n第${prompts.length}稿。` }
    },
    loadSuite: () => ({
      revision: 'abc',
      skills: { 'story-deslop': { skill_markdown: '# deslop', references: [] } },
    }),
    scanDeslopText: async () => {
      scanCount += 1
      return {
        findings: scanCount < 4
          ? [{ severity: 'blocking', type: 'em-dash', excerpt: '——' }]
          : [],
        log: `scan-${scanCount}`,
      }
    },
    normalizeDeslopText: async (text) => ({ text, log: '' }),
    saveReview: async () => ({ id: 10 }),
    updateChapterText: async () => {},
  })
  expect(prompts).toHaveLength(3)
  expect(prompts[1]).toContain('em-dash')
})

test('deslop keeps a second pass when the report says 中度 even if scripts are clean', async () => {
  const prompts: string[] = []
  const result = await runOhStoryCoreAction({
    workspace: '/tmp/ws',
    project: { id: 3, title: '怪谈世界' },
    chapter: { id: 61, chapter_no: 1, chapter_text: '原文。' },
    action: 'deslop',
    executeAgent: async (_stage, _contract, _agent, _project, context) => {
      prompts.push(String(context.task || ''))
      return {
        content: prompts.length === 1
          ? '## AI味检测报告\n- AI味等级：中度\n### 润色后全文\n\n第一稿。'
          : '### 润色后全文\n\n第二稿。',
      }
    },
    loadSuite: () => ({
      revision: 'abc',
      skills: { 'story-deslop': { skill_markdown: '# deslop', references: [] } },
    }),
    scanDeslopText: async () => ({ findings: [], log: '' }),
    normalizeDeslopText: async (text) => ({ text, log: '' }),
    saveReview: async () => ({ id: 11 }),
    updateChapterText: async () => {},
  })
  expect(prompts).toHaveLength(2)
  expect(prompts[1]).toContain('Pass 2')
  expect(prompts[1]).toContain('去书面化')
  expect(result.chapter_text).toBe('第二稿。')
})
