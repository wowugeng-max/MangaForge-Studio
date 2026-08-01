/**
 * LLM-backed dual-pass humanize postprocess for finished chapter prose.
 * Runs after draft/editor/meme and before the quality loop and store admission.
 *
 * Default path (post-R67):
 *   sanitize → risk heatmap → rewrite high-risk segments only (≤2 rounds)
 *   → packaging improve gate → fingerprint
 *
 * Full-chapter Pass A only when options.full_pass_a / humanize_mode=full_pass_a.
 * Pass B remains OFF unless explicitly enabled (raised pure-AI on Zhuque).
 */
import {
  acceptHumanizePostProcessCandidate,
  buildEmptyHumanizePostProcessReport,
  buildHumanizePostProcessPassPrompt,
  chunkTextForHumanize,
  HUMANIZE_CHUNK_LIMIT,
  HUMANIZE_POSTPROCESS_VERSION,
  sanitizeRemoveAiFlavorShells,
  stitchHumanizeChunks,
  type HumanizeChunk,
  type HumanizePostProcessReport,
} from '../../novel-writing/humanize-postprocess'
import {
  evaluateHumanWebnovelResistance,
  sanitizeDetectorHostileStock,
  selectFingerprintSafeProse,
} from '../../novel-writing/human-webnovel-resistance'
import { R76_ZHUQUE_STACK_VERSION } from '../../novel-writing/r76-zhuque-stack'
import { applyCanonicalNameGuard } from '../../novel-writing/canonical-name-guard'
import { ensureDialoguePauseWindows, MIN_DIALOGUE_PAUSE_WINDOWS } from '../../novel-writing/dialogue-pause-window'
import {
  assessChapterShrinkGuard,
  buildAigcRiskHeatmap,
  buildHighRiskSegmentRewritePrompt,
  HUMANIZE_RISK_MAX_ROUNDS,
  HUMANIZE_RISK_SEGMENT_VERSION,
  HUMANIZE_SEGMENT_PATH_MAX_SHRINK,
  mapWindowRewriteToParagraphs,
  selectHighRiskRewriteWindows,
  stitchParagraphCellsWithWindows,
  acceptRiskSegmentRewrite,
  type ZhuqueSegmentHint,
} from '../../novel-writing/humanize-risk-segment'
import {
  scanAcademicPaddingHits,
  stripHumanizeChatWrapper,
} from '../../novel-writing/humanize-dual-pass'
import {
  countProseChars,
  proseMaxTokensForWordTarget,
} from '../../novel-writing/word-target'
import {
  assertCompleteProseTransportResult,
} from '../quality/prose-transport-admission'
import {
  getNovelPayload,
} from '../../routes/novel-route-utils'
import {
  throwIfAborted,
} from './runtime-helpers'

function extractChapterText(payload: any): string {
  const chapters = Array.isArray(payload?.prose_chapters)
    ? payload.prose_chapters
    : Array.isArray(payload?.proseChapters)
      ? payload.proseChapters
      : []
  const first = chapters[0] || payload || {}
  return String(
    first?.chapter_text
    || first?.chapterText
    || payload?.chapter_text
    || payload?.chapterText
    || payload?.text
    || '',
  )
}

function resolveZhuqueSegments(options: any): ZhuqueSegmentHint[] | null {
  const raw = options?.zhuque_segments || options?.zhuqueSegments || options?.zhuque_report?.segments || options?.zhuqueReport?.segments
  return Array.isArray(raw) ? raw : null
}

/**
 * assessHumanizeLengthLock silently clamps lengthTolerance to [0.05, 0.35], but the
 * risk-segment human-positive path legitimately grows beyond that (#36). Honor the
 * caller's intended tolerance: when the shared gate rejects only on length and the
 * intended tolerance is wider than the clamp, re-check length against the intended
 * value while keeping the remaining gate checks (academic padding).
 */
function acceptHumanizeCandidateHonoringTolerance(
  beforeText: string,
  afterText: string,
  options: { pass: 'A' | 'B' | 'AB'; stage: string; lengthTolerance: number },
): { text: string; accepted: boolean; reason: string } {
  const intended = Math.max(0.05, Number(options.lengthTolerance) || 0.1)
  const clamped = Math.min(0.35, intended)
  const gate = acceptHumanizePostProcessCandidate(beforeText, afterText, { ...options, lengthTolerance: clamped })
  if (gate.accepted || intended <= clamped) return gate
  if (!String(gate.reason || '').startsWith('humanize_length_too_long')) return gate
  const stripped = stripHumanizeChatWrapper(afterText)
  const beforeChars = countProseChars(beforeText)
  const afterChars = countProseChars(stripped)
  if (afterChars > Math.ceil(beforeChars * (1 + intended))) return gate
  const afterAcademic = scanAcademicPaddingHits(stripped)
  if (afterAcademic.length > scanAcademicPaddingHits(beforeText).length) {
    return {
      text: beforeText,
      accepted: false,
      reason: `humanize_academic_padding:${afterAcademic.slice(0, 3).join('|')}`,
    }
  }
  return { text: stripped, accepted: true, reason: '' }
}

async function rewriteChunkWithAgent(input: {
  executeAgent: (...args: any[]) => any
  getStageModelId: (...args: any[]) => any
  getStageTemperature: (...args: any[]) => any
  activeWorkspace: string
  project: any
  contextPackage: any
  chunk: HumanizeChunk
  totalChunks: number
  pass: 'A' | 'B'
  modelId?: number
  options: any
}): Promise<string> {
  const {
    executeAgent,
    getStageModelId,
    getStageTemperature,
    activeWorkspace,
    project,
    contextPackage,
    chunk,
    totalChunks,
    pass,
    modelId,
    options,
  } = input
  throwIfAborted(options)
  const reviseModelId = getStageModelId(project, 'revise', modelId)
  const task = buildHumanizePostProcessPassPrompt({
    pass,
    chunk,
    totalChunks,
    project,
  })
  const result = await executeAgent('prose-agent', project, {
    task,
    upstreamContext: contextPackage,
  }, {
    activeWorkspace,
    modelId: reviseModelId ? String(reviseModelId) : undefined,
    maxTokens: Math.max(1200, Math.min(3500, proseMaxTokensForWordTarget({ min: countProseChars(chunk.text), max: countProseChars(chunk.text) + 200 }) || 2000)),
    temperature: getStageTemperature(project, 'revise', pass === 'A' ? 0.4 : 0.25),
    skipMemory: true,
    signal: options.abortSignal,
    timeoutMs: options.llmTimeoutMs || 180000,
  })
  try {
    assertCompleteProseTransportResult(result, 'PROSE_REVISION_TRUNCATED')
  } catch {
    return chunk.text
  }
  const payload = getNovelPayload(result)
  let out = extractChapterText(payload)
  if (!out.trim()) {
    out = String((result as any)?.text || (result as any)?.content || payload || '')
  }
  out = String(out || '').trim()
  if (!out) return chunk.text
  if (countProseChars(out) > countProseChars(chunk.text) * 2.2) {
    return chunk.text
  }
  // Segment / Pass A: allow moderate shrink; never accept R67-scale collapse here.
  const gate = acceptHumanizePostProcessCandidate(chunk.text, out, {
    pass,
    stage: `humanize_pass_${pass}`,
    lengthTolerance: pass === 'A' ? 0.22 : 0.12,
  })
  return gate.accepted ? gate.text : chunk.text
}

async function rewriteRiskWindowWithAgent(input: {
  executeAgent: (...args: any[]) => any
  getStageModelId: (...args: any[]) => any
  getStageTemperature: (...args: any[]) => any
  activeWorkspace: string
  project: any
  contextPackage: any
  window: { id: string; text: string; score: number; reasons: string[] }
  round: number
  modelId?: number
  options: any
}): Promise<string> {
  const {
    executeAgent,
    getStageModelId,
    getStageTemperature,
    activeWorkspace,
    project,
    contextPackage,
    window,
    round,
    modelId,
    options,
  } = input
  throwIfAborted(options)
  const reviseModelId = getStageModelId(project, 'revise', modelId)
  const task = buildHighRiskSegmentRewritePrompt({
    window,
    round,
    project,
  })
  const result = await executeAgent('prose-agent', project, {
    task,
    upstreamContext: contextPackage,
  }, {
    activeWorkspace,
    modelId: reviseModelId ? String(reviseModelId) : undefined,
    maxTokens: Math.max(1000, Math.min(3200, proseMaxTokensForWordTarget({ min: countProseChars(window.text), max: countProseChars(window.text) + 180 }) || 1800)),
    temperature: getStageTemperature(project, 'revise', 0.35),
    skipMemory: true,
    signal: options.abortSignal,
    timeoutMs: options.llmTimeoutMs || 180000,
  })
  try {
    assertCompleteProseTransportResult(result, 'PROSE_REVISION_TRUNCATED')
  } catch {
    return window.text
  }
  const payload = getNovelPayload(result)
  let out = extractChapterText(payload)
  if (!out.trim()) {
    out = String((result as any)?.text || (result as any)?.content || payload || '')
  }
  return String(out || '').trim() || window.text
}

export function createProseHumanizePostprocessMethods(deps: {
  executeAgent: (...args: any[]) => any
  getStageModelId: (...args: any[]) => any
  getStageTemperature: (...args: any[]) => any
}) {
  const executeAgent = deps.executeAgent
  const getStageModelId = deps.getStageModelId
  const getStageTemperature = deps.getStageTemperature

  const runFullPassA = async (
    activeWorkspace: string,
    project: any,
    contextPackage: any,
    current: string,
    modelId: number | undefined,
    options: any,
    stages: Array<Record<string, any>>,
  ): Promise<string> => {
    const chunksA = chunkTextForHumanize(current, HUMANIZE_CHUNK_LIMIT)
    stages.push({ stage: 'full_pass_a_start', chunk_count: chunksA.length, chars: countProseChars(current) })
    const rewrittenA: HumanizeChunk[] = []
    for (const chunk of chunksA) {
      const text = await rewriteChunkWithAgent({
        executeAgent,
        getStageModelId,
        getStageTemperature,
        activeWorkspace,
        project,
        contextPackage,
        chunk,
        totalChunks: chunksA.length,
        pass: 'A',
        modelId,
        options,
      })
      rewrittenA.push({ ...chunk, text })
    }
    let passAText = stitchHumanizeChunks(rewrittenA)
    passAText = sanitizeDetectorHostileStock(sanitizeRemoveAiFlavorShells(passAText))
    // Cap full Pass A shrink hard (R67 guard): max 18% chapter loss vs entry current.
    const shrink = assessChapterShrinkGuard(current, passAText, HUMANIZE_SEGMENT_PATH_MAX_SHRINK)
    if (!shrink.ok) {
      stages.push({ stage: 'full_pass_a_reject_over_shrink', ratio: shrink.ratio, reason: shrink.reason })
      return current
    }
    const passAGate = acceptHumanizePostProcessCandidate(current, passAText, {
      pass: 'A',
      stage: 'humanize_pass_a_stitch',
      lengthTolerance: 0.22,
    })
    stages.push({
      stage: 'full_pass_a_done',
      accepted: passAGate.accepted,
      reason: passAGate.reason,
      chars: countProseChars(passAGate.accepted ? passAGate.text : current),
    })
    return passAGate.accepted ? passAGate.text : current
  }

  const runRiskSegmentPath = async (
    activeWorkspace: string,
    project: any,
    contextPackage: any,
    current: string,
    modelId: number | undefined,
    options: any,
    stages: Array<Record<string, any>>,
  ): Promise<{ text: string; passAApplied: boolean }> => {
    const zhuqueSegments = resolveZhuqueSegments(options)
    let working = current
    let passAApplied = false
    const maxRounds = Math.max(1, Math.min(HUMANIZE_RISK_MAX_ROUNDS, Number(options?.risk_rewrite_rounds || options?.riskRewriteRounds || 1) || 1))

    for (let round = 1; round <= maxRounds; round += 1) {
      const heatmap = buildAigcRiskHeatmap(working, { zhuqueSegments: round === 1 ? zhuqueSegments : null })
      const windows = selectHighRiskRewriteWindows(heatmap, {
        maxWindows: Number(options?.max_risk_windows || options?.maxRiskWindows || 3) || 3,
        maxChars: HUMANIZE_CHUNK_LIMIT,
      })
      stages.push({
        stage: `risk_heatmap_round_${round}`,
        version: HUMANIZE_RISK_SEGMENT_VERSION,
        paragraph_count: heatmap.paragraph_count,
        high_risk_count: heatmap.high_risk_count,
        total_score: heatmap.total_score,
        window_count: windows.length,
        windows: windows.map((w) => ({ id: w.id, score: w.score, reasons: w.reasons, chars: countProseChars(w.text) })),
      })
      if (!windows.length) {
        stages.push({ stage: `risk_segment_skip_round_${round}`, reason: 'no_high_risk_windows' })
        break
      }

      const rewrittenByIndex = new Map<number, string>()
      let acceptedAny = false
      for (const win of windows) {
        const rewritten = await rewriteRiskWindowWithAgent({
          executeAgent,
          getStageModelId,
          getStageTemperature,
          activeWorkspace,
          project,
          contextPackage,
          window: win,
          round,
          modelId,
          options,
        })
        // provisional stitch for chapter shrink check
        const provisionalMap = mapWindowRewriteToParagraphs(win, rewritten, heatmap.cells)
        const trialMap = new Map(rewrittenByIndex)
        for (const [k, v] of provisionalMap) trialMap.set(k, v)
        const trialChapter = stitchParagraphCellsWithWindows(working, heatmap, trialMap)
        const gate = acceptRiskSegmentRewrite({
          beforeWindow: win.text,
          afterWindow: rewritten,
          beforeChapter: current,
          afterChapter: trialChapter,
          reasons: win.reasons || [],
        })
        stages.push({
          stage: `risk_window_round_${round}`,
          id: win.id,
          accepted: gate.accepted,
          reason: gate.reason || '',
          before_chars: countProseChars(win.text),
          after_chars: countProseChars(gate.accepted ? gate.text : win.text),
          score: win.score,
        })
        if (!gate.accepted) continue
        acceptedAny = true
        passAApplied = true
        const finalMap = mapWindowRewriteToParagraphs(win, gate.text, heatmap.cells)
        for (const [k, v] of finalMap) {
          // Keep explicit deletions (mapped to ''): a compressed window marks surplus
          // paragraphs as deleted, and stitch must drop them instead of resurrecting (#22).
          rewrittenByIndex.set(k, String(v || '').trim())
        }
      }

      if (!acceptedAny) {
        stages.push({ stage: `risk_segment_no_accept_round_${round}` })
        break
      }

      let nextText = stitchParagraphCellsWithWindows(working, heatmap, rewrittenByIndex)
      nextText = sanitizeDetectorHostileStock(sanitizeRemoveAiFlavorShells(nextText))
      const shrink = assessChapterShrinkGuard(current, nextText, HUMANIZE_SEGMENT_PATH_MAX_SHRINK)
      if (!shrink.ok) {
        stages.push({ stage: `risk_segment_reject_over_shrink_round_${round}`, ratio: shrink.ratio, reason: shrink.reason })
        break
      }
      working = nextText
    }

    return { text: working, passAApplied }
  }

  const runHumanizePostProcess = async (
    activeWorkspace: string,
    project: any,
    contextPackage: any,
    chapterText: string,
    modelId?: number,
    options: any = {},
  ): Promise<{ final_text: string; report: HumanizePostProcessReport }> => {
    const source = String(chapterText || '')
    if (!source.trim()) {
      return {
        final_text: source,
        report: buildEmptyHumanizePostProcessReport(source, { skipped: true, reason: 'empty_text' }),
      }
    }
    const explicitlyEnabled = options?.enable_humanize_postprocess === true || options?.enableHumanizePostprocess === true
    const explicitlySkipped = options?.skip_humanize_postprocess === true || options?.skipHumanizePostprocess === true
    // Unit tests use sequential mock agent queues; auto-skip unless explicitly enabled.
    const vitestAutoSkip = Boolean(process.env.VITEST) && !explicitlyEnabled
    if (explicitlySkipped || vitestAutoSkip) {
      return {
        final_text: source,
        report: buildEmptyHumanizePostProcessReport(source, {
          skipped: true,
          reason: explicitlySkipped ? 'skip_humanize_postprocess' : 'vitest_auto_skip',
          r76_zhuque_stack: String(options?.r76_zhuque_stack || R76_ZHUQUE_STACK_VERSION),
        } as any),
      }
    }

    const stages: Array<Record<string, any>> = []
    const beforeChars = countProseChars(source)

    // 1) Deterministic shells first (subtractive packaging).
    let current = sanitizeDetectorHostileStock(sanitizeRemoveAiFlavorShells(source))
    stages.push({
      stage: 'deterministic_shells',
      changed: current !== source,
      chars: countProseChars(current),
    })
    // Pre-LLM baseline: deterministic shells only. humanizeGate rejections revert
    // here instead of keeping the rejected LLM candidate (#36).
    const preLlmBaseline = current

    const mode = String(options?.humanize_mode || options?.humanizeMode || 'risk_segment').toLowerCase()
    const forceFullPassA = options?.full_pass_a === true
      || options?.fullPassA === true
      || mode === 'full_pass_a'
      || mode === 'full'
    const enablePassB = options?.enable_humanize_pass_b === true || options?.enableHumanizePassB === true

    let passAApplied = false
    if (forceFullPassA) {
      current = await runFullPassA(activeWorkspace, project, contextPackage, current, modelId, options, stages)
      passAApplied = current !== source
    } else {
      const seg = await runRiskSegmentPath(activeWorkspace, project, contextPackage, current, modelId, options, stages)
      current = seg.text
      passAApplied = seg.passAApplied
    }

    // Optional Pass B (default OFF — R60 raised AI).
    let passBApplied = false
    let passBText = current
    if (enablePassB) {
      const chunksB = chunkTextForHumanize(current, HUMANIZE_CHUNK_LIMIT)
      const rewrittenB: HumanizeChunk[] = []
      for (const chunk of chunksB) {
        const text = await rewriteChunkWithAgent({
          executeAgent,
          getStageModelId,
          getStageTemperature,
          activeWorkspace,
          project,
          contextPackage,
          chunk,
          totalChunks: chunksB.length,
          pass: 'B',
          modelId,
          options,
        })
        rewrittenB.push({ ...chunk, text })
      }
      passBText = stitchHumanizeChunks(rewrittenB)
      passBText = sanitizeDetectorHostileStock(sanitizeRemoveAiFlavorShells(passBText))
      passBApplied = passBText !== current
      stages.push({ stage: 'pass_b', applied: passBApplied, chars: countProseChars(passBText) })
    }

    let candidate = passBText
    // Risk-segment human_positive may expand mid friction well beyond ±22% (R73 Zhuque-first).
    // Keep Pass B tight; allow larger growth when segment path added human texture.
    const humanizeGate = acceptHumanizeCandidateHonoringTolerance(source, candidate, {
      pass: enablePassB ? 'AB' : 'A',
      stage: enablePassB ? 'humanize_pass_b_stitch' : 'humanize_segment_or_a',
      lengthTolerance: enablePassB ? 0.12 : (passAApplied ? 0.55 : 0.28),
    })
    if (!humanizeGate.accepted) {
      stages.push({ stage: 'humanize_gate_reject', reason: humanizeGate.reason })
      // With Pass B off, passBText === current, so falling back to `current` was a
      // no-op (#36). Revert to the pre-LLM baseline so the rejection takes effect.
      candidate = passBText === current ? preLlmBaseline : current
    } else {
      candidate = humanizeGate.text
    }

    candidate = sanitizeRemoveAiFlavorShells(candidate)
    candidate = sanitizeDetectorHostileStock(candidate)

    let fp = selectFingerprintSafeProse(source, candidate, { stage: 'humanize_postprocess' })
    let finalText = candidate
    let usedFallback = false
    if (!fp.accepted) {
      const cleaned = sanitizeDetectorHostileStock(sanitizeRemoveAiFlavorShells(candidate))
      const fpClean = selectFingerprintSafeProse(source, cleaned, { stage: 'humanize_postprocess' })
      if (fpClean.accepted) {
        finalText = fpClean.text
        fp = fpClean
      } else {
        finalText = acceptHumanizePostProcessCandidate(
          source,
          sanitizeDetectorHostileStock(sanitizeRemoveAiFlavorShells(source)),
        ).text
        usedFallback = true
      }
    } else {
      finalText = fp.text
    }

    finalText = sanitizeDetectorHostileStock(sanitizeRemoveAiFlavorShells(finalText))

    // If LLM path no-op, still force packaging density drop via heavy sanitize.
    // No-op means content equality — never char-count equality, which misfires on
    // real rewrites whose length coincidentally matches (#37).
    if (finalText === source) {
      const forced = sanitizeDetectorHostileStock(sanitizeRemoveAiFlavorShells(source))
      if (forced !== source) {
        finalText = forced
        usedFallback = false
        stages.push({ stage: 'force_packaging_strip_on_noop', changed: true, chars: countProseChars(finalText) })
      }
    }

    // Hard chapter shrink guard (system-wide, prevents R67 full rewrite collapse).
    const shrinkGuard = assessChapterShrinkGuard(source, finalText, HUMANIZE_SEGMENT_PATH_MAX_SHRINK)
    if (!shrinkGuard.ok) {
      const safeSource = sanitizeDetectorHostileStock(sanitizeRemoveAiFlavorShells(source))
      stages.push({
        stage: 'chapter_shrink_guard',
        ratio: shrinkGuard.ratio,
        reason: shrinkGuard.reason,
        kept: 'source_sanitize',
      })
      finalText = safeSource
      usedFallback = true
    }

    // Only keep dual-pass/segment if pure-AI packaging risk did not worsen vs source.
    const beforeRes = evaluateHumanWebnovelResistance(source)
    const afterRes = evaluateHumanWebnovelResistance(finalText)
    const beforePure = beforeRes.hard_failures.filter((f: any) => !String(f.key || '').startsWith('hw_fp_')).length
    const afterPure = afterRes.hard_failures.filter((f: any) => !String(f.key || '').startsWith('hw_fp_')).length
    // Zhuque-first: only hard pure-AI family / hard-failure regressions veto.
    // Soft clinical density alone used to discard useful segment rewrites (R70).
    const packagingWorsened = afterPure > beforePure
      || afterRes.hard_failures.length > beforeRes.hard_failures.length
      || (
        (afterRes.vector?.clinical_hit_per_1k || 0) > (beforeRes.vector?.clinical_hit_per_1k || 0) + 0.35
        && afterPure >= beforePure
      )
    if (packagingWorsened && finalText !== source) {
      const safeSource = sanitizeDetectorHostileStock(sanitizeRemoveAiFlavorShells(source))
      finalText = safeSource
      usedFallback = true
      stages.push({
        stage: 'packaging_improve_gate',
        before_pure: beforePure,
        after_pure: afterPure,
        before_hard: beforeRes.hard_failures.length,
        after_hard: afterRes.hard_failures.length,
        before_clinical: beforeRes.vector?.clinical_hit_per_1k,
        after_clinical: afterRes.vector?.clinical_hit_per_1k,
        kept: 'source_sanitize',
      })
    }

    stages.push({
      stage: enablePassB ? 'pass_b_final' : (forceFullPassA ? 'full_pass_a_final' : 'risk_segment_final'),
      humanize_mode: forceFullPassA ? 'full_pass_a' : 'risk_segment',
      chars: countProseChars(finalText),
      pass_b_enabled: enablePassB,
      humanize_accepted: humanizeGate.accepted,
      humanize_reason: humanizeGate.reason || '',
      fingerprint_accepted: fp.accepted,
      fingerprint_reason: fp.reason || '',
      used_deterministic_fallback: usedFallback,
      risk_segment_version: HUMANIZE_RISK_SEGMENT_VERSION,
    })

    // System-level name consistency: repair rare near-miss slips after humanize rewrites.
    {
      const guarded = applyCanonicalNameGuard(finalText, { project, contextPackage })
      if (guarded.report.changed) {
        finalText = guarded.text
        stages.push({
          stage: 'canonical_name_guard',
          changed: true,
          repairs: guarded.report.repairs,
        })
      }
    }

    // R76 v1.3: dual-zone dialogue-pause ensure after sparse humanize (system-level, not chapter-tuned).
    if (!(options?.skip_dialogue_pause_ensure === true || options?.skipDialoguePauseEnsure === true)) {
      const ensured = ensureDialoguePauseWindows(finalText, { minWindows: MIN_DIALOGUE_PAUSE_WINDOWS })
      stages.push({
        stage: 'dialogue_pause_window_ensure',
        version: ensured.report.version,
        before_count: ensured.report.before_count,
        after_count: ensured.report.after_count,
        injected: ensured.report.injected,
        zones: ensured.report.zones,
        changed: ensured.report.changed,
        skip_reason: ensured.report.skip_reason || '',
      })
      if (ensured.report.changed) {
        finalText = ensured.text
      }
    }

    const report: HumanizePostProcessReport = {
      version: HUMANIZE_POSTPROCESS_VERSION,
      dual_pass_version: 'humanize_dual_pass_v1',
      enabled: true,
      before_chars: beforeChars,
      after_chars: countProseChars(finalText),
      chunk_count: chunkTextForHumanize(source, HUMANIZE_CHUNK_LIMIT).length,
      pass_a_applied: passAApplied || forceFullPassA,
      pass_b_applied: passBApplied,
      deterministic_shells: true,
      accepted: finalText !== source,
      reject_reason: usedFallback
        ? (fp.reason || 'fingerprint_or_shrink_fallback')
        : (!humanizeGate.accepted ? humanizeGate.reason : (!fp.accepted ? fp.reason : undefined)),
      stages,
      r76_zhuque_stack: String(options?.r76_zhuque_stack || R76_ZHUQUE_STACK_VERSION),
    } as HumanizePostProcessReport

    return { final_text: finalText, report }
  }

  return { runHumanizePostProcess }
}
