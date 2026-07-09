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

const SUSPENSE_THREAT_SIGNAL_PATTERN = /广播|警报|倒计时|十秒|三秒|失败者|清除|抹杀|惩罚|死亡|死|血|红光|警告|禁止|违规|必须|不能|否则|如果|危机|危险|威胁|裂缝|追|杀|抓|刀|枪/
const SUSPENSE_FALSE_RELEASE_PATTERN = /(?:不过|只是|原来|结果|其实|没想到|很快)[^。！？!?]{0,28}(?:误报|虚惊一场|没事|无事发生|自己(?:熄灭|消失|停下|恢复)|自动(?:解除|关闭|恢复)|已经(?:解决|结束|安全)|不用担心|松了(?:一口气|口气)|放心)|(?:危险|警报|红光|倒计时|威胁)[^。！？!?]{0,18}(?:消失|解除|结束|停下|熄灭|恢复正常)/

function paragraphHasSuspenseThreat(paragraph: string) {
  SUSPENSE_THREAT_SIGNAL_PATTERN.lastIndex = 0
  return SUSPENSE_THREAT_SIGNAL_PATTERN.test(String(paragraph || ''))
}

function paragraphHasFalseSuspenseRelease(paragraph: string) {
  SUSPENSE_FALSE_RELEASE_PATTERN.lastIndex = 0
  return SUSPENSE_FALSE_RELEASE_PATTERN.test(String(paragraph || ''))
}

export function scanSuspenseFalseAlarmRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 10)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index < paragraphs.length - 1; index += 1) {
    if (!paragraphHasSuspenseThreat(paragraphs[index])) continue
    const releaseOffset = paragraphs
      .slice(index + 1, Math.min(paragraphs.length, index + 3))
      .findIndex(paragraphHasFalseSuspenseRelease)
    if (releaseOffset < 0) continue
    const releaseIndex = index + 1 + releaseOffset
    hits.push({
      key: `false_suspense_immediate_release_${index + 1}_${releaseIndex + 1}`,
      label: '假悬念扫描',
      status: 'warn',
      evidence: `第${index + 1}-${releaseIndex + 1}段危机立刻无代价解除：${compactBriefText(`${paragraphs[index]} ${paragraphs[releaseIndex]}`, 260)}`,
      fix: '按 oh-story 悬念禁忌修复：威胁不能立刻解除，也不能用误报/自动恢复糊弄读者；让主角付出代价、做出选择、得到新信息，或在解决当前危机后立刻打开新困境和新期待。',
    })
    break
  }
  return hits
}

const SUSPENSE_WITHHELD_INFO_PATTERN = /不能说|不(?:能|该|方便)告诉你|现在(?:还)?不是时候|现在(?:还)?不能解释|以后(?:你)?会知道|到时候(?:你)?就知道|别问了|别再问|知道太多|还不到(?:揭开|告诉|知道)的时候|不是你该知道的/
const SUSPENSE_DELAY_REASON_OR_COST_PATTERN = /监听|监视|隔墙有耳|规则|禁令|契约|誓言|权限|时机|视角|证据不足|还没确认|会(?:死|暴露|触发|改写|清除|消失|失败)|一旦[^。！？!?]{0,30}(?:说|问|知道|公开|暴露)|说出口|真名|名单(?:会|就)|代价|惩罚|清除|抹杀|追杀|暴露|错误|误判|陷阱|倒计时/
const SUSPENSE_DELAY_CLUE_OR_PRESSURE_PATTERN = /先(?:看|拿|找|查|离开|打开|关上|记住|跟我走)|线索|证据|编号|门牌|名单|第三行|缺页|钥匙|纸条|照片|录音|报告|账册|血字|红点|十秒|三秒|倒计时|必须|否则|立刻|马上|下一步|去[^。！？!?]{0,18}(?:找|查|拿|救|开|关)/

function paragraphHasWithheldSuspenseInfo(paragraph: string) {
  SUSPENSE_WITHHELD_INFO_PATTERN.lastIndex = 0
  return SUSPENSE_WITHHELD_INFO_PATTERN.test(String(paragraph || ''))
}

export function scanSuspenseWithheldInfoRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 10)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index < paragraphs.length; index += 1) {
    if (!paragraphHasWithheldSuspenseInfo(paragraphs[index])) continue
    const windowStart = Math.max(0, index - 1)
    const window = paragraphs.slice(windowStart, Math.min(paragraphs.length, index + 4))
    const windowText = window.join(' ')
    SUSPENSE_DELAY_REASON_OR_COST_PATTERN.lastIndex = 0
    SUSPENSE_DELAY_CLUE_OR_PRESSURE_PATTERN.lastIndex = 0
    const hasReasonOrCost = SUSPENSE_DELAY_REASON_OR_COST_PATTERN.test(windowText)
    const hasClueOrPressure = SUSPENSE_DELAY_CLUE_OR_PRESSURE_PATTERN.test(windowText)
    if (hasReasonOrCost && hasClueOrPressure) continue
    hits.push({
      key: `withheld_suspense_without_cost_${index + 1}_${windowStart + window.length}`,
      label: '谜语人悬念扫描',
      status: 'warn',
      evidence: `第${index + 1}-${windowStart + window.length}段用藏信息制造悬念，但缺少理由/代价/线索：${compactBriefText(windowText, 280)}`,
      fix: '按 oh-story 悬疑规则修复：延迟揭示必须有故事内理由、视角限制、说出口的代价或误判风险；同时给读者一个可追踪线索、行动压力或更昂贵的问题，不能只靠“不能说/以后会知道”。',
    })
    break
  }
  return hits
}

const OBSCURE_SUSPENSE_VAGUE_PATTERN = /那个东西|那件事|某个(?:存在|东西|秘密|真相|声音|影子)|某种(?:存在|力量|感觉|真相)|无法言说|不可名状|说不清|说不出的|更深处|真正的真相|未知的(?:存在|东西|力量)|难以形容|没人知道[^。！？!?]{0,18}(?:什么|为什么|意味着)/
const OBSCURE_SUSPENSE_CONCRETE_ANCHOR_PATTERN = /广播|警报|倒计时|十秒|三秒|规则|校规|门牌|编号|第三行|名单|名字|缺页|钥匙|齿痕|血字|血迹|脚步|敲门|门外|录音|报告|账册|照片|尸体|伤口|裂缝|红光|灯|影子|惩罚|清除|必须|不能|否则|看见|听见|发现|按下|打开|关上|抓|握|递|拿|跑|退|问|喊|[？！!?“「]/

export function scanObscureSuspenseRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 10)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index <= paragraphs.length - 3; index += 1) {
    const window = paragraphs.slice(index, index + 3)
    const windowText = window.join(' ')
    const vagueHits = Array.from(windowText.matchAll(new RegExp(OBSCURE_SUSPENSE_VAGUE_PATTERN.source, 'g')))
      .map(match => match[0])
    if (vagueHits.length < 4) continue
    OBSCURE_SUSPENSE_CONCRETE_ANCHOR_PATTERN.lastIndex = 0
    if (OBSCURE_SUSPENSE_CONCRETE_ANCHOR_PATTERN.test(windowText)) continue
    hits.push({
      key: `obscure_suspense_without_anchor_${index + 1}_${index + 3}`,
      label: '晦涩悬疑扫描',
      status: 'warn',
      evidence: `第${index + 1}-${index + 3}段用模糊词制造悬疑但缺少具体锚点：${compactBriefText(windowText, 280)}`,
      fix: '按 oh-story 悬疑规则修复：场景必须清晰，晦涩不是悬疑；把“那个东西/某个存在/无法言说”改成具体威胁、可见线索、规则限制、倒计时、物件异常或角色可验证的行动压力。',
    })
    break
  }
  return hits
}
