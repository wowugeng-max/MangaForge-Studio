import { randomUUID } from 'node:crypto'
import { types } from 'node:util'
import {
  appendNovelRun,
  claimNovelRunExecution as claimNovelRunExecutionRecord,
  listNovelRuns,
  updateNovelRun,
} from '../novel'
import { isChapterTaskId } from '../novel-writing-service/generation-source/types'
import { classifyGenerationFailure } from './novel-generation/builders'
import { advanceSceneProduction, compactText, getQualityGate, getSafetyPolicy, getStyleLock, normalizeSceneProduction, parseJsonLikePayload } from './novel-route-utils'
import { collectChapterWarnings, compactRunChapterItem, compactRunPayload, compactRunSceneCard, compactRunStateValue, compactWarningList, hashText, isAbortLikeError, requestRuntimeGc, runJson } from './novel-production/run-state'
import { appendPostDeliveryQualityRepairRun, buildOhStoryBatchQualityCheck, buildOhStoryPostDeliveryQuality, buildPostDeliveryQualityRepairFingerprint, buildPostDeliveryQualityRepairTasks, buildReturnedApprovalBlocker, findExistingApprovalBlocker, findExistingTerminalAdmission } from './novel-production/post-delivery-quality'

const NOVEL_RUN_LOCK_OWNER_LIMIT = 160

function invalidNovelRunLockOwner() {
  return Object.assign(new TypeError('Invalid novel run lock owner'), {
    code: 'NOVEL_RUN_LOCK_OWNER_INVALID',
  })
}

function explicitNovelRunLockOwner(options: unknown) {
  if (!options || (typeof options !== 'object' && typeof options !== 'function') || types.isProxy(options)) {
    if (types.isProxy(options)) throw invalidNovelRunLockOwner()
    return undefined
  }
  let descriptor: PropertyDescriptor | undefined
  try {
    descriptor = Object.getOwnPropertyDescriptor(options, 'lock_owner')
  } catch {
    throw invalidNovelRunLockOwner()
  }
  if (!descriptor) return undefined
  if (!('value' in descriptor)
    || typeof descriptor.value !== 'string'
    || descriptor.value.length > NOVEL_RUN_LOCK_OWNER_LIMIT
    || !descriptor.value.trim()) {
    throw invalidNovelRunLockOwner()
  }
  return descriptor.value
}

function publicNovelRunLockOwner(owner: unknown) {
  if (typeof owner !== 'string' || owner.length === 0) return ''
  return owner.length <= NOVEL_RUN_LOCK_OWNER_LIMIT && owner.trim()
    ? owner
    : 'legacy_lock_owner'
}

function projectLockedNovelRunExecution(run: any, group: any, lockedBy: unknown) {
  const storedPayload = parseJsonLikePayload(run?.output_ref)
  const storedLock = storedPayload && typeof storedPayload === 'object' && !Array.isArray(storedPayload)
    ? storedPayload.lock
    : null
  const storedPayloadOwner = storedLock && typeof storedLock === 'object' && !Array.isArray(storedLock)
    ? storedLock.owner
    : undefined
  const projectedGroup = typeof storedPayloadOwner === 'string' && storedPayloadOwner.length > 0
    && group && typeof group === 'object' && !Array.isArray(group)
    && group.lock && typeof group.lock === 'object' && !Array.isArray(group.lock)
    ? { ...group, lock: { ...group.lock, owner: publicNovelRunLockOwner(storedPayloadOwner) } }
    : group
  const projectedRun = run && typeof run === 'object' && !Array.isArray(run)
    ? {
        ...run,
        lease_owner: typeof run.lease_owner === 'string' && run.lease_owner.length > 0
          ? publicNovelRunLockOwner(run.lease_owner)
          : run.lease_owner,
        output_ref: typeof run.output_ref === 'string' && projectedGroup && typeof projectedGroup === 'object'
          ? runJson(projectedGroup)
          : run.output_ref,
      }
    : run
  return {
    run: projectedRun,
    group: projectedGroup,
    processed: 0,
    status: 'locked',
    locked_by: publicNovelRunLockOwner(lockedBy),
  }
}

export function createNovelProductionService() {
  const buildPipelineSteps = () => [
    { key: 'context', label: '章节目标确认/续写上下文包', status: 'pending' },
    { key: 'material_repair', label: '缺失材料自动补齐', status: 'pending' },
    { key: 'scene_cards', label: '场景卡生成/人工确认', status: 'pending' },
    { key: 'migration_plan', label: '参考迁移计划', status: 'pending' },
    { key: 'draft', label: '段落级正文生成', status: 'pending' },
    { key: 'review', label: '章节级自检', status: 'pending' },
    { key: 'revise', label: '二次修订', status: 'pending' },
    { key: 'safety', label: '仿写安全阈值', status: 'pending' },
    { key: 'store', label: '入库版本', status: 'pending' },
    { key: 'story_state', label: '记忆状态机更新', status: 'pending' },
  ]

  const updatePipelineStep = (steps: any[], key: string, patch: any) => steps.map(step => step.key === key ? { ...step, ...patch, updated_at: new Date().toISOString() } : step)
  const buildChapterGroupStages = () => buildPipelineSteps().map(step => ({ ...step, status: 'pending' }))
  const updateChapterStages = (stages: any[] = [], key: string, patch: any = {}) => {
    const base = stages.length ? stages : buildChapterGroupStages()
    return updatePipelineStep(base, key, patch)
  }
  const summarizeChapterStages = (stages: any[] = []) => {
    const items = stages.length ? stages : buildChapterGroupStages()
    const failed = items.find(step => step.status === 'failed')
    if (failed) return { status: 'failed', current_step: failed.key, current_label: failed.label }
    const running = items.find(step => ['running', 'ready', 'needs_confirmation'].includes(step.status))
    if (running) return { status: 'running', current_step: running.key, current_label: running.label }
    const success = items.filter(step => step.status === 'success').length
    return { status: success === items.length ? 'success' : 'pending', current_step: items[success]?.key || 'done', current_label: items[success]?.label || '已完成' }
  }

  const runQueueWorkers = new Map<number, any>()

  const getModelStrategy = (project: any, preferredModelId?: number) => ({
    preferred_model_id: preferredModelId || null,
    stages: {
      incubation: { model_id: preferredModelId || null, temperature: 0.65, reason: '原创孵化需要创意和结构稳定性平衡。' },
      outline: { model_id: preferredModelId || null, temperature: 0.45, reason: '大纲和分卷要求结构一致性。' },
      scene_cards: { model_id: preferredModelId || null, temperature: 0.45, reason: '场景卡需要可控，不宜过度发散。' },
      draft: { model_id: preferredModelId || null, temperature: 0.75, reason: '正文初稿需要保留表达弹性。' },
      review: { model_id: preferredModelId || null, temperature: 0.2, reason: '审稿需要低温、稳定和可复现。' },
      revise: { model_id: preferredModelId || null, temperature: 0.62, reason: '修订需要遵循问题清单，同时保留文气。' },
      safety: { model_id: preferredModelId || null, temperature: 0.15, reason: '仿写安全审计需要保守判断。' },
    },
    cost_policy: {
      low_cost_mode: project.reference_config?.model_strategy?.low_cost_mode !== false,
      retry_limit: Number(project.reference_config?.model_strategy?.retry_limit || 2),
      fallback_enabled: project.reference_config?.model_strategy?.fallback_enabled !== false,
    },
  })

  const getStageModelId = (project: any, stage: string, preferredModelId?: number) => {
    const strategy = project.reference_config?.model_strategy || getModelStrategy(project, preferredModelId)
    return Number(strategy?.stages?.[stage]?.model_id || strategy?.preferred_model_id || preferredModelId || 0) || undefined
  }

  const getStageTemperature = (project: any, stage: string, fallback: number) => {
    const value = Number(project.reference_config?.model_strategy?.stages?.[stage]?.temperature)
    return Number.isFinite(value) && value > 0 ? value : fallback
  }

  const getApprovalPolicy = (project: any) => ({
    mode: project.reference_config?.approval_policy?.mode || 'balanced',
    require_scene_card_approval: project.reference_config?.approval_policy?.require_scene_card_approval !== false,
    require_draft_approval: Boolean(project.reference_config?.approval_policy?.require_draft_approval),
    require_low_score_approval: project.reference_config?.approval_policy?.require_low_score_approval !== false,
    low_score_threshold: Number(project.reference_config?.approval_policy?.low_score_threshold || 78),
    require_safety_approval: project.reference_config?.approval_policy?.require_safety_approval !== false,
    allow_full_auto: Boolean(project.reference_config?.approval_policy?.allow_full_auto),
  })

  const approvalRequired = (policy: any, stage: string, approvals: any = {}, context: any = {}) => {
    if (policy?.allow_full_auto) return false
    if (approvals?.[stage]?.approved === true || approvals?.[stage] === true) return false
    if (stage === 'scene_cards') return Boolean(policy?.require_scene_card_approval)
    if (stage === 'draft') return Boolean(policy?.require_draft_approval)
    if (stage === 'low_score') return Boolean(policy?.require_low_score_approval) && Number(context.score || 100) < Number(policy?.low_score_threshold || 78)
    if (stage === 'safety') {
      if (!policy?.require_safety_approval) return false
      return policy.mode === 'strict' || Number(context.copy_hit_count || 0) > 0 || ['medium', 'high'].includes(String(context.risk_level || 'low'))
    }
    return false
  }

  const buildApprovalError = (stage: string, message: string, context: any = {}) => Object.assign(new Error(message), {
    code: 'APPROVAL_REQUIRED',
    approval_stage: stage,
    approval_context: context,
  })

  const getProductionBudget = (project: any) => ({
    max_retries_per_chapter: Number(project.reference_config?.production_budget?.max_retries_per_chapter ?? 2),
    max_daily_generated_chapters: Number(project.reference_config?.production_budget?.max_daily_generated_chapters ?? 50),
    max_failure_rate: Number(project.reference_config?.production_budget?.max_failure_rate ?? 35),
    max_safety_blocks_per_day: Number(project.reference_config?.production_budget?.max_safety_blocks_per_day ?? 5),
    max_run_minutes: Number(project.reference_config?.production_budget?.max_run_minutes ?? 180),
    pause_on_budget_exceeded: project.reference_config?.production_budget?.pause_on_budget_exceeded !== false,
  })

  const getProductionBudgetDecision = (project: any, runs: any[]) => {
    const budget = getProductionBudget(project)
    const today = new Date().toISOString().slice(0, 10)
    const todayRuns = runs.filter(run => String(run.created_at || '').startsWith(today))
    const generatedToday = todayRuns.filter(run => run.run_type === 'generate_prose' && run.status === 'success').length
      + todayRuns.filter(run => run.run_type === 'chapter_group_generation' && String(run.output_ref || '').includes('"status":"success"')).length
    const failedRuns = todayRuns.filter(run => ['failed', 'error'].includes(run.status)).length
    const failureRate = todayRuns.length ? Math.round((failedRuns / todayRuns.length) * 100) : 0
    const safetyBlocks = todayRuns.filter(run => String(run.error_message || '').includes('仿写安全') || String(run.output_ref || '').includes('REFERENCE_SAFETY_BLOCKED')).length
    const reasons = [
      generatedToday >= budget.max_daily_generated_chapters ? `今日生成章节数 ${generatedToday} 已达到上限 ${budget.max_daily_generated_chapters}` : '',
      failureRate > budget.max_failure_rate ? `今日失败率 ${failureRate}% 超过上限 ${budget.max_failure_rate}%` : '',
      safetyBlocks > budget.max_safety_blocks_per_day ? `今日安全阻断 ${safetyBlocks} 次超过上限 ${budget.max_safety_blocks_per_day}` : '',
    ].filter(Boolean)
    return {
      budget,
      blocked: budget.pause_on_budget_exceeded && reasons.length > 0,
      reasons,
      usage: { generated_today: generatedToday, failed_runs: failedRuns, failure_rate: failureRate, safety_blocks: safetyBlocks, total_runs_today: todayRuns.length },
    }
  }

  const getAgentPromptConfig = (project: any) => ({
    version: project.reference_config?.agent_prompt_config?.version || 1,
    prompts: project.reference_config?.agent_prompt_config?.prompts || {},
    project_overrides_enabled: project.reference_config?.agent_prompt_config?.project_overrides_enabled !== false,
    updated_at: project.reference_config?.agent_prompt_config?.updated_at || '',
    history: Array.isArray(project.reference_config?.agent_prompt_config?.history) ? project.reference_config.agent_prompt_config.history : [],
  })

  const buildAgentConfigSnapshot = (project: any, preferredModelId?: number) => {
    const agentConfig = getAgentPromptConfig(project)
    const modelStrategy = project.reference_config?.model_strategy || getModelStrategy(project, preferredModelId)
    const writingBible = project.reference_config?.writing_bible || {}
    const snapshotSource = {
      agent_prompt_config: {
        version: agentConfig.version,
        prompts: agentConfig.prompts,
        project_overrides_enabled: agentConfig.project_overrides_enabled,
        updated_at: agentConfig.updated_at,
      },
      model_strategy: modelStrategy,
      approval_policy: getApprovalPolicy(project),
      production_budget: getProductionBudget(project),
      quality_gate: getQualityGate(project),
      style_lock: getStyleLock(project),
      safety_policy: getSafetyPolicy(project),
      writing_bible: writingBible,
      reference_policy: {
        strength: project.reference_config?.strength || 'balanced',
        references_count: Array.isArray(project.reference_config?.references) ? project.reference_config.references.length : 0,
      },
    }
    const fingerprint = hashText(snapshotSource)
    return {
      snapshot_id: `agentcfg-v${agentConfig.version}-${fingerprint}`,
      created_at: new Date().toISOString(),
      fingerprint,
      agent_prompt_version: agentConfig.version,
      agent_prompt_updated_at: agentConfig.updated_at || '',
      prompt_keys: Object.keys(agentConfig.prompts || {}).sort(),
      model_strategy: modelStrategy,
      approval_policy: snapshotSource.approval_policy,
      quality_gate: snapshotSource.quality_gate,
      style_lock_hash: hashText(snapshotSource.style_lock),
      safety_policy_hash: hashText(snapshotSource.safety_policy),
      writing_bible_hash: hashText(writingBible),
      writing_bible_updated_at: writingBible?.updated_at || '',
      reference_policy: snapshotSource.reference_policy,
      source_hash: fingerprint,
    }
  }

  return {
    buildPipelineSteps,
    updatePipelineStep,
    buildChapterGroupStages,
    updateChapterStages,
    summarizeChapterStages,
    runQueueWorkers,
    getModelStrategy,
    getStageModelId,
    getStageTemperature,
    getApprovalPolicy,
    approvalRequired,
    buildApprovalError,
    getProductionBudget,
    getProductionBudgetDecision,
    classifyGenerationFailure,
    getAgentPromptConfig,
    buildAgentConfigSnapshot,
  }
}

export function createNovelRunExecutionService(ctx: {
  getProject: (workspace: string, id: number) => Promise<any>
  production: NovelProductionService
  generateChapterForGroup: (workspace: string, projectId: number, chapterId: number, options?: Record<string, any> & { chapter_task_id?: string }) => Promise<any>
  listNovelRuns?: (workspace: string, projectId: number) => Promise<any[]>
  updateNovelRun?: (workspace: string, runId: number, patch: any) => Promise<any>
  appendNovelRun?: (workspace: string, data: any) => Promise<any>
  claimNovelRunExecution?: typeof claimNovelRunExecutionRecord
}) {
  const repairRunInFlight = new Map<string, Promise<any>>()
  const injectedClaimQueues = new Map<string, Promise<void>>()
  const executeChapterGroupRunRecord = async (activeWorkspace: string, project: any, run: any, options: any = {}) => {
    const explicitLockOwner = explicitNovelRunLockOwner(options)
    const lockOwner = explicitLockOwner ?? `worker-${process.pid}-${Date.now()}`
    const listRuns = ctx.listNovelRuns || listNovelRuns
    const updateRun = ctx.updateNovelRun || updateNovelRun
    const appendRun = ctx.appendNovelRun || appendNovelRun
    const claimRunExecution = ctx.claimNovelRunExecution || (ctx.updateNovelRun && ctx.updateNovelRun !== updateNovelRun
      ? async (workspace: string, input: Parameters<typeof claimNovelRunExecutionRecord>[1]) => {
          const claimKey = `${workspace}:${input.projectId}:${input.runId}`
          const previous = injectedClaimQueues.get(claimKey) || Promise.resolve()
          let release!: () => void
          const current = new Promise<void>(resolve => { release = resolve })
          const queued = previous.then(() => current)
          injectedClaimQueues.set(claimKey, queued)
          await previous
          try {
            const authoritative = (await listRuns(workspace, input.projectId)).find(item => item.id === input.runId) || null
            if (!authoritative
              || String(authoritative.output_ref || '') !== input.expectedOutputRef
              || String(authoritative.status || '') !== input.expectedStatus
              || (authoritative.lease_owner ?? null) !== input.expectedLeaseOwner
              || (authoritative.lease_expires_at ?? null) !== input.expectedLeaseExpiresAt) {
              return { claimed: false, run: authoritative }
            }
            const updated = await updateRun(workspace, input.runId, {
              status: 'running',
              output_ref: input.outputRef,
              lease_owner: input.owner,
              lease_expires_at: input.expiresAt,
            })
            return { claimed: Boolean(updated), run: updated }
          } finally {
            release()
            if (injectedClaimQueues.get(claimKey) === queued) injectedClaimQueues.delete(claimKey)
          }
        }
      : claimNovelRunExecutionRecord)
    const persistedPayload = parseJsonLikePayload(run.output_ref) || {}
    let payload = compactRunPayload(persistedPayload)
    const existingTerminalAdmission = findExistingTerminalAdmission(payload)
    if (existingTerminalAdmission) {
      let guardedRun = run
      if (run.status !== 'paused') {
        payload = compactRunPayload({
          ...payload,
          current_index: existingTerminalAdmission.index,
          phase: `第${existingTerminalAdmission.item.chapter_no || '?'}章正文无效且未入库，已暂停`,
          last_error: payload.last_error || existingTerminalAdmission.item,
          lock: null,
        })
        guardedRun = await updateRun(activeWorkspace, run.id, {
          status: 'paused',
          output_ref: runJson(payload),
          error_message: existingTerminalAdmission.error,
        })
      }
      return {
        run: guardedRun,
        group: payload,
        processed: 0,
        status: 'paused',
        error: existingTerminalAdmission.error,
        error_code: existingTerminalAdmission.error_code,
        recovery_plan: existingTerminalAdmission.recovery_plan,
      }
    }
    const existingApprovalBlocker = findExistingApprovalBlocker(payload)
    if (existingApprovalBlocker) {
      return {
        run,
        group: payload,
        processed: 0,
        status: 'paused',
        error: existingApprovalBlocker.error,
        error_code: existingApprovalBlocker.error_code,
        recovery_plan: existingApprovalBlocker.recovery_plan,
      }
    }
    const lock = payload.lock || {}
    const lockExpiresAt = lock.expires_at ? new Date(String(lock.expires_at)).getTime() : 0
    if (lock.owner && lockExpiresAt > Date.now() && (run.status === 'running' || lock.owner !== lockOwner)) {
      return projectLockedNovelRunExecution(run, payload, persistedPayload.lock?.owner ?? lock.owner)
    }
    const claimTime = new Date().toISOString()
    const claimExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const claimedPayload = compactRunPayload({
      ...payload,
      lock: {
        owner: lockOwner,
        acquired_at: claimTime,
        heartbeat_at: claimTime,
        expires_at: claimExpiresAt,
      },
    })
    const claimResult = await claimRunExecution(activeWorkspace, {
      projectId: project.id,
      runId: run.id,
      owner: lockOwner,
      expectedOutputRef: String(run.output_ref || ''),
      expectedStatus: String(run.status || ''),
      expectedLeaseOwner: run.lease_owner ?? null,
      expectedLeaseExpiresAt: run.lease_expires_at ?? null,
      outputRef: runJson(claimedPayload),
      now: claimTime,
      expiresAt: claimExpiresAt,
    })
    if (!claimResult.claimed) {
      const authoritativeRun = claimResult.run || run
      const persistedAuthoritativePayload = parseJsonLikePayload(authoritativeRun.output_ref) || {}
      const authoritativePayload = compactRunPayload(persistedAuthoritativePayload)
      return projectLockedNovelRunExecution(
        authoritativeRun,
        authoritativePayload,
        authoritativeRun.lease_owner || persistedAuthoritativePayload.lock?.owner || '',
      )
    }
    run = claimResult.run || run
    payload = compactRunPayload(parseJsonLikePayload(run.output_ref) || claimedPayload)
    const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
    const maxChapters = Math.max(1, Math.min(50, Number(options.max_chapters || chapters.length || 10)))
    const retryLimit = Math.max(0, Math.min(5, Number(options.retry_limit ?? payload.model_strategy?.cost_policy?.retry_limit ?? 2)))
    const startedAt = Date.now()
    const results: any[] = Array.isArray(payload.results) ? payload.results : []
    let processed = 0
    let status = 'running'
    let errorMessage = ''
    await updateRun(activeWorkspace, run.id, {
      status: 'running',
      output_ref: runJson({ ...payload, started_at: payload.started_at || new Date().toISOString(), phase: '自动执行章节群' }),
    })

    const persistStage = async (index: number, stage: string, patch: any = {}) => {
      const item = chapters[index]
      if (!item) return
      const compactPatch = compactRunStateValue(patch) || {}
      const stages = ctx.production.updateChapterStages(item.stages || [], stage, compactPatch)
      const summary = ctx.production.summarizeChapterStages(stages)
      let scenes = Array.isArray(item.scenes) ? item.scenes : []
      const rawSceneCards = Array.isArray(patch.scene_cards)
        ? patch.scene_cards
        : Array.isArray(patch.sceneCards)
          ? patch.sceneCards
          : []
      const sceneCards = rawSceneCards.map(compactRunSceneCard)
      if (stage === 'scene_cards' && sceneCards.length > 0) {
        scenes = normalizeSceneProduction(sceneCards, scenes, 'planned')
      }
      if (patch.scene_status) {
        scenes = advanceSceneProduction(scenes, patch.scene_status, stage === 'draft' ? { generated_at: new Date().toISOString() } : {})
      }
      chapters[index] = compactRunChapterItem({ ...item, scenes, stages, current_step: summary.current_step, current_label: summary.current_label })
      payload = compactRunPayload({ ...payload, chapters, current_index: index, phase: `第${item.chapter_no}章：${summary.current_label}` })
      await updateRun(activeWorkspace, run.id, { status: 'running', output_ref: runJson(payload), duration_ms: Date.now() - startedAt })
    }

    for (let index = Number(payload.current_index || 0); index < chapters.length && processed < maxChapters; index += 1) {
      const latestRun = (await listRuns(activeWorkspace, project.id)).find(item => item.id === run.id)
      if (latestRun?.status === 'paused') {
        status = 'paused'
        payload = { ...(parseJsonLikePayload(latestRun.output_ref) || payload), current_index: index, phase: '已暂停' }
        break
      }
      const item = chapters[index]
        payload = compactRunPayload({
          ...payload,
          lock: {
            ...(payload.lock || {}),
            heartbeat_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          },
        })
      if (!item?.id) continue
      if (item.next_run_at && new Date(String(item.next_run_at)).getTime() > Date.now()) {
        payload = compactRunPayload({ ...payload, chapters, current_index: index, phase: `第${item.chapter_no}章等待重试窗口` })
        await updateRun(activeWorkspace, run.id, { status: 'ready', output_ref: runJson(payload) })
        status = 'ready'
        break
      }
      if (item.status === 'written' && options.regenerate !== true) {
        chapters[index] = compactRunChapterItem({ ...item, status: 'skipped', skipped_reason: '已有正文' })
        payload = compactRunPayload({ ...payload, chapters, current_index: index + 1 })
        await updateRun(activeWorkspace, run.id, { status: 'running', output_ref: runJson(payload) })
        continue
      }
      const chapterTaskId = isChapterTaskId(item.chapter_task_id) ? item.chapter_task_id : randomUUID()
      chapters[index] = compactRunChapterItem({ ...item, chapter_task_id: chapterTaskId, status: 'running', started_at: new Date().toISOString(), stages: item.stages?.length ? item.stages : ctx.production.buildChapterGroupStages() })
      payload = compactRunPayload({ ...payload, chapters, current_index: index, phase: `生成第${item.chapter_no}章` })
      await updateRun(activeWorkspace, run.id, { status: 'running', output_ref: runJson(payload) })
      try {
        const productionMode = options.production_mode || payload.production_mode || payload.policy?.production_mode || 'draft_review_revise_store'
        const approvalPolicy = productionMode === 'full_auto'
          ? { ...(payload.approval_policy || ctx.production.getApprovalPolicy(project)), allow_full_auto: true }
          : (payload.approval_policy || ctx.production.getApprovalPolicy(project))
        const chapterResult = await ctx.generateChapterForGroup(activeWorkspace, project.id, Number(item.id), {
          ...options,
          chapter_task_id: chapterTaskId,
          model_id: options.model_id || payload.model_strategy?.preferred_model_id,
          production_mode: productionMode,
          word_target_mode: options.word_target_mode || payload.word_target_mode,
          target_word_count: options.target_word_count || payload.target_word_count,
          quality_threshold: options.quality_threshold || payload.policy?.quality_threshold,
          allow_incomplete: options.allow_incomplete === true || payload.policy?.allow_incomplete === true || payload.unattended?.allow_incomplete === true,
          force_scene_cards: options.force_scene_cards === true || payload.policy?.force_scene_cards === true || payload.unattended?.force_scene_cards === true,
          auto_repair_missing_material: options.auto_repair_missing_material === true || payload.policy?.auto_repair_missing_material === true || payload.unattended?.auto_repair_missing_material === true,
          auto_repair_quality_gate: false,
          approval_policy: approvalPolicy,
          approvals: item.approvals || {},
          onStage: async (stage: string, patch: any = {}) => {
            try {
              await persistStage(index, stage, patch)
            } catch (stageError) {
              console.warn('[novel] failed to persist chapter group stage:', stage, String(stageError).slice(0, 160))
            }
          },
        })
        const qualityThreshold = options.quality_threshold || payload.policy?.quality_threshold
        const returnedApprovalBlocker = buildReturnedApprovalBlocker(chapterResult, qualityThreshold)
        if (returnedApprovalBlocker) {
          const returnedBlockedInvalid = returnedApprovalBlocker.type === 'blocked_invalid'
          const failedStages = ctx.production.updateChapterStages(chapters[index]?.stages || [], 'review', {
            status: returnedBlockedInvalid ? 'failed' : 'needs_confirmation',
            error: `${returnedApprovalBlocker.label}：${returnedApprovalBlocker.detail}`,
            approval_stage: returnedBlockedInvalid ? '' : 'approval_blocker',
          })
          const resultItem = {
            id: item.id,
            chapter_task_id: chapterTaskId,
            chapter_no: item.chapter_no,
            title: item.title,
            status: returnedBlockedInvalid ? 'failed' : 'needs_approval',
            attempts: Number(item.attempts || 0),
            next_run_at: '',
            approvals: item.approvals || {},
            admission_status: returnedBlockedInvalid ? 'blocked_invalid' : chapterResult.admission_status || chapterResult.admissionStatus || '',
            score: chapterResult.score ?? returnedApprovalBlocker.score ?? null,
            revised: chapterResult.revised,
            stages: failedStages,
            approval_stage: returnedBlockedInvalid ? '' : 'approval_blocker',
            approval_context: returnedBlockedInvalid ? null : returnedApprovalBlocker,
            config_snapshot: chapterResult.config_snapshot || payload.config_snapshot || ctx.production.buildAgentConfigSnapshot(project, options.model_id || payload.model_strategy?.preferred_model_id),
            error: `${returnedApprovalBlocker.label}：${returnedApprovalBlocker.detail}`,
            error_code: returnedBlockedInvalid ? 'PROSE_ADMISSION_BLOCKED_INVALID' : 'APPROVAL_BLOCKER',
            recovery_plan: returnedBlockedInvalid
              ? {
                  type: 'blocked_invalid',
                  summary: '正文未通过有效性检查且未入库；当前章已终止，不会自动重试或进入人工批准。',
                  actions: ['检查正文完整性和硬约束', '修复当前章后重新提交生成'],
                }
              : {
                  type: 'approval_blocker',
                  summary: '章节生成返回成功，但入库阻断仍未解除；已暂停后续无人值守续写。',
                  actions: ['按入库阻断原因修订正文', '重新运行正文质检和入库门禁', '确认阻断解除后再继续后续章节生成'],
                },
            failed_at: new Date().toISOString(),
          }
          const storedResultItem = compactRunChapterItem(resultItem)
          chapters[index] = storedResultItem
          results.push(storedResultItem)
          status = 'paused'
          errorMessage = storedResultItem.error
          payload = compactRunPayload({
            ...payload,
            chapters,
            results,
            current_index: index,
            phase: returnedBlockedInvalid ? `第${item.chapter_no}章正文无效且未入库，已暂停` : `第${item.chapter_no}章入库阻断未解除，已暂停`,
            last_error: storedResultItem,
          })
          await updateRun(activeWorkspace, run.id, { status, output_ref: runJson(payload), error_message: errorMessage })
          break
        }
        const storyStateUpdate = chapterResult.story_state_update || chapterResult.storyStateUpdate || {}
        const storyStateStatus = String(
          chapterResult.story_state_status
          || chapterResult.storyStateStatus
          || (storyStateUpdate?.error || storyStateUpdate?.skipped ? 'pending' : 'synced'),
        )
        const storyStateWarning = chapterResult.story_state_warning || chapterResult.storyStateWarning || storyStateUpdate?.error || null
        const postDeliveryQuality = buildOhStoryPostDeliveryQuality(chapterResult, item)
        const postDeliveryOpenCheck = Array.isArray(postDeliveryQuality.checks)
          ? postDeliveryQuality.checks.find((check: any) => String(check?.status || '') !== 'ok')
          : null
        const postDeliveryHasWarnings = postDeliveryQuality.status !== 'ok'
        const warningSummary = postDeliveryHasWarnings
          ? compactText(`${postDeliveryOpenCheck?.label || '交付后质检'}：${postDeliveryOpenCheck?.summary || 'Step 3 仍有未闭环项。'}`, 300)
          : ''
        const warningFields = collectChapterWarnings({
          ...chapterResult,
          story_state_status: storyStateStatus,
          story_state_warning: storyStateWarning,
        }, postDeliveryQuality)
        const admissionStatus = String(chapterResult.admission_status || chapterResult.admissionStatus || (warningFields.warning_count > 0 ? 'accepted_with_warnings' : 'accepted'))
        let resultItem = {
          id: item.id,
          chapter_task_id: chapterTaskId,
          chapter_no: item.chapter_no,
          title: item.title,
          status: 'success',
          attempts: Number(item.attempts || 0),
          next_run_at: '',
          approvals: item.approvals || {},
          admission_status: admissionStatus,
          story_state_status: storyStateStatus,
          ...warningFields,
          score: chapterResult.score,
          revised: chapterResult.revised,
          production_mode: productionMode,
          config_snapshot: chapterResult.config_snapshot || payload.config_snapshot || null,
          scenes: advanceSceneProduction(chapters[index]?.scenes || [], 'accepted'),
          stages: ctx.production.updateChapterStages(chapters[index]?.stages || [], 'story_state', storyStateStatus === 'pending'
            ? { status: 'warning', warnings: compactWarningList(storyStateWarning || 'Story State 同步待完成。') }
            : { status: 'success' }),
          error: '',
          error_code: '',
          post_delivery_quality: postDeliveryQuality,
          recovery_plan: warningFields.warning_count > 0
            ? {
                type: postDeliveryHasWarnings ? 'post_delivery_quality_warn' : 'admitted_with_warnings',
                summary: `章节正文已入库；${warningSummary || '仍有异步质量修订或状态同步建议'}，不阻塞后续章节。`,
                actions: ['保留已入库正文', '按 warnings/post_delivery_quality 异步修订或同步', '修复完成后重新运行对应检查'],
              }
            : null,
          completed_at: new Date().toISOString(),
        }
        if (postDeliveryHasWarnings) {
          const repairFingerprint = buildPostDeliveryQualityRepairFingerprint(run, resultItem, postDeliveryQuality)
          const repairInFlightKey = `${activeWorkspace}:${project.id}:${repairFingerprint}`
          resultItem = { ...resultItem, repair_fingerprint: repairFingerprint }
          let repairPromise = repairRunInFlight.get(repairInFlightKey)
          const reusedInFlight = Boolean(repairPromise)
          if (!repairPromise) {
            repairPromise = (async () => {
              const existingRuns = await listRuns(activeWorkspace, project.id).catch(() => [])
              return appendPostDeliveryQualityRepairRun(
                appendRun,
                activeWorkspace,
                project.id,
                run,
                resultItem,
                postDeliveryQuality,
                repairFingerprint,
                existingRuns,
              )
            })()
            repairRunInFlight.set(repairInFlightKey, repairPromise)
          }
          const resolvedRepairRun = await repairPromise.catch(error => {
            console.warn('[novel] failed to append post-delivery quality repair run:', String(error).slice(0, 160))
            return null
          }).finally(() => {
            if (repairRunInFlight.get(repairInFlightKey) === repairPromise) repairRunInFlight.delete(repairInFlightKey)
          })
          const repairRun = resolvedRepairRun && reusedInFlight ? { ...resolvedRepairRun, reused: true } : resolvedRepairRun
          if (repairRun?.id) {
            resultItem = {
              ...resultItem,
              repair_run_id: repairRun.id,
              repair_queue: {
                run_id: repairRun.id,
                run_type: repairRun.run_type,
                task_count: buildPostDeliveryQualityRepairTasks(resultItem, postDeliveryQuality, run.id).length,
                repair_fingerprint: repairFingerprint,
                reused: repairRun.reused === true,
              },
            }
          }
        }
        const storedResultItem = compactRunChapterItem(resultItem)
        chapters[index] = storedResultItem
        results.push(storedResultItem)
        processed += 1
      } catch (chapterError: any) {
        const wasCanceled = options.abortSignal?.aborted || isAbortLikeError(chapterError)
        if (wasCanceled) {
          const currentStages = chapters[index]?.stages || ctx.production.buildChapterGroupStages()
          const resultItem = compactRunChapterItem({
            ...item,
            chapter_task_id: chapterTaskId,
            status: 'ready',
            stages: currentStages,
            attempts: Number(item.attempts || 0),
            next_run_at: '',
            error: '',
            error_code: 'REQUEST_CANCELED',
            stopped_at: new Date().toISOString(),
          })
          chapters[index] = resultItem
          status = 'ready'
          errorMessage = ''
          payload = compactRunPayload({
            ...payload,
            chapters,
            results,
            current_index: index,
            phase: `第${item.chapter_no}章已停止，可继续执行`,
            last_error: null,
          })
          await updateRun(activeWorkspace, run.id, { status, output_ref: runJson(payload), error_message: '' })
          break
        }
        const isApproval = chapterError?.code === 'APPROVAL_REQUIRED'
        const blockedInvalid = String(chapterError?.admission_status || chapterError?.admissionStatus || '') === 'blocked_invalid'
        const blocksForApproval = isApproval && !blockedInvalid
        const failedStages = (() => {
          const current = chapters[index]?.stages || ctx.production.buildChapterGroupStages()
          const active = current.find((step: any) => ['running', 'ready', 'needs_confirmation'].includes(step.status)) || current.find((step: any) => step.status === 'pending') || current[0]
          return active ? ctx.production.updateChapterStages(current, active.key, {
            status: blocksForApproval ? 'needs_confirmation' : 'failed',
            error: String(chapterError?.message || chapterError),
            approval_stage: blocksForApproval ? chapterError?.approval_stage || '' : '',
          }) : current
        })()
        const attempts = Number(item.attempts || 0) + (blocksForApproval || blockedInvalid ? 0 : 1)
        const canRetry = !blocksForApproval && !blockedInvalid && attempts <= retryLimit
        const nextRunAt = canRetry
          ? new Date(Date.now() + Math.min(15, attempts * 2) * 60000).toISOString()
          : ''
        const resultItem = compactRunChapterItem({
          id: item.id,
          chapter_task_id: chapterTaskId,
          chapter_no: item.chapter_no,
          title: item.title,
          status: blocksForApproval ? 'needs_approval' : (canRetry ? 'ready' : 'failed'),
          stages: failedStages,
          attempts,
          next_run_at: nextRunAt,
          approvals: item.approvals || {},
          admission_status: chapterError?.admission_status || chapterError?.admissionStatus || '',
          approval_stage: blocksForApproval ? chapterError?.approval_stage || '' : '',
          approval_context: blocksForApproval ? chapterError?.approval_context || null : null,
          config_snapshot: payload.config_snapshot || ctx.production.buildAgentConfigSnapshot(project, options.model_id || payload.model_strategy?.preferred_model_id),
          error: String(chapterError?.message || chapterError),
          error_code: chapterError?.code || '',
          recovery_plan: chapterError?.recovery_plan || chapterError?.recoveryPlan || ctx.production.classifyGenerationFailure(chapterError),
          failed_at: new Date().toISOString(),
        })
        chapters[index] = resultItem
        results.push(resultItem)
        errorMessage = resultItem.error
        if (blocksForApproval || blockedInvalid || canRetry || payload.policy?.stop_on_failure !== false) {
          status = blocksForApproval ? 'paused' : (canRetry ? 'ready' : 'paused')
          payload = compactRunPayload({
            ...payload,
            chapters,
            results,
            current_index: index,
            phase: blocksForApproval
              ? `第${item.chapter_no}章等待人工确认`
              : canRetry
                  ? `第${item.chapter_no}章失败，等待重试`
                  : `第${item.chapter_no}章失败，已暂停`,
            last_error: resultItem,
          })
          await updateRun(activeWorkspace, run.id, { status, output_ref: runJson(payload), error_message: errorMessage })
          break
        }
      }
      payload = compactRunPayload({ ...payload, chapters, results, current_index: index + 1, phase: '自动执行章节群', last_error: null })
      await updateRun(activeWorkspace, run.id, {
        status: 'running',
        output_ref: runJson(payload),
        duration_ms: Date.now() - startedAt,
      })
    }
    if (status === 'running') {
      status = chapters.every((item: any) => ['success', 'skipped', 'written'].includes(item.status)) ? 'success' : 'ready'
    }
    if (status === 'success') {
      payload = compactRunPayload({ ...payload, post_batch_quality_check: buildOhStoryBatchQualityCheck(chapters, results) })
    }
    const updated = await updateRun(activeWorkspace, run.id, {
      status,
      output_ref: runJson(compactRunPayload({ ...payload, chapters, results, lock: null, phase: status === 'success' ? '章节群已完成' : payload.phase, finished_at: status === 'success' ? new Date().toISOString() : undefined })),
      duration_ms: Date.now() - startedAt,
      error_message: errorMessage,
      lease_owner: null,
      lease_expires_at: null,
    })
    requestRuntimeGc()
    return { run: updated, group: parseJsonLikePayload(updated?.output_ref), processed, status }
  }

  return { executeChapterGroupRunRecord }
}

export type NovelProductionService = ReturnType<typeof createNovelProductionService>
