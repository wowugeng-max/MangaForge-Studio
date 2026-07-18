import type { AnyRecord } from './utils'
import {
  firstText,
  arrayValue,
  objectValue,
} from './utils'
import {
  summarizeEvidenceItem,
} from './support'

export function appendRepairTaskQualitySyncPromptLinesCraftA(lines: string[], ctx: Record<string, any>) {
  const {
    assetLinkageSync,
    bridgeUnitSync,
    chapterHookSync,
    characterBehaviorSync,
    characterRelationSync,
    conflictStructureSync,
    dialogueSync,
    emotionalArcSync,
    expectationThresholdSync,
    informationFlowSync,
    paragraphHookSync,
    plotDynamicsSync,
    reversalSync,
    showdownSync,
    storyLoopSync,
    suspenseSync,
  } = ctx

  if (informationFlowSync) {
    const missed = arrayValue(informationFlowSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(informationFlowSync.next_actions || informationFlowSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【信息流修复】',
      firstText(informationFlowSync.label) ? `信息流结论：${firstText(informationFlowSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 information_flow_checks 重排线索、解释、误判、反转和信息揭示顺序；信息必须跟冲突、动作、选择和代价同步释放。',
      '正文要求：避免提前泄底、补丁式旁白和上下文过载；关键信息要通过场景内行动、对白、判断变化或代价显形。',
      '输出要求：必须返回 information_flow_checks，不能只写自然语言信息流已修复。',
      'information_flow_checks 每项必须包含 key, label, status, reveal_order, withheld_question, action_bound_release, conflict_or_cost, evidence, fix, remaining_risk。',
      '提前泄底、信息未随行动/冲突/代价释放或缺少正文证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，information_flow_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (expectationThresholdSync) {
    const missed = arrayValue(expectationThresholdSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(expectationThresholdSync.next_actions || expectationThresholdSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【期待阈值修复】',
      firstText(expectationThresholdSync.label) ? `期待结论：${firstText(expectationThresholdSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 expectation_threshold_checks 强化读者必须继续阅读的问题、悬念、代价、选择压力或回报承诺。',
      '正文要求：章末必须留下明确的下一章追问，期待要落到可见事件、未揭身份、代价、选择压力或回报承诺，不能只做氛围收束。',
      '输出要求：必须返回 expectation_threshold_checks，不能只写自然语言期待已增强。',
      'expectation_threshold_checks 每项必须包含 key, label, status, reader_question, stakes, choice_pressure, payoff_promise, next_chapter_pull, evidence, fix, remaining_risk。',
      '缺少具体读者问题、代价/选择压力、回报承诺或下一章牵引证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，expectation_threshold_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (storyLoopSync) {
    const missed = arrayValue(storyLoopSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(storyLoopSync.next_actions || storyLoopSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【故事闭环修复】',
      firstText(storyLoopSync.label) ? `闭环结论：${firstText(storyLoopSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 story_loop_checks 让本章设问、阻碍、选择、代价、回报和新问题形成可追踪闭环。',
      '正文要求：至少推进一个答案碎片或状态变化，并把残留问题自然挂到下一章；不能让开头设问在结尾原地悬空。',
      '输出要求：必须返回 story_loop_checks，不能只写自然语言故事闭环已修复。',
      'story_loop_checks 每项必须包含 key, label, status, setup_question, obstacle, choice, cost, payoff_or_answer_fragment, new_question, evidence, fix, remaining_risk。',
      '设问、阻碍、选择、代价、回报/答案碎片或新问题缺证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，story_loop_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (emotionalArcSync) {
    const missed = arrayValue(emotionalArcSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(emotionalArcSync.next_actions || emotionalArcSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【情绪弧修复】',
      firstText(emotionalArcSync.label) ? `情绪结论：${firstText(emotionalArcSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 emotional_arc_checks 把平静、调动、释放、爽感写成可追踪情绪递进。',
      '正文要求：压迫必须落到现场选择，反制必须通过动作、对白、旁观反馈、关系反馈或状态变化外化；不能只解释规则或用心理总结代替情绪兑现。',
      '输出要求：必须返回 emotional_arc_checks，不能只写自然语言情绪弧已修复。',
      'emotional_arc_checks 每项必须包含 key, label, status, calm_or_pressure, mobilization, counteraction, release, reader_payoff, evidence, fix, remaining_risk。',
      '缺少压迫/调动、反制、释放、读者爽感或旁观反馈证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，emotional_arc_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (chapterHookSync) {
    const missed = arrayValue(chapterHookSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(chapterHookSync.next_actions || chapterHookSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【章级钩子修复】',
      firstText(chapterHookSync.label) ? `钩子结论：${firstText(chapterHookSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 chapter_hook_checks 重写或补写前100字章首钩子和最后约100字章尾翻页钩子。',
      '正文要求：钩子必须落成具体问题、压力、兑现路径、危险选择或下一章行动牵引；修掉假悬念、机械降神、低风险钩、过度留白和同类型连用。',
      '输出要求：必须返回 chapter_hook_checks，不能只写自然语言钩子增强说明。',
      'chapter_hook_checks 每项必须包含 key, label, status, hook_position, trigger, reader_question, next_chapter_pressure, delivered_evidence, fix, remaining_risk；hook_position 写 opening 或 ending。',
      '复检要求：章首或章尾没有现场触发、具体读者问题、下一章压力和正文证据时 status 不能写 pass/ok；只有前100字和最后约100字都形成翻页牵引时，才能关闭。',
      '关闭口径：重新运行正文自检后，chapter_hook_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (paragraphHookSync) {
    const missed = arrayValue(paragraphHookSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(paragraphHookSync.next_actions || paragraphHookSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【段落级钩子修复】',
      firstText(paragraphHookSync.label) ? `段钩结论：${firstText(paragraphHookSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 paragraph_hook_checks 补段落级钩子 11 种、钩子组合、对话情绪递进、围观者层级或不公平伤害。',
      '正文要求：每3-5段必须出现信息、风险、情绪或关系变化；连续环境、站位、解释、姿态或静态说明必须改成暗牌、倒计时、反转、打脸、代价、异常物件、冷发现、对话压迫等可见微推进。',
      '输出要求：必须返回 paragraph_hook_checks，不能只写自然语言段落钩子已修复。',
      'paragraph_hook_checks 每项必须包含 key, label, status, paragraph_range, hook_type, micro_change, information_or_risk_delta, emotion_or_relation_delta, evidence, fix, remaining_risk。',
      '连续3-5段没有信息、风险、情绪或关系变化证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，paragraph_hook_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (suspenseSync) {
    const missed = arrayValue(suspenseSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(suspenseSync.next_actions || suspenseSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【悬念编排修复】',
      firstText(suspenseSync.label) ? `悬念结论：${firstText(suspenseSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 suspense_checks 补疑问、误导、答案和新期待的悬念循环。',
      '正文要求：先提出疑问，再给可信提示或误导，公布局部答案后立起新期待；避免假悬念、谜语人拖延和信息延迟过久。',
      '输出要求：必须返回 suspense_checks，不能只写自然语言悬念已修复。',
      'suspense_checks 每项必须包含 key, label, status, question, misdirect, partial_answer, new_expectation, evidence, fix, remaining_risk。',
      '缺少疑问、可信误导、局部答案或新期待证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，suspense_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (assetLinkageSync) {
    const missed = arrayValue(assetLinkageSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(assetLinkageSync.next_actions || assetLinkageSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【资产挂钩修复】',
      firstText(assetLinkageSync.label) ? `资产结论：${firstText(assetLinkageSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 asset_linkage_checks 消灭孤立资产，让关键资产绑定功能、归属、触发条件、限制、后果和状态变化。',
      '正文要求：每个资产至少接到本章目标、冲突、回报或章尾钩子之一；设定信息必须通过使用、质疑、触发、误判或代价反馈释放，不能只点名、介绍来历或当背景摆件。',
      '输出要求：必须返回 asset_linkage_checks，不能只写自然语言资产已挂钩。',
      'asset_linkage_checks 每项必须包含 key, label, status, asset_name, function, ownership, trigger_condition, limitation, consequence, story_link, evidence, fix, remaining_risk。',
      '资产只点名、缺功能/归属/触发/限制/后果或没有挂到目标/冲突/回报/章尾钩子时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，asset_linkage_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (dialogueSync) {
    const missed = arrayValue(dialogueSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(dialogueSync.next_actions || dialogueSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【对白质量修复】',
      firstText(dialogueSync.label) ? `对白结论：${firstText(dialogueSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 dialogue_checks 修复对白，让每句对白至少承担推进剧情、增加期待或展示人设之一。',
      '正文要求：补潜台词、议程、声线差异、权力博弈、信息嵌入和情绪递进；把说明书式对白改成借口、试探、回避、动作反应或信息差拉扯，短句方成为权力上位时要有明确节奏变化。',
      '输出要求：必须返回 dialogue_checks，不能只写自然语言对白已优化。',
      'dialogue_checks 每项必须包含 key, label, status, speaker, agenda, subtext, power_shift, information_delta, character_voice, evidence, fix, remaining_risk。',
      '对白没有议程/潜台词/权力变化/信息增量/声线差异证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，dialogue_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (plotDynamicsSync) {
    const missed = arrayValue(plotDynamicsSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(plotDynamicsSync.next_actions || plotDynamicsSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【剧情动力修复】',
      firstText(plotDynamicsSync.label) ? `动力结论：${firstText(plotDynamicsSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 plot_dynamics_checks 补目标、阻碍、行动、代价/反馈、新期待的最小剧情循环。',
      '正文要求：需要时重构假胜、崩解、A/B情绪交替、多线错峰或悬置收尾；新增内容必须写成现场行动、选择压力、代价反馈、信息变化或状态变化，不能只补解释。',
      '输出要求：必须返回 plot_dynamics_checks，不能只写自然语言剧情动力已增强。',
      'plot_dynamics_checks 每项必须包含 key, label, status, goal, obstacle, action, cost_or_feedback, new_expectation, evidence, fix, remaining_risk。',
      '目标、阻碍、行动、代价/反馈或新期待缺正文证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，plot_dynamics_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (characterRelationSync) {
    const missed = arrayValue(characterRelationSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(characterRelationSync.next_actions || characterRelationSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【角色关系修复】',
      firstText(characterRelationSync.label) ? `关系结论：${firstText(characterRelationSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 character_relation_checks 修复角色关系，补关系类型、关系考验/变化、主角独立目标、目标归属、角色不止恋爱、配角期待枢纽、配角主动行动、态度变化和阶段匹配。',
      '正文要求：主角必须保留自己的诉求、主动选择和代价；关系线可以互助，但不能让主角只是在帮别人办事。关系推进要落成目标摩擦、资源交换、风险共担、态度变化或可定位的行动反馈。',
      '输出要求：必须返回 character_relation_checks，不能只写自然语言角色关系已修复。',
      'character_relation_checks 每项必须包含 key, label, status, relation_type, protagonist_goal, agency_choice, cost, relation_shift, evidence, fix, remaining_risk。',
      '主角缺自己的诉求、主动选择、代价或关系变化证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，character_relation_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (characterBehaviorSync) {
    const missed = arrayValue(characterBehaviorSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(characterBehaviorSync.next_actions || characterBehaviorSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【角色行为修复】',
      firstText(characterBehaviorSync.label) ? `行为结论：${firstText(characterBehaviorSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 character_behavior_checks 修复角色行为，补主角行为三必须、动机链、动机具体性、三层标签反差、人设强关联、展示优于告知、记忆锚点、配角功能、反派内在逻辑、反派分量、反派自我叙事和反派层级退场。',
      '正文要求：动机不能只写“想变强/被欺负”，必须落到具体事件、情感理由、触发变化和代价；角色标签必须通过行动、对白、选择压力、资源使用、旁观反馈或失败代价展示出来。',
      '输出要求：必须返回 character_behavior_checks，不能只写自然语言角色行为已合理。',
      'character_behavior_checks 每项必须包含 key, label, status, character, concrete_motive, emotional_reason, trigger_change, visible_choice, cost, evidence, fix, remaining_risk。',
      '动机只写想变强/被欺负，或缺具体事件、情感理由、可见选择/代价证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，character_behavior_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (conflictStructureSync) {
    const missed = arrayValue(conflictStructureSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(conflictStructureSync.next_actions || conflictStructureSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【冲突结构修复】',
      firstText(conflictStructureSync.label) ? `冲突结论：${firstText(conflictStructureSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 conflict_structure_checks 修复冲突结构，补阻止者、有进无出、死亡赌注/退出代价、黏结剂、行动阻拦、明确胜负结果、压势不压人、主角主动破局、矛盾网和下一冲突种子。',
      '正文要求：必须有人阻止主角得到目标；冲突要从言语、动作、激烈对抗推进到决定胜负。让主角非踏入不可，并用职责、道德责任、实体场所、封闭条件或身份代价把双方黏住，不能只是嘴炮或可随时离场。',
      '输出要求：必须返回 conflict_structure_checks，不能只写自然语言冲突已增强。',
      'conflict_structure_checks 每项必须包含 key, label, status, blocker, no_exit_condition, stakes_or_exit_cost, action_block, win_loss_result, evidence, fix, remaining_risk。',
      '缺少阻止者、有进无出条件、退出代价、行动阻拦或明确胜负证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，conflict_structure_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (bridgeUnitSync) {
    const missed = arrayValue(bridgeUnitSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(bridgeUnitSync.next_actions || bridgeUnitSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【桥段节奏修复】',
      firstText(bridgeUnitSync.label) ? `桥段结论：${firstText(bridgeUnitSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 bridge_unit_checks 修复桥段节奏，确认四章一桥段位置，补连续期待、目标推进、章尾新目标、高潮中埋钩子、连续小期待、高潮时长和阶段衔接。',
      '正文要求：兑现旧期待前先挂新期待；连续2章没有目标推进时提高冲突密度，连续2章只爆点时补关系、伏笔、状态承接余波，避免桥段散场、过渡无功能或只爆不接。',
      '输出要求：必须返回 bridge_unit_checks，不能只写自然语言桥段节奏已修复。',
      'bridge_unit_checks 每项必须包含 key, label, status, bridge_position, old_expectation_payoff, new_expectation_seed, goal_progression, climax_hook, stage_handoff, evidence, fix, remaining_risk。',
      '旧期待兑现后没有新期待、目标推进、高潮埋钩或阶段衔接证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，bridge_unit_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (reversalSync) {
    const missed = arrayValue(reversalSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(reversalSync.next_actions || reversalSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【反转设计修复】',
      firstText(reversalSync.label) ? `反转结论：${firstText(reversalSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 reversal_checks 修复反转设计，补足反转类型、3处暗示、公平误导、揭示时机、非作弊性、揭示后影响、情绪冲击和打脸节奏。',
      '正文要求：暗示必须提前落在行为、物件、证据、时间线或反常选择里；揭示要短而狠，并直接改变局势、关系或读者情绪；删除天降反转、作弊新信息和大段解释独白。',
      '输出要求：必须返回 reversal_checks，不能只写自然语言反转已修复。',
      'reversal_checks 每项必须包含 key, label, status, reversal_type, fair_clues, misdirect, reveal_timing, impact_after_reveal, evidence, fix, remaining_risk。',
      '缺少3处公平暗示、可信误导、自然揭示或揭示后影响证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，reversal_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (showdownSync) {
    const missed = arrayValue(showdownSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(showdownSync.next_actions || showdownSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【高潮对抗修复】',
      firstText(showdownSync.label) ? `高潮结论：${firstText(showdownSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 showdown_checks 修复高潮对抗，补爽点释放、底牌管理、三压一爆三震、舞台层级、传递通道、震惊分层、战斗/智斗服务爽点、以弱胜强逻辑、三层破局和急-缓-急情绪节奏。',
      '正文要求：底牌释放后反派必须受到对应压制；每次只出1个底牌并保留2-3个未揭示后手；爆发前先写友方、敌方、中立方三路铺压，爆发后分别写三方震动和利益变化。',
      '输出要求：必须返回 showdown_checks，不能只写自然语言高潮已增强。',
      'showdown_checks 每项必须包含 key, label, status, payoff_release, trump_card_used, pressure_layers, audience_reactions, consequence, next_threshold, evidence, fix, remaining_risk。',
      '底牌释放后缺对应压制、三方震动、后果或新门槛证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，showdown_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
}
