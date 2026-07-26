import type {
  AnyRecord,
  WritingCockpitRole,
  WritingCockpitActionKey,
  WritingReadinessStatus,
  WritingReadinessCheck,
  WritingCockpitChapter,
  WritingQueueItemStatus,
  WritingQueueItem,
  WritingQueueModel,
  ChapterPlanningReadiness,
  ChapterContextPackageStatus,
  ChapterScenePlanStatus,
  ChapterPlanningDeskSceneCard,
  ChapterQualityContinuitySceneMapItem,
  ChapterWritePreparationBrief,
  ChapterPlanningDeskModel,
  ChapterAcceptanceStatus,
  DeslopGateDiagnosticsModel,
  ChapterAcceptanceDeskModel,
  ChapterHandoffStatus,
  ChapterHandoffDeskModel,
  LongformWorkflowStageKey,
  LongformWorkflowStageStatus,
  LongformWorkflowStageModel,
  LongformWorkflowModel,
  WritingCockpitModel,
  BuildWritingCockpitModelInput,
} from './types'
import { parseWorkspacePayload } from '../../payloadParseCache'

import {
  arrayValue,
  firstNonEmpty,
  normalizeDeliveryRiskCarryOverPlan,
  stringArray,
  text,
  uniqueObjects,
  uniqueStrings,
} from './cockpit-basics'

export function contextPreflight(contextPackage?: AnyRecord | null) {
  return contextPackage?.preflight || contextPackage?.context_package?.preflight || {}
}

export function contextTarget(contextPackage?: AnyRecord | null) {
  return contextPackage?.chapter_target || contextPackage?.context_package?.chapter_target || {}
}

export function relationshipGraphRiskTexts(contextPackage?: AnyRecord | null) {
  const target = contextTarget(contextPackage)
  const contracts = [
    target?.asset_linkage_contract,
    target?.assetLinkageContract,
    contextPackage?.asset_linkage_contract,
    contextPackage?.assetLinkageContract,
    contextPackage?.pre_draft_brief?.asset_linkage_contract,
    contextPackage?.preDraftBrief?.assetLinkageContract,
  ]
  const explicitRisks = contracts.flatMap(contract => stringArray(contract?.relationship_graph_risks || contract?.relationshipGraphRisks))
  const graph = contextPackage?.relationship_graph
    || contextPackage?.relationshipGraph
    || contextPackage?.setting_relationship_graph
    || contextPackage?.settingRelationshipGraph
    || contextPackage?.setting_context?.relationship_graph
    || contextPackage?.settingContext?.relationshipGraph
  const diagnosticRisks = arrayValue(graph?.diagnostics)
    .filter(item => ['isolated_key_asset', 'missing_owner', 'dangling_relation', 'owner_ability_mismatch'].includes(String(item?.type || '')))
    .map(item => {
      const name = firstNonEmpty(item?.entity_name, item?.entityName, item?.source_name, item?.sourceName, item?.target_name, item?.targetName)
      const message = firstNonEmpty(item?.message, item?.detail, item?.reason, item?.label)
      return [name, message].filter(Boolean).join('：')
    })
    .filter(Boolean)
  return Array.from(new Set([...explicitRisks, ...diagnosticRisks])).slice(0, 6)
}

export function contextContractCandidates(contextPackage: AnyRecord, snakeKey: string, camelKey: string): AnyRecord[] {
  const layers = uniqueObjects([
    contextPackage,
    contextPackage.context_package,
    contextPackage.contextPackage,
  ])
  const targets = uniqueObjects(layers.flatMap(layer => [
    layer.chapter_target,
    layer.chapterTarget,
  ]))
  const preDraftBriefs = uniqueObjects([...targets, ...layers].flatMap(source => [
    source.pre_draft_brief,
    source.preDraftBrief,
  ]))
  return uniqueObjects([...targets, ...layers, ...preDraftBriefs].flatMap(source => [
    source[snakeKey],
    source[camelKey],
  ]))
}

export function sourceGapTextsFromStateTracking(contract: AnyRecord = {}) {
  return [
    ...arrayValue(contract?.source_readiness),
    ...arrayValue(contract?.sourceReadiness),
  ]
    .filter(row => !['ready', 'optional', 'pass', 'ok'].includes(String(row?.status || '').toLowerCase()))
    .map(row => [firstNonEmpty(row?.label, row?.key), row?.status ? `状态=${row.status}` : '', row?.evidence]
      .filter(Boolean)
      .join('｜'))
    .map(item => text(item))
    .filter(Boolean)
}

export function normalizeWritePreparationBrief(contextPackage?: AnyRecord | null): ChapterWritePreparationBrief | null {
  if (!contextPackage) return null
  const target = contextTarget(contextPackage)
  const rawCandidates = contextContractCandidates(contextPackage, 'write_preparation_brief', 'writePreparationBrief')
  const hasRaw = rawCandidates.some(raw => Object.keys(raw).length > 0)
  const stateTrackingContracts = contextContractCandidates(contextPackage, 'state_tracking_contract', 'stateTrackingContract')
  const chapterBlueprint = target?.chapter_blueprint
    || target?.chapterBlueprint
    || contextPackage?.chapter_blueprint
    || contextPackage?.chapterBlueprint
    || contextPackage?.pre_draft_brief?.chapter_blueprint
    || contextPackage?.preDraftBrief?.chapterBlueprint
    || {}
  const readerRetentionBrief = target?.reader_retention_brief
    || target?.readerRetentionBrief
    || contextPackage?.reader_retention_brief
    || contextPackage?.readerRetentionBrief
    || contextPackage?.pre_draft_brief?.reader_retention_brief
    || contextPackage?.preDraftBrief?.readerRetentionBrief
    || {}
  const deliveryRiskCarryOver = normalizeDeliveryRiskCarryOverPlan(contextPackage, target)
  const endingContract = chapterBlueprint?.ending_contract || chapterBlueprint?.endingContract || {}
  const sourceGaps = uniqueStrings([
    ...rawCandidates.flatMap(raw => [
      ...stringArray(raw?.source_gaps),
      ...stringArray(raw?.sourceGaps),
    ]),
    ...stateTrackingContracts.flatMap(sourceGapTextsFromStateTracking),
  ]).slice(0, 8)
  const assetRisks = uniqueStrings([
    ...rawCandidates.flatMap(raw => [
      ...stringArray(raw?.asset_risks),
      ...stringArray(raw?.assetRisks),
    ]),
    ...relationshipGraphRiskTexts(contextPackage),
  ]).slice(0, 8)
  const deliveryRiskActions = uniqueStrings([
    ...rawCandidates.flatMap(raw => [
      ...stringArray(raw?.delivery_risk_actions),
      ...stringArray(raw?.deliveryRiskActions),
    ]),
    ...deliveryRiskCarryOver.requiredActions,
    ...deliveryRiskCarryOver.forbiddenRepeats.map(item => `禁用重复：${item}`),
  ]).slice(0, 8)
  const blueprintFocus = uniqueStrings([
    ...rawCandidates.flatMap(raw => [
      ...stringArray(raw?.blueprint_focus),
      ...stringArray(raw?.blueprintFocus),
    ]),
    chapterBlueprint?.opening_hook ? `开篇钩子：${text(chapterBlueprint.opening_hook)}` : '',
    chapterBlueprint?.core_payoff ? `核心回报：${text(chapterBlueprint.core_payoff)}` : '',
    chapterBlueprint?.target_emotion ? `目标情绪：${text(chapterBlueprint.target_emotion)}` : '',
    firstNonEmpty(endingContract?.next_chapter_pull, endingContract?.nextChapterPull)
      ? `章尾拉力：${firstNonEmpty(endingContract?.next_chapter_pull, endingContract?.nextChapterPull)}`
      : '',
    chapterBlueprint?.writing_intent ? `写作意图：${text(chapterBlueprint.writing_intent)}` : '',
  ]).slice(0, 8)
  const readerPayoffFocus = uniqueStrings([
    ...rawCandidates.flatMap(raw => [
      ...stringArray(raw?.reader_payoff_focus),
      ...stringArray(raw?.readerPayoffFocus),
    ]),
    ...stringArray([
      readerRetentionBrief?.opening_hook,
      readerRetentionBrief?.hook_signal,
      readerRetentionBrief?.reader_payoff,
      readerRetentionBrief?.ending_pull,
      readerRetentionBrief?.page_turn_question,
      readerRetentionBrief?.core_question,
    ]),
    ...stringArray(readerRetentionBrief?.must_deliver || readerRetentionBrief?.mustDeliver),
  ]).slice(0, 8)
  const mustConfirm = uniqueStrings([
    ...rawCandidates.flatMap(raw => [
      ...stringArray(raw?.must_confirm),
      ...stringArray(raw?.mustConfirm),
    ]),
    ...sourceGaps.map(item => `来源就绪：${item}`),
    ...assetRisks.map(item => `关系图风险：${item}`),
    ...deliveryRiskActions,
    ...blueprintFocus.slice(0, 2),
    ...readerPayoffFocus.slice(0, 2).map(item => `读者回报：${item}`),
  ]).slice(0, 14)
  const hasNonAssetDerivedContent = Boolean(
    sourceGaps.length
    || deliveryRiskActions.length
    || blueprintFocus.length
    || readerPayoffFocus.length
    || (hasRaw && mustConfirm.length),
  )
  const hasDerivedContent = Boolean(hasNonAssetDerivedContent || assetRisks.length)
  const executionOrder = uniqueStrings([
    ...rawCandidates.flatMap(raw => [
      ...stringArray(raw?.execution_order),
      ...stringArray(raw?.executionOrder),
    ]),
    ...(hasRaw || hasDerivedContent
      ? [
          '先确认来源就绪：上一章承接、角色状态、伏笔/时间线和世界约束只保留会影响本章正确性的内容。',
          '再锁定章节蓝图：目标、冲突、开篇钩子、核心回报、代价和章尾拉力。',
          '再处理资产与状态：关系图风险、关键资产归属/触发/代价、角色状态变化必须接到现场功能。',
          '最后生成正文：按场景卡顺序写可见行动、对话压力、信息变化和回执证据。',
        ]
      : []),
  ]).slice(0, 4)
  if (!hasRaw && !hasDerivedContent && !executionOrder.length) return null
  const readinessStatus: ChapterWritePreparationBrief['readinessStatus'] = sourceGaps.length > 0
    ? 'needs_context'
    : 'ready'
  return {
    readinessStatus,
    sourceGaps,
    assetRisks,
    deliveryRiskActions,
    blueprintFocus,
    readerPayoffFocus,
    mustConfirm,
    executionOrder,
  }
}

export function writePreparationReasonTexts(brief: ChapterWritePreparationBrief | null): string[] {
  if (!brief) return []
  return [
    ...brief.sourceGaps.map(item => `来源缺口：${item}`),
    ...brief.assetRisks.map(item => `关系图风险：${item}`),
    ...brief.deliveryRiskActions.map(item => `交稿动作：${item}`),
  ]
}

export function blockerTexts(value: any): string[] {
  if (!Array.isArray(value)) return []
  return value.map(item => {
    if (typeof item === 'string') return text(item)
    return firstNonEmpty(item?.message, item?.reason, item?.detail, item?.label)
  }).filter(Boolean)
}

export function contextPackageStatus(contextPackage?: AnyRecord | null): ChapterContextPackageStatus {
  if (!contextPackage) return 'missing'
  const preflight = contextPreflight(contextPackage)
  const hasPreflight = Boolean(contextPackage.preflight || contextPackage.context_package?.preflight)
  const target = contextTarget(contextPackage)
  const blockers = blockerTexts(preflight?.blockers)
  if (
    (hasPreflight && preflight?.ready !== true)
    || preflight?.strict_ready === false
    || preflight?.strictReady === false
    || blockers.length > 0
  ) return 'insufficient'
  const hasTarget = Boolean(
    firstNonEmpty(target?.chapter_goal, target?.chapterObjective, target?.goal, target?.summary)
    && firstNonEmpty(target?.core_conflict, target?.coreConflict, target?.conflict)
    && firstNonEmpty(target?.ending_hook, target?.endingHook),
  )
  if (preflight?.ready === true || hasTarget) return 'ready'
  return 'insufficient'
}

export function diagnosticsBlockers(diagnostics?: AnyRecord | null): string[] {
  const preflight = diagnostics?.preflight || {}
  return blockerTexts(preflight?.blockers)
}

export function rawChapterSceneCards(chapter?: AnyRecord | null, contextPackage?: AnyRecord | null): AnyRecord[] {
  if (Array.isArray(chapter?.scene_list) && chapter.scene_list.length > 0) return chapter.scene_list
  if (Array.isArray(chapter?.scene_breakdown) && chapter.scene_breakdown.length > 0) return chapter.scene_breakdown

  const target = contextTarget(contextPackage)
  const contextCandidates = [
    target?.scene_cards,
    target?.sceneCards,
    contextPackage?.scene_cards,
    contextPackage?.sceneCards,
    contextPackage?.pre_draft_brief?.scene_cards,
    contextPackage?.pre_draft_brief?.sceneCards,
    contextPackage?.preDraftBrief?.scene_cards,
    contextPackage?.preDraftBrief?.sceneCards,
  ]
  return contextCandidates.find(candidate => Array.isArray(candidate) && candidate.length > 0) || []
}

export function chapterSceneCards(chapter?: AnyRecord | null, contextPackage?: AnyRecord | null): ChapterPlanningDeskSceneCard[] {
  const rawCards = rawChapterSceneCards(chapter, contextPackage)
  return rawCards.map((scene: AnyRecord, index: number) => {
    const sceneNo = Number(scene?.scene_no)
    const card = {
      sceneNo: Number.isFinite(sceneNo) && sceneNo > 0 ? sceneNo : index + 1,
      title: text(scene?.title || scene?.name || scene?.description || scene?.purpose, `场景 ${index + 1}`),
      purpose: firstNonEmpty(scene?.purpose, scene?.description, scene?.goal),
      conflict: firstNonEmpty(scene?.conflict, scene?.tension),
      turn: firstNonEmpty(scene?.turn, scene?.reveal, scene?.beat),
      endingHook: firstNonEmpty(scene?.ending_hook, scene?.endingHook, scene?.exit_state, scene?.hook),
      requiredBeats: stringArray(scene?.required_beats || scene?.requiredBeats || scene?.beats),
      stateChangesExpected: stringArray(scene?.state_changes_expected || scene?.stateChangesExpected),
      serialRiskRepairs: stringArray(scene?.serial_risk_repairs || scene?.serialRiskRepairs || scene?.risk_repairs || scene?.riskRepairs),
      recentFatigueAction: firstNonEmpty(scene?.recent_fatigue_action, scene?.recentFatigueAction, scene?.fatigue_repair_action, scene?.fatigueRepairAction),
      characterVoice: firstNonEmpty(scene?.character_voice, scene?.characterVoice, scene?.voice_anchor, scene?.voiceAnchor),
      dialogueGoals: stringArray(scene?.dialogue_goals || scene?.dialogueGoals || scene?.dialogue_contract_goals || scene?.dialogueContractGoals),
      styleDirectives: stringArray(scene?.style_directives || scene?.styleDirectives || scene?.style_boundary_directives || scene?.styleBoundaryDirectives),
      benchmarkRecallDirectives: stringArray(scene?.benchmark_recall_directives || scene?.benchmarkRecallDirectives || scene?.benchmark_directives || scene?.benchmarkDirectives),
      conceptAnchorRules: stringArray(scene?.concept_anchor_rules || scene?.conceptAnchorRules || scene?.new_concept_anchor_rules || scene?.newConceptAnchorRules),
      proseCraftDirectives: stringArray(scene?.prose_craft_directives || scene?.proseCraftDirectives || scene?.prose_craft_rules || scene?.proseCraftRules),
      povCharacter: firstNonEmpty(
        scene?.pov_character,
        scene?.povCharacter,
        scene?.pov_lens?.pov_character,
        scene?.povLens?.pov_character,
      ),
      decisionInScene: firstNonEmpty(
        scene?.decision_in_scene,
        scene?.decisionInScene,
        scene?.pov_lens?.decision_in_scene,
        scene?.povLens?.decision_in_scene,
        scene?.protagonist_agency_action,
        scene?.protagonistAgencyAction,
      ),
      wantNow: firstNonEmpty(
        scene?.want_now,
        scene?.wantNow,
        scene?.pov_lens?.want_now,
        scene?.povLens?.want_now,
        scene?.blocked_desire,
        scene?.blockedDesire,
      ),
      fearOrCostNow: firstNonEmpty(
        scene?.fear_or_cost_now,
        scene?.fearOrCostNow,
        scene?.pov_lens?.fear_or_cost_now,
        scene?.povLens?.fear_or_cost_now,
        scene?.no_exit_reason,
        scene?.noExitReason,
      ),
      emotionFromPov: firstNonEmpty(
        scene?.emotion_from_pov,
        scene?.emotionFromPov,
        scene?.emotion_in_situation,
        scene?.emotionInSituation,
        scene?.pov_lens?.emotion_from_pov,
        scene?.povLens?.emotion_from_pov,
        scene?.emotional_tone,
        scene?.emotionalTone,
      ),
    }
    return card
  }).filter(card => Boolean(card.purpose || card.conflict || card.turn || card.endingHook))
}

export function qualityContinuityStage(action: string, index: number, total: number): ChapterQualityContinuitySceneMapItem['stage'] {
  if (/开篇|前\s*300|前300|首场|第一场/.test(action)) return 'opening'
  if (/章末|最后|尾声|结尾|追读|ending/.test(action)) return 'ending'
  if (index === 0) return 'opening'
  if (index === total - 1) return 'ending'
  return 'middle'
}

export function buildQualityContinuitySceneMap(sceneCards: ChapterPlanningDeskSceneCard[]): ChapterQualityContinuitySceneMapItem[] {
  return sceneCards.flatMap((scene, index) => {
    const riskTags = scene.serialRiskRepairs.filter(item => /delivery_risk_carry_over|质量续航|next_chapter_quality_plan|续航|dialogue_checks|dialogue_contract|对白|对话|声线|科普嘴|benchmark_recall|style_boundary|prose_craft|concept_anchor|文风|风格|文风指纹|文风召回|style_drift|正文工艺|新概念|新名词|新设定|首次出现|作用锚点/.test(item))
    const forbiddenRepeats = scene.serialRiskRepairs.filter(item => !riskTags.includes(item))
    const actions = Array.from(new Set([
      scene.recentFatigueAction,
      scene.characterVoice,
      ...scene.requiredBeats,
      ...scene.stateChangesExpected,
      ...scene.dialogueGoals,
      ...scene.styleDirectives,
      ...scene.benchmarkRecallDirectives,
      ...scene.conceptAnchorRules,
      ...scene.proseCraftDirectives,
      scene.endingHook,
    ].map(item => text(item)).filter(Boolean)))
    const hasQualityContinuity = riskTags.length > 0 || actions.some(item => /质量续航|delivery_risk_carry_over|前\s*300|前300|中段|章末|追读|禁用重复|对白|对话|声线|科普嘴|潜台词|文风|风格|文风指纹|文风召回|逗号结巴|句长|benchmark_recall|style_boundary|prose_craft|concept_anchor|正文工艺|新概念|新名词|新设定|首次出现|动作反应|对话半句|物理后果|作用锚点|整段来历|等级解释/.test(item))
    if (!hasQualityContinuity || actions.length === 0) return []
    const action = actions.find(item => !/delivery_risk_carry_over|质量续航/.test(item)) || actions[0]
    return [{
      sceneNo: scene.sceneNo,
      title: scene.title,
      stage: qualityContinuityStage(action, index, sceneCards.length),
      action,
      riskTags,
      forbiddenRepeats,
    }]
  }).slice(0, 8)
}

export function deliveryRiskCarryOverNeedsSceneMapping(deliveryRiskCarryOver: ChapterPlanningDeskModel['episodePlan']['deliveryRiskCarryOver']) {
  return Boolean(
    deliveryRiskCarryOver.requiredActions.length
    || deliveryRiskCarryOver.openingActions.length
    || deliveryRiskCarryOver.middleActions.length
    || deliveryRiskCarryOver.endingActions.length
    || deliveryRiskCarryOver.forbiddenRepeats.length,
  )
}

export const QUALITY_PASS_THRESHOLD = 78
type ReviewRef = { review: AnyRecord; index: number }

export function parseReviewPayload(review: AnyRecord): AnyRecord | null {
  const field = review?.payload ? 'payload' : 'raw_payload'
  const value = review?.[field]
  if (!value) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return null
  const parsed = parseWorkspacePayload(value, { owner: review, kind: 'review', field })
  return parsed && typeof parsed === 'object' ? parsed : null
}

export async function selectTargetChapterForWriting(args: {
  targetChapterId?: number | null
  activeChapterId?: any
  selectChapterForWriting: (chapterId: number) => Promise<boolean>
}) {
  const targetChapterId = Number(args.targetChapterId || 0)
  if (!targetChapterId) return true
  if (Number(args.activeChapterId) === targetChapterId) return true
  return args.selectChapterForWriting(targetChapterId)
}

export function resolveEditorRevisionChapterId(report: AnyRecord | null | undefined, activeChapterId?: any, targetChapterId?: any) {
  const payload = parseReviewPayload(report || {}) || {}
  const candidates = [
    payload?.chapter_id,
    payload?.chapterId,
    payload?.chapter?.id,
    report?.chapter_id,
    report?.chapterId,
    targetChapterId,
    activeChapterId,
  ]
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined && String(candidate).trim()) return candidate
  }
  return undefined
}

export function reviewPayload(review: AnyRecord): AnyRecord {
  return parseReviewPayload(review) || {}
}

export function reviewChapterId(review: AnyRecord) {
  const payload = parseReviewPayload(review)
  if (!payload) return null
  return firstNonEmpty(
    payload?.chapter_id,
    payload?.chapterId,
    payload?.chapter?.id,
  )
}

export function reviewBelongsToChapter(review: AnyRecord, chapter?: AnyRecord | null) {
  if (!chapter) return false
  const reviewId = text(reviewChapterId(review))
  const chapterId = text(chapter?.id)
  return Boolean(reviewId && chapterId && reviewId === chapterId)
}

export function reviewType(review: AnyRecord) {
  return text(review?.review_type || review?.type || review?.kind).toLowerCase()
}

export function parsedTime(value: any) {
  const normalized = text(value)
  if (!normalized) return null
  const timestamp = Date.parse(normalized)
  return Number.isFinite(timestamp) ? timestamp : null
}

export function createdTime(review: AnyRecord) {
  return parsedTime(review?.created_at) ?? parsedTime(review?.updated_at)
}

export function compareReviewRefs(left: ReviewRef, right: ReviewRef) {
  const leftTime = createdTime(left.review)
  const rightTime = createdTime(right.review)
  if (leftTime !== null || rightTime !== null) {
    const leftOrder = leftTime ?? Number.NEGATIVE_INFINITY
    const rightOrder = rightTime ?? Number.NEGATIVE_INFINITY
    if (leftOrder !== rightOrder) return leftOrder - rightOrder
  }
  return left.index - right.index
}

export function latestReviewRef(reviews: AnyRecord[], chapter: AnyRecord | null, type: string): ReviewRef | null {
  const matches = reviews
    .map((review, index) => ({ review, index }))
    .filter(item => reviewBelongsToChapter(item.review, chapter) && reviewType(item.review) === type)
  if (!matches.length) return null
  matches.sort((a, b) => compareReviewRefs(b, a))
  return matches[0]
}

export function qualityPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.self_check?.review || payload?.review || payload?.quality || payload?.result || {}
}

export function buildDeslopGateDiagnosticsSummary(quality: AnyRecord): ChapterAcceptanceDeskModel['deslopGateDiagnostics'] {
  const raw = quality?.deslop_gate_diagnostics || quality?.deslopGateDiagnostics
  const gates = arrayValue(raw?.gates)
    .map((gate: AnyRecord) => {
      const gateKey = text(gate?.gate)
      const label = text(gate?.label)
      const status = text(gate?.status, 'pass')
      const countValue = Number(gate?.count ?? gate?.hit_count ?? gate?.hitCount ?? 0)
      return {
        gate: gateKey,
        label,
        status,
        count: Number.isFinite(countValue) ? countValue : 0,
        patterns: stringArray(gate?.patterns),
        evidence: stringArray(gate?.evidence),
        fix: text(gate?.fix),
      }
    })
    .filter(gate => gate.gate || gate.label)

  if (!raw || gates.length === 0) return null
  const totalValue = Number(raw?.total ?? gates.reduce((sum, gate) => sum + gate.count, 0))
  const concernValue = Number(raw?.concern_gate_count ?? raw?.concernGateCount ?? gates.filter(gate => gate.status !== 'pass' && gate.status !== 'ok').length)
  return {
    version: text(raw?.version, 'oh_story_deslop_gate_diagnostics_v1'),
    total: Number.isFinite(totalValue) ? totalValue : 0,
    concernGateCount: Number.isFinite(concernValue) ? concernValue : 0,
    summary: text(raw?.summary, concernValue > 0 ? `A-G 门禁 ${concernValue} 项需处理` : 'A-G 门禁已通过'),
    gates,
  }
}

export function qualityReviewFinalText(payload: AnyRecord) {
  const candidates = [
    payload?.self_check?.final_text,
    payload?.final_text,
    payload?.chapter_text,
  ]
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined) return String(candidate)
  }
  return null
}

export function proseQualityReviewMatchesCurrentChapter(review: AnyRecord | null, chapter: AnyRecord | null) {
  if (!review || !chapter) return false
  const payload = reviewPayload(review)
  const reviewChapterUpdatedAt = text(payload?.chapter_updated_at)
  const currentChapterUpdatedAt = text(chapter?.updated_at)
  let hasPositiveFreshnessSignal = false
  if (reviewChapterUpdatedAt && currentChapterUpdatedAt) {
    if (reviewChapterUpdatedAt !== currentChapterUpdatedAt) return false
    hasPositiveFreshnessSignal = true
  }

  const reviewedFinalText = qualityReviewFinalText(payload)
  if (reviewedFinalText !== null && reviewedFinalText.trim() !== String(chapter?.chapter_text ?? '').trim()) {
    return false
  }
  if (reviewedFinalText !== null) hasPositiveFreshnessSignal = true

  return hasPositiveFreshnessSignal
}

export function reportPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.report || payload?.editor_report || payload?.result || {}
}

export function revisionPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.revision || payload?.result || payload
}

export function storylineSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.storyline_sync || payload?.result?.storyline_sync || payload?.result || payload
}

export function countArray(value: any) {
  return Array.isArray(value) ? value.length : 0
}

