import { describe, expect, test } from 'bun:test'
import { buildEditorRevisionPrompt } from './builders-revision-prompts'

test('drops oh-story theory must_fix lines from the revision hard-priority list', () => {
  const prompt = buildEditorRevisionPrompt({
    project: { title: '怪谈世界' },
    chapter: { chapter_text: '楚弦咽气的时候，雷达绿线扯成了死灰。' },
    report: {
      revision_strategy: 'surgical_patch',
      must_fix: ['补冲突结构：优先补三层矛盾网', '把耳光后的疼痛反应写细一点'],
      one_click_revision_prompt: '补冲突结构：优先补三层矛盾网',
    },
    revisionMode: 'from_report',
  })
  expect(prompt).toContain('把耳光后的疼痛反应写细一点')
  expect(prompt).not.toMatch(/三层矛盾|定地图|有进无出|冲突阶梯/)
})
