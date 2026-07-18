import {
  buildProseWordTargetContractionPrompt,
  buildProseWordTargetExpansionPrompt,
} from '../../novel-writing/prose-prompt-builders'
import {
  applyProseWordTargetSoftCap,
  canBridgeShortContractionToExpansion,
  countProseChars,
  evaluateProseWordTarget,
  isExplicitlyCompleteProseContractionFinishReason,
  isRejectedProseContractionFinishReason,
  normalizeProseContractionFinishReason,
  normalizeProseContractionIncompleteReason,
  proseContractionMaxTokensForAttempt,
  proseMaxTokensForWordTarget,
  resolveStandardWordTargetCompatibility,
  type ChapterWordTarget,
} from '../../novel-writing/word-target'
import {
  extractProseExpansionPayload,
} from '../quality/prose-expansion'
import {
  hasProseTransportIncompleteDetails,
  rejectedProseTransportFinishReason,
} from '../quality/prose-transport-admission'
import {
  isAbortError,
  throwIfAborted,
} from './runtime-helpers'

export function createProseWordTargetMethods(deps: {
  executeAgent: (...args: any[]) => any
  formatAdmissionError: (...args: any[]) => any
  getStageModelId: (...args: any[]) => any
  getStageTemperature: (...args: any[]) => any
  trustedWordTargetContractionBudgets: WeakSet<object>
}) {
  const executeAgent = deps.executeAgent
  const formatAdmissionError = deps.formatAdmissionError
  const getStageModelId = deps.getStageModelId
  const getStageTemperature = deps.getStageTemperature
  const trustedWordTargetContractionBudgets = deps.trustedWordTargetContractionBudgets

const ensureProseMeetsWordTarget = async (activeWorkspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number, options: any = {}) => {
  const wordTarget = contextPackage?.chapter_target?.word_target as ChapterWordTarget | null | undefined
  let evaluation = applyProseWordTargetSoftCap(evaluateProseWordTarget(chapterText, wordTarget))
  const initialEvaluation = evaluation
  const reviseModelId = getStageModelId(project, 'revise', modelId)
  let currentText = String(chapterText || '')
  let currentEvaluation = evaluation
  let contractionResultPayload: any = null
  let bestCompleteText = currentText
  let bestCompleteEvaluation = currentEvaluation
  let bestCompleteContractionPayload: any = null
  let bestCompleteExpansionPayload: any = null
  const sanitizeWordTargetUsage = (value: any) => {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : null
    if (!source) return null
    const usage = Object.fromEntries(
      ['input_tokens', 'prompt_tokens', 'output_tokens', 'completion_tokens', 'total_tokens', 'cached_tokens']
        .filter(key => typeof source[key] === 'number' && Number.isFinite(source[key]) && source[key] >= 0)
        .map(key => [key, Math.floor(source[key])]),
    )
    return Object.keys(usage).length ? usage : null
  }
  const sanitizeWordTargetModelName = (value: any) => {
    const modelName = String(value || '').trim()
    return /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/.test(modelName) ? modelName : ''
  }
  const wordTargetDistance = (candidateEvaluation: any) => candidateEvaluation.too_long
    ? Math.max(0, Number(candidateEvaluation.actual || 0) - Number(candidateEvaluation.max || 0))
    : candidateEvaluation.too_short
      ? Math.max(0, Number(candidateEvaluation.min || 0) - Number(candidateEvaluation.actual || 0))
      : 0
  const rememberBestCompleteCandidate = (candidateText: string, candidateEvaluation: any, payload?: any) => {
    const candidateCount = countProseChars(candidateText)
    if (!candidateText || candidateCount <= 0) return
    const bestDistance = wordTargetDistance(bestCompleteEvaluation)
    const candidateDistance = wordTargetDistance(candidateEvaluation)
    if (candidateDistance < bestDistance || (candidateDistance === bestDistance && candidateCount > countProseChars(bestCompleteText))) {
      bestCompleteText = candidateText
      bestCompleteEvaluation = candidateEvaluation
      bestCompleteContractionPayload = payload || bestCompleteContractionPayload
    }
  }
  const buildWordTargetWarning = (finalEvaluation: any) => {
    const code = finalEvaluation.too_long ? 'word_target_long' : 'word_target_short'
    const message = finalEvaluation.too_long
      ? `word_target_long：完整章节仍超过字数上限（当前 ${finalEvaluation.actual} 字，最多 ${finalEvaluation.max} 字）`
      : `word_target_short：完整章节仍低于字数下限（当前 ${finalEvaluation.actual} 字，至少 ${finalEvaluation.min} 字）`
    return {
      code,
      source: 'word_target',
      message,
      details: {
        evaluation: initialEvaluation,
        final_evaluation: finalEvaluation,
      },
    }
  }
  if (evaluation.soft_cap) {
    return {
      final_text: chapterText,
      contracted: false,
      expanded: false,
      word_target_soft_pass: true,
      evaluation,
      final_evaluation: evaluation,
      expansion: null,
    }
  }
  if (evaluation.too_long && options.contract !== false) {
    const requestedMaxContractionAttempts = Number(options.maxContractionAttempts ?? options.max_contraction_attempts ?? 3)
    const configuredMaxContractionAttempts = Number.isFinite(requestedMaxContractionAttempts)
      ? Math.max(1, Math.min(3, Math.trunc(requestedMaxContractionAttempts)))
      : 3
    const proposedSharedBudget = options.wordTargetContractionBudget || options.word_target_contraction_budget
    const sharedBudget = proposedSharedBudget && typeof proposedSharedBudget === 'object' && trustedWordTargetContractionBudgets.has(proposedSharedBudget)
      ? proposedSharedBudget
      : null
    const rawUsed = Number(sharedBudget?.used ?? 0)
    const used = Number.isFinite(rawUsed) ? Math.max(0, Math.min(3, Math.trunc(rawUsed))) : 0
    if (sharedBudget) sharedBudget.used = used
    const maxContractionAttempts = sharedBudget
      ? Math.max(0, Math.min(configuredMaxContractionAttempts, configuredMaxContractionAttempts - used))
      : configuredMaxContractionAttempts
    const contractionAttempts: any[] = []
    for (let attempt = 1; attempt <= maxContractionAttempts; attempt += 1) {
      throwIfAborted(options)
      const globalAttempt = sharedBudget
        ? Math.min(configuredMaxContractionAttempts, Number(sharedBudget.used || 0) + 1)
        : attempt
      if (sharedBudget) sharedBudget.used = globalAttempt
      let contractionResult: any
      try {
        contractionResult = await executeAgent('prose-agent', project, {
          task: buildProseWordTargetContractionPrompt(project, contextPackage, currentText, currentEvaluation, { attempt: globalAttempt, maxAttempts: configuredMaxContractionAttempts }),
          upstreamContext: contextPackage,
        }, {
          activeWorkspace,
          modelId: reviseModelId ? String(reviseModelId) : undefined,
          maxTokens: proseContractionMaxTokensForAttempt(wordTarget, globalAttempt),
          temperature: Math.min(0.55, getStageTemperature(project, 'revise', 0.55)),
          skipMemory: true,
          signal: options.abortSignal,
          timeoutMs: options.llmTimeoutMs,
        })
      } catch (error) {
        if (isAbortError(error)) throw error
        contractionAttempts.push({
          attempt: globalAttempt,
          previous_count: countProseChars(currentText),
          returned_text: false,
          candidate_rejected: true,
          rejection_reason: 'optional_repair_unavailable',
          error: formatAdmissionError(error, 200),
        })
        break
      }
      const extracted = extractProseExpansionPayload(contractionResult)
      const contractedText = extracted.text
      const finishReason = normalizeProseContractionFinishReason(contractionResult)
      const rejectedFinishReason = rejectedProseTransportFinishReason(contractionResult)
      const incompleteReason = normalizeProseContractionIncompleteReason(contractionResult)
      const recoveredFromPartialJson = extracted.payload?.recovered_from_partial_json === true
      const partialJsonOpenStringRecovered = extracted.payload?.partial_json_open_string_recovered === true
      const rejectionReasons = [
        !contractedText ? 'missing_chapter_text' : '',
        recoveredFromPartialJson ? 'recovered_from_partial_json' : '',
        partialJsonOpenStringRecovered ? 'partial_json_open_string_recovered' : '',
        !isExplicitlyCompleteProseContractionFinishReason(finishReason) ? `finish_reason_${finishReason || 'missing'}` : '',
        isRejectedProseContractionFinishReason(finishReason) ? `finish_reason_${finishReason}` : '',
        rejectedFinishReason ? `transport_finish_reason_${rejectedFinishReason}` : '',
        incompleteReason ? `incomplete_reason_${incompleteReason}` : '',
        hasProseTransportIncompleteDetails(contractionResult) ? 'incomplete_details_present' : '',
      ].filter(Boolean)
      const candidateRejected = rejectionReasons.length > 0
      const finalEvaluation = applyProseWordTargetSoftCap(evaluateProseWordTarget(contractedText, wordTarget))
      const previousCount = countProseChars(currentText)
      const contractedCount = countProseChars(contractedText)
      const bridgeToExpansion = !candidateRejected
        && options.expand !== false
        && isExplicitlyCompleteProseContractionFinishReason(finishReason)
        && canBridgeShortContractionToExpansion(currentEvaluation, finalEvaluation)

      contractionAttempts.push({
        attempt: globalAttempt,
        previous_count: previousCount,
        contracted_count: contractedCount,
        evaluation: finalEvaluation,
        finish_reason: finishReason,
        model_usage: sanitizeWordTargetUsage((contractionResult as any).usage)
          || sanitizeWordTargetUsage((contractionResult as any).raw?.usage),
        incomplete_reason: incompleteReason,
        returned_text: Boolean(contractedText),
        candidate_rejected: candidateRejected,
        bridge_to_expansion: bridgeToExpansion,
        rejection_reason: rejectionReasons.join(',') || null,
        recovered_from_partial_json: recoveredFromPartialJson,
        partial_json_open_string_recovered: partialJsonOpenStringRecovered,
      })

      if (candidateRejected) continue

      const candidateModelName = sanitizeWordTargetModelName((contractionResult as any).modelName)
      const candidatePayload = {
        scene_breakdown: extracted.scene_breakdown,
        continuity_notes: extracted.continuity_notes,
        contraction_report: extracted.payload?.contraction_report || extracted.payload?.contractionReport || null,
        attempts: contractionAttempts,
        ...(candidateModelName ? { modelName: candidateModelName } : {}),
      }
      if (isExplicitlyCompleteProseContractionFinishReason(finishReason)) {
        rememberBestCompleteCandidate(contractedText, finalEvaluation, candidatePayload)
      }

      if (bridgeToExpansion) {
        currentText = contractedText
        currentEvaluation = finalEvaluation
        contractionResultPayload = candidatePayload
        break
      }

      if (contractedText && contractedCount > 0 && contractedCount < previousCount && !finalEvaluation.too_short) {
        currentText = contractedText
        currentEvaluation = finalEvaluation
        contractionResultPayload = candidatePayload
      }

      if (contractedText && contractedCount > 0 && contractedCount < previousCount && finalEvaluation.passed) {
        return {
          final_text: contractedText,
          contracted: true,
          expanded: false,
          evaluation,
          final_evaluation: finalEvaluation,
          contraction: contractionResultPayload,
          expansion: null,
        }
      }

      if (contractedText && contractedCount > 0 && finalEvaluation.too_short) continue
    }

    if (currentEvaluation.too_long) {
      const compatibility = resolveStandardWordTargetCompatibility(evaluation, wordTarget)
      if (compatibility.passed) {
        return {
          final_text: chapterText,
          contracted: false,
          expanded: false,
          word_target_compatibility_pass: true,
          compatibility_ceiling: compatibility.ceiling,
          compatibility_reason: compatibility.reason,
          evaluation,
          final_evaluation: evaluation,
          contraction: { attempts: contractionAttempts },
          expansion: null,
        }
      }
      return {
        final_text: bestCompleteText,
        contracted: bestCompleteText !== String(chapterText || ''),
        expanded: false,
        evaluation: initialEvaluation,
        final_evaluation: bestCompleteEvaluation,
        contraction: bestCompleteContractionPayload || { attempts: contractionAttempts },
        expansion: null,
        word_target_warning: buildWordTargetWarning(bestCompleteEvaluation),
      }
    }

    chapterText = currentText
    evaluation = currentEvaluation
  }
  if (evaluation.too_long) {
    return {
      final_text: chapterText,
      contracted: false,
      expanded: false,
      evaluation: initialEvaluation,
      final_evaluation: evaluation,
      contraction: null,
      expansion: null,
      word_target_warning: buildWordTargetWarning(evaluation),
    }
  }
  if (evaluation.passed || options.expand === false) {
    const result: any = {
      final_text: chapterText,
      expanded: false,
      evaluation,
      final_evaluation: evaluation,
      expansion: null,
    }
    if (!evaluation.passed) result.word_target_warning = buildWordTargetWarning(evaluation)
    return result
  }

  const maxExpansionAttempts = Math.max(1, Math.min(5, Number(options.maxExpansionAttempts || options.max_expansion_attempts || 3)))
  const attempts: any[] = []

  for (let attempt = 1; attempt <= maxExpansionAttempts; attempt += 1) {
    throwIfAborted(options)
    let expansionResult: any
    try {
      expansionResult = await executeAgent('prose-agent', project, {
        task: buildProseWordTargetExpansionPrompt(project, contextPackage, currentText, currentEvaluation, { attempt, maxAttempts: maxExpansionAttempts }),
        upstreamContext: contextPackage,
      }, {
        activeWorkspace,
        modelId: reviseModelId ? String(reviseModelId) : undefined,
        maxTokens: proseMaxTokensForWordTarget(wordTarget),
        temperature: getStageTemperature(project, 'revise', 0.65),
        skipMemory: true,
        signal: options.abortSignal,
        timeoutMs: options.llmTimeoutMs,
      })
    } catch (error) {
      if (isAbortError(error)) throw error
      attempts.push({
        attempt,
        previous_count: countProseChars(currentText),
        returned_text: false,
        candidate_rejected: true,
        rejection_reason: 'optional_repair_unavailable',
        error: formatAdmissionError(error, 200),
      })
      break
    }
    const extracted = extractProseExpansionPayload(expansionResult)
    const expandedText = extracted.text
    const finalEvaluation = applyProseWordTargetSoftCap(evaluateProseWordTarget(expandedText, wordTarget))
    const previousCount = countProseChars(currentText)
    const expandedCount = countProseChars(expandedText)
    const finishReason = normalizeProseContractionFinishReason(expansionResult)
    const rejectedFinishReason = rejectedProseTransportFinishReason(expansionResult)
    const incompleteReason = normalizeProseContractionIncompleteReason(expansionResult)
    const recoveredFromPartialJson = extracted.payload?.recovered_from_partial_json === true
    const partialJsonOpenStringRecovered = extracted.payload?.partial_json_open_string_recovered === true
    const rejectionReasons = [
      !expandedText ? 'missing_chapter_text' : '',
      recoveredFromPartialJson ? 'recovered_from_partial_json' : '',
      partialJsonOpenStringRecovered ? 'partial_json_open_string_recovered' : '',
      !isExplicitlyCompleteProseContractionFinishReason(finishReason) ? `finish_reason_${finishReason || 'missing'}` : '',
      rejectedFinishReason ? `transport_finish_reason_${rejectedFinishReason}` : '',
      incompleteReason ? `incomplete_reason_${incompleteReason}` : '',
      hasProseTransportIncompleteDetails(expansionResult) ? 'incomplete_details_present' : '',
    ].filter(Boolean)
    const candidateRejected = rejectionReasons.length > 0

    attempts.push({
      attempt,
      previous_count: previousCount,
      expanded_count: expandedCount,
      evaluation: finalEvaluation,
      model_usage: sanitizeWordTargetUsage((expansionResult as any).usage)
        || sanitizeWordTargetUsage((expansionResult as any).raw?.usage),
      returned_text: Boolean(expandedText),
      finish_reason: finishReason,
      candidate_rejected: candidateRejected,
      rejection_reason: rejectionReasons.join(',') || null,
    })

    if (!candidateRejected && expandedText && expandedCount > previousCount) {
      currentText = expandedText
      currentEvaluation = finalEvaluation
      if (expandedCount > countProseChars(bestCompleteText)) {
        const candidateModelName = sanitizeWordTargetModelName((expansionResult as any).modelName)
        bestCompleteText = expandedText
        bestCompleteEvaluation = finalEvaluation
        bestCompleteExpansionPayload = {
          scene_breakdown: extracted.scene_breakdown,
          continuity_notes: extracted.continuity_notes,
          expansion_blueprint_patch: extracted.expansion_blueprint_patch,
          ...(candidateModelName ? { modelName: candidateModelName } : {}),
        }
      }
    }

    if (!candidateRejected && expandedText && expandedCount > previousCount && finalEvaluation.passed) {
      const candidateModelName = sanitizeWordTargetModelName((expansionResult as any).modelName)
      return {
        final_text: expandedText,
        contracted: Boolean(contractionResultPayload),
        expanded: true,
        evaluation,
        final_evaluation: finalEvaluation,
        contraction: contractionResultPayload,
        expansion: {
          scene_breakdown: extracted.scene_breakdown,
          continuity_notes: extracted.continuity_notes,
          expansion_blueprint_patch: extracted.expansion_blueprint_patch,
          attempts,
          ...(candidateModelName ? { modelName: candidateModelName } : {}),
        },
      }
    }
  }

  return {
    final_text: bestCompleteText,
    contracted: Boolean(contractionResultPayload),
    expanded: bestCompleteText !== String(chapterText || ''),
    evaluation: initialEvaluation,
    final_evaluation: bestCompleteEvaluation,
    contraction: contractionResultPayload,
    expansion: {
      ...(bestCompleteExpansionPayload || {}),
      attempts,
    },
    word_target_warning: buildWordTargetWarning(bestCompleteEvaluation),
  }
}

  return {
    ensureProseMeetsWordTarget,
  }
}
