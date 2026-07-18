import { evaluateProseWordTarget } from '../../novel-writing/word-target'

export function recordWordTargetExpansionPatch(wordTargetExpansionPatches: any[], wordTargetCheck: any) {
  const patch = wordTargetCheck?.expansion?.expansion_blueprint_patch
  if (patch) wordTargetExpansionPatches.push(patch)
}

export function isRestorableWordTargetText(text: string, wordTarget: any, compatibility: any) {
  const strictEvaluation = evaluateProseWordTarget(text, wordTarget)
  if (strictEvaluation.passed) return true
  return compatibility?.word_target_compatibility_pass === true
    && wordTarget?.mode === 'standard'
    && Number(compatibility?.compatibility_ceiling || 0) > 0
    && strictEvaluation.actual <= Number(compatibility.compatibility_ceiling)
}

export function wordTargetWarningAsError(wordTarget: any, wordTargetCheck: any) {
  const warning = wordTargetCheck?.word_target_warning
  if (!warning) return null
  return Object.assign(new Error(String(warning.message || '章节正文未达到字数目标')), {
    code: warning.code === 'word_target_short' ? 'PROSE_WORD_TARGET_SHORT' : 'PROSE_WORD_TARGET_LONG',
    word_target: wordTarget,
    evaluation: wordTargetCheck.evaluation,
    final_evaluation: wordTargetCheck.final_evaluation,
    contraction_attempts: wordTargetCheck.contraction?.attempts || [],
    expansion_attempts: wordTargetCheck.expansion?.attempts || [],
    word_target_warning: warning,
  })
}
