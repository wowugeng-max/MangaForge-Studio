import React from 'react'
import { Button, Card, Col, Descriptions, Popover, Progress, Row, Slider, Space, Tag, Tooltip, Typography } from 'antd'
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
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  FileTextOutlined,
  FontSizeOutlined,
  LineHeightOutlined,
  PlayCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { chapterStatusTag, displayValue, wc } from './utils'

const { Title, Text, Paragraph } = Typography

type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'
type EditorDisplayPrefs = { fontSize: number; lineHeight: number }

const EDITOR_DISPLAY_PREFS_KEY = 'novel.workspace.editorDisplayPrefs'
const DEFAULT_EDITOR_DISPLAY_PREFS: EditorDisplayPrefs = { fontSize: 15, lineHeight: 24 }

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

  const content = (
    <div style={{ width: 260, padding: '4px 2px 0' }}>
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
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
  generatingProse,
  generatingSceneCards,
  onRunPlan,
  onCreateOutline,
  onCreateChapter,
  onGenerateCurrentChapterProse,
  onGenerateSceneCards,
  onEditActiveChapter,
  onChapterTextChange,
}: {
  isEmptyProject: boolean
  selectedProject: any | null
  activeChapter: any | null
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
  generatingProse: boolean
  generatingSceneCards: boolean
  onRunPlan: () => void
  onCreateOutline: () => void
  onCreateChapter: () => void
  onGenerateCurrentChapterProse: () => void
  onGenerateSceneCards: () => void
  onEditActiveChapter: () => void
  onChapterTextChange: (text: string) => void
}) {
  const [editorDisplayPrefs, setEditorDisplayPrefs] = React.useState<EditorDisplayPrefs>(() => loadEditorDisplayPrefs())

  React.useEffect(() => {
    saveEditorDisplayPrefs(editorDisplayPrefs)
  }, [editorDisplayPrefs])

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fafbfc' }}>
      {isEmptyProject && (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 32 }}>
          <div style={{ maxWidth: 640, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🚀</div>
            <Title level={3}>欢迎开始创作《{selectedProject?.title}》</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 32 }}>
              你的小说项目已创建。选择以下任一路径开始：
            </Text>
            <Row gutter={24} justify="center">
              {[
                { icon: '🤖', title: 'AI 一键初始化', desc: '自动生成世界观、角色、大纲', btn: <Button type="primary" loading={planning} onClick={onRunPlan}>开始规划</Button> },
                { icon: '✏️', title: '手动创建', desc: '从大纲开始逐步构建', btn: <Button onClick={onCreateOutline}>创建大纲</Button> },
                { icon: '📝', title: '直接写第一章', desc: '跳过规划直接写正文', btn: <Button onClick={onCreateChapter}>新增章节</Button> },
              ].map(card => (
                <Col key={card.title} xs={22} sm={12}>
                  <Card hoverable style={{ borderRadius: 16, height: '100%' }}
                    bodyStyle={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>{card.icon}</div>
                    <Title level={5}>{card.title}</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>{card.desc}</Text>
                    {card.btn}
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      )}

      {!isEmptyProject && activeChapter && (
        <>
          <div style={{
            flexShrink: 0, padding: '10px 24px', background: '#fff',
            borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <Title level={5} style={{ margin: 0 }}>
              第{activeChapter.chapter_no}章《{displayValue(activeChapter.title) || '无标题'}》
            </Title>
            {chapterStatusTag(activeChapter)}
            <div style={{ flex: 1 }} />
            <Text type="secondary" style={{ fontSize: 13 }}>{wc(activeChapter.chapter_text)} 字</Text>
            <SaveIndicator status={saveStatus} />
            <EditorDisplayControls prefs={editorDisplayPrefs} onChange={setEditorDisplayPrefs} />
            <Tooltip title="生成或刷新场景卡">
              <Button size="small" icon={<FileTextOutlined />} loading={generatingSceneCards} onClick={onGenerateSceneCards}>场景卡</Button>
            </Tooltip>
            <Tooltip title="生成正文">
              <Button type="primary" size="small" icon={<PlayCircleOutlined />} loading={generatingProse} onClick={onGenerateCurrentChapterProse} />
            </Tooltip>
            <Button size="small" onClick={onEditActiveChapter} icon={<EditOutlined />}>元数据</Button>
          </div>

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

          <details style={{ flexShrink: 0, margin: 0 }}>
            <summary style={{ padding: '8px 24px', cursor: 'pointer', background: '#fafbfc', borderBottom: '1px solid #f0f0f0', fontSize: 13, color: '#667085' }}>
              章节上下文（目标、摘要、冲突、钩子、场景卡）
            </summary>
            <div style={{ padding: '12px 24px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="章节目标">{displayValue(activeChapter.chapter_goal) || '-'}</Descriptions.Item>
                <Descriptions.Item label="章节摘要">{displayValue(activeChapter.chapter_summary) || '-'}</Descriptions.Item>
                <Descriptions.Item label="冲突">{displayValue(activeChapter.conflict) || '-'}</Descriptions.Item>
                <Descriptions.Item label="结尾钩子">{displayValue(activeChapter.ending_hook) || '-'}</Descriptions.Item>
                <Descriptions.Item label="必须推进">
                  {Array.isArray(activeChapter.raw_payload?.must_advance) && activeChapter.raw_payload.must_advance.length > 0
                    ? activeChapter.raw_payload.must_advance.join('；')
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="禁止重复">
                  {Array.isArray(activeChapter.raw_payload?.forbidden_repeats) && activeChapter.raw_payload.forbidden_repeats.length > 0
                    ? activeChapter.raw_payload.forbidden_repeats.join('；')
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="状态">{displayValue(activeChapter.status) || '-'}</Descriptions.Item>
                <Descriptions.Item label="基础依赖">
                  {worldbuildingCount > 0 ? '有世界观' : '缺世界观'} ·
                  {characterCount > 0 ? '有角色' : '缺角色'} ·
                  {outlineCount > 0 ? '有大纲' : '缺大纲'}
                </Descriptions.Item>
              </Descriptions>
              {Array.isArray(activeChapter.scene_breakdown) && activeChapter.scene_breakdown.length > 0 && (
                <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                  <Text strong style={{ fontSize: 13 }}>场景卡</Text>
                  {activeChapter.scene_breakdown.map((scene: any, index: number) => (
                    <div key={`${scene.scene_no || index}-${scene.title || index}`} style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: '10px 12px', background: '#fbfcfe' }}>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color="blue" bordered={false}>场景 {scene.scene_no || index + 1}</Tag>
                          <Text strong>{scene.title || scene.description || scene.purpose || '未命名场景'}</Text>
                          {scene.location && <Tag bordered={false}>{scene.location}</Tag>}
                          {scene.emotional_tone && <Tag color="purple" bordered={false}>{scene.emotional_tone}</Tag>}
                        </Space>
                        {(scene.purpose || scene.description) && <Text>{scene.purpose || scene.description}</Text>}
                        {scene.conflict && <Text type="secondary">冲突：{scene.conflict}</Text>}
                        {scene.beat && <Text type="secondary">节拍：{scene.beat}</Text>}
                        {scene.exit_state && <Text type="secondary">出场状态：{scene.exit_state}</Text>}
                      </Space>
                    </div>
                  ))}
                </div>
              )}
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
