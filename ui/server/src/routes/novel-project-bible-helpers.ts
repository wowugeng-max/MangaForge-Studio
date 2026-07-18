import type { Express } from 'express'
import {
  appendNovelRun,
  createNovelReview,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelWorldbuilding,
  updateNovelProject,
} from '../novel'
import { executeNovelAgent } from '../llm'
import {
  COMMERCIAL_WEB_NOVEL_STYLE_LOCK_DEFAULTS,
  asArray,
  getNovelPayload,
  getStyleLock,
  parseJsonLikePayload,
  safeJsonStringify,
  stableTextHash,
} from './novel-route-utils'
import { normalizeStyleSampleBank } from './novel-writing-service'

export type ProjectBibleRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  getStoredOrBuiltWritingBible: (workspace: string, project: any) => Promise<any>
  getStoryState: (project: any) => any
}

export function compactControlText(value: any, limit = 600) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

export function bibleJson(value: any, maxChars = 0) {
  return safeJsonStringify(value, 2, maxChars)
}

function proseChars(value: any) {
  return String(value || '').replace(/[\s　]/g, '').length
}

function sentenceCount(value: any) {
  return Math.max(1, (String(value || '').match(/[。！？!?]/g) || []).length)
}

function dialogueRatio(value: any) {
  const text = String(value || '')
  const quoted = Array.from(text.matchAll(/[“"「『]([^”"」』]{1,300})[”"」』]/g))
    .reduce((sum, match) => sum + String(match[1] || '').length, 0)
  return quoted / Math.max(1, proseChars(text))
}

function chapterQualityScore(chapter: any, reviews: any[] = []) {
  const review = reviews
    .filter(item => Number(item.chapter_id || 0) === Number(chapter.id || 0) || Number((parseJsonLikePayload(item.payload) || {})?.chapter_no || 0) === Number(chapter.chapter_no || 0))
    .filter(item => item.review_type === 'prose_quality')
    .slice()
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0]
  const payload = parseJsonLikePayload(review?.payload) || {}
  const score = Number(payload?.self_check?.review?.score ?? payload?.review?.score ?? payload?.score ?? 0)
  return Number.isFinite(score) ? score : 0
}

function chapterStyleCandidateKey(chapter: any) {
  return `高分章${Number(chapter.chapter_no || 0) || ''}｜${String(chapter.title || '风格样本').trim()}`
}

function inferStyleSampleSceneFit(chapter: any) {
  const basis = [
    chapter.title,
    chapter.chapter_goal,
    chapter.chapter_summary,
    chapter.conflict,
    chapter.ending_hook,
  ].map(item => String(item || '')).join(' ')
  const applicable = new Set<string>()
  const avoid = new Set<string>()

  if (/反打|反制|围堵|追杀|强敌|危机|压迫|规则/.test(basis)) {
    applicable.add('高压反打')
    applicable.add('危机压迫')
    avoid.add('纯背景说明')
    avoid.add('低压日常过场')
    avoid.add('情绪余韵长铺垫')
  }
  if (/对白|交锋|试探|谈判|质问|斗嘴|信息差/.test(basis)) {
    applicable.add('对白交锋')
    applicable.add('信息差试探')
    avoid.add('纯动作无信息差')
    avoid.add('大段设定说明')
  }
  if (/揭秘|真相|线索|秘密|身份|令牌|伏笔/.test(basis)) {
    applicable.add('线索揭秘')
    applicable.add('伏笔回收')
    avoid.add('无伏笔验证的临时解释')
    avoid.add('纯打斗收束')
  }
  if (/情感|告别|关系|和解|背叛|选择/.test(basis)) {
    applicable.add('情感爆点')
    avoid.add('硬爽反打')
    avoid.add('信息密集说明')
  }
  if (/解释|背景|设定|过场|铺垫/.test(basis)) {
    applicable.add('铺垫说明')
    avoid.add('高潮反打')
    avoid.add('章末强悬念压迫')
  }
  if (String(chapter.ending_hook || '').trim()) {
    applicable.add('章末追读钩子')
  }
  if (!applicable.size) applicable.add('本章同类高分场景')
  if (!avoid.size) avoid.add('与本章冲突强度不一致的场景')
  return {
    applicable_scenes: Array.from(applicable),
    avoid_scenes: Array.from(avoid),
  }
}

export function buildStyleSampleCandidatesFromChapters(chapters: any[] = [], reviews: any[] = [], options: any = {}) {
  const minScore = Number(options.min_score ?? options.minScore ?? 86)
  const limit = Number(options.limit || 6)
  const candidates = chapters
    .filter(chapter => String(chapter?.chapter_text || '').trim().length > 0)
    .map(chapter => ({ chapter, score: chapterQualityScore(chapter, reviews) }))
    .filter(item => item.score >= minScore)
    .sort((a, b) => b.score - a.score || Number(a.chapter.chapter_no || 0) - Number(b.chapter.chapter_no || 0))
    .slice(0, limit)
    .map(({ chapter, score }) => {
      const text = String(chapter.chapter_text || '')
      const avgSentence = Math.round(proseChars(text) / sentenceCount(text))
      const ratio = Math.round(dialogueRatio(text) * 100)
      return {
        sample_key: chapterStyleCandidateKey(chapter),
        scene_function: compactControlText(chapter.chapter_goal || chapter.conflict || chapter.chapter_summary || '高分章节表达策略', 120),
        ...inferStyleSampleSceneFit(chapter),
        narrative_rhythm: compactControlText([
          chapter.chapter_summary || '围绕本章目标推进',
          chapter.conflict ? `冲突：${chapter.conflict}` : '',
          chapter.ending_hook ? `章末钩子：${chapter.ending_hook}` : '',
        ].filter(Boolean).join('；'), 220),
        sentence_pattern: `平均句长约 ${avgSentence} 字；保留该章的句式密度，只学习节奏，不复制原句。`,
        dialogue_ratio: `约 ${ratio}%`,
        voice_rules: [
          '提炼角色口吻的功能：判断、试探、反压、泄压或暴露信息差。',
          '保留作者自己的停顿和节奏感，但不得搬运该章台词。',
        ],
        abstract_usage: `来自第 ${chapter.chapter_no || '-'} 章高分正文（质检 ${score}）。只学习场景功能、叙述节奏、句式密度、对白比例和角色口吻，不复制该章桥段、设定和原句。`,
        unsafe_direct_phrases: ['原句不能照搬', '不得复制该章桥段、角色名、专有设定和核心梗'],
        source_chapter_no: chapter.chapter_no || null,
        source_chapter_id: chapter.id || null,
        source_quality_score: score,
      }
    })
  return normalizeStyleSampleBank(candidates)
}

export function chapterStyleSampleStrategy(chapter: any) {
  return chapter?.raw_payload?.pre_draft_brief?.style_sample_strategy
    || chapter?.raw_payload?.context_package?.pre_draft_brief?.style_sample_strategy
    || chapter?.raw_payload?.context_package?.chapter_target?.style_sample_strategy
    || {}
}

function latestChapterPayloadReview(reviews: any[] = [], chapter: any, reviewType: string, payloadKey = '') {
  const chapterId = Number(chapter?.id || 0)
  const chapterNo = Number(chapter?.chapter_no || 0)
  const review = asArray(reviews)
    .filter(item => item?.review_type === reviewType)
    .filter(item => {
      const payload = parseJsonLikePayload(item?.payload) || {}
      return Number(item?.chapter_id || 0) === chapterId
        || Number(payload?.chapter_id || payload?.chapterId || 0) === chapterId
        || Number(payload?.chapter_no || payload?.chapterNo || 0) === chapterNo
    })
    .slice()
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0]
  const payload = parseJsonLikePayload(review?.payload) || {}
  return payloadKey ? (payload[payloadKey] || payload?.result?.[payloadKey] || payload) : payload
}

function styleSyncForChapter(reviews: any[] = [], chapter: any) {
  const payload = latestChapterPayloadReview(reviews, chapter, 'style_sample_sync', 'style_sample_sync')
  return payload?.style_sample_sync || payload
}

function itemSampleKey(item: any) {
  return String(item?.sample_key || item?.sampleKey || item?.key || '').trim()
}

function roundAverage(values: number[]) {
  const valid = values.filter(value => Number.isFinite(value) && value > 0)
  if (!valid.length) return 0
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length)
}

function sampleSceneTags(sample: any) {
  return Array.from(new Set([
    ...asArray(sample?.applicable_scenes),
    ...asArray(sample?.avoid_scenes),
  ].map((item: any) => String(item || '').trim()).filter(Boolean))).slice(0, 6)
}

function styleEffectivenessText(item: any) {
  return String(item?.label || item?.text || item?.key || item || '').trim()
}

export function uniqueStyleTexts(values: any[] = []) {
  return Array.from(new Set(asArray(values).map(styleEffectivenessText).filter(Boolean)))
}

function appendPatchText(base: any, text: string) {
  const current = String(base || '').trim()
  const next = String(text || '').trim()
  if (!next || current.includes(next)) return current
  return current ? `${current}；${next}` : next
}

function pushUniquePatchOperation(operations: any[], updated: any, path: string, value: string) {
  const key = path.replace(/^\//, '')
  const current = asArray(updated[key]).map(styleEffectivenessText).filter(Boolean)
  if (current.includes(value)) return false
  updated[key] = [...current, value]
  operations.push({ op: 'add_unique', path, value })
  return true
}

function buildStyleSampleAdjustmentSuggestion(row: any, riskLabel: string, hitRate: number) {
  const missedLabels = uniqueStyleTexts(row.missed_labels)
  const copiedPhrases = uniqueStyleTexts(row.copied_phrases)
  if (copiedPhrases.length > 0) {
    return {
      action: 'tighten_copy_guard',
      label: '补禁抄短语',
      detail: [
        `把 ${copiedPhrases.slice(0, 3).join('、')} 写入 unsafe_direct_phrases，并改写 abstract_usage，强调只学习节奏不复刻原句。`,
        missedLabels.length ? `同时复盘未命中的 ${missedLabels.slice(0, 3).join('、')}，把描述改成更可执行的动作/对白/句式要求。` : '',
      ].filter(Boolean).join(''),
    }
  }
  if (missedLabels.length > 0) {
    return {
      action: 'revise_strategy',
      label: '改策略描述',
      detail: `重点改写 ${missedLabels.slice(0, 3).join('、')}：收窄 applicable_scenes，补清 narrative_rhythm / sentence_pattern / dialogue_ratio 的可执行标准，避免继续泛化失手。`,
    }
  }
  if (hitRate > 0 && hitRate < 80) {
    return {
      action: 'narrow_scene_fit',
      label: '收窄适用场景',
      detail: `历史命中率 ${hitRate}%，建议减少 applicable_scenes，补充 avoid_scenes，只保留真正稳定的章节功能。`,
    }
  }
  if (riskLabel === '待验证') {
    return {
      action: 'collect_more_data',
      label: '继续观察',
      detail: '样章还没有足够使用记录，先保留但不要作为唯一风格依据。',
    }
  }
  return {
    action: 'keep',
    label: '保留策略',
    detail: '样章表现稳定，可继续作为同类章节优先候选。',
  }
}

export function buildStyleSampleAdjustmentPatch(sample: any, reportItem: any = {}) {
  const sampleKey = String(sample?.sample_key || reportItem?.sample_key || '').trim()
  const suggestion = reportItem?.adjustment_suggestion || {}
  const action = String(suggestion.action || '').trim() || 'keep'
  const label = String(suggestion.label || '').trim() || '保留策略'
  const missedLabels = uniqueStyleTexts(reportItem?.missed_labels)
  const copiedPhrases = uniqueStyleTexts(reportItem?.copied_phrases)
  const updated = {
    ...sample,
    sample_key: sampleKey,
    unsafe_direct_phrases: asArray(sample?.unsafe_direct_phrases).map(styleEffectivenessText).filter(Boolean),
    applicable_scenes: asArray(sample?.applicable_scenes).map(styleEffectivenessText).filter(Boolean),
    avoid_scenes: asArray(sample?.avoid_scenes).map(styleEffectivenessText).filter(Boolean),
  }
  const operations: any[] = []

  if (action === 'tighten_copy_guard') {
    for (const phrase of copiedPhrases) {
      pushUniquePatchOperation(operations, updated, '/unsafe_direct_phrases', phrase)
    }
    const note = [
      copiedPhrases.length ? `样章复盘补丁：禁抄 ${copiedPhrases.slice(0, 3).join('、')}，只保留节奏、句式密度和对白功能。` : '',
      missedLabels.length ? `重点修复 ${missedLabels.slice(0, 3).join('、')} 的可执行描述。` : '',
    ].filter(Boolean).join('')
    const nextAbstractUsage = appendPatchText(updated.abstract_usage, note)
    if (nextAbstractUsage !== String(updated.abstract_usage || '').trim()) {
      updated.abstract_usage = nextAbstractUsage
      operations.push({ op: 'replace', path: '/abstract_usage', value: nextAbstractUsage })
    }
  } else if (action === 'revise_strategy') {
    const focus = missedLabels.length ? missedLabels.slice(0, 3).join('、') : '未命中风格项'
    const nextNarrativeRhythm = appendPatchText(updated.narrative_rhythm, `复盘补丁：把 ${focus} 写成动作、对白或句式层面的明确执行标准。`)
    if (nextNarrativeRhythm !== String(updated.narrative_rhythm || '').trim()) {
      updated.narrative_rhythm = nextNarrativeRhythm
      operations.push({ op: 'replace', path: '/narrative_rhythm', value: nextNarrativeRhythm })
    }
    const nextAbstractUsage = appendPatchText(updated.abstract_usage, `后续使用时必须检查 ${focus} 是否落地。`)
    if (nextAbstractUsage !== String(updated.abstract_usage || '').trim()) {
      updated.abstract_usage = nextAbstractUsage
      operations.push({ op: 'replace', path: '/abstract_usage', value: nextAbstractUsage })
    }
  } else if (action === 'narrow_scene_fit') {
    const marker = `历史命中率 ${Number(reportItem?.hit_rate || 0)}% 的泛化场景需人工复核`
    pushUniquePatchOperation(operations, updated, '/avoid_scenes', marker)
    const nextAbstractUsage = appendPatchText(updated.abstract_usage, '复盘补丁：只在历史高命中的同类章节中使用，不作为泛场景口吻模板。')
    if (nextAbstractUsage !== String(updated.abstract_usage || '').trim()) {
      updated.abstract_usage = nextAbstractUsage
      operations.push({ op: 'replace', path: '/abstract_usage', value: nextAbstractUsage })
    }
  }

  const patch = {
    sample_key: sampleKey,
    action,
    label,
    changed: operations.length > 0,
    operations,
    updated_sample: updated,
  }
  return {
    ...patch,
    patch_json: JSON.stringify(patch, null, 2),
  }
}

export function applyStyleSampleAdjustmentPatch(styleSampleBank: any[] = [], reportItem: any = {}) {
  const sampleKey = String(reportItem?.sample_key || '').trim()
  const currentBank = asArray(styleSampleBank)
  let patch: any = {
    sample_key: sampleKey,
    action: reportItem?.adjustment_suggestion?.action || 'keep',
    label: reportItem?.adjustment_suggestion?.label || '保留策略',
    changed: false,
    operations: [],
    updated_sample: null,
    patch_json: '',
  }
  const nextBank = currentBank.map((sample: any) => {
    const key = String(sample?.sample_key || sample?.key || sample?.name || '').trim()
    if (key !== sampleKey) return sample
    patch = buildStyleSampleAdjustmentPatch(sample, reportItem)
    return patch.updated_sample
  })
  if (!patch.patch_json) patch.patch_json = JSON.stringify(patch, null, 2)
  return {
    changed: Boolean(patch.changed),
    patch,
    style_sample_bank: nextBank,
  }
}

export function applyStyleSampleAdjustmentBatch(styleSampleBank: any[] = [], report: any = {}, options: any = {}) {
  const requestedKeys = new Set(asArray(options?.sample_keys || options?.sampleKeys).map(styleEffectivenessText).filter(Boolean))
  const reportItems = asArray(report?.samples)
    .filter((item: any) => String(item?.risk_label || '') === '需复盘')
    .filter((item: any) => !requestedKeys.size || requestedKeys.has(String(item?.sample_key || '').trim()))
  let nextBank = asArray(styleSampleBank)
  const patches: any[] = []

  for (const item of reportItems) {
    const result = applyStyleSampleAdjustmentPatch(nextBank, item)
    nextBank = result.style_sample_bank
    patches.push(result.patch)
  }

  const changedCount = patches.filter((patch: any) => patch?.changed).length
  const batch = {
    changed: changedCount > 0,
    total_patch_count: patches.length,
    changed_count: changedCount,
    skipped_count: Math.max(0, asArray(report?.samples).length - patches.length),
    patches,
    style_sample_bank: nextBank,
  }
  return {
    ...batch,
    patch_json: JSON.stringify({
      total_patch_count: batch.total_patch_count,
      changed_count: batch.changed_count,
      skipped_count: batch.skipped_count,
      patches,
    }, null, 2),
  }
}

function cloneJsonValue(value: any) {
  return JSON.parse(JSON.stringify(value ?? null))
}

export function buildStyleSamplePatchHistoryEntry(beforeStyleSampleBank: any[] = [], afterStyleSampleBank: any[] = [], metadata: any = {}) {
  const patches = asArray(metadata?.patches)
  const changedPatches = patches.filter((patch: any) => patch?.changed !== false)
  const sampleKeys = uniqueStyleTexts((changedPatches.length ? changedPatches : patches).map((patch: any) => patch?.sample_key))
  const appliedAt = String(metadata?.applied_at || metadata?.appliedAt || new Date().toISOString())
  const mode = String(metadata?.mode || 'single')
  const beforeBank = cloneJsonValue(asArray(beforeStyleSampleBank))
  const afterBank = cloneJsonValue(asArray(afterStyleSampleBank))
  const changedCount = Number(metadata?.changed_count ?? metadata?.changedCount ?? changedPatches.length)
  const patchId = `style-sample-patch-${stableTextHash(JSON.stringify({
    applied_at: appliedAt,
    mode,
    sample_keys: sampleKeys,
    changed_count: changedCount,
    before_style_sample_bank: beforeBank,
    after_style_sample_bank: afterBank,
  }))}`
  return {
    patch_id: patchId,
    mode,
    sample_keys: sampleKeys,
    changed_count: Number.isFinite(changedCount) ? changedCount : sampleKeys.length,
    patches: cloneJsonValue(patches),
    before_style_sample_bank: beforeBank,
    after_style_sample_bank: afterBank,
    applied_at: appliedAt,
    undone: false,
  }
}

export function undoLatestStyleSamplePatchHistory(writingBible: any = {}, undoneAt = new Date().toISOString()) {
  const history = asArray(writingBible?.style_sample_patch_history)
  const targetIndex = (() => {
    for (let index = history.length - 1; index >= 0; index -= 1) {
      if (!history[index]?.undone) return index
    }
    return -1
  })()
  if (targetIndex < 0) {
    return { changed: false, writing_bible: writingBible || {}, history_entry: null }
  }

  const restoredBank = cloneJsonValue(asArray(history[targetIndex]?.before_style_sample_bank))
  const nextHistory = history.map((entry: any, index: number) => index === targetIndex
    ? { ...entry, undone: true, undone_at: undoneAt }
    : entry)
  const nextWritingBible = {
    ...(writingBible || {}),
    style_sample_bank: restoredBank,
    style_sample_patch_history: nextHistory,
  }
  return {
    changed: true,
    writing_bible: nextWritingBible,
    history_entry: nextHistory[targetIndex],
  }
}

function styleSampleStrategyKeys(strategy: any = {}) {
  return Array.from(new Set(normalizeStyleSampleBank(strategy?.samples || strategy?.style_sample_bank || strategy?.styleSampleBank || [])
    .map((sample: any) => String(sample?.sample_key || sample?.key || sample?.name || '').trim())
    .filter(Boolean)))
}

function styleSamplePatchReviewRisky(row: any) {
  if (!row) return false
  const riskLabel = String(row?.risk_label || row?.riskLabel || '')
  const hitRate = Number(row?.hit_rate ?? row?.hitRate ?? 0) || 0
  const missedCount = Number(row?.missed_count || row?.missedCount || 0) || 0
  const copyRiskCount = Number(row?.copy_risk_count || row?.copyRiskCount || 0) || 0
  return riskLabel === '需复盘' || copyRiskCount > 0 || missedCount > 0 || (hitRate > 0 && hitRate < 80)
}

export function buildStyleSamplePatchPostApplyReview(effectivenessReport: any = {}, options: any = {}) {
  const patchedSampleKeys = uniqueStyleTexts([
    ...asArray(options?.patched_sample_keys || options?.patchedSampleKeys || options?.sample_keys || options?.sampleKeys),
    ...asArray(options?.patch?.sample_keys || options?.patch?.sampleKeys),
    options?.patch?.sample_key || options?.patch?.sampleKey || '',
  ])
  const nextStrategy = options?.next_style_sample_strategy || options?.nextStyleSampleStrategy || options?.style_sample_strategy || {}
  const selectedKeys = styleSampleStrategyKeys(nextStrategy)
  const rowsByKey = new Map(asArray(effectivenessReport?.samples || effectivenessReport?.items || effectivenessReport)
    .map((item: any) => [String(item?.sample_key || item?.sampleKey || '').trim(), item])
    .filter(([key]) => Boolean(key)))
  const patchedRows = patchedSampleKeys.map(key => rowsByKey.get(key) || {
    sample_key: key,
    risk_label: '未找到',
    usage_count: 0,
    hit_rate: 0,
    missed_count: 0,
    copy_risk_count: 0,
  })
  const stillRiskyKeys = patchedRows.filter(styleSamplePatchReviewRisky).map((row: any) => String(row?.sample_key || row?.sampleKey || '').trim()).filter(Boolean)
  const selectedRiskyKeys = selectedKeys.filter(key => stillRiskyKeys.includes(key))
  const nextTaskSelectsRepatchedRiskySample = selectedRiskyKeys.length > 0
  const status = !patchedSampleKeys.length
    ? 'empty'
    : nextTaskSelectsRepatchedRiskySample
      ? 'warn'
      : stillRiskyKeys.length
        ? 'watch'
        : 'ok'
  const recommendedRepairAction = nextTaskSelectsRepatchedRiskySample ? {
    action: 'replace',
    label: '换样章并重审任务书',
    requires_task_book_reconfirm: true,
    endpoint_hint: '/api/novel/chapters/:chapterId/pre-draft-brief/style-samples',
    request_body: { action: 'replace' },
  } : null
  const nextActions = (() => {
    if (!patchedSampleKeys.length) return ['暂无样章补丁记录；先应用补丁或选择要复检的样章。']
    if (nextTaskSelectsRepatchedRiskySample) {
      return [
        `当前/下一章任务书仍选择 ${selectedRiskyKeys.join('、')}，请在任务书里点击换一组或不用样章，重新确认后再生成正文。`,
        '继续复盘该样章的 applicable_scenes / avoid_scenes 和 unsafe_direct_phrases，避免低命中策略反复进入同类章节。',
      ]
    }
    if (stillRiskyKeys.length) {
      return [
        '下一章任务书未继续选择低命中样章；先保留观察，等新章节复盘后再判断补丁是否有效。',
        `仍需跟踪 ${stillRiskyKeys.join('、')} 的命中率、缺口和照搬风险。`,
      ]
    }
    return ['补丁样章当前未显示复盘风险；下一章任务书可按正常筛选结果继续使用。']
  })()
  return {
    status,
    patched_sample_keys: patchedSampleKeys,
    still_risky_sample_keys: stillRiskyKeys,
    next_task_selected_sample_keys: selectedKeys,
    selected_risky_sample_keys: selectedRiskyKeys,
    next_task_selects_repatched_risky_sample: nextTaskSelectsRepatchedRiskySample,
    recommended_repair_action: recommendedRepairAction,
    patched_samples: patchedRows,
    next_actions: nextActions,
  }
}

export function buildStyleSampleEffectivenessReport(styleSampleBank: any[] = [], chapters: any[] = [], reviews: any[] = []) {
  const bank = normalizeStyleSampleBank(styleSampleBank)
  const rows = new Map<string, any>()

  const ensureRow = (sample: any) => {
    const key = String(sample?.sample_key || '').trim()
    if (!key) return null
    if (!rows.has(key)) {
      rows.set(key, {
        sample_key: key,
        usage_count: 0,
        style_scores: [],
        quality_scores: [],
        planned_count: 0,
        delivered_count: 0,
        missed_count: 0,
        copy_risk_count: 0,
        missed_labels: [],
        copied_phrases: [],
        scene_tags: sampleSceneTags(sample),
        chapter_refs: [],
        sample,
      })
    }
    const row = rows.get(key)
    if (!row.scene_tags.length) row.scene_tags = sampleSceneTags(sample)
    row.sample = row.sample || sample
    return row
  }

  bank.forEach(ensureRow)

  for (const chapter of asArray(chapters)) {
    const strategy = chapterStyleSampleStrategy(chapter)
    const samples = normalizeStyleSampleBank(strategy?.samples || strategy?.style_sample_bank || [])
    if (!samples.length) continue
    const sync = styleSyncForChapter(reviews, chapter)
    const styleScore = Number(sync?.score || 0)
    const qualityScore = chapterQualityScore(chapter, reviews)
    const copyRiskItems = asArray(sync?.copied_phrases || sync?.copiedPhrases)
    const planned = asArray(sync?.planned)
    const delivered = asArray(sync?.delivered)
    const missed = asArray(sync?.missed)
    const chapterRef = {
      chapter_id: chapter?.id || null,
      chapter_no: chapter?.chapter_no || null,
      title: chapter?.title || '',
    }

    for (const sample of samples) {
      const row = ensureRow(sample)
      if (!row) continue
      const key = row.sample_key
      const plannedForSample = planned.filter((item: any) => itemSampleKey(item) === key).length
      const deliveredForSample = delivered.filter((item: any) => itemSampleKey(item) === key).length
      const missedForSample = missed.filter((item: any) => itemSampleKey(item) === key).length

      row.usage_count += 1
      if (styleScore > 0) row.style_scores.push(styleScore)
      if (qualityScore > 0) row.quality_scores.push(qualityScore)
      row.planned_count += plannedForSample
      row.delivered_count += deliveredForSample
      row.missed_count += missedForSample
      row.copy_risk_count += missedForSample > 0 ? copyRiskItems.length : 0
      row.missed_labels.push(...missed.filter((item: any) => itemSampleKey(item) === key).map(styleEffectivenessText).filter(Boolean))
      if (missedForSample > 0) row.copied_phrases.push(...copyRiskItems.map(styleEffectivenessText).filter(Boolean))
      row.chapter_refs.push(chapterRef)
    }
  }

  const samples = Array.from(rows.values()).map(row => {
    const averageStyleScore = roundAverage(row.style_scores)
    const hitRate = row.planned_count > 0 ? Math.round((row.delivered_count / row.planned_count) * 100) : 0
    const riskLabel = row.usage_count === 0
      ? '待验证'
      : row.copy_risk_count > 0 || row.missed_count > 0 || (row.planned_count > 0 && hitRate < 80)
        ? '需复盘'
        : '表现稳定'
    const reportItem = {
      sample_key: row.sample_key,
      usage_count: row.usage_count,
      average_style_score: averageStyleScore,
      average_quality_score: roundAverage(row.quality_scores),
      planned_count: row.planned_count,
      delivered_count: row.delivered_count,
      missed_count: row.missed_count,
      copy_risk_count: row.copy_risk_count,
      hit_rate: hitRate,
      risk_label: riskLabel,
      missed_labels: Array.from(new Set(row.missed_labels)).slice(0, 8),
      copied_phrases: Array.from(new Set(row.copied_phrases)).slice(0, 8),
      adjustment_suggestion: buildStyleSampleAdjustmentSuggestion(row, riskLabel, hitRate),
      scene_tags: row.scene_tags,
      chapter_refs: row.chapter_refs.slice(0, 8),
    }
    return {
      ...reportItem,
      adjustment_patch: buildStyleSampleAdjustmentPatch(row.sample || { sample_key: row.sample_key }, reportItem),
    }
  }).sort((a, b) => b.usage_count - a.usage_count || b.average_style_score - a.average_style_score || a.sample_key.localeCompare(b.sample_key))

  return {
    total_samples: samples.length,
    used_sample_count: samples.filter(item => item.usage_count > 0).length,
    risky_sample_count: samples.filter(item => item.risk_label === '需复盘').length,
    samples,
  }
}

function hasStyleValue(value: any) {
  if (Array.isArray(value)) return value.length > 0
  return String(value || '').trim().length > 0
}

function mergeStyleLockDefaults(project: any, fallback: any, payload: any) {
  const baseline = {
    ...COMMERCIAL_WEB_NOVEL_STYLE_LOCK_DEFAULTS,
    ...getStyleLock(project),
    ...(fallback || {}),
  }
  const next = { ...baseline, ...(payload || {}) }
  for (const [key, value] of Object.entries(baseline)) {
    if (!hasStyleValue(next[key])) next[key] = Array.isArray(value) ? [...value] : value
  }
  return next
}

function firstText(...values: any[]) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const item = value.map(entry => String(entry || '').trim()).find(Boolean)
      if (item) return item
      continue
    }
    const text = String(value || '').trim()
    if (text) return text
  }
  return ''
}

export function normalizeGeneratedWritingBible(project: any, payload: any, fallback: any = {}) {
  const styleLock = mergeStyleLockDefaults(project, fallback?.style_lock, payload?.style_lock)
  const safety = payload?.safety_policy || fallback?.safety_policy || project.reference_config?.safety || {}
  const mainline = payload?.mainline || fallback?.mainline || {}
  const volumePlan = asArray(payload?.volume_plan).length ? payload.volume_plan : asArray(fallback?.volume_plan)
  const firstVolume = volumePlan[0] || {}
  const commercialPositioning = payload?.commercial_positioning || fallback?.commercial_positioning || {}
  const readerPromise = firstText(payload?.reader_promise, payload?.readerPromise, payload?.promise, fallback?.reader_promise, fallback?.promise, project.synopsis)
  const protagonistDrive = firstText(payload?.protagonist_drive, payload?.protagonistDrive, mainline.protagonist_drive, mainline.protagonistDrive, fallback?.protagonist_drive, fallback?.protagonistDrive)
  const coreConflict = firstText(payload?.core_conflict, payload?.coreConflict, mainline.core_conflict, mainline.coreConflict, mainline.conflict, fallback?.core_conflict, fallback?.mainline?.core_conflict, project.main_conflict)
  const currentVolumeGoal = firstText(payload?.current_volume_goal, payload?.currentVolumeGoal, payload?.volume_goal, firstVolume.goal, firstVolume.summary, fallback?.current_volume_goal, fallback?.volume_goal)
  const innovationHook = firstText(payload?.innovation_hook, payload?.innovationHook, commercialPositioning.innovation_hook, commercialPositioning.unique_selling_point, commercialPositioning.selling_points?.[0], fallback?.innovation_hook, fallback?.commercial_positioning?.selling_points?.[0])
  const first30Plan = firstText(payload?.first30_plan, payload?.first30Plan, payload?.first_30_plan, payload?.opening_strategy, commercialPositioning.first30_plan, commercialPositioning.retention_strategy, fallback?.first30_plan, fallback?.commercial_positioning?.retention_strategy)
  const longformCapacity = firstText(payload?.longform_capacity, payload?.longformCapacity, mainline.longform_capacity, mainline.longformCapacity, mainline.long_term_question, fallback?.longform_capacity, fallback?.mainline?.longform_capacity)
  return {
    ...(fallback || {}),
    project: {
      ...(fallback?.project || {}),
      ...(payload?.project || {}),
      title: project.title,
      genre: payload?.project?.genre || project.genre || fallback?.project?.genre || '',
      synopsis: payload?.project?.synopsis || project.synopsis || fallback?.project?.synopsis || '',
      target_audience: payload?.project?.target_audience || project.target_audience || fallback?.project?.target_audience || '',
      style_tags: asArray(payload?.project?.style_tags).length ? asArray(payload.project.style_tags) : (project.style_tags || fallback?.project?.style_tags || []),
      length_target: payload?.project?.length_target || project.length_target || fallback?.project?.length_target || '',
    },
    reader_promise: readerPromise,
    protagonist_drive: protagonistDrive,
    core_conflict: coreConflict,
    current_volume_goal: currentVolumeGoal,
    innovation_hook: innovationHook,
    first30_plan: first30Plan,
    longform_capacity: longformCapacity,
    promise: String(payload?.promise || readerPromise || fallback?.promise || project.synopsis || ''),
    world_summary: String(payload?.world_summary || fallback?.world_summary || ''),
    world_rules: asArray(payload?.world_rules).length ? payload.world_rules : asArray(fallback?.world_rules),
    mainline,
    volume_plan: volumePlan,
    characters: asArray(payload?.characters).length ? payload.characters : asArray(fallback?.characters),
    style_lock: {
      ...(styleLock || {}),
      narrative_person: String(styleLock?.narrative_person || ''),
      sentence_length: String(styleLock?.sentence_length || ''),
      dialogue_ratio: String(styleLock?.dialogue_ratio || ''),
      banter_density: String(styleLock?.banter_density || ''),
      payoff_density: String(styleLock?.payoff_density || ''),
      description_density: String(styleLock?.description_density || ''),
      chapter_word_range: String(styleLock?.chapter_word_range || ''),
      banned_words: asArray(styleLock?.banned_words),
      preferred_words: asArray(styleLock?.preferred_words),
      ending_policy: String(styleLock?.ending_policy || ''),
      banned_shortcuts: asArray(styleLock?.banned_shortcuts),
    },
    safety_policy: {
      ...(safety || {}),
      allowed: asArray(safety?.allowed),
      cautious: asArray(safety?.cautious),
      forbidden: asArray(safety?.forbidden),
    },
    forbidden: asArray(payload?.forbidden).length ? payload.forbidden : asArray(safety?.forbidden || fallback?.forbidden),
    commercial_positioning: commercialPositioning,
    generation_rules: asArray(payload?.generation_rules).length ? payload.generation_rules : asArray(fallback?.generation_rules),
    updated_at: new Date().toISOString(),
  }
}

