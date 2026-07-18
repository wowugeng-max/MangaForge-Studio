import { asArray } from '../../routes/novel-route-utils'
import { countProseChars } from '../../novel-writing/word-target'
import { anchorMatchScore, anchorTerms, normalizedMatchText } from '../../novel-writing/text-matching'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import {
  receiptEvidenceLocatedInProse,
  receiptEvidenceLocatedInQualityPlanSegment,
} from '../quality/receipt-evidence'

import {
  chapterReceiptProseText,
  stateDeltaEvidenceText
} from './delta-sync-reports'

type AnyFn = (...args: any[]) => any
let assetLinkageExplicitContract: AnyFn = (_contextPackage: any = {}) => ({})
let assetText: AnyFn = (item: any) => String(item?.name || item?.title || item?.id || '').trim()
let assetStateChangeText: AnyFn = (value: any) => String(value || '').trim()

export function bindPostDeliveryDeltaSyncRevisionDeps(deps: {
  assetLinkageExplicitContract?: AnyFn
  assetText?: AnyFn
  assetStateChangeText?: AnyFn
} = {}) {
  if (deps.assetLinkageExplicitContract) assetLinkageExplicitContract = deps.assetLinkageExplicitContract
  if (deps.assetText) assetText = deps.assetText
  if (deps.assetStateChangeText) assetStateChangeText = deps.assetStateChangeText
}


export function buildRevisionScopeGuardSyncReport(chapter: any, selfCheck: any = {}) {
  const revision = selfCheck?.revision || selfCheck?.revised_revision || selfCheck || {}
  const guard = selfCheck?.revision_scope_guard
    || selfCheck?.revisionScopeGuard
    || revision?.revision_scope_guard
    || revision?.revisionScopeGuard
    || {}
  const originalText = String(selfCheck?.original_text || selfCheck?.originalText || guard?.original_text || guard?.originalText || '')
  const revisedText = String(selfCheck?.final_text || selfCheck?.finalText || revision?.final_text || revision?.finalText || guard?.revised_text || guard?.revisedText || '')
  const originalCount = Number(
    guard?.original_word_count
    ?? guard?.originalWordCount
    ?? guard?.original_char_count
    ?? guard?.originalCharCount
    ?? (originalText ? countProseChars(originalText) : 0),
  )
  const revisedCount = Number(
    guard?.revised_word_count
    ?? guard?.revisedWordCount
    ?? guard?.edited_word_count
    ?? guard?.editedWordCount
    ?? guard?.final_word_count
    ?? guard?.finalWordCount
    ?? guard?.revised_char_count
    ?? guard?.revisedCharCount
    ?? (revisedText ? countProseChars(revisedText) : 0),
  )
  const revised = Boolean(selfCheck?.revised || revision?.revised || guard?.revised || (originalCount > 0 && revisedCount > 0 && originalCount !== revisedCount))
  const delta = originalCount > 0 && revisedCount > 0 ? Math.abs(revisedCount - originalCount) : 0
  const allowedDelta = originalCount > 0 ? Math.max(Math.round(originalCount * 0.3), 800) : 0
  const deltaRatio = originalCount > 0 ? Number((delta / originalCount).toFixed(4)) : 0
  const direction = revisedCount < originalCount ? 'shrink' : revisedCount > originalCount ? 'expand' : 'same'
  const missingAuditCounts = revised && (originalCount <= 0 || revisedCount <= 0)
  const excessiveDelta = revised && originalCount > 0 && revisedCount > 0 && delta > allowedDelta
  const status = missingAuditCounts || excessiveDelta ? 'warn' : 'ok'
  const evidence = originalCount > 0 && revisedCount > 0
    ? [`原 ${originalCount} 字`, `修订后 ${revisedCount} 字`, `差异 ${delta} 字`, `允许差异 ${allowedDelta} 字`]
    : []
  const missed = missingAuditCounts
    ? [{
        key: 'revision_scope_guard',
        label: '修订幅度缺少字数',
        text: 'revision_scope_guard 缺少 original_word_count 或 revised_word_count，无法确认修订幅度是否超过 max(原文 30%, 800 字)。',
        evidence: 'original_word_count/revised_word_count 缺失',
        fix: '补齐 revision_scope_guard.original_word_count、revised_word_count、delta_word_count、delta_ratio、allowed_delta_word_count、scope_warning 和 reason。',
      }]
    : excessiveDelta
      ? [{
          key: 'revision_scope_guard',
          label: '修订幅度过大',
          text: `修订${direction === 'shrink' ? '缩短' : '扩写'} ${delta} 字，超过允许差异 ${allowedDelta} 字。`,
          evidence: evidence.join('；'),
          fix: '回到自检 issues、delivery_risk_receipts 和各类 checks，只修有证据的缺口；恢复被误删的剧情功能信息，压回无必要新增内容。',
        }]
      : []
  return {
    report_id: `revision-scope-guard-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: !revised ? '修订幅度未触发' : missingAuditCounts ? '修订幅度无法确认' : status === 'ok' ? '修订幅度 OK' : `修订幅度过大 ${delta}`,
    summary: !revised
      ? '本章未执行修订，不触发修订幅度守恒检查。'
      : originalCount <= 0 || revisedCount <= 0
        ? '本章缺少修订前后字数，无法确认修订幅度。'
        : status === 'ok'
          ? `修订前后字数差异 ${delta} 字，未超过 oh-story 修订幅度警戒线。`
          : `修订前后字数差异 ${delta} 字，超过 max(原文 30%, 800 字) 的警戒线 ${allowedDelta} 字。`,
    original_word_count: originalCount,
    revised_word_count: revisedCount,
    delta_word_count: delta,
    allowed_delta_word_count: allowedDelta,
    delta_ratio: deltaRatio,
    direction,
    evidence,
    missed_count: missed.length,
    missed,
    next_actions: status === 'ok'
      ? ['保持修订幅度守恒：只修自检证据和确定性检查指出的缺口。']
      : missingAuditCounts
        ? [
            '补齐 revision_scope_guard：original_word_count、revised_word_count、delta_word_count、delta_ratio、allowed_delta_word_count、scope_warning 和 reason。',
            '按 oh-story workflow-revision 做字数对比：修改后与原文字数差异超过 30% 或 800 字时必须复核。',
          ]
      : [
          '按 oh-story workflow-revision 做字数对比：修改后与原文字数差异超过 30% 或 800 字时必须复核。',
          '下一轮修订不要重写整章；只按自检证据、修订回执残留和确定性检查缺口做局部修复。',
          direction === 'shrink'
            ? '先恢复被误删的伏笔、钩子、角色特征、情节推进和必要转折，再压缩无功能解释。'
            : '先删除无证据新增的支线、设定、关系和解释，再保留真正修复缺口的正文变化。',
        ],
  }
}

function revisionCascadeImpactRows(selfCheck: any = {}, chapterText = '') {
  const revision = selfCheck?.revision || selfCheck?.revised_revision || selfCheck || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const receiptRows = [
    ...asArray(revisionDeliveryReceipts?.revision_receipts || revisionDeliveryReceipts?.revisionReceipts),
    ...asArray(revision?.revision_receipts || revision?.revisionReceipts),
    ...asArray(selfCheck?.revision_receipts || selfCheck?.revisionReceipts),
  ]
  const standaloneRows = [
    ...asArray(revision?.cascade_impacts || revision?.cascadeImpacts),
    ...asArray(revision?.downstream_impacts || revision?.downstreamImpacts),
    ...asArray(revision?.future_impacts || revision?.futureImpacts),
    ...asArray(selfCheck?.cascade_impacts || selfCheck?.cascadeImpacts),
  ].map((impact: any) => ({ receipt: {}, impact }))

  return [
    ...receiptRows.flatMap((receipt: any) => {
      const impacts = [
        ...asArray(receipt?.cascade_impacts || receipt?.cascadeImpacts),
        ...asArray(receipt?.downstream_impacts || receipt?.downstreamImpacts),
        ...asArray(receipt?.future_impacts || receipt?.futureImpacts),
        ...asArray(receipt?.affected_assets || receipt?.affectedAssets),
      ]
      return impacts.map((impact: any) => ({ receipt, impact }))
    }),
    ...standaloneRows,
  ]
    .map(({ receipt, impact }: any) => {
      const hasType = Boolean(compactBriefText(impact?.type || impact?.category))
      const hasTarget = Boolean(compactBriefText(impact?.target || impact?.name || impact?.label || impact?.asset || impact?.entity))
      const hasImpact = Boolean(compactBriefText(impact?.impact || impact?.text || impact?.summary || impact?.description || impact?.risk || impact?.issue))
      const hasRequiredAction = Boolean(compactBriefText(
        impact?.required_action
        || impact?.requiredAction
        || impact?.next_action
        || impact?.nextAction
        || impact?.fix
        || impact?.repair_instruction
        || impact?.repairInstruction,
      ))
      const hasEvidence = Boolean(compactBriefText(
        impact?.evidence
        || impact?.source_excerpt
        || impact?.sourceExcerpt
        || receipt?.changed_evidence
        || receipt?.changedEvidence
        || receipt?.applied_fix
        || receipt?.appliedFix,
      ))
      const missingFields = [
        hasType ? '' : 'type',
        hasTarget ? '' : 'target',
        hasImpact ? '' : 'impact',
        hasRequiredAction ? '' : 'required_action',
        hasEvidence ? '' : 'evidence/source_excerpt',
      ].filter(Boolean)
      const affectedChapters = [
        ...asArray(impact?.affected_chapters || impact?.affectedChapters),
        ...asArray(receipt?.affected_chapters || receipt?.affectedChapters),
      ]
        .map((item: any) => Number(item))
        .filter((item: number) => Number.isFinite(item) && item > 0)
      const type = compactBriefText(impact?.type || impact?.category || receipt?.category || 'cascade')
      const target = compactBriefText(impact?.target || impact?.name || impact?.label || impact?.asset || impact?.entity)
      const text = compactBriefText(
        impact?.impact
        || impact?.text
        || impact?.summary
        || impact?.description
        || impact?.risk
        || impact?.issue,
      )
      const requiredAction = compactBriefText(
        impact?.required_action
        || impact?.requiredAction
        || impact?.next_action
        || impact?.nextAction
        || impact?.fix
        || impact?.repair_instruction
        || impact?.repairInstruction,
      )
      const evidence = compactBriefText(
        impact?.evidence
        || impact?.source_excerpt
        || impact?.sourceExcerpt
        || receipt?.changed_evidence
        || receipt?.changedEvidence
        || receipt?.applied_fix
        || receipt?.appliedFix,
      )
      const evidenceLocationRisk = evidence && String(chapterText || '').trim() && !receiptEvidenceLocatedInProse(evidence, chapterText)
        ? 'cascade_impacts evidence/source_excerpt 无法定位到修订后正文。'
        : ''
      if (!target && !text && !requiredAction) return null
      return {
        issue_index: Number.isFinite(Number(receipt?.issue_index ?? receipt?.issueIndex))
          ? Number(receipt?.issue_index ?? receipt?.issueIndex)
          : null,
        type,
        target: target || type,
        text: text || requiredAction || target,
        required_action: requiredAction || text,
        evidence,
        evidence_location_risk: evidenceLocationRisk,
        affected_chapters: Array.from(new Set(affectedChapters)).slice(0, 12),
        missing_fields: missingFields,
      }
    })
    .filter(Boolean)
}

export function buildRevisionCascadeImpactSyncReport(chapter: any, selfCheck: any = {}) {
  const chapterText = chapterReceiptProseText(chapter)
  const missed = revisionCascadeImpactRows(selfCheck, chapterText)
  const evidenceMissing = missed.filter((item: any) => !compactBriefText(item?.evidence))
  const evidenceUnlocated = missed.filter((item: any) => compactBriefText(item?.evidence_location_risk || item?.evidenceLocationRisk))
  const structureMissing = missed.filter((item: any) => asArray(item?.missing_fields || item?.missingFields)
    .some((field: any) => !['evidence/source_excerpt'].includes(String(field || ''))))
  const status = missed.length > 0 ? 'warn' : 'ok'
  return {
    report_id: `revision-cascade-impact-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: status === 'ok' ? '修订级联影响 OK' : `修订级联影响 ${missed.length}`,
    summary: status === 'ok'
      ? '本章修订没有声明需要同步到后续章节的级联影响。'
      : `本章修订产生 ${missed.length} 项会影响后续章节、伏笔、时间线、角色状态、资产或关系的同步义务。`,
    missed_count: missed.length,
    evidence_missing_count: evidenceMissing.length,
    evidence_unlocated_count: evidenceUnlocated.length,
    structure_missing_count: structureMissing.length,
    missed,
    evidence_missing: evidenceMissing,
    evidence_unlocated: evidenceUnlocated,
    structure_missing: structureMissing,
    next_actions: status === 'ok'
      ? ['后续修订继续在 revision_receipts 中标明 cascade_impacts；没有影响时保持空数组。']
      : structureMissing.length > 0
        ? [
            '下一轮修订回执必须给每条 cascade_impacts 补齐 type, target, impact, required_action, evidence/source_excerpt。',
            '下一章或后续章节必须先同步修订后的伏笔、时间线、角色状态、资产归属和关系边界，再推进新冲突。',
          ]
        : evidenceUnlocated.length > 0
        ? [
            '下一轮修订回执必须重引可在修订后正文定位的 cascade_impacts evidence/source_excerpt，修复无法定位到修订后正文的虚构或旧稿证据。',
            '下一章或后续章节必须先同步修订后的伏笔、时间线、角色状态、资产归属和关系边界，再推进新冲突。',
          ]
        : evidenceMissing.length > 0
        ? [
            '下一轮修订回执必须给每条 cascade_impacts 补 changed_evidence、evidence 或 source_excerpt，引用修订后正文中支撑正史变更的原句。',
            '下一章或后续章节必须先同步修订后的伏笔、时间线、角色状态、资产归属和关系边界，再推进新冲突。',
          ]
        : [
            '下一章或后续章节必须先同步修订后的伏笔、时间线、角色状态、资产归属和关系边界，再推进新冲突。',
            '如果受影响章节已存在，优先检查并修正对应章节，不要让旧状态覆盖修订后的正史。',
          ],
  }
}

function normalizeAssetStateDeltaPlanItem(item: any) {
  if (!item) return null
  if (typeof item === 'string') {
    const text = compactBriefText(item)
    const match = text.match(/^([^：:｜(（]{1,60})[：:｜(（]?(.*)$/)
    const name = compactBriefText(match?.[1] || text)
    return name ? { name, text: compactBriefText(match?.[2] || text), source: text } : null
  }
  const name = assetText(item)
  const text = compactBriefText(
    item?.text
    || item?.summary
    || item?.description
    || assetStateChangeText(item?.expected_state_change || item?.expectedStateChange)
    || assetStateChangeText(item?.state_delta || item?.stateDelta || item?.actual_state_change || item?.actualStateChange)
    || item,
  )
  return name ? { entity_id: Number(item?.entity_id || item?.id || 0) || null, name, text: text || name, source: text || name } : null
}

function assetStateDeltaRecordedItems(stateDelta: any = {}, settingUpdates: any[] = [], discoveredAssets: any[] = []) {
  const rows = new Map<string, { entity_id: any; name: string; text: string; evidence: string }>()
  const add = (item: any, textValue?: any) => {
    const name = assetText(item)
    const text = assetStateChangeText(textValue ?? item?.actual_state_change ?? item?.actualStateChange ?? item?.state_delta ?? item?.stateDelta ?? item?.state_json ?? item?.stateJson ?? item?.summary ?? item)
    const evidence = stateDeltaEvidenceText(item) || stateDeltaEvidenceText(textValue)
    if (!name || !text) return
    const key = Number(item?.entity_id || item?.id || 0) ? `id:${Number(item?.entity_id || item?.id || 0)}` : `name:${name}`
    const existing = rows.get(key)
    rows.set(key, {
      entity_id: Number(item?.entity_id || item?.id || 0) || existing?.entity_id || null,
      name,
      text: [existing?.text, text].filter(Boolean).join('；'),
      evidence: uniqueBriefStrings([existing?.evidence, evidence], 3).join('；'),
    })
  }

  for (const update of asArray(settingUpdates)) add(update)
  for (const asset of asArray(discoveredAssets)) add(asset)
  for (const [name, value] of Object.entries(stateDelta?.resource_status || stateDelta?.resourceStatus || {})) add({ name }, value)
  for (const [name, value] of Object.entries(stateDelta?.item_ownership || stateDelta?.itemOwnership || {})) add({ name }, { owner: value })
  for (const [name, value] of Object.entries(stateDelta?.foreshadowing_status || stateDelta?.foreshadowingStatus || {})) add({ name }, value)

  return Array.from(rows.values())
}

function assetStateDeltaKeys(item: any) {
  return [
    Number(item?.entity_id || item?.id || 0) ? `id:${Number(item?.entity_id || item?.id || 0)}` : '',
    item?.name ? `name:${compactBriefText(item.name)}` : '',
  ].filter(Boolean)
}

export function buildAssetStateDeltaSyncReport(chapter: any, contextPackage: any, stateDelta: any = {}, settingUpdates: any[] = [], discoveredAssets: any[] = []) {
  const contract = assetLinkageExplicitContract(contextPackage) || contextPackage?.chapter_target?.asset_linkage_contract || {}
  const settingUsage = asArray(contextPackage?.setting_context?.chapter_usage || contextPackage?.setting_context?.chapterUsage)
    .filter((item: any) => !item?.forbidden && String(item?.usage_type || '') !== 'forbidden')
  const planned = [
    ...settingUsage.map(normalizeAssetStateDeltaPlanItem),
    ...asArray(contract?.key_assets || contract?.keyAssets).map(normalizeAssetStateDeltaPlanItem),
  ].filter(Boolean)
  const seen = new Set<string>()
  const uniquePlanned = planned.filter((item: any) => {
    const keys = assetStateDeltaKeys(item)
    const key = keys[0] || `name:${item.name}`
    if (!key || keys.some(candidate => seen.has(candidate))) return false
    for (const candidate of keys.length ? keys : [key]) seen.add(candidate)
    return true
  })
  const recorded = assetStateDeltaRecordedItems(stateDelta, settingUpdates, discoveredAssets)
  const recordedKeys = new Set(recorded.flatMap(assetStateDeltaKeys))
  const recordedByName = new Map(recorded.map((item: any) => [item.name, item]))
  const completedRows = uniquePlanned
    .map((item: any) => {
      const keyedRow = recorded.find((row: any) => assetStateDeltaKeys(item).some(key => assetStateDeltaKeys(row).includes(key) && recordedKeys.has(key)))
      if (keyedRow) return { item, row: keyedRow }
      const row = recordedByName.get(item.name)
      if (!row) return null
      const score = anchorMatchScore(item.text || item.name, `${row.name}：${row.text}`).score
      return score >= 25 || normalizedMatchText(row.text).length >= 4 ? { item, row } : null
    })
    .filter(Boolean)
  const completed = completedRows.map((entry: any) => entry.item)
  const missed = uniquePlanned.filter((item: any) => !completed.includes(item))
  const evidenceMissing = completedRows
    .map((entry: any) => entry.row && !compactBriefText(entry.row.evidence) ? { ...entry.item, recorded_text: entry.row.text } : null)
    .filter(Boolean)
  const status = missed.length > 0 || evidenceMissing.length > 0 ? 'warn' : 'ok'

  return {
    report_id: `asset-state-delta-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: uniquePlanned.length === 0
      ? '资产状态增量未配置'
      : status === 'ok'
        ? '资产状态增量 OK'
        : missed.length > 0
          ? `资产状态增量缺口 ${missed.length}`
          : `资产状态证据缺口 ${evidenceMissing.length}`,
    summary: uniquePlanned.length === 0
      ? '本章没有显式配置需要追踪的关键资产状态增量。'
      : status === 'ok'
        ? '本章关键资产的状态增量已进入设定状态或新资产记录。'
        : missed.length > 0
          ? `本章有 ${missed.length} 个关键资产的状态增量未在本轮记录中闭环。`
          : `本章有 ${evidenceMissing.length} 个关键资产状态已写入但缺少正文 source_excerpt 证据。`,
    planned_count: uniquePlanned.length,
    recorded_count: recorded.length,
    missed_count: missed.length,
    evidence_missing_count: evidenceMissing.length,
    planned: uniquePlanned,
    recorded,
    completed,
    missed,
    evidence_missing: evidenceMissing,
    next_actions: status === 'ok'
      ? ['保持资产状态追踪只记录本章新增或改变的归属、可见性、触发条件、限制、风险和后果。']
      : missed.length > 0
        ? [
            '下一次修订或状态更新只补本章资产状态增量：关键资产的归属、可见性、触发条件、限制、风险和后果必须写回设定状态。',
            '不要重写全设定表；只处理本章计划触达且正文实际改变的关键资产。',
          ]
        : [
            '下一次状态更新必须给 setting_updates 或 discovered_assets 补 source_excerpt 或 evidence，引用正文中支撑资产归属、可见性、触发条件、限制、风险或后果变化的原句。',
            '不要只写抽象资产结论；资产状态增量必须能回指到本章正文证据。',
          ],
  }
}
