import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'fs'
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
const readWritingServiceLeaf = (name: string) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')
const readDraftReceiptSource = () => readWritingServiceLeaf('generate-chapter-draft-prose.ts')
const readReceiptStoreSource = () => [
  readWritingServiceLeaf('generate-chapter-draft-mode-store.ts'),
  readWritingServiceLeaf('generate-chapter-full-production-store.ts'),
].join('\n')
const readFinalReceiptRefreshSource = () => {
  const source = readWritingServiceLeaf('generate-chapter-quality-prestore-finalize.ts')
  const start = source.indexOf('const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)')
  const end = source.indexOf('const nextChapterQualityPlanReceiptSync =', start)
  if (start < 0 || end <= start) throw new Error('Unable to locate final receipt refresh source block')
  return source.slice(start, end)
}


const writingServicePackageCache = new Map<string, string>()
const writingServiceSourceCache: { value: string | null } = { value: null }

function packageSource(relativeDir: string) {
  const cached = writingServicePackageCache.get(relativeDir)
  if (cached != null) return cached
  const root = join(import.meta.dir, '..', relativeDir)
  const files: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        files.push(full)
      }
    }
  }
  walk(root)
  files.sort()
  const value = files.map((file) => readFileSync(file, 'utf8')).join('\n')
  writingServicePackageCache.set(relativeDir, value)
  return value
}

function writingServiceSource() {
  if (writingServiceSourceCache.value != null) return writingServiceSourceCache.value
  writingServiceSourceCache.value = [
    packageSource('novel-writing-service'),
    packageSource('novel-writing'),
  ].join('\n')
  return writingServiceSourceCache.value
}


function deliveryRiskCarryOverSource() {
  const dir = join(import.meta.dir, '../novel-writing-service/post-delivery')
  return [
    'delivery-risk-carry-over.ts',
    'delivery-risk-carry-over-context.ts',
    'delivery-risk-carry-over-prose-quality.ts',
    'delivery-risk-carry-over-prose-quality-core.ts',
    'delivery-risk-carry-over-prose-quality-mid.ts',
    'delivery-risk-carry-over-prose-quality-extended.ts',
    'delivery-risk-carry-over-prose-quality-extended-assets.ts',
    'delivery-risk-carry-over-prose-quality-extended-assets-a.ts',
    'delivery-risk-carry-over-prose-quality-extended-assets-b.ts',
    'delivery-risk-carry-over-prose-quality-extended-craft.ts',
  ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n')
}

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
    const source = writingServiceSource()

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
    const source = writingServiceSource()
    const promptBlock = readFileSync(join(import.meta.dir, '../novel-writing/story-state-prompt.ts'), 'utf8')

    expect(promptBlock).toContain('layered_memory_context')
    expect(promptBlock).toContain('recent_chapter_details')
    expect(promptBlock).toContain('ten_chapter_summaries')
    expect(promptBlock).toContain('volume_overview')
    expect(source).toContain('buildMergedLayeredMemoryContext')
    expect(source).toContain('layered_memory_context')
    expect(source).toMatch(/function mergeStoryState|const mergeStoryState\s*=/)
  })

  test('story state prompt asks for oh-story daily progress summary and stores it for the next chapter', () => {
    const source = writingServiceSource()
    const promptBlock = readFileSync(join(import.meta.dir, '../novel-writing/story-state-prompt.ts'), 'utf8')

    expect(promptBlock).toContain('progress_summary')
    expect(promptBlock).toContain('last_completed_chapter')
    expect(promptBlock).toContain('active_foreshadowing_count')
    expect(promptBlock).toContain('recent_changed_characters')
    expect(promptBlock).toContain('next_outline_status')
    expect(promptBlock).toContain('注意事项')
    expect(source).toContain('progress_summary')
    expect(source).toContain('progressSummary')
    expect(source).toMatch(/function normalizeStoryStateDeltaForStorage|const normalizeStoryStateDeltaForStorage\s*=/)
    expect(source).toMatch(/function mergeStoryState|const mergeStoryState\s*=/)
  })

  test('story state prompt asks for oh-story daily context snapshot and stores it for the next chapter', () => {
    const source = writingServiceSource()
    const promptBlock = readFileSync(join(import.meta.dir, '../novel-writing/story-state-prompt.ts'), 'utf8')

    expect(promptBlock).toContain('daily_context_snapshot')
    expect(promptBlock).toContain('current_chapter')
    expect(promptBlock).toContain('current_scene')
    expect(promptBlock).toContain('current_emotion_target')
    expect(promptBlock).toContain('writing_changes')
    expect(promptBlock).toContain('pending_clues')
    expect(promptBlock).toContain('daily_context_snapshot 只保存追踪/上下文.md 的进度元信息')
    expect(promptBlock).toContain('不得复制详细伏笔表、时间线表或角色状态表')
    expect(source).toContain('daily_context_snapshot')
    expect(source).toContain('dailyContextSnapshot')
    expect(source).toMatch(/function normalizeStoryStateDeltaForStorage|const normalizeStoryStateDeltaForStorage\s*=/)
    expect(source).toMatch(/function mergeStoryState|const mergeStoryState\s*=/)
  })

  test('story state prompt uses scene-card receipts for state deltas and next chapter prep', () => {
    const promptBlock = readFileSync(join(import.meta.dir, '../novel-writing/story-state-prompt.ts'), 'utf8')

    expect(promptBlock).toContain('scene_card_receipts')
    expect(promptBlock).toContain('已验证场景回执')
    expect(promptBlock).toContain('state_delta')
    expect(promptBlock).toContain('next_chapter_priorities')
  })

  test('story state sync receives latest generated scene breakdown context', () => {
    const source = writingServiceSource()
    const contextStart = source.indexOf('const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)')
    const prepareStart = source.indexOf('preparedStoryStateUpdate = await prepareStoryStateUpdate(')
    // Package leaves may sort before/after each other; assert the call site itself, not monofile order.
    const prepareBlock = source.slice(prepareStart, prepareStart + 900)

    expect(contextStart).toBeGreaterThanOrEqual(0)
    expect(prepareStart).toBeGreaterThanOrEqual(0)
    expect(prepareBlock).toContain('finalReviewContextPackage,')
    expect(prepareBlock).toContain('{ ...chapter, chapter_text: finalText }')
  })

  test('prose generation stores oh-story delivery receipts in every chapter store branch', () => {
    const draftSource = readDraftReceiptSource()
    const storeSource = readReceiptStoreSource()
    const storagePatchSource = readChapterProseStoragePatchSource()

    expect(draftSource).toContain('let ohStoryDeliveryReceipts = normalizeStoredOhStoryDeliveryReceipts')
    expect(storeSource.match(/buildChapterProseStoragePatch\(/g)?.length || 0).toBeGreaterThanOrEqual(2)
    expect(storeSource.match(/ohStoryDeliveryReceipts,/g)?.length || 0).toBeGreaterThanOrEqual(2)
    expect(storagePatchSource).toContain('oh_story_delivery_receipts: input.ohStoryDeliveryReceipts')
    expect(storagePatchSource).toContain('chapter_blueprint: receipts?.chapter_blueprint')
    expect(storagePatchSource).toContain('scene_card_receipts: receipts?.scene_card_receipts')
    expect(storagePatchSource).toContain('delivery_risk_receipts: receipts?.delivery_risk_receipts')
    expect(storagePatchSource).toContain('revision_receipts: receipts?.revision_receipts')
  })

  test('prose generation stores post-draft oh-story director after delivery receipts and quality review', () => {
    const source = writingServiceSource()
    const storagePatchSource = readChapterProseStoragePatchSource()
    const postDraftStart = source.indexOf('const postDraftDirector = buildOhStoryDirectorForPostDraft')
    const postReviewBlock = source.slice(Math.max(0, postDraftStart - 2500), postDraftStart + 2500)
    const acceptanceNeedle = 'chapter_patch: chapterPatch'
    const acceptanceHit = source.indexOf(acceptanceNeedle)
    const acceptanceBlock = source.slice(Math.max(0, acceptanceHit - 400), acceptanceHit + 2400)
    const fullProductionPrepareStart = source.indexOf("await onStage('story_state', { status: 'running', phase: 'prepare' })")
    const fullProductionPreAcceptanceBlock = fullProductionPrepareStart >= 0
      ? source.slice(fullProductionPrepareStart, fullProductionPrepareStart + 1800)
      : ''

    expect(source).toContain('buildOhStoryDirectorForPostDraft')
    expect(postDraftStart).toBeGreaterThanOrEqual(0)
    expect(postReviewBlock).toContain('const postDraftDirector = buildOhStoryDirectorForPostDraft')
    expect(postReviewBlock).toContain('const postDeliveryReceiptChecks = [')
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
    expect(acceptanceHit).toBeGreaterThanOrEqual(0)
    expect(acceptanceBlock).toContain('chapter_patch: chapterPatch')
    expect(acceptanceBlock).toContain('...pendingGeneratedReviews')
    expect(acceptanceBlock).toContain("buildProseQualityReview(precommitAdmission.status === 'accepted' ? 'ok' : 'warn'")
    expect(acceptanceBlock).toContain('settingConsistencyReview,')
    expect(acceptanceBlock.indexOf('...pendingGeneratedReviews')).toBeLessThan(acceptanceBlock.indexOf('buildProseQualityReview('))
    expect(acceptanceBlock.indexOf('buildProseQualityReview(')).toBeLessThan(acceptanceBlock.indexOf('settingConsistencyReview,'))
    expect(fullProductionPrepareStart).toBeGreaterThanOrEqual(0)
    expect(fullProductionPreAcceptanceBlock).not.toContain('await createNovelReview(activeWorkspace')
  })

  test('prose generation preserves pre-draft execution receipts for write-preparation diagnostics', () => {
    const draftSource = readDraftReceiptSource()
    const finalReceiptBlock = readFinalReceiptRefreshSource()
    const carryOverSource = deliveryRiskCarryOverSource()
    const storagePatchSource = readChapterProseStoragePatchSource()
    const normalizeBlock = carryOverSource.slice(
      carryOverSource.indexOf('export function normalizeStoredOhStoryDeliveryReceipts'),
      carryOverSource.indexOf('\nexport function', carryOverSource.indexOf('export function normalizeStoredOhStoryDeliveryReceipts') + 1),
    )
    expect(normalizeBlock).toContain('pre_draft_execution_receipts')
    expect(normalizeBlock).toContain('preDraftExecutionReceipts')
    expect(storagePatchSource).toContain('pre_draft_execution_receipts: receipts?.pre_draft_execution_receipts')
    expect(draftSource).toContain('resultPayload?.pre_draft_execution_receipts')
    expect(draftSource).toContain('targetProse?.pre_draft_execution_receipts')
    expect(finalReceiptBlock).toContain('revisionDeliveryReceipts?.pre_draft_execution_receipts')
  })

  test('prose generation refreshes stored oh-story receipts from the final reviewed draft before storage', () => {
    const draftSource = readDraftReceiptSource()
    const finalReceiptBlock = readFinalReceiptRefreshSource()

    expect(draftSource).toContain('let ohStoryDeliveryReceipts = normalizeStoredOhStoryDeliveryReceipts')
    expect(finalReceiptBlock).toContain('ohStoryDeliveryReceipts = normalizeStoredOhStoryDeliveryReceipts')
    expect(finalReceiptBlock).toContain('finalSceneBreakdown')
    expect(finalReceiptBlock).toContain('selfCheck?.review')
    expect(finalReceiptBlock).toContain('normalizeDeliveryRiskReceipts(selfCheck?.review || {}, finalReviewContextPackage, finalText)')
    expect(finalReceiptBlock).toContain('selfCheck?.revision')
  })

  test('prose generation refreshes stored oh-story receipts from nested revision delivery receipts', () => {
    const finalReceiptBlock = readFinalReceiptRefreshSource()

    expect(finalReceiptBlock).toContain('const revisionDeliveryReceipts = selfCheck?.revision?.oh_story_delivery_receipts')
    expect(finalReceiptBlock).toContain('revisionDeliveryReceipts?.scene_card_receipts')
    expect(finalReceiptBlock).toContain('revisionDeliveryReceipts?.delivery_risk_receipts')
    expect(finalReceiptBlock).toContain('revisionDeliveryReceipts?.revision_receipts')
  })

  test('prose generation preserves nested deslop and quality repair receipts in stored oh-story receipts', () => {
    const finalReceiptBlock = readFinalReceiptRefreshSource()

    expect(finalReceiptBlock).toContain('deslop_repair_receipts')
    expect(finalReceiptBlock).toContain('revisionDeliveryReceipts?.deslop_repair_receipts')
    expect(finalReceiptBlock).toContain('quality_audit_repair_receipts')
    expect(finalReceiptBlock).toContain('revisionDeliveryReceipts?.quality_audit_repair_receipts')
  })

  test('prose generation deduplicates final delivery risk receipts before storage', () => {
    const finalReceiptBlock = readFinalReceiptRefreshSource()

    const deliveryRiskCoreSource = readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/delivery-risk-core.ts'), 'utf8')
    expect(deliveryRiskCoreSource).toContain('export function uniqueDeliveryRiskReceipts')
    expect(finalReceiptBlock).toContain('delivery_risk_receipts: uniqueDeliveryRiskReceipts([')
  })

  test('prose generation prefers nested revision scene-card receipts over stale final scene breakdown receipts', () => {
    const finalReceiptBlock = readFinalReceiptRefreshSource()

    const sceneReceiptMergeBlock = finalReceiptBlock.slice(
      finalReceiptBlock.indexOf('scene_card_receipts: ['),
      finalReceiptBlock.indexOf('delivery_risk_receipts:', finalReceiptBlock.indexOf('scene_card_receipts: [')),
    )

    expect(sceneReceiptMergeBlock.indexOf('revisionDeliveryReceipts?.scene_card_receipts')).toBeLessThan(sceneReceiptMergeBlock.indexOf('finalSceneBreakdown'))
  })

  test('prose generation prefers nested revision scene-card receipts over stale draft delivery receipts', () => {
    const finalReceiptBlock = readFinalReceiptRefreshSource()
    const sceneReceiptMergeBlock = finalReceiptBlock.slice(
      finalReceiptBlock.indexOf('scene_card_receipts: ['),
      finalReceiptBlock.indexOf('delivery_risk_receipts:', finalReceiptBlock.indexOf('scene_card_receipts: [')),
    )

    expect(sceneReceiptMergeBlock.indexOf('revisionDeliveryReceipts?.scene_card_receipts')).toBeLessThan(sceneReceiptMergeBlock.indexOf('ohStoryDeliveryReceipts?.scene_card_receipts'))
  })

  test('prose generation prefers nested revision receipts over stale draft delivery receipts', () => {
    const finalReceiptBlock = readFinalReceiptRefreshSource()
    const revisionReceiptMergeBlock = finalReceiptBlock.slice(
      finalReceiptBlock.indexOf('revision_receipts: ['),
      finalReceiptBlock.indexOf('],', finalReceiptBlock.indexOf('revision_receipts: [')),
    )

    expect(revisionReceiptMergeBlock.indexOf('revisionDeliveryReceipts?.revision_receipts')).toBeLessThan(revisionReceiptMergeBlock.indexOf('ohStoryDeliveryReceipts?.revision_receipts'))
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
    const source = writingServiceSource()

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
    const source = writingServiceSource()

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
    const source = writingServiceSource()

    expect(source).toContain("reviewType: 'reader_retention_sync'")
    expect(source).toContain('buildReaderRetentionSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.reader_retention_sync = readerRetentionSync')
  })

  test('story state sync persists a chapter_attraction_review review', () => {
    const source = writingServiceSource()

    expect(source).toContain("reviewType: 'chapter_attraction_review'")
    expect(source).toContain('buildChapterAttractionReviewReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.chapter_attraction_review = chapterAttractionReview')
  })
})
