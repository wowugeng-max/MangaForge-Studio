import { asArray } from '../../routes/novel-route-utils'
import {
  buildCharacterRelationDeterministicCheck,
  characterRelationArray,
  characterRelationPriority,
  normalizeCharacterRelationBufferZoneCheck,
  normalizeCharacterRelationCheck,
  normalizeCharacterRelationExpectationHubCheck,
  normalizeCharacterRelationGoalOwnershipCheck,
  normalizeCharacterRelationLifeRuleCheck,
  normalizeCharacterRelationQualityCheck,
} from '../../novel-writing/character-relation-basics'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

const OH_STORY_CHARACTER_RELATION_TYPES = [
  '冲突型：双方利益或理念对立，用来制造张力并推动情节。',
  '联盟型：双方有共同目标，用来提供助力、羁绊和互信变化。',
  '亲密型：情感纽带连接，用来制造软肋、情绪支点和代价。',
  '权威型：上下级或支配关系，用来制造压力并限制主角行动。',
]

const OH_STORY_CHARACTER_RELATION_GOAL_OWNERSHIP_RULES = [
  '主角目标必须属于自己的，不能是帮别人实现目标，否则主角会变成配角/工具人。',
  '关系线可以互助，但主角必须保留自己的诉求、主动选择和代价。',
  '配角目标可以与主角目标摩擦或互补，但不能吞掉主角的行动归属。',
]

const OH_STORY_CHARACTER_RELATION_LIFE_RULES = [
  '角色生命中有恋爱之外的内容，不是单薄的情感工具人。',
  '重要关系可以提供情绪价值，但角色还要保留事业、责任、资源、身份、家族、风险或行动线。',
  '亲密关系推进必须踩在角色自己的目标、代价或选择上，不能只靠发糖、陪伴或被需要感。',
]

const OH_STORY_CHARACTER_RELATION_EXPECTATION_HUB_RULES = [
  '配角期待枢纽/人物扣：选一个配角做任务基地，一个人物同时承载多个短期和长期期待。',
  '主角每次解决事件装完逼后要回到该人物处，开启新一轮装逼、新任务或新剧情。',
  '每个剧情单元结束后利用同一人物展开新剧情，让关系线成为期待接力点。',
  '人物下线时必须带来更大的好处，用歪打误撞收获更多转化读者损失厌恶。',
]

const OH_STORY_CHARACTER_RELATION_BUFFER_RULES = [
  '配角攻略缓冲区：始终保留信息差、地位差距、亲密度差距或信任程度之一，让配角态度变化有过程。',
  '配角不能像 NPC 一样站着等主角触发，必须有自己的行动、误判、顾虑、资源交换或代价。',
  '关键拐点必须写清配角从旁观/质疑/拒绝/试探到行动/协助/设限的态度变化，让变化本身产生期待感。',
]

const OH_STORY_CHARACTER_RELATION_CHECKS = [
  '关系类型明确：重要关系必须归类为冲突型、联盟型、亲密型或权威型之一。',
  '关系有弧线：重要关系至少经历一次考验、误解、牺牲、背叛、信任变化或态度变化。',
  '主角目标独立：主角必须主动追求自己的目标，不能只是帮别人实现目标。',
  '角色不止恋爱：角色生命中必须有恋爱之外的内容，不能只是单薄的情感工具人。',
  '配角期待枢纽：至少一个关键配角承担任务基地功能，同时承载短期和长期期待，并在单元结束后开启下一轮新剧情。',
  '配角攻略缓冲区：通过信息差、地位差距、亲密度差距或信任程度维持攻略过程，拐点处必须有态度变化证据。',
  '配角有行动：配角不能像 NPC 一样等主角触发，必须有自己的顾虑、目标、行动或代价。',
  '关系功能服务情节：甜、虐、作证、背叛、保护或压迫必须推进情节或改变状态。',
  '态度变化可见：关键拐点必须写出配角态度、信息差、信任程度或地位差距的变化。',
  '好感/亲密行为匹配阶段：亲密、牺牲、特殊待遇和妥协必须符合当前关系阶段。',
]

export function characterRelationExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.character_relation_contract
    || contextPackage?.chapter_target?.characterRelationContract
    || contextPackage?.character_relation_contract
    || contextPackage?.characterRelationContract
    || contextPackage?.pre_draft_brief?.character_relation_contract
    || contextPackage?.preDraftBrief?.characterRelationContract
}

function relationPayload(value: any) {
  const payload = value?.payload_json || value?.payloadJson || value?.payload || {}
  return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}
}

function relationState(value: any) {
  const state = value?.state_json || value?.stateJson || value?.state || {}
  return state && typeof state === 'object' && !Array.isArray(state) ? state : {}
}

export function buildCharacterRelationContract(contextPackage: any = {}) {
  const explicit = characterRelationExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildCharacterRelationContract({
      ...(contextPackage || {}),
      character_relation_contract: null,
      characterRelationContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            character_relation_contract: null,
            characterRelationContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            character_relation_contract: null,
            characterRelationContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            character_relation_contract: null,
            characterRelationContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitRelationshipTypes = asArray(explicit.relationship_types || explicit.relationshipTypes).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitImportantRelationships = asArray(explicit.important_relationships || explicit.importantRelationships).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitIndependentGoals = asArray(explicit.independent_goals || explicit.independentGoals).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitGoalOwnershipRules = asArray(explicit.goal_ownership_rules || explicit.goalOwnershipRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRelationshipLifeRules = asArray(explicit.relationship_life_rules || explicit.relationshipLifeRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitExpectationHubRules = asArray(explicit.expectation_hub_rules || explicit.expectationHubRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitBufferZoneRules = asArray(explicit.buffer_zone_rules || explicit.bufferZoneRules || explicit.supporting_character_buffer_rules || explicit.supportingCharacterBufferRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitTestsOrPressure = asArray(explicit.tests_or_pressure || explicit.testsOrPressure).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitAttitudeShifts = asArray(explicit.attitude_shifts || explicit.attitudeShifts).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSupportRoles = asArray(explicit.support_roles || explicit.supportRoles).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_character_relation_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      relationship_types: explicitRelationshipTypes.length
        ? explicitRelationshipTypes
        : asArray(derived.relationship_types).length ? asArray(derived.relationship_types) : OH_STORY_CHARACTER_RELATION_TYPES,
      important_relationships: explicitImportantRelationships.length ? explicitImportantRelationships : asArray(derived.important_relationships),
      independent_goals: explicitIndependentGoals.length ? explicitIndependentGoals : asArray(derived.independent_goals),
      goal_ownership_rules: explicitGoalOwnershipRules.length
        ? explicitGoalOwnershipRules
        : asArray(derived.goal_ownership_rules).length ? asArray(derived.goal_ownership_rules) : OH_STORY_CHARACTER_RELATION_GOAL_OWNERSHIP_RULES,
      relationship_life_rules: explicitRelationshipLifeRules.length
        ? explicitRelationshipLifeRules
        : asArray(derived.relationship_life_rules).length ? asArray(derived.relationship_life_rules) : OH_STORY_CHARACTER_RELATION_LIFE_RULES,
      expectation_hub_rules: explicitExpectationHubRules.length
        ? explicitExpectationHubRules
        : asArray(derived.expectation_hub_rules || derived.expectationHubRules).length ? asArray(derived.expectation_hub_rules || derived.expectationHubRules) : OH_STORY_CHARACTER_RELATION_EXPECTATION_HUB_RULES,
      buffer_zone_rules: explicitBufferZoneRules.length
        ? explicitBufferZoneRules
        : asArray(derived.buffer_zone_rules || derived.bufferZoneRules).length ? asArray(derived.buffer_zone_rules || derived.bufferZoneRules) : OH_STORY_CHARACTER_RELATION_BUFFER_RULES,
      tests_or_pressure: explicitTestsOrPressure.length ? explicitTestsOrPressure : asArray(derived.tests_or_pressure),
      attitude_shifts: explicitAttitudeShifts.length ? explicitAttitudeShifts : asArray(derived.attitude_shifts),
      support_roles: explicitSupportRoles.length ? explicitSupportRoles : asArray(derived.support_roles),
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_CHARACTER_RELATION_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : ['明确关系类型', '补关系考验/变化', '补主角独立目标', '补配角期待枢纽', '维护攻略缓冲区', '让配角主动行动', '写出态度变化'],
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const characterArc = target.character_arc_brief || contextPackage?.character_arc_context || {}
  const relationEntities = [
    ...asArray(contextPackage?.setting_context?.entities),
    ...asArray(contextPackage?.storyline_context?.entities),
  ].filter((entity: any) => String(entity?.entity_type || entity?.entityType || '').includes('relationship'))
  const relationUsage = [
    ...asArray(contextPackage?.setting_context?.chapter_usage),
    ...asArray(contextPackage?.storyline_context?.chapter_usage),
  ]
  const relationTypes = uniqueBriefStrings([
    ...sceneCards.flatMap((scene: any) => [scene.relationship_type, scene.relationshipType]),
    ...relationEntities.flatMap((entity: any) => {
      const payload = relationPayload(entity)
      return [payload.relationship_type, payload.relationshipType]
    }),
    /执事|长老|老板|师父|上级|监管|命令|权威|压迫/.test(String(target.conflict || '')) ? '权威型' : '',
    /作证|同盟|合作|互信|共同/.test(String(target.summary || '') + String(target.conflict || '')) ? '联盟型' : '',
  ], 10)
  const importantRelationships = uniqueBriefStrings([
    ...relationEntities.map((entity: any) => compactBriefText(entity?.name || entity?.title || entity?.summary)),
    ...relationUsage.map((item: any) => compactBriefText(item?.name || item?.title || item?.summary)),
    ...sceneCards.flatMap((scene: any) => [scene.relationship_line, scene.relationshipLine, scene.relationship_shift, scene.relationshipShift]),
    characterArc.relationship_shift,
    characterArc.relationshipShift,
  ], 14)
  const independentGoals = uniqueBriefStrings([
    characterArc.desire,
    characterArc.goal,
    characterArc.independent_goal,
    characterArc.independentGoal,
    target.goal,
    target.summary,
  ], 8)
  const testsOrPressure = uniqueBriefStrings([
    ...sceneCards.flatMap((scene: any) => [scene.relationship_test, scene.relationshipTest, scene.conflict, scene.purpose]),
    ...relationEntities.flatMap((entity: any) => {
      const payload = relationPayload(entity)
      const state = relationState(entity)
      return [payload.test, payload.pressure, payload.relationship_test, state.current_state, entity?.summary]
    }),
    ...relationUsage.flatMap((item: any) => {
      const expected = item?.expected_state_change || item?.expectedStateChange || {}
      return [expected.relationship_shift, expected.pressure, expected.test]
    }),
    target.conflict,
  ], 14)
  const attitudeShifts = uniqueBriefStrings([
    characterArc.relationship_shift,
    characterArc.relationshipShift,
    ...sceneCards.flatMap((scene: any) => [scene.relationship_shift, scene.relationshipShift, scene.reader_payoff]),
    ...relationEntities.flatMap((entity: any) => {
      const payload = relationPayload(entity)
      const state = relationState(entity)
      return [payload.attitude_shift, payload.attitudeShift, payload.relationship_shift, payload.relationshipShift, state.current_state]
    }),
    ...relationUsage.flatMap((item: any) => {
      const expected = item?.expected_state_change || item?.expectedStateChange || {}
      return [expected.relationship_shift, expected.attitude_shift]
    }),
  ], 14)
  const supportRoles = uniqueBriefStrings([
    ...relationEntities.flatMap((entity: any) => {
      const payload = relationPayload(entity)
      return [payload.role, payload.function, payload.support_role, payload.supportRole]
    }),
    ...sceneCards.flatMap((scene: any) => [scene.relationship_role, scene.relationshipRole]),
  ], 8)
  return {
    version: 'oh_story_character_relation_v1',
    source: 'oh_story_embedded_fallback',
    relationship_types: relationTypes.length ? relationTypes : OH_STORY_CHARACTER_RELATION_TYPES,
    important_relationships: importantRelationships,
    independent_goals: independentGoals,
    goal_ownership_rules: OH_STORY_CHARACTER_RELATION_GOAL_OWNERSHIP_RULES,
    relationship_life_rules: OH_STORY_CHARACTER_RELATION_LIFE_RULES,
    expectation_hub_rules: OH_STORY_CHARACTER_RELATION_EXPECTATION_HUB_RULES,
    buffer_zone_rules: OH_STORY_CHARACTER_RELATION_BUFFER_RULES,
    tests_or_pressure: testsOrPressure,
    attitude_shifts: attitudeShifts,
    support_roles: supportRoles,
    quality_checks: OH_STORY_CHARACTER_RELATION_CHECKS,
    revision_priorities: ['明确关系类型', '补关系考验/变化', '补主角独立目标', '补配角期待枢纽', '维护攻略缓冲区', '让配角主动行动', '写出态度变化'],
  }
}

export function buildCharacterRelationSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = buildCharacterRelationContract(contextPackage)
  const checks = [
    normalizeCharacterRelationCheck(
      'relationship_types',
      '关系类型',
      contract.relationship_types || contract.relationshipTypes,
      chapterText,
      [/关系类型|合作互信|边界|联盟|敌对|竞争|师徒|上下级/, /互信|信任|质疑|旁观/, /边界|阶段|亲密|好感/],
      '关系类型没有落进正文，读者只能从设定表知道两人是什么关系。',
      '补关系类型：用行动、称呼、距离、立场或交换条件写出当前关系类型和边界。',
    ),
    normalizeCharacterRelationCheck(
      'important_relationships',
      '关系弧线',
      contract.important_relationships || contract.importantRelationships,
      chapterText,
      [/不再只是|主动|作证|协助|拿出证据/, /关系.*变化|从.*转为|旁观.*转为/, /支持者|考验|变化/],
      '重要关系没有发生可见推进，关系线停在静态设定。',
      '补关系弧线：让重要关系经过一次压力测试，并写出行动前后的态度差。',
    ),
    normalizeCharacterRelationCheck(
      'independent_goals',
      '独立目标',
      contract.independent_goals || contract.independentGoals,
      chapterText,
      [/独立目标|自己的目标|主角.*目标|配角.*目标/, /洗清|保住|证明|争取/, /主角.*林青禾|林青禾.*主角/],
      '主角或关系对手缺少独立目标，关系容易变成工具人互相服务。',
      '补独立目标：主角和关系对手都要带着自己的目标进场，并让目标发生摩擦或互补。',
    ),
    normalizeCharacterRelationGoalOwnershipCheck(contract.goal_ownership_rules || contract.goalOwnershipRules, chapterText),
    normalizeCharacterRelationLifeRuleCheck(contract.relationship_life_rules || contract.relationshipLifeRules, chapterText),
    normalizeCharacterRelationExpectationHubCheck(contract.expectation_hub_rules || contract.expectationHubRules, chapterText),
    normalizeCharacterRelationBufferZoneCheck(contract.buffer_zone_rules || contract.bufferZoneRules, chapterText),
    normalizeCharacterRelationCheck(
      'tests_or_pressure',
      '关系压力',
      contract.tests_or_pressure || contract.testsOrPressure,
      chapterText,
      [/压力测试|追责|背锅|撤授权|考验/, /逼|压下来|冲突|责任/, /协会|客户|代签/],
      '关系没有经受压力测试，亲疏变化缺少可信原因。',
      '补关系压力：用外部追责、利益冲突、误会、代价或共同风险考验关系。',
    ),
    normalizeCharacterRelationCheck(
      'attitude_shifts',
      '态度变化',
      contract.attitude_shifts || contract.attitudeShifts,
      chapterText,
      [/态度变化|转为|从.*转为/, /旁观|质疑|主动|作证|愿意协助/, /不再|终于|仍保留边界/],
      '态度变化不可见，关系升级或降温缺少正文证据。',
      '补态度变化：写出角色从旁观、质疑、拒绝到行动、协助或设限的变化。',
    ),
    normalizeCharacterRelationQualityCheck(contract.quality_checks || contract.qualityChecks, chapterText),
    buildCharacterRelationDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = characterRelationPriority(missed)

  return {
    report_id: `character-relation-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '角色关系未配置' : status === 'ok' ? '角色关系 OK' : `角色关系缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 character_relation_contract，建议补充关系类型、独立目标、目标归属、角色非恋爱行动线、配角期待枢纽、压力测试和态度变化。'
      : status === 'ok'
        ? '正文已基本兑现关系类型、双方独立目标、目标归属、角色非恋爱行动线、配角期待枢纽、关系压力、主动行动、态度变化和阶段边界。'
        : `正文有 ${missedCount} 项角色关系缺口，${priorityRepair || '优先补关系类型、独立目标、目标归属、角色非恋爱行动线、配角期待枢纽和压力测试'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: characterRelationArray(contract.quality_checks || contract.qualityChecks).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持角色关系兑现：关系类型、独立目标、目标归属、角色非恋爱行动线、配角期待枢纽、压力测试、态度变化和阶段边界都要可见。']
      : [
          '下一章必须补角色关系：先明确关系类型和边界，再让双方带着独立目标和恋爱之外的行动线进入同一场压力测试；尤其要写清主角自己的目标，不能只是在帮别人完成目标。',
          '补配角攻略缓冲区：始终保留信息差、地位差距、亲密度差距或信任程度；配角不能站桩等触发，关键拐点要写出从旁观/质疑/拒绝/试探到行动/协助/设限。',
          '补配角期待枢纽：选一个关键配角做任务基地，同时挂短期和长期期待，让主角解决事件后回到这里开启新一轮期待、新任务或新剧情。',
          '关系变化必须由行动兑现：配角要主动做事，主角要保留关键选择和代价，态度变化要有正文证据。',
      ],
  }
}

