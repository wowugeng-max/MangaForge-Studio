import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Alert, Button, Card, Form, Input, List, Modal, Popconfirm, Progress, Result, Segmented, Select, Space, Steps, Tag, Typography, message } from 'antd'
import { ArrowLeftOutlined, ArrowRightOutlined, CheckCircleOutlined, DeleteOutlined, FolderOpenOutlined, RocketOutlined, SaveOutlined } from '@ant-design/icons'
import apiClient from '../api/client'
import {
  buildLaunchpadSeedPatch,
  createEmptyLaunchpadFields,
  evaluateLaunchpadReadiness,
  extractLaunchpadFieldsFromSeed,
  summarizeFirst30Plan,
  type LaunchpadFields,
} from './novel-entry/launchpadModel'
import {
  buildDeepDraftReviewModel,
  buildSeedRecoveryDiagnosticsView,
  deepDraftReviewModelToSeed,
  repairDeepDraftReviewModelGaps,
  type DeepDraftChapter,
  type DeepDraftCharacter,
  type DeepDraftReviewModel,
  type DeepDraftVolume,
} from './novel-entry/deepDraftReviewModel'
import { buildDeepDraftFoundationScore } from './novel-entry/deepDraftFoundationScore'
import {
  FALLBACK_GENRE_CATALOG_GUIDES,
  buildGenreGuideIdeaPrefix,
  genreFrameworkToPrimaryGenre,
  groupGenreCatalogGuides,
  matchGenreCatalogGuide,
  type GenreCatalogGuide,
} from './novel-entry/genreCatalogGuide'

const { Text, Paragraph } = Typography
const projectSeedModelStorageKey = 'novel.projectSeed.model_id'

interface NovelFormValues {
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

interface NovelCreateWizardProps {
  open: boolean
  onCancel: () => void
  onSuccess: (projectId: number) => void
}

const GENRES = [
  { value: '玄幻', label: '玄幻' },
  { value: '仙侠', label: '仙侠' },
  { value: '科幻', label: '科幻' },
  { value: '悬疑', label: '悬疑' },
  { value: '都市', label: '都市' },
  { value: '历史', label: '历史' },
  { value: '奇幻', label: '奇幻' },
  { value: '武侠', label: '武侠' },
  { value: '言情', label: '言情' },
  { value: '末世', label: '末世' },
  { value: '穿越', label: '穿越' },
  { value: '系统', label: '系统流' },
  { value: '其他', label: '其他' },
]

const LENGTH_TARGETS = [
  { value: 'short', label: '短篇（< 20万）', description: '短篇快完结，适合试水' },
  { value: 'medium', label: '中篇（20-80万）', description: '节奏紧凑，主线明确' },
  { value: 'long', label: '长篇连载（80-300万）', description: '多卷多线，世界观宏大' },
  { value: 'epic', label: '超长篇连载（> 300万）', description: '史诗级篇幅，适合长线连载' },
]

const AUDIENCES = [
  { value: '男频', label: '男频' },
  { value: '女频', label: '女频' },
  { value: '全向', label: '全向' },
  { value: '轻小说', label: '轻小说' },
  { value: '漫剧', label: '漫剧读者' },
  { value: 'Z世代', label: 'Z世代' },
]

const FEMALE_AUDIENCE_MODES = [
  { value: 'auto', label: '自动识别' },
  { value: 'enabled', label: '强制启用' },
  { value: 'disabled', label: '强制关闭' },
]

const STYLE_TAGS = [
  '高燃', '黑暗', '轻松', '群像', '单线', '智斗', '热血',
  '搞笑', '催泪', '虐心', '慢热', '快节奏', '沙雕', '治愈',
  '致郁', '赛博朋克', '克苏鲁', '种田', '经营', '冒险',
]

const COMMERCIAL_TAGS = [
  '爆款潜质', '爽文', '起点感', '番茄感', '知乎感',
  'IP改编', '影视化', '短剧改编', '漫改', '有声书',
]

type CreateMode = 'manual' | 'quick_ai' | 'deep_draft'
type ProjectSeedDraft = {
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

function asStringArray(value: any): string[] {
  if (!Array.isArray(value)) return []
  return value.map(item => String(item || '').trim()).filter(Boolean)
}

function firstText(...values: any[]) {
  return values.map(value => String(value || '').trim()).find(Boolean) || ''
}

function asObject(value: any) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function buildDeepDraftReviewForUi(seed: any) {
  const model = buildDeepDraftReviewModel(seed)
  return repairDeepDraftReviewModelGaps(model, seed)
}

function inferGenreFromText(text: string) {
  if (/修仙|仙门|仙道|天尊|长生|古神|外神|神祇|王朝|皇子/.test(text)) return '仙侠'
  if (/异能|灵气|武魂|斗气|神魔|玄幻/.test(text)) return '玄幻'
  if (/都市|公司|学校|职场/.test(text)) return '都市'
  if (/末世|丧尸|灾变/.test(text)) return '末世'
  if (/星际|飞船|AI|人工智能|科幻/.test(text)) return '科幻'
  if (/悬疑|推理|凶案|诡案/.test(text)) return '悬疑'
  return ''
}

function normalizeProjectSeedForUi(payload: any) {
  const root = asObject(payload)
  const rawPayload = asObject(root.raw_payload)
  const source = [root.project_seed, root.seed, root.project, root.novel_project, root.data, root.result, root, rawPayload]
    .map(asObject)
    .find(item => firstText(item.title, item.project_title, item.book_title, item.synopsis, item.summary, item.logline, item.core_premise) || item.worldbuilding || item.protagonist) || root
  const masterOutline = asObject(source.master_outline || root.master_outline || rawPayload.master_outline)
  const rawText = `${JSON.stringify(root).slice(0, 5000)} ${String(root.raw_idea || '').slice(0, 5000)}`
  const commercial = asObject(source.commercial_positioning || root.commercial_positioning || rawPayload.commercial_positioning)
  const worldbuilding = asObject(source.worldbuilding || root.worldbuilding || rawPayload.worldbuilding)
  const plotEngine = asObject(source.plot_engine || root.plot_engine || rawPayload.plot_engine)
  return {
    ...source,
    title: firstText(source.title, source.project_title, source.book_title, source.name, source.working_title, masterOutline.title),
    genre: firstText(source.genre, source.main_genre, source.category, inferGenreFromText(rawText)),
    sub_genres: asStringArray(source.sub_genres).length ? asStringArray(source.sub_genres) : asStringArray(source.genre_tags || source.tags),
    target_audience: firstText(source.target_audience, source.audience, commercial.platform),
    length_target: firstText(source.length_target, source.length, 'medium'),
    style_tags: asStringArray(source.style_tags).length ? asStringArray(source.style_tags) : asStringArray(source.tone_tags),
    commercial_tags: asStringArray(source.commercial_tags).length ? asStringArray(source.commercial_tags) : asStringArray(commercial.selling_points || commercial.tropes),
    synopsis: firstText(source.synopsis, source.project_summary, source.summary, masterOutline.summary, commercial.reader_promise, source.core_premise, source.logline),
    logline: firstText(source.logline, source.hook, masterOutline.hook, commercial.reader_promise),
    core_premise: firstText(source.core_premise, source.premise, source.setting, source.summary, masterOutline.summary),
    main_conflict: firstText(source.main_conflict, source.conflict, plotEngine.long_term_goal, masterOutline.hook),
    protagonist: asObject(source.protagonist || root.protagonist || rawPayload.protagonist),
    antagonist: asObject(source.antagonist || root.antagonist || rawPayload.antagonist),
    worldbuilding,
    plot_engine: plotEngine,
    writing_bible: asObject(source.writing_bible || root.writing_bible || rawPayload.writing_bible),
    volume_outlines: Array.isArray(source.volume_outlines) ? source.volume_outlines : (Array.isArray(root.volume_outlines) ? root.volume_outlines : (Array.isArray(rawPayload.volume_outlines) ? rawPayload.volume_outlines : [])),
    chapter_outlines: Array.isArray(source.chapter_outlines) ? source.chapter_outlines : (Array.isArray(root.chapter_outlines) ? root.chapter_outlines : (Array.isArray(rawPayload.chapter_outlines) ? rawPayload.chapter_outlines : [])),
    foreshadowing_plan: Array.isArray(source.foreshadowing_plan) ? source.foreshadowing_plan : (Array.isArray(root.foreshadowing_plan) ? root.foreshadowing_plan : (Array.isArray(rawPayload.foreshadowing_plan) ? rawPayload.foreshadowing_plan : [])),
    characters: Array.isArray(source.characters) ? source.characters : (Array.isArray(root.characters) ? root.characters : (Array.isArray(rawPayload.characters) ? rawPayload.characters : [])),
    open_questions: asStringArray(source.open_questions).length ? asStringArray(source.open_questions) : (asStringArray(source.questions).length ? asStringArray(source.questions) : asStringArray(rawPayload.open_questions || rawPayload.questions)),
    next_steps: asStringArray(source.next_steps).length ? asStringArray(source.next_steps) : (asStringArray(source.suggested_next_steps).length ? asStringArray(source.suggested_next_steps) : asStringArray(rawPayload.next_steps || rawPayload.suggested_next_steps)),
    raw_payload: root.raw_payload || root,
  }
}

function normalizeLengthTarget(value: any) {
  const raw = String(value || '').trim()
  return LENGTH_TARGETS.some(item => item.value === raw) ? raw : 'medium'
}

function pickGenre(value: any) {
  const raw = String(value || '').trim()
  if (GENRES.some(item => item.value === raw)) return raw
  const matched = GENRES.find(item => raw.includes(item.value))
  return matched?.value || raw || '其他'
}

function seedDiagnosticsNeedReview(value: any) {
  const status = String(value?.status || '').trim()
  return status === 'needs_author_review' || status === 'needs_model_expansion'
}

export default function NovelCreateWizard({ open, onCancel, onSuccess }: NovelCreateWizardProps) {
  const [current, setCurrent] = useState(0)
  const [creating, setCreating] = useState(false)
  const [createdId, setCreatedId] = useState<number | null>(null)
  const [seedIdea, setSeedIdea] = useState('')
  const [createMode, setCreateMode] = useState<CreateMode>('manual')
  const [seedLoading, setSeedLoading] = useState(false)
  const [finalizingSeed, setFinalizingSeed] = useState(false)
  const [autoCreating, setAutoCreating] = useState(false)
  const [seed, setSeed] = useState<any | null>(null)
  const [seedDiagnostics, setSeedDiagnostics] = useState<any | null>(null)
  const [seedFinalized, setSeedFinalized] = useState(false)
  const [foundationAccepted, setFoundationAccepted] = useState(false)
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

  const updateDeepDraftReview = (patch: Partial<DeepDraftReviewModel>) => {
    setSeedFinalized(false)
    setDeepDraftReview(prev => ({ ...prev, ...patch }))
  }

  const updateDeepDraftCharacter = (index: number, patch: Partial<DeepDraftCharacter>) => {
    setSeedFinalized(false)
    setDeepDraftReview(prev => ({
      ...prev,
      characters: prev.characters.map((character, currentIndex) => currentIndex === index ? { ...character, ...patch } : character),
    }))
  }

  const updateDeepDraftVolume = (index: number, patch: Partial<DeepDraftVolume>) => {
    setSeedFinalized(false)
    setDeepDraftReview(prev => ({
      ...prev,
      volumes: prev.volumes.map((volume, currentIndex) => currentIndex === index ? { ...volume, ...patch } : volume),
    }))
  }

  const updateDeepDraftChapter = (index: number, patch: Partial<DeepDraftChapter>) => {
    setSeedFinalized(false)
    setDeepDraftReview(prev => ({
      ...prev,
      chapters: prev.chapters.map((chapter, currentIndex) => currentIndex === index ? { ...chapter, ...patch } : chapter),
    }))
  }

  const removeDeepDraftItem = (section: 'characters' | 'volumes' | 'chapters', index: number) => {
    setSeedFinalized(false)
    setDeepDraftReview(prev => ({
      ...prev,
      [section]: prev[section].filter((_, currentIndex) => currentIndex !== index),
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
  const genreGuideGroups = useMemo(() => groupGenreCatalogGuides(genreCatalogGuides), [genreCatalogGuides])
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
          ? '评分未达推荐开书线。请先打磨，或在评分卡确认“我满意，以当前版本开书”'
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

  const buildCreatePayload = (projectSeed = seed, payloadData = data, payloadLaunchpad = launchpad) => {
    const readiness = evaluateLaunchpadReadiness(payloadLaunchpad, projectSeed, payloadData.length_target)
    const seedWithLaunchpad = buildLaunchpadSeedPatch(projectSeed || {}, payloadLaunchpad, readiness.risks)
    const foundation = buildDeepDraftFoundationScore({
      seed: seedWithLaunchpad,
      launchpad: payloadLaunchpad,
      review: deepDraftReview,
      lengthTarget: payloadData.length_target,
    })
    return {
      title: payloadData.title,
      genre: payloadData.genre || '',
      sub_genres: payloadData.sub_genres || [],
      length_target: payloadData.length_target || 'medium',
      target_audience: payloadData.target_audience || '',
      style_tags: payloadData.style_tags || [],
      commercial_tags: payloadData.commercial_tags || [],
      synopsis: payloadData.synopsis || payloadLaunchpad.reader_promise || '',
      status: 'draft',
      reference_config: {
        project_seed: {
          ...seedWithLaunchpad,
          raw_idea: seedIdea,
          derived_at: new Date().toISOString(),
        },
        oh_story_controls: {
          female_audience_mode: payloadData.female_audience_mode || 'auto',
        },
        foundation_score: foundation,
        foundation_accepted: foundationAccepted || foundation.recommendCreate,
        writing_bible: projectSeed?.writing_bible || {},
        commercial_positioning: {
          reader_promise: payloadLaunchpad.reader_promise || projectSeed?.logline || projectSeed?.synopsis || '',
          selling_points: asStringArray(projectSeed?.commercial_positioning?.selling_points).length
            ? asStringArray(projectSeed?.commercial_positioning?.selling_points)
            : asStringArray(projectSeed?.commercial_tags),
          seed: Boolean(projectSeed),
        },
      },
      auto_materialize_seed: Boolean(projectSeed),
    }
  }

  const buildFinalizedSeedCreatePayload = (projectSeed: any) => {
    const normalizedSeed = normalizeProjectSeedForUi(projectSeed)
    const extractedLaunchpad = extractLaunchpadFieldsFromSeed(normalizedSeed)
    const payloadData = {
      title: String(normalizedSeed.title || data.title || normalizedSeed.logline || '').trim().slice(0, 32),
      genre: pickGenre(normalizedSeed.genre || data.genre),
      sub_genres: asStringArray(normalizedSeed.sub_genres).length ? asStringArray(normalizedSeed.sub_genres) : data.sub_genres,
      length_target: normalizeLengthTarget(normalizedSeed.length_target || data.length_target),
      target_audience: String(normalizedSeed.target_audience || data.target_audience || '').trim(),
      female_audience_mode: data.female_audience_mode || 'auto',
      style_tags: asStringArray(normalizedSeed.style_tags).length ? asStringArray(normalizedSeed.style_tags).slice(0, 5) : data.style_tags,
      commercial_tags: asStringArray(normalizedSeed.commercial_tags).length ? asStringArray(normalizedSeed.commercial_tags).slice(0, 3) : data.commercial_tags,
      synopsis: String(normalizedSeed.synopsis || normalizedSeed.logline || data.synopsis || '').trim().slice(0, 500),
    }
    const payloadLaunchpad = {
      reader_promise: extractedLaunchpad.reader_promise || launchpad.reader_promise,
      core_selling_point: extractedLaunchpad.core_selling_point || launchpad.core_selling_point,
      protagonist_situation: extractedLaunchpad.protagonist_situation || launchpad.protagonist_situation,
      protagonist_pressure: extractedLaunchpad.protagonist_pressure || launchpad.protagonist_pressure,
      opening_hook: extractedLaunchpad.opening_hook || launchpad.opening_hook,
      mainline_goal: extractedLaunchpad.mainline_goal || launchpad.mainline_goal,
      long_term_conflict: extractedLaunchpad.long_term_conflict || launchpad.long_term_conflict,
      growth_engine: extractedLaunchpad.growth_engine || launchpad.growth_engine,
      volume_direction: extractedLaunchpad.volume_direction || launchpad.volume_direction,
      expandable_assets: extractedLaunchpad.expandable_assets || launchpad.expandable_assets,
      future100_note: extractedLaunchpad.future100_note || launchpad.future100_note,
      first_writing_task: extractedLaunchpad.first_writing_task || launchpad.first_writing_task,
      first30_plan: {
        chapters_1_3: extractedLaunchpad.first30_plan.chapters_1_3 || launchpad.first30_plan.chapters_1_3,
        chapters_4_10: extractedLaunchpad.first30_plan.chapters_4_10 || launchpad.first30_plan.chapters_4_10,
        chapters_11_30: extractedLaunchpad.first30_plan.chapters_11_30 || launchpad.first30_plan.chapters_11_30,
      },
    }
    return buildCreatePayload(normalizedSeed, payloadData, payloadLaunchpad)
  }

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
        : await apiClient.post('/novel/projects/auto-create', { title, idea, model_id: seedModelId, length_target: data.length_target })
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

  const applySeedToForm = (nextSeed: any) => {
    const normalizedSeed = normalizeProjectSeedForUi(nextSeed)
    const extractedLaunchpad = extractLaunchpadFieldsFromSeed(normalizedSeed)
    setDeepDraftReview(buildDeepDraftReviewForUi(normalizedSeed))
    setFoundationAccepted(false)
    const matched = matchGenreCatalogGuide(
      genreCatalogGuides,
      normalizedSeed.genre,
      normalizedSeed.title,
      normalizedSeed.synopsis,
      normalizedSeed.logline,
      normalizedSeed.writing_bible?.genre_positioning_contract?.genre_catalog_contract?.matched_framework,
    )
    if (matched?.framework) setSelectedGenreFramework(matched.framework)
    const nextData = {
      title: String(normalizedSeed.title || data.title || normalizedSeed.logline || '').trim().slice(0, 32),
      genre: pickGenre(normalizedSeed.genre || data.genre),
      sub_genres: asStringArray(normalizedSeed.sub_genres).length ? asStringArray(normalizedSeed.sub_genres) : data.sub_genres,
      length_target: normalizeLengthTarget(normalizedSeed.length_target || data.length_target),
      target_audience: String(normalizedSeed.target_audience || data.target_audience || '').trim(),
      female_audience_mode: data.female_audience_mode || 'auto',
      style_tags: asStringArray(normalizedSeed.style_tags).length ? asStringArray(normalizedSeed.style_tags).slice(0, 5) : data.style_tags,
      commercial_tags: asStringArray(normalizedSeed.commercial_tags).length ? asStringArray(normalizedSeed.commercial_tags).slice(0, 3) : data.commercial_tags,
      synopsis: String(normalizedSeed.synopsis || normalizedSeed.logline || data.synopsis || '').trim().slice(0, 500),
    }
    setData(prev => ({ ...prev, ...nextData }))
    setLaunchpad(prev => ({
      reader_promise: extractedLaunchpad.reader_promise || prev.reader_promise,
      core_selling_point: extractedLaunchpad.core_selling_point || prev.core_selling_point,
      protagonist_situation: extractedLaunchpad.protagonist_situation || prev.protagonist_situation,
      protagonist_pressure: extractedLaunchpad.protagonist_pressure || prev.protagonist_pressure,
      opening_hook: extractedLaunchpad.opening_hook || prev.opening_hook,
      mainline_goal: extractedLaunchpad.mainline_goal || prev.mainline_goal,
      long_term_conflict: extractedLaunchpad.long_term_conflict || prev.long_term_conflict,
      growth_engine: extractedLaunchpad.growth_engine || prev.growth_engine,
      volume_direction: extractedLaunchpad.volume_direction || prev.volume_direction,
      expandable_assets: extractedLaunchpad.expandable_assets || prev.expandable_assets,
      future100_note: extractedLaunchpad.future100_note || prev.future100_note,
      first_writing_task: extractedLaunchpad.first_writing_task || prev.first_writing_task,
      first30_plan: {
        chapters_1_3: extractedLaunchpad.first30_plan.chapters_1_3 || prev.first30_plan.chapters_1_3,
        chapters_4_10: extractedLaunchpad.first30_plan.chapters_4_10 || prev.first30_plan.chapters_4_10,
        chapters_11_30: extractedLaunchpad.first30_plan.chapters_11_30 || prev.first30_plan.chapters_11_30,
      },
    }))
  }

  const restoreDeepDraftReview = (draftSeed: any, savedReview: any) => {
    const baseReview = buildDeepDraftReviewForUi(draftSeed)
    const review = asObject(savedReview)
    return repairDeepDraftReviewModelGaps({
      basics: { ...baseReview.basics, ...asObject(review.basics) },
      world: { ...baseReview.world, ...asObject(review.world) },
      characters: Array.isArray(review.characters) ? review.characters : baseReview.characters,
      volumes: Array.isArray(review.volumes) ? review.volumes : baseReview.volumes,
      chapters: Array.isArray(review.chapters) ? review.chapters : baseReview.chapters,
      continuity: { ...baseReview.continuity, ...asObject(review.continuity) },
    }, draftSeed)
  }

  const repairCurrentDeepDraftGaps = () => {
    if (!seed) return message.warning('请先生成或载入深度孵化草稿')
    const repairedReview = repairDeepDraftReviewModelGaps(deepDraftReview, seed)
    const repairedSeed = normalizeProjectSeedForUi(deepDraftReviewModelToSeed(seed, repairedReview))
    setDeepDraftReview(repairedReview)
    setSeed(repairedSeed)
    setSeedFinalized(false)
    message.success('已生成本地可编辑伏笔/确认草稿（非模型定稿），可继续改写')
  }

  const saveCurrentSeedDraft = async () => {
    if (!seed) return message.warning('请先生成或载入深度孵化草稿')
    const draftSeed = normalizeProjectSeedForUi(deepDraftReviewModelToSeed({ ...(seed || {}), length_target: data.length_target }, deepDraftReview))
    const title = firstText(deepDraftReview.basics.title, data.title, draftSeed.title, '未命名孵化草稿')
    setSavingSeedDraft(true)
    try {
      const res = await apiClient.post('/novel/project-seed/drafts', {
        title,
        idea: seedIdea,
        seed: draftSeed,
        review_model: deepDraftReview,
        diagnostics: seedDiagnostics || draftSeed.seed_diagnostics || {},
        model_id: seedModelId || null,
        source: 'deep_draft_review',
      })
      const savedDraft = res.data?.draft
      if (savedDraft?.id) {
        setSeedDrafts(prev => [savedDraft, ...prev.filter(item => item.id !== savedDraft.id)])
        setSelectedSeedDraftId(savedDraft.id)
      } else {
        await loadSeedDrafts()
      }
      setSeed(draftSeed)
      setSeedFinalized(false)
      message.success('孵化草稿已保存')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '保存孵化草稿失败')
    } finally {
      setSavingSeedDraft(false)
    }
  }

  const loadSelectedSeedDraft = () => {
    const draft = seedDrafts.find(item => Number(item.id) === Number(selectedSeedDraftId))
    if (!draft) return message.warning('请选择要载入的孵化草稿')
    const draftSeed = normalizeProjectSeedForUi(draft.seed || {})
    setCreateMode('deep_draft')
    setSeed(draftSeed)
    setSeedIdea(String(draft.idea || ''))
    setSeedDiagnostics(draft.diagnostics || draftSeed.seed_diagnostics || null)
    setSeedFinalized(false)
    if (draft.model_id) {
      setSeedModelId(Number(draft.model_id))
      if (typeof window !== 'undefined') window.localStorage.setItem(projectSeedModelStorageKey, String(draft.model_id))
    }
    applySeedToForm(draftSeed)
    setDeepDraftReview(restoreDeepDraftReview(draftSeed, draft.review_model))
    message.success('已载入孵化草稿')
  }

  const deleteSelectedSeedDraft = async () => {
    const id = Number(selectedSeedDraftId || 0)
    if (!id) return message.warning('请选择要删除的孵化草稿')
    setDeletingSeedDraft(true)
    try {
      await apiClient.delete(`/novel/project-seed/drafts/${id}`)
      setSeedDrafts(prev => prev.filter(item => Number(item.id) !== id))
      setSelectedSeedDraftId(undefined)
      message.success('孵化草稿已删除')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '删除孵化草稿失败')
    } finally {
      setDeletingSeedDraft(false)
    }
  }

  const deriveProjectSeed = async () => {
    if (!seedIdea.trim() && !data.title.trim()) return message.warning('请输入作品名称，或粘贴创意草稿')
    if (!seedModelId) return message.warning('请先选择用于整理创意的模型')
    setSeedLoading(true)
    try {
      const genrePrefix = buildGenreGuideIdeaPrefix(activeGenreGuide)
      const ideaWithGenre = [genrePrefix, seedIdea.trim() || data.title.trim()].filter(Boolean).join('\n\n')
      const res = await apiClient.post('/novel/project-seed/derive', {
        idea: ideaWithGenre,
        title: data.title,
        model_id: seedModelId,
        length_target: data.length_target,
        genre_framework: activeGenreGuide?.framework || selectedGenreFramework || '',
      })
      const nextSeed = normalizeProjectSeedForUi(res.data?.seed || {})
      const diagnostics = res.data?.seed_diagnostics || nextSeed.seed_diagnostics || null
      setSeed(nextSeed)
      setSeedDiagnostics(diagnostics)
      setSeedFinalized(createMode !== 'deep_draft' && !seedDiagnosticsNeedReview(diagnostics))
        applySeedToForm(nextSeed)
      if (typeof window !== 'undefined') window.localStorage.setItem(projectSeedModelStorageKey, String(seedModelId))
      if (seedDiagnosticsNeedReview(diagnostics)) {
        message.warning('模型返回偏薄，已保留有效信息并生成可编辑草稿')
      } else if (diagnostics?.status === 'recovered_by_model') {
        message.success('首轮返回偏薄，已自动补种子为可审阅草稿')
      } else {
        message.success('已整理创意草稿，可继续编辑后创建项目')
      }
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '创意草稿整理失败')
    } finally {
      setSeedLoading(false)
    }
  }

  const finalizeProjectSeed = async (authorConfirmed = false) => {
    const confirmedByAuthor = authorConfirmed === true
    if (!seedModelId) return message.warning('请先选择用于定稿的模型')
    const draft = createMode === 'deep_draft' ? deepDraftReviewModelToSeed({ ...(seed || {}), length_target: data.length_target }, deepDraftReview) : seed
    if (!draft || !Object.keys(draft).length) return message.warning('请先生成或填写项目草稿')
    setFinalizingSeed(true)
    try {
      const res = await apiClient.post('/novel/project-seed/finalize', {
        idea: seedIdea,
        title: data.title,
        draft,
        model_id: seedModelId,
        create_project: true,
        author_confirmed: confirmedByAuthor,
      })
      const nextSeed = normalizeProjectSeedForUi(res.data?.seed || {})
      const diagnostics = res.data?.seed_diagnostics || nextSeed.seed_diagnostics || null
      setSeed(nextSeed)
      setSeedDiagnostics(diagnostics)
      applySeedToForm(nextSeed)
      if (typeof window !== 'undefined') window.localStorage.setItem(projectSeedModelStorageKey, String(seedModelId))
      if (seedDiagnosticsNeedReview(diagnostics)) {
        setSeedFinalized(false)
        message.warning('模型定稿仍偏薄，已保留可编辑草稿，请先补强关键设定')
      } else {
        setSeedFinalized(true)
        if (!finishCreatedProjectFromFinalizeResponse(res.data)) {
          await createProjectFromFinalizedSeed(nextSeed)
        }
      }
    } catch (error: any) {
      const fallbackSeed = error?.response?.data?.seed
      if (fallbackSeed) {
        const diagnostics = error?.response?.data?.seed_diagnostics || fallbackSeed.seed_diagnostics || null
        const nextSeed = normalizeProjectSeedForUi(fallbackSeed)
        setSeed(nextSeed)
        setSeedDiagnostics(diagnostics)
        setSeedFinalized(false)
        applySeedToForm(nextSeed)
        message.warning(error?.response?.data?.error || '项目种子需要作者确认后再创建')
        return
      }
      message.error(error?.response?.data?.error || error?.message || '项目种子定稿或创建失败')
    } finally {
      setFinalizingSeed(false)
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
    if (!launchpad.reader_promise) {
      setLaunchpad(prev => ({
        ...prev,
        reader_promise: prev.reader_promise || guide.reader_promise,
      }))
    }
  }

  const foundationStatusColor = foundationScore.recommendCreate
    ? 'success'
    : foundationScore.allowCreateWithWarning
      ? 'warning'
      : 'error'

  const renderFoundationScoreCard = (opts?: { compact?: boolean }) => {
    if (createMode !== 'deep_draft' || !seed) return null
    const compact = Boolean(opts?.compact)
    return (
      <Card
        size="small"
        className="novel-deep-draft-foundation-card"
        title={compact ? '开书基础评分' : 'oh-story 开书基础评分'}
        extra={<Tag color={foundationScore.recommendCreate ? 'green' : foundationScore.allowCreateWithWarning ? 'gold' : 'red'} bordered={false}>{foundationScore.statusLabel}</Tag>}
        style={{ borderRadius: 10 }}
      >
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <Progress
              type="circle"
              percent={foundationScore.overall}
              size={compact ? 64 : 78}
              strokeColor={foundationScore.recommendCreate ? '#22c55e' : foundationScore.allowCreateWithWarning ? '#f59e0b' : '#ef4444'}
              format={percent => (
                <div style={{ lineHeight: 1.15 }}>
                  <div style={{ fontSize: compact ? 16 : 18, fontWeight: 700 }}>{percent}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{foundationScore.grade}</div>
                </div>
              )}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text strong style={{ display: 'block' }}>{foundationScore.headline}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{foundationScore.summary}</Text>
              <div style={{ marginTop: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  推荐阈值：{foundationScore.threshold.recommend}+ 开书 · {foundationScore.threshold.warning}+ 可带风险开书
                </Text>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
            {foundationScore.dimensions.map(dimension => (
              <div
                key={dimension.key}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '8px 10px',
                  background: dimension.status === 'strong' ? '#f5fbf7' : dimension.status === 'ok' ? '#f8fafc' : '#fff8eb',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: 600 }}>{dimension.title}</Text>
                  <Text style={{ fontSize: 12 }}>{dimension.score}</Text>
                </div>
                <Progress
                  percent={dimension.score}
                  size="small"
                  showInfo={false}
                  strokeColor={dimension.status === 'strong' ? '#22c55e' : dimension.status === 'ok' ? '#3b82f6' : '#f59e0b'}
                  style={{ margin: '4px 0' }}
                />
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{dimension.summary}</Text>
                {dimension.missing.length > 0 && (
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                    缺口：{dimension.missing.slice(0, 3).join('、')}{dimension.missing.length > 3 ? '…' : ''}
                  </Text>
                )}
              </div>
            ))}
          </div>

          {foundationScore.nextActions.length > 0 && (
            <Alert
              type={foundationStatusColor === 'success' ? 'success' : 'info'}
              showIcon
              message="下一步怎么补更稳"
              description={(
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  {foundationScore.nextActions.map(action => (
                    <li key={action}><Text style={{ fontSize: 12 }}>{action}</Text></li>
                  ))}
                </ul>
              )}
            />
          )}

          {!foundationScore.recommendCreate && (
            <Alert
              type={foundationScore.allowCreateWithWarning ? 'warning' : 'error'}
              showIcon
              message={foundationScore.allowCreateWithWarning ? '当前版本可开书，但建议先打磨短板' : '当前基础偏弱，不建议直接开书'}
              description={(
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {foundationScore.topRisks.length > 0 && (
                    <Text style={{ fontSize: 12 }}>主要缺口：{foundationScore.topRisks.join('、')}</Text>
                  )}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    可在下方审阅台手动补全缺口；满意当前版本时，点“我满意，以当前版本开书”后继续。
                  </Text>
                  <Space wrap>
                    <Button size="small" type={foundationAccepted ? 'default' : 'primary'} onClick={() => setFoundationAccepted(true)}>
                      {foundationAccepted ? '已标记满意此版本' : '我满意，以当前版本开书'}
                    </Button>
                    {foundationAccepted && (
                      <Button size="small" onClick={() => setFoundationAccepted(false)}>取消满意标记</Button>
                    )}
                  </Space>
                </Space>
              )}
            />
          )}
        </Space>
      </Card>
    )
  }


  return (
    <Modal
      open={open}
      onCancel={handleModalCancel}
      footer={null}
      width={900}
      maskClosable={false}
      style={{ top: 24 }}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 4px 0' }}>新书商业长篇启动台</h2>
        <p style={{ color: '#666', margin: 0 }}>先确认卖点、前30章和长线承载，再进入故事规划</p>
      </div>

      <Steps
        current={current}
        items={steps}
        style={{ marginBottom: 32 }}
        size="small"
      />

      {/* 所有步骤共享同一个 Form 实例，通过 onValuesChange 同步到 data */}
      <Form
        form={form}
        layout="vertical"
        onValuesChange={onFormChange}
      >

        {/* Step 0: Basic Info */}
        {current === 0 && (
          <>
            <Card
              size="small"
              title="选择创建方式"
              style={{ marginBottom: 16, borderRadius: 12, background: '#fbfdff' }}
            >
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  {[
                    { key: 'manual', title: '手动开书', desc: '先建可写项目，商业钩子和长线计划由你手动填写。' },
                    { key: 'quick_ai', title: 'AI 快速开书', desc: '给作品名或一句想法，AI 整理卖点、前30章和长线骨架。' },
                    { key: 'deep_draft', title: '深度孵化', desc: 'AI 先产出可编辑草稿，人工修订后再定稿创建。' },
                  ].map(item => {
                    const active = createMode === item.key
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setCreateMode(item.key as CreateMode)
                          setSeedFinalized(item.key !== 'deep_draft' && Boolean(seed) && !seedDiagnosticsNeedReview(seedDiagnostics))
                          setFoundationAccepted(false)
                                              }}
                        style={{
                          textAlign: 'left',
                          padding: 12,
                          borderRadius: 10,
                          border: active ? '1px solid #1677ff' : '1px solid #e5e7eb',
                          background: active ? '#eff6ff' : '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.title}</div>
                        <div style={{ color: '#666', fontSize: 12, lineHeight: 1.45 }}>{item.desc}</div>
                      </button>
                    )
                  })}
                </div>

                {createMode === 'manual' && (
                  <Alert type="info" showIcon message="手动创建只需要填写基础资料，不会调用模型；创建后进入工作台再逐步补世界观、角色、设定和章节。" />
                )}
                <Card
                  size="small"
                  title="小说类型引导（oh-story）"
                  extra={genreCatalogLoading ? <Text type="secondary">加载中…</Text> : <Text type="secondary">{genreCatalogGuides.length} 个类型框架</Text>}
                  style={{ borderRadius: 10 }}
                >
                  <Space direction="vertical" size={10} style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      先选类型框架，再填资料或生成草稿。这是 oh-story 题材目录在创建台的可视化入口；后端生成时也会注入对应契约。
                    </Text>
                    {genreGuideGroups.map(group => (
                      <div key={group.category}>
                        <Text strong style={{ fontSize: 12, color: '#64748b' }}>{group.category}</Text>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                          {group.items.map(item => {
                            const active = selectedGenreFramework === item.framework || activeGenreGuide?.framework === item.framework
                            return (
                              <button
                                key={item.framework}
                                type="button"
                                onClick={() => selectGenreFramework(item.framework)}
                                style={{
                                  border: active ? '1px solid #1677ff' : '1px solid #e5e7eb',
                                  background: active ? '#eff6ff' : '#fff',
                                  borderRadius: 999,
                                  padding: '4px 10px',
                                  cursor: 'pointer',
                                  fontSize: 12,
                                }}
                              >
                                {item.framework}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}

                    {activeGenreGuide ? (
                      <Alert
                        type="info"
                        showIcon
                        message={`已选/命中：${activeGenreGuide.framework}`}
                        description={(
                          <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            <Text style={{ fontSize: 12 }}><strong>读者承诺：</strong>{activeGenreGuide.reader_promise}</Text>
                            <Text style={{ fontSize: 12 }}><strong>结构节拍：</strong>{activeGenreGuide.structure_beats.slice(0, 2).join('；')}</Text>
                            <Text style={{ fontSize: 12 }}><strong>必备场景：</strong>{activeGenreGuide.must_have_scenes.slice(0, 3).join('；')}</Text>
                            <Text style={{ fontSize: 12 }}><strong>情绪节奏：</strong>{activeGenreGuide.emotional_rhythm.slice(0, 2).join('；')}</Text>
                            <Text style={{ fontSize: 12 }}><strong>避坑：</strong>{activeGenreGuide.pitfalls.slice(0, 2).join('；')}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>生成草稿时会把该类型契约注入模型，避免只挂题材标签。</Text>
                          </Space>
                        )}
                      />
                    ) : (
                      <Alert type="warning" showIcon message="尚未命中类型框架。可先点选上方类型，或在创意里写“规则怪谈/都市高武/重生复仇”等关键词。" />
                    )}
                  </Space>
                </Card>


                {createMode !== 'manual' && (
                  <>
                    <Alert
                      type="info"
                      showIcon
                      message={createMode === 'quick_ai'
                        ? '输入作品名即可自动建项；如果有零散设定，也可以粘贴进来，AI 会整理成项目简介、分卷、章节细纲和伏笔计划。'
                        : '先让 AI 生成详细草稿，再在审阅台里按创作资料修改标题、世界观、人物、分卷、章节和伏笔，最后让模型整理成确定版。'}
                    />
                    {createMode === 'deep_draft' && (
                      <Alert
                        type="success"
                        showIcon
                        message="深度孵化开书引导（对照 oh-story）"
                        description={(
                          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                            <li>先立清读者承诺、核心卖点和开篇噱头，再扩世界与人物。</li>
                            <li>主角目标、主要对手、规则代价必须能写成一句话。</li>
                            <li>前30章按 1-3 / 4-10 / 11-30 三段检查追读闭环。</li>
                            <li>生成后看基础评分；达到推荐分，或你明确满意，再定稿开书。</li>
                          </ul>
                        )}
                      />
                    )}

                    <Input
                      value={data.title}
                      onChange={event => setData(prev => ({ ...prev, title: event.target.value }))}
                      placeholder="作品名称，例如：长生天尊"
                      size="large"
                    />
                    <Select
                      size="large"
                      value={data.length_target}
                      placeholder="选择篇幅目标"
                      options={LENGTH_TARGETS}
                      optionRender={(option) => (
                        <div>
                          <div>{option.label}</div>
                          <div style={{ fontSize: 12, color: '#999' }}>{option.data?.description}</div>
                        </div>
                      )}
                      onChange={value => {
                        setData(prev => ({ ...prev, length_target: value }))
                        setSeedFinalized(false)
                      }}
                    />
                    <Input.TextArea
                      rows={5}
                      value={seedIdea}
                      onChange={event => setSeedIdea(event.target.value)}
                      placeholder="可选：粘贴碎片想法。只填作品名时，系统会按原创项目自动扩展；粘贴设定时，会优先保留你的核心因果。"
                      maxLength={20000}
                      showCount
                    />
                    <Space.Compact block>
                      <Select
                        style={{ width: '65%' }}
                        value={seedModelId}
                        loading={modelsLoading}
                        placeholder="选择模型"
                        options={modelOptions}
                        onChange={setSeedModelId}
                      />
                      <Button
                        type="primary"
                        loading={seedLoading}
                        onClick={deriveProjectSeed}
                        style={{ width: '35%' }}
                      >
                        {createMode === 'deep_draft' ? '生成详细草稿' : 'AI整理创意'}
                      </Button>
                    </Space.Compact>
                    {createMode === 'deep_draft' && (
                      <Card size="small" title="已保存孵化草稿" styles={{ body: { padding: 10 } }}>
                        <Space.Compact block>
                          <Select
                            style={{ width: '58%' }}
                            value={selectedSeedDraftId}
                            loading={seedDraftsLoading}
                            placeholder={seedDrafts.length ? '选择草稿' : '暂无已保存草稿'}
                            options={seedDraftOptions}
                            onChange={setSelectedSeedDraftId}
                            allowClear
                          />
                          <Button
                            style={{ width: '21%' }}
                            icon={<FolderOpenOutlined />}
                            disabled={!selectedSeedDraftId}
                            onClick={loadSelectedSeedDraft}
                          >
                            载入
                          </Button>
                          <Popconfirm
                            title="删除这个孵化草稿？"
                            okText="删除"
                            cancelText="取消"
                            onConfirm={deleteSelectedSeedDraft}
                            disabled={!selectedSeedDraftId}
                          >
                            <Button
                              danger
                              style={{ width: '21%' }}
                              icon={<DeleteOutlined />}
                              loading={deletingSeedDraft}
                              disabled={!selectedSeedDraftId}
                            >
                              删除
                            </Button>
                          </Popconfirm>
                        </Space.Compact>
                      </Card>
                    )}
                    {createMode === 'quick_ai' && (
                      <Button
                        block
                        type="primary"
                        icon={<RocketOutlined />}
                        loading={autoCreating}
                        disabled={seedLoading || creating}
                        onClick={handleAutoCreate}
                      >
                        {seed ? '用这个种子自动创建并进入工作台' : 'AI整理并自动创建项目'}
                      </Button>
                    )}
                  </>
                )}
                {seed && (
                  <Card size="small" title="已生成项目种子" style={{ borderRadius: 8 }}>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      {createMode === 'deep_draft' && (
                        <Alert
                          type={seedFinalized ? 'success' : 'warning'}
                          showIcon
                          message={seedFinalized ? '当前是确定版项目种子' : '当前是草稿。请先审阅并修改下方创作资料，再点击“模型整理为确定版”。'}
                        />
                      )}
                      {renderFoundationScoreCard()}
                      {outlinesAreLocalScaffold && (
                        <Alert
                          type="warning"
                          showIcon
                          message="分卷/前30章细纲尚未由模型成功生成"
                          description={(
                            <Space direction="vertical" size={2} style={{ width: '100%' }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {seedDiagnostics?.suggestion
                                  || seed?.seed_diagnostics?.suggestion
                                  || '系统不会再用本地模板章纲冒充结果。请重新点“生成详细草稿”，让模型单独生成分卷与前30章；若多次失败，请换更强模型或把创意写得更具体后再试。'}
                              </Text>
                              <Text style={{ fontSize: 12 }}>
                                当前：分卷 {Number(seedDiagnostics?.outline_volume_count ?? seed?.volume_outlines?.length ?? 0)}
                                ｜章节细纲 {Number(seedDiagnostics?.outline_chapter_count ?? seed?.chapter_outlines?.length ?? 0)}
                                ｜伏笔 {Number(seedDiagnostics?.outline_foreshadowing_count ?? seed?.foreshadowing_plan?.length ?? 0)}
                              </Text>
                              {Array.isArray(seedDiagnostics?.outline_pass_notes) && seedDiagnostics.outline_pass_notes.length > 0 && (
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  生成步骤：{seedDiagnostics.outline_pass_notes.join('；')}
                                </Text>
                              )}
                              {Array.isArray(seedDiagnostics?.outline_pass_errors) && seedDiagnostics.outline_pass_errors.length > 0 && (
                                <Text type="danger" style={{ fontSize: 11 }}>
                                  调用异常：{seedDiagnostics.outline_pass_errors[0]}
                                </Text>
                              )}
                            </Space>
                          )}
                        />
                      )}
                      {seedRecoveryView.visible && (
                        <Alert
                          type={seedRecoveryView.type}
                          showIcon
                          message={seedRecoveryView.title}
                          description={(
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>{seedRecoveryView.message}</Text>
                              {seedRecoveryView.retainedFragments.length > 0 && (
                                <Text style={{ fontSize: 12 }}>
                                  保留：{seedRecoveryView.retainedFragments.slice(0, 3).join('；')}
                                </Text>
                              )}
                              <Space wrap size={[4, 4]}>
                                {seedRecoveryView.generatedFields.slice(0, 4).map(field => (
                                  <Tag key={`generated-${field}`} color="green" bordered={false}>已补 {field}</Tag>
                                ))}
                                {seedRecoveryView.missingFields.slice(0, 4).map(field => (
                                  <Tag key={`missing-${field}`} color="gold" bordered={false}>待确认 {field}</Tag>
                                ))}
                              </Space>
                            </Space>
                          )}
                        />
                      )}
                      <Space wrap>
                        <Tag color="blue" bordered={false}>{seed.genre || '未定题材'}</Tag>
                        {asStringArray(seed.sub_genres).slice(0, 4).map(item => <Tag key={item} bordered={false}>{item}</Tag>)}
                      </Space>
                      <Text strong>{seed.title || seed.logline || '项目种子已生成'}</Text>
                      {seed.logline && <Text>{seed.logline}</Text>}
                      <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                        {seed.synopsis || seed.core_premise || seed.main_conflict || '模型已返回项目种子，但核心简介字段为空。可展开下方完整结构查看。'}
                      </Paragraph>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                        <Card size="small" title="主角" styles={{ body: { padding: 10 } }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {firstText(seed.protagonist?.name, seed.protagonist?.identity, '未提取')}
                            {firstText(seed.protagonist?.goal) ? `：${firstText(seed.protagonist?.goal)}` : ''}
                          </Text>
                        </Card>
                        <Card size="small" title="核心矛盾" styles={{ body: { padding: 10 } }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>{seed.main_conflict || seed.core_premise || '未提取'}</Text>
                        </Card>
                      </div>
                      {(seed.worldbuilding?.world_summary || seed.worldbuilding?.history_secret || seed.worldbuilding?.power_system) && (
                        <Card size="small" title="世界观摘要" styles={{ body: { padding: 10 } }}>
                          <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
                            {firstText(seed.worldbuilding?.world_summary, seed.worldbuilding?.history_secret, seed.worldbuilding?.power_system)}
                          </Paragraph>
                        </Card>
                      )}
                      {Array.isArray(seed.characters) && seed.characters.length > 0 && (
                        <Card size="small" title="关键人物" styles={{ body: { padding: 10 } }}>
                          <Space wrap>
                            {seed.characters.slice(0, 8).map((character: any, index: number) => (
                              <Tag key={`${character?.name || 'character'}-${index}`} bordered={false}>
                                {firstText(character?.name, character?.role_type, `人物${index + 1}`)}
                              </Tag>
                            ))}
                          </Space>
                        </Card>
                      )}
                      {(Array.isArray(seed.volume_outlines) || Array.isArray(seed.chapter_outlines)) && (
                        <Space wrap>
                          <Tag color="purple" bordered={false}>分卷 {seed.volume_outlines?.length || 0}</Tag>
                          <Tag color="geekblue" bordered={false}>章节细纲 {seed.chapter_outlines?.length || 0}</Tag>
                          <Tag color="cyan" bordered={false}>伏笔 {effectiveForeshadowingCount}</Tag>
                        </Space>
                      )}
                      {seedConfirmationSummary && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          已补确认：{seedConfirmationSummary}
                        </Text>
                      )}
                      {asStringArray(seed.open_questions).length > 0 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          待确认：{asStringArray(seed.open_questions).slice(0, 3).join('；')}
                        </Text>
                      )}
                      {createMode === 'deep_draft' ? (
                        <>
                          <Card size="small" title="创作草稿审阅台" styles={{ body: { padding: 12 } }}>
                            <Space direction="vertical" size={12} style={{ width: '100%' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                                <Input
                                  value={deepDraftReview.basics.title}
                                  onChange={event => updateDeepDraftReview({ basics: { ...deepDraftReview.basics, title: event.target.value } })}
                                  placeholder="书名"
                                />
                                <Input
                                  value={deepDraftReview.basics.genre}
                                  onChange={event => updateDeepDraftReview({ basics: { ...deepDraftReview.basics, genre: event.target.value } })}
                                  placeholder="题材"
                                />
                              </div>
                              <Input.TextArea
                                rows={2}
                                value={deepDraftReview.basics.pitch}
                                onChange={event => updateDeepDraftReview({ basics: { ...deepDraftReview.basics, pitch: event.target.value } })}
                                placeholder="一句话卖点：主角、冲突、爽点承诺"
                              />
                              <Input.TextArea
                                rows={3}
                                value={deepDraftReview.basics.synopsis}
                                onChange={event => updateDeepDraftReview({ basics: { ...deepDraftReview.basics, synopsis: event.target.value } })}
                                placeholder="项目简介：给后续大纲和正文使用的核心简介"
                              />

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
                                <Input.TextArea
                                  rows={4}
                                  value={deepDraftReview.world.summary}
                                  onChange={event => updateDeepDraftReview({ world: { ...deepDraftReview.world, summary: event.target.value } })}
                                  placeholder="世界观摘要"
                                />
                                <Input.TextArea
                                  rows={4}
                                  value={deepDraftReview.world.powerSystem}
                                  onChange={event => updateDeepDraftReview({ world: { ...deepDraftReview.world, powerSystem: event.target.value } })}
                                  placeholder="能力 / 金手指 / 成长体系"
                                />
                              </div>

                              <Card size="small" title="关键人物" extra={<Button size="small" onClick={() => updateDeepDraftReview({ characters: [...deepDraftReview.characters, { name: '', role: '', goal: '' }] })}>添加人物</Button>}>
                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                  {deepDraftReview.characters.map((character, index) => (
                                    <div key={`review-character-${index}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                                      <Input value={character.name} onChange={event => updateDeepDraftCharacter(index, { name: event.target.value })} placeholder="姓名" />
                                      <Input value={character.role} onChange={event => updateDeepDraftCharacter(index, { role: event.target.value })} placeholder="定位" />
                                      <Input value={character.goal} onChange={event => updateDeepDraftCharacter(index, { goal: event.target.value })} placeholder="目标 / 压力 / 关系" />
                                      <Button onClick={() => removeDeepDraftItem('characters', index)}>移除</Button>
                                    </div>
                                  ))}
                                  {deepDraftReview.characters.length === 0 && <Text type="secondary">还没有人物，可先添加主角、对手和核心同盟。</Text>}
                                </Space>
                              </Card>

                              <Card size="small" title="分卷规划" extra={<Button size="small" onClick={() => updateDeepDraftReview({ volumes: [...deepDraftReview.volumes, { title: '', goal: '' }] })}>添加分卷</Button>}>
                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                  {deepDraftReview.volumes.map((volume, index) => (
                                    <div key={`review-volume-${index}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                                      <Input value={volume.title} onChange={event => updateDeepDraftVolume(index, { title: event.target.value })} placeholder="卷名" />
                                      <Input value={volume.goal} onChange={event => updateDeepDraftVolume(index, { goal: event.target.value })} placeholder="本卷阶段目标 / 地图 / 矛盾" />
                                      <Button onClick={() => removeDeepDraftItem('volumes', index)}>移除</Button>
                                    </div>
                                  ))}
                                  {deepDraftReview.volumes.length === 0 && <Text type="secondary">还没有分卷，可先写第一卷目标，再让模型扩展。</Text>}
                                </Space>
                              </Card>

                              <Card size="small" title="前30章细纲" extra={<Button size="small" onClick={() => updateDeepDraftReview({ chapters: [...deepDraftReview.chapters, { chapterNo: deepDraftReview.chapters.length + 1, title: '', goal: '' }] })}>添加章节</Button>}>
                                <div style={{ maxHeight: 360, overflow: 'auto', paddingRight: 4 }}>
                                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                    {deepDraftReview.chapters.slice(0, 30).map((chapter, index) => (
                                      <div key={`review-chapter-${index}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 8 }}>
                                        <Input
                                          type="number"
                                          value={chapter.chapterNo}
                                          onChange={event => updateDeepDraftChapter(index, { chapterNo: Number(event.target.value) || index + 1 })}
                                          placeholder="章"
                                        />
                                        <Input value={chapter.title} onChange={event => updateDeepDraftChapter(index, { title: event.target.value })} placeholder="章节名" />
                                        <Input value={chapter.goal} onChange={event => updateDeepDraftChapter(index, { goal: event.target.value })} placeholder="本章目标 / 爽点 / 悬念" />
                                        <Button onClick={() => removeDeepDraftItem('chapters', index)}>移除</Button>
                                      </div>
                                    ))}
                                    {deepDraftReview.chapters.length === 0 && <Text type="secondary">还没有章节细纲，可添加前3章或直接让模型定稿补齐。</Text>}
                                  </Space>
                                </div>
                              </Card>

                              <Space wrap align="center">
                                <Text strong>伏笔与确认项</Text>
                                <Button size="small" onClick={repairCurrentDeepDraftGaps}>生成本地可编辑伏笔草稿</Button>
                              </Space>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
                                <Input.TextArea
                                  rows={4}
                                  value={deepDraftReview.continuity.foreshadowing}
                                  onChange={event => updateDeepDraftReview({ continuity: { ...deepDraftReview.continuity, foreshadowing: event.target.value } })}
                                  placeholder="伏笔与回收计划，每行一个"
                                />
                                <Input.TextArea
                                  rows={4}
                                  value={deepDraftReview.continuity.openQuestions}
                                  onChange={event => updateDeepDraftReview({ continuity: { ...deepDraftReview.continuity, openQuestions: event.target.value } })}
                                  placeholder="确认项或待确认问题，每行一个；确认项会随项目种子保存"
                                />
                              </div>
                            </Space>
                          </Card>
                          <Space.Compact block>
                            <Button
                              style={{ width: '33.333%' }}
                              icon={<SaveOutlined />}
                              loading={savingSeedDraft}
                              onClick={saveCurrentSeedDraft}
                            >
                              保存草稿
                            </Button>
                            <Button
                              style={{ width: '33.333%' }}
                              onClick={() => {
                                const nextSeed = normalizeProjectSeedForUi(deepDraftReviewModelToSeed(seed || {}, deepDraftReview))
                                setSeed(nextSeed)
                                applySeedToForm(nextSeed)
                                setSeedFinalized(false)
                                message.success('已采用审阅台草稿预览，仍建议模型定稿后创建')
                              }}
                            >
                              采用当前草稿预览
                            </Button>
                            <Button
                              type="primary"
                              style={{ width: '33.333%' }}
                              loading={finalizingSeed}
                              onClick={() => finalizeProjectSeed(false)}
                            >
                              定稿并创建项目
                            </Button>
                          </Space.Compact>
                          {seedDiagnosticsNeedReview(seedDiagnostics) && (
                            <Button
                              block
                              type="primary"
                              loading={finalizingSeed}
                              onClick={() => finalizeProjectSeed(true)}
                            >
                              我已确认，创建项目
                            </Button>
                          )}
                          <details>
                            <summary style={{ cursor: 'pointer', color: '#1677ff' }}>查看完整项目种子 JSON（高级）</summary>
                            <pre style={{ maxHeight: 260, overflow: 'auto', marginTop: 8, padding: 10, background: '#f8fafc', borderRadius: 8, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                              {JSON.stringify(deepDraftReviewModelToSeed(seed || {}, deepDraftReview), null, 2)}
                            </pre>
                          </details>
                        </>
                      ) : (
                        <details>
                          <summary style={{ cursor: 'pointer', color: '#1677ff' }}>查看完整项目种子 JSON</summary>
                          <pre style={{ maxHeight: 260, overflow: 'auto', marginTop: 8, padding: 10, background: '#f8fafc', borderRadius: 8, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(seed, null, 2)}
                          </pre>
                        </details>
                      )}
                    </Space>
                  </Card>
                )}
              </Space>
            </Card>

            {(createMode === 'manual' || seed) && (
              <>
                <Form.Item
                  name="title"
                  label="作品标题"
                  rules={[{ required: true, message: '请输入作品标题' }]}
                >
                  <Input
                    size="large"
                    placeholder="例如：废墟尽头的灯塔"
                    prefix="📖"
                  />
                </Form.Item>

                <Form.Item
                  name="genre"
                  label="题材"
                  rules={[{ required: true, message: '请选择题材' }]}
                >
                  <Select
                    size="large"
                    placeholder="选择主要题材"
                    options={GENRES}
                  />
                </Form.Item>

                <Form.Item
                  name="length_target"
                  label="篇幅目标"
                  rules={[{ required: true, message: '请选择篇幅目标' }]}
                >
                  <Select
                    size="large"
                    placeholder="选择目标篇幅"
                    options={LENGTH_TARGETS}
                    optionRender={(option) => (
                      <div>
                        <div>{option.label}</div>
                        <div style={{ fontSize: 12, color: '#999' }}>{option.data?.description}</div>
                      </div>
                    )}
                  />
                </Form.Item>

                <Form.Item name="target_audience" label="目标读者">
                  <Select
                    placeholder="选择目标读者群体"
                    options={AUDIENCES}
                  />
                </Form.Item>

                <Form.Item name="female_audience_mode" label="女频长篇口径">
                  <Segmented
                    block
                    options={FEMALE_AUDIENCE_MODES}
                  />
                </Form.Item>

                <Form.Item name="sub_genres" label="子题材（可选，可多选）">
                  <Select
                    mode="tags"
                    placeholder="例如：穿越, 赛博朋克, 克苏鲁"
                    style={{ width: '100%' }}
                  />
                </Form.Item>

                <Form.Item name="synopsis" label="一句话简介（可选）">
                  <Input.TextArea
                    rows={3}
                    placeholder="用一句话描述你的小说核心卖点"
                    maxLength={500}
                    showCount
                  />
                </Form.Item>
              </>
            )}
          </>
        )}

        {/* Step 1: Commercial Hook */}
        {current === 1 && (
          <>
            <Form.Item label="读者承诺">
              <Input.TextArea
                rows={2}
                value={launchpad.reader_promise}
                onChange={event => updateLaunchpad({ reader_promise: event.target.value })}
                placeholder="读者追下去能持续获得什么满足感"
                maxLength={300}
                showCount
              />
            </Form.Item>

            <Form.Item label="核心卖点">
              <Input.TextArea
                rows={2}
                value={launchpad.core_selling_point}
                onChange={event => updateLaunchpad({ core_selling_point: event.target.value })}
                placeholder="一句话说明本书最有商业辨识度的爽点"
                maxLength={300}
                showCount
              />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <Form.Item label="主角处境">
                <Input.TextArea
                  rows={3}
                  value={launchpad.protagonist_situation}
                  onChange={event => updateLaunchpad({ protagonist_situation: event.target.value })}
                  placeholder="主角开局身份、资源、关系和位置"
                />
              </Form.Item>
              <Form.Item label="主角压力">
                <Input.TextArea
                  rows={3}
                  value={launchpad.protagonist_pressure}
                  onChange={event => updateLaunchpad({ protagonist_pressure: event.target.value })}
                  placeholder="开局必须解决的危机、倒计时或损失"
                />
              </Form.Item>
            </div>

            <Form.Item label="开篇钩子">
              <Input.TextArea
                rows={3}
                value={launchpad.opening_hook}
                onChange={event => updateLaunchpad({ opening_hook: event.target.value })}
                placeholder="第1章要抛出的冲突、反差或承诺"
              />
            </Form.Item>

            <Form.Item name="style_tags" label="风格标签（可选，可多选）">
              <Select
                mode="multiple"
                placeholder="选择风格标签"
                options={STYLE_TAGS.map(t => ({ value: t, label: t }))}
                style={{ width: '100%' }}
                maxCount={5}
              />
            </Form.Item>

            <Form.Item name="commercial_tags" label="商业标签（可选，可多选）">
              <Select
                mode="multiple"
                placeholder="选择商业定位标签"
                options={COMMERCIAL_TAGS.map(t => ({ value: t, label: t }))}
                style={{ width: '100%' }}
                maxCount={3}
              />
            </Form.Item>
          </>
        )}

        {/* Step 2: Long-form Capacity */}
        {current === 2 && (
          <>
            <Form.Item label="长篇主线目标">
              <Input.TextArea
                rows={2}
                value={launchpad.mainline_goal}
                onChange={event => updateLaunchpad({ mainline_goal: event.target.value })}
                placeholder="贯穿全书的长期目标"
              />
            </Form.Item>

            <Form.Item label="长线冲突引擎">
              <Input.TextArea
                rows={2}
                value={launchpad.long_term_conflict}
                onChange={event => updateLaunchpad({ long_term_conflict: event.target.value })}
                placeholder="主角、反派、制度或世界规则之间的长期对抗"
              />
            </Form.Item>

            <Form.Item label="成长引擎">
              <Input.TextArea
                rows={2}
                value={launchpad.growth_engine}
                onChange={event => updateLaunchpad({ growth_engine: event.target.value })}
                placeholder="等级、能力、产业、关系或认知如何持续升级"
              />
            </Form.Item>

            <Form.Item label="分卷方向">
              <Input.TextArea
                rows={3}
                value={launchpad.volume_direction}
                onChange={event => updateLaunchpad({ volume_direction: event.target.value })}
                placeholder="每卷推进什么目标、地图或阶段性矛盾"
              />
            </Form.Item>

            <Form.Item label="可扩展资产池">
              <Input.TextArea
                rows={3}
                value={launchpad.expandable_assets}
                onChange={event => updateLaunchpad({ expandable_assets: event.target.value })}
                placeholder="人物、组织、地图、道具、谜题、伏笔等可长期调用的资产"
              />
            </Form.Item>

            <Form.Item label="未来100章备注">
              <Input.TextArea
                rows={3}
                value={launchpad.future100_note}
                onChange={event => updateLaunchpad({ future100_note: event.target.value })}
                placeholder="第31-100章的阶段方向、升级节奏或风险点"
              />
            </Form.Item>

            {seed && (
              <Card size="small" title="种子素材覆盖" style={{ borderRadius: 8 }}>
                <Space wrap>
                  <Tag color="purple" bordered={false}>分卷 {seed.volume_outlines?.length || 0}</Tag>
                  <Tag color="geekblue" bordered={false}>章节细纲 {seed.chapter_outlines?.length || 0}</Tag>
                  <Tag color="cyan" bordered={false}>伏笔 {effectiveForeshadowingCount}</Tag>
                  <Tag color="blue" bordered={false}>人物 {seed.characters?.length || 0}</Tag>
                </Space>
              </Card>
            )}
          </>
        )}

        {/* Step 3: First 30 Chapters */}
        {current === 3 && (
          <>
            <Card size="small" title="AI 种子前30章覆盖" style={{ marginBottom: 16, borderRadius: 8 }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color={first30Summary.hasOpening ? 'green' : 'default'} bordered={false}>1-3章 {first30Summary.hasOpening ? '已覆盖' : '待补'}</Tag>
                  <Tag color={first30Summary.hasTrialRead ? 'green' : 'default'} bordered={false}>4-10章 {first30Summary.hasTrialRead ? '已覆盖' : '待补'}</Tag>
                  <Tag color={first30Summary.hasPaidBuildup ? 'green' : 'default'} bordered={false}>11-30章 {first30Summary.hasPaidBuildup ? '已覆盖' : '待补'}</Tag>
                  <Tag color="blue" bordered={false}>细纲 {first30Summary.outlineCount}</Tag>
                </Space>
                {first30Summary.sample.length > 0 ? (
                  <List
                    size="small"
                    dataSource={first30Summary.sample}
                    renderItem={item => <List.Item>{item}</List.Item>}
                  />
                ) : (
                  <Text type="secondary">当前种子没有可识别的前30章细纲，可在下方手动填写追读启动计划。</Text>
                )}
              </Space>
            </Card>

            <Form.Item label="1-3章：开篇承诺">
              <Input.TextArea
                rows={3}
                value={launchpad.first30_plan.chapters_1_3}
                onChange={event => updateFirst30Plan({ chapters_1_3: event.target.value })}
                placeholder="开局冲突、主角反差、读者第一口爽点"
              />
            </Form.Item>

            <Form.Item label="4-10章：试读闭环">
              <Input.TextArea
                rows={3}
                value={launchpad.first30_plan.chapters_4_10}
                onChange={event => updateFirst30Plan({ chapters_4_10: event.target.value })}
                placeholder="试读期要解决的小闭环和继续追读的悬念"
              />
            </Form.Item>

            <Form.Item label="11-30章：付费蓄势">
              <Input.TextArea
                rows={4}
                value={launchpad.first30_plan.chapters_11_30}
                onChange={event => updateFirst30Plan({ chapters_11_30: event.target.value })}
                placeholder="付费章节前后的升级、反转、阶段敌人和更大目标"
              />
            </Form.Item>

            <Form.Item label="第一项写作任务">
              <Input
                value={launchpad.first_writing_task}
                onChange={event => updateLaunchpad({ first_writing_task: event.target.value })}
                placeholder="例如：完善第1章场景卡"
              />
            </Form.Item>
          </>
        )}

      </Form>

      {/* Step 4: Confirm — 从 data state 读取，不依赖 Form */}
      {current === 4 && (
        <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 20 }}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>创建预览与风险</h3>

            {renderFoundationScoreCard({ compact: true })}

            <Space wrap>
              {[
                launchpadReadiness.sellable,
                launchpadReadiness.first30,
                launchpadReadiness.longform,
              ].map(item => (
                <Tag key={item.key} color={item.ready ? 'green' : 'orange'} bordered={false}>
                  {item.title} {item.ready ? '就绪' : `待补 ${item.missing.length}`}
                </Tag>
              ))}
              {createMode === 'deep_draft' && (
                <Tag color={foundationScore.recommendCreate ? 'green' : foundationAccepted ? 'blue' : 'gold'} bordered={false}>
                  基础分 {foundationScore.overall} · {foundationScore.statusLabel}
                </Tag>
              )}
            </Space>

            {launchpadReadiness.risks.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message="创建后可继续补齐这些启动风险"
                description={launchpadReadiness.risks.join('；')}
              />
            )}

            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex' }}>
                <span style={{ minWidth: 80, color: '#999' }}>作品标题</span>
                <span style={{ fontWeight: 500 }}>{data.title || '-'}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ minWidth: 80, color: '#999' }}>题材</span>
                <span>{data.genre || '-'}</span>
              </div>
              {data.sub_genres?.length > 0 && (
                <div style={{ display: 'flex' }}>
                  <span style={{ minWidth: 80, color: '#999' }}>子题材</span>
                  <span>{data.sub_genres.join(' / ')}</span>
                </div>
              )}
              {data.synopsis && (
                <div style={{ display: 'flex' }}>
                  <span style={{ minWidth: 80, color: '#999' }}>简介</span>
                  <span style={{ fontStyle: 'italic', color: '#666' }}>{data.synopsis}</span>
                </div>
              )}
              <div style={{ display: 'flex' }}>
                <span style={{ minWidth: 80, color: '#999' }}>篇幅</span>
                <span>{LENGTH_TARGETS.find(l => l.value === data.length_target)?.label || '中篇'}</span>
              </div>
              {data.target_audience && (
                <div style={{ display: 'flex' }}>
                  <span style={{ minWidth: 80, color: '#999' }}>读者</span>
                  <span>{data.target_audience}</span>
                </div>
              )}
              {data.style_tags?.length > 0 && (
                <div style={{ display: 'flex' }}>
                  <span style={{ minWidth: 80, color: '#999' }}>风格</span>
                  <span>{data.style_tags.join(' / ')}</span>
                </div>
              )}
              {data.commercial_tags?.length > 0 && (
                <div style={{ display: 'flex' }}>
                  <span style={{ minWidth: 80, color: '#999' }}>商业</span>
                  <span>{data.commercial_tags.join(' / ')}</span>
                </div>
              )}
              {seed && (
                <div style={{ display: 'flex' }}>
                  <span style={{ minWidth: 80, color: '#999' }}>创意种子</span>
                  <span>已保存，并会自动创建分卷大纲、章节目录/细纲与伏笔计划</span>
                </div>
              )}
            </div>

            <Card size="small" title="核心承诺" style={{ borderRadius: 8 }}>
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                <Text strong>{launchpad.reader_promise || data.synopsis || '未填写读者承诺'}</Text>
                <Text type="secondary">{launchpad.core_selling_point || '未填写核心卖点'}</Text>
                <Text type="secondary">{launchpad.opening_hook || '未填写开篇钩子'}</Text>
              </Space>
            </Card>

            <List
              size="small"
              header={<Text strong>写作准备</Text>}
              dataSource={[
                {
                  title: '前30章',
                  text: launchpad.first30_plan.chapters_1_3 || launchpad.first30_plan.chapters_4_10 || launchpad.first30_plan.chapters_11_30 || '待补前30章追读计划',
                },
                {
                  title: '长线承载',
                  text: launchpad.mainline_goal || launchpad.long_term_conflict || launchpad.growth_engine || '待补长篇主线与成长引擎',
                },
                {
                  title: '下一步',
                  text: launchpadReadiness.nextAction,
                },
              ]}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={item.title}
                    description={<span style={{ whiteSpace: 'pre-wrap' }}>{item.text}</span>}
                  />
                </List.Item>
              )}
            />
          </Space>
        </div>
      )}

      {/* Step 5: Done */}
      {current === 5 && (
        <Result
          status="success"
          icon={<CheckCircleOutlined />}
          title="小说项目创建成功！"
          subTitle={data.title ? `《${data.title}》已就绪` : '项目已就绪'}
          extra={[
            <Button
              type="primary"
              key="go"
              icon={<RocketOutlined />}
              onClick={handleDone}
              size="large"
            >
              进入工作台
            </Button>,
            <Button key="close" onClick={handleModalCancel} size="large">
              留在项目大厅
            </Button>,
          ]}
        />
      )}

      {/* Navigation Buttons */}
      {current < 5 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handlePrev}
            disabled={current === 0}
          >
            上一步
          </Button>
          <Space>
            <Button onClick={handleModalCancel}>取消</Button>
            <Button
              type="primary"
              icon={current === 4 ? <RocketOutlined /> : <ArrowRightOutlined />}
              onClick={handleNext}
              loading={creating}
              disabled={
                (current === 0 && (
                  !data.title.trim()
                  || (createMode === 'manual' && !data.genre)
                  || (createMode === 'quick_ai' && !seed)
                  || (createMode === 'deep_draft' && (!seed || !seedFinalized || !foundationReadyToCreate))
                ))
                || (current === 4 && createMode === 'deep_draft' && !foundationReadyToCreate)
              }
            >
              {current === 4 ? '创建项目' : '下一步'}
            </Button>
          </Space>
        </div>
      )}
    </Modal>
  )
}
