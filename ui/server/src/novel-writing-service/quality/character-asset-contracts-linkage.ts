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

