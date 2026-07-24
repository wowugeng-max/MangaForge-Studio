/**
 * Model-family-aware writing strategies.
 * GPT / Grok / Kimi / Gemini get different generation tactics so precision
 * constraints match each family's strengths (measured especially on Gemini Flash).
 */
import { readModelsSync } from '../model-store'
import type { ChapterWordTarget } from './word-target'
import { proseMaxTokensForWordTarget } from './word-target'
import { buildR76PromptDirectives } from './r76-zhuque-stack'

export type ModelFamily = 'gpt' | 'grok' | 'kimi' | 'gemini' | 'claude' | 'default'

export type ModelWriteMode = 'full_chapter' | 'scene_chunk_stitch'

export type ModelRuntimeIdentity = {
  model_id?: number | string | null
  model_name?: string | null
  provider_id?: string | null
  display_name?: string | null
  api_format?: string | null
}

export type ModelFamilyStrategy = {
  version: 'model_family_strategy_v1'
  family: ModelFamily
  label: string
  write_mode: ModelWriteMode
  temperature: number
  max_tokens_multiplier: number
  prefer_scene_budgets: boolean
  avoid_full_chapter_rewrite: boolean
  is_flash_tier: boolean
  prompt_directives: string[]
  scene_card_directives: string[]
  pov_intensity: 'strict' | 'standard' | 'relaxed'
  pov_directives: string[]
  notes: string
  runtime: ModelRuntimeIdentity
}

function compact(value: any) {
  return String(value || '').trim()
}

function haystackOf(identity: ModelRuntimeIdentity = {}) {
  return [
    identity.model_name,
    identity.display_name,
    identity.provider_id,
    identity.api_format,
  ].map(compact).join(' ').toLowerCase()
}

export function resolveModelFamily(input: ModelRuntimeIdentity | string | null | undefined = {}): ModelFamily {
  const identity: ModelRuntimeIdentity = typeof input === 'string'
    ? { model_name: input }
    : (input || {})
  const text = haystackOf(identity)
  if (!text) return 'default'

  if (
    /gemini|google|gemma|generativelanguage/.test(text)
    || String(identity.api_format || '').toLowerCase() === 'gemini_native'
  ) {
    return 'gemini'
  }
  if (/kimi|moonshot|\bk1\b/.test(text)) return 'kimi'
  if (/grok|\bxai\b/.test(text)) return 'grok'
  if (/gpt|openai|chatgpt|codex|\bo[1-4]\b|\bo[1-4]-/.test(text)) return 'gpt'
  if (
    /claude|anthropic|sonnet|opus|haiku|cliproxy/.test(text)
    || ['claude_code', 'anthropic', 'anthropic_messages'].includes(String(identity.api_format || '').toLowerCase())
  ) {
    return 'claude'
  }
  return 'default'
}

export function isFlashTierModel(identity: ModelRuntimeIdentity | string | null | undefined = {}) {
  const text = typeof identity === 'string'
    ? identity.toLowerCase()
    : haystackOf(identity || {})
  return /flash|lite|mini|haiku|nano|instant|fast/.test(text)
}

export function resolveModelRuntimeIdentity(input: {
  activeWorkspace?: string
  modelId?: string | number | null
  modelName?: string | null
  providerId?: string | null
  displayName?: string | null
  apiFormat?: string | null
  fallback?: any
} = {}): ModelRuntimeIdentity {
  const fallback = input.fallback && typeof input.fallback === 'object' ? input.fallback : {}
  const modelId = Number(input.modelId ?? fallback.model_id ?? fallback.modelId ?? 0) || 0
  let fromStore: any = null
  if (input.activeWorkspace && modelId) {
    try {
      fromStore = readModelsSync(input.activeWorkspace).find(item => Number(item.id) === modelId) || null
    } catch {
      fromStore = null
    }
  }
  return {
    model_id: modelId || fallback.model_id || fallback.modelId || null,
    model_name: compact(
      input.modelName
      || fromStore?.model_name
      || fallback.model_name
      || fallback.modelName
      || fallback.name,
    ),
    provider_id: compact(
      input.providerId
      || fromStore?.provider
      || fallback.provider_id
      || fallback.providerId
      || fallback.provider,
    ),
    display_name: compact(
      input.displayName
      || fromStore?.display_name
      || fallback.display_name
      || fallback.displayName,
    ),
    api_format: compact(
      input.apiFormat
      || fromStore?.api_format
      || fallback.api_format
      || fallback.apiFormat,
    ),
  }
}

function geminiStrategy(identity: ModelRuntimeIdentity, flash: boolean): Omit<ModelFamilyStrategy, 'version' | 'runtime'> {
  return {
    family: 'gemini',
    label: flash ? 'Gemini Flash' : 'Gemini',
    write_mode: 'scene_chunk_stitch',
    temperature: flash ? 0.72 : 0.75,
    max_tokens_multiplier: flash ? 2.0 : 1.35,
    prefer_scene_budgets: true,
    avoid_full_chapter_rewrite: true,
    is_flash_tier: flash,
    prompt_directives: [
      '【模型策略 · Gemini】当前模型推理 token 常挤占输出额度，优先“分场景写满再拼接”，不要一次赌整章长文。',
      '每个场景独立达到 scene word_budget 下限后再进入下一场景；场景内自检只做 1 句（字数/一句一段底色+少量双句密段/是否越界），不要长篇自检。',
      '禁止把“整章压缩/整章重写”当作主路径；偏短时只在当前未满场景补动作回合（出手/反制/代价/新信息）。',
      flash
        ? 'Flash 特别约束：推理会挤占输出额度。优先保证完整可入库正文；输出前估算总字数，硬上限不超过章目标 max；偏长先删环境水文，不要写到一半被截断。'
        : 'Pro/长上下文时仍按场景预算分配，避免中段平均用力、尾段赶工。',
      '去 AI 味时优先删否定排比和总结句，不要为了“更文学”加仿佛/缓缓/眼中闪过。',
    ],
    scene_card_directives: [
      'Gemini：每个 scene_card 必须写可执行 word_budget 与 dense/medium/sparse；dense 场景写清 2-3 个动作回合锚点。',
      '禁止把后续章结算塞进本章 scene；forbidden_future_settle 要可检查。',
    ],
    pov_intensity: 'strict' as const,
    pov_directives: [
      '【角色视角 · Gemini】严格深有限：每个场景先确认 pov_lens，再写动作；禁止全知补叙。',
      'Flash：scene-chunk 稳字数；缺信息写误判/求证，不要解释腔补信息差。',
      // Universal detector resistance (all chapters) — contract-driven, not chapter-tuned.
      ...buildR76PromptDirectives(),
      'dense 场景必须有 decision_in_scene；章末禁止倒计时/更大风暴作者总结。',

    ],
    notes: flash
      ? 'Flash 实测：scene-chunk 比 one-shot 更稳地落在 3780-4620。'
      : 'Gemini 通用：场景预算优先，避免整章压缩。',
  }
}

function gptStrategy(identity: ModelRuntimeIdentity, flash: boolean): Omit<ModelFamilyStrategy, 'version' | 'runtime'> {
  return {
    family: 'gpt',
    label: flash ? 'GPT Fast' : 'GPT',
    write_mode: 'full_chapter',
    temperature: 0.75,
    max_tokens_multiplier: flash ? 1.15 : 1.0,
    prefer_scene_budgets: true,
    avoid_full_chapter_rewrite: false,
    is_flash_tier: flash,
    prompt_directives: [
      '【模型策略 · GPT】允许整章一次写完，但内部必须按场景预算推进；写完自检字数落点与进度窗口。',
      '单次输出优先一次打准 3780-4620；偏短补 dense 交锋，偏长先删超纲结算与同义反复。',
      '指令遵循优先：严格执行 must_advance / forbidden_future_settle / 一句一段 / 去 AI 禁词，不要自行改写任务目标。',
      '对白保持口语短句；说明性旁白能删就删。',
    ],
    scene_card_directives: [
      'GPT：场景卡字段写全即可，word_budget 作为整章内部检查点，不必强行拆多次生成。',
    ],
    pov_intensity: 'standard' as const,
    pov_directives: [
      '【角色视角 · GPT】整章可一次写完，但每场仍锁主视角；信息只从角色感知进入。',
      '解释腔、全知泄漏按硬约束处理；情绪必须推动选择，不只贴标签。',
    ],
    notes: 'GPT 适合强约束单次成章。',
  }
}

function grokStrategy(identity: ModelRuntimeIdentity, flash: boolean): Omit<ModelFamilyStrategy, 'version' | 'runtime'> {
  return {
    family: 'grok',
    label: 'Grok',
    write_mode: 'full_chapter',
    temperature: 0.68,
    max_tokens_multiplier: 1.05,
    prefer_scene_budgets: true,
    avoid_full_chapter_rewrite: false,
    is_flash_tier: flash,
    prompt_directives: [
      '【模型策略 · Grok】允许整章输出，但必须压住发散与口水；每个段落都要服务当前交付点。',
      '禁止跑题铺陈、重复升华、作者吐槽、无必要英文夹杂；幽默只能来自角色当场反应，不能旁白段子。',
      '字数容易偏长：先删环境水文和同义反复，再删解释性总结；不得删 must_advance 交付动作。',
      '去 AI 味与去“智能腔”并重：少用排比 spot、少用万能比喻，多写具体物件与代价。',
    ],
    scene_card_directives: [
      'Grok：场景卡写清边界（must_deliver / forbidden），防止正文自由发挥越界。',
    ],
    pov_intensity: 'strict' as const,
    pov_directives: [
      '【角色视角 · Grok】严防作者吐槽与全知跑题；禁止旁白段子、意义升华。',
      '视角切换默认禁止；只有 allowed_secondary_povs 明确授权才可短切。',
      '删解释腔优先于加文学修辞。',
    ],
    notes: 'Grok 重点防啰嗦与跑题。',
  }
}

function kimiStrategy(identity: ModelRuntimeIdentity, flash: boolean): Omit<ModelFamilyStrategy, 'version' | 'runtime'> {
  return {
    family: 'kimi',
    label: 'Kimi',
    write_mode: 'full_chapter',
    temperature: 0.74,
    max_tokens_multiplier: 1.1,
    prefer_scene_budgets: true,
    avoid_full_chapter_rewrite: false,
    is_flash_tier: flash,
    prompt_directives: [
      '【模型策略 · Kimi】长上下文可用，但仍按场景/情节点预算写，禁止均匀注水撑长文。',
      '中文网文格式硬约束：一句一段、对话独立成段、禁用 …… 与 ——。',
      '可利用上文衔接优势：前 300 字必须接住上一章尾段动作链，但不得复述旧章结算。',
      '字数落点优先稳在目标带；dense 场景写满动作回合，sparse 场景 1-2 句带过。',
    ],
    scene_card_directives: [
      'Kimi：场景卡保留 handoff 与 state_change，便于长上下文承接，同时写 word_budget 防注水。',
    ],
    pov_intensity: 'standard' as const,
    pov_directives: [
      '【角色视角 · Kimi】长上下文要接住角色认知账本：knows_now/misbeliefs/open_questions 不得失忆。',
      '前 300 字承接上一章尾段动作，但不得全知复述角色尚未确认的信息。',
      '一句一段下仍锁深有限视角；禁止作者总结式章末。',
    ],
    notes: 'Kimi 强调中文网文分行 + 预算控水。',
  }
}


function claudeStrategy(identity: ModelRuntimeIdentity, flash: boolean): Omit<ModelFamilyStrategy, 'version' | 'runtime'> {
  return {
    family: 'claude',
    label: flash ? 'Claude Fast' : 'Claude Sonnet/Opus',
    // cliproxy/Claude long non-stream full chapters often hit CDN 524; stitch scenes instead.
    write_mode: 'scene_chunk_stitch',
    temperature: flash ? 0.85 : 0.8,
    max_tokens_multiplier: 1.15,
    prefer_scene_budgets: true,
    avoid_full_chapter_rewrite: true,
    is_flash_tier: flash,
    prompt_directives: [
      '【Claude 族策略】优先按场景预算写满再拼接；chapter_text 必须落在章字数硬范围，禁止只写开场 vignette 就收束。',
      '输出重心放 chapter_text：scene_breakdown / continuity_notes / receipts 只写极简骨架，禁止把 token 花在元数据。',
      '保持人物在场与口语毛边；禁止说明书式复盘与电梯 lore。',
      '句骨故意不匀：残句/短对白/双句密段混用；禁止连续整齐中句。',
      '章末停在未完成动作或半截对白，禁止小牌纸条编号全揭与合规讲义。',
      '少解释生理/流程，多当面推责与半拍耽误。',
      '中段硬交付私心噪声+当面摩擦（嫌/烦/先不/改口/背锅挂在动作上），避免冷静流水线检查。',
    ],
    scene_card_directives: [
      '场景卡只写可见动作与对白职责，不写设定讲义。',
    ],
    pov_intensity: 'strict',
    pov_directives: [
      '严格限知：只写主角此刻摸到/听到/误判的，不代读者宣判规则。',
    ],
    notes: 'Claude 长文声口稳，防包装复读；禁用全文大砍 Pass A。',
  }
}

function defaultStrategy(flash: boolean): Omit<ModelFamilyStrategy, 'version' | 'runtime'> {
  return {
    family: 'default',
    label: 'Default',
    write_mode: 'full_chapter',
    temperature: 0.75,
    max_tokens_multiplier: flash ? 1.2 : 1.05,
    prefer_scene_budgets: true,
    avoid_full_chapter_rewrite: false,
    is_flash_tier: flash,
    prompt_directives: [
      '【模型策略 · 通用】按场景预算推进，落点 3780-4620；一句一段；去 AI 套话。',
      '偏短补动作回合，偏长删超纲与重复；章末只抛钩子不结算后续章。',
    ],
    scene_card_directives: [
      '通用：每个场景写 word_budget 与 density_level。',
    ],
    pov_intensity: 'standard' as const,
    pov_directives: [
      '【角色视角】默认深有限第三人称：锁主视角，禁作者解释与全知泄漏。',
    ],
    notes: '未识别模型家族时的稳健默认策略。',
  }
}

export function buildModelFamilyStrategy(
  input: ModelRuntimeIdentity | string | null | undefined = {},
): ModelFamilyStrategy {
  const runtime = typeof input === 'string'
    ? { model_name: input }
    : resolveModelRuntimeIdentity({
      modelId: input?.model_id,
      modelName: input?.model_name,
      providerId: input?.provider_id,
      displayName: input?.display_name,
      apiFormat: input?.api_format,
      fallback: input || {},
    })
  const family = resolveModelFamily(runtime)
  const flash = isFlashTierModel(runtime)
  const base = family === 'gemini'
    ? geminiStrategy(runtime, flash)
    : family === 'gpt'
      ? gptStrategy(runtime, flash)
      : family === 'grok'
        ? grokStrategy(runtime, flash)
        : family === 'kimi'
          ? kimiStrategy(runtime, flash)
          : family === 'claude'
            ? claudeStrategy(runtime, flash)
            : defaultStrategy(flash)
  return {
    version: 'model_family_strategy_v1',
    ...base,
    runtime,
  }
}

export function formatModelFamilyStrategyPrompt(strategy: ModelFamilyStrategy | null | undefined) {
  if (!strategy) return [] as string[]
  const modeLine = strategy.write_mode === 'scene_chunk_stitch'
    ? '推荐执行模式：分场景写满再拼接（scene_chunk_stitch）。'
    : '推荐执行模式：整章一次写准（full_chapter），内部仍按场景预算检查。'
  // R76 Zhuque stack (prompt directives + resistance) is system-wide default for all models/chapters.
  // Gemini also inlines it in pov_directives; dedupe below.
  const universal = buildR76PromptDirectives()
  const familyLines = [
    ...strategy.prompt_directives,
    strategy.pov_intensity ? `角色视角强度：${strategy.pov_intensity}` : '',
    ...(strategy.pov_directives || []),
  ]
  const seen = new Set<string>()
  const merged = [] as string[]
  for (const line of [...familyLines, ...universal, '全模型强制：文字情绪必须在场，且必须从本章剧情/角色处境推导；用动作对白身体细节交付，禁止空标签与跨题材万能情绪模板。']) {
    const key = String(line || '').trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(key)
  }
  return [
    `【模型家族策略 · ${strategy.label}】`,
    modeLine,
    ...merged,
  ].filter(Boolean)
}

export function formatModelFamilySceneCardPrompt(strategy: ModelFamilyStrategy | null | undefined) {
  if (!strategy) return [] as string[]
  return [
    `【模型家族 · 场景卡 · ${strategy.label}】`,
    ...strategy.scene_card_directives,
  ].filter(Boolean)
}

export function proseMaxTokensForModelFamily(
  wordTarget: ChapterWordTarget | null | undefined,
  strategy: ModelFamilyStrategy | null | undefined,
) {
  const base = proseMaxTokensForWordTarget(wordTarget)
  const multiplier = Number(strategy?.max_tokens_multiplier || 1)
  const scaled = Math.ceil(base * (Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1))
  // Gemini burns reasoning tokens, but standard-chapter floors must not invite 6k+ overshoot.
  const targetWords = Number(wordTarget?.target || 4200)
  const familyFloor = strategy?.family === 'gemini'
    ? (
      strategy?.is_flash_tier
        ? (targetWords >= 9000 ? 36_000 : targetWords >= 6000 ? 28_000 : 22_000)
        : (targetWords >= 9000 ? 32_000 : 24_000)
    )
    : 0
  // Also cap standard chapters so draft transport cannot balloon far past max*1.3.
  const standardCap = targetWords > 0 && targetWords <= 5000 ? 26_000 : 64_000
  return Math.min(standardCap, 64_000, Math.max(base, scaled, familyFloor))
}

export function attachModelFamilyToContextPackage(contextPackage: any, identity: ModelRuntimeIdentity | string | null | undefined) {
  const strategy = buildModelFamilyStrategy(identity)
  const base = contextPackage && typeof contextPackage === 'object' ? contextPackage : {}
  return {
    ...base,
    runtime_model: strategy.runtime,
    model_family_strategy: strategy,
  }
}

export function modelFamilyFromContextPackage(contextPackage: any): ModelFamilyStrategy {
  const existing = contextPackage?.model_family_strategy
  if (existing?.version === 'model_family_strategy_v1' && existing?.family) {
    return existing as ModelFamilyStrategy
  }
  return buildModelFamilyStrategy(
    contextPackage?.runtime_model
    || contextPackage?.model_runtime
    || {
      model_name: contextPackage?.model_name || contextPackage?.modelName,
      provider_id: contextPackage?.provider_id || contextPackage?.providerId || contextPackage?.provider,
      model_id: contextPackage?.model_id || contextPackage?.modelId,
    },
  )
}
