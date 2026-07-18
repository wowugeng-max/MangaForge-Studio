import React from 'react'
import { Badge, Button, Dropdown, Select, Tag, Tooltip, Typography } from 'antd'
import {
  ArrowLeftOutlined,
  BulbOutlined,
  ClockCircleOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  MoreOutlined,
  ReloadOutlined,
  RocketOutlined,
} from '@ant-design/icons'

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

  return (
    <>
      {/* ═══ TOP BAR ═══ */}
      <div className="novel-workspace-topbar">
        <div className="novel-workspace-topbar-left">
          <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate('/novel')} />
          <Title level={5} className="novel-workspace-title">
            {selectedProject?.title || '小说项目工作台'}
          </Title>
        </div>

        <div className="novel-workspace-topbar-center">
          <div className="novel-workspace-area-tabs" role="tablist" aria-label="工作区">
            {workspaceAreaTabs.map(tab => (
              <Button
                key={tab.key}
                size="small"
                type="text"
                icon={tab.icon}
                role="tab"
                aria-selected={workspaceArea === tab.key}
                className={`novel-mode-tab novel-mode-tab-${tab.key} ${workspaceArea === tab.key ? 'is-active' : ''}`}
                onClick={() => setWorkspaceArea(tab.key)}
              >
                <span className="novel-mode-tab-label">{tab.label}</span>
              </Button>
            ))}
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
              <Tooltip title="进入无人值守生产入口">
                <Button
                  className={`novel-unattended-topbar-entry ${workspaceArea === 'productionOps' ? 'is-active' : ''}`}
                  size="small"
                  icon={<RocketOutlined />}
                  onClick={() => setWorkspaceArea('productionOps')}
                >
                  无人值守
                </Button>
              </Tooltip>
              <Tooltip title="打开当前节点的创作参谋建议">
                <Button type="text" size="small" icon={<BulbOutlined />} onClick={openCreativeAssistant}>
                  创作参谋
                </Button>
              </Tooltip>
              <Tooltip title="刷新">
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={async () => { if (await flushPendingSave()) await loadProjectModules() }}
                />
              </Tooltip>
            </>
          )}

          {isImmersiveShell && (
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'model',
                    label: (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select
                          className="novel-workspace-model-select novel-workspace-model-select-menu"
                          size="small"
                          value={selectedModelId}
                          onChange={(v) => setSelectedModelId(v)}
                          options={modelOptions}
                          popupMatchSelectWidth={440}
                          placeholder="选择模型"
                          style={{ width: 200 }}
                        />
                      </div>
                    ),
                  },
                  {
                    key: 'assistant',
                    icon: <BulbOutlined />,
                    label: '创作参谋',
                    onClick: () => openCreativeAssistant(),
                  },
                  {
                    key: 'unattended',
                    icon: <RocketOutlined />,
                    label: '无人值守',
                    onClick: () => setWorkspaceArea('productionOps'),
                  },
                  {
                    key: 'refresh',
                    icon: <ReloadOutlined />,
                    label: '刷新',
                    onClick: async () => { if (await flushPendingSave()) await loadProjectModules() },
                  },
                ],
              }}
              trigger={['click']}
            >
              <Button type="text" size="small" className="novel-workspace-topbar-more" icon={<MoreOutlined />}>
                更多
              </Button>
            </Dropdown>
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
                任务中心
              </Button>
            </Badge>
          </Tooltip>
        </div>
      </div>


    </>
  )
}
