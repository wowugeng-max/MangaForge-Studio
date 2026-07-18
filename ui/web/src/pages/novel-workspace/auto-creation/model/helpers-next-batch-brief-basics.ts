import type {
  AnyRecord,
  AutoCreationNextBatchBriefChapter,
  AutoCreationNextBatchBriefStartChecklistKey,
  AutoCreationNextBatchBriefStartChecklistItem,
  AutoCreationNextBatchBrief,
  AutoCreationBatchGuardrail,
} from './types'
import {
  arrayValue,
  firstText,
  text,
} from './helpers-basics'
import {
  signal,
} from './helpers-main'

export function serialReleaseInventoryIssue(guardrail: AutoCreationBatchGuardrail) {
  const signal = guardrail.guardrails.find(item => item.label === '连载库存' && item.status !== 'ok')
  return signal || null
}

export function emptyNextBatchBrief(): AutoCreationNextBatchBrief {
  return {
    visible: false,
    chapterRangeLabel: '',
    batchGoal: '',
    readerPayoffPlan: '',
    mainlineFocus: '',
    forbiddenBoundary: '',
    expansionStructureVerification: null,
    expansionStructureDecision: null,
    startChecklist: [],
    chapters: [],
  }
}

export function styleSampleStrategyFromRecord(record: AnyRecord | null | undefined) {
  return record?.styleSampleStrategy
    || record?.style_sample_strategy
    || record?.rawPayload?.preDraftBrief?.styleSampleStrategy
    || record?.rawPayload?.pre_draft_brief?.style_sample_strategy
    || record?.raw_payload?.preDraftBrief?.styleSampleStrategy
    || record?.raw_payload?.pre_draft_brief?.style_sample_strategy
    || record?.raw_payload?.context_package?.pre_draft_brief?.style_sample_strategy
    || record?.raw_payload?.context_package?.chapter_target?.style_sample_strategy
    || null
}

export function styleSampleKeysFromStrategy(strategy: AnyRecord | null | undefined) {
  return Array.from(new Set(
    arrayValue(strategy?.samples)
      .map((sample: any) => text(sample?.sample_key, text(sample?.sampleKey, text(sample?.key))))
      .filter(Boolean),
  ))
}

export function normalizeRouteChapter(record: AnyRecord): AutoCreationNextBatchBriefChapter | null {
  const chapterNo = Number(record?.chapterNo ?? record?.chapter_no ?? 0)
  if (!chapterNo) return null
  const styleSampleStrategy = styleSampleStrategyFromRecord(record)
  const styleSampleKeys = styleSampleKeysFromStrategy(styleSampleStrategy)
  return {
    chapterNo,
    title: firstText(record?.title, `第${chapterNo}章`),
    chapterTask: firstText(record?.chapterTask, record?.chapter_task, record?.task, record?.chapterGoal, record?.chapter_goal),
    conflict: firstText(record?.conflict, record?.raw_payload?.conflict),
    endingHook: firstText(record?.endingHook, record?.ending_hook, record?.hook),
    mainlineProgress: firstText(record?.mainlineProgress, record?.mainline_progress, record?.raw_payload?.mainline_progress),
    ...(styleSampleKeys.length ? { styleSampleStrategy, styleSampleKeys } : {}),
  }
}

export function mergeRouteChapterPlan(
  routeChapter: AutoCreationNextBatchBriefChapter,
  fallback: AutoCreationNextBatchBriefChapter | null,
): AutoCreationNextBatchBriefChapter {
  if (!fallback) return routeChapter
  return {
    chapterNo: routeChapter.chapterNo || fallback.chapterNo,
    title: routeChapter.title || fallback.title,
    chapterTask: routeChapter.chapterTask || fallback.chapterTask,
    conflict: routeChapter.conflict || fallback.conflict,
    endingHook: routeChapter.endingHook || fallback.endingHook,
    mainlineProgress: routeChapter.mainlineProgress || fallback.mainlineProgress,
    styleSampleStrategy: routeChapter.styleSampleStrategy || fallback.styleSampleStrategy || null,
    styleSampleKeys: routeChapter.styleSampleKeys?.length ? routeChapter.styleSampleKeys : fallback.styleSampleKeys || [],
  }
}

export function chapterRangeLabel(chapters: AutoCreationNextBatchBriefChapter[]) {
  if (!chapters.length) return ''
  const first = chapters[0].chapterNo
  const last = chapters[chapters.length - 1].chapterNo
  return first === last ? `第${first}章` : `第${first}-${last}章`
}

export function checklistItem(
  key: AutoCreationNextBatchBriefStartChecklistKey,
  label: string,
  detail: string,
  fallback: string,
): AutoCreationNextBatchBriefStartChecklistItem {
  const value = text(detail)
  return {
    key,
    label,
    status: value ? 'ok' : 'warn',
    detail: value || fallback,
  }
}

