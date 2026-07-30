import { createHash } from 'crypto'
import {
  appendNovelRun,
  createNovelReview,
  listChapterVersions,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  listNovelWorldbuilding,
  updateNovelChapter,
} from '../../novel'
import { executeNovelAgent, previewNovelKnowledgeInjection } from '../../llm'
import { asArray, buildLLMResultDiagnostics, clampScore, extractLLMText, getNovelPayload, getSafetyPolicy, normalizeIssue, parseJsonLikePayload, safeJsonStringify } from '../novel-route-utils'
import { mergeProseQualityWithDeliveryRisks } from '../../novel-writing/prose-quality-delivery-link'
import { collectPlanAlignmentPatchesAfterProseChange, collectProjectPlanAlignmentPatches } from '../../novel-writing/chapter-plan-from-prose'
import { buildLiveContractChapterPatch, collectClosedBeatFamiliesFromChapters } from '../../novel-writing/closed-beat-canon'
import {
  deliveryRiskMissedCount,
  deslopRepairReceiptCount,
  qualityAuditRepairReceiptCount,
} from './builders-quality-receipt-helpers'
import { editorJson } from './builders-json'

export function buildEditorReportPrompt({
  project,
  contextPackage,
  chapter,
  latestQuality,
  latestReference,
  deliveryRiskBrief,
}: {
  project: any
  contextPackage: any
  chapter: any
  latestQuality: any
  latestReference: any
  deliveryRiskBrief?: any
}) {
  return [
    '任务：生成商用编辑部风格的章节编辑报告。只输出 JSON。',
    `项目：${project.title}`,
    '检查维度：结构审稿、连续性审稿、节奏审稿、文风审稿、原创性审稿、商业审稿。',
    '每个维度输出 score, verdict, issues(array), revision_actions(array), accept_criteria(array)。',
    '如果存在交稿风险清单，报告 must_fix 和 one_click_revision_prompt 必须优先覆盖这些风险，不得只做普通润色。',
    '最后输出 overall_score, must_fix, optional_improvements, one_click_revision_prompt。',
    '【上下文包】',
    editorJson(contextPackage, 9000),
    '【交稿风险清单】',
    editorJson(deliveryRiskBrief || {}, 5000),
    '【章节正文】',
    String(chapter.chapter_text || '').slice(0, 14000),
    '【已有质检】',
    editorJson({ latestQuality, latestReference }, 4000),
  ].join('\n')
}

const REVISION_MODE_GUIDE: Record<string, string> = {
  from_report: '按报告综合修订，优先处理高严重度问题。',
  expand_action: '重点补足战斗、追逐、清剿、灾祸或强冲突过程。必须写出动作起手、空间位置、对手反应、受伤/资源损耗/信息暴露、反制动作和结果。',
  cut_description: '重点压缩不推动剧情的环境描写和连续氛围段落。保留影响动作空间、诡异规则、危险判断的描写。',
  tighten_pacing: '重点提高事件密度，删掉空泛总结和重复解释。每 3-5 段必须有行动、选择、信息变化或关系变化。',
  add_consequence: '重点补充行动后果，包括伤势、物品损耗、暴露秘密、角色关系变化、规则代价。',
  restore_hook: '重点强化章末钩子，同时保持前文因果自然。',
}

function compactWorkflowRevisionContextValue(value: any, max = 1200) {
  if (value === null || value === undefined || value === '') return ''
  const text = typeof value === 'string' ? value : editorJson(value)
  return String(text || '').slice(0, max)
}

export function buildWorkflowRevisionContextBrief(contextPackage: any = {}, chapter: any = {}) {
  if (!contextPackage || typeof contextPackage !== 'object') return null
  const continuity = contextPackage.continuity || {}
  const chapterTarget = contextPackage.chapter_target || contextPackage.chapterTarget || {}
  const storyState = contextPackage.story_state || contextPackage.storyState || {}
  const brief = {
    previous_chapter: compactWorkflowRevisionContextValue(
      continuity.previous_chapter || continuity.previousChapter || contextPackage.previous_chapter || contextPackage.previousChapter || chapterTarget.previous_handoff || chapterTarget.previousHandoff,
    ),
    current_chapter: compactWorkflowRevisionContextValue({
      chapter_no: chapter.chapter_no,
      title: chapter.title,
      goal: chapterTarget.chapter_goal || chapterTarget.goal || chapterTarget.summary || chapter.chapter_goal || chapter.chapter_summary,
      conflict: chapterTarget.conflict || chapter.conflict,
      ending_hook: chapterTarget.ending_hook || chapter.ending_hook,
    }),
    next_chapter: compactWorkflowRevisionContextValue(
      continuity.next_chapter || continuity.nextChapter || contextPackage.next_chapter || contextPackage.nextChapter || chapterTarget.next_chapter_handoff || chapterTarget.nextChapterHandoff,
    ),
    outline: compactWorkflowRevisionContextValue(
      contextPackage.chapter_outline || contextPackage.chapterOutline || contextPackage.outline || contextPackage.current_outline || contextPackage.currentOutline || chapterTarget.chapter_blueprint || chapterTarget.chapterBlueprint,
    ),
    foreshadowing: compactWorkflowRevisionContextValue(
      contextPackage.foreshadowing_context || contextPackage.foreshadowingContext || contextPackage.foreshadowing || storyState.foreshadowing || storyState.foreshadowings,
    ),
    character_cards: compactWorkflowRevisionContextValue(
      contextPackage.character_cards || contextPackage.characterCards || contextPackage.relevant_characters || contextPackage.relevantCharacters || storyState.characters,
    ),
    timeline: compactWorkflowRevisionContextValue(
      contextPackage.timeline_context || contextPackage.timelineContext || contextPackage.timeline || storyState.timeline || storyState.events,
    ),
    setting_context: compactWorkflowRevisionContextValue(
      contextPackage.setting_context || contextPackage.settingContext || contextPackage.worldbuilding || storyState.setting_context || storyState.settingContext,
    ),
    relationship_boundaries: compactWorkflowRevisionContextValue(
      contextPackage.relationship_graph || contextPackage.relationshipGraph || contextPackage.character_relation_contract || contextPackage.characterRelationContract,
    ),
  }
  const compactBrief = Object.fromEntries(Object.entries(brief).filter(([, value]) => Boolean(value)))
  return Object.keys(compactBrief).length ? compactBrief : null
}


export function composeRevisionPromptHint({
  userPrompt,
  report,
  mustFixLines = [],
}: {
  userPrompt?: string
  report?: any
  mustFixLines?: string[]
}) {
  const custom = String(userPrompt || '').replace(/\s+/g, ' ').trim()
  const systemHint = String(report?.one_click_revision_prompt || asArray(mustFixLines).join('；') || '').replace(/\s+/g, ' ').trim()
  if (custom && systemHint) {
    return [
      '【人工强制修订指令（最高优先级，必须先兑现）】',
      custom,
      '【报告必修项（仍须覆盖，不得因人工指令被整体忽略）】',
      systemHint,
      '执行要求：先完成人工强制指令，再覆盖报告必修项；不得只做无关润色；revision_receipts 必须写明人工指令的落实证据。',
    ].join('\n')
  }
  if (custom) {
    return [
      '【人工强制修订指令（最高优先级，必须先兑现）】',
      custom,
      '执行要求：必须先兑现人工强制指令，并在 revision_summary / revision_receipts 写明落实证据。',
    ].join('\n')
  }
  return systemHint
}

const REVISION_LANGUAGE_HARD_RULE = '语言硬约束：中文网文正文禁止夹杂英文粘连词、拼音碎片、葡萄牙语或整段外语；若报告或人工指令要求清英文/清外语，必须逐处替换为自然简体中文，必要专名除外，并在 revision_receipts 给出改写证据。'
const REVISION_JSON_OUTPUT_HARD_RULE = 'JSON 格式硬约束：只输出一个可直接 JSON.parse 的 JSON object，不要输出 Markdown 代码围栏或解释；正文对白优先使用中文引号“”；若必须使用英文双引号，英文双引号必须转义并遵守 JSON 规则。'

export function buildEditorRevisionPrompt({
  project,
  chapter,
  contextPackage,
  report,
  deliveryRiskBrief,
  revisionMode,
  userPrompt,
}: {
  project: any
  chapter: any
  contextPackage?: any
  report: any
  deliveryRiskBrief?: any
  revisionMode: string
  userPrompt?: string
}) {
  const originalText = String(chapter.chapter_text || '')
  const originalLength = originalText.length
  const workflowRevisionContextBrief = buildWorkflowRevisionContextBrief(contextPackage, chapter)
  const strategy = String(report?.revision_strategy || deliveryRiskBrief?.revision_strategy || 'surgical_patch')
  const structural = strategy === 'structural_rewrite'
  const openingStructural = strategy === 'opening_structural_patch'
  const focusedRiskBrief = focusDeliveryRiskBriefForRevision(deliveryRiskBrief || {}, report || {})
  const mustFixLines = uniqueRevisionTexts(report?.must_fix || report?.one_click_revision_prompt, 6)
  const revisionPromptHint = composeRevisionPromptHint({ userPrompt, report, mustFixLines })
  if (openingStructural) {
    const replaceableOpening = originalText.slice(0, Math.min(1400, Math.max(700, Math.floor(originalLength * 0.24))))
    const resumeHint = originalText.slice(replaceableOpening.length, replaceableOpening.length + 180).trim()
    return [
      '任务：只修本章开篇连续性（章末主钩子/进度回放）。只输出 JSON。禁止输出完整 chapter_text。',
      `项目：${project.title}`,
      '要求：开篇前 300-800 字必须先承接上一章真正章末钩子；禁止先重播上一章中段平行戏或已兑现冲突。',
      `本次修订模式：${revisionMode}。opening_structural_patch = 只重写开篇，其余正文尽量保留。`,
      `原文长度：${originalLength} 字。不要为了修开篇而重写整章。`,
      REVISION_LANGUAGE_HARD_RULE,
      REVISION_JSON_OUTPUT_HARD_RULE,
      '硬优先级（只修这些）：',
      ...mustFixLines.map((item, index) => `${index + 1}. ${item}`),
      '推荐输出方式（二选一，优先 A）：',
      'A) opening_rewrite + keep_from：opening_rewrite=新开篇；keep_from=原文后段唯一短锚点（从下方“可保留接续锚点”复制）。',
      'B) replacements：1-2 条，find 必须从“可替换开篇区”精确复制，replace 为新开篇。',
      '【可替换开篇区】',
      replaceableOpening,
      resumeHint ? '【可保留接续锚点候选】' : '',
      resumeHint || '',
      '【必修项】',
      editorJson({ must_fix: mustFixLines, revision_strategy: 'opening_structural_patch', overall_score: report?.overall_score }, 2500),
      '【聚焦交稿风险】',
      editorJson(focusedRiskBrief || {}, 2500),
      workflowRevisionContextBrief ? '【上下文摘要】' : '',
      workflowRevisionContextBrief ? editorJson({
        previous_chapter: workflowRevisionContextBrief.previous_chapter,
        current_chapter: workflowRevisionContextBrief.current_chapter,
      }, 3500) : '',
      '【修订提示】',
      revisionPromptHint,
      '输出 JSON 示例：',
      '{"revision_mode":"opening_structural_patch","opening_rewrite":"新开篇正文...","keep_from":"原文唯一短锚点","revision_summary":"开篇改接章末主钩子，去掉平行戏回放"}',
    ].filter(Boolean).join('\n')
  }
  if (structural) {
    return [
      '任务：根据质检/交付风险对当前章节做结构修订。只输出 JSON。',
      `项目：${project.title}`,
      '要求：优先消除进度回放、章首承接失败、章末交接缺口；可以改写开篇与中段冲突，但必须承接上一章已兑现事实，不得重演已打完的高潮。',
      `本次修订模式：${revisionMode}。结构修订允许较大改动，不只是润色。`,
      `原文长度：${originalLength} 字。若因消除回放导致字数变化超过 30%，revision_scope_guard.over_limit=true，但仍应完成本次结构修复。`,
      REVISION_LANGUAGE_HARD_RULE,
      REVISION_JSON_OUTPUT_HARD_RULE,
      '硬优先级（只修这些，不要同时处理全部交稿标签）：',
      ...mustFixLines.map((item, index) => `${index + 1}. ${item}`),
      '正文工艺硬约束：动作链完整；不要用环境描写替代推进；章末必须留下未解决钩子。',
      '禁止把“无需修改/处理得精彩”之类低优先级意见覆盖高优先级回放修复。',
      '输出策略：优先输出完整 chapter_text；只有改动极少时才改用 replacements。',
      '【必修项】',
      editorJson({ must_fix: mustFixLines, revision_strategy: 'structural_rewrite', overall_score: report?.overall_score }, 4000),
      '【聚焦交稿风险】',
      editorJson(focusedRiskBrief || {}, 3500),
      workflowRevisionContextBrief ? '【上下文摘要】' : '',
      workflowRevisionContextBrief ? editorJson({
        previous_chapter: workflowRevisionContextBrief.previous_chapter,
        current_chapter: workflowRevisionContextBrief.current_chapter,
        next_chapter: workflowRevisionContextBrief.next_chapter,
        outline: workflowRevisionContextBrief.outline,
      }, 5000) : '',
      '【修订提示】',
      revisionPromptHint,
      '【原章节正文】',
      originalText.slice(0, 14000),
      '输出 JSON：',
      '{',
      '  "revision_mode": "structural_rewrite",',
      '  "chapter_text": "完整修订后正文",',
      '  "continuity_notes": ["修订后的连续性说明"],',
      '  "revision_scope_guard": {"original_word_count": 0, "revised_word_count": 0, "word_delta": 0, "over_limit": false, "action": "结构修订"},',
      '  "revision_receipts": [{"required_action": "对应必修项", "repair_segment": "opening|middle|ending|global", "applied_fix": "实际改法", "changed_evidence": "修后正文短句"}],',
      '  "revision_summary": "简述如何消除回放并承接上一章"',
      '}',
    ].filter(Boolean).join('\n')
  }
  return [
    '任务：根据商业编辑报告对当前章节做局部修订补丁。只输出 JSON。',
    `项目：${project.title}`,
    '要求：保留当前章节整体结构、节奏、章末钩子和可用文气；只修复报告指出的问题；不得照搬参考作品。',
    `本次修订模式：${revisionMode}。${REVISION_MODE_GUIDE[revisionMode] || REVISION_MODE_GUIDE.from_report}`,
    REVISION_LANGUAGE_HARD_RULE,
    REVISION_JSON_OUTPUT_HARD_RULE,
    `oh-story workflow-revision：本次属于已写章节大修/回炉；修订前按 Step 2 做上下文对照，修订后按 Step 4 做级联检查和 Step 5 质量检查。`,
    `原文长度：${originalLength} 字；修订后字数差异超过原文 30% 或超过 800 字（取较大值）时，必须在 revision_scope_guard 标记 over_limit=true 并说明是否需要拆成局部二修。`,
    'workflow-revision 上下文对照：必须逐项核对 previous_chapter、current_chapter、next_chapter 或下一章细纲、foreshadowing、character_cards、timeline、setting_context、资产归属和关系边界；缺来源时 status=warn/fail，不得假设已经一致。',
    '正文工艺硬约束：不要用环境描写替代剧情推进；涉及战斗/行动时必须补足动作链、空间变化、代价和结果；删改时不得破坏连续性。',
    '级联检查硬约束：如果修订改变伏笔、时间线、角色状态、关系、资产归属或世界观设定，revision_receipts 必须写 affected_chapters 和 cascade_impacts，并说明后续章节或下一章细纲需要如何同步。',
    '质量检查硬约束：修订后必须做正文元信息扫描和禁用词扫描；标题行以外不得混入“上一章/本章/前文/伏笔/细纲/读者”等写作工程词，命中要改成角色当下可感知的事件锚点。',
    '交稿风险硬约束：如果交稿风险清单不为空，必须优先修复清单中的核心偏移、追读漏项、回报欠账、创新缺口、剧情线风险和出戏风险；不得只按普通润色处理。',
    '为了避免长连接失败，优先输出局部补丁，不要输出完整正文。',
    '补丁长度硬约束：每条 find/anchor 控制在 30-300 字，必须是原文中唯一可精确匹配的短片段；不要把整章或多段长正文塞进 find/anchor。需要大幅删减时拆成多条短 replacement；删除时 replace 允许为空字符串。',
    '【编辑报告】',
    editorJson(report, 7000),
    '【交稿风险清单】',
    editorJson(focusedRiskBrief || deliveryRiskBrief || {}, 5000),
    workflowRevisionContextBrief ? '【workflow-revision 上下文包】' : '',
    workflowRevisionContextBrief ? '以下片段来自 MangaForge 章节上下文包；修订前必须据此完成 Step 2 上下文对照，修订后在 revision_context_receipts 中逐项回执。' : '',
    workflowRevisionContextBrief ? editorJson(workflowRevisionContextBrief, 7000) : '',
    '【修订提示】',
    revisionPromptHint,
    '【原章节正文】',
    String(chapter.chapter_text || '').slice(0, 12000),
    '输出 JSON：',
    '{',
    '  "revision_mode": "patch",',
    '  "replacements": [{"find": "原文中可精确匹配的一小段", "replace": "替换后的文字"}],',
    '  "insertions": [{"anchor": "原文中可精确匹配的一小段", "position": "before|after", "text": "要插入的文字"}],',
    '  "continuity_notes": ["修订后的连续性说明"],',
    '  "revision_context_receipts": [{"key": "previous_chapter|next_chapter|foreshadowing|character_cards|timeline|setting_context|prose_meta|banned_words", "label": "核对项", "status": "pass|warn|fail", "evidence": "修订后正文或上下文证据", "fix": "仍需处理时的修复动作", "source_excerpt": "用于核对的原文/上下文短摘"}],',
    '  "revision_scope_guard": {"original_word_count": 0, "revised_word_count": 0, "word_delta": 0, "threshold": "max(原文30%, 800字)", "over_limit": false, "action": "局部修订/需要二修/提醒用户确认"},',
    '  "revision_receipts": [{"required_action": "对应报告或交稿风险的修订动作", "repair_segment": "opening|middle|ending|global", "applied_fix": "实际改法", "changed_evidence": "修订后正文可定位证据", "affected_chapters": [], "cascade_impacts": []}],',
    '  "revision_summary": "简述修了什么"',
    '}',
  ].filter(Boolean).join('\n')
}

export function buildCompactEditorRevisionPrompt({
  project,
  chapter,
  report,
  deliveryRiskBrief,
  revisionMode,
  userPrompt,
  previousOutputPreview,
}: {
  project: any
  chapter: any
  report: any
  deliveryRiskBrief?: any
  revisionMode: string
  userPrompt?: string
  previousOutputPreview?: string
}) {
  const mustFixLines = uniqueRevisionTexts(report?.must_fix || report?.one_click_revision_prompt, 6)
  const revisionPromptHint = composeRevisionPromptHint({ userPrompt, report, mustFixLines })
  const strategy = String(report?.revision_strategy || deliveryRiskBrief?.revision_strategy || '')
  const structural = strategy === 'structural_rewrite'
  const openingStructural = strategy === 'opening_structural_patch' || strategy === 'structural_rewrite'
  // Truncated full-chapter structural rewrite almost always needs opening-only retry, not another full chapter_text.
  if (openingStructural) {
    const originalText = String(chapter.chapter_text || '')
    const replaceableOpening = originalText.slice(0, Math.min(1200, Math.max(600, Math.floor(originalText.length * 0.22))))
    const resumeHint = originalText.slice(replaceableOpening.length, replaceableOpening.length + 160).trim()
    return [
      '上一次修订因输出过长被截断或不可解析。现在只修开篇连续性，禁止输出完整 chapter_text。',
      `项目：${project.title}`,
      '只处理最高优先级：开篇承接章末主钩子 / 禁止平行戏或进度回放。',
      '只输出一个可完整闭合的 JSON object。',
      '【必修项】',
      editorJson({ must_fix: uniqueRevisionTexts(report?.must_fix || report?.one_click_revision_prompt, 4), revision_strategy: 'opening_structural_patch' }, 1800),
      '【可替换开篇区】',
      replaceableOpening,
      resumeHint ? '【可保留接续锚点候选】' : '',
      resumeHint || '',
      REVISION_LANGUAGE_HARD_RULE,
      REVISION_JSON_OUTPUT_HARD_RULE,
      '【修订提示】',
      revisionPromptHint,
      previousOutputPreview ? '【上次失败输出预览】' : '',
      previousOutputPreview ? String(previousOutputPreview).slice(0, 800) : '',
      'JSON 示例：{"revision_mode":"opening_structural_patch","opening_rewrite":"新开篇...","keep_from":"原文短锚点","revision_summary":"开篇改接主钩子"}',
      '也可：{"revision_mode":"patch","replacements":[{"find":"开篇区唯一短锚点","replace":"新开篇片段"}],"revision_summary":"去掉回放"}',
    ].filter(Boolean).join('\n')
  }
  return [
    '任务：上一次修订输出被截断。现在只生成极短、可应用的 JSON 补丁。不要输出 Markdown，不要输出代码块，不要解释。',
    `项目：${project.title}`,
    `本次修订模式：${revisionMode}。${REVISION_MODE_GUIDE[revisionMode] || REVISION_MODE_GUIDE.from_report}`,
    REVISION_LANGUAGE_HARD_RULE,
    REVISION_JSON_OUTPUT_HARD_RULE,
    '硬性格式：只输出一个 JSON object，字段只允许 revision_mode, replacements, insertions, continuity_notes, revision_summary。',
    '硬性限制：禁止输出 chapter_text。最多 6 条 replacements，最多 3 条 insertions。',
    'replacement 限制：find 控制在 20-160 字，必须从原文精确复制且能唯一定位；replace 控制在 0-900 字。删除时 replace 用空字符串。不要把整段长正文塞进 find 或 replace。',
    'insertion 限制：anchor 控制在 20-160 字，text 控制在 20-900 字。',
    '如果修不完，只修最高优先级的 1-3 个问题，保证 JSON 完整闭合。',
    '【编辑报告】',
    editorJson(report, 3000),
    '【交稿风险清单】',
    editorJson(deliveryRiskBrief || {}, 2500),
    '【修订提示】',
    revisionPromptHint,
    '【上一次被截断输出片段，仅用于避免重复犯错】',
    String(previousOutputPreview || '').slice(0, 1200),
    '【原章节正文】',
    String(chapter.chapter_text || '').slice(0, 12000),
    'JSON 示例：{"revision_mode":"patch","replacements":[{"find":"原文中唯一短锚点","replace":""}],"insertions":[],"continuity_notes":[],"revision_summary":"修了最高优先级问题"}',
  ].join('\n')
}

function uniqueRevisionTexts(values: any, limit = 8) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of asArray(values)) {
    const text = String(raw ?? '').replace(/\s+/g, ' ').trim()
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
    if (out.length >= limit) break
  }
  return out
}

function isKeepAsIsRevisionIssue(issue: any) {
  const blob = [
    issue?.description,
    issue?.suggestion,
    issue?.fix,
    issue?.message,
    typeof issue === 'string' ? issue : '',
  ].map(item => String(item || '')).join('｜')
  return /无需修改|不判定为失误|不需要修改|维持当前|无需修订|无需改动/.test(blob)
}

/** Build a revision-facing report from prose_quality self_check, prioritizing delivery_link. */
export function buildProseQualityRevisionReport(selfCheckReview: any = {}) {
  const deliveryLink = selfCheckReview?.delivery_link || selfCheckReview?.deliveryLink || {}
  const selected = asArray(deliveryLink?.selected)
  const linkedDirectives = uniqueRevisionTexts([
    ...selected.map((item: any) => item?.directive || item?.label || item),
    ...asArray(selfCheckReview?.revision_directives || selfCheckReview?.revisionDirectives),
  ], 8)
  const highIssues = asArray(selfCheckReview?.issues)
    .filter((issue: any) => {
      if (isKeepAsIsRevisionIssue(issue)) return false
      const severity = String(issue?.severity || issue?.level || '').toLowerCase()
      return ['high', 'critical', 'blocker', 'must_fix', 'error'].includes(severity)
    })
    .map((issue: any) => String(issue?.fix || issue?.description || issue?.suggestion || issue?.message || issue || '').trim())
    .filter(Boolean)
  const optional = asArray(selfCheckReview?.issues)
    .filter((issue: any) => {
      if (isKeepAsIsRevisionIssue(issue)) return false
      const severity = String(issue?.severity || issue?.level || 'medium').toLowerCase()
      return !['high', 'critical', 'blocker', 'must_fix', 'error'].includes(severity)
    })
    .map((issue: any) => String(issue?.fix || issue?.description || issue?.suggestion || issue || '').trim())
    .filter(Boolean)
  const mustFix = uniqueRevisionTexts([...linkedDirectives, ...highIssues], 6)
  const selectedKeys = selected.map((item: any) => String(item?.key || item?.type || ''))
  const hasContinuityStructural = selectedKeys.some((key: string) => (
    key === 'progress_replay'
    || key === 'opening_hook_miss'
    || key.startsWith('handoff')
  )) || mustFix.some(item => /禁止回放|进度回放|超写|章首承接|章末交接|双死局|开篇未接|平行戏回放|物业合规/.test(item))
  const hasQualityStructural = selectedKeys.some((key: string) => key.startsWith('quality_audit'))
    || mustFix.some(item => /质量诊断|质量硬伤|全文重写|结构重排/.test(item))
  // Continuity/open-hook issues only need opening rewrite; full-chapter JSON rewrite often truncates.
  const revisionStrategy = hasContinuityStructural && !hasQualityStructural
    ? 'opening_structural_patch'
    : (hasContinuityStructural || hasQualityStructural)
      ? 'structural_rewrite'
      : 'surgical_patch'

  return {
    overall_score: Number(selfCheckReview?.score || 0) || null,
    must_fix: mustFix,
    optional_improvements: uniqueRevisionTexts(optional, 4),
    one_click_revision_prompt: mustFix.join('；'),
    prose_quality_review: selfCheckReview,
    delivery_link: deliveryLink,
    revision_strategy: revisionStrategy,
  }
}

export function focusDeliveryRiskBriefForRevision(brief: any = {}, report: any = {}) {
  const strategy = String(report?.revision_strategy || '')
  const mustFix = uniqueRevisionTexts(report?.must_fix || report?.one_click_revision_prompt, 6)
  if (!brief || typeof brief !== 'object') {
    return {
      total_count: mustFix.length,
      label: mustFix.length ? `待修复 ${mustFix.length}` : '无待修复风险',
      items: mustFix,
      revision_directives: mustFix,
      risks: mustFix.map(item => ({ count: 1, item, directive: item, priority_label: '优先修质量' })),
    }
  }
  const preferred = asArray(brief.risks).filter((risk: any) => {
    const blob = `${risk?.item || ''} ${risk?.directive || ''} ${risk?.priority_label || ''}`
    if (strategy === 'structural_rewrite' || strategy === 'opening_structural_patch') {
      return /质量|回放|交接|承接|核心|章首|章末|进度|开篇|平行|物业/.test(blob)
    }
    return true
  })
  const risks = (preferred.length ? preferred : asArray(brief.risks)).slice(0, (strategy === 'structural_rewrite' || strategy === 'opening_structural_patch') ? 5 : 8)
  const directives = uniqueRevisionTexts([
    ...mustFix,
    ...risks.map((risk: any) => risk?.directive || risk?.item),
    ...asArray(brief.revision_directives),
  ], (strategy === 'structural_rewrite' || strategy === 'opening_structural_patch') ? 6 : 10)
  return {
    ...brief,
    total_count: Math.min(Number(brief.total_count || 0) || directives.length, directives.length || Number(brief.total_count || 0)),
    items: uniqueRevisionTexts([
      ...mustFix,
      ...risks.map((risk: any) => risk?.item || risk?.directive),
      ...asArray(brief.items),
    ], 8),
    revision_directives: directives,
    risks,
    focused_for_revision: true,
    revision_strategy: strategy || 'surgical_patch',
  }
}
