export function attachQualityLoopFailureDiagnostics(
  error: any,
  options: { draftPromptDiagnostics?: any; qualityThreshold?: any; qualityLoopDiagnostics?: any } = {},
) {
  const code = String(error?.code || 'PROSE_QUALITY_GATE_BLOCKED')
  error.prompt_diagnostics = options.draftPromptDiagnostics
  error.quality_loop = error?.quality_loop || options.qualityLoopDiagnostics || {
    rounds: [],
    decision: {
      passed: false,
      approvable: false,
      score: 0,
      min_score: options.qualityThreshold,
      hard_failures: [{
        key: code.toLowerCase(),
        message: String(error?.message || '正文质量门禁不可用').slice(0, 500),
        source: code === 'PROSE_QUALITY_RECHECK_UNAVAILABLE' ? 'recheck' : 'llm',
      }],
      advisory_failures: [],
    },
  }
  if (Object.prototype.hasOwnProperty.call(error, 'rounds')) delete error.rounds
  return error
}
