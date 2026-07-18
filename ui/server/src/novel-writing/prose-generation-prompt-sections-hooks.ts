import {
  asArray,
  joinList,
  compactPromptText,
  uniquePromptStrings,
  compactProseCraftItems,
  formatProseCraftPromptSnippet,
  formatQualityAuditPhaseChecklist,
  formatDialogueExecutionChecklist,
  OH_STORY_PROSE_CRAFT_REQUIRED_FIELDS,
} from './prose-generation-prompt-sections-shared'

export function buildEmotionalArcPromptSection(emotionalArcContract: any) {
  return [
    emotionalArcContract ? '【情绪弧合同】' : '',
    emotionalArcContract ? '硬性要求：执行 chapter_target.emotional_arc_contract；这是来自 oh-story emotional-arc-design / plot-emotion-system 的情绪调动口径，正文必须让读者情绪经历平静 -> 调动 -> 释放 -> 爽，而不是只把事件写正确。' : '',
    emotionalArcContract ? '执行方式：先拉起压力、期待或“不该如此”，再用主角行动、信息揭示、态度转变或收获完成释放；闭环一个期待时必须同时开启下一期待，避免断期待。情绪三板斧也必须落地：羁绊铺设、情感撕裂、余韵钝痛都要有正文证据。' : '',
    emotionalArcContract ? '情绪拉扯曲线：可参考温暖 -> 残忍 -> 善意 -> 真相 -> 原谅 -> 来不及 -> 释然 -> 细节暴击，但不是所有故事都走完整曲线；按题材、章节阶段和目标读者截取有效段落。' : '',
    emotionalArcContract ? '题材情感策略：世情/爽文要快反弹和解气，情感/虐心要高羁绊密度和余韵，古言/复仇要因果报应，悬疑/推理要信息差，年代/亲情要代际冲突和温暖遗憾。' : '',
    emotionalArcContract ? '爽点倒推法：章纲先确定用什么方式让读者满足（爽点类型），再设计如何拉起期待（期待点），最后设计如何铺垫；正文呈现时按铺垫 -> 期待升高 -> 爽点释放回收。' : '',
    emotionalArcContract ? '装逼层级：日常小装逼只在大爽点间隙维持耐心；核心爽点必须切在主线目标上；偏离主线去别处装逼属于偏离爽点，必须删除或改成主线推进。' : '',
    emotionalArcContract ? '多爽点密度：不要拉长单个爽点的铺垫，而是多想几个爽点；每 800-1200 字至少交付一次信息增量、能力展示、危机反制、关系变化或小回收。' : '',
    emotionalArcContract ? '情绪模块重组：戏剧性会磨损，情绪不会磨损；同一种爽感可以重复，但不能重复同一个戏剧单元。复用套路时必须换场景、换对手、加新情绪或提高 stakes/奖励复杂度。' : '',
    emotionalArcContract ? '先入为主/第一印象：前100字必须让读者知道核心矛盾、主角处境或本章最重要的不公平/异常；先呈现的信息影响力更大，否定提前会放大否定感，信息顺序必须服务本章情绪判断。' : '',
    emotionalArcContract ? '峰终定律/结尾情绪强度：章尾情绪必须高于起点；按题材检查结尾情绪强度，虐≥8、爽≥7、治愈≥6；最后一击必须落成具体动作、对话或画面，禁止总结/反思/作者预告。' : '',
    emotionalArcContract ? '三层情绪：每个关键场景必须分清角色自己的情绪、文本传递的情绪、读者实际感受；角色在哭不等于读者要哭，角色屈辱/压迫/恐惧要转成读者的爽前蓄力、安全感、尊严感、期待感或余韵。' : '',
    emotionalArcContract ? '情绪反应结构：虐/悲壮/遗憾场景按前反应 -> 复现 -> 后反应执行；热血/逆袭场景按以小搏大执行，铺弱者之苦、强者到来、弱势方被救、士气如虹。' : '',
    emotionalArcContract ? '理念矛盾：关键场景不要只写利益争夺；把公平/权威、理想/现实、规则/人心等原则碰撞落成具体选择、代价、追求和牺牲。' : '',
    emotionalArcContract ? '递进对抗：主角与反派是角力而非碾压；每次小角力主角稍占上风，对手继续加码，最后主角王炸一锤定音。' : '',
    emotionalArcContract ? '梗四段式：以梗构建剧情必须完成发生 -> 发展 -> 转折 -> 高潮；用梗作为高潮点倒推剧情，不得从前提直接跳到高潮。' : '',
    emotionalArcContract ? '读者欲望四步公式：生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿；先让读者生出“不该如此”，再给希望/潜在解法，中段写行动和代价，最后兑现阶段回报并抛出新困境。' : '',
    emotionalArcContract?.emotion_formula ? `情绪公式：${emotionalArcContract.emotion_formula}` : '',
    emotionalArcContract?.arc_shape ? `弧线类型：${emotionalArcContract.arc_shape}` : '',
    emotionalArcContract?.scene_emotion_steps?.length ? `场景情绪步骤：${joinList(emotionalArcContract.scene_emotion_steps)}` : '',
    emotionalArcContract?.pressure_methods?.length ? `中段加压：${joinList(emotionalArcContract.pressure_methods)}` : '',
    emotionalArcContract?.payoff_types?.length ? `爽点类型：${joinList(emotionalArcContract.payoff_types)}` : '',
    emotionalArcContract?.payoff_reverse_design ? `爽点倒推法：${JSON.stringify(emotionalArcContract.payoff_reverse_design, null, 2).slice(0, 1200)}` : '',
    emotionalArcContract?.payoff_tier_rules?.length ? `装逼层级：${joinList(emotionalArcContract.payoff_tier_rules)}` : '',
    emotionalArcContract?.payoff_density_rules?.length ? `多爽点密度：${joinList(emotionalArcContract.payoff_density_rules)}` : '',
    emotionalArcContract?.emotion_module_recomposition_rules?.length ? `情绪模块重组：${joinList(emotionalArcContract.emotion_module_recomposition_rules)}` : '',
    emotionalArcContract?.payoff_escalation_rules?.length ? `爽点递增对比：${joinList(emotionalArcContract.payoff_escalation_rules)}` : '',
    emotionalArcContract?.scene_execution_rules?.length ? `场景情绪执行：${joinList(emotionalArcContract.scene_execution_rules)}` : '',
    emotionalArcContract?.expectation_rules?.length ? `期待规则：${joinList(emotionalArcContract.expectation_rules)}` : '',
    emotionalArcContract?.safety_rules?.length ? `安全规则：${joinList(emotionalArcContract.safety_rules)}` : '',
    emotionalArcContract?.bonding_setup_rules?.length ? `羁绊铺设：${joinList(emotionalArcContract.bonding_setup_rules)}` : '',
    emotionalArcContract?.emotional_tear_rules?.length ? `情感撕裂：${joinList(emotionalArcContract.emotional_tear_rules)}` : '',
    emotionalArcContract?.lingering_aftertaste_rules?.length ? `余韵钝痛：${joinList(emotionalArcContract.lingering_aftertaste_rules)}` : '',
    emotionalArcContract?.emotional_turning_rules?.length ? `情绪转向：${joinList(emotionalArcContract.emotional_turning_rules)}` : '',
    emotionalArcContract?.emotional_rhythm_curve_rules?.length ? `情绪拉扯曲线：${joinList(emotionalArcContract.emotional_rhythm_curve_rules)}` : '',
    emotionalArcContract?.genre_emotion_strategy_rules?.length ? `题材情感策略：${joinList(emotionalArcContract.genre_emotion_strategy_rules)}` : '',
    emotionalArcContract?.first_impression_rules?.length ? `先入为主/第一印象：${joinList(emotionalArcContract.first_impression_rules)}` : '',
    emotionalArcContract?.peak_end_rules?.length ? `峰终定律/结尾情绪强度：${joinList(emotionalArcContract.peak_end_rules)}` : '',
    emotionalArcContract?.emotion_layer_rules?.length ? `三层情绪：${joinList(emotionalArcContract.emotion_layer_rules)}` : '',
    emotionalArcContract?.reaction_structure_rules?.length ? `情绪反应结构：${joinList(emotionalArcContract.reaction_structure_rules)}` : '',
    emotionalArcContract?.ideological_conflict_rules?.length ? `理念矛盾：${joinList(emotionalArcContract.ideological_conflict_rules)}` : '',
    emotionalArcContract?.failure_mode_guards?.length ? `情绪失败模式防线：${joinList(emotionalArcContract.failure_mode_guards)}` : '',
    emotionalArcContract?.progressive_confrontation_rules?.length ? `递进对抗：${joinList(emotionalArcContract.progressive_confrontation_rules)}` : '',
    emotionalArcContract?.meme_plot_formula_rules?.length ? `梗四段式：${joinList(emotionalArcContract.meme_plot_formula_rules)}` : '',
    emotionalArcContract?.reader_desire_formula_rules?.length ? `读者欲望四步公式：${joinList(emotionalArcContract.reader_desire_formula_rules)}` : '',
    emotionalArcContract?.quality_checks?.length ? `质量检查：${joinList(emotionalArcContract.quality_checks)}` : '',
    emotionalArcContract ? '交稿自检必须输出 emotional_arc_checks，并用正文证据检查调动/释放、弧线类型、场景情绪执行（每个场景标注调动/复现/释放/后反应）、情绪三板斧（羁绊铺设/情感撕裂/余韵钝痛）、情绪拉扯曲线、题材情感策略、每 3-5 个小节情绪转向、先入为主/第一印象、峰终定律/结尾情绪强度、三层情绪（角色自己的情绪/文本传递的情绪/读者实际感受）、情绪反应结构（前反应/复现/后反应/以小搏大/士气如虹）、闭环期待后的下一开环、理念矛盾/理念之争/追求和牺牲、情绪模块重组（换场景/换对手/加新情绪/stakes）、爽点递增对比（影响范围、揭示深度、身份落差）、递进对抗（角力而非碾压/对手加码/最后王炸）、梗四段式（发生/发展/转折/高潮）、读者欲望四步公式（生产诉求/给予希望/努力解决/得偿所愿）、断期待禁止、下行情节安全感和情绪外化。' : '',
    emotionalArcContract ? JSON.stringify(emotionalArcContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildChapterHookPromptSection(chapterHookContract: any) {
  return [
    chapterHookContract ? '【章级钩子合同】' : '',
    chapterHookContract ? '硬性要求：执行 chapter_target.chapter_hook_contract；这是来自 oh-story hooks-chapter 的章首/章尾钩子口径，正文必须选对章首 7 式和章尾 13 式，并让钩子强度匹配章节阶段。' : '',
    chapterHookContract ? '执行方式：前 100 字必须落地开篇钩子；最后约 100 字必须落地翻页钩子；钩子要由现场动作、对话、新信息、危险、选择或反应触发，不得用作者预告或空泛总结替代。' : '',
    chapterHookContract?.opening_hook_type ? `章首钩子类型：${chapterHookContract.opening_hook_type}` : '',
    chapterHookContract?.ending_hook_type ? `章尾钩子类型：${chapterHookContract.ending_hook_type}` : '',
    chapterHookContract?.hook_strength ? `钩子强度：${chapterHookContract.hook_strength}` : '',
    chapterHookContract?.opening_hook_rules?.length ? `章首规则：${joinList(chapterHookContract.opening_hook_rules)}` : '',
    chapterHookContract?.ending_hook_rules?.length ? `章尾规则：${joinList(chapterHookContract.ending_hook_rules)}` : '',
    chapterHookContract?.forbidden_patterns?.length ? `钩子禁忌：${joinList(chapterHookContract.forbidden_patterns)}` : '',
    chapterHookContract?.quality_checks?.length ? `质量检查：${joinList(chapterHookContract.quality_checks)}` : '',
    chapterHookContract ? '交稿自检必须输出 chapter_hook_checks 和 chapter_hook_quality_checks，并用正文证据检查前100字钩子、章尾翻页钩子、强度匹配、兑现路径、假悬念/机械降神/低风险钩、同类型连用风险，以及 chapter_hook_contract.quality_checks 中要求的章首/章尾现场触发和下一章行动压力。' : '',
    chapterHookContract ? JSON.stringify(chapterHookContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildParagraphHookPromptSection(paragraphHookContract: any) {
  return [
    paragraphHookContract ? '【段落级钩子合同】' : '',
    paragraphHookContract ? '硬性要求：执行 chapter_target.paragraph_hook_contract；这是来自 oh-story hooks-paragraph 的段落级钩子口径，正文必须让每 3-5 段出现可指认的微钩子，并让段落持续产生信息、风险、情绪或关系变化。' : '',
    paragraphHookContract ? '执行方式：段落级钩子 11 种必须按场景选择；关键冲突优先使用钩子组合；对话冲突必须有五级递进；公开反打、揭露、压迫或反证场景必须写出围观者质量层级。' : '',
    paragraphHookContract?.micro_hook_types?.length ? `段落级钩子 11 种/本章优先：${joinList(paragraphHookContract.micro_hook_types)}` : '',
    paragraphHookContract?.hook_combinations?.length ? `钩子组合：${joinList(paragraphHookContract.hook_combinations)}` : '',
    paragraphHookContract?.dialogue_escalation?.length ? `对话递进：${joinList(paragraphHookContract.dialogue_escalation)}` : '',
    paragraphHookContract?.spectator_layers?.length ? `围观者质量层级：${joinList(paragraphHookContract.spectator_layers)}` : '',
    paragraphHookContract?.unfair_injury_hooks?.length ? `不公平伤害：${joinList(paragraphHookContract.unfair_injury_hooks)}` : '',
    paragraphHookContract?.forbidden_patterns?.length ? `段落钩子禁忌：${joinList(paragraphHookContract.forbidden_patterns)}` : '',
    paragraphHookContract?.quality_checks?.length ? `paragraph_hook_checks：${joinList(paragraphHookContract.quality_checks)}` : '',
    paragraphHookContract ? '交稿自检必须输出 paragraph_hook_checks，并用正文证据检查段落级钩子 11 种、钩子组合、对话情绪五级递进、围观者质量层级、不公平伤害和假悬念/低风险钩。' : '',
    paragraphHookContract ? JSON.stringify(paragraphHookContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildSuspensePromptSection(suspenseContract: any) {
  return [
    suspenseContract ? '【悬念编排合同】' : '',
    suspenseContract ? '硬性要求：执行 chapter_target.suspense_contract；这是来自 oh-story hooks-suspense 的悬念编排口径，正文必须把疑问、提示、误导、答案、期待接力和震惊反应排成可追踪链条。' : '',
    suspenseContract ? '执行方式：按四种悬念信息顺序模板选择本章结构；悬念强度5级必须匹配章节定位；前30%种、中50%养、末20%收或延迟引爆；章末必须保留至少一个未解问题或未达成期待，并让至少两条期待线继续运行。' : '',
    suspenseContract ? '信息差与预知：执行读者预知法、信息差运用和底牌前置法；让读者知道但主角不知道的倒计时持续推进，先展示底牌再安排冲突，并在信息差抹平时形成爽点爆发。' : '',
    suspenseContract ? '多线悬念：短弧2-3章、中弧5-8章、长弧整卷要至少保留两条运行；当前疑问兑现前先铺下一开环，不能让悬念线一次性清空。' : '',
    suspenseContract ? '伏笔不是谜语人：短期紧张用悬念，长期线索用伏笔；信息延迟超过3章且中间无推进时必须提前给或删掉。伏笔要自然藏进动作、物件、误判、环境回声或角色习惯，正文不要直接写“这是伏笔”。' : '',
    suspenseContract?.information_order_templates?.length ? `四种悬念信息顺序模板/本章优先：${joinList(suspenseContract.information_order_templates)}` : '',
    suspenseContract?.suspense_strength ? `悬念强度5级：${suspenseContract.suspense_strength}` : '',
    suspenseContract?.suspense_cycle?.length ? `种养收节奏：${joinList(suspenseContract.suspense_cycle)}` : '',
    suspenseContract?.trigger_layers?.length ? `触发型分层钩子：${joinList(suspenseContract.trigger_layers)}` : '',
    suspenseContract?.expectation_layers?.length ? `期待接力：${joinList(suspenseContract.expectation_layers)}` : '',
    suspenseContract?.expectation_chain ? `期待链：活跃线=${joinList(asArray(suspenseContract.expectation_chain.active_lines), '、')}；承接规则=${joinList(suspenseContract.expectation_chain.carry_rules)}；下一开环=${joinList(suspenseContract.expectation_chain.next_open_loop)}` : '',
    suspenseContract?.multi_line_suspense_rules?.length ? `多线悬念：${joinList(suspenseContract.multi_line_suspense_rules)}` : '',
    suspenseContract?.reader_preknowledge_rules?.length ? `读者预知法：${joinList(suspenseContract.reader_preknowledge_rules)}` : '',
    suspenseContract?.information_gap_rules?.length ? `信息差运用：${joinList(suspenseContract.information_gap_rules)}` : '',
    suspenseContract?.trump_card_preposition_rules?.length ? `底牌前置法：${joinList(suspenseContract.trump_card_preposition_rules)}` : '',
    suspenseContract?.foreshadowing_boundary_rules?.length ? `悬念伏笔边界：${joinList(suspenseContract.foreshadowing_boundary_rules)}` : '',
    suspenseContract?.shock_layers?.length ? `震惊分层：${joinList(suspenseContract.shock_layers)}` : '',
    suspenseContract?.forbidden_patterns?.length ? `悬念禁忌：${joinList(suspenseContract.forbidden_patterns)}` : '',
    suspenseContract?.quality_checks?.length ? `suspense_checks：${joinList(suspenseContract.quality_checks)}` : '',
    suspenseContract ? '交稿自检必须输出 suspense_checks，并用正文证据检查悬念等级、信息顺序、期待链、多线悬念、读者预知法、信息差运用、底牌前置法、种养收、悬念伏笔边界、角色反应、震惊分层、信息差兑现和麻烦不能消失。' : '',
    suspenseContract ? JSON.stringify(suspenseContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildReversalPromptSection(reversalContract: any) {
  return [
    reversalContract ? '【反转设计合同】' : '',
    reversalContract ? '硬性要求：执行 chapter_target.reversal_contract；这是来自 oh-story reversal-toolkit 的反转设计口径，正文必须让反转有类型、有铺垫、有公平误导、有自然揭示和揭示后的影响。' : '',
    reversalContract ? '执行方式：反转类型必须明确；至少3处暗示要提前落在行为、物件、证据、时间线或反常选择里；误导技巧不能欺骗读者；揭示要短而狠，揭示后必须改变局势、关系或读者情绪。' : '',
    reversalContract?.reversal_types?.length ? `反转类型：${joinList(reversalContract.reversal_types)}` : '',
    reversalContract?.setup_requirements?.length ? `铺垫要求：${joinList(reversalContract.setup_requirements)}` : '',
    reversalContract?.setup_plan?.length ? `本章铺垫/揭示计划：${joinList(reversalContract.setup_plan)}` : '',
    reversalContract?.misdirection_methods?.length ? `误导技巧：${joinList(reversalContract.misdirection_methods)}` : '',
    reversalContract?.timing_rules?.length ? `反转时机：${joinList(reversalContract.timing_rules)}` : '',
    reversalContract?.face_slap_rhythm?.length ? `打脸节奏：${joinList(reversalContract.face_slap_rhythm)}` : '',
    reversalContract?.forbidden_patterns?.length ? `反转禁忌：${joinList(reversalContract.forbidden_patterns)}` : '',
    reversalContract?.quality_checks?.length ? `reversal_checks：${joinList(reversalContract.quality_checks)}` : '',
    reversalContract ? '交稿自检必须输出 reversal_checks，并用正文证据检查3处暗示、公平误导、反转类型、揭示时机、非作弊性、情绪冲击、揭示后影响和打脸节奏。' : '',
    reversalContract ? JSON.stringify(reversalContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildShowdownPromptSection(showdownContract: any) {
  return [
    showdownContract ? '【高潮对抗合同】' : '',
    showdownContract ? '硬性要求：执行 chapter_target.showdown_contract；这是来自 oh-story style-combat-face / hooks-suspense / plot-frameworks 的爽点、装逼打脸、底牌管理、无敌文主角、三压一爆三震、战斗智斗和强敌三层破局口径，正文必须让爽点释放、未揭示底牌、主角不拖拉、三方铺压、舞台层级、传递通道、震惊分层、以弱胜强逻辑、三层破局和情绪节奏全部可见。' : '',
    showdownContract ? '执行方式：该爽就爽，底牌释放后反派必须受到对应压制；但每次只出1个底牌，不得一次性摊空所有后手，出牌后要留下2-3个未揭示底牌，并补新技能、新后手、新目标或更高门槛；无敌文主角登场不能拖拉，要用杀伐果断 + 战力前置无敌建立“主角登场就会强势解决”的期待，不一击必杀时必须给明确理由；三压一爆三震要求爆发前先写友好势力觉得主角是大佬、敌方势力两次不服并逼主角上、中立势力观望或加压，爆发后分别写友方、敌方、中立方的不同震动；装逼打脸要先铺舞台和人际/利益传递通道，再按群众层 -> 中间层 -> 核心层传递震惊，也允许核心层反向传回群众层形成闭环；打斗是一场表演，必须服务爽点；以弱胜强必须靠信息差、环境利用或心理博弈；强敌压迫时必须写出预判反制和反预判：反派出A，主角早准备B克制A，反派针对A时，主角利用A作陷阱引入预设B；节奏按急 -> 缓 -> 急释放。' : '',
    showdownContract?.payoff_release_rules?.length ? `爽点释放：${joinList(showdownContract.payoff_release_rules)}` : '',
    showdownContract?.trump_card_reserve_rules?.length ? `底牌管理：${joinList(showdownContract.trump_card_reserve_rules)}` : '',
    showdownContract?.invincible_protagonist_rules?.length ? `无敌文主角：${joinList(showdownContract.invincible_protagonist_rules)}` : '',
    showdownContract?.three_pressure_shock_rules?.length ? `三压一爆三震：${joinList(showdownContract.three_pressure_shock_rules)}` : '',
    showdownContract?.stage_chain_rules?.length ? `舞台层级：${joinList(showdownContract.stage_chain_rules)}` : '',
    showdownContract?.transmission_channel_rules?.length ? `传递通道：${joinList(showdownContract.transmission_channel_rules)}` : '',
    showdownContract?.shock_chain_rules?.length ? `震惊分层：${joinList(showdownContract.shock_chain_rules)}` : '',
    showdownContract?.combat_design_rules?.length ? `战斗/智斗设计：${joinList(showdownContract.combat_design_rules)}` : '',
    showdownContract?.weak_over_strong_rules?.length ? `以弱胜强逻辑：${joinList(showdownContract.weak_over_strong_rules)}` : '',
    showdownContract?.counterplay_layers?.length ? `三层破局：${joinList(showdownContract.counterplay_layers)}` : '',
    showdownContract?.emotion_rhythm_rules?.length ? `情绪节奏：${joinList(showdownContract.emotion_rhythm_rules)}` : '',
    showdownContract?.quality_checks?.length ? `showdown_checks：${joinList(showdownContract.quality_checks)}` : '',
    showdownContract ? '交稿自检必须输出 showdown_checks，并用正文证据检查爽点到位、底牌管理、无敌文主角不拖拉、三压一爆三震、主角不委屈、舞台够大、传递通道、震惊分层、战斗服务爽点、以弱胜强逻辑、三层破局和装逼闭环。' : '',
    showdownContract ? JSON.stringify(showdownContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildBridgeUnitPromptSection(bridgeUnitContract: any) {
  return [
    bridgeUnitContract ? '【桥段节奏合同】' : '',
    bridgeUnitContract ? '硬性要求：执行 chapter_target.bridge_unit_contract；这是来自 oh-story outline-rhythm / commercial-core-methods 的四章一桥段与连续期待口径，正文必须让桥段位置、目标推进、期待接力、高潮时长和阶段衔接全部可见。' : '',
    bridgeUnitContract ? '执行方式：先确认本章属于四章一桥段的哪一位；兑现旧期待前先挂新期待；高潮中埋钩子、尾巴给目标或连续小期待至少命中一项；连续 2 章没有目标推进时提高冲突密度，连续 2 章只爆点时补承接余波。' : '',
    bridgeUnitContract?.bridge_position ? `桥段位置：${bridgeUnitContract.bridge_position}` : '',
    bridgeUnitContract?.bridge_unit_plan?.length ? `桥段计划：${joinList(bridgeUnitContract.bridge_unit_plan)}` : '',
    bridgeUnitContract?.four_chapter_roles?.length ? `四章一桥段：${joinList(bridgeUnitContract.four_chapter_roles)}` : '',
    bridgeUnitContract?.expectation_chain_rules?.length ? `连续期待：${joinList(bridgeUnitContract.expectation_chain_rules)}` : '',
    bridgeUnitContract?.climax_duration_rules?.length ? `高潮时长：${joinList(bridgeUnitContract.climax_duration_rules)}` : '',
    bridgeUnitContract?.transition_rules?.length ? `阶段衔接：${joinList(bridgeUnitContract.transition_rules)}` : '',
    bridgeUnitContract?.fatigue_repair_rules?.length ? `疲劳修复：${joinList(bridgeUnitContract.fatigue_repair_rules)}` : '',
    bridgeUnitContract?.quality_checks?.length ? `bridge_unit_checks：${joinList(bridgeUnitContract.quality_checks)}` : '',
    bridgeUnitContract ? '交稿自检必须输出 bridge_unit_checks，并用正文证据检查四章一桥段位置、连续期待、目标推进、高潮时长、阶段衔接和疲劳修复。' : '',
    bridgeUnitContract ? JSON.stringify(bridgeUnitContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildPlotFrameworkPromptSection(plotFrameworkContract: any) {
  return [
    plotFrameworkContract ? '【剧情框架合同】' : '',
    plotFrameworkContract ? '硬性要求：执行 chapter_target.plot_framework_contract；这是来自 oh-story plot-frameworks 的题材→框架路由、单段剧情结构模板、RPG结构与奖励设计、框架与阵营手牌法、双线法与信息差、套路模板重复法和剧情流五不崩口径，正文必须按本章题材框架组织事件，而不是只堆场景。' : '',
    plotFrameworkContract ? '执行方式：先按 genre_framework_route 判断本章 core_loop；每个场景至少承担一个 selected_frameworks 中的功能。系统/升级文按任务→奖励→兑换→新任务推进；打脸/群像按主角阵营、敌人阵营、观众阵营轮流出牌；重复套路必须换场景、人物、情绪或奖励；章尾要完成收获清点并铺下一段，不能让目标、卖点、社会关系、上层地位或成长停摆。' : '',
    plotFrameworkContract?.genre_framework_route ? `题材→框架路由：题材=${plotFrameworkContract.genre_framework_route.genre_hint || '未标注'}；核心循环=${plotFrameworkContract.genre_framework_route.core_loop || '目标→阻碍→行动→反馈→新目标'}；主框架=${plotFrameworkContract.genre_framework_route.primary_framework || '核心梗与细化法'}；辅助框架=${joinList(asArray(plotFrameworkContract.genre_framework_route.auxiliary_frameworks), '、') || '故事本质与六幕结构'}；原因=${plotFrameworkContract.genre_framework_route.routing_reason || '按当前题材和章节目标选择框架。'}` : '',
    plotFrameworkContract?.selected_frameworks?.length ? `选用框架：${joinList(plotFrameworkContract.selected_frameworks)}` : '',
    plotFrameworkContract?.stage_ownership ? `阶段归属：创建=${joinList(asArray(plotFrameworkContract.stage_ownership.creation))}；大纲=${joinList(asArray(plotFrameworkContract.stage_ownership.outline))}；场景卡=${joinList(asArray(plotFrameworkContract.stage_ownership.scene_card))}；正文=${joinList(asArray(plotFrameworkContract.stage_ownership.prose))}；修订=${joinList(asArray(plotFrameworkContract.stage_ownership.revision))}` : '',
    plotFrameworkContract?.rpg_reward_loop ? `RPG奖励循环：${plotFrameworkContract.rpg_reward_loop.loop || ''}；奖励点=${joinList(asArray(plotFrameworkContract.rpg_reward_loop.reward_points))}；规则=${joinList(asArray(plotFrameworkContract.rpg_reward_loop.rules))}` : '',
    plotFrameworkContract?.faction_hand_framework ? `阵营手牌：阵营=${joinList(asArray(plotFrameworkContract.faction_hand_framework.factions), '、')}；规则=${joinList(asArray(plotFrameworkContract.faction_hand_framework.rules))}；手牌=${JSON.stringify(plotFrameworkContract.faction_hand_framework.cards || {}).slice(0, 1200)}` : '',
    plotFrameworkContract?.double_line_info_gap_rules?.length ? `双线信息差：${joinList(plotFrameworkContract.double_line_info_gap_rules)}` : '',
    plotFrameworkContract?.routine_variation_rules?.length ? `套路模板重复法：${joinList(plotFrameworkContract.routine_variation_rules)}` : '',
    plotFrameworkContract?.large_structure_rules?.length ? `大结构/单段结构：${joinList(plotFrameworkContract.large_structure_rules)}` : '',
    plotFrameworkContract?.six_act_story_rules?.length ? `六幕故事规则：${joinList(plotFrameworkContract.six_act_story_rules)}` : '',
    plotFrameworkContract?.global_no_collapse_checks?.length ? `五不崩：${joinList(plotFrameworkContract.global_no_collapse_checks)}` : '',
    plotFrameworkContract?.quality_checks?.length ? `plot_framework_checks：${joinList(plotFrameworkContract.quality_checks)}` : '',
    plotFrameworkContract ? '交稿自检必须输出 plot_framework_checks，并用正文证据检查题材→框架路由、核心循环、RPG奖励反馈、阵营手牌出牌、双线信息差、套路变体、段落闭环、章尾收获与铺垫，以及五不崩。' : '',
    plotFrameworkContract ? JSON.stringify(plotFrameworkContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildOpeningPromptSection(openingContract: any) {
  return [
    openingContract ? '【开篇设计合同】' : '',
    openingContract ? '硬性要求：执行 chapter_target.opening_contract；这是来自 oh-story opening-design 的新书开篇口径，前3章必须尽快让主角、危机/优势、爽点或期待点和三大基点进入正文。' : '',
    openingContract ? '执行方式：300 字内主角登场；1000 字内出现爽点或期待点；三大基点（人设基点、切入点基点、金手指基点）要能在前3章追踪；开头五要诀必须执行简单/不偏/快/爽/不平；背景、世界观和角色信息必须分批塞进冲突。' : '',
    openingContract?.activation_scope ? `适用范围：${openingContract.activation_scope}` : '',
    openingContract?.hook_type ? `开篇噱头类型：${openingContract.hook_type}` : '',
    openingContract?.opening_strategy ? `开篇策略：${openingContract.opening_strategy}` : '',
    openingContract?.mainline_graft ? `主线嫁接：${openingContract.mainline_graft}` : '',
    openingContract?.first_5_chapter_promise?.length ? `前5章承诺：${joinList(openingContract.first_5_chapter_promise)}` : '',
    openingContract?.threshold_ladder?.length ? `门槛阶梯：${joinList(openingContract.threshold_ladder)}` : '',
    openingContract?.required_beats?.length ? `必达指标：${joinList(openingContract.required_beats)}` : '',
    openingContract?.foundation_points?.length ? `三大基点：${joinList(openingContract.foundation_points)}` : '',
    openingContract?.opening_plan?.length ? `本章开篇计划：${joinList(openingContract.opening_plan)}` : '',
    openingContract?.five_essentials_rules?.length ? `开头五要诀：${joinList(openingContract.five_essentials_rules)}` : '',
    openingContract?.information_priority?.length ? `信息释放顺序：${joinList(openingContract.information_priority)}` : '',
    openingContract?.forbidden_patterns?.length ? `开篇禁忌：${joinList(openingContract.forbidden_patterns)}` : '',
    openingContract?.quality_checks?.length ? `opening_checks：${joinList(openingContract.quality_checks)}` : '',
    openingContract ? '交稿自检必须输出 opening_checks，并用正文证据检查300字主角登场、1000字期待点、三大基点、开头五要诀、第一章目标与卖点、禁忌开头和信息分批释放。' : '',
    openingContract ? JSON.stringify(openingContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

