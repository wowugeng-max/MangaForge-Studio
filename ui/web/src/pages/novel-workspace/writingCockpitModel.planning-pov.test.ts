import { describe, expect, test } from 'bun:test'
import { buildChapterPlanningDesk } from './writing-cockpit/model/cockpit-planning'

describe('chapter planning desk pov authorization previews', () => {
  test('secondary cut and asset firewall previews survive the cockpit scene-card mapping', () => {
    const desk = buildChapterPlanningDesk({
      nextChapter: {
        chapter_text: '',
        scene_list: [
          {
            scene_no: 1,
            title: '楼道对峙',
            purpose: '推进冲突',
            pov_lens: {
              pov_character: '林序',
              secondary_cut: { character: '小刘', max_lines: 3, purpose: '外部视角压力' },
              asset_bound_unknown: ['名单第三个名字'],
              asset_bound_knows: ['电梯停运公告'],
            },
            forbidden_settings: ['名单第三个名字'],
            used_settings: ['电梯停运公告'],
          },
        ],
      },
      cockpitChapter: null,
      contextPackage: { characters: [] },
    })

    expect(desk.characterPov.secondaryCutPreview.length).toBeGreaterThan(0)
    expect(desk.characterPov.secondaryCutPreview.join(' ')).toContain('小刘')
    expect(desk.characterPov.assetFirewallPreview.join(' ')).toContain('禁揭：名单第三个名字')
    expect(desk.characterPov.assetFirewallPreview.join(' ')).toContain('可知：电梯停运公告')
  })
})
