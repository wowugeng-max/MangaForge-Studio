import React from 'react'
import { Empty, Input, Modal, Spin, Tag, Typography } from 'antd'
import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import apiClient from '../../api/client'
import {
  searchChapterText,
  buildBookSearchSummary,
  type BookSearchChapterResult,
} from './book-search-model'

const { Text } = Typography

const FETCH_CONCURRENCY = 4

type ChapterSummary = {
  id: number
  chapter_no: number
  title: string
  has_prose?: boolean
}

function HighlightedSnippet({ snippet, query }: { snippet: string; query: string }) {
  const lower = snippet.toLowerCase()
  const target = query.toLowerCase()
  const parts: React.ReactNode[] = []
  let cursor = 0
  while (true) {
    const index = lower.indexOf(target, cursor)
    if (index === -1) break
    if (index > cursor) parts.push(snippet.slice(cursor, index))
    parts.push(<mark key={index}>{snippet.slice(index, index + query.length)}</mark>)
    cursor = index + query.length
  }
  if (cursor < snippet.length) parts.push(snippet.slice(cursor))
  return <>{parts}</>
}

export function BookSearchModal({
  open,
  projectId,
  activeChapterId,
  activeChapterText,
  proseEditorRef,
  onClose,
  onJumpToChapter,
}: {
  open: boolean
  projectId: number | null
  activeChapterId: number | null
  activeChapterText: string
  proseEditorRef: React.MutableRefObject<EditorView | null>
  onClose: () => void
  onJumpToChapter?: (chapterId: number) => void
}) {
  const [query, setQuery] = React.useState('')
  const [searching, setSearching] = React.useState(false)
  const [progress, setProgress] = React.useState('')
  const [results, setResults] = React.useState<BookSearchChapterResult[] | null>(null)
  const textCacheRef = React.useRef(new Map<number, string>())
  const searchTokenRef = React.useRef(0)

  React.useEffect(() => {
    if (!open) return
    setResults(null)
    setProgress('')
  }, [open])

  // 章切换后正文可能已变,不复用旧缓存
  React.useEffect(() => {
    textCacheRef.current = new Map()
  }, [projectId])

  const runSearch = async () => {
    const needle = query.trim()
    if (!projectId || needle.length < 2 || searching) return
    const token = ++searchTokenRef.current
    setSearching(true)
    setResults(null)
    try {
      const listResponse = await apiClient.get(`/novel/projects/${projectId}/chapters`, {
        params: { view: 'workspace' },
      })
      const chapters: ChapterSummary[] = Array.isArray(listResponse.data) ? listResponse.data : []
      const searchable = chapters.filter(chapter => chapter.has_prose || chapter.id === activeChapterId)

      const collected: BookSearchChapterResult[] = []
      let done = 0
      const queue = [...searchable]
      const worker = async () => {
        while (queue.length > 0) {
          if (searchTokenRef.current !== token) return
          const chapter = queue.shift()!
          let text = ''
          if (chapter.id === activeChapterId) {
            text = activeChapterText
          } else if (textCacheRef.current.has(chapter.id)) {
            text = textCacheRef.current.get(chapter.id) || ''
          } else {
            try {
              const detail = await apiClient.get(`/novel/chapters/${chapter.id}`, {
                params: { project_id: projectId },
              })
              text = String(detail.data?.chapter_text || '')
              textCacheRef.current.set(chapter.id, text)
            } catch {
              text = ''
            }
          }
          const hits = searchChapterText(text, needle)
          if (hits.length > 0) {
            collected.push({
              chapterId: chapter.id,
              chapterNo: Number(chapter.chapter_no || 0),
              title: String(chapter.title || ''),
              hits,
            })
          }
          done += 1
          if (searchTokenRef.current === token) setProgress(`已搜 ${done}/${searchable.length} 章`)
        }
      }
      await Promise.all(Array.from({ length: FETCH_CONCURRENCY }, worker))
      if (searchTokenRef.current !== token) return
      collected.sort((a, b) => a.chapterNo - b.chapterNo)
      setResults(collected)
    } finally {
      if (searchTokenRef.current === token) {
        setSearching(false)
        setProgress('')
      }
    }
  }

  const jumpToHit = (chapterId: number, index: number) => {
    if (chapterId === activeChapterId) {
      const view = proseEditorRef.current
      if (view) {
        const pos = Math.min(index, view.state.doc.length)
        view.dispatch({
          selection: EditorSelection.range(pos, Math.min(pos + query.trim().length, view.state.doc.length)),
          effects: EditorView.scrollIntoView(pos, { y: 'center' }),
        })
        view.focus()
      }
      onClose()
      return
    }
    onJumpToChapter?.(chapterId)
    onClose()
  }

  return (
    <Modal
      title="全书查找"
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnClose
    >
      <Input.Search
        autoFocus
        placeholder="至少 2 个字符,回车搜索全书正文"
        value={query}
        onChange={event => setQuery(event.target.value)}
        onSearch={runSearch}
        enterButton="搜索"
        loading={searching}
      />
      <div className="novel-book-search-body">
        {searching && (
          <div className="novel-book-search-progress">
            <Spin size="small" /> <Text type="secondary">{progress || '搜索中…'}</Text>
          </div>
        )}
        {!searching && results !== null && (
          <>
            <div className="novel-book-search-summary">
              <Text type="secondary">{buildBookSearchSummary(results)}</Text>
            </div>
            {results.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="全书没有找到匹配内容" />
            ) : (
              results.map(result => (
                <div key={result.chapterId} className="novel-book-search-chapter">
                  <div className="novel-book-search-chapter-head">
                    <Text strong>第{result.chapterNo}章 {result.title}</Text>
                    <Tag>{result.hits.length} 处</Tag>
                    {result.chapterId === activeChapterId && <Tag color="blue">当前章</Tag>}
                  </div>
                  {result.hits.map(hit => (
                    <button
                      key={`${result.chapterId}-${hit.index}`}
                      type="button"
                      className="novel-book-search-hit"
                      onClick={() => jumpToHit(result.chapterId, hit.index)}
                    >
                      <HighlightedSnippet snippet={hit.snippet} query={query.trim()} />
                    </button>
                  ))}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
