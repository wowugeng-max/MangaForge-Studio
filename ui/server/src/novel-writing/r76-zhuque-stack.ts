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

import { buildHumanWebnovelResistancePromptDirectives, sanitizeDetectorHostileStock, capHostileMicroBeatStampDensity } from './human-webnovel-resistance'
import { HUMANIZE_RISK_SEGMENT_VERSION } from './humanize-risk-segment'
import { HUMANIZE_POSTPROCESS_VERSION } from './humanize-postprocess'
import { applyCanonicalNameGuard, collectCanonCharacterNames } from './canonical-name-guard'
import { ensureDialoguePauseWindows, MIN_DIALOGUE_PAUSE_WINDOWS } from './dialogue-pause-window'

export const R76_ZHUQUE_STACK_VERSION = 'r76-stable-v1.12'
export const R76_ZHUQUE_STACK_BASELINE = {
  round: 'r76',
  human_pct: 72.59,
  suspected_pct: 27.41,
  pure_ai_pct: 0,
  alert: '人工创作特征显著',
  // v1.1: sparse humanize + canonical name guard
  // v1.2: draft green dialogue-pause windows + early process-smooth targeting (V5 7% human lesson)
  // v1.3: deterministic dual-zone dialogue-pause scan/ensure + separated humanize targets (V6 8.3% lesson)
  // v1.4: dual FUNCTION windows — early dialogue-friction + late incomplete-decision (V7 23% lesson)
  // v1.5: ambient boundary failed on Zhuque (~8%)
  // v1.6: mid-late NON-blame short dialogue wall for segment geometry
  // v1.7: mid monologue green density (ch1 R76 continuous human texture alignment)
  // v1.8: stronger investigation-monologue prompt + densify v2 on long drafts
  // v1.9: densify v3 clustered green islands (A/B: humanize skip 22.86%; densify-on-old 39.75%)
  // v1.10: densify v3.1-light defaults + zhuque_fast skip humanize (A/B)
  // v1.11: draft multi-island green geometry contract + hostile micro-beat stamp hard caps
  //        (v1.10 true-LLM rewrite regressed to 16.9%; densify stamps over-dense → AI? tail)
  // v1.12: empirical multi-island contract from 39.75% high-water; zhuque_fast skips densify
  //        (v1.11 A+B regressed to 10.19%; densify OFF for pure draft texture baseline)
  patch: 'v1.12-pure-draft-multi-island',
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
    // Sparse local rewrites only (ch2 lesson: 2×6 windows over-smoothed whole chapter to 100% suspected)
    risk_rewrite_rounds: 1,
    max_risk_windows: 3,
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
    '【V1.12·39.75实证·多绿岛几何】朱雀高分来自全章 3 个分离人工岛（约每 700–900 字一个），岛间允许短推进，禁止前 40% 连续流程叙事无绿岛。densify 戳章不能制造绿岛。',
    '【V1.12·绿岛两类轮换】A岛：当面短对白墙（独立成段 2–4 句，连跑≤4）+ 场景微细节 + 半截私心挂动作；B岛：可无对白——物件/空间未读清 + 未完成决策短段（走几步停/先记边上/先不翻），禁止“他停了一拍/他没吭声/字迹认不出”模板串。两类交替出现。',
    '【V1.12·段形目标】全章对白段占比约 17%–25%；段长故意不匀（短/中/长混排，均值约 20 字级）；优先物件/场景/对白起句，降低“他/姓名”流水起句。',
    '【V1.12·禁 stamp 模板化】下列短拍句全章各自最多 2 次：他停了一拍 / 他没吭声 / 鞋底声远了 / 字迹认不出 / 他看不清 / 东西放在旁边 / 墨水洇开；超限必须改成新场景细节或对白，禁止 densify 式重复抬人味。',
    '【R76·ch1对齐·中段绿段密度】人工高分来自中后段连续短段人味（微社交/短对白/物件未读清），不是章末单点戳章。中段禁止连续长独白推理盘。',
    '【中段调查禁独白盘·强化】禁止连续3段以上纯内心推理/地址核对/名单对照/走路观察无对白无微社交；每推进1个信息点，必须立刻接：当面短对白 / 安静微互动 / 物件未读清收手 之一。',
    '【调查章写法】可以查，但不能写成“他看A。他想B。他核对C。”信息流水；查单、对地址、看本子、进巷子，每一步都要被人或物件打断半拍。',
    '【禁系统戳章】私心挂动作即可，禁止反复粘贴“先不写系统/先别上报/钥匙硌手”同构短句盖章。',
    `【R76栈·锁定默认 ${R76_ZHUQUE_STACK_VERSION}】生成与修订必须遵守朱雀绿段合同；禁止为清流程而重写中后段人味区。`,
    // V5 Zhuque lesson (system-wide): human green often comes from short dialogue-pause windows,
    // not from whole-chapter polish expansion.
    '【V5绿段实证·系统固化】人工段更常来自「半拍停顿对白窗」：2–5句短对白独立成段 + 一句沉默/停顿/改口 + 一句轻物件触感。全章至少交付 2 个这样的窗（开篇后半与中段优先），不要指望事后整章润色出人味。',
    '【禁流程顺滑腔】禁止连续三段以上“他做A。他做B。他检查C。”无对白无摩擦流水；每段顺滑叙述后必须接：短对白停顿 / 当面摩擦 / 未完成动作 之一。',
    '【对白窗写法】电话/当面都可，但必须是短回合，不是说明文转述；允许“那头沉默两秒/他改口/话只说半句”；禁止长解释身份背景。',
    '【草稿硬交付】初稿中段前必须已出现至少一处半拍停顿对白窗；缺了再靠 humanize 局部补，禁止 humanize 全面重写。',
    '【V6绿段实证·双区硬交付】全章至少 2 个分离的人味窗；说明腔长对白不算窗；私心必须挂动作，禁止句末戳章。',
    '【V7/V1.6绿段实证·双功能+对白切开】两窗功能必须不同：① early/mid 当面成本摩擦对白窗；② late 未完成决策窗。若中段后长独白，中后段用「非推责」短对白墙切开段落几何（值班/对讲/业务打断，2–4句独立成段），禁止再贴第二套锅/责任戳章，也禁止只用环境声或长独白补第二窗。',
    '【系统补窗】缺哪种功能补哪种；禁止整章润色扩写。',
    ...buildHumanWebnovelResistancePromptDirectives(contract),
  ]
}

/** Final pre-store sanitize: R73b green + R75 exam interrupt + R76 vital strip + R78 light opening. */
export function applyR76PreStoreSanitize(
  text: string,
  options: {
    characters?: any[]
    contextPackage?: any
    project?: any
    extraNames?: any[]
    canonNames?: string[]
    skip_dialogue_pause_ensure?: boolean
    skipDialoguePauseEnsure?: boolean
    skip_mid_monologue_densify?: boolean
    skipMidMonologueDensify?: boolean
  } = {},
): string {
  let out = sanitizeDetectorHostileStock(String(text || ''), {
    skip_mid_monologue_densify: options.skip_mid_monologue_densify,
    skipMidMonologueDensify: options.skipMidMonologueDensify,
  })
  const canon = Array.isArray(options.canonNames) && options.canonNames.length
    ? options.canonNames
    : collectCanonCharacterNames(options)
  if (canon.length) {
    out = applyCanonicalNameGuard(out, { ...options, extraNames: [...(options.extraNames || []), ...canon] }).text
  }
  // v1.3 safety net: dual-zone dialogue-pause windows if draft/humanize still missing them.
  if (!(options.skip_dialogue_pause_ensure || options.skipDialoguePauseEnsure)) {
    out = ensureDialoguePauseWindows(out, { minWindows: MIN_DIALOGUE_PAUSE_WINDOWS }).text
  }
  // v1.11: hard-cap hostile micro-beat stamps after densify/ensure so red-tail template density cannot survive.
  out = capHostileMicroBeatStampDensity(out)
  return out
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
      'sanitize: sparse humanize (≤1 round × 3 windows; anti over-smooth)',
'draft: V5 green dialogue-pause windows + anti process-smooth chain',
      'ensure: dual-function green windows (friction early + incomplete late, v1.4)',
      'humanize: separated early-mid + late-mid risk windows',
      'sanitize: canonical near-miss name guard (林序/林晓 class slips)',
      'draft: V1.12 empirical multi-island geometry from 39.75% high-water (prompt)',
      'sanitize: hostile micro-beat stamp hard caps (V1.11+)',
      'zhuque_fast: skip mid-monologue densify (pure draft texture baseline)',
      'store: resistance hard admission',
    ],
  }
}
