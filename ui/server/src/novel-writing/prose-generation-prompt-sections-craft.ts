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

export function buildProseCraftPromptSection(proseCraftContract: any) {
  return [
    proseCraftContract ? '【正文工艺合同】' : '',
    ...(proseCraftContract ? formatProseCraftPromptSnippet(proseCraftContract) : []),
    '',
  ]
}

export function buildPunctuationTonePromptSection(punctuationToneContract: any) {
  return [
    punctuationToneContract ? '【语气标点谱系合同】' : '',
    punctuationToneContract ? '硬性要求：执行 chapter_target.punctuation_tone_contract；这是来自 oh-story writing-craft/format-and-structure 的语气标点谱系，标点服务语气、人物声线和情绪节奏，不能通篇句号化，也不能随机堆砌问号/感叹号。' : '',
    punctuationToneContract ? '执行方式：先判断每句功能，再选择句号、逗号、问号、少量感叹号、冒号、换行或动作 beat；犹豫、未尽、打断和拖长不得使用省略号或破折号。' : '',
    punctuationToneContract?.tone_punctuation_map?.length ? `语气标点谱系：${joinList(punctuationToneContract.tone_punctuation_map)}` : '',
    punctuationToneContract?.scene_tone_plan?.length ? `本章场景标点计划：${joinList(punctuationToneContract.scene_tone_plan)}` : '',
    punctuationToneContract?.forbidden_marks?.length ? `禁用/慎用标点：${joinList(punctuationToneContract.forbidden_marks)}` : '',
    punctuationToneContract?.quality_checks?.length ? `punctuation_tone_checks：${joinList(punctuationToneContract.quality_checks)}` : '',
    punctuationToneContract ? '交稿自检必须输出 punctuation_tone_checks，并用正文证据检查通篇句号化、随机标点堆砌、省略号/破折号硬停顿、质问/爆发/迟疑标点是否匹配人物声线。' : '',
    punctuationToneContract ? JSON.stringify(punctuationToneContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildQualityAuditPromptSection(qualityAuditContract: any) {
  return [
    qualityAuditContract ? '【质量诊断合同】' : '',
    qualityAuditContract ? '硬性要求：执行 chapter_target.quality_audit_contract；这是来自 oh-story quality-checklist / commercial-core-methods 的写前目的锁定与写后诊断口径，正文必须经得起章节结构、章纲目的词、推进、水文、信息传递、长篇连续性和五维评分检查。' : '',
    qualityAuditContract ? '执行方式：写正文前先用一句话锁定本章内容和目的词（铺垫/高潮/爽点/打脸/人物塑造/设定）；写正文时让每个场景有目标、阻碍和变化，并按目的词分配详略；交稿自检必须按五维评分标准定位最低分维度，再选择 rewrite/compress/de_ai/polish 之一作为修订策略。' : '',
    qualityAuditContract ? '事件驱动硬线：正文章节必须由事件组成，事件内容比重不能小于一半；事件是价值改变的契机；设定尽量通过事件演绎，而非旁白强塞。' : '',
    qualityAuditContract?.structure_checks?.length ? `章节结构检查：${joinList(qualityAuditContract.structure_checks)}` : '',
    qualityAuditContract?.chapter_purpose_rules?.length ? `章纲目的词：${joinList(qualityAuditContract.chapter_purpose_rules)}` : '',
    qualityAuditContract?.progression_checks?.length ? `章节推进/水文检测：${joinList(qualityAuditContract.progression_checks)}` : '',
    qualityAuditContract?.information_checks?.length ? `信息传递检查：${joinList(qualityAuditContract.information_checks)}` : '',
    qualityAuditContract?.event_content_rules?.length ? `事件内容比重：${joinList(qualityAuditContract.event_content_rules)}` : '',
    qualityAuditContract?.longform_checks?.length ? `长篇专项检查：${joinList(qualityAuditContract.longform_checks)}` : '',
    qualityAuditContract?.five_dimension_rubric?.length ? `五维评分标准：${joinList(qualityAuditContract.five_dimension_rubric)}` : '',
    qualityAuditContract?.selling_point_expression_rules?.length ? `卖点表达：${joinList(qualityAuditContract.selling_point_expression_rules)}` : '',
    qualityAuditContract?.chapter_focus?.length ? `本章诊断重点：${joinList(qualityAuditContract.chapter_focus)}` : '',
    qualityAuditContract?.phase_checklist?.length ? `阶段质量清单：${formatQualityAuditPhaseChecklist(qualityAuditContract.phase_checklist)}` : '',
    qualityAuditContract?.revision_strategies?.length ? `精修策略：${joinList(qualityAuditContract.revision_strategies)}` : '',
    qualityAuditContract?.quality_checks?.length ? `quality_audit_checks：${joinList(qualityAuditContract.quality_checks)}` : '',
    qualityAuditContract ? '交稿自检必须输出 quality_audit_checks，并用正文证据检查开头钩子、中段推进、局势变化、章尾翻页、章纲目的词、水文检测、信息跟冲突走、最近5章进展、五维评分和精修策略。' : '',
    qualityAuditContract ? JSON.stringify(qualityAuditContract, null, 2).slice(0, 3000) : '',
    '',
  ]
}

export function buildDialoguePromptSection(dialogueContract: any) {
  return [
    dialogueContract ? '【对话质量合同】' : '',
    dialogueContract ? '硬性要求：执行 chapter_target.dialogue_contract；这是来自 oh-story dialogue-mastery 的对白设计口径，写对白时必须让每句承担推进剧情、增加期待或展示人设，并落实角色议程、潜台词和声线差异。' : '',
    dialogueContract ? '执行方式：对话长度 = 权力地位；掌控者短句冷静，被动者话多且情绪化；信息展示必须用角色语气和立场包裹，不得写说明书式对话。' : '',
    dialogueContract?.scene_modes?.length ? `对话模式：${joinList(dialogueContract.scene_modes)}` : '',
    dialogueContract?.voice_anchors?.length ? `声线锚点：${joinList(dialogueContract.voice_anchors)}` : '',
    dialogueContract?.dialogue_goals?.length ? `对白目标：${joinList(dialogueContract.dialogue_goals)}` : '',
    dialogueContract?.key_lines?.length ? `关键台词：${joinList(dialogueContract.key_lines)}` : '',
    dialogueContract?.dialogue_execution_checklist?.length ? `对话执行清单：${formatDialogueExecutionChecklist(dialogueContract.dialogue_execution_checklist)}` : '',
    dialogueContract?.mode_playbooks?.length ? `对白模式剧本：${joinList(dialogueContract.mode_playbooks)}` : '',
    dialogueContract?.power_length_rules?.length ? `权力长度规则：${joinList(dialogueContract.power_length_rules)}` : '',
    dialogueContract?.subtext_agenda_rules?.length ? `潜台词与议程：${joinList(dialogueContract.subtext_agenda_rules)}` : '',
    dialogueContract?.tone_context_rules?.length ? `语气场合规则：${joinList(dialogueContract.tone_context_rules)}` : '',
    dialogueContract?.emotion_push_rules?.length ? `情绪推动规则：${joinList(dialogueContract.emotion_push_rules)}` : '',
    dialogueContract?.emotion_continuity_rules?.length ? `情绪连续规则：${joinList(dialogueContract.emotion_continuity_rules)}` : '',
    dialogueContract?.dialogue_drive_rules?.length ? `对话驱动力规则：${joinList(dialogueContract.dialogue_drive_rules)}` : '',
    dialogueContract?.information_embed_rules?.length ? `信息嵌入规则：${joinList(dialogueContract.information_embed_rules)}` : '',
    dialogueContract?.information_tension_rules?.length ? `信息拉扯规则：${joinList(dialogueContract.information_tension_rules)}` : '',
    dialogueContract?.voice_differentiation_rules?.length ? `人物语言差异化：${joinList(dialogueContract.voice_differentiation_rules)}` : '',
    dialogueContract?.spectator_dialogue_rules?.length ? `弹幕/群众对话：${joinList(dialogueContract.spectator_dialogue_rules)}` : '',
    dialogueContract?.supporting_speaker_limit_rules?.length ? `配角台词人数：${joinList(dialogueContract.supporting_speaker_limit_rules)}` : '',
    dialogueContract?.dialogue_rhythm_rules?.length ? `对话节奏/呼吸感：${joinList(dialogueContract.dialogue_rhythm_rules)}` : '',
    dialogueContract?.dialogue_volume_rules?.length ? `对话篇幅控制：${joinList(dialogueContract.dialogue_volume_rules)}` : '',
    dialogueContract?.dialogue_meme_rules?.length ? `梗式对白：${joinList(dialogueContract.dialogue_meme_rules)}` : '',
    dialogueContract?.dialogue_audit_rules?.length ? `对话质量审计：${joinList(dialogueContract.dialogue_audit_rules)}` : '',
    dialogueContract?.quality_checks?.length ? `质量检查：${joinList(dialogueContract.quality_checks)}` : '',
    dialogueContract ? '交稿自检必须输出 dialogue_checks，并用正文证据检查潜台词、议程、声线差异、信息嵌入、权力博弈和对话质量审计；如果存在 dialogue_execution_checklist，必须按对话执行清单逐场覆盖 dialogue_checks，检查每场 mode、speaker_agendas、line_functions、emotion_flow、information_strategy、voice_differentiation 和 forbidden_patterns 是否落成正文证据。' : '',
    dialogueContract ? JSON.stringify(dialogueContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildPlotDynamicsPromptSection(plotDynamicsContract: any) {
  return [
    plotDynamicsContract ? '【剧情动力合同】' : '',
    plotDynamicsContract ? '硬性要求：执行 chapter_target.plot_dynamics_contract；这是来自 oh-story plot-core-methods 的剧情推进口径，正文必须形成目标、阻碍、行动、代价/反馈、新期待的最小循环。' : '',
    plotDynamicsContract ? '高潮执行方式：蓄能 → 假胜 → 崩解 → 交叉死磕 → 悬置收尾；必须先给希望再击碎，让反转有情绪落差。' : '',
    plotDynamicsContract ? '驱动方式：番茄爽文/打脸文按事件驱动，每章给一个外部结果（赢、升级、对手栽）；追妻/虐心/世情按情感驱动，人物心结必须持续悬着；混合模式主线用事件往前推，每 3-5 章插情感停顿。' : '',
    plotDynamicsContract?.plot_loop?.length ? `剧情循环：${joinList(plotDynamicsContract.plot_loop)}` : '',
    plotDynamicsContract?.climax_formula?.length ? `高潮公式：${joinList(plotDynamicsContract.climax_formula, ' → ')}` : '',
    plotDynamicsContract?.ab_outline?.length ? `A/B节奏：${joinList(plotDynamicsContract.ab_outline)}` : '',
    plotDynamicsContract?.drive_mode_rules?.length ? `驱动方式：${joinList(plotDynamicsContract.drive_mode_rules)}` : '',
    plotDynamicsContract?.line_stagger_rules?.length ? `多线错峰：${joinList(plotDynamicsContract.line_stagger_rules)}` : '',
    plotDynamicsContract?.quality_checks?.length ? `质量检查：${joinList(plotDynamicsContract.quality_checks)}` : '',
    plotDynamicsContract ? '交稿自检必须输出 plot_dynamics_checks，并用正文证据检查最小剧情循环、假胜崩解、代价反馈、A/B情绪交替、驱动方式、多线错峰和悬置收尾。' : '',
    plotDynamicsContract ? JSON.stringify(plotDynamicsContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildStoryPowerPromptSection(storyPowerContract: any) {
  return [
    storyPowerContract ? '【故事力合同】' : '',
    storyPowerContract ? '硬性要求：执行 chapter_target.story_power_contract；这是来自 oh-story plot-core-methods 的故事力门禁，正文必须同时具备故事五维、有动作才是故事、有始有终和因果反馈。' : '',
    storyPowerContract ? '执行方式：每个关键场景必须让角色用行动改变局势；开场目标或异常必须在章末形成状态变化；上一场结果必须成为下一场原因，不能只并列摆放事件。' : '',
    storyPowerContract?.story_power_dimensions?.length ? `故事五维：${joinList(storyPowerContract.story_power_dimensions)}` : '',
    storyPowerContract?.chapter_power_loop?.length ? `本章故事力循环：${joinList(storyPowerContract.chapter_power_loop)}` : '',
    storyPowerContract?.action_rules?.length ? `有动作才是故事：${joinList(storyPowerContract.action_rules)}` : '',
    storyPowerContract?.beginning_end_rules?.length ? `有始有终：${joinList(storyPowerContract.beginning_end_rules)}` : '',
    storyPowerContract?.causal_feedback_rules?.length ? `因果反馈：${joinList(storyPowerContract.causal_feedback_rules)}` : '',
    storyPowerContract?.quality_checks?.length ? `质量检查：${joinList(storyPowerContract.quality_checks)}` : '',
    storyPowerContract ? '交稿自检必须输出 story_power_checks，并用正文证据检查故事五维、行动改变局势、开场到章末状态变化、因果反馈和场景之间的结果接结果。' : '',
    storyPowerContract ? JSON.stringify(storyPowerContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildContinuityHeatPromptSection(continuityHeatContract: any) {
  return [
    continuityHeatContract ? '【连续性热度合同】' : '',
    continuityHeatContract ? '硬性要求：执行 chapter_target.continuity_heat_contract；这是来自 oh-story plot-core-methods 的连续性追踪口径，正文必须管理 hot/warm/cold/archived 元素，避免重要角色、伏笔、支线和关系线断温或突然回收。' : '',
    continuityHeatContract ? '有效触达标准：必须推进事件、施加压力、改变关系、造成真实后果或解释合理休眠；只提名字、空回忆和随机 callback 不算触达。' : '',
    continuityHeatContract?.heat_states?.length ? `热度状态：${joinList(continuityHeatContract.heat_states)}` : '',
    continuityHeatContract?.active_expectations?.length ? `当前 hot/warm 期待：${joinList(continuityHeatContract.active_expectations)}` : '',
    continuityHeatContract?.watch_items?.length ? `需要追踪：${joinList(continuityHeatContract.watch_items)}` : '',
    continuityHeatContract?.dormant_allowed?.length ? `允许休眠：${joinList(continuityHeatContract.dormant_allowed)}` : '',
    continuityHeatContract?.quality_checks?.length ? `质量检查：${joinList(continuityHeatContract.quality_checks)}` : '',
    continuityHeatContract ? '交稿自检必须输出 continuity_heat_checks，并用正文证据检查 hot 元素推进、warm 元素保温、cold 元素升温、archived 元素不误激活和合理休眠说明。' : '',
    continuityHeatContract ? JSON.stringify(continuityHeatContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildCharacterRelationPromptSection(characterRelationContract: any) {
  return [
    characterRelationContract ? '【角色关系合同】' : '',
    characterRelationContract ? '硬性要求：执行 chapter_target.character_relation_contract；这是来自 oh-story character-relations / character-design-methods 的关系线口径，正文必须让重要关系有类型、功能、考验、态度变化、主角独立目标、恋爱之外的行动线和配角期待枢纽。' : '',
    characterRelationContract ? '执行方式：关系类型明确；主角不能只是帮别人实现目标；角色不止恋爱，不能只是单薄的情感工具人；配角不能站桩等触发；配角期待枢纽/人物扣必须把一个关键配角写成任务基地，同时承载短期和长期期待，并在主角解决事件后开启新一轮装逼、新任务或新剧情；关系变化必须写成选择、行动、代价、误解、作证、背叛、牺牲、保护、压迫或态度转向。' : '',
    characterRelationContract ? '目标归属：主角目标必须属于自己的，关系线可以互助，但主角必须保留自己的诉求、主动选择和代价，不能只是在帮别人实现目标。' : '',
    characterRelationContract ? '角色不止恋爱：角色生命中必须有恋爱之外的内容，重要关系可以提供情绪价值，但角色还要保留事业、责任、资源、身份、家族、风险或行动线。' : '',
    characterRelationContract ? '配角期待枢纽：选一个配角做任务基地，一个人物同时承载多个短期和长期期待；主角每次解决事件装完逼后回到该人物处开始新一轮装逼；人物下线时必须带来更大好处，用歪打误撞收获更多转化损失厌恶。' : '',
    characterRelationContract ? '配角攻略缓冲区：配角不能像 NPC 一样站着等主角触发；必须保留信息差、地位差距、亲密度差距或信任程度，并在关键拐点写出配角从旁观/质疑/拒绝/试探到行动/协助/设限的态度变化。' : '',
    characterRelationContract?.relationship_types?.length ? `关系类型：${joinList(characterRelationContract.relationship_types)}` : '',
    characterRelationContract?.important_relationships?.length ? `重要关系：${joinList(characterRelationContract.important_relationships)}` : '',
    characterRelationContract?.independent_goals?.length ? `独立目标：${joinList(characterRelationContract.independent_goals)}` : '',
    characterRelationContract?.goal_ownership_rules?.length ? `目标归属：${joinList(characterRelationContract.goal_ownership_rules)}` : '',
    characterRelationContract?.relationship_life_rules?.length ? `角色不止恋爱：${joinList(characterRelationContract.relationship_life_rules)}` : '',
    characterRelationContract?.expectation_hub_rules?.length ? `配角期待枢纽：${joinList(characterRelationContract.expectation_hub_rules)}` : '',
    characterRelationContract?.buffer_zone_rules?.length ? `配角攻略缓冲区：${joinList(characterRelationContract.buffer_zone_rules)}` : '',
    characterRelationContract?.tests_or_pressure?.length ? `考验/压力：${joinList(characterRelationContract.tests_or_pressure)}` : '',
    characterRelationContract?.attitude_shifts?.length ? `态度变化：${joinList(characterRelationContract.attitude_shifts)}` : '',
    characterRelationContract?.quality_checks?.length ? `质量检查：${joinList(characterRelationContract.quality_checks)}` : '',
    characterRelationContract ? '交稿自检必须输出 character_relation_checks，并用正文证据检查关系类型、关系弧线、主角目标独立性、目标归属、角色不止恋爱、配角期待枢纽、配角攻略缓冲区、配角主动行动、态度变化和阶段匹配。' : '',
    characterRelationContract ? JSON.stringify(characterRelationContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildCharacterBehaviorPromptSection(characterBehaviorContract: any) {
  return [
    characterBehaviorContract ? '【角色行为合同】' : '',
    characterBehaviorContract ? '硬性要求：执行 chapter_target.character_behavior_contract；这是来自 oh-story character-basics / character-design-methods 的角色行为口径，正文必须让角色行为由动机链驱动，并用行动、对话和反应展示人设。' : '',
    characterBehaviorContract ? '动机具体性：起因必须具体，不能写成“被欺负/被针对”这种模糊说法；动机必须是情感层面的，不能只写“要成为最强/想变强”；动机演变必须有触发事件或代价铺垫。' : '',
    characterBehaviorContract ? '执行方式：主角行为三必须（可理解、可共鸣、可接受）；三层标签反差（身份标签、表现标签、内核标签）必须落到行为对比；展示优于告知；每个有台词配角必须有功能；反派不能降智送赢。' : '',
    characterBehaviorContract ? '主角逼格反应：升级线与主角反应线分开管理；升级只提升实力/能力，不自动改变主角从容反应。面对低级挑衅时，主角不能被牵着走，必须用轻描淡写、短句反锁、行动压制或旁观者反应放大爽点，禁止暴怒、面红耳赤、歇斯底里式反击。' : '',
    characterBehaviorContract ? '人设强关联：每个重要角色至少 3 个强关联设定，直接影响剧情走向、核心梗装逼爽点或人物碰撞；外貌、爱好、身高体重只能做弱关联记忆点，不能喧宾夺主。' : '',
    characterBehaviorContract ? '角色卡必备项：主角卡必须覆盖角色定位、身份标签、外貌特征、核心目标、核心动机、致命弱点、口头禅/标志动作；核心动机要是情感驱动，弱点必须能造成选择压力或犯错。' : '',
    characterBehaviorContract ? '配角退场规划：配角卡必须覆盖角色功能、与主角关系、核心特质、标志性特征、退场方式；同一场景配角不超过 3 个有台词，无功能角色合并为旁观反应、动作或叙事概括。' : '',
    characterBehaviorContract ? '行为重复点：抓住一个读者喜欢的人物行为特质，在不同场景重复；行为、语言、思维必须围绕人设展开，为了剧情需要违背人设时先改剧情。' : '',
    characterBehaviorContract ? '人推事件：情节要从人物性格、动机和选择自然推出；卡文时从人物动机找方向，不要让外部事件硬砸或作者硬编剧情。' : '',
    characterBehaviorContract ? '主角红线：不得写圣母型主角、无脑战斗机器、内核邪恶、因蠢/圣母犯错、自暴自弃；压势不压人，不能让读者看不起主角。' : '',
    characterBehaviorContract ? '身份/金手指对齐：社会身份、身世、金手指、性格必须与世界基调统一；显性金手指贴合职业/身份/生活困境，隐性金手指落在性格优势。' : '',
    characterBehaviorContract ? '反派分量：执行反派建立四要素（实力展示、动机可信、真实威胁、终极意图时机）；反派弱则主角赢没意义，真实目的不要开场说尽，反派长处要照出主角弱点。' : '',
    characterBehaviorContract ? '反派自我叙事：执行“反派也有梦想”，在反派眼中他是自己故事的主人公；补旧痛/创伤、让人恨不起来的侧面和理念冲突，优势本身也要成为致命缺陷。' : '',
    characterBehaviorContract ? '反派层级：按反派层级表匹配篇幅、功能和退场；小反派干脆利落，中等反派正面击败有爽感，大弧 Boss 有仪式感终战，最终 Boss 必须从第一章就有伏笔。' : '',
    characterBehaviorContract?.motivation_chain?.length ? `动机链：${joinList(characterBehaviorContract.motivation_chain)}` : '',
    characterBehaviorContract?.motivation_specificity_rules?.length ? `动机具体性：${joinList(characterBehaviorContract.motivation_specificity_rules)}` : '',
    characterBehaviorContract?.layered_tags?.length ? `三层标签反差：${joinList(characterBehaviorContract.layered_tags)}` : '',
    characterBehaviorContract?.behavior_rules?.length ? `行为规则：${joinList(characterBehaviorContract.behavior_rules)}` : '',
    characterBehaviorContract?.protagonist_composure_rules?.length ? `主角逼格反应：${joinList(characterBehaviorContract.protagonist_composure_rules)}` : '',
    characterBehaviorContract?.strong_association_rules?.length ? `人设强关联：${joinList(characterBehaviorContract.strong_association_rules)}` : '',
    characterBehaviorContract?.memory_anchors?.length ? `记忆锚点：${joinList(characterBehaviorContract.memory_anchors)}` : '',
    characterBehaviorContract?.supporting_role_functions?.length ? `配角功能：${joinList(characterBehaviorContract.supporting_role_functions)}` : '',
    characterBehaviorContract?.role_card_requirements?.length ? `角色卡必备项：${joinList(characterBehaviorContract.role_card_requirements)}` : '',
    characterBehaviorContract?.supporting_role_exit_rules?.length ? `配角退场规划：${joinList(characterBehaviorContract.supporting_role_exit_rules)}` : '',
    characterBehaviorContract?.behavior_repeat_rules?.length ? `行为重复点：${joinList(characterBehaviorContract.behavior_repeat_rules)}` : '',
    characterBehaviorContract?.character_driven_event_rules?.length ? `人推事件：${joinList(characterBehaviorContract.character_driven_event_rules)}` : '',
    characterBehaviorContract?.protagonist_red_line_rules?.length ? `主角红线：${joinList(characterBehaviorContract.protagonist_red_line_rules)}` : '',
    characterBehaviorContract?.identity_goldfinger_alignment_rules?.length ? `身份/金手指对齐：${joinList(characterBehaviorContract.identity_goldfinger_alignment_rules)}` : '',
    characterBehaviorContract?.antagonist_logic?.length ? `反派逻辑：${joinList(characterBehaviorContract.antagonist_logic)}` : '',
    characterBehaviorContract?.antagonist_weight_rules?.length ? `反派分量：${joinList(characterBehaviorContract.antagonist_weight_rules)}` : '',
    characterBehaviorContract?.antagonist_self_story_rules?.length ? `反派自我叙事：${joinList(characterBehaviorContract.antagonist_self_story_rules)}` : '',
    characterBehaviorContract?.antagonist_tier_exit_rules?.length ? `反派层级退场：${joinList(characterBehaviorContract.antagonist_tier_exit_rules)}` : '',
    characterBehaviorContract?.quality_checks?.length ? `character_behavior_checks：${joinList(characterBehaviorContract.quality_checks)}` : '',
    characterBehaviorContract ? '交稿自检必须输出 character_behavior_checks，并用正文证据检查主角行为三必须、动机链、动机具体性、三层标签反差、展示优于告知、主角逼格反应、记忆锚点、配角功能、角色卡必备项、配角退场规划、行为重复点、人推事件、主角红线、身份/金手指对齐、反派内在逻辑、反派分量、反派自我叙事和反派层级退场。' : '',
    characterBehaviorContract ? JSON.stringify(characterBehaviorContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildAssetLinkagePromptSection(assetLinkageContract: any, assetRelationshipGraphRisks: any[] = []) {
  return [
    assetLinkageContract ? '【资产挂钩合同】' : '',
    assetLinkageContract ? '硬性要求：执行 chapter_target.asset_linkage_contract；这是来自 oh-story artifact-protocols / state-tracking / writing-craft 的资产使用口径，正文必须让关键资产摆脱孤立名词状态。' : '',
    assetLinkageContract ? '执行方式：每个关键资产都要绑定功能、归属、触发条件、限制、后果；设定信息必须跟着冲突走；贯穿物件按三次出现规则建立意义、制造转折、兑现情绪或证据冲击；关键资产破局时按道具能力展示的8步期待模板拉期待。' : '',
    assetLinkageContract?.key_assets?.length ? `关键资产：${joinList(assetLinkageContract.key_assets)}` : '',
    assetLinkageContract?.linkage_plan?.length ? `挂钩计划：${joinList(assetLinkageContract.linkage_plan)}` : '',
    assetLinkageContract?.usage_rules?.length ? `使用规则：${joinList(assetLinkageContract.usage_rules)}` : '',
    assetLinkageContract?.state_tracking?.length ? `状态追踪：${joinList(assetLinkageContract.state_tracking)}` : '',
    assetLinkageContract?.three_appearance_plan?.length ? `三次出现：${joinList(assetLinkageContract.three_appearance_plan)}` : '',
    assetLinkageContract?.prop_ability_expectation_rules?.length ? `道具能力展示：${joinList(assetLinkageContract.prop_ability_expectation_rules)}` : '',
    assetLinkageContract?.forbidden_boundaries?.length ? `禁揭边界：${joinList(assetLinkageContract.forbidden_boundaries)}` : '',
    assetRelationshipGraphRisks.length ? `关系图风险：${joinList(assetRelationshipGraphRisks)}。不得让这些资产继续孤立、缺归属或悬空引用，必须把它们写成目标、冲突、回报、状态变化或章尾钩子的现场功能。` : '',
    assetLinkageContract?.quality_checks?.length ? `asset_linkage_checks：${joinList(assetLinkageContract.quality_checks)}` : '',
    assetLinkageContract ? '交稿自检必须输出 asset_linkage_checks，并用正文证据检查孤立资产、功能链、状态变化、信息跟冲突走、贯穿道具三次出现、道具能力展示的8步期待模板、禁揭/知识边界和新概念负载。' : '',
    assetLinkageContract ? JSON.stringify(assetLinkageContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildStateTrackingPromptSection(stateTrackingContract: any) {
  return [
    stateTrackingContract ? '【状态筛选合同】' : '',
    stateTrackingContract ? '硬性要求：执行 chapter_target.state_tracking_contract；这是来自 oh-story state-tracking / workflow-daily Step 2.2 的本节速记口径，写正文前必须只加载/只使用会影响本章正确性的状态，也就是“如果不知道这个，本章会写错”的信息。' : '',
    stateTrackingContract ? '执行方式：本节速记必须分成角色状态、相关伏笔/前史、世界约束；角色状态不得漂移，上一章钩子和待回收伏笔必须接住，世界规则/地点/能力限制必须影响行动选择。' : '',
    stateTrackingContract ? '来源边界：source_requirements 的“已加载”只承认本轮 workflow 内实际读取或刚更新的本章细纲、上一章正文/尾段、追踪/上下文、追踪/伏笔、追踪/时间线、追踪/角色状态或对应角色设定；不得用未标明来源的聊天记忆替代。' : '',
    stateTrackingContract?.source_readiness?.length ? `来源就绪表：${JSON.stringify(stateTrackingContract.source_readiness).slice(0, 1800)}` : '',
    stateTrackingContract?.character_states?.length ? `角色状态：${joinList(stateTrackingContract.character_states)}` : '',
    stateTrackingContract?.historical_causality?.length ? `相关伏笔/前史：${joinList(stateTrackingContract.historical_causality)}` : '',
    stateTrackingContract?.world_constraints?.length ? `世界约束：${joinList(stateTrackingContract.world_constraints)}` : '',
    stateTrackingContract?.filter_rules?.length ? `筛选规则：${joinList(stateTrackingContract.filter_rules)}` : '',
    stateTrackingContract?.source_requirements?.length ? `来源要求：${joinList(stateTrackingContract.source_requirements)}` : '',
    stateTrackingContract?.quality_checks?.length ? `state_tracking_checks：${joinList(stateTrackingContract.quality_checks)}` : '',
    stateTrackingContract ? '交稿自检必须输出 state_tracking_checks，并用正文证据检查本节速记、角色状态、相关伏笔/前史、世界约束、来源边界和上下文不过载。' : '',
    stateTrackingContract ? JSON.stringify(stateTrackingContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildIntentConfirmationPromptSection(intentConfirmationContract: any) {
  return [
    intentConfirmationContract ? '【意图确认合同】' : '',
    intentConfirmationContract ? '硬性要求：执行 chapter_target.intent_confirmation_contract；这是来自 oh-story workflow-daily Step 2.4 的意图确认口径，正文必须按情绪+节奏+模块+文风指令统一发力。' : '',
    intentConfirmationContract ? '执行方式：内容概括决定起承转合；情节安排决定主线/辅线/事件线/感情线/逻辑线取舍；人物关系和出场顺序决定镜头进入顺序；代价/收益决定爽点落点；结尾设定和钩子决定章尾承接。' : '',
    intentConfirmationContract?.confirmed_intent ? `确认意图：${intentConfirmationContract.confirmed_intent}` : '',
    intentConfirmationContract?.rhythm_and_style?.length ? `情绪+节奏+模块+文风指令：${joinList(intentConfirmationContract.rhythm_and_style)}` : '',
    intentConfirmationContract?.structure_inputs?.length ? `结构输入：${joinList(intentConfirmationContract.structure_inputs)}` : '',
    intentConfirmationContract?.execution_focus?.length ? `执行重点：${joinList(intentConfirmationContract.execution_focus)}` : '',
    intentConfirmationContract?.dialogue_tone_baseline?.length ? `对白基调约束：${joinList(intentConfirmationContract.dialogue_tone_baseline)}` : '',
    intentConfirmationContract?.quality_checks?.length ? `intent_confirmation_checks：${joinList(intentConfirmationContract.quality_checks)}` : '',
    intentConfirmationContract ? '交稿自检必须输出 intent_confirmation_checks，并用正文证据检查情绪目标、节奏爆发、结构输入、信息差反应、代价/收益、章尾承接和文风召回边界。' : '',
    intentConfirmationContract ? JSON.stringify(intentConfirmationContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildStateTrackingReceiptPromptSection(stateTrackingContract: any) {
  return [
    stateTrackingContract ? '输出附加要求：oh_story_delivery_receipts.pre_draft_execution_receipts.status_filter_receipts 必须逐项覆盖【状态筛选合同】中的角色状态、相关伏笔/前史、世界约束、filter_rules 和 source_requirements；每项包含 key,label,used_in_chapter,evidence,excluded_reason,remaining_risk，证明只加载/只使用会影响本章正确性的状态，未使用的信息必须写明为何不会导致本章写错。' : '',
    stateTrackingContract ? '输出附加要求：oh_story_delivery_receipts.pre_draft_execution_receipts.source_readiness_checks 必须逐项覆盖【来源就绪表】；每项包含 key,label,status(pass|warn|fail),evidence,fix，证明 ready 来源已在正文可见承接，missing/warn 来源没有被当作既定事实使用。' : '',
  ]
}

export function buildIntentConfirmationReceiptPromptSection(intentConfirmationContract: any) {
  return [
    intentConfirmationContract ? '输出附加要求：oh_story_delivery_receipts.pre_draft_execution_receipts.intent_confirmation_checks 必须逐项覆盖 chapter_target.intent_confirmation_contract 中的 confirmed_intent、rhythm_and_style、structure_inputs、dialogue_tone_baseline、logic_line、appearance_order、cost_and_reward、ending_handoff 和 quality_checks；每项包含 key,label,delivered,evidence,remaining_risk，未完成时 delivered=false 并写明下一章需要承接的意图偏移。' : '',
  ]
}

