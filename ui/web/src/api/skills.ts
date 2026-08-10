import apiClient from './client'

export type CanvasSkillMediaMode =
  | 'chat'
  | 'vision'
  | 'text_to_image'
  | 'image_to_image'
  | 'text_to_video'
  | 'image_to_video'

export type CanvasSkillCompatibility = 'prompt_ready' | 'prompt_partial' | 'workflow_only' | 'invalid'

export type CanvasSkillArgumentSpec = {
  name: string
  description?: string
  required?: boolean
  default?: string
}

export type CanvasSkillSummary = {
  packId: string
  name: string
  displayName?: string
  description: string
  shortDescription?: string
  whenToUse?: string
  arguments: CanvasSkillArgumentSpec[]
  argumentHint?: string
  userInvocable: boolean
  triggerWords: string[]
  mediaModes: CanvasSkillMediaMode[]
  compatibility: CanvasSkillCompatibility
  reason?: string
  revision: string
  sourceUrl?: string
}

export type CanvasSkillPackSummary = {
  id: string
  sourceUrl: string
  owner?: string
  repo?: string
  revision: string
  installedAt: string
  status: 'installed'
}

export type CanvasSkillSettings = {
  skill_compiler_model_id: number | null
}

export type CanvasSkillListResponse = {
  skills: CanvasSkillSummary[]
  packs: CanvasSkillPackSummary[]
  settings: CanvasSkillSettings
}

export type CanvasSkillPackInstallResponse = {
  record: CanvasSkillPackSummary
  skills: CanvasSkillSummary[]
}

export type CanvasSkillCompileAsset = {
  type: 'image' | 'prompt' | 'video' | 'audio'
  url?: string
  content?: string
  source_asset_ids?: number[]
  reference_index?: number
  reference_id?: string
  reference_role?: 'general' | 'first_frame' | 'last_frame' | 'character' | 'scene' | 'style' | 'full_reference' | 'prompt_context'
}

export type CanvasSkillCompileInput = {
  skill_name?: string
  pack_id?: string
  raw_prompt: string
  mode: CanvasSkillMediaMode
  incoming_assets?: CanvasSkillCompileAsset[]
  node_params?: Record<string, unknown>
  arguments?: Record<string, string>
  compiler_model_id?: number
}

export type CanvasSkillCompileResult = {
  skill_name: string
  skill_version: string
  mode: CanvasSkillMediaMode
  prompt: string
  negative_prompt: string
  parameters: Record<string, string | number | boolean>
  references_used: string[]
  warnings: string[]
  reference_bindings?: CanvasSkillCompileAsset[]
  reference_mode_hint?: 'T2VA' | 'I2VA' | 'FL2VA' | 'L2VA' | 'Ref2VA'
}

export type CanvasSkillCompileResponse = {
  result: CanvasSkillCompileResult
  cache_key: string
  cached: boolean
}

export type CanvasSkillApiError = {
  error: string
  detail: string
  error_code: string
}

export function listSkills(mode?: CanvasSkillMediaMode, readyOnly?: boolean) {
  return apiClient.get<CanvasSkillListResponse>('/skills', {
    params: {
      ...(mode ? { mode } : {}),
      ...(readyOnly === undefined ? {} : { ready_only: readyOnly }),
    },
  })
}

export function installSkillPack(url: string) {
  return apiClient.post<CanvasSkillPackInstallResponse>('/skills/packs', { url })
}

export function compileSkillPreview(input: CanvasSkillCompileInput) {
  return apiClient.post<CanvasSkillCompileResponse>('/skills/compile-preview', input)
}

export function readSkillSettings() {
  return apiClient.get<CanvasSkillSettings>('/skills/settings')
}

export function writeSkillSettings(modelId: number | null) {
  return apiClient.put<CanvasSkillSettings>('/skills/settings', { skill_compiler_model_id: modelId })
}
