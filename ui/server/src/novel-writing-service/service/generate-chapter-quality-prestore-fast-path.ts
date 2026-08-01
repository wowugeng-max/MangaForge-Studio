import {
  evaluateHumanWebnovelResistance,
} from '../../novel-writing/human-webnovel-resistance'
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
    contextPackage,
    wordTarget,
    wordTargetCompatibility,
    qualityThreshold,
    onStage,
  } = args
  const finalText = String(args.finalText || '')

  await onStage('review', {
    status: 'skipped',
    reason: 'zhuque_fast_path',
    detail: '朱雀验证快路径：跳过多轮质检/修订 LLM；沿用公共终稿器已完成的 R76 sanitize/humanize，仅执行确定性扫描',
  })
  await onStage('revise', {
    status: 'skipped',
    reason: 'zhuque_fast_path',
  })
  const scan = scanProseForQualityLoop(finalText, contextPackage, wordTarget, wordTargetCompatibility ? {
    word_target_compatibility_pass: true,
    compatibility_ceiling: wordTargetCompatibility.compatibility_ceiling,
  } : {})
  const resistanceProbe = evaluateHumanWebnovelResistance(finalText)
  const hardFailures = Array.isArray(resistanceProbe?.hard_failures) ? resistanceProbe.hard_failures : []
  const qualityLoop = {
    final_text: finalText,
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
    finalText,
  }
}
