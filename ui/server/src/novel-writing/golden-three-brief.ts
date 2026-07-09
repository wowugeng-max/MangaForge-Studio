import { sceneBriefFromCard } from './scene-briefs'

function asArray<T = any>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value
  return value === undefined || value === null ? [] : [value]
}

function compactBriefText(value: any, fallback = '') {
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

export function goldenThreePhaseLabel(chapterNo: number) {
  if (chapterNo === 1) return '第一章启动'
  if (chapterNo === 2) return '第二章升级'
  return '第三章追读'
}

export function normalizeGoldenThreeBrief(value: any, chapterNo = 0) {
  const raw = value?.golden_three_brief || value?.goldenThreeBrief || value || null
  if (!raw || typeof raw !== 'object') return null
  const targetChapterNo = Number(raw.chapter_no || raw.chapterNo || chapterNo || 0)
  if (targetChapterNo < 1 || targetChapterNo > 3) return null
  return {
    version: compactBriefText(raw.version, 'oh_story_golden_three_v1'),
    source: compactBriefText(raw.source, 'oh_story_quality_checklist'),
    chapter_no: targetChapterNo,
    phase_label: compactBriefText(raw.phase_label || raw.phaseLabel, goldenThreePhaseLabel(targetChapterNo)),
    hard_requirements: uniqueBriefStrings(raw.hard_requirements || raw.hardRequirements || [], 12),
    opening_requirements: uniqueBriefStrings(raw.opening_requirements || raw.openingRequirements || [], 8),
    middle_requirements: uniqueBriefStrings(raw.middle_requirements || raw.middleRequirements || [], 8),
    ending_requirements: uniqueBriefStrings(raw.ending_requirements || raw.endingRequirements || [], 8),
    payoff_target_count: Math.max(2, Number(raw.payoff_target_count || raw.payoffTargetCount || 2) || 2),
    current_chapter_payoffs: uniqueBriefStrings(raw.current_chapter_payoffs || raw.currentChapterPayoffs || [], 8),
    forbidden_patterns: uniqueBriefStrings(raw.forbidden_patterns || raw.forbiddenPatterns || [], 8),
    quality_checks: uniqueBriefStrings(raw.quality_checks || raw.qualityChecks || [], 12),
  }
}

export function buildGoldenThreeBrief(project: any, contextPackage: any, sceneBriefs: any[] = []) {
  const chapterTarget = contextPackage?.chapter_target || {}
  const chapterNo = Number(chapterTarget.chapter_no || contextPackage?.chapter_no || 0)
  const explicit = normalizeGoldenThreeBrief(
    chapterTarget.golden_three_brief
    || chapterTarget.goldenThreeBrief
    || contextPackage?.golden_three_brief
    || contextPackage?.goldenThreeBrief
    || contextPackage?.pre_draft_brief?.golden_three_brief
    || contextPackage?.preDraftBrief?.goldenThreeBrief,
    chapterNo,
  )
  if (explicit) return explicit
  if (chapterNo < 1 || chapterNo > 3) return null

  const sceneCards = asArray(chapterTarget.scene_cards)
  const scenes = sceneBriefs.length ? sceneBriefs : sceneCards.map(sceneBriefFromCard)
  const firstScene = scenes[0] || sceneCards[0] || {}
  const lastScene = scenes[scenes.length - 1] || sceneCards[sceneCards.length - 1] || firstScene
  const currentChapterPayoffs = uniqueBriefStrings([
    ...scenes.map((scene: any) => scene.reader_payoff || scene.payoff),
    ...scenes.map((scene: any) => scene.reversal || scene.turning_point),
    chapterTarget.reader_payoff,
    chapterTarget.payoff,
    contextPackage?.writing_bible?.promise,
    project?.synopsis,
  ], 8)
  const openingHook = compactBriefText(chapterTarget.opening_hook || firstScene.opening_hook || firstScene.purpose || chapterTarget.summary)
  const endingHook = compactBriefText(chapterTarget.ending_hook || lastScene.ending_hook_seed || lastScene.reversal)

  const chapterSpecific = chapterNo === 1
    ? ['主角第一章就出场', '第一章有事件，不得纯铺垫', '第一章前 500 字有钩子']
    : chapterNo === 2
      ? ['第二章有升级（矛盾加深）', '第二章必须把第一章危机推高或改变局势']
      : ['第三章有追读理由', '第三章必须给读者继续追下去的新问题、新回报或新代价']

  return {
    version: 'oh_story_golden_three_v1',
    source: 'oh_story_quality_checklist',
    chapter_no: chapterNo,
    phase_label: goldenThreePhaseLabel(chapterNo),
    hard_requirements: uniqueBriefStrings([
      ...chapterSpecific,
      '前三章至少两个爽点',
      '世界观没有大段说明文',
      '每章结尾有悬念',
    ], 12),
    opening_requirements: uniqueBriefStrings([
      chapterNo === 1 ? '前 500 字有钩子：事故、异常、危险、欲望或反常信息必须可见' : '开篇 300 字承接上一章钩子并升级压力',
      openingHook ? `本章开篇钩子候选：${openingHook}` : '',
      '不得从天气、风景、设定百科或日常闲聊慢热开局',
    ], 8),
    middle_requirements: uniqueBriefStrings([
      chapterNo === 2 ? '中段必须出现矛盾升级或新阻碍' : '中段必须有真实事件推进，不得只解释世界观',
      '至少一次把读者回报写成可见行动、反转、打脸、发现或关系变化',
      currentChapterPayoffs.length ? `本章可用爽点：${currentChapterPayoffs.join('；')}` : '',
    ], 8),
    ending_requirements: uniqueBriefStrings([
      '章末必须留下悬念、危机、发现、决定或反转之一',
      endingHook ? `本章章末钩子候选：${endingHook}` : '',
      '结尾不得用“这只是开始”“拉开序幕”等总结句替代现场问题',
    ], 8),
    payoff_target_count: 2,
    current_chapter_payoffs: currentChapterPayoffs,
    forbidden_patterns: [
      '纯背景铺垫',
      '大段世界观说明',
      '无事件开篇',
      '总结式结尾',
    ],
    quality_checks: [
      '第一章前 500 字是否有钩子',
      '主角是否第一章就出场',
      '第一章是否有事件而不是纯铺垫',
      '第二章是否矛盾加深',
      '第三章是否有追读理由',
      '前三章是否至少 2 个爽点',
      '世界观是否避免大段说明文',
      '每章结尾是否有悬念',
    ],
  }
}
