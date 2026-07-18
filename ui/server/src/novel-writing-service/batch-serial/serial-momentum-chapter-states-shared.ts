import { asArray, compactText, parseJsonLikePayload } from '../../routes/novel-route-utils'
import { countProseChars } from '../../novel-writing/word-target'
import { firstCompactText } from '../../novel-writing/story-drive-basics'
import { normalizeBeatCoolingType, inferBeatCoolingTypeFromText } from '../../novel-writing/beat-cooling-basics'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import { reviewBelongsToChapter, reviewPayloadForType, reviewTimestamp } from '../quality/review-lookup'
import { proseQualitySerialRiskRepairRisks } from '../quality/serial-risk-repair'
import { inferEndingHookType } from './ending-hook-type'
import {
  paragraphHasDownwardPressure,
  paragraphHasOppressionPressure,
  textHasDownwardSafetySignal,
} from '../../novel-writing/emotional-payoff-scans'
import { anchorMatchScore, normalizedMatchText } from '../../novel-writing/text-matching'
import { normalizeRecentFatigueBrief } from '../../novel-writing/rolling-rhythm-preflight'

import {
  SERIAL_PROGRESS_SIGNAL_PATTERN,
  SERIAL_PAYOFF_SIGNAL_PATTERN,
  SERIAL_AFTERMATH_SIGNAL_PATTERN,
  SERIAL_LINE_INACTIVE_PATTERN,
  SERIAL_LINE_CONCRETE_PROGRESS_PATTERN,
  SERIAL_ENDING_HARVEST_PATTERN,
  SERIAL_ENDING_HANDOFF_PATTERN,
  SERIAL_ENDING_SAFE_CLOSURE_PATTERN,
  SERIAL_ENDING_SUSPENSE_HOOK_PATTERN,
  SERIAL_EXPECTATION_CHAIN_RESOLUTION_PATTERN,
  SERIAL_EXPECTATION_CHAIN_BREAK_PATTERN,
  SERIAL_EXPECTATION_CHAIN_OPEN_LOOP_PATTERN,
  SERIAL_EXPECTATION_SETUP_PATTERN,
  SERIAL_PAYOFF_RELEASE_PATTERN,
  SERIAL_MAINLINE_CLOSURE_PATTERN,
  SERIAL_DECEPTIVE_MAINLINE_HANDOFF_PATTERN,
  SERIAL_UPGRADE_STAGE_CONTEXT_PATTERN,
  SERIAL_UPGRADE_REWARD_POINT_PATTERN,
  SERIAL_ROMANCE_CONTEXT_PATTERN,
  SERIAL_ROMANCE_TENSION_LAYER_PATTERN,
  SERIAL_ROMANCE_CAREER_BINDING_PATTERN,
  SERIAL_TRUMP_CARD_RELEASE_PATTERN,
  SERIAL_TRUMP_CARD_RESERVE_PATTERN,
  SERIAL_TRUMP_CARD_DEPLETION_PATTERN,
  SERIAL_SHOWDOWN_CONTEXT_PATTERN,
  SERIAL_SHOWDOWN_FRIENDLY_PRESSURE_PATTERN,
  SERIAL_SHOWDOWN_ENEMY_PRESSURE_PATTERN,
  SERIAL_SHOWDOWN_NEUTRAL_PRESSURE_PATTERN,
  SERIAL_SHOWDOWN_BURST_PATTERN,
  SERIAL_SHOWDOWN_FRIENDLY_SHOCK_PATTERN,
  SERIAL_SHOWDOWN_ENEMY_SHOCK_PATTERN,
  SERIAL_SHOWDOWN_NEUTRAL_SHOCK_PATTERN,
  SERIAL_CHARACTER_ACTION_PATTERN,
  SERIAL_PLOT_CONVENIENCE_PATTERN,
  SERIAL_CHARACTER_MOTIVATION_PATTERN,
  SERIAL_SUPPORTING_CHARACTER_ACTIVITY_PATTERN,
  SERIAL_SUPPORTING_CHARACTER_AGENCY_PATTERN,
  SERIAL_TEXTURE_NEGATION_PATTERN,
  SERIAL_MOMENTUM_GOAL_ADVANCE_PATTERN,
  SERIAL_MOMENTUM_OBSTACLE_ESCALATION_PATTERN,
  SERIAL_MOMENTUM_NEW_INFO_PATTERN,
} from './serial-momentum-patterns'

export function serialPositivePatternTest(text: string, pattern: RegExp) {
  const chunks = compactBriefText(text)
    .split(/[。！？!?；;\n]/)
    .map(item => item.trim())
    .filter(Boolean)
  return chunks.some(chunk => {
    pattern.lastIndex = 0
    SERIAL_TEXTURE_NEGATION_PATTERN.lastIndex = 0
    return pattern.test(chunk) && !SERIAL_TEXTURE_NEGATION_PATTERN.test(chunk)
  })
}


