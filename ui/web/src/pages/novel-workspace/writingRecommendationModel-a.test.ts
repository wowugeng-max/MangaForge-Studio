import { describe, expect, test } from 'bun:test'
import {
  buildNovelDraftBriefSummary,
  buildNovelDeliverySummary,
  buildNovelWritingRecommendation,
  buildNovelWritingResponsibility,
} from './writingRecommendationModel'

describe('buildNovelWritingRecommendation a', () => {
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

  test('recommends quality-continuity scene mapping before drafting when carry-over is unmapped', () => {
    const recommendation = buildNovelWritingRecommendation({
      materialReady: true,
      materialRecommendations: [],
      sceneCardCount: 1,
      activeWordCount: 0,
      deliveryRiskCarryOverActionCount: 3,
      qualityContinuitySceneMapCount: 0,
    })
    const responsibility = buildNovelWritingResponsibility(recommendation)

    expect(recommendation.key).toBe('scene_cards')
    expect(recommendation.phase).toBe('prep')
    expect(recommendation.label).toBe('补续航场景')
    expect(recommendation.reason).toContain('质量续航')
    expect(recommendation.reason).toContain('场景卡')
    expect(responsibility.roleLabel).toBe('分集策划')
    expect(responsibility.focus).toContain('质量续航')
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

  test('keeps quality recheck as primary but still exposes manual story-state sync', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'needs_quality_check',
      statusLabel: '需复检',
      acceptanceReasons: ['本章已有正文，但还没有当前章节的质量复检记录。'],
      qualityScore: null,
      storyStateSynced: false,
      storyStatePanel: {
        visible: true,
        status: 'lagging',
        headline: '状态机仍停在第 14 章，落后于第 15 章正文',
        guidance: '点“立即同步故事状态”，系统会从本章起按已写正文补跑状态机。',
        reasons: ['故事状态更新返回了无效 payload/state_delta。'],
        primaryAction: { key: 'sync_story_state', label: '立即同步故事状态' },
      },
      secondaryActions: [{ key: 'sync_story_state', label: '立即同步故事状态' }],
      recommendedAcceptanceAction: { key: 'refresh_current_quality', label: '复检当前版本' },
    })

    expect(summary.visible).toBe(true)
    expect(summary.actionKey).toBe('refresh_current_quality')
    expect(summary.actionLabel).toBe('复检当前版本')
    expect(summary.storyStateLabel).toContain('落后于第 15 章')
    expect(summary.storyStateSyncAction).toBeNull()
    expect(summary.actionKey).not.toBe('sync_story_state')
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

  test('summarizes admitted warnings with continuation primary and optional repair actions', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'delivered_with_warnings',
      admissionStatus: 'accepted_with_warnings',
      statusLabel: '已入库，建议修订',
      acceptanceReasons: ['评分低于建议目标', '正文已入库，故事状态待补同步'],
      qualityScore: 72,
      qualityWarnings: [{ code: 'quality_score_below_target', source: 'quality', message: '评分低于建议目标' }],
      storyStateStatus: 'pending',
      postCommitWarnings: [],
      storyStateSynced: false,
      deliveryRiskQueue: {
        totalCount: 1,
        label: '待修订 1',
        priorityLabel: '优先修章末钩子',
        items: ['章末钩子偏弱'],
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
      secondaryActions: [
        { key: 'apply_editor_revision', label: '生成修订稿' },
        { key: 'sync_story_state', label: '同步故事状态' },
      ],
    })

    expect(summary.tone).toBe('warning')
    expect(summary.statusLabel).toBe('已入库，建议修订')
    expect(summary.qualityLabel).toBe('质量 72')
    expect(summary.storyStateLabel).toBe('正文已入库，故事状态待补同步')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
    expect(summary.secondaryActions.map(action => action.key)).toEqual(['apply_editor_revision', 'sync_story_state'])
    expect(summary.deliveryRiskQueue?.items).toContain('章末钩子偏弱')
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

  test('summarizes reader retention sync without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 86,
      storyStateSynced: true,
      readerRetentionSync: {
        status: 'warn',
        label: '漏追读 2',
        score: 68,
        scoreLabel: '追读兑现 68',
        missedCount: 2,
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.readerRetentionSync?.label).toBe('漏追读 2')
    expect(summary.readerRetentionSync?.scoreLabel).toBe('追读兑现 68')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('summarizes chapter benchmark sync without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 86,
      storyStateSynced: true,
      chapterBenchmarkSync: {
        status: 'warn',
        label: '基准缺口 2',
        score: 67,
        scoreLabel: '质量基准 67',
        missedCount: 2,
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.chapterBenchmarkSync?.label).toBe('基准缺口 2')
    expect(summary.chapterBenchmarkSync?.scoreLabel).toBe('质量基准 67')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('summarizes style sample sync without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 86,
      storyStateSynced: true,
      styleSampleSync: {
        status: 'warn',
        label: '风格缺口 2',
        score: 61,
        scoreLabel: '风格 61',
        missedCount: 2,
        copyRiskCount: 1,
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.styleSampleSync?.label).toBe('风格缺口 2')
    expect(summary.styleSampleSync?.scoreLabel).toBe('风格 61')
    expect(summary.styleSampleSync?.copyRiskCount).toBe(1)
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('summarizes chapter attraction without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 86,
      storyStateSynced: true,
      chapterAttraction: {
        status: 'warn',
        label: '吸引力缺口 3',
        score: 62,
        scoreLabel: '吸引力 62',
        weakCount: 3,
        priorityLabel: '优先修章末翻页',
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.chapterAttraction?.label).toBe('吸引力缺口 3')
    expect(summary.chapterAttraction?.scoreLabel).toBe('吸引力 62')
    expect(summary.chapterAttraction?.priorityLabel).toBe('优先修章末翻页')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('summarizes story drive sync without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 86,
      storyStateSynced: true,
      storyDriveSync: {
        status: 'warn',
        label: '故事力缺口 3',
        score: 60,
        scoreLabel: '故事力 60',
        missedCount: 3,
        priorityLabel: '优先补主角选择',
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.storyDriveSync?.label).toBe('故事力缺口 3')
    expect(summary.storyDriveSync?.scoreLabel).toBe('故事力 60')
    expect(summary.storyDriveSync?.priorityLabel).toBe('优先补主角选择')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('summarizes character arc sync without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 86,
      storyStateSynced: true,
      characterArcSync: {
        status: 'warn',
        label: '人物弧光缺口 3',
        score: 58,
        scoreLabel: '人物弧光 58',
        missedCount: 3,
        priorityLabel: '优先补成长节点',
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.characterArcSync?.label).toBe('人物弧光缺口 3')
    expect(summary.characterArcSync?.scoreLabel).toBe('人物弧光 58')
    expect(summary.characterArcSync?.priorityLabel).toBe('优先补成长节点')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('summarizes innovation sync without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 86,
      storyStateSynced: true,
      innovationSync: {
        status: 'warn',
        label: '创新缺口 2',
        score: 58,
        scoreLabel: '创新兑现 58',
        missedCount: 2,
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.innovationSync?.label).toBe('创新缺口 2')
    expect(summary.innovationSync?.scoreLabel).toBe('创新兑现 58')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('summarizes volume beat sync without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 86,
      storyStateSynced: true,
      volumeBeatSync: {
        status: 'warn',
        label: '爆点漏兑现 2',
        score: 52,
        scoreLabel: '爆点兑现 52',
        missedCount: 2,
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.volumeBeatSync?.label).toBe('爆点漏兑现 2')
    expect(summary.volumeBeatSync?.scoreLabel).toBe('爆点兑现 52')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('surfaces IP scene intake without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 86,
      storyStateSynced: true,
      ipSceneIntake: {
        status: 'ready',
        label: 'IP场面 2',
        candidateCount: 2,
        candidates: [
          {
            title: '玻璃门内外对峙',
            visualHook: '黑暗贴着玻璃爬动。',
            adaptationValue: '适合短剧第一集结尾。',
            spreadPoint: '救不救门外学生的争议。',
          },
        ],
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.ipSceneIntake?.label).toBe('IP场面 2')
    expect(summary.ipSceneIntake?.candidateCount).toBe(2)
    expect(summary.ipSceneIntake?.candidates[0].spreadPoint).toContain('争议')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('summarizes million word runway sync without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 86,
      storyStateSynced: true,
      runwaySync: {
        status: 'warn',
        label: '航线风险 2',
        score: 64,
        scoreLabel: '航线兑现 64',
        riskCount: 2,
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.runwaySync?.label).toBe('航线风险 2')
    expect(summary.runwaySync?.scoreLabel).toBe('航线兑现 64')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('surfaces a delivery risk queue without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 86,
      storyStateSynced: true,
      deliveryRiskQueue: {
        totalCount: 4,
        label: '待修复 4',
        priorityLabel: '优先补追读',
        items: ['补追读：漏追读 2', '补回报：回报欠账 2'],
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.deliveryRiskQueue?.label).toBe('待修复 4')
    expect(summary.deliveryRiskQueue?.priorityLabel).toBe('优先补追读')
    expect(summary.deliveryRiskQueue?.items).toContain('补追读：漏追读 2')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('surfaces delivery risk convergence without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 86,
      storyStateSynced: true,
      deliveryRiskConvergence: {
        status: 'improved',
        label: '风险收敛 3',
        residualCount: 2,
        resolvedCount: 3,
        nextAction: '继续处理残留风险：补追读；补回报',
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.deliveryRiskConvergence?.label).toBe('风险收敛 3')
    expect(summary.deliveryRiskConvergence?.residualCount).toBe(2)
    expect(summary.deliveryRiskConvergence?.nextAction).toContain('继续处理')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('surfaces chapter blueprint receipts without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 86,
      storyStateSynced: true,
      blueprintReceipt: {
        status: 'warn',
        label: '蓝图缺口 1',
        scoreLabel: '蓝图兑现 2/3',
        deliveredCount: 2,
        totalCount: 3,
        missedCount: 1,
        evidence: ['先被伪证逼到绝境，再用账本反证。'],
        missed: ['章尾承接'],
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.blueprintReceipt?.status).toBe('warn')
    expect(summary.blueprintReceipt?.label).toBe('蓝图缺口 1')
    expect(summary.blueprintReceipt?.scoreLabel).toBe('蓝图兑现 2/3')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('surfaces prose revision receipts without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 86,
      storyStateSynced: true,
      revisionReceipt: {
        status: 'warn',
        label: '修订残留 1',
        scoreLabel: '修订闭环 1/2',
        closedCount: 1,
        totalCount: 2,
        riskCount: 1,
        evidence: ['谢怀安把腰牌翻到血迹那面。'],
        risks: ['守将动机仍需下一章补证据。'],
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.revisionReceipt?.status).toBe('warn')
    expect(summary.revisionReceipt?.label).toBe('修订残留 1')
    expect(summary.revisionReceipt?.scoreLabel).toBe('修订闭环 1/2')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('surfaces delivery risk receipts without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 86,
      storyStateSynced: true,
      deliveryRiskReceipt: {
        status: 'warn',
        label: '承接残留 1',
        scoreLabel: '承接闭环 1/2',
        closedCount: 1,
        totalCount: 2,
        riskCount: 1,
        evidence: ['水迹在玻璃上拼出第二个名字。'],
        risks: ['开篇仍只写宿舍环境，没有追查湿漉漉学生身份。'],
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.deliveryRiskReceipt?.status).toBe('warn')
    expect(summary.deliveryRiskReceipt?.label).toBe('承接残留 1')
    expect(summary.deliveryRiskReceipt?.scoreLabel).toBe('承接闭环 1/2')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('surfaces scene-card receipt gaps without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 84,
      storyStateSynced: true,
      sceneCardReceipt: {
        status: 'warn',
        label: '场景回执缺口 1',
        riskCount: 1,
        evidence: ['场景2《盟友改口》scene_card_receipts 标记未兑现。'],
        scenes: ['场景2'],
        fields: ['目标/阻碍/状态变化', '感知锚点'],
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.sceneCardReceipt?.status).toBe('warn')
    expect(summary.sceneCardReceipt?.label).toBe('场景回执缺口 1')
    expect(summary.sceneCardReceipt?.fields).toContain('感知锚点')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('surfaces quality audit gaps without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 84,
      storyStateSynced: true,
      qualityAudit: {
        status: 'warn',
        label: '质量诊断缺口 1',
        riskCount: 1,
        evidence: ['爽点场景只用一句摘要带过。'],
        checks: ['目的词详略分配'],
        fixes: ['按目的词重排详略。'],
        strategies: ['rewrite'],
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.qualityAudit?.status).toBe('warn')
    expect(summary.qualityAudit?.label).toBe('质量诊断缺口 1')
    expect(summary.qualityAudit?.checks).toContain('目的词详略分配')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('surfaces quality audit carry-over without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 84,
      storyStateSynced: true,
      qualityAuditSync: {
        status: 'warn',
        label: '质量诊断缺口 2',
        missedCount: 2,
        evidence: ['信息负载：一章新增 4 个概念，信息没有跟冲突走。'],
        nextActions: ['下一章必须证明本章不可删除，并把新概念压到 3 个以内。'],
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.qualityAuditSync?.status).toBe('warn')
    expect(summary.qualityAuditSync?.label).toBe('质量诊断缺口 2')
    expect(summary.qualityAuditSync?.evidence.join('｜')).toContain('信息负载')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('surfaces quality audit repair receipt sync without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 84,
      storyStateSynced: true,
      qualityAuditRepairReceiptSync: {
        status: 'warn',
        label: '质量诊断修复回执缺口 1',
        missedCount: 1,
        receiptCount: 2,
        evidence: ['目的词详略分配：changed_evidence 为空。'],
        nextActions: ['重新修订并逐条输出 quality_audit_repair_receipts.changed_evidence。'],
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.qualityAuditRepairReceiptSync?.status).toBe('warn')
    expect(summary.qualityAuditRepairReceiptSync?.label).toBe('质量诊断修复回执缺口 1')
    expect(summary.qualityAuditRepairReceiptSync?.receiptCount).toBe(2)
    expect(summary.qualityAuditRepairReceiptSync?.evidence.join('｜')).toContain('changed_evidence')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('surfaces write-preparation execution gaps without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 84,
      storyStateSynced: true,
      writePreparation: {
        status: 'warn',
        label: '写前准备缺口 1',
        missedCount: 1,
        evidence: ['孤立资产仍未挂到主线证据链。'],
        nextActions: ['下一章先把旧钥匙和母亲旧铺印记挂钩。'],
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.writePreparation?.status).toBe('warn')
    expect(summary.writePreparation?.label).toBe('写前准备缺口 1')
    expect(summary.writePreparation?.evidence.join('｜')).toContain('孤立资产仍未挂到主线证据链')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

})
