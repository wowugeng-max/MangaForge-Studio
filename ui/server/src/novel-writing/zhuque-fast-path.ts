/**
 * Zhuque validation fast path — system-wide production mode.
 *
 * Goal: cut serial LLM stages for detector experiments without chapter tuning.
 * Keeps: context/scene (minimal), draft, R76 prestores light sanitize (NO densify by default), name guard, store.
 * Skips: commercial editor, meme polish, multi-round quality review/revise, word-target expand LLM,
 *        and (default) humanize risk-segment LLM rewrite.
 *
 * A/B 2026-07-25 (system-level, ch2 sonnet-4-6):
 *   zhuque_fast + humanize ON  → Zhuque human 0%
 *   zhuque_fast + humanize OFF → Zhuque human 22.86%
 * So humanize risk-segment is treated as detector-hostile on this path and defaults OFF.
 * Opt in with enable_humanize_postprocess=true.
 *
 * A/B densify (system-level):
 *   densify-on-old 39.75% multi-island had ~0 micro-beat stamps
 *   densify storms / light densify on new LLM → 16.9% / 10.19% regression
 * So mid-monologue densify defaults OFF on this path. Opt in with enable_mid_monologue_densify=true.
 *
 * Default full production remains `draft_review_revise_store` (humanize still available there).
 */

import { buildR76HumanizeDefaultOptions, R76_ZHUQUE_STACK_VERSION } from './r76-zhuque-stack'

export const ZHUQUE_FAST_PATH_VERSION = 'zhuque-fast-v3'
export const ZHUQUE_FAST_PRODUCTION_MODES = [
  'zhuque_fast',
  'draft_humanize_store',
  'zhuque_validate',
] as const

export type ZhuqueFastProductionMode = (typeof ZHUQUE_FAST_PRODUCTION_MODES)[number]

export function normalizeProductionMode(value: any): string {
  return String(value || '').trim().toLowerCase()
}

export function isZhuqueFastProductionMode(productionModeOrOptions: any, options?: any): boolean {
  if (productionModeOrOptions && typeof productionModeOrOptions === 'object' && options === undefined) {
    const mode = normalizeProductionMode(
      productionModeOrOptions.production_mode
      || productionModeOrOptions.productionMode
      || productionModeOrOptions.mode,
    )
    if ((ZHUQUE_FAST_PRODUCTION_MODES as readonly string[]).includes(mode)) return true
    return productionModeOrOptions.zhuque_fast === true
      || productionModeOrOptions.zhuqueFast === true
      || productionModeOrOptions.fast_zhuque === true
      || productionModeOrOptions.fastZhuque === true
  }

  const mode = normalizeProductionMode(productionModeOrOptions)
  if ((ZHUQUE_FAST_PRODUCTION_MODES as readonly string[]).includes(mode)) return true
  const opts = options || {}
  return opts.zhuque_fast === true
    || opts.zhuqueFast === true
    || opts.fast_zhuque === true
    || opts.fastZhuque === true
}

/** Resolve humanize policy for Zhuque fast path (default skip; explicit enable opt-in). */
export function resolveZhuqueFastHumanizePolicy(options: Record<string, any> = {}): {
  enable_humanize_postprocess: boolean
  skip_humanize_postprocess: boolean
} {
  const explicitlyEnable = options.enable_humanize_postprocess === true || options.enableHumanizePostprocess === true
  const explicitlySkip = options.skip_humanize_postprocess === true || options.skipHumanizePostprocess === true
  // Explicit skip always wins. Otherwise only enable when caller opts in.
  const skip = explicitlySkip || !explicitlyEnable
  const enable = explicitlyEnable && !explicitlySkip
  return {
    enable_humanize_postprocess: enable,
    skip_humanize_postprocess: skip,
  }
}

/** Clamp a sparse risk cap to [0, max]; explicit 0 is preserved (0 = off), non-finite falls back to max. */
function clampRiskCap(value: any, max: number): number {
  const parsed = Number(value ?? max)
  if (!Number.isFinite(parsed)) return max
  return Math.max(0, Math.min(max, parsed))
}

/** Merge locked fast-path options onto caller bag (caller may still override humanize flags). */
export function applyZhuqueFastPathOptions(options: Record<string, any> = {}): Record<string, any> {
  if (!isZhuqueFastProductionMode(options.production_mode || options.productionMode, options)) {
    return { ...options }
  }
  const mode = normalizeProductionMode(options.production_mode || options.productionMode) || 'zhuque_fast'
  const humanize = resolveZhuqueFastHumanizePolicy(options)
  // Densify default OFF on zhuque_fast; explicit enable_mid_monologue_densify opts in.
  const densifyOptIn = options.enable_mid_monologue_densify === true || options.enableMidMonologueDensify === true
  const densifyExplicitSkip = options.skip_mid_monologue_densify === true || options.skipMidMonologueDensify === true
  const skipDensify = densifyExplicitSkip || !densifyOptIn
  return {
    ...options,
    production_mode: mode,
    productionMode: mode,
    zhuque_fast: true,
    zhuque_fast_path: ZHUQUE_FAST_PATH_VERSION,
    // Skip slow serial stages
    expand: options.expand === true ? true : false, // default off; explicit true still allowed
    max_quality_revision_rounds: 0,
    // R76 sparse caps retained for opt-in humanize; default is skip (A/B 22.86% vs 0%).
    ...buildR76HumanizeDefaultOptions({
      enable_humanize_postprocess: humanize.enable_humanize_postprocess,
      enableHumanizePostprocess: humanize.enable_humanize_postprocess,
      skip_humanize_postprocess: humanize.skip_humanize_postprocess,
      skipHumanizePostprocess: humanize.skip_humanize_postprocess,
    }),
    // Force sparse caps even if caller partially overwrote; explicit 0 stays 0 (= off).
    risk_rewrite_rounds: clampRiskCap(options.risk_rewrite_rounds ?? options.riskRewriteRounds, 1),
    max_risk_windows: clampRiskCap(options.max_risk_windows ?? options.maxRiskWindows, 3),
    r76_zhuque_stack: options.r76_zhuque_stack || R76_ZHUQUE_STACK_VERSION,
    // Re-assert humanize policy after spread so defaults cannot re-enable silently.
    enable_humanize_postprocess: humanize.enable_humanize_postprocess,
    enableHumanizePostprocess: humanize.enable_humanize_postprocess,
    skip_humanize_postprocess: humanize.skip_humanize_postprocess,
    skipHumanizePostprocess: humanize.skip_humanize_postprocess,
    // Pure draft texture: skip densify injects by default on this path.
    skip_mid_monologue_densify: skipDensify,
    skipMidMonologueDensify: skipDensify,
    enable_mid_monologue_densify: densifyOptIn && !skipDensify,
    enableMidMonologueDensify: densifyOptIn && !skipDensify,
  }
}

export function describeZhuqueFastPath() {
  return {
    version: ZHUQUE_FAST_PATH_VERSION,
    production_modes: [...ZHUQUE_FAST_PRODUCTION_MODES],
    keeps: [
      'context package',
      'scene cards (if missing / required by draft)',
      'draft prose',
      'opening handoff bridge',
      `R76 prestores light sanitize, densify OFF by default (${R76_ZHUQUE_STACK_VERSION})`,
      'canonical name guard',
      'full production store admission',
    ],
    skips: [
      'commercial editor rewrite',
      'meme polish',
      'multi-round quality review/revise LLM',
      'word-target expand LLM (default)',
      'humanize risk-segment LLM rewrite (default; opt-in enable_humanize_postprocess=true)',
      'mid-monologue densify injects (default; opt-in enable_mid_monologue_densify=true)',
    ],
    api: {
      production_mode: 'zhuque_fast',
      aliases: ['draft_humanize_store', 'zhuque_validate'],
      flag: 'zhuque_fast: true',
      humanize_default: 'skip',
      densify_default: 'skip',
      densify_opt_in: 'enable_mid_monologue_densify=true',
      humanize_opt_in: 'enable_humanize_postprocess=true',
    },
  }
}
