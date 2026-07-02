export type SerialPipelineAction = {
  key: string
  label: string
  workspace_area?: string
}

export type SerialPipelineAgentStep = {
  key: string
  label: string
  agent: string
  description: string
  actionKey: string
  workspaceArea?: string
}

export type SerialPipelineStageCard = {
  key: string
  label: string
  summary: string
  tone: 'done' | 'active' | 'blocked' | 'pending'
  statusLabel: string
  action: SerialPipelineAction
  blockerCount: number
  warningCount: number
  agentSteps: SerialPipelineAgentStep[]
  checks: Array<{
    key: string
    label: string
    status: string
    detail: string
  }>
}

export type SerialPipelineRepairGuide = {
  title: string
  severity: 'blocked' | 'warning' | 'active' | 'ready'
  blockerLabel: string
  reason: string
  repairAreaLabel: string
  repairActionLabel: string
  verificationLabel: string
}

export type SerialPipelineViewModel = {
  visible: boolean
  currentStageKey: string
  currentStageLabel: string
  summary: string
  primaryAction: SerialPipelineAction
  repairGuide: SerialPipelineRepairGuide | null
  currentIssues: Array<{
    label: string
    status: string
    detail: string
  }>
  currentAgentSteps: SerialPipelineAgentStep[]
  stageCards: SerialPipelineStageCard[]
}

function statusLabel(status: string) {
  if (status === 'done') return '已完成'
  if (status === 'active') return '当前步骤'
  if (status === 'blocked') return '需处理'
  return '待进行'
}

function tone(status: string): SerialPipelineStageCard['tone'] {
  if (status === 'done' || status === 'active' || status === 'blocked') return status
  return 'pending'
}

function action(value: any): SerialPipelineAction {
  return {
    key: String(value?.key || ''),
    label: String(value?.label || ''),
    workspace_area: value?.workspace_area ? String(value.workspace_area) : undefined,
  }
}

function agentStep(value: any): SerialPipelineAgentStep {
  return {
    key: String(value?.key || ''),
    label: String(value?.label || ''),
    agent: String(value?.agent || ''),
    description: String(value?.description || ''),
    actionKey: String(value?.action_key || value?.actionKey || ''),
    workspaceArea: value?.workspace_area || value?.workspaceArea ? String(value.workspace_area || value.workspaceArea) : undefined,
  }
}

export function buildSerialPipelineViewModel(pipeline: any): SerialPipelineViewModel {
  if (!pipeline || !Array.isArray(pipeline.stages)) {
    return {
      visible: false,
      currentStageKey: '',
      currentStageLabel: '',
      summary: '',
      primaryAction: { key: '', label: '' },
      repairGuide: null,
      currentIssues: [],
      currentAgentSteps: [],
      stageCards: [],
    }
  }

  const stageCards = pipeline.stages.map((stage: any): SerialPipelineStageCard => {
    const checks = Array.isArray(stage?.checks) ? stage.checks : []
    const agentSteps = Array.isArray(stage?.agent_steps) ? stage.agent_steps : []
    return {
      key: String(stage?.key || ''),
      label: String(stage?.label || ''),
      summary: String(stage?.summary || ''),
      tone: tone(String(stage?.status || 'pending')),
      statusLabel: statusLabel(String(stage?.status || 'pending')),
      action: action(stage?.action),
      blockerCount: checks.filter((check: any) => String(check?.status || '') === 'blocked').length,
      warningCount: checks.filter((check: any) => String(check?.status || '') === 'warning').length,
      agentSteps: agentSteps.map(agentStep).filter(step => step.key || step.label),
      checks: checks.map((check: any) => ({
        key: String(check?.key || ''),
        label: String(check?.label || ''),
        status: String(check?.status || ''),
        detail: String(check?.detail || ''),
      })),
    }
  })
  const currentStageKey = String(pipeline.current_stage || '')
  const currentStage = stageCards.find(stage => stage.key === currentStageKey) || stageCards.find(stage => stage.tone === 'active' || stage.tone === 'blocked') || null
  const primaryAction = action(pipeline.primary_action || currentStage?.action)
  const currentIssues = (currentStage?.checks || [])
    .filter(check => check.status === 'blocked' || check.status === 'warning')
    .slice(0, 3)
    .map(check => ({ label: check.label, status: check.status, detail: check.detail }))

  return {
    visible: stageCards.length > 0,
    currentStageKey,
    currentStageLabel: currentStage?.label || '',
    summary: String(pipeline.summary || currentStage?.summary || ''),
    primaryAction,
    repairGuide: buildRepairGuide(currentStage, currentIssues, primaryAction),
    currentIssues,
    currentAgentSteps: (currentStage?.agentSteps || []).slice(0, 4),
    stageCards,
  }
}

function workspaceAreaLabel(area?: string) {
  const labels: Record<string, string> = {
    autoCreation: '自动创作',
    storyPlanning: '故事规划',
    chapterWriting: '章节写作',
    storyAssets: '设定资产',
    qualityRevision: '质检修订',
    productionOps: '生产运营',
  }
  return area ? labels[area] || area : '当前工作区'
}

function verificationLabel(stageKey: string) {
  const labels: Record<string, string> = {
    creation_contract: '写作圣经和创建契约补齐后，回到流水线确认创建契约已完成。',
    planning_ready: '章节计划、世界锚点和人物锚点补齐后，回到流水线确认规划就绪。',
    chapter_writing: '任务书、场景卡和正文生成后，回到流水线进入交稿验收。',
    delivery_acceptance: '复检、修订和状态同步完成后，回到流水线确认交稿验收通过。',
    batch_scaling: '任务中心没有失败批次或未关闭修复项后，再回到流水线放大批次。',
    serial_governance: '治理任务和趋势复盘闭环后，回到流水线确认长线治理稳定。',
  }
  return labels[stageKey] || '处理完成后，回到流水线确认当前阶段不再阻塞。'
}

function buildRepairGuide(
  currentStage: SerialPipelineStageCard | null,
  currentIssues: SerialPipelineViewModel['currentIssues'],
  primaryAction: SerialPipelineAction,
): SerialPipelineRepairGuide | null {
  if (!currentStage) return null
  const primaryIssue = currentIssues[0] || null
  const severity: SerialPipelineRepairGuide['severity'] = primaryIssue?.status === 'blocked'
    ? 'blocked'
    : primaryIssue?.status === 'warning'
      ? 'warning'
      : currentStage.tone === 'done'
        ? 'ready'
        : 'active'
  return {
    title: severity === 'ready' ? '当前阶段已完成' : '当前阻塞修复向导',
    severity,
    blockerLabel: primaryIssue ? `${currentStage.label}：${primaryIssue.label}` : currentStage.label,
    reason: primaryIssue?.detail || currentStage.summary || '按当前流水线阶段继续推进。',
    repairAreaLabel: workspaceAreaLabel(primaryAction.workspace_area || currentStage.action.workspace_area),
    repairActionLabel: primaryAction.label || currentStage.action.label || '查看下一步',
    verificationLabel: verificationLabel(currentStage.key),
  }
}
