import { asArray } from '../routes/novel-route-utils'
import { buildEndingReservePlan, buildReaderContractProgression } from './reader-contract-progression'

function compactText(value: any, limit = 200) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function asVolume(value: any) {
  const n = Number(value || 0)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

export type EndingReserveItemStatus = 'reserved' | 'unlocked' | 'spent'

export function normalizeEndingReserveLedger(input: any = {}) {
  const existing = input.ending_reserve || input.endingReserve || input.ledger || input
  const base = buildEndingReservePlan({
    ...input,
    ending_reserve: {
      ...existing,
      trump_cards: existing.trump_cards || input.trump_cards || existing.trumpCards,
      upgrade_steps: existing.upgrade_steps || input.upgrade_steps || existing.upgradeSteps,
    },
  })
  const unlockLog = asArray(existing.unlock_log || existing.unlockLog || input.unlock_log).map((row: any) => ({
    item_id: compactText(row.item_id || row.itemId || row.id, 40),
    kind: compactText(row.kind || 'trump', 20),
    volume: asVolume(row.volume || row.volume_no || row.volumeNo),
    chapter_no: Number(row.chapter_no || row.chapterNo || 0) || 0,
    note: compactText(row.note || row.reason || '', 160),
    at: compactText(row.at || row.updated_at || row.updatedAt || new Date().toISOString(), 40),
  })).filter((row: any) => row.item_id)

  const spentIds = new Set(
    asArray(existing.spent_ids || existing.spentIds)
      .map((item: any) => compactText(item, 40))
      .filter(Boolean),
  )
  const unlockedIds = new Set(
    asArray(existing.unlocked_ids || existing.unlockedIds)
      .map((item: any) => compactText(item, 40))
      .filter(Boolean),
  )
  for (const row of unlockLog) {
    unlockedIds.add(row.item_id)
    if (row.kind === 'spent' || row.note.includes('消耗') || row.note.includes('已用')) spentIds.add(row.item_id)
  }

  const trumpCards = asArray(base.trump_cards).map((item: any, index: number) => {
    const id = compactText(item.id || `trump_${index + 1}`, 40)
    let status: EndingReserveItemStatus = 'reserved'
    if (spentIds.has(id)) status = 'spent'
    else if (unlockedIds.has(id)) status = 'unlocked'
    return {
      ...item,
      id,
      earliest_volume: asVolume(item.earliest_volume || item.earliestVolume || index + 1) || index + 1,
      status,
    }
  })

  const upgradeSteps = asArray(base.upgrade_steps).map((item: any, index: number) => {
    const id = compactText(item.id || `step_${index + 1}`, 40)
    let status: EndingReserveItemStatus = 'reserved'
    if (spentIds.has(id)) status = 'spent'
    else if (unlockedIds.has(id) || index === 0) status = index === 0 && !spentIds.has(id) ? 'unlocked' : status
    if (unlockedIds.has(id)) status = spentIds.has(id) ? 'spent' : 'unlocked'
    if (index === 0 && status === 'reserved') status = 'unlocked'
    return {
      ...item,
      id,
      rank: Number(item.rank || index + 1),
      status,
    }
  })

  return {
    version: 'oh_story_ending_reserve_ledger_v1',
    trump_cards: trumpCards,
    upgrade_steps: upgradeSteps,
    capacity_check: base.capacity_check,
    unlocked_ids: Array.from(unlockedIds),
    spent_ids: Array.from(spentIds),
    unlock_log: unlockLog,
    summary: {
      trump_reserved: trumpCards.filter((item: any) => item.status === 'reserved').length,
      trump_unlocked: trumpCards.filter((item: any) => item.status === 'unlocked').length,
      trump_spent: trumpCards.filter((item: any) => item.status === 'spent').length,
      steps_open: upgradeSteps.filter((item: any) => item.status !== 'spent').length,
      steps_spent: upgradeSteps.filter((item: any) => item.status === 'spent').length,
    },
  }
}

export function unlockEndingReserveItem(ledgerInput: any, args: {
  item_id: string
  kind?: 'trump' | 'step'
  volume?: number
  chapter_no?: number
  note?: string
}) {
  const ledger = normalizeEndingReserveLedger(ledgerInput)
  const itemId = compactText(args.item_id, 40)
  const volume = asVolume(args.volume)
  const all = [...ledger.trump_cards, ...ledger.upgrade_steps]
  const item = all.find((row: any) => row.id === itemId)
  if (!item) {
    return { ok: false, error: `未找到储备项 ${itemId}`, ledger }
  }
  const earliest = asVolume(item.earliest_volume || item.rank || 1) || 1
  if (volume && volume < earliest) {
    return {
      ok: false,
      error: `第${volume}卷尚不可解锁 ${item.label || itemId}（最早第${earliest}卷）`,
      ledger,
      risk: '契约破坏',
    }
  }
  if (item.status === 'spent') {
    return { ok: false, error: `${item.label || itemId} 已消耗，不能重复解锁`, ledger }
  }
  const unlocked = new Set(ledger.unlocked_ids)
  unlocked.add(itemId)
  const unlock_log = [
    ...ledger.unlock_log,
    {
      item_id: itemId,
      kind: args.kind || (String(itemId).startsWith('step_') ? 'step' : 'trump'),
      volume: volume || earliest,
      chapter_no: Number(args.chapter_no || 0) || 0,
      note: compactText(args.note || '按卷解锁', 160),
      at: new Date().toISOString(),
    },
  ]
  const next = normalizeEndingReserveLedger({
    ...ledgerInput,
    ending_reserve: {
      ...ledger,
      unlocked_ids: Array.from(unlocked),
      unlock_log,
    },
  })
  return { ok: true, ledger: next, item: next.trump_cards.concat(next.upgrade_steps).find((row: any) => row.id === itemId) }
}

export function spendEndingReserveItem(ledgerInput: any, args: {
  item_id: string
  volume?: number
  chapter_no?: number
  note?: string
}) {
  const unlocked = unlockEndingReserveItem(ledgerInput, {
    item_id: args.item_id,
    volume: args.volume,
    chapter_no: args.chapter_no,
    note: args.note || '消耗前自动解锁',
  })
  if (!unlocked.ok && !String(unlocked.error || '').includes('已消耗')) {
    // allow spend if already unlocked; if unlock failed for timing, still block
    if (!unlocked.ledger.unlocked_ids.includes(compactText(args.item_id, 40))
      && !unlocked.ledger.trump_cards.concat(unlocked.ledger.upgrade_steps).some((row: any) => row.id === compactText(args.item_id, 40) && row.status !== 'reserved')) {
      return unlocked
    }
  }
  const ledger = unlocked.ledger
  const itemId = compactText(args.item_id, 40)
  const spent = new Set(ledger.spent_ids)
  spent.add(itemId)
  const unlock_log = [
    ...ledger.unlock_log,
    {
      item_id: itemId,
      kind: 'spent',
      volume: asVolume(args.volume),
      chapter_no: Number(args.chapter_no || 0) || 0,
      note: compactText(args.note || '已消耗终局储备', 160),
      at: new Date().toISOString(),
    },
  ]
  const next = normalizeEndingReserveLedger({
    ending_reserve: {
      ...ledger,
      spent_ids: Array.from(spent),
      unlocked_ids: ledger.unlocked_ids,
      unlock_log,
      trump_cards: ledger.trump_cards,
      upgrade_steps: ledger.upgrade_steps,
    },
  })
  return { ok: true, ledger: next, item: next.trump_cards.concat(next.upgrade_steps).find((row: any) => row.id === itemId) }
}

export function evaluateEndingReserveSpendRisk(ledgerInput: any, args: {
  item_id?: string
  volume?: number
  chapter_summary?: string
}) {
  const ledger = normalizeEndingReserveLedger(ledgerInput)
  const volume = asVolume(args.volume) || 1
  const blob = compactText(args.chapter_summary, 400)
  const reasons: string[] = []
  for (const card of ledger.trump_cards) {
    if (card.status === 'spent') continue
    if (volume < Number(card.earliest_volume || 99) && blob && blob.includes(String(card.label || '').slice(0, 4))) {
      reasons.push(`正文迹象可能提前动用终局底牌《${card.label}》（最早第${card.earliest_volume}卷）`)
    }
  }
  const openSteps = ledger.upgrade_steps.filter((item: any) => item.status !== 'spent')
  if (openSteps.length <= 1 && /终局|顶级|最终boss|身份终点|金手指上限/.test(blob)) {
    reasons.push('升级台阶所剩无几时出现终局语义，存在见底风险')
  }
  return {
    version: 'oh_story_ending_reserve_risk_v1',
    level: reasons.length ? '契约破坏' : '契约安全',
    reasons,
    ledger_summary: ledger.summary,
  }
}

export function mergeEndingReserveIntoReaderContract(input: any = {}, ledgerInput: any = {}) {
  const contract = buildReaderContractProgression(input)
  const ledger = normalizeEndingReserveLedger({
    ...contract.ending_reserve,
    ...ledgerInput,
    ending_reserve: ledgerInput.ending_reserve || ledgerInput || contract.ending_reserve,
  })
  return {
    ...contract,
    ending_reserve: ledger,
  }
}

export function extractEndingReserveLedgerFromProject(project: any = {}) {
  const bible = project?.reference_config?.writing_bible || project?.writing_bible || {}
  const progression = bible.reader_contract_progression || bible.readerContractProgression || {}
  return normalizeEndingReserveLedger({
    ...progression,
    ending_reserve: progression.ending_reserve || bible.ending_reserve || {},
    genre: project?.genre,
    platform: project?.platform || project?.target_audience,
    target_words: project?.target_words || project?.length_words,
  })
}

export function patchProjectWithEndingReserveLedger(project: any, ledger: any) {
  const reference = { ...(project?.reference_config || {}) }
  const bible = { ...(reference.writing_bible || {}) }
  const progression = {
    ...(bible.reader_contract_progression || {}),
    ending_reserve: normalizeEndingReserveLedger({ ending_reserve: ledger }),
    updated_at: new Date().toISOString(),
  }
  bible.reader_contract_progression = progression
  reference.writing_bible = bible
  return {
    reference_config: reference,
    reader_contract_progression: progression,
  }
}
