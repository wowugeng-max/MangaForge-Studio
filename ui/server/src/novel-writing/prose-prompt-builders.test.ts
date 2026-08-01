import { describe, expect, test } from 'bun:test'
import {
  evaluateProseWordTarget,
  resolveChapterWordTarget,
} from './word-target'
import {
  buildCommercialEditorRewritePrompt,
  buildMemePolishPrompt,
  buildProseWordTargetContractionPrompt,
  buildProseWordTargetExpansionPrompt,
  buildReadabilityReviewPrompt,
} from './prose-prompt-builders'

describe('prose prompt builders', () => {
  test('builds word-target expansion prompts from compact prose context snapshots', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 8 }, { word_target_mode: 'custom', target_word_count: 5200 })
    const evaluation = evaluateProseWordTarget('字'.repeat(3600), target)
    const contextPackage: any = {
      chapter_target: {
        chapter_no: 8,
        title: '旧标题',
        scene_cards: [
          {
            title: '会长室对峙',
            purpose: `主角逼问会长印章去向；${'同步风险：delivery_risk_receipts 未闭环；'.repeat(80)}只保留这条可写动作`,
            serial_risk_repairs: [`质量续航：把上一章章尾封条复响写成当前阻碍；${'remaining_risk'.repeat(500)}`],
          },
        ],
      },
      chapterTarget: {
        chapterNo: 8,
        title: '会长私印',
        wordTarget: target,
      },
    }
    contextPackage.self = contextPackage

    const prompt = buildProseWordTargetExpansionPrompt(
      { title: '超人的规则怪谈世界' },
      contextPackage,
      '字'.repeat(3600),
      evaluation,
      { attempt: 2, maxAttempts: 3 },
    )

    expect(prompt).toContain('目标章节：第8章《会长私印》')
    expect(prompt).toContain('第 2 轮补写')
    expect(prompt).toContain('目标 5200 字')
    expect(prompt).toContain('至少 4680 字')
    expect(prompt).toContain('会长室对峙')
    expect(prompt).toContain('只保留这条可写动作')
    expect(prompt).not.toContain('[Circular]')
    expect(prompt).not.toContain('delivery_risk_receipts 未闭环')
    expect(prompt).not.toContain('remaining_risk')
    expect(prompt).toContain('expansion_blueprint_patch')
  })

  test('builds word-target contraction prompts that preserve oh-story delivery evidence', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 10 }, {})
    const evaluation = evaluateProseWordTarget('字'.repeat(7200), target)
    const contextPackage: any = {
      chapter_target: {
        chapter_no: 10,
        title: '镇门诱捕',
        word_target: target,
        scene_cards: [
          {
            title: '镇门封锁',
            goal: '让封锁令压到门前',
            scene_card_receipts: [{ evidence: '封锁令贴住门缝。' }],
          },
        ],
      },
    }
    contextPackage.self = contextPackage

    const prompt = buildProseWordTargetContractionPrompt(
      { title: '超人的规则怪谈世界' },
      contextPackage,
      '字'.repeat(7200),
      evaluation,
      { attempt: 1, maxAttempts: 2 },
    )

    expect(prompt).toContain('压缩到商业网文标准章节长度')
    expect(prompt).toContain('当前正文约 7200 字')
    expect(prompt).toContain('可接受范围 3780-4620 字')
    expect(prompt).toContain('建议落在 3780-4410 字')
    expect(prompt).toContain('去掉所有空白字符后的程序字符数')
    expect(prompt).toContain('本轮至少净删 2790 个字符')
    expect(prompt).toContain('绝不能超过 4620 字')
    expect(prompt).toContain('不得删主线事实、角色状态、章末钩子')
    expect(prompt).toContain('scene_card_receipts')
    expect(prompt).toContain('oh-story 压缩守恒')
    expect(prompt).toContain('non_whitespace_character_count(number)')
    expect(prompt).not.toContain('word_count_estimate(number)')
    expect(prompt).not.toContain('[Circular]')
  })

  test('escalates later contraction attempts after a previous over-target rewrite', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 10 }, {})
    const evaluation = evaluateProseWordTarget('字'.repeat(6093), target)
    const prompt = buildProseWordTargetContractionPrompt(
      { title: '超人的规则怪谈世界' },
      { chapter_target: { chapter_no: 10, title: '镇门诱捕', word_target: target } },
      '字'.repeat(6093),
      evaluation,
      { attempt: 2, maxAttempts: 3 },
    )

    expect(prompt).toContain('上一轮仍超上限')
    expect(prompt).toContain('改用场景功能保真的重构式压缩')
    expect(prompt).toContain('每个场景只保留一条完整行动链')
    expect(prompt).toContain('本轮至少净删 1683 个字符')
  })

  test('keeps the complete over-target chapter including its ending hook', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 10 }, {})
    const chapterText = `${'围'.repeat(27_000)}ENDING_HOOK_SENTINEL`
    const prompt = buildProseWordTargetContractionPrompt(
      { title: '超人的规则怪谈世界' },
      { chapter_target: { chapter_no: 10, title: '镇门诱捕', word_target: target } },
      chapterText,
      evaluateProseWordTarget(chapterText, target),
    )

    expect(prompt).toContain('ENDING_HOOK_SENTINEL')
  })

  test('builds commercial editor prompts with compact prose context snapshots and word targets', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 8 }, { word_target_mode: 'custom', target_word_count: 5200 })
    const contextPackage: any = {
      chapter_target: {
        chapter_no: 8,
        title: '旧标题',
        scene_cards: [
          {
            title: '会长室对峙',
            goal: `逼问印章去向；${'模型自检：scene_cards.goal_obstacle_change_delivered=false；'.repeat(60)}`,
            conflict: '旧会长拒绝承认私印失控',
          },
        ],
      },
      chapterTarget: {
        chapterNo: 8,
        title: '会长私印',
        wordTarget: target,
      },
    }
    contextPackage.self = contextPackage

    const prompt = buildCommercialEditorRewritePrompt(
      { title: '超人的规则怪谈世界' },
      contextPackage,
      '初稿正文',
      { phase: 'commercial_editor' },
    )

    expect(prompt).toContain('商业主编改稿')
    expect(prompt).toContain('目标章节：第8章《会长私印》')
    expect(prompt).toContain('字数约束：目标 5200 字，可接受范围 4680-5720 字')
    expect(prompt).toContain('改稿阶段：commercial_editor')
    expect(prompt).toContain('会长室对峙')
    expect(prompt).toContain('旧会长拒绝承认私印失控')
    expect(prompt).not.toContain('[Circular]')
    expect(prompt).not.toContain('goal_obstacle_change_delivered=false')
    expect(prompt).toContain('scene_start_anchor')
    expect(prompt).toContain('scene_card_receipts')
  })

  test('keeps the complete opening handoff contract ahead of an eight-card context budget', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 11,
        opening_obligations: ['OPENING_OBLIGATION_SENTINEL'],
        must_deliver: ['MUST_DELIVER_SENTINEL'],
        keep_alive: ['KEEP_ALIVE_SENTINEL'],
        overdue: ['OVERDUE_SENTINEL'],
        scene_cards: Array.from({ length: 8 }, (_, index) => ({
          title: `预算场景${index + 1}`,
          goal: '冗长场景资料'.repeat(500),
        })),
      },
      batch_preflight: {
        chapter_handoff_contract: { previous_handoff: 'BATCH_HANDOFF_PROMPT_SENTINEL' },
        delivery_risk_carry_over: { opening_actions: ['BATCH_OPENING_ACTION_SENTINEL'] },
      },
    }
    const prompt = buildCommercialEditorRewritePrompt({ title: '夜行旧册' }, contextPackage, '初稿正文')
    const handoffIndex = prompt.indexOf('【不可丢失的章首交接】')
    const contextIndex = prompt.indexOf('【结构化上下文包】')

    expect(handoffIndex).toBeGreaterThan(-1)
    expect(handoffIndex).toBeLessThan(contextIndex)
    for (const sentinel of [
      'OPENING_OBLIGATION_SENTINEL', 'MUST_DELIVER_SENTINEL', 'KEEP_ALIVE_SENTINEL', 'OVERDUE_SENTINEL',
      'BATCH_HANDOFF_PROMPT_SENTINEL', 'BATCH_OPENING_ACTION_SENTINEL',
    ]) expect(prompt).toContain(sentinel)
  })

  test('builds restrained meme polish prompts from an injected strategy', () => {
    const contextPackage: any = {
      chapter_target: {
        chapter_no: 3,
        title: '旧账翻页',
        scene_cards: [
          {
            title: '账本响动',
            reader_payoff: `读者看到封条不是道具而是活规则；${'补齐建议：先生成或人工确认 2-6 个场景卡；'.repeat(60)}`,
          },
        ],
      },
    }
    contextPackage.self = contextPackage

    const prompt = buildMemePolishPrompt(
      { title: '审判庭旧账' },
      contextPackage,
      '初稿正文',
      {
        memeStrategy: {
          allowed_functions: ['吐槽节奏', '角色口吻'],
          rejected_memes: ['硬插流行语'],
        },
      },
    )

    expect(prompt).toContain('克制型网感润色')
    expect(prompt).toContain('目标章节：第3章《旧账翻页》')
    expect(prompt).toContain('吐槽节奏')
    expect(prompt).toContain('账本响动')
    expect(prompt).toContain('封条不是道具而是活规则')
    expect(prompt).toContain('不得直接复刻原句')
    expect(prompt).toContain('oh-story 网感边界')
    expect(prompt).not.toContain('[Circular]')
    expect(prompt).not.toContain('先生成或人工确认')
    expect(prompt).toContain('meme_polish_report')
  })

  test('builds readability review prompts with AI-smell checks and compact prose context snapshots', () => {
    const contextPackage: any = {
      chapter_target: {
        chapter_no: 4,
        title: '封条复响',
        scene_cards: [
          {
            title: '门外敲击',
            obstacle: `门外的人知道主角刚刚改过账；${'确认同步风险：story_drive_sync missed next_actions；'.repeat(80)}`,
          },
        ],
      },
    }
    contextPackage.self = contextPackage

    const prompt = buildReadabilityReviewPrompt(
      { title: '审判庭旧账' },
      contextPackage,
      '最终正文',
    )

    expect(prompt).toContain('可读性/网感复检')
    expect(prompt).toContain('目标章节：第4章《封条复响》')
    expect(prompt).toContain('AI味/deslop 扫描')
    expect(prompt).toContain('oh-story 快速自检口诀')
    expect(prompt).toContain('门外敲击')
    expect(prompt).toContain('门外的人知道主角刚刚改过账')
    expect(prompt).not.toContain('[Circular]')
    expect(prompt).not.toContain('story_drive_sync')
    expect(prompt).toContain('readability_score')
    expect(prompt).toContain('ai_smell')
  })
})
