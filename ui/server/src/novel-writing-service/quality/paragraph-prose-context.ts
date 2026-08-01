import type { ProseRiskPromptSection } from '../../novel-writing/prose-contract-prompt'
import { compileProseContractPrompt } from '../../novel-writing/prose-contract-prompt'
import { buildProseGenerationContract, normalizeProseContractKey } from '../../novel-writing/prose-generation-contract'
import {
  buildWritingPrecisionPlan,
  formatWritingPrecisionPrompt,
} from '../../novel-writing/writing-precision-prompt'
import {
  buildAssetLinkagePromptSection,
  buildBenchmarkRecallPromptSection,
  buildBridgeUnitPromptSection,
  buildChapterHookPromptSection,
  buildCharacterBehaviorPromptSection,
  buildCharacterRelationPromptSection,
  buildConflictStructurePromptSection,
  buildContentRubricPromptSection,
  buildContinuityHeatPromptSection,
  buildDeliveryRiskCarryOverPromptSection,
  buildDialoguePromptSection,
  buildEmotionalArcPromptSection,
  buildExpectationThresholdPromptSection,
  buildFemaleAudiencePromptSection,
  buildGenrePositioningPromptSection,
  buildGenreProseCardPromptSection,
  buildReaderContractProgressionPromptSection,
  buildGovernanceRecheckPromptSection,
  buildInformationFlowPromptSection,
  buildIntentConfirmationPromptSection,
  buildLongformBattleContextPromptSection,
  buildLongformCompassPromptSection,
  buildOpeningPromptSection,
  buildParagraphHookPromptSection,
  buildPlatformRubricPromptSection,
  buildPlotDynamicsPromptSection,
  buildPlotFrameworkPromptSection,
  buildPlotSpecialTopicsPromptSection,
  buildProseCraftPromptSection,
  buildPunctuationTonePromptSection,
  buildQualityAuditPromptSection,
  buildReversalPromptSection,
  buildShowdownPromptSection,
  buildStateTrackingPromptSection,
  buildStoryLoopPromptSection,
  buildStoryPowerPromptSection,
  buildStyleBoundaryPromptSection,
  buildSuspensePromptSection,
  buildTargetReaderPromptSection,
  buildUpgradeRhythmPromptSection,
} from '../../novel-writing/prose-generation-prompt-sections'
import { buildProsePromptContextSnapshot, prosePromptJson, prosePromptText } from '../../novel-writing/prose-prompt-context'
import { asArray, safeJsonStringify as stringifyRouteJsonSafely, sanitizeJsonValue } from '../../routes/novel-route-utils'
import { getContextContract } from '../context/context-contract'
import { buildPreviousChapterHandoff } from '../post-delivery/chapter-handoff-contracts'
import { normalizeSceneCardsPayload } from '../post-delivery/scene-cards'
import { attachOhStoryDirectorToContextPackage } from './prose-quality-entry'
import { isMissingStructuredReviewCheck } from './review-merge'
import { revisionReceiptRemainingRisk } from './revision-receipt-risk'
import { STRUCTURED_REVIEW_REQUIRED_FIELDS } from './structured-review-fields'
import { compactBriefText } from './text-utils'

export function safeJsonStringify(value: any, fallback?: string, maxLength = 0) {
  const text = stringifyRouteJsonSafely(value, undefined, maxLength)
  return text || fallback || ''
}

export function proseQualityJson(value: any) {
  return safeJsonStringify(value, undefined, 0)
}






export function proseRiskSection(key: string, value: string | string[]): ProseRiskPromptSection | null {
  const lines = (Array.isArray(value) ? value : [value])
    .map(item => String(item || '').trim())
    .filter(Boolean)
  if (!lines.length) return null
  const title = prosePromptText(lines[0] || key, 180)
  const compactRules = lines.slice(1).map(item => prosePromptText(item, 700)).filter(Boolean)
  return {
    key,
    full: lines,
    compact: [title, ...compactRules.slice(0, 5)],
    reference: [`${title}：仅执行本章直接相关边界；不得引入合同外事实。`],
  }
}

export function requiredProsePromptText(value: any) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

export function requiredProsePromptJson(value: any) {
  try {
    const text = JSON.stringify(sanitizeJsonValue(value, {
      maxDepth: Infinity,
      maxArrayLength: Infinity,
      maxObjectKeys: Infinity,
    }))
    return text === undefined ? 'null' : text
  } catch {
    return JSON.stringify(String(value ?? ''))
  }
}

export function requiredProseSceneCardValue(value: any): any {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string') {
    const text = requiredProsePromptText(value)
    return text || undefined
  }
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) {
    const items = value.map(requiredProseSceneCardValue).filter(item => item !== undefined)
    return items.length ? items : undefined
  }
  const output: Record<string, any> = {}
  for (const [key, item] of Object.entries(value)) {
    if (/(?:^|_)(?:diagnostic|diagnostics|audit_log|raw_payload|debug|trace)(?:$|_)/i.test(key)) continue
    const next = requiredProseSceneCardValue(item)
    if (next !== undefined) output[key] = next
  }
  return Object.keys(output).length ? output : undefined
}

export function requiredProseSceneCard(card: any) {
  const sanitized = sanitizeJsonValue(card, {
    maxDepth: Infinity,
    maxArrayLength: Infinity,
    maxObjectKeys: Infinity,
  })
  return requiredProseSceneCardValue(sanitized) || {}
}

/** Keep only the causal spine a draft model needs; strip enrichment noise that belongs in optional risk contracts. */
const PROSE_CORE_SCENE_TEXT_MAX = 280
const PROSE_CORE_SCENE_LIST_MAX = 6

function firstRequiredProseText(...values: any[]) {
  for (const value of values) {
    const text = requiredProsePromptText(value)
    if (text) return text
  }
  return ''
}

function clipRequiredProseText(value: any, max = PROSE_CORE_SCENE_TEXT_MAX) {
  const text = requiredProsePromptText(value)
  if (!text) return ''
  if (text.length <= max) return text
  let clipped = text.slice(0, Math.max(0, max - 1))
  // Code-unit slice can split a surrogate pair (emoji / CJK Ext-B); drop a trailing lone high surrogate.
  const lastCode = clipped.charCodeAt(clipped.length - 1)
  if (lastCode >= 0xd800 && lastCode <= 0xdbff) clipped = clipped.slice(0, -1)
  return `${clipped}…`
}

function uniqueRequiredProseTexts(values: any[], maxItems = PROSE_CORE_SCENE_LIST_MAX, maxText = PROSE_CORE_SCENE_TEXT_MAX) {
  const seen = new Set<string>()
  const rows: string[] = []
  for (const value of asArray(values)) {
    const text = clipRequiredProseText(value, maxText)
    if (!text || seen.has(text)) continue
    seen.add(text)
    rows.push(text)
    if (rows.length >= maxItems) break
  }
  return rows
}

function compactRequiredProseValue(value: any, depth = 0): any {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string') {
    const text = clipRequiredProseText(value)
    return text || undefined
  }
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) {
    const items = value
      .slice(0, PROSE_CORE_SCENE_LIST_MAX)
      .map(item => compactRequiredProseValue(item, depth + 1))
      .filter(item => item !== undefined)
    return items.length ? items : undefined
  }
  if (depth >= 6) {
    const text = clipRequiredProseText(JSON.stringify(value))
    return text || undefined
  }
  const output: Record<string, any> = {}
  for (const [key, item] of Object.entries(value)) {
    if (/(?:^|_)(?:diagnostic|diagnostics|audit_log|raw_payload|debug|trace|sync)(?:$|_)/i.test(key)) continue
    const next = compactRequiredProseValue(item, depth + 1)
    if (next !== undefined) output[key] = next
  }
  return Object.keys(output).length ? output : undefined
}

export function projectSceneCardForProseCorePrompt(card: any) {
  if (!card || typeof card !== 'object') return {}
  const action = clipRequiredProseText(
    card.action || card.protagonist_action || card.protagonistAction,
  )
  const turn = clipRequiredProseText(
    card.turn || card.turning_point || card.turningPoint,
  )
  const payoff = clipRequiredProseText(
    card.payoff || card.reader_payoff || card.readerPayoff,
  )
  const stateDelta = clipRequiredProseText(card.state_delta || card.stateDelta)
  const goal = clipRequiredProseText(firstRequiredProseText(
    card.goal,
    card.scene_goal,
    card.sceneGoal,
    card.purpose,
    card.summary,
    card.title,
  ), 360)
  const conflict = clipRequiredProseText(firstRequiredProseText(
    card.conflict,
    card.obstacle,
    card.opposing_force,
    card.opposingForce,
  ))
  const expectedStateChange = clipRequiredProseText(firstRequiredProseText(
    card.expected_state_change,
    card.expectedStateChange,
    card.event_value_change,
    card.eventValueChange,
  ))
  const characters = uniqueRequiredProseTexts(
    asArray(card.characters || card.cast || card.character_names || card.characterNames)
      .map((item: any) => (typeof item === 'string' ? item : item?.name || item?.title || item?.label)),
    8,
    40,
  )
  const mustDeliver = uniqueRequiredProseTexts(
    [
      ...asArray(card.must_deliver || card.mustDeliver),
      ...asArray(card.required_actions || card.requiredActions),
      ...asArray(card.serial_risk_repairs || card.serialRiskRepairs),
    ],
    6,
    220,
  )
  const stateChanges = uniqueRequiredProseTexts(
    asArray(card.state_changes_expected || card.stateChangesExpected),
    6,
    220,
  )
  const projected: Record<string, any> = {
    scene_no: card.scene_no ?? card.sceneNo,
    title: clipRequiredProseText(card.title, 80),
    goal,
    conflict,
    action,
    turn,
    payoff,
    state_delta: stateDelta,
    characters: characters.length ? characters : undefined,
    protagonist_agency_action: clipRequiredProseText(
      card.protagonist_agency_action || card.protagonistAgencyAction || card.agency_action || card.agencyAction,
    ),
    no_exit_reason: clipRequiredProseText(card.no_exit_reason || card.noExitReason),
    expected_state_change: expectedStateChange
      && !(stateDelta && (stateDelta.includes(expectedStateChange) || expectedStateChange.includes(stateDelta)))
      ? expectedStateChange
      : undefined,
    state_changes_expected: stateChanges.length ? stateChanges : undefined,
    transition_from_previous: clipRequiredProseText(
      card.transition_from_previous || card.transitionFromPrevious,
      320,
    ),
    next_conflict_seed: clipRequiredProseText(
      card.next_conflict_seed || card.nextConflictSeed || card.ending_hook_seed || card.endingHookSeed,
      240,
    ),
    recent_fatigue_action: clipRequiredProseText(card.recent_fatigue_action || card.recentFatigueAction),
    must_deliver: mustDeliver.length ? mustDeliver : undefined,
    key_dialogue: clipRequiredProseText(card.key_dialogue || card.keyDialogue, 180),
    forbidden_settings: uniqueRequiredProseTexts(card.forbidden_settings || card.forbiddenSettings, 4, 120),
    // Preserve nested causal facts for writing; do not re-expand enrichment/debug trees.
    required_information: requiredProseSceneCardValue(card.required_information || card.requiredInformation),
    pov_character: clipRequiredProseText(card.pov_character || card.povCharacter || card.pov_lens?.pov_character || card.povLens?.pov_character, 40),
    decision_in_scene: clipRequiredProseText(card.decision_in_scene || card.decisionInScene || card.pov_lens?.decision_in_scene || card.povLens?.decision_in_scene, 180),
    emotion_in_situation: clipRequiredProseText(card.emotion_in_situation || card.emotionInSituation || card.pov_lens?.emotion_from_pov || card.povLens?.emotion_from_pov, 140),
    emotion_tell: clipRequiredProseText(card.emotion_tell || card.emotionTell || card.pov_lens?.emotion_tell || card.povLens?.emotion_tell, 160),
    pov_lens: requiredProseSceneCardValue(card.pov_lens || card.povLens),
  }

  // Drop empty values so repeated empty enrichment fields do not inflate JSON.
  const cleaned: Record<string, any> = {}
  for (const [key, value] of Object.entries(projected)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value) && value.length === 0) continue
    cleaned[key] = value
  }
  return cleaned
}

export function projectSceneCardsForProseCorePrompt(cards: any[]) {
  return asArray(cards)
    .map(projectSceneCardForProseCorePrompt)
    .filter(card => card && typeof card === 'object' && Object.keys(card).length > 0)
}

export function proseContractValue(context: any, key: string) {
  return getContextContract(context, `${key}_contract`)
}

export function buildRequiredProseCoreSections(
  project: any,
  contract: ProseGenerationContract,
): ProseRequiredPromptSection[] {
  const context: any = contract.context || {}
  const target: any = mergedContextChapterTargetPreferRuntime(context)
  const previousHandoff = contract.chapter.previous_handoff || buildPreviousChapterHandoff(context)
  const sceneCards = projectSceneCardsForProseCorePrompt(asArray(contract.chapter.scene_cards).map(requiredProseSceneCard))
  const failedChecks = asArray(contract.preflight?.checks)
    .filter((item: any) => item?.ok === false)
    .map((item: any) => ({
      key: item?.key,
      severity: item?.severity,
      label: item?.label,
      fix: item?.fix,
    }))
  const launchGate = context?.chapter_launch_gate
    || context?.chapterLaunchGate
    || target?.chapter_launch_gate
    || target?.chapterLaunchGate
    || null
  const coreRadar = target?.core_contract_radar || target?.coreContractRadar || {}
  const chapterBlueprint = target?.chapter_blueprint || target?.chapterBlueprint || {}
  const writingBible = context?.writing_bible || context?.writingBible || {}
  const styleBoundary = proseContractValue(context, 'style_boundary')
  const longformCompass = target?.longform_compass || target?.longformCompass || context?.longform_compass || context?.longformCompass || {}
  const longformBattle = target?.longform_battle_context || target?.longformBattleContext || context?.longform_battle_context || context?.longformBattleContext || {}
  const nextBatchBrief = target?.next_batch_brief || target?.nextBatchBrief || context?.next_batch_brief || context?.nextBatchBrief || {}
  const deliveryRisk = target?.delivery_risk_carry_over || target?.deliveryRiskCarryOver || context?.delivery_risk_carry_over || context?.deliveryRiskCarryOver || {}
  const millionWordRunway = target?.million_word_runway || target?.millionWordRunway || context?.million_word_runway || context?.millionWordRunway || {}
  const nextBatchChapters = asArray(nextBatchBrief?.chapters).map((chapter: any) => ({
    chapter_no: chapter?.chapter_no ?? chapter?.chapterNo,
    title: chapter?.title,
    chapter_task: chapter?.chapter_task || chapter?.chapterTask,
    conflict: chapter?.conflict,
    ending_hook: chapter?.ending_hook || chapter?.endingHook,
    mainline_progress: chapter?.mainline_progress || chapter?.mainlineProgress,
  }))
  const corePromise = {
    reader_promise: coreRadar?.reader_promise
      || coreRadar?.readerPromise
      || writingBible?.reader_promise
      || writingBible?.readerPromise
      || writingBible?.promise
      || '',
    core_conflict: coreRadar?.core_conflict
      || coreRadar?.coreConflict
      || writingBible?.core_conflict
      || writingBible?.coreConflict
      || writingBible?.mainline?.core_conflict
      || '',
    mainline_service: chapterBlueprint?.plot_lines?.mainline
      || chapterBlueprint?.plotLines?.mainline
      || target?.mainline_service
      || target?.mainlineService
      || contract.chapter.summary
      || '',
    protagonist_agency: chapterBlueprint?.writing_intent
      || chapterBlueprint?.writingIntent
      || target?.protagonist_agency
      || target?.protagonistAgency
      || '关键结果必须来自主角可见选择和行动',
    style_boundary: styleBoundary?.hard_constraints
      || styleBoundary?.hardConstraints
      || context?.style_lock
      || context?.styleLock
      || {},
    core_contract_radar: {
      reader_promise: coreRadar?.reader_promise || coreRadar?.readerPromise,
      core_conflict: coreRadar?.core_conflict || coreRadar?.coreConflict,
      must_serve: asArray(coreRadar?.must_serve || coreRadar?.mustServe),
      no_drift: asArray(coreRadar?.no_drift || coreRadar?.noDrift),
    },
    request_longform_compass: {
      reader_promise: longformCompass?.reader_promise || longformCompass?.readerPromise,
      core_conflict: longformCompass?.core_conflict || longformCompass?.coreConflict,
      must_serve: asArray(longformCompass?.must_serve || longformCompass?.mustServe),
      no_drift: asArray(longformCompass?.no_drift || longformCompass?.noDrift || longformCompass?.red_lines || longformCompass?.redLines),
    },
    request_longform_battle: {
      core_guard: longformBattle?.core_guard || longformBattle?.coreGuard,
      blocked_risks: asArray(longformBattle?.blocked_risks || longformBattle?.blockedRisks),
      required_actions: asArray(longformBattle?.required_actions || longformBattle?.requiredActions),
    },
    request_batch_role: {
      batch_goal: nextBatchBrief?.batch_goal || nextBatchBrief?.batchGoal,
      current_chapter_role: nextBatchBrief?.current_chapter_role || nextBatchBrief?.currentChapterRole,
      must_deliver: asArray(nextBatchBrief?.must_deliver || nextBatchBrief?.mustDeliver),
      ...(nextBatchChapters.length ? { chapters: nextBatchChapters } : {}),
    },
    request_delivery_risk: {
      quality_focus: asArray(deliveryRisk?.quality_focus || deliveryRisk?.qualityFocus),
      opening_actions: asArray(deliveryRisk?.opening_actions || deliveryRisk?.openingActions),
      middle_actions: asArray(deliveryRisk?.middle_actions || deliveryRisk?.middleActions),
      ending_actions: asArray(deliveryRisk?.ending_actions || deliveryRisk?.endingActions),
      avoid_repetition: asArray(deliveryRisk?.avoid_repetition || deliveryRisk?.avoidRepetition || deliveryRisk?.forbidden_repeats || deliveryRisk?.forbiddenRepeats),
    },
    request_million_word_runway: {
      mode: millionWordRunway?.mode,
      four_questions: asArray(millionWordRunway?.four_questions || millionWordRunway?.fourQuestions),
      reader_fuel: asArray(millionWordRunway?.reader_fuel || millionWordRunway?.readerFuel),
      red_lines: asArray(millionWordRunway?.red_lines || millionWordRunway?.redLines),
    },
  }
  const directorSnapshot = {
    readiness: contract.director?.readiness,
    primary_action: contract.director?.primary_action || contract.director?.primaryAction,
    required_repairs: asArray(contract.director?.required_repairs || contract.director?.requiredRepairs),
    selected_contracts: asArray(contract.director?.selected_contracts || contract.director?.selectedContracts).slice(0, 4),
  }

  return [
    {
      key: 'task',
      text: [
        '任务：只生成当前目标章节的完整简体中文小说正文。',
        '正文优先于回执；不得输出分析、任务说明、工程字段或其他章节。',
      ],
    },
    {
      key: 'chapter',
      text: [
        `作品：${requiredProsePromptText(project?.title || '')}`,
        `章节：第${contract.chapter.chapter_no}章《${requiredProsePromptText(contract.chapter.title || '无标题')}》`,
        `目标：${clipRequiredProseText(contract.chapter.goal || contract.chapter.summary, 420)}`,
        `冲突：${clipRequiredProseText(contract.chapter.conflict, 240)}`,
        `读者回报：${clipRequiredProseText(target?.reader_payoff || target?.readerPayoff || target?.core_payoff || target?.corePayoff, 240)}`,
        `章末钩子：${clipRequiredProseText(contract.chapter.ending_hook, 240)}`,
        `字数：${requiredProsePromptJson(contract.chapter.word_target || {})}`,
      ],
    },
    {
      key: 'writing-precision',
      text: (() => {
        const plan = buildWritingPrecisionPlan({
          contextPackage: context,
          chapterDraft: {
            chapter_no: contract.chapter.chapter_no,
            title: contract.chapter.title,
            chapter_goal: contract.chapter.goal,
            summary: contract.chapter.summary,
            conflict: contract.chapter.conflict,
            ending_hook: contract.chapter.ending_hook,
          },
          wordTarget: contract.chapter.word_target,
          modelRuntime: context?.runtime_model || context?.model_runtime || null,
          modelFamilyStrategy: context?.model_family_strategy || null,
        })
        return formatWritingPrecisionPrompt(plan)
      })(),
    },
    {
      key: 'handoff',
      text: previousHandoff
        ? ['【上一章尾段承接】', requiredProsePromptText(previousHandoff)]
        : [],
    },
    {
      key: 'scene-causality',
      text: ['【场景卡因果链】', requiredProsePromptJson({ scene_cards: sceneCards })],
    },
    {
      key: 'gate',
      text: [
        '【开写门禁通过快照】',
        requiredProsePromptJson({
          preflight: {
            ready: contract.preflight?.ready,
            strict_ready: contract.preflight?.strict_ready,
            failed_checks: failedChecks,
          },
          director: directorSnapshot,
          chapter_launch_gate: launchGate,
        }),
      ],
    },
    {
      key: 'core-promise',
      text: ['【不可变核心承诺】', requiredProsePromptJson(corePromise)],
    },
    {
      key: 'safety-style',
      text: [
        '不得新增上下文没有授权的事实；真实职业、法律、医疗、技术和地理事实不确定时改成架空或待验证线索。',
        '不得出现 prompt、合同、回执、字段名、读者分析、“上一章/本章”等写作工程语言。',
        '不得复制参考样章原句、专名或桥段；只迁移抽象节奏和功能。',
        '正文按动作、对话、情绪反应与后续动作推进；关键场景必须有目标、阻碍、选择、代价和状态变化。',
      ],
    },
    {
      key: 'output',
      text: [
        `输出 JSON：{"prose_chapters":[{"chapter_no":${contract.chapter.chapter_no},"title":"章节标题","chapter_text":"完整正文","scene_breakdown":[],"continuity_notes":[]}]}。`,
        'prose_chapters 只能有一项；chapter_text 不含 Markdown 标题、解释或附录。',
      ],
    },
  ]
}

export function buildProseRiskContractSections(context: any): ProseRiskPromptSection[] {
  const target = mergedContextChapterTargetPreferRuntime(context)
  const sections = new Map<string, ProseRiskPromptSection>()
  const add = (key: string, lines: string | string[]) => {
    const section = proseRiskSection(key, lines)
    if (section) sections.set(normalizeProseContractKey(key), section)
  }
  const contract = (key: string) => proseContractValue(context, key)

  add('platform_rubric', buildPlatformRubricPromptSection(target?.platform_rubric || target?.platformRubric))
  add('content_rubric', buildContentRubricPromptSection(target?.content_rubric || target?.contentRubric))
  add('target_reader', buildTargetReaderPromptSection(contract('target_reader')))
  add('reader_contract_progression', buildReaderContractProgressionPromptSection(target?.reader_contract_progression || target?.readerContractProgression || context?.reader_contract_progression || context?.writing_bible?.reader_contract_progression))
  add('genre_prose_card', buildGenreProseCardPromptSection(target?.genre_prose_card_contract || target?.genreProseCardContract || context?.genre_prose_card_contract || context?.writing_bible?.genre_prose_card_contract))
  add('genre_positioning', buildGenrePositioningPromptSection(contract('genre_positioning')))
  add('plot_special_topics', buildPlotSpecialTopicsPromptSection(contract('plot_special_topics')))
  add('female_audience', buildFemaleAudiencePromptSection(contract('female_audience')))
  add('upgrade_rhythm', buildUpgradeRhythmPromptSection(contract('upgrade_rhythm')))
  add('conflict_structure', buildConflictStructurePromptSection(contract('conflict_structure')))
  add('story_loop', buildStoryLoopPromptSection(contract('story_loop')))
  add('emotional_arc', buildEmotionalArcPromptSection(contract('emotional_arc')))
  add('chapter_hook', buildChapterHookPromptSection(contract('chapter_hook')))
  add('paragraph_hook', buildParagraphHookPromptSection(contract('paragraph_hook')))
  add('suspense', buildSuspensePromptSection(contract('suspense')))
  add('reversal', buildReversalPromptSection(contract('reversal')))
  add('showdown', buildShowdownPromptSection(contract('showdown')))
  add('bridge_unit', buildBridgeUnitPromptSection(contract('bridge_unit')))
  add('plot_framework', buildPlotFrameworkPromptSection(contract('plot_framework')))
  add('opening', buildOpeningPromptSection(contract('opening')))
  add('prose_craft', buildProseCraftPromptSection(contract('prose_craft')))
  add('punctuation_tone', buildPunctuationTonePromptSection(contract('punctuation_tone')))
  add('quality_audit', buildQualityAuditPromptSection(contract('quality_audit')))
  add('dialogue', buildDialoguePromptSection(contract('dialogue')))
  add('plot_dynamics', buildPlotDynamicsPromptSection(contract('plot_dynamics')))
  add('story_power', buildStoryPowerPromptSection(contract('story_power')))
  add('continuity_heat', buildContinuityHeatPromptSection(contract('continuity_heat')))
  add('character_relation', buildCharacterRelationPromptSection(contract('character_relation')))
  add('character_behavior', buildCharacterBehaviorPromptSection(contract('character_behavior')))
  add('asset_linkage', buildAssetLinkagePromptSection(
    contract('asset_linkage'),
    asArray(contract('asset_linkage')?.relationship_graph_risks || contract('asset_linkage')?.relationshipGraphRisks),
  ))
  add('state_tracking', buildStateTrackingPromptSection(contract('state_tracking')))
  add('intent_confirmation', buildIntentConfirmationPromptSection(contract('intent_confirmation')))
  add('benchmark_recall', buildBenchmarkRecallPromptSection(target?.benchmark_recall_brief || target?.benchmarkRecallBrief))
  add('style_boundary', buildStyleBoundaryPromptSection(contract('style_boundary')))
  add('information_flow', buildInformationFlowPromptSection(contract('information_flow')))
  add('expectation_threshold', buildExpectationThresholdPromptSection(contract('expectation_threshold')))
  add('delivery_risk', buildDeliveryRiskCarryOverPromptSection(target?.delivery_risk_carry_over || target?.deliveryRiskCarryOver))
  add('longform_structure', [
    ...buildLongformCompassPromptSection(target?.longform_compass || target?.longformCompass || context?.longform_compass || context?.longformCompass),
    ...buildLongformBattleContextPromptSection(target?.longform_battle_context || target?.longformBattleContext || context?.longform_battle_context || context?.longformBattleContext),
  ])
  add('longform_battle', buildLongformBattleContextPromptSection(target?.longform_battle_context || target?.longformBattleContext || context?.longform_battle_context || context?.longformBattleContext))
  add('governance_recheck', buildGovernanceRecheckPromptSection(target?.governance_recheck_memory || target?.governanceRecheckMemory))
  add('fact_setting_safety', [
    '【事实与设定安全边界】',
    prosePromptJson({
      setting_context: context?.setting_context || context?.settingContext || {},
      continuity: context?.continuity || {},
    }, 3200),
  ])

  const rawSources = [target, context, context?.pre_draft_brief, context?.preDraftBrief]
  for (const source of rawSources) {
    for (const [field, value] of Object.entries(source || {})) {
      if (!/(?:_contract|Contract)$/.test(field) || !value) continue
      const key = normalizeProseContractKey(field)
      if (sections.has(key)) continue
      add(key, [`【${key}】`, prosePromptJson(value, 3200)])
    }
  }
  return Array.from(sections.values())
}

export function compileParagraphProseContext(
  project: any,
  generationContractOrContext: ProseGenerationContract | any,
  migrationPlan: any = null,
  _chapterDraft: any = null,
) {
  const contract = generationContractOrContext?.version === 'prose_generation_contract_v1'
    ? generationContractOrContext as ProseGenerationContract
    : buildProseGenerationContract(attachOhStoryDirectorToContextPackage(generationContractOrContext || {}))
  const requiredSections = buildRequiredProseCoreSections(project, contract)
  if (migrationPlan?.generation_prompt_addendum) {
    requiredSections.splice(requiredSections.length - 1, 0, {
      key: 'reference-migration-boundary',
      text: prosePromptText(migrationPlan.generation_prompt_addendum, 700),
    })
  }
  return compileProseContractPrompt({
    requiredSections,
    contractSections: buildProseRiskContractSections(contract.context),
    director: contract.director,
  })
}

export function mergedContextChapterTarget(contextPackage: any = {}) {
  return mergedContextChapterTargetPreferRuntime(contextPackage)
}

export function mergedContextChapterTargetPreferRuntime(contextPackage: any = {}) {
  const runtimeTarget = contextPackage?.chapterTarget || {}
  const merged = {
    ...(contextPackage?.chapter_target || {}),
    ...runtimeTarget,
  }
  const runtimeHas = (field: string) => Object.prototype.hasOwnProperty.call(runtimeTarget, field) && runtimeTarget[field] !== undefined
  const aliasPairs = [
    ['chapterNo', 'chapter_no'],
    ['endingHook', 'ending_hook'],
    ['previousHandoff', 'previous_handoff'],
    ['wordTarget', 'word_target'],
    ['sceneCards', 'scene_cards'],
  ]
  for (const [camelField, snakeField] of aliasPairs) {
    if (!runtimeHas(camelField)) continue
    if (camelField === 'sceneCards') {
      merged[snakeField] = normalizeSceneCardsPayload(
        { sceneCards: runtimeTarget[camelField] },
        { ...contextPackage, chapter_target: merged },
      )
      continue
    }
    merged[snakeField] = runtimeTarget[camelField]
  }
  return merged
}

export function buildMissingStructuredReviewChecksPrompt(project: any, contextPackage: any, chapterText: string, review: any, missingFields: string[]) {
  const failedDeliveryRiskReceipts = asArray(review?.delivery_risk_receipts || review?.deliveryRiskReceipts)
    .filter((receipt: any) => receipt?.delivered === false || revisionReceiptRemainingRisk(receipt))
    .slice(0, 8)
  const fieldHints = missingFields.map(field => `${field}: ${(STRUCTURED_REVIEW_REQUIRED_FIELDS[field] || ['key', 'label', 'status', 'evidence', 'fix', 'remaining_risk']).join(', ')}`)
  return [
    '任务：只补缺失的 oh-story 结构化自检字段，不改正文，不输出正文。',
    `作品标题：${project.title}`,
    '你正在给上一轮审稿补表。上一轮审稿没有输出部分 oh-story 自检数组，导致门禁无法判断。请只针对 missing_fields 输出对应数组。',
    '判断原则：必须用【待审校正文】里的可定位证据做 pass/warn/fail；证据不足就 warn/fail，并给出具体 fix。不要因为字段缺失而继续输出 missing_* 占位。',
    'delivery_risk_receipts 如果存在未闭环项，必须逐项判断正文是否已经兑现；兑现时 delivered=true 且 evidence 引用正文原句，未兑现时 delivered=false 且 remaining_risk 写下一轮必须补的动作。',
    '',
    'missing_fields:',
    JSON.stringify(missingFields, null, 2),
    '',
    '字段要求:',
    fieldHints.join('\n'),
    '',
    '【上一轮缺口摘要】',
    JSON.stringify({
      missing_fields: missingFields,
      failed_delivery_risk_receipts: failedDeliveryRiskReceipts,
      next_chapter_quality_plan_receipts: review?.next_chapter_quality_plan_receipts || review?.nextChapterQualityPlanReceipts || [],
      quality_audit_checks: asArray(review?.quality_audit_checks || review?.qualityAuditChecks).filter(isMissingStructuredReviewCheck),
    }, null, 2).slice(0, 5000),
    '',
    '【结构化上下文包】',
    prosePromptJson(buildProsePromptContextSnapshot(contextPackage), 7000),
    '',
    '【待审校正文】',
    chapterText.slice(0, 14000),
    '',
    '只返回 JSON。JSON 顶层只需要包含 missing_fields 中列出的数组；如需要，也可包含 delivery_risk_receipts、next_chapter_quality_plan_receipts、passed、score、needs_revision、issues。不得返回 markdown，不得返回正文。',
  ].join('\n')
}


const OPENING_HOOK_SIGNAL_PATTERN = /死|血|痛|伤|尸|刀|枪|火|爆炸|撞|追|逃|杀|危险|禁止|规则|警报|广播|倒计时|失控|突然|必须|不能|威胁|逼|发现|选择|代价|冲突|问题|门响|敲门|尖叫|喊|吼|问|[？！!?“「]/
const OPENING_PROTAGONIST_ACTION_PATTERN = /(?:我|他|她|少年|少女|男人|女人|孩子|学生|弟子|队长|警员|医生|老师|父亲|母亲|哥哥|姐姐|妹妹|弟弟|[赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹][一-龥]{1,3})(?:[^。！？!?]{0,18})(?:醒|坐起|站起|抬头|低头|睁眼|闭眼|回头|转身|伸手|抓|握|按|推|拉|跑|冲|退|躲|跪|看见|听见|发现|开口|说道|问|喊|吼|笑|咬|攥|拿|递|打开|关上|盯|望|摸|踢|撞|撕|挡|拦|选择|决定)/
const OPENING_NON_PROTAGONIST_SUBJECT_PATTERN = /^(?:广播|警报|铃声|校规|规则|名单|红光|黑点|钟声|楼梯|安全门|规则册|惩罚栏|雨水|风|门|窗|灯|走廊|教学楼|宿舍|城市|天空|月光|阳光)/

export function compactJsonBriefText(value: any, fallback = '') {
  if (typeof value === 'string') return compactBriefText(value, fallback)
  return compactBriefText(safeJsonStringify(value, undefined, 1200), fallback)
}

const CHARACTER_REPAIR_TIER_LIMITS = [
  { tier: 'protagonist', limit: 1 },
  { tier: 'antagonist_primary', limit: 1 },
  { tier: 'primary_supporting', limit: 2 },
  { tier: 'secondary_supporting', limit: 3 },
  { tier: 'cameo_supporting', limit: 3 },
  { tier: 'antagonist_minor', limit: 2 },
  { tier: 'antagonist_arc', limit: 2 },
  { tier: 'faction_agent', limit: 2 },
  { tier: 'supporting', limit: 2 },
]

export function inferCharacterRepairTier(character: any) {
  const raw = compactBriefText([
    character?.tier,
    character?.role_type,
    character?.role,
    character?.identity,
    character?.archetype,
    character?.narrative_function,
    character?.supporting_function,
    character?.raw_payload?.tier,
    character?.raw_payload?.original?.tier,
    character?.raw_payload?.original?.role_type,
  ].filter(Boolean).join(' '))
  const normalized = raw.toLowerCase()
  if (CHARACTER_REPAIR_TIER_LIMITS.some(item => item.tier === normalized)) return normalized
  if (/主角|protagonist|视角/.test(raw)) return 'protagonist'
  if (/核心反派|最终反派|primary.*antagonist|antagonist.*primary|boss|大boss|总boss|antagonist$/i.test(raw)) return 'antagonist_primary'
  if (/阶段反派|分卷反派|arc.*antagonist|antagonist.*arc|阶段对手/i.test(raw)) return 'antagonist_arc'
  if (/小反派|反派配角|minor.*antagonist|antagonist.*minor|局部阻碍|地头蛇|打手|喽啰/i.test(raw)) return 'antagonist_minor'
  if (/势力执行|组织执行|faction.*agent|agent|执事|巡考|守卫|管事|监察|审查/i.test(raw)) return 'faction_agent'
  if (/主要配角|核心配角|primary.*support|support.*primary|队友|搭档|盟友/i.test(raw)) return 'primary_supporting'
  if (/次要配角|secondary.*support|support.*secondary|支线|同学|同事/i.test(raw)) return 'secondary_supporting'
  if (/龙套|功能配角|cameo|walk.?on|证人|路人|摊主|店员|受害者|围观/i.test(raw)) return 'cameo_supporting'
  return 'supporting'
}

export function selectTierAwareCharacterRepairCandidates(candidates: any[] = [], existingCharacters: any[] = []) {
  const existingCounts = new Map<string, number>()
  for (const character of asArray(existingCharacters)) {
    const tier = inferCharacterRepairTier(character)
    existingCounts.set(tier, (existingCounts.get(tier) || 0) + 1)
  }
  const seenNames = new Set<string>()
  const normalizedCandidates = asArray(candidates)
    .map((candidate: any) => {
      const name = compactBriefText(candidate?.name)
      if (!name || seenNames.has(name)) return null
      seenNames.add(name)
      const tier = inferCharacterRepairTier(candidate)
      return {
        ...candidate,
        role_type: compactBriefText(candidate?.role_type || candidate?.role || tier || 'supporting'),
        tier,
        raw_payload: {
          ...(candidate?.raw_payload || {}),
          tier,
        },
      }
    })
    .filter(Boolean) as any[]
  const selected: any[] = []
  const selectedNames = new Set<string>()
  const addCandidate = (candidate: any) => {
    if (!candidate?.name || selectedNames.has(candidate.name) || selected.length >= 12) return
    selectedNames.add(candidate.name)
    selected.push(candidate)
  }
  for (const rule of CHARACTER_REPAIR_TIER_LIMITS) {
    const existingCount = existingCounts.get(rule.tier) || 0
    const availableSlots = Math.max(0, rule.limit - Math.min(existingCount, rule.limit))
    if (availableSlots <= 0) continue
    normalizedCandidates
      .filter(candidate => candidate.tier === rule.tier)
      .slice(0, availableSlots)
      .forEach(addCandidate)
  }
  if (selected.length === 0) normalizedCandidates.slice(0, 6).forEach(addCandidate)
  return selected
}
