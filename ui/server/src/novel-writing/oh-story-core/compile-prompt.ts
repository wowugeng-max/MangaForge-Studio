import type { OhStoryCoreSkillId } from './types'

export type CompileOhStoryCorePromptInput = {
  skillId: OhStoryCoreSkillId
  skillMarkdown: string
  references: Array<{ file: string; text: string }>
  chapterText: string
  projectTitle: string
}

export function compileOhStoryCorePrompt(input: CompileOhStoryCorePromptInput): string {
  const parts = [
    '【执行模式】solo。不要 spawn 子 agent，不要读写 .novel/。',
    `项目：${input.projectTitle}`,
    `技能：${input.skillId}`,
  ]
  if (input.skillId === 'story-review') {
    parts.push('审稿（story-review）：只输出审稿报告，不要改章节正文。')
  }
  if (input.skillId === 'story-deslop') {
    parts.push('去AI（story-deslop）：按本 SKILL.md 的输出要求工作。')
  }
  parts.push('【SKILL.md】', input.skillMarkdown)
  for (const reference of input.references) {
    parts.push(`【参考 · ${reference.file}】`, reference.text)
  }
  parts.push('【原文】', input.chapterText)
  return parts.join('\n')
}
