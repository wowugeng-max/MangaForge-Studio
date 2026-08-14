import {
  enrichContextWithStrongHandoff,
} from '../../novel-writing/chapter-handoff-basics'
import {
  enrichContextWithProgressResync,
} from '../../novel-writing/chapter-progress-ledger'
import {
  normalizeHumanizePostprocessForStorage,
  type PersistedHumanizeCandidateProvenance,
  type PersistedHumanizePostprocessReport,
} from '../../novel-writing/chapter-prose-storage-patch'
import { revisionTextHash } from '../../novel/revision-hash'
import { ensureOpeningHandoffBridge, extractPrimaryEndingHooks } from '../../novel-writing/chapter-continuity-guard'
import type { ProseAdmissionHardFailure } from '../../novel-writing/prose-admission-policy'
import { assessInitialProseOpeningContinuity } from '../../novel-writing/prose-candidate-continuity'
import {
  applyR76PreStoreSanitize,
  buildR76HumanizeDefaultOptions,
  R76_ZHUQUE_STACK_VERSION,
} from '../../novel-writing/r76-zhuque-stack'
import { resolveWritingSkillStageLabel } from '../../novel-writing/writing-skills'
import { formatAdmissionError } from '../quality/admission-error'
import { WRITING_SKILL_HUMANIZE_VERSION } from './writing-skill-humanize-methods'

function buildHandoffContext(contextPackage: any) {
  return enrichContextWithProgressResync(enrichContextWithStrongHandoff(contextPackage))
}

export function attachPostQualityHumanizeProvenance(
  report: PersistedHumanizePostprocessReport | null | undefined,
  humanizeInputText: string,
  humanizeOutputText: string,
): PersistedHumanizePostprocessReport | null | undefined {
  if (!report || typeof report !== 'object') return report
  const humanizeOutputHash = revisionTextHash(humanizeOutputText)
  const candidateProvenance: Extract<PersistedHumanizeCandidateProvenance, { scope: 'post_quality' }> = {
    scope: 'post_quality',
    stage: 'post_quality',
    humanize_input_hash: revisionTextHash(humanizeInputText),
    humanize_output_hash: humanizeOutputHash,
    final_candidate_hash: humanizeOutputHash,
    superseded_by_quality_revision: false,
  }
  return {
    ...report,
    candidate_provenance: candidateProvenance,
  }
}

export function reconcileHumanizeFinalCandidateProvenance(
  report: PersistedHumanizePostprocessReport | null | undefined,
  finalCandidateText: string,
): PersistedHumanizePostprocessReport | null | undefined {
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
  runWritingSkillHumanizePass?: (...args: any[]) => any
  onStage: (...args: any[]) => any
}): Promise<{
  finalText: string
  humanizePostprocess: PersistedHumanizePostprocessReport | null
  writingSkillHumanize?: Record<string, any> | null
}> {
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
    runWritingSkillHumanizePass,
    onStage,
  } = args
  let finalText = args.finalText

  await onStage('humanize_postprocess', {
    status: 'running',
    version: 'humanize_postprocess_v3',
    r76_zhuque_stack: R76_ZHUQUE_STACK_VERSION,
  })
  let humanizePostprocess: PersistedHumanizePostprocessReport | null = null
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
        full_pass_a: options.full_pass_a ?? options.fullPassA,
        fullPassA: options.full_pass_a ?? options.fullPassA,
        humanize_mode: options.humanize_mode ?? options.humanizeMode,
        humanizeMode: options.humanize_mode ?? options.humanizeMode,
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
    humanizePostprocess = normalizeHumanizePostprocessForStorage(humanizePostprocess) ?? null
    await onStage('humanize_postprocess', {
      status: humanizePostprocess?.skipped ? 'skipped' : (humanizePostprocess?.accepted ? 'success' : 'warn'),
      report: humanizePostprocess,
      chars: (finalText || '').length,
      r76_zhuque_stack: R76_ZHUQUE_STACK_VERSION,
    })
  } catch (error: any) {
    if (llmControlOptions?.chapterTaskExecution) throw error
    humanizePostprocess = normalizeHumanizePostprocessForStorage({
      version: 'humanize_postprocess_v3',
      enabled: true,
      accepted: false,
      skipped: false,
      reason: 'humanize_postprocess_failed',
      error: formatAdmissionError(error, 240),
      r76_zhuque_stack: R76_ZHUQUE_STACK_VERSION,
    }) ?? null
    await onStage('humanize_postprocess', {
      status: 'failed',
      report: humanizePostprocess,
      r76_zhuque_stack: R76_ZHUQUE_STACK_VERSION,
    })
  }

  let writingSkillHumanize: Record<string, any> | null = null
  if (typeof runWritingSkillHumanizePass === 'function') {
    await onStage('writing_skill_humanize', {
      status: 'running',
      version: WRITING_SKILL_HUMANIZE_VERSION,
    })
    try {
      const skillResult = await runWritingSkillHumanizePass(
        activeWorkspace,
        project,
        contextPackage,
        finalText,
        preferredModelId,
        {
          ...llmControlOptions,
          writing_skills: options.writing_skills ?? options.writingSkills,
          writingSkills: options.writing_skills ?? options.writingSkills,
          onSkillProgress: async (skillId: string, progress?: { index?: number; total?: number; label?: string }) => {
            const skillIndex = Number(progress?.index)
            const skillTotal = Number(progress?.total)
            const hasCounter = Number.isInteger(skillIndex) && Number.isInteger(skillTotal)
              && skillIndex >= 1 && skillTotal >= 1
            // resolveWritingSkillStageLabel never returns undefined: installed ids
            // fall back to the runner-provided pack label or the bounded id.
            const baseLabel = String(
              progress?.label || resolveWritingSkillStageLabel(skillId),
            ).slice(0, 60)
            await onStage('writing_skill_humanize', {
              status: 'running',
              skill_id: skillId,
              label: hasCounter ? `${baseLabel}（${skillIndex}/${skillTotal}）` : baseLabel,
              ...(hasCounter ? { skill_index: skillIndex, skill_total: skillTotal } : {}),
            })
          },
        },
      )
      finalText = String(skillResult?.final_text || finalText)
      writingSkillHumanize = skillResult?.report || null
      await onStage('writing_skill_humanize', {
        status: writingSkillHumanize?.skipped ? 'skipped' : (writingSkillHumanize?.accepted ? 'success' : 'warn'),
        report: writingSkillHumanize,
        chars: (finalText || '').length,
      })
    } catch (error: any) {
      if (llmControlOptions?.chapterTaskExecution) throw error
      writingSkillHumanize = {
        version: WRITING_SKILL_HUMANIZE_VERSION,
        fiction_humanizer_mode: 'polish',
        enabled_ids: [],
        enabled: true,
        accepted: false,
        changed: false,
        skipped: false,
        warnings: [],
        passes: [],
        reason: 'writing_skill_humanize_failed',
        error: formatAdmissionError(error, 240),
        before_chars: 0,
        after_chars: 0,
        chunk_count: 0,
      }
      await onStage('writing_skill_humanize', {
        status: 'failed',
        report: writingSkillHumanize,
      })
    }
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

  return { finalText, humanizePostprocess, writingSkillHumanize }
}
