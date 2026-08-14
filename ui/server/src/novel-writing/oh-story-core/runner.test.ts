import { expect, test } from 'bun:test'
import { runOhStoryCoreAction } from './runner'

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
  expect(updates).toEqual([])
  expect(result.changed).toBe(false)
})

test('story-deslop updates chapter text from the model body', async () => {
  const updates: any[] = []
  const result = await runOhStoryCoreAction({
    workspace: '/tmp/ws',
    project: { id: 3, title: '怪谈世界' },
    chapter: { id: 61, chapter_no: 1, chapter_text: '命运仿佛在和他开玩笑。' },
    action: 'deslop',
    executeAgent: async () => ({ content: '他点了根烟，没说话。' }),
    loadSuite: () => ({
      revision: 'abc',
      skills: { 'story-deslop': { skill_markdown: '# deslop', references: [] } },
    }),
    saveReview: async () => ({ id: 2 }),
    updateChapterText: async (row) => { updates.push(row) },
  })
  expect(updates[0].chapter_text).toBe('他点了根烟，没说话。')
  expect(result.changed).toBe(true)
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
