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
import { EditorState } from '@codemirror/state'

export type EditorDisplayPrefs = { fontSize: number; lineHeight: number }

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
          keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
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
      <div ref={hostRef} style={{ height: '100%', minHeight: 0 }} />
    </div>
  )
}

