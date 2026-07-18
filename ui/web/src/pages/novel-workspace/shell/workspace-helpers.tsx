import React, { Suspense } from 'react'
import type { SafeBatchRecoveryFocusSnapshot } from '../TaskCenterDrawer'

export function safeBatchRecoveryFocusFromPayload(payload: any): SafeBatchRecoveryFocusSnapshot | null {
  if (!payload) return null
  const focus = payload.safeBatchRecoveryFocus || payload.safe_batch_recovery_focus || payload
  const layerKey = String(focus?.layerKey || focus?.layer_key || '').trim()
  const layerLabel = String(focus?.layerLabel || focus?.layer_label || '').trim()
  const issueType = String(focus?.issueType || focus?.issue_type || '').trim()
  const targetView = String(focus?.targetView || focus?.target_view || '').trim()
  if (!layerKey || !issueType && !targetView) return null
  const statuses = Array.isArray(focus?.taskStatuses)
    ? focus.taskStatuses
    : Array.isArray(focus?.task_statuses)
      ? focus.task_statuses
      : []
  return {
    layerKey,
    layerLabel,
    actionLabel: String(focus?.actionLabel || focus?.action_label || layerLabel).trim(),
    targetView,
    issueType,
    source: String(focus?.source || '').trim(),
    taskStatuses: statuses.map((item: any) => String(item || '').trim()).filter(Boolean),
    taskCenterFilterLabel: String(focus?.taskCenterFilterLabel || focus?.task_center_filter_label || layerLabel).trim(),
  }
}

export function formatRunResumeErrorMessage(error: any) {
  const payload = error?.response?.data || {}
  if (payload?.error_code === 'APPROVAL_BLOCKER_REQUIRES_REPAIR') {
    const chapterLabel = payload.chapter_no ? `第${payload.chapter_no}章` : '当前章节'
    const actions = Array.isArray(payload.recovery_plan?.actions) ? payload.recovery_plan.actions.filter(Boolean).slice(0, 2).join('；') : ''
    return `${chapterLabel}仍有入库阻断，不能直接继续无人值守。${actions || '请先修复阻断并重新运行正文质检和入库门禁。'}`
  }
  return payload?.error || error?.message || '任务继续失败'
}

const INCUBATION_CHARACTER_TIER_LABELS: Record<string, string> = {
  protagonist: '主角',
  primary_supporting: '主要配角',
  secondary_supporting: '次要配角',
  cameo_supporting: '龙套/功能配角',
  antagonist_primary: '核心反派',
  antagonist_arc: '阶段反派',
  antagonist_minor: '反派配角',
  faction_agent: '势力执行者',
  supporting: '配角',
}

export function normalizeIncubationCharacterTier(character: any) {
  const raw = String(character?.tier || character?.role_type || character?.role || 'supporting').trim()
  if (INCUBATION_CHARACTER_TIER_LABELS[raw]) return raw
  if (/主角|protagonist/i.test(raw)) return 'protagonist'
  if (/核心反派|最终反派|boss|antagonist_primary/i.test(raw)) return 'antagonist_primary'
  if (/阶段反派|分卷反派|antagonist_arc/i.test(raw)) return 'antagonist_arc'
  if (/小反派|反派配角|antagonist_minor/i.test(raw)) return 'antagonist_minor'
  if (/势力|执行|faction/i.test(raw)) return 'faction_agent'
  if (/主要配角|primary/i.test(raw)) return 'primary_supporting'
  if (/次要配角|secondary/i.test(raw)) return 'secondary_supporting'
  if (/龙套|功能|cameo/i.test(raw)) return 'cameo_supporting'
  return raw || 'supporting'
}

export function flattenIncubationCharacters(payload: any) {
  const rows: any[] = Array.isArray(payload?.characters) ? [...payload.characters] : []
  const pool = payload?.character_pool || payload?.characterPool || {}
  for (const [tier, value] of Object.entries(pool || {})) {
    if (!Array.isArray(value)) continue
    rows.push(...value.map((item: any) => ({ ...item, tier: item?.tier || tier })))
  }
  const seen = new Set<string>()
  return rows.filter((item: any) => {
    const key = String(item?.name || item?.title || '').trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function groupIncubationCharacters(payload: any) {
  const groups = new Map<string, any[]>()
  for (const item of flattenIncubationCharacters(payload)) {
    const tier = normalizeIncubationCharacterTier(item)
    if (!groups.has(tier)) groups.set(tier, [])
    groups.get(tier)!.push(item)
  }
  return Array.from(groups.entries()).map(([tier, rows]) => ({ tier, rows: rows.slice(0, 10) }))
}

export function DeferredWorkspaceSurfaces({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}


export function formatStoryStateSyncFailure(update: any) {
  const hardFailures = [
    ...((Array.isArray(update?.errors) ? update.errors : []).flatMap((item: any) => Array.isArray(item?.hard_failures) ? item.hard_failures : [])),
    ...(Array.isArray(update?.hard_failures) ? update.hard_failures : []),
  ]
  const hardSummary = hardFailures
    .map((item: any) => String(item?.message || item?.key || '').trim())
    .filter(Boolean)
    .slice(0, 3)
    .join('；')
  if (hardSummary) return hardSummary
  if (update?.error) return String(update.error)
  const firstError = Array.isArray(update?.errors) ? update.errors[0] : null
  if (firstError?.error) return String(firstError.error)
  return '故事状态同步失败，请打开人工校正检查。'
}
