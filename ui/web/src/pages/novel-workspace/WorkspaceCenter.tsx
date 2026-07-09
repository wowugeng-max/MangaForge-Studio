import React from 'react'
import { Button, Card, Col, Input, InputNumber, Modal, Popover, Progress, Row, Slider, Space, Tag, Tooltip, Typography } from 'antd'
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
  StopOutlined,
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
import type { ChapterHandoffDeskModel, DeslopGateDiagnosticsModel, WritingQueueItem, WritingQueueModel } from './writingCockpitModel'
import { pickWritingAuxFocusTags } from './writingAuxFocusModel'
import './WorkspaceCenter.css'

const { Title, Text, Paragraph } = Typography

type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'
type EditorDisplayPrefs = { fontSize: number; lineHeight: number }
type ChapterWordTargetMode = 'standard' | 'long' | 'custom'

const EDITOR_DISPLAY_PREFS_KEY = 'novel.workspace.editorDisplayPrefs'
const NOVEL_WRITING_AUX_COLLAPSED_KEY = 'novel.workspace.writingAuxCollapsed'
const DEFAULT_EDITOR_DISPLAY_PREFS: EditorDisplayPrefs = { fontSize: 17, lineHeight: 32 }
const EDITOR_DISPLAY_PRESETS: Array<EditorDisplayPrefs & { key: string; label: string }> = [
  { key: 'webNovel', label: '网文标准', fontSize: 17, lineHeight: 32 },
  { key: 'review', label: '宽松审稿', fontSize: 18, lineHeight: 38 },
  { key: 'sprint', label: '紧凑冲刺', fontSize: 16, lineHeight: 28 },
]

function deslopGateTone(status: string) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'fail' || normalized === 'failed' || normalized === 'blocker') return 'fail'
  if (normalized === 'warn' || normalized === 'warning') return 'warn'
  return 'pass'
}

function DeslopGateDiagnosticsPanel({
  diagnostics,
  onRepairDeslopGate,
  repairLoading,
}: {
  diagnostics?: DeslopGateDiagnosticsModel | null
  onRepairDeslopGate?: () => void
  repairLoading?: boolean
}) {
  if (!diagnostics?.gates?.length) return null
  const concernGates = diagnostics.gates.filter(gate => deslopGateTone(gate.status) !== 'pass' || gate.count > 0)
  const visibleGates = (concernGates.length ? concernGates : diagnostics.gates).slice(0, 7)
  const hasConcern = concernGates.length > 0 || diagnostics.concernGateCount > 0
  const canRepair = hasConcern && Boolean(onRepairDeslopGate)

  return (
    <details className={`novel-deslop-gate-panel novel-deslop-gate-panel-${hasConcern ? 'warn' : 'pass'}`} open={hasConcern}>
      <summary className="novel-deslop-gate-summary">
        <span>去AI味门禁</span>
        <Tag color={hasConcern ? 'gold' : 'green'} bordered={false}>{hasConcern ? `需处理 ${diagnostics.concernGateCount || concernGates.length}` : '已通过'}</Tag>
        <Text type="secondary">{diagnostics.summary}</Text>
        {canRepair && (
          <Button
            className="novel-deslop-gate-action"
            size="small"
            type="primary"
            loading={repairLoading}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onRepairDeslopGate?.()
            }}
          >
            修复去AI味并复检
          </Button>
        )}
      </summary>
      <div className="novel-deslop-gate-grid">
        {visibleGates.map(gate => {
          const tone = deslopGateTone(gate.status)
          const evidence = gate.evidence.slice(0, 2).join('；') || gate.patterns.slice(0, 3).join('、')
          const fix = gate.fix || '按本章语境重写成具体动作、感官或角色选择。'
          return (
            <div key={`${gate.gate}-${gate.label}`} className={`novel-deslop-gate-card novel-deslop-gate-card-${tone}`}>
              <div className="novel-deslop-gate-card-head">
                <Tag bordered={false}>{gate.gate ? `Gate ${gate.gate}` : 'Gate'}</Tag>
                <strong>{gate.label || '未命名门禁'}</strong>
                <span>{gate.count > 0 ? `${gate.count} 处` : '无命中'}</span>
              </div>
              {evidence && <Text className="novel-deslop-gate-evidence">证据：{evidence}</Text>}
              <Text className="novel-deslop-gate-fix">修法：{fix}</Text>
            </div>
          )
        })}
      </div>
    </details>
  )
}

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

function loadWritingAuxCollapsed() {
  if (typeof window === 'undefined') return true
  const value = window.localStorage.getItem(NOVEL_WRITING_AUX_COLLAPSED_KEY)
  if (value === null) return true
  return value === 'true'
}

function saveWritingAuxCollapsed(collapsed: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(NOVEL_WRITING_AUX_COLLAPSED_KEY, collapsed ? 'true' : 'false')
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
  styleSampleActionLoading,
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
  onSavePreDraftBrief,
  onLockStyleSamples,
  onReplaceStyleSamples,
  onDisableStyleSamples,
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
  writingQueue,
  onSelectWritingQueueChapter,
  onRepairWritingQueuePlan,
  onRepairWritingQueuePlanBatch,
  chapterAcceptanceDesk,
  chapterHandoffDesk,
  deliveryActionLoading,
  onDeliveryAction,
  onRepairDeslopGate,
  isImmersiveShell = false,
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
  styleSampleActionLoading?: boolean
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
  onSavePreDraftBrief?: (brief: any) => Promise<void> | void
  onLockStyleSamples?: () => void
  onReplaceStyleSamples?: () => void
  onDisableStyleSamples?: () => void
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
  writingQueue?: WritingQueueModel | null
  onSelectWritingQueueChapter?: (chapterId: number) => void
  onRepairWritingQueuePlan?: (item: WritingQueueItem) => void
  onRepairWritingQueuePlanBatch?: (queue: WritingQueueModel) => void
  chapterAcceptanceDesk?: NovelDeliverySummaryInput | null
  chapterHandoffDesk?: ChapterHandoffDeskModel | null
  deliveryActionLoading?: boolean
  onDeliveryAction?: (key: NovelDeliveryActionKey) => void
  onRepairDeslopGate?: () => void
  isImmersiveShell?: boolean
}) {
  const [editorDisplayPrefs, setEditorDisplayPrefs] = React.useState<EditorDisplayPrefs>(() => loadEditorDisplayPrefs())
  const [writingAuxCollapsed, setWritingAuxCollapsed] = React.useState(() => loadWritingAuxCollapsed())
  const [immersiveAuxOpen, setImmersiveAuxOpen] = React.useState(false)
  const [blueprintEditorOpen, setBlueprintEditorOpen] = React.useState(false)
  const [blueprintEditorText, setBlueprintEditorText] = React.useState('')
  const [blueprintEditorError, setBlueprintEditorError] = React.useState('')
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
  const activePreDraftBrief = activeChapter?.raw_payload?.pre_draft_brief || activeChapter?.raw_payload?.preDraftBrief || null
  const ipSceneIntakeTooltip = deliverySummary.ipSceneIntake?.candidates?.length ? (
    <div className="novel-delivery-ip-scene-tooltip">
      {deliverySummary.ipSceneIntake.candidates.slice(0, 3).map((candidate, index) => (
        <div key={`${candidate.title}-${index}`} className="novel-delivery-ip-scene-tooltip-item">
          <strong>{candidate.title}</strong>
          {candidate.visualHook && <span>视觉钩子：{candidate.visualHook}</span>}
          {candidate.adaptationValue && <span>改编价值：{candidate.adaptationValue}</span>}
          {candidate.spreadPoint && <span>传播点：{candidate.spreadPoint}</span>}
        </div>
      ))}
    </div>
  ) : '本章已沉淀可传播、可视化或适合短剧/漫剧改编的强场面候选'
  const draftBriefSummary = buildNovelDraftBriefSummary({
    activeWordCount,
    chapterGoal: activeChapter?.chapter_goal || activeChapter?.chapter_summary,
    conflict: activeChapter?.conflict,
    endingHook: activeChapter?.ending_hook,
    sceneCardCount: sceneCards.length,
    preDraftBrief: activePreDraftBrief,
  })
  const styleSampleActionDisabled = !activeChapter || Boolean(styleSampleActionLoading || preDraftBriefLoading || generatingProse)
  const openChapterBlueprintEditor = () => {
    setBlueprintEditorText(JSON.stringify(activePreDraftBrief?.chapter_blueprint || {}, null, 2))
    setBlueprintEditorError('')
    setBlueprintEditorOpen(true)
  }
  const saveChapterBlueprintEditor = async () => {
    try {
      const parsed = JSON.parse(blueprintEditorText)
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        setBlueprintEditorError('蓝图 JSON 必须是对象')
        return
      }
      const nextBrief = {
        ...(activePreDraftBrief || {}),
        chapter_blueprint: parsed,
      }
      delete nextBrief.confirmed_at
      await onSavePreDraftBrief?.(nextBrief)
      setBlueprintEditorOpen(false)
    } catch (error: any) {
      setBlueprintEditorError(error?.message || '蓝图 JSON 格式不正确')
    }
  }
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
  const selectWritingQueueChapter = (chapterId: any) => {
    const id = Number(chapterId || 0)
    if (!id) return
    onSelectWritingQueueChapter?.(id)
  }
  const currentQueueItem = writingQueue?.items.find(item => Number(item.chapterNo) === Number(writingQueue.currentChapterNo)) || null
  const runDraftBriefAction = () => {
    if (draftBriefSummary.actionKey === 'metadata') onEditActiveChapter()
    if (draftBriefSummary.actionKey === 'scene_cards') onGenerateSceneCards()
    if (draftBriefSummary.actionKey === 'build_brief') onBuildPreDraftBrief?.()
    if (draftBriefSummary.actionKey === 'confirm_brief') onConfirmPreDraftBrief?.()
    if (draftBriefSummary.actionKey === 'generate') onGenerateCurrentChapterProse()
  }
  const draftBriefActionLoading = draftBriefSummary.actionKey === 'scene_cards'
    ? generatingSceneCards
    : ['build_brief', 'confirm_brief'].includes(String(draftBriefSummary.actionKey || ''))
      ? Boolean(preDraftBriefLoading)
      : draftBriefSummary.actionKey === 'generate'
        ? generatingProse
        : false
  const runQueueDeliveryAction = () => {
    if (deliverySummary.actionKey) {
      onDeliveryAction?.(deliverySummary.actionKey)
      return
    }
    onOpenQualityCard()
  }
  const queueFocus = currentQueueItem
    ? currentQueueItem.status === 'needs_plan'
      ? {
          tone: 'plan',
          title: '本章计划缺口',
          detail: `需要先补齐 ${currentQueueItem.missingPlanLabels.length > 0 ? currentQueueItem.missingPlanLabels.join('、') : '章节目标、核心冲突、章末钩子'}，再进入任务书、场景卡和正文生成。`,
          actionLabel: '补齐本章计划',
          disabled: false,
          loading: false,
          run: () => onRepairWritingQueuePlan?.(currentQueueItem),
          tags: currentQueueItem.missingPlanLabels,
        }
      : currentQueueItem.status === 'ready_to_draft'
        ? {
            tone: 'draft',
            title: '本章开写就绪',
            detail: draftBriefSummary.actionLabel
              ? `章节计划已具备，下一步处理 ${draftBriefSummary.actionLabel}，再进入正文生成。`
              : '章节计划已具备，检查任务书、场景卡和字数目标后进入正文生成。',
            actionLabel: '处理本章开写',
            disabled: !draftBriefSummary.actionKey,
            loading: draftBriefSummary.actionKey === 'scene_cards'
              ? generatingSceneCards
              : ['build_brief', 'confirm_brief'].includes(String(draftBriefSummary.actionKey || ''))
                ? Boolean(preDraftBriefLoading)
                : generatingProse,
            run: runDraftBriefAction,
            tags: [draftBriefSummary.statusLabel].filter(Boolean),
          }
        : {
            tone: 'delivery',
            title: '本章待质检',
            detail: deliverySummary.visible
              ? `${deliverySummary.statusLabel}：${deliverySummary.reason || '按交稿状态完成质检、修订、状态同步和验收。'}`
              : '正文已生成，下一步进入交稿质检、编辑报告和故事状态同步。',
            actionLabel: '处理交稿质检',
            disabled: false,
            loading: Boolean(deliveryActionLoading),
            run: runQueueDeliveryAction,
            tags: deliverySummary.visible ? [deliverySummary.qualityLabel, deliverySummary.storyStateLabel].filter(Boolean) : ['待质检'],
          }
    : null
  const recommendedToolbarLoading = recommendedAction.key === 'diagnostics'
    ? diagnosticsLoading
    : recommendedAction.key === 'scene_cards'
      ? generatingSceneCards
      : recommendedAction.key === 'quality_card'
        ? false
        : generatingProse
  const runRecommendedToolbarAction = () => {
    if (recommendedAction.key === 'diagnostics') onOpenGenerationDiagnostics()
    if (recommendedAction.key === 'scene_cards') onGenerateSceneCards()
    if (recommendedAction.key === 'repair_generate') onRepairAndGenerateCurrentChapter()
    if (recommendedAction.key === 'generate') onGenerateCurrentChapterProse()
    if (recommendedAction.key === 'quality_card') onOpenQualityCard()
  }
  const writingAuxToggleLabel = writingAuxCollapsed ? '展开辅助面板' : '收起辅助面板'
  const writingAuxToggleHint = writingAuxCollapsed
    ? '辅助面板已收起，编辑器优先显示'
    : '辅助面板已展开，可查看队列、交稿和任务书'
  const writingAuxQueueSummary = writingQueue?.visible
    ? [
        `可写 ${writingQueue.readyCount}`,
        writingQueue.blockedCount > 0 ? `待补 ${writingQueue.blockedCount}` : '',
        writingQueue.draftedCount > 0 ? `待质检 ${writingQueue.draftedCount}` : '',
      ].filter(Boolean).join(' · ')
    : ''

  React.useEffect(() => {
    saveEditorDisplayPrefs(editorDisplayPrefs)
  }, [editorDisplayPrefs])

  React.useEffect(() => {
    saveWritingAuxCollapsed(writingAuxCollapsed)
  }, [writingAuxCollapsed])

  React.useEffect(() => {
    if (!isImmersiveShell) setImmersiveAuxOpen(false)
  }, [isImmersiveShell])

  const secondaryActionMenu = (
    <div className="novel-editor-action-popover novel-editor-secondary-actions">
      <div className="novel-editor-action-group novel-editor-action-group-prep">
        <div className="novel-editor-action-group-heading">
          <Text className="novel-editor-action-group-label">写前准备</Text>
          {recommendedBadge('prep')}
        </div>
        <Button size="small" className={commandClass('diagnostics')} loading={diagnosticsLoading} onClick={onOpenGenerationDiagnostics}>诊断</Button>
        <Button size="small" className={commandClass('scene_cards')} icon={<FileTextOutlined />} loading={generatingSceneCards} onClick={onGenerateSceneCards}>场景卡</Button>
        <Button size="small" className={commandClass(undefined, 'novel-editor-muted-command')} onClick={onEditActiveChapter} icon={<EditOutlined />}>元数据</Button>
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

  const writingSupportBody = (
    <>
          {writingQueue?.visible && (
            <div className="novel-writing-queue-strip" aria-label="写作队列，滚动规划章节会自动进入">
              <div className="novel-writing-queue-head">
                <span className="novel-writing-queue-label">写作队列</span>
                <Tag bordered={false}>可写 {writingQueue.readyCount}</Tag>
                {writingQueue.blockedCount > 0 && <Tag color="gold" bordered={false}>待补 {writingQueue.blockedCount}</Tag>}
                {writingQueue.draftedCount > 0 && <Tag color="blue" bordered={false}>待质检 {writingQueue.draftedCount}</Tag>}
                {writingQueue.planRepair?.visible && (
                  <Tooltip title={`补齐 ${writingQueue.planRepair.chapterCount} 章计划缺口，共 ${writingQueue.planRepair.missingCount} 项`}>
                    <Button
                      size="small"
                      className="novel-writing-queue-batch-action"
                      icon={<ExperimentOutlined />}
                      onClick={() => onRepairWritingQueuePlanBatch?.(writingQueue)}
                    >
                      补齐队列计划
                    </Button>
                  </Tooltip>
                )}
              </div>
              <div className="novel-writing-queue-list">
                {writingQueue.items.map(item => (
                  <Tooltip
                    key={`${item.id || item.chapterNo}-${item.status}`}
                    title={[
                      item.goal ? `目标：${item.goal}` : '目标待补齐',
                      item.conflict ? `冲突：${item.conflict}` : '冲突待补齐',
                      item.endingHook ? `钩子：${item.endingHook}` : '章末钩子待补齐',
                      item.actionHint || '',
                    ].join('；')}
                  >
                    <div
                      className={[
                        'novel-writing-queue-item',
                        `novel-writing-queue-item-${item.status}`,
                        Number(item.chapterNo) === Number(writingQueue.currentChapterNo) ? 'is-active' : '',
                      ].filter(Boolean).join(' ')}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectWritingQueueChapter(item.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          selectWritingQueueChapter(item.id)
                        }
                      }}
                    >
                      <span className="novel-writing-queue-no">第{item.chapterNo}章</span>
                      <strong>{displayValue(item.title) || '未命名章节'}</strong>
                      <span className="novel-writing-queue-source">{item.sourceLabel || '手动章节'}</span>
                      <span className="novel-writing-queue-status">{item.statusLabel}</span>
                      <span className="novel-writing-queue-action">{item.actionLabel}</span>
                    </div>
                  </Tooltip>
                ))}
              </div>
              {queueFocus && currentQueueItem && (
                <div className={`novel-writing-queue-focus novel-writing-queue-focus-${queueFocus.tone}`}>
                  <div className="novel-writing-queue-focus-main">
                    <span>{queueFocus.title}</span>
                    <strong>第{currentQueueItem.chapterNo}章 · {currentQueueItem.title || '未命名章节'}</strong>
                    <Text type="secondary">
                      {queueFocus.detail}
                    </Text>
                  </div>
                  <Space wrap size={6}>
                    {queueFocus.tags.map(label => (
                      <Tag key={label} color={queueFocus.tone === 'delivery' ? 'blue' : queueFocus.tone === 'draft' ? 'green' : 'gold'} bordered={false}>{label}</Tag>
                    ))}
                  </Space>
                </div>
              )}
            </div>
          )}

          {deliverySummary.visible && (
            <div className={`novel-delivery-status-strip novel-delivery-status-strip-${deliverySummary.tone}`}>
              <div className="novel-delivery-status-main">
                <span className="novel-delivery-status-label">交稿状态</span>
                <Tag className="novel-delivery-status-tag" bordered={false}>{deliverySummary.statusLabel}</Tag>
                <Tag bordered={false}>{deliverySummary.qualityLabel}</Tag>
                <Tag bordered={false}>{deliverySummary.storyStateLabel}</Tag>
                {deliverySummary.deliveryRiskQueue && (
                  <Tooltip title={deliverySummary.deliveryRiskQueue.items.join('；')}>
                    <Tag
                      className="novel-delivery-risk-tag novel-delivery-risk-tag-warn"
                      bordered={false}
                    >
                      {deliverySummary.deliveryRiskQueue.label} · {deliverySummary.deliveryRiskQueue.priorityLabel}
                    </Tag>
                  </Tooltip>
                )}
                {deliverySummary.deliveryRiskConvergence && (
                  <Tooltip title={deliverySummary.deliveryRiskConvergence.nextAction || deliverySummary.deliveryRiskConvergence.label}>
                    <Tag
                      className={`novel-delivery-convergence-tag novel-delivery-convergence-tag-${deliverySummary.deliveryRiskConvergence.status}`}
                      bordered={false}
                    >
                      {deliverySummary.deliveryRiskConvergence.label}
                    </Tag>
                  </Tooltip>
                )}
                {deliverySummary.storylineSync && (
                  <Tag
                    className={`novel-delivery-storyline-tag novel-delivery-storyline-tag-${deliverySummary.storylineSync.status}`}
                    bordered={false}
                  >
                    {deliverySummary.storylineSync.label}
                  </Tag>
                )}
                {deliverySummary.storyUnitSync && (
                  <>
                    <Tag
                      className={`novel-delivery-story-unit-tag novel-delivery-story-unit-tag-${deliverySummary.storyUnitSync.status}`}
                      bordered={false}
                    >
                      {deliverySummary.storyUnitSync.scoreLabel}
                    </Tag>
                    {deliverySummary.storyUnitSync.riskCount > 0 && (
                      <Tag className="novel-delivery-story-unit-tag novel-delivery-story-unit-tag-warn" bordered={false}>
                        {deliverySummary.storyUnitSync.label}
                      </Tag>
                    )}
                  </>
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
                {deliverySummary.ipSceneIntake && (
                  <Tooltip title={ipSceneIntakeTooltip}>
                    <Tag className="novel-delivery-ip-scene-tag" bordered={false}>
                      {deliverySummary.ipSceneIntake.label}
                    </Tag>
                  </Tooltip>
                )}
                {deliverySummary.signatureSceneSync && (
                  <>
                    <Tag
                      className={`novel-delivery-signature-scene-tag novel-delivery-signature-scene-tag-${deliverySummary.signatureSceneSync.status}`}
                      bordered={false}
                    >
                      {deliverySummary.signatureSceneSync.scoreLabel}
                    </Tag>
                    {deliverySummary.signatureSceneSync.missedCount > 0 && (
                      <Tag className="novel-delivery-signature-scene-tag novel-delivery-signature-scene-tag-warn" bordered={false}>
                        {deliverySummary.signatureSceneSync.label}
                      </Tag>
                    )}
                  </>
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
                {deliverySummary.runwaySync && (
                  <>
                    <Tag
                      className={`novel-delivery-runway-tag novel-delivery-runway-tag-${deliverySummary.runwaySync.status}`}
                      bordered={false}
                    >
                      {deliverySummary.runwaySync.scoreLabel}
                    </Tag>
                    {deliverySummary.runwaySync.riskCount > 0 && (
                      <Tag className="novel-delivery-runway-tag novel-delivery-runway-tag-warn" bordered={false}>
                        {deliverySummary.runwaySync.label}
                      </Tag>
                    )}
                  </>
                )}
                {deliverySummary.readerExpectationSync && (
                  <>
                    <Tag
                      className={`novel-delivery-expectation-tag novel-delivery-expectation-tag-${deliverySummary.readerExpectationSync.status}`}
                      bordered={false}
                    >
                      {deliverySummary.readerExpectationSync.scoreLabel}
                    </Tag>
                    {deliverySummary.readerExpectationSync.missedCount > 0 && (
                      <Tag className="novel-delivery-expectation-tag novel-delivery-expectation-tag-warn" bordered={false}>
                        {deliverySummary.readerExpectationSync.label}
                      </Tag>
                    )}
                  </>
                )}
                {!deliverySummary.readerExpectationSync && deliverySummary.readerPayoffSync && (
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
                {!deliverySummary.readerExpectationSync && deliverySummary.readerRetentionSync && (
                  <>
                    <Tag
                      className={`novel-delivery-retention-tag novel-delivery-retention-tag-${deliverySummary.readerRetentionSync.status}`}
                      bordered={false}
                    >
                      {deliverySummary.readerRetentionSync.scoreLabel}
                    </Tag>
                    {deliverySummary.readerRetentionSync.missedCount > 0 && (
                      <Tag className="novel-delivery-retention-tag novel-delivery-retention-tag-warn" bordered={false}>
                        {deliverySummary.readerRetentionSync.label}
                      </Tag>
                    )}
                  </>
                )}
                {deliverySummary.chapterAttraction && (
                  <>
                    <Tag
                      className={`novel-delivery-attraction-tag novel-delivery-attraction-tag-${deliverySummary.chapterAttraction.status}`}
                      bordered={false}
                    >
                      {deliverySummary.chapterAttraction.scoreLabel}
                    </Tag>
                    {deliverySummary.chapterAttraction.weakCount > 0 && (
                      <Tag className="novel-delivery-attraction-tag novel-delivery-attraction-tag-warn" bordered={false}>
                        {deliverySummary.chapterAttraction.priorityLabel || deliverySummary.chapterAttraction.label}
                      </Tag>
                    )}
                  </>
                )}
                {deliverySummary.storyDriveSync && (
                  <>
                    <Tag
                      className={`novel-delivery-story-drive-tag novel-delivery-story-drive-tag-${deliverySummary.storyDriveSync.status}`}
                      bordered={false}
                    >
                      {deliverySummary.storyDriveSync.scoreLabel}
                    </Tag>
                    {deliverySummary.storyDriveSync.missedCount > 0 && (
                      <Tag className="novel-delivery-story-drive-tag novel-delivery-story-drive-tag-warn" bordered={false}>
                        {deliverySummary.storyDriveSync.priorityLabel || deliverySummary.storyDriveSync.label}
                      </Tag>
                    )}
                  </>
                )}
                {deliverySummary.characterArcSync && (
                  <>
                    <Tag
                      className={`novel-delivery-character-arc-tag novel-delivery-character-arc-tag-${deliverySummary.characterArcSync.status}`}
                      bordered={false}
                    >
                      {deliverySummary.characterArcSync.scoreLabel}
                    </Tag>
                    {deliverySummary.characterArcSync.missedCount > 0 && (
                      <Tag className="novel-delivery-character-arc-tag novel-delivery-character-arc-tag-warn" bordered={false}>
                        {deliverySummary.characterArcSync.priorityLabel || deliverySummary.characterArcSync.label}
                      </Tag>
                    )}
                  </>
                )}
                {deliverySummary.chapterBenchmarkSync && (
                  <>
                    <Tag
                      className={`novel-delivery-benchmark-tag novel-delivery-benchmark-tag-${deliverySummary.chapterBenchmarkSync.status}`}
                      bordered={false}
                    >
                      {deliverySummary.chapterBenchmarkSync.scoreLabel}
                    </Tag>
                    {deliverySummary.chapterBenchmarkSync.missedCount > 0 && (
                      <Tag className="novel-delivery-benchmark-tag novel-delivery-benchmark-tag-warn" bordered={false}>
                        {deliverySummary.chapterBenchmarkSync.label}
                      </Tag>
                    )}
                  </>
                )}
                {deliverySummary.styleSampleSync && (
                  <>
                    <Tag
                      className={`novel-delivery-style-sample-tag novel-delivery-style-sample-tag-${deliverySummary.styleSampleSync.status}`}
                      bordered={false}
                    >
                      {deliverySummary.styleSampleSync.scoreLabel}
                    </Tag>
                    {(deliverySummary.styleSampleSync.missedCount > 0 || deliverySummary.styleSampleSync.copyRiskCount > 0) && (
                      <Tag className="novel-delivery-style-sample-tag novel-delivery-style-sample-tag-warn" bordered={false}>
                        {deliverySummary.styleSampleSync.copyRiskCount > 0 ? `照搬风险 ${deliverySummary.styleSampleSync.copyRiskCount}` : deliverySummary.styleSampleSync.label}
                      </Tag>
                    )}
                  </>
                )}
                {deliverySummary.first30RetentionRecheck && (
                  <Tooltip title={deliverySummary.first30RetentionRecheck.reason}>
                    <Tag className="novel-delivery-first30-tag" bordered={false}>
                      {deliverySummary.first30RetentionRecheck.label}
                    </Tag>
                  </Tooltip>
                )}
                {deliverySummary.innovationSync && (
                  <>
                    <Tag
                      className={`novel-delivery-innovation-tag novel-delivery-innovation-tag-${deliverySummary.innovationSync.status}`}
                      bordered={false}
                    >
                      {deliverySummary.innovationSync.scoreLabel}
                    </Tag>
                    {deliverySummary.innovationSync.missedCount > 0 && (
                      <Tag className="novel-delivery-innovation-tag novel-delivery-innovation-tag-warn" bordered={false}>
                        {deliverySummary.innovationSync.label}
                      </Tag>
                    )}
                  </>
                )}
                {deliverySummary.volumeBeatSync && (
                  <>
                    <Tag
                      className={`novel-delivery-volume-beat-tag novel-delivery-volume-beat-tag-${deliverySummary.volumeBeatSync.status}`}
                      bordered={false}
                    >
                      {deliverySummary.volumeBeatSync.scoreLabel}
                    </Tag>
                    {deliverySummary.volumeBeatSync.missedCount > 0 && (
                      <Tag className="novel-delivery-volume-beat-tag novel-delivery-volume-beat-tag-warn" bordered={false}>
                        {deliverySummary.volumeBeatSync.label}
                      </Tag>
                    )}
                  </>
                )}
                {deliverySummary.blueprintReceipt && (
                  <Tooltip
                    title={[
                      deliverySummary.blueprintReceipt.missed.length ? `缺口：${deliverySummary.blueprintReceipt.missed.join('、')}` : '',
                      deliverySummary.blueprintReceipt.evidence.length ? `证据：${deliverySummary.blueprintReceipt.evidence.join('；')}` : '',
                    ].filter(Boolean).join('；') || deliverySummary.blueprintReceipt.label}
                  >
                    <Tag
                      className={`novel-delivery-blueprint-tag novel-delivery-blueprint-tag-${deliverySummary.blueprintReceipt.status}`}
                      bordered={false}
                    >
                      {deliverySummary.blueprintReceipt.scoreLabel}
                    </Tag>
                  </Tooltip>
                )}
                {deliverySummary.revisionReceipt && (
                  <Tooltip
                    title={[
                      deliverySummary.revisionReceipt.risks.length ? `残余：${deliverySummary.revisionReceipt.risks.join('、')}` : '',
                      deliverySummary.revisionReceipt.evidence.length ? `修后证据：${deliverySummary.revisionReceipt.evidence.join('；')}` : '',
                    ].filter(Boolean).join('；') || deliverySummary.revisionReceipt.label}
                  >
                    <Tag
                      className={`novel-delivery-revision-tag novel-delivery-revision-tag-${deliverySummary.revisionReceipt.status}`}
                      bordered={false}
                    >
                      {deliverySummary.revisionReceipt.scoreLabel}
                    </Tag>
                  </Tooltip>
                )}
                {deliverySummary.deliveryRiskReceipt && (
                  <Tooltip
                    title={[
                      deliverySummary.deliveryRiskReceipt.risks.length ? `残余：${deliverySummary.deliveryRiskReceipt.risks.join('、')}` : '',
                      deliverySummary.deliveryRiskReceipt.evidence.length ? `承接证据：${deliverySummary.deliveryRiskReceipt.evidence.join('；')}` : '',
                    ].filter(Boolean).join('；') || deliverySummary.deliveryRiskReceipt.label}
                  >
                    <Tag
                      className={`novel-delivery-risk-receipt-tag novel-delivery-risk-receipt-tag-${deliverySummary.deliveryRiskReceipt.status}`}
                      bordered={false}
                    >
                      {deliverySummary.deliveryRiskReceipt.scoreLabel}
                    </Tag>
                  </Tooltip>
                )}
                {deliverySummary.sceneCardReceipt && (
                  <Tooltip
                    title={[
                      deliverySummary.sceneCardReceipt.scenes.length ? `场景：${deliverySummary.sceneCardReceipt.scenes.join('、')}` : '',
                      deliverySummary.sceneCardReceipt.fields.length ? `字段：${deliverySummary.sceneCardReceipt.fields.join('、')}` : '',
                      deliverySummary.sceneCardReceipt.evidence.length ? `证据：${deliverySummary.sceneCardReceipt.evidence.join('；')}` : '',
                    ].filter(Boolean).join('；') || deliverySummary.sceneCardReceipt.label}
                  >
                    <Tag
                      className={`novel-delivery-scene-card-receipt-tag novel-delivery-scene-card-receipt-tag-${deliverySummary.sceneCardReceipt.status}`}
                      bordered={false}
                    >
                      {deliverySummary.sceneCardReceipt.label}
                    </Tag>
                  </Tooltip>
                )}
                {deliverySummary.qualityAudit && (
                  <Tooltip
                    title={[
                      deliverySummary.qualityAudit.checks.length ? `检查：${deliverySummary.qualityAudit.checks.join('、')}` : '',
                      deliverySummary.qualityAudit.evidence.length ? `证据：${deliverySummary.qualityAudit.evidence.join('；')}` : '',
                      deliverySummary.qualityAudit.fixes.length ? `修法：${deliverySummary.qualityAudit.fixes.join('；')}` : '',
                      deliverySummary.qualityAudit.strategies.length ? `策略：${deliverySummary.qualityAudit.strategies.join('、')}` : '',
                    ].filter(Boolean).join('；') || deliverySummary.qualityAudit.label}
                  >
                    <Tag
                      className={`novel-delivery-quality-audit-tag novel-delivery-quality-audit-tag-${deliverySummary.qualityAudit.status}`}
                      bordered={false}
                    >
                      {deliverySummary.qualityAudit.label}
                    </Tag>
                  </Tooltip>
                )}
                {deliverySummary.qualityAuditSync && (
                  <Tooltip
                    title={[
                      deliverySummary.qualityAuditSync.evidence.length ? `证据：${deliverySummary.qualityAuditSync.evidence.join('；')}` : '',
                      deliverySummary.qualityAuditSync.nextActions.length ? `动作：${deliverySummary.qualityAuditSync.nextActions.join('；')}` : '',
                    ].filter(Boolean).join('；') || deliverySummary.qualityAuditSync.label}
                  >
                    <Tag
                      className={`novel-delivery-quality-sync-tag novel-delivery-quality-sync-tag-${deliverySummary.qualityAuditSync.status}`}
                      bordered={false}
                    >
                      诊断承接 · {deliverySummary.qualityAuditSync.label}
                    </Tag>
                  </Tooltip>
                )}
                {deliverySummary.qualityAuditRepairReceiptSync && (
                  <Tooltip
                    title={[
                      deliverySummary.qualityAuditRepairReceiptSync.evidence.length ? `证据：${deliverySummary.qualityAuditRepairReceiptSync.evidence.join('；')}` : '',
                      deliverySummary.qualityAuditRepairReceiptSync.nextActions.length ? `动作：${deliverySummary.qualityAuditRepairReceiptSync.nextActions.join('；')}` : '',
                    ].filter(Boolean).join('；') || deliverySummary.qualityAuditRepairReceiptSync.label}
                  >
                    <Tag
                      className={`novel-delivery-quality-repair-receipt-tag novel-delivery-quality-repair-receipt-tag-${deliverySummary.qualityAuditRepairReceiptSync.status}`}
                      bordered={false}
                    >
                      质量回执 · {deliverySummary.qualityAuditRepairReceiptSync.label}
                    </Tag>
                  </Tooltip>
                )}
                {deliverySummary.chapterHandoffSync && (
                  <Tooltip
                    title={[
                      deliverySummary.chapterHandoffSync.evidence.length ? `证据：${deliverySummary.chapterHandoffSync.evidence.join('；')}` : '',
                      deliverySummary.chapterHandoffSync.nextActions.length ? `动作：${deliverySummary.chapterHandoffSync.nextActions.join('；')}` : '',
                    ].filter(Boolean).join('；') || deliverySummary.chapterHandoffSync.label}
                  >
                    <Tag
                      className={`novel-delivery-handoff-sync-tag novel-delivery-handoff-sync-tag-${deliverySummary.chapterHandoffSync.status}`}
                      bordered={false}
                    >
                      章首承接 · {deliverySummary.chapterHandoffSync.label}
                    </Tag>
                  </Tooltip>
                )}
                {deliverySummary.chapterHandoffDeltaSync && (
                  <Tooltip
                    title={[
                      deliverySummary.chapterHandoffDeltaSync.evidence.length ? `证据：${deliverySummary.chapterHandoffDeltaSync.evidence.join('；')}` : '',
                      deliverySummary.chapterHandoffDeltaSync.nextActions.length ? `动作：${deliverySummary.chapterHandoffDeltaSync.nextActions.join('；')}` : '',
                    ].filter(Boolean).join('；') || deliverySummary.chapterHandoffDeltaSync.label}
                  >
                    <Tag
                      className={`novel-delivery-handoff-delta-tag novel-delivery-handoff-delta-tag-${deliverySummary.chapterHandoffDeltaSync.status}`}
                      bordered={false}
                    >
                      章末交接 · {deliverySummary.chapterHandoffDeltaSync.label}
                    </Tag>
                  </Tooltip>
                )}
                {deliverySummary.writePreparation && (
                  <Tooltip
                    title={[
                      deliverySummary.writePreparation.evidence.length ? `证据：${deliverySummary.writePreparation.evidence.join('；')}` : '',
                      deliverySummary.writePreparation.nextActions.length ? `动作：${deliverySummary.writePreparation.nextActions.join('；')}` : '',
                    ].filter(Boolean).join('；') || deliverySummary.writePreparation.label}
                  >
                    <Tag
                      className={`novel-delivery-write-preparation-tag novel-delivery-write-preparation-tag-${deliverySummary.writePreparation.status}`}
                      bordered={false}
                    >
                      写前准备 · {deliverySummary.writePreparation.label}
                    </Tag>
                  </Tooltip>
                )}
                {deliverySummary.approvalBlocker && (
                  <Tooltip
                    title={[
                      deliverySummary.approvalBlocker.detail,
                      deliverySummary.approvalBlocker.reasons.length ? `原因：${deliverySummary.approvalBlocker.reasons.join('；')}` : '',
                    ].filter(Boolean).join('；') || deliverySummary.approvalBlocker.label}
                  >
                    <Tag
                      className={`novel-delivery-approval-blocker-tag novel-delivery-approval-blocker-tag-${deliverySummary.approvalBlocker.status}`}
                      bordered={false}
                    >
                      {deliverySummary.approvalBlocker.scoreLabel} · {deliverySummary.approvalBlocker.label}
                    </Tag>
                  </Tooltip>
                )}
                {deliverySummary.platformRubric && (
                  <Tooltip
                    title={[
                      deliverySummary.platformRubric.missed.length ? `未达标：${deliverySummary.platformRubric.missed.join('、')}` : '',
                      deliverySummary.platformRubric.evidence.length ? `证据：${deliverySummary.platformRubric.evidence.join('；')}` : '',
                      deliverySummary.platformRubric.rubricSource ? `来源：${deliverySummary.platformRubric.rubricSource}` : '',
                    ].filter(Boolean).join('；') || deliverySummary.platformRubric.label}
                  >
                    <Tag
                      className={`novel-delivery-platform-tag novel-delivery-platform-tag-${deliverySummary.platformRubric.status}`}
                      bordered={false}
                    >
                      {deliverySummary.platformRubric.scoreLabel}
                    </Tag>
                  </Tooltip>
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
                      <Tooltip
                        title={deliverySummary.readabilityReview.aiSmellTactics?.length
                          ? `去AI味建议：${deliverySummary.readabilityReview.aiSmellTactics.join('；')}`
                          : deliverySummary.readabilityReview.riskLabel}
                      >
                        <Tag className="novel-delivery-readability-tag novel-delivery-readability-tag-warn" bordered={false}>
                          {deliverySummary.readabilityReview.riskLabel}
                        </Tag>
                      </Tooltip>
                    )}
                  </>
                )}
                <Text className="novel-delivery-status-reason">{deliverySummary.reason}</Text>
              </div>
            </div>
          )}

          <DeslopGateDiagnosticsPanel
            diagnostics={deliverySummary.deslopGateDiagnostics}
            onRepairDeslopGate={onRepairDeslopGate}
            repairLoading={deliveryActionLoading}
          />

          {chapterHandoffDesk?.visible && (
            <div className={`novel-chapter-handoff-strip novel-chapter-handoff-strip-${chapterHandoffDesk.status}`}>
              <div className="novel-chapter-handoff-main">
                <div className="novel-chapter-handoff-head">
                  <span className="novel-chapter-handoff-label">章节交接单</span>
                  <Tag className="novel-chapter-handoff-status" bordered={false}>{chapterHandoffDesk.label}</Tag>
                  <Text className="novel-chapter-handoff-route">
                    第{chapterHandoffDesk.fromChapterNo || '-'}章 → 第{chapterHandoffDesk.toChapterNo || '-'}章
                  </Text>
                  {chapterHandoffDesk.storylineStatusLabel && (
                    <Tag bordered={false}>{chapterHandoffDesk.storylineStatusLabel}</Tag>
                  )}
                  <Tag bordered={false}>{chapterHandoffDesk.storyStateSynced ? '状态已同步' : '状态待同步'}</Tag>
                </div>
                <div className="novel-chapter-handoff-grid">
                  <Tooltip title={chapterHandoffDesk.previousEnding || '无明确章末钩子'}>
                    <div>
                      <span>上一章钩子</span>
                      <strong>{chapterHandoffDesk.previousEnding || '无明确章末钩子'}</strong>
                    </div>
                  </Tooltip>
                  <Tooltip title={chapterHandoffDesk.expectationCarryOver.join('；') || '无期待欠账'}>
                    <div>
                      <span>期待承接</span>
                      <strong>{chapterHandoffDesk.expectationCarryOver.join('；') || '无期待欠账'}</strong>
                    </div>
                  </Tooltip>
                  <Tooltip title={chapterHandoffDesk.nextOpeningObligations.join('；') || '承接上一章最后一幕'}>
                    <div>
                      <span>下一章开场</span>
                      <strong>{chapterHandoffDesk.nextOpeningObligations.join('；') || '承接上一章最后一幕'}</strong>
                    </div>
                  </Tooltip>
                  {chapterHandoffDesk.deliveryRiskCarryOver && (
                    <Tooltip title={chapterHandoffDesk.deliveryRiskCarryOver.items.join('；') || '无交稿风险'}>
                      <div className="novel-chapter-handoff-risk">
                        <span>交稿风险</span>
                        <strong>{chapterHandoffDesk.deliveryRiskCarryOver.label} · {chapterHandoffDesk.deliveryRiskCarryOver.priorityLabel}</strong>
                      </div>
                    </Tooltip>
                  )}
                </div>
              </div>
              <Button
                className="novel-chapter-handoff-action"
                type={chapterHandoffDesk.status === 'ready' ? 'primary' : 'default'}
                size="small"
                loading={deliveryActionLoading && chapterHandoffDesk.status !== 'ready'}
                onClick={() => onDeliveryAction?.(chapterHandoffDesk.actionKey)}
              >
                {chapterHandoffDesk.actionLabel}
              </Button>
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
                  {draftBriefSummary.actionKey && (
                    <Button
                      className="novel-draft-brief-action"
                      size="small"
                      type={draftBriefSummary.actionKey === 'build_brief' ? 'primary' : 'default'}
                      loading={draftBriefActionLoading}
                      onClick={runDraftBriefAction}
                    >
                      {draftBriefSummary.actionLabel}
                    </Button>
                  )}
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
                {(draftBriefSummary.briefFields.writePreparationStatus || draftBriefSummary.briefFields.writePreparationSourceGaps || draftBriefSummary.briefFields.writePreparationMustConfirm) && (
                  <div className="novel-draft-brief-write-preparation">
                    <span>写前准备确认</span>
                    <strong>状态：{draftBriefSummary.briefFields.writePreparationStatus || 'ready'}</strong>
                    <strong>来源缺口：{draftBriefSummary.briefFields.writePreparationSourceGaps || '无'}</strong>
                    <strong>资产关系：{draftBriefSummary.briefFields.writePreparationAssetRisks || '无'}</strong>
                    <strong>交稿动作：{draftBriefSummary.briefFields.writePreparationDeliveryActions || '无'}</strong>
                    <strong>蓝图焦点：{draftBriefSummary.briefFields.writePreparationBlueprintFocus || '按章节蓝图执行'}</strong>
                    <strong>读者回报：{draftBriefSummary.briefFields.writePreparationReaderPayoff || draftBriefSummary.briefFields.readerPromise || '按追读雷达兑现'}</strong>
                    <strong>必须确认：{draftBriefSummary.briefFields.writePreparationMustConfirm || '无'}</strong>
                  </div>
                )}
                {(draftBriefSummary.briefFields.blueprintOutline || draftBriefSummary.briefFields.blueprintPlotLines || draftBriefSummary.briefFields.blueprintBeatSequence) && (
                  <div className="novel-draft-brief-blueprint">
                    <span>章节蓝图合同</span>
                    <Button
                      className="novel-draft-brief-blueprint-edit"
                      size="small"
                      icon={<EditOutlined />}
                      disabled={!onSavePreDraftBrief || Boolean(preDraftBriefLoading || generatingProse)}
                      onClick={openChapterBlueprintEditor}
                    >
                      编辑蓝图
                    </Button>
                    <strong>目标情绪：{draftBriefSummary.briefFields.blueprintTargetEmotion || draftBriefSummary.briefFields.emotionalCurve || '明确本章读者情绪走向'}</strong>
                    <strong>开篇钩子：{draftBriefSummary.briefFields.blueprintOpeningHook || draftBriefSummary.briefFields.retentionOpeningHook || '前300字要有可见抓手'}</strong>
                    <strong>核心回报：{draftBriefSummary.briefFields.blueprintCorePayoff || draftBriefSummary.briefFields.readerPromise || '明确本章兑现给读者的爽点/信息/关系变化'}</strong>
                    <strong>五段式：{draftBriefSummary.briefFields.blueprintOutline || '按起因、发展、转折、高潮、收束执行'}</strong>
                    <strong>多线推进：{draftBriefSummary.briefFields.blueprintPlotLines || '主线、副线、事件线、关系线和逻辑线都要落到正文'}</strong>
                    <strong>人物顺序：{draftBriefSummary.briefFields.blueprintCharacterOrder || '按场景需要控制出场'}</strong>
                    <strong>关系变化：{draftBriefSummary.briefFields.blueprintRelationshipChange || draftBriefSummary.briefFields.characterArcRelationshipShift || '写成站队、亏欠、误解或信任变化'}</strong>
                    <strong>信息缺口：{draftBriefSummary.briefFields.blueprintInformationGap || draftBriefSummary.briefFields.retentionInformationGap || '保留可追读的问题'}</strong>
                    <strong>节拍功能：{draftBriefSummary.briefFields.blueprintBeatSequence || '每个场景要有功能标签和回报'}</strong>
                    <strong>代价收益：{draftBriefSummary.briefFields.blueprintCostAndReward || '主角选择必须有代价和读者回报'}</strong>
                    <strong>章尾承接：{draftBriefSummary.briefFields.blueprintEndingContract || draftBriefSummary.briefFields.endingHook || '最后一幕压到下一章拉力'}</strong>
                    {draftBriefSummary.briefFields.blueprintWritingIntent && (
                      <strong>写作意图：{draftBriefSummary.briefFields.blueprintWritingIntent}</strong>
                    )}
                  </div>
                )}
                <div className="novel-draft-brief-retention">
                  <span>追读雷达</span>
                  <strong>开篇钩子：{draftBriefSummary.briefFields.retentionOpeningHook || '前300字要有抓手'}</strong>
                  <strong>爽点承诺：{draftBriefSummary.briefFields.retentionPayoffPromise || draftBriefSummary.briefFields.readerPromise || '明确本章回报'}</strong>
                  <strong>信息缺口：{draftBriefSummary.briefFields.retentionInformationGap || '保留待解问题'}</strong>
                  <strong>短剧场面：{draftBriefSummary.briefFields.retentionShortDramaScene || '需要可视化冲突场面'}</strong>
                  <strong>章末追读：{draftBriefSummary.briefFields.retentionEndingQuestion || draftBriefSummary.briefFields.endingHook || '压到最后一幕'}</strong>
                </div>
                {(draftBriefSummary.briefFields.readerDropRiskStatus || draftBriefSummary.briefFields.readerDropRisks || draftBriefSummary.briefFields.readerDropOpening) && (
                  <div className="novel-draft-brief-reader-drop">
                    <span>弃读预警</span>
                    <strong>{draftBriefSummary.briefFields.readerDropRiskStatus || '起点1万均订试读基准'}</strong>
                    <strong>风险：{draftBriefSummary.briefFields.readerDropRisks || '无明确弃读点'}</strong>
                    <strong>开篇防弃读：{draftBriefSummary.briefFields.readerDropOpening || draftBriefSummary.briefFields.retentionOpeningHook || '前300字先给现场压力'}</strong>
                    <strong>中段防掉速：{draftBriefSummary.briefFields.readerDropMiddle || '减少设定解释，用行动推进'}</strong>
                    <strong>章末防流失：{draftBriefSummary.briefFields.readerDropEnding || draftBriefSummary.briefFields.retentionEndingQuestion || '留下下一章必须看的问题'}</strong>
                  </div>
                )}
                {(draftBriefSummary.briefFields.storyDriveChoice || draftBriefSummary.briefFields.storyPressureSources || draftBriefSummary.briefFields.serialRhythmPayoffInterval || draftBriefSummary.briefFields.pageTurnQuestion) && (
                  <div className="novel-draft-brief-story-pull">
                    <span>强故事节奏</span>
                    <strong>压力源：{draftBriefSummary.briefFields.storyPressureSources || draftBriefSummary.briefFields.storyDriveObstacle || '本章必须有外部阻碍'}</strong>
                    <strong>主角选择：{draftBriefSummary.briefFields.storyDriveChoice || '必须写成主动选择'}</strong>
                    <strong>选择代价：{draftBriefSummary.briefFields.storyDriveCost || draftBriefSummary.briefFields.storyPressureStakes || '选择必须有代价'}</strong>
                    <strong>回报密度：{draftBriefSummary.briefFields.serialRhythmPayoffInterval || '每800-1200字给一次回报'}</strong>
                    <strong>场景回报：{draftBriefSummary.briefFields.serialRhythmScenePayoffs || '每个场景有目标、转折和回报'}</strong>
                    <strong>章末翻页：{draftBriefSummary.briefFields.pageTurnQuestion || draftBriefSummary.briefFields.pageTurnPull || draftBriefSummary.briefFields.retentionEndingQuestion || '最后300字压追读问题'}</strong>
                    {(draftBriefSummary.briefFields.storyDriveChange || draftBriefSummary.briefFields.pageTurnTrigger || draftBriefSummary.briefFields.pageTurnForbidden) && (
                      <strong>边界：{[
                        draftBriefSummary.briefFields.storyDriveChange ? `状态变化：${draftBriefSummary.briefFields.storyDriveChange}` : '',
                        draftBriefSummary.briefFields.pageTurnTrigger ? `触发：${draftBriefSummary.briefFields.pageTurnTrigger}` : '',
                        draftBriefSummary.briefFields.pageTurnForbidden ? `禁提前解答：${draftBriefSummary.briefFields.pageTurnForbidden}` : '',
                      ].filter(Boolean).join('；')}</strong>
                    )}
                  </div>
                )}
                {(draftBriefSummary.briefFields.longformBattleSummary || draftBriefSummary.briefFields.longformBattleRisks || draftBriefSummary.briefFields.longformBattleLaneRequirements) && (
                  <div className="novel-draft-brief-battle">
                    <span>长篇作战承接</span>
                    <strong>状态：{draftBriefSummary.briefFields.longformBattleStatus || '待承接'}</strong>
                    <strong>风险线：{draftBriefSummary.briefFields.longformBattleRisks || draftBriefSummary.briefFields.longformBattleSummary || '无明确风险'}</strong>
                    <strong>今日优先：{draftBriefSummary.briefFields.longformBattlePrimaryAction || '按风险线补正文动作'}</strong>
                    <strong>写作动作：{draftBriefSummary.briefFields.longformBattleLaneRequirements || '保持核心、追读和剧情线不偏移'}</strong>
                  </div>
                )}
                {(draftBriefSummary.briefFields.longformMemoryCorePromise || draftBriefSummary.briefFields.longformMemoryCharacters || draftBriefSummary.briefFields.longformMemoryQuestions || draftBriefSummary.briefFields.longformMemoryPayoffDebts) && (
                  <div className="novel-draft-brief-memory-capsule">
                    <span>长篇记忆胶囊</span>
                    <strong>同步：{draftBriefSummary.briefFields.longformMemoryStatus || '待同步'}</strong>
                    <strong>核心承诺：{draftBriefSummary.briefFields.longformMemoryCorePromise || '按写作圣经执行'}</strong>
                    <strong>主线进度：{draftBriefSummary.briefFields.longformMemoryMainline || '按当前章任务推进'}</strong>
                    <strong>角色状态：{draftBriefSummary.briefFields.longformMemoryCharacters || '无明确状态'}</strong>
                    <strong>开放悬念：{draftBriefSummary.briefFields.longformMemoryQuestions || '无'}</strong>
                    <strong>待兑现：{draftBriefSummary.briefFields.longformMemoryPayoffDebts || '无'}</strong>
                    <strong>正史事实：{draftBriefSummary.briefFields.longformMemoryCanonFacts || '无'}</strong>
                    <strong>红线：{draftBriefSummary.briefFields.longformMemoryRedLines || '不得偏离核心承诺'}</strong>
                  </div>
                )}
                {(draftBriefSummary.briefFields.governanceMemoryStatus || draftBriefSummary.briefFields.governanceMemoryEvidence || draftBriefSummary.briefFields.governanceMemoryWatchItems) && (
                  <div className="novel-draft-brief-governance-memory">
                    <span>治理复查承接</span>
                    <strong>{draftBriefSummary.briefFields.governanceMemoryStatus || '治理复查已记录'}</strong>
                    <strong>摘要：{draftBriefSummary.briefFields.governanceMemorySummary || '沿用上一轮修后证据'}</strong>
                    <strong>修后证据：{draftBriefSummary.briefFields.governanceMemoryEvidence || '无'}</strong>
                    {draftBriefSummary.briefFields.governanceMemoryFailedEvidence && (
                      <strong>失效依据：{draftBriefSummary.briefFields.governanceMemoryFailedEvidence}</strong>
                    )}
                    <strong>观察项：{draftBriefSummary.briefFields.governanceMemoryWatchItems || '无'}</strong>
                  </div>
                )}
                {(draftBriefSummary.briefFields.handoffPreviousEnding || draftBriefSummary.briefFields.handoffOpeningObligation || draftBriefSummary.briefFields.handoffMustCarry || draftBriefSummary.briefFields.handoffKeepAlive) && (
                  <div className="novel-draft-brief-handoff">
                    <span>上一章承接</span>
                    <strong>最后一幕：{draftBriefSummary.briefFields.handoffPreviousEnding || '承接上一章章末钩子'}</strong>
                    <strong>开篇义务：{draftBriefSummary.briefFields.handoffOpeningObligation || '开篇接住上一章悬念'}</strong>
                    <strong>必须推进：{draftBriefSummary.briefFields.handoffMustCarry || '无跨章欠账'}</strong>
                    <strong>继续悬念：{draftBriefSummary.briefFields.handoffKeepAlive || '无跨章悬念'}</strong>
                  </div>
                )}
                {(draftBriefSummary.briefFields.nextChapterQualityFocus || draftBriefSummary.briefFields.nextChapterQualityOpening || draftBriefSummary.briefFields.nextChapterQualityAvoid) && (
                  <div className="novel-draft-brief-next-quality">
                    <span>下一章质量续航</span>
                    <strong>质量目标：{draftBriefSummary.briefFields.nextChapterQualityFocus || '承接上一章自检质量目标'}</strong>
                    <strong>开篇：{draftBriefSummary.briefFields.nextChapterQualityOpening || '前300字接住上一章风险'}</strong>
                    <strong>中段：{draftBriefSummary.briefFields.nextChapterQualityMiddle || '把风险写成可见冲突或信息变化'}</strong>
                    <strong>章末：{draftBriefSummary.briefFields.nextChapterQualityEnding || '压出下一章追读问题'}</strong>
                    <strong>禁用重复：{draftBriefSummary.briefFields.nextChapterQualityAvoid || '避免复现上一章自检指出的套路'}</strong>
                    {draftBriefSummary.briefFields.nextChapterQualityEvidence && (
                      <strong>依据：{draftBriefSummary.briefFields.nextChapterQualityEvidence}</strong>
                    )}
                  </div>
                )}
                {(draftBriefSummary.briefFields.deliveryRiskLabel || draftBriefSummary.briefFields.deliveryRiskItems || draftBriefSummary.briefFields.deliveryRiskActions) && (
                  <div className="novel-draft-brief-delivery-risk">
                    <span>交稿风险承接</span>
                    <strong>{draftBriefSummary.briefFields.deliveryRiskLabel || '上一章待复盘'}</strong>
                    <strong>优先：{draftBriefSummary.briefFields.deliveryRiskPriority || '先处理最高风险'}</strong>
                    <strong>风险：{draftBriefSummary.briefFields.deliveryRiskItems || '无明确残留风险'}</strong>
                    <strong>动作：{draftBriefSummary.briefFields.deliveryRiskActions || '写成开篇承接、场景推进或章末钩子'}</strong>
                    {draftBriefSummary.briefFields.deliveryRiskOpeningActions && (
                      <strong>开篇：{draftBriefSummary.briefFields.deliveryRiskOpeningActions}</strong>
                    )}
                    {draftBriefSummary.briefFields.deliveryRiskMiddleActions && (
                      <strong>中段：{draftBriefSummary.briefFields.deliveryRiskMiddleActions}</strong>
                    )}
                    {draftBriefSummary.briefFields.deliveryRiskEndingActions && (
                      <strong>章末：{draftBriefSummary.briefFields.deliveryRiskEndingActions}</strong>
                    )}
                    {draftBriefSummary.briefFields.deliveryRiskEvidence && (
                      <strong>证据：{draftBriefSummary.briefFields.deliveryRiskEvidence}</strong>
                    )}
                  </div>
                )}
                {(draftBriefSummary.briefFields.expectationMustDeliver || draftBriefSummary.briefFields.expectationKeepAlive) && (
                  <div className="novel-draft-brief-expectations">
                    <span>读者期待账本</span>
                    <strong>必须兑现：{draftBriefSummary.briefFields.expectationMustDeliver || '承接本章读者承诺'}</strong>
                    <strong>保持悬念：{draftBriefSummary.briefFields.expectationKeepAlive || '无明确长期悬念'}</strong>
                    <strong>禁止破坏：{draftBriefSummary.briefFields.expectationMustNotBreak || '不得只铺设定不兑现期待'}</strong>
                  </div>
                )}
                {(draftBriefSummary.briefFields.expectationDebtMustCarry || draftBriefSummary.briefFields.expectationDebtKeepAlive || draftBriefSummary.briefFields.expectationDebtOverdue || draftBriefSummary.briefFields.expectationCarryOver) && (
                  <div className="novel-draft-brief-expectation-debt">
                    <span>期待债务承接</span>
                    {draftBriefSummary.briefFields.expectationDebtOverdue && (
                      <strong>逾期优先：{draftBriefSummary.briefFields.expectationDebtOverdue}</strong>
                    )}
                    <strong>待兑现：{draftBriefSummary.briefFields.expectationDebtMustCarry || draftBriefSummary.briefFields.expectationCarryOver || '无跨章欠账'}</strong>
                    <strong>继续悬念：{draftBriefSummary.briefFields.expectationDebtKeepAlive || '无跨章悬念'}</strong>
                    {draftBriefSummary.briefFields.expectationDebtSummary && (
                      <strong>债务概览：{draftBriefSummary.briefFields.expectationDebtSummary}</strong>
                    )}
                  </div>
                )}
                {(draftBriefSummary.briefFields.first30RetentionSegment || draftBriefSummary.briefFields.first30RetentionFlags) && (
                  <div className="novel-draft-brief-first30">
                    <span>前30章留存修复</span>
                    <strong>{draftBriefSummary.briefFields.first30RetentionSegment || '当前章'}</strong>
                    <strong>风险：{draftBriefSummary.briefFields.first30RetentionFlags || draftBriefSummary.briefFields.first30RetentionFocus || '无明确风险'}</strong>
                    <strong>动作：{draftBriefSummary.briefFields.first30RetentionActions || '按追读雷达补强'}</strong>
                  </div>
                )}
                {(draftBriefSummary.briefFields.recentFatigueRange || draftBriefSummary.briefFields.recentFatigueRisks || draftBriefSummary.briefFields.recentFatigueConflict) && (
                  <div className="novel-draft-brief-recent-fatigue">
                    <span>近10章疲劳规避</span>
                    <strong>{draftBriefSummary.briefFields.recentFatigueRange || '近10章'}</strong>
                    <strong>风险：{draftBriefSummary.briefFields.recentFatigueRisks || '无明确疲劳风险'}</strong>
                    <strong>冲突换源：{draftBriefSummary.briefFields.recentFatigueConflict || '更换压迫来源'}</strong>
                    <strong>回报换形：{draftBriefSummary.briefFields.recentFatiguePayoff || '更换回报形态'}</strong>
                    <strong>钩子换题：{draftBriefSummary.briefFields.recentFatigueHook || '更换章末问题'}</strong>
                    <strong>场面新鲜：{draftBriefSummary.briefFields.recentFatigueScene || '补新可视化场面'}</strong>
                    {draftBriefSummary.briefFields.recentFatigueActions && (
                      <strong>动作：{draftBriefSummary.briefFields.recentFatigueActions}</strong>
                    )}
                  </div>
                )}
                <div className="novel-draft-brief-innovation">
                  <span>创新执行</span>
                  <strong>创新角度：{draftBriefSummary.briefFields.innovationAngle || '承接长篇作品罗盘'}</strong>
                  <strong>执行点：{draftBriefSummary.briefFields.innovationExecution || '用本章动作/规则/反差落地'}</strong>
                  <strong>差异护栏：{draftBriefSummary.briefFields.innovationGuardrails || '不得写成普通套路章'}</strong>
                  <strong>IP化场面：{draftBriefSummary.briefFields.innovationIpHooks || draftBriefSummary.briefFields.retentionShortDramaScene || '保留可视化场面'}</strong>
                </div>
                {(draftBriefSummary.briefFields.signatureScene || draftBriefSummary.briefFields.signatureSceneTarget) && (
                  <div className="novel-draft-brief-signature-scene">
                    <span>强场面补位</span>
                    <strong>标志性场面：{draftBriefSummary.briefFields.signatureScene || '本章必须补一个可记忆画面'}</strong>
                    <strong>补位目标：{draftBriefSummary.briefFields.signatureSceneTarget || '修复强场面覆盖缺口'}</strong>
                    <strong>爽点回报：{draftBriefSummary.briefFields.signatureScenePayoff || '落成可见读者回报'}</strong>
                    <strong>服务主线：{draftBriefSummary.briefFields.signatureSceneStoryline || '服务当前主线推进'}</strong>
                  </div>
                )}
                <div className="novel-draft-brief-storylines">
                  <span>剧情线推进</span>
                  <strong>必推：{draftBriefSummary.briefFields.storylineAdvances || '无'}</strong>
                  <strong>埋线：{draftBriefSummary.briefFields.storylinePlants || '无'}</strong>
                  <strong>回收：{draftBriefSummary.briefFields.storylinePayoffs || '无'}</strong>
                  <strong>禁用：{draftBriefSummary.briefFields.storylineForbidden || '无'}</strong>
                </div>
                {(draftBriefSummary.briefFields.characterArcDesire || draftBriefSummary.briefFields.characterArcGrowthBeat || draftBriefSummary.briefFields.characterArcRelationshipShift) && (
                  <div className="novel-draft-brief-character-arc">
                    <span>人物成长承接</span>
                    <strong>人物线：{draftBriefSummary.briefFields.characterArcNames || '本章角色/关系线'}</strong>
                    <strong>角色欲望：{draftBriefSummary.briefFields.characterArcDesire || '用欲望驱动行动'}</strong>
                    <strong>缺陷受压：{draftBriefSummary.briefFields.characterArcFlawPressure || '让旧习惯被冲突逼出反应'}</strong>
                    <strong>成长节点：{draftBriefSummary.briefFields.characterArcGrowthBeat || '写成选择或行动变化'}</strong>
                    <strong>关系变化：{draftBriefSummary.briefFields.characterArcRelationshipShift || '写成对话、试探、站队或亏欠'}</strong>
                    <strong>口吻锚点：{draftBriefSummary.briefFields.characterArcVoiceAnchor || '保持角色说话和行动方式差异'}</strong>
                    <strong>禁揭：{draftBriefSummary.briefFields.characterArcForbiddenReveal || '不得提前写穿后续关系/成长结果'}</strong>
                  </div>
                )}
                {(draftBriefSummary.briefFields.storyUnitRange || draftBriefSummary.briefFields.storyUnitRole || draftBriefSummary.briefFields.storyUnitGoal) && (
                  <div className="novel-draft-brief-story-unit">
                    <span>剧情单元任务</span>
                    <strong>{draftBriefSummary.briefFields.storyUnitRange || '当前剧情单元'}</strong>
                    <strong>当前职责：{draftBriefSummary.briefFields.storyUnitRole || '承接本章任务书'}</strong>
                    <strong>单元目标：{draftBriefSummary.briefFields.storyUnitGoal || '推进当前事件包'}</strong>
                    <strong>小高潮：{draftBriefSummary.briefFields.storyUnitPayoff || '后续章节兑现，不在本章抢跑'}</strong>
                    <strong>出单元钩子：{draftBriefSummary.briefFields.storyUnitExitHook || '保留追读问题'}</strong>
                    <strong>禁抢跑：{draftBriefSummary.briefFields.storyUnitForbidden || '不得提前消费后段爆点'}</strong>
                  </div>
                )}
                {(draftBriefSummary.briefFields.volumeClimaxRange || draftBriefSummary.briefFields.volumeClimaxRole || draftBriefSummary.briefFields.volumeClimaxGoal) && (
                  <div className="novel-draft-brief-volume-climax">
                    <span>卷级爆点预算</span>
                    <strong>{draftBriefSummary.briefFields.volumeClimaxRange || '当前卷爆点'}</strong>
                    <strong>本章爆点职责：{draftBriefSummary.briefFields.volumeClimaxRole || '承接当前卷节奏'}</strong>
                    <strong>卷目标：{draftBriefSummary.briefFields.volumeClimaxGoal || '服务当前卷主线推进'}</strong>
                    <strong>高潮承诺：{draftBriefSummary.briefFields.volumeClimaxPromise || '本章必须给阶段性回报'}</strong>
                    <strong>必须兑现：{draftBriefSummary.briefFields.volumeClimaxRequiredBeats || '按场景卡兑现本章爆点'}</strong>
                    <strong>禁提前消费：{draftBriefSummary.briefFields.volumeClimaxForbidden || '不得提前揭穿卷末爆点'}</strong>
                    {draftBriefSummary.briefFields.volumeClimaxNearbyBeats && (
                      <strong>邻近爆点：{draftBriefSummary.briefFields.volumeClimaxNearbyBeats}</strong>
                    )}
                    {draftBriefSummary.briefFields.volumeClimaxNextActions && (
                      <strong>动作：{draftBriefSummary.briefFields.volumeClimaxNextActions}</strong>
                    )}
                  </div>
                )}
                {(draftBriefSummary.briefFields.batchGoal || draftBriefSummary.briefFields.batchCurrentRole) && (
                  <div className="novel-draft-brief-batch">
                    <span>本批连载任务</span>
                    <strong>{draftBriefSummary.briefFields.batchRange || '当前批次'}</strong>
                    <strong>批次目标：{draftBriefSummary.briefFields.batchGoal || '保持连载推进'}</strong>
                    <strong>本章职责：{draftBriefSummary.briefFields.batchCurrentRole || '承接本章任务书'}</strong>
                    <strong>禁抢跑：{draftBriefSummary.briefFields.batchForbidden || '不得提前消费后续爆点'}</strong>
                  </div>
                )}
                <div className="novel-draft-brief-meme">
                  <span>本章网感策略</span>
                  <strong>强度：{draftBriefSummary.briefFields.memeIntensity || '无'}</strong>
                  <strong>功能：{draftBriefSummary.briefFields.memeFunctions || '无'}</strong>
                  <strong>禁用：{draftBriefSummary.briefFields.memeForbidden || '严肃场景不玩梗'}</strong>
                </div>
                {(draftBriefSummary.briefFields.styleSampleKeys || draftBriefSummary.briefFields.styleSampleUsage || draftBriefSummary.briefFields.styleSampleControlState) && (
                  <div className="novel-draft-brief-style-samples">
                    <span>本章风格样章</span>
                    <strong>状态：{draftBriefSummary.briefFields.styleSampleControlState || '系统推荐待确认'}</strong>
                    <strong>样章：{draftBriefSummary.briefFields.styleSampleKeys || '未指定'}</strong>
                    <strong>学习：{draftBriefSummary.briefFields.styleSampleUsage || '只学习节奏与句式'}</strong>
                    <strong>命中：{draftBriefSummary.briefFields.styleSampleReasons || '按本章目标与场景卡匹配'}</strong>
                    <strong>禁抄：{draftBriefSummary.briefFields.styleSampleForbidden || '原句不能照搬'}</strong>
                    <div className="novel-draft-brief-style-actions">
                      <Tooltip title="确认本章使用当前风格样章策略">
                        <Button size="small" icon={<CheckCircleOutlined />} loading={styleSampleActionLoading} disabled={styleSampleActionDisabled || !onLockStyleSamples} onClick={onLockStyleSamples}>
                          锁定样章
                        </Button>
                      </Tooltip>
                      <Tooltip title="替换为另一组更适合本章的风格样章策略">
                        <Button size="small" icon={<SyncOutlined />} loading={styleSampleActionLoading} disabled={styleSampleActionDisabled || !onReplaceStyleSamples} onClick={onReplaceStyleSamples}>
                          换一组
                        </Button>
                      </Tooltip>
                      <Tooltip title="本章不使用风格样章，只按任务书和写作圣经生成">
                        <Button size="small" icon={<StopOutlined />} loading={styleSampleActionLoading} disabled={styleSampleActionDisabled || !onDisableStyleSamples} onClick={onDisableStyleSamples}>
                          不用样章
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                )}
                {(draftBriefSummary.briefFields.chapterBenchmarkKeys || draftBriefSummary.briefFields.chapterBenchmarkUsage) && (
                  <div className="novel-draft-brief-benchmark-samples">
                    <span>本章质量基准</span>
                    <strong>样例：{draftBriefSummary.briefFields.chapterBenchmarkKeys || '未指定'}</strong>
                    <strong>学习：{draftBriefSummary.briefFields.chapterBenchmarkUsage || '只学习章节结构与追读节拍'}</strong>
                    <strong>禁抄：{draftBriefSummary.briefFields.chapterBenchmarkForbidden || '不得复制桥段、角色名、设定和原句'}</strong>
                  </div>
                )}
              </div>
            </div>
          )}
          <Modal
            title="编辑章节蓝图合同"
            open={blueprintEditorOpen}
            width={860}
            okText="保存蓝图"
            cancelText="取消"
            confirmLoading={Boolean(preDraftBriefLoading)}
            onOk={saveChapterBlueprintEditor}
            onCancel={() => setBlueprintEditorOpen(false)}
            destroyOnClose
          >
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Input.TextArea
                value={blueprintEditorText}
                onChange={(event) => {
                  setBlueprintEditorText(event.target.value)
                  if (blueprintEditorError) setBlueprintEditorError('')
                }}
                autoSize={{ minRows: 16, maxRows: 26 }}
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12 }}
              />
              {blueprintEditorError && <Text type="danger">{blueprintEditorError}</Text>}
            </Space>
          </Modal>
    </>
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
          <div className="novel-editor-toolbar">
            <div className="novel-editor-toolbar-meta">
              <Title className="novel-editor-title" level={5}>
                第{activeChapter.chapter_no}章《{displayValue(activeChapter.title) || '无标题'}》
              </Title>
              <div className="novel-editor-status-stack">
                {chapterStatusTag(activeChapter)}
                {materialScore && (
                  <Tooltip title={(materialScore.recommendations || []).slice(0, 4).join('；') || '材料完整度'}>
                    <Tag
                      className={`novel-editor-material-tag${materialScore.can_generate ? ' is-ready' : Number(materialScore.score || 0) >= 65 ? ' is-warn' : ' is-blocked'}`}
                      bordered={false}
                    >
                      材料 {materialScore.score ?? '-'}%
                    </Tag>
                  </Tooltip>
                )}
              </div>
            </div>
            <div className="novel-editor-primary-entry">
              <div className="novel-editor-primary-cluster">
                <Tag className="novel-editor-primary-phase" bordered={false}>{aiResponsibility.phaseLabel}</Tag>
                <Tooltip title={`${recommendedAction.label}：${recommendedAction.reason}`}>
                  <Button
                    type="primary"
                    size="small"
                    className={commandClass(recommendedAction.key, 'novel-editor-primary-command novel-editor-primary-action-main')}
                    icon={<PlayCircleOutlined />}
                    loading={recommendedToolbarLoading}
                    onClick={runRecommendedToolbarAction}
                  >
                    {recommendedAction.label}
                  </Button>
                </Tooltip>
              </div>
              {recommendedAction.phase === 'draft' && renderWordTargetControl()}
            </div>
            <div className="novel-editor-toolbar-controls">
              <Text className="novel-editor-word-count" type="secondary">{wc(activeChapter.chapter_text)} 字</Text>
              <SaveIndicator status={saveStatus} />
              <EditorDisplayControls prefs={editorDisplayPrefs} onChange={setEditorDisplayPrefs} />
              <Popover content={secondaryActionMenu} trigger="click" placement="bottomRight">
                <Button className="novel-editor-more-actions" size="small" icon={<MoreOutlined />}>更多</Button>
              </Popover>
              {isImmersiveShell && (
                <div className="novel-writing-immersive-aux">
                  <div className="novel-writing-immersive-aux-tags">
                    {pickWritingAuxFocusTags({
                      delivery: deliverySummary.visible
                        ? {
                            visible: true,
                            statusLabel: deliverySummary.statusLabel,
                            risky: /风险|待|阻断|失败|需/.test(String(deliverySummary.statusLabel || '')),
                          }
                        : null,
                      queue: writingQueue?.visible
                        ? { visible: true, summary: writingAuxQueueSummary }
                        : null,
                      brief: draftBriefSummary.visible
                        ? {
                            visible: true,
                            statusLabel: draftBriefSummary.statusLabel,
                            hasGap: /缺口|待|未/.test(String(draftBriefSummary.statusLabel || '')),
                          }
                        : null,
                      handoff: chapterHandoffDesk?.visible
                        ? { visible: true, label: chapterHandoffDesk.label }
                        : null,
                    }).map(tag => (
                      <Tag key={tag.key} color={tag.color} bordered={false}>{tag.label}</Tag>
                    ))}
                  </div>
                  <Popover
                    trigger="click"
                    open={immersiveAuxOpen}
                    onOpenChange={setImmersiveAuxOpen}
                    placement="bottomRight"
                    overlayClassName="novel-writing-immersive-aux-popover"
                    content={
                      <div className="novel-writing-immersive-aux-panel" aria-label="写作辅助面板">
                        {writingSupportBody}
                      </div>
                    }
                  >
                    <Button size="small" className="novel-writing-immersive-aux-trigger">辅助</Button>
                  </Popover>
                </div>
              )}
            </div>
          </div>

          {!isImmersiveShell && (
            <>
              <div className={`novel-writing-aux-rail ${writingAuxCollapsed ? 'is-collapsed' : 'is-expanded'}`} aria-label="写作辅助面板状态">
                <div className="novel-writing-aux-summary">
                  {writingQueue?.visible && <Tag bordered={false}>队列 {writingAuxQueueSummary}</Tag>}
                  {deliverySummary.visible && <Tag bordered={false}>交稿 {deliverySummary.statusLabel}</Tag>}
                  {chapterHandoffDesk?.visible && <Tag bordered={false}>交接 {chapterHandoffDesk.label}</Tag>}
                  {draftBriefSummary.visible && <Tag bordered={false}>任务书 {draftBriefSummary.statusLabel}</Tag>}
                </div>
                <Space className="novel-writing-aux-controls" size={6} wrap>
                  <Tooltip title={writingAuxToggleHint}>
                    <Button
                      size="small"
                      className="novel-writing-aux-toggle"
                      icon={writingAuxCollapsed ? <DownOutlined /> : <UpOutlined />}
                      aria-expanded={!writingAuxCollapsed}
                      onClick={() => setWritingAuxCollapsed(prev => !prev)}
                    >
                      {writingAuxToggleLabel}
                    </Button>
                  </Tooltip>
                </Space>
              </div>
              {!writingAuxCollapsed && (
                <div className="novel-writing-support-stack" aria-label="写作辅助面板">
                  {writingSupportBody}
                </div>
              )}
            </>
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
