import { describe, expect, test } from 'bun:test'
import { compileWritingSkillPassPrompt } from './compile-pass-prompt'

const SOURCE = '林序把门带上，沿着走廊继续往前。'

const INSTALLED_PROMPT = {
  id: 'my-style-pack',
  name: '我的文风包',
  skill_markdown: '# My Style\n只改语气，不改剧情。',
  references: [
    { file: 'a.md', text: '参考甲' },
    { file: 'b.md', text: '参考乙' },
  ],
}

describe('compileWritingSkillPassPrompt', () => {
  test('polish prompt includes full skill, three fixed refs, and no 轻改 default', () => {
    const prompt = compileWritingSkillPassPrompt({
      skillId: 'fiction-humanizer-zh',
      mode: 'polish',
      sourceText: SOURCE,
    })
    expect(prompt).toContain('只输出改写后正文')
    expect(prompt).toContain('档位：精修')
    expect(prompt).toContain('可重排段落')
    expect(prompt).toContain('必须补铺垫')
    expect(prompt).toContain('# 中文小说去 AI 味')
    expect(prompt).toContain('## Workflow')
    expect(prompt).toContain('## Edit Modes')
    expect(prompt).toContain('【参考 · ai-fiction-patterns.md】')
    expect(prompt).toContain('【参考 · scene-rewrite.md】')
    expect(prompt).toContain('【参考 · chapter-checklist.md】')
    expect(prompt).not.toContain('【参考 · genre-notes.md】')
    const preamble = prompt.split('【SKILL.md】')[0] ?? ''
    expect(preamble).not.toContain('轻改：保留原段落顺序')
    expect(prompt).not.toContain('±15%')
    expect(prompt).toContain(SOURCE)
    expect(prompt).not.toContain('# Remove AI Flavor')
  })

  test('rewrite mode and genre notes appear when requested', () => {
    const prompt = compileWritingSkillPassPrompt({
      skillId: 'fiction-humanizer-zh',
      mode: 'rewrite',
      sourceText: SOURCE,
      project: { genre: '规则怪谈' },
    })
    expect(prompt).toContain('档位：重写')
    expect(prompt).toContain('可重构场景链')
    expect(prompt).toContain('【参考 · genre-notes.md】')
  })

  test('remove-ai-flavor does not include fiction-humanizer references', () => {
    const prompt = compileWritingSkillPassPrompt({
      skillId: 'remove-ai-flavor',
      sourceText: SOURCE,
    })
    expect(prompt).toContain('# Remove AI Flavor')
    expect(prompt).not.toContain('【参考 · ai-fiction-patterns.md】')
    expect(prompt).not.toContain('档位：')
  })

  test('humanizer-zh adds the fiction safety sleeve', () => {
    const prompt = compileWritingSkillPassPrompt({
      skillId: 'humanizer-zh',
      sourceText: SOURCE,
    })
    expect(prompt).toContain('# Humanizer-zh')
    expect(prompt).toContain('【小说安全套 · humanizer-zh】')
    expect(prompt).toContain('禁止第一人称作者旁白')
    expect(prompt).not.toContain('## 质量评分')
  })

  test('chunk hint names the segment index', () => {
    const prompt = compileWritingSkillPassPrompt({
      skillId: 'remove-ai-flavor',
      sourceText: SOURCE,
      chunk: { index: 1, total: 2 },
    })
    expect(prompt).toContain('这是第 2/2 段')
    expect(prompt).toContain('前后文已锁定')
  })

  test('installed skills compile through the generic path with full SKILL.md and all references', () => {
    const prompt = compileWritingSkillPassPrompt({
      skillId: 'my-style-pack',
      sourceText: SOURCE,
      installed: INSTALLED_PROMPT,
    })
    expect(prompt).toContain('我的文风包')
    expect(prompt).toContain('# My Style')
    expect(prompt).toContain('【参考 · a.md】')
    expect(prompt).toContain('【参考 · b.md】')
    expect(prompt.indexOf('【参考 · a.md】')).toBeLessThan(prompt.indexOf('【参考 · b.md】'))
    expect(prompt).toContain('只输出改写后正文')
    expect(prompt).toContain(SOURCE)
    expect(prompt).not.toContain('档位：')
    expect(prompt).not.toContain('【小说安全套 · humanizer-zh】')
  })

  test('installed skills without a loaded payload throw instead of silently compiling', () => {
    expect(() => compileWritingSkillPassPrompt({
      skillId: 'my-style-pack',
      sourceText: SOURCE,
    })).toThrow('missing installed skill payload')
  })
})
