import type { Express } from 'express'
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
} from '../novel'
import { readKeys } from '../key-store'
import { readModels } from '../model-store'
import { readProviders } from '../provider-store'
import { executeNovelAgent } from '../llm'
import { asArray, compactText, parseJsonLikePayload, safeJsonStringify } from './novel-route-utils'

type CommercialOpsContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
}

const genreTemplates = [
  {
    id: 'xianxia_upgrade',
    name: '仙侠升级流',
    genre: '仙侠',
    promise: '主角用清晰代价换取持续升级，每卷都有境界突破、身份跃迁和关系反转。',
    style_lock: {
      narrative_person: '第三人称有限视角',
      sentence_length: '中短句为主，关键战斗加速',
      dialogue_ratio: '30%-40%',
      payoff_density: '每章至少一个小爽点，每3-5章一个大爽点',
      description_density: '设定描写服务冲突，不连续堆设定',
    },
    structure: {
      volume_goal: '每卷围绕一个修炼阶段和一个外部压力闭环。',
      chapter_beat: ['开局压力', '策略选择', '代价执行', '反转收益', '章末新钩子'],
      forbidden: ['连续解释境界体系', '无代价突破', '反派只降智送资源'],
    },
  },
  {
    id: 'urban_comedy_growth',
    name: '都市轻喜成长',
    genre: '都市',
    promise: '现实压力、职场/校园关系和轻喜吐槽推动主角成长，爽点来自聪明解决具体难题。',
    style_lock: {
      narrative_person: '第三人称或第一人称均可',
      sentence_length: '短句和对话偏多',
      dialogue_ratio: '40%-55%',
      payoff_density: '每章一个现实问题解决或关系推进',
      description_density: '少量环境细节，重点写行动和反应',
    },
    structure: {
      volume_goal: '阶段性解决身份、金钱、关系或事业瓶颈。',
      chapter_beat: ['现实麻烦', '误会/压力升级', '主角奇招', '现场反馈', '新问题冒头'],
      forbidden: ['纯段子无剧情推进', '工具人只负责捧哏', '金手指无边界'],
    },
  },
  {
    id: 'infinite_horror',
    name: '无限流副本',
    genre: '无限流',
    promise: '每个副本都有规则、误导、死亡压力和破局推理，主角能力必须被规则约束。',
    style_lock: {
      narrative_person: '第三人称近距离',
      sentence_length: '悬疑段落短句，对抗段落加速',
      dialogue_ratio: '25%-40%',
      payoff_density: '每章至少一个规则发现或危险化解',
      description_density: '氛围描写点到即止，优先服务线索',
    },
    structure: {
      volume_goal: '副本从规则暴露、试错、牺牲、真相、破局逐步升级。',
      chapter_beat: ['异常现象', '规则线索', '错误代价', '临时破局', '更大威胁'],
      forbidden: ['无规则硬吓', '靠蛮力跳过谜题', '照搬经典恐怖桥段'],
    },
  },
]

function textHash(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

function opsJson(value: any) {
  return safeJsonStringify(value, undefined, 0)
}

function wc(text: string) {
  return String(text || '').replace(/\s/g, '').length
}

function splitParagraphs(text: string) {
  return String(text || '').split(/\n+/).map(item => item.trim()).filter(Boolean)
}

function topRepeatedPhrases(text: string) {
  const normalized = String(text || '').replace(/\s+/g, '')
  const counts = new Map<string, number>()
  for (let size = 4; size <= 8; size += 2) {
    for (let index = 0; index <= normalized.length - size; index += size) {
      const phrase = normalized.slice(index, index + size)
      if (/^[\u4e00-\u9fa5]{4,8}$/.test(phrase)) counts.set(phrase, (counts.get(phrase) || 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count >= 5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([phrase, count]) => ({ phrase, count }))
}

function chapterSnippet(chapter: any, limit = 900) {
  const text = String(chapter.chapter_text || '')
  if (!text) return ''
  if (text.length <= limit) return text
  const head = text.slice(0, Math.floor(limit * 0.55))
  const tail = text.slice(-Math.floor(limit * 0.35))
  return `${head}\n...\n${tail}`
}

function buildMechanicalQaLlmPrompt(project: any, report: any, chapters: any[]) {
  const issueChapterNos = new Set(report.issues.slice(0, 18).map((item: any) => Number(item.chapter_no || 0)).filter(Boolean))
  const chapterSamples = chapters
    .filter(chapter => issueChapterNos.has(Number(chapter.chapter_no || 0)))
    .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
    .slice(0, 10)
    .map(chapter => ({
      chapter_id: chapter.id,
      chapter_no: chapter.chapter_no,
      title: chapter.title,
      word_count: wc(chapter.chapter_text || ''),
      ending_hook: chapter.ending_hook || '',
      text_sample: chapterSnippet(chapter),
    }))
  return `
你是商业网文工作台的资深编辑。现在已有一份“本地机械质检规则引擎”报告，请你做大模型复核，不要重写全文。

项目：
${JSON.stringify({ id: project.id, title: project.title, genre: project.genre, summary: project.summary, writing_bible: project.reference_config?.writing_bible || {}, style_lock: project.reference_config?.style_lock || {} }, null, 2)}

本地质检报告：
${JSON.stringify({ score: report.score, status: report.status, summary: report.summary, issues: report.issues.slice(0, 40), next_actions: report.next_actions }, null, 2)}

相关章节样本：
${JSON.stringify(chapterSamples, null, 2)}

请只返回 JSON，结构如下：
{
  "overall_verdict": "一句话判断本地质检是否准确，以及本书最该先处理什么",
  "score_adjustment": {"suggested_score": 0-100, "reason": "为什么"},
  "confirmed_issues": [{"chapter_no": 1, "severity": "high|medium|low", "issue": "确认的问题", "fix": "具体修法"}],
  "false_positives": [{"chapter_no": 1, "issue": "本地规则误判项", "reason": "为什么"}],
  "missed_issues": [{"chapter_no": 1, "severity": "high|medium|low", "issue": "本地规则漏掉的问题", "fix": "具体修法"}],
  "repair_order": ["按优先级排列的修复步骤"],
  "commercial_editor_notes": ["面向连载商业质量的编辑建议"]
}
`.trim()
}

function buildPropagationDebtLlmPrompt(project: any, report: any, chapters: any[], characters: any[], outlines: any[], reviews: any[]) {
  const recentChapters = chapters
    .slice()
    .sort((a, b) => Number(b.chapter_no || 0) - Number(a.chapter_no || 0))
    .slice(0, 8)
    .reverse()
    .map(chapter => ({
      chapter_id: chapter.id,
      chapter_no: chapter.chapter_no,
      title: chapter.title,
      summary: chapter.chapter_summary || '',
      goal: chapter.chapter_goal || '',
      ending_hook: chapter.ending_hook || '',
      text_sample: chapterSnippet(chapter, 700),
    }))
  return `
你是长篇网文连续性主编。现在已有一份“传播债务/状态债务”本地扫描报告，请你基于项目材料生成可执行修复方案。

项目：
${JSON.stringify({ id: project.id, title: project.title, genre: project.genre, summary: project.summary, story_state: project.reference_config?.story_state || {}, writing_bible: project.reference_config?.writing_bible || {} }, null, 2)}

本地传播债务报告：
${JSON.stringify(report, null, 2)}

角色状态：
${JSON.stringify(characters.slice(0, 30).map(item => ({ id: item.id, name: item.name, role: item.role, current_state: item.current_state, status: item.status })), null, 2)}

分卷/阶段/章节大纲：
${JSON.stringify(outlines.slice(0, 60).map(item => ({ id: item.id, type: item.outline_type, title: item.title, summary: item.summary, parent_id: item.parent_id })), null, 2)}

近期章节：
${JSON.stringify(recentChapters, null, 2)}

近期审稿风险：
${JSON.stringify(reviews.slice(0, 20).map(item => ({ id: item.id, type: item.review_type, status: item.status, summary: item.summary, issues: item.issues })), null, 2)}

请只返回 JSON，结构如下：
{
  "overall_verdict": "一句话判断长篇连续性风险",
  "repair_plan": [{"priority": 1, "debt_id": "对应本地债务id或new", "target": "章节/角色/状态机/大纲", "action": "具体修复动作", "reason": "为什么先做", "expected_result": "修完后应该变成什么"}],
  "state_machine_updates": {"last_updated_chapter": 0, "character_positions": {}, "open_secrets": [], "prop_status": [], "foreshadowing_status": []},
  "chapter_level_fixes": [{"chapter_no": 1, "fix": "章节层面的补丁建议"}],
  "do_not_generate_until": ["继续自动生成前必须补齐的材料"],
  "editor_notes": ["商业连载角度的建议"]
}
`.trim()
}

function buildMechanicalQa(project: any, chapters: any[]) {
  const bible = project.reference_config?.writing_bible || {}
  const banned = [
    ...asArray(bible.banned_words),
    ...asArray(project.reference_config?.style_lock?.banned_words),
    '不知为何',
    '很显然',
    '说时迟那时快',
  ].map(String).filter(Boolean)
  const rows = chapters
    .slice()
    .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
    .map(chapter => {
      const text = String(chapter.chapter_text || '')
      const paragraphs = splitParagraphs(text)
      const wordCount = wc(text)
      const dialogueCount = (text.match(/[“"][^”"]+[”"]/g) || []).length
      const issues: any[] = []
      if (!text) issues.push({ severity: 'high', type: 'missing_text', message: '章节缺正文。' })
      if (text && wordCount < 1000) issues.push({ severity: 'medium', type: 'short_chapter', message: `章节字数偏短：${wordCount}` })
      if (text && wordCount > 6000) issues.push({ severity: 'low', type: 'long_chapter', message: `章节字数偏长：${wordCount}` })
      if (text && !chapter.ending_hook) issues.push({ severity: 'medium', type: 'missing_hook', message: '缺章末钩子。' })
      if (text && paragraphs.length < 8) issues.push({ severity: 'low', type: 'low_paragraph_count', message: '段落数量偏少，阅读节奏可能过密。' })
      const longParagraphs = paragraphs.map((item, index) => ({ index, chars: wc(item) })).filter(item => item.chars > 420)
      if (longParagraphs.length) issues.push({ severity: 'medium', type: 'long_paragraph', message: `存在 ${longParagraphs.length} 个超长段落。`, detail: longParagraphs.slice(0, 5) })
      const bannedHits = banned.filter(word => word && text.includes(word))
      if (bannedHits.length) issues.push({ severity: 'medium', type: 'banned_words', message: `命中禁用词/弱表达：${bannedHits.slice(0, 6).join('、')}` })
      const repeated = topRepeatedPhrases(text)
      if (repeated.length) issues.push({ severity: 'low', type: 'repeated_phrases', message: `高频重复短语：${repeated.slice(0, 4).map(item => `${item.phrase}(${item.count})`).join('、')}`, detail: repeated })
      const dialogueRatio = paragraphs.length ? Math.round((dialogueCount / paragraphs.length) * 100) : 0
      if (text && dialogueRatio < 8) issues.push({ severity: 'low', type: 'low_dialogue', message: '对话密度偏低，可能偏叙述说明。' })
      const penalty = issues.reduce((sum, issue) => sum + (issue.severity === 'high' ? 24 : issue.severity === 'medium' ? 10 : 4), 0)
      return {
        chapter_id: chapter.id,
        chapter_no: chapter.chapter_no,
        title: chapter.title,
        word_count: wordCount,
        paragraph_count: paragraphs.length,
        dialogue_count: dialogueCount,
        dialogue_ratio: dialogueRatio,
        score: Math.max(0, Math.min(100, 100 - penalty)),
        issues,
      }
    })
  const issues = rows.flatMap(row => row.issues.map((issue: any) => ({ ...issue, chapter_id: row.chapter_id, chapter_no: row.chapter_no, title: row.title })))
  const averageScore = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 0
  return {
    report_id: `mqa-${Date.now()}`,
    created_at: new Date().toISOString(),
    score: averageScore,
    status: issues.some(item => item.severity === 'high') ? 'blocked' : issues.some(item => item.severity === 'medium') ? 'warn' : 'ok',
    summary: {
      chapter_count: rows.length,
      issue_count: issues.length,
      high: issues.filter(item => item.severity === 'high').length,
      medium: issues.filter(item => item.severity === 'medium').length,
      low: issues.filter(item => item.severity === 'low').length,
    },
    rows,
    issues,
    next_actions: [
      issues.some(item => item.type === 'missing_text') ? '先补齐缺正文章节。' : '',
      issues.some(item => item.type === 'long_paragraph') ? '拆分超长段落，提升移动端阅读体验。' : '',
      issues.some(item => item.type === 'banned_words') ? '替换禁用词和弱表达。' : '',
      issues.some(item => item.type === 'repeated_phrases') ? '处理高频重复短语，降低机器感。' : '',
    ].filter(Boolean),
  }
}

function buildPropagationDebt(project: any, chapters: any[], characters: any[], outlines: any[], reviews: any[]) {
  const state = project.reference_config?.story_state || {}
  const debts: any[] = []
  const writtenMax = Math.max(0, ...chapters.filter(chapter => chapter.chapter_text).map(chapter => Number(chapter.chapter_no || 0)))
  if (writtenMax && Number(state.last_updated_chapter || 0) < writtenMax) {
    debts.push({
      id: `debt-story-state-${writtenMax}`,
      severity: 'high',
      source: 'story_state',
      title: '状态机落后于已写章节',
      message: `状态机停在第 ${state.last_updated_chapter || 0} 章，正文已写到第 ${writtenMax} 章。`,
      affected: { chapters: chapters.filter(ch => Number(ch.chapter_no || 0) > Number(state.last_updated_chapter || 0)).slice(0, 20).map(ch => ch.chapter_no) },
      next_action: '运行或人工校正故事状态机。',
    })
  }
  for (const character of characters) {
    if (character.status === 'active' && !character.current_state) {
      debts.push({
        id: `debt-character-state-${character.id}`,
        severity: 'medium',
        source: 'character',
        title: `角色缺当前状态：${character.name}`,
        message: '长篇生成前建议补齐角色位置、关系、目标和秘密暴露程度。',
        affected: { character_id: character.id, name: character.name },
        next_action: '在角色或故事状态机中补齐 current_state。',
      })
    }
  }
  const activeOutlines = outlines.filter(item => ['volume', 'arc', 'chapter'].includes(String(item.outline_type || '')))
  if (!activeOutlines.length) {
    debts.push({
      id: 'debt-outline-stage',
      severity: 'medium',
      source: 'outline',
      title: '缺分卷/阶段目标',
      message: '只有单章计划时，批量生成容易偏离长线推进。',
      affected: { outlines: outlines.length },
      next_action: '补分卷目标、阶段矛盾和关键转折。',
    })
  }
  const riskyReviews = reviews
    .filter(review => ['similarity_report', 'prose_quality', 'editor_report', 'mechanical_qa'].includes(review.review_type))
    .map(review => ({ review, payload: parseJsonLikePayload(review.payload) || {} }))
    .filter(item => item.review.status === 'warn' || item.review.status === 'blocked' || item.review.status === 'fail')
    .slice(0, 20)
  for (const item of riskyReviews) {
    debts.push({
      id: `debt-review-${item.review.id}`,
      severity: item.review.status === 'blocked' || item.review.status === 'fail' ? 'high' : 'medium',
      source: item.review.review_type,
      title: item.review.summary || item.review.review_type,
      message: asArray(item.review.issues).slice(0, 3).join('；') || compactText(item.review.payload || '', 160),
      affected: {
        chapter_id: item.payload.chapter_id || item.payload.report?.chapter_id || item.payload.quality_card?.chapter_id || null,
        chapter_no: item.payload.chapter_no || item.payload.report?.chapter_no || item.payload.quality_card?.chapter_no || null,
      },
      next_action: '打开对应章节或质量面板处理后标记解决。',
    })
  }
  const resolved = new Set(asArray(project.reference_config?.propagation_debt?.resolved).map((item: any) => String(item.id || item)))
  const active = debts.filter(item => !resolved.has(String(item.id)))
  return {
    debt_id: `debt-${Date.now()}`,
    created_at: new Date().toISOString(),
    score: Math.max(0, 100 - active.reduce((sum, item) => sum + (item.severity === 'high' ? 18 : item.severity === 'medium' ? 9 : 4), 0)),
    active_count: active.length,
    high_count: active.filter(item => item.severity === 'high').length,
    debts: active,
    resolved_count: resolved.size,
    next_actions: active.slice(0, 5).map(item => item.next_action),
  }
}

function includesAny(value: string, words: string[]) {
  const text = String(value || '')
  return words.some(word => text.includes(word))
}

function outlineText(outlines: any[]) {
  return outlines.map(item => [item.title, item.summary, item.key_plot, item.goal, item.conflict, item.payoff].filter(Boolean).join(' ')).join('\n')
}

function buildFirst30RetentionDiagnosis(project: any, chapters: any[], outlines: any[], characters: any[], reviews: any[]) {
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

function buildFirst30RetentionRepairTasks(report: any) {
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

function latestReport(reviews: any[], reviewType: string) {
  const rows = asArray(reviews)
    .filter(review => review?.review_type === reviewType)
    .sort((a, b) => Date.parse(String(b.created_at || '')) - Date.parse(String(a.created_at || '')))
  const payload = parseJsonLikePayload(rows[0]?.payload) || {}
  return payload.report || payload.result?.report || payload
}

function dimensionStatus(score: number, block = false) {
  if (block || score < 60) return 'block'
  if (score < 80) return 'warn'
  return 'ok'
}

function buildDiagnosisDimension(key: string, label: string, score: number, detail: string, evidence: string[], blockers: string[] = [], warnings: string[] = []) {
  return {
    key,
    label,
    score: Math.max(0, Math.min(100, Math.round(score))),
    status: dimensionStatus(score, blockers.length > 0),
    detail,
    evidence: evidence.filter(Boolean).slice(0, 5),
    blockers,
    warnings,
  }
}

function countSettingTypes(settings: any[], types: string[]) {
  return settings.filter(item => types.includes(String(item.entity_type || item.type || ''))).length
}

function firstText(...values: any[]) {
  for (const value of values) {
    const normalized = String(value || '').trim()
    if (normalized) return normalized
  }
  return ''
}

function uniqueTexts(values: any[], limit: number) {
  return Array.from(new Set(values.map(item => String(item || '').trim()).filter(Boolean))).slice(0, limit)
}

function buildLongformCompass(project: any, bible: any, outlines: any[], settingEntities: any[], worldbuilding: any[]) {
  const volumeOutlines = outlines.filter(item => ['volume', 'arc', 'part'].includes(String(item.outline_type || item.outline_level || '')))
  const firstConflict = firstText(...outlines.map(item => item.conflict), ...outlines.map(item => item.summary))
  const systemAsset = settingEntities.find(item => ['ability', 'rule', 'realm', 'item'].includes(String(item.entity_type || item.type || '')))
  const worldAsset = worldbuilding[0] || settingEntities.find(item => ['location', 'faction'].includes(String(item.entity_type || item.type || '')))
  const readerPromise = compactText(firstText(bible.reader_promise, bible.core_selling_point, project.summary), 180)
  const coreConflict = compactText(firstText(bible.core_conflict, firstConflict, project.summary), 180)
  const innovationHook = compactText(firstText(bible.innovation_hook, bible.core_selling_point, systemAsset?.summary, systemAsset?.name, project.summary), 180)
  const payoffLoop = compactText(firstText(bible.payoff_loop, bible.payoff_density, bible.reader_promise, volumeOutlines[0]?.payoff), 180)
  const endingDirection = compactText(firstText(bible.ending_direction, project.summary, volumeOutlines.at(-1)?.summary), 180)

  return {
    reader_promise: readerPromise,
    protagonist_drive: compactText(firstText(bible.protagonist_drive, project.summary), 180),
    core_conflict: coreConflict,
    world_hook: compactText(firstText(bible.world_hook, worldAsset?.content, worldAsset?.summary, worldAsset?.name), 180),
    innovation_hook: innovationHook,
    payoff_loop: payoffLoop,
    ending_direction: endingDirection,
    immutable_rules: uniqueTexts([
      readerPromise ? `读者承诺不可漂移：${readerPromise}` : '',
      coreConflict ? `核心矛盾不可绕开：${coreConflict}` : '',
      innovationHook ? `创新卖点不能被写成普通套路：${innovationHook}` : '',
      payoffLoop ? `长期爽点循环必须持续兑现：${payoffLoop}` : '',
    ], 6),
    flexible_zones: uniqueTexts([
      '地图、副本、支线人物和新资产可以扩展，但必须服务读者承诺与当前卷目标。',
      '单章场景、打斗方式和对话网感可以调整，但不能改主角长期欲望和核心矛盾。',
      '支线可增删，伏笔可延后，但不能无回报制造长期悬空债务。',
    ], 6),
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

function modelUsageRecommendation(model: any) {
  const name = `${model.display_name || ''} ${model.model_name || ''}`.toLowerCase()
  const caps = model.capabilities || {}
  const longContext = Number(model.context_ui_params?.context_window || model.context_ui_params?.max_context || 0)
  return {
    draft: Boolean(caps.chat) && (name.includes('deepseek') || name.includes('gpt') || name.includes('claude') || name.includes('qwen')),
    review: Boolean(caps.chat),
    safety: Boolean(caps.chat),
    long_context: longContext >= 64000 || name.includes('long') || name.includes('128k'),
    risk: model.health_status !== 'healthy' ? '模型健康状态未知或异常，建议先做探针测试。' : '',
  }
}

function interpretCreativeCommand(command: string, project: any) {
  const text = String(command || '').trim()
  const lower = text.toLowerCase()
  const actions: any[] = []
  const add = (key: string, label: string, endpoint: string, method = 'GET', executable = false, reason = '') => {
    if (!actions.some(item => item.key === key)) actions.push({ key, label, endpoint, method, executable, reason })
  }
  if (/机械|错字|重复|水文|ai味|质检|规则/.test(text)) {
    add('mechanical_qa', '运行机械质检', `/api/novel/projects/${project.id}/mechanical-qa/run`, 'POST', true, '检查重复、超长段落、禁用词、章末钩子和基础可读性。')
  }
  if (/前\s*30|前三十|留存|追读|开篇|试读|付费前/.test(text)) {
    add('first30_retention', '运行前30章留存诊断', `/api/novel/projects/${project.id}/first30-retention-diagnosis`, 'POST', true, '检查开篇三章、试读十章和付费前蓄势的追读风险。')
  }
  if (/(前\s*30|前三十|留存|追读|开篇|试读|付费前).*(修复|任务|队列)|(?:修复|任务|队列).*(前\s*30|前三十|留存|追读|开篇|试读|付费前)/.test(text)) {
    add('first30_repair', '生成前30章留存修复任务', `/api/novel/projects/${project.id}/first30-retention-diagnosis/repair-queue`, 'POST', true, '把前30章留存风险转成任务中心可处理的修复队列。')
  }
  if (/(长线|长篇|三百万|300\s*万).*(风险|治理|闭环|摘要|复查|还有)|(?:风险|治理|闭环|摘要|复查|还有).*(长线|长篇|三百万|300\s*万)/.test(text)) {
    add('longform_governance_summary', '查看长线治理闭环摘要', `/api/novel/projects/${project.id}/longform-governance-summary`, 'GET', true, '汇总最近一轮长线生产修复、复查状态、闭环审计和剩余风险。')
  }
  if (/300\s*万|三百万|长篇|长线|百万字|压力测试|塌线|扩容/.test(text)) {
    add('longform_pressure', '运行300万字长线压力测试', `/api/novel/projects/${project.id}/longform-pressure-test`, 'POST', true, '评估分卷容量、人物池、世界资产、冲突阶梯和回报循环是否能支撑长篇。')
  }
  if (/创作契约|核心不偏|故事强度|创新|读者吸引|一万均订|1\s*万均订|千万字|1000\s*万/.test(text)) {
    add('longform_creation_diagnosis', '运行长篇创作健康诊断', `/api/novel/projects/${project.id}/longform-creation-diagnosis`, 'POST', true, '按起点1万均订基础线检查核心不偏、故事强度、创新差异和读者吸引。')
  }
  if (/债务|影响|改动|传播|状态机|一致性/.test(text)) {
    add('propagation_debt', '刷新传播债务', `/api/novel/projects/${project.id}/propagation-debt/refresh`, 'POST', true, '检查状态机、角色状态、分卷目标和未处理审稿风险。')
  }
  if (/模型|服务商|provider|失败|空正文|上传|诊断/.test(lower)) {
    add('model_diagnostics', '查看模型诊断', `/api/novel/projects/${project.id}/model-diagnostics`, 'GET', true, '检查模型健康、Key、服务商和近期失败记录。')
  }
  if (/备份|快照|导出项目|项目包/.test(text)) {
    add('backup_snapshot', '创建项目备份快照', `/api/novel/projects/${project.id}/backup-snapshot`, 'POST', true, '创建项目级备份指纹，完整包可在交付区下载。')
  }
  if (/模板|类型|套路|玄幻|仙侠|都市|无限流|原创/.test(text)) {
    add('genre_templates', '打开类型模板方法库', '/api/novel/genre-templates', 'GET', true, '选择类型模板后写入写作圣经。')
  }
  if (/写|生成|续写|正文|章节/.test(text)) {
    add('generation_pipeline', '进入章节流水线', `/api/novel/chapters/{chapterId}/generation-pipeline/start`, 'POST', false, '生成类任务需要先确认当前章节、模型和材料完整度。')
  }
  if (/发布|交付|epub|docx|txt|markdown/.test(lower)) {
    add('export_delivery', '打开交付导出', `/api/novel/projects/${project.id}/export-preview`, 'GET', false, '正式导出前建议先跑质量基准和一致性检查。')
  }
  if (!actions.length) {
    add('production_check', '生产前检查', `/api/novel/projects/${project.id}/mechanical-qa/run`, 'POST', true, '未识别到明确动作，先执行低风险质量检查。')
    add('propagation_debt', '刷新传播债务', `/api/novel/projects/${project.id}/propagation-debt/refresh`, 'POST', true, '同步检查长篇状态风险。')
  }
  return {
    command: text,
    project_id: project.id,
    interpreted_at: new Date().toISOString(),
    confidence: actions.length === 1 ? 0.78 : 0.66,
    actions,
    warnings: actions.some(item => item.executable === false) ? ['生成、发布、覆盖类动作需要在对应工作台人工确认后执行。'] : [],
    next_ui: actions[0]?.key || 'production_check',
  }
}

function normalizeBackupPayload(body: any) {
  const raw = body?.package || body?.backup || body
  if (typeof raw === 'string') return JSON.parse(raw)
  return raw || {}
}

function buildLongformGovernanceBrief(project: any, runs: any[], reviews: any[]) {
  const repairRuns = runs
    .filter(run => run.run_type === 'longform_production_repair')
    .map(run => ({ run, payload: parseJsonLikePayload(run.output_ref) || {} }))
    .sort((a, b) => String(b.run.created_at || '').localeCompare(String(a.run.created_at || '')))
  const auditReviews = reviews
    .filter(review => review.review_type === 'longform_production_repair_audit')
    .map(review => ({ review, payload: parseJsonLikePayload(review.payload) || {} }))
    .sort((a, b) => String(b.review.created_at || '').localeCompare(String(a.review.created_at || '')))
  const latestRun = repairRuns[0] || null
  const latestAudit = latestRun?.payload?.audit_summary || auditReviews[0]?.payload?.audit || null
  const tasks = asArray(latestRun?.payload?.tasks)
  const needsReview = tasks.filter((task: any) => task.task_status === 'needs_review')
  const unresolved = tasks.filter((task: any) => task.task_status !== 'resolved')
  return {
    project_id: project.id,
    created_at: new Date().toISOString(),
    latest_repair_run: latestRun ? {
      id: latestRun.run.id,
      status: latestRun.run.status,
      created_at: latestRun.run.created_at,
      task_count: tasks.length,
      resolved_count: tasks.filter((task: any) => task.task_status === 'resolved').length,
      needs_review_count: needsReview.length,
      unresolved_count: unresolved.length,
    } : null,
    latest_audit: latestAudit,
    summary: latestAudit?.conclusion?.join(' ') || (latestRun ? `最近一轮长线修复任务 ${tasks.length} 项，未关闭 ${unresolved.length} 项。` : '暂无长线生产修复闭环记录。'),
    risks: [
      !latestRun ? '还没有长线生产修复队列。' : '',
      needsReview.length ? `${needsReview.length} 项任务等待复查确认。` : '',
      unresolved.length && !needsReview.length ? `${unresolved.length} 项任务未关闭。` : '',
      latestAudit?.remaining_risks?.current_recommendations?.[0] || '',
    ].filter(Boolean),
    next_actions: [
      !latestRun ? '先打开长线生产趋势报表并生成修复任务。' : '',
      needsReview.length ? '在任务中心复查清单里批量确认通过或逐项处理。' : '',
      latestRun && !latestAudit ? '生成闭环审计摘要，记录本轮治理效果。' : '',
    ].filter(Boolean),
  }
}

async function importBackupAsNewProject(activeWorkspace: string, backup: any, options: any = {}) {
  if (backup.package_type !== 'novel_project_backup' || !backup.project) {
    throw new Error('不是有效的小说项目备份包。')
  }
  const sourceProject = backup.project || {}
  const titleSuffix = options.keep_title ? '' : '（导入）'
  const project = await createNovelProject(activeWorkspace, {
    ...sourceProject,
    id: undefined,
    title: String(options.title || `${sourceProject.title || '未命名项目'}${titleSuffix}`),
    reference_config: {
      ...(sourceProject.reference_config || {}),
      imported_from_backup: {
        source_project_id: sourceProject.id,
        source_title: sourceProject.title || '',
        exported_at: backup.exported_at || '',
        imported_at: new Date().toISOString(),
      },
    },
  })
  const outlineIdMap = new Map<number, number>()
  for (const outline of asArray(backup.outlines)) {
    const created = await createNovelOutline(activeWorkspace, { ...outline, id: undefined, project_id: project.id, parent_id: null })
    outlineIdMap.set(Number(outline.id || 0), created.id)
  }
  for (const outline of asArray(backup.outlines)) {
    const oldParentId = Number(outline.parent_id || 0)
    const newId = outlineIdMap.get(Number(outline.id || 0))
    const newParentId = oldParentId ? outlineIdMap.get(oldParentId) : null
    if (newId && newParentId) {
      await updateNovelOutline(activeWorkspace, newId, { parent_id: newParentId } as any)
    }
  }
  for (const item of asArray(backup.worldbuilding)) {
    await createNovelWorldbuilding(activeWorkspace, { ...item, id: undefined, project_id: project.id })
  }
  for (const character of asArray(backup.characters)) {
    await createNovelCharacter(activeWorkspace, { ...character, id: undefined, project_id: project.id })
  }
  for (const chapter of asArray(backup.chapters)) {
    await createNovelChapter(activeWorkspace, {
      ...chapter,
      id: undefined,
      project_id: project.id,
      outline_id: chapter.outline_id ? (outlineIdMap.get(Number(chapter.outline_id)) || null) : null,
    })
  }
  const manifest = {
    imported_project_id: project.id,
    title: project.title,
    imported_at: new Date().toISOString(),
    counts: {
      chapters: asArray(backup.chapters).length,
      outlines: asArray(backup.outlines).length,
      characters: asArray(backup.characters).length,
      worldbuilding: asArray(backup.worldbuilding).length,
    },
    source: {
      project_id: sourceProject.id,
      title: sourceProject.title || '',
      exported_at: backup.exported_at || '',
    },
  }
  await appendNovelRun(activeWorkspace, {
    project_id: project.id,
    run_type: 'project_backup_import',
    step_name: `import-${manifest.source.project_id || 'backup'}`,
    status: 'success',
    output_ref: JSON.stringify({ manifest }),
  })
  return { project, manifest }
}

export function registerNovelCommercialOpsRoutes(app: Express, ctx: CommercialOpsContext) {
  app.post('/api/novel/projects/:id/creative-command', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const plan = interpretCreativeCommand(String(req.body?.command || ''), project)
      const executable = req.body?.execute === true
      const executed: any[] = []
      if (executable) {
        for (const action of plan.actions.filter((item: any) => item.executable).slice(0, 3)) {
          if (action.key === 'mechanical_qa' || action.key === 'production_check') {
            const chapters = await listNovelChapters(activeWorkspace, project.id)
            const report = buildMechanicalQa(project, chapters)
            const review = await createNovelReview(activeWorkspace, {
              project_id: project.id,
              review_type: 'mechanical_qa',
              status: report.status === 'ok' ? 'ok' : 'warn',
              summary: `指令台机械质检：${report.score} 分，问题 ${report.summary.issue_count} 个`,
              issues: report.issues.slice(0, 30).map((item: any) => `第${item.chapter_no}章 ${item.message}`),
              payload: JSON.stringify({ command: plan.command, report }),
            })
            executed.push({ key: action.key, status: 'success', report, review_id: review.id })
          } else if (action.key === 'first30_retention') {
            const [chapters, outlines, characters, reviews] = await Promise.all([
              listNovelChapters(activeWorkspace, project.id),
              listNovelOutlines(activeWorkspace, project.id),
              listNovelCharacters(activeWorkspace, project.id),
              listNovelReviews(activeWorkspace, project.id),
            ])
            const report = buildFirst30RetentionDiagnosis(project, chapters, outlines, characters, reviews)
            const review = await createNovelReview(activeWorkspace, {
              project_id: project.id,
              review_type: 'first30_retention_diagnosis',
              status: report.status === 'ready' ? 'ok' : 'warn',
              summary: `指令台前30章留存诊断：${report.score} 分`,
              issues: report.risks.slice(0, 30).map((item: any) => `${item.segment}：${item.issue}`),
              payload: JSON.stringify({ command: plan.command, report }),
            })
            executed.push({ key: action.key, status: 'success', report, review_id: review.id })
          } else if (action.key === 'first30_repair') {
            const [chapters, outlines, characters, reviews] = await Promise.all([
              listNovelChapters(activeWorkspace, project.id),
              listNovelOutlines(activeWorkspace, project.id),
              listNovelCharacters(activeWorkspace, project.id),
              listNovelReviews(activeWorkspace, project.id),
            ])
            const report = buildFirst30RetentionDiagnosis(project, chapters, outlines, characters, reviews)
            const tasks = buildFirst30RetentionRepairTasks(report)
            const run = await appendNovelRun(activeWorkspace, {
              project_id: project.id,
              run_type: 'first30_retention_repair',
              step_name: `creative-command-first30-repair-${tasks.length}`,
              status: tasks.length ? 'ready' : 'success',
              input_ref: JSON.stringify({ command: plan.command, source_report_id: report.report_id }),
              output_ref: JSON.stringify({ report: { report_id: report.report_id, score: report.score, status: report.status, summary: report.summary }, tasks }),
            })
            const review = await createNovelReview(activeWorkspace, {
              project_id: project.id,
              review_type: 'first30_retention_repair',
              status: tasks.length ? 'warn' : 'ok',
              summary: `指令台前30章留存修复任务：${tasks.length} 项`,
              issues: tasks.slice(0, 30).map((item: any) => item.chapter_no ? `第${item.chapter_no}章 ${item.message}` : `${item.segment || item.task_type}：${item.message}`),
              payload: JSON.stringify({ command: plan.command, run_id: run.id, tasks, report }),
            })
            executed.push({ key: action.key, status: 'success', report, tasks, run_id: run.id, review_id: review.id })
          } else if (action.key === 'longform_pressure') {
            const [chapters, outlines, characters, worldbuilding, reviews] = await Promise.all([
              listNovelChapters(activeWorkspace, project.id),
              listNovelOutlines(activeWorkspace, project.id),
              listNovelCharacters(activeWorkspace, project.id),
              listNovelWorldbuilding(activeWorkspace, project.id),
              listNovelReviews(activeWorkspace, project.id),
            ])
            const report = buildLongformPressureTest(project, chapters, outlines, characters, worldbuilding, reviews)
            const review = await createNovelReview(activeWorkspace, {
              project_id: project.id,
              review_type: 'longform_pressure_test',
              status: report.status === 'scalable' ? 'ok' : 'warn',
              summary: `指令台300万字长线压力测试：${report.score} 分`,
              issues: report.weak_points.slice(0, 30).map((item: any) => `${item.area}：${item.issue}`),
              payload: JSON.stringify({ command: plan.command, report }),
            })
            executed.push({ key: action.key, status: 'success', report, review_id: review.id })
          } else if (action.key === 'longform_creation_diagnosis') {
            const [chapters, outlines, characters, worldbuilding, settingEntities, reviews] = await Promise.all([
              listNovelChapters(activeWorkspace, project.id),
              listNovelOutlines(activeWorkspace, project.id),
              listNovelCharacters(activeWorkspace, project.id),
              listNovelWorldbuilding(activeWorkspace, project.id),
              listNovelSettingEntities(activeWorkspace, project.id),
              listNovelReviews(activeWorkspace, project.id),
            ])
            const report = buildLongformCreationDiagnosis(project, chapters, outlines, characters, worldbuilding, settingEntities, reviews)
            const review = await createNovelReview(activeWorkspace, {
              project_id: project.id,
              review_type: 'longform_creation_diagnosis',
              status: report.status === 'ready' ? 'ok' : 'warn',
              summary: `长篇创作健康诊断：${report.score} 分，${report.summary}`,
              issues: [...report.blockers, ...report.warnings].slice(0, 30),
              payload: JSON.stringify({ command: plan.command, report }),
            })
            executed.push({ key: action.key, status: 'success', report, review_id: review.id })
          } else if (action.key === 'longform_governance_summary') {
            const [runs, reviews] = await Promise.all([
              listNovelRuns(activeWorkspace, project.id),
              listNovelReviews(activeWorkspace, project.id),
            ])
            const report = buildLongformGovernanceBrief(project, runs, reviews)
            executed.push({ key: action.key, status: 'success', report })
          } else if (action.key === 'propagation_debt') {
            const [chapters, characters, outlines, reviews] = await Promise.all([
              listNovelChapters(activeWorkspace, project.id),
              listNovelCharacters(activeWorkspace, project.id),
              listNovelOutlines(activeWorkspace, project.id),
              listNovelReviews(activeWorkspace, project.id),
            ])
            const report = buildPropagationDebt(project, chapters, characters, outlines, reviews)
            await updateNovelProject(activeWorkspace, project.id, {
              reference_config: {
                ...(project.reference_config || {}),
                propagation_debt: {
                  ...(project.reference_config?.propagation_debt || {}),
                  latest_report: report,
                  updated_at: new Date().toISOString(),
                },
              },
            } as any)
            executed.push({ key: action.key, status: 'success', report })
          } else if (action.key === 'model_diagnostics') {
            executed.push({ key: action.key, status: 'ready', message: '模型诊断请在前端打开详情面板查看。' })
          } else if (action.key === 'backup_snapshot') {
            executed.push({ key: action.key, status: 'ready', message: '备份快照请使用交付区按钮创建，以便确认范围。' })
          } else if (action.key === 'genre_templates') {
            executed.push({ key: action.key, status: 'ready', templates: genreTemplates })
          }
        }
      }
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'creative_command',
        step_name: compactText(plan.command, 80) || 'creative-command',
        status: executed.some(item => item.status === 'success') ? 'success' : 'ready',
        input_ref: JSON.stringify({ command: plan.command, execute: executable }),
        output_ref: JSON.stringify({ plan, executed }),
      })
      res.json({ ok: true, plan, executed, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/mechanical-qa', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const chapters = await listNovelChapters(activeWorkspace, project.id)
      const report = buildMechanicalQa(project, chapters)
      res.json({ ok: true, report })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/mechanical-qa/run', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const chapters = await listNovelChapters(activeWorkspace, project.id)
      const report = buildMechanicalQa(project, chapters)
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'mechanical_qa',
        status: report.status === 'ok' ? 'ok' : 'warn',
        summary: `机械质检：${report.score} 分，问题 ${report.summary.issue_count} 个`,
        issues: report.issues.slice(0, 30).map((item: any) => `第${item.chapter_no}章 ${item.message}`),
        payload: JSON.stringify({ report }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'mechanical_qa',
        step_name: 'mechanical-qa',
        status: report.status === 'ok' ? 'success' : 'warn',
        output_ref: JSON.stringify({ report, review_id: review.id }),
      })
      res.json({ ok: true, report, review, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/mechanical-qa/repair-queue', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const chapters = await listNovelChapters(activeWorkspace, project.id)
      const report = buildMechanicalQa(project, chapters)
      const tasks = report.issues
        .filter((issue: any) => ['high', 'medium'].includes(issue.severity))
        .map((issue: any) => ({
          task_id: `mqa-fix-${issue.chapter_id}-${issue.type}`,
          chapter_id: issue.chapter_id,
          chapter_no: issue.chapter_no,
          title: issue.title,
          issue_type: issue.type,
          severity: issue.severity,
          message: issue.message,
          action: issue.type === 'missing_text'
            ? '进入章节流水线生成正文。'
            : issue.type === 'long_paragraph'
              ? '拆分超长段落并检查移动端阅读节奏。'
              : issue.type === 'banned_words'
                ? '替换禁用词/弱表达。'
                : '打开章节进行局部修订。',
        }))
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'mechanical_qa_repair',
        step_name: `mechanical-qa-repair-${tasks.length}`,
        status: tasks.length ? 'ready' : 'success',
        input_ref: JSON.stringify({ source_report_id: report.report_id }),
        output_ref: JSON.stringify({ report: { score: report.score, summary: report.summary }, tasks }),
      })
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'mechanical_qa_repair',
        status: tasks.length ? 'warn' : 'ok',
        summary: `机械质检修复任务：${tasks.length} 项`,
        issues: tasks.slice(0, 30).map((item: any) => `第${item.chapter_no}章 ${item.message}`),
        payload: JSON.stringify({ run_id: run.id, tasks, report }),
      })
      res.json({ ok: true, run, review, tasks, report })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/mechanical-qa/llm-review', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const modelId = req.body?.model_id ? String(req.body.model_id) : undefined
      if (!modelId) return res.status(400).json({ error: 'model_id is required' })
      const chapters = await listNovelChapters(activeWorkspace, project.id)
      const report = buildMechanicalQa(project, chapters)
      const prompt = buildMechanicalQaLlmPrompt(project, report, chapters)
      const result = await executeNovelAgent('review-agent', project, { task: prompt }, {
        activeWorkspace,
        modelId,
        maxTokens: 6000,
        temperature: 0.18,
        skipMemory: true,
      })
      const aiReport = (result as any).output || parseJsonLikePayload((result as any).content) || { raw: (result as any).content || '' }
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'mechanical_qa_llm',
        status: (result as any).error ? 'warn' : 'ok',
        summary: `AI 复核机械质检：${aiReport.overall_verdict || report.score + ' 分'}`,
        issues: [
          ...asArray(aiReport.confirmed_issues).slice(0, 12).map((item: any) => `确认：第${item.chapter_no || '-'}章 ${item.issue || item.fix || ''}`),
          ...asArray(aiReport.missed_issues).slice(0, 12).map((item: any) => `漏检：第${item.chapter_no || '-'}章 ${item.issue || item.fix || ''}`),
        ].filter(Boolean),
        payload: opsJson({ local_report: report, ai_report: aiReport, llm_result: result }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'mechanical_qa_llm',
        step_name: 'llm-review',
        status: (result as any).error ? 'warn' : 'success',
        input_ref: JSON.stringify({ model_id: modelId, local_report_id: report.report_id }),
        output_ref: opsJson({ local_report: report, ai_report: aiReport, review_id: review.id, llm_result: result }),
        error_message: (result as any).error || '',
      })
      res.json({ ok: true, report, ai_report: aiReport, llm_result: result, review, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/first30-retention-diagnosis', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const report = buildFirst30RetentionDiagnosis(project, chapters, outlines, characters, reviews)
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'first30_retention_diagnosis',
        status: report.status === 'ready' ? 'ok' : 'warn',
        summary: `前30章留存诊断：${report.score} 分，${report.summary}`,
        issues: report.risks.slice(0, 30).map((item: any) => `${item.segment}：${item.issue}`),
        payload: JSON.stringify({ report }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'first30_retention_diagnosis',
        step_name: 'first30-retention',
        status: report.status === 'ready' ? 'success' : 'warn',
        output_ref: JSON.stringify({ report, review_id: review.id }),
      })
      res.json({ ok: true, report, review, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/first30-retention-diagnosis/repair-queue', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const report = buildFirst30RetentionDiagnosis(project, chapters, outlines, characters, reviews)
      const tasks = buildFirst30RetentionRepairTasks(report)
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'first30_retention_repair',
        step_name: `first30-retention-repair-${tasks.length}`,
        status: tasks.length ? 'ready' : 'success',
        input_ref: JSON.stringify({ source_report_id: report.report_id }),
        output_ref: JSON.stringify({
          report: { report_id: report.report_id, score: report.score, status: report.status, summary: report.summary },
          tasks,
        }),
      })
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'first30_retention_repair',
        status: tasks.length ? 'warn' : 'ok',
        summary: `前30章留存修复任务：${tasks.length} 项`,
        issues: tasks.slice(0, 30).map((item: any) => item.chapter_no ? `第${item.chapter_no}章 ${item.message}` : `${item.segment || item.task_type}：${item.message}`),
        payload: JSON.stringify({ run_id: run.id, tasks, report }),
      })
      res.json({ ok: true, run, review, tasks, report })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/reader-trial-review', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const report = buildReaderTrialReview(project, chapters, outlines, reviews)
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'reader_trial_review',
        status: report.status === 'ready' ? 'ok' : report.status === 'blocked' ? 'blocked' : 'warn',
        summary: `读者试读复盘：${report.score} 分，${report.summary}`,
        issues: report.drop_points.slice(0, 30),
        payload: JSON.stringify({ report }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'reader_trial_review',
        step_name: 'reader-trial-review',
        status: report.status === 'ready' ? 'success' : report.status === 'blocked' ? 'failed' : 'warn',
        output_ref: JSON.stringify({ report, review_id: review.id }),
      })
      res.json({ ok: true, report, review, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/reader-trial-review/repair-queue', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const report = buildReaderTrialReview(project, chapters, outlines, reviews)
      const tasks = buildReaderTrialRepairTasks(report)
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'longform_production_repair',
        step_name: `reader-trial-repair-${tasks.length}`,
        status: tasks.length ? 'ready' : 'success',
        input_ref: JSON.stringify({ source: 'reader_trial_review', source_report_id: report.report_id }),
        output_ref: JSON.stringify({
          report: {
            source: 'reader_trial_review',
            report_id: report.report_id,
            score: report.score,
            status: report.status,
            summary: report.summary,
          },
          tasks,
          recommendations: report.repair_actions || [],
        }),
      })
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'reader_trial_repair',
        status: tasks.length ? 'warn' : 'ok',
        summary: `读者试读修复任务：${tasks.length} 项`,
        issues: tasks.slice(0, 30).map((item: any) => item.chapter_no ? `第${item.chapter_no}章 ${item.message}` : item.message),
        payload: JSON.stringify({ run_id: run.id, tasks, report }),
      })
      res.json({ ok: true, run, review, tasks, report })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/longform-pressure-test', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, worldbuilding, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelWorldbuilding(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const report = buildLongformPressureTest(project, chapters, outlines, characters, worldbuilding, reviews)
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'longform_pressure_test',
        status: report.status === 'scalable' ? 'ok' : 'warn',
        summary: `300万字长线压力测试：${report.score} 分，${report.summary}`,
        issues: report.weak_points.slice(0, 30).map((item: any) => `${item.area}：${item.issue}`),
        payload: JSON.stringify({ report }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'longform_pressure_test',
        step_name: 'longform-pressure',
        status: report.status === 'scalable' ? 'success' : 'warn',
        output_ref: JSON.stringify({ report, review_id: review.id }),
      })
      res.json({ ok: true, report, review, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/longform-creation-diagnosis', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, worldbuilding, settingEntities, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelWorldbuilding(activeWorkspace, project.id),
        listNovelSettingEntities(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const report = buildLongformCreationDiagnosis(project, chapters, outlines, characters, worldbuilding, settingEntities, reviews)
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'longform_creation_diagnosis',
        status: report.status === 'ready' ? 'ok' : 'warn',
        summary: `长篇创作健康诊断：${report.score} 分，${report.summary}`,
        issues: [...report.blockers, ...report.warnings].slice(0, 30),
        payload: JSON.stringify({ report }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'longform_creation_diagnosis',
        step_name: 'longform-creation-diagnosis',
        status: report.status === 'ready' ? 'success' : 'warn',
        output_ref: JSON.stringify({ report, review_id: review.id }),
      })
      res.json({ ok: true, report, review, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/propagation-debt/refresh', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const report = buildPropagationDebt(project, chapters, characters, outlines, reviews)
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          propagation_debt: {
            ...(project.reference_config?.propagation_debt || {}),
            latest_report: report,
            updated_at: new Date().toISOString(),
          },
        },
      } as any)
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'propagation_debt',
        status: report.high_count ? 'warn' : 'ok',
        summary: `传播债务：活跃 ${report.active_count} 项，高风险 ${report.high_count} 项`,
        issues: report.debts.slice(0, 30).map((item: any) => `${item.title}：${item.message}`),
        payload: JSON.stringify({ report }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'propagation_debt',
        step_name: 'refresh',
        status: report.high_count ? 'warn' : 'success',
        output_ref: JSON.stringify({ report, review_id: review.id }),
      })
      res.json({ ok: true, report, project: updated, review, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/propagation-debt/:debtId/resolve', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const old = project.reference_config?.propagation_debt || {}
      const resolved = [{ id: req.params.debtId, note: String(req.body?.note || ''), resolved_at: new Date().toISOString() }, ...asArray(old.resolved)].slice(0, 200)
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), propagation_debt: { ...old, resolved } },
      } as any)
      res.json({ ok: true, project: updated, resolved })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/propagation-debt/llm-plan', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const modelId = req.body?.model_id ? String(req.body.model_id) : undefined
      if (!modelId) return res.status(400).json({ error: 'model_id is required' })
      const [chapters, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const report = buildPropagationDebt(project, chapters, characters, outlines, reviews)
      const prompt = buildPropagationDebtLlmPrompt(project, report, chapters, characters, outlines, reviews)
      const result = await executeNovelAgent('review-agent', project, { task: prompt }, {
        activeWorkspace,
        modelId,
        maxTokens: 7000,
        temperature: 0.2,
        skipMemory: true,
      })
      const aiPlan = (result as any).output || parseJsonLikePayload((result as any).content) || { raw: (result as any).content || '' }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          propagation_debt: {
            ...(project.reference_config?.propagation_debt || {}),
            latest_report: report,
            latest_ai_plan: aiPlan,
            updated_at: new Date().toISOString(),
          },
        },
      } as any)
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'propagation_debt_llm',
        status: (result as any).error ? 'warn' : (asArray(aiPlan.do_not_generate_until).length ? 'warn' : 'ok'),
        summary: `AI 传播债务修复方案：${aiPlan.overall_verdict || report.active_count + ' 项债务'}`,
        issues: [
          ...asArray(aiPlan.do_not_generate_until).slice(0, 12).map((item: any) => `生成前阻塞：${item}`),
          ...asArray(aiPlan.repair_plan).slice(0, 12).map((item: any) => `${item.target || '修复'}：${item.action || item.reason || ''}`),
        ].filter(Boolean),
        payload: opsJson({ local_report: report, ai_plan: aiPlan, llm_result: result }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'propagation_debt_llm',
        step_name: 'llm-plan',
        status: (result as any).error ? 'warn' : 'success',
        input_ref: JSON.stringify({ model_id: modelId, local_report_id: report.debt_id }),
        output_ref: opsJson({ local_report: report, ai_plan: aiPlan, review_id: review.id, llm_result: result }),
        error_message: (result as any).error || '',
      })
      res.json({ ok: true, report, ai_plan: aiPlan, llm_result: result, project: updated, review, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/model-diagnostics', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [models, providers, keys, runs] = await Promise.all([
        readModels(activeWorkspace),
        readProviders(activeWorkspace),
        readKeys(activeWorkspace),
        listNovelRuns(activeWorkspace, project.id),
      ])
      const rows = models.map((model: any) => {
        const provider = providers.find(item => item.id === model.provider)
        const key = keys.find(item => item.id === model.api_key_id)
        const recommendation = modelUsageRecommendation(model)
        return {
          id: model.id,
          display_name: model.display_name,
          model_name: model.model_name,
          provider: provider?.display_name || model.provider,
          provider_active: provider?.is_active !== false,
          key_ready: Boolean(key?.has_key || key?.key || key?.key_preview) && key?.is_active !== false,
          health_status: model.health_status || 'unknown',
          last_tested_at: model.last_tested_at || '',
          capabilities: model.capabilities || {},
          recommendation,
          score: [
            provider?.is_active !== false ? 20 : 0,
            key && key.is_active !== false ? 20 : 0,
            model.health_status === 'healthy' ? 25 : model.health_status === 'unknown' ? 10 : 0,
            recommendation.draft ? 15 : 0,
            recommendation.long_context ? 10 : 0,
            model.capabilities?.chat ? 10 : 0,
          ].reduce((sum, item) => sum + item, 0),
        }
      })
      const recentFailures = runs
        .filter(run => ['failed', 'warn'].includes(run.status) || String(run.error_message || run.output_ref || '').includes('Provider'))
        .slice(0, 12)
        .map(run => ({ id: run.id, run_type: run.run_type, step_name: run.step_name, status: run.status, error: compactText(run.error_message || run.output_ref || '', 220), created_at: run.created_at }))
      const report = {
        created_at: new Date().toISOString(),
        model_count: rows.length,
        healthy_count: rows.filter(row => row.health_status === 'healthy').length,
        ready_count: rows.filter(row => row.score >= 70).length,
        rows: rows.sort((a, b) => b.score - a.score),
        recent_failures: recentFailures,
        next_actions: [
          rows.some(row => !row.key_ready) ? '存在模型未绑定有效 Key。' : '',
          rows.some(row => row.health_status !== 'healthy') ? '建议在模型管理里运行健康探针。' : '',
          recentFailures.length ? '近期存在模型调用失败，批量生产前建议切换健康模型或降低并发。' : '',
        ].filter(Boolean),
      }
      res.json({ ok: true, report })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/genre-templates', (_req, res) => {
    res.json({ ok: true, templates: genreTemplates })
  })

  app.post('/api/novel/projects/:id/genre-templates/:templateId/apply', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const template = genreTemplates.find(item => item.id === req.params.templateId)
      if (!template) return res.status(404).json({ error: 'template not found' })
      const currentBible = project.reference_config?.writing_bible || {}
      const writingBible = {
        ...currentBible,
        promise: currentBible.promise || template.promise,
        style_lock: { ...(currentBible.style_lock || {}), ...template.style_lock },
        genre_method: template.structure,
        genre_template_id: template.id,
        updated_at: new Date().toISOString(),
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        genre: project.genre || template.genre,
        reference_config: {
          ...(project.reference_config || {}),
          writing_bible: writingBible,
        },
      } as any)
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'genre_template_apply',
        step_name: template.id,
        status: 'success',
        output_ref: opsJson({ template, writing_bible: writingBible }),
      })
      res.json({ ok: true, template, writing_bible: writingBible, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/backup-package', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, worldbuilding, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelWorldbuilding(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      const payload = {
        package_type: 'novel_project_backup',
        exported_at: new Date().toISOString(),
        project,
        chapters,
        outlines,
        characters,
        worldbuilding,
        reviews,
        runs,
      }
      const text = JSON.stringify(payload, null, 2)
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(project.title || `novel-${project.id}`)}-backup-${Date.now()}.json"`)
      res.send(text)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/backup-snapshot', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, worldbuilding, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelWorldbuilding(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      const manifest = {
        snapshot_id: `backup-${project.id}-${Date.now()}`,
        created_at: new Date().toISOString(),
        project_id: project.id,
        title: project.title,
        counts: { chapters: chapters.length, outlines: outlines.length, characters: characters.length, worldbuilding: worldbuilding.length, reviews: reviews.length, runs: runs.length },
        text_hash: textHash(JSON.stringify({ project, chapters, outlines, characters, worldbuilding })),
      }
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'project_backup',
        status: 'ok',
        summary: `项目备份快照：${manifest.snapshot_id}`,
        issues: [],
        payload: JSON.stringify({ manifest }),
      })
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'project_backup',
        step_name: manifest.snapshot_id,
        status: 'success',
        output_ref: JSON.stringify({ manifest, review_id: review.id }),
      })
      res.json({ ok: true, manifest, review })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/backup-package/import', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const backup = normalizeBackupPayload(req.body)
      const result = await importBackupAsNewProject(activeWorkspace, backup, req.body?.options || {})
      res.json({ ok: true, ...result })
    } catch (error: any) {
      res.status(400).json({ error: String(error?.message || error) })
    }
  })
}
