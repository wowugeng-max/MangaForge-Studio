import { expect, test } from 'bun:test'
import { compileOhStoryApplyPrompt } from './compile-apply-prompt'

test('apply prompt keeps only executable suggestions and forbids a full rewrite', () => {
  const prompt = compileOhStoryApplyPrompt({
    projectTitle: '怪谈世界',
    chapterText: '楚弦咽气的时候。',
    reportText: '=== 故事审查报告（solo）===\n### 修改建议\n把开篇的解释删掉。',
  })
  expect(prompt).toContain('怪谈世界')
  expect(prompt).toContain('楚弦咽气的时候。')
  expect(prompt).toContain('把开篇的解释删掉。')
  expect(prompt).toContain('### 修订后全文')
  expect(prompt).toMatch(/solo/)
  expect(prompt).toContain('修改建议')
  expect(prompt).toContain('原样保留')
  expect(prompt).toContain('禁止整章重写')
  expect(prompt).not.toContain('改写整章')
  expect(prompt).not.toContain('补三层矛盾网')
  expect(prompt).not.toContain('story-long-write')
  expect(prompt).not.toContain('【SKILL.md】')
})
