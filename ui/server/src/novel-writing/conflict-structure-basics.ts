import { anchorMatchScore } from './text-matching'

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

function assetText(item: any) {
  if (!item) return ''
  if (typeof item === 'string') return compactBriefText(item)
  return compactBriefText(item.name || item.title || item.summary || item.description || item.entity_type || item.type)
}

export function conflictStructureArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => assetText(item) || compactBriefText(item)).filter(Boolean), 24)
}

export function conflictStructureAnchorScore(values: string[], chapterText: string, threshold = 22) {
  const checked = values.map(text => {
    const match = anchorMatchScore(text, chapterText)
    return {
      text,
      score: match.score,
      evidence: match.matched,
      delivered: match.score >= threshold,
    }
  })
  return {
    checked,
    missed: checked.filter(item => !item.delivered),
    score: checked.length ? Math.round(checked.reduce((sum, item) => sum + Number(item.score || 0), 0) / checked.length) : 82,
    evidence: checked.flatMap(item => item.evidence).filter(Boolean).slice(0, 8),
  }
}

export function normalizeConflictLadderCheck(values: any[], chapterText: string) {
  const planned = conflictStructureArray(values)
  if (!planned.length) return null
  const anchor = conflictStructureAnchorScore(planned, chapterText, 18)
  const text = String(chapterText || '')
  const hasVerbal = /质疑|冷声|警告|逼问|反驳|嘲讽|要求/.test(text)
  const hasAction = /挡住|堵住|扣下|封门|叫保安|按住|夺走|锁门|撤回授权/.test(text)
  const hasClash = /激烈对抗|当众|拆开|反证|核验|压制|失证|胜负/.test(text)
  const generic = /争执了一会儿|解释了很多背景|没有真正阻力|事情很快解决|本章只是过渡/.test(text)
  const delivered = !generic && (anchor.missed.length === 0 || (hasVerbal && hasAction && hasClash))
  return {
    key: 'conflict_ladder',
    label: '冲突阶梯',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, anchor.score) : Math.min(anchor.score, generic ? 18 : 50),
    evidence: uniqueBriefStrings([...anchor.evidence, hasVerbal ? '言语压力可见' : '', hasAction ? '行动阻碍可见' : '', hasClash ? '对抗/胜负信号可见' : '', generic ? '冲突被概括跳过' : ''], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : anchor.missed.map(item => item.text),
    issue: delivered ? '' : '冲突没有从言语升级到行动阻碍、激烈对抗和胜负结果，或被概括成争执/解释。',
    repair_instruction: delivered ? '' : '补冲突阶梯：让阻止者从言语压迫升级到行动阻碍，再进入激烈对抗和决定胜负。',
  }
}

export function normalizeConflictMotivationCheck(values: any[], chapterText: string) {
  const planned = conflictStructureArray(values)
  if (!planned.length) return null
  const anchor = conflictStructureAnchorScore(planned, chapterText, 18)
  const text = String(chapterText || '')
  const hasGoldfinger = /金手指|隐藏工具箱|错误码|系统|面板|能力|反证/.test(text)
  const hasWorldRule = /协会|规则|资质|设备权限|设备间|封条|客户授权|制度/.test(text)
  const hasRelation = /客户|会长|协会成员|保安|亲自追责|撤回授权/.test(text)
  const delivered = anchor.missed.length === 0 || [hasGoldfinger, hasWorldRule, hasRelation].filter(Boolean).length >= 2
  return {
    key: 'motivation_sources',
    label: '动机来源',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, anchor.score) : Math.min(anchor.score, 52),
    evidence: uniqueBriefStrings([...anchor.evidence, hasGoldfinger ? '金手指/反证驱动' : '', hasWorldRule ? '规则/资质驱动' : '', hasRelation ? '人物关系/利益驱动' : ''], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : anchor.missed.map(item => item.text),
    issue: delivered ? '' : '冲突缺少金手指、世界规则、人物关系或利益结构等可持续动机来源。',
    repair_instruction: delivered ? '' : '补动机来源：把阻力接到规则、资源、阶层、关系、利益或主角能力反馈上。',
  }
}

export function normalizeConflictPressureCheck(values: any[], chapterText: string) {
  const planned = conflictStructureArray(values)
  if (!planned.length) return null
  const anchor = conflictStructureAnchorScore(planned, chapterText, 18)
  const text = String(chapterText || '')
  const hasPressureRoot = /协会|规则|资质|设备权限|封门|客户[^。！？!?]{0,20}被迫|撤回授权|保安|会长/.test(text)
  const negatedPersonalAttack = /不是单纯骂人|不只是骂人|并非单纯骂人/.test(text)
  const onlyPersonalAttack = !negatedPersonalAttack && /态度不好|骂了几句|单纯骂人|人品很差/.test(text)
  const delivered = !onlyPersonalAttack && (anchor.missed.length === 0 || hasPressureRoot)
  return {
    key: 'antagonist_pressure_rules',
    label: '压势规则',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, anchor.score) : Math.min(anchor.score, onlyPersonalAttack ? 20 : 52),
    evidence: uniqueBriefStrings([...anchor.evidence, hasPressureRoot ? '规则/资源/权限压势可见' : '', onlyPersonalAttack ? '只压人不压势' : ''], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : anchor.missed.map(item => item.text),
    issue: delivered ? '' : '对抗只写成态度坏或嘴硬，没有让规则、资源、权限、阶层或利益真正压住主角。',
    repair_instruction: delivered ? '' : '补压势规则：对手要借规则、资源、权限、环境或群体利益压势，不是只骂主角。',
  }
}

export function normalizeConflictAgencyCheck(values: any[], chapterText: string) {
  const planned = conflictStructureArray(values)
  if (!planned.length) return null
  const anchor = conflictStructureAnchorScore(planned, chapterText, 18)
  const text = String(chapterText || '')
  const hasAgency = /主动|没有等|往前一步|当众拆开|核验|反证|做了旁人不敢做|破局|夺回|逼/.test(text)
  const negatedPassive = /没有等人通融|不等人通融|没有等/.test(text)
  const passive = !negatedPassive && /听完觉得有道理|被人通融|等人通融|有人帮他解决|主角解释了很多背景/.test(text)
  const delivered = !passive && (anchor.missed.length === 0 || hasAgency)
  return {
    key: 'protagonist_agency_rules',
    label: '主角行动力',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, anchor.score) : Math.min(anchor.score, passive ? 16 : 50),
    evidence: uniqueBriefStrings([...anchor.evidence, hasAgency ? '主角主动破局可见' : '', passive ? '主角被动解释/等解决' : ''], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : anchor.missed.map(item => item.text),
    issue: delivered ? '' : '主角没有主动破局，冲突靠解释、通融或外力解决。',
    repair_instruction: delivered ? '' : '补主角行动力：让主角做别人不敢做/做不到/想不到的具体行动，并承担结果。',
  }
}

export function normalizeConflictEventValueCheck(values: any[], chapterText: string) {
  const planned = conflictStructureArray(values)
  if (!planned.length) return null
  const anchor = conflictStructureAnchorScore(planned, chapterText, 18)
  const text = String(chapterText || '')
  const hasValueChange = /胜负落地|客户资格[^。！？!?]{0,20}(拒绝|认可)|从拒绝到认可|封门[^。！？!?]{0,24}失证|局势变化|明确结果|反转改变/.test(text)
  const missingResult = /没有明确胜负|没有结果|事情很快解决了|听完觉得有道理/.test(text)
  const delivered = !missingResult && (anchor.missed.length === 0 || hasValueChange)
  return {
    key: 'event_value_changes',
    label: '胜负变化',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, anchor.score) : Math.min(anchor.score, missingResult ? 14 : 48),
    evidence: uniqueBriefStrings([...anchor.evidence, hasValueChange ? '胜负/价值变化可见' : '', missingResult ? '胜负被跳过' : ''], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : anchor.missed.map(item => item.text),
    issue: delivered ? '' : '冲突没有明确结果，资格、关系、信息、资源或局势没有发生可见变化。',
    repair_instruction: delivered ? '' : '补胜负变化：写清谁赢谁输、资格/资源/信息/关系如何改变，以及后续账是什么。',
  }
}

export function normalizeConflictNextSeedCheck(values: any[], chapterText: string) {
  const planned = conflictStructureArray(values)
  if (!planned.length) return null
  const anchor = conflictStructureAnchorScore(planned, chapterText, 18)
  const tail = String(chapterText || '').slice(-1200)
  const hasSeed = /第二份封单|医院设备|协会会长|亲自追责|下一冲突|指向|章尾|账本|追责/.test(tail)
  const deferred = /下一章再安排新的冲突|之后再说|暂且不提/.test(tail)
  const delivered = !deferred && (anchor.missed.length === 0 || hasSeed)
  return {
    key: 'next_conflict_seeds',
    label: '下一冲突',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, anchor.score) : Math.min(anchor.score, deferred ? 18 : 50),
    evidence: uniqueBriefStrings([...anchor.evidence, hasSeed ? '下一冲突种子可见' : '', deferred ? '下一冲突被推迟' : ''], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : anchor.missed.map(item => item.text),
    issue: delivered ? '' : '解决当前冲突后没有埋下下一冲突种子，或只说下一章再安排。',
    repair_instruction: delivered ? '' : '补下一冲突种子：在当前胜负结果中自然引出新的阻力、追责、目标或未解证据。',
  }
}

export function normalizeConflictNetworkLayersContract(value: any) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const verticalConflict = compactBriefText(value.vertical_conflict || value.verticalConflict || value.vertical || value.authority_conflict || value.authorityConflict)
  const horizontalConflict = compactBriefText(value.horizontal_conflict || value.horizontalConflict || value.horizontal || value.peer_conflict || value.peerConflict)
  const crossConflict = compactBriefText(value.cross_conflict || value.crossConflict || value.cross || value.interlocking_conflict || value.interlockingConflict)
  const weavingOrder = uniqueBriefStrings(asArray(value.weaving_order || value.weavingOrder || value.order || value.steps).map((item: any) => compactBriefText(item)).filter(Boolean), 8)
  if (!verticalConflict && !horizontalConflict && !crossConflict && !weavingOrder.length) return null
  return {
    vertical_conflict: verticalConflict,
    horizontal_conflict: horizontalConflict,
    cross_conflict: crossConflict,
    weaving_order: weavingOrder,
  }
}

export function normalizeConflictNetworkLayersCheck(value: any, chapterText: string) {
  const contract = normalizeConflictNetworkLayersContract(value)
  if (!contract) return null
  const text = String(chapterText || '')
  const planned = uniqueBriefStrings([
    contract.vertical_conflict ? `纵向矛盾：${contract.vertical_conflict}` : '',
    contract.horizontal_conflict ? `横向矛盾：${contract.horizontal_conflict}` : '',
    contract.cross_conflict ? `交叉矛盾：${contract.cross_conflict}` : '',
    contract.weaving_order?.length ? `编织顺序：${contract.weaving_order.join(' -> ')}` : '',
  ], 8)
  const hasWeaving = /定地图|定阵营|定角色|地图[^。！？\n]{0,30}阵营|阵营[^。！？\n]{0,30}角色|三层矛盾|同时运作/.test(text)
  const explicitBreak = /只有[^。！？\n]{0,20}一条冲突|其他阵营暂时没有关联|没有竞争|没有被牵连|没有交叉|没有纵向|没有横向|没有关联|没有激活新矛盾/.test(text)
  const negatesVertical = /没有纵向|缺纵向|无纵向/.test(text)
  const negatesHorizontal = /没有横向|缺横向|无横向|没有竞争|没有同业/.test(text)
  const negatesCross = /没有交叉|缺交叉|无交叉|没有被牵连|没有牵连/.test(text)
  const hasVertical = !negatesVertical && /纵向矛盾|上下级|上级权限|下级|服从|压制|反抗|宗主|师徒|君臣|领导[^。！？\n]{0,24}(压|卡|拦|要求|服从)|会长[^。！？\n]{0,24}(上级|权限|要求|压|服从)|规则[^。！？\n]{0,24}(压|卡|拦)|权限[^。！？\n]{0,24}(压|卡|拦|要求)/.test(text)
  const hasHorizontal = !negatesHorizontal && /横向矛盾|理念冲突|资源争夺|同行|同业|情敌|竞争对手|抢单|争夺[^。！？\n]{0,24}(订单|资源|客户|名额|授权)|同层竞争/.test(text)
  const hasCross = !negatesCross && /交叉矛盾|牵连|互相牵连|连锁|因果[^。！？\n]{0,24}牵|A-B|B-C|A-C|解决[^。！？\n]{0,40}(激活|加深|牵动|追责)|会让[^。！？\n]{0,40}(追责|失去|牵连)|一条[^。！？\n]{0,30}另一条/.test(text)
  const delivered = !explicitBreak && hasVertical && hasHorizontal && hasCross
  return {
    key: 'conflict_network_layers',
    label: '三层矛盾网',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : explicitBreak ? 16 : Math.max(24, [hasVertical, hasHorizontal, hasCross, hasWeaving].filter(Boolean).length * 22),
    evidence: uniqueBriefStrings([
      hasVertical ? '纵向矛盾可见' : '',
      hasHorizontal ? '横向矛盾可见' : '',
      hasCross ? '交叉矛盾可见' : '',
      hasWeaving ? '定地图/定阵营/定角色编织顺序可见' : '',
      explicitBreak ? '正文显式写成单线或无牵连' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasVertical ? '缺纵向矛盾' : '',
      !hasHorizontal ? '缺横向矛盾' : '',
      !hasCross ? '缺交叉矛盾' : '',
      explicitBreak ? '正文把三层矛盾写成单线/无牵连' : '',
    ], 8),
    issue: delivered ? '' : '三层矛盾网没有成立：长篇冲突缺少纵向压制、横向竞争或交叉牵连，容易变成单场争执。',
    repair_instruction: delivered ? '' : '补三层矛盾网：先定地图、定阵营、定角色，再同时写纵向矛盾、横向矛盾和交叉矛盾，让一条解决时牵动另一条。',
  }
}

export function normalizeConflictWebContract(value: any) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const activeLines = uniqueBriefStrings(asArray(value.active_lines || value.activeLines || value.lines).map((item: any) => compactBriefText(item)).filter(Boolean), 8)
  const linkRules = uniqueBriefStrings(asArray(value.link_rules || value.linkRules || value.links).map((item: any) => compactBriefText(item)).filter(Boolean), 8)
  const activationRules = uniqueBriefStrings(asArray(value.activation_rules || value.activationRules || value.activations).map((item: any) => compactBriefText(item)).filter(Boolean), 8)
  if (!activeLines.length && !linkRules.length && !activationRules.length) return null
  return {
    active_lines: activeLines,
    link_rules: linkRules,
    activation_rules: activationRules,
  }
}

function conflictWebLineMentioned(line: string, chapterText: string) {
  const text = String(chapterText || '')
  const rawLine = compactBriefText(line)
  const lineCore = rawLine.replace(/[线支脉]$/g, '')
  if (!rawLine) return false
  if (text.includes(rawLine) || (lineCore && text.includes(lineCore))) return true
  return anchorMatchScore(rawLine, text).score >= 16 || (lineCore ? anchorMatchScore(lineCore, text).score >= 18 : false)
}

export function normalizeConflictWebCheck(value: any, chapterText: string) {
  const contract = normalizeConflictWebContract(value)
  if (!contract) return null
  const text = String(chapterText || '')
  const mentionedLines = contract.active_lines.filter((line: string) => conflictWebLineMentioned(line, text))
  const linkText = contract.link_rules.join('；')
  const activationText = contract.activation_rules.join('；')
  const planned = uniqueBriefStrings([
    contract.active_lines.length ? `活跃矛盾线：${contract.active_lines.join('、')}` : '',
    linkText ? `关联规则：${linkText}` : '',
    activationText ? `激活规则：${activationText}` : '',
  ], 8)
  const hasLink = /因果|利益冲突|信息差|牵连|导致|背后|指向|担保|追责|责任|篡改|互相/.test(text)
  const hasActivation = /解决|阶段解决|但|却|立刻升级|马上升级|激活|加深|追责|继续施压|新矛盾|新危机|更大/.test(text)
  const explicitBreak = /没有关联|没有新的利益冲突|没有激活新矛盾|没有新矛盾|都没有继续施压|各自无关|互不相干|麻烦(?:彻底|全部|都)?消失了/.test(text)
  const enoughLines = contract.active_lines.length ? mentionedLines.length >= Math.min(2, contract.active_lines.length) : /两条矛盾|三条矛盾|2-3条矛盾|两线|三线/.test(text)
  const delivered = !explicitBreak && enoughLines && hasLink && hasActivation
  return {
    key: 'conflict_web',
    label: '矛盾网',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : explicitBreak ? 18 : Math.max(32, [enoughLines, hasLink, hasActivation].filter(Boolean).length * 24),
    evidence: uniqueBriefStrings([
      mentionedLines.length ? `命中矛盾线：${mentionedLines.join('、')}` : '',
      hasLink ? '矛盾线关联可见' : '',
      hasActivation ? '解决后激活/加深信号可见' : '',
      explicitBreak ? '正文显式切断矛盾网' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !enoughLines ? '同一时刻缺少2-3条活跃矛盾线' : '',
      !hasLink ? '矛盾线之间缺少因果/利益冲突/信息差关联' : '',
      !hasActivation ? '解决一条后没有激活或加深另一条' : '',
      explicitBreak ? '正文把矛盾线写成无关联/无后续压力' : '',
    ], 8),
    issue: delivered ? '' : '矛盾网没有成立：活跃矛盾线不足，或矛盾线之间缺少关联，或解决一条后没有激活/加深另一条。',
    repair_instruction: delivered ? '' : '补矛盾网：同一时刻保持2-3条矛盾线互相牵连，解决一条时必须激活或加深另一条。',
  }
}

export function normalizeConflictNoExitCheck(values: any[], chapterText: string) {
  const planned = conflictStructureArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const looseExit = /可以转身离开|随时能撤|随时退出|可以随时退出|可以随时离开|没有工作职责|没有场所封锁|没有亲友遇险|失败没有代价|身份资格不会受影响|普通争吵/.test(text)
  const negatedGlue = /没有工作职责|没有场所封锁|没有亲友遇险|没有任何[^。！？\n]*(黏住|束缚|理由|职责|责任|场所)/.test(text)
  const forceEntry = !negatedGlue && /非踏入不可|必须[^。！？\n]*(踏入|进入|处理|破局|完成|留下|当场)|不能撤|不能离开|无法袖手旁观|不得不|被迫|值班|接案|任务|工作职责|道德责任|亲人遇险|全楼停电/.test(text)
  const deathStake = /死亡赌注|肉体死亡|身份\/职场死亡|身份死亡|职场死亡|事业死亡|心理死亡|资格归零|一切归零|失败[^。！？\n]*(归零|失去|吊销|退婚|崩塌|完了|没有以后)|退出代价|代价[^。！？\n]*(归零|失去|吊销|停电|遇险)/.test(text)
  const glue = !negatedGlue && /黏结剂|杀人理由|工作职责|道德责任|实体场所|副本|密室|锁死|困在|场所[^。！？\n]*(锁|困|封)|亲人遇险|值班维修师|封单|会长亲自|职责/.test(text)
  const antagonistBound = /对方也退不了|反派[^。！？\n]*(不能退|退不了|必须|职责)|协会成员也退不了|对立双方|双方[^。！？\n]*(无法|不能|退不了|困)|会长亲自下|封单[^。！？\n]*(职责|命令|失证)/.test(text)
  const delivered = !looseExit && forceEntry && deathStake && glue && antagonistBound
  return {
    key: 'no_exit_rules',
    label: '有进无出',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : looseExit ? 12 : Math.max(16, [forceEntry, deathStake, glue, antagonistBound].filter(Boolean).length * 22),
    evidence: uniqueBriefStrings([
      forceEntry ? '主角非踏入不可' : '',
      deathStake ? '死亡赌注/退出代价可见' : '',
      glue ? '黏结剂可见' : '',
      antagonistBound ? '对立方也无法轻易脱身' : '',
      looseExit ? '正文写成可以随时退出/无代价' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !forceEntry ? '缺强迫性入局理由' : '',
      !deathStake ? '缺死亡赌注/退出代价' : '',
      !glue ? '缺黏结剂' : '',
      !antagonistBound ? '缺对立方无法脱身理由' : '',
      looseExit ? '正文让人物可以随时退出' : '',
    ], 8),
    issue: delivered ? '' : '冲突缺少有进无出：读者会觉得主角或对手可以随时脱离困境，张力无法成立。',
    repair_instruction: delivered ? '' : '补有进无出：给主角非踏入不可的强迫性理由，明确肉体/身份职场/心理死亡赌注，并用杀人理由、工作职责、道德责任或实体场所作为黏结剂，让对立双方都无法轻易脱身。',
  }
}

export function buildConflictStructureDeterministicCheck(chapterText: string) {
  const text = String(chapterText || '')
  const risks = [
    /争执了一会儿|大家争执|吵了一会儿/.test(text) ? {
      key: 'summarized_argument',
      label: '争执概括',
      evidence: '正文用争执概括替代冲突阶梯。',
      fix: '拆成言语压力、行动阻碍、激烈对抗和胜负结果。',
    } : null,
    /解释了很多背景|听完觉得有道理|说了很多背景/.test(text) ? {
      key: 'background_solves_conflict',
      label: '背景解释解题',
      evidence: '正文靠解释背景解决冲突，缺少行动阻碍和破局。',
      fix: '把解释改成现场行动、证据核验、规则反制或代价反馈。',
    } : null,
    /没有真正阻力|毫无阻力|没有阻力/.test(text) ? {
      key: 'no_real_obstacle',
      label: '缺真实阻力',
      evidence: '正文直接承认没有真正阻力。',
      fix: '设置有人/规则/资源真实阻止主角得到目标。',
    } : null,
    /没有明确胜负|没有结果/.test(text) ? {
      key: 'no_clear_result',
      label: '胜负不清',
      evidence: '正文直接承认没有明确胜负。',
      fix: '补资格、资源、信息、关系或局势的可见变化。',
    } : null,
    /本章只是过渡|下一章再安排新的冲突|事情很快解决了/.test(text) ? {
      key: 'transition_without_conflict',
      label: '过渡章空转',
      evidence: '正文把冲突推迟或快速抹平。',
      fix: '本章必须有阻止者、升级、胜负变化和下一冲突种子。',
    } : null,
  ].filter(Boolean)
  if (!risks.length) return null
  return {
    key: 'conflict_structure_forbidden',
    label: '冲突结构硬伤',
    text: '冲突结构不得写成争执概括、背景解释解题、没有真实阻力、没有明确胜负或过渡章空转。',
    expected: '冲突结构不得写成争执概括、背景解释解题、没有真实阻力、没有明确胜负或过渡章空转。',
    score: Math.max(0, 100 - risks.length * 24),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项冲突结构确定性风险。`,
    repair_instruction: '按 oh-story 冲突结构修复：补阻止者、冲突升级阶梯、主角主动破局、明确胜负结果和下一冲突种子。',
  }
}

export function conflictStructurePriority(missed: any[]) {
  if (missed.some(item => item.key === 'conflict_structure_forbidden')) return '优先清冲突硬伤'
  if (missed.some(item => item.key === 'conflict_network_layers')) return '优先补三层矛盾网'
  if (missed.some(item => item.key === 'no_exit_rules')) return '优先补有进无出'
  if (missed.some(item => item.key === 'conflict_ladder')) return '优先补冲突阶梯'
  if (missed.some(item => item.key === 'conflict_web')) return '优先补矛盾网'
  if (missed.some(item => item.key === 'protagonist_agency_rules')) return '优先补主角破局'
  if (missed.some(item => item.key === 'event_value_changes')) return '优先补胜负变化'
  if (missed.some(item => item.key === 'antagonist_pressure_rules')) return '优先补压势规则'
  if (missed.some(item => item.key === 'next_conflict_seeds')) return '优先补下一冲突'
  if (missed.some(item => item.key === 'motivation_sources')) return '优先补动机来源'
  return ''
}
