function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

function compactText(value: any, fallback = '') {
  return String(value ?? fallback ?? '').replace(/\s+/g, ' ').trim()
}

function numericCount(sync: any, keys: string[], fallbackArrays: string[] = []) {
  for (const key of keys) {
    const value = Number(sync?.[key])
    if (Number.isFinite(value) && value > 0) return value
  }
  for (const key of fallbackArrays) {
    const count = asArray(sync?.[key]).length
    if (count > 0) return count
  }
  return 0
}

function syncNeedsGate(sync: any, count: number) {
  if (!sync || count <= 0) return false
  const status = compactText(sync.status).toLowerCase()
  return !['ok', 'pass', 'passed', 'ready', 'success', 'skipped', 'skip'].includes(status)
}

export function buildPreStoreStructuralSyncChecks(syncs: any = {}) {
  const rules = [
    {
      field: 'chapterBlueprintSync',
      syncKey: 'chapter_blueprint_sync',
      label: '细纲兑现未闭环',
      countKeys: ['missed_count', 'missedCount'],
      fallbackArrays: ['missed', 'gaps'],
      defaultFix: '按本章蓝图补齐目标情绪、开篇钩子、核心回报、内容概括、多线推进、人物出场顺序、情节点功能标签、代价/收益和章尾承接。',
    },
    {
      field: 'benchmarkRecallSync',
      syncKey: 'benchmark_recall_sync',
      label: '文风召回未闭环',
      countKeys: ['missed_count', 'missedCount'],
      fallbackArrays: ['missed', 'gaps'],
      defaultFix: '补正文里的文风召回证据，只迁移节奏、句式、信息释放和情绪模块，不复制桥段或原句。',
    },
    {
      field: 'storyDriveSync',
      syncKey: 'story_drive_sync',
      label: '故事驱动未闭环',
      countKeys: ['missed_count', 'missedCount'],
      fallbackArrays: ['missed', 'drive_gaps', 'driveGaps'],
      defaultFix: '补主角选择、阻碍、代价、反馈和下一步因果，让本章不是摘要或状态陈列。',
    },
    {
      field: 'chapterAttractionReview',
      syncKey: 'chapter_attraction_review',
      label: '章节吸引力未闭环',
      countKeys: ['weak_count', 'weakCount'],
      fallbackArrays: ['weak_dimensions', 'weakDimensions'],
      defaultFix: '重做开篇钩子、场景目标阻碍转折回报、爽点密度和章末翻页问题。',
    },
    {
      field: 'runwaySync',
      syncKey: 'runway_sync',
      label: '百万字航线未闭环',
      countKeys: ['risk_count', 'riskCount'],
      fallbackArrays: ['four_question_missed', 'fourQuestionMissed', 'reader_fuel_missed', 'readerFuelMissed', 'redline_touched', 'redlineTouched'],
      defaultFix: '补齐本章四问、读者燃料和红线守恒，确保本章服务长期主线而非单章漂移。',
    },
  ]

  return rules.flatMap((rule) => {
    const sync = syncs?.[rule.field]
    const count = numericCount(sync, rule.countKeys, rule.fallbackArrays)
    if (!syncNeedsGate(sync, count)) return []
    return [{
      key: 'pre_store_structural_sync',
      sync_key: rule.syncKey,
      label: rule.label,
      status: 'fail',
      evidence: `${compactText(sync?.label, rule.label)}：${compactText(sync?.summary || sync?.reason || sync?.evidence, `存在 ${count} 项未闭环。`)}`,
      fix: asArray(sync?.next_actions || sync?.nextActions).map((item: any) => compactText(item)).filter(Boolean).join('；') || rule.defaultFix,
      missed_count: count,
    }]
  })
}
