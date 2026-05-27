import { describe, expect, test } from 'bun:test'
import {
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
