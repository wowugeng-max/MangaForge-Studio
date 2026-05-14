import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert, Badge, Button, Card, Form, Input, List, message, Modal, Progress, Select, Space, Typography, Tooltip, Tag,
} from 'antd'
import {
  ArrowLeftOutlined, BookOutlined, ClockCircleOutlined, ReloadOutlined,
} from '@ant-design/icons'
import type { EditorView } from '@codemirror/view'
import { useNavigate, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import { createSSEClient, generateClientId, type SSEMessage } from '../utils/sse'
import { AgentExecutionModal } from './novel-workspace/AgentExecutionModal'
import { ChapterManagementDrawer } from './novel-workspace/ChapterManagementDrawer'
import { ChapterDirectorySidebar } from './novel-workspace/ChapterDirectorySidebar'
import { ChapterRestructurePanel } from './novel-workspace/ChapterRestructurePanel'
import { EditorModal, type EditorKind } from './novel-workspace/EditorModal'
import { OutlineControlPanel } from './novel-workspace/OutlineControlPanel'
import { OutlineTreeModal } from './novel-workspace/OutlineTreeModal'
import { ReferenceConfigModal } from './novel-workspace/ReferenceConfigModal'
import { ReferenceEngineeringModal } from './novel-workspace/ReferenceEngineeringModal'
import { ReferencePanel } from './novel-workspace/ReferencePanel'
import { TaskCenterDrawer } from './novel-workspace/TaskCenterDrawer'
import { VersionDetailModal } from './novel-workspace/VersionDetailModal'
import { WorkspaceCenter } from './novel-workspace/WorkspaceCenter'
import { useChapterAutosave } from './novel-workspace/useChapterAutosave'
import { useChapterVersions } from './novel-workspace/useChapterVersions'
import { useNovelWorkspaceData, type ChapterSortMode, type ChapterStatusFilter } from './novel-workspace/useNovelWorkspaceData'
import { useReferenceWorkflow } from './novel-workspace/useReferenceWorkflow'
import { useWorkspaceTasks } from './novel-workspace/useWorkspaceTasks'
import {
  displayValue,
  summarizeOutlineExecution,
} from './novel-workspace/utils'

const { Title, Text, Paragraph } = Typography

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
  const [bookReviewLoading, setBookReviewLoading] = useState(false)
  const [writingBibleOpen, setWritingBibleOpen] = useState(false)
  const [storyStateOpen, setStoryStateOpen] = useState(false)
  const [chapterGroupExecutingId, setChapterGroupExecutingId] = useState<number | null>(null)

  // ── 大纲生成控制面板 ──
  const [outlinePanelOpen, setOutlinePanelOpen] = useState(false)
  const [referenceConfigOpen, setReferenceConfigOpen] = useState(false)
  const [referenceEngineeringOpen, setReferenceEngineeringOpen] = useState(false)

  // ── 章节弹出面板 ──
  const [chapterDrawerOpen, setChapterDrawerOpen] = useState(false)
  const [outlineTreeOpen, setOutlineTreeOpen] = useState(false)
  const [taskCenterOpen, setTaskCenterOpen] = useState(false)

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

  // ── right reference panel ──
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [rightPanelTab, setRightPanelTab] = useState('worldbuilding')

  const proseEditorRef = useRef<EditorView | null>(null)

  const renderPreflightModalContent = (payload: any) => {
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

  const showGenerationBlockedModal = (payload: any, onContinue?: () => void) => {
    const isSafetyBlocked = payload?.error_code === 'REFERENCE_SAFETY_BLOCKED'
    Modal.confirm({
      title: isSafetyBlocked ? '仿写安全阈值未通过' : '章节生成前置检查未通过',
      width: 760,
      icon: null,
      content: renderPreflightModalContent(payload),
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
    const checks = Array.isArray(preflight.checks) ? preflight.checks : []
    const recommendations = Array.isArray(diagnostics?.recommendations) ? diagnostics.recommendations : []
    Modal.info({
      title: '生成前诊断',
      width: 820,
      content: (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Card size="small">
            <Space align="center" size={16}>
              <Progress type="circle" size={72} percent={Number(diagnostics?.readiness_score || 0)} status={preflight.ready ? 'success' : 'normal'} />
              <Space direction="vertical" size={4}>
                <Text strong>{preflight.ready ? '可以生成' : '存在材料缺口'}</Text>
                <Text type="secondary">系统会根据高危缺口决定是否阻止直接生成。</Text>
              </Space>
            </Space>
          </Card>
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

  const {
    activeTasks,
    activeKnowledgeJobCount,
    knowledgeIngestJobs,
    knowledgeJobsLoading,
    loadKnowledgeIngestJobs,
    pauseKnowledgeIngestJob,
    resumeKnowledgeIngestJob,
    cancelKnowledgeIngestJob,
  } = useWorkspaceTasks({
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
  const stepGenerateProse = async () => {
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await flushPendingSave()) return
    const unWritten = sortedChapters.filter(ch => !ch.chapter_text || ch.chapter_text.includes('【占位正文】'))
    if (unWritten.length === 0) return message.warning('所有章节已有正文，无需生成')
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
            body: JSON.stringify({ project_id: projectId, model_id: selectedModelId, prompt: `请生成第 ${ch.chapter_no} 章《${displayValue(ch.title)}》完整正文` }),
          })
          const raw = await resp.text()
          let data: any = null
          try { data = raw ? JSON.parse(raw) : null } catch { data = null }
          if (!resp.ok) {
            if (data?.error_code === 'PROSE_PREFLIGHT_BLOCKED' || data?.error_code === 'REFERENCE_SAFETY_BLOCKED') {
              showGenerationBlockedModal(data)
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
        message.success(`正文生成完成 (${success}/${unWritten.length})`)
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

  const generateSceneCardsForActiveChapter = async (allowIncomplete = false) => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!selectedModelId) return message.warning('请先选择写作模型')
    if (!await flushPendingSave()) return
    setGeneratingSceneCards(true)
    try {
      const res = await apiClient.post(`/novel/chapters/${activeChapter.id}/scene-cards`, {
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
        showGenerationBlockedModal(payload, () => { void generateSceneCardsForActiveChapter(true) })
      } else {
        message.error(payload?.error || error?.message || '场景卡生成失败')
      }
    } finally {
      setGeneratingSceneCards(false)
    }
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

  const openProductionDashboard = async () => {
    if (!selectedProject) return
    setDashboardLoading(true)
    try {
      const [dashboardRes, assetsRes, strategyRes] = await Promise.all([
        apiClient.get(`/novel/projects/${projectId}/production-dashboard`),
        apiClient.get(`/novel/projects/${projectId}/writing-assets`).catch(() => ({ data: null })),
        apiClient.get(`/novel/projects/${projectId}/model-strategy`, { params: { model_id: selectedModelId } }).catch(() => ({ data: null })),
      ])
      const dashboard = dashboardRes.data?.dashboard || {}
      const assets = assetsRes.data?.assets || []
      const strategy = strategyRes.data?.strategy || {}
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
              {dashboard.story_state_updated_to && <Tag color="purple" bordered={false}>状态至第{dashboard.story_state_updated_to}章</Tag>}
            </Space>
            {Array.isArray(dashboard.recommendations) && dashboard.recommendations.length > 0 && (
              <Card size="small" title="生产建议">
                <List size="small" dataSource={dashboard.recommendations} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
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
            auto_store: false,
          })
          const payload = res.data?.payload || {}
          Modal.confirm({
            title: '确认原创孵化方案',
            width: 860,
            content: (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Alert type="info" showIcon message="请先核对核心卖点、角色和前 30 章方向。确认后才会写入项目资料。" />
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
          message.error(error?.response?.data?.error || error?.message || '原创孵化失败')
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
        require_scene_confirmation: true,
      })
      await loadProjectModules()
      setTaskCenterOpen(true)
      message.success('章节群任务已创建，可在任务中心查看并逐章推进')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '章节群任务创建失败')
    }
  }

  const createEditorReport = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await flushPendingSave()) return
    setEditorReportLoading(true)
    try {
      await apiClient.post(`/novel/chapters/${activeChapter.id}/editor-report`, {
        project_id: projectId,
        model_id: selectedModelId,
      })
      await loadProjectModules()
      setRightPanelOpen(true)
      setRightPanelTab('editorReports')
      message.success('编辑报告已生成')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '编辑报告生成失败')
    } finally {
      setEditorReportLoading(false)
    }
  }

  const applyEditorRevision = async (report: any) => {
    if (!selectedModelId) return message.warning('请先选择模型')
    const payload = (() => {
      try { return typeof report.payload === 'string' ? JSON.parse(report.payload) : report.payload || {} } catch { return {} }
    })()
    Modal.confirm({
      title: '按编辑报告生成修订稿',
      content: '系统会根据这份编辑报告重写当前章节，并保存为新的章节版本。',
      okText: '生成修订稿',
      onOk: async () => {
        try {
          const res = await apiClient.post(`/novel/reviews/${report.id}/apply-revision`, {
            project_id: projectId,
            chapter_id: payload.chapter_id || activeChapter?.id,
            model_id: selectedModelId,
          })
          if (res.data?.chapter) {
            setChapters(prev => prev.map(c => c.id === res.data.chapter.id ? res.data.chapter : c))
          }
          await loadProjectModules()
          message.success('修订稿已入库')
        } catch (error: any) {
          message.error(error?.response?.data?.error || error?.message || '修订失败')
        }
      },
    })
  }

  const openWritingBibleEditor = async () => {
    try {
      const res = await apiClient.get(`/novel/projects/${projectId}/writing-bible`)
      const bible = res.data?.writing_bible || {}
      writingBibleForm.setFieldsValue({
        promise: bible.promise || '',
        world_rules: JSON.stringify(bible.world_rules || [], null, 2),
        mainline: JSON.stringify(bible.mainline || {}, null, 2),
        volume_plan: JSON.stringify(bible.volume_plan || [], null, 2),
        style_lock: JSON.stringify(bible.style_lock || selectedProject?.reference_config?.style_lock || {}, null, 2),
        safety_policy: JSON.stringify(bible.safety_policy || selectedProject?.reference_config?.safety || {}, null, 2),
        forbidden: JSON.stringify(bible.forbidden || [], null, 2),
      })
      setWritingBibleOpen(true)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '写作圣经加载失败')
    }
  }

  const saveWritingBibleEditor = async () => {
    try {
      const v = await writingBibleForm.validateFields()
      const parseJson = (value: string, fallback: any) => {
        try { return JSON.parse(value || '') } catch { return fallback }
      }
      const writingBible = {
        ...(selectedProject?.reference_config?.writing_bible || {}),
        promise: v.promise || '',
        world_rules: parseJson(v.world_rules, []),
        mainline: parseJson(v.mainline, {}),
        volume_plan: parseJson(v.volume_plan, []),
        style_lock: parseJson(v.style_lock, {}),
        safety_policy: parseJson(v.safety_policy, {}),
        forbidden: parseJson(v.forbidden, []),
      }
      const res = await apiClient.put(`/novel/projects/${projectId}/writing-bible`, { writing_bible: writingBible })
      setSelectedProject((prev: any) => res.data?.project || (prev ? { ...prev, reference_config: { ...(prev.reference_config || {}), writing_bible: res.data?.writing_bible || writingBible } } : prev))
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
      storyStateForm.setFieldsValue({ story_state: JSON.stringify(res.data?.story_state || {}, null, 2) })
      setStoryStateOpen(true)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '故事状态加载失败')
    }
  }

  const saveStoryStateEditor = async () => {
    try {
      const v = await storyStateForm.validateFields()
      const storyState = JSON.parse(v.story_state || '{}')
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

  const executeChapterGroupRun = async (run: any) => {
    if (!selectedModelId) return message.warning('请先选择模型')
    setChapterGroupExecutingId(run.id)
    try {
      await apiClient.post(`/novel/projects/${projectId}/chapter-groups/${run.id}/execute`, {
        model_id: selectedModelId,
        max_chapters: 50,
      })
      await loadProjectModules()
      message.success('章节群执行完成或已暂停')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '章节群执行失败')
    } finally {
      setChapterGroupExecutingId(null)
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

  const generateCurrentChapterProse = async (options: { allowIncomplete?: boolean; forceSceneCards?: boolean } = {}) => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!selectedModelId) return message.warning('请先选择写作模型')
    if (!await flushPendingSave()) return
    if (!await confirmReferenceReady('正文创作')) return
    setStreamingChapterId(activeChapter.id)
    setStreamingText('')
    setStreamingProgress('正在请求模型...')
    setStreamingPercent(10)
    setGenerationPipeline([])
    setGeneratingProse(true)
    try {
      const ctx = {
        worldbuilding: worldbuilding[0] || null,
        characters, outlines,
        previousChapter: chapters.filter(ch => ch.chapter_no < activeChapter.chapter_no).sort((a, b) => b.chapter_no - a.chapter_no)[0] || null,
      }
      const resp = await fetch(
        `${apiClient.defaults.baseURL}/novel/chapters/${activeChapter.id}/generate-prose?stream=1`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({
            project_id: projectId, model_id: selectedModelId,
            prompt: `请生成第 ${activeChapter.chapter_no} 章《${displayValue(activeChapter.title)}》完整正文`,
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
          showGenerationBlockedModal(payload, () => { void generateCurrentChapterProse({ ...options, allowIncomplete: true }) })
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
              showGenerationBlockedModal(p, () => { void generateCurrentChapterProse({ ...options, allowIncomplete: true }) })
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
      editorForm.setFieldsValue({ ...data, role_type: data.role_type || data.role || '' })
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
        scene_breakdown: formatJsonField(data.scene_breakdown || data.scene_list || []),
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
        const payload = {
          project_id: projectId, name: v.name,
          role_type: v.role_type || '', archetype: v.archetype || '',
          motivation: v.motivation || '', goal: v.goal || '', conflict: v.conflict || '',
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', background: '#fff' }}>

      {/* ═══ TOP BAR ═══ */}
      <div style={{
        flexShrink: 0, height: 48, display: 'flex', alignItems: 'center',
        padding: '0 16px', background: '#fff', borderBottom: '1px solid #f0f0f0', gap: 12,
      }}>
        <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate('/novel')} />
        <Title level={5} style={{ margin: 0, flex: '1' }}>
          {selectedProject?.title || '小说项目工作台'}
        </Title>
        <Select
          size="small" value={selectedModelId}
          onChange={(v) => setSelectedModelId(v)}
          options={models.map(m => ({ value: m.id, label: `${m.display_name || m.model_name} · ${m.provider}` }))}
          style={{ width: 220 }} placeholder="选择模型"
        />
        <Tooltip title="配置当前项目生成时参考的投喂作品">
          <Button type="text" size="small" icon={<BookOutlined />} onClick={() => setReferenceConfigOpen(true)}>
            参考作品
          </Button>
        </Tooltip>
        <Tooltip title="无参考作品时，原创孵化世界观、角色、分卷、章节和写作圣经">
          <Button type="text" size="small" loading={incubatingOriginal} onClick={runOriginalIncubator}>
            原创孵化
          </Button>
        </Tooltip>
        <Tooltip title="查看长篇生产进度、资产库覆盖和模型调度策略">
          <Button type="text" size="small" loading={dashboardLoading} onClick={openProductionDashboard}>
            生产看板
          </Button>
        </Tooltip>
        <Tooltip title="编辑项目写作圣经、风格锁定和仿写安全策略">
          <Button type="text" size="small" onClick={openWritingBibleEditor}>
            写作圣经
          </Button>
        </Tooltip>
        <Tooltip title="检查全书主线、角色、伏笔、爽点密度和分卷目标">
          <Button type="text" size="small" loading={bookReviewLoading} onClick={runBookReview}>
            全书总检
          </Button>
        </Tooltip>
        <Tooltip title="创建 10 章章节群生产任务">
          <Button type="text" size="small" onClick={startChapterGroupGeneration}>
            章节群
          </Button>
        </Tooltip>
        <Tooltip title="查看参考项目、画像完整度、正文缓存和参考报告">
          <Button type="text" size="small" icon={<BookOutlined />} onClick={() => setReferenceEngineeringOpen(true)}>
            参考工程
          </Button>
        </Tooltip>
        {referenceSummary.count > 0 && (
          <Tag color="purple" bordered={false}>{referenceSummary.strengthLabel} · {referenceSummary.count} 部参考</Tag>
        )}
        <Tooltip title="查看运行中任务和历史运行记录">
          <Badge count={activeTasks.length + activeKnowledgeJobCount} size="small">
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
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        <ChapterDirectorySidebar
          selectedModelId={selectedModelId}
          stepOutlineLoading={stepOutlineLoading}
          stepProseLoading={stepProseLoading}
          stepRepairLoading={stepRepairLoading}
          proseProgress={proseProgress}
          chapters={sortedChapters}
          proseChapterCount={proseChapters.length}
          activeChapterId={activeChapterId}
          onOpenOutlinePanel={() => setOutlinePanelOpen(true)}
          onGenerateProse={stepGenerateProse}
          onCancelGenerateProse={cancelStepGenerateProse}
          onRunRepair={stepRunRepair}
          onOpenOutlineTree={() => setOutlineTreeOpen(true)}
          onOpenChapterDrawer={() => setChapterDrawerOpen(true)}
          onCreateChapter={() => openEditor('chapter')}
          onSelectChapter={(chapterId) => { void selectChapter(chapterId) }}
        />

        <WorkspaceCenter
          isEmptyProject={isEmptyProject}
          selectedProject={selectedProject}
          activeChapter={activeChapter}
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
          generatingProse={generatingProse}
          generatingSceneCards={generatingSceneCards}
          diagnosticsLoading={diagnosticsLoading}
          pipelineLoading={pipelineLoading}
          editorReportLoading={editorReportLoading}
          onRunPlan={runPlan}
          onCreateOutline={() => openEditor('outline')}
          onCreateChapter={() => openEditor('chapter')}
          onGenerateCurrentChapterProse={() => generateCurrentChapterProse()}
          onGenerateSceneCards={() => generateSceneCardsForActiveChapter()}
          onOpenGenerationDiagnostics={openGenerationDiagnostics}
          onStartChapterPipeline={startChapterPipeline}
          onCreateEditorReport={createEditorReport}
          onEditActiveChapter={() => activeChapter && openEditor('chapter', activeChapter)}
          onChapterTextChange={(next) => {
            const chapterId = activeChapterId
            setChapters(prev => prev.map(c => c.id === chapterId ? { ...c, chapter_text: next } : c))
            scheduleSave(chapterId, next)
          }}
        />

        <ReferencePanel
          open={rightPanelOpen}
          activeTab={rightPanelTab}
          worldbuilding={worldbuilding}
          characters={characters}
          outlines={outlines}
          selectedProject={selectedProject}
          referenceReports={referenceReports}
          proseQualityReports={proseQualityReports}
          editorReports={editorReports}
          bookReviews={bookReviews}
          activeChapterId={activeChapterId}
          chapterVersions={chapterVersions}
          chapterVersionsLoading={chapterVersionsLoading}
          rollingBackVersionId={rollingBackVersionId}
          onClose={() => setRightPanelOpen(false)}
          onOpen={() => setRightPanelOpen(true)}
          onTabChange={setRightPanelTab}
          onEdit={(kind, item) => openEditor(kind, item)}
          onOpenStoryStateEditor={openStoryStateEditor}
          onApplyEditorRevision={applyEditorRevision}
          onRollbackVersion={rollbackChapterVersion}
          onOpenVersionDetail={setChapterVersionDetail}
        />
      </div>

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

      <Modal
        open={writingBibleOpen}
        title="写作圣经"
        width={860}
        onCancel={() => setWritingBibleOpen(false)}
        onOk={saveWritingBibleEditor}
        okText="保存"
      >
        <Form form={writingBibleForm} layout="vertical">
          <Form.Item name="promise" label="读者承诺 / 核心卖点">
            <Input.TextArea rows={3} />
          </Form.Item>
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
          <Form.Item name="story_state" label="故事状态 JSON" rules={[{ required: true, message: '请输入故事状态 JSON' }]}>
            <Input.TextArea rows={18} />
          </Form.Item>
        </Form>
      </Modal>

      <TaskCenterDrawer
        open={taskCenterOpen}
        activeTasks={activeTasks}
        runRecords={runRecords}
        knowledgeIngestJobs={knowledgeIngestJobs}
        loading={loading}
        knowledgeJobsLoading={knowledgeJobsLoading}
        onClose={() => setTaskCenterOpen(false)}
        onRefresh={async () => { if (await flushPendingSave()) await loadProjectModules() }}
        onRefreshKnowledgeJobs={loadKnowledgeIngestJobs}
        onPauseKnowledgeJob={(jobId) => { void pauseKnowledgeIngestJob(jobId) }}
        onResumeKnowledgeJob={(jobId) => { void resumeKnowledgeIngestJob(jobId) }}
        onCancelKnowledgeJob={(jobId) => { void cancelKnowledgeIngestJob(jobId) }}
        chapterGroupExecutingId={chapterGroupExecutingId}
        onExecuteChapterGroup={executeChapterGroupRun}
        onPauseRun={async (run) => {
          await apiClient.post(`/novel/runs/${run.id}/pause`, { project_id: projectId })
          await loadProjectModules()
          message.success('任务已暂停')
        }}
        onResumeRun={async (run) => {
          const res = await apiClient.post(`/novel/runs/${run.id}/resume`, { project_id: projectId })
          await loadProjectModules()
          message.success(res.data?.execute_endpoint ? '章节群已标记可继续，可点击执行' : res.data?.resume_endpoint ? '任务已标记可继续，请从当前章节继续生成正文' : '任务已继续')
        }}
      />

      <OutlineTreeModal
        open={outlineTreeOpen}
        treeData={chapterTreeData}
        activeChapterId={activeChapterId}
        onClose={() => setOutlineTreeOpen(false)}
        onCreateOutline={() => { setOutlineTreeOpen(false); openEditor('outline') }}
        onSelectChapter={(chapterId) => { void selectChapter(chapterId).then((saved) => { if (saved) setOutlineTreeOpen(false) }) }}
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
        onSelectChapter={(chapterId) => { void selectChapter(chapterId) }}
        onSetSelectMode={setSelectMode}
        onSetSelectedChapterIds={setSelectedChapterIds}
        onSetChapterSearch={setChapterSearch}
        onSetChapterStatusFilter={setChapterStatusFilter}
        onSetChapterSortMode={setChapterSortMode}
      />

    </div>
  )
}
