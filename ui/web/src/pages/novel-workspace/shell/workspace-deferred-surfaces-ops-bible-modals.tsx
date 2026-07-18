import React from 'react'
import {
  Alert, Button, Card, Checkbox, Form, Input, InputNumber, List, Modal, Select, Space, Tag, Tooltip, Typography, message,
} from 'antd'
import apiClient from '../../api/client'
import { ChapterManagementDrawer } from '../ChapterManagementDrawer'
import { ChapterRestructurePanel } from '../ChapterRestructurePanel'
import { OutlineControlPanel } from '../OutlineControlPanel'
import { OutlineTreeModal } from '../OutlineTreeModal'
import { VersionDetailModal } from '../VersionDetailModal'
import {
  AgentAuditDrawer,
  AgentExecutionModal,
  ConsistencyGraphModal,
  CreativeCardsModal,
  EditorModal,
  ExportDeliveryModal,
  QualityBenchmarkModal,
  ReferenceConfigModal,
  ReferenceEngineeringModal,
  ReviewAnnotationsDrawer,
  TaskCenterDrawer,
} from './workspace-lazy'
import { DeferredWorkspaceSurfaces } from './workspace-helpers'
import type { NovelWorkspaceDeferredSurfacesProps } from './workspace-deferred-surfaces-types'
export type { NovelWorkspaceDeferredSurfacesProps } from './workspace-deferred-surfaces-types'


const { Text } = Typography

export function NovelWorkspaceDeferredOpsBibleModals(props: NovelWorkspaceDeferredSurfacesProps) {
  const {
    acceptChapterVersion,
    activeChapter,
    activeChapterId,
    activeTasks,
    agentAuditOpen,
    agentExecution,
    applyEditorRevision,
    applyFuture100SkeletonDraft,
    approveChapterGroupStage,
    backupImportOpen,
    backupImportText,
    bulkUpdateRepairTaskStatus,
    cancelKnowledgeIngestJob,
    chapterDrawerOpen,
    chapterGroupExecutingId,
    chapterSearch,
    chapterSortMode,
    chapterStatusFilter,
    chapterTreeData,
    chapterVersionDetail,
    chapters,
    characters,
    commercialToolsOpen,
    consistencyGraphOpen,
    continuityAudit,
    continuityAuditLoading,
    createBackupSnapshot,
    createFirst30RetentionRepairQueue,
    createLongformProductionRepairQueue,
    createMechanicalQaRepairQueue,
    createRecoveryEvidenceGovernanceQueue,
    creativeCardsOpen,
    creativeCommandOpen,
    creativeCommandText,
    deleteChapter,
    downloadBackupPackage,
    editorForm,
    editorKind,
    executeChapterGroupRun,
    executeReleaseRepairRun,
    executeTypedRepairTask,
    exportDeliveryOpen,
    extractStyleSampleCandidates,
    fillDefaultStyleSampleBank,
    filteredChapters,
    flushPendingSave,
    future100ApplyLoading,
    future100FocusOutlineIds,
    generateCurrentChapterProse,
    generateFuture100Skeleton,
    generateLongformRepairAuditSummary,
    generateWritingBibleEditor,
    generatingProse,
    handleOutlineGenerate,
    handleRestructure,
    importBackupPackage,
    knowledgeIngestJobs,
    knowledgeJobsLoading,
    loadKnowledgeIngestJobs,
    loadProductionTasks,
    loadProjectModules,
    locateRepairTaskChapter,
    mergeChapterVersion,
    openAgentConfigEditor,
    openApprovalPolicyEditor,
    openChapterQualityCard,
    openContinuityAudit,
    openEditor,
    openGenreTemplates,
    openLongformProductionTrends,
    openMaterialRepairPlan,
    openModelDiagnostics,
    openProductionDesk,
    openProductionMetrics,
    openReferenceKnowledgeDiagnosis,
    openRepairTaskChapterEditor,
    openRunQueue,
    openStoryStateEditor,
    openWritingBibleEditor,
    outlinePanelOpen,
    outlineTreeOpen,
    outlines,
    pauseKnowledgeIngestJob,
    previewStyleSampleAdjustmentBatch,
    previewStyleSampleAdjustmentPatch,
    productionMode,
    productionModeOptions,
    productionTasks,
    projectId,
    proseChapters,
    qualityBenchmarkOpen,
    recheckRepairTaskConvergence,
    recheckStyleSampleTaskBookReviewTasks,
    recoverRunQueue,
    referenceConfigOpen,
    referenceEngineeringOpen,
    referenceReports,
    refreshConsistencyAudit,
    refreshPropagationDebt,
    releaseRepairExecutingId,
    restructurePanelOpen,
    resumeKnowledgeIngestJob,
    retryChapterGroupStage,
    reviewAnnotationsOpen,
    reviewStyleSampleAdjustmentPatch,
    reviews,
    rollingBackVersionId,
    runCreativeCommand,
    runFirst30RetentionDiagnosis,
    runFuture100SkeletonAudit,
    runLongformCreationDiagnosis,
    runLongformPressureTest,
    runMechanicalQa,
    runMechanicalQaLlmReview,
    runPropagationDebtLlmPlan,
    runQualityBenchmark,
    runRecords,
    runReferenceMigrationPlan,
    runRollingPlan,
    runSimilarityForActiveChapter,
    runTopicValidation,
    runVersionReviewForActiveChapter,
    saveStoryStateEditor,
    saveWritingBibleEditor,
    selectChapterForWriting,
    selectMode,
    selectedChapterIds,
    selectedChaptersList,
    selectedModelId,
    selectedProject,
    setAgentAuditOpen,
    setAgentExecution,
    setBackupImportOpen,
    setBackupImportText,
    setChapterDrawerOpen,
    setChapterSearch,
    setChapterSortMode,
    setChapterStatusFilter,
    setChapterVersionDetail,
    setCommercialToolsOpen,
    setConsistencyGraphOpen,
    setCreativeCardsOpen,
    setCreativeCommandOpen,
    setCreativeCommandText,
    setEditorItem,
    setEditorKind,
    setExportDeliveryOpen,
    setFuture100Draft,
    setFuture100FocusOutlineIds,
    setFuture100SelectedNos,
    setOutlinePanelOpen,
    setOutlineTreeOpen,
    setProductionMode,
    setQualityBenchmarkOpen,
    setReferenceConfigOpen,
    setReferenceEngineeringOpen,
    setRestructurePanelOpen,
    setReviewAnnotationsOpen,
    setRightPanelOpen,
    setRightPanelTab,
    setSelectMode,
    setSelectedChapterIds,
    setSelectedProject,
    setShowOnlyDiff,
    setStoryStateOpen,
    setTaskCenterOpen,
    setTaskCenterRecoveryFocus,
    setUnattendedTargetChapter,
    setWritingBibleOpen,
    showOnlyDiff,
    skipChapterGroupStage,
    sortedChapters,
    startFuture100ChapterGroupGeneration,
    startReadyChapterGroupGeneration,
    startRepairTaskRevision,
    startRunQueueWorker,
    startUnattendedWritingGoal,
    stopRunQueueWorker,
    storyStateForm,
    storyStateOpen,
    styleSampleCandidateLoading,
    submitEditor,
    taskCenterOpen,
    taskCenterRecoveryFocus,
    unattendedTargetChapter,
    undoStyleSampleAdjustmentPatch,
    updateRepairTaskStatus,
    worldbuilding,
    writingBibleForm,
    writingBibleGenerating,
    writingBibleOpen,
  } = props




  return (
    <>
      <Modal
        open={writingBibleOpen}
        title="写作圣经"
        width={860}
        onCancel={() => setWritingBibleOpen(false)}
        footer={[
          <Button key="generate" onClick={generateWritingBibleEditor} loading={writingBibleGenerating}>
            自动生成
          </Button>,
          <Button key="cancel" onClick={() => setWritingBibleOpen(false)}>
            取消
          </Button>,
          <Button key="save" type="primary" onClick={saveWritingBibleEditor}>
            保存
          </Button>,
        ]}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="可以从项目简介、世界观、角色、大纲、章节和参考配置自动生成写作圣经；风格锁定会先按当前商业网文阅读习惯填入默认值，生成后仍可人工微调。"
        />
        <Form form={writingBibleForm} layout="vertical">
          <Card size="small" title="创建契约" style={{ marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <Form.Item name="reader_promise" label="读者承诺" style={{ marginBottom: 0 }}>
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="protagonist_drive" label="主角驱动力" style={{ marginBottom: 0 }}>
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="core_conflict" label="核心矛盾" style={{ marginBottom: 0 }}>
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="current_volume_goal" label="当前卷目标" style={{ marginBottom: 0 }}>
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="innovation_hook" label="创新钩子" style={{ marginBottom: 0 }}>
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="first30_plan" label="前30章策略" style={{ marginBottom: 0 }}>
                <Input.TextArea rows={2} />
              </Form.Item>
            </div>
            <Form.Item name="longform_capacity" label="长篇容量" style={{ marginTop: 12, marginBottom: 0 }}>
              <Input.TextArea rows={2} />
            </Form.Item>
          </Card>
          <Form.Item name="promise" label="读者承诺 / 核心卖点">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Card size="small" title="风格锁定" style={{ marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <Form.Item name="narrative_person" label="叙事人称" style={{ marginBottom: 0 }}><Input /></Form.Item>
              <Form.Item name="sentence_length" label="句长倾向" style={{ marginBottom: 0 }}><Input /></Form.Item>
              <Form.Item name="dialogue_ratio" label="对话比例" style={{ marginBottom: 0 }}><Input /></Form.Item>
              <Form.Item name="payoff_density" label="爽点密度" style={{ marginBottom: 0 }}><Input /></Form.Item>
              <Form.Item name="description_density" label="描写浓度" style={{ marginBottom: 0 }}><Input /></Form.Item>
              <Form.Item name="chapter_word_range" label="章节字数范围" style={{ marginBottom: 0 }}><Input /></Form.Item>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 12 }}>
              <Form.Item name="banned_words" label="禁用词/句式" style={{ marginBottom: 0 }}><Input.TextArea rows={3} /></Form.Item>
              <Form.Item name="preferred_words" label="常用词/风格词" style={{ marginBottom: 0 }}><Input.TextArea rows={3} /></Form.Item>
            </div>
          </Card>
          <Form.Item name="world_rules" label="世界规则 JSON">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="mainline" label="主线 JSON">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="volume_plan" label="分卷计划 JSON">
            <Input.TextArea rows={5} />
          </Form.Item>
          <Form.Item name="style_lock" label="风格锁定 JSON">
            <Input.TextArea rows={5} />
          </Form.Item>
          <Form.Item name="safety_policy" label="仿写安全策略 JSON">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="forbidden" label="禁止项 JSON">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="meme_bank" label="网感素材池 JSON">
            <Input.TextArea
              rows={5}
              placeholder='[{"meme_key":"社畜共鸣","function":"高压后的半拍吐槽","tone":"轻度","suitable_genres":["规则怪谈"],"abstract_usage":"只转化为角色口吻，不直接复刻原句"}]'
            />
          </Form.Item>
          <Card
            size="small"
            title="风格样章库"
            style={{ marginBottom: 12 }}
            extra={(
              <Space size={8} wrap>
                <Button size="small" onClick={fillDefaultStyleSampleBank}>填入默认风格样本库</Button>
                <Button size="small" loading={styleSampleCandidateLoading} onClick={extractStyleSampleCandidates}>从高分章节提炼样本候选</Button>
              </Space>
            )}
          >
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 8 }}
              message="只学习抽象策略，不复制样章原句"
              description="样本库只描述场景功能、适用/不适用场景、叙述节奏、句式密度、对白比例和角色口吻；unsafe_direct_phrases 会作为禁抄短语进入生成和复盘。"
            />
            <div style={{ marginBottom: 10, padding: '8px 10px', background: '#f7f9fc', border: '1px solid #e5eaf3', borderRadius: 6 }}>
              <Space size={6} wrap style={{ marginBottom: styleSampleEffectivenessItems.length ? 6 : 0 }}>
                <Text strong style={{ fontSize: 13 }}>样章效果回收</Text>
                {styleSampleEffectivenessLoading ? (
                  <Tag bordered={false}>加载中</Tag>
                ) : styleSampleEffectiveness ? (
                  <>
                    <Tag bordered={false}>已用 {styleSampleEffectiveness.used_sample_count || 0}/{styleSampleEffectiveness.total_samples || 0}</Tag>
                    <Tag color={styleSampleEffectiveness.risky_sample_count > 0 ? 'orange' : 'green'} bordered={false}>需复盘 {styleSampleEffectiveness.risky_sample_count || 0}</Tag>
                    {styleSampleEffectiveness.risky_sample_count > 0 && (
                      <Button
                        size="small"
                        type="link"
                        loading={styleSamplePatchLoadingKey === 'batch'}
                        onClick={() => { void previewStyleSampleAdjustmentBatch() }}
                      >
                        批量预览补丁
                      </Button>
                    )}
                    <Button
                      size="small"
                      type="link"
                      loading={styleSamplePatchLoadingKey === 'undo'}
                      onClick={() => { void undoStyleSampleAdjustmentPatch() }}
                    >
                      撤销上次补丁
                    </Button>
                    <Button
                      size="small"
                      type="link"
                      loading={styleSamplePatchLoadingKey === 'review'}
                      onClick={() => { void reviewStyleSampleAdjustmentPatch() }}
                    >
                      应用后复检
                    </Button>
                  </>
                ) : (
                  <Tag bordered={false}>暂无回收数据</Tag>
                )}
              </Space>
              {styleSampleEffectivenessItems.length > 0 && (
                <Space size={6} wrap>
                  {styleSampleEffectivenessItems.map((item: any) => {
                    const riskLabel = item.risk_label || '表现稳定'
                    const adjustment = item.adjustment_suggestion || {}
                    const adjustmentLabel = adjustment.label || (riskLabel === '需复盘' ? '补禁抄短语' : '保留策略')
                    const adjustmentText = `调整建议：${adjustmentLabel}${adjustment.detail ? `｜${adjustment.detail}` : ''}`
                    const chapterTitle = Array.isArray(item.chapter_refs) && item.chapter_refs.length
                      ? `关联章节：${item.chapter_refs.map((ref: any) => `第${ref.chapter_no || '?'}章`).join('、')}`
                      : '还没有关联章节'
                    const title = `${chapterTitle}；${adjustmentText}`
                    return (
                      <Space key={item.sample_key} size={4} wrap={false}>
                        <Tooltip title={title}>
                          <Tag color={riskLabel === '需复盘' ? 'orange' : riskLabel === '表现稳定' ? 'green' : 'default'} bordered={false}>
                            {item.sample_key} · 使用 {item.usage_count || 0} · 命中率 {item.hit_rate || 0}% · 风格 {item.average_style_score || '-'} · {riskLabel}
                            {riskLabel === '需复盘' ? ` · 调整建议 ${adjustmentLabel}` : ''}
                          </Tag>
                        </Tooltip>
                        {riskLabel === '需复盘' && (
                          <Button
                            size="small"
                            type="link"
                            loading={styleSamplePatchLoadingKey === item.sample_key}
                            onClick={() => { void previewStyleSampleAdjustmentPatch(item) }}
                          >
                            预览补丁
                          </Button>
                        )}
                      </Space>
                    )
                  })}
                </Space>
              )}
            </div>
            <Form.Item name="style_sample_bank" label="风格样章库 JSON" style={{ marginBottom: 0 }}>
              <Input.TextArea
                rows={5}
                placeholder='[{"sample_key":"规则危机反打","scene_function":"规则压力下的动作反制","applicable_scenes":["高压反打","规则压迫"],"avoid_scenes":["纯背景说明","低压日常过场"],"narrative_rhythm":"先压迫，再拆规则，再小反打","sentence_pattern":"短中句为主，解释压短","dialogue_ratio":"35%-45%","abstract_usage":"只学习节奏、句式密度、对白比例和情绪转折","unsafe_direct_phrases":["原句不能照搬"]}]'
              />
            </Form.Item>
          </Card>
          <Form.Item name="chapter_benchmark_sample_bank" label="章节质量基准样例库 JSON">
            <Input.TextArea
              rows={5}
              placeholder='[{"sample_key":"规则怪谈第一夜","genre":"规则怪谈","opening_hook":"开篇300字出现死亡规则和反常边界","conflict_pattern":"主角冲动试探规则，智者低成本验证边界","payoff_pattern":"规则反制蛮力，同时给出可学习生路","ending_hook_pattern":"章末出现救或不救的选择","scene_budget_pattern":"边界验证/队友分歧/外部威胁敲门","do_not_copy":["不得复制样例桥段、角色名、设定和原句"]}]'
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={storyStateOpen}
        title="故事状态机校正"
        width={860}
        onCancel={() => setStoryStateOpen(false)}
        onOk={saveStoryStateEditor}
        okText="保存校正"
      >
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message="这里用于人工修正角色位置、关系、秘密、道具、伏笔、主线进度和时间线。保存后后续生成会优先读取这个状态。" />
        <Form form={storyStateForm} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <Form.Item name="character_positions" label="角色位置 JSON"><Input.TextArea rows={4} /></Form.Item>
            <Form.Item name="character_relationships" label="角色关系 JSON"><Input.TextArea rows={4} /></Form.Item>
            <Form.Item name="known_secrets" label="已知秘密 JSON"><Input.TextArea rows={4} /></Form.Item>
            <Form.Item name="item_ownership" label="道具归属 JSON"><Input.TextArea rows={4} /></Form.Item>
            <Form.Item name="foreshadowing_status" label="伏笔状态 JSON"><Input.TextArea rows={4} /></Form.Item>
            <Form.Item name="timeline" label="时间线 JSON"><Input.TextArea rows={4} /></Form.Item>
          </div>
          <Form.Item name="mainline_progress" label="主线进度">
            <Input />
          </Form.Item>
          <Form.Item name="story_state" label="故事状态 JSON" rules={[{ required: true, message: '请输入故事状态 JSON' }]}>
            <Input.TextArea rows={8} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!future100Draft}
        title="确认未来100章骨架写入"
        width={980}
        onCancel={() => {
          setFuture100Draft(null)
          setFuture100SelectedNos([])
        }}
        confirmLoading={future100ApplyLoading}
        okText={`写入选中 ${future100SelectedNos.length} 章`}
        cancelText="暂不写入"
        onOk={applyFuture100SkeletonDraft}
      >
        {future100Draft && (() => {
          const rows = future100Draft.write_preview?.rows || []
          const selectableNos = rows.filter((row: any) => row.action !== 'skipped').map((row: any) => Number(row.chapter_no)).filter(Boolean)
          const selectedSet = new Set(future100SelectedNos)
          const allChecked = selectableNos.length > 0 && selectableNos.every((chapterNo: number) => selectedSet.has(chapterNo))
          const partialChecked = selectableNos.some((chapterNo: number) => selectedSet.has(chapterNo)) && !allChecked
          return (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Alert
                type="info"
                showIcon
                message="生成结果尚未写入。请确认要创建或覆盖的章节骨架。"
                description={`创建 ${future100Draft.write_preview?.created || 0}，覆盖 ${future100Draft.write_preview?.updated || 0}，跳过 ${future100Draft.write_preview?.skipped || 0}`}
              />
              <Space wrap>
                <Checkbox
                  checked={allChecked}
                  indeterminate={partialChecked}
                  onChange={(event) => setFuture100SelectedNos(event.target.checked ? selectableNos : [])}
                >
                  全选可写入章节
                </Checkbox>
                <Tag color="blue" bordered={false}>已选 {future100SelectedNos.length}</Tag>
                <Tag color="green" bordered={false}>新建 {rows.filter((row: any) => row.action === 'create' && selectedSet.has(Number(row.chapter_no))).length}</Tag>
                <Tag color="gold" bordered={false}>覆盖 {rows.filter((row: any) => row.action === 'update' && selectedSet.has(Number(row.chapter_no))).length}</Tag>
              </Space>
              <Card size="small" title="差异列表">
                <List
                  size="small"
                  dataSource={rows.slice(0, 120)}
                  renderItem={(row: any) => {
                    const chapterNo = Number(row.chapter_no)
                    const disabled = row.action === 'skipped'
                    const checked = selectedSet.has(chapterNo)
                    return (
                      <List.Item>
                        <List.Item.Meta
                          avatar={(
                            <Checkbox
                              checked={checked}
                              onChange={(event) => {
                                setFuture100SelectedNos(prev => {
                                  const next = new Set(prev)
                                  if (event.target.checked) next.add(chapterNo)
                                  else next.delete(chapterNo)
                                  return Array.from(next).sort((a, b) => a - b)
                                })
                              }}
                            />
                          )}
                          title={(
                            <Space wrap>
                              <Tag color={row.action === 'create' ? 'green' : row.action === 'update' ? 'gold' : 'default'} bordered={false}>
                                {row.action === 'create' ? '新建' : row.action === 'update' ? '覆盖' : '跳过'}
                              </Tag>
                              <Text>第{row.chapter_no}章 {row.title || '未命名'}</Text>
                              {row.existing_outline_id && <Tag bordered={false}>原大纲 #{row.existing_outline_id}</Tag>}
                              {row.changed === false && <Tag color="default" bordered={false}>内容接近</Tag>}
                            </Space>
                          )}
                          description={(
                            <Space direction="vertical" size={2}>
                              {row.existing_summary && <Text type="secondary">原：{row.existing_summary}</Text>}
                              <Text>新：{row.next_summary || '待补齐'}</Text>
                            </Space>
                          )}
                        />
                      </List.Item>
                    )
                  }}
                />
              </Card>
            </Space>
          )
        })()}
      </Modal>

    </>
  )
}
