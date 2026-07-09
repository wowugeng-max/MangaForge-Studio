function asArray<T = any>(value: T | T[] | null | undefined): T[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function compactBriefText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function sourceEvidenceSearchText(value: any) {
  return String(value || '')
    .replace(/[\s"'“”‘’《》【】()[\]{}，。！？、；：,.!?;:|｜\-_/\\]+/g, '')
    .toLowerCase()
}

function mergedReadinessChapterTarget(contextPackage: any = {}) {
  return {
    ...(contextPackage?.chapter_target || {}),
    ...(contextPackage?.chapterTarget || {}),
  }
}

export function sourceReadinessMatchingRows(sourceRows: any[] = [], pattern: RegExp) {
  return asArray(sourceRows).filter((item: any) => {
    const key = compactBriefText(item?.key || item?.name)
    const label = compactBriefText(item?.label || item?.title)
    pattern.lastIndex = 0
    return pattern.test(`${key} ${label}`)
  })
}

export function sourceReadinessReadyRowMissingEvidence(sourceRows: any[] = []) {
  return asArray(sourceRows).some((item: any) => {
    const status = String(item?.status || '').toLowerCase()
    if (!['ready', 'pass', 'ok'].includes(status) && item?.ready !== true) return false
    return !compactBriefText(item?.evidence || item?.summary || item?.source)
  })
}

export function sourceReadinessReadyRowGenericEvidence(sourceRows: any[] = []) {
  return asArray(sourceRows).some((item: any) => {
    const status = String(item?.status || '').toLowerCase()
    if (!['ready', 'pass', 'ok'].includes(status) && item?.ready !== true) return false
    const evidence = compactBriefText(item?.evidence || item?.summary || item?.source)
    if (!evidence) return false
    const normalized = sourceEvidenceSearchText(evidence)
    return [
      '已读',
      '已读取',
      '已确认',
      '已检查',
      '已核对',
      '已完成',
      '已经读取',
      '已经确认',
      '已经检查',
      '已经核对',
      '已经完成',
      '来源已读取',
      '来源已确认',
      '来源已核对',
    ].includes(normalized)
  })
}

export function getChapterBlueprintForReadiness(contextPackage: any = {}) {
  const target = mergedReadinessChapterTarget(contextPackage)
  return contextPackage?.chapterTarget?.chapter_blueprint
    || contextPackage?.chapterTarget?.chapterBlueprint
    || target?.chapter_blueprint
    || contextPackage?.chapter_blueprint
    || contextPackage?.pre_draft_brief?.chapter_blueprint
    || contextPackage?.preDraftBrief?.chapter_blueprint
    || target?.chapterBlueprint
    || contextPackage?.chapterBlueprint
    || contextPackage?.pre_draft_brief?.chapterBlueprint
    || contextPackage?.preDraftBrief?.chapterBlueprint
    || null
}

export function legacyChapterOutlineForReadiness(target: any = {}) {
  const coreEvent = compactBriefText(target.chapter_goal || target.chapterGoal || target.goal || target.summary || target.core_event || target.coreEvent)
  const legacyFields = [
    target.target_emotion || target.targetEmotion || target.emotional_curve || target.emotionalCurve,
    target.opening_hook || target.openingHook,
    target.reader_payoff || target.readerPayoff || target.core_payoff || target.corePayoff || target.payoff,
    target.ending_hook || target.endingHook,
    target.word_target || target.wordTarget,
  ].map(value => compactBriefText(value)).filter(Boolean)
  if (!coreEvent || legacyFields.length < 2) return null
  return {
    target_emotion: target.target_emotion || target.targetEmotion || target.emotional_curve || target.emotionalCurve,
    opening_hook: target.opening_hook || target.openingHook,
    core_payoff: target.core_payoff || target.corePayoff || target.reader_payoff || target.readerPayoff || target.payoff,
    ending_contract: {
      next_chapter_pull: target.ending_hook || target.endingHook,
    },
  }
}

export function missingChapterBlueprintSections(blueprint: any = {}) {
  if (!blueprint || typeof blueprint !== 'object') return ['本章细纲/蓝图']
  const contentOutline = blueprint.content_outline || blueprint.contentOutline || {}
  const plotLines = blueprint.plot_lines || blueprint.plotLines || {}
  const endingContract = blueprint.ending_contract || blueprint.endingContract || {}
  const missing: string[] = []

  if (!compactBriefText(blueprint.target_emotion || blueprint.targetEmotion)) missing.push('目标情绪')
  if (!compactBriefText(blueprint.opening_hook || blueprint.openingHook)) missing.push('开篇钩子')
  if (!compactBriefText(blueprint.core_payoff || blueprint.corePayoff)) missing.push('核心回报')
  if (!['cause', 'development', 'turn', 'climax', 'ending'].every(key => compactBriefText(contentOutline[key]))) {
    missing.push('五段式内容概括')
  }
  if (!compactBriefText(plotLines.mainline || plotLines.main_line || plotLines.mainLine) || !compactBriefText(plotLines.logic_line || plotLines.logicLine)) {
    missing.push('多线推进')
  }
  if (!asArray(blueprint.character_order || blueprint.characterOrder).length) missing.push('人物出场顺序')
  if (!asArray(blueprint.beat_sequence || blueprint.beatSequence).length) missing.push('情节点功能标签')
  if (!compactBriefText(blueprint.cost_and_reward || blueprint.costAndReward)) missing.push('代价/收益')
  if (!compactBriefText(endingContract.next_chapter_pull || endingContract.nextChapterPull || blueprint.ending_hook || blueprint.endingHook)) {
    missing.push('章尾承接')
  }

  return missing
}
