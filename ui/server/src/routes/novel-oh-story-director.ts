export type OhStoryDirectorStage = 'project_creation' | 'pre_draft' | 'drafting' | 'post_draft'

export type OhStoryDirectorBlockerCategory =
  | 'missing_source_evidence'
  | 'missing_blueprint'
  | 'missing_context'
  | 'manual_confirmation_required'
  | 'quality_gate_failed'
  | 'delivery_risk'
  | 'unknown'

export type OhStoryDirectorActionKey =
  | 'enter_workspace'
  | 'repair_project_seed'
  | 'start_draft'
  | 'repair_predraft_inputs'
  | 'continue_next_chapter'
  | 'revise_current_chapter'

export interface OhStoryDirectorAction {
  key: OhStoryDirectorActionKey
  label: string
}

export interface OhStoryDirectorFinding {
  key: string
  label: string
  category?: OhStoryDirectorBlockerCategory
  evidence?: string
  fix?: string
}

export interface OhStoryDirectorProjectSeedResult {
  stage: 'project_creation'
  readiness: 'ready' | 'needs_repair'
  primary_action: OhStoryDirectorAction
  required_repairs: OhStoryDirectorFinding[]
  deferred_repairs: OhStoryDirectorFinding[]
}

export interface OhStoryDirectorPreDraftResult {
  stage: 'pre_draft'
  readiness: 'ready' | 'blocked'
  primary_action: OhStoryDirectorAction
  blocking_findings: OhStoryDirectorFinding[]
  deferred_findings: OhStoryDirectorFinding[]
}

export interface OhStoryDirectorPostDraftResult {
  stage: 'post_draft'
  acceptance: 'accepted' | 'accepted_with_carryover' | 'blocked'
  primary_action: OhStoryDirectorAction
  blocking_findings: OhStoryDirectorFinding[]
  carryover_findings: OhStoryDirectorFinding[]
}

export interface OhStoryDirectorContractSelection {
  selected_contracts: Array<{ key: string; contract: unknown; reason: string }>
  prompt_budget_plan: {
    compact: string[]
    full: string[]
    omit: string[]
  }
}

type RecordLike = Record<string, any>

const ACTIONS: Record<OhStoryDirectorActionKey, OhStoryDirectorAction> = {
  enter_workspace: { key: 'enter_workspace', label: 'Enter workspace' },
  repair_project_seed: { key: 'repair_project_seed', label: 'Repair project seed' },
  start_draft: { key: 'start_draft', label: 'Start draft' },
  repair_predraft_inputs: { key: 'repair_predraft_inputs', label: 'Repair pre-draft inputs' },
  continue_next_chapter: { key: 'continue_next_chapter', label: 'Continue next chapter' },
  revise_current_chapter: { key: 'revise_current_chapter', label: 'Revise current chapter' },
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function hasItems(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0
}

function pushMissing(findings: OhStoryDirectorFinding[], condition: boolean, key: string, label: string) {
  if (!condition) findings.push({ key, label })
}

export function classifyOhStoryDirectorBlocker(message: unknown): OhStoryDirectorBlockerCategory {
  const text = String(message ?? '').toLowerCase()

  if (
    text.includes('source_paths_missing') ||
    text.includes('来源缺失') ||
    text.includes('source evidence') ||
    text.includes('missing source')
  ) {
    return 'missing_source_evidence'
  }
  if (text.includes('蓝图') || text.includes('细纲') || text.includes('blueprint')) {
    return 'missing_blueprint'
  }
  if (
    text.includes('追踪') ||
    text.includes('时间线') ||
    text.includes('当前时间') ||
    text.includes('当前地点') ||
    text.includes('context')
  ) {
    return 'missing_context'
  }
  if (text.includes('确认') || text.includes('manual') || text.includes('人工') || text.includes('是否')) {
    return 'manual_confirmation_required'
  }
  return 'unknown'
}

export function buildOhStoryDirectorForProjectSeed(seed: RecordLike): OhStoryDirectorProjectSeedResult {
  const required_repairs: OhStoryDirectorFinding[] = []
  const bible = seed?.writing_bible ?? {}
  const worldbuilding = seed?.worldbuilding ?? {}
  const characterPool = seed?.character_pool ?? {}

  pushMissing(required_repairs, hasText(seed?.title), 'title', 'Project title is required')
  pushMissing(required_repairs, hasText(seed?.synopsis), 'synopsis', 'Synopsis is required')
  pushMissing(required_repairs, hasText(seed?.logline), 'logline', 'Logline is required')
  pushMissing(required_repairs, hasText(seed?.main_conflict), 'main_conflict', 'Main conflict is required')
  pushMissing(required_repairs, hasText(seed?.protagonist?.name) && hasText(seed?.protagonist?.goal), 'protagonist', 'Protagonist name and goal are required')
  pushMissing(required_repairs, hasText(worldbuilding?.world_summary), 'world_summary', 'World summary is required')
  pushMissing(required_repairs, hasItems(worldbuilding?.rules), 'world_rules', 'At least one world rule is required')
  pushMissing(required_repairs, Boolean(bible?.target_reader_contract), 'target_reader_contract', 'Target reader contract is required')
  pushMissing(required_repairs, Boolean(bible?.story_power_contract), 'story_power_contract', 'Story power contract is required')
  pushMissing(required_repairs, Boolean(bible?.character_design_contract), 'character_design_contract', 'Character design contract is required')
  pushMissing(required_repairs, Boolean(bible?.longform_structure_contract), 'longform_structure_contract', 'Longform structure contract is required')
  pushMissing(required_repairs, hasItems(seed?.chapter_outlines), 'chapter_outlines', 'At least one chapter outline is required')
  pushMissing(required_repairs, hasItems(characterPool?.protagonist), 'character_pool_protagonist', 'Character pool must include a protagonist')
  pushMissing(required_repairs, hasItems(characterPool?.primary_supporting), 'character_pool_primary_supporting', 'Character pool must include primary supporting characters')
  pushMissing(required_repairs, hasItems(characterPool?.antagonist_primary), 'character_pool_antagonist_primary', 'Character pool must include a primary antagonist')

  const deferred_repairs: OhStoryDirectorFinding[] = []
  if ((seed?.chapter_outlines?.length ?? 0) < 3) {
    deferred_repairs.push({
      key: 'chapter_runway_depth',
      label: 'Expand chapter runway before long drafting sessions',
    })
  }
  if ((characterPool?.primary_supporting?.length ?? 0) < 3) {
    deferred_repairs.push({
      key: 'supporting_cast_depth',
      label: 'Add more primary supporting cast depth',
    })
  }

  return {
    stage: 'project_creation',
    readiness: required_repairs.length > 0 ? 'needs_repair' : 'ready',
    primary_action: required_repairs.length > 0 ? ACTIONS.repair_project_seed : ACTIONS.enter_workspace,
    required_repairs,
    deferred_repairs,
  }
}

export function buildOhStoryDirectorForPreDraft(input: RecordLike): OhStoryDirectorPreDraftResult {
  const warnings = input?.preflight?.warnings ?? input?.warnings ?? []
  const blocking_findings = warnings.map((warning: unknown) => {
    const category = classifyOhStoryDirectorBlocker(warning)
    return {
      key: category,
      label: String(warning ?? ''),
      category,
      evidence: String(warning ?? ''),
    }
  })

  return {
    stage: 'pre_draft',
    readiness: blocking_findings.length > 0 ? 'blocked' : 'ready',
    primary_action: blocking_findings.length > 0 ? ACTIONS.repair_predraft_inputs : ACTIONS.start_draft,
    blocking_findings,
    deferred_findings: [],
  }
}

export function selectOhStoryDirectorContracts(input: RecordLike): OhStoryDirectorContractSelection {
  const chapterTarget = input?.chapter_target ?? {}
  const warnings = input?.preflight?.warnings ?? []
  const warningText = warnings.join('\n')
  const selected_contracts: OhStoryDirectorContractSelection['selected_contracts'] = []
  const compact: string[] = []
  const full: string[] = []
  const omit = new Set<string>()

  const selectContract = (key: string, contractKey: string, reason: string) => {
    if (!chapterTarget?.[contractKey]) return
    selected_contracts.push({ key, contract: chapterTarget[contractKey], reason })
    compact.push(key)
  }

  if (hasText(chapterTarget?.conflict) || /目标|阻碍|变化|反馈|戏剧单元/.test(warningText)) {
    selectContract('story_power', 'story_power_contract', 'Chapter conflict or story-power warning is local to the draft')
  }
  if (/主角|角色|人设|犯错|行为/.test(warningText) || chapterTarget?.character_behavior_contract) {
    selectContract('character_behavior', 'character_behavior_contract', 'Character behavior guardrails apply to this chapter')
  }
  if (input?.stage === 'project_creation' && chapterTarget?.longform_structure_contract) {
    selected_contracts.push({
      key: 'longform_structure',
      contract: chapterTarget.longform_structure_contract,
      reason: 'Longform structure is relevant to project-level planning',
    })
    full.push('longform_structure')
  } else if (chapterTarget?.longform_structure_contract) {
    omit.add('longform_structure_contract')
  }

  return {
    selected_contracts,
    prompt_budget_plan: {
      compact,
      full,
      omit: Array.from(omit),
    },
  }
}

export function buildOhStoryDirectorForPostDraft(input: RecordLike): OhStoryDirectorPostDraftResult {
  const quality = input?.quality ?? {}
  const blocking_findings: OhStoryDirectorFinding[] = []
  const carryover_findings: OhStoryDirectorFinding[] = []
  const deslopFailedCount = Number(quality?.deslop_gate_diagnostics?.failed_count ?? 0)

  if (deslopFailedCount > 0) {
    blocking_findings.push({
      key: 'deslop_gate',
      label: 'Deslop gate failed',
      category: 'quality_gate_failed',
      evidence: `${deslopFailedCount} failed checks`,
    })
  }

  const storyPowerMissed = quality?.story_power_sync?.missed ?? []
  if (quality?.story_power_sync?.status === 'fail') {
    blocking_findings.push({
      key: 'story_power',
      label: 'Story power sync failed',
      category: 'quality_gate_failed',
      evidence: storyPowerMissed.map((item: RecordLike) => item?.key).filter(Boolean).join(', '),
    })
  } else if (quality?.story_power_sync?.status === 'warn' || storyPowerMissed.length > 0) {
    carryover_findings.push({
      key: 'story_power',
      label: 'Story power carry-over',
      evidence: storyPowerMissed.map((item: RecordLike) => item?.key).filter(Boolean).join(', '),
      fix: storyPowerMissed.map((item: RecordLike) => item?.fix).filter(Boolean).join('; '),
    })
  }

  if (Number(quality?.delivery_risk_receipt_sync?.missed_count ?? 0) > 0) {
    carryover_findings.push({
      key: 'delivery_risk',
      label: 'Delivery risk carry-over',
      category: 'delivery_risk',
      evidence: (quality?.delivery_risk_receipt_sync?.items ?? []).map((item: RecordLike) => item?.remaining_risk ?? item?.key).filter(Boolean).join('; '),
    })
  }

  return {
    stage: 'post_draft',
    acceptance: blocking_findings.length > 0 ? 'blocked' : carryover_findings.length > 0 ? 'accepted_with_carryover' : 'accepted',
    primary_action: blocking_findings.length > 0 ? ACTIONS.revise_current_chapter : ACTIONS.continue_next_chapter,
    blocking_findings,
    carryover_findings,
  }
}
