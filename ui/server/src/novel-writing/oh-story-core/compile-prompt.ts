import type { OhStoryCoreSkillId } from './types'

export type CompileOhStoryCorePromptInput = {
  skillId: OhStoryCoreSkillId
  skillMarkdown: string
  references: Array<{ file: string; text: string }>
  chapterText: string
  projectTitle: string
  scriptFindings?: string
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
    parts.push('去AI（story-deslop）：文件模式。按本 SKILL.md 做检测、定级，并主线程 inline 执行对应 Gate，不要 spawn 子 agent。检测报告可以写在前面；完整润色正文必须放在「### 润色后全文」之后。MangaForge 只把这一段写入章节。')
  }
  parts.push('【SKILL.md】', input.skillMarkdown)
  for (const reference of input.references) {
    parts.push(`【参考 · ${reference.file}】`, reference.text)
  }
  if (input.skillId === 'story-deslop' && input.scriptFindings) {
    parts.push('【脚本预检】', input.scriptFindings)
  }
  parts.push('【原文】', input.chapterText)
  return parts.join('\n')
}
