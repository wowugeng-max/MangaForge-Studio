import { countProseChars } from './word-target'

function compactBriefText(value: any, limit = 500) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim().slice(0, limit)
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function proseBodyWithoutTitleLine(text: string) {
  return String(text || '').replace(/^第[^\n]{1,40}\n+/, '').trim()
}

function proseParagraphsWithoutTitle(text: string) {
  return proseBodyWithoutTitleLine(text)
    .split(/\n\s*\n+/)
    .map(paragraph => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

const CROWD_ONLY_SHOCK_PATTERN = /(?:全场|所有人|众人|现场|台下|人群|大家|四周|周围|满场|全班|全校|全网|弹幕)[^。！？!?]{0,28}(?:震惊|惊呆|傻眼|哗然|倒吸(?:一口)?凉气|面面相觑|鸦雀无声|炸开|沸腾)|(?:震惊|惊呆|傻眼|哗然|倒吸(?:一口)?凉气|面面相觑|鸦雀无声)[^。！？!?]{0,28}(?:全场|所有人|众人|现场|台下|人群|大家|全班|全校|全网|弹幕)/
const LAYERED_OBSERVER_PATTERN = /(?:教授|老师|主任|院长|会长|长老|宗师|专家|评委|裁判|鉴定师|医生|律师|警官|检察官|管理员|总裁|老板|高管|队长|前辈|导师|行家|同行|内行|副手|主管|导演|编剧|制片|主考|考官|首席|负责人|掌门|族长|长官|司令|将军|记者|主持人|评论员|分析师)/
const SHOCK_INFORMATION_REVEAL_PATTERN = /(?:意味着|代表|证明|显示|暴露|揭开|说明|只有|至少|排名|记录|真相|身份|资格|证据|数据|数值|报告|名单|档案|来源|原来|因为|难怪|比[^。！？!?]{0,16}(?:更|还)|从业|专业|行内|业内)/

function paragraphHasCrowdOnlyShock(paragraph: string) {
  CROWD_ONLY_SHOCK_PATTERN.lastIndex = 0
  return CROWD_ONLY_SHOCK_PATTERN.test(String(paragraph || ''))
}

function paragraphHasLayeredShockPayoff(paragraph: string) {
  const text = String(paragraph || '')
  LAYERED_OBSERVER_PATTERN.lastIndex = 0
  SHOCK_INFORMATION_REVEAL_PATTERN.lastIndex = 0
  return LAYERED_OBSERVER_PATTERN.test(text) || SHOCK_INFORMATION_REVEAL_PATTERN.test(text)
}

export function scanShockLayeringRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 12)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index]
    if (!paragraphHasCrowdOnlyShock(paragraph)) continue
    const payoffWindow = paragraphs.slice(index, Math.min(paragraphs.length, index + 2)).join(' ')
    if (paragraphHasLayeredShockPayoff(payoffWindow)) continue
    hits.push({
      key: `shock_layering_crowd_only_${index + 1}`,
      label: '震惊分层扫描',
      status: 'warn',
      evidence: `第${index + 1}段只有群体震惊，缺少分层围观者或信息揭示：${compactBriefText(payoffWindow, 240)}`,
      fix: '按 oh-story 围观者质量层级修复：不要只写“全场震惊/众人哗然”；补懂行者、权威者、熟人或反派的差异化反应，并让反应带出专业对比、关系变化、信息揭示或下一层期待。',
    })
    break
  }
  return hits
}

const PUBLIC_PAYOFF_CONTEXT_PATTERN = /当众|公开|全场|众人|旁观者|围观|群众|旁听席|审判庭|公审|会场|台下|长老席|客户|协会|直播|弹幕/
const PAYOFF_REVEAL_CONTEXT_PATTERN = /打脸|反打|反证|证明|揭露|揭开|真相|证据|报告|账册|证人|改口|倒向|反转|底牌|压制|露馅|公开/
const UNIFIED_SPECTATOR_REACTION_PATTERN = /(?:全场|众人|所有人|大家|旁观者|围观者|现场|台下)[^。！？!?]{0,24}(?:震惊|哗然|倒吸|愣住|沉默|鸦雀无声|说不出话|面面相觑)/
const SPECTATOR_LAYER_PATTERNS: Array<{ key: string; pattern: RegExp }> = [
  { key: 'public', pattern: /旁听席|商户|群众|弟子|学生|客户|弹幕|台下|普通人|围观者|起哄|喊|议论|停住|闭嘴|不敢/ },
  { key: 'expert', pattern: /账房|老吏|阵师|长老|主考官|医师|审计|专家|懂行|专业|核对|复盘|看懂|算盘|规则|墨色|数值/ },
  { key: 'authority', pattern: /长老席|审判官|会长|主考官|裁判|执法|协会|判签|当场改判|重审|记录/ },
  { key: 'antagonist', pattern: /反派|对手|执事|周薄森|会长|质疑者|指控者|脸色|发白|后退|退了半步|破防|改口|露馅|按住/ },
  { key: 'ally', pattern: /熟人|同盟|林青禾|伙伴|亲人|旁边的人|证人|愿意作证|站出来|点头|拉住/ },
]
const DIFFERENTIATED_REACTION_PATTERN = /停住|闭嘴|不敢|低声|核对|复盘|看懂|改口|后退|退了半步|脸色|发白|作证|站出来|点头|倒向|让开|沉默|按住|拨回|重审|当场改判|破防|露馅|追问|质疑/

function hasPublicPayoffContext(text: string) {
  PUBLIC_PAYOFF_CONTEXT_PATTERN.lastIndex = 0
  PAYOFF_REVEAL_CONTEXT_PATTERN.lastIndex = 0
  const normalized = String(text || '')
  return PUBLIC_PAYOFF_CONTEXT_PATTERN.test(normalized) && PAYOFF_REVEAL_CONTEXT_PATTERN.test(normalized)
}

function differentiatedSpectatorLayerCount(text: string) {
  const normalized = String(text || '')
  return SPECTATOR_LAYER_PATTERNS.filter(layer => {
    layer.pattern.lastIndex = 0
    DIFFERENTIATED_REACTION_PATTERN.lastIndex = 0
    return layer.pattern.test(normalized) && DIFFERENTIATED_REACTION_PATTERN.test(normalized)
  }).length
}

export function scanSpectatorReactionDifferentiationRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 12)
  const fullText = paragraphs.join('\n')
  if (!hasPublicPayoffContext(fullText)) return []
  const layerCount = differentiatedSpectatorLayerCount(fullText)
  if (layerCount >= 2) return []
  const unifiedParagraph = paragraphs.find(paragraph => {
    UNIFIED_SPECTATOR_REACTION_PATTERN.lastIndex = 0
    return UNIFIED_SPECTATOR_REACTION_PATTERN.test(paragraph)
  })
  const payoffParagraph = paragraphs.find(paragraph => hasPublicPayoffContext(paragraph)) || paragraphs[0] || ''
  const key = unifiedParagraph ? 'spectator_reaction_unified' : 'spectator_reaction_missing'
  return [{
    key,
    label: '围观反应分层',
    status: 'warn' as const,
    evidence: compactBriefText(unifiedParagraph || payoffParagraph, 240),
    fix: '按 oh-story 信息差×人际×情绪修复：公开打脸/揭露/高潮不能只写“全场震惊”；补普通人、懂行者、权威者、熟人或反派至少两层差异化反应，并让每层反应基于自身利益和目标改变立场、判断或下一步行动。',
  }]
}

export function buildSpectatorReactionSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const risks = scanSpectatorReactionDifferentiationRisks(chapterText)
  const missed = risks.map((item: any) => ({
    ...item,
    text: item.evidence,
    expected: item.fix,
    delivered: false,
  }))
  const missedCount = missed.length
  const status = missedCount > 0 ? 'warn' : 'ok'
  const publicPayoff = hasPublicPayoffContext(proseParagraphsWithoutTitle(chapterText).join('\n'))

  return {
    report_id: `spectator-reaction-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score: status === 'ok' ? 88 : 54,
    status,
    label: status === 'ok' ? '围观反应 OK' : `围观反应缺口 ${missedCount}`,
    summary: status === 'ok'
      ? publicPayoff
        ? '公开打脸/揭露/高潮场景已有至少两层基于利益目标的差异化围观反应。'
        : '本章没有触发公开打脸/揭露/高潮围观反应检查。'
      : `公开打脸/揭露/高潮场景有 ${missedCount} 项围观反应缺口，需要补普通人、懂行者、权威者、熟人或反派的差异化反应。`,
    missed_count: missedCount,
    priority_repair: missedCount > 0 ? '优先补围观反应' : '',
    planned_count: publicPayoff ? 1 : 0,
    delivered_count: status === 'ok' && publicPayoff ? 1 : 0,
    planned: publicPayoff ? [{
      key: 'spectator_reaction_layers',
      label: '围观反应分层',
      text: '公开打脸/揭露/高潮要有至少两层差异化在场反应',
      expected: '公开打脸/揭露/高潮要有至少两层差异化在场反应',
    }] : [],
    delivered: status === 'ok' && publicPayoff ? [{
      key: 'spectator_reaction_layers',
      label: '围观反应分层',
      text: '已出现至少两层差异化在场反应',
      expected: '已出现至少两层差异化在场反应',
      delivered: true,
      status: 'ok',
    }] : [],
    missed,
    next_actions: status === 'ok'
      ? ['保持围观反应分层：公开打脸、揭露和高潮场景继续让普通人、懂行者、权威者、熟人或反派按自身利益产生不同反应。']
      : [
          '下一章必须补围观反应：公开打脸/揭露/高潮后，至少写普通人、懂行者、权威者、熟人或反派中的两层差异化反应。',
          '每层反应必须改变立场、判断、证词、压迫关系或下一步行动，不能只写“全场震惊/众人哗然”。',
        ],
  }
}

const PAYOFF_SIGNAL_PATTERN = /(?:当众)?打脸|真相(?:公开|揭开|曝光|大白)|反转|反证|证据(?:摆|甩|拿|公开|曝光|链)|(?:检测|鉴定|审计|验伤|转账|亲子鉴定)?报告|录音|监控|视频|截图|名单|档案|遗嘱|死亡证明|聊天记录|偷拍视频|公开视频/
const PAYOFF_SETUP_PATTERN = /提前|早就|昨晚|之前|事先|预先|留下|埋下|伏笔|线索|暗牌|藏着|藏好|准备|备份|保存|收集|查到|拿到|带出|压在|录音键|红点|档案室|检测报告|鉴定报告|监控|视频|截图|名单|档案|遗嘱|证据|报告|录音/

function paragraphHasPayoffSignal(paragraph: string) {
  PAYOFF_SIGNAL_PATTERN.lastIndex = 0
  return PAYOFF_SIGNAL_PATTERN.test(String(paragraph || ''))
}

function textHasPayoffSetup(text: string) {
  PAYOFF_SETUP_PATTERN.lastIndex = 0
  return PAYOFF_SETUP_PATTERN.test(String(text || ''))
}

export function scanPayoffSetupRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 12)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index < paragraphs.length; index += 1) {
    if (index < 2 || !paragraphHasPayoffSignal(paragraphs[index])) continue
    const priorWindow = paragraphs.slice(Math.max(0, index - 6), index).join(' ')
    if (textHasPayoffSetup(priorWindow)) continue
    hits.push({
      key: `payoff_without_setup_${index + 1}`,
      label: '爽点铺垫扫描',
      status: 'warn',
      evidence: `第${index + 1}段出现证据/打脸/反转兑现，但前文缺少可见铺垫：${compactBriefText(paragraphs[index], 240)}`,
      fix: '按 oh-story 证据链和反转规则修复：爽点不能凭空掉下来；在兑现前补线索、暗牌、录音/报告来源、角色提前准备、反派得意误判或可回看的物件细节，让打脸和真相公开有铺垫、有递进、有可信代价。',
    })
    break
  }
  return hits
}

export function buildPayoffSetupSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const risks = scanPayoffSetupRisks(chapterText)
  const missed = risks.map((item: any) => ({
    ...item,
    text: item.evidence,
    expected: item.fix,
    delivered: false,
  }))
  const missedCount = missed.length
  const status = missedCount > 0 ? 'warn' : 'ok'

  return {
    report_id: `payoff-setup-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score: status === 'ok' ? 88 : 56,
    status,
    label: status === 'ok' ? '爽点铺垫 OK' : `爽点铺垫缺口 ${missedCount}`,
    summary: status === 'ok'
      ? '正文没有发现凭空掉下来的证据、打脸或反转兑现；爽点前已有可回看的铺垫。'
      : `正文有 ${missedCount} 处证据/打脸/反转兑现前缺少可指认的危机、期待、暗牌或来源铺垫。`,
    missed_count: missedCount,
    priority_repair: missedCount > 0 ? '优先补爽点铺垫' : '',
    planned_count: missedCount > 0 ? missedCount : 1,
    delivered_count: status === 'ok' ? 1 : 0,
    planned: missedCount > 0 ? missed : [{
      key: 'payoff_setup_guard',
      label: '爽点铺垫',
      text: '证据/打脸/反转兑现前必须有可回看的危机、期待、暗牌或来源铺垫',
      expected: '证据/打脸/反转兑现前必须有可回看的危机、期待、暗牌或来源铺垫',
    }],
    delivered: status === 'ok' ? [{
      key: 'payoff_setup_guard',
      label: '爽点铺垫',
      text: '爽点兑现前已有可回看的铺垫',
      expected: '爽点兑现前已有可回看的铺垫',
      delivered: true,
      status: 'ok',
    }] : [],
    missed,
    next_actions: status === 'ok'
      ? ['保持爽点铺垫：证据、打脸、反转或真相公开前继续先落下危机、期待、暗牌、来源或反派误判。']
      : [
          '下一章必须补爽点铺垫：先写可指认的危机、期待、线索、暗牌、录音/报告来源、角色提前准备或反派得意误判，再兑现打脸和真相公开。',
          '修订时不要只补一句解释；要把铺垫写成前文可回看的物件细节、行动准备、信息差或对手压迫。',
        ],
  }
}
