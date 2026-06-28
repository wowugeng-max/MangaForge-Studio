function asObject(value: any): any {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function asArray(value: any) {
  return Array.isArray(value) ? value : []
}

function firstText(...values: any[]) {
  for (const value of values.flat()) {
    const text = String(value || '').trim()
    if (text) return text
  }
  return ''
}

function uniqueTexts(values: any[], limit = 12) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values.flat()) {
    const text = String(value || '').trim()
    if (!text || seen.has(text)) continue
    seen.add(text)
    result.push(text)
    if (result.length >= limit) break
  }
  return result
}

function contractFromObject(item: any) {
  const object = asObject(item)
  if (object.source === 'oh_story_plot_core_mainline_definition_v1' || object.version === 'oh_story_mainline_definition_v1') return object
  return asObject(
    object?.mainline_definition_contract
    || object?.mainlineDefinitionContract
    || object?.writing_bible?.mainline_definition_contract
    || object?.writingBible?.mainlineDefinitionContract
    || object?.chapter_blueprint?.mainline_definition_contract
    || object?.chapterBlueprint?.mainlineDefinitionContract
    || object?.chapter_target?.mainline_definition_contract
    || object?.chapterTarget?.mainlineDefinitionContract
    || object?.chapter_target?.chapter_blueprint?.mainline_definition_contract
    || object?.chapterTarget?.chapterBlueprint?.mainlineDefinitionContract,
  )
}

export function buildOhStoryMainlineDefinitionContract(...inputs: any[]) {
  const objects = inputs.map(input => asObject(input))
  const existing = objects.map(contractFromObject).find(item => Object.keys(item).length) || {}
  const writingBible = objects.map(item => asObject(item?.writing_bible || item?.writingBible || item)).find(item => item?.mainline || item?.mainline_definition_contract) || {}
  const mainline = asObject(writingBible?.mainline || writingBible?.mainLine)
  const chapterTarget = objects.map(item => asObject(item?.chapter_target || item?.chapterTarget || item)).find(item => (
    item?.summary || item?.goal || item?.chapter_goal || item?.conflict || item?.ending_hook
  )) || {}
  const chapterBlueprint = objects.map(item => asObject(
    item?.chapter_blueprint
    || item?.chapterBlueprint
    || item?.chapter_target?.chapter_blueprint
    || item?.chapterTarget?.chapterBlueprint,
  )).find(item => Object.keys(item).length) || {}
  const plotLines = asObject(chapterBlueprint?.plot_lines || chapterBlueprint?.plotLines)
  const project = objects.find(item => item?.title || item?.genre || item?.summary || item?.synopsis || item?.main_conflict) || {}
  const sceneCards = objects
    .flatMap(item => Array.isArray(item?.scene_cards)
      ? item.scene_cards
      : (Array.isArray(item?.chapter_target?.scene_cards) ? item.chapter_target.scene_cards : []))
    .filter(item => item && typeof item === 'object')
  const firstScene = sceneCards[0] || {}
  const mainlineEvent = firstText(
    existing.mainline_event,
    existing.mainlineEvent,
    mainline.goal,
    mainline.hook,
    plotLines.mainline,
    plotLines.main_line,
    plotLines.mainLine,
    chapterTarget.summary,
    chapterTarget.goal,
    chapterTarget.chapter_goal,
    firstScene.purpose,
    firstScene.goal,
    project.main_conflict,
    project.core_premise,
    project.synopsis,
    project.summary,
    '本章必须明确推进一件会改变局势的主线事件',
  )
  const actionRole = firstText(
    existing.action_role,
    existing.actionRole,
    chapterTarget.conflict ? `升级、金手指、地图、资源和设定展示只能作为解决「${chapterTarget.conflict}」的行动或工具。` : '',
    mainlineEvent ? `升级是主角达成「${mainlineEvent}」目标的行动，不是主线本身。` : '',
    '升级是主角达成目标的行动，不能顶替主线本身。',
  )
  const definitionRules = uniqueTexts([
    '主线不等于升级。',
    '主线是一件事，不是一个元素。',
    '升级是主角达成目标的行动。',
    ...asArray(existing.definition_rules || existing.definitionRules),
  ], 8)
  const actionRules = uniqueTexts([
    '升级是主角达成目标的行动。',
    '升级、修炼、拿资源、换地图、金手指展示只能服务 mainline_event。',
    '每章必须说明本章让那一件事发生了什么状态变化。',
    '主角可以变强，但变强必须改变目标、阻碍、证据、关系、代价或下一步选择。',
    ...asArray(existing.action_rules || existing.actionRules),
  ], 8)
  const handoffRules = uniqueTexts([
    '主线完成后，要么通过铺垫开启第二条主线，要么完结。',
    '新主线必须由上一主线结果自然引出。',
    '当前主线未完成前，不得用新地图、新等级、新设定转移读者注意力。',
    ...asArray(existing.handoff_rules || existing.handoffRules),
  ], 8)
  const forbiddenMainlineShapes = uniqueTexts([
    '境界升级条',
    '金手指元素列表',
    '地图/设定罗列',
    '只写变强但不改变那一件事',
    ...asArray(existing.forbidden_mainline_shapes || existing.forbiddenMainlineShapes),
  ], 10)
  const qualityChecks = uniqueTexts([
    '主线是否明确为一件事，不是一个元素。',
    '升级是否只是达成主线目标的行动。',
    '本章是否让 mainline_event 发生状态变化。',
    '主线完成后是否有新主线铺垫或完结选择。',
    ...asArray(existing.quality_checks || existing.qualityChecks),
  ], 10)
  return {
    ...existing,
    source: existing.source || 'oh_story_plot_core_mainline_definition_v1',
    version: existing.version || 'oh_story_mainline_definition_v1',
    route: existing.route || 'plot_core_mainline_definition_gate',
    mainline_event: mainlineEvent,
    action_role: actionRole,
    definition_rules: definitionRules,
    action_rules: actionRules,
    handoff_rules: handoffRules,
    forbidden_mainline_shapes: forbiddenMainlineShapes,
    quality_checks: qualityChecks,
  }
}

export function formatOhStoryMainlineDefinitionPrompt(contract: any) {
  return [
    '【oh-story 主线定义合同】',
    '请把下列内容写入 writing_bible.mainline_definition_contract，并让 plot_engine、chapter_outlines、chapter_blueprint 与它一致：',
    JSON.stringify(contract, null, 2),
  ].join('\n')
}
