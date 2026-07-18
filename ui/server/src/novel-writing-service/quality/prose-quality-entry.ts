import type { ProseGenerationContract } from '../../novel-writing/prose-generation-contract'
import { scanCanonicalContinuityConflicts } from '../../novel-writing/canonical-continuity'
import { scanBannedWordLeaks } from '../../novel-writing/deslop-scans'
import { buildDeterministicProseCleanupReport } from '../../novel-writing/deterministic-prose-cleanup'
import { scanEstablishedEventConflicts } from '../../novel-writing/established-event-canon'
import { scanParagraphCommaChainDensityRisks, scanParagraphWallTextRisks, scanProseDecorativeDetailRisks, scanProseStackedDescriptionRisks, scanProseStaticEnvironmentRisks } from '../../novel-writing/prose-craft-scans'
import { scanProseFormatRisks, scanProseLanguageRisks } from '../../novel-writing/prose-format'
import { buildProseGenerationContract, evaluateProsePreDraftGate, mergeProseGenerationRequestOverrides, normalizeProseContractKey } from '../../novel-writing/prose-generation-contract'
import { scanModelDegenerationRisks, scanProseMetaLeaks } from '../../novel-writing/prose-meta'
import { applyProseWordTargetSoftCap, evaluateProseWordTarget, resolveStandardWordTargetCompatibility } from '../../novel-writing/word-target'
import { buildOhStoryDirectorForPreDraft } from '../../routes/novel-oh-story-director'
import { asArray, compactText } from '../../routes/novel-route-utils'

export function attachOhStoryDirectorToContextPackage(contextPackage: any) {
  const director = buildOhStoryDirectorForPreDraft(contextPackage)
  return {
    ...contextPackage,
    oh_story_director: director,
    ohStoryDirector: director,
  }
}

export function prepareProseGenerationContract(baseContext: any, options: any = {}) {
  const contextPackage = attachOhStoryDirectorToContextPackage(
    mergeProseGenerationRequestOverrides(baseContext, options),
  )
  const contract = buildProseGenerationContract(contextPackage)
  const runAfterGate = async <T>(
    callback: (generationContract: ProseGenerationContract) => Promise<T>,
    requireSceneCards = true,
  ) => {
    const gateDecision = evaluateProsePreDraftGate(contract, {
      requireSceneCards,
      allowIncomplete: options.allow_incomplete === true || options.allowIncomplete === true,
    })
    if (!gateDecision.passed) {
      throw Object.assign(
        new Error(gateDecision.reasons.join('；') || '章节生成写前门禁未通过'),
        {
          code: gateDecision.code,
          gateDecision,
          contextPackage,
          generationContract: contract,
        },
      )
    }
    return callback(contract)
  }
  return { contextPackage, contract, runAfterGate }
}

export function scanProseForQualityLoop(text: string, contextPackage: any, wordTarget: any, options: any = {}) {
  const cleanup = buildDeterministicProseCleanupReport(contextPackage?.chapter_target || {}, text)
  const word = applyProseWordTargetSoftCap(evaluateProseWordTarget(text, wordTarget))
  const fixedCompatibility = resolveStandardWordTargetCompatibility(word, wordTarget)
  const suppliedCompatibilityCeiling = Number(options?.compatibility_ceiling || 0)
  const compatibilityCeiling = Math.min(
    Number.isFinite(suppliedCompatibilityCeiling) ? suppliedCompatibilityCeiling : 0,
    fixedCompatibility.ceiling,
  )
  const compatibilityPass = options?.word_target_compatibility_pass === true
    && fixedCompatibility.passed
    && compatibilityCeiling > 0
    && word.actual <= compatibilityCeiling
  const bannedWordChecks = scanBannedWordLeaks(text)
  const canonicalContinuityConflicts = scanCanonicalContinuityConflicts(
    text,
    contextPackage?.canonical_surface_index || contextPackage?.canonicalSurfaceIndex || { stable_entities: [] },
  )
  const establishedEventConflicts = scanEstablishedEventConflicts({
    chapterText: text,
    events: contextPackage?.chapter_target?.established_events_contract?.events
      || contextPackage?.chapterTarget?.established_events_contract?.events
      || contextPackage?.established_events_contract?.events
      || contextPackage?.story_state?.established_events
      || contextPackage?.storyState?.established_events
      || [],
  }).map((item: any) => ({
    key: item.key,
    message: item.message,
    evidence: item.evidence,
    status: 'warn',
    severity: 'high',
  }))
  const cleanupHardTypes = new Set(['model_degeneration', 'prose_meta', 'prose_format'])
  const cleanupHardFailures = asArray(cleanup?.categories)
    .filter((category: any) => Number(category?.count || 0) > 0)
    .filter((category: any) => category?.has_blocking === true || cleanupHardTypes.has(String(category?.type || '')))
    .map((category: any) => ({
      key: `deterministic_${category.type}`,
      message: `${category.label}：${asArray(category.evidence).join('；')}`,
      status: 'fail',
      severity: 'blocking',
    }))
  const craftAdvisoryChecks = [
    ...scanParagraphWallTextRisks(text),
    ...scanParagraphCommaChainDensityRisks(text),
    ...scanProseStaticEnvironmentRisks(text),
    ...scanProseDecorativeDetailRisks(text),
    ...scanProseStackedDescriptionRisks(text),
  ].slice(0, 5)
  const hardFailures = [
    ...scanProseLanguageRisks(text),
    ...scanProseMetaLeaks(text),
    ...scanModelDegenerationRisks(text),
    ...scanProseFormatRisks(text),
    ...bannedWordChecks,
    ...canonicalContinuityConflicts,
    ...cleanupHardFailures,
    ...(!word.passed && !compatibilityPass ? [{
      key: 'word_target',
      message: `正文 ${word.actual} 字，不在 ${word.min}-${word.max} 字范围`,
      status: 'fail',
    }] : []),
  ]
    .filter((item: any) => item?.status === 'fail'
      || item?.severity === 'critical'
      || item?.severity === 'high'
      || item?.severity === 'blocking'
      || item?.blocking === true
      || item?.key === 'word_target')
    .map((item: any) => ({
      key: String(item?.key || item?.pattern || item?.gate || 'deterministic_prose'),
      message: String(item?.key === 'canonical_proper_noun_conflict'
        ? item?.message
        : item?.evidence || item?.message || item?.fix || item?.label || item?.key || '确定性正文检查未通过'),
    }))
  const uniqueFailures = Array.from(new Map(
    hardFailures.map(item => [`${item.key}:${item.message}`, item]),
  ).values())
  const advisoryFindings = [
    ...craftAdvisoryChecks,
    ...establishedEventConflicts,
    ...bannedWordChecks.filter((item: any) => item?.status === 'warn'),
  ]
    .map((item: any) => ({
      key: String(item?.key || item?.pattern || 'deterministic_advisory'),
      pattern: String(item?.pattern || item?.key || 'deterministic_advisory'),
      matched_text: String(item?.matched_text || ''),
      status: 'warn' as const,
      evidence: compactText(item?.evidence || '', 500),
      fix: compactText(item?.fix || '', 500),
    }))
  const uniqueAdvisoryFindings = Array.from(new Map(
    advisoryFindings.map(item => [`${item.pattern}:${item.matched_text}:${item.evidence}:${item.fix}`, item]),
  ).values()).slice(0, 8)
  return {
    hard_failures: uniqueFailures,
    advisory_findings: uniqueAdvisoryFindings,
    cleanup,
    word_target: word,
  }
}

export function buildFocusedQualityCoreContract(contract: ProseGenerationContract) {
  const target = contract?.context?.chapter_target || {}
  const selectedKeys = asArray(contract?.director?.selected_contracts)
    .map((item: any) => normalizeProseContractKey(item?.key || item))
    .filter(Boolean)
    .slice(0, 4)
  const selectedContracts = Object.fromEntries(selectedKeys.map((key: string) => [
    key,
    target?.[`${key}_contract`] ?? contract?.context?.[`${key}_contract`] ?? null,
  ]))
  return {
    version: 'focused_prose_quality_core_v1',
    chapter_no: contract.chapter.chapter_no,
    title: contract.chapter.title,
    goal: contract.chapter.goal,
    summary: contract.chapter.summary,
    conflict: contract.chapter.conflict,
    ending_hook: contract.chapter.ending_hook,
    previous_handoff: contract.chapter.previous_handoff,
    scene_cards: contract.chapter.scene_cards,
    reader_promise: target?.core_contract_radar?.reader_promise
      || target?.longform_compass?.reader_promise
      || contract?.context?.longform_compass?.reader_promise
      || target?.story_power_contract?.core_promise
      || '',
    no_drift: target?.longform_compass?.no_drift || contract?.context?.longform_compass?.no_drift || [],
    selected_contracts: selectedContracts,
  }
}

export function buildLegacyCompatibleSelfCheck(qualityLoop: any) {
  const acceptedRounds = asArray(qualityLoop?.rounds).filter((item: any) => item?.selection?.accepted)
  const acceptedRound = acceptedRounds[acceptedRounds.length - 1]
  return {
    final_text: qualityLoop.final_text,
    revised: acceptedRounds.length > 0,
    revision: acceptedRound?.revision || null,
    review: {
      score: qualityLoop.final_review.score,
      passed: qualityLoop.decision.passed,
      needs_revision: !qualityLoop.decision.passed,
      revised: acceptedRounds.length > 0,
      issues: qualityLoop.decision.hard_failures.map((item: any) => ({
        severity: 'critical',
        category: 'prose',
        issue: item.message,
        evidence: [item.message],
        fix: '按六维 finding 和确定性复检结果修订正文',
      })),
      prose_quality_v2: {
        review: qualityLoop.final_review,
        deterministic_scan: qualityLoop.final_scan,
        decision: qualityLoop.decision,
      },
    },
  }
}

