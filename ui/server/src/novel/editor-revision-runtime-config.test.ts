import { describe, expect, test } from 'bun:test'
import { EDITOR_REVISION_PHASES } from '../routes/novel-editor/editor-revision-contract'
import {
  DEFAULT_EDITOR_REVISION_STORY_STATE_MAX_TOKENS,
  DEFAULT_EDITOR_REVISION_TIMEOUT_SECONDS,
  MAX_EDITOR_REVISION_STORY_STATE_MAX_TOKENS,
  MAX_EDITOR_REVISION_TIMEOUT_SECONDS,
  MIN_EDITOR_REVISION_STORY_STATE_MAX_TOKENS,
  MIN_EDITOR_REVISION_TIMEOUT_SECONDS,
  normalizeEditorRevisionStoryStateMaxTokens,
  normalizeEditorRevisionTimeoutSeconds,
  resolveEditorRevisionRuntimeConfig,
  resolveEditorRevisionStoryStateMaxTokens,
  resolveEditorRevisionTimeoutMs,
} from './editor-revision-runtime-config'
import { requireCoherentEditorRevisionCheckpoint } from './repos/editor-revision-runs'

function initialCheckpoint(runtimeConfig?: { llm_timeout_ms: number; story_state_max_tokens?: number }) {
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
    expect(resolveEditorRevisionRuntimeConfig({ reference_config: {} })).toEqual({
      timeout_seconds: 600,
      story_state_max_tokens: 9_000,
    })
  })

  test('truncates finite values and clamps them to 60 through 600 seconds', () => {
    expect(MIN_EDITOR_REVISION_TIMEOUT_SECONDS).toBe(60)
    expect(MAX_EDITOR_REVISION_TIMEOUT_SECONDS).toBe(600)
    expect(normalizeEditorRevisionTimeoutSeconds(59)).toBe(60)
    expect(normalizeEditorRevisionTimeoutSeconds(420.9)).toBe(420)
    expect(normalizeEditorRevisionTimeoutSeconds(601)).toBe(600)
    expect(resolveEditorRevisionRuntimeConfig({
      reference_config: { editor_revision: { timeout_seconds: 275 } },
    })).toEqual({ timeout_seconds: 275, story_state_max_tokens: 9_000 })
    expect(resolveEditorRevisionTimeoutMs({
      reference_config: { editor_revision: { timeout_seconds: 275 } },
    })).toBe(275_000)
  })

  test('defaults and clamps exact Story State output tokens', () => {
    expect(DEFAULT_EDITOR_REVISION_STORY_STATE_MAX_TOKENS).toBe(9_000)
    expect(MIN_EDITOR_REVISION_STORY_STATE_MAX_TOKENS).toBe(1_000)
    expect(MAX_EDITOR_REVISION_STORY_STATE_MAX_TOKENS).toBe(262_144)
    expect(normalizeEditorRevisionStoryStateMaxTokens(undefined)).toBe(9_000)
    expect(normalizeEditorRevisionStoryStateMaxTokens('12000')).toBe(9_000)
    expect(normalizeEditorRevisionStoryStateMaxTokens(Number.NaN)).toBe(9_000)
    expect(normalizeEditorRevisionStoryStateMaxTokens(Number.POSITIVE_INFINITY)).toBe(9_000)
    expect(normalizeEditorRevisionStoryStateMaxTokens(Number.NEGATIVE_INFINITY)).toBe(9_000)
    expect(normalizeEditorRevisionStoryStateMaxTokens(999)).toBe(1_000)
    expect(normalizeEditorRevisionStoryStateMaxTokens(12_345.9)).toBe(12_345)
    expect(normalizeEditorRevisionStoryStateMaxTokens(300_000)).toBe(262_144)
    expect(resolveEditorRevisionStoryStateMaxTokens({
      reference_config: { editor_revision: { story_state_max_tokens: 64_000 } },
    })).toBe(64_000)
  })

  test('accepts absent, legacy timeout-only, and canonical runtime snapshots', () => {
    expect(() => requireCoherentEditorRevisionCheckpoint(initialCheckpoint())).not.toThrow()
    expect(() => requireCoherentEditorRevisionCheckpoint(
      initialCheckpoint({ llm_timeout_ms: 420_000 }),
    )).not.toThrow()
    expect(() => requireCoherentEditorRevisionCheckpoint(
      initialCheckpoint({ llm_timeout_ms: 420_000, story_state_max_tokens: 12_000 }),
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

  test.each([999, 262_145, 12_000.5])(
    'rejects persisted non-canonical Story State token snapshot %p',
    storyStateMaxTokens => {
      expect(() => requireCoherentEditorRevisionCheckpoint(JSON.stringify(
        initialCheckpoint({
          llm_timeout_ms: 420_000,
          story_state_max_tokens: storyStateMaxTokens,
        }),
      ))).toThrow('editor revision checkpoint runtime config is not canonical')
    },
  )

  test.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects direct non-finite Story State token snapshot %p',
    storyStateMaxTokens => {
      expect(() => requireCoherentEditorRevisionCheckpoint(initialCheckpoint({
        llm_timeout_ms: 420_000,
        story_state_max_tokens: storyStateMaxTokens,
      }))).toThrow('editor revision checkpoint runtime config is not canonical')
    },
  )
})
