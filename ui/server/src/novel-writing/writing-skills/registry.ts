import { WRITING_SKILL_PACK_ID_RE } from './installed-store'
import type {
  BuiltinWritingSkillId,
  FictionHumanizerMode,
  WritingSkillDefinition,
  WritingSkillEnabledMap,
  WritingSkillId,
} from './types'
import { WRITING_SKILL_IDS } from './types'

export { WRITING_SKILL_IDS, WRITING_SKILL_PACK_ID_RE }
export type { FictionHumanizerMode, WritingSkillDefinition, WritingSkillEnabledMap, WritingSkillId }

export const DEFAULT_FICTION_HUMANIZER_MODE: FictionHumanizerMode = 'polish'
export const WRITING_SKILL_PACK_LABEL_MAX = 40

export const WRITING_SKILL_STAGE_LABEL: Record<BuiltinWritingSkillId, string> = {
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

export function isBuiltinWritingSkillId(value: unknown): value is BuiltinWritingSkillId {
  return typeof value === 'string' && (WRITING_SKILL_IDS as readonly string[]).includes(value)
}

// Legacy alias kept for existing call sites (revision-run-view, resolve-enabled).
export const isWritingSkillId = isBuiltinWritingSkillId

export function isWritingSkillPackIdShape(value: unknown): boolean {
  return typeof value === 'string' && WRITING_SKILL_PACK_ID_RE.test(value)
}

export function isFictionHumanizerMode(value: unknown): value is FictionHumanizerMode {
  return value === 'polish' || value === 'rewrite'
}

export type WritingSkillCatalogEntry = {
  id: string
  label: string
  description: string
  builtin: boolean
  supports_mode: boolean
  default_enabled: boolean
  revision?: string
  source_url?: string
  installed_at?: string
}

export function buildWritingSkillCatalog(
  installed: ReadonlyArray<{
    id: string
    name: string
    description: string
    revision: string
    source_url: string
    installed_at: string
  }> = [],
): WritingSkillCatalogEntry[] {
  const builtins: WritingSkillCatalogEntry[] = WRITING_SKILL_CATALOG.map(definition => ({
    id: definition.id,
    label: definition.label,
    description: definition.description,
    builtin: true,
    supports_mode: definition.id === 'fiction-humanizer-zh',
    default_enabled: definition.defaultEnabled,
  }))
  const packs: WritingSkillCatalogEntry[] = [...installed]
    .filter(pack => isWritingSkillPackIdShape(pack?.id) && !isBuiltinWritingSkillId(pack.id))
    .sort((a, b) => a.installed_at.localeCompare(b.installed_at) || a.id.localeCompare(b.id))
    .map(pack => ({
      id: pack.id,
      label: String(pack.name || pack.id).slice(0, WRITING_SKILL_PACK_LABEL_MAX),
      description: String(pack.description || '').slice(0, 500),
      builtin: false,
      supports_mode: false,
      default_enabled: false,
      revision: pack.revision,
      source_url: pack.source_url,
      installed_at: pack.installed_at,
    }))
  return [...builtins, ...packs]
}

export function resolveWritingSkillStageLabel(
  id: string,
  installed: ReadonlyArray<{ id: string; name?: string }> = [],
): string {
  if (isBuiltinWritingSkillId(id)) return WRITING_SKILL_STAGE_LABEL[id]
  const pack = installed.find(item => item.id === id)
  const name = String(pack?.name || id).slice(0, WRITING_SKILL_PACK_LABEL_MAX)
  return `写作skill · ${name}`
}
