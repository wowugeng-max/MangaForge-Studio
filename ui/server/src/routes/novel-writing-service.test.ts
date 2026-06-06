import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  buildCommercialEditorRewritePrompt,
  buildChapterPreDraftBrief,
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
  normalizeMemeBank,
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
    expect(source).toContain('runMemePolish')
    expect(source).toContain('reference_config?.meme_bank')
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
