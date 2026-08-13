import React from 'react'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { openSearchPanel, search, searchKeymap } from '@codemirror/search'
import { Compartment, EditorState } from '@codemirror/state'
import { paragraphFocusExtension, typewriterExtension } from './prose-editor-extensions'
import type { EditorDisplayPrefs } from './workspace-center-chrome'

/** CodeMirror 搜索面板文案汉化。key 为 @codemirror/search 内部 phrase 原文。 */
const SEARCH_PHRASES = {
  'Find': '查找',
  'Replace': '替换',
  'next': '下一个',
  'previous': '上一个',
  'all': '全部',
  'match case': '区分大小写',
  'by word': '整词匹配',
  'regexp': '正则',
  'replace': '替换',
  'replace all': '全部替换',
  'close': '关闭',
  'current match': '当前匹配',
  'replaced $ matches': '已替换 $ 处',
  'replaced match on line $': '已替换第 $ 行的匹配',
  'on line': '于行',
}

/** 供命令面板等外部入口打开查找替换。 */
export function openProseSearch(view: EditorView | null) {
  if (!view) return false
  view.focus()
  return openSearchPanel(view)
}

export function ProseEditor({
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
  const syncingExternalValueRef = React.useRef(false)
  const displayPrefsRef = React.useRef(displayPrefs)
  const typewriterCompartmentRef = React.useRef(new Compartment())
  const paragraphFocusCompartmentRef = React.useRef(new Compartment())
  displayPrefsRef.current = displayPrefs

  React.useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: [
        typewriterCompartmentRef.current.reconfigure(displayPrefs.typewriter ? typewriterExtension() : []),
        paragraphFocusCompartmentRef.current.reconfigure(displayPrefs.paragraphFocus ? paragraphFocusExtension() : []),
      ],
    })
  }, [displayPrefs.typewriter, displayPrefs.paragraphFocus])

  React.useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  React.useEffect(() => {
    valueRef.current = value
    const view = viewRef.current
    if (!view || view.state.doc.toString() === value) return
    // External prop sync (detail hydrate / chapter switch) must not look like user edits,
    // otherwise autosave can persist an empty draft and wipe stored prose.
    syncingExternalValueRef.current = true
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    })
    syncingExternalValueRef.current = false
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
          typewriterCompartmentRef.current.of(displayPrefsRef.current.typewriter ? typewriterExtension() : []),
          paragraphFocusCompartmentRef.current.of(displayPrefsRef.current.paragraphFocus ? paragraphFocusExtension() : []),
          search({ top: true }),
          EditorState.phrases.of(SEARCH_PHRASES),
          keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap, ...searchKeymap]),
          EditorView.updateListener.of(update => {
            if (!update.docChanged) return
            const next = update.state.doc.toString()
            valueRef.current = next
            if (syncingExternalValueRef.current) return
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
      <div ref={hostRef} className="novel-prose-editor-host" style={{ height: '100%', minHeight: 0 }} />
    </div>
  )
}

