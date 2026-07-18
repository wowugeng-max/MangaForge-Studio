import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import {
  paragraphHasDownwardPressure,
  paragraphHasOppressionPressure,
  textHasDownwardSafetySignal,
} from '../../novel-writing/emotional-payoff-scans'
import { anchorMatchScore } from '../../novel-writing/text-matching'
import { firstCompactText } from '../../novel-writing/story-drive-basics'
import { normalizeBeatCoolingType } from '../../novel-writing/beat-cooling-basics'
import {
  SERIAL_CONFLICT_SIGNAL_PATTERN,
  SERIAL_CORE_ELEMENT_HINTS,
  SERIAL_CORE_HOOK_ANGLE_HINTS,
  SERIAL_CORE_HOOK_DELIVERY_PATTERN,
  SERIAL_DOWNWARD_RECOVERY_PATTERN,
  SERIAL_EXPECTATION_LADDER_CONTRACT_PATTERN,
  SERIAL_EXPECTATION_LONG_LAYER_PATTERN,
  SERIAL_EXPECTATION_MEDIUM_LAYER_PATTERN,
  SERIAL_EXPECTATION_SHORT_LAYER_PATTERN,
  SERIAL_FORESHADOWING_CONTRACT_PATTERN,
  SERIAL_FORESHADOWING_LABEL_HINTS,
  SERIAL_FORESHADOWING_NO_PROGRESS_PATTERN,
  SERIAL_FORESHADOWING_PROGRESS_PATTERN,
  SERIAL_LOOSE_EXIT_PATTERN,
  SERIAL_NO_EXIT_GLUE_PATTERN,
  SERIAL_PROTAGONIST_CURRENT_GOAL_PATTERN,
  SERIAL_PROTAGONIST_LONG_GOAL_PATTERN,
  SERIAL_READER_NEED_CONTRACT_PATTERN,
  SERIAL_READER_NEED_SIGNAL_PATTERN,
  SERIAL_RELATION_TEXTURE_PATTERN,
  SERIAL_SOCIAL_INTERACTION_PATTERN,
  SERIAL_STATUS_LADDER_CONTEXT_PATTERN,
  SERIAL_TEXTURE_NEGATION_PATTERN,
  SERIAL_UPPER_STATUS_CONTACT_PATTERN,
  SERIAL_WEAK_CONFLICT_PATTERN,
  SERIAL_WORLD_EXPANSION_CONTRACT_PATTERN,
  SERIAL_WORLD_EXPANSION_SIGNAL_PATTERN,
  SERIAL_WORLD_TEXTURE_PATTERN,
  serialChapterBlueprintForLines,
  serialChapterRawContextTarget,
  serialChapterStoryLoopContract,
  serialChapterText,
  serialPositivePatternTest,
} from './serial-momentum'

import {
  serialCoreHookAngleLabel,
  serialNormalizeCoreElement
} from './serial-momentum-states-extended-shared'

export function serialChapterCoreElementCombo(chapter: any) {
  const contract = serialChapterStoryLoopContract(chapter)
  const explicitElements = asArray(contract?.core_elements || contract?.coreElements || chapter?.core_elements || chapter?.coreElements)
    .map((item: any) => serialNormalizeCoreElement(String(item || '')))
    .filter(Boolean)
  const inferredElements = SERIAL_CORE_ELEMENT_HINTS
    .filter(([pattern]) => {
      const text = serialChapterText(chapter)
      pattern.lastIndex = 0
      return pattern.test(text)
    })
    .map(([, label]) => label)
  const elements = uniqueBriefStrings(explicitElements.length ? explicitElements : inferredElements, 6).sort()
  if (elements.length < 3) return null
  return {
    elements,
    key: elements.join('|'),
    label: elements.join(' + '),
  }
}

export function serialChapterCoreHookState(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const outline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  const genreContract = chapter?.genre_positioning_contract
    || chapter?.genrePositioningContract
    || rawPayload?.genre_positioning_contract
    || rawPayload?.genrePositioningContract
    || preDraftBrief?.genre_positioning_contract
    || preDraftBrief?.genrePositioningContract
    || chapterTarget?.genre_positioning_contract
    || chapterTarget?.genrePositioningContract
    || blueprint?.genre_positioning_contract
    || blueprint?.genrePositioningContract
    || {}
  const qualityContract = chapter?.quality_audit_contract
    || chapter?.qualityAuditContract
    || rawPayload?.quality_audit_contract
    || rawPayload?.qualityAuditContract
    || preDraftBrief?.quality_audit_contract
    || preDraftBrief?.qualityAuditContract
    || chapterTarget?.quality_audit_contract
    || chapterTarget?.qualityAuditContract
    || blueprint?.quality_audit_contract
    || blueprint?.qualityAuditContract
    || {}
  const commercial = rawPayload?.commercial_positioning
    || rawPayload?.commercialPositioning
    || rawPayload?.writing_bible?.commercial_positioning
    || rawPayload?.writingBible?.commercialPositioning
    || {}
  const coreHookItems = uniqueBriefStrings([
    chapter?.core_selling_point,
    chapter?.coreSellingPoint,
    rawPayload?.core_selling_point,
    rawPayload?.coreSellingPoint,
    rawPayload?.writing_bible?.core_selling_point,
    rawPayload?.writingBible?.coreSellingPoint,
    commercial?.core_selling_point,
    commercial?.coreSellingPoint,
    commercial?.selling_points,
    commercial?.sellingPoints,
    genreContract?.core_hook_rules,
    genreContract?.coreHookRules,
    genreContract?.longboard_focus_rules,
    genreContract?.longboardFocusRules,
    qualityContract?.selling_point_expression_rules,
    qualityContract?.sellingPointExpressionRules,
  ].flat().map((item: any) => compactBriefText(item)).filter(Boolean), 10)
  const deliveryText = compactBriefText([
    chapter?.title,
    chapter?.chapter_summary,
    chapter?.summary,
    chapter?.conflict,
    chapter?.ending_hook,
    chapter?.endingHook,
    rawPayload?.title,
    rawPayload?.chapter_summary,
    rawPayload?.chapterSummary,
    rawPayload?.summary,
    rawPayload?.conflict,
    rawPayload?.ending_hook,
    rawPayload?.endingHook,
    outline?.cause,
    outline?.development,
    outline?.turn,
    outline?.climax,
    outline?.ending,
    plotLines?.mainline,
    plotLines?.main_line,
    plotLines?.mainLine,
    plotLines?.subplot,
    plotLines?.subplot_line,
    plotLines?.subplotLine,
    plotLines?.reader_payoff,
    plotLines?.readerPayoff,
  ].flat().map((item: any) => String(item || '').trim()).filter(Boolean).join('。'))
  SERIAL_CORE_HOOK_DELIVERY_PATTERN.lastIndex = 0
  const hasSignalDelivery = Boolean(deliveryText && SERIAL_CORE_HOOK_DELIVERY_PATTERN.test(deliveryText))
  const hasAnchorDelivery = coreHookItems.some((item: string) => anchorMatchScore(item, deliveryText).score >= 34)
  const angleLabel = serialCoreHookAngleLabel(deliveryText)
  return {
    has_core_hook_contract: coreHookItems.length > 0,
    has_core_hook_delivery: Boolean(hasSignalDelivery || hasAnchorDelivery),
    core_hook_angle: angleLabel,
  }
}

