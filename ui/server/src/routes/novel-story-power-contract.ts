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

function firstText(...values: any[]) {
  for (const value of values) {
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

export function buildOhStoryStoryPowerContract(...inputs: any[]) {
  const objects = inputs.map(input => asObject(input))
  const existing = objects.map(item => asObject(
    item?.story_power_contract
    || item?.storyPowerContract
    || item?.writing_bible?.story_power_contract
    || item?.writingBible?.storyPowerContract,
  )).find(item => Object.keys(item).length) || {}
  const chapterTarget = objects.map(item => asObject(item?.chapter_target || item?.chapterTarget)).find(item => Object.keys(item).length) || {}
  const project = objects.find(item => item?.title || item?.genre || item?.summary || item?.synopsis) || {}
  const sceneCards = objects
    .flatMap(item => Array.isArray(item?.scene_cards)
      ? item.scene_cards
      : (Array.isArray(item?.chapter_target?.scene_cards) ? item.chapter_target.scene_cards : []))
    .filter(item => item && typeof item === 'object')
  const firstScene = sceneCards[0] || {}
  const lastScene = sceneCards[sceneCards.length - 1] || {}
  const storyGoal = firstText(
    chapterTarget.summary,
    chapterTarget.goal,
    chapterTarget.chapter_goal,
    firstScene.goal,
    firstScene.purpose,
    project.main_conflict,
    project.core_premise,
    project.synopsis,
    project.summary,
    '本章必须让读者看见目标、阻碍、行动和变化',
  )
  const storyObstacle = firstText(
    chapterTarget.conflict,
    firstScene.obstacle,
    firstScene.conflict,
    project.main_conflict,
    '本章必须设置会改变行动选择的真实阻碍',
  )
  const storyAction = firstText(
    firstScene.action,
    firstScene.turning_point,
    firstScene.purpose,
    '主角必须采取可见行动，而不是听解释、等安排或只做心理活动',
  )
  const storyFeedback = firstText(
    lastScene.state_delta,
    lastScene.exit_state,
    lastScene.reader_payoff,
    lastScene.reversal,
    chapterTarget.ending_hook,
    '行动必须带来代价、反馈、信息变化、关系变化或下一步期待',
  )
  return {
    source: 'oh_story_plot_core_story_power_v1',
    route: 'plot_core_story_power_gate',
    story_power_dimensions: [
      '故事五维：目标、阻碍、动作、反馈、期待必须同时存在。',
      '目标让读者知道主角要什么；阻碍让目标不能顺手得到；动作让剧情发生；反馈证明动作有代价；期待把读者带到下一页。',
      '五维任一缺失，章节就会变成设定说明、情绪空转或作者自嗨。',
    ],
    chapter_power_loop: uniqueTexts([
      `目标：${storyGoal}`,
      `阻碍：${storyObstacle}`,
      `动作：${storyAction}`,
      `反馈：${storyFeedback}`,
      chapterTarget.ending_hook ? `期待：${chapterTarget.ending_hook}` : '期待：章末必须留下下一步可执行压力。',
    ], 8),
    action_rules: [
      '有动作才是故事：每个核心场景必须让主角或关键角色用动作改变局势。',
      '动作必须是可见行为、选择、对抗、验证、交易、牺牲、欺骗、追查或反制，不能只写心理、解释或站着聊天。',
      '场景卡的 goal/obstacle/action/turn/payoff/state_delta 必须转成正文行动链。',
    ],
    beginning_end_rules: [
      '有始有终：开场目标、阻碍或异常必须在章末形成状态变化。',
      '章末不能只总结情绪；必须交代本章动作带来的新位置、新线索、新代价、新关系或新问题。',
      '如果本章只完成铺垫，也必须让铺垫改变读者期待或角色下一步选择。',
    ],
    causal_feedback_rules: [
      '因果反馈：角色动作必须引发代价、奖励、信息揭示、关系变化、规则触发或敌方反制。',
      '反馈不能靠旁白宣布，必须落成物件变化、局势变化、角色反应、证据变化或下一步压力。',
      '上一场的结果要成为下一场的原因，不能把场景并排摆放。',
    ],
    quality_checks: [
      '故事五维是否齐全：目标、阻碍、动作、反馈、期待都能在正文中定位。',
      '行动是否改变局势，而不是只听解释、等安排或内心独白。',
      '开场提出的压力是否在章末形成状态变化或下一步期待。',
      '每个关键动作是否有因果反馈：代价、奖励、信息、关系、规则或反制。',
      '场景之间是否结果接结果、因果相扣，而不是同质化并列。',
    ],
    revision_priorities: [
      '补可见动作',
      '补行动反馈',
      '补开场到章末的状态变化',
      '把解释改成角色验证或对抗',
      '让上一场结果成为下一场原因',
    ],
    ...existing,
  }
}

export function formatOhStoryStoryPowerPrompt(contract: any) {
  return [
    '【oh-story 故事力合同】',
    '请把下列内容写入 writing_bible.story_power_contract，并让 plot_engine、chapter_outlines、scene_cards 与它一致：',
    JSON.stringify(contract, null, 2),
  ].join('\n')
}
