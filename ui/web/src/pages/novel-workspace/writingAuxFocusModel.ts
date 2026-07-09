export type WritingAuxFocusTag = {
  key: 'delivery' | 'queue' | 'brief' | 'handoff'
  label: string
  color?: string
}

export type WritingAuxFocusInput = {
  delivery?: { visible: boolean; statusLabel: string; risky?: boolean } | null
  queue?: { visible: boolean; summary: string } | null
  brief?: { visible: boolean; statusLabel: string; hasGap?: boolean } | null
  handoff?: { visible: boolean; label: string } | null
}

export function pickWritingAuxFocusTags(input: WritingAuxFocusInput, limit = 3): WritingAuxFocusTag[] {
  const out: WritingAuxFocusTag[] = []
  const push = (tag: WritingAuxFocusTag | null) => {
    if (!tag || out.length >= limit) return
    out.push(tag)
  }

  if (input.delivery?.visible) {
    push({
      key: 'delivery',
      label: `交稿 ${input.delivery.statusLabel}`,
      color: input.delivery.risky ? 'gold' : undefined,
    })
  }
  if (input.queue?.visible && input.queue.summary) {
    push({ key: 'queue', label: `队列 ${input.queue.summary}` })
  }
  if (input.brief?.visible) {
    push({
      key: 'brief',
      label: `任务书 ${input.brief.statusLabel}`,
      color: input.brief.hasGap ? 'gold' : undefined,
    })
  }
  if (input.handoff?.visible) {
    push({ key: 'handoff', label: `交接 ${input.handoff.label}` })
  }
  return out
}
