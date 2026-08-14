import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  DEFAULT_WRITING_SKILLS_ENABLED,
  normalizeWritingSkillsModelId,
  resolveWritingSkillsEnabled,
  writingSkillsPayload,
  writingSkillsSettingsPayload,
} from './writingSkillsModel'

describe('writingSkillsModel', () => {
  test('defaults match the server catalog and can be sent as a generation override', () => {
    expect(resolveWritingSkillsEnabled().enabled).toEqual(DEFAULT_WRITING_SKILLS_ENABLED)
    expect(resolveWritingSkillsEnabled().ids).toEqual(['fiction-humanizer-zh', 'remove-ai-flavor'])
    expect(resolveWritingSkillsEnabled().fiction_humanizer_mode).toBe('polish')
    expect(writingSkillsPayload(DEFAULT_WRITING_SKILLS_ENABLED, 'rewrite')).toEqual({
      writing_skills: {
        enabled: DEFAULT_WRITING_SKILLS_ENABLED,
        fiction_humanizer_mode: 'rewrite',
      },
    })
  })

  test('merges project defaults under a partial generation override', () => {
    const resolved = resolveWritingSkillsEnabled({
      project: {
        reference_config: {
          writing_skills: { enabled: { 'humanizer-zh': true } },
        },
      },
      override: { enabled: { 'remove-ai-flavor': false } },
    })
    expect(resolved.enabled).toEqual({
      'fiction-humanizer-zh': true,
      'remove-ai-flavor': false,
      'humanizer-zh': true,
    })
  })

  test('hydrates the skill model from the GET config and rejects invalid values', () => {
    expect(normalizeWritingSkillsModelId(317)).toBe(317)
    for (const value of ['317', 0, -1, 4.5, null, undefined, {}] as unknown[]) {
      expect(normalizeWritingSkillsModelId(value)).toBe(null)
    }
  })

  test('includes model_id in the settings PUT payload including the null clear', () => {
    expect(writingSkillsSettingsPayload(DEFAULT_WRITING_SKILLS_ENABLED, 'polish', 317)).toEqual({
      enabled: DEFAULT_WRITING_SKILLS_ENABLED,
      fiction_humanizer_mode: 'polish',
      model_id: 317,
    })
    expect(writingSkillsSettingsPayload(DEFAULT_WRITING_SKILLS_ENABLED, 'rewrite', null)).toEqual({
      enabled: DEFAULT_WRITING_SKILLS_ENABLED,
      fiction_humanizer_mode: 'rewrite',
      model_id: null,
    })
  })

  test('never carries model_id in the generation override payload', () => {
    const payload = writingSkillsPayload(DEFAULT_WRITING_SKILLS_ENABLED, 'rewrite')
    expect('model_id' in payload.writing_skills).toBe(false)
    expect(JSON.stringify(payload)).not.toContain('model_id')
  })

  test('exposes generation-bar toggles and payload wiring', () => {
    const controls = readFileSync(join(import.meta.dir, 'workspace-center-editor-controls.tsx'), 'utf8')
    const uiState = readFileSync(join(import.meta.dir, 'useNovelProjectWorkspaceUiState.ts'), 'utf8')
    const center = readFileSync(join(import.meta.dir, 'WorkspaceCenter.tsx'), 'utf8')
    expect(controls).toContain('WorkspaceCenterWritingSkillsControl')
    expect(controls).toContain('WRITING_SKILL_CATALOG')
    expect(controls).toContain('skill.label')
    expect(controls).toContain('fictionHumanizerMode')
    expect(controls).toContain('精修')
    expect(controls).toContain('重写')
    expect(uiState).toContain('writingSkillsPayload(writingSkillsEnabled, fictionHumanizerMode)')
    expect(center).toContain('<WorkspaceCenterWritingSkillsControl')
  })
})
