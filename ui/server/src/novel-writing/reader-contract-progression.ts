import { asArray } from '../routes/novel-route-utils'

function compactText(value: any, limit = 240) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function uniqueTexts(values: any, limit = 12) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of asArray(values)) {
    const text = compactText(raw)
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
    if (out.length >= limit) break
  }
  return out
}

export type ReaderContractRiskLevel = '契约安全' | '需补强' | '契约破坏'

export function buildEndingReservePlan(input: any = {}) {
  const existing = input?.ending_reserve || input?.endingReserve || input?.终局储备 || {}
  const rawTrumps = asArray(
    existing.trump_cards
    || existing.trumpCards
    || existing.终局底牌
    || input.trump_cards
    || input.trumpCards
    || [
      input.final_antagonist || input.finalAntagonist || '头号宿敌尚未命名',
      input.final_truth || input.finalTruth || '终极真相/身世尚未命名',
      input.goldfinger_ceiling || input.goldfingerCeiling || '金手指上限尚未命名',
      input.identity_endpoint || input.identityEndpoint || '身份/地位终点尚未命名',
    ],
  ).slice(0, 8)
  const trumpCards = rawTrumps.map((item: any, index: number) => {
    if (item && typeof item === 'object') {
      return {
        id: compactText(item.id || `trump_${index + 1}`, 40) || `trump_${index + 1}`,
        label: compactText(item.label || item.name || item.title || `终局底牌${index + 1}`, 80),
        earliest_volume: Number(item.earliest_volume || item.earliestVolume || existing?.milestones?.[index]?.volume || index + 1) || index + 1,
        status: compactText(item.status || 'reserved', 20) || 'reserved',
      }
    }
    return {
      id: `trump_${index + 1}`,
      label: compactText(item, 80) || `终局底牌${index + 1}`,
      earliest_volume: Number(existing?.milestones?.[index]?.volume || existing?.milestones?.[index]?.earliest_volume || index + 1) || index + 1,
      status: 'reserved',
    }
  })

  const upgradeSteps = uniqueTexts(
    existing.upgrade_steps
    || existing.upgradeSteps
    || existing.升级台阶
    || input.upgrade_steps
    || input.upgradeSteps
    || input.power_ladder
    || input.powerLadder
    || ['入门台阶', '中段台阶', '高阶台阶', '终局台阶'],
    12,
  ).map((label, index) => ({
    id: `step_${index + 1}`,
    label,
    rank: index + 1,
    status: 'open',
  }))

  const targetWords = Number(input.target_words || input.targetWords || input.length_words || 1_200_000) || 1_200_000
  const wordsPerStep = Number(input.words_per_step || input.wordsPerStep || 80_000) || 80_000
  const capacityWords = upgradeSteps.length * wordsPerStep
  const capacity_ok = capacityWords >= targetWords * 0.8

  return {
    version: 'oh_story_ending_reserve_v1',
    trump_cards: trumpCards,
    upgrade_steps: upgradeSteps,
    capacity_check: {
      target_words: targetWords,
      words_per_step: wordsPerStep,
      capacity_words: capacityWords,
      ok: capacity_ok,
      note: capacity_ok
        ? '升级台阶容量大致可撑目标篇幅'
        : '升级台阶偏少，设计期应拉长体系/地图层，而不是靠每章憋字',
    },
    primary_push_line_options: [
      '战力线', '资源线', '身份线', '关系线', '信息线', '地图线', '制度线', '势力线', '事业线', '情感确定性',
    ],
  }
}

export function assessReaderContractRisk(input: any = {}): {
  level: ReaderContractRiskLevel
  reasons: string[]
  fixes: string[]
} {
  const blob = [
    input.summary,
    input.chapter_summary,
    input.conflict,
    input.ending_hook,
    input.agency_note,
    input.payoff_owner,
    input.institution_role,
    JSON.stringify(input.risks || {}),
  ].map(item => String(item || '')).join('｜')

  const reasons: string[] = []
  const fixes: string[] = []

  if (/机构接管|政府收编|强制上交|旁观者替主角|配角封神|夺走结算|无交换让渡/.test(blob)) {
    reasons.push('核心收益/裁决可能被旁观者或机构无交换夺走')
    fixes.push('补可见交换，或把结算权回到主角因果链')
  }
  if (/终局宿敌|终极真相|金手指触顶|身份终点|提前秒顶级/.test(blob)) {
    reasons.push('可能动用本阶段不该解锁的终局底牌或升级天花板')
    fixes.push('回退为阶段性进展，保留终局储备')
  }
  if (/主角划水|工具人主角|只围观|被安排|.without agency/i.test(blob) && !/布局|权谋|经营|群像|导师/.test(blob)) {
    reasons.push('主角代理权（因果权/结算权）可能被稀释')
    fixes.push('让主角做出不可替代决策或拿回可见结算')
  }

  if (reasons.some(item => /夺走|终局|触顶|天花板/.test(item))) {
    return { level: '契约破坏', reasons, fixes }
  }
  if (reasons.length) {
    return { level: '需补强', reasons, fixes }
  }
  return {
    level: '契约安全',
    reasons: ['与开篇题材契约一致，主角仍保有因果/结算权迹象'],
    fixes: [],
  }
}

export function buildReaderContractProgression(input: any = {}) {
  const existing = input.reader_contract_progression
    || input.readerContractProgression
    || input.writing_bible?.reader_contract_progression
    || input.writingBible?.readerContractProgression
    || {}
  const targetReader = input.target_reader_contract
    || input.targetReaderContract
    || input.writing_bible?.target_reader_contract
    || {}
  const genre = compactText(input.genre || input.project?.genre || existing.genre || targetReader.genre || '未定题材')
  const platform = compactText(input.platform || input.project?.platform || existing.platform || targetReader.platform || '未定平台')
  const promise = compactText(
    existing.reader_promise
    || existing.readerPromise
    || input.reader_promise
    || targetReader.reader_desires?.[0]
    || targetReader.readerDesires?.[0]
    || '读者来看主角在既定题材契约下拿到可见进展与回报',
    320,
  )
  const agency = {
    causal_right: compactText(existing.agency?.causal_right || existing.agency?.causalRight || '主角通过决策/布局/不可替代信息决定事件为何发生与如何转向', 220),
    settlement_right: compactText(existing.agency?.settlement_right || existing.agency?.settlementRight || '核心收益、认可、权力或关键后果回到应得者', 220),
    genre_exception: compactText(existing.agency?.genre_exception || existing.agency?.genreException || '直给爽文允许当面碾压作为契约兑现', 180),
  }
  const endingReserve = buildEndingReservePlan({
    ...existing.ending_reserve,
    ...input,
    ending_reserve: existing.ending_reserve || input.ending_reserve,
  })
  const risk = assessReaderContractRisk({
    ...input,
    summary: promise,
    agency_note: `${agency.causal_right} ${agency.settlement_right}`,
  })

  return {
    version: 'oh_story_reader_contract_progression_v1',
    source: 'reader-contract-and-progression.md',
    genre,
    platform,
    reader_promise: promise,
    agency,
    expectation_debt_rules: uniqueTexts([
      '每次埋承诺都会产生期待债，可延期但要付利息：阶段进展、新信息、局势变化或更清晰下一目标',
      '用解释/流程拖延兑现会增加合理化债务',
      ...(existing.expectation_debt_rules || existing.expectationDebtRules || []),
    ], 6),
    ending_reserve: endingReserve,
    institution_bystander_rules: uniqueTexts([
      '政府/宗门总部/跨国组织是高层级叙事开关，不天然有毒',
      '旁观者适合震惊、误判、舆论、报价、站队，不适合替主角拿核心收益',
      ...(existing.institution_bystander_rules || []),
    ], 6),
    risk_levels: ['契约安全', '需补强', '契约破坏'],
    current_risk: risk,
    quality_checks: uniqueTexts([
      '写前确认读者契约：读者来看什么快感',
      '检查主角是否保有因果权与结算权',
      '检查本章/本单元是否透支终局底牌或升级台阶',
      '机构接管或让渡是否有可见交换',
      ...(existing.quality_checks || []),
    ], 8),
    target_reader_bridge: {
      has_target_reader_contract: Boolean(targetReader && Object.keys(targetReader || {}).length),
      reader_profile: targetReader.reader_profile || targetReader.readerProfile || null,
    },
  }
}

export function formatReaderContractProgressionPrompt(contract: any = {}) {
  if (!contract || typeof contract !== 'object') return ''
  return [
    '【oh-story 读者契约 + 终局储备】',
    `version: ${contract.version || 'oh_story_reader_contract_progression_v1'}`,
    `题材/平台: ${contract.genre || '-'} / ${contract.platform || '-'}`,
    `读者契约: ${contract.reader_promise || '-'}`,
    `主角因果权: ${contract.agency?.causal_right || '-'}`,
    `主角结算权: ${contract.agency?.settlement_right || '-'}`,
    `当前风险: ${contract.current_risk?.level || '契约安全'}`,
    ...(asArray(contract.current_risk?.reasons).map((item: any) => `- 风险原因: ${item}`)),
    ...(asArray(contract.current_risk?.fixes).map((item: any) => `- 修复: ${item}`)),
    `终局底牌数: ${asArray(contract.ending_reserve?.trump_cards).length}`,
    `升级台阶数: ${asArray(contract.ending_reserve?.upgrade_steps).length}`,
    `台阶容量: ${contract.ending_reserve?.capacity_check?.note || '-'}`,
    '硬约束: 禁止提前打光终局底牌；禁止让旁观者夺走结算权；单章可放开爽感密度，但宏观储备必须按卷解锁。',
  ].join('\n')
}
