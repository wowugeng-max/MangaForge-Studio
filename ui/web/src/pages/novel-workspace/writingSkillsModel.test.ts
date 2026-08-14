import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  BUILTIN_WRITING_SKILL_CATALOG,
  DEFAULT_WRITING_SKILLS_ENABLED,
  filterWritingSkillCatalog,
  normalizeWritingSkillCatalog,
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

  test('hydrates the catalog from the API response and falls back to builtins', () => {
    expect(normalizeWritingSkillCatalog(null)).toEqual(BUILTIN_WRITING_SKILL_CATALOG)
    expect(normalizeWritingSkillCatalog({ ok: true })).toEqual(BUILTIN_WRITING_SKILL_CATALOG)
    const normalized = normalizeWritingSkillCatalog({
      ok: true,
      skills: [
        { id: 'fiction-humanizer-zh', label: '服务端标签', builtin: true, supports_mode: true },
        {
          id: 'my-style-pack',
          label: '我的文风包',
          description: '换文风',
          builtin: false,
          supports_mode: false,
          revision: 'a'.repeat(40),
          source_url: 'https://github.com/acme/My-Style-Pack',
          installed_at: '2026-08-14T00:00:00.000Z',
        },
        { id: 'BAD ID', label: 'x', builtin: false },
        { id: 'sneaky-builtin', label: 'x', builtin: true },
      ],
    })
    expect(normalized.slice(0, 3)).toEqual(BUILTIN_WRITING_SKILL_CATALOG)
    expect(normalized).toHaveLength(4)
    expect(normalized[3]).toMatchObject({
      id: 'my-style-pack',
      label: '我的文风包',
      builtin: false,
      supports_mode: false,
      revision: 'a'.repeat(40),
    })
  })

  test('resolves installed skills from the catalog with default off', () => {
    const catalog = normalizeWritingSkillCatalog({
      skills: [{ id: 'my-style-pack', label: '我的文风包', builtin: false, supports_mode: false }],
    })
    const off = resolveWritingSkillsEnabled({ catalog })
    expect(off.enabled['my-style-pack']).toBe(false)
    expect(off.ids).toEqual(['fiction-humanizer-zh', 'remove-ai-flavor'])
    const on = resolveWritingSkillsEnabled({ catalog, override: { enabled: { 'my-style-pack': true } } })
    expect(on.ids).toEqual(['fiction-humanizer-zh', 'remove-ai-flavor', 'my-style-pack'])
  })

  test('filters the catalog by id, label, or description', () => {
    const catalog = [
      ...BUILTIN_WRITING_SKILL_CATALOG,
      {
        id: 'novel-humanizer',
        label: '去AI质检',
        description: '检测并清除 AI 写作痕迹',
        builtin: false,
        supports_mode: false,
      },
    ]
    expect(filterWritingSkillCatalog(catalog, '  ')).toEqual(catalog)
    expect(filterWritingSkillCatalog(catalog, 'novel-humanizer').map(skill => skill.id)).toEqual(['novel-humanizer'])
    expect(filterWritingSkillCatalog(catalog, '去AI质检').map(skill => skill.id)).toEqual(['novel-humanizer'])
    expect(filterWritingSkillCatalog(catalog, '去句壳').map(skill => skill.id)).toEqual(['remove-ai-flavor'])
    expect(filterWritingSkillCatalog(catalog, '章末钩子').map(skill => skill.id)).toEqual(['fiction-humanizer-zh'])
  })

  test('exposes generation-bar toggles and payload wiring', () => {
    const controls = readFileSync(join(import.meta.dir, 'workspace-center-editor-controls.tsx'), 'utf8')
    const uiState = readFileSync(join(import.meta.dir, 'useNovelProjectWorkspaceUiState.ts'), 'utf8')
    const center = readFileSync(join(import.meta.dir, 'WorkspaceCenter.tsx'), 'utf8')
    const baseModel = readFileSync(join(import.meta.dir, 'shell/use-novel-workspace-base-model.tsx'), 'utf8')
    expect(controls).toContain('WorkspaceCenterWritingSkillsControl')
    expect(controls).toContain('WRITING_SKILL_CATALOG')
    expect(controls).toContain('skill.label')
    expect(controls).toContain('fictionHumanizerMode')
    expect(controls).toContain('精修')
    expect(controls).toContain('重写')
    expect(uiState).toContain('writingSkillsPayload(writingSkillsEnabled, fictionHumanizerMode)')
    expect(center).toContain('<WorkspaceCenterWritingSkillsControl')
    expect(controls).toContain('writingSkillsCatalog')
    expect(controls).toContain('catalog.map(skill =>')
    expect(uiState).toContain('writingSkillsCatalog')
    expect(center).toContain('writingSkillsCatalog={writingSkillsCatalog}')
    expect(baseModel).toContain('writingSkillsProjectIdRef')
    expect(baseModel).not.toContain('setWritingSkillsCatalog(BUILTIN_WRITING_SKILL_CATALOG)')
  })
})
