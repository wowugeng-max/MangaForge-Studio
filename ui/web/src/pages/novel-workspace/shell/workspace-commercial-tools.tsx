import React from 'react'
import {
  Alert, Button, Card, Form, Input, List, message, Modal, Progress, Space, Tag, Typography,
} from 'antd'
import {
  renderCommercialResult,
  renderContinuityAuditContentView,
  renderFirst30RetentionDiagnosisContentView,
  renderFuture100SkeletonContentView,
  renderGenreTemplatesContentView,
  renderLongformCreationDiagnosisContentView,
  renderLongformPressureTestContentView,
  renderLongformProductionTrendsContentView,
  renderMaterialRepairPlanContentView,
  renderMechanicalQaContentView,
  renderMechanicalQaLlmReviewContentView,
  renderModelDiagnosticsContentView,
  renderPropagationDebtContentView,
  renderPropagationDebtLlmPlanContentView,
  renderReaderTrialReviewContentView,
  renderReferenceKnowledgeDiagnosisContentView,
} from './workspace-commercial-result'

const { Text, Paragraph } = Typography
const { TextArea } = Input

type AnyRecord = Record<string, any>

export type CommercialToolHandlerDeps = {
  activeChapter: any
  activeChapterId: any
  apiClient: any
  chapters: any
  characters: any
  commercialToolLoading: any
  flushPendingSave: any
  future100Draft: any
  future100SelectedNos: any
  loadProductionTasks: any
  loadProjectModules: any
  openStoryStateEditor: any
  outlines: any
  projectId: any
  reviews: any
  selectChapterForWriting: any
  selectTargetChapterForWriting: any
  selectedModelId: any
  setAutoDirectorActionLoadingKey: any
  setCommercialToolLoading: any
  setContinuityAudit: any
  setContinuityAuditLoading: any
  setFuture100ApplyLoading: any
  setFuture100Draft: any
  setFuture100FocusOutlineIds: any
  setFuture100SelectedNos: any
  setOutlineTreeOpen: any
  setRightPanelOpen: any
  setRightPanelTab: any
  setSelectedProject: any
  setTaskCenterOpen: any
  sortedChapters: any
  startFuture100ChapterGroupGeneration: any
  agentConfigForm: any
  approvalPolicyForm: any
  formatStoryStateSyncFailure: any
  chapterHasProse: any
  autoCreationDirectorModel: any
}

export function createCommercialToolHandlers(deps: CommercialToolHandlerDeps) {
  const activeChapter = deps.activeChapter
  const activeChapterId = deps.activeChapterId
  const apiClient = deps.apiClient
  const chapters = deps.chapters
  const characters = deps.characters
  const commercialToolLoading = deps.commercialToolLoading
  const flushPendingSave = deps.flushPendingSave
  const future100Draft = deps.future100Draft
  const future100SelectedNos = deps.future100SelectedNos
  const loadProductionTasks = deps.loadProductionTasks
  const loadProjectModules = deps.loadProjectModules
  const openStoryStateEditor = deps.openStoryStateEditor
  const outlines = deps.outlines
  const projectId = deps.projectId
  const reviews = deps.reviews
  const selectChapterForWriting = deps.selectChapterForWriting
  const selectTargetChapterForWriting = deps.selectTargetChapterForWriting
  const selectedModelId = deps.selectedModelId
  const setAutoDirectorActionLoadingKey = deps.setAutoDirectorActionLoadingKey
  const setCommercialToolLoading = deps.setCommercialToolLoading
  const setContinuityAudit = deps.setContinuityAudit
  const setContinuityAuditLoading = deps.setContinuityAuditLoading
  const setFuture100ApplyLoading = deps.setFuture100ApplyLoading
  const setFuture100Draft = deps.setFuture100Draft
  const setFuture100FocusOutlineIds = deps.setFuture100FocusOutlineIds
  const setFuture100SelectedNos = deps.setFuture100SelectedNos
  const setOutlineTreeOpen = deps.setOutlineTreeOpen
  const setRightPanelOpen = deps.setRightPanelOpen
  const setRightPanelTab = deps.setRightPanelTab
  const setSelectedProject = deps.setSelectedProject
  const setTaskCenterOpen = deps.setTaskCenterOpen
  const sortedChapters = deps.sortedChapters
  const startFuture100ChapterGroupGeneration = deps.startFuture100ChapterGroupGeneration
  const agentConfigForm = deps.agentConfigForm
  const approvalPolicyForm = deps.approvalPolicyForm
  const formatStoryStateSyncFailure = deps.formatStoryStateSyncFailure
  const chapterHasProse = deps.chapterHasProse
  const autoCreationDirectorModel = deps.autoCreationDirectorModel

    const showCommercialResult = (title: string, data: any) => {
      Modal.info({
        title,
        width: 900,
        content: renderCommercialResult(title, data),
      })
    }

    const runCommercialTool = async (key: string, label: string, fn: () => Promise<any>) => {
      setCommercialToolLoading(key)
      try {
        const data = await fn()
        showCommercialResult(label, data)
        await loadProjectModules()
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || `${label}失败`)
      } finally {
        setCommercialToolLoading('')
      }
    }

    const openApprovalPolicyEditor = async () => {
      setCommercialToolLoading('approval')
      try {
        const res = await apiClient.get(`/novel/projects/${projectId}/approval-policy`)
        approvalPolicyForm.setFieldsValue({ policy: JSON.stringify(res.data?.policy || {}, null, 2) })
        Modal.confirm({
          title: '审批关卡策略',
          width: 760,
          content: (
            <Form form={approvalPolicyForm} layout="vertical">
              <Form.Item name="policy" label="审批策略 JSON">
                <Input.TextArea rows={14} />
              </Form.Item>
            </Form>
          ),
          okText: '保存',
          onOk: async () => {
            const v = await approvalPolicyForm.validateFields()
            await apiClient.put(`/novel/projects/${projectId}/approval-policy`, { policy: JSON.parse(v.policy || '{}') })
            await loadProjectModules()
            message.success('审批策略已保存')
          },
        })
      } catch (error: any) {
        message.error(error?.message?.includes('JSON') ? '审批策略必须是合法 JSON' : (error?.response?.data?.error || error?.message || '审批策略加载失败'))
      } finally {
        setCommercialToolLoading('')
      }
    }

    const openAgentConfigEditor = async () => {
      setCommercialToolLoading('agentConfig')
      try {
        const res = await apiClient.get(`/novel/projects/${projectId}/agent-config`)
        const config = res.data?.config || {}
        const snapshot = res.data?.snapshot || {}
        const history = Array.isArray(config.history) ? config.history : []
        agentConfigForm.setFieldsValue({ config: JSON.stringify(config, null, 2) })
        Modal.confirm({
          title: 'Agent 提示词配置',
          width: 860,
          content: (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Card size="small" title="当前可复现快照">
                <Space wrap>
                  <Tag color="blue" bordered={false}>提示词 v{snapshot.agent_prompt_version || config.version || 1}</Tag>
                  <Tag bordered={false}>快照 {snapshot.snapshot_id || '-'}</Tag>
                  <Tag bordered={false}>写作圣经 {snapshot.writing_bible_hash || '-'}</Tag>
                  <Tag bordered={false}>提示词键 {Array.isArray(snapshot.prompt_keys) ? snapshot.prompt_keys.length : 0}</Tag>
                </Space>
                <Paragraph style={{ margin: '8px 0 0', fontSize: 12 }} type="secondary">
                  新生成任务会把该快照写入运行记录，用于审计和复现生成环境。
                </Paragraph>
              </Card>
              {history.length > 0 && (
                <Card size="small" title="最近版本">
                  <Space wrap>
                    {history.slice(0, 8).map((item: any) => (
                      <Tag key={`${item.version}-${item.archived_at}`} bordered={false}>
                        v{item.version} · {item.archived_at ? new Date(item.archived_at).toLocaleString() : item.updated_at || ''}
                      </Tag>
                    ))}
                  </Space>
                </Card>
              )}
              <Form form={agentConfigForm} layout="vertical">
                <Form.Item name="config" label="Agent 配置 JSON">
                  <Input.TextArea rows={16} />
                </Form.Item>
              </Form>
            </Space>
          ),
          okText: '保存新版本',
          onOk: async () => {
            const v = await agentConfigForm.validateFields()
            await apiClient.put(`/novel/projects/${projectId}/agent-config`, { config: JSON.parse(v.config || '{}') })
            await loadProjectModules()
            message.success('Agent 配置已保存')
          },
        })
      } catch (error: any) {
        message.error(error?.message?.includes('JSON') ? 'Agent 配置必须是合法 JSON' : (error?.response?.data?.error || error?.message || 'Agent 配置加载失败'))
      } finally {
        setCommercialToolLoading('')
      }
    }

    const runSimilarityForChapter = async (chapterId: number) => {
      await runCommercialTool('similarity', '章节相似度检测', async () => {
        const res = await apiClient.post(`/novel/chapters/${chapterId}/similarity-report`, { project_id: projectId })
        return res.data
      })
    }

    const runSimilarityForActiveChapter = async () => {
      if (!activeChapter) return message.warning('请先选择章节')
      await runSimilarityForChapter(Number(activeChapter.id))
    }

    const runReferenceMigrationPlan = async () => {
      if (!activeChapter) return message.warning('请先选择章节')
      if (!selectedModelId) return message.warning('请先选择模型')
      await runCommercialTool('migrationPlan', '参考迁移计划', async () => {
        const res = await apiClient.post(`/novel/chapters/${activeChapter.id}/reference-migration-plan`, { project_id: projectId, model_id: selectedModelId })
        setRightPanelOpen(true)
        setRightPanelTab('bookReviews')
        return res.data
      })
    }

    const runVersionReviewForActiveChapter = async () => {
      if (!activeChapter) return message.warning('请先选择章节')
      await runCommercialTool('versionReview', '章节版本评审', async () => {
        const res = await apiClient.get(`/novel/chapters/${activeChapter.id}/version-review`, { params: { project_id: projectId } })
        return res.data
      })
    }

    async function runRollingPlan(options?: { intent?: any; fromChapter?: number }) {
      if (!selectedModelId) return message.warning('请先选择模型')
      await runCommercialTool('rollingPlan', '未来 10 章滚动规划', async () => {
        const res = await apiClient.post(`/novel/projects/${projectId}/rolling-plan`, {
          model_id: selectedModelId,
          from_chapter: options?.fromChapter || activeChapter?.chapter_no || undefined,
          horizon: 10,
          rolling_plan_intent: options?.intent,
        })
        setRightPanelOpen(true)
        setRightPanelTab('bookReviews')
        return res.data
      })
    }

    const showFuture100SkeletonModal = (title: string, data: any) => {
      Modal.info({
        title,
        width: 980,
        content: renderFuture100SkeletonContentView(data, {
          groupLoading: commercialToolLoading === 'future100Group',
          onOpenOutlineTree: (outlineIds) => {
            Modal.destroyAll()
            setFuture100FocusOutlineIds(outlineIds)
            setOutlineTreeOpen(true)
          },
          onStartChapterGroup: () => {
            Modal.destroyAll()
            void startFuture100ChapterGroupGeneration()
          },
        }),
      })
    }

    const runFuture100SkeletonAudit = async () => {
      setCommercialToolLoading('future100Audit')
      try {
        const res = await apiClient.get(`/novel/projects/${projectId}/future-100-skeleton`, {
          params: { from_chapter: activeChapter?.chapter_no || undefined, horizon: 100 },
        })
        showFuture100SkeletonModal('未来100章骨架检查', res.data)
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || '未来100章骨架检查失败')
      } finally {
        setCommercialToolLoading('')
      }
    }

    const generateFuture100Skeleton = async () => {
      if (!selectedModelId) return message.warning('请先选择模型')
      Modal.confirm({
        title: 'AI 生成未来100章骨架',
        width: 720,
        content: '系统会先调用当前选择的大纲模型生成未来100章骨架草稿，并展示创建/覆盖差异。确认勾选后才会写入大纲。',
        okText: '生成差异预览',
        onOk: async () => {
          setCommercialToolLoading('future100Generate')
          try {
            const res = await apiClient.post(`/novel/projects/${projectId}/future-100-skeleton/generate`, {
              model_id: selectedModelId,
              from_chapter: activeChapter?.chapter_no || undefined,
              horizon: 100,
              write_outline: false,
              write_mode: 'upsert',
            })
            const rows = res.data?.write_preview?.rows || []
            setFuture100Draft(res.data)
            setFuture100SelectedNos(rows.filter((row: any) => row.action !== 'skipped').map((row: any) => Number(row.chapter_no)).filter(Boolean))
          } catch (error: any) {
            message.error(error?.response?.data?.error || error?.message || 'AI生成未来100章骨架失败')
          } finally {
            setCommercialToolLoading('')
          }
        },
      })
    }

    const applyFuture100SkeletonDraft = async () => {
      if (!future100Draft?.skeleton?.length) return message.warning('没有可写入的骨架草稿')
      if (!future100SelectedNos.length) return message.warning('请至少选择一个章节写入')
      setFuture100ApplyLoading(true)
      try {
        const res = await apiClient.post(`/novel/projects/${projectId}/future-100-skeleton/apply`, {
          skeleton: future100Draft.skeleton,
          from_chapter: future100Draft.audit?.from_chapter,
          horizon: future100Draft.skeleton.length,
          write_mode: 'upsert',
          selected_chapter_nos: future100SelectedNos,
        })
        setFuture100Draft(null)
        setFuture100SelectedNos([])
        await loadProjectModules()
        setFuture100FocusOutlineIds((res.data?.written_outlines || []).map((item: any) => Number(item.id)).filter(Boolean))
        setRightPanelOpen(true)
        setRightPanelTab('bookReviews')
        showFuture100SkeletonModal('已应用未来100章骨架', res.data)
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || '应用未来100章骨架失败')
      } finally {
        setFuture100ApplyLoading(false)
      }
    }

    const runTopicValidation = async () => {
      if (!selectedModelId) return message.warning('请先选择模型')
      await runCommercialTool('topic', '选题验证', async () => {
        const res = await apiClient.post(`/novel/projects/${projectId}/topic-validation`, { model_id: selectedModelId })
        return res.data
      })
    }

    const runQualityBenchmark = async () => {
      await runCommercialTool('benchmark', '项目质量基准', async () => {
        const res = await apiClient.post(`/novel/projects/${projectId}/benchmark`, { model_id: selectedModelId })
        return res.data
      })
    }

    const runFirst30RetentionDiagnosis = async () => {
      setCommercialToolLoading('first30Retention')
      try {
        const res = await apiClient.post(`/novel/projects/${projectId}/first30-retention-diagnosis`)
        const report = res.data?.report || {}
        await loadProjectModules()
        await loadProductionTasks()
        setRightPanelOpen(true)
        setRightPanelTab('bookReviews')
        Modal.info({
          title: '前30章留存诊断',
          width: 960,
          content: renderFirst30RetentionDiagnosisContentView(report, {
            onCreateRepairQueue: () => { void createFirst30RetentionRepairQueue() },
            onOpenChapter: (chapterId) => { Modal.destroyAll(); void selectChapterForWriting(chapterId) },
          }),
        })
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || '前30章留存诊断失败')
      } finally {
        setCommercialToolLoading('')
      }
    }

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

    const runReaderTrialReview = async () => {
      setCommercialToolLoading('readerTrial')
      try {
        const res = await apiClient.post(`/novel/projects/${projectId}/reader-trial-review`)
        const report = res.data?.report || {}
        await loadProjectModules()
        await loadProductionTasks()
        setRightPanelOpen(true)
        setRightPanelTab('bookReviews')
        Modal.info({
          title: '读者试读复盘',
          width: 920,
          content: renderReaderTrialReviewContentView(report),
        })
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || '读者试读复盘失败')
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

    const runLongformCreationDiagnosis = async () => {
      setCommercialToolLoading('longformCreationDiagnosis')
      try {
        const res = await apiClient.post(`/novel/projects/${projectId}/longform-creation-diagnosis`)
        const report = res.data?.report || {}
        await loadProjectModules()
        await loadProductionTasks()
        setRightPanelOpen(true)
        setRightPanelTab('bookReviews')
        Modal.info({
          title: '长篇创作诊断',
          width: 920,
          content: renderLongformCreationDiagnosisContentView(report),
        })
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || '长篇创作诊断失败')
      } finally {
        setCommercialToolLoading('')
      }
    }

    const runLongformPressureTest = async () => {
      setCommercialToolLoading('longformPressure')
      try {
        const res = await apiClient.post(`/novel/projects/${projectId}/longform-pressure-test`)
        const report = res.data?.report || {}
        await loadProjectModules()
        await loadProductionTasks()
        setRightPanelOpen(true)
        setRightPanelTab('bookReviews')
        Modal.info({
          title: '300万字长线压力测试',
          width: 960,
          content: renderLongformPressureTestContentView(report),
        })
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || '300万字长线压力测试失败')
      } finally {
        setCommercialToolLoading('')
      }
    }

    const openProductionMetrics = async () => {
      await runCommercialTool('metrics', '生成成本与质量仪表盘', async () => {
        const res = await apiClient.get(`/novel/projects/${projectId}/production-metrics`)
        return res.data
      })
    }

    const openLongformProductionTrends = async () => {
      setCommercialToolLoading('longformTrends')
      try {
        const res = await apiClient.get(`/novel/projects/${projectId}/longform-production-trends`)
        const trends = res.data?.trends || {}
        const summary = trends.summary || {}
        const weakRows = Array.isArray(trends.weak_rows) ? trends.weak_rows : []
        const recommendations = Array.isArray(trends.recommendations) ? trends.recommendations : []
        const failureReasons = Array.isArray(trends.failure_reasons) ? trends.failure_reasons : []
        Modal.info({
          title: '长线生产趋势报表',
          width: 980,
          content: renderLongformProductionTrendsContentView({
            summary,
            weakRows,
            recommendations,
            failureReasons,
            repairLoading: commercialToolLoading === 'longformRepair',
          }, {
            onCreateRepairQueue: () => { void createLongformProductionRepairQueue() },
            onOpenChapter: (chapterId) => { Modal.destroyAll(); void selectChapterForWriting(chapterId) },
          }),
        })
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || '长线生产趋势报表加载失败')
      } finally {
        setCommercialToolLoading('')
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

    const openMaterialRepairPlan = async () => {
      setCommercialToolLoading('materialRepair')
      try {
        const res = await apiClient.get(`/novel/projects/${projectId}/material-repair-plan`, {
          params: { start_chapter: activeChapter?.chapter_no || 1, limit: 120, unwritten_only: 1 },
        })
        const data = res.data || {}
        Modal.info({
          title: '材料补齐计划',
          width: 900,
          content: renderMaterialRepairPlanContentView(data, {
            onOpenChapter: (chapterId) => { Modal.destroyAll(); void selectChapterForWriting(chapterId) },
          }),
        })
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || '材料补齐计划加载失败')
      } finally {
        setCommercialToolLoading('')
      }
    }

    const openContinuityAudit = async () => {
      setCommercialToolLoading('continuityAudit')
      try {
        const res = await apiClient.get(`/novel/projects/${projectId}/continuity-audit`)
        const audit = res.data?.audit || {}
        setContinuityAudit(audit)
        Modal.info({
          title: '全书连续性检查',
          width: 920,
          content: renderContinuityAuditContentView(audit, {
            onOpenChapterNo: (chapterNo) => {
              const chapter = chapters.find(ch => Number(ch.chapter_no) === Number(chapterNo))
              if (chapter) {
                Modal.destroyAll()
                void selectChapterForWriting(chapter.id)
              }
            },
          }),
        })
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || '全书连续性检查失败')
      } finally {
        setCommercialToolLoading('')
      }
    }


    const syncStoryStateForChapter = async (chapterId?: number) => {
      const targetId = Number(chapterId || 0)
      const targetChapter = targetId
        ? sortedChapters.find(chapter => Number(chapter.id) === targetId)
        : activeChapter
      if (!targetChapter?.id) {
        openStoryStateEditor()
        return message.warning('当前没有可同步的目标章节，已打开人工故事状态校正。')
      }
      if (!selectedModelId) return message.warning('请先选择模型，再同步故事状态。')
      if (!chapterHasProse(targetChapter)) {
        openStoryStateEditor()
        return message.warning('当前章节还没有正文，已打开人工故事状态校正。')
      }
      if (!await selectTargetChapterForWriting({
        targetChapterId: Number(targetChapter.id),
        activeChapterId: activeChapter?.id,
        selectChapterForWriting,
      })) {
        return message.warning('切换到目标章节失败，未能开始状态机同步。')
      }
      if (!await flushPendingSave()) {
        return message.warning('保存当前章节失败，未能开始状态机同步。')
      }

      const messageKey = 'story-state-sync'
      setCommercialToolLoading('storyStateSync')
      message.loading({ content: `正在同步第 ${targetChapter.chapter_no} 章故事状态机...`, key: messageKey, duration: 0 })
      try {
        const res = await apiClient.post(`/novel/chapters/${targetChapter.id}/story-state-sync`, {
          project_id: projectId,
          model_id: selectedModelId,
          source: 'writing_cockpit_state_sync',
        })
        await loadProjectModules()
        await loadProductionTasks()
        const update = res.data?.story_state_update || {}
        if (update?.ok === false || update?.error) {
          message.error({
            content: formatStoryStateSyncFailure(update),
            key: messageKey,
            duration: 6,
          })
          return
        }
        const softCount = (Array.isArray(update?.synced) ? update.synced : [])
          .reduce((sum: number, item: any) => sum + (Array.isArray(item?.soft_hard_failures) ? item.soft_hard_failures.length : 0), 0)
        const syncedTo = update?.last_synced_chapter || update?.last_updated_chapter || targetChapter.chapter_no
        const base = syncedTo ? `故事状态已同步至第 ${syncedTo} 章。` : '故事状态已同步。'
        message.success({
          content: softCount > 0 ? `${base} 另有 ${softCount} 项计划状态仍有缺口，已写入警告。` : base,
          key: messageKey,
          duration: 4,
        })
      } catch (error: any) {
        message.error({
          content: error?.response?.data?.error || error?.message || '故事状态同步失败',
          key: messageKey,
          duration: 5,
        })
      } finally {
        setCommercialToolLoading('')
      }
    }

    const refreshConsistencyAudit = async () => {
      setContinuityAuditLoading(true)
      try {
        const res = await apiClient.get(`/novel/projects/${projectId}/continuity-audit`)
        setContinuityAudit(res.data?.audit || {})
        message.success('连续性审计已刷新')
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || '连续性审计刷新失败')
      } finally {
        setContinuityAuditLoading(false)
      }
    }

    const openReferenceKnowledgeDiagnosis = async () => {
      setCommercialToolLoading('referenceDiagnosis')
      try {
        const [coverageRes, fusionRes, assetsRes] = await Promise.all([
          apiClient.get(`/novel/projects/${projectId}/reference-coverage`).catch(() => ({ data: null })),
          apiClient.get(`/novel/projects/${projectId}/reference-fusion`).catch(() => ({ data: null })),
          apiClient.get(`/novel/projects/${projectId}/writing-assets`).catch(() => ({ data: null })),
        ])
        const coverage = coverageRes.data?.coverage || {}
        const fusion = fusionRes.data?.fusion || {}
        const references = fusionRes.data?.references || []
        const assets = assetsRes.data?.assets || []
        Modal.info({
          title: '参考作品知识诊断',
          width: 940,
          content: renderReferenceKnowledgeDiagnosisContentView({
            coverage,
            fusion,
            references,
            assets,
          }),
        })
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || '参考知识诊断失败')
      } finally {
        setCommercialToolLoading('')
      }
    }

    const runMechanicalQa = async () => {
      setCommercialToolLoading('mechanicalQa')
      try {
        const res = await apiClient.post(`/novel/projects/${projectId}/mechanical-qa/run`)
        const report = res.data?.report || {}
        await loadProjectModules()
        await loadProductionTasks()
        Modal.info({
          title: '机械质检规则引擎',
          width: 920,
          content: renderMechanicalQaContentView(report, {
            onOpenChapter: (chapterId) => { Modal.destroyAll(); void selectChapterForWriting(chapterId) },
            onOpenChapterNo: (chapterNo) => {
              const chapter = chapters.find(ch => Number(ch.chapter_no) === Number(chapterNo))
              if (chapter) {
                Modal.destroyAll()
                void selectChapterForWriting(chapter.id)
              }
            },
            onCreateRepairQueue: () => { void createMechanicalQaRepairQueue() },
          }),
        })
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || '机械质检失败')
      } finally {
        setCommercialToolLoading('')
      }
    }

    const runMechanicalQaLlmReview = async () => {
      if (!selectedModelId) return message.warning('请先选择模型')
      setCommercialToolLoading('mechanicalQaLlm')
      try {
        const res = await apiClient.post(`/novel/projects/${projectId}/mechanical-qa/llm-review`, {
          model_id: selectedModelId,
        })
        const aiReport = res.data?.ai_report || {}
        const localReport = res.data?.report || {}
        await loadProjectModules()
        await loadProductionTasks()
        Modal.info({
          title: 'AI 复核机械质检',
          width: 960,
          content: renderMechanicalQaLlmReviewContentView(aiReport, localReport),
        })
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || 'AI复核机械质检失败')
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

    const refreshPropagationDebt = async () => {
      setCommercialToolLoading('propagationDebt')
      try {
        const res = await apiClient.post(`/novel/projects/${projectId}/propagation-debt/refresh`)
        const report = res.data?.report || {}
        setSelectedProject((prev: any) => res.data?.project || prev)
        await loadProjectModules()
        await loadProductionTasks()
        Modal.info({
          title: '传播债务队列',
          width: 920,
          content: renderPropagationDebtContentView(report, {
            onOpenChapterId: (chapterId) => { Modal.destroyAll(); void selectChapterForWriting(chapterId) },
            onOpenChapterNo: (chapterNo) => {
              const chapter = chapters.find(ch => Number(ch.chapter_no) === Number(chapterNo))
              if (chapter) { Modal.destroyAll(); void selectChapterForWriting(chapter.id) }
            },
            onResolveDebt: async (debtId) => {
              try {
                await apiClient.post(`/novel/projects/${projectId}/propagation-debt/${encodeURIComponent(debtId)}/resolve`, { note: '用户在传播债务队列标记解决' })
                message.success('已标记解决')
                Modal.destroyAll()
                await refreshPropagationDebt()
              } catch (error: any) {
                message.error(error?.response?.data?.error || error?.message || '标记解决失败')
              }
            },
          }),
        })
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || '传播债务刷新失败')
      } finally {
        setCommercialToolLoading('')
      }
    }

    const runPropagationDebtLlmPlan = async () => {
      if (!selectedModelId) return message.warning('请先选择模型')
      setCommercialToolLoading('propagationDebtLlm')
      try {
        const res = await apiClient.post(`/novel/projects/${projectId}/propagation-debt/llm-plan`, {
          model_id: selectedModelId,
        })
        const aiPlan = res.data?.ai_plan || {}
        const report = res.data?.report || {}
        setSelectedProject((prev: any) => res.data?.project || prev)
        await loadProjectModules()
        await loadProductionTasks()
        Modal.info({
          title: 'AI 传播债务修复方案',
          width: 960,
          content: renderPropagationDebtLlmPlanContentView(aiPlan, report),
        })
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || 'AI传播债务方案生成失败')
      } finally {
        setCommercialToolLoading('')
      }
    }

    const openModelDiagnostics = async () => {
      setCommercialToolLoading('modelDiagnostics')
      try {
        const res = await apiClient.get(`/novel/projects/${projectId}/model-diagnostics`)
        const report = res.data?.report || {}
        Modal.info({
          title: '模型服务诊断（配置与历史记录）',
          width: 960,
          content: renderModelDiagnosticsContentView(report),
        })
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || '模型诊断失败')
      } finally {
        setCommercialToolLoading('')
      }
    }

    const openGenreTemplates = async () => {
      setCommercialToolLoading('genreTemplates')
      try {
        const res = await apiClient.get('/novel/genre-templates')
        const templates = res.data?.templates || []
        Modal.info({
          title: '类型模板方法库',
          width: 900,
          content: renderGenreTemplatesContentView(templates, {
            onApplyTemplate: async (item) => {
              try {
                const applyRes = await apiClient.post(`/novel/projects/${projectId}/genre-templates/${item.id}/apply`)
                setSelectedProject((prev: any) => applyRes.data?.project || prev)
                await loadProjectModules()
                message.success(`已应用模板：${item.name}`)
              } catch (error: any) {
                message.error(error?.response?.data?.error || error?.message || '模板应用失败')
              }
            },
          }),
        })
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || '类型模板加载失败')
      } finally {
        setCommercialToolLoading('')
      }
    }

    const createBackupSnapshot = async () => {
      setCommercialToolLoading('backup')
      try {
        const res = await apiClient.post(`/novel/projects/${projectId}/backup-snapshot`)
        const manifest = res.data?.manifest || {}
        await loadProjectModules()
        await loadProductionTasks()
        Modal.success({
          title: '项目备份快照已创建',
          content: (
            <Space direction="vertical" size={8}>
              <Text>快照：{manifest.snapshot_id}</Text>
              <Text type="secondary">指纹：{manifest.text_hash}</Text>
              <Space wrap>
                <Tag bordered={false}>章节 {manifest.counts?.chapters || 0}</Tag>
                <Tag bordered={false}>大纲 {manifest.counts?.outlines || 0}</Tag>
                <Tag bordered={false}>角色 {manifest.counts?.characters || 0}</Tag>
                <Tag bordered={false}>审稿 {manifest.counts?.reviews || 0}</Tag>
              </Space>
            </Space>
          ),
        })
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || '创建备份快照失败')
      } finally {
        setCommercialToolLoading('')
      }
    }

  return {
    showCommercialResult,
    runCommercialTool,
    openApprovalPolicyEditor,
    openAgentConfigEditor,
    runSimilarityForChapter,
    runSimilarityForActiveChapter,
    runReferenceMigrationPlan,
    runVersionReviewForActiveChapter,
    showFuture100SkeletonModal,
    runFuture100SkeletonAudit,
    generateFuture100Skeleton,
    applyFuture100SkeletonDraft,
    runTopicValidation,
    runQualityBenchmark,
    runFirst30RetentionDiagnosis,
    createFirst30RetentionRepairQueue,
    runReaderTrialReview,
    createReaderTrialRepairQueue,
    createStyleSampleBatchRepairQueue,
    createRecoveryEvidenceGovernanceQueue,
    createSafeBatchRiskRepairQueue,
    createScriptRoomRepairQueue,
    createDeliveryRiskRepairQueue,
    runLongformCreationDiagnosis,
    runLongformPressureTest,
    openProductionMetrics,
    openLongformProductionTrends,
    createLongformProductionRepairQueue,
    openMaterialRepairPlan,
    openContinuityAudit,
    syncStoryStateForChapter,
    refreshConsistencyAudit,
    openReferenceKnowledgeDiagnosis,
    runMechanicalQa,
    runMechanicalQaLlmReview,
    createMechanicalQaRepairQueue,
    refreshPropagationDebt,
    runPropagationDebtLlmPlan,
    openModelDiagnostics,
    openGenreTemplates,
    createBackupSnapshot,
  }
}
