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

export function serialNormalizeCoreElement(text: string) {
  const value = compactBriefText(text)
  if (!value) return ''
  for (const [pattern, label] of SERIAL_CORE_ELEMENT_HINTS) {
    pattern.lastIndex = 0
    if (pattern.test(value)) return label
  }
  return value.slice(0, 18)
}

export function serialCoreHookAngleLabel(text: string) {
  const value = compactBriefText(text)
  if (!value) return ''
  for (const [pattern, label] of SERIAL_CORE_HOOK_ANGLE_HINTS) {
    pattern.lastIndex = 0
    if (pattern.test(value)) return label
  }
  return ''
}

export function serialChapterTargetReaderContract(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  return chapter?.target_reader_contract
    || chapter?.targetReaderContract
    || rawPayload?.target_reader_contract
    || rawPayload?.targetReaderContract
    || blueprint?.target_reader_contract
    || blueprint?.targetReaderContract
    || preDraftBrief?.target_reader_contract
    || preDraftBrief?.targetReaderContract
    || chapterTarget?.target_reader_contract
    || chapterTarget?.targetReaderContract
    || rawPayload?.context_package?.target_reader_contract
    || rawPayload?.contextPackage?.targetReaderContract
    || {}
}

export function serialChapterExpectationThresholdContract(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  return chapter?.expectation_threshold_contract
    || chapter?.expectationThresholdContract
    || rawPayload?.expectation_threshold_contract
    || rawPayload?.expectationThresholdContract
    || blueprint?.expectation_threshold_contract
    || blueprint?.expectationThresholdContract
    || preDraftBrief?.expectation_threshold_contract
    || preDraftBrief?.expectationThresholdContract
    || chapterTarget?.expectation_threshold_contract
    || chapterTarget?.expectationThresholdContract
    || rawPayload?.context_package?.expectation_threshold_contract
    || rawPayload?.contextPackage?.expectationThresholdContract
    || {}
}

export function serialChapterSuspenseContract(chapter: any) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const blueprint = serialChapterBlueprintForLines(chapter)
  const preDraftBrief = rawPayload?.pre_draft_brief || rawPayload?.preDraftBrief || {}
  const chapterTarget = serialChapterRawContextTarget(chapter)
  return chapter?.suspense_contract
    || chapter?.suspenseContract
    || rawPayload?.suspense_contract
    || rawPayload?.suspenseContract
    || blueprint?.suspense_contract
    || blueprint?.suspenseContract
    || preDraftBrief?.suspense_contract
    || preDraftBrief?.suspenseContract
    || chapterTarget?.suspense_contract
    || chapterTarget?.suspenseContract
    || rawPayload?.context_package?.suspense_contract
    || rawPayload?.contextPackage?.suspenseContract
    || {}
}

export function serialForeshadowingLabel(text: string) {
  const value = compactBriefText(text)
  if (!value) return ''
  for (const [pattern, label] of SERIAL_FORESHADOWING_LABEL_HINTS) {
    pattern.lastIndex = 0
    if (pattern.test(value)) return label
  }
  const genericMatch = value.match(/([\u4e00-\u9fa5A-Za-z0-9]{1,12}(?:缺口|水痕|旧印|钥匙|名单|血印|门锁|门环|人影|伏笔|线索))/)
  return genericMatch?.[1] || ''
}

