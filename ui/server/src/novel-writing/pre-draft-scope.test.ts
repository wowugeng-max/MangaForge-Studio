import { describe, expect, test } from 'bun:test'
import {
  buildPreDraftSettingScope,
  buildPreDraftStorylineScope,
} from './pre-draft-scope'

describe('pre-draft scope helpers', () => {
  test('collects required and forbidden setting scope for pre-draft briefs', () => {
    const scope = buildPreDraftSettingScope({
      setting_context: {
        required: ['旧钥匙', '禁门规则', ' '],
        chapter_usage: [
          { name: '协会袖印', required: true },
          { name: '幕后会长', required: true, forbidden: true },
          { name: '路人证词', required: false },
        ],
        forbidden: ['规则源头真相'],
      },
      safety_policy: {
        forbidden: ['现实危险操作'],
      },
    }, {
      forbidden_repeats: ['不要用总结体收尾'],
    })

    expect(scope).toEqual({
      key_settings: ['旧钥匙', '禁门规则', '协会袖印'],
      forbidden_content: ['规则源头真相', '不要用总结体收尾', '现实危险操作'],
    })
  })

  test('collects storyline scope by chapter usage type', () => {
    const scope = buildPreDraftStorylineScope({
      required: ['规则之源调查'],
      forbidden: ['提前揭示掌门身份'],
      chapter_usage: [
        { name: '林晓求生支线', usage_type: 'advance' },
        { summary: '第零条规则回收线', usage_type: 'plant' },
        { entity_type: '旧钥匙代价回收', usage_type: 'payoff' },
        { name: '幕后主神', usage_type: 'forbidden' },
        { name: '无关旁支', usage_type: 'reference' },
      ],
    })

    expect(scope).toEqual({
      storyline_advances: ['规则之源调查', '林晓求生支线'],
      storyline_plants: ['第零条规则回收线'],
      storyline_payoffs: ['旧钥匙代价回收'],
      storyline_forbidden: ['提前揭示掌门身份', '幕后主神'],
    })
  })
})
