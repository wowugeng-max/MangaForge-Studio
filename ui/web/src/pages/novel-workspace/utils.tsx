import React from 'react'
import { Space, Tag, Typography } from 'antd'
import { STATUS_LABELS } from '../../constants/uiCopy'

const { Text } = Typography

export function chapterStatusTag(chapter: any) {
  if (!chapter?.chapter_text) return <Tag color="default">未写</Tag>
  if (String(chapter.chapter_text).includes('【占位正文】')) return <Tag color="orange">占位</Tag>
  return <Tag color="green">已写</Tag>
}

export function sourceLabel(item: any) {
  if (item?.outputSource === 'fallback') return <Tag color="gold">{STATUS_LABELS.content.placeholder}</Tag>
  if (item?.fallbackUsed) return <Tag color="orange">{STATUS_LABELS.runtime.failed}</Tag>
  return <Tag color="green">模型输出</Tag>
}

export function versionSourceLabel(source?: string) {
  if (source === 'agent_execute') return 'Agent 回写'
  if (source === 'repair') return '连续性修复'
  if (source === 'rollback') return '回滚产生'
  return '手动编辑'
}

export function versionSourceColor(source?: string) {
  if (source === 'agent_execute') return 'blue'
  if (source === 'repair') return 'orange'
  if (source === 'rollback') return 'purple'
  return 'green'
}

export function buildTextDiff(currentText: string, versionText: string) {
  const a = String(currentText || '').split(/\r?\n/)
  const b = String(versionText || '').split(/\r?\n/)
  const max = Math.max(a.length, b.length)
  const rows: Array<{ type: 'same' | 'add' | 'remove'; text: string }> = []
  for (let i = 0; i < max; i += 1) {
    const la = a[i] ?? ''
    const lb = b[i] ?? ''
    if (la === lb) {
      if (la) rows.push({ type: 'same', text: la })
    } else {
      if (lb) rows.push({ type: 'remove', text: lb })
      if (la) rows.push({ type: 'add', text: la })
    }
  }
  return rows
}

export function buildDiffSummary(rows: Array<{ type: string; text: string }>) {
  return {
    added: rows.filter(r => r.type === 'add').length,
    removed: rows.filter(r => r.type === 'remove').length,
    unchanged: rows.filter(r => r.type === 'same').length,
  }
}

export function displayValue(value: any): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(item => displayValue(item)).filter(Boolean).join(', ')
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, val]) => {
        const text = displayValue(val)
        return text ? `${key}: ${text}` : ''
      })
      .filter(Boolean)
      .join('; ')
  }
  return String(value)
}

export function displayPreview(value: any, max = 30): string {
  const text = displayValue(value)
  if (!text) return '未命名'
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export function buildTree(outlines: any[], chapters: any[]) {
  const byId = new Map<number, any>()
  outlines.forEach(o => byId.set(o.id, {
    ...o, type: 'outline', key: `outline-${o.id}`,
    title: o.title, children: [] as any[],
  }))
  const roots: any[] = []
  outlines.forEach(o => {
    const node = byId.get(o.id)
    if (o.parent_id && byId.has(o.parent_id)) byId.get(o.parent_id).children.push(node)
    else roots.push(node)
  })
  chapters.forEach(c => {
    const node = {
      ...c, type: 'chapter', key: `chapter-${c.id}`,
      title: c.title, children: [] as any[],
    }
    if (c.outline_id && byId.has(c.outline_id)) byId.get(c.outline_id).children.push(node)
    else roots.push(node)
  })
  return roots
}

export function chapterTreeNumber(node: any) {
  return Number(node?.chapter_no ?? node?.chapter_number ?? node?.raw_payload?.chapter_no ?? 0)
}

export function formatChapterTreeNodeLabel(node: any) {
  const title = displayPreview(node?.title, 48)
  if (node?.type !== 'chapter') return title
  const chapterNo = chapterTreeNumber(node)
  return `${chapterNo > 0 ? `第${chapterNo}章` : '章节'} ${title}`
}

function chapterTreeNodeTitle(node: any) {
  if (node?.type === 'chapter') {
    const chapterNo = chapterTreeNumber(node)
    return (
      <Space size={6} className="novel-outline-tree-node novel-outline-tree-chapter">
        <Text className="novel-outline-tree-chapter-no">{chapterNo > 0 ? `第${chapterNo}章` : '章节'}</Text>
        <Text className="novel-outline-tree-title">{displayPreview(node.title, 48)}</Text>
        {chapterStatusTag(node)}
      </Space>
    )
  }

  return (
    <Space size={6} className="novel-outline-tree-node novel-outline-tree-outline">
      <span className="novel-outline-tree-dot" />
      <Text className="novel-outline-tree-title">{displayPreview(node.title, 48)}</Text>
    </Space>
  )
}

export function buildChapterTreeData(chapterTree: any[]) {
  return chapterTree.map(node => ({
    title: chapterTreeNodeTitle(node),
    key: node.key,
    children: buildChapterTreeData(node.children || []),
  }))
}

export function wc(text?: string) {
  return text ? String(text).replace(/\s/g, '').length : 0
}

export function summarizeOutlineExecution(execution: any, requestedChapterCount?: number) {
  const results = execution?.results || []
  const outlineStep = results.find((r: any) => r.step === 'outline-agent')
  const detailStep = results.find((r: any) => r.step === 'detail-outline-agent')
  const continuityStep = results.find((r: any) => r.step === 'continuity-check-agent')

  const outlineCount = Array.isArray(outlineStep?.output?.chapter_outlines) ? outlineStep.output.chapter_outlines.length : 0
  const detailCount = Array.isArray(detailStep?.output?.detail_chapters) ? detailStep.output.detail_chapters.length : 0
  const actualCount = detailCount || outlineCount

  const failedSteps = results.filter((r: any) => r && r.outputSource !== 'skipped' && !r.success)

  return {
    actualCount,
    outlineCount,
    detailCount,
    failedSteps,
    outlineError: outlineStep?.error || '',
    detailError: detailStep?.error || '',
    continuityError: continuityStep?.error || '',
    requestedChapterCount: requestedChapterCount || 0,
  }
}
