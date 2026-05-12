import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Button, Form, message, Modal, Select, Typography, Tooltip,
} from 'antd'
import {
  ArrowLeftOutlined, BookOutlined, ReloadOutlined,
} from '@ant-design/icons'
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
import { ReferencePanel } from './novel-workspace/ReferencePanel'
import { VersionDetailModal } from './novel-workspace/VersionDetailModal'
import { WorkspaceCenter } from './novel-workspace/WorkspaceCenter'
import {
  buildChapterTreeData,
  buildTree,
  displayValue,
  summarizeOutlineExecution,
  wc,
} from './novel-workspace/utils'

const { Title } = Typography

/* ── main component ─────────────────────────────────────────────── */
export default function NovelProjectWorkspace() {
  const navigate = useNavigate()
  const { id } = useParams()
  const projectId = Number(id)

  // ── data ──
  const [loading, setLoading] = useState(false)
  const [selectedProject, setSelectedProject] = useState<any | null>(null)
  const [worldbuilding, setWorldbuilding] = useState<any[]>([])
  const [characters, setCharacters] = useState<any[]>([])
  const [outlines, setOutlines] = useState<any[]>([])
  const [chapters, setChapters] = useState<any[]>([])
  const [runRecords, setRunRecords] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [agentExecution, setAgentExecution] = useState<any | null>(null)
  const [marketReview, setMarketReview] = useState<any | null>(null)
  const [platformFit, setPlatformFit] = useState<any | null>(null)
  const [models, setModels] = useState<any[]>([])
  const [results, setResults] = useState<any[]>([])
  const [continuityChecks, setContinuityChecks] = useState<any[]>([])
  const [repairResult, setRepairResult] = useState<any | null>(null)

  // ── model / platform-fit ──
  const [selectedModelId, setSelectedModelId] = useState<number | undefined>()
  const [platformFitChapterIds, setPlatformFitChapterIds] = useState<number[]>([])
  const [platformFitTemplateName, setPlatformFitTemplateName] = useState('')
  const [platformFitTemplateNote, setPlatformFitTemplateNote] = useState('')
  const [platformFitTemplateSearch, setPlatformFitTemplateSearch] = useState('')
  const [platformFitTemplateDefault, setPlatformFitTemplateDefault] = useState(false)

  // ── chapter versions ──
  const [chapterVersions, setChapterVersions] = useState<any[]>([])
  const [chapterVersionsLoading, setChapterVersionsLoading] = useState(false)
  const [chapterVersionDetail, setChapterVersionDetail] = useState<any | null>(null)
  const [rollingBackVersionId, setRollingBackVersionId] = useState<number | null>(null)

  // ── 3-step writing flow ──
  const [stepOutlineLoading, setStepOutlineLoading] = useState(false)
  const [stepProseLoading, setStepProseLoading] = useState(false)
  const [stepRepairLoading, setStepRepairLoading] = useState(false)
  const [proseProgress, setProseProgress] = useState({ current: 0, total: 0 })
  const [planning, setPlanning] = useState(false)
  const [executingAgents, setExecutingAgents] = useState(false)
  const [generatingProse, setGeneratingProse] = useState(false)
  const [repairing, setRepairing] = useState(false)

  // ── 大纲生成控制面板 ──
  const [outlinePanelOpen, setOutlinePanelOpen] = useState(false)
  const [referenceConfigOpen, setReferenceConfigOpen] = useState(false)

  // ── 章节弹出面板 ──
  const [chapterDrawerOpen, setChapterDrawerOpen] = useState(false)
  const [outlineTreeOpen, setOutlineTreeOpen] = useState(false)

  // ── 章节多选 + 章节重组 ──
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<number>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [restructurePanelOpen, setRestructurePanelOpen] = useState(false)
  const [chapterSearch, setChapterSearch] = useState('')
  const [chapterStatusFilter, setChapterStatusFilter] = useState<'all' | 'written' | 'unwritten' | 'placeholder'>('all')
  const [chapterSortMode, setChapterSortMode] = useState<'chapter_no_asc' | 'chapter_no_desc' | 'word_count_desc' | 'title_asc'>('chapter_no_asc')

  // ── streaming ──
  const [streamingChapterId, setStreamingChapterId] = useState<number | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [streamingProgress, setStreamingProgress] = useState('')
  const [streamingPercent, setStreamingPercent] = useState(0)
  const streamingEndRef = useRef<HTMLDivElement | null>(null)

  // ── editors / modals ──
  const [editorKind, setEditorKind] = useState<EditorKind | null>(null)
  const [editorItem, setEditorItem] = useState<any | null>(null)
  const [editorForm] = Form.useForm()
  const templateImportRef = useRef<HTMLInputElement>(null)

  // ── active chapter ──
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null)
  const activeChapter = chapters.find(c => c.id === activeChapterId) || null

  // ── left sidebar drawer (mobile) ──
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false)

  // ── right reference panel ──
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [rightPanelTab, setRightPanelTab] = useState('worldbuilding')

  // ── auto-save state ──
  const [saveStatus, setSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const proseEditorRef = useRef<HTMLTextAreaElement | null>(null)

  // ── diff toggle ──
  const [showOnlyDiff, setShowOnlyDiff] = useState(true)

  // ── chapter tree ──
  const chapterTree = useMemo(() => buildTree(outlines, chapters), [outlines, chapters])
  const chapterTreeData = useMemo(() => buildChapterTreeData(chapterTree), [chapterTree])

  const proseChapters = chapters.filter(ch => ch.chapter_text)

  // ── empty project detection ──
  const isEmptyProject = useMemo(() => (
    !loading &&
    selectedProject !== null &&
    worldbuilding.length === 0 &&
    characters.length === 0 &&
    outlines.length === 0 &&
    chapters.length === 0
  ), [loading, selectedProject, worldbuilding.length, characters.length, outlines.length, chapters.length])

  /* ── selected chapters (resolved to objects) ────────────────────── */
  const selectedChaptersList = useMemo(() =>
    chapters.filter(ch => selectedChapterIds.has(ch.id)),
    [chapters, selectedChapterIds],
  )

  /* ── load data ─────────────────────────────────────────────────── */
  const loadProjectModules = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [pr, wr, cr, olr, chr, rnr, revr, mr] = await Promise.all([
        apiClient.get(`/novel/projects/${projectId}`),
        apiClient.get(`/novel/projects/${projectId}/worldbuilding`),
        apiClient.get(`/novel/projects/${projectId}/characters`),
        apiClient.get(`/novel/projects/${projectId}/outlines`),
        apiClient.get(`/novel/projects/${projectId}/chapters`),
        apiClient.get('/novel/runs', { params: { project_id: projectId } }),
        apiClient.get(`/novel/projects/${projectId}/reviews`),
        apiClient.get('/models').catch(() => ({ data: [] })),
      ])
      setSelectedProject(pr.data || null)
      setWorldbuilding(Array.isArray(wr.data) ? wr.data : [])
      setCharacters(Array.isArray(cr.data) ? cr.data : [])
      setOutlines(Array.isArray(olr.data) ? olr.data : [])
      setChapters(Array.isArray(chr.data) ? chr.data : [])
      setRunRecords(Array.isArray(rnr.data) ? rnr.data : [])
      const items = Array.isArray(revr.data) ? revr.data : []
      setReviews(items)
      setAgentExecution(null)
      setContinuityChecks([])
      const mk = items.find((i: any) => i.review_type === 'market_review') || null
      const pf = items.find((i: any) => i.review_type === 'platform_fit') || null
      setMarketReview(mk ? { summary: mk.summary, issues: mk.issues, ...(mk.payload ? JSON.parse(mk.payload) : {}) } : null)
      setPlatformFit(pf ? { summary: pf.summary, issues: pf.issues, ...(pf.payload ? JSON.parse(pf.payload) : {}) } : null)
      setModels(Array.isArray(mr.data) ? mr.data : [])
      setSelectedModelId(prev => prev || (Array.isArray(mr.data) ? (mr.data.find((m: any) => m.is_favorite)?.id || mr.data[0]?.id) : undefined))
      setPlatformFitChapterIds(prev => prev.length > 0 ? prev : (chr.data || []).slice(0, 3).map((c: any) => c.id))
      const act = chr.data?.find?.((c: any) => c.chapter_text) || chr.data?.[0] || null
      setActiveChapterId(act?.id || null)
    } catch {
      message.error('无法加载项目工作台')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProjectModules() }, [projectId])

  const loadChapterVersions = async (chapterId: number) => {
    setChapterVersionsLoading(true)
    try {
      const res = await apiClient.get(`/novel/chapters/${chapterId}/versions`)
      setChapterVersions(Array.isArray(res.data) ? res.data : [])
    } catch { setChapterVersions([]) }
    finally { setChapterVersionsLoading(false) }
  }

  useEffect(() => {
    if (activeChapter?.id) { loadChapterVersions(activeChapter.id); setChapterVersionDetail(null) }
    else { setChapterVersions([]); setChapterVersionDetail(null) }
  }, [activeChapter?.id])

  /* ── auto-save with debounce ───────────────────────────────────── */
  const scheduleSave = async (text: string) => {
    if (saveStatus === 'saving') return
    setSaveStatus('unsaved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await apiClient.put(`/novel/chapters/${activeChapterId}`, { chapter_text: text })
        setChapters(prev => prev.map(c => c.id === activeChapterId ? { ...c, chapter_text: text } : c))
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
        message.error('保存失败，请检查网络')
      }
    }, 1500)
  }

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [])

  /* ── 大纲生成 ──────────────────────────────────────────────────── */
  const handleOutlineGenerate = async (opts: { chapterCount: number; continueMode: boolean; continueFrom: number; userOutline: string }) => {
    if (!selectedModelId) return message.warning('请先在顶部选择模型')
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
    const unWritten = sortedChapters.filter(ch => !ch.chapter_text || ch.chapter_text.includes('【占位正文】'))
    if (unWritten.length === 0) return message.warning('所有章节已有正文，无需生成')
    setStepProseLoading(true)
    let done = 0
    try {
      for (const ch of unWritten) {
        setProseProgress({ current: done + 1, total: unWritten.length })
        try {
          await fetch(`${apiClient.defaults.baseURL}/novel/chapters/${ch.id}/generate-prose`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: projectId, model_id: selectedModelId, prompt: `请生成第 ${ch.chapter_no} 章《${displayValue(ch.title)}》完整正文` }),
          })
          done++
        } catch { done++ }
      }
      await loadProjectModules()
      message.success(`正文生成完成 (${done}/${unWritten.length})`)
    } catch (e: any) { message.error(e.message || '正文生成失败') }
    finally { setStepProseLoading(false) }
  }

  const stepRunRepair = async () => {
    if (!selectedModelId) return message.warning('请先选择模型')
    setStepRepairLoading(true)
    try {
      const res = await apiClient.post('/novel/agents/repair', {
        project_id: projectId, model_id: selectedModelId, payload: {},
      })
      setRepairResult(res.data || null)
      await loadProjectModules()
      message.success(`连续性修复完成，发现 ${res.data?.issues_found || 0} 个问题`)
    } catch (e: any) { message.error(e.response?.data?.detail || '修复失败') }
    finally { setStepRepairLoading(false) }
  }

  /* ── Plan (AI 一键初始化) ──────────────────────────────────────── */
  const [planProgress, setPlanProgress] = useState<any>(null)

  const runPlan = async () => {
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
      if (finalData) setResults(finalData.results || [])
      await loadProjectModules()
      message.success('规划已完成')
    } catch (err: any) { message.error(err.message || '规划失败') }
    finally { setPlanning(false); setPlanProgress(null) }
  }

  const executeAgents = async () => {
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

  const generateCurrentChapterProse = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!selectedModelId) return message.warning('请先选择写作模型')
    setStreamingChapterId(activeChapter.id)
    setStreamingText('')
    setStreamingProgress('正在请求模型...')
    setStreamingPercent(10)
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
          }),
        },
      )
      if (!resp.ok || !resp.body) throw new Error(await resp.text())
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
          if (p.type === 'progress') { setStreamingProgress(p.progress || '生成中...'); setStreamingPercent(Math.min(90, p.percent || 35)) }
          else if (p.type === 'chunk') { setStreamingText(prev => `${prev}${p.text || ''}`); setStreamingPercent(prev => Math.min(95, prev + 2)) }
          else if (p.type === 'done') done = p
        }
      }
      const updated = done?.chapter
      if (updated) setChapters(prev => prev.map(c => c.id === updated.id ? updated : c))
      setStreamingProgress('生成完成')
      setStreamingPercent(100)
      setStreamingText(prev => prev || updated?.chapter_text || '')
      await loadProjectModules()
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
      editorForm.setFieldsValue(data)
    }
    setEditorKind(kind)
  }

  const submitEditor = async () => {
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

  /* ── version rollback ──────────────────────────────────────────── */
  const rollbackChapterVersion = async (versionId: number) => {
    if (!activeChapter) return
    setRollingBackVersionId(versionId)
    try {
      await apiClient.post(`/novel/chapters/${activeChapter.id}/rollback`, { version_id: versionId })
      await loadProjectModules()
      await loadChapterVersions(activeChapter.id)
      message.success('已回滚到指定版本')
    } catch { message.error('回滚失败') }
    finally { setRollingBackVersionId(null) }
  }

  /* ── streaming scroll ──────────────────────────────────────────── */
  useEffect(() => {
    if (streamingChapterId) streamingEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [streamingText, streamingChapterId])

  /* ── sorted / filtered chapters ────────────────────────────────── */
  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.chapter_no - b.chapter_no),
    [chapters],
  )

  const filteredChapters = useMemo(() => {
    const keyword = chapterSearch.trim().toLowerCase()
    const filtered = sortedChapters.filter((ch) => {
      const text = String(ch.chapter_text || '')
      const isPlaceholder = text.includes('【占位正文】')
      const isWritten = !!text && !isPlaceholder
      const matchesKeyword = !keyword || [
        ch.title,
        ch.chapter_summary,
        ch.chapter_goal,
        ch.conflict,
        ch.ending_hook,
        `第${ch.chapter_no}章`,
      ].some((value) => String(value || '').toLowerCase().includes(keyword))

      const matchesStatus = chapterStatusFilter === 'all'
        || (chapterStatusFilter === 'written' && isWritten)
        || (chapterStatusFilter === 'unwritten' && !text)
        || (chapterStatusFilter === 'placeholder' && isPlaceholder)

      return matchesKeyword && matchesStatus
    })

    const sorted = [...filtered]
    if (chapterSortMode === 'chapter_no_desc') sorted.sort((a, b) => b.chapter_no - a.chapter_no)
    else if (chapterSortMode === 'word_count_desc') sorted.sort((a, b) => wc(b.chapter_text) - wc(a.chapter_text))
    else if (chapterSortMode === 'title_asc') sorted.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'zh-CN'))
    else sorted.sort((a, b) => a.chapter_no - b.chapter_no)

    return sorted
  }, [sortedChapters, chapterSearch, chapterStatusFilter, chapterSortMode])

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
        <Tooltip title="刷新">
          <Button type="text" size="small" icon={<ReloadOutlined />} loading={loading} onClick={loadProjectModules} />
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
          onRunRepair={stepRunRepair}
          onOpenOutlineTree={() => setOutlineTreeOpen(true)}
          onOpenChapterDrawer={() => setChapterDrawerOpen(true)}
          onCreateChapter={() => openEditor('chapter')}
          onSelectChapter={setActiveChapterId}
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
          streamingEndRef={streamingEndRef}
          proseEditorRef={proseEditorRef}
          saveStatus={saveStatus}
          planning={planning}
          generatingProse={generatingProse}
          onRunPlan={runPlan}
          onCreateOutline={() => openEditor('outline')}
          onCreateChapter={() => openEditor('chapter')}
          onGenerateCurrentChapterProse={generateCurrentChapterProse}
          onEditActiveChapter={() => activeChapter && openEditor('chapter', activeChapter)}
          onChapterTextChange={(next) => {
            setChapters(prev => prev.map(c => c.id === activeChapterId ? { ...c, chapter_text: next } : c))
            scheduleSave(next)
          }}
        />

        <ReferencePanel
          open={rightPanelOpen}
          activeTab={rightPanelTab}
          worldbuilding={worldbuilding}
          characters={characters}
          outlines={outlines}
          chapterVersions={chapterVersions}
          chapterVersionsLoading={chapterVersionsLoading}
          rollingBackVersionId={rollingBackVersionId}
          onClose={() => setRightPanelOpen(false)}
          onOpen={() => setRightPanelOpen(true)}
          onTabChange={setRightPanelTab}
          onEdit={(kind, item) => openEditor(kind, item)}
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

      <OutlineTreeModal
        open={outlineTreeOpen}
        treeData={chapterTreeData}
        activeChapterId={activeChapterId}
        onClose={() => setOutlineTreeOpen(false)}
        onCreateOutline={() => { setOutlineTreeOpen(false); openEditor('outline') }}
        onSelectChapter={(chapterId) => { setActiveChapterId(chapterId); setOutlineTreeOpen(false) }}
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
        onSelectChapter={setActiveChapterId}
        onSetSelectMode={setSelectMode}
        onSetSelectedChapterIds={setSelectedChapterIds}
        onSetChapterSearch={setChapterSearch}
        onSetChapterStatusFilter={setChapterStatusFilter}
        onSetChapterSortMode={setChapterSortMode}
      />

    </div>
  )
}
