import React, { useState } from 'react'
import { Badge, Button, Dropdown, Select, Tag, Tooltip, Typography } from 'antd'
import {
  ArrowLeftOutlined,
  BulbOutlined,
  ClockCircleOutlined,
  ControlOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  MoreOutlined,
  ReloadOutlined,
  RocketOutlined,
  SafetyOutlined,
  SettingOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { ProjectSettingsModal } from '../ProjectSettingsModal'
import {
  primaryTabForArea,
  WORKSPACE_TOOL_MENU_DEFS,
  type WorkspacePrimaryArea,
} from './workspace-core-area'
import type { WorkspaceArea } from './workspace-types'

const { Title } = Typography

export type NovelWorkspaceTopBarProps = {
  activeKnowledgeJobCount: number
  activeTasks: any[]
  flushPendingSave: () => Promise<boolean> | Promise<any> | boolean | any
  isImmersiveShell: boolean
  loadProjectModules: () => Promise<any> | any
  modelOptions: any[]
  navigate: (path: string) => void
  openCreativeAssistant: () => void
  referenceSummary: { count: number; strengthLabel?: string }
  selectedModelId: any
  selectedProject: any
  setSelectedModelId: (id: any) => void
  setShellMode: (mode: any) => void
  setTaskCenterOpen: (open: boolean) => void
  setWorkspaceArea: (area: any) => void
  workspaceArea: any
  workspaceAreaTabs: Array<{ key: any; label: any; icon?: any }>
}

function toolIcon(key: string) {
  if (key === 'autoCreation') return <ControlOutlined />
  if (key === 'productionOps') return <RocketOutlined />
  if (key === 'qualityRevision') return <SafetyOutlined />
  return <ToolOutlined />
}

export function NovelWorkspaceTopBar(props: NovelWorkspaceTopBarProps) {
  const {
    activeKnowledgeJobCount,
    activeTasks,
    flushPendingSave,
    isImmersiveShell,
    loadProjectModules,
    modelOptions,
    navigate,
    openCreativeAssistant,
    referenceSummary,
    selectedModelId,
    selectedProject,
    setSelectedModelId,
    setShellMode,
    setTaskCenterOpen,
    setWorkspaceArea,
    workspaceArea,
    workspaceAreaTabs,
  } = props

  const [projectSettingsOpen, setProjectSettingsOpen] = useState(false)
  const activePrimary = primaryTabForArea(workspaceArea as WorkspaceArea)
  const moreMenuItems = [
    {
      type: 'group' as const,
      label: '写作工具',
      children: [
        {
          key: 'assistant',
          icon: <BulbOutlined />,
          label: '创作参谋',
          onClick: () => openCreativeAssistant(),
        },
      ],
    },
    {
      type: 'group' as const,
      label: '生产与自动化',
      children: WORKSPACE_TOOL_MENU_DEFS
        .filter(item => item.group === '生产与自动化')
        .map(item => ({
          key: item.key,
          icon: toolIcon(item.key),
          label: item.label,
          onClick: () => setWorkspaceArea(item.key),
        })),
    },
    {
      type: 'group' as const,
      label: '诊断',
      children: WORKSPACE_TOOL_MENU_DEFS
        .filter(item => item.group === '诊断')
        .map(item => ({
          key: item.key,
          icon: toolIcon(item.key),
          label: item.label,
          onClick: () => setWorkspaceArea(item.key),
        })),
    },
    {
      key: 'projectSettings',
      icon: <SettingOutlined />,
      label: '项目设置',
      onClick: () => setProjectSettingsOpen(true),
    },
    { type: 'divider' as const },
    {
      key: 'refresh',
      icon: <ReloadOutlined />,
      label: '刷新项目数据',
      onClick: async () => {
        if (await flushPendingSave()) await loadProjectModules()
      },
    },
  ]

  return (
    <>
      <div className="novel-workspace-topbar">
        <div className="novel-workspace-topbar-left">
          <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate('/novel')} />
          <Title level={5} className="novel-workspace-title">
            {selectedProject?.title || '小说项目工作台'}
          </Title>
        </div>

        <div className="novel-workspace-topbar-center">
          <div className="novel-workspace-area-tabs" role="tablist" aria-label="工作区">
            {workspaceAreaTabs.map(tab => {
              const selected = activePrimary === tab.key
              return (
                <Button
                  key={tab.key}
                  size="small"
                  type="text"
                  icon={tab.icon}
                  role="tab"
                  aria-selected={selected}
                  className={`novel-mode-tab novel-mode-tab-${tab.key} ${selected ? 'is-active' : ''}`}
                  onClick={() => setWorkspaceArea(tab.key as WorkspacePrimaryArea)}
                >
                  <span className="novel-mode-tab-label">{tab.label}</span>
                </Button>
              )
            })}
          </div>
        </div>

        <div className="novel-workspace-topbar-right">
          {!isImmersiveShell && (
            <>
              <Select
                className="novel-workspace-model-select"
                size="small"
                value={selectedModelId}
                onChange={(v) => setSelectedModelId(v)}
                options={modelOptions}
                popupMatchSelectWidth={440}
                placeholder="选择模型"
              />
              {referenceSummary.count > 0 && (
                <Tag className="novel-workspace-topbar-meta" color="purple" bordered={false}>
                  {referenceSummary.strengthLabel} · {referenceSummary.count} 部参考
                </Tag>
              )}
            </>
          )}

          {workspaceArea === 'chapterWriting' && (
            <Button
              className="novel-workspace-shell-toggle"
              type={isImmersiveShell ? 'default' : 'primary'}
              size="small"
              icon={isImmersiveShell ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={() => setShellMode(isImmersiveShell ? 'workbench' : 'immersive')}
            >
              {isImmersiveShell ? '展开工作台' : '沉浸写作'}
            </Button>
          )}

          <Tooltip title="查看运行中任务和历史运行记录">
            <Badge className="novel-workspace-task-entry" count={activeTasks.length + activeKnowledgeJobCount} size="small">
              <Button type="text" size="small" icon={<ClockCircleOutlined />} onClick={() => setTaskCenterOpen(true)}>
                任务
              </Button>
            </Badge>
          </Tooltip>

          <Dropdown menu={{ items: moreMenuItems as any }} trigger={['click']}>
            <Button type="text" size="small" className="novel-workspace-topbar-more" icon={<MoreOutlined />}>
              更多
            </Button>
          </Dropdown>
        </div>
      </div>
      <ProjectSettingsModal
        open={projectSettingsOpen}
        projectId={Number(selectedProject?.id || 0)}
        onClose={() => setProjectSettingsOpen(false)}
      />
    </>
  )
}
