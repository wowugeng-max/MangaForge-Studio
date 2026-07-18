import type { AnyRecord } from './utils'
import {
  firstText,
  arrayValue,
  objectValue,
} from './utils'
import {
  summarizeEvidenceItem,
} from './support'

export function appendRepairTaskQualitySyncPromptLinesCore(lines: string[], ctx: Record<string, any>) {
  const {
    chapterBenchmarkSync,
    characterArcSync,
    sourceReadinessSync,
    stateTrackingSync,
    storyDriveSync,
    storyStateUpdateSync,
    styleBoundarySync,
    styleSampleSync,
    task,
    wordCountSync,
  } = ctx

  if (storyDriveSync) {
    const missed = arrayValue(storyDriveSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    lines.push(
      '【故事驱动力修复】',
      storyDriveSync.score !== undefined && storyDriveSync.score !== null ? `故事力评分：${storyDriveSync.score}` : '',
      firstText(storyDriveSync.label) ? `故事力结论：${firstText(storyDriveSync.label)}` : '',
      firstText(storyDriveSync.priority_repair, storyDriveSync.priorityRepair) ? `优先项：${firstText(storyDriveSync.priority_repair, storyDriveSync.priorityRepair)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      '修订要求：必须补出主角主动选择、明确阻碍、选择代价、局面变化和下一步因果。',
      '不能只补旁白解释；新增内容必须写成现场行动、对话交锋、代价反馈或状态变化。',
      '输出要求：必须返回 story_drive_checks，不能只写自然语言故事力已增强说明。',
      'story_drive_checks 每项必须包含 key, label, status, protagonist_choice, obstacle, cost, state_change, next_causality, evidence, fix, remaining_risk。',
      '复检要求：主角主动选择、明确阻碍、选择代价、局面变化或下一步因果没有正文证据时 status 不能写 pass/ok；只有新增内容能从 chapter_text 定位为现场行动、对话交锋、代价反馈或状态变化时，才能关闭。',
    )
  }
  if (wordCountSync) {
    const missed = arrayValue(wordCountSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const nextActions = arrayValue(wordCountSync.next_actions || wordCountSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    const currentCount = firstText(
      wordCountSync.current_count,
      wordCountSync.currentCount,
      wordCountSync.actual_count,
      wordCountSync.actualCount,
      wordCountSync.count,
      task.current_count,
      task.currentCount,
    )
    const targetCount = firstText(
      wordCountSync.target_count,
      wordCountSync.targetCount,
      wordCountSync.goal_count,
      wordCountSync.goalCount,
      task.target_count,
      task.targetCount,
    )
    const targetNumber = Number(String(targetCount).replace(/[^\d.]/g, ''))
    const computedMinRequired = Number.isFinite(targetNumber) && targetNumber > 0 ? Math.ceil(targetNumber * 0.9) : ''
    const minRequiredCount = firstText(
      wordCountSync.min_required_count,
      wordCountSync.minRequiredCount,
      wordCountSync.minimum_count,
      wordCountSync.minimumCount,
      task.min_required_count,
      task.minRequiredCount,
      computedMinRequired,
    )
    lines.push(
      '【字数验证修复】',
      firstText(wordCountSync.label) ? `字数结论：${firstText(wordCountSync.label)}` : '',
      currentCount ? `当前字数：${currentCount}` : '',
      targetCount ? `目标字数：${targetCount}` : '',
      minRequiredCount ? `最低门槛：${minRequiredCount}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：低于目标 90% 时必须强制扩充，优先扩充场景目标、阻碍、动作链、对白交锋、代价反馈和章末承接。',
      '扩写边界：新增字数必须服务本章目标、冲突推进、状态变化、读者回报或下一章压力；不得新增未确认设定、支线或抢跑后续大事件。',
      '禁止凑字：不得只堆说明、环境描写或心理旁白凑字数；不得把一处动作拆成多句重复表达。',
      '输出要求：必须返回 word_count_checks，不能只写自然语言扩写说明。',
      'word_count_checks 每项必须包含 key, label, status, current_count, target_count, min_required_count, evidence, remaining_risk；evidence 必须引用新增后的正文片段或场景变化。',
      '复检要求：低于最低门槛时 status 不能写 pass/ok；只有 current_count >= min_required_count 且新增内容不是凑字时，word_count_checks 才能全部为 pass/ok。',
      '关闭口径：重新运行正文自检后，word_count_checks 必须全部为 pass/ok，当前字数不低于最低门槛，且新增内容能从 chapter_text 找到可定位证据。',
    )
  }
  if (characterArcSync) {
    const missed = arrayValue(characterArcSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    lines.push(
      '【人物弧光修复】',
      characterArcSync.score !== undefined && characterArcSync.score !== null ? `人物弧光评分：${characterArcSync.score}` : '',
      firstText(characterArcSync.label) ? `人物弧光结论：${firstText(characterArcSync.label)}` : '',
      firstText(characterArcSync.priority_repair, characterArcSync.priorityRepair) ? `优先项：${firstText(characterArcSync.priority_repair, characterArcSync.priorityRepair)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      '修订要求：必须补出角色欲望、缺陷受压、关系变化、成长节点和口吻锚点。',
      '不能只补心理旁白；新增内容必须落到选择、对话、行动后果或关系反馈上。',
      '输出要求：必须返回 character_arc_checks，不能只写自然语言人物弧光已增强说明。',
      'character_arc_checks 每项必须包含 key, label, status, character, desire, flaw_pressure, relationship_change, growth_beat, voice_anchor, evidence, fix, remaining_risk。',
      '复检要求：角色欲望、缺陷受压、关系变化、成长节点或口吻锚点没有正文证据时 status 不能写 pass/ok；只有新增内容落到选择、对话、行动后果或关系反馈时，才能关闭。',
    )
  }
  if (chapterBenchmarkSync) {
    const missed = arrayValue(chapterBenchmarkSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const nextActions = arrayValue(chapterBenchmarkSync.next_actions || chapterBenchmarkSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【章节标杆修复】',
      chapterBenchmarkSync.score !== undefined && chapterBenchmarkSync.score !== null ? `标杆评分：${chapterBenchmarkSync.score}` : '',
      firstText(chapterBenchmarkSync.label) ? `标杆结论：${firstText(chapterBenchmarkSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：必须补成可见的开篇钩子、冲突推进、爽点兑现、场景节拍和章末追读。',
      '只学习标杆章的抽象方法，不得复制桥段、专有设定、角色名、原句或核心梗；新增内容必须服务本章目标和长期主线。',
      '输出要求：必须返回 chapter_benchmark_checks，不能只写自然语言标杆章已应用说明。',
      'chapter_benchmark_checks 每项必须包含 key, label, status, benchmark_dimension, expected_method, delivered_evidence, originality_guard, fix, remaining_risk；benchmark_dimension 写 opening_hook/conflict_progression/payoff/scene_rhythm/ending_page_turn 中最贴近的一类。',
      '复检要求：开篇钩子、冲突推进、爽点兑现、场景节拍或章末追读没有正文证据时 status 不能写 pass/ok；originality_guard 必须说明没有复制标杆桥段、专名、原句或核心梗。',
    )
  }
  if (styleSampleSync) {
    const missed = arrayValue(styleSampleSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const copied = arrayValue(styleSampleSync.copied_phrases || styleSampleSync.copiedPhrases)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【风格样章修复】',
      styleSampleSync.score !== undefined && styleSampleSync.score !== null ? `风格评分：${styleSampleSync.score}` : '',
      firstText(styleSampleSync.label) ? `风格结论：${firstText(styleSampleSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      copied.length > 0 ? `照搬风险：${copied.join('；')}` : '',
      '修订要求：必须重写为作者口吻的节奏、句式、对白比例和情绪转折，不得照搬样章原句。',
      '不要改变剧情线、设定状态、人物状态和章节事件；只修表达方式、节奏分配和角色口吻。',
      '输出要求：必须返回 style_sample_checks，不能只写自然语言风格已调整说明。',
      'style_sample_checks 每项必须包含 key, label, status, style_dimension, source_technique, adapted_evidence, copied_phrase_rewritten, fix, remaining_risk；style_dimension 写 rhythm/sentence/dialogue/voice/emotion_turn 中最贴近的一类。',
      '复检要求：照搬样章原句、桥段、专有设定、角色名或核心梗时 status 不能写 pass/ok；只有样章方法被改写成本书作者口吻，并能从 chapter_text 定位 adapted_evidence 时，才能关闭。',
      '写前执行回执：oh_story_delivery_receipts.pre_draft_execution_receipts.style_sample_checks 必须逐项复验修订结果，delivered=true 且 remaining_risk 为空才算闭环。',
    )
  }
  if (sourceReadinessSync) {
    const missed = arrayValue(sourceReadinessSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(sourceReadinessSync.next_actions || sourceReadinessSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【来源就绪修复】',
      firstText(sourceReadinessSync.label) ? `来源结论：${firstText(sourceReadinessSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 source_readiness_checks 逐项核对角色状态、相关伏笔/前史、世界约束和资产状态；missing/warn 来源不能被当作既定事实。',
      '来源口径：已加载只指本轮 workflow 内实际读取或刚更新过的来源，不得用未标明来源的聊天记忆替代。',
      '必查来源：本章细纲、上一章正文、追踪/上下文.md、追踪/伏笔.md、追踪/时间线.md；涉及角色时还必须核对追踪/角色状态.md 或对应设定/角色文件。',
      '正文要求：ready 来源必须写成可见承接，使用动作、对白、信息变化、物品状态变化或角色确认，不得只补旁白说明。',
      '写前执行回执：oh_story_delivery_receipts.pre_draft_execution_receipts.source_readiness_checks 必须逐项更新 status/evidence/fix；missing/warn 来源要写清修复后是否仍有风险，不能只在正文外声明已确认。',
      '输出要求：必须返回 source_readiness_checks，不能只写自然语言来源确认说明。',
      'source_readiness_checks 每项必须包含 key, label, status, source_name, source_path, read_status, used_as_fact, chapter_evidence, fix, remaining_risk；source_path 写本轮 workflow 实际读取或刚更新过的文件路径。',
      '复检要求：来源未在本轮 workflow 读取或刚更新，或 missing/warn 被当作既定事实时 status 不能写 pass/ok；只有来源为 ready 且正文有可定位承接证据时，才能关闭。',
      '关闭口径：重新运行正文自检后，source_readiness_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (stateTrackingSync) {
    const missed = arrayValue(stateTrackingSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(stateTrackingSync.next_actions || stateTrackingSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【状态跟踪修复】',
      firstText(stateTrackingSync.label) ? `状态结论：${firstText(stateTrackingSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 state_tracking_checks 逐项核对角色状态、伏笔状态、资产归属、关系边界和世界规则；不得让昏迷、失效、未获得或未揭示状态直接参与当前章结果。',
      '正文要求：状态变化必须写成可定位的动作、对白、代价、限制、信息变化或状态回填，不能只补解释性旁白。',
      '状态筛选回执：oh_story_delivery_receipts.pre_draft_execution_receipts.status_filter_receipts 必须逐项更新 used_in_chapter/evidence/excluded_reason/remaining_risk；未用于本章的状态要写明排除原因，已使用状态必须有正文证据，excluded_reason 写“已用于本章，未排除”。',
      'status_filter_receipts 每项必须包含 key, label, used_in_chapter, evidence, excluded_reason, remaining_risk。',
      '输出要求：必须返回 state_tracking_checks，不能只写自然语言状态已核对说明。',
      'state_tracking_checks 每项必须包含 key, label, status, state_subject, state_type, previous_state, allowed_state, used_in_chapter, evidence, excluded_reason, fix, remaining_risk；state_type 写 character/foreshadowing/asset/relation/world_rule 中最贴近的一类。',
      '复检要求：昏迷、失效、未获得或未揭示状态被用于当前章结果时 status 不能写 pass/ok；只有 used_in_chapter 与 allowed_state 一致，并且 evidence 或 excluded_reason 可定位时，才能关闭。',
      '关闭口径：重新运行正文自检后，state_tracking_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (storyStateUpdateSync) {
    const missed = arrayValue(storyStateUpdateSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(storyStateUpdateSync.next_actions || storyStateUpdateSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【状态写回修复】',
      firstText(storyStateUpdateSync.label) ? `状态写回结论：${firstText(storyStateUpdateSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 story_state_update_checks 补齐写后状态机更新；只把正文已经发生的状态变化写回，不新增正文没有发生的新事实。',
      '写回对象：同步 story_state_update/state_delta，并补齐 character_updates、setting_updates、asset_updates、storyline_updates、foreshadowing_updates 或 timeline_updates 中对应缺口。',
      '追踪文件：同步追踪/上下文.md、追踪/伏笔.md、追踪/时间线.md 和追踪/角色状态.md；每项变更必须能回到当前章正文事实。',
      '证据要求：每条状态写回必须带 source_excerpt/evidence，引用修订后 chapter_text 中可定位的动作、对白、物品归属、关系变化、时间线变化或伏笔状态变化，不能只写摘要结论。',
      '边界要求：如果追踪缺口来自正文本身没有写清状态变化，先小范围补正文证据；如果正文已经写清，只补状态写回和回执，不要重写整章。',
      '输出要求：必须返回 story_state_update_checks，不能只写自然语言状态同步说明。',
      'story_state_update_checks 每项必须包含 key, label, status, state_domain, target_file, update_path, before_state, after_state, source_excerpt, evidence, fix, remaining_risk；state_domain 写 character/setting/asset/storyline/foreshadowing/timeline/context 中最贴近的一类。',
      '复检要求：target_file/update_path 未写回，或 source_excerpt/evidence 不能定位到修订后正文时 status 不能写 pass/ok；只有正文事实、状态差异和追踪写回三者都闭合时，才能关闭。',
      '关闭口径：重新运行正文自检后，story_state_update_checks 必须全部为 pass/ok，missed_count=0，state_delta 中本章新增/推进/回收的状态变化均带 source_excerpt/evidence。',
    )
  }
  if (styleBoundarySync) {
    const missed = arrayValue(styleBoundarySync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(styleBoundarySync.next_actions || styleBoundarySync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【风格边界修复】',
      firstText(styleBoundarySync.label) ? `风格结论：${firstText(styleBoundarySync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 style_boundary_checks 逐项修复过近的参照句式、桥段节奏、套话和模板化表达；保留本书承诺的语气、节奏和角色口吻。',
      '正文要求：用本章动作链、角色口吻、信息变化和场景压力重写；不得复制标杆原句、专有设定、角色名、核心梗或可识别桥段。',
      '输出要求：必须返回 style_boundary_checks，不能只写自然语言风格边界已修复。',
      'style_boundary_checks 每项必须包含 key, label, status, reference_risk, rewritten_with_local_action, voice_anchor, copied_phrase_removed, evidence, fix, remaining_risk。',
      '仍复用标杆原句、句式节奏、专有设定或缺少本章动作链证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，style_boundary_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
}
