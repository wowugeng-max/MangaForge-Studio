import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Form, message } from 'antd'
import apiClient from '../../../api/client'
import {
  createEmptyLaunchpadFields,
  evaluateLaunchpadReadiness,
  summarizeFirst30Plan,
  type LaunchpadFields,
} from '../launchpadModel'
import { type DeepDraftReviewModel } from '../deepDraftReviewModel'
import {
  FALLBACK_GENRE_CATALOG_GUIDES,
  filterGenreCatalogGuidesByPrimary,
  frameworkMatchesPrimaryGenre,
  genreFrameworkToPrimaryGenre,
  groupGenreCatalogGuides,
  matchGenreCatalogGuide,
  type GenreCatalogGuide,
} from '../genreCatalogGuide'
import {
  type CreateMode,
} from './createWizardOptions'
import {
  buildDeepDraftReviewForUi,
} from './createWizardSeedUtils'
import {
  buildCreatePayload as buildCreatePayloadFromUtils,
} from './createWizardPayloadUtils'

const projectSeedModelStorageKey = 'novel.projectSeed.model_id'
const PREFERRED_KERNEL_MODEL = 'kernel-codex-gpt-5.6-luna'
const KERNEL_JOBS_PATH = '/api/kernel/jobs'

const apiBase = () =>
  String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787/api').replace(/\/$/, '')

function resolveApiUrl(path: string) {
  if (path.startsWith('/api/')) return `${apiBase()}${path.slice('/api'.length)}`
  if (path.startsWith('http')) return path
  return `${apiBase()}${path.startsWith('/') ? path : `/${path}`}`
}

async function fetchJson(path: string, init?: RequestInit) {
  const response = await fetch(resolveApiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const body = await response.json().catch(() => ({}))
  // 202 Accepted is success (response.ok is true for 2xx, including 202)
  if (response.status === 202) return body?.ok === false ? body : { ok: true, ...body }
  if (!response.ok) {
    return { ok: false, code: body?.code || 'UNKNOWN', error: body?.error, ...body }
  }
  return body
}

function isClearly302(model: any) {
  if (Number(model?.id) === 302) return true
  const blob = `${model?.provider || ''} ${model?.display_name || ''} ${model?.model_name || ''} ${model?.name || ''}`.toLowerCase()
  return /\b302\b/.test(blob) || blob.includes('302.ai')
}

function isTextCapableModel(model: any) {
  const caps = model?.capabilities && typeof model.capabilities === 'object' ? model.capabilities : {}
  const isMediaOnly = caps.text_to_image || caps.image_to_image || caps.text_to_video || caps.image_to_video
  return !isMediaOnly || caps.chat || caps.reasoning || caps.vision
}

function pickKernelModelId(models: any[], current?: number) {
  const usable = models.filter(model => isTextCapableModel(model) && !isClearly302(model))
  const preferred = usable.find(model => `${model.display_name || ''} ${model.model_name || ''} ${model.name || ''}`.includes(PREFERRED_KERNEL_MODEL))
  if (preferred) return Number(preferred.id)
  if (current && usable.some(model => Number(model.id) === Number(current))) return Number(current)
  return usable[0] ? Number(usable[0].id) : undefined
}

export type IncubationArtifact = { id: string; rel_path: string; artifact_kind: string }

export type IncubationState =
  | { phase: 'idle' }
  | { phase: 'creating' }
  | { phase: 'running'; jobId: string; hint: string; elapsedMs: number }
  | { phase: 'awaiting_selection'; jobId: string; candidateId: string; artifacts: IncubationArtifact[] }
  | { phase: 'failed'; jobId: string | null; errorCode: string }

export type ArtifactPreview = {
  id: string
  rel_path: string
  content: string
  truncated: boolean
}

export interface NovelFormValues {
  title: string
  genre: string
  sub_genres: string[]
  length_target: string
  target_audience: string
  female_audience_mode: string
  style_tags: string[]
  commercial_tags: string[]
  synopsis: string
}

export interface NovelCreateWizardProps {
  open: boolean
  onCancel: () => void
  onSuccess: (projectId: number) => void
}

export type ProjectSeedDraft = {
  id: number
  title: string
  idea?: string
  seed?: any
  review_model?: Partial<DeepDraftReviewModel>
  diagnostics?: any
  model_id?: number | null
  created_at?: string
  updated_at?: string
}

export function useCreateWizardController({ open, onCancel, onSuccess }: NovelCreateWizardProps) {
  const [current, setCurrent] = useState(0)
  const [creating, setCreating] = useState(false)
  const [createdId, setCreatedId] = useState<number | null>(null)
  const [seedIdea, setSeedIdea] = useState('')
  const [createMode, setCreateMode] = useState<CreateMode>('manual')
  const [genreCatalogGuides, setGenreCatalogGuides] = useState<GenreCatalogGuide[]>(FALLBACK_GENRE_CATALOG_GUIDES)
  const [selectedGenreFramework, setSelectedGenreFramework] = useState('')
  const [genreCatalogLoading, setGenreCatalogLoading] = useState(false)
  const [deepDraftReview, setDeepDraftReview] = useState<DeepDraftReviewModel>(() => buildDeepDraftReviewForUi({}))
  const [launchpad, setLaunchpad] = useState<LaunchpadFields>(() => createEmptyLaunchpadFields())
  const [modelsLoading, setModelsLoading] = useState(false)
  const [models, setModels] = useState<any[]>([])
  const [seedModelId, setSeedModelId] = useState<number | undefined>(() => {
    const parsed = Number(typeof window === 'undefined' ? 0 : window.localStorage.getItem(projectSeedModelStorageKey) || 0)
    return parsed || undefined
  })
  const [form] = Form.useForm<NovelFormValues>()
  const [data, setData] = useState({
    title: '',
    genre: '',
    sub_genres: [] as string[],
    length_target: 'medium',
    target_audience: '',
    female_audience_mode: 'auto',
    style_tags: [] as string[],
    commercial_tags: [] as string[],
    synopsis: '',
  })
  const [incubation, setIncubation] = useState<IncubationState>({ phase: 'idle' })
  const [artifactPreview, setArtifactPreview] = useState<ArtifactPreview | null>(null)
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null)
  const [adopting, setAdopting] = useState(false)
  const [discarding, setDiscarding] = useState(false)

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const incubationProjectIdRef = useRef<number | null>(null)
  const pollGenerationRef = useRef(0)
  const incubationRef = useRef(incubation)
  incubationRef.current = incubation

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const loadGenreCatalog = async () => {
      setGenreCatalogLoading(true)
      try {
        const res = await apiClient.get('/novel/genre-catalog')
        const guides = Array.isArray(res.data?.guides) ? res.data.guides : []
        if (!cancelled && guides.length > 0) setGenreCatalogGuides(guides)
      } catch {
        if (!cancelled) setGenreCatalogGuides(FALLBACK_GENRE_CATALOG_GUIDES)
      } finally {
        if (!cancelled) setGenreCatalogLoading(false)
      }
    }
    void loadGenreCatalog()
    return () => { cancelled = true }
  }, [open])

  React.useEffect(() => {
    form.setFieldsValue(data)
  }, [data, form])

  React.useEffect(() => {
    if (!open || models.length > 0 || modelsLoading) return
    setModelsLoading(true)
    apiClient.get('/models/')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : []
        setModels(list)
        const nextId = pickKernelModelId(list, seedModelId)
        if (nextId) {
          setSeedModelId(nextId)
          if (typeof window !== 'undefined') window.localStorage.setItem(projectSeedModelStorageKey, String(nextId))
        } else if (seedModelId) {
          setSeedModelId(undefined)
          if (typeof window !== 'undefined') window.localStorage.removeItem(projectSeedModelStorageKey)
        }
      })
      .catch(() => message.error('无法加载模型列表'))
      .finally(() => setModelsLoading(false))
  }, [open, models.length, modelsLoading, seedModelId])

  const formItems = ['target', 'hook', 'longform', 'first30', 'confirm', 'done']

  const updateLaunchpad = (patch: Partial<LaunchpadFields>) => {
    setLaunchpad(prev => ({ ...prev, ...patch }))
  }

  const updateFirst30Plan = (patch: Partial<LaunchpadFields['first30_plan']>) => {
    setLaunchpad(prev => ({
      ...prev,
      first30_plan: {
        ...prev.first30_plan,
        ...patch,
      },
    }))
  }

  const first30Summary = summarizeFirst30Plan(null)
  const launchpadReadiness = evaluateLaunchpadReadiness(launchpad, null, data.length_target)

  const autoMatchedGenreGuide = useMemo(
    () => matchGenreCatalogGuide(genreCatalogGuides, selectedGenreFramework, data.title, data.genre, seedIdea, data.synopsis, ...(data.sub_genres || [])),
    [genreCatalogGuides, selectedGenreFramework, data.title, data.genre, seedIdea, data.synopsis, data.sub_genres],
  )
  const activeGenreGuide = useMemo(() => {
    if (selectedGenreFramework) {
      return genreCatalogGuides.find(item => item.framework === selectedGenreFramework) || autoMatchedGenreGuide
    }
    return autoMatchedGenreGuide
  }, [selectedGenreFramework, genreCatalogGuides, autoMatchedGenreGuide])
  const genreGuideGroups = useMemo(() => {
    const filtered = filterGenreCatalogGuidesByPrimary(genreCatalogGuides, data.genre)
    return groupGenreCatalogGuides(filtered)
  }, [genreCatalogGuides, data.genre])

  const clearPoll = useCallback(() => {
    pollGenerationRef.current += 1
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  useEffect(() => () => clearPoll(), [clearPoll])

  const selectedKernelModel = models.find(model => Number(model.id) === Number(seedModelId))
  const selectedKernelModelId = selectedKernelModel && !isClearly302(selectedKernelModel)
    ? Number(selectedKernelModel.id)
    : pickKernelModelId(models, seedModelId)

  const projectFormPayload = () => ({
    title: data.title.trim(),
    genre: data.genre || '',
    length_target: data.length_target || 'medium',
    synopsis: data.synopsis || '',
    status: 'draft',
  })

  const pollIncubation = useCallback((jobId: string) => {
    const generation = pollGenerationRef.current
    const tick = async () => {
      if (generation !== pollGenerationRef.current) return
      try {
        const detail = await fetchJson(`${KERNEL_JOBS_PATH}/${jobId}`)
        if (generation !== pollGenerationRef.current) return
        const status = String(detail?.job?.status || '')
        const hint = String(detail?.progress?.hint || detail?.progress?.phase || status || '')
        const elapsedMs = Number(detail?.progress?.elapsed_ms || 0)
        if (status === 'awaiting_selection') {
          const candidate = (detail.candidates || []).find((item: any) => item?.status === 'succeeded')
          const candidateId = String(candidate?.id || '')
          const artifacts = ((detail.artifacts || []) as any[])
            .filter(item => !candidateId || String(item?.candidate_id) === candidateId)
            .map(item => ({
              id: String(item.id),
              rel_path: String(item.rel_path || ''),
              artifact_kind: String(item.artifact_kind || ''),
            }))
          setIncubation({ phase: 'awaiting_selection', jobId, candidateId, artifacts })
          return
        }
        if (status === 'failed' || status === 'cancelled') {
          setIncubation({
            phase: 'failed',
            jobId,
            errorCode: String(detail?.job?.error_code || detail?.progress?.error_code || status.toUpperCase()),
          })
          return
        }
        setIncubation({ phase: 'running', jobId, hint, elapsedMs })
      } catch {
        if (generation !== pollGenerationRef.current) return
        setIncubation(prev => (
          prev.phase === 'running' && prev.jobId === jobId
            ? prev
            : { phase: 'running', jobId, hint: '', elapsedMs: 0 }
        ))
      }
      if (generation !== pollGenerationRef.current) return
      pollTimerRef.current = setTimeout(tick, 2000)
    }
    setIncubation({ phase: 'running', jobId, hint: 'queued', elapsedMs: 0 })
    void tick()
  }, [])

  const startDeepDraftIncubation = useCallback(async () => {
    if (!data.title.trim()) {
      message.warning('请输入作品标题')
      return
    }
    if (!seedIdea.trim()) {
      message.warning('请输入创作创意')
      return
    }
    if (!selectedKernelModelId) {
      message.warning('请先选择 Codex 内核文本模型')
      return
    }
    const currentPhase = incubationRef.current.phase
    if (currentPhase === 'creating' || currentPhase === 'running') return

    clearPoll()
    setArtifactPreview(null)
    setIncubation({ phase: 'creating' })
    incubationProjectIdRef.current = null
    try {
      const created = await fetchJson('/api/novel/projects', {
        method: 'POST',
        body: JSON.stringify(projectFormPayload()),
      })
      if (created?.ok === false) {
        setIncubation({ phase: 'failed', jobId: null, errorCode: created.code || 'UNKNOWN' })
        return
      }
      const projectId = Number(created.id || created.project?.id)
      if (!projectId) {
        setIncubation({ phase: 'failed', jobId: null, errorCode: 'PROJECT_ID_MISSING' })
        return
      }
      incubationProjectIdRef.current = projectId
      if (typeof window !== 'undefined') window.localStorage.setItem(projectSeedModelStorageKey, String(selectedKernelModelId))

      const job = await fetchJson(KERNEL_JOBS_PATH, {
        method: 'POST',
        body: JSON.stringify({
          verb: 'open_book',
          project_id: projectId,
          subject_type: 'project',
          subject_id: projectId,
          model_id: selectedKernelModelId,
          user_brief: {
            title: data.title,
            genre: data.genre,
            idea: seedIdea,
            length_target: data.length_target,
            constraints: data.synopsis || '',
          },
        }),
      })
      if (!job.ok) {
        setIncubation({ phase: 'failed', jobId: null, errorCode: job.code || 'UNKNOWN' })
        return
      }
      pollIncubation(job.job.id)
    } catch {
      setIncubation({ phase: 'failed', jobId: null, errorCode: 'UNKNOWN' })
    }
  }, [clearPoll, data.genre, data.length_target, data.synopsis, data.title, pollIncubation, seedIdea, selectedKernelModelId])

  const loadArtifactPreview = useCallback(async (artifact: IncubationArtifact) => {
    if (artifactPreview?.id === artifact.id) {
      setArtifactPreview(null)
      return
    }
    setPreviewLoadingId(artifact.id)
    try {
      const result = await fetchJson(`/api/kernel/artifacts/${artifact.id}/content`)
      if (result?.ok === false) {
        message.error(result.error || result.code || '无法加载产物')
        return
      }
      setArtifactPreview({
        id: artifact.id,
        rel_path: result.artifact?.rel_path || artifact.rel_path,
        content: String(result.content || ''),
        truncated: Boolean(result.truncated),
      })
    } catch {
      message.error('无法加载产物')
    } finally {
      setPreviewLoadingId(null)
    }
  }, [artifactPreview?.id])

  const adoptIncubation = useCallback(async (candidateId: string) => {
    const state = incubationRef.current
    if (state.phase !== 'awaiting_selection') return
    const id = candidateId || state.candidateId
    if (!id) {
      message.warning('没有可采纳的候选')
      return
    }
    setAdopting(true)
    try {
      const result = await fetchJson(`${KERNEL_JOBS_PATH}/${state.jobId}/commit`, {
        method: 'POST',
        body: JSON.stringify({ candidate_id: id }),
      })
      if (result?.ok === false) {
        message.error(result.error || result.code || '采纳失败')
        return
      }
      const projectId = incubationProjectIdRef.current
      if (!projectId) {
        message.error('项目 ID 缺失')
        return
      }
      message.success('已采纳开书产物')
      onSuccess(projectId)
      handleReset()
    } catch {
      message.error('采纳失败')
    } finally {
      setAdopting(false)
    }
  }, [onSuccess])

  const discardIncubation = useCallback(async () => {
    const state = incubationRef.current
    const jobId = state.phase === 'idle' || state.phase === 'creating' ? null : state.jobId
    setDiscarding(true)
    clearPoll()
    try {
      if (jobId) {
        await fetchJson(`${KERNEL_JOBS_PATH}/${jobId}/cancel`, { method: 'POST' })
      }
      setIncubation({ phase: 'idle' })
      setArtifactPreview(null)
      message.info('已丢弃本次孵化，空项目仍保留')
    } catch {
      setIncubation({ phase: 'failed', jobId, errorCode: 'CANCEL_FAILED' })
    } finally {
      setDiscarding(false)
    }
  }, [clearPoll])

  const handleNext = useCallback(async () => {
    if (current === 0) {
      if (!data.title.trim()) {
        message.warning('请输入作品标题')
        return
      }
      if (createMode === 'manual' && !data.genre) {
        message.warning('请选择题材')
        return
      }
      if (createMode === 'deep_draft') {
        await startDeepDraftIncubation()
        return
      }
    }
    if (current === formItems.length - 2) {
      await handleCreate()
      return
    }
    setCurrent(c => c + 1)
  }, [current, data, formItems, createMode, startDeepDraftIncubation])

  const handlePrev = () => {
    if (current === 5) return
    setCurrent(c => Math.max(0, c - 1))
  }

  const buildCreatePayload = (projectSeed = null, payloadData = data, payloadLaunchpad = launchpad) => buildCreatePayloadFromUtils({
    projectSeed,
    payloadData,
    payloadLaunchpad,
    deepDraftReview,
    seedIdea,
    foundationAccepted: false,
  })

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await apiClient.post('/novel/projects', buildCreatePayload())
      const projectId = res.data?.id
      if (projectId) {
        setCreatedId(projectId)
        message.success('小说项目创建成功！')
      }
      setCurrent(5)
    } catch {
      message.error('创建失败，请检查网络连接')
    } finally {
      setCreating(false)
    }
  }

  const handleDone = () => {
    if (createdId) onSuccess(createdId)
    handleReset()
  }

  const handleReset = () => {
    clearPoll()
    setCurrent(0)
    setCreating(false)
    setCreatedId(null)
    setSeedIdea('')
    setCreateMode('manual')
    setSelectedGenreFramework('')
    setDeepDraftReview(buildDeepDraftReviewForUi({}))
    setLaunchpad(createEmptyLaunchpadFields())
    setIncubation({ phase: 'idle' })
    setArtifactPreview(null)
    setPreviewLoadingId(null)
    setAdopting(false)
    setDiscarding(false)
    incubationProjectIdRef.current = null
    setData({
      title: '',
      genre: '',
      sub_genres: [],
      length_target: 'medium',
      target_audience: '',
      female_audience_mode: 'auto',
      style_tags: [],
      commercial_tags: [],
      synopsis: '',
    })
  }

  const handleModalCancel = () => {
    handleReset()
    onCancel()
  }

  const steps = [
    { title: '创作目标', description: '题材与篇幅' },
    { title: '商业钩子', description: '承诺与开篇' },
    { title: '长线承载', description: '主线与扩展' },
    { title: '前30章', description: '追读启动' },
    { title: '确认创建', description: '预览与风险' },
    { title: '创建完成', description: '进入规划' },
  ]

  const onFormChange = () => {
    const v = form.getFieldsValue()
    setData(prev => ({ ...prev, ...v }))
  }

  const modelOptions = models
    .filter(model => isTextCapableModel(model) && !isClearly302(model))
    .sort((a, b) => Number(Boolean(b?.is_favorite)) - Number(Boolean(a?.is_favorite)))
    .map(model => ({
      value: Number(model.id),
      label: `${model.display_name || model.model_name || `模型 #${model.id}`}${model.provider ? ` · ${model.provider}` : ''}`,
    }))
    .filter(option => option.value)

  const selectPrimaryGenre = (genre: string) => {
    setData(prev => ({ ...prev, genre }))
    form.setFieldsValue({ genre })
    if (selectedGenreFramework && !frameworkMatchesPrimaryGenre(selectedGenreFramework, genre)) {
      setSelectedGenreFramework('')
    }
  }

  const selectGenreFramework = (framework: string) => {
    const guide = genreCatalogGuides.find(item => item.framework === framework) || null
    setSelectedGenreFramework(framework)
    if (!guide) return
    const primary = genreFrameworkToPrimaryGenre(guide.framework)
    setData(prev => ({
      ...prev,
      genre: prev.genre || primary,
      sub_genres: Array.from(new Set([...(prev.sub_genres || []), guide.framework, ...guide.keywords.slice(0, 2)])).slice(0, 6),
    }))
    if (!data.genre) form.setFieldsValue({ genre: primary })
    if (!launchpad.reader_promise) {
      setLaunchpad(prev => ({
        ...prev,
        reader_promise: prev.reader_promise || guide.reader_promise,
      }))
    }
  }

  const incubationBusy = incubation.phase === 'creating' || incubation.phase === 'running'

  return {
    form,
    current,
    creating,
    createdId,
    seedIdea,
    setSeedIdea,
    createMode,
    setCreateMode,
    selectedGenreFramework,
    genreCatalogLoading,
    launchpad,
    modelsLoading,
    seedModelId,
    setSeedModelId,
    data,
    setData,
    updateLaunchpad,
    updateFirst30Plan,
    first30Summary,
    launchpadReadiness,
    activeGenreGuide,
    genreGuideGroups,
    handleNext,
    handlePrev,
    handleCreate,
    handleDone,
    handleModalCancel,
    steps,
    onFormChange,
    modelOptions,
    selectPrimaryGenre,
    selectGenreFramework,
    incubation,
    incubationBusy,
    startDeepDraftIncubation,
    adoptIncubation,
    discardIncubation,
    loadArtifactPreview,
    artifactPreview,
    previewLoadingId,
    adopting,
    discarding,
  }
}
