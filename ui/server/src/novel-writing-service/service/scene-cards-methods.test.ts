import { describe, expect, mock, test } from 'bun:test'
import { normalizeSceneCardsPayload } from '../post-delivery/scene-cards'

// Capture the value before mock.module patches the export binding.
const realNormalizeSceneCardsPayload = normalizeSceneCardsPayload
const normalizeContexts: any[] = []

mock.module('../post-delivery/scene-cards', () => ({
  normalizeSceneCardsPayload: (payload: any, contextPackage: any) => {
    normalizeContexts.push(contextPackage)
    return realNormalizeSceneCardsPayload(payload, contextPackage)
  },
}))

describe('createSceneCardsMethods.generateSceneCardsForChapter', () => {
  test('passes the family-attached context package to normalizeSceneCardsPayload (same object family as prompt stage)', async () => {
    normalizeContexts.length = 0
    const { createSceneCardsMethods } = await import('./scene-cards-methods')
    const methods = createSceneCardsMethods({
      executeAgent: async () => ({
        content: JSON.stringify({
          scene_cards: [
            { scene_no: 1, title: '查尸', purpose: '确认异常', conflict: '死因不对', beat: '发现温尸' },
          ],
        }),
      }),
      getStageModelId: () => 0,
      getStageTemperature: () => 0.45,
    })

    const contextPackage = {
      chapter_target: { chapter_no: 1, summary: '查尸', conflict: '死因异常' },
      characters: [{ name: '林序', role_type: 'protagonist' }],
    }
    const { sceneCards } = await methods.generateSceneCardsForChapter(
      '/nonexistent-workspace-scene-cards-methods-test',
      { title: '测试书', genre: '悬疑' },
      contextPackage,
      undefined,
      { runtime_model: { model_name: 'gemini-2.5-pro', provider_id: 'gemini' } },
    )

    expect(sceneCards.length).toBeGreaterThan(0)
    expect(normalizeContexts.length).toBe(1)
    // Normalization must see the same model_family_strategy the prompt stage used,
    // so the backfilled pov_lens POV plan follows the family intensity (gemini = strict).
    expect(normalizeContexts[0]?.model_family_strategy?.family).toBe('gemini')
    expect(normalizeContexts[0]?.model_family_strategy?.pov_intensity).toBe('strict')
  })
})
