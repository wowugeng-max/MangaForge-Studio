import { createHash } from 'crypto'
import {
  appendNovelRun,
  createNovelChapter,
  createNovelCharacter,
  createNovelOutline,
  createNovelProject,
  createNovelReview,
  createNovelWorldbuilding,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  listNovelSettingEntities,
  listNovelWorldbuilding,
  updateNovelOutline,
  updateNovelProject,
} from '../../novel'
import { readKeys } from '../../key-store'
import { readModels } from '../../model-store'
import { readProviders } from '../../provider-store'
import { executeNovelAgent } from '../../llm'
import { asArray, compactText, parseJsonLikePayload, safeJsonStringify } from '../novel-route-utils'

import { textHash } from './builders-core'

export function buildFirst30RetentionDiagnosis(project: any, chapters: any[], outlines: any[], characters: any[], reviews: any[]) {
  const sorted = chapters.slice().sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
  const first30 = sorted.filter(chapter => Number(chapter.chapter_no || 0) >= 1 && Number(chapter.chapter_no || 0) <= 30)
  const bible = project.reference_config?.writing_bible || {}
  const promiseText = [
    project.title,
    project.genre,
    project.summary,
    bible.reader_promise,
    bible.core_selling_point,
    bible.commercial_positioning,
    bible.hook,
    bible.cool_point,
    outlineText(outlines.slice(0, 30)),
  ].filter(Boolean).join('\n')
  const risks: any[] = []
  const addRisk = (severity: string, segment: string, issue: string, action: string) => {
    risks.push({ severity, segment, issue, action })
  }
  const promiseReady = wc(promiseText) >= 120 && includesAny(promiseText, ['爽', '冲突', '目标', '代价', '秘密', '升级', '反转', '悬念', '压迫', '金手指'])
  if (!promiseReady) addRisk('high', '定位', '读者承诺/商业卖点不够清晰。', '先补一句能解释主角凭什么持续变强、读者每章为什么追读的核心承诺。')
  if (first30.length < 10) addRisk('high', '1-10', `前10章素材不足，当前只有 ${first30.length} 章。`, '至少补齐前10章标题、目标、章末钩子和正文/摘要，再判断留存。')
  if (first30.length < 30) addRisk('medium', '11-30', `前30章样本不足，当前只有 ${first30.length} 章。`, '补齐第11-30章的阶段目标和付费前持续钩子。')

  const firstChapter = first30[0]
  if (!firstChapter?.chapter_text && !firstChapter?.chapter_summary) {
    addRisk('high', '1-3', '第一章缺正文或摘要，无法验证开篇吸引力。', '第一章必须直接呈现压力、异常、主角选择或强情绪结果。')
  } else {
    const firstText = [firstChapter.title, firstChapter.chapter_goal, firstChapter.chapter_summary, firstChapter.ending_hook, chapterSnippet(firstChapter, 1000)].join('\n')
    if (!includesAny(firstText, ['危', '死', '杀', '输', '退婚', '羞辱', '秘密', '系统', '天赋', '债', '局', '敌', '反转', '异变', '觉醒'])) {
      addRisk('high', '1-3', '第一章缺强压力、异常事件或可传播钩子。', '重写开篇前三页，把主角困境、异常资源和即时冲突前置。')
    }
    if (!firstChapter.ending_hook && !includesAny(firstText.slice(-260), ['却', '然而', '忽然', '没想到', '下一刻', '秘密', '门外', '身后'])) {
      addRisk('medium', '1-3', '第一章章末钩子偏弱。', '章末留下明确未解决问题或更大威胁，驱动读者点下一章。')
    }
  }

  const segmentDefs = [
    { key: '1-3', label: '开篇三章', min: 3, chapters: first30.filter(ch => Number(ch.chapter_no || 0) <= 3) },
    { key: '4-10', label: '试读十章', min: 7, chapters: first30.filter(ch => Number(ch.chapter_no || 0) >= 4 && Number(ch.chapter_no || 0) <= 10) },
    { key: '11-30', label: '付费前蓄势', min: 20, chapters: first30.filter(ch => Number(ch.chapter_no || 0) >= 11 && Number(ch.chapter_no || 0) <= 30) },
  ]
  const commercialKeywords = ['爽', '赢', '反杀', '突破', '奖励', '收获', '打脸', '震惊', '压迫', '危机', '秘密', '线索', '反转', '升级', '排名', '赌', '债', '追杀', '考核', '任务']
  const segments = segmentDefs.map(segment => {
    const rows = segment.chapters.map(chapter => {
      const text = [chapter.title, chapter.chapter_goal, chapter.chapter_summary, chapter.ending_hook, chapter.chapter_text].filter(Boolean).join('\n')
      const wordCount = wc(chapter.chapter_text || '')
      const hasGoal = wc(chapter.chapter_goal || chapter.chapter_summary || '') >= 20
      const hasHook = wc(chapter.ending_hook || '') >= 8 || includesAny(text.slice(-320), ['却', '然而', '忽然', '没想到', '下一刻', '身后', '门外', '消息'])
      const payoffHits = commercialKeywords.filter(word => text.includes(word)).length
      const repeated = topRepeatedPhrases(chapter.chapter_text || '').length
      const missingText = !chapter.chapter_text
      const score = Math.max(0, Math.min(100,
        42
        + (hasGoal ? 16 : 0)
        + (hasHook ? 16 : 0)
        + Math.min(18, payoffHits * 3)
        + (wordCount >= 1800 ? 8 : wordCount >= 900 ? 4 : 0)
        - (missingText ? 30 : 0)
        - Math.min(12, repeated * 3),
      ))
      return {
        chapter_id: chapter.id,
        chapter_no: chapter.chapter_no,
        title: chapter.title,
        word_count: wordCount,
        has_goal: hasGoal,
        has_hook: hasHook,
        payoff_hits: payoffHits,
        repeated_phrase_groups: repeated,
        score,
        flags: [
          missingText ? '缺正文' : '',
          !hasGoal ? '目标不清' : '',
          !hasHook ? '章末钩子弱' : '',
          payoffHits < 2 ? '爽点/悬念信号少' : '',
          repeated >= 2 ? '重复表达偏多' : '',
        ].filter(Boolean),
      }
    })
    const coverage = Math.min(100, Math.round((segment.chapters.length / segment.min) * 100))
    const goalRate = rows.length ? Math.round(rows.filter(row => row.has_goal).length / rows.length * 100) : 0
    const hookRate = rows.length ? Math.round(rows.filter(row => row.has_hook).length / rows.length * 100) : 0
    const payoffAverage = rows.length ? Number((rows.reduce((sum, row) => sum + row.payoff_hits, 0) / rows.length).toFixed(1)) : 0
    const score = Math.round((coverage * 0.25) + (goalRate * 0.2) + (hookRate * 0.25) + Math.min(100, payoffAverage * 22) * 0.3)
    if (coverage < 80) addRisk(segment.key === '1-3' ? 'high' : 'medium', segment.key, `${segment.label}覆盖不足。`, `补齐${segment.label}的章节规划和正文样本。`)
    if (rows.length && hookRate < 70) addRisk(segment.key === '1-3' ? 'high' : 'medium', segment.key, `${segment.label}章末追读钩子覆盖率只有 ${hookRate}%。`, '为每章补“未解决问题/更大危险/利益诱惑”之一。')
    if (rows.length && payoffAverage < 2) addRisk('medium', segment.key, `${segment.label}每章爽点/悬念信号偏少。`, '每章至少安排一个可感知收益、风险升级、信息揭示或关系反转。')
    return { ...segment, chapter_count: segment.chapters.length, coverage, goal_rate: goalRate, hook_rate: hookRate, payoff_average: payoffAverage, score, rows }
  })
  const chapterCards = segments.flatMap(segment => segment.rows).sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
  const unresolvedReviewCount = reviews.filter(review => ['warn', 'blocked', 'fail'].includes(review.status)).length
  if (unresolvedReviewCount >= 3) addRisk('medium', '质量债务', `存在 ${unresolvedReviewCount} 条未处理审稿风险。`, '前30章留存优化前先处理高危审稿项，避免问题重复传播。')
  if (characters.filter(character => character.status !== 'archived').length < 3) addRisk('medium', '人物牵引', '活跃角色数量偏少，关系张力可能不足。', '至少明确主角、压迫者/竞争者、盟友或利益诱惑者的前30章作用。')
  const segmentAverage = segments.length ? Math.round(segments.reduce((sum, item) => sum + item.score, 0) / segments.length) : 0
  const score = Math.max(0, Math.min(100, segmentAverage - risks.reduce((sum, item) => sum + (item.severity === 'high' ? 7 : item.severity === 'medium' ? 3 : 1), 0)))
  return {
    report_id: `first30-${Date.now()}`,
    created_at: new Date().toISOString(),
    score,
    status: score >= 82 ? 'ready' : score >= 65 ? 'needs_repair' : 'blocked',
    summary: score >= 82 ? '前30章具备较好的追读基础。' : score >= 65 ? '前30章有商业化雏形，但关键留存点需要补强。' : '前30章留存风险较高，不建议直接批量生成正文。',
    positioning: {
      promise_ready: promiseReady,
      genre: project.genre || '',
      reader_promise: compactText(bible.reader_promise || bible.core_selling_point || project.summary || '', 180),
    },
    segments: segments.map(({ chapters: _chapters, ...item }) => item),
    risks,
    chapter_cards: chapterCards.slice(0, 30),
    next_actions: [
      !promiseReady ? '先补齐一句清晰读者承诺：主角目标、升级资源、核心矛盾、追读奖励。' : '',
      risks.some(item => item.segment === '1-3') ? '优先重做第1-3章：开篇压力、异常资源、章末钩子必须前置。' : '',
      risks.some(item => item.segment === '4-10') ? '梳理第4-10章试读闭环：每章必须有目标推进和结尾未解。' : '',
      risks.some(item => item.segment === '11-30') ? '补第11-30章阶段升级、竞争压力和付费前大钩子。' : '',
      '把本报告的高危项处理后，再运行未来10章滚动规划。',
    ].filter(Boolean),
  }
}

export function buildFirst30RetentionRepairTasks(report: any) {
  const tasks: any[] = []
  const addTask = (task: any) => {
    if (!tasks.some(item => item.task_id === task.task_id)) tasks.push(task)
  }
  const risks = asArray(report?.risks)
  for (const risk of risks.filter((item: any) => ['high', 'medium'].includes(String(item.severity || '')))) {
    addTask({
      task_id: `first30-risk-${String(risk.segment || 'global').replace(/\W+/g, '-')}-${textHash(`${risk.issue || ''}${risk.action || ''}`)}`,
      task_type: 'retention_risk',
      severity: risk.severity,
      segment: risk.segment || '全局',
      title: `${risk.segment || '全局'}留存风险修复`,
      message: risk.issue || '',
      action: risk.action || '打开前30章诊断，按风险项补齐。',
      acceptance_criteria: [
        '风险对应章节或分段已补齐目标、冲突、爽点/悬念和章末钩子。',
        '重新运行前30章留存诊断后，该分段不再出现同类高危风险。',
      ],
    })
  }
  for (const row of asArray(report?.chapter_cards).filter((item: any) => Number(item.score || 0) < 72 || asArray(item.flags).length > 0)) {
    const flags = asArray(row.flags)
    addTask({
      task_id: `first30-chapter-${row.chapter_id || row.chapter_no}-${textHash(flags.join('|') || String(row.score || 0))}`,
      task_type: 'chapter_retention_patch',
      chapter_id: row.chapter_id || null,
      chapter_no: row.chapter_no || null,
      title: `第${row.chapter_no || '-'}章留存补丁`,
      issue_type: flags.join('、') || '留存分偏低',
      severity: Number(row.score || 0) < 60 ? 'high' : 'medium',
      message: flags.length ? flags.join('、') : `章节留存分 ${row.score}`,
      action: [
        flags.includes('目标不清') ? '补明确章节目标和主角选择。' : '',
        flags.includes('章末钩子弱') ? '重做章末未解决问题、威胁升级或利益诱惑。' : '',
        flags.includes('爽点/悬念信号少') ? '增加一个可感知收益、信息揭示、关系反转或风险升级。' : '',
        flags.includes('缺正文') ? '进入章节流水线生成正文。' : '',
        flags.includes('重复表达偏多') ? '局部修订重复表达，降低机器感。' : '',
      ].filter(Boolean).join(' ') || '打开章节做局部留存修订。',
      acceptance_criteria: [
        '章节目标、即时冲突和章末钩子可被一句话说清。',
        '章节至少包含一个爽点、悬念揭示、风险升级或关系反转。',
      ],
    })
  }
  return tasks
    .sort((a, b) => (a.severity === 'high' ? -1 : 0) - (b.severity === 'high' ? -1 : 0))
    .slice(0, 80)
}

function latestReportByKey(reviews: any[], reviewType: string, payloadKey: string) {
  const rows = asArray(reviews)
    .filter(review => review?.review_type === reviewType)
    .sort((a, b) => Date.parse(String(b.created_at || '')) - Date.parse(String(a.created_at || '')))
  const payload = parseJsonLikePayload(rows[0]?.payload) || {}
  return payload[payloadKey] || payload.report || payload.result?.[payloadKey] || payload.result?.report || payload.result || payload
}

function segmentTrialScore(chapters: any[], chapterNos: number[]) {
  const selected = chapters.filter(chapter => chapterNos.includes(Number(chapter.chapter_no || 0)))
  if (!selected.length) return { score: 0, chapter_count: 0, hook_rate: 0, payoff_average: 0, weak_chapters: [] as any[] }
  const payoffWords = ['爽', '赢', '反杀', '突破', '奖励', '收获', '打脸', '震惊', '压迫', '危机', '秘密', '线索', '反转', '升级', '资格', '排名', '真相']
  const rows = selected.map(chapter => {
    const body = [chapter.title, chapter.chapter_goal, chapter.chapter_summary, chapter.ending_hook, chapter.chapter_text].filter(Boolean).join('\n')
    const wordCount = wc(chapter.chapter_text || '')
    const hasHook = wc(chapter.ending_hook || '') >= 8 || includesAny(body.slice(-360), ['却', '然而', '忽然', '没想到', '下一刻', '身后', '门外', '消息'])
    const payoffHits = payoffWords.filter(word => body.includes(word)).length
    const score = Math.max(0, Math.min(100, 42 + (hasHook ? 18 : 0) + Math.min(24, payoffHits * 3) + (wordCount >= 1800 ? 16 : wordCount >= 900 ? 8 : 0) - (!chapter.chapter_text ? 28 : 0)))
    return {
      chapter_no: chapter.chapter_no,
      title: chapter.title,
      score,
      has_hook: hasHook,
      payoff_hits: payoffHits,
      word_count: wordCount,
    }
  })
  const hookRate = Math.round(rows.filter(row => row.has_hook).length / rows.length * 100)
  const payoffAverage = Number((rows.reduce((sum, row) => sum + row.payoff_hits, 0) / rows.length).toFixed(1))
  return {
    score: Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length),
    chapter_count: rows.length,
    hook_rate: hookRate,
    payoff_average: payoffAverage,
    weak_chapters: rows.filter(row => row.score < 72).slice(0, 6),
  }
}

function personaRiskLevel(score: number) {
  if (score >= 82) return 'low'
  if (score >= 68) return 'medium'
  return 'high'
}

export function buildReaderTrialReview(project: any, chapters: any[], outlines: any[], reviews: any[]) {
  const sorted = chapters.slice().sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
  const written = sorted.filter(chapter => String(chapter.chapter_text || '').trim())
  const recentWritten = written.slice(-10)
  const first30 = latestReport(reviews, 'first30_retention_diagnosis')
  const expectation = latestReportByKey(reviews, 'reader_expectation_sync', 'reader_expectation_sync')
  const payoff = latestReportByKey(reviews, 'reader_payoff_sync', 'reader_payoff_sync')
  const innovation = latestReportByKey(reviews, 'innovation_sync', 'innovation_sync')
  const readability = latestReportByKey(reviews, 'readability_review', 'readability_review')
  const first3Local = segmentTrialScore(sorted, [1, 2, 3])
  const first10Local = segmentTrialScore(sorted, Array.from({ length: 10 }).map((_, index) => index + 1))
  const recentLocal = segmentTrialScore(recentWritten, recentWritten.map(chapter => Number(chapter.chapter_no || 0)))
  const first30Score = Number(first30?.score || 0)
  const first3Score = Number(asArray(first30?.segments).find((item: any) => String(item.key) === '1-3')?.score || first3Local.score || first30Score || 0)
  const first10Score = Number(asArray(first30?.segments).find((item: any) => String(item.key) === '4-10')?.score || first10Local.score || first30Score || 0)
  const expectationMissed = asArray(expectation?.missed)
  const payoffDebts = [...asArray(payoff?.missed), ...asArray(payoff?.debts)]
  const innovationMissed = asArray(innovation?.missed)
  const immersionRisks = asArray(readability?.meme_sense?.immersion_risks || readability?.immersion_risks)
  const expectationScore = Number(expectation?.score || (expectationMissed.length ? 70 : 84))
  const payoffScore = Number(payoff?.score || (payoffDebts.length ? 70 : 84))
  const innovationScore = Number(innovation?.score || (innovationMissed.length ? 72 : 84))
  const readabilityScore = Number(readability?.readability_score || readability?.score || (immersionRisks.length ? 72 : 84))
  const trialScore = first30Score || Math.round((first3Score + first10Score + recentLocal.score) / 3)
  const rawScore = (trialScore * 0.34)
    + (Math.min(expectationScore, payoffScore) * 0.24)
    + (innovationScore * 0.18)
    + (readabilityScore * 0.12)
    + (Math.max(first3Score, recentLocal.score || first3Score) * 0.12)
  const debtPenalty = Math.min(16, expectationMissed.length * 4 + payoffDebts.length * 3 + innovationMissed.length * 3 + immersionRisks.length * 3)
  const score = Math.max(0, Math.min(100, Math.round(rawScore - debtPenalty)))
  const status = score >= 82 && !expectationMissed.length && !payoffDebts.length && !innovationMissed.length && !immersionRisks.length
    ? 'ready'
    : score < 65 || first3Score < 65
      ? 'blocked'
      : 'needs_repair'
  const promise = compactText(project.reference_config?.writing_bible?.reader_promise || project.reference_config?.writing_bible?.core_selling_point || project.summary || '', 180)
  const dropPoints = [
    first3Score < 72 ? `前三章试读压力不足：${first3Score} 分。` : '',
    first10Score < 72 ? `第4-10章试读闭环偏弱：${first10Score} 分。` : '',
    ...expectationMissed.slice(0, 3).map((item: any) => `期待欠账：${item.text || item.summary || item.label || item}`),
    ...payoffDebts.slice(0, 3).map((item: any) => `回报欠账：${item.text || item.summary || item.label || item}`),
    ...innovationMissed.slice(0, 3).map((item: any) => `创新缺口：${item.text || item.summary || item.label || item}`),
    ...immersionRisks.slice(0, 2).map((item: any) => `出戏风险：${item.description || item.text || item}`),
  ].filter(Boolean)
  const repairActions = [
    first3Score < 72 ? '重做前三章开篇压力、异常资源和章末未解问题。' : '',
    first10Score < 72 ? '补强第4-10章每章目标推进、爽点回报和章末钩子。' : '',
    expectationMissed.length ? '把期待欠账写入下一章任务书，形成可见推进或明确延期理由。' : '',
    payoffDebts.length ? '把回报欠账补成可见收益、信息揭示、身份变化或关系反转。' : '',
    innovationMissed.length ? '把创新卖点写成动作、机制代价、反差场面或 IP 化画面。' : '',
    immersionRisks.length ? '降低严肃/恐怖/爆点场景中的玩梗强度，修段落密度和口吻。' : '',
  ].filter(Boolean)
  const pullPoints = [
    promise ? `读者承诺：${promise}` : '',
    first30Score >= 80 ? `前30章留存基线 ${first30Score} 分。` : '',
    first3Score >= 80 ? `前三章试读钩子 ${first3Score} 分。` : '',
    asArray(expectation?.keep_alive).length ? `保留悬念：${asArray(expectation?.keep_alive).slice(0, 2).map((item: any) => item.text || item.summary || item.label || item).join('；')}` : '',
  ].filter(Boolean)

  return {
    report_id: `reader-trial-${Date.now()}`,
    created_at: new Date().toISOString(),
    quality_bar: 'qidian_10k_reader_trial_baseline',
    quality_bar_label: '起点1万均订试读基准',
    score,
    status,
    summary: status === 'ready'
      ? '读者试读吸引力达到稳定追读基础。'
      : status === 'blocked'
        ? '读者试读存在高危弃读点，不建议继续批量生成。'
        : '读者试读有追读基础，但仍存在需要修复的弃读点。',
    personas: [
      {
        key: 'payoff_reader',
        label: '爽点读者',
        focus: '每章是否有可感知收益、反杀、打脸、升级或信息回报。',
        score: Math.round((payoffScore + trialScore) / 2),
        risk_level: personaRiskLevel(Math.round((payoffScore + trialScore) / 2)),
        verdict: payoffDebts.length ? `爽点/回报欠账 ${payoffDebts.length} 项。` : '爽点回报暂时可支撑追读。',
      },
      {
        key: 'plot_reader',
        label: '剧情党',
        focus: '主线压力、目标推进和章末未解问题是否连续。',
        score: Math.round((expectationScore + first10Score) / 2),
        risk_level: personaRiskLevel(Math.round((expectationScore + first10Score) / 2)),
        verdict: expectationMissed.length ? `读者期待漏兑现 ${expectationMissed.length} 项。` : '剧情期待兑现暂时可控。',
      },
      {
        key: 'setting_reader',
        label: '设定党',
        focus: '能力体系、规则代价、世界资产和创新机制是否新鲜且不乱。',
        score: innovationScore,
        risk_level: personaRiskLevel(innovationScore),
        verdict: innovationMissed.length ? `创新/设定执行缺口 ${innovationMissed.length} 项。` : '创新设定有可继续展开的基础。',
      },
      {
        key: 'trial_reader',
        label: '平台试读用户',
        focus: '前三章能否抓住人，前十章是否让读者愿意继续追。',
        score: Math.round((first3Score + first10Score) / 2),
        risk_level: personaRiskLevel(Math.round((first3Score + first10Score) / 2)),
        verdict: first10Score < 72 ? '试读十章存在弃读风险，需要补目标、爽点和章末钩子。' : '试读段落具备继续点击下一章的基础。',
      },
    ],
    segments: [
      { key: '1-3', label: '开篇三章', ...first3Local, score: first3Score, verdict: first3Score >= 80 ? '开篇钩子较稳。' : '开篇压力、异常资源或章末钩子需要补强。' },
      { key: '1-10', label: '试读十章', ...first10Local, score: first10Score, verdict: first10Score >= 80 ? '试读闭环较稳。' : '第4-10章需要补目标推进、回报和未解问题。' },
      { key: 'recent10', label: '最近十章', ...recentLocal, score: recentLocal.score || trialScore, verdict: recentLocal.score >= 80 ? '近期追读节奏较稳。' : '近期存在疲劳或回报密度风险。' },
    ],
    drop_points: dropPoints.length ? dropPoints : ['暂无明显弃读点，但仍建议保持每章目标、回报和章末钩子。'],
    pull_points: pullPoints.length ? pullPoints : ['需要先补齐读者承诺、前三章试读和爽点回报证据。'],
    repair_actions: repairActions.length ? repairActions : ['保持章节任务书、场景卡、质检、故事状态同步和试读复盘闭环。'],
    source_reports: {
      first30_retention_score: first30Score || null,
      expectation_score: expectationScore || null,
      payoff_score: payoffScore || null,
      innovation_score: innovationScore || null,
      readability_score: readabilityScore || null,
    },
  }
}

function parseChapterNoFromText(value: any) {
  const raw = String(value || '')
  const match = raw.match(/第\s*(\d+)\s*章/i) || raw.match(/chapter\s*(\d+)/i)
  return match ? Number(match[1]) : null
}

export function buildReaderTrialRepairTasks(report: any) {
  const dropPoints = asArray(report?.drop_points || report?.dropPoints).map(item => String(item || '').trim()).filter(Boolean)
  const repairActions = asArray(report?.repair_actions || report?.repairActions).map(item => String(item || '').trim()).filter(Boolean)
  const personas = asArray(report?.personas)
  const segments = asArray(report?.segments)
  const tasks = dropPoints.map((dropPoint, index) => {
    const chapterNo = parseChapterNoFromText(dropPoint)
    const action = repairActions[index] || repairActions.find(item => chapterNo && item.includes(`第${chapterNo}章`)) || repairActions[0] || '按读者试读复盘修复弃读点，补足目标推进、爽点回报、章末钩子或创新执行。'
    const severity = /前三章|第1章|第2章|第3章|高危|弃读/.test(dropPoint) ? 'high' : 'medium'
    return {
      task_id: `reader-trial-${chapterNo || 'global'}-${textHash(`${dropPoint}${action}`)}`,
      task_type: 'repair_quality',
      source: 'reader_trial_review',
      issue_type: 'reader_trial_drop_point',
      severity,
      chapter_no: chapterNo,
      title: chapterNo ? `第${chapterNo}章读者试读弃读点修复` : '读者试读弃读点修复',
      message: dropPoint,
      action,
      task_status: 'open',
      reader_trial_review: {
        report_id: report?.report_id || '',
        score: report?.score ?? null,
        status: report?.status || '',
        summary: report?.summary || '',
        drop_points: [dropPoint],
        repair_actions: action ? [action] : [],
        personas: personas.slice(0, 4),
        segments: segments.slice(0, 3),
      },
      acceptance_criteria: [
        '弃读点已在对应章节修订为可见的目标推进、爽点回报、章末未解问题或创新场面。',
        '重新运行读者试读复盘后，同类弃读点不再出现，或风险等级明显降低。',
      ],
    }
  })
  return tasks.slice(0, 60)
}

