import { listNovelRuns, updateNovelRun } from '../novel'
import { advanceSceneProduction, normalizeSceneProduction, parseJsonLikePayload } from './novel-route-utils'

export function createNovelProductionService() {
  const buildPipelineSteps = () => [
    { key: 'context', label: '章节目标确认/续写上下文包', status: 'pending' },
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

  const classifyGenerationFailure = (error: any) => {
    const text = String(error?.message || error?.error || error || '')
    if (text.includes('upload current user input file') || text.includes('upload file failed')) return { type: 'provider_upload_failed', actions: ['缩短上下文后重试', '切换模型重试', '把章节批量拆小'] }
    if (text.includes('JSON') || text.includes('解析')) return { type: 'json_parse_failed', actions: ['使用 JSON 修复解析', '降低输出字段复杂度后重试'] }
    if (text.includes('模型未返回正文') || text.includes('未返回正文')) return { type: 'empty_prose', actions: ['降低上下文字数重试', '强制重新生成场景卡', '切换正文模型'] }
    if (text.includes('仿写安全') || text.includes('REFERENCE_SAFETY_BLOCKED')) return { type: 'reference_safety_blocked', actions: ['生成参考迁移计划', '替换高风险专名和桥段', '降低参考强度后重试'] }
    if (text.includes('前置检查') || text.includes('PREFLIGHT')) return { type: 'preflight_blocked', actions: ['补齐章节目标/结尾钩子/角色状态', '生成场景卡', '允许缺材料继续'] }
    if (error?.code === 'APPROVAL_REQUIRED') return { type: 'approval_required', actions: ['人工确认当前关卡', '调整审批策略', '确认后继续执行'] }
    return { type: 'unknown', actions: ['查看原始错误', '手动重试', '切换模型重试'] }
  }

  const getAgentPromptConfig = (project: any) => ({
    version: project.reference_config?.agent_prompt_config?.version || 1,
    prompts: project.reference_config?.agent_prompt_config?.prompts || {},
    project_overrides_enabled: project.reference_config?.agent_prompt_config?.project_overrides_enabled !== false,
    updated_at: project.reference_config?.agent_prompt_config?.updated_at || '',
  })

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
  }
}

export function createNovelRunExecutionService(ctx: {
  getProject: (workspace: string, id: number) => Promise<any>
  production: NovelProductionService
  generateChapterForGroup: (workspace: string, projectId: number, chapterId: number, options?: any) => Promise<any>
}) {
  const executeChapterGroupRunRecord = async (activeWorkspace: string, project: any, run: any, options: any = {}) => {
    let payload = parseJsonLikePayload(run.output_ref) || {}
    const lockOwner = String(options.lock_owner || `worker-${process.pid}-${Date.now()}`)
    const lock = payload.lock || {}
    const lockExpiresAt = lock.expires_at ? new Date(String(lock.expires_at)).getTime() : 0
    if (lock.owner && lock.owner !== lockOwner && lockExpiresAt > Date.now()) {
      return { run, group: payload, processed: 0, status: 'locked', locked_by: lock.owner }
    }
    payload = {
      ...payload,
      lock: {
        owner: lockOwner,
        acquired_at: new Date().toISOString(),
        heartbeat_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
    }
    await updateNovelRun(activeWorkspace, run.id, { status: 'running', output_ref: JSON.stringify(payload) })
    const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
    const maxChapters = Math.max(1, Math.min(50, Number(options.max_chapters || chapters.length || 10)))
    const retryLimit = Math.max(0, Math.min(5, Number(options.retry_limit ?? payload.model_strategy?.cost_policy?.retry_limit ?? 2)))
    const startedAt = Date.now()
    const results: any[] = Array.isArray(payload.results) ? payload.results : []
    let processed = 0
    let status = 'running'
    let errorMessage = ''
    await updateNovelRun(activeWorkspace, run.id, {
      status: 'running',
      output_ref: JSON.stringify({ ...payload, started_at: payload.started_at || new Date().toISOString(), phase: '自动执行章节群' }),
    })

    const persistStage = async (index: number, stage: string, patch: any = {}) => {
      const item = chapters[index]
      if (!item) return
      const stages = ctx.production.updateChapterStages(item.stages || [], stage, patch)
      const summary = ctx.production.summarizeChapterStages(stages)
      let scenes = Array.isArray(item.scenes) ? item.scenes : []
      if (stage === 'scene_cards' && Array.isArray(patch.scene_cards)) {
        scenes = normalizeSceneProduction(patch.scene_cards, scenes, 'planned')
      }
      if (patch.scene_status) {
        scenes = advanceSceneProduction(scenes, patch.scene_status, stage === 'draft' ? { generated_at: new Date().toISOString() } : {})
      }
      chapters[index] = { ...item, scenes, stages, current_step: summary.current_step, current_label: summary.current_label }
      payload = { ...payload, chapters, current_index: index, phase: `第${item.chapter_no}章：${summary.current_label}` }
      await updateNovelRun(activeWorkspace, run.id, { status: 'running', output_ref: JSON.stringify(payload), duration_ms: Date.now() - startedAt })
    }

    for (let index = Number(payload.current_index || 0); index < chapters.length && processed < maxChapters; index += 1) {
      const latestRun = (await listNovelRuns(activeWorkspace, project.id)).find(item => item.id === run.id)
      if (latestRun?.status === 'paused') {
        status = 'paused'
        payload = { ...(parseJsonLikePayload(latestRun.output_ref) || payload), current_index: index, phase: '已暂停' }
        break
      }
      const item = chapters[index]
      payload = {
        ...payload,
        lock: {
          ...(payload.lock || {}),
          heartbeat_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        },
      }
      if (!item?.id) continue
      if (item.next_run_at && new Date(String(item.next_run_at)).getTime() > Date.now()) {
        payload = { ...payload, chapters, current_index: index, phase: `第${item.chapter_no}章等待重试窗口` }
        await updateNovelRun(activeWorkspace, run.id, { status: 'ready', output_ref: JSON.stringify(payload) })
        status = 'ready'
        break
      }
      if (item.status === 'written' && options.regenerate !== true) {
        chapters[index] = { ...item, status: 'skipped', skipped_reason: '已有正文' }
        payload = { ...payload, chapters, current_index: index + 1 }
        await updateNovelRun(activeWorkspace, run.id, { status: 'running', output_ref: JSON.stringify(payload) })
        continue
      }
      chapters[index] = { ...item, status: 'running', started_at: new Date().toISOString(), stages: item.stages?.length ? item.stages : ctx.production.buildChapterGroupStages() }
      payload = { ...payload, chapters, current_index: index, phase: `生成第${item.chapter_no}章` }
      await updateNovelRun(activeWorkspace, run.id, { status: 'running', output_ref: JSON.stringify(payload) })
      try {
        const productionMode = options.production_mode || payload.production_mode || payload.policy?.production_mode || 'draft_review_revise_store'
        const approvalPolicy = productionMode === 'full_auto'
          ? { ...(payload.approval_policy || ctx.production.getApprovalPolicy(project)), allow_full_auto: true }
          : (payload.approval_policy || ctx.production.getApprovalPolicy(project))
        const chapterResult = await ctx.generateChapterForGroup(activeWorkspace, project.id, Number(item.id), {
          ...options,
          model_id: options.model_id || payload.model_strategy?.preferred_model_id,
          production_mode: productionMode,
          allow_incomplete: options.allow_incomplete === true,
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
        const resultItem = {
          id: item.id,
          chapter_no: item.chapter_no,
          title: item.title,
          status: 'success',
          score: chapterResult.score,
          revised: chapterResult.revised,
          production_mode: productionMode,
          scenes: advanceSceneProduction(chapters[index]?.scenes || [], 'accepted'),
          stages: (chapterResult.story_state_update as any)?.skipped
            ? (chapters[index]?.stages || [])
            : ctx.production.updateChapterStages(chapters[index]?.stages || [], 'story_state', { status: (chapterResult.story_state_update as any)?.error ? 'failed' : 'success' }),
          completed_at: new Date().toISOString(),
        }
        chapters[index] = resultItem
        results.push(resultItem)
        processed += 1
      } catch (chapterError: any) {
        const isApproval = chapterError?.code === 'APPROVAL_REQUIRED'
        const failedStages = (() => {
          const current = chapters[index]?.stages || ctx.production.buildChapterGroupStages()
          const active = current.find((step: any) => ['running', 'ready', 'needs_confirmation'].includes(step.status)) || current.find((step: any) => step.status === 'pending') || current[0]
          return active ? ctx.production.updateChapterStages(current, active.key, { status: isApproval ? 'needs_confirmation' : 'failed', error: String(chapterError?.message || chapterError), approval_stage: chapterError?.approval_stage || '' }) : current
        })()
        const attempts = Number(item.attempts || 0) + (isApproval ? 0 : 1)
        const canRetry = !isApproval && attempts <= retryLimit
        const nextRunAt = canRetry ? new Date(Date.now() + Math.min(15, attempts * 2) * 60000).toISOString() : ''
        const resultItem = {
          id: item.id,
          chapter_no: item.chapter_no,
          title: item.title,
          status: isApproval ? 'needs_approval' : (canRetry ? 'ready' : 'failed'),
          stages: failedStages,
          attempts,
          next_run_at: nextRunAt,
          approval_stage: chapterError?.approval_stage || '',
          approval_context: chapterError?.approval_context || null,
          error: String(chapterError?.message || chapterError),
          error_code: chapterError?.code || '',
          recovery_plan: ctx.production.classifyGenerationFailure(chapterError),
          failed_at: new Date().toISOString(),
        }
        chapters[index] = resultItem
        results.push(resultItem)
        errorMessage = resultItem.error
        if (isApproval || canRetry || payload.policy?.stop_on_failure !== false) {
          status = isApproval ? 'paused' : (canRetry ? 'ready' : 'paused')
          payload = {
            ...payload,
            chapters,
            results,
            current_index: index,
            phase: isApproval ? `第${item.chapter_no}章等待人工确认` : canRetry ? `第${item.chapter_no}章失败，等待重试` : `第${item.chapter_no}章失败，已暂停`,
            last_error: resultItem,
          }
          await updateNovelRun(activeWorkspace, run.id, { status, output_ref: JSON.stringify(payload), error_message: errorMessage })
          break
        }
      }
      payload = { ...payload, chapters, results, current_index: index + 1, phase: '自动执行章节群' }
      await updateNovelRun(activeWorkspace, run.id, {
        status: 'running',
        output_ref: JSON.stringify(payload),
        duration_ms: Date.now() - startedAt,
      })
    }
    if (status === 'running') {
      status = chapters.every((item: any) => ['success', 'skipped', 'written'].includes(item.status)) ? 'success' : 'ready'
    }
    const updated = await updateNovelRun(activeWorkspace, run.id, {
      status,
      output_ref: JSON.stringify({ ...payload, chapters, results, lock: null, phase: status === 'success' ? '章节群已完成' : payload.phase, finished_at: status === 'success' ? new Date().toISOString() : undefined }),
      duration_ms: Date.now() - startedAt,
      error_message: errorMessage,
    })
    return { run: updated, group: parseJsonLikePayload(updated?.output_ref), processed, status }
  }

  return { executeChapterGroupRunRecord }
}

export type NovelProductionService = ReturnType<typeof createNovelProductionService>
