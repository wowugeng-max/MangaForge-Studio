import {
  anchorMatchScore,
  normalizedMatchText,
} from '../../novel-writing/text-matching'
import {
  asArray,
  compactText,
} from '../../routes/novel-route-utils'
import {
  buildEmotionalArcDeterministicCheck,
  emotionalArcPriority,
  normalizeEmotionModuleRecompositionRulesCheck,
  normalizeEmotionalSceneExecutionRulesCheck,
  normalizeEmotionalTurningRulesCheck,
  normalizeMemePlotFormulaRulesCheck,
  normalizePayoffDensityRulesCheck,
  normalizePayoffEscalationRulesCheck,
  normalizeProgressiveConfrontationRulesCheck,
  normalizeReaderDesireFormulaRulesCheck,
} from '../../novel-writing/emotional-arc-execution-basics'
import {
  chapterAttractionPriority,
  normalizeAttractionDimension,
} from '../../novel-writing/chapter-attraction-basics'
import {
  characterArcPriority,
  normalizeCharacterArcDimension,
} from '../../novel-writing/character-arc-basics'
import {
  compactBriefText,
  uniqueBriefStrings,
} from '../quality/text-utils'
import {
  firstCompactText,
  firstSceneCardText,
  normalizeStoryDriveDimension,
  storyDrivePriority,
} from '../../novel-writing/story-drive-basics'
import {
  firstDefined,
} from './core-handoff-sync-reports'
import {
  innovationBeatMatch,
  normalizeInnovationBeat,
} from '../../novel-writing/innovation-basics'
import {
  nextBatchBriefFromContext,
  normalizeStoryUnitContext,
} from '../quality/memory-longform-contracts'
import {
  normalizeEmotionalArcCheck,
} from '../../novel-writing/emotional-arc-basics'
import {
  normalizePayoffReverseDesignCheck,
  normalizePayoffTierRulesCheck,
} from '../../novel-writing/payoff-design-basics'
import {
  normalizeSignatureSceneBrief,
  normalizeSignatureSceneSyncBeat,
  signatureSceneSyncBeatMatch,
} from '../../novel-writing/signature-scene-basics'
import {
  normalizeStoryUnitSyncBeat,
  storyUnitForbiddenTouched,
  storyUnitSyncBeatMatch,
} from '../../novel-writing/story-unit-basics'
import {
  scanDownwardSafetyRisks,
  scanOppressionPurposeRisks,
  scanPayoffDensityRisks,
  scanPayoffEscalationRisks,
  scanTrumpCardEffectRisks,
} from '../../novel-writing/emotional-payoff-scans'
import {
  scanEmotionalStasisRisks,
  scanInfodumpRisks,
} from '../../novel-writing/prose-craft-scans'
import {
  retentionBriefFromContext,
  contextWithChapterRawPreDraftForSync,
  targetReaderContractForSync,
  targetReaderArray,
  countTargetReaderSignals,
  normalizeTargetReaderProfileCheck,
  normalizeTargetReaderDesireCheck,
  normalizeTargetReaderEmotionalGapCheck,
} from './quality-sync-reports-benchmark'

import {
  emotionalArcContractForSync,
  sceneDriveExpectation,
  storyDriveSceneCards,
} from './quality-sync-reports-extended'

export function buildEmotionalArcSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = emotionalArcContractForSync(contextPackage, chapter)
  const checks = [
    normalizeEmotionalArcCheck(
      'emotion_formula',
      '情绪公式',
      [
        contract.emotion_formula,
        contract.emotionFormula,
        contract.arc_shape,
        contract.arcShape,
      ],
      chapterText,
      '正文必须让读者看见平静 -> 调动 -> 释放 -> 爽，而不是只把事件写正确。',
      26,
    ),
    normalizeEmotionalArcCheck(
      'scene_emotion_steps',
      '调动释放',
      [
        contract.scene_emotion_steps,
        contract.sceneEmotionSteps,
        contract.pressure_methods,
        contract.pressureMethods,
      ],
      chapterText,
      '补出调动和释放：先让压力、期待或不该如此可感，再用行动结果、反应差异或新信息完成释放。',
      28,
    ),
    normalizeEmotionalArcCheck(
      'payoff_types',
      '爽点释放',
      [
        contract.payoff_types,
        contract.payoffTypes,
      ],
      chapterText,
      '补出目标达成、态度转变、收获盘点、能力碾压或其他可见读者收益。',
      28,
    ),
    normalizePayoffReverseDesignCheck(contract, chapterText),
    normalizePayoffTierRulesCheck(contract, chapterText),
    normalizePayoffDensityRulesCheck(contract, chapterText, { scanPayoffDensityRisks }),
    normalizeEmotionModuleRecompositionRulesCheck(contract, chapterText),
    normalizePayoffEscalationRulesCheck(contract, chapterText, { scanPayoffEscalationRisks }),
    normalizeProgressiveConfrontationRulesCheck(contract, chapterText),
    normalizeMemePlotFormulaRulesCheck(contract, chapterText),
    normalizeReaderDesireFormulaRulesCheck(contract, chapterText),
    normalizeEmotionalSceneExecutionRulesCheck(contract, chapterText),
    normalizeEmotionalArcCheck(
      'expectation_rules',
      '断期待禁止',
      [
        contract.expectation_rules,
        contract.expectationRules,
      ],
      chapterText,
      '闭环一个期待时，必须同时开启新的期待或更大问题。',
      28,
    ),
    normalizeEmotionalArcCheck(
      'safety_rules',
      '下行情节安全感',
      [
        contract.safety_rules,
        contract.safetyRules,
      ],
      chapterText,
      '下行情节中必须给读者看见底牌、潜在解法、盟友动作、规则漏洞或反击窗口。',
      28,
    ),
    normalizeEmotionalArcCheck(
      'emotional_three_blades',
      '情绪三板斧',
      [
        contract.bonding_setup_rules,
        contract.bondingSetupRules,
        contract.emotional_tear_rules,
        contract.emotionalTearRules,
        contract.lingering_aftertaste_rules,
        contract.lingeringAftertasteRules,
      ],
      chapterText,
      '补情绪三板斧：前段用具体物件/数字/重复动作铺羁绊，中段用反差/错位/延迟真相撕裂，结尾用安静细节或物件回声收束。',
      30,
    ),
    normalizeEmotionalTurningRulesCheck(contract, chapterText),
    buildEmotionalArcDeterministicCheck(chapterText, {
      scanEmotionalStasisRisks,
      scanDownwardSafetyRisks,
      scanOppressionPurposeRisks,
      scanPayoffDensityRisks,
      scanPayoffEscalationRisks,
      scanTrumpCardEffectRisks,
    }),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = emotionalArcPriority(missed)

  return {
    report_id: `emotional-arc-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '情绪弧未配置' : status === 'ok' ? '情绪弧 OK' : `情绪弧缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 emotional_arc_contract，建议补充情绪公式、调动释放、爽点类型、爽点倒推法、装逼层级、多爽点密度、情绪模块重组、爽点递增对比、递进对抗、梗四段式、读者欲望四步公式、期待规则和安全感规则。'
      : status === 'ok'
        ? '正文已基本兑现情绪公式、调动释放、爽点释放、爽点倒推法、装逼层级、多爽点密度、情绪模块重组、爽点递增对比、递进对抗、梗四段式、读者欲望四步公式和下行情节安全感。'
        : `正文有 ${missedCount} 项情绪弧缺口，${priorityRepair || '优先补调动释放和安全感'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持情绪弧：平静 -> 调动 -> 释放 -> 爽，先按爽点类型 -> 期待点 -> 铺垫倒推章纲，正文再按铺垫 -> 期待升高 -> 爽点释放呈现；核心爽点切在主线上，日常小装逼只维持耐心，避免偏离爽点；不要拉长单个爽点铺垫，800-1200 字内要有信息增量、能力展示、危机反制、关系变化或小回收；复用同一情绪模块时换场景/换对手/加新情绪或提高 stakes；递进对抗保持角力而非碾压，梗按发生 -> 发展 -> 转折 -> 高潮，读者欲望按生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿；爽点按影响范围、揭示深度或身份落差递增，下压有安全感。']
      : [
          '下一次修订必须补情绪弧：每个场景标注调动/复现/释放/后反应，恢复平静 -> 调动 -> 释放 -> 爽；先定爽点类型，再拉期待点，最后倒推铺垫；正文按铺垫 -> 期待升高 -> 爽点释放呈现，核心爽点必须服务主线目标，删掉或改写偏离主线的爽点；不要拉长单个爽点铺垫，要拆出多个小回报；复用同一情绪模块时必须换场景/换对手/加新情绪或提高 stakes；递进对抗必须角力而非碾压，梗四段式必须发生 -> 发展 -> 转折 -> 高潮，读者欲望四步公式必须生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿，并按影响范围、揭示深度或身份落差兑现递增释放。',
          '连续下压不能只让主角受辱受损；必须给出底牌、潜在解法、盟友动作、规则漏洞、反击窗口或明确读者收益。',
        ],
  }
}

export function characterArcBriefFromContext(contextPackage: any, chapter: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || {}
  const brief = syncContextPackage?.pre_draft_brief || syncContextPackage?.preDraftBrief || {}
  return target.character_arc_brief
    || target.characterArcBrief
    || brief.character_arc_brief
    || brief.characterArcBrief
    || syncContextPackage?.character_arc_context
    || syncContextPackage?.characterArcContext
    || {}
}

export function buildCharacterArcSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const arc = characterArcBriefFromContext(contextPackage, chapter)
  const sceneCards = storyDriveSceneCards(contextWithChapterRawPreDraftForSync(contextPackage, chapter), chapter)
  const dimensions = [
    normalizeCharacterArcDimension(
      'desire',
      '角色欲望',
      firstCompactText(
        arc.desire,
        arc.character_desire,
        arc.characterDesire,
        arc.goal,
        firstSceneCardText(sceneCards, ['character_goal', 'characterGoal', 'desire', 'goal']),
      ),
      chapterText,
      40,
    ),
    normalizeCharacterArcDimension(
      'flaw_pressure',
      '缺陷受压',
      firstCompactText(
        arc.flaw_pressure,
        arc.flawPressure,
        arc.inner_conflict,
        arc.innerConflict,
        arc.fear,
        firstSceneCardText(sceneCards, ['flaw_pressure', 'flawPressure', 'inner_conflict', 'fear', 'pressure']),
      ),
      chapterText,
      40,
    ),
    normalizeCharacterArcDimension(
      'relationship_shift',
      '关系变化',
      firstCompactText(
        arc.relationship_shift,
        arc.relationshipShift,
        arc.relationship_change,
        arc.relationshipChange,
        firstSceneCardText(sceneCards, ['relationship_shift', 'relationshipShift', 'relationship_change', 'relationshipChange']),
      ),
      chapterText,
      40,
    ),
    normalizeCharacterArcDimension(
      'growth_beat',
      '成长节点',
      firstCompactText(
        arc.growth_beat,
        arc.growthBeat,
        arc.character_growth,
        arc.characterGrowth,
        arc.arc_step,
        arc.arcStep,
        firstSceneCardText(sceneCards, ['growth_beat', 'growthBeat', 'character_growth', 'arc_step', 'exit_state']),
      ),
      chapterText,
      40,
    ),
    normalizeCharacterArcDimension(
      'voice_anchor',
      '口吻锚点',
      firstCompactText(
        arc.voice_anchor,
        arc.voiceAnchor,
        arc.voice_rule,
        arc.voiceRule,
        arc.dialogue_style,
        firstSceneCardText(sceneCards, ['voice_anchor', 'voiceAnchor', 'voice_rule', 'dialogue_style']),
      ),
      chapterText,
      36,
    ),
  ].filter(Boolean)

  const delivered = dimensions.filter((item: any) => item.delivered)
  const missed = dimensions.filter((item: any) => !item.delivered)
  const score = Math.max(0, Math.min(100, Math.round(
    dimensions.length ? dimensions.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / dimensions.length : 82,
  )))
  const status = missed.length > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = characterArcPriority(missed)

  return {
    report_id: `character-arc-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: dimensions.length === 0 ? '人物弧光未配置' : status === 'ok' ? '人物弧光 OK' : `人物弧光缺口 ${missed.length}`,
    summary: dimensions.length === 0
      ? '本章没有明确的人物弧光任务，建议在开写任务书中补角色欲望、缺陷受压、关系变化和成长节点。'
      : status === 'ok'
        ? '本章角色欲望、缺陷受压、关系变化、成长节点和口吻锚点已基本落地。'
        : `本章有 ${missed.length} 项人物弧光缺口，${priorityRepair || '优先补人物成长节点'}。`,
    missed_count: missed.length,
    priority_repair: priorityRepair,
    dimensions,
    planned: dimensions,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持角色欲望、缺陷受压、关系变化、成长节点和口吻锚点的连续执行。']
      : [
          '下一次修订必须补出人物成长：角色欲望、缺陷受压、关系变化、成长节点和口吻锚点至少落地主要缺口。',
          '不能只补心理旁白；新增内容必须写成角色行动、选择、对话反应、关系反馈或可见状态变化。',
          '人物成长不能改长期方向；只推进本章应承担的阶段性变化。',
        ],
  }
}

export function buildChapterAttractionReviewReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || {}
  const retentionBrief = retentionBriefFromContext(contextPackage, chapter)
  const dimensions = [
    normalizeAttractionDimension('opening_hook', '开篇钩子', retentionBrief.opening_hook || retentionBrief.openingHook || target.opening_hook || target.openingHook || target.summary, chapterText, { openingOnly: true, threshold: 44 }),
    normalizeAttractionDimension('scene_drive', '场景推进', sceneDriveExpectation(syncContextPackage, chapter) || target.conflict || target.core_conflict || target.coreConflict, chapterText, { threshold: 40 }),
    normalizeAttractionDimension('payoff_density', '爽点密度', retentionBrief.payoff_promise || retentionBrief.payoffPromise || target.reader_payoff || target.readerPayoff || target.payoff, chapterText, { threshold: 42 }),
    normalizeAttractionDimension('page_turn', '章末翻页', retentionBrief.ending_question || retentionBrief.endingQuestion || target.ending_hook || target.endingHook, chapterText, { tailOnly: true, threshold: 42 }),
    normalizeAttractionDimension('spread_scene', '传播场面', retentionBrief.short_drama_scene || retentionBrief.shortDramaScene || target.signature_scene_brief?.signature_scene || target.signatureSceneBrief?.signatureScene || target.ip_scene_hook || target.ipSceneHook, chapterText, { threshold: 42 }),
  ]
  const weak = dimensions.filter(item => item.status === 'warn')
  const score = Math.max(0, Math.min(100, Math.round(dimensions.reduce((sum, item) => sum + Number(item.score || 0), 0) / Math.max(1, dimensions.length))))
  const status = weak.length > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = chapterAttractionPriority(dimensions)
  return {
    report_id: `chapter-attraction-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '吸引力 OK' : `吸引力缺口 ${weak.length}`,
    summary: status === 'ok'
      ? '本章开篇钩子、场景推进、爽点密度、章末翻页和传播场面已形成连续读者拉力。'
      : `本章有 ${weak.length} 项吸引力执行缺口，${priorityRepair || '优先处理读者翻页动力'}。`,
    weak_count: weak.length,
    priority_repair: priorityRepair,
    dimensions,
    weak_dimensions: weak,
    next_actions: status === 'ok'
      ? ['保持当前章的读者拉力执行结构，并在下一章继续承接章末问题。']
      : [
          '前300字必须尽快给出异常、危险、欲望或反常信息。',
          '每个场景补齐目标、阻碍、转折、回报，避免纯解释或纯氛围过场。',
          '最后300字必须留下下一章非看不可的危险、选择、反转或未解答案。',
          '补出可视化传播场面和短周期爽点，让读者能复述本章最有记忆点的一幕。',
        ],
  }
}

export function innovationBriefFromContext(contextPackage: any, chapter: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || {}
  const brief = syncContextPackage?.pre_draft_brief || syncContextPackage?.preDraftBrief || {}
  return target.innovation_brief || target.innovationBrief || brief.innovation_brief || brief.innovationBrief || {}
}

export function buildInnovationSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const innovationBrief = innovationBriefFromContext(contextPackage, chapter)
  const planned = [
    normalizeInnovationBeat('chapter_angle', '创新角度', innovationBrief.chapter_angle || innovationBrief.chapterAngle),
    ...asArray(innovationBrief.execution_points || innovationBrief.executionPoints).map((item: any, index: number) => normalizeInnovationBeat(`execution_point_${index + 1}`, '执行点', item)),
    ...asArray(innovationBrief.differentiation_guardrails || innovationBrief.differentiationGuardrails).map((item: any, index: number) => normalizeInnovationBeat(`differentiation_guardrail_${index + 1}`, '差异护栏', item)),
    ...asArray(innovationBrief.ip_adaptation_hooks || innovationBrief.ipAdaptationHooks).map((item: any, index: number) => normalizeInnovationBeat(`ip_adaptation_hook_${index + 1}`, 'IP化场面', item)),
  ].filter(Boolean)
  const checked = planned.map(item => innovationBeatMatch(item, chapterText))
  const delivered = checked.filter(item => item.delivered)
  const missed = checked.filter(item => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    planned.length ? (delivered.length / planned.length) * 100 : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `innovation-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '创新 OK' : `创新缺口 ${missedCount}`,
    summary: status === 'ok'
      ? '本章创新角度、执行点、差异护栏和可视化场面已基本落地。'
      : `创新执行有 ${missedCount} 项未在正文中充分兑现。`,
    missed_count: missedCount,
    planned,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持开写任务书的创新执行和写后复盘闭环。']
      : [
          '下一次修订优先补足创新执行 missed 项，避免把本章写成普通套路章。',
          '把创新角度转成可见选择、机制反差、规则代价或 IP 化场面，不要只靠旁白解释卖点。',
      ],
  }
}

export function signatureSceneBriefFromContext(contextPackage: any, chapter: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  return normalizeSignatureSceneBrief(
    syncContextPackage?.chapter_target?.signature_scene_brief
      || syncContextPackage?.chapter_target?.signatureSceneBrief
      || syncContextPackage?.signature_scene_brief
      || syncContextPackage?.signatureSceneBrief
      || syncContextPackage?.pre_draft_brief?.signature_scene_brief
      || syncContextPackage?.pre_draft_brief?.signatureSceneBrief
      || syncContextPackage?.preDraftBrief?.signature_scene_brief
      || syncContextPackage?.preDraftBrief?.signatureSceneBrief
      || chapter?.raw_payload?.signature_scene_brief
      || chapter?.raw_payload?.signatureSceneBrief,
  )
}

export function buildSignatureSceneSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const signatureSceneBrief = signatureSceneBriefFromContext(contextPackage, chapter)
  const planned = [
    normalizeSignatureSceneSyncBeat('signature_scene', '标志性场面', signatureSceneBrief?.signature_scene, 58),
    normalizeSignatureSceneSyncBeat('scene_repair_target', '补位目标', signatureSceneBrief?.scene_repair_target, 50),
    normalizeSignatureSceneSyncBeat('reader_payoff', '读者回报', signatureSceneBrief?.reader_payoff, 42),
    normalizeSignatureSceneSyncBeat('storyline_service', '剧情线服务', signatureSceneBrief?.storyline_service, 50),
  ].filter(Boolean)

  if (!planned.length) {
    return {
      report_id: `signature-scene-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
      chapter_id: chapter?.id || null,
      chapter_no: chapter?.chapter_no || null,
      score: null,
      status: 'ok',
      label: '强场面未计划',
      summary: '本章没有明确标志性强场面补位任务，不做兑现复盘。',
      planned_count: 0,
      missed_count: 0,
      planned: [],
      delivered: [],
      missed: [],
      next_actions: ['后续如近10章强场面覆盖不足，先在滚动规划和开写任务书中补标志性场面。'],
    }
  }

  const rawChecked = planned.map(item => signatureSceneSyncBeatMatch(item, chapterText))
  const signatureDelivered = rawChecked.some(item => item.key === 'signature_scene' && item.delivered)
  const checked = rawChecked.map(item => {
    if (item.key !== 'scene_repair_target' || item.delivered || !signatureDelivered) return item
    return {
      ...item,
      score: Math.max(Number(item.score || 0), 80),
      evidence: ['标志性场面已落地'],
      delivered: true,
    }
  })
  const delivered = checked.filter(item => item.delivered)
  const missed = checked.filter(item => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round((delivered.length / planned.length) * 100)))
  const signatureSceneMissed = missed.some(item => item.key === 'signature_scene')
  const status = signatureSceneMissed || missedCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `signature-scene-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '强场面 OK' : `强场面漏写 ${missedCount}`,
    summary: status === 'ok'
      ? '本章开写任务书里的标志性场面、补位目标、读者回报和剧情线服务已基本落地。'
      : `标志性强场面补位有 ${missedCount} 项未在正文中充分兑现。`,
    planned_count: planned.length,
    missed_count: missedCount,
    planned,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持强场面补位从滚动规划到正文交稿的兑现闭环。']
      : [
          '下一次修订优先补回开写任务书指定的标志性场面，把它写成可视化动作、空间冲突、规则代价或公开反转。',
          '不要只补气氛描写；必须让 scene_repair_target、reader_payoff 和 storyline_service 在正文事件中可见。',
      ],
  }
}

export function storyUnitContextFromContext(contextPackage: any, chapter: any = {}) {
  const target = contextPackage?.chapter_target || contextPackage?.chapterTarget || {}
  return normalizeStoryUnitContext(
    target?.story_unit_context
      || target?.storyUnitContext
      || contextPackage?.story_unit_context
      || contextPackage?.storyUnitContext
      || contextPackage?.pre_draft_brief?.story_unit_context
      || contextPackage?.pre_draft_brief?.storyUnitContext
      || contextPackage?.preDraftBrief?.story_unit_context
      || contextPackage?.preDraftBrief?.storyUnitContext
      || chapter?.raw_payload?.pre_draft_brief?.story_unit_context
      || chapter?.raw_payload?.pre_draft_brief?.storyUnitContext
      || chapter?.raw_payload?.preDraftBrief?.story_unit_context
      || chapter?.raw_payload?.preDraftBrief?.storyUnitContext
      || chapter?.raw_payload?.story_unit_context
      || chapter?.raw_payload?.storyUnitContext,
    Number(chapter?.chapter_no || target?.chapter_no || target?.chapterNo || 0),
  )
}

export function buildStoryUnitSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const storyUnit = storyUnitContextFromContext(contextPackage, chapter)
  if (!storyUnit) {
    return {
      report_id: `story-unit-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
      chapter_id: chapter?.id || null,
      chapter_no: chapter?.chapter_no || null,
      score: null,
      status: 'ok',
      label: '剧情单元未计划',
      summary: '本章没有明确剧情单元任务，不做单元职责复盘。',
      missed_count: 0,
      rushed_count: 0,
      forbidden_count: 0,
      story_unit: null,
      planned: [],
      delivered: [],
      missed: [],
      rushed_ahead: [],
      forbidden_touched: [],
      next_actions: [],
    }
  }

  const role = compactBriefText(storyUnit.current_chapter_role)
  const roleText = normalizedMatchText(role)
  const roleRequired = [
    /入口|开场|进场/.test(role)
      ? normalizeStoryUnitSyncBeat('entry_hook', '入口钩子', storyUnit.entry_hook || role, 'story_unit', 50)
      : null,
    /高潮|回报|兑现|打脸|结算/.test(role)
      ? normalizeStoryUnitSyncBeat('mini_climax_payoff', '小高潮/回报', storyUnit.mini_climax_payoff || role, 'story_unit', 58)
      : null,
    /出单元|出场|收束|转入|承接下一|下一段/.test(role)
      ? normalizeStoryUnitSyncBeat('exit_hook', '出单元钩子', storyUnit.exit_hook || role, 'story_unit', 58)
      : null,
    /压力|升级|推进|冲突/.test(role)
      ? normalizeStoryUnitSyncBeat('pressure_escalation', '压力升级', asArray(storyUnit.pressure_escalation)[0] || role, 'story_unit', 50)
      : null,
  ].filter(Boolean)
  const fallbackRequired = roleRequired.length
    ? []
    : [
        normalizeStoryUnitSyncBeat('current_chapter_role', '当前职责', role || storyUnit.unit_goal, 'story_unit', 46),
      ].filter(Boolean)
  const setupOptional = asArray(storyUnit.setup_and_storyline)
    .slice(0, 3)
    .map((item: any, index: number) => normalizeStoryUnitSyncBeat(`setup_and_storyline_${index + 1}`, '伏笔/剧情线', item, 'story_unit_setup', 48))
    .filter(Boolean)
  const required = [...roleRequired, ...fallbackRequired]
  const planned = [...required, ...setupOptional]
  const checkedRequired = required.map(item => storyUnitSyncBeatMatch(item, chapterText))
  const checkedOptional = setupOptional.map(item => storyUnitSyncBeatMatch(item, chapterText))
  const delivered = [...checkedRequired, ...checkedOptional].filter(item => item.delivered)
  const missed = checkedRequired.filter(item => !item.delivered)
  const rushCandidates = [
    !/高潮|回报|兑现|打脸|结算/.test(role)
      ? normalizeStoryUnitSyncBeat('mini_climax_payoff', '后段小高潮', storyUnit.mini_climax_payoff, 'story_unit_rush', 58)
      : null,
    !/出单元|收束|转入/.test(role)
      ? normalizeStoryUnitSyncBeat('exit_hook', '出单元钩子', storyUnit.exit_hook, 'story_unit_rush', 58)
      : null,
  ].filter(Boolean)
  const rushedAhead = rushCandidates
    .map(item => storyUnitSyncBeatMatch(item, chapterText))
    .filter(item => item.delivered)
  const forbiddenTouched = asArray(storyUnit.forbidden_advance)
    .slice(0, 6)
    .map((item: any, index: number) => normalizeStoryUnitSyncBeat(`forbidden_advance_${index + 1}`, '禁抢跑', item, 'story_unit_forbidden', 42))
    .filter(Boolean)
    .map(item => storyUnitForbiddenTouched(item, chapterText))
    .filter(item => item.touched)

  const missedCount = missed.length
  const rushedCount = rushedAhead.length
  const forbiddenCount = forbiddenTouched.length
  const status = missedCount || rushedCount || forbiddenCount ? 'warn' : 'ok'
  const score = Math.max(0, Math.min(100, Math.round(100 - missedCount * 24 - rushedCount * 22 - forbiddenCount * 28)))
  const riskParts = [
    missedCount ? `单元漏写 ${missedCount}` : '',
    rushedCount ? `单元抢跑 ${rushedCount}` : '',
    forbiddenCount ? `禁抢跑 ${forbiddenCount}` : '',
  ].filter(Boolean)

  return {
    report_id: `story-unit-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '剧情单元 OK' : riskParts.join(' · '),
    summary: status === 'ok'
      ? '本章已完成当前剧情单元职责，且未明显提前消费后段小高潮或出单元钩子。'
      : `本章剧情单元职责存在 ${missedCount + rushedCount + forbiddenCount} 项风险。`,
    missed_count: missedCount,
    rushed_count: rushedCount,
    forbidden_count: forbiddenCount,
    story_unit: {
      title: storyUnit.title,
      chapter_range_label: storyUnit.chapter_range_label,
      current_chapter_role: storyUnit.current_chapter_role,
      unit_goal: storyUnit.unit_goal,
    },
    role_key: roleText,
    planned,
    delivered,
    missed,
    rushed_ahead: rushedAhead,
    forbidden_touched: forbiddenTouched,
    next_actions: status === 'ok'
      ? ['保持剧情单元任务书、正文生成和交稿复盘闭环。']
      : [
          '下一次修订优先补足当前剧情单元职责 missed 项，尤其是入口钩子、压力升级或本章回报。',
          '把 rushed_ahead 和 forbidden_touched 中的后段内容改成暗示、误导或延迟兑现，不要在本章提前解决。',
      ],
  }
}

const volumeBeatPattern = /小高潮|中高潮|卷末|高潮|爆点|转折|反转|大回报|强冲突|阶段收束|收束|破局|打脸|揭底|真相|压轴/

export function volumeBeatBriefFromContext(contextPackage: any, chapter: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || {}
  const brief = syncContextPackage?.pre_draft_brief || syncContextPackage?.preDraftBrief || {}
  return {
    explicit: target.volume_beat_brief || target.volumeBeatBrief || brief.volume_beat_brief || brief.volumeBeatBrief || {},
    nextBatch: nextBatchBriefFromContext(contextPackage, brief, chapter) || {},
    sceneCards: [
      ...asArray(target.scene_cards || target.sceneCards),
      ...asArray(brief.scene_briefs || brief.sceneBriefs),
    ],
  }
}

export function normalizeVolumeBeat(key: string, label: string, value: any, source = 'volume_beat') {
  const text = compactText(value, 180)
  return text ? { key, label, text, source } : null
}

export function uniqueVolumeBeats(items: any[]) {
  const seen = new Set<string>()
  const rows: any[] = []
  for (const item of items.filter(Boolean)) {
    const key = normalizedMatchText(item.text)
    if (!key || seen.has(key)) continue
    seen.add(key)
    rows.push(item)
  }
  return rows
}

export function volumeBeatMatch(beat: any, chapterText: string) {
  const match = anchorMatchScore(beat.text, chapterText)
  const threshold = beat.key === 'current_chapter_role' ? 44 : 70
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered: match.score >= threshold,
  }
}

export function buildVolumeBeatSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const beatContext = volumeBeatBriefFromContext(contextPackage, chapter)
  const currentRole = firstDefined(
    beatContext.explicit.current_chapter_role,
    beatContext.explicit.currentChapterRole,
    beatContext.explicit.chapter_role,
    beatContext.explicit.chapterRole,
    beatContext.nextBatch.current_chapter_role,
    beatContext.nextBatch.currentChapterRole,
  )
  const explicitBeats = [
    normalizeVolumeBeat('volume_goal', '卷级目标', beatContext.explicit.volume_goal || beatContext.explicit.volumeGoal || beatContext.explicit.goal),
    normalizeVolumeBeat('climax_promise', '高潮承诺', beatContext.explicit.climax_promise || beatContext.explicit.climaxPromise || beatContext.explicit.climax),
    ...asArray(beatContext.explicit.required_beats || beatContext.explicit.requiredBeats).map((item: any, index: number) => normalizeVolumeBeat(`required_beat_${index + 1}`, '爆点动作', item)),
  ].filter(Boolean)
  const hasExplicitVolumeBeat = explicitBeats.length > 0 || volumeBeatPattern.test(currentRole)
  const sceneBeats = beatContext.sceneCards.flatMap((card: any, index: number) => {
    const candidates = [
      normalizeVolumeBeat(`turning_point_${index + 1}`, '转折点', card?.turning_point || card?.turningPoint || card?.turn || card?.reversal, 'scene_card'),
      normalizeVolumeBeat(`reader_payoff_${index + 1}`, '读者回报', card?.reader_payoff || card?.readerPayoff || card?.payoff || card?.reader_reward || card?.readerReward, 'scene_card'),
      normalizeVolumeBeat(`ending_hook_${index + 1}`, '钩子推进', card?.ending_hook_seed || card?.endingHookSeed || card?.ending_hook || card?.endingHook, 'scene_card'),
    ].filter(Boolean)
    return hasExplicitVolumeBeat ? candidates : candidates.filter(item => volumeBeatPattern.test(item.text))
  })
  const planned = uniqueVolumeBeats([
    volumeBeatPattern.test(currentRole) ? normalizeVolumeBeat('current_chapter_role', '本章爆点职责', currentRole) : null,
    ...explicitBeats,
    ...sceneBeats,
  ])
  const checked = planned.map(item => volumeBeatMatch(item, chapterText))
  const delivered = checked.filter(item => item.delivered)
  const missed = checked.filter(item => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    planned.length ? (delivered.length / planned.length) * 100 : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `volume-beat-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: planned.length === 0 ? '爆点未计划' : status === 'ok' ? '爆点 OK' : `爆点漏兑现 ${missedCount}`,
    summary: planned.length === 0
      ? '本章没有明确卷级高潮或爆点承诺。'
      : status === 'ok'
        ? '本章卷级爆点、转折和读者回报已基本兑现。'
        : `本章有 ${missedCount} 项卷级爆点或小高潮承诺未在正文中充分兑现。`,
    missed_count: missedCount,
    planned,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持卷级爆点预算、章节任务书和正文兑现闭环。']
      : [
          '下一次修订优先补足卷级爆点 missed 项，把小高潮/中高潮/卷末爆点写成可见行动、反转和回报。',
          '如果正文只铺信息没有兑现转折，优先补现场冲突、选择代价、反制结果和章末升级。',
        ],
  }
}

export function millionWordRunwayFromContext(contextPackage: any = {}, preDraftBrief: any = null) {
  const chapterTarget = contextPackage?.chapter_target || {}
  const brief = preDraftBrief || contextPackage?.pre_draft_brief || contextPackage?.preDraftBrief || {}
  return chapterTarget.million_word_runway
    || chapterTarget.millionWordRunway
    || brief.million_word_runway
    || brief.millionWordRunway
    || contextPackage?.million_word_runway
    || contextPackage?.millionWordRunway
    || null
}

export function runwayFromContext(contextPackage: any, chapter: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  return millionWordRunwayFromContext(syncContextPackage) || {}
}

export function normalizeRunwayQuestion(item: any, index: number) {
  const text = compactText(item?.answer || item?.text || item?.summary || item?.value || '', 180)
  if (!text) return null
  return {
    key: String(item?.key || `question_${index + 1}`),
    label: compactText(item?.label || item?.title || `本章四问 ${index + 1}`, 60),
    text,
  }
}

export function normalizeRunwayFuel(item: any, index: number) {
  const text = compactText(typeof item === 'string' ? item : item?.text || item?.name || item?.title || item?.summary || item?.description || '', 180)
  return text ? { key: `reader_fuel_${index + 1}`, text } : null
}

export function runwayBeatMatch(beat: any, chapterText: string) {
  const match = anchorMatchScore(beat.text, chapterText)
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered: match.score >= 44,
  }
}

export function runwayRedlineTouched(redLines: any[], chapterText: string) {
  const normalizedChapterText = normalizedMatchText(chapterText)
  return redLines
    .map((item: any) => ({ text: compactText(typeof item === 'string' ? item : item?.text || item?.name || item?.title || item?.summary || item?.description || '', 180) }))
    .filter((item: any) => item.text && normalizedChapterText.includes(normalizedMatchText(item.text)))
}

export function buildRunwaySyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const runway = runwayFromContext(contextPackage, chapter)
  const fourQuestions = [
    ...asArray(runway?.fourQuestions),
    ...asArray(runway?.four_questions),
  ]
    .map(normalizeRunwayQuestion)
    .filter(Boolean)
  const readerFuel = [
    ...asArray(runway?.readerFuel),
    ...asArray(runway?.reader_fuel),
  ]
    .map(normalizeRunwayFuel)
    .filter(Boolean)
  const redLines = [
    ...asArray(runway?.redLines),
    ...asArray(runway?.red_lines),
  ]

  const questionChecks = fourQuestions.map(item => runwayBeatMatch(item, chapterText))
  const fuelChecks = readerFuel.map(item => runwayBeatMatch(item, chapterText))
  const fourQuestionDelivered = questionChecks.filter(item => item.delivered)
  const fourQuestionMissed = questionChecks.filter(item => !item.delivered)
  const readerFuelDelivered = fuelChecks.filter(item => item.delivered)
  const readerFuelMissed = fuelChecks.filter(item => !item.delivered)
  const redlineTouched = runwayRedlineTouched(redLines, chapterText)
  const riskCount = fourQuestionMissed.length + readerFuelMissed.length + redlineTouched.length
  const plannedCount = fourQuestions.length + readerFuel.length
  const deliveredCount = fourQuestionDelivered.length + readerFuelDelivered.length
  const score = Math.max(0, Math.min(100, Math.round(
    plannedCount
      ? (deliveredCount / plannedCount) * 100 - redlineTouched.length * 22
      : redlineTouched.length ? 62 - redlineTouched.length * 12 : 82,
  )))
  const status = riskCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `runway-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '航线 OK' : `航线风险 ${riskCount}`,
    summary: status === 'ok'
      ? '本章已基本兑现百万字航线的本章四问、读者燃料和红线约束。'
      : `百万字航线存在 ${riskCount} 项兑现风险。`,
    risk_count: riskCount,
    four_questions: questionChecks,
    four_question_delivered: fourQuestionDelivered,
    four_question_missed: fourQuestionMissed,
    reader_fuel: fuelChecks,
    reader_fuel_delivered: readerFuelDelivered,
    reader_fuel_missed: readerFuelMissed,
    redline_touched: redlineTouched,
    next_actions: status === 'ok'
      ? ['保持百万字航线：本章四问、读者燃料、禁用红线要继续进入开写任务书和交稿复盘。']
      : [
          '下一次修订优先补足 four_question_missed 和 reader_fuel_missed，避免章节只完成事件但不服务长期追读。',
          '如果 redline_touched 有内容，必须改掉提前揭露、越级回收或破坏长期核心的段落。',
        ],
  }
}

