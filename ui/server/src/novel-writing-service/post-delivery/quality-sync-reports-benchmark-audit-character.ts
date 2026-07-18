import {
  buildCharacterBehaviorDeterministicCheck,
  characterBehaviorPriority,
  normalizeCharacterBehaviorAntagonistLogicCheck,
  normalizeCharacterBehaviorAntagonistSelfStoryCheck,
  normalizeCharacterBehaviorAntagonistTierExitCheck,
  normalizeCharacterBehaviorAntagonistWeightCheck,
  normalizeCharacterBehaviorLayeredTagsCheck,
  normalizeCharacterBehaviorMotivationCheck,
  normalizeCharacterBehaviorMotivationSpecificityCheck,
  normalizeCharacterBehaviorProtagonistComposureCheck,
  normalizeCharacterBehaviorRepeatCheck,
  normalizeCharacterBehaviorRoleCardCheck,
  normalizeCharacterBehaviorRulesCheck,
  normalizeCharacterBehaviorStrongAssociationCheck,
  normalizeCharacterBehaviorSupportingRoleCheck,
  normalizeCharacterBehaviorSupportingRoleExitCheck,
  normalizeCharacterDrivenEventCheck,
  normalizeIdentityGoldfingerAlignmentCheck,
  normalizeProtagonistRedLineCheck,
} from '../../novel-writing/character-behavior-basics'

import {
  anchorMatchScore,
} from '../../novel-writing/text-matching'

import {
  asArray,
} from '../../routes/novel-route-utils'

import {
  buildCharacterBehaviorContract,
} from '../quality/character-asset-contracts'

import {
  compactBriefText,
  uniqueBriefStrings,
} from '../quality/text-utils'

import {
  contextWithChapterRawPreDraftForSync,
} from './quality-sync-reports-benchmark'

export function characterBehaviorContractForSync(contextPackage: any = {}, chapter: any = {}) {
  return buildCharacterBehaviorContract(contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function characterBehaviorArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => compactBriefText(item)).filter(Boolean), 20)
}

export function normalizeCharacterBehaviorAnchorCheck(key: string, label: string, values: any[], chapterText: string, fix: string, threshold = 28) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const checked = planned.map(text => {
    const match = anchorMatchScore(text, chapterText)
    return {
      text,
      score: match.score,
      evidence: match.matched,
      delivered: match.score >= threshold,
    }
  })
  const missed = checked.filter(item => !item.delivered)
  return {
    key,
    label,
    text: planned.join('；'),
    expected: planned.join('；'),
    score: Math.round(checked.reduce((sum, item) => sum + Number(item.score || 0), 0) / Math.max(1, checked.length)),
    evidence: checked.flatMap(item => item.evidence).filter(Boolean).slice(0, 8),
    delivered: missed.length === 0,
    status: missed.length === 0 ? 'ok' : 'warn',
    missed_items: missed.map(item => item.text),
    issue: missed.length === 0 ? '' : `${label}未充分落地：${missed.map(item => item.text).join('；')}`,
    repair_instruction: missed.length === 0 ? '' : fix,
  }
}

export function normalizeCharacterBehaviorMemoryAnchorCheck(values: any[], chapterText: string) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasAnchor = planned.some(item => {
    const match = anchorMatchScore(item, text)
    return match.score >= 24
  }) || /旧夹克|袖口|口头禅|标志动作|短句反问|疤|铃|刀|伞|左手/.test(text)
  return {
    key: 'memory_anchors',
    label: '记忆锚点',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: hasAnchor ? 86 : 24,
    evidence: hasAnchor ? ['记忆锚点可见'] : [],
    delivered: hasAnchor,
    status: hasAnchor ? 'ok' : 'warn',
    missed_items: hasAnchor ? [] : planned,
    issue: hasAnchor ? '' : '角色记忆锚点没有在正文出现，读者缺少可复述的口头禅、动作或外物。',
    repair_instruction: hasAnchor ? '' : '补记忆锚点：让口头禅、标志动作、外物或行为习惯在关键选择前后出现一次。',
  }
}

export function buildCharacterBehaviorSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = characterBehaviorContractForSync(contextPackage, chapter)
  const checks = [
    normalizeCharacterBehaviorMotivationCheck(contract.motivation_chain || contract.motivationChain, chapterText),
    normalizeCharacterBehaviorMotivationSpecificityCheck(contract.motivation_specificity_rules || contract.motivationSpecificityRules, chapterText),
    normalizeCharacterBehaviorLayeredTagsCheck(contract.layered_tags || contract.layeredTags, chapterText),
    normalizeCharacterBehaviorRulesCheck(contract.behavior_rules || contract.behaviorRules || contract.quality_checks || contract.qualityChecks, chapterText),
    normalizeCharacterBehaviorProtagonistComposureCheck(contract.protagonist_composure_rules || contract.protagonistComposureRules, chapterText),
    normalizeCharacterBehaviorStrongAssociationCheck(contract.strong_association_rules || contract.strongAssociationRules, chapterText),
    normalizeCharacterBehaviorMemoryAnchorCheck(contract.memory_anchors || contract.memoryAnchors, chapterText),
    normalizeCharacterBehaviorSupportingRoleCheck(contract.supporting_role_functions || contract.supportingRoleFunctions, chapterText),
    normalizeCharacterBehaviorRoleCardCheck(contract.role_card_requirements || contract.roleCardRequirements, chapterText),
    normalizeCharacterBehaviorSupportingRoleExitCheck(contract.supporting_role_exit_rules || contract.supportingRoleExitRules, chapterText),
    normalizeCharacterBehaviorRepeatCheck(contract.behavior_repeat_rules || contract.behaviorRepeatRules, chapterText),
    normalizeCharacterDrivenEventCheck(contract.character_driven_event_rules || contract.characterDrivenEventRules, chapterText),
    normalizeProtagonistRedLineCheck(contract.protagonist_red_line_rules || contract.protagonistRedLineRules, chapterText),
    normalizeIdentityGoldfingerAlignmentCheck(contract.identity_goldfinger_alignment_rules || contract.identityGoldfingerAlignmentRules, chapterText),
    normalizeCharacterBehaviorAntagonistLogicCheck(contract.antagonist_logic || contract.antagonistLogic, chapterText),
    normalizeCharacterBehaviorAntagonistWeightCheck(contract.antagonist_weight_rules || contract.antagonistWeightRules, chapterText),
    normalizeCharacterBehaviorAntagonistSelfStoryCheck(contract.antagonist_self_story_rules || contract.antagonistSelfStoryRules, chapterText),
    normalizeCharacterBehaviorAntagonistTierExitCheck(contract.antagonist_tier_exit_rules || contract.antagonistTierExitRules, chapterText),
    buildCharacterBehaviorDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = characterBehaviorPriority(missed)

  return {
    report_id: `character-behavior-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '角色行为未配置' : status === 'ok' ? '角色行为 OK' : `角色行为缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 character_behavior_contract，建议补充动机链、动机具体性、三层标签、行为规则、主角逼格反应、人设强关联、记忆锚点、配角功能、角色卡必备项、配角退场规划、行为重复点、人推事件、主角红线、身份/金手指对齐、反派逻辑、反派分量、反派自我叙事和反派层级退场。'
      : status === 'ok'
        ? '正文已基本兑现动机链、动机具体性、三层标签、行为规则、主角逼格反应、人设强关联、记忆锚点、配角功能、角色卡必备项、配角退场规划、行为重复点、人推事件、主角红线、身份/金手指对齐、反派逻辑、反派分量、反派自我叙事和反派层级退场。'
        : `正文有 ${missedCount} 项角色行为缺口，${priorityRepair || '优先补动机链、起因具体性、行为证据、主角逼格反应、人设强关联、角色卡、配角退场规划、行为重复点、人推事件、主角红线、身份/金手指对齐、反派逻辑、反派分量、反派自我叙事和反派层级退场'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持角色行为：行动继续由动机链驱动，起因具体、动机有情感层面且演变有铺垫；升级线与主角反应线分开，面对低级挑衅保持轻描淡写、短句或行动压制；重要角色保留至少3个能推动剧情/爽点/人物碰撞的强关联；角色卡必备项、配角退场规划、行为重复点、人推事件、主角红线和身份/金手指对齐继续有证据；用动作、对白和反应展示人设，配角有功能，反派有内在逻辑、真实分量、自我叙事和层级匹配的退场规划。']
      : [
          '下一章必须补角色行为：先写清起因、意图、约束、风险；起因具体到谁、何时、当众如何伤害，动机落到情感层面，再让关键行动从这条动机链推出。',
          '修主角逼格反应：升级线与主角反应线分开管理，升级只提升实力/能力；面对低级挑衅时删掉暴怒、面红耳赤和歇斯底里，改成轻描淡写、短句反锁或动作压制。',
          '补人设强关联：每个重要角色至少3个强关联设定，直接影响剧情走向、核心梗、装逼爽点或人物碰撞；外貌、爱好、身高体重只能做弱关联记忆点。',
          '补角色卡必备项：角色定位、身份标签、外貌特征、核心目标、核心动机、致命弱点、口头禅/标志动作必须能被正文或写前合同定位。',
          '补配角退场规划：每个有台词配角要有现场功能、与主角关系、核心特质、标志性特征和退场方式；同一场景配角不超过3个有台词。',
          '补行为重复点：选一个读者喜欢的动作、口头禅或反应，在不同场景重复并承担不同功能。',
          '改成人推事件：从人物动机和选择找方向，不要让剧情需要、外部事件或作者硬编剧情替角色做决定。',
          '守主角红线和身份/金手指对齐：删圣母、无脑、内核邪恶、因蠢犯错和自暴自弃；社会身份、身世、金手指、性格必须和世界基调统一。',
          '把人设写成动作、对白和反应；配角必须承担证据、阻碍、反应或代价功能，反派必须从自身目标和约束出发行动。',
          '补反派分量：先展示实力/手段和可信动机，制造真实威胁或至少一次压制；真实目的留到关键反转点，反派长处要照出主角弱点。',
          '补反派自我叙事：让反派在自己眼中是主人公，补梦想/旧痛/避免的痛苦，并把他的优势写成会继续制造冲突的致命缺陷。',
          '补反派层级退场：按小反派/中等反派/大弧 Boss/最终 Boss 匹配篇幅、功能和退场方式，避免小反派拖太久、大 Boss 草率退场或最终 Boss 无伏笔。',
      ],
  }
}

