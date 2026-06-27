import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { applyRequestBatchPreflight, extractOhStoryDeliveryReceipts, refreshOhStoryDeliveryReceiptsAfterRevision, selectTargetProsePayload } from './novel-generation-routes'

describe('novel generate prose route source guards', () => {
  test('selects camelCase prose chapter payloads from direct draft generation', () => {
    const selected = selectTargetProsePayload({
      proseChapters: [
        { chapterNo: 2, chapterText: '第二章正文' },
        { chapterNo: 3, chapterText: '第三章正文', sceneBreakdown: [{ sceneNo: 1 }], continuityNotes: ['主角已入城'] },
      ],
    }, 3)

    expect(selected).toMatchObject({
      chapterNo: 3,
      chapterText: '第三章正文',
      sceneBreakdown: [{ sceneNo: 1 }],
      continuityNotes: ['主角已入城'],
    })
  })

  test('extracts oh-story delivery receipts from the selected prose payload before storage', () => {
    const receipts = extractOhStoryDeliveryReceipts(
      {
        chapter_no: 9,
        chapter_text: '旧印裂开，第二枚门牌露出半截。',
        chapter_blueprint: { objective: '逼出账册', conflict: '楼规压迫' },
        scene_card_receipts: [{ scene_no: 1, delivered: true, evidence: '旧印裂开' }],
        delivery_risk_receipts: [{ risk_item: '章末钩子', delivered: true, changed_evidence: '第二枚门牌露出半截', remaining_risk: '' }],
        revision_receipts: [{ required_action: '承接上一章门牌异变', applied_fix: '开场承接旧印', changed_evidence: '旧印裂开' }],
      },
      {
        chapterBlueprint: { objective: '顶层不应覆盖目标章' },
        sceneCardReceipts: [{ sceneNo: 2, delivered: false }],
        deliveryRiskReceipts: [{ riskItem: '顶层风险' }],
        revisionReceipts: [{ requiredAction: '顶层动作' }],
      },
    )

    expect(receipts).toMatchObject({
      chapter_blueprint: { objective: '逼出账册' },
      scene_card_receipts: [{ scene_no: 1, delivered: true }],
      delivery_risk_receipts: [{ risk_item: '章末钩子', delivered: true }],
      revision_receipts: [{ required_action: '承接上一章门牌异变' }],
    })
    expect(receipts.scene_card_receipts[0].evidence).toContain('旧印裂开')
    expect(receipts.delivery_risk_receipts[0].changed_evidence).toContain('第二枚门牌')
  })

  test('extracts camelCase oh-story delivery receipts when model returns top-level prose fields', () => {
    const receipts = extractOhStoryDeliveryReceipts({}, {
      chapterBlueprint: { objective: '守住章末问题' },
      sceneCardReceipts: [{ sceneNo: 1, delivered: true, evidence: '他把门牌按回桌面。' }],
      deliveryRiskReceipts: [{ riskItem: '开篇承接', delivered: true, changedEvidence: '他把门牌按回桌面。', remainingRisk: '' }],
      revisionReceipts: [{ requiredAction: '承接上一章', appliedFix: '从门牌继续', changedEvidence: '他把门牌按回桌面。' }],
    })

    expect(receipts.chapter_blueprint.objective).toBe('守住章末问题')
    expect(receipts.scene_card_receipts[0].sceneNo).toBe(1)
    expect(receipts.delivery_risk_receipts[0].changedEvidence).toContain('门牌')
    expect(receipts.revision_receipts[0].requiredAction).toBe('承接上一章')
  })

  test('extracts nested oh-story delivery receipts from the selected prose payload', () => {
    const receipts = extractOhStoryDeliveryReceipts(
      {
        chapter_no: 12,
        oh_story_delivery_receipts: {
          chapter_blueprint: { objective: '逼出第二枚门牌' },
          scene_card_receipts: [{ scene_no: 1, delivered: true, evidence: ['门牌贴着旧账册边缘露出。'] }],
          delivery_risk_receipts: [{ risk_item: '章末追读', delivered: true, evidence: '门牌贴着旧账册边缘露出。', remaining_risk: '' }],
          revision_receipts: [{ required_action: '保留章末钩子', changed_evidence: '门牌贴着旧账册边缘露出。' }],
        },
      },
      {
        oh_story_delivery_receipts: {
          chapter_blueprint: { objective: '顶层不应覆盖目标章嵌套回执' },
        },
      },
    )

    expect(receipts.chapter_blueprint.objective).toBe('逼出第二枚门牌')
    expect(receipts.scene_card_receipts[0].evidence[0]).toContain('门牌')
    expect(receipts.delivery_risk_receipts[0]).toMatchObject({ risk_item: '章末追读', delivered: true })
    expect(receipts.revision_receipts[0].required_action).toBe('保留章末钩子')
  })

  test('extracts nested oh-story pre-draft execution receipts before storage', () => {
    const receipts = extractOhStoryDeliveryReceipts(
      {
        chapter_no: 13,
        oh_story_delivery_receipts: {
          pre_draft_execution_receipts: {
            status_filter_receipts: [
              { key: 'previous_chapter_state', delivered: true, evidence: '第二枚门牌仍在掌心滴水。' },
            ],
            intent_confirmation_checks: [
              { key: 'emotion_target', delivered: true, evidence: '他没有退，反把旧印按上门牌。' },
            ],
            benchmark_recall_checks: [
              { key: 'rhythm_reference', delivered: true, evidence: '三轮压问后才亮出第二枚门牌。' },
            ],
            style_sample_checks: [
              { key: 'dialogue_ratio', delivered: true, evidence: '对话推动逼问，旁白只做动作锚点。' },
            ],
          },
        },
      },
      {},
    )

    expect(receipts.pre_draft_execution_receipts.intent_confirmation_checks[0]).toMatchObject({
      key: 'emotion_target',
      delivered: true,
    })
    expect(receipts.pre_draft_execution_receipts.benchmark_recall_checks[0].evidence).toContain('三轮压问')
  })

  test('extracts nested oh-story deslop and quality repair receipts from standalone prose payloads', () => {
    const receipts = extractOhStoryDeliveryReceipts(
      {
        chapter_no: 12,
        oh_story_delivery_receipts: {
          deslop_repair_receipts: [
            {
              gate: 'F',
              label: '章末总结升华',
              changed_evidence: '城门方向的火把忽然断成两截。',
              remaining_risk: '',
            },
          ],
          quality_audit_repair_receipts: [
            {
              check_key: 'chapter_progress',
              label: '章节推进',
              changed_evidence: '守军听完旧证后立刻改了换防令。',
              remaining_risk: '',
            },
          ],
        },
      },
      {},
    )

    expect(receipts.deslop_repair_receipts[0]).toMatchObject({ gate: 'F', remaining_risk: '' })
    expect(receipts.quality_audit_repair_receipts[0]).toMatchObject({ check_key: 'chapter_progress', remaining_risk: '' })
  })

  test('refreshes standalone oh-story receipts from final scene breakdown and self-check revision payload', () => {
    const receipts = refreshOhStoryDeliveryReceiptsAfterRevision(
      {
        chapter_blueprint: { objective: '逼出旧账册' },
        scene_card_receipts: [{ scene_no: 1, delivered: false, evidence: '初稿证据' }],
        delivery_risk_receipts: [{ risk_item: '章末追读', delivered: false, evidence: '初稿没有兑现', remaining_risk: '没有压到章末' }],
        revision_receipts: [],
      },
      {
        review: {
          delivery_risk_receipts: [
            { risk_item: '章末追读', required_action: '把第二枚门牌压到最后一幕', delivered: true, evidence: '第二枚门牌在最后一幕翻出。', remaining_risk: '' },
          ],
        },
        revision: {
          scene_breakdown: [
            { scene_no: 1, scene_card_receipts: { scene_no: 1, delivered: true, evidence: ['李玄把旧账册压在门牌下。'] } },
          ],
          revision_receipts: [
            { required_action: '把追读钩子移回章末', applied_fix: '章末翻出第二枚门牌', changed_evidence: '第二枚门牌在最后一幕翻出。' },
          ],
        },
      },
      '李玄把旧账册压在门牌下。第二枚门牌在最后一幕翻出。',
    )

    expect(receipts.chapter_blueprint.objective).toBe('逼出旧账册')
    expect(receipts.scene_card_receipts).toEqual([{ scene_no: 1, delivered: true, evidence: ['李玄把旧账册压在门牌下。'] }])
    expect(receipts.delivery_risk_receipts[0]).toMatchObject({ risk_item: '章末追读', delivered: true, remaining_risk: '' })
    expect(receipts.revision_receipts[0].changed_evidence).toContain('第二枚门牌')
  })

  test('preserves pre-draft execution receipts when refreshing after self-review', () => {
    const receipts = refreshOhStoryDeliveryReceiptsAfterRevision(
      {
        pre_draft_execution_receipts: {
          intent_confirmation_checks: [
            { key: 'emotion_target', delivered: true, evidence: '他反把旧印按上门牌。' },
          ],
          benchmark_recall_checks: [
            { key: 'rhythm_reference', delivered: true, evidence: '三轮压问后亮证据。' },
          ],
        },
        scene_card_receipts: [{ scene_no: 1, delivered: true, evidence: '初稿证据' }],
      },
      {
        revision: {
          scene_breakdown: [
            { scene_no: 1, scene_card_receipts: { scene_no: 1, delivered: true, evidence: ['修订后证据'] } },
          ],
        },
      },
      '他反把旧印按上门牌，三轮压问后亮出证据。',
      [],
      {},
    )

    expect(receipts.pre_draft_execution_receipts.intent_confirmation_checks[0].evidence).toContain('旧印')
    expect(receipts.pre_draft_execution_receipts.benchmark_recall_checks[0].evidence).toContain('三轮压问')
    expect(receipts.scene_card_receipts[0].evidence[0]).toBe('修订后证据')
  })

  test('revalidates stale standalone delivery risk receipts against the final revised prose', () => {
    const receipts = refreshOhStoryDeliveryReceiptsAfterRevision(
      {
        delivery_risk_receipts: [
          {
            risk_item: '章末追读',
            required_action: '把第二枚门牌压到最后一幕',
            delivered: true,
            evidence: '第二枚门牌在最后一幕翻出。',
            remaining_risk: '',
          },
        ],
      },
      {
        review: {},
        revision: {
          revision_receipts: [
            { required_action: '压缩章末', applied_fix: '删掉门牌翻出', changed_evidence: '他合上旧账册。' },
          ],
        },
      },
      '他合上旧账册。',
    )

    expect(receipts.delivery_risk_receipts[0]).toMatchObject({
      risk_item: '章末追读',
      delivered: false,
    })
    expect(receipts.delivery_risk_receipts[0].remaining_risk).toContain('evidence 未落在最后300字')
  })

  test('creates missing standalone delivery risk receipts from carry-over context when model omits them', () => {
    const receipts = refreshOhStoryDeliveryReceiptsAfterRevision(
      {},
      { review: {}, revision: {} },
      '他合上旧账册。',
      [],
      {
        chapter_target: {
          delivery_risk_carry_over: {
            label: '上一章交稿风险',
            items: ['章末追读没有把第二枚门牌压到最后一幕'],
            required_actions: ['把第二枚门牌压到最后一幕'],
            ending_actions: ['最后300字必须露出第二枚门牌'],
          },
        },
      },
    )

    expect(receipts.delivery_risk_receipts[0]).toMatchObject({
      risk_item: '章末追读没有把第二枚门牌压到最后一幕',
      required_action: '把第二枚门牌压到最后一幕',
      delivered: false,
    })
    expect(receipts.delivery_risk_receipts[0].remaining_risk).toContain('缺少 delivery_risk_receipts')
  })

  test('refreshes standalone receipts from nested oh-story receipts returned by self-check revision', () => {
    const receipts = refreshOhStoryDeliveryReceiptsAfterRevision(
      {
        chapter_blueprint: { objective: '逼出旧账册' },
        scene_card_receipts: [{ scene_no: 1, delivered: false, evidence: '初稿证据' }],
      },
      {
        review: {},
        revision: {
          oh_story_delivery_receipts: {
            scene_card_receipts: [
              { scene_no: 1, delivered: true, evidence: ['旧账册压住第二枚门牌。'] },
            ],
            delivery_risk_receipts: [
              { risk_item: '章末追读', required_action: '把第二枚门牌压到最后一幕', delivered: true, evidence: '旧账册压住第二枚门牌。', remaining_risk: '' },
            ],
            revision_receipts: [
              { required_action: '补章末门牌钩子', changed_evidence: '旧账册压住第二枚门牌。' },
            ],
          },
        },
      },
      '旧账册压住第二枚门牌。',
    )

    expect(receipts.scene_card_receipts[0]).toMatchObject({ scene_no: 1, delivered: true })
    expect(receipts.delivery_risk_receipts[0]).toMatchObject({ risk_item: '章末追读', delivered: true, remaining_risk: '' })
    expect(receipts.revision_receipts[0].required_action).toBe('补章末门牌钩子')
  })

  test('refreshes standalone deslop and quality repair receipts from nested self-check revision receipts', () => {
    const receipts = refreshOhStoryDeliveryReceiptsAfterRevision(
      {
        deslop_repair_receipts: [
          { gate: 'F', changed_evidence: '旧稿总结句。', remaining_risk: '旧稿残留总结腔。' },
        ],
        quality_audit_repair_receipts: [
          { check_key: 'chapter_progress', changed_evidence: '旧稿局势未变。', remaining_risk: '旧稿仍可删除。' },
        ],
      },
      {
        review: {},
        revision: {
          oh_story_delivery_receipts: {
            deslop_repair_receipts: [
              { gate: 'F', changed_evidence: '城门方向的火把忽然断成两截。', remaining_risk: '' },
            ],
            quality_audit_repair_receipts: [
              { check_key: 'chapter_progress', changed_evidence: '守军听完旧证后立刻改了换防令。', remaining_risk: '' },
            ],
          },
        },
      },
      '守军听完旧证后立刻改了换防令。城门方向的火把忽然断成两截。',
    )

    expect(receipts.deslop_repair_receipts).toEqual([
      { gate: 'F', changed_evidence: '城门方向的火把忽然断成两截。', remaining_risk: '' },
    ])
    expect(receipts.quality_audit_repair_receipts).toEqual([
      { check_key: 'chapter_progress', changed_evidence: '守军听完旧证后立刻改了换防令。', remaining_risk: '' },
    ])
  })

  test('prefers nested revision scene-card receipts over stale final scene breakdown receipts', () => {
    const receipts = refreshOhStoryDeliveryReceiptsAfterRevision(
      {},
      {
        review: {},
        revision: {
          oh_story_delivery_receipts: {
            scene_card_receipts: [
              { scene_no: 1, delivered: true, evidence: ['旧账册压住第二枚门牌。'] },
            ],
          },
        },
      },
      '旧账册压住第二枚门牌。',
      [
        { scene_no: 1, scene_card_receipts: { scene_no: 1, delivered: false, evidence: '初稿证据' } },
      ],
    )

    expect(receipts.scene_card_receipts).toEqual([
      { scene_no: 1, delivered: true, evidence: ['旧账册压住第二枚门牌。'] },
    ])
  })

  test('deduplicates standalone final delivery risk receipts by risk item and required action', () => {
    const receipts = refreshOhStoryDeliveryReceiptsAfterRevision(
      {
        delivery_risk_receipts: [
          { risk_item: '章末追读', required_action: '把第二枚门牌压到最后一幕', delivered: false, evidence: '初稿没有兑现', remaining_risk: '初稿缺章末门牌' },
        ],
      },
      {
        review: {},
        revision: {
          oh_story_delivery_receipts: {
            delivery_risk_receipts: [
              { risk_item: '章末追读', required_action: '把第二枚门牌压到最后一幕', delivered: true, evidence: '第二枚门牌在最后一幕翻出。', remaining_risk: '' },
            ],
          },
        },
      },
      '第二枚门牌在最后一幕翻出。',
    )

    expect(receipts.delivery_risk_receipts).toHaveLength(1)
    expect(receipts.delivery_risk_receipts[0]).toMatchObject({
      risk_item: '章末追读',
      required_action: '把第二枚门牌压到最后一幕',
      delivered: true,
      remaining_risk: '',
    })
  })

  test('stores oh-story delivery receipts in chapter raw payload and run output', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const draftStart = source.indexOf('let ohStoryDeliveryReceipts = extractOhStoryDeliveryReceipts', routeStart)
    const storeStart = source.indexOf("markStage('store'", draftStart)
    const runStart = source.indexOf('const pipelineResult =', storeStart)
    const storeBlock = source.slice(storeStart, runStart)
    const runBlock = source.slice(runStart, source.indexOf('await appendNovelRun', runStart))

    expect(draftStart).toBeGreaterThan(routeStart)
    expect(storeBlock).toContain('oh_story_delivery_receipts: ohStoryDeliveryReceipts')
    expect(storeBlock).toContain('chapter_blueprint: ohStoryDeliveryReceipts.chapter_blueprint')
    expect(storeBlock).toContain('pre_draft_execution_receipts: ohStoryDeliveryReceipts.pre_draft_execution_receipts')
    expect(storeBlock).toContain('scene_card_receipts: ohStoryDeliveryReceipts.scene_card_receipts')
    expect(storeBlock).toContain('delivery_risk_receipts: ohStoryDeliveryReceipts.delivery_risk_receipts')
    expect(storeBlock).toContain('revision_receipts: ohStoryDeliveryReceipts.revision_receipts')
    expect(storeBlock).toContain('deslop_repair_receipts: ohStoryDeliveryReceipts.deslop_repair_receipts')
    expect(storeBlock).toContain('quality_audit_repair_receipts: ohStoryDeliveryReceipts.quality_audit_repair_receipts')
    expect(runBlock).toContain('oh_story_delivery_receipts: ohStoryDeliveryReceipts')
  })

  test('refreshes oh-story delivery receipts after final self-review before standalone prose storage', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const receiptDeclaration = source.indexOf('let ohStoryDeliveryReceipts = extractOhStoryDeliveryReceipts', routeStart)
    const reviewStart = source.indexOf("markStage('review'", receiptDeclaration)
    const storeStart = source.indexOf("markStage('store'", reviewStart)
    const refreshStart = source.indexOf('ohStoryDeliveryReceipts = refreshOhStoryDeliveryReceiptsAfterRevision', reviewStart)
    const refreshBlock = source.slice(refreshStart, storeStart)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(receiptDeclaration).toBeGreaterThan(routeStart)
    expect(refreshStart).toBeGreaterThan(reviewStart)
    expect(refreshStart).toBeLessThan(storeStart)
    expect(refreshBlock).toContain('finalSceneBreakdown')
    expect(refreshBlock).toContain('selfCheck')
    expect(refreshBlock).toContain('finalText')
    expect(refreshBlock).toContain('contextPackage')
  })

  test('reads camelCase prose fields after selecting direct draft output', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const draftStart = source.indexOf('const resultPayload = getNovelPayload(result)', routeStart)
    const failureStart = source.indexOf('if (!chapterText)', draftStart)
    const draftBlock = source.slice(draftStart, failureStart)

    expect(draftBlock).toContain('targetProse?.chapterText')
    expect(draftBlock).toContain('resultPayload?.chapterText')
    expect(draftBlock).toContain('targetProse?.sceneBreakdown')
    expect(draftBlock).toContain('resultPayload?.sceneBreakdown')
    expect(draftBlock).toContain('targetProse?.continuityNotes')
    expect(draftBlock).toContain('resultPayload?.continuityNotes')
  })

  test('declares word target before the generate-prose scene-card branch can refresh it', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const routeEnd = source.indexOf("const prevChapters = chapters", routeStart)
    const setupBlock = source.slice(routeStart, routeEnd)

    const declarationIndex = setupBlock.indexOf('let wordTarget = resolveChapterWordTarget(project, chapter, req.body || {})')
    const contextIndex = setupBlock.indexOf('let contextPackage = applyChapterWordTargetToContext(')
    const refreshIndex = setupBlock.indexOf('wordTarget = resolveChapterWordTarget(project, chapter, req.body || {})', contextIndex + 1)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(declarationIndex).toBeGreaterThanOrEqual(0)
    expect(contextIndex).toBeGreaterThan(declarationIndex)
    expect(refreshIndex).toBeGreaterThan(contextIndex)
  })

  test('applies word target context in the standalone scene-cards route', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/scene-cards'")
    const routeEnd = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'", routeStart)
    const routeBlock = source.slice(routeStart, routeEnd)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(routeBlock).toContain('const wordTarget = resolveChapterWordTarget(project, chapter, req.body || {})')
    expect(routeBlock).toContain('const contextPackage = applyChapterWordTargetToContext(')
    expect(routeBlock).toContain('wordTarget,')
  })

  test('enforces chapter word target before self-review and storage', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const reviewStart = source.indexOf("markStage('review'", routeStart)
    const storeStart = source.indexOf("markStage('store'", routeStart)
    const beforeReviewBlock = source.slice(routeStart, reviewStart)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(reviewStart).toBeGreaterThan(routeStart)
    expect(storeStart).toBeGreaterThan(reviewStart)
    expect(beforeReviewBlock).toContain('ctx.ensureProseMeetsWordTarget(')
  })

  test('applies longform compass override from generate-prose requests', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const routeEnd = source.indexOf("const prevChapters = chapters", routeStart)
    const setupBlock = source.slice(routeStart, routeEnd)

    expect(setupBlock).toContain('applyRequestLongformCompass(')
    expect(source).toContain('req.body?.longform_compass')
    expect(source).toContain('chapter_target: { ...contextPackage.chapter_target, longform_compass: req.body.longform_compass }')
  })

  test('applies longform battle context override from generate-prose requests', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const routeEnd = source.indexOf("const prevChapters = chapters", routeStart)
    const setupBlock = source.slice(routeStart, routeEnd)

    expect(setupBlock).toContain('applyRequestLongformBattleContext(')
    expect(source).toContain('req.body?.longform_battle_context')
    expect(source).toContain('chapter_target: { ...contextPackage.chapter_target, longform_battle_context: req.body.longform_battle_context }')
  })

  test('applies next batch brief override from generate-prose requests', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const routeEnd = source.indexOf("const prevChapters = chapters", routeStart)
    const setupBlock = source.slice(routeStart, routeEnd)

    expect(setupBlock).toContain('applyRequestNextBatchBrief(')
    expect(source).toContain('req.body?.next_batch_brief')
    expect(source).toContain('chapter_target: { ...contextPackage.chapter_target, next_batch_brief: req.body.next_batch_brief }')
  })

  test('applies chapter launch gate override from generate-prose requests', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const routeEnd = source.indexOf("const prevChapters = chapters", routeStart)
    const setupBlock = source.slice(routeStart, routeEnd)

    expect(setupBlock).toContain('applyRequestChapterLaunchGate(')
    expect(source).toContain('req.body?.chapter_launch_gate')
    expect(source).toContain('chapter_target: { ...contextPackage.chapter_target, chapter_launch_gate: req.body.chapter_launch_gate }')
  })

  test('applies safe batch preflight override from generate-prose requests', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const routeEnd = source.indexOf("const prevChapters = chapters", routeStart)
    const setupBlock = source.slice(routeStart, routeEnd)

    expect(setupBlock).toContain('applyRequestBatchPreflight(')
    expect(source).toContain('req.body?.batch_preflight || req.body?.batchPreflight')
    expect(source).toContain('const deliveryRiskCarryOver = batchPreflight?.delivery_risk_carry_over')
    expect(source).toContain('const chapterHandoffContract = batchPreflight?.chapter_handoff_contract')
    expect(source).toContain('const previousHandoff = chapterHandoffContract?.previous_handoff')
    expect(source).toContain('batch_preflight: batchPreflight')
    expect(source).toContain('delivery_risk_carry_over: deliveryRiskCarryOver')
    expect(source).toContain('chapter_handoff_contract: chapterHandoffContract')
    expect(source).toContain('previous_handoff: previousHandoff')
  })

  test('normalizes camelCase safe batch preflight into chapter target prompt context', () => {
    const context = applyRequestBatchPreflight(
      { chapter_target: { chapter_no: 8 } },
      {
        body: {
          batchPreflight: {
            deliveryRiskCarryOver: { items: ['章末翻页问题未闭环'] },
            chapterHandoffContract: {
              previousHandoff: '第7章最后一幕：阵盘亮起第二道裂纹。',
              mustAnswer: ['裂纹异变'],
            },
          },
        },
      },
    )

    expect(context.batch_preflight).toMatchObject({
      deliveryRiskCarryOver: { items: ['章末翻页问题未闭环'] },
      chapterHandoffContract: {
        previousHandoff: '第7章最后一幕：阵盘亮起第二道裂纹。',
      },
    })
    expect(context.delivery_risk_carry_over).toEqual({ items: ['章末翻页问题未闭环'] })
    expect(context.chapter_handoff_contract).toMatchObject({ mustAnswer: ['裂纹异变'] })
    expect(context.previous_handoff).toBe('第7章最后一幕：阵盘亮起第二道裂纹。')
    expect(context.chapter_target).toMatchObject({
      chapter_no: 8,
      delivery_risk_carry_over: { items: ['章末翻页问题未闭环'] },
      previous_handoff: '第7章最后一幕：阵盘亮起第二道裂纹。',
    })
  })

  test('applies million word runway override from generate-prose requests', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const routeEnd = source.indexOf("const prevChapters = chapters", routeStart)
    const setupBlock = source.slice(routeStart, routeEnd)

    expect(setupBlock).toContain('applyRequestMillionWordRunway(')
    expect(source).toContain('req.body?.million_word_runway')
    expect(source).toContain('chapter_target: { ...contextPackage.chapter_target, million_word_runway: req.body.million_word_runway }')
  })

  test('runs commercial editor rewrite after word-target expansion and before self-review', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const firstWordTarget = source.indexOf('const wordTargetCheck = await ctx.ensureProseMeetsWordTarget', routeStart)
    const editorStart = source.indexOf('ctx.runCommercialEditorRewrite(', routeStart)
    const reviewStart = source.indexOf("markStage('review'", routeStart)
    const contextTypeStart = source.indexOf('type GenerationRoutesContext =')
    const contextTypeEnd = source.indexOf('function buildTextDiffSummary', contextTypeStart)
    const contextTypeBlock = source.slice(contextTypeStart, contextTypeEnd)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(firstWordTarget).toBeGreaterThan(routeStart)
    expect(editorStart).toBeGreaterThan(firstWordTarget)
    expect(editorStart).toBeLessThan(reviewStart)
    expect(contextTypeBlock).toContain('runCommercialEditorRewrite:')
  })

  test('stores runtime diagnostics when the prose draft model returns no chapter text', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const failureStart = source.indexOf("String((result as any).error || (result as any).fallbackReason || '模型未返回正文')")
    const nextStage = source.indexOf("let selfCheck", failureStart)
    const failureBlock = source.slice(failureStart, nextStage)

    expect(failureStart).toBeGreaterThanOrEqual(0)
    expect(failureBlock).toContain('result_error')
    expect(failureBlock).toContain('runtime_selection')
    expect(failureBlock).toContain('llm_diagnostics')
  })

  test('uses plain prose fallback before failing an otherwise non-json draft response', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const draftStart = source.indexOf('const resultPayload = getNovelPayload(result)', routeStart)
    const failureStart = source.indexOf("if (!chapterText)", draftStart)
    const draftBlock = source.slice(draftStart, failureStart)

    expect(draftBlock).toContain('extractPlainProseFallback(result, 800)')
    expect(draftBlock).toContain('|| plainProseFallback')
  })

  test('does not fail draft generation solely because a recovered result still has an error field', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const draftStart = source.indexOf('const resultPayload = getNovelPayload(result)', routeStart)
    const failureStart = source.indexOf('const resultError = String(', draftStart)
    const failureBlock = source.slice(draftStart, failureStart)

    expect(failureBlock).toContain('const chapterText =')
    expect(failureBlock).toContain('if (!chapterText)')
    expect(failureBlock).not.toContain('(result as any).error || !chapterText')
  })

  test('stores LLM diagnostics when standalone scene-card generation returns no cards', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/scene-cards'")
    const routeEnd = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'", routeStart)
    const routeBlock = source.slice(routeStart, routeEnd)

    expect(routeBlock).toContain('buildLLMResultDiagnostics(result.result)')
    expect(routeBlock).toContain("run_type: 'scene_cards'")
    expect(routeBlock).toContain("status: 'failed'")
  })

  test('exposes an unattended chapter goal route that creates full-auto chapter group runs', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/projects/:id/chapter-groups/start-unattended'")
    const routeEnd = source.indexOf("app.post('/api/novel/projects/:id/chapter-groups/:runId/execute'", routeStart)
    const routeBlock = source.slice(routeStart, routeEnd)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(routeBlock).toContain('target_chapter')
    expect(routeBlock).toContain('create_missing')
    expect(routeBlock).toContain("mode: 'unattended_goal'")
    expect(routeBlock).toContain("production_mode: 'full_auto'")
    expect(routeBlock).toContain('allow_full_auto: true')
    expect(routeBlock).toContain('auto_repair_missing_material')
    expect(routeBlock).toContain('worker_start_endpoint')
    expect(routeBlock).toContain('created_chapters')
  })

  test('requires an explicit target chapter for unattended writing goals', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/projects/:id/chapter-groups/start-unattended'")
    const routeEnd = source.indexOf("app.post('/api/novel/projects/:id/chapter-groups/:runId/execute'", routeStart)
    const routeBlock = source.slice(routeStart, routeEnd)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(routeBlock).toContain('const rawTargetNo = Number(req.body.target_chapter || req.body.target_chapter_no || 0)')
    expect(routeBlock).toContain("if (!rawTargetNo) return res.status(400).json({ error: 'target_chapter required' })")
    expect(routeBlock).toContain('if (rawTargetNo < startNo) return res.status(400).json({ error:')
    expect(routeBlock).toContain("error_code: 'UNATTENDED_TARGET_BEFORE_START'")
    expect(routeBlock).toContain('const targetNo = rawTargetNo')
    expect(routeBlock).not.toContain('const targetNo = Math.max(startNo, Number(req.body.target_chapter || req.body.target_chapter_no || 0))')
  })

  test('keeps unattended writing strict unless incomplete generation is explicitly enabled', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/projects/:id/chapter-groups/start-unattended'")
    const routeEnd = source.indexOf("app.post('/api/novel/projects/:id/chapter-groups/:runId/execute'", routeStart)
    const routeBlock = source.slice(routeStart, routeEnd)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(routeBlock).toContain('allow_incomplete: req.body.allow_incomplete === true')
    expect(routeBlock).not.toContain('allow_incomplete: req.body.allow_incomplete !== false')
  })
})
