export type CanvasMediaMode =
  | 'chat'
  | 'vision'
  | 'text_to_image'
  | 'image_to_image'
  | 'text_to_video'
  | 'image_to_video'

/** Semantic binding used by canvas nodes when an asset is supplied as a reference. */
export type CanvasReferenceRole =
  | 'general'
  | 'first_frame'
  | 'last_frame'
  | 'character'
  | 'scene'
  | 'style'
  | 'full_reference'
  | 'prompt_context'

/** Reference kinds reserved by the canvas contract. Only image and prompt are executable today. */
export type CanvasReferenceType = 'image' | 'prompt' | 'video' | 'audio'

export type CanvasReferenceModeHint = 'T2VA' | 'I2VA' | 'FL2VA' | 'L2VA' | 'Ref2VA'

/** Canonical, ordered reference binding carried across compile and generation boundaries. */
export type CanvasReferenceBinding = {
  reference_index: number
  reference_id: string
  reference_role: CanvasReferenceRole
  type: CanvasReferenceType
  url?: string
  content?: string
  source_asset_ids?: number[]
}

/** Incoming asset shape accepted before normalization assigns index/id defaults. */
export type CanvasReferenceAsset = {
  type: CanvasReferenceType
  reference_index?: number
  reference_id?: string
  reference_role?: CanvasReferenceRole
  url?: string
  content?: string
  source_asset_ids?: number[]
}

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

export type ParsedSkillDocument = {
  manifest: SkillManifest
  references: string[]
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
  /** Compiler-owned provenance; absent on legacy cached results. */
  reference_bindings?: CanvasReferenceBinding[]
  /** H3 sub-mode hint derived from image reference roles, when applicable. */
  reference_mode_hint?: CanvasReferenceModeHint
}

export type PromptCompileInput = {
  packId?: string
  skillName?: string
  rawPrompt: string
  mode: CanvasMediaMode
  incomingAssets: CanvasReferenceAsset[]
  nodeParams: Record<string, unknown>
  arguments?: Record<string, string>
  compilerModelId?: number
  activeWorkspace: string
}
