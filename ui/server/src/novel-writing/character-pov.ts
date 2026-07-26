import { formatFingerprintContractPrompt, type FingerprintContract } from './prose-fingerprint-lib'
import { buildHumanWebnovelResistancePromptDirectives } from './human-webnovel-resistance'
import { resolveFingerprintContract } from './fingerprint-contract-resolver'
/**
 * Character POV (角色视角) — system-level limited viewpoint contract.
 * Compiles chapter/scene POV lenses, injects write constraints, and scans for
 * authorial omniscience / explain-cavity / no-decision dense scenes.
 *
 * P1: knowledge ledger, multi-POV gate, model-family intensity, UI snapshot.
 * P2: authorized short secondary cuts, dialogue POV filter, asset/rule coupling.
 */

import { asArray } from '../routes/novel-route-utils'

function compactText(value: any, limit = 180) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function uniqueTexts(values: any[], limit = 12) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of values) {
    const text = compactText(raw, 160)
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
    if (out.length >= limit) break
  }
  return out
}

function chapterTargetOf(contextPackage: any = {}) {
  return contextPackage?.chapter_target
    || contextPackage?.chapterTarget
    || contextPackage?.chapter
    || {}
}

function sceneCardsOf(contextPackage: any = {}) {
  const target = chapterTargetOf(contextPackage)
  return asArray(
    contextPackage?.scene_cards
    || contextPackage?.sceneCards
    || target?.scene_cards
    || target?.sceneCards,
  )
}

function characterNamePool(contextPackage: any = {}) {
  const target = chapterTargetOf(contextPackage)
  const characters = asArray(
    contextPackage?.characters
    || contextPackage?.character_cards
    || contextPackage?.characterCards
    || target?.characters,
  )
  const names = characters
    .map((item: any) => compactText(item?.name || item, 24))
    .filter(Boolean)
  const castFromScenes = sceneCardsOf(contextPackage).flatMap((card: any) => (
    asArray(card?.characters_present || card?.charactersPresent || card?.characters || card?.cast)
      .map((item: any) => compactText(typeof item === 'string' ? item : item?.name, 24))
  ))
  return uniqueTexts([...names, ...castFromScenes], 24)
}

export type AuthorizedSecondaryPovCut = {
  character: string
  max_lines: number
  purpose: string
  return_to_primary: string
  scene_no?: number
}

export type CharacterPovLens = {
  scene_no: number
  pov_character: string
  knows_now: string[]
  suspects_now: string[]
  does_not_know: string[]
  want_now: string
  fear_or_cost_now: string
  private_bias: string
  allowed_senses: string[]
  decision_in_scene: string
  emotion_from_pov: string
  emotion_tell: string
  density: string
  tell_ban: string[]
  /** P2: optional short secondary POV cut inside this scene (not full scene takeover). */
  secondary_cut: AuthorizedSecondaryPovCut | null
  /** P2: dialogue may only carry what the primary POV can hear/infer. */
  dialogue_filter: {
    hearable_only: boolean
    forbidden_mind_reads: string[]
    voice_anchors: string[]
  }
  /** P2: asset/rule facts bound into this lens. */
  asset_bound_knows: string[]
  asset_bound_unknown: string[]
}

export type PovKnowledgeLedger = {
  character: string
  known: string[]
  misbeliefs: string[]
  open_questions: string[]
  last_chapter?: number
}

export type ChapterPovPlan = {
  version: 'character_pov_plan_v1'
  primary_pov: string
  pov_mode: 'deep_limited' | 'close_third'
  allowed_secondary_povs: string[]
  knowledge_firewall: string[]
  voice_profile: string
  scene_lenses: CharacterPovLens[]
  /** P1 */
  pov_intensity: 'strict' | 'standard' | 'relaxed'
  knowledge_ledger: PovKnowledgeLedger[]
  multi_pov_policy: {
    default_locked: boolean
    require_explicit_authorization: boolean
    max_secondary_scenes: number
  }
  family_pov_directives: string[]
  /** P2 */
  secondary_cut_policy: {
    allowed: AuthorizedSecondaryPovCut[]
    max_total_lines: number
    require_return_to_primary: boolean
    short_cut_only: boolean
  }
  dialogue_pov_filter: {
    primary_listener: string
    rules: string[]
    voice_profiles: Array<{ character: string; voice: string }>
  }
  asset_pov_bindings: {
    knowable_assets: string[]
    forbidden_assets: string[]
    unrevealed_rules: string[]
    firewall_extra: string[]
  }
}

function densityOf(card: any, index: number, total: number) {
  const raw = compactText(card?.density || card?.density_level || card?.densityLevel, 24).toLowerCase()
  if (raw.includes('dense') || raw.includes('密')) return 'dense'
  if (raw.includes('sparse') || raw.includes('疏')) return 'sparse'
  if (raw.includes('medium') || raw.includes('中')) return 'medium'
  if (total <= 1) return 'dense'
  if (index === 0) return 'medium'
  if (index === total - 1) return 'medium'
  return 'dense'
}

function pickPovCharacter(card: any, primary: string, names: string[]) {
  const explicit = compactText(
    card?.pov_lens?.pov_character
    || card?.povLens?.pov_character
    || card?.pov_character
    || card?.povCharacter
    || card?.viewpoint_character
    || card?.viewpointCharacter,
    24,
  )
  if (explicit) return explicit
  const present = asArray(card?.characters_present || card?.charactersPresent || card?.characters)
    .map((item: any) => compactText(typeof item === 'string' ? item : item?.name, 24))
    .filter(Boolean)
  if (primary && present.includes(primary)) return primary
  if (present[0]) return present[0]
  if (primary) return primary
  return names[0] || '主角'
}

function settingContextOf(contextPackage: any = {}) {
  return contextPackage?.setting_context || contextPackage?.settingContext || {}
}

/** P2: bind knowable vs forbidden assets/rules into POV firewall. */
export function compileAssetPovBindings(contextPackage: any = {}, primary = '') {
  const setting = settingContextOf(contextPackage)
  const usage = asArray(setting.chapter_usage || setting.chapterUsage)
  const entities = asArray(setting.entities)
  const target = chapterTargetOf(contextPackage)
  const sceneCards = sceneCardsOf(contextPackage)

  const knowable = uniqueTexts([
    ...usage
      .filter((item: any) => {
        const role = compactText(item?.usage_role || item?.role || item?.status, 24).toLowerCase()
        return /required|must|本章|必须|allowed|可用/.test(role) || item?.required === true
      })
      .map((item: any) => compactText(item?.name || item?.setting_name || item?.entity_name || item?.title, 40)),
    ...entities
      .filter((item: any) => {
        const state = item?.state_json || item?.stateJson || {}
        const revealed = state?.revealed_to || state?.revealedTo || state?.known_by || []
        if (Array.isArray(revealed) && primary && revealed.some((n: any) => compactText(n, 24) === primary)) return true
        return false
      })
      .map((item: any) => compactText(item?.name, 40)),
    ...sceneCards.flatMap((card: any) => asArray(card?.used_settings || card?.usedSettings || card?.revealed_settings || card?.revealedSettings)),
  ], 12)

  const forbidden = uniqueTexts([
    ...usage
      .filter((item: any) => {
        const role = compactText(item?.usage_role || item?.role || item?.status, 24).toLowerCase()
        return /forbid|禁止|不可|hidden|未揭|未公开/.test(role) || item?.forbidden === true
      })
      .map((item: any) => compactText(item?.name || item?.setting_name || item?.entity_name || item?.title, 40)),
    ...sceneCards.flatMap((card: any) => asArray(card?.forbidden_settings || card?.forbiddenSettings)),
    ...asArray(target?.forbidden_settings || target?.forbiddenSettings),
    ...entities
      .filter((item: any) => {
        const constraints = item?.constraints_json || item?.constraintsJson || {}
        const state = item?.state_json || item?.stateJson || {}
        if (constraints?.hidden_from_pov || constraints?.hiddenFromPov) return true
        if (state?.revealed === false || state?.public === false) return true
        return false
      })
      .map((item: any) => compactText(item?.name, 40)),
  ], 12)

  const unrevealed_rules = uniqueTexts([
    ...entities
      .filter((item: any) => {
        const type = compactText(item?.entity_type || item?.entityType || item?.type, 24).toLowerCase()
        return /rule|规则|怪谈|法则|契约/.test(type)
      })
      .filter((item: any) => !knowable.includes(compactText(item?.name, 40)))
      .map((item: any) => compactText(item?.name || item?.summary, 60)),
    ...asArray(target?.hidden_rules || target?.hiddenRules || target?.unrevealed_rules),
  ], 8)

  // Remove overlap: if both knowable and forbidden, prefer forbidden (safer).
  const knowableSafe = knowable.filter((name) => !forbidden.includes(name))
  const firewall_extra = uniqueTexts([
    ...forbidden.map((name) => `禁止把「${name}」写成 ${primary || '主视角'} 已确认事实`),
    ...unrevealed_rules.slice(0, 4).map((name) => `未揭规则「${name}」只能以误判/残缺感知出现，不得全知讲解`),
    '资产边界：角色只能动用/知道已揭示且不在 forbidden 列表的设定',
  ], 10)

  return {
    knowable_assets: knowableSafe,
    forbidden_assets: forbidden,
    unrevealed_rules,
    firewall_extra,
  }
}

function compileSecondaryCutFromCard(card: any, sceneNo: number, primary: string): AuthorizedSecondaryPovCut | null {
  const existing = card?.pov_lens || card?.povLens || {}
  const raw = existing.secondary_cut || existing.secondaryCut || card?.secondary_cut || card?.secondaryCut || card?.authorized_short_pov || card?.authorizedShortPov || null
  if (raw && typeof raw === 'object') {
    const character = compactText(raw.character || raw.pov_character || raw.povCharacter || raw.name, 24)
    if (!character || character === primary) return null
    return {
      character,
      max_lines: Math.max(1, Math.min(8, Number(raw.max_lines || raw.maxLines || raw.lines || 3) || 3)),
      purpose: compactText(raw.purpose || raw.reason || '制造信息差/威胁感', 80) || '制造信息差/威胁感',
      return_to_primary: compactText(raw.return_to_primary || raw.returnToPrimary || `立刻回到${primary}可感知证据`, 80) || `立刻回到${primary}可感知证据`,
      scene_no: sceneNo,
    }
  }
  // Explicit short-cut name field only (not full scene POV takeover).
  const shortName = compactText(
    existing.short_secondary_pov
    || existing.shortSecondaryPov
    || card?.short_secondary_pov
    || card?.shortSecondaryPov
    || card?.secondary_pov_cut
    || card?.secondaryPovCut,
    24,
  )
  if (shortName && shortName !== primary) {
    return {
      character: shortName,
      max_lines: 3,
      purpose: compactText(card?.secondary_cut_purpose || card?.secondaryCutPurpose || '短切制造信息差', 80) || '短切制造信息差',
      return_to_primary: `立刻回到${primary}可感知证据`,
      scene_no: sceneNo,
    }
  }
  return null
}

function compileDialogueFilterForScene(card: any, primary: string, names: string[], assetBindings: ReturnType<typeof compileAssetPovBindings>) {
  const existing = card?.pov_lens || card?.povLens || {}
  const present = asArray(card?.characters_present || card?.charactersPresent || card?.characters)
    .map((item: any) => compactText(typeof item === 'string' ? item : item?.name, 24))
    .filter(Boolean)
  const others = uniqueTexts([...present, ...names].filter((name) => name && name !== primary), 8)
  const voiceAnchors = uniqueTexts([
    ...asArray(card?.dialogue_goals || card?.dialogueGoals),
    card?.character_voice || card?.characterVoice,
    existing.dialogue_filter?.voice_anchors,
    ...asArray(existing.dialogue_filter?.voiceAnchors),
  ].flat(), 6)
  return {
    hearable_only: true,
    forbidden_mind_reads: uniqueTexts([
      ...others.map((name) => `${name}的完整内心/真实动机`),
      ...asArray(existing.dialogue_filter?.forbidden_mind_reads || existing.dialogue_filter?.forbiddenMindReads),
      ...assetBindings.forbidden_assets.slice(0, 3).map((name) => `借对白讲解「${name}」完整规则`),
    ], 8),
    voice_anchors: voiceAnchors,
  }
}

function compileDialoguePovFilter(contextPackage: any, primary: string, sceneLenses: CharacterPovLens[]) {
  const target = chapterTargetOf(contextPackage)
  const dialogueContract = target?.dialogue_contract || target?.dialogueContract || contextPackage?.dialogue_contract || {}
  const characters = asArray(contextPackage?.characters || contextPackage?.character_cards)
  const voice_profiles = characters.slice(0, 8).map((item: any) => ({
    character: compactText(item?.name, 24),
    voice: compactText(
      item?.voice
      || item?.character_voice
      || item?.characterVoice
      || item?.speech_style
      || item?.speechStyle
      || item?.motivation
      || item?.role_type
      || item?.role,
      80,
    ),
  })).filter((item: any) => item.character)

  const sceneVoice = uniqueTexts(sceneLenses.flatMap((lens) => asArray(lens.dialogue_filter?.voice_anchors)), 6)
  const rules = uniqueTexts([
    `对白过滤器：默认以 ${primary} 的听觉/观察接收，不写 ${primary} 听不到的旁白真相`,
    '禁止“X说完，其实X心里想…”这类对白后全知内心',
    '禁止用配角对白完整讲解未揭规则/世界观说明书',
    '配角对白只能暴露其会说出口的信息、态度和利害，不能替作者泄底',
    dialogueContract?.rule || dialogueContract?.principle || '',
    ...asArray(dialogueContract?.rules || dialogueContract?.constraints),
    ...sceneVoice.map((item) => `声线锚点：${item}`),
  ], 10)

  return {
    primary_listener: primary,
    rules,
    voice_profiles,
  }
}

function resolveExplicitSecondaryNames(contextPackage: any, primary: string, sceneLenses: CharacterPovLens[]) {
  const target = chapterTargetOf(contextPackage)
  const explicit = uniqueTexts([
    ...asArray(target?.allowed_secondary_povs || target?.allowedSecondaryPovs),
    ...asArray(contextPackage?.allowed_secondary_povs || contextPackage?.allowedSecondaryPovs),
    ...sceneLenses.map((lens) => lens.secondary_cut?.character).filter(Boolean) as string[],
  ], 6).filter((name) => name && name !== primary)

  // Full-scene secondary POV is only accepted when explicitly flagged on the card.
  const fullSceneSecondary = sceneCardsOf(contextPackage)
    .filter((card: any) => {
      const flag = card?.secondary_authorized || card?.secondaryAuthorized || card?.pov_lens?.secondary_authorized || card?.pov_lens?.secondaryAuthorized
      const mode = compactText(card?.pov_mode || card?.povMode || card?.pov_lens?.pov_mode || card?.pov_lens?.povMode, 24).toLowerCase()
      return flag === true || mode.includes('secondary') || mode.includes('次')
    })
    .map((card: any) => compactText(
      card?.pov_lens?.pov_character || card?.pov_character || card?.povCharacter,
      24,
    ))
    .filter((name: string) => name && name !== primary)

  return uniqueTexts([...explicit, ...fullSceneSecondary], 6)
}

function compilePovLens(card: any, index: number, total: number, primary: string, names: string[], contextPackage: any): CharacterPovLens {
  const existing = card?.pov_lens || card?.povLens || {}
  const target = chapterTargetOf(contextPackage)
  const density = densityOf(card, index, total)
  const povCharacter = pickPovCharacter(card, primary, names)
  const conflict = compactText(card?.conflict || card?.obstacle || target?.conflict, 100)
  const goal = compactText(card?.goal || card?.scene_goal || card?.purpose || target?.goal || target?.chapter_goal, 100)
  const decision = compactText(
    existing.decision_in_scene
    || existing.decisionInScene
    || card?.decision_in_scene
    || card?.protagonist_agency_action
    || card?.protagonistAgencyAction
    || card?.agency_action
    || '',
    120,
  ) || compactText(`在${conflict || '当前压力'}下做出一次可见选择`, 120)

  const want = compactText(
    existing.want_now || existing.wantNow || card?.blocked_desire || card?.blockedDesire || goal,
    100,
  ) || '先把眼前危机处理到自己可控'
  const fear = compactText(
    existing.fear_or_cost_now || existing.fearOrCostNow || card?.no_exit_reason || card?.noExitReason || conflict,
    100,
  ) || '怕判断错误导致更大代价落到自己头上'
  const bias = compactText(
    existing.private_bias || existing.privateBias || card?.character_voice || card?.characterVoice || '',
    100,
  ) || '先自保、再求证，不愿当众承认失控'

  const emotion = compactText(
    existing.emotion_from_pov
    || existing.emotionFromPov
    || card?.emotion_in_situation
    || card?.emotionInSituation
    || card?.emotional_tone
    || card?.emotionalTone,
    100,
  ) || compactText(`因“${want}”与“${fear}”拉扯而产生的当场情绪`, 100)

  const emotionTell = compactText(
    existing.emotion_tell || existing.emotionTell || card?.emotion_tell || card?.emotionTell,
    120,
  ) || '用动作停顿、改口、身体反应或半截对白交付，不要贴情绪标签'

  const sceneNo = Number(card?.scene_no || card?.sceneNo || index + 1) || (index + 1)
  const assetBindings = compileAssetPovBindings(contextPackage, primary)
  const secondary_cut = compileSecondaryCutFromCard(card, sceneNo, primary)
  const dialogue_filter = compileDialogueFilterForScene(card, primary, names, assetBindings)
  const asset_bound_knows = uniqueTexts([
    ...asArray(existing.asset_bound_knows || existing.assetBoundKnows),
    ...assetBindings.knowable_assets.slice(0, 4),
    ...asArray(card?.used_settings || card?.usedSettings).slice(0, 3),
  ], 6)
  const asset_bound_unknown = uniqueTexts([
    ...asArray(existing.asset_bound_unknown || existing.assetBoundUnknown),
    ...assetBindings.forbidden_assets.slice(0, 4),
    ...assetBindings.unrevealed_rules.slice(0, 3),
    ...asArray(card?.forbidden_settings || card?.forbiddenSettings).slice(0, 3),
  ], 6)

  // Full-scene secondary only when explicitly authorized; otherwise force primary lens.
  const secondaryAuthorized = Boolean(
    card?.secondary_authorized
    || card?.secondaryAuthorized
    || existing.secondary_authorized
    || existing.secondaryAuthorized
    || compactText(card?.pov_mode || existing.pov_mode || '', 24).toLowerCase().includes('secondary'),
  )
  const effectivePov = (povCharacter !== primary && !secondaryAuthorized && !secondary_cut)
    ? primary
    : povCharacter

  return {
    scene_no: sceneNo,
    pov_character: effectivePov,
    knows_now: uniqueTexts([
      ...asArray(existing.knows_now || existing.knowsNow),
      ...asArray(card?.required_information || card?.requiredInformation).slice(0, 3),
      card?.transition_from_previous || card?.transitionFromPrevious,
      ...asset_bound_knows.slice(0, 2),
    ], 5),
    suspects_now: uniqueTexts([
      ...asArray(existing.suspects_now || existing.suspectsNow),
      conflict,
    ], 4),
    does_not_know: uniqueTexts([
      ...asArray(existing.does_not_know || existing.doesNotKnow),
      ...asArray(card?.forbidden_settings || card?.forbiddenSettings).slice(0, 2),
      ...asset_bound_unknown.slice(0, 3),
      target?.ending_hook ? `后续结算：${compactText(target.ending_hook, 40)}` : '',
      '读者可能知道但角色此刻未证实的信息',
    ], 6),
    want_now: want,
    fear_or_cost_now: fear,
    private_bias: bias,
    allowed_senses: uniqueTexts([
      ...asArray(existing.allowed_senses || existing.allowedSenses),
      card?.sensory_anchor || card?.sensoryAnchor,
      '视觉', '听觉', '触觉', '嗅觉', '身体反应',
    ], 6),
    decision_in_scene: decision,
    emotion_from_pov: emotion,
    emotion_tell: emotionTell,
    density,
    tell_ban: uniqueTexts([
      ...asArray(existing.tell_ban || existing.tellBan),
      '这意味着',
      '这说明',
      '科学的逻辑',
      '某种规则',
      '他不知道的是',
      '读者可以看到',
      '更大的风暴',
      '名单上的问号正在倒计时（作者总结句）',
      ...asset_bound_unknown.slice(0, 2).map((name) => `把「${name}」当已知讲解`),
    ], 12),
    secondary_cut,
    dialogue_filter,
    asset_bound_knows,
    asset_bound_unknown,
  }
}


function characterStateOf(contextPackage: any, name: string) {
  const characters = asArray(
    contextPackage?.characters
    || contextPackage?.character_cards
    || contextPackage?.characterCards,
  )
  const hit = characters.find((item: any) => compactText(item?.name, 24) === name)
  return hit?.current_state || hit?.currentState || {}
}

export function compilePovKnowledgeLedgers(
  contextPackage: any = {},
  primary = '',
  sceneLenses: CharacterPovLens[] = [],
): PovKnowledgeLedger[] {
  const names = uniqueTexts([
    primary,
    ...sceneLenses.map((lens) => lens.pov_character),
    ...characterNamePool(contextPackage),
  ], 8)
  return names.map((name) => {
    const state = characterStateOf(contextPackage, name)
    const ledger = state?.knowledge_ledger || state?.knowledgeLedger || {}
    const known = uniqueTexts([
      ...asArray(ledger.known || ledger.knowledge_now || state.knowledge_now || state.knowledgeNow || state.knowledge || state.newly_learned || state.newlyLearned),
      ...asArray(sceneLenses.find((lens) => lens.pov_character === name)?.knows_now),
    ], 10)
    const misbeliefs = uniqueTexts([
      ...asArray(ledger.misbeliefs || state.misbeliefs || state.misbelief || state.false_beliefs),
      ...asArray(sceneLenses.find((lens) => lens.pov_character === name)?.suspects_now).map((item) => `可能误判：${item}`),
    ], 6)
    const open_questions = uniqueTexts([
      ...asArray(ledger.open_questions || state.open_questions || state.openQuestions),
      ...asArray(sceneLenses.find((lens) => lens.pov_character === name)?.does_not_know),
    ], 6)
    return {
      character: name,
      known,
      misbeliefs,
      open_questions,
      last_chapter: Number(state.last_pov_chapter || state.lastPovChapter || state.last_seen_chapter || 0) || undefined,
    }
  }).filter((item) => item.character)
}

export function compileChapterPovPlan(contextPackage: any = {}, options: {
  primaryPov?: string
  chapterDraft?: any
  modelFamilyStrategy?: any
} = {}): ChapterPovPlan {
  const target = chapterTargetOf(contextPackage)
  const names = characterNamePool(contextPackage)
  const primary = compactText(
    options.primaryPov
    || target?.primary_pov
    || target?.primaryPov
    || target?.pov_character
    || target?.povCharacter
    || contextPackage?.primary_pov
    || contextPackage?.primaryPov
    || names.find((name) => /protagonist|主角/.test(String(
      asArray(contextPackage?.characters).find((c: any) => c?.name === name)?.role_type
      || asArray(contextPackage?.characters).find((c: any) => c?.name === name)?.role
      || '',
    )))
    || names[0]
    || '主角',
    24,
  ) || '主角'

  const cards = sceneCardsOf(contextPackage)
  const sceneLenses = (cards.length ? cards : [{ scene_no: 1, title: '本章主场景' }])
    .map((card: any, index: number, arr: any[]) => compilePovLens(card, index, arr.length, primary, names, contextPackage))

  const voiceBits = uniqueTexts([
    target?.character_voice || target?.characterVoice,
    asArray(contextPackage?.characters).find((c: any) => compactText(c?.name, 24) === primary)?.role
    || asArray(contextPackage?.characters).find((c: any) => compactText(c?.name, 24) === primary)?.role_type,
    asArray(contextPackage?.characters).find((c: any) => compactText(c?.name, 24) === primary)?.motivation,
    target?.goal || target?.chapter_goal,
  ], 4)

  const family = options.modelFamilyStrategy
    || contextPackage?.model_family_strategy
    || contextPackage?.modelFamilyStrategy
    || null
  const intensity = (family?.pov_intensity === 'strict' || family?.pov_intensity === 'relaxed' || family?.pov_intensity === 'standard')
    ? family.pov_intensity
    : 'standard'
  const familyDirectives = uniqueTexts(asArray(family?.pov_directives), 8)
  const knowledge_ledger = compilePovKnowledgeLedgers(contextPackage, primary, sceneLenses)
  const asset_pov_bindings = compileAssetPovBindings(contextPackage, primary)
  const secondaryCuts = sceneLenses
    .map((lens) => lens.secondary_cut)
    .filter(Boolean) as AuthorizedSecondaryPovCut[]
  // P2: secondary names require explicit authorization (cut / chapter allowlist / full-scene flag),
  // not "any non-primary cast member who happened to appear on a card".
  const allowedSecondary = resolveExplicitSecondaryNames(contextPackage, primary, sceneLenses)
  const maxSecondaryScenes = intensity === 'strict' ? 1 : intensity === 'relaxed' ? 3 : 2
  const maxTotalSecondaryLines = intensity === 'strict' ? 4 : intensity === 'relaxed' ? 12 : 8
  const dialogue_pov_filter = compileDialoguePovFilter(contextPackage, primary, sceneLenses)

  return {
    version: 'character_pov_plan_v1',
    primary_pov: primary,
    pov_mode: 'deep_limited',
    allowed_secondary_povs: allowedSecondary,
    knowledge_firewall: [
      '禁止全知旁白：角色不知的信息不得写成确定事实',
      '禁止作者总结：这意味着/这说明/某种规则/科学的逻辑/更大的风暴',
      '禁止替读者定性：他就是这样的人/谁都看得出',
      '禁止章末大纲句：必须改成角色当场决定+可见动作',
      intensity === 'strict' ? '严格模式：未授权不得切次视角，不得写他人完整内心' : '标准模式：次视角仅限 allowed_secondary_povs 授权短切',
      '对白过滤器：禁止对白后全知内心，禁止用配角嘴写说明书',
      ...asset_pov_bindings.firewall_extra.slice(0, 4),
    ].filter(Boolean),
    voice_profile: voiceBits.join('；') || `${primary}：只根据自己当下利害与感知行动`,
    scene_lenses: sceneLenses,
    pov_intensity: intensity,
    knowledge_ledger,
    multi_pov_policy: {
      default_locked: true,
      require_explicit_authorization: intensity !== 'relaxed',
      max_secondary_scenes: maxSecondaryScenes,
    },
    family_pov_directives: familyDirectives,
    secondary_cut_policy: {
      allowed: secondaryCuts.slice(0, maxSecondaryScenes),
      max_total_lines: maxTotalSecondaryLines,
      require_return_to_primary: true,
      short_cut_only: intensity !== 'relaxed',
    },
    dialogue_pov_filter,
    asset_pov_bindings,
  }
}

export function attachPovLensesToSceneCards(sceneCards: any[], povPlan: ChapterPovPlan | null | undefined) {
  const lenses = asArray(povPlan?.scene_lenses)
  return asArray(sceneCards).map((card: any, index: number) => {
    const lens = lenses.find((item: any) => Number(item?.scene_no) === Number(card?.scene_no || card?.sceneNo || index + 1))
      || lenses[index]
      || null
    if (!lens) return card
    return {
      ...card,
      pov_lens: {
        ...(card?.pov_lens || card?.povLens || {}),
        ...lens,
      },
      emotion_in_situation: card?.emotion_in_situation || card?.emotionInSituation || lens.emotion_from_pov,
      emotion_tell: card?.emotion_tell || card?.emotionTell || lens.emotion_tell,
      pov_character: card?.pov_character || card?.povCharacter || lens.pov_character,
      decision_in_scene: card?.decision_in_scene || card?.decisionInScene || lens.decision_in_scene,
    }
  })
}


function loadActiveFingerprintContract(): FingerprintContract | null {
  return resolveFingerprintContract()
}

export function formatCharacterPovPrompt(plan: ChapterPovPlan | null | undefined) {
  if (!plan) return [] as string[]
  const sceneLines = plan.scene_lenses.slice(0, 6).map((lens) => {
    const cut = lens.secondary_cut
      ? `｜短切=${lens.secondary_cut.character}≤${lens.secondary_cut.max_lines}行（${lens.secondary_cut.purpose}）`
      : ''
    return `场景${lens.scene_no}｜视角=${lens.pov_character}｜欲=${lens.want_now}｜怕=${lens.fear_or_cost_now}｜私心=${lens.private_bias}｜必须选择=${lens.decision_in_scene}｜情绪=${lens.emotion_from_pov}→${lens.emotion_tell}${cut}`
  })
  const ledgerLines = asArray(plan.knowledge_ledger).slice(0, 3).map((item: any) => {
    const known = asArray(item?.known).slice(0, 3).join('｜') || '（暂无）'
    const mis = asArray(item?.misbeliefs).slice(0, 2).join('｜') || '（无）'
    const qs = asArray(item?.open_questions).slice(0, 2).join('｜') || '（无）'
    return `${item.character}：已知=${known}；误信=${mis}；未解=${qs}`
  })
  const secondaryCutLines = asArray(plan.secondary_cut_policy?.allowed).slice(0, 4).map((cut: any) => (
    `短切授权：${cut.character}（场景${cut.scene_no || '?'}，≤${cut.max_lines}行，用途=${cut.purpose}，必须${cut.return_to_primary || '回主视角'}）`
  ))
  const assetLines = [
    plan.asset_pov_bindings?.knowable_assets?.length
      ? `可知资产：${plan.asset_pov_bindings.knowable_assets.slice(0, 6).join('、')}`
      : '',
    plan.asset_pov_bindings?.forbidden_assets?.length
      ? `禁写已确知资产：${plan.asset_pov_bindings.forbidden_assets.slice(0, 6).join('、')}`
      : '',
    plan.asset_pov_bindings?.unrevealed_rules?.length
      ? `未揭规则（只可误判/残缺感知）：${plan.asset_pov_bindings.unrevealed_rules.slice(0, 4).join('、')}`
      : '',
  ].filter(Boolean)
  return [
    '【角色视角合同 · Character POV · 强制】',
    `本章主视角：${plan.primary_pov}；模式：${plan.pov_mode === 'deep_limited' ? '深有限第三人称' : '近第三人称'}（不是全知）；强度：${plan.pov_intensity || 'standard'}。`,
    plan.voice_profile ? `声音过滤：${plan.voice_profile}` : '',
    plan.allowed_secondary_povs.length
      ? `次视角仅限授权：${plan.allowed_secondary_povs.join('、')}；未授权不得切视角。`
      : '默认锁主视角，不得无授权切旁观全知。',
    plan.multi_pov_policy?.default_locked
      ? `多视角门禁：默认锁定主视角；次视角最多 ${plan.multi_pov_policy.max_secondary_scenes} 场，且必须在 allowed_secondary_povs 内。`
      : '',
    plan.secondary_cut_policy?.short_cut_only
      ? `授权次视角只能短切：全章合计 ≤${plan.secondary_cut_policy.max_total_lines} 行，切完必须立刻回 ${plan.primary_pov}。`
      : '',
    ...secondaryCutLines,
    ledgerLines.length ? `角色认知账本（必须接住，不得失忆/乱知）：\n${ledgerLines.join('\n')}` : '',
    assetLines.length ? `资产/规则耦合：\n${assetLines.join('\n')}` : '',
    plan.dialogue_pov_filter?.rules?.length
      ? `对白视角过滤：\n${plan.dialogue_pov_filter.rules.slice(0, 5).map((item) => `- ${item}`).join('\n')}`
      : '',
    ...(plan.family_pov_directives || []),
    ...buildHumanWebnovelResistancePromptDirectives(loadActiveFingerprintContract()),
    '写法铁律：',
    '1) 镜头绑在视角角色身上：只写他此刻能看/听/摸/闻/身体感到的，以及他已确认的信息；',
    '2) 怀疑只能是猜测或误判，不能写成全知事实；',
    '3) 情绪必须来自 want_now / fear_or_cost_now / private_bias，并通过动作、对白、身体细节、半拍耽误交付；',
    '4) 每个 dense/medium 场景必须有一次 decision_in_scene：选择改变下一步动作，禁止纯检查清单推进；',
    '5) 禁止作者视角解释与总结（这意味着/这说明/科学的逻辑/某种规则/规则已经启动/他不知道的是/更大的风暴/命运的下一次宣判/问号正在倒计时式大纲句）。',
    '6) 对白只走主视角听力：禁止“X说完其实X心想”，禁止配角对白当规则说明书。',
    '7) 次视角短切必须先授权：短、有目的、立刻回主视角；未授权禁止写他人完整内心。',
    '8) 资产边界：不得把 forbidden / 未揭规则写成主视角已确认知识。',
    '9) 【反朱雀AI特征】临床词可写为手上动作与触感（压、听、捏壳、读数），禁止“标准死亡体征/流程讲义/多体对称复制检查”；每人一个差异点，立刻接私心选择或短对白；禁“温度同样/完全一致/三具一字排开/三种凭证结构一致/履约交割编号扣减”。',
    '9b) 【反朱雀开篇】前 300 字禁止纯氛围镜头推进；必须出现一次半截私心或短对白（嫌手套黏/咬笔帽/想甩给值班/先支开人），再进入异常核对。',
    '9c) 【反朱雀章末】禁止医学铁律讲义、规则交易总结、失踪名册一次报完；章末用藏证/锁门/改口等可见动作收束，第三人只保留一个差异点。',
    '9d) 【人工纹理·绿段短窗·R45】先单人短测温窗（读数+1–3句短对白），再当面短摩擦（代价+脏动作+未收束）。禁三联否定、多体同温连读、病理/传染病宣判、文学比喻、电话代理冲突。',
    '9e) 【禁职业世界观讲义】禁止“作为一名…/自然规律/认知摧毁/典型表现/串联在一起”；异常只留触感+立刻动作。',
    '9f) 【开篇禁临床链】前220字物件/对白/脏动作起手，最多一次触诊；禁三联否定排比与“典型表现”。',
    '9g) 【冲突后禁盘点】冲突后禁止三体并列/019-A/B/C/姓名对号/履约框/双手同时双体；只留一件半截残片+未完成动作。',
    '9h) 【绿段优先于证据链】先交付未收束的当面摩擦，再写残片；证据链不得压过冲突戏。',
    '9i) 【禁盖章残句与戏剧包装】禁止“履约他先把/也他先把/【履约…】”；禁止硬生生/死死/像雷/令人不适/刚想…突然…巨响/执业医师证长辩。',
    '10) 【反朱雀AI特征】禁氛围套话：空气里弥漫/一片死寂/眉头紧锁/无法形容的压迫感/空气变得极其粘稠/像灌了铅；感官必须绑在具体物件与下一步动作上。',
    '11) 【反朱雀AI特征】禁抽象压迫总结：未定义区域的巨大压力/命运的下一次宣判/恐怖巨压/名单上的下一个名字；章末用可见动作收束（锁门、删记录、改口、先走哪）。',
    '12) 【反朱雀AI特征】人味来自角色视角下的私心与耽误：允许嫌麻烦、想甩锅、怕担责、先保饭碗；禁止空标签“极力保持冷静/无法言喻”，禁止作者替角色解释世界规则。',
    '13) 【反朱雀AI特征】禁“遗物/道具清点流水线”：手机、钥匙、零钱、收据逐项罗列像盘点清单；搜东西必须被私心打断（先藏/先看有没有自己名字/怕小刘撞见），只写他当下最在意的一两样。',
    '14) 【反朱雀AI特征】禁冷静说明书腔：毫无疑问/他是医生只相信数据/强迫自己冷静；句长要有毛刺，允许半截想法、改口、骂一句又咽回去，不要整齐推进信息。',
    '15) 【反朱雀AI特征·人工毛刺·实测优选】人味优先来自私心动作与半拍耽误（改记录/藏证据/支开人/改口），不要硬堆“这该死/扯着尖儿/冰窟窿/刀子视线”等口语或比喻包装；硬堆表面口语会被朱雀标红。',
    '16) 【反朱雀AI特征·人工毛刺·实测优选】一句一段可保留，但信息密度要参差：有的句子只交付一个异常触感，有的句子只交付一句半截对白；禁止开头/章末连续文学比喻堆叠，章末用可见动作收束。',
    '17) 【反朱雀结构·人工毛刺】禁止主语流水线：同一角色姓名连续起句不超过 2 次；优先物件/触感/半截对白/环境声起句，再落到角色反应。',
    '18) 【反朱雀结构·人工毛刺】禁“不是A，而是B / 极其 / 微微 / 缓缓 / 敏锐地注意到”这类整齐修辞；改成更糙的判断、改口或具体动作。',
    '19) 【反朱雀结构·人工毛刺】句长要有突发：连续短句后插入一次“决定+动作”稍长句；避免平均句长过于均匀的节拍器感。',
    '20) 【反朱雀统计指纹·外部证据对齐】句长突发分布：短句(≤8字触感/反应) / 中句 / 长句(≥35字，判断+改口+动作) 必须混排；禁止连续 ≥5 个中句同带匀速推进；连续短句后必须插入一次决定稍长句。',
    '21) 【反朱雀统计指纹·外部证据对齐】每 400–600 字至少一次非剧情主推进的私心噪声：绩效/交班/质控/嫌麻烦/怕背锅/改口；噪声必须绑在角色当下选择上，禁止空情绪标签，禁止临床/口语硬堆。',
    '22) 【反朱雀统计指纹·外部证据对齐】信息密度要忽高忽低：有的段落只交付一个触感或半截对白，有的段落一次交付“判断→改口→动作”；禁止匀速流水账与同义反复补字。',
    '23) 【反朱雀段形·r8】一句一段为底色，但全章混入约 5%–17% 的双句密段（同一判断→动作链写在一段里，每段 2 句；不要超过 20%）；禁止整章 100% 一句一段匀速；禁止 ≥3 句墙文。',
    '24) 【反朱雀私心·r8】私心噪声要具体且不对称，禁止机械轮换“交班/绩效/质控”词表；写成半截跑偏（想起昨晚没回的消息、嫌手套黏、想先抽烟又忍住、把笔帽咬变形），再立刻拉回当下选择。',
    ...plan.knowledge_firewall.map((item) => `- ${item}`),
    sceneLines.length ? `场景视角透镜：\n${sceneLines.join('\n')}` : '',
    '坏例：检查清单+氛围套话+命运宣判；或硬堆口语包装（这该死/冰窟窿/刀子视线）却没有私心动作；或中句节拍器匀速推进。',
    '好例：短触感一句一段；关键选择用双句密段写完判断→动作；中段插入一次不对称跑偏（手套黏/消息没回）再拉回；章末锁门/改记录/决定去哪，不升华不宣判。',
  ].filter(Boolean)
}

export function formatSceneCardPovPrompt(plan: ChapterPovPlan | null | undefined) {
  if (!plan) return [] as string[]
  return [
    '【场景卡角色视角要求】',
    `默认主视角 ${plan.primary_pov}。每张场景卡必须输出 pov_lens：`,
    'pov_character, knows_now[], suspects_now[], does_not_know[], want_now, fear_or_cost_now, private_bias, allowed_senses[], decision_in_scene, emotion_from_pov, emotion_tell。',
    'P2 可选字段：secondary_cut{character,max_lines,purpose,return_to_primary}（仅短切授权）；dialogue_filter；asset_bound_knows/asset_bound_unknown。',
    '若需要整场次视角，必须 secondary_authorized=true 且 pov_character 在 allowed_secondary_povs；否则正文默认锁主视角。',
    'emotion_in_situation / emotion_tell 必须可由 pov_lens 推导，禁止空标签。',
    'dense/medium 场景缺 decision_in_scene 视为不合格场景卡。',
    '场景卡可全知设计冲突，但正文层必须按 pov_lens 降维到角色可知边界；forbidden_settings 不得进入 knows_now。',
    plan.asset_pov_bindings?.forbidden_assets?.length
      ? `本章禁揭资产：${plan.asset_pov_bindings.forbidden_assets.slice(0, 6).join('、')}`
      : '',
  ].filter(Boolean)
}


const POV_STOCK_REPLACEMENTS: Array<{ pattern: RegExp; to: string }> = [
  { pattern: /这意味着/g, to: '他心里一沉，觉得' },
  { pattern: /这说明/g, to: '他心里一沉，觉得' },
  { pattern: /这代表着/g, to: '他怀疑这是' },
  { pattern: /这证明/g, to: '他觉得像是' },
  { pattern: /由此可见/g, to: '他只能先按眼前' },
  { pattern: /规则已经启动/g, to: '事情已经不太对劲' },
  { pattern: /科学的逻辑/g, to: '常理' },
  { pattern: /命运的下一次宣判/g, to: '他先把门反锁' },
  { pattern: /等待着命运/g, to: '他先把门反锁，再想下一步' },
  { pattern: /静静地等待着/g, to: '他先把门锁死' },
  { pattern: /毫无疑问/g, to: '他不愿多想' },
  { pattern: /深吸一口气(?=[。！？!?])/g, to: '嗓子发紧' },
  { pattern: /深吸一口气[，,]?/g, to: '嗓子发紧，' },
  { pattern: /强迫自己冷静下来/g, to: '把到嘴边的话咽回去' },
  { pattern: /强迫自己冷静/g, to: '把话咽回去' },
  { pattern: /空气里弥漫着/g, to: '空气里有' },
  { pattern: /一片死寂/g, to: '什么动静都没有' },
  { pattern: /眉头紧锁/g, to: '下意识揉了下眉心' },
  { pattern: /无法形容的压迫感/g, to: '胸口发紧' },
  { pattern: /空气变得极其粘稠/g, to: '呼吸有点不顺' },
  { pattern: /像灌了铅/g, to: '腿发沉' },
  { pattern: /作为一名受过专业训练的[^。！？\n]{0,12}/g, to: '他' },
  { pattern: /习惯了用科学和逻辑去解释一切临床现象/g, to: '先不急着下结论' },
  { pattern: /生物学意义上的死亡/g, to: '人已经没了' },
  { pattern: /不可逆转的自然规律/g, to: '这不对劲' },
  { pattern: /将他[^。！？\n]{0,12}认知[^。！？\n]{0,12}粉碎/g, to: '他先把门看住' },
  { pattern: /串联在一起/g, to: '他先不声张' },
  { pattern: /正是他自己的名字/g, to: '半截残码扎得他眼眶发紧' },
  { pattern: /这是肌肉失张力的典型表现/g, to: '咬肌松软，他先不写结论' },
  { pattern: /三张推车一字排开/g, to: '他只盯着最近那一床' },
  { pattern: /履约他先把[^。！？\n]{0,24}/g, to: '他先把纸片按住' },
  { pattern: /也他先把判断咽回去/g, to: '他先不声张' },
  { pattern: /【履约[^】]{0,48}】/g, to: '半截残码' },
  { pattern: /硬生生/g, to: '' },
  { pattern: /死死抵住/g, to: '抵住' },
  { pattern: /嗓门大得像雷响/g, to: '嗓门很大' },
  { pattern: /令人不适/g, to: '他想甩开手' },
  { pattern: /沉闷巨响/g, to: '一声闷响' },
  { pattern: /同时按向两人/g, to: '先按住最近那人' },
  { pattern: /执业医师证/g, to: '值班责任' },
]

/** Deterministic anti-Zhuque stock cleanup. Prefer private-action endings over metaphor stacks. */
export type ProseStatisticalFingerprint = {
  para_count: number
  char_count: number
  mean_para_chars: number
  stdev_para_chars: number
  cv: number
  short_ratio: number
  mid_ratio: number
  long_ratio: number
  max_short_streak: number
  max_mid_streak: number
  max_long_streak: number
  private_noise_count: number
  max_private_noise_gap_chars: number
}

const PRIVATE_NOISE_RE = /绩效|奖金|交班|质控|背锅|甩锅|嫌麻烦|麻烦|改口|支开|不该写|别写|安全分|扣绩效|先保|责任|月底|说不清|别往系统|日志|报告/

function bandOfParaChars(n: number): 'S' | 'M' | 'L' {
  if (n <= 8) return 'S'
  if (n <= 25) return 'M'
  return 'L'
}

/** Statistical fingerprint used against Zhuque-like detectors (burstiness + private-noise spacing). */
export function measureProseStatisticalFingerprint(text: string): ProseStatisticalFingerprint {
  const body = String(text || '').replace(/\r/g, '')
  const paras = body.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  const lens = paras.map((p) => p.length)
  const charCount = body.replace(/\s+/g, '').length || body.length
  const mean = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0
  const variance = lens.length
    ? lens.reduce((a, b) => a + (b - mean) * (b - mean), 0) / lens.length
    : 0
  const stdev = Math.sqrt(variance)
  const cv = mean > 0 ? stdev / mean : 0
  const bands = lens.map(bandOfParaChars)
  let maxS = 0
  let maxM = 0
  let maxL = 0
  let streak = 0
  let prev = ''
  for (const band of bands) {
    if (band === prev) streak += 1
    else {
      streak = 1
      prev = band
    }
    if (band === 'S') maxS = Math.max(maxS, streak)
    if (band === 'M') maxM = Math.max(maxM, streak)
    if (band === 'L') maxL = Math.max(maxL, streak)
  }
  const short = bands.filter((b) => b === 'S').length
  const mid = bands.filter((b) => b === 'M').length
  const long = bands.filter((b) => b === 'L').length
  const n = Math.max(1, bands.length)
  const noiseIdx: number[] = []
  let pos = 0
  for (const p of paras) {
    if (PRIVATE_NOISE_RE.test(p)) noiseIdx.push(pos)
    pos += p.length + 1
  }
  let maxGap = charCount
  if (noiseIdx.length) {
    const gaps = [noiseIdx[0], ...noiseIdx.slice(1).map((v, i) => v - noiseIdx[i]), Math.max(0, charCount - noiseIdx[noiseIdx.length - 1])]
    maxGap = Math.max(...gaps)
  }
  return {
    para_count: paras.length,
    char_count: charCount,
    mean_para_chars: Number(mean.toFixed(2)),
    stdev_para_chars: Number(stdev.toFixed(2)),
    cv: Number(cv.toFixed(3)),
    short_ratio: Number((short / n).toFixed(3)),
    mid_ratio: Number((mid / n).toFixed(3)),
    long_ratio: Number((long / n).toFixed(3)),
    max_short_streak: maxS,
    max_mid_streak: maxM,
    max_long_streak: maxL,
    private_noise_count: noiseIdx.length,
    max_private_noise_gap_chars: maxGap,
  }
}

export function sanitizeCharacterPovAntiAiStock(text: string) {
  let out = String(text || '')
  if (!out.trim()) return out
  for (const row of POV_STOCK_REPLACEMENTS) {
    out = out.replace(row.pattern, row.to)
  }
  // collapse accidental double punctuation after replacements (incl. mixed 「，。」/「，！」 → keep the final mark)
  out = out.replace(/，{2,}/g, '，').replace(/。{2,}/g, '。').replace(/，+([。！？!?])/g, '$1')
  return out
}

const AUTHOR_EXPLAIN_PATTERNS: Array<{ key: string; label: string; regex: RegExp; fix: string; status?: 'fail' | 'warn' }> = [
  {
    key: 'pov_author_explain',
    label: '作者解释腔',
    regex: /这意味着|这说明|这代表着|这证明|由此可见|科学的逻辑|某种(?:规则|祭品|交易|代价)|规则的运转|规则已经启动|从这一刻起|不属于[^。！？\n]{0,12}(?:这个世界|人类|正常人)/g,
    fix: '删掉作者解释，改成视角角色的误判、追问、身体反应或当场选择。',
    status: 'fail',
  },
  {
    key: 'pov_omniscient_leak',
    label: '全知泄漏',
    regex: /他不知道的是|她不知道的是|读者可以看到|实际上[^。！？\n]{0,20}(?:是|在)|与此同时[^。！？\n]{0,24}(?:另一边|远方|背后)/g,
    fix: '删掉角色不可知信息；若必须给信息，改成视角角色能感知的证据或授权次视角场景。',
    status: 'fail',
  },
  {
    key: 'pov_outline_ending',
    label: '章末大纲句',
    regex: /正在倒计时|更大的风暴|故事才刚刚|命运的齿轮|必须在天亮前去|命运的下一次宣判|恐怖巨压|名单上的下一个名字|来自未定义区域的(?:巨大压力|恐怖巨压)|静静地等待着|等待着命运/g,
    fix: '章末改成角色当下决定+可见动作/物件风险，不要作者总结任务书。',
    status: 'fail',
  },
  {
    key: 'pov_clinical_pipeline',
    label: '临床流水线腔',
    regex: /(?:瞳孔散大固定[，,]?对光反射消失)|(?:心电图拉直线)|(?:测温枪没有坏)|(?:宣布死亡)|(?:颈动脉窦)|(?:红外测温枪)/g,
    fix: '压缩检查连击：一次检查只写角色最在意的异常点，并立刻接私心选择（重测/支开/藏证据/改口）。',
    status: 'warn',
  },
  {
    key: 'pov_atmosphere_stock',
    label: '氛围套话',
    regex: /空气里弥漫着|一片死寂|眉头紧锁|连最微弱|无法形容的压迫感|空旷的抢救室里回荡|空气变得极其粘稠|像灌了铅|沉重得无法挪动|死死地盯着|极其艰难/g,
    fix: '删掉氛围套话；改成角色此刻具体感官锚点与半拍耽误（手套黏手、纸杯烫指、想骂人又咽回去）。',
    status: 'warn',
  },
  {
    key: 'pov_inventory_pipeline',
    label: '遗物清点流水线',
    regex: /(?:手机[、，].{0,12}钥匙[、，].{0,12}零钱)|(?:拉开第[一二三1-3]个袋子)|(?:黄色塑料袋)|(?:整齐地摆放着)/g,
    fix: '不要盘点式列物品；只写视角角色此刻最在意的一件证据，并立刻接私心动作（藏/改记录/支开人）。',
    status: 'warn',
  },
  {
    key: 'pov_calm_manual',
    label: '冷静说明书腔',
    regex: /毫无疑问|强迫自己冷静|他是医生[^。！？\n]{0,12}只相信|只相信数据|深吸一口气/g,
    fix: '删掉冷静说明书；改成怕担责/嫌麻烦/想甩锅的半截念头与不体面小动作。',
    status: 'warn',
  },
  {
    key: 'pov_forced_slang_pack',
    label: '硬堆口语包装',
    regex: /这该死的|扯着尖儿|急吼吼|硬邦邦|浑身是嘴|皮给剥了|脑子进水/g,
    fix: '删掉为去AI而硬堆的口语包装；改成具体私心动作（改口/藏证据/支开人）与半截对白。',
    status: 'warn',
  },
  {
    key: 'pov_temp_textbook',
    label: '尸温教科书腔',
    regex: /十六度|三十[六七]度以上|接近三十七度|汗毛孔都处于|人体散失的热量|尸僵未形成|尸斑未见/g,
    fix: '删掉尸温/室温对照说明书；改成一次异常触感+私心选择（改记录/支开人/藏证据）。',
    status: 'warn',
  },
  {
    key: 'pov_template_contrast',
    label: '整齐对比模板',
    regex: /不是[^。！？\n]{0,16}，而是|极其(?:稳健|稳定|诡异|规整)|微微(?:鼓起|泛白|一颤)|缓缓向下|敏锐地注意/g,
    fix: '打散模板修辞：删掉“不是A而是B/极其/微微/缓缓/敏锐地”，改成更糙的判断、改口或具体动作。',
    status: 'warn',
  },
  {
    key: 'pov_metaphor_stack',
    label: '比喻堆叠腔',
    regex: /像有根针|冰窟窿|刀子一样的视线|无形的绞索|巨大的深渊|黑漆漆的|全是刀子/g,
    fix: '删掉连续文学比喻；章中用触感与物件，章末用可见动作收束。',
    status: 'warn',
  },
  {
    key: 'pov_lawsuit_manual',
    label: '质控起诉说明书腔',
    regex: /质控[^。！？\n]{0,16}法医|法医[^。！？\n]{0,12}起诉|医疗事故|伪造病历|以医疗事故/g,
    fix: '删掉质控/法医/起诉讲义；改成角色半截私心（这单怎么签/别先被主任看见）并立刻锁门/改记录。',
    status: 'fail',
  },
  {
    key: 'pov_fate_card_spell',
    label: '卡片命运拼字宣判',
    regex: /交易已确认|代价交割中|拼出了一行|拼在一起时[^。！？\n]{0,12}背面|规则已经启动|名单上的下一个/g,
    fix: '禁卡片拼字与命运宣判；卡片只保留编号/材质/撕裂边对比，角色只拍照/藏证/反锁门。',
    status: 'fail',
  },
  {
    key: 'pov_pathology_parallel',
    label: '病理总结与平行线腔',
    regex: /违背医学常理|病理学逻辑|标准的活人体温|诡异的平行线|制度化的产物|人为或者制度化/g,
    fix: '删掉病理总结与平行线；异常只写一次触感，立刻接角色选择。',
    status: 'fail',
  },
  {
    key: 'pov_cinematic_footstep',
    label: '电影脚步压迫腔',
    regex: /脚步声很慢[，,]?但每一步都踩得很沉|空旷的急诊走廊里发出|人影没有敲门[，,]?也没有离开/g,
    fix: '打散电影压迫模板；门外只写一个可确认细节（锁舌轻碰/玻璃上一个停住的影子），立刻接锁门动作。',
    status: 'warn',
  },
]

export function scanCharacterPovRisks(text: string, contextPackage: any = {}) {
  const body = String(text || '').replace(/\r/g, '')
  const out: any[] = []
  if (!body.trim()) return out

  const plan = compileChapterPovPlan(contextPackage)
  for (const row of AUTHOR_EXPLAIN_PATTERNS) {
    const hits = body.match(row.regex) || []
    const status = row.status || 'fail'
    for (const hit of hits.slice(0, 3)) {
      out.push({
        key: row.key,
        pattern: row.key,
        label: row.label,
        status,
        severity: status === 'fail' ? 'high' : 'medium',
        blocking: status === 'fail',
        evidence: compactText(hit, 120),
        fix: row.fix,
        remaining_risk: status === 'fail'
          ? '角色视角未锁死，正文会滑回作者全知与解释腔'
          : '套话/流水线会抬高朱雀疑似AI特征',
        repair_instruction: row.fix,
        priority: status === 'fail' ? 0 : 1,
      })
    }
  }

  // Dense/medium scenes require at least one decision-like cue in whole chapter when multiple scenes exist.
  const denseLenses = plan.scene_lenses.filter((lens) => lens.density === 'dense' || lens.density === 'medium')
  const decisionCue = /决定|只能|不得不|先|不该|宁愿|索性|干脆|我走|请假|别动|不能告诉|先把|先让|选择|犹豫|改口|多看了一眼|捏紧|攥紧/.test(body)
  if (denseLenses.length >= 2 && !decisionCue) {
    out.push({
      key: 'pov_no_decision',
      pattern: 'pov_no_decision',
      label: '视角场景缺少选择',
      status: 'warn',
      severity: 'medium',
      blocking: false,
      evidence: `dense/medium 场景 ${denseLenses.length} 个，但正文缺少可见选择/改口/私心动作`,
      fix: '在至少一个高压场景补 decision_in_scene：因 want/fear/private_bias 做出改变下一步的选择。',
      remaining_risk: '纯流程推进会像工具人检查清单',
      repair_instruction: '补一次角色选择：先自保/支开旁人/隐瞒/重测/放弃标准流程等，并写清选择原因来自当下恐惧或私心。',
      priority: 1,
    })
  }

  // Subject monotony soft signal for primary POV automation feel.
  const primary = plan.primary_pov
  if (primary && primary !== '主角') {
    const openers = body
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
    const primaryOpens = openers.filter((line) => line.startsWith(primary)).length
    if (openers.length >= 30 && primaryOpens / openers.length >= 0.22) {
      out.push({
        key: 'pov_subject_monotony',
        pattern: 'pov_subject_monotony',
        label: '视角主语流水线',
        status: 'warn',
        severity: 'low',
        blocking: false,
        evidence: `${primary} 起句约占 ${Math.round((primaryOpens / openers.length) * 100)}%`,
        fix: '保留主视角，但用感官细节、物件、半截对白、身体反应起句，避免姓名流水线。',
        remaining_risk: '主语节拍过匀会增加机械感',
        repair_instruction: '打散“姓名+动作”起句，改成先感官/物件/对白，再落到角色反应。',
        priority: 2,
      })
    }
  }


  // Statistical fingerprint soft signals (Zhuque-aligned: burstiness + private-noise spacing).
  const stats = measureProseStatisticalFingerprint(body)
  if (stats.para_count >= 24 && stats.max_mid_streak >= 6) {
    out.push({
      key: 'pov_sentence_metronome',
      pattern: 'pov_sentence_metronome',
      label: '句长节拍器',
      status: 'warn',
      severity: 'medium',
      blocking: false,
      evidence: `中句同带连续 ${stats.max_mid_streak} 段（cv=${stats.cv}）`,
      fix: '打断中句匀速带：插入 ≤8 字触感/半截反应，或并入一次 ≥35 字“判断+改口+动作”稍长句。',
      remaining_risk: '句长过匀会抬高朱雀疑似AI统计指纹',
      repair_instruction: '重排句长突发：短-短-长决定；禁止连续 ≥5 个中句同带推进。',
      priority: 1,
    })
  }
  if (stats.para_count >= 24 && stats.cv > 0 && stats.cv < 0.45) {
    out.push({
      key: 'pov_low_burstiness',
      pattern: 'pov_low_burstiness',
      label: '句长突发不足',
      status: 'warn',
      severity: 'medium',
      blocking: false,
      evidence: `段落长度变异系数 cv=${stats.cv}（建议 ≥0.5）`,
      fix: '拉大句长方差：混入极短触感句与稍长决定句，避免中句均值带。',
      remaining_risk: '低突发度是常见 AI 检测统计特征',
      repair_instruction: '把同义中句合并/拆开，使短/中/长混排，cv 抬到 0.5 以上。',
      priority: 1,
    })
  }
  if (stats.char_count >= 1200 && (stats.private_noise_count === 0 || stats.max_private_noise_gap_chars > 700)) {
    out.push({
      key: 'pov_private_noise_sparse',
      pattern: 'pov_private_noise_sparse',
      label: '私心噪声间距过大',
      status: 'warn',
      severity: 'medium',
      blocking: false,
      evidence: stats.private_noise_count === 0
        ? '全章未见绩效/交班/质控/改口/背锅类私心噪声'
        : `私心噪声最大间距约 ${stats.max_private_noise_gap_chars} 字（目标 ≤600）`,
      fix: '每 400–600 字补一次非剧情主推进的私心噪声：怕质控/嫌交班麻烦/改口藏证据，并立刻接动作。',
      remaining_risk: '只有剧情推进没有私心噪声时，正文更像匀速生成流水线',
      repair_instruction: '在最长噪声空窗插入一次角色私心选择（改记录/支开人/先保自己），不要加临床说明书。',
      priority: 1,
    })
  }
  if (stats.para_count >= 30 && stats.mid_ratio >= 0.72 && stats.short_ratio < 0.1 && stats.long_ratio < 0.12) {
    out.push({
      key: 'pov_band_collapse',
      pattern: 'pov_band_collapse',
      label: '句长带塌缩',
      status: 'warn',
      severity: 'low',
      blocking: false,
      evidence: `中句占比 ${Math.round(stats.mid_ratio * 100)}%，短/长过少`,
      fix: '补极短触感句与稍长决定句，压低中句占比。',
      remaining_risk: '句长带塌缩会强化节拍器感',
      repair_instruction: '把部分中句压成 ≤8 字，或扩成判断+动作复合句。',
      priority: 2,
    })
  }

  // r8: whole-chapter one-sentence-one-para monotony is a detector-friendly fingerprint.
  const narrativeParas = body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !/^[“"「].+[”"」][。！？!?，,；;：:]?$/.test(line))
  if (narrativeParas.length >= 40) {
    const singleOnly = narrativeParas.filter((line) => {
      const sentences = (line.match(/[^。！？!?]+[。！？!?]/g) || []).filter((item) => item.replace(/\s+/g, '').length >= 6)
      return sentences.length <= 1
    }).length
    const ratio = singleOnly / narrativeParas.length
    if (ratio >= 0.96) {
      out.push({
        key: 'pov_all_single_sentence_monotony',
        pattern: 'pov_all_single_sentence_monotony',
        label: '全章一句一段匀速',
        status: 'warn',
        severity: 'medium',
        blocking: false,
        evidence: `叙述段一句一段占比 ${Math.round(ratio * 100)}%`,
        fix: '混入 5%–17% 双句密段：把“判断+动作”或“改口+私心选择”写进同一段，其余保持一句一段。',
        remaining_risk: '整章一句一段会强化网文生成指纹，朱雀更易整篇疑似',
        repair_instruction: '不要改剧情，只重排段形：选 8–15 处关键选择改成双句密段。',
        priority: 1,
      })
    }
  }

  // Multi-POV gate: unauthorized internal monologue / explicit POV switch
  const authorized = new Set([
    plan.primary_pov,
    ...asArray(plan.allowed_secondary_povs),
  ].map((name) => compactText(name, 24)).filter(Boolean))
  const switchHits = [...body.matchAll(/(?:从|切换到)?([一-鿿]{2,4})(?:的视角|心里想|心想|暗想|心道)|([一-鿿]{2,4})不知道的是/g)]
  for (const hit of switchHits.slice(0, 4)) {
    // pure name comes from the switch regex's own capture groups; re-matching the whole hit would swallow the suffix
    const name = hit[1] || hit[2] || ''
    if (!name || authorized.has(name) || name === plan.primary_pov) continue
    out.push({
      key: 'pov_unauthorized_switch',
      pattern: 'pov_unauthorized_switch',
      label: '未授权视角切换',
      status: plan.multi_pov_policy?.require_explicit_authorization ? 'fail' : 'warn',
      severity: plan.multi_pov_policy?.require_explicit_authorization ? 'high' : 'medium',
      blocking: Boolean(plan.multi_pov_policy?.require_explicit_authorization),
      evidence: compactText(hit[0], 120),
      fix: `删掉 ${name} 的全知/内心切换，回到主视角 ${plan.primary_pov}；若必须切视角，先在 scene pov_lens 授权 short secondary_cut。`,
      remaining_risk: '未授权切视角会破坏深有限代入并引入作者全知',
      repair_instruction: `删除未授权视角（${name}），改写为 ${plan.primary_pov} 可感知的证据/动作/对白。`,
      priority: 0,
    })
  }

  // P2: authorized secondary cut overstay — long monologue blocks for secondary characters.
  const maxLines = Number(plan.secondary_cut_policy?.max_total_lines || 8)
  const secondaryNames = uniqueTexts([
    ...asArray(plan.allowed_secondary_povs),
    ...asArray(plan.secondary_cut_policy?.allowed).map((item: any) => item?.character),
  ], 8).filter((name) => name && name !== plan.primary_pov)
  for (const name of secondaryNames.slice(0, 4)) {
    // count line-level once: monologue cue and named-para cue are unioned per line, never double-counted
    const monoRe = new RegExp(`${name}[^\\n]{0,12}(?:心想|暗想|心道|心里|内心)`)
    const total = body
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => monoRe.test(line) || (line.startsWith(name) && /想|觉得|意识到|明白|暗自|心中/.test(line)))
      .length
    const perCut = asArray(plan.secondary_cut_policy?.allowed).find((item: any) => item?.character === name)
    const limit = Number(perCut?.max_lines || Math.min(4, maxLines)) || 3
    if (total > limit) {
      out.push({
        key: 'pov_secondary_cut_overstay',
        pattern: 'pov_secondary_cut_overstay',
        label: '次视角短切超时',
        status: plan.secondary_cut_policy?.short_cut_only ? 'fail' : 'warn',
        severity: 'high',
        blocking: Boolean(plan.secondary_cut_policy?.short_cut_only),
        evidence: `${name} 内心/主观句约 ${total} 处，超过授权短切 ≤${limit}`,
        fix: `压缩 ${name} 次视角到 ≤${limit} 行短切，并立刻回到 ${plan.primary_pov} 的可感知证据。`,
        remaining_risk: '次视角拖长会变成双主角/全知切换',
        repair_instruction: `只保留 ${name} 1-${limit} 行威胁/信息差短切，其余改写为 ${plan.primary_pov} 视角。`,
        priority: 0,
      })
    }
  }

  // P2: dialogue POV filter — mind-read after dialogue / textbook dialogue dumps.
  // Attribution gate: primary's own reaction (bare 他/她 right after the dialogue) or an authorized name owning the
  // mind-word is legal deep-limited prose; ambiguous or unauthorized attribution stays blocking.
  const dialogueMindReads = [...body.matchAll(/[「“"][^」”"]{0,40}[」”"]([^。！？\n]{0,12})(?:其实|心里|心想|暗想|心道|表面)[^。！？\n]{0,40}/g)]
    .filter((hit) => {
      const owner = hit[1] || ''
      if (/^[他她]$/.test(owner)) return false
      return ![...authorized].some((name) => name && owner.endsWith(name))
    })
  for (const hit of dialogueMindReads.slice(0, 3)) {
    out.push({
      key: 'pov_dialogue_mind_read',
      pattern: 'pov_dialogue_mind_read',
      label: '对白后全知内心',
      status: 'fail',
      severity: 'high',
      blocking: true,
      evidence: compactText(hit[0], 140),
      fix: '删掉对白后的全知内心；改成主视角听到的语气停顿、表情、手部动作或半截改口。',
      remaining_risk: '对白过滤器失效会把配角内心写成作者上帝视角',
      repair_instruction: `对白只保留 ${plan.primary_pov} 能听见/看见的部分；真实动机改成可观察的微表情或行为破绽。`,
      priority: 0,
    })
  }
  const textbookDialogue = body.match(/[「“"][^」”"]{20,120}(?:规则是|其实原理|本质上|简单来说|所谓的)[^」”"]{0,80}[」”"]/g) || []
  for (const hit of textbookDialogue.slice(0, 2)) {
    out.push({
      key: 'pov_dialogue_infodump',
      pattern: 'pov_dialogue_infodump',
      label: '对白说明书',
      status: 'warn',
      severity: 'medium',
      blocking: false,
      evidence: compactText(hit, 140),
      fix: '拆掉说明书式对白：只让角色说出口头会说的半截话，规则通过动作后果显现。',
      remaining_risk: '对白灌设定会 simultaneous 破视角与网文节奏',
      repair_instruction: '把完整规则讲解改成残缺线索、误导和现场代价。',
      priority: 1,
    })
  }

  // P2: asset/rule coupling leak — forbidden assets asserted as known facts.
  const forbiddenAssets = asArray(plan.asset_pov_bindings?.forbidden_assets)
  for (const asset of forbiddenAssets.slice(0, 6)) {
    if (!asset || asset.length < 2) continue
    const certainty = /就是|其实是|本质上是|规则是|真相是/
    let from = 0
    let hits = 0
    while (hits < 2) {
      const at = body.indexOf(asset, from)
      if (at < 0) break
      const window = body.slice(at, at + asset.length + 16)
      if (certainty.test(window)) {
        out.push({
          key: 'pov_asset_firewall_leak',
          pattern: 'pov_asset_firewall_leak',
          label: '禁揭资产被写成已知',
          status: 'fail',
          severity: 'high',
          blocking: true,
          evidence: compactText(window, 140),
          fix: `「${asset}」属于禁揭/未授权资产，不得写成 ${plan.primary_pov} 已确认事实；改成误判、传闻或可感知残缺迹象。`,
          remaining_risk: '资产防火墙被穿透会提前泄底并破坏信息差',
          repair_instruction: `删除对「${asset}」的确定性讲解，只保留 ${plan.primary_pov} 现场能碰到的局部证据。`,
          priority: 0,
        })
        hits += 1
      }
      from = at + asset.length
    }
  }

  // Strict intensity: treat subject monotony + no decision more seriously already handled; add knowledge amnesia soft check if ledger known facts contradicted by pure ignorance monologue is hard - skip.


  return out
}

export function buildPovRepairInstructions(findings: any[] = []) {
  return asArray(findings)
    .filter((item) => String(item?.key || '').startsWith('pov_') || /角色视角|作者解释|全知/.test(String(item?.label || item?.message || '')))
    .sort((a, b) => Number(a?.priority ?? 9) - Number(b?.priority ?? 9))
    .map((item) => compactText(item?.repair_instruction || item?.fix || item?.message || item?.evidence, 220))
    .filter(Boolean)
    .slice(0, 6)
}

/**
 * Lightweight knowledge residue for character.current_state after a chapter.
 * Heuristic only; never overwrites richer story-state fields with empty values.
 */
export function buildPovCharacterStatePatch(input: {
  chapterText?: string
  povCharacter?: string
  chapterNo?: number
  existingState?: any
} = {}) {
  const text = String(input.chapterText || '')
  const name = compactText(input.povCharacter, 24)
  const existing = input.existingState && typeof input.existingState === 'object' ? input.existingState : {}
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  const knowledge = uniqueTexts(
    lines.filter((line) => (
      /发现|确认|看到|听到|摸到|读到|意识到|明白|记下|名单|地址|纸条|体温|符号/.test(line)
      && (!name || line.includes(name) || line.length <= 36)
    )),
    6,
  )
  const openQuestions = uniqueTexts(
    lines.filter((line) => /？|\?/.test(line)).map((line) => line.replace(/[“”]/g, '')),
    4,
  )
  const emotionalResidue = compactText(
    [...lines].reverse().find((line) => /怕|慌|冷|紧|僵|汗|心跳|怒|烦|恶心|不敢|不能/.test(line)) || '',
    80,
  )

  const nextKnowledge = uniqueTexts([
    ...asArray(existing.knowledge_now || existing.knowledgeNow || existing.knowledge),
    ...knowledge,
  ], 10)
  const nextQuestions = uniqueTexts([
    ...asArray(existing.open_questions || existing.openQuestions),
    ...openQuestions,
  ], 8)

  const misbeliefs = uniqueTexts([
    ...asArray(existing.misbeliefs || existing.misbelief || (existing.knowledge_ledger || {}).misbeliefs),
    ...lines.filter((line) => /以为|原本以为|错当成|误以为|看来是|大概是/.test(line)).slice(0, 4),
  ], 8)

  const patch: Record<string, any> = {
    pov_mode: 'deep_limited',
    last_pov_character: name || existing.last_pov_character || existing.lastPovCharacter || '',
  }
  if (input.chapterNo) patch.last_pov_chapter = input.chapterNo
  if (nextKnowledge.length) patch.knowledge_now = nextKnowledge
  if (nextQuestions.length) patch.open_questions = nextQuestions
  if (misbeliefs.length) patch.misbeliefs = misbeliefs
  if (emotionalResidue) patch.emotional_state = emotionalResidue
  // Structured ledger for next-chapter carry-in
  patch.knowledge_ledger = {
    character: name || existing.last_pov_character || '',
    known: nextKnowledge,
    misbeliefs,
    open_questions: nextQuestions,
    last_chapter: input.chapterNo || existing.last_pov_chapter || undefined,
  }
  return patch
}

/** UI/API snapshot: chapter primary POV, scene lenses, and open violations. */
export function buildCharacterPovUiSnapshot(input: {
  contextPackage?: any
  chapterText?: string
  modelFamilyStrategy?: any
  qualityFindings?: any[]
} = {}) {
  const plan = compileChapterPovPlan(input.contextPackage || {}, {
    modelFamilyStrategy: input.modelFamilyStrategy,
  })
  const scanned = input.chapterText
    ? scanCharacterPovRisks(input.chapterText, input.contextPackage || {})
    : []
  const fromQuality = asArray(input.qualityFindings).filter((item) => (
    String(item?.key || item?.pattern || '').startsWith('pov_')
    || /角色视角|全知|解释腔|未授权视角/.test(String(item?.label || item?.message || item?.key || ''))
  ))
  const violations = [...scanned, ...fromQuality].slice(0, 12).map((item) => ({
    key: String(item?.key || item?.pattern || 'pov'),
    label: String(item?.label || item?.key || '视角问题'),
    status: String(item?.status || (item?.blocking ? 'fail' : 'warn')),
    evidence: compactText(item?.evidence || item?.matched_text || item?.message, 160),
    fix: compactText(item?.fix || item?.repair_instruction, 180),
  }))
  return {
    version: 'character_pov_ui_v1',
    primaryPov: plan.primary_pov,
    povMode: plan.pov_mode,
    povIntensity: plan.pov_intensity,
    allowedSecondaryPovs: plan.allowed_secondary_povs,
    multiPovLocked: Boolean(plan.multi_pov_policy?.default_locked),
    knowledgeLedger: plan.knowledge_ledger,
    secondaryCuts: asArray(plan.secondary_cut_policy?.allowed).map((cut: any) => ({
      character: cut.character,
      maxLines: cut.max_lines,
      purpose: cut.purpose,
      sceneNo: cut.scene_no,
    })),
    dialogueFilter: plan.dialogue_pov_filter,
    assetBindings: plan.asset_pov_bindings,
    scenes: plan.scene_lenses.map((lens) => ({
      sceneNo: lens.scene_no,
      povCharacter: lens.pov_character,
      wantNow: lens.want_now,
      fearOrCostNow: lens.fear_or_cost_now,
      decisionInScene: lens.decision_in_scene,
      emotionFromPov: lens.emotion_from_pov,
      density: lens.density,
      secondaryCut: lens.secondary_cut
        ? `${lens.secondary_cut.character}≤${lens.secondary_cut.max_lines}行`
        : '',
    })),
    violations,
    statusLabel: violations.some((item) => item.status === 'fail')
      ? '视角违规'
      : violations.length
        ? '视角待优化'
        : plan.primary_pov
          ? `视角 · ${plan.primary_pov}`
          : '视角未定',
    status: violations.some((item) => item.status === 'fail')
      ? 'fail'
      : violations.length
        ? 'warn'
        : 'ok',
  }
}
