import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_FICTION_HUMANIZER_MODE,
  DEFAULT_WRITING_SKILLS_ENABLED,
  WRITING_SKILL_IDS,
} from './registry'
import { resolveWritingSkillsEnabled } from './resolve-enabled'

describe('resolveWritingSkillsEnabled', () => {
  test('uses catalog defaults when project and override are empty', () => {
    const resolved = resolveWritingSkillsEnabled()
    expect(resolved.enabled).toEqual(DEFAULT_WRITING_SKILLS_ENABLED)
    expect(resolved.ids).toEqual(['fiction-humanizer-zh', 'remove-ai-flavor'])
    expect(WRITING_SKILL_IDS).toEqual([
      'fiction-humanizer-zh',
      'remove-ai-flavor',
      'humanizer-zh',
    ])
  })

  test('merges project flags over defaults and ignores unknown ids', () => {
    const resolved = resolveWritingSkillsEnabled({
      project: {
        reference_config: {
          writing_skills: {
            enabled: {
              'humanizer-zh': true,
              'remove-ai-flavor': false,
              'not-a-skill': true,
            },
          },
        },
      },
    })
    expect(resolved.enabled).toEqual({
      'fiction-humanizer-zh': true,
      'remove-ai-flavor': false,
      'humanizer-zh': true,
    })
    expect(resolved.ids).toEqual(['fiction-humanizer-zh', 'humanizer-zh'])
  })

  test('generation override wins over project defaults without flipping omitted keys', () => {
    const resolved = resolveWritingSkillsEnabled({
      project: {
        reference_config: {
          writing_skills: {
            enabled: {
              'fiction-humanizer-zh': false,
              'humanizer-zh': true,
            },
          },
        },
      },
      override: {
        enabled: {
          'remove-ai-flavor': false,
        },
      },
    })
    expect(resolved.enabled).toEqual({
      'fiction-humanizer-zh': false,
      'remove-ai-flavor': false,
      'humanizer-zh': true,
    })
    expect(resolved.ids).toEqual(['humanizer-zh'])
  })

  test('treats empty override as no override and can turn every skill off', () => {
    expect(resolveWritingSkillsEnabled({
      override: { enabled: {} },
    }).ids).toEqual(['fiction-humanizer-zh', 'remove-ai-flavor'])

    expect(resolveWritingSkillsEnabled({
      override: {
        enabled: {
          'fiction-humanizer-zh': false,
          'remove-ai-flavor': false,
          'humanizer-zh': false,
        },
      },
    }).ids).toEqual([])
  })
})

test('defaults fiction_humanizer_mode to polish', () => {
  expect(resolveWritingSkillsEnabled().fiction_humanizer_mode).toBe(DEFAULT_FICTION_HUMANIZER_MODE)
})

test('reads project mode and ignores illegal values', () => {
  expect(resolveWritingSkillsEnabled({
    project: { reference_config: { writing_skills: { fiction_humanizer_mode: 'rewrite' } } },
  }).fiction_humanizer_mode).toBe('rewrite')

  expect(resolveWritingSkillsEnabled({
    project: { reference_config: { writing_skills: { fiction_humanizer_mode: 'light' } } },
  }).fiction_humanizer_mode).toBe('polish')
})

describe('writing skills model_id resolution', () => {
  test('resolves a positive integer model_id from project config', () => {
    expect(resolveWritingSkillsEnabled({
      project: { reference_config: { writing_skills: { model_id: 317 } } },
    }).model_id).toBe(317)
  })

  test('rejects string, zero, negative, float, and missing model_id', () => {
    for (const value of ['317', '0', 0, -1, 4.5, null, undefined, {}, []] as unknown[]) {
      expect(resolveWritingSkillsEnabled({
        project: { reference_config: { writing_skills: { model_id: value } } },
      }).model_id).toBeUndefined()
    }
    expect(resolveWritingSkillsEnabled().model_id).toBeUndefined()
  })

  test('ignores model_id smuggled through the generation override', () => {
    expect(resolveWritingSkillsEnabled({
      override: { model_id: 999 },
    }).model_id).toBeUndefined()

    expect(resolveWritingSkillsEnabled({
      project: { reference_config: { writing_skills: { model_id: 317 } } },
      override: { model_id: 999 },
    }).model_id).toBe(317)
  })
})

const INSTALLED = [
  { id: 'older-pack', installed_at: '2026-08-14T01:00:00.000Z' },
  { id: 'my-style-pack', installed_at: '2026-08-14T02:00:00.000Z' },
]

test('installed packs default to disabled and keep installed_at order when enabled', () => {
  const off = resolveWritingSkillsEnabled({ installed: INSTALLED })
  expect(off.enabled['my-style-pack']).toBe(false)
  expect(off.ids).toEqual(['fiction-humanizer-zh', 'remove-ai-flavor'])

  const on = resolveWritingSkillsEnabled({
    installed: INSTALLED,
    project: {
      reference_config: {
        writing_skills: {
          enabled: { 'my-style-pack': true, 'older-pack': true, 'humanizer-zh': true },
        },
      },
    },
  })
  expect(on.ids).toEqual([
    'fiction-humanizer-zh',
    'remove-ai-flavor',
    'humanizer-zh',
    'older-pack',
    'my-style-pack',
  ])
})

test('silently filters stale ids that are no longer installed', () => {
  const resolved = resolveWritingSkillsEnabled({
    project: { reference_config: { writing_skills: { enabled: { 'uninstalled-pack': true } } } },
  })
  expect(resolved.ids).toEqual(['fiction-humanizer-zh', 'remove-ai-flavor'])
  expect('uninstalled-pack' in resolved.enabled).toBe(false)
})

test('generation override can flip an installed pack on', () => {
  const resolved = resolveWritingSkillsEnabled({
    installed: INSTALLED,
    override: { enabled: { 'my-style-pack': true } },
  })
  expect(resolved.ids).toEqual(['fiction-humanizer-zh', 'remove-ai-flavor', 'my-style-pack'])
})

test('generation override wins for mode without flipping omitted enabled keys', () => {
  const resolved = resolveWritingSkillsEnabled({
    project: {
      reference_config: {
        writing_skills: {
          enabled: { 'humanizer-zh': true },
          fiction_humanizer_mode: 'polish',
        },
      },
    },
    override: { fiction_humanizer_mode: 'rewrite' },
  })
  expect(resolved.fiction_humanizer_mode).toBe('rewrite')
  expect(resolved.enabled['humanizer-zh']).toBe(true)
  expect(resolved.ids).toEqual(['fiction-humanizer-zh', 'remove-ai-flavor', 'humanizer-zh'])
})
