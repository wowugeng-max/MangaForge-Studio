import { selectFingerprintSafeProse } from '../../novel-writing/human-webnovel-resistance'
import { selectHumanizeSafeProse } from '../../novel-writing/humanize-dual-pass'
import {
  selectContinuitySafeProseCandidate,
} from '../../novel-writing/prose-candidate-continuity'
import {
  buildCommercialEditorRewritePrompt,
  buildReadabilityReviewPrompt,
} from '../../novel-writing/prose-prompt-builders'
import {
  countProseChars,
  proseMaxTokensForWordTarget,
} from '../../novel-writing/word-target'
import {
  assertCompleteProseTransportResult,
} from '../quality/prose-transport-admission'
import {
  asArray,
  getNovelPayload,
} from '../../routes/novel-route-utils'
import {
  buildMemePolishPrompt,
  buildMemeStrategy,
} from '../quality/style-sample-strategy'
import {
  throwIfAborted,
} from './runtime-helpers'

export function createProsePolishMethods(deps: {
  executeAgent: (...args: any[]) => any
  getStageModelId: (...args: any[]) => any
  getStageTemperature: (...args: any[]) => any
}) {
  const executeAgent = deps.executeAgent
  const getStageModelId = deps.getStageModelId
  const getStageTemperature = deps.getStageTemperature

const runCommercialEditorRewrite = async (activeWorkspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number, options: any = {}) => {
  const editorModelId = getStageModelId(project, 'editor', modelId)
  throwIfAborted(options)
  const editorResult = await executeAgent('prose-agent', project, {
    task: buildCommercialEditorRewritePrompt(project, contextPackage, chapterText, options),
    upstreamContext: contextPackage,
  }, {
    activeWorkspace,
    modelId: editorModelId ? String(editorModelId) : undefined,
    maxTokens: proseMaxTokensForWordTarget(contextPackage?.chapter_target?.word_target),
    temperature: getStageTemperature(project, 'editor', 0.5),
    skipMemory: true,
    signal: options.abortSignal,
    timeoutMs: options.llmTimeoutMs,
  })
  assertCompleteProseTransportResult(editorResult, 'PROSE_REVISION_TRUNCATED')
  const payload = getNovelPayload(editorResult)
  const rewrittenChapters = Array.isArray(payload?.prose_chapters)
    ? payload.prose_chapters
    : Array.isArray(payload?.proseChapters)
      ? payload.proseChapters
      : []
  const rewrittenFirst = rewrittenChapters[0] || payload
  const rewrittenText = String(rewrittenFirst?.chapter_text || rewrittenFirst?.chapterText || payload?.chapter_text || payload?.chapterText || '')
  const editorReport = payload?.editor_report || payload?.editorReport || {}
  const originalCount = countProseChars(chapterText)
  const rewrittenCount = countProseChars(rewrittenText)
  if (!rewrittenText) {
    return {
      final_text: chapterText,
      edited: false,
      editor_report: { error: (editorResult as any).error || '商业主编改稿未返回正文' },
      revision: null,
    }
  }
  if (originalCount > 0 && rewrittenCount < Math.floor(originalCount * 0.85)) {
    return {
      final_text: chapterText,
      edited: false,
      editor_report: {
        ...editorReport,
        error: `商业主编改稿返回正文过短：${rewrittenCount}/${originalCount}`,
      },
      revision: null,
    }
  }
  const humanizeSelection = selectHumanizeSafeProse(chapterText, rewrittenText, { pass: 'AB', stage: 'editor_rewrite' })
  const fingerprintSelection = selectFingerprintSafeProse(chapterText, humanizeSelection.text, { stage: 'editor_rewrite' })
  const continuitySelection = selectContinuitySafeProseCandidate(chapterText, fingerprintSelection.text, contextPackage, { candidate_stage: 'editor' })
  return {
    final_text: continuitySelection.text,
    // Edited must reflect the finally selected text: gate rejections fall back to the original.
    edited: continuitySelection.accepted && continuitySelection.text !== chapterText,
    editor_report: {
      ...editorReport,
      ...(continuitySelection.warning ? { continuity_warning: continuitySelection.warning } : {}),
      modelName: (editorResult as any).modelName,
      original_word_count: originalCount,
      edited_word_count: rewrittenCount,
    },
    revision: {
      scene_breakdown: rewrittenFirst?.scene_breakdown || rewrittenFirst?.sceneBreakdown || payload?.scene_breakdown || payload?.sceneBreakdown || [],
      continuity_notes: rewrittenFirst?.continuity_notes || rewrittenFirst?.continuityNotes || payload?.continuity_notes || payload?.continuityNotes || [],
      modelName: (editorResult as any).modelName,
    },
  }
}

const runMemePolish = async (activeWorkspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number, options: any = {}) => {
  const memeStrategy = contextPackage?.chapter_target?.meme_strategy || buildMemeStrategy(project, contextPackage)
  if (String(memeStrategy?.intensity || '无') === '无' && !asArray(memeStrategy?.meme_bank).length) {
    return { final_text: chapterText, polished: false, meme_polish_report: { skipped: true, reason: '未配置网感策略或素材池' }, revision: null }
  }
  const polishModelId = getStageModelId(project, 'revise', modelId)
  throwIfAborted(options)
  const polishResult = await executeAgent('prose-agent', project, {
    task: buildMemePolishPrompt(project, contextPackage, chapterText),
    upstreamContext: contextPackage,
  }, {
    activeWorkspace,
    modelId: polishModelId ? String(polishModelId) : undefined,
    maxTokens: proseMaxTokensForWordTarget(contextPackage?.chapter_target?.word_target),
    temperature: getStageTemperature(project, 'revise', 0.45),
    skipMemory: true,
    signal: options.abortSignal,
    timeoutMs: options.llmTimeoutMs,
  })
  assertCompleteProseTransportResult(polishResult, 'PROSE_REVISION_TRUNCATED')
  const payload = getNovelPayload(polishResult)
  const polishedChapters = Array.isArray(payload?.prose_chapters)
    ? payload.prose_chapters
    : Array.isArray(payload?.proseChapters)
      ? payload.proseChapters
      : []
  const polishedFirst = polishedChapters[0] || payload
  const polishedText = String(polishedFirst?.chapter_text || polishedFirst?.chapterText || payload?.chapter_text || payload?.chapterText || '')
  const memePolishReport = payload?.meme_polish_report || payload?.memePolishReport || {}
  const memePolishChangedPlot = payload?.meme_polish_report?.changed_plot === true || payload?.memePolishReport?.changedPlot === true
  const originalCount = countProseChars(chapterText)
  const polishedCount = countProseChars(polishedText)
  if (!polishedText || memePolishChangedPlot) {
    return {
      final_text: chapterText,
      polished: false,
      meme_polish_report: {
        ...memePolishReport,
        error: !polishedText ? '网感润色未返回正文' : '网感润色疑似改动剧情，已拒绝',
        modelName: (polishResult as any).modelName,
      },
      revision: null,
    }
  }
  if (originalCount > 0 && polishedCount < Math.floor(originalCount * 0.9)) {
    return {
      final_text: chapterText,
      polished: false,
      meme_polish_report: {
        ...memePolishReport,
        error: `网感润色返回正文过短：${polishedCount}/${originalCount}`,
        modelName: (polishResult as any).modelName,
      },
      revision: null,
    }
  }
  const humanizeSelection = selectHumanizeSafeProse(chapterText, polishedText, { pass: 'B', stage: 'meme_polish' })
  const fingerprintSelection = selectFingerprintSafeProse(chapterText, humanizeSelection.text, { stage: 'meme_polish' })
  const continuitySelection = selectContinuitySafeProseCandidate(chapterText, fingerprintSelection.text, contextPackage, { candidate_stage: 'meme_polish' })
  return {
    final_text: continuitySelection.text,
    // Polished must reflect the finally selected text: gate rejections fall back to the original.
    polished: continuitySelection.accepted && continuitySelection.text !== chapterText,
    meme_polish_report: {
      ...memePolishReport,
      ...(continuitySelection.warning ? { continuity_warning: continuitySelection.warning } : {}),
      modelName: (polishResult as any).modelName,
      original_word_count: originalCount,
      polished_word_count: polishedCount,
    },
    revision: {
      scene_breakdown: polishedFirst?.scene_breakdown || polishedFirst?.sceneBreakdown || payload?.scene_breakdown || payload?.sceneBreakdown || [],
      continuity_notes: polishedFirst?.continuity_notes || polishedFirst?.continuityNotes || payload?.continuity_notes || payload?.continuityNotes || [],
      modelName: (polishResult as any).modelName,
    },
  }
}

const runReadabilityReview = async (activeWorkspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number, options: any = {}) => {
  const reviewModelId = getStageModelId(project, 'review', modelId)
  throwIfAborted(options)
  const reviewResult = await executeAgent('review-agent', project, {
    task: buildReadabilityReviewPrompt(project, contextPackage, chapterText),
  }, {
    activeWorkspace,
    modelId: reviewModelId ? String(reviewModelId) : undefined,
    maxTokens: 2500,
    temperature: getStageTemperature(project, 'review', 0.2),
    skipMemory: true,
    signal: options.abortSignal,
    timeoutMs: options.llmTimeoutMs,
  })
  const payload = getNovelPayload(reviewResult)
  return {
    readability_score: Number(payload?.readability_score ?? payload?.score ?? 0) || 0,
    passed: payload?.passed !== false,
    opening_hook_score: Number(payload?.opening_hook_score ?? 0) || 0,
    ending_hook_score: Number(payload?.ending_hook_score ?? 0) || 0,
    scene_readability_score: Number(payload?.scene_readability_score ?? 0) || 0,
    paragraph_density_score: Number(payload?.paragraph_density_score ?? 0) || 0,
    dialogue_voice_score: Number(payload?.dialogue_voice_score ?? 0) || 0,
    payoff_density_score: Number(payload?.payoff_density_score ?? 0) || 0,
    meme_sense: payload?.meme_sense || {},
    ai_smell: payload?.ai_smell || payload?.aiSmell || {},
    issues: Array.isArray(payload?.issues) ? payload.issues.map(normalizeIssue) : [],
    suggestions: asArray(payload?.suggestions).map((item: any) => String(item || '').trim()).filter(Boolean),
    modelName: (reviewResult as any).modelName,
  }
}

  return {
    runCommercialEditorRewrite,
    runMemePolish,
    runReadabilityReview,
  }
}
