/**
 * Reverse-sync chapter task-book / seed fields from accepted prose.
 * Used after structural revision or prose store so plan stops fighting delivered text.
 */
import {
  detectPlanOverlap,
  resolveChapterProgressLedger,
  splitPlanBeats,
  type ChapterProgressLedger,
} from './chapter-progress-ledger'
import {
  collectClosedBeatFamiliesFromChapters,
  isZombieResidualHook,
  sanitizeHookList,
  textDemandsClosedBeat,
} from './closed-beat-canon'

export function compactText(value: any, limit = 240) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

export function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

function uniqueTexts(values: any, limit = 12) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of asArray(values)) {
    const text = compactText(raw, 200)
    if (!text || text.length < 4) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
    if (out.length >= limit) break
  }
  return out
}

function chapterTextOf(chapter: any) {
  return String(chapter?.chapter_text || chapter?.chapterText || '').trim()
}

function paragraphs(text: string) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map(item => item.trim())
    .filter(Boolean)
}

function isAuthorialRhetoricalParagraph(text: string) {
  const value = compactText(text, 400)
  if (!value) return false
  // Pure or dominant end-of-chapter author questions / reader-facing set-ups.
  const questionMarks = (value.match(/[？?]/g) || []).length
  if (questionMarks >= 2 && value.length <= 180) return true
  if (questionMarks >= 1 && /到底是什么|该如何面对|他该如何|读者|下一章|究竟会/.test(value) && value.length <= 220) return true
  if (/^[^。！]{0,40}[？?][^。！]{0,80}[？?]/.test(value) && !/说|道|问道|喊道/.test(value)) return true
  return false
}

/** Detect jarring authorial rhetorical ending that revision should clean. */
export function detectAuthorialEndingBreak(chapterText: string) {
  const paras = paragraphs(chapterText)
  if (!paras.length) return null
  const last = paras[paras.length - 1] || ''
  const prev = paras[paras.length - 2] || ''
  const hit = [last, prev].find(item => isAuthorialRhetoricalParagraph(item))
  if (!hit) return null
  return {
    key: 'authorial_ending_break',
    severity: 'high' as const,
    label: '章末跳戏设问',
    description: '章末出现作者旁白式连续设问，跳出角色场面，削弱追读沉浸。',
    directive: '删掉或改写章末作者设问旁白，把钩子留在可见场面、动作、感官或角色极短判断里，不要直接问“里面是什么/他该怎么办”。',
    evidence: compactText(hit, 160),
  }
}


function countRegexHits(text: string, re: RegExp) {
  if (!text) return 0
  const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`
  const global = new RegExp(re.source, flags)
  return [...String(text).matchAll(global)].length
}

export function isCleanPlanPhrase(value: any, options: { allowLabel?: boolean } = {}) {
  const text = compactText(value, 200)
  if (!text) return false
  // Stable arc labels are always acceptable.
  if (options.allowLabel !== false && /\/|线$|压力$|冲突$|对峙$|推进$|压迫$|核心$/.test(text) && text.length <= 24) {
    return !/章末留下|禁止回放/.test(text)
  }
  if (text.length < 8 || text.length > 56) return false
  if (isAuthorialRhetoricalParagraph(text)) return false
  if (/^[“”"『』]/.test(text)) return false
  if (/[“”].{8,}[“”]/.test(text) && /说|道|喊|问|惨叫|笑/.test(text)) return false
  if (/分析员|弹幕|系统提示|直播间|按照小区管理条例|手心里全是冷汗|超级感官|能量波动并无异常/.test(text)) return false
  // Mid-sentence / broken punctuation shards.
  if (/^[的了在把被从与和及间座面上哲那这那]/.test(text)) return false
  if (/，\s*。|。\s*，|：$|：$/.test(text)) return false
  if (/，$/.test(text) && text.length < 24) return false
  if ((text.match(/，/g) || []).length >= 2 && text.length < 28) return false
  if (/说|道|喊|问/.test(text) && text.length < 22) return false
  if (/到底是什么|该如何面对|他该如何|究竟会/.test(text)) return false
  return true
}

export function normalizePlanPunctuation(value: any, limit = 180) {
  return compactText(String(value ?? '')
    .replace(/，\s*。/g, '。')
    .replace(/。\s*，/g, '。')
    .replace(/[，,]{2,}/g, '，')
    .replace(/[。.]{2,}/g, '。')
    .replace(/\s+/g, ' '), limit)
}

function extractEndingHookFromProse(chapterText: string, closedFamilies: any[] = []) {
  const events = extractEventBeatsFromProse(chapterText, closedFamilies)
  const lateLabel = events.find(item => /血肉王座|1号楼内部|权柄|天选|通行证|1号楼|居委会|电梯|物业|王奶奶|厨房|邻居/.test(item))
  const paras = paragraphs(chapterText).filter(item => !isAuthorialRhetoricalParagraph(item))
  const pool = paras.length ? paras : paragraphs(chapterText)
  const tail = pool.slice(-2).join('')
  const sentences = splitPlanBeats(tail)
    .map(item => normalizePlanPunctuation(item, 120))
    .filter(item => isCleanPlanPhrase(item, { allowLabel: false }) || (item.length >= 10 && item.length <= 48 && !/^[“”"]/.test(item)))
  const concrete = sentences.filter(item => !/[？?]\s*$/.test(item))
  const picked = concrete.slice(-1)[0] || ''
  // Prefer a clean concrete tail; otherwise fall back to the dominant late arc label.
  if (picked && isCleanPlanPhrase(picked, { allowLabel: false })) {
    return normalizePlanPunctuation(picked, 160)
  }
  if (lateLabel) return compactText(`章末落在：${lateLabel}`, 160)
  return normalizePlanPunctuation(concrete.slice(-2).join('。') || tail, 160)
}

function extractEventBeatsFromProse(chapterText: string, closedFamilies: any[] = []) {
  const text = String(chapterText || '')
  if (!text.trim()) return [] as string[]
  const head = text.slice(0, Math.floor(text.length * 0.35))
  const mid = text.slice(Math.floor(text.length * 0.25), Math.floor(text.length * 0.75))
  const tail = text.slice(Math.floor(text.length * 0.45))
  const patterns: Array<{ re: RegExp; label: string; early?: boolean }> = [
    { re: /青铜巨门|血肉王座|门内大堂|干瘪尸体|吊挂在半空/, label: '1号楼内部/血肉王座' },
    { re: /阿奇姆|同行天选|拎起.{0,6}天选|带着.{0,6}天选/, label: '同行天选者线' },
    { re: /权柄碎片|世界权柄|黑色石棺|黑色蚕茧/, label: '权柄碎片对峙' },
    { re: /通行证|1号楼|大业主/, label: '1号楼通行证/入口推进' },
    { re: /顾主任|居委会|业主委员会|业主代表证|抹杀规则|地下负二|会议室/, label: '居委会/地下对峙' },
    { re: /电梯|无脸|未定义区域|负一|负二层/, label: '电梯/未定义区域压力' },
    { re: /垃圾分类|红色垃圾桶|有害垃圾|无害化/, label: '垃圾分类/规则清理' },
    { re: /物业|合规执法|清场|物理合规|生命税/, label: '物业合规冲突' },
    { re: /王奶奶|借酱油|冰箱|冷冻室/, label: '王奶奶线' },
    { re: /山本|八咫镜|电视|平行/, label: '电视平行线' },
    { re: /符纸|黑火|婴儿啼哭|巨婴|厨房木门|毁灭级|规则核心具现|邻里借贷规则核心/, label: '厨房实体/规则核心' },
    { re: /咚|敲门|十点|邻居|借火|借东西|邻里借贷/, label: '邻居敲门/借贷线', early: true },
    { re: /妈妈|空碗|毒汤|家庭公约|倒汤|耳光|利爪|掌权|热汤|肉汤/, label: '餐桌规则压迫', early: true },
  ]
  const scored = patterns.map((item) => {
    const full = countRegexHits(text, item.re)
    const headHits = countRegexHits(head, item.re)
    const midHits = countRegexHits(mid, item.re)
    const tailHits = countRegexHits(tail, item.re)
    // Early beats weight head/mid more; late beats weight tail more.
    const score = item.early
      ? full + headHits * 3 + midHits * 2 + tailHits
      : full + tailHits * 3 + midHits * 1.5 + headHits * 0.5
    return {
      ...item,
      score,
      tailHits,
      headHits,
      full,
    }
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || b.tailHits - a.tailHits)

  // If history already closed a family, residual mentions must not dominate this chapter labels.
  const closedLabels = new Set(
    (closedFamilies || []).map((item: any) => String(item?.family || item?.label || '')),
  )
  const filteredScored = scored.filter((item) => {
    if (item.label.includes('邻居') && (closedLabels.has('neighbor_borrow_fire') || closedLabels.has('十点借火邻居冲突'))) {
      return item.score >= 12 && item.tailHits >= 3 // true reopening only
    }
    if (item.label.includes('餐桌') && (closedLabels.has('dining_rule_force') || closedLabels.has('餐桌/毒汤规则压迫与反制'))) {
      return item.score >= 12 && item.tailHits >= 3
    }
    if (item.label.includes('厨房') && (closedLabels.has('kitchen_entity_core') || closedLabels.has('厨房巨婴/规则核心'))) {
      return item.score >= 10 && item.tailHits >= 2
    }
    if (item.label.includes('物业') && (closedLabels.has('property_compliance'))) {
      // allow delivered smash mentions; keep only if still strong
      return item.score >= 8
    }
    return true
  })
  const effective = filteredScored.length ? filteredScored : scored

  if (!effective.length) return [] as string[]

  const top = effective[0]
  const lateDominant = !top.early && top.score >= 3
  const earlyDominant = Boolean(top.early && top.headHits + top.full >= 3)
  const picked = effective.filter((item) => {
    if (earlyDominant && !item.early && item.tailHits < 2 && item.score < top.score * 0.8) {
      // dining/neighbor still dominant; only keep strong late spoilers.
      return item.score >= top.score * 0.9
    }
    if (!lateDominant) return true
    if (!item.early) return true
    // keep early only if still strong in tail (true ongoing pressure)
    return item.tailHits >= 2 && item.score >= top.score * 0.6
  }).slice(0, 4)

  // Labels only — never inject raw dialogue/prose shards into task-book fields.
  return uniqueTexts(picked.map(item => item.label), 5)
}

function extractOpeningBeat(chapterText: string, closedFamilies: any[] = []) {
  const events = extractEventBeatsFromProse(chapterText, closedFamilies)
  const preferred = events.find(item => !/餐桌|邻居敲门|借贷线/.test(item)) || events[0]
  if (preferred) return preferred
  return '本章冲突推进'
}

function extractConflictFromProse(chapterText: string, _ledger: ChapterProgressLedger, closedFamilies: any[] = []) {
  const events = extractEventBeatsFromProse(chapterText, closedFamilies)
  const core = uniqueTexts(events.slice(0, 3).filter(item => isCleanPlanPhrase(item)), 3)
  if (core.length) return compactText(core.join('；'), 180)
  return '本章核心冲突推进'
}

function buildGoalFromProse(chapterText: string, ledger: ChapterProgressLedger, closedFamilies: any[] = []) {
  const closed = closedFamilies.length
    ? closedFamilies
    : collectClosedBeatFamiliesFromChapters([{ chapter_text: chapterText, chapter_no: 0 }])
  const events = extractEventBeatsFromProse(chapterText, closed).filter(item => isCleanPlanPhrase(item))
  const opening = events[0] || extractOpeningBeat(chapterText, closed)
  const body = events.slice(1, 4)
  // Forward hooks: labels only — never raw prose shards.
  const unresolved = sanitizeHookList(
    ledger.unresolved_next.filter(item => isCleanPlanPhrase(item, { allowLabel: true }) && !isAuthorialRhetoricalParagraph(item)),
    closed,
    3,
  ).filter(item => /\/|线$|压力$|冲突$|对峙$|推进$|压迫$|核心$|倒计时$|去向$|未解$|敲门$/.test(item))
  const dominant = events[0] || ''
  const forward = uniqueTexts([
    ...unresolved.filter(item => {
      if (isZombieResidualHook(item, closed) || textDemandsClosedBeat(item, closed)) return false
      if (/邻居敲门|借火|清场倒计时/.test(item) && !/邻居敲门|借火|清场/.test(dominant)) return false
      return true
    }),
    // only add a late event label if it is not already the opening
    ...events.slice(-1).filter(item => item !== opening),
  ], 2)
  const delivered = uniqueTexts([opening, ...body].map(item => String(item || '').replace(/^本章兑现：/, '')), 4)
  const pending = uniqueTexts(
    forward.filter(item => item && item !== opening && !body.includes(item)).map(item => String(item).replace(/^章末未解：/, '')),
    2,
  )
  const parts = [
    delivered.length ? `本章兑现：${delivered.join('；')}` : '',
    pending.length ? `章末未解：${pending.join('；')}` : '',
  ].filter(Boolean)
  return compactText(parts.join('。') || opening, 220)
}

function patchBlueprintFromProse(existing: any, input: {
  goal: string
  conflict: string
  endingHook: string
  opening: string
}) {
  const base = existing && typeof existing === 'object' ? { ...existing } : {}
  const outline = {
    ...(base.content_outline || base.contentOutline || {}),
    cause: input.opening,
    development: input.conflict,
    turn: input.conflict,
    climax: input.goal,
    ending: input.endingHook,
  }
  return {
    ...base,
    target_emotion: base.target_emotion || '承接已兑现进度，完成新冲突并留下章尾钩子。',
    opening_hook: input.opening,
    core_payoff: input.goal,
    content_outline: outline,
    contentOutline: outline,
    plot_lines: {
      ...(base.plot_lines || base.plotLines || {}),
      mainline: input.goal,
      event_line: input.conflict,
      logic_line: `${input.opening} -> ${input.conflict} -> ${input.endingHook}`,
    },
  }
}

export function detectChapterPlanProseMismatch(chapter: any = {}) {
  const text = chapterTextOf(chapter)
  const goal = compactText(chapter?.chapter_goal || chapter?.chapterGoal || chapter?.raw_payload?.chapter_goal || '')
  const summary = compactText(chapter?.chapter_summary || chapter?.chapterSummary || chapter?.summary || '')
  const conflict = compactText(chapter?.conflict || '')
  const endingHook = compactText(chapter?.ending_hook || chapter?.endingHook || '')
  const must = asArray(chapter?.must_advance || chapter?.raw_payload?.must_advance)
  if (!text) {
    return { mismatched: false, plan_stale: false, overlap_score: 0, overlapping_beats: [] as string[], reason: 'empty_prose' }
  }
  const ledger = resolveChapterProgressLedger({
    chapterText: text,
    endingHook,
    plannedGoal: goal,
    plannedSummary: summary,
    plannedConflict: conflict,
    plannedMustAdvance: must,
  })
  // Compare existing plan against delivered prose as if plan were "next seed" and prose were previous delivery.
  const inverse = detectPlanOverlap(ledger, {
    goal,
    summary,
    conflict,
    ending_hook: endingHook,
    must_advance: must,
  }, { previousChapterText: text })

  // Theme mismatch: plan stuck on earlier arc while prose moved on.
  const planBlob = `${goal} ${summary} ${conflict} ${endingHook} ${must.join(' ')}`
  const proseBeats = extractEventBeatsFromProse(text)
  const proseHasNeighbor = /敲门|邻居|借火|厨房|符纸|规则核心/.test(text)
  const planStillDining = /利爪|耳光|暴怒|膨胀|能好好说话|热汤淋头/.test(planBlob)
  const proseAvoidsDiningReplay = !/利爪抓在自己脖子|反手一记耳光|能好好说话了吗/.test(text.slice(0, 1500))
  const planStuckBorrowFire = /十点邻居敲门借火|主动开门迎敌|反制邻居并炼化/.test(planBlob)
  const proseMovedPastBorrowFire = proseBeats.some(item => /居委会|电梯|物业|王奶奶|1号楼|通行证|垃圾/.test(item))
  const planStuckCleanup = /清场倒计时|物业合规清场/.test(planBlob)
  const proseHasPassOrCommittee = /通行证|顾主任|1号楼|居委会/.test(text)
  const hardThemeMismatch = (
    (planStillDining && proseHasNeighbor && proseAvoidsDiningReplay)
    || (planStuckBorrowFire && proseMovedPastBorrowFire)
    || (planStuckCleanup && proseHasPassOrCommittee)
  )

  const authorialEnding = detectAuthorialEndingBreak(text)
  const mismatched = inverse.plan_stale || hardThemeMismatch || Boolean(authorialEnding)
  return {
    mismatched,
    plan_stale: inverse.plan_stale || hardThemeMismatch,
    overlap_score: inverse.overlap_score + (hardThemeMismatch ? 50 : 0),
    overlapping_beats: uniqueTexts([
      ...inverse.overlapping_beats,
      ...(hardThemeMismatch ? ['旧任务书仍要求回放餐桌对决，但正文已进入敲门/邻居/厨房线'] : []),
    ], 8),
    authorial_ending_break: authorialEnding,
    ledger,
    reason: hardThemeMismatch
      ? 'plan_theme_mismatch_prose'
      : inverse.plan_stale
        ? 'plan_beats_overlap_delivered_prose_poorly_or_stale'
        : authorialEnding
          ? 'authorial_ending_break'
          : 'aligned',
  }
}

export type RebuildChapterPlanFromProseResult = {
  rebuilt: boolean
  reason: string
  mismatch: ReturnType<typeof detectChapterPlanProseMismatch>
  chapter_patch: Record<string, any>
  plan_alignment: {
    version: 'chapter_plan_from_prose_v1'
    source: 'accepted_prose'
    rebuilt_at?: string
    reason: string
    authorial_ending_break?: any
  } | null
}

/** Rebuild current chapter task-book seeds from accepted prose. */
export function rebuildChapterPlanFromAcceptedProse(
  chapter: any = {},
  options: { force?: boolean; now?: string; source?: string; previousChapters?: any[] } = {},
): RebuildChapterPlanFromProseResult {
  const text = chapterTextOf(chapter)
  const mismatch = detectChapterPlanProseMismatch(chapter)
  if (!text) {
    return {
      rebuilt: false,
      reason: 'empty_prose',
      mismatch,
      chapter_patch: {},
      plan_alignment: null,
    }
  }
  if (!options.force && !mismatch.mismatched && !mismatch.plan_stale) {
    // Still refresh ledger snapshot even when aligned.
    const ledger = mismatch.ledger || resolveChapterProgressLedger({ chapterText: text })
    return {
      rebuilt: false,
      reason: 'already_aligned',
      mismatch,
      chapter_patch: {
        raw_payload: {
          ...(chapter?.raw_payload || {}),
          chapter_progress_ledger: ledger,
        },
      },
      plan_alignment: {
        version: 'chapter_plan_from_prose_v1',
        source: 'accepted_prose',
        reason: 'already_aligned',
      },
    }
  }

  // Rebuild ledger from prose only; never re-inject the stale dining task-book as planned beats.
  const historyClosed = collectClosedBeatFamiliesFromChapters([
    ...asArray(options.previousChapters),
    { chapter_text: text, chapter_no: Number(chapter?.chapter_no || 0) || 0 },
  ])
  const proseNativeEnding = extractEndingHookFromProse(text, historyClosed)
  const eventBeatsSeed = extractEventBeatsFromProse(text, historyClosed)
  const ledger = resolveChapterProgressLedger({
    chapterText: text,
    endingHook: proseNativeEnding,
    plannedGoal: '',
    plannedSummary: '',
    plannedConflict: '',
    plannedMustAdvance: eventBeatsSeed,
  })
  // Drop residual open hooks that history already closed.
  ledger.unresolved_next = sanitizeHookList(ledger.unresolved_next, historyClosed, 6)
    .filter(item => isCleanPlanPhrase(item))
  const opening = extractOpeningBeat(text, historyClosed)
  const goal = buildGoalFromProse(text, ledger, historyClosed)
  const conflict = extractConflictFromProse(text, ledger, historyClosed)
  const endingHook = extractEndingHookFromProse(text, historyClosed)
  const summary = compactText(goal, 220)
  const eventBeats = eventBeatsSeed
  const chapterClosed = historyClosed
  const must_advance = sanitizeHookList([
    ...eventBeats,
    ...ledger.delivered_beats.filter(item => isCleanPlanPhrase(item) && !isZombieResidualHook(item, chapterClosed)).slice(0, 4),
    ...ledger.unresolved_next.filter(item => isCleanPlanPhrase(item) && !isAuthorialRhetoricalParagraph(item)),
  ], chapterClosed, 8).filter(item => isCleanPlanPhrase(item))
  const forbidden_repeats = uniqueTexts([
    ...ledger.forbidden_replays,
    ...chapterClosed.map(item => `不要回放已关闭冲突：${item.label}`),
    ...(/倒汤|耳光|利爪|能好好说话/.test(text) ? [] : ['爸爸利爪/暴走冲突', '餐桌掌权', '倒汤反制', '耳光压制爸爸']),
    ...(/借火|邻里借贷|半死不活的“邻居”|炼化/.test(text) ? ['十点借火邻居回放', '主动开门迎敌旧目标'] : []),
    ...(/轰碎成虚无|合规执法棍|物理合规/.test(text) ? ['物业第一波清场倒计时回放'] : []),
  ], 12)
  const now = options.now || new Date().toISOString()
  const existingRaw = chapter?.raw_payload && typeof chapter.raw_payload === 'object' ? chapter.raw_payload : {}
  const existingBrief = existingRaw.pre_draft_brief && typeof existingRaw.pre_draft_brief === 'object'
    ? existingRaw.pre_draft_brief
    : {}
  const blueprint = patchBlueprintFromProse(
    existingBrief.chapter_blueprint || existingBrief.chapterBlueprint || existingRaw.chapter_blueprint,
    { goal, conflict, endingHook, opening },
  )
  const plan_alignment = {
    version: 'chapter_plan_from_prose_v1' as const,
    source: 'accepted_prose' as const,
    rebuilt_at: now,
    reason: mismatch.reason || 'force_rebuild',
    authorial_ending_break: mismatch.authorial_ending_break || null,
    trigger: options.source || 'accepted_prose',
  }
  const pre_draft_brief = {
    ...existingBrief,
    confirmed_at: null,
    confirmation_source: null,
    plan_stale: false,
    plan_aligned_to_prose: true,
    plan_source: 'accepted_prose',
    updated_at: now,
    chapter_goal: goal,
    goal,
    chapter_summary: summary,
    summary,
    reader_promise: compactText(`${goal}；${endingHook}`, 260),
    core_conflict: conflict,
    conflict,
    ending_hook: endingHook,
    must_advance,
    forbidden_repeats,
    chapter_blueprint: blueprint,
    chapterBlueprint: blueprint,
    progress_resync: {
      version: 'chapter_progress_resync_v1',
      plan_stale: false,
      reason: '已用已接受正文回写本章任务书，旧种子不再作为验收标准',
      source: 'accepted_prose',
      rebuilt_at: now,
    },
    plan_alignment,
  }

  const chapter_patch = {
    chapter_goal: goal,
    chapter_summary: summary,
    conflict,
    ending_hook: endingHook,
    raw_payload: {
      ...existingRaw,
      must_advance,
      forbidden_repeats,
      plan_stale: false,
      plan_aligned_to_prose: true,
      plan_source: 'accepted_prose',
      chapter_progress_ledger: ledger,
      chapter_goal: goal,
      chapter_summary: summary,
      summary,
      conflict,
      ending_hook: endingHook,
      pre_draft_brief,
      plan_alignment,
      // Invalidate frozen scene cards that still encode old dining seeds.
      scene_cards_source: existingRaw.scene_cards_source || null,
      plan_seed_before_prose_align: {
        chapter_goal: chapter?.chapter_goal || null,
        chapter_summary: chapter?.chapter_summary || null,
        conflict: chapter?.conflict || null,
        ending_hook: chapter?.ending_hook || null,
      },
    },
  }

  return {
    rebuilt: true,
    reason: mismatch.reason || 'rebuilt',
    mismatch,
    chapter_patch,
    plan_alignment,
  }
}

/**
 * After current chapter prose changes:
 * 1) rebuild current task-book from prose
 * 2) resync immediate following chapter seeds from new ledger
 */
/**
 * After current chapter prose changes:
 * 1) rebuild current task-book from prose (true progress)
 * 2) resync following seeds from new ledger
 * 3) for following written chapters, strip dead/zombie goals against cumulative closed canon
 * 4) keep unwritten following chapters on forward live pressure only
 */
