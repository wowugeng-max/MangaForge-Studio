/** Deep-draft review editors and seed-draft CRUD for create wizard. */
import { message } from 'antd'
import apiClient from '../../../api/client'
import {
  deepDraftReviewModelToSeed,
  repairDeepDraftReviewModelGaps,
  type DeepDraftChapter,
  type DeepDraftCharacter,
  type DeepDraftReviewModel,
  type DeepDraftVolume,
} from '../deepDraftReviewModel'
import {
  firstText,
  normalizeProjectSeedForUi,
  restoreDeepDraftReview,
} from './createWizardSeedUtils'
import type { ProjectSeedDraft } from './useCreateWizardController'

const projectSeedModelStorageKey = 'novel.projectSeed.model_id'

type SetState<T> = (value: T | ((prev: T) => T)) => void

export function createDeepDraftActions(deps: {
  seed: any
  setSeed: SetState<any>
  deepDraftReview: DeepDraftReviewModel
  setDeepDraftReview: SetState<DeepDraftReviewModel>
  setSeedFinalized: (value: boolean) => void
  seedIdea: string
  data: { title: string; length_target: string }
  seedDiagnostics: any
  seedModelId?: number
  setSeedModelId: (value: number | undefined) => void
  seedDrafts: ProjectSeedDraft[]
  setSeedDrafts: SetState<ProjectSeedDraft[]>
  selectedSeedDraftId?: number
  setSelectedSeedDraftId: (value: number | undefined) => void
  setSavingSeedDraft: (value: boolean) => void
  setDeletingSeedDraft: (value: boolean) => void
  setCreateMode: (value: any) => void
  setSeedIdea: (value: string) => void
  setSeedDiagnostics: (value: any) => void
  applySeedToForm: (seed: any) => void
  loadSeedDrafts: () => Promise<void>
}) {
  const {
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
  } = deps

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

  return {
    updateDeepDraftReview,
    updateDeepDraftCharacter,
    updateDeepDraftVolume,
    updateDeepDraftChapter,
    removeDeepDraftItem,
    repairCurrentDeepDraftGaps,
    saveCurrentSeedDraft,
    loadSelectedSeedDraft,
    deleteSelectedSeedDraft,
  }
}
