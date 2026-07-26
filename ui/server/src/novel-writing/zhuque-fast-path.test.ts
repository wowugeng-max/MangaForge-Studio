import { describe, expect, test } from 'vitest'
import {
  ZHUQUE_FAST_PATH_VERSION,
  applyZhuqueFastPathOptions,
  describeZhuqueFastPath,
  isZhuqueFastProductionMode,
  resolveZhuqueFastHumanizePolicy,
} from './zhuque-fast-path'
import { R76_ZHUQUE_STACK_VERSION } from './r76-zhuque-stack'

describe('zhuque fast path', () => {
  test('detects production mode aliases and flag', () => {
    expect(isZhuqueFastProductionMode('zhuque_fast')).toBe(true)
    expect(isZhuqueFastProductionMode('draft_humanize_store')).toBe(true)
    expect(isZhuqueFastProductionMode('zhuque_validate')).toBe(true)
    expect(isZhuqueFastProductionMode('draft_review_revise_store')).toBe(false)
    expect(isZhuqueFastProductionMode('draft_only', { zhuque_fast: true })).toBe(true)
    expect(isZhuqueFastProductionMode({ production_mode: 'zhuque_fast' })).toBe(true)
  })

  test('resolveZhuqueFastHumanizePolicy defaults to skip unless explicitly enabled', () => {
    expect(resolveZhuqueFastHumanizePolicy({})).toEqual({
      enable_humanize_postprocess: false,
      skip_humanize_postprocess: true,
    })
    expect(resolveZhuqueFastHumanizePolicy({ enable_humanize_postprocess: true })).toEqual({
      enable_humanize_postprocess: true,
      skip_humanize_postprocess: false,
    })
    expect(resolveZhuqueFastHumanizePolicy({
      enable_humanize_postprocess: true,
      skip_humanize_postprocess: true,
    })).toEqual({
      enable_humanize_postprocess: false,
      skip_humanize_postprocess: true,
    })
  })

  test('applyZhuqueFastPathOptions defaults skip humanize and skips heavy loops', () => {
    const opts = applyZhuqueFastPathOptions({
      production_mode: 'zhuque_fast',
      model_id: 36,
    })
    expect(opts.zhuque_fast).toBe(true)
    expect(opts.zhuque_fast_path).toBe(ZHUQUE_FAST_PATH_VERSION)
    expect(opts.expand).toBe(false)
    expect(opts.max_quality_revision_rounds).toBe(0)
    expect(opts.skip_humanize_postprocess).toBe(true)
    expect(opts.enable_humanize_postprocess).toBe(false)
    expect(opts.skip_mid_monologue_densify).toBe(true)
    expect(opts.enable_mid_monologue_densify).toBe(false)
    expect(opts.risk_rewrite_rounds).toBe(1)
    expect(opts.max_risk_windows).toBe(3)
    expect(opts.r76_zhuque_stack).toBe(R76_ZHUQUE_STACK_VERSION)
  })

  test('applyZhuqueFastPathOptions allows explicit humanize opt-in', () => {
    const opts = applyZhuqueFastPathOptions({
      production_mode: 'zhuque_fast',
      enable_humanize_postprocess: true,
    })
    expect(opts.enable_humanize_postprocess).toBe(true)
    expect(opts.skip_humanize_postprocess).toBe(false)
  })

  test('applyZhuqueFastPathOptions allows densify opt-in', () => {
    const opts = applyZhuqueFastPathOptions({
      production_mode: 'zhuque_fast',
      enable_mid_monologue_densify: true,
    })
    expect(opts.skip_mid_monologue_densify).toBe(false)
    expect(opts.enable_mid_monologue_densify).toBe(true)
  })

  test('non-fast mode is passthrough', () => {
    const opts = applyZhuqueFastPathOptions({ production_mode: 'draft_review_revise_store', expand: true })
    expect(opts.zhuque_fast).toBeUndefined()
    expect(opts.expand).toBe(true)
  })

  test('describe lists keeps/skips including default humanize skip', () => {
    const desc = describeZhuqueFastPath()
    expect(desc.version).toBe(ZHUQUE_FAST_PATH_VERSION)
    expect(desc.keeps.join(' ')).toMatch(/draft|sanitize|store/i)
    expect(desc.skips.join(' ')).toMatch(/editor|review|revise|humanize|densify/i)
    expect(desc.api.humanize_default).toBe('skip')
    expect(desc.api.densify_default).toBe('skip')
  })
})
