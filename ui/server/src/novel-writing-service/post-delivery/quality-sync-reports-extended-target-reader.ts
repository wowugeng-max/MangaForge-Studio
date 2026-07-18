import {
  anchorMatchScore,
} from '../../novel-writing/text-matching'
import {
  asArray,
} from '../../routes/novel-route-utils'
import {
  compactBriefText,
  uniqueBriefStrings,
} from '../quality/text-utils'
import {
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

