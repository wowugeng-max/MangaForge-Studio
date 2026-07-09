import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { applyRequestBatchPreflight, compactGenerationRequestOverride, compactStandaloneProseProgressStage, extractOhStoryDeliveryReceipts, refreshOhStoryDeliveryReceiptsAfterRevision, selectTargetProsePayload, stringifyNovelGenerationPayload } from './novel-generation-routes'

describe('novel generate prose route source guards', () => {
  test('serializes circular generation payloads without losing shared arrays', () => {
    const shared = [{ chapter_no: 1, status: 'success' }]
    const payload: any = {
      chapters: shared,
      results: shared,
      context_package: { label: '上下文' },
    }
    payload.context_package.self = payload.context_package

    const parsed = JSON.parse(stringifyNovelGenerationPayload(payload))

    expect(parsed.chapters[0]).toEqual({ chapter_no: 1, status: 'success' })
    expect(parsed.results[0]).toEqual({ chapter_no: 1, status: 'success' })
    expect(parsed.context_package.self).toBe('[Circular]')
  })

  test('uses safe serialization for generation run payloads', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')

    expect(source).not.toContain('input_ref: JSON.stringify(req.body || {})')
    expect(source).not.toContain('output_ref: JSON.stringify(output)')
    expect(source).not.toContain('output_ref: JSON.stringify({ ...payload, chapters')
    expect(source).not.toContain('JSON.stringify(payload).slice(0, 500)')
    expect(source).not.toContain('input_ref: JSON.stringify(req.body)')
    expect(source).not.toContain("output_ref: JSON.stringify({ error: '模型未返回场景卡'")
    expect(source).not.toContain('output_ref: JSON.stringify({ scene_cards: result.sceneCards')
  })

  test('compacts bulky generate-prose request overrides before injecting them into model context', () => {
    const huge = '诊断详情'.repeat(20000)
    const compacted = compactGenerationRequestOverride({
      status: 'blocked',
      label: '本章开写门禁未通过',
      summary: huge,
      signals: Array.from({ length: 30 }, (_, index) => ({
        key: `signal-${index}`,
        label: `信号 ${index}`,
        status: index === 0 ? 'block' : 'ok',
        detail: huge,
        debug: { chapters: Array.from({ length: 100 }, () => huge) },
      })),
      pipeline: Array.from({ length: 200 }, () => ({ detail: huge })),
      context_package: { huge },
      raw_payload: { huge },
    })
    const text = JSON.stringify(compacted)

    expect(text.length).toBeLessThan(12000)
    expect(text).not.toContain(huge)
    expect(compacted).toMatchObject({
      status: 'blocked',
      label: '本章开写门禁未通过',
    })
    expect(compacted.summary.length).toBeLessThan(900)
    expect(compacted.signals).toHaveLength(12)
    expect(compacted.signals[0]).toMatchObject({
      key: 'signal-0',
      status: 'block',
    })
    expect(compacted.context_package).toBeUndefined()
    expect(compacted.raw_payload).toBeUndefined()
  })

  test('compacts standalone prose progress stages before storing them in the SSE pipeline', () => {
    const huge = '同步风险中段兑现：'.repeat(1200)
    const stage = compactStandaloneProseProgressStage({
      key: 'scene_cards',
      label: '生成章节场景卡',
      status: 'success',
      detail: huge,
      scene_cards: Array.from({ length: 8 }, (_, index) => ({
        scene_no: index + 1,
        title: `场景${index + 1}`,
        required_beats: Array.from({ length: 80 }, () => huge),
        raw_payload: { huge },
      })),
      context_package: { huge },
      quality_gate: {
        passed: false,
        reasons: [huge, '承接回执未兑现 8 项：质量续航；质量诊断'],
      },
    })
    const text = JSON.stringify(stage)

    expect(stage.scene_cards).toBeUndefined()
    expect(stage.context_package).toBeUndefined()
    expect(stage.scene_card_count).toBe(8)
    expect(text.length).toBeLessThan(5000)
    expect(text).not.toContain(huge)
    expect(stage.quality_gate.reasons[0].length).toBeLessThan(260)
  })

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
    expect(receipts.delivery_risk_receipts[0].remaining_risk).toContain('承接回执缺失')
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

  test('auto-repairs standalone prose preflight gaps before returning blocked', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const contextTypeStart = source.indexOf('type GenerationRoutesContext =')
    const contextTypeEnd = source.indexOf('function buildTextDiffSummary', contextTypeStart)
    const contextTypeBlock = source.slice(contextTypeStart, contextTypeEnd)
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const blockedStart = source.indexOf("if (!contextPackage.preflight.ready && req.body?.allow_incomplete !== true)", routeStart)
    const beforeBlockedBlock = source.slice(routeStart, blockedStart)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(blockedStart).toBeGreaterThan(routeStart)
    expect(contextTypeBlock).toContain('autoRepairChapterPreflightGaps?:')
    expect(beforeBlockedBlock).toContain('ctx.autoRepairChapterPreflightGaps')
    expect(beforeBlockedBlock).toContain("markStage('material_repair'")
    expect(beforeBlockedBlock).toContain('chapters = await listNovelChapters(activeWorkspace, projectId)')
    expect(beforeBlockedBlock).toContain('contextPackage = applyChapterWordTargetToContext(')
  })

  test('routes standalone prose generation through the bounded chapter writing service before legacy draft prompting', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const contextTypeStart = source.indexOf('type GenerationRoutesContext =')
    const contextTypeEnd = source.indexOf('function buildTextDiffSummary', contextTypeStart)
    const contextTypeBlock = source.slice(contextTypeStart, contextTypeEnd)
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const contextBuildStart = source.indexOf('ctx.buildChapterContextPackage(', routeStart)
    const legacyDraftStart = source.indexOf('const result = await generateNovelChapterProse', routeStart)
    const serviceBranchStart = source.indexOf('if (ctx.generateChapterForGroup)', routeStart)
    const serviceCallStart = source.indexOf('ctx.generateChapterForGroup(activeWorkspace, projectId, chapterId', routeStart)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(contextBuildStart).toBeGreaterThan(routeStart)
    expect(legacyDraftStart).toBeGreaterThan(contextBuildStart)
    expect(contextTypeBlock).toContain('generateChapterForGroup?:')
    expect(serviceBranchStart).toBeGreaterThan(routeStart)
    expect(serviceBranchStart).toBeLessThan(contextBuildStart)
    expect(serviceCallStart).toBeGreaterThan(serviceBranchStart)
    expect(serviceCallStart).toBeLessThan(contextBuildStart)
  })

  test('standalone prose service path auto-confirms scene cards without bypassing quality or safety approvals', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const serviceBranchStart = source.indexOf('if (ctx.generateChapterForGroup)', routeStart)
    const serviceCallStart = source.indexOf('ctx.generateChapterForGroup(activeWorkspace, projectId, chapterId', serviceBranchStart)
    const serviceBlock = source.slice(serviceBranchStart, serviceCallStart)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(serviceBranchStart).toBeGreaterThan(routeStart)
    expect(serviceBlock).toContain('standaloneProseServiceApprovals(req.body?.approvals)')
    expect(serviceBlock).toContain('scene_cards: { approved: true')
    expect(serviceBlock).not.toContain('quality_gate: { approved: true')
    expect(serviceBlock).not.toContain('low_score: { approved: true')
    expect(serviceBlock).not.toContain('safety: { approved: true')
  })

  test('standalone prose service path aborts generation only on real client disconnects', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const serviceBranchStart = source.indexOf('if (ctx.generateChapterForGroup)', routeStart)
    const serviceCallStart = source.indexOf('ctx.generateChapterForGroup(activeWorkspace, projectId, chapterId', serviceBranchStart)
    const serviceCallEnd = source.indexOf('const updated = serviceResult?.chapter || null', serviceCallStart)
    const serviceBlock = source.slice(serviceBranchStart, serviceCallEnd)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(serviceBranchStart).toBeGreaterThan(routeStart)
    expect(serviceBlock).toContain('const abortController = new AbortController()')
    expect(serviceBlock).not.toContain("req.on('close', abortStandaloneProseGeneration)")
    expect(serviceBlock).not.toContain("req.off('close', abortStandaloneProseGeneration)")
    expect(serviceBlock).toContain("req.on('aborted', abortStandaloneProseGeneration)")
    expect(serviceBlock).toContain("res.on('close', abortStandaloneProseGeneration)")
    expect(serviceBlock).toContain("req.socket?.on('close', abortStandaloneProseGeneration)")
    expect(serviceBlock).toContain("res.socket?.on('close', abortStandaloneProseGeneration)")
    expect(serviceBlock).toContain('const standaloneProseAbortPoll = setInterval')
    expect(serviceBlock).not.toContain('req.destroyed')
    expect(serviceBlock).toContain('res.destroyed')
    expect(serviceBlock).toContain('clearInterval(standaloneProseAbortPoll)')
    expect(serviceBlock).toContain('abortSignal: abortController.signal')
    expect(serviceBlock).toContain('cleanupStandaloneProseAbortListeners()')
    expect(serviceBlock).toContain("req.socket?.off('close', abortStandaloneProseGeneration)")
    expect(serviceBlock).toContain("res.socket?.off('close', abortStandaloneProseGeneration)")
  })

  test('standalone prose service path keeps a lightweight SSE heartbeat during long model calls', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const serviceBranchStart = source.indexOf('if (ctx.generateChapterForGroup)', routeStart)
    const serviceCallStart = source.indexOf('ctx.generateChapterForGroup(activeWorkspace, projectId, chapterId', serviceBranchStart)
    const serviceCallEnd = source.indexOf('const updated = serviceResult?.chapter || null', serviceCallStart)
    const serviceBlock = source.slice(serviceBranchStart, serviceCallEnd)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(serviceBranchStart).toBeGreaterThan(routeStart)
    expect(serviceBlock).toContain('const writeStandaloneProseHeartbeat =')
    expect(serviceBlock).toContain("res.write(': mangaforge-prose-heartbeat\\n\\n')")
    expect(serviceBlock).toContain('const standaloneProseHeartbeat = setInterval')
    expect(serviceBlock).toContain('clearInterval(standaloneProseHeartbeat)')
    expect(serviceBlock).toContain('abortStandaloneProseGeneration()')
  })

  test('reuses refreshed materials after standalone preflight repair', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const blockedStart = source.indexOf("if (!contextPackage.preflight.ready && req.body?.allow_incomplete !== true)", routeStart)
    const beforeBlockedBlock = source.slice(routeStart, blockedStart)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(beforeBlockedBlock).toContain('let [worldbuilding, characters, outlines, reviews]')
    expect(beforeBlockedBlock).toContain('const repairedMaterials = await Promise.all')
    expect(beforeBlockedBlock).toContain('worldbuilding = repairedMaterials[0]')
    expect(beforeBlockedBlock).toContain('characters = repairedMaterials[1]')
    expect(beforeBlockedBlock).toContain('outlines = repairedMaterials[2]')
    expect(beforeBlockedBlock).toContain('reviews = repairedMaterials[3]')
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
    expect(source).toContain('const longformCompass = compactGenerationRequestOverride(req.body.longform_compass)')
    expect(source).toContain('chapter_target: { ...contextPackage.chapter_target, longform_compass: longformCompass }')
  })

  test('applies longform battle context override from generate-prose requests', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const routeEnd = source.indexOf("const prevChapters = chapters", routeStart)
    const setupBlock = source.slice(routeStart, routeEnd)

    expect(setupBlock).toContain('applyRequestLongformBattleContext(')
    expect(source).toContain('req.body?.longform_battle_context')
    expect(source).toContain('const longformBattleContext = compactGenerationRequestOverride(req.body.longform_battle_context)')
    expect(source).toContain('chapter_target: { ...contextPackage.chapter_target, longform_battle_context: longformBattleContext }')
  })

  test('applies next batch brief override from generate-prose requests', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const routeEnd = source.indexOf("const prevChapters = chapters", routeStart)
    const setupBlock = source.slice(routeStart, routeEnd)

    expect(setupBlock).toContain('applyRequestNextBatchBrief(')
    expect(source).toContain('req.body?.next_batch_brief')
    expect(source).toContain('const nextBatchBrief = compactGenerationRequestOverride(req.body.next_batch_brief)')
    expect(source).toContain('chapter_target: { ...contextPackage.chapter_target, next_batch_brief: nextBatchBrief }')
  })

  test('applies chapter launch gate override from generate-prose requests', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const routeEnd = source.indexOf("const prevChapters = chapters", routeStart)
    const setupBlock = source.slice(routeStart, routeEnd)

    expect(setupBlock).toContain('applyRequestChapterLaunchGate(')
    expect(source).toContain('req.body?.chapter_launch_gate')
    expect(source).toContain('const chapterLaunchGate = compactGenerationRequestOverride(req.body.chapter_launch_gate)')
    expect(source).toContain('chapter_target: { ...contextPackage.chapter_target, chapter_launch_gate: chapterLaunchGate }')
  })

  test('blocks standalone prose generation on hard chapter launch gate before draft', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const blockerStart = source.indexOf('const launchGateBlocker = getChapterLaunchGateBlocker', routeStart)
    const sceneCardsStart = source.indexOf("markStage('scene_cards'", routeStart)
    const draftStart = source.indexOf("markStage('draft'", routeStart)
    const blockerBlock = source.slice(blockerStart, sceneCardsStart)

    expect(blockerStart).toBeGreaterThan(routeStart)
    expect(blockerStart).toBeLessThan(sceneCardsStart)
    expect(blockerStart).toBeLessThan(draftStart)
    expect(blockerBlock).toContain('standaloneChapterLaunchGateFromContext(contextPackage, chapter)')
    expect(blockerBlock).toContain("error_code: 'PROSE_LAUNCH_GATE_BLOCKED'")
    expect(blockerBlock).toContain('appendNovelRun')
  })

  test('applies safe batch preflight override from generate-prose requests', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const routeEnd = source.indexOf("const prevChapters = chapters", routeStart)
    const setupBlock = source.slice(routeStart, routeEnd)

    expect(setupBlock).toContain('applyRequestBatchPreflight(')
    expect(source).toContain('req.body?.batch_preflight || req.body?.batchPreflight')
    expect(source).toContain('const deliveryRiskCarryOver = compactGenerationRequestOverride(batchPreflight?.delivery_risk_carry_over')
    expect(source).toContain('const chapterHandoffContract = compactGenerationRequestOverride(batchPreflight?.chapter_handoff_contract')
    expect(source).toContain('const previousHandoff = chapterHandoffContract?.previous_handoff')
    expect(source).toContain('const compactBatchPreflight = compactGenerationRequestOverride(batchPreflight)')
    expect(source).toContain('batch_preflight: compactBatchPreflight')
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
    expect(source).toContain('const millionWordRunway = compactGenerationRequestOverride(req.body.million_word_runway)')
    expect(source).toContain('chapter_target: { ...contextPackage.chapter_target, million_word_runway: millionWordRunway }')
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

  test('standalone prose route rejects tiny editor or self-review final_text before replacing full prose', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const editorStart = source.indexOf('editorRewrite = await ctx.runCommercialEditorRewrite', routeStart)
    const selfReviewStart = source.indexOf('selfCheck = await ctx.runProseSelfReviewAndRevision', editorStart)
    const editorBlock = source.slice(editorStart, selfReviewStart)
    const selfReviewBlock = source.slice(selfReviewStart, source.indexOf('markStage(', selfReviewStart + 1))

    expect(editorBlock).toContain('selectUsableRevisionText(finalText, editorRewrite)')
    expect(editorBlock).not.toContain('finalText = editorRewrite.final_text || finalText')
    expect(selfReviewBlock).toContain('selectUsableRevisionText(finalText, selfCheck)')
    expect(selfReviewBlock).not.toContain('finalText = selfCheck.final_text || finalText')
  })

  test('standalone prose route blocks storage when oh-story quality gate still fails', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const qualityGateStart = source.indexOf('let qualityGateDecision = getQualityGateDecision', routeStart)
    const storeStart = source.indexOf("markStage('store'", routeStart)
    const qualityGateBlock = source.slice(qualityGateStart, storeStart)

    expect(qualityGateStart).toBeGreaterThan(routeStart)
    expect(qualityGateStart).toBeLessThan(storeStart)
    expect(source).toContain('const autoRepairQualityGate = req.body?.auto_repair_quality_gate === true || req.body?.quality_gate_repair === true')
    expect(qualityGateBlock).toContain('autoRepairQualityGate')
    expect(qualityGateBlock).toContain('const qualityRepair = await ctx.runProseSelfReviewAndRevision')
    expect(qualityGateBlock).toContain("error_code: 'PROSE_QUALITY_GATE_BLOCKED'")
    expect(qualityGateBlock).toContain('quality_gate: qualityGateDecision')
    expect(qualityGateBlock).toContain('appendNovelRun')
  })

  test('standalone prose route treats quality_gate_repair as an auto repair alias', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const reviewStart = source.indexOf("markStage('review', '执行章节自检'", routeStart)
    const qualityGateStart = source.indexOf('let qualityGateDecision = getQualityGateDecision', reviewStart)
    const storeStart = source.indexOf("markStage('store'", qualityGateStart)
    const routeBlock = source.slice(routeStart, storeStart)
    const qualityGateBlock = source.slice(qualityGateStart, storeStart)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(routeBlock).toContain('const autoRepairQualityGate = req.body?.auto_repair_quality_gate === true || req.body?.quality_gate_repair === true')
    expect(routeBlock).not.toContain('req.body?.auto_repair_quality_gate === true ?')
    expect(qualityGateBlock).toContain('if (!qualityGateDecision.passed && autoRepairQualityGate)')
  })

  test('standalone prose route rechecks the revised text after quality-gate auto repair', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const qualityGateStart = source.indexOf('let qualityGateDecision = getQualityGateDecision', routeStart)
    const storeStart = source.indexOf("markStage('store'", routeStart)
    const qualityGateBlock = source.slice(qualityGateStart, storeStart)
    const repairStart = qualityGateBlock.indexOf('const qualityRepair = await ctx.runProseSelfReviewAndRevision')
    const recheckStart = qualityGateBlock.indexOf('const qualityRepairRecheck = await ctx.runProseSelfReviewAndRevision')
    const finalDecisionStart = qualityGateBlock.indexOf('qualityGateDecision = getQualityGateDecision', recheckStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(recheckStart).toBeGreaterThan(repairStart)
    expect(finalDecisionStart).toBeGreaterThan(recheckStart)
    expect(qualityGateBlock).toContain('revise: false')
    expect(qualityGateBlock).toContain('quality_gate_repair: true')
    expect(qualityGateBlock).toContain('quality_recheck')
  })

  test('standalone prose route normalizes deterministic language fragments before quality gate repair', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const reviewStart = source.indexOf("markStage('review', '执行章节自检'", routeStart)
    const qualityGateStart = source.indexOf('let qualityGateDecision = getQualityGateDecision', reviewStart)
    const block = source.slice(reviewStart, qualityGateStart)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(reviewStart).toBeGreaterThan(routeStart)
    expect(qualityGateStart).toBeGreaterThan(reviewStart)
    expect(source).toContain('normalizeDeterministicProseLanguageFragments')
    expect(block).toContain('const languageNormalization = normalizeDeterministicProseLanguageFragments(finalText)')
    expect(block).toContain("phase: 'deterministic_language_normalize'")
  })

  test('standalone prose route defers full structured review fill until final revised text', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const selfReviewStart = source.indexOf('selfCheck = await ctx.runProseSelfReviewAndRevision', routeStart)
    const postReviewWordTargetStart = source.indexOf('const postReviewWordTargetCheck = await ctx.ensureProseMeetsWordTarget', selfReviewStart)
    const qualityGateStart = source.indexOf('let qualityGateDecision = getQualityGateDecision', postReviewWordTargetStart)
    const selfReviewBlock = source.slice(selfReviewStart, postReviewWordTargetStart)
    const finalRecheckBlock = source.slice(postReviewWordTargetStart, qualityGateStart)

    expect(selfReviewStart).toBeGreaterThan(routeStart)
    expect(selfReviewBlock).toContain('fill_missing_structured_checks: false')
    expect(finalRecheckBlock).toContain('const finalQualityRecheck = await ctx.runProseSelfReviewAndRevision')
    expect(finalRecheckBlock).toContain('revise: false')
    expect(finalRecheckBlock).toContain('quality_gate_repair: true')
    expect(finalRecheckBlock).not.toContain('fill_missing_structured_checks: false')
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
