export const WRITING_SKILL_IDS = [
  'fiction-humanizer-zh',
  'remove-ai-flavor',
  'humanizer-zh',
] as const

export type WritingSkillId = typeof WRITING_SKILL_IDS[number]
export type WritingSkillEnabledMap = Record<WritingSkillId, boolean>
export type FictionHumanizerMode = 'polish' | 'rewrite'

export const DEFAULT_FICTION_HUMANIZER_MODE: FictionHumanizerMode = 'polish'

export const DEFAULT_WRITING_SKILLS_ENABLED: WritingSkillEnabledMap = {
  'fiction-humanizer-zh': true,
  'remove-ai-flavor': true,
  'humanizer-zh': false,
}

export const WRITING_SKILL_CATALOG: Array<{
  id: WritingSkillId
  label: string
  description: string
}> = [
  {
    id: 'fiction-humanizer-zh',
    label: '小说去AI味',
    description: '补铺垫、过程、余波，修对白和章末钩子。',
  },
  {
    id: 'remove-ai-flavor',
    label: '去句壳',
    description: '拆「不是…而是」「真正…的是」等助手句壳。',
  },
  {
    id: 'humanizer-zh',
    label: '维基去AI词',
    description: '去宣传腔和 AI 高频词。开启时禁止作者第一人称旁白。',
  },
]

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
): WritingSkillEnabledMap {
  if (!incoming) return { ...base }
  const next = { ...base }
  for (const id of WRITING_SKILL_IDS) {
    if (!Object.prototype.hasOwnProperty.call(incoming, id)) continue
    if (typeof incoming[id] !== 'boolean') continue
    next[id] = incoming[id]
  }
  return next
}

export function resolveWritingSkillsEnabled(input: {
  project?: { reference_config?: { writing_skills?: { enabled?: Record<string, unknown> } } } | null
  override?: { enabled?: Record<string, unknown> } | Record<string, unknown> | null
} = {}) {
  const enabled = mergeEnabledFlags(
    mergeEnabledFlags(DEFAULT_WRITING_SKILLS_ENABLED, asEnabledRecord(input.project?.reference_config?.writing_skills)),
    asEnabledRecord(input.override),
  )
  return {
    enabled,
    ids: WRITING_SKILL_IDS.filter(id => enabled[id]),
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

export function writingSkillsSettingsPayload(
  enabled: WritingSkillEnabledMap,
  mode: FictionHumanizerMode,
  modelId: number | null,
) {
  return { enabled, fiction_humanizer_mode: mode, model_id: modelId }
}
