import { message } from 'antd'
import {
  normalizeCreativeAssistPayload,
  type CreativeAssistCard,
  type CreativeAssistantModeKey,
} from '../creativeAssistantModel'

export type CreativeHandlerDeps = {
  activeChapter: any
  apiClient: any
  backupImportText: any
  creativeAssistantSelectedText: any
  creativeCommandText: any
  loadProductionTasks: any
  loadProjectModules: any
  navigate: any
  projectId: any
  selectedModelId: any
  setBackupImportOpen: any
  setBackupImportText: any
  setCommercialToolLoading: any
  setCreativeAssistantError: any
  setCreativeAssistantLoading: any
  setCreativeAssistantOpen: any
  setCreativeAssistantResult: any
  setCreativeAssistantSelectedText: any
  setCreativeCommandPlan: any
}

export function createCreativeHandlers(deps: CreativeHandlerDeps) {
  const activeChapter = deps.activeChapter
  const apiClient = deps.apiClient
  const backupImportText = deps.backupImportText
  const creativeAssistantSelectedText = deps.creativeAssistantSelectedText
  const creativeCommandText = deps.creativeCommandText
  const loadProductionTasks = deps.loadProductionTasks
  const loadProjectModules = deps.loadProjectModules
  const navigate = deps.navigate
  const projectId = deps.projectId
  const selectedModelId = deps.selectedModelId
  const setBackupImportOpen = deps.setBackupImportOpen
  const setBackupImportText = deps.setBackupImportText
  const setCommercialToolLoading = deps.setCommercialToolLoading
  const setCreativeAssistantError = deps.setCreativeAssistantError
  const setCreativeAssistantLoading = deps.setCreativeAssistantLoading
  const setCreativeAssistantOpen = deps.setCreativeAssistantOpen
  const setCreativeAssistantResult = deps.setCreativeAssistantResult
  const setCreativeAssistantSelectedText = deps.setCreativeAssistantSelectedText
  const setCreativeCommandPlan = deps.setCreativeCommandPlan

  const downloadBackupPackage = () => {
    const baseURL = String(apiClient.defaults.baseURL || '').replace(/\/$/, '')
    const link = document.createElement('a')
    link.href = `${baseURL}/novel/projects/${projectId}/backup-package`
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const importBackupPackage = async () => {
    if (!backupImportText.trim()) return message.warning('请粘贴项目备份 JSON')
    setCommercialToolLoading('backupImport')
    try {
      const backup = JSON.parse(backupImportText)
      const res = await apiClient.post('/novel/backup-package/import', { package: backup })
      const project = res.data?.project
      message.success(`已导入项目：${project?.title || project?.id || ''}`)
      setBackupImportOpen(false)
      setBackupImportText('')
      if (project?.id) navigate(`/novel/workspace/${project.id}`)
    } catch (error: any) {
      message.error(error?.message?.includes('JSON') ? '备份内容必须是合法 JSON' : (error?.response?.data?.error || error?.message || '导入备份失败'))
    } finally {
      setCommercialToolLoading('')
    }
  }

  const runCreativeCommand = async (execute = false) => {
    if (!creativeCommandText.trim()) return message.warning('请输入创作指令')
    setCommercialToolLoading('creativeCommand')
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/creative-command`, {
        command: creativeCommandText,
        execute,
      })
      setCreativeCommandPlan(res.data || null)
      await loadProductionTasks()
      if (execute) await loadProjectModules()
      message.success(execute ? '指令已执行可安全执行的部分' : '指令已解析')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '创作指令处理失败')
    } finally {
      setCommercialToolLoading('')
    }
  }

  const openCreativeAssistant = () => {
    const selection = typeof window !== 'undefined' ? window.getSelection()?.toString() || '' : ''
    setCreativeAssistantSelectedText(selection.trim())
    setCreativeAssistantOpen(true)
  }

  const copyCreativeAssistantCard = async (card: CreativeAssistCard) => {
    const content = [
      card.title,
      card.intent ? `目的：${card.intent}` : '',
      card.reason ? `依据：${card.reason}` : '',
      card.suggestion ? `建议：${card.suggestion}` : '',
      card.risk ? `风险：${card.risk}` : '',
    ].filter(Boolean).join('\n')
    try {
      await navigator.clipboard?.writeText(content)
      message.success('建议卡已复制')
    } catch {
      message.info(content)
    }
  }

  const runCreativeAssistant = async (input: { mode: CreativeAssistantModeKey; question: string; researchQuery: string }) => {
    setCreativeAssistantLoading(true)
    setCreativeAssistantError('')
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/creative-assist`, {
        mode: input.mode,
        chapter_id: activeChapter?.id,
        selected_text: creativeAssistantSelectedText,
        question: input.question,
        research_query: input.researchQuery,
        model_id: selectedModelId,
        save: true,
      })
      setCreativeAssistantResult(normalizeCreativeAssistPayload(res.data?.assist || res.data))
      if (res.data?.review) await loadProjectModules()
      message.success('创作参谋建议已生成')
    } catch (error: any) {
      setCreativeAssistantError(error?.response?.data?.error || error?.message || '创作参谋调用失败')
    } finally {
      setCreativeAssistantLoading(false)
    }
  }


  return {
    downloadBackupPackage,
    importBackupPackage,
    runCreativeCommand,
    openCreativeAssistant,
    copyCreativeAssistantCard,
    runCreativeAssistant,
  }
}
