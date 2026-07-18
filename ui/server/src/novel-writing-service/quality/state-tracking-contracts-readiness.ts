import { asArray } from '../../routes/novel-route-utils'
import {
  getChapterBlueprintForReadiness,
  legacyChapterOutlineForReadiness,
  missingChapterBlueprintSections,
  sourceReadinessMatchingRows,
  sourceReadinessReadyRowGenericEvidence,
  sourceReadinessReadyRowMissingEvidence,
} from '../../novel-writing/source-readiness-preflight'
import { sceneCardGoalObstacleChangeGaps } from '../../novel-writing/scene-card-readiness'
import { normalizeStateSourceReadiness } from '../../novel-writing/state-tracking-basics'
import { normalizeDeliveryRiskCarryOverContext } from '../post-delivery/delivery-risk-core'
import {
  assetConstraintText,
  assetStateChangeText,
  assetText,
} from './character-asset-contracts'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

type AnyFn = (...args: any[]) => any

export let mergedContextChapterTarget: AnyFn = (contextPackage: any = {}) => contextPackage?.chapter_target || contextPackage?.chapterTarget || {}
export let contextWithChapterRawPreDraftForSync: AnyFn = (contextPackage: any = {}, _chapter: any = {}) => contextPackage || {}
export let listNovelChapters: AnyFn = async (..._args: any[]) => []
export let mergeNovelChapterRawPayload: AnyFn = async (..._args: any[]) => ({})

export function bindStateTrackingContractDeps(deps: {
  mergedContextChapterTarget?: AnyFn
  contextWithChapterRawPreDraftForSync?: AnyFn
  listNovelChapters?: AnyFn
  mergeNovelChapterRawPayload?: AnyFn
} = {}) {
  if (deps.mergedContextChapterTarget) mergedContextChapterTarget = deps.mergedContextChapterTarget
  if (deps.contextWithChapterRawPreDraftForSync) contextWithChapterRawPreDraftForSync = deps.contextWithChapterRawPreDraftForSync
  if (deps.listNovelChapters) listNovelChapters = deps.listNovelChapters
  if (deps.mergeNovelChapterRawPayload) mergeNovelChapterRawPayload = deps.mergeNovelChapterRawPayload
}

export const OH_STORY_STATE_TRACKING_FILTER_RULES = [
  '本节速记：只保留“如果不知道这个，本章会写错”的信息。',
  '角色状态只筛本章涉及角色的最新能力、关系变化、公众形象、持有物、位置和认知边界。',
  '相关伏笔/前史只保留会在本章回收、推进、误导或解释因果的内容。',
  '世界约束只保留本章会触发的力量体系、社会规则、地点限制、知识边界和禁揭规则。',
  '纯背景、无因果关系、不会改变本章行动选择的信息必须丢弃，避免上下文稀释。',
]

export const OH_STORY_STATE_TRACKING_SOURCE_REQUIREMENTS = [
  '本章细纲/场景卡',
  '上一章正文或上一章承接',
  '追踪/上下文.md',
  '追踪/伏笔.md',
  '追踪/时间线.md',
  '追踪/角色状态.md 或对应角色设定',
  '已加载判定：只承认本轮 workflow 内实际读取或刚更新的来源，不承认未标明来源的聊天记忆。',
]

export const OH_STORY_STATE_TRACKING_CHECKS = [
  '本节速记完整：角色状态、相关伏笔/前史、世界约束至少覆盖本章会写错的关键项。',
  '角色状态准确：位置、能力、伤势、持有物、关系态度、公众形象和知识边界不得与上下文冲突。',
  '前史因果接住：上一章钩子、待回收伏笔和本章开场/冲突之间必须有可见承接。',
  '世界约束生效：规则、地点、能力限制、触发条件和代价必须影响本章行动选择。',
  '上下文不过载：不得把无关背景、纯百科设定或本章不会使用的信息塞进正文。',
  '来源边界清楚：已加载只指本轮 workflow 内实际读取或刚更新；不得用未标明来源的聊天记忆替代角色状态、伏笔或时间线。',
]

export function stateTrackingExplicitContract(contextPackage: any = {}) {
  const target = mergedContextChapterTarget(contextPackage)
  return target?.state_tracking_contract
    || target?.stateTrackingContract
    || contextPackage?.state_tracking_contract
    || contextPackage?.stateTrackingContract
    || contextPackage?.pre_draft_brief?.state_tracking_contract
    || contextPackage?.preDraftBrief?.stateTrackingContract
}

export function stateValueText(value: any) {
  if (!value) return ''
  if (typeof value === 'string') return compactBriefText(value)
  if (Array.isArray(value)) return uniqueBriefStrings(value, 6).join('、')
  if (typeof value === 'object') return assetConstraintText(value)
  return compactBriefText(value)
}

export function characterStateBrief(character: any) {
  const name = compactBriefText(character?.name || character?.profile?.name || character?.role)
  if (!name) return ''
  const current = character?.current_state || character?.currentState || character?.state || {}
  const stateParts = [
    compactBriefText(character?.role || character?.role_type || character?.profile?.role),
    stateValueText(current?.location) ? `位置：${stateValueText(current.location)}` : '',
    stateValueText(current?.ability_status || current?.abilityStatus || character?.abilities) ? `能力：${stateValueText(current?.ability_status || current?.abilityStatus || character?.abilities)}` : '',
    stateValueText(current?.physical_condition || current?.physicalCondition || current?.injuries) ? `身体：${stateValueText(current?.physical_condition || current?.physicalCondition || current?.injuries)}` : '',
    stateValueText(current?.items || character?.items) ? `持有物：${stateValueText(current?.items || character?.items)}` : '',
    stateValueText(current?.relationship_attitudes || current?.relationshipAttitudes || character?.relationships) ? `关系态度：${stateValueText(current?.relationship_attitudes || current?.relationshipAttitudes || character?.relationships)}` : '',
    stateValueText(current?.public_image || current?.publicImage) ? `公众形象：${stateValueText(current?.public_image || current?.publicImage)}` : '',
    stateValueText(current?.knowledge_scope || current?.knowledgeScope || character?.knowledge_scope) ? `认知边界：${stateValueText(current?.knowledge_scope || current?.knowledgeScope || character?.knowledge_scope)}` : '',
  ].filter(Boolean)
  return `${name}：${stateParts.join('；')}`
}

export function stateSourceReadinessRow(key: string, label: string, ready: boolean, evidence: any, fix: string, statusWhenMissing = 'missing') {
  return {
    key,
    label,
    status: ready ? 'ready' : statusWhenMissing,
    evidence: compactBriefText(evidence),
    fix: ready ? '' : fix,
  }
}

export function timelineTrackingEvidence(contextPackage: any = {}) {
  const storyState = contextPackage?.story_state || contextPackage?.storyState || {}
  const globalState = storyState?.global || {}
  return uniqueBriefStrings([
    ...asArray(storyState.timeline || storyState.timeline_events || storyState.timelineEvents),
    ...asArray(globalState.timeline || globalState.timeline_events || globalState.timelineEvents),
    storyState.current_time || storyState.currentTime,
    globalState.current_time || globalState.currentTime,
    ...asArray(storyState.active_locations || storyState.activeLocations).map((item: any) => `活动地点：${assetText(item)}`),
    ...asArray(globalState.active_locations || globalState.activeLocations).map((item: any) => `活动地点：${assetText(item)}`),
    contextPackage?.timeline_context,
    contextPackage?.timelineContext,
  ], 6).join('；')
}

const DAILY_WORKFLOW_SOURCE_REQUIREMENT_CHECKS = [
  {
    key: 'previous_chapter',
    label: '上一章正文/章尾钩子',
    severity: 'high',
    requirementPattern: /上一章|previous[\s_-]*chapter/i,
    rowPattern: /previous[\s_-]*chapter|上一章/,
    fix: '补齐上一章正文、摘要或章尾钩子，并确认前 300 字承接上一章最后一幕后再写正文。',
  },
  {
    key: 'context_tracking',
    label: '追踪/上下文',
    severity: 'medium',
    requirementPattern: /追踪\/?上下文|上下文\.md|context/i,
    rowPattern: /context[\s_-]*tracking|上下文/,
    fix: '补齐追踪/上下文.md，至少确认最后完成章节、近期状态摘要和本章承接注意事项。',
  },
  {
    key: 'foreshadowing_tracking',
    label: '追踪/伏笔',
    severity: 'medium',
    requirementPattern: /追踪\/?伏笔|伏笔\.md|foreshadow/i,
    rowPattern: /foreshadow|伏笔/,
    fix: '补齐追踪/伏笔.md，筛选本章需要新增、推进或回收的伏笔后再写正文。',
  },
  {
    key: 'timeline_tracking',
    label: '追踪/时间线',
    severity: 'medium',
    requirementPattern: /timeline|时间线/,
    rowPattern: /timeline|time_line|时间线/,
    fix: '补齐追踪/时间线.md，至少确认本章当前时间、地点和关键事件顺序后再写正文。',
  },
  {
    key: 'character_state',
    label: '追踪/角色状态',
    severity: 'medium',
    requirementPattern: /追踪\/?角色状态|角色状态\.md|character[\s_-]*state/i,
    rowPattern: /character[\s_-]*state|角色状态|角色/,
    fix: '补齐追踪/角色状态.md 或对应角色设定，确认本章出场角色的位置、能力、关系和认知边界。',
  },
]

export function resolveSerialStoryStateReadiness(contextPackage: any = {}) {
  const target = mergedContextChapterTarget(contextPackage)
  const previous = contextPackage?.continuity?.previous_chapter
    || contextPackage?.continuity?.previousChapter
    || contextPackage?.previous_chapter
    || contextPackage?.previousChapter
    || {}
  const chapterNo = Number(
    target?.chapter_no
    || target?.chapterNo
    || contextPackage?.chapter?.chapter_no
    || contextPackage?.chapter?.chapterNo
    || 0,
  )
  const previousChapterNo = Number(previous?.chapter_no || previous?.chapterNo || 0)
  const storyStateGlobal = contextPackage?.story_state?.global
    || contextPackage?.storyState?.global
    || contextPackage?.story_state
    || contextPackage?.storyState
    || {}
  const storyStateLastUpdatedChapter = Number(
    storyStateGlobal?.last_updated_chapter
    || storyStateGlobal?.lastUpdatedChapter
    || storyStateGlobal?.last_updated_chapter_no
    || storyStateGlobal?.lastUpdatedChapterNo
    || 0,
  )
  const stale = previousChapterNo > 0
    && chapterNo > previousChapterNo
    && storyStateLastUpdatedChapter > 0
    && storyStateLastUpdatedChapter < previousChapterNo
  return {
    stale,
    chapter_no: chapterNo,
    previous_chapter_no: previousChapterNo,
    last_updated_chapter: storyStateLastUpdatedChapter,
    evidence: stale
      ? `上一章第${previousChapterNo}章已进入承接链，但状态机只更新到第${storyStateLastUpdatedChapter}章。`
      : (previousChapterNo > 0
        ? `上一章第${previousChapterNo}章状态机已同步至第${Math.max(storyStateLastUpdatedChapter, previousChapterNo)}章。`
        : '无需串行状态机检查'),
    fix: stale
      ? `先完成第${previousChapterNo}章状态机更新，再继续第${chapterNo || '?'}章，避免下一章读取旧角色状态、伏笔、时间线或资产状态。`
      : '',
  }
}

export function reconcileSerialStoryStateSourceRows(rows: any[] = [], contextPackage: any = {}) {
  const live = resolveSerialStoryStateReadiness(contextPackage)
  const nextRows = asArray(rows).filter((item: any) => {
    const key = compactBriefText(item?.key || item?.name)
    return key !== 'serial_story_state'
  })
  if (live.stale) {
    nextRows.push(stateSourceReadinessRow(
      'serial_story_state',
      '串行连续性/状态机',
      false,
      live.evidence,
      live.fix,
    ))
  }
  return nextRows
}

export async function refreshFollowingChapterSerialStoryStateReadiness(
  activeWorkspace: string,
  projectId: number,
  syncedChapterNo: number,
  storyStateLastUpdatedChapter: number,
) {
  const chapterNo = Number(syncedChapterNo || 0)
  const lastUpdated = Number(storyStateLastUpdatedChapter || syncedChapterNo || 0)
  if (!chapterNo || !projectId) return { refreshed: 0 }
  const chapters = await listNovelChapters(activeWorkspace, projectId)
  let refreshed = 0
  for (const nextChapter of chapters) {
    const nextNo = Number(nextChapter?.chapter_no || 0)
    if (nextNo <= chapterNo) continue
    const raw = nextChapter?.raw_payload && typeof nextChapter.raw_payload === 'object' ? nextChapter.raw_payload : {}
    const brief = raw.pre_draft_brief || raw.preDraftBrief
    if (!brief || typeof brief !== 'object') continue
    const contract = brief.state_tracking_contract || brief.stateTrackingContract
    if (!contract || typeof contract !== 'object') continue
    const rows = asArray(contract.source_readiness || contract.sourceReadiness)
    if (!rows.some((item: any) => compactBriefText(item?.key || item?.name) === 'serial_story_state')) continue
    // only clear when live state covers previous chapter of this next chapter
    const previousNo = nextNo - 1
    if (lastUpdated > 0 && lastUpdated < previousNo) continue
    const nextRows = rows.filter((item: any) => compactBriefText(item?.key || item?.name) !== 'serial_story_state')
    const nextContract = {
      ...contract,
      source_readiness: nextRows,
      ...(contract.sourceReadiness !== undefined ? { sourceReadiness: nextRows } : {}),
    }
    const nextBrief = {
      ...brief,
      state_tracking_contract: nextContract,
      ...(brief.stateTrackingContract !== undefined ? { stateTrackingContract: nextContract } : {}),
    }
    await mergeNovelChapterRawPayload(activeWorkspace, Number(nextChapter.id), {
      pre_draft_brief: nextBrief,
      ...(raw.preDraftBrief !== undefined ? { preDraftBrief: nextBrief } : {}),
    })
    refreshed += 1
  }
  return { refreshed }
}

export function buildSourceReadinessChecks(contextPackage: any = {}) {
  const target = mergedContextChapterTarget(contextPackage)
  const contract = target?.state_tracking_contract
    || target?.stateTrackingContract
    || contextPackage?.state_tracking_contract
    || contextPackage?.stateTrackingContract
    || contextPackage?.pre_draft_brief?.state_tracking_contract
    || contextPackage?.pre_draft_brief?.stateTrackingContract
    || contextPackage?.preDraftBrief?.state_tracking_contract
    || contextPackage?.preDraftBrief?.stateTrackingContract
    || {}
  return reconcileSerialStoryStateSourceRows(asArray(contract?.source_readiness || contract?.sourceReadiness), contextPackage)
    .map((item: any) => {
      const key = compactBriefText(item?.key || item?.name)
      const label = compactBriefText(item?.label || item?.title || key, '来源就绪')
      const status = String(item?.status || '').toLowerCase()
      if (!key || ['ready', 'optional', 'pass', 'ok'].includes(status)) return null
      const normalizedStatus = status === 'missing' || status === 'fail' ? 'fail' : 'warn'
      return {
        key: `source_readiness_${key}`,
        label,
        status: normalizedStatus,
        evidence: compactBriefText(item?.evidence || item?.summary || item?.source || '来源未就绪'),
        fix: compactBriefText(item?.fix || item?.repair_action || item?.repairAction || '补齐该来源，或从正文中移除对该来源的既定事实依赖。'),
      }
    })
    .filter(Boolean)
}

export function buildSourceReadinessPreflightChecks(contextPackage: any = {}) {
  const hardKeys = new Set(['chapter_blueprint', 'previous_chapter', 'serial_story_state'])
  const target = mergedContextChapterTarget(contextPackage)
  const contract = target?.state_tracking_contract
    || target?.stateTrackingContract
    || contextPackage?.state_tracking_contract
    || contextPackage?.stateTrackingContract
    || contextPackage?.pre_draft_brief?.state_tracking_contract
    || contextPackage?.pre_draft_brief?.stateTrackingContract
    || contextPackage?.preDraftBrief?.state_tracking_contract
    || contextPackage?.preDraftBrief?.stateTrackingContract
    || {}
  const sourceRows = reconcileSerialStoryStateSourceRows(asArray(contract?.source_readiness || contract?.sourceReadiness), contextPackage)
  const hasBlueprintSourceRow = sourceRows.some((item: any) => compactBriefText(item?.key || item?.name) === 'chapter_blueprint')
  const blueprintForReadiness = getChapterBlueprintForReadiness(contextPackage)
  const checks = buildSourceReadinessChecks(contextPackage).map((check: any) => {
    const rawKey = String(check?.key || '').replace(/^source_readiness_/, '')
    const isHard = hardKeys.has(rawKey) && String(check?.status || '').toLowerCase() === 'fail'
    return {
      key: check.key,
      ok: false,
      severity: isHard ? 'high' : 'medium',
      label: check.label || '来源就绪',
      fix: check.fix || '补齐写前来源，避免正文依赖未确认材料。',
      evidence: check.evidence || '',
    }
  })
  const sourceRequirementText = asArray(contract?.source_requirements || contract?.sourceRequirements).map(assetText).join('；')
  for (const sourceRequirement of DAILY_WORKFLOW_SOURCE_REQUIREMENT_CHECKS) {
    if (!sourceRequirement.requirementPattern.test(sourceRequirementText)) continue
    const matchingRows = sourceReadinessMatchingRows(sourceRows, sourceRequirement.rowPattern)
    const key = `source_readiness_${sourceRequirement.key}`
    if (matchingRows.length && sourceReadinessReadyRowMissingEvidence(matchingRows) && !checks.some((check: any) => check.key === key)) {
      checks.push({
        key,
        ok: false,
        severity: sourceRequirement.severity,
        label: sourceRequirement.label,
        fix: sourceRequirement.fix,
        evidence: `${sourceRequirement.label} 标记为 ready，但缺少 evidence/source/summary，无法证明本轮已读取或更新该来源。`,
      })
      continue
    }
    if (matchingRows.length && sourceReadinessReadyRowGenericEvidence(matchingRows) && !checks.some((check: any) => check.key === key)) {
      checks.push({
        key,
        ok: false,
        severity: sourceRequirement.severity,
        label: sourceRequirement.label,
        fix: sourceRequirement.fix,
        evidence: `${sourceRequirement.label} 标记为 ready，但 evidence 只是泛化确认，必须写明实际读取的章节、追踪文件、角色状态或关键锚点。`,
      })
      continue
    }
    if (matchingRows.length) continue
    if (sourceRequirement.key === 'timeline_tracking' && timelineTrackingEvidence(contextPackage)) continue
    if (checks.some((check: any) => check.key === key)) continue
    checks.push({
      key,
      ok: false,
      severity: sourceRequirement.severity,
      label: sourceRequirement.label,
      fix: sourceRequirement.fix,
      evidence: `source_requirements 要求${sourceRequirement.label}，但 source_readiness 未声明该来源已读取或可用。`,
    })
  }
  if ((hasBlueprintSourceRow || blueprintForReadiness) && !checks.some((check: any) => check.key === 'source_readiness_chapter_blueprint')) {
    const legacyOutline = !blueprintForReadiness ? legacyChapterOutlineForReadiness(target) : null
    const missingBlueprintSections = missingChapterBlueprintSections(blueprintForReadiness || legacyOutline)
    if (missingBlueprintSections.length) {
      const isLegacyBackfill = Boolean(legacyOutline)
      checks.push({
        key: 'source_readiness_chapter_blueprint',
        ok: false,
        severity: isLegacyBackfill ? 'medium' : 'high',
        label: '本章细纲/蓝图',
        fix: isLegacyBackfill
          ? `旧版细纲缺新版蓝图字段不阻塞日更；本轮需要改纲/补纲时按新版模板回填：${missingBlueprintSections.join('、')}。未知项写 [待补充]，不要杜撰副线或人物关系。`
          : `补齐本章蓝图核心字段：${missingBlueprintSections.join('、')}。`,
        evidence: isLegacyBackfill
          ? `旧版细纲可继续日更；缺少新版蓝图字段：${missingBlueprintSections.join('、')}`
          : `缺少：${missingBlueprintSections.join('、')}`,
      })
    }
  }
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const incompleteSceneCards = sceneCards
    .map((scene: any, index: number) => ({
      scene,
      index,
      missing: sceneCardGoalObstacleChangeGaps(scene),
    }))
    .filter((item: any) => item.missing.length >= 2)
  if (incompleteSceneCards.length && !checks.some((check: any) => check.key === 'source_readiness_scene_card_goal_obstacle_change')) {
    const evidence = incompleteSceneCards.slice(0, 3).map((item: any) => {
      const title = compactBriefText(item.scene?.title || item.scene?.name || `场景${item.index + 1}`)
      return `${title}缺${item.missing.join('/')}`
    }).join('；')
    checks.push({
      key: 'source_readiness_scene_card_goal_obstacle_change',
      ok: false,
      severity: 'high',
      label: '场景卡戏剧单元',
      fix: '补齐每张场景卡的目标、阻碍、变化：人物要什么，什么挡着，结束后局势/关系/信息/状态哪里不同。',
      evidence,
    })
  }
  return checks
}

export function sourceReadinessRowsFromContext(contextPackage: any = {}) {
  const target = mergedContextChapterTarget(contextPackage)
  const contract = target?.state_tracking_contract
    || target?.stateTrackingContract
    || contextPackage?.state_tracking_contract
    || contextPackage?.stateTrackingContract
    || contextPackage?.pre_draft_brief?.state_tracking_contract
    || contextPackage?.pre_draft_brief?.stateTrackingContract
    || contextPackage?.preDraftBrief?.state_tracking_contract
    || contextPackage?.preDraftBrief?.stateTrackingContract
    || {}
  return normalizeStateSourceReadiness(contract?.source_readiness || contract?.sourceReadiness)
}

export function sourceReadinessSyncPriority(missed: any[]) {
  if (missed.some(item => String(item.severity || '').toLowerCase() === 'high')) return '优先补关键来源'
  if (missed.some(item => /上一章|previous/i.test(String(item.key || item.label || '')))) return '优先补上一章来源'
  if (missed.some(item => /时间线|timeline/i.test(String(item.key || item.label || '')))) return '优先补时间线'
  if (missed.some(item => /角色/.test(String(item.label || '')))) return '优先补角色状态'
  return ''
}

export function buildSourceReadinessSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const preflightChecks = buildSourceReadinessPreflightChecks(syncContextPackage)
  const readyRows = sourceReadinessRowsFromContext(syncContextPackage).filter((item: any) => ['ready', 'optional', 'pass', 'ok'].includes(String(item.status || '').toLowerCase()))
  const missed = preflightChecks.map((item: any) => ({
    key: item.key,
    label: item.label || '来源就绪',
    severity: item.severity || 'medium',
    text: item.fix || item.evidence || '来源未就绪',
    expected: item.fix || item.evidence || '来源未就绪',
    evidence: item.evidence || '',
    fix: item.fix || '补齐写前来源，避免正文依赖未确认材料。',
    delivered: false,
    status: 'warn',
  }))
  const delivered = readyRows.map((item: any) => ({
    key: `source_readiness_${item.key || item.label}`,
    label: item.label || item.key || '来源就绪',
    text: `${item.label || item.key}:${item.status}`,
    expected: `${item.label || item.key}:${item.status}`,
    evidence: item.evidence || '',
    delivered: true,
    status: 'ok',
  }))
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    missedCount ? Math.max(0, 100 - missed.filter((item: any) => item.severity === 'high').length * 34 - missed.filter((item: any) => item.severity !== 'high').length * 18) : 88,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = sourceReadinessSyncPriority(missed)

  return {
    report_id: `source-readiness-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '来源就绪 OK' : `来源就绪缺口 ${missedCount}`,
    summary: status === 'ok'
      ? '写前来源就绪表未发现缺口；本章可以继续依赖已确认的细纲、上一章正文、角色状态、伏笔和时间线。'
      : `写前来源有 ${missedCount} 项未就绪或结构缺口，${priorityRepair || '优先补齐关键来源'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    planned_count: delivered.length + missed.length,
    delivered_count: delivered.length,
    planned: [...delivered, ...missed],
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持来源就绪：每章开写前确认细纲、上一章正文、追踪上下文、伏笔、时间线和角色状态来源。']
      : [
          '下一章必须补来源就绪：先补齐 missing/warn 来源，再进入正文生成。',
          '未就绪来源不得被正文写成既定事实；ready 来源要在正文中形成可见承接。',
      ],
  }
}

export function applySourceReadinessPreflightChecks(preflight: any, contextPackage: any = {}) {
  if (!preflight) return preflight
  const liveSerial = resolveSerialStoryStateReadiness(contextPackage)
  // Drop cached serial_story_state blockers once the live story state has caught up.
  if (!liveSerial.stale) {
    const isSerialStoryStateItem = (item: any) => {
      const key = String(item?.key || '')
      const text = `${item?.label || ''}${item?.fix || ''}${item?.evidence || ''}${item || ''}`
      return key === 'source_readiness_serial_story_state'
        || key === 'serial_story_state'
        || /串行连续性|状态机只更新到第|先完成第\s*\d+\s*章状态机/.test(text)
    }
    preflight.checks = asArray(preflight.checks).filter((item: any) => !isSerialStoryStateItem(item))
    preflight.blockers = asArray(preflight.blockers).filter((item: any) => !isSerialStoryStateItem(item))
    preflight.warnings = asArray(preflight.warnings).filter((item: any) => !isSerialStoryStateItem(item))
  }
  const checks = buildSourceReadinessPreflightChecks(contextPackage)
  if (!checks.length) {
    preflight.strict_ready = asArray(preflight.checks).every((item: any) => item.ok || item.severity === 'low')
    preflight.ready = preflight.strict_ready
    return preflight
  }

  const existingKeys = new Set(asArray(preflight.checks).map((item: any) => String(item?.key || '')))
  const nextChecks = checks.filter((item: any) => !existingKeys.has(item.key))
  if (!nextChecks.length) {
    preflight.strict_ready = asArray(preflight.checks).every((item: any) => item.ok || item.severity === 'low')
    preflight.ready = preflight.strict_ready
    return preflight
  }

  preflight.checks = [...asArray(preflight.checks), ...nextChecks]
  preflight.warnings = [
    ...asArray(preflight.warnings),
    ...nextChecks.map((item: any) => `${item.label}：${item.fix || item.evidence || '来源未就绪'}`),
  ]
  preflight.blockers = [
    ...asArray(preflight.blockers),
    ...nextChecks.filter((item: any) => item.severity === 'high'),
  ]
  preflight.ready = preflight.blockers.length === 0
  preflight.strict_ready = preflight.checks.every((item: any) => item.ok || item.severity === 'low')
  return preflight
}

