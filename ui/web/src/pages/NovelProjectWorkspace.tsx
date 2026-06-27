import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert, Badge, Button, Card, Checkbox, Form, Input, InputNumber, List, message, Modal, Progress, Select, Space, Typography, Tooltip, Tag,
} from 'antd'
import {
  ArrowLeftOutlined,
  BookOutlined,
  BulbOutlined,
  ClockCircleOutlined,
  ControlOutlined,
  DatabaseOutlined,
  EditOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  ReloadOutlined,
  RocketOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import type { EditorView } from '@codemirror/view'
import { useNavigate, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import { createSSEClient, generateClientId, type SSEMessage } from '../utils/sse'
import { ChapterDirectorySidebar } from './novel-workspace/ChapterDirectorySidebar'
import { CreativeAssistantPanel } from './novel-workspace/CreativeAssistantPanel'
import type { EditorKind } from './novel-workspace/EditorModal'
import { ReferencePanel } from './novel-workspace/ReferencePanel'
import { StoryAssetsWorkspace } from './novel-workspace/StoryAssetsWorkspace'
import { StoryPlanningWorkspace, type PlanningLoadingKey } from './novel-workspace/StoryPlanningWorkspace'
import { WritingCockpitPanel, type WritingCockpitPrimaryActionOverride } from './novel-workspace/WritingCockpitPanel'
import { WorkspaceCenter } from './novel-workspace/WorkspaceCenter'
import {
  buildAutoCreationDirectorModel,
  buildStyleSampleTaskBookRecheckPlan,
  type AutoCreationDirectorAction,
} from './novel-workspace/autoCreationDirectorModel'
import { buildNovelWritingRecommendation } from './novel-workspace/writingRecommendationModel'
import { buildPlanningWorkspaceModel, type PlanningActionKey } from './novel-workspace/planningWorkspaceModel'
import {
  mergeCommercialWebNovelStyleDefaults,
  mergeCommercialWebNovelStyleSampleDefaults,
} from './novel-workspace/writingBibleDefaults'
import {
  buildWritingCockpitModel,
  resolveEditorRevisionChapterId,
  selectTargetChapterForWriting,
  type WritingCockpitActionKey,
} from './novel-workspace/writingCockpitModel'
import {
  normalizeCreativeAssistPayload,
  type CreativeAssistCard,
  type CreativeAssistResult,
  type CreativeAssistantModeKey,
} from './novel-workspace/creativeAssistantModel'
import { useChapterAutosave } from './novel-workspace/useChapterAutosave'
import { useChapterVersions } from './novel-workspace/useChapterVersions'
import { useNovelWorkspaceData, type ChapterSortMode, type ChapterStatusFilter } from './novel-workspace/useNovelWorkspaceData'
import { buildDeliveryRiskRevisionClosurePlan, buildRepairTaskRevisionPrompt } from './novel-workspace/repairTaskRevisionPrompt'
import type { SafeBatchRecoveryFocusSnapshot } from './novel-workspace/TaskCenterDrawer'
import { useReferenceWorkflow } from './novel-workspace/useReferenceWorkflow'
import { useWorkspaceTasks } from './novel-workspace/useWorkspaceTasks'
import {
  displayValue,
  summarizeOutlineExecution,
  wc,
} from './novel-workspace/utils'
import { buildSerialPipelineViewModel } from './novel-workspace/serialPipelineModel'
import './NovelProjectWorkspace.css'

type AnyRecord = Record<string, any>

const { Title, Text, Paragraph } = Typography

const AgentExecutionModal = lazy(() => import('./novel-workspace/AgentExecutionModal').then(module => ({ default: module.AgentExecutionModal })))
const AgentAuditDrawer = lazy(() => import('./novel-workspace/AgentAuditDrawer').then(module => ({ default: module.AgentAuditDrawer })))
const AutoCreationDirectorWorkspace = lazy(() => import('./novel-workspace/AutoCreationDirectorWorkspace').then(module => ({ default: module.AutoCreationDirectorWorkspace })))
const ChapterManagementDrawer = lazy(() => import('./novel-workspace/ChapterManagementDrawer').then(module => ({ default: module.ChapterManagementDrawer })))
const ChapterRestructurePanel = lazy(() => import('./novel-workspace/ChapterRestructurePanel').then(module => ({ default: module.ChapterRestructurePanel })))
const ConsistencyGraphModal = lazy(() => import('./novel-workspace/ConsistencyGraphModal').then(module => ({ default: module.ConsistencyGraphModal })))
const CreativeCardsModal = lazy(() => import('./novel-workspace/CreativeCardsModal').then(module => ({ default: module.CreativeCardsModal })))
const EditorModal = lazy(() => import('./novel-workspace/EditorModal').then(module => ({ default: module.EditorModal })))
const ExportDeliveryModal = lazy(() => import('./novel-workspace/ExportDeliveryModal').then(module => ({ default: module.ExportDeliveryModal })))
const OutlineControlPanel = lazy(() => import('./novel-workspace/OutlineControlPanel').then(module => ({ default: module.OutlineControlPanel })))
const OutlineTreeModal = lazy(() => import('./novel-workspace/OutlineTreeModal').then(module => ({ default: module.OutlineTreeModal })))
const ReferenceConfigModal = lazy(() => import('./novel-workspace/ReferenceConfigModal').then(module => ({ default: module.ReferenceConfigModal })))
const ReferenceEngineeringModal = lazy(() => import('./novel-workspace/ReferenceEngineeringModal').then(module => ({ default: module.ReferenceEngineeringModal })))
const QualityBenchmarkModal = lazy(() => import('./novel-workspace/QualityBenchmarkModal').then(module => ({ default: module.QualityBenchmarkModal })))
const ReviewAnnotationsDrawer = lazy(() => import('./novel-workspace/ReviewAnnotationsDrawer').then(module => ({ default: module.ReviewAnnotationsDrawer })))
const TaskCenterDrawer = lazy(() => import('./novel-workspace/TaskCenterDrawer').then(module => ({ default: module.TaskCenterDrawer })))
const VersionDetailModal = lazy(() => import('./novel-workspace/VersionDetailModal').then(module => ({ default: module.VersionDetailModal })))

type TaskCenterActionOptions = {
  keepTaskCenterOpen?: boolean
}

function safeBatchRecoveryFocusFromPayload(payload: any): SafeBatchRecoveryFocusSnapshot | null {
  if (!payload) return null
  const focus = payload.safeBatchRecoveryFocus || payload.safe_batch_recovery_focus || payload
  const layerKey = String(focus?.layerKey || focus?.layer_key || '').trim()
  const layerLabel = String(focus?.layerLabel || focus?.layer_label || '').trim()
  const issueType = String(focus?.issueType || focus?.issue_type || '').trim()
  const targetView = String(focus?.targetView || focus?.target_view || '').trim()
  if (!layerKey || !issueType && !targetView) return null
  const statuses = Array.isArray(focus?.taskStatuses)
    ? focus.taskStatuses
    : Array.isArray(focus?.task_statuses)
      ? focus.task_statuses
      : []
  return {
    layerKey,
    layerLabel,
    actionLabel: String(focus?.actionLabel || focus?.action_label || layerLabel).trim(),
    targetView,
    issueType,
    source: String(focus?.source || '').trim(),
    taskStatuses: statuses.map((item: any) => String(item || '').trim()).filter(Boolean),
    taskCenterFilterLabel: String(focus?.taskCenterFilterLabel || focus?.task_center_filter_label || layerLabel).trim(),
  }
}

function formatRunResumeErrorMessage(error: any) {
  const payload = error?.response?.data || {}
  if (payload?.error_code === 'APPROVAL_BLOCKER_REQUIRES_REPAIR') {
    const chapterLabel = payload.chapter_no ? `第${payload.chapter_no}章` : '当前章节'
    const actions = Array.isArray(payload.recovery_plan?.actions) ? payload.recovery_plan.actions.filter(Boolean).slice(0, 2).join('；') : ''
    return `${chapterLabel}仍有入库阻断，不能直接继续无人值守。${actions || '请先修复阻断并重新运行正文质检和入库门禁。'}`
  }
  return payload?.error || error?.message || '任务继续失败'
}

type EditorReportForChapterOptions = {
  sourceTask?: any
  sourceRun?: any
  sourceTaskIndex?: number
  autoRevision?: boolean
  skipRevisionConfirm?: boolean
}

function DeferredWorkspaceSurfaces({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}

const productionModeOptions = [
  { value: 'scene_cards_only', label: '只生成场景卡' },
  { value: 'draft_only', label: '只生成正文初稿' },
  { value: 'draft_review', label: '生成并自检' },
  { value: 'draft_review_revise_store', label: '生成、自检、修订、入库' },
  { value: 'full_auto', label: '全自动完整流水线' },
]

type WorkspaceArea = 'autoCreation' | 'storyPlanning' | 'chapterWriting' | 'storyAssets' | 'qualityRevision' | 'productionOps'
type ChapterOwnedData = { chapterId: number; updatedAt: any; data: any }
type ChapterWordTargetMode = 'standard' | 'long' | 'custom'

/* ── main component ─────────────────────────────────────────────── */
export default function NovelProjectWorkspace() {
  const navigate = useNavigate()
  const { id } = useParams()
  const projectId = Number(id)

  // ── 3-step writing flow ──
  const [stepOutlineLoading, setStepOutlineLoading] = useState(false)
  const [stepProseLoading, setStepProseLoading] = useState(false)
  const [stepRepairLoading, setStepRepairLoading] = useState(false)
  const [proseProgress, setProseProgress] = useState({ current: 0, total: 0 })
  const [proseBatchStatus, setProseBatchStatus] = useState<any>(null)
  const [planProgress, setPlanProgress] = useState<any>(null)
  const [planning, setPlanning] = useState(false)
  const [executingAgents, setExecutingAgents] = useState(false)
  const [generatingProse, setGeneratingProse] = useState(false)
  const [generatingSceneCards, setGeneratingSceneCards] = useState(false)
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false)
  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [incubatingOriginal, setIncubatingOriginal] = useState(false)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [editorReportLoading, setEditorReportLoading] = useState(false)
  const [proseQualityLoading, setProseQualityLoading] = useState(false)
  const [bookReviewLoading, setBookReviewLoading] = useState(false)
  const [writingBibleOpen, setWritingBibleOpen] = useState(false)
  const [writingBibleGenerating, setWritingBibleGenerating] = useState(false)
  const [styleSampleCandidateLoading, setStyleSampleCandidateLoading] = useState(false)
  const [styleSampleEffectivenessLoading, setStyleSampleEffectivenessLoading] = useState(false)
  const [styleSamplePatchLoadingKey, setStyleSamplePatchLoadingKey] = useState('')
  const [styleSampleEffectiveness, setStyleSampleEffectiveness] = useState<any | null>(null)
  const [storyStateOpen, setStoryStateOpen] = useState(false)
  const [commercialToolsOpen, setCommercialToolsOpen] = useState(false)
  const [creativeCommandOpen, setCreativeCommandOpen] = useState(false)
  const [creativeCommandText, setCreativeCommandText] = useState('')
  const [creativeCommandPlan, setCreativeCommandPlan] = useState<any | null>(null)
  const [creativeAssistantOpen, setCreativeAssistantOpen] = useState(false)
  const [creativeAssistantMode, setCreativeAssistantMode] = useState<CreativeAssistantModeKey>('prose_review')
  const [creativeAssistantLoading, setCreativeAssistantLoading] = useState(false)
  const [creativeAssistantResult, setCreativeAssistantResult] = useState<CreativeAssistResult | null>(null)
  const [creativeAssistantError, setCreativeAssistantError] = useState('')
  const [creativeAssistantSelectedText, setCreativeAssistantSelectedText] = useState('')
  const [backupImportOpen, setBackupImportOpen] = useState(false)
  const [backupImportText, setBackupImportText] = useState('')
  const [chapterGroupExecutingId, setChapterGroupExecutingId] = useState<number | null>(null)
  const [releaseRepairExecutingId, setReleaseRepairExecutingId] = useState<number | null>(null)
  const [commercialToolLoading, setCommercialToolLoading] = useState('')
  const [productionMode, setProductionMode] = useState('draft_review_revise_store')
  const [unattendedTargetChapter, setUnattendedTargetChapter] = useState(10)
  const [chapterWordTargetMode, setChapterWordTargetMode] = useState<ChapterWordTargetMode>('standard')
  const [chapterTargetWordCount, setChapterTargetWordCount] = useState(3000)
  const [activeChapterDiagnostics, setActiveChapterDiagnostics] = useState<ChapterOwnedData | null>(null)
  const diagnosticsRequestRef = useRef(0)
  const [activeChapterContextPackage, setActiveChapterContextPackage] = useState<ChapterOwnedData | null>(null)
  const [contextPackageLoading, setContextPackageLoading] = useState(false)
  const contextPackageRequestRef = useRef(0)
  const [commercialReadiness, setCommercialReadiness] = useState<any | null>(null)
  const [future100Draft, setFuture100Draft] = useState<any | null>(null)
  const [future100SelectedNos, setFuture100SelectedNos] = useState<number[]>([])
  const [future100ApplyLoading, setFuture100ApplyLoading] = useState(false)
  const [future100FocusOutlineIds, setFuture100FocusOutlineIds] = useState<number[]>([])
  const [projectSettings, setProjectSettings] = useState<any[]>([])
  const [memoryPalaceProjects, setMemoryPalaceProjects] = useState<any[] | null>(null)

  const chapterWordTargetPayload = () => ({
    word_target_mode: chapterWordTargetMode,
    ...(chapterWordTargetMode === 'custom' ? { target_word_count: chapterTargetWordCount } : {}),
  })

  const styleSampleEffectivenessItems = useMemo(() => (
    Array.isArray(styleSampleEffectiveness?.samples)
      ? styleSampleEffectiveness.samples.slice(0, 4)
      : []
  ), [styleSampleEffectiveness])

  // ── 大纲生成控制面板 ──
  const [outlinePanelOpen, setOutlinePanelOpen] = useState(false)
  const [referenceConfigOpen, setReferenceConfigOpen] = useState(false)
  const [referenceEngineeringOpen, setReferenceEngineeringOpen] = useState(false)
  const [creativeCardsOpen, setCreativeCardsOpen] = useState(false)
  const [consistencyGraphOpen, setConsistencyGraphOpen] = useState(false)
  const [qualityBenchmarkOpen, setQualityBenchmarkOpen] = useState(false)
  const [exportDeliveryOpen, setExportDeliveryOpen] = useState(false)
  const [reviewAnnotationsOpen, setReviewAnnotationsOpen] = useState(false)
  const [agentAuditOpen, setAgentAuditOpen] = useState(false)
  const [continuityAudit, setContinuityAudit] = useState<any | null>(null)
  const [continuityAuditLoading, setContinuityAuditLoading] = useState(false)

  // ── 章节弹出面板 ──
  const [chapterDrawerOpen, setChapterDrawerOpen] = useState(false)
  const [outlineTreeOpen, setOutlineTreeOpen] = useState(false)
  const [taskCenterOpen, setTaskCenterOpen] = useState(false)
  const [taskCenterRecoveryFocus, setTaskCenterRecoveryFocus] = useState<SafeBatchRecoveryFocusSnapshot | null>(null)

  // ── 章节多选 + 章节重组 ──
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<number>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [restructurePanelOpen, setRestructurePanelOpen] = useState(false)
  const [chapterSearch, setChapterSearch] = useState('')
  const [chapterStatusFilter, setChapterStatusFilter] = useState<ChapterStatusFilter>('all')
  const [chapterSortMode, setChapterSortMode] = useState<ChapterSortMode>('chapter_no_asc')

  // ── streaming ──
  const [streamingChapterId, setStreamingChapterId] = useState<number | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [streamingProgress, setStreamingProgress] = useState('')
  const [streamingPercent, setStreamingPercent] = useState(0)
  const [generationPipeline, setGenerationPipeline] = useState<any[]>([])
  const streamingEndRef = useRef<HTMLDivElement | null>(null)
  const proseBatchCancelRef = useRef(false)

  // ── editors / modals ──
  const [editorKind, setEditorKind] = useState<EditorKind | null>(null)
  const [editorItem, setEditorItem] = useState<any | null>(null)
  const [editorForm] = Form.useForm()
  const [writingBibleForm] = Form.useForm()
  const [storyStateForm] = Form.useForm()
  const [approvalPolicyForm] = Form.useForm()
  const [agentConfigForm] = Form.useForm()

  // ── right reference panel ──
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [rightPanelTab, setRightPanelTab] = useState('worldbuilding')
  const [workspaceArea, setWorkspaceArea] = useState<WorkspaceArea>('autoCreation')
  const [focusWritingMode, setFocusWritingMode] = useState(false)
  const [directoryCollapsed, setDirectoryCollapsed] = useState(false)
  const [storyAssetsFocusDiscoveredToken, setStoryAssetsFocusDiscoveredToken] = useState(0)
  const [autoDirectorActionLoadingKey, setAutoDirectorActionLoadingKey] = useState('')

  const isWritingFocusMode = focusWritingMode && workspaceArea === 'chapterWriting'
  const directoryShellClassName = directoryCollapsed ? 'novel-workspace-directory-shell is-collapsed' : 'novel-workspace-directory-shell'

  useEffect(() => {
    if (workspaceArea !== 'chapterWriting') setFocusWritingMode(false)
  }, [workspaceArea])

  const proseEditorRef = useRef<EditorView | null>(null)

  type GenerationPreflightRepairAction = {
    key: string
    label: string
    description: string
    modelCall: boolean
    primary?: boolean
    run: () => Promise<void> | void
  }

  const generationPreflightChecks = (payload: any) => {
    const preflight = payload?.preflight || payload?.context_package?.preflight || {}
    return Array.isArray(preflight.checks) ? preflight.checks : []
  }

  const generationPreflightMissingKeys = (payload: any) => {
    const checks = generationPreflightChecks(payload)
    return new Set(checks.filter((check: any) => !check.ok).map((check: any) => String(check.key || '').trim()).filter(Boolean))
  }

  const generationPreflightTargetChapterId = (payload: any, fallbackChapterId?: number) => {
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

  const repairGenerationPreflightGaps = async (payload: any, options: { targetChapterId?: number; repairKeys?: string[]; continueAfterRepair?: () => void; closeModal?: () => void } = {}) => {
    const targetChapterId = generationPreflightTargetChapterId(payload, options.targetChapterId)
    if (!targetChapterId) return message.warning('无法定位需要补齐的章节')
    if (!selectedModelId) return message.warning('请先选择写作模型')
    if (!await flushPendingSave()) return

    const missingKeys = options.repairKeys?.length ? new Set(options.repairKeys) : generationPreflightMissingKeys(payload)
    const needsCharacterRepair = ['characters', 'character_state', 'no_repeat'].some(key => missingKeys.has(key))
    const needsSettingWorkshop = missingKeys.has('setting_workshop')
    const needsChapterSettingUsage = missingKeys.has('chapter_setting_usage')
    if (!needsCharacterRepair && !needsSettingWorkshop && !needsChapterSettingUsage) {
      options.closeModal?.()
      return message.info('当前没有可自动补齐的前置检查缺口')
    }

    const messageKey = 'generation-preflight-repair'
    message.loading({ content: '正在自动补齐生成材料...', key: messageKey, duration: 0 })
    try {
      const repaired: string[] = []
      if (needsCharacterRepair) {
        const res = await apiClient.post(`/novel/chapters/${targetChapterId}/auto-repair-context`, {
          project_id: projectId,
          model_id: selectedModelId,
        })
        const applied = Array.isArray(res.data?.applied) ? res.data.applied : []
        const characterCreatedCount = applied.filter((item: any) => item.type === 'character_created').length
        repaired.push(characterCreatedCount > 0 ? `角色卡已补 ${characterCreatedCount} 张` : '角色材料已刷新，未新增角色卡')
      }
      if (needsSettingWorkshop) {
        const res = await apiClient.post(`/novel/projects/${projectId}/settings/incubate-from-project`, {
          use_model: true,
          model_id: selectedModelId,
        })
        repaired.push(`设定工坊不足 ${res.data?.total || 0} 条`)
      }
      if (needsChapterSettingUsage) {
        const res = await apiClient.post(`/novel/chapters/${targetChapterId}/settings-usage/suggest`, {
          project_id: projectId,
          model_id: selectedModelId,
          use_model: true,
          apply: true,
        })
        repaired.push(`本章设定调用不足 ${res.data?.total || 0} 条`)
      }
      await loadProjectModules()
      options.closeModal?.()
      message.success({ content: repaired.length ? `已自动补齐：${repaired.join('；')}` : '材料已刷新', key: messageKey, duration: 3 })
      options.continueAfterRepair?.()
    } catch (error: any) {
      message.error({ content: error?.response?.data?.error || error?.message || '自动补齐生成材料失败', key: messageKey, duration: 4 })
    }
  }

  const buildGenerationPreflightRepairActions = (payload: any, options: { targetChapterId?: number; onRepairComplete?: () => void; closeModal?: () => void } = {}): GenerationPreflightRepairAction[] => {
    const missingKeys = generationPreflightMissingKeys(payload)
    const targetChapterId = generationPreflightTargetChapterId(payload, options.targetChapterId)
    const actions: GenerationPreflightRepairAction[] = []
    const repairableKeys = ['characters', 'character_state', 'no_repeat', 'setting_workshop', 'chapter_setting_usage'].filter(key => missingKeys.has(key))
    if (repairableKeys.length > 1 && options.onRepairComplete) {
      actions.push({
        key: 'repair_all_generation_preflight',
        label: '自动补齐并继续生成',
        description: '依次处理角色卡不足、设定工坊不足、本章设定调用不足，刷新材料后重新生成。',
        modelCall: true,
        primary: true,
        run: () => repairGenerationPreflightGaps(payload, {
          targetChapterId,
          repairKeys: repairableKeys,
          continueAfterRepair: options.onRepairComplete,
          closeModal: options.closeModal,
        }),
      })
    }
    if (missingKeys.has('characters') || missingKeys.has('character_state') || missingKeys.has('no_repeat')) {
      actions.push({
        key: 'repair_character_cards',
        label: '补角色卡',
        description: '修复角色卡不足：调用大模型补齐角色卡、角色当前状态和本章禁止重复材料。',
        modelCall: true,
        run: () => repairGenerationPreflightGaps(payload, {
          targetChapterId,
          repairKeys: ['characters', 'character_state', 'no_repeat'],
          closeModal: options.closeModal,
        }),
      })
    }
    if (missingKeys.has('setting_workshop')) {
      actions.push({
        key: 'incubate_setting_workshop',
        label: '提炼设定工坊',
        description: '修复设定工坊不足：调用大模型从项目资料、世界观、角色和大纲提炼设定资产。',
        modelCall: true,
        run: () => repairGenerationPreflightGaps(payload, {
          targetChapterId,
          repairKeys: ['setting_workshop'],
          closeModal: options.closeModal,
        }),
      })
    }
    if (missingKeys.has('chapter_setting_usage')) {
      actions.push({
        key: 'match_chapter_setting_usage',
        label: '匹配本章设定调用',
        description: '修复本章设定调用不足：调用大模型为本章标记必用、允许和禁揭设定。',
        modelCall: true,
        run: () => repairGenerationPreflightGaps(payload, {
          targetChapterId,
          repairKeys: ['chapter_setting_usage'],
          closeModal: options.closeModal,
        }),
      })
    }
    if (missingKeys.has('setting_workshop') || missingKeys.has('chapter_setting_usage')) {
      actions.push({
        key: 'open_setting_workshop',
        label: '打开设定工坊',
        description: '不调用大模型，只跳转到设定资产工作台手动补齐。',
        modelCall: false,
        run: () => {
          options.closeModal?.()
          openStoryAssetsWorkspace()
        },
      })
    }
    return actions
  }

  const renderGenerationPreflightRepairActions = (actions: GenerationPreflightRepairAction[]) => {
    if (!actions.length) return null
    return (
      <div>
        <Text strong>可自动处理</Text>
        <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 8 }}>
          {actions.map(action => (
            <div key={action.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <Space direction="vertical" size={2} style={{ flex: '1 1 320px' }}>
                <Space size={6} wrap>
                  <Text>{action.label}</Text>
                  <Tag color={action.modelCall ? 'blue' : 'default'} bordered={false}>{action.modelCall ? '调用大模型' : '不调用大模型'}</Tag>
                </Space>
                <Text type="secondary">{action.description}</Text>
              </Space>
              <Tooltip title={action.description}>
                <Button type={action.primary ? 'primary' : 'default'} size="small" onClick={() => { void action.run() }}>
                  {action.label}
                </Button>
              </Tooltip>
            </div>
          ))}
        </Space>
      </div>
    )
  }

  const renderPreflightModalContent = (payload: any, repairActions: GenerationPreflightRepairAction[] = []) => {
    const preflight = payload?.preflight || payload?.context_package?.preflight || {}
    const checks = Array.isArray(preflight.checks) ? preflight.checks : []
    const blockers = Array.isArray(preflight.blockers) ? preflight.blockers : []
    const warnings = Array.isArray(preflight.warnings) ? preflight.warnings : []
    const safetyDecision = payload?.safety_decision
    return (
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Alert
          type={payload?.error_code === 'REFERENCE_SAFETY_BLOCKED' ? 'error' : 'warning'}
          showIcon
          message={payload?.error || '生成条件未满足'}
          description="系统没有直接写入正文，避免整章生成失败后污染当前版本。你可以补齐材料、刷新场景卡，或选择允许缺材料继续。"
        />
        {blockers.length > 0 && (
          <div>
            <Text strong>阻塞项</Text>
            <List
              size="small"
              dataSource={blockers}
              renderItem={(item: any) => (
                <List.Item>
                  <Space direction="vertical" size={2}>
                    <Text>{item.label || item.key || item}</Text>
                    {item.fix && <Text type="secondary">{item.fix}</Text>}
                  </Space>
                </List.Item>
              )}
            />
          </div>
        )}
        {checks.length > 0 && (
          <div>
            <Text strong>预检清单</Text>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {checks.map((check: any, index: number) => (
                <Tag key={`${check.key || check.label || index}`} color={check.ok ? 'green' : check.severity === 'high' ? 'red' : 'gold'} bordered={false}>
                  {check.ok ? '✓' : '!'} {check.label || check.key}
                </Tag>
              ))}
            </div>
          </div>
        )}
        {warnings.length > 0 && (
          <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {warnings.join('\n')}
          </Paragraph>
        )}
        {renderGenerationPreflightRepairActions(repairActions)}
        {safetyDecision && (
          <Alert
            type={safetyDecision.blocked ? 'error' : 'info'}
            showIcon
            message={`仿写安全评分：${safetyDecision.score ?? '-'}，照搬命中：${safetyDecision.copy_hit_count ?? 0}`}
            description={(safetyDecision.reasons || []).join('；') || '未发现阻塞项'}
          />
        )}
      </Space>
    )
  }

  const showGenerationBlockedModal = (payload: any, onContinue?: () => void, options: { targetChapterId?: number; onRepairComplete?: () => void } = {}) => {
    const isSafetyBlocked = payload?.error_code === 'REFERENCE_SAFETY_BLOCKED'
    let modalRef: ReturnType<typeof Modal.confirm> | null = null
    const closeModal = () => { modalRef?.destroy() }
    const repairActions = isSafetyBlocked ? [] : buildGenerationPreflightRepairActions(payload, { ...options, closeModal })
    modalRef = Modal.confirm({
      title: isSafetyBlocked ? '仿写安全阈值未通过' : '章节生成前置检查未通过',
      width: 760,
      icon: null,
      content: renderPreflightModalContent(payload, repairActions),
      okText: onContinue && !isSafetyBlocked ? '允许缺材料继续' : '知道了',
      cancelText: onContinue && !isSafetyBlocked ? '先补齐材料' : undefined,
      okButtonProps: isSafetyBlocked ? { danger: true } : undefined,
      onOk: () => {
        if (onContinue && !isSafetyBlocked) onContinue()
      },
    })
  }

  const showDiagnosticsModal = (diagnostics: any) => {
    const preflight = diagnostics?.preflight || {}
    const materialScore = diagnostics?.material_score || {}
    const checks = Array.isArray(preflight.checks) ? preflight.checks : []
    const recommendations = Array.isArray(diagnostics?.recommendations) ? diagnostics.recommendations : []
    Modal.info({
      title: '生成前诊断',
      width: 820,
      content: (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Card size="small">
            <Space align="center" size={16}>
              <Progress type="circle" size={72} percent={Number(materialScore.score ?? diagnostics?.readiness_score ?? 0)} status={materialScore.can_generate || preflight.ready ? 'success' : 'normal'} />
              <Space direction="vertical" size={4}>
                <Text strong>{materialScore.can_generate || preflight.ready ? '可以生成' : '存在材料缺口'}</Text>
                <Text type="secondary">系统会根据高危缺口决定是否阻止直接生成。</Text>
              </Space>
            </Space>
          </Card>
          {Array.isArray(materialScore.categories) && materialScore.categories.length > 0 && (
            <Card size="small" title="材料完整度">
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {materialScore.categories.map((item: any) => (
                  <div key={item.key} style={{ display: 'grid', gridTemplateColumns: '92px minmax(0, 1fr) 42px', gap: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12 }}>{item.label}</Text>
                    <Progress percent={Number(item.score || 0)} size="small" status={item.score >= 80 ? 'success' : item.score < 60 && item.required ? 'exception' : 'normal'} />
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.score}</Text>
                  </div>
                ))}
              </Space>
            </Card>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {checks.map((check: any, index: number) => (
              <Tag key={`${check.key || index}`} color={check.ok ? 'green' : check.severity === 'high' ? 'red' : 'gold'} bordered={false}>
                {check.ok ? '✓' : '!'} {check.label || check.key}
              </Tag>
            ))}
          </div>
          {recommendations.length > 0 && (
            <Card size="small" title="补齐建议">
              <List size="small" dataSource={recommendations} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
            </Card>
          )}
          {diagnostics?.writing_bible && (
            <Card size="small" title="写作圣经摘要">
              <Paragraph ellipsis={{ rows: 4, expandable: true }} style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(diagnostics.writing_bible, null, 2)}
              </Paragraph>
            </Card>
          )}
        </Space>
      ),
    })
  }

  const showCommercialReadinessModal = (readiness: any) => {
    const categories = Array.isArray(readiness?.categories) ? readiness.categories : []
    Modal.info({
      title: '商业化就绪度',
      width: 860,
      content: (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Card size="small">
            <Space align="center" size={16}>
              <Progress type="circle" size={76} percent={Number(readiness?.score || 0)} status={readiness?.can_batch_generate ? 'success' : 'normal'} />
              <Space direction="vertical" size={4}>
                <Text strong>{readiness?.can_batch_generate ? '可以进入批量生产' : '建议先补齐关键材料'}</Text>
                <Text type="secondary">
                  {readiness?.level || '-'} · 章节 {readiness?.summary?.chapters || 0} · 已写 {readiness?.summary?.written_chapters || 0} · 失败任务 {readiness?.summary?.failed_runs || 0}
                </Text>
              </Space>
            </Space>
          </Card>
          {categories.length > 0 && (
            <Card size="small" title="分项评分">
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {categories.map((item: any) => (
                  <div key={item.key} style={{ display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr) 44px', gap: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12 }}>{item.label}</Text>
                    <Progress percent={Number(item.score || 0)} size="small" status={item.score >= 80 ? 'success' : item.score < 60 && item.required ? 'exception' : 'normal'} />
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.score}</Text>
                  </div>
                ))}
              </Space>
            </Card>
          )}
          {Array.isArray(readiness?.next_actions) && readiness.next_actions.length > 0 && (
            <Card size="small" title="下一步动作">
              <List size="small" dataSource={readiness.next_actions} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
            </Card>
          )}
        </Space>
      ),
    })
  }

  const {
    loading,
    selectedProject,
    setSelectedProject,
    worldbuilding,
    characters,
    outlines,
    chapters,
    setChapters,
    runRecords,
    reviews,
    agentExecution,
    setAgentExecution,
    pipeline,
    models,
    selectedModelId,
    setSelectedModelId,
    activeChapterId,
    setActiveChapterId,
    activeChapter,
    loadProjectModules,
    chapterTreeData,
    proseChapters,
    referenceSummary,
    referenceReports,
    isEmptyProject,
    sortedChapters,
    filteredChapters,
  } = useNovelWorkspaceData({
    projectId,
    chapterSearch,
    chapterStatusFilter,
    chapterSortMode,
  })

  const activeChapterIdNumber = Number(activeChapter?.id || 0)
  const activeChapterUpdatedAt = activeChapter?.updated_at || null
  const activeChapterDiagnosticsData = activeChapterDiagnostics?.chapterId === activeChapterIdNumber
    && activeChapterDiagnostics?.updatedAt === activeChapterUpdatedAt
    ? activeChapterDiagnostics.data
    : null
  const activeContextPackageData = activeChapterContextPackage?.chapterId === activeChapterIdNumber
    && activeChapterContextPackage?.updatedAt === activeChapterUpdatedAt
    ? activeChapterContextPackage.data
    : null
  const modelOptions = useMemo(() => models.map((model: any) => {
    const modelName = String(model.display_name || model.model_name || '未命名模型')
    const providerName = String(model.provider || '未知厂商')
    const fullLabel = `${modelName} · ${providerName}`
    return {
      value: model.id,
      label: (
        <span className="novel-model-option" title={fullLabel}>
          <span className="novel-model-option-name">{modelName}</span>
          <span className="novel-model-option-provider">· {providerName}</span>
        </span>
      ),
    }
  }), [models])
  const activeMemorySummary = useMemo(() => {
    if (!projectId) return null
    if (!Array.isArray(memoryPalaceProjects)) return null
    return memoryPalaceProjects.find((item: any) => Number(item?.project_id || 0) === projectId) || {
      project_id: projectId,
      memory_count: 0,
      fact_count: 0,
      continuity_issue_count: 0,
      missing: true,
    }
  }, [memoryPalaceProjects, projectId])

  useEffect(() => {
    if (!projectId) return
    if (workspaceArea !== 'autoCreation' && workspaceArea !== 'storyPlanning' && workspaceArea !== 'storyAssets') return
    let canceled = false
    apiClient.get(`/novel/projects/${projectId}/settings`)
      .then(res => {
        if (canceled) return
        setProjectSettings(Array.isArray(res.data?.items) ? res.data.items : [])
      })
      .catch(() => {
        if (!canceled) setProjectSettings([])
      })
    return () => {
      canceled = true
    }
  }, [projectId, reviews.length, workspaceArea])

  useEffect(() => {
    if (!projectId) return
    let canceled = false
    apiClient.get('/novel/memory-palace/projects')
      .then(res => {
        if (canceled) return
        setMemoryPalaceProjects(Array.isArray(res.data?.projects) ? res.data.projects : [])
      })
      .catch(() => {
        if (!canceled) setMemoryPalaceProjects([])
      })
    return () => {
      canceled = true
    }
  }, [projectId, runRecords.length, reviews.length, sortedChapters.length])

  const proseQualityReports = useMemo(() => (
    reviews
      .filter((item: any) => item.review_type === 'prose_quality')
      .slice()
      .sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  ), [reviews])

  const editorReports = useMemo(() => (
    reviews
      .filter((item: any) => item.review_type === 'editor_report')
      .slice()
      .sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  ), [reviews])

  const editorRevisionReports = useMemo(() => (
    reviews
      .filter((item: any) => item.review_type === 'editor_revision')
      .slice()
      .sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  ), [reviews])

  const bookReviews = useMemo(() => (
    reviews
      .filter((item: any) => item.review_type === 'book_review')
      .slice()
      .sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  ), [reviews])

  const cancelStepGenerateProse = () => {
    if (!stepProseLoading) return
    proseBatchCancelRef.current = true
    setProseBatchStatus((prev: any) => ({
      ...(prev || {}),
      canceled: true,
      lastError: '已请求停止，当前章节完成后停止后续生成',
    }))
    message.info('已请求停止批量生成，当前章节完成后会停止后续章节')
  }

  // ── auto-save state ──
  const {
    saveStatus,
    scheduleSave,
    flushPendingSave,
    selectChapter,
  } = useChapterAutosave({
    activeChapterId,
    resetKey: projectId,
    setActiveChapterId,
    setChapters,
  })

  const selectChapterForWriting = async (chapterId: number) => {
    const saved = await selectChapter(chapterId)
    if (saved) setWorkspaceArea('chapterWriting')
    return saved
  }

  const repairWritingQueuePlan = async (item: any) => {
    const chapterId = Number(item?.id || 0)
    if (!chapterId) return message.warning('这个队列项没有绑定章节')
    if (!await selectChapterForWriting(chapterId)) return
    await runRollingPlan({
      intent: {
        ...(item?.repairIntent || {}),
        source: 'writing_queue_plan_repair',
        chapter_id: chapterId,
        chapter_no: Number(item?.chapterNo || 0),
        title: item?.title || '',
        source_label: item?.sourceLabel || '',
        missing_fields: Array.isArray(item?.missingPlanFields) ? item.missingPlanFields : [],
        missing_labels: Array.isArray(item?.missingPlanLabels) ? item.missingPlanLabels : [],
        instruction: '只补齐当前章节的目标、核心冲突、章末钩子和必要场景职责，不改长期主线、不提前消费后续爆点。',
      },
    })
  }

  const repairWritingQueuePlanBatch = async (queue: any) => {
    const intent = queue?.planRepair?.intent
    if (!intent) return message.warning('当前队列没有可补齐的计划缺口')
    await runRollingPlan({
      intent: {
        ...intent,
        source: 'writing_queue_batch_plan_repair',
        instruction: '批量补齐写作队列里缺少的章节目标、核心冲突、章末钩子和必要场景职责；保持章节顺序、长期主线、剧情线和禁揭边界不变，不提前消费后续爆点。',
      },
    })
  }

  const openStoryAssetsWorkspace = (focus?: 'discoveredAssets') => {
    setWorkspaceArea('storyAssets')
    if (focus === 'discoveredAssets') {
      setStoryAssetsFocusDiscoveredToken(prev => prev + 1)
    }
  }

  const {
    activeTasks,
    activeKnowledgeJobCount,
    productionTasks,
    productionTasksLoading,
    loadProductionTasks,
    knowledgeIngestJobs,
    knowledgeJobsLoading,
    loadKnowledgeIngestJobs,
    pauseKnowledgeIngestJob,
    resumeKnowledgeIngestJob,
    cancelKnowledgeIngestJob,
  } = useWorkspaceTasks({
    projectId,
    taskCenterOpen,
    selectedModelId,
    stepOutlineLoading,
    stepProseLoading,
    stepRepairLoading,
    proseProgress,
    proseBatchStatus,
    planning,
    planProgress,
    executingAgents,
    generatingProse,
    streamingProgress,
    streamingPercent,
    activeChapter,
    onCancelProseBatch: cancelStepGenerateProse,
  })

  useEffect(() => {
    if (!projectId || workspaceArea !== 'storyPlanning') return
    void loadProductionTasks()
  }, [projectId, workspaceArea, loadProductionTasks])

  const planningWorkspaceModel = useMemo(() => buildPlanningWorkspaceModel({
    selectedProject,
    outlines,
    chapters: sortedChapters,
    activeChapter,
    materialScore: activeChapterDiagnosticsData?.material_score,
    commercialReadiness,
    reviews,
    settingEntities: projectSettings,
    productionTasks,
  }), [selectedProject, outlines, sortedChapters, activeChapter, activeChapterDiagnosticsData?.material_score, commercialReadiness, reviews, projectSettings, productionTasks])

  const writingCockpitModel = useMemo(() => buildWritingCockpitModel({
    project: selectedProject,
    chapters: sortedChapters,
    outlines,
    activeChapter,
    contextPackage: activeContextPackageData,
    diagnostics: activeChapterDiagnosticsData,
    materialScore: activeChapterDiagnosticsData?.material_score || null,
    commercialReadiness,
    activeRuns: activeTasks,
    reviews,
    memorySummary: activeMemorySummary,
  }), [
    selectedProject,
    sortedChapters,
    outlines,
    activeChapter,
    activeContextPackageData,
    activeChapterDiagnosticsData,
    commercialReadiness,
    activeTasks,
    reviews,
    activeMemorySummary,
  ])

  const autoCreationDirectorModel = useMemo(() => buildAutoCreationDirectorModel({
    planning: planningWorkspaceModel,
    writing: writingCockpitModel,
    activeTasks,
    selectedModelId,
    reviews,
    runRecords,
    chapters: sortedChapters,
    storyState: selectedProject?.reference_config?.story_state || {},
    styleSampleEffectiveness,
  }), [planningWorkspaceModel, writingCockpitModel, activeTasks, selectedModelId, reviews, runRecords, sortedChapters, selectedProject?.reference_config?.story_state, styleSampleEffectiveness])
  const serialPipelineModel = useMemo(() => buildSerialPipelineViewModel(pipeline), [pipeline])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    apiClient.get(`/novel/projects/${projectId}/writing-bible/style-sample-effectiveness`)
      .then(res => {
        if (!cancelled) {
          setStyleSampleEffectiveness(res.data?.style_sample_effectiveness || res.data?.report || null)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [projectId, selectedProject?.updated_at, reviews.length, sortedChapters.length])

  const recentFatigueRollingPlanIntent = useMemo(() => {
    const fatigue = planningWorkspaceModel.recentFatigueRadar
    const fatigueWarnings = Array.isArray(fatigue?.signals)
      ? fatigue.signals.filter((signal: any) => String(signal?.status || '') === 'warn')
      : []
    if (fatigue?.status !== 'needs_attention' && fatigueWarnings.length === 0) return null
    return {
      source: 'recent_fatigue_repair',
      recent_fatigue_radar: fatigue,
    }
  }, [planningWorkspaceModel.recentFatigueRadar])

  const autoDirectorBusy = Boolean(
    stepProseLoading
    || generatingProse
    || generatingSceneCards
    || diagnosticsLoading
    || contextPackageLoading
    || editorReportLoading
    || proseQualityLoading
    || commercialToolLoading,
  )

  useEffect(() => {
    if (!autoDirectorBusy) setAutoDirectorActionLoadingKey('')
  }, [autoDirectorBusy])

  const findReviewById = (reviewId: any) => (
    reviews.find((review: any) => String(review.id) === String(reviewId)) || null
  )

  const latestCockpitEditorReport = () => {
    const reviewId = writingCockpitModel.chapterAcceptanceDesk.latestEditorReportId
    return reviewId ? findReviewById(reviewId) : null
  }

  useEffect(() => {
    const loadDiagnostics = async () => {
      const chapterId = Number(activeChapter?.id || 0)
      const updatedAt = activeChapter?.updated_at || null
      if (!chapterId || !projectId) {
        diagnosticsRequestRef.current += 1
        setActiveChapterDiagnostics(null)
        return
      }
      const requestId = ++diagnosticsRequestRef.current
      try {
        const res = await apiClient.get(`/novel/chapters/${chapterId}/generation-diagnostics`, { params: { project_id: projectId } })
        if (diagnosticsRequestRef.current !== requestId) return
        setActiveChapterDiagnostics({ chapterId, updatedAt, data: res.data || null })
      } catch {
        if (diagnosticsRequestRef.current === requestId) setActiveChapterDiagnostics(null)
      }
    }
    void loadDiagnostics()
  }, [activeChapter?.id, activeChapter?.updated_at, projectId])

  const loadActiveChapterContextPackage = useCallback(async (options: { silent?: boolean; chapterId?: number; updatedAt?: any } = {}) => {
    const chapterId = Number(options.chapterId || activeChapter?.id || 0)
    const updatedAt = options.updatedAt !== undefined
      ? options.updatedAt
      : (chapterId === Number(activeChapter?.id || 0) ? activeChapter?.updated_at || null : null)
    if (!chapterId || !projectId) {
      contextPackageRequestRef.current += 1
      setActiveChapterContextPackage(null)
      setContextPackageLoading(false)
      return null
    }
    const requestId = ++contextPackageRequestRef.current
    setContextPackageLoading(true)
    setActiveChapterContextPackage(prev => (
      prev?.chapterId === chapterId && prev?.updatedAt === updatedAt ? prev : null
    ))
    try {
      const res = await apiClient.get(`/novel/chapters/${chapterId}/context-package`, {
        params: { project_id: projectId },
      })
      if (contextPackageRequestRef.current !== requestId) return null
      setActiveChapterContextPackage({ chapterId, updatedAt, data: res.data || null })
      if (!options.silent) message.success('上下文包已刷新')
      return res.data || null
    } catch (error: any) {
      if (contextPackageRequestRef.current !== requestId) return null
      setActiveChapterContextPackage(null)
      if (!options.silent) message.error(error?.response?.data?.error || error?.message || '上下文包加载失败')
      return null
    } finally {
      if (contextPackageRequestRef.current === requestId) setContextPackageLoading(false)
    }
  }, [activeChapter?.id, activeChapter?.updated_at, projectId])

  useEffect(() => {
    const chapterId = Number(activeChapter?.id || 0)
    if (!chapterId) {
      void loadActiveChapterContextPackage({ silent: true, chapterId: 0 })
      return
    }
    void loadActiveChapterContextPackage({ silent: true, chapterId, updatedAt: activeChapter?.updated_at || null })
  }, [activeChapter?.id, activeChapter?.updated_at, projectId, loadActiveChapterContextPackage])

  useEffect(() => {
    let canceled = false
    const loadCommercialReadiness = async () => {
      if (!projectId || !selectedProject) {
        setCommercialReadiness(null)
        return
      }
      try {
        const res = await apiClient.get(`/novel/projects/${projectId}/commercial-readiness`)
        if (!canceled) setCommercialReadiness(res.data?.readiness || null)
      } catch {
        if (!canceled) setCommercialReadiness(null)
      }
    }
    void loadCommercialReadiness()
    return () => { canceled = true }
  }, [projectId, selectedProject?.updated_at, chapters.length, outlines.length, characters.length, runRecords.length, reviews.length])

  // ── diff toggle ──
  const [showOnlyDiff, setShowOnlyDiff] = useState(true)

  /* ── selected chapters (resolved to objects) ────────────────────── */
  const selectedChaptersList = useMemo(() =>
    chapters.filter(ch => selectedChapterIds.has(ch.id)),
    [chapters, selectedChapterIds],
  )

  const {
    chapterVersions,
    chapterVersionsLoading,
    chapterVersionDetail,
    rollingBackVersionId,
    setChapterVersionDetail,
    rollbackChapterVersion,
  } = useChapterVersions({
    activeChapter,
    flushPendingSave,
    reloadProject: loadProjectModules,
  })

  const mergeChapterVersion = async (version: any, choices: Array<{ index: number; source: 'current' | 'version' }>) => {
    if (!activeChapter) return
    if (!await flushPendingSave()) return
    try {
      const res = await apiClient.post(`/novel/chapters/${activeChapter.id}/version-merge`, {
        project_id: projectId,
        version_id: version.id,
        choices,
      })
      if (res.data?.chapter) setChapters(prev => prev.map(ch => ch.id === res.data.chapter.id ? res.data.chapter : ch))
      await loadProjectModules()
      setChapterVersionDetail(null)
      message.success('合并稿已生成')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '版本合并失败')
    }
  }

  const acceptChapterVersion = async (version: any) => {
    await rollbackChapterVersion(version.id)
    setChapterVersionDetail(null)
  }

  const { confirmReferenceReady } = useReferenceWorkflow({
    projectId,
    referenceSummary,
    onNeedConfig: () => setReferenceConfigOpen(true),
  })

  /* ── 大纲生成 ──────────────────────────────────────────────────── */
  const handleOutlineGenerate = async (opts: { chapterCount: number; continueMode: boolean; continueFrom: number; userOutline: string }) => {
    if (!selectedModelId) return message.warning('请先在顶部选择模型')
    if (!await confirmReferenceReady('大纲生成')) return
    setStepOutlineLoading(true)
    setOutlinePanelOpen(false)
    try {
      const agents = ['market-agent', 'world-agent', 'character-agent', 'outline-agent', 'detail-outline-agent', 'continuity-check-agent']
      const payload: Record<string, any> = {
        chapterCount: opts.continueMode ? undefined : opts.chapterCount,
        continueFrom: opts.continueMode ? opts.continueFrom : undefined,
        userOutline: opts.userOutline && opts.userOutline.trim() ? opts.userOutline.trim() : undefined,
      }
      const cleanPayload: Record<string, any> = {}
      for (const [k, v] of Object.entries(payload)) {
        if (v !== undefined) cleanPayload[k] = v
      }
      const res = await apiClient.post('/novel/agents/execute', {
        project_id: projectId, model_id: selectedModelId, agents,
        prompt: opts.userOutline && opts.userOutline.trim()
          ? '请基于用户提供的大纲，扩展生成完整的故事大纲和细纲。'
          : opts.continueMode
            ? `请从第 ${opts.continueFrom} 章之后继续生成大纲和细纲。`
            : '请生成世界观、角色、粗纲、细纲，并进行连续性预检。',
        payload: cleanPayload,
      })
      const execution = res.data || null
      setAgentExecution(execution)

      const summary = summarizeOutlineExecution(execution, opts.continueMode ? undefined : opts.chapterCount)
      if (summary.failedSteps.length > 0) {
        const firstError = summary.outlineError || summary.detailError || summary.continuityError || summary.failedSteps[0]?.error || '生成失败'
        throw new Error(firstError)
      }
      if (!opts.continueMode && summary.requestedChapterCount > 0 && summary.actualCount > 0 && summary.actualCount !== summary.requestedChapterCount) {
        throw new Error(`细纲章数不符合预期：目标 ${summary.requestedChapterCount} 章，实际返回 ${summary.actualCount} 章`)
      }

      await loadProjectModules()
      message.success(`大纲 + 细纲 + 连续性预检 完成${summary.actualCount > 0 ? `（实际生成 ${summary.actualCount} 章）` : ''}`)
    } catch (e: any) {
      const errorCode = e?.response?.data?.error_code
      const backendMessage = e?.response?.data?.message
      const details = e?.response?.data?.details
      const mappedDetail = errorCode === 'OUTLINE_THEME_MISMATCH'
        ? '生成内容与当前项目主题不一致，系统已自动拦截。'
        : errorCode === 'OUTLINE_COUNT_MISMATCH'
          ? '生成的粗纲章节数与目标章数不一致。'
          : errorCode === 'DETAIL_OUTLINE_MISSING_INPUT'
            ? '粗纲未成功生成，因此无法继续展开细纲。'
            : errorCode === 'CONTINUITY_CHECK_FAILED'
              ? '连续性预检未通过。'
              : backendMessage
      const detail = mappedDetail || e?.response?.data?.detail || e?.response?.data?.error || e?.message || '大纲生成失败'
      message.error(detail)
      Modal.warning({
        title: '大纲生成未通过校验',
        content: details?.raw_error ? `${detail}\n\n原始原因：${details.raw_error}` : detail,
        width: 640,
      })
    } finally {
      setStepOutlineLoading(false)
    }
  }

  /* ── 正文生成 ──────────────────────────────────────────────────── */
  const stepGenerateProse = async (options?: { limit?: number; source?: string; longformCompass?: any; longformBattleContext?: any; chapterLaunchGate?: any; nextBatchBrief?: any; batchPreflight?: any; millionWordRunway?: any; allowedChapterNos?: number[] }) => {
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await flushPendingSave()) return
    const allowedChapterNoSet = new Set((options?.allowedChapterNos || []).map(chapterNo => Number(chapterNo)).filter(Boolean))
    const allUnwrittenChapters = sortedChapters.filter(ch => !ch.chapter_text || ch.chapter_text.includes('【占位正文】'))
    const allUnwritten = allowedChapterNoSet.size > 0
      ? allUnwrittenChapters.filter(ch => allowedChapterNoSet.has(Number(ch.chapter_no || 0)))
      : allUnwrittenChapters
    const safetyLimit = Math.max(0, Number(options?.limit || 0))
    const unWritten = safetyLimit > 0 ? allUnwritten.slice(0, safetyLimit) : allUnwritten
    if (allUnwrittenChapters.length === 0) return message.warning('所有章节已有正文，无需生成')
    if (allUnwritten.length === 0) return message.warning('当前护栏放行的章节没有可生成正文')
    if (unWritten.length === 0) return message.warning('当前安全批次没有可生成章节')
    if (!await confirmReferenceReady('正文创作')) return
    setStepProseLoading(true)
    proseBatchCancelRef.current = false
    setProseBatchStatus({ success: 0, failed: 0, currentTitle: '', lastError: '', lastQuality: '' })
    let success = 0
    let failed = 0
    const errors: string[] = []
    const batchStartedAt = Date.now()
    const batchChapters: any[] = []
    try {
      for (let index = 0; index < unWritten.length; index += 1) {
        if (proseBatchCancelRef.current) break
        const ch = unWritten[index]
        const currentTitle = `第 ${ch.chapter_no} 章《${displayValue(ch.title)}》`
        setProseProgress({ current: index + 1, total: unWritten.length })
        setProseBatchStatus({ success, failed, currentTitle, lastError: '', lastQuality: '' })
        try {
          const resp = await fetch(`${apiClient.defaults.baseURL}/novel/chapters/${ch.id}/generate-prose`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: projectId,
              model_id: selectedModelId,
              ...chapterWordTargetPayload(),
              longform_compass: options?.longformCompass,
              longform_battle_context: options?.longformBattleContext,
              chapter_launch_gate: options?.chapterLaunchGate,
              next_batch_brief: options?.nextBatchBrief,
              batch_preflight: options?.batchPreflight,
              million_word_runway: options?.millionWordRunway,
              prompt: `请生成第 ${ch.chapter_no} 章《${displayValue(ch.title)}》完整正文`,
            }),
          })
          const raw = await resp.text()
          let data: any = null
          try { data = raw ? JSON.parse(raw) : null } catch { data = null }
          if (!resp.ok) {
            if (data?.error_code === 'PROSE_PREFLIGHT_BLOCKED' || data?.error_code === 'REFERENCE_SAFETY_BLOCKED') {
              showGenerationBlockedModal(data, undefined, { targetChapterId: ch.id })
            }
            throw new Error(data?.error || data?.detail || raw || `HTTP ${resp.status}`)
          }
          success += 1
          const score = data?.self_check?.review?.score
          const revised = data?.self_check?.revised
          batchChapters.push({
            id: ch.id,
            chapter_no: ch.chapter_no,
            title: displayValue(ch.title),
            status: 'success',
            score,
            revised: Boolean(revised),
            word_count: data?.chapter?.chapter_text ? String(data.chapter.chapter_text).replace(/\s/g, '').length : undefined,
          })
          if (Array.isArray(data?.pipeline)) setGenerationPipeline(data.pipeline)
          setProseBatchStatus({
            success,
            failed,
            currentTitle,
            lastError: '',
            lastQuality: score !== undefined ? `最近质检：${score} 分${revised ? '，已修订' : ''}` : '',
          })
        } catch (error: any) {
          failed += 1
          const messageText = `${currentTitle}：${error?.message || '生成失败'}`
          errors.push(messageText)
          batchChapters.push({
            id: ch.id,
            chapter_no: ch.chapter_no,
            title: displayValue(ch.title),
            status: 'failed',
            error: error?.message || '生成失败',
          })
          setProseBatchStatus({ success, failed, currentTitle, lastError: messageText, lastQuality: '' })
        }
        if (proseBatchCancelRef.current) break
      }
      const canceled = proseBatchCancelRef.current
      const skipped = Math.max(0, unWritten.length - success - failed)
      try {
        await apiClient.post('/novel/runs', {
          project_id: projectId,
          run_type: 'batch_generate_prose',
          step_name: 'summary',
          status: canceled ? 'canceled' : failed > 0 ? 'warn' : 'success',
          input_ref: {
            model_id: selectedModelId,
            chapter_ids: unWritten.map(ch => ch.id),
            total: unWritten.length,
            source: options?.source || 'manual_batch',
            longform_compass: options?.longformCompass,
            longform_battle_context: options?.longformBattleContext,
            chapter_launch_gate: options?.chapterLaunchGate,
            next_batch_brief: options?.nextBatchBrief,
            batch_preflight: options?.batchPreflight,
            million_word_runway: options?.millionWordRunway,
            allowed_chapter_nos: Array.from(allowedChapterNoSet),
            safety_limit: safetyLimit || null,
            available_total: allUnwritten.length,
          },
          output_ref: {
            total: unWritten.length,
            success,
            failed,
            skipped,
            canceled,
            chapters: batchChapters,
            errors,
          },
          duration_ms: Date.now() - batchStartedAt,
          error_message: errors.slice(0, 5).join('\n'),
        })
      } catch {
        // 汇总记录写入失败不影响已经生成的章节正文。
      }
      await loadProjectModules()
      if (success > 0) {
        setRightPanelOpen(true)
        setRightPanelTab('proseQuality')
      }
      if (canceled) {
        message.warning(`已停止批量生成：成功 ${success} 章，失败 ${failed} 章，未处理 ${skipped} 章`)
      } else if (failed > 0) {
        message.warning(`正文批量生成完成：成功 ${success} 章，失败 ${failed} 章`)
        Modal.warning({
          title: '部分章节生成失败',
          width: 680,
          content: (
            <div style={{ whiteSpace: 'pre-wrap', maxHeight: 320, overflow: 'auto' }}>
              {errors.slice(0, 20).join('\n')}
              {errors.length > 20 ? `\n... 另有 ${errors.length - 20} 条失败` : ''}
            </div>
          ),
        })
      } else {
        message.success(safetyLimit > 0
          ? `安全连写完成 (${success}/${unWritten.length})`
          : `正文生成完成 (${success}/${unWritten.length})`)
      }
    } catch (e: any) { message.error(e.message || '正文生成失败') }
    finally {
      setStepProseLoading(false)
      setProseProgress({ current: 0, total: 0 })
      proseBatchCancelRef.current = false
    }
  }

  const stepRunRepair = async () => {
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await flushPendingSave()) return
    setStepRepairLoading(true)
    try {
      const res = await apiClient.post('/novel/agents/repair', {
        project_id: projectId, model_id: selectedModelId, payload: {},
      })
      await loadProjectModules()
      message.success(`连续性修复完成，发现 ${res.data?.issues_found || 0} 个问题`)
    } catch (e: any) { message.error(e.response?.data?.detail || '修复失败') }
    finally { setStepRepairLoading(false) }
  }

  /* ── Plan (AI 一键初始化) ──────────────────────────────────────── */
  const runPlan = async () => {
    if (!await flushPendingSave()) return
    if (!await confirmReferenceReady('全案规划')) return
    setPlanning(true)
    setPlanProgress(null)
    try {
      const response = await fetch(`${apiClient.defaults.baseURL}/novel/plan?stream=1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          project_id: projectId, model_id: selectedModelId,
          prompt: '请规划小说的基础三项：世界观、角色、大纲。请先产出这三项的核心内容与结构，不要直接进入正文。',
          payload: { scope: 'foundation', items: ['worldbuilding', 'characters', 'outlines'] },
        }),
      })
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalData: any = null
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'progress') setPlanProgress(data)
            else if (data.type === 'done') finalData = data.data
            else if (data.type === 'error') throw new Error(data.error)
          } catch { /* skip */ }
        }
      }
      if (buffer.startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.slice(6))
          if (data.type === 'done') finalData = data.data
          else if (data.type === 'progress') setPlanProgress(data)
          else if (data.type === 'error') throw new Error(data.error)
        } catch { /* skip */ }
      }
      await loadProjectModules()
      message.success('规划已完成')
    } catch (err: any) { message.error(err.message || '规划失败') }
    finally { setPlanning(false); setPlanProgress(null) }
  }

  const executeAgents = async () => {
    if (!await flushPendingSave()) return
    setExecutingAgents(true)
    try {
      const res = await apiClient.post('/novel/agents/execute', {
        project_id: projectId, model_id: selectedModelId,
        prompt: '执行小说Agent链', payload: {},
      })
      setAgentExecution(res.data || null)
      await loadProjectModules()
      message.success('生成流程已完成')
    } catch (error: any) {
      message.error(error.response?.data?.detail || error.response?.data?.error || '执行失败')
    } finally { setExecutingAgents(false) }
  }

  const generateSceneCardsForChapter = async (chapterId: number, allowIncomplete = false) => {
    if (!selectedModelId) return message.warning('请先选择写作模型')
    if (!await flushPendingSave()) return
    setGeneratingSceneCards(true)
    try {
      const res = await apiClient.post(`/novel/chapters/${chapterId}/scene-cards`, {
        project_id: projectId,
        model_id: selectedModelId,
        allow_incomplete: allowIncomplete,
      })
      if (res.data?.chapter) {
        setChapters(prev => prev.map(c => c.id === res.data.chapter.id ? res.data.chapter : c))
      }
      await loadProjectModules()
      message.success(`场景卡已生成：${Array.isArray(res.data?.scene_cards) ? res.data.scene_cards.length : 0} 个`)
    } catch (error: any) {
      const payload = error?.response?.data
      if (payload?.error_code === 'SCENE_PREFLIGHT_BLOCKED') {
        showGenerationBlockedModal(payload, () => { void generateSceneCardsForChapter(chapterId, true) }, {
          targetChapterId: chapterId,
          onRepairComplete: () => { void generateSceneCardsForChapter(chapterId, false) },
        })
      } else {
        message.error(payload?.error || error?.message || '场景卡生成失败')
      }
    } finally {
      setGeneratingSceneCards(false)
    }
  }

  const generateSceneCardsForActiveChapter = async (allowIncomplete = false) => {
    if (!activeChapter) return message.warning('请先选择章节')
    await generateSceneCardsForChapter(Number(activeChapter.id), allowIncomplete)
  }

  const buildPreDraftBriefForActiveChapter = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!await flushPendingSave()) return
    setCommercialToolLoading('preDraftBrief')
    try {
      const res = await apiClient.get(`/novel/chapters/${activeChapter.id}/pre-draft-brief`, {
        params: { project_id: projectId },
      })
      const brief = res.data?.brief || {}
      const saveRes = await apiClient.put(`/novel/chapters/${activeChapter.id}/pre-draft-brief`, {
        project_id: projectId,
        brief,
      })
      if (saveRes.data?.chapter) {
        setChapters(prev => prev.map(c => c.id === saveRes.data.chapter.id ? saveRes.data.chapter : c))
      }
      await loadProjectModules()
      message.success('章节开写任务书已生成')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '任务书生成失败')
    } finally {
      setCommercialToolLoading('')
    }
  }

  const confirmPreDraftBriefForActiveChapter = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!await flushPendingSave()) return
    setCommercialToolLoading('preDraftBriefConfirm')
    try {
      const res = await apiClient.post(`/novel/chapters/${activeChapter.id}/pre-draft-brief/confirm`, {
        project_id: projectId,
        brief: activeChapter.raw_payload?.pre_draft_brief || activeChapter.raw_payload?.preDraftBrief,
      })
      if (res.data?.chapter) {
        setChapters(prev => prev.map(c => c.id === res.data.chapter.id ? res.data.chapter : c))
      }
      await loadProjectModules()
      message.success('章节开写任务书已确认')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '任务书确认失败')
    } finally {
      setCommercialToolLoading('')
    }
  }

  const savePreDraftBriefForActiveChapter = async (brief: any) => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!await flushPendingSave()) return
    setCommercialToolLoading('preDraftBrief')
    try {
      const res = await apiClient.put(`/novel/chapters/${activeChapter.id}/pre-draft-brief`, {
        project_id: projectId,
        brief,
      })
      if (res.data?.chapter) {
        setChapters(prev => prev.map(c => c.id === res.data.chapter.id ? res.data.chapter : c))
      }
      await loadProjectModules()
      message.success('章节开写任务书已保存')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '任务书保存失败')
    } finally {
      setCommercialToolLoading('')
    }
  }

  const applyStyleSampleActionForChapter = async (targetChapter: any, action: 'lock' | 'replace' | 'disable', successMessage = '') => {
    if (!targetChapter?.id) {
      message.warning('请先选择章节')
      return false
    }
    if (Number(activeChapter?.id || 0) === Number(targetChapter.id)) {
      if (!await flushPendingSave()) return false
    } else if (!await selectChapterForWriting(Number(targetChapter.id))) {
      return false
    }
    const loadingKey = action === 'lock' ? 'styleSampleLock' : action === 'replace' ? 'styleSampleReplace' : 'styleSampleDisable'
    setCommercialToolLoading(loadingKey)
    try {
      const res = await apiClient.post(`/novel/chapters/${targetChapter.id}/pre-draft-brief/style-samples`, {
        project_id: projectId,
        action,
      })
      if (res.data?.chapter) {
        setChapters(prev => prev.map(c => c.id === res.data.chapter.id ? res.data.chapter : c))
      }
      await loadProjectModules()
      if (successMessage) message.success(successMessage)
      else if (action === 'lock') message.success('本章风格样章已锁定')
      else if (action === 'replace') message.success('已换一组风格样章，请重新确认任务书')
      else if (action === 'disable') message.success('本章已不用风格样章，请重新确认任务书')
      return true
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '风格样章操作失败')
      return false
    } finally {
      setCommercialToolLoading('')
    }
  }

  const applyStyleSampleActionForActiveChapter = async (action: 'lock' | 'replace' | 'disable') => {
    return applyStyleSampleActionForChapter(activeChapter, action)
  }

  const openGenerationDiagnostics = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!await flushPendingSave()) return
    setDiagnosticsLoading(true)
    try {
      const res = await apiClient.get(`/novel/chapters/${activeChapter.id}/generation-diagnostics`, {
        params: { project_id: projectId },
      })
      showDiagnosticsModal(res.data || {})
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '生成前诊断失败')
    } finally {
      setDiagnosticsLoading(false)
    }
  }

  const openChapterQualityCardForChapter = async (chapterId: number) => {
    try {
      const res = await apiClient.get(`/novel/chapters/${chapterId}/quality-card`, { params: { project_id: projectId } })
      const card = res.data?.quality_card || {}
      Modal.info({
        title: '章节交稿质检',
        width: 900,
        content: (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Card size="small">
              <Space align="center" size={16}>
                <Progress type="circle" size={76} percent={Number(card.overall_score || 0)} status={card.overall_score >= 80 ? 'success' : card.overall_score < 65 ? 'exception' : 'normal'} />
                <Space direction="vertical" size={4}>
                  <Text strong>第{card.chapter_no}章《{card.title || '未命名'}》</Text>
                  <Text type="secondary">{card.word_count || 0} 字 · {card.status || '-'}</Text>
                </Space>
              </Space>
            </Card>
            <Card size="small" title="质量维度">
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {(card.dimensions || []).map((item: any) => (
                  <div key={item.key} style={{ display: 'grid', gridTemplateColumns: '92px minmax(0, 1fr) 44px', gap: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12 }}>{item.label}</Text>
                    <Progress percent={Number(item.score || 0)} size="small" status={item.score >= 80 ? 'success' : item.score < 65 ? 'exception' : 'normal'} />
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.score}</Text>
                  </div>
                ))}
              </Space>
            </Card>
            {Array.isArray(card.must_fix) && card.must_fix.length > 0 && (
              <Card size="small" title="必须修复">
                <List size="small" dataSource={card.must_fix} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
            {Array.isArray(card.next_actions) && card.next_actions.length > 0 && (
              <Card size="small" title="下一步建议">
                <List size="small" dataSource={card.next_actions} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
          </Space>
        ),
      })
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '章节交稿质检加载失败')
    }
  }

  const openChapterQualityCard = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    await openChapterQualityCardForChapter(Number(activeChapter.id))
  }

  const openProductionDashboard = async () => {
    if (!selectedProject) return
    setDashboardLoading(true)
    try {
      const [dashboardRes, assetsRes, strategyRes, readinessRes, matrixRes, governanceRes] = await Promise.all([
        apiClient.get(`/novel/projects/${projectId}/production-dashboard`),
        apiClient.get(`/novel/projects/${projectId}/writing-assets`).catch(() => ({ data: null })),
        apiClient.get(`/novel/projects/${projectId}/model-strategy`, { params: { model_id: selectedModelId } }).catch(() => ({ data: null })),
        apiClient.get(`/novel/projects/${projectId}/commercial-readiness`).catch(() => ({ data: null })),
        apiClient.get(`/novel/projects/${projectId}/chapter-material-matrix`, { params: { limit: 120, unwritten_only: 0 } }).catch(() => ({ data: null })),
        apiClient.get(`/novel/projects/${projectId}/longform-governance-summary`).catch(() => ({ data: null })),
      ])
      const dashboard = dashboardRes.data?.dashboard || {}
      const assets = assetsRes.data?.assets || []
      const strategy = strategyRes.data?.strategy || {}
      const readiness = readinessRes.data?.readiness || null
      const materialMatrix = matrixRes.data || null
      const governance = governanceRes.data?.summary || null
      if (readiness) setCommercialReadiness(readiness)
      Modal.info({
        title: '生产看板',
        width: 900,
        content: (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color="blue" bordered={false}>章节 {dashboard.chapter_total || 0}</Tag>
              <Tag color="green" bordered={false}>已写 {dashboard.written_chapters || 0}</Tag>
              <Tag bordered={false}>字数 {Number(dashboard.word_count || 0).toLocaleString()}</Tag>
              <Tag color={dashboard.average_quality_score >= 78 ? 'green' : 'gold'} bordered={false}>均分 {dashboard.average_quality_score ?? '-'}</Tag>
              {readiness && <Tag color={readiness.can_batch_generate ? 'green' : 'gold'} bordered={false}>就绪 {readiness.score}%</Tag>}
              {dashboard.story_state_updated_to && <Tag color="purple" bordered={false}>状态至第{dashboard.story_state_updated_to}章</Tag>}
            </Space>
            {readiness && (
              <Card size="small" title="商业化就绪度">
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Progress percent={Number(readiness.score || 0)} size="small" status={readiness.can_batch_generate ? 'success' : 'normal'} />
                  {Array.isArray(readiness.next_actions) && readiness.next_actions.length > 0 && (
                    <Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 2, expandable: true }}>{readiness.next_actions.join('；')}</Paragraph>
                  )}
                </Space>
              </Card>
            )}
            {Array.isArray(dashboard.recommendations) && dashboard.recommendations.length > 0 && (
              <Card size="small" title="生产建议">
                <List size="small" dataSource={dashboard.recommendations} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
            {governance && (
              <Card size="small" title="长线治理闭环">
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Space wrap>
                    <Tag color={governance.latest_audit?.status === 'closed' ? 'green' : 'gold'} bordered={false}>{governance.latest_audit ? (governance.latest_audit.status === 'closed' ? '已闭环' : '需跟进') : '未审计'}</Tag>
                    <Tag bordered={false}>修复任务 {governance.latest_repair_run?.task_count || 0}</Tag>
                    <Tag bordered={false}>已确认 {governance.latest_repair_run?.resolved_count || 0}</Tag>
                    <Tag color={(governance.risk_summary?.needs_review_count || 0) ? 'gold' : 'default'} bordered={false}>需复查 {governance.risk_summary?.needs_review_count || 0}</Tag>
                    <Tag color={(governance.current_trends?.weak_count || 0) ? 'gold' : 'green'} bordered={false}>薄弱 {governance.current_trends?.weak_count || 0}</Tag>
                  </Space>
                  {(governance.latest_audit?.conclusion || governance.next_actions || []).slice(0, 3).map((item: string, index: number) => (
                    <Text key={`${item}-${index}`} type="secondary" style={{ fontSize: 12 }}>{item}</Text>
                  ))}
                </Space>
              </Card>
            )}
            {materialMatrix?.summary && (
              <Card size="small" title="章节材料矩阵">
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  <Space wrap>
                    <Tag color="blue" bordered={false}>扫描 {materialMatrix.summary.total || 0} 章</Tag>
                    <Tag color="green" bordered={false}>可生成 {materialMatrix.summary.ready || 0}</Tag>
                    <Tag color={(materialMatrix.summary.blocked || 0) > 0 ? 'red' : 'default'} bordered={false}>阻塞 {materialMatrix.summary.blocked || 0}</Tag>
                    <Tag color={(materialMatrix.summary.average_score || 0) >= 75 ? 'green' : 'gold'} bordered={false}>均分 {materialMatrix.summary.average_score || 0}</Tag>
                  </Space>
                  <List
                    size="small"
                    dataSource={(materialMatrix.weakest || []).slice(0, 8)}
                    renderItem={(row: any) => (
                      <List.Item
                        actions={[
                          <Button key="open" size="small" type="link" onClick={() => {
                            Modal.destroyAll()
                            void selectChapterForWriting(row.chapter_id)
                          }}>打开</Button>,
                        ]}
                      >
                        <List.Item.Meta
                          title={(
                            <Space wrap>
                              <Tag color={row.can_generate ? 'green' : Number(row.score || 0) >= 65 ? 'gold' : 'red'} bordered={false}>{row.score}%</Tag>
                              <Text>第{row.chapter_no}章《{row.title || '未命名'}》</Text>
                              {row.has_text && <Tag bordered={false}>已写</Tag>}
                            </Space>
                          )}
                          description={(row.recommendations || []).slice(0, 2).join('；') || '材料可用'}
                        />
                      </List.Item>
                    )}
                  />
                </Space>
              </Card>
            )}
            <Card size="small" title="写作资产库覆盖">
              <Space wrap>
                {assets.map((group: any) => (
                  <Tag key={group.category} color={Array.isArray(group.entries) && group.entries.length ? 'green' : 'default'} bordered={false}>
                    {group.category} {Array.isArray(group.entries) ? group.entries.length : 0}
                  </Tag>
                ))}
              </Space>
            </Card>
            <Card size="small" title="模型调度策略">
              <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }} ellipsis={{ rows: 8, expandable: true }}>
                {JSON.stringify(strategy, null, 2)}
              </Paragraph>
            </Card>
          </Space>
        ),
      })
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '生产看板加载失败')
    } finally {
      setDashboardLoading(false)
    }
  }

  const runOriginalIncubator = async () => {
    if (!selectedProject) return
    if (!selectedModelId) return message.warning('请先选择模型')
    Modal.confirm({
      title: '原创项目孵化',
      width: 640,
      content: '系统会先生成可预览的原创方案，包括世界观、角色、分卷、前 30 章章纲、写作圣经和商业定位。确认后才入库，已有相同章号的章节不会覆盖。',
      okText: '生成预览',
      onOk: async () => {
        setIncubatingOriginal(true)
        try {
          const res = await apiClient.post(`/novel/projects/${projectId}/incubate-original`, {
            model_id: selectedModelId,
            chapter_count: 30,
            variant_count: 3,
            auto_store: false,
          })
          const payload = res.data?.payload || {}
          const hasIncubatorContent = Boolean(
            (Array.isArray(payload.directions) && payload.directions.length > 0)
              || payload.selected_direction
              || payload.worldbuilding?.world_summary
              || (Array.isArray(payload.characters) && payload.characters.length > 0)
              || (Array.isArray(payload.outlines) && payload.outlines.length > 0)
              || (Array.isArray(payload.chapters) && payload.chapters.length > 0)
              || payload.commercial_positioning?.reader_promise
              || (Array.isArray(payload.commercial_positioning?.selling_points) && payload.commercial_positioning.selling_points.length > 0),
          )
          if (!hasIncubatorContent) {
            Modal.error({
              title: '原创孵化没有生成有效内容',
              width: 720,
              content: (
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  <Text>模型返回了空方案，系统已阻止入库。请重试、切换模型，或先补充项目简介/题材/目标读者。</Text>
                  {res.data?.raw_preview && (
                    <Card size="small" title="模型原始返回片段">
                      <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }} ellipsis={{ rows: 8, expandable: true }}>
                        {res.data.raw_preview}
                      </Paragraph>
                    </Card>
                  )}
                </Space>
              ),
            })
            return
          }
          const directions = Array.isArray(payload.directions) ? payload.directions : []
          const selectedDirection = payload.selected_direction || directions.slice().sort((a: any, b: any) => Number(b.score || 0) - Number(a.score || 0))[0] || null
          const isSelectedDirection = (direction: any) => selectedDirection && (
            direction === selectedDirection
            || (direction.direction_id && direction.direction_id === selectedDirection.direction_id)
            || (direction.title && direction.title === selectedDirection.title)
          )
          Modal.confirm({
            title: '确认原创孵化方案',
            width: 860,
            content: (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Alert type="info" showIcon message={directions.length > 1 ? '系统已生成多个原创方向并按商业可行性竞选；确认后会入库评分最高/模型推荐方案。' : '请先核对核心卖点、角色和前 30 章方向。确认后才会写入项目资料。'} />
                {directions.length > 0 && (
                  <Card size="small" title="候选方向">
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      {directions.map((direction: any, index: number) => (
                        <div key={direction.direction_id || direction.title || index} style={{ padding: 10, border: isSelectedDirection(direction) ? '1px solid #1677ff' : '1px solid #e5e7eb', borderRadius: 8 }}>
                          <Space wrap>
                            <Tag color={isSelectedDirection(direction) ? 'blue' : 'default'} bordered={false}>{isSelectedDirection(direction) ? '推荐' : `方案${index + 1}`}</Tag>
                            <Text strong>{direction.title || direction.core_hook || '未命名方向'}</Text>
                            {direction.score !== undefined && <Tag bordered={false}>评分 {direction.score}</Tag>}
                          </Space>
                          <Paragraph style={{ margin: '6px 0 0' }} ellipsis={{ rows: 2, expandable: true }}>
                            {direction.core_hook || direction.selection_reason || JSON.stringify(direction.commercial_positioning || {})}
                          </Paragraph>
                        </div>
                      ))}
                    </Space>
                  </Card>
                )}
                <Card size="small" title="商业定位">
                  <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }} ellipsis={{ rows: 5, expandable: true }}>
                    {JSON.stringify(payload.commercial_positioning || {}, null, 2)}
                  </Paragraph>
                </Card>
                <Card size="small" title="主要角色">
                  <Space wrap>
                    {(payload.characters || []).slice(0, 12).map((char: any) => <Tag key={char.name} bordered={false}>{char.name} · {char.role_type || char.role || '-'}</Tag>)}
                  </Space>
                </Card>
                <Card size="small" title="章节方向">
                  <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }} ellipsis={{ rows: 6, expandable: true }}>
                    {(payload.chapters || []).slice(0, 12).map((chapter: any) => `第${chapter.chapter_no}章 ${chapter.title}：${chapter.chapter_goal || chapter.chapter_summary || ''}`).join('\n')}
                  </Paragraph>
                </Card>
              </Space>
            ),
            okText: '确认入库',
            cancelText: '放弃',
            onOk: async () => {
              await apiClient.post(`/novel/projects/${projectId}/incubate-original/commit`, { payload, chapter_count: 30 })
              await loadProjectModules()
              setRightPanelOpen(true)
              setRightPanelTab('writingBible')
              message.success('原创孵化已入库')
            },
          })
        } catch (error: any) {
          const data = error?.response?.data || {}
          if (data.error_code === 'ORIGINAL_INCUBATION_EMPTY') {
            Modal.error({
              title: '原创孵化没有生成有效内容',
              width: 760,
              content: (
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  <Text>{data.error || '模型返回为空，请重试或切换模型。'}</Text>
                  <Text type="secondary">建议：补充项目简介、题材、目标读者，或换一个更稳定的模型后再试。</Text>
                  {data.raw_preview && (
                    <Card size="small" title="模型原始返回片段">
                      <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }} ellipsis={{ rows: 8, expandable: true }}>
                        {data.raw_preview}
                      </Paragraph>
                    </Card>
                  )}
                </Space>
              ),
            })
          } else {
            message.error(data.error || error?.message || '原创孵化失败')
          }
        } finally {
          setIncubatingOriginal(false)
        }
      },
    })
  }

  const startChapterGroupGeneration = async () => {
    if (!selectedProject) return
    if (!selectedModelId) return message.warning('请先选择模型')
    try {
      await apiClient.post(`/novel/projects/${projectId}/chapter-groups/start`, {
        model_id: selectedModelId,
        start_chapter: activeChapter?.chapter_no || undefined,
        count: 10,
        production_mode: productionMode,
        ...chapterWordTargetPayload(),
        require_scene_confirmation: productionMode !== 'scene_cards_only',
      })
      await loadProjectModules()
      setTaskCenterOpen(true)
      message.success('章节群任务已创建，可在任务中心查看并逐章推进')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '章节群任务创建失败')
    }
  }

  const startReadyChapterGroupGeneration = async () => {
    if (!selectedProject) return
    if (!selectedModelId) return message.warning('请先选择模型')
    setCommercialToolLoading('readyGroup')
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/chapter-groups/start-ready`, {
        model_id: selectedModelId,
        start_chapter: activeChapter?.chapter_no || undefined,
        scan_limit: 60,
        count: 10,
        min_score: 65,
        production_mode: productionMode,
        ...chapterWordTargetPayload(),
        require_scene_confirmation: productionMode !== 'scene_cards_only',
      })
      await loadProjectModules()
      await loadProductionTasks()
      setTaskCenterOpen(true)
      message.success(`已创建智能章节群：入队 ${res.data?.summary?.queued || 0} 章，跳过 ${res.data?.summary?.skipped || 0} 章`)
    } catch (error: any) {
      const payload = error?.response?.data
      if (payload?.error_code === 'NO_READY_CHAPTERS') {
        Modal.warning({
          title: '没有可入队章节',
          width: 760,
          content: (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Text>已扫描 {payload.scanned || 0} 章，但没有达到材料阈值 {payload.min_score || 65}% 的待生成章节。</Text>
              <List
                size="small"
                dataSource={(payload.skipped || []).slice(0, 8)}
                renderItem={(row: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`第${row.chapter_no}章《${row.title || '未命名'}》 · ${row.score}%`}
                      description={(row.recommendations || []).slice(0, 2).join('；') || '材料不足'}
                    />
                  </List.Item>
                )}
              />
            </Space>
          ),
        })
      } else {
        message.error(payload?.error || error?.message || '智能章节群创建失败')
      }
    } finally {
      setCommercialToolLoading('')
    }
  }

  const startFuture100ChapterGroupGeneration = async () => {
    if (!selectedProject) return
    if (!selectedModelId) return message.warning('请先选择模型')
    setCommercialToolLoading('future100Group')
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/chapter-groups/start-from-skeleton`, {
        model_id: selectedModelId,
        start_chapter: activeChapter?.chapter_no || undefined,
        scan_limit: 100,
        count: 10,
        min_score: 70,
        create_missing: true,
        sync_chapter_fields: true,
        production_mode: productionMode,
        ...chapterWordTargetPayload(),
        require_scene_confirmation: productionMode !== 'scene_cards_only',
      })
      await loadProjectModules()
      await loadProductionTasks()
      setTaskCenterOpen(true)
      message.success(`已从未来100章骨架入队：${res.data?.summary?.queued || 0} 章，创建 ${res.data?.summary?.created || 0} 章，更新 ${res.data?.summary?.updated || 0} 章`)
    } catch (error: any) {
      const payload = error?.response?.data
      if (payload?.error_code === 'NO_READY_SKELETON_CHAPTERS') {
        Modal.warning({
          title: '没有可从骨架入队的章节',
          width: 760,
          content: (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Text>已扫描 {payload.scanned || 0} 条骨架，但没有达到骨架阈值 {payload.min_score || 70}% 的待生成章节。</Text>
              <List
                size="small"
                dataSource={(payload.skipped || []).slice(0, 10)}
                renderItem={(row: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`第${row.chapter_no}章《${row.title || '未命名'}》 · 骨架分 ${row.skeleton_score || 0}`}
                      description={(row.blockers || []).join('；') || '暂不可入队'}
                    />
                  </List.Item>
                )}
              />
            </Space>
          ),
        })
      } else {
        message.error(payload?.error || error?.message || '从未来100章骨架入队失败')
      }
    } finally {
      setCommercialToolLoading('')
    }
  }

  const startUnattendedWritingGoal = async () => {
    if (!selectedProject) return
    if (!selectedModelId) return message.warning('请先选择模型')
    const startChapter = Number(activeChapter?.chapter_no || sortedChapters.find((chapter: any) => !chapter.chapter_text)?.chapter_no || 1)
    if (!Number(unattendedTargetChapter || 0) || Number(unattendedTargetChapter) < startChapter) {
      return message.warning(`目标章号需要不小于第${startChapter}章`)
    }
    setCommercialToolLoading('unattendedGoal')
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/chapter-groups/start-unattended`, {
        model_id: selectedModelId,
        start_chapter: startChapter,
        target_chapter: unattendedTargetChapter,
        create_missing: true,
        sync_chapter_fields: true,
        allow_incomplete: false,
        force_scene_cards: true,
        ...chapterWordTargetPayload(),
      })
      await apiClient.post(`/novel/projects/${projectId}/run-queue/start-worker`, {
        model_id: selectedModelId,
        max_runs: Math.max(1, Number(unattendedTargetChapter || 0) - startChapter + 2),
        max_chapters_per_run: 1,
        idle_wait_ms: 300000,
        idle_poll_ms: 1000,
        production_mode: 'full_auto',
        allow_incomplete: false,
        force_scene_cards: true,
        ...chapterWordTargetPayload(),
      })
      await loadProjectModules()
      await loadProductionTasks()
      setTaskCenterOpen(true)
      message.success(`无人值守已启动：目标第${res.data?.summary?.target_chapter || unattendedTargetChapter}章，入队 ${res.data?.summary?.queued || 0} 章`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '无人值守启动失败')
    } finally {
      setCommercialToolLoading('')
    }
  }

  const createEditorReport = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    await createEditorReportForChapter(activeChapter.id)
  }

  const createEditorReportForChapter = async (chapterId: number, options: EditorReportForChapterOptions = {}) => {
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await flushPendingSave()) return
    setEditorReportLoading(true)
    try {
      const res = await apiClient.post(`/novel/chapters/${chapterId}/editor-report`, {
        project_id: projectId,
        model_id: selectedModelId,
      })
      await loadProjectModules()
      setRightPanelOpen(true)
      setRightPanelTab('editorReports')
      if (options.autoRevision && res.data?.review) {
        const task = options.sourceTask || {}
        const revisionResult = await applyEditorRevision(res.data.review, {
          revisionMode: String(task.message || task.issue_type || '').includes('钩子') ? 'restore_hook' : 'tighten_pacing',
          prompt: buildRepairTaskRevisionPrompt(task, options.sourceRun),
          sourceTask: task,
          sourceRun: options.sourceRun,
          sourceTaskIndex: options.sourceTaskIndex,
          skipConfirm: options.skipRevisionConfirm,
        })
        return revisionResult
      } else {
        message.success('编辑报告已生成')
      }
      return res.data
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '编辑报告生成失败')
      return null
    } finally {
      setEditorReportLoading(false)
    }
  }

  const locateRepairTaskChapter = async (chapterId: number) => {
    if (await selectChapterForWriting(chapterId)) {
      setTaskCenterOpen(false)
      setRightPanelOpen(true)
      message.success('已定位到章节')
    }
  }

  const openRepairTaskChapterEditor = async (chapterId: number) => {
    if (!await selectChapterForWriting(chapterId)) return
    const chapter = chapters.find(ch => Number(ch.id) === Number(chapterId))
    if (chapter) {
      setTaskCenterOpen(false)
      openEditor('chapter', chapter)
    }
  }

  const startRepairTaskRevision = async (task: any, run?: any, taskIndex = -1, options: TaskCenterActionOptions = {}) => {
    const chapterId = Number(task?.chapter_id || 0)
    if (!chapterId) return message.warning('这个任务没有绑定章节')
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await selectChapterForWriting(chapterId)) return
    if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
    await createEditorReportForChapter(chapterId, { sourceTask: task, sourceRun: run, sourceTaskIndex: taskIndex, autoRevision: true })
  }

  const updateRepairTaskStatus = async (run: any, taskIndex: number, status: string, note = '') => {
    try {
      await apiClient.post(`/novel/runs/${run.id}/tasks/${taskIndex}/status`, {
        project_id: projectId,
        status,
        note,
      })
      await loadProjectModules()
      await loadProductionTasks()
      message.success(status === 'resolved' ? '任务已标记为已处理' : status === 'needs_review' ? '任务已标记为需复查' : '任务状态已更新')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '任务状态更新失败')
    }
  }

  const bulkUpdateRepairTaskStatus = async (items: any[], status: string) => {
    try {
      const grouped = new Map<number, { run: any; indices: number[] }>()
      for (const item of items || []) {
        const runId = Number(item?.run?.id || 0)
        if (!runId || !Number.isInteger(Number(item?.taskIndex))) continue
        const existing = grouped.get(runId) || { run: item.run, indices: [] }
        existing.indices.push(Number(item.taskIndex))
        grouped.set(runId, existing)
      }
      for (const group of grouped.values()) {
        await apiClient.post(`/novel/runs/${group.run.id}/tasks/status-bulk`, {
          project_id: projectId,
          task_indices: group.indices,
          status,
          note: status === 'resolved' ? '批量复查确认通过' : '批量状态更新',
        })
      }
      await loadProjectModules()
      await loadProductionTasks()
      message.success(status === 'resolved' ? `已确认通过 ${items.length} 个复查任务` : `已更新 ${items.length} 个任务`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '批量更新任务状态失败')
    }
  }

  const recheckStyleSampleTaskBookReviewTasks = async (items: any[]) => {
    const preflight = autoCreationDirectorModel.batchGuardrail.preflight.inputSnapshot?.style_sample_batch_preflight
    const plan = buildStyleSampleTaskBookRecheckPlan({
      items,
      styleSampleBatchPreflight: preflight,
    })
    if (plan.status === 'needs_preflight') {
      message.warning(plan.summary)
      return
    }
    if (!plan.resolvedItems.length) {
      message.warning(plan.summary)
      return
    }
    try {
      const grouped = new Map<number, { run: any; indices: number[] }>()
      for (const item of plan.resolvedItems) {
        const runId = Number(item?.run?.id || 0)
        if (!runId || !Number.isInteger(Number(item?.taskIndex))) continue
        const existing = grouped.get(runId) || { run: item.run, indices: [] }
        existing.indices.push(Number(item.taskIndex))
        grouped.set(runId, existing)
      }
      for (const group of grouped.values()) {
        await apiClient.post(`/novel/runs/${group.run.id}/tasks/status-bulk`, {
          project_id: projectId,
          task_indices: group.indices,
          status: 'resolved',
          note: '样章任务书复检通过：下一批任务书已避开风险样章',
        })
      }
      await loadProjectModules()
      await loadProductionTasks()
      if (plan.blockedItems.length > 0) {
        message.warning(plan.summary)
      } else {
        message.success(plan.summary)
      }
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '样章任务书复检失败')
    }
  }

  const generateLongformRepairAuditSummary = async (run: any, options: TaskCenterActionOptions = {}) => {
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/longform-production-trends/repair-runs/${run.id}/audit-summary`)
      const audit = res.data?.audit || {}
      await loadProjectModules()
      await loadProductionTasks()
      if (options.keepTaskCenterOpen) {
        message.success('恢复依据复盘已刷新')
        return
      }
      Modal.info({
        title: '长线生产修复闭环审计',
        width: 760,
        content: (
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={audit.status === 'closed' ? 'green' : 'gold'} bordered={false}>{audit.status === 'closed' ? '已闭环' : '需跟进'}</Tag>
              <Tag bordered={false}>已确认 {audit.task_summary?.resolved || 0}/{audit.task_summary?.total || 0}</Tag>
              <Tag bordered={false}>触达章节 {audit.task_summary?.touched_chapter_count || 0}</Tag>
            </Space>
            {(audit.conclusion || []).map((item: string, index: number) => <Text key={`${item}-${index}`}>{item}</Text>)}
            <Card size="small" title="指标变化">
              <Space wrap>
                {Object.entries(audit.metric_deltas || {}).map(([key, value]: [string, any]) => (
                  <Tag key={key} bordered={false}>{key} {value.before ?? '-'} {'->'} {value.after ?? '-'}{value.delta === null || value.delta === undefined ? '' : ` (${value.delta >= 0 ? '+' : ''}${value.delta})`}</Tag>
                ))}
              </Space>
            </Card>
            {(audit.remaining_risks?.unresolved_tasks || []).length > 0 && (
              <Card size="small" title="未关闭任务">
                <List size="small" dataSource={(audit.remaining_risks.unresolved_tasks || []).slice(0, 10)} renderItem={(item: any) => <List.Item>{item.chapter_no ? `第${item.chapter_no}章 ` : ''}{item.message || item.title}</List.Item>} />
              </Card>
            )}
          </Space>
        ),
      })
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '生成闭环审计失败')
    }
  }

  const executeStyleSampleTaskBookRebuild = async (task: any, run?: any, taskIndex = -1, options: TaskCenterActionOptions = {}) => {
    const chapterId = Number(task?.chapter_id || 0)
    const chapterNo = Number(task?.chapter_no || task?.chapterNo || 0)
    const targetChapter = (chapterId ? sortedChapters.find(item => Number(item.id) === chapterId) : null)
      || (chapterNo ? sortedChapters.find(item => Number(item.chapter_no || 0) === chapterNo) : null)
      || null
    if (!targetChapter?.id) {
      message.warning('这个样章任务没有匹配章节')
      return
    }
    if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
    const changed = await applyStyleSampleActionForChapter(targetChapter, 'replace', '已换样章并重审任务书，请重新确认任务书')
    if (changed && run?.id && taskIndex >= 0) {
      await updateRepairTaskStatus(run, taskIndex, 'needs_review', '已换样章并清除任务书确认状态，等待作者重审任务书')
    }
  }

  const resolveRepairQueueTaskChapterId = (task: any) => {
    const chapterId = Number(task?.chapter_id || task?.chapterId || 0)
    if (chapterId) return chapterId
    const chapterNo = Number(task?.chapter_no || task?.chapterNo || 0)
    if (!chapterNo) return 0
    const chapter = sortedChapters.find(item => Number(item.chapter_no ?? item.chapterNo ?? 0) === chapterNo)
    return Number(chapter?.id || 0)
  }

  const buildRecoveryEvidenceQueueRecheckTask = (task: any) => {
    const chapterId = resolveRepairQueueTaskChapterId(task)
    return {
      ...task,
      chapter_id: chapterId || task?.chapter_id || task?.chapterId,
      issue_type: 'recovery_evidence_mismatch',
      source: 'review_annotation_risk',
      annotation_source: 'governance_recheck_sync',
      annotation_category: 'recovery_evidence',
      task_type: 'repair_quality',
    }
  }

  const executeRecoveryEvidenceGovernanceQueueTask = async (task: any, run?: any, taskIndex = -1, options: TaskCenterActionOptions = {}) => {
    const actionKey = String(task?.action_key || task?.actionKey || '')
    const keepOpenOptions = { ...options, keepTaskCenterOpen: true }
    if (actionKey === 'recheck_single_chapter') {
      const recheckTask = buildRecoveryEvidenceQueueRecheckTask(task)
      await recheckRepairTaskConvergence(recheckTask, run, taskIndex, keepOpenOptions)
      return
    }
    if (actionKey === 'revision') {
      const recheckTask = buildRecoveryEvidenceQueueRecheckTask(task)
      const chapterId = Number(recheckTask.chapter_id || 0)
      if (!chapterId) return message.warning('这个治理队列任务没有匹配章节')
      if (!selectedModelId) return message.warning('请先选择模型')
      if (!await selectChapterForWriting(chapterId)) return
      if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
      const revisionResult = await createEditorReportForChapter(chapterId, {
        sourceTask: recheckTask,
        sourceRun: run,
        sourceTaskIndex: taskIndex,
        autoRevision: true,
        skipRevisionConfirm: true,
      })
      if (revisionResult) {
        await recheckRepairTaskConvergence(recheckTask, run, taskIndex, { keepTaskCenterOpen: true })
      }
      return
    }
    if (actionKey === 'deep_repair_single_brief') {
      const chapterId = resolveRepairQueueTaskChapterId(task)
      const chapterNo = Number(task?.chapter_no || task?.chapterNo || 0)
      const targetChapter = chapterId
        ? sortedChapters.find(item => Number(item.id || 0) === chapterId)
        : chapterNo
          ? sortedChapters.find(item => Number(item.chapter_no || 0) === chapterNo)
          : null
      if (targetChapter && !await selectChapterForWriting(Number(targetChapter.id))) return
      await runRollingPlan({
        fromChapter: Number(targetChapter?.chapter_no || chapterNo || activeChapter?.chapter_no || 0) || undefined,
        intent: {
          source: 'recovery_evidence_source_deep_repair',
          action_key: actionKey,
          repair_scope: 'single_chapter_brief',
          chapter_id: Number(targetChapter?.id || chapterId || 0) || undefined,
          chapter_no: Number(targetChapter?.chapter_no || chapterNo || 0) || undefined,
          source_label: task?.source_label || task?.sourceLabel || '',
          failed_evidence: task?.failed_evidence || task?.failedEvidence || task?.recovery_evidence_review?.failed_evidence || [],
          deep_repair_direction: task?.deep_repair_direction || task?.deepRepairDirection || '',
          instruction: '回到单章任务书，把恢复依据写成当前章可见的冲突行动、对白选择、读者回报和章末钩子；不要只补审计说明。',
        },
      })
      if (run?.id && taskIndex >= 0) {
        await updateRepairTaskStatus(run, taskIndex, 'needs_review', '已生成单章任务书深修意图，等待正文继承后复查')
      }
      if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
      return
    }
    if (actionKey === 'deep_repair_batch_brief') {
      await runRollingPlan({
        intent: {
          source: 'recovery_evidence_source_deep_repair',
          action_key: actionKey,
          repair_scope: 'batch_brief',
          source_label: task?.source_label || task?.sourceLabel || '',
          chapter_nos: task?.chapter_nos || task?.chapterNos || [],
          failed_evidence: task?.failed_evidence || task?.failedEvidence || task?.recovery_evidence_review?.failed_evidence || [],
          deep_repair_direction: task?.deep_repair_direction || task?.deepRepairDirection || '',
          instruction: '复盘批次任务书，把多章恢复依据拆回每章冲突职责、剧情线推进、读者回报落点和章末钩子，再恢复批量连写。',
        },
      })
      if (run?.id && taskIndex >= 0) {
        await updateRepairTaskStatus(run, taskIndex, 'needs_review', '已生成批次任务书深修意图，等待批次复盘审计')
      }
      if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
      return
    }
    if (actionKey === 'recheck_safe_batch' || actionKey === 'focus_task' || actionKey === 'review_governance_closure') {
      if (!run?.id) return message.warning('这个治理队列没有绑定修复运行')
      await generateLongformRepairAuditSummary(run, { keepTaskCenterOpen: true })
      if (run?.id && taskIndex >= 0) {
        const note = actionKey === 'focus_task'
          ? '已按作者确认处理批次残留，等待恢复依据复盘回填'
          : '已触发恢复依据复盘，等待审计回填'
        await updateRepairTaskStatus(run, taskIndex, 'needs_review', note)
      }
      return
    }
    message.warning('这个治理队列动作暂不支持自动执行')
  }

  const executeTypedRepairTask = async (task: any, run?: any, taskIndex = -1, options: TaskCenterActionOptions = {}) => {
    const taskType = String(task?.task_type || '')
    const chapterId = Number(task?.chapter_id || 0)
    const markNeedsReview = async () => {
      if (run?.id && taskIndex >= 0) {
        await updateRepairTaskStatus(run, taskIndex, 'needs_review', '已执行类型化动作，等待复查验收')
      }
    }
    if (String(task?.issue_type || '') === 'style_sample_task_book_rebuild') {
      await executeStyleSampleTaskBookRebuild(task, run, taskIndex, options)
      return
    }
    if (String(task?.issue_type || '') === 'recovery_evidence_governance_queue') {
      await executeRecoveryEvidenceGovernanceQueueTask(task, run, taskIndex, options)
      return
    }
    if (taskType === 'repair_skeleton') {
      const outlineId = Number(task?.outline_id || 0)
      const outline = outlineId ? outlines.find(item => Number(item.id) === outlineId) : null
      if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
      if (outline) {
        openEditor('outline', outline)
        message.success('已打开骨架大纲，请补齐目标、冲突、回报和钩子')
      } else {
        setOutlineTreeOpen(true)
        if (outlineId) setFuture100FocusOutlineIds([outlineId])
        message.warning('未找到绑定大纲，已打开大纲树')
      }
      await markNeedsReview()
      return
    }
    if (taskType === 'repair_script_room' || String(task?.source || '') === 'rolling_script_room' || String(task?.issue_type || '') === 'script_room_layer_gap') {
      if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
      const actionArea = String(task?.action_area || '')
      const actionKey = String(task?.action_key || '')
      if (actionArea === 'assets' || actionKey === 'open_story_assets') {
        openStoryAssetsWorkspace()
      } else if (actionArea === 'planning' && actionKey) {
        handlePlanningAction(actionKey as PlanningActionKey)
      } else if ((actionArea === 'writing' || actionArea === 'quality') && actionKey) {
        handleWritingCockpitAction(actionKey as WritingCockpitActionKey)
      } else {
        setTaskCenterOpen(true)
      }
      await markNeedsReview()
      return
    }
    if (taskType === 'repair_assets') {
      if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
      if (String(task?.source || '') === 'storyline_diff_decision') openStoryAssetsWorkspace()
      else openStoryAssetsWorkspace('discoveredAssets')
      await markNeedsReview()
      return
    }
    if (taskType === 'chapter_retention_patch') {
      if (!chapterId) return message.warning('这个任务没有绑定章节')
      const issueText = [task?.issue_type, task?.message, task?.action].filter(Boolean).join(' ')
      if (issueText.includes('缺正文') || issueText.includes('生成正文')) {
        if (!selectedModelId) return message.warning('请先选择模型')
        if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
        await generateCurrentChapterProse({ allowIncomplete: true, forceSceneCards: true, targetChapterId: chapterId })
        await markNeedsReview()
        return
      }
      await startRepairTaskRevision(task, run, taskIndex, options)
      return
    }
    if (!chapterId) return message.warning('这个任务没有绑定章节')
    if (taskType === 'repair_materials') {
      if (!selectedModelId) return message.warning('请先选择模型')
      if (!await selectChapterForWriting(chapterId)) return
      if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
      await generateSceneCardsForChapter(chapterId, true)
      await markNeedsReview()
      return
    }
    if (taskType === 'repair_quality') {
      await startRepairTaskRevision(task, run, taskIndex, options)
      return
    }
    if (taskType === 'repair_similarity') {
      if (!await selectChapterForWriting(chapterId)) return
      if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
      await runSimilarityForChapter(chapterId)
      await markNeedsReview()
      return
    }
    if (taskType === 'resolve_failure') {
      await locateRepairTaskChapter(chapterId)
      Modal.info({
        title: '失败处理建议',
        width: 720,
        content: (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Text>{task.message || '该章节存在生产失败记录。'}</Text>
            <Text type="secondary">{task.action || '先处理失败原因，再重新进入章节群生产。'}</Text>
            {Array.isArray(task.acceptance_criteria) && task.acceptance_criteria.length > 0 && (
              <List size="small" dataSource={task.acceptance_criteria} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
            )}
          </Space>
        ),
      })
      await markNeedsReview()
      return
    }
    await startRepairTaskRevision(task, run, taskIndex, options)
  }

  const refreshActiveProseQuality = async (source = 'manual_refresh', targetChapter: any = activeChapter) => {
    if (!targetChapter) return message.warning('请先选择章节')
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await flushPendingSave()) return
    setProseQualityLoading(true)
    try {
      const res = await apiClient.post(`/novel/chapters/${targetChapter.id}/prose-quality`, {
        project_id: projectId,
        model_id: selectedModelId,
        source,
      })
      await loadProjectModules()
      setRightPanelOpen(true)
      setRightPanelTab('proseQuality')
      message.success(`当前版本复检完成，评分 ${res.data?.self_check?.score ?? '-'}`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '正文复检失败')
    } finally {
      setProseQualityLoading(false)
    }
  }

  const refreshProseQualityForChapter = async (chapterId: number, source = 'manual_refresh') => {
    const chapter = sortedChapters.find(item => Number(item.id) === Number(chapterId))
      || (Number(activeChapter?.id) === Number(chapterId) ? activeChapter : null)
    if (!chapter?.id) return
    if (Number(activeChapter?.id) !== Number(chapterId)) {
      const saved = await selectChapterForWriting(chapterId)
      if (!saved) return
    }
    await refreshActiveProseQuality(source, chapter)
  }

  const closeRepairTaskAfterRevision = async (task: any, run: any, taskIndex: number, revisionResult: any) => {
    if (!run?.id || taskIndex < 0) return null
    const plan = buildDeliveryRiskRevisionClosurePlan(task, revisionResult || {})
    await apiClient.post(`/novel/runs/${run.id}/tasks/${taskIndex}/status`, {
      project_id: projectId,
      status: plan.taskStatus,
      note: plan.note,
    })
    if (plan.annotationStatus && plan.annotationKey) {
      await apiClient.post(`/novel/projects/${projectId}/review-annotations/status`, {
        annotation_key: plan.annotationKey,
        status: plan.annotationStatus,
        note: plan.note,
      })
    }
    await loadProjectModules()
    await loadProductionTasks()
    return plan
  }

  const isSingleChapterRecoveryEvidenceRepairTask = (task: any) => {
    if (String(task?.issue_type || '') !== 'recovery_evidence_mismatch') return false
    const source = String(task?.source || '')
    const annotationSource = String(task?.annotation_source || task?.annotationSource || '')
    const annotationCategory = String(task?.annotation_category || task?.annotationCategory || '')
    return source === 'review_annotation_risk'
      || annotationSource === 'governance_recheck_sync'
      || annotationCategory === 'recovery_evidence'
  }

  const recheckRepairTaskConvergence = async (task: any, run: any, taskIndex: number, options: TaskCenterActionOptions = {}) => {
    const chapterId = Number(task?.chapter_id || 0)
    if (!chapterId) return message.warning('这个复查任务没有绑定章节')
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await selectChapterForWriting(chapterId)) return
    if (!await flushPendingSave()) return
    if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
    setProseQualityLoading(true)
    try {
      const storylineDecisionRecheckMeta = { source: 'storyline_decision_recheck', storyline_decision_closure: true }
      const singleChapterRecoveryRecheckMeta = { source: 'governance_recheck_sync', storyline_decision_closure: false }
      const recheckMeta = String(task?.source || '') === 'storyline_diff_decision'
        ? storylineDecisionRecheckMeta
        : isSingleChapterRecoveryEvidenceRepairTask(task)
          ? singleChapterRecoveryRecheckMeta
          : { source: 'repair_task_recheck', storyline_decision_closure: false }
      const qualityRes = await apiClient.post(`/novel/chapters/${chapterId}/prose-quality`, {
        project_id: projectId,
        model_id: selectedModelId,
        source: recheckMeta.source,
        source_review_id: task?.review_id || null,
      })
      const storyRes = await apiClient.post(`/novel/chapters/${chapterId}/story-state-sync`, {
        project_id: projectId,
        model_id: selectedModelId,
        source: recheckMeta.source,
        source_review_id: qualityRes.data?.review?.id || task?.review_id || null,
      })
      const closurePlan = await closeRepairTaskAfterRevision(task, run, taskIndex, {
        storyline_decision_closure: recheckMeta.storyline_decision_closure,
        quality_refresh: {
          ok: true,
          score: qualityRes.data?.self_check?.score,
          status: qualityRes.data?.review?.status,
        },
        story_state_update: storyRes.data?.story_state_update,
        delivery_risk_convergence: storyRes.data?.delivery_risk_convergence,
      })
      setRightPanelOpen(true)
      setRightPanelTab('proseQuality')
      const recheckLabel = recheckMeta.source === 'governance_recheck_sync' ? '单章治理复查' : '复检收敛'
      if (closurePlan?.taskStatus === 'resolved') {
        message.success(`${recheckLabel}完成，评分 ${qualityRes.data?.self_check?.score ?? '-'}，风险已清零，任务已关闭`)
      } else {
        message.warning(`${recheckLabel}完成，评分 ${qualityRes.data?.self_check?.score ?? '-'}，仍需复查`)
      }
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '复检收敛失败')
    } finally {
      setProseQualityLoading(false)
    }
  }

  const applyEditorRevision = async (report: any, options: { revisionMode?: string; prompt?: string; skipConfirm?: boolean; targetChapterId?: number; autoStoryState?: boolean; sourceTask?: any; sourceRun?: any; sourceTaskIndex?: number } = {}) => {
    if (!selectedModelId) return message.warning('请先选择模型')
    const isSelfCheckRevision = report?.review_type === 'prose_quality'
    const isDeliveryRiskRevision = [
      'chapter_core_drift',
      'reader_expectation_sync',
      'reader_retention_sync',
      'chapter_attraction_review',
      'story_drive_sync',
      'character_arc_sync',
      'style_sample_sync',
      'reader_payoff_sync',
      'innovation_sync',
      'storyline_sync',
      'readability_review',
    ].includes(String(report?.review_type || ''))
    const revisionLabels: Record<string, string> = {
      from_report: isSelfCheckRevision ? '按正文自检生成修订稿' : isDeliveryRiskRevision ? '按交稿风险生成修订稿' : '按编辑报告生成修订稿',
      expand_action: '补动作/战斗细节',
      cut_description: '压缩环境描写',
      tighten_pacing: '提升事件密度',
      add_consequence: '补行动后果',
      restore_hook: '强化章末钩子',
    }
    const revisionMode = options.revisionMode || 'from_report'
    const runRevision = async () => {
      try {
        const res = await apiClient.post(`/novel/reviews/${report.id}/apply-revision`, {
          project_id: projectId,
          chapter_id: resolveEditorRevisionChapterId(report, activeChapter?.id, options.targetChapterId),
          model_id: selectedModelId,
          revision_mode: revisionMode,
          prompt: options.prompt || '',
          auto_quality_check: true,
          auto_story_state: options.autoStoryState !== false,
        })
        if (res.data?.chapter) {
          setChapters(prev => prev.map(c => c.id === res.data.chapter.id ? res.data.chapter : c))
        }
        await loadProjectModules()
        let closurePlan: any = null
        if (options.sourceTask && options.sourceRun && typeof options.sourceTaskIndex === 'number') {
          closurePlan = await closeRepairTaskAfterRevision(options.sourceTask, options.sourceRun, options.sourceTaskIndex, res.data)
        }
        setRightPanelOpen(true)
        setRightPanelTab('proseQuality')
        const closureSuffix = closurePlan
          ? closurePlan.taskStatus === 'resolved'
            ? '；风险任务已自动关闭'
            : '；风险任务已转入需复查'
          : ''
        if (res.data?.quality_refresh?.ok) {
          const syncedTo = res.data?.story_state_update?.last_synced_chapter
          message.success(`${revisionLabels[revisionMode] || '修订稿'}已入库，并已复检当前版本，评分 ${res.data.quality_refresh.score ?? '-'}${syncedTo ? `；状态机已同步至第${syncedTo}章` : ''}${closureSuffix}`)
        } else if (res.data?.quality_refresh?.ok === false) {
          message.warning(`修订稿已入库，但自动复检失败：${res.data.quality_refresh.error || '未知错误'}。可在正文质检里手动复检。${closureSuffix}`)
        } else if (res.data?.story_state_update?.last_synced_chapter) {
          message.success(`修订稿已入库，状态机已同步至第${res.data.story_state_update.last_synced_chapter}章${closureSuffix}`)
        } else {
          message.success(`修订稿已入库${closureSuffix}`)
        }
        return res.data
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || '修订失败')
        return null
      }
    }
    if (options.skipConfirm) {
      return await runRevision()
    }
    Modal.confirm({
      title: revisionLabels[revisionMode] || revisionLabels.from_report,
      content: isSelfCheckRevision
        ? '系统会根据这份正文质检的修订指令重写当前章节，并保存为新的章节版本。'
        : isDeliveryRiskRevision
          ? '系统会根据这条交稿风险和当前章节的完整风险清单生成修订补丁，并保存为新的章节版本。'
        : '系统会根据这份编辑报告重写当前章节，并保存为新的章节版本。',
      okText: isSelfCheckRevision ? '按自检修订' : isDeliveryRiskRevision ? '按风险修订' : '生成修订稿',
      onOk: runRevision,
    })
    return null
  }

  const fillWritingBibleForm = (bible: any) => {
    const styleLock = mergeCommercialWebNovelStyleDefaults(bible.style_lock || selectedProject?.reference_config?.style_lock || {})
    const styleSampleBank = mergeCommercialWebNovelStyleSampleDefaults(bible.style_sample_bank || selectedProject?.reference_config?.style_sample_bank || [])
    writingBibleForm.setFieldsValue({
      reader_promise: bible.reader_promise || bible.readerPromise || bible.promise || '',
      protagonist_drive: bible.protagonist_drive || bible.protagonistDrive || bible.protagonist_motivation || bible.main_character_drive || '',
      core_conflict: bible.core_conflict || bible.coreConflict || bible.main_conflict || bible.mainline?.conflict || bible.mainline?.core_conflict || '',
      current_volume_goal: bible.current_volume_goal || bible.currentVolumeGoal || bible.volume_goal || bible.volume_plan?.[0]?.goal || bible.volume_plan?.[0]?.summary || '',
      innovation_hook: bible.innovation_hook || bible.innovationHook || bible.original_hook || bible.unique_selling_point || '',
      first30_plan: bible.first30_plan || bible.first30Plan || bible.first_30_plan || bible.opening_strategy || bible.retention_plan || '',
      longform_capacity: bible.longform_capacity || bible.longformCapacity || bible.million_word_spine || bible.longform_spine || bible.serial_engine || '',
      promise: bible.promise || bible.reader_promise || '',
      narrative_person: styleLock.narrative_person || '',
      sentence_length: styleLock.sentence_length || '',
      dialogue_ratio: styleLock.dialogue_ratio || '',
      payoff_density: styleLock.payoff_density || '',
      description_density: styleLock.description_density || '',
      chapter_word_range: styleLock.chapter_word_range || '',
      banned_words: Array.isArray(styleLock.banned_words) ? styleLock.banned_words.join('\n') : '',
      preferred_words: Array.isArray(styleLock.preferred_words) ? styleLock.preferred_words.join('\n') : '',
      world_rules: JSON.stringify(bible.world_rules || [], null, 2),
      mainline: JSON.stringify(bible.mainline || {}, null, 2),
      volume_plan: JSON.stringify(bible.volume_plan || [], null, 2),
      style_lock: JSON.stringify(styleLock || {}, null, 2),
      safety_policy: JSON.stringify(bible.safety_policy || selectedProject?.reference_config?.safety || {}, null, 2),
      forbidden: JSON.stringify(bible.forbidden || [], null, 2),
      meme_bank: JSON.stringify(bible.meme_bank || selectedProject?.reference_config?.meme_bank || [], null, 2),
      style_sample_bank: JSON.stringify(styleSampleBank, null, 2),
      chapter_benchmark_sample_bank: JSON.stringify(bible.chapter_benchmark_sample_bank || selectedProject?.reference_config?.chapter_benchmark_sample_bank || [], null, 2),
    })
  }

  const fillDefaultStyleSampleBank = () => {
    writingBibleForm.setFieldsValue({
      style_sample_bank: JSON.stringify(mergeCommercialWebNovelStyleSampleDefaults([]), null, 2),
    })
    message.success('已填入默认风格样本库')
  }

  const extractStyleSampleCandidates = async () => {
    setStyleSampleCandidateLoading(true)
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-candidates`, {
        min_score: 86,
        limit: 6,
      })
      const candidates = Array.isArray(res.data?.candidates) ? res.data.candidates : []
      if (!candidates.length) {
        message.warning('暂未找到可提炼的高分章节')
        return
      }
      writingBibleForm.setFieldsValue({
        style_sample_bank: JSON.stringify(candidates, null, 2),
      })
      message.success(`已提炼 ${candidates.length} 条风格样本候选，请审阅后保存`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '风格样本候选提炼失败')
    } finally {
      setStyleSampleCandidateLoading(false)
    }
  }

  const openWritingBibleEditor = async () => {
    setStyleSampleEffectivenessLoading(true)
    setStyleSampleEffectiveness(null)
    try {
      const [res, effectivenessRes] = await Promise.all([
        apiClient.get(`/novel/projects/${projectId}/writing-bible`),
        apiClient.get(`/novel/projects/${projectId}/writing-bible/style-sample-effectiveness`).catch(() => null),
      ])
      const bible = res.data?.writing_bible || {}
      fillWritingBibleForm(bible)
      setStyleSampleEffectiveness(effectivenessRes?.data?.style_sample_effectiveness || effectivenessRes?.data?.report || null)
      setWritingBibleOpen(true)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '写作圣经加载失败')
    } finally {
      setStyleSampleEffectivenessLoading(false)
    }
  }

  const previewStyleSampleAdjustmentPatch = async (item: any) => {
    const sampleKey = String(item?.sample_key || '').trim()
    if (!sampleKey) return message.warning('缺少样章键')
    setStyleSamplePatchLoadingKey(sampleKey)
    try {
      const previewRes = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-adjustment`, {
        sample_key: sampleKey,
        dry_run: true,
      })
      const patch = previewRes.data?.style_sample_patch || item?.adjustment_patch || {}
      const patchText = patch.patch_json || JSON.stringify(patch, null, 2)
      Modal.confirm({
        title: '样章补丁预览',
        width: 760,
        okText: '应用补丁',
        cancelText: '暂不应用',
        content: (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message={`将调整样章：${sampleKey}`}
              description="补丁只会写回风格样章库，不会改正文；请确认 JSON 变更符合作者口吻和禁抄边界。"
            />
            <Input.TextArea value={patchText} rows={12} readOnly />
          </Space>
        ),
        onOk: async () => {
          try {
            const applyRes = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-adjustment`, {
              sample_key: sampleKey,
              dry_run: false,
            })
            const nextBible = applyRes.data?.writing_bible || applyRes.data?.project?.reference_config?.writing_bible
            const nextBank = nextBible?.style_sample_bank || applyRes.data?.project?.reference_config?.style_sample_bank
            if (Array.isArray(nextBank)) {
              writingBibleForm.setFieldsValue({
                style_sample_bank: JSON.stringify(nextBank, null, 2),
              })
            }
            if (applyRes.data?.project) {
              setSelectedProject((prev: any) => prev ? { ...prev, ...applyRes.data.project } : applyRes.data.project)
            }
            const effectivenessRes = await apiClient.get(`/novel/projects/${projectId}/writing-bible/style-sample-effectiveness`).catch(() => null)
            setStyleSampleEffectiveness(effectivenessRes?.data?.style_sample_effectiveness || effectivenessRes?.data?.report || styleSampleEffectiveness)
            message.success('样章补丁已应用，请检查 JSON 后保存写作圣经')
          } catch (error: any) {
            message.error(error?.response?.data?.error || error?.message || '样章补丁应用失败')
            throw error
          }
        },
      })
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '样章补丁预览失败')
    } finally {
      setStyleSamplePatchLoadingKey('')
    }
  }

  const previewStyleSampleAdjustmentBatch = async () => {
    const riskyCount = Number(styleSampleEffectiveness?.risky_sample_count || 0)
    if (riskyCount <= 0) return message.info('当前没有需复盘样章')
    setStyleSamplePatchLoadingKey('batch')
    try {
      const previewRes = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-adjustments`, {
        dry_run: true,
      })
      const batch = previewRes.data?.style_sample_patch_batch || {}
      const patchText = batch.patch_json || JSON.stringify(batch, null, 2)
      Modal.confirm({
        title: '样章批量补丁预览',
        width: 820,
        okText: '应用全部补丁',
        cancelText: '暂不应用',
        content: (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message={`将批量调整 ${batch.total_patch_count || riskyCount} 条需复盘样章`}
              description="批量补丁只处理需复盘样章，跳过表现稳定样章；确认后写回风格样章库，不会改正文。"
            />
            <Input.TextArea value={patchText} rows={14} readOnly />
          </Space>
        ),
        onOk: async () => {
          try {
            const applyRes = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-adjustments`, {
              dry_run: false,
            })
            const nextBible = applyRes.data?.writing_bible || applyRes.data?.project?.reference_config?.writing_bible
            const nextBank = nextBible?.style_sample_bank || applyRes.data?.project?.reference_config?.style_sample_bank
            if (Array.isArray(nextBank)) {
              writingBibleForm.setFieldsValue({
                style_sample_bank: JSON.stringify(nextBank, null, 2),
              })
            }
            if (applyRes.data?.project) {
              setSelectedProject((prev: any) => prev ? { ...prev, ...applyRes.data.project } : applyRes.data.project)
            }
            const effectivenessRes = await apiClient.get(`/novel/projects/${projectId}/writing-bible/style-sample-effectiveness`).catch(() => null)
            setStyleSampleEffectiveness(effectivenessRes?.data?.style_sample_effectiveness || effectivenessRes?.data?.report || styleSampleEffectiveness)
            message.success('样章批量补丁已应用，请检查 JSON 后保存写作圣经')
          } catch (error: any) {
            message.error(error?.response?.data?.error || error?.message || '样章批量补丁应用失败')
            throw error
          }
        },
      })
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '样章批量补丁预览失败')
    } finally {
      setStyleSamplePatchLoadingKey('')
    }
  }

  const undoStyleSampleAdjustmentPatch = async () => {
    setStyleSamplePatchLoadingKey('undo')
    try {
      const undoRes = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-adjustments/undo`)
      if (!undoRes.data?.changed) {
        message.info('暂无可撤销的样章补丁')
        return
      }
      const nextBible = undoRes.data?.writing_bible || undoRes.data?.project?.reference_config?.writing_bible
      const nextBank = nextBible?.style_sample_bank || undoRes.data?.project?.reference_config?.style_sample_bank
      if (Array.isArray(nextBank)) {
        writingBibleForm.setFieldsValue({
          style_sample_bank: JSON.stringify(nextBank, null, 2),
        })
      }
      if (undoRes.data?.project) {
        setSelectedProject((prev: any) => prev ? { ...prev, ...undoRes.data.project } : undoRes.data.project)
      }
      const effectivenessRes = await apiClient.get(`/novel/projects/${projectId}/writing-bible/style-sample-effectiveness`).catch(() => null)
      setStyleSampleEffectiveness(effectivenessRes?.data?.style_sample_effectiveness || effectivenessRes?.data?.report || styleSampleEffectiveness)
      message.success('样章补丁已撤销')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '样章补丁撤销失败')
    } finally {
      setStyleSamplePatchLoadingKey('')
    }
  }

  const repairStyleSamplePatchReviewSelection = async (review: any = {}) => {
    const repairAction = review?.recommended_repair_action || review?.recommendedRepairAction || {}
    if (repairAction?.action !== 'replace') return
    if (!activeChapter) {
      message.warning('请先选择要重审任务书的章节')
      return
    }
    await applyStyleSampleActionForActiveChapter('replace')
    setWritingBibleOpen(false)
    setWorkspaceArea('chapterWriting')
    setRightPanelOpen(false)
  }

  const reviewStyleSampleAdjustmentPatch = async () => {
    setStyleSamplePatchLoadingKey('review')
    try {
      const contextPackage = activeContextPackageData?.context_package || activeContextPackageData || null
      const nextStyleSampleStrategy = activeChapter?.raw_payload?.pre_draft_brief?.style_sample_strategy
        || activeChapter?.raw_payload?.preDraftBrief?.style_sample_strategy
        || activeChapter?.raw_payload?.preDraftBrief?.styleSampleStrategy
        || contextPackage?.pre_draft_brief?.style_sample_strategy
        || contextPackage?.preDraftBrief?.style_sample_strategy
        || contextPackage?.preDraftBrief?.styleSampleStrategy
        || contextPackage?.chapter_target?.style_sample_strategy
        || contextPackage?.chapter_target?.styleSampleStrategy
        || null
      const reviewRes = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-adjustments/post-apply-review`, {
        chapter_id: activeChapter?.id || null,
        chapter_no: activeChapter?.chapter_no || null,
        context_package: contextPackage,
        next_style_sample_strategy: nextStyleSampleStrategy,
      })
      const review = reviewRes.data?.style_sample_patch_review || {}
      setStyleSampleEffectiveness(reviewRes.data?.style_sample_effectiveness || reviewRes.data?.report || styleSampleEffectiveness)
      const status = review.status || 'empty'
      const repairAction = review.recommended_repair_action || review.recommendedRepairAction || null
      const repairActionLabel = '换样章并重审任务书'
      const reviewOkText = repairAction?.action === 'replace'
        ? (repairAction.label || repairActionLabel)
        : '知道了'
      const messageText = status === 'warn'
        ? '当前任务书仍选中了复盘风险样章'
        : status === 'ok'
          ? '样章补丁复检通过'
          : status === 'watch'
            ? '样章补丁进入观察'
            : '暂无可复检的样章补丁'
      Modal.info({
        title: '样章补丁复检',
        width: 760,
        content: (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Alert
              type={status === 'warn' ? 'warning' : status === 'ok' ? 'success' : 'info'}
              showIcon
              message={messageText}
              description={(Array.isArray(review.next_actions) ? review.next_actions : []).join('；') || '请先应用样章补丁，再复检任务书是否还会选择风险样章。'}
            />
            <Space size={6} wrap>
              <Tag bordered={false}>补丁样章 {(review.patched_sample_keys || []).length || 0}</Tag>
              <Tag color={(review.still_risky_sample_keys || []).length ? 'orange' : 'green'} bordered={false}>仍需观察 {(review.still_risky_sample_keys || []).length || 0}</Tag>
              <Tag color={review.next_task_selects_repatched_risky_sample ? 'red' : 'green'} bordered={false}>
                任务书选中风险 {review.next_task_selects_repatched_risky_sample ? '是' : '否'}
              </Tag>
            </Space>
            <Input.TextArea value={JSON.stringify(review, null, 2)} rows={10} readOnly />
          </Space>
        ),
        okText: reviewOkText,
        onOk: async () => {
          if (repairAction?.action === 'replace') {
            await repairStyleSamplePatchReviewSelection(review)
          }
        },
      })
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '样章补丁复检失败')
    } finally {
      setStyleSamplePatchLoadingKey('')
    }
  }

  const generateWritingBibleEditor = async () => {
    if (!selectedModelId) return message.warning('请先选择模型')
    setWritingBibleGenerating(true)
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/writing-bible/generate`, {
        model_id: selectedModelId,
        save: true,
      })
      const bible = res.data?.writing_bible || {}
      fillWritingBibleForm(bible)
      setSelectedProject((prev: any) => res.data?.project || (prev ? { ...prev, reference_config: { ...(prev.reference_config || {}), writing_bible: bible } } : prev))
      await loadProjectModules()
      setRightPanelOpen(true)
      setRightPanelTab('writingBible')
      message.success('写作圣经已自动生成并保存，可继续人工微调')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '写作圣经自动生成失败')
    } finally {
      setWritingBibleGenerating(false)
    }
  }

  const saveWritingBibleEditor = async () => {
    try {
      const v = await writingBibleForm.validateFields()
      const parseJson = (value: string, fallback: any) => {
        try { return JSON.parse(value || '') } catch { return fallback }
      }
      const parsedStyleLock = parseJson(v.style_lock, {})
      const memeBank = parseJson(v.meme_bank, [])
      const styleSampleBank = mergeCommercialWebNovelStyleSampleDefaults(parseJson(v.style_sample_bank, []))
      const chapterBenchmarkSampleBank = parseJson(v.chapter_benchmark_sample_bank, [])
      const writingBible = {
        ...(selectedProject?.reference_config?.writing_bible || {}),
        reader_promise: v.reader_promise || v.promise || '',
        protagonist_drive: v.protagonist_drive || '',
        core_conflict: v.core_conflict || '',
        current_volume_goal: v.current_volume_goal || '',
        innovation_hook: v.innovation_hook || '',
        first30_plan: v.first30_plan || '',
        longform_capacity: v.longform_capacity || '',
        promise: v.promise || v.reader_promise || '',
        world_rules: parseJson(v.world_rules, []),
        mainline: parseJson(v.mainline, {}),
        volume_plan: parseJson(v.volume_plan, []),
        style_lock: {
          ...parsedStyleLock,
          narrative_person: v.narrative_person || '',
          sentence_length: v.sentence_length || '',
          dialogue_ratio: v.dialogue_ratio || '',
          payoff_density: v.payoff_density || '',
          description_density: v.description_density || '',
          chapter_word_range: v.chapter_word_range || '',
          banter_density: parsedStyleLock.banter_density || '',
          ending_policy: parsedStyleLock.ending_policy || '',
          banned_words: parseListField(v.banned_words),
          preferred_words: parseListField(v.preferred_words),
          banned_shortcuts: parsedStyleLock.banned_shortcuts || [],
        },
        safety_policy: parseJson(v.safety_policy, {}),
        forbidden: parseJson(v.forbidden, []),
        meme_bank: memeBank,
        style_sample_bank: styleSampleBank,
        chapter_benchmark_sample_bank: chapterBenchmarkSampleBank,
      }
      const res = await apiClient.put(`/novel/projects/${projectId}/writing-bible`, { writing_bible: writingBible })
      const nextReferenceConfig = {
        ...(selectedProject?.reference_config || {}),
        ...(res.data?.project?.reference_config || {}),
        writing_bible: res.data?.writing_bible || writingBible,
        meme_bank: Array.isArray(memeBank) ? memeBank : [],
        style_sample_bank: Array.isArray(styleSampleBank) ? styleSampleBank : [],
        chapter_benchmark_sample_bank: Array.isArray(chapterBenchmarkSampleBank) ? chapterBenchmarkSampleBank : [],
      }
      const configRes = await apiClient.put(`/novel/projects/${projectId}/reference-config`, nextReferenceConfig)
      setSelectedProject((prev: any) => res.data?.project
        ? { ...res.data.project, reference_config: configRes.data || nextReferenceConfig }
        : (prev ? { ...prev, reference_config: configRes.data || nextReferenceConfig } : prev))
      setWritingBibleOpen(false)
      message.success('写作圣经已保存')
    } catch (error: any) {
      if (error?.errorFields) return
      message.error(error?.response?.data?.error || error?.message || '写作圣经保存失败')
    }
  }

  const openStoryStateEditor = async () => {
    try {
      const res = await apiClient.get(`/novel/projects/${projectId}/story-state`)
      const state = res.data?.story_state || {}
      storyStateForm.setFieldsValue({
        character_positions: JSON.stringify(state.character_positions || {}, null, 2),
        character_relationships: JSON.stringify(state.character_relationships || state.relationships || {}, null, 2),
        known_secrets: JSON.stringify(state.known_secrets || {}, null, 2),
        item_ownership: JSON.stringify(state.item_ownership || {}, null, 2),
        foreshadowing_status: JSON.stringify(state.foreshadowing_status || {}, null, 2),
        mainline_progress: state.mainline_progress || '',
        timeline: JSON.stringify(state.timeline || [], null, 2),
        story_state: JSON.stringify(state, null, 2),
      })
      setStoryStateOpen(true)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '故事状态加载失败')
    }
  }

  const saveStoryStateEditor = async () => {
    try {
      const v = await storyStateForm.validateFields()
      const parseJson = (value: string, fallback: any) => {
        try { return JSON.parse(value || '') } catch { return fallback }
      }
      const baseState = parseJson(v.story_state || '{}', {})
      const storyState = {
        ...baseState,
        character_positions: parseJson(v.character_positions, {}),
        character_relationships: parseJson(v.character_relationships, {}),
        known_secrets: parseJson(v.known_secrets, {}),
        item_ownership: parseJson(v.item_ownership, {}),
        foreshadowing_status: parseJson(v.foreshadowing_status, {}),
        mainline_progress: v.mainline_progress || baseState.mainline_progress || '',
        timeline: parseJson(v.timeline, []),
      }
      const res = await apiClient.put(`/novel/projects/${projectId}/story-state`, { story_state: storyState })
      setSelectedProject((prev: any) => res.data?.project || (prev ? { ...prev, reference_config: { ...(prev.reference_config || {}), story_state: res.data?.story_state || storyState } } : prev))
      setStoryStateOpen(false)
      await loadProjectModules()
      message.success('故事状态机已校正')
    } catch (error: any) {
      if (error?.errorFields) return
      message.error(error?.message?.includes('JSON') ? '故事状态必须是合法 JSON' : (error?.response?.data?.error || error?.message || '故事状态保存失败'))
    }
  }

  const runBookReview = async () => {
    if (!selectedModelId) return message.warning('请先选择模型')
    setBookReviewLoading(true)
    try {
      await apiClient.post(`/novel/projects/${projectId}/book-review`, { model_id: selectedModelId })
      await loadProjectModules()
      setRightPanelOpen(true)
      setRightPanelTab('bookReviews')
      message.success('全书总检已完成')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '全书总检失败')
    } finally {
      setBookReviewLoading(false)
    }
  }

  const renderCommercialResult = (title: string, data: any) => {
    if (title.includes('长线治理') || data?.summary?.latest_audit || data?.report?.latest_audit) {
      const summary = data?.summary || data?.report || {}
      const audit = summary.latest_audit || null
      const run = summary.latest_repair_run || {}
      const risks = summary.risks || summary.risk_summary?.unresolved_tasks || []
      return (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space wrap>
            <Tag color={audit?.status === 'closed' ? 'green' : 'gold'} bordered={false}>{audit ? (audit.status === 'closed' ? '已闭环' : '需跟进') : '未审计'}</Tag>
            <Tag bordered={false}>修复任务 {run.task_count || 0}</Tag>
            <Tag bordered={false}>已确认 {run.resolved_count || 0}</Tag>
            <Tag color={(summary.risk_summary?.needs_review_count || run.needs_review_count || 0) ? 'gold' : 'default'} bordered={false}>需复查 {summary.risk_summary?.needs_review_count || run.needs_review_count || 0}</Tag>
            {summary.current_trends && <Tag color={(summary.current_trends.weak_count || 0) ? 'gold' : 'green'} bordered={false}>薄弱 {summary.current_trends.weak_count || 0}</Tag>}
          </Space>
          {summary.summary && <Alert type="info" showIcon message={summary.summary} />}
          {(audit?.conclusion || summary.next_actions || []).length > 0 && (
            <Card size="small" title={audit ? '闭环结论' : '下一步'}>
              <List size="small" dataSource={(audit?.conclusion || summary.next_actions || []).slice(0, 8)} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
            </Card>
          )}
          {audit?.metric_deltas && (
            <Card size="small" title="指标变化">
              <Space wrap>
                {Object.entries(audit.metric_deltas).map(([key, value]: [string, any]) => (
                  <Tag key={key} bordered={false}>{key} {value.before ?? '-'} {'->'} {value.after ?? '-'}{value.delta === null || value.delta === undefined ? '' : ` (${value.delta >= 0 ? '+' : ''}${value.delta})`}</Tag>
                ))}
              </Space>
            </Card>
          )}
          {risks.length > 0 && (
            <Card size="small" title="剩余风险">
              <List
                size="small"
                dataSource={risks.slice(0, 12)}
                renderItem={(item: any) => <List.Item>{typeof item === 'string' ? item : `${item.chapter_no ? `第${item.chapter_no}章 ` : ''}${item.message || item.title || item.task_status || ''}`}</List.Item>}
              />
            </Card>
          )}
        </Space>
      )
    }
    if (title.includes('成本') || data?.metrics) {
      const metrics = data?.metrics || data || {}
      const stageStats = metrics.stage_stats || {}
      return (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space wrap>
            <Tag color="blue" bordered={false}>章节 {metrics.written_chapter_count || 0}/{metrics.chapter_count || 0}</Tag>
            <Tag color="green" bordered={false}>字数 {Number(metrics.generated_words || 0).toLocaleString()}</Tag>
            <Tag bordered={false}>运行 {metrics.total_runs || 0} 次</Tag>
            <Tag color={Number(metrics.failure_rate || 0) > 15 ? 'red' : 'green'} bordered={false}>失败率 {metrics.failure_rate || 0}%</Tag>
            <Tag color={Number(metrics.avg_quality_score || 0) >= 78 ? 'green' : 'gold'} bordered={false}>均分 {metrics.avg_quality_score ?? '-'}</Tag>
          </Space>
          <Progress percent={Math.max(0, Math.min(100, Math.round(100 - Number(metrics.failure_rate || 0))))} size="small" />
          <Card size="small" title="阶段统计">
            <Space wrap>
              {Object.entries(stageStats).map(([key, stat]: any) => (
                <Tag key={key} bordered={false} color={Number(stat.failed || 0) > 0 ? 'gold' : 'default'}>
                  {key} · {stat.success || 0}/{stat.total || 0}
                </Tag>
              ))}
            </Space>
          </Card>
        </Space>
      )
    }
    if (title.includes('队列') || data?.queue) {
      const worker = data?.worker || {}
      const queue = Array.isArray(data?.queue) ? data.queue : []
      return (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space wrap>
            <Tag color={worker.status === 'running' ? 'blue' : worker.status === 'failed' ? 'red' : 'default'} bordered={false}>worker：{worker.status || 'idle'}</Tag>
            <Tag bordered={false}>待执行 {data?.summary?.queued || 0}</Tag>
            <Tag bordered={false}>运行中 {data?.summary?.running || 0}</Tag>
            <Tag bordered={false}>暂停 {data?.summary?.paused || 0}</Tag>
          </Space>
          {worker.phase && <Alert type={worker.status === 'failed' ? 'error' : 'info'} showIcon message={worker.phase} description={worker.last_error || ''} />}
          <List
            size="small"
            dataSource={queue.slice(0, 20)}
            renderItem={(item: any) => (
              <List.Item>
                <List.Item.Meta
                  title={<Space wrap><Tag bordered={false}>{item.type}</Tag><Text>{item.step}</Text><Tag color={item.status === 'running' ? 'blue' : item.status === 'paused' ? 'gold' : 'default'} bordered={false}>{item.status}</Tag></Space>}
                  description={item.payload?.phase || item.created_at}
                />
              </List.Item>
            )}
          />
        </Space>
      )
    }
    if (title.includes('相似度') || data?.report?.structural_report) {
      const report = data?.report || {}
      const structural = report.structural_report || {}
      return (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space wrap>
            <Tag color={report.decision === 'pass' ? 'green' : 'red'} bordered={false}>{report.decision === 'pass' ? '通过' : '需重写'}</Tag>
            <Tag bordered={false}>总风险 {report.overall_risk_score ?? '-'}</Tag>
            <Tag bordered={false}>结构风险 {report.structural_similarity_risk ?? '-'}</Tag>
            <Tag bordered={false}>文本安全 {report.copy_safety_score ?? '-'}</Tag>
          </Space>
          <Card size="small" title="结构风险拆解">
            <Space wrap>
              <Tag bordered={false}>场景顺序 {structural.scene_order_risk ?? 0}</Tag>
              <Tag bordered={false}>角色功能 {structural.role_function_risk ?? 0}</Tag>
              <Tag bordered={false}>爽点结构 {structural.payoff_structure_risk ?? 0}</Tag>
              <Tag bordered={false}>实体重叠 {structural.entity_overlap_risk ?? 0}</Tag>
            </Space>
          </Card>
          <List size="small" dataSource={report.suggestions || []} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
        </Space>
      )
    }
    if (title.includes('版本') || data?.diff) {
      const diff = data?.diff || {}
      return (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space wrap>
            <Tag bordered={false}>相似度 {diff.similarity_score ?? '-'}</Tag>
            <Tag bordered={false}>改动段落 {diff.change_count ?? 0}</Tag>
            <Tag bordered={false}>原 {diff.before_length ?? 0} 字 / 新 {diff.after_length ?? 0} 字</Tag>
            {data?.previous_version?.id && (
              <Button
                size="small"
                danger
                onClick={async () => {
                  await rollbackChapterVersion(data.previous_version.id)
                  Modal.destroyAll()
                }}
              >
                回滚到上一版
              </Button>
            )}
          </Space>
          {data?.recommendation && <Alert type="info" showIcon message={data.recommendation} />}
          <List
            size="small"
            dataSource={(diff.paragraph_changes || []).slice(0, 30)}
            renderItem={(item: any) => (
              <List.Item>
                <Card size="small" title={`第 ${item.index} 段`} style={{ width: '100%' }}>
                  <Paragraph type="secondary" ellipsis={{ rows: 3, expandable: true }}>{item.before || '空'}</Paragraph>
                  <Paragraph ellipsis={{ rows: 3, expandable: true }}>{item.after || '空'}</Paragraph>
                </Card>
              </List.Item>
            )}
          />
        </Space>
      )
    }
    return (
      <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', maxHeight: 560, overflow: 'auto' }}>
        {JSON.stringify(data, null, 2)}
      </Paragraph>
    )
  }

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
    const report = data?.report || data?.audit || {}
    const skeleton = data?.skeleton || report.rows || []
    Modal.info({
      title,
      width: 980,
      content: (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Card size="small">
            <Space align="center" size={16}>
              <Progress
                type="circle"
                size={76}
                percent={Number(report.score || 0)}
                status={Number(report.score || 0) >= 80 ? 'success' : Number(report.score || 0) < 62 ? 'exception' : 'normal'}
              />
              <Space direction="vertical" size={4}>
                <Text strong>{report.summary || `未来100章骨架 ${skeleton.length || 0} 条`}</Text>
                <Text type="secondary">范围：第{report.from_chapter || '-'}章到第{report.to_chapter || '-'}章；状态：{report.status || '-'}</Text>
                {data?.written_outlines && <Text type="secondary">已写入章节大纲 {data.written_outlines.length} 条</Text>}
                {data?.write_summary && <Text type="secondary">写入策略：{data.write_summary.mode}；创建 {data.write_summary.created || 0}，更新 {data.write_summary.updated || 0}，跳过 {data.write_summary.skipped || 0}</Text>}
                {Array.isArray(data?.written_outlines) && data.written_outlines.length > 0 && (
                  <Space wrap>
                    <Button size="small" onClick={() => {
                      Modal.destroyAll()
                      setFuture100FocusOutlineIds(data.written_outlines.map((item: any) => Number(item.id)).filter(Boolean))
                      setOutlineTreeOpen(true)
                    }}>打开大纲树检查</Button>
                    <Button size="small" type="primary" loading={commercialToolLoading === 'future100Group'} onClick={() => {
                      Modal.destroyAll()
                      void startFuture100ChapterGroupGeneration()
                    }}>从骨架入队章节群</Button>
                  </Space>
                )}
              </Space>
            </Space>
          </Card>
          {report.metrics && (
            <Card size="small" title="骨架覆盖">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                {[
                  ['覆盖率', report.metrics.coverage],
                  ['章节目标', report.metrics.goal_rate],
                  ['冲突压力', report.metrics.conflict_rate],
                  ['回报爽点', report.metrics.payoff_rate],
                  ['章末钩子', report.metrics.hook_rate],
                  ['阶段锚点', report.metrics.stage_anchor_rate],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12 }}>{label}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{Number(value || 0)}%</Text>
                    </Space>
                    <Progress percent={Number(value || 0)} size="small" status={Number(value || 0) >= 80 ? 'success' : Number(value || 0) < 62 ? 'exception' : 'normal'} />
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Card size="small" title="风险">
            <List
              size="small"
              dataSource={(report.risks || []).slice(0, 12)}
              locale={{ emptyText: '暂无明显风险' }}
              renderItem={(risk: any) => (
                <List.Item>
                  <List.Item.Meta
                    title={<Space><Tag color={risk.severity === 'high' ? 'red' : risk.severity === 'medium' ? 'gold' : 'default'} bordered={false}>{risk.severity}</Tag><Text>{risk.issue}</Text></Space>}
                    description={risk.action}
                  />
                </List.Item>
              )}
            />
          </Card>
          <Card size="small" title="章节骨架预览">
            <List
              size="small"
              dataSource={skeleton.slice(0, 40)}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    title={<Space wrap><Text>第{item.chapter_no}章 {item.title || '未命名'}</Text>{item.score !== undefined && <Tag color={item.score >= 80 ? 'green' : item.score < 62 ? 'red' : 'gold'} bordered={false}>{item.score}分</Tag>}{item.volume_stage && <Tag bordered={false}>{item.volume_stage}</Tag>}</Space>}
                    description={item.chapter_goal || item.conflict || (item.flags || []).join('、') || item.ending_hook || '待补齐'}
                  />
                </List.Item>
              )}
            />
            {skeleton.length > 40 && <Text type="secondary" style={{ fontSize: 12 }}>仅展示前40条，完整结果已写入审稿记录。</Text>}
          </Card>
          {(report.next_actions || []).length > 0 && (
            <Card size="small" title="下一步">
              <List size="small" dataSource={report.next_actions} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
            </Card>
          )}
        </Space>
      ),
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
        content: (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Card size="small">
              <Space align="center" size={16}>
                <Progress
                  type="circle"
                  size={76}
                  percent={Number(report.score || 0)}
                  status={Number(report.score || 0) >= 80 ? 'success' : Number(report.score || 0) < 65 ? 'exception' : 'normal'}
                />
                <Space direction="vertical" size={4}>
                  <Text strong>{report.summary || '已完成前30章留存诊断'}</Text>
                  <Text type="secondary">状态：{report.status || '-'}；读者承诺：{report.positioning?.promise_ready ? '已具备' : '需补强'}</Text>
                  {report.positioning?.reader_promise && <Text type="secondary">{report.positioning.reader_promise}</Text>}
                  <Button size="small" type="primary" onClick={() => { void createFirst30RetentionRepairQueue() }}>
                    生成留存修复任务
                  </Button>
                </Space>
              </Space>
            </Card>
            <Card size="small" title="分段留存">
              <List
                size="small"
                dataSource={report.segments || []}
                renderItem={(segment: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Space wrap><Text strong>{segment.label || segment.key}</Text><Tag color={segment.score >= 80 ? 'green' : segment.score < 65 ? 'red' : 'gold'} bordered={false}>{segment.score}分</Tag><Tag bordered={false}>覆盖 {segment.coverage}%</Tag><Tag bordered={false}>钩子 {segment.hook_rate}%</Tag><Tag bordered={false}>爽点/悬念 {segment.payoff_average}</Tag></Space>}
                      description={`章节 ${segment.chapter_count || 0}；目标覆盖 ${segment.goal_rate || 0}%`}
                    />
                  </List.Item>
                )}
              />
            </Card>
            <Card size="small" title="高优先级风险">
              <List
                size="small"
                dataSource={(report.risks || []).slice(0, 12)}
                locale={{ emptyText: '暂无明显风险' }}
                renderItem={(risk: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Space><Tag color={risk.severity === 'high' ? 'red' : risk.severity === 'medium' ? 'gold' : 'default'} bordered={false}>{risk.severity}</Tag><Text>{risk.segment}：{risk.issue}</Text></Space>}
                      description={risk.action}
                    />
                  </List.Item>
                )}
              />
            </Card>
            <Card size="small" title="章节卡片">
              <List
                size="small"
                dataSource={(report.chapter_cards || []).slice(0, 30)}
                renderItem={(row: any) => (
                  <List.Item
                    actions={row.chapter_id ? [<Button key="open" size="small" type="link" onClick={() => { Modal.destroyAll(); void selectChapterForWriting(row.chapter_id) }}>打开</Button>] : undefined}
                  >
                    <List.Item.Meta
                      title={<Space wrap><Text>第{row.chapter_no}章 {row.title || '未命名'}</Text><Tag color={row.score >= 80 ? 'green' : row.score < 65 ? 'red' : 'gold'} bordered={false}>{row.score}分</Tag><Tag bordered={false}>{row.word_count || 0}字</Tag></Space>}
                      description={(row.flags || []).join('、') || '基础留存信号正常'}
                    />
                  </List.Item>
                )}
              />
            </Card>
            {(report.next_actions || []).length > 0 && (
              <Card size="small" title="下一步">
                <List size="small" dataSource={report.next_actions} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
          </Space>
        ),
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
        content: (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Card size="small">
              <Space align="center" size={16}>
                <Progress
                  type="circle"
                  size={76}
                  percent={Number(report.score || 0)}
                  status={Number(report.score || 0) >= 82 ? 'success' : Number(report.score || 0) < 65 ? 'exception' : 'normal'}
                />
                <Space direction="vertical" size={4}>
                  <Text strong>{report.summary || '已完成读者试读复盘'}</Text>
                  <Text type="secondary">{report.quality_bar_label || '起点1万均订试读基准'} · {report.status || '-'}</Text>
                  {(report.drop_points || []).length > 0 && <Tag color="red" bordered={false}>弃读点 {(report.drop_points || []).length}</Tag>}
                </Space>
              </Space>
            </Card>
            <Card size="small" title="模拟读者">
              <List
                size="small"
                dataSource={report.personas || []}
                locale={{ emptyText: '暂无模拟读者结论' }}
                renderItem={(persona: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Space wrap><Text strong>{persona.label}</Text><Tag color={persona.risk_level === 'high' ? 'red' : persona.risk_level === 'low' ? 'green' : 'gold'} bordered={false}>{persona.score || '-'}分</Tag></Space>}
                      description={`${persona.focus || ''} ${persona.verdict || ''}`}
                    />
                  </List.Item>
                )}
              />
            </Card>
            <Card size="small" title="弃读点与修复动作">
              <List
                size="small"
                dataSource={(report.drop_points || []).slice(0, 10)}
                locale={{ emptyText: '暂无明显弃读点' }}
                renderItem={(item: string) => <List.Item>{item}</List.Item>}
              />
              {(report.repair_actions || []).length > 0 && (
                <Space wrap style={{ marginTop: 8 }}>
                  {(report.repair_actions || []).slice(0, 5).map((item: string) => <Tag key={item} color="gold" bordered={false}>{item}</Tag>)}
                </Space>
              )}
            </Card>
          </Space>
        ),
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

  const createRecoveryEvidenceGovernanceQueue = async (payload?: any) => {
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
        content: (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Card size="small">
              <Space align="center" size={16}>
                <Progress
                  type="circle"
                  size={76}
                  percent={Number(report.score || 0)}
                  status={Number(report.score || 0) >= 82 ? 'success' : Number(report.score || 0) < 68 ? 'exception' : 'normal'}
                />
                <Space direction="vertical" size={4}>
                  <Text strong>{report.summary || '已完成长篇创作诊断'}</Text>
                  <Text type="secondary">质量线：{report.quality_bar || 'qidian_10k_subscription_baseline'}；状态：{report.status || '-'}</Text>
                  <Text type="secondary">
                    支持范围：{Number(report.support_range_words?.min || 3000000).toLocaleString()} - {Number(report.support_range_words?.max || 10000000).toLocaleString()} 字
                  </Text>
                </Space>
              </Space>
            </Card>
            <Card size="small" title="创作契约四项">
              <List
                size="small"
                dataSource={report.dimensions || []}
                locale={{ emptyText: '暂无诊断维度' }}
                renderItem={(item: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={(
                        <Space wrap>
                          <Text strong>{item.label || item.key}</Text>
                          <Tag color={item.status === 'ok' ? 'green' : item.status === 'block' ? 'red' : 'gold'} bordered={false}>{item.status || '-'}</Tag>
                          <Tag bordered={false}>{Number(item.score || 0)}分</Tag>
                        </Space>
                      )}
                      description={(
                        <Space direction="vertical" size={2}>
                          <Text type="secondary">{item.detail || '无说明'}</Text>
                          {Array.isArray(item.evidence) && item.evidence.length > 0 && (
                            <Text type="secondary" style={{ fontSize: 12 }}>证据：{item.evidence.slice(0, 3).join('；')}</Text>
                          )}
                        </Space>
                      )}
                    />
                  </List.Item>
                )}
              />
            </Card>
            {(report.next_actions || []).length > 0 && (
              <Card size="small" title="下一步">
                <List size="small" dataSource={report.next_actions} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
          </Space>
        ),
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
        content: (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Card size="small">
              <Space align="center" size={16}>
                <Progress
                  type="circle"
                  size={76}
                  percent={Number(report.score || 0)}
                  status={Number(report.score || 0) >= 80 ? 'success' : Number(report.score || 0) < 62 ? 'exception' : 'normal'}
                />
                <Space direction="vertical" size={4}>
                  <Text strong>{report.summary || '已完成长线压力测试'}</Text>
                  <Text type="secondary">目标 {Number(report.target_words || 3000000).toLocaleString()} 字；状态：{report.status || '-'}</Text>
                  <Text type="secondary">按当前均章估算约 {report.estimated_chapters?.based_on_current_average || '-'} 章；3000字/章约 {report.estimated_chapters?.at_3000 || '-'} 章</Text>
                </Space>
              </Space>
            </Card>
            <Card size="small" title="长篇承载力">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                {[
                  ['分卷容量', report.capacity?.volume_capacity],
                  ['人物池', report.capacity?.character_capacity],
                  ['世界资产', report.capacity?.world_capacity],
                  ['冲突阶梯', report.capacity?.conflict_ladder],
                  ['扩展引擎', report.capacity?.expansion_engine],
                  ['回报循环', report.capacity?.payoff_loop],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12 }}>{label}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{Number(value || 0)}</Text>
                    </Space>
                    <Progress percent={Number(value || 0)} size="small" status={Number(value || 0) >= 75 ? 'success' : Number(value || 0) < 55 ? 'exception' : 'normal'} />
                  </div>
                ))}
              </div>
              <Space wrap style={{ marginTop: 10 }}>
                <Tag bordered={false}>已写 {report.capacity?.written_chapters || 0} 章</Tag>
                <Tag bordered={false}>已写 {Number(report.capacity?.written_words || 0).toLocaleString()} 字</Tag>
                <Tag color={report.capacity?.story_state_fresh ? 'green' : 'gold'} bordered={false}>状态机{report.capacity?.story_state_fresh ? '同步' : '需同步'}</Tag>
                <Tag color={(report.capacity?.review_debt || 0) ? 'gold' : 'green'} bordered={false}>审稿债务 {report.capacity?.review_debt || 0}</Tag>
              </Space>
            </Card>
            <Card size="small" title="薄弱点">
              <List
                size="small"
                dataSource={(report.weak_points || []).slice(0, 14)}
                locale={{ emptyText: '暂无明显薄弱点' }}
                renderItem={(item: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Space><Tag color={item.severity === 'high' ? 'red' : item.severity === 'medium' ? 'gold' : 'default'} bordered={false}>{item.severity}</Tag><Text>{item.area}：{item.issue}</Text></Space>}
                      description={item.action}
                    />
                  </List.Item>
                )}
              />
            </Card>
            <Card size="small" title="扩容路线">
              <List
                size="small"
                dataSource={report.expansion_plan || []}
                renderItem={(item: any) => (
                  <List.Item>
                    <List.Item.Meta title={<Text strong>{item.stage}</Text>} description={`${item.goal} ${item.output || ''}`} />
                  </List.Item>
                )}
              />
            </Card>
            {(report.next_actions || []).length > 0 && (
              <Card size="small" title="下一步">
                <List size="small" dataSource={report.next_actions} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
          </Space>
        ),
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
        content: (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color="blue" bordered={false}>跟踪 {summary.chapter_count || 0} 章</Tag>
              <Tag color="cyan" bordered={false}>骨架 {summary.skeleton_count || 0} 章</Tag>
              <Tag color="green" bordered={false}>已写 {summary.written_count || 0} 章</Tag>
              <Tag color={(summary.failed_chapter_count || 0) > 0 ? 'red' : 'default'} bordered={false}>失败关注 {summary.failed_chapter_count || 0}</Tag>
              <Button size="small" type="primary" loading={commercialToolLoading === 'longformRepair'} onClick={() => { void createLongformProductionRepairQueue() }}>生成修复任务</Button>
            </Space>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              {[
                ['骨架均分', summary.avg_skeleton_score],
                ['材料均分', summary.avg_material_score],
                ['质量均分', summary.avg_quality_score],
                ['生产就绪', summary.avg_readiness],
              ].map(([label, value]) => (
                <Card key={label as string} size="small">
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Text type="secondary">{label}</Text>
                    <Progress
                      percent={Number(value || 0)}
                      size="small"
                      status={Number(value || 0) >= 75 ? 'success' : Number(value || 0) < 55 ? 'exception' : 'normal'}
                    />
                  </Space>
                </Card>
              ))}
            </div>
            {recommendations.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message="优先处理建议"
                description={<Space direction="vertical" size={4}>{recommendations.map((item: string, index: number) => <Text key={`${item}-${index}`}>{item}</Text>)}</Space>}
              />
            )}
            <Card size="small" title="薄弱章节">
              <List
                size="small"
                dataSource={weakRows.slice(0, 20)}
                locale={{ emptyText: '当前没有明显薄弱章节' }}
                renderItem={(row: any) => (
                  <List.Item
                    actions={row.chapter_id ? [
                      <Button key="open" size="small" type="link" onClick={() => {
                        Modal.destroyAll()
                        void selectChapterForWriting(row.chapter_id)
                      }}>打开</Button>,
                    ] : []}
                  >
                    <List.Item.Meta
                      title={<Space wrap><Text>第{row.chapter_no}章《{row.title || '未命名'}》</Text><Tag bordered={false}>{row.status}</Tag><Tag bordered={false}>就绪 {row.readiness || 0}</Tag></Space>}
                      description={
                        <Space direction="vertical" size={4}>
                          <Text type="secondary">骨架 {row.skeleton_score ?? '-'} / 材料 {row.material_score ?? '-'} / 质量 {row.quality_score ?? '-'} / 相似风险 {row.similarity_risk ?? '-'}</Text>
                          {(row.failures || []).length > 0 && <Text type="danger">{(row.failures || []).join('；')}</Text>}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
            {failureReasons.length > 0 && (
              <Card size="small" title="失败原因">
                <List size="small" dataSource={failureReasons} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
          </Space>
        ),
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
        content: (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color="blue" bordered={false}>扫描 {data.summary?.scanned || 0} 章</Tag>
              <Tag color="green" bordered={false}>可生成 {data.summary?.ready || 0}</Tag>
              <Tag color={(data.summary?.blocked || 0) > 0 ? 'red' : 'default'} bordered={false}>待补齐 {data.summary?.blocked || 0}</Tag>
              <Tag bordered={false}>均分 {data.summary?.average_score || 0}</Tag>
            </Space>
            {Array.isArray(data.plan?.next_actions) && data.plan.next_actions.length > 0 && (
              <Card size="small" title="推荐处理顺序">
                <List size="small" dataSource={data.plan.next_actions} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
            <Space direction="vertical" size={10} style={{ width: '100%', maxHeight: 520, overflow: 'auto' }}>
              {(data.plan?.buckets || []).map((bucket: any) => (
                <Card key={bucket.key} size="small" title={<Space><Text strong>{bucket.label}</Text><Tag bordered={false}>{bucket.count} 章</Tag></Space>}>
                  <Paragraph style={{ marginTop: 0 }}>{bucket.action}</Paragraph>
                  <List
                    size="small"
                    dataSource={(bucket.chapters || []).slice(0, 10)}
                    renderItem={(row: any) => (
                      <List.Item
                        actions={[
                          <Button key="open" size="small" type="link" onClick={() => {
                            Modal.destroyAll()
                            void selectChapterForWriting(row.chapter_id)
                          }}>打开</Button>,
                        ]}
                      >
                        <List.Item.Meta
                          title={`第${row.chapter_no}章《${row.title || '未命名'}》 · 总分 ${row.score}% / 分项 ${row.category_score}%`}
                          description={row.recommendation || '补齐材料'}
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              ))}
              {(!data.plan?.buckets || data.plan.buckets.length === 0) && <Text type="secondary">当前扫描范围内没有明显材料缺口。</Text>}
            </Space>
          </Space>
        ),
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
        content: (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={Number(audit.score || 0) >= 80 ? 'green' : 'gold'} bordered={false}>连续性 {audit.score ?? '-'}分</Tag>
              <Tag color={(audit.high_count || 0) > 0 ? 'red' : 'default'} bordered={false}>高危 {audit.high_count || 0}</Tag>
              <Tag color={(audit.medium_count || 0) > 0 ? 'gold' : 'default'} bordered={false}>中危 {audit.medium_count || 0}</Tag>
              <Tag bordered={false}>总问题 {audit.issue_count || 0}</Tag>
            </Space>
            {Array.isArray(audit.recommendations) && audit.recommendations.length > 0 && (
              <Card size="small" title="建议">
                <List size="small" dataSource={audit.recommendations} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
            <Card size="small" title="问题清单">
              <List
                size="small"
                dataSource={(audit.issues || []).slice(0, 80)}
                renderItem={(issue: any) => (
                  <List.Item
                    actions={issue.chapter_no ? [<Button key="open" size="small" type="link" onClick={() => {
                      const chapter = chapters.find(ch => Number(ch.chapter_no) === Number(issue.chapter_no))
                      if (chapter) {
                        Modal.destroyAll()
                        void selectChapterForWriting(chapter.id)
                      }
                    }}>打开</Button>] : undefined}
                  >
                    <List.Item.Meta
                      title={<Space><Tag color={issue.severity === 'high' ? 'red' : issue.severity === 'medium' ? 'gold' : 'default'} bordered={false}>{issue.severity}</Tag><Text>{issue.chapter_no ? `第${issue.chapter_no}章 ` : ''}{issue.message}</Text></Space>}
                      description={issue.action}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        ),
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
    if (!String(targetChapter.chapter_text || '').replace(/\s/g, '').trim()) {
      openStoryStateEditor()
      return message.warning('当前章节还没有正文，已打开人工故事状态校正。')
    }
    if (!await selectTargetChapterForWriting({
      targetChapterId: Number(targetChapter.id),
      activeChapterId: activeChapter?.id,
      selectChapterForWriting,
    })) return
    if (!await flushPendingSave()) return

    setCommercialToolLoading('storyStateSync')
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
        message.error(update?.error || '故事状态同步失败，请打开人工校正检查。')
        return
      }
      const syncedTo = update?.last_synced_chapter || update?.last_updated_chapter || targetChapter.chapter_no
      message.success(syncedTo ? `故事状态已同步至第 ${syncedTo} 章。` : '故事状态已同步。')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '故事状态同步失败')
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
        content: (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color="blue" bordered={false}>参考 {references.length}</Tag>
              <Tag bordered={false}>活跃维度 {(fusion.active_dimensions || []).length}</Tag>
              <Tag color={(fusion.conflicts || []).length ? 'gold' : 'green'} bordered={false}>维度冲突 {(fusion.conflicts || []).length}</Tag>
              <Tag color={(fusion.latest_copy_hits || []).length ? 'red' : 'default'} bordered={false}>照搬命中 {(fusion.latest_copy_hits || []).length}</Tag>
            </Space>
            {Array.isArray(coverage.references) && (
              <Card size="small" title="知识层覆盖">
                <List
                  size="small"
                  dataSource={coverage.references}
                  renderItem={(row: any) => (
                    <List.Item>
                      <List.Item.Meta
                        title={<Space><Text strong>{row.project_title}</Text><Tag color={(row.score || 0) >= 70 ? 'green' : 'gold'} bordered={false}>{row.score || 0}分</Tag><Tag bordered={false}>{row.status || '-'}</Tag></Space>}
                        description={`缺失：${(row.missing_required || []).join('、') || '无'}；可用层：${(row.categories || []).filter((item: any) => item.count > 0).map((item: any) => item.label).join('、') || '-'}`}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            )}
            <Card size="small" title="资产层数量">
              <Space wrap>
                {assets.map((group: any) => <Tag key={group.category} color={(group.entries || []).length ? 'green' : 'default'} bordered={false}>{group.category} {(group.entries || []).length}</Tag>)}
              </Space>
            </Card>
            {Array.isArray(fusion.recommendations) && fusion.recommendations.length > 0 && (
              <Card size="small" title="诊断建议">
                <List size="small" dataSource={fusion.recommendations} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
          </Space>
        ),
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
        content: (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={Number(report.score || 0) >= 85 ? 'green' : Number(report.score || 0) >= 70 ? 'gold' : 'red'} bordered={false}>总分 {report.score ?? '-'}</Tag>
              <Tag color={(report.summary?.high || 0) > 0 ? 'red' : 'default'} bordered={false}>高危 {report.summary?.high || 0}</Tag>
              <Tag color={(report.summary?.medium || 0) > 0 ? 'gold' : 'default'} bordered={false}>中危 {report.summary?.medium || 0}</Tag>
              <Tag bordered={false}>问题 {report.summary?.issue_count || 0}</Tag>
              <Button size="small" type="primary" onClick={() => { void createMechanicalQaRepairQueue() }}>生成修复任务</Button>
            </Space>
            {Array.isArray(report.next_actions) && report.next_actions.length > 0 && (
              <Card size="small" title="建议">
                <List size="small" dataSource={report.next_actions} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
            <Card size="small" title="问题清单">
              <List
                size="small"
                dataSource={(report.issues || []).slice(0, 80)}
                renderItem={(issue: any) => (
                  <List.Item
                    actions={issue.chapter_id ? [<Button key="open" size="small" type="link" onClick={() => { Modal.destroyAll(); void selectChapterForWriting(issue.chapter_id) }}>打开</Button>] : undefined}
                  >
                    <List.Item.Meta
                      title={<Space><Tag color={issue.severity === 'high' ? 'red' : issue.severity === 'medium' ? 'gold' : 'default'} bordered={false}>{issue.severity}</Tag><Text>第{issue.chapter_no}章 {issue.message}</Text></Space>}
                      description={issue.title}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        ),
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
        content: (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Alert type="info" showIcon message="这一步会调用当前选择的大模型，对本地规则质检结果进行编辑复核，不直接改正文。" />
            <Space wrap>
              <Tag color="blue" bordered={false}>本地分 {localReport.score ?? '-'}</Tag>
              {aiReport.score_adjustment?.suggested_score !== undefined && <Tag color="purple" bordered={false}>AI建议分 {aiReport.score_adjustment.suggested_score}</Tag>}
              <Tag bordered={false}>确认问题 {(aiReport.confirmed_issues || []).length || 0}</Tag>
              <Tag bordered={false}>漏检 {(aiReport.missed_issues || []).length || 0}</Tag>
              <Tag bordered={false}>误判 {(aiReport.false_positives || []).length || 0}</Tag>
            </Space>
            <Card size="small" title="总体判断">
              <Text>{aiReport.overall_verdict || aiReport.score_adjustment?.reason || '模型已返回复核结果。'}</Text>
            </Card>
            {(aiReport.repair_order || []).length > 0 && (
              <Card size="small" title="建议修复顺序">
                <List size="small" dataSource={aiReport.repair_order} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
            <Card size="small" title="AI确认/漏检问题">
              <List
                size="small"
                dataSource={[...(aiReport.confirmed_issues || []).map((item: any) => ({ ...item, bucket: '确认' })), ...(aiReport.missed_issues || []).map((item: any) => ({ ...item, bucket: '漏检' }))].slice(0, 80)}
                locale={{ emptyText: '暂无问题' }}
                renderItem={(item: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Space><Tag color={item.bucket === '漏检' ? 'red' : 'blue'} bordered={false}>{item.bucket}</Tag><Tag bordered={false}>{item.severity || '-'}</Tag><Text>第{item.chapter_no || '-'}章 {item.issue}</Text></Space>}
                      description={item.fix}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        ),
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
        content: (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={Number(report.score || 0) >= 85 ? 'green' : Number(report.score || 0) >= 70 ? 'gold' : 'red'} bordered={false}>健康度 {report.score ?? '-'}</Tag>
              <Tag color={(report.high_count || 0) > 0 ? 'red' : 'default'} bordered={false}>高危 {report.high_count || 0}</Tag>
              <Tag bordered={false}>活跃债务 {report.active_count || 0}</Tag>
              <Tag bordered={false}>已解决 {report.resolved_count || 0}</Tag>
            </Space>
            <Card size="small" title="待处理">
              <List
                size="small"
                dataSource={(report.debts || []).slice(0, 80)}
                locale={{ emptyText: '暂无传播债务' }}
                renderItem={(debt: any) => (
                  <List.Item
                    actions={[
                      debt.affected?.chapter_id ? <Button key="open-id" size="small" type="link" onClick={() => { Modal.destroyAll(); void selectChapterForWriting(debt.affected.chapter_id) }}>打开</Button> : null,
                      debt.affected?.chapter_no ? <Button key="open-no" size="small" type="link" onClick={() => {
                        const chapter = chapters.find(ch => Number(ch.chapter_no) === Number(debt.affected.chapter_no))
                        if (chapter) { Modal.destroyAll(); void selectChapterForWriting(chapter.id) }
                      }}>定位</Button> : null,
                      <Button key="resolve" size="small" type="link" onClick={async () => {
                        try {
                          await apiClient.post(`/novel/projects/${projectId}/propagation-debt/${encodeURIComponent(debt.id)}/resolve`, { note: '用户在传播债务队列标记解决' })
                          message.success('已标记解决')
                          Modal.destroyAll()
                          await refreshPropagationDebt()
                        } catch (error: any) {
                          message.error(error?.response?.data?.error || error?.message || '标记解决失败')
                        }
                      }}>标记解决</Button>,
                    ].filter(Boolean) as any}
                  >
                    <List.Item.Meta
                      title={<Space><Tag color={debt.severity === 'high' ? 'red' : debt.severity === 'medium' ? 'gold' : 'default'} bordered={false}>{debt.severity}</Tag><Text>{debt.title}</Text></Space>}
                      description={<Space direction="vertical" size={2}><Text type="secondary">{debt.message}</Text><Text>{debt.next_action}</Text></Space>}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        ),
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
        content: (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Alert type="info" showIcon message="这一步会调用当前选择的大模型，把本地传播债务扫描转成可执行修复方案，不直接覆盖状态机。" />
            <Space wrap>
              <Tag color="blue" bordered={false}>本地健康度 {report.score ?? '-'}</Tag>
              <Tag color={(report.high_count || 0) > 0 ? 'red' : 'default'} bordered={false}>高危 {report.high_count || 0}</Tag>
              <Tag bordered={false}>修复项 {(aiPlan.repair_plan || []).length || 0}</Tag>
              <Tag color={(aiPlan.do_not_generate_until || []).length ? 'red' : 'green'} bordered={false}>生成前阻塞 {(aiPlan.do_not_generate_until || []).length || 0}</Tag>
            </Space>
            <Card size="small" title="总体判断">
              <Text>{aiPlan.overall_verdict || '模型已返回修复方案。'}</Text>
            </Card>
            {(aiPlan.do_not_generate_until || []).length > 0 && (
              <Card size="small" title="继续生成前必须处理">
                <List size="small" dataSource={aiPlan.do_not_generate_until} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
            <Card size="small" title="修复计划">
              <List
                size="small"
                dataSource={(aiPlan.repair_plan || []).slice(0, 80)}
                locale={{ emptyText: '暂无修复项' }}
                renderItem={(item: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Space><Tag color="purple" bordered={false}>P{item.priority || '-'}</Tag><Text>{item.target || item.debt_id || '修复项'}</Text></Space>}
                      description={<Space direction="vertical" size={2}><Text>{item.action}</Text><Text type="secondary">{item.reason || item.expected_result}</Text></Space>}
                    />
                  </List.Item>
                )}
              />
            </Card>
            {(aiPlan.chapter_level_fixes || []).length > 0 && (
              <Card size="small" title="章节补丁建议">
                <List size="small" dataSource={aiPlan.chapter_level_fixes} renderItem={(item: any) => <List.Item>第{item.chapter_no || '-'}章：{item.fix}</List.Item>} />
              </Card>
            )}
          </Space>
        ),
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
        content: (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color="blue" bordered={false}>模型 {report.model_count || 0}</Tag>
              <Tag color="green" bordered={false}>健康 {report.healthy_count || 0}</Tag>
              <Tag color={(report.ready_count || 0) > 0 ? 'green' : 'gold'} bordered={false}>可生产 {report.ready_count || 0}</Tag>
            </Space>
            <Alert type="info" showIcon message="此处读取模型配置、Key 状态和近期任务失败记录，不主动调用模型探针。" />
            {Array.isArray(report.next_actions) && report.next_actions.length > 0 && (
              <Alert type="warning" showIcon message={report.next_actions.join('；')} />
            )}
            <Card size="small" title="模型列表">
              <List
                size="small"
                dataSource={(report.rows || []).slice(0, 20)}
                renderItem={(row: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Space wrap><Text strong>{row.display_name || row.model_name}</Text><Tag color={row.score >= 70 ? 'green' : row.score >= 45 ? 'gold' : 'red'} bordered={false}>{row.score}分</Tag><Tag bordered={false}>{row.health_status}</Tag><Tag bordered={false}>{row.provider}</Tag></Space>}
                      description={<Space wrap><Tag bordered={false}>正文 {row.recommendation?.draft ? '可用' : '谨慎'}</Tag><Tag bordered={false}>审稿 {row.recommendation?.review ? '可用' : '不可用'}</Tag><Tag bordered={false}>长上下文 {row.recommendation?.long_context ? '是' : '未知'}</Tag>{row.recommendation?.risk && <Text type="warning">{row.recommendation.risk}</Text>}</Space>}
                    />
                  </List.Item>
                )}
              />
            </Card>
            {(report.recent_failures || []).length > 0 && (
              <Card size="small" title="近期失败">
                <List size="small" dataSource={report.recent_failures} renderItem={(row: any) => <List.Item><Text>{row.run_type} / {row.step_name}：{row.error}</Text></List.Item>} />
              </Card>
            )}
          </Space>
        ),
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
        content: (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Alert type="info" showIcon message="模板会写入写作圣经，作为无参考原创或类型化仿写的基础方法。已有字段不会被空值覆盖。" />
            <List
              size="small"
              dataSource={templates}
              renderItem={(item: any) => (
                <List.Item
                  actions={[
                    <Button key="apply" size="small" type="primary" onClick={async () => {
                      try {
                        const applyRes = await apiClient.post(`/novel/projects/${projectId}/genre-templates/${item.id}/apply`)
                        setSelectedProject((prev: any) => applyRes.data?.project || prev)
                        await loadProjectModules()
                        message.success(`已应用模板：${item.name}`)
                      } catch (error: any) {
                        message.error(error?.response?.data?.error || error?.message || '模板应用失败')
                      }
                    }}>应用</Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={<Space><Text strong>{item.name}</Text><Tag bordered={false}>{item.genre}</Tag></Space>}
                    description={<Space direction="vertical" size={2}><Text>{item.promise}</Text><Text type="secondary">节拍：{(item.structure?.chapter_beat || []).join(' -> ')}</Text></Space>}
                  />
                </List.Item>
              )}
            />
          </Space>
        ),
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

  const downloadBackupPackage = () => {
    const baseURL = String(apiClient.defaults.baseURL || '').replace(/\/$/, '')
    const link = document.createElement('a')
    link.href = `${baseURL}/novel/projects/${projectId}/backup-package`
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const importBackupPackage = async () => {
    if (!backupImportText.trim()) return message.warning('请粘贴项目备份 JSON')
    setCommercialToolLoading('backupImport')
    try {
      const backup = JSON.parse(backupImportText)
      const res = await apiClient.post('/novel/backup-package/import', { package: backup })
      const project = res.data?.project
      message.success(`已导入项目：${project?.title || project?.id || ''}`)
      setBackupImportOpen(false)
      setBackupImportText('')
      if (project?.id) navigate(`/novel/workspace/${project.id}`)
    } catch (error: any) {
      message.error(error?.message?.includes('JSON') ? '备份内容必须是合法 JSON' : (error?.response?.data?.error || error?.message || '导入备份失败'))
    } finally {
      setCommercialToolLoading('')
    }
  }

  const runCreativeCommand = async (execute = false) => {
    if (!creativeCommandText.trim()) return message.warning('请输入创作指令')
    setCommercialToolLoading('creativeCommand')
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/creative-command`, {
        command: creativeCommandText,
        execute,
      })
      setCreativeCommandPlan(res.data || null)
      await loadProductionTasks()
      if (execute) await loadProjectModules()
      message.success(execute ? '指令已执行可安全执行的部分' : '指令已解析')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '创作指令处理失败')
    } finally {
      setCommercialToolLoading('')
    }
  }

  const openCreativeAssistant = () => {
    const selection = typeof window !== 'undefined' ? window.getSelection()?.toString() || '' : ''
    setCreativeAssistantSelectedText(selection.trim())
    setCreativeAssistantOpen(true)
  }

  const copyCreativeAssistantCard = async (card: CreativeAssistCard) => {
    const content = [
      card.title,
      card.intent ? `目的：${card.intent}` : '',
      card.reason ? `依据：${card.reason}` : '',
      card.suggestion ? `建议：${card.suggestion}` : '',
      card.risk ? `风险：${card.risk}` : '',
    ].filter(Boolean).join('\n')
    try {
      await navigator.clipboard?.writeText(content)
      message.success('建议卡已复制')
    } catch {
      message.info(content)
    }
  }

  const runCreativeAssistant = async (input: { mode: CreativeAssistantModeKey; question: string; researchQuery: string }) => {
    setCreativeAssistantLoading(true)
    setCreativeAssistantError('')
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/creative-assist`, {
        mode: input.mode,
        chapter_id: activeChapter?.id,
        selected_text: creativeAssistantSelectedText,
        question: input.question,
        research_query: input.researchQuery,
        model_id: selectedModelId,
        save: true,
      })
      setCreativeAssistantResult(normalizeCreativeAssistPayload(res.data?.assist || res.data))
      if (res.data?.review) await loadProjectModules()
      message.success('创作参谋建议已生成')
    } catch (error: any) {
      setCreativeAssistantError(error?.response?.data?.error || error?.message || '创作参谋调用失败')
    } finally {
      setCreativeAssistantLoading(false)
    }
  }

  const openRunQueue = async () => {
    await runCommercialTool('queue', '后台任务队列', async () => {
      const res = await apiClient.get(`/novel/projects/${projectId}/run-queue`)
      return res.data
    })
  }

  const openProductionDesk = async () => {
    navigate(`/novel/workspace/${projectId}/production`)
  }

  const startRunQueueWorker = async () => {
    if (!selectedModelId) return message.warning('请先选择模型')
    await runCommercialTool('queueWorker', '后台任务队列', async () => {
      await apiClient.post(`/novel/projects/${projectId}/run-queue/start-worker`, {
        model_id: selectedModelId,
        max_chapters_per_run: 1,
      })
      const res = await apiClient.get(`/novel/projects/${projectId}/run-queue`)
      setTaskCenterOpen(true)
      return res.data
    })
  }

  const stopRunQueueWorker = async () => {
    await runCommercialTool('queueStop', '后台任务队列', async () => {
      await apiClient.post(`/novel/projects/${projectId}/run-queue/stop-worker`)
      const res = await apiClient.get(`/novel/projects/${projectId}/run-queue`)
      return res.data
    })
  }

  const recoverRunQueue = async () => {
    await runCommercialTool('queueRecover', '恢复后台任务队列', async () => {
      const res = await apiClient.post(`/novel/projects/${projectId}/run-queue/recover`)
      await loadProductionTasks()
      setTaskCenterOpen(true)
      return res.data
    })
  }

  const executeChapterGroupRun = async (run: any) => {
    if (!selectedModelId) return message.warning('请先选择模型')
    setChapterGroupExecutingId(run.id)
    try {
      await apiClient.post(`/novel/projects/${projectId}/chapter-groups/${run.id}/execute`, {
        model_id: selectedModelId,
        max_chapters: 50,
        production_mode: productionMode,
        ...chapterWordTargetPayload(),
      })
      await loadProjectModules()
      message.success('章节群执行完成或已暂停')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '章节群执行失败')
    } finally {
      setChapterGroupExecutingId(null)
    }
  }

  const approveChapterGroupStage = async (run: any, chapter: any) => {
    try {
      await apiClient.post(`/novel/projects/${projectId}/chapter-groups/${run.id}/approve`, {
        chapter_id: chapter.id,
        stage: chapter.approval_stage || run?.output_ref?.last_error?.approval_stage || 'scene_cards',
      })
      await loadProjectModules()
      message.success('已确认，任务可继续执行')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '确认失败')
    }
  }

  const retryChapterGroupStage = async (run: any, chapter: any) => {
    try {
      await apiClient.post(`/novel/projects/${projectId}/chapter-groups/${run.id}/retry-now`, { chapter_id: chapter.id })
      await loadProjectModules()
      message.success('已加入立即重试')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '重试失败')
    }
  }

  const skipChapterGroupStage = async (run: any, chapter: any) => {
    try {
      await apiClient.post(`/novel/projects/${projectId}/chapter-groups/${run.id}/skip-chapter`, {
        chapter_id: chapter.id,
        reason: '用户在任务中心跳过',
      })
      await loadProjectModules()
      message.success(`已跳过第${chapter.chapter_no}章，可继续执行后续章节`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '跳过失败')
    }
  }

  const executeReleaseRepairRun = async (run: any) => {
    setReleaseRepairExecutingId(run.id)
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/release-repair-runs/${run.id}/execute`, {
        max_items: 100,
      })
      await loadProjectModules()
      await loadProductionTasks()
      const audit = res.data?.release_audit
      message.success(audit?.can_release ? '发布批量任务已完成，发布审核已通过' : '发布批量任务已完成，请刷新交付审核查看剩余问题')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '发布批量任务执行失败')
    } finally {
      setReleaseRepairExecutingId(null)
    }
  }

  const startChapterPipeline = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!selectedModelId) return message.warning('请先选择写作模型')
    if (!await flushPendingSave()) return
    setPipelineLoading(true)
    try {
      const res = await apiClient.post(`/novel/chapters/${activeChapter.id}/generation-pipeline/start`, {
        project_id: projectId,
        model_id: selectedModelId,
        ...chapterWordTargetPayload(),
        generate_scene_cards: true,
      })
      if (res.data?.chapter) {
        setChapters(prev => prev.map(c => c.id === res.data.chapter.id ? res.data.chapter : c))
      }
      await loadProjectModules()
      setTaskCenterOpen(true)
      message.success('流水线已创建，已停在场景卡确认阶段')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '流水线启动失败')
    } finally {
      setPipelineLoading(false)
    }
  }

  const generateCurrentChapterProse = async (options: { allowIncomplete?: boolean; forceSceneCards?: boolean; targetChapterId?: number } = {}) => {
    const targetChapter = options.targetChapterId
      ? chapters.find(ch => String(ch.id) === String(options.targetChapterId))
      : activeChapter
    if (!targetChapter) return message.warning('请先选择章节')
    if (!selectedModelId) return message.warning('请先选择写作模型')
    if (!await flushPendingSave()) return
    if (!await confirmReferenceReady('正文创作')) return
    const targetChapterNo = Number(targetChapter.chapter_no || 0)
    const currentChapterLaunchGate = (
      Number(autoCreationDirectorModel.targetChapter?.id || 0) === Number(targetChapter.id || 0)
      || Number(autoCreationDirectorModel.targetChapter?.chapterNo || 0) === targetChapterNo
    )
      ? autoCreationDirectorModel.chapterLaunchGate
      : null
    setStreamingChapterId(targetChapter.id)
    setStreamingText('')
    setStreamingProgress('正在请求模型...')
    setStreamingPercent(10)
    setGenerationPipeline([])
    setGeneratingProse(true)
    try {
      const ctx = {
        worldbuilding: worldbuilding[0] || null,
        characters, outlines,
        previousChapter: chapters.filter(ch => ch.chapter_no < targetChapterNo).sort((a, b) => b.chapter_no - a.chapter_no)[0] || null,
      }
      const resp = await fetch(
        `${apiClient.defaults.baseURL}/novel/chapters/${targetChapter.id}/generate-prose?stream=1`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({
            project_id: projectId, model_id: selectedModelId,
            ...chapterWordTargetPayload(),
            longform_compass: autoCreationDirectorModel.longformCompass,
            longform_battle_context: autoCreationDirectorModel.longformBattleDesk,
            chapter_launch_gate: currentChapterLaunchGate,
            million_word_runway: autoCreationDirectorModel.millionWordRunway,
            prompt: `请生成第 ${targetChapter.chapter_no} 章《${displayValue(targetChapter.title)}》完整正文`,
            payload: ctx,
            allow_incomplete: Boolean(options.allowIncomplete),
            force_scene_cards: Boolean(options.forceSceneCards),
          }),
        },
      )
      if (!resp.ok || !resp.body) {
        const raw = await resp.text()
        let payload: any = null
        try { payload = raw ? JSON.parse(raw) : null } catch { payload = null }
        if (payload?.error_code === 'PROSE_PREFLIGHT_BLOCKED' || payload?.error_code === 'REFERENCE_SAFETY_BLOCKED') {
          showGenerationBlockedModal(payload, () => { void generateCurrentChapterProse({ ...options, allowIncomplete: true }) }, {
            targetChapterId: targetChapter.id,
            onRepairComplete: () => { void generateCurrentChapterProse({ ...options, allowIncomplete: false, forceSceneCards: true, targetChapterId: targetChapter.id }) },
          })
        }
        throw new Error(payload?.error || raw || `HTTP ${resp.status}`)
      }
      const reader = resp.body.getReader()
      const dec = new TextDecoder('utf-8')
      let buf = '', done: any
      while (true) {
        const { value, done: d } = await reader.read()
        if (d) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n\n'); buf = parts.pop() || ''
        for (const part of parts) {
          const line = part.split('\n').find(r => r.startsWith('data: '))
          if (!line) continue
          const p = JSON.parse(line.replace(/^data: /, ''))
          if (p.pipeline) setGenerationPipeline(Array.isArray(p.pipeline) ? p.pipeline : [])
          if (p.type === 'progress') { setStreamingProgress(p.progress || '生成中...'); setStreamingPercent(Math.min(90, p.percent || 35)) }
          else if (p.type === 'chunk') { setStreamingText(prev => `${prev}${p.text || ''}`); setStreamingPercent(prev => Math.min(95, prev + 2)) }
          else if (p.type === 'done') done = p
          else if (p.type === 'error') {
            if (p.error_code === 'PROSE_PREFLIGHT_BLOCKED' || p.error_code === 'REFERENCE_SAFETY_BLOCKED') {
              showGenerationBlockedModal(p, () => { void generateCurrentChapterProse({ ...options, allowIncomplete: true }) }, {
                targetChapterId: targetChapter.id,
                onRepairComplete: () => { void generateCurrentChapterProse({ ...options, allowIncomplete: false, forceSceneCards: true, targetChapterId: targetChapter.id }) },
              })
            }
            throw new Error(p.error || '正文生成失败')
          }
        }
      }
      const updated = done?.chapter
      if (updated) setChapters(prev => prev.map(c => c.id === updated.id ? updated : c))
      setStreamingProgress('生成完成')
      setStreamingPercent(100)
      setStreamingText(prev => prev || updated?.chapter_text || '')
      await loadProjectModules()
      if (done?.diff) {
        const diff = done.diff
        Modal.info({
          title: '生成结果差异',
          width: 820,
          content: (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={Number(diff.delta_length || 0) >= 0 ? 'green' : 'gold'} bordered={false}>字数变化 {diff.delta_length >= 0 ? '+' : ''}{diff.delta_length || 0}</Tag>
                <Tag bordered={false}>原 {diff.before_length || 0} 字</Tag>
                <Tag bordered={false}>新 {diff.after_length || 0} 字</Tag>
                <Tag bordered={false}>改动段落 {diff.change_count || 0}</Tag>
                {done.previous_version?.version_no && <Tag color="blue" bordered={false}>已保留 v{done.previous_version.version_no}</Tag>}
              </Space>
              <Card size="small" title="段落变更预览">
                {(diff.paragraph_changes || []).length ? (
                  <Space direction="vertical" size={8} style={{ width: '100%', maxHeight: 360, overflow: 'auto' }}>
                    {(diff.paragraph_changes || []).slice(0, 12).map((row: any) => (
                      <div key={row.index} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>第 {row.index} 段</Text>
                        {row.before && <Paragraph style={{ margin: '4px 0', fontSize: 12, color: '#b42318' }} ellipsis={{ rows: 2, expandable: true }}>旧：{row.before}</Paragraph>}
                        {row.after && <Paragraph style={{ margin: 0, fontSize: 12, color: '#067647' }} ellipsis={{ rows: 2, expandable: true }}>新：{row.after}</Paragraph>}
                      </div>
                    ))}
                  </Space>
                ) : <Text type="secondary">正文差异很小或原文为空。</Text>}
              </Card>
            </Space>
          ),
        })
      }
      setRightPanelOpen(true)
      setRightPanelTab('proseQuality')
      message.success(`已使用 ${done?.result?.modelName || '所选模型'} 生成正文`)
    } catch (error: any) {
      setStreamingProgress('生成失败'); setStreamingPercent(0)
      message.error(error?.message || '正文生成失败')
    } finally {
      setGeneratingProse(false)
      setTimeout(() => { setStreamingChapterId(null); setStreamingPercent(0) }, 1500)
    }
  }

  const repairContextAndGenerateCurrentChapter = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await flushPendingSave()) return
    const targetChapterId = activeChapter.id
    setGeneratingProse(true)
    setStreamingChapterId(targetChapterId)
    setStreamingText('')
    setStreamingProgress('自动补齐上下文材料')
    setStreamingPercent(8)
    try {
      const res = await apiClient.post(`/novel/chapters/${targetChapterId}/auto-repair-context`, {
        project_id: projectId,
        model_id: selectedModelId,
      })
      const applied = Array.isArray(res.data?.applied) ? res.data.applied : []
      const warnings = Array.isArray(res.data?.warnings) ? res.data.warnings : []
      await loadProjectModules()
      if (warnings.length) {
        message.warning(String(warnings[0] || '上下文补齐已降级处理，将继续生成正文'))
      } else {
        message.success(applied.length ? `已自动补齐 ${applied.length} 项上下文材料` : '上下文材料无需补齐')
      }
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '上下文自动补齐失败')
      setGeneratingProse(false)
      return
    }
    setGeneratingProse(false)
    await generateCurrentChapterProse({ allowIncomplete: true, forceSceneCards: true, targetChapterId })
  }

  /* ── 章节重组 ──────────────────────────────────────────────────── */
  const handleRestructure = async (mode: string, targetCount: number, instructions: string) => {
    if (selectedChapterIds.size < 2) {
      message.warning('至少选择 2 章才能进行重组')
      return
    }
    if (!await flushPendingSave()) return
    message.loading({ content: `${mode === 'expand' ? '正在扩展' : '正在合并'}章节...`, key: 'restructure', duration: 0 })

    const res = await apiClient.post('/novel/chapters/restructure', {
      project_id: projectId,
      model_id: selectedModelId,
      chapter_ids: Array.from(selectedChapterIds),
      mode,
      target_count: targetCount,
      instructions: instructions.trim(),
    })

    message.destroy('restructure')
    message.success(res.data?.message || '章节重组完成')

    // Reset selection and reload
    setSelectedChapterIds(new Set())
    setSelectMode(false)
    await loadProjectModules()
  }

  const deleteProject = () => {
    if (!selectedProject) return
    Modal.confirm({
      title: '删除项目',
      content: '确定删除整个项目吗？此操作会清理所有目录、章节和版本记录。',
      okText: '删除', okButtonProps: { danger: true },
      onOk: async () => { await apiClient.delete(`/novel/projects/${selectedProject.id}`); navigate('/novel') },
    })
  }

  const deleteChapter = async (cid: number) => {
    if (!await flushPendingSave()) return
    await apiClient.delete(`/novel/chapters/${cid}`)
    await loadProjectModules()
  }

  const deleteOutline = async (oid: number) => {
    await apiClient.delete(`/novel/outlines/${oid}`)
    await loadProjectModules()
  }

  /* ── editor helpers ────────────────────────────────────────────── */
  const formatListField = (value: any) => {
    if (Array.isArray(value)) return value.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join(', ')
    if (value && typeof value === 'object') return JSON.stringify(value)
    return value || ''
  }

  const parseListField = (value: any) => {
    if (Array.isArray(value)) return value
    const text = String(value || '').trim()
    if (!text) return []
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) return parsed
    } catch { /* fall back to comma split */ }
    return text.split(/[,，\n]/).map((s: string) => s.trim()).filter(Boolean)
  }
  const formatJsonField = (value: any) => {
    if (value === undefined || value === null || value === '') return ''
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value || '')
    }
  }
  const parseJsonField = (value: any, fallback: any = []) => {
    if (Array.isArray(value) || (value && typeof value === 'object')) return value
    const text = String(value || '').trim()
    if (!text) return fallback
    try {
      return JSON.parse(text)
    } catch {
      return fallback
    }
  }

  const openEditor = (kind: typeof editorKind, item?: any) => {
    const currentItem = item || (kind === 'worldbuilding' ? worldbuilding[0] : null)
    setEditorItem(currentItem || null)
    if (kind === 'worldbuilding') {
      const data = currentItem || {
        world_summary: '', rules: [], timeline_anchor: '', known_unknowns: [], version: 1,
      }
      editorForm.setFieldsValue({
        ...data,
        rules: formatListField(data.rules),
        timeline_anchor: formatListField(data.timeline_anchor),
        known_unknowns: formatListField(data.known_unknowns),
      })
    } else if (kind === 'character') {
      const data = currentItem || { name: '', role_type: '', archetype: '', motivation: '', goal: '', conflict: '' }
      const state = data.current_state || {}
      const profile = data.raw_payload?.profile || {}
      editorForm.setFieldsValue({
        ...data,
        role_type: data.role_type || data.role || '',
        age: state.age ?? profile.age ?? '',
        gender: profile.gender || state.gender || '',
        identity: profile.identity || state.identity || '',
        faction: profile.faction || state.faction || '',
        personality: formatListField(data.personality),
        abilities: formatListField(data.abilities),
        items: formatListField(state.items || state.inventory || data.raw_payload?.items),
        knowledge_scope: formatListField(state.knowledge_scope || state.known_facts),
        information_boundaries: formatListField(state.information_boundaries),
        relationships: formatJsonField(data.relationships || []),
        current_state: formatJsonField(state || {}),
      })
    } else if (kind === 'outline') {
      const data = currentItem || {
        outline_type: 'master', title: '', summary: '', conflict_points: [],
        turning_points: [], hook: '', parent_id: null,
      }
      editorForm.setFieldsValue({
        ...data,
        conflict_points: formatListField(data.conflict_points),
        turning_points: formatListField(data.turning_points),
      })
    } else if (kind === 'chapter') {
      const data = currentItem || {
        chapter_no: 1, title: '', chapter_goal: '', chapter_summary: '',
        conflict: '', ending_hook: '', outline_id: null, chapter_text: '',
      }
      editorForm.setFieldsValue({
        ...data,
        must_advance: formatListField(data.raw_payload?.must_advance),
        forbidden_repeats: formatListField(data.raw_payload?.forbidden_repeats),
        scene_breakdown: formatJsonField(data.scene_list || data.scene_breakdown || []),
      })
    }
    setEditorKind(kind)
  }

  const submitEditor = async () => {
    if (!await flushPendingSave()) return
    const v = await editorForm.validateFields()
    try {
      if (editorKind === 'worldbuilding') {
        const payload = {
          project_id: projectId,
          world_summary: v.world_summary || '',
          rules: parseListField(v.rules),
          timeline_anchor: v.timeline_anchor || '',
          known_unknowns: parseListField(v.known_unknowns),
          version: Number(v.version || 1),
        }
        if (editorItem?.id) await apiClient.put(`/novel/worldbuilding/${editorItem.id}`, payload)
        else await apiClient.post(`/novel/projects/${projectId}/worldbuilding`, payload)
      } else if (editorKind === 'character') {
        const baseState = parseJsonField(v.current_state, {})
        const nextCurrentState = {
          ...(baseState && typeof baseState === 'object' && !Array.isArray(baseState) ? baseState : {}),
          age: v.age || baseState?.age || '',
          gender: v.gender || baseState?.gender || '',
          identity: v.identity || baseState?.identity || '',
          faction: v.faction || baseState?.faction || '',
          items: parseListField(v.items),
          knowledge_scope: parseListField(v.knowledge_scope),
          information_boundaries: parseListField(v.information_boundaries),
        }
        const payload = {
          project_id: projectId, name: v.name,
          role_type: v.role_type || '', archetype: v.archetype || '',
          motivation: v.motivation || '', goal: v.goal || '', conflict: v.conflict || '',
          personality: parseListField(v.personality),
          abilities: parseListField(v.abilities),
          appearance: v.appearance || '',
          backstory: v.backstory || '',
          secret: v.secret || '',
          growth_arc: v.growth_arc || '',
          arc_hint: v.arc_hint || '',
          relationships: parseJsonField(v.relationships, []),
          current_state: nextCurrentState,
          raw_payload: {
            ...(editorItem?.raw_payload || {}),
            profile: {
              ...((editorItem?.raw_payload || {}).profile || {}),
              age: v.age || '',
              gender: v.gender || '',
              identity: v.identity || '',
              faction: v.faction || '',
            },
            items: parseListField(v.items),
          },
        }
        if (editorItem?.id) await apiClient.put(`/novel/characters/${editorItem.id}`, payload)
        else await apiClient.post('/novel/characters', payload)
      } else if (editorKind === 'outline') {
        const payload = {
          project_id: projectId,
          outline_type: v.outline_type || 'master', title: v.title,
          summary: v.summary || '',
          conflict_points: parseListField(v.conflict_points),
          turning_points: parseListField(v.turning_points),
          hook: v.hook || '', parent_id: v.parent_id ?? null,
        }
        if (editorItem?.id) await apiClient.put(`/novel/outlines/${editorItem.id}`, payload)
        else await apiClient.post('/novel/outlines', payload)
      } else if (editorKind === 'chapter') {
        const payload = {
          project_id: projectId,
          chapter_no: Number(v.chapter_no || 1), title: v.title,
          chapter_goal: v.chapter_goal || '', chapter_summary: v.chapter_summary || '',
          conflict: v.conflict || '', ending_hook: v.ending_hook || '',
          status: editorItem?.status || 'draft', outline_id: v.outline_id ?? null,
          chapter_text: v.chapter_text || '',
          scene_breakdown: parseJsonField(v.scene_breakdown, []),
          scene_list: parseJsonField(v.scene_breakdown, []),
          raw_payload: {
            ...(editorItem?.raw_payload || {}),
            must_advance: parseListField(v.must_advance),
            forbidden_repeats: parseListField(v.forbidden_repeats),
          },
        }
        if (editorItem?.id) await apiClient.put(`/novel/chapters/${editorItem.id}`, payload)
        else await apiClient.post('/novel/chapters', { ...payload, scene_breakdown: [], continuity_notes: [] })
      }
      message.success('已保存')
      setEditorKind(null)
      setEditorItem(null)
      await loadProjectModules()
    } catch { message.error('保存失败') }
  }

  /* ── streaming scroll ──────────────────────────────────────────── */
  useEffect(() => {
    if (streamingChapterId) streamingEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [streamingText, streamingChapterId])

  /* ── render ────────────────────────────────────────────────────── */
  if (loading && !selectedProject) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}><ReloadOutlined className="anticon" style={{ fontSize: 24, animation: 'spin 1s linear infinite' }} /> 加载中…</div>
  }

  const planningLoadingKey = ((): PlanningLoadingKey | undefined => {
    const keys: PlanningLoadingKey[] = ['rollingPlan', 'future100Audit', 'future100Generate', 'longformPressure', 'longformCreationDiagnosis', 'topic', 'referenceDiagnosis', 'first30Retention', 'first30Repair', 'readerTrial', 'readerTrialRepair']
    return keys.includes(commercialToolLoading as PlanningLoadingKey) ? commercialToolLoading as PlanningLoadingKey : undefined
  })()
  const workspaceAreaTabs: Array<{ key: WorkspaceArea; label: string; icon: React.ReactNode }> = [
    { key: 'autoCreation', label: '自动创作', icon: <ControlOutlined /> },
    { key: 'storyPlanning', label: '故事规划', icon: <BookOutlined /> },
    { key: 'chapterWriting', label: '章节写作', icon: <EditOutlined /> },
    { key: 'storyAssets', label: '设定资产', icon: <DatabaseOutlined /> },
    { key: 'qualityRevision', label: '质检修订', icon: <SafetyOutlined /> },
    { key: 'productionOps', label: '生产运营', icon: <RocketOutlined /> },
  ]

  const recordStorylineDiffDecision = async (intent: any) => {
    if (!intent?.decisionKey) return message.warning('缺少剧情线差异决策键')
    try {
      await apiClient.post(`/novel/projects/${projectId}/storyline-diff-decisions`, {
        decision_key: intent.decisionKey,
        decision: intent.recommendedDecision,
        chapter_no: intent.chapterNo,
        entity_id: intent.entityId,
        entity_name: intent.entityName,
        entity_type: intent.entityType,
        risk_type: intent.riskType,
        risk_label: intent.riskLabel,
        summary: intent.summary,
        evidence: intent.evidence,
      })
      await loadProjectModules()
      message.success(`已记录剧情线决策：${intent.recommendedActionLabel || '已处理'}`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '剧情线决策记录失败')
    }
  }

  const createStorylineDecisionTasks = async () => {
    setAutoDirectorActionLoadingKey('create_storyline_decision_tasks')
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/storyline-diff-decisions/repair-queue`)
      const tasks = res.data?.tasks || []
      await loadProjectModules()
      await loadProductionTasks()
      setTaskCenterOpen(true)
      const skipped = Number(res.data?.skipped_existing || 0)
      const ignored = Number(res.data?.skipped_ignored || 0)
      message.success(`已生成剧情线决策任务：${tasks.length} 项${skipped ? `，跳过已有 ${skipped} 项` : ''}${ignored ? `，忽略误判 ${ignored} 项` : ''}`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '生成剧情线决策任务失败')
    } finally {
      setAutoDirectorActionLoadingKey('')
    }
  }

  const handlePlanningAction = (key: PlanningActionKey, options?: { intent?: any }) => {
    const rollingPlanIntent = options?.intent || (key === 'update_rolling_plan' ? recentFatigueRollingPlanIntent : null)
    const actions: Record<PlanningActionKey, () => void | Promise<void>> = {
      update_rolling_plan: () => runRollingPlan({ intent: rollingPlanIntent || undefined }),
      complete_volume_plan: () => setOutlinePanelOpen(true),
      enter_story_planning: () => setWorkspaceArea('storyPlanning'),
      enter_chapter_writing: () => setWorkspaceArea('chapterWriting'),
      open_outline_tree: () => setOutlineTreeOpen(true),
      future100_audit: () => { void runFuture100SkeletonAudit() },
      future100_generate: () => { void generateFuture100Skeleton() },
      longform_pressure: () => { void runLongformPressureTest() },
      longform_creation_diagnosis: () => { void runLongformCreationDiagnosis() },
      topic_validation: () => { void runTopicValidation() },
      reference_diagnosis: () => { void openReferenceKnowledgeDiagnosis() },
      open_story_assets: () => openStoryAssetsWorkspace(),
      update_story_state: () => openStoryStateEditor(),
      open_quality_revision: () => setWorkspaceArea('qualityRevision'),
      run_first30_retention: () => { void runFirst30RetentionDiagnosis() },
      create_first30_repair: () => { void createFirst30RetentionRepairQueue() },
      run_reader_trial_review: () => { void runReaderTrialReview() },
      create_reader_trial_repair: () => { void createReaderTrialRepairQueue() },
      create_delivery_risk_repair: () => { void createDeliveryRiskRepairQueue(options?.intent?.payload) },
      record_storyline_diff_decision: () => { void recordStorylineDiffDecision(options?.intent) },
      create_storyline_decision_tasks: () => { void createStorylineDecisionTasks() },
      open_task_center: () => setTaskCenterOpen(true),
    }
    return actions[key]?.()
  }

  const acceptCockpitChapterAndContinue = async () => {
    const currentNo = Number(writingCockpitModel.nextChapter?.chapterNo || 0)
    const next = sortedChapters.find(chapter => Number(chapter.chapter_no || 0) > currentNo && !String(chapter.chapter_text || '').replace(/\s/g, '').trim())
      || sortedChapters.find(chapter => Number(chapter.chapter_no || 0) > currentNo)
      || null

    if (!next?.id) {
      message.success('本章已达到交稿条件，当前项目暂无下一章。')
      return
    }

    setWorkspaceArea('chapterWriting')
    const saved = await selectChapterForWriting(Number(next.id))
    if (saved) message.success(`已进入第 ${next.chapter_no} 章。`)
  }

  const handleWritingCockpitAction = (key: WritingCockpitActionKey) => {
    const rawTargetChapterId = writingCockpitModel.nextChapter?.id
    const targetChapterId = rawTargetChapterId != null ? Number(rawTargetChapterId) : undefined
    const targetChapter = targetChapterId
      ? sortedChapters.find(chapter => Number(chapter.id) === targetChapterId)
        || (Number(activeChapter?.id) === targetChapterId ? activeChapter : null)
      : activeChapter
    const targetChapterUpdatedAt = targetChapter?.updated_at || null

    switch (key) {
      case 'open_writing_bible':
        void openWritingBibleEditor()
        break
      case 'open_outline_panel':
        setOutlinePanelOpen(true)
        break
      case 'repair_materials':
        void openMaterialRepairPlan()
        break
      case 'refresh_context_package':
        void loadActiveChapterContextPackage({ chapterId: targetChapterId, updatedAt: targetChapterUpdatedAt })
        break
      case 'open_generation_diagnostics':
        void openGenerationDiagnostics()
        break
      case 'confirm_plan_and_write_draft':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId) {
          void selectChapterForWriting(targetChapterId).then((saved) => {
            if (saved) void generateCurrentChapterProse({ targetChapterId })
          })
        } else {
          void generateCurrentChapterProse()
        }
        break
      case 'build_scene_plan':
        if (targetChapterId) {
          setWorkspaceArea('chapterWriting')
          void selectChapterForWriting(targetChapterId).then((saved) => {
            if (saved) void generateSceneCardsForChapter(targetChapterId)
          })
        } else if (activeChapter) {
          setWorkspaceArea('chapterWriting')
          void generateSceneCardsForActiveChapter()
        } else {
          setOutlinePanelOpen(true)
        }
        break
      case 'write_draft':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId) {
          void selectChapterForWriting(targetChapterId).then((saved) => {
            if (saved) void generateCurrentChapterProse({ targetChapterId })
          })
        } else {
          void generateCurrentChapterProse()
        }
        break
      case 'review_draft':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId && Number(activeChapter?.id) !== targetChapterId) {
          void selectChapterForWriting(targetChapterId).then((saved) => {
            if (saved) void openChapterQualityCardForChapter(targetChapterId)
          })
        } else if (targetChapterId) {
          void openChapterQualityCardForChapter(targetChapterId)
        } else if (activeChapter) {
          void openChapterQualityCard()
        }
        break
      case 'fix_continuity':
        void openContinuityAudit()
        break
      case 'update_canon':
        openStoryStateEditor()
        break
      case 'open_task_center':
        setTaskCenterOpen(true)
        break
      case 'open_story_assets':
        openStoryAssetsWorkspace()
        break
      case 'refresh_current_quality':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId) {
          void refreshProseQualityForChapter(targetChapterId, 'writing_cockpit')
        } else if (activeChapter) {
          void refreshActiveProseQuality('writing_cockpit')
        }
        break
      case 'create_editor_report':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId) {
          void selectTargetChapterForWriting({
            targetChapterId,
            activeChapterId: activeChapter?.id,
            selectChapterForWriting,
          }).then((saved) => {
            if (saved) void createEditorReportForChapter(targetChapterId)
          })
        } else {
          void createEditorReport()
        }
        break
      case 'apply_editor_revision': {
        setWorkspaceArea('chapterWriting')
        const report = latestCockpitEditorReport()
        if (!report) {
          message.warning('还没有可用于修订的编辑报告。')
          setRightPanelOpen(true)
          setRightPanelTab('editorReports')
          break
        }
        void selectTargetChapterForWriting({
          targetChapterId,
          activeChapterId: activeChapter?.id,
          selectChapterForWriting,
        }).then((saved) => {
          if (saved) void applyEditorRevision(report, { skipConfirm: true, targetChapterId, autoStoryState: false })
        })
        break
      }
      case 'sync_story_state':
        void syncStoryStateForChapter(targetChapterId)
        break
      case 'accept_chapter_and_continue':
        void acceptCockpitChapterAndContinue()
        break
      case 'open_editor_reports':
        setRightPanelOpen(true)
        setRightPanelTab('editorReports')
        break
      case 'open_version_history':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId && Number(activeChapter?.id) !== targetChapterId) {
          void selectTargetChapterForWriting({
            targetChapterId,
            activeChapterId: activeChapter?.id,
            selectChapterForWriting,
          }).then((saved) => {
            if (!saved) return
            setRightPanelOpen(true)
            setRightPanelTab('versions')
          })
          break
        }
        setRightPanelOpen(true)
        setRightPanelTab('versions')
        break
    }
  }

  const handleAutoCreationDirectorAction = (action: AutoCreationDirectorAction) => {
    if (action.disabled) return
    if (action.modelCall) setAutoDirectorActionLoadingKey(String(action.key))

    if (action.area === 'planning' || action.area === 'assets') {
      if (action.key === 'open_story_assets') {
        openStoryAssetsWorkspace()
        setAutoDirectorActionLoadingKey('')
        return
      }
      if (action.key === 'update_rolling_plan' && (action.payload?.source === 'batch_brief_repair' || action.payload?.source === 'recent_fatigue_repair')) {
        void Promise.resolve(handlePlanningAction(action.key as PlanningActionKey, { intent: action.payload }))
          .finally(() => setAutoDirectorActionLoadingKey(''))
        return
      }
      void Promise.resolve(handlePlanningAction(action.key as PlanningActionKey))
        .finally(() => setAutoDirectorActionLoadingKey(''))
      return
    }

    if (action.area === 'writing' || action.area === 'quality') {
      void Promise.resolve(handleWritingCockpitAction(action.key as WritingCockpitActionKey))
        .finally(() => setAutoDirectorActionLoadingKey(''))
      return
    }

    if (action.key === 'review_governance_closure') {
      setTaskCenterOpen(true)
      const repairRunId = Number(action.payload?.repairAuditRunId || 0)
      const repairRun = repairRunId ? runRecords.find(run => Number(run.id) === repairRunId) : null
      if (repairRun) {
        void Promise.resolve(generateLongformRepairAuditSummary(repairRun))
          .finally(() => setAutoDirectorActionLoadingKey(''))
      } else {
        message.info('已打开任务中心，请逐项处理治理闭环任务。')
        setAutoDirectorActionLoadingKey('')
      }
      return
    }

    if (action.key === 'open_task_center') {
      setTaskCenterRecoveryFocus(safeBatchRecoveryFocusFromPayload(action.payload))
      setTaskCenterOpen(true)
      setAutoDirectorActionLoadingKey('')
      return
    }

    if (action.key === 'start_safe_batch_generation') {
      const guardrail = autoCreationDirectorModel.batchGuardrail
      if (guardrail.status !== 'ready' || guardrail.safeChapterCount <= 0) {
        message.warning('连续生产护栏尚未通过，先处理阻塞或谨慎项。')
        setAutoDirectorActionLoadingKey('')
        return
      }
      void stepGenerateProse({
        limit: autoCreationDirectorModel.batchGuardrail.safeChapterCount,
        allowedChapterNos: autoCreationDirectorModel.batchGuardrail.nextBatchBrief.chapters.map(chapter => chapter.chapterNo),
        source: 'auto_creation_safe_batch',
        longformCompass: autoCreationDirectorModel.longformCompass,
        longformBattleContext: autoCreationDirectorModel.longformBattleDesk,
        chapterLaunchGate: autoCreationDirectorModel.chapterLaunchGate,
        nextBatchBrief: autoCreationDirectorModel.batchGuardrail.nextBatchBrief,
        batchPreflight: autoCreationDirectorModel.batchGuardrail.preflight.inputSnapshot,
        millionWordRunway: autoCreationDirectorModel.millionWordRunway,
      })
        .finally(() => setAutoDirectorActionLoadingKey(''))
      return
    }

    if (action.key === 'create_safe_batch_risk_repair') {
      void createSafeBatchRiskRepairQueue()
      return
    }

    if (action.key === 'create_style_sample_batch_repair') {
      void createStyleSampleBatchRepairQueue()
      return
    }

    if (action.key === 'create_recovery_evidence_governance_queue') {
      void createRecoveryEvidenceGovernanceQueue(action.payload)
      return
    }

    if (action.key === 'create_script_room_repair') {
      void createScriptRoomRepairQueue()
      return
    }

    if (action.key === 'create_delivery_risk_repair') {
      void createDeliveryRiskRepairQueue(action.payload)
      return
    }

    if (action.key === 'select_model') {
      message.info('请先在顶部选择一个可用模型。')
      setAutoDirectorActionLoadingKey('')
    }
  }

  const handleSerialPipelineAction = (key: string) => {
    switch (key) {
      case 'open_writing_bible':
        openStoryAssetsWorkspace()
        void openWritingBibleEditor()
        break
      case 'enter_story_planning':
        setWorkspaceArea('storyPlanning')
        break
      case 'confirm_plan_and_write_draft':
        handleWritingCockpitAction('confirm_plan_and_write_draft')
        break
      case 'refresh_current_quality':
        handleWritingCockpitAction('refresh_current_quality')
        break
      case 'create_editor_report':
        handleWritingCockpitAction('create_editor_report')
        break
      case 'apply_editor_revision':
        handleWritingCockpitAction('apply_editor_revision')
        break
      case 'sync_story_state':
        handleWritingCockpitAction('sync_story_state')
        break
      case 'start_safe_batch':
        setWorkspaceArea('autoCreation')
        handleAutoCreationDirectorAction({ key: 'start_safe_batch_generation' } as AutoCreationDirectorAction)
        break
      case 'open_longform_governance':
        setWorkspaceArea('productionOps')
        void openLongformProductionTrends()
        break
      default:
        if (serialPipelineModel.primaryAction.workspace_area) setWorkspaceArea(serialPipelineModel.primaryAction.workspace_area as WorkspaceArea)
    }
  }

  const renderSerialPipeline = () => {
    if (!serialPipelineModel.visible) return null
    const tagColor = (tone: string) => {
      if (tone === 'done') return 'green'
      if (tone === 'active') return 'blue'
      if (tone === 'blocked') return 'red'
      return 'default'
    }

    return (
      <div className="novel-serial-pipeline">
        <div className="novel-serial-pipeline-main">
          <Space direction="vertical" size={2} className="novel-serial-pipeline-copy">
            <Text strong>小说流水线 · {serialPipelineModel.currentStageLabel || '待同步'}</Text>
            <Text type="secondary">{serialPipelineModel.summary || '按创建契约、规划、正文、验收、批次、治理推进。'}</Text>
          </Space>
          <Button
            size="small"
            type="primary"
            onClick={() => handleSerialPipelineAction(serialPipelineModel.primaryAction.key)}
          >
            {serialPipelineModel.primaryAction.label || '查看下一步'}
          </Button>
        </div>
        {serialPipelineModel.currentIssues.length > 0 && (
          <div className="novel-serial-pipeline-issues">
            {serialPipelineModel.currentIssues.map(issue => (
              <span key={`${issue.status}-${issue.label}`} className={`novel-serial-pipeline-issue is-${issue.status}`}>
                <strong>{issue.label}</strong>
                <span>{issue.detail}</span>
              </span>
            ))}
          </div>
        )}
        {serialPipelineModel.currentAgentSteps.length > 0 && (
          <div className="novel-serial-pipeline-agent-strip" aria-label="当前阶段能力链">
            {serialPipelineModel.currentAgentSteps.map(agent => (
              <button
                key={agent.key}
                type="button"
                className="novel-serial-pipeline-agent"
                onClick={() => handleSerialPipelineAction(agent.actionKey || serialPipelineModel.primaryAction.key)}
                title={agent.description}
              >
                <span className="novel-serial-pipeline-agent-name">{agent.label}</span>
                {agent.agent && <span className="novel-serial-pipeline-agent-id">{agent.agent}</span>}
              </button>
            ))}
          </div>
        )}
        <div className="novel-serial-pipeline-stages">
          {serialPipelineModel.stageCards.map(stage => (
            <button
              key={stage.key}
              type="button"
              className={`novel-serial-pipeline-stage is-${stage.tone}`}
              onClick={() => handleSerialPipelineAction(stage.action.key)}
              title={stage.summary}
            >
              <span className="novel-serial-pipeline-stage-label">{stage.label}</span>
              <Tag color={tagColor(stage.tone)} bordered={false}>
                {stage.statusLabel}
              </Tag>
              {(stage.blockerCount > 0 || stage.warningCount > 0) && (
                <span className="novel-serial-pipeline-stage-risk">
                  {stage.blockerCount ? `阻${stage.blockerCount}` : `提${stage.warningCount}`}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const activeChapterSceneCards = (
    activeChapter && Array.isArray(activeChapter.scene_list) && activeChapter.scene_list.length > 0
      ? activeChapter.scene_list
      : (activeChapter && Array.isArray(activeChapter.scene_breakdown) ? activeChapter.scene_breakdown : [])
  )

  const writingRecommendation = (() => {
    const materialScore = activeChapterDiagnosticsData?.material_score
    const materialReady = !materialScore || Boolean(materialScore.can_generate)
    const materialRecommendations = Array.isArray(materialScore?.recommendations)
      ? materialScore.recommendations.filter(Boolean)
      : []

    return buildNovelWritingRecommendation({
      materialReady,
      materialRecommendations,
      sceneCardCount: activeChapterSceneCards.length,
      activeWordCount: wc(activeChapter?.chapter_text),
      deliveryRiskCarryOverActionCount: [
        ...(writingCockpitModel.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.requiredActions || []),
        ...(writingCockpitModel.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.openingActions || []),
        ...(writingCockpitModel.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.middleActions || []),
        ...(writingCockpitModel.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.endingActions || []),
        ...(writingCockpitModel.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.forbiddenRepeats || []),
      ].length,
      qualityContinuitySceneMapCount: writingCockpitModel.chapterPlanningDesk.qualityContinuitySceneMap.length,
    })
  })()

  const cockpitPrimaryActionOverride: WritingCockpitPrimaryActionOverride | null = (() => {
    if (!activeChapter || workspaceArea !== 'chapterWriting') return null

    switch (writingRecommendation.key) {
      case 'diagnostics':
        return {
          label: writingRecommendation.label,
          reason: writingRecommendation.reason,
          actionKey: 'open_generation_diagnostics',
          onClick: () => { void openGenerationDiagnostics() },
        }
      case 'scene_cards':
        return {
          label: writingRecommendation.label,
          reason: writingRecommendation.reason,
          actionKey: 'build_scene_plan',
          onClick: () => { void generateSceneCardsForActiveChapter() },
        }
      case 'repair_generate':
        return {
          label: writingRecommendation.label,
          reason: writingRecommendation.reason,
          actionKey: 'repair_materials',
          onClick: repairContextAndGenerateCurrentChapter,
        }
      case 'generate':
        return {
          label: writingRecommendation.label,
          reason: writingRecommendation.reason,
          actionKey: 'write_draft',
          onClick: () => { void generateCurrentChapterProse() },
        }
      case 'quality_card':
        return {
          label: writingRecommendation.label,
          reason: writingRecommendation.reason,
          actionKey: 'refresh_current_quality',
          onClick: openChapterQualityCard,
        }
      default:
        return null
    }
  })()

  const renderWorkspaceArea = () => {
    if (workspaceArea === 'autoCreation') {
      return (
        <AutoCreationDirectorWorkspace
          model={autoCreationDirectorModel}
          loadingActionKey={autoDirectorActionLoadingKey}
          onAction={handleAutoCreationDirectorAction}
          onStageAction={handleAutoCreationDirectorAction}
          onSelectChapter={(chapterNo) => {
            const chapter = sortedChapters.find(item => Number(item.chapter_no) === Number(chapterNo))
            if (!chapter) return
            void selectChapterForWriting(chapter.id)
          }}
        />
      )
    }

    if (workspaceArea === 'storyPlanning') {
      return (
        <StoryPlanningWorkspace
          model={planningWorkspaceModel}
          selectedModelId={selectedModelId}
          loadingKey={planningLoadingKey}
          onAction={handlePlanningAction}
          onSelectChapter={(chapterNo) => {
            const chapter = sortedChapters.find(item => Number(item.chapter_no) === Number(chapterNo))
            if (!chapter) return
            void selectChapterForWriting(chapter.id)
          }}
        />
      )
    }

    if (workspaceArea === 'chapterWriting') {
      return (
        <WorkspaceCenter
          isEmptyProject={isEmptyProject}
          selectedProject={selectedProject}
          activeChapter={activeChapter}
          materialScore={activeChapterDiagnosticsData?.material_score}
          worldbuildingCount={worldbuilding.length}
          characterCount={characters.length}
          outlineCount={outlines.length}
          streamingChapterId={streamingChapterId}
          streamingText={streamingText}
          streamingProgress={streamingProgress}
          streamingPercent={streamingPercent}
          generationPipeline={generationPipeline}
          streamingEndRef={streamingEndRef}
          proseEditorRef={proseEditorRef}
          saveStatus={saveStatus}
          planning={planning}
          incubatingOriginal={incubatingOriginal}
          generatingProse={generatingProse}
          generatingSceneCards={generatingSceneCards}
          preDraftBriefLoading={commercialToolLoading === 'preDraftBrief' || commercialToolLoading === 'preDraftBriefConfirm'}
          styleSampleActionLoading={['styleSampleLock', 'styleSampleReplace', 'styleSampleDisable'].includes(commercialToolLoading)}
          diagnosticsLoading={diagnosticsLoading}
          pipelineLoading={pipelineLoading}
          editorReportLoading={editorReportLoading}
          onRunPlan={runPlan}
          onCreateOutline={() => openEditor('outline')}
          onCreateChapter={() => openEditor('chapter')}
          onRunOriginalIncubator={() => { void runOriginalIncubator() }}
          onOpenReferenceConfig={() => setReferenceConfigOpen(true)}
          onOpenWritingBibleEditor={() => { void openWritingBibleEditor() }}
          onGenerateCurrentChapterProse={() => generateCurrentChapterProse()}
          onRepairAndGenerateCurrentChapter={repairContextAndGenerateCurrentChapter}
          onGenerateSceneCards={() => generateSceneCardsForActiveChapter()}
          onBuildPreDraftBrief={() => { void buildPreDraftBriefForActiveChapter() }}
          onConfirmPreDraftBrief={() => { void confirmPreDraftBriefForActiveChapter() }}
          onSavePreDraftBrief={(brief) => savePreDraftBriefForActiveChapter(brief)}
          onLockStyleSamples={() => { void applyStyleSampleActionForActiveChapter('lock') }}
          onReplaceStyleSamples={() => { void applyStyleSampleActionForActiveChapter('replace') }}
          onDisableStyleSamples={() => { void applyStyleSampleActionForActiveChapter('disable') }}
          onOpenGenerationDiagnostics={openGenerationDiagnostics}
          onOpenQualityCard={openChapterQualityCard}
          onStartChapterPipeline={startChapterPipeline}
          onCreateEditorReport={createEditorReport}
          onEditActiveChapter={() => activeChapter && openEditor('chapter', activeChapter)}
          onOpenStoryAssets={openStoryAssetsWorkspace}
          generationWordTargetMode={chapterWordTargetMode}
          generationTargetWordCount={chapterTargetWordCount}
          onGenerationWordTargetModeChange={setChapterWordTargetMode}
          onGenerationTargetWordCountChange={setChapterTargetWordCount}
          writingRecommendation={writingRecommendation}
          writingQueue={writingCockpitModel.writingQueue}
          onSelectWritingQueueChapter={(chapterId) => { void selectChapterForWriting(chapterId) }}
          onRepairWritingQueuePlan={repairWritingQueuePlan}
          onRepairWritingQueuePlanBatch={repairWritingQueuePlanBatch}
          chapterAcceptanceDesk={writingCockpitModel.chapterAcceptanceDesk}
          chapterHandoffDesk={writingCockpitModel.chapterHandoffDesk}
          deliveryActionLoading={proseQualityLoading || editorReportLoading || generatingProse}
          onDeliveryAction={handleWritingCockpitAction}
          onChapterTextChange={(next) => {
            const chapterId = activeChapterId
            setChapters(prev => prev.map(c => c.id === chapterId ? { ...c, chapter_text: next } : c))
            scheduleSave(chapterId, next)
          }}
        />
      )
    }

    if (workspaceArea === 'storyAssets') {
      return (
        <StoryAssetsWorkspace
          projectId={projectId}
          activeChapter={activeChapter}
          selectedModelId={selectedModelId}
          projectSettings={projectSettings}
          worldbuildingCount={worldbuilding.length}
          characterCount={characters.length}
          outlineCount={outlines.length}
          hasWritingBible={Boolean(selectedProject?.reference_config?.writing_bible)}
          focusDiscoveredAssetsToken={storyAssetsFocusDiscoveredToken}
          onOpenWritingBibleEditor={() => { void openWritingBibleEditor() }}
          onOpenStoryStateEditor={openStoryStateEditor}
          onOpenCreativeCards={() => setCreativeCardsOpen(true)}
          onOpenReferenceEngineering={() => setReferenceEngineeringOpen(true)}
          onAssetsApplied={() => { void loadProjectModules() }}
        />
      )
    }

    const groups: Record<Exclude<WorkspaceArea, 'autoCreation' | 'storyPlanning' | 'chapterWriting' | 'storyAssets'>, {
      title: string
      desc: string
      highlightTitle?: string
      highlightDesc?: string
      highlightTarget?: number
      highlightAction?: () => void
      highlightLoading?: boolean
      highlightDisabled?: boolean
      actions: Array<{ label: string; onClick: () => void; loading?: boolean; primary?: boolean; disabled?: boolean }>
    }> = {
      qualityRevision: {
        title: '质检修订',
        desc: '检查当前章、前后文连续性、全书一致性、审阅批注和质量基准。',
        actions: [
          { label: '当前章交稿质检', onClick: openChapterQualityCard, primary: true, disabled: !activeChapter },
          { label: '编辑报告', onClick: createEditorReport, loading: editorReportLoading, disabled: !activeChapter || !selectedModelId },
          { label: '章节审阅批注', onClick: () => setReviewAnnotationsOpen(true) },
          { label: '全书一致性图谱', onClick: () => setConsistencyGraphOpen(true) },
          { label: '质量评测基准', onClick: () => setQualityBenchmarkOpen(true) },
          { label: '全书连续性检查', onClick: () => { void openContinuityAudit() }, loading: commercialToolLoading === 'continuityAudit' },
          { label: '全书总检', onClick: () => { void runBookReview() }, loading: bookReviewLoading, disabled: !selectedModelId },
          { label: '当前章参考迁移计划', onClick: () => { void runReferenceMigrationPlan() }, loading: commercialToolLoading === 'migrationPlan', disabled: !activeChapter },
        ],
      },
      productionOps: {
        title: '生产运营',
        desc: '管理章节群、任务队列、生产趋势、Agent 审计、模型诊断和交付导出。',
        highlightTitle: '无人值守到目标章',
        highlightDesc: '按写前蓝图、场景卡、正文、复检和任务中心自动推进；达标后进入下一章。',
        highlightTarget: unattendedTargetChapter,
        highlightAction: startUnattendedWritingGoal,
        highlightLoading: commercialToolLoading === 'unattendedGoal',
        highlightDisabled: !selectedModelId,
        actions: [
          { label: '章节生产台', onClick: openProductionDesk, primary: true, loading: commercialToolLoading === 'productionDesk' },
          { label: '生产看板', onClick: () => { void openProductionDashboard() }, loading: dashboardLoading },
          { label: '任务中心', onClick: () => setTaskCenterOpen(true) },
          { label: '智能章节群入队', onClick: () => { void startReadyChapterGroupGeneration() }, loading: commercialToolLoading === 'readyGroup', disabled: !selectedModelId },
          { label: '普通章节群入队', onClick: () => { void startChapterGroupGeneration() }, disabled: !selectedModelId },
          { label: '后台任务队列', onClick: openRunQueue, loading: commercialToolLoading === 'queue' },
          { label: '成本质量仪表盘', onClick: openProductionMetrics, loading: commercialToolLoading === 'metrics' },
          { label: 'Agent 调用审计', onClick: () => setAgentAuditOpen(true) },
          { label: '商业工具箱', onClick: () => setCommercialToolsOpen(true) },
          { label: '交付导出', onClick: () => setExportDeliveryOpen(true) },
        ],
      },
    }
    const group = groups[workspaceArea]
    return (
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#f6f8fb', padding: 20 }}>
        <Card title={group.title} extra={<Button onClick={() => setWorkspaceArea('storyPlanning')}>返回故事规划</Button>}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Text type="secondary">{group.desc}</Text>
            {group.highlightTitle && (
              <Card size="small" title={group.highlightTitle}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{group.highlightDesc}</Text>
                  <Space.Compact style={{ width: '100%' }}>
                    <InputNumber
                      min={1}
                      precision={0}
                      value={group.highlightTarget}
                      onChange={(value) => setUnattendedTargetChapter(Number(value || 1))}
                      style={{ width: 160 }}
                      addonBefore="到第"
                      addonAfter="章"
                    />
                    <Button
                      type="primary"
                      loading={group.highlightLoading}
                      disabled={group.highlightDisabled}
                      onClick={group.highlightAction}
                    >
                      启动无人值守
                    </Button>
                  </Space.Compact>
                </Space>
              </Card>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {group.actions.map(action => (
                <Button
                  key={action.label}
                  block
                  type={action.primary ? 'primary' : 'default'}
                  loading={action.loading}
                  disabled={action.disabled}
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </Space>
        </Card>
      </div>
    )
  }

  return (
    <div
      className={`novel-project-workspace ${isWritingFocusMode ? 'novel-workspace-focus-mode' : ''}`}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', background: '#fff' }}
    >

      {/* ═══ TOP BAR ═══ */}
      <div className="novel-workspace-topbar" style={{
        flexShrink: 0, height: 48, display: 'flex', alignItems: 'center',
        padding: '0 16px', background: '#fff', borderBottom: '1px solid #f0f0f0', gap: 10,
      }}>
        <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate('/novel')} />
        <Title level={5} style={{ margin: 0, minWidth: 120, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedProject?.title || '小说项目工作台'}
        </Title>
        <Select
          className="novel-workspace-model-select"
          size="small" value={selectedModelId}
          onChange={(v) => setSelectedModelId(v)}
          options={modelOptions}
          popupMatchSelectWidth={440}
          placeholder="选择模型"
        />
        <Space className="novel-workspace-area-tabs" size={4} style={{ flex: 1, minWidth: 0 }}>
          {workspaceAreaTabs.map(tab => (
            <Button
              key={tab.key}
              size="small"
              type="text"
              icon={tab.icon}
              className={`novel-mode-tab novel-mode-tab-${tab.key} ${workspaceArea === tab.key ? 'is-active' : ''}`}
              onClick={() => setWorkspaceArea(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </Space>
        <Tooltip title="进入无人值守生产入口">
          <Button
            className={`novel-unattended-topbar-entry ${workspaceArea === 'productionOps' ? 'is-active' : ''}`}
            size="small"
            icon={<RocketOutlined />}
            onClick={() => setWorkspaceArea('productionOps')}
          >
            无人值守
          </Button>
        </Tooltip>
        <Space className="novel-workspace-topbar-meta" size={6}>
          {referenceSummary.count > 0 && (
            <Tag color="purple" bordered={false}>{referenceSummary.strengthLabel} · {referenceSummary.count} 部参考</Tag>
          )}
          {commercialReadiness && (
            <Tooltip title={(commercialReadiness.next_actions || []).slice(0, 3).join('；') || '查看商业化就绪度'}>
              <Tag
                color={commercialReadiness.can_batch_generate ? 'green' : Number(commercialReadiness.score || 0) >= 70 ? 'gold' : 'red'}
                bordered={false}
                style={{ cursor: 'pointer' }}
                onClick={() => showCommercialReadinessModal(commercialReadiness)}
              >
                就绪 {commercialReadiness.score ?? '-'}%
              </Tag>
            </Tooltip>
          )}
        </Space>
        <Tooltip title="打开当前节点的创作参谋建议">
          <Button
            type="text"
            size="small"
            icon={<BulbOutlined />}
            onClick={openCreativeAssistant}
          >
            创作参谋
          </Button>
        </Tooltip>
        {workspaceArea === 'chapterWriting' && (
          <Button
            className="novel-workspace-focus-toggle"
            type={isWritingFocusMode ? 'primary' : 'default'}
            size="small"
            icon={isWritingFocusMode ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={() => setFocusWritingMode(prev => !prev)}
          >
            {isWritingFocusMode ? '退出专注' : '专注写作'}
          </Button>
        )}
        <Tooltip title="查看运行中任务和历史运行记录">
          <Badge className="novel-workspace-task-entry" count={activeTasks.length + activeKnowledgeJobCount} size="small">
            <Button type="text" size="small" icon={<ClockCircleOutlined />} onClick={() => setTaskCenterOpen(true)}>
              任务中心
            </Button>
          </Badge>
        </Tooltip>
        <Tooltip title="刷新">
          <Button type="text" size="small" icon={<ReloadOutlined />} loading={loading} onClick={async () => { if (await flushPendingSave()) await loadProjectModules() }} />
        </Tooltip>
      </div>

      {/* ═══ BODY: 3-column layout ═══ */}
      <div className="novel-workspace-body" style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        <div className={directoryShellClassName} aria-hidden={isWritingFocusMode || undefined}>
          <ChapterDirectorySidebar
            collapsed={directoryCollapsed}
            onCollapsedChange={setDirectoryCollapsed}
            planningMode={workspaceArea === 'storyPlanning'}
            selectedModelId={selectedModelId}
            stepOutlineLoading={stepOutlineLoading}
            stepProseLoading={stepProseLoading}
            stepRepairLoading={stepRepairLoading}
            incubatingOriginal={incubatingOriginal}
            bookReviewLoading={bookReviewLoading}
            commercialToolLoading={commercialToolLoading}
            proseProgress={proseProgress}
            chapters={sortedChapters}
            proseChapterCount={proseChapters.length}
            activeChapterId={activeChapterId}
            referenceCount={referenceSummary.count}
            outlineCount={outlines.length}
            worldbuildingCount={worldbuilding.length}
            characterCount={characters.length}
            hasWritingBible={Boolean(selectedProject?.reference_config?.writing_bible)}
            materialScore={activeChapterDiagnosticsData?.material_score}
            commercialReadiness={commercialReadiness}
            activeTaskCount={activeTasks.length + activeKnowledgeJobCount}
            onOpenOutlinePanel={() => setOutlinePanelOpen(true)}
            onGenerateProse={stepGenerateProse}
            onCancelGenerateProse={cancelStepGenerateProse}
            onRunRepair={stepRunRepair}
            onOpenReferenceConfig={() => setReferenceConfigOpen(true)}
            onOpenReferenceEngineering={() => setReferenceEngineeringOpen(true)}
            onOpenCreativeCards={() => setCreativeCardsOpen(true)}
            onRunOriginalIncubator={() => { void runOriginalIncubator() }}
            onOpenWritingBibleEditor={() => { void openWritingBibleEditor() }}
            onOpenMaterialRepairPlan={() => { void openMaterialRepairPlan() }}
            onStartReadyChapterGroupGeneration={() => { void startReadyChapterGroupGeneration() }}
            onStartChapterGroupGeneration={() => { void startChapterGroupGeneration() }}
            onOpenProductionDesk={() => navigate(`/novel/workspace/${projectId}/production`)}
            onOpenTaskCenter={() => setTaskCenterOpen(true)}
            onOpenConsistencyGraph={() => setConsistencyGraphOpen(true)}
            onOpenQualityBenchmark={() => setQualityBenchmarkOpen(true)}
            onRunBookReview={() => { void runBookReview() }}
            onOpenCommercialTools={() => setCommercialToolsOpen(true)}
            onOpenExportDelivery={() => setExportDeliveryOpen(true)}
            onOpenOutlineTree={() => setOutlineTreeOpen(true)}
            onOpenChapterDrawer={() => setChapterDrawerOpen(true)}
            onCreateChapter={() => openEditor('chapter')}
            onSelectChapter={(chapterId) => { void selectChapterForWriting(chapterId) }}
          />
        </div>

        <div className="novel-workspace-main" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="novel-workspace-cockpit" style={{ flexShrink: 1, minHeight: 0 }}>
            <WritingCockpitPanel
              model={writingCockpitModel}
              loading={stepProseLoading || generatingProse || generatingSceneCards || diagnosticsLoading || contextPackageLoading || commercialToolLoading === 'storyStateSync'}
              forceCollapsed={isWritingFocusMode}
              primaryActionOverride={cockpitPrimaryActionOverride}
              onOpenProductionOps={() => setWorkspaceArea('productionOps')}
              onAction={handleWritingCockpitAction}
            />
          </div>
          {renderSerialPipeline()}
          <Suspense fallback={null}>
            {renderWorkspaceArea()}
          </Suspense>
        </div>

        <div className={rightPanelOpen ? 'novel-workspace-reference-shell is-open' : 'novel-workspace-reference-shell'}>
          <ReferencePanel
            open={rightPanelOpen}
            activeTab={rightPanelTab}
            worldbuilding={worldbuilding}
            characters={characters}
            outlines={outlines}
            selectedProject={selectedProject}
            projectId={projectId}
            selectedModelId={selectedModelId}
            referenceReports={referenceReports}
            proseQualityReports={proseQualityReports}
            editorReports={editorReports}
            editorRevisionReports={editorRevisionReports}
            bookReviews={bookReviews}
            activeChapter={activeChapter}
            activeChapterId={activeChapterId}
            activeChapterUpdatedAt={activeChapter?.updated_at || ''}
            chapterVersions={chapterVersions}
            chapterVersionsLoading={chapterVersionsLoading}
            proseQualityLoading={proseQualityLoading}
            rollingBackVersionId={rollingBackVersionId}
            onClose={() => setRightPanelOpen(false)}
            onOpen={() => setRightPanelOpen(true)}
            onTabChange={setRightPanelTab}
            onEdit={(kind, item) => openEditor(kind, item)}
            onOpenCreativeCards={() => setCreativeCardsOpen(true)}
            onOpenStoryStateEditor={openStoryStateEditor}
            onApplyEditorRevision={applyEditorRevision}
            onRefreshProseQuality={() => refreshActiveProseQuality('manual_refresh')}
            onRollbackVersion={rollbackChapterVersion}
            onOpenVersionDetail={setChapterVersionDetail}
          />
        </div>
      </div>

      <CreativeAssistantPanel
        open={creativeAssistantOpen}
        loading={creativeAssistantLoading}
        mode={creativeAssistantMode}
        result={creativeAssistantResult}
        project={selectedProject}
        activeChapter={activeChapter}
        selectedText={creativeAssistantSelectedText}
        contextPackage={activeContextPackageData}
        reviews={reviews}
        runRecords={runRecords}
        error={creativeAssistantError}
        onClose={() => setCreativeAssistantOpen(false)}
        onModeChange={setCreativeAssistantMode}
        onRun={runCreativeAssistant}
        onCopyCard={copyCreativeAssistantCard}
      />

      <DeferredWorkspaceSurfaces>
        <EditorModal
          editorKind={editorKind}
          form={editorForm}
          onCancel={() => { setEditorKind(null); setEditorItem(null) }}
          onSubmit={submitEditor}
        />

        <VersionDetailModal
          version={chapterVersionDetail}
          activeChapter={activeChapter}
          showOnlyDiff={showOnlyDiff}
          onToggleDiffMode={() => setShowOnlyDiff(prev => !prev)}
          onClose={() => setChapterVersionDetail(null)}
          onAcceptVersion={acceptChapterVersion}
          onMergeVersion={mergeChapterVersion}
          acceptingVersionId={rollingBackVersionId}
        />

        <AgentExecutionModal
          execution={agentExecution}
          onClose={() => setAgentExecution(null)}
        />

        <ReferenceConfigModal
          open={referenceConfigOpen}
          projectId={projectId}
          config={selectedProject?.reference_config || {}}
          onClose={() => setReferenceConfigOpen(false)}
          onSaved={(config) => setSelectedProject((prev: any) => prev ? { ...prev, reference_config: config } : prev)}
        />

      <ReferenceEngineeringModal
        open={referenceEngineeringOpen}
        projectId={projectId}
        referenceConfig={selectedProject?.reference_config || {}}
        referenceReports={referenceReports}
        onClose={() => setReferenceEngineeringOpen(false)}
        onOpenReferenceConfig={() => {
          setReferenceEngineeringOpen(false)
          setReferenceConfigOpen(true)
        }}
      />

      <CreativeCardsModal
        open={creativeCardsOpen}
        selectedProject={selectedProject}
        worldbuilding={worldbuilding}
        characters={characters}
        outlines={outlines}
        chapters={sortedChapters}
        activeChapterId={activeChapterId}
        onClose={() => setCreativeCardsOpen(false)}
        onEdit={(kind, item) => {
          setCreativeCardsOpen(false)
          openEditor(kind, item)
        }}
        onOpenWritingBible={() => {
          setCreativeCardsOpen(false)
          void openWritingBibleEditor()
        }}
        onOpenStoryState={() => {
          setCreativeCardsOpen(false)
          openStoryStateEditor()
        }}
      />

      <ConsistencyGraphModal
        open={consistencyGraphOpen}
        selectedProject={selectedProject}
        chapters={sortedChapters}
        characters={characters}
        outlines={outlines}
        audit={continuityAudit}
        auditLoading={continuityAuditLoading}
        onClose={() => setConsistencyGraphOpen(false)}
        onRefreshAudit={refreshConsistencyAudit}
        onOpenStoryState={() => {
          setConsistencyGraphOpen(false)
          openStoryStateEditor()
        }}
        onSelectChapter={(chapterId) => {
          setConsistencyGraphOpen(false)
          void selectChapterForWriting(chapterId)
        }}
      />

      <QualityBenchmarkModal
        open={qualityBenchmarkOpen}
        projectId={projectId}
        selectedModelId={selectedModelId}
        chapters={sortedChapters}
        reviews={reviews}
        runRecords={runRecords}
        continuityAudit={continuityAudit}
        benchmarkLoading={commercialToolLoading === 'benchmark'}
        onClose={() => setQualityBenchmarkOpen(false)}
        onRunBenchmark={runQualityBenchmark}
        onRefreshContinuity={refreshConsistencyAudit}
        onSelectChapter={(chapterId) => {
          setQualityBenchmarkOpen(false)
          void selectChapterForWriting(chapterId)
        }}
        onChanged={() => { void loadProjectModules() }}
      />

      <ReviewAnnotationsDrawer
        open={reviewAnnotationsOpen}
        projectId={projectId}
        onClose={() => setReviewAnnotationsOpen(false)}
        onSelectChapter={(chapterId) => {
          void selectChapterForWriting(chapterId)
        }}
        onApplyEditorRevision={applyEditorRevision}
        onChanged={() => { void loadProjectModules() }}
      />

      <AgentAuditDrawer
        open={agentAuditOpen}
        projectId={projectId}
        onClose={() => setAgentAuditOpen(false)}
        onSelectChapter={(chapterId) => {
          void selectChapterForWriting(chapterId)
        }}
        onOpenTaskCenter={() => setTaskCenterOpen(true)}
      />

      <ExportDeliveryModal
        open={exportDeliveryOpen}
        projectId={projectId}
        onClose={() => setExportDeliveryOpen(false)}
        onOpenQualityBenchmark={() => {
          setExportDeliveryOpen(false)
          setQualityBenchmarkOpen(true)
        }}
        onOpenConsistencyGraph={() => {
          setExportDeliveryOpen(false)
          setConsistencyGraphOpen(true)
        }}
        onOpenTaskCenter={() => {
          setExportDeliveryOpen(false)
          setTaskCenterOpen(true)
        }}
      />

      <Modal
        open={commercialToolsOpen}
        title="商业级自动写作工具箱"
        width={920}
        onCancel={() => setCommercialToolsOpen(false)}
        footer={<Button type="primary" onClick={() => setCommercialToolsOpen(false)}>关闭</Button>}
      >
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="这些工具用于生产治理：稳定性、成本、质量、审批、相似度、滚动规划和提示词版本。"
            description="核心写作、审稿、规划、参考迁移会调用大模型；机械质检、传播债务、模型诊断、备份和模板默认是本地规则/配置工具，带 AI 前缀的按钮才会调用当前选择的大模型。"
          />
          <Card size="small" title="自然语言创作指令台">
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>输入一句操作意图，系统会用本地指令解析器转成生产步骤；低风险检查类任务可以直接执行。</Text>
              <Button block type="primary" loading={commercialToolLoading === 'creativeCommand'} onClick={() => setCreativeCommandOpen(true)}>打开本地创作指令台</Button>
            </Space>
          </Card>
          <Card size="small" title="批量生产模式">
            <Space wrap align="center">
              <Text type="secondary">章节群执行策略</Text>
              <Select
                size="small"
                value={productionMode}
                style={{ width: 220 }}
                options={productionModeOptions}
                onChange={setProductionMode}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                该模式会写入章节群任务，并在任务中心按失败点继续。
              </Text>
            </Space>
          </Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <Card size="small" title="生产稳定性">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Card size="small" title="无人值守到目标章">
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>从当前章开始自动补材料、写正文、复检，达标后进入下一章。</Text>
                    <Space.Compact style={{ width: '100%' }}>
                      <InputNumber
                        min={1}
                        precision={0}
                        value={unattendedTargetChapter}
                        onChange={(value) => setUnattendedTargetChapter(Number(value || 1))}
                        style={{ width: '45%' }}
                        addonBefore="到第"
                        addonAfter="章"
                      />
                      <Button
                        type="primary"
                        loading={commercialToolLoading === 'unattendedGoal'}
                        disabled={!selectedModelId}
                        onClick={startUnattendedWritingGoal}
                      >
                        启动无人值守
                      </Button>
                    </Space.Compact>
                  </Space>
                </Card>
                <Button block loading={commercialToolLoading === 'productionDesk'} onClick={openProductionDesk}>章节生产台</Button>
                <Button block loading={commercialToolLoading === 'materialRepair'} onClick={openMaterialRepairPlan}>材料补齐计划</Button>
                <Button block loading={commercialToolLoading === 'readyGroup'} onClick={startReadyChapterGroupGeneration}>智能章节群入队</Button>
                <Button block loading={commercialToolLoading === 'future100Group'} onClick={startFuture100ChapterGroupGeneration}>从未来100章骨架入队</Button>
                <Button block loading={commercialToolLoading === 'queue'} onClick={openRunQueue}>后台任务队列</Button>
                <Button block loading={commercialToolLoading === 'queueWorker'} onClick={startRunQueueWorker}>启动后台 worker</Button>
                <Button block loading={commercialToolLoading === 'queueStop'} onClick={stopRunQueueWorker}>停止后台 worker</Button>
                <Button block loading={commercialToolLoading === 'queueRecover'} onClick={recoverRunQueue}>恢复后台队列</Button>
                <Button block loading={commercialToolLoading === 'metrics'} onClick={openProductionMetrics}>成本质量仪表盘</Button>
                <Button block loading={commercialToolLoading === 'longformTrends'} onClick={openLongformProductionTrends}>长线生产趋势报表</Button>
                <Button block loading={commercialToolLoading === 'longformRepair'} onClick={createLongformProductionRepairQueue}>生成长线生产修复任务</Button>
                <Button block loading={commercialToolLoading === 'modelDiagnostics'} onClick={openModelDiagnostics}>模型服务诊断（配置）</Button>
                <Button block onClick={() => setAgentAuditOpen(true)}>Agent 调用审计</Button>
                <Button block loading={commercialToolLoading === 'approval'} onClick={openApprovalPolicyEditor}>审批关卡策略</Button>
              </Space>
            </Card>
            <Card size="small" title="质量基准">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button block onClick={openChapterQualityCard}>当前章交稿质检</Button>
                <Button block onClick={() => setQualityBenchmarkOpen(true)}>质量评测基准面板</Button>
                <Button block onClick={() => setReviewAnnotationsOpen(true)}>章节审阅批注</Button>
                <Button block onClick={() => setConsistencyGraphOpen(true)}>全书一致性图谱</Button>
                <Button block loading={commercialToolLoading === 'continuityAudit'} onClick={openContinuityAudit}>全书连续性检查</Button>
                <Button block loading={commercialToolLoading === 'first30Retention'} onClick={runFirst30RetentionDiagnosis}>前30章留存诊断</Button>
                <Button block loading={commercialToolLoading === 'first30Repair'} onClick={createFirst30RetentionRepairQueue}>生成前30章留存修复任务</Button>
                <Button block loading={commercialToolLoading === 'mechanicalQa'} onClick={runMechanicalQa}>机械质检规则引擎（本地）</Button>
                <Button block type="primary" loading={commercialToolLoading === 'mechanicalQaLlm'} onClick={runMechanicalQaLlmReview}>AI 复核机械质检</Button>
                <Button block loading={commercialToolLoading === 'mechanicalRepair'} onClick={createMechanicalQaRepairQueue}>机械质检修复任务</Button>
                <Button block loading={commercialToolLoading === 'propagationDebt'} onClick={refreshPropagationDebt}>传播债务队列（本地）</Button>
                <Button block type="primary" loading={commercialToolLoading === 'propagationDebtLlm'} onClick={runPropagationDebtLlmPlan}>AI 生成传播债务修复方案</Button>
                <Button block loading={commercialToolLoading === 'benchmark'} onClick={runQualityBenchmark}>项目质量基准测试</Button>
                <Button block loading={commercialToolLoading === 'versionReview'} onClick={runVersionReviewForActiveChapter}>当前章版本评审</Button>
                <Button block loading={commercialToolLoading === 'similarity'} onClick={runSimilarityForActiveChapter}>当前章相似度检测</Button>
                <Button block loading={commercialToolLoading === 'migrationPlan'} onClick={runReferenceMigrationPlan}>当前章参考迁移计划</Button>
              </Space>
            </Card>
            <Card size="small" title="规划与选题">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button block loading={commercialToolLoading === 'topic'} onClick={runTopicValidation}>原创选题验证</Button>
                <Button block loading={commercialToolLoading === 'longformCreationDiagnosis'} onClick={runLongformCreationDiagnosis}>长篇创作诊断</Button>
                <Button block loading={commercialToolLoading === 'longformPressure'} onClick={runLongformPressureTest}>300万字长线压力测试</Button>
                <Button block loading={commercialToolLoading === 'future100Audit'} onClick={runFuture100SkeletonAudit}>未来100章骨架检查</Button>
                <Button block type="primary" loading={commercialToolLoading === 'future100Generate'} onClick={generateFuture100Skeleton}>AI 生成未来100章骨架</Button>
                <Button block loading={commercialToolLoading === 'rollingPlan'} onClick={runRollingPlan}>未来 10 章滚动规划</Button>
                <Button block loading={commercialToolLoading === 'referenceDiagnosis'} onClick={openReferenceKnowledgeDiagnosis}>参考知识诊断</Button>
                <Button block onClick={() => { setCommercialToolsOpen(false); setReferenceEngineeringOpen(true) }}>多参考融合控制台</Button>
                <Button block loading={commercialToolLoading === 'genreTemplates'} onClick={openGenreTemplates}>类型模板方法库（模板）</Button>
              </Space>
            </Card>
            <Card size="small" title="Agent 配置">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button block loading={commercialToolLoading === 'agentConfig'} onClick={openAgentConfigEditor}>提示词与 Agent 配置</Button>
                <Button block onClick={openWritingBibleEditor}>结构化写作圣经</Button>
                <Button block onClick={openStoryStateEditor}>状态机人工校正</Button>
              </Space>
            </Card>
            <Card size="small" title="交付导出">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button block onClick={() => setExportDeliveryOpen(true)}>导出 TXT / Markdown</Button>
                <Button block loading={commercialToolLoading === 'backup'} onClick={createBackupSnapshot}>创建项目备份快照</Button>
                <Button block onClick={downloadBackupPackage}>下载完整项目包 JSON</Button>
                <Button block loading={commercialToolLoading === 'backupImport'} onClick={() => setBackupImportOpen(true)}>导入项目备份 JSON</Button>
                <Button block onClick={() => setQualityBenchmarkOpen(true)}>导出前质量基准</Button>
                <Button block onClick={() => setConsistencyGraphOpen(true)}>导出前一致性图谱</Button>
              </Space>
            </Card>
          </div>
        </Space>
      </Modal>

      <Modal
        open={creativeCommandOpen}
        title="本地自然语言创作指令台"
        width={820}
        onCancel={() => setCreativeCommandOpen(false)}
        footer={(
          <Space>
            <Button onClick={() => setCreativeCommandOpen(false)}>关闭</Button>
            <Button loading={commercialToolLoading === 'creativeCommand'} onClick={() => { void runCreativeCommand(false) }}>解析指令</Button>
            <Button type="primary" loading={commercialToolLoading === 'creativeCommand'} onClick={() => { void runCreativeCommand(true) }}>执行安全步骤</Button>
          </Space>
        )}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="当前指令台使用本地规则解析，不调用大模型；生成、发布、覆盖正文这类高风险动作只会给出操作计划，不会绕过现有确认流程。"
          />
          <Input.TextArea
            rows={4}
            value={creativeCommandText}
            onChange={(event) => setCreativeCommandText(event.target.value)}
            placeholder="例如：帮我检查全书有没有水文和重复，再看一下状态机是否落后；或者：我想继续写第12章，但先确认材料是否完整。"
          />
          {creativeCommandPlan && (
            <Card size="small" title="解析结果">
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color="blue" bordered={false}>置信度 {Math.round(Number(creativeCommandPlan.plan?.confidence || 0) * 100)}%</Tag>
                  <Tag bordered={false}>下一入口 {creativeCommandPlan.plan?.next_ui || '-'}</Tag>
                  <Tag color={(creativeCommandPlan.executed || []).length ? 'green' : 'default'} bordered={false}>已执行 {(creativeCommandPlan.executed || []).length}</Tag>
                </Space>
                {(creativeCommandPlan.plan?.warnings || []).map((item: string) => <Alert key={item} type="warning" showIcon message={item} />)}
                <List
                  size="small"
                  dataSource={creativeCommandPlan.plan?.actions || []}
                  renderItem={(action: any) => (
                    <List.Item>
                      <List.Item.Meta
                        title={<Space><Text strong>{action.label}</Text><Tag color={action.executable ? 'green' : 'gold'} bordered={false}>{action.executable ? '可安全执行' : '需人工确认'}</Tag><Tag bordered={false}>{action.method}</Tag></Space>}
                        description={<Space direction="vertical" size={2}><Text type="secondary">{action.reason}</Text><Text type="secondary" style={{ fontSize: 12 }}>{action.endpoint}</Text></Space>}
                      />
                    </List.Item>
                  )}
                />
                {(creativeCommandPlan.executed || []).length > 0 && (
                  <Card size="small" title="执行结果">
                    <List
                      size="small"
                      dataSource={creativeCommandPlan.executed}
                      renderItem={(item: any) => (
                        <List.Item>
                          <Space direction="vertical" size={2}>
                            <Text>{item.key}：{item.status}{item.report?.score !== undefined ? `，评分 ${item.report.score}` : ''}</Text>
                            {item.report?.summary && <Text type="secondary" style={{ fontSize: 12 }}>{item.report.summary}</Text>}
                            {Array.isArray(item.report?.risks) && item.report.risks.length > 0 && <Text type="secondary" style={{ fontSize: 12 }}>风险：{item.report.risks.slice(0, 2).join('；')}</Text>}
                            {Array.isArray(item.report?.next_actions) && item.report.next_actions.length > 0 && <Text type="secondary" style={{ fontSize: 12 }}>下一步：{item.report.next_actions.slice(0, 2).join('；')}</Text>}
                          </Space>
                        </List.Item>
                      )}
                    />
                  </Card>
                )}
              </Space>
            </Card>
          )}
        </Space>
      </Modal>

      <Modal
        open={backupImportOpen}
        title="导入项目备份 JSON"
        width={760}
        onCancel={() => setBackupImportOpen(false)}
        confirmLoading={commercialToolLoading === 'backupImport'}
        okText="导入为新项目"
        cancelText="取消"
        onOk={() => { void importBackupPackage() }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="warning"
            showIcon
            message="导入会创建一个新项目，不会覆盖当前项目。"
            description="请粘贴通过“下载完整项目包 JSON”导出的内容。导入后会自动跳转到新项目。"
          />
          <Input.TextArea
            rows={12}
            value={backupImportText}
            onChange={(event) => setBackupImportText(event.target.value)}
            placeholder='{"package_type":"novel_project_backup", ...}'
          />
        </Space>
      </Modal>

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
                              disabled={disabled}
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

      <TaskCenterDrawer
        open={taskCenterOpen}
        activeTasks={activeTasks}
        runRecords={runRecords}
        productionTasks={productionTasks}
        knowledgeIngestJobs={knowledgeIngestJobs}
        loading={loading || productionTasksLoading}
        knowledgeJobsLoading={knowledgeJobsLoading}
        safeBatchRecoveryFocus={taskCenterRecoveryFocus}
        onClose={() => {
          setTaskCenterOpen(false)
          setTaskCenterRecoveryFocus(null)
        }}
        onRefresh={async () => { if (await flushPendingSave()) { await loadProjectModules(); await loadProductionTasks() } }}
        onRefreshKnowledgeJobs={loadKnowledgeIngestJobs}
        onPauseKnowledgeJob={(jobId) => { void pauseKnowledgeIngestJob(jobId) }}
        onResumeKnowledgeJob={(jobId) => { void resumeKnowledgeIngestJob(jobId) }}
        onCancelKnowledgeJob={(jobId) => { void cancelKnowledgeIngestJob(jobId) }}
        chapterGroupExecutingId={chapterGroupExecutingId}
        releaseRepairExecutingId={releaseRepairExecutingId}
        onExecuteChapterGroup={executeChapterGroupRun}
        onExecuteReleaseRepairRun={executeReleaseRepairRun}
        onRecoverRunQueue={() => { void recoverRunQueue() }}
        onApproveChapterGroup={approveChapterGroupStage}
        onRetryChapterGroup={retryChapterGroupStage}
        onSkipChapterGroup={skipChapterGroupStage}
        onSelectChapter={(chapterId) => { void locateRepairTaskChapter(chapterId) }}
        onOpenChapterEditor={(chapterId) => { void openRepairTaskChapterEditor(chapterId) }}
        onStartRepairTaskRevision={(task, run, taskIndex, options) => startRepairTaskRevision(task, run, taskIndex, options)}
        onExecuteTypedRepairTask={(task, run, taskIndex, options) => executeTypedRepairTask(task, run, taskIndex, options)}
        onRecheckRepairTask={(task, run, taskIndex, options) => recheckRepairTaskConvergence(task, run, taskIndex, options)}
        onUpdateRepairTaskStatus={(task, run, status, taskIndex) => { void updateRepairTaskStatus(run, taskIndex, status, task?.message || task?.title || '') }}
        onBulkUpdateRepairTaskStatus={(items, status) => { void bulkUpdateRepairTaskStatus(items, status) }}
        onRecheckStyleSampleTaskBooks={(items) => { void recheckStyleSampleTaskBookReviewTasks(items) }}
        onGenerateRepairAuditSummary={(run, options) => generateLongformRepairAuditSummary(run, options)}
        onCreateRecoveryEvidenceGovernanceQueue={async (payload, run, taskIndex) => {
          await createRecoveryEvidenceGovernanceQueue(payload)
          if (run?.id && taskIndex >= 0) {
            await updateRepairTaskStatus(run, taskIndex, 'needs_review', '已生成放行摘要再治理队列，等待治理闭环后复盘')
          }
        }}
        onPauseRun={async (run) => {
          await apiClient.post(`/novel/runs/${run.id}/pause`, { project_id: projectId })
          await loadProjectModules()
          message.success('任务已暂停')
        }}
        onResumeRun={async (run) => {
          try {
            const res = await apiClient.post(`/novel/runs/${run.id}/resume`, { project_id: projectId })
            await loadProjectModules()
            message.success(res.data?.execute_endpoint ? '章节群已标记可继续，可点击执行' : res.data?.resume_endpoint ? '任务已标记可继续，请从当前章节继续生成正文' : '任务已继续')
          } catch (error: any) {
            message.error(formatRunResumeErrorMessage(error))
          }
        }}
      />

      <OutlineTreeModal
        open={outlineTreeOpen}
        treeData={chapterTreeData}
        activeChapterId={activeChapterId}
        activeOutlineIds={future100FocusOutlineIds}
        onClose={() => {
          setOutlineTreeOpen(false)
          setFuture100FocusOutlineIds([])
        }}
        onCreateOutline={() => { setOutlineTreeOpen(false); setFuture100FocusOutlineIds([]); openEditor('outline') }}
        onSelectOutline={(outlineId) => {
          const outline = outlines.find(item => Number(item.id) === Number(outlineId))
          if (outline) {
            setOutlineTreeOpen(false)
            setFuture100FocusOutlineIds([])
            openEditor('outline', outline)
          }
        }}
        onSelectChapter={(chapterId) => { void selectChapterForWriting(chapterId).then((saved) => { if (saved) { setOutlineTreeOpen(false); setFuture100FocusOutlineIds([]) } }) }}
      />

      {/* ═══ Outline Control Panel ═══ */}
      <OutlineControlPanel
        open={outlinePanelOpen}
        onClose={() => setOutlinePanelOpen(false)}
        onGenerate={handleOutlineGenerate}
        existingChapters={chapters}
        existingOutlines={outlines}
      />

      {/* ═══ Chapter Restructure Panel ═══ */}
      <ChapterRestructurePanel
        open={restructurePanelOpen}
        onClose={() => setRestructurePanelOpen(false)}
        selectedChapters={selectedChaptersList}
        onRestructure={handleRestructure}
      />

        <ChapterManagementDrawer
          open={chapterDrawerOpen}
          onClose={() => setChapterDrawerOpen(false)}
          chapters={chapters}
          proseChapters={proseChapters}
          filteredChapters={filteredChapters}
          activeChapter={activeChapter}
          activeChapterId={activeChapterId}
          selectedChapterIds={selectedChapterIds}
          selectMode={selectMode}
          chapterSearch={chapterSearch}
          chapterStatusFilter={chapterStatusFilter}
          chapterSortMode={chapterSortMode}
          generatingProse={generatingProse}
          onCreateChapter={() => openEditor('chapter')}
          onEditChapter={(chapter) => openEditor('chapter', chapter)}
          onDeleteChapter={deleteChapter}
          onBatchDelete={async (chapterIds) => {
            for (const cid of chapterIds) await apiClient.delete(`/novel/chapters/${cid}`)
            setSelectedChapterIds(new Set())
            await loadProjectModules()
            message.success('已批量删除')
          }}
          onGenerateCurrentChapterProse={generateCurrentChapterProse}
          onOpenRestructure={() => { setSelectMode(true); setRestructurePanelOpen(true) }}
          onOpenVersionHistory={() => { setRightPanelOpen(true); setRightPanelTab('versions'); setChapterDrawerOpen(false) }}
          onSelectChapter={(chapterId) => { void selectChapterForWriting(chapterId) }}
          onSetSelectMode={setSelectMode}
          onSetSelectedChapterIds={setSelectedChapterIds}
          onSetChapterSearch={setChapterSearch}
          onSetChapterStatusFilter={setChapterStatusFilter}
          onSetChapterSortMode={setChapterSortMode}
        />
      </DeferredWorkspaceSurfaces>

    </div>
  )
}
