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

