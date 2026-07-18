import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText } from './text-utils'
import { inferEndingHookType } from '../batch-serial/ending-hook-type'

const OH_STORY_CHAPTER_OPENING_HOOK_RULES = [
  '章首 7 式：悬念对话开局、闪前碎片、倒计时开局、神秘独白、反差场景、未完成动作开局、意象预示。',
  '章首前 100 字必须有钩子，不能用纯风景、天气、醒来、赶路或背景介绍开头。',
  '开篇钩子要服务本章目标：直接冲击、制造好奇或对比冲击三选一，不要为悬念而悬念。',
]

const OH_STORY_CHAPTER_ENDING_HOOK_RULES = [
  '章尾 13 式：突然揭示、紧急危机、未完成动作、身份反转、两难抉择、神秘物品、倒计时、承诺/威胁、离奇消失、隐藏含义、意象钩子、回声钩子、留白钩子。',
  '章末约 100 字点到即止，最后一幕必须留下读者想翻下一页的问题、危险、反转、选择或未完成收益。',
  '章尾钩子必须由本章现场触发，不能用“更大的风暴即将来临”等作者预告替代。',
]

const OH_STORY_CHAPTER_HOOK_FORBIDDEN = [
  '假悬念：威胁不存在或立刻解除。',
  '机械降神：章尾抛危机，下章靠巧合解决。',
  '过度留白：连续多章不揭示任何信息。',
  '低风险钩：用无关紧要的事制造悬念。',
  '同类型连用：连续 3 章以上用同一种钩子类型。',
]

const OH_STORY_CHAPTER_HOOK_CHECKS = [
  '章首前 100 字必须落地一个明确钩子，且能归入章首 7 式之一。',
  '章尾必须落地一个明确翻页钩子，且能归入章尾 13 式之一。',
  '钩子强度必须匹配章节阶段：第1章必须强，2-3章强，中期日常中，高高潮前强，大结局收束。',
  '章首钩子、场景推进和章尾钩子必须服务同一章目标，不能互相断裂。',
  '钩子必须有兑现路径：不能是假悬念、低风险钩、机械降神或过度留白。',
  '连续章节不能机械重复同一种钩子类型；重复时必须改变信息、风险、情绪或兑现方式。',
]

function chapterHookExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.chapter_hook_contract
    || contextPackage?.chapter_target?.chapterHookContract
    || contextPackage?.chapter_hook_contract
    || contextPackage?.chapterHookContract
    || contextPackage?.pre_draft_brief?.chapter_hook_contract
    || contextPackage?.preDraftBrief?.chapterHookContract
}

function inferOpeningHookType(text: string) {
  if (/倒计时|三分钟|零点|午夜|期限|还剩|最后\d|最后[一二三四五六七八九十]?天|时间不够/.test(text)) return '倒计时开局'
  if (/^\s*[“"']|对话|他说|她说|问道|回答/.test(text)) return '悬念对话开局'
  if (/后来|多年后|事后|才知道|那天/.test(text)) return '闪前碎片'
  if (/我一直|独白|心里|梦见|回忆/.test(text)) return '神秘独白'
  if (/一边|另一边|反差|婚礼|医院|同时/.test(text)) return '反差场景'
  if (/刚|正要|伸手|开门|插进|突然|打断/.test(text)) return '未完成动作开局'
  if (/天边|窗台|花|钟|雨|血|影子|意象/.test(text)) return '意象预示'
  return '未完成动作开局'
}

function inferChapterHookStrength(chapterNo: number, text: string) {
  if (chapterNo === 1) return '必须强'
  if (chapterNo >= 2 && chapterNo <= 3) return '强'
  if (/高潮前|决战|卷末|危机升级|真相|反转/.test(text)) return '强'
  if (/大结局|完结|收束|尾声/.test(text)) return '收束'
  return '中'
}

export function buildChapterHookContract(project: any = {}, contextPackage: any = {}) {
  const explicit = chapterHookExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildChapterHookContract(project, {
      ...(contextPackage || {}),
      chapter_hook_contract: null,
      chapterHookContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            chapter_hook_contract: null,
            chapterHookContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            chapter_hook_contract: null,
            chapterHookContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            chapter_hook_contract: null,
            chapterHookContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitOpeningHookRules = asArray(explicit.opening_hook_rules || explicit.openingHookRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitEndingHookRules = asArray(explicit.ending_hook_rules || explicit.endingHookRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitForbiddenPatterns = asArray(explicit.forbidden_patterns || explicit.forbiddenPatterns).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_chapter_hook_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      opening_hook_type: compactBriefText(explicit.opening_hook_type || explicit.openingHookType, derived.opening_hook_type || '未完成动作开局'),
      ending_hook_type: compactBriefText(explicit.ending_hook_type || explicit.endingHookType, derived.ending_hook_type || '突然揭示'),
      hook_strength: compactBriefText(explicit.hook_strength || explicit.hookStrength, derived.hook_strength || '中'),
      opening_hook_rules: explicitOpeningHookRules.length ? explicitOpeningHookRules : asArray(derived.opening_hook_rules),
      ending_hook_rules: explicitEndingHookRules.length ? explicitEndingHookRules : asArray(derived.ending_hook_rules),
      forbidden_patterns: explicitForbiddenPatterns.length ? explicitForbiddenPatterns : asArray(derived.forbidden_patterns),
      quality_checks: explicitQualityChecks.length ? explicitQualityChecks : asArray(derived.quality_checks),
      revision_priorities: explicitRevisionPriorities.length ? explicitRevisionPriorities : asArray(derived.revision_priorities),
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const firstScene = sceneCards[0] || {}
  const lastScene = sceneCards[sceneCards.length - 1] || {}
  const openingText = [
    target.opening_hook,
    firstScene.opening_hook,
    firstScene.title,
    firstScene.purpose,
    firstScene.conflict,
  ].filter(Boolean).join(' ')
  const endingText = [
    target.ending_hook,
    lastScene.ending_hook_seed,
    lastScene.reader_payoff,
    lastScene.reversal,
    lastScene.purpose,
  ].filter(Boolean).join(' ')
  const allText = [project?.genre, project?.synopsis, target.summary, target.conflict, openingText, endingText].filter(Boolean).join(' ')
  return {
    version: 'oh_story_chapter_hook_v1',
    source: 'oh_story_embedded_fallback',
    opening_hook_type: inferOpeningHookType(openingText || allText),
    ending_hook_type: inferEndingHookType(endingText || allText),
    hook_strength: inferChapterHookStrength(Number(target.chapter_no || 0), allText),
    opening_hook_rules: OH_STORY_CHAPTER_OPENING_HOOK_RULES,
    ending_hook_rules: OH_STORY_CHAPTER_ENDING_HOOK_RULES,
    forbidden_patterns: OH_STORY_CHAPTER_HOOK_FORBIDDEN,
    quality_checks: OH_STORY_CHAPTER_HOOK_CHECKS,
    revision_priorities: ['补前100字钩子', '重做章尾翻页钩子', '修假悬念/低风险钩', '避免同类型连用', '让钩子服务本章目标'],
  }
}

