import { describe, expect, test } from 'bun:test'
import { mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  buildAssetGapAudit,
  buildChapterAssetPack,
  buildCharacterStatusOverview,
  buildRelationMasterTable,
  collectPendingIntakeQueue,
  loadAssetUpgradeBundle,
  mergeNonEmpty,
} from './novel-setting-asset-upgrade'
import { createNovelProject, createNovelReview } from '../novel'

describe('asset upgrade merge and projections', () => {
  test('mergeNonEmpty never blank-overwrites existing values', () => {
    const merged = mergeNonEmpty(
      { summary: '已有摘要', tags: ['A'], state: { hp: 3, note: '旧' } },
      { summary: '', tags: [], state: { hp: 5, note: '', title: '新头衔' }, extra: 'x' },
    )
    expect(merged.summary).toBe('已有摘要')
    expect(merged.tags).toEqual(['A'])
    expect(merged.state.hp).toBe(3)
    expect(merged.state.note).toBe('旧')
    expect(merged.state.title).toBe('新头衔')
    expect(merged.extra).toBe('x')
  })

  test('character status overview marks thin cards and merges story state', () => {
    const overview = buildCharacterStatusOverview({
      characters: [
        { id: 1, name: '李辰', role: '主角', current_state: { title: '天选者' } },
      ],
      settings: [
        { id: 9, entity_type: 'character', name: '小林', summary: '樱花国天选者', state_json: { nationality: '樱花国' } },
      ],
      storyState: {
        character_states: [
          { name: '李辰', identity: '公寓幸存者', abilities: ['日光回复'], relationships: ['与小林同盟'] },
        ],
      },
      chapters: [
        { id: 1, chapter_no: 1, chapter_text: 'x'.repeat(120) },
        { id: 12, chapter_no: 12, chapter_text: 'y'.repeat(120) },
      ],
    })
    expect(overview.summary.total).toBe(2)
    const li = overview.characters.find(item => item.name === '李辰')
    expect(li?.identity).toContain('公寓幸存者')
    expect(li?.abilities).toEqual(expect.arrayContaining(['日光回复']))
    expect(['ready', 'partial']).toContain(li?.readiness)
    expect(li?.missing_fields || []).not.toEqual(expect.arrayContaining(['身份']))
    const xiao = overview.characters.find(item => item.name === '小林')
    expect(xiao?.character_id).toBeNull()
    expect(xiao?.missing_fields.length).toBeGreaterThan(0)
  })

  test('intake queue aggregates all asset_intake reviews and skips applied names', () => {
    const queue = collectPendingIntakeQueue({
      reviews: [
        {
          id: 1,
          review_type: 'asset_intake',
          created_at: '2026-01-02T00:00:00Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            discovered_assets: [
              { entity_type: 'item', name: '青铜回声盘', summary: '记录门响', evidence: '门响了三次' },
              { entity_type: 'character', name: '李辰', summary: '主角' },
            ],
          }),
        },
        {
          id: 2,
          review_type: 'asset_intake',
          created_at: '2026-01-01T00:00:00Z',
          payload: JSON.stringify({
            chapter_id: 1,
            chapter_no: 1,
            discovered_assets: [
              { entity_type: 'location', name: '死亡公寓', summary: '开篇副本' },
            ],
          }),
        },
        {
          id: 3,
          review_type: 'asset_intake_apply',
          created_at: '2026-01-03T00:00:00Z',
          payload: JSON.stringify({
            created_settings: [{ name: '死亡公寓', entity_type: 'location' }],
          }),
        },
      ],
      characters: [{ id: 1, name: '李辰' }],
      settings: [],
    })
    expect(queue.summary.total).toBe(1)
    expect(queue.items[0].name).toBe('青铜回声盘')
    expect(queue.items[0].chapter_no).toBe(2)
  })

  test('asset upgrade bundle keeps the newest intake reviews when history exceeds the cap', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-bundle-reviews-'))
    const project = await createNovelProject(workspace, { title: '长篇评审截取', length_target: 'epic' })
    const baseTime = Date.parse('2026-01-01T00:00:00.000Z')
    for (let i = 0; i < 80; i++) {
      await createNovelReview(workspace, {
        project_id: project.id,
        review_type: 'asset_intake',
        status: 'ok',
        summary: `第${i + 1}章资产入册`,
        created_at: new Date(baseTime + i * 60_000).toISOString(),
        payload: JSON.stringify({
          chapter_id: i + 1,
          chapter_no: i + 1,
          discovered_assets: [{ entity_type: 'item', name: `旧资产${i + 1}`, summary: '旧发现' }],
        }),
      })
    }
    await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'asset_intake',
      status: 'ok',
      summary: '第81章资产入册',
      created_at: new Date(baseTime + 81 * 60_000).toISOString(),
      payload: JSON.stringify({
        chapter_id: 81,
        chapter_no: 81,
        discovered_assets: [{ entity_type: 'item', name: '最新回声盘', summary: '最新发现' }],
      }),
    })
    await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'asset_intake_apply',
      status: 'ok',
      summary: '已确认旧资产50',
      created_at: new Date(baseTime + 82 * 60_000).toISOString(),
      payload: JSON.stringify({
        created_settings: [{ name: '旧资产50', entity_type: 'item' }],
      }),
    })

    const bundle = await loadAssetUpgradeBundle(workspace, project)
    const names = bundle.intake_queue.items.map((item: any) => item.name)
    expect(names).toContain('最新回声盘')
    expect(names).not.toContain('旧资产50')
  })

  test('gap audit flags missing setting coverage after many written chapters', () => {
    const audit = buildAssetGapAudit({
      characters: [{ id: 1, name: '李辰', current_state: { identity: '主角' } }],
      settings: [{ id: 1, entity_type: 'character', name: '李辰', summary: '主角' }],
      chapters: Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        chapter_no: i + 1,
        chapter_text: '正文'.repeat(60),
      })),
      worldbuilding: [],
      outlines: [],
      storyState: {},
      usage: [],
    })
    expect(audit.summary.written_chapter_count).toBe(12)
    expect(audit.gaps.some(item => item.key === 'missing_type_location')).toBe(true)
    expect(audit.gaps.some(item => item.key === 'worldbuilding_missing')).toBe(true)
    expect(audit.score).toBeLessThan(100)
  })

  test('chapter asset pack slices usage-linked settings', () => {
    const pack = buildChapterAssetPack({
      chapter: { id: 5, chapter_no: 5, chapter_text: '正文'.repeat(50) },
      settings: [
        { id: 1, entity_type: 'item', name: '日光罐', summary: '回复' },
        { id: 2, entity_type: 'location', name: '禁库', summary: '危险' },
      ],
      characters: [{ id: 9, name: '李辰', role: '主角', current_state: {} }],
      usage: [
        { chapter_id: 5, entity_id: 1, usage_type: 'required', reveal_level: 'partial' },
      ],
      storyState: {},
    })
    expect(pack.summary.setting_count).toBe(1)
    expect(pack.settings_by_type.item[0].name).toBe('日光罐')
  })

  test('relation master table projects setting-to-setting edges', () => {
    const table = buildRelationMasterTable({
      settings: [
        {
          id: 1,
          entity_type: 'character',
          name: '李辰',
          related_entity_ids: [2],
          state_json: {},
          payload_json: {},
        },
        {
          id: 2,
          entity_type: 'faction',
          name: '大夏局',
          related_entity_ids: [1],
          state_json: {},
          payload_json: {},
        },
      ],
      characters: [{ id: 1, name: '李辰' }],
      chapters: [],
      usage: [],
    })
    expect(table.summary.total).toBeGreaterThan(0)
    expect(table.rows.some(item => item.source_name === '李辰' || item.target_name === '李辰')).toBe(true)
  })
})
