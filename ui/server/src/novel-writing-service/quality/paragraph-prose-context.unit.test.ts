import { describe, expect, test } from 'bun:test'
import { projectSceneCardForProseCorePrompt } from './paragraph-prose-context'

describe('projectSceneCardForProseCorePrompt clip', () => {
  test('clipping never splits a surrogate pair (CJK Ext-B at the 280 boundary)', () => {
    // conflict max = 280 → slice cut at code unit 279; put U+2000B (𠀋, 2 UTF-16 units) at 278/279.
    const conflict = `${'守'.repeat(278)}\u{2000B}后续冲突还有很长一段描述确保超过二百八十个码元`
    const card = projectSceneCardForProseCorePrompt({ goal: '目标', conflict })
    const clipped = String(card.conflict || '')
    expect(clipped.length).toBeGreaterThan(0)
    expect(clipped.isWellFormed()).toBe(true)
    expect(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(clipped)).toBe(false)
  })

  test('clipping never splits an emoji surrogate pair (goal 360 boundary)', () => {
    // goal max = 360 → slice cut at code unit 359; put 😀 (U+1F600, 2 UTF-16 units) at 358/359.
    const goal = `${'攻'.repeat(358)}\u{1F600}尾部继续超长超过三百六十个码元的目标描述`
    const card = projectSceneCardForProseCorePrompt({ goal, conflict: '短冲突' })
    const clipped = String(card.goal || '')
    expect(clipped.length).toBeGreaterThan(0)
    expect(clipped.isWellFormed()).toBe(true)
  })

  test('short values and BMP-only clipping are unchanged', () => {
    const card = projectSceneCardForProseCorePrompt({ goal: '短目标', conflict: '冲'.repeat(300) })
    expect(card.goal).toBe('短目标')
    expect(String(card.conflict).endsWith('…')).toBe(true)
    expect(String(card.conflict).length).toBe(280)
  })
})
