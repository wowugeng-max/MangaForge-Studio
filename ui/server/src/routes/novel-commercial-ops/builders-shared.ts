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

export function wc(text: string) {
  return String(text || '').replace(/\s/g, '').length
}
export function splitParagraphs(text: string) {
  return String(text || '').split(/\n+/).map(item => item.trim()).filter(Boolean)
}
export function topRepeatedPhrases(text: string) {
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
export function chapterSnippet(chapter: any, limit = 900) {
  const text = String(chapter.chapter_text || '')
  if (!text) return ''
  if (text.length <= limit) return text
  const head = text.slice(0, Math.floor(limit * 0.55))
  const tail = text.slice(-Math.floor(limit * 0.35))
  return `${head}\n...\n${tail}`
}
export function includesAny(value: string, words: string[]) {
  const text = String(value || '')
  return words.some(word => text.includes(word))
}
export function outlineText(outlines: any[]) {
  return outlines.map(item => [item.title, item.summary, item.key_plot, item.goal, item.conflict, item.payoff].filter(Boolean).join(' ')).join('\n')
}
export function latestReportByKey(reviews: any[], reviewType: string, payloadKey: string) {
  const rows = asArray(reviews)
    .filter(review => review?.review_type === reviewType)
    .sort((a, b) => Date.parse(String(b.created_at || '')) - Date.parse(String(a.created_at || '')))
  const payload = parseJsonLikePayload(rows[0]?.payload) || {}
  return payload[payloadKey] || payload.report || payload.result?.[payloadKey] || payload.result?.report || payload.result || payload
}
export function segmentTrialScore(chapters: any[], chapterNos: number[]) {
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
export function personaRiskLevel(score: number) {
  if (score >= 82) return 'low'
  if (score >= 68) return 'medium'
  return 'high'
}
export function parseChapterNoFromText(value: any) {
  const raw = String(value || '')
  const match = raw.match(/第\s*(\d+)\s*章/i) || raw.match(/chapter\s*(\d+)/i)
  return match ? Number(match[1]) : null
}
export function latestReport(reviews: any[], reviewType: string) {
  const rows = asArray(reviews)
    .filter(review => review?.review_type === reviewType)
    .sort((a, b) => Date.parse(String(b.created_at || '')) - Date.parse(String(a.created_at || '')))
  const payload = parseJsonLikePayload(rows[0]?.payload) || {}
  return payload.report || payload.result?.report || payload
}
export function dimensionStatus(score: number, block = false) {
  if (block || score < 60) return 'block'
  if (score < 80) return 'warn'
  return 'ok'
}
export function buildDiagnosisDimension(key: string, label: string, score: number, detail: string, evidence: string[], blockers: string[] = [], warnings: string[] = []) {
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
export function countSettingTypes(settings: any[], types: string[]) {
  return settings.filter(item => types.includes(String(item.entity_type || item.type || ''))).length
}
export function firstText(...values: any[]) {
  for (const value of values) {
    const normalized = String(value || '').trim()
    if (normalized) return normalized
  }
  return ''
}
export function uniqueTexts(values: any[], limit: number) {
  return Array.from(new Set(values.map(item => String(item || '').trim()).filter(Boolean))).slice(0, limit)
}
export function buildLongformCompass(project: any, bible: any, outlines: any[], settingEntities: any[], worldbuilding: any[]) {
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
