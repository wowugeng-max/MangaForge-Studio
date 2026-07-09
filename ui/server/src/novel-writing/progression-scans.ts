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

const RELATIONSHIP_SCENE_SIGNAL_PATTERN = /相信|信任|站在你这边|站你这边|陪你|关心|担心|保护你|朋友|同伴|盟友|喜欢|在乎|别怕|我帮你|我会帮你|我支持你|谢谢|放心/
const RELATIONSHIP_FLAT_WARMTH_PATTERN = /点头|沉默|气氛(?:温暖|缓和|安静)|笑了笑|谢谢|嗯|放心|没事|暖(?:了|起来)|温暖起来/
const RELATIONSHIP_CONCRETE_CHANGE_PATTERN = /公开作证|作证|站队|拒绝|背叛|保护|挡住|救|牺牲|代价|得罪|公开|压在案上|递出|推到|签字|承认|否认|误会|误解|边界|只到这一步|有限|第一次|不再|仍然|家族|腰牌|暴露|欠|债|风险|选择|决定|离开|留下|退回|旁听席|账册|证明|证据|条件|承诺|撤回|撕破脸|翻脸/

export function scanRelationshipSceneChangeRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 8)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index < paragraphs.length; index += 1) {
    const window = paragraphs.slice(index, Math.min(paragraphs.length, index + 4))
    if (window.length < 2) continue
    const windowText = window.join(' ')
    const relationSignals = Array.from(windowText.matchAll(new RegExp(RELATIONSHIP_SCENE_SIGNAL_PATTERN.source, 'g')))
      .map(match => match[0])
    if (relationSignals.length < 2) continue
    RELATIONSHIP_CONCRETE_CHANGE_PATTERN.lastIndex = 0
    if (RELATIONSHIP_CONCRETE_CHANGE_PATTERN.test(windowText)) continue
    RELATIONSHIP_FLAT_WARMTH_PATTERN.lastIndex = 0
    if (!RELATIONSHIP_FLAT_WARMTH_PATTERN.test(windowText) && countProseChars(windowText) > 180) continue
    hits.push({
      key: `relationship_scene_without_change_${index + 1}_${index + window.length}`,
      label: '关系变化扫描',
      status: 'warn',
      evidence: `第${index + 1}-${index + window.length}段关系戏只表达支持/关心，缺少可见关系状态变化：${compactBriefText(windowText, 280)}`,
      fix: '按 oh-story 关系戏修复：重头关系戏必须改变信任、希望、占有欲、脆弱、边界、误解、债务、风险或期待；用公开作证、拒绝、保护、站队、代价、误解澄清或有限承诺承载关系变化，不能只写关心、相信、点头和气氛变暖。',
    })
    break
  }
  return hits
}

const EXPECTATION_RESOLUTION_PATTERN = /终于|总算|解决|结束|通过|赢了|成功|拿到|得救|安全|危机解除|门槛(?:终于)?通过|考核通过|资格(?:终于)?通过|红光熄灭|管理员退后|敌人(?:倒下|退去)|反派(?:倒下|认输)/
const EXPECTATION_NEXT_LOOP_PATTERN = /但|然而|可是|可|却|忽然|突然|下一|新的?(?:目标|问题|危机|线索|门槛|任务|名单|名字|敌人|规则|期待)|还有|第二|门外|敲门|广播|倒计时|必须|不能|否则|如果|发现|看见|听见|露出|问|谁|为什么|真相|线索|代价|危险|威胁|选择|决定|钥匙|纸条|名字|[？！!?“「]/
const EXPECTATION_CLOSURE_PATTERN = /休息|等待(?:新的生活|明天|安排)|新的生活(?:开始)?|终于可以|不必再|只需要|平静下来|安稳下来|回去睡觉|好好睡一觉|松了(?:一口气|口气)|尘埃落定|到这里(?:总算)?结束/

function paragraphHasExpectationResolution(paragraph: string) {
  EXPECTATION_RESOLUTION_PATTERN.lastIndex = 0
  return EXPECTATION_RESOLUTION_PATTERN.test(String(paragraph || ''))
}

function paragraphHasNextExpectationLoop(paragraph: string) {
  EXPECTATION_NEXT_LOOP_PATTERN.lastIndex = 0
  return EXPECTATION_NEXT_LOOP_PATTERN.test(String(paragraph || ''))
}

export function scanExpectationVacuumRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 10)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  if (paragraphs.length < 3) return hits
  const tailParagraphs = paragraphs.slice(-4)
  const tailText = tailParagraphs.join(' ')
  EXPECTATION_CLOSURE_PATTERN.lastIndex = 0
  if (!tailParagraphs.some(paragraphHasExpectationResolution)) return hits
  if (!EXPECTATION_CLOSURE_PATTERN.test(tailText)) return hits
  if (tailParagraphs.some(paragraphHasNextExpectationLoop)) return hits
  hits.push({
    key: 'expectation_vacuum_after_resolution',
    label: '断期待扫描',
    status: 'warn',
    evidence: `章尾闭合当前麻烦但缺少下一开环：${compactBriefText(tailText, 260)}`,
    fix: '按 oh-story 期待管理修复：闭环当前目标前后必须立起下一目标、新门槛、新线索、新困境或新期待；局部胜利要伴随新的代价、风险、信息差或后续行动方向。',
  })
  return hits
}

const PARAGRAPH_ATMOSPHERE_PATTERN = /阳光|月光|灯光|夜色|天色|天空|云|风|雨|雪|雾|树影|窗外|走廊|墙|地面|空气|气味|味道|安静|寂静|潮湿|阴冷|昏暗|灰尘|裂缝|光影/
const PARAGRAPH_PROGRESSION_PATTERN = /[“「].+[”」]|说道|说完|说着|开口|问|喊|吼|答|笑|骂|推|拉|抓|握|按|抬|低|转身|后退|冲|跑|追|躲|撞|开门|关门|敲|拿|递|放|撕|打|杀|救|看见|发现|听见|响起|出现|消失|露出|变成|选择|决定|必须|不能|如果|否则|规则|广播|警报|倒计时|代价|线索|真相|身份|名字|血|痛|伤|死|危险|威胁|阻止|反击|失败|成功|[？！!?]/

function paragraphHasProgression(paragraph: string) {
  PARAGRAPH_PROGRESSION_PATTERN.lastIndex = 0
  return PARAGRAPH_PROGRESSION_PATTERN.test(paragraph)
}

function paragraphIsAtmosphereOnly(paragraph: string) {
  PARAGRAPH_ATMOSPHERE_PATTERN.lastIndex = 0
  return PARAGRAPH_ATMOSPHERE_PATTERN.test(paragraph) && !paragraphHasProgression(paragraph)
}

export function scanParagraphProgressionRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index < paragraphs.length - 1; index += 1) {
    if (!paragraphIsAtmosphereOnly(paragraphs[index]) || !paragraphIsAtmosphereOnly(paragraphs[index + 1])) continue
    hits.push({
      key: 'consecutive_atmosphere_paragraphs',
      label: '段落推进扫描',
      status: 'warn',
      evidence: `第${index + 1}-${index + 2}段连续环境/氛围描写：${compactBriefText(`${paragraphs[index]} ${paragraphs[index + 1]}`, 180)}`,
      fix: '压缩连续氛围段，把环境改成动作空间、规则触发、危险判断、对话压力、动作、选择、信息变化或关系变化。',
    })
    break
  }

  for (let index = 0; index <= paragraphs.length - 4; index += 1) {
    const window = paragraphs.slice(index, index + 4)
    if (window.some(paragraphHasProgression)) continue
    hits.push({
      key: `paragraph_progression_stall_${index + 1}`,
      label: '段落推进扫描',
      status: 'warn',
      evidence: `第${index + 1}-${index + 4}段缺少推进：${compactBriefText(window.join(' '), 220)}`,
      fix: '每3-5段必须出现动作、选择、信息变化、关系变化、规则触发或对话交锋；删掉可删除段落，或把静态描写改成事件推进。',
    })
    break
  }
  return hits
}

const MEANING_INFLATION_PATTERN = /(?:这一刻|终于意识到|意识到|明白|懂得|命运|责任|意义|意义深远|前所未有|难以言说|重量|沉重|成长|坚定|未来|方向|经历|选择|肩上|此刻|无声处|汇成|仿佛)/
const CONCRETE_EVENT_PROGRESS_PATTERN = /(?:[“「].+[”」]|推|拉|抓|握|按|抬|转身|后退|冲|跑|追|躲|撞|开门|关门|敲|拿|递|放|撕|打|杀|救|看见|发现|听见|响起|亮起|变红|出现|消失|广播|警报|名单|门牌|钥匙|账本|封条|证据|血|痛|伤|死|危险|威胁|阻止|反击|代价|后果|退开|改口|站队|失去主动|局势变化|关系变化|[？！!?])/

export function scanMeaningInflationFillerRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index <= paragraphs.length - 3; index += 1) {
    const window = paragraphs.slice(index, index + 3)
    if (window.some(paragraph => countProseChars(paragraph) < 24)) continue
    if (!window.every(paragraph => MEANING_INFLATION_PATTERN.test(paragraph))) continue
    if (window.some(paragraph => CONCRETE_EVENT_PROGRESS_PATTERN.test(paragraph))) continue
    hits.push({
      key: `meaning_inflation_filler_paragraphs_${index + 1}_${index + 3}`,
      label: '意义膨胀水文扫描',
      status: 'warn',
      evidence: `第${index + 1}-${index + 3}段连续抽象意义总结：${compactBriefText(window.join(' '), 220)}`,
      fix: '按 oh-story 去 AI 味和事件驱动修复：意义膨胀要缩小到具体影响；把“意义深远/命运改变/责任沉重”改成具体后果、动作、对话、证据、代价或局势变化，不要单写心理活动超过 2 段。',
    })
    break
  }
  return hits
}

export function scanNarrativeTransitionRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  const transitionPattern = /^(?:然后|接着|随后|于是|紧接着|下一刻|与此同时|之后|再然后|再接着)[，,。.\s]*/
  const timeJumpPattern = /^(?:三天后|两天后|一天后|数日后|几日后|半日后|翌日|第二天|次日|转眼|不知过了多久|片刻后|半个时辰后|一炷香后|天亮时|夜里|很快)[，,。.\s]*/
  const spaceJumpPattern = /^(?:另一边|与此同时|同一时间|后院(?:里)?|前厅(?:里)?|祠堂(?:里)?|城门口|赤炉城外|门外|屋内|楼下|楼上|远处)[，,。.\s]*/
  const actionObjectAnchorPattern = /(?:推|按|攥|握|翻|递|拿|放|敲|抬|扯|扣|踩|停|撞|压|贴|抽|收|塞|拎|掀|门|账本|账册|封条|钥匙|袖口|衣袖|纸|墨|血|杯|碗|灯|铃|刀|剑|铜钱|牌匾|台阶)/
  const soundLightAnchorPattern = /(?:响|声|铃|脚步|敲门|咳|风声|雨声|呼吸|低语|喊|灯|光|影|火|烛|亮|暗|照|晃|闪|月色|日光)/
  paragraphs.forEach((paragraph, index) => {
    const evidence = String(paragraph || '').trim()
    if (!evidence || /^[“「『"']/.test(evidence)) return
    timeJumpPattern.lastIndex = 0
    if (timeJumpPattern.test(evidence) && !actionObjectAnchorPattern.test(evidence)) {
      hits.push({
        key: `time_jump_anchor_missing_line_${index + 1}`,
        label: '时间跳转锚点扫描',
        status: 'warn',
        evidence: compactBriefText(evidence, 220),
        fix: '按 oh-story 场景切换修复：时间跳转必须用动作或物件衔接，例如推门、翻账本、封条变软、钥匙落入掌心；不要只写“三天后/转眼/翌日，人物已经到了”。',
        line: index + 1,
      })
      return
    }
    spaceJumpPattern.lastIndex = 0
    if (spaceJumpPattern.test(evidence) && !soundLightAnchorPattern.test(evidence)) {
      hits.push({
        key: `space_jump_anchor_missing_line_${index + 1}`,
        label: '空间跳转锚点扫描',
        status: 'warn',
        evidence: compactBriefText(evidence, 220),
        fix: '按 oh-story 场景切换修复：空间跳转必须用声音或光影衔接，例如铃声、脚步声、门缝光、灯影或风声把镜头带到新地点；不要只写“另一边/后院里，人物已经站在那里”。',
        line: index + 1,
      })
      return
    }
    transitionPattern.lastIndex = 0
    if (!transitionPattern.test(evidence)) return
    hits.push({
      key: `narrative_transition_glue_line_${index + 1}`,
      label: '子事件连接扫描',
      status: 'warn',
      evidence: compactBriefText(evidence, 220),
      fix: '按 oh-story 子事件连接修复：删掉“然后/接着/随后/于是”等叙述过渡，用约20字的身体动作、物件动作、触感、视线或呼吸承接下一个子事件。',
      line: index + 1,
    })
  })
  return hits
}
