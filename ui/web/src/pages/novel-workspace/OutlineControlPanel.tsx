import React, { useEffect, useMemo, useState } from 'react'
import { Button, Card, Input, InputNumber, message, Modal, Space, Tag, Typography } from 'antd'
import { BookOutlined, RocketOutlined } from '@ant-design/icons'

const { Text } = Typography

export function OutlineControlPanel({
  open,
  onClose,
  onGenerate,
  existingChapters,
  existingOutlines,
}: {
  open: boolean
  onClose: () => void
  onGenerate: (opts: { chapterCount: number; continueMode: boolean; continueFrom: number; userOutline: string }) => void
  existingChapters: any[]
  existingOutlines: any[]
}) {
  const [chapterCount, setChapterCount] = useState(10)
  const [continueMode, setContinueMode] = useState(false)
  const [continueFrom, setContinueFrom] = useState(0)
  const [userOutline, setUserOutline] = useState('')
  const [mode, setMode] = useState<'create' | 'continue' | 'expand'>('create')

  const lastChapterNo = useMemo(() => {
    if (existingChapters.length === 0) return 0
    return Math.max(...existingChapters.map(c => c.chapter_no))
  }, [existingChapters])

  const lastOutlineNo = useMemo(() => {
    const chapterOutlines = existingOutlines.filter(o => o.outline_type === 'chapter')
    if (chapterOutlines.length === 0) return 0
    return chapterOutlines.length
  }, [existingOutlines])

  useEffect(() => {
    if (continueMode) setContinueFrom(Math.max(lastChapterNo, lastOutlineNo))
  }, [continueMode, lastChapterNo, lastOutlineNo])

  const handleGenerate = () => {
    if (chapterCount < 1) {
      message.warning('至少生成 1 章')
      return
    }
    onGenerate({ chapterCount, continueMode, continueFrom, userOutline: userOutline.trim() })
  }

  const handleModeChange = (newMode: 'create' | 'continue' | 'expand') => {
    setMode(newMode)
    setContinueMode(newMode === 'continue')
  }

  return (
    <Modal title={<Space><BookOutlined /> 大纲生成设置</Space>} open={open} onCancel={onClose} footer={null} width={680}>
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <Card size="small" title="生成模式" styles={{ body: { padding: '12px 16px' } }}>
          <Space size="large">
            <div onClick={() => handleModeChange('create')} style={{ cursor: 'pointer', textAlign: 'center' }}>
              <Tag color={mode === 'create' ? 'blue' : 'default'} style={{ padding: '4px 12px', fontSize: 14 }}>✨ 从头生成</Tag>
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>生成全新的细纲</div>
            </div>
            <div onClick={() => handleModeChange('continue')} style={{ cursor: 'pointer', textAlign: 'center' }}>
              <Tag color={mode === 'continue' ? 'blue' : 'default'} style={{ padding: '4px 12px', fontSize: 14 }}>➡️ 续写</Tag>
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>从已有细纲继续</div>
            </div>
            <div onClick={() => handleModeChange('expand')} style={{ cursor: 'pointer', textAlign: 'center' }}>
              <Tag color={mode === 'expand' ? 'blue' : 'default'} style={{ padding: '4px 12px', fontSize: 14 }}>📝 扩展</Tag>
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>基于你的大纲扩展</div>
            </div>
          </Space>
        </Card>

        <Card size="small" title="细纲数量" styles={{ body: { padding: '12px 16px' } }}>
          <Space align="center" size={12}>
            <Text>生成</Text>
            <InputNumber min={1} max={200} value={chapterCount} onChange={(v) => setChapterCount(v || 10)} style={{ width: 120 }} />
            <Text>章细纲</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>(每章对应一条细纲)</Text>
          </Space>
        </Card>

        {mode === 'continue' && (
          <Card size="small" title="续写设置" styles={{ body: { padding: '12px 16px' } }}>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Space align="center">
                <Text>从第</Text>
                <InputNumber min={0} max={999} value={continueFrom} onChange={(v) => setContinueFrom(v || 0)} style={{ width: 120 }} />
                <Text>章之后继续生成</Text>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                已有 {lastChapterNo} 章正文，{lastOutlineNo} 条细纲
                {lastChapterNo > 0 && `，最后一章为第 ${lastChapterNo} 章`}
              </Text>
              <div style={{ padding: '6px 12px', background: '#f0f5ff', borderRadius: 6, fontSize: 12, color: '#1677ff' }}>
                💡 将生成第 {continueFrom + 1} ~ 第 {continueFrom + chapterCount} 章的细纲
              </div>
            </Space>
          </Card>
        )}

        {(mode === 'expand' || mode === 'create') && (
          <Card size="small" title={mode === 'expand' ? '用户大纲（扩展模式）' : '参考大纲（可选）'} styles={{ body: { padding: '12px 16px' } }}>
            <Space direction="vertical" style={{ width: '100%' }} size={4}>
              {mode === 'expand' && <Text type="secondary" style={{ fontSize: 12 }}>提供你的故事大纲，AI 将在此基础上扩展和深化。</Text>}
              {mode === 'create' && <Text type="secondary" style={{ fontSize: 12 }}>可选：提供故事灵感或粗略大纲，AI 会作为参考。</Text>}
              <Input.TextArea
                rows={8}
                placeholder={mode === 'expand' ? '在此输入你的故事大纲...' : '在此输入故事灵感或粗略大纲（可选）...'}
                value={userOutline}
                onChange={(e) => setUserOutline(e.target.value)}
                maxLength={5000}
                showCount
              />
            </Space>
          </Card>
        )}

        <div style={{ padding: '12px 16px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8 }}>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text style={{ fontSize: 13, color: '#52c41a' }}>📋 生成时将同步完成：</Text>
            <div style={{ fontSize: 12, color: '#666' }}>
              ✓ 总纲生成（如尚未存在）<br />✓ 细纲生成（{chapterCount} 章）<br />✓ 世界观同步更新<br />✓ 角色信息同步更新<br />✓ 连续性预检<br />✓ 角色知识追踪快照
            </div>
          </Space>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" icon={<RocketOutlined />} onClick={handleGenerate}>开始生成</Button>
        </div>
      </Space>
    </Modal>
  )
}
