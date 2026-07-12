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

  test('surfaces chapter handoff sync gaps without changing delivery action', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'ready_to_accept',
      statusLabel: '可验收',
      acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
      qualityScore: 84,
      storyStateSynced: true,
      chapterHandoffSync: {
        status: 'warn',
        label: '章首承接缺口 2',
        missedCount: 2,
        evidence: ['开篇没有接住敲门、湿漉漉学生和不能开门的警告。'],
        nextActions: ['下一章开篇先回到玻璃门水痕。'],
      },
      chapterHandoffDeltaSync: {
        status: 'warn',
        label: '章末交接缺口 1',
        missedCount: 1,
        evidence: ['第二个证人的章末追读没有写入下一章优先事项。'],
        nextActions: ['下一章先追查第三个人。'],
      },
      recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
    })

    expect(summary.chapterHandoffSync?.label).toBe('章首承接缺口 2')
    expect(summary.chapterHandoffSync?.evidence.join('｜')).toContain('湿漉漉学生')
    expect(summary.chapterHandoffDeltaSync?.label).toBe('章末交接缺口 1')
    expect(summary.chapterHandoffDeltaSync?.nextActions.join('｜')).toContain('第三个人')
    expect(summary.actionKey).toBe('accept_chapter_and_continue')
  })

  test('surfaces approval blockers for the delivery status strip', () => {
    const summary = buildNovelDeliverySummary({
      visible: true,
      acceptanceStatus: 'needs_revision',
      statusLabel: '需修订',
      acceptanceReasons: ['仿写安全阻断：连续三段与参考材料高度相似'],
      qualityScore: 84,
      storyStateSynced: false,
      approvalBlocker: {
        type: 'reference_safety_blocked',
        status: 'warn',
        label: '仿写安全阻断',
        detail: '连续三段与参考材料高度相似',
        scoreLabel: '入库阻断 84',
        reasons: ['连续三段与参考材料高度相似'],
      },
      recommendedAcceptanceAction: { key: 'create_editor_report', label: '生成编辑报告' },
    })

    expect(summary.tone).toBe('revision')
    expect(summary.approvalBlocker?.label).toBe('仿写安全阻断')
    expect(summary.approvalBlocker?.scoreLabel).toBe('入库阻断 84')
    expect(summary.approvalBlocker?.detail).toContain('连续三段')
    expect(summary.actionKey).toBe('create_editor_report')
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
        previous_handoff: '上一章结尾：门外追杀信号响起，主角必须立刻处理。',
        delivery_risk_carry_over: {
          total_count: 3,
          label: '待修复 3',
          priority_label: '优先修章末',
          items: ['修章末翻页：上一章没有把追杀信号压成翻页问题。', '补创新：制度漏洞反压不够新鲜。'],
          required_actions: ['本章前 300 字直接接追杀信号。', '章末必须留下新的未解问题。'],
          opening_actions: ['前 300 字让主角立刻处理门外追杀信号。'],
          middle_actions: ['中段用制度漏洞反压旧臣。'],
          ending_actions: ['章末把带血腰牌变成新的未解问题。'],
          evidence: ['上一章最后 300 字只写门外响动，没有让追杀信号形成明确翻页问题。'],
        },
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
        reader_retention_brief: {
          opening_hook: '开篇直接写旧臣当众压主角。',
          payoff_promise: '本章兑现身份反转和第一次反压。',
          information_gap: '带血腰牌背后的真正来历。',
          emotional_reward: '压抑后给读者一次当众扬眉吐气。',
          short_drama_scene: '议事厅入席，腰牌拍案，全场噤声。',
          ending_question: '谁在门外放出了追杀信号。',
          forbidden_cliches: ['不要用旁白解释代替当场冲突'],
        },
        reader_expectation_ledger: {
          chapter_promise: '本章兑现身份反转和第一次反压。',
          carry_over: [
            { key: 'carry_over_1', label: '期待债务', type: 'carry_over', text: '上一章门外追杀信号必须有可见推进。' },
          ],
          must_deliver: [
            { key: 'payoff_promise', label: '爽点承诺', type: 'payoff', text: '本章兑现身份反转和第一次反压。' },
            { key: 'ending_hook', label: '章末追读', type: 'hook', text: '谁在门外放出了追杀信号。' },
          ],
          keep_alive: [
            { key: 'open_question_1', label: '保留悬念', type: 'question', text: '带血腰牌背后的真正来历。' },
          ],
          must_not_break: ['不得整章只铺王府设定不兑现反压'],
        },
        reader_expectation_debt: {
          must_carry: [
            { from_chapter_no: 6, key: 'ending_hook', label: '章末追读', type: 'hook', text: '上一章门外追杀信号必须有可见推进。' },
          ],
          keep_alive: [
            { from_chapter_no: 6, key: 'open_question', label: '保留悬念', type: 'question', text: '旧臣背后是谁在递刀。' },
          ],
          overdue: [
            { from_chapter_no: 4, age_chapters: 4, overdue: true, key: 'old_hook', label: '逾期待补', type: 'hook', text: '第四章留下的暗门脚印必须推进。' },
          ],
          overdue_count: 1,
          summary: '待兑现 1 项，继续悬念 1 项，逾期 1 项',
        },
        innovation_brief: {
          chapter_angle: '失势皇子不用金手指平推，而是借旧臣制度漏洞反压。',
          execution_points: ['腰牌拍案前先让旧臣误判主角底牌'],
          differentiation_guardrails: ['不得写成普通身份碾压'],
          ip_adaptation_hooks: ['议事厅拍案静场'],
        },
        signature_scene_brief: {
          signature_scene: '主角把带血腰牌拍在议事厅长案上，满堂旧臣同时失声。',
          scene_repair_target: '修复 IP场面覆盖 1/10 的强场面空窗。',
          reader_payoff: '公开身份反转和制度漏洞反压。',
          storyline_service: '推进夺权主线。',
        },
        longform_battle_context: {
          status: 'needs_action',
          summary: '先修复读者拉力和核心守恒。',
          risk_chips: ['核心偏移', '前30章留存'],
          primary_action: {
            label: '运行前30章诊断',
            reason: '第7章章末追读不足。',
          },
          risk_lanes: [
            {
              key: 'story_core',
              label: '核心守恒',
              status: 'warn',
              detail: '核心偏移：夺权主线被写成普通家斗。',
              required_action: '本章必须把制度漏洞反压服务夺权主线。',
            },
            {
              key: 'reader_pull',
              label: '读者拉力',
              status: 'block',
              detail: '前30章留存弱：章末钩子不足。',
              required_action: '章末必须抛出追杀信号是谁发出的。',
            },
          ],
        },
        first30_retention_brief: {
          segment_label: '试读十章',
          chapter_score: 61,
          flags: ['章末钩子弱', '爽点/悬念信号少'],
          required_actions: ['补未解决问题。'],
          repair_focus: '第7章必须补强章末追读和可感知回报。',
        },
        story_unit_context: {
          title: '王府夺权第一轮剧情单元',
          chapter_range_label: '第7-12章',
          current_chapter_role: '入口钩子',
          unit_goal: '六章内完成旧臣逼宫、身份反压和追杀升级。',
          mini_climax_payoff: '第10章公开反压旧臣集团。',
          exit_hook: '第12章追杀信号指向幕后主使。',
          forbidden_advance: ['不得提前揭露幕后主使真名'],
        },
        style_sample_strategy: {
          enabled: true,
          locked: true,
          selection_mode: 'author_locked',
          samples: [
            {
              sample_key: '权谋反压语感',
              abstract_usage: '只学习制度压迫下的短句反压和对白节奏。',
              selection_reason: '命中高压反打、对白交锋；避开纯背景说明。',
            },
          ],
          do_not_copy: ['不得复制样章原句'],
        },
        chapter_benchmark_strategy: {
          enabled: true,
          samples: [
            {
              sample_key: '权谋反压基准',
              opening_hook: '开篇 300 字内让旧臣当众逼宫。',
              conflict_pattern: '旧臣程序压制，主角反用制度漏洞。',
              payoff_pattern: '腰牌拍案带来身份反转和公开反压。',
              ending_hook_pattern: '章末抛出追杀信号。',
              abstract_usage: '只学习章节结构、冲突节拍和章末追读。',
            },
          ],
          do_not_copy: ['不得复制样例桥段、角色名、专有设定和原句'],
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
    expect(summary.briefFields.handoffPreviousEnding).toContain('门外追杀信号')
    expect(summary.briefFields.handoffOpeningObligation).toContain('开篇直接写旧臣当众压主角')
    expect(summary.briefFields.handoffMustCarry).toContain('门外追杀信号')
    expect(summary.briefFields.handoffKeepAlive).toContain('旧臣背后')
    expect(summary.briefFields.deliveryRiskLabel).toContain('待修复')
    expect(summary.briefFields.deliveryRiskItems).toContain('修章末翻页')
    expect(summary.briefFields.deliveryRiskPriority).toContain('优先修章末')
    expect(summary.briefFields.deliveryRiskOpeningActions).toContain('前 300 字')
    expect(summary.briefFields.deliveryRiskMiddleActions).toContain('制度漏洞')
    expect(summary.briefFields.deliveryRiskEndingActions).toContain('带血腰牌')
    expect(summary.briefFields.deliveryRiskEvidence).toContain('最后 300 字')
    expect(summary.briefFields.keySettings).toContain('带血腰牌')
    expect(summary.briefFields.storylineAdvances).toContain('夺权主线')
    expect(summary.briefFields.storylinePlants).toContain('旧臣背刺伏笔线')
    expect(summary.briefFields.storylinePayoffs).toContain('身份反转支线')
    expect(summary.briefFields.storylineForbidden).toContain('幕后主使真名')
    expect(summary.briefFields.batchRange).toBe('第8-10章')
    expect(summary.briefFields.batchGoal).toContain('公开反压')
    expect(summary.briefFields.batchCurrentRole).toContain('第一次反压')
    expect(summary.briefFields.batchForbidden).toContain('幕后主使')
    expect(summary.briefFields.retentionOpeningHook).toContain('旧臣')
    expect(summary.briefFields.retentionPayoffPromise).toContain('身份反转')
    expect(summary.briefFields.retentionShortDramaScene).toContain('腰牌拍案')
    expect(summary.briefFields.retentionEndingQuestion).toContain('追杀信号')
    expect(summary.briefFields.expectationMustDeliver).toContain('第一次反压')
    expect(summary.briefFields.expectationCarryOver).toContain('门外追杀信号')
    expect(summary.briefFields.expectationDebtMustCarry).toContain('门外追杀信号')
    expect(summary.briefFields.expectationDebtKeepAlive).toContain('旧臣背后')
    expect(summary.briefFields.expectationDebtOverdue).toContain('第四章留下的暗门脚印')
    expect(summary.briefFields.expectationDebtSummary).toContain('逾期 1 项')
    expect(summary.briefFields.expectationKeepAlive).toContain('腰牌背后')
    expect(summary.briefFields.expectationMustNotBreak).toContain('不兑现反压')
    expect(summary.briefFields.innovationAngle).toContain('制度漏洞反压')
    expect(summary.briefFields.innovationExecution).toContain('误判主角底牌')
    expect(summary.briefFields.innovationGuardrails).toContain('普通身份碾压')
    expect(summary.briefFields.innovationIpHooks).toContain('议事厅拍案')
    expect(summary.briefFields.signatureScene).toContain('满堂旧臣同时失声')
    expect(summary.briefFields.signatureSceneTarget).toContain('IP场面覆盖 1/10')
    expect(summary.briefFields.signatureScenePayoff).toContain('制度漏洞反压')
    expect(summary.briefFields.signatureSceneStoryline).toContain('夺权主线')
    expect(summary.briefFields.longformBattleStatus).toBe('needs_action')
    expect(summary.briefFields.longformBattleSummary).toContain('读者拉力')
    expect(summary.briefFields.longformBattleRisks).toContain('核心偏移')
    expect(summary.briefFields.longformBattlePrimaryAction).toContain('运行前30章诊断')
    expect(summary.briefFields.longformBattleLaneRequirements).toContain('制度漏洞反压')
    expect(summary.briefFields.longformBattleLaneRequirements).toContain('追杀信号')
    expect(summary.briefFields.first30RetentionSegment).toContain('试读十章')
    expect(summary.briefFields.first30RetentionFlags).toContain('章末钩子弱')
    expect(summary.briefFields.first30RetentionActions).toContain('补未解决问题')
    expect(summary.briefFields.storyUnitRange).toContain('第7-12章')
    expect(summary.briefFields.storyUnitRole).toContain('入口钩子')
    expect(summary.briefFields.storyUnitGoal).toContain('旧臣逼宫')
    expect(summary.briefFields.storyUnitPayoff).toContain('公开反压')
    expect(summary.briefFields.storyUnitExitHook).toContain('幕后主使')
    expect(summary.briefFields.storyUnitForbidden).toContain('不得提前揭露幕后主使真名')
    expect(summary.briefFields.styleSampleKeys).toContain('权谋反压语感')
    expect(summary.briefFields.styleSampleReasons).toContain('命中高压反打')
    expect(summary.briefFields.styleSampleReasons).toContain('避开纯背景说明')
    expect(summary.briefFields.styleSampleControlState).toContain('作者已锁定')
    expect(summary.briefFields.chapterBenchmarkKeys).toContain('权谋反压基准')
    expect(summary.briefFields.chapterBenchmarkUsage).toContain('冲突节拍')
    expect(summary.briefFields.chapterBenchmarkForbidden).toContain('不得复制样例桥段')
  })

  test('surfaces governance recheck memory in the chapter pre-draft brief summary', () => {
    const summary = buildNovelDraftBriefSummary({
      activeWordCount: 0,
      chapterGoal: '主角夺回主动权',
      conflict: '旧臣压制主角',
      endingHook: '带血腰牌入席',
      sceneCardCount: 2,
      preDraftBrief: {
        chapter_goal: '主角夺回主动权',
        reader_promise: '主角第一次正面压住旧臣',
        core_conflict: '旧臣压制主角',
        ending_hook: '带血腰牌入席',
        scene_briefs: [{ scene_no: 1, title: '当堂应答' }],
        governance_recheck_memory: {
          source_run_id: 44,
          status: 'closed',
          label: '治理复查已记录',
          summary: '恢复依据闭环 2/2，本章继续继承修后证据。',
          evidence: ['第42章对白交锋已补回样章节奏'],
          failed_evidence: [],
          watch_items: ['下一章继续观察样章策略命中率'],
          storyline_decision_task_count: 0,
        },
      },
    })

    expect(summary.briefFields.governanceMemoryStatus).toContain('治理复查已记录')
    expect(summary.briefFields.governanceMemoryEvidence).toContain('第42章对白交锋已补回样章节奏')
    expect(summary.briefFields.governanceMemoryWatchItems).toContain('下一章继续观察样章策略命中率')
  })

  test('surfaces nested next-chapter quality plan in the chapter pre-draft brief summary', () => {
    const summary = buildNovelDraftBriefSummary({
      activeWordCount: 0,
      chapterGoal: '追查校徽反光里的第二条规则',
      conflict: '主角必须在值班室名单被销毁前取证',
      endingHook: '名单背面出现第三个名字',
      sceneCardCount: 3,
      preDraftBrief: {
        confirmed_at: '2026-06-20T00:00:00.000Z',
        reader_promise: '本章兑现规则验证和身份推进。',
        core_conflict: '主角要在值班室名单被销毁前取证。',
        oh_story_delivery_receipts: {
          next_chapter_quality_plan: {
            quality_focus: ['开篇必须用校徽反光直接触发行动', '中段用规则反制而不是旁白解释'],
            opening_actions: ['前300字用校徽反光定位值班室名单'],
            middle_actions: ['中段让玻璃门规则反制蛮力'],
            ending_actions: ['章末让名单背面露出第三个名字'],
            avoid_repetition: ['不要再用“他知道，这只是开始”总结体收尾'],
            evidence_basis: ['上一章自检指出身份追查没有落成可见行动'],
          },
        },
      },
    })

    expect(summary.briefFields.nextChapterQualityFocus).toContain('开篇必须用校徽反光')
    expect(summary.briefFields.nextChapterQualityOpening).toContain('前300字用校徽反光定位值班室名单')
    expect(summary.briefFields.nextChapterQualityMiddle).toContain('玻璃门规则反制蛮力')
    expect(summary.briefFields.nextChapterQualityEnding).toContain('第三个名字')
    expect(summary.briefFields.nextChapterQualityAvoid).toContain('总结体收尾')
    expect(summary.briefFields.nextChapterQualityEvidence).toContain('身份追查没有落成可见行动')
  })

  test('normalizes camelCase pre-draft brief fields for the writing brief summary', () => {
    const summary = buildNovelDraftBriefSummary({
      activeWordCount: 0,
      chapterGoal: '主角进入倒悬教室',
      conflict: '监考人抹掉主角身份',
      endingHook: '粉笔灰拼出下一间教室',
      sceneCardCount: 2,
      preDraftBrief: {
        chapterGoal: '主角进入倒悬教室验证镜面规则',
        readerPromise: '主角用镜面规则反证监考人撒谎',
        coreConflict: '监考人试图用点名册抹掉主角身份',
        readerRetentionBrief: {
          openingHook: '天花板倒悬的课桌忽然点名主角。',
          payoffPromise: '主角用镜面规则反证监考人撒谎。',
          endingQuestion: '下一间教室为什么提前写着主角名字。',
        },
        readerDropRiskBrief: {
          status: 'needs_repair',
          dropPoints: ['中段解释规则过密，试读用户可能弃读。'],
          openingGuardrail: '前300字给倒悬教室危机。',
        },
        first30RetentionBrief: {
          segmentLabel: '试读十章',
          flags: ['开篇钩子弱'],
          requiredActions: ['前300字给倒悬教室危机'],
        },
        storyUnitContext: {
          currentChapterRole: '规则验证章',
          unitGoal: '三章内完成镜面规则第一轮验证。',
          forbiddenAdvance: ['不得提前揭晓点名册幕后者'],
        },
        recentFatigueBrief: {
          nextActions: ['减少解释，改成现场危险'],
        },
        styleSampleStrategy: {
          locked: true,
          samples: [
            {
              sampleKey: '规则怪谈压迫语感',
              abstractUsage: '只学习规则压迫下的短句推进。',
              selectionReason: '命中规则验证和身份抹除场景。',
            },
          ],
          doNotCopy: ['不得复制样章原句'],
        },
      } as any,
    })

    expect(summary.briefFields.readerPromise).toContain('镜面规则')
    expect(summary.briefFields.retentionOpeningHook).toContain('倒悬')
    expect(summary.briefFields.retentionPayoffPromise).toContain('反证监考人')
    expect(summary.briefFields.readerDropRisks).toContain('解释规则过密')
    expect(summary.briefFields.readerDropOpening).toContain('前300字')
    expect(summary.briefFields.first30RetentionSegment).toContain('试读十章')
    expect(summary.briefFields.first30RetentionActions).toContain('倒悬教室危机')
    expect(summary.briefFields.storyUnitRole).toContain('规则验证章')
    expect(summary.briefFields.storyUnitForbidden).toContain('点名册幕后者')
    expect(summary.briefFields.recentFatigueActions).toContain('现场危险')
    expect(summary.briefFields.styleSampleKeys).toContain('规则怪谈压迫语感')
    expect(summary.briefFields.styleSampleUsage).toContain('短句推进')
    expect(summary.briefFields.styleSampleReasons).toContain('身份抹除')
    expect(summary.briefFields.styleSampleForbidden).toContain('不得复制样章原句')
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
        innovation_brief: {
          chapter_angle: '旧臣以为照旧压制，主角改用公开规则反杀。',
          execution_points: ['先让旧臣占据程序优势，再反用腰牌资格'],
        },
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
    expect(summary.briefFields.innovationAngle).toContain('公开规则反杀')
    expect(summary.briefFields.innovationExecution).toContain('腰牌资格')
  })

  test('surfaces oh-story chapter blueprint contract in the pre-draft brief summary', () => {
    const summary = buildNovelDraftBriefSummary({
      activeWordCount: 0,
      chapterGoal: '阵堂公开反证',
      conflict: '执事逼主角认罪',
      endingHook: '禁库旧阵第二层纹路亮起',
      sceneCardCount: 3,
      preDraftBrief: {
        chapter_goal: '阵堂公开反证',
        reader_promise: '主角当众反证并夺回主动权',
        core_conflict: '执事逼主角认罪',
        chapter_blueprint: {
          version: 'oh_story_chapter_blueprint_v1',
          target_emotion: '压迫 -> 反证 -> 爽感释放',
          opening_hook: '第一句就是认罪书砸到主角面前。',
          core_payoff: '当众反证打脸并夺回主动权。',
          content_outline: {
            cause: '执事拿伪证逼主角认罪。',
            development: '主角用账本逐项反证。',
            turn: '证人临阵翻供。',
            climax: '旧阵纹响应主角血印。',
            ending: '禁库第二层纹路亮起。',
          },
          plot_lines: {
            mainline: '阵堂审判从压制转为公开反证。',
            subplot: '证人动摇暴露幕后交易。',
            event_line: '伪证、账本、旧阵纹三段推进。',
            relationship_line: '旁观弟子从质疑转为站队。',
            logic_line: '每个证据都要形成因果闭环。',
          },
          character_order: ['执事', '主角', '证人', '旁观弟子'],
          relationship_change: '主角和旁观弟子的信任从零到初步站队。',
          information_gap: '幕后谁调换了第一本账册。',
          beat_sequence: [
            { scene_no: 1, title: '审判开场', function_tag: '开篇钩子/铺垫', required_payoff: '主角被逼到绝境' },
            { scene_no: 2, title: '账本反证', function_tag: '转折/反证', required_payoff: '伪证破口' },
            { scene_no: 3, title: '旧阵响应', function_tag: '高潮/章尾钩子', required_payoff: '禁库第二层亮起' },
          ],
          cost_and_reward: '代价是暴露血印，回报是当众打脸并夺回审判主动权。',
          ending_contract: {
            final_image: '禁库旧阵第二层纹路在黑暗里亮起。',
            next_chapter_pull: '第二本账册是谁藏进禁库。',
          },
          writing_intent: '把本章写成先被压制、再用证据反杀、最后抛出禁库追读。',
        },
        scene_briefs: [{ scene_no: 1, title: '审判开场' }],
        ending_hook: '禁库旧阵第二层纹路亮起',
      },
    })

    expect(summary.briefFields.blueprintVersion).toBe('oh_story_chapter_blueprint_v1')
    expect(summary.briefFields.blueprintTargetEmotion).toContain('爽感释放')
    expect(summary.briefFields.blueprintOpeningHook).toContain('认罪书')
    expect(summary.briefFields.blueprintCorePayoff).toContain('夺回主动权')
    expect(summary.briefFields.blueprintOutline).toContain('起因：执事拿伪证逼主角认罪')
    expect(summary.briefFields.blueprintOutline).toContain('高潮：旧阵纹响应主角血印')
    expect(summary.briefFields.blueprintPlotLines).toContain('主线：阵堂审判从压制转为公开反证')
    expect(summary.briefFields.blueprintPlotLines).toContain('关系线：旁观弟子从质疑转为站队')
    expect(summary.briefFields.blueprintCharacterOrder).toBe('执事、主角、证人、旁观弟子')
    expect(summary.briefFields.blueprintRelationshipChange).toContain('初步站队')
    expect(summary.briefFields.blueprintInformationGap).toContain('第一本账册')
    expect(summary.briefFields.blueprintBeatSequence).toContain('场景1 审判开场：开篇钩子/铺垫')
    expect(summary.briefFields.blueprintBeatSequence).toContain('回报：禁库第二层亮起')
    expect(summary.briefFields.blueprintCostAndReward).toContain('暴露血印')
    expect(summary.briefFields.blueprintEndingContract).toContain('终幕：禁库旧阵第二层纹路在黑暗里亮起')
    expect(summary.briefFields.blueprintWritingIntent).toContain('证据反杀')
  })

  test('surfaces platform rubric in the pre-draft brief summary', () => {
    const summary = buildNovelDraftBriefSummary({
      activeWordCount: 0,
      chapterGoal: '阵堂公开反证',
      conflict: '执事逼主角认罪',
      endingHook: '禁库旧阵第二层纹路亮起',
      sceneCardCount: 3,
      preDraftBrief: {
        chapter_goal: '阵堂公开反证',
        platform_rubric: {
          platform: 'fanqie',
          label: '番茄小说',
          source: 'oh_story_embedded_fallback',
          checks: ['前 3 段包含冲突/悬念/钩子', '短段落、快节奏、高信息密度'],
          revision_priorities: ['强化前三段钩子', '补章末翻页动力'],
        },
        chapter_blueprint: {
          version: 'oh_story_chapter_blueprint_v1',
          platform_rubric: {
            platform: 'fanqie',
            label: '番茄小说',
          },
        },
      },
    })

    expect(summary.briefFields.platformRubricLabel).toBe('番茄小说')
    expect(summary.briefFields.platformRubricSource).toBe('oh_story_embedded_fallback')
    expect(summary.briefFields.platformRubricChecks).toContain('前 3 段包含冲突')
    expect(summary.briefFields.platformRubricPriorities).toContain('章末翻页动力')
  })

  test('surfaces volume climax budget in the pre-draft brief summary', () => {
    const summary = buildNovelDraftBriefSummary({
      activeWordCount: 0,
      chapterGoal: '阵堂公开反证',
      conflict: '执事逼主角认罪',
      endingHook: '禁库旧阵第二层纹路亮起',
      sceneCardCount: 3,
      preDraftBrief: {
        chapter_goal: '阵堂公开反证',
        reader_promise: '主角第一次公开打脸执事',
        core_conflict: '执事逼主角认罪',
        volume_climax_brief: {
          current_volume_title: '第一卷 阵堂起势',
          chapter_range: '第1-60章',
          current_chapter_role: '完成第一卷第一次小高潮：阵堂公开打脸。',
          volume_goal: '让主角在阵堂立住起势资格。',
          climax_promise: '公开反证执事偷换阵图，给读者阶段性打脸回报。',
          required_beats: ['执事当众失势', '主角得到试炼资格'],
          forbidden_payoff: ['不得提前揭穿禁库真相', '不得提前解决卷末师承身份'],
          nearby_beats: [
            { chapter_no: 18, type: '小高潮', label: '阵堂公开打脸', detail: '主角公开反证执事偷换阵图。' },
          ],
        },
      },
    })

    expect(summary.briefFields.volumeClimaxRange).toContain('第一卷')
    expect(summary.briefFields.volumeClimaxRange).toContain('第1-60章')
    expect(summary.briefFields.volumeClimaxRole).toContain('第一次小高潮')
    expect(summary.briefFields.volumeClimaxGoal).toContain('起势资格')
    expect(summary.briefFields.volumeClimaxPromise).toContain('阶段性打脸回报')
    expect(summary.briefFields.volumeClimaxRequiredBeats).toContain('执事当众失势')
    expect(summary.briefFields.volumeClimaxForbidden).toContain('禁库真相')
    expect(summary.briefFields.volumeClimaxNearbyBeats).toContain('阵堂公开打脸')
  })

  test('surfaces recent fatigue avoidance in the pre-draft brief summary', () => {
    const summary = buildNovelDraftBriefSummary({
      activeWordCount: 0,
      chapterGoal: '旧阵异响',
      conflict: '旧执事余党仍想用阵堂规矩压人',
      endingHook: '藏书阁地砖下传出第二道阵鸣',
      sceneCardCount: 3,
      preDraftBrief: {
        chapter_goal: '旧阵异响',
        reader_promise: '主角换一种方式反制旧执事余党',
        core_conflict: '旧执事余党仍想用阵堂规矩压人',
        recent_fatigue_brief: {
          chapter_range_label: '第9-18章',
          score: 61,
          fatigue_risks: ['近10章「执事压迫」出现 7 次', '近10章「公开打脸」出现 6 次'],
          conflict_variation: '更换压迫来源：转向藏书阁规矩与旧阵异响。',
          payoff_variation: '更换回报形态：不再公开打脸，改为反向设局。',
          hook_variation: '更换章末问题：从试炼将至改成地砖阵鸣。',
          scene_freshness: '补新可视化场面：藏书阁地砖下阵纹亮起。',
          next_actions: ['本章至少换一项冲突来源、回报形态或章末问题。'],
        },
      },
    })

    expect(summary.briefFields.recentFatigueRange).toContain('第9-18章')
    expect(summary.briefFields.recentFatigueRange).toContain('61分')
    expect(summary.briefFields.recentFatigueRisks).toContain('执事压迫')
    expect(summary.briefFields.recentFatigueConflict).toContain('更换压迫来源')
    expect(summary.briefFields.recentFatiguePayoff).toContain('更换回报形态')
    expect(summary.briefFields.recentFatigueHook).toContain('更换章末问题')
    expect(summary.briefFields.recentFatigueScene).toContain('可视化场面')
    expect(summary.briefFields.recentFatigueActions).toContain('至少换一项')
  })

  test('surfaces reader drop and strong story execution briefs in the pre-draft brief summary', () => {
    const summary = buildNovelDraftBriefSummary({
      activeWordCount: 0,
      chapterGoal: '主角公开夺回阵图',
      conflict: '守堂执事拖延审查',
      endingHook: '内门长老认出禁库旧阵',
      sceneCardCount: 2,
      preDraftBrief: {
        reader_drop_risk_brief: {
          status: 'needs_repair',
          score: 66,
          quality_bar: '起点1万均订试读基准',
          drop_points: ['中段解释阵法过密，试读用户可能弃读。'],
          opening_guardrail: '开篇 300 字先给阵图被夺的现场压力。',
          middle_guardrail: '中段减少设定解释，用动作验证阵法规则。',
          ending_guardrail: '章末留下第二层阵纹的代价问题。',
        },
        story_pressure_brief: {
          status: 'needs_attention',
          range_label: '第7-12章',
          pressure_sources: ['执事压迫', '内门长老审视'],
          stakes_growth_guardrail: '赌注要落到主角是否失去试炼资格。',
          reversal_pressure_guardrail: '章末用禁库旧阵反转局势。',
        },
        story_drive_brief: {
          protagonist_choice: '主角当众选择用残阵反证阵图归属。',
          choice_cost: '暴露阵盘裂纹，招来内门势力注意。',
          state_change: '主角从被动挨压转为主动入局。',
          causal_next_step: '下一章必须追问禁库旧阵来源。',
        },
        serial_rhythm_brief: {
          opening_hook_deadline: '前 300 字必须接住执事夺图。',
          payoff_interval: '每 800-1200 字至少给一次信息增量或局势反转。',
          middle_guardrail: '中段不能堆阵法解释，要用验阵逼站队。',
          ending_hook_guardrail: '最后一幕压到禁库旧阵来源。',
          scene_payoff_budget: [
            { scene_no: 1, title: '堂前拦路', required_payoff: '逼执事露怯', turn: '假阵图反证执事动手脚' },
            { scene_no: 2, title: '残阵反证', required_payoff: '伪证当场反噬', turn: '内门长老发现残阵源自禁库' },
          ],
        },
        page_turn_hook_brief: {
          hook_type: '身份反转',
          core_question: '禁库旧阵到底是谁传给主角。',
          visible_trigger: '内门长老认出残阵源自禁库。',
          next_chapter_pull: '下一章逼主角解释师承。',
          forbidden_resolution: ['不得在本章解释完整答案。'],
        },
        confirmed_at: '2026-06-10T11:00:00.000Z',
      },
    })

    expect(summary.briefFields.readerDropRiskStatus).toContain('needs_repair')
    expect(summary.briefFields.readerDropRiskStatus).toContain('66分')
    expect(summary.briefFields.readerDropRisks).toContain('中段解释阵法过密')
    expect(summary.briefFields.readerDropOpening).toContain('开篇 300 字')
    expect(summary.briefFields.readerDropMiddle).toContain('中段减少设定解释')
    expect(summary.briefFields.readerDropEnding).toContain('第二层阵纹')
    expect(summary.briefFields.storyPressureSources).toContain('执事压迫')
    expect(summary.briefFields.storyPressureStakes).toContain('试炼资格')
    expect(summary.briefFields.storyPressureReversal).toContain('禁库旧阵')
    expect(summary.briefFields.storyDriveChoice).toContain('当众选择')
    expect(summary.briefFields.storyDriveCost).toContain('暴露阵盘裂纹')
    expect(summary.briefFields.storyDriveChange).toContain('主动入局')
    expect(summary.briefFields.storyDriveNextStep).toContain('禁库旧阵来源')
    expect(summary.briefFields.serialRhythmOpening).toContain('前 300 字')
    expect(summary.briefFields.serialRhythmPayoffInterval).toContain('800-1200')
    expect(summary.briefFields.serialRhythmScenePayoffs).toContain('堂前拦路')
    expect(summary.briefFields.serialRhythmScenePayoffs).toContain('残阵反证')
    expect(summary.briefFields.pageTurnQuestion).toContain('禁库旧阵')
    expect(summary.briefFields.pageTurnTrigger).toContain('内门长老认出')
    expect(summary.briefFields.pageTurnPull).toContain('解释师承')
    expect(summary.briefFields.pageTurnForbidden).toContain('不得在本章解释完整答案')
  })

  test('surfaces write preparation brief in the pre-draft brief summary', () => {
    const summary = buildNovelDraftBriefSummary({
      activeWordCount: 0,
      chapterGoal: '主角公开夺回阵图',
      conflict: '守堂执事拖延审查',
      endingHook: '内门长老认出禁库旧阵',
      sceneCardCount: 2,
      preDraftBrief: {
        write_preparation_brief: {
          version: 'oh_story_write_preparation_v1',
          readiness_status: 'needs_context',
          source_gaps: ['上一章正文或上一章承接｜状态=missing｜缺少上一章承接'],
          asset_risks: ['旧钥匙(isolated_key_asset)：旧钥匙还没有和禁门规则建立现场关系'],
          delivery_risk_actions: ['前 300 字先接住上一章门外黑影压迫'],
          blueprint_focus: ['开篇钩子：警钟第三响压入筵席'],
          reader_payoff_focus: ['读者回报：失势皇子第一次当众夺回主动权'],
          must_confirm: ['补上旧钥匙的现场功能和代价。'],
        },
        confirmed_at: '2026-06-10T11:00:00.000Z',
      },
    })

    expect(summary.briefFields.writePreparationStatus).toBe('needs_context')
    expect(summary.briefFields.writePreparationSourceGaps).toContain('上一章正文')
    expect(summary.briefFields.writePreparationAssetRisks).toContain('旧钥匙')
    expect(summary.briefFields.writePreparationDeliveryActions).toContain('前 300 字')
    expect(summary.briefFields.writePreparationMustConfirm).toContain('补上旧钥匙')
    expect(summary.briefFields.writePreparationBlueprintFocus).toContain('开篇钩子')
    expect(summary.briefFields.writePreparationReaderPayoff).toContain('读者回报')
  })
})
