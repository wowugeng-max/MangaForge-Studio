import {
  anchorMatchScore,
} from '../../novel-writing/text-matching'
import {
  asArray,
} from '../../routes/novel-route-utils'
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
  buildOhStoryPlotSpecialTopicsContract,
} from '../../routes/novel-plot-special-topics'
import {
  compactBriefText,
  uniqueBriefStrings,
} from '../quality/text-utils'
import {
  getContextContract,
} from '../context/context-contract'
import {
  contextWithChapterRawPreDraftForSync,
} from './quality-sync-reports-benchmark'

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

