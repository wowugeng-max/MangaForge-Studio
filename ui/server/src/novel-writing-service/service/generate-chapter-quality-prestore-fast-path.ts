import {
  evaluateHumanWebnovelResistance,
} from '../../novel-writing/human-webnovel-resistance'
import {
  applyR76PreStoreSanitize,
} from '../../novel-writing/r76-zhuque-stack'
import {
  scanProseForQualityLoop,
} from '../quality/prose-quality-entry'

export async function runZhuqueFastQualityLoop(args: {
  finalText: string
  project: any
  contextPackage: any
  wordTarget: any
  wordTargetCompatibility: any
  qualityThreshold: number
  isZhuqueFast: boolean
  onStage: (...a: any[]) => any
}): Promise<{ finalText: string; qualityLoop: any }> {
  const {
    project,
    contextPackage,
    wordTarget,
    wordTargetCompatibility,
    qualityThreshold,
    isZhuqueFast,
    onStage,
  } = args

  await onStage('review', {
    status: 'skipped',
    reason: 'zhuque_fast_path',
    detail: '朱雀验证快路径：跳过多轮质检/修订 LLM，仅确定性扫描 + R76 sanitize/humanize',
  })
  await onStage('revise', {
    status: 'skipped',
    reason: 'zhuque_fast_path',
  })
  const scan = scanProseForQualityLoop(args.finalText, contextPackage, wordTarget, wordTargetCompatibility ? {
    word_target_compatibility_pass: true,
    compatibility_ceiling: wordTargetCompatibility.compatibility_ceiling,
  } : {})
  const resistanceProbe = evaluateHumanWebnovelResistance(args.finalText)
  const hardFailures = Array.isArray(resistanceProbe?.hard_failures) ? resistanceProbe.hard_failures : []
  const qualityLoop = {
    final_text: args.finalText,
    final_scan: scan,
    final_review: { score: 0, findings: [], dimensions: {}, source: 'zhuque_fast_scan_only' },
    decision: {
      passed: hardFailures.length === 0,
      approvable: hardFailures.length === 0,
      score: 0,
      min_score: qualityThreshold,
      hard_failures: hardFailures,
      advisory_failures: ['zhuque_fast_path: skipped LLM quality review/revise'],
    },
    rounds: [],
    quality_warning: {
      code: 'zhuque_fast_path',
      source: 'review',
      message: '朱雀验证快路径：已跳过多轮质检修订 LLM',
      details: { version: 'zhuque-fast-v1', hard_failures: hardFailures.length },
    },
  }

  return {
    qualityLoop,
    finalText: applyR76PreStoreSanitize(String(qualityLoop.final_text || ''), {
      project,
      contextPackage,
      skip_mid_monologue_densify: isZhuqueFast,
      skipMidMonologueDensify: isZhuqueFast,
    }),
  }
}
