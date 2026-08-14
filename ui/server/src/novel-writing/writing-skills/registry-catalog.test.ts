import { describe, expect, test } from 'bun:test'
import { buildWritingSkillCatalog, resolveWritingSkillStageLabel } from './registry'

const NEWER_PACK = {
  id: 'my-style-pack',
  name: '我的文风包',
  description: '换文风',
  revision: 'a'.repeat(40),
  source_url: 'https://github.com/acme/My-Style-Pack',
  installed_at: '2026-08-14T02:00:00.000Z',
}
const OLDER_PACK = {
  ...NEWER_PACK,
  id: 'older-pack',
  name: '旧包',
  installed_at: '2026-08-14T01:00:00.000Z',
}

describe('writing skill catalog merge', () => {
  test('builtins keep fixed order, installed packs follow by installed_at asc', () => {
    const catalog = buildWritingSkillCatalog([NEWER_PACK, OLDER_PACK])
    expect(catalog.map(entry => entry.id)).toEqual([
      'fiction-humanizer-zh',
      'remove-ai-flavor',
      'humanizer-zh',
      'older-pack',
      'my-style-pack',
    ])
    expect(catalog[0]).toMatchObject({ builtin: true, supports_mode: true, default_enabled: true })
    expect(catalog[1]).toMatchObject({ builtin: true, supports_mode: false })
    expect(catalog[3]).toMatchObject({
      id: 'older-pack',
      label: '旧包',
      builtin: false,
      supports_mode: false,
      default_enabled: false,
      revision: 'a'.repeat(40),
      source_url: 'https://github.com/acme/My-Style-Pack',
      installed_at: '2026-08-14T01:00:00.000Z',
    })
  })

  test('drops installed entries that collide with builtin ids or have a bad shape', () => {
    const catalog = buildWritingSkillCatalog([
      { ...NEWER_PACK, id: 'fiction-humanizer-zh' },
      { ...NEWER_PACK, id: 'Bad_Id' },
    ])
    expect(catalog).toHaveLength(3)
  })

  test('stage label uses the pack name for installed skills, the id as fallback', () => {
    expect(resolveWritingSkillStageLabel('fiction-humanizer-zh')).toBe('写作skill · 小说去AI味')
    expect(resolveWritingSkillStageLabel('my-style-pack', [NEWER_PACK])).toBe('写作skill · 我的文风包')
    expect(resolveWritingSkillStageLabel('gone-pack', [NEWER_PACK])).toBe('写作skill · gone-pack')
  })
})
