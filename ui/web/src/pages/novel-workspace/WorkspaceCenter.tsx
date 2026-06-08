import React from 'react'
import { Button, Card, Col, InputNumber, Popover, Progress, Row, Slider, Space, Tag, Tooltip, Typography } from 'antd'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { EditorState } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
} from '@codemirror/view'
import {
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownOutlined,
  EditOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FontSizeOutlined,
  LineHeightOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  SettingOutlined,
  SyncOutlined,
  UpOutlined,
} from '@ant-design/icons'
import { chapterStatusTag, displayValue, wc } from './utils'
import {
  buildNovelDraftBriefSummary,
  buildNovelDeliverySummary,
  buildNovelWritingRecommendation,
  buildNovelWritingResponsibility,
  type NovelDeliveryActionKey,
  type NovelDeliverySummaryInput,
  type NovelWritingRecommendedActionKey,
  type NovelWritingRecommendation,
} from './writingRecommendationModel'
import './WorkspaceCenter.css'

const { Title, Text, Paragraph } = Typography

type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'
type EditorDisplayPrefs = { fontSize: number; lineHeight: number }
type ChapterWordTargetMode = 'standard' | 'long' | 'custom'

const EDITOR_DISPLAY_PREFS_KEY = 'novel.workspace.editorDisplayPrefs'
const NOVEL_WRITING_DESK_COLLAPSED_KEY = 'novel.workspace.writingDeskCollapsed'
const DEFAULT_EDITOR_DISPLAY_PREFS: EditorDisplayPrefs = { fontSize: 17, lineHeight: 32 }
const EDITOR_DISPLAY_PRESETS: Array<EditorDisplayPrefs & { key: string; label: string }> = [
  { key: 'webNovel', label: '网文标准', fontSize: 17, lineHeight: 32 },
  { key: 'review', label: '宽松审稿', fontSize: 18, lineHeight: 38 },
  { key: 'sprint', label: '紧凑冲刺', fontSize: 16, lineHeight: 28 },
]

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, Math.round(numeric)))
}

function loadEditorDisplayPrefs(): EditorDisplayPrefs {
  if (typeof window === 'undefined') return DEFAULT_EDITOR_DISPLAY_PREFS
  try {
    const raw = window.localStorage.getItem(EDITOR_DISPLAY_PREFS_KEY)
    if (!raw) return DEFAULT_EDITOR_DISPLAY_PREFS
    const parsed = JSON.parse(raw)
    return {
      fontSize: clampNumber(parsed?.fontSize, 15, 26, DEFAULT_EDITOR_DISPLAY_PREFS.fontSize),
      lineHeight: clampNumber(parsed?.lineHeight, 24, 48, DEFAULT_EDITOR_DISPLAY_PREFS.lineHeight),
    }
  } catch {
    return DEFAULT_EDITOR_DISPLAY_PREFS
  }
}

function saveEditorDisplayPrefs(prefs: EditorDisplayPrefs) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(EDITOR_DISPLAY_PREFS_KEY, JSON.stringify(prefs))
}

function loadWritingDeskCollapsed() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(NOVEL_WRITING_DESK_COLLAPSED_KEY) === 'true'
}

function saveWritingDeskCollapsed(collapsed: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(NOVEL_WRITING_DESK_COLLAPSED_KEY, collapsed ? 'true' : 'false')
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'unsaved') return <Tooltip title="有未保存的修改"><ClockCircleOutlined style={{ color: '#faad14' }} /></Tooltip>
  if (status === 'saving') return <Tooltip title="保存中…"><SyncOutlined style={{ color: '#1677ff', animation: 'spin 1s linear infinite' }} /></Tooltip>
  if (status === 'saved') return <Tooltip title="已保存"><CheckCircleOutlined style={{ color: '#52c41a' }} /></Tooltip>
  return null
}

function EditorDisplayControls({
  prefs,
  onChange,
}: {
  prefs: EditorDisplayPrefs
  onChange: (prefs: EditorDisplayPrefs) => void
}) {
  const changePrefs = (patch: Partial<EditorDisplayPrefs>) => {
    onChange({
      fontSize: clampNumber(patch.fontSize ?? prefs.fontSize, 15, 26, DEFAULT_EDITOR_DISPLAY_PREFS.fontSize),
      lineHeight: clampNumber(patch.lineHeight ?? prefs.lineHeight, 24, 48, DEFAULT_EDITOR_DISPLAY_PREFS.lineHeight),
    })
  }

  const resetPrefs = () => onChange(DEFAULT_EDITOR_DISPLAY_PREFS)
  const applyPreset = (preset: EditorDisplayPrefs) => onChange(preset)

  const content = (
    <div style={{ width: 260, padding: '4px 2px 0' }}>
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
        <Space.Compact block>
          {EDITOR_DISPLAY_PRESETS.map(preset => (
            <Button
              key={preset.key}
              size="small"
              type={prefs.fontSize === preset.fontSize && prefs.lineHeight === preset.lineHeight ? 'primary' : 'default'}
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </Button>
          ))}
        </Space.Compact>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <FontSizeOutlined style={{ color: '#667085' }} />
            <Text style={{ fontSize: 13 }}>字体大小</Text>
            <Text type="secondary" style={{ marginLeft: 'auto', fontSize: 12 }}>{prefs.fontSize}px</Text>
          </div>
          <Slider min={15} max={26} value={prefs.fontSize} onChange={fontSize => changePrefs({ fontSize })} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <LineHeightOutlined style={{ color: '#667085' }} />
            <Text style={{ fontSize: 13 }}>行距</Text>
            <Text type="secondary" style={{ marginLeft: 'auto', fontSize: 12 }}>{prefs.lineHeight}px</Text>
          </div>
          <Slider min={24} max={48} value={prefs.lineHeight} onChange={lineHeight => changePrefs({ lineHeight })} />
        </div>
        <Button size="small" block onClick={resetPrefs}>恢复默认</Button>
      </Space>
    </div>
  )

  return (
    <Popover content={content} trigger="click" placement="bottomRight">
      <Tooltip title="编辑显示设置">
        <Button size="small" icon={<FontSizeOutlined />} />
      </Tooltip>
    </Popover>
  )
}

function ProseEditor({
  value,
  displayPrefs,
  proseEditorRef,
  onChange,
}: {
  value: string
  displayPrefs: EditorDisplayPrefs
  proseEditorRef: React.MutableRefObject<EditorView | null>
  onChange: (text: string) => void
}) {
  const hostRef = React.useRef<HTMLDivElement | null>(null)
  const viewRef = React.useRef<EditorView | null>(null)
  const onChangeRef = React.useRef(onChange)
  const valueRef = React.useRef(value)

  React.useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  React.useEffect(() => {
    valueRef.current = value
    const view = viewRef.current
    if (!view || view.state.doc.toString() === value) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    })
  }, [value])

  React.useEffect(() => {
    if (!hostRef.current || viewRef.current) return

    const proseTheme = EditorView.theme({
      '&': {
        height: '100%',
        background: '#fff',
        color: '#1f2328',
        fontSize: 'var(--novel-editor-font-size)',
      },
      '.cm-scroller': {
        height: '100%',
        overflow: 'auto',
        fontFamily: 'Noto Serif SC, "Source Han Serif SC", "Songti SC", Georgia, "Times New Roman", serif',
        lineHeight: 'var(--novel-editor-line-height)',
      },
      '.cm-content': {
        minHeight: '100%',
        padding: '48px 80px 80px 56px',
        caretColor: '#1677ff',
        letterSpacing: '0',
      },
      '.cm-line': {
        padding: '0',
        lineHeight: 'var(--novel-editor-line-height)',
      },
      '.cm-gutters': {
        minHeight: '100%',
        background: '#f7f8fa',
        color: '#9aa4b2',
        borderRight: '1px solid #e1e6ee',
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.7)',
      },
      '.cm-lineNumbers': {
        minWidth: '72px',
      },
      '.cm-lineNumbers .cm-gutterElement': {
        minWidth: '72px',
        padding: '0 14px 0 0',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: '12px',
        lineHeight: 'var(--novel-editor-line-height)',
      },
      '.cm-activeLineGutter': {
        background: '#edf3ff',
        color: '#2563eb',
      },
      '.cm-activeLine': {
        background: 'rgba(37, 99, 235, 0.035)',
      },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        background: 'rgba(22, 119, 255, 0.22)',
      },
      '&.cm-focused': {
        outline: 'none',
      },
      '.cm-placeholder': {
        color: '#a8b0bc',
      },
    })

    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: valueRef.current || '',
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          drawSelection(),
          history(),
          EditorView.lineWrapping,
          placeholder('开始写吧……（自动保存）'),
          keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
          EditorView.updateListener.of(update => {
            if (!update.docChanged) return
            const next = update.state.doc.toString()
            valueRef.current = next
            onChangeRef.current(next)
          }),
          proseTheme,
        ],
      }),
    })

    viewRef.current = view
    proseEditorRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
      proseEditorRef.current = null
    }
  }, [proseEditorRef])

  return (
    <div style={{
      flex: 1,
      minHeight: 0,
      background: '#f3f5f8',
      borderTop: '1px solid #e8edf3',
      overflow: 'hidden',
      '--novel-editor-font-size': `${displayPrefs.fontSize}px`,
      '--novel-editor-line-height': `${displayPrefs.lineHeight}px`,
    } as React.CSSProperties & Record<string, string>}>
      <div ref={hostRef} style={{ height: '100%', minHeight: 0 }} />
    </div>
  )
}

export function WorkspaceCenter({
  isEmptyProject,
  selectedProject,
  activeChapter,
  materialScore,
  worldbuildingCount,
  characterCount,
  outlineCount,
  streamingChapterId,
  streamingText,
  streamingProgress,
  streamingPercent,
  generationPipeline,
  streamingEndRef,
  proseEditorRef,
  saveStatus,
  planning,
  incubatingOriginal,
  generatingProse,
  generatingSceneCards,
  preDraftBriefLoading,
  diagnosticsLoading,
  pipelineLoading,
  editorReportLoading,
  onRunPlan,
  onCreateOutline,
  onCreateChapter,
  onRunOriginalIncubator,
  onOpenReferenceConfig,
  onOpenWritingBibleEditor,
  onGenerateCurrentChapterProse,
  onRepairAndGenerateCurrentChapter,
  onGenerateSceneCards,
  onBuildPreDraftBrief,
  onConfirmPreDraftBrief,
  onOpenGenerationDiagnostics,
  onOpenQualityCard,
  onStartChapterPipeline,
  onCreateEditorReport,
  onEditActiveChapter,
  onOpenStoryAssets,
  onChapterTextChange,
  generationWordTargetMode = 'standard',
  generationTargetWordCount = 3000,
  onGenerationWordTargetModeChange,
  onGenerationTargetWordCountChange,
  writingRecommendation,
  chapterAcceptanceDesk,
  deliveryActionLoading,
  onDeliveryAction,
}: {
  isEmptyProject: boolean
  selectedProject: any | null
  activeChapter: any | null
  materialScore?: any
  worldbuildingCount: number
  characterCount: number
  outlineCount: number
  streamingChapterId: number | null
  streamingText: string
  streamingProgress: string
  streamingPercent: number
  generationPipeline?: any[]
  streamingEndRef: React.RefObject<HTMLDivElement | null>
  proseEditorRef: React.MutableRefObject<EditorView | null>
  saveStatus: SaveStatus
  planning: boolean
  incubatingOriginal: boolean
  generatingProse: boolean
  generatingSceneCards: boolean
  preDraftBriefLoading?: boolean
  diagnosticsLoading: boolean
  pipelineLoading: boolean
  editorReportLoading: boolean
  onRunPlan: () => void
  onCreateOutline: () => void
  onCreateChapter: () => void
  onRunOriginalIncubator: () => void
  onOpenReferenceConfig: () => void
  onOpenWritingBibleEditor: () => void
  onGenerateCurrentChapterProse: () => void
  onRepairAndGenerateCurrentChapter: () => void
  onGenerateSceneCards: () => void
  onBuildPreDraftBrief?: () => void
  onConfirmPreDraftBrief?: () => void
  onOpenGenerationDiagnostics: () => void
  onOpenQualityCard: () => void
  onStartChapterPipeline: () => void
  onCreateEditorReport: () => void
  onEditActiveChapter: () => void
  onOpenStoryAssets?: (focus?: 'discoveredAssets') => void
  onChapterTextChange: (text: string) => void
  generationWordTargetMode?: ChapterWordTargetMode
  generationTargetWordCount?: number
  onGenerationWordTargetModeChange?: (mode: ChapterWordTargetMode) => void
  onGenerationTargetWordCountChange?: (count: number) => void
  writingRecommendation?: NovelWritingRecommendation
  chapterAcceptanceDesk?: NovelDeliverySummaryInput | null
  deliveryActionLoading?: boolean
  onDeliveryAction?: (key: NovelDeliveryActionKey) => void
}) {
  const [editorDisplayPrefs, setEditorDisplayPrefs] = React.useState<EditorDisplayPrefs>(() => loadEditorDisplayPrefs())
  const [writingDeskCollapsed, setWritingDeskCollapsed] = React.useState(() => loadWritingDeskCollapsed())
  const materialReady = !materialScore || Boolean(materialScore.can_generate)
  const materialRecommendations = Array.isArray(materialScore?.recommendations)
    ? materialScore.recommendations.filter(Boolean)
    : []
  const requiredAdvances = Array.isArray(activeChapter?.raw_payload?.must_advance)
    ? activeChapter.raw_payload.must_advance.filter(Boolean)
    : []
  const forbiddenRepeats = Array.isArray(activeChapter?.raw_payload?.forbidden_repeats)
    ? activeChapter.raw_payload.forbidden_repeats.filter(Boolean)
    : []
  const sceneCards = activeChapter && Array.isArray(activeChapter.scene_list) && activeChapter.scene_list.length > 0
    ? activeChapter.scene_list
    : (activeChapter && Array.isArray(activeChapter.scene_breakdown) ? activeChapter.scene_breakdown : [])
  const firstScene = sceneCards[0]
  const dependencyText = [
    worldbuildingCount > 0 ? '世界观已备' : '缺世界观',
    characterCount > 0 ? '角色已备' : '缺角色',
    outlineCount > 0 ? '大纲已备' : '缺大纲',
  ].join(' · ')
  const activeWordCount = wc(activeChapter?.chapter_text)
  const recommendedAction = writingRecommendation ?? buildNovelWritingRecommendation({
    materialReady,
    materialRecommendations,
    sceneCardCount: sceneCards.length,
    activeWordCount,
  })
  const aiResponsibility = buildNovelWritingResponsibility(recommendedAction)
  const deliverySummary = buildNovelDeliverySummary(chapterAcceptanceDesk)
  const draftBriefSummary = buildNovelDraftBriefSummary({
    activeWordCount,
    chapterGoal: activeChapter?.chapter_goal || activeChapter?.chapter_summary,
    conflict: activeChapter?.conflict,
    endingHook: activeChapter?.ending_hook,
    sceneCardCount: sceneCards.length,
    preDraftBrief: activeChapter?.raw_payload?.pre_draft_brief || null,
  })
  const recommendedClass = (key: NovelWritingRecommendedActionKey) => key === recommendedAction.key ? 'novel-editor-recommended-action' : undefined
  const commandClass = (key?: NovelWritingRecommendedActionKey, extra = '') => [
    'novel-editor-command-pill',
    key ? recommendedClass(key) : '',
    extra,
  ].filter(Boolean).join(' ')
  const selectWordPreset = (mode: Exclude<ChapterWordTargetMode, 'custom'>) => {
    onGenerationWordTargetModeChange?.(mode)
    onGenerationTargetWordCountChange?.(mode === 'long' ? 10000 : 3000)
  }
  const renderWordTargetControl = () => (
    <div className="novel-word-target-control" aria-label="章节字数目标">
      <Tooltip title="标准章节，适合日常连载更新">
        <Button
          size="small"
          className="novel-word-preset"
          type={generationWordTargetMode === 'standard' ? 'primary' : 'default'}
          onClick={() => selectWordPreset('standard')}
        >
          标准章
        </Button>
      </Tooltip>
      <Tooltip title="长章，适合高潮、战斗或阶段收束">
        <Button
          size="small"
          className="novel-word-preset"
          type={generationWordTargetMode === 'long' ? 'primary' : 'default'}
          onClick={() => selectWordPreset('long')}
        >
          长章
        </Button>
      </Tooltip>
      <Tooltip title="手动输入本次生成的目标字数">
        <InputNumber
          size="small"
          min={1000}
          max={12000}
          step={500}
          value={generationTargetWordCount}
          controls={false}
          className={generationWordTargetMode === 'custom' ? 'is-custom' : undefined}
          formatter={(value) => `${value || 0}`}
          parser={(value) => Number(String(value || '').replace(/[^\d]/g, ''))}
          onChange={(value) => {
            const next = clampNumber(value, 1000, 12000, 3000)
            onGenerationTargetWordCountChange?.(next)
            onGenerationWordTargetModeChange?.('custom')
          }}
        />
      </Tooltip>
      <span className="novel-word-target-unit">字</span>
    </div>
  )
  const recommendedBadge = (phase: typeof recommendedAction.phase) => (
    phase === recommendedAction.phase ? <span className="novel-editor-recommended-badge">推荐下一步</span> : null
  )

  React.useEffect(() => {
    saveEditorDisplayPrefs(editorDisplayPrefs)
  }, [editorDisplayPrefs])

  React.useEffect(() => {
    saveWritingDeskCollapsed(writingDeskCollapsed)
  }, [writingDeskCollapsed])

  const secondaryActionMenu = (
    <div className="novel-editor-action-popover">
      <div className="novel-editor-action-group novel-editor-action-group-prep">
        <div className="novel-editor-action-group-heading">
          <Text className="novel-editor-action-group-label">写前准备</Text>
          {recommendedBadge('prep')}
        </div>
        <Button size="small" className={commandClass('diagnostics')} loading={diagnosticsLoading} onClick={onOpenGenerationDiagnostics}>诊断</Button>
        <Button size="small" className={commandClass('scene_cards')} icon={<FileTextOutlined />} loading={generatingSceneCards} onClick={onGenerateSceneCards}>场景卡</Button>
        <Button size="small" className={commandClass(undefined, 'novel-editor-muted-command')} onClick={onEditActiveChapter} icon={<EditOutlined />}>元数据</Button>
      </div>
      <div className="novel-editor-action-group novel-editor-action-group-draft">
        <div className="novel-editor-action-group-heading">
          <Text className="novel-editor-action-group-label">生成正文</Text>
          {recommendedBadge('draft')}
        </div>
        <Button size="small" className={commandClass(undefined, 'novel-editor-muted-command')} loading={pipelineLoading} onClick={onStartChapterPipeline}>流水线</Button>
        {!materialReady && (
          <Button type="primary" size="small" className={commandClass('repair_generate', 'novel-editor-primary-command')} icon={<PlayCircleOutlined />} loading={generatingProse} onClick={onRepairAndGenerateCurrentChapter}>
            补齐并生成
          </Button>
        )}
        <Button type={materialReady ? 'primary' : 'default'} size="small" className={commandClass('generate', materialReady ? 'novel-editor-primary-command' : '')} icon={<PlayCircleOutlined />} loading={generatingProse} onClick={onGenerateCurrentChapterProse}>
          生成
        </Button>
        {renderWordTargetControl()}
      </div>
      <div className="novel-editor-action-group novel-editor-action-group-review">
        <div className="novel-editor-action-group-heading">
          <Text className="novel-editor-action-group-label">写后复检</Text>
          {recommendedBadge('review')}
        </div>
        <Button size="small" className={commandClass('quality_card')} onClick={onOpenQualityCard}>交稿质检</Button>
        <Button size="small" className={commandClass(undefined, 'novel-editor-muted-command')} loading={editorReportLoading} onClick={onCreateEditorReport}>编辑报告</Button>
      </div>
    </div>
  )

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fafbfc' }}>
      {isEmptyProject && (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 32 }}>
          <div style={{ maxWidth: 860, width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Title level={3} style={{ marginBottom: 8 }}>开始创作《{selectedProject?.title}》</Title>
              <Text type="secondary">
                先选择原创或参考路线，再建立写作圣经、章节规划和正文生产流水线。
              </Text>
            </div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 32 }}>
              推荐按以下路径起步；后续左侧生产向导会持续提示下一步。
            </Text>
            <Row gutter={24} justify="center">
              {[
                {
                  icon: <ExperimentOutlined />,
                  title: '原创孵化',
                  desc: '从题材定位、读者承诺、世界观、主角和前 30 章章纲开始。',
                  btn: <Button type="primary" loading={incubatingOriginal} onClick={onRunOriginalIncubator}>生成原创方案</Button>,
                },
                {
                  icon: <BookOutlined />,
                  title: '参考仿写',
                  desc: '先配置参考作品，提炼节奏、结构和爽点模型，再进入安全迁移。',
                  btn: <Button onClick={onOpenReferenceConfig}>配置参考作品</Button>,
                },
                {
                  icon: <SettingOutlined />,
                  title: '手动起步',
                  desc: '人工创建大纲、写作圣经或第一章，适合已有完整构思的项目。',
                  btn: (
                    <Space>
                      <Button loading={planning} onClick={onRunPlan}>AI 规划</Button>
                      <Button onClick={onOpenWritingBibleEditor}>写作圣经</Button>
                      <Button onClick={onCreateOutline}>创建大纲</Button>
                      <Button onClick={onCreateChapter}>第一章</Button>
                    </Space>
                  ),
                },
              ].map(card => (
                <Col key={card.title} xs={24} md={8}>
                  <Card hoverable style={{ borderRadius: 8, height: '100%' }}
                    styles={{ body: { padding: 20, display: 'flex', flexDirection: 'column', height: '100%' } }}>
                    <div style={{ fontSize: 28, color: '#1677ff', marginBottom: 12 }}>{card.icon}</div>
                    <Title level={5} style={{ marginTop: 0 }}>{card.title}</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 18, minHeight: 66 }}>{card.desc}</Text>
                    <div style={{ marginTop: 'auto' }}>
                    {card.btn}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      )}

      {!isEmptyProject && activeChapter && (
        <>
          <div className={`novel-editor-toolbar ${writingDeskCollapsed ? 'novel-editor-toolbar-collapsed' : ''}`} style={{
            flexShrink: 0,
          }}>
            <div className="novel-editor-toolbar-meta">
              <Title className="novel-editor-title" level={5} style={{ margin: 0 }}>
                第{activeChapter.chapter_no}章《{displayValue(activeChapter.title) || '无标题'}》
              </Title>
              <div className="novel-editor-status-stack">
                {chapterStatusTag(activeChapter)}
                {materialScore && (
                  <Tooltip title={(materialScore.recommendations || []).slice(0, 4).join('；') || '材料完整度'}>
                    <Tag color={materialScore.can_generate ? 'green' : Number(materialScore.score || 0) >= 65 ? 'gold' : 'red'} bordered={false}>
                      材料 {materialScore.score ?? '-'}%
                    </Tag>
                  </Tooltip>
                )}
              </div>
            </div>
            <div className="novel-editor-toolbar-controls">
              <Text className="novel-editor-word-count" type="secondary">{wc(activeChapter.chapter_text)} 字</Text>
              <SaveIndicator status={saveStatus} />
              <EditorDisplayControls prefs={editorDisplayPrefs} onChange={setEditorDisplayPrefs} />
              <Tooltip title={writingDeskCollapsed ? '展开写作指挥台' : '收起写作指挥台'}>
                <Button
                  size="small"
                  className="novel-editor-desk-toggle"
                  icon={writingDeskCollapsed ? <DownOutlined /> : <UpOutlined />}
                  onClick={() => setWritingDeskCollapsed(prev => !prev)}
                >
                  {writingDeskCollapsed ? '展开指挥台' : '收起指挥台'}
                </Button>
              </Tooltip>
            </div>
            <Tooltip title={`${recommendedAction.label}：${recommendedAction.reason}`}>
              <Text className="novel-editor-toolbar-recommendation">
                推荐：{recommendedAction.label} · {recommendedAction.reason}
              </Text>
            </Tooltip>
            {writingDeskCollapsed ? (
              <div className="novel-editor-collapsed-summary">
                <Tag className="novel-editor-collapsed-phase" bordered={false}>{aiResponsibility.phaseLabel}</Tag>
                <Tooltip title={`${recommendedAction.reason}；${aiResponsibility.actionLabel}`}>
                  <Text className="novel-editor-collapsed-recommendation">推荐：{recommendedAction.label}</Text>
                </Tooltip>
                <Space className="novel-editor-collapsed-actions" size={6}>
                  <Popover content={secondaryActionMenu} trigger="click" placement="bottomRight">
                    <Button size="small" className="novel-editor-more-actions-inline" icon={<MoreOutlined />}>更多操作</Button>
                  </Popover>
                </Space>
              </div>
            ) : (
              <Space className="novel-editor-action-row novel-editor-toolbar-actions" size={10} wrap>
                <div className="novel-editor-action-flow novel-editor-stagebar">
                  <div className="novel-editor-action-group novel-editor-stage novel-editor-stage-prep novel-editor-action-group-prep">
                    <div className="novel-editor-action-group-heading">
                      <Text className="novel-editor-action-group-label">写前准备</Text>
                      {recommendedBadge('prep')}
                    </div>
                    <Space className="novel-editor-command-cluster" size={4}>
                      <Tooltip title="生成前诊断">
                        <Button size="small" className={commandClass('diagnostics', 'novel-editor-icon-command')} loading={diagnosticsLoading} onClick={onOpenGenerationDiagnostics}>诊断</Button>
                      </Tooltip>
                      <Tooltip title="生成或刷新场景卡">
                        <Button size="small" className={commandClass('scene_cards', 'novel-editor-icon-command')} icon={<FileTextOutlined />} loading={generatingSceneCards} onClick={onGenerateSceneCards}>场景卡</Button>
                      </Tooltip>
                    </Space>
                  </div>
                  <div className="novel-editor-action-group novel-editor-stage novel-editor-stage-draft novel-editor-action-group-primary novel-editor-action-group-draft">
                    <div className="novel-editor-action-group-heading">
                      <Text className="novel-editor-action-group-label">生成正文</Text>
                      {recommendedBadge('draft')}
                    </div>
                    <Space className="novel-editor-command-cluster" size={4}>
                      <Tooltip title="创建可恢复流水线，并停在场景卡确认阶段">
                        <Button size="small" className={commandClass(undefined, 'novel-editor-muted-command')} loading={pipelineLoading} onClick={onStartChapterPipeline}>流水线</Button>
                      </Tooltip>
                      {!materialReady && (
                        <Tooltip title={materialRecommendations.slice(0, 4).join('；') || '自动生成场景卡后继续正文生成'}>
                          <Button
                            type="primary"
                            size="small"
                            className={commandClass('repair_generate', 'novel-editor-primary-command')}
                            icon={<PlayCircleOutlined />}
                            loading={generatingProse}
                            onClick={onRepairAndGenerateCurrentChapter}
                          >
                            补齐并生成
                          </Button>
                        </Tooltip>
                      )}
                      <Tooltip title={materialReady ? '生成正文' : '材料不足时建议先使用“补齐并生成”；仍可直接生成并在弹窗中选择是否继续'}>
                        <Button
                          type={materialReady ? 'primary' : 'default'}
                          size="small"
                          className={commandClass('generate', materialReady ? 'novel-editor-primary-command' : '')}
                          icon={<PlayCircleOutlined />}
                          loading={generatingProse}
                          onClick={onGenerateCurrentChapterProse}
                        >
                          生成
                        </Button>
                      </Tooltip>
                    </Space>
                    {renderWordTargetControl()}
                  </div>
                  <div className="novel-editor-action-group novel-editor-stage novel-editor-stage-review novel-editor-action-group-review">
                    <div className="novel-editor-action-group-heading">
                      <Text className="novel-editor-action-group-label">写后复检</Text>
                      {recommendedBadge('review')}
                    </div>
                    <Space className="novel-editor-command-cluster" size={4}>
                      <Tooltip title="快速验收当前版本是否达到交稿条件">
                        <Button size="small" className={commandClass('quality_card')} onClick={onOpenQualityCard}>交稿质检</Button>
                      </Tooltip>
                      <Tooltip title="生成深度编辑报告，用于定位问题和指导修订">
                        <Button size="small" className={commandClass(undefined, 'novel-editor-muted-command')} loading={editorReportLoading} onClick={onCreateEditorReport}>编辑报告</Button>
                      </Tooltip>
                    </Space>
                  </div>
                </div>
                <Popover content={secondaryActionMenu} trigger="click" placement="bottomRight">
                  <Button className="novel-editor-more-actions" size="small" icon={<MoreOutlined />}>更多操作</Button>
                </Popover>
              </Space>
            )}
          </div>

          <div className={`novel-ai-responsibility-strip novel-ai-responsibility-strip-${aiResponsibility.tone}`}>
            <div className="novel-ai-responsibility-main">
              <span className="novel-ai-responsibility-label">AI 当前职责</span>
              <Tag className="novel-ai-responsibility-role" bordered={false}>{aiResponsibility.roleLabel}</Tag>
              <Text className="novel-ai-responsibility-focus">{aiResponsibility.focus}</Text>
            </div>
            <div className="novel-ai-responsibility-next">
              <Text type="secondary">{aiResponsibility.phaseLabel}</Text>
              <strong>{aiResponsibility.actionLabel}</strong>
            </div>
          </div>

          {deliverySummary.visible && (
            <div className={`novel-delivery-status-strip novel-delivery-status-strip-${deliverySummary.tone}`}>
              <div className="novel-delivery-status-main">
                <span className="novel-delivery-status-label">交稿状态</span>
                <Tag className="novel-delivery-status-tag" bordered={false}>{deliverySummary.statusLabel}</Tag>
                <Tag bordered={false}>{deliverySummary.qualityLabel}</Tag>
                <Tag bordered={false}>{deliverySummary.storyStateLabel}</Tag>
                {deliverySummary.storylineSync && (
                  <Tag
                    className={`novel-delivery-storyline-tag novel-delivery-storyline-tag-${deliverySummary.storylineSync.status}`}
                    bordered={false}
                  >
                    {deliverySummary.storylineSync.label}
                  </Tag>
                )}
                {deliverySummary.assetIntake && deliverySummary.assetIntake.pendingCount > 0 && (
                  <Tooltip title="打开设定资产页，确认正文中新出现的人物、物品、能力、势力、地点或伏笔">
                    <Tag
                      className="novel-delivery-asset-tag novel-delivery-asset-tag-clickable"
                      bordered={false}
                      role={onOpenStoryAssets ? 'button' : undefined}
                      tabIndex={onOpenStoryAssets ? 0 : undefined}
                      onClick={() => onOpenStoryAssets?.('discoveredAssets')}
                      onKeyDown={(event) => {
                        if (!onOpenStoryAssets) return
                        if (event.key !== 'Enter' && event.key !== ' ') return
                        event.preventDefault()
                        onOpenStoryAssets('discoveredAssets')
                      }}
                    >
                      {deliverySummary.assetIntake.label}
                    </Tag>
                  </Tooltip>
                )}
                {deliverySummary.coreDrift && (
                  <>
                    <Tag
                      className={`novel-delivery-core-drift-tag novel-delivery-core-drift-tag-${deliverySummary.coreDrift.status}`}
                      bordered={false}
                    >
                      {deliverySummary.coreDrift.scoreLabel}
                    </Tag>
                    {deliverySummary.coreDrift.riskCount > 0 && (
                      <Tag className="novel-delivery-core-drift-tag novel-delivery-core-drift-tag-warn" bordered={false}>
                        {deliverySummary.coreDrift.label}
                      </Tag>
                    )}
                  </>
                )}
                {deliverySummary.readerPayoffSync && (
                  <>
                    <Tag
                      className={`novel-delivery-payoff-tag novel-delivery-payoff-tag-${deliverySummary.readerPayoffSync.status}`}
                      bordered={false}
                    >
                      {deliverySummary.readerPayoffSync.scoreLabel}
                    </Tag>
                    {deliverySummary.readerPayoffSync.debtCount > 0 && (
                      <Tag className="novel-delivery-payoff-tag novel-delivery-payoff-tag-warn" bordered={false}>
                        {deliverySummary.readerPayoffSync.label}
                      </Tag>
                    )}
                  </>
                )}
                {deliverySummary.readabilityReview && (
                  <>
                    <Tag className="novel-delivery-readability-tag" bordered={false}>
                      {deliverySummary.readabilityReview.scoreLabel}
                    </Tag>
                    <Tag className="novel-delivery-readability-tag" bordered={false}>
                      {deliverySummary.readabilityReview.memeLabel}
                    </Tag>
                    {deliverySummary.readabilityReview.riskCount > 0 && (
                      <Tag className="novel-delivery-readability-tag novel-delivery-readability-tag-warn" bordered={false}>
                        {deliverySummary.readabilityReview.riskLabel}
                      </Tag>
                    )}
                  </>
                )}
                <Text className="novel-delivery-status-reason">{deliverySummary.reason}</Text>
              </div>
              {deliverySummary.actionKey && (
                <Button
                  className="novel-delivery-status-action"
                  type={deliverySummary.tone === 'ready' ? 'primary' : 'default'}
                  size="small"
                  loading={deliveryActionLoading}
                  onClick={() => onDeliveryAction?.(deliverySummary.actionKey!)}
                >
                  <span className="novel-delivery-status-action-full">{deliverySummary.actionLabel}</span>
                  <span className="novel-delivery-status-action-compact">{deliverySummary.compactActionLabel}</span>
                </Button>
              )}
            </div>
          )}

          {draftBriefSummary.visible && (
            <div className="novel-draft-brief-strip">
              <div className="novel-draft-brief-main">
                <div className="novel-draft-brief-head">
                  <span className="novel-draft-brief-label">章节开写任务书</span>
                  <Tag className="novel-draft-brief-status" bordered={false}>{draftBriefSummary.statusLabel}</Tag>
                  {draftBriefSummary.checks.map(check => (
                    <Tag key={check} bordered={false}>{check}</Tag>
                  ))}
                  <Text className="novel-draft-brief-focus">{draftBriefSummary.focus}</Text>
                </div>
                <div className="novel-draft-brief-grid">
                  <div><span>本章目标</span><strong>{draftBriefSummary.briefFields.chapterGoal || '待补齐'}</strong></div>
                  <div><span>读者承诺</span><strong>{draftBriefSummary.briefFields.readerPromise || '待生成任务书'}</strong></div>
                  <div><span>核心冲突</span><strong>{draftBriefSummary.briefFields.coreConflict || '待补齐'}</strong></div>
                  <div><span>情绪曲线</span><strong>{draftBriefSummary.briefFields.emotionalCurve || '待生成任务书'}</strong></div>
                  <div><span>关键设定</span><strong>{draftBriefSummary.briefFields.keySettings || '无明确必用设定'}</strong></div>
                  <div><span>禁揭/禁写</span><strong>{draftBriefSummary.briefFields.forbiddenContent || '无明确禁写项'}</strong></div>
                  <div><span>场景预算</span><strong>{draftBriefSummary.briefFields.sceneBudget || `${sceneCards.length} 个场景`}</strong></div>
                  <div><span>字数目标</span><strong>{draftBriefSummary.briefFields.wordBudget || `${generationTargetWordCount} 字`}</strong></div>
                  <div><span>章末钩子</span><strong>{draftBriefSummary.briefFields.endingHook || '待补齐'}</strong></div>
                </div>
                <div className="novel-draft-brief-storylines">
                  <span>剧情线推进</span>
                  <strong>必推：{draftBriefSummary.briefFields.storylineAdvances || '无'}</strong>
                  <strong>埋线：{draftBriefSummary.briefFields.storylinePlants || '无'}</strong>
                  <strong>回收：{draftBriefSummary.briefFields.storylinePayoffs || '无'}</strong>
                  <strong>禁用：{draftBriefSummary.briefFields.storylineForbidden || '无'}</strong>
                </div>
                <div className="novel-draft-brief-meme">
                  <span>本章网感策略</span>
                  <strong>强度：{draftBriefSummary.briefFields.memeIntensity || '无'}</strong>
                  <strong>功能：{draftBriefSummary.briefFields.memeFunctions || '无'}</strong>
                  <strong>禁用：{draftBriefSummary.briefFields.memeForbidden || '严肃场景不玩梗'}</strong>
                </div>
              </div>
              {draftBriefSummary.actionKey && (
                <Button
                  className="novel-draft-brief-action"
                  type={draftBriefSummary.actionKey === 'generate' ? 'primary' : 'default'}
                  size="small"
                  loading={
                    draftBriefSummary.actionKey === 'scene_cards'
                      ? generatingSceneCards
                      : ['build_brief', 'confirm_brief'].includes(draftBriefSummary.actionKey)
                        ? Boolean(preDraftBriefLoading)
                        : generatingProse
                  }
                  onClick={() => {
                    if (draftBriefSummary.actionKey === 'metadata') onEditActiveChapter()
                    if (draftBriefSummary.actionKey === 'scene_cards') onGenerateSceneCards()
                    if (draftBriefSummary.actionKey === 'build_brief') onBuildPreDraftBrief?.()
                    if (draftBriefSummary.actionKey === 'confirm_brief') onConfirmPreDraftBrief?.()
                    if (draftBriefSummary.actionKey === 'generate') onGenerateCurrentChapterProse()
                  }}
                >
                  {draftBriefSummary.actionLabel}
                </Button>
              )}
            </div>
          )}

          {streamingChapterId === activeChapter.id && (
            <div style={{ flexShrink: 0, padding: '12px 24px', background: '#f0f7ff', borderBottom: '1px solid #d6e4ff' }}>
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <Space align="center">
                  <Text strong style={{ fontSize: 13 }}>🤖 生成进度</Text>
                  <Tag color="blue">{streamingProgress || '进行中'}</Tag>
                  <Text type="secondary">{Math.round(streamingPercent)}%</Text>
                </Space>
                <Progress percent={streamingPercent} status={streamingProgress === '生成失败' ? 'exception' : 'active'} size="small" />
                {Array.isArray(generationPipeline) && generationPipeline.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {generationPipeline.slice(-6).map((stage: any, index: number) => (
                      <Tag
                        key={`${stage.key || index}-${stage.at || index}`}
                        color={stage.status === 'success' ? 'green' : stage.status === 'warn' ? 'gold' : stage.status === 'failed' ? 'red' : 'blue'}
                        bordered={false}
                      >
                        {stage.label || stage.key}
                      </Tag>
                    ))}
                  </div>
                )}
                <Paragraph style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, maxHeight: 200, overflow: 'auto', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {streamingText}
                  <div ref={streamingEndRef} />
                </Paragraph>
              </Space>
            </div>
          )}

          <details className="novel-context-panel" style={{ flexShrink: 0, margin: 0 }}>
            <summary className="novel-context-strip">
              <span className="novel-context-strip-title">章节上下文</span>
              <span className="novel-context-pill">
                <strong>本章任务</strong>
                <span>{displayValue(activeChapter.chapter_goal) || displayValue(activeChapter.chapter_summary) || '待补齐'}</span>
              </span>
              <span className="novel-context-pill">
                <strong>写作约束</strong>
                <span>{displayValue(activeChapter.conflict) || displayValue(activeChapter.ending_hook) || dependencyText}</span>
              </span>
              <span className="novel-context-pill">
                <strong>场景节拍</strong>
                <span>{sceneCards.length > 0 ? `${sceneCards.length} 场 · ${displayValue(firstScene?.title || firstScene?.description || firstScene?.purpose) || '待命名'}` : '暂无场景卡'}</span>
              </span>
            </summary>
            <div className="novel-context-cards">
              <section className="novel-context-card">
                <Text strong>本章任务</Text>
                <Text>{displayValue(activeChapter.chapter_goal) || '暂无章节目标'}</Text>
                <Text type="secondary">{displayValue(activeChapter.chapter_summary) || '暂无章节摘要'}</Text>
              </section>
              <section className="novel-context-card">
                <Text strong>写作约束</Text>
                <Text>冲突：{displayValue(activeChapter.conflict) || '-'}</Text>
                <Text>结尾钩子：{displayValue(activeChapter.ending_hook) || '-'}</Text>
                <Text type="secondary">必须推进：{requiredAdvances.length > 0 ? requiredAdvances.join('；') : '-'}</Text>
                <Text type="secondary">禁止重复：{forbiddenRepeats.length > 0 ? forbiddenRepeats.join('；') : '-'}</Text>
                <Text type="secondary">{dependencyText} · 状态 {displayValue(activeChapter.status) || '-'}</Text>
              </section>
              <section className="novel-context-card novel-context-card-scenes">
                <Text strong>场景节拍</Text>
                {sceneCards.length > 0 ? sceneCards.map((scene: any, index: number) => (
                  <div key={`${scene.scene_no || index}-${scene.title || index}`} className="novel-context-scene">
                    <Space wrap size={[6, 4]}>
                      <Tag color="blue" bordered={false}>场景 {scene.scene_no || index + 1}</Tag>
                      {scene.location && <Tag bordered={false}>{scene.location}</Tag>}
                      {scene.emotional_tone && <Tag color="purple" bordered={false}>{scene.emotional_tone}</Tag>}
                    </Space>
                    <Text strong>{displayValue(scene.title || scene.description || scene.purpose) || '未命名场景'}</Text>
                    {(scene.purpose || scene.description) && <Text>{displayValue(scene.purpose || scene.description)}</Text>}
                    {scene.conflict && <Text type="secondary">冲突：{displayValue(scene.conflict)}</Text>}
                    {scene.beat && <Text type="secondary">节拍：{displayValue(scene.beat)}</Text>}
                    {scene.exit_state && <Text type="secondary">出场状态：{displayValue(scene.exit_state)}</Text>}
                  </div>
                )) : (
                  <Text type="secondary">暂无场景卡，生成正文前建议先补齐场景节拍。</Text>
                )}
              </section>
            </div>
          </details>

          <ProseEditor
            value={activeChapter.chapter_text || ''}
            displayPrefs={editorDisplayPrefs}
            proseEditorRef={proseEditorRef}
            onChange={onChapterTextChange}
          />
        </>
      )}

      {!isEmptyProject && !activeChapter && (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <Space direction="vertical" align="center" size={16}>
            <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            <Title level={4}>请选择一个章节</Title>
            <Button type="primary" onClick={onCreateChapter}>创建第一章</Button>
          </Space>
        </div>
      )}
    </div>
  )
}
