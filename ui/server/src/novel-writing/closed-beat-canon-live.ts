import {
  type BeatFamilyStatus,
  type ProgressBeatFamilyId,
  type ClosedBeatRecord,
  type LiveChapterContract,
  type ZombiePressureFinding,
  type FamilyDef,
  FAMILY_DEFS,
  compact,
  asArray,
  uniqueTexts,
  chapterNoOf,
  chapterTextOf,
  proseMatchesClose,
  textHitsFamilyGoal,
  extractEvidence,
  familyDef,
} from './closed-beat-canon-shared'

import {
  detectClosedBeatsInChapter,
  collectClosedBeatFamiliesFromChapters,
  isFamilyClosed,
  matchFamiliesInText,
  isZombieResidualHook,
  textDemandsClosedBeat,
} from './closed-beat-canon-detect'

function stripClausesMatchingClosed(text: string, closed: ClosedBeatRecord[]) {
  const source = compact(text, 1200)
  if (!source || !closed.length) return source
  const parts = source
    .split(/[。！？!?；;\n]+/)
    .map(item => compact(item, 240))
    .filter(Boolean)
  const kept = parts.filter(part => {
    if (isZombieResidualHook(part, closed) || textDemandsClosedBeat(part, closed)) return false
    const families = matchFamiliesInText(part, closed)
    if (!families.length) return true
    // Keep only if it clearly introduces a still-open named pressure.
    const openNamed = (
      (/王奶奶|借酱油/.test(part) && !isFamilyClosed(closed, 'wang_nainai_visit'))
      || (/居委会|顾主任|通行证|诡币|1号楼/.test(part) && !isFamilyClosed(closed, 'neighborhood_committee'))
      || (/电梯|未定义/.test(part) && !isFamilyClosed(closed, 'elevator_undefined'))
    )
    return openNamed && part.length > 12
  })
  return kept.join('。')
}

/** Sanitize unresolved/forward hooks against closed canon. */
export function sanitizeHookList(hooks: any[] = [], closed: ClosedBeatRecord[] = [], limit = 8) {
  return uniqueTexts(hooks, limit * 2)
    .filter(item => !shouldSuppressOpenHook(item, closed) && !isZombieResidualHook(item, closed) && !textDemandsClosedBeat(item, closed))
    .filter(item => compact(item).length >= 6)
    .slice(0, limit)
}

function forwardGoalsFromPrevious(previousChapter: any, closed: ClosedBeatRecord[]) {
  const raw = previousChapter?.raw_payload || previousChapter?.rawPayload || {}
  const ledger = raw.chapter_progress_ledger || raw.chapterProgressLedger || previousChapter?.chapter_progress_ledger
  const candidates = uniqueTexts([
    ...asArray(ledger?.unresolved_next),
    previousChapter?.ending_hook,
    previousChapter?.endingHook,
    raw.outgoing_handoff?.unresolved_action,
    raw.outgoingHandoff?.unresolved_action,
  ], 10)
  return sanitizeHookList(candidates, closed, 4)
}

function proseDerivedDeliveredGoals(currentProse: string, closed: ClosedBeatRecord[]) {
  if (!currentProse) return [] as string[]
  const out: string[] = []
  // Written-chapter goals should describe delivered arc, not next-seed language.
  if (/青铜巨门|血肉王座|门内大堂/.test(currentProse)) out.push('1号楼内部/血肉王座')
  if (/阿奇姆|带着.{0,8}天选者/.test(currentProse)) out.push('同行天选者线')
  if (/权柄碎片|黑色石棺|黑色蚕茧/.test(currentProse)) out.push('权柄碎片对峙')
  if (/1号楼|通行证/.test(currentProse)) out.push('1号楼通行证/入口推进')
  if (/居委会|顾主任|负二|会议|抹杀|通行证|诡币/.test(currentProse)) {
    if (!isFamilyClosed(closed, 'neighborhood_committee') || /通行证|诡币|1号楼/.test(currentProse)) {
      out.push('居委会/地下对峙')
    }
  }
  if (/电梯|未定义/.test(currentProse)) out.push('电梯/未定义区域压力')
  if (/王奶奶/.test(currentProse) && !isFamilyClosed(closed, 'wang_nainai_visit')) out.push('王奶奶线')
  if (/物业|合规执法|物理合规/.test(currentProse) && !isFamilyClosed(closed, 'property_compliance')) {
    out.push('物业合规冲突')
  } else if (/物业|合规执法|物理合规/.test(currentProse) && isFamilyClosed(closed, 'property_compliance')) {
    // still acknowledge delivered smash without reopening countdown
    if (/轰碎|粉碎|执法棍/.test(currentProse)) out.push('物业第一波清场已打爆')
  }
  if (/符纸|巨婴|规则核心|厨房木门/.test(currentProse)) out.push('厨房实体/规则核心')
  if (/(邻居|借火|十点).{0,20}(炼化|吞噬|半死不活)/.test(currentProse) || /邻里借贷规则核心/.test(currentProse)) {
    out.push('邻居借火线已兑现')
  }
  if (/倒汤|耳光|利爪|掌权|热汤|毒汤/.test(currentProse)) out.push('餐桌规则压迫')
  return uniqueTexts(out, 4)
}

function proseDerivedForwardGoals(currentProse: string, closed: ClosedBeatRecord[]) {
  if (!currentProse) return [] as string[]
  const out: string[] = []
  // Highest-priority latest spoils first — for unwritten next-seed only.
  if (/青铜巨门|血肉王座|门内大堂|撞进.{0,12}(黑暗|巨门)/.test(currentProse)) {
    out.push('承接1号楼内部突入，优先推进血肉王座/门内未知压力，禁止回跳电梯或清场倒计时')
  }
  if (/阿奇姆|带着.{0,8}天选者|拎起.{0,8}/.test(currentProse)) {
    out.push('处置同行天选者并转化为本章可用筹码')
  }
  if (/权柄碎片|黑色石棺|黑色蚕茧/.test(currentProse) && !/血肉王座|青铜巨门/.test(currentProse.slice(-900))) {
    out.push('推进权柄碎片对峙，不回放已关闭的404清场/借火')
  }
  if (/1号楼|通行证/.test(currentProse) && !/青铜巨门|血肉王座|撞进/.test(currentProse.slice(-900))) {
    out.push('以1号楼通行证/入口为下一章主驱动，不回收已关闭的404清场/匿名敲门')
  }
  if (/居委会|顾主任|负二|会议|抹杀|通行证|诡币/.test(currentProse)) {
    if (!isFamilyClosed(closed, 'neighborhood_committee') || /通行证|诡币|1号楼/.test(currentProse)) {
      out.push('巩固居委会/地下对峙成果，转向1号楼真正未解压力，禁止回放已关闭清场/借火敲门')
    }
  }
  if (/电梯|未定义/.test(currentProse) && !isFamilyClosed(closed, 'elevator_undefined')) {
    out.push('推进电梯/未定义区域压力')
  }
  if (/王奶奶/.test(currentProse) && !isFamilyClosed(closed, 'wang_nainai_visit')) {
    out.push('承接王奶奶线，禁止重演借火邻居闭环')
  }
  // Never re-open property wave-1 as main goal once closed.
  if (/物业|合规/.test(currentProse) && !isFamilyClosed(closed, 'property_compliance')) {
    out.push('推进仍未解决的物业/规则压力（非已打爆的第一波清场倒计时）')
  }
  return uniqueTexts(out, 4)
}

/**
 * Detect zombie residual pressure still active in current chapter prose/ending.
 * Used by QA to open revisable findings (not just ignore dead task-book goals).
 */
export function detectZombiePressureInChapter(input: {
  chapter?: any
  closedBeats?: ClosedBeatRecord[]
  previousChapters?: any[]
} = {}): ZombiePressureFinding[] {
  const chapter = input.chapter || {}
  const previousChapters = asArray(input.previousChapters)
  const closed = input.closedBeats?.length
    ? input.closedBeats
    : collectClosedBeatFamiliesFromChapters(previousChapters)
  if (!closed.length) return []

  const prose = chapterTextOf(chapter)
  const ending = compact(chapter?.ending_hook || chapter?.endingHook || '', 400)
  const tail = compact(prose.slice(-1200), 1200)
  const corpus = `${tail}。${ending}`
  const findings: ZombiePressureFinding[] = []

  if (isFamilyClosed(closed, 'property_compliance') && /清场倒计时|赶在清场|合规清场|清场倒计时归零|合规性清理/.test(corpus)) {
    findings.push({
      key: 'zombie_property_cleanup',
      family: 'property_compliance',
      label: '僵尸清场倒计时',
      severity: 'high',
      description: '正文/章末仍把已解决的物业第一波「合规清场倒计时」当作未解主压力。',
      evidence: compact((corpus.match(/[^。]{0,20}(清场倒计时|赶在清场|合规清场|清场倒计时归零)[^。]{0,40}/) || [''])[0], 160),
      fix: '删除或改写清场倒计时驱动；若需压力，改用本章真正未关闭冲突（如居委会反转后的1号楼去向）。',
      directive: '修订：去掉已解决的物业清场倒计时压迫，禁止用「赶在清场归零前」驱动章末；改为兑现本章 live 成果并指向仍开放的下一钩子。',
    })
  }

  if (isFamilyClosed(closed, 'neighbor_borrow_fire')
    && (/(404.{0,8}门外|门外).{0,12}敲门|不知死活的敲门者|亲手拧开404|赶回404.{0,12}门/.test(corpus))) {
    const namedOpen = (/王奶奶/.test(corpus) && !isFamilyClosed(closed, 'wang_nainai_visit'))
      || (/物业经理/.test(corpus) && !isFamilyClosed(closed, 'property_compliance'))
    if (!namedOpen) {
      findings.push({
        key: 'zombie_door_knock',
        family: 'neighbor_borrow_fire',
        label: '僵尸敲门钩子',
        severity: 'high',
        description: '正文/章末仍在追已关闭的借火/匿名404敲门线，把它写成必须回去开门的主钩子。',
        evidence: compact((corpus.match(/[^。]{0,20}(敲门|敲门者|拧开404|404号房的大门)[^。]{0,40}/) || [''])[0], 160),
        fix: '删除「回404看匿名敲门者」主收束；章末改为本章真实增量（战利品/地位变化/下一地图入口）。',
        directive: '修订：禁止以已关闭的匿名404敲门/回房开门作为章末主驱动；保留本章新成果，改指向真正未解压力（如1号楼通行证去向）。',
      })
    }
  }

  if (isFamilyClosed(closed, 'neighbor_borrow_fire') && /借火|主动开门迎敌|反制邻居并炼化/.test(corpus)
    && /未完成|必须|继续|再次|核心目标/.test(corpus)) {
    findings.push({
      key: 'zombie_borrow_fire_goal',
      family: 'neighbor_borrow_fire',
      label: '僵尸借火目标',
      severity: 'high',
      description: '正文或计划仍要求完成已炼化的借火邻居冲突。',
      evidence: '借火/主动开门迎敌',
      fix: '从任务书与正文删去该目标。',
      directive: '修订：删除借火邻居/主动开门迎敌回放，不重演已炼化冲突。',
    })
  }

  return findings.slice(0, 4)
}

export function buildLiveChapterContract(input: {
  chapter?: any
  previousChapters?: any[]
  previousChapter?: any
  closedBeats?: ClosedBeatRecord[]
} = {}): LiveChapterContract {
  const chapter = input.chapter || {}
  const previousChapters = asArray(input.previousChapters)
  if (input.previousChapter) previousChapters.push(input.previousChapter)
  // Closed canon from previous chapters only for plan health of "current seed".
  // Current prose may still contain zombie residuals to be revised, but should not
  // re-open already closed families.
  const closedFromHistory = input.closedBeats?.length
    ? input.closedBeats
    : collectClosedBeatFamiliesFromChapters(previousChapters.filter(Boolean))
  const closed = closedFromHistory

  const rawGoal = compact(chapter?.chapter_goal || chapter?.chapterGoal || chapter?.goal || chapter?.raw_payload?.pre_draft_brief?.chapter_goal || '', 500)
  const rawConflict = compact(chapter?.conflict || chapter?.raw_payload?.pre_draft_brief?.core_conflict || '', 400)
  const rawEnding = compact(chapter?.ending_hook || chapter?.endingHook || '', 400)
  const rawSummary = compact(chapter?.chapter_summary || chapter?.chapterSummary || '', 400)

  const blocked: LiveChapterContract['closed_blocked'] = []
  for (const beat of closed) {
    const def = familyDef(beat.family)
    if (!def) continue
    for (const snippet of [rawGoal, rawConflict, rawSummary, rawEnding]) {
      if (snippet && (textHitsFamilyGoal(def, snippet) || isZombieResidualHook(snippet, [beat]))) {
        blocked.push({
          family: beat.family,
          label: beat.label,
          reason: `已在第${beat.closed_at_chapter || '?'}章关闭，不得再作为本章验收目标`,
          snippet: compact(snippet, 120),
        })
        break
      }
    }
  }

  const zombieResiduals = uniqueTexts([rawGoal, rawConflict, rawSummary, rawEnding]
    .filter(item => isZombieResidualHook(item, closed)), 6)
  for (const snippet of zombieResiduals) {
    if (blocked.some(item => item.snippet === compact(snippet, 120))) continue
    blocked.push({
      family: 'zombie_residual',
      label: '僵尸残留钩子',
      reason: '沿用已关闭压力的改写说法（清场倒计时/匿名敲门等），不得再验收',
      snippet: compact(snippet, 120),
    })
  }

  let liveGoalText = stripClausesMatchingClosed(rawGoal, closed)
  let liveConflict = stripClausesMatchingClosed(rawConflict, closed)
  let liveEnding = stripClausesMatchingClosed(rawEnding, closed)
  const currentProse = chapterTextOf(chapter)

  const isActionableGoalClause = (item: string) => {
    const text = compact(item, 160)
    if (text.length < 6) return false
    if (isZombieResidualHook(text, closed) || textDemandsClosedBeat(text, closed)) return false
    if (/^本章兑现：|^章末未解：|^章末落在：|^推进|^承接上一章|^以.+为下一章主驱动/.test(text)) return text.length >= 8
    if (/\/|线$|压力$|冲突$|对峙$|推进$|压迫$|核心$|已兑现$|已打爆$|去向$/.test(text) && text.length <= 36) return true
    if (text.length < 8) return false
    // Drop raw narrative prose mistaken as task-book goals (common in distant outline seeds).
    if (/深吸一口气|猛地握拳|伸出右手|一把抓住|淡淡说道|膝撞|锈迹斑斑的大门|五指猛地一抓|吓得尿裤子/.test(text)) return false
    if (text.length > 42 && !/推进|对峙|承接|本章|通行证|居委会|电梯|禁止|主驱动|兑现|优先|冲突|钩子/.test(text)) return false
    if (/^的|那|这|在|间|座|面上|哲那|连|刻已/.test(text) && text.length < 36) return false
    if (/超级感官|变得更加|仿佛带着|更加急促|能量波动并无异常|按照小区管理条例/.test(text) && !/推进|对峙|反制|解决|通行证|1号楼/.test(text)) return false
    if (/章末留下|十点邻居敲门借火|主动开门迎敌/.test(text)) return false
    if (/，\s*。|。\s*，/.test(text)) return false
    // Drop raw prose excerpts mistaken as goals.
    if (/[“"][^“"]{8,}[”']/.test(text) && /笑|惨叫|扔向|微微仰头|大喊|主任|假的终究/.test(text)) return false
    if (/说|道|喊|问/.test(text) && text.length < 24) return false
    return true
  }

  const seedLooksLikeProseNarration = Boolean(
    liveGoalText
    && (
      liveGoalText.length > 48
      || /深吸一口气|猛地握拳|伸出右手|一把抓住|淡淡说道|膝撞|锈迹斑斑|五指猛地/.test(liveGoalText)
    )
    && !/本章兑现|下一章主驱动|优先推进|承接上一章进度/.test(liveGoalText)
  )
  const seedPolluted = Boolean(
    blocked.length
    || zombieResiduals.length
    || !liveGoalText
    || !isActionableGoalClause(liveGoalText)
    || matchFamiliesInText(liveGoalText, closed).length
    || isZombieResidualHook(liveGoalText, closed)
    || seedLooksLikeProseNarration,
  )

  if (seedPolluted) {
    const previous = previousChapters.sort((a, b) => chapterNoOf(b) - chapterNoOf(a))[0]
    const forward = forwardGoalsFromPrevious(previous, closed).filter(isActionableGoalClause)
    if (currentProse) {
      // Written chapter: summarize delivered live arcs, not next-seed "主驱动" language.
      const delivered = uniqueTexts([
        ...proseDerivedDeliveredGoals(currentProse, closed),
        ...stripClausesMatchingClosed(rawGoal, closed).split(/[。；;]/).map(item => compact(item, 160)),
      ], 4).filter(isActionableGoalClause)
      const cleanedDelivered = delivered.map(item => String(item).replace(/^本章兑现：/, '')).filter(Boolean)
      liveGoalText = cleanedDelivered.length
        ? `本章兑现：${cleanedDelivered.join('；')}`
        : '本章已按正文兑现进度，禁止回放已关闭冲突'
      if (!liveConflict || !isActionableGoalClause(liveConflict)) {
        liveConflict = delivered.slice(0, 3).join('；') || liveGoalText
      }
      if (!liveEnding || isZombieResidualHook(liveEnding, closed) || textDemandsClosedBeat(liveEnding, closed) || !isActionableGoalClause(liveEnding)) {
        liveEnding = delivered.slice(-1)[0]
          || (/1号楼|通行证/.test(currentProse) ? '章末落在：1号楼通行证/入口推进' : '')
          || liveGoalText
      }
    } else {
      // Walk back to the nearest written previous chapter for forward pressure.
      const previousWritten = previousChapters
        .slice()
        .sort((a, b) => chapterNoOf(b) - chapterNoOf(a))
        .find(item => String(item?.chapter_text || item?.chapterText || '').trim())
        || previous
      const forwardFromWritten = forwardGoalsFromPrevious(previousWritten, closed).filter(isActionableGoalClause)
      const proseForward = uniqueTexts([
        ...proseDerivedForwardGoals(String(previousWritten?.chapter_text || previousWritten?.chapterText || ''), closed),
        ...forwardFromWritten,
        ...forward,
      ], 4).filter(isActionableGoalClause)
      liveGoalText = proseForward.join('。')
        || '承接上一章真正未解决压力继续推进，禁止回放已关闭冲突与僵尸钩子'
      if (!liveConflict || !isActionableGoalClause(liveConflict) || /承接上一章进度，$/.test(liveConflict)) {
        liveConflict = uniqueTexts(proseForward, 3).join('；') || liveGoalText
      }
      if (!liveEnding || isZombieResidualHook(liveEnding, closed) || textDemandsClosedBeat(liveEnding, closed) || !isActionableGoalClause(liveEnding)) {
        liveEnding = proseForward[0] || liveGoalText
      }
    }
  }

  liveConflict = stripClausesMatchingClosed(liveConflict, closed) || liveGoalText
  liveEnding = stripClausesMatchingClosed(liveEnding, closed) || liveEnding

  const liveGoals = uniqueTexts(
    liveGoalText.split(/[。；;]/).map(item => compact(item, 160).replace(/^推进/, '').replace(/^本章兑现：/, '')).filter(isActionableGoalClause),
    6,
  ).map((item, idx) => (currentProse && idx === 0 && !/^本章兑现：/.test(item) ? `本章兑现：${item}` : item))
  const acceptance_goals = liveGoals.filter(goal => !textDemandsClosedBeat(goal, closed) && !isZombieResidualHook(goal, closed))

  const forbidden_replays = uniqueTexts([
    ...closed.map(item => `不要回放已关闭冲突：${item.label}`),
    ...closed.flatMap(item => item.evidence.map(ev => `已兑现：${ev}`)),
    isFamilyClosed(closed, 'property_compliance') ? '不要再写物业第一波清场倒计时未解决' : '',
    isFamilyClosed(closed, 'neighbor_borrow_fire') ? '不要再写匿名404敲门逼回去开门' : '',
  ], 14)

  let plan_health: LiveChapterContract['plan_health'] = 'aligned'
  if (blocked.length || zombieResiduals.length) plan_health = 'dead_goal_pollution'
  else if (!acceptance_goals.length) plan_health = 'missing_live_goal'
  else if (/十点邻居敲门借火|主动开门迎敌|清场倒计时|反制邻居并炼化/.test(rawGoal)
    && !/十点邻居敲门借火|主动开门迎敌|清场倒计时/.test(liveGoalText)) {
    plan_health = 'stale_seed'
  }

  return {
    version: 'live_chapter_contract_v1',
    plan_health,
    live_goals: acceptance_goals.length ? acceptance_goals : liveGoals,
    live_conflict: liveConflict,
    live_ending_hook: liveEnding,
    acceptance_goals: acceptance_goals.length ? acceptance_goals : liveGoals,
    closed_blocked: uniqueBlocked(blocked),
    forbidden_replays,
    zombie_residuals: zombieResiduals,
    raw_goal: rawGoal,
    raw_conflict: rawConflict,
  }
}

