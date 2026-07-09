import { countProseChars } from './word-target'

function compactBriefText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function isLikelyChapterTitleLine(line: string) {
  return /^#{0,6}\s*第[一二三四五六七八九十百千万两0-9]+章(?:\s|$|[：:《「【_ -])/.test(String(line || '').trim())
}

function proseBodyWithoutTitleLine(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  if (firstContentLine >= 0 && isLikelyChapterTitleLine(lines[firstContentLine])) {
    lines.splice(firstContentLine, 1)
  }
  return lines.join('\n').trim()
}

function proseParagraphsWithoutTitle(text: string) {
  return proseBodyWithoutTitleLine(text)
    .split(/\n\s*\n+/)
    .map(paragraph => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

const DOWNWARD_PRESSURE_PATTERN = /当众|撕碎|羞辱|嘲笑|冷笑|逼|威胁|不配|资格(?:冻结|取消|作废)|记过|开除|淘汰|惩罚|失去|没资格|滚出去|闭嘴|跪下|认错|道歉|背锅|顶罪|陷害|诬陷|污蔑|资料(?:踢|扔|摔)|申请表|失败|完了|没有(?:一个人|人)?替|孤立|所有人(?:都)?(?:笑|看着|沉默)/
const DOWNWARD_SAFETY_PATTERN = /录音|红点|监控|备份|证据|报告|线索|名单|档案|暗牌|底牌|准备|提前|早就|没有争辩|没说话|冷静|笑了|按住|压住|藏|手机|袖口|口袋|递眼色|点头|张智|同伴|盟友|帮|救|反击|举报|公开视频|直播|倒计时|机会|下一步|办法|出口|钥匙|规则漏洞|漏洞|权限|备选|后手|计划/

export function paragraphHasDownwardPressure(paragraph: string) {
  DOWNWARD_PRESSURE_PATTERN.lastIndex = 0
  return DOWNWARD_PRESSURE_PATTERN.test(String(paragraph || ''))
}

export function textHasDownwardSafetySignal(text: string) {
  DOWNWARD_SAFETY_PATTERN.lastIndex = 0
  return DOWNWARD_SAFETY_PATTERN.test(String(text || ''))
}

export function scanDownwardSafetyRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 12)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index <= paragraphs.length - 3; index += 1) {
    const window = paragraphs.slice(index, index + 3)
    if (window.filter(paragraphHasDownwardPressure).length < 2) continue
    const safetyWindow = paragraphs.slice(Math.max(0, index - 1), Math.min(paragraphs.length, index + 4)).join(' ')
    if (textHasDownwardSafetySignal(safetyWindow)) continue
    hits.push({
      key: `downward_without_safety_${index + 1}_${index + 3}`,
      label: '下行情节安全感扫描',
      status: 'warn',
      evidence: `第${index + 1}-${index + 3}段连续下压但缺少安全感信号：${compactBriefText(window.join(' '), 280)}`,
      fix: '按 oh-story 下行情节安全原则修复：锅是别人的，功是主角的；下压时必须给读者可能的解法、潜在收获、暗牌/证据/盟友动作/规则漏洞，或明确反派责任，避免只让主角受辱受损。',
    })
    break
  }
  return hits
}

const OPPRESSION_PRESSURE_PATTERN = /逼(?:他|她|主角|[一-龥]{2,4})?(?:跪|认罪|认输|交出|低头|道歉)|跪下|滚出|滚开|废物|羞辱|辱骂|嘲笑|哄笑|讥笑|栽赃|污蔑|当众[^。！？!?]{0,24}(?:骂|羞辱|审问|逼问)|摔[^。！？!?]{0,24}脚边|压(?:他|她|主角|[一-龥]{2,4})|威胁|逼问/
const OPPRESSION_PURPOSE_SIGNAL_PATTERN = /反击|反制|反压|翻盘|打脸|爆发|回击|还手|亮出|拿出|摊开|推上|递交|公开|提交|上传|发送|触发|证据|录音|监控|报告|账册|账本|名单|暗牌|底牌|红点|线索|漏洞|破绽|信息|发现|确认|逼[^。！？!?]{0,24}(?:承认|解释|自爆|露怯|否认)|没有跪|不跪|抬头|冷静|选择|决定|代价|收益|拿到|夺回|新目标|下一步/

export function paragraphHasOppressionPressure(paragraph: string) {
  OPPRESSION_PRESSURE_PATTERN.lastIndex = 0
  return OPPRESSION_PRESSURE_PATTERN.test(String(paragraph || ''))
}

function paragraphHasOppressionPurposeSignal(paragraph: string) {
  OPPRESSION_PURPOSE_SIGNAL_PATTERN.lastIndex = 0
  return OPPRESSION_PURPOSE_SIGNAL_PATTERN.test(String(paragraph || ''))
}

export function scanOppressionPurposeRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 12)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index <= paragraphs.length - 3; index += 1) {
    const window = paragraphs.slice(index, Math.min(paragraphs.length, index + 4))
    if (window.filter(paragraphHasOppressionPressure).length < 2) continue
    if (window.some(paragraphHasOppressionPurposeSignal)) continue
    hits.push({
      key: `oppression_without_purpose_${index + 1}_${index + window.length}`,
      label: '压制目的扫描',
      status: 'warn',
      evidence: `第${index + 1}-${index + window.length}段有连续压制但缺少后续用途：${compactBriefText(window.join(' '), 280)}`,
      fix: '按 oh-story 毒点检查修复：压制必须服务后续爆发、反击、信息收益、选择代价或关系变化；补主角暗牌/证据/反问/行动计划，或把纯羞辱压缩成可触发爽点的压力。',
    })
    break
  }
  return hits
}

const PAYOFF_BEAT_PATTERN = /打脸|反击|翻盘|赢了|赢下|认输|低头|闭嘴|脸色(?:发白|惨白|铁青|难看)|震惊|哗然|倒吸(?:一口)?凉气|真相(?:公开|揭开|曝光|大白)|证据|报告|录音|监控|名单|当众|公开|大屏/
const PAYOFF_ESCALATION_PATTERN = /(?:个人|同桌|同学|班里|全班|全校|全网|直播|平台|社会|行业|家族|公司|集团|官方|警局|法院|校董会|董事会|协会|委员会|院长|会长|主任|专家|主考官|负责人|大佬|高层|权威|导师|评委|记者|媒体|校董|老板)|(?:证明|意味着|代表|显示|暴露|揭开|牵出|指向|重构|推翻|改写|升级|扩大|加重|翻倍|三倍|更高|更致命|更大|背后|本质|根源|交易|黑幕|规则|资格|权限|身份|排名|记录|调查|处分|开除|封杀|逮捕|追责|赔偿|失去资格|死亡|清除|惩罚|代价|下一轮|新名单|新规则)/
const PAYOFF_DENSITY_SIGNAL_PATTERN = /信息增量|小回收|回收|爽点|回报|兑现|发现|确认|揭开|解锁|拿到|获得|夺回|洗清|证明|反制|反击|翻盘|打脸|赢|胜|突破|升级|改口|失态|救下|支持|站到|关系(?:变化|推进|质变)|态度(?:变化|转变)|线索|证据|报告|名单|规则(?:漏洞|缺口|改写|脉络)|漏洞|缺口|收益|奖励|阶段结算|(?:秩序)?核心|令牌|封锁令|通行资格|临时资格|权限(?:进度|资格|缺口|变化)?|降临进度|定名|异常者|因果(?:锁死)?|命格(?:称量)?|夺舍容器|外神规则|身份(?:接管|真相|落差|资格|确认|暴露)|判定[:：]?\s*凡人|理智值|灵能波动|天平(?:停平|判定|规则)|规则[^。！？!?]{0,16}反锁|被迫让开|让开道路|称量(?:完了|生效|结果|出)|主祭[^。！？!?]{0,18}礼物/

function paragraphHasPayoffBeat(paragraph: string) {
  PAYOFF_BEAT_PATTERN.lastIndex = 0
  return PAYOFF_BEAT_PATTERN.test(String(paragraph || ''))
}

function paragraphHasPayoffEscalation(paragraph: string) {
  PAYOFF_ESCALATION_PATTERN.lastIndex = 0
  return PAYOFF_ESCALATION_PATTERN.test(String(paragraph || ''))
}

function paragraphHasPayoffDensitySignal(paragraph: string) {
  const text = String(paragraph || '')
  PAYOFF_DENSITY_SIGNAL_PATTERN.lastIndex = 0
  return paragraphHasPayoffBeat(text) || PAYOFF_DENSITY_SIGNAL_PATTERN.test(text)
}

export function scanPayoffDensityRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 8)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  let gap: Array<{ paragraph: string; index: number; chars: number }> = []
  let gapChars = 0
  const flush = () => {
    if (hits.length > 0 || gapChars < 800 || gap.length < 2) {
      gap = []
      gapChars = 0
      return
    }
    hits.push({
      key: `payoff_density_gap_${gap[0].index}_${gap[gap.length - 1].index}`,
      label: '回报密度扫描',
      status: 'warn',
      evidence: `第${gap[0].index}-${gap[gap.length - 1].index}段连续约${gapChars}字缺少可见读者回报：${compactBriefText(gap.map(item => item.paragraph).join(' '), 260)}`,
      fix: '按 oh-story 连载节奏修复：每 800-1200字至少交付一次信息增量、冲突转折、爽点兑现、能力展示、关系变化或小回收；把无回报长段改成可见发现、反制结果、收益结算、关系推进或章末新期待。',
    })
    gap = []
    gapChars = 0
  }
  paragraphs.forEach((paragraph, index) => {
    if (paragraphHasPayoffDensitySignal(paragraph)) {
      flush()
      return
    }
    const chars = countProseChars(paragraph)
    gap.push({ paragraph, index: index + 1, chars })
    gapChars += chars
  })
  flush()
  return hits
}

export function scanPayoffEscalationRisks(text: string) {
  const payoffBeats = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 12)
    .map((paragraph, index) => ({
      paragraph,
      index: index + 1,
      isPayoff: paragraphHasPayoffBeat(paragraph),
      hasEscalation: paragraphHasPayoffEscalation(paragraph),
    }))
    .filter(item => item.isPayoff)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index <= payoffBeats.length - 3; index += 1) {
    const window = payoffBeats.slice(index, index + 3)
    const span = window[window.length - 1].index - window[0].index
    if (span > 5 || window.some(item => item.hasEscalation)) continue
    hits.push({
      key: `payoff_escalation_flat_${window[0].index}_${window[window.length - 1].index}`,
      label: '爽点递增扫描',
      status: 'warn',
      evidence: `第${window[0].index}-${window[window.length - 1].index}段连续爽点但缺少递增维度：${compactBriefText(window.map(item => item.paragraph).join(' '), 280)}`,
      fix: '按 oh-story 爽点递增对比修复：连续爽点必须逐级增加影响范围、揭示深度或身份落差；把重复的“震惊/打脸/赢了”改成个人 -> 群体 -> 权威/社会层面的扩散，或从表象证据推进到本质黑幕、规则改写、代价升级和新期待。',
    })
    break
  }
  return hits
}

const TRUMP_CARD_REVEAL_PATTERN = /(?:亮出|拿出|摊开|发动|激活|开启|祭出|暴露|揭开|放出|催动|启动)[^。！？!?]{0,32}(?:底牌|金手指|系统|面板|技能|能力|血脉|神通|阵法|残阵|符箓|外挂|超人力量|规则漏洞|杀招|王牌|旧印|玉牌)|(?:底牌|金手指|系统|面板|技能|能力|血脉|神通|阵法|残阵|符箓|外挂|超人力量|规则漏洞|杀招|王牌|旧印|玉牌)[^。！？!?]{0,32}(?:亮起|弹出|发动|激活|开启|显形|启动|运转|展开|出现)/
const TRUMP_CARD_EFFECT_PATTERN = /压制|反制|破防|扭转|翻盘|破局|制服|击退|逼退|退后|倒退|跪|吐血|受伤|裂开|崩碎|熄灭|失效|封住|破开|打开|解锁|改写|刷新|刷新记录|提升|升级|获得|拿到|夺回|通过|脸色(?:发白|惨白|铁青|难看|变了)|震惊|哗然|倒吸(?:一口)?凉气|站起身|闭嘴|沉默|不敢|反应不过来|第一次|当场|众人|台下|主考官|长老|权威|专家|记录|榜单|阵图|规则/
const TRUMP_CARD_BACKFIRE_PATTERN = /不过如此|仅此而已|没用|垃圾|废物|看不懂|反而[^。！？!?]{0,36}(?:逼退|打伤|揍|压住|击飞|打飞|反打)|不仅没[^。！？!?]{0,36}(?:压制|制服|奏效)|没(?:有)?(?:效果|作用|反应)/

export function scanTrumpCardEffectRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 12)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index]
    TRUMP_CARD_REVEAL_PATTERN.lastIndex = 0
    if (!TRUMP_CARD_REVEAL_PATTERN.test(paragraph)) continue
    const window = paragraphs.slice(index, Math.min(paragraphs.length, index + 4))
    const windowText = window.join(' ')
    TRUMP_CARD_BACKFIRE_PATTERN.lastIndex = 0
    const backfire = TRUMP_CARD_BACKFIRE_PATTERN.test(windowText)
    if (backfire) {
      hits.push({
        key: `trump_card_effect_missing_${index + 1}`,
        label: '底牌效果扫描',
        status: 'warn',
        evidence: `第${index + 1}段亮出底牌/金手指但缺少清晰效果：${compactBriefText(windowText, 280)}`,
        fix: '按 oh-story 爽点释放修复：金手指或底牌放出后不能立刻变成“不过如此/被反打”；必须写出反派受到对应压制、场面扭转、规则被反制、观众分层反应或可见收益，先落清楚效果，再引入更高门槛。',
      })
      break
    }
    TRUMP_CARD_EFFECT_PATTERN.lastIndex = 0
    if (TRUMP_CARD_EFFECT_PATTERN.test(windowText)) continue
    hits.push({
      key: `trump_card_effect_missing_${index + 1}`,
      label: '底牌效果扫描',
      status: 'warn',
      evidence: `第${index + 1}段亮出底牌/金手指但缺少清晰效果：${compactBriefText(windowText, 280)}`,
      fix: '按 oh-story 爽点释放修复：金手指/底牌效果必须展示清楚；补反派破防、受伤/退让、规则失效、记录刷新、旁观者震惊、阶段收益或新门槛，证明这次出手改变了局势。',
    })
    break
  }
  return hits
}
