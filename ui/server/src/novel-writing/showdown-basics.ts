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

export function showdownArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => compactBriefText(item)).filter(Boolean), 20)
}

export function normalizeShowdownPayoffCheck(values: any[], chapterText: string) {
  const planned = showdownArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasRelease = /爽点|底牌|亮出|亮底|反压|反制|压制|碾压|秒杀|拿回|改判|证明|当场/.test(text)
  const hasAntagonistSuppressed = /反派|对手|执事|长老|会长|老板|主管|敌人|他|她/.test(text)
    && /被(?:压制|反噬|击退|打断|迫退|取消|改判|带走|封住)|破防|退后|认输|改口|露馅|资格.*(?:取消|反转)/.test(text)
  const hasNoGrievanceTail = !/(底牌|亮出|反制|证明)[\s\S]{0,160}(?:又被|仍被|继续被|反被|反打|压回|委屈)/.test(text)
  const delivered = hasRelease && hasAntagonistSuppressed && hasNoGrievanceTail
  return {
    key: 'payoff_release',
    label: '爽点释放',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 90 : hasRelease ? 58 : 28,
    evidence: [hasRelease ? '底牌/反制释放' : '', hasAntagonistSuppressed ? '对手受到压制' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '爽点释放不完整：底牌亮出后对手没有受到对应压制，或主角继续委屈。',
    repair_instruction: delivered ? '' : '补爽点释放：该亮底牌时给足结果，底牌释放后让对手被压制、改口、破防、失去资格或局势被改判。',
  }
}

export function normalizeShowdownTrumpCardReserveCheck(values: any[], chapterText: string) {
  const planned = showdownArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasTrumpContext = /(?:底牌|暗牌|后手|金手指|系统|面板|技能|能力|阵盘|阵牌|残符|血印|王牌|杀招|旧印|玉牌)/.test(text)
    && /(?:亮出|亮底|拿出|动用|只出|摊开|放出|催动|激活|解锁|底牌|后手)/.test(text)
  if (!hasTrumpContext) return null
  const hasAllInControl = /没有把[^。！？!?]{0,24}(?:底牌|后手)[^。！？!?]{0,16}(?:全|都)|不(?:把|会把)[^。！？!?]{0,24}(?:底牌|后手)[^。！？!?]{0,16}(?:全|都)/.test(text)
  const hasAllIn = !hasAllInControl && /所有底牌|全部底牌|底牌全(?:出|掀|用)|一口气[^。！？!?]{0,32}(?:底牌|后手|暗牌)|(?:全都|全部)[^。！？!?]{0,24}(?:摊开|亮出|砸出|掀开)|最后一(?:张|枚|道|个)?(?:底牌|后手|暗牌)|再无(?:底牌|后手|退路|余力)|没有(?:底牌|后手)了|把[^。！？!?]{0,24}底牌[^。！？!?]{0,24}(?:全|都)/.test(text)
  const hasSingleUse = /只(?:亮|用|出|动用|拿出|放出|揭开|掀开)一(?:张|枚|道|个)|每次只出(?:1|一)个|没有把[^。！？!?]{0,24}(?:底牌|后手)[^。！？!?]{0,16}(?:全|都)|不(?:把|会把)[^。！？!?]{0,24}(?:底牌|后手)[^。！？!?]{0,16}(?:全|都)/.test(text)
  const hasReserve = /(?:仍|还|继续|至少|手里|袖中|心里)[^。！？!?]{0,48}(?:两|二|三|2|3)[^。！？!?]{0,12}(?:张|枚|道|个)?[^。！？!?]{0,24}(?:未揭示|没用|未用|未出|没出|藏着|留着|压着)?[^。！？!?]{0,24}(?:底牌|暗牌|后手)|(?:底牌|暗牌|后手)[^。！？!?]{0,48}(?:仍|还|继续|至少|留|藏|压)[^。！？!?]{0,48}(?:两|二|三|2|3|未揭示)/.test(text)
  const hasReplenish = /(?:获得|拿到|补上|新增|觉醒|解锁|收获|得到)[^。！？!?]{0,32}(?:新技能|新能力|新底牌|新后手|新资源|新阵纹|新符|新牌)|(?:新技能|新能力|新底牌|新后手|新资源|新阵纹|新符|下一张牌|下一轮后手)/.test(text)
  const hasNextExpectation = /新目标|新门槛|更高门槛|下一章|下一步|下一轮|追查|更大矛盾|下一层期待|后续期待/.test(text)
  const delivered = !hasAllIn && hasTrumpContext && (hasSingleUse || hasReserve) && (hasReserve || hasReplenish || hasNextExpectation)
  return {
    key: 'trump_card_reserve',
    label: '底牌管理',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : hasAllIn ? 18 : Math.max(28, [hasSingleUse, hasReserve, hasReplenish, hasNextExpectation].filter(Boolean).length * 22),
    evidence: [
      hasSingleUse ? '每次只出一张牌' : '',
      hasReserve ? '保留2-3个未揭示底牌/后手' : '',
      hasReplenish ? '出牌后补新技能/新后手' : '',
      hasNextExpectation ? '开启下一层期待' : '',
      hasAllIn ? '存在一次性摊空底牌风险' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      hasAllIn ? '不能一次性摊空所有底牌或写成最后一张底牌' : '',
      !hasSingleUse ? '缺“每次只出1个底牌”的控制' : '',
      !hasReserve ? '缺2-3个未揭示底牌/后手' : '',
      !hasReplenish && !hasNextExpectation ? '缺新技能、新后手、新目标或下一层期待' : '',
    ], 8),
    issue: delivered ? '' : '底牌管理不足：亮牌后没有保留未揭示底牌，或一次性摊空后续期待。',
    repair_instruction: delivered ? '' : '补底牌管理：每次只出1个底牌，只解决当前矛盾的关键扣；同时保留2-3个未揭示底牌，并在出牌后补新技能、新后手、新目标或更高门槛。',
  }
}

export function normalizeShowdownThreePressureShockCheck(values: any[], chapterText: string) {
  const planned = showdownArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasFriendlyPressure = /友好势力|友方|外门弟子|同门|盟友|熟人|支持者|朋友|旧情|救过|觉得[^。！？!?]{0,16}(?:大佬|厉害|不凡)|替[^。！？!?]{0,16}(?:说话|铺压|作证)|相信[^。！？!?]{0,16}(?:主角|沈砚)/.test(text)
  const enemyPressureMatches = text.match(/敌方势力|敌方|反派|对手|执事|会长|老板|敌人|不服|冷笑|逼[^。！？!?]{0,20}(?:上场|认输|出手|交出)|第一次|第二次/g) || []
  const hasEnemyPressure = /敌方势力|敌方|反派|对手|执事|会长|老板|敌人/.test(text)
    && /不服|冷笑|逼[^。！？!?]{0,20}(?:上场|认输|出手|交出)|第一次[^。！？!?]{0,40}第二次|两次铺垫|再次/.test(text)
    && enemyPressureMatches.length >= 2
  const hasNeutralPressure = /中立势力|中立|长老席|评委|裁判|考官|旁观|观望|没有表态|压下判签|第三重压力|第三压|三压/.test(text)
  const hasBurst = /一爆|出手碾压|当场碾压|直接碾压|一击压制|压制|反压|反制|打脸|亮出底牌|当场改判|破防|资格判签反转/.test(text)
  const hasFriendlyShock = /友方|友好势力|外门弟子|同门|盟友|支持者|朋友[^。！？!?]{0,24}(?:震动|震惊|激动|传话|改口|站起|沸腾)|友方[^。！？!?]{0,40}(?:震动|震惊|激动|传话|改口)/.test(text)
  const hasEnemyShock = /敌方|反派|对手|执事|会长|敌人[^。！？!?]{0,24}(?:震动|震惊|破防|退后|改口|闭嘴|脸色变|认输)|敌方[^。！？!?]{0,40}(?:震动|震惊|破防|退后|改口)/.test(text)
  const hasNeutralShock = /中立|中立势力|长老席|评委|裁判|考官[^。！？!?]{0,24}(?:震动|震惊|第一次|改口|重审|重新评估|站起)|中立[^。！？!?]{0,40}(?:震动|震惊|改口|重审)|长老席[^。！？!?]{0,40}(?:震动|第一次|改口|重审)/.test(text)
  const genericOnly = /众人都震惊|大家都震惊|全场震惊/.test(text) && !(hasFriendlyShock && hasEnemyShock && hasNeutralShock)
  const delivered = hasFriendlyPressure && hasEnemyPressure && hasNeutralPressure && hasBurst && hasFriendlyShock && hasEnemyShock && hasNeutralShock && !genericOnly
  return {
    key: 'three_pressure_shock',
    label: '三压一爆三震',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 90 : Math.max(18, [hasFriendlyPressure, hasEnemyPressure, hasNeutralPressure, hasBurst, hasFriendlyShock, hasEnemyShock, hasNeutralShock, !genericOnly].filter(Boolean).length * 11),
    evidence: uniqueBriefStrings([
      hasFriendlyPressure ? '友好势力铺压' : '',
      hasEnemyPressure ? '敌方势力两次不服/逼主角上场' : '',
      hasNeutralPressure ? '中立势力第三重压力' : '',
      hasBurst ? '主角一爆碾压' : '',
      hasFriendlyShock ? '友方震动' : '',
      hasEnemyShock ? '敌方震动' : '',
      hasNeutralShock ? '中立方震动' : '',
      genericOnly ? '只写统一震惊' : '',
    ], 10),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasFriendlyPressure ? '缺友好势力铺压' : '',
      !hasEnemyPressure ? '缺敌方势力两次铺垫和不服逼主角上场' : '',
      !hasNeutralPressure ? '缺中立势力第三重压力' : '',
      !hasBurst ? '缺主角一爆碾压' : '',
      !hasFriendlyShock ? '缺友方震动' : '',
      !hasEnemyShock ? '缺敌方震动' : '',
      !hasNeutralShock ? '缺中立方震动' : '',
      genericOnly ? '三震被写成统一震惊' : '',
    ], 10),
    issue: delivered ? '' : '三压一爆三震不完整：缺友方、敌方、中立方的铺压或爆发后的三方震动。',
    repair_instruction: delivered ? '' : '补三压一爆三震：一压写友好势力觉得主角是大佬；二压写敌方两次不服并逼主角上；三压写中立势力观望或加压；一爆写主角出手碾压；三震分别写友方、敌方、中立方的不同震动。',
  }
}

export function normalizeShowdownStageCheck(values: any[], chapterText: string) {
  const planned = showdownArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasCrowd = /群众层|弟子|众人|全场|观众|旁观|围观|起哄/.test(text)
  const hasMiddle = /中间层|阵师|导师|考官|内行|执事席|同门|专业|复盘|看懂/.test(text)
  const hasCore = /核心层|长老|长老席|掌门|会长|院长|族长|审判长|高层|权威|改判|重审/.test(text)
  const delivered = hasCrowd && hasMiddle && hasCore
  return {
    key: 'stage_chain',
    label: '舞台层级',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: Math.round([hasCrowd, hasMiddle, hasCore].filter(Boolean).length / 3 * 100),
    evidence: [hasCrowd ? '群众层' : '', hasMiddle ? '中间层' : '', hasCore ? '核心层' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '舞台层级不完整：群众层、中间层、核心层没有形成传递链。',
    repair_instruction: delivered ? '' : '补舞台层级：群众层给直观反应，中间层给专业判断，核心层改变规则/资源/权力评价。',
  }
}

export function normalizeShowdownTransmissionChannelCheck(values: any[], chapterText: string) {
  const planned = showdownArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasRelationshipSetup = /人际关系|旧情|救过|救下|救了|替[^。！？!?]{0,18}(?:补|挡|作证|说话)|帮过|欠(?:他|她|主角|沈砚)?|感激|认可|师承|同门|共同目标|愿意看完|愿意作证|联系/.test(text)
  const hasTransmission = /传递通道|传给|传递|反向传回|层层传|上行|反向|传回群众|告诉众人|众人因此|外门弟子.*众人|中间层.*核心层|核心层.*群众/.test(text)
  const hasChangedOutcome = /态度(?:转变|变化)|改口|站到|支持|作证|愿意|重审|改判|声望|名望|资源|规则评价|利益计算|重新评估|局势变化|反向传/.test(text)
  const hasStageBridge = /群众层[\s\S]{0,160}中间层[\s\S]{0,160}核心层|外门弟子[\s\S]{0,160}阵师[\s\S]{0,160}长老|群众[\s\S]{0,160}长老/.test(text)
  const delivered = hasRelationshipSetup && hasTransmission && hasChangedOutcome
  return {
    key: 'transmission_channel',
    label: '传递通道',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(24, [hasRelationshipSetup, hasTransmission, hasChangedOutcome, hasStageBridge].filter(Boolean).length * 22),
    evidence: [
      hasRelationshipSetup ? '人际关系/利益铺垫' : '',
      hasTransmission ? '震惊传递通道' : '',
      hasChangedOutcome ? '态度/利益/规则变化' : '',
      hasStageBridge ? '层级桥接' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasRelationshipSetup ? '缺装逼前的人际关系或利益关系铺垫' : '',
      !hasTransmission ? '缺震惊由群众层/中间层/核心层传递或反向传回的通道' : '',
      !hasChangedOutcome ? '缺爽点释放后的态度、利益、声望、资源或规则评价变化' : '',
    ], 8),
    issue: delivered ? '' : '装逼打脸缺少传递通道：爽点有人看见，但缺少关系/利益网络把结果传出去并改变局势。',
    repair_instruction: delivered ? '' : '补传递通道：装逼前先铺主角与群众层、中间层或核心层的救助、旧情、利益、欠债、认可或共同目标；爽点释放后让这条关系把震惊向上/向下传递，并带来态度、声望、资源、规则评价或后续行动变化。',
  }
}

export function normalizeShowdownShockCheck(values: any[], chapterText: string) {
  const planned = showdownArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasShock = /震惊|脸色(?:一变|变了)|哗然|安静|倒吸|破防|看懂|意识到|改口|重审/.test(text)
  const hasInterestBasis = /资格|利益|规则|资源|阵图|内库|试炼|权力|名望|利害|目标|改判|重审/.test(text)
  const hasDifferentLayers = /群众层[\s\S]{0,120}中间层[\s\S]{0,120}核心层|中间层[\s\S]{0,120}核心层|长老[\s\S]{0,80}(?:改判|重审|意识到)/.test(text)
  const delivered = hasShock && hasInterestBasis && hasDifferentLayers
  return {
    key: 'shock_chain',
    label: '震惊分层',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(28, [hasShock, hasInterestBasis, hasDifferentLayers].filter(Boolean).length * 25),
    evidence: [hasShock ? '震惊反应' : '', hasInterestBasis ? '利益/目标依据' : '', hasDifferentLayers ? '分层传递' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '震惊只停留在统一反应，没有基于不同身份的利益和目标分层。',
    repair_instruction: delivered ? '' : '补震惊分层：不同身份的人要因为自己的利益、目标、知识水平发生不同反应，并反过来放大主角收益。',
  }
}

export function normalizeShowdownCombatCheck(values: any[], chapterText: string) {
  const planned = showdownArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasCombat = /战斗|打斗|智斗|斗法|挥剑|出手|避开|反击|阵盘|阵纹|剑势|招|一击|第二击|空门/.test(text)
  const hasProcess = /先|再|第二|第三|避开|借|引|踩进|扣进|反咬|压制|反馈|代价/.test(text)
  const hasGain = /收获|展示|新能力|新资源|拿回|资格|改判|规则|阵图|试炼|底牌|残纹/.test(text)
  const delivered = hasCombat && hasProcess && hasGain
  return {
    key: 'combat_design',
    label: '战斗/智斗逻辑',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(26, [hasCombat, hasProcess, hasGain].filter(Boolean).length * 26),
    evidence: [hasCombat ? '对抗动作' : '', hasProcess ? '过程链' : '', hasGain ? '展示收获' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '战斗/智斗没有过程链，或没有展示主角收获与爽点。',
    repair_instruction: delivered ? '' : '把打斗/智斗写成表演：起手、受阻、判断、反制、结果要清楚，并展示主角新能力/资源/认知如何改变局面。',
  }
}

export function normalizeShowdownWeakOverStrongCheck(values: any[], chapterText: string) {
  const planned = showdownArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const delivered = /信息差|环境|地形|铜纹|规则理解|心理博弈|诱使|引他|借[^。！？!?]{0,24}(?:势|力|地|阵)|代价|提前/.test(text)
  return {
    key: 'weak_over_strong',
    label: '以弱胜强逻辑',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : 40,
    evidence: delivered ? ['信息差/环境/心理博弈依据'] : [],
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '以弱胜强缺少信息差、环境利用、心理博弈或明确代价。',
    repair_instruction: delivered ? '' : '补以弱胜强依据：信息差、环境利用、心理博弈、规则理解或明确代价至少命中一项，不能让强敌降智送赢。',
  }
}

export function normalizeShowdownCounterplayCheck(values: any[], chapterText: string) {
  const planned = showdownArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasEarlyPreparation = /提前|早准备|预先|预设|后手|早预判|预判到|袖中|副阵|暗中/.test(text)
  const hasCounter = /预判反制|克制|针对|反制|B克制A|用B|准备B|压制那道|封住|避开/.test(text)
  const hasAntiCounter = /反预判|陷阱|引他|诱使|顺势|利用A|预设的B|落入|踩进|阵眼|反咬/.test(text)
  const hasHigherLayer = /更早一层|早一层|更高层|降维打击|掌控力|计谋|反派.*针对|主角.*利用/.test(text)
  const bruteOnly = /突然很厉害|直接赢了|硬碰硬赢了|靠实力碾压|莫名其妙赢了/.test(text) && !hasEarlyPreparation
  const delivered = !bruteOnly && hasEarlyPreparation && hasCounter && hasAntiCounter
  return {
    key: 'counterplay_layers',
    label: '三层破局',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : bruteOnly ? 16 : Math.max(28, [hasEarlyPreparation, hasCounter, hasAntiCounter, hasHigherLayer].filter(Boolean).length * 22),
    evidence: [
      hasEarlyPreparation ? '提前准备/后手可见' : '',
      hasCounter ? '预判反制可见' : '',
      hasAntiCounter ? '反预判/陷阱可见' : '',
      hasHigherLayer ? '计谋早一层/更高层信号' : '',
      bruteOnly ? '只靠突然变强/硬赢' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasEarlyPreparation ? '缺提前准备/后手' : '',
      !hasCounter ? '缺预判反制：反派出A，主角早准备B克制A' : '',
      !hasAntiCounter ? '缺反预判：反派针对A，主角利用A作陷阱引入预设B' : '',
      bruteOnly ? '强敌对抗只写成硬碰硬或突然变强' : '',
    ], 8),
    issue: delivered ? '' : '强敌破局层次不足：没有写出主角提前准备、预判反制和反预判陷阱，爽点容易变成硬赢。',
    repair_instruction: delivered ? '' : '补三层破局：反派出A，主角早准备B克制A；反派再针对A时，主角利用A作陷阱引他落入预设B。',
  }
}

export function normalizeShowdownEmotionRhythmCheck(values: any[], chapterText: string) {
  const planned = showdownArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasUrgentPressure = /逼|压|当众|认输|威胁|起哄|判签|压下|急/.test(text)
  const hasBuffer = /没有急|没有争辩|只看|判断|铺垫|短暂|等|看了一眼|扣进/.test(text)
  const hasRelease = /亮出|反制|压制|反咬|改判|破防|释放|当场/.test(text)
  const hasEcho = /余波|回响|群众|中间层|核心层|长老|下一章|新目标|追查|重审/.test(text)
  const delivered = hasUrgentPressure && hasBuffer && hasRelease && hasEcho
  return {
    key: 'emotion_rhythm',
    label: '情绪节奏',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(24, [hasUrgentPressure, hasBuffer, hasRelease, hasEcho].filter(Boolean).length * 22),
    evidence: [hasUrgentPressure ? '急压迫' : '', hasBuffer ? '缓判断/铺垫' : '', hasRelease ? '急释放' : '', hasEcho ? '回响/新钩子' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '情绪节奏没有形成急 -> 缓 -> 急，并缺少释放后的回响或新钩子。',
    repair_instruction: delivered ? '' : '按急-缓-急修复：先压迫，再短暂判断/铺垫，最后集中释放；释放后给群众、对手、核心人物和下一目标的回响。',
  }
}

export function showdownPriority(missed: any[], explicitKeys = new Set<string>()) {
  const hasMissed = (key: string) => missed.some(item => item.key === key)
  const hasExplicitMissed = (key: string) => explicitKeys.has(key) && hasMissed(key)
  if (hasMissed('trump_card_reserve')) return '优先补底牌管理'
  if (hasExplicitMissed('counterplay_layers')) return '优先补三层破局'
  if (hasExplicitMissed('three_pressure_shock')) return '优先补三压一爆三震'
  if (hasExplicitMissed('payoff_release')) return '优先补爽点释放'
  if (hasMissed('counterplay_layers')) return '优先补三层破局'
  if (hasMissed('three_pressure_shock')) return '优先补三压一爆三震'
  if (hasMissed('payoff_release')) return '优先补爽点释放'
  if (missed.some(item => item.key === 'showdown_forbidden')) return '优先修高潮毒点'
  if (missed.some(item => item.key === 'transmission_channel')) return '优先补传递通道'
  if (missed.some(item => item.key === 'stage_chain')) return '优先补舞台层级'
  if (missed.some(item => item.key === 'shock_chain')) return '优先补震惊分层'
  if (missed.some(item => item.key === 'combat_design')) return '优先补战斗/智斗过程'
  if (missed.some(item => item.key === 'weak_over_strong')) return '优先补以弱胜强依据'
  if (missed.some(item => item.key === 'emotion_rhythm')) return '优先补急缓急节奏'
  return ''
}
