import { message, Modal } from 'antd'
import {
  buildGenerationPreflightRepairActionSpecs,
  extractStoryStateChapterNo,
  generationPreflightMissingKeys,
  generationPreflightTargetChapterId,
  type GenerationPreflightRepairActionSpec,
} from '../generationPreflightRepairModel'
import {
  renderCommercialReadinessModalContentView,
  renderDiagnosticsModalContentView,
  renderGenerationPreflightRepairActionsView,
  renderPreflightModalContentView,
} from './workspace-preflight-views'

export type GenerationPreflightRepairAction = {
  key: string
  label: string
  description: string
  modelCall: boolean
  primary?: boolean
  run: () => Promise<void> | void
}

export type PreflightHandlerDeps = {
  activeChapter: any
  apiClient: any
  applyStyleSampleActionForChapter: any
  buildPreDraftBriefForActiveChapter: any
  flushPendingSave: any
  generateSceneCardsForChapter: any
  loadProjectModules: any
  openEditor: any
  openStoryAssetsWorkspace: any
  openStoryStateEditor: any
  projectId: any
  selectChapterForWriting: any
  selectedModelId: any
  setOutlineTreeOpen: any
  sortedChapters: any
  syncStoryStateForChapter: any
}

export function createPreflightHandlers(deps: PreflightHandlerDeps) {
  const activeChapter = deps.activeChapter
  const apiClient = deps.apiClient
  const applyStyleSampleActionForChapter = deps.applyStyleSampleActionForChapter
  const buildPreDraftBriefForActiveChapter = deps.buildPreDraftBriefForActiveChapter
  const flushPendingSave = deps.flushPendingSave
  const generateSceneCardsForChapter = deps.generateSceneCardsForChapter
  const loadProjectModules = deps.loadProjectModules
  const openEditor = deps.openEditor
  const openStoryAssetsWorkspace = deps.openStoryAssetsWorkspace
  const openStoryStateEditor = deps.openStoryStateEditor
  const projectId = deps.projectId
  const selectChapterForWriting = deps.selectChapterForWriting
  const selectedModelId = deps.selectedModelId
  const setOutlineTreeOpen = deps.setOutlineTreeOpen
  const sortedChapters = deps.sortedChapters
  const syncStoryStateForChapter = deps.syncStoryStateForChapter

  const generationPreflightChecks = (payload: any) => {
    const preflight = payload?.preflight || payload?.context_package?.preflight || {}
    return Array.isArray(preflight.checks) ? preflight.checks : []
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

  const runGenerationPreflightRepairSpec = async (
    payload: any,
    spec: GenerationPreflightRepairActionSpec,
    options: { targetChapterId?: number; onRepairComplete?: () => void; closeModal?: () => void } = {},
  ) => {
    const targetChapterId = generationPreflightTargetChapterId(payload, options.targetChapterId)
    const resolveChapterByNo = (chapterNo?: number) => {
      const no = Number(chapterNo || 0)
      if (!no) return null
      return sortedChapters.find((chapter: any) => Number(chapter.chapter_no || 0) === no) || null
    }
    const ensureTargetSelected = async (chapterId?: number) => {
      const id = Number(chapterId || targetChapterId || activeChapter?.id || 0)
      if (!id) return false
      if (Number(activeChapter?.id || 0) === id) return true
      return selectChapterForWriting(id)
    }

    const navigationKinds = new Set(['open_story_state_editor', 'open_story_assets', 'open_outline_tree', 'edit_chapter'])
    const messageKey = `preflight-repair-${spec.kind}`
    const isNavigation = navigationKinds.has(spec.kind)
    if (isNavigation) {
      options.closeModal?.()
    } else {
      message.loading({ content: `正在${spec.label || '补齐材料'}...`, key: messageKey, duration: 0 })
    }

    try {
      switch (spec.kind) {
        case 'repair_all_auto':
          await repairGenerationPreflightGaps(payload, {
            targetChapterId,
            repairKeys: ['characters', 'character_state', 'no_repeat', 'setting_workshop', 'chapter_setting_usage']
              .filter(key => generationPreflightMissingKeys(payload).has(key)),
            continueAfterRepair: options.onRepairComplete,
            closeModal: options.closeModal,
          })
          // repairGenerationPreflightGaps already closes modal + toasts
          message.destroy(messageKey)
          return
        case 'repair_character_cards':
          await repairGenerationPreflightGaps(payload, {
            targetChapterId,
            repairKeys: ['characters', 'character_state', 'no_repeat'],
            closeModal: options.closeModal,
          })
          message.destroy(messageKey)
          return
        case 'incubate_setting_workshop':
          await repairGenerationPreflightGaps(payload, {
            targetChapterId,
            repairKeys: ['setting_workshop'],
            closeModal: options.closeModal,
          })
          message.destroy(messageKey)
          return
        case 'match_chapter_setting_usage':
          await repairGenerationPreflightGaps(payload, {
            targetChapterId,
            repairKeys: ['chapter_setting_usage'],
            closeModal: options.closeModal,
          })
          message.destroy(messageKey)
          return
        case 'sync_story_state': {
          const chapterNo = Number(spec.targetChapterNo || extractStoryStateChapterNo(payload) || 0)
          const chapter = resolveChapterByNo(chapterNo)
            || sortedChapters.filter((item: any) => chapterHasProse(item)).slice(-1)[0]
            || null
          if (!chapter?.id) {
            message.destroy(messageKey)
            openStoryStateEditor()
            message.warning('没有找到可同步的已写章节，已打开人工故事状态校正。')
            return
          }
          await syncStoryStateForChapter(Number(chapter.id))
          message.destroy(messageKey)
          options.closeModal?.()
          return
        }
        case 'replace_style_samples': {
          if (!await ensureTargetSelected(targetChapterId)) {
            message.warning({ content: '无法切换到目标章节', key: messageKey, duration: 3 })
            return
          }
          await applyStyleSampleActionForChapter(
            sortedChapters.find((chapter: any) => Number(chapter.id) === Number(targetChapterId || activeChapter?.id || 0)) || activeChapter,
            'replace',
            '已重选文风样章，请重新确认任务书后再生成',
          )
          options.closeModal?.()
          message.success({ content: `已完成：${spec.label}`, key: messageKey, duration: 2 })
          return
        }
        case 'build_pre_draft_brief': {
          if (!await ensureTargetSelected(targetChapterId)) {
            message.warning({ content: '无法切换到目标章节', key: messageKey, duration: 3 })
            return
          }
          await buildPreDraftBriefForActiveChapter()
          options.closeModal?.()
          message.success({ content: `已完成：${spec.label}`, key: messageKey, duration: 2 })
          return
        }
        case 'generate_scene_cards': {
          const chapterId = Number(targetChapterId || activeChapter?.id || 0)
          if (!chapterId) {
            message.warning({ content: '无法定位需要刷新场景卡的章节', key: messageKey, duration: 3 })
            return
          }
          await generateSceneCardsForChapter(chapterId, true)
          options.closeModal?.()
          message.success({ content: `已完成：${spec.label}`, key: messageKey, duration: 2 })
          return
        }
        case 'open_story_state_editor':
          openStoryStateEditor()
          return
        case 'open_story_assets':
          openStoryAssetsWorkspace()
          return
        case 'open_outline_tree':
          setOutlineTreeOpen(true)
          return
        case 'edit_chapter': {
          const chapter = sortedChapters.find((item: any) => Number(item.id) === Number(targetChapterId || activeChapter?.id || 0)) || activeChapter
          if (!chapter) {
            message.warning('无法定位需要编辑的章节')
            return
          }
          openEditor('chapter', chapter)
          return
        }
        default:
          if (!isNavigation) message.destroy(messageKey)
          return
      }
    } catch (error: any) {
      if (isNavigation) {
        message.error(error?.response?.data?.error || error?.message || `${spec.label || '操作'}失败`)
      } else {
        message.error({
          content: error?.response?.data?.error || error?.message || `${spec.label || '补齐材料'}失败`,
          key: messageKey,
          duration: 5,
        })
      }
    }
  }

  const buildGenerationPreflightRepairActions = (payload: any, options: { targetChapterId?: number; onRepairComplete?: () => void; closeModal?: () => void } = {}): GenerationPreflightRepairAction[] => {
    const specs = buildGenerationPreflightRepairActionSpecs(payload, {
      includeContinueRepairAll: Boolean(options.onRepairComplete),
    })
    return specs.map(spec => ({
      key: spec.key,
      label: spec.label,
      description: spec.reason ? `${spec.description}（对应：${spec.reason}）` : spec.description,
      modelCall: spec.modelCall,
      primary: Boolean(spec.primary),
      run: () => runGenerationPreflightRepairSpec(payload, spec, options),
    }))
  }

  const renderGenerationPreflightRepairActions = (actions: GenerationPreflightRepairAction[]) =>
    renderGenerationPreflightRepairActionsView(actions)

  const renderPreflightModalContent = (payload: any, repairActions: GenerationPreflightRepairAction[] = []) =>
    renderPreflightModalContentView(payload, repairActions)

  const showGenerationBlockedModal = (payload: any, onContinue?: () => void, options: { targetChapterId?: number; onRepairComplete?: () => void } = {}) => {
    const isSafetyBlocked = payload?.error_code === 'REFERENCE_SAFETY_BLOCKED'
    let modalRef: ReturnType<typeof Modal.confirm> | null = null
    const closeModal = () => { modalRef?.destroy() }
    const repairActions = isSafetyBlocked ? [] : buildGenerationPreflightRepairActions(payload, { ...options, closeModal })
    modalRef = Modal.confirm({
      title: isSafetyBlocked ? '仿写安全门槛未通过' : '章节生成前置检查未通过',
      width: 820,
      icon: null,
      content: renderPreflightModalContent(payload, repairActions),
      okText: onContinue && !isSafetyBlocked ? '允许缺材料继续' : '知道了',
      cancelText: '关闭',
      okButtonProps: isSafetyBlocked ? { danger: true } : undefined,
      onOk: () => {
        if (onContinue && !isSafetyBlocked) onContinue()
      },
    })
  }

  const showDiagnosticsModal = (diagnostics: any) => {
    Modal.info({
      title: '生成前诊断',
      width: 820,
      content: renderDiagnosticsModalContentView(diagnostics),
    })
  }

  const showCommercialReadinessModal = (readiness: any) => {
    Modal.info({
      title: '商业化就绪度',
      width: 860,
      content: renderCommercialReadinessModalContentView(readiness),
    })
  }


  return {
    generationPreflightChecks,
    repairGenerationPreflightGaps,
    runGenerationPreflightRepairSpec,
    buildGenerationPreflightRepairActions,
    renderGenerationPreflightRepairActions,
    renderPreflightModalContent,
    showGenerationBlockedModal,
    showDiagnosticsModal,
    showCommercialReadinessModal,
  }
}
