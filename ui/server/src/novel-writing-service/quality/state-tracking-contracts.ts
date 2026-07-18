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

let mergedContextChapterTarget: AnyFn = (contextPackage: any = {}) => contextPackage?.chapter_target || contextPackage?.chapterTarget || {}
let contextWithChapterRawPreDraftForSync: AnyFn = (contextPackage: any = {}, _chapter: any = {}) => contextPackage || {}
let listNovelChapters: AnyFn = async (..._args: any[]) => []
let mergeNovelChapterRawPayload: AnyFn = async (..._args: any[]) => ({})

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

const OH_STORY_STATE_TRACKING_FILTER_RULES = [
  '本节速记：只保留“如果不知道这个，本章会写错”的信息。',
  '角色状态只筛本章涉及角色的最新能力、关系变化、公众形象、持有物、位置和认知边界。',
  '相关伏笔/前史只保留会在本章回收、推进、误导或解释因果的内容。',
  '世界约束只保留本章会触发的力量体系、社会规则、地点限制、知识边界和禁揭规则。',
  '纯背景、无因果关系、不会改变本章行动选择的信息必须丢弃，避免上下文稀释。',
]

const OH_STORY_STATE_TRACKING_SOURCE_REQUIREMENTS = [
  '本章细纲/场景卡',
  '上一章正文或上一章承接',
  '追踪/上下文.md',
  '追踪/伏笔.md',
  '追踪/时间线.md',
  '追踪/角色状态.md 或对应角色设定',
  '已加载判定：只承认本轮 workflow 内实际读取或刚更新的来源，不承认未标明来源的聊天记忆。',
]

const OH_STORY_STATE_TRACKING_CHECKS = [
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

function stateValueText(value: any) {
  if (!value) return ''
  if (typeof value === 'string') return compactBriefText(value)
  if (Array.isArray(value)) return uniqueBriefStrings(value, 6).join('、')
  if (typeof value === 'object') return assetConstraintText(value)
  return compactBriefText(value)
}

function characterStateBrief(character: any) {
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

function stateSourceReadinessRow(key: string, label: string, ready: boolean, evidence: any, fix: string, statusWhenMissing = 'missing') {
  return {
    key,
    label,
    status: ready ? 'ready' : statusWhenMissing,
    evidence: compactBriefText(evidence),
    fix: ready ? '' : fix,
  }
}

function timelineTrackingEvidence(contextPackage: any = {}) {
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

async function refreshFollowingChapterSerialStoryStateReadiness(
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

function sourceReadinessRowsFromContext(contextPackage: any = {}) {
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

function sourceReadinessSyncPriority(missed: any[]) {
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

export function buildStateTrackingContract(contextPackage: any = {}, options: { ignoreExplicit?: boolean } = {}) {
  const explicit = options.ignoreExplicit ? null : stateTrackingExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildStateTrackingContract({
      ...(contextPackage || {}),
      state_tracking_contract: null,
      stateTrackingContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            state_tracking_contract: null,
            stateTrackingContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            state_tracking_contract: null,
            stateTrackingContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            state_tracking_contract: null,
            stateTrackingContract: null,
          }
        : contextPackage?.chapter_target,
      chapterTarget: contextPackage?.chapterTarget
        ? {
            ...(contextPackage.chapterTarget || {}),
            state_tracking_contract: null,
            stateTrackingContract: null,
          }
        : contextPackage?.chapterTarget,
    })
    const explicitCharacterStates = asArray(explicit.character_states || explicit.characterStates).map(assetText).filter(Boolean)
    const explicitHistoricalCausality = asArray(explicit.historical_causality || explicit.historicalCausality).map(assetText).filter(Boolean)
    const explicitWorldConstraints = asArray(explicit.world_constraints || explicit.worldConstraints).map(assetText).filter(Boolean)
    const explicitSourceReadiness = normalizeStateSourceReadiness(explicit.source_readiness || explicit.sourceReadiness)
    const reconciledSourceReadiness = reconcileSerialStoryStateSourceRows(
      explicitSourceReadiness.length ? explicitSourceReadiness : asArray(derived.source_readiness),
      contextPackage,
    )
    return {
      version: explicit.version || 'oh_story_state_tracking_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      character_states: explicitCharacterStates.length ? explicitCharacterStates : asArray(derived.character_states),
      historical_causality: explicitHistoricalCausality.length ? explicitHistoricalCausality : asArray(derived.historical_causality),
      world_constraints: explicitWorldConstraints.length ? explicitWorldConstraints : asArray(derived.world_constraints),
      source_readiness: reconciledSourceReadiness,
      filter_rules: asArray(explicit.filter_rules || explicit.filterRules).length
        ? asArray(explicit.filter_rules || explicit.filterRules).map(assetText).filter(Boolean)
        : OH_STORY_STATE_TRACKING_FILTER_RULES,
      source_requirements: asArray(explicit.source_requirements || explicit.sourceRequirements).length
        ? asArray(explicit.source_requirements || explicit.sourceRequirements).map(assetText).filter(Boolean)
        : OH_STORY_STATE_TRACKING_SOURCE_REQUIREMENTS,
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map(assetText).filter(Boolean)
        : OH_STORY_STATE_TRACKING_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map(assetText).filter(Boolean)
        : ['修角色状态漂移', '接住上一章钩子', '补伏笔前史因果', '落实世界约束', '删无关背景'],
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const sceneNames = uniqueBriefStrings(sceneCards.flatMap((scene: any) => asArray(scene.characters_present || scene.charactersPresent)), 16)
  const targetText = [
    target.title,
    target.summary,
    target.goal,
    target.conflict,
    target.ending_hook,
    sceneCards.map((scene: any) => [scene.title, scene.purpose, scene.conflict, scene.reader_payoff].filter(Boolean).join(' ')).join(' '),
  ].map(compactBriefText).filter(Boolean).join(' ')
  const characters = asArray(contextPackage?.story_state?.characters)
  const selectedCharacters = characters
    .filter((character: any) => {
      const name = compactBriefText(character?.name || character?.profile?.name)
      return !sceneNames.length || sceneNames.includes(name) || (name && targetText.includes(name))
    })
    .slice(0, 8)
  const characterStates = uniqueBriefStrings(selectedCharacters.map(characterStateBrief), 12)

  const previous = contextPackage?.continuity?.previous_chapter || {}
  const preDraftBrief = contextPackage?.pre_draft_brief || contextPackage?.preDraftBrief || {}
  const deliveryRiskCarryOver = normalizeDeliveryRiskCarryOverContext(
    target.delivery_risk_carry_over
    || target.deliveryRiskCarryOver
    || preDraftBrief.delivery_risk_carry_over
    || preDraftBrief.deliveryRiskCarryOver
    || contextPackage?.delivery_risk_carry_over
    || contextPackage?.deliveryRiskCarryOver,
  )
  const settingEntities = asArray(contextPackage?.setting_context?.entities)
  const settingUsage = asArray(contextPackage?.setting_context?.chapter_usage)
  const causalityEntities = settingEntities.filter((entity: any) => ['foreshadowing', 'plot_thread', 'mainline', 'relationship_arc'].includes(String(entity?.entity_type || entity?.type || '')))
  const chapterNo = Number(target.chapter_no || target.chapterNo || 0)
  const storyStateRoot = contextPackage?.story_state || contextPackage?.storyState || {}
  const storyStateGlobal = storyStateRoot?.global || storyStateRoot || {}
  const worldbuildingRow = storyStateRoot?.worldbuilding
    || contextPackage?.worldbuilding
    || contextPackage?.project?.reference_config?.project_seed?.worldbuilding
    || {}
  const writingBible = contextPackage?.writing_bible
    || contextPackage?.writingBible
    || contextPackage?.project?.reference_config?.writing_bible
    || {}
  const projectSeed = contextPackage?.project?.reference_config?.project_seed
    || contextPackage?.project_seed
    || contextPackage?.projectSeed
    || {}
  const foreshadowingStatus = {
    ...(typeof storyStateGlobal?.foreshadowing_status === 'object' ? storyStateGlobal.foreshadowing_status : {}),
    ...(typeof storyStateRoot?.foreshadowing_status === 'object' ? storyStateRoot.foreshadowing_status : {}),
    ...(typeof storyStateRoot?.foreshadowingStatus === 'object' ? storyStateRoot.foreshadowingStatus : {}),
  }
  const seedForeshadowing = asArray(projectSeed?.foreshadowing_plan || projectSeed?.foreshadowingPlan)
  const worldRules = uniqueBriefStrings([
    ...asArray(worldbuildingRow?.rules),
    ...asArray(worldbuildingRow?.systems).map((item: any) => compactBriefText(item?.content || item?.name || item)),
    worldbuildingRow?.power_system,
    worldbuildingRow?.powerSystem,
    writingBible?.world_rules,
    writingBible?.worldRules,
    ...asArray(writingBible?.taboos),
    ...asArray(projectSeed?.worldbuilding?.rules),
    projectSeed?.worldbuilding?.power_system,
  ], 12)

  const historicalCausality = uniqueBriefStrings([
    previous?.chapter_no ? `上一章第${previous.chapter_no}章《${previous.title || ''}》：${previous.ending_hook || previous.ending_excerpt || previous.summary || ''}` : '',
    deliveryRiskCarryOver ? `上一章诊断承接：${[
      deliveryRiskCarryOver.priority_label,
      ...asArray(deliveryRiskCarryOver.required_actions),
    ].filter(Boolean).join('；')}` : '',
    // Chapter 1 / seed-backed opening history: allow opening promise as causality when no previous chapter.
    chapterNo <= 1 ? compactBriefText(
      target.goal || target.chapter_goal || target.summary || target.conflict
        ? `开篇前史/承诺：${compactBriefText(target.goal || target.chapter_goal || target.summary || target.conflict)}`
        : '',
    ) : '',
    chapterNo <= 1 ? compactBriefText(
      projectSeed?.main_conflict || projectSeed?.logline || projectSeed?.core_premise || writingBible?.promise
        ? `开书前史：${compactBriefText(projectSeed?.main_conflict || projectSeed?.logline || projectSeed?.core_premise || writingBible?.promise)}`
        : '',
    ) : '',
    ...asArray(storyStateGlobal?.active_threads || storyStateRoot?.active_threads).map((item: any) => `活跃线索：${compactBriefText(item)}`),
    ...Object.entries(foreshadowingStatus).map(([name, value]) => `伏笔「${name}」：${compactBriefText(value)}`),
    ...seedForeshadowing.map((item: any) => {
      const record = item && typeof item === 'object' ? item : { name: item }
      const name = compactBriefText(record.name || record.title || record)
      const plant = compactBriefText(record.plant_at || record.plantAt || record.plant_chapter || record.plantChapter)
      const desc = compactBriefText(record.description || record.summary || record.true_meaning || record.trueMeaning)
      return name ? `种子伏笔「${name}」${plant ? `（埋设：${plant}）` : ''}${desc ? `：${desc}` : ''}` : ''
    }),
    ...causalityEntities.map((entity: any) => {
      const state = entity?.state || entity?.state_json || {}
      const planted = state?.planted_chapter || state?.plantedChapter || entity?.first_chapter_no || entity?.firstChapterNo
      return `${assetText(entity)}：${planted ? `第${planted}章；` : ''}${compactBriefText(entity?.summary || stateValueText(state))}`
    }),
    ...settingUsage
      .filter((usage: any) => ['payoff', 'advance', 'plant'].includes(String(usage?.usage_type || '')))
      .map((usage: any) => `${assetText(usage)}：本章${usage.usage_type}${usage.expected_state_change ? `；${assetStateChangeText(usage.expected_state_change)}` : ''}`),
  ], 14)
  const timelineEvidence = timelineTrackingEvidence(contextPackage)

  const worldEntities = settingEntities.filter((entity: any) => ['rule', 'system', 'ability', 'location', 'faction', 'item'].includes(String(entity?.entity_type || entity?.type || '')))
  const worldConstraints = uniqueBriefStrings([
    ...asArray(contextPackage?.setting_context?.required).map((item: any) => `必用约束：${assetText(item)}`),
    ...worldEntities.map((entity: any) => {
      const constraints = assetConstraintText(entity?.constraints || entity?.constraints_json)
      const state = assetConstraintText(entity?.state || entity?.state_json)
      return `${assetText(entity)}：${compactBriefText(entity?.summary)}${constraints ? `；限制：${constraints}` : ''}${state ? `；状态：${state}` : ''}`
    }),
    ...settingUsage
      .filter((usage: any) => usage?.required || usage?.forbidden || usage?.constraints)
      .map((usage: any) => `${assetText(usage)}：${usage?.forbidden ? '禁揭' : '本章必用'}${assetConstraintText(usage?.constraints || usage?.constraints_json) ? `；${assetConstraintText(usage?.constraints || usage?.constraints_json)}` : ''}`),
    // Seed / worldbuilding backed constraints so newly created projects are not blocked on empty setting workshop.
    ...worldRules.map((rule: any) => `世界规则：${compactBriefText(rule)}`),
    compactBriefText(worldbuildingRow?.world_summary || worldbuildingRow?.summary)
      ? `世界运行逻辑：${compactBriefText(worldbuildingRow?.world_summary || worldbuildingRow?.summary)}`
      : '',
  ], 14)
  const previousChapterNo = Number(previous?.chapter_no || previous?.chapterNo || 0)
  const storyStateLastUpdatedChapter = Number(
    storyStateGlobal?.last_updated_chapter
    || storyStateGlobal?.lastUpdatedChapter
    || storyStateGlobal?.last_updated_chapter_no
    || storyStateGlobal?.lastUpdatedChapterNo
    || 0,
  )
  const serialStoryStateStale = previousChapterNo > 0
    && chapterNo > previousChapterNo
    && storyStateLastUpdatedChapter > 0
    && storyStateLastUpdatedChapter < previousChapterNo
  const sourceReadiness = [
    stateSourceReadinessRow(
      'chapter_blueprint',
      '本章细纲/蓝图',
      Boolean(target.summary || target.goal || target.chapter_goal || contextPackage?.chapter_blueprint || target.chapter_blueprint || sceneCards.length),
      target.summary || target.goal || target.chapter_goal || sceneCards.map((scene: any) => scene.title || scene.purpose).filter(Boolean).join('；'),
      '先补齐本章细纲、章节目标、内容概括或场景卡。',
    ),
    stateSourceReadinessRow(
      'previous_chapter',
      '上一章正文/章尾钩子',
      chapterNo <= 1 || Boolean(previous?.ending_hook || previous?.ending_excerpt || previous?.summary),
      chapterNo <= 1 ? '首章无需上一章承接' : previous?.ending_hook || previous?.ending_excerpt || previous?.summary,
      '补齐上一章正文、摘要或章尾钩子后再写承接。',
      chapterNo <= 1 ? 'optional' : 'missing',
    ),
    stateSourceReadinessRow(
      'context_tracking',
      '追踪/上下文',
      Boolean(asArray(contextPackage?.story_state?.recent_state_entries).length || asArray(contextPackage?.story_state?.global?.recent_state_entries).length || previous?.summary || previous?.ending_hook),
      asArray(contextPackage?.story_state?.recent_state_entries).length
        ? `最近状态 ${asArray(contextPackage.story_state.recent_state_entries).length} 条`
        : previous?.summary || previous?.ending_hook,
      '补齐追踪上下文或至少保留最近章节状态摘要。',
    ),
    ...(serialStoryStateStale ? [
      stateSourceReadinessRow(
        'serial_story_state',
        '串行连续性/状态机',
        false,
        `上一章第${previousChapterNo}章已进入承接链，但状态机只更新到第${storyStateLastUpdatedChapter}章。`,
        `先完成第${previousChapterNo}章状态机更新，再继续第${chapterNo || '?'}章，避免下一章读取旧角色状态、伏笔、时间线或资产状态。`,
      ),
    ] : []),
    stateSourceReadinessRow(
      'timeline_tracking',
      '追踪/时间线',
      Boolean(timelineEvidence),
      timelineEvidence,
      '补齐追踪/时间线.md，至少确认本章当前时间、地点和关键事件顺序后再写正文。',
      'warn',
    ),
    ...(deliveryRiskCarryOver ? [
      stateSourceReadinessRow(
        'delivery_risk_carry_over',
        '上一章诊断/修订承接',
        true,
        [
          deliveryRiskCarryOver.label,
          ...asArray(deliveryRiskCarryOver.required_actions),
          ...asArray(deliveryRiskCarryOver.evidence),
        ].filter(Boolean).join('；'),
        '先读取上一章诊断、修订回执和级联影响，把 required_actions 写成本章开篇/中段/章尾的可见动作。',
      ),
    ] : []),
    stateSourceReadinessRow(
      'character_state',
      '角色状态',
      characterStates.length > 0,
      characterStates.slice(0, 3).join('；'),
      '补齐本章出场角色的当前位置、能力/伤势、持有物、关系态度和认知边界。',
    ),
    stateSourceReadinessRow(
      'foreshadowing_history',
      '伏笔/前史',
      historicalCausality.length > 0,
      historicalCausality.slice(0, 3).join('；'),
      '补齐上一章钩子、待回收伏笔或本章必须承接的前史因果。',
    ),
    stateSourceReadinessRow(
      'world_constraints',
      '世界约束',
      worldConstraints.length > 0,
      worldConstraints.slice(0, 3).join('；'),
      '补齐本章会改变行动选择的规则、地点、能力限制、触发条件或代价。',
    ),
  ]

  return {
    version: 'oh_story_state_tracking_v1',
    source: 'oh_story_embedded_fallback',
    character_states: characterStates,
    historical_causality: historicalCausality,
    world_constraints: worldConstraints,
    source_readiness: sourceReadiness,
    filter_rules: OH_STORY_STATE_TRACKING_FILTER_RULES,
    source_requirements: OH_STORY_STATE_TRACKING_SOURCE_REQUIREMENTS,
    quality_checks: OH_STORY_STATE_TRACKING_CHECKS,
    revision_priorities: ['修角色状态漂移', '接住上一章钩子', '补伏笔前史因果', '落实世界约束', '删无关背景'],
  }
}

const FINAL_STATE_TRACKING_STANDARD_SOURCE_KEYS = new Set([
  'chapter_blueprint',
  'previous_chapter',
  'context_tracking',
  'serial_story_state',
  'timeline_tracking',
  'delivery_risk_carry_over',
  'character_state',
  'foreshadowing_history',
  'world_constraints',
])

function finalStateTrackingSourceKey(row: any) {
  return compactBriefText(row?.key || row?.name)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase()
}

function finalStateTrackingCustomSourceRisk(row: any) {
  const status = String(row?.status || '').toLowerCase()
  if (['ready', 'pass', 'ok'].includes(status)) return 0
  if (status === 'optional') return 1
  if (['warn', 'warning'].includes(status)) return 3
  return 4
}

function finalStateTrackingDerivedValues(contract: any, snakeKey: string, camelKey: string) {
  return uniqueBriefStrings([
    ...asArray(contract?.[snakeKey]),
    ...asArray(contract?.[camelKey]),
  ], 24)
}

function finalStateTrackingPolicyValues(contracts: any[], snakeKey: string, camelKey: string) {
  return uniqueBriefStrings(contracts.flatMap(contract => [
    ...asArray(contract?.[snakeKey]),
    ...asArray(contract?.[camelKey]),
  ]), 24)
}

export function mergeStoredStateTrackingContractAliases(...contractValues: any[]) {
  const contracts = contractValues
    .filter(contract => contract && typeof contract === 'object' && !Array.isArray(contract))
  if (!contracts.length) return {}

  const merged: any = {}
  for (const contract of [...contracts].reverse()) Object.assign(merged, contract)

  const dynamicAliases = [
    ['character_states', 'characterStates'],
    ['historical_causality', 'historicalCausality'],
    ['world_constraints', 'worldConstraints'],
  ]
  for (const [snakeKey, camelKey] of dynamicAliases) {
    const selected = contracts
      .map(contract => finalStateTrackingDerivedValues(contract, snakeKey, camelKey))
      .find(values => values.length > 0)
    if (selected) {
      merged[snakeKey] = selected
      merged[camelKey] = selected
    }
  }

  const standardRows: any[] = []
  const standardKeys = new Set<string>()
  const customRows = new Map<string, any>()
  for (const contract of contracts) {
    const rows = [...asArray(contract.source_readiness), ...asArray(contract.sourceReadiness)]
    for (const row of rows) {
      const key = finalStateTrackingSourceKey(row)
      if (!key) continue
      if (FINAL_STATE_TRACKING_STANDARD_SOURCE_KEYS.has(key)) {
        if (!standardKeys.has(key)) {
          standardRows.push(row)
          standardKeys.add(key)
        }
        continue
      }
      const current = customRows.get(key)
      if (!current || finalStateTrackingCustomSourceRisk(row) > finalStateTrackingCustomSourceRisk(current)) {
        customRows.set(key, row)
      }
    }
  }
  const sourceReadiness = [...standardRows, ...customRows.values()]
  if (sourceReadiness.length > 0) {
    merged.source_readiness = sourceReadiness
    merged.sourceReadiness = sourceReadiness
  }

  const policyAliases = [
    ['filter_rules', 'filterRules'],
    ['source_requirements', 'sourceRequirements'],
    ['quality_checks', 'qualityChecks'],
    ['revision_priorities', 'revisionPriorities'],
  ]
  for (const [snakeKey, camelKey] of policyAliases) {
    const policy = finalStateTrackingPolicyValues(contracts, snakeKey, camelKey)
    if (policy.length > 0) {
      merged[snakeKey] = policy
      merged[camelKey] = policy
    }
  }
  return merged
}

export function mergeFinalStateTrackingContract(storedContract: any = {}, derivedContract: any = {}) {
  const stored = storedContract && typeof storedContract === 'object' && !Array.isArray(storedContract) ? storedContract : {}
  const derived = derivedContract && typeof derivedContract === 'object' && !Array.isArray(derivedContract) ? derivedContract : {}
  const derivedRows = [
    ...asArray(derived.source_readiness),
    ...asArray(derived.sourceReadiness),
  ]
  const storedRows = [
    ...asArray(stored.source_readiness),
    ...asArray(stored.sourceReadiness),
  ]
  const standardRows: any[] = []
  const standardKeys = new Set<string>()
  const customRows = new Map<string, any>()

  for (const row of derivedRows) {
    const key = finalStateTrackingSourceKey(row)
    if (!key) continue
    if (FINAL_STATE_TRACKING_STANDARD_SOURCE_KEYS.has(key)) {
      if (!standardKeys.has(key)) {
        standardRows.push(row)
        standardKeys.add(key)
      }
      continue
    }
    if (!customRows.has(key)) customRows.set(key, row)
  }
  for (const row of storedRows) {
    const key = finalStateTrackingSourceKey(row)
    if (!key || FINAL_STATE_TRACKING_STANDARD_SOURCE_KEYS.has(key)) continue
    const current = customRows.get(key)
    if (!current || finalStateTrackingCustomSourceRisk(row) > finalStateTrackingCustomSourceRisk(current)) {
      customRows.set(key, row)
    }
  }

  const sourceReadiness = [...standardRows, ...customRows.values()]
  const merged: any = {
    ...derived,
    ...stored,
    character_states: finalStateTrackingDerivedValues(derived, 'character_states', 'characterStates'),
    historical_causality: finalStateTrackingDerivedValues(derived, 'historical_causality', 'historicalCausality'),
    world_constraints: finalStateTrackingDerivedValues(derived, 'world_constraints', 'worldConstraints'),
    source_readiness: sourceReadiness,
  }

  const dynamicAliases = [
    ['character_states', 'characterStates'],
    ['historical_causality', 'historicalCausality'],
    ['world_constraints', 'worldConstraints'],
  ]
  for (const [snakeKey, camelKey] of dynamicAliases) {
    if (Object.prototype.hasOwnProperty.call(stored, camelKey) || Object.prototype.hasOwnProperty.call(derived, camelKey)) {
      merged[camelKey] = merged[snakeKey]
    }
  }
  if (Object.prototype.hasOwnProperty.call(stored, 'sourceReadiness') || Object.prototype.hasOwnProperty.call(derived, 'sourceReadiness')) {
    merged.sourceReadiness = sourceReadiness
  }

  const policyAliases = [
    ['filter_rules', 'filterRules'],
    ['source_requirements', 'sourceRequirements'],
    ['quality_checks', 'qualityChecks'],
    ['revision_priorities', 'revisionPriorities'],
  ]
  for (const [snakeKey, camelKey] of policyAliases) {
    const storedPolicy = finalStateTrackingPolicyValues([stored], snakeKey, camelKey)
    if (storedPolicy.length > 0) {
      merged[snakeKey] = storedPolicy
      merged[camelKey] = storedPolicy
    }
  }
  return merged
}
