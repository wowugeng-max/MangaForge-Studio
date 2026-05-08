import React, { useState, useCallback } from 'react'
import { Button, Checkbox, Form, Input, Modal, Result, Select, Space, Steps, message } from 'antd'
import { ArrowLeftOutlined, ArrowRightOutlined, CheckCircleOutlined, RocketOutlined } from '@ant-design/icons'
import apiClient from '../api/client'

interface NovelFormValues {
  title: string
  genre: string
  sub_genres: string[]
  length_target: string
  target_audience: string
  style_tags: string[]
  commercial_tags: string[]
  synopsis: string
}

interface NovelCreateWizardProps {
  open: boolean
  onCancel: () => void
  onSuccess: (projectId: number) => void
}

const GENRES = [
  { value: '玄幻', label: '玄幻' },
  { value: '仙侠', label: '仙侠' },
  { value: '科幻', label: '科幻' },
  { value: '悬疑', label: '悬疑' },
  { value: '都市', label: '都市' },
  { value: '历史', label: '历史' },
  { value: '奇幻', label: '奇幻' },
  { value: '武侠', label: '武侠' },
  { value: '言情', label: '言情' },
  { value: '末世', label: '末世' },
  { value: '穿越', label: '穿越' },
  { value: '系统', label: '系统流' },
  { value: '其他', label: '其他' },
]

const LENGTH_TARGETS = [
  { value: 'short', label: '短篇（< 20万）', description: '短篇快完结，适合试水' },
  { value: 'medium', label: '中篇（20-80万）', description: '节奏紧凑，主线明确' },
  { value: 'long', label: '长篇（80-300万）', description: '多卷多线，世界观宏大' },
  { value: 'epic', label: '超长篇（> 300万）', description: '史诗级篇幅，适合长线连载' },
]

const AUDIENCES = [
  { value: '男频', label: '男频' },
  { value: '女频', label: '女频' },
  { value: '全向', label: '全向' },
  { value: '轻小说', label: '轻小说' },
  { value: '漫剧', label: '漫剧读者' },
  { value: 'Z世代', label: 'Z世代' },
]

const STYLE_TAGS = [
  '高燃', '黑暗', '轻松', '群像', '单线', '智斗', '热血',
  '搞笑', '催泪', '虐心', '慢热', '快节奏', '沙雕', '治愈',
  '致郁', '赛博朋克', '克苏鲁', '种田', '经营', '冒险',
]

const COMMERCIAL_TAGS = [
  '爆款潜质', '爽文', '起点感', '番茄感', '知乎感',
  'IP改编', '影视化', '短剧改编', '漫改', '有声书',
]

export default function NovelCreateWizard({ open, onCancel, onSuccess }: NovelCreateWizardProps) {
  const [current, setCurrent] = useState(0)
  const [creating, setCreating] = useState(false)
  const [createdId, setCreatedId] = useState<number | null>(null)
  const [form] = Form.useForm<NovelFormValues>()
  // 手动管理的表单数据 — 用 state 保存，不依赖 Form 的条件渲染
  const [data, setData] = useState({
    title: '',
    genre: '',
    sub_genres: [] as string[],
    length_target: 'medium',
    target_audience: '',
    style_tags: [] as string[],
    commercial_tags: [] as string[],
    synopsis: '',
  })

  // 每次 data 变化时同步回 Form
  React.useEffect(() => {
    form.setFieldsValue(data)
  }, [data, form])

  // 标题 watch — 用于按钮 disabled
  const watchedTitle = Form.useWatch('title', form) || ''
  const formItems = ['basic', 'style', 'confirm', 'done']

  const handleNext = useCallback(async () => {
    if (current === 0) {
      // 保存 Step 0 的数据
      if (!data.title.trim()) {
        message.warning('请输入作品标题')
        return
      }
      if (!data.genre) {
        message.warning('请选择题材')
        return
      }
    }
    if (current === formItems.length - 2) {
      // Step 2 -> 创建
      await handleCreate()
      return
    }
    setCurrent(c => c + 1)
  }, [current, data, formItems])

  const handlePrev = () => {
    if (current === 3) return
    setCurrent(c => Math.max(0, c - 1))
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const payload = {
        title: data.title,
        genre: data.genre || '',
        sub_genres: data.sub_genres || [],
        length_target: data.length_target || 'medium',
        target_audience: data.target_audience || '',
        style_tags: data.style_tags || [],
        commercial_tags: data.commercial_tags || [],
        synopsis: data.synopsis || '',
        status: 'draft',
      }
      const res = await apiClient.post('/novel/projects', payload)
      const projectId = res.data?.id
      if (projectId) {
        setCreatedId(projectId)
        message.success('小说项目创建成功！')
      }
      setCurrent(3)
    } catch {
      message.error('创建失败，请检查网络连接')
    } finally {
      setCreating(false)
    }
  }

  const handleDone = () => {
    if (createdId) onSuccess(createdId)
    handleReset()
  }

  const handleReset = () => {
    setCurrent(0)
    setCreating(false)
    setCreatedId(null)
    setData({
      title: '',
      genre: '',
      sub_genres: [],
      length_target: 'medium',
      target_audience: '',
      style_tags: [],
      commercial_tags: [],
      synopsis: '',
    })
  }

  const handleModalCancel = () => {
    handleReset()
    onCancel()
  }

  const steps = [
    { title: '基础信息', description: '标题与题材' },
    { title: '风格设定', description: '篇幅与标签' },
    { title: '确认创建', description: '预览与提交' },
    { title: '创建完成', description: '下一步' },
  ]

  // 通用 onChange — 表单字段变化时同步到 data state
  const onFormChange = () => {
    const v = form.getFieldsValue()
    setData(prev => ({ ...prev, ...v }))
  }

  return (
    <Modal
      open={open}
      onCancel={handleModalCancel}
      footer={null}
      width={720}
      maskClosable={false}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 4px 0' }}>新建小说项目</h2>
        <p style={{ color: '#666', margin: 0 }}>分步完成你的小说项目初始化</p>
      </div>

      <Steps
        current={current}
        items={steps}
        style={{ marginBottom: 32 }}
        size="small"
      />

      {/* 所有步骤共享同一个 Form 实例，通过 onValuesChange 同步到 data */}
      <Form
        form={form}
        layout="vertical"
        onValuesChange={onFormChange}
      >

        {/* Step 0: Basic Info */}
        {current === 0 && (
          <>
            <Form.Item
              name="title"
              label="作品标题"
              rules={[{ required: true, message: '请输入作品标题' }]}
            >
              <Input
                size="large"
                placeholder="例如：废墟尽头的灯塔"
                prefix="📖"
              />
            </Form.Item>

            <Form.Item
              name="genre"
              label="题材"
              rules={[{ required: true, message: '请选择题材' }]}
            >
              <Select
                size="large"
                placeholder="选择主要题材"
                options={GENRES}
              />
            </Form.Item>

            <Form.Item name="sub_genres" label="子题材（可选，可多选）">
              <Select
                mode="tags"
                placeholder="例如：穿越, 赛博朋克, 克苏鲁"
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item name="synopsis" label="一句话简介（可选）">
              <Input.TextArea
                rows={3}
                placeholder="用一句话描述你的小说核心卖点"
                maxLength={200}
                showCount
              />
            </Form.Item>
          </>
        )}

        {/* Step 1: Style Settings */}
        {current === 1 && (
          <>
            <Form.Item
              name="length_target"
              label="篇幅目标"
              rules={[{ required: true, message: '请选择篇幅目标' }]}
            >
              <Select
                size="large"
                placeholder="选择目标篇幅"
                options={LENGTH_TARGETS}
                optionRender={(option) => (
                  <div>
                    <div>{option.label}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>{option.data?.description}</div>
                  </div>
                )}
              />
            </Form.Item>

            <Form.Item name="target_audience" label="目标读者">
              <Select
                placeholder="选择目标读者群体"
                options={AUDIENCES}
              />
            </Form.Item>

            <Form.Item name="style_tags" label="风格标签（可选，可多选）">
              <Select
                mode="multiple"
                placeholder="选择风格标签"
                options={STYLE_TAGS.map(t => ({ value: t, label: t }))}
                style={{ width: '100%' }}
                maxCount={5}
              />
            </Form.Item>

            <Form.Item name="commercial_tags" label="商业标签（可选，可多选）">
              <Select
                mode="multiple"
                placeholder="选择商业定位标签"
                options={COMMERCIAL_TAGS.map(t => ({ value: t, label: t }))}
                style={{ width: '100%' }}
                maxCount={3}
              />
            </Form.Item>
          </>
        )}

      </Form>

      {/* Step 2: Confirm — 从 data state 读取，不依赖 Form */}
      {current === 2 && (
        <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 20 }}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>📋 创建预览</h3>

            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex' }}>
                <span style={{ minWidth: 80, color: '#999' }}>作品标题</span>
                <span style={{ fontWeight: 500 }}>{data.title || '-'}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ minWidth: 80, color: '#999' }}>题材</span>
                <span>{data.genre || '-'}</span>
              </div>
              {data.sub_genres?.length > 0 && (
                <div style={{ display: 'flex' }}>
                  <span style={{ minWidth: 80, color: '#999' }}>子题材</span>
                  <span>{data.sub_genres.join(' / ')}</span>
                </div>
              )}
              {data.synopsis && (
                <div style={{ display: 'flex' }}>
                  <span style={{ minWidth: 80, color: '#999' }}>简介</span>
                  <span style={{ fontStyle: 'italic', color: '#666' }}>{data.synopsis}</span>
                </div>
              )}
              <div style={{ display: 'flex' }}>
                <span style={{ minWidth: 80, color: '#999' }}>篇幅</span>
                <span>{LENGTH_TARGETS.find(l => l.value === data.length_target)?.label || '中篇'}</span>
              </div>
              {data.target_audience && (
                <div style={{ display: 'flex' }}>
                  <span style={{ minWidth: 80, color: '#999' }}>读者</span>
                  <span>{data.target_audience}</span>
                </div>
              )}
              {data.style_tags?.length > 0 && (
                <div style={{ display: 'flex' }}>
                  <span style={{ minWidth: 80, color: '#999' }}>风格</span>
                  <span>{data.style_tags.join(' / ')}</span>
                </div>
              )}
              {data.commercial_tags?.length > 0 && (
                <div style={{ display: 'flex' }}>
                  <span style={{ minWidth: 80, color: '#999' }}>商业</span>
                  <span>{data.commercial_tags.join(' / ')}</span>
                </div>
              )}
            </div>

            <div style={{ marginTop: 8, padding: 12, background: '#eef2ff', borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: '#6366f1' }}>
                🚀 创建后你可以：
              </div>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: 18, fontSize: 13, color: '#666' }}>
                <li>进入工作台开始写作</li>
                <li>使用 AI 一键初始化（世界观、角色、大纲）</li>
                <li>手动编辑章节，逐步构建你的故事</li>
              </ul>
            </div>
          </Space>
        </div>
      )}

      {/* Step 3: Done */}
      {current === 3 && (
        <Result
          status="success"
          icon={<CheckCircleOutlined />}
          title="小说项目创建成功！"
          subTitle={data.title ? `《${data.title}》已就绪` : '项目已就绪'}
          extra={[
            <Button
              type="primary"
              key="go"
              icon={<RocketOutlined />}
              onClick={handleDone}
              size="large"
            >
              进入工作台
            </Button>,
            <Button key="close" onClick={handleModalCancel} size="large">
              留在项目大厅
            </Button>,
          ]}
        />
      )}

      {/* Navigation Buttons */}
      {current < 3 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handlePrev}
            disabled={current === 0}
          >
            上一步
          </Button>
          <Space>
            <Button onClick={handleModalCancel}>取消</Button>
            <Button
              type="primary"
              icon={current === 2 ? <RocketOutlined /> : <ArrowRightOutlined />}
              onClick={handleNext}
              loading={creating}
              disabled={current === 0 && !data.title.trim()}
            >
              {current === 2 ? '创建项目' : '下一步'}
            </Button>
          </Space>
        </div>
      )}
    </Modal>
  )
}
