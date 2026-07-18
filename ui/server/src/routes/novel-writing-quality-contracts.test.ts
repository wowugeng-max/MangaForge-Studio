import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'bun:test'

const readServiceSource = () => readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
const readProseQualityReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/prose-quality-review-record.ts'), 'utf8')

describe('novel writing service quality contract wiring', () => {
  test('prose quality review payloads store latest generated scene breakdown context', () => {
    const source = readServiceSource()
    const reviewRecordSource = readProseQualityReviewRecordSource()
    const finalReviewContextStart = source.indexOf('const finalReviewContextPackage = buildProseReviewContextPackage')
    const qualityReviewStorageBlock = source.slice(
      finalReviewContextStart,
      source.indexOf('const settingViolations = Array.isArray', finalReviewContextStart),
    )

    expect(finalReviewContextStart).toBeGreaterThanOrEqual(0)
    expect(qualityReviewStorageBlock).toContain('const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)')
    expect(qualityReviewStorageBlock).toContain('contextPackage: finalReviewContextPackage')
    expect(reviewRecordSource).toContain('context_package: input.contextPackage')
    expect(qualityReviewStorageBlock).not.toContain('contextPackage: contextPackage')
  })

  test('quality gates include revision cascade evidence failures before storing prose', () => {
    const source = readServiceSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const cascadeCheckStart = source.indexOf('const revisionCascadeImpactChecks =', groupStart)
    const gateReviewStart = source.indexOf('const qualityGateReview =', cascadeCheckStart)
    const preStoreStart = source.indexOf('const preStoreQualityDecision =', gateReviewStart)
    const gateBlock = source.slice(cascadeCheckStart, preStoreStart)

    expect(cascadeCheckStart).toBeGreaterThan(groupStart)
    expect(gateReviewStart).toBeGreaterThan(cascadeCheckStart)
    expect(preStoreStart).toBeGreaterThan(gateReviewStart)
    expect(gateBlock).toContain('revisionCascadeImpactSync.evidence_missing')
    expect(gateBlock).toContain('revisionCascadeImpactSync.evidence_unlocated')
    expect(gateBlock).toContain("key: 'revision_cascade_impact_evidence'")
    expect(gateBlock).toContain('修订级联影响证据未闭环')
    expect(gateBlock).toContain('...revisionCascadeImpactChecks')
  })

  test('quality gates include structural sync failures before storing prose', () => {
    const source = readServiceSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const syncStart = source.indexOf('const preStoreStructuralSyncChecks = buildPreStoreStructuralSyncChecks', groupStart)
    const qualityGateStart = source.indexOf('const qualityGateReview = buildQualityGateReviewWithDeterministicCleanup', groupStart)
    const preStoreStart = source.indexOf('const preStoreQualityDecision =', qualityGateStart)
    const gateBlock = source.slice(syncStart, preStoreStart)

    expect(syncStart).toBeGreaterThan(groupStart)
    expect(syncStart).toBeLessThan(qualityGateStart)
    expect(gateBlock).toContain('chapterBlueprintSync')
    expect(gateBlock).toContain('benchmarkRecallSync')
    expect(gateBlock).toContain('storyDriveSync')
    expect(gateBlock).toContain('chapterAttractionReview')
    expect(gateBlock).toContain('runwaySync')
    expect(gateBlock).toContain('...preStoreStructuralSyncChecks')
  })

  test('blocks hard chapter launch gate before drafting prose', () => {
    const source = readServiceSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const sceneCardsStart = source.indexOf("await onStage('scene_cards'", groupStart)
    const draftStart = source.indexOf("await onStage('draft'", groupStart)
    const blockerStart = source.indexOf('const launchGateBlocker = getChapterLaunchGateBlocker', groupStart)
    const blockerBlock = source.slice(blockerStart, sceneCardsStart)

    expect(blockerStart).toBeGreaterThan(groupStart)
    expect(blockerStart).toBeLessThan(sceneCardsStart)
    expect(blockerStart).toBeLessThan(draftStart)
    expect(blockerBlock).toContain('chapterLaunchGateFromContext(contextPackage')
    expect(blockerBlock).toContain("code: 'PROSE_LAUNCH_GATE_BLOCKED'")
    expect(blockerBlock).toContain('PROSE_LAUNCH_GATE_BLOCKED')
  })

  test('prose revision parser falls back to plain prose and records diagnostics', () => {
    const source = readServiceSource()
    const revisionStart = source.indexOf('const revisionPayload = getNovelPayload(revisionResult)')
    const revisionEnd = source.indexOf('const runCommercialEditorRewrite', revisionStart)
    const revisionBlock = source.slice(revisionStart, revisionEnd)

    expect(revisionStart).toBeGreaterThanOrEqual(0)
    expect(revisionEnd).toBeGreaterThan(revisionStart)
    expect(revisionBlock).toContain('const revisionPlainProseFallback = extractPlainProseFallback(revisionResult')
    expect(revisionBlock).toContain('|| revisionPlainProseFallback')
    expect(revisionBlock).toContain('llm_diagnostics: buildLLMResultDiagnostics(revisionResult)')
  })

  test('prose revision uses expanded output budget for quality-gate repair', () => {
    const source = readServiceSource()
    const runStart = source.indexOf('const runProseSelfReviewAndRevision = async')
    const revisionStart = source.indexOf('const revisionMaxTokens', runStart)
    const revisionEnd = source.indexOf('const revisionPayload = getNovelPayload(revisionResult)', revisionStart)
    const revisionBlock = source.slice(revisionStart, revisionEnd)

    expect(revisionStart).toBeGreaterThan(runStart)
    expect(revisionEnd).toBeGreaterThan(revisionStart)
    expect(revisionBlock).toContain('options.quality_gate_repair')
    expect(revisionBlock).toContain('maxTokens: revisionMaxTokens')
    expect(revisionBlock).not.toContain('maxTokens: 8000')
  })

  test('prose self-review uses expanded output budget for oh-story structured checks', () => {
    const source = readServiceSource()
    const reviewStart = source.indexOf('const runProseSelfReviewAndRevision = async')
    const reviewEnd = source.indexOf('const reviewPayload = getNovelPayload(reviewResult)', reviewStart)
    const reviewBlock = source.slice(reviewStart, reviewEnd)

    expect(reviewStart).toBeGreaterThanOrEqual(0)
    expect(reviewEnd).toBeGreaterThan(reviewStart)
    expect(reviewBlock).toContain('const reviewMaxTokens')
    expect(reviewBlock).toContain('maxTokens: reviewMaxTokens')
    expect(reviewBlock).not.toContain('maxTokens: 3000')
  })

  test('prose self-review runs a compact follow-up when oh-story structured checks are omitted', () => {
    const source = readServiceSource()
    const reviewStart = source.indexOf('const runProseSelfReviewAndRevision = async')
    const repairStart = source.indexOf('const structuredFillReview = await fillMissingStructuredReviewChecks', reviewStart)
    const concernStart = source.indexOf('const hasDeliveryRiskReceiptConcern =', reviewStart)
    const revisionPromptStart = source.indexOf('task: buildProseRevisionPrompt', reviewStart)
    const reviewBlock = source.slice(reviewStart, revisionPromptStart)

    expect(reviewStart).toBeGreaterThanOrEqual(0)
    expect(repairStart).toBeGreaterThan(reviewStart)
    expect(repairStart).toBeLessThan(concernStart)
    expect(repairStart).toBeLessThan(revisionPromptStart)
    expect(reviewBlock).toContain('fillMissingStructuredReviewChecks(activeWorkspace, project, contextPackage, chapterText, normalizedReview, modelId, options)')
    expect(source).toContain('chunkStructuredReviewFields(missingFields')
    expect(reviewBlock).toContain('mergeStructuredReviewFillPayload')
    expect(source).toContain('只补缺失的 oh-story 结构化自检字段')
  })

  test('prose generation and revision prompts hard-lock simplified Chinese chapter text', () => {
    const source = readServiceSource()
    const draftPromptStart = source.indexOf('return buildBoundedProsePrompt([')
    const draftPromptEnd = source.indexOf('const buildStoryStatePrompt =', draftPromptStart)
    const draftPromptBlock = source.slice(draftPromptStart, draftPromptEnd)
    const revisionPromptStart = source.indexOf('const buildProseRevisionPrompt =')
    const revisionPromptEnd = source.indexOf('const nextChapterQualityPlanNeedsRepair =', revisionPromptStart)
    const revisionPromptBlock = source.slice(revisionPromptStart, revisionPromptEnd)

    expect(draftPromptStart).toBeGreaterThanOrEqual(0)
    expect(draftPromptEnd).toBeGreaterThan(draftPromptStart)
    expect(revisionPromptStart).toBeGreaterThanOrEqual(0)
    expect(revisionPromptEnd).toBeGreaterThan(revisionPromptStart)
    expect(draftPromptBlock).toContain('chapter_text 必须使用简体中文')
    expect(draftPromptBlock).toContain('不得输出葡萄牙语、英语或拼音正文')
    expect(revisionPromptBlock).toContain('chapter_text 必须使用简体中文')
    expect(revisionPromptBlock).toContain('不得输出葡萄牙语、英语或拼音正文')
  })

  test('structured review fill cannot overwrite overall quality score from compact batches', () => {
    const source = readServiceSource()
    const mergeStart = source.indexOf('function mergeStructuredReviewFillPayload')
    const mergeEnd = source.indexOf('function buildMissingStructuredReviewChecksPrompt', mergeStart)
    const mergeBlock = source.slice(mergeStart, mergeEnd)

    expect(mergeStart).toBeGreaterThanOrEqual(0)
    expect(mergeEnd).toBeGreaterThan(mergeStart)
    expect(mergeBlock).toContain('for (const [snakeField, camelField] of STRUCTURED_REVIEW_CHECK_FIELDS)')
    expect(mergeBlock).not.toContain("if (typeof payload?.passed === 'boolean') merged.passed = payload.passed")
    expect(mergeBlock).not.toContain("if (Number.isFinite(Number(payload?.score))) merged.score = Number(payload.score)")
    expect(mergeBlock).not.toContain("if (typeof payload?.needs_revision === 'boolean') merged.needs_revision = payload.needs_revision")
    expect(mergeBlock).not.toContain("if (typeof payload?.needsRevision === 'boolean') merged.needs_revision = payload.needsRevision")
  })

  test('structured review fill considers every omitted oh-story check field instead of truncating at 24', () => {
    const source = readServiceSource()
    const missingStart = source.indexOf('function missingStructuredReviewCheckFields')
    const missingEnd = source.indexOf('function chunkStructuredReviewFields', missingStart)
    const missingBlock = source.slice(missingStart, missingEnd)

    expect(missingStart).toBeGreaterThanOrEqual(0)
    expect(missingEnd).toBeGreaterThan(missingStart)
    expect(missingBlock).toContain('STRUCTURED_REVIEW_CHECK_FIELDS')
    expect(missingBlock).not.toContain('.slice(0, 24)')
  })
})
