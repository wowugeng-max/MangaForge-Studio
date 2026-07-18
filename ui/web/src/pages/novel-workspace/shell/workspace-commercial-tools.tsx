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
import {
  createCommercialRepairQueueHandlers,
} from './workspace-commercial-repair-queues'
import {
  createCommercialDiagnosticsHandlers,
} from './workspace-commercial-diagnostics'

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

  const {
    createFirst30RetentionRepairQueue,
    createReaderTrialRepairQueue,
    createStyleSampleBatchRepairQueue,
    createRecoveryEvidenceGovernanceQueue,
    createSafeBatchRiskRepairQueue,
    createScriptRoomRepairQueue,
    createDeliveryRiskRepairQueue,
    createLongformProductionRepairQueue,
    createMechanicalQaRepairQueue,
  } = createCommercialRepairQueueHandlers({
    apiClient,
    projectId,
    loadProductionTasks,
    loadProjectModules,
    setTaskCenterOpen,
    setCommercialToolLoading,
    runCommercialTool,
    autoCreationDirectorModel,
    setAutoDirectorActionLoadingKey,
  })

  const {
    runTopicValidation,
    runQualityBenchmark,
    runFirst30RetentionDiagnosis,
    runReaderTrialReview,
    runLongformCreationDiagnosis,
    runLongformPressureTest,
    openProductionMetrics,
    openLongformProductionTrends,
    openMaterialRepairPlan,
    openContinuityAudit,
    syncStoryStateForChapter,
    refreshConsistencyAudit,
    openReferenceKnowledgeDiagnosis,
    runMechanicalQa,
    runMechanicalQaLlmReview,
    refreshPropagationDebt,
    runPropagationDebtLlmPlan,
    openModelDiagnostics,
    openGenreTemplates,
    createBackupSnapshot,
  } = createCommercialDiagnosticsHandlers({
    activeChapter,
    activeChapterId,
    apiClient,
    chapterHasProse,
    chapters,
    characters,
    createFirst30RetentionRepairQueue,
    createLongformProductionRepairQueue,
    createMechanicalQaRepairQueue,
    flushPendingSave,
    formatStoryStateSyncFailure,
    loadProductionTasks,
    loadProjectModules,
    openStoryStateEditor,
    outlines,
    projectId,
    reviews,
    runCommercialTool,
    selectChapterForWriting,
    selectTargetChapterForWriting,
    selectedModelId,
    setCommercialToolLoading,
    setContinuityAudit,
    setContinuityAuditLoading,
    setRightPanelOpen,
    setRightPanelTab,
    setSelectedProject,
    sortedChapters,
  })

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
    runRollingPlan,
  }
}
