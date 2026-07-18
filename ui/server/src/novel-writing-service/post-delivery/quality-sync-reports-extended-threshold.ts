import {
  asArray,
  compactText,
} from '../../routes/novel-route-utils'
import {
  buildExpectationBeforePayoffCheck,
  buildExpectationThresholdNextOpenLoopCheck,
  expectationThreeLinesArray,
  expectationThresholdArray,
  expectationThresholdPriority,
  normalizeExpectationThresholdCheck,
} from '../../novel-writing/expectation-threshold-basics'
import {
  buildInformationFlowInfodumpCheck,
  buildInformationFlowNextObjectiveCheck,
  buildInformationFlowTransitionCompressionCheck,
  informationFlowPriority,
  normalizeInformationFlowCheck,
} from '../../novel-writing/information-flow-basics'
import {
  compactBriefText,
  uniqueBriefStrings,
} from '../quality/text-utils'
import {
  scanDialogueInfodumpRisks,
} from '../../novel-writing/dialogue-infodump'
import {
  scanEmotionalStasisRisks,
  scanInfodumpRisks,
} from '../../novel-writing/prose-craft-scans'
import {
  scanExpectationVacuumRisks,
} from '../../novel-writing/progression-scans'

import {
  informationFlowContractForSync
} from './quality-sync-reports-extended'

export function buildInformationFlowSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = informationFlowContractForSync(contextPackage, chapter)
  const checks = [
    normalizeInformationFlowCheck(
      'information_units',
      '信息团',
      [
        contract.information_units,
        contract.informationUnits,
        contract.scene_information_units,
        contract.sceneInformationUnits,
      ],
      chapterText,
      '补足每个场景的信息团，让读者能一句话概括这段在推进什么信息。',
    ),
    normalizeInformationFlowCheck(
      'reveal_order',
      '揭示顺序',
      [
        contract.reveal_order,
        contract.revealOrder,
        contract.progression_chain,
        contract.progressionChain,
      ],
      chapterText,
      '按发现、验证、反转、回收、升级或推出新目标的顺序重排信息释放。',
      30,
    ),
    normalizeInformationFlowCheck(
      'suspense_responses',
      '悬念回应',
      [
        contract.suspense_responses,
        contract.suspenseResponses,
        contract.transition_rules,
        contract.transitionRules,
      ],
      chapterText,
      '回应、升级或明确延迟上一场悬念，不能断裂换题。',
    ),
    buildInformationFlowNextObjectiveCheck(contract, chapterText),
    buildInformationFlowTransitionCompressionCheck(contract, chapterText),
    buildInformationFlowInfodumpCheck(contract, chapterText, {
      scanInfodumpRisks,
      scanDialogueInfodumpRisks,
    }),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = informationFlowPriority(missed)

  return {
    report_id: `information-flow-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '信息流未配置' : status === 'ok' ? '信息流 OK' : `信息流缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 information_flow_contract，建议补充信息团、揭示顺序、悬念回应、过渡压缩和无背景说明书规则。'
      : status === 'ok'
        ? '正文的信息团、揭示顺序、悬念回应、过渡压缩和无背景说明书规则已基本落地。'
        : `正文有 ${missedCount} 项信息流缺口，${priorityRepair || '优先保证信息随冲突释放'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持信息流：每个场景都有可概括信息团，信息随冲突释放，揭示顺序递进，悬念有回应或明确延迟，提升后立刻给出下一目标，无信息量过渡直接删除或压缩。']
      : [
          '下一次修订必须补足信息流：信息随冲突释放，按揭示顺序递进，回应上一场悬念，提升后补下一目标，删无信息量过渡和背景说明书。',
          '每个场景至少交付一个可概括信息团；纯移动、寒暄、环境描写和设定说明没有信息量时直接删除或压缩。',
        ],
  }
}

export function expectationThresholdContractForSync(contextPackage: any = {}, chapter: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const brief = {
    ...(target?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(contextPackage?.preDraftBrief || {}),
    ...(chapter?.raw_payload?.pre_draft_brief || {}),
    ...(chapter?.raw_payload?.preDraftBrief || {}),
  }
  return target?.expectation_threshold_contract
    || target?.expectationThresholdContract
    || contextPackage?.expectation_threshold_contract
    || contextPackage?.expectationThresholdContract
    || brief?.expectation_threshold_contract
    || brief?.expectationThresholdContract
    || {}
}

export function buildExpectationThresholdSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = expectationThresholdContractForSync(contextPackage, chapter)
  const twoLongOneShort = expectationThresholdArray(
    contract.short_expectation,
    contract.shortExpectation,
    contract.current_expectations,
    contract.currentExpectations,
    contract.medium_expectations,
    contract.mediumExpectations,
    contract.long_expectations,
    contract.longExpectations,
  )
  const checks = [
    normalizeExpectationThresholdCheck(
      'two_long_one_short',
      '两长一短',
      twoLongOneShort,
      chapterText,
      '恢复两长一短：短期期待驱动当前单元，1-2条长期期待保持远期拉力。',
      30,
    ),
    normalizeExpectationThresholdCheck(
      'thresholds',
      '门槛拆分',
      [
        contract.thresholds,
        contract.gates,
        contract.conditions,
        contract.payoff_or_delay_plan,
        contract.payoffOrDelayPlan,
      ],
      chapterText,
      '把大目标拆成资源型、成就型、多条件型、动态门槛或收集型条件，不能一步解决。',
      30,
    ),
    normalizeExpectationThresholdCheck(
      'dynamic_thresholds',
      '动态加码',
      [
        contract.dynamic_thresholds,
        contract.dynamicThresholds,
      ],
      chapterText,
      '每跨越一个门槛就立刻设立下一个门槛、代价或更高条件。',
      30,
    ),
    normalizeExpectationThresholdCheck(
      'three_expectation_lines',
      '三种期待线',
      expectationThreeLinesArray(contract.three_expectation_lines || contract.threeExpectationLines),
      chapterText,
      '补齐三种期待线：剧情期待负责吊胃口，主题甜头负责持续满足，新鲜感负责间歇刺激，三者必须同时有正文证据。',
      30,
    ),
    buildExpectationBeforePayoffCheck(contract, chapterText),
    buildExpectationThresholdNextOpenLoopCheck(contract, chapterText, {
      scanExpectationVacuumRisks,
    }),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = expectationThresholdPriority(missed)

  return {
    report_id: `expectation-threshold-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '期待阈值未配置' : status === 'ok' ? '期待阈值 OK' : `期待阈值缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 expectation_threshold_contract，建议补充两长一短、三种期待线、门槛拆分、动态加码、期待铺垫和下一开环。'
      : status === 'ok'
        ? '正文已基本兑现两长一短、三种期待线、门槛拆分、动态加码、期待铺垫和下一开环。'
        : `正文有 ${missedCount} 项期待阈值缺口，${priorityRepair || '优先恢复两长一短和下一开环'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持期待阈值：两长一短和三种期待线同时在线，门槛分批提出，期待铺垫不少于爽点释放，兑现当前目标前先立下一开环。']
      : [
          '下一次修订必须补期待阈值：恢复两长一短，补剧情期待 + 主题甜头 + 新鲜感，拆分系统性门槛，补动态加码，补期待感 > 爽点的铺垫，先立下一开环，再兑现旧期待。',
          '不能让大目标一步解决；每跨过一个门槛，就要立刻给出新门槛、新代价、新线索或更大的长期期待。',
        ],
  }
}

export function emotionalArcContractForSync(contextPackage: any = {}, chapter: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const brief = {
    ...(target?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(contextPackage?.preDraftBrief || {}),
    ...(chapter?.raw_payload?.pre_draft_brief || {}),
    ...(chapter?.raw_payload?.preDraftBrief || {}),
  }
  return target?.emotional_arc_contract
    || target?.emotionalArcContract
    || contextPackage?.emotional_arc_contract
    || contextPackage?.emotionalArcContract
    || brief?.emotional_arc_contract
    || brief?.emotionalArcContract
    || {}
}

export * from './quality-sync-reports-extended-arcs'
