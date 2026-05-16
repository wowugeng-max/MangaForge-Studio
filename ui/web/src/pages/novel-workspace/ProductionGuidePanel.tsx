import React from 'react'
import { Button, Progress, Space, Tag, Tooltip, Typography } from 'antd'
import {
  BookOutlined,
  CheckCircleOutlined,
  ClusterOutlined,
  ExperimentOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  SafetyOutlined,
  StopOutlined,
} from '@ant-design/icons'

const { Text } = Typography

type GuideStepStatus = 'done' | 'active' | 'blocked' | 'pending'

type GuideStep = {
  no: number
  title: string
  desc: string
  status: GuideStepStatus
  statusText: string
  primaryLabel: string
  primaryLoading?: boolean
  primaryDisabled?: boolean
  primaryIcon?: React.ReactNode
  onPrimary: () => void
  secondary?: Array<{
    label: string
    loading?: boolean
    disabled?: boolean
    onClick: () => void
  }>
}

function statusColor(status: GuideStepStatus) {
  if (status === 'done') return 'green'
  if (status === 'active') return 'blue'
  if (status === 'blocked') return 'red'
  return 'default'
}

function stepBorder(status: GuideStepStatus) {
  if (status === 'done') return '#b7eb8f'
  if (status === 'active') return '#91caff'
  if (status === 'blocked') return '#ffccc7'
  return '#edf0f5'
}

export function ProductionGuidePanel({
  selectedModelId,
  stepOutlineLoading,
  stepProseLoading,
  stepRepairLoading,
  incubatingOriginal,
  bookReviewLoading,
  commercialToolLoading,
  proseProgress,
  chapterCount,
  proseChapterCount,
  referenceCount,
  outlineCount,
  worldbuildingCount,
  characterCount,
  hasWritingBible,
  materialScore,
  commercialReadiness,
  activeTaskCount,
  onOpenOutlinePanel,
  onGenerateProse,
  onCancelGenerateProse,
  onRunRepair,
  onOpenReferenceConfig,
  onOpenReferenceEngineering,
  onOpenCreativeCards,
  onRunOriginalIncubator,
  onOpenWritingBibleEditor,
  onOpenMaterialRepairPlan,
  onStartReadyChapterGroupGeneration,
  onStartChapterGroupGeneration,
  onOpenProductionDesk,
  onOpenTaskCenter,
  onOpenConsistencyGraph,
  onOpenQualityBenchmark,
  onRunBookReview,
  onOpenCommercialTools,
  onOpenExportDelivery,
}: {
  selectedModelId?: number
  stepOutlineLoading: boolean
  stepProseLoading: boolean
  stepRepairLoading: boolean
  incubatingOriginal: boolean
  bookReviewLoading: boolean
  commercialToolLoading: string
  proseProgress: { current: number; total: number }
  chapterCount: number
  proseChapterCount: number
  referenceCount: number
  outlineCount: number
  worldbuildingCount: number
  characterCount: number
  hasWritingBible: boolean
  materialScore?: any
  commercialReadiness?: any
  activeTaskCount: number
  onOpenOutlinePanel: () => void
  onGenerateProse: () => void
  onCancelGenerateProse: () => void
  onRunRepair: () => void
  onOpenReferenceConfig: () => void
  onOpenReferenceEngineering: () => void
  onOpenCreativeCards: () => void
  onRunOriginalIncubator: () => void
  onOpenWritingBibleEditor: () => void
  onOpenMaterialRepairPlan: () => void
  onStartReadyChapterGroupGeneration: () => void
  onStartChapterGroupGeneration: () => void
  onOpenProductionDesk: () => void
  onOpenTaskCenter: () => void
  onOpenConsistencyGraph: () => void
  onOpenQualityBenchmark: () => void
  onRunBookReview: () => void
  onOpenCommercialTools: () => void
  onOpenExportDelivery: () => void
}) {
  const materialNumericScore = Number(materialScore?.score ?? commercialReadiness?.score ?? 0)
  const hasCoreMaterials = hasWritingBible || referenceCount > 0 || worldbuildingCount > 0 || characterCount > 0
  const hasPlan = chapterCount > 0 && (outlineCount > 0 || chapterCount >= 3)
  const materialReady = Boolean(materialScore?.can_generate) || materialNumericScore >= 70 || (hasCoreMaterials && hasPlan)
  const allWritten = chapterCount > 0 && proseChapterCount >= chapterCount

  const steps: GuideStep[] = [
    {
      no: 1,
      title: '准备资料',
      desc: '选择原创或参考路线，锁定写作圣经和可迁移知识。',
      status: hasCoreMaterials ? 'done' : 'active',
      statusText: hasCoreMaterials ? '已建立资料底座' : '先确定创作路线',
      primaryLabel: hasCoreMaterials ? '查看写作圣经' : '原创孵化',
      primaryLoading: incubatingOriginal,
      primaryIcon: hasCoreMaterials ? <BookOutlined /> : <ExperimentOutlined />,
      onPrimary: hasCoreMaterials ? onOpenWritingBibleEditor : onRunOriginalIncubator,
      secondary: [
        { label: `参考${referenceCount ? ` ${referenceCount}` : ''}`, onClick: onOpenReferenceConfig },
        { label: '参考工程', onClick: onOpenReferenceEngineering },
        { label: '资料卡', onClick: onOpenCreativeCards },
      ],
    },
    {
      no: 2,
      title: '规划章节',
      desc: '生成全书大纲、分卷目标、章节目录和细纲。',
      status: hasPlan ? 'done' : selectedModelId ? 'active' : 'blocked',
      statusText: hasPlan ? `${chapterCount} 章已规划` : selectedModelId ? '等待生成大纲' : '先选择模型',
      primaryLabel: '生成大纲 / 细纲',
      primaryLoading: stepOutlineLoading,
      primaryDisabled: !selectedModelId,
      primaryIcon: <ClusterOutlined />,
      onPrimary: onOpenOutlinePanel,
    },
    {
      no: 3,
      title: '补齐材料',
      desc: '检查章节目标、角色状态、上章钩子和参考知识缺口。',
      status: materialReady ? 'done' : hasPlan ? 'active' : 'pending',
      statusText: materialScore?.score !== undefined ? `材料 ${materialScore.score}%` : materialReady ? '材料可用' : '等待章节规划',
      primaryLabel: '材料补齐计划',
      primaryLoading: commercialToolLoading === 'materialRepair',
      primaryDisabled: !hasPlan,
      primaryIcon: <FileSearchOutlined />,
      onPrimary: onOpenMaterialRepairPlan,
    },
    {
      no: 4,
      title: '生产正文',
      desc: '从场景卡、初稿、自检、修订到入库，支持批量和任务恢复。',
      status: allWritten ? 'done' : proseChapterCount > 0 || stepProseLoading ? 'active' : hasPlan ? 'active' : 'pending',
      statusText: chapterCount > 0 ? `已写 ${proseChapterCount}/${chapterCount}` : '暂无章节',
      primaryLabel: '进入生产台',
      primaryIcon: <PlayCircleOutlined />,
      onPrimary: onOpenProductionDesk,
      secondary: [
        { label: '批量正文', loading: stepProseLoading, disabled: !selectedModelId || !hasPlan, onClick: onGenerateProse },
        { label: '智能章节群', loading: commercialToolLoading === 'readyGroup', disabled: !selectedModelId || !hasPlan, onClick: onStartReadyChapterGroupGeneration },
        { label: '普通章节群', disabled: !selectedModelId || !hasPlan, onClick: onStartChapterGroupGeneration },
      ],
    },
    {
      no: 5,
      title: '质检修订',
      desc: '做连续性、质量卡、仿写安全和商业化检查。',
      status: proseChapterCount > 0 ? 'active' : 'pending',
      statusText: activeTaskCount > 0 ? `${activeTaskCount} 个任务进行中` : proseChapterCount > 0 ? '可质检' : '等待正文',
      primaryLabel: '任务中心',
      primaryIcon: <SafetyOutlined />,
      onPrimary: onOpenTaskCenter,
      secondary: [
        { label: '图谱', onClick: onOpenConsistencyGraph },
        { label: '质量', onClick: onOpenQualityBenchmark },
        { label: '连续性', loading: stepRepairLoading, disabled: !selectedModelId || proseChapterCount === 0, onClick: onRunRepair },
      ],
    },
    {
      no: 6,
      title: '交付导出',
      desc: '生成带交付报告的 TXT / Markdown 完整稿。',
      status: allWritten ? 'active' : proseChapterCount > 0 ? 'active' : 'pending',
      statusText: proseChapterCount > 0 ? `${proseChapterCount} 章可导出` : '等待正文',
      primaryLabel: '打开导出面板',
      primaryDisabled: chapterCount === 0,
      primaryIcon: <FileTextOutlined />,
      onPrimary: onOpenExportDelivery,
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ fontSize: 12, color: '#667085', fontWeight: 600 }}>小说生产向导</Text>
        {commercialReadiness?.score !== undefined && (
          <Tag
            color={commercialReadiness.can_batch_generate ? 'green' : Number(commercialReadiness.score || 0) >= 70 ? 'gold' : 'red'}
            bordered={false}
            style={{ marginRight: 0 }}
          >
            就绪 {commercialReadiness.score}%
          </Tag>
        )}
      </div>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        {steps.map(step => (
          <div
            key={step.no}
            style={{
              border: `1px solid ${stepBorder(step.status)}`,
              borderRadius: 8,
              padding: 10,
              background: step.status === 'active' ? '#fbfdff' : '#fff',
            }}
          >
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Tag color={statusColor(step.status)} bordered={false} style={{ marginRight: 0, minWidth: 24, textAlign: 'center' }}>
                  {step.status === 'done' ? <CheckCircleOutlined /> : step.no}
                </Tag>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <Text strong style={{ fontSize: 13 }}>{step.title}</Text>
                    <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{step.statusText}</Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.45 }}>{step.desc}</Text>
                </div>
              </div>
              <Tooltip title={step.primaryDisabled ? '请先完成前置步骤' : ''}>
                <Button
                  size="small"
                  block
                  type={step.status === 'active' ? 'primary' : 'default'}
                  icon={step.primaryIcon}
                  loading={step.primaryLoading}
                  disabled={step.primaryDisabled}
                  onClick={step.onPrimary}
                >
                  {step.primaryLabel}
                </Button>
              </Tooltip>
              {step.secondary && step.secondary.length > 0 && (
                <Space.Compact block>
                  {step.secondary.map(action => (
                    <Button
                      key={action.label}
                      size="small"
                      style={{ width: `${100 / step.secondary!.length}%` }}
                      loading={action.loading}
                      disabled={action.disabled}
                      onClick={action.onClick}
                    >
                      {action.label}
                    </Button>
                  ))}
                </Space.Compact>
              )}
            </Space>
          </div>
        ))}
      </Space>
      {proseProgress.current > 0 && (
        <div style={{ marginTop: 10 }}>
          <Progress
            percent={proseProgress.total > 0 ? Math.round(proseProgress.current / proseProgress.total * 100) : 0}
            size="small"
            format={() => `${proseProgress.current}/${proseProgress.total}`}
          />
          {stepProseLoading && (
            <Button
              size="small"
              danger
              block
              icon={<StopOutlined />}
              style={{ marginTop: 6 }}
              onClick={onCancelGenerateProse}
            >
              停止后续生成
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
