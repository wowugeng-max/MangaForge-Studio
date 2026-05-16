import React, { useState, useCallback } from 'react'
import { Alert, Button, Card, Form, Input, Modal, Result, Select, Space, Steps, Tag, Typography, message } from 'antd'
import { ArrowLeftOutlined, ArrowRightOutlined, CheckCircleOutlined, RocketOutlined } from '@ant-design/icons'
import apiClient from '../api/client'

const { Text, Paragraph } = Typography
const projectSeedModelStorageKey = 'novel.projectSeed.model_id'

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

function asStringArray(value: any): string[] {
  if (!Array.isArray(value)) return []
  return value.map(item => String(item || '').trim()).filter(Boolean)
}

function firstText(...values: any[]) {
  return values.map(value => String(value || '').trim()).find(Boolean) || ''
}

function asObject(value: any) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function inferGenreFromText(text: string) {
  if (/修仙|仙门|仙道|天尊|长生|古神|外神|神祇|王朝|皇子/.test(text)) return '仙侠'
  if (/异能|灵气|武魂|斗气|神魔|玄幻/.test(text)) return '玄幻'
  if (/都市|公司|学校|职场/.test(text)) return '都市'
  if (/末世|丧尸|灾变/.test(text)) return '末世'
  if (/星际|飞船|AI|人工智能|科幻/.test(text)) return '科幻'
  if (/悬疑|推理|凶案|诡案/.test(text)) return '悬疑'
  return ''
}

function normalizeProjectSeedForUi(payload: any) {
  const root = asObject(payload)
  const source = [root.project_seed, root.seed, root.project, root.novel_project, root.data, root.result, root]
    .map(asObject)
    .find(item => firstText(item.title, item.project_title, item.book_title, item.synopsis, item.summary, item.logline, item.core_premise) || item.worldbuilding || item.protagonist) || root
  const masterOutline = asObject(source.master_outline || root.master_outline)
  const rawText = `${JSON.stringify(root).slice(0, 5000)} ${String(root.raw_idea || '').slice(0, 5000)}`
  const commercial = asObject(source.commercial_positioning || root.commercial_positioning)
  const worldbuilding = asObject(source.worldbuilding || root.worldbuilding)
  const plotEngine = asObject(source.plot_engine || root.plot_engine)
  return {
    ...source,
    title: firstText(source.title, source.project_title, source.book_title, source.name, source.working_title, masterOutline.title),
    genre: firstText(source.genre, source.main_genre, source.category, inferGenreFromText(rawText)),
    sub_genres: asStringArray(source.sub_genres).length ? asStringArray(source.sub_genres) : asStringArray(source.genre_tags || source.tags),
    target_audience: firstText(source.target_audience, source.audience, commercial.platform),
    length_target: firstText(source.length_target, source.length, 'medium'),
    style_tags: asStringArray(source.style_tags).length ? asStringArray(source.style_tags) : asStringArray(source.tone_tags),
    commercial_tags: asStringArray(source.commercial_tags).length ? asStringArray(source.commercial_tags) : asStringArray(commercial.selling_points || commercial.tropes),
    synopsis: firstText(source.synopsis, source.project_summary, source.summary, masterOutline.summary, commercial.reader_promise, source.core_premise, source.logline),
    logline: firstText(source.logline, source.hook, masterOutline.hook, commercial.reader_promise),
    core_premise: firstText(source.core_premise, source.premise, source.setting, source.summary, masterOutline.summary),
    main_conflict: firstText(source.main_conflict, source.conflict, plotEngine.long_term_goal, masterOutline.hook),
    protagonist: asObject(source.protagonist || root.protagonist),
    antagonist: asObject(source.antagonist || root.antagonist),
    worldbuilding,
    plot_engine: plotEngine,
    writing_bible: asObject(source.writing_bible || root.writing_bible),
    volume_outlines: Array.isArray(source.volume_outlines) ? source.volume_outlines : (Array.isArray(root.volume_outlines) ? root.volume_outlines : []),
    chapter_outlines: Array.isArray(source.chapter_outlines) ? source.chapter_outlines : (Array.isArray(root.chapter_outlines) ? root.chapter_outlines : []),
    foreshadowing_plan: Array.isArray(source.foreshadowing_plan) ? source.foreshadowing_plan : (Array.isArray(root.foreshadowing_plan) ? root.foreshadowing_plan : []),
    characters: Array.isArray(source.characters) ? source.characters : (Array.isArray(root.characters) ? root.characters : []),
    open_questions: asStringArray(source.open_questions).length ? asStringArray(source.open_questions) : asStringArray(source.questions),
    next_steps: asStringArray(source.next_steps).length ? asStringArray(source.next_steps) : asStringArray(source.suggested_next_steps),
    raw_payload: root.raw_payload || root,
  }
}

function normalizeLengthTarget(value: any) {
  const raw = String(value || '').trim()
  return LENGTH_TARGETS.some(item => item.value === raw) ? raw : 'medium'
}

function pickGenre(value: any) {
  const raw = String(value || '').trim()
  if (GENRES.some(item => item.value === raw)) return raw
  const matched = GENRES.find(item => raw.includes(item.value))
  return matched?.value || raw || '其他'
}

export default function NovelCreateWizard({ open, onCancel, onSuccess }: NovelCreateWizardProps) {
  const [current, setCurrent] = useState(0)
  const [creating, setCreating] = useState(false)
  const [createdId, setCreatedId] = useState<number | null>(null)
  const [seedIdea, setSeedIdea] = useState('')
  const [seedLoading, setSeedLoading] = useState(false)
  const [autoCreating, setAutoCreating] = useState(false)
  const [seed, setSeed] = useState<any | null>(null)
  const [modelsLoading, setModelsLoading] = useState(false)
  const [models, setModels] = useState<any[]>([])
  const [seedModelId, setSeedModelId] = useState<number | undefined>(() => {
    const parsed = Number(typeof window === 'undefined' ? 0 : window.localStorage.getItem(projectSeedModelStorageKey) || 0)
    return parsed || undefined
  })
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

  React.useEffect(() => {
    if (!open || models.length > 0 || modelsLoading) return
    setModelsLoading(true)
    apiClient.get('/models/')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : []
        setModels(list)
        if (seedModelId && !list.some((model: any) => Number(model.id) === Number(seedModelId))) {
          setSeedModelId(undefined)
          if (typeof window !== 'undefined') window.localStorage.removeItem(projectSeedModelStorageKey)
        }
      })
      .catch(() => message.error('无法加载模型列表'))
      .finally(() => setModelsLoading(false))
  }, [open, models.length, modelsLoading, seedModelId])

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

  const buildCreatePayload = (projectSeed = seed) => ({
    title: data.title,
    genre: data.genre || '',
    sub_genres: data.sub_genres || [],
    length_target: data.length_target || 'medium',
    target_audience: data.target_audience || '',
    style_tags: data.style_tags || [],
    commercial_tags: data.commercial_tags || [],
    synopsis: data.synopsis || '',
    status: 'draft',
    reference_config: projectSeed ? {
      project_seed: {
        ...projectSeed,
        raw_idea: seedIdea,
        derived_at: new Date().toISOString(),
      },
      writing_bible: projectSeed.writing_bible || {},
      commercial_positioning: {
        reader_promise: projectSeed.logline || projectSeed.synopsis || '',
        selling_points: asStringArray(projectSeed.commercial_positioning?.selling_points).length
          ? asStringArray(projectSeed.commercial_positioning?.selling_points)
          : asStringArray(projectSeed.commercial_tags),
        seed: true,
      },
    } : {},
    auto_materialize_seed: Boolean(projectSeed),
  })

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await apiClient.post('/novel/projects', buildCreatePayload())
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

  const handleAutoCreate = async () => {
    const title = String(data.title || seed?.title || '').trim()
    const idea = seedIdea.trim()
    if (!title && !idea && !seed) {
      message.warning('请输入作品名称，或粘贴创意草稿')
      return
    }
    if (!seed && !seedModelId) {
      message.warning('请先选择用于自动建项的模型')
      return
    }
    setAutoCreating(true)
    try {
      const res = seed
        ? await apiClient.post('/novel/projects/auto-create', { title, idea, seed })
        : await apiClient.post('/novel/projects/auto-create', { title, idea, model_id: seedModelId })
      const project = res.data?.project || res.data
      const projectId = project?.id
      if (!projectId) throw new Error('自动建项未返回项目 ID')
      const counts = res.data?.seed_materialization || {}
      message.success(`已自动创建项目：分卷/大纲 ${counts.outlines || 0}，章节 ${counts.chapters || 0}`)
      if (typeof window !== 'undefined' && seedModelId) window.localStorage.setItem(projectSeedModelStorageKey, String(seedModelId))
      onSuccess(projectId)
      handleReset()
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '自动建项失败')
    } finally {
      setAutoCreating(false)
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
    setSeedIdea('')
    setSeedLoading(false)
    setAutoCreating(false)
    setSeed(null)
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

  const modelOptions = models
    .filter(model => {
      const caps = model?.capabilities && typeof model.capabilities === 'object' ? model.capabilities : {}
      const isMediaOnly = caps.text_to_image || caps.image_to_image || caps.text_to_video || caps.image_to_video
      return !isMediaOnly || caps.chat || caps.reasoning || caps.vision
    })
    .sort((a, b) => Number(Boolean(b?.is_favorite)) - Number(Boolean(a?.is_favorite)))
    .map(model => ({
      value: Number(model.id),
      label: `${model.display_name || model.model_name || `模型 #${model.id}`}${model.provider ? ` · ${model.provider}` : ''}`,
    }))
    .filter(option => option.value)

  const applySeedToForm = (nextSeed: any) => {
    const normalizedSeed = normalizeProjectSeedForUi(nextSeed)
    const nextData = {
      title: String(normalizedSeed.title || data.title || normalizedSeed.logline || '').trim().slice(0, 32),
      genre: pickGenre(normalizedSeed.genre || data.genre),
      sub_genres: asStringArray(normalizedSeed.sub_genres).length ? asStringArray(normalizedSeed.sub_genres) : data.sub_genres,
      length_target: normalizeLengthTarget(normalizedSeed.length_target || data.length_target),
      target_audience: String(normalizedSeed.target_audience || data.target_audience || '').trim(),
      style_tags: asStringArray(normalizedSeed.style_tags).length ? asStringArray(normalizedSeed.style_tags).slice(0, 5) : data.style_tags,
      commercial_tags: asStringArray(normalizedSeed.commercial_tags).length ? asStringArray(normalizedSeed.commercial_tags).slice(0, 3) : data.commercial_tags,
      synopsis: String(normalizedSeed.synopsis || normalizedSeed.logline || data.synopsis || '').trim().slice(0, 500),
    }
    setData(prev => ({ ...prev, ...nextData }))
  }

  const deriveProjectSeed = async () => {
    if (!seedIdea.trim() && !data.title.trim()) return message.warning('请输入作品名称，或粘贴创意草稿')
    if (!seedModelId) return message.warning('请先选择用于整理创意的模型')
    setSeedLoading(true)
    try {
      const res = await apiClient.post('/novel/project-seed/derive', {
        idea: seedIdea,
        title: data.title,
        model_id: seedModelId,
      })
      const nextSeed = normalizeProjectSeedForUi(res.data?.seed || {})
      setSeed(nextSeed)
      applySeedToForm(nextSeed)
      if (typeof window !== 'undefined') window.localStorage.setItem(projectSeedModelStorageKey, String(seedModelId))
      message.success('已整理创意草稿，可继续编辑后创建项目')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '创意草稿整理失败')
    } finally {
      setSeedLoading(false)
    }
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
            <Card
              size="small"
              title="碎片想法快速建项"
              style={{ marginBottom: 16, borderRadius: 12, background: '#fbfdff' }}
            >
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Alert
                  type="info"
                  showIcon
                  message="输入作品名即可自动建项；如果有零散设定，也可以粘贴进来，AI 会整理成项目简介、分卷、章节细纲和伏笔计划。"
                />
                <Input
                  value={data.title}
                  onChange={event => setData(prev => ({ ...prev, title: event.target.value }))}
                  placeholder="作品名称，例如：长生天尊"
                  size="large"
                />
                <Input.TextArea
                  rows={5}
                  value={seedIdea}
                  onChange={event => setSeedIdea(event.target.value)}
                  placeholder="可选：粘贴碎片想法。只填作品名时，系统会按原创项目自动扩展；粘贴设定时，会优先保留你的核心因果。"
                  maxLength={20000}
                  showCount
                />
                <Space.Compact block>
                  <Select
                    style={{ width: '65%' }}
                    value={seedModelId}
                    loading={modelsLoading}
                    placeholder="选择整理创意的模型"
                    options={modelOptions}
                    onChange={setSeedModelId}
                  />
                  <Button
                    type="primary"
                    loading={seedLoading}
                    onClick={deriveProjectSeed}
                    style={{ width: '35%' }}
                  >
                    AI整理创意
                  </Button>
                </Space.Compact>
                <Button
                  block
                  type="primary"
                  icon={<RocketOutlined />}
                  loading={autoCreating}
                  disabled={seedLoading || creating}
                  onClick={handleAutoCreate}
                >
                  {seed ? '用这个种子自动创建并进入工作台' : 'AI整理并自动创建项目'}
                </Button>
                {seed && (
                  <Card size="small" title="已生成项目种子" style={{ borderRadius: 8 }}>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color="blue" bordered={false}>{seed.genre || '未定题材'}</Tag>
                        {asStringArray(seed.sub_genres).slice(0, 4).map(item => <Tag key={item} bordered={false}>{item}</Tag>)}
                      </Space>
                      <Text strong>{seed.title || seed.logline || '项目种子已生成'}</Text>
                      {seed.logline && <Text>{seed.logline}</Text>}
                      <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                        {seed.synopsis || seed.core_premise || seed.main_conflict || '模型已返回项目种子，但核心简介字段为空。可展开下方完整结构查看。'}
                      </Paragraph>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                        <Card size="small" title="主角" styles={{ body: { padding: 10 } }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {firstText(seed.protagonist?.name, seed.protagonist?.identity, '未提取')}
                            {firstText(seed.protagonist?.goal) ? `：${firstText(seed.protagonist?.goal)}` : ''}
                          </Text>
                        </Card>
                        <Card size="small" title="核心矛盾" styles={{ body: { padding: 10 } }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>{seed.main_conflict || seed.core_premise || '未提取'}</Text>
                        </Card>
                      </div>
                      {(seed.worldbuilding?.world_summary || seed.worldbuilding?.history_secret || seed.worldbuilding?.power_system) && (
                        <Card size="small" title="世界观摘要" styles={{ body: { padding: 10 } }}>
                          <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
                            {firstText(seed.worldbuilding?.world_summary, seed.worldbuilding?.history_secret, seed.worldbuilding?.power_system)}
                          </Paragraph>
                        </Card>
                      )}
                      {Array.isArray(seed.characters) && seed.characters.length > 0 && (
                        <Card size="small" title="关键人物" styles={{ body: { padding: 10 } }}>
                          <Space wrap>
                            {seed.characters.slice(0, 8).map((character: any, index: number) => (
                              <Tag key={`${character?.name || 'character'}-${index}`} bordered={false}>
                                {firstText(character?.name, character?.role_type, `人物${index + 1}`)}
                              </Tag>
                            ))}
                          </Space>
                        </Card>
                      )}
                      {(Array.isArray(seed.volume_outlines) || Array.isArray(seed.chapter_outlines)) && (
                        <Space wrap>
                          <Tag color="purple" bordered={false}>分卷 {seed.volume_outlines?.length || 0}</Tag>
                          <Tag color="geekblue" bordered={false}>章节细纲 {seed.chapter_outlines?.length || 0}</Tag>
                          <Tag color="cyan" bordered={false}>伏笔 {seed.foreshadowing_plan?.length || 0}</Tag>
                        </Space>
                      )}
                      {asStringArray(seed.open_questions).length > 0 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          待确认：{asStringArray(seed.open_questions).slice(0, 3).join('；')}
                        </Text>
                      )}
                      <details>
                        <summary style={{ cursor: 'pointer', color: '#1677ff' }}>查看完整项目种子 JSON</summary>
                        <pre style={{ maxHeight: 260, overflow: 'auto', marginTop: 8, padding: 10, background: '#f8fafc', borderRadius: 8, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                          {JSON.stringify(seed, null, 2)}
                        </pre>
                      </details>
                    </Space>
                  </Card>
                )}
              </Space>
            </Card>

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
                maxLength={500}
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
              {seed && (
                <div style={{ display: 'flex' }}>
                  <span style={{ minWidth: 80, color: '#999' }}>创意种子</span>
                  <span>已保存，并会自动创建分卷大纲、章节目录/细纲与伏笔计划</span>
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
