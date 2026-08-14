import {
  DEFAULT_FICTION_HUMANIZER_MODE,
  DEFAULT_WRITING_SKILLS_ENABLED,
  WRITING_SKILL_IDS,
  isBuiltinWritingSkillId,
  isFictionHumanizerMode,
  isWritingSkillPackIdShape,
} from './registry'
import type {
  FictionHumanizerMode,
  ResolvedWritingSkills,
  WritingSkillEnabledMap,
  WritingSkillsConfig,
  WritingSkillsInstalledInput,
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

function sortedInstalledIds(installed: WritingSkillsInstalledInput | undefined): string[] {
  return [...(installed || [])]
    .filter(pack => isWritingSkillPackIdShape(pack?.id) && !isBuiltinWritingSkillId(pack.id))
    .sort((a, b) => String(a.installed_at || '').localeCompare(String(b.installed_at || '')) || a.id.localeCompare(b.id))
    .map(pack => pack.id)
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
  const installedIds = sortedInstalledIds(input.installed)
  const catalogIds: string[] = [...WRITING_SKILL_IDS, ...new Set(installedIds)]
  const defaults: WritingSkillEnabledMap = {
    ...DEFAULT_WRITING_SKILLS_ENABLED,
    ...Object.fromEntries(installedIds.map(id => [id, false] as const)),
  }
  const projectWritingSkills = input.project?.reference_config?.writing_skills
  const projectEnabled = asEnabledRecord(projectWritingSkills)
  const overrideEnabled = asEnabledRecord(input.override)
  const enabled = mergeEnabledFlags(
    mergeEnabledFlags(defaults, projectEnabled, catalogIds),
    overrideEnabled,
    catalogIds,
  )
  const modelId = resolveProjectModelId(projectWritingSkills)
  return {
    enabled,
    ids: catalogIds.filter(id => enabled[id]),
    fiction_humanizer_mode: resolveMode(projectWritingSkills, input.override),
    ...(modelId !== undefined ? { model_id: modelId } : {}),
  }
}

export function normalizeWritingSkillsEnabled(
  value: unknown,
  installed: WritingSkillsInstalledInput = [],
): WritingSkillEnabledMap {
  const installedIds = sortedInstalledIds(installed)
  const defaults: WritingSkillEnabledMap = {
    ...DEFAULT_WRITING_SKILLS_ENABLED,
    ...Object.fromEntries(installedIds.map(id => [id, false] as const)),
  }
  return mergeEnabledFlags(defaults, asEnabledRecord(value), [...WRITING_SKILL_IDS, ...installedIds])
}
