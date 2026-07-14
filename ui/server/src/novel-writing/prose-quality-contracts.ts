import { stripProseEngineeringAppendix } from './prose-format'
import { selectContinuitySafeProseCandidate } from './prose-candidate-continuity'

type LaunchGateCheck = {
  key: string
  label: string
  status: string
  reason: string
}

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

function compactText(value: any, fallback = '') {
  return String(value ?? fallback ?? '').replace(/\s+/g, ' ').trim()
}

function optionEnabled(value: any) {
  if (value === true) return true
  if (typeof value === 'string') return /^(1|true|yes|on|sync|synchronous|inline|full)$/i.test(value.trim())
  return false
}

export function shouldRunSynchronousReadabilityReview(options: any = {}, project: any = {}) {
  const qualityPipeline = project?.reference_config?.quality_pipeline || project?.reference_config?.qualityPipeline || {}
  if (optionEnabled(options.run_readability_review ?? options.runReadabilityReview)) return true
  if (optionEnabled(options.synchronous_readability_review ?? options.synchronousReadabilityReview)) return true
  if (optionEnabled(qualityPipeline.run_readability_review ?? qualityPipeline.runReadabilityReview)) return true
  const mode = compactText(
    options.auxiliary_review_mode
      ?? options.auxiliaryReviewMode
      ?? qualityPipeline.auxiliary_review_mode
      ?? qualityPipeline.auxiliaryReviewMode,
  ).toLowerCase()
  return ['sync', 'synchronous', 'inline', 'full'].includes(mode)
}

function proseCharCount(value: any) {
  return String(value || '').replace(/\s+/g, '').length
}

function looksLikeNonChineseProse(value: string) {
  const text = String(value || '')
  if (/(?:[A-Za-z][A-Za-z'-]*\s+){23,}[A-Za-z][A-Za-z'-]*/.test(text)) return true
  const latinChars = (text.match(/[A-Za-z]/g) || []).length
  const chineseChars = (text.match(/[\u3400-\u9fff]/g) || []).length
  return latinChars >= 120 && chineseChars < Math.max(40, Math.floor(latinChars * 0.25))
}

function parseChineseChapterNumber(value: string) {
  if (/^\d+$/.test(value)) return Number(value)
  const digits: Record<string, number> = {
    零: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  }
  const units: Record<string, number> = { 十: 10, 百: 100, 千: 1000 }
  let total = 0
  let current = 0
  for (const char of value) {
    if (char in digits) {
      current = digits[char]
      continue
    }
    const unit = units[char]
    if (!unit) return 0
    total += (current || 1) * unit
    current = 0
  }
  return total + current
}

function containsWrongChapterBoundary(value: string, chapterNo: number) {
  const marker = /^\s*(?:#{1,6}\s*)?第\s*([0-9零一二两三四五六七八九十百千]+)\s*章(?:\s|$)/gm
  for (const match of String(value || '').matchAll(marker)) {
    const parsed = parseChineseChapterNumber(match[1])
    if (parsed > 0 && parsed !== chapterNo) return true
  }
  return false
}

function looksTruncated(value: string, currentText = '') {
  const text = String(value || '').trim()
  if (!text) return true
  const fenceCount = (text.match(/```/g) || []).length
  if (fenceCount % 2 !== 0) return true
  if (text.startsWith('{')) {
    try {
      JSON.parse(text)
    } catch {
      return true
    }
  }
  const quotePairs: Array<[RegExp, RegExp]> = [
    [/「/g, /」/g],
    [/『/g, /』/g],
    [/“/g, /”/g],
  ]
  if (quotePairs.some(([open, close]) => (text.match(open) || []).length !== (text.match(close) || []).length)) return true
  if (/[，,:：；;、\\]$/.test(text)) return true
  const currentChars = proseCharCount(currentText)
  const candidateChars = proseCharCount(text)
  return currentChars >= 800 && candidateChars < Math.floor(currentChars * 0.65)
}

function normalizeLaunchGateCheck(value: any, fallbackKey = 'chapter_launch_gate'): LaunchGateCheck | null {
  if (!value || typeof value !== 'object') return null
  const key = compactText(value.key || fallbackKey)
  const label = compactText(value.label || value.name || key)
  const status = compactText(value.status || value.state || value.result).toLowerCase()
  const reason = compactText(value.reason || value.detail || value.summary || value.fix || value.evidence || value.message)
  if (!status && !reason) return null
  return { key, label, status, reason }
}

function launchGateChecks(gate: any): LaunchGateCheck[] {
  if (!gate || typeof gate !== 'object') return []
  const signalChecks = asArray(gate.signals)
    .map((item: any) => normalizeLaunchGateCheck(item))
    .filter(Boolean) as LaunchGateCheck[]
  const objectChecks = Object.entries(gate)
    .filter(([key, value]) => !['signals', 'summary', 'reason', 'detail', 'status'].includes(key) && value && typeof value === 'object' && !Array.isArray(value))
    .map(([key, value]) => normalizeLaunchGateCheck({ key, ...(value as any) }, key))
    .filter(Boolean) as LaunchGateCheck[]
  const directChecks = asArray(gate.blocked_items || gate.blockedItems || gate.blockers)
    .map((item: any, index: number) => normalizeLaunchGateCheck({
      key: `blocked_item_${index + 1}`,
      label: '门禁阻断项',
      status: 'blocked',
      reason: item,
    }))
    .filter(Boolean) as LaunchGateCheck[]
  const checks = [...signalChecks, ...objectChecks, ...directChecks]
  if (checks.length) return checks
  const direct = normalizeLaunchGateCheck({
    key: 'chapter_launch_gate',
    label: '开写门禁',
    status: gate.status,
    reason: gate.summary || gate.reason || gate.detail,
  })
  return direct ? [direct] : []
}

function isBlockingLaunchGateStatus(status: string) {
  return /^(block|blocked|fail|failed|failure|error|missing|invalid|stop|stopped)$/i.test(compactText(status))
}

export function getChapterLaunchGateBlocker(gate: any, options: { writePreparationBrief?: any } = {}) {
  const liveWritePrep = options.writePreparationBrief
  const liveWritePrepReady = ['ready', 'ok', 'pass'].includes(String(
    liveWritePrep?.readiness_status
    || liveWritePrep?.readinessStatus
    || '',
  ).toLowerCase())
  const blockedChecks = launchGateChecks(gate).filter((check) => {
    if (!isBlockingLaunchGateStatus(check.status)) return false
    // Cockpit may send a cached write-prep launch gate; once live write prep is ready, do not hard-block.
    if (liveWritePrepReady && /write_preparation|写前准备/i.test(`${check.key} ${check.label}`)) return false
    return true
  })
  if (blockedChecks.length === 0) return null
  const summary = blockedChecks
    .map(check => [check.label, check.reason || check.status].filter(Boolean).join('：'))
    .filter(Boolean)
    .join('；')
  return {
    code: 'PROSE_LAUNCH_GATE_BLOCKED',
    label: '开写门禁未通过',
    summary: summary || '本章开写门禁存在阻断项。',
    blocked_checks: blockedChecks,
  }
}

export function selectUsableRevisionText(
  currentText: string,
  revisionLike: any = {},
  options: {
    chapterNo?: number
    blockingFindings?: any[]
    candidateStage?: string
    previousChapterTail?: string
    requiredHandoffAnchors?: string[]
    sceneCards?: any[]
    continuityContext?: any
  } = {},
) {
  const current = String(currentText || '')
  const rawCandidate = String(
    revisionLike?.final_text
      || revisionLike?.finalText
      || revisionLike?.chapter_text
      || revisionLike?.chapterText
      || '',
  )
  const stripped = stripProseEngineeringAppendix(rawCandidate)
  const candidate = stripped.text
  const strict = Number(options.chapterNo || 0) > 0 || Array.isArray(options.blockingFindings)
  if (!candidate.trim()) {
    return { text: current, accepted: false, reason: '' }
  }
  if (strict && stripped.changed && stripped.removed_line_count > 0) {
    return { text: current, accepted: false, reason: '修订稿包含写作工程附录' }
  }
  if (strict && looksLikeNonChineseProse(candidate)) {
    return { text: current, accepted: false, reason: '修订稿包含连续非中文正文' }
  }
  if (strict && Number(options.chapterNo || 0) > 0 && containsWrongChapterBoundary(candidate, Number(options.chapterNo))) {
    return { text: current, accepted: false, reason: '修订稿混入其他章节或标题边界' }
  }
  if (strict && looksTruncated(candidate, current)) {
    return { text: current, accepted: false, reason: '修订稿疑似截断' }
  }
  const blockingFindings = Array.isArray(options.blockingFindings) ? options.blockingFindings : []
  const findingsWithEvidence = blockingFindings.filter(item => compactText(item?.evidence))
  const unchangedEvidence = findingsWithEvidence.filter(item => {
    const evidence = compactText(item?.evidence)
    return current.includes(evidence) && candidate.includes(evidence)
  })
  if (findingsWithEvidence.length > 0 && unchangedEvidence.length === findingsWithEvidence.length) {
    return { text: current, accepted: false, reason: '修订稿没有改变任何 blocking finding 证据' }
  }
  const currentChars = proseCharCount(current)
  const candidateChars = proseCharCount(candidate)
  if (currentChars >= 400 && candidateChars < 200) {
    return {
      text: current,
      accepted: false,
      reason: `修订稿过短：${candidateChars}/${currentChars}`,
    }
  }
  if (currentChars >= 800 && candidateChars < Math.floor(currentChars * 0.65)) {
    return {
      text: current,
      accepted: false,
      reason: `修订稿过短：${candidateChars}/${currentChars}`,
    }
  }
  const continuity = selectContinuitySafeProseCandidate(current, candidate, options.continuityContext || {
    previous_handoff: options.previousChapterTail,
    requiredHandoffAnchors: options.requiredHandoffAnchors,
    scene_cards: options.sceneCards,
  }, { candidate_stage: options.candidateStage })
  if (!continuity.accepted) {
    return { text: current, accepted: false, reason: '修订稿丢失上一章承接', warning: continuity.warning }
  }
  return { text: candidate, accepted: true, reason: '' }
}

const DELIVERY_RISK_RECEIPT_FIELD_PATTERN = 'delivery_risk_receipts|next_chapter_quality_plan_receipts|revision_receipts|deslop_repair_receipts|quality_audit_repair_receipts'
const DELIVERY_RISK_RECEIPT_NOISE_PATTERN = new RegExp(`(缺少\\s*(${DELIVERY_RISK_RECEIPT_FIELD_PATTERN})|模型自检未逐项输出\\s*(${DELIVERY_RISK_RECEIPT_FIELD_PATTERN})?)`, 'i')
const GENERIC_CHAPTER_DELIVERY_RISK_PATTERN = /第?\d+章?交稿风险必须在本章开篇、场景推进或章末钩子中得到可见承接[。.]?/g
const RECURSIVE_DELIVERY_RISK_PREFIX_PATTERN = /^(修复|复核承接|补齐|补充|处理|修订)\s*[：:]\s*(修复|复核承接|补齐|补充|处理|修订)\s*[：:]/i
const STAGED_DELIVERY_RISK_PREFIXES: Array<[RegExp, string]> = [
  [/^(已存回执开篇承接|复核承接开篇修复)\s*[：:]/i, '开篇承接'],
  [/^(已存回执中段兑现|复核承接中段修复)\s*[：:]/i, '中段兑现'],
  [/^(已存回执章尾复核|复核承接章尾修复)\s*[：:]/i, '章尾复核'],
]

function stagedDeliveryRiskPrefixLabel(value: string) {
  for (const [pattern, label] of STAGED_DELIVERY_RISK_PREFIXES) {
    if (pattern.test(value)) return label
  }
  return ''
}

function isNonActionableDeliveryRiskCarryOverSegment(value: string) {
  const normalized = compactText(value)
  if (!normalized) return true
  if (/^(前?\s*300\s*字|前三百字|开篇|章首|中段|章末|章尾|结尾)$/.test(normalized)) return true
  if (/^(已处理|已修复|已完成|见正文|详见正文|无)$/.test(normalized)) return true
  return false
}

function stripDeliveryRiskCarryOverPrefix(value: string) {
  let text = value
  for (let index = 0; index < 8; index += 1) {
    const next = text.replace(/^(修复|复核承接|补齐|补充|处理|修订|已存回执(?:开篇承接|中段兑现|章尾复核)?|复核承接(?:开篇|中段|章尾)?修复)\s*[：:]\s*/i, '')
    if (next === text) break
    text = next.trim()
  }
  return text
}

function compactDeliveryRiskCarryOverSegment(value: string) {
  const fieldPattern = DELIVERY_RISK_RECEIPT_FIELD_PATTERN
  let segment = value
    .replace(new RegExp(`缺少\\s*(${fieldPattern})\\s*[：:]\\s*`, 'gi'), '')
    .replace(new RegExp(`缺少\\s*(${fieldPattern})[^；;。]*[。.]?`, 'gi'), '')
    .replace(new RegExp(`模型自检未逐项输出\\s*(${fieldPattern})?[^；;。]*[。.]?`, 'gi'), '')
    .replace(/前?\s*300\s*字先执行上一章\s*delivery_risk_receipts\s*的\s*required_action[^；;。]*[。.]?/gi, '')
    .replace(/中段必须把上一章\s*required_action\/remaining_risk[^；;。]*[。.]?/gi, '')
    .replace(/章尾检查上一章\s*delivery_risk_receipts\s*是否闭环[^；;。]*[。.]?/gi, '')
    .replace(/按\s*delivery_risk_receipts\s*的\s*risk_item\/required_action\s*补可见承接[^；;。]*[。.]?/gi, '')
    .replace(/章尾复核\s*delivery_risk_receipts\s*的\s*remaining_risk\s*是否归零[^；;。]*[。.]?/gi, '')
    .replace(GENERIC_CHAPTER_DELIVERY_RISK_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim()
  segment = stripDeliveryRiskCarryOverPrefix(segment)
  segment = segment
    .replace(GENERIC_CHAPTER_DELIVERY_RISK_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim()
  return segment
}

export function compactDeliveryRiskCarryOverText(value: any) {
  const original = compactText(value)
  if (!original) return ''
  const stagedLabel = stagedDeliveryRiskPrefixLabel(original)
  const needsCompaction = DELIVERY_RISK_RECEIPT_NOISE_PATTERN.test(original)
    || RECURSIVE_DELIVERY_RISK_PREFIX_PATTERN.test(original)
    || GENERIC_CHAPTER_DELIVERY_RISK_PATTERN.test(original)
    || /已存回执|复核承接(?:开篇|中段|章尾)修复|delivery_risk_receipts\s*的\s*(required_action|risk_item|remaining_risk)/i.test(original)
  GENERIC_CHAPTER_DELIVERY_RISK_PATTERN.lastIndex = 0
  if (!needsCompaction) return original
  const segments = original
    .split(/[；;]\s*/)
    .map(segment => segment.trim())
    .filter(Boolean)
    .map(compactDeliveryRiskCarryOverSegment)
    .filter(segment => segment.length >= 4)
    .filter(segment => !isNonActionableDeliveryRiskCarryOverSegment(segment))
    .filter(segment => !DELIVERY_RISK_RECEIPT_NOISE_PATTERN.test(segment))
  const compacted = compactText(Array.from(new Set(segments)).join('；'))
  return stagedLabel && compacted ? `${stagedLabel}：${compacted}` : compacted
}
