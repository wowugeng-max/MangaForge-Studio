/** Prose drafting prompt builders and pre-draft brief sections. */
import type { NovelProjectRecord } from '../novel'

function proseBriefObject(value: any): Record<string, any> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

function proseBriefValue(value: any, options: { joiner?: string; limit?: number } = {}): string {
  const joiner = options.joiner || '、'
  const limit = options.limit || 600
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) {
    return value.map(item => proseBriefValue(item, { joiner, limit })).filter(Boolean).join(joiner).slice(0, limit)
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value).slice(0, limit)
    } catch {
      return ''
    }
  }
  return String(value).trim().slice(0, limit)
}

function proseBriefFirstObject(...values: any[]): Record<string, any> {
  for (const value of values) {
    const object = proseBriefObject(value)
    if (object) return object
  }
  return {}
}

function proseBriefFirstValue(...values: any[]): any {
  return values.find(value => {
    if (value === null || value === undefined) return false
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object') return Object.keys(value).length > 0
    return String(value).trim().length > 0
  })
}

function pushProseBriefLine(lines: string[], label: string, value: any, options: { joiner?: string; limit?: number } = {}) {
  const text = proseBriefValue(value, options)
  if (text) lines.push(`- ${label}：${text}`)
}

function buildConfirmedPreDraftBriefPrompt(chapterDraft: Record<string, any>, context: Record<string, any>): string {
  const target = proseBriefFirstObject(context?.chapter_target, context?.chapterTarget)
  const brief = proseBriefFirstObject(
    context?.pre_draft_brief,
    context?.preDraftBrief,
    context?.confirmed_pre_draft_brief,
    context?.confirmedPreDraftBrief,
    target.pre_draft_brief,
    target.preDraftBrief,
    chapterDraft?.pre_draft_brief,
    chapterDraft?.preDraftBrief,
  )
  const intent = proseBriefFirstObject(
    brief.intent_confirmation_contract,
    brief.intentConfirmationContract,
    target.intent_confirmation_contract,
    target.intentConfirmationContract,
    context?.intent_confirmation_contract,
    context?.intentConfirmationContract,
  )
  const stateTracking = proseBriefFirstObject(
    brief.state_tracking_contract,
    brief.stateTrackingContract,
    target.state_tracking_contract,
    target.stateTrackingContract,
    context?.state_tracking_contract,
    context?.stateTrackingContract,
  )
  const benchmark = proseBriefFirstObject(
    brief.benchmark_recall_brief,
    brief.benchmarkRecallBrief,
    brief.benchmark_recall_contract,
    brief.benchmarkRecallContract,
    target.benchmark_recall_brief,
    target.benchmarkRecallBrief,
    context?.benchmark_recall_brief,
    context?.benchmarkRecallBrief,
  )
  const styleSample = proseBriefFirstObject(
    brief.style_sample_strategy,
    brief.styleSampleStrategy,
    target.style_sample_strategy,
    target.styleSampleStrategy,
    context?.style_sample_strategy,
    context?.styleSampleStrategy,
    chapterDraft?.style_sample_strategy,
    chapterDraft?.styleSampleStrategy,
  )
  const styleBoundary = proseBriefFirstObject(
    brief.style_boundary_contract,
    brief.styleBoundaryContract,
    target.style_boundary_contract,
    target.styleBoundaryContract,
    context?.style_boundary_contract,
    context?.styleBoundaryContract,
  )
  const writePreparation = proseBriefFirstObject(
    brief.write_preparation_brief,
    brief.writePreparationBrief,
    target.write_preparation_brief,
    target.writePreparationBrief,
    context?.write_preparation_brief,
    context?.writePreparationBrief,
  )
  const lines: string[] = []

  pushProseBriefLine(lines, '写前准备状态', proseBriefFirstValue(writePreparation.readiness_status, writePreparation.readinessStatus))
  pushProseBriefLine(lines, '写前来源缺口', proseBriefFirstValue(writePreparation.source_gaps, writePreparation.sourceGaps))
  pushProseBriefLine(lines, '写前资产风险', proseBriefFirstValue(writePreparation.asset_risks, writePreparation.assetRisks))
  pushProseBriefLine(lines, '写前蓝图焦点', proseBriefFirstValue(writePreparation.blueprint_focus, writePreparation.blueprintFocus))
  pushProseBriefLine(lines, '写前读者回报焦点', proseBriefFirstValue(writePreparation.reader_payoff_focus, writePreparation.readerPayoffFocus))
  pushProseBriefLine(lines, '写前必确认', proseBriefFirstValue(writePreparation.must_confirm, writePreparation.mustConfirm))
  pushProseBriefLine(lines, '写前执行顺序', proseBriefFirstValue(writePreparation.execution_order, writePreparation.executionOrder), { joiner: ' -> ' })

  pushProseBriefLine(lines, '确认意图', proseBriefFirstValue(intent.confirmed_intent, intent.confirmedIntent, brief.confirmed_intent, brief.confirmedIntent))
  pushProseBriefLine(lines, '逻辑线', proseBriefFirstValue(intent.logic_line, intent.logicLine))
  pushProseBriefLine(lines, '出场/信息顺序', proseBriefFirstValue(intent.appearance_order, intent.appearanceOrder), { joiner: ' -> ' })
  pushProseBriefLine(lines, '代价与回报', proseBriefFirstValue(intent.cost_and_reward, intent.costAndReward))
  pushProseBriefLine(lines, '章末交接', proseBriefFirstValue(intent.ending_handoff, intent.endingHandoff))

  pushProseBriefLine(lines, '状态筛选规则', proseBriefFirstValue(stateTracking.filter_rules, stateTracking.filterRules, brief.state_filter_rules, brief.stateFilterRules))
  pushProseBriefLine(lines, '写前来源要求', proseBriefFirstValue(stateTracking.source_requirements, stateTracking.sourceRequirements, brief.source_requirements, brief.sourceRequirements))
  pushProseBriefLine(lines, '来源就绪证据', proseBriefFirstValue(stateTracking.source_readiness, stateTracking.sourceReadiness, brief.source_readiness, brief.sourceReadiness), { limit: 800 })

  pushProseBriefLine(lines, 'style_profile_path', proseBriefFirstValue(benchmark.style_profile_path, benchmark.styleProfilePath))
  pushProseBriefLine(lines, 'style_profile_summary', proseBriefFirstValue(benchmark.style_profile_summary, benchmark.styleProfileSummary), { limit: 1000 })
  pushProseBriefLine(lines, 'selected_emotion_module', proseBriefFirstValue(benchmark.selected_emotion_module, benchmark.selectedEmotionModule), { limit: 1200 })
  pushProseBriefLine(lines, 'rhythm_reference', proseBriefFirstValue(benchmark.rhythm_reference, benchmark.rhythmReference), { limit: 1200 })
  pushProseBriefLine(lines, 'module_source_path', proseBriefFirstValue(benchmark.module_source_path, benchmark.moduleSourcePath))
  pushProseBriefLine(lines, 'rhythm_source_path', proseBriefFirstValue(benchmark.rhythm_source_path, benchmark.rhythmSourcePath))
  pushProseBriefLine(lines, 'matched_chapter_K', proseBriefFirstValue(benchmark.matched_chapter_K, benchmark.matched_chapter_k, benchmark.matchedChapterK))
  pushProseBriefLine(lines, 'matched_chapter_techniques', proseBriefFirstValue(benchmark.matched_chapter_techniques, benchmark.matchedChapterTechniques), { limit: 1200 })
  pushProseBriefLine(lines, '原文锚点片段', proseBriefFirstValue(benchmark.anchor_excerpts, benchmark.anchorExcerpts), { joiner: '\n  ', limit: 1600 })
  pushProseBriefLine(lines, 'canonical_source_rules', proseBriefFirstValue(benchmark.canonical_source_rules, benchmark.canonicalSourceRules), { limit: 1000 })
  pushProseBriefLine(lines, 'gaps', proseBriefFirstValue(benchmark.gaps, benchmark.recall_gaps, benchmark.recallGaps), { limit: 1200 })
  pushProseBriefLine(lines, '标杆/文风召回目标', proseBriefFirstValue(benchmark.style_targets, benchmark.styleTargets, benchmark.recall_targets, benchmark.recallTargets, brief.benchmark_recall_gaps, brief.benchmarkRecallGaps))
  pushProseBriefLine(lines, '标杆禁区', proseBriefFirstValue(benchmark.avoid_patterns, benchmark.avoidPatterns, benchmark.forbidden_patterns, benchmark.forbiddenPatterns))
  if (Object.keys(benchmark).length > 0) {
    lines.push('- 文风召回权威规则：剧情/情绪模块.md 与 剧情/节奏.md 管情绪和节奏，文风.md 只管表达层；冲突时以 剧情/情绪模块.md 和 剧情/节奏.md 为准；不得复制对标桥段、设定、角色名或原句。')
  }

  if (Object.keys(styleSample).length > 0) {
    lines.push('- 本章风格样章策略：按 applicable_scenes / avoid_scenes 选择样章策略；只学习叙述节奏、句式密度、对白比例和情绪转折；不得复制样章桥段、专有设定、角色名、核心梗或原句。')
  }
  pushProseBriefLine(lines, 'style_sample_enabled', proseBriefFirstValue(styleSample.enabled, styleSample.is_enabled, styleSample.isEnabled))
  pushProseBriefLine(lines, 'style_sample_apply_to', proseBriefFirstValue(styleSample.apply_to, styleSample.applyTo, styleSample.applicable_scenes, styleSample.applicableScenes))
  pushProseBriefLine(lines, 'style_sample_samples', proseBriefFirstValue(styleSample.samples, styleSample.selected_samples, styleSample.selectedSamples), { limit: 1800 })
  pushProseBriefLine(lines, 'style_sample_do_not_copy', proseBriefFirstValue(styleSample.do_not_copy, styleSample.doNotCopy, styleSample.copy_boundary_rules, styleSample.copyBoundaryRules), { limit: 1000 })
  pushProseBriefLine(lines, 'style_sample_unsafe_direct_phrases', proseBriefFirstValue(styleSample.unsafe_direct_phrases, styleSample.unsafeDirectPhrases), { limit: 800 })

  pushProseBriefLine(lines, '风格边界必须保留', proseBriefFirstValue(styleBoundary.must_keep, styleBoundary.mustKeep, styleBoundary.keep, brief.style_must_keep, brief.styleMustKeep))
  pushProseBriefLine(lines, '风格边界必须避免', proseBriefFirstValue(styleBoundary.must_avoid, styleBoundary.mustAvoid, styleBoundary.avoid, brief.style_must_avoid, brief.styleMustAvoid))

  if (!lines.length) return ''
  return [
    '\n【oh-story 写前确认】',
    '以下是正文动笔前已经确认的 Step 2 约束，必须直接落实到 chapter_text 和 oh_story_delivery_receipts.pre_draft_execution_receipts 中：',
    ...lines,
  ].join('\n')
}

function buildNextChapterQualityPlanPrompt(chapterDraft: Record<string, any>, context: Record<string, any>): string {
  const target = proseBriefFirstObject(context?.chapter_target, context?.chapterTarget)
  const brief = proseBriefFirstObject(
    context?.pre_draft_brief,
    context?.preDraftBrief,
    context?.confirmed_pre_draft_brief,
    context?.confirmedPreDraftBrief,
    target.pre_draft_brief,
    target.preDraftBrief,
    chapterDraft?.pre_draft_brief,
    chapterDraft?.preDraftBrief,
  )
  const deliveryReceipts = proseBriefFirstObject(
    context?.oh_story_delivery_receipts,
    context?.ohStoryDeliveryReceipts,
    target.oh_story_delivery_receipts,
    target.ohStoryDeliveryReceipts,
    brief.oh_story_delivery_receipts,
    brief.ohStoryDeliveryReceipts,
    chapterDraft?.oh_story_delivery_receipts,
    chapterDraft?.ohStoryDeliveryReceipts,
  )
  const plan = proseBriefFirstObject(
    brief.next_chapter_quality_plan,
    brief.nextChapterQualityPlan,
    target.next_chapter_quality_plan,
    target.nextChapterQualityPlan,
    context?.next_chapter_quality_plan,
    context?.nextChapterQualityPlan,
    deliveryReceipts.next_chapter_quality_plan,
    deliveryReceipts.nextChapterQualityPlan,
    chapterDraft?.next_chapter_quality_plan,
    chapterDraft?.nextChapterQualityPlan,
  )
  const lines: string[] = []

  pushProseBriefLine(lines, '质量焦点', proseBriefFirstValue(plan.quality_focus, plan.qualityFocus))
  pushProseBriefLine(lines, '开篇动作', proseBriefFirstValue(plan.opening_actions, plan.openingActions))
  pushProseBriefLine(lines, '中段动作', proseBriefFirstValue(plan.middle_actions, plan.middleActions))
  pushProseBriefLine(lines, '章末动作', proseBriefFirstValue(plan.ending_actions, plan.endingActions))
  pushProseBriefLine(lines, '禁止重复', proseBriefFirstValue(plan.avoid_repetition, plan.avoidRepetition, plan.forbidden_repeats, plan.forbiddenRepeats))
  pushProseBriefLine(lines, '依据证据', proseBriefFirstValue(plan.evidence_basis, plan.evidenceBasis), { limit: 800 })

  if (!lines.length) return ''
  return [
    '\n【oh-story 质量续航】',
    '以下是上一章写后诊断给本章的质量续航计划，必须转成可见正文动作，并写入 oh_story_delivery_receipts.pre_draft_execution_receipts.next_chapter_quality_plan_receipts：',
    ...lines,
  ].join('\n')
}

// ── Prose Agent Prompt (核心修复点) ──

export function buildProsePrompt(
  project: NovelProjectRecord,
  chapterDraft: Record<string, any>,
  context: {
    worldbuilding?: any;
    characters?: any;
    outline?: any;
    prevChapters?: Array<Record<string, any>>;
    pre_draft_brief?: any;
    preDraftBrief?: any;
    confirmed_pre_draft_brief?: any;
    confirmedPreDraftBrief?: any;
    chapter_target?: any;
    chapterTarget?: any;
  },
): string {
  const parts: string[] = []

  parts.push(`任务：创作第 ${chapterDraft.chapter_no || '?'} 章正文`)
  parts.push(`作品标题：${project.title}`)
  parts.push(`章节标题：${chapterDraft.title || '无标题'}`)

  // 本章细纲 — 这是正文创作的蓝图
  const chapterSummary = chapterDraft.chapter_summary || chapterDraft.summary || ''
  const chapterConflict = chapterDraft.conflict || ''
  const chapterEndingHook = chapterDraft.ending_hook || ''
  const chapterScenes = chapterDraft.scenes || chapterDraft.scene_breakdown || []
  const chapterContinuityFromPrev = chapterDraft.continuity_from_prev || ''
  const chapterItemsInPlay = chapterDraft.items_in_play || []

  if (chapterSummary) parts.push(`\n【本章细纲】\n核心事件：${chapterSummary}`)
  if (chapterConflict) parts.push(`冲突焦点：${chapterConflict}`)
  if (chapterEndingHook) parts.push(`结尾悬念（本章结束时必须到达的状态）：${chapterEndingHook}`)
  if (chapterScenes.length > 0) {
    parts.push('场景序列：')
    for (const scene of chapterScenes) {
      const loc = typeof scene === 'string' ? scene : (scene.location || scene.title || JSON.stringify(scene))
      const action = typeof scene === 'object' && scene !== null ? (scene.action || scene.description || '') : ''
      const tone = typeof scene === 'object' && scene !== null ? (scene.emotional_tone || scene.tone || '') : ''
      parts.push(`  - ${loc}${action ? ' → ' + action : ''}${tone ? ' [' + tone + ']' : ''}`)
    }
  }
  if (chapterContinuityFromPrev) parts.push(`衔接说明：${chapterContinuityFromPrev}`)
  if (chapterItemsInPlay.length > 0) parts.push(`涉及物品：${Array.isArray(chapterItemsInPlay) ? chapterItemsInPlay.join('、') : chapterItemsInPlay}`)

  // 世界观设定 — 约束创作的边界
  if (context.worldbuilding) {
    const wb = context.worldbuilding
    const rules = Array.isArray(wb.rules) ? wb.rules.join('；') : (typeof wb.rules === 'string' ? wb.rules : '')
    const factions = Array.isArray(wb.factions) ? wb.factions.map((f: any) => f.name || f).join('、') : ''
    parts.push('\n【世界观约束】')
    if (wb.world_summary) parts.push(`概述：${wb.world_summary}`)
    if (rules) parts.push(`核心规则：${rules}`)
    if (factions) parts.push(`势力：${factions}`)
    // 物品清单
    if (Array.isArray(wb.items)) {
      const items = wb.items.map((it: any) => `${it.name}(${it.description || it.ability || ''})`).join('；')
      if (items) parts.push(`关键物品：${items}`)
    }
  }

  // 角色设定 — 每个角色的性格和状态决定了他们的行为
  if (context.characters) {
    const chars = Array.isArray(context.characters) ? context.characters : (context.characters.characters || [])
    if (chars.length > 0) {
      parts.push('\n【角色设定】')
      for (const char of chars) {
        const name = char.name || char.character_name || '未知'
        const role = char.role || ''
        const personality = Array.isArray(char.personality) ? char.personality.join('，') : (char.personality || '')
        const motivation = char.motivation || ''
        const goal = char.goal || ''
        const abilities = Array.isArray(char.abilities) ? char.abilities.join('、') : (char.abilities || '')
        const appearance = char.appearance || ''
        const state = char.current_state ? JSON.stringify(char.current_state).slice(0, 500) : ''
        parts.push(`  ${name} [${role}] 性格：${personality} 动机：${motivation} 目标：${goal} 能力：${abilities} 外貌：${appearance} 当前状态：${state}`)
      }
    }
  }

  // ========== 最关键的部分：前章结尾状态 ==========
  if (context.prevChapters && context.prevChapters.length > 0) {
    // 取最近的一章作为直接衔接
    const lastChapter = context.prevChapters[context.prevChapters.length - 1]
    const lastText = lastChapter.chapter_text || ''

    // 提取上一章的结尾状态（最后 800 字）
    const endingText = lastText.length > 800 ? lastText.slice(-800) : lastText

    // 尝试提取上一章的结尾悬念
    const lastEndingHook = lastChapter.ending_hook || ''

    parts.push('\n【← 上一章衔接（必须从这里延续）】')
    parts.push(`上一章标题：第${lastChapter.chapter_no}章「${lastChapter.title || '无标题'}」`)

    if (lastEndingHook) {
      parts.push(`上一章结尾悬念：${lastEndingHook}`)
    }

    if (endingText) {
      parts.push(`上一章结尾场景（最后片段）：\n${endingText}`)
    }

    // 如果有更早的章节，提供摘要
    if (context.prevChapters.length > 1) {
      parts.push('\n更早的章节摘要：')
      for (const prev of context.prevChapters.slice(0, -1)) {
        const prevSummary = prev.chapter_summary || prev.summary || ''
        parts.push(`  第${prev.chapter_no}章「${prev.title}」：${prevSummary || (prev.chapter_text || '').slice(0, 200)}`)
      }
    }

    // 关键指令：告诉 LLM 如何衔接
    parts.push('\n⚠️ 衔接指令：')
    parts.push('- 本章的第一句话/第一个场景必须自然地延续上一章结尾的状态')
    parts.push('- 角色在上一章结尾的位置、情绪、手里的物品，在本章开始时必须一致')
    parts.push('- 不得出现"场景突然切换"而没有过渡')
    parts.push('- 如果上一章结尾有未完成的动作或对话，本章开头必须先完成它')
  }

  // 伏笔提示
  if (chapterDraft.foreshadowing) {
    parts.push(`\n【本章伏笔】${chapterDraft.foreshadowing}`)
  }

  const confirmedPreDraftBriefPrompt = buildConfirmedPreDraftBriefPrompt(chapterDraft, context as any)
  if (confirmedPreDraftBriefPrompt) parts.push(confirmedPreDraftBriefPrompt)

  const nextChapterQualityPlanPrompt = buildNextChapterQualityPlanPrompt(chapterDraft, context as any)
  if (nextChapterQualityPlanPrompt) parts.push(nextChapterQualityPlanPrompt)

  // 全局写作约束
  parts.push(`\n\n【写作约束】`)
  parts.push(`1. 本章目标篇幅：${project.length_target === 'short' ? '1800-2500字' : '2800-3500字'}`)
  parts.push(`2. 叙事风格：${(project.style_tags || []).join('、') || '第一人称/第三人称混合叙事'}`)
  parts.push(`3. 对话与描写的比例：对话驱动，描写为辅，每3段对话至少配1段环境/心理描写`)
  parts.push(`4. 不得出现 OOC（角色性格偏离）`)
  parts.push(`5. 不得使用"时间过得很快"、"几天后"之类的跳跃，必须有具体的过渡场景`)
  parts.push(`6. 本章结尾必须到达细纲中指定的 ending_hook 状态：${chapterEndingHook || '自然结束'}`)
  parts.push(`7. 只允许输出第 ${chapterDraft.chapter_no || '?'} 章《${chapterDraft.title || '无标题'}》，不得输出其他章节、续章或目录`)
  parts.push('8. 正文元信息清洁：chapter_text 标题行以外不得出现“上一章/本章/前文/后文/伏笔/细纲/读者/第X章”等作者视角或工程词；必须改成角色当下能感知的事件锚点或相对时间，例如“门牌翻面那一刻”“刚才那句话”“那枚旧印”。')
  parts.push('9. oh-story交付回执：正文生成后必须输出可审计回执，让后续质检能按正文证据闭环，不得只写“已完成”。')
  parts.push('10. oh-story 日更工作流：写正文前按状态筛选、文风召回、意图确认、章节蓝图/场景卡门禁执行；状态筛选只加载/只使用会影响本章正确性的状态，也就是不知道就会写错的信息。')
  parts.push('11. 场景执行门禁：每个场景必须按 goal -> obstacle -> action -> turn -> payoff -> state_delta 写成因果链；turn 是冲突转折或信息变化，payoff 是读者可见回报，state_delta 写清角色、资产、关系、伏笔、规则或读者期待改变了什么。')
  parts.push(`12. 单章串行边界：本次调用只负责第 ${chapterDraft.chapter_no || '?'} 章；不得替外层批量流程生成第 ${Number(chapterDraft.chapter_no || 0) + 1 || '?'} 章或后续章节，不得把多章同时写入 prose_chapters。下一章必须等本章正文、oh_story_delivery_receipts 和状态写回落库后，由外层工作流重新构建上下文包再开始。`)

  // 输出格式指令
  parts.push(`\n\n输出格式：JSON，包含字段 prose_chapters，其中每个元素包含：chapter_no, title, chapter_text, scene_breakdown, continuity_notes, oh_story_delivery_receipts`)
  parts.push(`prose_chapters 数组只能包含一项，chapter_no 必须严格等于 ${chapterDraft.chapter_no || '?'}`)
  parts.push(`chapter_text 是完整的正文内容，使用纯文本格式（不要使用 markdown 标题等格式标记）`)
  parts.push(`scene_breakdown 是场景分解数组，每个元素包含 scene_no, description, characters_present, scene_card_receipts`)
  parts.push(`continuity_notes 是连续性备注数组，说明本章如何与上一章衔接`)
  parts.push('oh_story_delivery_receipts 必须包含 chapter_blueprint, pre_draft_execution_receipts, scene_card_receipts, delivery_risk_receipts, revision_receipts；所有回执必须同时写入 oh_story_delivery_receipts，不能只散落在章节顶层或 scene_breakdown。')
  parts.push('oh_story_delivery_receipts.chapter_blueprint 必须回写本章任务书兑现情况，至少包含 objective, conflict, ending_hook, must_deliver, forbidden_leaps')
  parts.push('oh_story_delivery_receipts.pre_draft_execution_receipts 必须证明写前准备、写前意图、状态筛选、文风/标杆召回、上一章质量续航计划已经落入正文，包含 write_preparation_checks, status_filter_receipts, intent_confirmation_checks, benchmark_recall_checks, style_sample_checks, next_chapter_quality_plan_receipts')
  parts.push('write_preparation_checks 必须覆盖来源缺口、资产风险、蓝图焦点、读者回报焦点和执行顺序；每项包含 key, delivered, evidence, remaining_risk。')
  parts.push('benchmark_recall_checks 必须逐项覆盖 selected_emotion_module、rhythm_reference、style_profile_summary、matched_chapter_techniques、canonical_source_rules 和 gaps；若 gaps 记录 conflict/module_rhythm_conflict，必须说明正文如何按 剧情/情绪模块.md 与 剧情/节奏.md 的权威优先级执行；若 matched_deep_dive_missing 为 true，必须说明已用黄金三章/文风技巧回退；不得复制对标桥段、设定、角色名或原句。')
  parts.push('style_sample_checks 必须覆盖样章策略执行、适用场景、避用场景和复制边界；必须说明正文只学习叙述节奏、句式密度、对白比例和情绪转折，且没有复制样章桥段、专有设定、角色名、核心梗或原句。')
  parts.push('next_chapter_quality_plan_receipts 必须覆盖质量焦点、开篇动作、中段动作、章末动作、禁止重复和依据证据；每项包含 key, delivered, evidence, remaining_risk，未落地时必须写出下一轮承接风险。')
  parts.push('status_filter_receipts 必须证明只加载/只使用会影响本章正确性的状态；已使用项写 evidence，排除项写 excluded_reason，说明为什么不会导致本章写错。')
  parts.push('pre_draft_execution_receipts 中每条检查必须包含 key, delivered, evidence, remaining_risk；evidence 必须引用 chapter_text 中的动作、对白、节拍分配、情绪转折或状态承接证据')
  parts.push('oh_story_delivery_receipts.scene_card_receipts 必须逐场景对应 scene_breakdown，包含 scene_no, scene_goal, obstacle, action, turn, payoff, state_delta, delivered, evidence；evidence 必须引用 chapter_text 中的原句或动作结果')
  parts.push('oh_story_delivery_receipts.delivery_risk_receipts 必须列出开篇承接、核心冲突、读者回报、章末钩子、伏笔/状态写回是否兑现，包含 risk_item, delivered, changed_evidence, remaining_risk')
  parts.push('oh_story_delivery_receipts.revision_receipts 必须说明本次生成如何处理细纲职责、上一章承接、场景卡、状态变化和伏笔增量；每条包含 required_action, applied_fix, changed_evidence')
  parts.push('所有 changed_evidence/evidence 必须引用 chapter_text 中的原句、动作、对白或状态结果，不得只写“已完成”“已体现”“已修复”。')
  parts.push(`⚠️ 绝对不要返回 "# 第X章：标题" 这样的 markdown 格式，chapter_text 必须直接是正文内容`)

  return parts.join('\n')
}

// ── Platform Fit Agent Prompt ──

