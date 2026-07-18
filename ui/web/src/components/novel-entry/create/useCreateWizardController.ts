import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Form, message } from 'antd'
import apiClient from '../../../api/client'
import {
  buildLaunchpadSeedPatch,
  createEmptyLaunchpadFields,
  evaluateLaunchpadReadiness,
  extractLaunchpadFieldsFromSeed,
  summarizeFirst30Plan,
  type LaunchpadFields,
} from '../launchpadModel'
import {
  buildSeedRecoveryDiagnosticsView,
  deepDraftReviewModelToSeed,
  repairDeepDraftReviewModelGaps,
  type DeepDraftChapter,
  type DeepDraftCharacter,
  type DeepDraftReviewModel,
  type DeepDraftVolume,
} from '../deepDraftReviewModel'
import { buildDeepDraftFoundationScore } from '../deepDraftFoundationScore'
import {
  FALLBACK_GENRE_CATALOG_GUIDES,
  buildGenreGuideIdeaPrefix,
  filterGenreCatalogGuidesByPrimary,
  frameworkMatchesPrimaryGenre,
  genreFrameworkToPrimaryGenre,
  groupGenreCatalogGuides,
  isSeedGenreAligned,
  matchGenreCatalogGuide,
  primaryGenreLockText,
  type GenreCatalogGuide,
} from '../genreCatalogGuide'
import { useProjectSeedStream } from './useProjectSeedStream'
import {
  type CreateMode,
} from './createWizardOptions'
import {
  asStringArray,
  buildDeepDraftReviewForUi,
  firstText,
  normalizeLengthTarget,
  normalizeProjectSeedForUi,
  pickGenre,
  restoreDeepDraftReview,
  seedDiagnosticsNeedReview,
} from './createWizardSeedUtils'
import {
  buildCreatePayload as buildCreatePayloadFromUtils,
  buildFinalizedSeedCreatePayload as buildFinalizedSeedCreatePayloadFromUtils,
} from './createWizardPayloadUtils'
import {
  createDeepDraftActions,
} from './useCreateWizardDeepDraftActions'
import {
  createSeedApplyToForm,
  createSeedPipelineActions,
} from './useCreateWizardSeedPipeline'

const projectSeedModelStorageKey = 'novel.projectSeed.model_id'

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
  const [seedLoading, setSeedLoading] = useState(false)
  const seedStream = useProjectSeedStream()
  const [finalizingSeed, setFinalizingSeed] = useState(false)
  const [autoCreating, setAutoCreating] = useState(false)
  const [seed, setSeed] = useState<any | null>(null)
  const [seedDiagnostics, setSeedDiagnostics] = useState<any | null>(null)
  const [seedFinalized, setSeedFinalized] = useState(false)
  const [foundationAccepted, setFoundationAccepted] = useState(false)
  const [fillingGaps, setFillingGaps] = useState(false)
  const [genreCatalogGuides, setGenreCatalogGuides] = useState<GenreCatalogGuide[]>(FALLBACK_GENRE_CATALOG_GUIDES)
  const [selectedGenreFramework, setSelectedGenreFramework] = useState('')
  const [genreCatalogLoading, setGenreCatalogLoading] = useState(false)

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
  const [deepDraftReview, setDeepDraftReview] = useState<DeepDraftReviewModel>(() => buildDeepDraftReviewForUi({}))
  const [launchpad, setLaunchpad] = useState<LaunchpadFields>(() => createEmptyLaunchpadFields())
  const [modelsLoading, setModelsLoading] = useState(false)
  const [models, setModels] = useState<any[]>([])
  const [seedModelId, setSeedModelId] = useState<number | undefined>(() => {
    const parsed = Number(typeof window === 'undefined' ? 0 : window.localStorage.getItem(projectSeedModelStorageKey) || 0)
    return parsed || undefined
  })
  const [seedDrafts, setSeedDrafts] = useState<ProjectSeedDraft[]>([])
  const [selectedSeedDraftId, setSelectedSeedDraftId] = useState<number | undefined>()
  const [seedDraftsLoading, setSeedDraftsLoading] = useState(false)
  const [savingSeedDraft, setSavingSeedDraft] = useState(false)
  const [deletingSeedDraft, setDeletingSeedDraft] = useState(false)
  const [form] = Form.useForm<NovelFormValues>()
  // 手动管理的表单数据 — 用 state 保存，不依赖 Form 的条件渲染
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

  // 每次 data 变化时同步回 Form
  React.useEffect(() => {
    form.setFieldsValue(data)
  }, [data, form])

  const loadSeedDrafts = useCallback(async () => {
    setSeedDraftsLoading(true)
    try {
      const res = await apiClient.get('/novel/project-seed/drafts')
      setSeedDrafts(Array.isArray(res.data?.drafts) ? res.data.drafts : [])
    } catch {
      message.error('无法加载孵化草稿')
    } finally {
      setSeedDraftsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!open || createMode !== 'deep_draft') return
    loadSeedDrafts()
  }, [open, createMode, loadSeedDrafts])

  React.useEffect(() => {
    if (!open || models.length > 0 || modelsLoading) return
    setModelsLoading(true)
    apiClient.get('/models/')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : []
        setModels(list)
        if (seedModelId && !list.some((model: any) => Number(model.id) === Number(seedModelId))) {
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

  const first30Summary = summarizeFirst30Plan(seed)
  const launchpadReadiness = evaluateLaunchpadReadiness(launchpad, seed, data.length_target)
  const foundationScore = buildDeepDraftFoundationScore({
    seed,
    launchpad,
    review: deepDraftReview,
    lengthTarget: data.length_target,
  })
  const foundationReadyToCreate = foundationScore.recommendCreate || foundationAccepted
  const outlinesAreLocalScaffold = Boolean(
    seedDiagnostics?.outlines_are_local_scaffold
    || seedDiagnostics?.status === 'needs_model_outline'
    || seed?.seed_diagnostics?.outlines_are_local_scaffold
    || seed?.seed_diagnostics?.status === 'needs_model_outline'
    || (Array.isArray(seed?.chapter_outlines) && seed.chapter_outlines.length > 0 && seed.chapter_outlines.filter((item: any) => item?.scaffold || item?.source === 'local_scaffold').length >= Math.ceil(seed.chapter_outlines.length * 0.6))
    || (createMode === 'deep_draft' && seed && (!Array.isArray(seed.chapter_outlines) || seed.chapter_outlines.length < 8))
  )

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
  const seedRecoveryView = buildSeedRecoveryDiagnosticsView(seed || {}, seedDiagnostics)
  const effectiveForeshadowingCount = createMode === 'deep_draft'
    ? deepDraftReview.continuity.foreshadowing.split(/\r?\n/).map(line => line.trim()).filter(Boolean).length
    : (seed?.foreshadowing_plan?.length || 0)
  const seedConfirmationSummary = Array.isArray(seed?.author_confirmations)
    ? seed.author_confirmations
      .map((item: any) => firstText(item?.label, item?.key, item?.question))
      .filter(Boolean)
      .slice(0, 3)
      .join('；')
    : ''

  const handleNext = useCallback(async () => {
    if (current === 0) {
      // 保存 Step 0 的数据
      if (!data.title.trim()) {
        message.warning('请输入作品标题')
        return
      }
      if (createMode === 'manual' && !data.genre) {
        message.warning('请选择题材')
        return
      }
      if (createMode === 'quick_ai' && !seed) {
        message.warning('请先点击 AI 整理创意，或直接使用自动创建')
        return
      }
      if (createMode === 'deep_draft' && (!seed || !seedFinalized)) {
        message.warning('请先生成详细草稿，并由模型生成确定版本')
        return
      }
      if (createMode === 'deep_draft' && seed && seedFinalized && !foundationReadyToCreate) {
        message.warning(foundationScore.allowCreateWithWarning
          ? '当前评分未达推荐开书线，请先补强短板，或点“我满意，以当前版本开书”'
          : '当前基础偏弱，请先按评分卡补强，或明确标记满意后再继续')
        return
      }
    }
    if (current === formItems.length - 2) {
      if (createMode === 'deep_draft' && !foundationReadyToCreate) {
        message.warning(foundationScore.allowCreateWithWarning
          ? '评分未达推荐开书线。请先打磨，或在结果状态区确认“我满意，以当前版本开书”'
          : '基础评分过低，请先补强后再创建')
        return
      }
      // Step 4 -> 创建
      await handleCreate()
      return
    }
    setCurrent(c => c + 1)
  }, [current, data, formItems, createMode, seed, seedFinalized, foundationReadyToCreate, foundationScore.allowCreateWithWarning])

  const handlePrev = () => {
    if (current === 5) return
    setCurrent(c => Math.max(0, c - 1))
  }

  const buildCreatePayload = (projectSeed = seed, payloadData = data, payloadLaunchpad = launchpad) => buildCreatePayloadFromUtils({
    projectSeed,
    payloadData,
    payloadLaunchpad,
    deepDraftReview,
    seedIdea,
    foundationAccepted,
  })

  const buildFinalizedSeedCreatePayload = (projectSeed: any) => buildFinalizedSeedCreatePayloadFromUtils({
    projectSeed,
    data,
    launchpad,
    deepDraftReview,
    seedIdea,
    foundationAccepted,
  })

  const createProjectFromFinalizedSeed = async (projectSeed: any) => {
    const res = await apiClient.post('/novel/projects', buildFinalizedSeedCreatePayload(projectSeed))
    const projectId = res.data?.id || res.data?.project?.id || res.data?.project_id
    if (!projectId) throw new Error('项目创建接口未返回项目 ID')
    const counts = res.data?.seed_materialization || {}
    message.success(`已定稿并创建项目：分卷/大纲 ${counts.outlines || 0}，章节 ${counts.chapters || 0}`)
    onSuccess(projectId)
    handleReset()
  }

  const finishCreatedProjectFromFinalizeResponse = (responseData: any) => {
    const projectId = responseData?.project_id || responseData?.project?.id
    if (!projectId) return false
    const counts = responseData?.seed_materialization || {}
    message.success(`已定稿并创建项目：分卷/大纲 ${counts.outlines || 0}，章节 ${counts.chapters || 0}`)
    onSuccess(projectId)
    handleReset()
    return true
  }

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

  const handleAutoCreate = async () => {
    const title = String(data.title || seed?.title || '').trim()
    const idea = [buildGenreGuideIdeaPrefix(activeGenreGuide), seedIdea.trim()].filter(Boolean).join('\n\n')
    if (!title && !idea && !seed) {
      message.warning('请输入作品名称，或粘贴创意草稿')
      return
    }
    if (!seed && !seedModelId) {
      message.warning('请先选择用于自动建项的模型')
      return
    }
    setAutoCreating(true)
    try {
      const patchedSeed = seed
        ? buildLaunchpadSeedPatch(seed, launchpad, evaluateLaunchpadReadiness(launchpad, seed, data.length_target).risks)
        : null
      const res = patchedSeed
        ? await apiClient.post('/novel/projects/auto-create', { title, idea, seed: { ...patchedSeed, length_target: data.length_target }, length_target: data.length_target })
        : await apiClient.post('/novel/projects/auto-create', {
            title,
            idea,
            model_id: seedModelId,
            length_target: data.length_target,
            genre: data.genre,
            primary_genre: data.genre,
            genre_framework: activeGenreGuide?.framework || selectedGenreFramework || '',
          })
      const project = res.data?.project || res.data
      const projectId = project?.id
      if (!projectId) throw new Error('自动建项未返回项目 ID')
      const counts = res.data?.seed_materialization || {}
      message.success(`已自动创建项目：分卷/大纲 ${counts.outlines || 0}，章节 ${counts.chapters || 0}`)
      if (typeof window !== 'undefined' && seedModelId) window.localStorage.setItem(projectSeedModelStorageKey, String(seedModelId))
      onSuccess(projectId)
      handleReset()
    } catch (error: any) {
      const fallbackSeed = error?.response?.data?.seed
      if (fallbackSeed) {
        const diagnostics = error?.response?.data?.seed_diagnostics || fallbackSeed.seed_diagnostics || null
        const nextSeed = normalizeProjectSeedForUi(fallbackSeed)
        setSeed(nextSeed)
        setSeedDiagnostics(diagnostics)
        setCreateMode('deep_draft')
        setSeedFinalized(false)
        applySeedToForm(nextSeed)
        message.warning(error?.response?.data?.error || '模型返回偏薄，已转为可编辑深度孵化草稿')
      } else {
        message.error(error?.response?.data?.error || error?.message || '自动建项失败')
      }
    } finally {
      setAutoCreating(false)
    }
  }

  const handleDone = () => {
    if (createdId) onSuccess(createdId)
    handleReset()
  }

  const handleReset = () => {
    setCurrent(0)
    setCreating(false)
    setCreatedId(null)
    setSeedIdea('')
    setCreateMode('manual')
    setSeedLoading(false)
    setFinalizingSeed(false)
    setAutoCreating(false)
    setSeed(null)
    setSeedDiagnostics(null)
    setSeedFinalized(false)
    setSelectedGenreFramework('')
    setFoundationAccepted(false)
    setSelectedSeedDraftId(undefined)
    setSavingSeedDraft(false)
    setDeletingSeedDraft(false)
    setDeepDraftReview(buildDeepDraftReviewForUi({}))
    setLaunchpad(createEmptyLaunchpadFields())
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

  // 通用 onChange — 表单字段变化时同步到 data state
  const onFormChange = () => {
    const v = form.getFieldsValue()
    setData(prev => ({ ...prev, ...v }))
  }

  const modelOptions = models
    .filter(model => {
      const caps = model?.capabilities && typeof model.capabilities === 'object' ? model.capabilities : {}
      const isMediaOnly = caps.text_to_image || caps.image_to_image || caps.text_to_video || caps.image_to_video
      return !isMediaOnly || caps.chat || caps.reasoning || caps.vision
    })
    .sort((a, b) => Number(Boolean(b?.is_favorite)) - Number(Boolean(a?.is_favorite)))
    .map(model => ({
      value: Number(model.id),
      label: `${model.display_name || model.model_name || `模型 #${model.id}`}${model.provider ? ` · ${model.provider}` : ''}`,
    }))
    .filter(option => option.value)

  const seedDraftOptions = seedDrafts.map(draft => {
    const time = String(draft.updated_at || draft.created_at || '').slice(0, 16).replace('T', ' ')
    const chapterCount = Array.isArray(draft.seed?.chapter_outlines) ? draft.seed.chapter_outlines.length : 0
    return {
      value: Number(draft.id),
      label: `${draft.title || `草稿 #${draft.id}`}${chapterCount ? ` · ${chapterCount}章` : ''}${time ? ` · ${time}` : ''}`,
    }
  })

  const applySeedToForm = createSeedApplyToForm({
    data,
    setData,
    setDeepDraftReview,
    setFoundationAccepted,
    setLaunchpad,
    genreCatalogGuides,
    setSelectedGenreFramework,
  })

  const {
    updateDeepDraftReview,
    updateDeepDraftCharacter,
    updateDeepDraftVolume,
    updateDeepDraftChapter,
    removeDeepDraftItem,
    repairCurrentDeepDraftGaps,
    saveCurrentSeedDraft,
    loadSelectedSeedDraft,
    deleteSelectedSeedDraft,
  } = createDeepDraftActions({
    seed,
    setSeed,
    deepDraftReview,
    setDeepDraftReview,
    setSeedFinalized,
    seedIdea,
    data,
    seedDiagnostics,
    seedModelId,
    setSeedModelId,
    seedDrafts,
    setSeedDrafts,
    selectedSeedDraftId,
    setSelectedSeedDraftId,
    setSavingSeedDraft,
    setDeletingSeedDraft,
    setCreateMode,
    setSeedIdea,
    setSeedDiagnostics,
    applySeedToForm,
    loadSeedDrafts,
  })

  const {
    deriveProjectSeed,
    fillSeedGaps,
    finalizeProjectSeed,
  } = createSeedPipelineActions({
    seed,
    setSeed,
    deepDraftReview,
    createMode,
    data,
    setData,
    form,
    seedIdea,
    seedModelId,
    setSeedLoading,
    setFillingGaps,
    setFinalizingSeed,
    setSeedDiagnostics,
    setSeedFinalized,
    setFoundationAccepted,
    setDeepDraftReview,
    setLaunchpad,
    foundationScore,
    activeGenreGuide,
    selectedGenreFramework,
    applySeedToForm,
    seedStream,
    createProjectFromFinalizedSeed,
    finishCreatedProjectFromFinalizeResponse,
  })

  const selectPrimaryGenre = (genre: string) => {
    setData(prev => ({ ...prev, genre }))
    form.setFieldsValue({ genre })
    // 切换主题材后，清掉不匹配的玩法框架，避免继续带着仙侠框架生成都市
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
      // 玩法服务于主题材：已有主题材则保留；否则用框架映射
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

  return {
    form,
    current,
    creating,
    createdId,
    seedIdea,
    setSeedIdea,
    createMode,
    setCreateMode,
    seedLoading,
    seedStream,
    finalizingSeed,
    autoCreating,
    seed,
    seedDiagnostics,
    seedFinalized,
    setSeedFinalized,
    foundationAccepted,
    setFoundationAccepted,
    fillingGaps,
    genreCatalogGuides,
    selectedGenreFramework,
    genreCatalogLoading,
    deepDraftReview,
    setDeepDraftReview,
    launchpad,
    setLaunchpad,
    modelsLoading,
    models,
    seedModelId,
    setSeedModelId,
    seedDrafts,
    selectedSeedDraftId,
    setSelectedSeedDraftId,
    seedDraftsLoading,
    savingSeedDraft,
    deletingSeedDraft,
    data,
    setData,
    formItems,
    updateLaunchpad,
    updateFirst30Plan,
    updateDeepDraftReview,
    updateDeepDraftCharacter,
    updateDeepDraftVolume,
    updateDeepDraftChapter,
    removeDeepDraftItem,
    foundationScore,
    first30Summary,
    launchpadReadiness,
    foundationReadyToCreate,
    outlinesAreLocalScaffold,
    autoMatchedGenreGuide,
    activeGenreGuide,
    genreGuideGroups,
    seedRecoveryView,
    effectiveForeshadowingCount,
    seedConfirmationSummary,
    handleNext,
    handlePrev,
    buildCreatePayload,
    handleCreate,
    handleAutoCreate,
    handleDone,
    handleReset,
    handleModalCancel,
    steps,
    onFormChange,
    modelOptions,
    seedDraftOptions,
    applySeedToForm,
    repairCurrentDeepDraftGaps,
    saveCurrentSeedDraft,
    loadSelectedSeedDraft,
    deleteSelectedSeedDraft,
    deriveProjectSeed,
    fillSeedGaps,
    finalizeProjectSeed,
    selectPrimaryGenre,
    selectGenreFramework,
    seedDiagnosticsNeedReview,
  }
}
