import { countProseChars } from './word-target'

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

function compactBriefText(value: any, fallback: any = '') {
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

function dialogueArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => compactBriefText(item)).filter(Boolean), 20)
}

function quotedDialogueLines(chapterText: string) {
  return String(chapterText || '')
    .split(/\r?\n/)
    .map(line => compactBriefText(line))
    .filter(line => /[“「"][^”」"]{1,160}[”」"]/.test(line))
}

export function normalizeDialogueGoalCheck(goals: any[], keyLines: any[], relationshipMoves: any[], chapterText: string) {
  const planned = dialogueArray(goals, keyLines, relationshipMoves)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasGoalEvidence = /说漏|证据来源|账本在我手里|怎么知道|封条|事实|证明|核对|逼出|露馅/.test(text)
  const hasRelationshipMove = /旁观者|中立|愿意作证|退开半步|站出来|倒向|低声议论停了|作证/.test(text)
  const hasKeyLine = /你怎么知道账本在我手里|怎么知道[^。！？!?]{0,20}账本/.test(text)
  const delivered = hasGoalEvidence && (hasRelationshipMove || hasKeyLine)
  return {
    key: 'dialogue_goals',
    label: '对白目标',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(24, [hasGoalEvidence, hasRelationshipMove, hasKeyLine].filter(Boolean).length * 28),
    evidence: [hasGoalEvidence ? '信息差/证据推进' : '', hasRelationshipMove ? '关系/旁观者变化' : '', hasKeyLine ? '关键台词' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '对白没有完成计划目标：没有逼出信息、改变关系、推进证据或落下关键台词。',
    repair_instruction: delivered ? '' : '补对白目标：每段对话必须让信息差、证据、关系或期待往前推一步，关键台词要落到正文。',
  }
}

export function normalizeDialoguePowerCheck(values: any[], chapterText: string) {
  const planned = dialogueArray(values)
  if (!planned.length) return null
  const lines = quotedDialogueLines(chapterText)
  const hasLongPressure = lines.some(line => countProseChars(line) >= 28 && /李玄|你若|周家|长老|说清楚|别拿|泼脏水|规则|设定/.test(line))
  const hasShortReversal = lines.some(line => countProseChars(line) <= 18 && /你怎么知道|说漏了|是真的|随意|闭嘴|够了/.test(line))
  const hasPowerShift = /顿住|沉默|退开半步|低声议论停了|脸色|站了起来|不敢/.test(chapterText)
  const delivered = hasLongPressure && hasShortReversal && hasPowerShift
  return {
    key: 'power_length_rules',
    label: '权力博弈',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(24, [hasLongPressure, hasShortReversal, hasPowerShift].filter(Boolean).length * 28),
    evidence: [hasLongPressure ? '被压制方长句' : '', hasShortReversal ? '掌控方短句' : '', hasPowerShift ? '权力易主反应' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '对白没有体现“对话长度 = 权力地位”，缺少长句压迫、短句反转或权力易主反应。',
    repair_instruction: delivered ? '' : '按压制/反转模式改写：被压制方用长句辩解或施压，掌控方用短句亮底牌，随后给沉默、退让或旁观者变化。',
  }
}

export function normalizeDialogueSubtextCheck(values: any[], chapterText: string) {
  const planned = dialogueArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const exposesRealPurpose = /真实目的就是|我的目的就是|我就是想|我没有别的借口|我现在要完整解释|我要完整解释给你听/.test(text)
  const hasSubtextOrProbe = /你怎么知道|凭什么|昨夜谁|别拿|说漏|袖口|墨点|停顿|顿住|借口|试探|防御/.test(text)
  const hasAgendaCollision = /身份压人|当众|长老席|不能直接翻脸|泼脏水|证据来源|账本在我手里|封条/.test(text)
  const delivered = !exposesRealPurpose && hasSubtextOrProbe && hasAgendaCollision
  return {
    key: 'subtext_agenda_rules',
    label: '潜台词与议程',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(16, [!exposesRealPurpose, hasSubtextOrProbe, hasAgendaCollision].filter(Boolean).length * 28),
    evidence: delivered ? ['借口/试探/防御', '议程碰撞'] : (exposesRealPurpose ? ['真实目的直说'] : []),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '对白缺少潜台词和议程，或角色把真实目的直接讲出来。',
    repair_instruction: delivered ? '' : '把真实目的藏进借口、试探、回避、身份压力或动作反应；让每个角色带着自己的议程进入对话。',
  }
}

export function normalizeDialogueDriveCheck(values: any[], chapterText: string) {
  const planned = dialogueArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasPlotAdvance = /说漏|证据来源|账本在我手里|怎么知道|封条|事实|证明|核对|逼出|露馅|今晨开的|袖口|墨点|账本/.test(text)
  const hasExpectation = /怎么知道|谁把|昨夜|证据来源|名字|下一步|会不会|悬念|线索|背面|第三个证人/.test(text)
  const hasCharacter = /别拿|泼脏水|长老席|说漏了|只补了一句|短句|冷静|克制|愿意作证|退开半步/.test(text)
  const hollowDialogue = /你真厉害|说得太好了|原来如此|好的，那么|请你告诉我|你知道吗/.test(text)
  const delivered = !hollowDialogue && [hasPlotAdvance, hasExpectation, hasCharacter].filter(Boolean).length >= 2
  return {
    key: 'dialogue_drive_rules',
    label: '对白驱动力',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(16, [hasPlotAdvance, hasExpectation, hasCharacter, !hollowDialogue].filter(Boolean).length * 22),
    evidence: [
      hasPlotAdvance ? '推进剧情/证据' : '',
      hasExpectation ? '制造期待/悬念' : '',
      hasCharacter ? '展示人设/关系' : '',
      hollowDialogue ? '空泛寒暄或夸赞' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasPlotAdvance ? '缺推进剧情或透露新信息' : '',
      !hasExpectation ? '缺期待感、悬念或下一步节奏' : '',
      !hasCharacter ? '缺通过语言展示人设/关系/立场' : '',
      hollowDialogue ? '存在空泛寒暄、夸赞或机械问答' : '',
    ], 8),
    issue: delivered ? '' : '对白没有承担 oh-story 三功能：推进剧情、增加期待感或展示人设；可能只是寒暄、夸赞或机械问答。',
    repair_instruction: delivered ? '' : '按 oh-story 对话三功能修复：每句对白至少承担推进剧情、增加期待感或展示人设之一；删掉“原来如此/你真厉害/请你告诉我”这类空对白，把它改成新信息、悬念、试探、立场或关系变化。',
  }
}

export function normalizeDialogueInformationEmbedCheck(values: any[], chapterText: string) {
  const planned = dialogueArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const scienceMouth = /你知道吗[^。！？\n]{0,80}(?:设定|来源|规则|使用方法|历史背景)|完整解释给你听|(?:来源|规则|使用方法|历史背景)[^。！？\n]{0,40}都很长|这意味着它可以|就是用[^。！？\n]{0,40}的账本/.test(text)
  const hasStanceWrappedInfo = /别拿|泼脏水|长老席|谁把|怎么知道|封口是今晨开的|账本在我手里|你若|说清楚|事实|核对|封条|袖口|墨点/.test(text)
  const hasPressureOrAction = /压|递|看着|按住|顿住|把[^。！？\n]{0,20}递给|当众|逼|追问|沉默|退开/.test(text)
  const delivered = !scienceMouth && hasStanceWrappedInfo && hasPressureOrAction
  return {
    key: 'information_embed_rules',
    label: '信息嵌入',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(16, [!scienceMouth, hasStanceWrappedInfo, hasPressureOrAction].filter(Boolean).length * 28),
    evidence: delivered
      ? ['角色立场包裹信息', '动作/压力承接信息']
      : uniqueBriefStrings([
          scienceMouth ? '科普嘴/说明书式对白' : '',
          !hasStanceWrappedInfo ? '信息没有被角色立场包裹' : '',
          !hasPressureOrAction ? '信息缺动作、压力或反应承接' : '',
        ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '信息没有用角色语气、立场、压力和动作包裹，或角色变成整段讲设定/原理/前因后果的科普嘴。',
    repair_instruction: delivered ? '' : '按 oh-story 信息嵌入修复：信息型配角不能当科普嘴；把设定/原理/前因后果拆成角色在压力下挤出的半句话、追问、误导、证据、身体反应或动作承接，用到哪带哪点。',
  }
}

export function normalizeDialogueAuditCheck(values: any[], chapterText: string) {
  const planned = dialogueArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const lines = quotedDialogueLines(chapterText)
  const hasNaturalOralConflict = lines.length > 0 && /别拿|你若|怎么知道|说漏了|封口|昨夜|谁把|够了|随意|闭嘴/.test(text)
  const hasDistinctSpeakerSignals = /李玄|周薄森|林青禾|短句|长句|克制|只补了一句|把封条递给/.test(text)
  const hasEndingRhythm = /说漏了|退开半步|低声议论停了|顿住|沉默|背面|下一|第三个证人|名字|线索/.test(text)
  const mechanicalQa = /好的，那么请你告诉我|那么你为什么|原来如此，那么|你知道吗|请你解释|是什么？[”」"]?\s*[“「"]/.test(text)
  const delivered = !mechanicalQa && hasNaturalOralConflict && hasDistinctSpeakerSignals && hasEndingRhythm
  return {
    key: 'dialogue_audit_rules',
    label: '对话审计',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(16, [!mechanicalQa, hasNaturalOralConflict, hasDistinctSpeakerSignals, hasEndingRhythm].filter(Boolean).length * 22),
    evidence: [
      hasNaturalOralConflict ? '自然口语/冲突语气' : '',
      hasDistinctSpeakerSignals ? '遮名可区分声线' : '',
      hasEndingRhythm ? '对话结尾预示节奏变化' : '',
      mechanicalQa ? '机械问答式对白' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      mechanicalQa ? '问答式一问一答' : '',
      !hasNaturalOralConflict ? '对白不像自然口语交流' : '',
      !hasDistinctSpeakerSignals ? '遮住角色名后难以区分说话人' : '',
      !hasEndingRhythm ? '对话结尾没有预示接下来的节奏变化' : '',
    ], 8),
    issue: delivered ? '' : '对话审计未通过：可能存在机械问答、声线不可区分、口语不自然，或对话结尾没有把节奏推向下一步。',
    repair_instruction: delivered ? '' : '按 oh-story 对话审计修复：把问答式一问一答改成主动发言、反应、动作、沉默和心理承接；遮住角色名仍要能区分是谁在说话；让对话结尾预示接下来的节奏变化。',
  }
}

export function normalizeDialogueVoiceCheck(values: any[], chapterText: string) {
  const planned = dialogueArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasShortVoice = /李玄[^。！？!?]{0,20}：“[^”」"]{1,18}[”」"]|“你怎么知道账本在我手里？”|“说漏了。”/.test(text)
  const hasLongVoice = /周薄森[^。！？!?]{0,30}：“[^”」"]{28,160}[”」"]|“李玄，你若真要当众翻旧账/.test(text)
  const hasFactVoice = /林青禾[^。！？!?]{0,30}：“[^”」"]{2,40}[”」"]|“封口是今晨开的。”/.test(text)
  const delivered = [hasShortVoice, hasLongVoice, hasFactVoice].filter(Boolean).length >= 2
  return {
    key: 'voice_differentiation_rules',
    label: '声线差异',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(20, [hasShortVoice, hasLongVoice, hasFactVoice].filter(Boolean).length * 30),
    evidence: [hasShortVoice ? '短句反问' : '', hasLongVoice ? '长句压迫' : '', hasFactVoice ? '事实型发言' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '主要角色声线差异不足，遮住角色名后难以区分谁在说话。',
    repair_instruction: delivered ? '' : '按口癖、节奏、信息偏好和身份措辞拆声线：主角短句压制，对手长句辩解，证人只给事实。',
  }
}
