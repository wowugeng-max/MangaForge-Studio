import React from 'react'
import { Button, Input, Modal, Popover, Progress, Slider, Space, Tag, Tooltip, Typography } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FontSizeOutlined,
  LineHeightOutlined,
  MoreOutlined,
  StopOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { chapterWordCount, displayValue } from './utils'
import {
  buildNovelDraftBriefSummary,
  buildNovelDeliverySummary,
  buildNovelWritingRecommendation,
  type NovelDeliveryActionKey,
  type NovelDeliverySummaryInput,
  type NovelWritingRecommendedActionKey,
  type NovelWritingRecommendation,
} from './writingRecommendationModel'
import type { ChapterHandoffDeskModel, DeslopGateDiagnosticsModel, WritingQueueItem, WritingQueueModel } from './writingCockpitModel'
import type { EditorView } from '@codemirror/view'
import { ProseEditor } from './workspace-center-prose-editor'
import { WorkspaceCenterWritingSupport } from './workspace-center-writing-support'
import { WorkspaceCenterEmptyProject } from './workspace-center-empty-project'
import { WorkspaceCenterNoChapter } from './workspace-center-no-chapter'
import {
  WorkspaceCenterSecondaryActionMenu,
  WorkspaceCenterWordTargetControl,
  type ChapterWordTargetMode,
} from './workspace-center-editor-controls'
import {
  DEFAULT_EDITOR_DISPLAY_PREFS,
  DeslopGateDiagnosticsPanel,
  EditorDisplayControls,
  EDITOR_DISPLAY_PRESETS,
  loadEditorDisplayPrefs,
  saveEditorDisplayPrefs,
  saveWritingAuxCollapsed,
  type EditorDisplayPrefs,
  type SaveStatus,
} from './workspace-center-chrome'
import { ChapterActionBar } from './workspace-center-chapter-action-bar'
import { buildChapterWorkflowPresenter } from './chapter-workflow-presenter'
import './WorkspaceCenter.css'

const { Title, Text, Paragraph } = Typography

export function WorkspaceCenter({
  isEmptyProject,
  selectedProject,
  activeChapter,
  materialScore,
  worldbuildingCount,
  characterCount,
  outlineCount,
  streamingChapterId,
  streamingText,
  streamingProgress,
  streamingPercent,
  generationPipeline,
  streamingEndRef,
  proseEditorRef,
  saveStatus,
  planning,
  incubatingOriginal,
  generatingProse,
  generatingSceneCards,
  preDraftBriefLoading,
  styleSampleActionLoading,
  diagnosticsLoading,
  pipelineLoading,
  editorReportLoading,
  onRunPlan,
  onCreateOutline,
  onCreateChapter,
  onRunOriginalIncubator,
  onOpenReferenceConfig,
  onOpenWritingBibleEditor,
  onGenerateCurrentChapterProse,
  onRepairAndGenerateCurrentChapter,
  onGenerateSceneCards,
  onBuildPreDraftBrief,
  onConfirmPreDraftBrief,
  onSavePreDraftBrief,
  onLockStyleSamples,
  onReplaceStyleSamples,
  onDisableStyleSamples,
  onOpenGenerationDiagnostics,
  onOpenQualityCard,
  onStartChapterPipeline,
  onCreateEditorReport,
  onEditActiveChapter,
  onOpenStoryAssets,
  onChapterTextChange,
  generationWordTargetMode = 'standard',
  generationTargetWordCount = 3000,
  onGenerationWordTargetModeChange,
  onGenerationTargetWordCountChange,
  writingRecommendation,
  writingQueue,
  onSelectWritingQueueChapter,
  onRepairWritingQueuePlan,
  onRepairWritingQueuePlanBatch,
  chapterAcceptanceDesk,
  chapterHandoffDesk,
  deliveryActionLoading,
  onDeliveryAction,
  onRepairDeslopGate,
  onOpenVersionHistory,
  onFocusQualityPanel,
  isImmersiveShell = false,
}: {
  isEmptyProject: boolean
  selectedProject: any | null
  activeChapter: any | null
  materialScore?: any
  worldbuildingCount: number
  characterCount: number
  outlineCount: number
  streamingChapterId: number | null
  streamingText: string
  streamingProgress: string
  streamingPercent: number
  generationPipeline?: any[]
  streamingEndRef: React.RefObject<HTMLDivElement | null>
  proseEditorRef: React.MutableRefObject<EditorView | null>
  saveStatus: SaveStatus
  planning: boolean
  incubatingOriginal: boolean
  generatingProse: boolean
  generatingSceneCards: boolean
  preDraftBriefLoading?: boolean
  styleSampleActionLoading?: boolean
  diagnosticsLoading: boolean
  pipelineLoading: boolean
  editorReportLoading: boolean
  onRunPlan: () => void
  onCreateOutline: () => void
  onCreateChapter: () => void
  onRunOriginalIncubator: () => void
  onOpenReferenceConfig: () => void
  onOpenWritingBibleEditor: () => void
  onGenerateCurrentChapterProse: () => void
  onRepairAndGenerateCurrentChapter: () => void
  onGenerateSceneCards: () => void
  onBuildPreDraftBrief?: () => void
  onConfirmPreDraftBrief?: () => void
  onSavePreDraftBrief?: (brief: any) => Promise<void> | void
  onLockStyleSamples?: () => void
  onReplaceStyleSamples?: () => void
  onDisableStyleSamples?: () => void
  onOpenGenerationDiagnostics: () => void
  onOpenQualityCard: () => void
  onStartChapterPipeline: () => void
  onCreateEditorReport: () => void
  onEditActiveChapter: () => void
  onOpenStoryAssets?: (focus?: 'discoveredAssets') => void
  onChapterTextChange: (text: string) => void
  generationWordTargetMode?: ChapterWordTargetMode
  generationTargetWordCount?: number
  onGenerationWordTargetModeChange?: (mode: ChapterWordTargetMode) => void
  onGenerationTargetWordCountChange?: (count: number) => void
  writingRecommendation?: NovelWritingRecommendation
  writingQueue?: WritingQueueModel | null
  onSelectWritingQueueChapter?: (chapterId: number) => void
  onRepairWritingQueuePlan?: (item: WritingQueueItem) => void
  onRepairWritingQueuePlanBatch?: (queue: WritingQueueModel) => void
  chapterAcceptanceDesk?: NovelDeliverySummaryInput | null
  chapterHandoffDesk?: ChapterHandoffDeskModel | null
  deliveryActionLoading?: boolean
  onDeliveryAction?: (key: NovelDeliveryActionKey) => void
  onRepairDeslopGate?: () => void
  onOpenVersionHistory?: () => void
  onFocusQualityPanel?: () => void
  isImmersiveShell?: boolean
}) {
  const [editorDisplayPrefs, setEditorDisplayPrefs] = React.useState<EditorDisplayPrefs>(() => loadEditorDisplayPrefs())
  const [writingAuxCollapsed, setWritingAuxCollapsed] = React.useState(() => true)
  const [immersiveAuxOpen, setImmersiveAuxOpen] = React.useState(false)
  const [blueprintEditorOpen, setBlueprintEditorOpen] = React.useState(false)
  const [blueprintEditorText, setBlueprintEditorText] = React.useState('')
  const [blueprintEditorError, setBlueprintEditorError] = React.useState('')
  const materialReady = !materialScore || Boolean(materialScore.can_generate)
  const materialRecommendations = Array.isArray(materialScore?.recommendations)
    ? materialScore.recommendations.filter(Boolean)
    : []
  const requiredAdvances = Array.isArray(activeChapter?.raw_payload?.must_advance)
    ? activeChapter.raw_payload.must_advance.filter(Boolean)
    : []
  const forbiddenRepeats = Array.isArray(activeChapter?.raw_payload?.forbidden_repeats)
    ? activeChapter.raw_payload.forbidden_repeats.filter(Boolean)
    : []
  const sceneCards = activeChapter && Array.isArray(activeChapter.scene_list) && activeChapter.scene_list.length > 0
    ? activeChapter.scene_list
    : (activeChapter && Array.isArray(activeChapter.scene_breakdown) ? activeChapter.scene_breakdown : [])
  const firstScene = sceneCards[0]
  const dependencyText = [
    worldbuildingCount > 0 ? '世界观已备' : '缺世界观',
    characterCount > 0 ? '角色已备' : '缺角色',
    outlineCount > 0 ? '大纲已备' : '缺大纲',
  ].join(' · ')
  const activeWordCount = chapterWordCount(activeChapter)
  const recommendedAction = writingRecommendation ?? buildNovelWritingRecommendation({
    materialReady,
    materialRecommendations,
    sceneCardCount: sceneCards.length,
    activeWordCount,
  })
  const deliverySummary = buildNovelDeliverySummary(chapterAcceptanceDesk)
  const deliveryNeedsStorySync = Boolean(deliverySummary.storyStateSyncAction)
  const deliveryPrimaryIsSync = deliverySummary.actionKey === 'sync_story_state'
  const deliveryNextStepText = (() => {
    if (deliveryPrimaryIsSync) return '正文已就绪。当前优先同步故事状态，再继续下一章。'
    if (deliveryNeedsStorySync && deliverySummary.actionKey) {
      return `当前优先：${deliverySummary.actionLabel}。正文若已满意，可另外同步故事状态（不会回滚正文）。`
    }
    if (deliverySummary.actionKey) {
      return `当前优先：${deliverySummary.actionLabel}${deliverySummary.reason ? `。${deliverySummary.reason}` : '。'}`
    }
    return deliverySummary.reason || '按交稿进度完成质检、修订和故事状态同步。'
  })()
  const deliveryQualityPending = Boolean(
    deliverySummary.qualityLabel.includes('待')
    || ['needs_quality_check', 'needs_recheck', 'needs_revision'].includes(String(chapterAcceptanceDesk?.acceptanceStatus || '')),
  )
  const deliveryQualityDetail = deliveryQualityPending
    ? (deliverySummary.reason || '完成质量复检后再验收更稳妥。')
    : '质量已通过，可继续同步状态或验收。'
  const deliveryStoryDetail = deliveryNeedsStorySync
    ? (deliverySummary.storyStatePanel?.guidance || '可在正文满意后手动同步；同步失败不会回滚正文。')
    : '状态机已与当前正文对齐。'
  const activePreDraftBrief = activeChapter?.raw_payload?.pre_draft_brief || activeChapter?.raw_payload?.preDraftBrief || null
  const ipSceneIntakeTooltip = deliverySummary.ipSceneIntake?.candidates?.length ? (
    <div className="novel-delivery-ip-scene-tooltip">
      {deliverySummary.ipSceneIntake.candidates.slice(0, 3).map((candidate, index) => (
        <div key={`${candidate.title}-${index}`} className="novel-delivery-ip-scene-tooltip-item">
          <strong>{candidate.title}</strong>
          {candidate.visualHook && <span>视觉钩子：{candidate.visualHook}</span>}
          {candidate.adaptationValue && <span>改编价值：{candidate.adaptationValue}</span>}
          {candidate.spreadPoint && <span>传播点：{candidate.spreadPoint}</span>}
        </div>
      ))}
    </div>
  ) : '本章已沉淀可传播、可视化或适合短剧/漫剧改编的强场面候选'
  const draftBriefSummary = buildNovelDraftBriefSummary({
    activeWordCount,
    chapterGoal: activeChapter?.chapter_goal || activeChapter?.chapter_summary,
    conflict: activeChapter?.conflict,
    endingHook: activeChapter?.ending_hook,
    sceneCardCount: sceneCards.length,
    preDraftBrief: activePreDraftBrief,
  })
  const styleSampleActionDisabled = !activeChapter || Boolean(styleSampleActionLoading || preDraftBriefLoading || generatingProse)
  const openChapterBlueprintEditor = () => {
    setBlueprintEditorText(JSON.stringify(activePreDraftBrief?.chapter_blueprint || {}, null, 2))
    setBlueprintEditorError('')
    setBlueprintEditorOpen(true)
  }
  const saveChapterBlueprintEditor = async () => {
    try {
      const parsed = JSON.parse(blueprintEditorText)
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        setBlueprintEditorError('蓝图 JSON 必须是对象')
        return
      }
      const nextBrief = {
        ...(activePreDraftBrief || {}),
        chapter_blueprint: parsed,
      }
      delete nextBrief.confirmed_at
      await onSavePreDraftBrief?.(nextBrief)
      setBlueprintEditorOpen(false)
    } catch (error: any) {
      setBlueprintEditorError(error?.message || '蓝图 JSON 格式不正确')
    }
  }
  const recommendedClass = (key: NovelWritingRecommendedActionKey) => key === recommendedAction.key ? 'novel-editor-recommended-action' : undefined
  const commandClass = (key?: NovelWritingRecommendedActionKey, extra = '') => [
    'novel-editor-command-pill',
    key ? recommendedClass(key) : '',
    extra,
  ].filter(Boolean).join(' ')
  const renderWordTargetControl = () => (
    <WorkspaceCenterWordTargetControl
      generationWordTargetMode={generationWordTargetMode}
      generationTargetWordCount={generationTargetWordCount}
      onGenerationWordTargetModeChange={onGenerationWordTargetModeChange}
      onGenerationTargetWordCountChange={onGenerationTargetWordCountChange}
    />
  )
  const recommendedBadge = (phase: typeof recommendedAction.phase) => (
    phase === recommendedAction.phase ? <span className="novel-editor-recommended-badge">推荐下一步</span> : null
  )
  const selectWritingQueueChapter = (chapterId: any) => {
    const id = Number(chapterId || 0)
    if (!id) return
    onSelectWritingQueueChapter?.(id)
  }
  const currentQueueItem = writingQueue?.items.find(item => Number(item.chapterNo) === Number(writingQueue.currentChapterNo)) || null
  const runDraftBriefAction = () => {
    if (draftBriefSummary.actionKey === 'metadata') onEditActiveChapter()
    if (draftBriefSummary.actionKey === 'scene_cards') onGenerateSceneCards()
    if (draftBriefSummary.actionKey === 'build_brief') onBuildPreDraftBrief?.()
    if (draftBriefSummary.actionKey === 'confirm_brief') onConfirmPreDraftBrief?.()
    if (draftBriefSummary.actionKey === 'generate') onGenerateCurrentChapterProse()
  }
  const draftBriefActionLoading = draftBriefSummary.actionKey === 'scene_cards'
    ? generatingSceneCards
    : ['build_brief', 'confirm_brief'].includes(String(draftBriefSummary.actionKey || ''))
      ? Boolean(preDraftBriefLoading)
      : draftBriefSummary.actionKey === 'generate'
        ? generatingProse
        : false
  const runQueueDeliveryAction = () => {
    if (deliverySummary.actionKey) {
      onDeliveryAction?.(deliverySummary.actionKey)
      return
    }
    onOpenQualityCard()
  }
  const queueFocus = currentQueueItem
    ? currentQueueItem.status === 'needs_plan'
      ? {
          tone: 'plan',
          title: '本章计划缺口',
          detail: `需要先补齐 ${currentQueueItem.missingPlanLabels.length > 0 ? currentQueueItem.missingPlanLabels.join('、') : '章节目标、核心冲突、章末钩子'}，再进入任务书、场景卡和正文生成。`,
          actionLabel: '补齐本章计划',
          disabled: false,
          loading: false,
          run: () => onRepairWritingQueuePlan?.(currentQueueItem),
          tags: currentQueueItem.missingPlanLabels,
        }
      : currentQueueItem.status === 'ready_to_draft'
        ? {
            tone: 'draft',
            title: '本章开写就绪',
            detail: draftBriefSummary.actionLabel
              ? `章节计划已具备，下一步处理 ${draftBriefSummary.actionLabel}，再进入正文生成。`
              : '章节计划已具备，检查任务书、场景卡和字数目标后进入正文生成。',
            actionLabel: '处理本章开写',
            disabled: !draftBriefSummary.actionKey,
            loading: draftBriefSummary.actionKey === 'scene_cards'
              ? generatingSceneCards
              : ['build_brief', 'confirm_brief'].includes(String(draftBriefSummary.actionKey || ''))
                ? Boolean(preDraftBriefLoading)
                : generatingProse,
            run: runDraftBriefAction,
            tags: [draftBriefSummary.statusLabel].filter(Boolean),
          }
        : {
            tone: 'delivery',
            title: '本章交稿中',
            detail: deliverySummary.visible
              ? (deliverySummary.reason || '按交稿进度完成质检、修订和故事状态同步。')
              : '正文已生成，下一步进入交稿质检与故事状态同步。',
            actionLabel: deliverySummary.actionLabel || '处理交稿',
            disabled: false,
            loading: Boolean(deliveryActionLoading),
            run: runQueueDeliveryAction,
            tags: [],
          }
    : null
  const chapterWorkflow = buildChapterWorkflowPresenter({
    hasChapter: Boolean(activeChapter),
    hasProse: activeWordCount > 0,
    materialReady,
    materialBlockReason: materialRecommendations[0] || '',
    acceptanceStatus: String(chapterAcceptanceDesk?.acceptanceStatus || ''),
    admissionStatus: String((chapterAcceptanceDesk as any)?.admissionStatus || ''),
    admissionMessage: String((chapterAcceptanceDesk as any)?.admissionMessage || deliverySummary.reason || ''),
    storyStateSynced: Boolean(
      chapterAcceptanceDesk?.storyStateSynced === true
      || deliverySummary.storyStatePanel?.status === 'synced'
      || String(deliverySummary.storyStateLabel || '').includes('已同步'),
    ),
    qualityScore: chapterAcceptanceDesk?.qualityScore ?? null,
    canSyncStoryState: Boolean(deliverySummary.storyStateSyncAction || deliverySummary.storyStatePanel?.canSync),
    revisionAvailable: Boolean(chapterAcceptanceDesk?.acceptanceStatus === 'needs_revision'),
  })
  const chapterActionLoading = Boolean(
    generatingProse || deliveryActionLoading || preDraftBriefLoading || editorReportLoading,
  )
  const runChapterWorkflowAction = (key: string) => {
    if (key === 'generate') {
      onGenerateCurrentChapterProse()
      return
    }
    if (key === 'repair_generate') {
      onRepairAndGenerateCurrentChapter()
      return
    }
    if (key === 'repair_materials') {
      onRepairAndGenerateCurrentChapter()
      return
    }
    if (key === 'open_story_assets') {
      onOpenStoryAssets()
      return
    }
    if (key === 'open_generation_diagnostics') {
      onOpenGenerationDiagnostics()
      return
    }
    if (key === 'open_versions') {
      onOpenVersionHistory?.()
      return
    }
    if (key === 'view_brief') {
      setWritingAuxCollapsed(false)
      return
    }
    if (key === 'view_quality') {
      onFocusQualityPanel?.()
      onOpenQualityCard()
      return
    }
    if (key === 'refresh_current_quality' || key === 'create_editor_report' || key === 'apply_editor_revision' || key === 'sync_story_state' || key === 'accept_chapter_and_continue') {
      onDeliveryAction?.(key as any)
      return
    }
  }
  const writingAuxQueueSummary = writingQueue?.visible
    ? [
        `可写 ${writingQueue.readyCount}`,
        writingQueue.blockedCount > 0 ? `待补 ${writingQueue.blockedCount}` : '',
        writingQueue.draftedCount > 0 ? `待质检 ${writingQueue.draftedCount}` : '',
      ].filter(Boolean).join(' · ')
    : ''

  React.useEffect(() => {
    saveEditorDisplayPrefs(editorDisplayPrefs)
  }, [editorDisplayPrefs])

  React.useEffect(() => {
    saveWritingAuxCollapsed(writingAuxCollapsed)
  }, [writingAuxCollapsed])

  React.useEffect(() => {
    if (!isImmersiveShell) setImmersiveAuxOpen(false)
  }, [isImmersiveShell])

  const secondaryActionMenu = (
    <WorkspaceCenterSecondaryActionMenu
      commandClass={commandClass}
      recommendedBadge={recommendedBadge}
      diagnosticsLoading={diagnosticsLoading}
      generatingSceneCards={generatingSceneCards}
      editorReportLoading={editorReportLoading}
      onOpenGenerationDiagnostics={onOpenGenerationDiagnostics}
      onGenerateSceneCards={onGenerateSceneCards}
      onEditActiveChapter={onEditActiveChapter}
      onOpenQualityCard={onOpenQualityCard}
      onCreateEditorReport={onCreateEditorReport}
    />
  )

  const writingSupportBody = (
    <WorkspaceCenterWritingSupport
      blueprintEditorError={blueprintEditorError}
      blueprintEditorOpen={blueprintEditorOpen}
      blueprintEditorText={blueprintEditorText}
      chapterHandoffDesk={chapterHandoffDesk}
      currentQueueItem={currentQueueItem}
      deliveryActionLoading={deliveryActionLoading}
      deliveryNeedsStorySync={deliveryNeedsStorySync}
      deliveryNextStepText={deliveryNextStepText}
      deliveryQualityDetail={deliveryQualityDetail}
      deliveryQualityPending={deliveryQualityPending}
      deliveryStoryDetail={deliveryStoryDetail}
      deliverySummary={deliverySummary}
      draftBriefActionLoading={draftBriefActionLoading}
      draftBriefSummary={draftBriefSummary}
      generatingProse={generatingProse}
      generationTargetWordCount={generationTargetWordCount}
      ipSceneIntakeTooltip={ipSceneIntakeTooltip}
      onDeliveryAction={onDeliveryAction}
      onDisableStyleSamples={onDisableStyleSamples}
      onLockStyleSamples={onLockStyleSamples}
      onOpenStoryAssets={onOpenStoryAssets}
      onRepairDeslopGate={onRepairDeslopGate}
      onRepairWritingQueuePlanBatch={onRepairWritingQueuePlanBatch}
      onReplaceStyleSamples={onReplaceStyleSamples}
      onSavePreDraftBrief={onSavePreDraftBrief}
      openChapterBlueprintEditor={openChapterBlueprintEditor}
      preDraftBriefLoading={preDraftBriefLoading}
      queueFocus={queueFocus}
      runDraftBriefAction={runDraftBriefAction}
      saveChapterBlueprintEditor={saveChapterBlueprintEditor}
      sceneCardCount={sceneCards.length}
      sceneCards={sceneCards}
      selectWritingQueueChapter={selectWritingQueueChapter}
      setBlueprintEditorError={setBlueprintEditorError}
      setBlueprintEditorOpen={setBlueprintEditorOpen}
      setBlueprintEditorText={setBlueprintEditorText}
      styleSampleActionDisabled={styleSampleActionDisabled}
      styleSampleActionLoading={styleSampleActionLoading}
      writingQueue={writingQueue}
    />
  )
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fafbfc' }}>
      {isEmptyProject && (
        <WorkspaceCenterEmptyProject
          selectedProject={selectedProject}
          incubatingOriginal={incubatingOriginal}
          planning={planning}
          onRunOriginalIncubator={onRunOriginalIncubator}
          onOpenReferenceConfig={onOpenReferenceConfig}
          onRunPlan={onRunPlan}
          onOpenWritingBibleEditor={onOpenWritingBibleEditor}
          onCreateOutline={onCreateOutline}
          onCreateChapter={onCreateChapter}
        />
      )}

      {!isEmptyProject && activeChapter && (
        <>
          <div className="novel-writing-header">
            <ChapterActionBar
              presenter={chapterWorkflow}
              loading={chapterActionLoading}
              title={
                <Title className="chapter-action-bar-title novel-editor-title" level={5}>
                  第{activeChapter.chapter_no}章《{displayValue(activeChapter.title) || '无标题'}》
                </Title>
              }
              statusTags={[
                {
                  key: 'chapter-status',
                  label: activeWordCount > 0 ? '已写' : '未写',
                  color: activeWordCount > 0 ? 'green' : 'default',
                },
                ...(materialScore ? [{
                  key: 'material',
                  label: `材料 ${materialScore.score ?? '-'}%`,
                  color: materialScore.can_generate ? 'green' : Number(materialScore.score || 0) >= 65 ? 'gold' : 'red',
                  tooltip: (materialScore.recommendations || []).slice(0, 4).join('；') || '材料完整度',
                }] : []),
              ]}
              wordCountLabel={`${chapterWordCount(activeChapter)} 字`}
              saveStatusLabel={saveStatus === 'saved' ? '已保存' : saveStatus === 'saving' ? '保存中' : saveStatus === 'error' ? '保存失败' : undefined}
              detailsOpen={!writingAuxCollapsed}
              onToggleDetails={() => setWritingAuxCollapsed(prev => !prev)}
              detailsSummary={[
                writingQueue?.visible ? `队列 ${writingAuxQueueSummary}` : '',
                deliverySummary.visible ? `交稿 ${deliverySummary.statusLabel}` : '',
              ].filter(Boolean).join(' · ') || '辅助'}
              trailing={(
                <Space size={6} wrap>
                  {(chapterWorkflow.phase === 'empty' || chapterWorkflow.phase === 'blocked_materials' || recommendedAction.phase === 'draft') && renderWordTargetControl()}
                  <EditorDisplayControls prefs={editorDisplayPrefs} onChange={setEditorDisplayPrefs} />
                  <Popover content={secondaryActionMenu} trigger="click" placement="bottomRight">
                    <Button className="novel-editor-more-actions" size="small" icon={<MoreOutlined />}>更多</Button>
                  </Popover>
                  {isImmersiveShell && (
                    <div className="novel-writing-immersive-aux">
                      <Popover
                        trigger="click"
                        open={immersiveAuxOpen}
                        onOpenChange={setImmersiveAuxOpen}
                        placement="bottomRight"
                        overlayClassName="novel-writing-immersive-aux-popover"
                        content={(
                          <div className="novel-writing-immersive-aux-panel" aria-label="写作辅助面板">
                            {writingSupportBody}
                          </div>
                        )}
                      >
                        <Button size="small" className="novel-writing-immersive-aux-trigger">辅助</Button>
                      </Popover>
                    </div>
                  )}
                </Space>
              )}
              handlers={{
                onGenerate: () => runChapterWorkflowAction('generate'),
                onRepairGenerate: () => runChapterWorkflowAction('repair_generate'),
                onRepairMaterials: () => runChapterWorkflowAction('repair_materials'),
                onRefreshQuality: () => runChapterWorkflowAction('refresh_current_quality'),
                onCreateEditorReport: () => runChapterWorkflowAction('create_editor_report'),
                onApplyEditorRevision: () => runChapterWorkflowAction('apply_editor_revision'),
                onSyncStoryState: () => runChapterWorkflowAction('sync_story_state'),
                onAcceptAndContinue: () => runChapterWorkflowAction('accept_chapter_and_continue'),
                onOpenStoryAssets: () => runChapterWorkflowAction('open_story_assets'),
                onOpenDiagnostics: () => runChapterWorkflowAction('open_generation_diagnostics'),
                onOpenVersions: () => runChapterWorkflowAction('open_versions'),
                onOpenBrief: () => runChapterWorkflowAction('view_brief'),
                onOpenQuality: () => runChapterWorkflowAction('view_quality'),
              }}
            />
            {!isImmersiveShell && !writingAuxCollapsed && (
              <div className="novel-writing-header-details" aria-label="写作辅助详情">
                {writingSupportBody}
              </div>
            )}
          </div>

          {streamingChapterId === activeChapter.id && (
            <div style={{ flexShrink: 0, padding: '12px 24px', background: '#f0f7ff', borderBottom: '1px solid #d6e4ff' }}>
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <Space align="center">
                  <Text strong style={{ fontSize: 13 }}>🤖 生成进度</Text>
                  <Tag color="blue">{streamingProgress || '进行中'}</Tag>
                  <Text type="secondary">{Math.round(streamingPercent)}%</Text>
                </Space>
                <Progress percent={streamingPercent} status={streamingProgress === '生成失败' ? 'exception' : 'active'} size="small" />
                {Array.isArray(generationPipeline) && generationPipeline.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {generationPipeline.slice(-6).map((stage: any, index: number) => (
                      <Tag
                        key={`${stage.key || index}-${stage.at || index}`}
                        color={stage.status === 'success' ? 'green' : stage.status === 'warn' ? 'gold' : stage.status === 'failed' ? 'red' : 'blue'}
                        bordered={false}
                      >
                        {stage.label || stage.key}
                      </Tag>
                    ))}
                  </div>
                )}
                <Paragraph style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, maxHeight: 200, overflow: 'auto', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {streamingText}
                  <div ref={streamingEndRef} />
                </Paragraph>
              </Space>
            </div>
          )}

          <details className="novel-context-panel" style={{ flexShrink: 0, margin: 0 }}>
            <summary className="novel-context-strip">
              <span className="novel-context-strip-title">章节上下文</span>
              <span className="novel-context-pill">
                <strong>本章任务</strong>
                <span>{displayValue(activeChapter.chapter_goal) || displayValue(activeChapter.chapter_summary) || '待补齐'}</span>
              </span>
              <span className="novel-context-pill">
                <strong>写作约束</strong>
                <span>{displayValue(activeChapter.conflict) || displayValue(activeChapter.ending_hook) || dependencyText}</span>
              </span>
              <span className="novel-context-pill">
                <strong>场景节拍</strong>
                <span>{sceneCards.length > 0 ? `${sceneCards.length} 场 · ${displayValue(firstScene?.title || firstScene?.description || firstScene?.purpose) || '待命名'}` : '暂无场景卡'}</span>
              </span>
            </summary>
            <div className="novel-context-cards">
              <section className="novel-context-card">
                <Text strong>本章任务</Text>
                <Text>{displayValue(activeChapter.chapter_goal) || '暂无章节目标'}</Text>
                <Text type="secondary">{displayValue(activeChapter.chapter_summary) || '暂无章节摘要'}</Text>
              </section>
              <section className="novel-context-card">
                <Text strong>写作约束</Text>
                <Text>冲突：{displayValue(activeChapter.conflict) || '-'}</Text>
                <Text>结尾钩子：{displayValue(activeChapter.ending_hook) || '-'}</Text>
                <Text type="secondary">必须推进：{requiredAdvances.length > 0 ? requiredAdvances.join('；') : '-'}</Text>
                <Text type="secondary">禁止重复：{forbiddenRepeats.length > 0 ? forbiddenRepeats.join('；') : '-'}</Text>
                <Text type="secondary">{dependencyText} · 状态 {displayValue(activeChapter.status) || '-'}</Text>
              </section>
              <section className="novel-context-card novel-context-card-scenes">
                <Text strong>场景节拍</Text>
                {sceneCards.length > 0 ? sceneCards.map((scene: any, index: number) => (
                  <div key={`${scene.scene_no || index}-${scene.title || index}`} className="novel-context-scene">
                    <Space wrap size={[6, 4]}>
                      <Tag color="blue" bordered={false}>场景 {scene.scene_no || index + 1}</Tag>
                      {scene.location && <Tag bordered={false}>{scene.location}</Tag>}
                      {scene.emotional_tone && <Tag color="purple" bordered={false}>{scene.emotional_tone}</Tag>}
                    </Space>
                    <Text strong>{displayValue(scene.title || scene.description || scene.purpose) || '未命名场景'}</Text>
                    {(scene.purpose || scene.description) && <Text>{displayValue(scene.purpose || scene.description)}</Text>}
                    {scene.conflict && <Text type="secondary">冲突：{displayValue(scene.conflict)}</Text>}
                    {scene.beat && <Text type="secondary">节拍：{displayValue(scene.beat)}</Text>}
                    {scene.exit_state && <Text type="secondary">出场状态：{displayValue(scene.exit_state)}</Text>}
                  </div>
                )) : (
                  <Text type="secondary">暂无场景卡，生成正文前建议先补齐场景节拍。</Text>
                )}
              </section>
            </div>
          </details>

          <ProseEditor
            value={activeChapter.chapter_text || ''}
            displayPrefs={editorDisplayPrefs}
            proseEditorRef={proseEditorRef}
            onChange={onChapterTextChange}
          />
        </>
      )}

      {!isEmptyProject && !activeChapter && (
        <WorkspaceCenterNoChapter onCreateChapter={onCreateChapter} />
      )}
    </div>
  )
}
