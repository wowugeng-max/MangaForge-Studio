import { countProseChars } from './word-target'

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

const OPENING_SCENERY_OR_DAILY_PATTERN = /清晨|黄昏|夜色|夜晚|阳光|晨光|月光|天空|云|风|雨|雪|街道|城市|山林|院子|窗外|教学楼|操场|安静|平静|日常|照常|像往常一样|普通的一天/
const OPENING_HOOK_SIGNAL_PATTERN = /死|血|痛|伤|尸|刀|枪|火|爆炸|撞|追|逃|杀|危险|禁止|规则|警报|广播|倒计时|失控|突然|必须|不能|威胁|逼|发现|选择|代价|冲突|问题|门响|敲门|尖叫|喊|吼|问|[？！!?“「]/
const OPENING_EVENT_CLAUSE_PATTERN = /[“「]|死|血|痛|伤|尸|爆炸|撞|追|逃|杀|救|广播(?:响|炸|停|变)|警报(?:响|亮|炸)|铃声(?:响|炸)|倒计时(?:开始|归零|跳)|门(?:响|开|关|撞)|敲门|尖叫|喊|吼|问|答|说|抓|握|按|推|拉|撕|砸|踢|冲|跑|退|躲|跪|倒|站|抬|低|转身|打开|关上|掉|落|响|亮|熄|出现|消失|露出|发现|看见|听见|递|拿|放|抢|夺|拦|阻止|威胁|逼|选择|决定|规则触发|必须|不能|否则|如果|[？！!?]/
const OPENING_PROTAGONIST_ACTION_PATTERN = /(?:我|他|她|少年|少女|男人|女人|孩子|学生|弟子|队长|警员|医生|老师|父亲|母亲|哥哥|姐姐|妹妹|弟弟|[赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹][一-龥]{1,3})(?:[^。！？!?]{0,18})(?:醒|坐起|站起|抬头|低头|睁眼|闭眼|回头|转身|伸手|抓|握|按|推|拉|跑|冲|退|躲|跪|看见|听见|发现|开口|说道|问|喊|吼|笑|咬|攥|拿|递|打开|关上|盯|望|摸|踢|撞|撕|挡|拦|选择|决定)/
const OPENING_NON_PROTAGONIST_SUBJECT_PATTERN = /^(?:广播|警报|铃声|校规|规则|名单|红光|黑点|钟声|楼梯|安全门|规则册|惩罚栏|雨水|风|门|窗|灯|走廊|教学楼|宿舍|城市|天空|月光|阳光)/

export function scanOpeningHookRisks(text: string) {
  const body = proseBodyWithoutTitleLine(text)
  const first100 = body.replace(/\s+/g, '').slice(0, 100)
  const openingLead = body.split(/[。！？!?]/)[0]?.replace(/\s+/g, '').slice(0, 120) || first100
  const evidence = body.replace(/\s+/g, ' ').slice(0, 220).trim()
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  if (!body) return hits

  OPENING_SCENERY_OR_DAILY_PATTERN.lastIndex = 0
  OPENING_HOOK_SIGNAL_PATTERN.lastIndex = 0
  if (OPENING_SCENERY_OR_DAILY_PATTERN.test(openingLead) && !OPENING_HOOK_SIGNAL_PATTERN.test(openingLead)) {
    hits.push({
      key: 'opening_scenery_or_daily_start',
      label: '开篇钩子扫描',
      status: 'warn',
      evidence,
      fix: '前100字改成异常、危险、选择、冲突、对话逼问或规则触发；天气/风景/日常只能跟着动作和危机出现。',
    })
  }

  OPENING_HOOK_SIGNAL_PATTERN.lastIndex = 0
  if (!OPENING_HOOK_SIGNAL_PATTERN.test(first100)) {
    hits.push({
      key: 'opening_hook_deadline',
      label: '开篇钩子扫描',
      status: 'warn',
      evidence,
      fix: '前100字必须落下可感知的问题、危险、动作、对话交锋或反常信息，不能等到铺垫后才开故事。',
    })
  }
  return hits
}

export function scanOpeningFirst50ConflictRisks(text: string) {
  const body = proseBodyWithoutTitleLine(text)
  const first50 = body.replace(/\s+/g, '').slice(0, 50)
  if (!body || countProseChars(first50) < 30) return []
  OPENING_HOOK_SIGNAL_PATTERN.lastIndex = 0
  if (OPENING_HOOK_SIGNAL_PATTERN.test(first50)) return []
  return [{
    key: 'opening_first50_conflict_missing',
    label: '前50字冲突异常扫描',
    status: 'warn' as const,
    evidence: `前 50 字：${first50}`,
    fix: '按 oh-story 开头速查修复：前 50 字必须出现冲突、异常、危险、欲望、对话逼问、规则触发或反常信息；不要把天气、环境、走路、醒来、日常动作放在第一钩子前面。',
    source: 'oh_story_opening_first50_conflict',
  }]
}

export function scanOpeningEventDensityRisks(text: string) {
  const body = proseBodyWithoutTitleLine(text)
  const first100 = body.replace(/\s+/g, '').slice(0, 100)
  const evidence = body.replace(/\s+/g, ' ').slice(0, 220).trim()
  if (!body || countProseChars(first100) < 40) return []
  const eventClauses = first100
    .split(/[。！？!?；;，,]/)
    .map(clause => clause.trim())
    .filter(clause => {
      if (!clause) return false
      OPENING_EVENT_CLAUSE_PATTERN.lastIndex = 0
      return OPENING_EVENT_CLAUSE_PATTERN.test(clause)
    })
  const eventCount = eventClauses.length
  if (eventCount >= 3) return []
  return [{
    key: 'opening_event_density_low',
    label: '开篇事件密度扫描',
    status: 'warn' as const,
    evidence: `前100字事件数 ${eventCount}：${evidence}`,
    fix: '按 oh-story writing-craft 重写前100字：至少 3 个事件信号，不做背景铺垫；用异常、动作、对话、规则触发、危险、选择或信息变化直接形成事件链。',
  }]
}

export function scanOpeningProtagonistDelayRisks(text: string) {
  const body = proseBodyWithoutTitleLine(text)
  const compactOpening = body.replace(/\s+/g, '').slice(0, 300)
  const evidence = body.replace(/\s+/g, ' ').slice(0, 360).trim()
  if (!body || countProseChars(compactOpening) < 120) return []
  const clauses = compactOpening
    .split(/[。！？!?；;]/)
    .map(clause => clause.trim())
    .filter(Boolean)
  const protagonistClause = clauses.find(clause => {
    OPENING_NON_PROTAGONIST_SUBJECT_PATTERN.lastIndex = 0
    if (OPENING_NON_PROTAGONIST_SUBJECT_PATTERN.test(clause)) return false
    OPENING_PROTAGONIST_ACTION_PATTERN.lastIndex = 0
    return OPENING_PROTAGONIST_ACTION_PATTERN.test(clause)
  })
  if (protagonistClause) return []
  return [{
    key: 'opening_protagonist_delayed',
    label: '开篇主角登场扫描',
    status: 'warn' as const,
    evidence: `前300字缺少主角动作锚点：${evidence}`,
    fix: '按 oh-story 开篇检查重写：主角必须在前300字内用可见动作、选择、身体反应或对白进入现场；规则、天气、背景和异常物件要贴着主角动作展开。',
  }]
}
