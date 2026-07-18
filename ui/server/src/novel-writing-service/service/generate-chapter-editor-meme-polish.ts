import {
  validateMinimalChapterProse,
} from '../../novel-writing/prose-admission-policy'
import type {
  ProseAdmissionWarning,
} from '../../novel-writing/prose-admission-policy'
import {
  selectVerifiedSceneBreakdownUpdate,
} from '../../novel-writing/scene-card-execution-scans'
import {
  countProseChars,
  evaluateProseWordTarget,
} from '../../novel-writing/word-target'
import {
  isRestorableWordTargetText,
  recordWordTargetExpansionPatch,
  wordTargetWarningAsError,
} from './generate-chapter-word-target-helpers'
import {
  formatAdmissionError,
} from '../quality/admission-error'
import {
  proseAdmissionWarning,
} from '../quality/prose-transport-admission'
import {
  isAbortError,
} from './runtime-helpers'

export async function runPostDraftEditorAndMemePolish(args: {
  isDraftOnly: boolean
  activeWorkspace: string
  project: any
  contextPackage: any
  finalText: string
  finalSceneBreakdown: any
  finalContinuityNotes: any
  editorRewrite: any
  memePolish: any
  wordTarget: any
  preferredModelId: any
  llmControlOptions: any
  ensureProseMeetsWordTarget: (...a: any[]) => any
  runCommercialEditorRewrite: (...a: any[]) => any
  runMemePolish: (...a: any[]) => any
  throwIfChapterGenerationAborted: () => void
  onStage: (...a: any[]) => any
}): Promise<{
  finalText: string
  finalSceneBreakdown: any
  finalContinuityNotes: any
  editorRewrite: any
  memePolish: any
  qualityWarningCandidates: ProseAdmissionWarning[]
  wordTargetExpansionPatches: any[]
  wordTargetCompatibility: any
}> {
  let {
    isDraftOnly,
    activeWorkspace,
    project,
    contextPackage,
    finalText,
    finalSceneBreakdown,
    finalContinuityNotes,
    editorRewrite,
    memePolish,
    wordTarget,
    preferredModelId,
    llmControlOptions,
    ensureProseMeetsWordTarget,
    runCommercialEditorRewrite,
    runMemePolish,
    throwIfChapterGenerationAborted,
    onStage,
  } = args

const qualityWarningCandidates: ProseAdmissionWarning[] = []
throwIfChapterGenerationAborted()
await onStage('word_target', { status: 'running', target: wordTarget.target, min: wordTarget.min, max: wordTarget.max, actual: countProseChars(finalText) })
const wordTargetExpansionPatches: any[] = []
let wordTargetCompatibility: any = null
try {
  const wordTargetCheck = await ensureProseMeetsWordTarget(activeWorkspace, project, contextPackage, finalText, preferredModelId, llmControlOptions)
  wordTargetCompatibility = wordTargetCheck.word_target_compatibility_pass ? wordTargetCheck : null
  finalText = wordTargetCheck.final_text || finalText
  if (wordTargetCheck.word_target_warning) qualityWarningCandidates.push(wordTargetCheck.word_target_warning)
  recordWordTargetExpansionPatch(wordTargetExpansionPatches, wordTargetCheck)
  if (wordTargetCheck.expanded && wordTargetCheck.expansion) {
    finalSceneBreakdown = selectVerifiedSceneBreakdownUpdate(finalSceneBreakdown, wordTargetCheck.expansion.scene_breakdown, finalText)
    finalContinuityNotes = wordTargetCheck.expansion.continuity_notes?.length ? wordTargetCheck.expansion.continuity_notes : finalContinuityNotes
  }
  await onStage('word_target', { status: 'success', expanded: wordTargetCheck.expanded, contracted: wordTargetCheck.contracted, soft_pass: wordTargetCheck.word_target_soft_pass, compatibility_pass: wordTargetCheck.word_target_compatibility_pass === true, compatibility_ceiling: wordTargetCheck.compatibility_ceiling, contraction_attempts: wordTargetCheck.contraction?.attempts, word_count: countProseChars(finalText), evaluation: wordTargetCheck.final_evaluation })
} catch (error: any) {
  await onStage('word_target', { status: 'failed', error: String(error?.message || error), word_target: error?.word_target || wordTarget, evaluation: error?.evaluation, final_evaluation: error?.final_evaluation, contraction_attempts: error?.contraction_attempts, expansion_attempts: error?.expansion_attempts })
  throw error
}
if (isDraftOnly) {
  await onStage('editor', { status: 'skipped', reason: '生产模式：只生成并质检初稿' })
  await onStage('meme_polish', { status: 'skipped', reason: '生产模式：只生成并质检初稿' })
}
if (!isDraftOnly) {
  const preEditorText = finalText
  const preEditorSceneBreakdown = finalSceneBreakdown
  const preEditorContinuityNotes = finalContinuityNotes
  const preEditorWordTargetCompatibility = wordTargetCompatibility
  throwIfChapterGenerationAborted()
  await onStage('editor', { status: 'running' })
  try {
  editorRewrite = await runCommercialEditorRewrite(activeWorkspace, project, contextPackage, finalText, preferredModelId, llmControlOptions)
  finalText = editorRewrite.final_text || finalText
  if (editorRewrite.edited && editorRewrite.revision) {
    finalSceneBreakdown = selectVerifiedSceneBreakdownUpdate(finalSceneBreakdown, editorRewrite.revision.scene_breakdown, finalText)
    finalContinuityNotes = editorRewrite.revision.continuity_notes?.length ? editorRewrite.revision.continuity_notes : finalContinuityNotes
  }
  await onStage('editor', {
    status: editorRewrite.edited ? 'success' : 'warn',
    edited: Boolean(editorRewrite.edited),
    word_count: countProseChars(finalText),
    editor_report: editorRewrite.editor_report,
  })
} catch (editorError) {
  if (isAbortError(editorError)) throw editorError
  const editorErrorMessage = formatAdmissionError(editorError, 300)
  editorRewrite = { error: editorErrorMessage, edited: false }
  qualityWarningCandidates.push(proseAdmissionWarning('review', 'editor_unavailable', editorErrorMessage))
  await onStage('editor', { status: 'warn', error: formatAdmissionError(editorError, 200), reason: '商业主编改稿失败，保留当前稿' })
}
try {
  throwIfChapterGenerationAborted()
  const postEditorWordTargetCheck = await ensureProseMeetsWordTarget(activeWorkspace, project, contextPackage, finalText, preferredModelId, llmControlOptions)
  const postEditorWordTargetWarning = wordTargetWarningAsError(wordTarget, postEditorWordTargetCheck)
  if (postEditorWordTargetWarning) {
    if (!validateMinimalChapterProse(postEditorWordTargetCheck.final_text || finalText).valid) throw postEditorWordTargetWarning
    qualityWarningCandidates.push(postEditorWordTargetCheck.word_target_warning)
  }
  wordTargetCompatibility = postEditorWordTargetCheck.word_target_compatibility_pass ? postEditorWordTargetCheck : null
  finalText = postEditorWordTargetCheck.final_text || finalText
  recordWordTargetExpansionPatch(wordTargetExpansionPatches, postEditorWordTargetCheck)
  if (postEditorWordTargetCheck.expanded && postEditorWordTargetCheck.expansion) {
    finalSceneBreakdown = selectVerifiedSceneBreakdownUpdate(finalSceneBreakdown, postEditorWordTargetCheck.expansion.scene_breakdown, finalText)
    finalContinuityNotes = postEditorWordTargetCheck.expansion.continuity_notes?.length ? postEditorWordTargetCheck.expansion.continuity_notes : finalContinuityNotes
    await onStage('word_target', { status: 'success', expanded: postEditorWordTargetCheck.expanded, contracted: postEditorWordTargetCheck.contracted, soft_pass: postEditorWordTargetCheck.word_target_soft_pass, contraction_attempts: postEditorWordTargetCheck.contraction?.attempts, word_count: countProseChars(finalText), evaluation: postEditorWordTargetCheck.final_evaluation, phase: 'post_editor' })
  } else if (postEditorWordTargetCheck.word_target_compatibility_pass) {
    await onStage('word_target', { status: 'success', phase: 'post_editor', compatibility_pass: true, compatibility_ceiling: postEditorWordTargetCheck.compatibility_ceiling, contraction_attempts: postEditorWordTargetCheck.contraction?.attempts, word_count: countProseChars(finalText), evaluation: postEditorWordTargetCheck.final_evaluation })
  }
} catch (error: any) {
  if (error?.word_target_warning) qualityWarningCandidates.push(error.word_target_warning)
  const preEditorEvaluation = evaluateProseWordTarget(preEditorText, wordTarget)
  if ((error?.code === 'PROSE_WORD_TARGET_LONG' || error?.code === 'PROSE_WORD_TARGET_SHORT') && isRestorableWordTargetText(preEditorText, wordTarget, preEditorWordTargetCompatibility)) {
    finalText = preEditorText
    finalSceneBreakdown = preEditorSceneBreakdown
    finalContinuityNotes = preEditorContinuityNotes
    wordTargetCompatibility = preEditorWordTargetCompatibility
    const {
      final_text: _discardedEditorText,
      revision: _discardedEditorRevision,
      ...editorDiagnostics
    } = editorRewrite || {}
    editorRewrite = {
      ...editorDiagnostics,
      edited: false,
      discarded: true,
      discard_reason: 'post_editor_word_target_failed',
      word_target_failure: {
        code: error.code,
        evaluation: error?.evaluation,
        final_evaluation: error?.final_evaluation,
        contraction_attempts: error?.contraction_attempts,
        restored_evaluation: preEditorEvaluation,
      },
    }
    await onStage('word_target', {
      status: 'warn',
      phase: 'post_editor',
      error: String(error?.message || error),
      fallback: 'pre_editor',
      compatibility_pass: preEditorWordTargetCompatibility?.word_target_compatibility_pass === true,
      compatibility_ceiling: preEditorWordTargetCompatibility?.compatibility_ceiling,
      word_target: error?.word_target || wordTarget,
      evaluation: error?.evaluation,
      final_evaluation: error?.final_evaluation,
      restored_evaluation: preEditorEvaluation,
      contraction_attempts: error?.contraction_attempts,
    })
  } else {
    await onStage('word_target', { status: 'failed', error: String(error?.message || error), word_target: error?.word_target || wordTarget, evaluation: error?.evaluation, final_evaluation: error?.final_evaluation, contraction_attempts: error?.contraction_attempts, expansion_attempts: error?.expansion_attempts, phase: 'post_editor' })
    throw error
  }
}
throwIfChapterGenerationAborted()
const preMemeText = finalText
const preMemeSceneBreakdown = finalSceneBreakdown
const preMemeContinuityNotes = finalContinuityNotes
const preMemeWordTargetCompatibility = wordTargetCompatibility
await onStage('meme_polish', { status: 'running' })
try {
  memePolish = await runMemePolish(activeWorkspace, project, contextPackage, finalText, preferredModelId, llmControlOptions)
  finalText = memePolish.final_text || finalText
  if (memePolish.polished && memePolish.revision) {
    finalSceneBreakdown = selectVerifiedSceneBreakdownUpdate(finalSceneBreakdown, memePolish.revision.scene_breakdown, finalText)
    finalContinuityNotes = memePolish.revision.continuity_notes?.length ? memePolish.revision.continuity_notes : finalContinuityNotes
  }
  await onStage('meme_polish', {
    status: memePolish.polished ? 'success' : 'skipped',
    polished: Boolean(memePolish.polished),
    meme_polish_report: memePolish.meme_polish_report,
  })
} catch (memeError) {
  if (isAbortError(memeError)) throw memeError
  const memeErrorMessage = formatAdmissionError(memeError, 300)
  memePolish = { error: memeErrorMessage, polished: false }
  qualityWarningCandidates.push(proseAdmissionWarning('review', 'meme_polish_unavailable', memeErrorMessage))
  await onStage('meme_polish', { status: 'warn', error: formatAdmissionError(memeError, 200), reason: '网感润色失败，保留当前稿' })
}
try {
  throwIfChapterGenerationAborted()
  const postMemeWordTargetCheck = await ensureProseMeetsWordTarget(activeWorkspace, project, contextPackage, finalText, preferredModelId, llmControlOptions)
  const postMemeWordTargetWarning = wordTargetWarningAsError(wordTarget, postMemeWordTargetCheck)
  if (postMemeWordTargetWarning) {
    if (!validateMinimalChapterProse(postMemeWordTargetCheck.final_text || finalText).valid) throw postMemeWordTargetWarning
    qualityWarningCandidates.push(postMemeWordTargetCheck.word_target_warning)
  }
  wordTargetCompatibility = postMemeWordTargetCheck.word_target_compatibility_pass ? postMemeWordTargetCheck : null
  finalText = postMemeWordTargetCheck.final_text || finalText
  recordWordTargetExpansionPatch(wordTargetExpansionPatches, postMemeWordTargetCheck)
  if (postMemeWordTargetCheck.expanded && postMemeWordTargetCheck.expansion) {
    finalSceneBreakdown = selectVerifiedSceneBreakdownUpdate(finalSceneBreakdown, postMemeWordTargetCheck.expansion.scene_breakdown, finalText)
    finalContinuityNotes = postMemeWordTargetCheck.expansion.continuity_notes?.length ? postMemeWordTargetCheck.expansion.continuity_notes : finalContinuityNotes
    await onStage('word_target', { status: 'success', expanded: postMemeWordTargetCheck.expanded, contracted: postMemeWordTargetCheck.contracted, soft_pass: postMemeWordTargetCheck.word_target_soft_pass, contraction_attempts: postMemeWordTargetCheck.contraction?.attempts, word_count: countProseChars(finalText), evaluation: postMemeWordTargetCheck.final_evaluation, phase: 'post_meme_polish' })
  } else if (postMemeWordTargetCheck.word_target_compatibility_pass) {
    await onStage('word_target', { status: 'success', phase: 'post_meme_polish', compatibility_pass: true, compatibility_ceiling: postMemeWordTargetCheck.compatibility_ceiling, contraction_attempts: postMemeWordTargetCheck.contraction?.attempts, word_count: countProseChars(finalText), evaluation: postMemeWordTargetCheck.final_evaluation })
  }
  } catch (error: any) {
    if (error?.word_target_warning) qualityWarningCandidates.push(error.word_target_warning)
    if ((error?.code === 'PROSE_WORD_TARGET_LONG' || error?.code === 'PROSE_WORD_TARGET_SHORT') && isRestorableWordTargetText(preMemeText, wordTarget, preMemeWordTargetCompatibility)) {
      finalText = preMemeText
      finalSceneBreakdown = preMemeSceneBreakdown
      finalContinuityNotes = preMemeContinuityNotes
      wordTargetCompatibility = preMemeWordTargetCompatibility
      const { final_text: _discardedMemeText, revision: _discardedMemeRevision, ...memeDiagnostics } = memePolish || {}
      memePolish = {
        ...memeDiagnostics,
        polished: false,
        discarded: true,
        discard_reason: 'post_meme_word_target_failed',
        word_target_failure: {
          code: error.code,
          evaluation: error?.evaluation,
          final_evaluation: error?.final_evaluation,
          contraction_attempts: error?.contraction_attempts,
          restored_evaluation: evaluateProseWordTarget(preMemeText, wordTarget),
        },
      }
      await onStage('word_target', { status: 'warn', phase: 'post_meme_polish', error: String(error?.message || error), fallback: 'pre_meme', compatibility_pass: preMemeWordTargetCompatibility?.word_target_compatibility_pass === true, compatibility_ceiling: preMemeWordTargetCompatibility?.compatibility_ceiling, contraction_attempts: error?.contraction_attempts })
    } else {
      await onStage('word_target', { status: 'failed', error: String(error?.message || error), word_target: error?.word_target || wordTarget, evaluation: error?.evaluation, final_evaluation: error?.final_evaluation, contraction_attempts: error?.contraction_attempts, expansion_attempts: error?.expansion_attempts, phase: 'post_meme_polish' })
      throw error
    }
  }
}

  return {
    finalText,
    finalSceneBreakdown,
    finalContinuityNotes,
    editorRewrite,
    memePolish,
    qualityWarningCandidates,
    wordTargetExpansionPatches,
    wordTargetCompatibility,
  }
}
