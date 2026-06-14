import {
  createNovelReview,
  listNovelChapterSettingUsage,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelSettingEntities,
  listNovelWorldbuilding,
  replaceNovelChapterSettingUsage,
  updateNovelChapter,
  updateNovelCharacter,
  updateNovelChapterSettingUsage,
  updateNovelProject,
  updateNovelSettingEntity,
} from '../novel'
import { executeNovelAgent, generateNovelChapterProse, previewNovelKnowledgeInjection } from '../llm'
import type { NovelProductionService } from './novel-production-service'
import type { NovelReferenceService } from './novel-reference-service'
import {
  asArray,
  buildPreflightChecks,
  buildLLMResultDiagnostics,
  collectRecentFacts,
  compactText,
  deepMergeObjects,
  extractPlainProseFallback,
  getNovelPayload,
  getQualityGateDecision,
  getSafetyPolicy,
  getStoryState,
  getStyleLock,
  getVolumePlan,
  normalizeIssue,
  parseJsonLikePayload,
} from './novel-route-utils'

const STORYLINE_TYPES = ['mainline', 'subplot', 'character_arc', 'relationship_arc', 'faction_arc', 'foreshadowing_arc']
const DISCOVERED_ASSET_TYPES = ['character', 'item', 'ability', 'faction', 'location', 'foreshadowing']

export type ChapterWordTarget = {
  mode: 'standard' | 'long' | 'custom'
  label: string
  target: number
  min: number
  max: number
  rangeText: string
}

function clampWordTarget(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 3000
  return Math.min(12000, Math.max(1000, Math.round(value)))
}

export function resolveChapterWordTarget(project: any, chapter: any, options: any = {}): ChapterWordTarget {
  const raw = options.word_target || chapter?.raw_payload?.word_target || project?.reference_config?.chapter_word_target || {}
  const requestedMode = String(options.word_target_mode || raw.mode || raw.word_target_mode || '').toLowerCase()
  const requestedTarget = Number(options.target_word_count || raw.target || raw.target_word_count || 0)

  if (requestedMode === 'long') {
    return {
      mode: 'long',
      label: '长章',
      target: 10000,
      min: 9000,
      max: 11000,
      rangeText: '9000-11000 字',
    }
  }

  if (requestedMode === 'custom' || requestedTarget > 0) {
    const target = clampWordTarget(requestedTarget)
    const min = Math.max(800, Math.round(target * 0.9))
    const max = Math.round(target * 1.1)
    return {
      mode: 'custom',
      label: `自定义 ${target} 字`,
      target,
      min,
      max,
      rangeText: `${min}-${max} 字`,
    }
  }

  return {
    mode: 'standard',
    label: '标准章',
    target: 3000,
    min: 2800,
    max: 3500,
    rangeText: '2800-3500 字',
  }
}

export function applyChapterWordTargetToContext(contextPackage: any, target: ChapterWordTarget) {
  return {
    ...(contextPackage || {}),
    chapter_target: {
      ...((contextPackage || {}).chapter_target || {}),
      word_target: target,
    },
    style_lock: {
      ...((contextPackage || {}).style_lock || {}),
      chapter_word_range: target.rangeText,
    },
  }
}

export function proseMaxTokensForWordTarget(target: ChapterWordTarget | null | undefined) {
  const targetWords = Number(target?.target || 3000)
  if (targetWords >= 9000) return 18000
  if (targetWords >= 6000) return 14000
  return 8000
}

export type ProseWordTargetEvaluation = {
  actual: number
  target: number
  min: number
  max: number
  deficit: number
  too_short: boolean
  too_long: boolean
  passed: boolean
}

export function countProseChars(text: string) {
  return String(text || '').replace(/\s/g, '').length
}

export function evaluateProseWordTarget(text: string, target: ChapterWordTarget | null | undefined): ProseWordTargetEvaluation {
  const actual = countProseChars(text)
  const min = Number(target?.min || 0)
  const max = Number(target?.max || 0)
  const targetCount = Number(target?.target || 0)
  const tooShort = min > 0 && actual < min
  return {
    actual,
    target: targetCount,
    min,
    max,
    deficit: tooShort ? min - actual : 0,
    too_short: tooShort,
    too_long: max > 0 && actual > max,
    passed: !tooShort,
  }
}

export function buildProseWordTargetExpansionPrompt(project: any, contextPackage: any, chapterText: string, evaluation: ProseWordTargetEvaluation, options: any = {}) {
  const target = contextPackage?.chapter_target?.word_target || {}
  const attempt = Number(options.attempt || 1)
  const maxAttempts = Number(options.maxAttempts || 1)
  const deficit = Math.max(0, Number(evaluation.deficit || 0))
  return [
    '任务：将本章正文扩写到商业网文标准章节长度。',
    `作品标题：${project.title || '未命名作品'}`,
    `目标章节：第${contextPackage?.chapter_target?.chapter_no || '?'}章《${contextPackage?.chapter_target?.title || '无标题'}》`,
    maxAttempts > 1 ? `这是第 ${attempt} 轮补写，共最多 ${maxAttempts} 轮。` : '',
    `当前正文约 ${evaluation.actual} 字，目标 ${evaluation.target || target.target || 3000} 字，至少 ${evaluation.min || target.min || 2800} 字，可接受上限 ${evaluation.max || target.max || 3500} 字。`,
    deficit > 0 ? `当前仍缺至少 ${deficit} 字；本轮必须优先补足缺口，再检查章节结尾是否自然。` : '',
    '硬性要求：不得删改已有效内容，不得把正文改成大纲、摘要或设定说明；必须保留本章主线、角色状态、章末钩子和已经成立的连续性。',
    '扩写重点：扩写动作过程、选择代价、对话交锋、章末钩子铺垫；补足每个场景的行动链、反应链、信息变化和后果，不要靠堆砌环境描写凑字数。',
    '如果原文有跳跃、略写或只写结果的段落，请在原位置自然补充过程；如果对话过少，请补充带冲突目标的对话；如果章末钩子过弱，请强化但不要开启下一章剧情。',
    '',
    '【结构化上下文包】',
    JSON.stringify(contextPackage || {}, null, 2).slice(0, 9000),
    '',
    '【当前过短正文】',
    chapterText.slice(0, 18000),
    '',
    '输出 JSON，包含 prose_chapters 数组。数组只能有一项，且必须包含 chapter_no, title, chapter_text, scene_breakdown, continuity_notes。chapter_text 必须返回扩写后的完整正文，不要只返回新增段落，不要 markdown 标题。',
  ].filter(Boolean).join('\n')
}

export function extractProseExpansionPayload(result: any) {
  const payload = getNovelPayload(result)
  const expandedFirst = Array.isArray(payload?.prose_chapters) ? payload.prose_chapters[0] : payload
  return {
    text: String(expandedFirst?.chapter_text || payload?.chapter_text || ''),
    scene_breakdown: expandedFirst?.scene_breakdown || payload?.scene_breakdown || [],
    continuity_notes: expandedFirst?.continuity_notes || payload?.continuity_notes || [],
    payload,
  }
}

export function buildCommercialEditorRewritePrompt(project: any, contextPackage: any, chapterText: string, options: any = {}) {
  const target = contextPackage?.chapter_target?.word_target || {}
  return [
    '任务：商业主编改稿。你不是重新写新剧情，而是在保留本章事实、人物状态和设定约束的前提下，把初稿改成更像可连载商业网文的版本。',
    `作品标题：${project.title || '未命名作品'}`,
    `目标章节：第${contextPackage?.chapter_target?.chapter_no || '?'}章《${contextPackage?.chapter_target?.title || '无标题'}》`,
    target?.target ? `字数约束：目标 ${target.target} 字，可接受范围 ${target.min}-${target.max} 字。改稿后不得低于下限，不能为追求精炼而明显缩短。` : '',
    options?.phase ? `改稿阶段：${options.phase}` : '',
    '',
    '【主编改稿重点】',
    '1. 开篇钩子：前 300 字必须给出事故、异常、危险、欲望或反常信息，不要平铺醒来和解释。',
    '2. 人物声音：主角、智者、求生者等角色说话方式要可区分；减少通用惊讶、通用冷静和旁白替角色总结。',
    '3. 规则压力：把规则的触发条件、倒计时、违规代价和角色选择压力写成可见事件。',
    '4. 恐怖具象化：少用“诡异、阴森、压抑”等空泛词，多写声音、光线、物体、身体反应和空间变化。',
    '5. 爽点密度：每 800-1200 字至少有一次信息推进、能力展示、危机反制、关系变化或小回收。',
    '6. 章末钩子：结尾必须把 ending_hook 或 scene_cards.ending_hook_seed 强化成下一章非看不可的问题。',
    '7. 删除模板句：删掉“不是那么简单”“拉开序幕”“已然”等模板化总结，替换成具体动作和后果。',
    '8. 不得改写主线事实，不得新增破坏后续大纲的设定；setting_context 的 forbidden/knowledge_scope 必须遵守。',
    '9. 如果 chapter_target.meme_strategy 存在，只能按其 allowed_functions 做克制型网感表达；不得直接复刻 meme_bank 中的原梗或流行语。',
    '',
    '【结构化上下文包】',
    JSON.stringify(contextPackage || {}, null, 2).slice(0, 10000),
    '',
    '【待改稿正文】',
    chapterText.slice(0, 22000),
    '',
    '输出 JSON，包含 prose_chapters 数组。数组只能有一项，且必须包含 chapter_no, title, chapter_text, scene_breakdown, continuity_notes；同时输出 editor_report，说明 applied_changes(array)、remaining_risks(array)、word_count_estimate(number)。chapter_text 必须是改稿后的完整正文，不要 markdown 标题。',
  ].filter(Boolean).join('\n')
}

function compactBriefText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function buildPreviousChapterHandoff(contextPackage: any) {
  const target = contextPackage?.chapter_target || {}
  const explicit = compactBriefText(
    target.previous_handoff
      || target.previousHandoff
      || target.chapter_handoff_contract?.previous_handoff
      || target.chapterHandoffContract?.previous_handoff
      || contextPackage?.previous_handoff
      || contextPackage?.chapter_handoff_contract?.previous_handoff
      || contextPackage?.batch_preflight?.chapter_handoff_contract?.previous_handoff
      || contextPackage?.batch_preflight?.chapterHandoffContract?.previous_handoff
      || contextPackage?.pre_draft_brief?.previous_handoff,
  )
  if (explicit) return explicit

  const previous = contextPackage?.continuity?.previous_chapter || null
  if (!previous) return ''
  const label = previous.chapter_no
    ? `第${previous.chapter_no}章${previous.title ? `《${previous.title}》` : ''}`
    : '上一章'
  const endingHook = compactBriefText(previous.ending_hook)
  const endingExcerpt = compactBriefText(previous.ending_excerpt)
  const parts = [
    endingHook ? `章末钩子：${endingHook}` : '',
    endingExcerpt ? `最后一幕：${compactText(endingExcerpt, 180)}` : '',
  ].filter(Boolean)
  return parts.length ? `${label} ${parts.join('；')}` : ''
}

function handoffContractItemText(item: any) {
  if (typeof item === 'string') return compactBriefText(item)
  return compactBriefText(item?.text || item?.label || item?.name || item?.summary || item?.detail || item?.title || item?.issue)
}

function handoffContractTextItems(value: any, limit = 12) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of asArray(value)) {
    const normalized = handoffContractItemText(item)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
    if (result.length >= limit) break
  }
  return result
}

function normalizeGovernanceRecheckMemoryContext(value: any) {
  const raw = value?.governance_recheck_memory || value?.governanceRecheckMemory || value || null
  if (!raw || typeof raw !== 'object') return null
  const evidence = handoffContractTextItems([
    ...asArray(raw.evidence),
    ...asArray(raw.repaired_evidence),
    ...asArray(raw.repairedEvidence),
  ], 8)
  const failedEvidence = handoffContractTextItems([
    ...asArray(raw.failed_evidence),
    ...asArray(raw.failedEvidence),
  ], 8)
  const watchItems = handoffContractTextItems([
    ...asArray(raw.watch_items),
    ...asArray(raw.watchItems),
  ], 8)
  const rawStatus = compactBriefText(raw.status)
  const summary = compactBriefText(raw.summary)
  const sourceRunId = raw.source_run_id ?? raw.sourceRunId ?? null
  const storylineDecisionTaskCount = Math.max(0, Number(raw.storyline_decision_task_count ?? raw.storylineDecisionTaskCount ?? 0) || 0)
  const hasMemory = Boolean(
    rawStatus
      || compactBriefText(raw.label)
      || summary
      || sourceRunId
      || evidence.length
      || failedEvidence.length
      || watchItems.length
      || storylineDecisionTaskCount,
  )
  if (!hasMemory) return null

  const status = rawStatus === 'closed' && failedEvidence.length === 0 && storylineDecisionTaskCount === 0
    ? 'closed'
    : rawStatus === 'closed'
      ? 'needs_followup'
      : rawStatus === 'needs_followup'
        ? 'needs_followup'
        : failedEvidence.length > 0 || storylineDecisionTaskCount > 0
          ? 'needs_followup'
          : 'closed'

  return {
    source_run_id: sourceRunId,
    status,
    label: compactBriefText(raw.label, status === 'closed' ? '治理复查已记录' : '治理复查待处理'),
    summary: summary || (status === 'closed'
      ? '上一轮治理复查已闭环，本章继续继承修后证据和观察项。'
      : '上一轮治理复查仍有待处理项，本章必须先承接失效依据和观察项。'),
    evidence,
    failed_evidence: failedEvidence,
    watch_items: watchItems,
    storyline_decision_task_count: storylineDecisionTaskCount,
  }
}

function normalizeBatchChapterHandoffContract(value: any) {
  const raw = value?.chapter_handoff_contract || value?.chapterHandoffContract || value || {}
  const previousHandoff = compactBriefText(raw.previous_handoff || raw.previousHandoff)
  const openingObligations = handoffContractTextItems(raw.opening_obligations || raw.openingObligations)
  const expectationCarryOver = handoffContractTextItems(raw.expectation_carry_over || raw.expectationCarryOver)
  const mustDeliver = handoffContractTextItems(raw.must_deliver || raw.mustDeliver)
  const keepAlive = handoffContractTextItems(raw.keep_alive || raw.keepAlive)
  const overdue = handoffContractTextItems(raw.overdue || raw.overdue_items || raw.overdueItems)
  const hasContract = previousHandoff
    || openingObligations.length
    || expectationCarryOver.length
    || mustDeliver.length
    || keepAlive.length
    || overdue.length
  if (!hasContract) return null
  return {
    source: compactBriefText(raw.source, 'safe_batch_chapter_handoff_contract'),
    from_chapter_no: Number(raw.from_chapter_no || raw.fromChapterNo || 0) || null,
    apply_to_chapter_no: Number(raw.apply_to_chapter_no || raw.applyToChapterNo || 0) || null,
    previous_handoff: previousHandoff,
    opening_obligations: openingObligations,
    expectation_carry_over: expectationCarryOver,
    must_deliver: mustDeliver,
    keep_alive: keepAlive,
    overdue,
    policy: compactBriefText(raw.policy, '安全连写第一章必须先接住上一章最后一幕和读者期待债务。'),
  }
}

function sceneBriefFromCard(card: any, index: number) {
  return {
    scene_no: Number(card?.scene_no || index + 1),
    title: compactBriefText(card?.title, `场景${index + 1}`),
    purpose: compactBriefText(card?.purpose || card?.beat),
    conflict: compactBriefText(card?.conflict),
    opening_hook: compactBriefText(card?.opening_hook || card?.hook_opening),
    reader_payoff: compactBriefText(card?.reader_payoff || card?.payoff),
    fear_point: compactBriefText(card?.fear_point || card?.terror_point),
    rule_pressure: compactBriefText(card?.rule_pressure || card?.rule_trigger),
    information_gap: compactBriefText(card?.information_gap),
    reversal: compactBriefText(card?.reversal || card?.turning_point),
    ending_hook_seed: compactBriefText(card?.ending_hook_seed || card?.ending_hook || card?.exit_state),
    word_budget: compactBriefText(card?.word_budget || card?.description_budget),
  }
}

function buildReaderRetentionBrief(project: any, contextPackage: any, sceneBriefs: any[]) {
  const chapterTarget = contextPackage?.chapter_target || {}
  const writingBible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const firstScene = sceneBriefs[0] || {}
  const lastScene = sceneBriefs[sceneBriefs.length - 1] || {}
  const readerPayoffs = sceneBriefs.map((item: any) => item.reader_payoff).filter(Boolean)
  const informationGaps = sceneBriefs.map((item: any) => item.information_gap).filter(Boolean)
  const reversals = sceneBriefs.map((item: any) => item.reversal).filter(Boolean)
  const retentionStrategy = firstDefined(
    writingBible?.commercial_positioning?.retention_strategy,
    writingBible?.retention_strategy,
    project?.reference_config?.writing_bible?.commercial_positioning?.retention_strategy,
  )
  return {
    opening_hook: compactBriefText(firstDefined(
      chapterTarget.opening_hook,
      firstScene.opening_hook,
      firstScene.purpose,
      chapterTarget.summary,
    )),
    payoff_promise: compactBriefText(firstDefined(
      readerPayoffs.join('；'),
      chapterTarget.reader_payoff,
      chapterTarget.payoff,
      writingBible?.style_lock?.payoff_density,
      retentionStrategy,
    )),
    information_gap: compactBriefText(firstDefined(
      informationGaps.join('；'),
      chapterTarget.information_gap,
      chapterTarget.conflict,
    )),
    emotional_reward: compactBriefText(firstDefined(
      writingBible?.promise,
      writingBible?.reader_promise,
      project?.reference_config?.writing_bible?.promise,
      project?.synopsis,
      readerPayoffs.join('；'),
    )),
    short_drama_scene: compactBriefText([
      firstScene.title,
      firstDefined(firstScene.conflict, firstScene.reversal, firstScene.reader_payoff, reversals[0], chapterTarget.conflict),
    ].filter(Boolean).join('：')),
    ending_question: compactBriefText(firstDefined(
      chapterTarget.ending_hook,
      lastScene.ending_hook_seed,
      lastScene.reversal,
    )),
    forbidden_cliches: Array.from(new Set([
      '只写环境氛围不推进目标',
      '用长篇背景解释替代现场危机',
      '章末用模板总结代替追读问题',
      '爽点只停留在旁白承诺不落成动作',
      ...asArray(chapterTarget.forbidden_cliches),
    ].map((item: any) => String(item || '').trim()).filter(Boolean))).slice(0, 8),
  }
}

function firstMatchingBrief(items: any[], pattern: RegExp) {
  return uniqueBriefStrings(items, 20).find(item => pattern.test(item)) || ''
}

function normalizeReaderDropRiskBrief(value: any, readerRetentionBrief: any = null, first30RetentionBrief: any = null) {
  const raw = value?.reader_drop_risk_brief || value?.readerDropRiskBrief || value || {}
  const dropPoints = uniqueBriefStrings(raw.drop_points || raw.dropPoints || raw.risks || [], 10)
  const pullPoints = uniqueBriefStrings(raw.pull_points || raw.pullPoints || raw.reader_pull || raw.readerPull || [], 8)
  const repairActions = uniqueBriefStrings(raw.repair_actions || raw.repairActions || raw.required_actions || raw.requiredActions || [], 10)
  const first30Flags = uniqueBriefStrings(first30RetentionBrief?.flags || [], 6)
  const first30Actions = uniqueBriefStrings(first30RetentionBrief?.required_actions || first30RetentionBrief?.requiredActions || [], 6)
  const openingGuardrail = compactBriefText(
    raw.opening_guardrail
    || raw.openingGuardrail
    || firstMatchingBrief([...repairActions, ...dropPoints, ...first30Actions, ...first30Flags], /开篇|开场|前\s*300|前三章|第1章|第一章|起手/)
    || (readerRetentionBrief?.opening_hook ? `开篇 300 字必须落地：${readerRetentionBrief.opening_hook}` : ''),
  )
  const middleGuardrail = compactBriefText(
    raw.middle_guardrail
    || raw.middleGuardrail
    || firstMatchingBrief([...repairActions, ...dropPoints, ...first30Actions, ...first30Flags], /中段|解释|设定|节奏|场景|试读十章|第4-10|掉速|水/)
    || repairActions.find((item: string) => item !== openingGuardrail && !/章末|钩子|结尾|翻页/.test(item))
    || '',
  )
  const endingGuardrail = compactBriefText(
    raw.ending_guardrail
    || raw.endingGuardrail
    || firstMatchingBrief([...repairActions, ...dropPoints, ...first30Actions, ...first30Flags], /章末|钩子|结尾|翻页|未解|下一章|最后/)
    || (readerRetentionBrief?.ending_question ? `章末必须压出追读问题：${readerRetentionBrief.ending_question}` : ''),
  )
  const status = compactBriefText(raw.status, dropPoints.length || repairActions.length || first30Flags.length ? 'needs_repair' : 'ready')
  const qualityBar = compactBriefText(raw.quality_bar || raw.qualityBar || raw.quality_bar_label || raw.qualityBarLabel, '起点1万均订试读基准')
  const score = Number.isFinite(Number(raw.score)) ? Number(raw.score) : null
  if (!dropPoints.length && !pullPoints.length && !repairActions.length && !openingGuardrail && !middleGuardrail && !endingGuardrail) return null
  return {
    status,
    score,
    quality_bar: qualityBar,
    drop_points: dropPoints,
    pull_points: pullPoints,
    repair_actions: repairActions,
    opening_guardrail: openingGuardrail,
    middle_guardrail: middleGuardrail,
    ending_guardrail: endingGuardrail,
  }
}

function normalizeStoryPressureSignal(value: any) {
  const key = compactBriefText(value?.key || value?.field || value?.type)
  const label = compactBriefText(value?.label || value?.title || key)
  const status = compactBriefText(value?.status || value?.state, 'ok').toLowerCase()
  const detail = compactBriefText(value?.detail || value?.reason || value?.summary || value?.text)
  if (!key && !label && !detail) return null
  return {
    key: key || label,
    label: label || key || '故事压力',
    status,
    detail,
  }
}

function normalizeStoryPressureBrief(value: any) {
  const raw = value?.story_pressure_brief
    || value?.storyPressureBrief
    || value?.story_pressure_ladder
    || value?.storyPressureLadder
    || value
    || {}
  const signals = asArray(raw.signals || raw.pressure_signals || raw.pressureSignals)
    .map((item: any) => normalizeStoryPressureSignal(item))
    .filter(Boolean)
    .slice(0, 8)
  const weakSignals = signals
    .filter((signal: any) => !['ok', 'ready', 'pass', 'passed'].includes(String(signal.status || '').toLowerCase()))
    .slice(0, 6)
  const pressureSourceRows = asArray(raw.pressure_sources || raw.pressureSources || raw.sources)
  const pressureSources = uniqueBriefStrings(
    pressureSourceRows.map((item: any) => typeof item === 'string' ? item : item?.label || item?.name || item?.summary || item?.detail),
    8,
  )
  const requiredActions = uniqueBriefStrings(raw.required_actions || raw.requiredActions || raw.next_actions || raw.nextActions || [], 8)
  const signalDetail = (key: string) => compactBriefText(signals.find((signal: any) => signal.key === key)?.detail)
  const conflictEscalationGuardrail = compactBriefText(
    raw.conflict_escalation_guardrail
    || raw.conflictEscalationGuardrail
    || signalDetail('conflict_escalation'),
  )
  const stakesGrowthGuardrail = compactBriefText(
    raw.stakes_growth_guardrail
    || raw.stakesGrowthGuardrail
    || signalDetail('stakes_growth'),
  )
  const reversalPressureGuardrail = compactBriefText(
    raw.reversal_pressure_guardrail
    || raw.reversalPressureGuardrail
    || signalDetail('reversal_pressure'),
  )
  const pressureSourceGuardrail = compactBriefText(
    raw.pressure_source_guardrail
    || raw.pressureSourceGuardrail
    || signalDetail('pressure_source'),
  )
  const status = compactBriefText(raw.status, weakSignals.length ? 'needs_attention' : (signals.length || pressureSources.length ? 'ready' : ''))
  const score = Number.isFinite(Number(raw.score)) ? Number(raw.score) : null
  const rangeLabel = compactBriefText(raw.chapter_range_label || raw.chapterRangeLabel || raw.range_label || raw.rangeLabel)
  if (!status && !pressureSources.length && !signals.length && !requiredActions.length && !conflictEscalationGuardrail && !stakesGrowthGuardrail && !reversalPressureGuardrail && !pressureSourceGuardrail) return null
  return {
    status,
    score,
    range_label: rangeLabel,
    pressure_sources: pressureSources,
    weak_signals: weakSignals,
    required_actions: requiredActions,
    pressure_source_guardrail: pressureSourceGuardrail,
    conflict_escalation_guardrail: conflictEscalationGuardrail,
    stakes_growth_guardrail: stakesGrowthGuardrail,
    reversal_pressure_guardrail: reversalPressureGuardrail,
  }
}

function normalizeStoryDriveBrief(value: any, sceneCards: any[] = []) {
  const raw = value?.story_drive_brief || value?.storyDriveBrief || value || {}
  const target = value?.chapter_target || value?.chapterTarget || value || {}
  const protagonistChoice = firstCompactText(
    raw.protagonist_choice,
    raw.protagonistChoice,
    raw.active_choice,
    raw.activeChoice,
    target.protagonist_choice,
    target.protagonistChoice,
    target.active_choice,
    target.activeChoice,
    target.main_character_choice,
    firstSceneCardText(sceneCards, ['protagonist_choice', 'active_choice', 'turning_point', 'turn', 'reversal']),
  )
  const choiceCost = firstCompactText(
    raw.choice_cost,
    raw.choiceCost,
    raw.cost,
    raw.consequence,
    raw.stakes,
    target.choice_cost,
    target.choiceCost,
    target.cost,
    target.consequence,
    target.stakes,
    firstSceneCardText(sceneCards, ['choice_cost', 'cost', 'consequence', 'stakes', 'risk']),
  )
  const stateChange = firstCompactText(
    raw.state_change,
    raw.stateChange,
    raw.exit_state,
    raw.exitState,
    target.state_change,
    target.stateChange,
    target.exit_state,
    target.exitState,
    target.chapter_state_change,
    firstSceneCardText(sceneCards, ['exit_state', 'state_change', 'result', 'scene_result']),
  )
  const obstacle = firstCompactText(
    raw.obstacle,
    raw.conflict,
    raw.core_conflict,
    raw.coreConflict,
    target.core_conflict,
    target.coreConflict,
    target.conflict,
    firstSceneCardText(sceneCards, ['conflict', 'obstacle', 'pressure']),
  )
  const causalNextStep = firstCompactText(
    raw.causal_next_step,
    raw.causalNextStep,
    raw.next_step,
    raw.nextStep,
    raw.ending_hook,
    raw.endingHook,
    target.causal_next_step,
    target.causalNextStep,
    target.next_step,
    target.nextStep,
    target.ending_hook,
    target.endingHook,
    firstSceneCardText(sceneCards, ['causal_next_step', 'next_step', 'ending_hook', 'exit_hook']),
  )
  const requiredActions = uniqueBriefStrings(
    raw.required_actions
    || raw.requiredActions
    || [
      '把主角主动选择、明确阻碍、选择代价、状态变化和下一步因果写成可见事件。',
    ],
    6,
  )
  if (!protagonistChoice && !choiceCost && !stateChange && !obstacle && !causalNextStep) return null
  return {
    protagonist_choice: protagonistChoice,
    choice_cost: choiceCost,
    state_change: stateChange,
    obstacle,
    causal_next_step: causalNextStep,
    required_actions: requiredActions,
  }
}

function normalizeSerialRhythmBudgetItem(value: any, index: number) {
  const raw = typeof value === 'object' && value ? value : { required_payoff: value }
  const title = compactBriefText(raw.title || raw.name || raw.scene_title || raw.sceneTitle, `场景${index + 1}`)
  const requiredPayoff = firstCompactText(
    raw.required_payoff,
    raw.requiredPayoff,
    raw.reader_payoff,
    raw.readerPayoff,
    raw.payoff,
  )
  const turn = firstCompactText(raw.turn, raw.reversal, raw.turning_point, raw.turningPoint, raw.information_gap, raw.informationGap)
  const endingHookSeed = firstCompactText(raw.ending_hook_seed, raw.endingHookSeed, raw.ending_hook, raw.endingHook, raw.exit_state, raw.exitState)
  const wordBudget = compactBriefText(raw.word_budget || raw.wordBudget || raw.budget)
  if (!title && !requiredPayoff && !turn && !endingHookSeed && !wordBudget) return null
  return {
    scene_no: Number(raw.scene_no || raw.sceneNo || index + 1),
    title,
    word_budget: wordBudget,
    required_payoff: requiredPayoff,
    turn,
    ending_hook_seed: endingHookSeed,
  }
}

function normalizeSerialRhythmBrief(value: any, sceneBriefs: any[] = [], readerRetentionBrief: any = null, wordTarget: any = null) {
  const raw = value?.serial_rhythm_brief || value?.serialRhythmBrief || value || {}
  const explicitBudget = asArray(raw.scene_payoff_budget || raw.scenePayoffBudget || raw.scene_budgets || raw.sceneBudgets)
    .map((item: any, index: number) => normalizeSerialRhythmBudgetItem(item, index))
    .filter(Boolean)
  const scenePayoffBudget = (explicitBudget.length ? explicitBudget : sceneBriefs.map(normalizeSerialRhythmBudgetItem).filter(Boolean)).slice(0, 8)
  const targetWords = Number(wordTarget?.target || raw.word_target || raw.wordTarget || 0)
  const defaultInterval = targetWords >= 9000 ? '每 1200-1800 字至少交付一次可见回报。' : '每 800-1200 字至少交付一次可见回报。'
  const openingHookDeadline = firstCompactText(
    raw.opening_hook_deadline,
    raw.openingHookDeadline,
    raw.opening_guardrail,
    raw.openingGuardrail,
    readerRetentionBrief?.opening_hook ? `前 300 字必须落地：${readerRetentionBrief.opening_hook}` : '',
  )
  const payoffInterval = firstCompactText(
    raw.payoff_interval,
    raw.payoffInterval,
    raw.payoff_density,
    raw.payoffDensity,
    `${defaultInterval}回报可以是信息增量、冲突转折、爽点兑现、能力展示、关系变化或小回收。`,
  )
  const middleGuardrail = firstCompactText(
    raw.middle_guardrail,
    raw.middleGuardrail,
    raw.pacing_guardrail,
    raw.pacingGuardrail,
    readerRetentionBrief?.payoff_promise ? `中段必须围绕读者承诺推进：${readerRetentionBrief.payoff_promise}` : '',
    scenePayoffBudget.length ? `每个场景至少兑现一个回报，不能只写路过、解释或等待。` : '',
  )
  const endingHookGuardrail = firstCompactText(
    raw.ending_hook_guardrail,
    raw.endingHookGuardrail,
    raw.ending_guardrail,
    raw.endingGuardrail,
    readerRetentionBrief?.ending_question ? `最后一幕必须压出追读问题：${readerRetentionBrief.ending_question}` : '',
  )
  const antiDragRules = uniqueBriefStrings(
    raw.anti_drag_rules
    || raw.antiDragRules
    || raw.no_drag_rules
    || raw.noDragRules
    || [
      '禁止连续两段纯环境描写或设定解释；每 3-5 段必须出现行动、选择、信息变化或关系变化。',
      '不能用心理总结替代冲突推进；每个场景必须有目标、阻碍、转折和回报。',
      '字数不足时优先扩写行动链、对话交锋、选择代价和章末铺垫，不靠水环境。',
    ],
    8,
  )
  if (!openingHookDeadline && !payoffInterval && !middleGuardrail && !endingHookGuardrail && !scenePayoffBudget.length && !antiDragRules.length) return null
  return {
    status: compactBriefText(raw.status, 'ready'),
    opening_hook_deadline: openingHookDeadline,
    payoff_interval: payoffInterval,
    middle_guardrail: middleGuardrail,
    ending_hook_guardrail: endingHookGuardrail,
    scene_payoff_budget: scenePayoffBudget,
    anti_drag_rules: antiDragRules,
  }
}

function normalizePageTurnHookBrief(value: any, target: any = {}, sceneBriefs: any[] = [], readerRetentionBrief: any = null, storyDriveBrief: any = null) {
  const raw = value?.page_turn_hook_brief || value?.pageTurnHookBrief || value || {}
  const lastScene = sceneBriefs[sceneBriefs.length - 1] || {}
  const coreQuestion = firstCompactText(
    raw.core_question,
    raw.coreQuestion,
    raw.question,
    readerRetentionBrief?.ending_question,
    target.ending_hook,
    lastScene.ending_hook_seed,
  )
  const visibleTrigger = firstCompactText(
    raw.visible_trigger,
    raw.visibleTrigger,
    raw.trigger,
    lastScene.reversal,
    lastScene.ending_hook_seed,
    target.ending_hook,
  )
  const nextChapterPull = firstCompactText(
    raw.next_chapter_pull,
    raw.nextChapterPull,
    raw.next_pull,
    raw.nextPull,
    storyDriveBrief?.causal_next_step,
    target.causal_next_step,
    target.causalNextStep,
    target.next_step,
    target.nextStep,
    coreQuestion,
  )
  const finalImage = firstCompactText(
    raw.final_image,
    raw.finalImage,
    raw.last_image,
    raw.lastImage,
    lastScene.ending_hook_seed,
    lastScene.reversal,
    target.ending_hook,
  )
  const withheldAnswer = firstCompactText(
    raw.withheld_answer,
    raw.withheldAnswer,
    raw.withheld,
    raw.forbidden_answer,
    raw.forbiddenAnswer,
    coreQuestion ? `本章只抛出「${coreQuestion}」，不得在本章解释完整答案。` : '',
  )
  const forbiddenResolution = uniqueBriefStrings([
    raw.forbidden_resolution,
    raw.forbiddenResolution,
    raw.forbidden,
    withheldAnswer,
    coreQuestion ? `不得在本章解释完整答案：${coreQuestion}` : '',
  ], 8)
  const requiredActions = uniqueBriefStrings(
    raw.required_actions
    || raw.requiredActions
    || [
      visibleTrigger ? `最后 300 字必须把「${visibleTrigger}」写成角色现场看见、听见、拿到或被迫面对的触发。` : '最后 300 字必须出现可见触发，不得只用旁白宣布悬念。',
      coreQuestion ? `结尾必须让读者带着「${coreQuestion}」翻页。` : '结尾必须留下下一章非看不可的问题。',
      nextChapterPull ? `只收束本章行动，把「${nextChapterPull}」留给下一章推进。` : '只收束本章行动，不提前解决下一章冲突。',
    ],
    8,
  )
  const hookType = compactBriefText(raw.hook_type || raw.hookType || raw.type, '问题反转')
  if (!coreQuestion && !visibleTrigger && !nextChapterPull && !finalImage && !forbiddenResolution.length) return null
  return {
    status: compactBriefText(raw.status, 'ready'),
    hook_type: hookType,
    core_question: coreQuestion,
    visible_trigger: visibleTrigger,
    withheld_answer: withheldAnswer,
    next_chapter_pull: nextChapterPull,
    final_image: finalImage,
    forbidden_resolution: forbiddenResolution,
    required_actions: requiredActions,
  }
}

function normalizeVolumeClimaxBeat(value: any, index: number) {
  const raw = typeof value === 'object' && value ? value : { label: value }
  const label = firstCompactText(raw.label, raw.title, raw.name, raw.summary, raw.detail, `爆点${index + 1}`)
  const detail = firstCompactText(raw.detail, raw.description, raw.summary, raw.promise, raw.payoff)
  const type = firstCompactText(raw.type, raw.beat_type, raw.beatType, raw.kind)
  if (!label && !detail && !type) return null
  return {
    chapter_no: Number(raw.chapter_no || raw.chapterNo || raw.chapter || 0) || null,
    type,
    label,
    detail,
  }
}

function sortNearbyVolumeBeats(beats: any[], chapterNo: number) {
  return beats
    .map((beat, index) => ({ beat, index }))
    .sort((left, right) => {
      const leftNo = Number(left.beat.chapter_no || 0)
      const rightNo = Number(right.beat.chapter_no || 0)
      if (chapterNo && leftNo === chapterNo && rightNo !== chapterNo) return -1
      if (chapterNo && rightNo === chapterNo && leftNo !== chapterNo) return 1
      if (chapterNo && leftNo && rightNo) return Math.abs(leftNo - chapterNo) - Math.abs(rightNo - chapterNo)
      return left.index - right.index
    })
    .map(item => item.beat)
}

function normalizeVolumeClimaxBrief(value: any, target: any = {}, volumeBeatBudget: any = {}) {
  const explicit = value?.volume_climax_brief
    || value?.volumeClimaxBrief
    || value?.volume_beat_brief
    || value?.volumeBeatBrief
    || target?.volume_climax_brief
    || target?.volumeClimaxBrief
    || target?.volume_beat_brief
    || target?.volumeBeatBrief
    || {}
  const budget = value?.volume_beat_budget
    || value?.volumeBeatBudget
    || volumeBeatBudget?.volume_beat_budget
    || volumeBeatBudget?.volumeBeatBudget
    || volumeBeatBudget
    || {}
  const chapterNo = Number(target?.chapter_no || target?.chapterNo || explicit?.chapter_no || explicit?.chapterNo || 0)
  const explicitBeats = asArray(explicit?.nearby_beats || explicit?.nearbyBeats)
    .map((item: any, index: number) => normalizeVolumeClimaxBeat(item, index))
    .filter(Boolean)
  const budgetBeats = asArray(budget?.beats || budget?.volume_beats || budget?.volumeBeats || budget?.climax_beats || budget?.climaxBeats)
    .map((item: any, index: number) => normalizeVolumeClimaxBeat(item, index))
    .filter(Boolean)
  const nearbyBeats = (explicitBeats.length ? explicitBeats : sortNearbyVolumeBeats(budgetBeats, chapterNo)).slice(0, 6)
  const currentBeat = nearbyBeats.find((beat: any) => chapterNo && Number(beat.chapter_no || 0) === chapterNo) || nearbyBeats[0] || null
  const requiredBeats = uniqueBriefStrings(
    explicit?.required_beats
    || explicit?.requiredBeats
    || explicit?.beats_required
    || explicit?.beatsRequired
    || [],
    8,
  )
  const forbiddenPayoff = uniqueBriefStrings(
    explicit?.forbidden_payoff
    || explicit?.forbiddenPayoff
    || explicit?.forbidden_payoffs
    || explicit?.forbiddenPayoffs
    || explicit?.forbidden_resolution
    || explicit?.forbiddenResolution
    || [],
    8,
  )
  const nextActions = uniqueBriefStrings(
    explicit?.next_actions
    || explicit?.nextActions
    || budget?.next_actions
    || budget?.nextActions
    || [],
    8,
  )
  const currentChapterRole = firstCompactText(
    explicit?.current_chapter_role,
    explicit?.currentChapterRole,
    explicit?.chapter_role,
    explicit?.chapterRole,
    explicit?.role,
    currentBeat ? `${currentBeat.type ? `${currentBeat.type}：` : ''}${currentBeat.label}${currentBeat.detail ? `，${currentBeat.detail}` : ''}` : '',
    budget?.summary,
  )
  const volumeGoal = firstCompactText(
    explicit?.volume_goal,
    explicit?.volumeGoal,
    budget?.volume_goal,
    budget?.volumeGoal,
    budget?.goal,
    budget?.summary,
  )
  const climaxPromise = firstCompactText(
    explicit?.climax_promise,
    explicit?.climaxPromise,
    explicit?.reader_payoff,
    explicit?.readerPayoff,
    explicit?.payoff,
    currentBeat?.detail,
  )
  if (!currentChapterRole && !volumeGoal && !climaxPromise && !requiredBeats.length && !forbiddenPayoff.length && !nearbyBeats.length && !nextActions.length) return null
  return {
    status: compactBriefText(explicit?.status || budget?.status, 'ready'),
    current_volume_title: firstCompactText(explicit?.current_volume_title, explicit?.currentVolumeTitle, budget?.current_volume_title, budget?.currentVolumeTitle, budget?.volume_title, budget?.volumeTitle),
    chapter_range: firstCompactText(explicit?.chapter_range, explicit?.chapterRange, budget?.chapter_range, budget?.chapterRange),
    current_chapter_role: currentChapterRole,
    volume_goal: volumeGoal,
    climax_promise: climaxPromise,
    required_beats: requiredBeats,
    forbidden_payoff: forbiddenPayoff,
    nearby_beats: nearbyBeats,
    next_actions: nextActions,
  }
}

function normalizeRecentFatigueSignal(value: any) {
  const key = compactBriefText(value?.key || value?.field || value?.type)
  const label = compactBriefText(value?.label || value?.title || key)
  const status = compactBriefText(value?.status || value?.state, 'ok').toLowerCase()
  const detail = compactBriefText(value?.detail || value?.reason || value?.summary || value?.text)
  if (!key && !label && !detail) return null
  return {
    key: key || label,
    label: label || key || '疲劳风险',
    status,
    detail,
  }
}

function normalizeRecentFatigueBrief(value: any) {
  const raw = value?.recent_fatigue_brief
    || value?.recentFatigueBrief
    || value?.recent_fatigue_radar
    || value?.recentFatigueRadar
    || value
    || {}
  const signals = asArray(raw.signals || raw.fatigue_signals || raw.fatigueSignals)
    .map((item: any) => normalizeRecentFatigueSignal(item))
    .filter(Boolean)
    .slice(0, 8)
  const warnSignals = signals.filter((signal: any) => !['ok', 'ready', 'pass', 'passed'].includes(String(signal.status || '').toLowerCase()))
  const nextActions = uniqueBriefStrings(raw.next_actions || raw.nextActions || raw.required_actions || raw.requiredActions || [], 8)
  const fatigueRisks = uniqueBriefStrings([
    raw.summary,
    raw.risk_summary,
    raw.riskSummary,
    ...warnSignals.map((signal: any) => signal.detail || signal.label),
    raw.fatigue_risks,
    raw.fatigueRisks,
  ], 10)
  const actionAndRisks = [...nextActions, ...fatigueRisks]
  const conflictVariationSource = firstMatchingBrief(actionAndRisks, /冲突|压迫|对手|来源|阻碍/)
  const payoffVariationSource = firstMatchingBrief(actionAndRisks, /回报|爽点|打脸|兑现|奖励/)
  const hookVariationSource = firstMatchingBrief(actionAndRisks, /章末|钩子|问题|悬念|翻页/)
  const sceneFreshnessSource = firstMatchingBrief(actionAndRisks, /场面|可视化|标志性|IP|画面/)
  const conflictVariation = compactBriefText(
    raw.conflict_variation
    || raw.conflictVariation
    || (conflictVariationSource ? `更换压迫来源：${conflictVariationSource}` : '')
    || '本章必须更换压迫来源或对手施压方式，不能继续复刻最近章节的同类冲突。',
  )
  const payoffVariation = compactBriefText(
    raw.payoff_variation
    || raw.payoffVariation
    || (payoffVariationSource ? `更换回报形态：${payoffVariationSource}` : '')
    || '本章必须更换回报形态，不能只重复上一轮打脸、震惊或解释。',
  )
  const hookVariation = compactBriefText(
    raw.hook_variation
    || raw.hookVariation
    || (hookVariationSource ? `更换章末问题：${hookVariationSource}` : '')
    || '本章章末问题必须换角度，不得重复最近章节已经用过的追读问题。',
  )
  const sceneFreshness = compactBriefText(
    raw.scene_freshness
    || raw.sceneFreshness
    || (sceneFreshnessSource ? `补新可视化场面：${sceneFreshnessSource}` : '')
    || '本章至少补一个新的可视化场面或空间动作，避免连续章节只有同类对话交锋。',
  )
  if (!signals.length && !fatigueRisks.length && !nextActions.length && !conflictVariation && !payoffVariation && !hookVariation && !sceneFreshness) return null
  return {
    status: compactBriefText(raw.status, warnSignals.length ? 'needs_attention' : 'ready'),
    score: Number.isFinite(Number(raw.score)) ? Number(raw.score) : null,
    chapter_range_label: compactBriefText(raw.chapter_range_label || raw.chapterRangeLabel || raw.range_label || raw.rangeLabel),
    summary: compactBriefText(raw.summary),
    fatigue_risks: fatigueRisks,
    conflict_variation: conflictVariation,
    payoff_variation: payoffVariation,
    hook_variation: hookVariation,
    scene_freshness: sceneFreshness,
    next_actions: nextActions,
    signals,
  }
}

function normalizeExpectationItem(value: any, fallback: { key: string; label: string; type: string }) {
  const text = compactBriefText(typeof value === 'string' ? value : value?.text || value?.summary || value?.description || value?.name || value?.title)
  if (!text) return null
  return {
    key: compactBriefText(typeof value === 'object' ? value?.key : '', fallback.key),
    label: compactBriefText(typeof value === 'object' ? value?.label : '', fallback.label),
    type: compactBriefText(typeof value === 'object' ? value?.type : '', fallback.type),
    text,
  }
}

function uniqueExpectationItems(items: any[]) {
  const seen = new Set<string>()
  const rows: any[] = []
  for (const item of items) {
    if (!item?.text) continue
    const key = `${item.type || 'expectation'}:${normalizedMatchText(item.text)}`
    if (!key || seen.has(key)) continue
    seen.add(key)
    rows.push(item)
  }
  return rows
}

function normalizeDebtExpectationItem(value: any, fallback: { key: string; label: string; type: string }, extra: any = {}) {
  const normalized = normalizeExpectationItem(value, fallback)
  if (!normalized) return null
  const raw = typeof value === 'object' && value ? value : {}
  return {
    ...extra,
    age_chapters: Number(raw.age_chapters ?? raw.ageChapters ?? extra.age_chapters ?? 0) || null,
    overdue: Boolean(raw.overdue ?? extra.overdue ?? false),
    urgency: compactBriefText(raw.urgency || extra.urgency),
    ...normalized,
  }
}

const EXPECTATION_MUST_CARRY_OVERDUE_AFTER_CHAPTERS = 2
const EXPECTATION_KEEP_ALIVE_OVERDUE_AFTER_CHAPTERS = 4

function applyReaderExpectationDebtAging(context: any, currentChapterNo: number) {
  const chapterNo = Number(currentChapterNo || 0)
  const decorate = (item: any, kind: 'must_carry' | 'keep_alive') => {
    const fromChapterNo = Number(item?.from_chapter_no || item?.fromChapterNo || 0) || null
    const explicitAge = Number(item?.age_chapters ?? item?.ageChapters ?? 0) || null
    const age = chapterNo && fromChapterNo ? Math.max(0, chapterNo - fromChapterNo) : explicitAge
    const overdueAfter = kind === 'keep_alive'
      ? EXPECTATION_KEEP_ALIVE_OVERDUE_AFTER_CHAPTERS
      : EXPECTATION_MUST_CARRY_OVERDUE_AFTER_CHAPTERS
    const overdue = Boolean(item?.overdue) || (age !== null && age >= overdueAfter)
    return {
      ...item,
      from_chapter_no: fromChapterNo,
      age_chapters: age,
      overdue,
      urgency: overdue ? 'overdue' : age !== null && age > 0 ? 'due' : compactBriefText(item?.urgency),
    }
  }
  const mustCarry = uniqueExpectationItems(asArray(context?.must_carry).map((item: any) => decorate(item, 'must_carry')))
  const keepAlive = uniqueExpectationItems(asArray(context?.keep_alive).map((item: any) => decorate(item, 'keep_alive')))
  const overdue = uniqueExpectationItems([
    ...asArray(context?.overdue),
    ...mustCarry.filter((item: any) => item.overdue),
    ...keepAlive.filter((item: any) => item.overdue),
  ]).slice(0, 12)
  const sourceChapters = Array.from(new Set([
    ...mustCarry.map((item: any) => Number(item.from_chapter_no || 0)).filter(Boolean),
    ...keepAlive.map((item: any) => Number(item.from_chapter_no || 0)).filter(Boolean),
  ])).sort((a, b) => a - b)
  const summary = [
    mustCarry.length ? `待兑现 ${mustCarry.length} 项` : '',
    keepAlive.length ? `继续悬念 ${keepAlive.length} 项` : '',
    overdue.length ? `逾期 ${overdue.length} 项` : '',
  ].filter(Boolean).join('，')
  return {
    ...(context || {}),
    must_carry: mustCarry.slice(0, 12),
    keep_alive: keepAlive.slice(0, 12),
    overdue,
    overdue_count: overdue.length,
    source_chapters: sourceChapters.slice(-8),
    summary: compactBriefText(summary || context?.summary || ''),
  }
}

function normalizeReaderExpectationDebtContext(value: any) {
  const raw = value || {}
  const mustCarry = uniqueExpectationItems(asArray(raw.must_carry || raw.mustCarry || raw.carry_over || raw.carryOver)
    .map((item: any, index: number) => normalizeDebtExpectationItem(item, { key: `carry_over_${index + 1}`, label: '期待债务', type: 'carry_over' }, {
      from_chapter_no: Number(item?.from_chapter_no || item?.fromChapterNo || 0) || null,
      source_review_id: item?.source_review_id || item?.sourceReviewId || null,
    }))
    .filter(Boolean))
  const keepAlive = uniqueExpectationItems(asArray(raw.keep_alive || raw.keepAlive)
    .map((item: any, index: number) => normalizeDebtExpectationItem(item, { key: `debt_keep_alive_${index + 1}`, label: '继续悬念', type: 'question' }, {
      from_chapter_no: Number(item?.from_chapter_no || item?.fromChapterNo || 0) || null,
      source_review_id: item?.source_review_id || item?.sourceReviewId || null,
    }))
    .filter(Boolean))
  const overdue = uniqueExpectationItems(asArray(raw.overdue || raw.overdue_items || raw.overdueItems)
    .map((item: any, index: number) => normalizeDebtExpectationItem(item, { key: `overdue_${index + 1}`, label: '逾期待补', type: 'overdue' }, {
      from_chapter_no: Number(item?.from_chapter_no || item?.fromChapterNo || 0) || null,
      source_review_id: item?.source_review_id || item?.sourceReviewId || null,
      overdue: true,
      urgency: 'overdue',
    }))
    .filter(Boolean))
  const sourceChapters = Array.from(new Set([
    ...mustCarry.map((item: any) => Number(item.from_chapter_no || 0)).filter(Boolean),
    ...keepAlive.map((item: any) => Number(item.from_chapter_no || 0)).filter(Boolean),
    ...overdue.map((item: any) => Number(item.from_chapter_no || 0)).filter(Boolean),
  ])).sort((a, b) => a - b)
  return {
    must_carry: mustCarry.slice(0, 12),
    keep_alive: keepAlive.slice(0, 12),
    overdue: overdue.slice(0, 12),
    overdue_count: Number(raw.overdue_count ?? raw.overdueCount ?? overdue.length) || overdue.length,
    source_chapters: sourceChapters.slice(-8),
    summary: compactBriefText(raw.summary || [
      mustCarry.length ? `待兑现 ${mustCarry.length} 项` : '',
      keepAlive.length ? `继续悬念 ${keepAlive.length} 项` : '',
      overdue.length ? `逾期 ${overdue.length} 项` : '',
    ].filter(Boolean).join('，')),
  }
}

export function buildReaderExpectationDebtContext(chapter: any, chapters: any[] = [], reviews: any[] = []) {
  const chapterNo = Number(chapter?.chapter_no || 0)
  const chapterId = Number(chapter?.id || 0)
  if (!chapterNo && !chapterId) return normalizeReaderExpectationDebtContext(null)
  const previousChapters = asArray(chapters)
    .filter((item: any) => Number(item?.chapter_no || 0) > 0 && Number(item.chapter_no) < chapterNo)
    .sort((a: any, b: any) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
    .slice(-6)
  const previousChapterNos = new Set(previousChapters.map((item: any) => Number(item.chapter_no || 0)).filter(Boolean))
  const previousChapterIds = new Set(previousChapters.map((item: any) => Number(item.id || 0)).filter(Boolean))
  const latestByChapter = new Map<string, any>()
  for (const review of asArray(reviews)) {
    if (String(review?.review_type || '') !== 'reader_expectation_sync') continue
    const payload = parseJsonLikePayload(review?.payload) || {}
    const reviewChapterNo = Number(payload?.chapter_no || payload?.reader_expectation_sync?.chapter_no || review?.chapter_no || 0)
    const reviewChapterId = Number(payload?.chapter_id || payload?.reader_expectation_sync?.chapter_id || review?.chapter_id || 0)
    const isPrevious = previousChapterNos.has(reviewChapterNo) || previousChapterIds.has(reviewChapterId)
    if (!isPrevious) continue
    const key = reviewChapterId ? `id:${reviewChapterId}` : `no:${reviewChapterNo}`
    const existing = latestByChapter.get(key)
    if (!existing || reviewTimestamp(review) >= reviewTimestamp(existing.review)) {
      latestByChapter.set(key, { review, payload, chapter_no: reviewChapterNo || previousChapters.find((item: any) => Number(item.id || 0) === reviewChapterId)?.chapter_no || null })
    }
  }
  const mustCarry: any[] = []
  const keepAlive: any[] = []
  for (const item of Array.from(latestByChapter.values()).sort((a: any, b: any) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))) {
    const sync = item.payload?.reader_expectation_sync || item.payload?.result?.reader_expectation_sync || item.payload?.result || item.payload || {}
    const fromChapterNo = Number(sync?.chapter_no || item.chapter_no || 0) || null
    for (const missed of asArray(sync?.missed)) {
      const normalized = normalizeDebtExpectationItem(missed, { key: 'missed_expectation', label: '待补期待', type: 'carry_over' }, {
        from_chapter_no: fromChapterNo,
        source_review_id: item.review?.id || null,
      })
      if (normalized) mustCarry.push(normalized)
    }
    for (const alive of asArray(sync?.keep_alive)) {
      const normalized = normalizeDebtExpectationItem(alive, { key: 'keep_alive', label: '继续悬念', type: 'question' }, {
        from_chapter_no: fromChapterNo,
        source_review_id: item.review?.id || null,
      })
      if (normalized) keepAlive.push(normalized)
    }
  }
  return applyReaderExpectationDebtAging(normalizeReaderExpectationDebtContext({ must_carry: mustCarry, keep_alive: keepAlive }), chapterNo)
}

function reviewPayloadForType(review: any, reviewType: string) {
  const payload = parseJsonLikePayload(review?.payload) || {}
  return payload?.[reviewType] || payload?.result?.[reviewType] || payload?.result || payload || {}
}

function reviewBelongsToChapter(review: any, payload: any, chapter: any) {
  const chapterNo = Number(chapter?.chapter_no || 0)
  const chapterId = Number(chapter?.id || 0)
  const payloadChapterNo = Number(payload?.chapter_no || review?.chapter_no || 0)
  const payloadChapterId = Number(payload?.chapter_id || review?.chapter_id || 0)
  return (chapterNo > 0 && payloadChapterNo === chapterNo) || (chapterId > 0 && payloadChapterId === chapterId)
}

function deliveryRiskCountFromPayload(payload: any, keys: string[] = []) {
  for (const key of keys) {
    const value = Number(payload?.[key])
    if (Number.isFinite(value) && value > 0) return value
  }
  const candidateArrays = [
    payload?.missed,
    payload?.weak_dimensions,
    payload?.weakDimensions,
    payload?.drift_risks,
    payload?.driftRisks,
    payload?.failed_evidence,
    payload?.failedEvidence,
    payload?.risks,
    payload?.risk_items,
    payload?.riskItems,
  ]
  for (const candidate of candidateArrays) {
    const length = asArray(candidate).length
    if (length > 0) return length
  }
  return 0
}

function deliveryRiskItemText(value: any) {
  if (typeof value === 'string') return compactBriefText(value)
  return compactBriefText(value?.issue || value?.text || value?.label || value?.summary || value?.detail || value?.name || value?.title)
}

function deliveryRiskEvidence(payload: any) {
  return [
    ...asArray(payload?.missed),
    ...asArray(payload?.weak_dimensions || payload?.weakDimensions),
    ...asArray(payload?.drift_risks || payload?.driftRisks),
    ...asArray(payload?.failed_evidence || payload?.failedEvidence),
    ...asArray(payload?.risks),
  ].map(deliveryRiskItemText).filter(Boolean).slice(0, 6)
}

function makeDeliveryRiskItem(prefix: string, payload: any, count: number) {
  const label = compactBriefText(payload?.label || payload?.summary, `${prefix} ${count}`)
  return `${prefix}：${label}`
}

export function normalizeDeliveryRiskCarryOverContext(value: any) {
  if (!value || typeof value !== 'object') return null
  const items = asArray(value.items || value.risk_items || value.riskItems || value.risks)
    .map(deliveryRiskItemText)
    .filter(Boolean)
  const requiredActions = asArray(value.required_actions || value.requiredActions || value.next_actions || value.nextActions)
    .map(deliveryRiskItemText)
    .filter(Boolean)
  const openingActions = asArray(value.opening_actions || value.openingActions)
    .map(deliveryRiskItemText)
    .filter(Boolean)
  const middleActions = asArray(value.middle_actions || value.middleActions)
    .map(deliveryRiskItemText)
    .filter(Boolean)
  const endingActions = asArray(value.ending_actions || value.endingActions)
    .map(deliveryRiskItemText)
    .filter(Boolean)
  const totalCount = Number(value.total_count ?? value.totalCount ?? value.count ?? items.length)
  const stagedCount = openingActions.length + middleActions.length + endingActions.length
  const safeTotal = Number.isFinite(totalCount) && totalCount > 0 ? totalCount : Math.max(items.length, requiredActions.length, stagedCount)
  if (safeTotal <= 0 && items.length === 0 && requiredActions.length === 0 && stagedCount === 0) return null
  const sourceChapterNo = Number(value.source_chapter_no ?? value.sourceChapterNo ?? 0) || null
  return {
    source_chapter_no: sourceChapterNo,
    apply_to_chapter_no: Number(value.apply_to_chapter_no ?? value.applyToChapterNo ?? 0) || null,
    total_count: safeTotal,
    label: compactBriefText(value.label, `待修复 ${safeTotal}`),
    priority_label: compactBriefText(value.priority_label || value.priorityLabel, '优先复盘上一章'),
    items: items.slice(0, 12),
    required_actions: requiredActions.slice(0, 12),
    opening_actions: openingActions.slice(0, 12),
    middle_actions: middleActions.slice(0, 12),
    ending_actions: endingActions.slice(0, 12),
    evidence: asArray(value.evidence).map(deliveryRiskItemText).filter(Boolean).slice(0, 12),
    source_review_ids: asArray(value.source_review_ids || value.sourceReviewIds).filter(Boolean).slice(0, 12),
  }
}

export function buildDeliveryRiskCarryOverContext(chapter: any, chapters: any[] = [], reviews: any[] = []) {
  const chapterNo = Number(chapter?.chapter_no || 0)
  if (!chapterNo) return null
  const previousChapter = asArray(chapters)
    .filter((item: any) => Number(item?.chapter_no || 0) > 0 && Number(item.chapter_no) < chapterNo)
    .sort((a: any, b: any) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
    .slice(-1)[0]
  if (!previousChapter) return null

  const rules = [
    { type: 'chapter_core_drift', prefix: '守核心', priority: '优先补核心', countKeys: ['risk_count', 'riskCount'] },
    { type: 'runway_sync', prefix: '补航线', priority: '优先补航线', countKeys: ['risk_count', 'riskCount'] },
    { type: 'story_unit_sync', prefix: '校剧情单元', priority: '优先校单元', countKeys: ['risk_count', 'riskCount'] },
    { type: 'signature_scene_sync', prefix: '补强场面', priority: '优先补强场面', countKeys: ['missed_count', 'missedCount'] },
    { type: 'reader_expectation_sync', prefix: '补期待', priority: '优先补期待', countKeys: ['missed_count', 'missedCount'] },
    { type: 'reader_retention_sync', prefix: '补追读', priority: '优先补追读', countKeys: ['missed_count', 'missedCount'] },
    { type: 'chapter_attraction_review', prefix: '修吸引力', priority: '', countKeys: ['weak_count', 'weakCount'] },
    { type: 'story_drive_sync', prefix: '补故事力', priority: '', countKeys: ['missed_count', 'missedCount'] },
    { type: 'character_arc_sync', prefix: '补人物弧光', priority: '', countKeys: ['missed_count', 'missedCount'] },
    { type: 'chapter_benchmark_sync', prefix: '补基准', priority: '优先补基准', countKeys: ['missed_count', 'missedCount'] },
    { type: 'style_sample_sync', prefix: '校风格', priority: '优先校风格', countKeys: ['missed_count', 'missedCount', 'copy_risk_count', 'copyRiskCount'] },
    { type: 'innovation_sync', prefix: '补创新', priority: '优先补创新', countKeys: ['missed_count', 'missedCount'] },
    { type: 'volume_beat_sync', prefix: '补爆点', priority: '优先补爆点', countKeys: ['missed_count', 'missedCount'] },
    { type: 'governance_recheck_sync', prefix: '验恢复依据', priority: '优先验恢复依据', countKeys: ['missed_count', 'missedCount'] },
    { type: 'readability_review', prefix: '调可读性', priority: '优先调可读性', countKeys: ['risk_count', 'riskCount'] },
  ]
  const latestByType = new Map<string, any>()
  for (const review of asArray(reviews)) {
    const type = String(review?.review_type || '')
    if (!rules.some(rule => rule.type === type) && type !== 'storyline_sync') continue
    const payload = reviewPayloadForType(review, type)
    if (!reviewBelongsToChapter(review, payload, previousChapter)) continue
    const existing = latestByType.get(type)
    if (!existing || reviewTimestamp(review) >= reviewTimestamp(existing.review)) {
      latestByType.set(type, { review, payload })
    }
  }

  const riskRows: Array<{ count: number; item: string; priorityLabel: string; evidence: string[]; sourceReviewId: any }> = []
  for (const rule of rules) {
    const entry = latestByType.get(rule.type)
    if (!entry) continue
    const payload = entry.payload || {}
    const count = deliveryRiskCountFromPayload(payload, rule.countKeys)
    if (count <= 0 || String(payload?.status || '').toLowerCase() === 'ok') continue
    const priorityLabel = compactBriefText(
      payload?.priority_repair || payload?.priorityRepair || payload?.priority_label || payload?.priorityLabel,
      rule.type === 'reader_expectation_sync' && Number(payload?.opening_handoff_missed_count || payload?.openingHandoffMissedCount || 0) > 0
        ? '优先修开篇'
        : rule.priority || '优先复盘上一章',
    )
    riskRows.push({
      count,
      item: makeDeliveryRiskItem(rule.prefix, payload, count),
      priorityLabel,
      evidence: deliveryRiskEvidence(payload),
      sourceReviewId: entry.review?.id || null,
    })
  }
  const storylineEntry = latestByType.get('storyline_sync')
  if (storylineEntry) {
    const payload = storylineEntry.payload || {}
    const count = Number(payload?.missed_count || payload?.missedCount || asArray(payload?.missed).length)
      + Number(payload?.unplanned_count || payload?.unplannedCount || asArray(payload?.unplanned).length)
      + Number(payload?.forbidden_count || payload?.forbiddenCount || asArray(payload?.forbidden_touched || payload?.forbiddenTouched).length)
    if (count > 0 && String(payload?.status || '').toLowerCase() !== 'ok') {
      riskRows.push({
        count,
        item: makeDeliveryRiskItem('校剧情线', payload, count),
        priorityLabel: '优先校剧情线',
        evidence: deliveryRiskEvidence(payload),
        sourceReviewId: storylineEntry.review?.id || null,
      })
    }
  }

  const totalCount = riskRows.reduce((sum, row) => sum + row.count, 0)
  if (totalCount <= 0) return null
  return normalizeDeliveryRiskCarryOverContext({
    source_chapter_no: Number(previousChapter.chapter_no || 0) || null,
    total_count: totalCount,
    label: `待修复 ${totalCount}`,
    priority_label: riskRows[0]?.priorityLabel || '优先复盘上一章',
    items: riskRows.map(row => row.item),
    required_actions: [
      `第${previousChapter.chapter_no}章交稿风险必须在本章开篇、场景推进或章末钩子中得到可见承接。`,
      ...riskRows.flatMap(row => row.evidence.map(item => `修复：${item}`)),
    ],
    evidence: riskRows.flatMap(row => row.evidence),
    source_review_ids: riskRows.map(row => row.sourceReviewId).filter(Boolean),
  })
}

function buildReaderExpectationLedger(project: any, contextPackage: any, sceneBriefs: any[], readerRetentionBrief: any) {
  const chapterTarget = contextPackage?.chapter_target || {}
  const readerExpectationDebtContext = applyReaderExpectationDebtAging(
    normalizeReaderExpectationDebtContext(chapterTarget.reader_expectation_debt_context || contextPackage?.reader_expectation_debt_context),
    Number(chapterTarget.chapter_no || contextPackage?.chapter_no || 0),
  )
  const projectStoryState = project?.reference_config?.story_state || {}
  const contextStoryState = contextPackage?.story_state || {}
  const storyState = {
    ...projectStoryState,
    ...contextStoryState,
    open_questions: [
      ...asArray(projectStoryState?.open_questions),
      ...asArray(contextStoryState?.open_questions),
    ],
    payoff_queue: [
      ...asArray(projectStoryState?.payoff_queue),
      ...asArray(contextStoryState?.payoff_queue),
    ],
  }
  const carryOver = uniqueExpectationItems(readerExpectationDebtContext.must_carry)
  const previousHandoff = buildPreviousChapterHandoff(contextPackage)
  const mustDeliver = uniqueExpectationItems([
    ...carryOver,
    normalizeExpectationItem(previousHandoff, { key: 'opening_handoff', label: '上一章承接', type: 'opening_handoff' }),
    normalizeExpectationItem(readerRetentionBrief?.opening_hook, { key: 'opening_hook', label: '开篇钩子', type: 'hook' }),
    normalizeExpectationItem(readerRetentionBrief?.payoff_promise || chapterTarget.reader_promise || chapterTarget.payoff, { key: 'payoff_promise', label: '爽点承诺', type: 'payoff' }),
    normalizeExpectationItem(readerRetentionBrief?.emotional_reward, { key: 'emotional_reward', label: '情绪回报', type: 'emotion' }),
    ...sceneBriefs.map((scene: any, index: number) => normalizeExpectationItem(scene?.reader_payoff, { key: `scene_payoff_${index + 1}`, label: `场景${index + 1}回报`, type: 'scene_payoff' })),
    normalizeExpectationItem(readerRetentionBrief?.ending_question || chapterTarget.ending_hook, { key: 'ending_hook', label: '章末追读', type: 'hook' }),
  ].filter(Boolean))
  const keepAlive = uniqueExpectationItems([
    ...readerExpectationDebtContext.keep_alive,
    normalizeExpectationItem(readerRetentionBrief?.information_gap, { key: 'information_gap', label: '信息缺口', type: 'question' }),
    ...asArray(storyState?.open_questions).map((item: any, index: number) => normalizeExpectationItem(item, { key: `open_question_${index + 1}`, label: '保留悬念', type: 'question' })),
    ...asArray(storyState?.payoff_queue).map((item: any, index: number) => normalizeExpectationItem(item, { key: `payoff_queue_${index + 1}`, label: '待回收期待', type: 'payoff_debt' })),
  ].filter(Boolean))

  return {
    chapter_promise: compactBriefText(chapterTarget.reader_promise || readerRetentionBrief?.payoff_promise || contextPackage?.writing_bible?.promise || project?.synopsis),
    carry_over: carryOver.slice(0, 12),
    must_deliver: mustDeliver.slice(0, 12),
    keep_alive: keepAlive.slice(0, 12),
    must_not_break: [
      '已承诺的爽点、悬念和情绪回报不能整章只铺设定不兑现',
      '可以保留 keep_alive 中的长期疑问，但必须在正文中维持其存在感，不得遗忘或矛盾改写',
      '章末追读必须落到最后一幕的未解问题、升级威胁或新信息上',
    ],
  }
}

function buildChapterInnovationBrief(project: any, contextPackage: any, sceneBriefs: any[], longformCompass: any) {
  const compactPoint = (item: any) => compactBriefText(item).replace(/[。.!！?？]+$/g, '')
  const chapterTarget = contextPackage?.chapter_target || {}
  const writingBible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const commercial = writingBible?.commercial_positioning || project?.reference_config?.writing_bible?.commercial_positioning || {}
  const innovationAxis = asArray(longformCompass?.axes).find((axis: any) => String(axis?.key || '') === 'innovation_hook')
  const worldAxis = asArray(longformCompass?.axes).find((axis: any) => String(axis?.key || '') === 'world_hook')
  const executionPoints = [
    ...sceneBriefs.map((item: any) => item.reader_payoff),
    ...sceneBriefs.map((item: any) => item.rule_pressure),
    ...sceneBriefs.map((item: any) => item.reversal),
    chapterTarget.signature_scene_brief?.signature_scene,
    chapterTarget.signature_scene_brief?.reader_payoff,
    chapterTarget.reader_payoff,
  ].map(compactPoint).filter(Boolean)
  const ipHooks = [
    ...sceneBriefs.map((item: any) => item.title),
    ...sceneBriefs.map((item: any) => item.short_drama_scene),
    ...sceneBriefs.map((item: any) => item.conflict),
    chapterTarget.signature_scene_brief?.signature_scene,
    chapterTarget.short_drama_scene,
  ].map(compactPoint).filter(Boolean)
  const chapterAngle = compactBriefText(firstDefined(
    chapterTarget.innovation_angle,
    chapterTarget.innovation_hook,
    innovationAxis?.value,
    writingBible?.innovation_hook,
    commercial?.innovation_hook,
    asArray(commercial?.selling_points)[0],
    worldAxis?.value,
  ))
  const guardrails = Array.from(new Set([
    '不得写成普通开挂碾压',
    '不得把创新卖点降级成通用套路桥段',
    '新增人物、道具、支线必须服务本章创新角度和长期读者承诺',
    ...asArray(chapterTarget.innovation_guardrails),
    ...asArray(chapterTarget.differentiation_guardrails),
  ].map((item: any) => compactBriefText(item)).filter(Boolean))).slice(0, 8)

  const hasContent = chapterAngle || executionPoints.length || guardrails.length || ipHooks.length
  if (!hasContent) return null
  return {
    chapter_angle: chapterAngle,
    execution_points: Array.from(new Set(executionPoints)).slice(0, 8),
    differentiation_guardrails: guardrails,
    ip_adaptation_hooks: Array.from(new Set(ipHooks)).slice(0, 8),
  }
}

function normalizeSignatureSceneBrief(value: any) {
  const source = value?.signature_scene_brief || value?.rollingPlan || value?.rolling_plan || value || {}
  const signatureScene = compactBriefText(source.signature_scene || source.ip_scene || source.visual_scene || source.memorable_scene)
  const sceneRepairTarget = compactBriefText(source.scene_repair_target || source.scene_gap_repair || source.repair_target)
  const readerPayoff = compactBriefText(source.reader_payoff || source.reader_reward || source.commercial_payoff || source.payoff)
  const storylineService = compactBriefText(source.storyline_service || source.mainline_service || source.storyline_advance || source.mainline_progress)
  const hasContent = signatureScene || sceneRepairTarget || readerPayoff || storylineService
  if (!hasContent) return null
  return {
    signature_scene: signatureScene,
    scene_repair_target: sceneRepairTarget,
    reader_payoff: readerPayoff,
    storyline_service: storylineService,
    source: compactBriefText(source.source, 'rolling_plan'),
  }
}

const LONGFORM_COMPASS_AXIS_LABELS: Record<string, string> = {
  reader_promise: '读者承诺',
  protagonist_drive: '主角长期欲望',
  core_conflict: '核心矛盾',
  world_hook: '世界奇点',
  innovation_hook: '创新卖点',
  payoff_loop: '长期爽点循环',
  ending_direction: '结局方向',
}

function normalizeLongformCompassAxis(item: any) {
  const key = compactBriefText(item?.key)
  const value = compactBriefText(item?.value || item?.summary || item?.detail)
  if (!key || !value) return null
  return {
    key,
    label: compactBriefText(item?.label, LONGFORM_COMPASS_AXIS_LABELS[key] || key),
    value,
    locked: item?.locked !== false,
  }
}

function normalizeLongformCompass(value: any) {
  const raw = value?.compass || value?.longform_compass || value || {}
  const directAxes = asArray(raw.axes).map(normalizeLongformCompassAxis).filter(Boolean)
  const fieldAxes = [
    ['reader_promise', raw.reader_promise || raw.readerPromise],
    ['protagonist_drive', raw.protagonist_drive || raw.protagonistDrive],
    ['core_conflict', raw.core_conflict || raw.coreConflict],
    ['world_hook', raw.world_hook || raw.worldHook],
    ['innovation_hook', raw.innovation_hook || raw.innovationHook],
    ['payoff_loop', raw.payoff_loop || raw.payoffLoop],
    ['ending_direction', raw.ending_direction || raw.endingDirection],
  ].map(([key, axisValue]) => normalizeLongformCompassAxis({ key, value: axisValue })).filter(Boolean)
  const axes = directAxes.length ? directAxes : fieldAxes
  const immutableRules = Array.from(new Set([
    ...asArray(raw.immutable_rules),
    ...asArray(raw.immutableRules),
  ].map(item => compactBriefText(item)).filter(Boolean))).slice(0, 8)
  const flexibleZones = Array.from(new Set([
    ...asArray(raw.flexible_zones),
    ...asArray(raw.flexibleZones),
  ].map(item => compactBriefText(item)).filter(Boolean))).slice(0, 8)
  const readerPromise = compactBriefText(raw.reader_promise || raw.readerPromise || axes.find((axis: any) => axis.key === 'reader_promise')?.value)
  if (!readerPromise && !axes.length && !immutableRules.length && !flexibleZones.length) return null

  return {
    reader_promise: readerPromise,
    axes,
    immutable_rules: immutableRules,
    flexible_zones: flexibleZones,
  }
}

const CORE_CONTRACT_CHECK_LABELS: Record<string, string> = {
  reader_promise: '读者承诺',
  chapter_goal: '本章目标',
  chapter_objective: '本章目标',
  core_conflict: '核心冲突',
  mainline_service: '主线服务',
  reader_payoff: '读者回报',
  ending_hook: '章末钩子',
  innovation_hook: '创新卖点',
  forbidden_content: '不可偏移',
}

function uniqueBriefStrings(values: any[], limit = 12) {
  return Array.from(new Set(values
    .flatMap(value => Array.isArray(value) ? value : [value])
    .map(value => compactBriefText(value))
    .filter(Boolean))).slice(0, limit)
}

function normalizeCoreContractCheck(item: any, fallbackKey = '') {
  const key = compactBriefText(item?.key || item?.field || fallbackKey)
  const label = compactBriefText(item?.label || item?.title, CORE_CONTRACT_CHECK_LABELS[key] || key || '核心契约')
  const status = compactBriefText(item?.status || item?.state, 'ok').toLowerCase()
  const reason = compactBriefText(item?.reason || item?.detail || item?.message || item?.summary || item?.text)
  if (!key && !label && !reason) return null
  return {
    key: key || label,
    label: label || key,
    status,
    reason,
  }
}

function normalizeChapterLaunchGateChecks(gate: any) {
  if (!gate || typeof gate !== 'object') return []
  const signalChecks = asArray(gate.signals)
    .map((item: any) => normalizeCoreContractCheck(item))
    .filter(Boolean)
  const objectChecks = Object.entries(gate)
    .filter(([key, value]) => {
      if (['signals', 'summary'].includes(key)) return false
      return value && typeof value === 'object' && !Array.isArray(value)
    })
    .map(([key, value]: [string, any]) => normalizeCoreContractCheck({ key, ...value }, key))
    .filter(Boolean)
  const checks = signalChecks.length ? signalChecks : objectChecks
  if (checks.length) return checks
  const status = compactBriefText(gate.status)
  const summary = compactBriefText(gate.summary || gate.reason || gate.detail)
  return status || summary ? [normalizeCoreContractCheck({ key: 'chapter_launch_gate', label: '开写门禁', status, reason: summary })].filter(Boolean) : []
}

function normalizeCoreContractRadar(value: any) {
  const raw = value?.core_contract_radar || value?.coreContractRadar || value || {}
  const mustServe = uniqueBriefStrings(raw.must_serve || raw.mustServe || raw.required || raw.mustServePoints || [], 12)
  const noDrift = uniqueBriefStrings(raw.no_drift || raw.noDrift || raw.red_lines || raw.redLines || raw.immutable_rules || raw.immutableRules || [], 12)
  const repairFocus = uniqueBriefStrings(raw.repair_focus || raw.repairFocus || raw.required_actions || raw.requiredActions || [], 10)
  const checks = asArray(raw.checks).map((item: any) => normalizeCoreContractCheck(item)).filter(Boolean).slice(0, 8)
  const summary = compactBriefText(raw.summary || raw.detail || raw.reason || (
    mustServe.length ? `本章必须服务：${mustServe.slice(0, 3).join('；')}` : ''
  ))
  if (!summary && !mustServe.length && !noDrift.length && !repairFocus.length && !checks.length) return null
  return {
    summary,
    must_serve: mustServe,
    no_drift: noDrift,
    repair_focus: repairFocus,
    checks,
  }
}

function buildCoreContractRadar(project: any, contextPackage: any, sceneBriefs: any[], longformCompass: any, longformBattleContext: any = null) {
  const existing = normalizeCoreContractRadar(contextPackage?.chapter_target?.core_contract_radar || contextPackage?.core_contract_radar)
  if (existing) return existing
  const target = contextPackage?.chapter_target || {}
  const bible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const axes = asArray(longformCompass?.axes)
  const axisValue = (key: string) => axes.find((axis: any) => axis?.key === key)?.value
  const gateChecks = normalizeChapterLaunchGateChecks(target.chapter_launch_gate || contextPackage?.chapter_launch_gate)
  const drift = contextPackage?.chapter_core_drift || contextPackage?.core_drift || target.core_drift || {}
  const driftRisks = uniqueBriefStrings([drift.drift_risks, drift.risks, drift.issues], 8)
  const riskLaneActions = uniqueBriefStrings(asArray(longformBattleContext?.risk_lanes).map((lane: any) => lane?.required_action || lane?.detail), 6)
  const gateRepair = uniqueBriefStrings(
    gateChecks
      .filter((check: any) => ['warn', 'warning', 'block', 'blocked', 'risk', 'needs_action'].includes(String(check.status).toLowerCase()))
      .map((check: any) => check.reason || check.label),
    8,
  )
  const mustServe = uniqueBriefStrings([
    longformCompass?.reader_promise,
    axisValue('reader_promise'),
    axisValue('core_conflict'),
    axisValue('innovation_hook'),
    axisValue('payoff_loop'),
    bible.reader_promise,
    bible.promise,
    target.summary || target.goal || target.chapter_goal,
    target.conflict || target.core_conflict,
    sceneBriefs.map(item => item.reader_payoff),
  ], 12)
  const noDrift = uniqueBriefStrings([
    longformCompass?.immutable_rules,
    bible.immutable_rules,
    bible.red_lines,
    target.forbidden_content,
    target.forbidden_repeats,
  ], 12)
  const repairFocus = uniqueBriefStrings([
    gateRepair,
    driftRisks,
    riskLaneActions,
  ], 10)
  const checks = gateChecks.length
    ? gateChecks
    : [
        mustServe.length ? normalizeCoreContractCheck({ key: 'reader_promise', label: '读者承诺', status: 'ok', reason: mustServe[0] }) : null,
        target.summary ? normalizeCoreContractCheck({ key: 'chapter_goal', label: '本章目标', status: 'ok', reason: target.summary }) : null,
        target.conflict ? normalizeCoreContractCheck({ key: 'core_conflict', label: '核心冲突', status: 'ok', reason: target.conflict }) : null,
      ].filter(Boolean)
  const summary = compactBriefText(
    repairFocus.length
      ? `本章必须修正：${repairFocus.slice(0, 2).join('；')}`
      : mustServe.length
        ? `本章必须服务：${mustServe.slice(0, 3).join('；')}`
        : '',
  )
  return normalizeCoreContractRadar({
    summary,
    must_serve: mustServe,
    no_drift: noDrift,
    repair_focus: repairFocus,
    checks,
  })
}

function normalizeMemoryTextItem(value: any) {
  if (typeof value === 'string') return compactBriefText(value)
  if (!value || typeof value !== 'object') return ''
  const name = compactBriefText(value.name || value.title || value.key)
  const state = compactBriefText(value.state || value.current_state || value.summary || value.description || value.text)
  const chapterNo = Number(value.chapter_no || value.chapterNo || value.last_updated_chapter || 0)
  const chapterLabel = chapterNo ? `@第${chapterNo}章` : ''
  return compactBriefText([name, state].filter(Boolean).join('：') + chapterLabel)
}

function normalizeLongformMemoryCapsule(value: any) {
  const raw = value?.longform_memory_capsule || value?.longformMemoryCapsule || value?.longform_memory_anchor || value?.longformMemoryAnchor || value || {}
  const characterStates = Array.from(new Set([
    ...asArray(raw.character_states),
    ...asArray(raw.characterStates),
    ...asArray(raw.characters),
  ].map(normalizeMemoryTextItem).filter(Boolean))).slice(0, 10)
  const openQuestions = Array.from(new Set([
    ...asArray(raw.open_questions),
    ...asArray(raw.openQuestions),
    ...asArray(raw.unresolved_questions),
    ...asArray(raw.unresolvedQuestions),
  ].map(normalizeMemoryTextItem).filter(Boolean))).slice(0, 10)
  const payoffDebts = Array.from(new Set([
    ...asArray(raw.payoff_debts),
    ...asArray(raw.payoffDebts),
    ...asArray(raw.debts),
    ...asArray(raw.reader_debts),
  ].map(normalizeMemoryTextItem).filter(Boolean))).slice(0, 10)
  const canonFacts = Array.from(new Set([
    ...asArray(raw.canon_facts),
    ...asArray(raw.canonFacts),
    ...asArray(raw.facts),
  ].map(normalizeMemoryTextItem).filter(Boolean))).slice(0, 10)
  const redLines = Array.from(new Set([
    ...asArray(raw.red_lines),
    ...asArray(raw.redLines),
    ...asArray(raw.immutable_rules),
    ...asArray(raw.immutableRules),
  ].map(normalizeMemoryTextItem).filter(Boolean))).slice(0, 10)
  const capsule = {
    last_updated_chapter: Number(raw.last_updated_chapter || raw.lastUpdatedChapter || 0) || null,
    core_promise: compactBriefText(raw.core_promise || raw.corePromise || raw.reader_promise || raw.readerPromise),
    current_volume_goal: compactBriefText(raw.current_volume_goal || raw.currentVolumeGoal || raw.volume_goal || raw.volumeGoal),
    mainline_progress: compactBriefText(raw.mainline_progress || raw.mainlineProgress || raw.current_mainline || raw.currentMainline),
    character_states: characterStates,
    open_questions: openQuestions,
    payoff_debts: payoffDebts,
    canon_facts: canonFacts,
    red_lines: redLines,
  }
  const hasCapsule = Boolean(
    capsule.last_updated_chapter
    || capsule.core_promise
    || capsule.current_volume_goal
    || capsule.mainline_progress
    || capsule.character_states.length
    || capsule.open_questions.length
    || capsule.payoff_debts.length
    || capsule.canon_facts.length
    || capsule.red_lines.length
  )
  return hasCapsule ? capsule : null
}

function buildLongformMemoryCapsule(project: any, writingBible: any) {
  const storyState = project?.reference_config?.story_state || project?.story_state || {}
  const global = storyState?.global || storyState || {}
  return normalizeLongformMemoryCapsule({
    last_updated_chapter: storyState.last_updated_chapter || global.last_updated_chapter,
    core_promise: writingBible?.reader_promise || writingBible?.promise || writingBible?.core_selling_point || global.reader_promise || global.core_promise || project?.synopsis,
    current_volume_goal: global.current_volume_goal || global.volume_goal || storyState.current_volume_goal || storyState.volume_goal,
    mainline_progress: global.mainline_progress || global.current_mainline || global.mainline || storyState.mainline_progress || storyState.current_mainline || storyState.mainline,
    character_states: [
      ...asArray(storyState.character_states),
      ...asArray(global.character_states),
      ...asArray(storyState.characters),
      ...asArray(global.characters),
    ],
    open_questions: [
      ...asArray(storyState.open_questions),
      ...asArray(global.open_questions),
      ...asArray(storyState.unresolved_questions),
      ...asArray(global.unresolved_questions),
    ],
    payoff_debts: [
      ...asArray(storyState.payoff_debts),
      ...asArray(global.payoff_debts),
      ...asArray(storyState.payoff_queue),
      ...asArray(global.payoff_queue),
    ],
    canon_facts: [
      ...asArray(storyState.canon_facts),
      ...asArray(global.canon_facts),
      ...asArray(storyState.facts),
      ...asArray(global.facts),
    ],
    red_lines: [
      ...asArray(writingBible?.immutable_rules),
      ...asArray(writingBible?.immutableRules),
      ...asArray(global.red_lines),
      ...asArray(storyState.red_lines),
    ],
  })
}

const LONGFORM_BATTLE_LANE_LABELS: Record<string, string> = {
  story_core: '核心守恒',
  reader_pull: '读者拉力',
  storyline: '剧情线调度',
  volume_beat: '卷级爆点',
  innovation_ip: '创新/IP场面',
  production_fuel: '生产燃料',
}

function isLongformBattleLaneRisk(status: string, score: number | null) {
  const normalized = status.toLowerCase()
  if (['block', 'blocked', 'warn', 'warning', 'needs_action', 'risk'].includes(normalized)) return true
  if (Number.isFinite(Number(score)) && Number(score) < 78) return true
  return false
}

function normalizeLongformBattleLane(item: any) {
  const key = compactBriefText(item?.key || item?.lane_key || item?.laneKey)
  const label = compactBriefText(item?.label || item?.title, LONGFORM_BATTLE_LANE_LABELS[key] || key)
  const detail = compactBriefText(item?.detail || item?.summary || item?.reason || item?.risk)
  const requiredAction = compactBriefText(
    item?.required_action || item?.requiredAction || item?.action || item?.action_label || item?.actionLabel,
  )
  const score = Number.isFinite(Number(item?.score)) ? Number(item.score) : null
  const status = compactBriefText(item?.status, score !== null && score < 78 ? 'warn' : 'ok')
  if (!key && !label && !detail && !requiredAction) return null
  return {
    key: key || label,
    label: label || key,
    status,
    score,
    detail,
    required_action: requiredAction,
  }
}

function normalizeLongformBattleContext(value: any) {
  const raw = value?.longform_battle_context || value?.longformBattleContext || value?.longform_battle_desk || value?.longformBattleDesk || value || {}
  const lanes = asArray(raw.lanes).map(normalizeLongformBattleLane).filter(Boolean).slice(0, 8)
  const explicitRiskLanes = asArray(raw.risk_lanes || raw.riskLanes)
    .map(normalizeLongformBattleLane)
    .filter(Boolean)
  const riskLanes = (explicitRiskLanes.length ? explicitRiskLanes : lanes.filter((lane: any) => isLongformBattleLaneRisk(lane.status, lane.score))).slice(0, 6)
  const primaryActionRaw = raw.primary_action || raw.primaryAction || {}
  const primaryAction = {
    key: compactBriefText(primaryActionRaw.key),
    label: compactBriefText(primaryActionRaw.label || primaryActionRaw.title || raw.primary_action_label || raw.primaryActionLabel),
    reason: compactBriefText(primaryActionRaw.reason || primaryActionRaw.detail || raw.primary_action_reason || raw.primaryActionReason),
  }
  const riskChips = Array.from(new Set([
    ...asArray(raw.risk_chips),
    ...asArray(raw.riskChips),
    ...riskLanes.map((lane: any) => lane.label || lane.detail),
  ].map(item => compactBriefText(item)).filter(Boolean))).slice(0, 8)
  const summary = compactBriefText(raw.summary || raw.detail || raw.reason || (riskLanes.length ? `本章需处理：${riskLanes.map((lane: any) => lane.label).join('、')}` : ''))
  const status = compactBriefText(raw.status, riskLanes.some((lane: any) => String(lane.status).toLowerCase().includes('block')) ? 'blocked' : riskLanes.length ? 'needs_action' : 'ready')
  const score = Number.isFinite(Number(raw.score)) ? Number(raw.score) : null
  if (!summary && !lanes.length && !riskLanes.length && !riskChips.length) return null

  return {
    status,
    score,
    summary,
    risk_chips: riskChips,
    primary_action: primaryAction.label || primaryAction.reason || primaryAction.key ? primaryAction : null,
    lanes,
    risk_lanes: riskLanes,
  }
}

function latestLongformCompassFromReviews(reviews: any[]) {
  const review = reviews
    .filter(item => item?.review_type === 'longform_creation_diagnosis')
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0]
  const payload = parseJsonLikePayload(review?.payload) || {}
  const report = payload.report || payload.result?.report || payload
  return normalizeLongformCompass(report?.compass || report?.longform_compass || null)
}

function normalizeNextBatchChapter(item: any) {
  const chapterNo = Number(item?.chapter_no || item?.chapterNo || 0)
  if (!chapterNo) return null
  return {
    chapter_no: chapterNo,
    title: compactBriefText(item?.title, `第${chapterNo}章`),
    chapter_task: compactBriefText(item?.chapter_task || item?.chapterTask || item?.task || item?.chapter_goal || item?.chapterGoal),
    conflict: compactBriefText(item?.conflict),
    ending_hook: compactBriefText(item?.ending_hook || item?.endingHook || item?.hook),
    mainline_progress: compactBriefText(item?.mainline_progress || item?.mainlineProgress),
  }
}

function normalizeNextBatchChecklistItem(item: any) {
  const key = compactBriefText(item?.key)
  const label = compactBriefText(item?.label || item?.name || key)
  const statusRaw = compactBriefText(item?.status)
  const status = ['ok', 'warn', 'block'].includes(statusRaw) ? statusRaw : statusRaw === 'blocked' ? 'block' : statusRaw || 'warn'
  const detail = compactBriefText(item?.detail || item?.summary || item?.description)
  if (!key && !label && !detail) return null
  return {
    key,
    label,
    status,
    detail,
  }
}

function chapterNosBrief(chapterNos: any[] = []) {
  return asArray(chapterNos)
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => chapterNo > 0)
    .map((chapterNo: number) => `第${chapterNo}章`)
    .join('、')
}

function normalizeDefaultFiveChapterRegression(value: any) {
  const raw = value?.default_five_chapter_regression || value?.defaultFiveChapterRegression || value || {}
  if (!raw || raw.visible === false) return null
  const repeated = raw.repeated_hotspot_segment || raw.repeatedHotspotSegment || null
  const normalized = {
    visible: true,
    status: compactBriefText(raw.status || ''),
    label: compactBriefText(raw.label || '默认5章档位回退原因'),
    source: compactBriefText(raw.source || ''),
    stable_pass_streak: Number(raw.stable_pass_streak ?? raw.stablePassStreak ?? 0),
    required_stable_pass_streak: Number(raw.required_stable_pass_streak ?? raw.requiredStablePassStreak ?? 0),
    default_batch_chapter_nos: asArray(raw.default_batch_chapter_nos || raw.defaultBatchChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0)
      .slice(0, 10),
    restore_chapter_nos: asArray(raw.restore_chapter_nos || raw.restoreChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0)
      .slice(0, 10),
    validation_chapter_nos: asArray(raw.validation_chapter_nos || raw.validationChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0)
      .slice(0, 10),
    repeated_hotspot_segment: repeated ? {
      key: compactBriefText(repeated.key),
      label: compactBriefText(repeated.label || repeated.key),
      risk_count: Number(repeated.risk_count ?? repeated.riskCount ?? 0),
    } : null,
    failure_reasons: asArray(raw.failure_reasons || raw.failureReasons)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
      .slice(0, 6),
    summary: compactBriefText(raw.summary || ''),
  }
  const hasContent = normalized.default_batch_chapter_nos.length
    || normalized.restore_chapter_nos.length
    || normalized.validation_chapter_nos.length
    || normalized.failure_reasons.length
    || normalized.summary
  return hasContent ? normalized : null
}

function normalizeExpansionStructureVerification(value: any) {
  const raw = value?.expansion_structure_verification || value?.expansionStructureVerification || value || {}
  const repeated = raw.repeated_hotspot_segment || raw.repeatedHotspotSegment || null
  const defaultFiveChapterRegression = normalizeDefaultFiveChapterRegression(
    raw.default_five_chapter_regression || raw.defaultFiveChapterRegression,
  )
  const normalized = {
    source: compactBriefText(raw.source || 'safe_batch_expansion_structure_repair'),
    label: compactBriefText(raw.label || '扩批结构验证'),
    repeated_hotspot_segment: repeated ? {
      key: compactBriefText(repeated.key),
      label: compactBriefText(repeated.label),
      count: Number(repeated.count || 0),
    } : null,
    validation_chapter_nos: asArray(raw.validation_chapter_nos || raw.validationChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0)
      .slice(0, 5),
    fixed_segment_role: compactBriefText(raw.fixed_segment_role || raw.fixedSegmentRole),
    conflict_rotation: compactBriefText(raw.conflict_rotation || raw.conflictRotation),
    explicit_payoff: compactBriefText(raw.explicit_payoff || raw.explicitPayoff),
    ending_hook_requirement: compactBriefText(raw.ending_hook_requirement || raw.endingHookRequirement),
    structure_actions: asArray(raw.structure_actions || raw.structureActions)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
      .slice(0, 5),
    default_five_chapter_regression: defaultFiveChapterRegression,
  }
  const hasContent = normalized.validation_chapter_nos.length
    || normalized.fixed_segment_role
    || normalized.conflict_rotation
    || normalized.explicit_payoff
    || normalized.ending_hook_requirement
    || normalized.structure_actions.length
    || normalized.default_five_chapter_regression
  return hasContent ? normalized : null
}

function normalizeDefaultFiveChapterLaneRedesign(value: any) {
  const raw = value?.default_five_chapter_lane_redesign || value?.defaultFiveChapterLaneRedesign || value || {}
  const repeatedFailureReasons = asArray(raw.repeated_failure_reasons || raw.repeatedFailureReasons)
    .map((item: any) => compactBriefText(item?.reason || item?.label || item))
    .filter(Boolean)
    .slice(0, 8)
  const normalized = {
    reason: compactBriefText(raw.reason),
    label: compactBriefText(raw.label || '默认5章档位结构重构'),
    summary: compactBriefText(raw.summary),
    relapse_count: Number(raw.relapse_count ?? raw.relapseCount ?? 0),
    repeated_failure_reasons: repeatedFailureReasons,
    segment_duty_rewrite: compactBriefText(raw.segment_duty_rewrite || raw.segmentDutyRewrite),
    conflict_rotation: compactBriefText(raw.conflict_rotation || raw.conflictRotation),
    payoff_density: compactBriefText(raw.payoff_density || raw.payoffDensity),
    ending_hook_template: compactBriefText(raw.ending_hook_template || raw.endingHookTemplate),
  }
  const hasContent = normalized.reason
    || normalized.summary
    || normalized.relapse_count > 0
    || normalized.repeated_failure_reasons.length
    || normalized.segment_duty_rewrite
    || normalized.conflict_rotation
    || normalized.payoff_density
    || normalized.ending_hook_template
  return hasContent ? normalized : null
}

function normalizeExpansionStructureDecision(value: any) {
  const raw = value?.expansion_structure_decision || value?.expansionStructureDecision || value || {}
  const observationMetrics = asArray(raw.observation_metrics || raw.observationMetrics)
    .map((item: any) => compactBriefText(item))
    .filter(Boolean)
    .slice(0, 6)
  const defaultFiveChapterLaneRedesign = normalizeDefaultFiveChapterLaneRedesign(
    raw.default_five_chapter_lane_redesign || raw.defaultFiveChapterLaneRedesign,
  )
  const normalized = {
    visible: raw.visible !== false,
    label: compactBriefText(raw.label || '结构修复决策'),
    recommendation: compactBriefText(raw.recommendation),
    target_chapter_count: Number(raw.target_chapter_count ?? raw.targetChapterCount ?? 0),
    mode_label: compactBriefText(raw.mode_label || raw.modeLabel),
    summary: compactBriefText(raw.summary),
    instruction: compactBriefText(raw.instruction),
    source_run_id: raw.source_run_id ?? raw.sourceRunId ?? null,
    segment_key: compactBriefText(raw.segment_key || raw.segmentKey),
    segment_label: compactBriefText(raw.segment_label || raw.segmentLabel),
    observation_metrics: observationMetrics,
    default_five_chapter_lane_redesign: defaultFiveChapterLaneRedesign,
  }
  const hasContent = normalized.recommendation
    || normalized.mode_label
    || normalized.summary
    || normalized.instruction
    || normalized.observation_metrics.length
    || normalized.default_five_chapter_lane_redesign
  return hasContent ? normalized : null
}

function normalizeNextBatchBrief(value: any, targetChapterNo = 0) {
  const raw = value?.next_batch_brief || value?.nextBatchBrief || value || {}
  const chapters = asArray(raw.chapters).map(normalizeNextBatchChapter).filter(Boolean).slice(0, 10)
  const startChecklist = asArray(raw.start_checklist || raw.startChecklist || raw.start_checklist_items || raw.startChecklistItems)
    .map(normalizeNextBatchChecklistItem)
    .filter(Boolean)
    .slice(0, 8)
  const currentChapter = chapters.find((item: any) => Number(item.chapter_no) === Number(targetChapterNo)) || null
  const currentChapterRole = compactBriefText(
    raw.current_chapter_role || raw.currentChapterRole || currentChapter?.chapter_task || currentChapter?.conflict || currentChapter?.mainline_progress,
  )
  const expansionStructureVerification = normalizeExpansionStructureVerification(
    raw.expansion_structure_verification || raw.expansionStructureVerification,
  )
  const expansionStructureDecision = normalizeExpansionStructureDecision(
    raw.expansion_structure_decision || raw.expansionStructureDecision,
  )
  const normalized = {
    chapter_range_label: compactBriefText(raw.chapter_range_label || raw.chapterRangeLabel),
    batch_goal: compactBriefText(raw.batch_goal || raw.batchGoal),
    reader_payoff_plan: compactBriefText(raw.reader_payoff_plan || raw.readerPayoffPlan),
    mainline_focus: compactBriefText(raw.mainline_focus || raw.mainlineFocus),
    forbidden_boundary: compactBriefText(raw.forbidden_boundary || raw.forbiddenBoundary),
    current_chapter_role: currentChapterRole,
    expansion_structure_verification: expansionStructureVerification,
    expansion_structure_decision: expansionStructureDecision,
    start_checklist: startChecklist,
    chapters,
  }
  const hasContent = normalized.chapter_range_label
    || normalized.batch_goal
    || normalized.reader_payoff_plan
    || normalized.mainline_focus
    || normalized.forbidden_boundary
    || normalized.current_chapter_role
    || normalized.expansion_structure_verification
    || normalized.expansion_structure_decision
    || normalized.start_checklist.length
    || normalized.chapters.length
  return hasContent ? normalized : null
}

function normalizeStoryUnitContext(value: any, targetChapterNo = 0) {
  const raw = value?.story_unit_context || value?.storyUnitContext || value || {}
  const textList = (...values: any[]) => Array.from(new Set(values
    .flatMap(item => Array.isArray(item) ? item : [item])
    .map(item => compactBriefText(item))
    .filter(Boolean)))
  const currentChapter = asArray(raw.chapters)
    .find((item: any) => Number(item?.chapter_no || item?.chapterNo || 0) === Number(targetChapterNo)) || null
  const normalized = {
    title: compactBriefText(raw.title || raw.unit_title || raw.unitTitle || raw.story_unit_title || raw.storyUnitTitle),
    chapter_range_label: compactBriefText(raw.chapter_range_label || raw.chapterRangeLabel || raw.range_label || raw.rangeLabel),
    current_chapter_role: compactBriefText(raw.current_chapter_role || raw.currentChapterRole || raw.chapter_role || raw.chapterRole || currentChapter?.role || currentChapter?.chapter_role),
    unit_goal: compactBriefText(raw.unit_goal || raw.unitGoal || raw.goal || raw.summary),
    entry_hook: compactBriefText(raw.entry_hook || raw.entryHook || raw.opening_hook || raw.openingHook),
    pressure_escalation: textList(raw.pressure_escalation, raw.pressureEscalation, raw.escalation, raw.escalations),
    mini_climax_payoff: compactBriefText(raw.mini_climax_payoff || raw.miniClimaxPayoff || raw.payoff || raw.climax || raw.mini_climax),
    setup_and_storyline: textList(raw.setup_and_storyline, raw.setupAndStoryline, raw.foreshadowing, raw.storyline, raw.storylines),
    exit_hook: compactBriefText(raw.exit_hook || raw.exitHook || raw.ending_hook || raw.endingHook),
    forbidden_advance: textList(raw.forbidden_advance, raw.forbiddenAdvance, raw.forbidden, raw.do_not_advance, raw.doNotAdvance),
  }
  const hasContent = Object.values(normalized).some(value => Array.isArray(value) ? value.length > 0 : Boolean(value))
  return hasContent ? normalized : null
}

function storyUnitRoleForChapter(chapter: any, position: number, total: number) {
  const payload = chapter?.raw_payload || {}
  const explicit = compactBriefText(
    payload.story_unit_role || payload.storyUnitRole || payload.unit_role || payload.unitRole || payload.episode_role || payload.episodeRole,
  )
  if (explicit) return explicit
  const haystack = compactBriefText([
    chapter?.title,
    chapter?.chapter_summary,
    chapter?.conflict,
    chapter?.ending_hook,
  ].filter(Boolean).join(' '))
  if (/高潮|回报|兑现|反杀|打脸|收束/.test(haystack)) return '小高潮/回报'
  if (position === 0) return '入口钩子'
  if (position === total - 1 && total > 1) return '出单元钩子'
  return '压力升级/推进'
}

function buildStoryUnitContext(chapter: any, chapters: any[] = [], outlines: any[] = []) {
  const targetNo = Number(chapter?.chapter_no || 0)
  const explicit = normalizeStoryUnitContext(
    chapter?.raw_payload?.pre_draft_brief?.story_unit_context
      || chapter?.raw_payload?.story_unit_context
      || chapter?.raw_payload?.storyUnitContext,
    targetNo,
  )
  if (explicit) return explicit
  if (!targetNo) return null

  const raw = chapter?.raw_payload || {}
  const startNo = Number(raw.story_unit_start_chapter || raw.storyUnitStartChapter || raw.unit_start_chapter || raw.unitStartChapter || targetNo) || targetNo
  const endNo = Number(raw.story_unit_end_chapter || raw.storyUnitEndChapter || raw.unit_end_chapter || raw.unitEndChapter || startNo + 5) || startNo + 5
  const sorted = asArray(chapters)
    .filter((item: any) => Number(item?.chapter_no || 0) >= startNo && Number(item?.chapter_no || 0) <= endNo)
    .sort((a: any, b: any) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
  const unitChapters = sorted.length ? sorted : [chapter]
  const currentIndex = Math.max(0, unitChapters.findIndex((item: any) => Number(item?.chapter_no || 0) === targetNo))
  const first = unitChapters[0] || chapter
  const last = unitChapters[unitChapters.length - 1] || chapter
  const outlineHint = asArray(outlines)
    .find((item: any) => /单元|事件|阶段|篇|卷/.test(compactBriefText(item?.outline_type || item?.title || item?.summary))) || null
  const title = compactBriefText(
    raw.story_unit_title || raw.storyUnitTitle || raw.unit_title || raw.unitTitle || outlineHint?.title,
    `第${startNo}-${Number(last?.chapter_no || endNo)}章剧情单元`,
  )
  const pressureEscalation = unitChapters
    .slice(Math.max(0, currentIndex), Math.min(unitChapters.length, currentIndex + 4))
    .map((item: any) => compactBriefText(item?.conflict || item?.chapter_summary || item?.ending_hook || item?.title))
    .filter(Boolean)
  const climaxChapter = unitChapters.find((item: any) => /高潮|回报|兑现|反杀|打脸|收束/.test(compactBriefText([
    item?.title,
    item?.chapter_summary,
    item?.conflict,
    item?.ending_hook,
  ].filter(Boolean).join(' ')))) || unitChapters[Math.min(unitChapters.length - 1, Math.max(0, Math.floor(unitChapters.length * 0.65)))]
  const setupAndStoryline = Array.from(new Set([
    ...asArray(raw.foreshadowing_task),
    ...asArray(raw.foreshadowingTask),
    ...asArray(raw.storyline_task),
    ...asArray(raw.storylineTask),
    compactBriefText(chapter?.conflict),
  ].map(item => compactBriefText(item)).filter(Boolean))).slice(0, 6)

  return normalizeStoryUnitContext({
    title,
    chapter_range_label: `第${startNo}-${Number(last?.chapter_no || endNo)}章`,
    current_chapter_role: storyUnitRoleForChapter(chapter, currentIndex, unitChapters.length),
    unit_goal: compactBriefText(raw.story_unit_goal || raw.storyUnitGoal || outlineHint?.summary || `完成${title}的入口、升级、回报和出单元钩子。`),
    entry_hook: compactBriefText(first?.chapter_summary || first?.ending_hook || first?.title),
    pressure_escalation: pressureEscalation,
    mini_climax_payoff: compactBriefText(climaxChapter?.ending_hook || climaxChapter?.chapter_summary || climaxChapter?.conflict || climaxChapter?.title),
    setup_and_storyline: setupAndStoryline,
    exit_hook: compactBriefText(last?.ending_hook || last?.chapter_summary || last?.title),
    forbidden_advance: [
      ...asArray(raw.forbidden_repeats),
      ...asArray(raw.forbidden_advance),
      ...asArray(raw.forbiddenAdvance),
    ],
  }, targetNo)
}

function first30SegmentKeyForChapter(chapterNo: number) {
  if (chapterNo >= 1 && chapterNo <= 3) return '1-3'
  if (chapterNo >= 4 && chapterNo <= 10) return '4-10'
  if (chapterNo >= 11 && chapterNo <= 30) return '11-30'
  return ''
}

function reviewTimestamp(review: any) {
  const raw = String(review?.created_at || review?.updated_at || '')
  const timestamp = Date.parse(raw)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function first30RetentionRiskLevel(score: number, flags: string[]) {
  if (score > 0 && score < 65) return 'high'
  if (flags.some(flag => /缺正文|章末钩子弱|爽点|悬念/.test(flag))) return 'high'
  if (score > 0 && score < 80) return 'medium'
  if (flags.length > 0) return 'medium'
  return 'ok'
}

function first30FlagAction(flag: string) {
  if (/目标不清/.test(flag)) return '补明确章节目标和主角选择。'
  if (/章末钩子弱/.test(flag)) return '重做章末未解决问题、威胁升级或利益诱惑。'
  if (/爽点|悬念/.test(flag)) return '增加一个可感知收益、信息揭示、关系反转或风险升级。'
  if (/缺正文/.test(flag)) return '先完成正文初稿，再重新运行前30章留存诊断。'
  if (/重复/.test(flag)) return '减少重复表达，用新的选择、阻碍或信息增量替换水文。'
  return ''
}

export function buildFirst30RetentionContext(chapterTarget: any, reviews: any[] = []) {
  const chapterNo = Number(chapterTarget?.chapter_no || 0)
  if (chapterNo < 1 || chapterNo > 30) return null
  const review = asArray(reviews)
    .filter((item: any) => String(item?.review_type || '') === 'first30_retention_diagnosis')
    .sort((a: any, b: any) => reviewTimestamp(b) - reviewTimestamp(a))[0]
  if (!review) return null
  const payload = parseJsonLikePayload(review.payload) || {}
  const report = payload.report || payload.result?.report || payload
  if (!report || typeof report !== 'object') return null
  const segmentKey = first30SegmentKeyForChapter(chapterNo)
  const chapterId = Number(chapterTarget?.id || 0)
  const chapterCard = asArray(report.chapter_cards).find((row: any) => {
    const rowNo = Number(row?.chapter_no || 0)
    const rowId = Number(row?.chapter_id || 0)
    return rowNo === chapterNo || (chapterId > 0 && rowId === chapterId)
  }) || null
  const segment = asArray(report.segments).find((item: any) => String(item?.key || '') === segmentKey) || null
  const flags = asArray(chapterCard?.flags).map((item: any) => compactBriefText(item)).filter(Boolean)
  const segmentRisks = asArray(report.risks)
    .filter((risk: any) => {
      const riskSegment = String(risk?.segment || '')
      return riskSegment === segmentKey || (!riskSegment && String(risk?.severity || '') === 'high')
    })
    .map((risk: any) => ({
      severity: compactBriefText(risk?.severity),
      issue: compactBriefText(risk?.issue),
      action: compactBriefText(risk?.action),
    }))
    .filter((risk: any) => risk.issue || risk.action)
  const score = Number(chapterCard?.score || 0)
  const riskLevel = first30RetentionRiskLevel(score, flags)
  const requiredActions = Array.from(new Set([
    ...segmentRisks.map((risk: any) => risk.action),
    ...flags.map(first30FlagAction),
  ].map((item: any) => compactBriefText(item)).filter(Boolean))).slice(0, 8)
  if (!chapterCard && !segmentRisks.length) return null
  if (riskLevel === 'ok' && !segmentRisks.length) return null
  return {
    report_score: Number(report.score || 0) || null,
    report_status: compactBriefText(report.status),
    report_summary: compactBriefText(report.summary),
    report_created_at: compactBriefText(review.created_at || report.created_at),
    promise_ready: Boolean(report.positioning?.promise_ready),
    reader_promise: compactBriefText(report.positioning?.reader_promise),
    chapter_no: chapterNo,
    chapter_score: score || null,
    chapter_title: compactBriefText(chapterCard?.title || chapterTarget?.title),
    segment_key: segmentKey,
    segment_label: compactBriefText(segment?.label || segmentKey),
    segment_score: Number(segment?.score || 0) || null,
    flags,
    risks: segmentRisks,
    risk_level: segmentRisks.some((risk: any) => risk.severity === 'high') ? 'high' : riskLevel,
    repair_focus: compactBriefText([
      chapterCard ? `第${chapterNo}章留存分 ${score || '-'}` : '',
      flags.length ? `风险：${flags.join('、')}` : '',
      segmentRisks[0]?.issue || '',
    ].filter(Boolean).join('；')),
    required_actions: requiredActions,
  }
}

function storylineUsageName(item: any) {
  return String(item?.name || item?.summary || item?.entity_type || '').trim()
}

function storylineUsageByType(storylineContext: any, types: string[]) {
  return asArray(storylineContext?.chapter_usage)
    .filter((item: any) => types.includes(String(item?.usage_type || '')))
    .map(storylineUsageName)
    .filter(Boolean)
}

function settingJsonObject(value: any) {
  const parsed = parseJsonLikePayload(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
}

function characterArcText(...values: any[]) {
  for (const value of values) {
    const text = compactText(value, 260)
    if (text) return text
  }
  return ''
}

function characterArcListText(...values: any[]) {
  return Array.from(new Set(values.flatMap(value => asArray(value).map((item: any) => compactText(item, 80)).filter(Boolean))))
}

function characterArcJoinedText(...values: any[]) {
  return Array.from(new Set(values.map(value => compactText(value, 220)).filter(Boolean))).join('；')
}

function characterArcUsageKey(item: any) {
  const id = Number(item?.entity_id || item?.id || 0)
  const name = compactBriefText(item?.name || item?.title)
  return id ? `id:${id}` : name ? `name:${name}` : ''
}

function characterArcEntityKeys(entity: any) {
  const id = Number(entity?.id || entity?.entity_id || 0)
  const name = compactBriefText(entity?.name || entity?.title)
  return [id ? `id:${id}` : '', name ? `name:${name}` : ''].filter(Boolean)
}

function characterArcTypeLabel(type: string) {
  return type === 'relationship_arc' ? '关系线' : '角色线'
}

function buildCharacterArcBriefFromContext(contextPackage: any) {
  const target = contextPackage?.chapter_target || {}
  const explicit = target.character_arc_brief
    || target.characterArcBrief
    || contextPackage?.pre_draft_brief?.character_arc_brief
    || contextPackage?.pre_draft_brief?.characterArcBrief
    || contextPackage?.character_arc_context
    || contextPackage?.characterArcContext
  if (explicit && typeof explicit === 'object' && Object.keys(explicit).length > 0) return explicit

  const chapterNo = Number(target.chapter_no || 0)
  const chapterText = [
    target.title,
    target.summary,
    target.goal,
    target.chapter_goal,
    target.conflict,
    target.ending_hook,
  ].map(item => compactBriefText(item)).filter(Boolean).join(' ')
  const entities = [
    ...asArray(contextPackage?.setting_context?.entities),
    ...asArray(contextPackage?.storyline_context?.entities),
  ]
  const usages = [
    ...asArray(contextPackage?.setting_context?.chapter_usage),
    ...asArray(contextPackage?.storyline_context?.chapter_usage),
  ].filter((item: any) => ['advance', 'plant', 'payoff', 'required'].includes(String(item?.usage_type || 'advance')))
  const usageMap = new Map<string, any>()
  for (const usage of usages) {
    const key = characterArcUsageKey(usage)
    if (key && !usageMap.has(key)) usageMap.set(key, usage)
  }

  const arcs = entities
    .filter((entity: any) => ['character_arc', 'relationship_arc'].includes(String(entity?.entity_type || entity?.type || '')))
    .map((entity: any) => {
      const entityType = String(entity?.entity_type || entity?.type || 'character_arc')
      const payload = settingJsonObject(entity?.payload_json || entity?.payload || {})
      const constraints = settingJsonObject(entity?.constraints_json || entity?.constraints || {})
      const state = settingJsonObject(entity?.state_json || entity?.state || {})
      const keys = characterArcEntityKeys(entity)
      const usage = keys.map(key => usageMap.get(key)).find(Boolean)
        || usages.find((item: any) => compactBriefText(item?.name) && compactBriefText(entity?.name).includes(compactBriefText(item?.name)))
        || null
      const expected = settingJsonObject(usage?.expected_state_change || usage?.expectedStateChange || {})
      const relatedCharacters = characterArcListText(payload?.related_characters, payload?.characters, payload?.related_names, payload?.relatedNames)
      const nextAdvanceChapter = Number(state?.next_advance_chapter || payload?.next_advance_chapter || 0)
      const due = Boolean(chapterNo && nextAdvanceChapter && nextAdvanceChapter <= chapterNo)
      const mentioned = Boolean(chapterText && [
        compactBriefText(entity?.name),
        ...relatedCharacters,
      ].some(token => token && chapterText.includes(token)))
      if (!usage && !due && !mentioned) return null
      const growthBeat = characterArcJoinedText(
        expected?.growth_beat,
        expected?.growthBeat,
        expected?.character_growth,
        expected?.characterGrowth,
        expected?.next,
        payload?.growth_beat,
        payload?.growthBeat,
        payload?.growth_target,
        payload?.growthTarget,
        payload?.expected_payoff,
      )
      const relationshipShift = characterArcJoinedText(
        expected?.relationship_shift,
        expected?.relationshipShift,
        expected?.relationship_change,
        expected?.relationshipChange,
        expected?.next,
        payload?.relationship_shift,
        payload?.relationshipShift,
        state?.relationship_shift,
      )
      return {
        entity_id: Number(entity?.id || entity?.entity_id || 0) || null,
        entity_type: entityType,
        type_label: characterArcTypeLabel(entityType),
        name: compactBriefText(entity?.name || entity?.title, entityType === 'relationship_arc' ? '未命名关系线' : '未命名角色线'),
        summary: compactBriefText(entity?.summary || payload?.summary),
        usage_type: compactBriefText(usage?.usage_type || (due ? 'advance' : 'required')),
        related_characters: relatedCharacters,
        current_state: characterArcText(state?.current_state, entity?.status),
        desire: characterArcText(payload?.desire, payload?.character_desire, state?.desire, expected?.desire),
        flaw_pressure: characterArcText(payload?.flaw_pressure, payload?.flawPressure, payload?.inner_conflict, state?.flaw_pressure, expected?.flaw_pressure),
        growth_beat: growthBeat,
        relationship_shift: relationshipShift,
        voice_anchor: characterArcText(payload?.voice_anchor, payload?.voiceAnchor, state?.voice_anchor),
        forbidden_reveal: characterArcText(constraints?.forbidden_reveal, constraints?.taboo, payload?.forbidden_reveal),
        expected_state_change: expected,
        next_advance_chapter: nextAdvanceChapter || null,
      }
    })
    .filter(Boolean)
    .slice(0, 8)

  if (!arcs.length) return null
  const listFromArcs = (key: string) => Array.from(new Set(arcs.map((arc: any) => compactBriefText(arc?.[key])).filter(Boolean))).slice(0, 6)
  return {
    desire: listFromArcs('desire').join('；'),
    flaw_pressure: listFromArcs('flaw_pressure').join('；'),
    relationship_shift: listFromArcs('relationship_shift').join('；'),
    growth_beat: listFromArcs('growth_beat').join('；'),
    voice_anchor: listFromArcs('voice_anchor').join('；'),
    forbidden_reveal: listFromArcs('forbidden_reveal').join('；'),
    arcs,
  }
}

function storylineKeys(item: any) {
  return [
    Number(item?.entity_id || item?.id || 0) ? `id:${Number(item?.entity_id || item?.id || 0)}` : '',
    String(item?.name || item?.title || '').trim() ? `name:${String(item?.name || item?.title || '').trim()}` : '',
  ].filter(Boolean)
}

function storylineKeySet(items: any[]) {
  const keys = new Set<string>()
  for (const item of items) {
    for (const key of storylineKeys(item)) keys.add(key)
  }
  return keys
}

function storylineMatchesKeySet(item: any, keys: Set<string>) {
  return storylineKeys(item).some(key => keys.has(key))
}

function normalizeStorylinePlanItem(item: any, usageType = '') {
  const name = String(item?.name || item?.title || item || '').trim()
  if (!name && !Number(item?.entity_id || item?.id || 0)) return null
  return {
    entity_id: Number(item?.entity_id || item?.id || 0) || null,
    name,
    usage_type: String(item?.usage_type || usageType || 'advance'),
    expected_state_change: item?.expected_state_change || {},
  }
}

function normalizeStorylineActualItem(item: any) {
  const name = String(item?.name || item?.title || '').trim()
  const entityType = String(item?.entity_type || item?.type || '')
  if (!name && !Number(item?.entity_id || item?.id || 0)) return null
  if (!STORYLINE_TYPES.includes(entityType)) return null
  return {
    entity_id: Number(item?.entity_id || item?.id || 0) || null,
    name,
    entity_type: entityType,
    actual_state_change: item?.actual_state_change || item?.state_delta || {},
    summary: String(item?.summary || item?.description || ''),
  }
}

export function buildStorylineSyncReport(contextPackage: any, storylineUpdates: any[] = []) {
  const usagePlan = asArray(contextPackage?.storyline_context?.chapter_usage)
    .map((item: any) => normalizeStorylinePlanItem(item))
    .filter(Boolean)
  const briefPlan = [
    ...asArray(contextPackage?.chapter_target?.storyline_advances).map((name: any) => normalizeStorylinePlanItem({ name }, 'advance')),
    ...asArray(contextPackage?.chapter_target?.storyline_plants).map((name: any) => normalizeStorylinePlanItem({ name }, 'plant')),
    ...asArray(contextPackage?.chapter_target?.storyline_payoffs).map((name: any) => normalizeStorylinePlanItem({ name }, 'payoff')),
    ...asArray(contextPackage?.chapter_target?.storyline_forbidden).map((name: any) => normalizeStorylinePlanItem({ name }, 'forbidden')),
  ].filter(Boolean)
  const planned: any[] = []
  const plannedKeys = new Set<string>()
  for (const item of [...usagePlan, ...briefPlan]) {
    const keys = storylineKeys(item)
    if (!keys.length || keys.some(key => plannedKeys.has(key))) continue
    for (const key of keys) plannedKeys.add(key)
    planned.push(item)
  }
  const actual = asArray(storylineUpdates).map(normalizeStorylineActualItem).filter(Boolean)
  const actualKeys = storylineKeySet(actual)
  const requiredPlan = planned.filter(item => !['pause', 'forbidden'].includes(String(item.usage_type || '')))
  const forbiddenPlan = planned.filter(item => String(item.usage_type || '') === 'forbidden')
  const completed = requiredPlan.filter(item => storylineMatchesKeySet(item, actualKeys))
  const missed = requiredPlan.filter(item => !storylineMatchesKeySet(item, actualKeys))
  const unplanned = actual.filter(item => !storylineMatchesKeySet(item, plannedKeys))
  const forbidden_touched = forbiddenPlan.filter(item => storylineMatchesKeySet(item, actualKeys))
  const status = missed.length || unplanned.length || forbidden_touched.length ? 'warn' : 'ok'
  return { status, planned, actual, completed, missed, unplanned, forbidden_touched }
}

function normalizedMatchText(value: any) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s"'“”‘’`.,，。:：;；!?！？()[\]{}<>《》【】、|/\\_-]+/g, '')
}

function firstDefined(...values: any[]) {
  return values.find(value => value !== undefined && value !== null && String(value).trim() !== '') || ''
}

function anchorTerms(value: any) {
  const text = normalizedMatchText(value)
  const terms = new Set<string>()
  const latin = String(value || '').toLowerCase().match(/[a-z0-9]{2,}/g) || []
  latin.forEach(term => terms.add(term))
  const cjk = text.replace(/[^\u4e00-\u9fa5]/g, '')
  for (let i = 0; i < cjk.length - 1; i += 1) {
    const term = cjk.slice(i, i + 2)
    if (term.length === 2) terms.add(term)
  }
  return Array.from(terms).slice(0, 80)
}

function anchorMatchScore(expected: any, chapterText: string, options: { tailOnly?: boolean } = {}) {
  const expectedText = normalizedMatchText(expected)
  if (!expectedText) return { score: 55, matched: [] as string[], total: 0 }
  const rawText = options.tailOnly ? chapterText.slice(-1000) : chapterText
  const normalizedText = normalizedMatchText(rawText)
  if (normalizedText.includes(expectedText)) return { score: 100, matched: [compactText(expected, 40)], total: 1 }
  const terms = anchorTerms(expected)
  if (!terms.length) return { score: 55, matched: [] as string[], total: 0 }
  const matched = terms.filter(term => normalizedText.includes(term))
  const ratio = matched.length / Math.max(1, Math.min(terms.length, 24))
  return {
    score: Math.max(0, Math.min(100, Math.round(ratio * 115))),
    matched: matched.slice(0, 8),
    total: terms.length,
  }
}

function driftCheck(key: string, label: string, expected: any, chapterText: string, options: { tailOnly?: boolean } = {}) {
  const match = anchorMatchScore(expected, chapterText, options)
  const status = !normalizedMatchText(expected)
    ? 'warn'
    : match.score >= 60
      ? 'ok'
      : 'warn'
  return {
    key,
    label,
    status,
    score: match.score,
    expected: compactText(expected, 180),
    evidence: match.matched,
    risk: status === 'ok' ? '' : `${label}${normalizedMatchText(expected) ? '未充分落地' : '缺少守恒锚点'}`,
  }
}

function forbiddenDriftCheck(items: any[], chapterText: string) {
  const text = normalizedMatchText(chapterText)
  const touched = items
    .map(item => compactText(item, 120))
    .filter(Boolean)
    .filter(item => text.includes(normalizedMatchText(item)))
  const score = Math.max(0, 100 - touched.length * 35)
  return {
    key: 'forbidden_content',
    label: '禁写/禁揭',
    status: touched.length > 0 ? 'warn' : 'ok',
    score,
    expected: items.map(item => compactText(item, 80)).filter(Boolean).join('；'),
    evidence: touched,
    risk: touched.length > 0 ? `触碰禁写内容：${touched.slice(0, 3).join('；')}` : '',
  }
}

export function buildChapterCoreDriftReport(project: any, chapter: any, contextPackage: any, chapterText: string, storylineSync: any = null) {
  const target = contextPackage?.chapter_target || {}
  const brief = chapter?.raw_payload?.pre_draft_brief || target?.pre_draft_brief || {}
  const bible = project?.reference_config?.writing_bible || {}
  const readerPromise = firstDefined(
    target.reader_promise,
    target.readerPromise,
    brief.reader_promise,
    bible.reader_promise,
    bible.promise,
    bible.core_selling_point,
    project?.summary,
    project?.synopsis,
  )
  const chapterGoal = firstDefined(target.chapter_goal, target.chapterGoal, target.goal, brief.chapter_goal, chapter?.chapter_goal, chapter?.summary)
  const coreConflict = firstDefined(target.core_conflict, target.coreConflict, target.conflict, brief.core_conflict, chapter?.conflict)
  const endingHook = firstDefined(target.ending_hook, target.endingHook, brief.ending_hook, chapter?.ending_hook)
  const forbiddenItems = [
    ...asArray(target.forbidden_content),
    ...asArray(target.forbiddenContent),
    ...asArray(target.forbidden_repeats),
    ...asArray(target.forbiddenRepeats),
    ...asArray(target.storyline_forbidden),
    ...asArray(brief.forbidden_content),
    ...asArray(brief.storyline_forbidden),
  ]
  const checks = [
    driftCheck('reader_promise', '读者承诺', readerPromise, chapterText),
    driftCheck('chapter_goal', '本章目标', chapterGoal, chapterText),
    driftCheck('core_conflict', '核心冲突', coreConflict, chapterText),
    driftCheck('ending_hook', '章末钩子', endingHook, chapterText, { tailOnly: true }),
    forbiddenDriftCheck(forbiddenItems, chapterText),
  ]
  const missedStorylines = asArray(storylineSync?.missed)
  const forbiddenTouched = asArray(storylineSync?.forbidden_touched)
  if (missedStorylines.length || forbiddenTouched.length) {
    checks.push({
      key: 'storyline_alignment',
      label: '剧情线守恒',
      status: 'warn',
      score: Math.max(0, 100 - missedStorylines.length * 18 - forbiddenTouched.length * 28),
      expected: '按开写任务书推进本章剧情线',
      evidence: [
        ...missedStorylines.map((item: any) => `漏推：${item.name || item.title || item.entity_id || '未命名剧情线'}`),
        ...forbiddenTouched.map((item: any) => `禁揭触碰：${item.name || item.title || item.entity_id || '未命名剧情线'}`),
      ].slice(0, 8),
      risk: [
        missedStorylines.length ? `剧情线漏推 ${missedStorylines.length}` : '',
        forbiddenTouched.length ? `禁揭风险 ${forbiddenTouched.length}` : '',
      ].filter(Boolean).join('；'),
    })
  }
  const driftRisks = checks.map(check => check.risk).filter(Boolean)
  const rawScore = checks.length
    ? checks.reduce((sum, check) => sum + Number(check.score || 0), 0) / checks.length
    : 75
  const score = Math.max(0, Math.min(100, Math.round(rawScore)))
  const status = driftRisks.length || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `chapter-core-drift-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? `核心守恒 ${score}` : `核心偏移 ${driftRisks.length}`,
    summary: status === 'ok'
      ? '本章目标、冲突、承诺和章末钩子与开写任务书基本一致。'
      : `本章存在 ${driftRisks.length} 项核心偏移风险。`,
    anchors: {
      reader_promise: compactText(readerPromise, 180),
      chapter_goal: compactText(chapterGoal, 180),
      core_conflict: compactText(coreConflict, 180),
      ending_hook: compactText(endingHook, 180),
    },
    checks,
    drift_risks: driftRisks,
    next_actions: status === 'ok'
      ? ['保持章节任务书、场景卡、剧情线同步和交稿质检循环。']
      : [
          '优先回看开写任务书，确认本章目标、核心冲突和章末钩子是否需要改稿。',
          '如果偏移来自模型自由发挥，生成编辑报告时要求只修语言和剧情落点，不改长期方向。',
        ],
  }
}

function normalizePayoffItem(value: any, source = 'planned') {
  const text = compactText(typeof value === 'string' ? value : value?.text || value?.name || value?.title || value?.summary || value?.description || '', 180)
  if (!text) return null
  return {
    text,
    source,
  }
}

function uniquePayoffItems(items: any[]) {
  const seen = new Set<string>()
  const rows: any[] = []
  for (const item of items) {
    const normalized = normalizePayoffItem(item, item?.source || 'planned')
    if (!normalized) continue
    const key = normalizedMatchText(normalized.text)
    if (!key || seen.has(key)) continue
    seen.add(key)
    rows.push(normalized)
  }
  return rows
}

const concretePayoffPattern = /回报|兑现|揭开|真相|反转|夺回|反压|打脸|破局|解决|危机|钩子|伏笔|悬念|奖励|收束|升级|救下|拿到|发现|确认|暴露/
const genericPayoffTerms = new Set(['读者', '看到', '本章', '危机', '钩子', '真相', '支线', '回报', '兑现', '反转', '伏笔', '悬念'])

function isConcreteStorylinePayoff(item: any) {
  const text = compactText(typeof item === 'string' ? item : item?.text || item?.name || item?.title || item?.summary || item?.description || '', 180)
  return concretePayoffPattern.test(text)
}

function salientPayoffTerms(value: any) {
  const terms = anchorTerms(value)
    .filter(term => term.length >= 2)
    .filter(term => !genericPayoffTerms.has(term))
  return new Set(terms)
}

function hasSharedPayoffAnchor(left: any, right: any) {
  const leftTerms = salientPayoffTerms(left)
  const rightTerms = salientPayoffTerms(right)
  for (const term of leftTerms) {
    if (rightTerms.has(term)) return true
  }
  return false
}

function isPayoffDelivered(item: any, match: any) {
  if (match.score >= 60) return true
  if (item?.source === 'scene_card' && match.score >= 40 && asArray(match.matched).length >= 2) return true
  return false
}

function countPayoffDebts(missed: any[], debts: any[]) {
  const nonSceneMisses = missed.filter(item => item.source !== 'scene_card')
  const countedSceneMisses = missed.filter(item => {
    if (item.source !== 'scene_card') return false
    return !nonSceneMisses.some(other => hasSharedPayoffAnchor(item.text, other.text))
  })
  return nonSceneMisses.length + countedSceneMisses.length + debts.length
}

export function buildReaderPayoffSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string, storyStatePayload: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const brief = contextPackage?.pre_draft_brief || chapter?.raw_payload?.pre_draft_brief || target?.pre_draft_brief || {}
  const sceneCards = [
    ...asArray(target.scene_cards),
    ...asArray(brief.scene_briefs),
  ]
  const planned = uniquePayoffItems([
    normalizePayoffItem(target.payoff || target.reader_reward || target.readerReward || brief.payoff, 'chapter_payoff'),
    ...sceneCards.map((card: any) => normalizePayoffItem(card?.reader_payoff || card?.payoff || card?.reader_reward, 'scene_card')),
    ...asArray(target.storyline_payoffs).filter(isConcreteStorylinePayoff).map((item: any) => normalizePayoffItem(item, 'storyline_payoff')),
    ...asArray(brief.storyline_payoffs).filter(isConcreteStorylinePayoff).map((item: any) => normalizePayoffItem(item, 'storyline_payoff')),
  ].filter(Boolean))
  const delivered: any[] = []
  const missed: any[] = []
  for (const item of planned) {
    const match = anchorMatchScore(item.text, chapterText)
    const row = { ...item, score: match.score, evidence: match.matched }
    if (isPayoffDelivered(item, match)) delivered.push(row)
    else missed.push(row)
  }
  const rawDebts = [
    ...asArray(storyStatePayload?.state_delta?.payoff_queue),
    ...asArray(storyStatePayload?.payoff_queue),
    ...asArray(storyStatePayload?.state_delta?.open_questions)
      .filter((item: any) => /回报|兑现|真相|伏笔|钩子|悬念|奖励|腰牌|身份/.test(String(item || ''))),
  ]
  const debts = uniquePayoffItems(rawDebts.map((item: any) => ({ ...(typeof item === 'object' ? item : { text: item }), source: 'payoff_queue' })))
  const debtCount = countPayoffDebts(missed, debts)
  const score = Math.max(0, Math.min(100, Math.round(
    planned.length
      ? (delivered.length / planned.length) * 82 + Math.max(0, 18 - debts.length * 6)
      : debts.length ? 68 - debts.length * 8 : 82,
  )))
  const status = debtCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `reader-payoff-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '回报 OK' : `回报欠账 ${debtCount}`,
    summary: status === 'ok'
      ? '本章承诺的读者回报已在正文中基本兑现。'
      : `本章存在 ${debtCount} 项读者回报欠账或待回收期待。`,
    debt_count: debtCount,
    planned,
    delivered,
    missed,
    debts,
    next_actions: status === 'ok'
      ? ['保持场景卡 reader_payoff、章末钩子和剧情线回收的闭环。']
      : [
          '下一次修订优先补足 missed 中的读者回报，避免只推进设定不兑现爽点。',
          '将 debts 中的待回收期待写入下一章任务书或剧情线调用建议。',
        ],
  }
}

function readerExpectationLedgerFromContext(project: any, chapter: any, contextPackage: any) {
  const target = contextPackage?.chapter_target || {}
  const brief = contextPackage?.pre_draft_brief || chapter?.raw_payload?.pre_draft_brief || target?.pre_draft_brief || {}
  const explicit = target.reader_expectation_ledger || brief.reader_expectation_ledger
  const debtContext = applyReaderExpectationDebtAging(
    normalizeReaderExpectationDebtContext(target.reader_expectation_debt_context || brief.reader_expectation_debt || contextPackage?.reader_expectation_debt_context),
    Number(target.chapter_no || brief.chapter_no || chapter?.chapter_no || 0),
  )
  if (explicit) {
    const carryOver = uniqueExpectationItems([
      ...asArray(explicit.carry_over).map((item: any, index: number) => normalizeExpectationItem(item, { key: `carry_over_${index + 1}`, label: '期待债务', type: 'carry_over' })),
      ...debtContext.must_carry,
    ].filter(Boolean))
    return {
      chapter_promise: compactBriefText(explicit.chapter_promise || target.reader_promise || brief.reader_promise),
      carry_over: carryOver,
      must_deliver: uniqueExpectationItems([
        ...carryOver,
        ...asArray(explicit.must_deliver).map((item: any, index: number) => normalizeExpectationItem(item, { key: `expectation_${index + 1}`, label: '读者期待', type: 'expectation' })),
      ].filter(Boolean)),
      keep_alive: uniqueExpectationItems([
        ...debtContext.keep_alive,
        ...asArray(explicit.keep_alive).map((item: any, index: number) => normalizeExpectationItem(item, { key: `keep_alive_${index + 1}`, label: '保留悬念', type: 'question' })),
      ].filter(Boolean)),
      must_not_break: asArray(explicit.must_not_break).map((item: any) => compactBriefText(item)).filter(Boolean),
    }
  }
  const sceneCards = [
    ...asArray(target.scene_cards),
    ...asArray(brief.scene_briefs),
  ]
  const sceneBriefs = sceneCards.map(sceneBriefFromCard)
  const retentionBrief = target.reader_retention_brief || brief.reader_retention_brief || buildReaderRetentionBrief(project, contextPackage, sceneBriefs)
  return buildReaderExpectationLedger(project, contextPackage, sceneBriefs, retentionBrief)
}

function expectationBeatMatch(item: any, chapterText: string) {
  const key = String(item?.key || '')
  const type = String(item?.type || '')
  const scope = key.includes('opening') || key.includes('handoff') || type.includes('handoff')
    ? 'opening'
    : key.includes('ending') || /章末|追读/.test(String(item?.label || '')) || type === 'hook'
      ? 'tail'
      : 'full'
  const scopedText = scope === 'opening'
    ? chapterText.slice(0, 900)
    : scope === 'tail'
      ? chapterText.slice(-1200)
      : chapterText
  const match = anchorMatchScore(item?.text, scopedText)
  const threshold = scope === 'tail' ? 48 : 44
  return {
    ...item,
    match_scope: scope,
    score: match.score,
    evidence: match.matched,
    delivered: match.score >= threshold,
  }
}

export function buildReaderExpectationSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const ledger = readerExpectationLedgerFromContext(project, chapter, contextPackage)
  const planned = asArray(ledger.must_deliver)
  const checked = planned.map(item => expectationBeatMatch(item, chapterText))
  const delivered = checked.filter(item => item.delivered)
  const missed = checked.filter(item => !item.delivered)
  const keepAlive = asArray(ledger.keep_alive)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    planned.length ? (delivered.length / planned.length) * 100 : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `reader-expectation-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '期待 OK' : `期待欠账 ${missedCount}`,
    summary: status === 'ok'
      ? '本章读者期待账本中的必兑现项已基本落地。'
      : `本章读者期待账本有 ${missedCount} 项未充分兑现。`,
    planned_count: planned.length,
    delivered_count: delivered.length,
    missed_count: missedCount,
    chapter_promise: ledger.chapter_promise || '',
    planned,
    delivered,
    missed,
    keep_alive: keepAlive,
    must_not_break: asArray(ledger.must_not_break),
    next_actions: status === 'ok'
      ? ['保持读者期待账本：承诺、兑现、保留悬念和章末追读要逐章闭环。']
      : [
          '下一次修订优先补足 missed 中的读者期待；不要只补设定说明，要写成可见行动、冲突结果或章末未解问题。',
          'keep_alive 中的长期悬念可以不回收，但下一章任务书必须继续承接，避免读者期待断线。',
        ],
  }
}

function chapterBenchmarkStrategyFromContext(project: any, contextPackage: any, chapter: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const brief = contextPackage?.pre_draft_brief || chapter?.raw_payload?.pre_draft_brief || target?.pre_draft_brief || {}
  return buildChapterBenchmarkStrategy(project, {
    ...(contextPackage || {}),
    chapter_target: {
      ...target,
      chapter_benchmark_strategy: target.chapter_benchmark_strategy || brief.chapter_benchmark_strategy,
    },
    pre_draft_brief: {
      ...brief,
      chapter_benchmark_strategy: brief.chapter_benchmark_strategy || target.chapter_benchmark_strategy,
    },
  })
}

function normalizeChapterBenchmarkBeat(key: string, label: string, value: any, sample: any, matchScope: 'opening' | 'tail' | 'full' = 'full') {
  const text = compactText(value, 180)
  if (!text) return null
  return {
    key,
    label,
    text,
    sample_key: sample?.sample_key || '',
    match_scope: matchScope,
  }
}

function uniqueChapterBenchmarkBeats(items: any[]) {
  const seen = new Set<string>()
  const rows: any[] = []
  for (const item of items.filter(Boolean)) {
    const key = `${item.key}:${normalizedMatchText(item.text)}`
    if (!key || seen.has(key)) continue
    seen.add(key)
    rows.push(item)
  }
  return rows
}

function chapterBenchmarkBeatMatch(beat: any, chapterText: string) {
  const scopedText = beat.match_scope === 'opening'
    ? chapterText.slice(0, 1000)
    : beat.match_scope === 'tail'
      ? chapterText.slice(-1400)
      : chapterText
  const match = anchorMatchScore(beat.text, scopedText, { tailOnly: beat.match_scope === 'tail' })
  const threshold = beat.match_scope === 'opening'
    ? 24
    : beat.match_scope === 'tail'
      ? 28
      : beat.key === 'scene_budget_pattern'
        ? 18
        : 26
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered: match.score >= threshold,
  }
}

export function buildChapterBenchmarkSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const strategy = chapterBenchmarkStrategyFromContext(project, contextPackage, chapter)
  const samples = asArray(strategy?.samples)
  const planned = uniqueChapterBenchmarkBeats(samples.flatMap((sample: any) => [
    normalizeChapterBenchmarkBeat('opening_hook', '开篇钩子', sample.opening_hook, sample, 'opening'),
    normalizeChapterBenchmarkBeat('conflict_pattern', '冲突推进', sample.conflict_pattern, sample),
    normalizeChapterBenchmarkBeat('payoff_pattern', '爽点兑现', sample.payoff_pattern, sample),
    normalizeChapterBenchmarkBeat('ending_hook_pattern', '章末追读', sample.ending_hook_pattern, sample, 'tail'),
    normalizeChapterBenchmarkBeat('scene_budget_pattern', '场景节拍', sample.scene_budget_pattern, sample),
    String(sample.dialogue_pattern || '').includes('对白必须推动冲突')
      ? null
      : normalizeChapterBenchmarkBeat('dialogue_pattern', '对白推进', sample.dialogue_pattern, sample),
    normalizeChapterBenchmarkBeat('visual_pattern', '场面可视化', sample.visual_pattern, sample),
  ]))
  const checked = planned.map(item => chapterBenchmarkBeatMatch(item, chapterText))
  const delivered = checked.filter(item => item.delivered)
  const missed = checked.filter(item => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    planned.length ? (delivered.length / planned.length) * 100 : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `chapter-benchmark-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: planned.length === 0 ? '基准未配置' : status === 'ok' ? '基准 OK' : `基准缺口 ${missedCount}`,
    summary: planned.length === 0
      ? '本章没有配置章节质量基准样例。'
      : status === 'ok'
        ? '正文已基本兑现质量基准样例中的开篇、冲突、爽点、节拍、场面和章末追读结构。'
        : `正文有 ${missedCount} 项质量基准结构未充分落地。`,
    missed_count: missedCount,
    planned,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持质量基准样例：只学习结构、节拍、爽点兑现和章末追读，不复制桥段。']
      : [
          '下一次修订优先补足质量基准样例 missed 项，把缺口写成可见冲突、行动结果、信息增量或章末问题。',
          '如果正文只复述设定或顺滑过场，按质量基准样例重排开篇钩子、冲突推进、爽点兑现和章末追读。',
        ],
  }
}

function styleSampleStrategyFromContext(project: any, contextPackage: any, chapter: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const brief = contextPackage?.pre_draft_brief || chapter?.raw_payload?.pre_draft_brief || target?.pre_draft_brief || {}
  return buildStyleSampleStrategy(project, {
    ...(contextPackage || {}),
    chapter_target: {
      ...target,
      style_sample_strategy: target.style_sample_strategy || brief.style_sample_strategy,
    },
    pre_draft_brief: {
      ...brief,
      style_sample_strategy: brief.style_sample_strategy || target.style_sample_strategy,
    },
  })
}

function styleSampleBeat(key: string, label: string, value: any, sample: any) {
  const text = compactText(value, 180)
  return text ? { key, label, text, sample_key: sample?.sample_key || '' } : null
}

function quotedDialogueRatio(chapterText: string) {
  const text = String(chapterText || '')
  if (!text.trim()) return 0
  const quoted = Array.from(text.matchAll(/[“"「『]([^”"」』]{1,300})[”"」』]/g))
    .reduce((sum, match) => sum + String(match[1] || '').length, 0)
  const proseChars = Math.max(1, countProseChars(text))
  return quoted / proseChars
}

function dialogueRatioTarget(text: string) {
  const match = String(text || '').match(/(\d{1,2})\s*%\s*[-~至到]\s*(\d{1,2})\s*%/)
  if (!match) return null
  const low = Number(match[1]) / 100
  const high = Number(match[2]) / 100
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null
  return { low: Math.min(low, high), high: Math.max(low, high) }
}

function styleSampleBeatMatch(beat: any, chapterText: string) {
  if (beat.key === 'sentence_pattern') {
    const sentenceCount = Math.max(1, (String(chapterText || '').match(/[。！？!?]/g) || []).length)
    const avgSentenceChars = countProseChars(chapterText) / sentenceCount
    const wantsShortMiddle = /短中句|短句|解释压短|短中/.test(String(beat.text || ''))
    const delivered = wantsShortMiddle ? avgSentenceChars <= 45 : avgSentenceChars <= 70
    return {
      ...beat,
      score: delivered ? 86 : Math.max(30, Math.round(86 - Math.max(0, avgSentenceChars - 45))),
      evidence: `平均句长 ${Math.round(avgSentenceChars)} 字`,
      delivered,
    }
  }

  if (beat.key === 'dialogue_ratio') {
    const ratio = quotedDialogueRatio(chapterText)
    const target = dialogueRatioTarget(beat.text)
    const delivered = target
      ? ratio >= Math.max(0, target.low - 0.12) && ratio <= Math.min(1, target.high + 0.18)
      : ratio >= 0.12
    return {
      ...beat,
      score: delivered ? 84 : Math.round(Math.max(20, Math.min(72, ratio * 220))),
      evidence: `对白占比约 ${Math.round(ratio * 100)}%`,
      delivered,
    }
  }

  const match = anchorMatchScore(beat.text, chapterText)
  const threshold = beat.key === 'voice_rules' || beat.key === 'scene_function' ? 12 : 22
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered: match.score >= threshold,
  }
}

export function buildStyleSampleSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const strategy = styleSampleStrategyFromContext(project, contextPackage, chapter)
  const samples = asArray(strategy?.samples)
  const planned = uniqueChapterBenchmarkBeats(samples.flatMap((sample: any) => [
    styleSampleBeat('scene_function', '场景功能', sample.scene_function, sample),
    styleSampleBeat('narrative_rhythm', '叙述节奏', sample.narrative_rhythm, sample),
    styleSampleBeat('sentence_pattern', '句式密度', sample.sentence_pattern, sample),
    styleSampleBeat('dialogue_ratio', '对白比例', sample.dialogue_ratio, sample),
    ...asArray(sample.voice_rules).map((rule: any) => styleSampleBeat('voice_rules', '角色口吻', rule, sample)),
  ]))
  const checked = planned.map(item => styleSampleBeatMatch(item, chapterText))
  const delivered = checked.filter(item => item.delivered)
  const missed = checked.filter(item => !item.delivered)
  const copiedPhrases = Array.from(new Set([
    ...asArray(strategy?.do_not_copy),
    ...samples.flatMap((sample: any) => asArray(sample.unsafe_direct_phrases)),
  ].map((item: any) => String(item || '').trim()).filter(item => item.length >= 6 && String(chapterText || '').includes(item))))
  const missedCount = missed.length
  const copyRiskCount = copiedPhrases.length
  const score = Math.max(0, Math.min(100, Math.round(
    planned.length ? (delivered.length / planned.length) * 100 - copyRiskCount * 12 : 82,
  )))
  const status = missedCount > 0 || copyRiskCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `style-sample-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: planned.length === 0 ? '风格未配置' : status === 'ok' ? '风格 OK' : `风格缺口 ${missedCount + copyRiskCount}`,
    summary: planned.length === 0
      ? '本章没有配置风格样章策略。'
      : status === 'ok'
        ? '正文已基本执行风格样章中的节奏、句式、对白和角色口吻策略，且没有照搬原句。'
        : `正文有 ${missedCount} 项风格策略未充分落地，照搬风险 ${copyRiskCount} 项。`,
    missed_count: missedCount,
    copy_risk_count: copyRiskCount,
    planned,
    delivered,
    missed,
    copied_phrases: copiedPhrases,
    next_actions: status === 'ok'
      ? ['保持风格样章约束：学习节奏、句式密度、对白比例和情绪转折，不复制桥段和原句。']
      : [
          '下一次修订按风格样章补足 missed 项，把节奏、句式、对白比例和角色口吻改成正文可感知的表达。',
          '不得照搬样章原句；copied_phrases 中的表达必须替换成作者当前章节自己的说法。',
        ],
  }
}

function retentionBriefFromContext(contextPackage: any, chapter: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const brief = contextPackage?.pre_draft_brief || chapter?.raw_payload?.pre_draft_brief || target?.pre_draft_brief || {}
  return target.reader_retention_brief || brief.reader_retention_brief || {}
}

function normalizeRetentionBeat(key: string, label: string, value: any, matchScope: 'opening' | 'tail' | 'full' = 'full') {
  const text = compactText(value, 180)
  return text ? { key, label, text, match_scope: matchScope } : null
}

function retentionBeatMatch(beat: any, chapterText: string) {
  const scopedText = beat.match_scope === 'opening'
    ? chapterText.slice(0, 900)
    : beat.match_scope === 'tail'
      ? chapterText.slice(-1200)
      : chapterText
  const match = anchorMatchScore(beat.text, scopedText)
  const threshold = beat.match_scope === 'tail' ? 48 : 44
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered: match.score >= threshold,
  }
}

export function buildReaderRetentionSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const retentionBrief = retentionBriefFromContext(contextPackage, chapter)
  const planned = [
    normalizeRetentionBeat('opening_hook', '开篇钩子', retentionBrief.opening_hook, 'opening'),
    normalizeRetentionBeat('payoff_promise', '爽点承诺', retentionBrief.payoff_promise),
    normalizeRetentionBeat('information_gap', '信息缺口', retentionBrief.information_gap),
    normalizeRetentionBeat('emotional_reward', '情绪回报', retentionBrief.emotional_reward),
    normalizeRetentionBeat('short_drama_scene', '短剧场面', retentionBrief.short_drama_scene),
    normalizeRetentionBeat('ending_question', '章末追读', retentionBrief.ending_question, 'tail'),
  ].filter(Boolean)
  const checked = planned.map(item => retentionBeatMatch(item, chapterText))
  const delivered = checked.filter(item => item.delivered)
  const missed = checked.filter(item => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    planned.length ? (delivered.length / planned.length) * 100 : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `reader-retention-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '追读 OK' : `漏追读 ${missedCount}`,
    summary: status === 'ok'
      ? '追读雷达的开篇钩子、爽点承诺、信息缺口和章末追读已基本兑现。'
      : `追读雷达有 ${missedCount} 项未在正文中充分兑现。`,
    missed_count: missedCount,
    planned,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持开写任务书的追读雷达和写后复盘闭环。']
      : [
          '下一次修订优先补足追读雷达 missed 项，尤其是前 300 字钩子和最后一幕追读问题。',
          '如果正文只是解释设定或铺氛围，改为现场危机、可视化冲突和明确读者回报。',
        ],
  }
}

function normalizeAttractionDimension(key: string, label: string, expected: any, chapterText: string, options: { tailOnly?: boolean; openingOnly?: boolean; threshold?: number } = {}) {
  const expectedText = compactText(expected, 240)
  const scopeText = options.openingOnly ? chapterText.slice(0, 900) : chapterText
  const match = anchorMatchScore(expectedText, scopeText, { tailOnly: options.tailOnly })
  const threshold = Number(options.threshold || 50)
  const status = !expectedText || match.score >= threshold ? 'ok' : 'warn'
  return {
    key,
    label,
    status,
    score: expectedText ? match.score : 82,
    expected: expectedText,
    evidence: match.matched,
    issue: status === 'ok' ? '' : `${label}未充分兑现：${expectedText}`,
    repair_instruction: status === 'ok' ? '' : attractionRepairInstruction(key),
  }
}

function attractionRepairInstruction(key: string) {
  if (key === 'opening_hook') return '重写或补写前300字，先给异常、危险、欲望或反常信息。'
  if (key === 'scene_drive') return '补齐场景目标、阻碍、转折、回报，把说明改成现场行动链。'
  if (key === 'payoff_density') return '补出可见反制结果、信息增量、能力展示或情绪回报。'
  if (key === 'page_turn') return '重做最后300字，留下下一章非看不可的危险、选择、反转或未解答案。'
  if (key === 'spread_scene') return '补成可视化传播场面，让读者能复述画面、机制反差或公开反转。'
  return '把缺口写成可见冲突、行动结果、信息增量或章末问题。'
}

function sceneDriveExpectation(contextPackage: any) {
  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || contextPackage?.scene_cards)
  const card = sceneCards.find((item: any) => compactText(item?.goal || item?.purpose || item?.conflict || item?.turning_point || item?.reader_payoff, 80)) || {}
  return [
    card?.goal || card?.purpose,
    card?.conflict,
    card?.turning_point || card?.turn || card?.reversal,
    card?.reader_payoff,
  ].filter(Boolean).join('；')
}

function chapterAttractionPriority(dimensions: any[]) {
  const weak = dimensions.filter(item => item.status === 'warn')
  if (weak.some(item => item.key === 'page_turn')) return '优先修章末翻页'
  if (weak.some(item => item.key === 'opening_hook')) return '优先修开篇钩子'
  if (weak.some(item => item.key === 'payoff_density')) return '优先补爽点密度'
  if (weak.some(item => item.key === 'scene_drive')) return '优先修场景推进'
  if (weak.some(item => item.key === 'spread_scene')) return '优先补传播场面'
  return ''
}

function storyDriveSceneCards(contextPackage: any, chapter: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const brief = contextPackage?.pre_draft_brief || chapter?.raw_payload?.pre_draft_brief || target?.pre_draft_brief || {}
  return [
    ...asArray(target.scene_cards),
    ...asArray(contextPackage?.scene_cards),
    ...asArray(brief.scene_briefs),
    ...asArray(brief.scene_cards),
  ]
}

function firstCompactText(...values: any[]) {
  for (const value of values) {
    const text = compactText(value, 220)
    if (text) return text
  }
  return ''
}

function firstSceneCardText(sceneCards: any[], keys: string[]) {
  for (const card of sceneCards) {
    for (const key of keys) {
      const text = compactText(card?.[key], 220)
      if (text) return text
    }
  }
  return ''
}

function storyDriveRepairInstruction(key: string) {
  if (key === 'protagonist_choice') return '补出主角在压力下做出的主动选择，必须写成现场行动或对话交锋。'
  if (key === 'choice_cost') return '补出选择带来的即时代价、暴露风险、资源消耗或关系变化。'
  if (key === 'state_change') return '补出本章结束时主角处境、信息、关系或目标状态的明确变化。'
  if (key === 'obstacle') return '补出外部阻碍和冲突压力，让主角不是顺滑完成事件。'
  if (key === 'causal_next_step') return '补出下一步因果，把章末问题、危险或新目标接到下一章。'
  if (key === 'chapter_goal') return '补出本章目标的可见达成、失败或阶段性结果。'
  return '把缺口写成主角选择、冲突阻碍、代价反馈、状态变化和下一步因果。'
}

function normalizeStoryDriveDimension(key: string, label: string, expected: any, chapterText: string, threshold = 44) {
  const text = compactText(expected, 240)
  if (!text) return null
  const match = anchorMatchScore(text, chapterText)
  const delivered = match.score >= threshold
  return {
    key,
    label,
    text,
    expected: text,
    score: match.score,
    evidence: match.matched,
    delivered,
    status: delivered ? 'ok' : 'warn',
    issue: delivered ? '' : `${label}未充分兑现：${text}`,
    repair_instruction: delivered ? '' : storyDriveRepairInstruction(key),
  }
}

function storyDrivePriority(missed: any[]) {
  if (missed.some(item => item.key === 'protagonist_choice')) return '优先补主角选择'
  if (missed.some(item => item.key === 'choice_cost')) return '优先补选择代价'
  if (missed.some(item => item.key === 'state_change')) return '优先补状态变化'
  if (missed.some(item => item.key === 'obstacle')) return '优先补明确阻碍'
  if (missed.some(item => item.key === 'causal_next_step')) return '优先补下一步因果'
  if (missed.some(item => item.key === 'chapter_goal')) return '优先补本章目标'
  return ''
}

export function buildStoryDriveSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const target = contextPackage?.chapter_target || {}
  const brief = contextPackage?.pre_draft_brief || chapter?.raw_payload?.pre_draft_brief || target?.pre_draft_brief || {}
  const sceneCards = storyDriveSceneCards(contextPackage, chapter)
  const dimensions = [
    normalizeStoryDriveDimension(
      'chapter_goal',
      '本章目标',
      firstCompactText(
        target.chapter_goal,
        target.goal,
        target.objective,
        brief.chapter_goal,
        brief.chapter_objective,
        firstSceneCardText(sceneCards, ['goal', 'purpose', 'reader_payoff', 'payoff']),
      ),
      chapterText,
      42,
    ),
    normalizeStoryDriveDimension(
      'obstacle',
      '明确阻碍',
      firstCompactText(
        target.core_conflict,
        target.conflict,
        brief.core_conflict,
        brief.conflict,
        firstSceneCardText(sceneCards, ['conflict', 'obstacle', 'pressure']),
      ),
      chapterText,
      40,
    ),
    normalizeStoryDriveDimension(
      'protagonist_choice',
      '主角选择',
      firstCompactText(
        target.protagonist_choice,
        target.active_choice,
        target.main_character_choice,
        brief.protagonist_choice,
        firstSceneCardText(sceneCards, ['protagonist_choice', 'active_choice', 'turning_point', 'turn', 'reversal']),
      ),
      chapterText,
      42,
    ),
    normalizeStoryDriveDimension(
      'choice_cost',
      '选择代价',
      firstCompactText(
        target.choice_cost,
        target.cost,
        target.consequence,
        target.stakes,
        brief.choice_cost,
        brief.cost,
        firstSceneCardText(sceneCards, ['choice_cost', 'cost', 'consequence', 'stakes', 'risk']),
      ),
      chapterText,
      42,
    ),
    normalizeStoryDriveDimension(
      'state_change',
      '状态变化',
      firstCompactText(
        target.state_change,
        target.exit_state,
        target.chapter_state_change,
        brief.state_change,
        firstSceneCardText(sceneCards, ['exit_state', 'state_change', 'result', 'scene_result']),
      ),
      chapterText,
      42,
    ),
    normalizeStoryDriveDimension(
      'causal_next_step',
      '下一步因果',
      firstCompactText(
        target.causal_next_step,
        target.next_step,
        target.ending_hook,
        brief.causal_next_step,
        brief.ending_hook,
        firstSceneCardText(sceneCards, ['causal_next_step', 'next_step', 'ending_hook', 'exit_hook']),
      ),
      chapterText,
      42,
    ),
  ].filter(Boolean)

  const delivered = dimensions.filter((item: any) => item.delivered)
  const missed = dimensions.filter((item: any) => !item.delivered)
  const score = Math.max(0, Math.min(100, Math.round(
    dimensions.length ? dimensions.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / dimensions.length : 82,
  )))
  const status = missed.length > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = storyDrivePriority(missed)

  return {
    report_id: `story-drive-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: dimensions.length === 0 ? '故事力未配置' : status === 'ok' ? '故事力 OK' : `故事力缺口 ${missed.length}`,
    summary: dimensions.length === 0
      ? '本章没有明确的故事驱动力任务书，建议补充主角选择、阻碍、代价和状态变化。'
      : status === 'ok'
        ? '本章目标、阻碍、主角选择、选择代价、状态变化和下一步因果已形成可追踪行动链。'
        : `本章有 ${missed.length} 项故事驱动力缺口，${priorityRepair || '优先补主角主动选择和代价反馈'}。`,
    missed_count: missed.length,
    priority_repair: priorityRepair,
    dimensions,
    planned: dimensions,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持本章主角主动选择、外部阻碍、选择代价、状态变化和下一步因果的连续执行。']
      : [
          '下一次修订必须补出主角主动选择、明确阻碍、选择代价、局面变化和下一步因果。',
          '不能只用旁白解释剧情推进；缺口必须写成现场行动、对话交锋、代价反馈或状态变化。',
          '如果本章原本只是过场，至少让主角做一个不可逆的小选择，并让下一章承接其后果。',
        ],
  }
}

function characterArcBriefFromContext(contextPackage: any, chapter: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const brief = contextPackage?.pre_draft_brief || chapter?.raw_payload?.pre_draft_brief || target?.pre_draft_brief || {}
  return target.character_arc_brief
    || target.characterArcBrief
    || brief.character_arc_brief
    || brief.characterArcBrief
    || contextPackage?.character_arc_context
    || contextPackage?.characterArcContext
    || {}
}

function characterArcRepairInstruction(key: string) {
  if (key === 'growth_beat') return '补出角色在本章发生的可见成长节点，必须体现认知、选择、关系或行动方式变化。'
  if (key === 'desire') return '补出角色本章想要什么，让欲望推动行动，而不是只被事件推着走。'
  if (key === 'flaw_pressure') return '补出角色缺陷、恐惧或旧习惯被冲突压迫的瞬间。'
  if (key === 'relationship_shift') return '补出人物关系的可见变化，例如信任、敌意、亏欠、试探或结盟。'
  if (key === 'voice_anchor') return '补出角色稳定口吻和行动风格，避免所有人物说话像同一个旁白。'
  return '把人物弧光缺口写成角色欲望、缺陷受压、关系变化、成长节点或口吻锚点。'
}

function normalizeCharacterArcDimension(key: string, label: string, expected: any, chapterText: string, threshold = 42) {
  const text = compactText(expected, 240)
  if (!text) return null
  const match = anchorMatchScore(text, chapterText)
  const delivered = match.score >= threshold
  return {
    key,
    label,
    text,
    expected: text,
    score: match.score,
    evidence: match.matched,
    delivered,
    status: delivered ? 'ok' : 'warn',
    issue: delivered ? '' : `${label}未充分兑现：${text}`,
    repair_instruction: delivered ? '' : characterArcRepairInstruction(key),
  }
}

function characterArcPriority(missed: any[]) {
  if (missed.some(item => item.key === 'growth_beat')) return '优先补成长节点'
  if (missed.some(item => item.key === 'desire')) return '优先补角色欲望'
  if (missed.some(item => item.key === 'flaw_pressure')) return '优先补缺陷受压'
  if (missed.some(item => item.key === 'relationship_shift')) return '优先补关系变化'
  if (missed.some(item => item.key === 'voice_anchor')) return '优先补人物口吻'
  return ''
}

export function buildCharacterArcSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const arc = characterArcBriefFromContext(contextPackage, chapter)
  const sceneCards = storyDriveSceneCards(contextPackage, chapter)
  const dimensions = [
    normalizeCharacterArcDimension(
      'desire',
      '角色欲望',
      firstCompactText(
        arc.desire,
        arc.character_desire,
        arc.characterDesire,
        arc.goal,
        firstSceneCardText(sceneCards, ['character_goal', 'characterGoal', 'desire', 'goal']),
      ),
      chapterText,
      40,
    ),
    normalizeCharacterArcDimension(
      'flaw_pressure',
      '缺陷受压',
      firstCompactText(
        arc.flaw_pressure,
        arc.flawPressure,
        arc.inner_conflict,
        arc.innerConflict,
        arc.fear,
        firstSceneCardText(sceneCards, ['flaw_pressure', 'flawPressure', 'inner_conflict', 'fear', 'pressure']),
      ),
      chapterText,
      40,
    ),
    normalizeCharacterArcDimension(
      'relationship_shift',
      '关系变化',
      firstCompactText(
        arc.relationship_shift,
        arc.relationshipShift,
        arc.relationship_change,
        arc.relationshipChange,
        firstSceneCardText(sceneCards, ['relationship_shift', 'relationshipShift', 'relationship_change', 'relationshipChange']),
      ),
      chapterText,
      40,
    ),
    normalizeCharacterArcDimension(
      'growth_beat',
      '成长节点',
      firstCompactText(
        arc.growth_beat,
        arc.growthBeat,
        arc.character_growth,
        arc.characterGrowth,
        arc.arc_step,
        arc.arcStep,
        firstSceneCardText(sceneCards, ['growth_beat', 'growthBeat', 'character_growth', 'arc_step', 'exit_state']),
      ),
      chapterText,
      40,
    ),
    normalizeCharacterArcDimension(
      'voice_anchor',
      '口吻锚点',
      firstCompactText(
        arc.voice_anchor,
        arc.voiceAnchor,
        arc.voice_rule,
        arc.voiceRule,
        arc.dialogue_style,
        firstSceneCardText(sceneCards, ['voice_anchor', 'voiceAnchor', 'voice_rule', 'dialogue_style']),
      ),
      chapterText,
      36,
    ),
  ].filter(Boolean)

  const delivered = dimensions.filter((item: any) => item.delivered)
  const missed = dimensions.filter((item: any) => !item.delivered)
  const score = Math.max(0, Math.min(100, Math.round(
    dimensions.length ? dimensions.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / dimensions.length : 82,
  )))
  const status = missed.length > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = characterArcPriority(missed)

  return {
    report_id: `character-arc-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: dimensions.length === 0 ? '人物弧光未配置' : status === 'ok' ? '人物弧光 OK' : `人物弧光缺口 ${missed.length}`,
    summary: dimensions.length === 0
      ? '本章没有明确的人物弧光任务，建议在开写任务书中补角色欲望、缺陷受压、关系变化和成长节点。'
      : status === 'ok'
        ? '本章角色欲望、缺陷受压、关系变化、成长节点和口吻锚点已基本落地。'
        : `本章有 ${missed.length} 项人物弧光缺口，${priorityRepair || '优先补人物成长节点'}。`,
    missed_count: missed.length,
    priority_repair: priorityRepair,
    dimensions,
    planned: dimensions,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持角色欲望、缺陷受压、关系变化、成长节点和口吻锚点的连续执行。']
      : [
          '下一次修订必须补出人物成长：角色欲望、缺陷受压、关系变化、成长节点和口吻锚点至少落地主要缺口。',
          '不能只补心理旁白；新增内容必须写成角色行动、选择、对话反应、关系反馈或可见状态变化。',
          '人物成长不能改长期方向；只推进本章应承担的阶段性变化。',
        ],
  }
}

export function buildChapterAttractionReviewReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const target = contextPackage?.chapter_target || {}
  const retentionBrief = retentionBriefFromContext(contextPackage, chapter)
  const dimensions = [
    normalizeAttractionDimension('opening_hook', '开篇钩子', retentionBrief.opening_hook || target.opening_hook || target.summary, chapterText, { openingOnly: true, threshold: 44 }),
    normalizeAttractionDimension('scene_drive', '场景推进', sceneDriveExpectation(contextPackage) || target.conflict || target.core_conflict, chapterText, { threshold: 40 }),
    normalizeAttractionDimension('payoff_density', '爽点密度', retentionBrief.payoff_promise || target.reader_payoff || target.payoff, chapterText, { threshold: 42 }),
    normalizeAttractionDimension('page_turn', '章末翻页', retentionBrief.ending_question || target.ending_hook, chapterText, { tailOnly: true, threshold: 42 }),
    normalizeAttractionDimension('spread_scene', '传播场面', retentionBrief.short_drama_scene || target.signature_scene_brief?.signature_scene || target.ip_scene_hook, chapterText, { threshold: 42 }),
  ]
  const weak = dimensions.filter(item => item.status === 'warn')
  const score = Math.max(0, Math.min(100, Math.round(dimensions.reduce((sum, item) => sum + Number(item.score || 0), 0) / Math.max(1, dimensions.length))))
  const status = weak.length > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = chapterAttractionPriority(dimensions)
  return {
    report_id: `chapter-attraction-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '吸引力 OK' : `吸引力缺口 ${weak.length}`,
    summary: status === 'ok'
      ? '本章开篇钩子、场景推进、爽点密度、章末翻页和传播场面已形成连续读者拉力。'
      : `本章有 ${weak.length} 项吸引力执行缺口，${priorityRepair || '优先处理读者翻页动力'}。`,
    weak_count: weak.length,
    priority_repair: priorityRepair,
    dimensions,
    weak_dimensions: weak,
    next_actions: status === 'ok'
      ? ['保持当前章的读者拉力执行结构，并在下一章继续承接章末问题。']
      : [
          '前300字必须尽快给出异常、危险、欲望或反常信息。',
          '每个场景补齐目标、阻碍、转折、回报，避免纯解释或纯氛围过场。',
          '最后300字必须留下下一章非看不可的危险、选择、反转或未解答案。',
          '补出可视化传播场面和短周期爽点，让读者能复述本章最有记忆点的一幕。',
        ],
  }
}

function innovationBriefFromContext(contextPackage: any, chapter: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const brief = contextPackage?.pre_draft_brief || chapter?.raw_payload?.pre_draft_brief || target?.pre_draft_brief || {}
  return target.innovation_brief || brief.innovation_brief || {}
}

function normalizeInnovationBeat(key: string, label: string, value: any) {
  const text = compactText(value, 180)
  return text ? { key, label, text } : null
}

function innovationBeatMatch(beat: any, chapterText: string) {
  const match = anchorMatchScore(beat.text, chapterText)
  const key = String(beat.key || '')
  const threshold = key === 'chapter_angle'
    ? 22
    : key.startsWith('differentiation_guardrail')
      ? 38
      : 44
  const delivered = match.score >= threshold || (key === 'chapter_angle' && match.score >= 20 && asArray(match.matched).length >= 2)
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered,
  }
}

export function buildInnovationSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const innovationBrief = innovationBriefFromContext(contextPackage, chapter)
  const planned = [
    normalizeInnovationBeat('chapter_angle', '创新角度', innovationBrief.chapter_angle),
    ...asArray(innovationBrief.execution_points).map((item: any, index: number) => normalizeInnovationBeat(`execution_point_${index + 1}`, '执行点', item)),
    ...asArray(innovationBrief.differentiation_guardrails).map((item: any, index: number) => normalizeInnovationBeat(`differentiation_guardrail_${index + 1}`, '差异护栏', item)),
    ...asArray(innovationBrief.ip_adaptation_hooks).map((item: any, index: number) => normalizeInnovationBeat(`ip_adaptation_hook_${index + 1}`, 'IP化场面', item)),
  ].filter(Boolean)
  const checked = planned.map(item => innovationBeatMatch(item, chapterText))
  const delivered = checked.filter(item => item.delivered)
  const missed = checked.filter(item => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    planned.length ? (delivered.length / planned.length) * 100 : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `innovation-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '创新 OK' : `创新缺口 ${missedCount}`,
    summary: status === 'ok'
      ? '本章创新角度、执行点、差异护栏和可视化场面已基本落地。'
      : `创新执行有 ${missedCount} 项未在正文中充分兑现。`,
    missed_count: missedCount,
    planned,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持开写任务书的创新执行和写后复盘闭环。']
      : [
          '下一次修订优先补足创新执行 missed 项，避免把本章写成普通套路章。',
          '把创新角度转成可见选择、机制反差、规则代价或 IP 化场面，不要只靠旁白解释卖点。',
      ],
  }
}

function signatureSceneBriefFromContext(contextPackage: any, chapter: any = {}) {
  return normalizeSignatureSceneBrief(
    contextPackage?.chapter_target?.signature_scene_brief
      || contextPackage?.signature_scene_brief
      || contextPackage?.pre_draft_brief?.signature_scene_brief
      || chapter?.raw_payload?.pre_draft_brief?.signature_scene_brief
      || chapter?.raw_payload?.signature_scene_brief,
  )
}

function normalizeSignatureSceneSyncBeat(key: string, label: string, text: any, threshold = 58) {
  const normalizedText = compactText(text, 180)
  return normalizedText ? { key, label, text: normalizedText, threshold } : null
}

function signatureSceneSyncBeatMatch(beat: any, chapterText: string) {
  const match = anchorMatchScore(beat.text, chapterText)
  const delivered = match.score >= Number(beat.threshold || 58)
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered,
  }
}

export function buildSignatureSceneSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const signatureSceneBrief = signatureSceneBriefFromContext(contextPackage, chapter)
  const planned = [
    normalizeSignatureSceneSyncBeat('signature_scene', '标志性场面', signatureSceneBrief?.signature_scene, 58),
    normalizeSignatureSceneSyncBeat('scene_repair_target', '补位目标', signatureSceneBrief?.scene_repair_target, 50),
    normalizeSignatureSceneSyncBeat('reader_payoff', '读者回报', signatureSceneBrief?.reader_payoff, 42),
    normalizeSignatureSceneSyncBeat('storyline_service', '剧情线服务', signatureSceneBrief?.storyline_service, 50),
  ].filter(Boolean)

  if (!planned.length) {
    return {
      report_id: `signature-scene-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
      chapter_id: chapter?.id || null,
      chapter_no: chapter?.chapter_no || null,
      score: null,
      status: 'ok',
      label: '强场面未计划',
      summary: '本章没有明确标志性强场面补位任务，不做兑现复盘。',
      planned_count: 0,
      missed_count: 0,
      planned: [],
      delivered: [],
      missed: [],
      next_actions: ['后续如近10章强场面覆盖不足，先在滚动规划和开写任务书中补标志性场面。'],
    }
  }

  const rawChecked = planned.map(item => signatureSceneSyncBeatMatch(item, chapterText))
  const signatureDelivered = rawChecked.some(item => item.key === 'signature_scene' && item.delivered)
  const checked = rawChecked.map(item => {
    if (item.key !== 'scene_repair_target' || item.delivered || !signatureDelivered) return item
    return {
      ...item,
      score: Math.max(Number(item.score || 0), 80),
      evidence: ['标志性场面已落地'],
      delivered: true,
    }
  })
  const delivered = checked.filter(item => item.delivered)
  const missed = checked.filter(item => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round((delivered.length / planned.length) * 100)))
  const signatureSceneMissed = missed.some(item => item.key === 'signature_scene')
  const status = signatureSceneMissed || missedCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `signature-scene-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '强场面 OK' : `强场面漏写 ${missedCount}`,
    summary: status === 'ok'
      ? '本章开写任务书里的标志性场面、补位目标、读者回报和剧情线服务已基本落地。'
      : `标志性强场面补位有 ${missedCount} 项未在正文中充分兑现。`,
    planned_count: planned.length,
    missed_count: missedCount,
    planned,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持强场面补位从滚动规划到正文交稿的兑现闭环。']
      : [
          '下一次修订优先补回开写任务书指定的标志性场面，把它写成可视化动作、空间冲突、规则代价或公开反转。',
          '不要只补气氛描写；必须让 scene_repair_target、reader_payoff 和 storyline_service 在正文事件中可见。',
      ],
  }
}

function storyUnitContextFromContext(contextPackage: any, chapter: any = {}) {
  return normalizeStoryUnitContext(
    contextPackage?.chapter_target?.story_unit_context
      || contextPackage?.story_unit_context
      || contextPackage?.pre_draft_brief?.story_unit_context
      || chapter?.raw_payload?.pre_draft_brief?.story_unit_context
      || chapter?.raw_payload?.story_unit_context,
    Number(chapter?.chapter_no || contextPackage?.chapter_target?.chapter_no || 0),
  )
}

function normalizeStoryUnitSyncBeat(key: string, label: string, text: any, source = 'story_unit', threshold = 58) {
  const normalizedText = compactText(text, 180)
  return normalizedText ? { key, label, text: normalizedText, source, threshold } : null
}

function storyUnitSyncBeatMatch(beat: any, chapterText: string) {
  const match = anchorMatchScore(beat.text, chapterText)
  const delivered = match.score >= Number(beat.threshold || 58)
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered,
  }
}

function storyUnitForbiddenTouched(beat: any, chapterText: string) {
  const match = anchorMatchScore(String(beat.text || '').replace(/^不得|禁止|不可/, ''), chapterText)
  const touched = match.score >= 42
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    touched,
  }
}

export function buildStoryUnitSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const storyUnit = storyUnitContextFromContext(contextPackage, chapter)
  if (!storyUnit) {
    return {
      report_id: `story-unit-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
      chapter_id: chapter?.id || null,
      chapter_no: chapter?.chapter_no || null,
      score: null,
      status: 'ok',
      label: '剧情单元未计划',
      summary: '本章没有明确剧情单元任务，不做单元职责复盘。',
      missed_count: 0,
      rushed_count: 0,
      forbidden_count: 0,
      story_unit: null,
      planned: [],
      delivered: [],
      missed: [],
      rushed_ahead: [],
      forbidden_touched: [],
      next_actions: [],
    }
  }

  const role = compactBriefText(storyUnit.current_chapter_role)
  const roleText = normalizedMatchText(role)
  const roleRequired = [
    /入口|开场|进场/.test(role)
      ? normalizeStoryUnitSyncBeat('entry_hook', '入口钩子', storyUnit.entry_hook || role, 'story_unit', 50)
      : null,
    /高潮|回报|兑现|打脸|结算/.test(role)
      ? normalizeStoryUnitSyncBeat('mini_climax_payoff', '小高潮/回报', storyUnit.mini_climax_payoff || role, 'story_unit', 58)
      : null,
    /出单元|出场|收束|转入|承接下一|下一段/.test(role)
      ? normalizeStoryUnitSyncBeat('exit_hook', '出单元钩子', storyUnit.exit_hook || role, 'story_unit', 58)
      : null,
    /压力|升级|推进|冲突/.test(role)
      ? normalizeStoryUnitSyncBeat('pressure_escalation', '压力升级', asArray(storyUnit.pressure_escalation)[0] || role, 'story_unit', 50)
      : null,
  ].filter(Boolean)
  const fallbackRequired = roleRequired.length
    ? []
    : [
        normalizeStoryUnitSyncBeat('current_chapter_role', '当前职责', role || storyUnit.unit_goal, 'story_unit', 46),
      ].filter(Boolean)
  const setupOptional = asArray(storyUnit.setup_and_storyline)
    .slice(0, 3)
    .map((item: any, index: number) => normalizeStoryUnitSyncBeat(`setup_and_storyline_${index + 1}`, '伏笔/剧情线', item, 'story_unit_setup', 48))
    .filter(Boolean)
  const required = [...roleRequired, ...fallbackRequired]
  const planned = [...required, ...setupOptional]
  const checkedRequired = required.map(item => storyUnitSyncBeatMatch(item, chapterText))
  const checkedOptional = setupOptional.map(item => storyUnitSyncBeatMatch(item, chapterText))
  const delivered = [...checkedRequired, ...checkedOptional].filter(item => item.delivered)
  const missed = checkedRequired.filter(item => !item.delivered)
  const rushCandidates = [
    !/高潮|回报|兑现|打脸|结算/.test(role)
      ? normalizeStoryUnitSyncBeat('mini_climax_payoff', '后段小高潮', storyUnit.mini_climax_payoff, 'story_unit_rush', 58)
      : null,
    !/出单元|收束|转入/.test(role)
      ? normalizeStoryUnitSyncBeat('exit_hook', '出单元钩子', storyUnit.exit_hook, 'story_unit_rush', 58)
      : null,
  ].filter(Boolean)
  const rushedAhead = rushCandidates
    .map(item => storyUnitSyncBeatMatch(item, chapterText))
    .filter(item => item.delivered)
  const forbiddenTouched = asArray(storyUnit.forbidden_advance)
    .slice(0, 6)
    .map((item: any, index: number) => normalizeStoryUnitSyncBeat(`forbidden_advance_${index + 1}`, '禁抢跑', item, 'story_unit_forbidden', 42))
    .filter(Boolean)
    .map(item => storyUnitForbiddenTouched(item, chapterText))
    .filter(item => item.touched)

  const missedCount = missed.length
  const rushedCount = rushedAhead.length
  const forbiddenCount = forbiddenTouched.length
  const status = missedCount || rushedCount || forbiddenCount ? 'warn' : 'ok'
  const score = Math.max(0, Math.min(100, Math.round(100 - missedCount * 24 - rushedCount * 22 - forbiddenCount * 28)))
  const riskParts = [
    missedCount ? `单元漏写 ${missedCount}` : '',
    rushedCount ? `单元抢跑 ${rushedCount}` : '',
    forbiddenCount ? `禁抢跑 ${forbiddenCount}` : '',
  ].filter(Boolean)

  return {
    report_id: `story-unit-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '剧情单元 OK' : riskParts.join(' · '),
    summary: status === 'ok'
      ? '本章已完成当前剧情单元职责，且未明显提前消费后段小高潮或出单元钩子。'
      : `本章剧情单元职责存在 ${missedCount + rushedCount + forbiddenCount} 项风险。`,
    missed_count: missedCount,
    rushed_count: rushedCount,
    forbidden_count: forbiddenCount,
    story_unit: {
      title: storyUnit.title,
      chapter_range_label: storyUnit.chapter_range_label,
      current_chapter_role: storyUnit.current_chapter_role,
      unit_goal: storyUnit.unit_goal,
    },
    role_key: roleText,
    planned,
    delivered,
    missed,
    rushed_ahead: rushedAhead,
    forbidden_touched: forbiddenTouched,
    next_actions: status === 'ok'
      ? ['保持剧情单元任务书、正文生成和交稿复盘闭环。']
      : [
          '下一次修订优先补足当前剧情单元职责 missed 项，尤其是入口钩子、压力升级或本章回报。',
          '把 rushed_ahead 和 forbidden_touched 中的后段内容改成暗示、误导或延迟兑现，不要在本章提前解决。',
      ],
  }
}

const volumeBeatPattern = /小高潮|中高潮|卷末|高潮|爆点|转折|反转|大回报|强冲突|阶段收束|收束|破局|打脸|揭底|真相|压轴/

function volumeBeatBriefFromContext(contextPackage: any, chapter: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const brief = contextPackage?.pre_draft_brief || chapter?.raw_payload?.pre_draft_brief || target?.pre_draft_brief || {}
  return {
    explicit: target.volume_beat_brief || brief.volume_beat_brief || {},
    nextBatch: target.next_batch_brief || brief.next_batch_brief || contextPackage?.next_batch_brief || {},
    sceneCards: [
      ...asArray(target.scene_cards),
      ...asArray(brief.scene_briefs),
    ],
  }
}

function normalizeVolumeBeat(key: string, label: string, value: any, source = 'volume_beat') {
  const text = compactText(value, 180)
  return text ? { key, label, text, source } : null
}

function uniqueVolumeBeats(items: any[]) {
  const seen = new Set<string>()
  const rows: any[] = []
  for (const item of items.filter(Boolean)) {
    const key = normalizedMatchText(item.text)
    if (!key || seen.has(key)) continue
    seen.add(key)
    rows.push(item)
  }
  return rows
}

function volumeBeatMatch(beat: any, chapterText: string) {
  const match = anchorMatchScore(beat.text, chapterText)
  const threshold = beat.key === 'current_chapter_role' ? 44 : 70
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered: match.score >= threshold,
  }
}

export function buildVolumeBeatSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const beatContext = volumeBeatBriefFromContext(contextPackage, chapter)
  const currentRole = firstDefined(
    beatContext.explicit.current_chapter_role,
    beatContext.explicit.chapter_role,
    beatContext.nextBatch.current_chapter_role,
    beatContext.nextBatch.currentChapterRole,
  )
  const explicitBeats = [
    normalizeVolumeBeat('volume_goal', '卷级目标', beatContext.explicit.volume_goal || beatContext.explicit.goal),
    normalizeVolumeBeat('climax_promise', '高潮承诺', beatContext.explicit.climax_promise || beatContext.explicit.climax),
    ...asArray(beatContext.explicit.required_beats).map((item: any, index: number) => normalizeVolumeBeat(`required_beat_${index + 1}`, '爆点动作', item)),
  ].filter(Boolean)
  const hasExplicitVolumeBeat = explicitBeats.length > 0 || volumeBeatPattern.test(currentRole)
  const sceneBeats = beatContext.sceneCards.flatMap((card: any, index: number) => {
    const candidates = [
      normalizeVolumeBeat(`turning_point_${index + 1}`, '转折点', card?.turning_point || card?.turn || card?.reversal, 'scene_card'),
      normalizeVolumeBeat(`reader_payoff_${index + 1}`, '读者回报', card?.reader_payoff || card?.payoff || card?.reader_reward, 'scene_card'),
      normalizeVolumeBeat(`ending_hook_${index + 1}`, '钩子推进', card?.ending_hook_seed || card?.ending_hook, 'scene_card'),
    ].filter(Boolean)
    return hasExplicitVolumeBeat ? candidates : candidates.filter(item => volumeBeatPattern.test(item.text))
  })
  const planned = uniqueVolumeBeats([
    volumeBeatPattern.test(currentRole) ? normalizeVolumeBeat('current_chapter_role', '本章爆点职责', currentRole) : null,
    ...explicitBeats,
    ...sceneBeats,
  ])
  const checked = planned.map(item => volumeBeatMatch(item, chapterText))
  const delivered = checked.filter(item => item.delivered)
  const missed = checked.filter(item => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    planned.length ? (delivered.length / planned.length) * 100 : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `volume-beat-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: planned.length === 0 ? '爆点未计划' : status === 'ok' ? '爆点 OK' : `爆点漏兑现 ${missedCount}`,
    summary: planned.length === 0
      ? '本章没有明确卷级高潮或爆点承诺。'
      : status === 'ok'
        ? '本章卷级爆点、转折和读者回报已基本兑现。'
        : `本章有 ${missedCount} 项卷级爆点或小高潮承诺未在正文中充分兑现。`,
    missed_count: missedCount,
    planned,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持卷级爆点预算、章节任务书和正文兑现闭环。']
      : [
          '下一次修订优先补足卷级爆点 missed 项，把小高潮/中高潮/卷末爆点写成可见行动、反转和回报。',
          '如果正文只铺信息没有兑现转折，优先补现场冲突、选择代价、反制结果和章末升级。',
        ],
  }
}

function runwayFromContext(contextPackage: any) {
  return contextPackage?.chapter_target?.million_word_runway || contextPackage?.million_word_runway || {}
}

function normalizeRunwayQuestion(item: any, index: number) {
  const text = compactText(item?.answer || item?.text || item?.summary || item?.value || '', 180)
  if (!text) return null
  return {
    key: String(item?.key || `question_${index + 1}`),
    label: compactText(item?.label || item?.title || `本章四问 ${index + 1}`, 60),
    text,
  }
}

function normalizeRunwayFuel(item: any, index: number) {
  const text = compactText(typeof item === 'string' ? item : item?.text || item?.name || item?.title || item?.summary || item?.description || '', 180)
  return text ? { key: `reader_fuel_${index + 1}`, text } : null
}

function runwayBeatMatch(beat: any, chapterText: string) {
  const match = anchorMatchScore(beat.text, chapterText)
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered: match.score >= 44,
  }
}

function runwayRedlineTouched(redLines: any[], chapterText: string) {
  const normalizedChapterText = normalizedMatchText(chapterText)
  return redLines
    .map((item: any) => ({ text: compactText(typeof item === 'string' ? item : item?.text || item?.name || item?.title || item?.summary || item?.description || '', 180) }))
    .filter((item: any) => item.text && normalizedChapterText.includes(normalizedMatchText(item.text)))
}

export function buildRunwaySyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const runway = runwayFromContext(contextPackage)
  const fourQuestions = [
    ...asArray(runway?.fourQuestions),
    ...asArray(runway?.four_questions),
  ]
    .map(normalizeRunwayQuestion)
    .filter(Boolean)
  const readerFuel = [
    ...asArray(runway?.readerFuel),
    ...asArray(runway?.reader_fuel),
  ]
    .map(normalizeRunwayFuel)
    .filter(Boolean)
  const redLines = [
    ...asArray(runway?.redLines),
    ...asArray(runway?.red_lines),
  ]

  const questionChecks = fourQuestions.map(item => runwayBeatMatch(item, chapterText))
  const fuelChecks = readerFuel.map(item => runwayBeatMatch(item, chapterText))
  const fourQuestionDelivered = questionChecks.filter(item => item.delivered)
  const fourQuestionMissed = questionChecks.filter(item => !item.delivered)
  const readerFuelDelivered = fuelChecks.filter(item => item.delivered)
  const readerFuelMissed = fuelChecks.filter(item => !item.delivered)
  const redlineTouched = runwayRedlineTouched(redLines, chapterText)
  const riskCount = fourQuestionMissed.length + readerFuelMissed.length + redlineTouched.length
  const plannedCount = fourQuestions.length + readerFuel.length
  const deliveredCount = fourQuestionDelivered.length + readerFuelDelivered.length
  const score = Math.max(0, Math.min(100, Math.round(
    plannedCount
      ? (deliveredCount / plannedCount) * 100 - redlineTouched.length * 22
      : redlineTouched.length ? 62 - redlineTouched.length * 12 : 82,
  )))
  const status = riskCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `runway-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '航线 OK' : `航线风险 ${riskCount}`,
    summary: status === 'ok'
      ? '本章已基本兑现百万字航线的本章四问、读者燃料和红线约束。'
      : `百万字航线存在 ${riskCount} 项兑现风险。`,
    risk_count: riskCount,
    four_questions: questionChecks,
    four_question_delivered: fourQuestionDelivered,
    four_question_missed: fourQuestionMissed,
    reader_fuel: fuelChecks,
    reader_fuel_delivered: readerFuelDelivered,
    reader_fuel_missed: readerFuelMissed,
    redline_touched: redlineTouched,
    next_actions: status === 'ok'
      ? ['保持百万字航线：本章四问、读者燃料、禁用红线要继续进入开写任务书和交稿复盘。']
      : [
          '下一次修订优先补足 four_question_missed 和 reader_fuel_missed，避免章节只完成事件但不服务长期追读。',
          '如果 redline_touched 有内容，必须改掉提前揭露、越级回收或破坏长期核心的段落。',
        ],
  }
}

export function normalizeDiscoveredAssets(assets: any[] = [], options: {
  existingCharacters?: any[]
  existingSettings?: any[]
  chapter?: any
} = {}) {
  const existingCharacterNames = new Set((options.existingCharacters || []).map(item => String(item?.name || '').trim()).filter(Boolean))
  const existingSettingKeys = new Set((options.existingSettings || []).map(item => `${item?.entity_type}:${String(item?.name || '').trim()}`).filter(Boolean))
  const seen = new Set<string>()
  const chapterNo = Number(options.chapter?.chapter_no || 0) || null
  const chapterId = Number(options.chapter?.id || 0) || null
  const normalized: any[] = []

  for (const asset of asArray(assets)) {
    const entityType = String(asset?.entity_type || asset?.type || '')
    const name = String(asset?.name || asset?.title || '').trim()
    if (!DISCOVERED_ASSET_TYPES.includes(entityType) || !name) continue
    if (entityType === 'character' && existingCharacterNames.has(name)) continue
    const key = `${entityType}:${name}`
    if (existingSettingKeys.has(key) || seen.has(key)) continue
    seen.add(key)
    const suggestedState = asset?.state_json || asset?.suggested_state || asset?.state || {}
    normalized.push({
      entity_type: entityType,
      name,
      summary: String(asset?.summary || asset?.description || asset?.role || asset?.effect || '').trim(),
      evidence: String(asset?.evidence || asset?.quote || asset?.source_text || '').trim(),
      source_excerpt: String(asset?.source_excerpt || asset?.quote || asset?.evidence || '').trim(),
      first_chapter_no: asset?.first_chapter_no ?? chapterNo,
      constraints_json: asset?.constraints_json || asset?.constraints || {},
      state_json: {
        ...(suggestedState && typeof suggestedState === 'object' && !Array.isArray(suggestedState) ? suggestedState : {}),
        ...(chapterNo ? { first_seen_chapter: chapterNo } : {}),
      },
      payload_json: {
        source: 'story_state_discovered_asset',
        source_chapter_id: chapterId,
        source_chapter_no: chapterNo,
        raw: asset,
      },
    })
  }
  return normalized
}

export function normalizeIpSceneCandidates(candidates: any[] = [], chapter: any = {}) {
  const normalized: any[] = []
  const seen = new Set<string>()
  const chapterNo = Number(chapter?.chapter_no || 0) || null
  const chapterId = Number(chapter?.id || 0) || null

  for (const candidate of asArray(candidates)) {
    const title = String(candidate?.title || candidate?.name || '').trim()
    const summary = String(candidate?.summary || candidate?.description || '').trim()
    if (!title || !summary) continue
    const key = title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    normalized.push({
      title,
      summary,
      visual_hook: String(candidate?.visual_hook || candidate?.visual || candidate?.image_hook || '').trim(),
      adaptation_value: String(candidate?.adaptation_value || candidate?.ip_value || candidate?.short_drama_value || '').trim(),
      spread_point: String(candidate?.spread_point || candidate?.comment_point || candidate?.discussion_point || '').trim(),
      evidence: String(candidate?.evidence || candidate?.quote || '').trim(),
      source_excerpt: String(candidate?.source_excerpt || candidate?.excerpt || candidate?.evidence || '').trim(),
      tags: asArray(candidate?.tags).map((item: any) => String(item || '').trim()).filter(Boolean).slice(0, 8),
      chapter_id: chapterId,
      chapter_no: chapterNo,
      payload_json: {
        source: 'story_state_ip_scene_intake',
        source_chapter_id: chapterId,
        source_chapter_no: chapterNo,
        raw: candidate,
      },
    })
  }

  return normalized
}

export function normalizeMemeBank(rawBank: any[] = []) {
  const normalized: any[] = []
  const seen = new Set<string>()
  for (const raw of asArray(rawBank)) {
    const memeKey = String(raw?.meme_key || raw?.key || raw?.name || raw?.title || '').trim()
    const functionText = String(raw?.function || raw?.usage_function || raw?.emotion_function || raw?.purpose || '').trim()
    const directPhrases = [
      ...asArray(raw?.unsafe_direct_phrases),
      ...asArray(raw?.direct_phrases),
      raw?.direct_phrase,
      raw?.phrase,
    ].map((item: any) => String(item || '').trim()).filter(Boolean)
    if (!memeKey || (!functionText && directPhrases.length === 0 && !String(raw?.abstract_usage || '').trim())) continue
    const key = memeKey.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const abstractUsage = String(raw?.abstract_usage || raw?.usage || '').trim()
    normalized.push({
      meme_key: memeKey,
      function: functionText || '情绪共鸣/传播点',
      tone: String(raw?.tone || raw?.voice || '轻度').trim(),
      suitable_genres: asArray(raw?.suitable_genres || raw?.genres).map((item: any) => String(item || '').trim()).filter(Boolean),
      unsafe_direct_phrases: Array.from(new Set(directPhrases)),
      abstract_usage: [
        abstractUsage || `${functionText || memeKey} 只转化为吐槽节奏、角色口吻或情绪功能。`,
        '不直接复刻原句。',
      ].join('').replace(/。+/g, '。'),
      expires_at: String(raw?.expires_at || raw?.expire_at || '').trim(),
      forbidden_scenes: asArray(raw?.forbidden_scenes || raw?.禁用场景).map((item: any) => String(item || '').trim()).filter(Boolean),
      risk_level: String(raw?.risk_level || raw?.过期风险 || 'medium').trim(),
    })
  }
  return normalized
}

export function normalizeStyleSampleBank(rawBank: any[] = []) {
  const normalized: any[] = []
  const seen = new Set<string>()
  for (const raw of asArray(rawBank)) {
    const sampleKey = String(raw?.sample_key || raw?.key || raw?.name || raw?.title || '').trim()
    if (!sampleKey) continue
    const key = sampleKey.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const sceneFunction = String(raw?.scene_function || raw?.function || raw?.usage_function || raw?.purpose || '').trim()
    const narrativeRhythm = String(raw?.narrative_rhythm || raw?.rhythm || raw?.pacing || '').trim()
    const sentencePattern = String(raw?.sentence_pattern || raw?.sentence_density || raw?.sentence_length || '').trim()
    const dialogueRatio = String(raw?.dialogue_ratio || raw?.dialogue_density || '').trim()
    const voiceRules = asArray(raw?.voice_rules || raw?.character_voice || raw?.voice)
      .map((item: any) => String(item || '').trim())
      .filter(Boolean)
    const applicableScenes = Array.from(new Set(asArray(
      raw?.applicable_scenes || raw?.applicableScenes || raw?.suitable_scenes || raw?.apply_to || raw?.适用场景,
    ).map((item: any) => String(item || '').trim()).filter(Boolean)))
    const avoidScenes = Array.from(new Set([
      ...asArray(raw?.avoid_scenes || raw?.avoidScenes || raw?.unsuitable_scenes || raw?.not_for || raw?.不适用场景),
      ...asArray(raw?.forbidden_scenes || raw?.禁用场景),
    ].map((item: any) => String(item || '').trim()).filter(Boolean)))
    const selectionReason = String(raw?.selection_reason || raw?.selectionReason || raw?.match_reason || raw?.命中理由 || '').trim()
    const abstractUsage = String(raw?.abstract_usage || raw?.usage || '').trim()
    const unsafeDirectPhrases = [
      ...asArray(raw?.unsafe_direct_phrases),
      ...asArray(raw?.forbidden_copy),
      ...asArray(raw?.direct_phrases),
      raw?.direct_phrase,
      raw?.forbidden_phrase,
    ].map((item: any) => String(item || '').trim()).filter(Boolean)
    const sourceChapterNo = Number(raw?.source_chapter_no ?? raw?.sourceChapterNo ?? 0) || null
    const sourceChapterId = Number(raw?.source_chapter_id ?? raw?.sourceChapterId ?? 0) || null
    const sourceQualityScore = Number(raw?.source_quality_score ?? raw?.sourceQualityScore ?? raw?.quality_score ?? 0)

    normalized.push({
      sample_key: sampleKey,
      scene_function: sceneFunction || '叙述节奏样本',
      narrative_rhythm: narrativeRhythm || '按本章场景压力调整节奏',
      sentence_pattern: sentencePattern || '短中句结合，解释压短',
      dialogue_ratio: dialogueRatio || '按冲突需要控制对白比例',
      voice_rules: voiceRules,
      abstract_usage: [
        abstractUsage || sceneFunction || narrativeRhythm || `${sampleKey} 的表达方法`,
        '；只学习节奏、句式密度、对白比例和情绪转折，不学习具体桥段、设定和原句。',
      ].join('').replace(/；+/g, '；'),
      unsafe_direct_phrases: Array.from(new Set(unsafeDirectPhrases)),
      applicable_scenes: applicableScenes,
      avoid_scenes: avoidScenes,
      ...(selectionReason ? { selection_reason: selectionReason } : {}),
      suitable_genres: asArray(raw?.suitable_genres || raw?.genres).map((item: any) => String(item || '').trim()).filter(Boolean),
      forbidden_scenes: asArray(raw?.forbidden_scenes || raw?.禁用场景).map((item: any) => String(item || '').trim()).filter(Boolean),
      ...(sourceChapterNo ? { source_chapter_no: sourceChapterNo } : {}),
      ...(sourceChapterId ? { source_chapter_id: sourceChapterId } : {}),
      ...(Number.isFinite(sourceQualityScore) && sourceQualityScore > 0 ? { source_quality_score: sourceQualityScore } : {}),
    })
  }
  return normalized
}

export function normalizeChapterBenchmarkSampleBank(rawBank: any[] = []) {
  const normalized: any[] = []
  const seen = new Set<string>()
  for (const raw of asArray(rawBank)) {
    const sampleKey = String(raw?.sample_key || raw?.key || raw?.name || raw?.title || '').trim()
    if (!sampleKey) continue
    const key = sampleKey.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const openingHook = String(raw?.opening_hook || raw?.openingHook || raw?.hook || '').trim()
    const conflictPattern = String(raw?.conflict_pattern || raw?.conflictPattern || raw?.conflict || '').trim()
    const payoffPattern = String(raw?.payoff_pattern || raw?.payoffPattern || raw?.payoff || '').trim()
    const endingHookPattern = String(raw?.ending_hook_pattern || raw?.endingHookPattern || raw?.ending_hook || '').trim()
    const sceneBudgetPattern = String(raw?.scene_budget_pattern || raw?.sceneBudgetPattern || raw?.scene_budget || raw?.structure || '').trim()
    const dialoguePattern = String(raw?.dialogue_pattern || raw?.dialoguePattern || raw?.dialogue || '').trim()
    const visualPattern = String(raw?.visual_pattern || raw?.visualPattern || raw?.visual_scene || '').trim()
    const abstractUsage = String(raw?.abstract_usage || raw?.usage || '').trim()
    const doNotCopy = [
      ...asArray(raw?.do_not_copy),
      ...asArray(raw?.forbidden_copy),
      ...asArray(raw?.unsafe_direct_phrases),
      raw?.source_excerpt,
      raw?.sample_text,
      raw?.direct_phrase,
    ].map((item: any) => String(item || '').trim()).filter(Boolean)

    normalized.push({
      sample_key: sampleKey,
      genre: String(raw?.genre || raw?.type || '').trim(),
      quality_axes: Array.from(new Set([
        ...asArray(raw?.quality_axes || raw?.axes),
        openingHook ? '开篇钩子' : '',
        conflictPattern ? '冲突推进' : '',
        payoffPattern ? '爽点兑现' : '',
        endingHookPattern ? '章末追读' : '',
        sceneBudgetPattern ? '场景节拍' : '',
        dialoguePattern ? '对白节奏' : '',
        visualPattern ? '场面可视化' : '',
      ].map((item: any) => String(item || '').trim()).filter(Boolean))),
      opening_hook: openingHook || '开篇 300 字内给出异常、危险、欲望或反常信息',
      conflict_pattern: conflictPattern || '每个场景都有目标、阻碍、转折和可见代价',
      payoff_pattern: payoffPattern || '把爽点写成行动结果、信息增量或情绪回报',
      ending_hook_pattern: endingHookPattern || '章末保留一个读者必须继续看的未解问题',
      scene_budget_pattern: sceneBudgetPattern || '按开局钩子、冲突升级、回报反转、章末钩子分配篇幅',
      dialogue_pattern: dialoguePattern || '对白必须推动冲突、试探信息或暴露关系变化',
      visual_pattern: visualPattern || '关键场面要有空间、动作、道具或规则反馈，便于短剧/漫剧转化',
      abstract_usage: [
        abstractUsage || '对照样例的章节结构、冲突节拍、爽点密度和章末追读设计。',
        '只学习章节结构、信息密度、冲突节拍、爽点兑现和章末钩子，不学习具体桥段、设定和原句。',
      ].join('').replace(/。+/g, '。'),
      do_not_copy: Array.from(new Set([
        ...doNotCopy,
        '不得复制样例桥段、角色名、专有设定和原句',
        '不得把样例剧情替换成本章剧情',
      ])),
    })
  }
  return normalized
}

function resolveMemeBank(project: any, contextPackage: any = {}) {
  return normalizeMemeBank([
    ...asArray(project?.reference_config?.meme_bank),
    ...asArray(project?.reference_config?.writing_bible?.meme_bank),
    ...asArray(contextPackage?.writing_bible?.meme_bank),
  ])
}

function resolveStyleSampleBank(project: any, contextPackage: any = {}) {
  return normalizeStyleSampleBank([
    ...asArray(project?.reference_config?.style_sample_bank),
    ...asArray(project?.reference_config?.writing_bible?.style_sample_bank),
    ...asArray(contextPackage?.writing_bible?.style_sample_bank),
  ])
}

function resolveChapterBenchmarkSampleBank(project: any, contextPackage: any = {}) {
  return normalizeChapterBenchmarkSampleBank([
    ...asArray(project?.reference_config?.chapter_benchmark_sample_bank),
    ...asArray(project?.reference_config?.writing_bible?.chapter_benchmark_sample_bank),
    ...asArray(contextPackage?.writing_bible?.chapter_benchmark_sample_bank),
  ])
}

function buildStyleSampleSelectionSignals(contextPackage: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards || target.scenes)
  const endingHook = String(target.ending_hook || target.endingHook || '').trim()
  const text = [
    target.title,
    target.summary,
    target.goal,
    target.chapter_goal,
    target.conflict,
    endingHook,
    ...sceneCards.flatMap((card: any) => [
      card?.title,
      card?.purpose,
      card?.summary,
      card?.conflict,
      card?.reader_payoff,
      card?.ending_hook_seed,
    ]),
  ].map(item => String(item || '')).join(' ')
  const signals = new Set<string>()
  if (/规则|危机|压迫|反打|反制|强敌|战斗|冲突|围堵|压制|破局/.test(text)) {
    signals.add('规则压迫')
    signals.add('高压反打')
    signals.add('危机压迫')
    signals.add('战斗反制')
  }
  if (/对白|交锋|试探|信息差|质问|谈判|阻止|争执|斗嘴/.test(text)) {
    signals.add('对白交锋')
    signals.add('信息差试探')
    signals.add('关系变化')
  }
  if (/线索|揭秘|真相|秘密|身份|伏笔|令牌|证据/.test(text)) {
    signals.add('线索揭秘')
    signals.add('伏笔回收')
    signals.add('新问题抛出')
  }
  if (/情感|告别|关系|和解|背叛|选择|代价/.test(text)) {
    signals.add('情感爆点')
    signals.add('重大情感告别')
  }
  if (/解释|背景|设定|铺垫|过场/.test(text)) {
    signals.add('纯背景说明')
    signals.add('低压日常过场')
  }
  if (endingHook) {
    signals.add('章末追读钩子')
    signals.add('新问题抛出')
  }
  return { text, signals }
}

function styleSampleEffectivenessRows(contextPackage: any = {}) {
  const report = contextPackage?.style_sample_effectiveness
    || contextPackage?.styleSampleEffectiveness
    || contextPackage?.chapter_target?.style_sample_effectiveness
    || contextPackage?.chapter_target?.styleSampleEffectiveness
    || {}
  return asArray(report?.samples || report?.items || report)
}

function styleSampleEffectivenessForSample(sample: any, contextPackage: any = {}) {
  const key = String(sample?.sample_key || '').trim()
  if (!key) return null
  return styleSampleEffectivenessRows(contextPackage)
    .find((item: any) => String(item?.sample_key || item?.sampleKey || '').trim() === key) || null
}

function styleSampleEffectivenessAdjustment(effectiveness: any) {
  if (!effectiveness) return 0
  const usage = Number(effectiveness.usage_count || effectiveness.usageCount || 0) || 0
  if (usage <= 0) return 0
  const hitRate = Number(effectiveness.hit_rate ?? effectiveness.hitRate ?? 0) || 0
  const missedCount = Number(effectiveness.missed_count || effectiveness.missedCount || 0) || 0
  const copyRiskCount = Number(effectiveness.copy_risk_count || effectiveness.copyRiskCount || 0) || 0
  const averageStyleScore = Number(effectiveness.average_style_score || effectiveness.averageStyleScore || 0) || 0
  const riskLabel = String(effectiveness.risk_label || effectiveness.riskLabel || '')
  let adjustment = 0
  if (hitRate >= 95) adjustment += 14
  else if (hitRate >= 85) adjustment += 10
  else if (hitRate >= 75) adjustment += 5
  else if (hitRate > 0 && hitRate < 60) adjustment -= 12
  if (riskLabel === '表现稳定') adjustment += 8
  if (riskLabel === '需复盘') adjustment -= 14
  adjustment -= Math.min(18, missedCount * 3)
  adjustment -= Math.min(24, copyRiskCount * 12)
  if (averageStyleScore >= 88) adjustment += 4
  if (averageStyleScore > 0 && averageStyleScore < 70) adjustment -= 4
  return adjustment
}

function styleSampleEffectivenessShouldAvoid(effectiveness: any) {
  if (!effectiveness) return false
  const usage = Number(effectiveness.usage_count || effectiveness.usageCount || 0) || 0
  if (usage < 2) return false
  const hitRate = Number(effectiveness.hit_rate ?? effectiveness.hitRate ?? 0) || 0
  const missedCount = Number(effectiveness.missed_count || effectiveness.missedCount || 0) || 0
  const copyRiskCount = Number(effectiveness.copy_risk_count || effectiveness.copyRiskCount || 0) || 0
  const riskLabel = String(effectiveness.risk_label || effectiveness.riskLabel || '')
  return copyRiskCount > 0 || missedCount >= 3 || riskLabel === '需复盘' || (hitRate > 0 && hitRate < 60)
}

function styleSampleEffectivenessReason(effectiveness: any) {
  if (!effectiveness) return ''
  const usage = Number(effectiveness.usage_count || effectiveness.usageCount || 0) || 0
  if (usage <= 0) return ''
  const hitRate = Number(effectiveness.hit_rate ?? effectiveness.hitRate ?? 0) || 0
  const missedCount = Number(effectiveness.missed_count || effectiveness.missedCount || 0) || 0
  const copyRiskCount = Number(effectiveness.copy_risk_count || effectiveness.copyRiskCount || 0) || 0
  const riskLabel = String(effectiveness.risk_label || effectiveness.riskLabel || '')
  return [
    hitRate > 0 ? `历史命中率${hitRate}%` : '',
    riskLabel,
    missedCount > 0 ? `历史缺口${missedCount}` : '',
    copyRiskCount > 0 ? `照搬风险${copyRiskCount}` : '',
  ].filter(Boolean).join('；')
}

function latestStyleSelectionReviewPayload(reviews: any[] = [], chapter: any, reviewType: string, payloadKey = '') {
  const chapterId = Number(chapter?.id || 0)
  const chapterNo = Number(chapter?.chapter_no || 0)
  const review = asArray(reviews)
    .filter((item: any) => item?.review_type === reviewType)
    .filter((item: any) => {
      const payload = parseJsonLikePayload(item?.payload) || {}
      return Number(item?.chapter_id || 0) === chapterId
        || Number(payload?.chapter_id || payload?.chapterId || 0) === chapterId
        || Number(payload?.chapter_no || payload?.chapterNo || 0) === chapterNo
    })
    .slice()
    .sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0]
  const payload = parseJsonLikePayload(review?.payload) || {}
  return payloadKey ? (payload[payloadKey] || payload?.result?.[payloadKey] || payload) : payload
}

function styleSelectionChapterQualityScore(chapter: any, reviews: any[] = []) {
  const payload = latestStyleSelectionReviewPayload(reviews, chapter, 'prose_quality')
  const score = Number(payload?.self_check?.review?.score ?? payload?.review?.score ?? payload?.score ?? 0)
  return Number.isFinite(score) ? score : 0
}

function styleSelectionChapterStrategy(chapter: any) {
  return chapter?.raw_payload?.pre_draft_brief?.style_sample_strategy
    || chapter?.raw_payload?.context_package?.pre_draft_brief?.style_sample_strategy
    || chapter?.raw_payload?.context_package?.chapter_target?.style_sample_strategy
    || {}
}

function styleSelectionItemSampleKey(item: any) {
  return String(item?.sample_key || item?.sampleKey || item?.key || '').trim()
}

function styleSelectionRoundAverage(values: number[]) {
  const valid = values.filter(value => Number.isFinite(value) && value > 0)
  if (!valid.length) return 0
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length)
}

export function buildStyleSampleEffectivenessForSelection(styleSampleBank: any[] = [], chapters: any[] = [], reviews: any[] = []) {
  const rows = new Map<string, any>()
  const ensureRow = (sample: any) => {
    const key = String(sample?.sample_key || '').trim()
    if (!key) return null
    if (!rows.has(key)) {
      rows.set(key, {
        sample_key: key,
        usage_count: 0,
        style_scores: [],
        quality_scores: [],
        planned_count: 0,
        delivered_count: 0,
        missed_count: 0,
        copy_risk_count: 0,
      })
    }
    return rows.get(key)
  }

  normalizeStyleSampleBank(styleSampleBank).forEach(ensureRow)

  for (const chapter of asArray(chapters)) {
    const strategy = styleSelectionChapterStrategy(chapter)
    const samples = normalizeStyleSampleBank(strategy?.samples || strategy?.style_sample_bank || [])
    if (!samples.length) continue
    const syncPayload = latestStyleSelectionReviewPayload(reviews, chapter, 'style_sample_sync', 'style_sample_sync')
    const sync = syncPayload?.style_sample_sync || syncPayload || {}
    const styleScore = Number(sync?.score || 0)
    const qualityScore = styleSelectionChapterQualityScore(chapter, reviews)
    const copyRiskItems = asArray(sync?.copied_phrases || sync?.copiedPhrases)
    const planned = asArray(sync?.planned)
    const delivered = asArray(sync?.delivered)
    const missed = asArray(sync?.missed)

    for (const sample of samples) {
      const row = ensureRow(sample)
      if (!row) continue
      const key = row.sample_key
      const plannedForSample = planned.filter((item: any) => styleSelectionItemSampleKey(item) === key).length
      const deliveredForSample = delivered.filter((item: any) => styleSelectionItemSampleKey(item) === key).length
      const missedForSample = missed.filter((item: any) => styleSelectionItemSampleKey(item) === key).length

      row.usage_count += 1
      if (styleScore > 0) row.style_scores.push(styleScore)
      if (qualityScore > 0) row.quality_scores.push(qualityScore)
      row.planned_count += plannedForSample
      row.delivered_count += deliveredForSample
      row.missed_count += missedForSample
      row.copy_risk_count += missedForSample > 0 ? copyRiskItems.length : 0
    }
  }

  const samples = Array.from(rows.values()).map(row => {
    const hitRate = row.planned_count > 0 ? Math.round((row.delivered_count / row.planned_count) * 100) : 0
    const riskLabel = row.usage_count === 0
      ? '待验证'
      : row.copy_risk_count > 0 || row.missed_count > 0 || (row.planned_count > 0 && hitRate < 80)
        ? '需复盘'
        : '表现稳定'
    return {
      sample_key: row.sample_key,
      usage_count: row.usage_count,
      hit_rate: hitRate,
      missed_count: row.missed_count,
      copy_risk_count: row.copy_risk_count,
      average_style_score: styleSelectionRoundAverage(row.style_scores),
      average_quality_score: styleSelectionRoundAverage(row.quality_scores),
      risk_label: riskLabel,
    }
  })

  return {
    total_samples: samples.length,
    used_sample_count: samples.filter((item: any) => item.usage_count > 0).length,
    risky_sample_count: samples.filter((item: any) => item.risk_label === '需复盘').length,
    samples,
  }
}

function styleSampleSceneScore(sample: any, contextPackage: any = {}, index = 0) {
  const { text, signals } = buildStyleSampleSelectionSignals(contextPackage)
  const effectiveness = styleSampleEffectivenessForSample(sample, contextPackage)
  const applicableScenes = asArray(sample?.applicable_scenes)
    .map((item: any) => String(item || '').trim())
    .filter(Boolean)
  const avoidScenes = asArray(sample?.avoid_scenes || sample?.forbidden_scenes)
    .map((item: any) => String(item || '').trim())
    .filter(Boolean)
  let score = 0
  const matchedApplicable: string[] = []
  const matchedSignals: string[] = []
  for (const scene of applicableScenes) {
    if (signals.has(scene) || (scene.length >= 2 && text.includes(scene))) {
      score += 12
      matchedApplicable.push(scene)
    }
  }
  for (const scene of avoidScenes) {
    if (signals.has(scene) || (scene.length >= 2 && text.includes(scene))) score -= 20
  }
  const sampleText = [
    sample?.sample_key,
    sample?.scene_function,
    sample?.narrative_rhythm,
    sample?.abstract_usage,
  ].map(item => String(item || '')).join(' ')
  if (/规则|危机|压迫|反打|反制|强敌|战斗|冲突|围堵|压制|破局/.test(text) && /规则|危机|压迫|反打|反制|战斗/.test(sampleText)) score += 10
  if (/对白|交锋|试探|信息差|质问|谈判|阻止|争执|斗嘴/.test(text) && /对白|交锋|试探|信息差|关系/.test(sampleText)) score += 6
  if (String(contextPackage?.chapter_target?.ending_hook || contextPackage?.chapter_target?.endingHook || '').trim() && /章末|追读|钩子|新问题|危险/.test(sampleText)) score += 4
  for (const signal of signals) {
    if (signal.length >= 2 && sampleText.includes(signal)) {
      score += 4
      matchedSignals.push(signal)
    }
  }
  score += styleSampleEffectivenessAdjustment(effectiveness)
  if (!applicableScenes.length) score += 1
  const hitScenes = Array.from(new Set([...matchedApplicable, ...matchedSignals])).slice(0, 3)
  const effectivenessReason = styleSampleEffectivenessReason(effectiveness)
  const reasonParts = [
    hitScenes.length > 0 ? `命中${hitScenes.join('、')}` : '',
    avoidScenes.length > 0 ? `避开${avoidScenes.slice(0, 3).join('、')}` : '',
    effectivenessReason,
  ].filter(Boolean)
  const selectionReason = reasonParts.length > 0 ? `${reasonParts.join('；')}。` : '保留为通用风格策略。'
  return { sample, score, index, selectionReason, effectiveness, avoidByEffectiveness: styleSampleEffectivenessShouldAvoid(effectiveness) }
}

function selectStyleSamplesForChapter(samples: any[] = [], contextPackage: any = {}, options: any = {}) {
  const excludeKeys = new Set(asArray(options?.exclude_keys || options?.excludeKeys)
    .map((item: any) => String(item || '').trim())
    .filter(Boolean))
  const ranked = samples
    .filter(sample => !excludeKeys.has(String(sample?.sample_key || '').trim()))
    .map((sample, index) => styleSampleSceneScore(sample, contextPackage, index))
    .sort((a, b) => b.score - a.score || a.index - b.index)
  const positive = ranked.filter(item => item.score > 0)
  const preferred = positive.filter(item => !item.avoidByEffectiveness)
  const fallback = ranked.filter(item => item.score >= 0)
  const selected = preferred.length ? preferred.slice(0, 3) : (positive.length ? positive.slice(0, 3) : fallback.slice(0, 3))
  return selected.map(item => ({
    ...item.sample,
    selection_reason: item.selectionReason,
  }))
}

function styleSampleStrategyCopyGuards(strategy: any = {}, samples: any[] = []) {
  return Array.from(new Set([
    ...asArray(strategy?.do_not_copy || strategy?.copy_guard || strategy?.forbidden_copy),
    ...samples.flatMap((sample: any) => asArray(sample?.unsafe_direct_phrases)),
    '只学习叙述节奏、句式密度、对白比例和情绪转折',
    '原句不能照搬',
    '不得复制样章桥段、专有设定、角色名和核心梗',
  ].map((item: any) => String(item || '').trim()).filter(Boolean)))
}

export function applyStyleSampleStrategyAuthorAction(project: any, contextPackage: any = {}, currentStrategy: any = {}, request: any = {}) {
  const action = String(request?.action || 'lock').trim() || 'lock'
  const now = String(request?.now || new Date().toISOString())
  const currentSamples = normalizeStyleSampleBank(currentStrategy?.samples || currentStrategy?.style_sample_bank || [])
  const currentKeys = currentSamples.map((sample: any) => String(sample?.sample_key || '').trim()).filter(Boolean)
  const currentRound = Number(currentStrategy?.selection_round || currentStrategy?.selectionRound || 0) || 0

  if (action === 'disable' || action === 'clear') {
    return {
      ...(currentStrategy || {}),
      enabled: false,
      samples: [],
      apply_to: [],
      do_not_copy: styleSampleStrategyCopyGuards(currentStrategy, []),
      locked: true,
      selection_mode: 'disabled_by_author',
      author_locked_at: now,
      selection_note: '作者确认本章不用风格样章，正文只执行任务书、场景卡和写作圣经。',
    }
  }

  if (action === 'lock') {
    return {
      ...(currentStrategy || {}),
      enabled: currentSamples.length > 0,
      samples: currentSamples,
      do_not_copy: styleSampleStrategyCopyGuards(currentStrategy, currentSamples),
      locked: true,
      selection_mode: 'author_locked',
      author_locked_at: now,
      selection_note: '作者已确认本章使用这组风格样章策略。',
    }
  }

  const requestedKeys = asArray(request?.sample_keys || request?.sampleKeys)
    .map((item: any) => String(item || '').trim())
    .filter(Boolean)
  const bank = resolveStyleSampleBank(project, contextPackage)
  const bankByKey = new Map(bank.map((sample: any) => [String(sample?.sample_key || '').trim(), sample]))
  const selected = requestedKeys.length > 0
    ? requestedKeys.map((key: string) => bankByKey.get(key)).filter(Boolean)
    : selectStyleSamplesForChapter(bank, contextPackage, { excludeKeys: currentKeys })
  const nextSamples = selected.length > 0 ? selected : currentSamples

  return {
    ...(currentStrategy || {}),
    enabled: nextSamples.length > 0,
    samples: nextSamples,
    apply_to: nextSamples.length > 0 ? ['开篇钩子', '高压冲突', '对白推进', '章末钩子'] : [],
    do_not_copy: styleSampleStrategyCopyGuards(currentStrategy, nextSamples),
    locked: false,
    selection_mode: 'author_replaced',
    selection_round: currentRound + 1,
    author_updated_at: now,
    selection_note: selected.length > 0
      ? '作者已替换本章风格样章策略，生成前需要重新确认任务书。'
      : '暂无可替换的风格样章，暂时保留当前策略。',
  }
}

function buildMemeStrategy(project: any, contextPackage: any = {}) {
  const explicit = contextPackage?.chapter_target?.meme_strategy || contextPackage?.pre_draft_brief?.meme_strategy || null
  if (explicit && typeof explicit === 'object') {
    return {
      intensity: String(explicit.intensity || '轻度'),
      allowed_functions: asArray(explicit.allowed_functions || explicit.functions).map((item: any) => String(item || '').trim()).filter(Boolean),
      forbidden_usage: asArray(explicit.forbidden_usage || explicit.forbidden).map((item: any) => String(item || '').trim()).filter(Boolean),
      meme_bank: normalizeMemeBank(explicit.meme_bank || []),
    }
  }
  const memeBank = resolveMemeBank(project, contextPackage)
  const genre = String(project?.genre || contextPackage?.project?.genre || '').trim()
  const allowedFromBank = memeBank
    .filter((item: any) => !item.suitable_genres.length || !genre || item.suitable_genres.includes(genre))
    .map((item: any) => item.function)
    .filter(Boolean)
  return {
    intensity: memeBank.length > 0 ? '轻度' : '无',
    allowed_functions: Array.from(new Set(allowedFromBank.length ? allowedFromBank : ['主角吐槽', '反差打脸', '评论区爽点', '社畜共鸣', '规则怪谈弹幕感'])).slice(0, 6),
    forbidden_usage: [
      '严肃死亡场景不玩梗',
      '关键情绪爆点不插科打诨',
      '不直接复刻热梗原句',
      '不让网感表达改变剧情线、设定状态和人物状态',
    ],
    meme_bank: memeBank.slice(0, 12),
  }
}

function buildStyleSampleStrategy(project: any, contextPackage: any = {}) {
  const explicit = contextPackage?.chapter_target?.style_sample_strategy || contextPackage?.pre_draft_brief?.style_sample_strategy || null
  if (explicit && typeof explicit === 'object') {
    const samples = normalizeStyleSampleBank(explicit.samples || explicit.style_sample_bank || [])
    return {
      enabled: Boolean(explicit.enabled ?? samples.length > 0),
      samples,
      apply_to: asArray(explicit.apply_to || explicit.applyTo).map((item: any) => String(item || '').trim()).filter(Boolean),
      do_not_copy: Array.from(new Set([
        ...asArray(explicit.do_not_copy || explicit.copy_guard || explicit.forbidden_copy),
        ...samples.flatMap((sample: any) => asArray(sample.unsafe_direct_phrases)),
        '只学习叙述节奏、句式密度、对白比例和情绪转折',
        '原句不能照搬',
      ].map((item: any) => String(item || '').trim()).filter(Boolean))),
    }
  }

  const samples = selectStyleSamplesForChapter(resolveStyleSampleBank(project, contextPackage), contextPackage)
  return {
    enabled: samples.length > 0,
    samples,
    apply_to: samples.length > 0 ? ['开篇钩子', '高压冲突', '对白推进', '章末钩子'] : [],
    do_not_copy: Array.from(new Set([
      ...samples.flatMap((sample: any) => asArray(sample.unsafe_direct_phrases)),
      '只学习叙述节奏、句式密度、对白比例和情绪转折',
      '原句不能照搬',
      '不得复制样章桥段、专有设定、角色名和核心梗',
    ].filter(Boolean))),
  }
}

function buildChapterBenchmarkStrategy(project: any, contextPackage: any = {}) {
  const explicit = contextPackage?.chapter_target?.chapter_benchmark_strategy || contextPackage?.pre_draft_brief?.chapter_benchmark_strategy || null
  if (explicit && typeof explicit === 'object') {
    const samples = normalizeChapterBenchmarkSampleBank(explicit.samples || explicit.chapter_benchmark_sample_bank || [])
    return {
      enabled: Boolean(explicit.enabled ?? samples.length > 0),
      samples,
      apply_to: asArray(explicit.apply_to || explicit.applyTo).map((item: any) => String(item || '').trim()).filter(Boolean),
      do_not_copy: Array.from(new Set([
        ...asArray(explicit.do_not_copy || explicit.copy_guard || explicit.forbidden_copy),
        ...samples.flatMap((sample: any) => asArray(sample.do_not_copy)),
        '只学习章节结构、信息密度、冲突节拍、爽点兑现和章末钩子',
        '不得复制样例桥段、角色名、专有设定和原句',
      ].map((item: any) => String(item || '').trim()).filter(Boolean))),
    }
  }

  const genre = String(project?.genre || contextPackage?.project?.genre || '').trim()
  const samples = resolveChapterBenchmarkSampleBank(project, contextPackage)
    .filter((sample: any) => !sample.genre || !genre || sample.genre === genre)
    .slice(0, 6)
  return {
    enabled: samples.length > 0,
    samples,
    apply_to: samples.length > 0 ? ['开篇300字', '场景目标/阻碍/转折/回报', '爽点兑现', '章末追读钩子'] : [],
    do_not_copy: Array.from(new Set([
      ...samples.flatMap((sample: any) => asArray(sample.do_not_copy)),
      '只学习章节结构、信息密度、冲突节拍、爽点兑现和章末钩子',
      '不得复制样例桥段、角色名、专有设定和原句',
      '不得把样例剧情替换成本章剧情',
    ].filter(Boolean))),
  }
}

export function buildMemePolishPrompt(project: any, contextPackage: any, chapterText: string) {
  return [
    '任务：克制型网感润色。只允许做语言层润色，不允许重写剧情。',
    `作品标题：${project.title || '未命名作品'}`,
    `目标章节：第${contextPackage?.chapter_target?.chapter_no || '?'}章《${contextPackage?.chapter_target?.title || '无标题'}》`,
    '',
    '硬性边界：',
    '1. 不得修改剧情线、设定状态、人物状态、章节事件、章节号和章末钩子方向。',
    '1A. 不得修改设定状态，不得修改人物状态，不得把语言润色变成剧情重写。',
    '2. 热梗只抽象为吐槽节奏、情绪共鸣、角色口吻、评论区传播点，不得直接复刻原句。',
    '3. 严肃死亡、恐怖压迫、关键情绪爆点和高压反转处默认降低网感，不插科打诨。',
    '4. 如果素材不适合本章，必须拒绝使用，并在 rejected_memes 说明。',
    '',
    '【本章网感策略】',
    JSON.stringify(contextPackage?.chapter_target?.meme_strategy || buildMemeStrategy(project, contextPackage), null, 2).slice(0, 5000),
    '',
    '【结构化上下文包】',
    JSON.stringify(contextPackage || {}, null, 2).slice(0, 7000),
    '',
    '【待润色正文】',
    chapterText.slice(0, 22000),
    '',
    '输出 JSON，包含 prose_chapters 数组。数组只能有一项，包含 chapter_no,title,chapter_text,scene_breakdown,continuity_notes；同时输出 meme_polish_report: {used_meme_functions(array), rejected_memes(array), immersion_risks(array), changed_plot(boolean)}。chapter_text 必须是润色后的完整正文。',
  ].filter(Boolean).join('\n')
}

export function buildReadabilityReviewPrompt(project: any, contextPackage: any, chapterText: string) {
  return [
    '任务：对最终章节做可读性/网感复检，只评估，不改稿。',
    `作品标题：${project.title || '未命名作品'}`,
    `目标章节：第${contextPackage?.chapter_target?.chapter_no || '?'}章《${contextPackage?.chapter_target?.title || '无标题'}》`,
    '',
    '请重点检查：',
    '1. 开篇 300 字是否有钩子，是否快速给出异常、危险、欲望或反常信息。',
    '2. 每个场景是否有场景目标、阻碍、转折、回报。',
    '3. 段落是否过长、说明是否过密、连续环境描写是否过多。',
    '4. 对话比例是否支撑冲突推进。',
    '5. 人物口吻差异是否明确，主角、智者、配角不能都像旁白。',
    '6. 爽点/信息增量密度是否足够，是否每 800-1200 字有推进或回报。',
    '7. 章末翻页是否有力：最后 300 字是否形成下一章非看不可的危险、选择、反转、未解答案或利益诱惑。',
    '8. 网感是否克制：只使用吐槽节奏、情绪共鸣、角色口吻和传播点，不直接堆梗。',
    '',
    '【结构化上下文包】',
    JSON.stringify(contextPackage || {}, null, 2).slice(0, 7000),
    '',
    '【最终正文】',
    chapterText.slice(0, 18000),
    '',
    '输出 JSON，字段 readability_score(0-100), passed(boolean), opening_hook_score, ending_hook_score, scene_readability_score, paragraph_density_score, dialogue_voice_score, payoff_density_score, meme_sense:{intensity,used_functions(array),rejected_memes(array),immersion_risks(array)}, issues(array), suggestions(array)。只返回 JSON。',
  ].join('\n')
}

export function buildChapterPreDraftBrief(project: any, contextPackage: any) {
  const chapterTarget = contextPackage?.chapter_target || {}
  const sceneCards = Array.isArray(chapterTarget.scene_cards) ? chapterTarget.scene_cards : []
  const sceneBriefs = sceneCards.map(sceneBriefFromCard)
  const readerPayoffs = sceneBriefs.map(item => item.reader_payoff).filter(Boolean)
  const emotionalCurve = [
    sceneCards[0]?.emotional_tone,
    sceneCards.length > 1 ? sceneCards[Math.floor(sceneCards.length / 2)]?.emotional_tone : '',
    sceneCards.length > 1 ? sceneCards[sceneCards.length - 1]?.emotional_tone : '',
  ].filter(Boolean).join(' -> ')
  const keySettings = [
    ...asArray(contextPackage?.setting_context?.required),
    ...asArray(contextPackage?.setting_context?.chapter_usage)
      .filter((item: any) => item.required && !item.forbidden)
      .map((item: any) => item.name),
  ].map((item: any) => String(item || '').trim()).filter(Boolean)
  const forbiddenContent = [
    ...asArray(contextPackage?.setting_context?.forbidden),
    ...asArray(chapterTarget.forbidden_repeats),
    ...asArray(contextPackage?.safety_policy?.forbidden),
  ].map((item: any) => String(item || '').trim()).filter(Boolean)
  const storylineContext = contextPackage?.storyline_context || {}
  const storylineAdvances = [
    ...asArray(storylineContext.required),
    ...storylineUsageByType(storylineContext, ['advance']),
  ].map((item: any) => String(item || '').trim()).filter(Boolean)
  const storylinePlants = storylineUsageByType(storylineContext, ['plant'])
  const storylinePayoffs = storylineUsageByType(storylineContext, ['payoff'])
  const storylineForbidden = [
    ...asArray(storylineContext.forbidden),
    ...storylineUsageByType(storylineContext, ['forbidden']),
  ].map((item: any) => String(item || '').trim()).filter(Boolean)
  const characterArcBrief = buildCharacterArcBriefFromContext(contextPackage)
  const wordTarget = chapterTarget.word_target || {}
  const memeStrategy = buildMemeStrategy(project, contextPackage)
  const styleSampleStrategy = buildStyleSampleStrategy(project, contextPackage)
  const chapterBenchmarkStrategy = buildChapterBenchmarkStrategy(project, contextPackage)
  const first30RetentionBrief = contextPackage?.chapter_target?.first30_retention_brief || contextPackage?.first30_retention_context || null
  const longformCompass = normalizeLongformCompass(contextPackage?.chapter_target?.longform_compass || contextPackage?.longform_compass)
  const longformBattleContext = normalizeLongformBattleContext(
    contextPackage?.chapter_target?.longform_battle_context
    || contextPackage?.chapter_target?.longform_battle_desk
    || contextPackage?.longform_battle_context
    || contextPackage?.longform_battle_desk
    || contextPackage?.longformBattleDesk,
  )
  const longformMemoryCapsule = normalizeLongformMemoryCapsule(
    contextPackage?.chapter_target?.longform_memory_capsule
    || contextPackage?.chapter_target?.longformMemoryCapsule
    || contextPackage?.longform_memory_capsule
    || contextPackage?.longformMemoryCapsule,
  )
  const nextBatchBrief = normalizeNextBatchBrief(contextPackage?.chapter_target?.next_batch_brief || contextPackage?.next_batch_brief, Number(chapterTarget.chapter_no || 0))
  const storyUnitContext = normalizeStoryUnitContext(contextPackage?.chapter_target?.story_unit_context || contextPackage?.story_unit_context, Number(chapterTarget.chapter_no || 0))
  const readerRetentionBrief = buildReaderRetentionBrief(project, contextPackage, sceneBriefs)
  const readerDropRiskBrief = normalizeReaderDropRiskBrief(
    contextPackage?.chapter_target?.reader_drop_risk_brief
    || contextPackage?.reader_drop_risk_brief
    || contextPackage?.reader_trial_context
    || contextPackage?.readerTrialContext,
    readerRetentionBrief,
    first30RetentionBrief,
  )
  const storyPressureBrief = normalizeStoryPressureBrief(
    contextPackage?.chapter_target?.story_pressure_brief
    || contextPackage?.chapter_target?.storyPressureBrief
    || contextPackage?.story_pressure_brief
    || contextPackage?.storyPressureBrief
    || contextPackage?.story_pressure_ladder
    || contextPackage?.storyPressureLadder,
  )
  const storyDriveBrief = normalizeStoryDriveBrief(
    contextPackage?.chapter_target?.story_drive_brief
    || contextPackage?.chapter_target?.storyDriveBrief
    || contextPackage,
    sceneCards,
  )
  const serialRhythmBrief = normalizeSerialRhythmBrief(
    contextPackage?.chapter_target?.serial_rhythm_brief
    || contextPackage?.chapter_target?.serialRhythmBrief
    || contextPackage?.serial_rhythm_brief
    || contextPackage?.serialRhythmBrief,
    sceneBriefs,
    readerRetentionBrief,
    wordTarget,
  )
  const pageTurnHookBrief = normalizePageTurnHookBrief(
    contextPackage?.chapter_target?.page_turn_hook_brief
    || contextPackage?.chapter_target?.pageTurnHookBrief
    || contextPackage?.page_turn_hook_brief
    || contextPackage?.pageTurnHookBrief,
    chapterTarget,
    sceneBriefs,
    readerRetentionBrief,
    storyDriveBrief,
  )
  const volumeClimaxBrief = normalizeVolumeClimaxBrief(
    contextPackage?.chapter_target?.volume_climax_brief
    || contextPackage?.chapter_target?.volumeClimaxBrief
    || contextPackage?.chapter_target?.volume_beat_brief
    || contextPackage?.chapter_target?.volumeBeatBrief
    || contextPackage?.volume_climax_brief
    || contextPackage?.volumeClimaxBrief
    || contextPackage?.volume_beat_brief
    || contextPackage?.volumeBeatBrief
    || contextPackage?.volume_beat_budget
    || contextPackage?.volumeBeatBudget,
    chapterTarget,
    contextPackage?.volume_beat_budget || contextPackage?.volumeBeatBudget,
  )
  const recentFatigueBrief = normalizeRecentFatigueBrief(
    contextPackage?.chapter_target?.recent_fatigue_brief
    || contextPackage?.chapter_target?.recentFatigueBrief
    || contextPackage?.chapter_target?.recent_fatigue_radar
    || contextPackage?.chapter_target?.recentFatigueRadar
    || contextPackage?.recent_fatigue_brief
    || contextPackage?.recentFatigueBrief
    || contextPackage?.recent_fatigue_radar
    || contextPackage?.recentFatigueRadar,
  )
  const deliveryRiskCarryOver = normalizeDeliveryRiskCarryOverContext(
    contextPackage?.chapter_target?.delivery_risk_carry_over
    || contextPackage?.chapter_target?.deliveryRiskCarryOver
    || contextPackage?.delivery_risk_carry_over
    || contextPackage?.deliveryRiskCarryOver,
  )
  const governanceRecheckMemory = normalizeGovernanceRecheckMemoryContext(
    contextPackage?.chapter_target?.governance_recheck_memory
    || contextPackage?.chapter_target?.governanceRecheckMemory
    || contextPackage?.governance_recheck_memory
    || contextPackage?.governanceRecheckMemory
    || contextPackage?.pre_draft_brief?.governance_recheck_memory
    || contextPackage?.preDraftBrief?.governanceRecheckMemory,
  )
  const readerExpectationDebtContext = applyReaderExpectationDebtAging(
    normalizeReaderExpectationDebtContext(chapterTarget.reader_expectation_debt_context || contextPackage?.reader_expectation_debt_context),
    Number(chapterTarget.chapter_no || 0),
  )
  const readerExpectationLedger = buildReaderExpectationLedger(project, {
    ...contextPackage,
    reader_expectation_debt_context: readerExpectationDebtContext,
    chapter_target: {
      ...(contextPackage?.chapter_target || {}),
      reader_expectation_debt_context: readerExpectationDebtContext,
    },
  }, sceneBriefs, readerRetentionBrief)
  const signatureSceneBrief = normalizeSignatureSceneBrief(chapterTarget.signature_scene_brief || chapterTarget.rollingPlan || chapterTarget.rolling_plan)
  const innovationBrief = buildChapterInnovationBrief(project, {
    ...contextPackage,
    chapter_target: {
      ...chapterTarget,
      signature_scene_brief: signatureSceneBrief,
    },
  }, sceneBriefs, longformCompass)
  const coreContractRadar = buildCoreContractRadar(project, contextPackage, sceneBriefs, longformCompass, longformBattleContext)
  const previousHandoff = buildPreviousChapterHandoff(contextPackage)

  return {
    chapter_no: Number(chapterTarget.chapter_no || 0) || null,
    title: compactBriefText(chapterTarget.title, '未命名章节'),
    previous_handoff: previousHandoff,
    chapter_goal: compactBriefText(chapterTarget.summary || chapterTarget.goal || chapterTarget.chapter_goal),
    reader_promise: compactBriefText(readerPayoffs.join('；') || contextPackage?.writing_bible?.promise || project?.synopsis),
    core_conflict: compactBriefText(chapterTarget.conflict || sceneCards.map((card: any) => card?.conflict).filter(Boolean).join('；')),
    emotional_curve: compactBriefText(emotionalCurve || contextPackage?.writing_bible?.style_lock?.emotional_curve || '压迫 -> 试探 -> 转折/回报'),
    key_settings: Array.from(new Set(keySettings)).slice(0, 12),
    forbidden_content: Array.from(new Set(forbiddenContent)).slice(0, 12),
    storyline_advances: Array.from(new Set(storylineAdvances)).slice(0, 12),
    storyline_plants: Array.from(new Set(storylinePlants)).slice(0, 12),
    storyline_payoffs: Array.from(new Set(storylinePayoffs)).slice(0, 12),
    storyline_forbidden: Array.from(new Set(storylineForbidden)).slice(0, 12),
    character_arc_brief: characterArcBrief,
    reader_retention_brief: readerRetentionBrief,
    reader_drop_risk_brief: readerDropRiskBrief,
    story_pressure_brief: storyPressureBrief,
    story_drive_brief: storyDriveBrief,
    serial_rhythm_brief: serialRhythmBrief,
    page_turn_hook_brief: pageTurnHookBrief,
    volume_climax_brief: volumeClimaxBrief,
    recent_fatigue_brief: recentFatigueBrief,
    delivery_risk_carry_over: deliveryRiskCarryOver,
    governance_recheck_memory: governanceRecheckMemory,
    reader_expectation_debt: readerExpectationDebtContext,
    reader_expectation_ledger: readerExpectationLedger,
    innovation_brief: innovationBrief,
    signature_scene_brief: signatureSceneBrief,
    meme_strategy: memeStrategy,
    style_sample_strategy: styleSampleStrategy,
    chapter_benchmark_strategy: chapterBenchmarkStrategy,
    first30_retention_brief: first30RetentionBrief,
    core_contract_radar: coreContractRadar,
    longform_compass: longformCompass,
    longform_battle_context: longformBattleContext,
    longform_memory_capsule: longformMemoryCapsule,
    next_batch_brief: nextBatchBrief,
    story_unit_context: storyUnitContext,
    scene_briefs: sceneBriefs,
    word_budget: wordTarget?.target
      ? `${wordTarget.label || '章节'} ${wordTarget.target} 字，可接受 ${wordTarget.min}-${wordTarget.max} 字`
      : compactBriefText(contextPackage?.style_lock?.chapter_word_range, '按写作圣经字数范围执行'),
    ending_hook: compactBriefText(chapterTarget.ending_hook || sceneBriefs.map(item => item.ending_hook_seed).filter(Boolean).slice(-1)[0]),
    generated_at: new Date().toISOString(),
  }
}

export function mergeConfirmedPreDraftBriefIntoContext(contextPackage: any, preDraftBrief: any) {
  if (!preDraftBrief?.confirmed_at) return contextPackage
  const longformCompass = normalizeLongformCompass(preDraftBrief.longform_compass || (contextPackage || {}).chapter_target?.longform_compass || (contextPackage || {}).longform_compass)
  const coreContractRadar = normalizeCoreContractRadar(
    preDraftBrief.core_contract_radar
    || (contextPackage || {}).chapter_target?.core_contract_radar
    || (contextPackage || {}).core_contract_radar,
  )
  const longformBattleContext = normalizeLongformBattleContext(
    preDraftBrief.longform_battle_context
    || (contextPackage || {}).chapter_target?.longform_battle_context
    || (contextPackage || {}).chapter_target?.longform_battle_desk
    || (contextPackage || {}).longform_battle_context
    || (contextPackage || {}).longform_battle_desk
    || (contextPackage || {}).longformBattleDesk,
  )
  const longformMemoryCapsule = normalizeLongformMemoryCapsule(
    preDraftBrief.longform_memory_capsule
    || preDraftBrief.longformMemoryCapsule
    || (contextPackage || {}).chapter_target?.longform_memory_capsule
    || (contextPackage || {}).chapter_target?.longformMemoryCapsule
    || (contextPackage || {}).longform_memory_capsule
    || (contextPackage || {}).longformMemoryCapsule,
  )
  const targetChapterNo = Number((contextPackage || {}).chapter_target?.chapter_no || preDraftBrief.chapter_no || 0)
  const nextBatchBrief = normalizeNextBatchBrief(preDraftBrief.next_batch_brief || (contextPackage || {}).chapter_target?.next_batch_brief || (contextPackage || {}).next_batch_brief, targetChapterNo)
  const storyUnitContext = normalizeStoryUnitContext(preDraftBrief.story_unit_context || (contextPackage || {}).chapter_target?.story_unit_context || (contextPackage || {}).story_unit_context, targetChapterNo)
  const readerDropRiskBrief = normalizeReaderDropRiskBrief(
    preDraftBrief.reader_drop_risk_brief
    || preDraftBrief.readerDropRiskBrief
    || (contextPackage || {}).chapter_target?.reader_drop_risk_brief
    || (contextPackage || {}).reader_drop_risk_brief
    || (contextPackage || {}).reader_trial_context
    || (contextPackage || {}).readerTrialContext,
    preDraftBrief.reader_retention_brief || (contextPackage || {}).chapter_target?.reader_retention_brief || null,
    preDraftBrief.first30_retention_brief || (contextPackage || {}).chapter_target?.first30_retention_brief || (contextPackage || {}).first30_retention_context || null,
  )
  const storyPressureBrief = normalizeStoryPressureBrief(
    preDraftBrief.story_pressure_brief
    || preDraftBrief.storyPressureBrief
    || (contextPackage || {}).chapter_target?.story_pressure_brief
    || (contextPackage || {}).chapter_target?.storyPressureBrief
    || (contextPackage || {}).story_pressure_brief
    || (contextPackage || {}).storyPressureBrief
    || (contextPackage || {}).story_pressure_ladder
    || (contextPackage || {}).storyPressureLadder,
  )
  const storyDriveBrief = normalizeStoryDriveBrief(
    preDraftBrief.story_drive_brief
    || preDraftBrief.storyDriveBrief
    || (contextPackage || {}).chapter_target?.story_drive_brief
    || (contextPackage || {}).chapter_target?.storyDriveBrief
    || (contextPackage || {}),
    asArray(preDraftBrief.scene_briefs).length
      ? asArray(preDraftBrief.scene_briefs)
      : asArray((contextPackage || {}).chapter_target?.scene_cards),
  )
  const sceneBriefs = asArray(preDraftBrief.scene_briefs).length
    ? asArray(preDraftBrief.scene_briefs)
    : asArray((contextPackage || {}).chapter_target?.scene_cards).map(sceneBriefFromCard)
  const serialRhythmBrief = normalizeSerialRhythmBrief(
    preDraftBrief.serial_rhythm_brief
    || preDraftBrief.serialRhythmBrief
    || (contextPackage || {}).chapter_target?.serial_rhythm_brief
    || (contextPackage || {}).chapter_target?.serialRhythmBrief
    || (contextPackage || {}).serial_rhythm_brief
    || (contextPackage || {}).serialRhythmBrief,
    sceneBriefs,
    preDraftBrief.reader_retention_brief || (contextPackage || {}).chapter_target?.reader_retention_brief || null,
    (contextPackage || {}).chapter_target?.word_target,
  )
  const pageTurnHookBrief = normalizePageTurnHookBrief(
    preDraftBrief.page_turn_hook_brief
    || preDraftBrief.pageTurnHookBrief
    || (contextPackage || {}).chapter_target?.page_turn_hook_brief
    || (contextPackage || {}).chapter_target?.pageTurnHookBrief
    || (contextPackage || {}).page_turn_hook_brief
    || (contextPackage || {}).pageTurnHookBrief,
    (contextPackage || {}).chapter_target || {},
    sceneBriefs,
    preDraftBrief.reader_retention_brief || (contextPackage || {}).chapter_target?.reader_retention_brief || null,
    storyDriveBrief,
  )
  const volumeClimaxBrief = normalizeVolumeClimaxBrief(
    preDraftBrief.volume_climax_brief
    || preDraftBrief.volumeClimaxBrief
    || preDraftBrief.volume_beat_brief
    || preDraftBrief.volumeBeatBrief
    || (contextPackage || {}).chapter_target?.volume_climax_brief
    || (contextPackage || {}).chapter_target?.volumeClimaxBrief
    || (contextPackage || {}).chapter_target?.volume_beat_brief
    || (contextPackage || {}).chapter_target?.volumeBeatBrief
    || (contextPackage || {}).volume_climax_brief
    || (contextPackage || {}).volumeClimaxBrief
    || (contextPackage || {}).volume_beat_brief
    || (contextPackage || {}).volumeBeatBrief
    || (contextPackage || {}).volume_beat_budget
    || (contextPackage || {}).volumeBeatBudget,
    (contextPackage || {}).chapter_target || {},
    (contextPackage || {}).volume_beat_budget || (contextPackage || {}).volumeBeatBudget,
  )
  const recentFatigueBrief = normalizeRecentFatigueBrief(
    preDraftBrief.recent_fatigue_brief
    || preDraftBrief.recentFatigueBrief
    || preDraftBrief.recent_fatigue_radar
    || preDraftBrief.recentFatigueRadar
    || (contextPackage || {}).chapter_target?.recent_fatigue_brief
    || (contextPackage || {}).chapter_target?.recentFatigueBrief
    || (contextPackage || {}).chapter_target?.recent_fatigue_radar
    || (contextPackage || {}).chapter_target?.recentFatigueRadar
    || (contextPackage || {}).recent_fatigue_brief
    || (contextPackage || {}).recentFatigueBrief
    || (contextPackage || {}).recent_fatigue_radar
    || (contextPackage || {}).recentFatigueRadar,
  )
  const deliveryRiskCarryOver = normalizeDeliveryRiskCarryOverContext(
    preDraftBrief.delivery_risk_carry_over
    || preDraftBrief.deliveryRiskCarryOver
    || (contextPackage || {}).chapter_target?.delivery_risk_carry_over
    || (contextPackage || {}).chapter_target?.deliveryRiskCarryOver
    || (contextPackage || {}).delivery_risk_carry_over
    || (contextPackage || {}).deliveryRiskCarryOver,
  )
  const governanceRecheckMemory = normalizeGovernanceRecheckMemoryContext(
    preDraftBrief.governance_recheck_memory
    || preDraftBrief.governanceRecheckMemory
    || (contextPackage || {}).chapter_target?.governance_recheck_memory
    || (contextPackage || {}).chapter_target?.governanceRecheckMemory
    || (contextPackage || {}).governance_recheck_memory
    || (contextPackage || {}).governanceRecheckMemory,
  )
  const readerExpectationDebtContext = applyReaderExpectationDebtAging(
    normalizeReaderExpectationDebtContext(preDraftBrief.reader_expectation_debt || (contextPackage || {}).chapter_target?.reader_expectation_debt_context || (contextPackage || {}).reader_expectation_debt_context),
    Number((contextPackage || {}).chapter_target?.chapter_no || preDraftBrief.chapter_no || 0),
  )
  const signatureSceneBrief = normalizeSignatureSceneBrief(preDraftBrief.signature_scene_brief || (contextPackage || {}).chapter_target?.signature_scene_brief || (contextPackage || {}).chapter_target?.rollingPlan || (contextPackage || {}).chapter_target?.rolling_plan)
  const characterArcBrief = preDraftBrief.character_arc_brief
    || preDraftBrief.characterArcBrief
    || (contextPackage || {}).chapter_target?.character_arc_brief
    || (contextPackage || {}).character_arc_context
    || null
  return {
    ...(contextPackage || {}),
    pre_draft_brief: preDraftBrief,
    core_contract_radar: coreContractRadar || (contextPackage || {}).core_contract_radar || null,
    longform_compass: longformCompass || (contextPackage || {}).longform_compass || null,
    longform_battle_context: longformBattleContext || (contextPackage || {}).longform_battle_context || null,
    longform_memory_capsule: longformMemoryCapsule || (contextPackage || {}).longform_memory_capsule || null,
    next_batch_brief: nextBatchBrief || (contextPackage || {}).next_batch_brief || null,
    story_unit_context: storyUnitContext || (contextPackage || {}).story_unit_context || null,
    reader_drop_risk_brief: readerDropRiskBrief || (contextPackage || {}).reader_drop_risk_brief || null,
    story_pressure_brief: storyPressureBrief || (contextPackage || {}).story_pressure_brief || null,
    story_drive_brief: storyDriveBrief || (contextPackage || {}).story_drive_brief || null,
    serial_rhythm_brief: serialRhythmBrief || (contextPackage || {}).serial_rhythm_brief || null,
    page_turn_hook_brief: pageTurnHookBrief || (contextPackage || {}).page_turn_hook_brief || null,
    volume_climax_brief: volumeClimaxBrief || (contextPackage || {}).volume_climax_brief || null,
    recent_fatigue_brief: recentFatigueBrief || (contextPackage || {}).recent_fatigue_brief || null,
    delivery_risk_carry_over: deliveryRiskCarryOver || (contextPackage || {}).delivery_risk_carry_over || null,
    governance_recheck_memory: governanceRecheckMemory || (contextPackage || {}).governance_recheck_memory || null,
    reader_expectation_debt_context: readerExpectationDebtContext,
    character_arc_context: characterArcBrief || (contextPackage || {}).character_arc_context || null,
    chapter_target: {
      ...((contextPackage || {}).chapter_target || {}),
      summary: compactBriefText(preDraftBrief.chapter_goal, (contextPackage || {}).chapter_target?.summary),
      goal: compactBriefText(preDraftBrief.chapter_goal, (contextPackage || {}).chapter_target?.goal),
      conflict: compactBriefText(preDraftBrief.core_conflict, (contextPackage || {}).chapter_target?.conflict),
      ending_hook: compactBriefText(preDraftBrief.ending_hook, (contextPackage || {}).chapter_target?.ending_hook),
      previous_handoff: compactBriefText(preDraftBrief.previous_handoff, (contextPackage || {}).chapter_target?.previous_handoff),
      reader_promise: compactBriefText(preDraftBrief.reader_promise),
      emotional_curve: compactBriefText(preDraftBrief.emotional_curve),
      key_settings: asArray(preDraftBrief.key_settings),
      forbidden_content: asArray(preDraftBrief.forbidden_content),
      storyline_advances: asArray(preDraftBrief.storyline_advances),
      storyline_plants: asArray(preDraftBrief.storyline_plants),
      storyline_payoffs: asArray(preDraftBrief.storyline_payoffs),
      storyline_forbidden: asArray(preDraftBrief.storyline_forbidden),
      character_arc_brief: characterArcBrief,
      reader_retention_brief: preDraftBrief.reader_retention_brief || (contextPackage || {}).chapter_target?.reader_retention_brief || null,
      reader_drop_risk_brief: readerDropRiskBrief || (contextPackage || {}).chapter_target?.reader_drop_risk_brief || null,
      story_pressure_brief: storyPressureBrief || (contextPackage || {}).chapter_target?.story_pressure_brief || null,
      story_drive_brief: storyDriveBrief || (contextPackage || {}).chapter_target?.story_drive_brief || null,
      serial_rhythm_brief: serialRhythmBrief || (contextPackage || {}).chapter_target?.serial_rhythm_brief || null,
      page_turn_hook_brief: pageTurnHookBrief || (contextPackage || {}).chapter_target?.page_turn_hook_brief || null,
      volume_climax_brief: volumeClimaxBrief || (contextPackage || {}).chapter_target?.volume_climax_brief || null,
      recent_fatigue_brief: recentFatigueBrief || (contextPackage || {}).chapter_target?.recent_fatigue_brief || null,
      delivery_risk_carry_over: deliveryRiskCarryOver || (contextPackage || {}).chapter_target?.delivery_risk_carry_over || null,
      governance_recheck_memory: governanceRecheckMemory || (contextPackage || {}).chapter_target?.governance_recheck_memory || null,
      reader_expectation_debt_context: readerExpectationDebtContext,
      reader_expectation_ledger: preDraftBrief.reader_expectation_ledger || (contextPackage || {}).chapter_target?.reader_expectation_ledger || null,
      innovation_brief: preDraftBrief.innovation_brief || (contextPackage || {}).chapter_target?.innovation_brief || null,
      signature_scene_brief: signatureSceneBrief,
      meme_strategy: preDraftBrief.meme_strategy || (contextPackage || {}).chapter_target?.meme_strategy || null,
      style_sample_strategy: preDraftBrief.style_sample_strategy || (contextPackage || {}).chapter_target?.style_sample_strategy || null,
      chapter_benchmark_strategy: preDraftBrief.chapter_benchmark_strategy || (contextPackage || {}).chapter_target?.chapter_benchmark_strategy || null,
      first30_retention_brief: preDraftBrief.first30_retention_brief || (contextPackage || {}).chapter_target?.first30_retention_brief || (contextPackage || {}).first30_retention_context || null,
      core_contract_radar: coreContractRadar || (contextPackage || {}).chapter_target?.core_contract_radar || null,
      longform_compass: longformCompass || (contextPackage || {}).chapter_target?.longform_compass || null,
      longform_battle_context: longformBattleContext || (contextPackage || {}).chapter_target?.longform_battle_context || null,
      longform_memory_capsule: longformMemoryCapsule || (contextPackage || {}).chapter_target?.longform_memory_capsule || null,
      next_batch_brief: nextBatchBrief || (contextPackage || {}).chapter_target?.next_batch_brief || null,
      story_unit_context: storyUnitContext || (contextPackage || {}).chapter_target?.story_unit_context || null,
      scene_cards: asArray(preDraftBrief.scene_briefs).length
        ? asArray(preDraftBrief.scene_briefs)
        : asArray((contextPackage || {}).chapter_target?.scene_cards),
    },
  }
}

export function normalizeSceneCardsPayload(payload: any, contextPackage: any = {}) {
  const directCards = Array.isArray(payload?.scene_cards) ? payload.scene_cards : Array.isArray(payload?.scenes) ? payload.scenes : []
  const targetNo = Number(contextPackage?.chapter_target?.chapter_no || 0)
  const outlineCards = directCards.length
    ? []
    : asArray(payload?.chapter_outlines)
      .filter((outline: any) => {
        const outlineNo = Number(outline?.chapter_no || outline?.chapter_number || outline?.no || 0)
        return targetNo ? outlineNo === targetNo : true
      })
      .map((outline: any, index: number) => ({
        scene_no: index + 1,
        title: outline?.title || contextPackage?.chapter_target?.title || `场景${index + 1}`,
        scene_type: outline?.scene_type || 'investigation',
        location: outline?.location || '',
        characters_present: asArray(outline?.characters_present || outline?.characters),
        purpose: outline?.purpose || outline?.summary || outline?.chapter_goal || contextPackage?.chapter_target?.summary || '',
        conflict: outline?.conflict || contextPackage?.chapter_target?.conflict || '',
        required_beats: asArray(outline?.required_beats || outline?.beats).length
          ? asArray(outline?.required_beats || outline?.beats)
          : [outline?.summary, outline?.conflict, outline?.ending_hook].filter(Boolean),
        beat: outline?.beat || outline?.summary || '',
        opening_hook: outline?.opening_hook || outline?.hook || '',
        reader_payoff: outline?.reader_payoff || outline?.payoff || '',
        fear_point: outline?.fear_point || '',
        rule_pressure: outline?.rule_pressure || outline?.rule_trigger || '',
        information_gap: outline?.information_gap || '',
        reversal: outline?.reversal || outline?.turning_point || '',
        ending_hook_seed: outline?.ending_hook_seed || outline?.ending_hook || '',
        character_voice: outline?.character_voice || '',
        turning_point: outline?.turning_point || outline?.ending_hook || '',
        exit_state: outline?.exit_state || outline?.ending_hook || '',
      }))
  const cards = directCards.length ? directCards : outlineCards
  return cards.map((card: any, index: number) => ({
    scene_no: Number(card?.scene_no || index + 1),
    title: String(card?.title || `场景${index + 1}`),
    scene_type: String(card?.scene_type || card?.type || ''),
    location: String(card?.location || ''),
    characters_present: asArray(card?.characters_present).map((item: any) => String(item)).filter(Boolean),
    purpose: String(card?.purpose || ''),
    conflict: String(card?.conflict || ''),
    required_beats: asArray(card?.required_beats || card?.beats).map((item: any) => String(item)).filter(Boolean),
    action_beats: asArray(card?.action_beats || card?.combat_beats).map((item: any) => String(item)).filter(Boolean),
    beat: String(card?.beat || card?.action || card?.description || ''),
    opening_hook: String(card?.opening_hook || card?.hook_opening || ''),
    reader_payoff: String(card?.reader_payoff || card?.payoff || ''),
    fear_point: String(card?.fear_point || card?.terror_point || ''),
    rule_pressure: String(card?.rule_pressure || card?.rule_trigger || ''),
    information_gap: String(card?.information_gap || card?.mystery_gap || ''),
    reversal: String(card?.reversal || card?.twist || ''),
    ending_hook_seed: String(card?.ending_hook_seed || card?.ending_hook || ''),
    character_voice: String(card?.character_voice || card?.voice_focus || ''),
    emotional_tone: String(card?.emotional_tone || card?.tone || ''),
    key_dialogue: String(card?.key_dialogue || card?.dialogue_focus || ''),
    dialogue_goal: String(card?.dialogue_goal || ''),
    required_information: asArray(card?.required_information).map((item: any) => String(item)).filter(Boolean),
    used_settings: asArray(card?.used_settings).map((item: any) => String(item)).filter(Boolean),
    revealed_settings: asArray(card?.revealed_settings).map((item: any) => String(item)).filter(Boolean),
    forbidden_settings: asArray(card?.forbidden_settings).map((item: any) => String(item)).filter(Boolean),
    ability_beats: asArray(card?.ability_beats).map((item: any) => String(item)).filter(Boolean),
    item_beats: asArray(card?.item_beats).map((item: any) => String(item)).filter(Boolean),
    boss_move: String(card?.boss_move || ''),
    rule_trigger: String(card?.rule_trigger || ''),
    state_changes_expected: asArray(card?.state_changes_expected).map((item: any) => String(typeof item === 'string' ? item : JSON.stringify(item))).filter(Boolean),
    turning_point: String(card?.turning_point || ''),
    description_budget: String(card?.description_budget || card?.sensory_budget || 'low'),
    transition_from_previous: String(card?.transition_from_previous || ''),
    exit_state: String(card?.exit_state || ''),
  })).filter((card: any) => card.beat || card.purpose || card.title)
}

export function createNovelWritingService(ctx: {
  getProject: (workspace: string, id: number) => Promise<any>
  production: NovelProductionService
  reference: NovelReferenceService
}) {
  const buildSceneCardsPrompt = (project: any, contextPackage: any) => [
    '任务：为当前章节生成可人工确认的场景卡。场景卡是正文生成前的蓝图，不要写完整正文。',
    `作品标题：${project.title}`,
    `目标章节：第${contextPackage?.chapter_target?.chapter_no || '?'}章《${contextPackage?.chapter_target?.title || '无标题'}》`,
    '必须以 chapter_target.summary、chapter_target.conflict、chapter_target.ending_hook 为准重建本章场景卡。',
    '如果上下文里已有 scene_cards 与本章目标不一致，视为旧草稿，必须忽略。',
    '本次不是生成总纲、分卷或章节大纲。严禁输出 master_outline、volume_outlines、chapter_outlines、foreshadowing_plan。',
    '只允许围绕目标章节生成 2-6 个 scene_cards；不得输出其他章节内容。',
    '',
    '【结构化上下文包】',
    JSON.stringify(contextPackage, null, 2).slice(0, 9000),
    '',
    '输出 JSON，字段 scene_cards(array)。每个场景卡包含：scene_no, title, scene_type, location, characters_present(array), purpose, conflict, required_beats(array), action_beats(array), beat, opening_hook, reader_payoff, fear_point, rule_pressure, information_gap, reversal, ending_hook_seed, character_voice, emotional_tone, key_dialogue, dialogue_goal, required_information(array), used_settings(array), revealed_settings(array), forbidden_settings(array), ability_beats(array), item_beats(array), boss_move, rule_trigger, state_changes_expected(array), turning_point, description_budget, transition_from_previous, exit_state。',
    'scene_type 只能取：action/combat/chase/investigation/dialogue/reveal/emotion/transition/hook。凡是本章有战斗、追逐、灾祸、清剿、冲突升级，必须至少有一个 action/combat/chase 场景。',
    '商业读者钩子：每个场景至少落实 opening_hook/reader_payoff/fear_point/rule_pressure/information_gap/reversal/ending_hook_seed 中的一项，不允许只写剧情摘要。',
    '前三章第一场必须有 opening_hook；最后一个场景必须有 ending_hook_seed；规则怪谈、恐怖、悬疑类章节必须把 rule_pressure 与 fear_point 写成具体可见风险。',
    'reader_payoff 要说明这一场给读者的爽点、惊点、信息回收或关系变化；character_voice 要标出主要角色的差异化说话方式。',
    'action_beats 必须写成可见动作链：起手/试探/受阻/受伤或代价/反制/结果。非动作场景也要写 required_beats，避免只写氛围。',
    'description_budget 写 low/medium/high。默认 low；只有新地点首次登场或诡异规则首次显形时才允许 medium/high。',
    '设定工坊约束：必须优先使用 setting_context.chapter_usage.required；allowed 可按需使用；forbidden_settings 不得揭露或误用；能力、物品、Boss、规则、境界和角色认知必须服从 setting_context.entities 的 constraints_json/state_json。',
    '要求：2-6 个场景；每个场景必须服务本章目标；最后一个场景必须到达 ending_hook；不要复制参考作品专名、桥段或原句；只返回 JSON object，顶层只能包含 scene_cards。',
  ].join('\n')

  const buildHeuristicSettingUsage = (chapter: any, settings: any[]) => {
    const chapterText = [
      chapter.title,
      chapter.chapter_goal,
      chapter.chapter_summary,
      chapter.conflict,
      chapter.ending_hook,
      JSON.stringify(chapter.raw_payload || {}),
    ].join(' ')
    return settings.map((setting: any) => {
      const settingText = [
        setting.name,
        setting.summary,
        JSON.stringify(setting.constraints_json || {}),
        JSON.stringify(setting.state_json || {}),
      ].join(' ')
      let score = 0
      const name = String(setting.name || '')
      if (name && chapterText.includes(name)) score += 40
      for (const token of settingText.split(/[\s,，。；;、/|]+/).filter(item => item.length >= 2).slice(0, 50)) {
        if (chapterText.includes(token)) score += 2
      }
      if (['character', 'boss', 'rule'].includes(setting.entity_type)) score += 4
      if (['ability', 'item', 'foreshadowing'].includes(setting.entity_type)) score += 2
      return { setting, score }
    })
      .filter(item => item.score >= 6)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ setting, score }, index) => ({
        entity_id: setting.id,
        usage_type: index < 4 || score >= 30 ? 'required' : 'allowed',
        required: index < 4 || score >= 30,
        allowed: true,
        forbidden: false,
        reveal_level: setting.visibility === 'hidden' || setting.visibility === 'spoiler' ? 'hint' : 'partial',
        expected_state_change: { reason: `生成前自动匹配：与本章目标/摘要/冲突相似度 ${score}` },
      }))
  }

  const selectProseForChapter = (payload: any, chapter: any) => {
    const targetNo = Number(chapter?.chapter_no || 0)
    const proseArr = Array.isArray(payload?.prose_chapters) ? payload.prose_chapters : []
    const matched = proseArr.find((item: any) => Number(item?.chapter_no || 0) === targetNo)
    if (matched) return matched
    if (proseArr.length === 1) {
      const onlyNo = Number(proseArr[0]?.chapter_no || 0)
      if (!onlyNo || onlyNo === targetNo) return proseArr[0]
      throw new Error(`模型返回的正文章节与目标不一致：目标第${targetNo}章，返回第${onlyNo}章`)
    }
    if (proseArr.length > 1) {
      const foundNos = proseArr.map((item: any) => item?.chapter_no).filter(Boolean).join('、') || '无'
      throw new Error(`模型返回的正文章节与目标不一致：目标第${targetNo}章，返回章节号为：${foundNos}`)
    }
    const topLevelNo = Number(payload?.chapter_no || 0)
    if (topLevelNo && topLevelNo !== targetNo) {
      throw new Error(`模型返回的正文章节与目标不一致：目标第${targetNo}章，返回第${topLevelNo}章`)
    }
    return payload || {}
  }

  const generateSceneCardsForChapter = async (activeWorkspace: string, project: any, contextPackage: any, modelId?: number) => {
    const stageModelId = ctx.production.getStageModelId(project, 'scene_cards', modelId)
    const result = await executeNovelAgent('outline-agent', project, {
      task: buildSceneCardsPrompt(project, contextPackage),
      upstreamContext: contextPackage,
    }, { activeWorkspace, modelId: stageModelId ? String(stageModelId) : undefined, maxTokens: 3000, temperature: ctx.production.getStageTemperature(project, 'scene_cards', 0.45), skipMemory: true })
    const payload = getNovelPayload(result)
    return { result, sceneCards: normalizeSceneCardsPayload(payload, contextPackage) }
  }

  const buildParagraphProseContext = (project: any, contextPackage: any, migrationPlan: any = null, chapterDraft: any = null) => {
    const chapterTarget = contextPackage?.chapter_target || {}
    const longformCompass = normalizeLongformCompass(contextPackage?.chapter_target?.longform_compass || contextPackage?.longform_compass)
    const longformBattleContext = normalizeLongformBattleContext(
      contextPackage?.chapter_target?.longform_battle_context
      || contextPackage?.chapter_target?.longform_battle_desk
      || contextPackage?.longform_battle_context
      || contextPackage?.longform_battle_desk
      || contextPackage?.longformBattleDesk,
    )
    const chapterLaunchGate = contextPackage?.chapter_target?.chapter_launch_gate || contextPackage?.chapter_launch_gate || null
    const governanceRecheckMemory = normalizeGovernanceRecheckMemoryContext(
      contextPackage?.chapter_target?.governance_recheck_memory
      || contextPackage?.chapter_target?.governanceRecheckMemory
      || contextPackage?.governance_recheck_memory
      || contextPackage?.governanceRecheckMemory
      || contextPackage?.pre_draft_brief?.governance_recheck_memory
      || contextPackage?.preDraftBrief?.governanceRecheckMemory,
    )
    const sceneBriefs = asArray(chapterTarget.scene_cards).map(sceneBriefFromCard)
    const coreContractRadar = buildCoreContractRadar(project, contextPackage, sceneBriefs, longformCompass, longformBattleContext)
    const nextBatchBrief = normalizeNextBatchBrief(
      contextPackage?.chapter_target?.next_batch_brief || contextPackage?.next_batch_brief,
      Number(chapterDraft?.chapter_no || contextPackage?.chapter_target?.chapter_no || 0),
    )
    const expansionStructureDecision = nextBatchBrief?.expansion_structure_decision || null
    const defaultFiveChapterLaneRedesign = expansionStructureDecision?.default_five_chapter_lane_redesign || null
    const expansionStructureVerification = nextBatchBrief?.expansion_structure_verification || null
    const defaultFiveChapterRegression = expansionStructureVerification?.default_five_chapter_regression || null
    const batchPreflight = contextPackage?.chapter_target?.batch_preflight || contextPackage?.batch_preflight || null
    const batchDeliveryRiskCarryOver = normalizeDeliveryRiskCarryOverContext(
      batchPreflight?.delivery_risk_carry_over
      || batchPreflight?.deliveryRiskCarryOver,
    )
    const batchChapterHandoffContract = normalizeBatchChapterHandoffContract(
      batchPreflight?.chapter_handoff_contract
      || batchPreflight?.chapterHandoffContract,
    )
    const longformMemoryAnchor = batchPreflight?.longform_memory_anchor
      || batchPreflight?.longformMemoryAnchor
      || contextPackage?.chapter_target?.longform_memory_anchor
      || contextPackage?.longform_memory_anchor
      || null
    const longformMemoryCapsule = normalizeLongformMemoryCapsule(
      contextPackage?.chapter_target?.longform_memory_capsule
      || contextPackage?.chapter_target?.longformMemoryCapsule
      || contextPackage?.longform_memory_capsule
      || contextPackage?.longformMemoryCapsule,
    )
    const millionWordRunway = contextPackage?.chapter_target?.million_word_runway || contextPackage?.million_word_runway || null
    const styleSampleStrategy = contextPackage?.chapter_target?.style_sample_strategy || buildStyleSampleStrategy(project, contextPackage)
    const chapterBenchmarkStrategy = contextPackage?.chapter_target?.chapter_benchmark_strategy || buildChapterBenchmarkStrategy(project, contextPackage)
    const first30RetentionBrief = contextPackage?.chapter_target?.first30_retention_brief || contextPackage?.first30_retention_context || null
    const readerDropRiskBrief = normalizeReaderDropRiskBrief(
      contextPackage?.chapter_target?.reader_drop_risk_brief
      || contextPackage?.reader_drop_risk_brief
      || contextPackage?.reader_trial_context
      || contextPackage?.readerTrialContext,
      contextPackage?.chapter_target?.reader_retention_brief,
      first30RetentionBrief,
    )
    const storyPressureBrief = normalizeStoryPressureBrief(
      contextPackage?.chapter_target?.story_pressure_brief
      || contextPackage?.chapter_target?.storyPressureBrief
      || contextPackage?.story_pressure_brief
      || contextPackage?.storyPressureBrief
      || contextPackage?.story_pressure_ladder
      || contextPackage?.storyPressureLadder,
    )
    const storyDriveBrief = normalizeStoryDriveBrief(
      contextPackage?.chapter_target?.story_drive_brief
      || contextPackage?.chapter_target?.storyDriveBrief
      || contextPackage,
      asArray(contextPackage?.chapter_target?.scene_cards),
    )
    const serialRhythmBrief = normalizeSerialRhythmBrief(
      contextPackage?.chapter_target?.serial_rhythm_brief
      || contextPackage?.chapter_target?.serialRhythmBrief
      || contextPackage?.serial_rhythm_brief
      || contextPackage?.serialRhythmBrief,
      sceneBriefs,
      contextPackage?.chapter_target?.reader_retention_brief,
      contextPackage?.chapter_target?.word_target,
    )
    const pageTurnHookBrief = normalizePageTurnHookBrief(
      contextPackage?.chapter_target?.page_turn_hook_brief
      || contextPackage?.chapter_target?.pageTurnHookBrief
      || contextPackage?.page_turn_hook_brief
      || contextPackage?.pageTurnHookBrief,
      contextPackage?.chapter_target || {},
      sceneBriefs,
      contextPackage?.chapter_target?.reader_retention_brief,
      storyDriveBrief,
    )
    const volumeClimaxBrief = normalizeVolumeClimaxBrief(
      contextPackage?.chapter_target?.volume_climax_brief
      || contextPackage?.chapter_target?.volumeClimaxBrief
      || contextPackage?.chapter_target?.volume_beat_brief
      || contextPackage?.chapter_target?.volumeBeatBrief
      || contextPackage?.volume_climax_brief
      || contextPackage?.volumeClimaxBrief
      || contextPackage?.volume_beat_brief
      || contextPackage?.volumeBeatBrief
      || contextPackage?.volume_beat_budget
      || contextPackage?.volumeBeatBudget,
      contextPackage?.chapter_target || {},
      contextPackage?.volume_beat_budget || contextPackage?.volumeBeatBudget,
    )
    const recentFatigueBrief = normalizeRecentFatigueBrief(
      contextPackage?.chapter_target?.recent_fatigue_brief
      || contextPackage?.chapter_target?.recentFatigueBrief
      || contextPackage?.chapter_target?.recent_fatigue_radar
      || contextPackage?.chapter_target?.recentFatigueRadar
      || contextPackage?.recent_fatigue_brief
      || contextPackage?.recentFatigueBrief
      || contextPackage?.recent_fatigue_radar
      || contextPackage?.recentFatigueRadar,
    )
    const deliveryRiskCarryOver = normalizeDeliveryRiskCarryOverContext(
      contextPackage?.chapter_target?.delivery_risk_carry_over
      || contextPackage?.chapter_target?.deliveryRiskCarryOver
      || contextPackage?.delivery_risk_carry_over
      || contextPackage?.deliveryRiskCarryOver,
    )
    const readerExpectationDebtContext = applyReaderExpectationDebtAging(
      normalizeReaderExpectationDebtContext(contextPackage?.chapter_target?.reader_expectation_debt_context || contextPackage?.reader_expectation_debt_context),
      Number(chapterDraft?.chapter_no || contextPackage?.chapter_target?.chapter_no || 0),
    )
    const previousHandoff = buildPreviousChapterHandoff(contextPackage)
    const storyUnitContext = normalizeStoryUnitContext(
      contextPackage?.chapter_target?.story_unit_context || contextPackage?.story_unit_context,
      Number(chapterDraft?.chapter_no || contextPackage?.chapter_target?.chapter_no || 0),
    )
    const signatureSceneBrief = normalizeSignatureSceneBrief(
      contextPackage?.chapter_target?.signature_scene_brief
      || contextPackage?.signature_scene_brief
      || contextPackage?.chapter_target?.rollingPlan
      || contextPackage?.chapter_target?.rolling_plan,
    )
    const characterArcBrief = characterArcBriefFromContext(contextPackage, chapterDraft)
    return [
      '任务：按场景卡生成章节正文。请先在心中按场景组织段落，再输出完整正文。',
      `作品标题：${project.title}`,
      chapterDraft?.chapter_no ? `目标章节：第${chapterDraft.chapter_no}章《${chapterDraft.title || '无标题'}》` : '',
      chapterDraft?.chapter_no ? `只允许输出这一章的正文，不得混入其他章节内容。chapter_no 必须严格等于 ${chapterDraft.chapter_no}` : '',
      contextPackage?.chapter_target?.word_target ? `本章目标字数：约 ${contextPackage.chapter_target.word_target.target} 字；可接受范围：${contextPackage.chapter_target.word_target.min}-${contextPackage.chapter_target.word_target.max} 字；类型：${contextPackage.chapter_target.word_target.label}。` : '',
      contextPackage?.chapter_target?.word_target ? '字数执行要求：每个场景分配明确字数预算，正文不得只写剧情摘要；如果低于目标范围，必须扩写动作过程、选择代价、对话交锋和章末钩子铺垫，而不是堆砌环境描写。' : '',
      '必须以 chapter_target.summary、chapter_target.conflict、chapter_target.ending_hook 和 scene_cards 为准；如果已有正文或旧场景分解与目标不一致，不得沿用。',
      '',
      previousHandoff ? '【上一章承接】' : '',
      previousHandoff ? '硬性要求：前 300 字必须接住上一章最后一幕，写出角色对上一章钩子、危机、欠账或未解问题的直接反应；不得重新从泛环境描写、空泛醒来或无关解释开场。' : '',
      previousHandoff ? previousHandoff : '',
      '',
      deliveryRiskCarryOver ? '【上一章交稿风险承接】' : '',
      deliveryRiskCarryOver ? '硬性要求：执行 chapter_target.delivery_risk_carry_over；这些是上一章交稿后仍未完全解决的软风险，本章必须把它们转成开篇承接、场景推进、读者回报、创新落点或章末钩子，不得只在旁白中声明已经处理。' : '',
      deliveryRiskCarryOver?.source_chapter_no ? `风险来源：第${deliveryRiskCarryOver.source_chapter_no}章` : '',
      deliveryRiskCarryOver?.label ? `风险总览：${deliveryRiskCarryOver.label}` : '',
      deliveryRiskCarryOver?.priority_label ? `优先级：${deliveryRiskCarryOver.priority_label}` : '',
      deliveryRiskCarryOver?.items?.length ? `风险项：${deliveryRiskCarryOver.items.join('；')}` : '',
      deliveryRiskCarryOver?.required_actions?.length ? `承接动作：${deliveryRiskCarryOver.required_actions.join('；')}` : '',
      deliveryRiskCarryOver ? JSON.stringify(deliveryRiskCarryOver, null, 2).slice(0, 3000) : '',
      '',
      longformCompass ? '【长篇作品罗盘】' : '',
      longformCompass ? '硬性要求：不可漂移项必须遵守；可调整区只能服务本章目标、当前卷目标和读者承诺，不得把扩展写成核心改道。' : '',
      longformCompass ? JSON.stringify(longformCompass, null, 2).slice(0, 4000) : '',
      '',
      longformBattleContext ? '【长篇作战承接】' : '',
      longformBattleContext ? '硬性要求：执行 chapter_target.longform_battle_context；risk_lanes 是本章必须修复或承接的长篇生产风险，必须写成可见事件、冲突推进、读者回报、剧情线动作或章末钩子，不得只在旁白里声明已经解决。' : '',
      longformBattleContext ? JSON.stringify(longformBattleContext, null, 2).slice(0, 4000) : '',
      '',
      chapterLaunchGate ? '【本章开写门禁】' : '',
      chapterLaunchGate ? '硬性要求：本章必须逐条落实读者承诺、章节目标、核心冲突、主线服务、读者回报和章末钩子；不得把门禁中的 warn/block 项绕过去写。' : '',
      chapterLaunchGate ? JSON.stringify(chapterLaunchGate, null, 2).slice(0, 4000) : '',
      '',
      governanceRecheckMemory ? '【治理复查承接】' : '',
      governanceRecheckMemory ? '硬性要求：执行 chapter_target.governance_recheck_memory；这是上一轮日终复查沉淀到本章的恢复依据。evidence 必须继续写成正文可见的冲突推进、对白执行、读者回报或剧情线动作；watch_items 必须在本章保持观察，不得因为只写单章就丢失。' : '',
      governanceRecheckMemory?.source_run_id ? `来源审计：#${governanceRecheckMemory.source_run_id}` : '',
      governanceRecheckMemory?.summary ? `复查摘要：${governanceRecheckMemory.summary}` : '',
      governanceRecheckMemory?.evidence?.length ? `修后证据：${governanceRecheckMemory.evidence.join('；')}` : '',
      governanceRecheckMemory?.failed_evidence?.length ? `当前失效依据：${governanceRecheckMemory.failed_evidence.join('；')}` : '',
      governanceRecheckMemory?.watch_items?.length ? `仍需观察：${governanceRecheckMemory.watch_items.join('；')}` : '',
      governanceRecheckMemory ? JSON.stringify(governanceRecheckMemory, null, 2).slice(0, 3000) : '',
      '',
      coreContractRadar ? '【核心契约】' : '',
      coreContractRadar ? '硬性要求：执行 chapter_target.core_contract_radar；must_serve 是本章必须服务的全书承诺、核心冲突、创新卖点和读者回报；no_drift 是不得漂移的红线；repair_focus 必须写成可见事件、选择、代价、规则判定、主线推进或章末问题。' : '',
      coreContractRadar ? `必须服务：${coreContractRadar.must_serve.join('；') || '按长篇罗盘与本章任务书执行'}` : '',
      coreContractRadar ? `不得漂移：${coreContractRadar.no_drift.join('；') || '不得改写全书核心承诺、主角驱动和长期方向'}` : '',
      coreContractRadar?.repair_focus?.length ? `优先修正：${coreContractRadar.repair_focus.join('；')}` : '',
      coreContractRadar ? JSON.stringify(coreContractRadar, null, 2).slice(0, 4000) : '',
      '',
      nextBatchBrief ? '【本批连载任务书】' : '',
      nextBatchBrief ? '硬性要求：本章必须服务批次目标和当前章角色；不得提前消费后续章节爆点，不得跳过本章读者回报，不得抢跑批次后段的主线兑现。' : '',
      nextBatchBrief?.start_checklist?.length ? `批次开工清单：${nextBatchBrief.start_checklist.map((item: any) => `${item.label || item.key}：${item.detail || item.status}`).join('；')}` : '',
      nextBatchBrief ? JSON.stringify(nextBatchBrief, null, 2).slice(0, 4000) : '',
      '',
      expansionStructureDecision ? '【扩批结构决策】' : '',
      expansionStructureDecision ? '硬性要求：执行 next_batch_brief.expansion_structure_decision；这是结构修复有效性对本批规模、段位职责和观察指标的最终判断。正文必须按 recommendation 执行，不得因为恢复扩批而淡化结构约束，也不得在小批验证或单章重构时抢跑后续批次。' : '',
      expansionStructureDecision?.recommendation ? `决策：${expansionStructureDecision.recommendation}` : '',
      expansionStructureDecision?.mode_label ? `模式：${expansionStructureDecision.mode_label}` : '',
      expansionStructureDecision?.target_chapter_count ? `目标批次：${expansionStructureDecision.target_chapter_count}章` : '',
      expansionStructureDecision?.segment_label ? `观察段位：${expansionStructureDecision.segment_label}` : '',
      expansionStructureDecision?.summary ? `有效性摘要：${expansionStructureDecision.summary}` : '',
      expansionStructureDecision?.instruction ? `执行口径：${expansionStructureDecision.instruction}` : '',
      expansionStructureDecision?.observation_metrics?.length ? `观察指标：${expansionStructureDecision.observation_metrics.join('；')}` : '',
      defaultFiveChapterLaneRedesign ? '默认5章档位结构重构：连续恢复判定失效后，本章不得只修单章句子，必须先重写默认 5 章档位的段位职责、冲突轮换、回报密度和章末追读模板。' : '',
      defaultFiveChapterLaneRedesign?.reason ? `重构来源：${defaultFiveChapterLaneRedesign.reason}` : '',
      defaultFiveChapterLaneRedesign?.relapse_count ? `连续恢复判定失效：${defaultFiveChapterLaneRedesign.relapse_count}次` : '',
      defaultFiveChapterLaneRedesign?.repeated_failure_reasons?.length ? `同维复发：${defaultFiveChapterLaneRedesign.repeated_failure_reasons.join('、')}` : '',
      defaultFiveChapterLaneRedesign?.segment_duty_rewrite ? `段位职责重写：${defaultFiveChapterLaneRedesign.segment_duty_rewrite}` : '',
      defaultFiveChapterLaneRedesign?.conflict_rotation ? `冲突轮换：${defaultFiveChapterLaneRedesign.conflict_rotation}` : '',
      defaultFiveChapterLaneRedesign?.payoff_density ? `回报密度：${defaultFiveChapterLaneRedesign.payoff_density}` : '',
      defaultFiveChapterLaneRedesign?.ending_hook_template ? `章末追读模板：${defaultFiveChapterLaneRedesign.ending_hook_template}` : '',
      expansionStructureDecision ? '执行回执：scene_breakdown 中承担结构职责的场景必须回填 expansion_structure_decision_execution，字段包含 segment_role_delivered(boolean)、observation_metrics_delivered(boolean)、redesign_principles_delivered(boolean)、evidence(array)。' : '',
      expansionStructureDecision ? JSON.stringify(expansionStructureDecision, null, 2).slice(0, 3000) : '',
      '',
      expansionStructureVerification ? '【扩批结构验证】' : '',
      expansionStructureVerification ? '硬性要求：执行 next_batch_brief.expansion_structure_verification；这是已修复的5章扩批热区进入本轮2-3章验证，正文必须证明结构修复真的落地，而不是只声明已经修好。' : '',
      expansionStructureVerification?.repeated_hotspot_segment ? `${expansionStructureVerification.repeated_hotspot_segment.label || '复发段位'}连续 ${expansionStructureVerification.repeated_hotspot_segment.count || 0} 次成为扩批热区，本批必须反证同一段位不会再次只铺垫、掉回报或丢章末追读。` : '',
      expansionStructureVerification?.validation_chapter_nos?.length ? `验证章节：${expansionStructureVerification.validation_chapter_nos.map((chapterNo: number) => `第${chapterNo}章`).join('、')}` : '',
      expansionStructureVerification?.fixed_segment_role ? `固定段落职责：${expansionStructureVerification.fixed_segment_role}` : '',
      expansionStructureVerification?.conflict_rotation ? `冲突换源：${expansionStructureVerification.conflict_rotation}` : '',
      expansionStructureVerification?.explicit_payoff ? `显性回报：${expansionStructureVerification.explicit_payoff}` : '',
      expansionStructureVerification?.ending_hook_requirement ? `章末追读：${expansionStructureVerification.ending_hook_requirement}` : '',
      expansionStructureVerification?.structure_actions?.length ? `结构动作：${expansionStructureVerification.structure_actions.join('；')}` : '',
      defaultFiveChapterRegression ? `默认5章档位回退：${defaultFiveChapterRegression.summary || defaultFiveChapterRegression.label || '默认档位复发，需要回到3章验证批。'}` : '',
      defaultFiveChapterRegression?.default_batch_chapter_nos?.length ? `失效批次：${chapterNosBrief(defaultFiveChapterRegression.default_batch_chapter_nos)}` : '',
      defaultFiveChapterRegression?.restore_chapter_nos?.length ? `恢复依据：${chapterNosBrief(defaultFiveChapterRegression.restore_chapter_nos)}` : '',
      defaultFiveChapterRegression?.validation_chapter_nos?.length ? `前置3章验证：${chapterNosBrief(defaultFiveChapterRegression.validation_chapter_nos)}` : '',
      defaultFiveChapterRegression?.failure_reasons?.length ? `失败维度：${defaultFiveChapterRegression.failure_reasons.join('、')}` : '',
      defaultFiveChapterRegression ? '默认档位验证要求：本批每章都必须逐章证明核心守恒、显性回报和章末追读已经重新稳定；不能只修复单章句子，也不能把中段继续写成铺垫、转场或弱钩子。' : '',
      expansionStructureVerification ? JSON.stringify(expansionStructureVerification, null, 2).slice(0, 3000) : '',
      '',
      longformMemoryAnchor ? '【长篇正史锚点】' : '',
      longformMemoryAnchor ? '硬性要求：这是本批连续生产的压缩正史。角色状态、开放悬念、回报债务和核心承诺不得被改写、遗忘或绕开；新增情节必须从这些锚点自然推进。' : '',
      longformMemoryAnchor ? JSON.stringify(longformMemoryAnchor, null, 2).slice(0, 3000) : '',
      '',
      longformMemoryCapsule ? '【长篇记忆胶囊】' : '',
      longformMemoryCapsule ? '硬性要求：执行 chapter_target.longform_memory_capsule；这是本章必须召回的压缩正史。核心承诺、主线进度、角色状态、开放悬念、回报债务、正史事实和红线不得被遗忘、矛盾改写或跳过。' : '',
      longformMemoryCapsule ? JSON.stringify(longformMemoryCapsule, null, 2).slice(0, 4000) : '',
      '',
      storyUnitContext ? '【剧情单元任务】' : '',
      storyUnitContext ? '硬性要求：执行 chapter_target.story_unit_context；本章只完成 current_chapter_role，并服务 unit_goal。可以铺垫 pressure_escalation 和 setup_and_storyline，但不得提前消费 mini_climax_payoff、exit_hook 或 forbidden_advance 中的后段爆点。' : '',
      storyUnitContext ? JSON.stringify(storyUnitContext, null, 2).slice(0, 4000) : '',
      '',
      storyPressureBrief ? '【故事压力阶梯】' : '',
      storyPressureBrief ? '硬性要求：执行 chapter_target.story_pressure_brief；本章必须把压力源、冲突升级、赌注升级和反转逼迫写成可见事件。不得只平铺过场、复述设定或让主角无代价通关。' : '',
      storyPressureBrief?.pressure_sources?.length ? `压力源：${storyPressureBrief.pressure_sources.join('；')}` : '',
      storyPressureBrief?.conflict_escalation_guardrail ? `冲突升级：${storyPressureBrief.conflict_escalation_guardrail}` : '',
      storyPressureBrief?.stakes_growth_guardrail ? `赌注升级：${storyPressureBrief.stakes_growth_guardrail}` : '',
      storyPressureBrief?.reversal_pressure_guardrail ? `反转逼迫：${storyPressureBrief.reversal_pressure_guardrail}` : '',
      storyPressureBrief?.required_actions?.length ? `执行动作：${storyPressureBrief.required_actions.join('；')}` : '',
      storyPressureBrief ? JSON.stringify(storyPressureBrief, null, 2).slice(0, 4000) : '',
      '',
      storyDriveBrief ? '【主角能动性】' : '',
      storyDriveBrief ? '硬性要求：执行 chapter_target.story_drive_brief；本章必须让主角在压力下做出主动选择，并写清阻碍、选择代价、状态变化和下一步因果。不得让主角只听解释、等别人推动或无代价通关。' : '',
      storyDriveBrief?.obstacle ? `明确阻碍：${storyDriveBrief.obstacle}` : '',
      storyDriveBrief?.protagonist_choice ? `主角选择：${storyDriveBrief.protagonist_choice}` : '',
      storyDriveBrief?.choice_cost ? `选择代价：${storyDriveBrief.choice_cost}` : '',
      storyDriveBrief?.state_change ? `状态变化：${storyDriveBrief.state_change}` : '',
      storyDriveBrief?.causal_next_step ? `下一步因果：${storyDriveBrief.causal_next_step}` : '',
      storyDriveBrief?.required_actions?.length ? `执行动作：${storyDriveBrief.required_actions.join('；')}` : '',
      storyDriveBrief ? JSON.stringify(storyDriveBrief, null, 2).slice(0, 4000) : '',
      '',
      serialRhythmBrief ? '【连载节奏与回报密度】' : '',
      serialRhythmBrief ? '硬性要求：执行 chapter_target.serial_rhythm_brief；开篇钩子、中段回报密度、场景回报预算和章末追读必须写成正文中的可见行动、信息变化、反转、爽点或未解问题。不得用长解释、纯环境、心理总结或无效对话拖字数。' : '',
      serialRhythmBrief?.opening_hook_deadline ? `开篇钩子：${serialRhythmBrief.opening_hook_deadline}` : '',
      serialRhythmBrief?.payoff_interval ? `回报密度：${serialRhythmBrief.payoff_interval}` : '',
      serialRhythmBrief?.middle_guardrail ? `中段节奏：${serialRhythmBrief.middle_guardrail}` : '',
      serialRhythmBrief?.ending_hook_guardrail ? `章末追读：${serialRhythmBrief.ending_hook_guardrail}` : '',
      serialRhythmBrief?.scene_payoff_budget?.length ? `场景回报预算：${serialRhythmBrief.scene_payoff_budget.map((item: any) => `${item.scene_no || ''}.${item.title || '场景'}：${item.required_payoff || item.turn || item.ending_hook_seed || '必须有可见回报'}`).join('；')}` : '',
      serialRhythmBrief?.anti_drag_rules?.length ? `防水规则：${serialRhythmBrief.anti_drag_rules.join('；')}` : '',
      serialRhythmBrief ? JSON.stringify(serialRhythmBrief, null, 2).slice(0, 4000) : '',
      '',
      pageTurnHookBrief ? '【章末翻页钩子】' : '',
      pageTurnHookBrief ? '硬性要求：执行 chapter_target.page_turn_hook_brief；最后 300 字必须形成清晰翻页冲动。可见触发要落成角色现场看见、听见、拿到、失去、被迫选择或被反转击中；读者问题必须留到下一章推动；禁提前解答项不得在本章解释完。' : '',
      pageTurnHookBrief?.hook_type ? `钩子类型：${pageTurnHookBrief.hook_type}` : '',
      pageTurnHookBrief?.core_question ? `读者问题：${pageTurnHookBrief.core_question}` : '',
      pageTurnHookBrief?.visible_trigger ? `可见触发：${pageTurnHookBrief.visible_trigger}` : '',
      pageTurnHookBrief?.final_image ? `最后画面：${pageTurnHookBrief.final_image}` : '',
      pageTurnHookBrief?.next_chapter_pull ? `下一章拉力：${pageTurnHookBrief.next_chapter_pull}` : '',
      pageTurnHookBrief?.forbidden_resolution?.length ? `禁提前解答：${pageTurnHookBrief.forbidden_resolution.join('；')}` : '',
      pageTurnHookBrief?.required_actions?.length ? `执行动作：${pageTurnHookBrief.required_actions.join('；')}` : '',
      pageTurnHookBrief ? JSON.stringify(pageTurnHookBrief, null, 2).slice(0, 4000) : '',
      '',
      volumeClimaxBrief ? '【卷级高潮预算】' : '',
      volumeClimaxBrief ? '硬性要求：执行 chapter_target.volume_climax_brief；本章只兑现 current_chapter_role、required_beats 和 climax_promise，不得提前消费 forbidden_payoff 标注的卷末爆点、身份答案、终局反转或后续大回报。' : '',
      volumeClimaxBrief?.current_volume_title ? `当前卷：${volumeClimaxBrief.current_volume_title}` : '',
      volumeClimaxBrief?.chapter_range ? `卷区间：${volumeClimaxBrief.chapter_range}` : '',
      volumeClimaxBrief?.current_chapter_role ? `本章职责：${volumeClimaxBrief.current_chapter_role}` : '',
      volumeClimaxBrief?.volume_goal ? `卷目标：${volumeClimaxBrief.volume_goal}` : '',
      volumeClimaxBrief?.climax_promise ? `高潮承诺：${volumeClimaxBrief.climax_promise}` : '',
      volumeClimaxBrief?.required_beats?.length ? `必须兑现：${volumeClimaxBrief.required_beats.join('；')}` : '',
      volumeClimaxBrief?.forbidden_payoff?.length ? `禁提前消费：${volumeClimaxBrief.forbidden_payoff.join('；')}` : '',
      volumeClimaxBrief?.nearby_beats?.length ? `邻近爆点：${volumeClimaxBrief.nearby_beats.map((item: any) => `${item.chapter_no ? `第${item.chapter_no}章` : ''}${item.type ? `${item.type}` : ''}${item.label ? `《${item.label}》` : ''}${item.detail ? `：${item.detail}` : ''}`).join('；')}` : '',
      volumeClimaxBrief?.next_actions?.length ? `执行动作：${volumeClimaxBrief.next_actions.join('；')}` : '',
      volumeClimaxBrief ? JSON.stringify(volumeClimaxBrief, null, 2).slice(0, 4000) : '',
      '',
      recentFatigueBrief ? '【近10章疲劳规避】' : '',
      recentFatigueBrief ? '硬性要求：执行 chapter_target.recent_fatigue_brief；本章必须主动更换最近十章已经重复的冲突来源、回报形态、章末问题或可视化场面。不得为了稳妥继续复刻同一种压迫、同一种打脸、同一种悬念。' : '',
      recentFatigueBrief?.chapter_range_label ? `观察区间：${recentFatigueBrief.chapter_range_label}` : '',
      Number.isFinite(Number(recentFatigueBrief?.score)) ? `疲劳分：${recentFatigueBrief.score}` : '',
      recentFatigueBrief?.summary ? `疲劳概览：${recentFatigueBrief.summary}` : '',
      recentFatigueBrief?.fatigue_risks?.length ? `疲劳风险：${recentFatigueBrief.fatigue_risks.join('；')}` : '',
      recentFatigueBrief?.conflict_variation ? `冲突换源：${recentFatigueBrief.conflict_variation}` : '',
      recentFatigueBrief?.payoff_variation ? `回报换形：${recentFatigueBrief.payoff_variation}` : '',
      recentFatigueBrief?.hook_variation ? `钩子换题：${recentFatigueBrief.hook_variation}` : '',
      recentFatigueBrief?.scene_freshness ? `场面新鲜度：${recentFatigueBrief.scene_freshness}` : '',
      recentFatigueBrief?.next_actions?.length ? `执行动作：${recentFatigueBrief.next_actions.join('；')}` : '',
      recentFatigueBrief ? JSON.stringify(recentFatigueBrief, null, 2).slice(0, 4000) : '',
      '',
      signatureSceneBrief ? '【本章标志性场面补位】' : '',
      signatureSceneBrief ? '硬性要求：必须把 signature_scene 写成正文核心场面；scene_repair_target 是本章要修复的强场面缺口；reader_payoff 和 storyline_service 必须落成可见爽点、冲突结果或主线推进。不能只在旁白里声明“场面很震撼”。' : '',
      signatureSceneBrief ? JSON.stringify(signatureSceneBrief, null, 2).slice(0, 3000) : '',
      '',
      characterArcBrief && Object.keys(characterArcBrief).length ? '【人物成长承接】' : '',
      characterArcBrief && Object.keys(characterArcBrief).length ? '硬性要求：执行 chapter_target.character_arc_brief；本章必须把角色欲望、缺陷受压、关系变化、成长节点和口吻锚点写成可见选择、行动后果、对话反馈或关系反应。不得只在旁白里说人物成长，不得提前揭露 forbidden_reveal。' : '',
      characterArcBrief && Object.keys(characterArcBrief).length ? JSON.stringify(characterArcBrief, null, 2).slice(0, 4000) : '',
      '',
      batchPreflight ? '【安全连写预执行门禁】' : '',
      batchPreflight ? '硬性要求：本章必须服从安全连写预执行门禁；若存在近10章疲劳、批次任务书缺口、被拦截章节或 caution/warn 风险，本章必须主动换冲突来源、回报形态、章末问题或可视化场面，不能沿用上一批同质化写法。' : '',
      batchPreflight ? JSON.stringify(batchPreflight, null, 2).slice(0, 4000) : '',
      '',
      batchChapterHandoffContract ? '【安全连写章节交接契约】' : '',
      batchChapterHandoffContract ? '硬性要求：执行 batch_preflight.chapter_handoff_contract；这是安全连写启动时从上一章交接单和读者期待账提炼出的连续性契约。开篇前 300 字必须承接 previous_handoff 和 opening_obligations；must_deliver 必须写成可见回报；keep_alive 必须保持存在感；overdue 必须优先推进，不能被新剧情覆盖。' : '',
      batchChapterHandoffContract?.from_chapter_no ? `交接来源：第${batchChapterHandoffContract.from_chapter_no}章` : '',
      batchChapterHandoffContract?.apply_to_chapter_no ? `优先落点：第${batchChapterHandoffContract.apply_to_chapter_no}章` : '',
      batchChapterHandoffContract?.previous_handoff ? `上一章最后一幕：${batchChapterHandoffContract.previous_handoff}` : '',
      batchChapterHandoffContract?.opening_obligations?.length ? `开篇义务：${batchChapterHandoffContract.opening_obligations.join('；')}` : '',
      batchChapterHandoffContract?.expectation_carry_over?.length ? `期待承接：${batchChapterHandoffContract.expectation_carry_over.join('；')}` : '',
      batchChapterHandoffContract?.must_deliver?.length ? `必须兑现：${batchChapterHandoffContract.must_deliver.join('；')}` : '',
      batchChapterHandoffContract?.keep_alive?.length ? `继续悬念：${batchChapterHandoffContract.keep_alive.join('；')}` : '',
      batchChapterHandoffContract?.overdue?.length ? `逾期优先：${batchChapterHandoffContract.overdue.join('；')}` : '',
      batchChapterHandoffContract ? JSON.stringify(batchChapterHandoffContract, null, 2).slice(0, 3000) : '',
      '',
      batchDeliveryRiskCarryOver ? '【安全连写交稿风险承接】' : '',
      batchDeliveryRiskCarryOver ? '硬性要求：执行 batch_preflight.delivery_risk_carry_over；这是安全连写启动时从上一章交稿状态带来的风险债务，本章必须把它们写成开篇承接、中段推进和章末追读动作，不能只在旁白中宣布已修复。' : '',
      batchDeliveryRiskCarryOver?.source_chapter_no ? `风险来源：第${batchDeliveryRiskCarryOver.source_chapter_no}章` : '',
      batchDeliveryRiskCarryOver?.apply_to_chapter_no ? `优先落点：第${batchDeliveryRiskCarryOver.apply_to_chapter_no}章` : '',
      batchDeliveryRiskCarryOver?.priority_label ? `优先级：${batchDeliveryRiskCarryOver.priority_label}` : '',
      batchDeliveryRiskCarryOver?.items?.length ? `风险项：${batchDeliveryRiskCarryOver.items.join('；')}` : '',
      batchDeliveryRiskCarryOver?.required_actions?.length ? `修复动作：${batchDeliveryRiskCarryOver.required_actions.join('；')}` : '',
      batchDeliveryRiskCarryOver?.opening_actions?.length ? `开篇动作：${batchDeliveryRiskCarryOver.opening_actions.join('；')}` : '',
      batchDeliveryRiskCarryOver?.middle_actions?.length ? `中段动作：${batchDeliveryRiskCarryOver.middle_actions.join('；')}` : '',
      batchDeliveryRiskCarryOver?.ending_actions?.length ? `章末动作：${batchDeliveryRiskCarryOver.ending_actions.join('；')}` : '',
      batchDeliveryRiskCarryOver ? JSON.stringify(batchDeliveryRiskCarryOver, null, 2).slice(0, 3000) : '',
      '',
      millionWordRunway ? '【百万字航线守门】' : '',
      millionWordRunway ? '硬性要求：本章必须回答航线中的本章四问，遵守不可偏移红线，兑现追读燃料；如果 safeModeLabel 为仅单章或禁止连写，不得抢跑后续章节内容。' : '',
      millionWordRunway ? JSON.stringify(millionWordRunway, null, 2).slice(0, 5000) : '',
      '',
      first30RetentionBrief ? '【本章前30章留存修复】' : '',
      first30RetentionBrief ? '硬性要求：本章必须修复前30章诊断指出的目标、章末钩子、爽点/悬念和试读闭环风险；修复要落成可见行动、信息增量、回报或章末未解问题。' : '',
      first30RetentionBrief ? JSON.stringify(first30RetentionBrief, null, 2).slice(0, 4000) : '',
      '',
      readerDropRiskBrief ? '【读者弃读预警】' : '',
      readerDropRiskBrief ? '硬性要求：执行 chapter_target.reader_drop_risk_brief；drop_points 是试读读者可能离开的原因，必须分别在开篇 300 字、中段场景推进和章末翻页处补抓手。不得用设定说明、模板热血或空泛总结糊过去。' : '',
      readerDropRiskBrief?.opening_guardrail ? `开篇防弃读：${readerDropRiskBrief.opening_guardrail}` : '',
      readerDropRiskBrief?.middle_guardrail ? `中段防掉速：${readerDropRiskBrief.middle_guardrail}` : '',
      readerDropRiskBrief?.ending_guardrail ? `章末防流失：${readerDropRiskBrief.ending_guardrail}` : '',
      readerDropRiskBrief ? JSON.stringify(readerDropRiskBrief, null, 2).slice(0, 4000) : '',
      '',
      readerExpectationDebtContext.must_carry.length || readerExpectationDebtContext.keep_alive.length ? '【期待债务承接】' : '',
      readerExpectationDebtContext.must_carry.length || readerExpectationDebtContext.keep_alive.length ? '硬性要求：上一章或最近章节欠下的期待必须在本章可见推进；overdue/逾期待补项必须优先处理成动作、信息增量、冲突结果或章末升级。可延迟完全兑现，但不得遗忘、换线或矛盾改写。' : '',
      readerExpectationDebtContext.must_carry.length || readerExpectationDebtContext.keep_alive.length ? JSON.stringify(readerExpectationDebtContext, null, 2).slice(0, 3000) : '',
      '',
      styleSampleStrategy?.enabled ? '【本章风格样章策略】' : '',
      styleSampleStrategy?.enabled ? '硬性要求：只学习叙述节奏、句式密度、对白比例和情绪转折；原句不能照搬，不得复制样章桥段、专有设定、角色名和核心梗。' : '',
      styleSampleStrategy?.enabled ? JSON.stringify(styleSampleStrategy, null, 2).slice(0, 5000) : '',
      '',
      chapterBenchmarkStrategy?.enabled ? '【本章质量基准样例】' : '',
      chapterBenchmarkStrategy?.enabled ? '硬性要求：只学习章节结构、信息密度、冲突节拍、爽点兑现和章末钩子；不得复制样例桥段、角色名、专有设定和原句，不得把样例剧情替换成本章剧情。' : '',
      chapterBenchmarkStrategy?.enabled ? JSON.stringify(chapterBenchmarkStrategy, null, 2).slice(0, 5000) : '',
      '',
      '【结构化上下文包】',
      JSON.stringify(contextPackage, null, 2).slice(0, 12000),
      '',
      '【参考迁移计划】',
      JSON.stringify(migrationPlan || {}, null, 2).slice(0, 5000),
      '',
      '【段落级写作要求】',
      '1. 严格按 scene_cards 顺序生成，每个场景至少 3-8 个自然段。',
      '2. 每个场景必须完成 purpose、conflict、required_beats、required_information、turning_point 和 exit_state；不能只写气氛、设定说明或心理总结。',
      '2A. 每个场景必须把 opening_hook、reader_payoff、fear_point、rule_pressure、information_gap、reversal、ending_hook_seed、character_voice 中已有的商业意图落实到正文里；这些字段不是备注，必须转成动作、对话、危险、反转或章末疑问。',
      '2A+. 如果存在 chapter_target.previous_handoff 或 continuity.previous_chapter，开篇前 300 字必须承接上一章最后一幕或章末钩子，先处理连续危机、角色反应和期待欠账，再展开新的场景信息。',
      '2A++. 执行 chapter_target.delivery_risk_carry_over：上一章交稿后残留的吸引力、追读、创新、故事力、剧情线、强场面或可读性风险，必须在本章变成可见修复动作；尤其优先级指向开篇或章末时，必须在前 300 字或最后 300 字落地。',
      '2B. 执行 chapter_target.reader_retention_brief：开篇钩子必须在前 300 字落地；爽点承诺、信息缺口、情绪回报和短剧化场面必须转成可见行动；章末追读问题必须压到最后一幕。',
      '2B+. 执行 chapter_target.reader_expectation_ledger：must_deliver 是本章必须还给读者的期待账，必须写成可见事件、冲突结果、情绪回报或章末钩子；keep_alive 可以保留但不能遗忘或矛盾改写。',
      '2B++. 执行 reader_expectation_debt_context：must_carry 来自上一章或最近章节的期待欠账，本章必须给可见推进；keep_alive 是继续悬念，必须保持存在感，不得被正文遗忘、反向改写或突然换线。',
      '2C. 执行 chapter_target.innovation_brief：本章必须有可见的创新执行点；把 chapter_angle 写成选择、规则、机制、反差或场面，不得写成普通套路章；ip_adaptation_hooks 要尽量落成可视化场面。',
      '2C+. 执行 chapter_target.signature_scene_brief：如果存在 signature_scene，必须把它写成本章最可被读者记住、可短剧/漫剧化的空间冲突、反转动作、规则压迫或视觉化爽点；scene_repair_target、reader_payoff、storyline_service 都必须在正文中可见。',
      '2C++. 执行 chapter_target.character_arc_brief：人物成长必须落成角色欲望驱动、缺陷受压、关系变化、成长节点或口吻锚点；如果有 forbidden_reveal，不得提前写穿，只能通过误解、遮挡、试探或代价保持边界。',
      '2D. 执行 chapter_target.first30_retention_brief：如果当前章在前30章诊断中有风险，必须补强 flags 和 required_actions 指向的留存问题，尤其是章末钩子弱、爽点/悬念信号少、目标不清和缺正文。',
      '2D+. 执行 chapter_target.reader_drop_risk_brief：正文必须针对弃读点设计开篇抓手、中段反转/行动推进和章末翻页问题；任何 drop_points 中指出的风险都必须用可见事件、对话冲突、信息增量或读者回报修复。',
      '2D++. 执行 chapter_target.story_pressure_brief：本章必须补足压力源、冲突升级、赌注升级和反转逼迫；至少一个场景要让主角付出代价、被迫选择、暴露风险、遭遇反制或得到新的未解问题。',
      '2D+++. 执行 chapter_target.story_drive_brief：必须写出主角主动选择、选择代价、状态变化和下一步因果；主角不能只是旁观、听解释或被事件推着走。',
      '2D++++. 执行 chapter_target.serial_rhythm_brief：前 300 字必须有开篇钩子；每 800-1200 字至少给一次信息增量、冲突转折、爽点兑现、能力展示、关系变化或小回收；每个场景必须兑现 scene_payoff_budget；章末必须压出追读问题。',
      '2D+++++. 执行 chapter_target.page_turn_hook_brief：最后 300 字必须有可见触发、读者问题和下一章拉力；禁提前解答项不得在本章说明完；结尾不能用“拉开序幕”等模板总结替代现场钩子。',
      '2D++++++. 执行 chapter_target.volume_climax_brief：本章只兑现 current_chapter_role、required_beats 和 climax_promise；不得提前消费 forbidden_payoff 中的卷末爆点、身份答案、终局反转或后续大回报。',
      '2D+++++++. 执行 chapter_target.recent_fatigue_brief：如果近10章存在疲劳风险，本章必须至少更换一项冲突来源、回报形态、章末问题或可视化场面；禁止继续复制最近章节的同类压迫、同类打脸和同类钩子。',
      '3. 如果 scene_type 是 action/combat/chase，必须逐条落实 action_beats：写出动作起手、空间位置、对手反应、受伤/损耗/暴露信息、反制动作和结果。战斗不能一笔带过。',
      '4. 段落预算：动作/冲突场景中可见行动与直接反应不少于 60%；环境描写最多 15%；心理描写最多 20%；解释性信息最多 15%。',
      '5. 禁止连续 2 段纯环境描写；每 3-5 段必须出现一次可见行动、选择、信息变化或关系变化。',
      '6. description_budget=low 的场景只允许 1-2 句环境描写；medium 最多 1 个短段；high 也必须服务危险、规则或动作空间。',
      '7. 场景之间必须有过渡，不能硬切。',
      '8. 保持 style_lock 中的人称、句长、对话比例、吐槽密度、爽点密度、描写浓度和禁用词约束。',
      '9. 只能学习参考作品的节奏、结构、爽点安排和信息密度；不得复制具体桥段、专有设定、原句、角色名和核心梗。',
      '10. 执行 setting_context：required 设定必须在正文中落地；forbidden 设定不得泄漏；ability_beats 必须写清代价/限制；item_beats 必须符合物品归属和位置；boss_move 必须符合 Boss 行动逻辑；rule_trigger 必须写出触发条件、代价和后果；角色只能知道 knowledge_scope 允许的信息。',
      '11. 执行 chapter_target.meme_strategy：网感只作为吐槽节奏、情绪共鸣、角色口吻或传播点；死亡、高压恐怖和关键情绪爆点处不得玩梗；不得直接复刻 meme_bank 的 unsafe_direct_phrases。',
      '12. 执行 chapter_target.style_sample_strategy：按 applicable_scenes / avoid_scenes 选择样章策略；只学习叙述节奏、句式密度、对白比例和情绪转折；do_not_copy 与 unsafe_direct_phrases 中的原句不能照搬。',
      '12A. 执行 chapter_target.chapter_benchmark_strategy：只学习开篇钩子、场景节拍、冲突升级、爽点兑现、对白推进、场面可视化和章末追读结构；不得复制样例桥段、角色名、专有设定和原句。',
      '13. 执行长篇作品罗盘：读者承诺、核心矛盾、创新卖点、长期爽点循环和结局方向不得漂移；新增人物、物品、支线或地图必须落在可调整区内。',
      '13A. 执行 chapter_target.chapter_launch_gate：读者承诺、本章目标、核心冲突、主线服务、读者回报、章末钩子必须在正文中可见落地；如果门禁信号为 warn/block，不得忽略，必须优先补成可见事件、选择、冲突结果或章末问题。',
      '13A+. 执行 chapter_target.core_contract_radar：必须服务 must_serve 中的全书核心承诺、核心矛盾、创新卖点和读者回报；不得漂移 no_drift 中的红线；repair_focus 不能只靠解释，要落成正文中的冲突结果、规则判定、角色选择或章末钩子。',
      '13A++. 执行 chapter_target.governance_recheck_memory：上一轮治理复查的修后证据和观察项必须进入本章任务执行；evidence 写成正文可见继承，failed_evidence 优先补救，watch_items 保持观察并避免再次失效。',
      '13B. 执行 chapter_target.longform_battle_context：核心守恒、读者拉力、剧情线调度、卷级爆点、创新/IP场面和生产燃料中的风险项必须在本章有可见承接；blocked/warn 风险优先于普通铺垫，不能写成空泛解释。',
      '14. 执行本批连载任务书：本章只完成 current_chapter_role 和本章读者回报；可以铺垫下一章，但不得提前解决 next_batch_brief.chapters 后续章节的冲突或钩子。',
      '14A. 执行 chapter_target.batch_preflight：如果安全连写预执行门禁提示近10章疲劳或批次风险，本章必须在冲突来源、回报形态、章末问题、可视化场面中至少改造一项；被 blocked_chapter_nos 拦截的后续章节内容不得提前写进本章。',
      expansionStructureDecision ? '14A0. 执行 next_batch_brief.expansion_structure_decision：按结构修复有效性决定本批写法；恢复5章时仍逐章落实段位职责，小批验证时逐章证明观察指标，单章重构时先重写批次设计原则后再推进正文。' : '',
      defaultFiveChapterLaneRedesign ? '14A0+. 默认5章档位结构重构：因连续恢复判定失效，本章必须输出可被后续5章复用的段位职责、冲突轮换、回报密度和章末追读模板；正文场景必须先证明这个模板能守住核心、回报和追读。' : '',
      expansionStructureVerification ? '14A+. 执行 next_batch_brief.expansion_structure_verification：本章必须承担验证批中的结构职责，换冲突来源、给显性回报、留不同章末追读问题；不得把已修复的扩批热区再次写成中段转场或空铺垫。' : '',
      '14A++. 执行 batch_preflight.longform_memory_anchor：批量续写时必须遵守压缩正史锚点，不能改变角色状态、遗忘开放悬念、跳过回报债务或偏离核心承诺。',
      '14A+++. 执行 batch_preflight.delivery_risk_carry_over：安全连写第一章必须优先承接上一章残留风险；opening_actions 在前 300 字落地，middle_actions 在中段转成事件推进，ending_actions 在最后 300 字形成追读钩子。',
      '14A++++. 执行 batch_preflight.chapter_handoff_contract：安全连写第一章必须承接上一章最后一幕、开篇义务和读者期待债；must_deliver 写成可见回报，keep_alive 保持存在感，overdue 优先推进。',
      '14A+++++. 执行 chapter_target.longform_memory_capsule：单章开写也必须召回压缩正史，角色状态、开放悬念、回报债务、正史事实和 red_lines 不得遗忘、矛盾改写或跳过。',
      '14B. 执行 chapter_target.million_word_runway：正文必须可见回答本章四问，守住 redLines，不丢 readerFuel；如果航线为 single_chapter 或 blocked，只写当前章可兑现内容，不得预支后续章节主线回收。',
      '14C. 执行 chapter_target.story_unit_context：正文必须完成当前剧情单元的 current_chapter_role；只推进本章职责需要的 pressure_escalation、setup_and_storyline 和 reader payoff，不得提前写完 mini_climax_payoff、exit_hook 或 forbidden_advance 标注的后续兑现。',
      '15. 如果参考迁移计划包含 transferable_model，只能采用其中 allowed_learning 的抽象功能；rewrite_requirements 必须执行；copy_guard_terms 和 forbidden_transfer 禁止出现在正文里。',
      migrationPlan?.generation_prompt_addendum ? `16. ${migrationPlan.generation_prompt_addendum}` : '',
      chapterDraft?.chapter_no ? `17. 本次只生成第${chapterDraft.chapter_no}章，不得输出其他章节或续章内容。` : '',
      '',
      expansionStructureDecision ? '输出附加要求：如果存在 next_batch_brief.expansion_structure_decision，scene_breakdown 的相关场景必须包含 expansion_structure_decision_execution，用 segment_role_delivered、observation_metrics_delivered、redesign_principles_delivered 和 evidence 说明是否真正执行。' : '',
      '输出 JSON，包含 prose_chapters 数组。数组只能有一项，且必须包含 chapter_no, title, chapter_text, scene_breakdown, continuity_notes。scene_breakdown 要回填每个场景的 scene_type、required_beats/action_beats 完成情况和 description_budget 执行情况。chapter_text 是完整正文，不要 markdown 标题。',
    ].filter(Boolean).join('\n')
  }

  const buildStoryStatePrompt = (project: any, contextPackage: any, chapterText: string) => [
    '任务：从刚入库的章节正文中提取故事状态机增量，用于后续章节续写。只提取事实，不要推测。',
    '重点：角色状态必须是“全状态增量”，用于防止后续章节出现年龄、外貌、能力、持有物、认知范围、位置和伤势漂移。',
    `作品标题：${project.title}`,
    '',
    '【生成上下文】',
    JSON.stringify(contextPackage, null, 2).slice(0, 6000),
    '',
    '【章节正文】',
    chapterText.slice(0, 14000),
    '',
    '输出 JSON，字段：',
    'state_delta: {timeline, current_time, active_locations, character_positions, character_relationships, relationship_graph, known_secrets, secret_visibility, item_ownership, resource_status, foreshadowing_status, payoff_queue, mainline_progress, volume_progress, unresolved_conflicts, open_questions, recent_repeated_information, next_chapter_priorities}',
    'character_updates: array，每项包含 name,current_state。current_state 可包含 age, location, physical_condition, appearance_delta, outfit, items, item_changes, ability_status, resource_status, emotional_state, relationship_attitudes, knowledge_scope, newly_learned, information_boundaries, secrets_known, injuries, goals, next_intent, last_seen_chapter。',
    'setting_updates: array，每项包含 entity_id 或 name, entity_type, state_delta, actual_state_change。用于更新设定工坊里的境界、能力、物品、Boss、规则、伏笔、地点、时间线等状态。',
    'storyline_updates: array，每项包含 entity_id 或 name, entity_type, actual_state_change, summary。只输出正文明确推进、埋线、回收或触碰的剧情线，entity_type 只能是 mainline/subplot/character_arc/relationship_arc/faction_arc/foreshadowing_arc。',
    'discovered_assets: array，每项包含 entity_type,name,summary,evidence,source_excerpt,first_chapter_no,constraints_json,state_json。只收录正文中新出现且应纳入长期管理的资产，entity_type 只能是 character/item/ability/faction/location/foreshadowing。',
    'ip_scene_candidates: array，每项包含 title,summary,visual_hook,adaptation_value,spread_point,evidence,source_excerpt,tags。只收录正文已经写出来、可视化强、适合短剧/漫剧/IP改编或评论区传播的标志性场面；普通过场、纯解释和没有画面冲突的片段不要收录。',
    '只写正文明确出现或可由本章直接确定的状态；不知道就不要补。',
    'next_chapter_priorities: array',
    '只返回 JSON。',
  ].join('\n')

  const mergeStoryState = (prev: any, delta: any, chapter: any) => ({
    ...(prev || {}),
    ...(delta || {}),
    character_positions: { ...((prev || {}).character_positions || {}), ...((delta || {}).character_positions || {}) },
    character_relationships: { ...((prev || {}).character_relationships || {}), ...((delta || {}).character_relationships || {}) },
    relationship_graph: { ...((prev || {}).relationship_graph || {}), ...((delta || {}).relationship_graph || {}) },
    known_secrets: { ...((prev || {}).known_secrets || {}), ...((delta || {}).known_secrets || {}) },
    secret_visibility: { ...((prev || {}).secret_visibility || {}), ...((delta || {}).secret_visibility || {}) },
    item_ownership: { ...((prev || {}).item_ownership || {}), ...((delta || {}).item_ownership || {}) },
    resource_status: { ...((prev || {}).resource_status || {}), ...((delta || {}).resource_status || {}) },
    foreshadowing_status: { ...((prev || {}).foreshadowing_status || {}), ...((delta || {}).foreshadowing_status || {}) },
    payoff_queue: asArray((delta || {}).payoff_queue).length ? asArray((delta || {}).payoff_queue) : asArray((prev || {}).payoff_queue),
    active_locations: asArray((delta || {}).active_locations).length ? asArray((delta || {}).active_locations) : asArray((prev || {}).active_locations),
    open_questions: asArray((delta || {}).open_questions).length ? asArray((delta || {}).open_questions) : asArray((prev || {}).open_questions),
    next_chapter_priorities: asArray((delta || {}).next_chapter_priorities).length ? asArray((delta || {}).next_chapter_priorities) : asArray((prev || {}).next_chapter_priorities),
    last_updated_chapter: chapter.chapter_no,
    last_updated_at: new Date().toISOString(),
  })

  const updateStoryStateMachine = async (activeWorkspace: string, project: any, chapter: any, contextPackage: any, chapterText: string, modelId?: number) => {
    const stageModelId = ctx.production.getStageModelId(project, 'review', modelId)
    const result = await executeNovelAgent('review-agent', project, {
      task: buildStoryStatePrompt(project, contextPackage, chapterText),
    }, { activeWorkspace, modelId: stageModelId ? String(stageModelId) : undefined, maxTokens: 2500, temperature: ctx.production.getStageTemperature(project, 'review', 0.15), skipMemory: true })
    const payload = getNovelPayload(result)
    const stateDelta = payload?.state_delta || {}
    const nextReferenceConfig = {
      ...(project.reference_config || {}),
      story_state: mergeStoryState(project.reference_config?.story_state || {}, stateDelta, chapter),
    }
    await updateNovelProject(activeWorkspace, project.id, { reference_config: nextReferenceConfig } as any)
    const characterUpdates = Array.isArray(payload?.character_updates) ? payload.character_updates : []
    if (characterUpdates.length > 0) {
      const characters = await listNovelCharacters(activeWorkspace, project.id)
      for (const update of characterUpdates) {
        const name = String(update?.name || '').trim()
        if (!name) continue
        const character = characters.find(item => item.name === name)
        if (!character) continue
        await updateNovelCharacter(activeWorkspace, character.id, {
          current_state: {
            ...(character.current_state || {}),
            ...(update.current_state || {}),
            last_seen_chapter: chapter.chapter_no,
          },
        } as any)
      }
    }
    const settingUpdates = Array.isArray(payload?.setting_updates) ? payload.setting_updates : []
    if (settingUpdates.length > 0) {
      const settings = await listNovelSettingEntities(activeWorkspace, project.id)
      const usages = await listNovelChapterSettingUsage(activeWorkspace, project.id, chapter.id)
      for (const update of settingUpdates) {
        const entityId = Number(update?.entity_id || 0)
        const name = String(update?.name || '').trim()
        const entity = settings.find(item => (entityId && item.id === entityId) || (!!name && item.name === name && (!update?.entity_type || item.entity_type === update.entity_type)))
        if (!entity) continue
        const stateDelta = update.state_delta || update.actual_state_change || {}
        await updateNovelSettingEntity(activeWorkspace, entity.id, {
          state_json: {
            ...(entity.state_json || {}),
            ...(stateDelta || {}),
            last_seen_chapter: chapter.chapter_no,
          },
        } as any)
        const usage = usages.find(item => item.entity_id === entity.id)
        if (usage) {
          await updateNovelChapterSettingUsage(activeWorkspace, usage.id, {
            actual_state_change: {
              ...(usage.actual_state_change || {}),
              ...(update.actual_state_change || stateDelta || {}),
            },
          } as any)
        }
      }
    }
    const storylineUpdates = Array.isArray(payload?.storyline_updates) ? payload.storyline_updates : []
    const storylineSync = buildStorylineSyncReport(contextPackage, storylineUpdates)
    if (storylineUpdates.length > 0) {
      const settings = await listNovelSettingEntities(activeWorkspace, project.id)
      const usages = await listNovelChapterSettingUsage(activeWorkspace, project.id, chapter.id)
      for (const update of storylineUpdates) {
        const entityId = Number(update?.entity_id || 0)
        const name = String(update?.name || '').trim()
        const entity = settings.find(item => STORYLINE_TYPES.includes(item.entity_type) && ((entityId && item.id === entityId) || (!!name && item.name === name)))
        if (!entity) continue
        const stateDelta = update.state_delta || update.actual_state_change || {}
        if (!stateDelta || typeof stateDelta !== 'object' || Array.isArray(stateDelta)) continue
        await updateNovelSettingEntity(activeWorkspace, entity.id, {
          state_json: {
            ...(entity.state_json || {}),
            ...(stateDelta || {}),
            last_seen_chapter: chapter.chapter_no,
            last_checked_chapter_id: chapter.id,
            last_checked_chapter_no: chapter.chapter_no,
          },
        } as any)
        const usage = usages.find(item => item.entity_id === entity.id)
        if (usage) {
          await updateNovelChapterSettingUsage(activeWorkspace, usage.id, {
            actual_state_change: {
              ...(usage.actual_state_change || {}),
              ...(update.actual_state_change || stateDelta || {}),
            },
          } as any)
        }
      }
    }
    const [assetCharacters, assetSettings] = await Promise.all([
      listNovelCharacters(activeWorkspace, project.id),
      listNovelSettingEntities(activeWorkspace, project.id),
    ])
    const discoveredAssets = normalizeDiscoveredAssets(
      Array.isArray(payload?.discovered_assets) ? payload.discovered_assets : [],
      { existingCharacters: assetCharacters, existingSettings: assetSettings, chapter },
    )
    if (discoveredAssets.length > 0) {
      await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'asset_intake',
        status: 'pending',
        summary: `发现 ${discoveredAssets.length} 个新资产待确认`,
        issues: discoveredAssets.map((item: any) => `${item.entity_type}：${item.name}`),
        payload: JSON.stringify({
          chapter_id: chapter.id,
          chapter_no: chapter.chapter_no,
          discovered_assets: discoveredAssets,
          applied_asset_names: [],
        }),
      })
    }
    payload.asset_intake = { discovered_assets: discoveredAssets }
    const ipSceneCandidates = normalizeIpSceneCandidates(
      Array.isArray(payload?.ip_scene_candidates) ? payload.ip_scene_candidates : [],
      chapter,
    )
    if (ipSceneCandidates.length > 0) {
      await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'ip_scene_intake',
        status: 'ok',
        summary: `沉淀 ${ipSceneCandidates.length} 个 IP 场面候选`,
        issues: ipSceneCandidates.map((item: any) => item.title),
        payload: JSON.stringify({
          chapter_id: chapter.id,
          chapter_no: chapter.chapter_no,
          ip_scene_candidates: ipSceneCandidates,
        }),
      })
    }
    payload.ip_scene_intake = { ip_scene_candidates: ipSceneCandidates }
    const signatureSceneSync = buildSignatureSceneSyncReport(project, chapter, contextPackage, chapterText)
    if (Number(signatureSceneSync.planned_count || 0) > 0) {
      await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'signature_scene_sync',
        status: signatureSceneSync.status === 'ok' ? 'ok' : 'warn',
        summary: `${signatureSceneSync.label}：${signatureSceneSync.summary}`,
        issues: signatureSceneSync.missed.map((item: any) => `未兑现：${item.label}｜${item.text}`).slice(0, 20),
        payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, signature_scene_sync: signatureSceneSync }),
      })
    }
    payload.signature_scene_sync = signatureSceneSync
    await createNovelReview(activeWorkspace, {
      project_id: project.id,
      review_type: 'storyline_sync',
      status: storylineSync.status === 'warn' ? 'warn' : 'ok',
      summary: storylineSync.status === 'warn'
        ? `剧情线同步存在风险：漏推 ${storylineSync.missed.length}，额外推进 ${storylineSync.unplanned.length}，禁揭风险 ${storylineSync.forbidden_touched.length}`
        : '剧情线同步完成，无明显计划偏差',
      issues: [
        ...storylineSync.missed.map((item: any) => `漏推：${item.name}`),
        ...storylineSync.unplanned.map((item: any) => `额外推进：${item.name}`),
        ...storylineSync.forbidden_touched.map((item: any) => `禁揭风险：${item.name}`),
      ],
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, storyline_sync: storylineSync }),
    })
    payload.storyline_sync = storylineSync
    const storyUnitSync = buildStoryUnitSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, {
      project_id: project.id,
      review_type: 'story_unit_sync',
      status: storyUnitSync.status === 'ok' ? 'ok' : 'warn',
      summary: `${storyUnitSync.label}：${storyUnitSync.summary}`,
      issues: [
        ...storyUnitSync.missed.map((item: any) => `单元漏写：${item.label}｜${item.text}`),
        ...storyUnitSync.rushed_ahead.map((item: any) => `单元抢跑：${item.label}｜${item.text}`),
        ...storyUnitSync.forbidden_touched.map((item: any) => `禁抢跑：${item.label}｜${item.text}`),
      ].slice(0, 20),
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, story_unit_sync: storyUnitSync }),
    })
    payload.story_unit_sync = storyUnitSync
    const coreDrift = buildChapterCoreDriftReport(project, chapter, contextPackage, chapterText, storylineSync)
    await createNovelReview(activeWorkspace, {
      project_id: project.id,
      review_type: 'chapter_core_drift',
      status: coreDrift.status === 'ok' ? 'ok' : 'warn',
      summary: `${coreDrift.label}：${coreDrift.summary}`,
      issues: coreDrift.drift_risks.slice(0, 20),
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, core_drift: coreDrift }),
    })
    payload.core_drift = coreDrift
    const readerPayoffSync = buildReaderPayoffSyncReport(project, chapter, contextPackage, chapterText, payload)
    await createNovelReview(activeWorkspace, {
      project_id: project.id,
      review_type: 'reader_payoff_sync',
      status: readerPayoffSync.status === 'ok' ? 'ok' : 'warn',
      summary: `${readerPayoffSync.label}：${readerPayoffSync.summary}`,
      issues: [
        ...readerPayoffSync.missed.map((item: any) => `未兑现：${item.text}`),
        ...readerPayoffSync.debts.map((item: any) => `待回收：${item.text}`),
      ].slice(0, 20),
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, reader_payoff_sync: readerPayoffSync }),
    })
    payload.reader_payoff_sync = readerPayoffSync
    const readerExpectationSync = buildReaderExpectationSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, {
      project_id: project.id,
      review_type: 'reader_expectation_sync',
      status: readerExpectationSync.status === 'ok' ? 'ok' : 'warn',
      summary: `${readerExpectationSync.label}：${readerExpectationSync.summary}`,
      issues: readerExpectationSync.missed.map((item: any) => `未兑现：${item.label}｜${item.text}`).slice(0, 20),
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, reader_expectation_sync: readerExpectationSync }),
    })
    payload.reader_expectation_sync = readerExpectationSync
    const readerRetentionSync = buildReaderRetentionSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, {
      project_id: project.id,
      review_type: 'reader_retention_sync',
      status: readerRetentionSync.status === 'ok' ? 'ok' : 'warn',
      summary: `${readerRetentionSync.label}：${readerRetentionSync.summary}`,
      issues: readerRetentionSync.missed.map((item: any) => `未兑现：${item.label}｜${item.text}`).slice(0, 20),
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, reader_retention_sync: readerRetentionSync }),
    })
    payload.reader_retention_sync = readerRetentionSync
    const chapterAttractionReview = buildChapterAttractionReviewReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, {
      project_id: project.id,
      review_type: 'chapter_attraction_review',
      status: chapterAttractionReview.status === 'ok' ? 'ok' : 'warn',
      summary: `${chapterAttractionReview.label}：${chapterAttractionReview.summary}`,
      issues: chapterAttractionReview.weak_dimensions.map((item: any) => `${item.label}｜${item.issue}`).slice(0, 20),
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, chapter_attraction_review: chapterAttractionReview }),
    })
    payload.chapter_attraction_review = chapterAttractionReview
    const storyDriveSync = buildStoryDriveSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, {
      project_id: project.id,
      review_type: 'story_drive_sync',
      status: storyDriveSync.status === 'ok' ? 'ok' : 'warn',
      summary: `${storyDriveSync.label}：${storyDriveSync.summary}`,
      issues: storyDriveSync.missed.map((item: any) => `故事力缺口：${item.label}｜${item.text || item.expected}`).slice(0, 20),
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, story_drive_sync: storyDriveSync }),
    })
    payload.story_drive_sync = storyDriveSync
    const characterArcSync = buildCharacterArcSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, {
      project_id: project.id,
      review_type: 'character_arc_sync',
      status: characterArcSync.status === 'ok' ? 'ok' : 'warn',
      summary: `${characterArcSync.label}：${characterArcSync.summary}`,
      issues: characterArcSync.missed.map((item: any) => `人物弧光缺口：${item.label}｜${item.text || item.expected}`).slice(0, 20),
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, character_arc_sync: characterArcSync }),
    })
    payload.character_arc_sync = characterArcSync
    const chapterBenchmarkSync = buildChapterBenchmarkSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, {
      project_id: project.id,
      review_type: 'chapter_benchmark_sync',
      status: chapterBenchmarkSync.status === 'ok' ? 'ok' : 'warn',
      summary: `${chapterBenchmarkSync.label}：${chapterBenchmarkSync.summary}`,
      issues: chapterBenchmarkSync.missed.map((item: any) => `未达标：${item.label}｜${item.text}`).slice(0, 20),
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, chapter_benchmark_sync: chapterBenchmarkSync }),
    })
    payload.chapter_benchmark_sync = chapterBenchmarkSync
    const styleSampleSync = buildStyleSampleSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, {
      project_id: project.id,
      review_type: 'style_sample_sync',
      status: styleSampleSync.status === 'ok' ? 'ok' : 'warn',
      summary: `${styleSampleSync.label}：${styleSampleSync.summary}`,
      issues: [
        ...styleSampleSync.missed.map((item: any) => `风格缺口：${item.label}｜${item.text}`),
        ...styleSampleSync.copied_phrases.map((item: any) => `照搬风险：${item}`),
      ].slice(0, 20),
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, style_sample_sync: styleSampleSync }),
    })
    payload.style_sample_sync = styleSampleSync
    const innovationSync = buildInnovationSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, {
      project_id: project.id,
      review_type: 'innovation_sync',
      status: innovationSync.status === 'ok' ? 'ok' : 'warn',
      summary: `${innovationSync.label}：${innovationSync.summary}`,
      issues: innovationSync.missed.map((item: any) => `未兑现：${item.label}｜${item.text}`).slice(0, 20),
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, innovation_sync: innovationSync }),
    })
    payload.innovation_sync = innovationSync
    const volumeBeatSync = buildVolumeBeatSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, {
      project_id: project.id,
      review_type: 'volume_beat_sync',
      status: volumeBeatSync.status === 'ok' ? 'ok' : 'warn',
      summary: `${volumeBeatSync.label}：${volumeBeatSync.summary}`,
      issues: volumeBeatSync.missed.map((item: any) => `未兑现：${item.label}｜${item.text}`).slice(0, 20),
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, volume_beat_sync: volumeBeatSync }),
    })
    payload.volume_beat_sync = volumeBeatSync
    const runwaySync = buildRunwaySyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, {
      project_id: project.id,
      review_type: 'runway_sync',
      status: runwaySync.status === 'ok' ? 'ok' : 'warn',
      summary: `${runwaySync.label}：${runwaySync.summary}`,
      issues: [
        ...runwaySync.four_question_missed.map((item: any) => `四问未兑现：${item.label}｜${item.text}`),
        ...runwaySync.reader_fuel_missed.map((item: any) => `读者燃料未兑现：${item.text}`),
        ...runwaySync.redline_touched.map((item: any) => `触碰红线：${item.text}`),
      ].slice(0, 20),
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, runway_sync: runwaySync }),
    })
    payload.runway_sync = runwaySync
    await createNovelReview(activeWorkspace, {
      project_id: project.id,
      review_type: 'story_state',
      status: 'ok',
      summary: `故事状态已更新至第${chapter.chapter_no}章`,
      issues: [],
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, ...payload }),
    })
    return payload
  }

  const buildWritingBible = (project: any, worldbuilding: any[], characters: any[], outlines: any[], reviews: any[] = []) => {
    const storyState = getStoryState(project)
    const styleLock = getStyleLock(project)
    const safety = getSafetyPolicy(project)
    const masterOutline = outlines.find(outline => outline.outline_type === 'master') || null
    const volumePlan = getVolumePlan(outlines)
    return {
      project: {
        title: project.title,
        genre: project.genre || '',
        synopsis: project.synopsis || '',
        target_audience: project.target_audience || '',
        style_tags: project.style_tags || [],
        length_target: project.length_target || '',
      },
      promise: masterOutline?.summary || project.synopsis || '',
      world_rules: worldbuilding[0]?.rules || [],
      world_summary: worldbuilding[0]?.world_summary || '',
      mainline: masterOutline ? {
        title: masterOutline.title,
        hook: masterOutline.hook || '',
        conflict_points: masterOutline.conflict_points || [],
        turning_points: masterOutline.turning_points || [],
      } : null,
      volume_plan: volumePlan,
      characters: characters.map(char => ({
        name: char.name,
        role: char.role_type || char.role || '',
        goal: char.goal || '',
        motivation: char.motivation || '',
        conflict: char.conflict || '',
        growth_arc: char.growth_arc || '',
        current_state: char.current_state || {},
      })),
      style_lock: styleLock,
      safety_policy: safety,
      story_state: storyState,
      latest_state_entries: collectRecentFacts(reviews),
      forbidden: safety.forbidden,
      preferred_words: styleLock.preferred_words || [],
      banned_words: styleLock.banned_words || [],
      meme_bank: normalizeMemeBank(project.reference_config?.meme_bank || []),
      updated_at: new Date().toISOString(),
    }
  }

  const hasMeaningfulWritingBible = (value: any) => {
    if (!value || typeof value !== 'object') return false
    return Boolean(
      String(value.promise || value.world_summary || '').trim() ||
      (Array.isArray(value.world_rules) && value.world_rules.length > 0) ||
      (Array.isArray(value.volume_plan) && value.volume_plan.length > 0) ||
      (Array.isArray(value.characters) && value.characters.length > 0) ||
      (value.mainline && Object.keys(value.mainline || {}).length > 0) ||
      (value.style_lock && Object.values(value.style_lock || {}).some(item => Array.isArray(item) ? item.length > 0 : Boolean(String(item || '').trim())))
    )
  }

  const getStoredOrBuiltWritingBible = async (activeWorkspace: string, project: any) => {
    const [worldbuilding, characters, outlines, reviews] = await Promise.all([
      listNovelWorldbuilding(activeWorkspace, project.id),
      listNovelCharacters(activeWorkspace, project.id),
      listNovelOutlines(activeWorkspace, project.id),
      listNovelReviews(activeWorkspace, project.id),
    ])
    const stored = project.reference_config?.writing_bible
    return hasMeaningfulWritingBible(stored) ? stored : buildWritingBible(project, worldbuilding, characters, outlines, reviews)
  }

  const buildChapterContextPackage = async (
    activeWorkspace: string,
    project: any,
    chapter: any,
    chapters: any[],
    worldbuilding: any[],
    characters: any[],
    outlines: any[],
    reviews: any[] = [],
  ) => {
    const sorted = [...chapters].sort((a, b) => a.chapter_no - b.chapter_no)
    const previousChapter = sorted.filter(ch => ch.chapter_no < chapter.chapter_no).slice(-1)[0] || null
    const previousProseChapters = sorted
      .filter(ch => ch.chapter_no < chapter.chapter_no && ch.chapter_text)
      .slice(-3)
      .map(ch => ({
        chapter_no: ch.chapter_no,
        title: ch.title,
        chapter_summary: ch.chapter_summary || compactText(ch.chapter_text, 240),
        ending_hook: ch.ending_hook || '',
        ending_excerpt: String(ch.chapter_text || '').slice(-800),
      }))
    let referencePreview: any = null
    try {
      referencePreview = await previewNovelKnowledgeInjection(project, '正文创作')
    } catch {
      referencePreview = null
    }
    const sceneCards = Array.isArray(chapter.scene_list) && chapter.scene_list.length
      ? chapter.scene_list
      : (Array.isArray(chapter.scene_breakdown) ? chapter.scene_breakdown : [])
    const preflight = buildPreflightChecks(project, chapter, previousChapter, worldbuilding, characters, sceneCards, referencePreview, reviews)
    const wordTarget = resolveChapterWordTarget(project, chapter, {})
    const styleLock = { ...getStyleLock(project), chapter_word_range: wordTarget.rangeText }
    const safetyPolicy = getSafetyPolicy(project)
    const writingBible = project.reference_config?.writing_bible || buildWritingBible(project, worldbuilding, characters, outlines, reviews)
    const memeBank = resolveMemeBank(project, { writing_bible: writingBible })
    const styleSampleBank = resolveStyleSampleBank(project, { writing_bible: writingBible })
    const styleSampleEffectiveness = buildStyleSampleEffectivenessForSelection(styleSampleBank, sorted, reviews)
    const first30RetentionContext = buildFirst30RetentionContext(chapter, reviews)
    const readerExpectationDebtContext = buildReaderExpectationDebtContext(chapter, sorted, reviews)
    const deliveryRiskCarryOverContext = buildDeliveryRiskCarryOverContext(chapter, sorted, reviews)
    const storyUnitContext = buildStoryUnitContext(chapter, sorted, outlines)
    const previousHandoff = buildPreviousChapterHandoff({
      chapter_target: chapter.raw_payload?.pre_draft_brief || {},
      continuity: {
        previous_chapter: previousChapter ? {
          chapter_no: previousChapter.chapter_no,
          title: previousChapter.title,
          ending_hook: previousChapter.ending_hook || '',
          ending_excerpt: String(previousChapter.chapter_text || '').slice(-800),
        } : null,
      },
    })
    const fallbackCompass = normalizeLongformCompass({
      reader_promise: writingBible.reader_promise || writingBible.promise || writingBible.core_selling_point || project.synopsis,
      core_conflict: writingBible.core_conflict || writingBible.mainline?.core_conflict,
      innovation_hook: writingBible.innovation_hook || writingBible.core_selling_point,
      payoff_loop: writingBible.payoff_loop || writingBible.style_lock?.payoff_density || writingBible.payoff_density,
      ending_direction: writingBible.ending_direction || writingBible.mainline?.ending_direction,
    })
    const longformCompass = latestLongformCompassFromReviews(reviews) || fallbackCompass
    const longformMemoryCapsule = buildLongformMemoryCapsule(project, writingBible)
    const [settingEntities, storedChapterSettingUsage] = await Promise.all([
      listNovelSettingEntities(activeWorkspace, project.id).catch(() => []),
      listNovelChapterSettingUsage(activeWorkspace, project.id, chapter.id).catch(() => []),
    ])
    let chapterSettingUsage = storedChapterSettingUsage
    let settingUsageAutoMatched = false
    if (chapterSettingUsage.length === 0 && settingEntities.length > 0) {
      const suggestedUsage = buildHeuristicSettingUsage(chapter, settingEntities)
      if (suggestedUsage.length > 0) {
        chapterSettingUsage = await replaceNovelChapterSettingUsage(activeWorkspace, project.id, chapter.id, suggestedUsage as any).catch(() => suggestedUsage as any)
        settingUsageAutoMatched = true
      }
    }
    const usageEntityIds = new Set(chapterSettingUsage.map((item: any) => Number(item.entity_id || 0)).filter(Boolean))
    const relatedSettings = settingEntities.filter((item: any) => {
      const first = Number(item.first_chapter_no || 0)
      const last = Number(item.last_chapter_no || 0)
      return usageEntityIds.has(item.id)
        || asArray(item.related_chapter_ids).map(Number).includes(Number(chapter.id))
        || (first > 0 && Number(chapter.chapter_no) >= first && (!last || Number(chapter.chapter_no) <= last))
    })
    const settingById = new Map(settingEntities.map((item: any) => [Number(item.id), item]))
    const settingContext = {
      entities: relatedSettings.map((item: any) => ({
        id: item.id,
        type: item.entity_type,
        name: item.name,
        summary: item.summary || '',
        status: item.status || 'active',
        visibility: item.visibility || 'public',
        constraints: item.constraints_json || {},
        state: item.state_json || {},
        first_chapter_no: item.first_chapter_no || null,
        last_chapter_no: item.last_chapter_no || null,
      })),
      chapter_usage: chapterSettingUsage.map((usage: any) => {
        const entity = settingById.get(Number(usage.entity_id || 0))
        return {
          ...usage,
          entity_type: entity?.entity_type || '',
          name: entity?.name || '',
          summary: entity?.summary || '',
          constraints: entity?.constraints_json || {},
          state: entity?.state_json || {},
        }
      }),
      required: chapterSettingUsage.filter((item: any) => item.required && !item.forbidden).map((usage: any) => settingById.get(Number(usage.entity_id))?.name).filter(Boolean),
      forbidden: chapterSettingUsage.filter((item: any) => item.forbidden).map((usage: any) => settingById.get(Number(usage.entity_id))?.name).filter(Boolean),
      auto_matched: settingUsageAutoMatched,
      type_counts: settingEntities.reduce((acc: Record<string, number>, item: any) => {
        const key = item.entity_type || 'rule'
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {}),
    }
    const storylineSettings = relatedSettings.filter((item: any) => STORYLINE_TYPES.includes(item.entity_type))
    const storylineUsage = chapterSettingUsage
      .map((usage: any) => {
        const entity = settingById.get(Number(usage.entity_id || 0))
        if (!entity || !STORYLINE_TYPES.includes(entity.entity_type)) return null
        return {
          ...usage,
          entity_type: entity.entity_type || '',
          name: entity.name || '',
          summary: entity.summary || '',
          constraints: entity.constraints_json || {},
          state: entity.state_json || {},
          payload: entity.payload_json || {},
        }
      })
      .filter(Boolean)
    const storylineContext = {
      entities: storylineSettings.map((item: any) => ({
        id: item.id,
        type: item.entity_type,
        name: item.name,
        summary: item.summary || '',
        status: item.status || 'active',
        visibility: item.visibility || 'public',
        constraints: item.constraints_json || {},
        state: item.state_json || {},
        payload: item.payload_json || {},
        first_chapter_no: item.first_chapter_no || null,
        last_chapter_no: item.last_chapter_no || null,
      })),
      chapter_usage: storylineUsage,
      required: storylineUsage
        .filter((item: any) => ['advance', 'plant', 'payoff', 'required'].includes(String(item.usage_type || '')) || (item.required && !item.forbidden))
        .map((usage: any) => usage.name)
        .filter(Boolean),
      forbidden: storylineUsage
        .filter((item: any) => item.forbidden || item.usage_type === 'forbidden')
        .map((usage: any) => usage.name)
        .filter(Boolean),
      advance: storylineUsage.filter((item: any) => item.usage_type === 'advance'),
      plant: storylineUsage.filter((item: any) => item.usage_type === 'plant'),
      payoff: storylineUsage.filter((item: any) => item.usage_type === 'payoff'),
      pause: storylineUsage.filter((item: any) => item.usage_type === 'pause'),
      forbidden_usage: storylineUsage.filter((item: any) => item.usage_type === 'forbidden' || item.forbidden),
    }
    const settingChecks = [
      { key: 'setting_workshop', ok: settingEntities.length > 0, severity: 'medium', label: '设定工坊', fix: '在右侧“设定”中从项目资料补齐角色、境界、能力、物品、Boss、规则等设定。' },
      { key: 'chapter_setting_usage', ok: chapterSettingUsage.length > 0, severity: 'low', label: '本章设定调用', fix: '在本章设定调用中标记必用、允许或禁揭设定。' },
    ]
    preflight.checks.push(...settingChecks)
    preflight.warnings.push(...settingChecks.filter(item => !item.ok).map(item => `${item.label}不足`))
    preflight.blockers.push(...settingChecks.filter(item => !item.ok && item.severity === 'high'))
    preflight.ready = preflight.blockers.length === 0
    preflight.strict_ready = preflight.checks.every((item: any) => item.ok || item.severity === 'low')
    const chapterRollingPlan = chapter.raw_payload?.rollingPlan || chapter.raw_payload?.rolling_plan || null
    const signatureSceneBrief = normalizeSignatureSceneBrief(chapter.raw_payload?.signature_scene_brief || chapterRollingPlan)
    const basePackage = {
      project: {
        id: project.id,
        title: project.title,
        genre: project.genre || '',
        synopsis: project.synopsis || '',
        style_tags: project.style_tags || [],
        length_target: project.length_target || 'medium',
        target_audience: project.target_audience || '',
      },
      chapter_target: {
        id: chapter.id,
        chapter_no: chapter.chapter_no,
        title: chapter.title,
        goal: chapter.chapter_goal || '',
        summary: chapter.chapter_summary || '',
        conflict: chapter.conflict || '',
        ending_hook: chapter.ending_hook || '',
        previous_handoff: previousHandoff,
        rollingPlan: chapterRollingPlan || undefined,
        signature_scene_brief: signatureSceneBrief,
        scene_cards: sceneCards,
        word_target: wordTarget,
        meme_strategy: buildMemeStrategy(project, { writing_bible: writingBible, chapter_target: chapter.raw_payload?.pre_draft_brief ? { meme_strategy: chapter.raw_payload.pre_draft_brief.meme_strategy } : {} }),
        style_sample_strategy: buildStyleSampleStrategy(project, {
          writing_bible: writingBible,
          style_sample_effectiveness: styleSampleEffectiveness,
          chapter_target: chapter.raw_payload?.pre_draft_brief
            ? { style_sample_strategy: chapter.raw_payload.pre_draft_brief.style_sample_strategy }
            : {},
        }),
        chapter_benchmark_strategy: buildChapterBenchmarkStrategy(project, { writing_bible: writingBible, chapter_target: chapter.raw_payload?.pre_draft_brief ? { chapter_benchmark_strategy: chapter.raw_payload.pre_draft_brief.chapter_benchmark_strategy } : {} }),
        first30_retention_brief: chapter.raw_payload?.pre_draft_brief?.first30_retention_brief || first30RetentionContext,
        story_unit_context: chapter.raw_payload?.pre_draft_brief?.story_unit_context || storyUnitContext,
        reader_expectation_debt_context: chapter.raw_payload?.pre_draft_brief?.reader_expectation_debt || readerExpectationDebtContext,
        delivery_risk_carry_over: chapter.raw_payload?.pre_draft_brief?.delivery_risk_carry_over || deliveryRiskCarryOverContext,
        continuity_notes: chapter.continuity_notes || [],
        must_advance: asArray(chapter.raw_payload?.must_advance),
        forbidden_repeats: asArray(chapter.raw_payload?.forbidden_repeats),
      },
      continuity: {
        previous_chapter: previousChapter ? {
          chapter_no: previousChapter.chapter_no,
          title: previousChapter.title,
          summary: previousChapter.chapter_summary || '',
          ending_hook: previousChapter.ending_hook || '',
          ending_excerpt: String(previousChapter.chapter_text || '').slice(-800),
        } : null,
        previous_prose_chapters: previousProseChapters,
      },
      story_state: {
        global: getStoryState(project),
        recent_state_entries: preflight.recent_state_entries,
        worldbuilding: worldbuilding[0] || null,
        characters: characters.map(char => ({
          id: char.id,
          name: char.name,
          role: char.role || char.role_type || '',
          archetype: char.archetype || '',
          personality: char.personality || [],
          motivation: char.motivation || '',
          goal: char.goal || '',
          conflict: char.conflict || '',
          appearance: char.appearance || '',
          backstory: char.backstory || '',
          secret: char.secret || '',
          relationships: char.relationships || [],
          relationship_graph: char.relationship_graph || {},
          growth_arc: char.growth_arc || '',
          arc_hint: char.arc_hint || '',
          current_state: char.current_state || {},
          abilities: char.abilities || [],
          profile: char.raw_payload?.profile || {},
          items: char.current_state?.items || char.raw_payload?.items || [],
          knowledge_scope: char.current_state?.knowledge_scope || [],
          information_boundaries: char.current_state?.information_boundaries || [],
        })),
        outlines: outlines.slice(0, 20).map(outline => ({
          id: outline.id,
          type: outline.outline_type,
          title: outline.title,
          summary: outline.summary || '',
          hook: outline.hook || '',
        })),
      },
      volume_plan: getVolumePlan(outlines),
      writing_bible: writingBible,
      longform_compass: longformCompass,
      longform_memory_capsule: longformMemoryCapsule,
      meme_bank: memeBank,
      style_sample_bank: styleSampleBank,
      style_sample_effectiveness: styleSampleEffectiveness,
      first30_retention_context: first30RetentionContext,
      reader_expectation_debt_context: readerExpectationDebtContext,
      delivery_risk_carry_over: deliveryRiskCarryOverContext,
      story_unit_context: storyUnitContext,
      setting_context: settingContext,
      storyline_context: storylineContext,
      style_lock: styleLock,
      safety_policy: safetyPolicy,
      reference: referencePreview ? {
        strength_label: referencePreview.strength_label,
        injected_entry_count: Array.isArray(referencePreview.entries) ? referencePreview.entries.length : 0,
        warnings: referencePreview.warnings || [],
      } : null,
      preflight: {
        ready: preflight.ready,
        strict_ready: preflight.strict_ready,
        checks: preflight.checks,
        blockers: preflight.blockers,
        warnings: preflight.warnings,
      },
    }
    const confirmedPackage = mergeConfirmedPreDraftBriefIntoContext(basePackage, chapter.raw_payload?.pre_draft_brief)
    const override = chapter.raw_payload?.context_package_override || null
    return override ? deepMergeObjects(confirmedPackage, override) : confirmedPackage
  }

  const buildProseReviewPrompt = (project: any, contextPackage: any, chapterText: string) => [
    '任务：对刚生成的小说章节进行章节级自检。',
    `作品标题：${project.title}`,
    '',
    '请重点检查：',
    '1. 是否完成本章目标、冲突和章末钩子。',
    '2. 是否自然衔接上一章结尾状态。',
    '3. 角色行为是否符合角色卡与当前状态。',
    '4. 是否有设定冲突、时间线跳跃、物品凭空出现或消失。',
    '5. 是否有水文、重复、空泛总结、机械说明。',
    '6. 是否疑似照搬参考项目的专名、桥段或原句。',
    '7. 场景卡承诺的战斗、追逐、清剿、灾祸或强冲突是否真正写出过程，而不是只有结果。',
    '8. action_beats 是否有起手、反应、受阻、代价、反制、结果；是否缺少空间位置、伤势、资源损耗或信息暴露。',
    '9. 是否存在过度环境描写、连续纯氛围段落、用阴冷/压抑/雨雾等描写替代剧情推进。',
    '10. 每 3-5 段是否有可见行动、选择、信息变化或关系变化。',
    '11. 是否违反 setting_context：境界/战力矛盾、能力代价缺失、物品归属错误、Boss行动逻辑不一致、禁揭设定泄漏、规则触发没有代价、角色知识越界、伏笔误用、预期状态变化缺失。',
    '',
    '【结构化上下文包】',
    JSON.stringify(contextPackage, null, 2).slice(0, 6000),
    '',
    '【待审校正文】',
    chapterText.slice(0, 16000),
    '',
    '输出 JSON，字段：passed(boolean), score(0-100), craft_metrics({action_detail_score,description_overuse_score,event_density_score,combat_process_score,setting_consistency_score}), focused_revision_modes(array，可取 expand_action/cut_description/tighten_pacing/add_consequence/restore_hook/repair_setting_violation), setting_violations(array), issues(array: severity/type/description/suggestion), revision_directives(array), needs_revision(boolean)。只返回 JSON。',
  ].join('\n')

  const buildProseRevisionPrompt = (project: any, contextPackage: any, chapterText: string, review: any) => [
    '任务：根据自检结果修订本章正文，保留可用内容，修复连续性、角色、节奏、章末钩子和正文工艺问题。',
    `作品标题：${project.title}`,
    '定向修订要求：',
    '1. expand_action：补足战斗/追逐/清剿/灾祸现场的动作链，写出出手、反应、空间变化、受伤或资源损耗、反制和结果。',
    '2. cut_description：压缩不推动剧情的环境描写，尤其是连续氛围段落；保留能影响动作空间、诡异规则和危险判断的描写。',
    '3. tighten_pacing：提高事件密度，删掉空泛总结，让每 3-5 段都有行动、选择、信息变化或关系变化。',
    '4. add_consequence：补充行动后果，包括伤势、物品损耗、暴露秘密、角色关系变化、规则代价。',
    '5. restore_hook：保留并强化章末钩子，不要削弱下一章推动力。',
    '6. repair_setting_violation：修复设定工坊违规，确保境界、能力代价、物品归属、Boss行动、规则触发、角色认知边界和禁揭设定全部一致。',
    '',
    '【结构化上下文包】',
    JSON.stringify(contextPackage, null, 2).slice(0, 6000),
    '',
    '【自检结果】',
    JSON.stringify(review, null, 2).slice(0, 4000),
    '',
    '【初稿正文】',
    chapterText.slice(0, 16000),
    '',
    '请输出 JSON，包含 prose_chapters 数组。数组第一项必须包含 chapter_no, title, chapter_text, scene_breakdown, continuity_notes。chapter_text 是修订后的完整正文，不要 markdown 标题。',
  ].join('\n')

  const shouldReviseProse = (review: any) => {
    const issues = Array.isArray(review?.issues) ? review.issues.map(normalizeIssue) : []
    const hasHighIssue = issues.some(issue => ['high', 'critical'].includes(issue.severity.toLowerCase()))
    return Boolean(review?.needs_revision) || Number(review?.score || 100) < 78 || hasHighIssue
  }

  const runProseSelfReviewAndRevision = async (activeWorkspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number, options: any = {}) => {
    const reviewModelId = ctx.production.getStageModelId(project, 'review', modelId)
    const reviseModelId = ctx.production.getStageModelId(project, 'revise', modelId)
    const reviewResult = await executeNovelAgent('review-agent', project, {
      task: buildProseReviewPrompt(project, contextPackage, chapterText),
    }, { activeWorkspace, modelId: reviewModelId ? String(reviewModelId) : undefined, maxTokens: 3000, temperature: ctx.production.getStageTemperature(project, 'review', 0.2), skipMemory: true })
    const reviewPayload = getNovelPayload(reviewResult)
    const normalizedReview = {
      passed: reviewPayload?.passed !== false,
      score: Number(reviewPayload?.score || 80),
      issues: Array.isArray(reviewPayload?.issues) ? reviewPayload.issues.map(normalizeIssue) : [],
      revision_directives: Array.isArray(reviewPayload?.revision_directives) ? reviewPayload.revision_directives.map((item: any) => String(item)) : [],
      craft_metrics: reviewPayload?.craft_metrics || {},
      focused_revision_modes: Array.isArray(reviewPayload?.focused_revision_modes) ? reviewPayload.focused_revision_modes.map((item: any) => String(item)) : [],
      setting_violations: Array.isArray(reviewPayload?.setting_violations) ? reviewPayload.setting_violations : [],
      needs_revision: Boolean(reviewPayload?.needs_revision),
      modelName: (reviewResult as any).modelName,
    }
    if (options.revise === false || !shouldReviseProse(normalizedReview)) {
      return { review: normalizedReview, revision: null, final_text: chapterText, revised: false }
    }
    const revisionResult = await executeNovelAgent('prose-agent', project, {
      task: buildProseRevisionPrompt(project, contextPackage, chapterText, normalizedReview),
      upstreamContext: contextPackage,
    }, { activeWorkspace, modelId: reviseModelId ? String(reviseModelId) : undefined, maxTokens: 8000, temperature: ctx.production.getStageTemperature(project, 'revise', 0.65), skipMemory: true })
    const revisionPayload = getNovelPayload(revisionResult)
    const revisedFirst = Array.isArray(revisionPayload?.prose_chapters) ? revisionPayload.prose_chapters[0] : revisionPayload
    const revisedText = revisedFirst?.chapter_text || revisionPayload?.chapter_text || ''
    if (!revisedText) {
      return { review: normalizedReview, revision: { error: revisionResult.error || '修订未返回正文' }, final_text: chapterText, revised: false }
    }
    return {
      review: normalizedReview,
      revision: {
        scene_breakdown: revisedFirst?.scene_breakdown || revisionPayload?.scene_breakdown || [],
        continuity_notes: revisedFirst?.continuity_notes || revisionPayload?.continuity_notes || [],
        modelName: (revisionResult as any).modelName,
      },
      final_text: revisedText,
      revised: true,
    }
  }

  const runCommercialEditorRewrite = async (activeWorkspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number, options: any = {}) => {
    const editorModelId = ctx.production.getStageModelId(project, 'editor', modelId)
    const editorResult = await executeNovelAgent('prose-agent', project, {
      task: buildCommercialEditorRewritePrompt(project, contextPackage, chapterText, options),
      upstreamContext: contextPackage,
    }, {
      activeWorkspace,
      modelId: editorModelId ? String(editorModelId) : undefined,
      maxTokens: proseMaxTokensForWordTarget(contextPackage?.chapter_target?.word_target),
      temperature: ctx.production.getStageTemperature(project, 'editor', 0.5),
      skipMemory: true,
    })
    const payload = getNovelPayload(editorResult)
    const rewrittenFirst = Array.isArray(payload?.prose_chapters) ? payload.prose_chapters[0] : payload
    const rewrittenText = String(rewrittenFirst?.chapter_text || payload?.chapter_text || '')
    const originalCount = countProseChars(chapterText)
    const rewrittenCount = countProseChars(rewrittenText)
    if (!rewrittenText) {
      return {
        final_text: chapterText,
        edited: false,
        editor_report: { error: (editorResult as any).error || '商业主编改稿未返回正文' },
        revision: null,
      }
    }
    if (originalCount > 0 && rewrittenCount < Math.floor(originalCount * 0.85)) {
      return {
        final_text: chapterText,
        edited: false,
        editor_report: {
          ...(payload?.editor_report || {}),
          error: `商业主编改稿返回正文过短：${rewrittenCount}/${originalCount}`,
        },
        revision: null,
      }
    }
    return {
      final_text: rewrittenText,
      edited: rewrittenText !== chapterText,
      editor_report: {
        ...(payload?.editor_report || {}),
        modelName: (editorResult as any).modelName,
        original_word_count: originalCount,
        edited_word_count: rewrittenCount,
      },
      revision: {
        scene_breakdown: rewrittenFirst?.scene_breakdown || payload?.scene_breakdown || [],
        continuity_notes: rewrittenFirst?.continuity_notes || payload?.continuity_notes || [],
        modelName: (editorResult as any).modelName,
      },
    }
  }

  const runMemePolish = async (activeWorkspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number) => {
    const memeStrategy = contextPackage?.chapter_target?.meme_strategy || buildMemeStrategy(project, contextPackage)
    if (String(memeStrategy?.intensity || '无') === '无' && !asArray(memeStrategy?.meme_bank).length) {
      return { final_text: chapterText, polished: false, meme_polish_report: { skipped: true, reason: '未配置网感策略或素材池' }, revision: null }
    }
    const polishModelId = ctx.production.getStageModelId(project, 'revise', modelId)
    const polishResult = await executeNovelAgent('prose-agent', project, {
      task: buildMemePolishPrompt(project, contextPackage, chapterText),
      upstreamContext: contextPackage,
    }, {
      activeWorkspace,
      modelId: polishModelId ? String(polishModelId) : undefined,
      maxTokens: proseMaxTokensForWordTarget(contextPackage?.chapter_target?.word_target),
      temperature: ctx.production.getStageTemperature(project, 'revise', 0.45),
      skipMemory: true,
    })
    const payload = getNovelPayload(polishResult)
    const polishedFirst = Array.isArray(payload?.prose_chapters) ? payload.prose_chapters[0] : payload
    const polishedText = String(polishedFirst?.chapter_text || payload?.chapter_text || '')
    const originalCount = countProseChars(chapterText)
    const polishedCount = countProseChars(polishedText)
    if (!polishedText || payload?.meme_polish_report?.changed_plot === true) {
      return {
        final_text: chapterText,
        polished: false,
        meme_polish_report: {
          ...(payload?.meme_polish_report || {}),
          error: !polishedText ? '网感润色未返回正文' : '网感润色疑似改动剧情，已拒绝',
          modelName: (polishResult as any).modelName,
        },
        revision: null,
      }
    }
    if (originalCount > 0 && polishedCount < Math.floor(originalCount * 0.9)) {
      return {
        final_text: chapterText,
        polished: false,
        meme_polish_report: {
          ...(payload?.meme_polish_report || {}),
          error: `网感润色返回正文过短：${polishedCount}/${originalCount}`,
          modelName: (polishResult as any).modelName,
        },
        revision: null,
      }
    }
    return {
      final_text: polishedText,
      polished: polishedText !== chapterText,
      meme_polish_report: {
        ...(payload?.meme_polish_report || {}),
        modelName: (polishResult as any).modelName,
        original_word_count: originalCount,
        polished_word_count: polishedCount,
      },
      revision: {
        scene_breakdown: polishedFirst?.scene_breakdown || payload?.scene_breakdown || [],
        continuity_notes: polishedFirst?.continuity_notes || payload?.continuity_notes || [],
        modelName: (polishResult as any).modelName,
      },
    }
  }

  const runReadabilityReview = async (activeWorkspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number) => {
    const reviewModelId = ctx.production.getStageModelId(project, 'review', modelId)
    const reviewResult = await executeNovelAgent('review-agent', project, {
      task: buildReadabilityReviewPrompt(project, contextPackage, chapterText),
    }, {
      activeWorkspace,
      modelId: reviewModelId ? String(reviewModelId) : undefined,
      maxTokens: 2500,
      temperature: ctx.production.getStageTemperature(project, 'review', 0.2),
      skipMemory: true,
    })
    const payload = getNovelPayload(reviewResult)
    return {
      readability_score: Number(payload?.readability_score ?? payload?.score ?? 0) || 0,
      passed: payload?.passed !== false,
      opening_hook_score: Number(payload?.opening_hook_score ?? 0) || 0,
      ending_hook_score: Number(payload?.ending_hook_score ?? 0) || 0,
      scene_readability_score: Number(payload?.scene_readability_score ?? 0) || 0,
      paragraph_density_score: Number(payload?.paragraph_density_score ?? 0) || 0,
      dialogue_voice_score: Number(payload?.dialogue_voice_score ?? 0) || 0,
      payoff_density_score: Number(payload?.payoff_density_score ?? 0) || 0,
      meme_sense: payload?.meme_sense || {},
      issues: Array.isArray(payload?.issues) ? payload.issues.map(normalizeIssue) : [],
      suggestions: asArray(payload?.suggestions).map((item: any) => String(item || '').trim()).filter(Boolean),
      modelName: (reviewResult as any).modelName,
    }
  }

  const ensureProseMeetsWordTarget = async (activeWorkspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number, options: any = {}) => {
    const wordTarget = contextPackage?.chapter_target?.word_target as ChapterWordTarget | null | undefined
    const evaluation = evaluateProseWordTarget(chapterText, wordTarget)
    if (evaluation.passed || options.expand === false) {
      return {
        final_text: chapterText,
        expanded: false,
        evaluation,
        final_evaluation: evaluation,
        expansion: null,
      }
    }

    const maxExpansionAttempts = Math.max(1, Math.min(5, Number(options.maxExpansionAttempts || options.max_expansion_attempts || 3)))
    const reviseModelId = ctx.production.getStageModelId(project, 'revise', modelId)
    let currentText = String(chapterText || '')
    let currentEvaluation = evaluation
    const attempts: any[] = []

    for (let attempt = 1; attempt <= maxExpansionAttempts; attempt += 1) {
      const expansionResult = await executeNovelAgent('prose-agent', project, {
        task: buildProseWordTargetExpansionPrompt(project, contextPackage, currentText, currentEvaluation, { attempt, maxAttempts: maxExpansionAttempts }),
        upstreamContext: contextPackage,
      }, {
        activeWorkspace,
        modelId: reviseModelId ? String(reviseModelId) : undefined,
        maxTokens: proseMaxTokensForWordTarget(wordTarget),
        temperature: ctx.production.getStageTemperature(project, 'revise', 0.65),
        skipMemory: true,
      })
      const extracted = extractProseExpansionPayload(expansionResult)
      const expandedText = extracted.text
      const finalEvaluation = evaluateProseWordTarget(expandedText, wordTarget)
      const previousCount = countProseChars(currentText)
      const expandedCount = countProseChars(expandedText)

      attempts.push({
        attempt,
        previous_count: previousCount,
        expanded_count: expandedCount,
        evaluation: finalEvaluation,
        modelName: (expansionResult as any).modelName,
        returned_text: Boolean(expandedText),
      })

      if (expandedText && expandedCount > previousCount) {
        currentText = expandedText
        currentEvaluation = finalEvaluation
      }

      if (expandedText && expandedCount > previousCount && finalEvaluation.passed) {
        return {
          final_text: expandedText,
          expanded: true,
          evaluation,
          final_evaluation: finalEvaluation,
          expansion: {
            scene_breakdown: extracted.scene_breakdown,
            continuity_notes: extracted.continuity_notes,
            attempts,
            modelName: (expansionResult as any).modelName,
          },
        }
      }
    }

    throw Object.assign(
      new Error(`章节正文低于字数下限：当前 ${evaluation.actual} 字，至少 ${evaluation.min} 字，扩写后 ${currentEvaluation.actual || 0} 字`),
      {
        code: 'PROSE_WORD_TARGET_SHORT',
        word_target: wordTarget,
        evaluation,
        final_evaluation: currentEvaluation,
        expansion_attempts: attempts,
      },
    )
  }

  const generateChapterForGroup = async (activeWorkspace: string, projectId: number, chapterId: number, options: any = {}) => {
    const preferredModelId = Number(options.model_id || 0) || undefined
    const onStage = typeof options.onStage === 'function' ? options.onStage : async () => {}
    const project = await ctx.getProject(activeWorkspace, projectId)
    if (!project) throw new Error('project not found')
    const configSnapshot = ctx.production.buildAgentConfigSnapshot(project, preferredModelId)
    const approvalPolicy = options.approval_policy || ctx.production.getApprovalPolicy(project)
    const approvals = options.approvals || {}
    const productionMode = String(options.production_mode || 'draft_review_revise_store')
    const isSceneCardsOnly = productionMode === 'scene_cards_only'
    const isDraftOnly = productionMode === 'draft_only'
    const isDraftReviewOnly = productionMode === 'draft_review'
    let chapters = await listNovelChapters(activeWorkspace, projectId)
    let chapter = chapters.find(item => item.id === chapterId)
    if (!chapter) throw new Error('chapter not found')
    const [worldbuilding, characters, outlines, reviews] = await Promise.all([
      listNovelWorldbuilding(activeWorkspace, projectId),
      listNovelCharacters(activeWorkspace, projectId),
      listNovelOutlines(activeWorkspace, projectId),
      listNovelReviews(activeWorkspace, projectId),
    ])
    let wordTarget = resolveChapterWordTarget(project, chapter, options)
    let contextPackage = applyChapterWordTargetToContext(
      await buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews),
      wordTarget,
    )
    await onStage('context', {
      status: contextPackage.preflight.ready ? 'success' : 'failed',
      score: contextPackage.preflight.ready ? 100 : 0,
      warnings: contextPackage.preflight.warnings || [],
      blockers: contextPackage.preflight.blockers || [],
    })
    if (!contextPackage.preflight.ready && options.allow_incomplete !== true) {
      throw Object.assign(new Error('章节生成前置检查未通过'), { code: 'PROSE_PREFLIGHT_BLOCKED', contextPackage })
    }
    await onStage('scene_cards', { status: 'running' })
    if (!contextPackage.chapter_target.scene_cards.length || options.force_scene_cards === true) {
      const sceneResult = await generateSceneCardsForChapter(activeWorkspace, project, contextPackage, preferredModelId)
      if (sceneResult.sceneCards.length > 0) {
        const updatedSceneChapter = await updateNovelChapter(activeWorkspace, chapter.id, {
          scene_breakdown: sceneResult.sceneCards,
          scene_list: sceneResult.sceneCards,
          raw_payload: { ...(chapter.raw_payload || {}), scene_cards_source: 'chapter_group' },
        } as any, { createVersion: false })
        if (updatedSceneChapter) chapter = updatedSceneChapter
        chapters = await listNovelChapters(activeWorkspace, projectId)
        wordTarget = resolveChapterWordTarget(project, chapter, options)
        contextPackage = applyChapterWordTargetToContext(
          await buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews),
          wordTarget,
        )
      }
    }
    await onStage('scene_cards', { status: 'success', count: contextPackage.chapter_target.scene_cards.length, scene_cards: contextPackage.chapter_target.scene_cards })
    if (ctx.production.approvalRequired(approvalPolicy, 'scene_cards', approvals, { count: contextPackage.chapter_target.scene_cards.length })) {
      await onStage('scene_cards', { status: 'needs_confirmation', count: contextPackage.chapter_target.scene_cards.length })
      throw ctx.production.buildApprovalError('scene_cards', '场景卡等待人工确认', { count: contextPackage.chapter_target.scene_cards.length })
    }
    if (isSceneCardsOnly) {
      await onStage('migration_plan', { status: 'skipped', reason: '生产模式：只生成场景卡' })
      await onStage('draft', { status: 'skipped', reason: '生产模式：只生成场景卡' })
      await onStage('review', { status: 'skipped', reason: '生产模式：只生成场景卡' })
      await onStage('revise', { status: 'skipped', reason: '生产模式：只生成场景卡' })
      await onStage('safety', { status: 'skipped', reason: '生产模式：只生成场景卡' })
      await onStage('store', { status: 'skipped', reason: '场景卡已保存到章节元数据' })
      await onStage('story_state', { status: 'skipped', reason: '未生成正文，无需更新状态机' })
      return {
        chapter,
        score: null,
        revised: false,
        production_mode: productionMode,
        completed_stage: 'scene_cards',
        story_state_update: { skipped: true },
        config_snapshot: configSnapshot,
      }
    }
    const prevChapters = chapters
      .filter(ch => ch.chapter_no < chapter.chapter_no && ch.chapter_text)
      .slice(-3)
      .map(ch => ({ chapter_no: ch.chapter_no, title: ch.title, chapter_summary: ch.chapter_summary || '', ending_hook: ch.ending_hook || '', chapter_text: ch.chapter_text }))
    await onStage('migration_plan', { status: 'running' })
    const migrationPlan = await ctx.reference.getReferenceMigrationPlanForChapter(activeWorkspace, project, chapter).catch(error => ({ error: String(error) }))
    await onStage('migration_plan', { status: (migrationPlan as any)?.error ? 'warn' : 'success', active_reference_count: (migrationPlan as any)?.chapter_specific_plan?.active_reference_count || 0 })
    await onStage('draft', { status: 'running' })
    const draftResult = await generateNovelChapterProse(project, chapter, {
      worldbuilding,
      characters,
      outline: outlines,
      prompt: String(options.prompt || ''),
      prevChapters,
      contextPackage,
      migrationPlan,
      paragraphTask: buildParagraphProseContext(project, contextPackage, migrationPlan, chapter),
      maxTokens: proseMaxTokensForWordTarget(wordTarget),
    } as any, activeWorkspace, ctx.production.getStageModelId(project, 'draft', preferredModelId))
    const resultPayload = getNovelPayload(draftResult)
    const targetProse = selectProseForChapter(resultPayload, chapter)
    const plainProseFallback = extractPlainProseFallback(draftResult, 800)
    const chapterText = targetProse?.chapter_text || resultPayload?.chapter_text || plainProseFallback
    if ((draftResult as any).error || !chapterText) {
      await onStage('draft', {
        status: 'failed',
        error: String((draftResult as any).error || (draftResult as any).fallbackReason || '模型未返回正文'),
        llm_diagnostics: buildLLMResultDiagnostics(draftResult),
      })
      throw new Error(String((draftResult as any).error || (draftResult as any).fallbackReason || '模型未返回正文'))
    }
    await onStage('draft', { status: 'success', word_count: countProseChars(chapterText), modelName: (draftResult as any).modelName, scene_status: 'generated', plain_text_fallback_used: Boolean(plainProseFallback && !targetProse?.chapter_text && !resultPayload?.chapter_text) })
    let finalText = String(chapterText || '')
    let finalSceneBreakdown = targetProse?.scene_breakdown || resultPayload?.scene_breakdown || []
    let finalContinuityNotes = targetProse?.continuity_notes || resultPayload?.continuity_notes || chapter.continuity_notes || []
    let editorRewrite: any = null
    let memePolish: any = null
    let readabilityReview: any = null
    await onStage('word_target', { status: 'running', target: wordTarget.target, min: wordTarget.min, max: wordTarget.max, actual: countProseChars(finalText) })
    try {
      const wordTargetCheck = await ensureProseMeetsWordTarget(activeWorkspace, project, contextPackage, finalText, preferredModelId)
      finalText = wordTargetCheck.final_text || finalText
      if (wordTargetCheck.expanded && wordTargetCheck.expansion) {
        finalSceneBreakdown = wordTargetCheck.expansion.scene_breakdown?.length ? wordTargetCheck.expansion.scene_breakdown : finalSceneBreakdown
        finalContinuityNotes = wordTargetCheck.expansion.continuity_notes?.length ? wordTargetCheck.expansion.continuity_notes : finalContinuityNotes
      }
      await onStage('word_target', { status: 'success', expanded: wordTargetCheck.expanded, word_count: countProseChars(finalText), evaluation: wordTargetCheck.final_evaluation })
    } catch (error: any) {
      await onStage('word_target', { status: 'failed', error: String(error?.message || error), word_target: error?.word_target || wordTarget, evaluation: error?.evaluation, final_evaluation: error?.final_evaluation, expansion_attempts: error?.expansion_attempts })
      throw error
    }
    if (isDraftOnly) {
      await onStage('review', { status: 'skipped', reason: '生产模式：只生成正文初稿' })
      await onStage('revise', { status: 'skipped', reason: '生产模式：只生成正文初稿' })
      await onStage('safety', { status: 'skipped', reason: '生产模式：只生成正文初稿' })
      await onStage('store', { status: 'running' })
      const updatedDraft = await updateNovelChapter(activeWorkspace, chapter.id, {
        chapter_text: finalText,
        continuity_notes: finalContinuityNotes,
        raw_payload: { ...(chapter.raw_payload || {}), generated_scene_breakdown: finalSceneBreakdown },
        status: 'draft',
      }, { versionSource: 'agent_execute' })
      await onStage('store', { status: 'success', word_count: countProseChars(finalText), scene_status: 'accepted' })
      await onStage('story_state', { status: 'skipped', reason: '初稿模式不更新状态机，避免低质草稿污染长期记忆' })
      return {
        chapter: updatedDraft,
        score: null,
        revised: false,
        production_mode: productionMode,
        completed_stage: 'store',
        story_state_update: { skipped: true },
        config_snapshot: configSnapshot,
      }
    }
    await onStage('editor', { status: 'running' })
    try {
      editorRewrite = await runCommercialEditorRewrite(activeWorkspace, project, contextPackage, finalText, preferredModelId)
      finalText = editorRewrite.final_text || finalText
      if (editorRewrite.edited && editorRewrite.revision) {
        finalSceneBreakdown = editorRewrite.revision.scene_breakdown?.length ? editorRewrite.revision.scene_breakdown : finalSceneBreakdown
        finalContinuityNotes = editorRewrite.revision.continuity_notes?.length ? editorRewrite.revision.continuity_notes : finalContinuityNotes
      }
      await onStage('editor', {
        status: editorRewrite.edited ? 'success' : 'warn',
        edited: Boolean(editorRewrite.edited),
        word_count: countProseChars(finalText),
        editor_report: editorRewrite.editor_report,
      })
    } catch (editorError) {
      editorRewrite = { error: String(editorError), edited: false }
      await onStage('editor', { status: 'warn', error: String(editorError).slice(0, 200), reason: '商业主编改稿失败，保留当前稿' })
    }
    try {
      const postEditorWordTargetCheck = await ensureProseMeetsWordTarget(activeWorkspace, project, contextPackage, finalText, preferredModelId)
      finalText = postEditorWordTargetCheck.final_text || finalText
      if (postEditorWordTargetCheck.expanded && postEditorWordTargetCheck.expansion) {
        finalSceneBreakdown = postEditorWordTargetCheck.expansion.scene_breakdown?.length ? postEditorWordTargetCheck.expansion.scene_breakdown : finalSceneBreakdown
        finalContinuityNotes = postEditorWordTargetCheck.expansion.continuity_notes?.length ? postEditorWordTargetCheck.expansion.continuity_notes : finalContinuityNotes
        await onStage('word_target', { status: 'success', expanded: true, word_count: countProseChars(finalText), evaluation: postEditorWordTargetCheck.final_evaluation, phase: 'post_editor' })
      }
    } catch (error: any) {
      await onStage('word_target', { status: 'failed', error: String(error?.message || error), word_target: error?.word_target || wordTarget, evaluation: error?.evaluation, final_evaluation: error?.final_evaluation, expansion_attempts: error?.expansion_attempts, phase: 'post_editor' })
      throw error
    }
    await onStage('meme_polish', { status: 'running' })
    try {
      memePolish = await runMemePolish(activeWorkspace, project, contextPackage, finalText, preferredModelId)
      finalText = memePolish.final_text || finalText
      if (memePolish.polished && memePolish.revision) {
        finalSceneBreakdown = memePolish.revision.scene_breakdown?.length ? memePolish.revision.scene_breakdown : finalSceneBreakdown
        finalContinuityNotes = memePolish.revision.continuity_notes?.length ? memePolish.revision.continuity_notes : finalContinuityNotes
      }
      await onStage('meme_polish', {
        status: memePolish.polished ? 'success' : 'skipped',
        polished: Boolean(memePolish.polished),
        meme_polish_report: memePolish.meme_polish_report,
      })
    } catch (memeError) {
      memePolish = { error: String(memeError), polished: false }
      await onStage('meme_polish', { status: 'warn', error: String(memeError).slice(0, 200), reason: '网感润色失败，保留当前稿' })
    }
    try {
      const postMemeWordTargetCheck = await ensureProseMeetsWordTarget(activeWorkspace, project, contextPackage, finalText, preferredModelId)
      finalText = postMemeWordTargetCheck.final_text || finalText
      if (postMemeWordTargetCheck.expanded && postMemeWordTargetCheck.expansion) {
        finalSceneBreakdown = postMemeWordTargetCheck.expansion.scene_breakdown?.length ? postMemeWordTargetCheck.expansion.scene_breakdown : finalSceneBreakdown
        finalContinuityNotes = postMemeWordTargetCheck.expansion.continuity_notes?.length ? postMemeWordTargetCheck.expansion.continuity_notes : finalContinuityNotes
        await onStage('word_target', { status: 'success', expanded: true, word_count: countProseChars(finalText), evaluation: postMemeWordTargetCheck.final_evaluation, phase: 'post_meme_polish' })
      }
    } catch (error: any) {
      await onStage('word_target', { status: 'failed', error: String(error?.message || error), word_target: error?.word_target || wordTarget, evaluation: error?.evaluation, final_evaluation: error?.final_evaluation, expansion_attempts: error?.expansion_attempts, phase: 'post_meme_polish' })
      throw error
    }
    await onStage('review', { status: 'running' })
    const selfCheck = await runProseSelfReviewAndRevision(activeWorkspace, project, contextPackage, finalText, preferredModelId, { revise: !isDraftReviewOnly })
    await onStage('review', { status: selfCheck?.review?.passed === false ? 'warn' : 'success', score: selfCheck?.review?.score ?? null, issues: selfCheck?.review?.issues || [], scene_status: 'reviewed' })
    await onStage('revise', { status: selfCheck.revised ? 'success' : 'skipped', revised: Boolean(selfCheck.revised), scene_status: selfCheck.revised ? 'revised' : '' })
    finalText = selfCheck.final_text || finalText
    if (selfCheck.revised && selfCheck.revision) {
      finalSceneBreakdown = selfCheck.revision.scene_breakdown?.length ? selfCheck.revision.scene_breakdown : finalSceneBreakdown
      finalContinuityNotes = selfCheck.revision.continuity_notes?.length ? selfCheck.revision.continuity_notes : finalContinuityNotes
    }
    try {
      const postReviewWordTargetCheck = await ensureProseMeetsWordTarget(activeWorkspace, project, contextPackage, finalText, preferredModelId)
      finalText = postReviewWordTargetCheck.final_text || finalText
      if (postReviewWordTargetCheck.expanded && postReviewWordTargetCheck.expansion) {
        finalSceneBreakdown = postReviewWordTargetCheck.expansion.scene_breakdown?.length ? postReviewWordTargetCheck.expansion.scene_breakdown : finalSceneBreakdown
        finalContinuityNotes = postReviewWordTargetCheck.expansion.continuity_notes?.length ? postReviewWordTargetCheck.expansion.continuity_notes : finalContinuityNotes
        await onStage('word_target', { status: 'success', expanded: true, word_count: countProseChars(finalText), evaluation: postReviewWordTargetCheck.final_evaluation, phase: 'post_review' })
      }
    } catch (error: any) {
      await onStage('word_target', { status: 'failed', error: String(error?.message || error), word_target: error?.word_target || wordTarget, evaluation: error?.evaluation, final_evaluation: error?.final_evaluation, expansion_attempts: error?.expansion_attempts, phase: 'post_review' })
      throw error
    }
    await onStage('readability_review', { status: 'running' })
    try {
      readabilityReview = await runReadabilityReview(activeWorkspace, project, contextPackage, finalText, preferredModelId)
      await createNovelReview(activeWorkspace, {
        project_id: projectId,
        review_type: 'readability_review',
        status: Number(readabilityReview.readability_score || 0) >= 78 ? 'ok' : 'warn',
        summary: `可读性 ${readabilityReview.readability_score || '-'}，网感${readabilityReview?.meme_sense?.intensity || contextPackage?.chapter_target?.meme_strategy?.intensity || '无'}`,
        issues: Array.isArray(readabilityReview?.issues) ? readabilityReview.issues.map((issue: any) => `${issue.severity || 'medium'}｜${issue.description || issue}`) : [],
        payload: JSON.stringify({
          chapter_id: chapter.id,
          chapter_no: chapter.chapter_no,
          readability_review: readabilityReview,
          meme_polish: memePolish,
        }),
      })
      await onStage('readability_review', { status: 'success', score: readabilityReview.readability_score, meme_sense: readabilityReview.meme_sense })
    } catch (readabilityError) {
      readabilityReview = { error: String(readabilityError) }
      await onStage('readability_review', { status: 'warn', error: String(readabilityError).slice(0, 200), reason: '可读性复检失败，不阻塞原验收流程' })
    }
    if (isDraftReviewOnly) {
      await onStage('safety', { status: 'skipped', reason: '生产模式：生成并自检，不执行仿写安全门禁' })
      await onStage('store', { status: 'running' })
      const updatedReviewedDraft = await updateNovelChapter(activeWorkspace, chapter.id, {
        chapter_text: finalText,
        continuity_notes: finalContinuityNotes,
        raw_payload: { ...(chapter.raw_payload || {}), generated_scene_breakdown: finalSceneBreakdown },
        status: 'draft',
      }, { versionSource: editorRewrite?.edited ? 'editor_rewrite' : 'agent_execute' })
      await onStage('store', { status: 'success', word_count: countProseChars(finalText), scene_status: 'accepted' })
      await onStage('story_state', { status: 'skipped', reason: '自检模式不更新状态机，确认后可继续完整流水线' })
      await createNovelReview(activeWorkspace, {
        project_id: projectId,
        review_type: 'prose_quality',
        status: selfCheck?.review?.passed === false || Number(selfCheck?.review?.score || 100) < 78 ? 'warn' : 'ok',
        summary: `章节群质检评分 ${selfCheck?.review?.score ?? '-'}`,
        issues: Array.isArray(selfCheck?.review?.issues) ? selfCheck.review.issues.map((issue: any) => `${issue.severity || 'medium'}｜${issue.description || issue}`) : [],
        payload: JSON.stringify({ chapter_id: chapter.id, context_package: contextPackage, editor_rewrite: editorRewrite, meme_polish: memePolish, readability_review: readabilityReview, self_check: selfCheck, production_mode: productionMode, config_snapshot: configSnapshot }),
      })
      return {
        chapter: updatedReviewedDraft,
        score: selfCheck?.review?.score ?? null,
        revised: false,
        production_mode: productionMode,
        completed_stage: 'store',
        story_state_update: { skipped: true },
        config_snapshot: configSnapshot,
      }
    }
    const preStoreQualityDecision = getQualityGateDecision(project, { ...(selfCheck?.review || {}), revised: Boolean(selfCheck.revised) })
    if (!preStoreQualityDecision.passed && !approvals?.quality_gate?.approved) {
      await onStage('review', { status: 'needs_confirmation', score: selfCheck?.review?.score ?? null, quality_gate: preStoreQualityDecision })
      throw ctx.production.buildApprovalError('quality_gate', '章节质量门禁未通过，正文未入库', preStoreQualityDecision)
    }
    if (ctx.production.approvalRequired(approvalPolicy, 'low_score', approvals, { score: selfCheck?.review?.score ?? null, issues: selfCheck?.review?.issues || [] })) {
      await onStage('review', { status: 'needs_confirmation', score: selfCheck?.review?.score ?? null, issues: selfCheck?.review?.issues || [] })
      throw ctx.production.buildApprovalError('low_score', '章节质检低于阈值，等待人工确认', { score: selfCheck?.review?.score ?? null, issues: selfCheck?.review?.issues || [] })
    }
    if (ctx.production.approvalRequired(approvalPolicy, 'draft', approvals, { score: selfCheck?.review?.score ?? null, revised: Boolean(selfCheck.revised) })) {
      await onStage('draft', { status: 'needs_confirmation', score: selfCheck?.review?.score ?? null, revised: Boolean(selfCheck.revised) })
      throw ctx.production.buildApprovalError('draft', '正文入库前等待人工确认', { score: selfCheck?.review?.score ?? null, revised: Boolean(selfCheck.revised) })
    }
    const referenceReport = await ctx.reference.buildReferenceUsageReport(activeWorkspace, project, '正文创作', finalText)
    const safetyDecision = ctx.reference.getReferenceSafetyDecision(project, referenceReport)
    const safetyExplanation = ctx.reference.explainReferenceSafety(referenceReport, safetyDecision)
    const migrationAudit = ctx.reference.buildMigrationAudit(project, referenceReport, safetyExplanation)
    await onStage('safety', { status: safetyDecision.blocked ? 'failed' : 'success', score: safetyDecision.score, copy_hit_count: safetyDecision.copy_hit_count, risk_level: referenceReport?.quality_assessment?.risk_level })
    const finalQualityDecision = getQualityGateDecision(project, { ...(selfCheck?.review || {}), revised: Boolean(selfCheck.revised) }, safetyDecision)
    if (safetyDecision.blocked) {
      throw Object.assign(new Error('仿写安全阈值未通过'), { code: 'REFERENCE_SAFETY_BLOCKED', referenceReport, safetyDecision, safetyExplanation, migrationAudit })
    }
    if (!finalQualityDecision.passed && !approvals?.quality_gate?.approved) {
      await onStage('safety', { status: 'needs_confirmation', score: safetyDecision.score, quality_gate: finalQualityDecision })
      throw ctx.production.buildApprovalError('quality_gate', '章节质量门禁未通过，正文未入库', finalQualityDecision)
    }
    if (ctx.production.approvalRequired(approvalPolicy, 'safety', approvals, { score: safetyDecision.score, copy_hit_count: safetyDecision.copy_hit_count, risk_level: referenceReport?.quality_assessment?.risk_level })) {
      await onStage('safety', { status: 'needs_confirmation', score: safetyDecision.score, copy_hit_count: safetyDecision.copy_hit_count, risk_level: referenceReport?.quality_assessment?.risk_level })
      throw ctx.production.buildApprovalError('safety', '仿写安全报告等待人工确认', { score: safetyDecision.score, copy_hit_count: safetyDecision.copy_hit_count, risk_level: referenceReport?.quality_assessment?.risk_level })
    }
    await onStage('store', { status: 'running' })
    const updated = await updateNovelChapter(activeWorkspace, chapter.id, {
      chapter_text: finalText,
      continuity_notes: finalContinuityNotes,
      raw_payload: { ...(chapter.raw_payload || {}), generated_scene_breakdown: finalSceneBreakdown },
      status: 'draft',
    }, { versionSource: selfCheck?.revised ? 'repair' : editorRewrite?.edited ? 'editor_rewrite' : 'agent_execute' })
    await onStage('store', { status: 'success', word_count: countProseChars(finalText), scene_status: 'accepted' })
    await onStage('story_state', { status: 'running' })
    const storyStateUpdate = await updateStoryStateMachine(activeWorkspace, project, chapter, contextPackage, finalText, preferredModelId).catch(error => ({ error: String(error) }))
    await onStage('story_state', { status: (storyStateUpdate as any)?.error ? 'failed' : 'success', error: (storyStateUpdate as any)?.error || '' })
    await createNovelReview(activeWorkspace, {
      project_id: projectId,
      review_type: 'prose_quality',
      status: selfCheck?.review?.passed === false || Number(selfCheck?.review?.score || 100) < 78 ? 'warn' : 'ok',
      summary: `章节群质检评分 ${selfCheck?.review?.score ?? '-'}`,
      issues: Array.isArray(selfCheck?.review?.issues) ? selfCheck.review.issues.map((issue: any) => `${issue.severity || 'medium'}｜${issue.description || issue}`) : [],
        payload: JSON.stringify({ chapter_id: chapter.id, context_package: contextPackage, editor_rewrite: editorRewrite, meme_polish: memePolish, readability_review: readabilityReview, self_check: selfCheck, reference_report: referenceReport, safety_decision: safetyDecision, migration_audit: migrationAudit, production_mode: productionMode, config_snapshot: configSnapshot }),
      })
    const settingViolations = Array.isArray(selfCheck?.review?.setting_violations) ? selfCheck.review.setting_violations : []
    if (contextPackage?.setting_context?.chapter_usage?.length || settingViolations.length > 0) {
      await createNovelReview(activeWorkspace, {
        project_id: projectId,
        review_type: 'setting_consistency',
        status: settingViolations.length > 0 ? 'warn' : 'ok',
        summary: settingViolations.length > 0 ? `设定一致性发现 ${settingViolations.length} 项风险` : '设定一致性随章节质检通过',
        issues: settingViolations.map((issue: any) => `${issue.severity || 'medium'}｜${issue.description || issue.setting_name || issue.type || '设定风险'}`),
        payload: JSON.stringify({
          chapter_id: chapter.id,
          chapter_no: chapter.chapter_no,
          source: 'prose_quality_self_check',
          setting_context: contextPackage.setting_context,
          setting_violations: settingViolations,
          craft_metrics: selfCheck?.review?.craft_metrics || {},
        }),
      })
    }
    const story_state_update: any = storyStateUpdate || {}
    const storyStateUpdateWithSync = {
      ...story_state_update,
      storyline_sync: story_state_update.storyline_sync,
      story_unit_sync: story_state_update.story_unit_sync,
      signature_scene_sync: story_state_update.signature_scene_sync,
      chapter_benchmark_sync: story_state_update.chapter_benchmark_sync,
      volume_beat_sync: story_state_update.volume_beat_sync,
    }
    return {
      chapter: updated,
      score: selfCheck?.review?.score ?? null,
      revised: Boolean(selfCheck?.revised),
      editor_rewrite: editorRewrite,
      meme_polish: memePolish,
      readability_review: readabilityReview,
      production_mode: productionMode,
      completed_stage: 'story_state',
      reference_report: referenceReport,
      safety_decision: safetyDecision,
      migration_audit: migrationAudit,
      story_state_update: storyStateUpdateWithSync,
      config_snapshot: configSnapshot,
    }
  }

  return {
    buildParagraphProseContext,
    buildChapterContextPackage,
    generateSceneCardsForChapter,
    updateStoryStateMachine,
    getStoredOrBuiltWritingBible,
    runCommercialEditorRewrite,
    runMemePolish,
    runReadabilityReview,
    runProseSelfReviewAndRevision,
    ensureProseMeetsWordTarget,
    generateChapterForGroup,
  }
}

export type NovelWritingService = ReturnType<typeof createNovelWritingService>
