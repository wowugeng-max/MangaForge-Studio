import { loadVendorSkillMarkdown } from './load-vendor'
import type { FictionHumanizerMode, WritingSkillId } from './types'

const SHARED_FICTION_CONTRACT = [
  '【总合同】',
  '不改主线、人物关系、时间线、已有伏笔和关键设定。',
  '不编造原文没有的经历、数据、笑话或个人轶事。',
  '不输出分析、清单、评分或 markdown。',
  '只输出改写后正文。',
]

const HUMANIZER_ZH_FICTION_SAFETY = [
  '【小说安全套 · humanizer-zh】',
  '禁止第一人称作者旁白（“我一直在想”“我真的不知道该怎么看待”“让我困扰的是”）。',
  '禁止为了“注入灵魂”编造原文没有的经历或作者评论。',
  '禁止改主线。只用角色动作、对白和现场细节补质感，不用作者“我”。',
]

function resolveGenre(project?: any, contextPackage?: any): string {
  return String(
    project?.genre
    || contextPackage?.project?.genre
    || contextPackage?.writing_bible?.genre
    || '',
  ).trim()
}

function modeLines(mode: FictionHumanizerMode): string[] {
  if (mode === 'rewrite') {
    return [
      '档位：重写。',
      '可重构场景链，仍锁人物、设定和章节功能。',
    ]
  }
  return [
    '档位：精修。',
    '可重排段落，必须补铺垫、过程、余波。',
  ]
}

export function compileWritingSkillPassPrompt(input: {
  skillId: WritingSkillId
  mode?: FictionHumanizerMode
  sourceText: string
  project?: any
  contextPackage?: any
  chunk?: { index: number; total: number }
}): string {
  const mode = input.mode === 'rewrite' ? 'rewrite' : 'polish'
  const title = input.project?.title ? `项目：${input.project.title}` : ''
  const chunk = input.chunk && input.chunk.total > 1
    ? `这是第 ${input.chunk.index + 1}/${input.chunk.total} 段，前后文已锁定，不要改本章未给出的情节。`
    : ''
  const parts = [
    `任务：按 ${input.skillId} 对小说正文做去 AI 味改写。只输出改写后正文。`,
    title,
    input.skillId === 'fiction-humanizer-zh' ? modeLines(mode).join('') : '',
    ...SHARED_FICTION_CONTRACT,
    chunk,
    '【SKILL.md】',
    loadVendorSkillMarkdown(input.skillId),
  ]
  if (input.skillId === 'fiction-humanizer-zh') {
    for (const file of ['ai-fiction-patterns.md', 'scene-rewrite.md', 'chapter-checklist.md']) {
      parts.push(`【参考 · ${file}】`, loadVendorSkillMarkdown('fiction-humanizer-zh', file))
    }
    if (resolveGenre(input.project, input.contextPackage)) {
      parts.push('【参考 · genre-notes.md】', loadVendorSkillMarkdown('fiction-humanizer-zh', 'genre-notes.md'))
    }
  }
  if (input.skillId === 'humanizer-zh') parts.push(...HUMANIZER_ZH_FICTION_SAFETY)
  parts.push('【原文】', String(input.sourceText || '').trim())
  return parts.filter(Boolean).join('\n')
}

export function compileWritingSkillRevisionDirectives(_enabledIds: WritingSkillId[] = []): string {
  return ''
}
