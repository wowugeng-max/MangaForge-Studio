import { anchorMatchScore } from './text-matching'

function compactText(value: any, limit = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

export function normalizeStoryUnitSyncBeat(key: string, label: string, text: any, source = 'story_unit', threshold = 58) {
  const normalizedText = compactText(text, 180)
  return normalizedText ? { key, label, text: normalizedText, source, threshold } : null
}

export function storyUnitSyncBeatMatch(beat: any, chapterText: string) {
  const match = anchorMatchScore(beat.text, chapterText)
  const delivered = match.score >= Number(beat.threshold || 58)
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered,
  }
}

export function storyUnitForbiddenTouched(beat: any, chapterText: string) {
  const match = anchorMatchScore(String(beat.text || '').replace(/^不得|禁止|不可/, ''), chapterText)
  const touched = match.score >= 42
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    touched,
  }
}


export function buildStoryUnitCard(input: any = {}) {
  const unitId = compactText(input.unit_id || input.unitId || input.id || input.循环ID || input.单元ID || 'unit_1', 40)
  const title = compactText(input.title || input.name || input.单元名 || input.剧情单元 || '未命名剧情单元', 80)
  const beat = compactText(input.unit_beat || input.unitBeat || input.循环节拍 || input.单元节拍 || input.beat || '', 120)
  const primaryPushLine = compactText(input.primary_push_line || input.primaryPushLine || input.主推线 || '战力线', 40)
  const chapterRole = compactText(input.current_chapter_role || input.currentChapterRole || input.本章职责 || '', 80)
  const benchmarkRef = compactText(input.benchmark_plot_ref || input.benchmarkPlotRef || input.对标剧情参照 || '', 160)
  const goalChain = [input.setup, input.obstacle, input.cost_choice || input.costChoice, input.payoff]
    .map(item => compactText(item, 80))
    .filter(Boolean)
  return {
    version: 'oh_story_story_unit_card_v1',
    unit_id: unitId,
    title,
    unit_beat: beat,
    primary_push_line: primaryPushLine,
    current_chapter_role: chapterRole,
    benchmark_plot_ref: benchmarkRef,
    goal_chain: goalChain.length ? goalChain : ['目标建立', '阻碍升级', '代价选择', '结果回收'],
    forbidden_advance: Array.isArray(input.forbidden_advance || input.forbiddenAdvance)
      ? (input.forbidden_advance || input.forbiddenAdvance).map((item: any) => compactText(item, 100)).filter(Boolean)
      : [],
    open_threads: Array.isArray(input.open_threads || input.openThreads)
      ? (input.open_threads || input.openThreads).map((item: any) => compactText(item, 100)).filter(Boolean)
      : [],
    batch_boundary: compactText(input.batch_boundary || input.batchBoundary || '一批 = 一个剧情单元', 80),
  }
}

export function formatStoryUnitCardPrompt(card: any = {}) {
  if (!card || typeof card !== 'object') return ''
  return [
    '【剧情单元卡】',
    `单元ID: ${card.unit_id || '-'}`,
    `标题: ${card.title || '-'}`,
    `单元节拍: ${card.unit_beat || '-'}`,
    `主推线: ${card.primary_push_line || '-'}`,
    `本章职责: ${card.current_chapter_role || '-'}`,
    `对标剧情参照: ${card.benchmark_plot_ref || '-'}`,
    `目标链: ${(card.goal_chain || []).join(' -> ')}`,
    `批次边界: ${card.batch_boundary || '一批 = 一个剧情单元'}`,
  ].join('\n')
}
