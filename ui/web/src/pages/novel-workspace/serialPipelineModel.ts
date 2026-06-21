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

export type SerialPipelineViewModel = {
  visible: boolean
  currentStageKey: string
  currentStageLabel: string
  summary: string
  primaryAction: SerialPipelineAction
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

  return {
    visible: stageCards.length > 0,
    currentStageKey,
    currentStageLabel: currentStage?.label || '',
    summary: String(pipeline.summary || currentStage?.summary || ''),
    primaryAction: action(pipeline.primary_action || currentStage?.action),
    currentIssues: (currentStage?.checks || [])
      .filter(check => check.status === 'blocked' || check.status === 'warning')
      .slice(0, 3)
      .map(check => ({ label: check.label, status: check.status, detail: check.detail })),
    currentAgentSteps: (currentStage?.agentSteps || []).slice(0, 4),
    stageCards,
  }
}
