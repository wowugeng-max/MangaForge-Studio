import type {
  FictionHumanizerMode,
  WritingSkillDefinition,
  WritingSkillEnabledMap,
  WritingSkillId,
} from './types'
import { WRITING_SKILL_IDS } from './types'

export { WRITING_SKILL_IDS }
export type { FictionHumanizerMode, WritingSkillDefinition, WritingSkillEnabledMap, WritingSkillId }

export const DEFAULT_FICTION_HUMANIZER_MODE: FictionHumanizerMode = 'polish'

export const WRITING_SKILL_STAGE_LABEL: Record<WritingSkillId, string> = {
  'fiction-humanizer-zh': '写作skill · 小说去AI味',
  'remove-ai-flavor': '写作skill · 去句壳',
  'humanizer-zh': '写作skill · 维基去AI词',
}

export const WRITING_SKILL_CATALOG: WritingSkillDefinition[] = [
  {
    id: 'fiction-humanizer-zh',
    label: '小说去AI味',
    description: '补铺垫、过程、余波，修对白和章末钩子，避免大纲腔。',
    defaultEnabled: true,
  },
  {
    id: 'remove-ai-flavor',
    label: '去句壳',
    description: '拆「不是…而是」「真正…的是」等助手句壳。现有正则清理仍会先跑。',
    defaultEnabled: true,
  },
  {
    id: 'humanizer-zh',
    label: '维基去AI词',
    description: '去宣传腔、排比和 AI 高频词。默认关；开启时禁止作者第一人称“灵魂”。',
    defaultEnabled: false,
  },
]

export const DEFAULT_WRITING_SKILLS_ENABLED: WritingSkillEnabledMap = {
  'fiction-humanizer-zh': true,
  'remove-ai-flavor': true,
  'humanizer-zh': false,
}

export function isWritingSkillId(value: unknown): value is WritingSkillId {
  return typeof value === 'string' && (WRITING_SKILL_IDS as readonly string[]).includes(value)
}

export function isFictionHumanizerMode(value: unknown): value is FictionHumanizerMode {
  return value === 'polish' || value === 'rewrite'
}
