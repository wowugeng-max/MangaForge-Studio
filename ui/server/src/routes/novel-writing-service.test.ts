import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  buildCommercialEditorRewritePrompt,
  buildChapterPreDraftBrief,
  buildChapterCoreDriftReport,
  buildChapterAttractionReviewReport,
  buildStoryDriveSyncReport,
  buildCharacterArcSyncReport,
  buildDeliveryRiskCarryOverContext,
  buildReaderExpectationDebtContext,
  buildInnovationSyncReport,
  buildSignatureSceneSyncReport,
  buildChapterBenchmarkSyncReport,
  buildStyleSampleSyncReport,
  buildStyleSampleEffectivenessForSelection,
  buildFirst30RetentionContext,
  buildReaderExpectationSyncReport,
  buildReaderPayoffSyncReport,
  buildReaderRetentionSyncReport,
  buildRunwaySyncReport,
  buildStoryUnitSyncReport,
  buildVolumeBeatSyncReport,
  buildMemePolishPrompt,
  buildReadabilityReviewPrompt,
  buildStorylineSyncReport,
  applyStyleSampleStrategyAuthorAction,
  buildProseWordTargetExpansionPrompt,
  countProseChars,
  createNovelWritingService,
  evaluateProseWordTarget,
  extractProseExpansionPayload,
  mergeConfirmedPreDraftBriefIntoContext,
  normalizeDiscoveredAssets,
  normalizeIpSceneCandidates,
  normalizeMemeBank,
  normalizeChapterBenchmarkSampleBank,
  normalizeStyleSampleBank,
  normalizeSceneCardsPayload,
  proseMaxTokensForWordTarget,
  resolveChapterWordTarget,
} from './novel-writing-service'
import { buildLLMResultDiagnostics, extractPlainProseFallback, getStyleLock } from './novel-route-utils'

describe('normalizeSceneCardsPayload', () => {
  test('converts target chapter outlines into fallback scene cards', () => {
    const sceneCards = normalizeSceneCardsPayload({
      master_outline: { title: '超人的规则怪谈世界' },
      chapter_outlines: [
        {
          chapter_no: 1,
          title: '双魂降临',
          summary: '李辰和林智同时醒来在诡异公寓中。',
          conflict: '初次面对禁止单独行动规则的考验',
          ending_hook: '广播响起：今晚零点前必须选定房间。',
        },
        {
          chapter_no: 2,
          title: '守则初读',
          summary: '两人找到公寓守则册。',
        },
      ],
    }, {
      chapter_target: {
        chapter_no: 1,
        title: '双魂降临',
      },
    })

    expect(sceneCards).toHaveLength(1)
    expect(sceneCards[0].scene_no).toBe(1)
    expect(sceneCards[0].title).toBe('双魂降临')
    expect(sceneCards[0].purpose).toContain('李辰和林智')
    expect(sceneCards[0].conflict).toContain('禁止单独行动')
    expect(sceneCards[0].turning_point).toContain('广播响起')
    expect(sceneCards[0].scene_type).toBe('investigation')
  })

  test('preserves commercial reader-facing beats for prose generation', () => {
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          scene_no: 1,
          title: '操场醒来',
          purpose: '主角发现自己进入午夜校园。',
          beat: '车祸醒来后确认超人力量。',
          opening_hook: '车祸后的第一口冷风带着广播电流声。',
          reader_payoff: '立刻展示超人身体素质，但规则空间能反制蛮力。',
          fear_point: '空无一人的校园里，阴影会吞掉尾音。',
          rule_pressure: '十点后不得离开宿舍，违规者会消失。',
          information_gap: '校园为什么没有人，广播是谁发出的。',
          reversal: '李超以为自己能冲出去，却被无形墙弹回。',
          ending_hook_seed: '钟表停在九点五十八分。',
          character_voice: '李超热血嘴硬，张智冷静拆规则。',
        },
      ],
    })

    expect(sceneCards[0].opening_hook).toContain('车祸')
    expect(sceneCards[0].reader_payoff).toContain('超人')
    expect(sceneCards[0].fear_point).toContain('阴影')
    expect(sceneCards[0].rule_pressure).toContain('十点')
    expect(sceneCards[0].information_gap).toContain('广播')
    expect(sceneCards[0].reversal).toContain('弹回')
    expect(sceneCards[0].ending_hook_seed).toContain('九点五十八分')
    expect(sceneCards[0].character_voice).toContain('张智')
  })
})

describe('chapter prose word target', () => {
  test('counts prose characters without whitespace for chapter target evaluation', () => {
    expect(countProseChars('李辰 醒来\n规则响起。')).toBe(9)
  })

  test('rejects a standard chapter draft below the minimum word target', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const evaluation = evaluateProseWordTarget('字'.repeat(1732), target)

    expect(evaluation.passed).toBe(false)
    expect(evaluation.too_short).toBe(true)
    expect(evaluation.actual).toBe(1732)
    expect(evaluation.deficit).toBe(1068)
    expect(evaluation.min).toBe(2800)
    expect(evaluateProseWordTarget('字'.repeat(2800), target).passed).toBe(true)
  })

  test('builds an expansion prompt with explicit word target guardrails', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const evaluation = evaluateProseWordTarget('字'.repeat(1732), target)
    const prompt = buildProseWordTargetExpansionPrompt(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 1,
          title: '双魂降临',
          summary: '主角进入规则公寓。',
          conflict: '必须理解第一条规则。',
          ending_hook: '午夜广播响起。',
          word_target: target,
          scene_cards: [],
        },
      },
      '字'.repeat(1732),
      evaluation,
    )

    expect(prompt).toContain('当前正文约 1732 字')
    expect(prompt).toContain('目标 3000 字')
    expect(prompt).toContain('至少 2800 字')
    expect(prompt).toContain('不得删改已有效内容')
    expect(prompt).toContain('扩写动作过程、选择代价、对话交锋、章末钩子铺垫')
  })

  test('builds follow-up completion prompts from the remaining deficit', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 2 }, {})
    const evaluation = evaluateProseWordTarget('字'.repeat(2554), target)
    const prompt = buildProseWordTargetExpansionPrompt(
      { title: '超人的规则怪谈世界' },
      { chapter_target: { chapter_no: 2, title: '守则初读', word_target: target, scene_cards: [] } },
      '字'.repeat(2554),
      evaluation,
      { attempt: 2, maxAttempts: 3 },
    )

    expect(prompt).toContain('第 2 轮补写')
    expect(prompt).toContain('仍缺至少 246 字')
    expect(prompt).toContain('本轮必须优先补足缺口')
    expect(prompt).toContain('返回扩写后的完整正文')
  })

  test('extracts expanded prose from raw fenced model content', () => {
    const extracted = extractProseExpansionPayload({
      content: '```json\n{"prose_chapters":[{"chapter_text":"扩写后的正文","scene_breakdown":[{"scene_no":1}],"continuity_notes":["保留钩子"]}]}\n```',
    })

    expect(extracted.text).toBe('扩写后的正文')
    expect(extracted.scene_breakdown).toHaveLength(1)
    expect(extracted.continuity_notes).toEqual(['保留钩子'])
  })

  test('recovers plain prose when a draft model ignores the JSON envelope', () => {
    const prose = '刺耳的铃声炸开。李超猛地睁眼，发现宿舍门外的影子贴着地面游动。'.repeat(20)

    expect(extractPlainProseFallback({ content: prose }, 120)).toBe(prose)
    expect(extractPlainProseFallback({ content: `{"chapter_text":"${prose}"}` }, 120)).toBe('')
  })

  test('summarizes LLM result diagnostics for empty-content failures', () => {
    const diagnostics = buildLLMResultDiagnostics({
      content: '',
      finish_reason: 'completed',
      usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
      raw: {
        stream_chunks_tail: [
          { type: 'response.completed', response: { status: 'completed', output: [{ type: 'reasoning', summary: [] }] } },
        ],
      },
    })

    expect(diagnostics.finish_reason).toBe('completed')
    expect(diagnostics.usage.output_tokens).toBe(20)
    expect(diagnostics.raw_keys).toContain('stream_chunks_tail')
    expect(diagnostics.stream_tail.length).toBe(1)
  })

  test('defaults normal chapters to roughly 3000 Chinese characters', () => {
    const target = resolveChapterWordTarget({ length_target: 'epic' }, { chapter_no: 1 }, {})

    expect(target.mode).toBe('standard')
    expect(target.target).toBe(3000)
    expect(target.min).toBe(2800)
    expect(target.max).toBe(3500)
    expect(target.label).toContain('标准章')
  })

  test('injects long chapter target into paragraph prose prompt and raises token budget', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 12 }, { word_target_mode: 'long' })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '测试长篇' },
      {
        chapter_target: {
          chapter_no: 12,
          title: '长章测试',
          summary: '主角进入核心冲突。',
          conflict: '必须正面解决一次重大危机。',
          ending_hook: '新的规则出现。',
          scene_cards: [],
          word_target: target,
        },
        style_lock: { chapter_word_range: target.rangeText },
      },
      null,
      { chapter_no: 12, title: '长章测试' },
    )

    expect(target.mode).toBe('long')
    expect(target.target).toBe(10000)
    expect(prompt).toContain('本章目标字数：约 10000 字')
    expect(prompt).toContain('可接受范围：9000-11000 字')
    expect(prompt).toContain('每个场景分配明确字数预算')
    expect(proseMaxTokensForWordTarget(target)).toBeGreaterThan(14000)
  })

  test('injects longform compass into paragraph prose prompt as hard story boundaries', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          immutable_rules: ['超人力量不能无代价碾压规则'],
          flexible_zones: ['副本题材可换，但必须服务规则破局主线'],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【长篇作品罗盘】')
    expect(prompt).toContain('不可漂移')
    expect(prompt).toContain('超人力量不能无代价碾压规则')
    expect(prompt).toContain('副本题材可换')
  })

  test('injects next batch brief into paragraph prose prompt as serial-production boundaries', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第8-10章',
          batch_goal: '三章内进入内门视野。',
          reader_payoff_plan: '升级、打脸、规则反制逐章交付。',
          mainline_focus: '外门危机 -> 内门招揽',
          forbidden_boundary: '第10章前不得揭露规则源头。',
          current_chapter_role: '第8章只负责夜钟规则第一次显形。',
          start_checklist: [
            { key: 'core_promise', label: '核心承诺', status: 'ok', detail: '主角必须以规则反制兑现逆袭承诺。' },
            { key: 'reader_payoff', label: '读者回报', status: 'ok', detail: '升级、打脸、规则反制逐章交付。' },
          ],
        },
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          conflict: '是否相信敌人提示。',
          ending_hook: '钟声倒数。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '外门夜钟' },
    )

    expect(prompt).toContain('【本批连载任务书】')
    expect(prompt).toContain('批次开工清单')
    expect(prompt).toContain('核心承诺')
    expect(prompt).toContain('三章内进入内门视野')
    expect(prompt).toContain('不得提前消费后续章节爆点')
    expect(prompt).toContain('第8章只负责夜钟规则第一次显形')
  })

  test('injects story unit context into paragraph prose prompt as event-package boundaries', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        story_unit_context: {
          title: '试炼前夜剧情单元',
          chapter_range_label: '第7-12章',
          current_chapter_role: '入口钩子',
          unit_goal: '六章内完成外门试炼前夜事件包。',
          entry_hook: '第7章以试炼倒计时开场。',
          pressure_escalation: ['执事设局', '试炼规则反噬'],
          mini_climax_payoff: '第10章公开打脸执事。',
          setup_and_storyline: ['阵盘第二道裂纹埋线', '外门压迫主线阶段兑现'],
          exit_hook: '第12章内门长老亲自点名。',
          forbidden_advance: ['不得提前解决内门招揽条件'],
        },
        chapter_target: {
          chapter_no: 7,
          title: '试炼倒计时',
          summary: '试炼前夜规则开始收紧。',
          conflict: '是否提前暴露主角底牌。',
          ending_hook: '执事在名册上划掉主角名字。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 7, title: '试炼倒计时' },
    )

    expect(prompt).toContain('【剧情单元任务】')
    expect(prompt).toContain('执行 chapter_target.story_unit_context')
    expect(prompt).toContain('入口钩子')
    expect(prompt).toContain('第10章公开打脸执事')
    expect(prompt).toContain('不得提前解决内门招揽条件')
  })

  test('injects rolling-plan signature scene repair into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 9,
          title: '新压力源',
          summary: '安全区被迫变成临时战场。',
          conflict: '旧秩序压制新晋黑马。',
          ending_hook: '道具背面刻着禁用标记。',
          signature_scene_brief: {
            signature_scene: '主角在倒塌走廊里反手点亮禁用阵纹，把安全区变成审判场。',
            scene_repair_target: '修复 IP场面覆盖 1/10 的强场面空窗。',
            reader_payoff: '规则反杀爽点。',
            storyline_service: '推进外门试炼主线。',
          },
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 9, title: '新压力源' },
    )

    expect(prompt).toContain('【本章标志性场面补位】')
    expect(prompt).toContain('必须把 signature_scene 写成正文核心场面')
    expect(prompt).toContain('审判场')
    expect(prompt).toContain('IP场面覆盖 1/10')
    expect(prompt).toContain('外门试炼主线')
  })

  test('injects safe batch preflight into paragraph prose prompt as continuous-production guardrails', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        batch_preflight: {
          guardrail_status: 'caution',
          safe_chapter_count: 1,
          chapter_range_label: '第8章',
          allowed_chapter_nos: [8],
          blocked_chapter_nos: [9],
          guardrails: [
            { label: '近10章疲劳', status: 'warn', detail: '近10章冲突来源、回报形态和章末问题同质化。' },
            { label: '批次任务书', status: 'warn', detail: '第9章缺少明确章末钩子。' },
          ],
          warnings: [
            '近10章疲劳：下一批章节要更换压迫来源、回报形态、章末问题或可视化场面。',
          ],
        },
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          conflict: '是否相信敌人提示。',
          ending_hook: '钟声倒数。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '外门夜钟' },
    )

    expect(prompt).toContain('【安全连写预执行门禁】')
    expect(prompt).toContain('近10章冲突来源、回报形态和章末问题同质化')
    expect(prompt).toContain('更换压迫来源、回报形态、章末问题或可视化场面')
    expect(prompt).toContain('执行 chapter_target.batch_preflight')
  })

  test('injects safe batch delivery-risk obligations into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        batch_preflight: {
          source: 'auto_creation_safe_batch_preflight',
          delivery_risk_carry_over: {
            source: 'chapter_delivery_risk_carry_over',
            source_chapter_no: 7,
            apply_to_chapter_no: 8,
            label: '待修复 3',
            priority_label: '优先修章末翻页',
            items: ['修吸引力：吸引力缺口 2', '补创新：创新缺口 1'],
            required_actions: ['前300字接住门外学生压迫', '中段补规则反制创新', '章末重做翻页问题'],
            opening_actions: ['开篇先补异常压迫'],
            middle_actions: ['中段补规则反制创新'],
            ending_actions: ['章末重做翻页问题'],
          },
        },
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          conflict: '是否相信敌人提示。',
          ending_hook: '钟声倒数。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '外门夜钟' },
    )

    expect(prompt).toContain('【安全连写交稿风险承接】')
    expect(prompt).toContain('执行 batch_preflight.delivery_risk_carry_over')
    expect(prompt).toContain('前300字接住门外学生压迫')
    expect(prompt).toContain('章末重做翻页问题')
  })

  test('injects safe batch chapter handoff contract into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        batch_preflight: {
          source: 'auto_creation_safe_batch_preflight',
          chapter_handoff_contract: {
            source: 'safe_batch_chapter_handoff_contract',
            from_chapter_no: 7,
            apply_to_chapter_no: 8,
            previous_handoff: '第7章最后一幕：阵盘亮起第二道裂纹，执事当场逼主角交出阵盘。',
            opening_obligations: ['阵盘第二道裂纹必须在开篇造成可见压力'],
            must_deliver: ['主角必须用阵法反制执事试探'],
            keep_alive: ['是谁在背后改试炼规则'],
            overdue: ['内门长老为何提前关注主角'],
          },
        },
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          conflict: '是否相信敌人提示。',
          ending_hook: '钟声倒数。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '外门夜钟' },
    )

    expect(prompt).toContain('【安全连写章节交接契约】')
    expect(prompt).toContain('执行 batch_preflight.chapter_handoff_contract')
    expect(prompt).toContain('阵盘第二道裂纹必须在开篇造成可见压力')
    expect(prompt).toContain('主角必须用阵法反制执事试探')
    expect(prompt).toContain('是谁在背后改试炼规则')
  })

  test('injects safe batch expansion structure verification into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第18-20章',
          batch_goal: '验证修后的中段扩批结构。',
          expansion_structure_verification: {
            source: 'safe_batch_expansion_structure_repair',
            label: '扩批结构验证',
            repeated_hotspot_segment: { key: 'middle', label: '中段', count: 2 },
            validation_chapter_nos: [18, 19, 20],
            fixed_segment_role: '中段固定职责：每批第3-4章必须完成主线转折、显性回报和章末追读。',
            conflict_rotation: '未来验证批次每章必须更换冲突来源。',
            explicit_payoff: '每章至少一个显性回报，不能只铺垫。',
            ending_hook_requirement: '每章章末必须留下不同的追读问题。',
            structure_actions: ['前段抛压，中段兑现并升级，后段留钩。'],
          },
        },
        chapter_target: {
          chapter_no: 18,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          conflict: '是否相信敌人提示。',
          ending_hook: '钟声倒数。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 18, title: '外门夜钟' },
    )

    expect(prompt).toContain('【扩批结构验证】')
    expect(prompt).toContain('执行 next_batch_brief.expansion_structure_verification')
    expect(prompt).toContain('中段连续 2 次')
    expect(prompt).toContain('每章必须更换冲突来源')
    expect(prompt).toContain('每章至少一个显性回报')
    expect(prompt).toContain('每章章末必须留下不同的追读问题')
  })

  test('injects default five-chapter rollback evidence into expansion validation prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第68-70章',
          batch_goal: '默认5章档位回退后的3章验证。',
          expansion_structure_verification: {
            source: 'safe_batch_expansion_structure_repair',
            label: '扩批结构验证',
            repeated_hotspot_segment: { key: 'middle', label: '中段', count: 1 },
            validation_chapter_nos: [68, 69, 70],
            fixed_segment_role: '默认档位回退：中段必须重新证明主线转折、显性回报和章末追读。',
            conflict_rotation: '验证批每章必须更换冲突来源。',
            explicit_payoff: '每章至少一个显性回报。',
            ending_hook_requirement: '每章章末必须留下不同追读问题。',
            default_five_chapter_regression: {
              status: 'regressed',
              label: '默认5章档位回退原因',
              default_batch_chapter_nos: [63, 64, 65, 66, 67],
              restore_chapter_nos: [58, 59, 60, 61, 62],
              validation_chapter_nos: [50, 51, 52],
              repeated_hotspot_segment: { key: 'middle', label: '中段', risk_count: 3 },
              failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
              summary: '默认5章档位回退原因：连续 2 批恢复稳定后，第63、64、65、66、67章默认档位在中段复发。',
            },
          },
        },
        chapter_target: {
          chapter_no: 68,
          title: '外门夜钟',
          summary: '验证默认档位回退后的中段结构。',
          conflict: '是否相信敌人提示。',
          ending_hook: '钟声倒数。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 68, title: '外门夜钟' },
    )

    expect(prompt).toContain('默认5章档位回退')
    expect(prompt).toContain('失效批次：第63章、第64章、第65章、第66章、第67章')
    expect(prompt).toContain('恢复依据：第58章、第59章、第60章、第61章、第62章')
    expect(prompt).toContain('前置3章验证：第50章、第51章、第52章')
    expect(prompt).toContain('失败维度：核心偏移、回报欠账、追读拉力')
    expect(prompt).toContain('逐章证明核心守恒、显性回报和章末追读')
  })

  test('injects default five-chapter lane template verification into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第90-92章',
          batch_goal: '默认档位模板修复后进入3章验证批。',
          expansion_structure_verification: {
            source: 'safe_batch_expansion_structure_decision_mismatch',
            validation_chapter_nos: [90, 91, 92],
            fixed_segment_role: '默认 5 章档位验证批必须逐章继承前段、中段、后段的段位职责模板。',
            conflict_rotation: '默认 5 章档位验证批必须逐章轮换冲突来源。',
            explicit_payoff: '默认 5 章档位验证批必须逐章交付显性回报。',
            ending_hook_requirement: '默认 5 章档位验证批必须逐章落地章末追读模板。',
            default_five_chapter_lane_template: {
              visible: true,
              status: 'fulfilled',
              label: '默认5章档位模板回检',
              summary: '默认5章档位模板已补齐。下一轮验证批逐章继承四项模板。',
              segment_duty_rewrite: '段位职责重写：前段压迫、中段兑现、后段升级钩子。',
              conflict_rotation: '冲突轮换：规则压迫、人物对抗、信息误导三类轮换。',
              payoff_density: '回报密度：每章至少交付一个显性回报。',
              ending_hook_template: '章末追读模板：最后 300 字落触发事件、读者问题、下一章风险。',
              repaired_missing_requirements: [
                { key: 'default_lane_payoff_density', label: '回报密度', chapter_nos: [91] },
              ],
              repair_actions: [
                '回报密度修复：第91章必须补出显性回报，让读者看到收益、反制结果或阶段结算。',
              ],
              requirements: [
                { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
                { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
                { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled' },
                { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
              ],
            },
          },
        },
        chapter_target: {
          chapter_no: 90,
          title: '模板验证一',
          summary: '验证默认档位模板是否稳定。',
          conflict: '是否按新模板推进第一章。',
          ending_hook: '新模板第一处风险抬头。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 90, title: '模板验证一' },
    )

    expect(prompt).toContain('默认5章档位模板回检')
    expect(prompt).toContain('下一轮验证批逐章继承')
    expect(prompt).toContain('默认档位段位职责、冲突轮换、回报密度、章末追读模板')
    expect(prompt).toContain('段位职责重写：前段压迫')
    expect(prompt).toContain('冲突轮换：规则压迫')
    expect(prompt).toContain('回报密度：每章至少交付')
    expect(prompt).toContain('章末追读模板：最后 300 字')
    expect(prompt).toContain('模板缺项修复：第91章缺回报密度')
    expect(prompt).toContain('缺项修复动作：回报密度修复：第91章必须补出显性回报')
    expect(prompt).toContain('逐章证明四项模板没有复发')
    expect(prompt).toContain('default_lane_segment_duty_delivered')
    expect(prompt).toContain('default_lane_conflict_rotation_delivered')
    expect(prompt).toContain('default_lane_payoff_density_delivered')
    expect(prompt).toContain('default_lane_ending_hook_template_delivered')
  })

  test('injects default lane template redesign execution standards into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第96-98章',
          batch_goal: '默认档位模板重构后进入3章验证批。',
          expansion_structure_verification: {
            source: 'safe_batch_expansion_structure_repair',
            validation_chapter_nos: [96, 97, 98],
            fixed_segment_role: '中段固定职责：验证新默认档位模板。',
            conflict_rotation: '验证批每章更换冲突来源。',
            explicit_payoff: '验证批每章必须有显性回报。',
            ending_hook_requirement: '验证批每章章末必须留下追读问题。',
            default_five_chapter_lane_template: {
              visible: true,
              status: 'fulfilled',
              label: '默认5章档位模板重构',
              source: 'safe_batch_expansion_structure_repair',
              redesign_source: 'default_five_chapter_lane_template_redesign_queue',
              summary: '默认档位模板已重构：回报密度失败 2 次已改为逐章显性结算。',
              top_failed_requirement: {
                key: 'default_lane_payoff_density',
                label: '回报密度',
                failed_count: 2,
              },
              segment_duty_rewrite: '新模板：第1章抛出规则压迫，第2章制造误导反转，第3章兑现阶段收益。',
              conflict_rotation: '新模板：规则压迫、人物对抗、信息误导按章轮换。',
              payoff_density: '新模板：每章必须有可见收益、反制结果或阶段结算。',
              ending_hook_template: '新模板：最后300字必须落触发事件、读者问题和下一章风险。',
              redesigned_templates: [
                { key: 'default_lane_payoff_density', label: '回报密度', template: '新模板：每章必须有可见收益、反制结果或阶段结算。' },
              ],
              validation_standard: [
                '下一轮3章验证批必须逐章回填 default_lane_*_delivered。',
                '连续2批模板全过后才能恢复默认5章档位。',
              ],
              required_receipts: [
                'default_lane_segment_duty_delivered',
                'default_lane_conflict_rotation_delivered',
                'default_lane_payoff_density_delivered',
                'default_lane_ending_hook_template_delivered',
              ],
              requirements: [
                { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
                { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
                { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled' },
                { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
              ],
            },
          },
        },
        chapter_target: {
          chapter_no: 96,
          title: '模板重构验证一',
          summary: '验证默认档位模板重构是否稳定。',
          conflict: '新模板第一章是否能守住回报密度。',
          ending_hook: '验证失败的风险抬头。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 96, title: '模板重构验证一' },
    )

    expect(prompt).toContain('模板重构来源：default_five_chapter_lane_template_redesign_queue')
    expect(prompt).toContain('高频缺项：回报密度失败 2 次')
    expect(prompt).toContain('重构模板：回报密度：新模板：每章必须有可见收益')
    expect(prompt).toContain('下一轮验证标准：下一轮3章验证批必须逐章回填 default_lane_*_delivered。；连续2批模板全过后才能恢复默认5章档位。')
    expect(prompt).toContain('逐章回填字段：default_lane_segment_duty_delivered、default_lane_conflict_rotation_delivered、default_lane_payoff_density_delivered、default_lane_ending_hook_template_delivered')
    expect(prompt).toContain('默认5章档位模板验证：本章必须继承已补齐的段位职责')
  })

  test('injects production relapse template version proof into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第114-116章',
          batch_goal: '默认档位模板生产复发后进入3章验证批。',
          expansion_structure_verification: {
            source: 'safe_batch_expansion_structure_repair',
            validation_chapter_nos: [114, 115, 116],
            fixed_segment_role: '中段固定职责：验证生产后验新模板。',
            conflict_rotation: '验证批每章更换冲突来源。',
            explicit_payoff: '验证批每章必须有显性回报。',
            ending_hook_requirement: '验证批每章章末必须留下追读问题。',
            default_five_chapter_lane_template: {
              visible: true,
              status: 'fulfilled',
              label: '默认档位模板生产复发重构',
              source: 'safe_batch_expansion_structure_repair',
              redesign_source: 'default_five_chapter_lane_template_redesign_queue',
              summary: '默认档位模板版本 safe_batch_expansion_structure_repair:668 在真实5章生产复发，已按生产后验重构。',
              template_version_id: 'safe_batch_expansion_structure_repair:668',
              production_relapse_count: 1,
              production_relapse_review: {
                template_version_id: 'safe_batch_expansion_structure_repair:668',
                default_batch_chapter_nos: [109, 110, 111, 112, 113],
                restore_chapter_nos: [104, 105, 106, 107, 108],
                validation_chapter_nos: [96, 97, 98],
                failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
                failed_requirements: [
                  { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移' },
                  { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账' },
                  { key: 'default_lane_ending_hook_template', label: '章末追读模板', failure_reason: '追读拉力' },
                ],
                summary: '第109-113章真实生产复发，当前模板版本必须证明核心、回报、追读三项后验修复。',
              },
              failed_requirements: [
                { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移', failed_count: 1 },
                { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账', failed_count: 1 },
                { key: 'default_lane_ending_hook_template', label: '章末追读模板', failure_reason: '追读拉力', failed_count: 1 },
              ],
              redesigned_templates: [
                { key: 'default_lane_payoff_density', label: '回报密度', template: '生产后验新模板：每章必须落一个可见收益、反制结果或阶段结算。' },
              ],
              validation_standard: [
                '下一轮3章验证批必须逐章对照 template_version_id safe_batch_expansion_structure_repair:668 和真实生产复发章节。',
                '逐章证明新版模板已修掉真实生产失败维度：核心偏移、回报欠账、追读拉力。',
              ],
              required_receipts: [
                'default_lane_segment_duty_delivered',
                'default_lane_conflict_rotation_delivered',
                'default_lane_payoff_density_delivered',
                'default_lane_ending_hook_template_delivered',
              ],
              requirements: [
                { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
                { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
                { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled' },
                { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
              ],
            },
          },
        },
        chapter_target: {
          chapter_no: 114,
          title: '生产后验验证一',
          summary: '验证当前模板版本是否修掉真实生产复发。',
          conflict: '新模板第一章是否能守住核心和回报。',
          ending_hook: '复发风险再次抬头。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 114, title: '生产后验验证一' },
    )

    expect(prompt).toContain('模板版本：safe_batch_expansion_structure_repair:668')
    expect(prompt).toContain('生产复发次数：1')
    expect(prompt).toContain('生产复发章节：第109章、第110章、第111章、第112章、第113章')
    expect(prompt).toContain('生产复发前验证：第96章、第97章、第98章')
    expect(prompt).toContain('生产恢复依据：第104章、第105章、第106章、第107章、第108章')
    expect(prompt).toContain('真实生产失败维度：核心偏移、回报欠账、追读拉力')
    expect(prompt).toContain('生产复发模板缺项：默认档位段位职责/核心偏移；回报密度/回报欠账；章末追读模板/追读拉力')
    expect(prompt).toContain('模板版本后验验证：本轮3章验证批必须逐章对照 template_version_id safe_batch_expansion_structure_repair:668')
    expect(prompt).toContain('逐章证明新版模板已修掉真实生产失败维度：核心偏移、回报欠账、追读拉力')
  })

  test('injects expansion structure decision into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第70-74章',
          batch_goal: '恢复五章扩批但继续执行段位职责。',
          expansion_structure_decision: {
            visible: true,
            label: '结构修复决策',
            recommendation: 'restore_five_chapter',
            target_chapter_count: 5,
            mode_label: '恢复5章扩批',
            segment_label: '中段',
            summary: '中段结构修复有效性：通过率 67% -> 100%，失败主因 3 -> 0，修复后暂无同段复发。',
            instruction: '恢复 5 章扩批，但每章必须明确前段/中段/后段职责，不能因为放大批次而淡化结构约束。',
            observation_metrics: ['通过率 67% -> 100%', '失败主因 3 -> 0', '修复后暂无同段复发'],
          },
        },
        chapter_target: {
          chapter_no: 70,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          conflict: '是否相信敌人提示。',
          ending_hook: '钟声倒数。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 70, title: '外门夜钟' },
    )

    expect(prompt).toContain('【扩批结构决策】')
    expect(prompt).toContain('执行 next_batch_brief.expansion_structure_decision')
    expect(prompt).toContain('restore_five_chapter')
    expect(prompt).toContain('恢复 5 章扩批')
    expect(prompt).toContain('通过率 67% -> 100%')
    expect(prompt).toContain('失败主因 3 -> 0')
    expect(prompt).toContain('expansion_structure_decision_execution')
    expect(prompt).toContain('segment_role_delivered')
    expect(prompt).toContain('observation_metrics_delivered')
  })

  test('injects default five-chapter lane redesign obligations into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第89章',
          batch_goal: '恢复判定连续失效后先重写默认五章档位。',
          expansion_structure_decision: {
            visible: true,
            label: '结构修复决策',
            recommendation: 'escalate_structure_redesign',
            target_chapter_count: 1,
            mode_label: '单章结构重构',
            segment_label: '中段',
            summary: '连续 2 次恢复判定失效：核心偏移、回报欠账、追读拉力同维复发，默认档位结构重构。',
            instruction: '默认 5 章档位连续恢复判定失效，本章先重写默认档位结构。',
            observation_metrics: ['恢复判定连续失效 2 次', '同维复发：核心偏移、回报欠账、追读拉力'],
            default_five_chapter_lane_redesign: {
              reason: 'repeated_recovery_verdict_relapse',
              relapse_count: 2,
              repeated_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
              segment_duty_rewrite: '段位职责重写：定义默认 5 章内前段、中段、后段各自承担的冲突、信息、回报和钩子职责。',
              conflict_rotation: '冲突轮换：五章内至少更换规则压迫、人物对抗、信息误导三类冲突来源。',
              payoff_density: '回报密度：每章都要有显性回报，不能连续两章只铺垫。',
              ending_hook_template: '章末追读模板：每章最后 300 字给出触发事件、读者问题、下一章风险升级。',
            },
          },
        },
        chapter_target: {
          chapter_no: 89,
          title: '默认档重构',
          summary: '重写五章档位结构。',
          conflict: '是否暂停扩批并重设节奏。',
          ending_hook: '新的五章模板露出第一处风险。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 89, title: '默认档重构' },
    )

    expect(prompt).toContain('默认5章档位结构重构')
    expect(prompt).toContain('连续恢复判定失效')
    expect(prompt).toContain('核心偏移、回报欠账、追读拉力')
    expect(prompt).toContain('段位职责重写')
    expect(prompt).toContain('冲突轮换')
    expect(prompt).toContain('回报密度')
    expect(prompt).toContain('章末追读模板')
    expect(prompt).toContain('repeated_recovery_verdict_relapse')
    expect(prompt).toContain('default_lane_segment_duty_delivered')
    expect(prompt).toContain('default_lane_conflict_rotation_delivered')
    expect(prompt).toContain('default_lane_payoff_density_delivered')
    expect(prompt).toContain('default_lane_ending_hook_template_delivered')
  })

  test('injects longform memory anchor from safe batch preflight into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        batch_preflight: {
          source: 'auto_creation_safe_batch_preflight',
          longform_memory_anchor: {
            last_updated_chapter: 7,
            core_promise: '李超用超人蛮力碰撞规则怪谈，张智负责拆解规则。',
            current_volume_goal: '午夜校园中活过第一轮规则。',
            character_states: ['李超：力量觉醒但不懂规则@宿舍楼大厅'],
            open_questions: ['广播是谁发出的'],
            payoff_debts: ['规则边界反制蛮力'],
          },
        },
        chapter_target: {
          chapter_no: 8,
          title: '宿舍水痕',
          summary: '追查广播与门外学生的联系。',
          conflict: '蛮力试探规则边界。',
          ending_hook: '广播第一次叫出李超真名。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '宿舍水痕' },
    )

    expect(prompt).toContain('【长篇正史锚点】')
    expect(prompt).toContain('李超用超人蛮力碰撞规则怪谈')
    expect(prompt).toContain('广播是谁发出的')
    expect(prompt).toContain('规则边界反制蛮力')
  })

  test('injects longform memory capsule into paragraph prose prompt for single chapter drafting', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '万古长夜' },
      {
        longform_memory_capsule: {
          last_updated_chapter: 7,
          core_promise: '寒门少年以阵法改写宗门秩序。',
          mainline_progress: '外门压迫线推进到试炼前夜。',
          character_states: ['李玄：仍在藏拙，但已经被执事逼到试炼边缘'],
          open_questions: ['残阵缺口为什么会回应旧案禁制'],
          payoff_debts: ['试炼资格被夺后的公开打脸回报'],
          canon_facts: ['残阵缺口不能被普通阵图修复'],
          red_lines: ['主角不能脱离阵法成长线'],
        },
        chapter_target: {
          chapter_no: 8,
          title: '试炼前夜',
          summary: '李玄必须决定是否公开承认残阵缺陷。',
          conflict: '藏拙保命还是公开争取试炼资格。',
          ending_hook: '阵盘裂纹在众人面前亮起。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '试炼前夜' },
    )

    expect(prompt).toContain('【长篇记忆胶囊】')
    expect(prompt).toContain('寒门少年以阵法改写宗门秩序')
    expect(prompt).toContain('残阵缺口为什么会回应旧案禁制')
    expect(prompt).toContain('试炼资格被夺后的公开打脸回报')
    expect(prompt).toContain('主角不能脱离阵法成长线')
    expect(prompt).toContain('执行 chapter_target.longform_memory_capsule')
  })

  test('injects million word runway into paragraph prose prompt as the chapter course guard', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        million_word_runway: {
          status: 'ready',
          label: '航线可连续',
          bandLabel: '第1个10万字',
          safeModeLabel: '小批量连写 3 章',
          fourQuestions: [
            { key: 'why_now', label: '这章为什么必须写', answer: '第一次证明规则边界能被利用', status: 'ok' },
            { key: 'page_turn', label: '读者为什么翻页', answer: '门外学生说出李超的死因', status: 'ok' },
            { key: 'mainline_move', label: '主线推进了什么', answer: '双主角确认规则并非不可破解', status: 'ok' },
            { key: 'freshness', label: '这一章的新意在哪', answer: '超人力量先被规则压制再反制', status: 'ok' },
          ],
          redLines: ['超人力量不能无代价碾压规则'],
          readerFuel: ['规则反制爽点', '门外学生章末钩子'],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【百万字航线守门】')
    expect(prompt).toContain('本章四问')
    expect(prompt).toContain('第一次证明规则边界能被利用')
    expect(prompt).toContain('超人力量不能无代价碾压规则')
    expect(prompt).toContain('规则反制爽点')
    expect(prompt).toContain('执行 chapter_target.million_word_runway')
  })

  test('injects chapter launch gate into paragraph prose prompt as pre-draft guardrails', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapter_launch_gate: {
          status: 'ready',
          summary: '当前章已对齐读者承诺、章节目标、核心冲突、主线服务、读者回报和章末钩子。',
          signals: [
            { key: 'reader_promise', label: '读者承诺', status: 'ok', detail: '本章必须服务：超人力量和规则判定持续碰撞。' },
            { key: 'core_conflict', label: '核心冲突', status: 'ok', detail: '冲突：是否用蛮力冲出宿舍。' },
          ],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【本章开写门禁】')
    expect(prompt).toContain('读者承诺、章节目标、核心冲突、主线服务、读者回报和章末钩子')
    expect(prompt).toContain('超人力量和规则判定持续碰撞')
    expect(prompt).toContain('是否用蛮力冲出宿舍')
    expect(prompt).toContain('执行 chapter_target.chapter_launch_gate')
  })

  test('injects governance recheck memory into paragraph prose prompt as single-chapter guardrails', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        governance_recheck_memory: {
          source_run_id: 44,
          status: 'closed',
          label: '治理复查已记录',
          summary: '恢复依据闭环 2/2，本章必须继续继承上一轮修后证据。',
          evidence: ['第42章对白交锋已补回样章节奏'],
          failed_evidence: [],
          watch_items: ['下一章继续观察样章策略命中率'],
          storyline_decision_task_count: 0,
        },
        chapter_target: {
          chapter_no: 43,
          title: '复查后的新局',
          summary: '主角用新证据逼对手公开应答。',
          conflict: '对手试图绕开上一轮修复后的对白交锋。',
          ending_hook: '旧账本出现第二个签名。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 43, title: '复查后的新局' },
    )

    expect(prompt).toContain('【治理复查承接】')
    expect(prompt).toContain('第42章对白交锋已补回样章节奏')
    expect(prompt).toContain('下一章继续观察样章策略命中率')
    expect(prompt).toContain('执行 chapter_target.governance_recheck_memory')
  })

  test('injects core contract radar into paragraph prose prompt as hard guardrails', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
          core_contract_radar: {
            summary: '本章必须把超人力量撞上规则判定写成可见事件。',
            must_serve: ['超人力量和规则判定持续碰撞', '蛮力破局与规则判定的对抗'],
            no_drift: ['不能把规则怪谈写成纯打怪'],
            repair_focus: ['补足规则判定反制蛮力'],
            checks: [{ key: 'reader_promise', label: '读者承诺', status: 'warn', reason: '碰撞不够可见' }],
          },
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【核心契约】')
    expect(prompt).toContain('必须服务')
    expect(prompt).toContain('不得漂移')
    expect(prompt).toContain('超人力量和规则判定持续碰撞')
    expect(prompt).toContain('不能把规则怪谈写成纯打怪')
    expect(prompt).toContain('执行 chapter_target.core_contract_radar')
  })

  test('injects longform battle context into paragraph prose prompt as chapter obligations', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
          longform_battle_context: {
            status: 'needs_action',
            summary: '先修复读者拉力和核心守恒。',
            risk_chips: ['核心偏移', '前30章留存'],
            primary_action: { label: '运行前30章诊断', reason: '补开篇钩子和章末追读。' },
            risk_lanes: [
              {
                key: 'story_core',
                label: '核心守恒',
                status: 'warn',
                detail: '核心偏移：超人力量被写成普通无敌碾压。',
                required_action: '本章必须写出规则判定反制蛮力。',
              },
              {
                key: 'reader_pull',
                label: '读者拉力',
                status: 'block',
                detail: '前30章留存弱：开篇钩子不足。',
                required_action: '前300字给危机，章末留下门外学生悬念。',
              },
            ],
          },
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【长篇作战承接】')
    expect(prompt).toContain('先修复读者拉力和核心守恒')
    expect(prompt).toContain('本章必须写出规则判定反制蛮力')
    expect(prompt).toContain('前300字给危机')
    expect(prompt).toContain('执行 chapter_target.longform_battle_context')
  })

  test('injects reader expectation debt into paragraph prose prompt as carry-over obligations', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        reader_expectation_debt_context: {
          must_carry: [
            { from_chapter_no: 2, key: 'ending_hook', label: '章末追读', type: 'hook', text: '湿漉漉学生敲响玻璃门' },
          ],
          keep_alive: [
            { from_chapter_no: 2, key: 'open_question', label: '保留悬念', type: 'question', text: '广播是谁发出的' },
          ],
        },
        chapter_target: {
          chapter_no: 3,
          title: '门外学生',
          summary: '判断门外学生是否是规则诱饵。',
          conflict: '救人还是守规。',
          ending_hook: '玻璃门上的水迹拼出一个名字。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(prompt).toContain('【期待债务承接】')
    expect(prompt).toContain('上一章或最近章节欠下的期待必须在本章可见推进')
    expect(prompt).toContain('湿漉漉学生敲响玻璃门')
    expect(prompt).toContain('广播是谁发出的')
  })

  test('injects previous chapter handoff into paragraph prose prompt as opening obligation', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 3,
          title: '门外学生',
          summary: '判断门外学生是否是规则诱饵。',
          conflict: '救人还是守规。',
          previous_handoff: '上一章最后一幕：湿漉漉学生敲响玻璃门，林晓警告不能开门。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(prompt).toContain('【上一章承接】')
    expect(prompt).toContain('前 300 字必须接住上一章最后一幕')
    expect(prompt).toContain('湿漉漉学生敲响玻璃门')
    expect(prompt).toContain('不得重新从泛环境描写、空泛醒来或无关解释开场')
  })

  test('builds a chapter attraction review from hooks, scene drive, payoff, page-turn and spread scene', () => {
    const report = buildChapterAttractionReviewReport(
      { id: 5, title: '超人的规则怪谈世界' },
      { id: 8, chapter_no: 2, title: '第一条规则' },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          reader_retention_brief: {
            opening_hook: '十点整，宿舍外所有路灯同时熄灭。',
            payoff_promise: '李超第一次发现蛮力会被规则边界反制。',
            short_drama_scene: '玻璃门外黑暗贴着门槛白线移动。',
            ending_question: '门外湿漉漉的学生说出李超的死因。',
          },
          scene_cards: [
            {
              title: '十点门槛',
              goal: '验证十点后不得离开宿舍的规则。',
              conflict: '李超想冲出去，张智必须阻止。',
              turning_point: '饼干碎屑越过门槛后被黑暗清除。',
              reader_payoff: '规则第一次反制超人蛮力。',
            },
          ],
        },
      },
      [
        '十点整，宿舍外所有路灯同时熄灭。',
        '宿舍大厅里，三个人听见挂钟咔哒一声。',
        '李超站在门口，想冲出去试试自己的力量。',
        '张智拦住他，用饼干碎屑试探门槛。',
        '碎屑越过门槛后消失，黑暗贴着白线移动。',
        '他第一次清楚发现，蛮力会被规则边界反制，自己再强也绕不过判定。',
        '门外湿漉漉的学生敲了敲玻璃，说出了李超的死因。',
      ].join('\n\n'),
    )

    expect(report.status).toBe('ok')
    expect(report.score).toBeGreaterThanOrEqual(80)
    expect(report.label).toBe('吸引力 OK')
    expect(report.dimensions.map((item: any) => item.key)).toEqual([
      'opening_hook',
      'scene_drive',
      'payoff_density',
      'page_turn',
      'spread_scene',
    ])
    expect(report.priority_repair).toBe('')
  })

  test('warns when chapter attraction misses page-turn and visible payoff', () => {
    const report = buildChapterAttractionReviewReport(
      { id: 5, title: '超人的规则怪谈世界' },
      { id: 8, chapter_no: 2, title: '第一条规则' },
      {
        chapter_target: {
          reader_retention_brief: {
            opening_hook: '十点整，宿舍外所有路灯同时熄灭。',
            payoff_promise: '李超第一次发现蛮力会被规则边界反制。',
            short_drama_scene: '玻璃门外黑暗贴着门槛白线移动。',
            ending_question: '门外湿漉漉的学生说出李超的死因。',
          },
          scene_cards: [
            { title: '十点门槛', goal: '验证规则', conflict: '想出去但不能出去', reader_payoff: '规则反制蛮力' },
          ],
        },
      },
      '李超和张智在大厅里讨论规则。林晓解释自己见过很多人消失。三个人坐着等天亮。',
    )

    expect(report.status).toBe('warn')
    expect(report.label).toContain('吸引力缺口')
    expect(report.weak_count).toBeGreaterThanOrEqual(2)
    expect(report.priority_repair).toContain('章末')
    expect(report.dimensions.find((item: any) => item.key === 'page_turn')?.status).toBe('warn')
    expect(report.next_actions.join('；')).toContain('前300字')
    expect(report.next_actions.join('；')).toContain('最后300字')
  })

  test('checks protagonist choice, cost and state change as story drive after delivery', () => {
    const project = { title: '寒门阵师' }
    const chapter = { id: 12, chapter_no: 12, title: '试炼资格' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        chapter_goal: '主角拿到试炼资格',
        core_conflict: '执事设局阻拦主角参加试炼',
        protagonist_choice: '主角当众选择用残阵反证阵图归属',
        choice_cost: '暴露阵盘裂纹，招来内门势力注意',
        state_change: '主角从被动挨压转为主动入局',
        scene_cards: [
          {
            title: '阵堂对峙',
            conflict: '执事设局阻拦主角参加试炼',
            turning_point: '主角当众选择用残阵反证阵图归属',
            reader_payoff: '主角拿到试炼资格',
            exit_state: '主角从被动挨压转为主动入局',
          },
        ],
      },
    }
    const drivenText = [
      '执事设局阻拦主角参加试炼，当众逼他交出阵图。',
      '主角没有退。他当众选择用残阵反证阵图归属，把残阵压在长案上。',
      '阵盘裂纹随之暴露，内门势力第一次注意到他，这就是选择代价。',
      '但他也因此拿到试炼资格，从被动挨压转为主动入局。',
    ].join('\n')
    const flatText = '执事在阵堂说了很多规矩，众人议论纷纷。主角听完解释，决定以后再想办法。夜色渐深，大家散去。'

    const okReport = buildStoryDriveSyncReport(project, chapter, contextPackage, drivenText)
    const warnReport = buildStoryDriveSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('故事力 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.score).toBeGreaterThanOrEqual(80)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('故事力缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('主角选择')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('选择代价')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('状态变化')
    expect(warnReport.next_actions.join('；')).toContain('主角主动选择')
  })

  test('story state sync persists a story_drive_sync review', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')

    expect(source).toContain("review_type: 'story_drive_sync'")
    expect(source).toContain('buildStoryDriveSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.story_drive_sync = storyDriveSync')
  })

  test('checks character desire, flaw pressure and growth beat after delivery', () => {
    const project = { title: '寒门阵师' }
    const chapter = { id: 13, chapter_no: 13, title: '裂纹代价' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 13,
        character_arc_brief: {
          character_name: '沈砚',
          desire: '沈砚想保住试炼资格并证明阵图属于自己',
          flaw_pressure: '他害怕暴露阵盘裂纹，只想继续藏拙',
          relationship_shift: '林青禾从旁观转为愿意替他作证',
          growth_beat: '沈砚第一次主动承认残阵缺陷，把藏拙改成公开争取',
          voice_anchor: '克制、冷静，但遇到阵法归属会寸步不让',
        },
        scene_cards: [
          {
            title: '裂纹作证',
            character_goal: '沈砚保住试炼资格并证明阵图属于自己',
            flaw_pressure: '害怕暴露阵盘裂纹',
            relationship_shift: '林青禾愿意替他作证',
            growth_beat: '主动承认残阵缺陷',
          },
        ],
      },
    }
    const grownText = [
      '沈砚想保住试炼资格，也要证明阵图属于自己。',
      '他原本害怕暴露阵盘裂纹，只想继续藏拙。',
      '可这一次，他没有再退，主动承认残阵缺陷，把藏拙改成公开争取。',
      '林青禾看见他把裂纹摆上台面，终于从旁观转为愿意替他作证。',
      '他的语气仍然克制冷静，可谈到阵法归属时寸步不让。',
    ].join('\n')
    const flatText = '沈砚在阵堂听别人争执。林青禾站在人群里没有表态。众人讨论许久，试炼资格暂时搁置。'

    const okReport = buildCharacterArcSyncReport(project, chapter, contextPackage, grownText)
    const warnReport = buildCharacterArcSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('人物弧光 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.score).toBeGreaterThanOrEqual(80)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('人物弧光缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('角色欲望')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('缺陷受压')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('成长节点')
    expect(warnReport.next_actions.join('；')).toContain('人物成长')
  })

  test('story state sync persists a character_arc_sync review', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')

    expect(source).toContain("review_type: 'character_arc_sync'")
    expect(source).toContain('buildCharacterArcSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.character_arc_sync = characterArcSync')
  })

  test('supports a manually edited chapter word target', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 8 }, { word_target_mode: 'custom', target_word_count: 5200 })

    expect(target.mode).toBe('custom')
    expect(target.target).toBe(5200)
    expect(target.min).toBe(4680)
    expect(target.max).toBe(5720)
    expect(target.rangeText).toBe('4680-5720 字')
  })

  test('builds a commercial editor rewrite prompt with concrete improvement dimensions', () => {
    const prompt = buildCommercialEditorRewritePrompt(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 1,
          title: '双魂降临',
          ending_hook: '午夜广播公布第一条规则。',
          word_target: resolveChapterWordTarget({}, { chapter_no: 1 }, {}),
          scene_cards: [
            {
              scene_no: 1,
              title: '操场醒来',
              opening_hook: '车祸后的第一口冷风。',
              reader_payoff: '超人力量与规则压制第一次碰撞。',
              fear_point: '尾音被黑暗吞掉。',
              rule_pressure: '十点后不得离开宿舍。',
              ending_hook_seed: '钟表停在九点五十八分。',
            },
          ],
        },
      },
      '初稿正文',
    )

    expect(prompt).toContain('商业主编改稿')
    expect(prompt).toContain('开篇钩子')
    expect(prompt).toContain('人物声音')
    expect(prompt).toContain('规则压力')
    expect(prompt).toContain('恐怖具象化')
    expect(prompt).toContain('爽点密度')
    expect(prompt).toContain('章末钩子')
    expect(prompt).toContain('删除模板句')
    expect(prompt).toContain('prose_chapters')
  })
})

describe('chapter pre-draft brief', () => {
  test('adds restrained meme strategy to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '超人的规则怪谈世界',
        genre: '规则怪谈',
        reference_config: {
          meme_bank: [
            {
              meme_key: '社畜崩溃式吐槽',
              function: '用上班人共鸣化解高压后的半拍吐槽',
              tone: '轻度吐槽',
              suitable_genres: ['规则怪谈'],
              abstract_usage: '角色在确认危险后用短句吐槽制度感压迫，不复刻原梗。',
            },
          ],
        },
      },
      {
        chapter_target: {
          chapter_no: 1,
          title: '双魂降临',
          summary: '李超和张智在午夜校园醒来。',
          conflict: '必须判断规则是否可信。',
          ending_hook: '广播响起。',
          scene_cards: [{ title: '操场醒来', reader_payoff: '超人力量遇到规则反制。' }],
        },
      },
    )

    expect(brief.meme_strategy.intensity).toBe('轻度')
    expect(brief.meme_strategy.allowed_functions).toContain('用上班人共鸣化解高压后的半拍吐槽')
    expect(brief.meme_strategy.forbidden_usage).toContain('严肃死亡场景不玩梗')
  })

  test('carries governance recheck memory into single-chapter pre-draft brief and confirmed context', () => {
    const contextPackage = {
      governance_recheck_memory: {
        source_run_id: 44,
        status: 'closed',
        label: '治理复查已记录',
        summary: '恢复依据闭环 2/2，本章必须继续继承上一轮修后证据。',
        evidence: ['第42章对白交锋已补回样章节奏'],
        failed_evidence: [],
        watch_items: ['下一章继续观察样章策略命中率'],
        storyline_decision_task_count: 0,
      },
      chapter_target: {
        chapter_no: 43,
        title: '复查后的新局',
        summary: '主角用新证据逼对手公开应答。',
        conflict: '对手试图绕开上一轮修复后的对白交锋。',
        ending_hook: '旧账本出现第二个签名。',
        scene_cards: [{ title: '当堂应答', reader_payoff: '对白交锋压住旧臣。' }],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '万字长篇' }, contextPackage)

    expect(brief.governance_recheck_memory).toMatchObject({
      source_run_id: 44,
      status: 'closed',
      label: '治理复查已记录',
    })
    expect(brief.governance_recheck_memory.evidence).toContain('第42章对白交锋已补回样章节奏')
    expect(brief.governance_recheck_memory.watch_items).toContain('下一章继续观察样章策略命中率')

    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-13T10:00:00.000Z',
    })

    expect(confirmedContext.governance_recheck_memory.evidence).toContain('第42章对白交锋已补回样章节奏')
    expect(confirmedContext.chapter_target.governance_recheck_memory.watch_items).toContain('下一章继续观察样章策略命中率')
  })

  test('builds a pre-draft brief from context package and commercial scene cards', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 1,
          title: '双魂降临',
          summary: '李超和张智在午夜校园醒来，必须在十点前进入宿舍。',
          conflict: '李超想靠蛮力破局，张智坚持先读规则。',
          ending_hook: '广播公布第一条规则，钟表指向九点五十八分。',
          word_target: target,
          scene_cards: [
            {
              scene_no: 1,
              title: '操场醒来',
              purpose: '确认穿越与身体异常。',
              conflict: '蛮力冲撞规则边界。',
              opening_hook: '车祸后的第一口冷风带着广播电流声。',
              reader_payoff: '超人力量首次展示，但规则空间能反制蛮力。',
              fear_point: '空校里影子会吞掉声音。',
              rule_pressure: '十点后不得离开宿舍。',
              information_gap: '广播是谁发出的。',
              reversal: '李超被无形墙弹回。',
              ending_hook_seed: '九点五十八分的倒计时。',
            },
          ],
        },
        writing_bible: {
          promise: '超人蛮力与规则智斗的双主角爽文。',
          style_lock: { payoff_density: '800-1200字一个小回报' },
        },
        setting_context: {
          required: ['午夜校园规则'],
          forbidden: ['规则源头真相'],
        },
      },
    )

    expect(brief.chapter_goal).toContain('午夜校园')
    expect(brief.reader_promise).toContain('超人')
    expect(brief.core_conflict).toContain('蛮力')
    expect(brief.key_settings).toContain('午夜校园规则')
    expect(brief.forbidden_content).toContain('规则源头真相')
    expect(brief.word_budget).toContain('3000')
    expect(brief.ending_hook).toContain('九点五十八分')
    expect(brief.scene_briefs[0].reader_payoff).toContain('规则空间')
  })

  test('adds previous chapter handoff to the pre-draft brief from continuity context', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        continuity: {
          previous_chapter: {
            chapter_no: 2,
            title: '第一条规则',
            ending_hook: '门外湿漉漉的校服男生敲响玻璃门。',
            ending_excerpt: '李超刚要开门，林晓脸色惨白地拦住他：“别开，他不是人。”玻璃门外，那男生慢慢抬头。',
          },
        },
        chapter_target: {
          chapter_no: 3,
          title: '门外学生',
          summary: '判断门外学生是否是规则诱饵。',
          conflict: '救人还是守规。',
          scene_cards: [
            { scene_no: 1, title: '门前对峙', reader_payoff: '识破门外学生的第一层规则诱饵。' },
          ],
        },
      },
    )

    expect(brief.previous_handoff).toContain('第2章《第一条规则》')
    expect(brief.previous_handoff).toContain('校服男生敲响玻璃门')
    expect(brief.previous_handoff).toContain('别开，他不是人')
  })

  test('adds reader retention radar to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '超人的规则怪谈世界',
        synopsis: '超人蛮力与规则怪谈智斗的双主角长篇。',
        reference_config: {
          writing_bible: {
            commercial_positioning: {
              retention_strategy: '前三章快速展示规则反制和双主角互补。',
            },
          },
        },
      },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '十点后宿舍外的黑暗开始清除违规者。',
          conflict: '李超想试探门外阴影，张智必须阻止他。',
          ending_hook: '门外湿漉漉的学生敲响玻璃门。',
          scene_cards: [
            {
              scene_no: 1,
              title: '十点门槛',
              opening_hook: '九点五十九分最后一秒被秒针推过去。',
              reader_payoff: '超人力量第一次被规则边界反制。',
              information_gap: '门外阴影到底按什么判定清除目标。',
              reversal: '饼干碎屑越过门槛后被黑暗吞掉。',
              ending_hook_seed: '门外出现湿漉漉的校服男生。',
            },
          ],
        },
        writing_bible: {
          promise: '超人开挂但必须被规则逼着动脑。',
        },
      },
    )

    expect(brief.reader_retention_brief.opening_hook).toContain('九点五十九分')
    expect(brief.reader_retention_brief.payoff_promise).toContain('规则边界反制')
    expect(brief.reader_retention_brief.information_gap).toContain('阴影')
    expect(brief.reader_retention_brief.emotional_reward).toContain('超人开挂')
    expect(brief.reader_retention_brief.short_drama_scene).toContain('十点门槛')
    expect(brief.reader_retention_brief.ending_question).toContain('湿漉漉')
    expect(brief.reader_retention_brief.forbidden_cliches).toContain('只写环境氛围不推进目标')
  })

  test('adds reader expectation ledger to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '超人的规则怪谈世界',
        synopsis: '超人蛮力与规则怪谈智斗的双主角长篇。',
        reference_config: {
          story_state: {
            payoff_queue: ['湿漉漉学生身份待回收'],
            open_questions: ['宿舍外黑暗按什么规则清除目标'],
          },
        },
      },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '十点后宿舍外的黑暗开始清除违规者。',
          conflict: '李超想试探门外阴影，张智必须阻止他。',
          ending_hook: '门外湿漉漉的学生敲响玻璃门。',
          scene_cards: [
            {
              scene_no: 1,
              title: '十点门槛',
              opening_hook: '九点五十九分最后一秒被秒针推过去。',
              reader_payoff: '超人力量第一次被规则边界反制。',
              information_gap: '门外阴影到底按什么判定清除目标。',
              ending_hook_seed: '门外出现湿漉漉的校服男生。',
            },
          ],
        },
        story_state: {
          payoff_queue: ['带血腰牌真相待回收'],
          open_questions: ['广播是谁发出的'],
        },
        writing_bible: {
          promise: '超人开挂但必须被规则逼着动脑。',
        },
      },
    )

    expect(brief.reader_expectation_ledger.must_deliver.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'opening_hook',
      'payoff_promise',
      'scene_payoff_1',
      'ending_hook',
    ]))
    expect(brief.reader_expectation_ledger.must_deliver.map((item: any) => item.text).join('｜')).toContain('规则边界反制')
    expect(brief.reader_expectation_ledger.keep_alive.map((item: any) => item.text).join('｜')).toContain('广播是谁发出的')
    expect(brief.reader_expectation_ledger.keep_alive.map((item: any) => item.text).join('｜')).toContain('宿舍外黑暗')
    expect(brief.reader_expectation_ledger.must_not_break).toContain('已承诺的爽点、悬念和情绪回报不能整章只铺设定不兑现')
  })

  test('carries unresolved reader expectation debt into the next pre-draft brief', () => {
    const debtContext = buildReaderExpectationDebtContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 91,
          chapter_id: 2,
          review_type: 'reader_expectation_sync',
          created_at: '2026-06-09T08:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            reader_expectation_sync: {
              status: 'warn',
              missed: [
                { key: 'ending_hook', label: '章末追读', type: 'hook', text: '湿漉漉学生敲响玻璃门' },
              ],
              keep_alive: [
                { key: 'open_question', label: '保留悬念', type: 'question', text: '广播是谁发出的' },
              ],
            },
          }),
        },
      ],
    )
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        reader_expectation_debt_context: debtContext,
        chapter_target: {
          chapter_no: 3,
          title: '门外学生',
          summary: '判断门外学生是否是规则诱饵。',
          conflict: '救人还是守规。',
          ending_hook: '玻璃门上的水迹拼出一个名字。',
          scene_cards: [
            { scene_no: 1, title: '门前对峙', reader_payoff: '识破门外学生的第一层规则诱饵。' },
          ],
        },
      },
    )

    expect(debtContext.must_carry[0].text).toContain('湿漉漉学生')
    expect(debtContext.keep_alive[0].text).toContain('广播是谁发出的')
    expect(brief.reader_expectation_debt.must_carry[0].text).toContain('湿漉漉学生')
    expect(brief.reader_expectation_ledger.carry_over[0].text).toContain('湿漉漉学生')
    expect(brief.reader_expectation_ledger.must_deliver.map((item: any) => item.text).join('｜')).toContain('湿漉漉学生')
    expect(brief.reader_expectation_ledger.keep_alive.map((item: any) => item.text).join('｜')).toContain('广播是谁发出的')
  })

  test('carries previous chapter delivery risks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 201,
          chapter_id: 2,
          review_type: 'chapter_attraction_review',
          created_at: '2026-06-09T08:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            chapter_attraction_review: {
              status: 'warn',
              label: '吸引力缺口 2',
              weak_count: 2,
              priority_repair: '优先修章末翻页',
              weak_dimensions: [
                { label: '开篇钩子', issue: '开篇没有直接接住门外学生。' },
                { label: '章末翻页', issue: '结尾没有留下门外学生身份问题。' },
              ],
            },
          }),
        },
        {
          id: 202,
          chapter_id: 2,
          review_type: 'innovation_sync',
          created_at: '2026-06-09T08:02:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            innovation_sync: {
              status: 'warn',
              label: '创新缺口 1',
              missed_count: 1,
              missed: [{ label: '规则反差', issue: '超人力量没有和宿舍规则形成新鲜反差。' }],
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '门外学生',
        summary: '判断门外学生是否是规则诱饵。',
        conflict: '救人还是守规。',
        ending_hook: '玻璃门上的水迹拼出一个名字。',
        scene_cards: [
          { scene_no: 1, title: '门前对峙', reader_payoff: '识破门外学生的第一层规则诱饵。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 3')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修章末翻页')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修吸引力：吸引力缺口 2')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补创新：创新缺口 1')
    expect(context.chapter_target.delivery_risk_carry_over.priority_label).toBe('优先修章末翻页')
    expect(prompt).toContain('【上一章交稿风险承接】')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('修吸引力：吸引力缺口 2')
    expect(prompt).toContain('补创新：创新缺口 1')
  })

  test('carries single-chapter governance recheck misses into the next delivery risk brief', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 43, chapter_no: 43, title: '复查后的新局' },
      [
        { id: 42, chapter_no: 42, title: '旧证重审' },
        { id: 43, chapter_no: 43, title: '复查后的新局' },
      ],
      [
        {
          id: 301,
          chapter_id: 42,
          review_type: 'governance_recheck_sync',
          created_at: '2026-06-13T08:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 42,
            chapter_no: 42,
            governance_recheck_sync: {
              status: 'warn',
              label: '恢复依据缺口 2',
              missed_count: 2,
              failed_evidence: ['第42章对白交锋已补回样章节奏'],
              watch_items: ['下一章继续观察样章策略命中率'],
            },
          }),
        },
      ],
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先验恢复依据')
    expect(deliveryRiskCarryOver?.items).toContain('验恢复依据：恢复依据缺口 2')
    expect(deliveryRiskCarryOver?.required_actions.join('｜')).toContain('修复：第42章对白交锋已补回样章节奏')
  })

  test('marks aged reader expectation debt as overdue in context, brief, and prose prompt', () => {
    const debtContext = buildReaderExpectationDebtContext(
      { id: 6, chapter_no: 6, title: '旧债压场' },
      [
        { id: 1, chapter_no: 1, title: '双魂降临' },
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '夜巡脚步' },
        { id: 5, chapter_no: 5, title: '宿舍水痕' },
        { id: 6, chapter_no: 6, title: '旧债压场' },
      ],
      [
        {
          id: 101,
          chapter_id: 2,
          review_type: 'reader_expectation_sync',
          created_at: '2026-06-09T08:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            reader_expectation_sync: {
              status: 'warn',
              missed: [
                { key: 'ending_hook', label: '章末追读', type: 'hook', text: '湿漉漉学生敲响玻璃门后消失' },
              ],
              keep_alive: [
                { key: 'open_question', label: '保留悬念', type: 'question', text: '广播是谁发出的' },
              ],
            },
          }),
        },
      ],
    )
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        reader_expectation_debt_context: debtContext,
        chapter_target: {
          chapter_no: 6,
          title: '旧债压场',
          summary: '把前面积压的门外学生悬念推进成宿舍规则危机。',
          conflict: '继续守规还是反查广播源头。',
          ending_hook: '广播第一次叫出了李超的真名。',
          scene_cards: [],
        },
      },
    )
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        reader_expectation_debt_context: debtContext,
        chapter_target: {
          chapter_no: 6,
          title: '旧债压场',
          summary: '把前面积压的门外学生悬念推进成宿舍规则危机。',
          conflict: '继续守规还是反查广播源头。',
          ending_hook: '广播第一次叫出了李超的真名。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 6, title: '旧债压场' },
    )

    expect(debtContext.must_carry[0].age_chapters).toBe(4)
    expect(debtContext.must_carry[0].overdue).toBe(true)
    expect(debtContext.keep_alive[0].overdue).toBe(true)
    expect(debtContext.overdue_count).toBe(2)
    expect(debtContext.overdue.map((item: any) => item.text).join('｜')).toContain('湿漉漉学生')
    expect(brief.reader_expectation_debt.overdue_count).toBe(2)
    expect(brief.reader_expectation_debt.summary).toContain('逾期 2 项')
    expect(prompt).toContain('逾期待补')
    expect(prompt).toContain('湿漉漉学生敲响玻璃门后消失')
  })

  test('adds storyline advances, plants, payoffs, and forbidden items to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 12,
          title: '旧规则失效',
          summary: '林晓旧经验失效，张智发现新规则漏洞。',
          conflict: '继续相信旧守则还是冒险验证第零条规则。',
          ending_hook: '第零条规则第一次显形。',
          word_target: { target: 3000, rangeText: '标准章 2800-3500字' },
          scene_cards: [],
        },
        storyline_context: {
          required: ['规则之源调查', '林晓求生支线'],
          forbidden: ['编织者真名'],
          chapter_usage: [
            { usage_type: 'advance', name: '规则之源调查', expected_state_change: { next: '获得第一块真相拼图' } },
            { usage_type: 'plant', name: '第零条规则回收线', expected_state_change: { clue: '守则页脚异常' } },
            { usage_type: 'payoff', name: '林晓求生支线', expected_state_change: { payoff: '证明林晓两天经验不完整' } },
            { usage_type: 'forbidden', name: '编织者真名', expected_state_change: { forbidden: '不可揭露幕后外神身份' } },
          ],
        },
      },
    )

    expect(brief.storyline_advances).toContain('规则之源调查')
    expect(brief.storyline_advances).toContain('林晓求生支线')
    expect(brief.storyline_plants).toContain('第零条规则回收线')
    expect(brief.storyline_payoffs).toContain('林晓求生支线')
    expect(brief.storyline_forbidden).toContain('编织者真名')
  })

  test('adds character growth obligations to the pre-draft brief and prose context', () => {
    const characterArcEntity = {
      id: 701,
      entity_type: 'character_arc',
      name: '李玄藏拙到公开争取',
      summary: '李玄从害怕暴露残阵，转向主动承认缺陷并争取试炼资格。',
      constraints_json: {
        forbidden_reveal: '不得提前写成彻底公开身份。',
      },
      state_json: {
        current_state: '仍在藏拙，但已经被执事逼到边缘。',
        last_advanced_chapter: 4,
        next_advance_chapter: 8,
      },
      payload_json: {
        related_characters: ['李玄'],
        desire: '保住试炼资格并证明阵图属于自己',
        flaw_pressure: '害怕暴露残阵裂纹，只想继续藏拙',
        growth_target: '第一次主动承认残阵缺陷，把藏拙改成公开争取',
        voice_anchor: '克制、冷静，但遇到阵法归属寸步不让',
      },
    }
    const relationshipArcEntity = {
      id: 702,
      entity_type: 'relationship_arc',
      name: '李玄与林青禾互信线',
      summary: '林青禾从旁观者转为愿意替李玄作证。',
      constraints_json: {
        forbidden_reveal: '不得提前写成完全信任。',
      },
      state_json: {
        current_state: '林青禾仍在观察李玄。',
        next_advance_chapter: 8,
      },
      payload_json: {
        related_characters: ['李玄', '林青禾'],
        relationship_shift: '林青禾从旁观转为愿意替他作证',
      },
    }
    const brief = buildChapterPreDraftBrief(
      { title: '残阵问道' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '试炼前夜',
          summary: '李玄在试炼前夜被迫公开残阵缺陷。',
          conflict: '执事逼他交出阵图，林青禾必须决定是否作证。',
          ending_hook: '残阵亮起第二道裂纹。',
          scene_cards: [],
        },
        setting_context: {
          entities: [characterArcEntity, relationshipArcEntity],
          chapter_usage: [
            { entity_id: 701, usage_type: 'advance', expected_state_change: { growth_beat: '主动承认残阵缺陷' } },
            { entity_id: 702, usage_type: 'advance', expected_state_change: { relationship_shift: '林青禾第一次公开作证' } },
          ],
        },
      },
    )
    const confirmedAt = '2026-06-10T09:00:00.000Z'
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 8,
          title: '试炼前夜',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      { ...brief, confirmed_at: confirmedAt },
    )
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '残阵问道' },
      context,
      null,
      { chapter_no: 8, title: '试炼前夜' },
    )

    expect(brief.character_arc_brief.desire).toContain('保住试炼资格')
    expect(brief.character_arc_brief.flaw_pressure).toContain('继续藏拙')
    expect(brief.character_arc_brief.growth_beat).toContain('公开争取')
    expect(brief.character_arc_brief.relationship_shift).toContain('公开作证')
    expect(brief.character_arc_brief.voice_anchor).toContain('寸步不让')
    expect(brief.character_arc_brief.forbidden_reveal).toContain('完全信任')
    expect(brief.character_arc_brief.arcs.map((item: any) => item.name)).toContain('李玄藏拙到公开争取')
    expect(context.chapter_target.character_arc_brief.growth_beat).toContain('公开争取')
    expect(prompt).toContain('【人物成长承接】')
    expect(prompt).toContain('主动承认残阵缺陷')
    expect(prompt).toContain('不得只在旁白里说人物成长')
  })

  test('adds longform compass boundaries to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          axes: [
            { key: 'core_conflict', label: '核心矛盾', value: '蛮力不能直接碾压规则。' },
            { key: 'payoff_loop', label: '长期爽点循环', value: '每章一次规则发现或力量反制。' },
          ],
          immutable_rules: ['超人力量不能无代价碾压规则', '双主角互补不能拆散'],
          flexible_zones: ['副本题材可换，但必须服务规则破局主线'],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          scene_cards: [{ scene_no: 1, title: '门槛', reader_payoff: '规则边界第一次显形。' }],
        },
      },
    )

    expect(brief.longform_compass.reader_promise).toContain('规则判定')
    expect(brief.longform_compass.immutable_rules).toContain('超人力量不能无代价碾压规则')
    expect(brief.longform_compass.flexible_zones).toContain('副本题材可换，但必须服务规则破局主线')
    expect(brief.longform_compass.axes.find((axis: any) => axis.key === 'core_conflict')?.value).toContain('蛮力')
  })

  test('adds core contract radar to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '超人的规则怪谈世界',
        reference_config: {
          writing_bible: {
            promise: '超人力量和规则判定持续碰撞。',
          },
        },
      },
      {
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          core_conflict: '蛮力破局与规则判定的对抗。',
          innovation_hook: '超人能力被规则空间反制。',
          immutable_rules: ['不能把规则怪谈写成纯打怪', '双主角互补不能拆散'],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '验证十点门槛的规则边界。',
          conflict: '李超想硬闯，张智要求低成本验证。',
          chapter_launch_gate: {
            reader_promise: { status: 'warn', reason: '超人力量与规则判定碰撞不够可见' },
            mainline_service: { status: 'block', reason: '本章必须推进午夜校园规则调查' },
          },
          scene_cards: [
            { scene_no: 1, title: '十点门槛', reader_payoff: '超人力量第一次被规则边界反制。' },
          ],
        },
      },
    )

    expect(brief.core_contract_radar.summary).toContain('超人力量')
    expect(brief.core_contract_radar.must_serve).toContain('超人力量和规则判定持续碰撞。')
    expect(brief.core_contract_radar.must_serve).toContain('蛮力破局与规则判定的对抗。')
    expect(brief.core_contract_radar.must_serve).toContain('超人能力被规则空间反制。')
    expect(brief.core_contract_radar.must_serve).toContain('超人力量第一次被规则边界反制。')
    expect(brief.core_contract_radar.no_drift).toContain('不能把规则怪谈写成纯打怪')
    expect(brief.core_contract_radar.repair_focus.join('｜')).toContain('本章必须推进午夜校园规则调查')
    expect(brief.core_contract_radar.checks.map((check: any) => check.label)).toContain('主线服务')
  })

  test('adds longform battle desk risks to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        longformBattleDesk: {
          status: 'needs_action',
          score: 72,
          summary: '先修复读者拉力和核心守恒，再进入正文。',
          riskChips: ['核心偏移', '前30章留存'],
          primaryAction: {
            key: 'run_first30_retention',
            label: '运行前30章诊断',
            reason: '第2章章末钩子弱，必须补读者期待。',
          },
          lanes: [
            {
              key: 'story_core',
              label: '核心守恒',
              status: 'warn',
              score: 68,
              detail: '核心偏移：超人力量被写成普通无敌碾压。',
              action: '本章必须写出规则判定反制蛮力。',
            },
            {
              key: 'reader_pull',
              label: '读者拉力',
              status: 'block',
              score: 55,
              detail: '前30章留存弱：开篇钩子和章末追读不足。',
              action: '前300字给危机，章末留下门外学生悬念。',
            },
            {
              key: 'innovation_ip',
              label: '创新/IP场面',
              status: 'ok',
              score: 86,
              detail: '十点门槛具备可视化场面。',
            },
          ],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          scene_cards: [],
        },
      },
    )

    expect(brief.longform_battle_context.status).toBe('needs_action')
    expect(brief.longform_battle_context.risk_chips).toContain('核心偏移')
    expect(brief.longform_battle_context.primary_action.label).toBe('运行前30章诊断')
    expect(brief.longform_battle_context.risk_lanes.map((lane: any) => lane.key)).toEqual(['story_core', 'reader_pull'])
    expect(brief.longform_battle_context.risk_lanes[0].required_action).toContain('规则判定反制蛮力')
    expect(brief.longform_battle_context.lanes.find((lane: any) => lane.key === 'innovation_ip')?.detail).toContain('十点门槛')
  })

  test('adds chapter innovation execution to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '超人的规则怪谈世界',
        reference_config: {
          writing_bible: {
            innovation_hook: '超人力量不能碾压规则，必须用规则漏洞反制。',
            commercial_positioning: {
              selling_points: ['超人蛮力撞上规则判定', '智者拆规则反杀'],
            },
          },
        },
      },
      {
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          axes: [
            { key: 'innovation_hook', label: '创新卖点', value: '超人不是无敌爽，而是每次强行动手都会被规则反噬。' },
            { key: 'world_hook', label: '世界奇点', value: '每个副本都是可验证的规则系统。' },
          ],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '十点门槛第一次显形。',
          conflict: '李超想硬闯，张智要求先验证边界。',
          scene_cards: [
            {
              scene_no: 1,
              title: '十点门槛',
              reader_payoff: '用饼干碎屑验证黑暗清除规则。',
              rule_pressure: '十点后不得离开宿舍。',
              reversal: '超人力量无法越过判定边界。',
            },
          ],
        },
      },
    )

    expect(brief.innovation_brief.chapter_angle).toContain('规则反噬')
    expect(brief.innovation_brief.execution_points).toContain('用饼干碎屑验证黑暗清除规则')
    expect(brief.innovation_brief.differentiation_guardrails).toContain('不得写成普通开挂碾压')
    expect(brief.innovation_brief.ip_adaptation_hooks).toContain('十点门槛')
  })

  test('adds rolling-plan signature scene repair obligations to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 9,
          title: '新压力源',
          summary: '安全区被迫变成临时战场。',
          conflict: '旧秩序压制新晋黑马。',
          ending_hook: '道具背面刻着禁用标记。',
          rollingPlan: {
            signature_scene: '主角在倒塌走廊里反手点亮禁用阵纹，把安全区变成审判场。',
            scene_repair_target: '修复 IP场面覆盖 1/10 的强场面空窗。',
            reader_payoff: '规则反杀爽点。',
            storyline_service: '推进外门试炼主线。',
          },
          scene_cards: [],
        },
      },
    )

    expect(brief.signature_scene_brief.signature_scene).toContain('审判场')
    expect(brief.signature_scene_brief.scene_repair_target).toContain('IP场面覆盖 1/10')
    expect(brief.signature_scene_brief.reader_payoff).toContain('规则反杀')
    expect(brief.signature_scene_brief.storyline_service).toContain('外门试炼主线')
  })

  test('adds next batch serial brief to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapterRangeLabel: '第8-10章',
          batchGoal: '三章内进入内门视野。',
          readerPayoffPlan: '升级、打脸、规则反制逐章交付。',
          mainlineFocus: '外门危机 -> 内门招揽',
          forbiddenBoundary: '第10章前不得揭露规则源头。',
          startChecklist: [
            { key: 'core_promise', label: '核心承诺', status: 'ok', detail: '主角必须以规则反制兑现逆袭承诺。' },
            { key: 'forbidden_boundary', label: '禁写边界', status: 'ok', detail: '第10章前不得揭露规则源头。' },
          ],
          chapters: [
            { chapterNo: 8, title: '外门夜钟', chapterTask: '证明夜钟规则有效。', conflict: '是否相信敌人提示。', endingHook: '钟声倒数。' },
            { chapterNo: 9, title: '反制试探', chapterTask: '用超人速度验证边界。', conflict: '速度能否绕过规则。', endingHook: '内门令牌出现。' },
          ],
        },
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          scene_cards: [],
        },
      },
    )

    expect(brief.next_batch_brief.chapter_range_label).toBe('第8-10章')
    expect(brief.next_batch_brief.batch_goal).toContain('内门视野')
    expect(brief.next_batch_brief.reader_payoff_plan).toContain('打脸')
    expect(brief.next_batch_brief.current_chapter_role).toContain('证明夜钟规则有效')
    expect(brief.next_batch_brief.forbidden_boundary).toContain('规则源头')
    expect(brief.next_batch_brief.start_checklist.map((item: any) => item.key)).toEqual(['core_promise', 'forbidden_boundary'])
    expect(brief.next_batch_brief.start_checklist[0].detail).toContain('规则反制')
  })

  test('adds longform memory capsule to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '万古长夜' },
      {
        longform_memory_capsule: {
          last_updated_chapter: 7,
          core_promise: '寒门少年以阵法改写宗门秩序。',
          mainline_progress: '外门压迫线推进到试炼前夜。',
          character_states: ['李玄：仍在藏拙，但已经被执事逼到试炼边缘'],
          open_questions: ['残阵缺口为什么会回应旧案禁制'],
          payoff_debts: ['试炼资格被夺后的公开打脸回报'],
          canon_facts: ['残阵缺口不能被普通阵图修复'],
          red_lines: ['主角不能脱离阵法成长线'],
        },
        chapter_target: {
          chapter_no: 8,
          title: '试炼前夜',
          summary: '李玄必须决定是否公开承认残阵缺陷。',
          scene_cards: [],
        },
      },
    )

    expect(brief.longform_memory_capsule.core_promise).toContain('寒门少年')
    expect(brief.longform_memory_capsule.mainline_progress).toContain('试炼前夜')
    expect(brief.longform_memory_capsule.character_states[0]).toContain('李玄')
    expect(brief.longform_memory_capsule.open_questions).toContain('残阵缺口为什么会回应旧案禁制')
    expect(brief.longform_memory_capsule.payoff_debts).toContain('试炼资格被夺后的公开打脸回报')
    expect(brief.longform_memory_capsule.red_lines).toContain('主角不能脱离阵法成长线')
  })

  test('adds story unit context to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        story_unit_context: {
          title: '试炼前夜剧情单元',
          chapter_range_label: '第7-12章',
          current_chapter_role: '入口钩子',
          unit_goal: '六章内完成外门试炼前夜事件包。',
          entry_hook: '第7章以试炼倒计时开场。',
          pressure_escalation: ['执事设局', '试炼规则反噬'],
          mini_climax_payoff: '第10章公开打脸执事。',
          setup_and_storyline: ['阵盘第二道裂纹埋线', '外门压迫主线阶段兑现'],
          exit_hook: '第12章内门长老亲自点名。',
          forbidden_advance: ['不得提前解决内门招揽条件'],
        },
        chapter_target: {
          chapter_no: 7,
          title: '试炼倒计时',
          summary: '试炼前夜规则开始收紧。',
          scene_cards: [],
        },
      },
    )

    expect(brief.story_unit_context.title).toBe('试炼前夜剧情单元')
    expect(brief.story_unit_context.current_chapter_role).toBe('入口钩子')
    expect(brief.story_unit_context.unit_goal).toContain('外门试炼前夜')
    expect(brief.story_unit_context.pressure_escalation).toContain('执事设局')
    expect(brief.story_unit_context.mini_climax_payoff).toContain('公开打脸')
    expect(brief.story_unit_context.forbidden_advance).toContain('不得提前解决内门招揽条件')
  })

  test('merges a confirmed pre-draft brief into chapter generation context', () => {
    const confirmedAt = '2026-06-03T10:00:00.000Z'
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '守则初读',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_goal: '读懂宿舍守则并发现第零条规则。',
        reader_promise: '用智力拆规则，给读者一次反转。',
        core_conflict: '是否相信林晓提供的旧规则。',
        emotional_curve: '紧张 -> 试探 -> 惊疑',
        key_settings: ['宿舍守则'],
        forbidden_content: ['幕后主神'],
        scene_briefs: [{ scene_no: 1, title: '守则册', reader_payoff: '发现漏洞' }],
        storyline_advances: ['规则之源调查'],
        storyline_plants: ['第零条规则回收线'],
        storyline_payoffs: ['林晓求生支线'],
        storyline_forbidden: ['编织者真名'],
        meme_strategy: {
          intensity: '轻度',
          allowed_functions: ['主角吐槽', '规则怪谈弹幕感'],
          forbidden_usage: ['死亡场景不玩梗'],
        },
        reader_retention_brief: {
          opening_hook: '第一段直接落在十点门槛判定。',
          payoff_promise: '让读者看到蛮力被规则反制。',
          information_gap: '门外学生为什么能在规则时间后出现。',
          emotional_reward: '紧张后给一次智者识破规则的回报。',
          short_drama_scene: '玻璃门内外对峙，黑暗贴着门槛爬动。',
          ending_question: '湿漉漉学生到底是求救者还是规则诱饵。',
          forbidden_cliches: ['不要用长篇背景解释替代现场危机'],
        },
        reader_expectation_ledger: {
          chapter_promise: '本章必须让读者看到蛮力被规则反制。',
          must_deliver: [
            { key: 'payoff_promise', label: '爽点承诺', type: 'payoff', text: '让读者看到蛮力被规则反制。' },
            { key: 'ending_hook', label: '章末追读', type: 'hook', text: '湿漉漉学生到底是求救者还是规则诱饵。' },
          ],
          keep_alive: [
            { key: 'open_question_1', label: '保留悬念', type: 'question', text: '广播是谁发出的。' },
          ],
          must_not_break: ['不能整章只铺设定不兑现规则反制'],
        },
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          immutable_rules: ['超人力量不能无代价碾压规则'],
          flexible_zones: ['副本题材可换，但必须服务规则破局主线'],
        },
        innovation_brief: {
          chapter_angle: '超人硬闯被规则边界反噬。',
          execution_points: ['用饼干碎屑验证门槛清除规则'],
          differentiation_guardrails: ['不得写成普通开挂碾压'],
          ip_adaptation_hooks: ['玻璃门内外对峙'],
        },
        longform_battle_context: {
          status: 'needs_action',
          summary: '先修复核心守恒。',
          risk_chips: ['核心偏移'],
          primary_action: { key: 'open_quality_revision', label: '进入质检修订', reason: '核心矛盾要回到规则判定反制。' },
          risk_lanes: [
            {
              key: 'story_core',
              label: '核心守恒',
              status: 'warn',
              score: 68,
              detail: '核心偏移：超人力量被写成普通无敌碾压。',
              required_action: '本章必须写出规则判定反制蛮力。',
            },
          ],
        },
        next_batch_brief: {
          chapter_range_label: '第2-4章',
          batch_goal: '三章内完成午夜校园第一轮规则试探。',
          reader_payoff_plan: '每章一次规则显形或力量反制。',
          mainline_focus: '规则初识 -> 规则漏洞',
          forbidden_boundary: '不得提前揭露规则源头。',
          current_chapter_role: '本章负责读懂宿舍守则。',
        },
        story_unit_context: {
          title: '午夜校园第一轮规则试探剧情单元',
          chapter_range_label: '第2-6章',
          current_chapter_role: '压力升级/推进',
          unit_goal: '五章内完成第一条规则的验证、误判和小回收。',
          mini_climax_payoff: '第5章让李超用规则漏洞反制宿管。',
          exit_hook: '第6章第零条规则显形。',
          forbidden_advance: ['不得提前揭露广播源头'],
        },
        longform_memory_capsule: {
          core_promise: '超人力量和规则判定持续碰撞。',
          character_states: ['李超：力量觉醒但不懂规则'],
          open_questions: ['广播是谁发出的'],
          payoff_debts: ['规则边界反制蛮力'],
          red_lines: ['超人力量不能无代价碾压规则'],
        },
        word_budget: '标准章 3000 字',
        ending_hook: '镜子里出现第四个人。',
        confirmed_at: confirmedAt,
      },
    )

    expect(context.pre_draft_brief.confirmed_at).toBe(confirmedAt)
    expect(context.chapter_target.summary).toContain('读懂宿舍守则')
    expect(context.chapter_target.conflict).toContain('林晓')
    expect(context.chapter_target.ending_hook).toContain('镜子')
    expect(context.chapter_target.reader_promise).toContain('反转')
    expect(context.chapter_target.scene_cards[0].reader_payoff).toContain('漏洞')
    expect(context.chapter_target.storyline_advances).toContain('规则之源调查')
    expect(context.chapter_target.storyline_plants).toContain('第零条规则回收线')
    expect(context.chapter_target.storyline_payoffs).toContain('林晓求生支线')
    expect(context.chapter_target.storyline_forbidden).toContain('编织者真名')
    expect(context.chapter_target.meme_strategy.allowed_functions).toContain('主角吐槽')
    expect(context.chapter_target.reader_retention_brief.opening_hook).toContain('十点门槛')
    expect(context.chapter_target.reader_retention_brief.payoff_promise).toContain('蛮力')
    expect(context.chapter_target.reader_retention_brief.short_drama_scene).toContain('玻璃门')
    expect(context.chapter_target.reader_expectation_ledger.must_deliver[0].text).toContain('蛮力被规则反制')
    expect(context.chapter_target.reader_expectation_ledger.keep_alive[0].text).toContain('广播')
    expect(context.chapter_target.longform_compass.immutable_rules).toContain('超人力量不能无代价碾压规则')
    expect(context.longform_compass.reader_promise).toContain('规则判定')
    expect(context.chapter_target.longform_battle_context.risk_chips).toContain('核心偏移')
    expect(context.chapter_target.longform_battle_context.risk_lanes[0].required_action).toContain('规则判定反制蛮力')
    expect(context.longform_battle_context.primary_action.label).toBe('进入质检修订')
    expect(context.chapter_target.innovation_brief.chapter_angle).toContain('规则边界反噬')
    expect(context.chapter_target.innovation_brief.execution_points).toContain('用饼干碎屑验证门槛清除规则')
    expect(context.chapter_target.next_batch_brief.current_chapter_role).toContain('读懂宿舍守则')
    expect(context.next_batch_brief.batch_goal).toContain('第一轮规则试探')
    expect(context.chapter_target.story_unit_context.current_chapter_role).toContain('压力升级')
    expect(context.chapter_target.story_unit_context.mini_climax_payoff).toContain('反制宿管')
    expect(context.story_unit_context.title).toContain('午夜校园')
    expect(context.chapter_target.longform_memory_capsule.character_states[0]).toContain('李超')
    expect(context.longform_memory_capsule.open_questions).toContain('广播是谁发出的')
  })

  test('merges confirmed core contract radar into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 2,
        chapter_goal: '验证十点门槛。',
        core_contract_radar: {
          summary: '本章必须把超人力量撞上规则判定写成可见事件。',
          must_serve: ['超人力量和规则判定持续碰撞', '蛮力破局与规则判定的对抗'],
          no_drift: ['不能把规则怪谈写成纯打怪'],
          repair_focus: ['补足规则判定反制蛮力'],
          checks: [{ key: 'reader_promise', label: '读者承诺', status: 'warn', reason: '碰撞不够可见' }],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.core_contract_radar.must_serve).toContain('超人力量和规则判定持续碰撞')
    expect(context.chapter_target.core_contract_radar.no_drift).toContain('不能把规则怪谈写成纯打怪')
    expect(context.core_contract_radar.repair_focus).toContain('补足规则判定反制蛮力')
  })

  test('builds storyline context in the chapter context package', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')

    expect(source).toContain('storyline_context')
    expect(source).toContain('STORYLINE_TYPES')
    expect(source).toContain('storylineAdvances')
    expect(source).toContain('storylineForbidden')
  })
})

describe('readability and restrained meme workflow', () => {
  test('normalizes style sample bank into abstract style usage instead of copied excerpts', () => {
    const samples = normalizeStyleSampleBank([
      {
        sample_key: '规则怪谈高压吐槽',
        sample_text: '李超盯着门外的黑影，心里只剩一个念头：这破学校连晚自习都外包给影子了。',
        scene_function: '高压后半拍吐槽',
        narrative_rhythm: '短句推进，动作后接一句轻吐槽',
        sentence_pattern: '短中句为主',
        dialogue_ratio: '40%',
        forbidden_copy: ['这破学校连晚自习都外包给影子了'],
        applicable_scenes: ['高压反打', '规则压迫'],
        avoid_scenes: ['纯背景说明', '严肃死亡收束'],
      },
    ])

    expect(samples).toHaveLength(1)
    expect(samples[0].sample_key).toBe('规则怪谈高压吐槽')
    expect(samples[0].abstract_usage).toContain('高压后半拍吐槽')
    expect(samples[0].abstract_usage).toContain('只学习节奏')
    expect(samples[0].unsafe_direct_phrases).toContain('这破学校连晚自习都外包给影子了')
    expect(samples[0].applicable_scenes).toEqual(['高压反打', '规则压迫'])
    expect(samples[0].avoid_scenes).toEqual(['纯背景说明', '严肃死亡收束'])
    expect(samples[0].sample_text).toBeUndefined()
  })

  test('adds style sample strategy to the pre-draft brief and prose prompt', () => {
    const project = {
      title: '超人的规则怪谈世界',
      reference_config: {
        style_sample_bank: [
          {
            sample_key: '世界观铺垫说明',
            scene_function: '低压过场中的背景信息铺垫',
            narrative_rhythm: '慢速说明，补齐规则源流',
            sentence_pattern: '中长句解释',
            dialogue_ratio: '10%-20%',
            abstract_usage: '只学习解释顺序',
            unsafe_direct_phrases: ['原句不能照搬'],
            applicable_scenes: ['纯背景说明', '低压日常过场'],
            avoid_scenes: ['规则压迫', '高压反打'],
          },
          {
            sample_key: '重大情感告别',
            scene_function: '角色离别和情绪余韵',
            narrative_rhythm: '先静场，再情绪递进，最后留余韵',
            sentence_pattern: '中句为主，动作放慢',
            dialogue_ratio: '20%-35%',
            abstract_usage: '只学习情绪递进',
            unsafe_direct_phrases: ['原句不能照搬'],
            applicable_scenes: ['重大情感告别', '情感余韵'],
            avoid_scenes: ['规则压迫', '高压反打'],
          },
          {
            sample_key: '规则危机反打',
            scene_function: '规则压力下的动作反制',
            narrative_rhythm: '先压迫，再拆规则，再小反打',
            sentence_pattern: '短中句为主，解释压短',
            dialogue_ratio: '35%-45%',
            abstract_usage: '动作链和规则判定交替推进',
            unsafe_direct_phrases: ['原句不能照搬'],
            applicable_scenes: ['规则压迫', '高压反打'],
            avoid_scenes: ['纯背景说明'],
          },
          {
            sample_key: '章末追读钩子',
            scene_function: '章节最后 300-600 字制造继续阅读理由',
            narrative_rhythm: '先兑现小回报，再抛出新问题或危险',
            sentence_pattern: '短句收束',
            dialogue_ratio: '15%-35%',
            abstract_usage: '只学习回报后加钩子的结构',
            unsafe_direct_phrases: ['原句不能照搬'],
            applicable_scenes: ['章末追读钩子', '新问题抛出'],
            avoid_scenes: ['正文中段解释'],
          },
          {
            sample_key: '对白交锋推进',
            scene_function: '双方试探和信息差拉扯',
            narrative_rhythm: '对白短促推进，每两到三轮产生信息增量',
            sentence_pattern: '对白句短，动作句压缩',
            dialogue_ratio: '35%-55%',
            abstract_usage: '只学习对白功能和回合节奏',
            unsafe_direct_phrases: ['原句不能照搬'],
            applicable_scenes: ['对白交锋', '信息差试探'],
            avoid_scenes: ['纯动作无信息差'],
          },
        ],
      },
    }
    const contextPackage = {
      writing_bible: {},
      chapter_target: {
        chapter_no: 2,
        title: '第一条规则',
        summary: '主角验证宿舍规则边界，并在门口用对白试探同伴的信息差。',
        conflict: '李超想冲出去，张智阻止，双方围绕规则代价短促交锋。',
        ending_hook: '门外出现湿漉漉的学生。',
        scene_cards: [
          { title: '门槛边界', reader_payoff: '规则压制超人蛮力', conflict: '是否出门', ending_hook_seed: '门外有人敲门' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      {
        ...contextPackage,
        chapter_target: {
          ...contextPackage.chapter_target,
          style_sample_strategy: brief.style_sample_strategy,
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(brief.style_sample_strategy.enabled).toBe(true)
    expect(brief.style_sample_strategy.samples).toHaveLength(3)
    expect(brief.style_sample_strategy.samples.map((sample: any) => sample.sample_key)).toEqual([
      '规则危机反打',
      '章末追读钩子',
      '对白交锋推进',
    ])
    expect(brief.style_sample_strategy.samples[0].applicable_scenes).toEqual(['规则压迫', '高压反打'])
    expect(brief.style_sample_strategy.samples[0].avoid_scenes).toEqual(['纯背景说明'])
    expect(brief.style_sample_strategy.samples[0].selection_reason).toContain('命中规则压迫')
    expect(brief.style_sample_strategy.samples[0].selection_reason).toContain('避开纯背景说明')
    expect(brief.style_sample_strategy.samples[1].selection_reason).toContain('命中章末追读钩子')
    expect(JSON.stringify(brief.style_sample_strategy.samples)).not.toContain('世界观铺垫说明')
    expect(JSON.stringify(brief.style_sample_strategy.samples)).not.toContain('重大情感告别')
    expect(brief.style_sample_strategy.do_not_copy).toContain('原句不能照搬')
    expect(prompt).toContain('本章风格样章策略')
    expect(prompt).toContain('selection_reason')
    expect(prompt).toContain('命中规则压迫')
    expect(prompt).toContain('按 applicable_scenes / avoid_scenes 选择样章策略')
    expect(prompt).toContain('只学习叙述节奏、句式密度、对白比例和情绪转折')
    expect(prompt).toContain('原句不能照搬')
  })

  test('does not fall back to style samples that only match avoided scenes', () => {
    const project = {
      title: '超人的规则怪谈世界',
      reference_config: {
        style_sample_bank: [
          {
            sample_key: '规则危机反打',
            scene_function: '规则压力下的动作反制',
            narrative_rhythm: '先压迫，再拆规则，再小反打',
            sentence_pattern: '短中句为主，解释压短',
            dialogue_ratio: '35%-45%',
            abstract_usage: '动作链和规则判定交替推进',
            unsafe_direct_phrases: ['原句不能照搬'],
            applicable_scenes: ['规则压迫', '高压反打'],
            avoid_scenes: ['纯背景说明', '低压日常过场'],
          },
        ],
      },
    }
    const contextPackage = {
      writing_bible: {},
      chapter_target: {
        chapter_no: 3,
        title: '旧校史',
        summary: '本章解释学校规则源流和过往背景，暂不进入危机反打。',
        conflict: '低压过场，用设定铺垫下一次规则压迫。',
        scene_cards: [
          { title: '校史馆', purpose: '补充背景说明', conflict: '暂无正面战斗' },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.style_sample_strategy.enabled).toBe(false)
    expect(brief.style_sample_strategy.samples).toEqual([])
  })

  test('uses style sample effectiveness to prefer stable matched samples', () => {
    const project = {
      title: '超人的规则怪谈世界',
      reference_config: {
        style_sample_bank: [
          {
            sample_key: '旧高压反打样章',
            scene_function: '规则压力下的动作反制',
            narrative_rhythm: '先压迫，再拆规则，再小反打',
            sentence_pattern: '短中句为主，解释压短',
            dialogue_ratio: '35%-45%',
            abstract_usage: '动作链和规则判定交替推进',
            unsafe_direct_phrases: ['原句不能照搬'],
            applicable_scenes: ['规则压迫', '高压反打'],
            avoid_scenes: ['纯背景说明'],
          },
          {
            sample_key: '稳定规则反打样章',
            scene_function: '规则压力下的动作反制',
            narrative_rhythm: '先压迫，再拆规则，再小反打',
            sentence_pattern: '短中句为主，解释压短',
            dialogue_ratio: '35%-45%',
            abstract_usage: '动作链和规则判定交替推进',
            unsafe_direct_phrases: ['原句不能照搬'],
            applicable_scenes: ['规则压迫', '高压反打'],
            avoid_scenes: ['纯背景说明'],
          },
        ],
      },
    }
    const contextPackage = {
      writing_bible: {},
      style_sample_effectiveness: {
        samples: [
          {
            sample_key: '旧高压反打样章',
            usage_count: 5,
            hit_rate: 40,
            missed_count: 6,
            copy_risk_count: 1,
            average_style_score: 61,
            risk_label: '需复盘',
          },
          {
            sample_key: '稳定规则反打样章',
            usage_count: 6,
            hit_rate: 100,
            missed_count: 0,
            copy_risk_count: 0,
            average_style_score: 91,
            risk_label: '表现稳定',
          },
        ],
      },
      chapter_target: {
        chapter_no: 6,
        title: '门禁反打',
        summary: '主角在宿舍门禁规则压迫下拆解限制并反制巡逻者。',
        conflict: '门禁规则压迫，主角必须反打破局。',
        ending_hook: '巡逻者身后露出第二道门禁符。',
        scene_cards: [
          { title: '门禁压迫', conflict: '规则逼迫主角停手', reader_payoff: '拆规则后反打', ending_hook_seed: '第二道门禁符出现' },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.style_sample_strategy.samples[0].sample_key).toBe('稳定规则反打样章')
    expect(brief.style_sample_strategy.samples[0].selection_reason).toContain('历史命中率100%')
    expect(brief.style_sample_strategy.samples[0].selection_reason).toContain('表现稳定')
    expect(brief.style_sample_strategy.samples.map((sample: any) => sample.sample_key)).not.toContain('旧高压反打样章')
  })

  test('builds style sample effectiveness for chapter selection from historical reviews', () => {
    const styleSampleBank = [
      { sample_key: '旧高压反打样章', applicable_scenes: ['规则压迫'], avoid_scenes: ['纯背景说明'] },
      { sample_key: '稳定规则反打样章', applicable_scenes: ['规则压迫'], avoid_scenes: ['纯背景说明'] },
    ]
    const chapters = [
      {
        id: 21,
        chapter_no: 21,
        title: '旧样章失手',
        raw_payload: {
          pre_draft_brief: {
            style_sample_strategy: {
              samples: [{ sample_key: '旧高压反打样章' }],
            },
          },
        },
      },
      {
        id: 22,
        chapter_no: 22,
        title: '稳定样章命中',
        raw_payload: {
          pre_draft_brief: {
            style_sample_strategy: {
              samples: [{ sample_key: '稳定规则反打样章' }],
            },
          },
        },
      },
    ]
    const reviews = [
      {
        chapter_id: 21,
        review_type: 'prose_quality',
        created_at: '2026-06-01T00:00:00.000Z',
        payload: JSON.stringify({ self_check: { review: { score: 72 } } }),
      },
      {
        chapter_id: 22,
        review_type: 'prose_quality',
        created_at: '2026-06-02T00:00:00.000Z',
        payload: JSON.stringify({ self_check: { review: { score: 91 } } }),
      },
      {
        chapter_id: 21,
        review_type: 'style_sample_sync',
        created_at: '2026-06-01T00:01:00.000Z',
        payload: JSON.stringify({
          style_sample_sync: {
            score: 58,
            planned: [{ sample_key: '旧高压反打样章', label: '叙述节奏' }],
            delivered: [],
            missed: [{ sample_key: '旧高压反打样章', label: '叙述节奏' }],
            copied_phrases: ['原句不能照搬'],
          },
        }),
      },
      {
        chapter_id: 22,
        review_type: 'style_sample_sync',
        created_at: '2026-06-02T00:01:00.000Z',
        payload: JSON.stringify({
          style_sample_sync: {
            score: 94,
            planned: [{ sample_key: '稳定规则反打样章', label: '叙述节奏' }],
            delivered: [{ sample_key: '稳定规则反打样章', label: '叙述节奏' }],
            missed: [],
            copied_phrases: [],
          },
        }),
      },
    ]

    const report = buildStyleSampleEffectivenessForSelection(styleSampleBank, chapters, reviews)

    expect(report.samples.find((item: any) => item.sample_key === '旧高压反打样章')).toMatchObject({
      usage_count: 1,
      hit_rate: 0,
      missed_count: 1,
      copy_risk_count: 1,
      average_style_score: 58,
      average_quality_score: 72,
      risk_label: '需复盘',
    })
    expect(report.samples.find((item: any) => item.sample_key === '稳定规则反打样章')).toMatchObject({
      usage_count: 1,
      hit_rate: 100,
      missed_count: 0,
      copy_risk_count: 0,
      average_style_score: 94,
      average_quality_score: 91,
      risk_label: '表现稳定',
    })
  })

  test('lets the author lock or replace chapter style sample strategy before drafting', () => {
    const project = {
      title: '超人的规则怪谈世界',
      reference_config: {
        style_sample_bank: [
          {
            sample_key: '规则危机反打',
            scene_function: '规则压力下的动作反制',
            narrative_rhythm: '先压迫，再拆规则，再小反打',
            abstract_usage: '动作链和规则判定交替推进',
            applicable_scenes: ['规则压迫', '高压反打'],
            avoid_scenes: ['纯背景说明'],
          },
          {
            sample_key: '章末追读钩子',
            scene_function: '章节最后制造继续阅读理由',
            narrative_rhythm: '先兑现小回报，再抛出新问题或危险',
            abstract_usage: '只学习回报后加钩子的结构',
            applicable_scenes: ['章末追读钩子', '新问题抛出'],
          },
          {
            sample_key: '对白交锋推进',
            scene_function: '双方试探和信息差拉扯',
            narrative_rhythm: '对白短促推进，每两到三轮产生信息增量',
            abstract_usage: '只学习对白功能和回合节奏',
            applicable_scenes: ['对白交锋', '信息差试探'],
          },
        ],
      },
    }
    const contextPackage = {
      chapter_target: {
        title: '第一条规则',
        summary: '主角验证规则边界，并用对白试探同伴的信息差。',
        conflict: '双方围绕规则代价短促交锋。',
        ending_hook: '门外出现湿漉漉的学生。',
      },
    }
    const currentStrategy = {
      enabled: true,
      samples: [{ sample_key: '规则危机反打', selection_reason: '命中规则压迫；避开纯背景说明。' }],
      do_not_copy: ['原句不能照搬'],
    }

    const locked = applyStyleSampleStrategyAuthorAction(project, contextPackage, currentStrategy, {
      action: 'lock',
      now: '2026-06-12T08:00:00.000Z',
    })
    const replaced = applyStyleSampleStrategyAuthorAction(project, contextPackage, currentStrategy, {
      action: 'replace',
      now: '2026-06-12T08:01:00.000Z',
    })
    const disabled = applyStyleSampleStrategyAuthorAction(project, contextPackage, currentStrategy, {
      action: 'disable',
      now: '2026-06-12T08:02:00.000Z',
    })

    expect(locked.locked).toBe(true)
    expect(locked.selection_mode).toBe('author_locked')
    expect(locked.author_locked_at).toBe('2026-06-12T08:00:00.000Z')
    expect(locked.samples.map((sample: any) => sample.sample_key)).toEqual(['规则危机反打'])
    expect(replaced.locked).toBe(false)
    expect(replaced.selection_mode).toBe('author_replaced')
    expect(replaced.samples.map((sample: any) => sample.sample_key)).not.toContain('规则危机反打')
    expect(replaced.samples.length).toBeGreaterThan(0)
    expect(disabled.enabled).toBe(false)
    expect(disabled.locked).toBe(true)
    expect(disabled.selection_mode).toBe('disabled_by_author')
    expect(disabled.samples).toEqual([])
  })

  test('adds chapter benchmark sample strategy to the pre-draft brief and prose prompt', () => {
    const samples = normalizeChapterBenchmarkSampleBank([
      {
        sample_key: '规则怪谈第一夜',
        genre: '规则怪谈',
        opening_hook: '开篇 300 字内出现死亡规则和反常边界',
        conflict_pattern: '主角冲动试探规则，智者用低成本物品验证边界',
        payoff_pattern: '规则反制蛮力，同时给出可学习的生路',
        ending_hook_pattern: '门外出现疑似违规者求助，形成救或不救的选择',
        scene_budget_pattern: '3 场：边界验证、队友分歧、外部威胁敲门',
        do_not_copy: ['湿漉漉的校服学生站在门外'],
        source_excerpt: '这段原文不能进入 prompt',
      },
    ])

    expect(samples).toHaveLength(1)
    expect(samples[0].sample_key).toBe('规则怪谈第一夜')
    expect(samples[0].quality_axes).toContain('开篇钩子')
    expect(samples[0].abstract_usage).toContain('只学习章节结构')
    expect(samples[0].source_excerpt).toBeUndefined()

    const project = {
      title: '超人的规则怪谈世界',
      genre: '规则怪谈',
      reference_config: {
        chapter_benchmark_sample_bank: samples,
      },
    }
    const contextPackage = {
      writing_bible: {},
      chapter_target: {
        chapter_no: 2,
        title: '第一条规则',
        summary: '主角验证宿舍规则边界。',
        conflict: '李超想冲出去，张智阻止。',
        ending_hook: '门外出现湿漉漉的学生。',
        scene_cards: [
          { title: '门槛边界', reader_payoff: '规则压制超人蛮力', conflict: '是否出门', ending_hook_seed: '门外有人敲门' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      {
        ...contextPackage,
        chapter_target: {
          ...contextPackage.chapter_target,
          chapter_benchmark_strategy: brief.chapter_benchmark_strategy,
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(brief.chapter_benchmark_strategy.enabled).toBe(true)
    expect(brief.chapter_benchmark_strategy.samples[0].opening_hook).toContain('开篇 300 字')
    expect(brief.chapter_benchmark_strategy.do_not_copy).toContain('湿漉漉的校服学生站在门外')
    expect(prompt).toContain('本章质量基准样例')
    expect(prompt).toContain('只学习章节结构')
    expect(prompt).toContain('不得复制样例桥段、角色名、专有设定和原句')
  })

  test('checks final prose against chapter benchmark sample strategy after delivery', () => {
    const project = { title: '超人的规则怪谈世界', genre: '规则怪谈', reference_config: {} }
    const chapter = { id: 2, chapter_no: 2, title: '第一条规则' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 2,
        chapter_benchmark_strategy: {
          enabled: true,
          samples: [
            {
              sample_key: '规则怪谈第一夜',
              opening_hook: '开篇 300 字内出现死亡规则和反常边界',
              conflict_pattern: '主角冲动试探规则，智者用低成本物品验证边界',
              payoff_pattern: '规则反制蛮力，同时给出可学习的生路',
              ending_hook_pattern: '门外出现疑似违规者求助，形成救或不救的选择',
              scene_budget_pattern: '边界验证、队友分歧、外部威胁敲门',
              visual_pattern: '玻璃门、灰白门槛线和黑影清除形成可视化场面',
            },
          ],
        },
      },
    }
    const deliveredText = [
      '开篇三百字内，宿舍广播直接宣布死亡规则，玻璃门外的黑影贴着灰白门槛线游动。',
      '李超想冲出去，张智阻止他，掰下压缩饼干碎屑丢出门槛，低成本验证边界。',
      '黑影清除碎屑，规则反制蛮力，也让三人看见了可学习的生路。',
      '玻璃门、灰白门槛线和黑影清除形成清楚的可视化场面。',
      '最后门外出现疑似违规者求助，三人必须决定救或不救。',
    ].join('\n')
    const weakText = '宿舍里很安静，大家讨论规则。张智觉得先别出去。李超点头。夜色很深。'

    const okReport = buildChapterBenchmarkSyncReport(project, chapter, contextPackage, deliveredText)
    const warnReport = buildChapterBenchmarkSyncReport(project, chapter, contextPackage, weakText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('基准 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.score).toBeGreaterThanOrEqual(80)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('基准缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('章末追读')
    expect(warnReport.next_actions.join('；')).toContain('质量基准样例')
  })

  test('story state sync persists a chapter_benchmark_sync review', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')

    expect(source).toContain("review_type: 'chapter_benchmark_sync'")
    expect(source).toContain('buildChapterBenchmarkSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.chapter_benchmark_sync = chapterBenchmarkSync')
  })

  test('checks final prose against style sample strategy after delivery', () => {
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const chapter = { id: 2, chapter_no: 2, title: '第一条规则' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 2,
        style_sample_strategy: {
          enabled: true,
          samples: [
            {
              sample_key: '规则危机反打',
              scene_function: '规则压力下的动作反制',
              narrative_rhythm: '先压迫，再拆规则，再小反打',
              sentence_pattern: '短中句为主，解释压短',
              dialogue_ratio: '35%-45%',
              voice_rules: ['李超高压后半拍吐槽', '张智冷静拆规则'],
              abstract_usage: '动作链和规则判定交替推进',
              unsafe_direct_phrases: ['这破学校连晚自习都外包给影子了'],
            },
          ],
        },
      },
    }
    const deliveredText = [
      '十点整，门外黑影压上玻璃。李超抬拳，脚尖刚过线就被无形力量顶回。',
      '“这规则还挺会加班。”李超咬牙，把手收了回来。',
      '张智蹲下，用饼干碎屑试探门槛：“别硬闯。它判定的是越界，不是力量。”',
      '碎屑刚飞出去，就被黑影清除。压迫、拆规则、小反打在同一场景里完成。',
      '李超盯着灰白门槛线：“懂了，先让它露判定，再揍能揍的东西。”',
    ].join('\n')
    const weakText = '宿舍里很安静，大家围坐在一起。张智解释了很多规则来源和可能性，李超认真听完，没有插话，也没有尝试动作验证。'

    const okReport = buildStyleSampleSyncReport(project, chapter, contextPackage, deliveredText)
    const warnReport = buildStyleSampleSyncReport(project, chapter, contextPackage, weakText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('风格 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.score).toBeGreaterThanOrEqual(80)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('风格缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('对白比例')
    expect(warnReport.next_actions.join('；')).toContain('风格样章')
  })

  test('warns when style sample direct phrases are copied into prose', () => {
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const chapter = { id: 2, chapter_no: 2, title: '第一条规则' }
    const contextPackage = {
      chapter_target: {
        style_sample_strategy: {
          enabled: true,
          samples: [
            {
              sample_key: '规则怪谈高压吐槽',
              scene_function: '高压后半拍吐槽',
              unsafe_direct_phrases: ['这破学校连晚自习都外包给影子了'],
            },
          ],
        },
      },
    }

    const report = buildStyleSampleSyncReport(
      project,
      chapter,
      contextPackage,
      '李超盯着门外黑影，脱口而出：“这破学校连晚自习都外包给影子了。”',
    )

    expect(report.status).toBe('warn')
    expect(report.copy_risk_count).toBe(1)
    expect(report.copied_phrases[0]).toContain('这破学校')
    expect(report.next_actions.join('；')).toContain('不得照搬样章原句')
  })

  test('story state sync persists a style_sample_sync review', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')

    expect(source).toContain("review_type: 'style_sample_sync'")
    expect(source).toContain('buildStyleSampleSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.style_sample_sync = styleSampleSync')
  })

  test('adds first30 retention repair focus to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const review = {
      review_type: 'first30_retention_diagnosis',
      created_at: '2026-06-03T10:00:00.000Z',
      payload: JSON.stringify({
        report: {
          score: 76,
          status: 'needs_repair',
          positioning: { promise_ready: true, reader_promise: '寒门少年靠阵法反压宗门秩序。' },
          segments: [
            { key: '4-10', label: '试读十章', score: 68, coverage: 100, hook_rate: 57, payoff_average: 1.4, chapter_count: 7 },
          ],
          chapter_cards: [
            { chapter_id: 7, chapter_no: 7, title: '夜闯阵堂', score: 61, word_count: 2600, flags: ['章末钩子弱', '爽点/悬念信号少'] },
          ],
          risks: [
            { severity: 'high', segment: '4-10', issue: '章末追读钩子覆盖率偏低。', action: '补未解决问题。' },
          ],
        },
      }),
    }
    const first30Context = buildFirst30RetentionContext({ id: 7, chapter_no: 7, title: '夜闯阵堂' }, [review])
    const contextPackage = {
      first30_retention_context: first30Context,
      chapter_target: {
        id: 7,
        chapter_no: 7,
        title: '夜闯阵堂',
        summary: '主角夜闯阵堂，试图找回被夺走的阵图。',
        conflict: '守堂执事阻拦，主角必须证明阵图归属。',
        ending_hook: '阵图背面露出第二层阵纹。',
        scene_cards: [
          { title: '阵堂对峙', reader_payoff: '主角用残阵反压守堂执事', conflict: '阵图归属争夺', ending_hook_seed: '第二层阵纹显形' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      {
        ...contextPackage,
        chapter_target: {
          ...contextPackage.chapter_target,
          first30_retention_brief: brief.first30_retention_brief,
        },
      },
      null,
      { chapter_no: 7, title: '夜闯阵堂' },
    )

    expect(first30Context?.chapter_score).toBe(61)
    expect(brief.first30_retention_brief.segment_label).toBe('试读十章')
    expect(brief.first30_retention_brief.flags).toContain('章末钩子弱')
    expect(brief.first30_retention_brief.required_actions).toContain('补未解决问题。')
    expect(prompt).toContain('本章前30章留存修复')
    expect(prompt).toContain('章末钩子弱')
    expect(prompt).toContain('补未解决问题')
  })

  test('adds reader drop risk brief to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      reader_trial_context: {
        status: 'needs_repair',
        score: 66,
        quality_bar: '起点1万均订试读基准',
        drop_points: ['第7章中段解释阵法过密，试读用户可能弃读。', '章末钩子只交代结果，没有未解问题。'],
        pull_points: ['主角用残阵反压执事时有追读爽点。'],
        repair_actions: ['开篇 300 字先给阵图被夺的现场压力。', '中段减少设定解释，用动作验证阵法规则。', '章末留下第二层阵纹的代价问题。'],
      },
      chapter_target: {
        id: 7,
        chapter_no: 7,
        title: '夜闯阵堂',
        summary: '主角夜闯阵堂，试图找回被夺走的阵图。',
        conflict: '守堂执事阻拦，主角必须证明阵图归属。',
        ending_hook: '阵图背面露出第二层阵纹。',
        scene_cards: [
          { title: '阵堂对峙', reader_payoff: '主角用残阵反压守堂执事', conflict: '阵图归属争夺', ending_hook_seed: '第二层阵纹显形' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 7, title: '夜闯阵堂' },
    )

    expect(brief.reader_drop_risk_brief.status).toBe('needs_repair')
    expect(brief.reader_drop_risk_brief.quality_bar).toContain('起点1万均订')
    expect(brief.reader_drop_risk_brief.drop_points[0]).toContain('中段解释阵法过密')
    expect(brief.reader_drop_risk_brief.opening_guardrail).toContain('开篇 300 字')
    expect(brief.reader_drop_risk_brief.middle_guardrail).toContain('中段减少设定解释')
    expect(brief.reader_drop_risk_brief.ending_guardrail).toContain('章末留下第二层阵纹')
    expect(context.chapter_target.reader_drop_risk_brief.drop_points[0]).toContain('试读用户可能弃读')
    expect(prompt).toContain('【读者弃读预警】')
    expect(prompt).toContain('开篇 300 字')
    expect(prompt).toContain('中段减少设定解释')
    expect(prompt).toContain('章末留下第二层阵纹')
    expect(prompt).toContain('执行 chapter_target.reader_drop_risk_brief')
  })

  test('adds story pressure ladder to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      story_pressure_ladder: {
        status: 'needs_attention',
        score: 64,
        chapterRangeLabel: '第7-12章',
        pressureSources: [
          { label: '执事压迫', count: 4, chapters: [7, 8, 9, 10], riskLevel: 'warn' },
        ],
        signals: [
          { key: 'pressure_source', label: '压力源', status: 'warn', detail: '未来章节压力源过于集中。' },
          { key: 'conflict_escalation', label: '冲突升级', status: 'ok', detail: '未来章节能看到压力加码。' },
          { key: 'stakes_growth', label: '赌注升级', status: 'warn', detail: '未来章节缺少可感知赌注。' },
          { key: 'reversal_pressure', label: '反转逼迫', status: 'warn', detail: '未来章节缺少两难选择。' },
        ],
        nextActions: ['下一批章节要明确压力源、升级赌注和反转逼迫。'],
      },
      chapter_target: {
        id: 7,
        chapter_no: 7,
        title: '夜闯阵堂',
        summary: '主角夜闯阵堂，试图找回被夺走的阵图。',
        conflict: '守堂执事阻拦，主角必须证明阵图归属。',
        ending_hook: '阵图背面露出第二层阵纹。',
        scene_cards: [
          { title: '阵堂对峙', reader_payoff: '主角用残阵反压守堂执事', conflict: '阵图归属争夺', ending_hook_seed: '第二层阵纹显形' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 7, title: '夜闯阵堂' },
    )

    expect(brief.story_pressure_brief.status).toBe('needs_attention')
    expect(brief.story_pressure_brief.pressure_sources[0]).toContain('执事压迫')
    expect(brief.story_pressure_brief.weak_signals.map((item: any) => item.key)).toContain('stakes_growth')
    expect(brief.story_pressure_brief.stakes_growth_guardrail).toContain('可感知赌注')
    expect(brief.story_pressure_brief.reversal_pressure_guardrail).toContain('两难选择')
    expect(context.chapter_target.story_pressure_brief.required_actions[0]).toContain('升级赌注')
    expect(prompt).toContain('【故事压力阶梯】')
    expect(prompt).toContain('执行 chapter_target.story_pressure_brief')
    expect(prompt).toContain('执事压迫')
    expect(prompt).toContain('赌注升级')
    expect(prompt).toContain('反转逼迫')
  })

  test('adds protagonist agency story drive to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      chapter_target: {
        id: 12,
        chapter_no: 12,
        title: '试炼资格',
        chapter_goal: '主角拿到试炼资格',
        core_conflict: '执事设局阻拦主角参加试炼',
        protagonist_choice: '主角当众选择用残阵反证阵图归属',
        choice_cost: '暴露阵盘裂纹，招来内门势力注意',
        state_change: '主角从被动挨压转为主动入局',
        ending_hook: '内门长老盯上阵盘裂纹。',
        scene_cards: [
          {
            title: '阵堂对峙',
            conflict: '执事设局阻拦主角参加试炼',
            turning_point: '主角当众选择用残阵反证阵图归属',
            reader_payoff: '主角拿到试炼资格',
            exit_state: '主角从被动挨压转为主动入局',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 12, title: '试炼资格' },
    )

    expect(brief.story_drive_brief.protagonist_choice).toContain('当众选择')
    expect(brief.story_drive_brief.choice_cost).toContain('暴露阵盘裂纹')
    expect(brief.story_drive_brief.state_change).toContain('主动入局')
    expect(brief.story_drive_brief.obstacle).toContain('执事设局')
    expect(brief.story_drive_brief.causal_next_step).toContain('内门长老')
    expect(context.chapter_target.story_drive_brief.required_actions[0]).toContain('主角主动选择')
    expect(prompt).toContain('【主角能动性】')
    expect(prompt).toContain('执行 chapter_target.story_drive_brief')
    expect(prompt).toContain('主角选择')
    expect(prompt).toContain('选择代价')
    expect(prompt).toContain('状态变化')
  })

  test('adds serial rhythm payoff density to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', synopsis: '废柴阵师靠残阵翻盘。', reference_config: {} }
    const contextPackage = {
      chapter_target: {
        id: 15,
        chapter_no: 15,
        title: '阵堂打脸',
        summary: '主角在阵堂公开拆穿执事偷换阵图。',
        conflict: '执事拖延审查，主角必须当场逼出破绽。',
        ending_hook: '破阵声中，内门长老认出残阵来源。',
        word_target: { label: '标准章', target: 3200, min: 2800, max: 3500 },
        scene_cards: [
          {
            scene_no: 1,
            title: '堂前拦路',
            opening_hook: '执事把假阵图拍在主角脸前。',
            conflict: '执事当众污蔑主角偷阵。',
            reader_payoff: '主角用一句反问逼执事露怯。',
            reversal: '假阵图上的裂纹反而证明执事动过手脚。',
            ending_hook_seed: '众弟子开始怀疑执事。',
            word_budget: '1000 字',
          },
          {
            scene_no: 2,
            title: '残阵反证',
            conflict: '主角必须在阵纹崩毁前复原真图。',
            reader_payoff: '残阵亮起，执事的伪证当场反噬。',
            reversal: '内门长老发现残阵源自禁库。',
            ending_hook_seed: '长老问主角从哪里学来这道阵。',
            word_budget: '1800 字',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T09:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 15, title: '阵堂打脸' },
    )

    expect(brief.serial_rhythm_brief.opening_hook_deadline).toContain('前 300 字')
    expect(brief.serial_rhythm_brief.payoff_interval).toContain('800-1200')
    expect(brief.serial_rhythm_brief.scene_payoff_budget).toHaveLength(2)
    expect(brief.serial_rhythm_brief.scene_payoff_budget[0].required_payoff).toContain('逼执事露怯')
    expect(brief.serial_rhythm_brief.scene_payoff_budget[1].turn).toContain('禁库')
    expect(brief.serial_rhythm_brief.anti_drag_rules.join('；')).toContain('连续')
    expect(context.chapter_target.serial_rhythm_brief.scene_payoff_budget[1].title).toBe('残阵反证')
    expect(prompt).toContain('【连载节奏与回报密度】')
    expect(prompt).toContain('执行 chapter_target.serial_rhythm_brief')
    expect(prompt).toContain('每 800-1200 字')
    expect(prompt).toContain('残阵反证')
    expect(prompt).toContain('伪证当场反噬')
  })

  test('adds page-turn hook execution brief to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      chapter_target: {
        id: 16,
        chapter_no: 16,
        title: '禁库旧阵',
        summary: '主角用残阵反证执事伪造证据。',
        conflict: '执事试图把禁库旧阵嫁祸给主角。',
        ending_hook: '内门长老盯着亮起的残阵，问主角从哪里学来禁库旧阵。',
        story_drive_brief: {
          causal_next_step: '下一章必须追问禁库旧阵来源，并逼主角解释师承。',
        },
        scene_cards: [
          {
            scene_no: 2,
            title: '残阵亮名',
            reader_payoff: '执事伪证被残阵反噬。',
            reversal: '内门长老认出残阵源自禁库。',
            ending_hook_seed: '长老当众问出禁库旧阵来源。',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T10:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 16, title: '禁库旧阵' },
    )

    expect(brief.page_turn_hook_brief.core_question).toContain('禁库旧阵')
    expect(brief.page_turn_hook_brief.visible_trigger).toContain('内门长老认出')
    expect(brief.page_turn_hook_brief.next_chapter_pull).toContain('追问禁库旧阵来源')
    expect(brief.page_turn_hook_brief.forbidden_resolution.join('；')).toContain('不得在本章解释完整答案')
    expect(context.chapter_target.page_turn_hook_brief.final_image).toContain('长老当众问出')
    expect(prompt).toContain('【章末翻页钩子】')
    expect(prompt).toContain('执行 chapter_target.page_turn_hook_brief')
    expect(prompt).toContain('最后 300 字')
    expect(prompt).toContain('内门长老认出残阵源自禁库')
    expect(prompt).toContain('不得在本章解释完整答案')
  })

  test('adds volume climax budget brief to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      volume_beat_budget: {
        status: 'needs_attention',
        score: 62,
        current_volume_title: '第一卷 阵堂起势',
        chapter_range: '第1-60章',
        summary: '当前卷缺中高潮和卷末爆点，本章承担第一次小高潮回报。',
        beats: [
          {
            chapter_no: 18,
            type: '小高潮',
            label: '阵堂公开打脸',
            detail: '主角公开反证执事偷换阵图。',
          },
          {
            chapter_no: 45,
            type: '卷末爆点',
            label: '禁库真相',
            detail: '禁库旧阵牵出主角师承真相。',
          },
        ],
        next_actions: ['本章只兑现阵堂公开打脸，不提前揭穿禁库真相。'],
      },
      chapter_target: {
        id: 18,
        chapter_no: 18,
        title: '阵堂公开打脸',
        summary: '主角在阵堂公开反证执事偷换阵图。',
        conflict: '执事逼主角认罪，主角必须反证阵图来源。',
        ending_hook: '禁库旧阵的第二层纹路亮起。',
        volume_beat_brief: {
          current_chapter_role: '完成第一卷第一次小高潮：阵堂公开打脸。',
          volume_goal: '让主角在阵堂立住起势资格。',
          climax_promise: '公开反证执事偷换阵图，给读者阶段性打脸回报。',
          required_beats: ['执事当众失势', '主角得到试炼资格'],
          forbidden_payoff: ['不得提前揭穿禁库真相', '不得提前解决卷末师承身份'],
        },
        scene_cards: [
          {
            title: '阵堂对证',
            conflict: '执事逼主角认罪。',
            reader_payoff: '主角公开反证执事偷换阵图。',
            reversal: '执事伪证被残阵反噬。',
            ending_hook_seed: '禁库旧阵第二层纹路亮起。',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T11:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 18, title: '阵堂公开打脸' },
    )

    expect(brief.volume_climax_brief.current_chapter_role).toContain('第一次小高潮')
    expect(brief.volume_climax_brief.volume_goal).toContain('起势资格')
    expect(brief.volume_climax_brief.climax_promise).toContain('阶段性打脸回报')
    expect(brief.volume_climax_brief.required_beats).toContain('执事当众失势')
    expect(brief.volume_climax_brief.forbidden_payoff).toContain('不得提前揭穿禁库真相')
    expect(brief.volume_climax_brief.nearby_beats[0].label).toContain('阵堂公开打脸')
    expect(context.chapter_target.volume_climax_brief.forbidden_payoff[1]).toContain('师承身份')
    expect(prompt).toContain('【卷级高潮预算】')
    expect(prompt).toContain('执行 chapter_target.volume_climax_brief')
    expect(prompt).toContain('第一次小高潮')
    expect(prompt).toContain('不得提前揭穿禁库真相')
  })

  test('adds recent fatigue avoidance brief to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      recent_fatigue_radar: {
        status: 'needs_attention',
        score: 61,
        chapter_range_label: '第9-18章',
        summary: '近10章存在 3 类同质化风险：冲突变化、回报变化、钩子变化。',
        signals: [
          { key: 'conflict_variety', label: '冲突变化', status: 'warn', detail: '近10章「执事压迫」出现 7 次，冲突来源变化不足。' },
          { key: 'payoff_variety', label: '回报变化', status: 'warn', detail: '近10章「公开打脸」出现 6 次，回报形态变化不足。' },
          { key: 'hook_variety', label: '钩子变化', status: 'warn', detail: '近10章「试炼将至」出现 6 次，章末问题变化不足。' },
          { key: 'scene_freshness', label: '场面新鲜度', status: 'warn', detail: '近10章缺少稳定的标志性场面记录。' },
        ],
        next_actions: ['下一章要更换压迫来源、回报形态、章末问题或可视化场面，避免十章连续同质化。'],
      },
      chapter_target: {
        id: 19,
        chapter_no: 19,
        title: '旧阵异响',
        summary: '主角发现旧阵异响来自藏书阁而非阵堂。',
        conflict: '旧执事余党仍想用阵堂规矩压人，主角转向藏书阁追查。',
        ending_hook: '藏书阁地砖下传出第二道阵鸣。',
        scene_cards: [
          {
            title: '藏书阁转场',
            conflict: '旧执事余党继续用阵堂规矩压人。',
            reader_payoff: '主角不再重复公开打脸，而是用旧阵异响反向设局。',
            ending_hook_seed: '藏书阁地砖下传出第二道阵鸣。',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T12:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 19, title: '旧阵异响' },
    )

    expect(brief.recent_fatigue_brief.chapter_range_label).toContain('第9-18章')
    expect(brief.recent_fatigue_brief.fatigue_risks.join('；')).toContain('执事压迫')
    expect(brief.recent_fatigue_brief.conflict_variation).toContain('更换压迫来源')
    expect(brief.recent_fatigue_brief.payoff_variation).toContain('更换回报形态')
    expect(brief.recent_fatigue_brief.hook_variation).toContain('更换章末问题')
    expect(brief.recent_fatigue_brief.scene_freshness).toContain('可视化场面')
    expect(context.chapter_target.recent_fatigue_brief.next_actions[0]).toContain('十章连续同质化')
    expect(prompt).toContain('【近10章疲劳规避】')
    expect(prompt).toContain('执行 chapter_target.recent_fatigue_brief')
    expect(prompt).toContain('执事压迫')
    expect(prompt).toContain('更换压迫来源')
  })

  test('normalizes meme bank into abstract usage instead of direct copied phrases', () => {
    const memeBank = normalizeMemeBank([
      {
        meme_key: '班味太重',
        direct_phrase: '这班味也太冲了',
        function: '社畜共鸣',
        tone: '轻度吐槽',
        suitable_genres: ['都市', '规则怪谈'],
        abstract_usage: '把规则压迫写成类似上班制度的荒诞感。',
        expires_at: '2026-12-31',
      },
      { name: '空素材' },
    ])

    expect(memeBank).toHaveLength(1)
    expect(memeBank[0].meme_key).toBe('班味太重')
    expect(memeBank[0].function).toBe('社畜共鸣')
    expect(memeBank[0].unsafe_direct_phrases).toContain('这班味也太冲了')
    expect(memeBank[0].abstract_usage).toContain('不直接复刻原句')
    expect(memeBank[0].suitable_genres).toContain('规则怪谈')
    expect(memeBank[0].expires_at).toBe('2026-12-31')
  })

  test('builds readability review prompt with web novel readability dimensions', () => {
    const prompt = buildReadabilityReviewPrompt(
      { title: '超人的规则怪谈世界' },
      { chapter_target: { chapter_no: 1, title: '双魂降临', scene_cards: [] } },
      '正文',
    )

    expect(prompt).toContain('开篇 300 字')
    expect(prompt).toContain('场景目标、阻碍、转折、回报')
    expect(prompt).toContain('段落是否过长')
    expect(prompt).toContain('对话比例')
    expect(prompt).toContain('人物口吻差异')
    expect(prompt).toContain('爽点/信息增量密度')
    expect(prompt).toContain('readability_score')
    expect(prompt).toContain('ending_hook_score')
    expect(prompt).toContain('章末翻页')
    expect(prompt).toContain('meme_sense')
  })

  test('builds restrained net-sense polish prompt without allowing plot changes', () => {
    const prompt = buildMemePolishPrompt(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 1,
          title: '双魂降临',
          meme_strategy: {
            intensity: '轻度',
            allowed_functions: ['主角吐槽', '社畜共鸣'],
            forbidden_usage: ['死亡场景不玩梗'],
          },
        },
      },
      '正文',
    )

    expect(prompt).toContain('克制型网感润色')
    expect(prompt).toContain('只允许做语言层润色')
    expect(prompt).toContain('不得修改剧情线')
    expect(prompt).toContain('不得修改设定状态')
    expect(prompt).toContain('used_meme_functions')
    expect(prompt).toContain('rejected_memes')
    expect(prompt).toContain('immersion_risks')
  })

  test('source creates readability review and stores meme bank in reference config', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')

    expect(source).toContain("review_type: 'readability_review'")
    expect(source).toContain('runReadabilityReview')
    expect(source).toContain('ending_hook_score: Number(payload?.ending_hook_score')
    expect(source).toContain('runMemePolish')
    expect(source).toContain('reference_config?.meme_bank')
  })
})

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

  test('story state sync persists a story_unit_sync review', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')

    expect(source).toContain('buildStoryUnitSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain("review_type: 'story_unit_sync'")
    expect(source).toContain('payload.story_unit_sync = storyUnitSync')
  })
})

describe('storyline sync backfill', () => {
  test('builds storyline sync report from planned and actual storyline updates', () => {
    const report = buildStorylineSyncReport(
      {
        storyline_context: {
          chapter_usage: [
            { entity_id: 1, name: '夺回镜州主线', usage_type: 'advance', expected_state_change: { target: '当众压住王府管事' } },
            { entity_id: 2, name: '旧臣背刺伏笔线', usage_type: 'plant', expected_state_change: { clue: '旧臣避开腰牌' } },
            { entity_id: 3, name: '幕后主使真名', usage_type: 'forbidden', expected_state_change: { forbidden: '不得揭露真名' } },
          ],
        },
        chapter_target: {
          storyline_payoffs: ['边军腰牌支线'],
        },
      },
      [
        { entity_id: 1, name: '夺回镜州主线', entity_type: 'mainline', actual_state_change: { current_state: '当众压住王府管事' } },
        { name: '边军腰牌支线', entity_type: 'subplot', actual_state_change: { payoff_status: 'paid' } },
        { name: '额外教团渗透线', entity_type: 'faction_arc', actual_state_change: { current_state: '教团标记出现' } },
        { name: '幕后主使真名', entity_type: 'foreshadowing_arc', actual_state_change: { leaked: true } },
      ],
    )

    expect(report.status).toBe('warn')
    expect(report.planned.map((item: any) => item.name)).toEqual(expect.arrayContaining(['夺回镜州主线', '旧臣背刺伏笔线', '幕后主使真名', '边军腰牌支线']))
    expect(report.completed.map((item: any) => item.name)).toEqual(expect.arrayContaining(['夺回镜州主线', '边军腰牌支线']))
    expect(report.missed.map((item: any) => item.name)).toContain('旧臣背刺伏笔线')
    expect(report.unplanned.map((item: any) => item.name)).toContain('额外教团渗透线')
    expect(report.forbidden_touched.map((item: any) => item.name)).toContain('幕后主使真名')
  })

  test('story state prompt asks for storyline updates and sync review is created', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')

    expect(source).toContain('storyline_updates')
    expect(source).toContain('buildStorylineSyncReport(')
    expect(source).toContain("review_type: 'storyline_sync'")
    expect(source).toContain('story_state_update.storyline_sync')
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

  test('story state sync persists a chapter_core_drift review', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')

    expect(source).toContain("review_type: 'chapter_core_drift'")
    expect(source).toContain('buildChapterCoreDriftReport(project, chapter, contextPackage, chapterText, storylineSync)')
    expect(source).toContain('payload.core_drift = coreDrift')
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

  test('story state sync persists a reader_payoff_sync review', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')

    expect(source).toContain("review_type: 'reader_payoff_sync'")
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
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')

    expect(source).toContain("review_type: 'reader_expectation_sync'")
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

  test('story state sync persists a reader_retention_sync review', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')

    expect(source).toContain("review_type: 'reader_retention_sync'")
    expect(source).toContain('buildReaderRetentionSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.reader_retention_sync = readerRetentionSync')
  })

  test('story state sync persists a chapter_attraction_review review', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')

    expect(source).toContain("review_type: 'chapter_attraction_review'")
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

  test('story state sync persists an innovation_sync review', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')

    expect(source).toContain("review_type: 'innovation_sync'")
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

  test('story state sync persists a signature_scene_sync review', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')

    expect(source).toContain("review_type: 'signature_scene_sync'")
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

  test('story state sync persists a volume_beat_sync review', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')

    expect(source).toContain("review_type: 'volume_beat_sync'")
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

  test('story state sync persists a runway_sync review', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')

    expect(source).toContain("review_type: 'runway_sync'")
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
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')

    expect(source).toContain('discovered_assets')
    expect(source).toContain('normalizeDiscoveredAssets(')
    expect(source).toContain("review_type: 'asset_intake'")
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
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')

    expect(source).toContain('ip_scene_candidates')
    expect(source).toContain('normalizeIpSceneCandidates(')
    expect(source).toContain("review_type: 'ip_scene_intake'")
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
    expect(styleLock.chapter_word_range).toContain('2800-3500字')
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

describe('chapter context word target source guards', () => {
  test('declares word target inside chapter context builder instead of writing bible builder', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')
    const bibleStart = source.indexOf('const buildWritingBible =')
    const bibleEnd = source.indexOf('const hasMeaningfulWritingBible =', bibleStart)
    const contextStart = source.indexOf('const buildChapterContextPackage =')
    const basePackageStart = source.indexOf('const basePackage =', contextStart)
    const bibleBlock = source.slice(bibleStart, bibleEnd)
    const contextSetupBlock = source.slice(contextStart, basePackageStart)

    expect(bibleStart).toBeGreaterThanOrEqual(0)
    expect(contextStart).toBeGreaterThanOrEqual(0)
    expect(bibleBlock).not.toContain('resolveChapterWordTarget(project, chapter')
    expect(contextSetupBlock).toContain('const wordTarget = resolveChapterWordTarget(project, chapter, {})')
    expect(contextSetupBlock).toContain('const styleLock = { ...getStyleLock(project), chapter_word_range: wordTarget.rangeText }')
  })

  test('uses multiple completion attempts before failing a short chapter', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')
    const ensureStart = source.indexOf('const ensureProseMeetsWordTarget =')
    const groupStart = source.indexOf('const generateChapterForGroup =', ensureStart)
    const ensureBlock = source.slice(ensureStart, groupStart)

    expect(ensureStart).toBeGreaterThanOrEqual(0)
    expect(ensureBlock).toContain('maxExpansionAttempts')
    expect(ensureBlock).toContain('for (let attempt = 1; attempt <= maxExpansionAttempts; attempt += 1)')
    expect(ensureBlock).toContain('attempts.push')
  })

  test('requires scene-card prompts to plan commercial reader hooks before prose generation', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')
    const promptStart = source.indexOf('const buildSceneCardsPrompt =')
    const promptEnd = source.indexOf('const buildHeuristicSettingUsage =', promptStart)
    const promptBlock = source.slice(promptStart, promptEnd)

    expect(promptStart).toBeGreaterThanOrEqual(0)
    expect(promptBlock).toContain('opening_hook')
    expect(promptBlock).toContain('reader_payoff')
    expect(promptBlock).toContain('fear_point')
    expect(promptBlock).toContain('rule_pressure')
    expect(promptBlock).toContain('information_gap')
    expect(promptBlock).toContain('reversal')
    expect(promptBlock).toContain('ending_hook_seed')
  })

  test('runs commercial editor rewrite between word-target expansion and self-review in chapter group generation', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftOnlyStart = source.indexOf('if (isDraftOnly)', groupStart)
    const reviewStart = source.indexOf('const selfCheck = await runProseSelfReviewAndRevision', groupStart)
    const beforeReviewBlock = source.slice(draftOnlyStart, reviewStart)

    expect(groupStart).toBeGreaterThanOrEqual(0)
    expect(reviewStart).toBeGreaterThan(groupStart)
    expect(beforeReviewBlock).toContain('runCommercialEditorRewrite(')
    expect(beforeReviewBlock).toContain("onStage('editor'")
  })

  test('exposes pre-draft brief routes for build, save, and confirm', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-chapter-context-routes.ts'), 'utf8')

    expect(source).toContain("app.get('/api/novel/chapters/:chapterId/pre-draft-brief'")
    expect(source).toContain("app.put('/api/novel/chapters/:chapterId/pre-draft-brief'")
    expect(source).toContain("app.post('/api/novel/chapters/:chapterId/pre-draft-brief/confirm'")
    expect(source).toContain("app.post('/api/novel/chapters/:chapterId/pre-draft-brief/style-samples'")
    expect(source).toContain('applyStyleSampleStrategyAuthorAction')
    expect(source).toContain('raw_payload.pre_draft_brief')
  })
})
