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
  splitParagraphs,
  topRepeatedPhrases,
  chapterSnippet,
} from './builders-shared'

export function buildMechanicalQaLlmPrompt(project: any, report: any, chapters: any[]) {
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

export function buildPropagationDebtLlmPrompt(project: any, report: any, chapters: any[], characters: any[], outlines: any[], reviews: any[]) {
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

export function buildMechanicalQa(project: any, chapters: any[]) {
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

export function buildPropagationDebt(project: any, chapters: any[], characters: any[], outlines: any[], reviews: any[]) {
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



