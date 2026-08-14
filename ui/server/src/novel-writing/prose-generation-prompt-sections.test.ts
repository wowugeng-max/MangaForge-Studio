import { describe, expect, test } from 'bun:test'
import {
  buildChapterBlueprintPromptSection,
  buildChapterHookPromptSection,
  buildBridgeUnitPromptSection,
  buildAssetLinkagePromptSection,
  buildBenchmarkRecallPromptSection,
  buildBenchmarkRecallReceiptPromptSection,
  buildCharacterBehaviorPromptSection,
  buildCharacterRelationPromptSection,
  buildConflictStructurePromptSection,
  buildContentRubricPromptSection,
  buildContinuityHeatPromptSection,
  buildDeliveryRiskCarryOverPromptSection,
  buildDialoguePromptSection,
  buildFemaleAudiencePromptSection,
  buildGenrePositioningPromptSection,
  buildInformationFlowPromptSection,
  buildChapterLaunchGatePromptSection,
  buildCoreContractRadarPromptSection,
  buildGovernanceRecheckPromptSection,
  buildLongformBattleContextPromptSection,
  buildLongformCompassPromptSection,
  buildOpeningPromptSection,
  buildPlatformRubricPromptSection,
  buildPlotFrameworkPromptSection,
  buildPlotDynamicsPromptSection,
  buildPlotSpecialTopicsPromptSection,
  buildEmotionalArcPromptSection,
  buildParagraphHookPromptSection,
  buildProseCraftPromptSection,
  buildPunctuationTonePromptSection,
  buildQualityAuditPromptSection,
  buildReversalPromptSection,
  buildShowdownPromptSection,
  buildStoryPowerPromptSection,
  buildSuspensePromptSection,
  buildStateTrackingPromptSection,
  buildStateTrackingReceiptPromptSection,
  buildStoryLoopPromptSection,
  buildStyleBoundaryPromptSection,
  buildTargetReaderPromptSection,
  buildTitleUniquenessPromptSection,
  buildExpectationThresholdPromptSection,
  buildIntentConfirmationPromptSection,
  buildIntentConfirmationReceiptPromptSection,
  buildUpgradeRhythmPromptSection,
  buildWritePreparationPromptSection,
} from './prose-generation-prompt-sections'

describe('prose generation prompt sections', () => {
  test('builds duplicate title repair prompt lines', () => {
    const lines = buildTitleUniquenessPromptSection(
      {
        status: 'warn',
        fix: '标题与既有章节重复，需按本章核心事件改名。',
      },
      ['第1章《门外学生》'],
    )
    const prompt = lines.join('\n')

    expect(prompt).toContain('【章节标题去重】')
    expect(prompt).toContain('oh-story Step 2.1 标题预检')
    expect(prompt).toContain('第1章《门外学生》')
    expect(prompt).toContain('同步细纲标题与正文文件名')
  })

  test('builds write-preparation prompt lines with rolling rhythm receipts', () => {
    const lines = buildWritePreparationPromptSection({
      readiness_status: 'needs_context',
      source_gaps: ['文风召回来源缺失'],
      asset_risks: ['孤立资产未挂钩'],
      delivery_risk_actions: ['前300字接住上一章钩子'],
      rolling_rhythm_preflight: {
        principle: '拉期待速度 > 断期待速度',
        status: 'needs_attention',
        expectation_vacuum_risks: ['旧期待闭环后没有新问题'],
        expectation_first_aid: ['立即挂新门槛'],
        selling_point_drift_risks: ['卖点偏移'],
        repetition_boundary_risks: ['旧套路重复'],
        next_actions: ['补新信息'],
      },
      creation_contract_checklist: ['目标读者'],
      blueprint_focus: ['开篇钩子'],
      reader_payoff_focus: ['爽点回报'],
      must_confirm: ['时间线'],
      execution_order: ['先补状态'],
    })
    const prompt = lines.join('\n')

    expect(prompt).toContain('【写前准备卡】')
    expect(prompt).toContain('来源缺口：文风召回来源缺失')
    expect(prompt).toContain('上一轮待修复硬性落点')
    expect(prompt).toContain('rolling_rhythm_preflight')
    expect(prompt).toContain('write_preparation_checks')
    expect(prompt).toContain('evidence 必须引用正文可定位动作、对话或信息变化')
  })

  test('builds chapter-blueprint contract prompt lines', () => {
    const lines = buildChapterBlueprintPromptSection({
      chapterBlueprint: {
        causal_chain_contract: {
          act_functions: {
            seed: '开局埋因',
          },
          quality_checks: ['不能跳步'],
        },
        beat_sequence: [{ function_tag: '关键揭露' }],
      },
      beatDensityContract: {
        rule: '约 200 字/个情节点',
        target_word_count: 3000,
        min_beat_count: 10,
        max_beat_count: 15,
        target_beat_count: 12,
        current_beat_count: 8,
        density_gap: 4,
        execution_rules: ['爽点展开'],
      },
      smallOutlineContract: {
        steps: ['分段判断'],
        purpose_effect_rules: ['标目的'],
        detail_rules: ['关键详写'],
        locator_rules: ['快速定位'],
      },
      outlineMethodsContract: {
        method_route: ['五步大纲'],
        five_step_outline: {
          steps: ['定卖点'],
          story_lines: ['主线'],
          opening_sequence: ['处境', '危险'],
          ending_rules: ['留钩子'],
        },
        eight_node_story_structure: {
          selected_node: '转折',
          nodes: ['节点1'],
          payoff_rhythm: ['小回报'],
        },
        sweet_cycle_stages: ['期待'],
        emotion_zigzag_stages: ['压迫'],
        five_drive_checks: ['目标'],
        detail_outline_rules: ['详略'],
        similarity_guardrails: ['换冲突'],
        reverse_design_rules: ['倒推爽点'],
        quality_checks: ['防重复'],
      },
      mainlineDefinitionContract: {
        mainline_event: '找到旧账本',
        action_role: '升级服务旧账本',
        definition_rules: ['主线是一件事'],
        action_rules: ['升级是行动'],
        handoff_rules: ['章尾承接'],
        quality_checks: ['不把升级当主线'],
      },
      beatDensityFallbackRule: '默认密度规则',
    })
    const prompt = lines.join('\n')

    expect(prompt).toContain('【章节蓝图合同】')
    expect(prompt).toContain('五幕式因果链')
    expect(prompt).toContain('情节点密度：约 200 字/个情节点')
    expect(prompt).toContain('小纲四步法')
    expect(prompt).toContain('【大纲方法合同】')
    expect(prompt).toContain('【主线定义合同】')
    expect(prompt).toContain('beat_sequence.function_tag')
  })

  test('builds platform and content rubric prompt lines', () => {
    const platformPrompt = buildPlatformRubricPromptSection({
      platform: 'fanqie',
      source: 'oh-story story-review',
      label: '番茄',
      checks: ['前300字有钩子'],
      revision_priorities: ['章尾拉力'],
    }).join('\n')
    const contentPrompt = buildContentRubricPromptSection({
      source: 'oh-story story-review',
      label: '通用网文',
      checks: ['核心卖点'],
      golden_questions: ['读者为什么翻下一页？'],
      revision_priorities: ['补最小剧情循环'],
    }).join('\n')

    expect(platformPrompt).toContain('【平台审查基准】')
    expect(platformPrompt).toContain('Rubric: fanqie')
    expect(platformPrompt).toContain('平台检查项：前300字有钩子')
    expect(platformPrompt).toContain('修订优先级：章尾拉力')
    expect(contentPrompt).toContain('【通用网文质量基准】')
    expect(contentPrompt).toContain('内容基准：通用网文')
    expect(contentPrompt).toContain('黄金三问：读者为什么翻下一页？')
    expect(contentPrompt).toContain('content_rubric_checks')
  })

  test('builds target-reader and genre-positioning prompt lines', () => {
    const targetReaderPrompt = buildTargetReaderPromptSection({
      reader_profile: '爱看都市规则怪谈的爽文读者',
      reader_desires: ['快速异常', '主角反压'],
      emotional_gap_analysis: ['被规则压迫后的安全感'],
      chapter_attractions: ['公开反证'],
      genre_vitality_rules: ['题材长板'],
      platform_fit_rules: ['快节奏'],
      boundary_fit_rules: ['不跑玄幻'],
      title_blurb_alignment_rules: ['书名简介一致'],
      immersion_plasticity_rules: ['减少塑料感'],
      goldfinger_life_fit_rules: ['金手指贴合职业'],
      commercial_expression_rules: ['私人表达不超过5%'],
      validation_questions: ['我这书写给谁看'],
      correction_methods: ['删作者自嗨设定'],
      quality_checks: ['target_reader_checks'],
    }).join('\n')
    const genrePrompt = buildGenrePositioningPromptSection({
      genre_label: '都市规则怪谈',
      reader_psychology: ['看主角破局'],
      genre_formula: ['规则压迫 -> 反证破局'],
      core_hook_rules: ['核心梗每章可见'],
      goldfinger_fit_rules: ['能力贴合身份'],
      micro_innovation_rules: ['只做微创新'],
      micro_innovation_702010_rules: ['70/20/10'],
      micro_innovation_methods: ['换场景'],
      longboard_focus_rules: ['拉长板'],
      must_have_scenes: ['规则触发'],
      platform_fit_rules: ['适配平台'],
      quality_checks: ['genre_positioning_checks'],
    }).join('\n')

    expect(targetReaderPrompt).toContain('【目标读者合同】')
    expect(targetReaderPrompt).toContain('目标读者画像：爱看都市规则怪谈的爽文读者')
    expect(targetReaderPrompt).toContain('自嗨判定三问')
    expect(targetReaderPrompt).toContain('target_reader_checks')
    expect(genrePrompt).toContain('【题材定位合同】')
    expect(genrePrompt).toContain('题材标签：都市规则怪谈')
    expect(genrePrompt).toContain('70/20/10元素法则')
    expect(genrePrompt).toContain('genre_positioning_checks')
  })

  test('builds special topic, female audience, upgrade rhythm, and conflict structure prompt lines', () => {
    const plotSpecialTopicsPrompt = buildPlotSpecialTopicsPromptSection({
      matched_topics: ['金手指', '三万字卡点'],
      goldfinger_design_rules: ['循环行动机制'],
      genre_boundary_rules: ['不越界创新'],
      market_benchmark_rules: ['扫榜对标'],
      urban_high_martial_rules: ['都市高武'],
      launch_checkpoint_rules: ['倒推阶段目标'],
      faction_hand_rules: ['阵营手牌'],
      quality_checks: ['plot_special_topics_checks'],
    }).join('\n')
    const femaleAudiencePrompt = buildFemaleAudiencePromptSection({
      core_principles: ['女主主动'],
      reader_need_rules: ['安全感'],
      copy_promise_rules: ['货板一致'],
      longform_genre_rules: ['长线题材'],
      romance_axis_rules: ['事业/成长节点'],
      abuse_dosage_rules: ['虐后给反转或糖'],
      platform_fit_rules: ['女频平台对位'],
      quality_checks: ['female_audience_checks'],
    }).join('\n')
    const upgradeRhythmPrompt = buildUpgradeRhythmPromptSection({
      upgrade_gap: ['待遇差距'],
      upgrade_gain_plan: ['地位变化'],
      feedback_loop: ['即时反馈'],
      emotion_modules: ['扬眉吐气'],
      bridge_rhythm: ['桥段节奏'],
      goldfinger_conflict_balance_rules: ['刚好解决当前矛盾'],
      goldfinger_feedback_rules: ['动作反馈'],
      goldfinger_simplicity_rules: ['一眼就懂'],
      goldfinger_multi_dimension_growth_rules: ['词条与功能同步变化'],
      ranking_ladder_rules: ['榜单升级动力'],
      quality_checks: ['upgrade_rhythm_checks'],
    }).join('\n')
    const conflictStructurePrompt = buildConflictStructurePromptSection({
      conflict_ladder: ['言语压迫 -> 行动阻拦'],
      motivation_sources: ['工作职责'],
      antagonist_pressure_rules: ['压势不压人'],
      protagonist_agency_rules: ['主动破局'],
      event_value_changes: ['关系变化'],
      next_conflict_seeds: ['下一冲突种子'],
      conflict_network_layers: {
        vertical_conflict: '纵向压力',
        horizontal_conflict: '横向阵营',
        cross_conflict: '交叉利益',
        weaving_order: ['地图', '阵营', '角色'],
      },
      conflict_web: {
        active_lines: ['规则线', '人情线'],
        link_rules: ['因果关联'],
        activation_rules: ['解决一条激活另一条'],
      },
      no_exit_rules: ['死亡赌注'],
      quality_checks: ['conflict_structure_checks'],
    }).join('\n')

    expect(plotSpecialTopicsPrompt).toContain('【特殊题材操作合同】')
    expect(plotSpecialTopicsPrompt).toContain('matched_topics：金手指；三万字卡点')
    expect(plotSpecialTopicsPrompt).toContain('plot_special_topics_checks')
    expect(femaleAudiencePrompt).toContain('【女频长篇合同】')
    expect(femaleAudiencePrompt).toContain('女频核心原则：女主主动')
    expect(femaleAudiencePrompt).toContain('female_audience_checks')
    expect(upgradeRhythmPrompt).toContain('【升级节奏合同】')
    expect(upgradeRhythmPrompt).toContain('金手指简单是核心')
    expect(upgradeRhythmPrompt).toContain('upgrade_rhythm_checks')
    expect(conflictStructurePrompt).toContain('【冲突结构合同】')
    expect(conflictStructurePrompt).toContain('三层矛盾：纵向=纵向压力；横向=横向阵营；交叉=交叉利益；编织=地图 -> 阵营 -> 角色')
    expect(conflictStructurePrompt).toContain('冲突阶梯：言语压迫 -> 行动阻拦')
    expect(conflictStructurePrompt).not.toContain('定地图→定阵营→定角色')
    expect(conflictStructurePrompt).not.toContain('交稿自检必须输出 conflict_structure_checks')
    expect(conflictStructurePrompt).not.toContain('三层矛盾网必须检查纵向/横向/交叉')
  })

  test('builds story loop and emotional arc prompt lines', () => {
    const storyLoopPrompt = buildStoryLoopPromptSection({
      loop_formula: '题材 + 金手指 + 主角身份',
      core_elements: ['题材', '金手指', '主角身份'],
      loop_mode: '小循环 -> 中循环 -> 大循环',
      loop_fuel: '规则压力',
      loop_steps: ['目标', '阻碍', '行动', '反馈', '新目标'],
      map_resource_loop: ['地图资源闭环'],
      escalation_rules: ['地位环境同步'],
      map_transition_rules: ['新地图有新规则'],
      nested_loop_rules: ['小循环铺垫大循环期待'],
      quality_checks: ['story_loop_checks'],
    }).join('\n')
    const emotionalArcPrompt = buildEmotionalArcPromptSection({
      emotion_formula: '平静 -> 调动 -> 释放 -> 爽',
      arc_shape: '压迫反弹',
      scene_emotion_steps: ['调动', '释放'],
      pressure_methods: ['拉起压力'],
      payoff_types: ['危机反制'],
      payoff_reverse_design: { payoff: '公开反证', expectation: '众人质疑' },
      payoff_tier_rules: ['核心爽点切主线'],
      payoff_density_rules: ['800-1200字交付一次增量'],
      emotion_module_recomposition_rules: ['换场景'],
      payoff_escalation_rules: ['影响范围升级'],
      scene_execution_rules: ['每个场景标注调动/释放'],
      expectation_rules: ['闭环同时开启下一期待'],
      safety_rules: ['下行情节安全感'],
      bonding_setup_rules: ['羁绊铺设'],
      emotional_tear_rules: ['情感撕裂'],
      lingering_aftertaste_rules: ['余韵钝痛'],
      emotional_turning_rules: ['新证据触发转向'],
      emotional_rhythm_curve_rules: ['温暖 -> 残忍'],
      genre_emotion_strategy_rules: ['爽文快反弹'],
      first_impression_rules: ['前100字核心矛盾'],
      peak_end_rules: ['章尾情绪高于起点'],
      emotion_layer_rules: ['角色/文本/读者三层'],
      reaction_structure_rules: ['前反应 -> 复现 -> 后反应'],
      ideological_conflict_rules: ['公平/权威'],
      failure_mode_guards: ['断期待禁止'],
      progressive_confrontation_rules: ['对手继续加码'],
      meme_plot_formula_rules: ['发生 -> 发展 -> 转折 -> 高潮'],
      reader_desire_formula_rules: ['生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿'],
      quality_checks: ['emotional_arc_checks'],
    }).join('\n')

    expect(storyLoopPrompt).toContain('【故事循环合同】')
    expect(storyLoopPrompt).toContain('循环公式：题材 + 金手指 + 主角身份')
    expect(storyLoopPrompt).toContain('循环步骤：目标 -> 阻碍 -> 行动 -> 反馈 -> 新目标')
    expect(storyLoopPrompt).toContain('story_loop_checks')
    expect(emotionalArcPrompt).toContain('【情绪弧合同】')
    expect(emotionalArcPrompt).toContain('情绪公式：平静 -> 调动 -> 释放 -> 爽')
    expect(emotionalArcPrompt).toContain('爽点倒推法')
    expect(emotionalArcPrompt).toContain('emotional_arc_checks')
  })

  test('builds chapter hook, paragraph hook, suspense, and reversal prompt lines', () => {
    const chapterHookPrompt = buildChapterHookPromptSection({
      opening_hook_type: '异常开场',
      ending_hook_type: '危险逼近',
      hook_strength: '强',
      opening_hook_rules: ['前100字落地'],
      ending_hook_rules: ['章尾翻页钩子'],
      forbidden_patterns: ['作者预告'],
      quality_checks: ['chapter_hook_checks'],
    }).join('\n')
    const paragraphHookPrompt = buildParagraphHookPromptSection({
      micro_hook_types: ['信息差', '风险'],
      hook_combinations: ['信息差+压迫'],
      dialogue_escalation: ['质问', '反证'],
      spectator_layers: ['群众层', '核心层'],
      unfair_injury_hooks: ['不公平伤害'],
      forbidden_patterns: ['假悬念'],
      quality_checks: ['paragraph_hook_checks'],
    }).join('\n')
    const suspensePrompt = buildSuspensePromptSection({
      information_order_templates: ['先果后因'],
      suspense_strength: '5级',
      suspense_cycle: ['前30%种', '中50%养', '末20%收'],
      trigger_layers: ['触发线索'],
      expectation_layers: ['期待接力'],
      expectation_chain: {
        active_lines: ['规则线', '人物线'],
        carry_rules: ['兑现前先铺下一开环'],
        next_open_loop: ['下一章危险'],
      },
      multi_line_suspense_rules: ['至少两条运行'],
      reader_preknowledge_rules: ['读者预知法'],
      information_gap_rules: ['信息差运用'],
      trump_card_preposition_rules: ['底牌前置'],
      foreshadowing_boundary_rules: ['伏笔不是谜语人'],
      shock_layers: ['震惊分层'],
      forbidden_patterns: ['悬念线清空'],
      quality_checks: ['suspense_checks'],
    }).join('\n')
    const reversalPrompt = buildReversalPromptSection({
      reversal_types: ['身份反转'],
      setup_requirements: ['3处暗示'],
      setup_plan: ['物件暗示'],
      misdirection_methods: ['公平误导'],
      timing_rules: ['揭示要短而狠'],
      face_slap_rhythm: ['打脸节奏'],
      forbidden_patterns: ['欺骗读者'],
      quality_checks: ['reversal_checks'],
    }).join('\n')

    expect(chapterHookPrompt).toContain('【章级钩子合同】')
    expect(chapterHookPrompt).toContain('章首钩子类型：异常开场')
    expect(chapterHookPrompt).toContain('chapter_hook_checks')
    expect(paragraphHookPrompt).toContain('【段落级钩子合同】')
    expect(paragraphHookPrompt).toContain('段落级钩子 11 种/本章优先：信息差；风险')
    expect(paragraphHookPrompt).toContain('paragraph_hook_checks')
    expect(suspensePrompt).toContain('【悬念编排合同】')
    expect(suspensePrompt).toContain('期待链：活跃线=规则线、人物线；承接规则=兑现前先铺下一开环；下一开环=下一章危险')
    expect(suspensePrompt).toContain('suspense_checks')
    expect(reversalPrompt).toContain('【反转设计合同】')
    expect(reversalPrompt).toContain('反转类型：身份反转')
    expect(reversalPrompt).toContain('reversal_checks')
  })

  test('builds showdown, bridge unit, plot framework, and opening prompt lines', () => {
    const showdownPrompt = buildShowdownPromptSection({
      payoff_release_rules: ['爽点释放要有反派压制结果'],
      trump_card_reserve_rules: ['每次只出一个底牌'],
      invincible_protagonist_rules: ['登场不拖拉'],
      three_pressure_shock_rules: ['三压一爆三震'],
      stage_chain_rules: ['舞台层级放大'],
      transmission_channel_rules: ['利益传递通道'],
      shock_chain_rules: ['震惊分层'],
      combat_design_rules: ['打斗服务爽点'],
      weak_over_strong_rules: ['靠信息差以弱胜强'],
      counterplay_layers: ['预判反制和反预判'],
      emotion_rhythm_rules: ['急 -> 缓 -> 急'],
      quality_checks: ['showdown_checks'],
    }).join('\n')
    const bridgeUnitPrompt = buildBridgeUnitPromptSection({
      bridge_position: '四章一桥段第2章',
      bridge_unit_plan: ['兑现旧期待前挂新期待'],
      four_chapter_roles: ['铺垫', '推进'],
      expectation_chain_rules: ['期待接力'],
      climax_duration_rules: ['高潮不可过短'],
      transition_rules: ['承接余波'],
      fatigue_repair_rules: ['目标停滞时加冲突'],
      quality_checks: ['bridge_unit_checks'],
    }).join('\n')
    const plotFrameworkPrompt = buildPlotFrameworkPromptSection({
      genre_framework_route: {
        genre_hint: '系统升级',
        core_loop: '任务→奖励→兑换→新任务',
        primary_framework: 'RPG结构与奖励设计',
        auxiliary_frameworks: ['阵营手牌法'],
        routing_reason: '本章围绕升级奖励闭环。',
      },
      selected_frameworks: ['RPG奖励循环', '阵营手牌'],
      stage_ownership: {
        creation: ['题材定位'],
        outline: ['阶段目标'],
        scene_card: ['场景功能'],
        prose: ['正文兑现'],
        revision: ['回收检查'],
      },
      rpg_reward_loop: {
        loop: '任务→奖励→兑换→新任务',
        reward_points: ['新技能'],
        rules: ['奖励后接新门槛'],
      },
      faction_hand_framework: {
        factions: ['主角阵营', '敌人阵营'],
        rules: ['轮流出牌'],
        cards: { 主角阵营: ['旧账本'] },
      },
      double_line_info_gap_rules: ['双线信息差'],
      routine_variation_rules: ['换场景变体'],
      large_structure_rules: ['单段闭环'],
      six_act_story_rules: ['六幕推进'],
      global_no_collapse_checks: ['五不崩'],
      quality_checks: ['plot_framework_checks'],
    }).join('\n')
    const openingPrompt = buildOpeningPromptSection({
      activation_scope: '前3章',
      hook_type: '危机开局',
      opening_strategy: '先危机后设定',
      mainline_graft: '危机嫁接主线',
      first_5_chapter_promise: ['前5章交付第一次爽点'],
      threshold_ladder: ['低门槛', '高门槛'],
      required_beats: ['300字主角登场'],
      foundation_points: ['人设基点', '切入点基点', '金手指基点'],
      opening_plan: ['冲突中释放世界观'],
      five_essentials_rules: ['简单', '快', '爽'],
      information_priority: ['先行动后背景'],
      forbidden_patterns: ['长设定开场'],
      quality_checks: ['opening_checks'],
    }).join('\n')

    expect(showdownPrompt).toContain('【高潮对抗合同】')
    expect(showdownPrompt).toContain('爽点释放：爽点释放要有反派压制结果')
    expect(showdownPrompt).toContain('三压一爆三震：三压一爆三震')
    expect(showdownPrompt).toContain('showdown_checks')
    expect(bridgeUnitPrompt).toContain('【桥段节奏合同】')
    expect(bridgeUnitPrompt).toContain('桥段位置：四章一桥段第2章')
    expect(bridgeUnitPrompt).toContain('bridge_unit_checks')
    expect(plotFrameworkPrompt).toContain('【剧情框架合同】')
    expect(plotFrameworkPrompt).toContain('题材→框架路由：题材=系统升级')
    expect(plotFrameworkPrompt).toContain('阶段归属：创建=题材定位')
    expect(plotFrameworkPrompt).toContain('RPG奖励循环：任务→奖励→兑换→新任务')
    expect(plotFrameworkPrompt).toContain('阵营手牌：阵营=主角阵营、敌人阵营')
    expect(plotFrameworkPrompt).toContain('plot_framework_checks')
    expect(openingPrompt).toContain('【开篇设计合同】')
    expect(openingPrompt).toContain('必达指标：300字主角登场')
    expect(openingPrompt).toContain('三大基点：人设基点；切入点基点；金手指基点')
    expect(openingPrompt).toContain('opening_checks')
  })

  test('builds prose craft, punctuation tone, and quality audit prompt lines', () => {
    const proseCraftPrompt = buildProseCraftPromptSection({
      scene_anchors: ['铁门合拢的声响', '旧账本上的血指印'],
      quality_checks: ['身体细节替代情绪词', '新概念必须有锚点'],
    }).join('\n')
    const punctuationTonePrompt = buildPunctuationTonePromptSection({
      tone_punctuation_map: ['压迫用短句落点', '质问保留功能性问号'],
      scene_tone_plan: ['审问场景用逗号和短句'],
      forbidden_marks: ['不用省略号硬停顿'],
      quality_checks: ['punctuation_tone_checks'],
    }).join('\n')
    const qualityAuditPrompt = buildQualityAuditPromptSection({
      structure_checks: ['开头钩子'],
      chapter_purpose_rules: ['目的词必须明确'],
      progression_checks: ['中段推进'],
      information_checks: ['信息跟冲突走'],
      event_content_rules: ['事件内容过半'],
      longform_checks: ['最近5章有进展'],
      five_dimension_rubric: ['故事力'],
      selling_point_expression_rules: ['卖点要场景化'],
      chapter_focus: ['章尾翻页'],
      phase_checklist: [
        { phase: '写前', receipt_keys: ['write_preparation_checks', 'chapter_blueprint_checks'] },
        { phase: '写后', receipt_keys: ['quality_audit_checks'] },
      ],
      revision_strategies: ['rewrite', 'de_ai'],
      quality_checks: ['quality_audit_checks'],
    }).join('\n')

    expect(proseCraftPrompt).toContain('【正文工艺合同】')
    expect(proseCraftPrompt).toContain('chapter_target.prose_craft_contract')
    expect(proseCraftPrompt).toContain('subject_name_rhythm_rules')
    expect(proseCraftPrompt).toContain('本章工艺锚点：铁门合拢的声响；旧账本上的血指印')
    expect(proseCraftPrompt).toContain('prose_craft_checks 摘录：身体细节替代情绪词；新概念必须有锚点')
    expect(punctuationTonePrompt).toContain('【语气标点谱系合同】')
    expect(punctuationTonePrompt).toContain('语气标点谱系：压迫用短句落点；质问保留功能性问号')
    expect(punctuationTonePrompt).toContain('punctuation_tone_checks')
    expect(qualityAuditPrompt).toContain('【质量诊断合同】')
    expect(qualityAuditPrompt).toContain('事件驱动硬线')
    expect(qualityAuditPrompt).toContain('阶段质量清单：写前 -> write_preparation_checks/chapter_blueprint_checks；写后 -> quality_audit_checks')
    expect(qualityAuditPrompt).toContain('quality_audit_checks')
  })

  test('builds dialogue, plot dynamics, story power, and continuity heat prompt lines', () => {
    const dialoguePrompt = buildDialoguePromptSection({
      scene_modes: ['审问', '反证'],
      voice_anchors: ['短句冷静', '口癖明显'],
      dialogue_goals: ['逼出证词'],
      key_lines: ['你敢再说一遍？'],
      dialogue_execution_checklist: [{
        scene_no: 1,
        scene: '审问室',
        mode: '权力压迫',
        speaker_agendas: ['主角逼供', '反派拖延'],
        line_functions: ['推进剧情'],
        emotion_flow: ['冷静 -> 失控'],
        information_strategy: ['用立场包裹信息'],
        voice_differentiation: ['主角短句'],
        forbidden_patterns: ['说明书式对白'],
        receipt_keys: ['dialogue_checks'],
      }],
      mode_playbooks: ['短句压迫'],
      power_length_rules: ['掌控者短句'],
      subtext_agenda_rules: ['不直说目的'],
      tone_context_rules: ['场合约束语气'],
      emotion_push_rules: ['每轮推情绪'],
      emotion_continuity_rules: ['情绪连续'],
      dialogue_drive_rules: ['对白推动剧情'],
      information_embed_rules: ['信息嵌入立场'],
      information_tension_rules: ['信息拉扯'],
      voice_differentiation_rules: ['遮名可辨'],
      spectator_dialogue_rules: ['群众反应分层'],
      supporting_speaker_limit_rules: ['配角台词不超过3人'],
      dialogue_rhythm_rules: ['留呼吸感'],
      dialogue_volume_rules: ['压缩长解释'],
      dialogue_meme_rules: ['梗式对白'],
      dialogue_audit_rules: ['对白质量审计'],
      quality_checks: ['dialogue_checks'],
    }).join('\n')
    const plotDynamicsPrompt = buildPlotDynamicsPromptSection({
      plot_loop: ['目标', '阻碍', '行动', '反馈', '新期待'],
      climax_formula: ['蓄能', '假胜', '崩解'],
      ab_outline: ['A线推进', 'B线反压'],
      drive_mode_rules: ['事件驱动'],
      line_stagger_rules: ['多线错峰'],
      quality_checks: ['plot_dynamics_checks'],
    }).join('\n')
    const storyPowerPrompt = buildStoryPowerPromptSection({
      story_power_dimensions: ['目标', '阻碍', '行动'],
      chapter_power_loop: ['开场异常 -> 章末变化'],
      action_rules: ['有动作才是故事'],
      beginning_end_rules: ['有始有终'],
      causal_feedback_rules: ['上一场结果成为下一场原因'],
      quality_checks: ['story_power_checks'],
    }).join('\n')
    const continuityHeatPrompt = buildContinuityHeatPromptSection({
      heat_states: ['hot', 'warm', 'cold', 'archived'],
      active_expectations: ['旧账本真相'],
      watch_items: ['失踪配角'],
      dormant_allowed: ['远线伏笔合理休眠'],
      quality_checks: ['continuity_heat_checks'],
    }).join('\n')

    expect(dialoguePrompt).toContain('【对话质量合同】')
    expect(dialoguePrompt).toContain('对话执行清单：场景1 审问室｜mode=权力压迫')
    expect(dialoguePrompt).toContain('speaker_agendas=主角逼供/反派拖延')
    expect(dialoguePrompt).toContain('dialogue_checks')
    expect(plotDynamicsPrompt).toContain('【剧情动力合同】')
    expect(plotDynamicsPrompt).toContain('剧情循环：目标；阻碍；行动；反馈；新期待')
    expect(plotDynamicsPrompt).toContain('高潮公式：蓄能 → 假胜 → 崩解')
    expect(plotDynamicsPrompt).toContain('plot_dynamics_checks')
    expect(storyPowerPrompt).toContain('【故事力合同】')
    expect(storyPowerPrompt).toContain('故事五维：目标；阻碍；行动')
    expect(storyPowerPrompt).toContain('story_power_checks')
    expect(continuityHeatPrompt).toContain('【连续性热度合同】')
    expect(continuityHeatPrompt).toContain('热度状态：hot；warm；cold；archived')
    expect(continuityHeatPrompt).toContain('continuity_heat_checks')
  })

  test('builds character, asset, state, and intent prompt lines', () => {
    const characterRelationPrompt = buildCharacterRelationPromptSection({
      relationship_types: ['师徒', '临时同盟'],
      important_relationships: ['江辰/沈岚'],
      independent_goals: ['江辰要保住诊所'],
      goal_ownership_rules: ['主角目标属于自己'],
      relationship_life_rules: ['角色不止恋爱'],
      expectation_hub_rules: ['配角承载短期和长期期待'],
      buffer_zone_rules: ['保留信任差距'],
      tests_or_pressure: ['旧账本试探'],
      attitude_shifts: ['质疑 -> 协助'],
      quality_checks: ['character_relation_checks'],
    }).join('\n')
    const characterBehaviorPrompt = buildCharacterBehaviorPromptSection({
      motivation_chain: ['父亲旧案 -> 诊所危机'],
      motivation_specificity_rules: ['动机必须具体'],
      layered_tags: ['医生/冷静/护短'],
      behavior_rules: ['展示优于告知'],
      protagonist_composure_rules: ['低级挑衅用短句反锁'],
      strong_association_rules: ['强关联设定影响剧情'],
      memory_anchors: ['旧听诊器'],
      supporting_role_functions: ['证人推动反证'],
      role_card_requirements: ['核心目标'],
      supporting_role_exit_rules: ['带来更大好处'],
      behavior_repeat_rules: ['重复护短行为'],
      character_driven_event_rules: ['从动机推出事件'],
      protagonist_red_line_rules: ['不得圣母'],
      identity_goldfinger_alignment_rules: ['能力贴合医生身份'],
      antagonist_logic: ['反派有自洽利益'],
      antagonist_weight_rules: ['真实威胁'],
      antagonist_self_story_rules: ['反派也有梦想'],
      antagonist_tier_exit_rules: ['小反派干脆退场'],
      quality_checks: ['character_behavior_checks'],
    }).join('\n')
    const assetLinkagePrompt = buildAssetLinkagePromptSection(
      {
        key_assets: ['旧账本'],
        linkage_plan: ['绑定证据链'],
        usage_rules: ['冲突中使用'],
        state_tracking: ['账本从失踪到公开'],
        three_appearance_plan: ['出现/转折/兑现'],
        prop_ability_expectation_rules: ['8步期待模板'],
        forbidden_boundaries: ['禁揭终局秘密'],
        quality_checks: ['asset_linkage_checks'],
      },
      ['旧账本缺归属'],
    ).join('\n')
    const stateTrackingPrompt = buildStateTrackingPromptSection({
      source_readiness: [{ key: 'timeline', status: 'ready' }],
      character_states: ['沈岚仍不信任主角'],
      historical_causality: ['父亲旧案未回收'],
      world_constraints: ['诊所不能公开违规治疗'],
      filter_rules: ['只加载本章会写错的信息'],
      source_requirements: ['追踪/时间线.md'],
      quality_checks: ['state_tracking_checks'],
    }).join('\n')
    const intentConfirmationPrompt = buildIntentConfirmationPromptSection({
      confirmed_intent: '用公开反证完成第一次信任转向',
      rhythm_and_style: ['先压后扬'],
      structure_inputs: ['主线/关系线合流'],
      execution_focus: ['章尾留新证据'],
      dialogue_tone_baseline: ['冷静短句'],
      quality_checks: ['intent_confirmation_checks'],
    }).join('\n')
    const receiptPrompt = [
      ...buildStateTrackingReceiptPromptSection({ source_readiness: [{ key: 'timeline' }] }),
      ...buildIntentConfirmationReceiptPromptSection({ confirmed_intent: '公开反证' }),
    ].join('\n')

    expect(characterRelationPrompt).toContain('【角色关系合同】')
    expect(characterRelationPrompt).toContain('配角期待枢纽：配角承载短期和长期期待')
    expect(characterRelationPrompt).toContain('character_relation_checks')
    expect(characterBehaviorPrompt).toContain('【角色行为合同】')
    expect(characterBehaviorPrompt).toContain('主角逼格反应：低级挑衅用短句反锁')
    expect(characterBehaviorPrompt).toContain('反派自我叙事：反派也有梦想')
    expect(characterBehaviorPrompt).toContain('character_behavior_checks')
    expect(assetLinkagePrompt).toContain('【资产挂钩合同】')
    expect(assetLinkagePrompt).toContain('关系图风险：旧账本缺归属')
    expect(assetLinkagePrompt).toContain('asset_linkage_checks')
    expect(stateTrackingPrompt).toContain('【状态筛选合同】')
    expect(stateTrackingPrompt).toContain('来源就绪表：')
    expect(stateTrackingPrompt).toContain('source_requirements')
    expect(intentConfirmationPrompt).toContain('【意图确认合同】')
    expect(intentConfirmationPrompt).toContain('确认意图：用公开反证完成第一次信任转向')
    expect(intentConfirmationPrompt).toContain('intent_confirmation_checks')
    expect(receiptPrompt).toContain('status_filter_receipts')
    expect(receiptPrompt).toContain('source_readiness_checks')
    expect(receiptPrompt).toContain('pre_draft_execution_receipts.intent_confirmation_checks')
  })

  test('builds benchmark, style boundary, information flow, expectation, and delivery risk prompt lines', () => {
    const benchmarkPrompt = buildBenchmarkRecallPromptSection({
      selected_emotion_module: '压迫反弹',
      rhythm_reference: '蓄势三段后爆发',
      style_profile_summary: '短句推进，关键处留白',
      matched_chapter: '第12章',
      matched_chapter_techniques: ['先压后扬'],
      style_directives: ['短句落点'],
      style_profile_path: '对标/文风.md',
      module_source_path: '对标/模块.md',
      rhythm_source_path: '对标/节奏.md',
      matched_chapter_summary_path: '对标/第12章.md',
      matched_chapter_deep_dive_path: '对标/第12章深拆.md',
      fallback_deep_dive_path: '对标/黄金三章.md',
      source_paths: ['对标/文风.md', '对标/节奏.md'],
      anchor_excerpts: ['他停在门口。灯灭了。'],
      canonical_source_rules: ['只学抽象技法'],
      fallback_receipt_requirements: ['fallback_usage_receipts'],
      secondary_benchmark_recall_summary: [{ title: '副对标', method: '节奏参考' }],
      secondary_benchmark_boundary_rules: ['副对标不得覆盖主对标'],
      gaps: ['matched_deep_dive_missing'],
      authority_rules: ['本章事实优先'],
      conflict_resolution: '硬约束优先',
      quality_checks: ['benchmark_recall_checks'],
    }).join('\n')
    const styleBoundaryPrompt = buildStyleBoundaryPromptSection({
      style_override_rules: ['句长可调'],
      hard_constraints: ['禁用词不可覆盖'],
      copy_boundary_rules: ['不得复制桥段'],
      quality_checks: ['style_boundary_checks'],
    }).join('\n')
    const informationFlowPrompt = buildInformationFlowPromptSection({
      information_units: ['旧账本证明有人撒谎'],
      progression_chain: ['发现 -> 验证 -> 反转'],
      transition_rules: ['过渡交付信息'],
      transition_compression_rules: ['纯移动压缩'],
      next_objective_rules: ['提升后立刻给新目标'],
      water_risk_guards: ['删无信息寒暄'],
      quality_checks: ['information_flow_checks'],
    }).join('\n')
    const expectationPrompt = buildExpectationThresholdPromptSection({
      short_expectation: '当场反证',
      medium_expectations: ['找到账本来源'],
      long_expectations: ['揭开旧案'],
      thresholds: ['必须拿到签名'],
      dynamic_thresholds: ['反派加码'],
      nested_units: ['小目标套大目标'],
      expectation_before_payoff_rules: ['铺垫不少于释放'],
      expectation_relay_rules: ['兑现前挂新期待'],
      quality_checks: ['expectation_threshold_checks'],
    }).join('\n')
    const deliveryRiskPrompt = buildDeliveryRiskCarryOverPromptSection({
      source_chapter_no: 2,
      label: '章末追读不足',
      priority_label: 'high',
      items: ['章尾问题太弱'],
      required_actions: ['补强章尾钩子'],
      opening_actions: ['前300字承接上章'],
      middle_actions: ['中段推进证据'],
      ending_actions: ['最后300字留新问题'],
      forbidden_repeats: ['不要重复同类质问'],
    }).join('\n')
    const benchmarkReceiptPrompt = buildBenchmarkRecallReceiptPromptSection({
      selected_emotion_module: '压迫反弹',
    }).join('\n')

    expect(benchmarkPrompt).toContain('【文风召回简报】')
    expect(benchmarkPrompt).toContain('selected_emotion_module：压迫反弹')
    expect(benchmarkPrompt).toContain('原文锚点片段')
    expect(benchmarkPrompt).toContain('fallback说明：同章深度拆解缺失')
    expect(styleBoundaryPrompt).toContain('【文风覆盖边界合同】')
    expect(styleBoundaryPrompt).toContain('硬约束：禁用词不可覆盖')
    expect(styleBoundaryPrompt).toContain('style_boundary_checks')
    expect(informationFlowPrompt).toContain('【信息团与场景衔接合同】')
    expect(informationFlowPrompt).toContain('过渡压缩：纯移动压缩')
    expect(informationFlowPrompt).toContain('information_flow_checks')
    expect(expectationPrompt).toContain('【期待门槛合同】')
    expect(expectationPrompt).toContain('短期期待：当场反证')
    expect(expectationPrompt).toContain('expectation_threshold_checks')
    expect(deliveryRiskPrompt).toContain('【上一章交稿风险承接】')
    expect(deliveryRiskPrompt).toContain('风险来源：第2章')
    expect(deliveryRiskPrompt).toContain('禁用重复：不要重复同类质问')
    expect(benchmarkReceiptPrompt).toContain('benchmark_recall_checks')
    expect(benchmarkReceiptPrompt).toContain('fallback_usage_receipts')
  })

  test('builds longform, launch gate, governance, and core contract prompt lines', () => {
    const longformCompassPrompt = buildLongformCompassPromptSection({
      must_keep: ['主角核心承诺'],
      adjustable_zone: ['本章场景可调'],
    }).join('\n')
    const longformBattlePrompt = buildLongformBattleContextPromptSection({
      risk_lanes: ['连续三章回报不足'],
      repair_actions: ['本章补显性回报'],
    }).join('\n')
    const launchGatePrompt = buildChapterLaunchGatePromptSection({
      status: 'warn',
      reader_promise: '公开反证',
      blocked_items: ['章末钩子弱'],
    }).join('\n')
    const governancePrompt = buildGovernanceRecheckPromptSection({
      source_run_id: 42,
      summary: '对白已修，章尾仍需观察',
      evidence: ['主角用短句反锁'],
      failed_evidence: ['章尾问题不够尖'],
      watch_items: ['章末追读'],
    }).join('\n')
    const coreContractPrompt = buildCoreContractRadarPromptSection({
      must_serve: ['核心承诺', '读者回报'],
      no_drift: ['不得改主线'],
      theme_unity_rules: ['小情绪服从大情绪'],
      selling_point_execution_rules: ['发现比告知爽十倍'],
      repetition_strategy_rules: ['重复但换场景'],
      commercial_rhythm_rules: ['节奏自检'],
      goldfinger_structure_rules: ['金手指校准'],
      launch_pressure_rules: ['开篇压力'],
      repair_focus: ['章末问题'],
    }).join('\n')

    expect(longformCompassPrompt).toContain('【长篇作品罗盘】')
    expect(longformCompassPrompt).toContain('不可漂移项必须遵守')
    expect(longformCompassPrompt).toContain('主角核心承诺')
    expect(longformBattlePrompt).toContain('【长篇作战承接】')
    expect(longformBattlePrompt).toContain('risk_lanes 是本章必须修复或承接的长篇生产风险')
    expect(launchGatePrompt).toContain('【本章开写门禁】')
    expect(launchGatePrompt).toContain('不得把门禁中的 warn/block 项绕过去写')
    expect(governancePrompt).toContain('【治理复查承接】')
    expect(governancePrompt).toContain('来源审计：#42')
    expect(governancePrompt).toContain('仍需观察：章末追读')
    expect(coreContractPrompt).toContain('【核心契约】')
    expect(coreContractPrompt).toContain('必须服务：核心承诺；读者回报')
    expect(coreContractPrompt).toContain('不得漂移：不得改主线')
    expect(coreContractPrompt).toContain('卖点四步法：发现比告知爽十倍')
  })
})
