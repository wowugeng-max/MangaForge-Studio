import {
  buildProseWordTargetContractionPrompt,
  buildProseWordTargetExpansionPrompt,
} from '../../novel-writing/prose-prompt-builders'
import {
  applyProseWordTargetSoftCap,
  canBridgeShortContractionToExpansion,
  countProseChars,
  evaluateProseWordTarget,
  isRejectedProseContractionFinishReason,
  isUsableProseWordTargetFinishReason,
  normalizeProseContractionFinishReason,
  normalizeProseContractionIncompleteReason,
  proseContractionMaxTokensForAttempt,
  proseMaxTokensForWordTarget,
  resolveStandardWordTargetCompatibility,
  shouldForceProseWordTargetExpand,
  shouldSkipWordTargetRepairForSoftCap,
  surgicalContractProseToWordTarget,
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
import { selectFingerprintSafeProse } from '../../novel-writing/human-webnovel-resistance'

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
  const hardEvaluation = evaluateProseWordTarget(chapterText, wordTarget)
  let evaluation = applyProseWordTargetSoftCap(hardEvaluation)
  const initialEvaluation = evaluation
  const measureDialogueParaRatio = (text: string) => {
    const lines = String(text || '').split(/\n/).map((line) => line.trim()).filter(Boolean)
    const bodyLines = lines.filter((line) => !/^第\d+章/.test(line))
    if (!bodyLines.length) return 0
    const dialogueParas = bodyLines.filter((line) => /^[“"「]/.test(line)).length
    return dialogueParas / bodyLines.length
  }
  // Commercial fingerprint floor: short independent dialogue turns are required texture, not optional polish.
  const DIALOGUE_EXPAND_MIN_RATIO = 0.12
  const dialogueRatio = measureDialogueParaRatio(chapterText)
  const dialogueDeficit = dialogueRatio + 1e-9 < DIALOGUE_EXPAND_MIN_RATIO
  const needsHardExpand = shouldForceProseWordTargetExpand(hardEvaluation, {
    expand: options.expand,
    dialogue_para_ratio: dialogueRatio,
    dialogue_min_ratio: DIALOGUE_EXPAND_MIN_RATIO,
  })
  const reviseModelId = getStageModelId(project, 'revise', modelId)
  let currentText = String(chapterText || '')
  // Expansion decisions use hard range + dialogue texture; soft floor never zeros deficit.
  let currentEvaluation = needsHardExpand
    ? {
        ...hardEvaluation,
        deficit: hardEvaluation.too_short
          ? hardEvaluation.deficit
          : Math.max(hardEvaluation.deficit, Math.ceil(Number(hardEvaluation.target || 4200) * 0.08)),
        too_short: true,
        passed: false,
        soft_cap: false,
        soft_floor: false,
        dialogue_para_ratio: Number(dialogueRatio.toFixed(3)),
        dialogue_expand_required: dialogueDeficit,
      }
    : evaluation
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
  // Soft ceiling only: tiny over-max drift may skip contraction.
  // Soft floor must NOT short-circuit expand — R30 false-passed 3759/3780 and dialogue 0.07.
  if (shouldSkipWordTargetRepairForSoftCap(hardEvaluation, evaluation, {
    expand: options.expand,
    dialogue_para_ratio: dialogueRatio,
    dialogue_min_ratio: DIALOGUE_EXPAND_MIN_RATIO,
  })) {
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
  // Soft floor alone: still force expand toward hard min / dialogue texture floor.
  if (evaluation.soft_floor && needsHardExpand && options.expand === false) {
    return {
      final_text: chapterText,
      contracted: false,
      expanded: false,
      word_target_soft_pass: true,
      evaluation,
      final_evaluation: evaluation,
      expansion: null,
      dialogue_expand_skipped: dialogueDeficit,
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

    // System reliability: when draft overshoots hard (common with scene_chunk_stitch),
    // run local surgical contraction BEFORE LLM rewrite. LLM contraction on 1.5x+ drafts
    // often hangs/streams forever and also flattens human fingerprint.
    const maxChars = Number(wordTarget?.max || currentEvaluation?.max || 0)
    const actualChars = Number(currentEvaluation?.actual || countProseChars(currentText))
    const massiveOvershoot = maxChars > 0 && (
      actualChars > maxChars * 1.35
      || actualChars - maxChars >= 1200
    )
    if (massiveOvershoot) {
      const localFirst = surgicalContractProseToWordTarget(currentText, wordTarget)
      if (localFirst.removed > 0 && localFirst.to < actualChars) {
        const localGate = selectFingerprintSafeProse(String(chapterText || ''), localFirst.text, { stage: 'word_target_contract_local_first' })
        if (localGate.accepted) {
          const localEval = applyProseWordTargetSoftCap(evaluateProseWordTarget(localGate.text, wordTarget))
          contractionAttempts.push({
            attempt: 'local_surgical_first',
            previous_count: actualChars,
            contracted_count: localFirst.to,
            evaluation: localEval,
            returned_text: true,
            candidate_rejected: false,
            rejection_reason: null,
            local_removed: localFirst.removed,
            massive_overshoot: true,
          })
          currentText = localGate.text
          currentEvaluation = localEval
          bestCompleteText = localGate.text
          bestCompleteEvaluation = localEval
          if (!localEval.too_long || localEval.passed) {
            return {
              final_text: localGate.text,
              contracted: true,
              expanded: false,
              evaluation,
              final_evaluation: localEval,
              contraction: {
                attempts: contractionAttempts,
                local_surgical_first: localFirst,
                fingerprint_continuity: localGate.assessment,
              },
              expansion: null,
            }
          }
        } else {
          contractionAttempts.push({
            attempt: 'local_surgical_first',
            previous_count: actualChars,
            contracted_count: localFirst.to,
            returned_text: true,
            candidate_rejected: true,
            rejection_reason: `fingerprint_continuity:${localGate.reason || 'failed'}`,
            massive_overshoot: true,
          })
        }
      }
    }

    // If local-first already fixed overshoot, skip LLM contraction entirely.
    if (!currentEvaluation.too_long) {
      return {
        final_text: currentText,
        contracted: contractionAttempts.length > 0,
        expanded: false,
        evaluation,
        final_evaluation: currentEvaluation,
        contraction: contractionAttempts.length ? { attempts: contractionAttempts } : null,
        expansion: null,
      }
    }

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
      let contractedText = extracted.text
      const finishReason = normalizeProseContractionFinishReason(contractionResult)
      const rejectedFinishReason = rejectedProseTransportFinishReason(contractionResult)
      const incompleteReason = normalizeProseContractionIncompleteReason(contractionResult)
      const recoveredFromPartialJson = extracted.payload?.recovered_from_partial_json === true
      const partialJsonOpenStringRecovered = extracted.payload?.partial_json_open_string_recovered === true
      const rejectionReasons = [
        !contractedText ? 'missing_chapter_text' : '',
        recoveredFromPartialJson ? 'recovered_from_partial_json' : '',
        partialJsonOpenStringRecovered ? 'partial_json_open_string_recovered' : '',
        !isUsableProseWordTargetFinishReason(finishReason) ? `finish_reason_${finishReason || 'missing'}` : '',
        isRejectedProseContractionFinishReason(finishReason) ? `finish_reason_${finishReason}` : '',
        rejectedFinishReason ? `transport_finish_reason_${rejectedFinishReason}` : '',
        incompleteReason ? `incomplete_reason_${incompleteReason}` : '',
        hasProseTransportIncompleteDetails(contractionResult) ? 'incomplete_details_present' : '',
      ].filter(Boolean)
      const candidateRejected = rejectionReasons.length > 0
      const finalEvaluation = applyProseWordTargetSoftCap(evaluateProseWordTarget(contractedText, wordTarget))
      const previousCount = countProseChars(currentText)
      const contractedCount = countProseChars(contractedText)
      const finishUsable = isUsableProseWordTargetFinishReason(finishReason)
      const bridgeToExpansion = !candidateRejected
        && options.expand !== false
        && finishUsable
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

      const fingerprintGate = selectFingerprintSafeProse(currentText, contractedText, { stage: 'word_target_contract' })
      if (!fingerprintGate.accepted) {
        contractionAttempts[contractionAttempts.length - 1] = {
          ...contractionAttempts[contractionAttempts.length - 1],
          candidate_rejected: true,
          rejection_reason: `fingerprint_continuity:${fingerprintGate.reason || 'failed'}`,
        }
        continue
      }
      contractedText = fingerprintGate.text

      const candidateModelName = sanitizeWordTargetModelName((contractionResult as any).modelName)
      const candidatePayload = {
        scene_breakdown: extracted.scene_breakdown,
        continuity_notes: extracted.continuity_notes,
        contraction_report: extracted.payload?.contraction_report || extracted.payload?.contractionReport || null,
        attempts: contractionAttempts,
        fingerprint_continuity: fingerprintGate.assessment,
        ...(candidateModelName ? { modelName: candidateModelName } : {}),
      }
      if (finishUsable) {
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
      // LLM contraction often fails on long drafts (partial JSON). Fall back to local paragraph drop.
      const local = surgicalContractProseToWordTarget(currentText, wordTarget)
      if (local.removed > 0 && local.to < countProseChars(currentText)) {
        const localGate = selectFingerprintSafeProse(String(chapterText || ''), local.text, { stage: 'word_target_contract_local' })
        if (localGate.accepted) {
          const localEval = applyProseWordTargetSoftCap(evaluateProseWordTarget(localGate.text, wordTarget))
          contractionAttempts.push({
            attempt: 'local_surgical',
            previous_count: countProseChars(currentText),
            contracted_count: local.to,
            evaluation: localEval,
            returned_text: true,
            candidate_rejected: false,
            rejection_reason: null,
            local_removed: local.removed,
          })
          if (!localEval.too_long || localEval.passed) {
            return {
              final_text: localGate.text,
              contracted: true,
              expanded: false,
              evaluation,
              final_evaluation: localEval,
              contraction: {
                attempts: contractionAttempts,
                local_surgical: local,
                fingerprint_continuity: localGate.assessment,
              },
              expansion: null,
            }
          }
          currentText = localGate.text
          currentEvaluation = localEval
          bestCompleteText = localGate.text
          bestCompleteEvaluation = localEval
        } else {
          contractionAttempts.push({
            attempt: 'local_surgical',
            previous_count: countProseChars(currentText),
            contracted_count: local.to,
            returned_text: true,
            candidate_rejected: true,
            rejection_reason: `fingerprint_continuity:${localGate.reason || 'failed'}`,
          })
        }
      }
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
  // Use hard short / dialogue deficit, not soft-floor passed flag.
  // System reliability: vignette drafts (<< hard min) must still expand even when caller set expand=false
  // (common on zhuque_fast validation). Otherwise humanize/store freezes a 200-word stub.
  const criticallyShort = Number(evaluation.actual || 0) > 0
    && Number(evaluation.min || 0) > 0
    && Number(evaluation.actual) < Number(evaluation.min) * 0.3
  if ((!needsHardExpand && evaluation.passed) || (options.expand === false && !criticallyShort)) {
    const result: any = {
      final_text: chapterText,
      expanded: false,
      evaluation: initialEvaluation,
      final_evaluation: evaluation,
      expansion: null,
    }
    if (evaluation.soft_floor) result.word_target_soft_pass = true
    if (!evaluation.passed && !evaluation.soft_floor) result.word_target_warning = buildWordTargetWarning(evaluation)
    if (dialogueDeficit && options.expand === false) result.dialogue_expand_skipped = true
    if (criticallyShort) result.critical_short_expand_required = true
    return result
  }
  if (criticallyShort && options.expand === false) {
    // fall through into expansion loop with a single recovery attempt budget
    options = { ...options, expand: true, maxExpansionAttempts: Math.min(2, Number(options.maxExpansionAttempts || options.max_expansion_attempts || 2) || 2) }
  }

  const maxExpansionAttempts = Math.max(1, Math.min(5, Number(options.maxExpansionAttempts || options.max_expansion_attempts || 3)))
  const attempts: any[] = []

  for (let attempt = 1; attempt <= maxExpansionAttempts; attempt += 1) {
    throwIfAborted(options)
    let expansionResult: any
    try {
      expansionResult = await executeAgent('prose-agent', project, {
        task: buildProseWordTargetExpansionPrompt(project, contextPackage, currentText, currentEvaluation, {
          attempt,
          maxAttempts: maxExpansionAttempts,
          force_dialogue_expand: dialogueDeficit || Number((currentEvaluation as any)?.dialogue_para_ratio || 1) < DIALOGUE_EXPAND_MIN_RATIO,
          dialogue_para_ratio: measureDialogueParaRatio(currentText),
          dialogue_min_ratio: DIALOGUE_EXPAND_MIN_RATIO,
        }),
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
    let expandedText = extracted.text
    const finalEvaluation = applyProseWordTargetSoftCap(evaluateProseWordTarget(expandedText, wordTarget))
    const previousCount = countProseChars(currentText)
    const expandedCount = countProseChars(expandedText)
    const finishReason = normalizeProseContractionFinishReason(expansionResult)
    const rejectedFinishReason = rejectedProseTransportFinishReason(expansionResult)
    const incompleteReason = normalizeProseContractionIncompleteReason(expansionResult)
    const recoveredFromPartialJson = extracted.payload?.recovered_from_partial_json === true
    const partialJsonOpenStringRecovered = extracted.payload?.partial_json_open_string_recovered === true
    // Critically short recovery: partial-JSON salvage with real growth is better than keeping a vignette.
    const criticallyShortNow = previousCount > 0
      && Number(hardEvaluation?.min || evaluation?.min || 0) > 0
      && previousCount < Number(hardEvaluation?.min || evaluation?.min || 0) * 0.3
    const allowPartialJsonRecovery = criticallyShortNow
      && expandedCount >= Math.max(previousCount + 200, Math.floor(previousCount * 1.5))
      && Boolean(expandedText)
    const rejectionReasons = [
      !expandedText ? 'missing_chapter_text' : '',
      recoveredFromPartialJson && !allowPartialJsonRecovery ? 'recovered_from_partial_json' : '',
      partialJsonOpenStringRecovered && !allowPartialJsonRecovery ? 'partial_json_open_string_recovered' : '',
      !isUsableProseWordTargetFinishReason(finishReason) ? `finish_reason_${finishReason || 'missing'}` : '',
      isRejectedProseContractionFinishReason(finishReason) ? `finish_reason_${finishReason}` : '',
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
      const fingerprintGate = selectFingerprintSafeProse(currentText, expandedText, { stage: 'word_target_expand' })
      if (!fingerprintGate.accepted) {
        attempts[attempts.length - 1] = {
          ...attempts[attempts.length - 1],
          candidate_rejected: true,
          rejection_reason: `fingerprint_continuity:${fingerprintGate.reason || 'failed'}`,
        }
      } else {
      currentText = fingerprintGate.text
      currentEvaluation = finalEvaluation
      // Candidate selection: in-hard-range first (distance to range), only then prefer longer.
      const bestDistance = wordTargetDistance(bestCompleteEvaluation)
      const candidateDistance = wordTargetDistance(finalEvaluation)
      if (candidateDistance < bestDistance || (candidateDistance === bestDistance && expandedCount > countProseChars(bestCompleteText))) {
        const candidateModelName = sanitizeWordTargetModelName((expansionResult as any).modelName)
        bestCompleteText = fingerprintGate.text
        bestCompleteEvaluation = finalEvaluation
        bestCompleteExpansionPayload = {
          scene_breakdown: extracted.scene_breakdown,
          continuity_notes: extracted.continuity_notes,
          expansion_blueprint_patch: extracted.expansion_blueprint_patch,
          ...(candidateModelName ? { modelName: candidateModelName } : {}),
          fingerprint_continuity: fingerprintGate.assessment,
        }
      }
      }
    }

    if (!candidateRejected && expandedText && expandedCount > previousCount && finalEvaluation.passed) {
      const fingerprintGate = selectFingerprintSafeProse(String(chapterText || ''), expandedText, { stage: 'word_target_expand' })
      if (!fingerprintGate.accepted) {
        // keep searching / fall back to bestComplete
      } else {
      const expandedDialogueRatio = measureDialogueParaRatio(fingerprintGate.text)
      const hardAfter = evaluateProseWordTarget(fingerprintGate.text, wordTarget)
      const dialogueStillShort = expandedDialogueRatio + 1e-9 < DIALOGUE_EXPAND_MIN_RATIO
      // When expand was triggered for dialogue texture, do not stop until ratio recovers (or attempts end).
      if (dialogueDeficit && dialogueStillShort && expandedDialogueRatio <= dialogueRatio + 0.005) {
        attempts[attempts.length - 1] = {
          ...attempts[attempts.length - 1],
          dialogue_para_ratio: Number(expandedDialogueRatio.toFixed(3)),
          dialogue_still_short: true,
        }
        // keep candidate as best if longer / closer, but continue attempts
      } else if (hardAfter.too_short && !applyProseWordTargetSoftCap(hardAfter).soft_floor) {
        // still hard-short outside soft floor: continue
      } else {
      const candidateModelName = sanitizeWordTargetModelName((expansionResult as any).modelName)
      return {
        final_text: fingerprintGate.text,
        contracted: Boolean(contractionResultPayload),
        expanded: true,
        evaluation: initialEvaluation,
        final_evaluation: {
          ...finalEvaluation,
          dialogue_para_ratio: Number(expandedDialogueRatio.toFixed(3)),
        },
        contraction: contractionResultPayload,
        expansion: {
          scene_breakdown: extracted.scene_breakdown,
          continuity_notes: extracted.continuity_notes,
          expansion_blueprint_patch: extracted.expansion_blueprint_patch,
          attempts,
          dialogue_para_ratio: Number(expandedDialogueRatio.toFixed(3)),
          ...(candidateModelName ? { modelName: candidateModelName } : {}),
          fingerprint_continuity: fingerprintGate.assessment,
        },
      }
      }
      }
    }

    // Hard too_long brake: once current text reaches/exceeds the hard ceiling, stop expanding.
    const currentHardEvaluation = evaluateProseWordTarget(currentText, wordTarget)
    if (Number(currentHardEvaluation.max || 0) > 0 && Number(currentHardEvaluation.actual || 0) >= Number(currentHardEvaluation.max)) break
  }

  // Final expansion/contraction candidate also must keep fingerprint vs original draft.
  const finalGate = selectFingerprintSafeProse(String(chapterText || ''), bestCompleteText, { stage: 'word_target_final' })
  if (!finalGate.accepted) {
    bestCompleteText = String(chapterText || '')
    bestCompleteEvaluation = initialEvaluation
  } else {
    bestCompleteText = finalGate.text
  }

  // Report the real evaluation of the returned text: dialogue-only triggers must not surface a
  // synthesized too_short/word_target_short warning on a chapter that is inside the hard range.
  const bestDialogueRatio = measureDialogueParaRatio(bestCompleteText)
  const bestFinalEvaluation = {
    ...applyProseWordTargetSoftCap(evaluateProseWordTarget(bestCompleteText, wordTarget)),
    dialogue_para_ratio: Number(bestDialogueRatio.toFixed(3)),
    dialogue_expand_required: bestDialogueRatio + 1e-9 < DIALOGUE_EXPAND_MIN_RATIO,
  }
  return {
    final_text: bestCompleteText,
    contracted: Boolean(contractionResultPayload),
    expanded: bestCompleteText !== String(chapterText || ''),
    evaluation: initialEvaluation,
    final_evaluation: bestFinalEvaluation,
    contraction: contractionResultPayload,
    expansion: {
      ...(bestCompleteExpansionPayload || {}),
      attempts,
    },
    ...(bestFinalEvaluation.passed ? {} : { word_target_warning: buildWordTargetWarning(bestFinalEvaluation) }),
  }
}

  return {
    ensureProseMeetsWordTarget,
  }
}
