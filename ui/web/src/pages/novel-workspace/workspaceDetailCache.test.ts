import { describe, expect, test } from 'bun:test'
import { compactChapterDetailForWorkspace } from './workspaceDetailCache'
import { buildCharacterPovUiModel } from './characterPovUiModel'

describe('compactChapterDetailForWorkspace pov authorization fields', () => {
  const sceneCard = {
    scene_no: 1,
    title: '开局',
    pov_character: '林序',
    decision_in_scene: '亲自查遗物',
    secondary_cut: { character: '小刘', max_lines: 3, purpose: '信息差' },
    forbidden_settings: ['尸变真因'],
    used_settings: ['守夜人手册'],
    pov_lens: {
      pov_character: '林序',
      secondary_cut: { character: '小刘', max_lines: 3, purpose: '信息差' },
      asset_bound_knows: ['守夜人手册'],
      asset_bound_unknown: ['尸变真因'],
    },
  }

  test('keeps secondary_cut / forbidden_settings / used_settings on compacted scenes', () => {
    const compacted = compactChapterDetailForWorkspace({ scene_list: [sceneCard] })
    const scene = compacted.scene_list[0]
    expect(scene.secondary_cut).toBeDefined()
    expect(scene.forbidden_settings).toEqual(['尸变真因'])
    expect(scene.used_settings).toEqual(['守夜人手册'])
    expect(scene.pov_lens.secondary_cut).toBeDefined()
    expect(scene.pov_lens.asset_bound_knows).toEqual(['守夜人手册'])
    expect(scene.pov_lens.asset_bound_unknown).toEqual(['尸变真因'])
  })

  test('compacted scene cards still feed secondary-cut and asset-firewall previews', () => {
    const compacted = compactChapterDetailForWorkspace({ scene_list: [sceneCard] })
    const model = buildCharacterPovUiModel({ sceneCards: compacted.scene_list })
    expect(model?.secondaryCutPreview).toEqual(['短切 小刘≤3行'])
    expect(model?.assetFirewallPreview).toEqual(['禁揭：尸变真因', '可知：守夜人手册'])
  })

  test('pov_lens-only secondary cut and asset bounds survive compaction', () => {
    const lensOnly = {
      scene_no: 2,
      pov_lens: {
        pov_character: '林序',
        secondary_cut: { character: '老周', max_lines: 2 },
        asset_bound_knows: ['冷柜编号'],
        asset_bound_unknown: ['幕后名单'],
      },
    }
    const compacted = compactChapterDetailForWorkspace({ scene_list: [lensOnly] })
    const model = buildCharacterPovUiModel({ sceneCards: compacted.scene_list })
    expect(model?.secondaryCutPreview).toEqual(['短切 老周≤2行'])
    expect(model?.assetFirewallPreview).toEqual(['禁揭：幕后名单', '可知：冷柜编号'])
  })
})
