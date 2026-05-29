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
    })

    expect(summary.visible).toBe(true)
    expect(summary.statusLabel).toBe('可进入初稿')
    expect(summary.actionKey).toBe('generate')
    expect(summary.actionLabel).toBe('确认并生成')
    expect(summary.focus).toContain('主角夺回主动权')
    expect(summary.checks).toContain('场景 4')
  })
})
