import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { applyRequestBatchPreflight, buildStandaloneProseServiceErrorPayload, buildStandaloneProseServiceOptions, compactGenerationRequestOverride, compactStandaloneProseProgressStage, extractOhStoryDeliveryReceipts, refreshOhStoryDeliveryReceiptsAfterRevision, selectTargetProsePayload, stringifyNovelGenerationPayload } from './novel-generation-routes'

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

  test('resolves every chapter-group quality threshold through request project and default precedence', async () => {
    const routes = await import('./novel-generation-routes')
    const resolveThreshold = (routes as any).resolveChapterGroupQualityThreshold
    const project = { reference_config: { quality_gate: { min_score: 90 } } }

    expect(resolveThreshold?.({ quality_threshold: 87 }, project)).toBe(87)
    expect(resolveThreshold?.({ qualityThreshold: 86 }, project)).toBe(86)
    expect(resolveThreshold?.({ quality_threshold: 0 }, project)).toBe(90)
    expect(resolveThreshold?.({}, project)).toBe(90)
    expect(resolveThreshold?.({}, { reference_config: { quality_gate: { minScore: 91 } } })).toBe(91)
    expect(resolveThreshold?.({}, {})).toBe(78)

    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    expect(source).not.toContain('Number(req.body.quality_threshold || 78)')
    expect(source).not.toContain('Number(req.body.quality_threshold || project.reference_config?.quality_gate?.min_score || 78)')
    expect(source.match(/resolveChapterGroupQualityThreshold\(req\.body, project\)/g)).toHaveLength(4)
  })

  test('passes prose constraints to the unified service without auto approving scene cards', () => {
    const onStage = async () => {}
    const abortSignal = new AbortController().signal
    const options = buildStandaloneProseServiceOptions(
      {
        project_id: 1,
        model_id: 217,
        chapter_launch_gate: { status: 'blocked', summary: '缺承接' },
        longform_compass: { reader_promise: '行动破局' },
        longform_battle_context: { core_guard: '守住主角行动回报' },
        next_batch_brief: { current_chapter_role: '破开合围' },
        batch_preflight: { delivery_risk_carry_over: { items: ['接合围'] } },
        million_word_runway: { mode: 'single_chapter' },
        approvals: { safety: { approved: true } },
      },
      {
        modelId: 217,
        autoRepairQualityGate: false,
        onStage,
        abortSignal,
      },
    )

    expect(options.chapter_launch_gate.status).toBe('blocked')
    expect(options.longform_compass.reader_promise).toBe('行动破局')
    expect(options.longform_battle_context.core_guard).toBe('守住主角行动回报')
    expect(options.next_batch_brief.current_chapter_role).toBe('破开合围')
    expect(options.batch_preflight.delivery_risk_carry_over.items[0]).toBe('接合围')
    expect(options.million_word_runway.mode).toBe('single_chapter')
    expect(options.approvals.safety.approved).toBe(true)
    expect(options.approvals.scene_cards).toBeUndefined()
    expect(options.onStage).toBe(onStage)
    expect(options.abortSignal).toBe(abortSignal)
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

  test('retains safe prose failure diagnostics without exposing candidate text or request internals', () => {
    const candidateText = '失败候选正文不得持久化。'.repeat(100)
    const fullPrompt = '完整正文 prompt 不得返回。'.repeat(100)
    const rawPayload = '原始 provider payload 不得返回。'.repeat(100)
    const serviceError = Object.assign(new Error('章节硬质量门禁未通过，正文未入库'), {
      code: 'PROSE_QUALITY_GATE_BLOCKED',
      prompt_diagnostics: {
        prompt_chars: 46_820,
        required_chars: 32_100,
        selected_contract_keys: ['dialogue', 'continuity'],
        omitted_contract_keys: ['quality_audit'],
        section_chars: { core: 32_100, 'contract:dialogue:compact': 4_200 },
        downgrades: [{ key: 'dialogue', from: 'full', to: 'compact' }],
        budget_chars: 48_000,
        model_usage: { input_tokens: 12_345, output_tokens: 3_210, total_tokens: 15_555 },
        prompt: fullPrompt,
        messages: [{ role: 'user', content: fullPrompt }],
        debug: { raw_payload: rawPayload },
        final_text: candidateText,
      },
      quality_loop: {
        rounds: [
          { round: 1, accepted: true, reason: '定向修订可用', chapter_text: candidateText },
          { round: 2, accepted: true, reason: '二轮修订可用', prompt: fullPrompt },
        ],
        decision: {
          passed: false,
          approvable: false,
          score: 72,
          min_score: 78,
          hard_failures: [{
            key: 'word_target',
            message: '有效正文字数低于硬下限',
            source: 'deterministic',
            final_text: candidateText,
          }],
          advisory_failures: ['质检评分 72 低于 78'],
          debug: { messages: [fullPrompt] },
        },
        final_text: candidateText,
        raw_payload: rawPayload,
      },
      contextPackage: { chapter_text: candidateText },
      final_text: candidateText,
      chapter_text: candidateText,
      prompt: fullPrompt,
      messages: [{ role: 'user', content: fullPrompt }],
      debug: { raw_payload: rawPayload },
      raw_payload: rawPayload,
    })
    const pipeline = [{ key: 'review', status: 'failed' }]
    const configSnapshot = { model_id: 217, provider: 'openai-compatible' }

    const payload = buildStandaloneProseServiceErrorPayload(serviceError, pipeline, configSnapshot)
    const serialized = JSON.stringify(payload)

    expect(payload).toMatchObject({
      error: '章节硬质量门禁未通过，正文未入库',
      error_code: 'PROSE_QUALITY_GATE_BLOCKED',
      pipeline,
      config_snapshot: configSnapshot,
      prompt_diagnostics: {
        prompt_chars: 46_820,
        required_chars: 32_100,
        selected_contract_keys: ['dialogue', 'continuity'],
        omitted_contract_keys: ['quality_audit'],
        section_chars: { core: 32_100, 'contract:dialogue:compact': 4_200 },
        downgrades: [{ key: 'dialogue', from: 'full', to: 'compact' }],
        budget_chars: 48_000,
        model_usage: { input_tokens: 12_345, output_tokens: 3_210, total_tokens: 15_555 },
      },
      quality_loop: {
        rounds: [
          { round: 1, accepted: true, reason: '定向修订可用' },
          { round: 2, accepted: true, reason: '二轮修订可用' },
        ],
        decision: {
          passed: false,
          approvable: false,
          score: 72,
          min_score: 78,
          hard_failures: [{ key: 'word_target', message: '有效正文字数低于硬下限', source: 'deterministic' }],
          advisory_failures: ['质检评分 72 低于 78'],
        },
      },
    })
    expect(payload.context_package).toBeUndefined()
    expect(serialized).not.toContain(candidateText)
    expect(serialized).not.toContain(fullPrompt)
    expect(serialized).not.toContain(rawPayload)
    expect(serialized).not.toContain('chapter_text')
    expect(serialized).not.toContain('final_text')
    expect(serialized).not.toContain('messages')
    expect(serialized).not.toContain('debug')
    expect(serialized).not.toContain('raw_payload')
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

  test('routes standalone prose generation exclusively through the bounded chapter writing service', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const contextTypeStart = source.indexOf('type GenerationRoutesContext =')
    const contextTypeEnd = source.indexOf('function buildTextDiffSummary', contextTypeStart)
    const contextTypeBlock = source.slice(contextTypeStart, contextTypeEnd)
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const routeEnd = source.indexOf('\n  })\n}', routeStart)
    const routeBlock = source.slice(routeStart, routeEnd)
    const serviceCallStart = source.indexOf('ctx.generateChapterForGroup(activeWorkspace, projectId, chapterId', routeStart)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(routeEnd).toBeGreaterThan(routeStart)
    expect(contextTypeBlock).toContain('generateChapterForGroup:')
    expect(contextTypeBlock).not.toContain('generateChapterForGroup?:')
    expect(serviceCallStart).toBeGreaterThan(routeStart)
    expect(routeBlock).not.toContain('if (ctx.generateChapterForGroup)')
    expect(routeBlock).not.toContain('ctx.buildChapterContextPackage(')
    expect(routeBlock).not.toContain('const result = await generateNovelChapterProse')
    expect(routeBlock.match(/ctx\.generateChapterForGroup\(/g)).toHaveLength(1)
  })

  test('delegates standalone prose failures to one safe payload for run, SSE, and JSON outputs', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const catchStart = source.indexOf('} catch (serviceError: any) {', routeStart)
    const catchEnd = source.indexOf('\n        }\n      }', catchStart)
    const catchBlock = source.slice(catchStart, catchEnd)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(catchStart).toBeGreaterThan(routeStart)
    expect(catchEnd).toBeGreaterThan(catchStart)
    expect(catchBlock).toContain('const errorPayload = buildStandaloneProseServiceErrorPayload(serviceError, pipeline, configSnapshot)')
    expect(catchBlock).toContain('output_ref: stringifyNovelGenerationPayload(errorPayload)')
    expect(catchBlock).toContain("res.write(sseData({ type: 'error', ...errorPayload }))")
    expect(catchBlock).toContain('return res.status(status).json(errorPayload)')
    expect(catchBlock).not.toContain('context_package: serviceError?.contextPackage')
  })

  test('standalone prose service path aborts generation only on real client disconnects', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const serviceCallStart = source.indexOf('ctx.generateChapterForGroup(activeWorkspace, projectId, chapterId', routeStart)
    const serviceCallEnd = source.indexOf('const updated = serviceResult?.chapter || null', serviceCallStart)
    const serviceBlock = source.slice(routeStart, serviceCallEnd)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(serviceCallStart).toBeGreaterThan(routeStart)
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
    const serviceCallStart = source.indexOf('ctx.generateChapterForGroup(activeWorkspace, projectId, chapterId', routeStart)
    const serviceCallEnd = source.indexOf('const updated = serviceResult?.chapter || null', serviceCallStart)
    const serviceBlock = source.slice(routeStart, serviceCallEnd)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(serviceCallStart).toBeGreaterThan(routeStart)
    expect(serviceBlock).toContain('const writeStandaloneProseHeartbeat =')
    expect(serviceBlock).toContain("res.write(': mangaforge-prose-heartbeat\\n\\n')")
    expect(serviceBlock).toContain('const standaloneProseHeartbeat = setInterval')
    expect(serviceBlock).toContain('clearInterval(standaloneProseHeartbeat)')
    expect(serviceBlock).toContain('abortStandaloneProseGeneration()')
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
    expect(routeBlock.match(/auto_repair_quality_gate: false/g)).toHaveLength(2)
    expect(routeBlock).toContain("advance_rule: 'prose_admitted_then_next_chapter'")
    expect(routeBlock).not.toContain("advance_rule: 'quality_gate_passed_then_next_chapter'")
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
