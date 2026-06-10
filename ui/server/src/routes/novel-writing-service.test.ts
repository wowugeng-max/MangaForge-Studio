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
  buildReaderExpectationDebtContext,
  buildInnovationSyncReport,
  buildSignatureSceneSyncReport,
  buildChapterBenchmarkSyncReport,
  buildStyleSampleSyncReport,
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
      },
    ])

    expect(samples).toHaveLength(1)
    expect(samples[0].sample_key).toBe('规则怪谈高压吐槽')
    expect(samples[0].abstract_usage).toContain('高压后半拍吐槽')
    expect(samples[0].abstract_usage).toContain('只学习节奏')
    expect(samples[0].unsafe_direct_phrases).toContain('这破学校连晚自习都外包给影子了')
    expect(samples[0].sample_text).toBeUndefined()
  })

  test('adds style sample strategy to the pre-draft brief and prose prompt', () => {
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
          },
        ],
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
          style_sample_strategy: brief.style_sample_strategy,
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(brief.style_sample_strategy.enabled).toBe(true)
    expect(brief.style_sample_strategy.samples[0].sample_key).toBe('规则危机反打')
    expect(brief.style_sample_strategy.do_not_copy).toContain('原句不能照搬')
    expect(prompt).toContain('本章风格样章策略')
    expect(prompt).toContain('只学习叙述节奏、句式密度、对白比例和情绪转折')
    expect(prompt).toContain('原句不能照搬')
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
    expect(source).toContain('raw_payload.pre_draft_brief')
  })
})
