/**
 * R76 Zhuque stack — locked default for main novel writing pipeline.
 *
 * Empirically validated ladder (system-wide, not chapter-tuned):
 *   R72 Human 0%
 *   R73b Human 13.48%  (green texture: quiet micro-social + fused noise/object + incomplete read)
 *   R74 Human 43.4%
 *   R75 Human 59.6%    (exam pipeline interrupt)
 *   R76 Human 72.59%   (vital-report cascade strip)  ← high-water baseline
 *   R77 Human 57.88%   (heavy opening process rewrite) ← REGRESSION, opt-in only
 *   R78 Human 72.43%   (light opening ≤300 chars) ← default opening polish
 *
 * Default production policy:
 * 1) Draft prompts include resistance directives (model-family-strategy)
 * 2) Humanize postprocess ON (risk_segment + human_positive), Pass B OFF
 * 3) sanitizeDetectorHostileStock always on pre-store (R73b/R75/R76/R78 light opening)
 * 4) Never run aggressive sanitizeOpeningProcessPipeline (R77) by default
 */

import { buildHumanWebnovelResistancePromptDirectives, sanitizeDetectorHostileStock } from './human-webnovel-resistance'
import { HUMANIZE_RISK_SEGMENT_VERSION } from './humanize-risk-segment'
import { HUMANIZE_POSTPROCESS_VERSION } from './humanize-postprocess'

export const R76_ZHUQUE_STACK_VERSION = 'r76-stable-v1'
export const R76_ZHUQUE_STACK_BASELINE = {
  round: 'r76',
  human_pct: 72.59,
  suspected_pct: 27.41,
  pure_ai_pct: 0,
  alert: '人工创作特征显著',
} as const

/** Default humanize options for main pipeline (production). */
export function buildR76HumanizeDefaultOptions(overrides: Record<string, any> = {}): Record<string, any> {
  // Drop undefined so caller option bags cannot clobber locked defaults.
  const clean: Record<string, any> = {}
  for (const [k, v] of Object.entries(overrides || {})) {
    if (v !== undefined) clean[k] = v
  }
  return {
    // Always on unless caller sets skip_humanize_postprocess=true
    enable_humanize_postprocess: true,
    enableHumanizePostprocess: true,
    // Risk-segment path with human_positive additive rewrites (not full Pass A / Pass B)
    humanize_mode: 'risk_segment',
    humanizeMode: 'risk_segment',
    enable_humanize_pass_b: false,
    enableHumanizePassB: false,
    full_pass_a: false,
    fullPassA: false,
    // Prefer short local rewrites; quality revise rounds controlled by caller
    risk_rewrite_rounds: 2,
    max_risk_windows: 6,
    r76_zhuque_stack: R76_ZHUQUE_STACK_VERSION,
    ...clean,
    // Re-assert stack identity even if caller omitted/overwrote with empty.
    r76_zhuque_stack: clean.r76_zhuque_stack || R76_ZHUQUE_STACK_VERSION,
    humanize_mode: clean.humanize_mode ?? clean.humanizeMode ?? 'risk_segment',
    humanizeMode: clean.humanizeMode ?? clean.humanize_mode ?? 'risk_segment',
  }
}

/** Prompt directives locked for draft/revise (all models). */
export function buildR76PromptDirectives(contract?: any): string[] {
  return [
    `【R76栈·锁定默认 ${R76_ZHUQUE_STACK_VERSION}】生成与修订必须遵守朱雀绿段合同；禁止为清流程而重写中后段人味区。`,
    ...buildHumanWebnovelResistancePromptDirectives(contract),
  ]
}

/** Final pre-store sanitize: R73b green + R75 exam interrupt + R76 vital strip + R78 light opening. */
export function applyR76PreStoreSanitize(text: string): string {
  return sanitizeDetectorHostileStock(String(text || ''))
}

export function describeR76ZhuqueStack(): {
  version: string
  baseline: typeof R76_ZHUQUE_STACK_BASELINE
  humanize_version: string
  risk_segment_version: string
  defaults: {
    humanize_mode: string
    pass_b: boolean
    full_pass_a: boolean
    aggressive_opening_process: boolean
    light_opening: boolean
  }
  layers: string[]
} {
  return {
    version: R76_ZHUQUE_STACK_VERSION,
    baseline: R76_ZHUQUE_STACK_BASELINE,
    humanize_version: HUMANIZE_POSTPROCESS_VERSION,
    risk_segment_version: HUMANIZE_RISK_SEGMENT_VERSION,
    defaults: {
      humanize_mode: 'risk_segment',
      pass_b: false,
      full_pass_a: false,
      aggressive_opening_process: false,
      light_opening: true,
    },
    layers: [
      'draft: buildR76PromptDirectives / buildHumanWebnovelResistancePromptDirectives',
      'humanize: risk_segment + human_positive (R73b recipe)',
      'sanitize: missing private noise / mid social mess / zhuque green texture',
      'sanitize: exam pipeline interrupt (R75)',
      'sanitize: opening vital report cascade (R76)',
      'sanitize: opening light touch ≤300 chars (R78; not R77 heavy)',
      'store: resistance hard admission',
    ],
  }
}
