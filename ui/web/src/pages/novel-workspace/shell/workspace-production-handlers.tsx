import { List, message, Modal } from 'antd'
import { chapterHasProse } from '../utils'
import { renderProductionDashboardContentView } from './workspace-commercial-result'
import {
  renderOriginalIncubationEmptyErrorContentView,
  renderOriginalIncubationPreviewContentView,
} from './workspace-incubator-views'

export type ProductionHandlerDeps = {
  activeChapter: any
  apiClient: any
  chapterWordTargetPayload: any
  loadProductionTasks: any
  loadProjectModules: any
  productionMode: any
  projectId: any
  selectChapterForWriting: any
  selectedModelId: any
  selectedProject: any
  setCommercialReadiness: any
  setCommercialToolLoading: any
  setDashboardLoading: any
  setIncubatingOriginal: any
  setRightPanelOpen: any
  setRightPanelTab: any
  setTaskCenterOpen: any
  sortedChapters: any
  unattendedTargetChapter: any
}

export function createProductionHandlers(deps: ProductionHandlerDeps) {
  const activeChapter = deps.activeChapter
  const apiClient = deps.apiClient
  const chapterWordTargetPayload = deps.chapterWordTargetPayload
  const loadProductionTasks = deps.loadProductionTasks
  const loadProjectModules = deps.loadProjectModules
  const productionMode = deps.productionMode
  const projectId = deps.projectId
  const selectChapterForWriting = deps.selectChapterForWriting
  const selectedModelId = deps.selectedModelId
  const selectedProject = deps.selectedProject
  const setCommercialReadiness = deps.setCommercialReadiness
  const setCommercialToolLoading = deps.setCommercialToolLoading
  const setDashboardLoading = deps.setDashboardLoading
  const setIncubatingOriginal = deps.setIncubatingOriginal
  const setRightPanelOpen = deps.setRightPanelOpen
  const setRightPanelTab = deps.setRightPanelTab
  const setTaskCenterOpen = deps.setTaskCenterOpen
  const sortedChapters = deps.sortedChapters
  const unattendedTargetChapter = deps.unattendedTargetChapter

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
        content: renderProductionDashboardContentView({
          dashboard,
          readiness,
          governance,
          materialMatrix,
          assets,
          strategy,
        }, {
          onOpenChapter: (chapterId) => { Modal.destroyAll(); void selectChapterForWriting(chapterId) },
        }),
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
              content: renderOriginalIncubationEmptyErrorContentView({
                error: '模型返回了空方案，系统已阻止入库。请重试、切换模型，或先补充项目简介/题材/目标读者。',
                raw_preview: res.data?.raw_preview,
              }),
            })
            return
          }
          Modal.confirm({
            title: '确认原创孵化方案',
            width: 860,
            content: renderOriginalIncubationPreviewContentView(payload),
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
              content: renderOriginalIncubationEmptyErrorContentView(data),
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
    const startChapter = Number(activeChapter?.chapter_no || sortedChapters.find((chapter: any) => !chapterHasProse(chapter))?.chapter_no || 1)
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


  return {
    openProductionDashboard,
    runOriginalIncubator,
    startChapterGroupGeneration,
    startReadyChapterGroupGeneration,
    startFuture100ChapterGroupGeneration,
    startUnattendedWritingGoal,
  }
}
