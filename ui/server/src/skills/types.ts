export type CanvasMediaMode =
  | 'chat'
  | 'vision'
  | 'text_to_image'
  | 'image_to_image'
  | 'text_to_video'
  | 'image_to_video'

export type SkillCompatibility =
  | 'prompt_ready'
  | 'prompt_partial'
  | 'workflow_only'
  | 'invalid'

export type SkillArgumentSpec = {
  name: string
  description?: string
  required?: boolean
  default?: string
}

export type SkillManifest = {
  packId: string
  directoryName: string
  name: string
  description: string
  whenToUse?: string
  arguments: SkillArgumentSpec[]
  argumentHint?: string
  userInvocable: boolean
  triggerWords: string[]
  mediaModes: CanvasMediaMode[]
  compatibility: SkillCompatibility
  compatibilityReason?: string
  revision: string
  sourceUrl?: string
  rootDir: string
  body: string
  references: string[]
  displayName?: string
  shortDescription?: string
  defaultPrompt?: string
}

export type PromptCompileResult = {
  skill_name: string
  skill_version: string
  mode: CanvasMediaMode
  prompt: string
  negative_prompt: string
  parameters: Record<string, string | number | boolean>
  references_used: string[]
  warnings: string[]
}

export type PromptCompileInput = {
  packId?: string
  skillName?: string
  rawPrompt: string
  mode: CanvasMediaMode
  incomingAssets: Array<{
    type: 'image' | 'prompt'
    url?: string
    content?: string
    source_asset_ids?: number[]
  }>
  nodeParams: Record<string, unknown>
  arguments?: Record<string, string>
  compilerModelId?: number
  activeWorkspace: string
}
