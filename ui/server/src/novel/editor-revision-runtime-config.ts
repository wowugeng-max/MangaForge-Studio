export const MIN_EDITOR_REVISION_TIMEOUT_SECONDS = 60
export const MAX_EDITOR_REVISION_TIMEOUT_SECONDS = 600
export const DEFAULT_EDITOR_REVISION_TIMEOUT_SECONDS = 600

export type EditorRevisionRuntimeConfig = {
  timeout_seconds: number
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

export function resolveEditorRevisionRuntimeConfig(project: any): EditorRevisionRuntimeConfig {
  return {
    timeout_seconds: normalizeEditorRevisionTimeoutSeconds(
      project?.reference_config?.editor_revision?.timeout_seconds,
    ),
  }
}

export function resolveEditorRevisionTimeoutMs(project: any): number {
  return resolveEditorRevisionRuntimeConfig(project).timeout_seconds * 1_000
}
