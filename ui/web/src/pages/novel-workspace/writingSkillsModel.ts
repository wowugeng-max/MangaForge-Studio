export const WRITING_SKILL_IDS = [
  'fiction-humanizer-zh',
  'remove-ai-flavor',
  'humanizer-zh',
] as const

export type WritingSkillId = string
export type WritingSkillEnabledMap = Record<string, boolean>
export type FictionHumanizerMode = 'polish' | 'rewrite'

export const DEFAULT_FICTION_HUMANIZER_MODE: FictionHumanizerMode = 'polish'

export const DEFAULT_WRITING_SKILLS_ENABLED: WritingSkillEnabledMap = {
  'fiction-humanizer-zh': true,
  'remove-ai-flavor': true,
  'humanizer-zh': false,
}

export type WritingSkillCatalogItem = {
  id: string
  label: string
  description: string
  builtin: boolean
  supports_mode: boolean
  revision?: string
  source_url?: string
  installed_at?: string
}

export const WRITING_SKILL_CATALOG: WritingSkillCatalogItem[] = [
  {
    id: 'fiction-humanizer-zh',
    label: '小说去AI味',
    description: '补铺垫、过程、余波，修对白和章末钩子。',
    builtin: true,
    supports_mode: true,
  },
  {
    id: 'remove-ai-flavor',
    label: '去句壳',
    description: '拆「不是…而是」「真正…的是」等助手句壳。',
    builtin: true,
    supports_mode: false,
  },
  {
    id: 'humanizer-zh',
    label: '维基去AI词',
    description: '去宣传腔和 AI 高频词。开启时禁止作者第一人称旁白。',
    builtin: true,
    supports_mode: false,
  },
]

export const BUILTIN_WRITING_SKILL_CATALOG = WRITING_SKILL_CATALOG

const WRITING_SKILL_PACK_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/

export function normalizeWritingSkillCatalog(value: unknown): WritingSkillCatalogItem[] {
  const raw = value as { skills?: unknown } | null
  const skills = Array.isArray(raw?.skills) ? raw!.skills : null
  if (!skills) return [...BUILTIN_WRITING_SKILL_CATALOG]
  const installed: WritingSkillCatalogItem[] = []
  for (const item of skills) {
    if (!item || typeof item !== 'object') continue
    const entry = item as Record<string, unknown>
    const id = String(entry.id || '')
    if ((WRITING_SKILL_IDS as readonly string[]).includes(id)) continue // builtins always come from the hardcoded fallback
    if (entry.builtin === true) continue
    if (!WRITING_SKILL_PACK_ID_RE.test(id)) continue
    installed.push({
      id,
      label: String(entry.label || id).slice(0, 40),
      description: String(entry.description || '').slice(0, 500),
      builtin: false,
      supports_mode: false,
      ...(typeof entry.revision === 'string' ? { revision: entry.revision.slice(0, 64) } : {}),
      ...(typeof entry.source_url === 'string' ? { source_url: entry.source_url.slice(0, 300) } : {}),
      ...(typeof entry.installed_at === 'string' ? { installed_at: entry.installed_at.slice(0, 80) } : {}),
    })
  }
  return [...BUILTIN_WRITING_SKILL_CATALOG, ...installed]
}

function asEnabledRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (record.enabled && typeof record.enabled === 'object' && !Array.isArray(record.enabled)) {
    return record.enabled as Record<string, unknown>
  }
  return record
}

function asConfigRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function isFictionHumanizerMode(value: unknown): value is FictionHumanizerMode {
  return value === 'polish' || value === 'rewrite'
}

function resolveMode(...layers: unknown[]): FictionHumanizerMode {
  let mode = DEFAULT_FICTION_HUMANIZER_MODE
  for (const layer of layers) {
    const config = asConfigRecord(layer)
    if (isFictionHumanizerMode(config?.fiction_humanizer_mode)) {
      mode = config.fiction_humanizer_mode
    }
  }
  return mode
}

function mergeEnabledFlags(
  base: WritingSkillEnabledMap,
  incoming: Record<string, unknown> | null,
  ids: readonly string[],
): WritingSkillEnabledMap {
  if (!incoming) return { ...base }
  const next = { ...base }
  for (const id of ids) {
    if (!Object.prototype.hasOwnProperty.call(incoming, id)) continue
    if (typeof incoming[id] !== 'boolean') continue
    next[id] = incoming[id]
  }
  return next
}

export function resolveWritingSkillsEnabled(input: {
  project?: { reference_config?: { writing_skills?: { enabled?: Record<string, unknown> } } } | null
  override?: { enabled?: Record<string, unknown> } | Record<string, unknown> | null
  catalog?: WritingSkillCatalogItem[]
} = {}) {
  const catalog = input.catalog?.length ? input.catalog : BUILTIN_WRITING_SKILL_CATALOG
  const ids = catalog.map(item => item.id)
  const defaults: WritingSkillEnabledMap = Object.fromEntries(catalog.map(item => [
    item.id,
    item.builtin ? DEFAULT_WRITING_SKILLS_ENABLED[item.id] ?? false : false,
  ]))
  const enabled = mergeEnabledFlags(
    mergeEnabledFlags(defaults, asEnabledRecord(input.project?.reference_config?.writing_skills), ids),
    asEnabledRecord(input.override),
    ids,
  )
  return {
    enabled,
    ids: ids.filter(id => enabled[id]),
    fiction_humanizer_mode: resolveMode(
      input.project?.reference_config?.writing_skills,
      input.override,
    ),
  }
}

// Generation-bar override payload: intentionally never carries model_id
// (the skill model is a project-only setting the server reads from config).
export function writingSkillsPayload(
  enabled: WritingSkillEnabledMap,
  mode: FictionHumanizerMode = DEFAULT_FICTION_HUMANIZER_MODE,
) {
  return { writing_skills: { enabled, fiction_humanizer_mode: mode } }
}

export function normalizeWritingSkillsModelId(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null
}

export function filterWritingSkillCatalog(
  catalog: WritingSkillCatalogItem[],
  query: string,
): WritingSkillCatalogItem[] {
  const needle = String(query || '').trim().toLowerCase()
  if (!needle) return catalog
  return catalog.filter(skill => (
    skill.id.toLowerCase().includes(needle)
    || skill.label.toLowerCase().includes(needle)
    || skill.description.toLowerCase().includes(needle)
  ))
}

export function writingSkillsSettingsPayload(
  enabled: WritingSkillEnabledMap,
  mode: FictionHumanizerMode,
  modelId: number | null,
) {
  return { enabled, fiction_humanizer_mode: mode, model_id: modelId }
}
