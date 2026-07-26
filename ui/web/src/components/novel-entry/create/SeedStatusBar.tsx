import React from 'react'
import { Alert, Button, Card, Space, Tag, Typography } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { STEP0_SECTION_TITLES } from './createWizardCopy'

const { Text } = Typography

export function SeedStatusBar(props: {
  volumeCount: number
  chapterCount: number
  foreshadowingCount: number
  characterCount: number
  score?: { overall: number; grade: string; statusLabel: string; recommendCreate: boolean }
  scoreSummary?: string
  topRisks?: string[]
  diagnosticsSuggestion?: string
  riskMessage?: string
  finalized?: boolean
  regenerating?: boolean
  savingDraft?: boolean
  finalizing?: boolean
  showDraftActions?: boolean
  showFinalize?: boolean
  foundationAccepted?: boolean
  showFoundationAccept?: boolean
  onAcceptFoundation?: () => void
  onClearFoundationAccept?: () => void
  fillingGaps?: boolean
  showFillGaps?: boolean
  onFillGaps?: () => void
  onRegenerate: () => void
  onSaveDraft: () => void
  onFinalize: () => void
  onConfirmFinalize?: () => void
  showConfirmFinalize?: boolean
  finalizeLabel: string
  confirmFinalizeLabel?: string
}) {
  const scoreColor = props.score?.recommendCreate ? 'green' : 'gold'
  const showOutlineGap = Boolean(props.diagnosticsSuggestion || props.riskMessage)
  const showFoundationAccept = Boolean(props.showFoundationAccept && props.score && !props.score.recommendCreate)

  return (
    <Card size="small" title={STEP0_SECTION_TITLES.status} style={{ borderRadius: 12 }}>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="purple" bordered={false}>分卷 {props.volumeCount}</Tag>
          <Tag color="geekblue" bordered={false}>章节细纲 {props.chapterCount}</Tag>
          <Tag color="cyan" bordered={false}>伏笔 {props.foreshadowingCount}</Tag>
          <Tag color="blue" bordered={false}>人物 {props.characterCount}</Tag>
          {props.score ? (
            <Tag color={scoreColor} bordered={false}>
              基础分 {props.score.overall} · {props.score.grade} · {props.score.statusLabel}
            </Tag>
          ) : null}
          {props.finalized ? <Tag color="success" bordered={false}>确定版</Tag> : null}
        </Space>

        {props.score && props.scoreSummary ? (
          <Text type="secondary" style={{ fontSize: 12 }}>{props.scoreSummary}</Text>
        ) : null}

        {showOutlineGap && (
          <Alert
            type="warning"
            showIcon
            message={props.riskMessage || '生成结果需要关注'}
            description={props.diagnosticsSuggestion ? (
              <Text type="secondary" style={{ fontSize: 12 }}>{props.diagnosticsSuggestion}</Text>
            ) : undefined}
          />
        )}

        {props.showFillGaps && props.onFillGaps && (props.topRisks || []).length > 0 && (
          <Alert
            type="info"
            showIcon
            message="检测到基础评分缺口"
            description={(
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Text style={{ fontSize: 12 }}>主要缺口：{(props.topRisks || []).join('、')}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  由模型只补缺失/偏薄字段；已有优质内容不会被空值或弱结果覆盖。
                </Text>
                <Button
                  size="small"
                  type="primary"
                  loading={props.fillingGaps}
                  onClick={props.onFillGaps}> 补齐缺口
                </Button>
              </Space>
            )}
          />
        )}

        {showFoundationAccept && (
          <Alert
            type={props.foundationAccepted ? 'info' : 'warning'}
            showIcon
            message={props.foundationAccepted ? '已标记满意当前版本' : '评分未达推荐开书线'}
            description={(
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {(props.topRisks || []).length > 0 && (
                  <Text style={{ fontSize: 12 }}>主要缺口：{(props.topRisks || []).join('、')}</Text>
                )}
                <Space wrap>
                  <Button
                    size="small"
                    type={props.foundationAccepted ? 'default' : 'primary'}
                    onClick={props.onAcceptFoundation}>
                    {props.foundationAccepted ? '已标记满意此版本' : '我满意，以当前版本开书'}
                  </Button>
                  {props.foundationAccepted && props.onClearFoundationAccept && (
                    <Button size="small" onClick={props.onClearFoundationAccept}> 取消满意标记
                    </Button>
                  )}
                </Space>
              </Space>
            )}
          />
        )}

        <Space wrap>
          <Button loading={props.regenerating} onClick={props.onRegenerate}> 重新生成</Button>
          {props.showDraftActions && (
            <Button icon={<SaveOutlined />} loading={props.savingDraft} onClick={props.onSaveDraft}>
              保存草稿
            </Button>
          )}
          {props.showFinalize && (
            <Button type="primary" loading={props.finalizing} onClick={props.onFinalize}> {props.finalizeLabel}
            </Button>
          )}
          {props.showConfirmFinalize && props.onConfirmFinalize && (
            <Button type="primary" loading={props.finalizing} onClick={props.onConfirmFinalize}> {props.confirmFinalizeLabel || '我已确认，创建项目'}
            </Button>
          )}
        </Space>
      </Space>
    </Card>
  )
}
