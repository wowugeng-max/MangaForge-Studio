import { asArray } from '../../routes/novel-route-utils'
import {
  normalizeConflictNetworkLayersContract,
  normalizeConflictWebContract,
} from '../../novel-writing/conflict-structure-basics'
import { continuityHeatItemText } from '../../novel-writing/continuity-heat-basics'
import { normalizeReaderExpectationDebtContext } from '../batch-serial/serial-momentum'
import { firstDefined } from '../post-delivery/core-handoff-sync-reports'
import { compactBriefText, uniqueBriefStrings } from './text-utils'
import { storylineUsageByAnyType } from './continuity-dialogue-contracts'

import {
  OH_STORY_EXPECTATION_BEFORE_PAYOFF_RULES,
  OH_STORY_EXPECTATION_RELAY_RULES,
  OH_STORY_EXPECTATION_THRESHOLD_CHECKS,
  OH_STORY_FEMALE_AUDIENCE_ABUSE_DOSAGE_RULES,
  OH_STORY_FEMALE_AUDIENCE_COPY_PROMISE_RULES,
  OH_STORY_FEMALE_AUDIENCE_CORE_PRINCIPLES,
  OH_STORY_FEMALE_AUDIENCE_LONGFORM_GENRE_RULES,
  OH_STORY_FEMALE_AUDIENCE_PLATFORM_FIT_RULES,
  OH_STORY_FEMALE_AUDIENCE_QUALITY_CHECKS,
  OH_STORY_FEMALE_AUDIENCE_READER_NEED_RULES,
  OH_STORY_FEMALE_AUDIENCE_ROMANCE_AXIS_RULES,
  OH_STORY_INFORMATION_FLOW_CHECKS,
  OH_STORY_INFORMATION_NEXT_OBJECTIVE_RULES,
  OH_STORY_INFORMATION_TRANSITION_COMPRESSION_RULES,
  OH_STORY_INFORMATION_TRANSITION_RULES,
  detectFemaleAudienceContext,
  femaleAudienceExplicitContract,
  normalizeFemaleAudienceActivationMode,
  resolveFemaleAudienceActivation
} from './audience-quality-contracts'

const OH_STORY_CONFLICT_STRUCTURE_LADDER = [
  '冲突必须升级：言语->行动->激烈对抗->决定胜负。',
  '冲突必须有明确结果，不能只停在争吵、误会或气氛压迫。',
  '本质是有人阻止主角得到他想要的东西；没有阻止者就没有有效冲突。',
]

const OH_STORY_CONFLICT_MOTIVATION_RULES = [
  '三种动机来源至少命中其一：世界背景、金手指、人物关系；强章节最好命中两种以上。',
  '危机解除后，必须通过配角/反派/环境强调更强力量、更大资源或新限制，过渡到下一阶段。',
  '上一危机解决时必须埋下下一个危机的伏笔。',
]

const OH_STORY_ANTAGONIST_PRESSURE_RULES = [
  '压势不压人：反派或阻力优先针对地区、阶层、规则、资源或群体，客观上让主角陷入困境。',
  '反派视角或阻力逻辑要清楚，不要谜语人；读者可以知道部分计划，从而期待打脸。',
  '对手不能只站桩嘲讽，必须有能阻止主角目标的动作、资源、规则或信息优势。',
]

const OH_STORY_PROTAGONIST_AGENCY_RULES = [
  '做别人不敢做的事：反抗权威、挑战强者或打破默认规则。',
  '做别人做不到的事：死局中找到生路，突破当前能力/资源限制。',
  '做别人没想到可以这么做的事：用曲线救国、信息差或非常规方法破局。',
  '戏剧性服务人设，不能为了意外让主角行为崩人设。',
]

const OH_STORY_CONFLICT_NO_EXIT_RULES = [
  '有进无出：读者必须相信主角非踏入不可，不能随时退出。',
  '死亡赌注必须明确：肉体死亡、身份/职场死亡或心理死亡至少一种贯穿。',
  '冲突必须有黏结剂：杀人理由、工作职责、道德责任或实体场所至少命中一种。',
  '对立双方都要无法轻易脱身，不能只有主角被迫、对手随时可撤。',
]

const OH_STORY_CONFLICT_NETWORK_LAYER_RULES = {
  vertical_conflict: '纵向矛盾：上下级、控制服从、压制反抗、师徒或君臣等权力/规则压制必须可见。',
  horizontal_conflict: '横向矛盾：理念冲突、资源争夺、同行竞争、情敌或竞争对手等同层冲突必须可见。',
  cross_conflict: '交叉矛盾：A-B、B-C、A-C 互相牵连，解决一条矛盾必须牵动另一条。',
  weaving_order: [
    '定地图→定阵营→定角色：先确定冲突发生地图、阵营和角色，再填充纵向/横向/交叉矛盾。',
    '对齐阵营填充纵向+横向矛盾，再推理角色之间的交叉矛盾。',
  ],
}

const OH_STORY_CONFLICT_STRUCTURE_QUALITY_CHECKS = [
  '冲突必须升级，至少能看到言语/规则压迫、行动阻拦、对抗升级、决定胜负中的三层。',
  '每个主要场景必须有明确阻力：有人、规则、资源或环境阻止主角得到目标。',
  '有进无出必须成立：读者相信主角非踏入不可，死亡赌注/退出代价和黏结剂清楚。',
  '冲突必须有明确结果：胜负、资格、关系、信息、资源或局势至少一项发生变化。',
  '对抗设计应优先压势不压人，让阻力有地区/阶层/规则/资源根基。',
  '主角必须主动破局，至少体现“做别人不敢做/做不到/想不到”的一类行动力。',
  '同一时刻保持2-3条矛盾线同时运行，矛盾线之间要有因果、利益冲突或信息差；每次解决一个矛盾，必须激活或加深另一个矛盾。',
  '长篇冲突网络必须同时保留纵向矛盾、横向矛盾和交叉矛盾，按定地图→定阵营→定角色编织。',
  '结尾必须留下下一冲突种子，不能在解决后让麻烦消失。',
]

function conflictStructureExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.conflict_structure_contract
    || contextPackage?.chapter_target?.conflictStructureContract
    || contextPackage?.conflict_structure_contract
    || contextPackage?.conflictStructureContract
    || contextPackage?.pre_draft_brief?.conflict_structure_contract
    || contextPackage?.preDraftBrief?.conflictStructureContract
}

function inferConflictMotivationSources(project: any = {}, contextPackage: any = {}, text = '') {
  const writingBible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  return uniqueBriefStrings([
    /协会|规则|阶层|地区|世界|环境|旧城|宗门|公司|平台|制度/.test(text) ? '世界背景：规则/地区/阶层环境迫使主角处理冲突。' : '',
    writingBible?.golden_finger || writingBible?.goldenFinger || /系统|金手指|技能|面板|奖励|能力/.test(text) ? '金手指：能力反馈或特殊信息成为破局驱动力。' : '',
    /前妻|客户|会长|亲友|关系|家族|同伴|师门/.test(text) ? '人物关系：客户、亲友、反派或群体态度变化推动主角行动。' : '',
  ], 8)
}

function inferConflictWebContract(target: any = {}, sceneCards: any[] = []) {
  const activeLines = uniqueBriefStrings([
    ...sceneCards.map((scene: any, index: number) => {
      const conflict = compactBriefText(scene.conflict || scene.purpose || scene.title)
      return conflict ? `${conflict}${/线$/.test(conflict) ? '' : '线'}` : `场景${scene.scene_no || index + 1}矛盾线`
    }),
    target.conflict ? `${compactBriefText(target.conflict)}线` : '',
    target.ending_hook ? `${compactBriefText(target.ending_hook)}线` : '',
  ].filter(Boolean), 3)
  if (!activeLines.length) return null
  const nextSeeds = uniqueBriefStrings([
    target.ending_hook,
    ...sceneCards.map((scene: any) => scene.ending_hook_seed || scene.information_gap || scene.reversal),
  ].map((item: any) => compactBriefText(item)).filter(Boolean), 3)
  return {
    active_lines: activeLines,
    link_rules: [
      '2-3条矛盾线必须通过因果、利益冲突或信息差互相牵连。',
      '当前阻力、人物关系和章尾新压力不能各自无关。',
    ],
    activation_rules: uniqueBriefStrings([
      '解决一条矛盾线后，必须激活或加深另一条矛盾线。',
      nextSeeds.length ? `章尾用${nextSeeds.join('、')}接力下一条矛盾线。` : '',
    ], 4),
  }
}

function inferConflictNetworkLayersContract(target: any = {}, sceneCards: any[] = []) {
  const sceneConflicts = sceneCards.map((scene: any) => compactBriefText(scene.conflict || scene.purpose || scene.title)).filter(Boolean)
  const sceneTitles = sceneCards.map((scene: any) => compactBriefText(scene.title)).filter(Boolean)
  const rawText = [
    target.title,
    target.summary,
    target.conflict,
    target.ending_hook,
    ...sceneConflicts,
    ...sceneTitles,
  ].filter(Boolean).join(' ')
  if (!rawText.trim() && !sceneConflicts.length) return null
  const verticalSource = uniqueBriefStrings([
    target.conflict,
    ...sceneConflicts.filter((item: string) => /会长|协会|规则|权限|资质|上级|领导|宗门|师徒|公司|平台|封单|不许|挡住|压/.test(item)),
    sceneConflicts[0],
  ].map((item: any) => compactBriefText(item)).filter(Boolean), 3)[0]
  const horizontalSource = uniqueBriefStrings([
    ...sceneConflicts.filter((item: string) => /客户|同业|同行|竞争|争夺|抢|订单|资源|情敌|对手/.test(item)),
    /客户|同业|竞争|争夺|订单|资源|授权/.test(rawText) ? target.conflict : '',
    sceneConflicts[1],
  ].map((item: any) => compactBriefText(item)).filter(Boolean), 3)[0]
  const crossSource = uniqueBriefStrings([
    target.ending_hook,
    ...sceneCards.flatMap((scene: any) => [scene.ending_hook_seed, scene.reversal, scene.information_gap, ...asArray(scene.state_changes_expected || scene.stateChangesExpected)]),
    sceneConflicts[2],
  ].map((item: any) => compactBriefText(item)).filter(Boolean), 3)[0]
  return {
    vertical_conflict: verticalSource
      ? `纵向矛盾：${verticalSource}；必须体现权力/规则压制和服从-反抗关系。`
      : OH_STORY_CONFLICT_NETWORK_LAYER_RULES.vertical_conflict,
    horizontal_conflict: horizontalSource
      ? `横向矛盾：${horizontalSource}；必须体现资源、理念、客户、订单或同层竞争。`
      : OH_STORY_CONFLICT_NETWORK_LAYER_RULES.horizontal_conflict,
    cross_conflict: crossSource
      ? `交叉矛盾：${crossSource}；必须让解决一条矛盾牵动另一条。`
      : OH_STORY_CONFLICT_NETWORK_LAYER_RULES.cross_conflict,
    weaving_order: OH_STORY_CONFLICT_NETWORK_LAYER_RULES.weaving_order,
  }
}

export function buildConflictStructureContract(project: any = {}, contextPackage: any = {}) {
  const explicit = conflictStructureExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildConflictStructureContract(project, {
      ...(contextPackage || {}),
      conflict_structure_contract: null,
      conflictStructureContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            conflict_structure_contract: null,
            conflictStructureContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            conflict_structure_contract: null,
            conflictStructureContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            conflict_structure_contract: null,
            conflictStructureContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitConflictLadder = asArray(explicit.conflict_ladder || explicit.conflictLadder).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitMotivationSources = asArray(explicit.motivation_sources || explicit.motivationSources).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitAntagonistPressureRules = asArray(explicit.antagonist_pressure_rules || explicit.antagonistPressureRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitProtagonistAgencyRules = asArray(explicit.protagonist_agency_rules || explicit.protagonistAgencyRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitEventValueChanges = asArray(explicit.event_value_changes || explicit.eventValueChanges).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitNextConflictSeeds = asArray(explicit.next_conflict_seeds || explicit.nextConflictSeeds).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitConflictWeb = normalizeConflictWebContract(explicit.conflict_web || explicit.conflictWeb)
    const explicitConflictNetworkLayers = normalizeConflictNetworkLayersContract(explicit.conflict_network_layers || explicit.conflictNetworkLayers)
    const explicitNoExitRules = asArray(explicit.no_exit_rules || explicit.noExitRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_conflict_structure_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      conflict_ladder: explicitConflictLadder.length
        ? explicitConflictLadder
        : asArray(derived.conflict_ladder).length ? asArray(derived.conflict_ladder) : OH_STORY_CONFLICT_STRUCTURE_LADDER,
      motivation_sources: explicitMotivationSources.length ? explicitMotivationSources : asArray(derived.motivation_sources),
      antagonist_pressure_rules: explicitAntagonistPressureRules.length
        ? explicitAntagonistPressureRules
        : asArray(derived.antagonist_pressure_rules).length ? asArray(derived.antagonist_pressure_rules) : OH_STORY_ANTAGONIST_PRESSURE_RULES,
      protagonist_agency_rules: explicitProtagonistAgencyRules.length
        ? explicitProtagonistAgencyRules
        : asArray(derived.protagonist_agency_rules).length ? asArray(derived.protagonist_agency_rules) : OH_STORY_PROTAGONIST_AGENCY_RULES,
      event_value_changes: explicitEventValueChanges.length ? explicitEventValueChanges : asArray(derived.event_value_changes),
      next_conflict_seeds: explicitNextConflictSeeds.length ? explicitNextConflictSeeds : asArray(derived.next_conflict_seeds),
      conflict_web: explicitConflictWeb || normalizeConflictWebContract(derived.conflict_web || derived.conflictWeb),
      conflict_network_layers: explicitConflictNetworkLayers || normalizeConflictNetworkLayersContract(derived.conflict_network_layers || derived.conflictNetworkLayers),
      no_exit_rules: explicitNoExitRules.length
        ? explicitNoExitRules
        : asArray(derived.no_exit_rules).length ? asArray(derived.no_exit_rules) : OH_STORY_CONFLICT_NO_EXIT_RULES,
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_CONFLICT_STRUCTURE_QUALITY_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : ['补阻止者', '补有进无出', '补冲突升级阶梯', '补明确胜负结果', '补主角主动破局', '补下一冲突种子'],
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const rawText = [
    project?.title,
    project?.genre,
    project?.synopsis,
    target.summary,
    target.conflict,
    target.ending_hook,
    ...sceneCards.flatMap((scene: any) => [
      scene.title,
      scene.purpose,
      scene.conflict,
      scene.reader_payoff,
      scene.reversal,
      scene.ending_hook_seed,
      ...asArray(scene.action_beats || scene.actionBeats),
      ...asArray(scene.state_changes_expected || scene.stateChangesExpected),
    ]),
  ].filter(Boolean).join(' ')
  const eventValueChanges = uniqueBriefStrings([
    ...sceneCards.flatMap((scene: any) => asArray(scene.state_changes_expected || scene.stateChangesExpected)),
    ...sceneCards.map((scene: any) => scene.reversal ? `反转改变局势：${scene.reversal}` : ''),
    target.ending_hook ? `章尾局势变化：${target.ending_hook}` : '',
  ], 12)
  const nextConflictSeeds = uniqueBriefStrings([
    target.ending_hook,
    ...sceneCards.map((scene: any) => scene.ending_hook_seed || scene.information_gap),
  ], 8)
  const conflictWeb = inferConflictWebContract(target, sceneCards)
  const conflictNetworkLayers = inferConflictNetworkLayersContract(target, sceneCards)
  const sceneConflictLadder = uniqueBriefStrings([
    ...OH_STORY_CONFLICT_STRUCTURE_LADDER,
    ...sceneCards.map((scene: any, index: number) => {
      const conflict = compactBriefText(scene.conflict || scene.purpose)
      return conflict ? `场景${scene.scene_no || index + 1}阻力：${conflict}` : ''
    }),
  ], 18)
  return {
    version: 'oh_story_conflict_structure_v1',
    source: 'oh_story_embedded_fallback',
    conflict_ladder: sceneConflictLadder,
    motivation_sources: inferConflictMotivationSources(project, contextPackage, rawText),
    antagonist_pressure_rules: OH_STORY_ANTAGONIST_PRESSURE_RULES,
    protagonist_agency_rules: OH_STORY_PROTAGONIST_AGENCY_RULES,
    event_value_changes: eventValueChanges.length ? eventValueChanges : ['本章结束时必须让胜负、资格、关系、信息、资源或局势至少一项发生变化。'],
    next_conflict_seeds: nextConflictSeeds,
    conflict_web: conflictWeb,
    conflict_network_layers: conflictNetworkLayers,
    no_exit_rules: OH_STORY_CONFLICT_NO_EXIT_RULES,
    quality_checks: OH_STORY_CONFLICT_STRUCTURE_QUALITY_CHECKS,
    revision_priorities: ['补阻止者', '补有进无出', '补冲突升级阶梯', '补明确胜负结果', '补主角主动破局', '补下一冲突种子'],
  }
}

