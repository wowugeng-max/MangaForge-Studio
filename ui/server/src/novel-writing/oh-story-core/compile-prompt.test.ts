import { expect, test } from 'bun:test'
import { compileOhStoryCorePrompt } from './compile-prompt'

test('review prompt includes SKILL.md and forbids the humanize rewrite contract', () => {
  const prompt = compileOhStoryCorePrompt({
    skillId: 'story-review',
    skillMarkdown: '# Novel Review\n找出问题。',
    references: [{ file: 'quality-checklist.md', text: '开头有钩子' }],
    chapterText: '楚弦咽气的时候。',
    projectTitle: '怪谈世界',
  })
  expect(prompt).toContain('# Novel Review')
  expect(prompt).toContain('开头有钩子')
  expect(prompt).toContain('楚弦咽气的时候。')
  expect(prompt).toMatch(/solo/)
  expect(prompt).not.toContain('只输出改写后正文')
  expect(prompt).not.toContain('补三层矛盾网')
})

test('deslop prompt includes SKILL.md and does not inject outline-conflict lectures', () => {
  const prompt = compileOhStoryCorePrompt({
    skillId: 'story-deslop',
    skillMarkdown: '# Deslop\n能删先删。',
    references: [],
    chapterText: '命运仿佛在和他开玩笑。',
    projectTitle: '怪谈世界',
  })
  expect(prompt).toContain('能删先删')
  expect(prompt).not.toContain('【总合同】')
  expect(prompt).not.toContain('定地图→定阵营→定角色')
})
