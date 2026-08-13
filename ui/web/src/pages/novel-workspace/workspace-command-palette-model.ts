/** 命令面板纯模型:聚合工作流动作与工作台入口,可过滤。渲染与快捷键在组件层。 */
import type { ChapterWorkflowPresenter } from './chapter-workflow-presenter'

export type WorkspaceCommand = {
  key: string
  label: string
  hint?: string
  section: '章节行动' | '面板' | '编辑器'
  keywords?: string[]
  run: () => void
}

export type WorkspaceCommandContext = {
  presenter?: ChapterWorkflowPresenter | null
  runWorkflowAction: (key: string) => void
  openFindReplace?: () => void
  openVersions?: () => void
  openQuality?: () => void
  openBrief?: () => void
  toggleAux?: () => void
  auxCollapsed?: boolean
}

export function buildWorkspaceCommands(ctx: WorkspaceCommandContext): WorkspaceCommand[] {
  const commands: WorkspaceCommand[] = []
  const presenter = ctx.presenter

  if (presenter) {
    commands.push({
      key: `primary:${presenter.primaryAction.key}`,
      label: presenter.primaryAction.label,
      hint: '主行动 ⌘↩',
      section: '章节行动',
      keywords: ['primary', '推荐', '下一步'],
      run: () => ctx.runWorkflowAction(presenter.primaryAction.key),
    })
    for (const action of presenter.secondaryActions) {
      commands.push({
        key: `secondary:${action.key}`,
        label: action.label,
        section: '章节行动',
        run: () => ctx.runWorkflowAction(action.key),
      })
    }
  }

  if (ctx.openFindReplace) {
    commands.push({
      key: 'editor:find',
      label: '查找替换',
      hint: '⌘F',
      section: '编辑器',
      keywords: ['find', 'replace', 'search', '搜索'],
      run: ctx.openFindReplace,
    })
  }
  if (ctx.openVersions) {
    commands.push({
      key: 'panel:versions',
      label: '版本历史',
      section: '面板',
      keywords: ['version', 'history', '回滚'],
      run: ctx.openVersions,
    })
  }
  if (ctx.openQuality) {
    commands.push({
      key: 'panel:quality',
      label: '质检面板',
      section: '面板',
      keywords: ['quality', '复检', '修订'],
      run: ctx.openQuality,
    })
  }
  if (ctx.openBrief) {
    commands.push({
      key: 'panel:brief',
      label: '章节任务书',
      section: '面板',
      keywords: ['brief', '交接', '要点'],
      run: ctx.openBrief,
    })
  }
  if (ctx.toggleAux) {
    commands.push({
      key: 'panel:aux',
      label: ctx.auxCollapsed ? '展开辅助面板' : '收起辅助面板',
      section: '面板',
      keywords: ['aux', '详情', '队列'],
      run: ctx.toggleAux,
    })
  }

  return commands
}

export function filterWorkspaceCommands(commands: WorkspaceCommand[], query: string): WorkspaceCommand[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return commands
  return commands.filter(command => {
    if (command.label.toLowerCase().includes(normalized)) return true
    return (command.keywords || []).some(keyword => keyword.toLowerCase().includes(normalized))
  })
}
