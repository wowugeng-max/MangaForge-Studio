import {
  DEFAULT_FICTION_HUMANIZER_MODE,
  DEFAULT_WRITING_SKILLS_ENABLED,
  WRITING_SKILL_IDS,
  isFictionHumanizerMode,
  isWritingSkillId,
} from './registry'
import type {
  FictionHumanizerMode,
  ResolvedWritingSkills,
  WritingSkillEnabledMap,
  WritingSkillsConfig,
  WritingSkillsResolveInput,
} from './types'

function asEnabledRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (record.enabled && typeof record.enabled === 'object' && !Array.isArray(record.enabled)) {
    return record.enabled as Record<string, unknown>
  }
  return record
}

function asConfigRecord(value: unknown): WritingSkillsConfig | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as WritingSkillsConfig
}

function resolveMode(...layers: Array<unknown>): FictionHumanizerMode {
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

export function pickWritingSkillsOverride(options: any): WritingSkillsResolveInput['override'] {
  return options?.writing_skills ?? options?.writingSkills ?? null
}

function resolveProjectModelId(projectWritingSkills: unknown): number | undefined {
  const config = asConfigRecord(projectWritingSkills)
  const value = config?.model_id
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined
}

export function resolveWritingSkillsEnabled(
  input: WritingSkillsResolveInput = {},
): ResolvedWritingSkills {
  const projectWritingSkills = input.project?.reference_config?.writing_skills
  const projectEnabled = asEnabledRecord(projectWritingSkills)
  const overrideEnabled = asEnabledRecord(input.override)
  const enabled = mergeEnabledFlags(
    mergeEnabledFlags(DEFAULT_WRITING_SKILLS_ENABLED, projectEnabled),
    overrideEnabled,
  )
  const modelId = resolveProjectModelId(projectWritingSkills)
  return {
    enabled,
    ids: WRITING_SKILL_IDS.filter(id => enabled[id] && isWritingSkillId(id)),
    fiction_humanizer_mode: resolveMode(projectWritingSkills, input.override),
    ...(modelId !== undefined ? { model_id: modelId } : {}),
  }
}

export function normalizeWritingSkillsEnabled(
  value: unknown,
): WritingSkillEnabledMap {
  return mergeEnabledFlags(DEFAULT_WRITING_SKILLS_ENABLED, asEnabledRecord(value))
}
