export type GenerationPreflightRepairKind =
  | 'repair_all_auto'
  | 'repair_character_cards'
  | 'incubate_setting_workshop'
  | 'match_chapter_setting_usage'
  | 'sync_story_state'
  | 'replace_style_samples'
  | 'build_pre_draft_brief'
  | 'generate_scene_cards'
  | 'open_story_state_editor'
  | 'open_story_assets'
  | 'open_outline_tree'
  | 'edit_chapter'

export type GenerationPreflightRepairActionSpec = {
  key: string
  kind: GenerationPreflightRepairKind
  label: string
  description: string
  modelCall: boolean
  primary?: boolean
  reason: string
  targetChapterNo?: number
}

function asArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value : []
}

function text(value: any) {
  return String(value || '').trim()
}

export function generationPreflightChecks(payload: any) {
  const preflight = payload?.preflight || payload?.context_package?.preflight || {}
  return asArray(preflight.checks)
}

export function generationPreflightBlockers(payload: any) {
  const preflight = payload?.preflight || payload?.context_package?.preflight || {}
  return asArray(preflight.blockers).map(item => text(item)).filter(Boolean)
}

export function generationPreflightMissingKeys(payload: any) {
  return new Set(
    generationPreflightChecks(payload)
      .filter((check: any) => !check?.ok)
      .map((check: any) => text(check?.key))
      .filter(Boolean),
  )
}

export function generationPreflightTargetChapterId(payload: any, fallbackChapterId?: number) {
  const candidates = [
    fallbackChapterId,
    payload?.chapter_id,
    payload?.chapter?.id,
    payload?.context_package?.chapter_target?.id,
    payload?.contextPackage?.chapter_target?.id,
    payload?.contextPackage?.chapterTarget?.id,
  ]
  return Number(candidates.find(item => Number(item || 0) > 0) || 0)
}

export function extractStoryStateChapterNo(payload: any) {
  const corpus = [
    ...generationPreflightBlockers(payload),
    ...generationPreflightChecks(payload).flatMap((check: any) => [check?.fix, check?.evidence, check?.label, check?.message]),
    payload?.error,
    payload?.message,
  ].map(text).filter(Boolean).join('\n')
  const match = corpus.match(/先完成第\s*(\d+)\s*章状态机/)
    || corpus.match(/第\s*(\d+)\s*章已进入承接链/)
    || corpus.match(/状态机只更新到第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : 0
}

function hasKey(keys: Set<string>, ...candidates: string[]) {
  for (const key of keys) {
    const normalized = key.toLowerCase()
    if (candidates.some(candidate => normalized === candidate || normalized.includes(candidate))) return true
  }
  return false
}

function corpusMentions(payload: any, pattern: RegExp) {
  const corpus = [
    ...generationPreflightBlockers(payload),
    ...generationPreflightChecks(payload).flatMap((check: any) => [check?.key, check?.label, check?.fix, check?.evidence, check?.message]),
    payload?.error,
    payload?.message,
  ].map(text).filter(Boolean).join('\n')
  return pattern.test(corpus)
}

export function buildGenerationPreflightRepairActionSpecs(
  payload: any,
  options: { includeContinueRepairAll?: boolean } = {},
): GenerationPreflightRepairActionSpec[] {
  const missingKeys = generationPreflightMissingKeys(payload)
  const actions: GenerationPreflightRepairActionSpec[] = []
  const autoKeys = ['characters', 'character_state', 'no_repeat', 'setting_workshop', 'chapter_setting_usage']
    .filter(key => missingKeys.has(key))

  const needsStoryState = hasKey(missingKeys, 'serial_story_state', 'story_state')
    || corpusMentions(payload, /状态机更新|串行连续性|story_state|serial_story_state/)
  const needsStyleSamples = hasKey(missingKeys, 'style_sample', 'benchmark_recall', 'source_paths')
    || corpusMentions(payload, /文风召回|source_paths_missing|样章|style_sample|Step\s*2\.3/)
  const needsTimeline = hasKey(missingKeys, 'timeline_tracking', 'timeline')
    || corpusMentions(payload, /追踪\/时间线|时间线\.md|timeline_tracking/)
  const needsBlueprint = hasKey(missingKeys, 'chapter_blueprint', 'scene_card')
    || corpusMentions(payload, /细纲|蓝图|chapter_blueprint|场景卡|scene_card/)
  const needsPreviousChapter = hasKey(missingKeys, 'previous_chapter')
    || corpusMentions(payload, /上一章正文|章尾钩子|previous_chapter/)
  const needsContextTracking = hasKey(missingKeys, 'context_tracking', 'foreshadowing')
    || corpusMentions(payload, /追踪\/上下文|追踪\/伏笔|context_tracking|foreshadowing/)
  const needsForeshadowingHistory = hasKey(missingKeys, 'foreshadowing_history', 'historical_causality')
    || corpusMentions(payload, /伏笔\/前史|待回收伏笔|前史因果|foreshadowing_history/)
  const needsWorldConstraints = hasKey(missingKeys, 'world_constraints', 'world_constraint')
    || corpusMentions(payload, /世界约束|能力限制|触发条件或代价|world_constraints/)

  if (options.includeContinueRepairAll && autoKeys.length > 1) {
    actions.push({
      key: 'repair_all_auto',
      kind: 'repair_all_auto',
      label: '自动补齐角色/设定并继续',
      description: '依次处理角色卡、设定工坊、本章设定调用，刷新后重新生成。',
      modelCall: true,
      primary: true,
      reason: '角色/设定类缺口',
    })
  }

  if (needsStoryState) {
    const chapterNo = extractStoryStateChapterNo(payload)
    actions.push({
      key: 'sync_story_state',
      kind: 'sync_story_state',
      label: chapterNo > 0 ? `同步第${chapterNo}章状态机` : '同步故事状态机',
      description: chapterNo > 0
        ? `先完成第${chapterNo}章状态机更新，再继续写下一章，避免读取旧角色状态、伏笔和时间线。`
        : '同步最近已写章节的故事状态机，再继续生成。',
      modelCall: true,
      primary: true,
      reason: '串行连续性/状态机',
      targetChapterNo: chapterNo || undefined,
    })
  }

  if (needsStyleSamples) {
    actions.push({
      key: 'replace_style_samples',
      kind: 'replace_style_samples',
      label: '重选文风样章',
      description: '补齐文风召回来源：重新挑选/锁定样章并刷新任务书中的 source_paths。',
      modelCall: true,
      primary: !needsStoryState,
      reason: '文风召回来源缺失',
    })
    actions.push({
      key: 'build_pre_draft_brief',
      kind: 'build_pre_draft_brief',
      label: '重建写前任务书',
      description: '重新生成 pre-draft brief，补齐文风召回、来源就绪和本章蓝图字段。',
      modelCall: true,
      reason: '文风召回 / 写前准备',
    })
  }

  if (needsBlueprint) {
    actions.push({
      key: 'generate_scene_cards',
      kind: 'generate_scene_cards',
      label: '刷新场景卡/蓝图',
      description: '按本章细纲生成或刷新场景卡，补齐目标、冲突、出场与章末钩子等蓝图字段。',
      modelCall: true,
      primary: !needsStoryState && !needsStyleSamples,
      reason: '本章细纲/蓝图',
    })
    if (!actions.some(item => item.kind === 'build_pre_draft_brief')) {
      actions.push({
        key: 'build_pre_draft_brief_blueprint',
        kind: 'build_pre_draft_brief',
        label: '重建写前任务书',
        description: '用新版模板回填目标情绪、开篇钩子、核心回报和五段式内容概括。',
        modelCall: true,
        reason: '本章细纲/蓝图',
      })
    }
    actions.push({
      key: 'edit_chapter',
      kind: 'edit_chapter',
      label: '手动编辑本章细纲',
      description: '打开章节编辑器，直接补目标、冲突、钩子和摘要。',
      modelCall: false,
      reason: '本章细纲/蓝图',
    })
  }

  if (needsTimeline || needsContextTracking) {
    actions.push({
      key: 'open_story_state_editor',
      kind: 'open_story_state_editor',
      label: '打开故事状态/时间线',
      description: '补齐当前时间、地点、关键事件顺序和追踪上下文，再继续写正文。',
      modelCall: false,
      reason: needsTimeline ? '追踪/时间线' : '追踪/上下文',
    })
    actions.push({
      key: 'open_story_assets_tracking',
      kind: 'open_story_assets',
      label: '打开资料设定台',
      description: '到资料设定工作台查看并补齐追踪类材料。',
      modelCall: false,
      reason: needsTimeline ? '追踪/时间线' : '追踪/上下文',
    })
  }

  if (needsForeshadowingHistory) {
    actions.push({
      key: 'open_story_state_foreshadowing',
      kind: 'open_story_state_editor',
      label: '补伏笔/前史状态',
      description: '打开故事状态，补齐上一章钩子、待回收伏笔或本章必须承接的前史因果。',
      modelCall: false,
      primary: true,
      reason: '伏笔/前史',
    })
    actions.push({
      key: 'open_story_assets_foreshadowing',
      kind: 'open_story_assets',
      label: '打开资料设定台·伏笔',
      description: '在资料设定台补伏笔实体，或确认开书时的伏笔计划已入库。',
      modelCall: false,
      reason: '伏笔/前史',
    })
  }

  if (needsWorldConstraints) {
    actions.push({
      key: 'incubate_setting_workshop_world',
      kind: 'incubate_setting_workshop',
      label: '提炼世界规则设定',
      description: '调用大模型从世界观/写作圣经提炼规则、地点、能力限制与代价。',
      modelCall: true,
      primary: true,
      reason: '世界约束',
    })
    actions.push({
      key: 'open_story_assets_world',
      kind: 'open_story_assets',
      label: '打开资料设定台·世界',
      description: '补齐会改变本章行动选择的规则、地点、能力限制或触发代价。',
      modelCall: false,
      reason: '世界约束',
    })
  }

  if (needsPreviousChapter) {
    actions.push({
      key: 'open_outline_previous',
      kind: 'open_outline_tree',
      label: '查看章节大纲树',
      description: '定位上一章并确认正文/章尾钩子是否齐全。',
      modelCall: false,
      reason: '上一章正文/章尾钩子',
    })
  }

  if (missingKeys.has('characters') || missingKeys.has('character_state') || missingKeys.has('no_repeat')) {
    actions.push({
      key: 'repair_character_cards',
      kind: 'repair_character_cards',
      label: '补角色卡',
      description: '调用大模型补齐角色卡、角色当前状态和本章禁止重复材料。',
      modelCall: true,
      reason: '角色材料',
    })
  }
  if (missingKeys.has('setting_workshop')) {
    actions.push({
      key: 'incubate_setting_workshop',
      kind: 'incubate_setting_workshop',
      label: '提炼设定工坊',
      description: '从项目资料、世界观、角色和大纲提炼设定资产。',
      modelCall: true,
      reason: '设定工坊',
    })
  }
  if (missingKeys.has('chapter_setting_usage')) {
    actions.push({
      key: 'match_chapter_setting_usage',
      kind: 'match_chapter_setting_usage',
      label: '匹配本章设定调用',
      description: '为本章标记必用、允许和禁揭设定。',
      modelCall: true,
      reason: '本章设定调用',
    })
  }
  if (missingKeys.has('setting_workshop') || missingKeys.has('chapter_setting_usage')) {
    actions.push({
      key: 'open_setting_workshop',
      kind: 'open_story_assets',
      label: '打开设定工坊',
      description: '不调用大模型，跳转到设定资产工作台手动补齐。',
      modelCall: false,
      reason: '设定资产',
    })
  }

  // de-dupe by kind+label while preserving order
  const seen = new Set<string>()
  return actions.filter(action => {
    const id = `${action.kind}:${action.label}`
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}
