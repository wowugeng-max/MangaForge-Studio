import {
  enrichContextWithStrongHandoff,
} from '../../novel-writing/chapter-handoff-basics'
import {
  enrichContextWithProgressResync,
} from '../../novel-writing/chapter-progress-ledger'
import { revisionTextHash } from '../../novel/revision-hash'
import { ensureOpeningHandoffBridge, extractPrimaryEndingHooks } from '../../novel-writing/chapter-continuity-guard'
import type { ProseAdmissionHardFailure } from '../../novel-writing/prose-admission-policy'
import { assessInitialProseOpeningContinuity } from '../../novel-writing/prose-candidate-continuity'
import {
  applyR76PreStoreSanitize,
  buildR76HumanizeDefaultOptions,
  R76_ZHUQUE_STACK_VERSION,
} from '../../novel-writing/r76-zhuque-stack'
import { formatAdmissionError } from '../quality/admission-error'

function buildHandoffContext(contextPackage: any) {
  return enrichContextWithProgressResync(enrichContextWithStrongHandoff(contextPackage))
}

export function attachPreQualityHumanizeProvenance(
  report: any,
  humanizeInputText: string,
  humanizeOutputText: string,
) {
  if (!report || typeof report !== 'object') return report
  const humanizeOutputHash = revisionTextHash(humanizeOutputText)
  return {
    ...report,
    candidate_provenance: {
      scope: 'pre_quality',
      stage: 'pre_quality',
      humanize_input_hash: revisionTextHash(humanizeInputText),
      humanize_output_hash: humanizeOutputHash,
      final_candidate_hash: humanizeOutputHash,
      superseded_by_quality_revision: false,
    },
  }
}

export function reconcileHumanizeFinalCandidateProvenance(report: any, finalCandidateText: string) {
  if (!report || typeof report !== 'object' || !report.candidate_provenance) return report
  const finalCandidateHash = revisionTextHash(finalCandidateText)
  const humanizeOutputHash = String(report.candidate_provenance.humanize_output_hash || '')
  return {
    ...report,
    candidate_provenance: {
      ...report.candidate_provenance,
      final_candidate_hash: finalCandidateHash,
      superseded_by_quality_revision: finalCandidateHash !== humanizeOutputHash,
    },
  }
}

export function collectFinalOpeningContinuityFailures(
  finalText: string,
  contextPackage: any,
): ProseAdmissionHardFailure[] {
  const assessment = assessInitialProseOpeningContinuity(finalText, buildHandoffContext(contextPackage))
  return assessment.failure ? [assessment.failure] : []
}

export async function runPostDraftHumanizeAndOpeningHandoff(args: {
  activeWorkspace: string
  project: any
  contextPackage: any
  characters: any[]
  finalText: string
  preferredModelId: any
  llmControlOptions: any
  options: any
  isZhuqueFast: boolean
  runHumanizePostProcess: (...args: any[]) => any
  onStage: (...args: any[]) => any
}): Promise<{ finalText: string; humanizePostprocess: any }> {
  const {
    activeWorkspace,
    project,
    contextPackage,
    characters,
    preferredModelId,
    llmControlOptions,
    options,
    isZhuqueFast,
    runHumanizePostProcess,
    onStage,
  } = args
  let finalText = args.finalText

  await onStage('humanize_postprocess', {
    status: 'running',
    version: 'humanize_postprocess_v3',
    r76_zhuque_stack: R76_ZHUQUE_STACK_VERSION,
  })
  let humanizePostprocess: any = null
  try {
    const humanizeResult = await runHumanizePostProcess(
      activeWorkspace,
      project,
      contextPackage,
      finalText,
      preferredModelId,
      buildR76HumanizeDefaultOptions({
        ...llmControlOptions,
        skip_humanize_postprocess: options.skip_humanize_postprocess ?? options.skipHumanizePostprocess,
        skipHumanizePostprocess: options.skip_humanize_postprocess ?? options.skipHumanizePostprocess,
        enable_humanize_postprocess: options.enable_humanize_postprocess ?? options.enableHumanizePostprocess,
        enableHumanizePostprocess: options.enable_humanize_postprocess ?? options.enableHumanizePostprocess,
      }),
    )
    finalText = String(humanizeResult?.final_text || finalText)
    humanizePostprocess = humanizeResult?.report || null
    if (humanizePostprocess && typeof humanizePostprocess === 'object') {
      humanizePostprocess = {
        ...humanizePostprocess,
        r76_zhuque_stack: humanizePostprocess.r76_zhuque_stack || R76_ZHUQUE_STACK_VERSION,
      }
    }
    await onStage('humanize_postprocess', {
      status: humanizePostprocess?.skipped ? 'skipped' : (humanizePostprocess?.accepted ? 'success' : 'warn'),
      report: humanizePostprocess,
      chars: (finalText || '').length,
      r76_zhuque_stack: R76_ZHUQUE_STACK_VERSION,
    })
  } catch (error: any) {
    humanizePostprocess = {
      version: 'humanize_postprocess_v3',
      enabled: true,
      accepted: false,
      skipped: false,
      reason: 'humanize_postprocess_failed',
      error: formatAdmissionError(error, 240),
      r76_zhuque_stack: R76_ZHUQUE_STACK_VERSION,
    }
    await onStage('humanize_postprocess', {
      status: 'failed',
      report: humanizePostprocess,
      r76_zhuque_stack: R76_ZHUQUE_STACK_VERSION,
    })
  }

  const sanitizeProse = (text: string) => applyR76PreStoreSanitize(text, {
    project,
    contextPackage,
    characters,
    skip_mid_monologue_densify: options.skip_mid_monologue_densify === true || options.skipMidMonologueDensify === true || isZhuqueFast,
    skipMidMonologueDensify: options.skip_mid_monologue_densify === true || options.skipMidMonologueDensify === true || isZhuqueFast,
  })
  finalText = sanitizeProse(finalText)

  const handoffContext = buildHandoffContext(contextPackage)
  const previousChapter = (
    handoffContext?.continuity?.previous_chapter
    || handoffContext?.continuity?.previousChapter
    || contextPackage?.continuity?.previous_chapter
    || contextPackage?.continuity?.previousChapter
    || contextPackage?.previous_chapter
    || contextPackage?.previousChapter
    || null
  )
  const bridge = ensureOpeningHandoffBridge(finalText, previousChapter)
  if (bridge.bridged) {
    finalText = sanitizeProse(bridge.text)
    await onStage('opening_handoff_bridge', {
      status: 'success',
      reason: bridge.reason,
      bridge: bridge.bridge || '',
      primary_hooks: extractPrimaryEndingHooks(previousChapter).map((item: any) => item.key),
    })
  }

  return { finalText, humanizePostprocess }
}
