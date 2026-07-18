import { asArray, compactText } from '../../routes/novel-route-utils'
import { anchorMatchScore, anchorTerms, normalizedMatchText } from '../../novel-writing/text-matching'
import {
  buildChapterHandoffDeterministicCheck,
  chapterHandoffPriority,
  normalizeChapterHandoffDeliveryCheck,
} from '../../novel-writing/chapter-handoff-basics'
import { buildReaderRetentionBrief } from '../../novel-writing/reader-retention-brief'
import { sceneBriefFromCard } from '../../novel-writing/scene-briefs'
import {
  applyReaderExpectationDebtAging,
  normalizeReaderExpectationDebtContext,
  normalizeReaderExpectationLedgerContract,
} from '../batch-serial/serial-momentum'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'

type AnyFn = (...args: any[]) => any

let buildReaderExpectationLedger: AnyFn = (_review: any = {}) => ({})
let contextWithChapterRawPreDraftForSync: AnyFn = (contextPackage: any = {}, _chapter: any = {}) => contextPackage || {}
let normalizeBatchChapterHandoffContract: AnyFn = (value: any = {}) => value || {}
let normalizeCoreContractPeriodicDriftCheck: AnyFn = (value: any = {}) => value || {}
let normalizeCoreContractRadar: AnyFn = (value: any = {}) => value || {}

export function bindCoreHandoffSyncReportDeps(deps: {
  buildReaderExpectationLedger?: AnyFn
  contextWithChapterRawPreDraftForSync?: AnyFn
  normalizeBatchChapterHandoffContract?: AnyFn
  normalizeCoreContractPeriodicDriftCheck?: AnyFn
  normalizeCoreContractRadar?: AnyFn
} = {}) {
  if (deps.buildReaderExpectationLedger) buildReaderExpectationLedger = deps.buildReaderExpectationLedger
  if (deps.contextWithChapterRawPreDraftForSync) contextWithChapterRawPreDraftForSync = deps.contextWithChapterRawPreDraftForSync
  if (deps.normalizeBatchChapterHandoffContract) normalizeBatchChapterHandoffContract = deps.normalizeBatchChapterHandoffContract
  if (deps.normalizeCoreContractPeriodicDriftCheck) normalizeCoreContractPeriodicDriftCheck = deps.normalizeCoreContractPeriodicDriftCheck
  if (deps.normalizeCoreContractRadar) normalizeCoreContractRadar = deps.normalizeCoreContractRadar
}

export function firstDefined(...values: any[]) {
  return values.find(value => value !== undefined && value !== null && String(value).trim() !== '') || ''
}

function driftCheck(key: string, label: string, expected: any, chapterText: string, options: { tailOnly?: boolean } = {}) {
  const match = anchorMatchScore(expected, chapterText, options)
  const status = !normalizedMatchText(expected)
    ? 'warn'
    : match.score >= 60
      ? 'ok'
      : 'warn'
  return {
    key,
    label,
    status,
    score: match.score,
    expected: compactText(expected, 180),
    evidence: match.matched,
    risk: status === 'ok' ? '' : `${label}${normalizedMatchText(expected) ? '未充分落地' : '缺少守恒锚点'}`,
  }
}

function forbiddenDriftCheck(items: any[], chapterText: string) {
  const text = normalizedMatchText(chapterText)
  const touched = items
    .map(item => compactText(item, 120))
    .filter(Boolean)
    .filter(item => text.includes(normalizedMatchText(item)))
  const score = Math.max(0, 100 - touched.length * 35)
  return {
    key: 'forbidden_content',
    label: '禁写/禁揭',
    status: touched.length > 0 ? 'warn' : 'ok',
    score,
    expected: items.map(item => compactText(item, 80)).filter(Boolean).join('；'),
    evidence: touched,
    risk: touched.length > 0 ? `触碰禁写内容：${touched.slice(0, 3).join('；')}` : '',
  }
}

function driftItemText(item: any) {
  if (typeof item === 'string') return compactText(item, 160)
  return compactText(
    item?.text
    || item?.summary
    || item?.detail
    || item?.label
    || item?.name
    || item?.title
    || item?.reader_payoff
    || item?.readerPayoff,
    160,
  )
}

function uniqueDriftItems(items: any[], limit = 8) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const text = driftItemText(item)
    if (!text || seen.has(text)) continue
    seen.add(text)
    result.push(text)
    if (result.length >= limit) break
  }
  return result
}

function expectationLineDriftCheck(key: string, label: string, items: any[], chapterText: string) {
  const expectedItems = uniqueDriftItems(items)
  if (!expectedItems.length) return null
  const scored = expectedItems.map(item => ({ item, match: anchorMatchScore(item, chapterText) }))
  const delivered = scored.filter(row => row.match.score >= 60)
  const score = Math.round((delivered.length / Math.max(1, scored.length)) * 100)
  const status = score >= 60 ? 'ok' : 'warn'
  return {
    key,
    label,
    status,
    score,
    expected: expectedItems.join('；'),
    evidence: delivered.map(row => row.item).slice(0, 8),
    risk: status === 'ok' ? '' : `${label}未充分落地`,
  }
}

function expectationLineChecksForCoreDrift(project: any, contextPackage: any, chapterText: string) {
  const target = contextPackage?.chapter_target || {}
  const brief = contextPackage?.pre_draft_brief || contextPackage?.preDraftBrief || {}
  const bible = project?.reference_config?.writing_bible || {}
  const commercial = bible?.commercial_positioning || {}
  const ledger = target.reader_expectation_ledger || target.readerExpectationLedger || contextPackage?.reader_expectation_ledger || contextPackage?.readerExpectationLedger || brief.reader_expectation_ledger || brief.readerExpectationLedger || {}
  const targetReader = target.target_reader_contract || target.targetReaderContract || contextPackage?.target_reader_contract || contextPackage?.targetReaderContract || brief.target_reader_contract || brief.targetReaderContract || {}
  const genre = target.genre_positioning_contract || target.genrePositioningContract || contextPackage?.genre_positioning_contract || contextPackage?.genrePositioningContract || brief.genre_positioning_contract || brief.genrePositioningContract || {}
  const signatureScene = target.signature_scene_brief || target.signatureSceneBrief || brief.signature_scene_brief || brief.signatureSceneBrief || {}
  const checks = [
    expectationLineDriftCheck('plot_expectation_line', '剧情期待', [
      ...asArray(ledger.must_deliver || ledger.mustDeliver),
      ...asArray(ledger.keep_alive || ledger.keepAlive),
      target.ending_hook || target.endingHook,
    ], chapterText),
    expectationLineDriftCheck('theme_payoff_line', '主题甜头', [
      ...asArray(targetReader.reader_desires || targetReader.readerDesires),
      ...asArray(targetReader.chapter_attractions || targetReader.chapterAttractions),
      ...asArray(commercial.selling_points || commercial.sellingPoints),
      ...asArray(genre.core_hook_rules || genre.coreHookRules),
    ], chapterText),
    expectationLineDriftCheck('freshness_stimulus_line', '新鲜刺激', [
      ...asArray(genre.micro_innovation_rules || genre.microInnovationRules),
      ...asArray(genre.must_have_scenes || genre.mustHaveScenes),
      target.innovation_hook || target.innovationHook,
      brief.innovation_hook || brief.innovationHook,
      signatureScene.signature_scene || signatureScene.signatureScene,
    ], chapterText),
  ]
  return checks.filter(Boolean) as any[]
}

export function buildChapterCoreDriftReport(project: any, chapter: any, contextPackage: any, chapterText: string, storylineSync: any = null) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || {}
  const brief = syncContextPackage?.pre_draft_brief || syncContextPackage?.preDraftBrief || {}
  const bible = project?.reference_config?.writing_bible || {}
  const readerPromise = firstDefined(
    target.reader_promise,
    target.readerPromise,
    brief.reader_promise,
    brief.readerPromise,
    bible.reader_promise,
    bible.readerPromise,
    bible.promise,
    bible.core_selling_point,
    bible.coreSellingPoint,
    project?.summary,
    project?.synopsis,
  )
  const chapterGoal = firstDefined(target.chapter_goal, target.chapterGoal, target.goal, brief.chapter_goal, brief.chapterGoal, chapter?.chapter_goal, chapter?.chapterGoal, chapter?.summary)
  const coreConflict = firstDefined(target.core_conflict, target.coreConflict, target.conflict, brief.core_conflict, brief.coreConflict, chapter?.conflict)
  const endingHook = firstDefined(target.ending_hook, target.endingHook, brief.ending_hook, brief.endingHook, chapter?.ending_hook, chapter?.endingHook)
  const forbiddenItems = [
    ...asArray(target.forbidden_content),
    ...asArray(target.forbiddenContent),
    ...asArray(target.forbidden_repeats),
    ...asArray(target.forbiddenRepeats),
    ...asArray(target.storyline_forbidden),
    ...asArray(target.storylineForbidden),
    ...asArray(brief.forbidden_content),
    ...asArray(brief.forbiddenContent),
    ...asArray(brief.storyline_forbidden),
    ...asArray(brief.storylineForbidden),
  ]
  const checks = [
    driftCheck('reader_promise', '读者承诺', readerPromise, chapterText),
    driftCheck('chapter_goal', '本章目标', chapterGoal, chapterText),
    driftCheck('core_conflict', '核心冲突', coreConflict, chapterText),
    driftCheck('ending_hook', '章末钩子', endingHook, chapterText, { tailOnly: true }),
    forbiddenDriftCheck(forbiddenItems, chapterText),
    ...expectationLineChecksForCoreDrift(project, syncContextPackage, chapterText),
  ]
  const missedStorylines = asArray(storylineSync?.missed)
  const forbiddenTouched = asArray(storylineSync?.forbidden_touched)
  if (missedStorylines.length || forbiddenTouched.length) {
    checks.push({
      key: 'storyline_alignment',
      label: '剧情线守恒',
      status: 'warn',
      score: Math.max(0, 100 - missedStorylines.length * 18 - forbiddenTouched.length * 28),
      expected: '按开写任务书推进本章剧情线',
      evidence: [
        ...missedStorylines.map((item: any) => `漏推：${item.name || item.title || item.entity_id || '未命名剧情线'}`),
        ...forbiddenTouched.map((item: any) => `禁揭触碰：${item.name || item.title || item.entity_id || '未命名剧情线'}`),
      ].slice(0, 8),
      risk: [
        missedStorylines.length ? `剧情线漏推 ${missedStorylines.length}` : '',
        forbiddenTouched.length ? `禁揭风险 ${forbiddenTouched.length}` : '',
      ].filter(Boolean).join('；'),
    })
  }
  const driftRisks = checks.map(check => check.risk).filter(Boolean)
  const rawScore = checks.length
    ? checks.reduce((sum, check) => sum + Number(check.score || 0), 0) / checks.length
    : 75
  const score = Math.max(0, Math.min(100, Math.round(rawScore)))
  const status = driftRisks.length || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `chapter-core-drift-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? `核心守恒 ${score}` : `核心偏移 ${driftRisks.length}`,
    summary: status === 'ok'
      ? '本章目标、冲突、承诺和章末钩子与开写任务书基本一致。'
      : `本章存在 ${driftRisks.length} 项核心偏移风险。`,
    anchors: {
      reader_promise: compactText(readerPromise, 180),
      chapter_goal: compactText(chapterGoal, 180),
      core_conflict: compactText(coreConflict, 180),
      ending_hook: compactText(endingHook, 180),
    },
    checks,
    drift_risks: driftRisks,
    next_actions: status === 'ok'
      ? ['保持章节任务书、场景卡、剧情线同步和交稿质检循环。']
      : [
          '优先回看开写任务书，确认本章目标、核心冲突和章末钩子是否需要改稿。',
          '如果偏移来自模型自由发挥，生成编辑报告时要求只修语言和剧情落点，不改长期方向。',
        ],
  }
}

function coreContractArray(values: any) {
  return asArray(values).map((item: any) => compactBriefText(item)).filter(Boolean)
}

function normalizeCoreContractServeCheck(values: any, chapterText: string) {
  const planned = coreContractArray(values)
  if (!planned.length) return null
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const deliveredItems = scored.filter(item => item.match.score >= 34).length
  const delivered = deliveredItems >= Math.max(1, Math.ceil(planned.length * 0.45))
  return {
    key: 'must_serve',
    label: '必须服务',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.max(18, deliveredItems * 24),
    evidence: uniqueBriefStrings(scored.flatMap(item => item.match.matched), 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 34).slice(0, 8),
    issue: delivered ? '' : '正文没有服务核心承诺、核心矛盾、创新卖点或本章读者回报。',
    repair_instruction: delivered ? '' : '补核心承诺：把 must_serve 写成现场判定、角色选择、冲突结果、信息推进或章末问题。',
  }
}

function coreRedLinePhrase(value: string) {
  return compactBriefText(value)
    .replace(/^(不能|不得|不要|禁止|严禁|避免|不可)/, '')
    .replace(/^(把|让)/, '')
}

function redLineTouched(redLine: string, chapterText: string) {
  const text = String(chapterText || '')
  const phrase = coreRedLinePhrase(redLine)
  if (!phrase) return false
  if (phrase.includes('纯打怪') && /规则怪谈写成纯打怪|写成纯打怪|纯打怪/.test(text)) return true
  if (phrase.includes('蛮力') && phrase.includes('无代价') && /靠蛮力无代价通关|蛮力无代价通关/.test(text) && !/没有靠蛮力无代价通关|不靠蛮力无代价通关|不能靠蛮力无代价通关/.test(text)) return true
  if (phrase.includes('提前揭示') && /提前揭示/.test(text)) return true
  const compactedText = text.replace(/\s+/g, '')
  const compactedPhrase = phrase.replace(/\s+/g, '')
  return compactedPhrase.length >= 8 && compactedText.includes(compactedPhrase)
}

function normalizeCoreContractNoDriftCheck(values: any, chapterText: string) {
  const planned = coreContractArray(values)
  if (!planned.length) return null
  const touched = planned.filter(item => redLineTouched(item, chapterText))
  const delivered = touched.length === 0
  return {
    key: 'no_drift',
    label: '不得漂移',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 90 : Math.max(0, 100 - touched.length * 42),
    evidence: delivered ? ['正文未触碰核心漂移红线'] : touched.slice(0, 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: touched.slice(0, 8),
    issue: delivered ? '' : `正文触碰 ${touched.length} 条核心漂移红线。`,
    repair_instruction: delivered ? '' : '修核心漂移：删除或改写触线内容，把场景拉回核心承诺、主角驱动、题材卖点和长期方向。',
  }
}

function coreThemeEmotionCandidates(values: any) {
  return uniqueBriefStrings(coreContractArray(values).flatMap((item: string) => {
    const emotionMatch = item.match(/核心情绪[:：]?\s*([^；。！？!?]+)/)
    const fullCoreMatch = item.match(/全书核心[:：]?\s*([^；。！？!?]+)/)
    return [
      emotionMatch?.[1] || '',
      fullCoreMatch?.[1] || '',
      item.replace(/^一本书从头到尾要有统一的核心情绪[:：]?/, ''),
    ]
  }), 8)
}

function normalizeCoreContractThemeUnityCheck(values: any, chapterText: string) {
  const planned = coreContractArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const coreEmotions = coreThemeEmotionCandidates(planned)
  const scored = coreEmotions.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const matchedCoreEmotion = scored.some(item => item.match.score >= 30)
  const hasThemeUnityStatement = /主题统一|统一的核心情绪|全书核心情绪|指向全书核心|服从大情绪|小情绪/.test(text)
  const hasDriftSignal = /情绪散乱|多头并行|偏离全书核心情绪|不再服务核心情绪|变成温馨日常|改成种田安稳|旁枝情绪线/.test(text)
  const delivered = !hasDriftSignal && (matchedCoreEmotion || hasThemeUnityStatement)
  return {
    key: 'theme_unity_rules',
    label: '主题统一',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(18, [!hasDriftSignal, matchedCoreEmotion, hasThemeUnityStatement].filter(Boolean).length * 28),
    evidence: delivered
      ? uniqueBriefStrings([
          ...scored.flatMap(item => item.match.matched),
          hasThemeUnityStatement ? '正文声明小情绪服从全书核心情绪' : '',
        ], 8)
      : [],
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      hasDriftSignal ? '正文出现情绪散乱或旁枝情绪线' : '',
      !matchedCoreEmotion ? '缺全书核心情绪正文证据' : '',
      !hasThemeUnityStatement ? '缺小情绪服从大情绪的主题统一证据' : '',
    ], 8),
    issue: delivered ? '' : '本章情绪没有指向全书核心情绪，存在小情绪脱离大情绪或主题散乱风险。',
    repair_instruction: delivered ? '' : '按 oh-story 主题统一性修复：随机翻开本章也要能看出全书核心情绪；把升级、复仇、寻宝、日常等小情绪统一到主情绪之下，砍掉旁枝情绪线。',
  }
}

function countCoreContractSignals(chapterText: string, patterns: RegExp[]) {
  const text = String(chapterText || '')
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0)
}

function normalizeCoreContractSellingPointExecutionCheck(values: any, chapterText: string) {
  const planned = coreContractArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const fourStepSignals = countCoreContractSignals(text, [/卖点四步法|整本书卖点|书名卖点|简介卖点|段落卖点|每段剧情卖点/])
  const implicitSignals = countCoreContractSignals(text, [/发现比告知爽十倍|隐性展示|剧情、对话和反应|剧情\/对话\/反应|读者.*自己发现/])
  const progressionSignals = countCoreContractSignals(text, [/开头暗示.*中间深化.*高潮爆发|开头暗示|中间深化|高潮爆发|目的词|章纲目的/])
  const directTell = (/直接告诉读者.*核心卖点|这是核心卖点|本章很爽|只靠旁白宣布卖点|文青书名.*无法传递核心卖点/.test(text))
    && !/不是被告知本章很爽|没有直接告诉读者|不直接告诉读者|避免直接告诉读者/.test(text)
  const delivered = !directTell && fourStepSignals >= 1 && implicitSignals >= 1 && progressionSignals >= 1
  return {
    key: 'selling_point_execution_rules',
    label: '卖点执行',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(16, (fourStepSignals + implicitSignals + progressionSignals) * 18 - (directTell ? 18 : 0)),
    evidence: uniqueBriefStrings([
      fourStepSignals ? '卖点四步法信号可见' : '',
      implicitSignals ? '隐性展示/发现比告知爽十倍可见' : '',
      progressionSignals ? '开头暗示-中间深化-高潮爆发可见' : '',
      directTell ? '直接宣布卖点或爽感' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !fourStepSignals ? '缺整本书/书名/简介/段落卖点对齐' : '',
      !implicitSignals ? '缺剧情/对话/反应隐性展示卖点' : '',
      !progressionSignals ? '缺开头暗示 -> 中间深化 -> 高潮爆发递进或目的词' : '',
      directTell ? '不能直接告诉读者这是核心卖点/本章很爽' : '',
    ], 8),
    issue: delivered ? '' : '商业卖点没有按四步法和隐性展示落成正文。',
    repair_instruction: delivered ? '' : '补卖点执行：按卖点四步法对齐全书、书名、简介和段落卖点，用剧情/对话/反应隐性展示，并形成开头暗示 -> 中间深化 -> 高潮爆发。',
  }
}

function normalizeCoreContractRepetitionStrategyCheck(values: any, chapterText: string) {
  const planned = coreContractArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const repeatSignals = countCoreContractSignals(text, [/重复点|核心看点|同一卖点.*(?:3|三).*角度|至少延展.*(?:3|三).*角度/])
  const variationSignals = countCoreContractSignals(text, [/正写|反套路|持续反|反了再正|换壳换场景换人物|内核一致|升级重复方式/])
  const fatigueSignals = countCoreContractSignals(text, [/审美疲劳|爽点重复|反馈下降|读者反馈/])
  const fatigueFailure = /爽点重复到读者审美疲劳|核心看点抓不住|临时换看点|成绩也没了/.test(text)
  const delivered = !fatigueFailure && repeatSignals >= 1 && variationSignals >= 1 && fatigueSignals >= 1
  return {
    key: 'repetition_strategy_rules',
    label: '重复策略',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(16, (repeatSignals + variationSignals + fatigueSignals) * 18 - (fatigueFailure ? 18 : 0)),
    evidence: uniqueBriefStrings([
      repeatSignals ? '重复点/核心看点信号可见' : '',
      variationSignals ? '同卖点多角度变化可见' : '',
      fatigueSignals ? '审美疲劳/反馈策略可见' : '',
      fatigueFailure ? '爽点重复或临时换看点' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !repeatSignals ? '缺核心重复点或同一卖点多角度规划' : '',
      !variationSignals ? '缺正写/反套路/持续反/换壳换场景等变化方式' : '',
      !fatigueSignals ? '缺审美疲劳或反馈下降时的升级策略' : '',
      fatigueFailure ? '核心看点抓不住或爽点重复导致审美疲劳' : '',
    ], 8),
    issue: delivered ? '' : '重复策略没有证明同一核心卖点能持续换角度交付。',
    repair_instruction: delivered ? '' : '补重复策略：围绕核心看点保留重复点，把同一卖点拆出至少3个角度，用正写、反套路、持续反或换壳换场景升级重复方式。',
  }
}

function normalizeCoreContractCommercialRhythmCheck(values: any, chapterText: string) {
  const planned = coreContractArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const contextSignals = countCoreContractSignals(text, [/追踪\/上下文\.md|最近\s*3\s*章|最近3章|节奏自检/])
  const progressSignals = countCoreContractSignals(text, [/目标推进|阻碍升级|新信息|冲突密度|每500字.*转折点|500字.*转折/])
  const aftermathSignals = countCoreContractSignals(text, [/反应余波|承接场景|推进关系|推进.*关系|推进伏笔|推进状态|下一目标/])
  const climaxSignals = countCoreContractSignals(text, [/大高潮.*7-10|7-10天|小高潮.*3天|高潮后.*1-2章|1-2章过渡/])
  const rhythmFailure = (/连续\s*2\s*章没有目标推进|连续2章没有目标推进|连续\s*2\s*章只爆点不留反应余波|连续2章只爆点不留反应余波|拖沓|流水账/.test(text))
    && !/没有拖沓|无拖沓|不是连续爆点无余波|不是连续\s*2\s*章只爆点不留反应余波|避免连续\s*2\s*章|确认没有拖沓/.test(text)
  const delivered = !rhythmFailure && contextSignals >= 1 && progressSignals >= 1 && aftermathSignals >= 1 && climaxSignals >= 1
  return {
    key: 'commercial_rhythm_rules',
    label: '商业节奏',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(16, (contextSignals + progressSignals + aftermathSignals + climaxSignals) * 16 - (rhythmFailure ? 18 : 0)),
    evidence: uniqueBriefStrings([
      contextSignals ? '最近3章/追踪上下文节奏自检可见' : '',
      progressSignals ? '目标推进/阻碍升级/新信息可见' : '',
      aftermathSignals ? '爆点后反应余波/承接推进可见' : '',
      climaxSignals ? '高潮节奏标尺可见' : '',
      rhythmFailure ? '连续章节拖沓、过快或流水账' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !contextSignals ? '缺追踪/上下文与最近3章节奏自检' : '',
      !progressSignals ? '缺目标推进、阻碍升级、新信息或冲突密度' : '',
      !aftermathSignals ? '缺爆点后的反应余波或承接场景推进' : '',
      !climaxSignals ? '缺大高潮/小高潮/过渡章节奏标尺' : '',
      rhythmFailure ? '存在连续2章拖沓、过快或流水账信号' : '',
    ], 8),
    issue: delivered ? '' : '商业节奏没有按最近章节状态和高潮标尺校准。',
    repair_instruction: delivered ? '' : '补节奏自检：读取追踪/上下文.md 与最近3章摘要，连续2章无推进就提高冲突密度，连续爆点无余波就加承接场景，并按大高潮7-10天、小高潮3天、高潮后1-2章过渡校准。',
  }
}

function normalizeCoreContractGoldfingerStructureCheck(values: any, chapterText: string) {
  const planned = coreContractArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const processSignals = countCoreContractSignals(text, [/金手指可替换故事流程|替换故事流程|建立目标|克服困难|准备环节|激励事件|收获奖励/])
  const simplicitySignals = countCoreContractSignals(text, [/一眼就懂|金手指简单|系统限制|一步步行动|行动链/])
  const feedbackSignals = countCoreContractSignals(text, [/即时变化|当前职业|生活困境|打开困境|刚好解决当前矛盾|暴露更大矛盾/])
  const badGoldfinger = /说明书式万能外挂|万能外挂|一键清场|太强所以无聊|太弱.*焦虑|和职业无关|生活职业无关/.test(text)
  const delivered = !badGoldfinger && processSignals >= 1 && simplicitySignals >= 1 && feedbackSignals >= 1
  return {
    key: 'goldfinger_structure_rules',
    label: '金手指结构',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(16, (processSignals + simplicitySignals + feedbackSignals) * 18 - (badGoldfinger ? 18 : 0)),
    evidence: uniqueBriefStrings([
      processSignals ? '金手指替换故事流程环节可见' : '',
      simplicitySignals ? '一眼就懂/系统限制/行动链可见' : '',
      feedbackSignals ? '即时变化/职业契合/更大矛盾可见' : '',
      badGoldfinger ? '金手指万能、无聊或脱离职业' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !processSignals ? '缺金手指替换故事流程环节说明' : '',
      !simplicitySignals ? '缺一眼就懂、系统限制或主角行动链' : '',
      !feedbackSignals ? '缺即时变化、职业契合或更大矛盾暴露' : '',
      badGoldfinger ? '金手指变成说明书式万能外挂或一键清场' : '',
    ], 8),
    issue: delivered ? '' : '金手指没有按商业流程结构服务目标、行动、阻碍和奖励。',
    repair_instruction: delivered ? '' : '补金手指结构：明确它替换故事流程哪个环节，保持一眼就懂和系统限制，给出即时变化并契合职业/困境，解决当前矛盾后暴露更大矛盾。',
  }
}

function normalizeCoreContractLaunchPressureCheck(values: any, chapterText: string) {
  const planned = coreContractArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const openingSignals = countCoreContractSignals(text, [/300-500字|300到500字|处境.*危险来源.*破局希望|危险来源.*破局希望|活下去/])
  const pressureSignals = countCoreContractSignals(text, [/环境型压力|冲突型压力|一无所有|不能完美|不完美|否极泰来/])
  const hopeSignals = countCoreContractSignals(text, [/破局希望|金手指.*一眼就知道怎么用|打开困境|轻松向开篇/])
  const badLaunch = /开篇主角完美无缺|先铺背景|大段世界观|没有危险来源|没有破局希望|先铺.*世界观/.test(text)
  const delivered = !badLaunch && openingSignals >= 1 && pressureSignals >= 1 && hopeSignals >= 1
  return {
    key: 'launch_pressure_rules',
    label: '开篇压力',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(16, (openingSignals + pressureSignals + hopeSignals) * 18 - (badLaunch ? 18 : 0)),
    evidence: uniqueBriefStrings([
      openingSignals ? '300-500字处境/危险/希望可见' : '',
      pressureSignals ? '环境型压力或否极泰来起点可见' : '',
      hopeSignals ? '破局希望/金手指低门槛可见' : '',
      badLaunch ? '开篇完美主角、背景铺陈或无危险/希望' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !openingSignals ? '缺开篇300-500字处境、危险来源和破局希望' : '',
      !pressureSignals ? '缺环境型压力、主角不完美或否极泰来起点' : '',
      !hopeSignals ? '缺破局希望或金手指低门槛可懂' : '',
      badLaunch ? '开篇先铺背景/大段世界观或主角过于完美' : '',
    ], 8),
    issue: delivered ? '' : '开篇压力没有按商业留存要求建立处境、危险和破局希望。',
    repair_instruction: delivered ? '' : '补开篇压力：前300-500字交代处境、危险来源和破局希望，优先环境型压力，让主角不完美并形成否极泰来的起点。',
  }
}

function normalizeCoreContractRepairFocusCheck(values: any, chapterText: string) {
  const planned = coreContractArray(values)
  if (!planned.length) return null
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const deliveredItems = scored.filter(item => item.match.score >= 30).length
  const signalCount = [
    /规则判定|规则反制|判定限制|反制蛮力/,
    /章末|新的问题|广播来源|下一/,
    /推进|留下|暴露|发现/,
  ].reduce((count, pattern) => count + (pattern.test(String(chapterText || '')) ? 1 : 0), 0)
  const delivered = deliveredItems >= Math.max(1, Math.ceil(planned.length * 0.4)) || signalCount >= 2
  return {
    key: 'repair_focus',
    label: '修复焦点',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.max(18, signalCount * 20),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      signalCount >= 2 ? '核心修复焦点代理信号可见' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 30).slice(0, 8),
    issue: delivered ? '' : '核心修复焦点没有落成正文中的事件、规则判定、选择、代价或章末问题。',
    repair_instruction: delivered ? '' : '补修复焦点：把 repair_focus 改写进现场事件和章尾承接，不要只用解释性旁白交代。',
  }
}

function normalizeCoreContractPeriodicSellingPointCheck(periodicDriftCheck: any, fallbackPoints: any, chapterText: string) {
  const check = normalizeCoreContractPeriodicDriftCheck(periodicDriftCheck)
  if (!check?.due) return null
  const planned = uniqueBriefStrings([
    check.selling_points,
    fallbackPoints,
  ], 8)
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const matchedItems = scored.filter(item => item.match.score >= 34).length
  const text = String(chapterText || '')
  const proxySignals = [
    /核心卖点|卖点|吸引读者/.test(text),
    /超人|力量|蛮力|金手指|系统|能力/.test(text),
    /规则|判定|反制|限制|代价|信息差/.test(text),
  ].filter(Boolean).length
  const delivered = matchedItems > 0 || proxySignals >= 2
  return {
    key: 'ten_chapter_selling_point',
    label: '十章卖点复核',
    text: planned.join('；') || check.question,
    expected: planned.join('；') || check.question,
    score: delivered ? Math.max(84, matchedItems ? Math.round((matchedItems / Math.max(1, planned.length)) * 100) : 84) : 24,
    evidence: delivered
      ? uniqueBriefStrings([
          ...scored.flatMap(item => item.match.matched),
          proxySignals >= 2 ? '核心吸引元素代理信号可见' : '',
        ], 8)
      : [],
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : (planned.length ? planned : [check.question]).slice(0, 8),
    issue: delivered ? '' : '第十章复核未看到最初吸引读者的核心卖点，存在卖点被稀释或替换风险。',
    repair_instruction: delivered ? '' : '按 oh-story 核心卖点偏移诊断修复：把当初吸引读者的卖点重新写成冲突、能力使用、规则限制、读者回报或章末新期待。',
  }
}

function coreContractRoleText(project: any, chapter: any, contextPackage: any) {
  const target = contextPackage?.chapter_target || {}
  return uniqueBriefStrings([
    target.chapter_role,
    target.chapterRole,
    target.role,
    target.story_unit_context?.current_chapter_role,
    target.storyUnitContext?.currentChapterRole,
    target.volume_climax_brief?.current_chapter_role,
    target.volumeClimaxBrief?.currentChapterRole,
    contextPackage?.story_unit_context?.current_chapter_role,
    contextPackage?.storyUnitContext?.currentChapterRole,
    chapter?.title,
    project?.current_chapter_role,
  ], 12).join('；')
}

function isCoreContractFinaleChapter(project: any, chapter: any, contextPackage: any) {
  const target = contextPackage?.chapter_target || {}
  if (target.is_finale === true || target.isFinale === true || chapter?.is_finale === true || chapter?.isFinale === true) return true
  const roleText = coreContractRoleText(project, chapter, contextPackage)
  if (/不是(?:终局|大结局|最终章|收官)|非(?:终局|大结局|最终章|收官)|不(?:是)?终局收束/.test(roleText)) return false
  return /大结局|最终章|终局|终章|收官|完结章|全书收束/.test(roleText)
}

function hasCoreConflictRhythmRule(radar: any, contextPackage: any) {
  const target = contextPackage?.chapter_target || {}
  const ruleText = uniqueBriefStrings([
    target.core_conflict,
    target.coreConflict,
    target.reader_promise,
    target.readerPromise,
    ...coreContractArray(radar?.must_serve),
    ...coreContractArray(radar?.no_drift),
    ...coreContractArray(radar?.repair_focus),
    ...asArray(radar?.checks).map((item: any) => item?.label || item?.reason || item?.key),
  ], 18).join('；')
  return /核心冲突|核心矛盾|非大结局|大结局|局部胜利|代价|风险|全书|主线/.test(ruleText)
}

function buildCoreConflictRhythmProtectionCheck(project: any, chapter: any, contextPackage: any, chapterText: string, radar: any) {
  if (!hasCoreConflictRhythmRule(radar, contextPackage)) return null
  if (isCoreContractFinaleChapter(project, chapter, contextPackage)) return null

  const text = String(chapterText || '')
  const endingTail = text.slice(Math.max(0, text.length - 260))
  const pressureTail = endingTail.replace(/再无威胁|没有威胁|无威胁|不会再压迫/g, '')
  const closurePattern = /彻底解决|彻底终结|完全解决|核心矛盾(?:已经|彻底)?(?:解决|终结)|核心冲突(?:已经|彻底)?(?:解决|终结)|主线(?:已经|彻底)?(?:完成|收束|完结)|幕后黑手(?:全部|已经)?伏法|最终击败|全书主线完成|从此(?:再无|不再)|再无威胁|不会再压迫/
  const newPressurePattern = /但|可是|然而|否则|却|新的|下一|代价|风险|威胁|追杀|倒计时|必须|不得不|三日内|天亮前|亮起|传来|名单|令牌|裂纹|第二个|第三个|要求|交出|废除|暴露|盯上/
  const hasPrematureClosure = closurePattern.test(text)
  const keepsPressureAlive = newPressurePattern.test(pressureTail)
  if (!hasPrematureClosure || keepsPressureAlive) return null

  return {
    key: 'core_conflict_premature_resolution',
    label: '核心冲突节奏保护',
    text: '非大结局章节禁止彻底解决全书核心冲突。',
    expected: '局部胜利必须伴随新的代价、风险或下一条期待线。',
    score: 42,
    evidence: uniqueBriefStrings([
      text.match(closurePattern)?.[0] || '正文出现核心冲突收束语',
      '章尾未检测到新的代价、风险或下一步压力',
    ], 4),
    delivered: false,
    status: 'warn',
    missed_items: ['非大结局章节过早解决核心冲突'],
    issue: '正文把核心冲突写成彻底收束，但章尾没有留下新的代价、风险或期待线。',
    repair_instruction: '按 oh-story 核心冲突节奏保护重写：保留局部胜利，同时补一个新的代价、风险、倒计时或下一步压力。',
  }
}

export function buildCoreContractDeterministicCheck(chapterText: string) {
  const text = String(chapterText || '')
  const risks = [
    /完全偏离核心契约|偏离核心契约/.test(text) ? {
      key: 'explicit_core_drift',
      label: '显式偏离',
      evidence: '正文直接承认偏离核心契约。',
      fix: '回到核心承诺、主线目标和本章任务书重写关键场景。',
    } : null,
    /规则怪谈写成纯打怪|写成纯打怪|纯打怪/.test(text) ? {
      key: 'genre_redline_touched',
      label: '题材红线',
      evidence: '规则怪谈被写成纯打怪。',
      fix: '补规则判定、信息差和规则反制，不能只靠战斗解决。',
    } : null,
    /靠蛮力无代价通关|蛮力无代价通关/.test(text) && !/没有靠蛮力无代价通关|不靠蛮力无代价通关/.test(text) ? {
      key: 'no_cost_power_clear',
      label: '无代价通关',
      evidence: '主角靠蛮力无代价通关，削弱规则反制承诺。',
      fix: '让蛮力触发判定限制、反噬、资源损耗或下一步代价。',
    } : null,
    /广播来源没有推进|主线没有推进|没有推进/.test(text) ? {
      key: 'mainline_no_progress',
      label: '主线停滞',
      evidence: '核心主线或广播来源没有推进。',
      fix: '章末必须给出新线索、新问题、新名单或下一步行动压力。',
    } : null,
  ].filter(Boolean)
  if (!risks.length) return null
  return {
    key: 'core_contract_forbidden',
    label: '核心契约硬伤',
    text: '核心契约不得偏离全书承诺、触碰红线、无代价通关或让主线停滞。',
    expected: '核心契约不得偏离全书承诺、触碰红线、无代价通关或让主线停滞。',
    score: Math.max(0, 100 - risks.length * 24),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项核心契约确定性风险。`,
    repair_instruction: '按 oh-story 核心契约修复：守住全书承诺、题材红线、主角驱动和章末主线推进。',
  }
}

function coreContractPriority(missed: any[]) {
  if (missed.some(item => item.key === 'core_conflict_premature_resolution')) return '优先守核心节奏'
  if (missed.some(item => item.key === 'ten_chapter_selling_point')) return '优先补核心卖点'
  if (missed.some(item => item.key === 'selling_point_execution_rules')) return '优先补卖点执行'
  if (missed.some(item => item.key === 'commercial_rhythm_rules')) return '优先校准商业节奏'
  if (missed.some(item => item.key === 'goldfinger_structure_rules')) return '优先修金手指结构'
  if (missed.some(item => item.key === 'repetition_strategy_rules')) return '优先升级重复策略'
  if (missed.some(item => item.key === 'launch_pressure_rules')) return '优先补开篇压力'
  if (missed.some(item => item.key === 'core_contract_forbidden')) return '优先清核心硬伤'
  if (missed.some(item => item.key === 'theme_unity_rules')) return '优先守主题统一'
  if (missed.some(item => item.key === 'no_drift')) return '优先修核心漂移'
  if (missed.some(item => item.key === 'must_serve')) return '优先补核心承诺'
  if (missed.some(item => item.key === 'repair_focus')) return '优先补修复焦点'
  return ''
}

