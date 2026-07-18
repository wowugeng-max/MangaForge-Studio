import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import { proseBodyWithoutTitleLine } from '../quality/prose-expansion'
import { bindPostDeliveryDeltaSyncRevisionDeps } from './delta-sync-reports-revision'
import {
  bindPostDeliveryDeltaSyncStorylineDeps,
  buildStorylineSyncReport,
  buildForeshadowingDeltaSyncReport,
  stateDeltaEvidenceText,
  buildTimelineDeltaSyncReport,
  buildCharacterStateDeltaSyncReport,
  buildRelationshipDeltaSyncReport,
  buildChapterHandoffDeltaSyncReport,
  chapterReceiptProseText,
} from './delta-sync-reports-storyline'
export {
  buildStorylineSyncReport,
  buildForeshadowingDeltaSyncReport,
  stateDeltaEvidenceText,
  buildTimelineDeltaSyncReport,
  buildCharacterStateDeltaSyncReport,
  buildRelationshipDeltaSyncReport,
  buildChapterHandoffDeltaSyncReport,
  chapterReceiptProseText,
} from './delta-sync-reports-storyline'

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
  bindPostDeliveryDeltaSyncStorylineDeps({
    contextWithChapterRawPreDraftForSync: deps.contextWithChapterRawPreDraftForSync || contextWithChapterRawPreDraftForSync,
    characterRelationExplicitContract: deps.characterRelationExplicitContract || characterRelationExplicitContract,
  })
  if (deps.assetLinkageExplicitContract) assetLinkageExplicitContract = deps.assetLinkageExplicitContract
  if (deps.assetText) assetText = deps.assetText
  if (deps.assetStateChangeText) assetStateChangeText = deps.assetStateChangeText
  if (deps.stateTrackingExplicitContract) stateTrackingExplicitContract = deps.stateTrackingExplicitContract
  bindPostDeliveryDeltaSyncRevisionDeps({
    assetLinkageExplicitContract: deps.assetLinkageExplicitContract || assetLinkageExplicitContract,
    assetText: deps.assetText || assetText,
    assetStateChangeText: deps.assetStateChangeText || assetStateChangeText,
  })
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

export * from './delta-sync-reports-receipts'
export * from './delta-sync-reports-storyline'
export * from './delta-sync-reports-revision'
