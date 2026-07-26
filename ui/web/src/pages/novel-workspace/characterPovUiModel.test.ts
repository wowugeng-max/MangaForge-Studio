import { describe, expect, test } from 'bun:test'
import { buildCharacterPovUiModel } from './characterPovUiModel'

describe('buildCharacterPovUiModel', () => {
  test('builds primary pov and scene lenses from scene cards', () => {
    const model = buildCharacterPovUiModel({
      characters: [{ name: '林序', role_type: 'protagonist', current_state: { knowledge_now: ['三具温尸'], misbeliefs: ['以为是普通猝死'] } }],
      sceneCards: [
        {
          sceneNo: 1,
          povCharacter: '林序',
          wantNow: '先确认死因异常',
          fearOrCostNow: '怕背锅',
          decisionInScene: '亲自查遗物',
        },
        {
          sceneNo: 2,
          povCharacter: '林序',
          wantNow: '拿到地址',
          fearOrCostNow: '名单点到自己',
          decisionInScene: '请假去槐树路',
        },
      ],
    })
    expect(model?.primaryPov).toBe('林序')
    expect(model?.status).toBe('ok')
    expect(model?.statusLabel).toContain('林序')
    expect(model?.scenes).toHaveLength(2)
    expect(model?.knowledgePreview.some((item) => item.includes('温尸'))).toBe(true)
  })

  test('flags missing decisions and author explain text', () => {
    const model = buildCharacterPovUiModel({
      characters: [{ name: '林序', role_type: 'protagonist' }],
      sceneCards: [{ sceneNo: 1, povCharacter: '林序' }],
      chapterText: '这意味着有人改了名单。他不知道的是门外有人。',
    })
    expect(model?.status === 'warn' || model?.status === 'fail').toBe(true)
    expect(model?.violations.length).toBeGreaterThan(0)
  })

  test('ingests quality findings and marks fail on pov hard issues', () => {
    const model = buildCharacterPovUiModel({
      characters: [{ name: '林序', role_type: 'protagonist' }],
      sceneCards: [{ sceneNo: 1, povCharacter: '林序', decisionInScene: '继续查' }],
      qualityFindings: [
        { key: 'pov_unauthorized_switch', label: '未授权视角切换', evidence: '小刘心想', fix: '回到林序' },
        '作者解释腔：这意味着名单被改',
      ],
    })
    expect(model?.status).toBe('fail')
    expect(model?.violations.some((item) => item.key === 'pov_unauthorized_switch')).toBe(true)
    expect(model?.violations.length).toBeGreaterThan(1)
  })

  test('surfaces secondary cut and asset firewall previews', () => {
    const model = buildCharacterPovUiModel({
      characters: [{ name: '林序', role_type: 'protagonist' }],
      sceneCards: [{
        sceneNo: 1,
        povCharacter: '林序',
        decisionInScene: '继续查',
        secondary_cut: { character: '小刘', max_lines: 2 },
        forbidden_settings: ['名单祭品规则'],
        used_settings: ['体温异常'],
      }],
    })
    expect(model?.secondaryCutPreview.some((item) => item.includes('小刘'))).toBe(true)
    expect(model?.assetFirewallPreview.some((item) => item.includes('名单祭品规则'))).toBe(true)
  })
})
