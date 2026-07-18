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

export function buildFemaleAudienceContract(project: any = {}, contextPackage: any = {}) {
  const explicit = femaleAudienceExplicitContract(contextPackage)
  const activation = resolveFemaleAudienceActivation(project, contextPackage)
  const explicitActivationMode = explicit && typeof explicit === 'object' && !Array.isArray(explicit)
    ? normalizeFemaleAudienceActivationMode(explicit.activation_mode ?? explicit.activationMode ?? explicit.female_audience_mode ?? explicit.femaleAudienceMode ?? explicit.enabled)
    : 'auto'
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit) && explicitActivationMode === 'disabled') return null
  if (activation.mode === 'disabled' && explicitActivationMode !== 'enabled') return null
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildFemaleAudienceContract(project, {
      ...(contextPackage || {}),
      female_audience_contract: null,
      femaleAudienceContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            female_audience_contract: null,
            femaleAudienceContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            female_audience_contract: null,
            femaleAudienceContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            female_audience_contract: null,
            femaleAudienceContract: null,
          }
        : contextPackage?.chapter_target,
    }) || {}
    const explicitCorePrinciples = asArray(explicit.core_principles || explicit.corePrinciples).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitReaderNeedRules = asArray(explicit.reader_need_rules || explicit.readerNeedRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitCopyPromiseRules = asArray(explicit.copy_promise_rules || explicit.copyPromiseRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitLongformGenreRules = asArray(explicit.longform_genre_rules || explicit.longformGenreRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRomanceAxisRules = asArray(explicit.romance_axis_rules || explicit.romanceAxisRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitAbuseDosageRules = asArray(explicit.abuse_dosage_rules || explicit.abuseDosageRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitPlatformFitRules = asArray(explicit.platform_fit_rules || explicit.platformFitRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_female_audience_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      activation_mode: explicitActivationMode === 'enabled' ? 'enabled' : activation.mode,
      activation_source: explicitActivationMode === 'enabled' ? 'explicit.female_audience_contract' : activation.source,
      activation_reason: explicitActivationMode === 'enabled' ? '显式女频长篇合同已启用。' : activation.reason,
      audience_mode: compactBriefText(explicit.audience_mode || explicit.audienceMode || derived.audience_mode || 'female_longform'),
      core_principles: explicitCorePrinciples.length ? explicitCorePrinciples : asArray(derived.core_principles),
      reader_need_rules: explicitReaderNeedRules.length ? explicitReaderNeedRules : asArray(derived.reader_need_rules),
      copy_promise_rules: explicitCopyPromiseRules.length ? explicitCopyPromiseRules : asArray(derived.copy_promise_rules),
      longform_genre_rules: explicitLongformGenreRules.length ? explicitLongformGenreRules : asArray(derived.longform_genre_rules),
      romance_axis_rules: explicitRomanceAxisRules.length ? explicitRomanceAxisRules : asArray(derived.romance_axis_rules),
      abuse_dosage_rules: explicitAbuseDosageRules.length ? explicitAbuseDosageRules : asArray(derived.abuse_dosage_rules),
      platform_fit_rules: explicitPlatformFitRules.length ? explicitPlatformFitRules : asArray(derived.platform_fit_rules),
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_FEMALE_AUDIENCE_QUALITY_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : ['补安全感锚点', '补女主主动选择', '让感情升级踩到事业/成长节点', '控制虐戏剂量', '修货板一致'],
    }
  }

  const autoDetected = detectFemaleAudienceContext(project, contextPackage)
  if (activation.mode !== 'enabled' && !autoDetected) return null
  const platformText = [
    project?.target_platform,
    project?.target_audience,
    contextPackage?.chapter_target?.target_platform,
    contextPackage?.writing_bible?.target_platform,
  ].filter(Boolean).join(' ')
  const platformFitRules = /番茄|fanqie/.test(platformText)
    ? OH_STORY_FEMALE_AUDIENCE_PLATFORM_FIT_RULES
    : OH_STORY_FEMALE_AUDIENCE_PLATFORM_FIT_RULES
  return {
    version: 'oh_story_female_audience_v1',
    source: 'oh_story_embedded_fallback',
    activation_mode: activation.mode,
    activation_source: activation.source,
    activation_reason: activation.mode === 'enabled' ? activation.reason : '关键词自动识别命中女频/女生频道/女主导向信号。',
    audience_mode: 'female_longform',
    core_principles: OH_STORY_FEMALE_AUDIENCE_CORE_PRINCIPLES,
    reader_need_rules: OH_STORY_FEMALE_AUDIENCE_READER_NEED_RULES,
    copy_promise_rules: OH_STORY_FEMALE_AUDIENCE_COPY_PROMISE_RULES,
    longform_genre_rules: OH_STORY_FEMALE_AUDIENCE_LONGFORM_GENRE_RULES,
    romance_axis_rules: OH_STORY_FEMALE_AUDIENCE_ROMANCE_AXIS_RULES,
    abuse_dosage_rules: OH_STORY_FEMALE_AUDIENCE_ABUSE_DOSAGE_RULES,
    platform_fit_rules: platformFitRules,
    quality_checks: OH_STORY_FEMALE_AUDIENCE_QUALITY_CHECKS,
    revision_priorities: ['补安全感锚点', '补女主主动选择', '让感情升级踩到事业/成长节点', '控制虐戏剂量', '修货板一致'],
  }
}

