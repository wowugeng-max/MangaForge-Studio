export const MIN_EDITOR_REVISION_TIMEOUT_SECONDS = 60
export const MAX_EDITOR_REVISION_TIMEOUT_SECONDS = 600
export const DEFAULT_EDITOR_REVISION_TIMEOUT_SECONDS = 600
export const MIN_EDITOR_REVISION_STORY_STATE_MAX_TOKENS = 1_000
export const MAX_EDITOR_REVISION_STORY_STATE_MAX_TOKENS = 262_144
export const DEFAULT_EDITOR_REVISION_STORY_STATE_MAX_TOKENS = 9_000

export type EditorRevisionRuntimeConfig = {
  timeout_seconds: number
  story_state_max_tokens: number
}

export function normalizeEditorRevisionTimeoutSeconds(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_EDITOR_REVISION_TIMEOUT_SECONDS
  }
  return Math.min(
    MAX_EDITOR_REVISION_TIMEOUT_SECONDS,
    Math.max(MIN_EDITOR_REVISION_TIMEOUT_SECONDS, Math.trunc(value)),
  )
}

export function normalizeEditorRevisionStoryStateMaxTokens(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_EDITOR_REVISION_STORY_STATE_MAX_TOKENS
  }
  return Math.min(
    MAX_EDITOR_REVISION_STORY_STATE_MAX_TOKENS,
    Math.max(MIN_EDITOR_REVISION_STORY_STATE_MAX_TOKENS, Math.trunc(value)),
  )
}

export function resolveEditorRevisionRuntimeConfig(project: any): EditorRevisionRuntimeConfig {
  return {
    timeout_seconds: normalizeEditorRevisionTimeoutSeconds(
      project?.reference_config?.editor_revision?.timeout_seconds,
    ),
    story_state_max_tokens: normalizeEditorRevisionStoryStateMaxTokens(
      project?.reference_config?.editor_revision?.story_state_max_tokens,
    ),
  }
}

export function resolveEditorRevisionTimeoutMs(project: any): number {
  return resolveEditorRevisionRuntimeConfig(project).timeout_seconds * 1_000
}

export function resolveEditorRevisionStoryStateMaxTokens(project: any): number {
  return resolveEditorRevisionRuntimeConfig(project).story_state_max_tokens
}
