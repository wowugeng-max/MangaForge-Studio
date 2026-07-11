import {
  normalizeProseContractKey,
  PROSE_RISK_CONTRACT_LIMIT,
  resolveStrictPreflightReadiness,
} from '../novel-writing/prose-generation-contract'

export type OhStoryDirectorStage = 'project_creation' | 'pre_draft' | 'drafting' | 'post_draft' | 'handoff'

export type OhStoryDirectorReadiness =
  | 'ready'
  | 'needs_repair'
  | 'needs_user_confirmation'
  | 'auto_repairing'
  | 'blocked'

export type OhStoryDirectorBlockerCategory =
  | 'missing_materials'
  | 'missing_blueprint'
  | 'missing_context'
  | 'missing_source_evidence'
  | 'manual_confirmation_required'
  | 'quality_revision_required'

export interface OhStoryDirectorAction {
  key: string
  label: string
  mode: 'automatic' | 'manual'
}

export interface OhStoryDirectorRepair {
  key: string
  category: OhStoryDirectorBlockerCategory
  label: string
  detail: string
  blocking: boolean
}

export interface OhStoryDirectorContractSelection {
  key: string
  reason: string
  detail_level: 'full' | 'compact' | 'reference'
}

export interface OhStoryDirectorPromptBudgetPlan {
  full: string[]
  compact: string[]
  reference: string[]
  omit: string[]
}

export interface OhStoryDirectorEvidence {
  key: string
  status: 'ready' | 'missing' | 'warn' | 'blocked' | 'resolved'
  source: string
  detail?: string
}

export interface OhStoryDirector {
  stage: OhStoryDirectorStage
  readiness: OhStoryDirectorReadiness
  acceptance?: 'accepted' | 'accepted_with_carryover' | 'needs_revision'
  primary_action: OhStoryDirectorAction
  blocking_summary: string
  required_repairs: OhStoryDirectorRepair[]
  deferred_repairs: OhStoryDirectorRepair[]
  selected_contracts: OhStoryDirectorContractSelection[]
  suppressed_contracts?: OhStoryDirectorContractSelection[]
  prompt_budget_plan: OhStoryDirectorPromptBudgetPlan
  evidence: OhStoryDirectorEvidence[]
  blocking_findings?: OhStoryDirectorRepair[]
  carryover_findings?: OhStoryDirectorRepair[]
  resolved_findings?: OhStoryDirectorRepair[]
}

type RecordLike = Record<string, any>

const EMPTY_BUDGET: OhStoryDirectorPromptBudgetPlan = {
  full: [],
  compact: [],
  reference: [],
  omit: [],
}

const ACTIONS: Record<string, OhStoryDirectorAction> = {
  ask_user_confirmation: { key: 'ask_user_confirmation', label: 'Ask user confirmation', mode: 'manual' },
  confirm_missing_choice: { key: 'confirm_missing_choice', label: 'Confirm missing choice', mode: 'manual' },
  continue_next_chapter: { key: 'continue_next_chapter', label: 'Continue next chapter', mode: 'manual' },
  enter_workspace: { key: 'enter_workspace', label: 'Enter workspace', mode: 'manual' },
  generate_prose: { key: 'generate_prose', label: 'Generate prose', mode: 'automatic' },
  repair_pre_draft_materials: { key: 'repair_pre_draft_materials', label: 'Repair pre-draft materials', mode: 'automatic' },
  repair_project_seed: { key: 'repair_project_seed', label: 'Repair project seed', mode: 'automatic' },
  run_revision: { key: 'run_revision', label: 'Run revision', mode: 'automatic' },
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function hasItems(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0
}

function cloneBudget(plan: Partial<OhStoryDirectorPromptBudgetPlan> = {}): OhStoryDirectorPromptBudgetPlan {
  return {
    full: [...(plan.full ?? [])],
    compact: [...(plan.compact ?? [])],
    reference: [...(plan.reference ?? [])],
    omit: [...(plan.omit ?? [])],
  }
}

function repair(
  key: string,
  category: OhStoryDirectorBlockerCategory,
  label: string,
  detail: string,
  blocking = true,
): OhStoryDirectorRepair {
  return { key, category, label, detail, blocking }
}

function evidence(key: string, status: OhStoryDirectorEvidence['status'], source: string, detail?: string): OhStoryDirectorEvidence {
  return { key, status, source, ...(detail ? { detail } : {}) }
}

function addRequiredRepair(
  repairs: OhStoryDirectorRepair[],
  evidenceItems: OhStoryDirectorEvidence[],
  condition: boolean,
  key: string,
  category: OhStoryDirectorBlockerCategory,
  label: string,
  detail: string,
  source: string,
) {
  if (condition) {
    evidenceItems.push(evidence(key, 'ready', source))
    return
  }
  repairs.push(repair(key, category, label, detail, true))
  evidenceItems.push(evidence(key, category === 'manual_confirmation_required' ? 'blocked' : 'missing', source, detail))
}

function summarizeRepairs(requiredRepairs: OhStoryDirectorRepair[], readySummary: string): string {
  if (requiredRepairs.length === 0) return readySummary
  const manualCount = requiredRepairs.filter(item => item.category === 'manual_confirmation_required').length
  if (manualCount > 0) return `${manualCount} manual confirmation required.`
  return `${requiredRepairs.length} blocking repair${requiredRepairs.length === 1 ? '' : 's'} required.`
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

function asArray(value: unknown): unknown[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function issueText(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const record = value as RecordLike
    return String(record.message ?? record.detail ?? record.reason ?? record.label ?? JSON.stringify(record))
  }
  return String(value ?? '')
}

function repairKeyForPreDraftCategory(category: OhStoryDirectorBlockerCategory): string {
  return `pre_draft_${category}`
}

function repairLabelForCategory(category: OhStoryDirectorBlockerCategory): string {
  switch (category) {
    case 'missing_blueprint':
      return 'Missing chapter blueprint'
    case 'missing_context':
      return 'Missing chapter context'
    case 'missing_source_evidence':
      return 'Missing source evidence'
    case 'manual_confirmation_required':
      return 'Manual confirmation required'
    case 'quality_revision_required':
      return 'Quality revision required'
    case 'missing_materials':
    default:
      return 'Missing pre-draft materials'
  }
}

function storyPowerMissDetail(item: unknown): string {
  if (item && typeof item === 'object') {
    const record = item as RecordLike
    return String(record.fix ?? record.key ?? record.detail ?? record.message ?? JSON.stringify(record))
  }
  return issueText(item)
}

function deslopGateFailureCount(diagnostics: RecordLike = {}): number {
  const explicitCount = Number(
    diagnostics?.failed_count
      ?? diagnostics?.failedCount
      ?? diagnostics?.concern_gate_count
      ?? diagnostics?.concernGateCount
      ?? NaN,
  )
  if (Number.isFinite(explicitCount) && explicitCount > 0) return explicitCount
  const gates = asArray(diagnostics?.gates)
  return gates.filter((gate: any) => {
    const status = String(gate?.status || '').trim().toLowerCase()
    return status && !['pass', 'ok', 'ready', 'cleared'].includes(status)
  }).length
}

export function classifyOhStoryDirectorBlocker(message: unknown): OhStoryDirectorBlockerCategory {
  const text = issueText(message).toLowerCase()

  if (
    text.includes('确认') ||
    text.includes('manual') ||
    text.includes('人工') ||
    text.includes('是否') ||
    text.includes('core direction') ||
    text.includes('主线方向') ||
    text.includes('核心承诺')
  ) {
    return 'manual_confirmation_required'
  }
  if (
    text.includes('source_paths_missing') ||
    text.includes('文风召回') ||
    text.includes('source evidence') ||
    text.includes('missing source')
  ) {
    return 'missing_source_evidence'
  }
  if (
    text.includes('蓝图') ||
    text.includes('细纲') ||
    text.includes('场景卡') ||
    text.includes('scene card') ||
    text.includes('chapter_blueprint')
  ) {
    return 'missing_blueprint'
  }
  if (
    text.includes('追踪') ||
    text.includes('时间线') ||
    text.includes('上下文') ||
    text.includes('current time') ||
    text.includes('current place') ||
    text.includes('handoff')
  ) {
    return 'missing_context'
  }
  return 'missing_materials'
}

export function selectOhStoryDirectorContracts(input: RecordLike): {
  selected_contracts: OhStoryDirectorContractSelection[]
  suppressed_contracts: OhStoryDirectorContractSelection[]
  prompt_budget_plan: OhStoryDirectorPromptBudgetPlan
} {
  const chapterTarget = input?.chapter_target ?? {}
  const warnings = asArray(input?.preflight?.warnings ?? [])
  const riskText = [
    ...warnings.map(issueText),
    issueText(chapterTarget?.goal),
    issueText(chapterTarget?.summary),
    issueText(chapterTarget?.conflict),
    issueText(chapterTarget?.ending_hook || chapterTarget?.endingHook),
  ].filter(Boolean).join('\n')
  const selected_contracts: OhStoryDirectorContractSelection[] = []
  const suppressed_contracts: OhStoryDirectorContractSelection[] = []
  const budget = cloneBudget()

  const riskRules: Array<{
    key: string
    pattern: RegExp
    priority: number
    alwaysRelevant?: (target: RecordLike) => boolean
  }> = [
    { key: 'continuity_heat', pattern: /承接|连续性|上一章|状态|时间线/, priority: 110 },
    { key: 'story_power', pattern: /核心承诺|故事力|主线|回报|目标|阻碍|戏剧单元|scene card/i, priority: 100, alwaysRelevant: target => hasText(target?.conflict) },
    { key: 'character_behavior', pattern: /主角|角色|人设|犯错|行为|能动性/, priority: 95, alwaysRelevant: target => Boolean(target?.character_behavior_contract || target?.characterBehaviorContract) },
    { key: 'dialogue', pattern: /对白|口吻|台词|声线/, priority: 90 },
    { key: 'chapter_hook', pattern: /钩子|追读|章末|翻页/, priority: 85 },
    { key: 'conflict_structure', pattern: /冲突|阻碍|升级|因果|场景变化/, priority: 80 },
    { key: 'prose_craft', pattern: /文风|AI味|段落|句式|叙事/, priority: 75 },
    { key: 'quality_audit', pattern: /质量|退化|截断|格式|语言/, priority: 70 },
    { key: 'state_tracking', pattern: /设定|事实|状态|来源|安全/, priority: 65 },
    { key: 'longform_structure', pattern: /长线|长篇|结构|卷|批次|航线|longform/i, priority: 55 },
  ]
  const availableKeys = unique(Object.keys(chapterTarget)
    .filter(key => /(?:_contract|Contract)$/.test(key) && chapterTarget[key])
    .map(normalizeProseContractKey)
    .filter(Boolean))
  const candidates = availableKeys
    .map(key => {
      const rule = riskRules.find(item => item.key === key)
      const matched = Boolean(rule?.pattern.test(riskText) || rule?.alwaysRelevant?.(chapterTarget))
      const longformIrrelevant = key === 'longform_structure'
        && input?.stage !== 'project_creation'
        && !rule?.pattern.test(riskText)
      return {
        key,
        matched,
        suppressed: longformIrrelevant,
        priority: (rule?.priority || 20) + (matched ? 100 : 0),
        detail_level: (matched ? 'compact' : 'reference') as OhStoryDirectorContractSelection['detail_level'],
        reason: matched
          ? `Current chapter risk requires ${key} guardrails`
          : `${key} remains available as a bounded reference`,
      }
    })
  const selected = candidates
    .filter(item => !item.suppressed)
    .sort((left, right) => right.priority - left.priority || left.key.localeCompare(right.key))
    .slice(0, PROSE_RISK_CONTRACT_LIMIT)
  const selectedKeys = new Set(selected.map(item => item.key))

  for (const item of selected) {
    selected_contracts.push({ key: item.key, reason: item.reason, detail_level: item.detail_level })
    budget[item.detail_level].push(item.key)
  }
  for (const item of candidates.filter(candidate => !selectedKeys.has(candidate.key))) {
    const reason = item.suppressed
      ? 'Local drafting risk does not need longform structure payload'
      : 'Contract omitted by the four-risk prompt budget'
    suppressed_contracts.push({ key: item.key, reason, detail_level: 'reference' })
    budget.omit.push(item.key)
  }

  budget.full = unique(budget.full)
  budget.compact = unique(budget.compact)
  budget.reference = unique(budget.reference)
  budget.omit = unique(budget.omit)

  return { selected_contracts, suppressed_contracts, prompt_budget_plan: budget }
}

export function buildOhStoryDirectorForProjectSeed(seed: RecordLike): OhStoryDirector {
  const required_repairs: OhStoryDirectorRepair[] = []
  const deferred_repairs: OhStoryDirectorRepair[] = []
  const evidenceItems: OhStoryDirectorEvidence[] = []
  const bible = seed?.writing_bible ?? {}
  const worldbuilding = seed?.worldbuilding ?? {}
  const characterPool = seed?.character_pool ?? {}

  addRequiredRepair(required_repairs, evidenceItems, hasText(seed?.title), 'title', 'missing_materials', 'Project title is required', 'Seed title is missing.', 'project_seed.title')
  addRequiredRepair(required_repairs, evidenceItems, hasText(seed?.synopsis), 'synopsis', 'missing_materials', 'Synopsis is required', 'Seed synopsis is missing.', 'project_seed.synopsis')
  addRequiredRepair(required_repairs, evidenceItems, hasText(seed?.logline), 'logline', 'missing_materials', 'Logline is required', 'Seed logline is missing.', 'project_seed.logline')
  addRequiredRepair(
    required_repairs,
    evidenceItems,
    hasText(seed?.main_conflict),
    'main_conflict',
    'manual_confirmation_required',
    'Main conflict needs confirmation',
    'Core conflict direction is missing and should be confirmed before project creation proceeds.',
    'project_seed.main_conflict',
  )
  addRequiredRepair(
    required_repairs,
    evidenceItems,
    hasText(seed?.protagonist?.name) && hasText(seed?.protagonist?.goal),
    'protagonist',
    'missing_materials',
    'Protagonist name and goal are required',
    'Seed protagonist needs both name and goal.',
    'project_seed.protagonist',
  )
  addRequiredRepair(required_repairs, evidenceItems, hasText(worldbuilding?.world_summary), 'world_summary', 'missing_materials', 'World summary is required', 'World summary is missing.', 'project_seed.worldbuilding.world_summary')
  addRequiredRepair(required_repairs, evidenceItems, hasItems(worldbuilding?.rules), 'world_rules', 'missing_materials', 'World rules are required', 'At least one world rule is required.', 'project_seed.worldbuilding.rules')
  addRequiredRepair(required_repairs, evidenceItems, Boolean(bible?.target_reader_contract), 'target_reader_contract', 'missing_materials', 'Target reader contract is required', 'Target reader contract is missing.', 'project_seed.writing_bible.target_reader_contract')
  addRequiredRepair(required_repairs, evidenceItems, Boolean(bible?.story_power_contract), 'story_power_contract', 'missing_materials', 'Story power contract is required', 'Story power contract is missing.', 'project_seed.writing_bible.story_power_contract')
  addRequiredRepair(required_repairs, evidenceItems, Boolean(bible?.character_design_contract), 'character_design_contract', 'missing_materials', 'Character design contract is required', 'Character design contract is missing.', 'project_seed.writing_bible.character_design_contract')
  addRequiredRepair(required_repairs, evidenceItems, Boolean(bible?.longform_structure_contract), 'longform_structure_contract', 'missing_materials', 'Longform structure contract is required', 'Longform structure contract is missing.', 'project_seed.writing_bible.longform_structure_contract')
  addRequiredRepair(required_repairs, evidenceItems, hasItems(seed?.chapter_outlines), 'chapter_outlines', 'missing_blueprint', 'Chapter outlines are required', 'At least one chapter outline is required.', 'project_seed.chapter_outlines')
  addRequiredRepair(required_repairs, evidenceItems, hasItems(characterPool?.protagonist), 'character_pool_protagonist', 'missing_materials', 'Protagonist pool is required', 'Character pool must include a protagonist.', 'project_seed.character_pool.protagonist')
  addRequiredRepair(required_repairs, evidenceItems, hasItems(characterPool?.primary_supporting), 'character_pool_primary_supporting', 'missing_materials', 'Primary supporting cast is required', 'Character pool must include primary supporting characters.', 'project_seed.character_pool.primary_supporting')
  addRequiredRepair(required_repairs, evidenceItems, hasItems(characterPool?.antagonist_primary), 'character_pool_antagonist_primary', 'missing_materials', 'Primary antagonist is required', 'Character pool must include a primary antagonist.', 'project_seed.character_pool.antagonist_primary')

  if ((seed?.chapter_outlines?.length ?? 0) < 3) {
    deferred_repairs.push(repair('chapter_runway_depth', 'missing_blueprint', 'Expand chapter runway', 'Expand chapter runway before long drafting sessions.', false))
    evidenceItems.push(evidence('chapter_runway_depth', 'warn', 'project_seed.chapter_outlines', 'Fewer than 3 chapter outlines are available.'))
  }
  if ((characterPool?.primary_supporting?.length ?? 0) < 3) {
    deferred_repairs.push(repair('supporting_cast_depth', 'missing_materials', 'Deepen supporting cast', 'Add more primary supporting cast depth.', false))
    evidenceItems.push(evidence('supporting_cast_depth', 'warn', 'project_seed.character_pool.primary_supporting', 'Fewer than 3 primary supporting characters are available.'))
  }

  const selected_contracts: OhStoryDirectorContractSelection[] = []
  const budget = cloneBudget()
  if (bible?.target_reader_contract) {
    selected_contracts.push({ key: 'target_reader', reason: 'Project creation needs reader promise alignment', detail_level: 'reference' })
    budget.reference.push('target_reader')
  }
  if (bible?.story_power_contract) {
    selected_contracts.push({ key: 'story_power', reason: 'Project creation needs story-power baseline', detail_level: 'full' })
    budget.full.push('story_power')
  }
  if (bible?.character_design_contract) {
    selected_contracts.push({ key: 'character_design', reason: 'Project creation needs cast design baseline', detail_level: 'reference' })
    budget.reference.push('character_design')
  }
  if (bible?.longform_structure_contract) {
    selected_contracts.push({ key: 'longform_structure', reason: 'Project creation needs longform structure reference', detail_level: 'reference' })
    budget.reference.push('longform_structure')
  }

  const needsConfirmation = required_repairs.some(item => item.category === 'manual_confirmation_required')
  const readiness: OhStoryDirectorReadiness = needsConfirmation ? 'needs_user_confirmation' : required_repairs.length > 0 ? 'needs_repair' : 'ready'

  return {
    stage: 'project_creation',
    readiness,
    primary_action: needsConfirmation ? ACTIONS.ask_user_confirmation : required_repairs.length > 0 ? ACTIONS.repair_project_seed : ACTIONS.enter_workspace,
    blocking_summary: summarizeRepairs(required_repairs, 'Ready to enter workspace.'),
    required_repairs,
    deferred_repairs,
    selected_contracts,
    suppressed_contracts: [],
    prompt_budget_plan: budget,
    evidence: evidenceItems,
  }
}

export function buildOhStoryDirectorForPreDraft(input: RecordLike): OhStoryDirector {
  const preflight = input?.preflight ?? {}
  const blockers = asArray(preflight?.blockers ?? input?.blockers)
  const warnings = asArray(preflight?.warnings ?? input?.warnings)
  const preflightReady = preflight?.ready === true
  const strictReadiness = resolveStrictPreflightReadiness(preflight)
  const strictReady = strictReadiness.ready
  const strictFailures = asArray(preflight?.checks).filter((item: any) => item?.ok === false && item?.severity !== 'low')
  const blockingIssues = [
    ...blockers.map((message: unknown) => ({ message, source: 'preflight.blockers' })),
    ...(preflightReady ? [] : warnings.map((message: unknown) => ({ message, source: 'preflight.warnings' }))),
  ]
  const advisoryIssues = preflightReady
    ? warnings.map((message: unknown) => ({ message, source: 'preflight.warnings' }))
    : []
  const preflightIssues = [...blockingIssues, ...advisoryIssues]
  const groupedIssues = new Map<OhStoryDirectorBlockerCategory, Array<{ detail: string; source: string }>>()
  for (const issue of blockingIssues) {
    const category = classifyOhStoryDirectorBlocker(issue.message)
    const detail = issueText(issue.message)
    groupedIssues.set(category, [...(groupedIssues.get(category) ?? []), { detail, source: issue.source }])
  }
  const groupedAdvisories = new Map<OhStoryDirectorBlockerCategory, Array<{ detail: string; source: string }>>()
  for (const issue of advisoryIssues) {
    const category = classifyOhStoryDirectorBlocker(issue.message)
    const detail = issueText(issue.message)
    groupedAdvisories.set(category, [...(groupedAdvisories.get(category) ?? []), { detail, source: issue.source }])
  }
  const required_repairs = Array.from(groupedIssues.entries()).map(([category, issues]) => {
    const detail = issues.map(issue => issue.detail).join('\n')
    return repair(repairKeyForPreDraftCategory(category), category, repairLabelForCategory(category), detail, true)
  })
  if (!strictReady) {
    const strictDetail = strictReadiness.status !== 'missing'
      ? strictFailures
          .map((item: any) => issueText(item?.fix || item?.label || item?.key || item))
          .filter(Boolean)
          .join('\n') || strictReadiness.reason
      : strictReadiness.reason
    required_repairs.push(repair(
      'pre_draft_strict_readiness',
      'missing_context',
      'Strict pre-draft checks must pass',
      strictDetail,
      true,
    ))
  }
  const deferred_repairs = Array.from(groupedAdvisories.entries()).map(([category, issues]) => {
    const detail = issues.map(issue => issue.detail).join('\n')
    return repair(repairKeyForPreDraftCategory(category), category, repairLabelForCategory(category), detail, false)
  })
  const contractSelection = selectOhStoryDirectorContracts({
    stage: 'drafting',
    chapter_target: input?.chapter_target ?? {},
    preflight: { warnings: preflightIssues.map(issue => issue.message) },
  })
  const hasManualConfirmation = required_repairs.some(item => item.category === 'manual_confirmation_required')
  const readiness: OhStoryDirectorReadiness = hasManualConfirmation ? 'blocked' : required_repairs.length > 0 ? 'needs_repair' : 'ready'
  const evidenceItems = Array.from(groupedIssues.entries()).flatMap(([category, issues]) => {
    const key = repairKeyForPreDraftCategory(category)
    return unique(issues.map(issue => issue.source)).map(source => evidence(
      key,
      'blocked',
      source,
      issues.filter(issue => issue.source === source).map(issue => issue.detail).join('\n'),
    ))
  })
  const advisoryEvidenceItems = Array.from(groupedAdvisories.entries()).flatMap(([category, issues]) => {
    const key = repairKeyForPreDraftCategory(category)
    return unique(issues.map(issue => issue.source)).map(source => evidence(
      key,
      'warn',
      source,
      issues.filter(issue => issue.source === source).map(issue => issue.detail).join('\n'),
    ))
  })
  const strictEvidenceItems = !strictReady
    ? [evidence(
        'pre_draft_strict_readiness',
        'blocked',
        'preflight.strict_ready',
        required_repairs.find(item => item.key === 'pre_draft_strict_readiness')?.detail,
      )]
    : []
  const issueEvidenceItems = [...evidenceItems, ...strictEvidenceItems, ...advisoryEvidenceItems]

  return {
    stage: 'pre_draft',
    readiness,
    primary_action: hasManualConfirmation ? ACTIONS.confirm_missing_choice : required_repairs.length > 0 ? ACTIONS.repair_pre_draft_materials : ACTIONS.generate_prose,
    blocking_summary: summarizeRepairs(required_repairs, 'Ready to generate prose.'),
    required_repairs,
    deferred_repairs,
    selected_contracts: contractSelection.selected_contracts,
    suppressed_contracts: contractSelection.suppressed_contracts,
    prompt_budget_plan: contractSelection.prompt_budget_plan,
    evidence: issueEvidenceItems.length > 0
      ? issueEvidenceItems
      : [evidence('preflight', 'ready', 'preflight.warnings')],
    blocking_findings: required_repairs,
  }
}

export function buildOhStoryDirectorForPostDraft(input: RecordLike): OhStoryDirector {
  const quality = input?.quality ?? {}
  const receipts = input?.receipts ?? {}
  const blocking_findings: OhStoryDirectorRepair[] = []
  const carryover_findings: OhStoryDirectorRepair[] = []
  const resolved_findings: OhStoryDirectorRepair[] = []
  const evidenceItems: OhStoryDirectorEvidence[] = []
  const failedCount = deslopGateFailureCount(quality?.deslop_gate_diagnostics)

  if (failedCount > 0) {
    blocking_findings.push(repair('deslop_gate', 'quality_revision_required', 'Deslop gate failed', `${failedCount} quality checks failed.`, true))
    evidenceItems.push(evidence('deslop_gate', 'blocked', 'quality.deslop_gate_diagnostics', `${failedCount} failed checks`))
  } else {
    evidenceItems.push(evidence('deslop_gate', 'ready', 'quality.deslop_gate_diagnostics'))
  }

  const storyPowerMissed = asArray(quality?.story_power_sync?.missed)
  const storyPowerMissDetailText = storyPowerMissed.map(storyPowerMissDetail).filter(Boolean).join('; ')
  if (quality?.story_power_sync?.status === 'fail') {
    blocking_findings.push(repair('story_power', 'quality_revision_required', 'Story power sync failed', storyPowerMissDetailText || 'Story power revision is required.', true))
    evidenceItems.push(evidence('story_power', 'blocked', 'quality.story_power_sync'))
  } else if (quality?.story_power_sync?.status === 'warn' || storyPowerMissed.length > 0) {
    carryover_findings.push(repair('story_power', 'quality_revision_required', 'Story power carry-over', storyPowerMissDetailText || 'Carry story power fix into the next chapter.', false))
    evidenceItems.push(evidence('story_power', 'warn', 'quality.story_power_sync'))
  } else {
    evidenceItems.push(evidence('story_power', 'ready', 'quality.story_power_sync'))
  }

  if (Number(quality?.delivery_risk_receipt_sync?.missed_count ?? 0) > 0) {
    carryover_findings.push(repair('delivery_risk', 'quality_revision_required', 'Delivery risk carry-over', (quality?.delivery_risk_receipt_sync?.items ?? []).map((item: RecordLike) => item?.remaining_risk ?? item?.key).filter(Boolean).join('; ') || 'Delivery risk remains for next chapter.', false))
    evidenceItems.push(evidence('delivery_risk', 'warn', 'quality.delivery_risk_receipt_sync'))
  }

  for (const item of asArray(receipts?.revision_receipts)) {
    if (hasText(item?.applied_fix) || hasText(item?.changed_evidence)) {
      resolved_findings.push(repair('revision_receipt', 'quality_revision_required', String(item?.required_action ?? 'Revision receipt resolved'), String(item?.changed_evidence ?? item?.applied_fix), false))
    }
  }
  evidenceItems.push(evidence('revision_receipts', resolved_findings.length > 0 ? 'resolved' : 'missing', 'receipts.revision_receipts', `${resolved_findings.length} resolved revision receipt${resolved_findings.length === 1 ? '' : 's'}`))

  const needsRevision = blocking_findings.length > 0
  const acceptance: OhStoryDirector['acceptance'] = needsRevision ? 'needs_revision' : carryover_findings.length > 0 ? 'accepted_with_carryover' : 'accepted'

  return {
    stage: 'post_draft',
    readiness: needsRevision ? 'needs_repair' : 'ready',
    acceptance,
    primary_action: needsRevision ? ACTIONS.run_revision : ACTIONS.continue_next_chapter,
    blocking_summary: needsRevision ? summarizeRepairs(blocking_findings, '') : carryover_findings.length > 0 ? 'Accepted with next-chapter carry-over.' : 'Accepted.',
    required_repairs: blocking_findings,
    deferred_repairs: carryover_findings,
    selected_contracts: [],
    suppressed_contracts: [],
    prompt_budget_plan: cloneBudget(EMPTY_BUDGET),
    evidence: evidenceItems,
    blocking_findings,
    carryover_findings,
    resolved_findings,
  }
}
