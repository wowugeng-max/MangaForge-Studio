import React from 'react'
import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { Typography } from 'antd'
import { buildProseOutline } from './prose-outline'

const { Text } = Typography

export function ProseOutlineRail({
  text,
  proseEditorRef,
}: {
  text: string
  proseEditorRef: React.MutableRefObject<EditorView | null>
}) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)
  const outline = React.useMemo(() => buildProseOutline(text), [text])

  if (outline.length === 0) return null

  const jumpTo = (from: number, index: number) => {
    const view = proseEditorRef.current
    if (!view) return
    const pos = Math.min(from, view.state.doc.length)
    view.dispatch({
      selection: EditorSelection.cursor(pos),
      effects: EditorView.scrollIntoView(pos, { y: 'start', yMargin: 48 }),
    })
    view.focus()
    setActiveIndex(index)
  }

  return (
    <div className="novel-prose-outline-rail" aria-label="章内大纲">
      <div className="novel-prose-outline-head">
        <Text type="secondary">段落 · {outline.length}</Text>
      </div>
      <div className="novel-prose-outline-list">
        {outline.map(entry => (
          <button
            key={`${entry.index}-${entry.from}`}
            type="button"
            className={`novel-prose-outline-item${activeIndex === entry.index ? ' is-active' : ''}`}
            onClick={() => jumpTo(entry.from, entry.index)}
            title={entry.label}
          >
            <span className="novel-prose-outline-no">{entry.index}</span>
            <span className="novel-prose-outline-label">{entry.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
