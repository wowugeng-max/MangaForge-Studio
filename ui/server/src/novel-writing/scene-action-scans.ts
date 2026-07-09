import { anchorMatchScore } from './text-matching'
import { countProseChars } from './word-target'

function asArray<T = any>(value: T | T[] | null | undefined): T[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function compactBriefText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
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

function mergedContextChapterTarget(contextPackage: any = {}) {
  const runtimeTarget = contextPackage?.chapterTarget || {}
  const merged = {
    ...(contextPackage?.chapter_target || {}),
    ...runtimeTarget,
  }
  if (Object.prototype.hasOwnProperty.call(runtimeTarget, 'sceneCards') && runtimeTarget.sceneCards !== undefined) {
    merged.scene_cards = runtimeTarget.sceneCards
  }
  return merged
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

function sceneCardConsumptionParts(scene: any) {
  return uniqueBriefStrings([
    scene?.title,
    scene?.purpose,
    scene?.conflict,
    scene?.reader_payoff || scene?.readerPayoff || scene?.payoff || scene?.reader_reward,
    scene?.turning_point || scene?.turningPoint,
    scene?.reversal,
    scene?.ending_hook_seed || scene?.endingHookSeed || scene?.ending_hook,
    ...asArray(scene?.required_beats || scene?.requiredBeats),
    ...asArray(scene?.action_beats || scene?.actionBeats),
    ...asArray(scene?.required_information || scene?.requiredInformation),
  ], 10)
}

const SCENE_GOAL_PATTERN = /要(?:去|把|拿|找|救|保|阻|查|证|进|离|通|争|守|赶|完)|想(?:要|去|把|拿|找|救|保|阻|查|证|进|离|通)|必须|需要|为了|目标|打算|决定|准备|试图|找到|拿到|救|保护|阻止|确认|查清|证明|进入|离开|通过|争取|拿回|守住|赶到|完成/
const SCENE_OBSTACLE_PATTERN = /但|却|可是|然而|否则|不能|不准|禁止|没有权限|挡|拦|堵|锁|失败|威胁|逼|阻止|危险|代价|惩罚|倒计时|追|抓|陷阱|规则|管理员|反派|敌人|质疑|羞辱|冻结|取消/
const SCENE_CHANGE_PATTERN = /变成|变得|改口|改写|生效|失效|通过|失败|成功|打开|关闭|露出|出现|消失|拿到|失去|获得|确认|发现|真相|名单|身份|权限|资格|关系|态度|退后|倒下|认输|升级|提前|下一轮|新(?:规则|名单|目标|线索|危机|问题)/

export function textHasSceneGoal(text: string) {
  SCENE_GOAL_PATTERN.lastIndex = 0
  return SCENE_GOAL_PATTERN.test(String(text || ''))
}

export function textHasSceneObstacle(text: string) {
  SCENE_OBSTACLE_PATTERN.lastIndex = 0
  return SCENE_OBSTACLE_PATTERN.test(String(text || ''))
}

export function textHasSceneChange(text: string) {
  SCENE_CHANGE_PATTERN.lastIndex = 0
  return SCENE_CHANGE_PATTERN.test(String(text || ''))
}

export function scanSceneGoalObstacleChangeRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 12)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  if (paragraphs.length < 4) return hits
  const body = paragraphs.join(' ')
  const dimensions = [
    { key: '目标', ok: textHasSceneGoal(body) },
    { key: '阻碍', ok: textHasSceneObstacle(body) },
    { key: '变化', ok: textHasSceneChange(body) },
  ]
  const missing = dimensions.filter(item => !item.ok).map(item => item.key)
  if (missing.length < 2) return hits
  hits.push({
    key: 'scene_goal_obstacle_change_missing',
    label: '场景目标阻碍变化扫描',
    status: 'warn',
    evidence: `缺少${missing.join('/')}：${compactBriefText(body, 280)}`,
    fix: '按 oh-story 场景检查修复：明确人物要什么、什么挡着、结束后不同在哪里；给场景补目标、阻碍和变化，至少推动主线/关系/设定中的一项，删掉只停在感觉或环境里的可删除段落。',
  })
  return hits
}

const COMBAT_PROCESS_TRIGGER_PATTERN = /战斗|打斗|交手|追逐|清剿|围攻|拔剑|出剑|挥剑|挥刀|拔刀|出刀|拳|掌|踢|砍|刺|斩|劈|杀|冲上去|扑上去|追上去|阵光|剑光|刀光|灵力|法术|符箓/
const COMBAT_RESULT_SUMMARY_PATTERN = /一招(?:过后|之后|之间)?|一剑(?:过后|之后)?|一掌(?:过后|之后)?|瞬间结束|战斗结束|打斗结束|已经结束|直接倒下|当场倒下|被秒杀|秒杀|解决了战斗|胜负已分|尘埃落定/
const COMBAT_ACTION_START_PATTERN = /拔剑|出剑|挥剑|拔刀|出刀|挥刀|抬手|侧身|踏步|冲|扑|追|闪|避开|按住|抓住|抬臂|起手|催动|发动|亮出|刺|斩|劈|砍|踢|撞|格挡/
const COMBAT_OPPONENT_REACTION_PATTERN = /(?:执事|对手|敌人|反派|长老|Boss|管理员|他|她|那人)[^。！？!?]{0,28}(?:抬臂|格挡|后退|退后|踉跄|闪避|挡住|避开|反击|还手|脸色|闷哼|咳血|吐血|失声|僵住)|(?:格挡|后退|退后|踉跄|反击|还手|闷哼|吐血|咳血)/
const COMBAT_SPACE_PATTERN = /台阶|石阶|墙|门|窗|地面|擂台|试炼台|长案|桌|椅|栏杆|门槛|走廊|院墙|屋檐|左侧|右侧|身后|脚下|袖口|掌心|剑尖|刀背|阵眼|阵图/
const COMBAT_COST_PATTERN = /受伤|伤口|血|吐血|咳血|划开|裂开|崩碎|熄灭|消耗|损耗|反噬|踉跄|退后|倒退|跌|摔|撞|掉在地上|名册掉|袖口被|阵光熄灭/
const COMBAT_COUNTER_PATTERN = /反制|反手|借[^。！？!?]{0,16}(?:换位|发力|转身)|换位|破开|刺穿|压住|逼退|击退|制服|扭转|破局|阵眼|漏洞|弱点/

function textHasCombatProcessCategory(text: string, pattern: RegExp) {
  pattern.lastIndex = 0
  return pattern.test(String(text || ''))
}

export function scanCombatProcessRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 8)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index <= paragraphs.length - 2; index += 1) {
    const window = paragraphs.slice(index, Math.min(paragraphs.length, index + 4))
    const windowText = window.join(' ')
    if (!textHasCombatProcessCategory(windowText, COMBAT_PROCESS_TRIGGER_PATTERN)) continue
    if (!textHasCombatProcessCategory(windowText, COMBAT_RESULT_SUMMARY_PATTERN)) continue
    const categories = [
      textHasCombatProcessCategory(windowText, COMBAT_ACTION_START_PATTERN),
      textHasCombatProcessCategory(windowText, COMBAT_OPPONENT_REACTION_PATTERN),
      textHasCombatProcessCategory(windowText, COMBAT_SPACE_PATTERN),
      textHasCombatProcessCategory(windowText, COMBAT_COST_PATTERN),
      textHasCombatProcessCategory(windowText, COMBAT_COUNTER_PATTERN),
    ].filter(Boolean).length
    if (categories >= 3) continue
    hits.push({
      key: `combat_process_missing_${index + 1}_${index + window.length}`,
      label: '战斗过程扫描',
      status: 'warn',
      evidence: `第${index + 1}-${index + window.length}段战斗/动作场景只有结果概括，过程不足：${compactBriefText(windowText, 280)}`,
      fix: '按 oh-story 战斗描写修复：补动作起手、空间位置、对手反应、受伤/损耗/信息暴露、反制动作和结果；战斗可以短，但不能只写“一招过后/战斗结束”。',
    })
    break
  }
  return hits
}

export function scanSceneDensityExecutionRisks(contextPackage: any = {}, chapterText: string) {
  const target = mergedContextChapterTarget(contextPackage)
  const sceneCards = [
    ...asArray(target.scene_cards || target.sceneCards),
    ...asArray(contextPackage?.pre_draft_brief?.scene_briefs || contextPackage?.preDraftBrief?.sceneBriefs),
  ].filter((scene: any) => compactBriefText(scene?.density_level || scene?.densityLevel))
  const paragraphs = proseParagraphsWithoutTitle(chapterText)
  if (!sceneCards.length || !paragraphs.length) return []

  const anchorRows = sceneCards.map((scene: any, index: number) => {
    const parts = sceneCardConsumptionParts(scene)
    let best = { index: -1, score: 0 }
    paragraphs.forEach((paragraph, paragraphIndex) => {
      const score = parts.reduce((max, part) => Math.max(max, anchorMatchScore(part, paragraph).score), 0)
      if (score > best.score) best = { index: paragraphIndex, score }
    })
    return { scene, sceneIndex: index, paragraphIndex: best.score >= 35 ? best.index : -1, score: best.score }
  })

  const checks: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; density_level: string; scene_no: number }> = []
  anchorRows.forEach(row => {
    const { scene, paragraphIndex } = row
    if (paragraphIndex < 0) return
    const densityLevel = compactBriefText(scene?.density_level || scene?.densityLevel).toLowerCase()
    if (!['dense', 'medium', 'sparse'].includes(densityLevel)) return
    const sceneNo = Number(scene?.scene_no || scene?.sceneNo || row.sceneIndex + 1) || row.sceneIndex + 1
    const nextAnchorIndex = anchorRows
      .map(item => item.paragraphIndex)
      .filter(index => index > paragraphIndex)
      .sort((a, b) => a - b)[0]
    const endIndex = nextAnchorIndex != null
      ? nextAnchorIndex
      : Math.min(paragraphs.length, paragraphIndex + (densityLevel === 'sparse' ? 4 : 3))
    const window = paragraphs.slice(paragraphIndex, Math.max(paragraphIndex + 1, endIndex))
    const windowText = window.join(' ')
    const charCount = countProseChars(windowText)
    const sceneLabel = compactBriefText(scene?.title || scene?.purpose || scene?.reader_payoff || `场景${sceneNo}`, 36)

    if (densityLevel === 'dense' && charCount < 180) {
      checks.push({
        key: `scene_density_${sceneNo}_dense_underwritten`,
        label: '场景疏密执行检查',
        status: 'warn',
        density_level: densityLevel,
        scene_no: sceneNo,
        evidence: `场景${sceneNo}《${sceneLabel}》标记 dense，但正文窗口约 ${charCount} 字，容易把爽点/打脸/反转/情绪高潮写成摘要：${compactBriefText(windowText, 220)}`,
        fix: 'dense 场景必须补成慢镜头：展开感知、动作、对话交锋、阻碍、代价和反应，不要只用一句话概括结果。',
      })
    }

    if (densityLevel === 'sparse' && (window.length >= 3 || charCount > 220)) {
      checks.push({
        key: `scene_density_${sceneNo}_sparse_overwritten`,
        label: '场景疏密执行检查',
        status: 'warn',
        density_level: densityLevel,
        scene_no: sceneNo,
        evidence: `场景${sceneNo}《${sceneLabel}》标记 sparse，但正文窗口 ${window.length} 段、约 ${charCount} 字，过场/赶路/信息交代被写得过满：${compactBriefText(windowText, 260)}`,
        fix: 'sparse 场景应压缩为 1-2 句，只交代必要位移、时间跳转或信息交接，把笔墨让给下一个 dense 情绪节点。',
      })
    }
  })
  return checks
}

function getScenePurposeTags(scene: any) {
  return uniqueBriefStrings([
    ...asArray(scene?.purpose_tags || scene?.purposeTags),
    scene?.purpose_tag,
    scene?.purposeTag,
    scene?.purpose_type,
    scene?.purposeType,
  ], 8).map(item => compactBriefText(item, 24)).filter(Boolean)
}

export function scanScenePurposeWeightRisks(contextPackage: any = {}, chapterText: string) {
  const target = mergedContextChapterTarget(contextPackage)
  const sceneCards = [
    ...asArray(target.scene_cards || target.sceneCards),
    ...asArray(contextPackage?.pre_draft_brief?.scene_briefs || contextPackage?.preDraftBrief?.sceneBriefs),
  ].filter((scene: any) => {
    const explicitTags = getScenePurposeTags(scene)
    const purposeText = [
      ...explicitTags,
      scene?.purpose,
      scene?.reader_payoff || scene?.readerPayoff || scene?.payoff || scene?.reader_reward,
      scene?.scene_type || scene?.sceneType,
      scene?.reversal,
      scene?.turning_point || scene?.turningPoint,
    ].join(' ')
    return /爽点|打脸|高潮|卖点|关键揭露|反转|情绪高潮|爆发|过渡|赶路|移动|前往|信息交代|时间跳转|转场/.test(purposeText)
  })
  const paragraphs = proseParagraphsWithoutTitle(chapterText)
  if (!sceneCards.length || !paragraphs.length) return []

  const anchorRows = sceneCards.map((scene: any, index: number) => {
    const parts = sceneCardConsumptionParts(scene)
    let best = { index: -1, score: 0 }
    paragraphs.forEach((paragraph, paragraphIndex) => {
      const score = parts.reduce((max, part) => Math.max(max, anchorMatchScore(part, paragraph).score), 0)
      if (score > best.score) best = { index: paragraphIndex, score }
    })
    return { scene, sceneIndex: index, paragraphIndex: best.score >= 35 ? best.index : -1, score: best.score }
  })

  const checks: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; purpose_tag: string; scene_no: number }> = []
  anchorRows.forEach(row => {
    const { scene, paragraphIndex } = row
    if (paragraphIndex < 0) return
    const explicitTags = getScenePurposeTags(scene)
    const purposeText = [
      ...(explicitTags.length ? explicitTags : []),
      !explicitTags.length ? scene?.purpose : '',
      !explicitTags.length ? scene?.reader_payoff || scene?.readerPayoff || scene?.payoff || scene?.reader_reward : '',
      !explicitTags.length ? scene?.scene_type || scene?.sceneType : '',
      !explicitTags.length ? scene?.reversal : '',
      !explicitTags.length ? scene?.turning_point || scene?.turningPoint : '',
    ].join(' ')
    const isHighPurpose = /爽点|打脸|高潮|卖点|关键揭露|反转|情绪高潮|爆发/.test(purposeText)
    const isTransitionPurpose = /过渡|赶路|移动|前往|信息交代|时间跳转|转场/.test(purposeText)
    if (!isHighPurpose && !isTransitionPurpose) return
    const sceneNo = Number(scene?.scene_no || scene?.sceneNo || row.sceneIndex + 1) || row.sceneIndex + 1
    const nextAnchorIndex = anchorRows
      .map(item => item.paragraphIndex)
      .filter(index => index > paragraphIndex)
      .sort((a, b) => a - b)[0]
    const endIndex = nextAnchorIndex != null
      ? nextAnchorIndex
      : Math.min(paragraphs.length, paragraphIndex + (isTransitionPurpose && !isHighPurpose ? 4 : 3))
    const window = paragraphs.slice(paragraphIndex, Math.max(paragraphIndex + 1, endIndex))
    const windowText = window.join(' ')
    const charCount = countProseChars(windowText)
    const sceneLabel = compactBriefText(scene?.title || scene?.purpose || scene?.reader_payoff || `场景${sceneNo}`, 36)
    const purposeLabel = compactBriefText(explicitTags[0] || (isHighPurpose ? '高价值目的' : '过渡'), 20)

    if (isHighPurpose && charCount < 180) {
      checks.push({
        key: `scene_purpose_weight_${sceneNo}_high_underwritten`,
        label: '目的词详略分配',
        status: 'warn',
        scene_no: sceneNo,
        purpose_tag: purposeLabel,
        evidence: `场景${sceneNo}《${sceneLabel}》目的词「${purposeLabel}」应承载爽点/卖点/高潮，但正文窗口约 ${charCount} 字，容易把读者回报写成摘要：${compactBriefText(windowText, 220)}`,
        fix: '按目的词补足危机/期待铺垫、出手过程、对话交锋、在场配角差异化反应和结果余波，把爽点/打脸/高潮展开成可见戏剧动作。',
      })
    }

    if (!isHighPurpose && isTransitionPurpose && (window.length >= 3 || charCount > 220)) {
      checks.push({
        key: `scene_purpose_weight_${sceneNo}_transition_overwritten`,
        label: '目的词详略分配',
        status: 'warn',
        scene_no: sceneNo,
        purpose_tag: purposeLabel,
        evidence: `场景${sceneNo}《${sceneLabel}》目的词「${purposeLabel}」应是过渡/赶路/信息交代，但正文窗口 ${window.length} 段、约 ${charCount} 字，过渡被写得过满：${compactBriefText(windowText, 260)}`,
        fix: '按目的词压缩为 1-2 句，只保留位移、时间跳转、必要信息或情绪余波，把篇幅让给爽点/卖点/高潮场景。',
      })
    }
  })
  return checks
}
