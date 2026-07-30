import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  buildEditorRevisionConfigPayload,
  isEditorRevisionTimeoutValid,
  isStoryStateMaxTokensValid,
  normalizeProjectEditorRevisionTimeout,
  normalizeProjectStoryStateMaxTokens,
} from './ProjectSettingsModal'

describe('project settings editor revision timeout', () => {
  test('hydrates defaults and builds the dedicated API payload', () => {
    expect(normalizeProjectEditorRevisionTimeout(undefined)).toBe(600)
    expect(normalizeProjectEditorRevisionTimeout(420.9)).toBe(420)
    expect(normalizeProjectEditorRevisionTimeout(900)).toBe(600)
    expect(buildEditorRevisionConfigPayload(420, 12000)).toEqual({
      config: { timeout_seconds: 420, story_state_max_tokens: 12000 },
    })
  })

  test('normalizes and validates the story state output budget', () => {
    expect(normalizeProjectStoryStateMaxTokens(undefined)).toBe(9000)
    expect(normalizeProjectStoryStateMaxTokens(300000)).toBe(262144)
    expect(isStoryStateMaxTokensValid(1000)).toBe(true)
    expect(isStoryStateMaxTokensValid(64000.5)).toBe(false)
  })

  test('rejects blank, fractional, and out-of-range user input', () => {
    expect(isEditorRevisionTimeoutValid(null)).toBe(false)
    expect(isEditorRevisionTimeoutValid(59)).toBe(false)
    expect(isEditorRevisionTimeoutValid(420.5)).toBe(false)
    expect(isEditorRevisionTimeoutValid(600)).toBe(true)
    expect(() => buildEditorRevisionConfigPayload(601, 12000)).toThrow('invalid editor revision timeout')
    expect(() => buildEditorRevisionConfigPayload(420, 999)).toThrow('invalid story state max tokens')
  })

  test('wires project settings into the top-bar menu and dedicated endpoints', () => {
    const modal = readFileSync(join(import.meta.dir, 'ProjectSettingsModal.tsx'), 'utf8')
    const topbar = readFileSync(join(import.meta.dir, 'shell/workspace-topbar.tsx'), 'utf8')
    expect(topbar).toContain("label: '项目设置'")
    expect(topbar).toContain('<ProjectSettingsModal')
    expect(modal).toContain('/editor-revision-config')
    expect(modal).toContain('单次模型调用超时')
    expect(modal).toContain('min={60}')
    expect(modal).toContain('max={600}')
    expect(modal).toContain('故事状态输出上限')
    expect(modal).toContain('min={1000}')
    expect(modal).toContain('max={262144}')
    expect(modal).toContain('step={512}')
    expect(modal).toContain('> 64_000')
  })

  test('keeps save disabled when the current project setting fails to load', () => {
    const modal = readFileSync(join(import.meta.dir, 'ProjectSettingsModal.tsx'), 'utf8')
    expect(modal).toContain('const [loadFailed, setLoadFailed]')
    expect(modal).toContain('setLoadFailed(true)')
    expect(modal).toContain('disabled={loading || loadFailed ||')
  })
})
