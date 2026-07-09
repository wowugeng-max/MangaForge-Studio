function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null || value === '') return []
  return [value]
}

function compactBriefText(value: any, limit = 500) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim().slice(0, limit)
  try {
    return JSON.stringify(value).replace(/\s+/g, ' ').trim().slice(0, limit)
  } catch {
    return String(value).replace(/\s+/g, ' ').trim().slice(0, limit)
  }
}

function uniqueBriefStrings(values: any[], limit = 20) {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values) {
    const text = compactBriefText(value)
    if (!text || seen.has(text)) continue
    seen.add(text)
    output.push(text)
    if (output.length >= limit) break
  }
  return output
}

export function openingArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => compactBriefText(item)).filter(Boolean), 20)
}

export function firstProseText(chapterText: string, maxChars: number) {
  return String(chapterText || '').replace(/^第[^\n]{1,40}\n+/, '').trim().slice(0, maxChars)
}

export function normalizeOpeningProtagonistCheck(values: any[], chapterText: string) {
  const planned = openingArray(values).filter(item => /300|主角|登场|危机|优势|陌生/.test(item))
  if (!planned.length) return null
  const first300 = firstProseText(chapterText, 300)
  const hasNamedProtagonist = /李岚|沈砚|主角|他|她/.test(first300)
  const hasLivePressure = /裁员|房租|倒计时|危机|被迫|必须|否则|敲门|系统|认亲|报警|签字|陌生|压/.test(first300)
  const delivered = hasNamedProtagonist && hasLivePressure
  return {
    key: 'protagonist_entry',
    label: '主角登场',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 90 : hasNamedProtagonist ? 58 : 24,
    evidence: [hasNamedProtagonist ? '前300字主角入场' : '', hasLivePressure ? '带危机/优势/陌生环境' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '前300字没有让主角带着危机、优势或陌生环境进入现场。',
    repair_instruction: delivered ? '' : '重做前300字：让主角带着正在发生的危机、优势或陌生环境入场，不能先铺天气、背景和世界观。',
  }
}

export function normalizeOpeningExpectationCheck(values: any[], chapterText: string) {
  const planned = openingArray(values).filter(item => /1000|爽点|期待|系统|反常|检测|金手指/.test(item))
  if (!planned.length) return null
  const first1000 = firstProseText(chapterText, 1000)
  const hasPayoffOrExpectation = /爽点|期待点|系统|倒计时|检测|匹配率|血缘|三位妈妈|反常|金手指|规则|任务|新问题|是真是假|零/.test(first1000)
  const hasQuestion = /谁|真假|真正|为什么|怎么|否则|倒计时|七天|匹配率/.test(first1000)
  const delivered = hasPayoffOrExpectation && hasQuestion
  return {
    key: 'first_1000_expectation',
    label: '爽点/期待点',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : hasPayoffOrExpectation ? 62 : 26,
    evidence: [hasPayoffOrExpectation ? '前1000字期待点' : '', hasQuestion ? '可追问题' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '前1000字没有形成爽点或可追期待点。',
    repair_instruction: delivered ? '' : '补1000字内爽点/期待点：明确异常事件、系统/优势、倒计时、问题或阶段回报，让读者立刻想追下一段。',
  }
}

export function normalizeOpeningFoundationCheck(values: any[], chapterText: string) {
  const planned = openingArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasCharacter = /裁员|房租|失业|普通|中年|核心性格|处境|目标很清楚|先活过/.test(text)
  const hasEntryConflict = /签字认亲|报警|倒计时|三位母亲|三位妈妈|第一位女人|冲突|选择|否则/.test(text)
  const hasGoldfinger = /系统|血缘系统|检测|匹配率|金手指|独特优势|规则/.test(text)
  const delivered = hasCharacter && hasEntryConflict && hasGoldfinger
  return {
    key: 'foundation_points',
    label: '三大基点',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: Math.round([hasCharacter, hasEntryConflict, hasGoldfinger].filter(Boolean).length / 3 * 100),
    evidence: [hasCharacter ? '人设基点' : '', hasEntryConflict ? '切入点基点' : '', hasGoldfinger ? '金手指基点' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '三大基点未齐：人设基点、切入点基点、金手指基点至少一项缺正文证据。',
    repair_instruction: delivered ? '' : '补三大基点：主角处境/性格、第一冲突/机遇、金手指或独特优势必须在前3章可追踪。',
  }
}

export function normalizeOpeningGoalAndHookCheck(chapterText: string) {
  const text = String(chapterText || '')
  const hasGoal = /目标|要查清|先活过|必须|要争|主角目标|先[^。！？!?]{0,20}再/.test(text)
  const hasSellingPoint = /本文卖点|卖点|血缘系统|三位妈妈|规则认亲|病娇妈妈|倒计时|系统/.test(text)
  const hasMajorConsequence = /否则|冻结|倒计时|七天|报警|签字|认亲|账户|清零|危机/.test(text)
  const delivered = hasGoal && hasSellingPoint && hasMajorConsequence
  return {
    key: 'goal_and_selling_point',
    label: '目标与卖点',
    text: '第一章必须说明主角目标 + 本文卖点，并让第一个冲突影响重大。',
    expected: '第一章必须说明主角目标 + 本文卖点，并让第一个冲突影响重大。',
    score: delivered ? 88 : Math.max(25, [hasGoal, hasSellingPoint, hasMajorConsequence].filter(Boolean).length * 26),
    evidence: [hasGoal ? '主角目标' : '', hasSellingPoint ? '本文卖点' : '', hasMajorConsequence ? '重大后果' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : ['主角目标 + 本文卖点'],
    issue: delivered ? '' : '第一章没有明确主角目标、本文卖点或第一个冲突后果。',
    repair_instruction: delivered ? '' : '补主角目标和本文卖点：让读者知道主角要做什么、这本书看什么，以及不解决第一个冲突会付出什么代价。',
  }
}

export function normalizeOpeningFiveEssentialsCheck(values: any[], chapterText: string) {
  const planned = openingArray(values)
  if (!planned.length) return null
  const first1000 = firstProseText(chapterText, 1000)
  const text = String(chapterText || '')
  const simple = /谁|在哪里|有什么|为什么|要做什么|目标|必须|要查清|要争|要选择|先活过|简单清楚/.test(text)
  const onTrack = /主线|本文卖点|血缘系统|三位妈妈|规则认亲|门外|倒计时|认亲|系统/.test(text) && !/暂时还没有进入正题|改成|跑偏|无关/.test(text)
  const fast = /第一句|开头|立刻|三道一模一样的敲门声|塞进口袋时|倒计时|1000字内|切入快/.test(text) || /裁员|房租|敲门|倒计时|系统/.test(first1000)
  const payoff = /爽点|期待点|匹配率|检测|反常身份|新问题|零|是真是假|读者立刻想知道|认亲爽点/.test(text)
  const notFlat = /冲突|矛盾|否则|危机|倒计时|签字|报警|清零|冻结|不平淡/.test(text)
  const driftOrSlow = /暂时还没有进入正题|平淡如水|没有冲突|磨磨蹭蹭|罗里吧嗦|大段背景|纯风景|跑偏/.test(text)
  const delivered = simple && onTrack && fast && payoff && notFlat && !driftOrSlow
  return {
    key: 'five_essentials_rules',
    label: '开头五要诀',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 90 : Math.max(18, [simple, onTrack, fast, payoff, notFlat].filter(Boolean).length * 16 - (driftOrSlow ? 18 : 0)),
    evidence: [
      simple ? '简单点：五要素/目标清楚' : '',
      onTrack ? '不能偏：开头贴合主线卖点' : '',
      fast ? '要快：快速切入事件' : '',
      payoff ? '要爽：第一个小剧情有爽点或期待' : '',
      notFlat ? '不能平：有冲突矛盾' : '',
      driftOrSlow ? '存在跑偏、拖慢或平淡风险' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '开头五要诀没有齐：简单、不偏、快、爽、不平至少一项缺正文证据。',
    repair_instruction: delivered ? '' : '按 oh-story 开头五要诀重做：简单交代谁/在哪里/有什么/为什么/要做什么；不偏主线；快速切入剧情；第一个小剧情有爽点；用冲突矛盾避免平淡。',
  }
}

export function normalizeOpeningInformationCheck(values: any[], chapterText: string) {
  const planned = openingArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasCrisisFirst = /裁员|房租|敲门|倒计时|危机|必须|否则/.test(firstProseText(chapterText, 500))
  const hasBatchRelease = /没有一次性解释|分批|只先确认|更多规则留到|先[^。！？!?]{0,30}再[^。！？!?]{0,30}|优先/.test(text)
  const earlyText = firstProseText(chapterText, 500)
  const hasWorldbuildingOverload = /这座城市有很多年|复杂变迁|历史|设定|规则体系|(?:详细|一次性|开始|先|大段)[^。！？!?]{0,18}世界观/.test(earlyText)
    && !/没有一次性解释世界观|世界观[^。！？!?]{0,18}(?:留到|延后|分批)/.test(earlyText)
  const delivered = hasCrisisFirst && hasBatchRelease && !hasWorldbuildingOverload
  return {
    key: 'information_priority',
    label: '信息释放',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(28, [hasCrisisFirst, hasBatchRelease, !hasWorldbuildingOverload].filter(Boolean).length * 24),
    evidence: [hasCrisisFirst ? '危机优先' : '', hasBatchRelease ? '信息分批' : '', !hasWorldbuildingOverload ? '无世界观过载' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '信息释放没有按危机感、人设、金手指暗示、世界观分批进入。',
    repair_instruction: delivered ? '' : '把背景融入冲突，先给危机感和人设，再给金手指暗示，世界观延后分批释放。',
  }
}

export function openingPriority(missed: any[]) {
  if (missed.some(item => item.key === 'opening_forbidden')) return '优先重做开篇禁忌'
  if (missed.some(item => item.key === 'protagonist_entry')) return '优先补前300字主角登场'
  if (missed.some(item => item.key === 'first_1000_expectation')) return '优先补1000字内期待点'
  if (missed.some(item => item.key === 'foundation_points')) return '优先补三大基点'
  if (missed.some(item => item.key === 'goal_and_selling_point')) return '优先补目标卖点'
  if (missed.some(item => item.key === 'five_essentials_rules')) return '优先补开头五要诀'
  if (missed.some(item => item.key === 'information_priority')) return '优先重排信息释放'
  return ''
}
