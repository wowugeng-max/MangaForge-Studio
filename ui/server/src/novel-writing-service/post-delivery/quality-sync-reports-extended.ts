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
  buildExpectationBeforePayoffCheck,
  buildExpectationThresholdNextOpenLoopCheck,
  expectationThreeLinesArray,
  expectationThresholdArray,
  expectationThresholdPriority,
  normalizeExpectationThresholdCheck,
} from '../../novel-writing/expectation-threshold-basics'
import {
  buildFemaleAudienceContract,
  buildGenrePositioningContract,
} from '../quality/audience-quality-contracts'
import {
  buildFemaleAudienceDeterministicCheck,
  femaleAudiencePriority,
  normalizeFemaleAbuseDosageCheck,
  normalizeFemaleCopyPromiseCheck,
  normalizeFemaleCorePrinciplesCheck,
  normalizeFemaleLongformGenreCheck,
  normalizeFemalePlatformFitCheck,
  normalizeFemaleQualityCheck,
  normalizeFemaleReaderNeedCheck,
  normalizeFemaleRomanceAxisCheck,
} from '../../novel-writing/female-audience-basics'
import {
  buildGenrePositioningDeterministicCheck,
  genrePositioningPriority,
  normalizeGenreCoreHookCheck,
  normalizeGenreFormulaCheck,
  normalizeGenreLabelCheck,
  normalizeGenreLongboardFocusCheck,
  normalizeGenrePsychologyCheck,
  normalizeGoldfingerFitCheck,
  normalizeMicroInnovationCheck,
  normalizeMustHaveSceneCheck,
  normalizePlatformFitCheck,
} from '../../novel-writing/genre-positioning-basics'
import {
  buildInformationFlowInfodumpCheck,
  buildInformationFlowNextObjectiveCheck,
  buildInformationFlowTransitionCompressionCheck,
  informationFlowPriority,
  normalizeInformationFlowCheck,
} from '../../novel-writing/information-flow-basics'
import {
  buildOhStoryPlotSpecialTopicsContract,
} from '../../routes/novel-plot-special-topics'
import {
  buildPlotDynamicsContract,
  buildStoryPowerContract,
} from '../quality/continuity-dialogue-contracts'
import {
  buildPlotDynamicsDeterministicCheck,
  normalizeClimaxFormulaCheck,
  normalizeLineStaggerRulesCheck,
  normalizePlotAbOutlineCheck,
  normalizePlotDriveModeRulesCheck,
  normalizePlotLoopCheck,
  normalizePlotScenePurposeCheck,
  plotDynamicsPriority,
} from '../../novel-writing/plot-dynamics-basics'
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
  getContextContract,
} from '../context/context-contract'
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
  normalizeStoryLoopBeat,
  normalizeStoryLoopMapTransitionCheck,
  normalizeStoryLoopNestedLoopCheck,
  storyLoopPriority,
} from '../../novel-writing/story-loop-basics'
import {
  normalizeStoryPowerCheck,
  storyPowerPriority,
} from '../../novel-writing/story-power-basics'
import {
  normalizeStoryUnitSyncBeat,
  storyUnitForbiddenTouched,
  storyUnitSyncBeatMatch,
} from '../../novel-writing/story-unit-basics'
import {
  scanDialogueInfodumpRisks,
} from '../../novel-writing/dialogue-infodump'
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
  scanExpectationVacuumRisks,
} from '../../novel-writing/progression-scans'
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

export function normalizeTargetReaderAttractionCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const text = String(chapterText || '')
  const attractionSignals = countTargetReaderSignals(text, [
    /超人蛮力|规则反制|信息差/,
    /门外水声|旧钥匙缺口|可见线索/,
    /可见回报|回报|章尾期待|下一章/,
    /客户.*反应|退让|结果/,
  ])
  const deliveredItems = scored.filter(item => item.match.score >= 34).length
  const delivered = deliveredItems >= Math.max(1, Math.ceil(planned.length * 0.45)) || attractionSignals >= 2
  return {
    key: 'chapter_attractions',
    label: '本章吸引点',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.max(18, attractionSignals * 18),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      attractionSignals >= 2 ? '本章吸引点代理信号可见' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 34).slice(0, 8),
    issue: delivered ? '' : '本章吸引点没有写成可复述的场面、线索、反制结果或章尾期待。',
    repair_instruction: delivered ? '' : '补本章吸引点：把卖点落成具体场景，让读者看见线索、反应、结果和章尾问题。',
  }
}

export function normalizeTargetReaderGenreVitalityCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const sampleSignals = countTargetReaderSignals(text, [/当前.*样本|目标平台样本|近期样本|样本验证|scan|analyze/])
  const stageSignals = countTargetReaderSignals(text, [/新鲜期|成熟期|审美疲劳期/])
  const actionSignals = countTargetReaderSignals(text, [/边界期待|微创新|新切入点|保守满足|当前事实/])
  const historicalAssumption = /曾经很火|不用.*样本验证|不需要.*样本|不用.*判断.*新鲜期|不用.*判断.*成熟期|历史经验.*当前事实|历史热度.*当前事实/.test(text)
  const delivered = !historicalAssumption && sampleSignals >= 1 && stageSignals >= 1 && actionSignals >= 1
  return {
    key: 'genre_vitality_rules',
    label: '题材生命力',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(16, (sampleSignals + stageSignals + actionSignals) * 18 - (historicalAssumption ? 18 : 0)),
    evidence: uniqueBriefStrings([
      sampleSignals ? '当前目标平台样本验证可见' : '',
      stageSignals ? '题材阶段判断可见' : '',
      actionSignals ? '阶段对应写法可见' : '',
      historicalAssumption ? '用历史热度或否定样本验证替代当前事实' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !sampleSignals ? '缺当前目标平台样本验证' : '',
      !stageSignals ? '缺新鲜期/成熟期/审美疲劳期判断' : '',
      !actionSignals ? '缺阶段对应写法' : '',
      historicalAssumption ? '不能把历史经验当作当前事实' : '',
    ], 8),
    issue: delivered ? '' : '题材生命力没有用当前目标平台样本和阶段判断校准。',
    repair_instruction: delivered ? '' : '补题材生命力：用当前目标平台样本验证题材阶段，明确新鲜期/成熟期/审美疲劳期下本章该稳边界还是给新切入点。',
  }
}

export function normalizeTargetReaderPlatformFitCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const crossSiteSignals = countTargetReaderSignals(text, [/不能用A网站.*B网站|A网站.*样本.*B网站|不同平台|同一题材.*不同平台|没有把.*样本.*硬套|不.*样本.*硬套/])
  const targetPlatformSignals = countTargetReaderSignals(text, [/目标平台|平台.*校准|读者期待|节奏|雷点/])
  const platformTasteSignals = countTargetReaderSignals(text, [/番茄.*强情绪|强情绪.*番茄|爽感直给|起点.*慢节奏|慢节奏.*起点|正常剧情推进/])
  const copiedPlatform = /直接.*A网站.*套.*B网站|把A网站.*套到B网站|不用看.*番茄.*起点|不需要看.*平台.*差异/.test(text)
  const delivered = !copiedPlatform && targetPlatformSignals >= 1 && platformTasteSignals >= 1 && crossSiteSignals >= 1
  return {
    key: 'platform_fit_rules',
    label: '平台适配',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(16, (crossSiteSignals + targetPlatformSignals + platformTasteSignals) * 18 - (copiedPlatform ? 18 : 0)),
    evidence: uniqueBriefStrings([
      crossSiteSignals ? '跨网站差异意识可见' : '',
      targetPlatformSignals ? '目标平台样本校准可见' : '',
      platformTasteSignals ? '平台口味差异可见' : '',
      copiedPlatform ? '直接套用其他平台样本' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !crossSiteSignals ? '缺跨网站样本不可直接套用的约束' : '',
      !targetPlatformSignals ? '缺目标平台样本校准' : '',
      !platformTasteSignals ? '缺番茄/起点等平台口味差异' : '',
      copiedPlatform ? '不能把A网站样本硬套到B网站' : '',
    ], 8),
    issue: delivered ? '' : '平台适配没有落到目标平台样本、节奏、读者期待或雷点校准。',
    repair_instruction: delivered ? '' : '补平台适配：用目标平台样本校准写法，明确番茄强情绪/爽感直给、起点慢节奏代入等差异，禁止A站样本硬套B站。',
  }
}

export function normalizeTargetReaderBoundaryFitCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const boundarySignals = countTargetReaderSignals(text, [/边界感|题材边界|成熟题材|创新题材|混搭/])
  const supportSignals = countTargetReaderSignals(text, [/素材、知识储备和篇幅|素材.*知识储备.*篇幅|能支撑|支撑所选题材|降低篇幅|创新数量/])
  const unsupported = /素材.*不够|知识储备.*不够|篇幅.*不够|硬写混搭|边界.*漂移/.test(text)
    || (/无法支撑/.test(text) && !/没有.*无法支撑|避免.*无法支撑|不.*无法支撑/.test(text))
  const delivered = !unsupported && boundarySignals >= 1 && supportSignals >= 1
  return {
    key: 'boundary_fit_rules',
    label: '题材边界',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(16, (boundarySignals + supportSignals) * 22 - (unsupported ? 18 : 0)),
    evidence: uniqueBriefStrings([
      boundarySignals ? '题材边界意识可见' : '',
      supportSignals ? '素材/知识/篇幅支撑可见' : '',
      unsupported ? '明知素材/知识/篇幅不支撑仍硬写' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !boundarySignals ? '缺题材边界感确认' : '',
      !supportSignals ? '缺素材、知识储备和篇幅支撑判断' : '',
      unsupported ? '题材混搭或创新超出当前支撑能力' : '',
    ], 8),
    issue: delivered ? '' : '题材边界没有确认素材、知识储备和篇幅是否支撑。',
    repair_instruction: delivered ? '' : '补题材边界：压回当前素材、知识储备和篇幅能支撑的范围；创新题材降低篇幅和创新数量，成熟题材稳住边界期待。',
  }
}

export function normalizeTargetReaderTitleBlurbAlignmentCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const titleSignals = countTargetReaderSignals(text, [/书名.*3秒|3秒.*抓人|书名.*核心卖点|书名.*钩子/])
  const blurbSignals = countTargetReaderSignals(text, [/简介.*安全感.*钩子|安全感.*钩子|主角会赢|悬念/])
  const alignmentSignals = countTargetReaderSignals(text, [/书名简介内容.*三位一体|书名.*简介.*正文|货板一致|货不对板/])
  const mismatch = /书名、简介和正文.*各写各的|各写各的|货不对板.*没关系|卖点.*不一致/.test(text)
  const delivered = !mismatch && titleSignals >= 1 && blurbSignals >= 1 && alignmentSignals >= 1
  return {
    key: 'title_blurb_alignment_rules',
    label: '书名简介一致',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(16, (titleSignals + blurbSignals + alignmentSignals) * 18 - (mismatch ? 18 : 0)),
    evidence: uniqueBriefStrings([
      titleSignals ? '书名3秒钩子可见' : '',
      blurbSignals ? '简介安全感+钩子可见' : '',
      alignmentSignals ? '书名简介内容一致性可见' : '',
      mismatch ? '书名简介正文货不对板' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !titleSignals ? '缺书名3秒抓人/核心卖点信号' : '',
      !blurbSignals ? '缺简介安全感+钩子信号' : '',
      !alignmentSignals ? '缺书名简介内容三位一体' : '',
      mismatch ? '存在货不对板风险' : '',
    ], 8),
    issue: delivered ? '' : '书名、简介和正文承诺没有证明同一核心卖点。',
    repair_instruction: delivered ? '' : '补书名简介内容一致：书名3秒传卖点，简介给安全感+钩子，正文兑现同一件事，修掉货不对板。',
  }
}

export function normalizeTargetReaderImmersionPlasticityCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const immersionSignals = countTargetReaderSignals(text, [/代入感|读者代入|投射进主角/])
  const cohesionSignals = countTargetReaderSignals(text, [/世界观自洽|画风统一|同一画风|规则.*自洽|像真实存在/])
  const plasticitySignals = countTargetReaderSignals(text, [/塑料感|仙侠搞科研|画风撕裂|不仙|不侠/])
  const rupture = (/塑料感.*明显|画风撕裂|仙侠世界.*搞科研|仙侠.*搞科研|武侠不侠/.test(text))
    && !/没有.*塑料感|无塑料感|避免.*塑料感|没有.*仙侠.*搞科研|避免.*仙侠.*搞科研|画风统一/.test(text)
  const delivered = !rupture && immersionSignals >= 1 && cohesionSignals >= 1 && plasticitySignals >= 1
  return {
    key: 'immersion_plasticity_rules',
    label: '代入与塑料感',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(16, (immersionSignals + cohesionSignals + plasticitySignals) * 18 - (rupture ? 18 : 0)),
    evidence: uniqueBriefStrings([
      immersionSignals ? '代入感信号可见' : '',
      cohesionSignals ? '世界观自洽/画风统一可见' : '',
      plasticitySignals ? '塑料感防线可见' : '',
      rupture ? '画风撕裂或塑料感明显' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !immersionSignals ? '缺代入感锚点' : '',
      !cohesionSignals ? '缺世界观自洽/画风统一' : '',
      !plasticitySignals ? '缺塑料感风险检查' : '',
      rupture ? '存在仙侠搞科研式画风撕裂' : '',
    ], 8),
    issue: delivered ? '' : '代入感与塑料感没有被校准，世界规则或画风可能撕裂。',
    repair_instruction: delivered ? '' : '补代入与去塑料感：让主角行动、世界规则和读者期待同向，保持世界观自洽和画风统一，删掉撕裂设定。',
  }
}

export function normalizeTargetReaderGoldfingerLifeFitCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const lifeFitSignals = countTargetReaderSignals(text, [/金手指.*生活\/职业|金手指.*生活.*职业|生活\/职业.*息息相关|职业.*息息相关|当下生活处境/])
  const mainlineSignals = countTargetReaderSignals(text, [/服务主线|主线.*有关|技能.*升级|一个技能.*不同效果|职业技能|资源变化/])
  const unrelated = (/和生活职业无关|职业无关|生活无关|硬贴外挂|医生.*隐身|频繁开新金手指/.test(text))
    && !/不是硬贴外挂|不是.*硬贴|不.*硬贴|避免.*硬贴|不要.*硬贴/.test(text)
  const delivered = !unrelated && lifeFitSignals >= 1 && mainlineSignals >= 1
  return {
    key: 'goldfinger_life_fit_rules',
    label: '金手指生活关联',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(16, (lifeFitSignals + mainlineSignals) * 22 - (unrelated ? 18 : 0)),
    evidence: uniqueBriefStrings([
      lifeFitSignals ? '金手指与生活/职业关联可见' : '',
      mainlineSignals ? '金手指服务主线可见' : '',
      unrelated ? '金手指与主角生活/职业脱节' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !lifeFitSignals ? '缺金手指与主角生活/职业关联' : '',
      !mainlineSignals ? '缺金手指服务主线或升级反馈' : '',
      unrelated ? '金手指硬贴且脱离人物处境' : '',
    ], 8),
    issue: delivered ? '' : '金手指没有证明与主角生活/职业和主线处境紧密相关。',
    repair_instruction: delivered ? '' : '补金手指生活关联：把能力绑定主角职业、生活困境、主线问题和可升级反馈，删除硬贴外挂或无关新能力。',
  }
}

export function normalizeTargetReaderCommercialExpressionCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const ratioSignals = countTargetReaderSignals(text, [/私人表达.*5%|没有超过5%|不超过全篇5%/])
  const serviceSignals = countTargetReaderSignals(text, [/服务核心卖点|服务.*主线|不能独立于主线|不得独立于主线|没有.*作者自己的观点/])
  const overExpressed = /私人表达占.*很多|私人表达.*很多篇幅|独立于主线卖点|作者自己的观点.*很多|打断叙事节奏/.test(text)
  const delivered = !overExpressed && ratioSignals >= 1 && serviceSignals >= 1
  return {
    key: 'commercial_expression_rules',
    label: '商业表达',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(16, (ratioSignals + serviceSignals) * 22 - (overExpressed ? 18 : 0)),
    evidence: uniqueBriefStrings([
      ratioSignals ? '私人表达占比控制可见' : '',
      serviceSignals ? '私人表达服务核心卖点/主线可见' : '',
      overExpressed ? '私人表达过量或脱离主线' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !ratioSignals ? '缺私人表达不超过5%的占比约束' : '',
      !serviceSignals ? '缺私人表达服务核心卖点/主线约束' : '',
      overExpressed ? '私人表达过量或独立于主线' : '',
    ], 8),
    issue: delivered ? '' : '商业表达没有证明私人表达受控并服务核心卖点。',
    repair_instruction: delivered ? '' : '补商业表达控制：私人表达不超过5%，且必须服务核心卖点和主线剧情；删掉独立观点输出。',
  }
}

export function normalizeTargetReaderValidationCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const profileSignals = countTargetReaderSignals(text, [/目标读者|男频|女频|番茄|追更|碎片/, /爽感|掌控感|快速反馈/])
  const desireSignals = countTargetReaderSignals(text, [/规则反制|信息差|不公平|爽点|即时反馈/])
  const payoffSignals = countTargetReaderSignals(text, [/回报|结果|反应|章尾期待|可见线索|下一章/])
  const delivered = profileSignals >= 1 && desireSignals >= 1 && payoffSignals >= 1
  return {
    key: 'validation_questions',
    label: '三问验证',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(18, (profileSignals + desireSignals + payoffSignals) * 18),
    evidence: uniqueBriefStrings([
      profileSignals ? '写给谁可见' : '',
      desireSignals ? '想看什么可见' : '',
      payoffSignals ? '本章回报可见' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !profileSignals ? '缺写给谁' : '',
      !desireSignals ? '缺目标读者想看什么' : '',
      !payoffSignals ? '缺本章可感知回报' : '',
    ], 8),
    issue: delivered ? '' : '目标读者三问缺少正文证据：写给谁、想看什么、本章给了什么回报。',
    repair_instruction: delivered ? '' : '补三问验证：明确读者画像、读者欲望和本章可感知回报，每项都必须有正文证据。',
  }
}

export function normalizeTargetReaderCorrectionMethodCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const correctionSignals = countTargetReaderSignals(text, [
    /删掉|删除|没有停在|不再停在/,
    /自嗨|设定展示|展示设定/,
    /动作|反应|结果/,
    /章尾期待|可感知回报|卖点/,
  ])
  const selfIndulgent = /作者觉得|世界观很有意思|主要展示设定|只是介绍设定/.test(text) && !/动作|反应|结果|回报/.test(text)
  const delivered = !selfIndulgent && correctionSignals >= 3
  return {
    key: 'correction_methods',
    label: '修正方法',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(16, correctionSignals * 18),
    evidence: uniqueBriefStrings([
      correctionSignals >= 3 ? '修正方法已转成正文执行信号' : '',
      selfIndulgent ? '仍停留在作者自嗨/设定展示' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : ['缺少把设定展示改成动作、反应、结果和章尾期待的执行证据'],
    issue: delivered ? '' : '修正方法没有落地，正文仍可能停在作者自嗨设定展示。',
    repair_instruction: delivered ? '' : '按修正方法重写：删掉作者自嗨设定展示，把卖点落成动作、反应、结果和章尾期待。',
  }
}

export function buildTargetReaderDeterministicCheck(chapterText: string) {
  const text = String(chapterText || '')
  const risks = [
    /读者会喜欢|大家会喜欢/.test(text) ? {
      key: 'hollow_reader_claim',
      label: '空泛读者判断',
      evidence: '正文用“读者会喜欢/大家会喜欢”替代目标读者证据。',
      fix: '改成具体读者画像、想看内容和可感知回报。',
    } : null,
    /作者觉得|我觉得|世界观很有意思/.test(text) ? {
      key: 'author_self_indulgence',
      label: '作者自嗨',
      evidence: '正文站在作者角度评价设定有趣，没有证明读者为什么追。',
      fix: '把作者判断改成读者能看见的冲突、反制、收益和期待。',
    } : null,
    /主要展示设定|没有明显回报|没有可感知回报|只是介绍设定/.test(text) ? {
      key: 'no_reader_payoff',
      label: '缺可感知回报',
      evidence: '正文直接承认本章只展示设定或没有明显回报。',
      fix: '补动作结果、角色反应、线索兑现和章尾期待。',
    } : null,
  ].filter(Boolean)
  if (!risks.length) return null
  return {
    key: 'target_reader_forbidden',
    label: '目标读者硬伤',
    text: '目标读者检查不得用空泛喜欢、作者自嗨或设定展示替代正文回报。',
    expected: '目标读者检查不得用空泛喜欢、作者自嗨或设定展示替代正文回报。',
    score: Math.max(0, 100 - risks.length * 28),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项目标读者确定性风险。`,
    repair_instruction: '按 oh-story 自嗨判定法修复：写清给谁看、读者想看什么、本章给了什么可感知回报。',
  }
}

export function targetReaderPriority(missed: any[]) {
  if (missed.some(item => item.key === 'target_reader_forbidden')) return '优先清目标读者硬伤'
  if (missed.some(item => item.key === 'genre_vitality_rules')) return '优先补题材生命力样本验证'
  if (missed.some(item => item.key === 'platform_fit_rules')) return '优先校准目标平台写法'
  if (missed.some(item => item.key === 'title_blurb_alignment_rules')) return '优先修书名简介正文一致'
  if (missed.some(item => item.key === 'boundary_fit_rules')) return '优先压回题材边界'
  if (missed.some(item => item.key === 'immersion_plasticity_rules')) return '优先修代入感和塑料感'
  if (missed.some(item => item.key === 'goldfinger_life_fit_rules')) return '优先修金手指生活关联'
  if (missed.some(item => item.key === 'commercial_expression_rules')) return '优先收束私人表达'
  if (missed.some(item => item.key === 'emotional_gap_analysis')) return '优先补情绪缺口'
  if (missed.some(item => item.key === 'reader_desires')) return '优先补读者欲望'
  if (missed.some(item => item.key === 'chapter_attractions')) return '优先补本章吸引点'
  if (missed.some(item => item.key === 'validation_questions')) return '优先补目标读者三问'
  if (missed.some(item => item.key === 'reader_profile')) return '优先补读者画像'
  if (missed.some(item => item.key === 'correction_methods')) return '优先落修正方法'
  return ''
}

export function buildTargetReaderSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = targetReaderContractForSync(project, contextPackage, chapter)
  const checks = [
    normalizeTargetReaderProfileCheck(contract.reader_profile || contract.readerProfile, chapterText),
    normalizeTargetReaderDesireCheck(contract.reader_desires || contract.readerDesires || contract.desires, chapterText),
    normalizeTargetReaderEmotionalGapCheck(contract.emotional_gap_analysis || contract.emotionalGapAnalysis, chapterText),
    normalizeTargetReaderAttractionCheck(contract.chapter_attractions || contract.chapterAttractions || contract.attractions, chapterText),
    normalizeTargetReaderGenreVitalityCheck(contract.genre_vitality_rules || contract.genreVitalityRules || contract.genre_lifecycle_rules || contract.genreLifecycleRules, chapterText),
    normalizeTargetReaderPlatformFitCheck(contract.platform_fit_rules || contract.platformFitRules || contract.platform_adaptation_rules || contract.platformAdaptationRules, chapterText),
    normalizeTargetReaderBoundaryFitCheck(contract.boundary_fit_rules || contract.boundaryFitRules || contract.genre_boundary_rules || contract.genreBoundaryRules, chapterText),
    normalizeTargetReaderTitleBlurbAlignmentCheck(contract.title_blurb_alignment_rules || contract.titleBlurbAlignmentRules || contract.copy_alignment_rules || contract.copyAlignmentRules, chapterText),
    normalizeTargetReaderImmersionPlasticityCheck(contract.immersion_plasticity_rules || contract.immersionPlasticityRules || contract.immersion_rules || contract.immersionRules, chapterText),
    normalizeTargetReaderGoldfingerLifeFitCheck(contract.goldfinger_life_fit_rules || contract.goldfingerLifeFitRules || contract.goldfinger_fit_rules || contract.goldfingerFitRules, chapterText),
    normalizeTargetReaderCommercialExpressionCheck(contract.commercial_expression_rules || contract.commercialExpressionRules || contract.private_expression_rules || contract.privateExpressionRules, chapterText),
    normalizeTargetReaderValidationCheck(contract.validation_questions || contract.validationQuestions, chapterText),
    normalizeTargetReaderCorrectionMethodCheck(contract.correction_methods || contract.correctionMethods, chapterText),
    buildTargetReaderDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = targetReaderPriority(missed)

  return {
    report_id: `target-reader-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '目标读者未配置' : status === 'ok' ? '目标读者 OK' : `目标读者缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 target_reader_contract，建议补充读者画像、读者欲望、题材生命力、平台适配、题材边界、书名简介内容一致、本章吸引点、三问验证和修正方法。'
      : status === 'ok'
        ? '正文已基本兑现目标读者画像、读者欲望、情绪缺口、题材生命力、平台适配、题材边界、书名简介一致、代入感、金手指生活关联、商业表达、本章吸引点、三问验证和修正方法。'
        : `正文有 ${missedCount} 项目标读者缺口，${priorityRepair || '优先补目标读者三问和可感知回报'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持目标读者兑现：写给谁、想看什么、本章回报和章尾期待都要有正文证据。']
      : [
          '下一章必须补目标读者：先写清本章给谁看、目标读者想看什么，再把卖点写成现场行动。',
          '补 genre-readers 适配：用当前目标平台样本判断题材生命力，校准平台写法、题材边界、代入感和雷点。',
          '修书名简介内容三位一体：书名3秒传核心卖点，简介给安全感+钩子，正文兑现同一承诺，避免货不对板。',
          '校准金手指和商业表达：金手指必须贴住主角生活/职业并服务主线，私人表达不超过5%且服务核心卖点。',
          '补情绪缺口：从核心痛苦、深层情结、高频情绪关键词和未满足需求里挑一项，写成角色当下压力和读者可见回报。',
          '把规则反制、信息差、不公平移除或升级反馈落成可感知回报，避免只说读者会喜欢或只展示设定。',
        ],
  }
}

export function genrePositioningContractForSync(project: any, contextPackage: any, chapter: any = {}) {
  return buildGenrePositioningContract(project, contextWithChapterRawPreDraftForSync(contextPackage, chapter))
}

export function buildGenrePositioningSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = genrePositioningContractForSync(project, contextPackage, chapter)
  const checks = [
    normalizeGenreLabelCheck(contract.genre_label || contract.genreLabel, chapterText),
    normalizeGenrePsychologyCheck(contract.reader_psychology || contract.readerPsychology, chapterText),
    normalizeGenreFormulaCheck(contract.genre_formula || contract.genreFormula, chapterText),
    normalizeGenreCoreHookCheck(contract.core_hook_rules || contract.coreHookRules, chapterText),
    normalizeGoldfingerFitCheck(contract.goldfinger_fit_rules || contract.goldfingerFitRules, chapterText),
    normalizeMustHaveSceneCheck(contract.must_have_scenes || contract.mustHaveScenes, chapterText),
    normalizePlatformFitCheck(contract.platform_fit_rules || contract.platformFitRules, chapterText),
    normalizeMicroInnovationCheck(contract.micro_innovation_rules || contract.microInnovationRules, chapterText),
    normalizeGenreLongboardFocusCheck(contract.longboard_focus_rules || contract.longboardFocusRules, chapterText),
    buildGenrePositioningDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = genrePositioningPriority(missed)

  return {
    report_id: `genre-positioning-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '题材定位未配置' : status === 'ok' ? '题材定位 OK' : `题材定位缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 genre_positioning_contract，建议补充题材标签、读者心理、类型公式、核心梗、金手指贴合、必备场景、平台适配、微创新边界和题材长板。'
      : status === 'ok'
        ? '正文已基本兑现题材标签、读者心理、类型公式、核心梗、金手指贴合、必备场景、平台适配、微创新边界和题材长板。'
        : `正文有 ${missedCount} 项题材定位缺口，${priorityRepair || '优先统一题材承诺和正文桥段'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持题材定位：题材标签、核心梗、金手指、必备场景、题材长板和平台回报必须持续同一承诺。']
      : [
          '下一章必须补题材定位：先统一题材标签、核心梗和金手指贴合，再把必备场景写成正文桥段。',
          '拉题材长板：优先强化核心卖点、目标情绪和最高频爽点，删除会稀释核心卖点的补短板支线。',
          '避免挂羊头卖狗肉：书名简介承诺什么，正文就必须用场景、能力、订单结果和平台回报兑现什么。',
      ],
  }
}

export function plotSpecialTopicsContractForSync(project: any, contextPackage: any, chapter: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const writingBible = syncContextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const explicit = getContextContract(syncContextPackage, 'plot_special_topics_contract')
    || writingBible?.plot_special_topics_contract
    || writingBible?.plotSpecialTopicsContract
    || project?.reference_config?.plot_special_topics_contract
    || project?.reference_config?.plotSpecialTopicsContract
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) return explicit
  return buildOhStoryPlotSpecialTopicsContract(project, syncContextPackage, chapter)
}

export function plotSpecialTopicsArray(values: any) {
  return asArray(values).map((item: any) => compactBriefText(item)).filter(Boolean)
}

export function countPlotSpecialTopicsSignals(chapterText: string, patterns: RegExp[]) {
  const text = String(chapterText || '')
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0)
}

export function normalizePlotSpecialTopicsExecutionCheck(
  key: string,
  label: string,
  values: any,
  chapterText: string,
  patterns: RegExp[],
  issue: string,
  repairInstruction: string,
  options: { minSignals?: number } = {},
) {
  const planned = plotSpecialTopicsArray(values)
  if (!planned.length) return null
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const deliveredItems = scored.filter(item => item.match.score >= 28).length
  const signalCount = countPlotSpecialTopicsSignals(chapterText, patterns)
  const minSignals = Number(options.minSignals || 2)
  const delivered = deliveredItems >= 1 || signalCount >= minSignals
  return {
    key,
    label,
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100), signalCount * 24) : Math.max(16, signalCount * 18),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      signalCount >= minSignals ? `${label}代理信号可见` : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    matched_topics: [],
    goldfinger_execution: key === 'goldfinger_execution' ? (delivered ? '金手指拆分、多维成长或反馈证据已进入正文。' : '金手指拆分、多维成长或反馈证据不足。') : '',
    genre_boundary_execution: key === 'genre_boundary_execution' ? (delivered ? '题材边界和核心卖点循环已有正文证据。' : '题材边界和核心卖点循环缺正文证据。') : '',
    market_benchmark_execution: key === 'market_benchmark_execution' ? (delivered ? '扫榜/对标方法已转成可见桥段或结构证据。' : '扫榜/对标方法未转成正文证据。') : '',
    urban_high_martial_execution: key === 'urban_high_martial_execution' ? (delivered ? '都市高武的钱、资源、资格或赛事压力已落地。' : '都市高武的钱、资源、资格或赛事压力不足。') : '',
    launch_checkpoint_execution: key === 'launch_checkpoint_execution' ? (delivered ? '三万字卡点、上架高潮或倒推目标已有正文证据。' : '三万字卡点、上架高潮或倒推目标缺正文证据。') : '',
    faction_hand_execution: key === 'faction_hand_execution' ? (delivered ? '阵营手牌、逐级出牌或第三方逻辑已有正文证据。' : '阵营手牌、逐级出牌或第三方逻辑缺正文证据。') : '',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 28).slice(0, 8),
    issue: delivered ? '' : issue,
    fix: delivered ? '' : repairInstruction,
    repair_instruction: delivered ? '' : repairInstruction,
    remaining_risk: delivered ? '' : issue,
  }
}

export function plotSpecialTopicsPriority(missed: any[]) {
  if (missed.some(item => item.key === 'launch_checkpoint_execution')) return '优先补三万字卡点倒推'
  if (missed.some(item => item.key === 'goldfinger_execution')) return '优先补金手指执行'
  if (missed.some(item => item.key === 'genre_boundary_execution')) return '优先校题材边界'
  if (missed.some(item => item.key === 'faction_hand_execution')) return '优先补阵营手牌'
  if (missed.some(item => item.key === 'urban_high_martial_execution')) return '优先补都市高武目标'
  if (missed.some(item => item.key === 'market_benchmark_execution')) return '优先补扫榜对标'
  return ''
}

export function buildPlotSpecialTopicsSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = plotSpecialTopicsContractForSync(project, contextPackage, chapter)
  const matchedTopics = uniqueBriefStrings(contract?.matched_topics || contract?.matchedTopics, 10)
  const checks = [
    normalizePlotSpecialTopicsExecutionCheck(
      'goldfinger_execution',
      '金手指拆分与战力防崩',
      [
        ...asArray(contract?.goldfinger_design_rules || contract?.goldfingerDesignRules),
        ...asArray(contract?.goldfinger_advanced_rules || contract?.goldfingerAdvancedRules),
      ],
      chapterText,
      [/金手指|系统|面板|抽卡|熟练度|词条|加点|商城|兑换/, /不倒退|没有倒退|重复提升|多维成长|多条线/, /反馈|奖励|条件|阶段|功能/],
      '金手指没有拆成可循环元素，或后期成长/反馈只剩单线说明。',
      '补金手指执行：把面板/条件/反馈/重复提升写成行动过程和局势变化，避免只解释规则。',
    ),
    normalizePlotSpecialTopicsExecutionCheck(
      'genre_boundary_execution',
      '题材边界',
      contract?.genre_boundary_rules || contract?.genreBoundaryRules,
      chapterText,
      [/题材边界|同题材|类型边界|核心期待/, /核心卖点|核心循环|读者.*进来|持续给/, /边界内|不突破|不越界|共同元素/],
      '正文没有证明核心卖点循环仍在题材边界内，可能出现越界创新或挂羊头卖狗肉。',
      '补题材边界执行：把当前场景拉回同题材读者买账的共同元素，并让金手指核心循环服务本题材期待。',
    ),
    normalizePlotSpecialTopicsExecutionCheck(
      'market_benchmark_execution',
      '扫榜对标',
      [
        ...asArray(contract?.market_benchmark_rules || contract?.marketBenchmarkRules),
        ...asArray(contract?.benchmark_selection_rules || contract?.benchmarkSelectionRules),
        ...asArray(contract?.three_book_fusion_rules || contract?.threeBookFusionRules),
      ],
      chapterText,
      [/扫榜|对标|竞品|拆书|同平台|同题材|同类型/, /精品|万订|读者评论|样本|近期数据/, /结构|情绪|节奏模块|功能位/],
      '扫榜、对标或三书融合没有转成正文里的结构、情绪或节奏功能证据。',
      '补扫榜对标执行：只复用功能位和节奏/情绪结构，把对标价值写成当前章节的桥段功能。',
    ),
    normalizePlotSpecialTopicsExecutionCheck(
      'urban_high_martial_execution',
      '都市高武',
      contract?.urban_high_martial_rules || contract?.urbanHighMartialRules,
      chapterText,
      [/钱|奖金|资源|资格|名额|补贴|收入/, /联考|武馆|军校|治安局|军部|月考|赛事|武道会/, /物质|学业|职业|亲情|激励|感情/],
      '都市高武目标没有和钱、资源、资格、赛事或现实发展挂钩。',
      '补都市高武执行：把升级收益换算成钱/资源/资格，并用联考、武馆、赛事、治安局或军部任务承载事件。',
    ),
    normalizePlotSpecialTopicsExecutionCheck(
      'launch_checkpoint_execution',
      '三万字卡点',
      contract?.launch_checkpoint_rules || contract?.launchCheckpointRules,
      chapterText,
      [/三万字|3万字|上架高潮|首秀|卡点|倒推/, /核心反派|阶段目标|关键爽点|上架/, /围绕.*卡点|卡点.*设计/],
      '正文没有服务三万字卡点、上架高潮或倒推阶段目标。',
      '补三万字卡点执行：删掉无关装逼打脸，把核心反派、阶段目标和关键爽点写回卡点倒推链路。',
    ),
    normalizePlotSpecialTopicsExecutionCheck(
      'faction_hand_execution',
      '阵营手牌',
      [
        ...asArray(contract?.faction_hand_rules || contract?.factionHandRules),
        ...asArray(contract?.faction_motivation_rules || contract?.factionMotivationRules),
      ],
      chapterText,
      [/阵营|友军|敌方|第三方|观众|配角|反派/, /实力高低|依次出牌|逐级递进|先抑后扬|最后出手|手牌/, /队长|教练|高人|大BOSS|boss|碾压/i],
      '阵营冲突没有按手牌/实力顺序逐级出牌，第三方逻辑或动机铺垫不足。',
      '补阵营手牌执行：按观众/配角/敌人/主角/大BOSS逐级递进，让不同立场角色对同一事件给出不同态度。',
    ),
  ].filter(Boolean)
    .map((check: any) => ({
      ...check,
      matched_topics: matchedTopics,
    }))
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = plotSpecialTopicsPriority(missed)

  return {
    report_id: `plot-special-topics-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '特殊题材未配置' : status === 'ok' ? '特殊题材 OK' : `特殊题材缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 plot_special_topics_contract，建议补充金手指、题材边界、扫榜对标、都市高武、三万字卡点和阵营手牌规则。'
      : status === 'ok'
        ? '正文已基本兑现特殊题材合同：金手指、题材边界、扫榜对标、都市高武、三万字卡点和阵营手牌均有正文证据。'
        : `正文有 ${missedCount} 项特殊题材缺口，${priorityRepair || '优先补特殊题材操作证据'}。`,
    matched_topics: matchedTopics,
    check_count: checks.length,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: plotSpecialTopicsArray(contract?.quality_checks || contract?.qualityChecks).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持特殊题材执行：每章继续让金手指、题材边界、阶段卡点和阵营手牌变成正文事件。']
      : [
          '下一章必须补特殊题材：把 plot_special_topics_checks 的缺口先转成开篇目标、中段事件或章末卡点。',
          '金手指与题材边界优先：能力反馈必须参与胜负或资源变化，不能只做说明书。',
          '如果命中三万字卡点或阵营手牌，删除无关桥段，把阶段目标、核心反派和逐级出牌写成可见正文证据。',
        ],
  }
}

export function femaleAudienceContractForSync(project: any, contextPackage: any, chapter: any = {}) {
  return buildFemaleAudienceContract(project, contextWithChapterRawPreDraftForSync(contextPackage, chapter))
}

export function buildFemaleAudienceSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = femaleAudienceContractForSync(project, contextPackage, chapter)
  const checks = contract ? [
    normalizeFemaleCorePrinciplesCheck(contract.core_principles || contract.corePrinciples, chapterText),
    normalizeFemaleReaderNeedCheck(contract.reader_need_rules || contract.readerNeedRules, chapterText),
    normalizeFemaleCopyPromiseCheck(contract.copy_promise_rules || contract.copyPromiseRules, chapterText),
    normalizeFemaleLongformGenreCheck(contract.longform_genre_rules || contract.longformGenreRules, chapterText),
    normalizeFemaleRomanceAxisCheck(contract.romance_axis_rules || contract.romanceAxisRules, chapterText),
    normalizeFemaleAbuseDosageCheck(contract.abuse_dosage_rules || contract.abuseDosageRules, chapterText),
    normalizeFemalePlatformFitCheck(contract.platform_fit_rules || contract.platformFitRules, chapterText),
    normalizeFemaleQualityCheck(contract.quality_checks || contract.qualityChecks, chapterText),
    buildFemaleAudienceDeterministicCheck(chapterText),
  ].filter(Boolean) : []
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = femaleAudiencePriority(missed)

  return {
    report_id: `female-audience-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '女频长篇未配置' : status === 'ok' ? '女频长篇 OK' : `女频长篇缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 female_audience_contract；只有女性向项目才需要该同步报告。'
      : status === 'ok'
        ? '正文已基本兑现安全感、代入感、女主主动性、深层需求、文案承诺、感情线双轴、虐戏剂量和平台适配。'
        : `正文有 ${missedCount} 项女频长篇缺口，${priorityRepair || '优先补安全感、女主主动性和虐后回补'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract?.quality_checks || contract?.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持女频长篇兑现：安全感、女主主动选择、成长节点上的感情升级和虐后回补都要可见。']
      : [
          '下一章必须补女频长篇：先补安全感锚点，再让女主亲自做决定、亲自推进、亲自承担结果。',
          '受委屈后必须立刻给反转、糖、退路或阶段胜利；感情升级要踩在女主事业/成长节点上。',
      ],
  }
}

export function plotDynamicsContractForSync(contextPackage: any, chapter: any = {}) {
  return buildPlotDynamicsContract(contextWithChapterRawPreDraftForSync(contextPackage, chapter))
}

export function buildPlotDynamicsSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = plotDynamicsContractForSync(contextPackage, chapter)
  const checks = [
    normalizePlotLoopCheck(contract.plot_loop || contract.plotLoop, chapterText),
    normalizeClimaxFormulaCheck(contract.climax_formula || contract.climaxFormula, chapterText),
    normalizePlotAbOutlineCheck(contract.ab_outline || contract.abOutline, chapterText),
    normalizePlotScenePurposeCheck(contract.scene_purpose_map || contract.scenePurposeMap, chapterText),
    normalizePlotDriveModeRulesCheck(contract.drive_mode_rules || contract.driveModeRules, chapterText),
    normalizeLineStaggerRulesCheck(contract.line_stagger_rules || contract.lineStaggerRules, chapterText),
    buildPlotDynamicsDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = plotDynamicsPriority(missed)

  return {
    report_id: `plot-dynamics-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '剧情动力未配置' : status === 'ok' ? '剧情动力 OK' : `剧情动力缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 plot_dynamics_contract，建议补充目标、阻碍、行动、代价/反馈、新期待、高潮公式、驱动方式和多线错峰。'
      : status === 'ok'
        ? '正文已基本兑现目标、阻碍、行动、代价/反馈、新期待、高潮公式、A/B节奏、场景功能、驱动方式和多线错峰。'
        : `正文有 ${missedCount} 项剧情动力缺口，${priorityRepair || '优先补剧情闭环和高潮落差'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持剧情动力：目标、阻碍、行动、代价/反馈、新期待、高潮情绪落差、题材匹配的驱动方式和主线/支线错峰推进都要可见。']
      : [
          '下一章必须补剧情动力：先立清目标和阻碍，再写主角行动、代价/反馈和新的章末期待，并让主线和支线错开节奏推进。',
          '按题材修驱动方式：番茄爽文/打脸文每章给一个外部结果（赢、升级、对手栽）；情感驱动保留人物心结；混合模式主线事件推进，每 3-5 章插情感停顿。',
          '高潮必须有蓄能、假胜、崩解、交叉死磕和悬置收尾，避免顺滑解决后直接结束。',
        ],
  }
}

export function storyPowerContractForSync(contextPackage: any, chapter: any = {}) {
  return buildStoryPowerContract({}, contextWithChapterRawPreDraftForSync(contextPackage, chapter))
}

export function buildStoryPowerSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = storyPowerContractForSync(contextPackage, chapter)
  const checks = [
    normalizeStoryPowerCheck('story_power_dimensions', '故事五维', contract.story_power_dimensions || contract.storyPowerDimensions, chapterText),
    normalizeStoryPowerCheck('chapter_power_loop', '本章故事力循环', contract.chapter_power_loop || contract.chapterPowerLoop, chapterText),
    normalizeStoryPowerCheck('action_rules', '有动作才是故事', contract.action_rules || contract.actionRules, chapterText),
    normalizeStoryPowerCheck('beginning_end_rules', '有始有终', contract.beginning_end_rules || contract.beginningEndRules, chapterText),
    normalizeStoryPowerCheck('causal_feedback_rules', '因果反馈', contract.causal_feedback_rules || contract.causalFeedbackRules, chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = storyPowerPriority(missed)
  return {
    report_id: `story-power-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '故事力未配置' : status === 'ok' ? '故事力 OK' : `故事力缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 story_power_contract，建议补充故事五维、可见行动、有始有终和因果反馈。'
      : status === 'ok'
        ? '正文已基本兑现故事五维、行动改变局势、有始有终和因果反馈。'
        : `正文有 ${missedCount} 项故事力缺口，${priorityRepair || '优先补可见行动和因果反馈'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持故事力：故事五维、行动改变局势、章首到章末状态变化和因果反馈都要可见。']
      : [
          '下一章必须补故事力：先补目标和阻碍，再写角色主动行动，让行动带来代价、信息、关系、规则或敌方反制反馈。',
          '开场压力必须在章末转成状态变化、下一步选择或新期待；不要用解释、旁观或内心独白替代行动。',
        ],
  }
}

export function sceneDriveExpectation(contextPackage: any, chapter: any = {}) {
  const sceneCards = storyDriveSceneCards(contextPackage, chapter)
  const card = sceneCards.find((item: any) => compactText(
    item?.goal
    || item?.purpose
    || item?.conflict
    || item?.turning_point
    || item?.turningPoint
    || item?.reader_payoff
    || item?.readerPayoff,
    80,
  )) || {}
  return [
    card?.goal || card?.purpose,
    card?.conflict,
    card?.turning_point || card?.turningPoint || card?.turn || card?.reversal,
    card?.reader_payoff || card?.readerPayoff,
  ].filter(Boolean).join('；')
}

export function storyDriveSceneCards(contextPackage: any, chapter: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || {}
  const brief = syncContextPackage?.pre_draft_brief || syncContextPackage?.preDraftBrief || {}
  return [
    ...asArray(target.scene_cards || target.sceneCards),
    ...asArray(syncContextPackage?.scene_cards || syncContextPackage?.sceneCards),
    ...asArray(brief.scene_briefs || brief.sceneBriefs),
    ...asArray(brief.scene_cards || brief.sceneCards),
  ]
}

export function buildStoryDriveSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || {}
  const brief = syncContextPackage?.pre_draft_brief || syncContextPackage?.preDraftBrief || {}
  const sceneCards = storyDriveSceneCards(syncContextPackage, chapter)
  const dimensions = [
    normalizeStoryDriveDimension(
      'chapter_goal',
      '本章目标',
      firstCompactText(
        target.chapter_goal,
        target.chapterGoal,
        target.goal,
        target.objective,
        brief.chapter_goal,
        brief.chapterGoal,
        brief.chapter_objective,
        brief.chapterObjective,
        firstSceneCardText(sceneCards, ['goal', 'purpose', 'reader_payoff', 'payoff']),
      ),
      chapterText,
      42,
    ),
    normalizeStoryDriveDimension(
      'obstacle',
      '明确阻碍',
      firstCompactText(
        target.core_conflict,
        target.coreConflict,
        target.conflict,
        brief.core_conflict,
        brief.coreConflict,
        brief.conflict,
        firstSceneCardText(sceneCards, ['conflict', 'obstacle', 'pressure']),
      ),
      chapterText,
      40,
    ),
    normalizeStoryDriveDimension(
      'protagonist_choice',
      '主角选择',
      firstCompactText(
        target.protagonist_choice,
        target.protagonistChoice,
        target.active_choice,
        target.activeChoice,
        target.main_character_choice,
        target.mainCharacterChoice,
        brief.protagonist_choice,
        brief.protagonistChoice,
        firstSceneCardText(sceneCards, ['protagonist_choice', 'protagonistChoice', 'active_choice', 'activeChoice', 'turning_point', 'turningPoint', 'turn', 'reversal']),
      ),
      chapterText,
      42,
    ),
    normalizeStoryDriveDimension(
      'choice_cost',
      '选择代价',
      firstCompactText(
        target.choice_cost,
        target.choiceCost,
        target.cost,
        target.consequence,
        target.stakes,
        brief.choice_cost,
        brief.choiceCost,
        brief.cost,
        firstSceneCardText(sceneCards, ['choice_cost', 'cost', 'consequence', 'stakes', 'risk']),
      ),
      chapterText,
      42,
    ),
    normalizeStoryDriveDimension(
      'state_change',
      '状态变化',
      firstCompactText(
        target.state_change,
        target.stateChange,
        target.exit_state,
        target.exitState,
        target.chapter_state_change,
        target.chapterStateChange,
        brief.state_change,
        brief.stateChange,
        firstSceneCardText(sceneCards, ['exit_state', 'exitState', 'state_change', 'stateChange', 'result', 'scene_result', 'sceneResult']),
      ),
      chapterText,
      42,
    ),
    normalizeStoryDriveDimension(
      'causal_next_step',
      '下一步因果',
      firstCompactText(
        target.causal_next_step,
        target.causalNextStep,
        target.next_step,
        target.nextStep,
        target.ending_hook,
        target.endingHook,
        brief.causal_next_step,
        brief.causalNextStep,
        brief.ending_hook,
        brief.endingHook,
        firstSceneCardText(sceneCards, ['causal_next_step', 'causalNextStep', 'next_step', 'nextStep', 'ending_hook', 'endingHook', 'exit_hook', 'exitHook']),
      ),
      chapterText,
      42,
    ),
  ].filter(Boolean)

  const delivered = dimensions.filter((item: any) => item.delivered)
  const missed = dimensions.filter((item: any) => !item.delivered)
  const score = Math.max(0, Math.min(100, Math.round(
    dimensions.length ? dimensions.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / dimensions.length : 82,
  )))
  const status = missed.length > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = storyDrivePriority(missed)

  return {
    report_id: `story-drive-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: dimensions.length === 0 ? '故事力未配置' : status === 'ok' ? '故事力 OK' : `故事力缺口 ${missed.length}`,
    summary: dimensions.length === 0
      ? '本章没有明确的故事驱动力任务书，建议补充主角选择、阻碍、代价和状态变化。'
      : status === 'ok'
        ? '本章目标、阻碍、主角选择、选择代价、状态变化和下一步因果已形成可追踪行动链。'
        : `本章有 ${missed.length} 项故事驱动力缺口，${priorityRepair || '优先补主角主动选择和代价反馈'}。`,
    missed_count: missed.length,
    priority_repair: priorityRepair,
    dimensions,
    planned: dimensions,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持本章主角主动选择、外部阻碍、选择代价、状态变化和下一步因果的连续执行。']
      : [
          '下一次修订必须补出主角主动选择、明确阻碍、选择代价、局面变化和下一步因果。',
          '不能只用旁白解释剧情推进；缺口必须写成现场行动、对话交锋、代价反馈或状态变化。',
          '如果本章原本只是过场，至少让主角做一个不可逆的小选择，并让下一章承接其后果。',
        ],
  }
}

export function storyLoopContractFromContext(contextPackage: any = {}, chapter: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const brief = {
    ...(target?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(contextPackage?.preDraftBrief || {}),
    ...(chapter?.raw_payload?.pre_draft_brief || {}),
    ...(chapter?.raw_payload?.preDraftBrief || {}),
  }
  return target.story_loop_contract
    || target.storyLoopContract
    || brief.story_loop_contract
    || brief.storyLoopContract
    || contextPackage?.story_loop_contract
    || contextPackage?.storyLoopContract
    || {}
}

export function buildStoryLoopSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = storyLoopContractFromContext(contextPackage, chapter)
  const beats = [
    normalizeStoryLoopBeat('setup', '铺垫入局', firstCompactText(contract.setup, contract.opening_setup, contract.openingSetup), chapterText, 36),
    normalizeStoryLoopBeat('escalation', '升级阻碍', firstCompactText(contract.escalation, contract.obstacle_escalation, contract.obstacleEscalation), chapterText, 36),
    normalizeStoryLoopBeat('payoff', '兑现反馈', firstCompactText(contract.payoff, contract.feedback, contract.result), chapterText, 36),
    normalizeStoryLoopBeat('carry_over', '承接期待', firstCompactText(contract.carry_over, contract.carryOver, contract.next_expectation, contract.nextExpectation), chapterText, 36),
    normalizeStoryLoopMapTransitionCheck(contract.map_transition_rules || contract.mapTransitionRules, chapterText),
    normalizeStoryLoopNestedLoopCheck(contract.nested_loop_rules || contract.nestedLoopRules, chapterText),
  ].filter(Boolean)
  const delivered = beats.filter((item: any) => item.delivered)
  const missed = beats.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    beats.length ? beats.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / beats.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = storyLoopPriority(missed)

  return {
    report_id: `story-loop-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: beats.length === 0 ? '故事循环未配置' : status === 'ok' ? '故事循环 OK' : `故事循环缺口 ${missedCount}`,
    summary: beats.length === 0
      ? '本章没有配置 story_loop_contract，建议补充 setup、escalation、payoff 和 carry_over。'
      : status === 'ok'
        ? '本章已形成 setup -> escalation -> payoff -> carry_over 的故事循环闭环。'
        : `正文有 ${missedCount} 项故事循环缺口，${priorityRepair || '优先补兑现反馈和承接期待'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: beats,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持 setup -> escalation -> payoff -> carry_over：每章既完成本章反馈，也把下一章期待接上。']
      : [
          '下一次修订必须补足 setup -> escalation -> payoff -> carry_over，把铺垫、阻碍升级、兑现反馈和承接期待写成正文可见事件。',
          '不能只用“事情进入下一阶段”或旁白总结替代承接；章尾必须留下由本章反馈触发的新目标、新风险、新线索或新期待。',
          missed.some((item: any) => item.key === 'map_transition_rules')
            ? '补换地图承接：旧地图核心冲突先阶段性解决，再用过渡人物/旧关系/贯穿主线带出新地图五件套；必须先让人际关系动了 -> 主角再动，前5章建立代入感和期待感，避免旧线全抛和新设定一次性倒出。'
            : '',
          missed.some((item: any) => item.key === 'nested_loop_rules')
            ? '补故事循环嵌套：小循环 -> 中循环 -> 大循环必须同时可见，小循环中必须铺垫大循环的期待，并把同一核心卖点换不同角度/不同矛盾推进。'
            : '',
        ],
  }
}

export function informationFlowContractForSync(contextPackage: any = {}, chapter: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const brief = {
    ...(target?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(contextPackage?.preDraftBrief || {}),
    ...(chapter?.raw_payload?.pre_draft_brief || {}),
    ...(chapter?.raw_payload?.preDraftBrief || {}),
  }
  return target?.information_flow_contract
    || target?.informationFlowContract
    || contextPackage?.information_flow_contract
    || contextPackage?.informationFlowContract
    || brief?.information_flow_contract
    || brief?.informationFlowContract
    || {}
}

export * from './quality-sync-reports-extended-threshold'
