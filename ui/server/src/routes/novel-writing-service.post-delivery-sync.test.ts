import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  buildChapterAttractionReviewReport,
  buildChapterCoreDriftReport,
  buildChapterHandoffSyncReport,
  buildCoreContractSyncReport,
  buildInnovationSyncReport,
  buildMergedLayeredMemoryContext,
  buildReaderExpectationSyncReport,
  buildReaderPayoffSyncReport,
  buildReaderRetentionSyncReport,
  buildRunwaySyncReport,
  buildSignatureSceneSyncReport,
  buildStoryUnitSyncReport,
  buildVolumeBeatSyncReport,
  normalizeDeliveryRiskReceipts,
  normalizeDiscoveredAssets,
  normalizeIpSceneCandidates,
  uniqueDeliveryRiskReceipts,
} from './novel-writing-service'
import { getStyleLock } from './novel-route-utils'
import {
  buildAssetIntakeReviewRecord,
  buildIpSceneIntakeReviewRecord,
  buildPostDeliverySyncReviewRecord,
} from '../novel-writing/post-delivery-sync-review-record'

const readChapterProseStoragePatchSource = () => readFileSync(join(import.meta.dir, '../novel-writing/chapter-prose-storage-patch.ts'), 'utf8')

describe('story unit sync report', () => {
  test('checks current story unit role and warns when the prose rushes later unit payoffs', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 7,
        title: '试炼倒计时',
        story_unit_context: {
          title: '试炼前夜剧情单元',
          chapter_range_label: '第7-12章',
          current_chapter_role: '入口钩子',
          unit_goal: '六章内完成外门试炼前夜事件包。',
          entry_hook: '第7章以试炼倒计时开场。',
          pressure_escalation: ['执事设局', '试炼规则反噬'],
          setup_and_storyline: ['阵盘第二道裂纹埋线'],
          mini_climax_payoff: '第10章公开打脸执事。',
          exit_hook: '第12章内门长老亲自点名。',
          forbidden_advance: ['不得提前解决内门招揽条件'],
        },
      },
    }
    const okText = '试炼倒计时挂在外门广场上，执事设局逼主角签下名册。阵盘第二道裂纹一闪即灭，没人知道它代表什么。'
    const rushedText = '主角没有铺垫试炼前夜，直接在第10章公开打脸执事，并被第12章内门长老亲自点名，顺手解决内门招揽条件。'

    const okReport = buildStoryUnitSyncReport({ title: '测试' }, { id: 7, chapter_no: 7 }, contextPackage, okText)
    const rushedReport = buildStoryUnitSyncReport({ title: '测试' }, { id: 7, chapter_no: 7 }, contextPackage, rushedText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('剧情单元 OK')
    expect(okReport.delivered.map((item: any) => item.key)).toContain('entry_hook')
    expect(rushedReport.status).toBe('warn')
    expect(rushedReport.missed.map((item: any) => item.key)).toContain('entry_hook')
    expect(rushedReport.rushed_ahead.map((item: any) => item.key)).toEqual(expect.arrayContaining(['mini_climax_payoff', 'exit_hook']))
    expect(rushedReport.forbidden_touched.map((item: any) => item.text).join('｜')).toContain('内门招揽条件')
  })

  test('reads camelCase root story unit context when building the sync report', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 7,
        title: '试炼倒计时',
      },
      storyUnitContext: {
        title: '试炼前夜剧情单元',
        chapterRangeLabel: '第7-12章',
        currentChapterRole: '压力升级/推进',
        unitGoal: '六章内完成外门试炼前夜事件包。',
        pressureEscalation: ['执事设局'],
        setupAndStoryline: ['阵盘第二道裂纹埋线'],
        miniClimaxPayoff: '第10章公开打脸执事。',
        exitHook: '第12章内门长老亲自点名。',
        forbiddenAdvance: ['不得提前解决内门招揽条件'],
      },
    }
    const chapterText = '试炼倒计时挂在外门广场上，执事设局逼主角签下名册。阵盘第二道裂纹一闪即灭，没人知道它代表什么。'

    const report = buildStoryUnitSyncReport({ title: '测试' }, { id: 7, chapter_no: 7 }, contextPackage, chapterText)

    expect(report.story_unit?.title).toBe('试炼前夜剧情单元')
    expect(report.story_unit?.current_chapter_role).toBe('压力升级/推进')
    expect(report.delivered.map((item: any) => item.key)).toContain('pressure_escalation')
    expect(report.label).toBe('剧情单元 OK')
  })

  test('reads runtime camelCase chapterTarget story unit context after delivery', () => {
    const contextPackage = {
      chapterTarget: {
        chapterNo: 7,
        title: '试炼倒计时',
        storyUnitContext: {
          title: '试炼前夜剧情单元',
          chapterRangeLabel: '第7-12章',
          currentChapterRole: '压力升级/推进',
          unitGoal: '六章内完成外门试炼前夜事件包。',
          pressureEscalation: ['执事设局'],
          setupAndStoryline: ['阵盘第二道裂纹埋线'],
          miniClimaxPayoff: '第10章公开打脸执事。',
          exitHook: '第12章内门长老亲自点名。',
          forbiddenAdvance: ['不得提前解决内门招揽条件'],
        },
      },
    }
    const chapterText = '试炼倒计时挂在外门广场上，执事设局逼主角签下名册。阵盘第二道裂纹一闪即灭，没人知道它代表什么。'

    const report = buildStoryUnitSyncReport({ title: '测试' }, { id: 7, chapter_no: 7 }, contextPackage, chapterText)

    expect(report.story_unit?.title).toBe('试炼前夜剧情单元')
    expect(report.story_unit?.current_chapter_role).toBe('压力升级/推进')
    expect(report.delivered.map((item: any) => item.key)).toContain('pressure_escalation')
    expect(report.label).toBe('剧情单元 OK')
  })

  test('story state sync persists a story_unit_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).toContain('buildStoryUnitSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain("reviewType: 'story_unit_sync'")
    expect(source).toContain('payload.story_unit_sync = storyUnitSync')
  })

  test('merges layered memory context from story state deltas for future chapters', () => {
    const merged = buildMergedLayeredMemoryContext(
      {
        recent_chapter_details: ['第46章｜旧阵塔入口打开'],
        ten_chapter_summaries: ['第41-50章｜旧案线进入旧阵塔'],
        volume_overview: ['第二卷｜旧印章和残阵缺口开始合流'],
        red_lines: ['不得提前公开旧印章完整归属'],
      },
      {
        recent_chapter_details: [
          { chapter_no: 51, summary: '李玄进入第七层，确认旧影会回应半枚印纹。', state_changes: ['林青禾仍只能有限作证'] },
        ],
        ten_chapter_summaries: [
          { range: '第51-60章', core_events: '旧阵塔第七层打开，半枚印纹成为追查线索。', character_state_changes: '李玄从追查旧印转向验证旧影。' },
        ],
      },
      { chapter_no: 51 },
    )

    expect(merged.recent_chapter_details[0]).toContain('第51章')
    expect(merged.recent_chapter_details[0]).toContain('第七层')
    expect(merged.ten_chapter_summaries[0]).toContain('第51-60章')
    expect(merged.volume_overview[0]).toContain('第二卷')
    expect(merged.red_lines).toContain('不得提前公开旧印章完整归属')
    expect(merged.last_updated_chapter).toBe(51)
  })

  test('story state prompt asks for layered memory context and merge stores it in project story state', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const promptBlock = readFileSync(join(import.meta.dir, '../novel-writing/story-state-prompt.ts'), 'utf8')
    const mergeBlock = source.slice(
      source.indexOf('const mergeStoryState ='),
      source.indexOf('const updateStoryStateMachine =', source.indexOf('const mergeStoryState =')),
    )

    expect(promptBlock).toContain('layered_memory_context')
    expect(promptBlock).toContain('recent_chapter_details')
    expect(promptBlock).toContain('ten_chapter_summaries')
    expect(promptBlock).toContain('volume_overview')
    expect(mergeBlock).toContain('buildMergedLayeredMemoryContext')
    expect(mergeBlock).toContain('layered_memory_context')
  })

  test('story state prompt asks for oh-story daily progress summary and stores it for the next chapter', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const promptBlock = readFileSync(join(import.meta.dir, '../novel-writing/story-state-prompt.ts'), 'utf8')
    const normalizeBlock = source.slice(
      source.indexOf('const normalizeStoryStateDeltaForStorage ='),
      source.indexOf('const mergeStoryState =', source.indexOf('const normalizeStoryStateDeltaForStorage =')),
    )
    const mergeBlock = source.slice(
      source.indexOf('const mergeStoryState ='),
      source.indexOf('const updateStoryStateMachine =', source.indexOf('const mergeStoryState =')),
    )

    expect(promptBlock).toContain('progress_summary')
    expect(promptBlock).toContain('last_completed_chapter')
    expect(promptBlock).toContain('active_foreshadowing_count')
    expect(promptBlock).toContain('recent_changed_characters')
    expect(promptBlock).toContain('next_outline_status')
    expect(promptBlock).toContain('注意事项')
    expect(normalizeBlock).toContain('progress_summary')
    expect(normalizeBlock).toContain('progressSummary')
    expect(mergeBlock).toContain('progress_summary')
  })

  test('story state prompt asks for oh-story daily context snapshot and stores it for the next chapter', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const promptBlock = readFileSync(join(import.meta.dir, '../novel-writing/story-state-prompt.ts'), 'utf8')
    const normalizeBlock = source.slice(
      source.indexOf('const normalizeStoryStateDeltaForStorage ='),
      source.indexOf('const mergeStoryState =', source.indexOf('const normalizeStoryStateDeltaForStorage =')),
    )
    const mergeBlock = source.slice(
      source.indexOf('const mergeStoryState ='),
      source.indexOf('const updateStoryStateMachine =', source.indexOf('const mergeStoryState =')),
    )

    expect(promptBlock).toContain('daily_context_snapshot')
    expect(promptBlock).toContain('current_chapter')
    expect(promptBlock).toContain('current_scene')
    expect(promptBlock).toContain('current_emotion_target')
    expect(promptBlock).toContain('writing_changes')
    expect(promptBlock).toContain('pending_clues')
    expect(promptBlock).toContain('daily_context_snapshot 只保存追踪/上下文.md 的进度元信息')
    expect(promptBlock).toContain('不得复制详细伏笔表、时间线表或角色状态表')
    expect(normalizeBlock).toContain('daily_context_snapshot')
    expect(normalizeBlock).toContain('dailyContextSnapshot')
    expect(mergeBlock).toContain('daily_context_snapshot')
  })

  test('story state prompt uses scene-card receipts for state deltas and next chapter prep', () => {
    const promptBlock = readFileSync(join(import.meta.dir, '../novel-writing/story-state-prompt.ts'), 'utf8')

    expect(promptBlock).toContain('scene_card_receipts')
    expect(promptBlock).toContain('已验证场景回执')
    expect(promptBlock).toContain('state_delta')
    expect(promptBlock).toContain('next_chapter_priorities')
  })

  test('story state sync receives latest generated scene breakdown context', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const contextStart = source.indexOf('const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)')
    const prepareStart = source.indexOf('preparedStoryStateUpdate = await prepareStoryStateUpdate(', contextStart)
    const acceptanceStart = source.indexOf('acceptance = await commitNovelChapterAcceptance(', prepareStart)
    const prepareBlock = source.slice(prepareStart, acceptanceStart)

    expect(contextStart).toBeGreaterThanOrEqual(0)
    expect(prepareStart).toBeGreaterThan(contextStart)
    expect(acceptanceStart).toBeGreaterThan(prepareStart)
    expect(prepareBlock).toContain('finalReviewContextPackage,')
    expect(prepareBlock).toContain('{ ...chapter, chapter_text: finalText }')
  })

  test('prose generation stores oh-story delivery receipts in every chapter store branch', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const storagePatchSource = readChapterProseStoragePatchSource()
    const generationBlock = source.slice(
      source.indexOf('const draftResult = await generateNovelChapterProse'),
      source.indexOf('const storyStateUpdate = await updateStoryStateMachine', source.indexOf('const draftResult = await generateNovelChapterProse')),
    )

    expect(generationBlock).toContain('let ohStoryDeliveryReceipts = normalizeStoredOhStoryDeliveryReceipts')
    expect(generationBlock.match(/buildChapterProseStoragePatch\(/g)?.length || 0).toBeGreaterThanOrEqual(2)
    expect(generationBlock.match(/ohStoryDeliveryReceipts,/g)?.length || 0).toBeGreaterThanOrEqual(2)
    expect(storagePatchSource).toContain('oh_story_delivery_receipts: input.ohStoryDeliveryReceipts')
    expect(storagePatchSource).toContain('chapter_blueprint: receipts?.chapter_blueprint')
    expect(storagePatchSource).toContain('scene_card_receipts: receipts?.scene_card_receipts')
    expect(storagePatchSource).toContain('delivery_risk_receipts: receipts?.delivery_risk_receipts')
    expect(storagePatchSource).toContain('revision_receipts: receipts?.revision_receipts')
  })

  test('prose generation stores post-draft oh-story director after delivery receipts and quality review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const storagePatchSource = readChapterProseStoragePatchSource()
    const postReviewStart = source.indexOf('const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)')
    const acceptanceStart = source.indexOf('acceptance = await commitNovelChapterAcceptance(', postReviewStart)
    const acceptanceEnd = source.indexOf('const updated = acceptance.chapter', acceptanceStart)
    const fullProductionPrepareStart = source.indexOf("await onStage('story_state', { status: 'running', phase: 'prepare' })", postReviewStart)
    const postReviewBlock = source.slice(postReviewStart, acceptanceStart)
    const fullProductionPreAcceptanceBlock = source.slice(fullProductionPrepareStart, acceptanceStart)
    const acceptanceBlock = source.slice(acceptanceStart, acceptanceEnd)

    expect(source).toContain('buildOhStoryDirectorForPostDraft')
    expect(postReviewBlock).toContain('const postDraftDirector = buildOhStoryDirectorForPostDraft')
    expect(postReviewBlock.indexOf('const postDraftDirector = buildOhStoryDirectorForPostDraft')).toBeGreaterThan(postReviewBlock.indexOf('const postDeliveryReceiptChecks = ['))
    expect(postReviewBlock).toContain('story_power_sync: qualityGateReview?.story_power_sync || qualityGateReview?.storyPowerSync || selfCheck?.review?.story_power_sync || selfCheck?.review?.storyPowerSync')
    expect(postReviewBlock).toContain('delivery_risk_receipt_sync: preStoreDeliveryRiskReceiptSync')
    expect(postReviewBlock).toContain('deslop_gate_diagnostics: qualityGateReview?.deslop_gate_diagnostics || qualityGateReview?.deslopGateDiagnostics || selfCheck?.review?.deslop_gate_diagnostics || selfCheck?.review?.deslopGateDiagnostics')
    expect(postReviewBlock).toContain('const postDraftDirectorPayload = {')
    expect(postReviewBlock).toContain('oh_story_delivery_receipts: ohStoryDeliveryReceipts')
    expect(postReviewBlock).toContain('oh_story_director: postDraftDirector')
    expect(postReviewBlock).toContain('ohStoryDirector: postDraftDirector')
    expect(storagePatchSource).toContain('rawPayload.oh_story_director = input.postDraftDirector')
    expect(storagePatchSource).toContain('rawPayload.ohStoryDirector = input.postDraftDirector')
    expect(postReviewBlock).toContain('postDraftDirectorPayload,')
    expect(acceptanceBlock).toContain('chapter_patch: chapterPatch')
    expect(acceptanceBlock).toContain('...pendingGeneratedReviews')
    expect(acceptanceBlock).toContain("buildProseQualityReview(precommitAdmission.status === 'accepted' ? 'ok' : 'warn'")
    expect(acceptanceBlock).toContain('settingConsistencyReview,')
    expect(acceptanceBlock.indexOf('...pendingGeneratedReviews')).toBeLessThan(acceptanceBlock.indexOf('buildProseQualityReview('))
    expect(acceptanceBlock.indexOf('buildProseQualityReview(')).toBeLessThan(acceptanceBlock.indexOf('settingConsistencyReview,'))
    expect(fullProductionPrepareStart).toBeGreaterThan(postReviewStart)
    expect(fullProductionPreAcceptanceBlock).not.toContain('await createNovelReview(activeWorkspace')
  })

  test('prose generation preserves pre-draft execution receipts for write-preparation diagnostics', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const carryOverSource = readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/delivery-risk-carry-over.ts'), 'utf8')
    const storagePatchSource = readChapterProseStoragePatchSource()
    const normalizeBlock = carryOverSource.slice(
      carryOverSource.indexOf('export function normalizeStoredOhStoryDeliveryReceipts'),
      carryOverSource.indexOf('\nexport function', carryOverSource.indexOf('export function normalizeStoredOhStoryDeliveryReceipts') + 1),
    )
    const generationBlock = source.slice(
      source.indexOf('const draftResult = await generateNovelChapterProse'),
      source.indexOf('const storyStateUpdate = await updateStoryStateMachine', source.indexOf('const draftResult = await generateNovelChapterProse')),
    )

    expect(normalizeBlock).toContain('pre_draft_execution_receipts')
    expect(normalizeBlock).toContain('preDraftExecutionReceipts')
    expect(storagePatchSource).toContain('pre_draft_execution_receipts: receipts?.pre_draft_execution_receipts')
    expect(generationBlock).toContain('resultPayload?.pre_draft_execution_receipts')
    expect(generationBlock).toContain('targetProse?.pre_draft_execution_receipts')
    expect(generationBlock).toContain('revisionDeliveryReceipts?.pre_draft_execution_receipts')
  })

  test('prose generation refreshes stored oh-story receipts from the final reviewed draft before storage', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const generationBlock = source.slice(
      source.indexOf('const draftResult = await generateNovelChapterProse'),
      source.indexOf('const storyStateUpdate = await updateStoryStateMachine', source.indexOf('const draftResult = await generateNovelChapterProse')),
    )
    const finalReceiptBlock = generationBlock.slice(
      generationBlock.indexOf('const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)'),
      generationBlock.indexOf("if (isDraftOnly || isDraftReviewOnly)", generationBlock.indexOf('const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)')),
    )

    expect(generationBlock).toContain('let ohStoryDeliveryReceipts = normalizeStoredOhStoryDeliveryReceipts')
    expect(finalReceiptBlock).toContain('ohStoryDeliveryReceipts = normalizeStoredOhStoryDeliveryReceipts')
    expect(finalReceiptBlock).toContain('finalSceneBreakdown')
    expect(finalReceiptBlock).toContain('selfCheck?.review')
    expect(finalReceiptBlock).toContain('normalizeDeliveryRiskReceipts(selfCheck?.review || {}, finalReviewContextPackage, finalText)')
    expect(finalReceiptBlock).toContain('selfCheck?.revision')
  })

  test('prose generation refreshes stored oh-story receipts from nested revision delivery receipts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const generationBlock = source.slice(
      source.indexOf('const draftResult = await generateNovelChapterProse'),
      source.indexOf('const storyStateUpdate = await updateStoryStateMachine', source.indexOf('const draftResult = await generateNovelChapterProse')),
    )
    const finalReceiptBlock = generationBlock.slice(
      generationBlock.indexOf('const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)'),
      generationBlock.indexOf("if (isDraftOnly || isDraftReviewOnly)", generationBlock.indexOf('const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)')),
    )

    expect(finalReceiptBlock).toContain('const revisionDeliveryReceipts = selfCheck?.revision?.oh_story_delivery_receipts')
    expect(finalReceiptBlock).toContain('revisionDeliveryReceipts?.scene_card_receipts')
    expect(finalReceiptBlock).toContain('revisionDeliveryReceipts?.delivery_risk_receipts')
    expect(finalReceiptBlock).toContain('revisionDeliveryReceipts?.revision_receipts')
  })

  test('prose generation preserves nested deslop and quality repair receipts in stored oh-story receipts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const generationBlock = source.slice(
      source.indexOf('const draftResult = await generateNovelChapterProse'),
      source.indexOf('const storyStateUpdate = await updateStoryStateMachine', source.indexOf('const draftResult = await generateNovelChapterProse')),
    )
    const finalReceiptBlock = generationBlock.slice(
      generationBlock.indexOf('const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)'),
      generationBlock.indexOf("if (isDraftOnly || isDraftReviewOnly)", generationBlock.indexOf('const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)')),
    )

    expect(finalReceiptBlock).toContain('deslop_repair_receipts')
    expect(finalReceiptBlock).toContain('revisionDeliveryReceipts?.deslop_repair_receipts')
    expect(finalReceiptBlock).toContain('quality_audit_repair_receipts')
    expect(finalReceiptBlock).toContain('revisionDeliveryReceipts?.quality_audit_repair_receipts')
  })

  test('prose generation deduplicates final delivery risk receipts before storage', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const generationBlock = source.slice(
      source.indexOf('const draftResult = await generateNovelChapterProse'),
      source.indexOf('const storyStateUpdate = await updateStoryStateMachine', source.indexOf('const draftResult = await generateNovelChapterProse')),
    )
    const finalReceiptBlock = generationBlock.slice(
      generationBlock.indexOf('const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)'),
      generationBlock.indexOf("if (isDraftOnly || isDraftReviewOnly)", generationBlock.indexOf('const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)')),
    )

    const deliveryRiskCoreSource = readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/delivery-risk-core.ts'), 'utf8')
    expect(deliveryRiskCoreSource).toContain('export function uniqueDeliveryRiskReceipts')
    expect(finalReceiptBlock).toContain('delivery_risk_receipts: uniqueDeliveryRiskReceipts([')
  })

  test('prose generation prefers nested revision scene-card receipts over stale final scene breakdown receipts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const generationBlock = source.slice(
      source.indexOf('const draftResult = await generateNovelChapterProse'),
      source.indexOf('const storyStateUpdate = await updateStoryStateMachine', source.indexOf('const draftResult = await generateNovelChapterProse')),
    )
    const finalReceiptBlock = generationBlock.slice(
      generationBlock.indexOf('const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)'),
      generationBlock.indexOf("if (isDraftOnly || isDraftReviewOnly)", generationBlock.indexOf('const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)')),
    )

    const sceneReceiptMergeBlock = finalReceiptBlock.slice(
      finalReceiptBlock.indexOf('scene_card_receipts: ['),
      finalReceiptBlock.indexOf('delivery_risk_receipts:', finalReceiptBlock.indexOf('scene_card_receipts: [')),
    )

    expect(sceneReceiptMergeBlock.indexOf('revisionDeliveryReceipts?.scene_card_receipts')).toBeLessThan(sceneReceiptMergeBlock.indexOf('finalSceneBreakdown'))
  })

  test('prose generation prefers nested revision scene-card receipts over stale draft delivery receipts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const generationBlock = source.slice(
      source.indexOf('const draftResult = await generateNovelChapterProse'),
      source.indexOf('const storyStateUpdate = await updateStoryStateMachine', source.indexOf('const draftResult = await generateNovelChapterProse')),
    )
    const finalReceiptBlock = generationBlock.slice(
      generationBlock.indexOf('const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)'),
      generationBlock.indexOf("if (isDraftOnly || isDraftReviewOnly)", generationBlock.indexOf('const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)')),
    )
    const sceneReceiptMergeBlock = finalReceiptBlock.slice(
      finalReceiptBlock.indexOf('scene_card_receipts: ['),
      finalReceiptBlock.indexOf('delivery_risk_receipts:', finalReceiptBlock.indexOf('scene_card_receipts: [')),
    )

    expect(sceneReceiptMergeBlock.indexOf('revisionDeliveryReceipts?.scene_card_receipts')).toBeLessThan(sceneReceiptMergeBlock.indexOf('ohStoryDeliveryReceipts?.scene_card_receipts'))
  })

  test('prose generation prefers nested revision receipts over stale draft delivery receipts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const generationBlock = source.slice(
      source.indexOf('const draftResult = await generateNovelChapterProse'),
      source.indexOf('const storyStateUpdate = await updateStoryStateMachine', source.indexOf('const draftResult = await generateNovelChapterProse')),
    )
    const finalReceiptBlock = generationBlock.slice(
      generationBlock.indexOf('const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)'),
      generationBlock.indexOf("if (isDraftOnly || isDraftReviewOnly)", generationBlock.indexOf('const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)')),
    )
    const revisionReceiptMergeBlock = finalReceiptBlock.slice(
      finalReceiptBlock.indexOf('revision_receipts: ['),
      finalReceiptBlock.indexOf('],', finalReceiptBlock.indexOf('revision_receipts: [')),
    )

    expect(revisionReceiptMergeBlock.indexOf('revisionDeliveryReceipts?.revision_receipts')).toBeLessThan(revisionReceiptMergeBlock.indexOf('ohStoryDeliveryReceipts?.revision_receipts'))
  })
})

// storyline sync backfill moved to novel-writing-service.storyline-sync.test.ts

describe('chapter handoff sync report', () => {
  test('checks safe batch chapter handoff delivery after chapter text is written', () => {
    const project = { title: '超人的规则怪谈世界' }
    const chapter = { id: 21, chapter_no: 21, title: '门外暗号' }
    const contextPackage = {
      batch_preflight: {
        chapter_handoff_contract: {
          source: 'safe_batch_chapter_handoff_contract',
          previous_handoff: '上一章最后一幕：湿漉漉学生敲响玻璃门，林晓警告不能开门。',
          opening_obligations: ['开篇前300字必须接住敲门、湿漉漉学生和不能开门的警告。'],
          expectation_carry_over: ['读者期待知道门外学生是不是规则诱饵。'],
          must_deliver: ['确认门外学生用暗号诱导开门。'],
          keep_alive: ['广播是谁发出的仍要保持存在感。'],
          overdue: ['上一章未处理的玻璃门水痕必须优先推进。'],
        },
      },
    }
    const handoffText = [
      '湿漉漉学生还在敲玻璃门，林晓压低声音说不能开门。',
      '开篇前几步，李超没有转场，而是盯住门缝下那道玻璃门水痕。',
      '张智确认门外学生用暗号诱导开门，诱饵规则第一次露出形状。',
      '广播是谁发出的仍没有答案，只在天花板里短促响了一声。',
      '他们先推进上一章未处理的玻璃门水痕，再决定是否回应暗号。',
    ].join('\n')
    const driftText = [
      '第二天清晨，三人来到食堂吃饭。',
      '他们没有处理上一章敲门，也没有接住湿漉漉学生。',
      '门外学生是不是诱饵暂时不重要，广播是谁发出的也被忘在一边。',
      '新剧情直接开始。',
    ].join('\n')

    const okReport = buildChapterHandoffSyncReport(project, chapter, contextPackage, handoffText)
    const warnReport = buildChapterHandoffSyncReport(project, chapter, contextPackage, driftText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('章首承接 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['上一章最后一幕', '开篇义务', '必兑现项', '保活项', '逾期待办']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('章首承接缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['上一章最后一幕', '开篇义务', '必兑现项', '逾期待办', '章首承接硬伤']))
    expect(warnReport.next_actions.join('；')).toMatch(/开篇|上一章|期待债/)
  })

  test('checks pre-draft camelCase chapter handoff contract after chapter text is written', () => {
    const project = { title: '超人的规则怪谈世界' }
    const chapter = { id: 22, chapter_no: 22, title: '门外暗号' }
    const contextPackage = {
      pre_draft_brief: {
        chapterHandoffContract: {
          source: 'pre_draft_brief',
          previousHandoff: '上一章最后一幕：湿漉漉学生敲响玻璃门，林晓警告不能开门。',
          openingObligations: ['开篇前300字必须接住敲门、湿漉漉学生和不能开门的警告。'],
          mustDeliver: ['确认门外学生用暗号诱导开门。'],
        },
      },
    }
    const chapterText = [
      '湿漉漉学生还在敲玻璃门，林晓压低声音说不能开门。',
      '开篇前几步，李超没有转场，而是盯住门缝下那道水痕。',
      '张智确认门外学生用暗号诱导开门，诱饵规则第一次露出形状。',
    ].join('\n')

    const report = buildChapterHandoffSyncReport(project, chapter, contextPackage, chapterText)

    expect(report.label).not.toBe('章首承接未配置')
    expect(report.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['上一章最后一幕', '开篇义务', '必兑现项']))
  })

  test('checks runtime camelCase chapterTarget handoff contract after chapter text is written', () => {
    const project = { title: '超人的规则怪谈世界' }
    const chapter = { id: 24, chapter_no: 24, title: '旧广播室' }
    const contextPackage = {
      chapterTarget: {
        chapterHandoffContract: {
          source: 'runtime_chapter_target',
          previousHandoff: '上一章最后一幕：禁库门牌背面响起旧广播室的铃声。',
          openingObligations: ['开篇前300字必须接住禁库门牌和旧广播室铃声。'],
          mustDeliver: ['确认旧广播室铃声不是普通设备，而是规则召唤。'],
        },
      },
    }
    const chapterText = [
      '禁库门牌还攥在李超手里，背面的旧广播室铃声隔着铜片震了一下。',
      '开篇前几步，他没有换场，而是先确认禁库门牌上的裂纹和铃声方向。',
      '张智低声确认旧广播室铃声不是普通设备，而是规则召唤。',
    ].join('\n')

    const report = buildChapterHandoffSyncReport(project, chapter, contextPackage, chapterText)

    expect(report.label).not.toBe('章首承接未配置')
    expect(report.source).toBe('runtime_chapter_target')
    expect(report.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['上一章最后一幕', '开篇义务', '必兑现项']))
  })

  test('reads raw camelCase chapter handoff contract after chapter text is written', () => {
    const project = { title: '超人的规则怪谈世界' }
    const chapter = {
      id: 23,
      chapter_no: 23,
      title: '水痕暗号',
      raw_payload: {
        preDraftBrief: {
          chapterHandoffContract: {
            source: 'raw_pre_draft_brief',
            previousHandoff: '上一章最后一幕：水痕在玻璃门内侧倒流。',
            openingObligations: ['开篇前300字必须接住玻璃门内侧倒流水痕。'],
            mustDeliver: ['确认水痕暗号指向旧广播室。'],
          },
        },
      },
    }
    const report = buildChapterHandoffSyncReport(
      project,
      chapter,
      {},
      '水痕在玻璃门内侧倒流，李超没有转场，先按住门框确认玻璃门内侧倒流水痕。张智确认水痕暗号指向旧广播室。',
    )

    expect(report.label).not.toBe('章首承接未配置')
    expect(report.source).toBe('raw_pre_draft_brief')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['上一章最后一幕', '开篇义务', '必兑现项']))
  })

  test('story state sync persists a chapter_handoff_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).toContain("reviewType: 'chapter_handoff_sync'")
    expect(source).toContain('buildChapterHandoffSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.chapter_handoff_sync = chapterHandoffSync')
  })
})

describe('chapter core drift report', () => {
  test('scores a chapter against reader promise, goal, conflict and ending hook', () => {
    const report = buildChapterCoreDriftReport(
      {
        title: '万古长夜',
        summary: '寒门少年以阵法反压宗门秩序',
        reference_config: {
          writing_bible: {
            reader_promise: '寒门少年以阵法反压宗门秩序',
          },
        },
      },
      { id: 8, chapter_no: 8, title: '试炼前夜' },
      {
        chapter_target: {
          chapter_goal: '主角拿到试炼资格',
          reader_promise: '寒门少年以阵法反压宗门秩序',
          core_conflict: '执事设局阻拦主角参加试炼',
          ending_hook: '阵盘亮起第二道裂纹',
          forbidden_content: ['提前揭示掌门身份'],
        },
      },
      [
        '执事在试炼名单前设局阻拦，逼寒门少年交出阵盘。',
        '主角用阵法反压宗门秩序，当场拿到试炼资格。',
        '夜色落下时，阵盘亮起第二道裂纹。',
      ].join('\n'),
      { missed: [], forbidden_touched: [] },
    )

    expect(report.status).toBe('ok')
    expect(report.score).toBeGreaterThanOrEqual(80)
    expect(report.checks.find(item => item.key === 'chapter_goal')?.status).toBe('ok')
    expect(report.drift_risks).toHaveLength(0)
  })

  test('warns when a chapter misses the promised conflict or touches forbidden content', () => {
    const report = buildChapterCoreDriftReport(
      {
        title: '万古长夜',
        summary: '寒门少年以阵法反压宗门秩序',
        reference_config: {
          writing_bible: {
            reader_promise: '寒门少年以阵法反压宗门秩序',
          },
        },
      },
      { id: 9, chapter_no: 9, title: '偏离测试' },
      {
        chapter_target: {
          chapter_goal: '主角拿到试炼资格',
          core_conflict: '执事设局阻拦主角参加试炼',
          ending_hook: '阵盘亮起第二道裂纹',
          forbidden_content: ['提前揭示掌门身份'],
        },
      },
      '众人聊天许久，提前揭示掌门身份，却没有试炼资格、执事阻拦或阵盘裂纹。',
      {
        missed: [{ name: '宗门试炼主线' }],
        forbidden_touched: [{ name: '掌门身份伏笔' }],
      },
    )

    expect(report.status).toBe('warn')
    expect(report.score).toBeLessThan(80)
    expect(report.drift_risks).toEqual(expect.arrayContaining([
      expect.stringContaining('禁写内容'),
      expect.stringContaining('剧情线漏推'),
    ]))
    expect(report.checks.find(item => item.key === 'forbidden_content')?.status).toBe('warn')
  })

  test('reads raw camelCase preDraftBrief anchors for chapter core drift report', () => {
    const report = buildChapterCoreDriftReport(
      { title: '血缘系统：三位隐藏妈妈' },
      {
        id: 10,
        chapter_no: 1,
        title: '旧楼铃声',
        raw_payload: {
          preDraftBrief: {
            readerPromise: '血缘系统第一次检测揭开三位妈妈身份反转。',
            chapterGoal: '主角完成第一次血缘系统检测。',
            coreConflict: '旧楼规则阻止主角确认真假妈妈身份。',
            endingHook: '第三位妈妈留下没有照片的出生证明。',
          },
        },
      },
      {},
      [
        '李岚推开旧楼的门，走廊里只有一盏坏掉的灯。',
        '广播重复着陌生的校规，所有人必须在十点前回到房间。',
        '他握紧手里的裁员信，知道今晚不能再出错。',
      ].join('\n'),
      { missed: [], forbidden_touched: [] },
    )

    expect(report.anchors.reader_promise).toContain('血缘系统')
    expect(report.anchors.core_conflict).toContain('真假妈妈')
    expect(report.checks.find(item => item.key === 'reader_promise')?.expected).toContain('三位妈妈')
    expect(report.checks.find(item => item.key === 'core_conflict')?.risk).toBe('核心冲突未充分落地')
  })

  test('reads raw camelCase preDraftBrief expectation lines for chapter core drift report', () => {
    const report = buildChapterCoreDriftReport(
      { title: '超人的规则怪谈世界' },
      {
        id: 11,
        chapter_no: 2,
        title: '门外判定',
        raw_payload: {
          preDraftBrief: {
            readerExpectationLedger: {
              mustDeliver: [{ text: '用信息差破解门外学生规则' }],
              keepAlive: [{ text: '广播是谁发出的' }],
            },
            targetReaderContract: {
              readerDesires: ['规则反制爽点'],
              chapterAttractions: ['超人蛮力被规则反制'],
            },
            genrePositioningContract: {
              coreHookRules: ['每章用信息差破解一条规则'],
              microInnovationRules: ['门外学生用暗号反向诱导'],
              mustHaveScenes: ['规则判定压住蛮力'],
            },
          },
        },
      },
      {},
      [
        '李超离开校园，开始经营一片灵田。',
        '他每天浇水、收菜、卖货，大家都说生活越来越安稳。',
      ].join('\n'),
      { missed: [], forbidden_touched: [] },
    )

    expect(report.checks.find(item => item.key === 'plot_expectation_line')?.expected).toContain('广播是谁发出的')
    expect(report.checks.find(item => item.key === 'theme_payoff_line')?.expected).toContain('超人蛮力被规则反制')
    expect(report.checks.find(item => item.key === 'freshness_stimulus_line')?.expected).toContain('门外学生用暗号反向诱导')
    expect(report.drift_risks).toEqual(expect.arrayContaining([
      '剧情期待未充分落地',
      '主题甜头未充分落地',
      '新鲜刺激未充分落地',
    ]))
  })

  test('checks oh-story plot theme and freshness expectation lines in core drift report', () => {
    const report = buildChapterCoreDriftReport(
      {
        title: '超人的规则怪谈世界',
        synopsis: '超人蛮力被规则限制，必须和理性搭档一起破局。',
        reference_config: {
          writing_bible: {
            commercial_positioning: {
              selling_points: ['超人蛮力被规则反制', '每章用信息差破解一条规则'],
            },
          },
        },
      },
      { id: 16, chapter_no: 16, title: '门外判定' },
      {
        chapter_target: {
          chapter_goal: '用信息差破解门外学生规则',
          reader_promise: '超人蛮力被规则限制，必须和理性搭档一起破局。',
          core_conflict: '救门外学生会违规，不救又会错过证人线索。',
          ending_hook: '门外学生报出搭档才知道的暗号。',
          reader_expectation_ledger: {
            must_deliver: [{ text: '用信息差破解门外学生规则' }],
            keep_alive: [{ text: '广播是谁发出的' }],
          },
          target_reader_contract: {
            reader_desires: ['规则反制爽点'],
            chapter_attractions: ['超人蛮力被规则反制'],
          },
          genre_positioning_contract: {
            core_hook_rules: ['每章用信息差破解一条规则'],
            micro_innovation_rules: ['门外学生用暗号反向诱导'],
          },
        },
      },
      [
        '李超没有再撞门，超人蛮力被规则限制，理性搭档张智把违规条件写在玻璃上。',
        '救门外学生会违规，不救又会错过证人线索，他们只能用信息差破解门外学生规则。',
        '张智把暗号顺序写在玻璃上，超人蛮力被规则反制这个爽点终于落地。',
        '广播仍然没有说明是谁发出的。',
        '门外学生忽然报出搭档才知道的暗号，像是反向诱导他们开门。',
      ].join('\n'),
      { missed: [], forbidden_touched: [] },
    )

    expect(report.status).toBe('ok')
    expect(report.checks.find(item => item.key === 'plot_expectation_line')?.status).toBe('ok')
    expect(report.checks.find(item => item.key === 'theme_payoff_line')?.status).toBe('ok')
    expect(report.checks.find(item => item.key === 'freshness_stimulus_line')?.status).toBe('ok')
  })

  test('warns when oh-story expectation lines drift away from the chapter prose', () => {
    const report = buildChapterCoreDriftReport(
      {
        title: '超人的规则怪谈世界',
        synopsis: '超人蛮力被规则限制，必须和理性搭档一起破局。',
        reference_config: {
          writing_bible: {
            commercial_positioning: {
              selling_points: ['超人蛮力被规则反制', '每章用信息差破解一条规则'],
            },
          },
        },
      },
      { id: 17, chapter_no: 17, title: '偏移测试' },
      {
        chapter_target: {
          chapter_goal: '用信息差破解门外学生规则',
          reader_promise: '超人蛮力被规则限制，必须和理性搭档一起破局。',
          core_conflict: '救门外学生会违规，不救又会错过证人线索。',
          ending_hook: '门外学生报出搭档才知道的暗号。',
          reader_expectation_ledger: {
            must_deliver: [{ text: '用信息差破解门外学生规则' }],
          },
          target_reader_contract: {
            reader_desires: ['规则反制爽点'],
            chapter_attractions: ['超人蛮力被规则反制'],
          },
          genre_positioning_contract: {
            core_hook_rules: ['每章用信息差破解一条规则'],
            micro_innovation_rules: ['门外学生用暗号反向诱导'],
          },
        },
      },
      '三人在宿舍里做饭聊天，林晓讲了很多旧事，大家决定明天再去门口看看。',
      { missed: [], forbidden_touched: [] },
    )

    expect(report.status).toBe('warn')
    expect(report.drift_risks).toEqual(expect.arrayContaining([
      expect.stringContaining('剧情期待'),
      expect.stringContaining('主题甜头'),
      expect.stringContaining('新鲜刺激'),
    ]))
  })

  test('story state sync persists a chapter_core_drift review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).toContain("reviewType: 'chapter_core_drift'")
    expect(source).toContain('buildChapterCoreDriftReport(project, chapter, contextPackage, chapterText, storylineSync)')
    expect(source).toContain('payload.core_drift = coreDrift')
  })

  test('checks core contract radar delivery after chapter text is written', () => {
    const project = { title: '超人的规则怪谈世界' }
    const chapter = { id: 18, chapter_no: 18, title: '玻璃暗号' }
    const contextPackage = {
      chapter_target: {
        core_contract_radar: {
          summary: '本章必须服务超人蛮力被规则反制，并推进广播来源调查。',
          must_serve: [
            '超人蛮力被规则反制',
            '用信息差破解门外学生规则',
            '广播来源调查推进到玻璃暗号',
          ],
          no_drift: [
            '不能把规则怪谈写成纯打怪',
            '不能让主角靠蛮力无代价通关',
          ],
          theme_unity_rules: [
            '一本书从头到尾要有统一的核心情绪：力量被规则反制后的紧张与破局爽。',
            '小情绪服从大情绪；随机翻开一章，情绪必须指向全书核心。',
          ],
          repair_focus: [
            '补足规则判定反制蛮力',
            '章末必须留下广播来源的新问题',
          ],
          selling_point_execution_rules: [
            '卖点四步法：整本书卖点、书名卖点、简介卖点、每段剧情卖点都要能对齐。',
            '卖点表达必须发现比告知爽十倍，用剧情/对话/反应隐性展示，并按开头暗示 -> 中间深化 -> 高潮爆发递进。',
            '每章一句话概括内容并标注目的词，盯紧章纲目的来写。',
          ],
          repetition_strategy_rules: [
            '同一卖点至少延展 3 个角度，用正写、反套路、持续反、反了再正等方式换壳换场景换人物。',
            '当核心看点在当前样本/读者反馈中稳定时保持重复策略；反馈下降时升级重复方式，避免爽点重复导致审美疲劳。',
          ],
          commercial_rhythm_rules: [
            '写前读取追踪/上下文.md 与最近 3 章摘要；连续 2 章没有目标推进、阻碍升级或新信息时，下一章提高冲突密度。',
            '连续 2 章只爆点不留反应余波时，插入 1-2 个承接场景，但必须推进关系/伏笔。',
            '大高潮 7-10 天完成，小高潮约 3 天，高潮后 1-2 章过渡。',
          ],
          goldfinger_structure_rules: [
            '金手指可替换故事流程中的任一环节：建立目标、克服困难、准备环节、激励事件或收获奖励。',
            '金手指简单是核心，一眼就懂；系统限制必须保证主角一步步行动。',
            '给出金手指后必须有即时变化，并契合主角当前职业或打开困境。',
          ],
          launch_pressure_rules: [
            '开篇 300-500字内交代处境、危险来源和破局希望。',
            '优先用环境型压力开局，主角一开始不能完美，形成否极泰来的起点。',
          ],
          checks: [
            { key: 'reader_promise', label: '读者承诺', status: 'warn', reason: '规则反制必须可见。' },
          ],
        },
      },
    }
    const alignedText = [
      '超人蛮力被规则反制，他撞门越重，门缝里的广播判定越冷。',
      '张智没有让他继续砸门，而是用信息差破解门外学生规则，把暗号顺序写在玻璃上。',
      '玻璃暗号让广播来源调查第一次推进，声音来自废弃广播室。',
      '他没有靠蛮力无代价通关，手臂被规则反噬得发麻。',
      '本章的小情绪是门外紧张验证，但仍然指向全书核心情绪：力量被规则反制后的破局爽。',
      '卖点四步法在本章落地：整本书卖点是规则反制，书名卖点是玻璃暗号，简介卖点是超人蛮力遇上规则，段落卖点靠剧情、对话和反应隐性展示。',
      '开头暗示玻璃暗号，中间深化广播来源，高潮爆发在规则反噬现场，读者是自己发现卖点，不是被告知本章很爽。',
      '同一卖点至少延展 3 个角度：正写规则判定、反套路限制蛮力、持续反让广播每次误导主角，换壳换场景换人物但内核一致，并避免审美疲劳。',
      '写前读取追踪/上下文.md 和最近3章摘要后确认没有拖沓，本章有目标推进、阻碍升级和新信息；冲突密度按每500字一个转折点提高。',
      '本章不是连续爆点无余波，受伤反应推进双主角关系；大高潮仍控制在7-10天内，小高潮约3天，高潮后预留1-2章过渡。',
      '金手指可替换故事流程中的克服困难环节，但系统限制保证主角一步步行动；规则识别一眼就懂，给出后立刻出现即时变化，并契合设备师职业打开困境。',
      '开篇300-500字内交代处境、危险来源和破局希望，用环境型压力让主角先不完美，再形成否极泰来的起点。',
      '章末新的问题留下：废弃广播室里是谁提前录好了他的名字？',
    ].join('\n')
    const driftText = [
      '本章完全偏离核心契约。',
      '众人把规则怪谈写成纯打怪，主角靠蛮力无代价通关。',
      '广播来源没有推进，大家聊天后回宿舍休息。',
      '作者直接告诉读者这是核心卖点、本章很爽，但没有通过剧情、对话或反应让读者自己发现。',
      '爽点重复到读者审美疲劳，核心看点抓不住，临时换看点。',
      '连续2章没有目标推进、阻碍升级或新信息，连续2章只爆点不留反应余波，段落像流水账。',
      '金手指成了说明书式万能外挂，太强所以无聊，一键清场且和职业无关。',
      '开篇主角完美无缺，先铺背景和大段世界观，没有危险来源，也没有破局希望。',
    ].join('\n')

    const okReport = buildCoreContractSyncReport(project, chapter, contextPackage, alignedText)
    const warnReport = buildCoreContractSyncReport(project, chapter, contextPackage, driftText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('核心契约 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining([
      '必须服务',
      '不得漂移',
      '主题统一',
      '修复焦点',
      '卖点执行',
      '重复策略',
      '商业节奏',
      '金手指结构',
      '开篇压力',
    ]))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('核心契约缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining([
      '必须服务',
      '不得漂移',
      '主题统一',
      '卖点执行',
      '重复策略',
      '商业节奏',
      '金手指结构',
      '开篇压力',
      '核心契约硬伤',
    ]))
    expect(warnReport.missed.map((item: any) => item.key)).toContain('theme_unity_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('selling_point_execution_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('commercial_rhythm_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('goldfinger_structure_rules')
    expect(warnReport.next_actions.join('；')).toMatch(/核心承诺|不得漂移|章末/)
    expect(warnReport.next_actions.join('；')).toContain('全书核心情绪')
    expect(warnReport.next_actions.join('；')).toContain('卖点四步法')
    expect(warnReport.next_actions.join('；')).toContain('最近3章')
    expect(warnReport.next_actions.join('；')).toContain('金手指')
  })

  test('checks ten-chapter core selling point drift after chapter text is written', () => {
    const project = { title: '超人的规则怪谈世界' }
    const chapter = { id: 10, chapter_no: 10, title: '第十条规则' }
    const contextPackage = {
      chapter_target: {
        core_contract_radar: {
          summary: '第十章复核最初吸引读者的卖点是否还在。',
          must_serve: ['超人力量和规则判定持续碰撞。'],
          no_drift: ['不能把规则怪谈写成纯打怪'],
          periodic_drift_check: {
            cadence: '每10章',
            due: true,
            question: '当初吸引读者的卖点还在吗？',
            selling_points: ['超人能力被规则空间反制。', '力量反制规则'],
          },
        },
      },
    }
    const alignedText = [
      '第十条规则降临时，李超的超人力量刚砸碎铁门，规则判定却立刻反制，把他的拳风折回地面。',
      '这一次不是纯打怪，而是力量和规则空间继续碰撞，张智趁反制间隙找到新限制。',
    ].join('\n')
    const driftText = [
      '李超离开校园，开始经营一片灵田。',
      '他每天浇水、收菜、卖货，大家都说生活越来越安稳。',
    ].join('\n')

    const okReport = buildCoreContractSyncReport(project, chapter, contextPackage, alignedText)
    const warnReport = buildCoreContractSyncReport(project, chapter, contextPackage, driftText)

    expect(okReport.delivered.map((item: any) => item.label)).toContain('十章卖点复核')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('ten_chapter_selling_point')
    expect(warnReport.priority_repair).toBe('优先补核心卖点')
    expect(warnReport.next_actions.join('；')).toContain('当初吸引读者的卖点')
  })

  test('warns when a non-finale chapter resolves the core conflict without a new risk', () => {
    const project = { title: '万古长夜' }
    const chapter = { id: 19, chapter_no: 16, title: '阵盘反压' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 16,
        core_conflict: '寒门少年以阵法反压宗门秩序',
        story_unit_context: { current_chapter_role: '压力升级/推进，不是终局收束' },
        core_contract_radar: {
          must_serve: ['寒门少年以阵法反压宗门秩序'],
          no_drift: ['非大结局章节禁止解决核心冲突'],
          repair_focus: ['局部胜利必须伴随新的代价或风险'],
          checks: [{ key: 'core_conflict_rhythm_protection', label: '核心冲突节奏保护' }],
        },
      },
    }
    const prematureText = [
      '沈砚用阵法当场反压宗门秩序。',
      '幕后黑手全部伏法，寒门少年面对的核心矛盾已经彻底解决。',
      '从此再无威胁，宗门也不会再压迫任何人。',
    ].join('\n')
    const riskText = [
      '沈砚当场反压执事，拿到试炼资格。',
      '但掌门令牌忽然亮起，内门长老要求他三日内交出阵盘，否则废除资格。',
    ].join('\n')

    const prematureReport = buildCoreContractSyncReport(project, chapter, contextPackage, prematureText)
    const riskReport = buildCoreContractSyncReport(project, chapter, contextPackage, riskText)

    expect(prematureReport.status).toBe('warn')
    expect(prematureReport.priority_repair).toBe('优先守核心节奏')
    expect(prematureReport.missed.map((item: any) => item.key)).toContain('core_conflict_premature_resolution')
    expect(prematureReport.next_actions.join('；')).toContain('非大结局')
    expect(riskReport.missed.map((item: any) => item.key)).not.toContain('core_conflict_premature_resolution')
  })

  test('reads raw camelCase core contract radar after chapter text is written', () => {
    const project = { title: '超人的规则怪谈世界' }
    const chapter = {
      id: 20,
      chapter_no: 20,
      title: '旧广播室',
      raw_payload: {
        preDraftBrief: {
          coreContractRadar: {
            summary: '本章必须服务旧广播室主线推进。',
            mustServe: ['旧广播室主线推进到录音源头'],
            noDrift: ['不能绕开规则判定直接砸门'],
            repairFocus: ['章末留下录音源头的新问题'],
            checks: [{ key: 'broadcast_source', label: '广播来源推进' }],
          },
        },
      },
    }

    const report = buildCoreContractSyncReport(project, chapter, {}, '李超没有砸门，张智先按规则判定排除陷阱，旧广播室主线推进到录音源头。章末留下录音源头的新问题。')

    expect(report.label).not.toBe('核心契约未配置')
    expect(report.contract_summary).toContain('旧广播室')
    expect(report.planned.map((item: any) => item.text)).toEqual(expect.arrayContaining([
      expect.stringContaining('旧广播室主线推进到录音源头'),
      expect.stringContaining('不能绕开规则判定直接砸门'),
      expect.stringContaining('章末留下录音源头的新问题'),
    ]))
    expect(report.quality_checks).toContain('广播来源推进')
  })

  test('reads runtime camelCase chapterTarget coreContractRadar when chapter_target already exists after delivery', () => {
    const project = { title: '超人的规则怪谈世界' }
    const chapter = { id: 21, chapter_no: 21, title: '旧广播室' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 21,
        title: '旧广播室',
      },
      chapterTarget: {
        chapterNo: 21,
        coreContractRadar: {
          summary: '本章必须服务旧广播室主线推进。',
          mustServe: ['旧广播室主线推进到录音源头'],
          noDrift: ['不能绕开规则判定直接砸门'],
          repairFocus: ['章末留下录音源头的新问题'],
          checks: [{ key: 'broadcast_source', label: '广播来源推进' }],
        },
      },
    }

    const report = buildCoreContractSyncReport(project, chapter, contextPackage, '李超没有砸门，张智先按规则判定排除陷阱，旧广播室主线推进到录音源头。章末留下录音源头的新问题。')

    expect(report.label).not.toBe('核心契约未配置')
    expect(report.contract_summary).toContain('旧广播室')
    expect(report.planned.map((item: any) => item.text)).toEqual(expect.arrayContaining([
      expect.stringContaining('旧广播室主线推进到录音源头'),
      expect.stringContaining('不能绕开规则判定直接砸门'),
      expect.stringContaining('章末留下录音源头的新问题'),
    ]))
    expect(report.quality_checks).toContain('广播来源推进')
  })

  test('story state sync persists a core_contract_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).toContain("reviewType: 'core_contract_sync'")
    expect(source).toContain('buildCoreContractSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.core_contract_sync = coreContractSync')
  })
})

describe('reader payoff sync report', () => {
  test('marks planned reader payoffs as delivered when the final prose contains them', () => {
    const report = buildReaderPayoffSyncReport(
      { title: '大益武夫' },
      { id: 2, chapter_no: 2, title: '警钟入城' },
      {
        chapter_target: {
          reader_promise: '读者看到失势皇子第一次反压王府新贵',
          payoff: '谢怀安借警钟夺回主动权',
          scene_cards: [
            { scene_no: 1, reader_payoff: '警钟把边军危机压到王府筵席上' },
            { scene_no: 2, reader_payoff: '带血腰牌带来新的危机钩子' },
          ],
          storyline_payoffs: ['边军腰牌支线'],
        },
      },
      '警钟把边军危机压到王府筵席上，谢怀安借钟声第一次反压王府新贵，夺回主动权。末尾，带血腰牌被递入厅中。',
      { state_delta: { payoff_queue: [] } },
    )

    expect(report.status).toBe('ok')
    expect(report.delivered.length).toBeGreaterThanOrEqual(2)
    expect(report.missed).toHaveLength(0)
    expect(report.label).toBe('回报 OK')
  })

  test('warns when promised reader payoffs are missing or added to payoff debt', () => {
    const report = buildReaderPayoffSyncReport(
      { title: '大益武夫' },
      { id: 3, chapter_no: 3, title: '拖欠测试' },
      {
        chapter_target: {
          reader_promise: '读者看到失势皇子反压王府新贵',
          payoff: '谢怀安拿到带血腰牌的真相',
          scene_cards: [{ scene_no: 1, reader_payoff: '揭开腰牌背后的边军危机' }],
        },
      },
      '众人在厅中闲谈许久，只说王府天气阴沉，没有腰牌真相，也没有反压。',
      { state_delta: { payoff_queue: ['带血腰牌真相待回收'] } },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('回报欠账 2')
    expect(report.debt_count).toBe(2)
    expect(report.missed.map((item: any) => item.text)).toContain('谢怀安拿到带血腰牌的真相')
    expect(report.debts.map((item: any) => item.text)).toContain('带血腰牌真相待回收')
  })

  test('reads raw camelCase reader payoff brief after chapter text is written', () => {
    const report = buildReaderPayoffSyncReport(
      { title: '超人的规则怪谈世界' },
      {
        id: 24,
        chapter_no: 24,
        title: '录音源头',
        raw_payload: {
          preDraftBrief: {
            payoff: '李超拿到旧广播室第一段原始录音',
            sceneBriefs: [
              { sceneNo: 1, readerPayoff: '录音暴露湿漉漉学生不是求救者' },
            ],
            storylinePayoffs: ['发现广播来源线索指向旧广播室管理员'],
          },
        },
      },
      {},
      '李超拿到旧广播室第一段原始录音，录音暴露湿漉漉学生不是求救者，也发现广播来源线索指向旧广播室管理员。',
      { state_delta: { payoff_queue: [] } },
    )

    expect(report.planned.map((item: any) => item.text)).toEqual(expect.arrayContaining([
      '李超拿到旧广播室第一段原始录音',
      '录音暴露湿漉漉学生不是求救者',
      '发现广播来源线索指向旧广播室管理员',
    ]))
    expect(report.status).toBe('ok')
  })

  test('story state sync persists a reader_payoff_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).toContain("reviewType: 'reader_payoff_sync'")
    expect(source).toContain('buildReaderPayoffSyncReport(project, chapter, contextPackage, chapterText, payload)')
    expect(source).toContain('payload.reader_payoff_sync = readerPayoffSync')
  })
})

describe('reader expectation sync report', () => {
  test('checks the unified reader expectation ledger after prose is finalized', () => {
    const report = buildReaderExpectationSyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 12, chapter_no: 2, title: '第一条规则' },
      {
        pre_draft_brief: {
          reader_expectation_ledger: {
            chapter_promise: '本章必须让读者看到超人蛮力被规则边界反制。',
            must_deliver: [
              { key: 'payoff_promise', label: '爽点承诺', type: 'payoff', text: '超人蛮力被规则边界反制。' },
              { key: 'ending_hook', label: '章末追读', type: 'hook', text: '湿漉漉学生敲响玻璃门。' },
            ],
            keep_alive: [
              { key: 'open_question_1', label: '保留悬念', type: 'question', text: '广播是谁发出的。' },
            ],
          },
        },
      },
      '十点整，李超一拳砸向宿舍门槛，却被灰白边界震退。张智用饼干碎屑验证，确认超人蛮力也会被规则边界反制。大厅广播仍旧没有解释自己是谁。',
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('期待欠账 1')
    expect(report.delivered.map((item: any) => item.key)).toContain('payoff_promise')
    expect(report.missed.map((item: any) => item.key)).toContain('ending_hook')
    expect(report.keep_alive.map((item: any) => item.text)).toContain('广播是谁发出的。')
    expect(report.next_actions).toContain('下一次修订优先补足 missed 中的读者期待；不要只补设定说明，要写成可见行动、冲突结果或章末未解问题。')
  })

  test('reads camelCase pre-draft reader expectation ledger after prose is finalized', () => {
    const report = buildReaderExpectationSyncReport(
      { title: '寒门阵师' },
      { id: 91, chapter_no: 9, title: '账册启封' },
      {
        preDraftBrief: {
          chapterNo: 9,
          readerExpectationLedger: {
            chapterPromise: '本章必须兑现旧案账册，让读者看到主角反压执事。',
            mustDeliver: [
              { key: 'payoff_ledger', label: '读者期待', type: 'payoff', text: '旧案账册必须被打开。' },
              { key: 'ending_hook', label: '章末追读', type: 'hook', text: '黑印在账册背面自行浮出。' },
            ],
            keepAlive: [
              { key: 'open_question_1', label: '保留悬念', type: 'question', text: '旧案幕后供奉是谁。' },
            ],
            mustNotBreak: ['不能提前公开供奉身份'],
          },
        },
      },
      '李玄当众把旧案账册打开，缺页处的旧墨被阵火照亮，执事的脸色第一次变了。',
    )

    expect(report.chapter_promise).toContain('旧案账册')
    expect(report.status).toBe('warn')
    expect(report.label).toBe('期待欠账 1')
    expect(report.delivered.map((item: any) => item.key)).toContain('payoff_ledger')
    expect(report.missed.map((item: any) => item.key)).toContain('ending_hook')
    expect(report.keep_alive.map((item: any) => item.text)).toContain('旧案幕后供奉是谁。')
    expect(report.must_not_break).toContain('不能提前公开供奉身份')
  })

  test('reads runtime camelCase chapterTarget reader expectation ledger after prose is finalized', () => {
    const report = buildReaderExpectationSyncReport(
      { title: '寒门阵师' },
      { id: 92, chapter_no: 10, title: '黑印浮账' },
      {
        chapterTarget: {
          chapterNo: 10,
          readerExpectationLedger: {
            chapterPromise: '本章必须兑现旧案账册，让读者看到主角反压执事。',
            mustDeliver: [
              { key: 'payoff_ledger', label: '读者期待', type: 'payoff', text: '旧案账册必须被打开。' },
              { key: 'ending_hook', label: '章末追读', type: 'hook', text: '黑印在账册背面自行浮出。' },
            ],
            keepAlive: [
              { key: 'open_question_1', label: '保留悬念', type: 'question', text: '旧案幕后供奉是谁。' },
            ],
            mustNotBreak: ['不能提前公开供奉身份'],
          },
        },
      },
      '李玄当众把旧案账册打开，缺页处的旧墨被阵火照亮，执事的脸色第一次变了。',
    )

    expect(report.chapter_promise).toContain('旧案账册')
    expect(report.status).toBe('warn')
    expect(report.label).toBe('期待欠账 1')
    expect(report.delivered.map((item: any) => item.key)).toContain('payoff_ledger')
    expect(report.missed.map((item: any) => item.key)).toContain('ending_hook')
    expect(report.keep_alive.map((item: any) => item.text)).toContain('旧案幕后供奉是谁。')
    expect(report.must_not_break).toContain('不能提前公开供奉身份')
  })

  test('treats missed previous chapter handoff in the opening as reader expectation debt', () => {
    const report = buildReaderExpectationSyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 13, chapter_no: 3, title: '门外学生' },
      {
        chapter_target: {
          previous_handoff: '上一章最后一幕：湿漉漉学生敲响玻璃门，林晓警告不能开门。',
          summary: '判断门外学生是否是规则诱饵。',
        },
      },
      [
        '张智判断门外学生可能是规则诱饵，但他没有立刻处理昨夜那声敲门。',
        '李超揉了揉肩膀，开始重新观察宿舍大厅的桌椅和墙皮。',
        '张智则翻开守则，准备从第一条规则重新分析。',
        '很久之后，他们才想起昨夜门外那个湿漉漉的学生。',
      ].join('\n\n'),
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('期待欠账 1')
    expect(report.missed.map((item: any) => item.key)).toContain('opening_handoff')
    expect(report.missed.find((item: any) => item.key === 'opening_handoff')?.label).toBe('上一章承接')
    expect(report.missed.find((item: any) => item.key === 'opening_handoff')?.match_scope).toBe('opening')
  })

  test('story state sync persists a reader_expectation_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).toContain("reviewType: 'reader_expectation_sync'")
    expect(source).toContain("payloadKey: 'reader_expectation_sync'")
    expect(source).toContain('buildReaderExpectationSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.reader_expectation_sync = readerExpectationSync')
  })
})

describe('reader retention sync report', () => {
  test('marks planned retention beats as delivered when the final prose contains them', () => {
    const report = buildReaderRetentionSyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 12, chapter_no: 2, title: '第一条规则' },
      {
        chapter_target: {
          reader_retention_brief: {
            opening_hook: '九点五十九分最后一秒被秒针推过去。',
            payoff_promise: '超人力量第一次被规则边界反制。',
            information_gap: '门外阴影到底按什么判定清除目标。',
            emotional_reward: '张智识破规则判定，李超收住蛮力。',
            short_drama_scene: '玻璃门内外对峙，黑暗贴着门槛爬动。',
            ending_question: '湿漉漉学生到底是求救者还是规则诱饵。',
          },
        },
      },
      '九点五十九分最后一秒被秒针推过去。李超刚要迈出门槛，就被规则边界反制，空气像铁墙压住他的脚尖。张智盯着黑暗贴着门槛爬动的边缘，判断出门外阴影按越界判定清除目标，立刻让李超收住蛮力。玻璃门内外对峙时，一个湿漉漉学生敲响门，没人知道他到底是求救者还是规则诱饵。',
    )

    expect(report.status).toBe('ok')
    expect(report.label).toBe('追读 OK')
    expect(report.missed).toHaveLength(0)
    expect(report.delivered.map((item: any) => item.key)).toContain('opening_hook')
    expect(report.delivered.map((item: any) => item.key)).toContain('ending_question')
  })

  test('warns when planned opening hook or ending question is not delivered', () => {
    const report = buildReaderRetentionSyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 13, chapter_no: 3, title: '漏兑现测试' },
      {
        chapter_target: {
          reader_retention_brief: {
            opening_hook: '开篇直接写宿舍门外有人敲门。',
            payoff_promise: '李超用超人听觉确认门外不是活人。',
            information_gap: '敲门者为什么知道他们名字。',
            short_drama_scene: '门内三人屏息，门外水声贴着玻璃往下淌。',
            ending_question: '门缝里的纸条是谁塞进来的。',
          },
        },
      },
      '三人在大厅里讨论了很久，林晓解释了学校的大致规则。李超活动肩膀，张智整理信息，大家决定先休息。',
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('漏追读 5')
    expect(report.missed_count).toBe(5)
    expect(report.missed.map((item: any) => item.key)).toContain('opening_hook')
    expect(report.missed.map((item: any) => item.key)).toContain('ending_question')
    expect(report.next_actions[0]).toContain('追读雷达')
  })

  test('warns when the Hook addiction loop lacks random reward or investment', () => {
    const report = buildReaderRetentionSyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 14, chapter_no: 4, title: '上瘾循环测试' },
      {
        chapter_target: {
          reader_retention_brief: {
            opening_hook: '李超想在十点前拿到宿管钥匙。',
            payoff_promise: '宿管钥匙能打开被封死的档案柜。',
            hook_addiction_model: {
              trigger: '李超想在十点前拿到宿管钥匙。',
              action: '张智让他只做一件事：用饼干碎屑引开宿管。',
              reward: '他们拿到宿管钥匙，还意外发现钥匙柄里藏着第零条规则碎片。',
              investment: '李超把钥匙挂上编号，宿舍小队正式多了档案柜权限。',
            },
          },
        },
      },
      [
        '李超想在十点前拿到宿管钥匙。',
        '张智让他只做一件事：用饼干碎屑引开宿管。',
        '他们顺利拿到宿管钥匙，准备之后再看档案柜。',
      ].join('\n\n'),
    )

    expect(report.status).toBe('warn')
    expect(report.missed.map((item: any) => item.key)).toContain('hook_addiction_model')
    expect(report.missed.find((item: any) => item.key === 'hook_addiction_model')?.label).toBe('Hook上瘾模型')
    expect(report.next_actions.join('；')).toContain('触发 -> 行动 -> 奖励 -> 投入')
    expect(report.next_actions.join('；')).toContain('奖励随机性')
  })

  test('marks compound retention checks as delivered when the final prose contains every required engine', () => {
    const report = buildReaderRetentionSyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 15, chapter_no: 5, title: '双引擎测试' },
      {
        chapter_target: {
          reader_retention_brief: {
            opening_hook: '李超听见宿舍门外有人用他的童年小名喊他。',
            payoff_promise: '张智用规则漏洞让门外人第一次失手。',
            information_gap: '门外人为什么知道李超的童年小名。',
            emotional_reward: '李超被叫破小名后没有崩溃，反而第一次相信张智的判断。',
            ending_question: '门外人留下的旧学生证为什么写着李超的生日。',
            hook_addiction_model: {
              trigger: '李超听见宿舍门外有人用他的童年小名喊他。',
              action: '张智让李超只做一件事：盯住门缝里的影子别回应。',
              reward: '他们挡住门外人，还意外拿到一张写着第零条规则碎片的旧学生证。',
              investment: '宿舍小队把旧学生证收进档案袋，正式多了一条追查广播源头的线索。',
            },
            retention_double_engine: {
              emotion_engine: '李超被叫破小名后没有崩溃，反而第一次相信张智的判断。',
              hunger_engine: '门外人为什么知道李超的童年小名。',
              onion_layers: '章节开头植入小问号，章末卡住关键信息：旧学生证为什么写着李超的生日。',
            },
            retention_pillars: {
              upgrade: '他们挡住门外人，还意外拿到一张写着第零条规则碎片的旧学生证。',
              resource_pressure: '门外人用童年小名逼李超回应。',
              goal_stack: '大目标 + 小目标 + 假目标：追查广播源头，先盯住门缝里的影子。',
              mystery_unlock: '旧学生证为什么写着李超的生日。',
            },
          },
        },
      },
      [
        '李超听见宿舍门外有人用他的童年小名喊他。',
        '张智让李超只做一件事：盯住门缝里的影子别回应。',
        '李超被叫破小名后没有崩溃，反而第一次相信张智的判断。',
        '他们用规则漏洞让门外人第一次失手，还意外拿到一张写着第零条规则碎片的旧学生证。',
        '宿舍小队把旧学生证收进档案袋，正式多了一条追查广播源头的线索。',
        '可门外人为什么知道李超的童年小名？旧学生证上，又为什么写着李超的生日？',
      ].join('\n\n'),
    )

    expect(report.status).toBe('ok')
    expect(report.missed).toHaveLength(0)
    expect(report.delivered.map((item: any) => item.key)).toContain('hook_addiction_model')
    expect(report.delivered.map((item: any) => item.key)).toContain('retention_double_engine')
    expect(report.delivered.map((item: any) => item.key)).toContain('retention_pillars')
  })

  test('warns when retention four pillars are planned but not delivered', () => {
    const report = buildReaderRetentionSyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 18, chapter_no: 8, title: '四支柱测试' },
      {
        chapter_target: {
          reader_retention_brief: {
            opening_hook: '李超在门口听见广播喊出自己的童年小名。',
            retention_pillars: {
              upgrade: '宿舍小队拿到第零条规则碎片。',
              resource_pressure: '门外人用童年小名逼李超回应。',
              goal_stack: '大目标 + 小目标 + 假目标：追查广播源头，先盯住门缝里的影子。',
              mystery_unlock: '旧学生证为什么写着李超的生日。',
            },
          },
        },
      },
      '李超坐在床边想了很久。张智把窗帘拉上，大家决定明天再讨论。',
    )

    expect(report.status).toBe('warn')
    expect(report.missed.map((item: any) => item.key)).toContain('retention_pillars')
    expect(report.missed.find((item: any) => item.key === 'retention_pillars')?.label).toBe('留存四大支柱')
    expect(report.next_actions.join('；')).toContain('升级、资源困境、目标、解密')
  })

  test('reads raw camelCase reader retention brief after chapter text is written', () => {
    const report = buildReaderRetentionSyncReport(
      { title: '超人的规则怪谈世界' },
      {
        id: 27,
        chapter_no: 27,
        title: '倒流水痕',
        raw_payload: {
          preDraftBrief: {
            readerRetentionBrief: {
              openingHook: '玻璃门内侧的水痕突然倒流。',
              payoffPromise: '旧广播室录音证明有人提前模仿学生声音。',
              informationGap: '模仿学生声音的人为什么知道李超名字。',
              endingQuestion: '录音末尾为什么出现李超未来三分钟后的回答。',
            },
          },
        },
      },
      {},
      '玻璃门内侧的水痕突然倒流。旧广播室录音证明有人提前模仿学生声音，张智立刻追问模仿学生声音的人为什么知道李超名字。录音末尾忽然出现李超未来三分钟后的回答。',
    )

    expect(report.planned.map((item: any) => item.key)).toEqual(expect.arrayContaining(['opening_hook', 'payoff_promise', 'information_gap', 'ending_question']))
    expect(report.status).toBe('ok')
  })

  test('reads runtime camelCase chapterTarget readerRetentionBrief after chapter text is written', () => {
    const report = buildReaderRetentionSyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 28, chapter_no: 28, title: '倒流水痕' },
      {
        chapterTarget: {
          chapterNo: 28,
          readerRetentionBrief: {
            openingHook: '玻璃门内侧的水痕突然倒流。',
            payoffPromise: '旧广播室录音证明有人提前模仿学生声音。',
            informationGap: '模仿学生声音的人为什么知道李超名字。',
            endingQuestion: '录音末尾为什么出现李超未来三分钟后的回答。',
          },
        },
      },
      '玻璃门内侧的水痕突然倒流。旧广播室录音证明有人提前模仿学生声音，张智立刻追问模仿学生声音的人为什么知道李超名字。录音末尾忽然出现李超未来三分钟后的回答。',
    )

    expect(report.planned.map((item: any) => item.key)).toEqual(expect.arrayContaining(['opening_hook', 'payoff_promise', 'information_gap', 'ending_question']))
    expect(report.status).toBe('ok')
  })

  test('warns when retention double engine has emotion but no hunger question', () => {
    const report = buildReaderRetentionSyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 16, chapter_no: 6, title: '缺饥饿测试' },
      {
        chapter_target: {
          reader_retention_brief: {
            emotional_reward: '李超终于顶住恐惧，承认自己需要张智。',
            information_gap: '门外广播为什么只念李超的名字。',
            retention_double_engine: {
              emotion_engine: '李超终于顶住恐惧，承认自己需要张智。',
              hunger_engine: '门外广播为什么只念李超的名字。',
              onion_layers: '章末卡住关键信息：广播名字来源。',
            },
          },
        },
      },
      '李超终于顶住恐惧，承认自己需要张智。两个人互相点头，决定明天继续查。',
    )

    expect(report.status).toBe('warn')
    expect(report.missed.map((item: any) => item.key)).toContain('retention_double_engine')
    expect(report.missed.find((item: any) => item.key === 'retention_double_engine')?.label).toBe('留存双引擎')
    expect(report.next_actions.join('；')).toContain('情绪 + 饥饿')
    expect(report.next_actions.join('；')).toContain('信息差植入问号')
  })

  test('story state sync persists a reader_retention_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).toContain("reviewType: 'reader_retention_sync'")
    expect(source).toContain('buildReaderRetentionSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.reader_retention_sync = readerRetentionSync')
  })

  test('story state sync persists a chapter_attraction_review review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).toContain("reviewType: 'chapter_attraction_review'")
    expect(source).toContain('buildChapterAttractionReviewReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.chapter_attraction_review = chapterAttractionReview')
  })
})

describe('innovation sync report', () => {
  test('marks innovation execution as delivered when the final prose contains the planned angle and scene hooks', () => {
    const report = buildInnovationSyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 21, chapter_no: 2, title: '第一条规则' },
      {
        chapter_target: {
          innovation_brief: {
            chapter_angle: '超人硬闯被规则边界反噬。',
            execution_points: ['用饼干碎屑验证门槛清除规则'],
            differentiation_guardrails: ['不得写成普通开挂碾压'],
            ip_adaptation_hooks: ['玻璃门内外对峙'],
          },
        },
      },
      '李超想硬闯，脚尖刚越过门槛，空气就像一堵看不见的墙反噬回来。张智没有让他继续开挂碾压，而是掰下一点饼干碎屑弹出去，碎屑被门外黑暗清除，玻璃门内外形成对峙。',
    )

    expect(report.status).toBe('ok')
    expect(report.label).toBe('创新 OK')
    expect(report.missed_count).toBe(0)
    expect(report.score).toBeGreaterThanOrEqual(78)
  })

  test('warns when innovation brief is not executed and the chapter reads like a routine scene', () => {
    const report = buildInnovationSyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 22, chapter_no: 3, title: '普通套路测试' },
      {
        chapter_target: {
          innovation_brief: {
            chapter_angle: '超人力量每次硬碰规则都会暴露新的代价。',
            execution_points: ['用规则漏洞反制门外诱饵'],
            differentiation_guardrails: ['不得写成普通校园逃生'],
            ip_adaptation_hooks: ['门内外影子贴着玻璃分界线移动'],
          },
        },
      },
      '三人在宿舍里讨论学校很危险，决定暂时不要出去。林晓解释自己见过很多怪事，张智点头记录，李超说以后再想办法。',
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('创新缺口 4')
    expect(report.missed_count).toBe(4)
    expect(report.next_actions[0]).toContain('创新执行')
  })

  test('reads raw camelCase innovation brief after delivery', () => {
    const report = buildInnovationSyncReport(
      { title: '超人的规则怪谈世界' },
      {
        id: 23,
        chapter_no: 6,
        title: '倒放录音',
        raw_payload: {
          preDraftBrief: {
            innovationBrief: {
              chapterAngle: '广播录音会提前播放主角未来三分钟的回答。',
              executionPoints: ['用倒放录音反推门锁暗号'],
              differentiationGuardrails: ['不得写成普通密室解谜'],
              ipAdaptationHooks: ['旧广播室磁带倒转，未来回答先于提问出现'],
            },
          },
        },
      },
      {},
      '旧广播室里，广播录音会提前播放主角未来三分钟的回答。张智用倒放录音反推门锁暗号，李超没有把它写成普通密室解谜，而是看见旧广播室磁带倒转，未来回答先于提问出现。',
    )

    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['创新角度', '执行点', '差异护栏', 'IP化场面']))
    expect(report.status).toBe('ok')
  })

  test('story state sync persists an innovation_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: innovationSync, reviewType: 'innovation_sync'")
    expect(source).toContain('buildInnovationSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.innovation_sync = innovationSync')
  })
})

describe('signature scene sync report', () => {
  test('marks planned signature scene repair as delivered when final prose lands the memorable scene and payoff', () => {
    const report = buildSignatureSceneSyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 24, chapter_no: 4, title: '门槛反噬' },
      {
        chapter_target: {
          signature_scene_brief: {
            signature_scene: '玻璃门内外，黑影贴着判定边界移动，李超用门框当盾牌硬顶规则反噬。',
            scene_repair_target: '修复 IP场面覆盖 1/10 的强场面空窗。',
            reader_payoff: '读者看到超人蛮力第一次被规则反噬后，张智用实验反杀诱饵。',
            storyline_service: '推进午夜校园规则源头主线。',
          },
        },
      },
      '玻璃门内外的黑影贴着判定边界移动，李超扯下门框当盾牌硬顶规则反噬，肩膀被震得发麻。张智没有让他硬莽，而是用实验确认诱饵的清除范围，反手让门外黑影吞掉伪装广播，午夜校园规则源头的线索第一次露出。',
    )

    expect(report.status).toBe('ok')
    expect(report.label).toBe('强场面 OK')
    expect(report.missed_count).toBe(0)
    expect(report.score).toBeGreaterThanOrEqual(78)
  })

  test('warns when planned signature scene repair is absent from final prose', () => {
    const report = buildSignatureSceneSyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 25, chapter_no: 5, title: '空章测试' },
      {
        chapter_target: {
          signature_scene_brief: {
            signature_scene: '审判场中央，主角把带血腰牌拍在长案上，满堂旧臣同时失声。',
            scene_repair_target: '补位强场面空窗。',
            reader_payoff: '完成一次公开反杀和身份压迫。',
            storyline_service: '推进王府夺权主线。',
          },
        },
      },
      '主角回到房间整理线索，和同伴讨论明天再去审判场。他没有公开行动，也没有带血腰牌造成压迫。',
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('强场面漏写 4')
    expect(report.missed_count).toBe(4)
    expect(report.next_actions[0]).toContain('标志性场面')
  })

  test('reads raw camelCase signature scene brief after delivery', () => {
    const report = buildSignatureSceneSyncReport(
      { title: '超人的规则怪谈世界' },
      {
        id: 26,
        chapter_no: 6,
        title: '倒放录音',
        raw_payload: {
          preDraftBrief: {
            signatureSceneBrief: {
              signatureScene: '旧广播室磁带倒转，李超未来三分钟后的回答先于提问响起。',
              sceneRepairTarget: '补位旧广播室的记忆点强场面。',
              readerPayoff: '读者看到规则不只限制蛮力，还能倒置因果。',
              storylineService: '推进广播源头主线。',
            },
          },
        },
      },
      {},
      '旧广播室磁带倒转，李超未来三分钟后的回答先于提问响起。这个强场面补位了旧广播室的记忆点，读者第一次看到规则不只限制蛮力，还能倒置因果，也推进广播源头主线。',
    )

    expect(report.label).not.toBe('强场面未计划')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['标志性场面', '补位目标', '读者回报', '剧情线服务']))
    expect(report.status).toBe('ok')
  })

  test('story state sync persists a signature_scene_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).toContain("reviewType: 'signature_scene_sync'")
    expect(source).toContain('buildSignatureSceneSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.signature_scene_sync = signatureSceneSync')
  })
})

describe('volume beat sync report', () => {
  test('marks planned volume climax beats as delivered when final prose lands the turn and payoff', () => {
    const report = buildVolumeBeatSyncReport(
      { title: '大益武夫' },
      { id: 31, chapter_no: 18, title: '警钟入城' },
      {
        chapter_target: {
          next_batch_brief: {
            current_chapter_role: '完成当前卷中高潮：警钟入城，谢怀安当众夺回王府主动权。',
          },
          scene_cards: [
            {
              scene_no: 2,
              turning_point: '警钟第三响，带血腰牌递入王府。',
              reader_payoff: '谢怀安借警钟第一次压住王府新贵。',
            },
          ],
        },
      },
      '警钟第三响时，带血腰牌被递入王府。谢怀安借警钟第一次压住王府新贵，当众夺回主动权，这场中高潮让满堂人心变色。',
    )

    expect(report.status).toBe('ok')
    expect(report.label).toBe('爆点 OK')
    expect(report.missed_count).toBe(0)
    expect(report.delivered.map((item: any) => item.key)).toContain('current_chapter_role')
  })

  test('warns when planned climax beats are not visible in final prose', () => {
    const report = buildVolumeBeatSyncReport(
      { title: '大益武夫' },
      { id: 32, chapter_no: 24, title: '卷中断点' },
      {
        chapter_target: {
          next_batch_brief: {
            current_chapter_role: '完成当前卷中高潮：边军腰牌真相反转，主角夺回主动权。',
          },
          scene_cards: [
            {
              scene_no: 3,
              turning_point: '带血腰牌证明边军危机是真的。',
              reader_payoff: '主角反压王府管事。',
            },
          ],
        },
      },
      '众人在厅中闲谈许久，王府管事安排茶水，主角暂时没有行动，边军危机也没有被提起。',
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('爆点漏兑现 3')
    expect(report.missed_count).toBe(3)
    expect(report.missed.map((item: any) => item.key)).toEqual(expect.arrayContaining(['current_chapter_role', 'turning_point_1', 'reader_payoff_1']))
    expect(report.next_actions[0]).toContain('卷级爆点')
  })

  test('reads raw camelCase volume beat brief after delivery', () => {
    const report = buildVolumeBeatSyncReport(
      { title: '超人的规则怪谈世界' },
      {
        id: 33,
        chapter_no: 30,
        title: '广播源头',
        raw_payload: {
          preDraftBrief: {
            volumeBeatBrief: {
              currentChapterRole: '完成当前卷中高潮：倒放录音揭出广播源头，李超夺回主动权。',
              volumeGoal: '把广播源头主线推进到旧广播室管理员。',
              climaxPromise: '倒放录音揭出广播源头。',
              requiredBeats: ['李超当众夺回主动权'],
            },
            sceneBriefs: [
              {
                turningPoint: '磁带倒转后未来回答先于提问出现。',
                readerPayoff: '李超夺回主动权。',
                endingHook: '旧广播室管理员名字出现在下一盘磁带上。',
              },
            ],
          },
        },
      },
      {},
      '倒放录音揭出广播源头，线索指向旧广播室管理员。磁带倒转后未来回答先于提问出现，李超当众夺回主动权，把广播源头主线推进到旧广播室管理员。最后，旧广播室管理员名字出现在下一盘磁带上。',
    )

    expect(report.label).not.toBe('爆点未计划')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['本章爆点职责', '卷级目标', '高潮承诺', '爆点动作', '转折点', '读者回报', '钩子推进']))
    expect(report.status).toBe('ok')
  })

  test('reads runtime camelCase chapterTarget volume beat brief after delivery', () => {
    const report = buildVolumeBeatSyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 35, chapter_no: 35, title: '广播源头' },
      {
        chapterTarget: {
          volumeBeatBrief: {
            currentChapterRole: '完成当前卷中高潮：倒放录音揭出广播源头，李超夺回主动权。',
            volumeGoal: '把广播源头主线推进到旧广播室管理员。',
            climaxPromise: '倒放录音揭出广播源头。',
            requiredBeats: ['李超当众夺回主动权'],
          },
          sceneCards: [
            {
              turningPoint: '磁带倒转后未来回答先于提问出现。',
              readerPayoff: '李超夺回主动权。',
              endingHookSeed: '旧广播室管理员名字出现在下一盘磁带上。',
            },
          ],
        },
      },
      '倒放录音揭出广播源头，线索指向旧广播室管理员。磁带倒转后未来回答先于提问出现，李超当众夺回主动权，把广播源头主线推进到旧广播室管理员。最后，旧广播室管理员名字出现在下一盘磁带上。',
    )

    expect(report.label).not.toBe('爆点未计划')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['本章爆点职责', '卷级目标', '高潮承诺', '爆点动作', '转折点', '读者回报', '钩子推进']))
    expect(report.status).toBe('ok')
  })

  test('story state sync persists a volume_beat_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: volumeBeatSync, reviewType: 'volume_beat_sync'")
    expect(source).toContain('buildVolumeBeatSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.volume_beat_sync = volumeBeatSync')
  })
})

describe('million word runway sync report', () => {
  test('marks runway obligations as delivered when final prose answers the course', () => {
    const report = buildRunwaySyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 2, chapter_no: 2 },
      {
        million_word_runway: {
          fourQuestions: [
            { key: 'why_now', label: '这章为什么必须写', answer: '第一次证明规则边界能被利用' },
            { key: 'page_turn', label: '读者为什么翻页', answer: '门外学生说出李超的死因' },
            { key: 'mainline_move', label: '主线推进了什么', answer: '双主角确认规则并非不可破解' },
            { key: 'freshness', label: '这一章的新意在哪', answer: '超人力量先被规则压制再反制' },
          ],
          redLines: ['超人力量不能无代价碾压规则'],
          readerFuel: ['规则反制爽点', '门外学生章末钩子'],
        },
      },
      '李超第一次证明规则边界能被利用。门外学生说出李超的死因，双主角确认规则并非不可破解。超人力量先被规则压制再反制，形成规则反制爽点。结尾处，门外学生章末钩子再次敲响。',
    )

    expect(report.status).toBe('ok')
    expect(report.label).toBe('航线 OK')
    expect(report.risk_count).toBe(0)
    expect(report.four_question_missed).toHaveLength(0)
    expect(report.reader_fuel_missed).toHaveLength(0)
    expect(report.redline_touched).toHaveLength(0)
  })

  test('warns when final prose misses runway questions or touches red lines', () => {
    const report = buildRunwaySyncReport(
      { title: '超人的规则怪谈世界' },
      { id: 2, chapter_no: 2 },
      {
        chapter_target: {
          million_word_runway: {
            fourQuestions: [
              { key: 'why_now', label: '这章为什么必须写', answer: '第一次证明规则边界能被利用' },
              { key: 'page_turn', label: '读者为什么翻页', answer: '门外学生说出李超的死因' },
            ],
            redLines: ['提前揭露规则之源'],
            readerFuel: ['规则反制爽点'],
          },
        },
      },
      '李超站在大厅里闲聊，突然提前揭露规则之源，然后章节结束。',
    )

    expect(report.status).toBe('warn')
    expect(report.risk_count).toBeGreaterThanOrEqual(3)
    expect(report.four_question_missed.map((item: any) => item.label)).toContain('这章为什么必须写')
    expect(report.reader_fuel_missed.map((item: any) => item.text)).toContain('规则反制爽点')
    expect(report.redline_touched.map((item: any) => item.text)).toContain('提前揭露规则之源')
  })

  test('reads raw camelCase million word runway after delivery', () => {
    const report = buildRunwaySyncReport(
      { title: '超人的规则怪谈世界' },
      {
        id: 34,
        chapter_no: 34,
        raw_payload: {
          preDraftBrief: {
            millionWordRunway: {
              fourQuestions: [
                { key: 'why_now', label: '这章为什么必须写', answer: '第一次确认旧广播室管理员参与广播源头' },
                { key: 'page_turn', label: '读者为什么翻页', answer: '下一盘磁带写着李超的名字' },
              ],
              readerFuel: ['倒放录音反制爽点'],
              redLines: ['提前揭露最终规则之源'],
            },
          },
        },
      },
      {},
      '本章第一次确认旧广播室管理员参与广播源头。李超完成倒放录音反制爽点，最后，下一盘磁带写着李超的名字。',
    )

    expect(report.four_questions.map((item: any) => item.label)).toEqual(expect.arrayContaining(['这章为什么必须写', '读者为什么翻页']))
    expect(report.reader_fuel.map((item: any) => item.text)).toContain('倒放录音反制爽点')
    expect(report.status).toBe('ok')
  })

  test('story state sync persists a runway_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).toContain("reviewType: 'runway_sync'")
    expect(source).toContain('buildRunwaySyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.runway_sync = runwaySync')
  })
})

describe('discovered asset intake', () => {
  test('normalizes discovered assets to core types and filters existing names', () => {
    const assets = normalizeDiscoveredAssets(
      [
        { entity_type: 'character', name: '林晓', summary: '已存在角色', evidence: '林晓递出背包。' },
        { type: 'character', name: '周远', summary: '新来的宿舍管理员', evidence: '周远站在门口。', suggested_state: { location: '宿舍楼' } },
        { entity_type: 'item', name: '黑色钥匙', summary: '能打开禁闭室', evidence: '黑色钥匙落在掌心。', constraints_json: { owner_rule: '不得离身' } },
        { entity_type: 'realm', name: '新人试炼者', summary: '不在第一版范围' },
        { entity_type: 'ability', name: '', summary: '缺名称' },
      ],
      {
        existingCharacters: [{ name: '林晓' }],
        existingSettings: [{ entity_type: 'item', name: '旧钥匙' }],
        chapter: { id: 101, chapter_no: 1 },
      },
    )

    expect(assets.map((item: any) => item.entity_type)).toEqual(['character', 'item'])
    expect(assets.map((item: any) => item.name)).toEqual(['周远', '黑色钥匙'])
    expect(assets[0].first_chapter_no).toBe(1)
    expect(assets[0].state_json).toMatchObject({ location: '宿舍楼', first_seen_chapter: 1 })
    expect(assets[1].constraints_json).toMatchObject({ owner_rule: '不得离身' })
    expect(assets[1].payload_json.source).toBe('story_state_discovered_asset')
  })

  test('story state prompt asks for discovered assets and creates asset intake review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).toContain('discovered_assets')
    expect(source).toContain('normalizeDiscoveredAssets(')
    expect(source).toContain('buildAssetIntakeReviewRecord({ projectId: project.id, chapter, discoveredAssets })')
    expect(source).toContain('asset_intake')
  })
})

describe('ip scene intake', () => {
  test('normalizes chapter IP scene candidates for post-delivery review', () => {
    const candidates = normalizeIpSceneCandidates(
      [
        {
          title: '玻璃门内外对峙',
          summary: '门外湿漉漉学生敲门，门内三人被规则边界困住。',
          visual_hook: '黑暗贴着玻璃爬动，门槛白线像判定边界。',
          adaptation_value: '适合短剧第一集结尾和漫剧分镜。',
          spread_point: '救不救门外学生的评论区争议。',
          evidence: '湿漉漉的校服男生站在玻璃门外。',
          source_excerpt: '玻璃门外的黑暗贴着门槛蠕动。',
          tags: ['短剧钩子', '规则怪谈强画面'],
        },
        { title: '玻璃门内外对峙', summary: '重复候选' },
        { title: '', summary: '缺标题' },
      ],
      { id: 101, chapter_no: 2 },
    )

    expect(candidates).toHaveLength(1)
    expect(candidates[0].title).toBe('玻璃门内外对峙')
    expect(candidates[0].chapter_no).toBe(2)
    expect(candidates[0].chapter_id).toBe(101)
    expect(candidates[0].visual_hook).toContain('判定边界')
    expect(candidates[0].adaptation_value).toContain('短剧')
    expect(candidates[0].tags).toContain('规则怪谈强画面')
  })

  test('story state prompt asks for ip scene candidates and creates ip scene intake review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).toContain('ip_scene_candidates')
    expect(source).toContain('normalizeIpSceneCandidates(')
    expect(source).toContain('buildIpSceneIntakeReviewRecord({ projectId: project.id, chapter, ipSceneCandidates })')
    expect(source).toContain('payload.ip_scene_intake')
  })
})

describe('commercial web novel style defaults', () => {
  test('fills writing bible style lock with current commercial web novel defaults', () => {
    const styleLock = getStyleLock({ length_target: 'epic', style_tags: [] })

    expect(styleLock.narrative_person).toContain('第三人称有限视角')
    expect(styleLock.sentence_length).toContain('短中句')
    expect(styleLock.dialogue_ratio).toContain('35%-45%')
    expect(styleLock.payoff_density).toContain('800-1200字')
    expect(styleLock.chapter_word_range).toContain('3200-5200字')
    expect(styleLock.preferred_words).toContain('爽点回收')
  })

  test('preserves explicit project style lock over defaults', () => {
    const styleLock = getStyleLock({
      reference_config: {
        style_lock: {
          narrative_person: '第一人称主视角',
          preferred_words: ['自定义口头禅'],
        },
      },
    })

    expect(styleLock.narrative_person).toBe('第一人称主视角')
    expect(styleLock.preferred_words).toEqual(['自定义口头禅'])
    expect(styleLock.sentence_length).toContain('短中句')
  })
})

