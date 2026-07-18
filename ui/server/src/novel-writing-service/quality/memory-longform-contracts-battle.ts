import { asArray, parseJsonLikePayload } from '../../routes/novel-route-utils'
import { mergeEstablishedEvents, projectCanonFactsFromEvents } from '../../novel-writing/established-event-canon'
import { normalizeLongformCompass } from '../../novel-writing/longform-compass'
import { reviewTimestamp } from './review-lookup'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

export function isLongformBattleLaneRisk(status: string, score: number | null) {
  const normalized = status.toLowerCase()
  if (['block', 'blocked', 'warn', 'warning', 'needs_action', 'risk'].includes(normalized)) return true
  if (Number.isFinite(Number(score)) && Number(score) < 78) return true
  return false
}

export function normalizeLongformBattleLane(item: any) {
  if (typeof item === 'string') {
    const detail = compactBriefText(item)
    if (!detail) return null
    return {
      key: detail,
      label: detail,
      status: 'warn',
      score: null,
      detail,
      required_action: '',
    }
  }
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

export function normalizeLongformBattleContext(value: any) {
  const raw = value?.longform_battle_context || value?.longformBattleContext || value?.longform_battle_desk || value?.longformBattleDesk || value || {}
  const lanes = asArray(raw.lanes).map(normalizeLongformBattleLane).filter(Boolean).slice(0, 8)
  const explicitRiskLanes = [
    ...asArray(raw.risk_lanes || raw.riskLanes),
    ...asArray(raw.risk_items || raw.riskItems || raw.risks),
  ]
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
    ...asArray(raw.risk_items),
    ...asArray(raw.riskItems),
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

export function longformBattleContextFromContext(contextPackage: any = {}, preDraftBrief: any = null, chapter: any = {}) {
  const target = {
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const brief = preDraftBrief
    || contextPackage?.pre_draft_brief
    || contextPackage?.preDraftBrief
    || target?.pre_draft_brief
    || target?.preDraftBrief
    || chapter?.raw_payload?.pre_draft_brief
    || chapter?.raw_payload?.preDraftBrief
    || {}
  return target.longform_battle_context
    || target.longformBattleContext
    || target.longform_battle_desk
    || target.longformBattleDesk
    || brief.longform_battle_context
    || brief.longformBattleContext
    || brief.longform_battle_desk
    || brief.longformBattleDesk
    || contextPackage?.longform_battle_context
    || contextPackage?.longformBattleContext
    || contextPackage?.longform_battle_desk
    || contextPackage?.longformBattleDesk
    || chapter?.raw_payload?.longform_battle_context
    || chapter?.raw_payload?.longformBattleContext
    || chapter?.raw_payload?.longform_battle_desk
    || chapter?.raw_payload?.longformBattleDesk
    || null
}

export function latestLongformCompassFromReviews(reviews: any[]) {
  const review = reviews
    .filter(item => item?.review_type === 'longform_creation_diagnosis')
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0]
  const payload = parseJsonLikePayload(review?.payload) || {}
  const report = payload.report || payload.result?.report || payload
  return normalizeLongformCompass(report?.compass || report?.longform_compass || null)
}

export function normalizeNextBatchChapter(item: any) {
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

export function normalizeNextBatchChecklistItem(item: any) {
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

export function chapterNosBrief(chapterNos: any[] = []) {
  return asArray(chapterNos)
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => chapterNo > 0)
    .map((chapterNo: number) => `第${chapterNo}章`)
    .join('、')
}

const OH_STORY_NEXT_BATCH_WORKFLOW_RULES = [
  '快速上下文加载：如已部署 story-explorer，先用 context_load 批量加载第 N 章写作上下文；agent 不可用或返回不完整时回退到手动加载；手动加载兜底表：追踪/上下文.md 缺失时从 追踪/伏笔.md + 追踪/时间线.md 重建，追踪/伏笔.md 缺失可跳过，追踪/时间线.md 缺失可从正文推断，大纲/细纲_第{N}章.md 缺失必须先补建；确定本轮写作范围后直接进入 Step 2，不做“是否继续”式确认；确定下一章编号 N 时优先读取追踪/上下文.md 的“最后完成章节”并 +1，文件不存在时扫描 正文/ 目录中编号最大的章节 +1；K 默认 2-3 章，用户明确说“只写1章”“日更3章”或“逐章确认”时按用户要求调整。',
  '继续/续写/日更只表示继续当前日更批量流程，不得解释为跳过写前准备的直接正文续写。',
  '读取细纲时，新版细纲优先读取内容概括、情节安排、人物关系和出场顺序、情节细化、结尾设定和钩子；从细纲中提取本章涉及的角色名，按需加载 设定/角色/{角色名}.md，细纲未列出角色时跳过，不凭聊天记忆补名单；按需加载创作公式：只有本章需要期待感公式、爽点公式、信息差公式或题材结构骨架时，才读取 references/genre-writing-formulas.md，默认不加载，避免无条件加载 1500+ 行文件浪费 token；旧版细纲缺这些字段不阻塞，回退到核心事件、目标情绪、章首/章尾钩子和字数目标。',
  '细纲缺失补建流程：细纲不存在时不能直接写正文；先读取大纲/卷纲_当前卷.md、设定/角色/{角色名}.md和最新一章正文，按新版细纲模板补齐内容概括、情节安排、人物关系/出场顺序、情节细化、结尾设定；无法确认字段写 [待补充]，不杜撰。',
  'Step 2.1 标题预检：每章开写前扫描既有章节标题；如本章标题同名或明显重复，先按本章核心事件改名，可参考冲突转折、关键资产或章尾钩子，并同步细纲标题与正文文件名。',
  '新版细纲进入意图确认时：内容概括决定起承转合，情节安排决定主线/辅线/事件线/感情线/逻辑线取舍，人物关系和出场顺序决定镜头进入顺序，情节细化决定代价兑现/收益兑现，结尾设定和钩子决定章尾承接。',
  'Step 2.3 对标召回：每章写前必须尝试读取剧情/情绪模块.md、剧情/节奏.md、文风.md和匹配章节摘要；情绪模块/节奏参照优先，文风.md 只管表达层；gaps/conflict 必须进入意图确认，不得用文风接近掩盖模块或节奏缺失；无 story-explorer 时降级：story-explorer 不可用或返回不完整时，主会话必须手动按对标书路径查找，先读 剧情/情绪模块.md 选 selected_emotion_module，再读 剧情/节奏.md 选 rhythm_reference，再读 文风.md + grep 章节/*_摘要.md 的「基调」字段找匹配章并读取 第K章_摘要.md，第K章_深度拆解.md 不存在时改读 第1-3章_深度拆解.md 中最接近基调的一章，模块/节奏缺失先判定 v12 vs legacy：v12 停止修复，legacy 才回退继续。',
  '对标缺口分流：gaps.no_benchmark 只标记无对标参考；missing_primary_contract/profile_missing 必须停止本章准备并按 repair_action 修复，不得进入 narrative-writer；只有 legacy_deconstruction 下的 module_missing/rhythm_missing 才能低置信回退到拆文报告、文风技巧、匹配章摘要或剧情/故事线；matched_deep_dive_missing 必须保留为回退说明，不得在后续报告中反转为 false。',
  'Step 2.4 craft：爽点出手前先铺可指认的危机/期待，不铺=空洞；装逼/打脸/揭露章必须把视角/信息差经出场顺序里的在场配角放大成差异化反应；高压/生死/悲痛 beat 下轻快声线让位，信息型配角不当科普嘴，对话逐句承接对方情绪。',
  '字数验证：每章正文生成后优先 Python 字符统计，wc -m 仅作 Unix 备选；低于目标 90% 时必须强制扩充，把缺口补成子事件、动作过程、选择代价、对话交锋和章尾钩子铺垫，不得均匀注水或堆环境描写。',
  '资料研究按需：写作中遇到历史年代、地理方位、职业细节、法律/医疗/技术流程、真实机构或真实地名等外部事实时，暂停正文推进，调用 story-researcher 或记录到参考资料/；研究完成后再继续写作，无法确认则标记待查证、改成架空/模糊表达或角色待验证线索，不得编造确定事实。',
  '不得跳过 Step 2.2 状态筛选或 Step 2.3 文风召回；每章写前都要重新确认来源、状态、文风召回和意图确认。',
  'Step 2.2 来源边界：“已加载”只承认本轮 workflow 内实际读取或刚更新的细纲、上一章正文/追踪文件/角色状态；不得用未标明来源的聊天记忆替代。',
  '首次日更兜底：如果追踪文件全部为空或不存在，额外读取大纲/卷纲_当前卷.md和最新一章正文来重建上下文；不得把缺失的追踪/上下文.md当作可以跳过上一章承接的理由。',
  '必须串行逐章写作，不得并发生成多章；下一章必须读取上一章刚写入的正文、回执和追踪更新后再开始。',
  '每章写完立即更新追踪/伏笔.md、追踪/时间线.md、追踪/角色状态.md 和追踪/上下文.md；追踪/上下文.md 只更新进度元信息、当前位置、已写字数和本次变更，不写详细角色状态/伏笔内容；批次最终进度摘要必须补齐固定结构：## 写作进度，最后完成章节、更新时间、本期完成；## 当前状态，活跃伏笔、角色状态、下一章细纲状态、注意事项；超过30章时，已写内容摘要按三层结构维护，压缩早期章节、保留近期细节：近5章详记、十章概要、卷级总览；每50章或卷结束做轻量归档到追踪/归档，活跃伏笔、时间线、角色状态仍以当前文件为准，不移入归档。',
  '章间不重复询问是否继续，除非用户明确要求逐章确认、章节号冲突、细纲缺失/冲突、请求范围越界、用户要求改变大纲/追踪或出现会导致写错的阻塞信息。',
  '批量写作模式跳过单章 story-review lean 提示；本批全部写完后再统一执行 Phase 5 质量检查，Phase 5 对照细纲核对：新版细纲核对内容概括五段式、情节安排多线、人物关系变化/出场顺序、代价兑现/收益兑现；旧版细纲只核对核心事件、目标情绪、章首/章尾钩子和字数目标；伏笔盘点仅本轮增量：确认本批新增/推进/回收的伏笔已写入追踪/伏笔.md并更新状态，不得通读所有 session 或扫描全部正文做全量伏笔审计；避免每章后打断连写。',
  'Phase 5 完整检查清单：本批完成后必须做禁用词扫描、标题去重检查、正文元信息扫描和章尾钩子检查；禁用词、重复标题、工程词或章尾无钩子命中时必须回对应正文或细纲修复，不能只在报告里声明通过。',
  'Phase 5 确定性收尾：主会话在本批实际落盘正文上运行 normalize-punctuation.js，再运行 check-ai-patterns.js --check；命中高危 AI 句式时回正文改掉并复扫到 0；narrative-writer agent 不运行这些脚本。',
]

export function normalizeDefaultFiveChapterRegression(value: any) {
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

export function normalizeDefaultFiveChapterLaneTemplateFailedRequirements(value: any) {
  return asArray(value?.failed_requirements || value?.failedRequirements || value?.template_version_failed_requirements || value?.templateVersionFailedRequirements)
    .map((item: any) => ({
      key: compactBriefText(item?.key),
      label: compactBriefText(item?.label || item?.name || item?.key),
      failure_reason: compactBriefText(item?.failure_reason || item?.failureReason || item?.reason),
      failed_count: Number(item?.failed_count ?? item?.failedCount ?? 1),
    }))
    .filter((item: any) => item.key || item.label || item.failure_reason)
    .slice(0, 8)
}

export function normalizeDefaultFiveChapterLaneTemplateProductionRelapseReview(value: any, fallback: any = {}) {
  const raw = value?.production_relapse_review || value?.productionRelapseReview || value || {}
  if (!raw || raw.visible === false) return null
  const failedRequirements = normalizeDefaultFiveChapterLaneTemplateFailedRequirements(raw)
  const fallbackFailedRequirements = asArray(fallback.failed_requirements || fallback.failedRequirements)
  const normalized = {
    template_version_id: compactBriefText(raw.template_version_id || raw.templateVersionId || fallback.template_version_id || fallback.templateVersionId),
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
    failure_reasons: asArray(raw.failure_reasons || raw.failureReasons)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
      .slice(0, 8),
    failed_requirements: failedRequirements.length ? failedRequirements : fallbackFailedRequirements.slice(0, 8),
    summary: compactBriefText(raw.summary || fallback.summary),
  }
  const hasContent = normalized.template_version_id
    || normalized.default_batch_chapter_nos.length
    || normalized.restore_chapter_nos.length
    || normalized.validation_chapter_nos.length
    || normalized.failure_reasons.length
    || normalized.failed_requirements.length
    || normalized.summary
  return hasContent ? normalized : null
}

export function normalizeDefaultFiveChapterLaneTemplate(value: any) {
  const raw = value?.default_five_chapter_lane_template || value?.defaultFiveChapterLaneTemplate || value || {}
  if (!raw || raw.visible === false) return null
  const requirements = asArray(raw.requirements || raw.items)
    .map((item: any) => ({
      key: compactBriefText(item?.key),
      label: compactBriefText(item?.label || item?.name || item?.key),
      status: compactBriefText(item?.status || 'fulfilled'),
      verification_requirement: compactBriefText(item?.verification_requirement || item?.verificationRequirement || item?.detail),
    }))
    .filter((item: any) => item.key || item.label || item.verification_requirement)
    .slice(0, 8)
  const repairedMissingRequirements = asArray(
    raw.repaired_missing_requirements
      || raw.repairedMissingRequirements
      || raw.missing_requirements
      || raw.missingRequirements,
  )
    .map((item: any) => ({
      key: compactBriefText(item?.key),
      label: compactBriefText(item?.label || item?.name || item?.key),
      chapter_nos: asArray(item?.chapter_nos || item?.chapterNos || item?.chapters)
        .map((chapterNo: any) => Number(chapterNo))
        .filter((chapterNo: number) => chapterNo > 0)
        .slice(0, 10),
    }))
    .filter((item: any) => item.key || item.label || item.chapter_nos.length)
    .slice(0, 8)
  const repairActions = uniqueBriefStrings(raw.repair_actions || raw.repairActions || [], 8)
  const redesignedTemplates = asArray(raw.redesigned_templates || raw.redesignedTemplates || raw.templates)
    .map((item: any) => ({
      key: compactBriefText(item?.key),
      label: compactBriefText(item?.label || item?.name || item?.key),
      template: compactBriefText(item?.template || item?.rewrite || item?.instruction || item?.text || item?.detail),
    }))
    .filter((item: any) => item.key || item.label || item.template)
    .slice(0, 8)
  const validationStandard = uniqueBriefStrings(raw.validation_standard || raw.validationStandard || [], 8)
  const requiredReceipts = uniqueBriefStrings(raw.required_receipts || raw.requiredReceipts || raw.receipts || [], 8)
  const failedRequirements = normalizeDefaultFiveChapterLaneTemplateFailedRequirements(raw)
  const templateVersionId = compactBriefText(
    raw.template_version_id
    || raw.templateVersionId
    || raw.template_version?.id
    || raw.templateVersion?.id,
  )
  const productionRelapseReview = normalizeDefaultFiveChapterLaneTemplateProductionRelapseReview(raw, {
    template_version_id: templateVersionId,
    failed_requirements: failedRequirements,
    summary: raw.summary,
  })
  const topFailedRaw = raw.top_failed_requirement || raw.topFailedRequirement || null
  const topFailedRequirement = topFailedRaw && typeof topFailedRaw === 'object' && !Array.isArray(topFailedRaw)
    ? {
      key: compactBriefText(topFailedRaw.key),
      label: compactBriefText(topFailedRaw.label || topFailedRaw.key),
      failed_count: Number(topFailedRaw.failed_count ?? topFailedRaw.failedCount ?? 0),
      failure_reason: compactBriefText(topFailedRaw.failure_reason || topFailedRaw.failureReason),
    }
    : null
  const normalized = {
    visible: true,
    status: compactBriefText(raw.status || 'fulfilled'),
    label: compactBriefText(raw.label || '默认5章档位模板回检'),
    source: compactBriefText(raw.source || ''),
    redesign_source: compactBriefText(raw.redesign_source || raw.redesignSource),
    source_run_id: raw.source_run_id ?? raw.sourceRunId ?? null,
    repaired_at: compactBriefText(raw.repaired_at || raw.repairedAt),
    template_version_id: templateVersionId,
    production_relapse_count: Number(raw.production_relapse_count ?? raw.productionRelapseCount ?? 0),
    production_relapse_review: productionRelapseReview,
    summary: compactBriefText(raw.summary || ''),
    segment_duty_rewrite: compactBriefText(raw.segment_duty_rewrite || raw.segmentDutyRewrite),
    conflict_rotation: compactBriefText(raw.conflict_rotation || raw.conflictRotation),
    payoff_density: compactBriefText(raw.payoff_density || raw.payoffDensity),
    ending_hook_template: compactBriefText(raw.ending_hook_template || raw.endingHookTemplate),
    top_failed_requirement: topFailedRequirement,
    redesigned_templates: redesignedTemplates,
    validation_standard: validationStandard,
    required_receipts: requiredReceipts,
    failed_requirements: failedRequirements,
    repaired_missing_requirements: repairedMissingRequirements,
    repair_actions: repairActions,
    requirements,
  }
  const hasContent = normalized.summary
    || normalized.segment_duty_rewrite
    || normalized.conflict_rotation
    || normalized.payoff_density
    || normalized.ending_hook_template
    || normalized.redesign_source
    || normalized.template_version_id
    || normalized.production_relapse_count
    || normalized.production_relapse_review
    || normalized.redesigned_templates.length
    || normalized.validation_standard.length
    || normalized.required_receipts.length
    || normalized.failed_requirements.length
    || normalized.repaired_missing_requirements.length
    || normalized.repair_actions.length
    || normalized.requirements.length
  return hasContent ? normalized : null
}

