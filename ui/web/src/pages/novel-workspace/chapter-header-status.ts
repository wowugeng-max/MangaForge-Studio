/** 章节头部状态行与详情 popover 的纯推导模型,渲染层不做任何判断。 */
import type { ChapterWorkflowPhase } from './chapter-workflow-presenter'

export type ChapterHeaderStatusInput = {
  phase: ChapterWorkflowPhase
  phaseLabel: string
  wordCount?: number
  wordTarget?: number
  saveStatus?: 'saved' | 'saving' | 'error' | null
  material?: { score?: number | null; canGenerate?: boolean; recommendations?: string[] } | null
  queue?: { readyCount?: number; blockedCount?: number; draftedCount?: number } | null
  delivery?: { statusLabel?: string } | null
}

export type ChapterHeaderDetailItem = {
  key: string
  label: string
  tooltip?: string
  tone?: 'ok' | 'warning' | 'danger' | 'neutral'
}

export type ChapterHeaderStatus = {
  phaseLabel: string
  phaseTone: 'green' | 'red' | 'gold' | 'blue'
  wordLabel: string
  saveDot: 'saved' | 'saving' | 'error' | null
  detailItems: ChapterHeaderDetailItem[]
}

const PHASE_TONES: Record<ChapterWorkflowPhase, ChapterHeaderStatus['phaseTone']> = {
  empty: 'blue',
  blocked_materials: 'red',
  writing: 'blue',
  written_unchecked: 'blue',
  needs_revision: 'gold',
  needs_state_sync: 'gold',
  ready_next: 'green',
  failed_admission: 'red',
}

function formatCount(value: number) {
  return value.toLocaleString('en-US')
}

function materialTone(input: NonNullable<ChapterHeaderStatusInput['material']>): ChapterHeaderDetailItem['tone'] {
  if (input.canGenerate) return 'ok'
  return Number(input.score || 0) >= 65 ? 'warning' : 'danger'
}

export function buildChapterHeaderStatus(input: ChapterHeaderStatusInput): ChapterHeaderStatus {
  const wordCount = Math.max(0, Number(input.wordCount || 0))
  const wordTarget = Number(input.wordTarget || 0)
  const wordLabel = wordTarget > 0
    ? `${formatCount(wordCount)} / ${formatCount(wordTarget)} 字`
    : `${formatCount(wordCount)} 字`

  const detailItems: ChapterHeaderDetailItem[] = []
  if (input.material && input.material.score != null) {
    detailItems.push({
      key: 'material',
      label: `材料 ${input.material.score}%`,
      tone: materialTone(input.material),
      tooltip: (input.material.recommendations || []).slice(0, 4).join('；') || undefined,
    })
  }
  const queue = input.queue
  if (queue) {
    if (Number(queue.readyCount || 0) > 0) detailItems.push({ key: 'queue-ready', label: `可写 ${queue.readyCount}`, tone: 'ok' })
    if (Number(queue.blockedCount || 0) > 0) detailItems.push({ key: 'queue-blocked', label: `待补 ${queue.blockedCount}`, tone: 'warning' })
    if (Number(queue.draftedCount || 0) > 0) detailItems.push({ key: 'queue-drafted', label: `待质检 ${queue.draftedCount}`, tone: 'neutral' })
  }
  if (input.delivery?.statusLabel) {
    detailItems.push({ key: 'delivery', label: `交稿 ${input.delivery.statusLabel}`, tone: 'neutral' })
  }

  return {
    phaseLabel: input.phaseLabel,
    phaseTone: PHASE_TONES[input.phase] ?? 'blue',
    wordLabel,
    saveDot: input.saveStatus ?? null,
    detailItems,
  }
}
