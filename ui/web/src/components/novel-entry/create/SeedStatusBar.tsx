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
  diagnosticsSuggestion?: string
  riskMessage?: string
  finalized?: boolean
  regenerating?: boolean
  savingDraft?: boolean
  finalizing?: boolean
  showDraftActions?: boolean
  showFinalize?: boolean
  onRegenerate: () => void
  onSaveDraft: () => void
  onFinalize: () => void
  onConfirmFinalize?: () => void
  showConfirmFinalize?: boolean
  finalizeLabel: string
  confirmFinalizeLabel?: string
}) {
  const scoreColor = props.score?.recommendCreate ? 'green' : 'gold'
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

        {(props.diagnosticsSuggestion || props.riskMessage) && (
          <Alert
            type="warning"
            showIcon
            message={props.riskMessage || '生成结果需要关注'}
            description={props.diagnosticsSuggestion ? (
              <Text type="secondary" style={{ fontSize: 12 }}>{props.diagnosticsSuggestion}</Text>
            ) : undefined}
          />
        )}

        <Space wrap>
          <Button loading={props.regenerating} onClick={props.onRegenerate}>重新生成</Button>
          {props.showDraftActions && (
            <Button icon={<SaveOutlined />} loading={props.savingDraft} onClick={props.onSaveDraft}>
              保存草稿
            </Button>
          )}
          {props.showFinalize && (
            <Button type="primary" loading={props.finalizing} onClick={props.onFinalize}>
              {props.finalizeLabel}
            </Button>
          )}
          {props.showConfirmFinalize && props.onConfirmFinalize && (
            <Button type="primary" loading={props.finalizing} onClick={props.onConfirmFinalize}>
              {props.confirmFinalizeLabel || '我已确认，创建项目'}
            </Button>
          )}
        </Space>
      </Space>
    </Card>
  )
}
