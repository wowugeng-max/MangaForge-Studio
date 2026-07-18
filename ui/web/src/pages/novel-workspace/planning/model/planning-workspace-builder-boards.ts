import type {
  PlanningStorylineBoardItem,
  PlanningWorkspaceModel,
} from './planning-workspace-model'
import {
  arrayValue,
  first30ReportIsStale,
  firstNonEmpty,
  latestFirst30RepairAfterReport,
  latestFirst30Review,
  latestReviewPayloadAny,
  listLength,
  numberOrNull,
  numericCount,
  parseJsonValue,
  text,
} from './planning-workspace-builder'

type AnyRecord = Record<string, any>

function retentionRiskLevel(score: number, flags: string[]) {
  if (score < 65 || flags.some(flag => /缺正文|章末钩子弱|爽点/.test(flag))) return 'high'
  if (score < 80 || flags.length > 0) return 'medium'
  return 'ok'
}

export function buildFirst30RetentionModel(chapters: AnyRecord[], reviews: AnyRecord[], productionTasks?: AnyRecord | null): PlanningWorkspaceModel['first30Retention'] {
  const review = latestFirst30Review(reviews)
  if (!review) {
    return {
      status: 'missing',
      score: null,
      summary: '尚未运行前30章留存诊断。',
      promiseReady: false,
      stale: false,
      actionKey: 'run_first30_retention',
      segments: [],
      chapterCards: [],
      risks: [],
      nextActions: ['运行前30章诊断，先确认开篇三章、试读十章和付费前蓄势风险。'],
    }
  }

  const payload = parseJsonValue(review.payload, { owner: review, kind: 'review', field: 'payload' }) || {}
  const report = payload.report || payload.result?.report || payload
  const staleByChapterUpdate = first30ReportIsStale(review, chapters)
  const completedRepair = latestFirst30RepairAfterReport(review, productionTasks)
  const stale = staleByChapterUpdate || Boolean(completedRepair)
  const normalizedStatus = text(report?.status, 'needs_repair') as PlanningWorkspaceModel['first30Retention']['status']
  const status = stale ? 'stale' : (['ready', 'needs_repair', 'blocked'].includes(normalizedStatus) ? normalizedStatus : 'needs_repair')
  const segments = arrayValue(report?.segments).map(segment => ({
    key: text(segment?.key),
    label: text(segment?.label || segment?.key, '未命名分段'),
    score: Number(segment?.score || 0),
    coverage: Number(segment?.coverage || 0),
    hookRate: Number(segment?.hook_rate || segment?.hookRate || 0),
    payoffAverage: Number(segment?.payoff_average || segment?.payoffAverage || 0),
    chapterCount: Number(segment?.chapter_count || segment?.chapterCount || 0),
  }))
  const chapterCards = arrayValue(report?.chapter_cards).map(row => {
    const flags = arrayValue(row?.flags).map(flag => text(flag)).filter(Boolean)
    const score = Number(row?.score || 0)
    return {
      chapterId: row?.chapter_id || null,
      chapterNo: Number(row?.chapter_no || 0),
      title: text(row?.title, '未命名章节'),
      score,
      wordCount: Number(row?.word_count || 0),
      flags,
      riskLevel: retentionRiskLevel(score, flags),
    }
  })

  return {
    status,
    score: Number.isFinite(Number(report?.score)) ? Number(report.score) : null,
    summary: stale
      ? `${completedRepair ? '需重新诊断：留存修复任务已完成，需复查修复后追读曲线。' : '需重新诊断：前30章内容已在报告后更新。'}${text(report?.summary)}`
      : text(report?.summary, '已完成前30章留存诊断。'),
    promiseReady: Boolean(report?.positioning?.promise_ready),
    stale,
    actionKey: status === 'ready' ? 'run_first30_retention' : status === 'stale' ? 'run_first30_retention' : 'create_first30_repair',
    segments,
    chapterCards,
    risks: arrayValue(report?.risks).map(risk => ({
      severity: text(risk?.severity),
      segment: text(risk?.segment),
      issue: text(risk?.issue),
      action: text(risk?.action),
    })),
    nextActions: [
      ...(completedRepair ? ['重新运行前30章诊断，确认修复后的目标、钩子、爽点和试读闭环已经收敛。'] : []),
      ...arrayValue(report?.next_actions).map(item => text(item)).filter(Boolean),
    ],
  }
}

const STORYLINE_TYPE_LABELS: Record<string, string> = {
  mainline: '主线',
  subplot: '支线',
  character_arc: '角色线',
  relationship_arc: '关系线',
  faction_arc: '势力线',
  foreshadowing_arc: '伏笔线',
}

const STORYLINE_TYPE_ORDER = Object.keys(STORYLINE_TYPE_LABELS)

function listText(...values: any[]) {
  const result: string[] = []
  values.forEach(value => {
    if (Array.isArray(value)) {
      value.forEach(item => {
        const normalized = text(item)
        if (normalized) result.push(normalized)
      })
      return
    }
    const normalized = text(value)
    if (normalized) result.push(normalized)
  })
  return Array.from(new Set(result))
}

function isStorylineType(type: string) {
  return Boolean(STORYLINE_TYPE_LABELS[type])
}

function storylineSyncReport(review: AnyRecord) {
  if (text(review?.review_type) !== 'storyline_sync') return null
  const payload = parseJsonValue(review?.payload, { owner: review, kind: 'review', field: 'payload' })
    || parseJsonValue(review?.payload_json, { owner: review, kind: 'review', field: 'payload_json' })
    || {}
  const report = payload.storyline_sync || payload.result?.storyline_sync || payload.result || payload
  if (!report || typeof report !== 'object') return null
  return {
    chapterNo: numberOrNull(payload.chapter_no, report.chapter_no, review.chapter_no),
    report,
  }
}

function storylineSyncItemMatches(entity: AnyRecord, item: AnyRecord) {
  const entityId = Number(entity?.id || 0)
  const itemId = Number(item?.entity_id || item?.id || 0)
  if (entityId && itemId && entityId === itemId) return true
  const entityType = text(entity?.entity_type)
  const itemType = text(item?.entity_type || item?.type)
  const entityName = text(entity?.name)
  const itemName = text(item?.name || item?.title)
  return Boolean(
    entityName &&
    itemName &&
    (!itemType || itemType === entityType) &&
    (entityName === itemName || entityName.includes(itemName) || itemName.includes(entityName)),
  )
}

function evidenceSummary(item: AnyRecord, fallback = '') {
  const expected = item?.expected_state_change
  const actual = item?.actual_state_change
  return firstNonEmpty(
    item?.summary,
    typeof actual === 'string' ? actual : actual?.summary,
    typeof expected === 'string' ? expected : expected?.summary,
    item?.description,
    item?.name,
    fallback,
  )
}

function uniqueEvidence<T extends { chapterNo: number | null; usageType: string; summary: string }>(items: T[]) {
  const seen = new Set<string>()
  const rows: T[] = []
  items.forEach(item => {
    const key = `${item.chapterNo || ''}:${item.usageType}:${item.summary}`
    if (!item.summary || seen.has(key)) return
    seen.add(key)
    rows.push(item)
  })
  return rows
}

function storylineDiffDecision(
  riskType: PlanningStorylineBoardItem['diffEvidence'][number]['riskType'],
): Pick<PlanningStorylineBoardItem['diffEvidence'][number], 'riskLabel' | 'recommendedDecision' | 'recommendedActionLabel' | 'recommendedActionDetail'> {
  if (riskType === 'missed') {
    return {
      riskLabel: '漏推',
      recommendedDecision: 'revise_prose',
      recommendedActionLabel: '回修正文',
      recommendedActionDetail: '任务书要求推进但正文没有兑现，优先回到当前章修订，把计划内推进写成现场行动或结果变化。',
    }
  }
  if (riskType === 'unplanned') {
    return {
      riskLabel: '额外推进',
      recommendedDecision: 'accept_as_plan',
      recommendedActionLabel: '接受为新计划',
      recommendedActionDetail: '正文推进了计划外剧情线；如果它更强且不破坏核心，应回到资料设定或大纲把它纳入后续计划。',
    }
  }
  return {
    riskLabel: '禁揭风险',
    recommendedDecision: 'false_positive',
    recommendedActionLabel: '标记误判',
    recommendedActionDetail: '正文疑似触碰禁揭边界；先核对证据，若确为误判可人工忽略，否则应回修为遮挡、误导或延迟兑现。',
  }
}

function storylineDiffEvidenceRows(
  entity: AnyRecord,
  chapterNo: number | null,
  riskType: PlanningStorylineBoardItem['diffEvidence'][number]['riskType'],
  items: AnyRecord[],
): PlanningStorylineBoardItem['diffEvidence'] {
  const decision = storylineDiffDecision(riskType)
  const entityId = entity?.id ?? null
  const entityName = text(entity?.name)
  const entityType = text(entity?.entity_type)
  const entityKey = text(entityId || entityName || entityType || 'unknown')
  return items.map(item => {
    const summary = evidenceSummary(item, decision.riskLabel)
    return {
      decisionKey: `storyline_diff:${chapterNo || 'unknown'}:${entityKey}:${riskType}:${summary}`.slice(0, 260),
      chapterNo,
      entityId,
      entityName,
      entityType,
      riskType,
      riskLabel: decision.riskLabel,
      usageType: text(item?.usage_type || item?.usageType || item?.change_type || item?.changeType, riskType),
      summary,
      evidence: firstNonEmpty(
        item?.evidence,
        item?.quote,
        item?.text,
        item?.reason,
        item?.issue,
        item?.description,
        summary,
      ),
      recommendedDecision: decision.recommendedDecision,
      recommendedActionLabel: decision.recommendedActionLabel,
      recommendedActionDetail: decision.recommendedActionDetail,
    }
  }).filter(item => Boolean(item.summary))
}

function buildStorylineSyncEvidence(entity: AnyRecord, reviews: AnyRecord[]) {
  const planEvidence: PlanningStorylineBoardItem['planEvidence'] = []
  const actualEvidence: PlanningStorylineBoardItem['actualEvidence'] = []
  const diffEvidence: PlanningStorylineBoardItem['diffEvidence'] = []
  const syncRisks: string[] = []
  const touchedChapters: number[] = []

  reviews
    .map(storylineSyncReport)
    .filter(Boolean)
    .sort((a: any, b: any) => (a.chapterNo || 0) - (b.chapterNo || 0))
    .forEach((sync: any) => {
      const chapterNo = sync.chapterNo || null
      const chapterLabel = chapterNo ? `第${chapterNo}章` : '未知章节'
      const planned = arrayValue(sync.report?.planned).filter((item: AnyRecord) => storylineSyncItemMatches(entity, item))
      const actual = [
        ...arrayValue(sync.report?.actual),
        ...arrayValue(sync.report?.completed),
      ].filter((item: AnyRecord) => storylineSyncItemMatches(entity, item))
      const missed = arrayValue(sync.report?.missed).filter((item: AnyRecord) => storylineSyncItemMatches(entity, item))
      const unplanned = arrayValue(sync.report?.unplanned).filter((item: AnyRecord) => storylineSyncItemMatches(entity, item))
      const forbiddenTouched = arrayValue(sync.report?.forbidden_touched).filter((item: AnyRecord) => storylineSyncItemMatches(entity, item))

      planned.forEach((item: AnyRecord) => {
        planEvidence.push({
          chapterNo,
          usageType: text(item?.usage_type || item?.usageType, 'planned'),
          summary: evidenceSummary(item, '计划推进剧情线'),
        })
      })
      actual.forEach((item: AnyRecord) => {
        actualEvidence.push({
          chapterNo,
          usageType: text(item?.usage_type || item?.usageType || item?.change_type || item?.changeType, 'actual'),
          summary: evidenceSummary(item, '正文已推进剧情线'),
        })
      })
      if (missed.length > 0) syncRisks.push(`${chapterLabel}漏推`)
      if (unplanned.length > 0) syncRisks.push(`${chapterLabel}额外推进`)
      if (forbiddenTouched.length > 0) syncRisks.push(`${chapterLabel}禁揭风险`)
      diffEvidence.push(
        ...storylineDiffEvidenceRows(entity, chapterNo, 'missed', missed),
        ...storylineDiffEvidenceRows(entity, chapterNo, 'unplanned', unplanned),
        ...storylineDiffEvidenceRows(entity, chapterNo, 'forbidden_touched', forbiddenTouched),
      )
      if (planned.length || actual.length || missed.length || unplanned.length || forbiddenTouched.length) {
        if (chapterNo) touchedChapters.push(chapterNo)
      }
    })

  return {
    planEvidence: uniqueEvidence(planEvidence).slice(-6),
    actualEvidence: uniqueEvidence(actualEvidence).slice(-6),
    diffEvidence: uniqueEvidence(diffEvidence).slice(-9),
    syncRisks: Array.from(new Set(syncRisks)).slice(-6),
    latestSyncChapter: touchedChapters.length ? Math.max(...touchedChapters) : null,
  }
}

export function buildStorylineBoardModel(
  settingEntities: AnyRecord[],
  first30Retention: PlanningWorkspaceModel['first30Retention'],
  activeChapterNo: number,
  reviews: AnyRecord[] = [],
): PlanningWorkspaceModel['storylineBoard'] {
  const first30RiskCards = first30Retention.chapterCards.filter(card => card.riskLevel !== 'ok')
  const items = settingEntities
    .filter(entity => isStorylineType(text(entity?.entity_type)))
    .map(entity => {
      const entityType = text(entity?.entity_type)
      const payload = parseJsonValue(entity?.payload_json, { owner: entity, kind: 'setting', field: 'payload_json' }) || {}
      const constraints = parseJsonValue(entity?.constraints_json, { owner: entity, kind: 'setting', field: 'constraints_json' }) || {}
      const state = parseJsonValue(entity?.state_json, { owner: entity, kind: 'setting', field: 'state_json' }) || {}
      const startChapter = numberOrNull(entity?.first_chapter_no, payload?.start_chapter_no, payload?.start_chapter)
      const endChapter = numberOrNull(entity?.last_chapter_no, payload?.end_chapter_no, payload?.end_chapter)
      const lastAdvancedChapter = numberOrNull(state?.last_advanced_chapter, payload?.last_advanced_chapter)
      const nextAdvanceChapter = numberOrNull(state?.next_advance_chapter, payload?.next_advance_chapter)
      const payoffStatus = text(state?.payoff_status || payload?.payoff_status)
      const syncEvidence = buildStorylineSyncEvidence(entity, reviews)
      const retentionImpacts = first30RiskCards
        .filter(card => {
          const chapterNo = Number(card.chapterNo || 0)
          if (!chapterNo) return false
          if (startChapter && chapterNo < startChapter) return false
          if (endChapter && chapterNo > endChapter) return false
          return true
        })
        .map(card => `第${card.chapterNo}章 ${card.score}分`)
      const riskTags: string[] = []
      if (nextAdvanceChapter && activeChapterNo > nextAdvanceChapter) riskTags.push('逾期未推')
      if (/debt|overdue|逾期|待回收|回收债务/.test(payoffStatus)) riskTags.push('回收债务')
      if (retentionImpacts.length > 0) riskTags.push('影响留存')
      if (syncEvidence.syncRisks.some(item => item.includes('漏推'))) riskTags.push('复盘漏推')
      if (syncEvidence.syncRisks.some(item => item.includes('禁揭'))) riskTags.push('禁揭风险')

      return {
        id: entity?.id,
        name: text(entity?.name, '未命名剧情线'),
        entityType,
        typeLabel: STORYLINE_TYPE_LABELS[entityType],
        summary: text(entity?.summary),
        priority: text(payload?.priority || entity?.priority, 'normal'),
        status: text(state?.current_state || entity?.status, 'active'),
        startChapter,
        endChapter,
        lastAdvancedChapter,
        nextAdvanceChapter,
        payoffStatus,
        expectedPayoff: text(payload?.expected_payoff || state?.expected_payoff),
        relatedNames: listText(payload?.related_characters, payload?.related_factions, payload?.related_foreshadowing),
        advanceRule: text(constraints?.advance_rule || payload?.advance_rule),
        forbiddenReveal: text(constraints?.forbidden_reveal || constraints?.taboo || payload?.forbidden_reveal),
        riskTags,
        retentionImpacts,
        planEvidence: syncEvidence.planEvidence,
        actualEvidence: syncEvidence.actualEvidence,
        diffEvidence: syncEvidence.diffEvidence,
        syncRisks: syncEvidence.syncRisks,
        latestSyncChapter: syncEvidence.latestSyncChapter,
        actionChapterNo: nextAdvanceChapter || startChapter || activeChapterNo,
      }
    })
    .sort((a, b) => {
      const priorityScore = (value: string) => value === 'high' || value === '核心' ? 0 : value === 'medium' || value === '中' ? 1 : 2
      return priorityScore(a.priority) - priorityScore(b.priority)
        || (a.nextAdvanceChapter || 99999) - (b.nextAdvanceChapter || 99999)
        || a.name.localeCompare(b.name, 'zh-CN')
    })

  const groups = STORYLINE_TYPE_ORDER
    .map(key => {
      const groupItems = items.filter(item => item.entityType === key)
      return { key, label: STORYLINE_TYPE_LABELS[key], count: groupItems.length, items: groupItems }
    })
    .filter(group => group.count > 0)
  const overdueCount = items.filter(item => item.riskTags.includes('逾期未推')).length
  const debtCount = items.filter(item => item.riskTags.includes('回收债务')).length
  const retentionRiskCount = items.filter(item => item.riskTags.includes('影响留存')).length
  const status = items.length === 0 ? 'missing' : (overdueCount || debtCount || retentionRiskCount) ? 'needs_attention' : 'ready'

  return {
    status,
    summary: items.length === 0
      ? '尚未建立剧情线资产。'
      : status === 'ready'
        ? `已有 ${items.length} 条剧情线，当前没有明显调度风险。`
        : `已有 ${items.length} 条剧情线，${overdueCount} 条逾期未推，${debtCount} 条存在回收债务，${retentionRiskCount} 条影响前30章留存。`,
    total: items.length,
    overdueCount,
    debtCount,
    retentionRiskCount,
    groups,
  }
}

function isCharacterArcEntity(type: string) {
  return type === 'character_arc' || type === 'relationship_arc'
}

function arcTypeLabel(type: string) {
  if (type === 'relationship_arc') return '关系线'
  return '角色线'
}

function characterArcReviewPayload(reviews: AnyRecord[]) {
  return latestReviewPayloadAny(reviews, 'character_arc_sync', 'character_arc_sync')
}

function characterArcEvidenceItems(report: AnyRecord) {
  return arrayValue(report?.missed)
    .map((item, index) => {
      const label = firstNonEmpty(item?.label, item?.key, '人物弧光')
      const detail = firstNonEmpty(item?.text, item?.expected, item?.issue, item?.description)
      const key = text(item?.key || item?.label).toLowerCase()
      const priority = key.includes('growth') || label.includes('成长') ? 0
        : key.includes('relationship') || label.includes('关系') ? 1
          : key.includes('flaw') || label.includes('缺陷') ? 2
            : key.includes('desire') || label.includes('欲望') ? 3
              : 4
      return {
        priority,
        index,
        text: detail ? `${label}：${detail}` : label,
      }
    })
    .filter(item => Boolean(item.text))
    .sort((a, b) => a.priority - b.priority || a.index - b.index)
    .map(item => item.text)
}

function characterArcReviewMatchesEntity(entity: AnyRecord, report: AnyRecord, relatedNames: string[]) {
  const characterName = firstNonEmpty(report?.character_name, report?.characterName, report?.name)
  if (!characterName) return true
  const entityName = text(entity?.name)
  return [entityName, ...relatedNames].some(name => name && (name.includes(characterName) || characterName.includes(name)))
}

export function buildCharacterArcBoardModel(
  settingEntities: AnyRecord[],
  reviews: AnyRecord[],
  activeChapterNo: number,
): PlanningWorkspaceModel['characterArcBoard'] {
  const arcSync = characterArcReviewPayload(reviews)
  const syncMissedCount = numericCount(arcSync?.missed_count, arcSync?.missedCount, listLength(arcSync?.missed))
  const syncEvidence = characterArcEvidenceItems(arcSync)
  const arcs = settingEntities
    .filter(entity => isCharacterArcEntity(text(entity?.entity_type)))
    .map(entity => {
      const entityType = text(entity?.entity_type) as 'character_arc' | 'relationship_arc'
      const payload = parseJsonValue(entity?.payload_json, { owner: entity, kind: 'setting', field: 'payload_json' }) || {}
      const constraints = parseJsonValue(entity?.constraints_json, { owner: entity, kind: 'setting', field: 'constraints_json' }) || {}
      const state = parseJsonValue(entity?.state_json, { owner: entity, kind: 'setting', field: 'state_json' }) || {}
      const relatedNames = listText(payload?.related_characters, payload?.characters, payload?.related_names, payload?.relatedNames)
      const lastAdvancedChapter = numberOrNull(state?.last_advanced_chapter, payload?.last_advanced_chapter)
      const nextAdvanceChapter = numberOrNull(state?.next_advance_chapter, payload?.next_advance_chapter)
      const riskTags: string[] = []
      if (entityType === 'character_arc' && nextAdvanceChapter && activeChapterNo > nextAdvanceChapter) riskTags.push('成长断档')
      if (entityType === 'relationship_arc' && nextAdvanceChapter && activeChapterNo >= nextAdvanceChapter) riskTags.push('关系待推进')
      const matchesSync = syncMissedCount > 0 && characterArcReviewMatchesEntity(entity, arcSync, relatedNames)
      if (matchesSync) riskTags.push('弧光缺口')
      if (!firstNonEmpty(payload?.growth_target, payload?.growthTarget, payload?.relationship_shift, payload?.relationshipShift, payload?.expected_payoff)) {
        riskTags.push('缺成长目标')
      }

      return {
        id: entity?.id,
        name: text(entity?.name, '未命名人物线'),
        entityType,
        typeLabel: arcTypeLabel(entityType),
        summary: text(entity?.summary),
        priority: text(payload?.priority || entity?.priority, 'normal'),
        relatedNames,
        currentState: text(state?.current_state || entity?.status),
        desire: text(payload?.desire || state?.desire),
        flawPressure: text(payload?.flaw_pressure || payload?.flawPressure || state?.flaw_pressure),
        growthTarget: text(payload?.growth_target || payload?.growthTarget || payload?.expected_payoff),
        relationshipShift: text(payload?.relationship_shift || payload?.relationshipShift || state?.relationship_shift),
        voiceAnchor: text(payload?.voice_anchor || payload?.voiceAnchor || state?.voice_anchor),
        forbiddenReveal: text(constraints?.forbidden_reveal || constraints?.taboo || payload?.forbidden_reveal),
        lastAdvancedChapter,
        nextAdvanceChapter,
        riskTags: Array.from(new Set(riskTags)),
        latestEvidence: matchesSync ? syncEvidence.slice(0, 4) : [],
        actionChapterNo: nextAdvanceChapter || lastAdvancedChapter || activeChapterNo,
      }
    })
    .sort((a, b) => {
      const priorityScore = (value: string) => value === 'high' || value === '核心' ? 0 : value === 'medium' || value === '中' ? 1 : 2
      return priorityScore(a.priority) - priorityScore(b.priority)
        || (a.nextAdvanceChapter || 99999) - (b.nextAdvanceChapter || 99999)
        || a.name.localeCompare(b.name, 'zh-CN')
    })
  const overdueCount = arcs.filter(item => item.riskTags.includes('成长断档')).length
  const relationshipRiskCount = arcs.filter(item => item.riskTags.includes('关系待推进')).length
  const growthGapCount = syncMissedCount
  const status: PlanningWorkspaceModel['characterArcBoard']['status'] = arcs.length === 0
    ? 'missing'
    : overdueCount + relationshipRiskCount + growthGapCount > 0
      ? 'needs_attention'
      : 'ready'
  return {
    status,
    summary: arcs.length === 0
      ? '尚未建立角色线或关系线资产。'
      : status === 'ready'
        ? `人物成长稳定：已有 ${arcs.length} 条角色/关系线，近期没有明显成长断档。`
        : `人物成长需治理：${overdueCount} 条成长断档，${relationshipRiskCount} 条关系待推进，${growthGapCount > 0 ? text(arcSync?.label, `人物弧光缺口 ${growthGapCount}`) : '人物弧光待复盘'}。`,
    total: arcs.length,
    growthGapCount,
    overdueCount,
    relationshipRiskCount,
    actionKey: growthGapCount > 0 ? 'open_quality_revision' : arcs.length === 0 || overdueCount + relationshipRiskCount > 0 ? 'open_story_assets' : 'enter_chapter_writing',
    arcs,
  }
}

