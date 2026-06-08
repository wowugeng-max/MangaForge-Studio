import { describe, expect, test } from 'bun:test'
import {
  buildNovelDraftBriefSummary,
  buildNovelDeliverySummary,
  buildNovelWritingRecommendation,
  buildNovelWritingResponsibility,
} from './writingRecommendationModel'

describe('buildNovelWritingRecommendation', () => {
  test('recommends repair and assigns planner responsibility when materials are incomplete', () => {
    const recommendation = buildNovelWritingRecommendation({
      materialReady: false,
      materialRecommendations: ['缺少本章人物状态'],
      sceneCardCount: 0,
      activeWordCount: 0,
    })
    const responsibility = buildNovelWritingResponsibility(recommendation)

    expect(recommendation.key).toBe('repair_generate')
    expect(recommendation.phase).toBe('draft')
    expect(responsibility.roleLabel).toBe('分集策划')
    expect(responsibility.actionLabel).toBe('补齐并生成')
    expect(responsibility.focus).toContain('补齐本章上下文')
  })

  test('recommends scene cards and assigns planner responsibility before drafting', () => {
    const recommendation = buildNovelWritingRecommendation({
      materialReady: true,
      materialRecommendations: [],
      sceneCardCount: 0,
      activeWordCount: 0,
    })
    const responsibility = buildNovelWritingResponsibility(recommendation)

    expect(recommendation.key).toBe('scene_cards')
    expect(recommendation.phase).toBe('prep')
    expect(responsibility.roleLabel).toBe('分集策划')
    expect(responsibility.focus).toContain('拆成可执行场景节拍')
  })

  test('recommends drafting and assigns draft writer responsibility when planning is ready', () => {
    const recommendation = buildNovelWritingRecommendation({
      materialReady: true,
      materialRecommendations: [],
      sceneCardCount: 3,
      activeWordCount: 0,
    })
    const responsibility = buildNovelWritingResponsibility(recommendation)

    expect(recommendation.key).toBe('generate')
    expect(recommendation.phase).toBe('draft')
    expect(responsibility.roleLabel).toBe('正文写手')
    expect(responsibility.focus).toContain('生成正文初稿')
  })

  test('recommends quality review and assigns revision editor responsibility after prose exists', () => {
    const recommendation = buildNovelWritingRecommendation({
      materialReady: true,
      materialRecommendations: [],
      sceneCardCount: 3,
      activeWordCount: 1800,
    })
    const responsibility = buildNovelWritingResponsibility(recommendation)

    expect(recommendation.key).toBe('quality_card')
    expect(recommendation.phase).toBe('review')
    expect(responsibility.roleLabel).toBe('修订编辑')
    expect(responsibility.focus).toContain('检查已有正文')
  })
})

describe('buildNovelDeliverySummary', () => {
  test('hides delivery summary when the acceptance desk is not visible', () => {
    const summary = buildNovelDeliverySummary(null)

    expect(summary.visible).toBe(false)
    expect(summary.actionKey).toBeNull()
  })

  test('summarizes revision state with editor report action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'needs_revision',
      statusLabel: '需修订',
      acceptanceReasons: ['质量分 72 低于 78', '必须修复：章末钩子不足'],
      qualityScore: 72,
      storyStateSynced: false,
      recommendedAcceptanceAction: { key: 'create_editor_report', label: '生成编辑报告' },
    })

    expect(summary.visible).toBe(true)
    expect(summary.tone).toBe('revision')
    expect(summary.statusLabel).toBe('需修订')
    expect(summary.qualityLabel).toBe('质量 72')
    expect(summary.storyStateLabel).toBe('故事状态待同步')
    expect(summary.reason).toContain('质量分 72')
    expect(summary.actionKey).toBe('create_editor_report')
    expect(summary.actionLabel).toBe('生成编辑报告')
    expect(summary.compactActionLabel).toBe('编辑报告')
  })

  test('summarizes ready state with accept action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 86,
      storyStateSynced: true,
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.visible).toBe(true)
    expect(summary.tone).toBe('ready')
    expect(summary.qualityLabel).toBe('质量 86')
    expect(summary.storyStateLabel).toBe('故事状态已同步')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
    expect(summary.compactActionLabel).toBe('验收')
  })

  test('summarizes core drift without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 86,
      storyStateSynced: true,
      coreDrift: {
        status: 'warn',
        label: '核心偏移 2',
        score: 73,
        scoreLabel: '核心守恒 73',
        riskCount: 2,
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.coreDrift?.label).toBe('核心偏移 2')
    expect(summary.coreDrift?.scoreLabel).toBe('核心守恒 73')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('summarizes reader payoff sync without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 86,
      storyStateSynced: true,
      readerPayoffSync: {
        status: 'warn',
        label: '回报欠账 2',
        score: 64,
        scoreLabel: '回报兑现 64',
        debtCount: 2,
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.readerPayoffSync?.label).toBe('回报欠账 2')
    expect(summary.readerPayoffSync?.scoreLabel).toBe('回报兑现 64')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })
})

describe('buildNovelDraftBriefSummary', () => {
  test('hides draft brief when prose already exists', () => {
    const summary = buildNovelDraftBriefSummary({
      activeWordCount: 1200,
      chapterGoal: '主角夺回主动权',
      conflict: '旧臣压制主角',
      endingHook: '带血腰牌入席',
      sceneCardCount: 3,
    })

    expect(summary.visible).toBe(false)
    expect(summary.actionKey).toBeNull()
  })

  test('asks for scene cards before generation when scene plan is missing', () => {
    const summary = buildNovelDraftBriefSummary({
      activeWordCount: 0,
      chapterGoal: '主角夺回主动权',
      conflict: '旧臣压制主角',
      endingHook: '带血腰牌入席',
      sceneCardCount: 0,
      preDraftBrief: null,
    })

    expect(summary.visible).toBe(true)
    expect(summary.statusLabel).toBe('待补场景')
    expect(summary.actionKey).toBe('scene_cards')
    expect(summary.actionLabel).toBe('补场景卡')
    expect(summary.checks).toContain('缺场景卡')
  })

  test('confirms chapter goal before generation when draft materials are ready', () => {
    const summary = buildNovelDraftBriefSummary({
      activeWordCount: 0,
      chapterGoal: '主角夺回主动权',
      conflict: '旧臣压制主角',
      endingHook: '带血腰牌入席',
      sceneCardCount: 4,
      preDraftBrief: {
        chapter_goal: '主角夺回主动权',
        reader_promise: '主角第一次正面压住旧臣',
        core_conflict: '旧臣压制主角',
        key_settings: ['带血腰牌'],
        storyline_advances: ['夺权主线'],
        storyline_plants: ['旧臣背刺伏笔线'],
        storyline_payoffs: ['身份反转支线'],
        storyline_forbidden: ['幕后主使真名'],
        next_batch_brief: {
          chapter_range_label: '第8-10章',
          batch_goal: '三章内完成旧臣压制到公开反压。',
          reader_payoff_plan: '身份反转、当众压制、章末追杀。',
          mainline_focus: '夺权主线进入明面冲突。',
          forbidden_boundary: '不得提前揭露幕后主使。',
          current_chapter_role: '本章负责把主角第一次反压写扎实。',
        },
        scene_briefs: [{ scene_no: 1, title: '入席', reader_payoff: '身份反转' }],
        word_budget: '标准章 3000 字',
        ending_hook: '带血腰牌入席',
        confirmed_at: '2026-06-03T10:00:00.000Z',
      },
    })

    expect(summary.visible).toBe(true)
    expect(summary.statusLabel).toBe('任务书已确认')
    expect(summary.actionKey).toBe('generate')
    expect(summary.actionLabel).toBe('确认并生成')
    expect(summary.focus).toContain('主角第一次正面压住旧臣')
    expect(summary.checks).toContain('场景 4')
    expect(summary.briefFields.readerPromise).toContain('旧臣')
    expect(summary.briefFields.keySettings).toContain('带血腰牌')
    expect(summary.briefFields.storylineAdvances).toContain('夺权主线')
    expect(summary.briefFields.storylinePlants).toContain('旧臣背刺伏笔线')
    expect(summary.briefFields.storylinePayoffs).toContain('身份反转支线')
    expect(summary.briefFields.storylineForbidden).toContain('幕后主使真名')
    expect(summary.briefFields.batchRange).toBe('第8-10章')
    expect(summary.briefFields.batchGoal).toContain('公开反压')
    expect(summary.briefFields.batchCurrentRole).toContain('第一次反压')
    expect(summary.briefFields.batchForbidden).toContain('幕后主使')
  })

  test('shows an editable pre-draft brief when scene cards exist but the brief is not confirmed', () => {
    const summary = buildNovelDraftBriefSummary({
      activeWordCount: 0,
      chapterGoal: '主角夺回主动权',
      conflict: '旧臣压制主角',
      endingHook: '带血腰牌入席',
      sceneCardCount: 4,
      preDraftBrief: {
        chapter_goal: '主角夺回主动权',
        reader_promise: '主角第一次正面压住旧臣',
        core_conflict: '旧臣压制主角',
        emotional_curve: '压抑 -> 试探 -> 反压',
        key_settings: ['带血腰牌'],
        forbidden_content: ['提前揭露幕后主使'],
        scene_briefs: [{ scene_no: 1, title: '入席', reader_payoff: '身份反转' }],
        word_budget: '标准章 3000 字',
        ending_hook: '带血腰牌入席',
      },
    })

    expect(summary.visible).toBe(true)
    expect(summary.statusLabel).toBe('待确认任务书')
    expect(summary.actionKey).toBe('confirm_brief')
    expect(summary.actionLabel).toBe('确认任务书')
    expect(summary.briefFields.emotionalCurve).toContain('反压')
    expect(summary.briefFields.forbiddenContent).toContain('幕后主使')
  })
})
