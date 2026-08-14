export const WRITING_SKILL_IDS = [
  'fiction-humanizer-zh',
  'remove-ai-flavor',
  'humanizer-zh',
] as const

export type WritingSkillId = typeof WRITING_SKILL_IDS[number]

export type WritingSkillEnabledMap = Record<WritingSkillId, boolean>

export type WritingSkillDefinition = {
  id: WritingSkillId
  label: string
  description: string
  defaultEnabled: boolean
}

export type FictionHumanizerMode = 'polish' | 'rewrite'

export type WritingSkillsConfig = {
  enabled?: Record<string, unknown>
  fiction_humanizer_mode?: unknown
  model_id?: unknown
}

export type WritingSkillsResolveInput = {
  project?: {
    reference_config?: {
      writing_skills?: WritingSkillsConfig
    }
  } | null
  override?: WritingSkillsConfig | Record<string, unknown> | null
}

export type ResolvedWritingSkills = {
  enabled: WritingSkillEnabledMap
  ids: WritingSkillId[]
  fiction_humanizer_mode: FictionHumanizerMode
  model_id?: number
}

export type WritingSkillPassReport = {
  id: WritingSkillId
  mode?: FictionHumanizerMode
  accepted: boolean
  reason?: string
  before_chars: number
  after_chars: number
  chunk_count: number
}

export type WritingSkillHumanizeReport = {
  version: string
  fiction_humanizer_mode: FictionHumanizerMode
  enabled_ids: WritingSkillId[]
  enabled: boolean
  skipped?: boolean
  accepted: boolean
  changed: boolean
  reason?: string
  error?: string
  warnings: string[]
  before_chars: number
  after_chars: number
  chunk_count: number
  model_id?: number
  passes: WritingSkillPassReport[]
}
