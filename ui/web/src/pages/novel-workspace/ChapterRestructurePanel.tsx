import React, { useEffect, useState } from 'react'
import { Button, Card, Input, InputNumber, message, Modal, Radio, Space, Typography } from 'antd'
import { InteractionOutlined } from '@ant-design/icons'
import { displayValue } from './utils'

const { Text } = Typography

export function ChapterRestructurePanel({
  open,
  onClose,
  selectedChapters,
  onRestructure,
}: {
  open: boolean
  onClose: () => void
  selectedChapters: any[]
  onRestructure: (mode: string, targetCount: number, instructions: string) => Promise<void>
}) {
  const [mode, setMode] = useState<'expand' | 'contract'>('expand')
  const [targetCount, setTargetCount] = useState(10)
  const [instructions, setInstructions] = useState('')
  const [running, setRunning] = useState(false)
  const selectedCount = selectedChapters.length

  useEffect(() => {
    if (open) {
      setMode('expand')
      setTargetCount(Math.max(selectedCount * 3, 10))
    }
  }, [open, selectedCount])

  const handleModeChange = (m: 'expand' | 'contract') => {
    setMode(m)
    if (m === 'expand') setTargetCount(Math.max(selectedCount * 3, 10))
    else setTargetCount(Math.max(Math.floor(selectedCount / 2), 1))
  }

  const handleConfirm = async () => {
    if (mode === 'expand' && targetCount <= selectedCount) {
      message.warning(`扩展目标章数必须大于原始章数 (${selectedCount})`)
      return
    }
    if (mode === 'contract' && targetCount >= selectedCount) {
      message.warning(`收缩目标章数必须小于原始章数 (${selectedCount})`)
      return
    }
    if (targetCount < 1) {
      message.warning('目标章数至少为 1')
      return
    }
    setRunning(true)
    try {
      await onRestructure(mode, targetCount, instructions)
      onClose()
    } catch (e: any) {
      message.error(e?.response?.data?.detail || e?.message || '章节重组失败')
    } finally {
      setRunning(false)
    }
  }

  const selectedChaptersInfo = selectedChapters
    .sort((a, b) => a.chapter_no - b.chapter_no)
    .map(c => `第${c.chapter_no}章《${displayValue(c.title)}》`)
    .join('、')

  return (
    <Modal title={<Space><InteractionOutlined /> 章节重组</Space>} open={open} onCancel={onClose} footer={null} width={640}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div style={{ padding: '10px 16px', background: '#f0f5ff', borderRadius: 8, fontSize: 13 }}>
          <Text strong>已选择 {selectedCount} 章：</Text>
          <Text style={{ display: 'block', marginTop: 4, color: '#666' }}>{selectedChaptersInfo}</Text>
        </div>

        <Card size="small" title="操作模式" styles={{ body: { padding: '12px 16px' } }}>
          <Radio.Group value={mode} onChange={e => handleModeChange(e.target.value)} optionType="button" buttonStyle="solid">
            <Radio.Button value="expand">📈 扩展章节</Radio.Button>
            <Radio.Button value="contract">📉 合并章节</Radio.Button>
          </Radio.Group>
        </Card>

        <Card size="small" title="目标章数" styles={{ body: { padding: '12px 16px' } }}>
          <Space align="center" size={12}>
            <Text>将 {selectedCount} 章</Text>
            <Text strong style={{ color: mode === 'expand' ? '#1677ff' : '#fa8c16' }}>{mode === 'expand' ? '扩展' : '合并'}</Text>
            <Text>为</Text>
            <InputNumber min={1} max={200} value={targetCount} onChange={(v) => setTargetCount(v || 1)} style={{ width: 100 }} />
            <Text>章</Text>
          </Space>
          {mode === 'expand' && (
            <div style={{ marginTop: 8, padding: '6px 12px', background: '#e6f7ff', borderRadius: 6, fontSize: 12, color: '#1677ff' }}>
              💡 仅在所选连续章节范围内扩展为 {targetCount} 章细纲；原范围后的章节会整体顺延，正文需审核细纲后再手动生成。
            </div>
          )}
          {mode === 'contract' && (
            <div style={{ marginTop: 8, padding: '6px 12px', background: '#fff7e6', borderRadius: 6, fontSize: 12, color: '#fa8c16' }}>
              ⚠️ 将删除 {selectedCount - targetCount} 章，保留 {targetCount} 章。原始章节内容会被自动备份。
            </div>
          )}
        </Card>

        <Card size="small" title="额外指令（可选）" styles={{ body: { padding: '12px 16px' } }}>
          <Input.TextArea
            rows={4}
            placeholder={mode === 'expand'
              ? '例如：增加更多心理描写、扩展对话场景、补充场景节拍与转折，但只生成细纲不生成正文...\n'
              : '例如：精简次要情节、保留主线发展、删除冗余对话...\n'
            }
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            maxLength={1000}
            showCount
          />
        </Card>

        <div style={{ padding: '10px 16px', background: '#fff1f0', border: '1px solid #ffccc7', borderRadius: 8, fontSize: 12, color: '#cf1322' }}>
          ⚠️ 操作前会自动备份章节内容，可在版本历史中恢复。扩展模式仅生成细纲，不会直接生成正文。
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose} disabled={running}>取消</Button>
          <Button type="primary" danger={mode === 'contract'} loading={running} onClick={handleConfirm}>
            {mode === 'expand' ? '📈 开始扩展' : '📉 开始合并'}
          </Button>
        </div>
      </Space>
    </Modal>
  )
}
