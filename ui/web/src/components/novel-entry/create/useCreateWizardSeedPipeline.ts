/** Seed apply/derive/fill/finalize pipeline for create wizard. */
import { message } from 'antd'
import apiClient from '../../../api/client'
import {
  extractLaunchpadFieldsFromSeed,
  type LaunchpadFields,
} from '../launchpadModel'
import {
  deepDraftReviewModelToSeed,
  type DeepDraftReviewModel,
} from '../deepDraftReviewModel'
import {
  buildGenreGuideIdeaPrefix,
  isSeedGenreAligned,
  matchGenreCatalogGuide,
  primaryGenreLockText,
  type GenreCatalogGuide,
} from '../genreCatalogGuide'
import {
  asStringArray,
  buildDeepDraftReviewForUi,
  normalizeLengthTarget,
  normalizeProjectSeedForUi,
  pickGenre,
  seedDiagnosticsNeedReview,
} from './createWizardSeedUtils'

const projectSeedModelStorageKey = 'novel.projectSeed.model_id'

type SetState<T> = (value: T | ((prev: T) => T)) => void

export function createSeedApplyToForm(deps: {
  data: any
  setData: SetState<any>
  setDeepDraftReview: SetState<DeepDraftReviewModel>
  setFoundationAccepted: (value: boolean) => void
  setLaunchpad: SetState<LaunchpadFields>
  genreCatalogGuides: GenreCatalogGuide[]
  setSelectedGenreFramework: (value: string) => void
}) {
  const {
    data,
    setData,
    setDeepDraftReview,
    setFoundationAccepted,
    setLaunchpad,
    genreCatalogGuides,
    setSelectedGenreFramework,
  } = deps

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

  return applySeedToForm
}

export function createSeedPipelineActions(deps: {
  seed: any
  setSeed: SetState<any>
  deepDraftReview: DeepDraftReviewModel
  createMode: string
  data: any
  setData: SetState<any>
  form: { setFieldsValue: (values: any) => void }
  seedIdea: string
  seedModelId?: number
  setSeedLoading: (value: boolean) => void
  setFillingGaps: (value: boolean) => void
  setFinalizingSeed: (value: boolean) => void
  setSeedDiagnostics: (value: any) => void
  setSeedFinalized: (value: boolean) => void
  setFoundationAccepted: (value: boolean) => void
  setDeepDraftReview: SetState<DeepDraftReviewModel>
  setLaunchpad: SetState<LaunchpadFields>
  foundationScore: any
  activeGenreGuide: GenreCatalogGuide | null | undefined
  selectedGenreFramework: string
  applySeedToForm: (seed: any) => void
  seedStream: { start: (...args: any[]) => Promise<any> }
  createProjectFromFinalizedSeed: (seed: any) => Promise<any>
  finishCreatedProjectFromFinalizeResponse: (data: any) => boolean
}) {
  const {
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
  } = deps

  const deriveProjectSeed = async () => {
    if (!seedIdea.trim() && !data.title.trim()) return message.warning('请输入作品名称，或粘贴创意草稿')
    if (!seedModelId) return message.warning('请先选择用于整理创意的模型')
    if (!String(data.genre || '').trim()) return message.warning('请先选择主题材（如都市、悬疑）')
    setSeedLoading(true)
    try {
      const genrePrefix = buildGenreGuideIdeaPrefix(
        activeGenreGuide,
        data.genre,
      ) || primaryGenreLockText(data.genre)
      const ideaWithGenre = [genrePrefix, seedIdea.trim() || data.title.trim()].filter(Boolean).join('\n\n')
      const latest = await seedStream.start({
        idea: ideaWithGenre,
        title: data.title,
        model_id: seedModelId,
        length_target: data.length_target,
        genre: data.genre,
        primary_genre: data.genre,
        genre_framework: activeGenreGuide?.framework || selectedGenreFramework || '',
      })
      if (latest.error && !latest.seed) {
        message.error(latest.error)
        return
      }
      const nextSeed = normalizeProjectSeedForUi(latest.seed || {})
      const diagnostics = latest.seed_diagnostics || nextSeed.seed_diagnostics || null
      setSeed(nextSeed)
      setSeedDiagnostics(diagnostics)
      setSeedFinalized(createMode !== 'deep_draft' && !seedDiagnosticsNeedReview(diagnostics))
      applySeedToForm(nextSeed)
      // 主题材硬约束：生成结果偏题时保留用户选择并提示
      if (data.genre && !isSeedGenreAligned(nextSeed.genre, data.genre)) {
        setData(prev => ({ ...prev, genre: data.genre }))
        form.setFieldsValue({ genre: data.genre })
        message.warning(`生成结果题材偏成「${nextSeed.genre || '未知'}」，已按你选的主题材「${data.genre}」保留；可改玩法后重生成`)
      }
      if (typeof window !== 'undefined') window.localStorage.setItem(projectSeedModelStorageKey, String(seedModelId))
      if (latest.error) {
        message.warning(latest.error)
      } else if (seedDiagnosticsNeedReview(diagnostics)) {
        message.warning('模型返回偏薄，已保留有效信息并生成可编辑草稿')
      } else if (diagnostics?.status === 'recovered_by_model') {
        message.success('首轮返回偏薄，已自动补种子为可审阅草稿')
      } else if (data.genre && isSeedGenreAligned(nextSeed.genre, data.genre)) {
        message.success(`已按「${data.genre}」整理创意草稿`)
      } else {
        message.success('已整理创意草稿，可继续编辑后创建项目')
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return
      message.error(error?.response?.data?.error || error?.message || '创意草稿整理失败')
    } finally {
      setSeedLoading(false)
    }
  }


  const fillSeedGaps = async () => {
    if (!seed) return message.warning('请先生成详细草稿')
    if (!seedModelId) return message.warning('请先选择模型')
    const draft = createMode === 'deep_draft'
      ? deepDraftReviewModelToSeed({ ...(seed || {}), length_target: data.length_target }, deepDraftReview)
      : seed
    setFillingGaps(true)
    try {
      const res = await apiClient.post('/novel/project-seed/fill-gaps', {
        seed: draft,
        idea: seedIdea,
        title: data.title,
        model_id: seedModelId,
        risks: foundationScore.topRisks || [],
        gaps: foundationScore.dimensions
          .flatMap(item => item.missing.map(label => ({ key: item.key, label })))
          .slice(0, 20),
      })
      const nextSeed = normalizeProjectSeedForUi(res.data?.seed || draft)
      const diagnostics = res.data?.seed_diagnostics || nextSeed.seed_diagnostics || null
      setSeed(nextSeed)
      setSeedDiagnostics(diagnostics)
      setSeedFinalized(false)
      setFoundationAccepted(false)
      applySeedToForm(nextSeed)
      setDeepDraftReview(buildDeepDraftReviewForUi(nextSeed))
      setLaunchpad(extractLaunchpadFieldsFromSeed(nextSeed, data.length_target))
      const filledCount = Array.isArray(res.data?.filled_fields) ? res.data.filled_fields.length : 0
      const remaining = Array.isArray(res.data?.remaining_gaps) ? res.data.remaining_gaps.length : 0
      const modelEmpty = Boolean(res.data?.seed_diagnostics?.model_patch_empty)
      if (filledCount > 0 && remaining === 0) {
        message.success(`已安全补齐缺口（${filledCount} 项），未覆盖已有优质内容`)
      } else if (filledCount > 0) {
        message.success(`已补齐 ${filledCount} 项，仍有 ${remaining} 项可继续补；已有内容已保留`)
      } else {
        message.warning(
          res.data?.seed_diagnostics?.suggestion
          || (modelEmpty ? '模型未返回可解析补丁，已保留原种子。可重试或换模型' : '模型补丁未优于现有内容，已保留原种子'),
        )
      }
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '补齐缺口失败')
    } finally {
      setFillingGaps(false)
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



  return {
    deriveProjectSeed,
    fillSeedGaps,
    finalizeProjectSeed,
  }
}
