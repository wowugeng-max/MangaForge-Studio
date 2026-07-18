import { message } from 'antd'

type AnyRecord = Record<string, any>

export type CommercialRepairQueueHandlerDeps = {
  apiClient: any
  projectId: any
  loadProductionTasks: any
  loadProjectModules: any
  setTaskCenterOpen: any
  setCommercialToolLoading: any
  runCommercialTool: (key: string, label: string, fn: () => Promise<any>) => Promise<any>
  autoCreationDirectorModel: any
  setAutoDirectorActionLoadingKey: any
}

export function createCommercialRepairQueueHandlers(deps: CommercialRepairQueueHandlerDeps) {
  const {
    apiClient,
    projectId,
    loadProductionTasks,
    loadProjectModules,
    setTaskCenterOpen,
    setCommercialToolLoading,
    runCommercialTool,
    autoCreationDirectorModel,
    setAutoDirectorActionLoadingKey,
  } = deps

const createFirst30RetentionRepairQueue = async () => {
  setCommercialToolLoading('first30Repair')
  try {
    const res = await apiClient.post(`/novel/projects/${projectId}/first30-retention-diagnosis/repair-queue`)
    await loadProjectModules()
    await loadProductionTasks()
    setTaskCenterOpen(true)
    message.success(`已生成前30章留存修复任务：${(res.data?.tasks || []).length} 项`)
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '生成前30章留存修复任务失败')
  } finally {
    setCommercialToolLoading('')
  }
}

const createReaderTrialRepairQueue = async () => {
  setCommercialToolLoading('readerTrialRepair')
  try {
    const res = await apiClient.post(`/novel/projects/${projectId}/reader-trial-review/repair-queue`)
    await loadProjectModules()
    await loadProductionTasks()
    setTaskCenterOpen(true)
    message.success(`已生成读者试读修复任务：${(res.data?.tasks || []).length} 项`)
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '生成读者试读修复任务失败')
  } finally {
    setCommercialToolLoading('')
  }
}

const createStyleSampleBatchRepairQueue = async () => {
  const preflight = autoCreationDirectorModel.batchGuardrail.preflight.inputSnapshot?.style_sample_batch_preflight
    || autoCreationDirectorModel.batchGuardrail.recommendedAction.payload
    || {}
  const tasks = preflight.repair_tasks || preflight.repairTasks || []
  if (!tasks.length) {
    message.info('当前下一批任务书没有需要批量重审的风险样章。')
    return
  }
  setAutoDirectorActionLoadingKey('create_style_sample_batch_repair')
  try {
    await apiClient.post('/novel/runs', {
      project_id: projectId,
      run_type: 'longform_production_repair',
      step_name: `style-sample-batch-taskbook-repair-${tasks.length}`,
      status: 'ready',
      input_ref: {
        source: 'style_sample_batch_preflight',
        status: preflight.status,
        risk_count: preflight.risk_count,
        risky_sample_keys: preflight.risky_sample_keys || [],
        affected_chapter_nos: preflight.affected_chapter_nos || [],
        chapter_range_label: autoCreationDirectorModel.batchGuardrail.preflight.inputSnapshot?.chapter_range_label,
      },
      output_ref: {
        report: {
          source: 'style_sample_batch_preflight',
          summary: preflight.summary,
          status: preflight.status,
          task_count: tasks.length,
          risky_sample_keys: preflight.risky_sample_keys || [],
          affected_chapter_nos: preflight.affected_chapter_nos || [],
        },
        recommendations: [
          '先对命中风险样章的章节执行换样章并重审任务书，再恢复多章安全连写。',
          '重审后回到自动创作总控台，确认风格样章预检恢复绿色，再开始下一批。',
        ],
        tasks,
      },
    })
    await loadProjectModules()
    await loadProductionTasks()
    setTaskCenterOpen(true)
    message.success(`已生成样章任务书修复任务：${tasks.length} 项`)
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '生成样章任务书修复任务失败')
  } finally {
    setAutoDirectorActionLoadingKey('')
  }
}

const createRecoveryEvidenceGovernanceQueue = async (payload?: AnyRecord) => {
  const queue = payload?.recoveryEvidenceGovernanceQueue
    || autoCreationDirectorModel.batchGuardrail.recommendedAction.payload?.recoveryEvidenceGovernanceQueue
    || {}
  const tasks = Array.isArray(queue.tasks) ? queue.tasks : []
  if (!tasks.length) {
    message.info('当前恢复依据生产闸门没有需要生成队列的未闭环来源。')
    return
  }
  setAutoDirectorActionLoadingKey('create_recovery_evidence_governance_queue')
  try {
    await apiClient.post('/novel/runs', {
      project_id: projectId,
      run_type: 'longform_production_repair',
      step_name: `recovery-evidence-governance-queue-${tasks.length}`,
      status: 'ready',
      input_ref: {
        source: 'recovery_evidence_governance_queue',
        status: queue.status,
        source_count: queue.source_count,
        main_action: queue.main_action,
        next_cycle: queue.next_cycle,
        source_run_id: payload?.sourceRunId,
        source_task_index: payload?.sourceTaskIndex,
        source_task: payload?.sourceTask,
        batch_preflight: payload?.batch_preflight || autoCreationDirectorModel.batchGuardrail.preflight.inputSnapshot,
      },
      output_ref: {
        report: {
          source: 'recovery_evidence_governance_queue',
          summary: queue.summary,
          status: queue.status,
          task_count: tasks.length,
          source_count: queue.source_count,
          main_action: queue.main_action,
          next_cycle: queue.next_cycle,
          regovernance_source_run_id: payload?.sourceRunId,
          regovernance_source_task_index: payload?.sourceTaskIndex,
          sources: queue.sources || [],
        },
        recommendations: queue.recommendations || [
          '先处理恢复依据生产闸门未闭环来源，再恢复安全连写。',
          '处理后重新生成恢复依据审计摘要，确认生产阻断已解除。',
        ],
        tasks,
      },
    })
    await loadProjectModules()
    await loadProductionTasks()
    setTaskCenterOpen(true)
    message.success(`已生成恢复依据治理队列：${tasks.length} 项`)
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '生成恢复依据治理队列失败')
  } finally {
    setAutoDirectorActionLoadingKey('')
  }
}

const createSafeBatchRiskRepairQueue = async () => {
  const reviewQueue = autoCreationDirectorModel.batchReviewQueue
  const tasks = reviewQueue.riskRadar.repairTasks || []
  if (!tasks.length) {
    message.info('当前安全连写批次没有可生成的风险修复任务。')
    return
  }
  setAutoDirectorActionLoadingKey('create_safe_batch_risk_repair')
  try {
    const res = await apiClient.post('/novel/runs', {
      project_id: projectId,
      run_type: 'longform_production_repair',
      step_name: `safe-batch-risk-repair-${tasks.length}`,
      status: 'ready',
      input_ref: {
        source: 'auto_creation_safe_batch_risk',
        batch_created_at: reviewQueue.createdAt,
        total: reviewQueue.total,
        delivered: reviewQueue.delivered,
        risk_status: reviewQueue.riskRadar.status,
      },
      output_ref: {
        report: {
          source: 'auto_creation_safe_batch_risk',
          summary: reviewQueue.summary,
          status: reviewQueue.status,
          average_quality_score: reviewQueue.riskRadar.averageQualityScore,
          core_risk_count: reviewQueue.riskRadar.coreRiskCount,
          payoff_debt_count: reviewQueue.riskRadar.payoffDebtCount,
          reader_pull_risk_count: reviewQueue.riskRadar.readerPullRiskCount,
          storyline_risk_count: reviewQueue.riskRadar.storylineRiskCount,
          innovation_risk_count: reviewQueue.riskRadar.innovationRiskCount,
          readability_risk_count: reviewQueue.riskRadar.readabilityRiskCount,
          serial_rhythm_risk_count: reviewQueue.riskRadar.serialRhythmRiskCount,
          asset_growth_risk_count: reviewQueue.riskRadar.assetGrowthRiskCount,
          volume_segment_risk_count: reviewQueue.riskRadar.volumeSegmentRiskCount,
          batch_plan_risk_count: reviewQueue.riskRadar.batchPlanRiskCount,
          task_count: tasks.length,
        },
        recommendations: [
          '先处理高危核心偏移、剧情线禁揭、读者回报欠账、读者拉力不足、创新/IP化缺口、卷级阶段漏结算、连载节奏疲劳、新资产膨胀和批次任务书兑现风险，再开启下一批安全连写。',
          '每个修复任务处理后执行质量复检、故事状态同步和批次风险复盘。',
        ],
        tasks,
      },
    })
    await loadProjectModules()
    await loadProductionTasks()
    setTaskCenterOpen(true)
    message.success(`已生成安全连写批次修复任务：${tasks.length} 项`)
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '生成安全连写批次修复任务失败')
  } finally {
    setAutoDirectorActionLoadingKey('')
  }
}

const createScriptRoomRepairQueue = async () => {
  const scriptRoom = autoCreationDirectorModel.rollingScriptRoom
  const tasks = scriptRoom.repairTasks || []
  if (!tasks.length) {
    message.info('当前百章滚动剧本室没有可生成的修复任务。')
    return
  }
  setAutoDirectorActionLoadingKey('create_script_room_repair')
  try {
    await apiClient.post('/novel/runs', {
      project_id: projectId,
      run_type: 'longform_production_repair',
      step_name: `rolling-script-room-repair-${tasks.length}`,
      status: 'ready',
      input_ref: {
        source: 'rolling_script_room',
        focus_range: scriptRoom.focusRangeLabel,
        status: scriptRoom.status,
        layer_count: scriptRoom.layers.length,
      },
      output_ref: {
        report: {
          source: 'rolling_script_room',
          summary: scriptRoom.summary,
          status: scriptRoom.status,
          focus_range: scriptRoom.focusRangeLabel,
          task_count: tasks.length,
          layer_status: scriptRoom.layers.map(layer => ({
            key: layer.key,
            label: layer.label,
            status: layer.status,
            detail: layer.detail,
          })),
        },
        recommendations: [
          '先处理百章剧本室的红/黄层级，再进入正文生成或安全连写。',
          '修复后回到自动创作总控台，确认当前章、未来10章、未来100章、当前卷和全书罗盘重新对齐。',
        ],
        tasks,
      },
    })
    await loadProjectModules()
    await loadProductionTasks()
    setTaskCenterOpen(true)
    message.success(`已生成百章剧本室修复任务：${tasks.length} 项`)
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '生成百章剧本室修复任务失败')
  } finally {
    setAutoDirectorActionLoadingKey('')
  }
}

const createDeliveryRiskRepairQueue = async (payload?: AnyRecord) => {
  setAutoDirectorActionLoadingKey('create_delivery_risk_repair')
  try {
    const res = await apiClient.post(`/novel/projects/${projectId}/review-annotations/repair-queue`, payload || {})
    const tasks = res.data?.tasks || []
    await loadProjectModules()
    await loadProductionTasks()
    setTaskCenterOpen(true)
    const skipped = Number(res.data?.skipped_existing || 0)
    message.success(`已生成交稿风险修复任务：${tasks.length} 项${skipped ? `，跳过已有 ${skipped} 项` : ''}`)
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '生成交稿风险修复任务失败')
  } finally {
    setAutoDirectorActionLoadingKey('')
  }
}

const createLongformProductionRepairQueue = async () => {
  setCommercialToolLoading('longformRepair')
  try {
    const res = await apiClient.post(`/novel/projects/${projectId}/longform-production-trends/repair-queue`)
    await loadProductionTasks()
    setTaskCenterOpen(true)
    message.success(`已生成长线生产修复任务：${(res.data?.tasks || []).length} 项`)
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '生成长线生产修复任务失败')
  } finally {
    setCommercialToolLoading('')
  }
}

const createMechanicalQaRepairQueue = async () => {
  setCommercialToolLoading('mechanicalRepair')
  try {
    const res = await apiClient.post(`/novel/projects/${projectId}/mechanical-qa/repair-queue`)
    await loadProductionTasks()
    setTaskCenterOpen(true)
    message.success(`已生成机械质检修复任务：${(res.data?.tasks || []).length} 项`)
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '生成机械质检修复任务失败')
  } finally {
    setCommercialToolLoading('')
  }
}

  return {
    createFirst30RetentionRepairQueue,
    createReaderTrialRepairQueue,
    createStyleSampleBatchRepairQueue,
    createRecoveryEvidenceGovernanceQueue,
    createSafeBatchRiskRepairQueue,
    createScriptRoomRepairQueue,
    createDeliveryRiskRepairQueue,
    createLongformProductionRepairQueue,
    createMechanicalQaRepairQueue,
  }
}
