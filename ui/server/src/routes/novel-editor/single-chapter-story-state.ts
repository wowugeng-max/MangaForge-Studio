import {
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelWorldbuilding,
} from '../../novel'
import { executeNovelAgent } from '../../llm'
import { prepareStoryStateUpdate } from '../../novel-writing-service/service/story-state-machine-prepare'
import { revisionTextHash } from '../../novel/revision-hash'
import type { EditorRoutesContext } from './builders'

export type SingleChapterStoryStateReceipt = {
  source_run_id: number | null
  candidate_hash: string
  chapter_id: number
}

type SingleChapterStoryStateInput = {
  workspace: string
  projectId: number
  chapterId: number
  modelId?: number
  receipt: SingleChapterStoryStateReceipt
  signal?: AbortSignal
  timeoutMs?: number
  maxRetries?: number
}

function throwIfCanceled(signal?: AbortSignal) {
  if (signal?.aborted) throw Object.assign(new Error('Request canceled'), { code: 'REQUEST_CANCELED' })
}

function invalidReceipt(message: string) {
  return Object.assign(new Error(message), { code: 'INVALID_STORY_STATE_RECEIPT' })
}

function storyStateError(code: string, message: string) {
  return Object.assign(new Error(message), { code })
}

function validateReceipt(input: SingleChapterStoryStateInput) {
  if (!Number.isInteger(input.receipt.chapter_id) || input.receipt.chapter_id <= 0 || input.receipt.chapter_id !== input.chapterId) {
    throw invalidReceipt('receipt chapter does not match target chapter')
  }
  const candidateHash = input.receipt.candidate_hash
  if (typeof candidateHash !== 'string' || !candidateHash || candidateHash !== candidateHash.trim()) {
    throw invalidReceipt('receipt candidate hash must be a non-empty canonical string')
  }
  const sourceRunId = input.receipt.source_run_id
  if (sourceRunId !== null && (!Number.isInteger(sourceRunId) || sourceRunId <= 0)) {
    throw invalidReceipt('receipt source run id must be null or a positive integer')
  }
}

export function storyStateReceiptKey(receipt: SingleChapterStoryStateReceipt) {
  return `${receipt.source_run_id ?? 'manual'}:${receipt.chapter_id}:${receipt.candidate_hash}`
}

function receiptFromProject(project: any, receipt: SingleChapterStoryStateReceipt) {
  return project?.reference_config?.story_state_sync_receipts?.[storyStateReceiptKey(receipt)] || null
}

function bindPreparedToReceipt(prepared: any, receipt: SingleChapterStoryStateReceipt) {
  return {
    ...prepared,
    receipt_binding: {
      key: storyStateReceiptKey(receipt),
      chapter_id: receipt.chapter_id,
      candidate_hash: receipt.candidate_hash,
      source_run_id: receipt.source_run_id,
    },
  }
}

async function loadExactChapterContext(ctx: EditorRoutesContext, input: SingleChapterStoryStateInput, project: any) {
  const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
    listNovelChapters(input.workspace, input.projectId),
    listNovelWorldbuilding(input.workspace, input.projectId),
    listNovelCharacters(input.workspace, input.projectId),
    listNovelOutlines(input.workspace, input.projectId),
    listNovelReviews(input.workspace, input.projectId),
  ])
  const chapter = chapters.find(item => Number(item.id) === Number(input.chapterId))
  if (!chapter || Number(chapter.project_id) !== Number(input.projectId)) throw new Error('chapter not found')
  const contextPackage = await ctx.buildChapterContextPackage(
    input.workspace,
    project,
    chapter,
    chapters,
    worldbuilding,
    characters,
    outlines,
    reviews,
  )
  return { project, chapter, contextPackage }
}

function assertCurrentCandidate(chapter: any, receipt: SingleChapterStoryStateReceipt) {
  if (revisionTextHash(String(chapter?.chapter_text || '')) !== receipt.candidate_hash) {
    throw storyStateError('STORY_STATE_CANDIDATE_STALE', 'chapter text no longer matches Story State receipt')
  }
}

export async function prepareSingleChapterStoryState(
  ctx: EditorRoutesContext,
  input: SingleChapterStoryStateInput,
): Promise<{ reused: boolean; prepared: any | null; completedReceipt?: any }> {
  validateReceipt(input)
  throwIfCanceled(input.signal)
  const project = await ctx.getProject(input.workspace, input.projectId)
  if (!project) throw new Error('project not found')
  const existingReceipt = receiptFromProject(project, input.receipt)
  if (existingReceipt?.status === 'completed') {
    return { reused: true, prepared: null, completedReceipt: existingReceipt }
  }
  if (existingReceipt?.status === 'state_applied' && existingReceipt.prepared_for_recovery) {
    return { reused: true, prepared: bindPreparedToReceipt(existingReceipt.prepared_for_recovery, input.receipt) }
  }
  const loaded = await loadExactChapterContext(ctx, input, project)
  assertCurrentCandidate(loaded.chapter, input.receipt)
  throwIfCanceled(input.signal)
  const prepared = await prepareStoryStateUpdate(
    input.workspace,
    loaded.project,
    loaded.chapter,
    loaded.contextPackage,
    String(loaded.chapter.chapter_text || ''),
    input.modelId,
    {
      signal: input.signal,
      timeoutMs: input.timeoutMs ?? 180_000,
      maxRetries: input.maxRetries ?? 1,
      retryOnBlockedTransport: false,
      allowDeterministicFallback: false,
    },
    {
      executeAgent: ctx.executeAgent || executeNovelAgent,
      getStageModelId: ctx.getStageModelId,
      getStageTemperature: ctx.getStageTemperature,
    },
  )
  return {
    reused: false,
    prepared: bindPreparedToReceipt(prepared, input.receipt),
  }
}

export async function applySingleChapterStoryState(
  ctx: EditorRoutesContext,
  input: SingleChapterStoryStateInput & { prepared: any | null },
): Promise<{ reused: boolean; update: any; receipt: any }> {
  validateReceipt(input)
  throwIfCanceled(input.signal)
  const project = await ctx.getProject(input.workspace, input.projectId)
  if (!project) throw new Error('project not found')
  const existingReceipt = receiptFromProject(project, input.receipt)
  if (existingReceipt?.status === 'completed') {
    return { reused: true, update: existingReceipt.payload ?? null, receipt: existingReceipt }
  }
  const prepared = input.prepared
    || (existingReceipt?.prepared_for_recovery
      ? bindPreparedToReceipt(existingReceipt.prepared_for_recovery, input.receipt)
      : null)
  if (!prepared) {
    throw storyStateError('STORY_STATE_PREPARED_REQUIRED', 'prepared Story State is required before apply')
  }
  if (prepared?.receipt_binding?.key !== storyStateReceiptKey(input.receipt)) {
    throw storyStateError('STORY_STATE_PREPARED_RECEIPT_MISMATCH', 'prepared Story State belongs to another receipt')
  }
  const loaded = await loadExactChapterContext(ctx, input, project)
  assertCurrentCandidate(loaded.chapter, input.receipt)
  throwIfCanceled(input.signal)
  const update = await ctx.updateStoryStateMachine(
    input.workspace,
    loaded.project,
    loaded.chapter,
    loaded.contextPackage,
    String(loaded.chapter.chapter_text || ''),
    input.modelId,
    {
      prepared,
      exactChapter: true,
      idempotencyReceipt: { ...input.receipt, key: storyStateReceiptKey(input.receipt) },
      signal: input.signal,
      retryOnBlockedTransport: false,
      allowDeterministicFallback: false,
    },
  )
  const freshProject = await ctx.getProject(input.workspace, input.projectId)
  const completedReceipt = receiptFromProject(freshProject, input.receipt) || input.receipt
  return {
    reused: update?.story_state_receipt_reused === true,
    update,
    receipt: completedReceipt,
  }
}
