export function padChapterNo(no: number): string {
  const n = Math.floor(Number(no) || 0)
  return n > 999 ? String(n) : String(n).padStart(3, '0')
}

export function safeChapterTitle(title: string): string {
  const cleaned = String(title || '').replace(/[^0-9A-Za-z\u4e00-\u9fff\-]/g, '')
  return cleaned || '未命名'
}

export function chapterFileName(no: number, title: string): string {
  return `第${padChapterNo(no)}章_${safeChapterTitle(title)}.md`
}

export function chapterRelPath(no: number, title: string): string {
  return `正文/${chapterFileName(no, title)}`
}
