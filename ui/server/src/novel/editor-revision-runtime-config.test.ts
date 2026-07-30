import { describe, expect, test } from 'bun:test'
import { EDITOR_REVISION_PHASES } from '../routes/novel-editor/editor-revision-contract'
import {
  DEFAULT_EDITOR_REVISION_TIMEOUT_SECONDS,
  MAX_EDITOR_REVISION_TIMEOUT_SECONDS,
  MIN_EDITOR_REVISION_TIMEOUT_SECONDS,
  normalizeEditorRevisionTimeoutSeconds,
  resolveEditorRevisionRuntimeConfig,
  resolveEditorRevisionTimeoutMs,
} from './editor-revision-runtime-config'
import { requireCoherentEditorRevisionCheckpoint } from './repos/editor-revision-runs'

function initialCheckpoint(runtimeConfig?: { llm_timeout_ms: number }) {
  return {
    schema_version: 1 as const,
    phase: 'generate_candidate' as const,
    phases: Object.fromEntries(EDITOR_REVISION_PHASES.map(phase => [
      phase,
      { status: 'pending', attempt: 0 },
    ])),
    prose_persisted: false,
    warnings: [],
    ...(runtimeConfig ? { runtime_config: runtimeConfig } : {}),
  }
}

describe('editor revision runtime config', () => {
  test('defaults missing and invalid stored values to 600 seconds', () => {
    expect(DEFAULT_EDITOR_REVISION_TIMEOUT_SECONDS).toBe(600)
    expect(normalizeEditorRevisionTimeoutSeconds(undefined)).toBe(600)
    expect(normalizeEditorRevisionTimeoutSeconds('600')).toBe(600)
    expect(normalizeEditorRevisionTimeoutSeconds(Number.NaN)).toBe(600)
    expect(normalizeEditorRevisionTimeoutSeconds(Number.POSITIVE_INFINITY)).toBe(600)
    expect(resolveEditorRevisionRuntimeConfig({ reference_config: {} })).toEqual({ timeout_seconds: 600 })
  })

  test('truncates finite values and clamps them to 60 through 600 seconds', () => {
    expect(MIN_EDITOR_REVISION_TIMEOUT_SECONDS).toBe(60)
    expect(MAX_EDITOR_REVISION_TIMEOUT_SECONDS).toBe(600)
    expect(normalizeEditorRevisionTimeoutSeconds(59)).toBe(60)
    expect(normalizeEditorRevisionTimeoutSeconds(420.9)).toBe(420)
    expect(normalizeEditorRevisionTimeoutSeconds(601)).toBe(600)
    expect(resolveEditorRevisionRuntimeConfig({
      reference_config: { editor_revision: { timeout_seconds: 275 } },
    })).toEqual({ timeout_seconds: 275 })
    expect(resolveEditorRevisionTimeoutMs({
      reference_config: { editor_revision: { timeout_seconds: 275 } },
    })).toBe(275_000)
  })

  test('accepts an absent or canonical millisecond timeout snapshot', () => {
    expect(() => requireCoherentEditorRevisionCheckpoint(initialCheckpoint())).not.toThrow()
    expect(() => requireCoherentEditorRevisionCheckpoint(
      initialCheckpoint({ llm_timeout_ms: 420_000 }),
    )).not.toThrow()
  })

  test.each([59_000, 600_001, 420_500, Number.NaN])(
    'rejects non-canonical checkpoint timeout %p',
    llmTimeoutMs => {
      expect(() => requireCoherentEditorRevisionCheckpoint(
        initialCheckpoint({ llm_timeout_ms: llmTimeoutMs }),
      )).toThrow('editor revision checkpoint runtime config is not canonical')
    },
  )
})
