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
    expect(summary.briefFields.chapterBenchmarkKeys).toContain('权谋反压基准')
    expect(summary.briefFields.chapterBenchmarkUsage).toContain('冲突节拍')
    expect(summary.briefFields.chapterBenchmarkForbidden).toContain('不得复制样例桥段')
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
})
