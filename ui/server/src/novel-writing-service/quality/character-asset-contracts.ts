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

const OH_STORY_CHARACTER_BEHAVIOR_RULES = [
  '展示优于告知：角色目的通过行动展示，态度通过对话和反应体现，不用旁白贴标签。',
  '主角行为三必须：必须可理解、可共鸣、可接受。',
  '角色行动必须由动机链驱动：起因、意图、约束、风险不能缺席。',
  '弱点必须在关键情节导致选择压力或犯错，否则不是有效弱点。',
  '行为要符合人设逻辑，不能为了剧情方便让角色突然降智或换性格。',
]

const OH_STORY_CHARACTER_PROTAGONIST_COMPOSURE_RULES = [
  '角色逼格管理：升级线与主角反应线分开管理。',
  '升级提升的是实力，不自动改变主角的从容反应。',
  '面对低级挑衅时，主角不能被牵着走；高实力/高阅历角色应轻描淡写、短句反锁或行动压制。',
  '同样被骂，主角暴怒反击是毒点；主角微微一笑、不动声色处理，才是逼格。',
]

const OH_STORY_CHARACTER_STRONG_ASSOCIATION_RULES = [
  '人设关联分层：每个重要角色至少 3 个强关联设定。',
  '强关联必须直接影响剧情走向、核心梗装逼爽点或人物碰撞。',
  '主角的实力、钱财、人脉、背景、技能、证据、资源等影响剧情走向的属性归为强关联。',
  '弱关联不喧宾夺主：外貌、爱好、身高体重只能丰富记忆点，不能替代强关联。',
]

const OH_STORY_CHARACTER_ROLE_CARD_REQUIREMENTS = [
  '主角卡必备项：角色定位、身份标签、外貌特征、性格关键词、核心目标、核心动机、致命弱点、口头禅/标志动作。',
  '核心动机必须是情感驱动，不用“要成为最强/想变强”这种空话。',
  '致命弱点必须会在关键情节导致选择压力或犯错，否则不是有效弱点。',
  '外貌特征、口头禅和标志动作必须成为读者能秒认的记忆锚点。',
]

const OH_STORY_CHARACTER_SUPPORTING_ROLE_EXIT_RULES = [
  '配角卡必备项：角色功能、与主角关系、核心特质、标志性特征、退场方式。',
  '每个配角必须有明确功能：导师、盟友、情报源、牺牲品、镜像对照、阻碍或证据承接。',
  '配角退场要主动规划，不能写着写着忘了。',
  '同一场景配角不超过 3 个有台词；没有功能的角色合并为旁观反应、动作或叙事概括。',
]

const OH_STORY_CHARACTER_BEHAVIOR_REPEAT_RULES = [
  '人物行为重复点：抓住一个读者喜欢的人物行为特质反复写。',
  '构建方法：确定读者喜欢什么类型 -> 具体化为行为 -> 不同场景重复。',
  '人物看点和核心看点要循环产生差异化；反派/配角也需要可重复看点。',
  '行为、语言、思维必须围绕人设展开；为了剧情需要违背人设时，先改剧情，不改人设。',
]

const OH_STORY_CHARACTER_DRIVEN_EVENT_RULES = [
  '人推事件优先：情节是人物性格、动机和选择的自然结果，用事件深化人物弧光。',
  '事件推人只用于打破平衡并暴露真实自我，不能替代角色主动选择。',
  '卡文时从人物动机找方向，不要硬编剧情。',
  '矛盾来源必须来自角色利益、三观、成长环境或世界观差异，不靠反派莫名其妙针对主角。',
]

const OH_STORY_CHARACTER_PROTAGONIST_RED_LINE_RULES = [
  '主角红线：不写圣母型主角、无脑战斗机器、内核邪恶、因蠢/圣母犯错、自暴自弃。',
  '主角可以不完美，但不能让读者看不起；压势不压人，压低气势和期待，不打压主角能力和尊严。',
  '主角开篇必须用选择立人设，智斗型选择优先于单纯暴力。',
  '成长不只体现在实力上，也体现在心智和选择上；每次成长要有触发事件和内在反思。',
]

const OH_STORY_CHARACTER_IDENTITY_GOLDFINGER_ALIGNMENT_RULES = [
  '身份/金手指对齐：主角人设必须与世界基调相符，社会身份、身世、金手指、性格高度统一。',
  '显性身份负责汇集前期矛盾，必须能不断升级或更换；隐性身份负责汇集中后期矛盾。',
  '显性金手指负责开局贯穿全书，隐性金手指是主角性格中让他与众不同的部分。',
  '前期以金手指装逼，剧情推进中逐步把人设写清楚，不能让金手指脱离主角职业、身份或生活困境。',
]

const OH_STORY_CHARACTER_MOTIVATION_SPECIFICITY_RULES = [
  '起因必须具体：不能写“被欺负”这种模糊说法，要写成“在众目睽睽下被打耳光”这类可见事件。',
  '动机必须是情感层面的：为母亲复仇、守住尊严、保护具体的人，优于“要成为最强”这种空话。',
  '动机演变有铺垫：每次改变都要有触发事件、关系压力或代价，不能说变就变。',
]

const OH_STORY_CHARACTER_LAYERED_TAG_RULES = [
  '三层标签反差：身份标签、表现标签、内核标签必须能形成反差。',
  '身份标签和表现标签可以强化刻板印象，内核标签必须提供亮牌时刻。',
  '反差必须用行为对比体现，不要直接解释角色其实如何。',
]

const OH_STORY_CHARACTER_ANTAGONIST_LOGIC = [
  '反派的行为必须有内在逻辑，从他的视角说得通。',
  '反派不能降智送赢；反派越强，主角破局越需要高级、智慧或出乎意料。',
  '小反派要有鲜明特征和干脆退场，中等反派要有可信动机、手段和至少一次有效威胁。',
]

const OH_STORY_CHARACTER_ANTAGONIST_WEIGHT_RULES = [
  '反派建立四要素：实力展示、动机可信、真实威胁、终极意图时机缺一不可。',
  '反派的智商/实力决定主角的含金量；反派弱，主角赢没意义。',
  '中等反派及以上必须至少赢主角一次，或在本章造成真实损失、压制、封锁、资格威胁、证据反咬等有效威胁。',
  '反派真实目的不要开场说尽，终极意图应留到关键反转点暴露。',
  '反派是主角的镜子：反派长处要照出主角弱点，冲突不能只是纯坏或纯利益。',
]

const OH_STORY_CHARACTER_ANTAGONIST_SELF_STORY_RULES = [
  '反派也有梦想：在反派眼中他是自己故事的主人公。',
  '反派要有自己的目标、旧痛和避免的痛苦，不能只是纯工具人或纯粹的坏。',
  '反派的优势本身也是致命缺陷；遭遇逆境时会强化缺陷，而不是突然悔悟或降智。',
  '大弧 Boss 要有让读者恨不起来的侧面，并和主角形成理念冲突，不只是利益冲突。',
]

const OH_STORY_CHARACTER_ANTAGONIST_TIER_EXIT_RULES = [
  '按反派层级表设计，出场篇幅必须与层级匹配。',
  '小反派 1-5 章，只承担单个小弧线障碍，1-2 个鲜明特征即可，退场要被打败或揭穿、干脆利落。',
  '中等反派 10-30 章，是一卷主要对手，必须有动机、武力/权谋/资源手段、至少赢主角一次，退场要被主角正面击败并有爽感。',
  '大弧 Boss 代表阶段核心矛盾，要有完整人弧、理念冲突、绝境对决、让人恨不起来的侧面和有仪式感的终战落幕。',
  '最终 Boss 是全书核心矛盾具象化，必须从第一章就有伏笔，代表主题反面，实力碾压且有信念。',
]

const OH_STORY_CHARACTER_BEHAVIOR_CHECKS = [
  '主角行为三必须：行为可理解、可共鸣、可接受，并有正文证据。',
  '动机链完整：起因、意图、约束、风险至少三项在本章可见。',
  '动机检查：起因必须具体，不写“被欺负”这种模糊说法；动机必须是情感层面的，不写“要成为最强”这种空话；动机演变必须有铺垫。',
  '三层标签反差必须落成行为：身份标签、表现标签、内核标签不能只停留在设定表。',
  '展示优于告知：角色目的、态度、弱点、成长要通过行动/对话/反应体现。',
  '主角逼格反应必须可见：升级线与主角反应线分开管理，面对低级挑衅不暴怒失态，改用轻描淡写、短句或行动压制。',
  '人设强关联必须可见：每个重要角色至少3个强关联设定，直接影响剧情走向、核心梗装逼爽点或人物碰撞。',
  '每个有台词配角必须有功能；无功能角色不得占用冲突段落。',
  '角色卡必备项必须可见：角色定位、身份标签、外貌特征、核心目标、核心动机、致命弱点、口头禅/标志动作至少要有正文证据或写前合同。',
  '配角退场规划必须清楚：角色功能、关系、核心特质、标志性特征和退场方式不能缺，同一场景配角不超过 3 个有台词。',
  '行为重复点必须可见：主要角色、反派或关键配角要在不同场景重复可识别行为。',
  '人推事件优先：情节应从人物动机和选择自然推出，不要靠外部事件硬砸或作者硬编剧情。',
  '主角红线不得触碰：圣母、无脑战斗机器、内核邪恶、因蠢/圣母犯错、自暴自弃必须修掉。',
  '身份/金手指对齐：社会身份、身世、金手指、性格要和世界基调统一。',
  '反派行为有内在逻辑，不能降智送赢或只站桩嘲讽。',
  '反派分量必须可见：实力展示、动机可信、真实威胁和终极意图时机要有正文证据。',
  '反派自我叙事必须可见：他在自己故事里的梦想、旧痛、致命缺陷和理念冲突要有正文证据。',
  '反派层级退场必须匹配：小反派/中等反派/大弧 Boss/最终 Boss 的篇幅、功能和退场方式不能混用。',
  '记忆锚点要反复可见：口头禅、标志动作、外物或行为习惯至少出现一个。',
]

function characterBehaviorExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.character_behavior_contract
    || contextPackage?.chapter_target?.characterBehaviorContract
    || contextPackage?.character_behavior_contract
    || contextPackage?.characterBehaviorContract
    || contextPackage?.pre_draft_brief?.character_behavior_contract
    || contextPackage?.preDraftBrief?.characterBehaviorContract
}

function characterBriefText(item: any) {
  if (!item) return ''
  if (typeof item === 'string') return compactBriefText(item)
  return compactBriefText(
    item.name
    || item.title
    || item.role
    || item.summary
    || item.profile?.name
    || item.profile?.identity
    || item.profile?.role,
  )
}

export function buildCharacterBehaviorContract(contextPackage: any = {}) {
  const explicit = characterBehaviorExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildCharacterBehaviorContract({
      ...(contextPackage || {}),
      character_behavior_contract: null,
      characterBehaviorContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            character_behavior_contract: null,
            characterBehaviorContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            character_behavior_contract: null,
            characterBehaviorContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            character_behavior_contract: null,
            characterBehaviorContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitMotivationChain = asArray(explicit.motivation_chain || explicit.motivationChain).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitMotivationSpecificityRules = asArray(explicit.motivation_specificity_rules || explicit.motivationSpecificityRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitLayeredTags = asArray(explicit.layered_tags || explicit.layeredTags).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitBehaviorRules = asArray(explicit.behavior_rules || explicit.behaviorRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitProtagonistComposureRules = asArray(explicit.protagonist_composure_rules || explicit.protagonistComposureRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitStrongAssociationRules = asArray(explicit.strong_association_rules || explicit.strongAssociationRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitMemoryAnchors = asArray(explicit.memory_anchors || explicit.memoryAnchors).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSupportingRoleFunctions = asArray(explicit.supporting_role_functions || explicit.supportingRoleFunctions).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRoleCardRequirements = asArray(explicit.role_card_requirements || explicit.roleCardRequirements).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSupportingRoleExitRules = asArray(explicit.supporting_role_exit_rules || explicit.supportingRoleExitRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitBehaviorRepeatRules = asArray(explicit.behavior_repeat_rules || explicit.behaviorRepeatRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitCharacterDrivenEventRules = asArray(explicit.character_driven_event_rules || explicit.characterDrivenEventRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitProtagonistRedLineRules = asArray(explicit.protagonist_red_line_rules || explicit.protagonistRedLineRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitIdentityGoldfingerAlignmentRules = asArray(explicit.identity_goldfinger_alignment_rules || explicit.identityGoldfingerAlignmentRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitAntagonistLogic = asArray(explicit.antagonist_logic || explicit.antagonistLogic).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitAntagonistWeightRules = asArray(explicit.antagonist_weight_rules || explicit.antagonistWeightRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitAntagonistSelfStoryRules = asArray(explicit.antagonist_self_story_rules || explicit.antagonistSelfStoryRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitAntagonistTierExitRules = asArray(explicit.antagonist_tier_exit_rules || explicit.antagonistTierExitRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_character_behavior_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      motivation_chain: explicitMotivationChain.length ? explicitMotivationChain : asArray(derived.motivation_chain),
      motivation_specificity_rules: explicitMotivationSpecificityRules.length
        ? explicitMotivationSpecificityRules
        : asArray(derived.motivation_specificity_rules).length ? asArray(derived.motivation_specificity_rules) : OH_STORY_CHARACTER_MOTIVATION_SPECIFICITY_RULES,
      layered_tags: explicitLayeredTags.length
        ? explicitLayeredTags
        : asArray(derived.layered_tags).length ? asArray(derived.layered_tags) : OH_STORY_CHARACTER_LAYERED_TAG_RULES,
      behavior_rules: explicitBehaviorRules.length
        ? explicitBehaviorRules
        : asArray(derived.behavior_rules).length ? asArray(derived.behavior_rules) : OH_STORY_CHARACTER_BEHAVIOR_RULES,
      protagonist_composure_rules: explicitProtagonistComposureRules.length
        ? explicitProtagonistComposureRules
        : asArray(derived.protagonist_composure_rules || derived.protagonistComposureRules).length ? asArray(derived.protagonist_composure_rules || derived.protagonistComposureRules) : OH_STORY_CHARACTER_PROTAGONIST_COMPOSURE_RULES,
      strong_association_rules: explicitStrongAssociationRules.length
        ? explicitStrongAssociationRules
        : asArray(derived.strong_association_rules || derived.strongAssociationRules).length ? asArray(derived.strong_association_rules || derived.strongAssociationRules) : OH_STORY_CHARACTER_STRONG_ASSOCIATION_RULES,
      memory_anchors: explicitMemoryAnchors.length ? explicitMemoryAnchors : asArray(derived.memory_anchors),
      supporting_role_functions: explicitSupportingRoleFunctions.length ? explicitSupportingRoleFunctions : asArray(derived.supporting_role_functions),
      role_card_requirements: explicitRoleCardRequirements.length
        ? explicitRoleCardRequirements
        : asArray(derived.role_card_requirements || derived.roleCardRequirements).length ? asArray(derived.role_card_requirements || derived.roleCardRequirements) : OH_STORY_CHARACTER_ROLE_CARD_REQUIREMENTS,
      supporting_role_exit_rules: explicitSupportingRoleExitRules.length
        ? explicitSupportingRoleExitRules
        : asArray(derived.supporting_role_exit_rules || derived.supportingRoleExitRules).length ? asArray(derived.supporting_role_exit_rules || derived.supportingRoleExitRules) : OH_STORY_CHARACTER_SUPPORTING_ROLE_EXIT_RULES,
      behavior_repeat_rules: explicitBehaviorRepeatRules.length
        ? explicitBehaviorRepeatRules
        : asArray(derived.behavior_repeat_rules || derived.behaviorRepeatRules).length ? asArray(derived.behavior_repeat_rules || derived.behaviorRepeatRules) : OH_STORY_CHARACTER_BEHAVIOR_REPEAT_RULES,
      character_driven_event_rules: explicitCharacterDrivenEventRules.length
        ? explicitCharacterDrivenEventRules
        : asArray(derived.character_driven_event_rules || derived.characterDrivenEventRules).length ? asArray(derived.character_driven_event_rules || derived.characterDrivenEventRules) : OH_STORY_CHARACTER_DRIVEN_EVENT_RULES,
      protagonist_red_line_rules: explicitProtagonistRedLineRules.length
        ? explicitProtagonistRedLineRules
        : asArray(derived.protagonist_red_line_rules || derived.protagonistRedLineRules).length ? asArray(derived.protagonist_red_line_rules || derived.protagonistRedLineRules) : OH_STORY_CHARACTER_PROTAGONIST_RED_LINE_RULES,
      identity_goldfinger_alignment_rules: explicitIdentityGoldfingerAlignmentRules.length
        ? explicitIdentityGoldfingerAlignmentRules
        : asArray(derived.identity_goldfinger_alignment_rules || derived.identityGoldfingerAlignmentRules).length ? asArray(derived.identity_goldfinger_alignment_rules || derived.identityGoldfingerAlignmentRules) : OH_STORY_CHARACTER_IDENTITY_GOLDFINGER_ALIGNMENT_RULES,
      antagonist_logic: explicitAntagonistLogic.length
        ? explicitAntagonistLogic
        : asArray(derived.antagonist_logic).length ? asArray(derived.antagonist_logic) : OH_STORY_CHARACTER_ANTAGONIST_LOGIC,
      antagonist_weight_rules: explicitAntagonistWeightRules.length
        ? explicitAntagonistWeightRules
        : asArray(derived.antagonist_weight_rules || derived.antagonistWeightRules).length ? asArray(derived.antagonist_weight_rules || derived.antagonistWeightRules) : OH_STORY_CHARACTER_ANTAGONIST_WEIGHT_RULES,
      antagonist_self_story_rules: explicitAntagonistSelfStoryRules.length
        ? explicitAntagonistSelfStoryRules
        : asArray(derived.antagonist_self_story_rules || derived.antagonistSelfStoryRules).length ? asArray(derived.antagonist_self_story_rules || derived.antagonistSelfStoryRules) : OH_STORY_CHARACTER_ANTAGONIST_SELF_STORY_RULES,
      antagonist_tier_exit_rules: explicitAntagonistTierExitRules.length
        ? explicitAntagonistTierExitRules
        : asArray(derived.antagonist_tier_exit_rules || derived.antagonistTierExitRules).length ? asArray(derived.antagonist_tier_exit_rules || derived.antagonistTierExitRules) : OH_STORY_CHARACTER_ANTAGONIST_TIER_EXIT_RULES,
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_CHARACTER_BEHAVIOR_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : ['补动机链', '用行为展示人设', '补主角逼格反应', '补三层标签反差', '补人设强关联', '补记忆锚点', '补反派分量', '补反派自我叙事', '补反派层级退场', '修反派降智'],
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const characterArc = target.character_arc_brief || contextPackage?.character_arc_context || {}
  const characters = [
    ...asArray(contextPackage?.story_state?.characters),
    ...asArray(contextPackage?.setting_context?.characters),
    ...asArray(contextPackage?.setting_context?.entities).filter((item: any) => ['character', 'protagonist', 'antagonist'].includes(String(item?.entity_type || item?.type || ''))),
  ]
  const protagonist = characters[0] || {}
  const protagonistName = compactBriefText(protagonist?.name || protagonist?.profile?.name || protagonist?.role || '主角')
  const traits = uniqueBriefStrings([
    ...asArray(protagonist?.traits),
    ...asArray(protagonist?.profile?.traits),
    characterArc.voice_anchor,
    characterArc.flaw_pressure,
  ], 8)
  const motivationChain = uniqueBriefStrings([
    characterArc.desire ? `意图：${characterArc.desire}` : '',
    characterArc.goal ? `意图：${characterArc.goal}` : '',
    characterArc.flaw_pressure ? `约束：${characterArc.flaw_pressure}` : '',
    characterArc.growth_beat ? `风险/选择：${characterArc.growth_beat}` : '',
    target.conflict ? `起因：${target.conflict}` : '',
    target.ending_hook ? `风险：${target.ending_hook}` : '',
    protagonist?.goal ? `意图：${protagonist.goal}` : '',
    protagonist?.flaw ? `约束：${protagonist.flaw}` : '',
  ], 10)
  const layeredTags = uniqueBriefStrings([
    `身份标签：${compactBriefText(protagonist?.role || protagonist?.identity || protagonist?.profile?.identity || protagonistName)}`,
    traits.length ? `表现标签：${traits.join('、')}` : '',
    characterArc.growth_beat ? `内核标签：${characterArc.growth_beat}` : '',
    characterArc.desire ? `内核目标：${characterArc.desire}` : '',
    ...OH_STORY_CHARACTER_LAYERED_TAG_RULES,
  ], 12)
  const memoryAnchors = uniqueBriefStrings([
    characterArc.voice_anchor,
    characterArc.voiceAnchor,
    characterArc.signature_action,
    characterArc.signatureAction,
    ...sceneCards.flatMap((scene: any) => [
      scene.character_voice,
      scene.characterVoice,
      scene.key_dialogue,
      scene.keyDialogue,
      scene.reader_payoff,
      scene.title && /旧夹克|录音|口头禅|标志|动作|左手|疤|烟|刀|伞|铃/.test(String(scene.title)) ? scene.title : '',
      ...asArray(scene.action_beats || scene.actionBeats).filter((item: any) => /旧夹克|录音|短句|反问|动作|挂|按|摸|笑/.test(String(item))),
    ]),
  ], 12)
  const strongAssociationRules = uniqueBriefStrings([
    ...OH_STORY_CHARACTER_STRONG_ASSOCIATION_RULES,
    protagonist?.goal ? `主角目标强关联：${protagonist.goal}` : '',
    protagonist?.role ? `身份/职业强关联：${protagonist.role}` : '',
    characterArc.desire ? `欲望强关联：${characterArc.desire}` : '',
    characterArc.flaw_pressure ? `弱点强关联：${characterArc.flaw_pressure}` : '',
    target.conflict ? `冲突强关联：${target.conflict}` : '',
    ...sceneCards.flatMap((scene: any) => [
      scene.reader_payoff ? `爽点强关联：${scene.reader_payoff}` : '',
      scene.reversal ? `反转强关联：${scene.reversal}` : '',
      scene.conflict ? `碰撞强关联：${scene.conflict}` : '',
    ]),
  ], 16)
  const supportingRoleFunctions = uniqueBriefStrings([
    ...characters.slice(1).map((item: any) => {
      const name = compactBriefText(item?.name || item?.profile?.name || item?.role)
      const role = compactBriefText(item?.role || item?.function || item?.profile?.role)
      return name && role ? `${name}：${role}` : name || role
    }),
    ...sceneCards.flatMap((scene: any) => asArray(scene.characters_present || scene.charactersPresent).map((name: any) => `出场功能待验证：${name}`)),
  ], 12)
  const roleCardRequirements = uniqueBriefStrings([
    ...OH_STORY_CHARACTER_ROLE_CARD_REQUIREMENTS,
    protagonistName ? `主角姓名/角色定位：${protagonistName}` : '',
    protagonist?.role || protagonist?.identity || protagonist?.profile?.identity ? `身份标签：${compactBriefText(protagonist?.role || protagonist?.identity || protagonist?.profile?.identity)}` : '',
    traits.length ? `性格关键词：${traits.join('、')}` : '',
    protagonist?.goal ? `核心目标：${protagonist.goal}` : '',
    characterArc.desire ? `核心动机：${characterArc.desire}` : '',
    protagonist?.flaw || characterArc.flaw_pressure ? `致命弱点：${compactBriefText(protagonist?.flaw || characterArc.flaw_pressure)}` : '',
    memoryAnchors.length ? `口头禅/标志动作：${memoryAnchors.slice(0, 3).join('、')}` : '',
  ], 16)
  const supportingRoleExitRules = uniqueBriefStrings([
    ...OH_STORY_CHARACTER_SUPPORTING_ROLE_EXIT_RULES,
    ...characters.slice(1).map((item: any) => {
      const name = compactBriefText(item?.name || item?.profile?.name || item?.role)
      const role = compactBriefText(item?.role || item?.function || item?.profile?.role)
      const exitPlan = compactBriefText(item?.exit_plan || item?.exitPlan || item?.departure || item?.profile?.exit_plan)
      return name ? `${name}：功能=${role || '待明确'}；退场方式=${exitPlan || '待规划'}` : ''
    }),
  ], 14)
  const behaviorRepeatRules = uniqueBriefStrings([
    ...OH_STORY_CHARACTER_BEHAVIOR_REPEAT_RULES,
    memoryAnchors.length ? `本章优先重复的行为/记忆点：${memoryAnchors.slice(0, 4).join('、')}` : '',
    ...sceneCards.flatMap((scene: any) => asArray(scene.action_beats || scene.actionBeats).filter((item: any) => /按|摸|看|笑|问|短句|反问|沉默|旧夹克|录音|标志/.test(String(item))).map((item: any) => `场景行为重复点：${compactBriefText(item)}`)),
  ], 14)
  return {
    version: 'oh_story_character_behavior_v1',
    source: 'oh_story_embedded_fallback',
    motivation_chain: motivationChain.length ? motivationChain : uniqueBriefStrings([target.summary, target.conflict], 8),
    motivation_specificity_rules: OH_STORY_CHARACTER_MOTIVATION_SPECIFICITY_RULES,
    layered_tags: layeredTags,
    behavior_rules: OH_STORY_CHARACTER_BEHAVIOR_RULES,
    protagonist_composure_rules: OH_STORY_CHARACTER_PROTAGONIST_COMPOSURE_RULES,
    strong_association_rules: strongAssociationRules.length ? strongAssociationRules : OH_STORY_CHARACTER_STRONG_ASSOCIATION_RULES,
    memory_anchors: memoryAnchors,
    supporting_role_functions: supportingRoleFunctions,
    role_card_requirements: roleCardRequirements,
    supporting_role_exit_rules: supportingRoleExitRules,
    behavior_repeat_rules: behaviorRepeatRules,
    character_driven_event_rules: OH_STORY_CHARACTER_DRIVEN_EVENT_RULES,
    protagonist_red_line_rules: OH_STORY_CHARACTER_PROTAGONIST_RED_LINE_RULES,
    identity_goldfinger_alignment_rules: OH_STORY_CHARACTER_IDENTITY_GOLDFINGER_ALIGNMENT_RULES,
    antagonist_logic: OH_STORY_CHARACTER_ANTAGONIST_LOGIC,
    antagonist_weight_rules: OH_STORY_CHARACTER_ANTAGONIST_WEIGHT_RULES,
    antagonist_self_story_rules: OH_STORY_CHARACTER_ANTAGONIST_SELF_STORY_RULES,
    antagonist_tier_exit_rules: OH_STORY_CHARACTER_ANTAGONIST_TIER_EXIT_RULES,
    quality_checks: OH_STORY_CHARACTER_BEHAVIOR_CHECKS,
    revision_priorities: ['补动机链', '用行为展示人设', '补主角逼格反应', '补三层标签反差', '补人设强关联', '补记忆锚点', '补反派分量', '补反派自我叙事', '补反派层级退场', '修反派降智'],
  }
}

const OH_STORY_ASSET_LINKAGE_RULES = [
  '信息跟着冲突走：设定、物件、能力、势力必须通过事件、选择、阻碍或对话压力释放，不能整段说明。',
  '每个关键资产必须绑定功能、归属、触发条件、限制、后果，缺任一项就不能当作破局答案。',
  '孤立资产禁止：本章出现的资产必须推进目标、制造阻碍、兑现伏笔、改变关系或打开章尾钩子。',
  '新设定量可控：一章不要同时塞入超过 3 个全新概念；已有资产优先用状态变化产生新鲜感。',
  '禁揭资产不得误触；允许资产只能按当前角色知识边界使用。',
]

const OH_STORY_ASSET_THREE_APPEARANCE_RULES = [
  '贯穿物件三次出现：第1次建立初始意义，第2次在中段转折颠覆意义，第3次在结尾兑现情绪或证据冲击。',
  '同一资产每次出现都要改变读者已知信息、角色处境或关系状态，不能只是重复点名。',
  '关键资产的视觉/物理变化要优先于抽象解释，用可见变化承载震惊、反转或余韵。',
]

const OH_STORY_ASSET_PROP_ABILITY_EXPECTATION_RULES = [
  '道具能力展示的8步期待模板：展示宝物功能强大 -> 配角因信息不足认为鸡肋 -> 展示反派且宝物恰好克制反派 -> 配角拿更强装备失败 -> 主角做针对性方案 -> 主角上场众人不看好 -> 主角用道具压制反派，鸡肋成神器 -> 结果留下新目标或新钩子。',
  '关键资产承担破局或金手指功能时，必须先制造误判、克制关系和他人失败，再让主角出手兑现期待。',
  '道具变化要可视化：功能释放必须造成明确的视觉、物理、规则或关系状态变化，不能只写“众人震惊”。',
]

const OH_STORY_ASSET_LINKAGE_CHECKS = [
  '孤立资产检查：每个关键资产都必须与本章目标、冲突、回报或章尾钩子至少一项相连。',
  '功能链完整：功能、归属、触发条件、限制、后果必须有正文证据。',
  '状态变化可见：资产从开场到结尾至少产生一次意义、归属、可见性或风险变化。',
  '信息跟着冲突走：设定信息必须由事件/对话/行动压力带出，不能大段说明。',
  '贯穿道具按三次出现或本章片段职责执行，不能只点名不使用。',
  '道具能力展示：关键资产破局时必须按“强大功能 -> 鸡肋误判 -> 克制反派 -> 他人失败 -> 主角方案 -> 众人不看好 -> 鸡肋成神器 -> 新钩子”拉期待。',
  '禁揭/知识边界准确：forbidden 资产不泄漏，角色不能知道 knowledge_scope 外的信息。',
  '新概念不过载：本章新增设定超过 3 个或抢走主线时必须压缩。',
]

export function assetLinkageExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.asset_linkage_contract
    || contextPackage?.chapter_target?.assetLinkageContract
    || contextPackage?.asset_linkage_contract
    || contextPackage?.assetLinkageContract
    || contextPackage?.pre_draft_brief?.asset_linkage_contract
    || contextPackage?.preDraftBrief?.assetLinkageContract
}

export function assetText(item: any) {
  if (!item) return ''
  if (typeof item === 'string') return compactBriefText(item)
  return compactBriefText(item.name || item.title || item.summary || item.description || item.entity_type || item.type)
}

export function assetStateChangeText(value: any) {
  if (!value) return ''
  if (typeof value === 'string') return compactBriefText(value)
  if (typeof value !== 'object') return compactBriefText(value)
  return uniqueBriefStrings(Object.entries(value).map(([key, item]) => `${key}：${assetText(item) || compactBriefText(item)}`), 6).join('；')
}

export function assetConstraintText(value: any) {
  if (!value) return ''
  if (typeof value === 'string') return compactBriefText(value)
  if (typeof value !== 'object') return compactBriefText(value)
  return uniqueBriefStrings(Object.entries(value).map(([key, item]) => `${key}=${assetText(item) || compactBriefText(item)}`), 8).join('；')
}

function relationshipGraphDiagnosticsForAssetContract(contextPackage: any = {}) {
  const graph = contextPackage?.relationship_graph
    || contextPackage?.relationshipGraph
    || contextPackage?.setting_relationship_graph
    || contextPackage?.settingRelationshipGraph
    || contextPackage?.setting_context?.relationship_graph
    || contextPackage?.settingContext?.relationshipGraph
    || {}
  const summary = graph?.summary || {}
  const diagnosticRows = asArray(graph?.diagnostics)
    .filter((item: any) => ['isolated_key_asset', 'missing_owner', 'dangling_relation', 'owner_ability_mismatch'].includes(String(item?.type || '')))
    .map((item: any) => {
      const name = compactBriefText(item.entity_name || item.entityName || item.name || item.target_name)
      const message = compactBriefText(item.message || item.evidence || item.type)
      const type = compactBriefText(item.type)
      return [name, type ? `(${type})` : '', message ? `：${message}` : ''].join('')
    })
  const summaryRows = [
    Number(summary.isolated_key_asset_count || summary.isolatedKeyAssetCount || 0) > 0
      ? `孤立资产 ${Number(summary.isolated_key_asset_count || summary.isolatedKeyAssetCount || 0)} 项`
      : '',
    Number(summary.missing_owner_count || summary.missingOwnerCount || 0) > 0
      ? `缺拥有者 ${Number(summary.missing_owner_count || summary.missingOwnerCount || 0)} 项`
      : '',
    Number(summary.dangling_relation_count || summary.danglingRelationCount || 0) > 0
      ? `悬空引用 ${Number(summary.dangling_relation_count || summary.danglingRelationCount || 0)} 项`
      : '',
  ]
  return uniqueBriefStrings([...diagnosticRows, ...summaryRows], 12)
}

export function buildAssetLinkageContract(contextPackage: any = {}) {
  const explicit = assetLinkageExplicitContract(contextPackage)
  const relationshipGraphRisks = relationshipGraphDiagnosticsForAssetContract(contextPackage)
  const relationshipGraphQualityChecks = relationshipGraphRisks.length
    ? [`关系图诊断：处理 ${relationshipGraphRisks.slice(0, 4).join('；')}，不得让这些资产继续孤立、缺归属或悬空引用。`]
    : []
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildAssetLinkageContract({
      ...(contextPackage || {}),
      asset_linkage_contract: null,
      assetLinkageContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            asset_linkage_contract: null,
            assetLinkageContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            asset_linkage_contract: null,
            assetLinkageContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            asset_linkage_contract: null,
            assetLinkageContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitKeyAssets = asArray(explicit.key_assets || explicit.keyAssets).map(assetText).filter(Boolean)
    const explicitLinkagePlan = asArray(explicit.linkage_plan || explicit.linkagePlan).map(assetText).filter(Boolean)
    const explicitStateTracking = asArray(explicit.state_tracking || explicit.stateTracking).map(assetText).filter(Boolean)
    const explicitThreeAppearancePlan = asArray(explicit.three_appearance_plan || explicit.threeAppearancePlan).map(assetText).filter(Boolean)
    const explicitPropAbilityExpectationRules = asArray(explicit.prop_ability_expectation_rules || explicit.propAbilityExpectationRules || explicit.prop_expectation_rules || explicit.propExpectationRules).map(assetText).filter(Boolean)
    const explicitForbiddenBoundaries = asArray(explicit.forbidden_boundaries || explicit.forbiddenBoundaries).map(assetText).filter(Boolean)
    const explicitRelationshipGraphRisks = asArray(explicit.relationship_graph_risks || explicit.relationshipGraphRisks).map(assetText).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_asset_linkage_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      key_assets: explicitKeyAssets.length ? explicitKeyAssets : asArray(derived.key_assets),
      linkage_plan: uniqueBriefStrings([
        ...(explicitLinkagePlan.length ? explicitLinkagePlan : asArray(derived.linkage_plan)),
        ...relationshipGraphRisks.map(item => `关系图诊断：${item}`),
      ], 18),
      usage_rules: asArray(explicit.usage_rules || explicit.usageRules).length
        ? asArray(explicit.usage_rules || explicit.usageRules).map(assetText).filter(Boolean)
        : OH_STORY_ASSET_LINKAGE_RULES,
      state_tracking: explicitStateTracking.length ? explicitStateTracking : asArray(derived.state_tracking),
      three_appearance_plan: explicitThreeAppearancePlan.length
        ? explicitThreeAppearancePlan
        : asArray(derived.three_appearance_plan).length ? asArray(derived.three_appearance_plan) : OH_STORY_ASSET_THREE_APPEARANCE_RULES,
      prop_ability_expectation_rules: explicitPropAbilityExpectationRules.length
        ? explicitPropAbilityExpectationRules
        : asArray(derived.prop_ability_expectation_rules || derived.propAbilityExpectationRules).length ? asArray(derived.prop_ability_expectation_rules || derived.propAbilityExpectationRules) : OH_STORY_ASSET_PROP_ABILITY_EXPECTATION_RULES,
      forbidden_boundaries: explicitForbiddenBoundaries.length ? explicitForbiddenBoundaries : asArray(derived.forbidden_boundaries),
      relationship_graph_risks: explicitRelationshipGraphRisks.length ? explicitRelationshipGraphRisks : relationshipGraphRisks,
      quality_checks: uniqueBriefStrings([
        ...(asArray(explicit.quality_checks || explicit.qualityChecks).length
          ? asArray(explicit.quality_checks || explicit.qualityChecks).map(assetText).filter(Boolean)
          : OH_STORY_ASSET_LINKAGE_CHECKS),
        ...relationshipGraphQualityChecks,
      ], 12),
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map(assetText).filter(Boolean)
        : ['补资产功能链', '补状态变化', '把设定塞进冲突', '补贯穿物件出现', '修禁揭/知识边界'],
    }
  }

  const settingContext = contextPackage?.setting_context || {}
  const chapterTarget = contextPackage?.chapter_target || {}
  const usageRows = asArray(settingContext.chapter_usage || settingContext.chapterUsage)
  const entities = asArray(settingContext.entities)
  const entityById = new Map(entities.map((item: any) => [Number(item.id || item.entity_id || 0), item]))
  const rows = usageRows.length
    ? usageRows
    : [
        ...asArray(settingContext.required).map((name: any) => ({ name, required: true, usage_type: 'required' })),
        ...entities.filter((item: any) => asArray(settingContext.required).includes(item?.name)),
      ]
  const selected = rows
    .filter((item: any) => !item?.forbidden && String(item?.usage_type || '') !== 'forbidden')
    .map((row: any) => {
      const entity = entityById.get(Number(row?.entity_id || row?.id || 0)) || {}
      return { ...entity, ...row }
    })
    .filter((item: any) => assetText(item))
    .slice(0, 12)
  const forbidden = [
    ...asArray(settingContext.forbidden),
    ...usageRows.filter((item: any) => item?.forbidden || item?.usage_type === 'forbidden').map((item: any) => item.name),
  ].map(assetText).filter(Boolean)

  const keyAssets = uniqueBriefStrings(selected.map((item: any) => {
    const name = assetText(item)
    const type = compactBriefText(item.entity_type || item.type)
    const summary = compactBriefText(item.summary)
    return [name, type ? `(${type})` : '', summary ? `：${summary}` : ''].join('')
  }), 12)
  const linkagePlan = uniqueBriefStrings(selected.flatMap((item: any) => {
    const name = assetText(item)
    const usageType = compactBriefText(item.usage_type || (item.required ? 'required' : 'allowed'))
    const summary = compactBriefText(item.summary)
    const stateChange = assetStateChangeText(item.expected_state_change || item.expectedStateChange)
    return [
      `${name}：${usageType}${summary ? `｜${summary}` : ''}${stateChange ? `｜状态变化：${stateChange}` : ''}`,
      stateChange ? `${name}必须${stateChange}` : '',
    ]
  }), 16)
  const stateTracking = uniqueBriefStrings(selected.flatMap((item: any) => {
    const name = assetText(item)
    const state = assetConstraintText(item.state || item.state_json)
    const constraints = assetConstraintText(item.constraints || item.constraints_json)
    return [
      state ? `${name}当前状态：${state}` : '',
      constraints ? `${name}限制/触发：${constraints}` : '',
    ]
  }), 16)
  const itemAssets = selected.filter((item: any) => ['item', 'artifact', 'foreshadowing', 'ability', 'rule'].includes(String(item.entity_type || item.type || '')))
  const threeAppearancePlan = uniqueBriefStrings([
    ...OH_STORY_ASSET_THREE_APPEARANCE_RULES,
    ...itemAssets.slice(0, 3).map((item: any) => {
      const name = assetText(item)
      const stateChange = assetStateChangeText(item.expected_state_change || item.expectedStateChange)
      return `${name}三次出现：前段建立意义，中段被冲突触发，结尾${stateChange || '改变局势/关系/钩子'}`
    }),
  ], 10)

  return {
    version: 'oh_story_asset_linkage_v1',
    source: 'oh_story_embedded_fallback',
    key_assets: keyAssets.length ? keyAssets : uniqueBriefStrings([
      ...asArray(chapterTarget.key_settings),
      ...asArray(settingContext.required),
    ], 8),
    linkage_plan: uniqueBriefStrings([
      ...(linkagePlan.length ? linkagePlan : [
        chapterTarget.summary ? `本章目标挂钩：${chapterTarget.summary}` : '',
        chapterTarget.conflict ? `冲突挂钩：${chapterTarget.conflict}` : '',
        chapterTarget.ending_hook ? `章尾钩子挂钩：${chapterTarget.ending_hook}` : '',
      ]),
      ...relationshipGraphRisks.map(item => `关系图诊断：${item}`),
    ], 18),
    usage_rules: OH_STORY_ASSET_LINKAGE_RULES,
    state_tracking: stateTracking,
    three_appearance_plan: threeAppearancePlan,
    prop_ability_expectation_rules: OH_STORY_ASSET_PROP_ABILITY_EXPECTATION_RULES,
    forbidden_boundaries: forbidden,
    relationship_graph_risks: relationshipGraphRisks,
    quality_checks: uniqueBriefStrings([
      ...OH_STORY_ASSET_LINKAGE_CHECKS,
      ...relationshipGraphQualityChecks,
    ], 12),
    revision_priorities: ['补资产功能链', '补状态变化', '把设定塞进冲突', '补贯穿物件出现', '修禁揭/知识边界'],
  }
}

