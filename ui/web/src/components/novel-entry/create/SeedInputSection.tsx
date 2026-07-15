import { Button, Card, Input, Popconfirm, Select, Space } from 'antd'
import { DeleteOutlined, FolderOpenOutlined, RocketOutlined } from '@ant-design/icons'
import { STEP0_SECTION_TITLES } from './createWizardCopy'

export function SeedInputSection(props: {
  title: string
  lengthTarget: string
  idea: string
  modelId?: number
  modelOptions: Array<{ value: number; label: string }>
  draftOptions: Array<{ value: number; label: string }>
  selectedDraftId?: number
  loading: boolean
  modelsLoading?: boolean
  draftsLoading?: boolean
  deletingDraft?: boolean
  showDraftControls?: boolean
  showAutoCreate?: boolean
  autoCreating?: boolean
  autoCreateDisabled?: boolean
  autoCreateLabel?: string
  lengthOptions: Array<{ value: string; label: string; description?: string }>
  onTitleChange: (value: string) => void
  onLengthChange: (value: string) => void
  onIdeaChange: (value: string) => void
  onModelChange: (value?: number) => void
  onDraftChange: (value?: number) => void
  onGenerate: () => void
  onSaveDraft: () => void
  onLoadDraft: () => void
  onDeleteDraft: () => void
  onAutoCreate?: () => void
  generateLabel: string
}) {
  return (
    <Card size="small" title={STEP0_SECTION_TITLES.input} style={{ borderRadius: 12 }}>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Input
          value={props.title}
          onChange={event => props.onTitleChange(event.target.value)}
          placeholder="作品名称，例如：长生天尊"
          size="large"
        />
        <Select
          size="large"
          value={props.lengthTarget}
          placeholder="选择篇幅目标"
          options={props.lengthOptions}
          optionRender={(option) => (
            <div>
              <div>{option.label}</div>
              {option.data?.description ? (
                <div style={{ fontSize: 12, color: '#999' }}>{option.data.description}</div>
              ) : null}
            </div>
          )}
          onChange={value => props.onLengthChange(String(value))}
          style={{ width: '100%' }}
        />
        <Input.TextArea
          rows={5}
          value={props.idea}
          onChange={event => props.onIdeaChange(event.target.value)}
          placeholder="可选：粘贴碎片想法。只填作品名时，系统会按原创项目自动扩展；粘贴设定时，会优先保留你的核心因果。"
          maxLength={20000}
          showCount
        />
        <Space.Compact block>
          <Select
            style={{ width: '65%' }}
            value={props.modelId}
            loading={props.modelsLoading}
            placeholder="选择模型"
            options={props.modelOptions}
            onChange={value => props.onModelChange(value)}
            allowClear
          />
          <Button
            type="primary"
            loading={props.loading}
            onClick={props.onGenerate}
            style={{ width: '35%' }}
          >
            {props.generateLabel}
          </Button>
        </Space.Compact>

        {props.showDraftControls && (
          <Card size="small" title="已保存孵化草稿" styles={{ body: { padding: 10 } }}>
            <Space.Compact block>
              <Select
                style={{ width: '58%' }}
                value={props.selectedDraftId}
                loading={props.draftsLoading}
                placeholder={props.draftOptions.length ? '选择草稿' : '暂无已保存草稿'}
                options={props.draftOptions}
                onChange={value => props.onDraftChange(value)}
                allowClear
              />
              <Button
                style={{ width: '21%' }}
                icon={<FolderOpenOutlined />}
                disabled={!props.selectedDraftId}
                onClick={props.onLoadDraft}
              >
                载入
              </Button>
              <Popconfirm
                title="删除这个孵化草稿？"
                okText="删除"
                cancelText="取消"
                onConfirm={props.onDeleteDraft}
                disabled={!props.selectedDraftId}
              >
                <Button
                  danger
                  style={{ width: '21%' }}
                  icon={<DeleteOutlined />}
                  loading={props.deletingDraft}
                  disabled={!props.selectedDraftId}
                >
                  删除
                </Button>
              </Popconfirm>
            </Space.Compact>
          </Card>
        )}

        {props.showAutoCreate && (
          <Button
            block
            type="primary"
            icon={<RocketOutlined />}
            loading={props.autoCreating}
            disabled={props.autoCreateDisabled}
            onClick={props.onAutoCreate}
          >
            {props.autoCreateLabel || 'AI整理并自动创建项目'}
          </Button>
        )}
      </Space>
    </Card>
  )
}
