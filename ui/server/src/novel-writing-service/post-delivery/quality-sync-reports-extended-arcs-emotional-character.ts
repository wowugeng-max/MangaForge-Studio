import {
  asArray,
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
  characterArcPriority,
  normalizeCharacterArcDimension,
} from '../../novel-writing/character-arc-basics'
import {
  compactBriefText,
} from '../quality/text-utils'
import {
  firstCompactText,
  firstSceneCardText,
} from '../../novel-writing/story-drive-basics'
import {
  normalizeEmotionalArcCheck,
} from '../../novel-writing/emotional-arc-basics'
import {
  normalizePayoffReverseDesignCheck,
  normalizePayoffTierRulesCheck,
} from '../../novel-writing/payoff-design-basics'
import {
  scanDownwardSafetyRisks,
  scanOppressionPurposeRisks,
  scanPayoffDensityRisks,
  scanPayoffEscalationRisks,
  scanTrumpCardEffectRisks,
} from '../../novel-writing/emotional-payoff-scans'
import {
  scanEmotionalStasisRisks,
} from '../../novel-writing/prose-craft-scans'
import {
  contextWithChapterRawPreDraftForSync,
} from './quality-sync-reports-benchmark'
import {
  emotionalArcContractForSync,
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

