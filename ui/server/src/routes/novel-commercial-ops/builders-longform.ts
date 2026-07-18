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

import {
  wc,
  includesAny,
  outlineText,
  latestReport,
  buildDiagnosisDimension,
  countSettingTypes,
  buildLongformCompass,
} from './builders-shared'

export function buildLongformPressureTest(project: any, chapters: any[], outlines: any[], characters: any[], worldbuilding: any[], reviews: any[]) {
  const config = project.reference_config || {}
  const bible = config.writing_bible || {}
  const targetWordsInput = Number(project.target_words ?? project.targetWords ?? bible.target_words ?? bible.targetWords ?? 3000000)
  const targetWords = Math.max(3000000, Math.min(10000000, Number.isFinite(targetWordsInput) && targetWordsInput > 0 ? targetWordsInput : 3000000))
  const writtenChapters = chapters.filter(chapter => chapter.chapter_text)
  const writtenWords = writtenChapters.reduce((sum, chapter) => sum + wc(chapter.chapter_text || ''), 0)
  const avgWords = writtenChapters.length ? Math.round(writtenWords / writtenChapters.length) : 3000
  const estimatedChapters = {
    at_2500: Math.ceil(targetWords / 2500),
    at_3000: Math.ceil(targetWords / 3000),
    at_4000: Math.ceil(targetWords / 4000),
    based_on_current_average: Math.ceil(targetWords / Math.max(1200, avgWords)),
  }
  const state = config.story_state || {}
  const stateGlobal = state.global || state
  const volumeOutlines = outlines.filter(item => ['volume', 'arc', 'part'].includes(String(item.outline_type || '')))
  const chapterOutlines = outlines.filter(item => String(item.outline_type || '') === 'chapter')
  const longText = [
    project.summary,
    JSON.stringify(bible),
    JSON.stringify(state),
    outlineText(outlines),
    characters.map(item => [item.name, item.role, item.goal, item.motivation, item.secret, item.current_state].filter(Boolean).join(' ')).join('\n'),
    worldbuilding.map(item => [item.title, item.category, item.content, item.summary].filter(Boolean).join(' ')).join('\n'),
  ].join('\n')
  const weakPoints: any[] = []
  const addWeak = (severity: string, area: string, issue: string, action: string) => weakPoints.push({ severity, area, issue, action })
  const volumeCapacity = Math.min(100, volumeOutlines.length * 12 + chapterOutlines.length)
  const characterCapacity = Math.min(100, characters.filter(item => item.status !== 'archived').length * 9)
  const worldCapacity = Math.min(100, worldbuilding.length * 10)
  const conflictSignals = ['反派', '敌', '竞争', '宗门', '家族', '公司', '组织', '联盟', '阵营', '战争', '考核', '排名', '追杀', '债', '秘密', '阴谋', '规则']
  const expansionSignals = ['副本', '地图', '城市', '大陆', '世界', '职业', '境界', '体系', '产业', '学院', '门派', '公司', '案件', '赛季', '战场']
  const payoffSignals = ['升级', '突破', '奖励', '资源', '身份', '关系', '打脸', '反转', '真相', '收获', '权力', '财富']
  const conflictScore = Math.min(100, conflictSignals.filter(word => longText.includes(word)).length * 8)
  const expansionScore = Math.min(100, expansionSignals.filter(word => longText.includes(word)).length * 9)
  const payoffScore = Math.min(100, payoffSignals.filter(word => longText.includes(word)).length * 8)
  const storyStateFresh = Number(state.last_updated_chapter || 0) >= Math.max(0, ...writtenChapters.map(chapter => Number(chapter.chapter_no || 0))) - 1
  const reviewDebt = reviews.filter(review => ['warn', 'blocked', 'fail'].includes(review.status)).length
  const first30Report = latestReport(reviews, 'first30_retention_diagnosis')
  const first30Score = Number(first30Report?.score || 0)
  const activeCharacterCount = characters.filter(item => item.status !== 'archived').length
  const characterStates = asArray(state.characters || stateGlobal.characters)
  const openQuestions = [
    ...asArray(state.open_questions),
    ...asArray(stateGlobal.open_questions),
  ]
  const payoffDebts = [
    ...asArray(state.payoff_queue),
    ...asArray(state.payoff_debts),
    ...asArray(stateGlobal.payoff_queue),
    ...asArray(stateGlobal.payoff_debts),
  ]
  const stateVersion = String(state.version || state.state_version || stateGlobal.version || stateGlobal.state_version || '').trim()
  const memoryCanonStatus = !storyStateFresh
    ? 'block'
    : stateVersion || characterStates.length || openQuestions.length || payoffDebts.length
      ? 'ok'
      : 'warn'
  const stressGate = (key: string, label: string, status: string, detail: string, evidence: any[]) => ({
    key,
    label,
    status,
    detail,
    evidence: evidence.map(item => String(item || '').trim()).filter(Boolean).slice(0, 5),
  })
  const chapter30Status = first30Score >= 80 && writtenChapters.length >= 30
    ? 'ok'
    : first30Score >= 65 || writtenChapters.length >= 10
      ? 'warn'
      : 'block'
  const chapter100Status = chapterOutlines.length >= 100 && volumeOutlines.length >= 3
    ? 'ok'
    : chapterOutlines.length >= 50 || outlines.length >= 100
      ? 'warn'
      : 'block'
  const chapter300Status = volumeOutlines.length >= 8 && activeCharacterCount >= 10 && worldbuilding.length >= 8 && expansionScore >= 50
    ? 'ok'
    : volumeOutlines.length >= 4 && activeCharacterCount >= 6 && worldbuilding.length >= 4
      ? 'warn'
      : 'block'
  const stressGates = [
    stressGate(
      'chapter_30',
      '30章试读段',
      chapter30Status,
      first30Score ? `前30章留存 ${first30Score} 分，已写 ${writtenChapters.length} 章。` : `前30章试读段缺留存报告，已写 ${writtenChapters.length} 章。`,
      [first30Report?.summary, first30Score ? `前30章 ${first30Score}分` : '前30章未诊断'],
    ),
    stressGate(
      'chapter_100',
      '100章卷级闭环',
      chapter100Status,
      `未来100章储备：章节大纲 ${chapterOutlines.length} 条，分卷/阶段 ${volumeOutlines.length} 个。`,
      [`章节大纲 ${chapterOutlines.length}`, `分卷/阶段 ${volumeOutlines.length}`],
    ),
    stressGate(
      'chapter_300',
      '300章扩容引擎',
      chapter300Status,
      `300章扩容需要分卷、人物池、世界资产和地图/规则引擎轮转；当前分卷 ${volumeOutlines.length}、角色 ${activeCharacterCount}、世界资产 ${worldbuilding.length}。`,
      [`扩展信号 ${expansionScore}`, `冲突阶梯 ${conflictScore}`, `回报循环 ${payoffScore}`],
    ),
    stressGate(
      'memory_canon',
      '正史记忆/版本',
      memoryCanonStatus,
      storyStateFresh
        ? `故事状态同步到第${Number(state.last_updated_chapter || 0)}章，正史记忆可回溯。`
        : `故事状态同步到第${Number(state.last_updated_chapter || 0)}章，落后于已写正文。`,
      [stateVersion ? `版本 ${stateVersion}` : '', `角色状态 ${characterStates.length}`, `开放悬念 ${openQuestions.length}`, `回报债 ${payoffDebts.length}`],
    ),
  ]
  const memoryCanonAudit = {
    status: memoryCanonStatus,
    latest_state_chapter: Number(state.last_updated_chapter || 0),
    state_version: stateVersion,
    character_state_count: characterStates.length,
    open_question_count: openQuestions.length,
    payoff_debt_count: payoffDebts.length,
    story_state_fresh: storyStateFresh,
    summary: memoryCanonStatus === 'ok'
      ? '状态机、角色状态、开放悬念和回报债具备长跑回溯基础。'
      : memoryCanonStatus === 'block'
        ? '故事状态机落后于正文，必须先同步正史记忆。'
        : '正史记忆缺少版本、角色状态、开放悬念或回报债，建议首测前补齐。',
  }

  if (volumeOutlines.length < 8) addWeak('high', '分卷结构', `分卷/阶段不足，当前 ${volumeOutlines.length} 个。`, '按300万字目标至少拆出8-12个大阶段，每阶段有目标、反派压力、地图/身份变化和结算奖励。')
  if (chapterOutlines.length < 80) addWeak('medium', '章节储备', `章节级大纲储备偏少，当前 ${chapterOutlines.length} 条。`, '先做未来100章骨架，避免日更时现想主线。')
  if (characters.filter(item => item.status !== 'archived').length < 10) addWeak('high', '人物池', '活跃角色池不足，长篇关系张力会很快耗尽。', '补主角团、竞争者、阶段反派、资源提供者、读者情绪出口角色。')
  if (worldbuilding.length < 8) addWeak('medium', '世界/题材资产', '世界观/组织/规则资产不足。', '补地图、组织、职业/境界、资源、禁忌、公共事件等可复用资产。')
  if (conflictScore < 55) addWeak('high', '冲突阶梯', '反派/组织/竞争压力信号不足。', '设计从小压迫者到大组织的阶梯，确保每卷都有更高层压力。')
  if (expansionScore < 50) addWeak('medium', '扩展机制', '地图、规则或副本扩展信号不足。', '引入可不断扩容的空间：地图、职业、案件、副本、产业或势力版图。')
  if (payoffScore < 55) addWeak('medium', '回报循环', '升级/收益/身份跃迁信号不足。', '明确每3-5章小结算、每卷大结算，让读者看到持续收益。')
  if (!storyStateFresh && writtenChapters.length) addWeak('high', '状态机', '故事状态机落后于已写正文。', '继续批量生成前先同步角色位置、秘密暴露、道具归属和未解冲突。')
  if (reviewDebt >= 5) addWeak('medium', '质量债务', `未处理审稿风险较多：${reviewDebt} 条。`, '把高危审稿项转成修复任务，否则长篇问题会复利扩大。')

  const capacity = {
    written_words: writtenWords,
    written_chapters: writtenChapters.length,
    current_average_words_per_chapter: avgWords,
    volume_capacity: volumeCapacity,
    character_capacity: characterCapacity,
    world_capacity: worldCapacity,
    conflict_ladder: conflictScore,
    expansion_engine: expansionScore,
    payoff_loop: payoffScore,
    story_state_fresh: storyStateFresh,
    review_debt: reviewDebt,
  }
  const score = Math.max(0, Math.min(100, Math.round(
    volumeCapacity * 0.2
    + characterCapacity * 0.15
    + worldCapacity * 0.12
    + conflictScore * 0.18
    + expansionScore * 0.15
    + payoffScore * 0.12
    + (storyStateFresh ? 8 : 0)
    - weakPoints.reduce((sum, item) => sum + (item.severity === 'high' ? 5 : item.severity === 'medium' ? 2 : 1), 0),
  )))
  const volumePressure = volumeOutlines.slice(0, 20).map((item, index) => ({
    outline_id: item.id,
    order: index + 1,
    title: item.title,
    summary: compactText(item.summary || item.goal || '', 160),
    has_goal: wc(item.summary || item.goal || '') >= 30,
    has_conflict: includesAny([item.title, item.summary, item.conflict].filter(Boolean).join('\n'), conflictSignals),
    has_payoff: includesAny([item.title, item.summary, item.payoff].filter(Boolean).join('\n'), payoffSignals),
  }))
  return {
    report_id: `longform-${Date.now()}`,
    created_at: new Date().toISOString(),
    target_words: targetWords,
    target_words_range: { min: 3000000, max: 10000000 },
    score,
    status: score >= 80 ? 'scalable' : score >= 62 ? 'fragile' : 'blocked',
    summary: score >= 80 ? '具备长线扩容基础，可以进入百章骨架和日更流水线。' : score >= 62 ? '存在长篇潜力，但需要先补分卷、人物和冲突阶梯。' : '当前材料不足以支撑300万字以上长篇，直接生成会高度塌线。',
    estimated_chapters: estimatedChapters,
    capacity,
    stress_gates: stressGates,
    memory_canon_audit: memoryCanonAudit,
    weak_points: weakPoints,
    volume_pressure: volumePressure,
    expansion_plan: [
      { stage: '0-30章', goal: '验证开篇承诺、主角目标、爽点回报和追读钩子。', output: '前30章留存诊断通过后再扩。' },
      { stage: '31-100章', goal: '完成第一卷大闭环，建立核心能力边界和第一批稳定读者期待。', output: '未来100章骨架、阶段反派、卷末大结算。' },
      { stage: '100-300章', goal: '引入更高层组织/地图/规则，让冲突从个人升级到体系。', output: '3-4个卷级目标与角色关系变化表。' },
      { stage: '300章以后', goal: '用地图、势力、职业/境界、公共事件持续扩容。', output: '每卷新资源、新敌人、新身份、新代价。' },
    ],
    next_actions: [
      weakPoints.some(item => item.area === '分卷结构') ? '先补8-12个分卷/阶段目标，每卷写清冲突、爽点、卷末结算。' : '',
      weakPoints.some(item => item.area === '人物池') ? '补角色池和反派阶梯，确保每卷都有关系张力和竞争压力。' : '',
      weakPoints.some(item => item.area === '世界/题材资产') ? '补可复用世界资产：地图、组织、规则、资源、禁忌。' : '',
      !storyStateFresh ? '同步故事状态机后再继续批量生成。' : '',
      '用30/100/300章压力门复查核心承诺、卷级闭环、扩容引擎和正史记忆。',
      '建立“前30章诊断 -> 未来10章滚动规划 -> 机械质检 -> 传播债务”的日更循环。',
    ].filter(Boolean),
  }
}








export function buildLongformCreationDiagnosis(project: any, chapters: any[], outlines: any[], characters: any[], worldbuilding: any[], settingEntities: any[], reviews: any[]) {
  const bible = project.reference_config?.writing_bible || {}
  const storyState = project.reference_config?.story_state || {}
  const writtenChapters = chapters.filter(chapter => String(chapter.chapter_text || '').trim())
  const latestWrittenChapterNo = writtenChapters.reduce((max, chapter) => Math.max(max, Number(chapter.chapter_no || 0)), 0)
  const readerPromise = compactText(bible.reader_promise || bible.core_selling_point || project.summary || '', 220)
  const volumeOutlines = outlines.filter(item => ['volume', 'arc', 'part'].includes(String(item.outline_type || item.outline_level || '')))
  const chapterOutlines = outlines.filter(item => String(item.outline_type || item.outline_level || '') === 'chapter')
  const first30Report = latestReport(reviews, 'first30_retention_diagnosis')
  const pressureReport = latestReport(reviews, 'longform_pressure_test')
  const first30Score = Number(first30Report?.score || 0)
  const pressureScore = Number(pressureReport?.score || 0)
  const storylineCount = countSettingTypes(settingEntities, ['mainline', 'subplot', 'character_arc', 'relationship_arc', 'faction_arc', 'foreshadowing_arc'])
  const systemAssetCount = countSettingTypes(settingEntities, ['ability', 'item', 'faction', 'location', 'realm', 'rule', 'foreshadowing'])
  const activeCharacters = characters.filter(character => character.status !== 'archived')
  const longText = [
    project.title,
    project.genre,
    project.summary,
    JSON.stringify(bible),
    outlines.map(item => [item.title, item.summary, item.conflict, item.payoff].filter(Boolean).join(' ')).join('\n'),
    settingEntities.map(item => [item.name, item.summary, item.entity_type].filter(Boolean).join(' ')).join('\n'),
  ].join('\n')
  const conflictSignals = ['压迫', '敌', '竞争', '追杀', '考核', '阴谋', '危机', '代价', '规则', '组织', '势力']
  const innovationSignals = ['反转', '规则', '机制', '体系', '差异', '原创', '秘密', '金手指', '限制', '代价', '职业', '副本']
  const payoffSignals = ['爽', '升级', '突破', '奖励', '收获', '打脸', '身份', '真相', '财富', '权力', '关系']
  const conflictHits = conflictSignals.filter(word => longText.includes(word)).length
  const innovationHits = innovationSignals.filter(word => longText.includes(word)).length
  const payoffHits = payoffSignals.filter(word => longText.includes(word)).length
  const storyStateFresh = Number(storyState.last_updated_chapter || 0) >= Math.max(0, latestWrittenChapterNo - 1)

  const coreBlockers = [
    wc(readerPromise) < 28 ? '缺少可执行的读者承诺/核心卖点。' : '',
    volumeOutlines.length < 3 ? '分卷/阶段目标不足，长篇核心容易漂移。' : '',
    storylineCount < 2 ? '主线/支线/角色线资产不足。' : '',
  ].filter(Boolean)
  const coreWarnings = [
    !storyStateFresh && latestWrittenChapterNo > 0 ? '故事状态机落后于已写章节。' : '',
  ].filter(Boolean)
  const coreScore = 100
    - coreBlockers.length * 22
    - coreWarnings.length * 8
    + Math.min(8, storylineCount)

  const storyBlockers = [
    chapterOutlines.length < 30 && chapters.length < 30 ? '章节级规划不足，无法支撑长篇连续生产。' : '',
  ].filter(Boolean)
  const storyWarnings = [
    activeCharacters.length < 6 ? '活跃人物池偏薄，关系张力可能不足。' : '',
    conflictHits < 5 ? '冲突阶梯信号不足。' : '',
    pressureScore > 0 && pressureScore < 62 ? '长线压力测试未通过。' : '',
  ].filter(Boolean)
  const storyScore = Math.max(pressureScore || 0, 62)
    + Math.min(18, chapterOutlines.length / 5)
    + Math.min(10, activeCharacters.length)
    + Math.min(10, conflictHits * 2)
    - storyBlockers.length * 24
    - storyWarnings.length * 5

  const innovationBlockers = [
    wc(readerPromise) < 28 ? '核心差异表达不足。' : '',
  ].filter(Boolean)
  const innovationWarnings = [
    innovationHits < 4 ? '创新机制/反差信号偏少。' : '',
    systemAssetCount < 2 ? '能力、物品、势力、地点等可扩展资产不足。' : '',
  ].filter(Boolean)
  const innovationScore = 68
    + Math.min(18, innovationHits * 3)
    + Math.min(12, systemAssetCount * 2)
    - innovationBlockers.length * 25
    - innovationWarnings.length * 6

  const readerBlockers = [
    !first30Score ? '缺少前30章留存诊断。' : '',
    first30Score > 0 && first30Score < 65 ? '前30章留存低于基础商业线。' : '',
    first30Report?.positioning?.promise_ready === false ? '前30章读者承诺未确认清晰。' : '',
  ].filter(Boolean)
  const readerWarnings = [
    first30Score >= 65 && first30Score < 82 ? '前30章留存还未达到稳定追读线。' : '',
    payoffHits < 5 ? '爽点/回报信号不足。' : '',
  ].filter(Boolean)
  const readerScore = (first30Score || 45)
    + Math.min(10, payoffHits)
    - readerBlockers.length * 10
    - readerWarnings.length * 4

  const dimensions = [
    buildDiagnosisDimension('core', '核心不偏', coreScore, coreBlockers[0] || coreWarnings[0] || '读者承诺、分卷目标、剧情线和故事状态能约束长期方向。', [readerPromise, `分卷/阶段 ${volumeOutlines.length}`, `剧情线 ${storylineCount}`, storyStateFresh ? '状态机新鲜' : '状态机待同步'], coreBlockers, coreWarnings),
    buildDiagnosisDimension('story', '故事强度', storyScore, storyBlockers[0] || storyWarnings[0] || '章节规划、冲突阶梯、人物池和长线压力能支撑连续推进。', [`章节规划 ${chapterOutlines.length || chapters.length}`, `活跃角色 ${activeCharacters.length}`, `冲突信号 ${conflictHits}`, pressureScore ? `压力测试 ${pressureScore}分` : '压力测试未运行'], storyBlockers, storyWarnings),
    buildDiagnosisDimension('innovation', '创新差异', innovationScore, innovationBlockers[0] || innovationWarnings[0] || '题材承诺、机制反差和可扩展资产具备差异化表达。', [readerPromise, `创新信号 ${innovationHits}`, `设定资产 ${systemAssetCount}`], innovationBlockers, innovationWarnings),
    buildDiagnosisDimension('reader_pull', '读者吸引', readerScore, readerBlockers[0] || readerWarnings[0] || '前30章留存、章末钩子和爽点回报达到连续生产前置线。', [first30Score ? `前30章 ${first30Score}分` : '前30章未诊断', first30Report?.summary || '', `回报信号 ${payoffHits}`], readerBlockers, readerWarnings),
  ]
  const blockers = dimensions.flatMap(item => item.blockers.map((message: string) => `${item.label}：${message}`))
  const warnings = dimensions.flatMap(item => item.warnings.map((message: string) => `${item.label}：${message}`))
  const score = Math.max(0, Math.min(100, Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length)))
  const status = blockers.length > 0 || dimensions.some(item => item.status === 'block')
    ? 'blocked'
    : score >= 82 && dimensions.every(item => item.status === 'ok')
      ? 'ready'
      : 'needs_repair'
  const nextActions = [
    blockers.length > 0 ? `补齐阻塞项：${blockers[0]}` : '',
    warnings.length > 0 ? `优先治理：${warnings[0]}` : '',
    !first30Score ? '运行前30章留存诊断，建立开篇追读基线。' : '',
    !pressureScore ? '运行300万字长线压力测试，确认分卷、人物池和扩展引擎。' : '',
    status === 'ready' ? '可以进入章节任务书与连续生产，但每章仍需经过质检、状态同步和资产回填。' : '',
  ].filter(Boolean)
  const compass = buildLongformCompass(project, bible, outlines, settingEntities, worldbuilding)

  return {
    report_id: `longform-creation-${Date.now()}`,
    created_at: new Date().toISOString(),
    quality_bar: 'qidian_10k_subscription_baseline',
    quality_bar_label: '起点1万均订基础线',
    support_range_words: { min: 3000000, max: 10000000 },
    score,
    status,
    summary: status === 'ready'
      ? '长篇创作契约达到连续生产基础线。'
      : status === 'blocked'
        ? '长篇创作契约存在阻塞，不建议直接批量生成。'
        : '长篇创作契约有商业化雏形，但仍需补强后再扩大自动生产。',
    dimensions,
    compass,
    blockers,
    warnings,
    upstream_reports: {
      first30_retention_score: first30Score || null,
      longform_pressure_score: pressureScore || null,
    },
    next_actions: nextActions.length ? nextActions : ['保持前30章诊断、未来10章滚动规划、质检修订和故事状态同步循环。'],
  }
}

