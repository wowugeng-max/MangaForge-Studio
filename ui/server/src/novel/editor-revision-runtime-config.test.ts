import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_EDITOR_REVISION_TIMEOUT_SECONDS,
  MAX_EDITOR_REVISION_TIMEOUT_SECONDS,
  MIN_EDITOR_REVISION_TIMEOUT_SECONDS,
  normalizeEditorRevisionTimeoutSeconds,
  resolveEditorRevisionRuntimeConfig,
  resolveEditorRevisionTimeoutMs,
} from './editor-revision-runtime-config'

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
})
