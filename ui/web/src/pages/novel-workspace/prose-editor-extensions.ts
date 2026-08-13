/** 写作向 CodeMirror 扩展:打字机滚动与段落聚焦。段落以空行为界。 */
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

export type ParagraphRange = { from: number; to: number }

function lineBoundsAt(text: string, pos: number): { start: number; end: number } {
  const start = text.lastIndexOf('\n', Math.max(0, pos - 1)) + 1
  const nextBreak = text.indexOf('\n', pos)
  return { start, end: nextBreak === -1 ? text.length : nextBreak }
}

function isBlankLine(text: string, start: number, end: number) {
  return text.slice(start, end).trim() === ''
}

export function paragraphRangeAt(text: string, pos: number): ParagraphRange {
  const clamped = Math.min(Math.max(pos, 0), text.length)
  const line = lineBoundsAt(text, clamped)
  if (isBlankLine(text, line.start, line.end)) {
    return { from: clamped, to: clamped }
  }

  let from = line.start
  while (from > 0) {
    const prev = lineBoundsAt(text, from - 1)
    if (isBlankLine(text, prev.start, prev.end)) break
    from = prev.start
  }

  let to = line.end
  while (to < text.length) {
    const next = lineBoundsAt(text, to + 1)
    if (isBlankLine(text, next.start, next.end)) break
    to = next.end
  }

  return { from, to }
}

/** 光标行保持视口垂直居中。dispatch 不能发生在 update 周期内,故经 rAF 派发。 */
export function typewriterExtension() {
  let scheduled = 0
  return EditorView.updateListener.of((update: ViewUpdate) => {
    if (!update.selectionSet && !update.docChanged) return
    const view = update.view
    if (scheduled) cancelAnimationFrame(scheduled)
    scheduled = requestAnimationFrame(() => {
      scheduled = 0
      const head = view.state.selection.main.head
      view.dispatch({ effects: EditorView.scrollIntoView(head, { y: 'center' }) })
    })
  })
}

const dimLine = Decoration.line({ class: 'cm-prose-dim' })

const paragraphFocusTheme = EditorView.baseTheme({
  '.cm-prose-dim': {
    opacity: '0.35',
    transition: 'opacity 0.25s ease',
  },
})

function buildDimDecorations(view: EditorView): DecorationSet {
  const doc = view.state.doc
  const text = doc.toString()
  const focus = paragraphRangeAt(text, view.state.selection.main.head)
  const builder = new RangeSetBuilder<Decoration>()
  for (const { from, to } of view.visibleRanges) {
    let pos = from
    while (pos <= to) {
      const line = doc.lineAt(pos)
      const insideFocus = focus.from !== focus.to && line.to >= focus.from && line.from <= focus.to
      if (!insideFocus && line.length > 0) {
        builder.add(line.from, line.from, dimLine)
      }
      pos = line.to + 1
    }
  }
  return builder.finish()
}

/** 非当前段落淡化,聚焦正在写的段落。 */
export function paragraphFocusExtension() {
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = buildDimDecorations(view)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = buildDimDecorations(update.view)
        }
      }
    },
    { decorations: plugin => plugin.decorations },
  )
  return [plugin, paragraphFocusTheme]
}
