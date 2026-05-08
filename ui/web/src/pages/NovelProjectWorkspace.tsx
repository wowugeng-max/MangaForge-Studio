import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge, Button, Card, Col, Descriptions, Divider, Drawer, Form, Input,
  InputNumber, message, Modal, Popconfirm, Progress, Row, Select, Space,
  Tabs, Tag, Tree, Typography, Tooltip,
} from 'antd'
import {
  ArrowLeftOutlined, BarChartOutlined, DeleteOutlined, EditOutlined,
  FileTextOutlined, HistoryOutlined, PlayCircleOutlined, ReloadOutlined,
  RocketOutlined, SafetyOutlined, SaveOutlined, CheckCircleOutlined,
  SyncOutlined, ClockCircleOutlined, UnorderedListOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import { createSSEClient, generateClientId, type SSEMessage } from '../utils/sse'
import { STATUS_LABELS } from '../constants/uiCopy'

const { Title, Text, Paragraph } = Typography

/* ── helpers ─────────────────────────────────────────────────────── */
function chapterStatusTag(chapter: any) {
  if (!chapter?.chapter_text) return <Tag color="default">未写</Tag>
  if (String(chapter.chapter_text).includes('【占位正文】'))
    return <Tag color="orange">占位</Tag>
  return <Tag color="green">已写</Tag>
}

function sourceLabel(item: any) {
  if (item?.outputSource === 'fallback')
    return <Tag color="gold">{STATUS_LABELS.content.placeholder}</Tag>
  if (item?.fallbackUsed)
    return <Tag color="orange">{STATUS_LABELS.runtime.failed}</Tag>
  return <Tag color="green">模型输出</Tag>
}

function versionSourceLabel(source?: string) {
  if (source === 'agent_execute') return 'Agent 回写'
  if (source === 'repair') return '连续性修复'
  if (source === 'rollback') return '回滚产生'
  return '手动编辑'
}

function versionSourceColor(source?: string) {
  if (source === 'agent_execute') return 'blue'
  if (source === 'repair') return 'orange'
  if (source === 'rollback') return 'purple'
  return 'green'
}

function buildTextDiff(currentText: string, versionText: string) {
  const a = String(currentText || '').split(/\r?\n/)
  const b = String(versionText || '').split(/\r?\n/)
  const max = Math.max(a.length, b.length)
  const rows: Array<{ type: 'same' | 'add' | 'remove'; text: string }> = []
  for (let i = 0; i < max; i += 1) {
    const la = a[i] ?? ''
    const lb = b[i] ?? ''
    if (la === lb) { if (la) rows.push({ type: 'same', text: la }) }
    else {
      if (lb) rows.push({ type: 'remove', text: lb })
      if (la) rows.push({ type: 'add', text: la })
    }
  }
  return rows
}

function buildDiffSummary(rows: Array<{ type: string; text: string }>) {
  return {
    added: rows.filter(r => r.type === 'add').length,
    removed: rows.filter(r => r.type === 'remove').length,
    unchanged: rows.filter(r => r.type === 'same').length,
  }
}

function buildTree(outlines: any[], chapters: any[]) {
  const byId = new Map<number, any>()
  outlines.forEach(o => byId.set(o.id, {
    ...o, type: 'outline', key: `outline-${o.id}`,
    title: o.title, children: [] as any[],
  }))
  const roots: any[] = []
  outlines.forEach(o => {
    const node = byId.get(o.id)
    if (o.parent_id && byId.has(o.parent_id)) byId.get(o.parent_id).children.push(node)
    else roots.push(node)
  })
  chapters.forEach(c => {
    const node = {
      ...c, type: 'chapter', key: `chapter-${c.id}`,
      title: c.title, children: [] as any[],
    }
    if (c.outline_id && byId.has(c.outline_id)) byId.get(c.outline_id).children.push(node)
    else roots.push(node)
  })
  return roots
}

function wc(text?: string) {
  return text ? String(text).replace(/\s/g, '').length : 0
}

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
  const [stepOutlineLoading, setStepOutlineLoading] = useState(false)  // ① 生成大纲+细纲
  const [stepProseLoading, setStepProseLoading] = useState(false)      // ② 生成正文
  const [stepRepairLoading, setStepRepairLoading] = useState(false)    // ③ 连续性修复
  // prose batch progress
  const [proseProgress, setProseProgress] = useState({ current: 0, total: 0 })
  // legacy compat (for "AI 一键初始化" button in onboarding)
  const [planning, setPlanning] = useState(false)
  const [executingAgents, setExecutingAgents] = useState(false)
  const [generatingProse, setGeneratingProse] = useState(false)
  const [repairing, setRepairing] = useState(false)

  // ── 3 步写作流程 ──
  const stepGenerateOutline = async () => {
    if (!selectedModelId) return message.warning('请先在顶部选择模型')
    setStepOutlineLoading(true)
    try {
      // 执行 outline + detail-outline + continuity-check（自动包含依赖）
      const res = await apiClient.post('/novel/agents/execute', {
        project_id: projectId,
        model_id: selectedModelId,
        agents: ['outline-agent', 'detail-outline-agent', 'continuity-check-agent'],
        prompt: '请生成世界观、角色、粗纲、细纲，并进行连续性预检。',
        payload: {},
      })
      setAgentExecution(res.data || null)
      await loadProjectModules()
      message.success('大纲 + 细纲 + 连续性预检 完成')
    } catch (e: any) { message.error(e.response?.data?.error || '大纲生成失败') }
    finally { setStepOutlineLoading(false) }
  }

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
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: projectId, model_id: selectedModelId,
              prompt: `请生成第 ${ch.chapter_no} 章《${ch.title}》完整正文`,
            }),
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
    setStepRepairLoading(true)
    try {
      const res = await apiClient.post('/novel/agents/repair', {
        project_id: projectId, model_id: selectedModelId, payload: {},
      })
      setRepairResult(res.data || null)
      await loadProjectModules()
      message.success('连续性修复已完成')
    } catch { message.error('修复失败') }
    finally { setStepRepairLoading(false) }
  }

  // ── streaming ──
  const [streamingChapterId, setStreamingChapterId] = useState<number | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [streamingProgress, setStreamingProgress] = useState('')
  const [streamingPercent, setStreamingPercent] = useState(0)
  const streamingEndRef = useRef<HTMLDivElement | null>(null)

  // ── editors / modals ──
  const [editorKind, setEditorKind] = useState<'worldbuilding' | 'character' | 'outline' | 'chapter' | null>(null)
  const [editorForm] = Form.useForm()
  const templateImportRef = useRef<HTMLInputElement>(null)

  // ── active chapter ──
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null)
  const activeChapter = chapters.find(c => c.id === activeChapterId) || null

  // ── left sidebar drawer (mobile) ──
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false)

  // ── right reference panel ──
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [rightPanelTab, setRightPanelTab] = useState('worldbuilding')

  // ── auto-save state ──
  const [saveStatus, setSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const proseEditorRef = useRef<HTMLTextAreaElement | null>(null)

  // ── diff toggle ──
  const [showOnlyDiff, setShowOnlyDiff] = useState(true)

  // ── chapter tree ──
  const chapterTree = useMemo(() => buildTree(outlines, chapters), [outlines, chapters])
  const chapterTreeData = useMemo(() => chapterTree.map(node => ({
    title: (
      <Space size={4}>
        <Text style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.type === 'chapter' ? '第' : '●'} {node.title}
        </Text>
        {node.type === 'chapter' && chapterStatusTag(node)}
      </Space>
    ),
    key: node.key,
    children: (node.children || []).map(child => ({
      title: (
        <Space size={4}>
          <Text style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {child.type === 'chapter' ? '  └ 第' : '  └ ●'} {child.title}
          </Text>
          {child.type === 'chapter' && chapterStatusTag(child)}
        </Space>
      ),
      key: child.key,
      children: (child.children || []).map(grand => ({
        title: (
          <Space size={4}>
            <Text style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {grand.type === 'chapter' ? '    └ 第' : '    └ ●'} {grand.title}
            </Text>
            {grand.type === 'chapter' && chapterStatusTag(grand)}
          </Space>
        ),
        key: grand.key,
        children: [],
      })),
    })),
  })), [chapterTree])

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

  /* ── actions ───────────────────────────────────────────────────── */
  /** "AI 一键初始化"（空项目引导页上的按钮） — 完整跑 plan（SSE 流式进度） */
  const runPlan = async () => {
    setPlanning(true)
    setPlanProgress(null)
    try {
      const response = await fetch(`${apiClient.defaults.baseURL}/novel/plan?stream=1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          project_id: projectId,
          model_id: selectedModelId,
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
            if (data.type === 'progress') {
              setPlanProgress(data)
            } else if (data.type === 'done') {
              finalData = data.data
            } else if (data.type === 'error') {
              throw new Error(data.error)
            }
          } catch { /* skip malformed JSON */ }
        }
      }

      // Process remaining buffer
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
    } catch (err: any) {
      message.error(err.message || '规划失败')
    } finally {
      setPlanning(false)
      setPlanProgress(null)
    }
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
      message.error(error.response?.data?.error || '执行失败')
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
        previousChapter: chapters
          .filter(ch => ch.chapter_no < activeChapter.chapter_no)
          .sort((a, b) => b.chapter_no - a.chapter_no)[0] || null,
      }
      const resp = await fetch(
        `${apiClient.defaults.baseURL}/novel/chapters/${activeChapter.id}/generate-prose?stream=1`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({
            project_id: projectId, model_id: selectedModelId,
            prompt: `请生成第 ${activeChapter.chapter_no} 章《${activeChapter.title}》完整正文`,
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

  const runRepair = async () => {
    setRepairing(true)
    try {
      const res = await apiClient.post('/novel/agents/repair', { project_id: projectId, payload: {} })
      setRepairResult(res.data || null)
      await loadProjectModules()
      message.success('连续性修复已完成')
    } catch { message.error('修复失败') }
    finally { setRepairing(false) }
  }

  /* ── editor helpers ────────────────────────────────────────────── */
  const openEditor = (kind: typeof editorKind, item?: any) => {
    if (kind === 'worldbuilding') {
      editorForm.setFieldsValue(item || worldbuilding[0] || {
        world_summary: '', rules: [], timeline_anchor: '', known_unknowns: [], version: 1,
      })
    } else if (kind === 'character') {
      editorForm.setFieldsValue(item || { name: '', role_type: '', archetype: '', motivation: '', goal: '', conflict: '' })
    } else if (kind === 'outline') {
      editorForm.setFieldsValue(item || {
        outline_type: 'master', title: '', summary: '', conflict_points: [],
        turning_points: [], hook: '', parent_id: null,
      })
    } else if (kind === 'chapter') {
      editorForm.setFieldsValue(item || {
        chapter_no: 1, title: '', chapter_goal: '', chapter_summary: '',
        conflict: '', ending_hook: '', outline_id: null, chapter_text: '',
      })
    }
    setEditorKind(kind)
  }

  const submitEditor = async () => {
    const v = await editorForm.validateFields()
    try {
      if (editorKind === 'worldbuilding')
        await apiClient.post(`/novel/projects/${projectId}/worldbuilding`, {
          project_id: projectId,
          world_summary: v.world_summary || '',
          rules: String(v.rules || '').split(',').map((s: string) => s.trim()).filter(Boolean),
          timeline_anchor: v.timeline_anchor || '',
          known_unknowns: String(v.known_unknowns || '').split(',').map((s: string) => s.trim()).filter(Boolean),
          version: Number(v.version || 1), factions: [], locations: [], systems: [],
        })
      else if (editorKind === 'character')
        await apiClient.post('/novel/characters', {
          project_id: projectId, name: v.name,
          role_type: v.role_type || '', archetype: v.archetype || '',
          motivation: v.motivation || '', goal: v.goal || '', conflict: v.conflict || '',
        })
      else if (editorKind === 'outline')
        await apiClient.post('/novel/outlines', {
          project_id: projectId,
          outline_type: v.outline_type || 'master', title: v.title,
          summary: v.summary || '',
          conflict_points: String(v.conflict_points || '').split(',').map((s: string) => s.trim()).filter(Boolean),
          turning_points: String(v.turning_points || '').split(',').map((s: string) => s.trim()).filter(Boolean),
          hook: v.hook || '', parent_id: v.parent_id ?? null,
        })
      else if (editorKind === 'chapter')
        await apiClient.post('/novel/chapters', {
          project_id: projectId,
          chapter_no: Number(v.chapter_no || 1), title: v.title,
          chapter_goal: v.chapter_goal || '', chapter_summary: v.chapter_summary || '',
          conflict: v.conflict || '', ending_hook: v.ending_hook || '',
          status: 'draft', outline_id: v.outline_id ?? null,
          chapter_text: v.chapter_text || '', scene_breakdown: [], continuity_notes: [],
        })
      message.success('已保存')
      setEditorKind(null)
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

  /* ── sorted chapters for list ──────────────────────────────────── */
  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.chapter_no - b.chapter_no),
    [chapters],
  )

  /* ── render: save status icon ──────────────────────────────────── */
  const SaveIndicator = () => {
    if (saveStatus === 'unsaved') return <Tooltip title="有未保存的修改"><ClockCircleOutlined style={{ color: '#faad14' }} /></Tooltip>
    if (saveStatus === 'saving') return <Tooltip title="保存中…"><SyncOutlined style={{ color: '#1677ff', animation: 'spin 1s linear infinite' }} /></Tooltip>
    if (saveStatus === 'saved') return <Tooltip title="已保存"><CheckCircleOutlined style={{ color: '#52c41a' }} /></Tooltip>
    return null
  }

  /* ── render ────────────────────────────────────────────────────── */
  if (loading && !selectedProject) {
    return <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}><ReloadOutlined className="anticon" style={{ fontSize: 24, animation: 'spin 1s linear infinite' }} /> 加载中…</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#f5f5f5' }}>

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
        <Tooltip title="刷新">
          <Button type="text" size="small" icon={<ReloadOutlined />} loading={loading} onClick={loadProjectModules} />
        </Tooltip>
      </div>

      {/* ═══ BODY: 3-column layout ═══ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ─── LEFT: Chapter list + Outline tree ─── */}
        <div style={{
          width: 200, flexShrink: 0, background: '#fff',
          borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Quick actions — 3-step flow */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
            <Text style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>✍️ 写作流程</Text>
            <Space direction="vertical" style={{ width: '100%' }} size={6}>
              <Tooltip title={selectedModelId ? '生成世界观 + 角色 + 粗纲 + 细纲 + 预检' : '请先在顶部选择模型'}>
                <Button size="small" block icon={<RocketOutlined />} loading={stepOutlineLoading} disabled={!selectedModelId} onClick={stepGenerateOutline}>
                  ① 生成大纲
                </Button>
              </Tooltip>
              <Tooltip title={selectedModelId ? '根据细纲批量生成所有章节正文' : '请先在顶部选择模型'}>
                <Button size="small" block icon={<PlayCircleOutlined />} loading={stepProseLoading} disabled={!selectedModelId} onClick={stepGenerateProse}>
                  ② 生成正文
                </Button>
              </Tooltip>
              <Tooltip title="检查并修复前后章矛盾">
                <Button size="small" block icon={<SafetyOutlined />} loading={stepRepairLoading} onClick={stepRunRepair}>
                  ③ 连续性修复
                </Button>
              </Tooltip>
            </Space>
            {proseProgress.current > 0 && (
              <div style={{ marginTop: 6 }}>
                <Progress percent={Math.round(proseProgress.current / proseProgress.total * 100)} size="small"
                  format={() => `${proseProgress.current}/${proseProgress.total}`} />
              </div>
            )}
          </div>

          {/* Chapter list */}
          <div style={{ padding: '8px 0', flex: 1, overflow: 'auto' }}>
            <div style={{ padding: '4px 12px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ fontSize: 12 }}><UnorderedListOutlined /> 章节</Text>
              <Button size="small" type="text" onClick={() => openEditor('chapter')} icon={<EditOutlined />} />
            </div>
            {sortedChapters.length === 0 ? (
              <div style={{ padding: '16px 12px', textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>暂无章节</Text>
              </div>
            ) : (
              sortedChapters.map(ch => (
                <div
                  key={ch.id}
                  onClick={() => setActiveChapterId(ch.id)}
                  style={{
                    padding: '8px 12px', cursor: 'pointer',
                    background: ch.id === activeChapterId ? '#e6f4ff' : 'transparent',
                    borderLeft: ch.id === activeChapterId ? '3px solid #1677ff' : '3px solid transparent',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={e => { if (ch.id !== activeChapterId) (e.currentTarget as HTMLDivElement).style.background = '#fafafa' }}
                  onMouseLeave={e => { if (ch.id !== activeChapterId) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  <Space style={{ width: '100%' }} justify="space-between" align="start">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Text strong style={{ fontSize: 13 }}>第{ch.chapter_no}章</Text>
                        {chapterStatusTag(ch)}
                      </div>
                      <Text style={{ fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 180 }}>
                        {ch.title || '无标题'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>{wc(ch.chapter_text)} 字</Text>
                    </div>
                    <Popconfirm title="删除此章？" onConfirm={() => deleteChapter(ch.id)} okButtonProps={{ danger: true }}>
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={e => e.stopPropagation()} />
                    </Popconfirm>
                  </Space>
                </div>
              ))
            )}
          </div>

          {/* Outline tree */}
          <div style={{ borderTop: '1px solid #f0f0f0', maxHeight: 220, overflow: 'auto' }}>
            <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ fontSize: 12 }}>大纲树</Text>
              <Button size="small" type="text" onClick={() => openEditor('outline')} icon={<EditOutlined />} />
            </div>
            <div style={{ padding: '0 12px 8px' }}>
              {chapterTreeData.length > 0 ? (
                <Tree treeData={chapterTreeData} blockNode showLine defaultExpandAll virtual={false}
                  style={{ fontSize: 12 }} />
              ) : <Text type="secondary" style={{ fontSize: 12 }}>暂无大纲</Text>}
            </div>
          </div>

          {/* Stats */}
          <div style={{ borderTop: '1px solid #f0f0f0', padding: '8px 12px' }}>
            <Space wrap size={[4, 2]}>
              <Tag color="blue" bordered={false} style={{ fontSize: 11 }}>章 {chapters.length}</Tag>
              <Tag color="green" bordered={false} style={{ fontSize: 11 }}>文 {proseChapters.length}</Tag>
              <Tag color="cyan" bordered={false} style={{ fontSize: 11 }}>界 {worldbuilding.length}</Tag>
            </Space>
          </div>
        </div>

        {/* ─── CENTER: Editor ─── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fafbfc' }}>

          {/* Empty project onboarding */}
          {isEmptyProject && (
            <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 32 }}>
              <div style={{ maxWidth: 640, textAlign: 'center' }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🚀</div>
                <Title level={3}>欢迎开始创作《{selectedProject?.title}》</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 32 }}>
                  你的小说项目已创建。选择以下任一路径开始：
                </Text>
                <Row gutter={24} justify="center">
                  {[
                    { icon: '🤖', title: 'AI 一键初始化', desc: '自动生成世界观、角色、大纲', btn: <Button type="primary" loading={planning} onClick={runPlan}>开始规划</Button> },
                    { icon: '✏️', title: '手动创建', desc: '从大纲开始逐步构建', btn: <Button onClick={() => openEditor('outline')}>创建大纲</Button> },
                    { icon: '📝', title: '直接写第一章', desc: '跳过规划直接写正文', btn: <Button onClick={() => openEditor('chapter')}>新增章节</Button> },
                  ].map(c => (
                    <Col key={c.title} xs={22} sm={12}>
                      <Card hoverable style={{ borderRadius: 16, height: '100%' }}
                        bodyStyle={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>{c.icon}</div>
                        <Title level={5}>{c.title}</Title>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>{c.desc}</Text>
                        {c.btn}
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            </div>
          )}

          {/* Main editor area */}
          {!isEmptyProject && activeChapter && (
            <>
              {/* Chapter header bar */}
              <div style={{
                flexShrink: 0, padding: '10px 24px', background: '#fff',
                borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <Title level={5} style={{ margin: 0 }}>
                  第{activeChapter.chapter_no}章《{activeChapter.title || '无标题'}》
                </Title>
                {chapterStatusTag(activeChapter)}
                <div style={{ flex: 1 }} />
                <Text type="secondary" style={{ fontSize: 13 }}>{wc(activeChapter.chapter_text)} 字</Text>
                <SaveIndicator />
                <Tooltip title="生成正文">
                  <Button type="primary" size="small" icon={<PlayCircleOutlined />} loading={generatingProse} onClick={generateCurrentChapterProse} />
                </Tooltip>
                <Button size="small" onClick={() => openEditor('chapter', activeChapter)} icon={<EditOutlined />}>元数据</Button>
              </div>

              {/* Streaming preview */}
              {streamingChapterId === activeChapter.id && (
                <div style={{ flexShrink: 0, padding: '12px 24px', background: '#f0f7ff', borderBottom: '1px solid #d6e4ff' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size={8}>
                    <Space align="center">
                      <Text strong style={{ fontSize: 13 }}>🤖 生成进度</Text>
                      <Tag color="blue">{streamingProgress || '进行中'}</Tag>
                      <Text type="secondary">{Math.round(streamingPercent)}%</Text>
                    </Space>
                    <Progress percent={streamingPercent} status={streamingProgress === '生成失败' ? 'exception' : 'active'} size="small" />
                    <Paragraph
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        fontSize: 13, maxHeight: 200, overflow: 'auto', margin: 0,
                        whiteSpace: 'pre-wrap', lineHeight: 1.6,
                      }}
                    >
                      {streamingText}
                      <div ref={streamingEndRef} />
                    </Paragraph>
                  </Space>
                </div>
              )}

              {/* Chapter context (collapsible) */}
              <details style={{ flexShrink: 0, margin: 0 }}>
                <summary style={{
                  padding: '8px 24px', cursor: 'pointer', background: '#fafbfc',
                  borderBottom: '1px solid #f0f0f0', fontSize: 13, color: '#999',
                }}>
                  📋 章节上下文（展开查看章节目标、摘要、冲突、钩子）
                </summary>
                <div style={{ padding: '12px 24px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
                  <Descriptions column={2} size="small" bordered>
                    <Descriptions.Item label="章节目标">{activeChapter.chapter_goal || '-'}</Descriptions.Item>
                    <Descriptions.Item label="章节摘要">{activeChapter.chapter_summary || '-'}</Descriptions.Item>
                    <Descriptions.Item label="冲突">{activeChapter.conflict || '-'}</Descriptions.Item>
                    <Descriptions.Item label="结尾钩子">{activeChapter.ending_hook || '-'}</Descriptions.Item>
                    <Descriptions.Item label="状态">{activeChapter.status || '-'}</Descriptions.Item>
                    <Descriptions.Item label="基础依赖">
                      {worldbuilding.length > 0 ? '✓ 世界观' : '✗ 世界观'} ·
                      {characters.length > 0 ? '✓ 角色' : '✗ 角色'} ·
                      {outlines.length > 0 ? '✓ 大纲' : '✗ 大纲'}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              </details>

              {/* Prose editor — full-width immersive writing area */}
              <div style={{ flex: 1, padding: 0, overflow: 'auto' }}>
                <Input.TextArea
                  ref={proseEditorRef}
                  value={activeChapter.chapter_text || ''}
                  onChange={e => {
                    const next = e.target.value
                    setChapters(prev => prev.map(c => c.id === activeChapterId ? { ...c, chapter_text: next } : c))
                    scheduleSave(next)
                  }}
                  placeholder="开始写吧……（自动保存）"
                  autoSize={{ minRows: 999 }}
                  style={{
                    width: '100%', height: '100%', boxSizing: 'border-box',
                    fontSize: 17, lineHeight: 2, fontFamily: 'Noto Serif SC, Source Han Serif SC, Georgia, serif',
                    border: 'none', borderRadius: 0,
                    boxShadow: 'none !important',
                    padding: '32px 60px',
                    background: '#fff',
                    resize: 'none',
                    outline: 'none',
                  }}
                  className="prose-editor"
                />
              </div>
            </>
          )}

          {/* No chapter selected */}
          {!isEmptyProject && !activeChapter && (
            <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
              <Space direction="vertical" align="center" size={16}>
                <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                <Title level={4}>请选择一个章节</Title>
                <Button type="primary" onClick={() => openEditor('chapter')}>
                  创建第一章
                </Button>
              </Space>
            </div>
          )}
        </div>

        {/* ─── RIGHT: Reference panel ─── */}
        {rightPanelOpen && (
          <div style={{
            width: 320, flexShrink: 0, background: '#fff',
            borderLeft: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ fontSize: 12 }}>📚 参考资料</Text>
              <Button type="text" size="small" onClick={() => setRightPanelOpen(false)}>✕</Button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <Tabs activeKey={rightPanelTab} onChange={setRightPanelTab} size="small"
                items={[
                  {
                    key: 'worldbuilding',
                    label: '世界观',
                    children: worldbuilding.length === 0 ? (
                      <div style={{ padding: 12, textAlign: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>暂无世界观设定</Text>
                        <br />
                        <Button size="small" type="link" onClick={() => openEditor('worldbuilding')}>创建</Button>
                      </div>
                    ) : (
                      worldbuilding.map((w, idx) => (
                        <Card key={idx} size="small" style={{ margin: 8 }}
                          title={w.world_summary?.slice(0, 30) + (w.world_summary?.length > 30 ? '…' : '')}
                          extra={<Button size="small" type="link" onClick={() => openEditor('worldbuilding', w)}>编辑</Button>}>
                          {w.rules?.length > 0 && <><Text strong>规则：</Text><Text style={{ display: 'block' }}>{w.rules.join(', ')}</Text></>}
                          {w.timeline_anchor && <><Text strong style={{ marginTop: 4, display: 'block' }}>时间锚点：</Text><Text>{w.timeline_anchor}</Text></>}
                          {w.known_unknowns?.length > 0 && <><Text strong style={{ display: 'block' }}>未知项：</Text><Text>{w.known_unknowns.join(', ')}</Text></>}
                        </Card>
                      ))
                    ),
                  },
                  {
                    key: 'characters',
                    label: '角色',
                    children: characters.length === 0 ? (
                      <div style={{ padding: 12, textAlign: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>暂无角色设定</Text>
                        <br />
                        <Button size="small" type="link" onClick={() => openEditor('character')}>创建</Button>
                      </div>
                    ) : (
                      characters.map((c, idx) => (
                        <Card key={idx} size="small" style={{ margin: 8 }} title={c.name}
                          extra={<Button size="small" type="link" onClick={() => openEditor('character', c)}>编辑</Button>}>
                          <Space direction="vertical" size={2} style={{ width: '100%' }}>
                            {c.role_type && <Text><Text strong>定位：</Text>{c.role_type}</Text>}
                            {c.archetype && <Text><Text strong>原型：</Text>{c.archetype}</Text>}
                            {c.motivation && <Text><Text strong>动机：</Text>{c.motivation}</Text>}
                            {c.goal && <Text><Text strong>目标：</Text>{c.goal}</Text>}
                            {c.conflict && <Text><Text strong>冲突：</Text>{c.conflict}</Text>}
                          </Space>
                        </Card>
                      ))
                    ),
                  },
                  {
                    key: 'outline',
                    label: '大纲',
                    children: outlines.length === 0 ? (
                      <div style={{ padding: 12, textAlign: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>暂无大纲</Text>
                        <br />
                        <Button size="small" type="link" onClick={() => openEditor('outline')}>创建</Button>
                      </div>
                    ) : (
                      outlines.map((o, idx) => (
                        <Card key={idx} size="small" style={{ margin: 8 }}
                          title={<Space><Tag color="purple">{o.outline_type === 'master' ? '总纲' : o.outline_type === 'volume' ? '卷纲' : '章纲'}</Tag><Text strong>{o.title}</Text></Space>}
                          extra={<Button size="small" type="link" onClick={() => openEditor('outline', o)}>编辑</Button>}>
                          {o.summary && <Paragraph ellipsis={{ rows: 3 }}>{o.summary}</Paragraph>}
                          {o.hook && <Text type="secondary"><Text strong>钩子：</Text>{o.hook}</Text>}
                        </Card>
                      ))
                    ),
                  },
                  {
                    key: 'versions',
                    label: '版本',
                    children: chapterVersions.length === 0 ? (
                      <div style={{ padding: 12, textAlign: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{chapterVersionsLoading ? '加载中…' : '暂无历史版本'}</Text>
                      </div>
                    ) : (
                      chapterVersions.slice().sort((a, b) => b.version_no - a.version_no).map(v => (
                        <Card key={v.id} size="small" style={{ margin: 8 }}
                          title={`v${v.version_no}`}
                          extra={<Space>
                            <Tag color={versionSourceColor(v.source)} bordered={false}>{versionSourceLabel(v.source)}</Tag>
                            <Button size="small" danger onClick={() => rollbackChapterVersion(v.id)} loading={rollingBackVersionId === v.id}>回滚</Button>
                          </Space>}
                          onClick={() => setChapterVersionDetail(v)}>
                          <Text type="secondary" style={{ fontSize: 11 }}>{v.created_at}</Text>
                          <br />
                          <Text style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
                            {(v.chapter_text || '空').slice(0, 100)}
                          </Text>
                        </Card>
                      ))
                    ),
                  },
                ]}
              />
            </div>
          </div>
        )}

        {/* Right panel toggle (when closed) */}
        {!rightPanelOpen && (
          <div style={{ width: 28, flexShrink: 0, background: '#fafafa', borderLeft: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Button type="text" shape="circle" size="small" onClick={() => setRightPanelOpen(true)}>📚</Button>
          </div>
        )}
      </div>

      {/* ═══ Editor Modal ═══ */}
      <Modal
        open={editorKind !== null}
        title={
          { worldbuilding: '编辑世界观', character: '角色设定', outline: '大纲设定', chapter: '章节信息' }[editorKind || 'chapter'] || '编辑'
        }
        onCancel={() => setEditorKind(null)}
        onOk={submitEditor} okText="保存"
        width={720}
      >
        <Form form={editorForm} layout="vertical" style={{ marginTop: 8 }}>
          {editorKind === 'worldbuilding' && (
            <>
              <Form.Item name="world_summary" label="世界摘要"><Input.TextArea rows={4} placeholder="描述世界整体设定" /></Form.Item>
              <Form.Item name="rules" label="规则（逗号分隔）"><Input placeholder="例如：循环规则, 能力限制, 时间代价" /></Form.Item>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="timeline_anchor" label="时间锚点"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="version" label="版本"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Form.Item name="known_unknowns" label="未知项（逗号分隔）"><Input placeholder="例如：真相来源, 事件操控者" /></Form.Item>
            </>
          )}
          {editorKind === 'character' && (
            <>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="name" label="角色名" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="role_type" label="角色定位"><Input /></Form.Item></Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="archetype" label="原型"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="goal" label="目标"><Input /></Form.Item></Col>
              </Row>
              <Form.Item name="motivation" label="动机"><Input.TextArea rows={2} /></Form.Item>
              <Form.Item name="conflict" label="冲突"><Input.TextArea rows={2} /></Form.Item>
            </>
          )}
          {editorKind === 'outline' && (
            <>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="outline_type" label="大纲类型"><Select options={[{ value: 'master', label: '总纲' }, { value: 'volume', label: '卷纲' }, { value: 'chapter', label: '章纲' }]} /></Form.Item></Col>
                <Col span={12}><Form.Item name="title" label="标题" rules={[{ required: true }]}><Input /></Form.Item></Col>
              </Row>
              <Form.Item name="parent_id" label="父级大纲ID"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="summary" label="摘要"><Input.TextArea rows={4} /></Form.Item>
              <Form.Item name="conflict_points" label="冲突点（逗号分隔）"><Input /></Form.Item>
              <Form.Item name="turning_points" label="转折点（逗号分隔）"><Input /></Form.Item>
              <Form.Item name="hook" label="钩子"><Input.TextArea rows={2} /></Form.Item>
            </>
          )}
          {editorKind === 'chapter' && (
            <>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="chapter_no" label="章节序号"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={12}><Form.Item name="title" label="章节标题" rules={[{ required: true }]}><Input /></Form.Item></Col>
              </Row>
              <Form.Item name="outline_id" label="所属大纲ID"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="chapter_goal" label="章节目标"><Input.TextArea rows={2} /></Form.Item>
              <Form.Item name="chapter_summary" label="章节摘要"><Input.TextArea rows={3} /></Form.Item>
              <Form.Item name="conflict" label="冲突"><Input.TextArea rows={2} /></Form.Item>
              <Form.Item name="ending_hook" label="结尾钩子"><Input.TextArea rows={2} /></Form.Item>
              <Form.Item name="chapter_text" label="正文"><Input.TextArea rows={4} /></Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* ═══ Version Detail Modal ═══ */}
      <Modal
        open={chapterVersionDetail !== null}
        title={chapterVersionDetail ? `版本 v${chapterVersionDetail.version_no} · ${versionSourceLabel(chapterVersionDetail.source)}` : '版本详情'}
        onCancel={() => setChapterVersionDetail(null)} footer={null} width={900}
      >
        {chapterVersionDetail && (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="版本号">v{chapterVersionDetail.version_no}</Descriptions.Item>
              <Descriptions.Item label="来源">{versionSourceLabel(chapterVersionDetail.source)}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{chapterVersionDetail.created_at}</Descriptions.Item>
            </Descriptions>

            {/* Full text */}
            <Card size="small" title="正文全文">
              <Text style={{ whiteSpace: 'pre-wrap' }}>{chapterVersionDetail.chapter_text || '空版本'}</Text>
            </Card>

            {/* Diff */}
            {activeChapter && (
              <Card size="small" title="与当前稿对比"
                extra={<Button size="small" onClick={() => setShowOnlyDiff(prev => !prev)}>{showOnlyDiff ? '显示全部' : '只看差异'}</Button>}>
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  <div style={{ padding: 12, borderRadius: 8, background: '#fafafa', border: '1px solid #eee', maxHeight: 320, overflow: 'auto' }}>
                    {buildTextDiff(activeChapter.chapter_text || '', chapterVersionDetail.chapter_text || '')
                      .filter(r => !showOnlyDiff || r.type !== 'same')
                      .map((r, i) => (
                        <div key={i} style={{
                          whiteSpace: 'pre-wrap', marginBottom: 2,
                          color: r.type === 'add' ? '#166534' : r.type === 'remove' ? '#b91c1c' : '#333',
                          background: r.type === 'add' ? '#dcfce7' : r.type === 'remove' ? '#fee2e2' : 'transparent',
                          padding: r.type === 'same' ? 0 : '2px 4px', borderRadius: 4,
                          textDecoration: r.type === 'remove' ? 'line-through' : 'none',
                        }}>{r.type === 'add' ? `+ ${r.text}` : r.type === 'remove' ? `- ${r.text}` : `  ${r.text}`}</div>
                      ))}
                  </div>
                  {(() => {
                    const s = buildDiffSummary(buildTextDiff(activeChapter.chapter_text || '', chapterVersionDetail.chapter_text || ''))
                    return <Text>新增 {s.added} 行，删除 {s.removed} 行，未变 {s.unchanged} 行</Text>
                  })()}
                </Space>
              </Card>
            )}

            {/* Scenes */}
            <Card size="small" title="分场结构">
              {Array.isArray(chapterVersionDetail.scene_breakdown) && chapterVersionDetail.scene_breakdown.length > 0 ?
                chapterVersionDetail.scene_breakdown.map((s: any, i: number) => (
                  <Card key={i} size="small" style={{ marginBottom: 8 }} title={s.title || `场景 ${i + 1}`}>
                    <Text style={{ whiteSpace: 'pre-wrap' }}>{s.summary || JSON.stringify(s)}</Text>
                  </Card>
                )) : <Text type="secondary">暂无分场结构。</Text>}
            </Card>

            {/* Continuity */}
            <Card size="small" title="连贯性备注">
              {Array.isArray(chapterVersionDetail.continuity_notes) && chapterVersionDetail.continuity_notes.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {chapterVersionDetail.continuity_notes.map((n: string, i: number) => <li key={i}>{n}</li>)}
                </ul>
              ) : <Text type="secondary">暂无连贯性备注。</Text>}
            </Card>
          </Space>
        )}
      </Modal>

      {/* ═══ Agent execution results Modal ═══ */}
      {agentExecution && (
        <Modal title="Agent 执行结果" open={!!agentExecution} onCancel={() => setAgentExecution(null)} footer={null} width={800}>
          {(agentExecution.results || []).map((item: any) => (
            <Card key={item.agent_id || item.step} size="small" title={item.agent_id || item.step} extra={sourceLabel(item)} style={{ marginBottom: 8 }}>
              <Text style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(item.output, null, 2)}</Text>
            </Card>
          ))}
        </Modal>
      )}
    </div>
  )
}
