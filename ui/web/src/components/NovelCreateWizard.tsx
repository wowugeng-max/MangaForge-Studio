import React from 'react'
import { Alert, Button, Card, Collapse, Form, Input, Modal, Result, Segmented, Select, Space, Steps, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, ArrowRightOutlined, CheckCircleOutlined, RocketOutlined } from '@ant-design/icons'
import { CreateModeSection, type CreateWizardMode } from './novel-entry/create/CreateModeSection'
import { GenreGuideSection } from './novel-entry/create/GenreGuideSection'
import { SeedInputSection } from './novel-entry/create/SeedInputSection'
import { CreateStepHeader } from './novel-entry/create/CreateStepHeader'
import { CreateSummaryCard } from './novel-entry/create/CreateSummaryCard'
import { CREATE_MODE_LABELS, STEP0_SECTION_TITLES } from './novel-entry/create/createWizardCopy'
import {
  AUDIENCES,
  COMMERCIAL_TAGS,
  FEMALE_AUDIENCE_MODES,
  GENRES,
  LENGTH_TARGETS,
  STYLE_TAGS,
} from './novel-entry/create/createWizardOptions'
import { useCreateWizardController, type IncubationArtifact } from './novel-entry/create/useCreateWizardController'

export type { NovelCreateWizardProps } from './novel-entry/create/useCreateWizardController'

const { Text } = Typography

const ARTIFACT_KIND_ORDER = ['world_doc', 'character_sheet', 'outline_doc'] as const
const ARTIFACT_KIND_LABELS: Record<string, string> = {
  world_doc: '世界观',
  character_sheet: '角色',
  outline_doc: '大纲',
}

function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`
}

function groupArtifacts(artifacts: IncubationArtifact[]) {
  const groups = new Map<string, IncubationArtifact[]>()
  for (const artifact of artifacts) {
    const kind = artifact.artifact_kind || 'other'
    const list = groups.get(kind) || []
    list.push(artifact)
    groups.set(kind, list)
  }
  const ordered = ARTIFACT_KIND_ORDER.filter(kind => groups.has(kind)).map(kind => [kind, groups.get(kind)!] as const)
  const rest = [...groups.entries()].filter(([kind]) => !ARTIFACT_KIND_ORDER.includes(kind as typeof ARTIFACT_KIND_ORDER[number]))
  return [...ordered, ...rest]
}

export default function NovelCreateWizard({ open, onCancel, onSuccess }: {
  open: boolean
  onCancel: () => void
  onSuccess: (projectId: number) => void
}) {
  const {
    form,
    current,
    creating,
    seedIdea,
    setSeedIdea,
    createMode,
    setCreateMode,
    selectedGenreFramework,
    genreCatalogLoading,
    launchpad,
    modelsLoading,
    seedModelId,
    setSeedModelId,
    data,
    setData,
    updateLaunchpad,
    updateFirst30Plan,
    first30Summary,
    launchpadReadiness,
    activeGenreGuide,
    genreGuideGroups,
    handleNext,
    handlePrev,
    handleDone,
    handleModalCancel,
    steps,
    onFormChange,
    modelOptions,
    selectPrimaryGenre,
    selectGenreFramework,
    incubation,
    incubationBusy,
    startDeepDraftIncubation,
    adoptIncubation,
    discardIncubation,
    loadArtifactPreview,
    artifactPreview,
    previewLoadingId,
    adopting,
    discarding,
  } = useCreateWizardController({ open, onCancel, onSuccess })

  const isDeepDraft = createMode === 'deep_draft'
  const primaryDisabled = current === 0 && (
    !data.title.trim()
    || (createMode === 'manual' && !data.genre)
    || (isDeepDraft && (!seedIdea.trim() || !seedModelId || incubation.phase === 'awaiting_selection'))
  )

  return (
    <Modal
      open={open}
      onCancel={handleModalCancel}
      footer={null}
      width={900}
      maskClosable={false}
      style={{ top: 24 }}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 4px 0' }}>新书商业长篇启动台</h2>
        <p style={{ color: '#666', margin: 0 }}>
          {isDeepDraft ? '深度孵化：先建空项目，再跑 oh-story 开书，停在细纲后人工采纳' : '先确认卖点、前30章和长线承载，再进入故事规划'}
        </p>
      </div>

      {!isDeepDraft && (
        <Steps
          current={current}
          items={steps}
          style={{ marginBottom: 32 }}
          size="small"
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onValuesChange={onFormChange}
      >

        {current === 0 && (
          <>
            <Space direction="vertical" size={12} style={{ width: '100%', marginBottom: 16 }}>
              <CreateModeSection
                value={createMode}
                onChange={(mode: CreateWizardMode) => {
                  setCreateMode(mode)
                }}
              />

              <GenreGuideSection
                primaryGenre={data.genre}
                onPrimaryChange={selectPrimaryGenre}
                groups={genreGuideGroups}
                selectedFramework={selectedGenreFramework || ''}
                loading={genreCatalogLoading}
                onSelectFramework={selectGenreFramework}
              />

              {isDeepDraft && (
                <SeedInputSection
                  title={data.title}
                  lengthTarget={data.length_target}
                  idea={seedIdea}
                  modelId={seedModelId}
                  modelOptions={modelOptions}
                  draftOptions={[]}
                  loading={incubationBusy}
                  modelsLoading={modelsLoading}
                  showDraftControls={false}
                  showAutoCreate={false}
                  lengthOptions={LENGTH_TARGETS}
                  onTitleChange={value => setData(prev => ({ ...prev, title: value }))}
                  onLengthChange={value => setData(prev => ({ ...prev, length_target: value }))}
                  onIdeaChange={setSeedIdea}
                  onModelChange={setSeedModelId}
                  onDraftChange={() => {}}
                  onGenerate={startDeepDraftIncubation}
                  onSaveDraft={() => {}}
                  onLoadDraft={() => {}}
                  onDeleteDraft={() => {}}
                  generateLabel="开始深度孵化"
                />
              )}

              {isDeepDraft && incubation.phase !== 'idle' && (
                <Card size="small" title={STEP0_SECTION_TITLES.progress} style={{ borderRadius: 12 }}>
                  <Space direction="vertical" size={10} style={{ width: '100%' }}>
                    {incubation.phase === 'creating' && (
                      <Text>正在创建空项目…</Text>
                    )}
                    {incubation.phase === 'running' && (
                      <>
                        <Space wrap>
                          <Tag color="processing" bordered={false}>phase: running</Tag>
                          <Tag bordered={false}>已用时 {formatElapsed(incubation.elapsedMs)}</Tag>
                        </Space>
                        <Text type="secondary">{incubation.hint || '内核开书进行中'}</Text>
                      </>
                    )}
                    {incubation.phase === 'failed' && (
                      <Alert
                        type="error"
                        showIcon
                        message={`孵化失败：${incubation.errorCode}`}
                        description={incubation.jobId ? `job ${incubation.jobId}` : '任务尚未创建成功'}
                      />
                    )}
                    {incubation.phase === 'awaiting_selection' && (
                      <>
                        <Alert
                          type="success"
                          showIcon
                          message="开书已停在细纲，请预览后采纳或丢弃"
                        />
                        {groupArtifacts(incubation.artifacts).map(([kind, items]) => (
                          <div key={kind}>
                            <Text strong style={{ fontSize: 12, color: '#64748b' }}>
                              {ARTIFACT_KIND_LABELS[kind] || kind}
                            </Text>
                            <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                              {items.map(item => (
                                <Collapse
                                  key={item.id}
                                  size="small"
                                  activeKey={artifactPreview?.id === item.id ? [item.id] : []}
                                  onChange={() => { void loadArtifactPreview(item) }}
                                  items={[{
                                    key: item.id,
                                    label: `${item.rel_path || item.id}${previewLoadingId === item.id ? '（加载中）' : ''}`,
                                    children: artifactPreview?.id === item.id ? (
                                      <pre style={{
                                        margin: 0,
                                        maxHeight: 280,
                                        overflow: 'auto',
                                        whiteSpace: 'pre-wrap',
                                        fontSize: 12,
                                        background: '#f8fafc',
                                        padding: 8,
                                        borderRadius: 8,
                                      }}>
                                        {artifactPreview.content || '（空）'}
                                        {artifactPreview.truncated ? '\n\n…（已截断）' : ''}
                                      </pre>
                                    ) : (
                                      <Text type="secondary">点击加载只读预览</Text>
                                    ),
                                  }]}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                        <Space>
                          <Button
                            type="primary"
                            icon={<RocketOutlined />}
                            loading={adopting}
                            disabled={!incubation.candidateId || discarding}
                            onClick={() => adoptIncubation(incubation.candidateId)}
                          >
                            采纳
                          </Button>
                          <Button
                            danger
                            loading={discarding}
                            disabled={adopting}
                            onClick={() => { void discardIncubation() }}
                          >
                            丢弃
                          </Button>
                        </Space>
                      </>
                    )}
                  </Space>
                </Card>
              )}
            </Space>

            {createMode === 'manual' && (
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

                <Form.Item name="female_audience_mode" label="女频长篇口径">
                  <Segmented
                    block
                    options={FEMALE_AUDIENCE_MODES}
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
          </>
        )}

        {current === 1 && (
          <>
            <CreateStepHeader
              title="商业钩子"
              tags={[
                { label: '读者承诺', ok: Boolean(launchpad.reader_promise.trim()) },
                { label: '核心卖点', ok: Boolean(launchpad.core_selling_point.trim()) },
                { label: '主角处境', ok: Boolean(launchpad.protagonist_situation.trim()) },
                { label: '主角压力', ok: Boolean(launchpad.protagonist_pressure.trim()) },
                { label: '开篇钩子', ok: Boolean(launchpad.opening_hook.trim()) },
              ]}
            />
            <Form.Item label="读者承诺">
              <Input.TextArea
                rows={2}
                value={launchpad.reader_promise}
                onChange={event => updateLaunchpad({ reader_promise: event.target.value })}
                placeholder="读者追下去能持续获得什么满足感"
                maxLength={300}
                showCount
              />
            </Form.Item>

            <Form.Item label="核心卖点">
              <Input.TextArea
                rows={2}
                value={launchpad.core_selling_point}
                onChange={event => updateLaunchpad({ core_selling_point: event.target.value })}
                placeholder="一句话说明本书最有商业辨识度的爽点"
                maxLength={300}
                showCount
              />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <Form.Item label="主角处境">
                <Input.TextArea
                  rows={3}
                  value={launchpad.protagonist_situation}
                  onChange={event => updateLaunchpad({ protagonist_situation: event.target.value })}
                  placeholder="主角开局身份、资源、关系和位置"
                />
              </Form.Item>
              <Form.Item label="主角压力">
                <Input.TextArea
                  rows={3}
                  value={launchpad.protagonist_pressure}
                  onChange={event => updateLaunchpad({ protagonist_pressure: event.target.value })}
                  placeholder="开局必须解决的危机、倒计时或损失"
                />
              </Form.Item>
            </div>

            <Form.Item label="开篇钩子">
              <Input.TextArea
                rows={3}
                value={launchpad.opening_hook}
                onChange={event => updateLaunchpad({ opening_hook: event.target.value })}
                placeholder="第1章要抛出的冲突、反差或承诺"
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

        {current === 2 && (
          <>
            <CreateStepHeader
              title="长线承载"
              tags={[
                { label: '主线目标', ok: Boolean(launchpad.mainline_goal.trim()) },
                { label: '长线冲突', ok: Boolean(launchpad.long_term_conflict.trim()) },
                { label: '成长引擎', ok: Boolean(launchpad.growth_engine.trim()) },
                { label: '分卷方向', ok: Boolean(launchpad.volume_direction.trim()) },
              ]}
            />
            <Form.Item label="长篇主线目标">
              <Input.TextArea
                rows={2}
                value={launchpad.mainline_goal}
                onChange={event => updateLaunchpad({ mainline_goal: event.target.value })}
                placeholder="贯穿全书的长期目标"
              />
            </Form.Item>

            <Form.Item label="长线冲突引擎">
              <Input.TextArea
                rows={2}
                value={launchpad.long_term_conflict}
                onChange={event => updateLaunchpad({ long_term_conflict: event.target.value })}
                placeholder="主角、反派、制度或世界规则之间的长期对抗"
              />
            </Form.Item>

            <Form.Item label="成长引擎">
              <Input.TextArea
                rows={2}
                value={launchpad.growth_engine}
                onChange={event => updateLaunchpad({ growth_engine: event.target.value })}
                placeholder="等级、能力、产业、关系或认知如何持续升级"
              />
            </Form.Item>

            <Form.Item label="分卷方向">
              <Input.TextArea
                rows={3}
                value={launchpad.volume_direction}
                onChange={event => updateLaunchpad({ volume_direction: event.target.value })}
                placeholder="每卷推进什么目标、地图或阶段性矛盾"
              />
            </Form.Item>

            <Form.Item label="可扩展资产池">
              <Input.TextArea
                rows={3}
                value={launchpad.expandable_assets}
                onChange={event => updateLaunchpad({ expandable_assets: event.target.value })}
                placeholder="人物、组织、地图、道具、谜题、伏笔等可长期调用的资产"
              />
            </Form.Item>

            <Form.Item label="未来100章备注">
              <Input.TextArea
                rows={3}
                value={launchpad.future100_note}
                onChange={event => updateLaunchpad({ future100_note: event.target.value })}
                placeholder="第31-100章的阶段方向、升级节奏或风险点"
              />
            </Form.Item>
          </>
        )}

        {current === 3 && (
          <>
            <CreateStepHeader
              title="前30章"
              tags={[
                { label: '1-3章', ok: first30Summary.hasOpening || Boolean(launchpad.first30_plan.chapters_1_3.trim()) },
                { label: '4-10章', ok: first30Summary.hasTrialRead || Boolean(launchpad.first30_plan.chapters_4_10.trim()) },
                { label: '11-30章', ok: first30Summary.hasPaidBuildup || Boolean(launchpad.first30_plan.chapters_11_30.trim()) },
                { label: `细纲 ${first30Summary.outlineCount}`, ok: first30Summary.outlineCount > 0 },
                { label: '首写任务', ok: Boolean(launchpad.first_writing_task.trim()) },
              ]}
            />

            <Form.Item label="1-3章：开篇承诺">
              <Input.TextArea
                rows={3}
                value={launchpad.first30_plan.chapters_1_3}
                onChange={event => updateFirst30Plan({ chapters_1_3: event.target.value })}
                placeholder="开局冲突、主角反差、读者第一口爽点"
              />
            </Form.Item>

            <Form.Item label="4-10章：试读闭环">
              <Input.TextArea
                rows={3}
                value={launchpad.first30_plan.chapters_4_10}
                onChange={event => updateFirst30Plan({ chapters_4_10: event.target.value })}
                placeholder="试读期要解决的小闭环和继续追读的悬念"
              />
            </Form.Item>

            <Form.Item label="11-30章：付费蓄势">
              <Input.TextArea
                rows={4}
                value={launchpad.first30_plan.chapters_11_30}
                onChange={event => updateFirst30Plan({ chapters_11_30: event.target.value })}
                placeholder="付费章节前后的升级、反转、阶段敌人和更大目标"
              />
            </Form.Item>

            <Form.Item label="第一项写作任务">
              <Input
                value={launchpad.first_writing_task}
                onChange={event => updateLaunchpad({ first_writing_task: event.target.value })}
                placeholder="例如：完善第1章场景卡"
              />
            </Form.Item>
          </>
        )}

      </Form>

      {current === 4 && (
        <div style={{ borderRadius: 12 }}>
          <CreateStepHeader
            title="确认创建"
            tags={[
              { label: launchpadReadiness.sellable.title, ok: launchpadReadiness.sellable.ready },
              { label: launchpadReadiness.first30.title, ok: launchpadReadiness.first30.ready },
              { label: launchpadReadiness.longform.title, ok: launchpadReadiness.longform.ready },
            ]}
          />
          <CreateSummaryCard
            modeLabel={CREATE_MODE_LABELS[createMode].title}
            title={data.title}
            genre={data.genre}
            framework={selectedGenreFramework || activeGenreGuide?.framework || (data.sub_genres || [])[0] || ''}
            lengthLabel={LENGTH_TARGETS.find(item => item.value === data.length_target)?.label || '中篇'}
            volumeCount={0}
            chapterCount={0}
            foreshadowingCount={0}
            readinessTags={[
              { label: `${launchpadReadiness.sellable.title}${launchpadReadiness.sellable.ready ? '就绪' : '待补'}`, ok: launchpadReadiness.sellable.ready },
              { label: `${launchpadReadiness.first30.title}${launchpadReadiness.first30.ready ? '就绪' : '待补'}`, ok: launchpadReadiness.first30.ready },
              { label: `${launchpadReadiness.longform.title}${launchpadReadiness.longform.ready ? '就绪' : '待补'}`, ok: launchpadReadiness.longform.ready },
            ]}
            topRisks={launchpadReadiness.risks.filter(Boolean).slice(0, 8)}
          />
        </div>
      )}

      {current === 5 && (
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
            <Button key="close" onClick={handleModalCancel} size="large"> 留在项目大厅
            </Button>,
          ]}
        />
      )}

      {current < 5 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handlePrev}
            disabled={current === 0 || isDeepDraft}
          >
            上一步
          </Button>
          <Space>
            <Button onClick={handleModalCancel}> 取消</Button>
            {!(isDeepDraft && incubation.phase === 'awaiting_selection') && (
              <Button
                type="primary"
                icon={current === 4 || isDeepDraft ? <RocketOutlined /> : <ArrowRightOutlined />}
                onClick={handleNext}
                loading={creating || incubationBusy}
                disabled={primaryDisabled}
              >
                {isDeepDraft ? '开始深度孵化' : current === 4 ? '创建项目' : '下一步'}
              </Button>
            )}
          </Space>
        </div>
      )}
    </Modal>
  )
}
