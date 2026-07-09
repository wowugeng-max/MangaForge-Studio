import { firstCompactText } from './story-drive-basics'

function asArray<T = any>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value
  return value === undefined || value === null ? [] : [value]
}

function compactBriefText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function uniqueBriefStrings(values: any, limit = 12) {
  const seen = new WeakSet<object>()
  const flattenBriefValues = (value: any, depth = 0): any[] => {
    if (depth > 6) return []
    if (Array.isArray(value)) return value.flatMap(item => flattenBriefValues(item, depth + 1))
    if (value && typeof value === 'object') {
      if (seen.has(value)) return []
      seen.add(value)
      return Object.values(value).flatMap(item => flattenBriefValues(item, depth + 1))
    }
    return value ? [value] : []
  }
  return Array.from(new Set(flattenBriefValues(values)
    .map(value => compactBriefText(value))
    .filter(Boolean))).slice(0, limit)
}

export function normalizeSerialRhythmBudgetItem(value: any, index: number) {
  const raw = typeof value === 'object' && value ? value : { required_payoff: value }
  const title = compactBriefText(raw.title || raw.name || raw.scene_title || raw.sceneTitle, `场景${index + 1}`)
  const requiredPayoff = firstCompactText(
    raw.required_payoff,
    raw.requiredPayoff,
    raw.reader_payoff,
    raw.readerPayoff,
    raw.payoff,
  )
  const turn = firstCompactText(raw.turn, raw.reversal, raw.turning_point, raw.turningPoint, raw.information_gap, raw.informationGap)
  const endingHookSeed = firstCompactText(raw.ending_hook_seed, raw.endingHookSeed, raw.ending_hook, raw.endingHook, raw.exit_state, raw.exitState)
  const wordBudget = compactBriefText(raw.word_budget || raw.wordBudget || raw.budget)
  if (!title && !requiredPayoff && !turn && !endingHookSeed && !wordBudget) return null
  return {
    scene_no: Number(raw.scene_no || raw.sceneNo || index + 1),
    title,
    word_budget: wordBudget,
    required_payoff: requiredPayoff,
    turn,
    ending_hook_seed: endingHookSeed,
  }
}

export function normalizeSerialRhythmBrief(value: any, sceneBriefs: any[] = [], readerRetentionBrief: any = null, wordTarget: any = null) {
  const raw = value?.serial_rhythm_brief || value?.serialRhythmBrief || value || {}
  const explicitBudget = asArray(raw.scene_payoff_budget || raw.scenePayoffBudget || raw.scene_budgets || raw.sceneBudgets)
    .map((item: any, index: number) => normalizeSerialRhythmBudgetItem(item, index))
    .filter(Boolean)
  const scenePayoffBudget = (explicitBudget.length ? explicitBudget : sceneBriefs.map(normalizeSerialRhythmBudgetItem).filter(Boolean)).slice(0, 8)
  const targetWords = Number(wordTarget?.target || raw.word_target || raw.wordTarget || 0)
  const defaultInterval = targetWords >= 9000 ? '每 1200-1800 字至少交付一次可见回报。' : '每 800-1200 字至少交付一次可见回报。'
  const openingHookDeadline = firstCompactText(
    raw.opening_hook_deadline,
    raw.openingHookDeadline,
    raw.opening_guardrail,
    raw.openingGuardrail,
    readerRetentionBrief?.opening_hook ? `前 300 字必须落地：${readerRetentionBrief.opening_hook}` : '',
  )
  const payoffInterval = firstCompactText(
    raw.payoff_interval,
    raw.payoffInterval,
    raw.payoff_density,
    raw.payoffDensity,
    `${defaultInterval}回报可以是信息增量、冲突转折、爽点兑现、能力展示、关系变化或小回收。`,
  )
  const middleGuardrail = firstCompactText(
    raw.middle_guardrail,
    raw.middleGuardrail,
    raw.pacing_guardrail,
    raw.pacingGuardrail,
    readerRetentionBrief?.payoff_promise ? `中段必须围绕读者承诺推进：${readerRetentionBrief.payoff_promise}` : '',
    scenePayoffBudget.length ? `每个场景至少兑现一个回报，不能只写路过、解释或等待。` : '',
  )
  const endingHookGuardrail = firstCompactText(
    raw.ending_hook_guardrail,
    raw.endingHookGuardrail,
    raw.ending_guardrail,
    raw.endingGuardrail,
    readerRetentionBrief?.ending_question ? `最后一幕必须压出追读问题：${readerRetentionBrief.ending_question}` : '',
  )
  const antiDragRules = uniqueBriefStrings(
    raw.anti_drag_rules
    || raw.antiDragRules
    || raw.no_drag_rules
    || raw.noDragRules
    || [
      '禁止连续两段纯环境描写或设定解释；每 3-5 段必须出现行动、选择、信息变化或关系变化。',
      '不能用心理总结替代冲突推进；每个场景必须有目标、阻碍、转折和回报。',
      '字数不足时优先扩写行动链、对话交锋、选择代价和章末铺垫，不靠水环境。',
    ],
    8,
  )
  if (!openingHookDeadline && !payoffInterval && !middleGuardrail && !endingHookGuardrail && !scenePayoffBudget.length && !antiDragRules.length) return null
  return {
    status: compactBriefText(raw.status, 'ready'),
    opening_hook_deadline: openingHookDeadline,
    payoff_interval: payoffInterval,
    middle_guardrail: middleGuardrail,
    ending_hook_guardrail: endingHookGuardrail,
    scene_payoff_budget: scenePayoffBudget,
    anti_drag_rules: antiDragRules,
  }
}

export function normalizePageTurnHookBrief(value: any, target: any = {}, sceneBriefs: any[] = [], readerRetentionBrief: any = null, storyDriveBrief: any = null) {
  const raw = value?.page_turn_hook_brief || value?.pageTurnHookBrief || value || {}
  const lastScene = sceneBriefs[sceneBriefs.length - 1] || {}
  const coreQuestion = firstCompactText(
    raw.core_question,
    raw.coreQuestion,
    raw.question,
    readerRetentionBrief?.ending_question,
    target.ending_hook,
    lastScene.ending_hook_seed,
  )
  const visibleTrigger = firstCompactText(
    raw.visible_trigger,
    raw.visibleTrigger,
    raw.trigger,
    lastScene.reversal,
    lastScene.ending_hook_seed,
    target.ending_hook,
  )
  const nextChapterPull = firstCompactText(
    raw.next_chapter_pull,
    raw.nextChapterPull,
    raw.next_pull,
    raw.nextPull,
    storyDriveBrief?.causal_next_step,
    target.causal_next_step,
    target.causalNextStep,
    target.next_step,
    target.nextStep,
    coreQuestion,
  )
  const finalImage = firstCompactText(
    raw.final_image,
    raw.finalImage,
    raw.last_image,
    raw.lastImage,
    lastScene.ending_hook_seed,
    lastScene.reversal,
    target.ending_hook,
  )
  const withheldAnswer = firstCompactText(
    raw.withheld_answer,
    raw.withheldAnswer,
    raw.withheld,
    raw.forbidden_answer,
    raw.forbiddenAnswer,
    coreQuestion ? `本章只抛出「${coreQuestion}」，不得在本章解释完整答案。` : '',
  )
  const forbiddenResolution = uniqueBriefStrings([
    raw.forbidden_resolution,
    raw.forbiddenResolution,
    raw.forbidden,
    withheldAnswer,
    coreQuestion ? `不得在本章解释完整答案：${coreQuestion}` : '',
  ], 8)
  const requiredActions = uniqueBriefStrings(
    raw.required_actions
    || raw.requiredActions
    || [
      visibleTrigger ? `最后 300 字必须把「${visibleTrigger}」写成角色现场看见、听见、拿到或被迫面对的触发。` : '最后 300 字必须出现可见触发，不得只用旁白宣布悬念。',
      coreQuestion ? `结尾必须让读者带着「${coreQuestion}」翻页。` : '结尾必须留下下一章非看不可的问题。',
      nextChapterPull ? `只收束本章行动，把「${nextChapterPull}」留给下一章推进。` : '只收束本章行动，不提前解决下一章冲突。',
    ],
    8,
  )
  const hookType = compactBriefText(raw.hook_type || raw.hookType || raw.type, '问题反转')
  if (!coreQuestion && !visibleTrigger && !nextChapterPull && !finalImage && !forbiddenResolution.length) return null
  return {
    status: compactBriefText(raw.status, 'ready'),
    hook_type: hookType,
    core_question: coreQuestion,
    visible_trigger: visibleTrigger,
    withheld_answer: withheldAnswer,
    next_chapter_pull: nextChapterPull,
    final_image: finalImage,
    forbidden_resolution: forbiddenResolution,
    required_actions: requiredActions,
  }
}
