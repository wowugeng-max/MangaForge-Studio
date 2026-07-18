import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'

type AnyFn = (...args: any[]) => any

let contextWithChapterRawPreDraftForSync: AnyFn = (contextPackage: any = {}, _chapter: any = {}) => contextPackage || {}
let characterRelationExplicitContract: AnyFn = (_contextPackage: any = {}) => ({})

export function bindPostDeliveryDeltaSyncStorylineDeps(deps: {
  contextWithChapterRawPreDraftForSync?: AnyFn
  characterRelationExplicitContract?: AnyFn
} = {}) {
  if (deps.contextWithChapterRawPreDraftForSync) contextWithChapterRawPreDraftForSync = deps.contextWithChapterRawPreDraftForSync
  if (deps.characterRelationExplicitContract) characterRelationExplicitContract = deps.characterRelationExplicitContract
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

export function stateDeltaEvidenceText(item: any) {
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

export function chapterReceiptProseText(chapter: any = {}) {
  return chapter?.chapter_text || chapter?.chapterText || chapter?.final_text || chapter?.finalText || chapter?.text || ''
}
