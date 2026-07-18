import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

export const OH_STORY_PLATFORM_RUBRICS: Record<string, any> = {
  fanqie: {
    platform: 'fanqie',
    label: '番茄小说',
    source: 'oh_story_embedded_fallback',
    checks: [
      '前 3 段包含冲突/悬念/钩子，不能纯描写或背景介绍。',
      '短段落、快节奏、高信息密度，避免大段设定说明。',
      '每 800-1200 字有情绪反馈、冲突转折、爽点或新信息。',
      '章末必须有翻页动力：悬念、反转、新信息、危险或利益诱惑。',
    ],
    revision_priorities: ['强化前三段钩子', '压缩解释和背景', '补情绪反馈/爽点', '补章末翻页动力'],
  },
  qidian: {
    platform: 'qidian',
    label: '起点中文网',
    source: 'oh_story_embedded_fallback',
    checks: [
      '本章必须服务设定自洽、升级路径、主角推进或长线期待。',
      '金手指/体系/能力/资源使用要有代价、限制或成长反馈。',
      '世界观信息跟着冲突释放，不能只做百科说明。',
      '章末保留悬念、阶段目标或下一步升级拉力。',
    ],
    revision_priorities: ['补体系因果', '补升级路径反馈', '修设定自洽', '强化长线追读'],
  },
  zhihu: {
    platform: 'zhihu',
    label: '知乎盐言',
    source: 'oh_story_embedded_fallback',
    checks: [
      '第一句或第一段必须有动作、冲突、悬念或强信息量。',
      '情绪拉扯要密集，期待、失望、反转或余韵不能平铺。',
      '反转必须有前文证据，不能无铺垫硬翻。',
      '段落以短为主，有长短疏密变化，结尾留情绪余韵。',
    ],
    revision_priorities: ['强化第一句钩子', '补情绪拉扯', '补反转证据链', '收束结尾余韵'],
  },
  generic: {
    platform: 'generic web-fiction',
    label: '通用网文',
    source: 'oh_story_embedded_fallback',
    checks: [
      '核心卖点清楚：读者知道本章为什么值得继续看。',
      '最小剧情循环完整：目标、阻碍、行动、代价/反馈、新期待。',
      '角色动机符合目标、性格、处境和关系压力。',
      '文字具体可感，避免 AI 腔、总结体和说明书式对话。',
    ],
    revision_priorities: ['补核心卖点', '补剧情循环反馈', '修角色动机', '去 AI 味和总结体'],
  },
}

export const OH_STORY_CONTENT_RUBRIC = {
  version: 'oh_story_content_rubric_v1',
  source: 'oh_story_embedded_fallback',
  label: '通用网文内容审查基准',
  checks: [
    '核心卖点清楚：读者知道本章为什么值得继续看。',
    '冲突推进明确：本章有阻碍、选择、代价或关系变化。',
    '情绪曲线可感：有铺垫、升温、释放或反转。',
    '钩子与期待成立：开头或结尾制造后续问题。',
    '角色动机可信：行为符合目标、性格、处境和关系压力。',
    '对话有信息控制、潜台词和角色差异，避免说明书式对话。',
    '设定、时间线、物品归属和角色知识边界一致。',
    '文字具体可感，避免 AI 腔、陈词滥调、抽象总结体。',
    '最小剧情循环完整：目标、阻碍、行动、代价/反馈、新期待。',
    '高潮构建有层次：蓄能、假胜、崩解、反转/兑现。',
  ],
  golden_questions: [
    '读者为什么翻下一页？',
    '本章改变了什么？',
    '哪个正文证据支持判断？',
  ],
  revision_priorities: ['补核心卖点', '补冲突推进', '补剧情循环反馈', '修角色动机', '强化钩子与期待', '去 AI 味和总结体'],
}


export function normalizePlatformKey(value: any) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return ''
  if (raw.includes('番茄') || raw.includes('fanqie')) return 'fanqie'
  if (raw.includes('起点') || raw.includes('qidian')) return 'qidian'
  if (raw.includes('知乎') || raw.includes('盐言') || raw.includes('zhihu')) return 'zhihu'
  if (raw.includes('generic') || raw.includes('通用') || raw.includes('web-fiction')) return 'generic'
  return ''
}

export function buildPlatformRubric(project: any, contextPackage: any = {}) {
  const explicit = contextPackage?.chapter_target?.platform_rubric || contextPackage?.platform_rubric || contextPackage?.pre_draft_brief?.platform_rubric
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const key = normalizePlatformKey(explicit.platform || explicit.key || explicit.label) || 'generic'
    const fallback = OH_STORY_PLATFORM_RUBRICS[key] || OH_STORY_PLATFORM_RUBRICS.generic
    return {
      ...fallback,
      ...explicit,
      platform: fallback.platform,
      label: explicit.label || fallback.label,
      source: explicit.source || fallback.source,
      checks: asArray(explicit.checks).length ? asArray(explicit.checks).map((item: any) => compactBriefText(item)).filter(Boolean) : fallback.checks,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : fallback.revision_priorities,
    }
  }
  const key = normalizePlatformKey(
    contextPackage?.chapter_target?.target_platform
    || contextPackage?.target_platform
    || contextPackage?.writing_bible?.target_platform
    || project?.reference_config?.writing_bible?.target_platform
    || project?.reference_config?.target_platform
    || project?.target_platform
    || project?.platform,
  ) || 'generic'
  return OH_STORY_PLATFORM_RUBRICS[key] || OH_STORY_PLATFORM_RUBRICS.generic
}

export function buildContentRubric(contextPackage: any = {}) {
  const explicit = contextPackage?.chapter_target?.content_rubric
    || contextPackage?.chapter_target?.contentRubric
    || contextPackage?.content_rubric
    || contextPackage?.contentRubric
    || contextPackage?.pre_draft_brief?.content_rubric
    || contextPackage?.preDraftBrief?.contentRubric
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    return {
      ...OH_STORY_CONTENT_RUBRIC,
      ...explicit,
      version: explicit.version || OH_STORY_CONTENT_RUBRIC.version,
      source: explicit.source || OH_STORY_CONTENT_RUBRIC.source,
      label: explicit.label || OH_STORY_CONTENT_RUBRIC.label,
      checks: asArray(explicit.checks).length
        ? asArray(explicit.checks).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_CONTENT_RUBRIC.checks,
      golden_questions: asArray(explicit.golden_questions || explicit.goldenQuestions).length
        ? asArray(explicit.golden_questions || explicit.goldenQuestions).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_CONTENT_RUBRIC.golden_questions,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_CONTENT_RUBRIC.revision_priorities,
    }
  }
  return OH_STORY_CONTENT_RUBRIC
}
