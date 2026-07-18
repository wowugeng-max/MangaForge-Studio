import {
  assetLinkagePriority,
  normalizeAssetLinkageFunctionChainCheck,
  normalizeAssetLinkageInformationCheck,
  normalizeAssetLinkageStateChangeCheck,
} from '../../novel-writing/asset-linkage-basics'

import {
  anchorMatchScore,
  normalizedMatchText,
} from '../../novel-writing/text-matching'

import {
  asArray,
} from '../../routes/novel-route-utils'

import {
  scanNewConceptOverloadRisks,
} from '../quality/audience-quality-contracts'

import {
  assetText,
  buildAssetLinkageContract,
} from '../quality/character-asset-contracts'

import {
  compactBriefText,
  uniqueBriefStrings,
} from '../quality/text-utils'

import {
  contextWithChapterRawPreDraftForSync,
} from './quality-sync-reports-benchmark'

export function assetLinkageContractForSync(contextPackage: any = {}, chapter: any = {}) {
  return buildAssetLinkageContract(contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function assetLinkageArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => assetText(item) || compactBriefText(item)).filter(Boolean), 24)
}

export function normalizeAssetLinkageKeyAssetsCheck(values: any[], chapterText: string) {
  const planned = assetLinkageArray(values)
  if (!planned.length) return null
  const checked = planned.map(text => {
    const match = anchorMatchScore(text, chapterText)
    const firstName = compactBriefText(text.split(/[：:｜(（]/)[0] || text)
    const nameHit = firstName ? normalizedMatchText(chapterText).includes(normalizedMatchText(firstName)) : false
    return {
      text,
      score: Math.max(match.score, nameHit ? 70 : 0),
      evidence: uniqueBriefStrings([...(match.matched || []), nameHit ? firstName : ''], 4),
      delivered: match.score >= 26 || nameHit,
    }
  })
  const missed = checked.filter(item => !item.delivered)
  return {
    key: 'key_assets',
    label: '关键资产',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: Math.round(checked.reduce((sum, item) => sum + Number(item.score || 0), 0) / Math.max(1, checked.length)),
    evidence: checked.flatMap(item => item.evidence).filter(Boolean).slice(0, 8),
    delivered: missed.length === 0,
    status: missed.length === 0 ? 'ok' : 'warn',
    missed_items: missed.map(item => item.text),
    issue: missed.length === 0 ? '' : `关键资产未进入正文：${missed.map(item => item.text).join('；')}`,
    repair_instruction: missed.length === 0 ? '' : '把关键资产写进现场动作、对话压力、规则触发或章尾钩子，不能只留在设定表。',
  }
}

export function normalizeAssetLinkageThreeAppearanceCheck(values: any[], chapterText: string) {
  const planned = assetLinkageArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const assetNames = planned
    .map(item => compactBriefText(item.split(/[：:｜(（]/)[0] || item)
      .replace(/三次出现|第\d次|前段|中段|结尾/g, ''))
    .filter(Boolean)
  const maxHits = assetNames.reduce((max, name) => {
    const normalizedName = normalizedMatchText(name)
    if (!normalizedName) return max
    const count = normalizedMatchText(text).split(normalizedName).length - 1
    return Math.max(max, count)
  }, 0)
  const hasThreeStages = /三次出现|第三次|袖口[^。！？!?]{0,80}案|案上[^。！？!?]{0,80}章尾|前段[^。！？!?]{0,80}中段[^。！？!?]{0,80}结尾/.test(text)
  const hasMeaningShift = /初始意义|意义|颠覆|回扣|从[^。！？!?]{0,30}变成|证据冲击|改变局势|露出血契编号/.test(text)
  const delivered = (maxHits >= 3 || hasThreeStages) && hasMeaningShift
  return {
    key: 'three_appearance_plan',
    label: '贯穿道具',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(20, [maxHits >= 3, hasThreeStages, hasMeaningShift].filter(Boolean).length * 28),
    evidence: [maxHits >= 3 ? '资产多次出现' : '', hasThreeStages ? '三段出现' : '', hasMeaningShift ? '意义/局势变化' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '贯穿道具没有完成三次出现或每次意义变化，容易变成重复点名。',
    repair_instruction: delivered ? '' : '按三次出现修复：第一次建立意义，第二次在冲突中颠覆意义，第三次在结尾兑现证据、情绪或钩子。',
  }
}

export function normalizeAssetLinkageIsolationCheck(contract: any, chapterText: string) {
  const text = String(chapterText || '')
  const assetMentions = assetLinkageArray(contract.key_assets || contract.keyAssets)
    .map(item => compactBriefText(item.split(/[：:｜(（]/)[0] || item))
    .filter(Boolean)
    .filter(name => normalizedMatchText(text).includes(normalizedMatchText(name)))
  const hasUse = /打开|撬开|触发|证明|卡进|锁死|留下|亮出|露出|改变|兑现|逼出/.test(text)
  const hasStoryLink = /目标|冲突|阻碍|回报|章尾|钩子|旁观者|站位|局势|证据|账本原件|血契编号/.test(text)
  const isolated = /没有人真的使用|只被反复提起|只被点名|很重要|复杂来历|顺便介绍|事情就解决了/.test(text)
  const delivered = assetMentions.length === 0 || (!isolated && hasUse && hasStoryLink)
  return {
    key: 'isolated_assets',
    label: '孤立资产',
    text: '本章出现的关键资产必须推进目标、制造阻碍、兑现伏笔、改变关系或打开章尾钩子。',
    expected: '本章出现的关键资产必须推进目标、制造阻碍、兑现伏笔、改变关系或打开章尾钩子。',
    score: delivered ? 86 : 18,
    evidence: [assetMentions.length ? `出现资产：${assetMentions.join('、')}` : '', hasUse ? '有使用动作' : '', hasStoryLink ? '接到故事功能' : '', isolated ? '孤立点名' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : assetMentions,
    issue: delivered ? '' : '关键资产出现在正文里，但没有推进目标、制造阻碍、兑现伏笔、改变关系或打开章尾钩子。',
    repair_instruction: delivered ? '' : '消灭孤立资产：每个资产至少绑定一个现场功能，不能只介绍、点名或当背景摆件。',
  }
}

export function relationshipGraphRiskAssetName(risk: string) {
  return compactBriefText(String(risk || '').split(/[：:]/)[0].replace(/\([^)]*\)|（[^）]*）/g, ''))
}

export function relationshipGraphRiskType(risk: string) {
  const match = String(risk || '').match(/\(([^)]+)\)|（([^）]+)）/)
  return compactBriefText(match?.[1] || match?.[2] || '')
}

export function normalizeAssetLinkageRelationshipGraphRiskCheck(contract: any, chapterText: string) {
  const risks = assetLinkageArray(contract.relationship_graph_risks || contract.relationshipGraphRisks)
  if (!risks.length) return null
  const text = String(chapterText || '')
  const normalizedText = normalizedMatchText(text)
  const unresolvedPattern = /没有人真的使用|没有人使用|没人说明|无法判断|归谁|只被反复提起|只被点名|事情很快就解决|很重要/.test(text)
  const hasUse = /打开|撬开|触发|证明|卡进|锁死|留下|亮出|露出|改变|兑现|逼出|压进|连在一起/.test(text)
  const hasOwner = /归属当场落到|落到[^。！？!?]{0,20}手上|属于|继承权|交到|由[^。！？!?]{1,18}(持有|保管|触发|承担)/.test(text)
  const hasRelation = /连在一起|关联到|绑定|指向|证明|反过来|钩出|牵出|接到|打开章尾钩子/.test(text)
  const hasConsequence = /代价|后果|锁死|红印|承担|限制|改变局势|状态变化/.test(text)
  const checked = risks.map(risk => {
    const riskText = compactBriefText(risk)
    const assetName = relationshipGraphRiskAssetName(riskText)
    const type = relationshipGraphRiskType(riskText)
    const appears = assetName ? normalizedText.includes(normalizedMatchText(assetName)) : true
    const requiresOwner = ['missing_owner', 'owner_ability_mismatch'].includes(type)
    const requiresRelation = ['isolated_key_asset', 'dangling_relation', 'owner_ability_mismatch'].includes(type)
    const delivered = appears
      && !unresolvedPattern
      && hasUse
      && (!requiresOwner || (hasOwner && hasConsequence))
      && (!requiresRelation || hasRelation)
    return {
      risk: riskText,
      assetName,
      type,
      delivered,
      evidence: [
        appears && assetName ? `出现资产：${assetName}` : '',
        hasUse ? '有使用/触发动作' : '',
        hasOwner ? '归属/触发者明确' : '',
        hasRelation ? '接入核心关系' : '',
        hasConsequence ? '后果/代价可见' : '',
        unresolvedPattern ? '仍有悬空表述' : '',
      ].filter(Boolean),
    }
  })
  const missed = checked.filter(item => !item.delivered)
  const delivered = missed.length === 0
  return {
    key: 'relationship_graph_risks',
    label: '关系图风险',
    text: risks.join('；'),
    expected: '关系图风险必须在正文中被改写成资产归属、功能、触发、代价、关系连接或章尾钩子，不能继续孤立、缺归属或悬空引用。',
    score: delivered ? 88 : Math.max(20, Math.round(((checked.length - missed.length) / Math.max(1, checked.length)) * 88)),
    evidence: checked.flatMap(item => item.evidence).filter(Boolean).slice(0, 10),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: missed.map(item => item.risk),
    issue: delivered ? '' : `仍有 ${missed.length} 项关系图风险没有被正文消解。`,
    repair_instruction: delivered ? '' : '优先处理关系图风险：把孤立资产、缺拥有者、悬空引用写成现场功能，明确归属/触发者/限制/代价，并接到目标、冲突、回报或章尾钩子。',
  }
}

export function buildAssetLinkageDeterministicCheck(contextPackage: any, chapterText: string) {
  const risks = [
    /没有人真的使用|只被反复提起|只被点名|很重要，它有很多复杂来历|事情就解决了/.test(String(chapterText || '')) ? {
      key: 'isolated_asset_telling',
      label: '孤立资产点名',
      evidence: '正文点名资产重要，却没有让资产承担现场功能。',
      fix: '让资产触发规则、制造阻碍、改变归属、兑现伏笔或打开章尾钩子。',
    } : null,
    /复杂来历|一整套设定|顺便介绍|完整解释|规则非常复杂/.test(String(chapterText || '')) ? {
      key: 'asset_infodump',
      label: '资产设定说明',
      evidence: '资产信息以说明书方式释放。',
      fix: '把资产信息塞进冲突、质疑、使用、触发和代价反馈。',
    } : null,
    ...scanNewConceptOverloadRisks(contextPackage).map((item: any) => ({
      key: item.key || 'new_concept_overload',
      label: item.label || '新概念过载',
      evidence: item.evidence || item.fix || '本章新增资产/设定概念过多。',
      fix: item.fix || '压缩新概念，优先用已有资产的状态变化制造新鲜感。',
    })),
  ].filter(Boolean)
  if (!risks.length) return null
  return {
    key: 'asset_linkage_forbidden',
    label: '资产挂钩硬伤',
    text: '资产不得只点名、只说明设定、只当背景摆件，也不得让新概念抢走主线。',
    expected: '资产不得只点名、只说明设定、只当背景摆件，也不得让新概念抢走主线。',
    score: Math.max(0, 100 - risks.length * 22),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项资产挂钩确定性风险。`,
    repair_instruction: '按 oh-story 资产挂钩修复：资产要接目标、冲突、回报、章尾钩子和状态变化；设定信息跟冲突走。',
  }
}

export function buildAssetLinkageSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const mergedContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const contract = assetLinkageContractForSync(contextPackage, chapter)
  const checks = [
    normalizeAssetLinkageKeyAssetsCheck(contract.key_assets || contract.keyAssets, chapterText),
    normalizeAssetLinkageFunctionChainCheck(contract.linkage_plan || contract.linkagePlan || contract.usage_rules || contract.usageRules, chapterText),
    normalizeAssetLinkageStateChangeCheck(contract.state_tracking || contract.stateTracking, chapterText),
    normalizeAssetLinkageThreeAppearanceCheck(contract.three_appearance_plan || contract.threeAppearancePlan, chapterText),
    normalizeAssetLinkageInformationCheck(contract.usage_rules || contract.usageRules, chapterText),
    normalizeAssetLinkageIsolationCheck(contract, chapterText),
    normalizeAssetLinkageRelationshipGraphRiskCheck(contract, chapterText),
    buildAssetLinkageDeterministicCheck({ ...(mergedContextPackage || {}), project }, chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = assetLinkagePriority(missed)

  return {
    report_id: `asset-linkage-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '资产挂钩未配置' : status === 'ok' ? '资产挂钩 OK' : `资产挂钩缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 asset_linkage_contract，建议补充关键资产、功能链、状态变化、贯穿道具和信息释放规则。'
      : status === 'ok'
        ? '正文已基本兑现关键资产、功能链、状态变化、贯穿道具和信息随冲突释放。'
        : `正文有 ${missedCount} 项资产挂钩缺口，${priorityRepair || '优先消灭孤立资产并补功能链'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持资产挂钩：关键资产继续接目标、冲突、回报和章尾钩子，信息随冲突释放，状态变化可追踪。']
      : [
          missed.some((item: any) => item.key === 'relationship_graph_risks')
            ? '下一章必须先处理关系图风险：孤立资产要接核心关系，缺拥有者资产要明确归属、触发者、限制和代价。'
            : '',
          '下一章必须补资产挂钩：每个关键资产都要绑定功能、归属、触发条件、限制、后果，并接到目标、冲突、回报或章尾钩子。',
          '删掉只点名、只介绍来历、只当背景摆件的孤立资产；设定信息必须通过使用、质疑、触发、误判或代价反馈释放。',
      ].filter(Boolean),
  }
}

