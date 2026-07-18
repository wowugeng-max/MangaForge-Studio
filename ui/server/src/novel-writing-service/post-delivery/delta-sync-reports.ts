import { asArray } from '../../routes/novel-route-utils'
import { countProseChars } from '../../novel-writing/word-target'
import { anchorMatchScore, anchorTerms, normalizedMatchText } from '../../novel-writing/text-matching'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import {
  platformCheckNeedsCarryOver,
  preDraftReceiptCheckNeedsCarryOver,
  deliveryRiskEvidenceSearchText,
  isGenericDeliveryRiskEvidence,
} from '../quality/platform-carry-over'
import { revisionReceiptRemainingRisk } from '../quality/revision-receipt-risk'
import {
  receiptEvidenceLocatedInProse,
  receiptEvidenceLocatedInQualityPlanSegment,
} from '../quality/receipt-evidence'
import {
  contextHasNextChapterQualityPlanDebt,
  contextHasStatusFilterReceiptDebt,
} from '../quality/missing-review-checks'
import { preDraftExecutionReceiptSections } from '../quality/pre-draft-receipt-sections'
import { proseBodyWithoutTitleLine } from '../quality/prose-expansion'
import {
  proseQualityDeslopRepairReceiptRisks,
  proseQualityDeslopRisks,
  proseQualityQualityAuditRisks,
  revisionReceiptSyncRisk,
} from '../quality/prose-quality-risks'
import { getContextContract } from '../context/context-contract'
import {
  deliveryRiskItemText,
  deliveryRiskReceiptRemainingRisk,
  inferDeliveryRiskReceiptRepairSegment,
} from './delivery-risk-core'
import { normalizeStoredOhStoryDeliveryReceipts } from './delivery-risk-carry-over'

type AnyFn = (...args: any[]) => any

let contextWithChapterRawPreDraftForSync: AnyFn = (contextPackage: any = {}, _chapter: any = {}) => contextPackage || {}
let characterRelationExplicitContract: AnyFn = (_contextPackage: any = {}) => ({})
let assetLinkageExplicitContract: AnyFn = (_contextPackage: any = {}) => ({})
let assetText: AnyFn = (item: any) => String(item?.name || item?.title || item?.id || '').trim()
let assetStateChangeText: AnyFn = (value: any) => String(value || '').trim()
let stateTrackingExplicitContract: AnyFn = (_contextPackage: any = {}) => ({})

export function bindPostDeliveryDeltaSyncDeps(deps: {
  contextWithChapterRawPreDraftForSync?: AnyFn
  characterRelationExplicitContract?: AnyFn
  assetLinkageExplicitContract?: AnyFn
  assetText?: AnyFn
  assetStateChangeText?: AnyFn
  stateTrackingExplicitContract?: AnyFn
} = {}) {
  if (deps.contextWithChapterRawPreDraftForSync) contextWithChapterRawPreDraftForSync = deps.contextWithChapterRawPreDraftForSync
  if (deps.characterRelationExplicitContract) characterRelationExplicitContract = deps.characterRelationExplicitContract
  if (deps.assetLinkageExplicitContract) assetLinkageExplicitContract = deps.assetLinkageExplicitContract
  if (deps.assetText) assetText = deps.assetText
  if (deps.assetStateChangeText) assetStateChangeText = deps.assetStateChangeText
  if (deps.stateTrackingExplicitContract) stateTrackingExplicitContract = deps.stateTrackingExplicitContract
}

const STORYLINE_TYPES = ['mainline', 'subplot', 'character_arc', 'relationship_arc', 'faction_arc', 'foreshadowing_arc']

function storylineKeys(item: any) {
  return [
    Number(item?.entity_id || item?.id || 0) ? `id:${Number(item?.entity_id || item?.id || 0)}` : '',
    String(item?.name || item?.title || '').trim() ? `name:${String(item?.name || item?.title || '').trim()}` : '',
  ].filter(Boolean)
}

function storylineKeySet(items: any[]) {
  const keys = new Set<string>()
  for (const item of items) {
    for (const key of storylineKeys(item)) keys.add(key)
  }
  return keys
}

function storylineMatchesKeySet(item: any, keys: Set<string>) {
  return storylineKeys(item).some(key => keys.has(key))
}

function normalizeStorylinePlanItem(item: any, usageType = '') {
  const name = String(item?.name || item?.title || item || '').trim()
  if (!name && !Number(item?.entity_id || item?.id || 0)) return null
  return {
    entity_id: Number(item?.entity_id || item?.id || 0) || null,
    name,
    usage_type: String(item?.usage_type || usageType || 'advance'),
    expected_state_change: item?.expected_state_change || {},
  }
}

function normalizeStorylineActualItem(item: any) {
  const name = String(item?.name || item?.title || '').trim()
  const entityType = String(item?.entity_type || item?.type || '')
  if (!name && !Number(item?.entity_id || item?.id || 0)) return null
  if (!STORYLINE_TYPES.includes(entityType)) return null
  return {
    entity_id: Number(item?.entity_id || item?.id || 0) || null,
    name,
    entity_type: entityType,
    actual_state_change: item?.actual_state_change || item?.state_delta || {},
    summary: String(item?.summary || item?.description || ''),
  }
}

export function buildStorylineSyncReport(contextPackage: any, storylineUpdates: any[] = []) {
  const usagePlan = asArray(contextPackage?.storyline_context?.chapter_usage)
    .map((item: any) => normalizeStorylinePlanItem(item))
    .filter(Boolean)
  const briefPlan = [
    ...asArray(contextPackage?.chapter_target?.storyline_advances).map((name: any) => normalizeStorylinePlanItem({ name }, 'advance')),
    ...asArray(contextPackage?.chapter_target?.storyline_plants).map((name: any) => normalizeStorylinePlanItem({ name }, 'plant')),
    ...asArray(contextPackage?.chapter_target?.storyline_payoffs).map((name: any) => normalizeStorylinePlanItem({ name }, 'payoff')),
    ...asArray(contextPackage?.chapter_target?.storyline_forbidden).map((name: any) => normalizeStorylinePlanItem({ name }, 'forbidden')),
  ].filter(Boolean)
  const planned: any[] = []
  const plannedKeys = new Set<string>()
  for (const item of [...usagePlan, ...briefPlan]) {
    const keys = storylineKeys(item)
    if (!keys.length || keys.some(key => plannedKeys.has(key))) continue
    for (const key of keys) plannedKeys.add(key)
    planned.push(item)
  }
  const actual = asArray(storylineUpdates).map(normalizeStorylineActualItem).filter(Boolean)
  const actualKeys = storylineKeySet(actual)
  const requiredPlan = planned.filter(item => !['pause', 'forbidden'].includes(String(item.usage_type || '')))
  const forbiddenPlan = planned.filter(item => String(item.usage_type || '') === 'forbidden')
  const completed = requiredPlan.filter(item => storylineMatchesKeySet(item, actualKeys))
  const missed = requiredPlan.filter(item => !storylineMatchesKeySet(item, actualKeys))
  const unplanned = actual.filter(item => !storylineMatchesKeySet(item, plannedKeys))
  const forbidden_touched = forbiddenPlan.filter(item => storylineMatchesKeySet(item, actualKeys))
  const status = missed.length || unplanned.length || forbidden_touched.length ? 'warn' : 'ok'
  return { status, planned, actual, completed, missed, unplanned, forbidden_touched }
}

function isForeshadowingPlanItem(item: any) {
  const type = String(item?.entity_type || item?.type || '')
  const name = String(item?.name || item?.title || item || '')
  return type === 'foreshadowing_arc' || type === 'foreshadowing' || /伏笔|埋线|线索/.test(name)
}

function normalizeForeshadowingDeltaItem(item: any, usageType = '') {
  const name = String(item?.name || item?.title || item || '').trim()
  if (!name && !Number(item?.entity_id || item?.id || 0)) return null
  return {
    entity_id: Number(item?.entity_id || item?.id || 0) || null,
    name,
    entity_type: String(item?.entity_type || item?.type || 'foreshadowing_arc'),
    usage_type: String(item?.usage_type || item?.usageType || usageType || 'advance'),
    state_delta: item?.actual_state_change || item?.state_delta || item?.state_json || item?.stateJson || item?.expected_state_change || {},
    summary: String(item?.summary || item?.description || item?.evidence || ''),
  }
}

function foreshadowingDeltaKeys(item: any) {
  return [
    Number(item?.entity_id || item?.id || 0) ? `id:${Number(item?.entity_id || item?.id || 0)}` : '',
    String(item?.name || item?.title || '').trim() ? `name:${String(item?.name || item?.title || '').trim()}` : '',
  ].filter(Boolean)
}

function foreshadowingDeltaKeySet(items: any[]) {
  const keys = new Set<string>()
  for (const item of items) {
    for (const key of foreshadowingDeltaKeys(item)) keys.add(key)
  }
  return keys
}

function foreshadowingDeltaMatches(item: any, keys: Set<string>) {
  return foreshadowingDeltaKeys(item).some(key => keys.has(key))
}

export function buildForeshadowingDeltaSyncReport(chapter: any, contextPackage: any, storylineUpdates: any[] = [], discoveredAssets: any[] = [], foreshadowingStatus: any = {}) {
  const usagePlan = asArray(contextPackage?.storyline_context?.chapter_usage)
    .filter(isForeshadowingPlanItem)
    .map((item: any) => normalizeForeshadowingDeltaItem(item))
    .filter(Boolean)
  const target = contextPackage?.chapter_target || {}
  const briefPlan = [
    ...asArray(target.storyline_plants).filter((item: any) => /伏笔|埋线|线索/.test(String(item || ''))).map((name: any) => normalizeForeshadowingDeltaItem({ name }, 'plant')),
    ...asArray(target.storyline_payoffs).filter((item: any) => /伏笔|埋线|线索/.test(String(item || ''))).map((name: any) => normalizeForeshadowingDeltaItem({ name }, 'payoff')),
    ...asArray(target.foreshadowing_plants || target.foreshadowingPlants).map((name: any) => normalizeForeshadowingDeltaItem({ name }, 'plant')),
    ...asArray(target.foreshadowing_payoffs || target.foreshadowingPayoffs).map((name: any) => normalizeForeshadowingDeltaItem({ name }, 'payoff')),
  ].filter(Boolean)
  const planned: any[] = []
  const plannedKeys = new Set<string>()
  for (const item of [...usagePlan, ...briefPlan]) {
    const keys = foreshadowingDeltaKeys(item)
    if (!keys.length || keys.some(key => plannedKeys.has(key))) continue
    for (const key of keys) plannedKeys.add(key)
    planned.push(item)
  }

  const actualFromStoryline = asArray(storylineUpdates)
    .filter(isForeshadowingPlanItem)
    .map((item: any) => normalizeForeshadowingDeltaItem(item, item?.usage_type || item?.usageType || 'advance'))
    .filter(Boolean)
  const actualFromAssets = asArray(discoveredAssets)
    .filter((item: any) => String(item?.entity_type || item?.type || '') === 'foreshadowing')
    .map((item: any) => normalizeForeshadowingDeltaItem(item, 'plant'))
    .filter(Boolean)
  const actualFromStatus = Object.entries(foreshadowingStatus || {})
    .map(([name, state]: [string, any]) => normalizeForeshadowingDeltaItem({
      name,
      entity_type: 'foreshadowing_arc',
      usage_type: state?.status === '已回收' || state?.status === 'paid' || state?.payoff_status === 'paid' ? 'payoff' : 'advance',
      state_json: state,
      summary: state?.summary || state?.evidence || '',
    }))
    .filter(Boolean)
  const recorded = Array.from(new Map(
    [...actualFromStoryline, ...actualFromAssets, ...actualFromStatus]
      .map((item: any) => [foreshadowingDeltaKeys(item)[0] || `name:${item.name}`, item]),
  ).values())
  const recordedKeys = foreshadowingDeltaKeySet(recorded)
  const completed = planned.filter(item => foreshadowingDeltaMatches(item, recordedKeys))
  const missed = planned.filter(item => !foreshadowingDeltaMatches(item, recordedKeys))
  const unrelated = recorded.filter(item => !foreshadowingDeltaMatches(item, plannedKeys))
  const status = missed.length > 0 ? 'warn' : 'ok'

  return {
    report_id: `foreshadowing-delta-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: planned.length === 0 ? '伏笔增量未配置' : status === 'ok' ? '伏笔增量 OK' : `伏笔增量缺口 ${missed.length}`,
    summary: planned.length === 0
      ? '本章没有配置需要新增、推进或回收的伏笔增量。'
      : status === 'ok'
        ? '本章计划新增、推进或回收的伏笔均已进入本轮增量记录。'
        : `本章有 ${missed.length} 条计划伏笔未在本轮增量记录中闭环。`,
    planned_count: planned.length,
    recorded_count: recorded.length,
    missed_count: missed.length,
    unrelated_count: unrelated.length,
    planned,
    recorded,
    completed,
    missed,
    unrelated,
    next_actions: status === 'ok'
      ? ['保持日更伏笔盘点只处理本轮新增/推进/回收，不做全书伏笔审计。']
      : [
          '下一次修订或状态更新必须补齐本轮新增/推进/回收的伏笔记录，把 missed 项写入追踪状态。',
          '不要扫描全书伏笔；只处理本章上下文中计划触达、正文实际新增、推进或回收的伏笔增量。',
        ],
  }
}

function normalizeTimelineDeltaItem(item: any, fallbackLabel = '时间线节点') {
  if (!item) return null
  const label = compactBriefText(item?.label || item?.title || item?.name || fallbackLabel)
  const text = compactBriefText(item?.text || item?.summary || item?.description || item?.event || item?.time || item?.location || item)
  if (!label && !text) return null
  return {
    key: compactBriefText(item?.key || label || text).slice(0, 80),
    label: label || fallbackLabel,
    text: text || label,
  }
}

function stateDeltaEvidenceText(item: any) {
  return compactBriefText(
    item?.source_excerpt
    || item?.sourceExcerpt
    || item?.evidence
    || item?.quote
    || item?.changed_evidence
    || item?.changedEvidence,
  )
}

function timelineDeltaItemText(item: any) {
  if (!item) return ''
  if (typeof item === 'object' && !Array.isArray(item)) {
    return compactBriefText(
      item.text
      || item.summary
      || item.description
      || item.event
      || item.time
      || item.location
      || item.name
      || item.title
      || deliveryRiskItemText(item),
    )
  }
  return deliveryRiskItemText(item)
}

function timelineDeltaRecordedRows(stateDelta: any = {}, settingUpdates: any[] = []) {
  const state = stateDelta || {}
  const timeline = asArray(state.timeline || state.timeline_events || state.timelineEvents)
    .map((item: any) => ({
      label: '时间线节点',
      text: timelineDeltaItemText(item),
      evidence: stateDeltaEvidenceText(item),
    }))
    .filter((item: any) => item.text)
  const currentTimeRaw = state.current_time || state.currentTime
  const currentTime = timelineDeltaItemText(currentTimeRaw)
  const activeLocations = asArray(state.active_locations || state.activeLocations)
    .map((item: any) => ({
      label: '活动地点',
      text: timelineDeltaItemText(item),
      evidence: stateDeltaEvidenceText(item),
    }))
    .filter((item: any) => item.text)
  const settingRows = asArray(settingUpdates)
    .filter((item: any) => {
      const type = String(item?.entity_type || item?.type || '')
      const name = String(item?.name || '')
      return /timeline|chronology|location|时间线|地点|位置/.test(`${type} ${name}`)
    })
    .map((item: any) => ({
      label: '时间线设定',
      text: [
        item?.name,
        item?.summary,
        item?.state_delta,
        item?.actual_state_change,
      ].map(deliveryRiskItemText).filter(Boolean).join('；'),
      evidence: stateDeltaEvidenceText(item),
    }))
    .filter((item: any) => item.text)
  return [
    ...timeline,
    currentTime ? { label: '当前时间', text: `当前时间：${currentTime}`, evidence: stateDeltaEvidenceText(currentTimeRaw) } : null,
    ...activeLocations.map((item: any) => ({ ...item, text: `活动地点：${item.text}` })),
    ...settingRows,
  ].filter(Boolean)
}

function timelineDeltaRecordedTexts(stateDelta: any = {}, settingUpdates: any[] = []) {
  return timelineDeltaRecordedRows(stateDelta, settingUpdates).map((item: any) => item.text)
}

export function buildTimelineDeltaSyncReport(chapter: any, contextPackage: any, stateDelta: any = {}, settingUpdates: any[] = []) {
  const target = contextPackage?.chapter_target || {}
  const planned: any[] = [
    normalizeTimelineDeltaItem(target.current_time || target.currentTime, '当前时间'),
    ...asArray(target.active_locations || target.activeLocations).map((item: any) => normalizeTimelineDeltaItem(item, '活动地点')),
    ...asArray(target.timeline_beats || target.timelineBeats || target.timeline_events || target.timelineEvents)
      .map((item: any) => normalizeTimelineDeltaItem(item, '时间线节点')),
  ].filter(Boolean)

  const seen = new Set<string>()
  const uniquePlanned = planned.filter((item: any) => {
    const key = `${item.label}:${item.text}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const recordedRows = timelineDeltaRecordedRows(stateDelta, settingUpdates)
  const recorded = recordedRows.map((item: any) => item.text)
  const recordedText = recorded.join('；')
  const completedRows = uniquePlanned
    .map((item: any) => {
      const row = recordedRows
        .map((candidate: any) => ({
          row: candidate,
          score: anchorMatchScore(item.text || item.label, candidate.text).score,
        }))
        .sort((a: any, b: any) => b.score - a.score)[0]
      return row?.score >= 55 || anchorMatchScore(item.text || item.label, recordedText).score >= 55
        ? { item, row: row?.score >= 55 ? row.row : null }
        : null
    })
    .filter(Boolean)
  const completed = completedRows.map((entry: any) => entry.item)
  const missed = uniquePlanned.filter((item: any) => !completed.includes(item))
  const evidenceMissing = completedRows
    .map((entry: any) => entry.row && !compactBriefText(entry.row.evidence) ? { ...entry.item, recorded_text: entry.row.text } : null)
    .filter(Boolean)
  const status = missed.length > 0 || evidenceMissing.length > 0 ? 'warn' : 'ok'

  return {
    report_id: `timeline-delta-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: uniquePlanned.length === 0
      ? '时间线增量未配置'
      : status === 'ok'
        ? '时间线增量 OK'
        : missed.length > 0
          ? `时间线增量缺口 ${missed.length}`
          : `时间线证据缺口 ${evidenceMissing.length}`,
    summary: uniquePlanned.length === 0
      ? '本章没有显式配置需要追踪的时间、地点或事件顺序增量。'
      : status === 'ok'
        ? '本章计划触达的时间、地点和事件顺序已进入本轮状态增量。'
        : missed.length > 0
          ? `本章有 ${missed.length} 项时间线增量未在状态记录中闭环。`
          : `本章有 ${evidenceMissing.length} 项时间线增量已写入但缺少正文 source_excerpt 证据。`,
    planned_count: uniquePlanned.length,
    recorded_count: recorded.length,
    missed_count: missed.length,
    evidence_missing_count: evidenceMissing.length,
    planned: uniquePlanned,
    recorded,
    completed,
    missed,
    evidence_missing: evidenceMissing,
    next_actions: status === 'ok'
      ? ['保持时间线追踪只记录本章新增或改变的时间、地点、事件顺序。']
      : missed.length > 0
        ? [
            '下一次修订或状态更新只补本章时间线增量：当前时间、活动地点、事件先后顺序必须写回状态。',
            '不要重排全书时间线；只处理本章计划触达且正文实际改变的时间/地点/顺序。',
          ]
        : [
            '下一次状态更新必须给时间线、当前时间和活动地点补 source_excerpt 或 evidence，引用正文中支撑时间、地点或事件顺序变化的原句。',
            '不要只写抽象时间线结论；时间线增量必须能回指到本章正文证据。',
          ],
  }
}

function normalizeCharacterStateDeltaPlanItem(item: any) {
  if (!item) return null
  if (typeof item === 'string') {
    const text = compactBriefText(item)
    const match = text.match(/^([^：:]{1,40})[：:](.+)$/)
    const name = compactBriefText(match?.[1] || text)
    return name ? { name, text: compactBriefText(match?.[2] || text), source: text } : null
  }
  const name = compactBriefText(item?.name || item?.character || item?.title)
  const text = compactBriefText(
    item?.text
    || item?.summary
    || item?.state
    || item?.current_state
    || item?.currentState
    || item,
  )
  return name ? { name, text: text || name, source: text || name } : null
}

function characterStateDeltaText(value: any) {
  if (!value) return ''
  if (typeof value === 'string') return compactBriefText(value)
  if (Array.isArray(value)) return value.map(characterStateDeltaText).filter(Boolean).join('、')
  if (typeof value === 'object') return Object.entries(value)
    .map(([key, item]) => `${key}：${characterStateDeltaText(item)}`)
    .filter(Boolean)
    .join('；')
  return compactBriefText(value)
}

function characterStateDeltaRecordedItems(stateDelta: any = {}, characterUpdates: any[] = []) {
  const rows = new Map<string, { name: string; text: string; evidence: string }>()
  const add = (name: any, text: any, evidence: any = '') => {
    const safeName = compactBriefText(name)
    const safeText = characterStateDeltaText(text)
    const safeEvidence = compactBriefText(evidence)
    if (!safeName || !safeText) return
    const existing = rows.get(safeName)
    rows.set(safeName, {
      name: safeName,
      text: [existing?.text, safeText].filter(Boolean).join('；'),
      evidence: uniqueBriefStrings([existing?.evidence, safeEvidence], 3).join('；'),
    })
  }

  for (const update of asArray(characterUpdates)) {
    add(
      update?.name || update?.character,
      update?.current_state || update?.currentState || update?.state_delta || update?.stateDelta || update?.summary,
      update?.evidence || update?.source_excerpt || update?.sourceExcerpt || update?.changed_evidence || update?.changedEvidence,
    )
  }

  const state = stateDelta || {}
  for (const [name, value] of Object.entries(state.character_positions || state.characterPositions || {})) add(name, `位置：${characterStateDeltaText(value)}`)
  for (const [name, value] of Object.entries(state.character_relationships || state.characterRelationships || {})) add(name, `关系：${characterStateDeltaText(value)}`)
  for (const [name, value] of Object.entries(state.known_secrets || state.knownSecrets || {})) add(name, `已知秘密：${characterStateDeltaText(value)}`)
  for (const [name, value] of Object.entries(state.item_ownership || state.itemOwnership || {})) add(name, `持有物：${characterStateDeltaText(value)}`)

  return Array.from(rows.values())
}

export function buildCharacterStateDeltaSyncReport(chapter: any, contextPackage: any, stateDelta: any = {}, characterUpdates: any[] = []) {
  const contract = stateTrackingExplicitContract(contextPackage) || contextPackage?.chapter_target?.state_tracking_contract || {}
  const planned = asArray(contract?.character_states || contract?.characterStates)
    .map(normalizeCharacterStateDeltaPlanItem)
    .filter(Boolean)
  const seen = new Set<string>()
  const uniquePlanned = planned.filter((item: any) => {
    const key = item.name
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
  const recorded = characterStateDeltaRecordedItems(stateDelta, characterUpdates)
  const recordedByName = new Map(recorded.map((item: any) => [item.name, item]))
  const completed = uniquePlanned.filter((item: any) => {
    const row = recordedByName.get(item.name)
    if (!row) return false
    const score = anchorMatchScore(item.text || item.name, `${row.name}：${row.text}`).score
    return score >= 25 || normalizedMatchText(row.text).length >= 6
  })
  const missed = uniquePlanned.filter((item: any) => !completed.includes(item))
  const evidenceMissing = completed
    .map((item: any) => {
      const row = recordedByName.get(item.name)
      return row && !compactBriefText(row.evidence) ? { ...item, recorded_text: row.text } : null
    })
    .filter(Boolean)
  const status = missed.length > 0 || evidenceMissing.length > 0 ? 'warn' : 'ok'

  return {
    report_id: `character-state-delta-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: uniquePlanned.length === 0
      ? '角色状态增量未配置'
      : status === 'ok'
        ? '角色状态增量 OK'
        : missed.length > 0
          ? `角色状态增量缺口 ${missed.length}`
          : `角色状态证据缺口 ${evidenceMissing.length}`,
    summary: uniquePlanned.length === 0
      ? '本章没有显式配置需要追踪的角色状态增量。'
      : status === 'ok'
        ? '本章涉及角色的状态增量已进入角色状态或故事状态记录。'
        : missed.length > 0
          ? `本章有 ${missed.length} 位角色的状态增量未在本轮记录中闭环。`
          : `本章有 ${evidenceMissing.length} 位角色状态已写入但缺少正文 source_excerpt 证据。`,
    planned_count: uniquePlanned.length,
    recorded_count: recorded.length,
    missed_count: missed.length,
    evidence_missing_count: evidenceMissing.length,
    planned: uniquePlanned,
    recorded,
    completed,
    missed,
    evidence_missing: evidenceMissing,
    next_actions: status === 'ok'
      ? ['保持角色状态追踪只记录本章新增或改变的位置、能力、伤势、持有物、关系态度、公众形象和知识边界。']
      : missed.length > 0
        ? [
            '下一次修订或状态更新只补本章角色状态增量：位置、能力/伤势、持有物、关系态度、公众形象和知识边界必须写回状态。',
            '不要重写全角色小传；只处理本章出场且状态发生变化或会影响下一章续写的角色。',
          ]
        : [
            '下一次状态更新必须给每条 character_updates 补 source_excerpt 或 evidence，引用正文中支撑角色位置、能力、伤势、持有物、关系态度、公众形象或知识边界变化的原句。',
            '不要只写抽象状态结论；状态增量必须能回指到本章正文证据。',
          ],
  }
}

function normalizeRelationshipDeltaPlanItem(item: any, fallbackText = '') {
  if (!item) return null
  if (typeof item === 'string') {
    const text = compactBriefText(item)
    return text ? { entity_id: null, name: text, text: fallbackText || text } : null
  }
  const name = compactBriefText(item?.name || item?.title || item?.relationship || item?.summary)
  const text = compactBriefText(
    item?.text
    || item?.summary
    || item?.description
    || assetStateChangeText(item?.expected_state_change || item?.expectedStateChange)
    || item,
  )
  return name ? { entity_id: Number(item?.entity_id || item?.id || 0) || null, name, text: text || fallbackText || name } : null
}

function relationshipDeltaRecordedItems(stateDelta: any = {}, storylineUpdates: any[] = []) {
  const rows = new Map<string, { entity_id: any; name: string; text: string }>()
  const add = (item: any, textValue?: any) => {
    const name = compactBriefText(item?.name || item?.title || item?.relationship)
    const text = assetStateChangeText(textValue ?? item?.actual_state_change ?? item?.actualStateChange ?? item?.state_delta ?? item?.stateDelta ?? item?.summary ?? item)
    if (!name || !text) return
    const key = Number(item?.entity_id || item?.id || 0) ? `id:${Number(item?.entity_id || item?.id || 0)}` : `name:${name}`
    const existing = rows.get(key)
    rows.set(key, {
      entity_id: Number(item?.entity_id || item?.id || 0) || existing?.entity_id || null,
      name,
      text: [existing?.text, text].filter(Boolean).join('；'),
    })
  }

  for (const update of asArray(storylineUpdates)) {
    if (String(update?.entity_type || update?.type || '') === 'relationship_arc') add(update)
  }
  for (const [name, value] of Object.entries(stateDelta?.character_relationships || stateDelta?.characterRelationships || {})) {
    add({ name }, value)
  }
  for (const [name, value] of Object.entries(stateDelta?.relationship_graph || stateDelta?.relationshipGraph || {})) {
    add({ name }, value)
  }
  return Array.from(rows.values())
}

function relationshipDeltaKeys(item: any) {
  return [
    Number(item?.entity_id || item?.id || 0) ? `id:${Number(item?.entity_id || item?.id || 0)}` : '',
    item?.name ? `name:${compactBriefText(item.name)}` : '',
  ].filter(Boolean)
}

export function buildRelationshipDeltaSyncReport(chapter: any, contextPackage: any, stateDelta: any = {}, storylineUpdates: any[] = []) {
  const contract = characterRelationExplicitContract(contextPackage) || contextPackage?.chapter_target?.character_relation_contract || {}
  const relationshipUsage = asArray(contextPackage?.storyline_context?.chapter_usage || contextPackage?.storyline_context?.chapterUsage)
    .filter((item: any) => String(item?.entity_type || item?.type || '') === 'relationship_arc' && String(item?.usage_type || '') !== 'forbidden')
  const planText = [
    ...asArray(contract?.tests_or_pressure || contract?.testsOrPressure),
    ...asArray(contract?.attitude_shifts || contract?.attitudeShifts),
  ].map((item: any) => compactBriefText(item)).filter(Boolean).join('；')
  const planned = [
    ...relationshipUsage.map((item: any) => normalizeRelationshipDeltaPlanItem(item, planText)),
    ...asArray(contract?.important_relationships || contract?.importantRelationships).map((item: any) => normalizeRelationshipDeltaPlanItem(item, planText)),
  ].filter(Boolean)
  const seen = new Set<string>()
  const uniquePlanned = planned.filter((item: any) => {
    const keys = relationshipDeltaKeys(item)
    const key = keys[0] || `name:${item.name}`
    if (!key || keys.some(candidate => seen.has(candidate))) return false
    for (const candidate of keys.length ? keys : [key]) seen.add(candidate)
    return true
  })
  const recorded = relationshipDeltaRecordedItems(stateDelta, storylineUpdates)
  const recordedKeys = new Set(recorded.flatMap(relationshipDeltaKeys))
  const recordedText = recorded.map((item: any) => `${item.name}：${item.text}`).join('；')
  const completed = uniquePlanned.filter((item: any) => {
    if (relationshipDeltaKeys(item).some(key => recordedKeys.has(key))) return true
    return anchorMatchScore(item.name, recordedText).score >= 45
      || anchorMatchScore(item.text || item.name, recordedText).score >= 35
  })
  const missed = uniquePlanned.filter((item: any) => !completed.includes(item))
  const status = missed.length > 0 ? 'warn' : 'ok'

  return {
    report_id: `relationship-delta-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: uniquePlanned.length === 0 ? '关系增量未配置' : status === 'ok' ? '关系增量 OK' : `关系增量缺口 ${missed.length}`,
    summary: uniquePlanned.length === 0
      ? '本章没有显式配置需要追踪的关系变化增量。'
      : status === 'ok'
        ? '本章计划推进的关系变化已进入关系图或剧情线增量记录。'
        : `本章有 ${missed.length} 条关系变化未在本轮记录中闭环。`,
    planned_count: uniquePlanned.length,
    recorded_count: recorded.length,
    missed_count: missed.length,
    planned: uniquePlanned,
    recorded,
    completed,
    missed,
    next_actions: status === 'ok'
      ? ['保持关系追踪只记录本章新增或改变的信任、敌意、亏欠、联盟、压迫、误解和阶段边界。']
      : [
          '下一次修订或状态更新只补本章关系增量：重要关系的考验、态度变化、阶段边界和代价必须写回关系图或关系线。',
          '不要重写全人物关系网；只处理本章计划推进且影响下一章续写的关系变化。',
        ],
  }
}

function normalizeChapterHandoffPlanItem(label: string, value: any) {
  const text = compactBriefText(value)
  return text ? { label, text } : null
}

function chapterHandoffRecordedTexts(stateDelta: any = {}) {
  return [
    ...asArray(stateDelta?.open_questions || stateDelta?.openQuestions),
    ...asArray(stateDelta?.next_chapter_priorities || stateDelta?.nextChapterPriorities),
    ...asArray(stateDelta?.payoff_queue || stateDelta?.payoffQueue),
  ].map(deliveryRiskItemText).filter(Boolean)
}

export function buildChapterHandoffDeltaSyncReport(chapter: any, contextPackage: any, stateDelta: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || syncContextPackage?.chapterTarget || {}
  const brief = syncContextPackage?.pre_draft_brief
    || syncContextPackage?.preDraftBrief
    || target?.pre_draft_brief
    || target?.preDraftBrief
    || {}
  const pageTurn = target.page_turn_hook_brief || target.pageTurnHookBrief || brief.page_turn_hook_brief || brief.pageTurnHookBrief || {}
  const blueprint = target.chapter_blueprint || target.chapterBlueprint || brief.chapter_blueprint || brief.chapterBlueprint || {}
  const endingContract = blueprint?.ending_contract || blueprint?.endingContract || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards || brief.scene_cards || brief.sceneCards)
  const lastScene = sceneCards[sceneCards.length - 1] || {}
  const explicitEndingHook = target.ending_hook || target.endingHook || brief.ending_hook || brief.endingHook || chapter?.ending_hook
  const explicitNextPull = pageTurn.next_chapter_pull || pageTurn.nextChapterPull || endingContract.next_chapter_pull || endingContract.nextChapterPull
  const planned = [
    normalizeChapterHandoffPlanItem('章末追读', explicitEndingHook),
    normalizeChapterHandoffPlanItem('下一章拉力', explicitNextPull),
    !explicitEndingHook && !explicitNextPull
      ? normalizeChapterHandoffPlanItem('最后场景钩子', lastScene.ending_hook_seed || lastScene.endingHookSeed || lastScene.ending_hook || lastScene.endingHook || lastScene.exit_state || lastScene.exitState)
      : null,
  ].filter(Boolean)
  const seen = new Set<string>()
  const uniquePlanned = planned.filter((item: any) => {
    const key = `${item.label}:${item.text}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const recorded = chapterHandoffRecordedTexts(stateDelta)
  const recordedText = recorded.join('；')
  const completed = uniquePlanned.filter((item: any) => {
    const score = anchorMatchScore(item.text, recordedText).score
    if (score >= 45) return true
    const plannedTerms = anchorTerms(item.text).filter(term => term.length >= 2)
    if (!plannedTerms.length) return false
    const matched = plannedTerms.filter(term => normalizedMatchText(recordedText).includes(term))
    return matched.length >= Math.min(3, plannedTerms.length)
  })
  const missed = uniquePlanned.filter((item: any) => !completed.includes(item))
  const status = missed.length > 0 ? 'warn' : 'ok'

  return {
    report_id: `chapter-handoff-delta-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: uniquePlanned.length === 0 ? '章末交接未配置' : status === 'ok' ? '章末交接 OK' : `章末交接缺口 ${missed.length}`,
    summary: uniquePlanned.length === 0
      ? '本章没有显式配置章末追读或下一章拉力。'
      : status === 'ok'
        ? '本章章末追读、下一章拉力或最后场景钩子已进入下一章状态记录。'
        : `本章有 ${missed.length} 项章末交接未写入开放问题或下一章优先事项。`,
    planned_count: uniquePlanned.length,
    recorded_count: recorded.length,
    missed_count: missed.length,
    planned: uniquePlanned,
    recorded,
    completed,
    missed,
    next_actions: status === 'ok'
      ? ['保持章末交接只记录本章最后一幕、未解问题和下一章优先追问。']
      : [
          '下一次修订或状态更新只补本章章末交接：最后一幕、开放问题、下一章拉力和开篇承接义务必须写入状态。',
          '不要重写整章摘要；只处理下一章开篇必须接住的最后一幕和读者问题。',
    ],
  }
}

function firstStateCompletenessEvidence(text: string, pattern: RegExp) {
  const match = String(text || '').match(pattern)
  return compactBriefText(match?.[0] || '')
}

function stateDeltaCompletenessObligations(chapterText: string) {
  const body = proseBodyWithoutTitleLine(chapterText)
  const compactBody = body.replace(/\s+/g, '')
  const rules = [
    {
      key: 'timeline',
      label: '时间线/地点增量',
      pattern: /(?:子时|戌时|三更|天亮|次日|当夜|潜入|赶到|进入|离开|禁库|审判庭|暗门|外廊)/,
      highConfidencePattern: /[\u4e00-\u9fa5]{2,8}(?:抵达|离开)[\u4e00-\u9fa5]{2,10}(?:城|院|库|庭|港|村|山|楼|府|宫)/,
      fix: '把本章当前时间、活动地点、事件先后顺序写入 state_delta.timeline/current_time/active_locations。',
    },
    {
      key: 'character_state',
      label: '角色状态增量',
      pattern: /(?:公开作证|受伤|昏迷|身份|公众形象|得罪|暴露|失去|获得|持有|站队|倒戈|改口|被逐出)/,
      highConfidencePattern: /[\u4e00-\u9fa5]{2,8}(?:死亡|身亡|受伤|重伤|能力(?:消失|觉醒)|被逐出)/,
      fix: '把本章角色位置、能力/伤势、持有物、关系态度、公众形象和知识边界写入 character_updates 或 state_delta。',
    },
    {
      key: 'asset_state',
      label: '资产状态增量',
      pattern: /(?:账册|旧印章|钥匙|玉牌|令牌|缺页|暗格)[^。！？!?]{0,40}(?:取出来|取出|拿到|交出|露出|半枚|碎|归属|夺回|失去|压着)/,
      highConfidencePattern: /(?:账册|印章|钥匙|玉牌|令牌|[\u4e00-\u9fa5]{2,8}账册)(?:被[\u4e00-\u9fa5]{2,8})?(?:获得|失去|交给|交出|夺走|夺回|损毁|破碎)/,
      fix: '把本章关键物品、规则、地点、伏笔资产的归属、可见性、限制或状态变化写入 setting_updates/resource_status/item_ownership。',
    },
    {
      key: 'relationship',
      label: '关系增量',
      pattern: /(?:[\u4e00-\u9fa5]{2,8}与[\u4e00-\u9fa5]{2,8}从[^。！？!?]{0,12}变成[\u4e00-\u9fa5]{2,8}|[\u4e00-\u9fa5]{2,8}与[\u4e00-\u9fa5]{2,8}(?:结盟|决裂|反目)|从[^。！？!?]{0,24}变成|有限互信|得罪|倒戈|站队|背叛|联盟|公开作证|承受[^。！？!?]{0,12}压力)/,
      highConfidencePattern: /[\u4e00-\u9fa5]{2,8}与[\u4e00-\u9fa5]{2,8}(?:结盟|决裂|反目|从(?:盟友|敌人|陌生人|对手)变成(?:盟友|敌人|恋人|仇敌))/,
      fix: '把本章信任、敌意、亏欠、联盟、压迫、误解或阶段边界写入 relationship_graph/character_relationships/storyline_updates。',
    },
    {
      key: 'foreshadowing_or_handoff',
      label: '伏笔/章末交接增量',
      pattern: /(?:线索|真相|第二个证人|第三个人|门后|名字|下一章|未解|谁|缺页|咳声)/,
      highConfidencePattern: /(?:章末|最后)[^。！？!?]{0,40}(?:决定|下一步|下一章|必须)[^。！？!?]{0,40}(?:谁|什么|为什么|去哪|目标|追查)/,
      fix: '把本章新增/推进/回收的线索、开放问题、下一章优先事项写入 open_questions/next_chapter_priorities/foreshadowing_status。',
    },
  ]
  return rules
    .filter(rule => rule.pattern.test(compactBody))
    .map(rule => ({
      key: rule.key,
      label: rule.label,
      evidence: firstStateCompletenessEvidence(body, rule.pattern),
      high_confidence_evidence: firstStateCompletenessEvidence(
        rule.key === 'foreshadowing_or_handoff' ? compactBody.slice(-240) : compactBody,
        rule.highConfidencePattern,
      ),
      fix: rule.fix,
    }))
}

function foreshadowingOrHandoffRecordedCount(stateDelta: any = {}, storylineUpdates: any[] = [], discoveredAssets: any[] = [], foreshadowingStatus: any = {}) {
  return [
    ...chapterHandoffRecordedTexts(stateDelta),
    ...asArray(storylineUpdates).filter(isForeshadowingPlanItem).map(assetText).filter(Boolean),
    ...asArray(discoveredAssets).filter((item: any) => String(item?.entity_type || item?.type || '') === 'foreshadowing').map(assetText).filter(Boolean),
    ...Object.keys(foreshadowingStatus || {}),
  ].filter(Boolean).length
}

export function buildStateDeltaCompletenessReport(chapter: any, chapterText: string, stateDelta: any = {}, options: any = {}) {
  const settingUpdates = asArray(options?.settingUpdates || options?.setting_updates)
  const characterUpdates = asArray(options?.characterUpdates || options?.character_updates)
  const storylineUpdates = asArray(options?.storylineUpdates || options?.storyline_updates)
  const discoveredAssets = asArray(options?.discoveredAssets || options?.discovered_assets)
  const foreshadowingStatus = options?.foreshadowingStatus || options?.foreshadowing_status || {}
  const obligations = stateDeltaCompletenessObligations(chapterText)
  const recorded = {
    timeline: timelineDeltaRecordedTexts(stateDelta, settingUpdates).length,
    character_state: characterStateDeltaRecordedItems(stateDelta, characterUpdates).length,
    asset_state: assetStateDeltaRecordedItems(stateDelta, settingUpdates, discoveredAssets).length,
    relationship: relationshipDeltaRecordedItems(stateDelta, storylineUpdates).length,
    foreshadowing_or_handoff: foreshadowingOrHandoffRecordedCount(stateDelta, storylineUpdates, discoveredAssets, foreshadowingStatus),
  }
  const completed = obligations.filter((item: any) => Number((recorded as any)[item.key] || 0) > 0)
  const missed = obligations.filter((item: any) => Number((recorded as any)[item.key] || 0) <= 0)
  const blockingMissed = missed
    .filter((item: any) => Boolean(item?.high_confidence_evidence))
    .map((item: any) => ({ ...item, blocking: true, confidence: 'high' }))
  const status = missed.length > 0 ? 'warn' : 'ok'
  return {
    report_id: `state-delta-completeness-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: obligations.length === 0 ? '状态增量无强触发' : status === 'ok' ? '状态增量完整' : `状态增量漏记 ${missed.length}`,
    summary: obligations.length === 0
      ? '正文没有触发强状态增量信号。'
      : status === 'ok'
        ? '正文触发的时间线、角色、资产、关系或伏笔/章末交接增量均已有对应记录。'
        : `正文触发 ${obligations.length} 类状态增量，其中 ${missed.length} 类未在本轮状态记录中闭环。`,
    planned_count: obligations.length,
    recorded_count: Object.values(recorded).reduce((sum: number, count: any) => sum + Number(count || 0), 0),
    missed_count: missed.length,
    blocking_missed: blockingMissed,
    high_confidence_missed: blockingMissed,
    recorded,
    planned: obligations,
    completed,
    missed,
    next_actions: status === 'ok'
      ? ['保持 oh-story 日更习惯：每章写完立即更新伏笔、时间线、角色状态和上下文进度。']
      : [
          '按 oh-story 日更流程修复：每章写完立即更新追踪/伏笔、追踪/时间线、追踪/角色状态和追踪/上下文。',
          '只补本章正文实际触发的状态增量，不做全书审计，也不要把旧状态整段重写。',
        ],
  }
}

function proseRevisionReceiptRows(selfCheck: any = {}, extraReceipts: any[] = [], chapterText = '') {
  const revision = selfCheck?.revision || selfCheck?.revised_revision || selfCheck || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const receipts = [
    ...asArray(revisionDeliveryReceipts?.revision_receipts || revisionDeliveryReceipts?.revisionReceipts),
    ...asArray(revision?.revision_receipts || revision?.revisionReceipts),
    ...asArray(selfCheck?.revision_receipts || selfCheck?.revisionReceipts),
    ...asArray(extraReceipts),
  ]
  return receipts
    .map((receipt: any) => {
      const risk = revisionReceiptSyncRisk(receipt, chapterText)
      const severity = compactBriefText(receipt?.severity || receipt?.level)
      const category = compactBriefText(receipt?.category || receipt?.type)
      const label = compactBriefText(
        [severity, category].filter(Boolean).join('｜'),
        '修订回执',
      )
      const evidence = compactBriefText(
        receipt?.changed_evidence
        || receipt?.changedEvidence
        || receipt?.applied_fix
        || receipt?.appliedFix
        || receipt?.original_evidence
        || receipt?.originalEvidence,
      )
      return {
        issue_index: Number.isFinite(Number(receipt?.issue_index ?? receipt?.issueIndex))
          ? Number(receipt?.issue_index ?? receipt?.issueIndex)
          : null,
        severity,
        category,
        label,
        text: risk,
        evidence,
        applied_fix: compactBriefText(receipt?.applied_fix || receipt?.appliedFix),
      }
    })
    .filter((item: any) => item.text)
}

function storedRevisionReceiptsFromChapter(chapter: any = {}) {
  const receipts = normalizeStoredOhStoryDeliveryReceipts(chapter?.raw_payload || chapter?.rawPayload || {})?.revision_receipts || []
  return asArray(receipts)
}

function deliveryRiskReceiptRevisionKey(receipt: any) {
  return [
    compactBriefText(receipt?.risk_item || receipt?.riskItem || receipt?.item || receipt?.label),
    compactBriefText(receipt?.required_action || receipt?.requiredAction || receipt?.action || receipt?.fix),
  ].filter(Boolean).join('｜')
}

function revisionReceiptSearchText(receipt: any) {
  return [
    receipt?.risk_item,
    receipt?.riskItem,
    receipt?.required_action,
    receipt?.requiredAction,
    receipt?.repair_segment,
    receipt?.repairSegment,
    receipt?.category,
    receipt?.type,
    receipt?.original_evidence,
    receipt?.originalEvidence,
    receipt?.applied_fix,
    receipt?.appliedFix,
    receipt?.changed_evidence,
    receipt?.changedEvidence,
  ].map((item: any) => compactBriefText(item)).filter(Boolean).join('｜')
}

function revisionReceiptMatchesDeliveryRisk(receipt: any, deliveryRiskReceipt: any) {
  const haystack = revisionReceiptSearchText(receipt)
  const riskItem = compactBriefText(deliveryRiskReceipt?.risk_item || deliveryRiskReceipt?.riskItem || deliveryRiskReceipt?.item || deliveryRiskReceipt?.label)
  const requiredAction = compactBriefText(deliveryRiskReceipt?.required_action || deliveryRiskReceipt?.requiredAction || deliveryRiskReceipt?.action || deliveryRiskReceipt?.fix)
  const repairSegment = compactBriefText(deliveryRiskReceipt?.repair_segment || deliveryRiskReceipt?.repairSegment || inferDeliveryRiskReceiptRepairSegment(deliveryRiskReceipt))
  if (requiredAction && haystack.includes(requiredAction)) return true
  if (riskItem && haystack.includes(riskItem)) return true
  return Boolean(repairSegment && haystack.includes(repairSegment) && (riskItem || requiredAction))
}

function missingDeliveryRiskRevisionReceiptRows(selfCheck: any = {}, revisionReceipts: any[] = []) {
  const review = selfCheck?.review || selfCheck?.initial_review || {}
  const failedDeliveryRiskReceipts = [
    ...asArray(review?.delivery_risk_receipts || review?.deliveryRiskReceipts),
    ...asArray(selfCheck?.delivery_risk_receipts || selfCheck?.deliveryRiskReceipts),
  ]
    .filter((receipt: any) => deliveryRiskReceiptRemainingRisk(receipt))
  return failedDeliveryRiskReceipts
    .filter((receipt: any) => !revisionReceipts.some((revisionReceipt: any) => revisionReceiptMatchesDeliveryRisk(revisionReceipt, receipt)))
    .map((receipt: any) => {
      const riskItem = compactBriefText(receipt?.risk_item || receipt?.riskItem || receipt?.item || receipt?.label, '交稿风险')
      const requiredAction = compactBriefText(receipt?.required_action || receipt?.requiredAction || receipt?.action || receipt?.fix)
      const repairSegment = compactBriefText(receipt?.repair_segment || receipt?.repairSegment || inferDeliveryRiskReceiptRepairSegment(receipt))
      const remainingRisk = deliveryRiskReceiptRemainingRisk(receipt)
      return {
        issue_index: null,
        severity: 'S2',
        category: 'delivery_risk_receipt',
        label: '交稿风险修订回执缺失',
        text: `缺少对应交稿风险修订回执：${deliveryRiskReceiptRevisionKey(receipt) || riskItem}`,
        evidence: [repairSegment, remainingRisk, compactBriefText(receipt?.evidence)].filter(Boolean).join('｜'),
        applied_fix: '',
      }
    })
}

export function buildProseRevisionReceiptSyncReport(chapter: any, selfCheck: any = {}) {
  const revision = selfCheck?.revision || selfCheck?.revised_revision || selfCheck || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const storedReceipts = storedRevisionReceiptsFromChapter(chapter)
  const chapterText = chapterReceiptProseText(chapter)
  const allReceipts = [
    ...asArray(revisionDeliveryReceipts?.revision_receipts || revisionDeliveryReceipts?.revisionReceipts),
    ...asArray(revision?.revision_receipts || revision?.revisionReceipts),
    ...asArray(selfCheck?.revision_receipts || selfCheck?.revisionReceipts),
    ...storedReceipts,
  ]
  const missingReceiptsAfterRevision = Boolean(selfCheck?.revised || revision?.revised) && allReceipts.length === 0
  const receiptResiduals = missingReceiptsAfterRevision
    ? [{
        issue_index: null,
        severity: 'S2',
        category: 'revision_receipt',
        label: '修订回执未生成',
        text: '本章已执行修订，但没有生成逐项 revision_receipts，无法确认修订是否逐条闭环。',
        evidence: 'revision_receipts 为空',
        applied_fix: '',
      }]
    : proseRevisionReceiptRows(selfCheck, storedReceipts, chapterText)
  const missingDeliveryRiskReceipts = missingDeliveryRiskRevisionReceiptRows(selfCheck, allReceipts)
  const missed = [...receiptResiduals, ...missingDeliveryRiskReceipts]
  const status = missed.length > 0 ? 'warn' : 'ok'
  const nextActions = status === 'ok'
    ? ['保持修订回执逐条对应自检 issues，changed_evidence 必须引用修订后的具体正文。']
    : missingReceiptsAfterRevision
      ? [
        '重新执行修订或复核修订结果，必须输出 revision_receipts。',
        'revision_receipts 要逐条对应自检 issues、delivery_risk_receipts 或确定性检查缺口，并引用 changed_evidence。',
      ]
      : [
        missingDeliveryRiskReceipts.length > 0
          ? '补齐 delivery_risk_receipts 对应的 revision_receipts；每条必须写 required_action、repair_segment、applied_fix 和 changed_evidence。'
          : '',
        '下一章或下一轮修订只补修订后仍残留的风险，不要重写整章。',
        '残留项必须用动作、对白、场景后果或状态写回解决，并在新回执中给出 changed_evidence。',
      ].filter(Boolean)
  return {
    report_id: `prose-revision-receipt-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: allReceipts.length === 0 ? '修订回执未生成' : status === 'ok' ? '修订回执 OK' : `修订回执残留 ${missed.length}`,
    summary: allReceipts.length === 0
      ? '本章没有生成逐项修订回执，无法确认修订是否逐条闭环。'
      : status === 'ok'
        ? '本章修订回执没有残留风险。'
        : `修订后仍有 ${missed.length} 项残留风险需要下一轮写作或修订优先处理。`,
    receipt_count: allReceipts.length,
    missed_count: missed.length,
    completed_count: Math.max(0, allReceipts.length - missed.length),
    missed,
    completed: allReceipts.length > missed.length ? allReceipts.filter((receipt: any) => !revisionReceiptSyncRisk(receipt, chapterText)).slice(0, 20) : [],
    next_actions: nextActions,
  }
}

function revisionContextReceiptRows(selfCheck: any = {}) {
  const revision = selfCheck?.revision || selfCheck?.revised_revision || selfCheck || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  return [
    ...asArray(revisionDeliveryReceipts?.revision_context_receipts || revisionDeliveryReceipts?.revisionContextReceipts),
    ...asArray(revision?.revision_context_receipts || revision?.revisionContextReceipts),
    ...asArray(selfCheck?.revision_context_receipts || selfCheck?.revisionContextReceipts),
  ]
}

const REVISION_CONTEXT_RECEIPT_REQUIRED_FIELDS = ['key', 'label', 'status', 'evidence', 'fix', 'source_excerpt']

function revisionContextReceiptMissingFields(receipt: any) {
  const value = receipt || {}
  return REVISION_CONTEXT_RECEIPT_REQUIRED_FIELDS.filter(field => {
    if (field === 'source_excerpt') return !compactBriefText(value.source_excerpt || value.sourceExcerpt)
    return !compactBriefText(value[field])
  })
}

export function buildRevisionContextReceiptSyncReport(chapter: any, selfCheck: any = {}) {
  const revision = selfCheck?.revision || selfCheck?.revised_revision || selfCheck || {}
  const allReceipts = revisionContextReceiptRows(selfCheck)
  const revised = Boolean(selfCheck?.revised || revision?.revised || allReceipts.length > 0)
  const missingReceiptsAfterRevision = revised && allReceipts.length === 0
  const missed = missingReceiptsAfterRevision
    ? [{
        key: 'missing_revision_context_receipts',
        label: '修订上下文回执未生成',
        evidence: 'revision_context_receipts 为空',
        fix: '修订后必须逐项输出 previous_chapter、next_chapter、foreshadowing、character_cards、timeline、setting_context 等上下文核对结果。',
      }]
    : allReceipts
      .map((receipt: any) => {
        const remainingRisk = compactBriefText(receipt?.remaining_risk || receipt?.remainingRisk || receipt?.risk)
        const statusText = String(receipt?.status || '').toLowerCase()
        const missingFields = revisionContextReceiptMissingFields(receipt)
        const needsRepair = platformCheckNeedsCarryOver(receipt)
          || Boolean(remainingRisk)
          || ['warn', 'warning', 'fail', 'failed', 'error', 'blocked'].includes(statusText)
          || missingFields.length > 0
        if (!needsRepair) return null
        const missingFieldText = missingFields.length > 0 ? `缺少字段：${missingFields.join(', ')}` : ''
        const receiptEvidence = compactBriefText(
          receipt?.evidence
          || receipt?.source_excerpt
          || receipt?.sourceExcerpt
          || receipt?.missing_source
          || receipt?.missingSource
          || remainingRisk,
        )
        const receiptFix = compactBriefText(
          receipt?.fix
          || receipt?.required_action
          || receipt?.requiredAction
          || receipt?.repair_instruction
          || receipt?.repairInstruction
          || remainingRisk,
        )
        return {
          key: compactBriefText(receipt?.key || receipt?.type || receipt?.category || 'revision_context'),
          label: compactBriefText(receipt?.label || receipt?.name || receipt?.title, '修订上下文'),
          evidence: [missingFieldText, receiptEvidence].filter(Boolean).join('；'),
          fix: [
            missingFields.length > 0 ? '补齐 revision_context_receipts 必需字段 key,label,status,evidence,fix,source_excerpt。' : '',
            receiptFix,
          ].filter(Boolean).join('；'),
          status: missingFields.length > 0 ? 'warn' : statusText || 'warn',
        }
      })
      .filter(Boolean)
  const status = missed.length > 0 ? 'warn' : 'ok'
  return {
    report_id: `revision-context-receipts-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: allReceipts.length === 0
      ? missingReceiptsAfterRevision ? '修订上下文回执未生成' : '修订上下文未触发'
      : status === 'ok' ? '修订上下文 OK' : `修订上下文残留 ${missed.length}`,
    summary: allReceipts.length === 0
      ? missingReceiptsAfterRevision
        ? '本章已执行修订，但没有生成 revision_context_receipts，无法确认修订前后上下文是否一致。'
        : '本章未执行修订，不触发修订上下文回执检查。'
      : status === 'ok'
        ? '本章修订上下文回执没有残留风险。'
        : `修订上下文仍有 ${missed.length} 项需要同步或承接。`,
    receipt_count: allReceipts.length,
    missed_count: missed.length,
    completed_count: Math.max(0, allReceipts.length - missed.length),
    missed,
    completed: allReceipts.length > missed.length
      ? allReceipts.filter((receipt: any) => !platformCheckNeedsCarryOver(receipt) && !compactBriefText(receipt?.remaining_risk || receipt?.remainingRisk || receipt?.risk) && revisionContextReceiptMissingFields(receipt).length === 0).slice(0, 20)
      : [],
    next_actions: status === 'ok'
      ? ['保持 revision_context_receipts 闭环：修订前后上下文来源、伏笔、角色卡、时间线、设定和关系边界都要有核对证据。']
      : missingReceiptsAfterRevision
        ? [
            '重新复核修订结果，补齐 revision_context_receipts。',
            'revision_context_receipts 必须逐项覆盖 previous_chapter、next_chapter、foreshadowing、character_cards、timeline、setting_context、资产归属和关系边界。',
          ]
        : [
            '补齐 revision_context_receipts 中 status=warn/fail、remaining_risk 非空或缺少 key,label,status,evidence,fix,source_excerpt 的上下文差异。',
            '下一章或下一轮修订开始前，先同步 previous_chapter、next_chapter、伏笔、角色卡、时间线、设定和关系边界，不能让旧上下文覆盖修订后的正史。',
          ],
  }
}

function nextChapterQualityPlanReceiptRows(chapter: any = {}, selfCheck: any = {}) {
  const review = selfCheck?.review || selfCheck?.initial_review || {}
  const revision = selfCheck?.revision || selfCheck?.revised_revision || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const storedPreDraftReceipts = normalizeStoredOhStoryDeliveryReceipts(chapter?.raw_payload || chapter?.rawPayload || {})
    ?.pre_draft_execution_receipts
  const sources = [
    ...preDraftExecutionReceiptSections(selfCheck),
    revisionDeliveryReceipts?.pre_draft_execution_receipts || revisionDeliveryReceipts?.preDraftExecutionReceipts,
    revision?.pre_draft_execution_receipts || revision?.preDraftExecutionReceipts,
    storedPreDraftReceipts,
    chapter?.raw_payload?.pre_draft_execution_receipts || chapter?.rawPayload?.preDraftExecutionReceipts,
  ].filter(Boolean)
  const receipts = [
    ...asArray(review?.next_chapter_quality_plan_receipts || review?.nextChapterQualityPlanReceipts),
    ...asArray(revision?.next_chapter_quality_plan_receipts || revision?.nextChapterQualityPlanReceipts),
    ...asArray(selfCheck?.next_chapter_quality_plan_receipts || selfCheck?.nextChapterQualityPlanReceipts),
    ...sources.flatMap((source: any) => asArray(source?.next_chapter_quality_plan_receipts || source?.nextChapterQualityPlanReceipts)),
  ]
  const seen = new Set<string>()
  return receipts.filter((receipt: any) => {
    if (!receipt || typeof receipt !== 'object') return false
    const key = JSON.stringify({
      quality_focus: receipt?.quality_focus || receipt?.qualityFocus || receipt?.label || receipt?.key,
      evidence: receipt?.evidence || receipt?.changed_evidence || receipt?.changedEvidence || receipt?.source_excerpt || receipt?.sourceExcerpt,
      remaining_risk: receipt?.remaining_risk || receipt?.remainingRisk,
      status: receipt?.status,
      delivered: receipt?.delivered,
    })
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function nextChapterQualityPlanReceiptEvidence(receipt: any) {
  return compactBriefText(
    receipt?.evidence
    || receipt?.changed_evidence
    || receipt?.changedEvidence
    || receipt?.source_excerpt
    || receipt?.sourceExcerpt,
  )
}

function chapterReceiptProseText(chapter: any = {}) {
  return chapter?.chapter_text || chapter?.chapterText || chapter?.final_text || chapter?.finalText || chapter?.text || ''
}

function nextChapterQualityPlanReceiptSegment(receipt: any) {
  const searchable = [
    receipt?.key,
    receipt?.label,
    receipt?.field,
    receipt?.quality_focus,
    receipt?.qualityFocus,
    receipt?.required_action,
    receipt?.requiredAction,
    receipt?.action,
    receipt?.fix,
  ].map((item: any) => compactBriefText(item)).join(' ')
  if (/opening_actions|opening|start|开篇|章首|开场|前300|前三百|第一屏/.test(searchable)) return 'opening_actions'
  if (/ending_actions|ending|end|章末|章尾|结尾|最后300|后三百|翻页|钩子|悬念/.test(searchable)) return 'ending_actions'
  if (/middle_actions|middle|mid|中段|场景推进|事件推进|推进|冲突|证据|状态变化|关系变化/.test(searchable)) return 'middle_actions'
  return ''
}

function nextChapterQualityPlanReceiptSegmentRisk(receipt: any, evidence: any, chapterText: any) {
  const segment = nextChapterQualityPlanReceiptSegment(receipt)
  if (receiptEvidenceLocatedInQualityPlanSegment(evidence, chapterText, segment)) return ''
  if (segment === 'opening_actions') return '质量续航回执 opening_actions 的 evidence 未落在前300字。'
  if (segment === 'middle_actions') return '质量续航回执 middle_actions 的 evidence 未落在中段事件推进。'
  if (segment === 'ending_actions') return '质量续航回执 ending_actions 的 evidence 未落在最后300字。'
  return ''
}

function nextChapterQualityPlanReceiptRisk(receipt: any, chapterText = '') {
  const evidence = nextChapterQualityPlanReceiptEvidence(receipt)
  if (evidence && isGenericDeliveryRiskEvidence(evidence)) {
    return '质量续航回执缺少可定位正文证据。'
  }
  if (preDraftReceiptCheckNeedsCarryOver(receipt)) {
    return revisionReceiptRemainingRisk(receipt)
      || compactBriefText(receipt?.risk || receipt?.remaining_risk || receipt?.remainingRisk)
      || (receipt?.delivered === false ? '质量续航计划未证明已落成正文。' : '')
      || `质量续航回执状态未通过：${compactBriefText(receipt?.status, 'missing')}`
  }
  if (!evidence) {
    return '缺少 evidence/source_excerpt，无法证明质量续航计划已落成正文。'
  }
  if (!receiptEvidenceLocatedInProse(evidence, chapterText)) {
    return '质量续航回执 evidence 无法定位到本章正文。'
  }
  const segmentRisk = nextChapterQualityPlanReceiptSegmentRisk(receipt, evidence, chapterText)
  if (segmentRisk) return segmentRisk
  return ''
}

export function buildNextChapterQualityPlanReceiptSyncReport(chapter: any, contextPackage: any = {}, selfCheck: any = {}) {
  const requiresReceipts = contextHasNextChapterQualityPlanDebt(contextPackage)
  const allReceipts = nextChapterQualityPlanReceiptRows(chapter, selfCheck)
  const chapterText = chapterReceiptProseText(chapter)
  const residuals = allReceipts
    .map((receipt: any) => {
      const risk = nextChapterQualityPlanReceiptRisk(receipt, chapterText)
      if (!risk) return null
      return {
        key: 'next_chapter_quality_plan_receipts',
        label: compactBriefText(receipt?.quality_focus || receipt?.qualityFocus || receipt?.label || receipt?.key, '质量续航回执'),
        text: risk,
        evidence: nextChapterQualityPlanReceiptEvidence(receipt),
        required_action: compactBriefText(receipt?.required_action || receipt?.requiredAction || receipt?.fix || receipt?.action),
      }
    })
    .filter(Boolean)
  const missed = requiresReceipts && allReceipts.length === 0
    ? [{
        key: 'next_chapter_quality_plan_receipts',
        label: '质量续航回执未生成',
        text: `第${chapter?.chapter_no || '-'}章未返回质量续航回执复检证据。`,
        evidence: 'delivery_risk_carry_over 存在，但 next_chapter_quality_plan_receipts 为空。',
        required_action: '补齐 next_chapter_quality_plan_receipts，逐项证明上一章质量续航计划已落成正文证据。',
      }]
    : residuals
  const status = missed.length > 0 ? 'warn' : 'ok'
  return {
    report_id: `next-chapter-quality-plan-receipt-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: allReceipts.length === 0
      ? requiresReceipts ? '质量续航回执未生成' : '质量续航回执未触发'
      : status === 'ok' ? '质量续航回执 OK' : `质量续航回执残留 ${missed.length}`,
    summary: allReceipts.length === 0
      ? requiresReceipts
        ? '本章承接了上一章质量续航计划，但没有返回 next_chapter_quality_plan_receipts。'
        : '本章没有触发必须闭环的质量续航回执。'
      : status === 'ok'
        ? '上一章质量续航计划已通过回执证明落成到本章正文。'
        : `质量续航回执仍有 ${missed.length} 项未闭环。`,
    requires_receipts: requiresReceipts,
    receipt_count: allReceipts.length,
    missed_count: missed.length,
    completed_count: Math.max(0, allReceipts.length - missed.length),
    missed,
    completed: allReceipts.filter((receipt: any) => !nextChapterQualityPlanReceiptRisk(receipt, chapterText)).slice(0, 20),
    next_actions: status === 'ok'
      ? ['保持 next_chapter_quality_plan_receipts 逐项引用本章正文证据，证明上一章质量续航计划已落成。']
      : [
          '补齐 next_chapter_quality_plan_receipts；逐项覆盖 quality_focus、opening_actions、middle_actions、ending_actions、avoid_repetition、evidence_basis 和 ending_contract。',
          '每条回执必须写 delivered/status、evidence 或 source_excerpt；仍未兑现的项必须写 remaining_risk 和下一轮修复动作。',
        ],
  }
}

function statusFilterReceiptRows(chapter: any = {}, selfCheck: any = {}) {
  const review = selfCheck?.review || selfCheck?.initial_review || {}
  const revision = selfCheck?.revision || selfCheck?.revised_revision || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const storedPreDraftReceipts = normalizeStoredOhStoryDeliveryReceipts(chapter?.raw_payload || chapter?.rawPayload || {})
    ?.pre_draft_execution_receipts
  const sources = [
    ...preDraftExecutionReceiptSections(selfCheck),
    revisionDeliveryReceipts?.pre_draft_execution_receipts || revisionDeliveryReceipts?.preDraftExecutionReceipts,
    revision?.pre_draft_execution_receipts || revision?.preDraftExecutionReceipts,
    storedPreDraftReceipts,
    chapter?.raw_payload?.pre_draft_execution_receipts || chapter?.rawPayload?.preDraftExecutionReceipts,
  ].filter(Boolean)
  const receipts = [
    ...asArray(review?.status_filter_receipts || review?.statusFilterReceipts),
    ...asArray(revision?.status_filter_receipts || revision?.statusFilterReceipts),
    ...asArray(selfCheck?.status_filter_receipts || selfCheck?.statusFilterReceipts),
    ...sources.flatMap((source: any) => asArray(source?.status_filter_receipts || source?.statusFilterReceipts)),
  ]
  const seen = new Set<string>()
  return receipts.filter((receipt: any) => {
    if (!receipt || typeof receipt !== 'object') return false
    const key = JSON.stringify({
      key: receipt?.key || receipt?.label || receipt?.name,
      used: receipt?.used_in_chapter ?? receipt?.usedInChapter,
      evidence: receipt?.evidence || receipt?.source_excerpt || receipt?.sourceExcerpt,
      excluded_reason: receipt?.excluded_reason || receipt?.excludedReason,
      remaining_risk: receipt?.remaining_risk || receipt?.remainingRisk,
      status: receipt?.status,
    })
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function statusFilterContractRowsFromValue(value: any, field: string, rows: any[] = []) {
  if (value === undefined || value === null) return rows
  if (Array.isArray(value)) {
    value.forEach((item, index) => statusFilterContractRowsFromValue(item, `${field}_${index + 1}`, rows))
    return rows
  }
  if (typeof value === 'object') {
    const label = compactBriefText(value.label || value.name || value.key || value.title)
    const text = compactBriefText(
      value.text
      || value.summary
      || value.state
      || value.rule
      || value.requirement
      || value.description
      || value.evidence,
    )
    if (text || label) {
      rows.push({
        key: compactBriefText(value.key || field),
        label: label || field,
        text: text || label,
      })
      return rows
    }
    Object.entries(value).forEach(([childKey, childValue]) => {
      statusFilterContractRowsFromValue(childValue, `${field}_${childKey}`, rows)
    })
    return rows
  }
  const text = compactBriefText(value)
  if (text) rows.push({ key: field, label: field, text })
  return rows
}

function statusFilterContractRows(contextPackage: any = {}) {
  const contract = getContextContract(contextPackage, 'state_tracking_contract')
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) return []
  const fields = [
    'character_states',
    'characterStates',
    'foreshadowing_threads',
    'foreshadowingThreads',
    'timeline_constraints',
    'timelineConstraints',
    'world_constraints',
    'worldConstraints',
    'source_requirements',
    'sourceRequirements',
    'filter_rules',
    'filterRules',
  ]
  const rows = fields.flatMap(field => statusFilterContractRowsFromValue(contract?.[field], field))
  const seen = new Set<string>()
  return rows
    .map((row: any, index: number) => ({
      key: compactBriefText(row.key || `state_tracking_contract_${index + 1}`)
        .replace(/[^\w\u3400-\u9fff]+/g, '_')
        .replace(/^_+|_+$/g, '')
        || `state_tracking_contract_${index + 1}`,
      label: compactBriefText(row.label || row.key || `状态筛选${index + 1}`),
      text: compactBriefText(row.text || row.label || row.key),
    }))
    .filter((row: any) => {
      if (!row.text) return false
      const key = `${row.key}::${row.text}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function commonChineseSubstringEvidence(sourceText: string, chapterText: string) {
  const source = deliveryRiskEvidenceSearchText(sourceText)
  const prose = deliveryRiskEvidenceSearchText(chapterText)
  if (!source || !prose) return ''
  let best = ''
  for (let length = Math.min(18, source.length); length >= 4; length -= 1) {
    for (let index = 0; index <= source.length - length; index += 1) {
      const candidate = source.slice(index, index + length)
      if (!/[\u3400-\u9fff]{4,}/.test(candidate)) continue
      if (!prose.includes(candidate)) continue
      best = candidate
      break
    }
    if (best) break
  }
  return best
}

function fallbackStatusFilterReceiptsFromContext(contextPackage: any = {}, chapterText = '') {
  if (!compactBriefText(chapterText)) return []
  return statusFilterContractRows(contextPackage).map((row: any) => {
    const evidence = commonChineseSubstringEvidence(row.text, chapterText)
    if (evidence) {
      return {
        key: row.key,
        label: row.label,
        status: 'pass',
        used_in_chapter: true,
        evidence,
        excluded_reason: '',
        remaining_risk: '',
        fallback_generated: true,
      }
    }
    return {
      key: row.key,
      label: row.label,
      status: 'pass',
      used_in_chapter: false,
      evidence: '',
      excluded_reason: `本章正文没有直接调用「${row.text}」；按状态筛选合同排除，不作为本章事实依据。`,
      remaining_risk: '',
      fallback_generated: true,
    }
  })
}

function statusFilterReceiptRisk(receipt: any, chapterText = '') {
  const usedInChapter = receipt?.used_in_chapter ?? receipt?.usedInChapter
  const evidence = compactBriefText(receipt?.evidence || receipt?.source_excerpt || receipt?.sourceExcerpt)
  const excludedReason = compactBriefText(receipt?.excluded_reason || receipt?.excludedReason)
  if (usedInChapter === false && excludedReason && isGenericDeliveryRiskEvidence(excludedReason)) return '未使用的状态缺少具体 excluded_reason，无法确认排除后不会导致本章写错。'
  if (usedInChapter !== false && evidence && isGenericDeliveryRiskEvidence(evidence)) return '已使用或未声明排除的状态缺少可定位正文证据。'
  const directRisk = preDraftReceiptCheckNeedsCarryOver(receipt)
    ? compactBriefText(receipt?.remaining_risk || receipt?.remainingRisk || receipt?.risk)
      || (receipt?.delivered === false ? '状态筛选回执未证明已落成正文。' : '')
      || `状态筛选回执状态未通过：${compactBriefText(receipt?.status, 'missing')}`
    : ''
  if (directRisk) return directRisk
  if (usedInChapter === false && !excludedReason) return '未使用的状态缺少 excluded_reason，无法确认排除后不会导致本章写错。'
  if (usedInChapter !== false && !evidence) return '已使用或未声明排除的状态缺少 evidence，无法回指本章正文证据。'
  if (usedInChapter !== false && !receiptEvidenceLocatedInProse(evidence, chapterText)) return '已使用或未声明排除的状态 evidence 无法定位到本章正文。'
  return ''
}

export function buildStatusFilterReceiptSyncReport(chapter: any, contextPackage: any = {}, selfCheck: any = {}) {
  const requiresReceipts = contextHasStatusFilterReceiptDebt(contextPackage)
  const chapterText = chapterReceiptProseText(chapter)
  const explicitReceipts = statusFilterReceiptRows(chapter, selfCheck)
  const shouldBuildFallbackReceipts = explicitReceipts.length <= 0 || Boolean(selfCheck?.revised)
  const fallbackReceipts = shouldBuildFallbackReceipts
    ? fallbackStatusFilterReceiptsFromContext(contextPackage, chapterText)
    : []
  const receiptResiduals = (receipts: any[]) => receipts
    .map((receipt: any) => {
      const risk = statusFilterReceiptRisk(receipt, chapterText)
      if (!risk) return null
      return {
        key: 'status_filter_receipts',
        label: compactBriefText(receipt?.label || receipt?.key || receipt?.name, '状态筛选回执'),
        text: risk,
        evidence: compactBriefText(receipt?.evidence || receipt?.source_excerpt || receipt?.sourceExcerpt),
        excluded_reason: compactBriefText(receipt?.excluded_reason || receipt?.excludedReason),
        used_in_chapter: receipt?.used_in_chapter ?? receipt?.usedInChapter ?? null,
      }
    })
    .filter(Boolean)
  const explicitResiduals = receiptResiduals(explicitReceipts)
  const fallbackResiduals = receiptResiduals(fallbackReceipts)
  const useFallbackReceipts = explicitReceipts.length <= 0
    || (Boolean(selfCheck?.revised) && explicitResiduals.length > 0 && fallbackReceipts.length > 0 && fallbackResiduals.length === 0)
  const allReceipts = useFallbackReceipts ? fallbackReceipts : explicitReceipts
  const residuals = useFallbackReceipts ? fallbackResiduals : explicitResiduals
  const missed = requiresReceipts && allReceipts.length === 0
    ? [{
        key: 'status_filter_receipts',
        label: '状态筛选回执未生成',
        text: `第${chapter?.chapter_no || '-'}章未返回状态筛选回执复检证据。`,
        evidence: 'state_tracking_contract 存在，但 status_filter_receipts 为空。',
        excluded_reason: '',
        used_in_chapter: null,
      }]
    : residuals
  const status = missed.length > 0 ? 'warn' : 'ok'
  return {
    report_id: `status-filter-receipt-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: allReceipts.length === 0
      ? requiresReceipts ? '状态筛选回执未生成' : '状态筛选回执未触发'
      : status === 'ok' ? '状态筛选回执 OK' : `状态筛选回执残留 ${missed.length}`,
    summary: allReceipts.length === 0
      ? requiresReceipts
        ? '本章存在状态筛选合同，但没有返回 status_filter_receipts。'
        : '本章没有触发必须闭环的状态筛选回执。'
      : status === 'ok'
        ? fallbackReceipts.length > 0
          ? '状态筛选回执由 state_tracking_contract 兜底生成，已说明哪些状态影响本章正确性，以及未使用状态的排除理由。'
          : '状态筛选回执已说明哪些状态影响本章正确性，以及未使用状态的排除理由。'
        : `状态筛选回执仍有 ${missed.length} 项未闭环。`,
    requires_receipts: requiresReceipts,
    fallback_generated: useFallbackReceipts && fallbackReceipts.length > 0,
    receipt_count: allReceipts.length,
    missed_count: missed.length,
    completed_count: Math.max(0, allReceipts.length - missed.length),
    missed,
    completed: allReceipts.filter((receipt: any) => !statusFilterReceiptRisk(receipt, chapterText)).slice(0, 20),
    next_actions: status === 'ok'
      ? ['保持 status_filter_receipts 逐项说明 used_in_chapter、evidence 或 excluded_reason，证明状态筛选没有依赖聊天记忆。']
      : [
          '补齐 status_filter_receipts；逐项覆盖角色状态、相关伏笔/前史、时间线、世界约束、filter_rules 和 source_requirements。',
          '已用于本章的状态必须给 evidence 或 source_excerpt；未使用的状态必须给 excluded_reason，说明为什么不会导致本章写错。',
        ],
  }
}

function contextHasWritePreparationReceiptDebt(contextPackage: any = {}) {
  const brief = getContextContract(contextPackage, 'write_preparation_brief')
  return Boolean(brief && typeof brief === 'object' && !Array.isArray(brief) && Object.keys(brief).length > 0)
}

function writePreparationReceiptRows(chapter: any = {}, selfCheck: any = {}) {
  const review = selfCheck?.review || selfCheck?.initial_review || {}
  const revision = selfCheck?.revision || selfCheck?.revised_revision || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const storedPreDraftReceipts = normalizeStoredOhStoryDeliveryReceipts(chapter?.raw_payload || chapter?.rawPayload || {})
    ?.pre_draft_execution_receipts
  const sources = [
    ...preDraftExecutionReceiptSections(selfCheck),
    revisionDeliveryReceipts?.pre_draft_execution_receipts || revisionDeliveryReceipts?.preDraftExecutionReceipts,
    revision?.pre_draft_execution_receipts || revision?.preDraftExecutionReceipts,
    storedPreDraftReceipts,
    chapter?.raw_payload?.pre_draft_execution_receipts || chapter?.rawPayload?.preDraftExecutionReceipts,
  ].filter(Boolean)
  const receipts = [
    ...asArray(review?.write_preparation_checks || review?.writePreparationChecks),
    ...asArray(revision?.write_preparation_checks || revision?.writePreparationChecks),
    ...asArray(selfCheck?.write_preparation_checks || selfCheck?.writePreparationChecks),
    ...sources.flatMap((source: any) => asArray(source?.write_preparation_checks || source?.writePreparationChecks)),
  ]
  const seen = new Set<string>()
  return receipts.filter((receipt: any) => {
    if (!receipt || typeof receipt !== 'object') return false
    const key = JSON.stringify({
      key: receipt?.key || receipt?.label || receipt?.name,
      delivered: receipt?.delivered,
      evidence: receipt?.evidence || receipt?.source_excerpt || receipt?.sourceExcerpt,
      remaining_risk: receipt?.remaining_risk || receipt?.remainingRisk,
      status: receipt?.status,
    })
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function writePreparationReceiptEvidence(receipt: any) {
  return compactBriefText(
    receipt?.evidence
    || receipt?.delivered_evidence
    || receipt?.deliveredEvidence
    || receipt?.changed_evidence
    || receipt?.changedEvidence
    || receipt?.source_excerpt
    || receipt?.sourceExcerpt,
  )
}

function writePreparationReceiptSegmentRisk(receipt: any, evidence: any, chapterText: any) {
  const segment = nextChapterQualityPlanReceiptSegment(receipt)
  if (receiptEvidenceLocatedInQualityPlanSegment(evidence, chapterText, segment)) return ''
  if (segment === 'opening_actions') return '写前准备回执 opening_actions 的 evidence 未落在前300字。'
  if (segment === 'middle_actions') return '写前准备回执 middle_actions 的 evidence 未落在中段事件推进。'
  if (segment === 'ending_actions') return '写前准备回执 ending_actions 的 evidence 未落在最后300字。'
  return ''
}

function writePreparationReceiptRisk(receipt: any, chapterText = '') {
  if (preDraftReceiptCheckNeedsCarryOver(receipt)) {
    return revisionReceiptRemainingRisk(receipt)
      || compactBriefText(receipt?.risk || receipt?.remaining_risk || receipt?.remainingRisk)
      || (receipt?.delivered === false ? '写前准备回执未证明已落成正文。' : '')
      || `写前准备回执状态未通过：${compactBriefText(receipt?.status, 'missing')}`
  }
  const evidence = writePreparationReceiptEvidence(receipt)
  if (isGenericDeliveryRiskEvidence(evidence)) return '写前准备回执缺少可定位正文证据。'
  if (!receiptEvidenceLocatedInProse(evidence, chapterText)) return '写前准备回执 evidence 无法定位到本章正文。'
  const segmentRisk = writePreparationReceiptSegmentRisk(receipt, evidence, chapterText)
  if (segmentRisk) return segmentRisk
  return ''
}

export function buildWritePreparationReceiptSyncReport(project: any, chapter: any, contextPackage: any = {}, chapterText = '', selfCheck: any = {}) {
  const requiresReceipts = contextHasWritePreparationReceiptDebt(contextPackage)
  const allReceipts = writePreparationReceiptRows(chapter, selfCheck)
  const residuals = allReceipts
    .map((receipt: any) => {
      const risk = writePreparationReceiptRisk(receipt, chapterText)
      if (!risk) return null
      return {
        key: compactBriefText(receipt?.key || receipt?.name || 'write_preparation_checks'),
        label: compactBriefText(receipt?.label || receipt?.key || receipt?.name, '写前准备'),
        text: risk,
        evidence: writePreparationReceiptEvidence(receipt),
        required_action: compactBriefText(receipt?.required_action || receipt?.requiredAction || receipt?.fix || receipt?.action),
        delivered: receipt?.delivered ?? null,
      }
    })
    .filter(Boolean)
  const missed = requiresReceipts && allReceipts.length === 0
    ? [{
        key: 'write_preparation_checks',
        label: '写前准备回执未生成',
        text: `第${chapter?.chapter_no || '-'}章未返回写前准备回执复检证据。`,
        evidence: 'write_preparation_brief 存在，但 write_preparation_checks 为空。',
        required_action: '补齐 write_preparation_checks，逐项证明来源缺口、资产风险、蓝图焦点、读者回报焦点和执行顺序已落成正文证据。',
        delivered: false,
      }]
    : residuals
  const status = missed.length > 0 ? 'warn' : 'ok'
  return {
    report_id: `write-preparation-receipt-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: allReceipts.length === 0
      ? requiresReceipts ? '写前准备回执未生成' : '写前准备回执未触发'
      : status === 'ok' ? '写前准备回执 OK' : `写前准备缺口 ${missed.length}`,
    summary: allReceipts.length === 0
      ? requiresReceipts
        ? '本章存在写前准备卡，但没有返回 write_preparation_checks。'
        : '本章没有触发必须闭环的写前准备回执。'
      : status === 'ok'
        ? '写前准备回执已证明来源缺口、资产风险、蓝图焦点、读者回报和执行顺序落成正文。'
        : `写前准备回执仍有 ${missed.length} 项未闭环。`,
    requires_receipts: requiresReceipts,
    receipt_count: allReceipts.length,
    missed_count: missed.length,
    completed_count: Math.max(0, allReceipts.length - missed.length),
    missed,
    completed: allReceipts.filter((receipt: any) => !writePreparationReceiptRisk(receipt, chapterText)).slice(0, 20),
    next_actions: status === 'ok'
      ? ['保持 write_preparation_checks 逐项引用本章正文证据，证明写前准备不是只停留在任务书。']
      : [
          '补齐 write_preparation_checks；逐项覆盖来源缺口、资产风险、上一轮待修复、创作契约清单、蓝图焦点、读者回报焦点和 must_confirm。',
          '每条回执必须写 delivered/status、evidence 或 source_excerpt；仍未兑现的项必须写 remaining_risk 和下一轮修复动作。',
        ],
  }
}

export function buildDeslopRepairReceiptSyncReport(chapter: any, selfCheck: any = {}) {
  const revision = selfCheck?.revision || selfCheck?.revised_revision || selfCheck || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const chapterText = chapterReceiptProseText(chapter)
  const allReceipts = [
    ...asArray(revisionDeliveryReceipts?.deslop_repair_receipts || revisionDeliveryReceipts?.deslopRepairReceipts),
    ...asArray(revision?.deslop_repair_receipts || revision?.deslopRepairReceipts),
    ...asArray(selfCheck?.deslop_repair_receipts || selfCheck?.deslopRepairReceipts),
  ]
  const deslopRisks = proseQualityDeslopRisks({ self_check: selfCheck })
  const missingReceiptsAfterRepair = Boolean(selfCheck?.revised || revision?.revised) && deslopRisks.length > 0 && allReceipts.length === 0
  const residualRisks = proseQualityDeslopRepairReceiptRisks({ self_check: selfCheck }, chapterText)
  const missed = missingReceiptsAfterRepair
    ? [{
        gate: 'Gate A-G',
        label: '去AI味修复回执未生成',
        text: '本章已执行去AI味修复，但没有生成逐项 deslop_repair_receipts，无法确认 Gate A-G 是否逐项闭环。',
        evidence: deslopRisks
          .map((item: any) => [item.gate, item.pattern || item.label, item.evidence || item.fix].filter(Boolean).join('｜'))
          .filter(Boolean)
          .slice(0, 5)
          .join('；') || 'deslop_repair_receipts 为空',
        risk: '缺少去AI味修复回执',
      }]
    : residualRisks.map((item: any) => ({
        gate: item.gate,
        label: item.label,
        text: item.risk,
        evidence: item.evidence,
        risk: item.risk,
      }))
  const status = missed.length > 0 ? 'warn' : 'ok'
  return {
    report_id: `deslop-repair-receipt-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: allReceipts.length === 0
      ? missingReceiptsAfterRepair ? '去AI味修复回执未生成' : '去AI味修复未触发'
      : status === 'ok' ? '去AI味修复回执 OK' : `去AI味修复回执残留 ${missed.length}`,
    summary: allReceipts.length === 0
      ? missingReceiptsAfterRepair
        ? '本章存在去AI味门禁缺口且已执行修订，但没有生成逐项去AI味修复回执。'
        : '本章没有触发需要闭环的去AI味修复回执。'
      : status === 'ok'
        ? '本章去AI味修复回执没有残留风险。'
        : `去AI味修复后仍有 ${missed.length} 项残留风险需要继续处理。`,
    receipt_count: allReceipts.length,
    missed_count: missed.length,
    completed_count: Math.max(0, allReceipts.length - missed.length),
    missed,
    completed: allReceipts.length > missed.length ? allReceipts.filter((receipt: any) => !revisionReceiptSyncRisk(receipt, chapterText)).slice(0, 20) : [],
    next_actions: status === 'ok'
      ? ['保持 deslop_repair_receipts 逐条对应 Gate A-G 缺口，changed_evidence 必须引用修订后的具体正文。']
      : missingReceiptsAfterRepair
        ? [
          '重新复核去AI味修复结果，必须输出 deslop_repair_receipts。',
          'deslop_repair_receipts 要逐条对应 deslop_checks 或 deslop_gate_diagnostics 的失败项，并引用 changed_evidence。',
        ]
        : [
          '下一轮修订只补仍残留的 Gate A-G 风险，不要重写整章。',
          '残留项必须改成可见动作、对白、场景后果或信息推进，并在新回执中给出 changed_evidence。',
        ],
  }
}

export function buildQualityAuditRepairReceiptSyncReport(chapter: any, selfCheck: any = {}) {
  const revision = selfCheck?.revision || selfCheck?.revised_revision || selfCheck || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const chapterText = chapterReceiptProseText(chapter)
  const allReceipts = [
    ...asArray(revisionDeliveryReceipts?.quality_audit_repair_receipts || revisionDeliveryReceipts?.qualityAuditRepairReceipts),
    ...asArray(revision?.quality_audit_repair_receipts || revision?.qualityAuditRepairReceipts),
    ...asArray(selfCheck?.quality_audit_repair_receipts || selfCheck?.qualityAuditRepairReceipts),
  ]
  const qualityAuditRisks = proseQualityQualityAuditRisks({ self_check: selfCheck })
  const missingReceiptsAfterRepair = Boolean(selfCheck?.revised || revision?.revised) && qualityAuditRisks.length > 0 && allReceipts.length === 0
  const residualRisks = allReceipts
    .map((receipt: any) => {
      const risk = revisionReceiptSyncRisk(receipt, chapterText)
      if (!risk) return null
      return {
        check_key: compactBriefText(receipt?.check_key || receipt?.checkKey || receipt?.key),
        label: compactBriefText(receipt?.label || receipt?.name, '质量诊断修复回执'),
        text: risk,
        evidence: compactBriefText(
          receipt?.changed_evidence
          || receipt?.changedEvidence
          || receipt?.applied_fix
          || receipt?.appliedFix
          || receipt?.original_evidence
          || receipt?.originalEvidence,
        ),
        risk,
      }
    })
    .filter(Boolean)
  const missed = missingReceiptsAfterRepair
    ? [{
        check_key: '',
        label: '质量诊断修复回执未生成',
        text: '本章已执行质量诊断修复，但没有生成逐项 quality_audit_repair_receipts，无法确认质量诊断缺口是否逐项闭环。',
        evidence: qualityAuditRisks
          .map((item: any) => [item.label, item.evidence || item.fix].filter(Boolean).join('｜'))
          .filter(Boolean)
          .slice(0, 5)
          .join('；') || 'quality_audit_repair_receipts 为空',
        risk: '缺少质量诊断修复回执',
      }]
    : residualRisks
  const status = missed.length > 0 ? 'warn' : 'ok'
  return {
    report_id: `quality-audit-repair-receipt-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: allReceipts.length === 0
      ? missingReceiptsAfterRepair ? '质量诊断修复回执未生成' : '质量诊断修复未触发'
      : status === 'ok' ? '质量诊断修复回执 OK' : `质量诊断修复回执残留 ${missed.length}`,
    summary: allReceipts.length === 0
      ? missingReceiptsAfterRepair
        ? '本章存在质量诊断缺口且已执行修订，但没有生成逐项质量诊断修复回执。'
        : '本章没有触发需要闭环的质量诊断修复回执。'
      : status === 'ok'
        ? '本章质量诊断修复回执没有残留风险。'
        : `质量诊断修复后仍有 ${missed.length} 项残留风险需要继续处理。`,
    receipt_count: allReceipts.length,
    missed_count: missed.length,
    completed_count: Math.max(0, allReceipts.length - missed.length),
    missed,
    completed: allReceipts.length > missed.length ? allReceipts.filter((receipt: any) => !revisionReceiptSyncRisk(receipt, chapterText)).slice(0, 20) : [],
    next_actions: status === 'ok'
      ? ['保持 quality_audit_repair_receipts 逐条对应 quality_audit_checks 缺口，changed_evidence 必须引用修订后的具体正文。']
      : missingReceiptsAfterRepair
        ? [
          '重新复核质量诊断修复结果，必须输出 quality_audit_repair_receipts。',
          'quality_audit_repair_receipts 要逐条对应 quality_audit_checks 中 status=fail/warn 的诊断项，并引用 changed_evidence。',
        ]
        : [
          '下一轮修订只补仍残留的质量诊断风险，不要重写整章。',
          '残留项必须改成可见局势变化、目的词详略、信息跟冲突走或卖点隐性展示，并在新回执中给出 changed_evidence。',
        ],
  }
}

export function buildRevisionScopeGuardSyncReport(chapter: any, selfCheck: any = {}) {
  const revision = selfCheck?.revision || selfCheck?.revised_revision || selfCheck || {}
  const guard = selfCheck?.revision_scope_guard
    || selfCheck?.revisionScopeGuard
    || revision?.revision_scope_guard
    || revision?.revisionScopeGuard
    || {}
  const originalText = String(selfCheck?.original_text || selfCheck?.originalText || guard?.original_text || guard?.originalText || '')
  const revisedText = String(selfCheck?.final_text || selfCheck?.finalText || revision?.final_text || revision?.finalText || guard?.revised_text || guard?.revisedText || '')
  const originalCount = Number(
    guard?.original_word_count
    ?? guard?.originalWordCount
    ?? guard?.original_char_count
    ?? guard?.originalCharCount
    ?? (originalText ? countProseChars(originalText) : 0),
  )
  const revisedCount = Number(
    guard?.revised_word_count
    ?? guard?.revisedWordCount
    ?? guard?.edited_word_count
    ?? guard?.editedWordCount
    ?? guard?.final_word_count
    ?? guard?.finalWordCount
    ?? guard?.revised_char_count
    ?? guard?.revisedCharCount
    ?? (revisedText ? countProseChars(revisedText) : 0),
  )
  const revised = Boolean(selfCheck?.revised || revision?.revised || guard?.revised || (originalCount > 0 && revisedCount > 0 && originalCount !== revisedCount))
  const delta = originalCount > 0 && revisedCount > 0 ? Math.abs(revisedCount - originalCount) : 0
  const allowedDelta = originalCount > 0 ? Math.max(Math.round(originalCount * 0.3), 800) : 0
  const deltaRatio = originalCount > 0 ? Number((delta / originalCount).toFixed(4)) : 0
  const direction = revisedCount < originalCount ? 'shrink' : revisedCount > originalCount ? 'expand' : 'same'
  const missingAuditCounts = revised && (originalCount <= 0 || revisedCount <= 0)
  const excessiveDelta = revised && originalCount > 0 && revisedCount > 0 && delta > allowedDelta
  const status = missingAuditCounts || excessiveDelta ? 'warn' : 'ok'
  const evidence = originalCount > 0 && revisedCount > 0
    ? [`原 ${originalCount} 字`, `修订后 ${revisedCount} 字`, `差异 ${delta} 字`, `允许差异 ${allowedDelta} 字`]
    : []
  const missed = missingAuditCounts
    ? [{
        key: 'revision_scope_guard',
        label: '修订幅度缺少字数',
        text: 'revision_scope_guard 缺少 original_word_count 或 revised_word_count，无法确认修订幅度是否超过 max(原文 30%, 800 字)。',
        evidence: 'original_word_count/revised_word_count 缺失',
        fix: '补齐 revision_scope_guard.original_word_count、revised_word_count、delta_word_count、delta_ratio、allowed_delta_word_count、scope_warning 和 reason。',
      }]
    : excessiveDelta
      ? [{
          key: 'revision_scope_guard',
          label: '修订幅度过大',
          text: `修订${direction === 'shrink' ? '缩短' : '扩写'} ${delta} 字，超过允许差异 ${allowedDelta} 字。`,
          evidence: evidence.join('；'),
          fix: '回到自检 issues、delivery_risk_receipts 和各类 checks，只修有证据的缺口；恢复被误删的剧情功能信息，压回无必要新增内容。',
        }]
      : []
  return {
    report_id: `revision-scope-guard-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: !revised ? '修订幅度未触发' : missingAuditCounts ? '修订幅度无法确认' : status === 'ok' ? '修订幅度 OK' : `修订幅度过大 ${delta}`,
    summary: !revised
      ? '本章未执行修订，不触发修订幅度守恒检查。'
      : originalCount <= 0 || revisedCount <= 0
        ? '本章缺少修订前后字数，无法确认修订幅度。'
        : status === 'ok'
          ? `修订前后字数差异 ${delta} 字，未超过 oh-story 修订幅度警戒线。`
          : `修订前后字数差异 ${delta} 字，超过 max(原文 30%, 800 字) 的警戒线 ${allowedDelta} 字。`,
    original_word_count: originalCount,
    revised_word_count: revisedCount,
    delta_word_count: delta,
    allowed_delta_word_count: allowedDelta,
    delta_ratio: deltaRatio,
    direction,
    evidence,
    missed_count: missed.length,
    missed,
    next_actions: status === 'ok'
      ? ['保持修订幅度守恒：只修自检证据和确定性检查指出的缺口。']
      : missingAuditCounts
        ? [
            '补齐 revision_scope_guard：original_word_count、revised_word_count、delta_word_count、delta_ratio、allowed_delta_word_count、scope_warning 和 reason。',
            '按 oh-story workflow-revision 做字数对比：修改后与原文字数差异超过 30% 或 800 字时必须复核。',
          ]
      : [
          '按 oh-story workflow-revision 做字数对比：修改后与原文字数差异超过 30% 或 800 字时必须复核。',
          '下一轮修订不要重写整章；只按自检证据、修订回执残留和确定性检查缺口做局部修复。',
          direction === 'shrink'
            ? '先恢复被误删的伏笔、钩子、角色特征、情节推进和必要转折，再压缩无功能解释。'
            : '先删除无证据新增的支线、设定、关系和解释，再保留真正修复缺口的正文变化。',
        ],
  }
}

function revisionCascadeImpactRows(selfCheck: any = {}, chapterText = '') {
  const revision = selfCheck?.revision || selfCheck?.revised_revision || selfCheck || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const receiptRows = [
    ...asArray(revisionDeliveryReceipts?.revision_receipts || revisionDeliveryReceipts?.revisionReceipts),
    ...asArray(revision?.revision_receipts || revision?.revisionReceipts),
    ...asArray(selfCheck?.revision_receipts || selfCheck?.revisionReceipts),
  ]
  const standaloneRows = [
    ...asArray(revision?.cascade_impacts || revision?.cascadeImpacts),
    ...asArray(revision?.downstream_impacts || revision?.downstreamImpacts),
    ...asArray(revision?.future_impacts || revision?.futureImpacts),
    ...asArray(selfCheck?.cascade_impacts || selfCheck?.cascadeImpacts),
  ].map((impact: any) => ({ receipt: {}, impact }))

  return [
    ...receiptRows.flatMap((receipt: any) => {
      const impacts = [
        ...asArray(receipt?.cascade_impacts || receipt?.cascadeImpacts),
        ...asArray(receipt?.downstream_impacts || receipt?.downstreamImpacts),
        ...asArray(receipt?.future_impacts || receipt?.futureImpacts),
        ...asArray(receipt?.affected_assets || receipt?.affectedAssets),
      ]
      return impacts.map((impact: any) => ({ receipt, impact }))
    }),
    ...standaloneRows,
  ]
    .map(({ receipt, impact }: any) => {
      const hasType = Boolean(compactBriefText(impact?.type || impact?.category))
      const hasTarget = Boolean(compactBriefText(impact?.target || impact?.name || impact?.label || impact?.asset || impact?.entity))
      const hasImpact = Boolean(compactBriefText(impact?.impact || impact?.text || impact?.summary || impact?.description || impact?.risk || impact?.issue))
      const hasRequiredAction = Boolean(compactBriefText(
        impact?.required_action
        || impact?.requiredAction
        || impact?.next_action
        || impact?.nextAction
        || impact?.fix
        || impact?.repair_instruction
        || impact?.repairInstruction,
      ))
      const hasEvidence = Boolean(compactBriefText(
        impact?.evidence
        || impact?.source_excerpt
        || impact?.sourceExcerpt
        || receipt?.changed_evidence
        || receipt?.changedEvidence
        || receipt?.applied_fix
        || receipt?.appliedFix,
      ))
      const missingFields = [
        hasType ? '' : 'type',
        hasTarget ? '' : 'target',
        hasImpact ? '' : 'impact',
        hasRequiredAction ? '' : 'required_action',
        hasEvidence ? '' : 'evidence/source_excerpt',
      ].filter(Boolean)
      const affectedChapters = [
        ...asArray(impact?.affected_chapters || impact?.affectedChapters),
        ...asArray(receipt?.affected_chapters || receipt?.affectedChapters),
      ]
        .map((item: any) => Number(item))
        .filter((item: number) => Number.isFinite(item) && item > 0)
      const type = compactBriefText(impact?.type || impact?.category || receipt?.category || 'cascade')
      const target = compactBriefText(impact?.target || impact?.name || impact?.label || impact?.asset || impact?.entity)
      const text = compactBriefText(
        impact?.impact
        || impact?.text
        || impact?.summary
        || impact?.description
        || impact?.risk
        || impact?.issue,
      )
      const requiredAction = compactBriefText(
        impact?.required_action
        || impact?.requiredAction
        || impact?.next_action
        || impact?.nextAction
        || impact?.fix
        || impact?.repair_instruction
        || impact?.repairInstruction,
      )
      const evidence = compactBriefText(
        impact?.evidence
        || impact?.source_excerpt
        || impact?.sourceExcerpt
        || receipt?.changed_evidence
        || receipt?.changedEvidence
        || receipt?.applied_fix
        || receipt?.appliedFix,
      )
      const evidenceLocationRisk = evidence && String(chapterText || '').trim() && !receiptEvidenceLocatedInProse(evidence, chapterText)
        ? 'cascade_impacts evidence/source_excerpt 无法定位到修订后正文。'
        : ''
      if (!target && !text && !requiredAction) return null
      return {
        issue_index: Number.isFinite(Number(receipt?.issue_index ?? receipt?.issueIndex))
          ? Number(receipt?.issue_index ?? receipt?.issueIndex)
          : null,
        type,
        target: target || type,
        text: text || requiredAction || target,
        required_action: requiredAction || text,
        evidence,
        evidence_location_risk: evidenceLocationRisk,
        affected_chapters: Array.from(new Set(affectedChapters)).slice(0, 12),
        missing_fields: missingFields,
      }
    })
    .filter(Boolean)
}

export function buildRevisionCascadeImpactSyncReport(chapter: any, selfCheck: any = {}) {
  const chapterText = chapterReceiptProseText(chapter)
  const missed = revisionCascadeImpactRows(selfCheck, chapterText)
  const evidenceMissing = missed.filter((item: any) => !compactBriefText(item?.evidence))
  const evidenceUnlocated = missed.filter((item: any) => compactBriefText(item?.evidence_location_risk || item?.evidenceLocationRisk))
  const structureMissing = missed.filter((item: any) => asArray(item?.missing_fields || item?.missingFields)
    .some((field: any) => !['evidence/source_excerpt'].includes(String(field || ''))))
  const status = missed.length > 0 ? 'warn' : 'ok'
  return {
    report_id: `revision-cascade-impact-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: status === 'ok' ? '修订级联影响 OK' : `修订级联影响 ${missed.length}`,
    summary: status === 'ok'
      ? '本章修订没有声明需要同步到后续章节的级联影响。'
      : `本章修订产生 ${missed.length} 项会影响后续章节、伏笔、时间线、角色状态、资产或关系的同步义务。`,
    missed_count: missed.length,
    evidence_missing_count: evidenceMissing.length,
    evidence_unlocated_count: evidenceUnlocated.length,
    structure_missing_count: structureMissing.length,
    missed,
    evidence_missing: evidenceMissing,
    evidence_unlocated: evidenceUnlocated,
    structure_missing: structureMissing,
    next_actions: status === 'ok'
      ? ['后续修订继续在 revision_receipts 中标明 cascade_impacts；没有影响时保持空数组。']
      : structureMissing.length > 0
        ? [
            '下一轮修订回执必须给每条 cascade_impacts 补齐 type, target, impact, required_action, evidence/source_excerpt。',
            '下一章或后续章节必须先同步修订后的伏笔、时间线、角色状态、资产归属和关系边界，再推进新冲突。',
          ]
        : evidenceUnlocated.length > 0
        ? [
            '下一轮修订回执必须重引可在修订后正文定位的 cascade_impacts evidence/source_excerpt，修复无法定位到修订后正文的虚构或旧稿证据。',
            '下一章或后续章节必须先同步修订后的伏笔、时间线、角色状态、资产归属和关系边界，再推进新冲突。',
          ]
        : evidenceMissing.length > 0
        ? [
            '下一轮修订回执必须给每条 cascade_impacts 补 changed_evidence、evidence 或 source_excerpt，引用修订后正文中支撑正史变更的原句。',
            '下一章或后续章节必须先同步修订后的伏笔、时间线、角色状态、资产归属和关系边界，再推进新冲突。',
          ]
        : [
            '下一章或后续章节必须先同步修订后的伏笔、时间线、角色状态、资产归属和关系边界，再推进新冲突。',
            '如果受影响章节已存在，优先检查并修正对应章节，不要让旧状态覆盖修订后的正史。',
          ],
  }
}

function normalizeAssetStateDeltaPlanItem(item: any) {
  if (!item) return null
  if (typeof item === 'string') {
    const text = compactBriefText(item)
    const match = text.match(/^([^：:｜(（]{1,60})[：:｜(（]?(.*)$/)
    const name = compactBriefText(match?.[1] || text)
    return name ? { name, text: compactBriefText(match?.[2] || text), source: text } : null
  }
  const name = assetText(item)
  const text = compactBriefText(
    item?.text
    || item?.summary
    || item?.description
    || assetStateChangeText(item?.expected_state_change || item?.expectedStateChange)
    || assetStateChangeText(item?.state_delta || item?.stateDelta || item?.actual_state_change || item?.actualStateChange)
    || item,
  )
  return name ? { entity_id: Number(item?.entity_id || item?.id || 0) || null, name, text: text || name, source: text || name } : null
}

function assetStateDeltaRecordedItems(stateDelta: any = {}, settingUpdates: any[] = [], discoveredAssets: any[] = []) {
  const rows = new Map<string, { entity_id: any; name: string; text: string; evidence: string }>()
  const add = (item: any, textValue?: any) => {
    const name = assetText(item)
    const text = assetStateChangeText(textValue ?? item?.actual_state_change ?? item?.actualStateChange ?? item?.state_delta ?? item?.stateDelta ?? item?.state_json ?? item?.stateJson ?? item?.summary ?? item)
    const evidence = stateDeltaEvidenceText(item) || stateDeltaEvidenceText(textValue)
    if (!name || !text) return
    const key = Number(item?.entity_id || item?.id || 0) ? `id:${Number(item?.entity_id || item?.id || 0)}` : `name:${name}`
    const existing = rows.get(key)
    rows.set(key, {
      entity_id: Number(item?.entity_id || item?.id || 0) || existing?.entity_id || null,
      name,
      text: [existing?.text, text].filter(Boolean).join('；'),
      evidence: uniqueBriefStrings([existing?.evidence, evidence], 3).join('；'),
    })
  }

  for (const update of asArray(settingUpdates)) add(update)
  for (const asset of asArray(discoveredAssets)) add(asset)
  for (const [name, value] of Object.entries(stateDelta?.resource_status || stateDelta?.resourceStatus || {})) add({ name }, value)
  for (const [name, value] of Object.entries(stateDelta?.item_ownership || stateDelta?.itemOwnership || {})) add({ name }, { owner: value })
  for (const [name, value] of Object.entries(stateDelta?.foreshadowing_status || stateDelta?.foreshadowingStatus || {})) add({ name }, value)

  return Array.from(rows.values())
}

function assetStateDeltaKeys(item: any) {
  return [
    Number(item?.entity_id || item?.id || 0) ? `id:${Number(item?.entity_id || item?.id || 0)}` : '',
    item?.name ? `name:${compactBriefText(item.name)}` : '',
  ].filter(Boolean)
}

export function buildAssetStateDeltaSyncReport(chapter: any, contextPackage: any, stateDelta: any = {}, settingUpdates: any[] = [], discoveredAssets: any[] = []) {
  const contract = assetLinkageExplicitContract(contextPackage) || contextPackage?.chapter_target?.asset_linkage_contract || {}
  const settingUsage = asArray(contextPackage?.setting_context?.chapter_usage || contextPackage?.setting_context?.chapterUsage)
    .filter((item: any) => !item?.forbidden && String(item?.usage_type || '') !== 'forbidden')
  const planned = [
    ...settingUsage.map(normalizeAssetStateDeltaPlanItem),
    ...asArray(contract?.key_assets || contract?.keyAssets).map(normalizeAssetStateDeltaPlanItem),
  ].filter(Boolean)
  const seen = new Set<string>()
  const uniquePlanned = planned.filter((item: any) => {
    const keys = assetStateDeltaKeys(item)
    const key = keys[0] || `name:${item.name}`
    if (!key || keys.some(candidate => seen.has(candidate))) return false
    for (const candidate of keys.length ? keys : [key]) seen.add(candidate)
    return true
  })
  const recorded = assetStateDeltaRecordedItems(stateDelta, settingUpdates, discoveredAssets)
  const recordedKeys = new Set(recorded.flatMap(assetStateDeltaKeys))
  const recordedByName = new Map(recorded.map((item: any) => [item.name, item]))
  const completedRows = uniquePlanned
    .map((item: any) => {
      const keyedRow = recorded.find((row: any) => assetStateDeltaKeys(item).some(key => assetStateDeltaKeys(row).includes(key) && recordedKeys.has(key)))
      if (keyedRow) return { item, row: keyedRow }
      const row = recordedByName.get(item.name)
      if (!row) return null
      const score = anchorMatchScore(item.text || item.name, `${row.name}：${row.text}`).score
      return score >= 25 || normalizedMatchText(row.text).length >= 4 ? { item, row } : null
    })
    .filter(Boolean)
  const completed = completedRows.map((entry: any) => entry.item)
  const missed = uniquePlanned.filter((item: any) => !completed.includes(item))
  const evidenceMissing = completedRows
    .map((entry: any) => entry.row && !compactBriefText(entry.row.evidence) ? { ...entry.item, recorded_text: entry.row.text } : null)
    .filter(Boolean)
  const status = missed.length > 0 || evidenceMissing.length > 0 ? 'warn' : 'ok'

  return {
    report_id: `asset-state-delta-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: uniquePlanned.length === 0
      ? '资产状态增量未配置'
      : status === 'ok'
        ? '资产状态增量 OK'
        : missed.length > 0
          ? `资产状态增量缺口 ${missed.length}`
          : `资产状态证据缺口 ${evidenceMissing.length}`,
    summary: uniquePlanned.length === 0
      ? '本章没有显式配置需要追踪的关键资产状态增量。'
      : status === 'ok'
        ? '本章关键资产的状态增量已进入设定状态或新资产记录。'
        : missed.length > 0
          ? `本章有 ${missed.length} 个关键资产的状态增量未在本轮记录中闭环。`
          : `本章有 ${evidenceMissing.length} 个关键资产状态已写入但缺少正文 source_excerpt 证据。`,
    planned_count: uniquePlanned.length,
    recorded_count: recorded.length,
    missed_count: missed.length,
    evidence_missing_count: evidenceMissing.length,
    planned: uniquePlanned,
    recorded,
    completed,
    missed,
    evidence_missing: evidenceMissing,
    next_actions: status === 'ok'
      ? ['保持资产状态追踪只记录本章新增或改变的归属、可见性、触发条件、限制、风险和后果。']
      : missed.length > 0
        ? [
            '下一次修订或状态更新只补本章资产状态增量：关键资产的归属、可见性、触发条件、限制、风险和后果必须写回设定状态。',
            '不要重写全设定表；只处理本章计划触达且正文实际改变的关键资产。',
          ]
        : [
            '下一次状态更新必须给 setting_updates 或 discovered_assets 补 source_excerpt 或 evidence，引用正文中支撑资产归属、可见性、触发条件、限制、风险或后果变化的原句。',
            '不要只写抽象资产结论；资产状态增量必须能回指到本章正文证据。',
          ],
  }
}
