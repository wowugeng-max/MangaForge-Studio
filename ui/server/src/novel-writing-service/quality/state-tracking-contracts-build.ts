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

import {
  OH_STORY_STATE_TRACKING_CHECKS,
  OH_STORY_STATE_TRACKING_FILTER_RULES,
  OH_STORY_STATE_TRACKING_SOURCE_REQUIREMENTS,
  characterStateBrief,
  reconcileSerialStoryStateSourceRows,
  stateSourceReadinessRow,
  stateTrackingExplicitContract,
  stateValueText,
  timelineTrackingEvidence,
} from './state-tracking-contracts-readiness'

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
