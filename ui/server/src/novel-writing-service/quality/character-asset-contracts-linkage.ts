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

