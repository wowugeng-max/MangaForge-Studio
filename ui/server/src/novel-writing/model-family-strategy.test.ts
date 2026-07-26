import { describe, expect, test } from 'bun:test'
import {
  attachModelFamilyToContextPackage,
  buildModelFamilyStrategy,
  formatModelFamilyStrategyPrompt,
  isFlashTierModel,
  proseMaxTokensForModelFamily,
  resolveModelFamily,
  resolveModelRuntimeIdentity,
} from './model-family-strategy'

describe('model family strategy', () => {
  test('detects gpt / grok / kimi / gemini families from name and provider', () => {
    expect(resolveModelFamily({ model_name: 'gpt-5.4', provider_id: 'openai' })).toBe('gpt')
    expect(resolveModelFamily({ model_name: 'chatgpt-4o-latest' })).toBe('gpt')
    expect(resolveModelFamily({ model_name: 'grok-3', provider_id: 'xai' })).toBe('grok')
    expect(resolveModelFamily({ model_name: 'kimi-k2', provider_id: 'moonshot' })).toBe('kimi')
    expect(resolveModelFamily({ model_name: 'gemini-3.5-flash', provider_id: 'gemini' })).toBe('gemini')
    expect(resolveModelFamily({ model_name: 'models/gemini-2.0-pro', api_format: 'gemini_native' })).toBe('gemini')
    expect(resolveModelFamily({ model_name: 'unknown-chat' })).toBe('default')
  })

  test('marks flash-tier models and gemini prefers scene_chunk_stitch', () => {
    expect(isFlashTierModel({ model_name: 'gemini-3.5-flash' })).toBe(true)
    const gemini = buildModelFamilyStrategy({ model_name: 'gemini-3.5-flash', provider_id: 'gemini' })
    expect(gemini.family).toBe('gemini')
    expect(gemini.write_mode).toBe('scene_chunk_stitch')
    expect(gemini.avoid_full_chapter_rewrite).toBe(true)
    expect(gemini.max_tokens_multiplier).toBeGreaterThanOrEqual(1.8)
    expect(formatModelFamilyStrategyPrompt(gemini).join('\n')).toContain('分场景')

    const gpt = buildModelFamilyStrategy({ model_name: 'gpt-5.4', provider_id: 'openai' })
    expect(gpt.write_mode).toBe('full_chapter')
    expect(formatModelFamilyStrategyPrompt(gpt).join('\n')).toContain('GPT')

    const grok = buildModelFamilyStrategy({ model_name: 'grok-3' })
    expect(grok.family).toBe('grok')
    expect(formatModelFamilyStrategyPrompt(grok).join('\n')).toContain('发散')

    const kimi = buildModelFamilyStrategy({ model_name: 'moonshot-v1', provider_id: 'kimi' })
    expect(kimi.family).toBe('kimi')
    expect(formatModelFamilyStrategyPrompt(kimi).join('\n')).toContain('一句一段')
  })

  test('scales max tokens for gemini flash and attaches strategy onto context', () => {
    const strategy = buildModelFamilyStrategy({ model_name: 'gemini-3.5-flash' })
    const tokens = proseMaxTokensForModelFamily(
      { target: 4200, min: 3780, max: 4620, label: '标准章', rangeText: '3780-4620', mode: 'standard' } as any,
      strategy,
    )
    expect(tokens).toBeGreaterThan(18000)

    const identity = resolveModelRuntimeIdentity({
      modelId: 5,
      modelName: 'gemini-3.5-flash',
      providerId: 'gemini',
    })
    const ctx = attachModelFamilyToContextPackage({ chapter_target: { chapter_no: 1 } }, identity)
    expect(ctx.runtime_model.model_name).toBe('gemini-3.5-flash')
    expect(ctx.model_family_strategy.family).toBe('gemini')
  })
})



test('claude family prefers scene stitch and length-first directives', () => {
  const claude = buildModelFamilyStrategy({ model_name: 'claude-sonnet-4-6', provider_id: 'cliproxyapi', api_format: 'claude_code' })
  expect(claude.family).toBe('claude')
  expect(claude.write_mode).toBe('scene_chunk_stitch')
  const prompt = formatModelFamilyStrategyPrompt(claude).join('\n')
  expect(prompt).toContain('chapter_text')
  expect(prompt).toContain('场景预算')
})

test('model family strategies expose pov intensity directives', () => {
  const gemini = buildModelFamilyStrategy({ model_name: 'gemini-3.5-flash', provider_id: 'gemini' })
  expect(gemini.pov_intensity).toBe('strict')
  expect(gemini.pov_directives.join(' ')).toContain('角色视角')
  const prompt = formatModelFamilyStrategyPrompt(gemini).join('\n')
  expect(prompt).toContain('角色视角强度')
})
