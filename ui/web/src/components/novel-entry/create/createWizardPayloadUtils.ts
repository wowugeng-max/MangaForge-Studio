import {
  buildLaunchpadSeedPatch,
  evaluateLaunchpadReadiness,
  extractLaunchpadFieldsFromSeed,
  type LaunchpadFields,
} from '../launchpadModel'
import { buildDeepDraftFoundationScore } from '../deepDraftFoundationScore'
import type { DeepDraftReviewModel } from '../deepDraftReviewModel'
import {
  asStringArray,
  normalizeLengthTarget,
  normalizeProjectSeedForUi,
  pickGenre,
} from './createWizardSeedUtils'

export function buildCreatePayload(args: {
  projectSeed?: any
  payloadData: any
  payloadLaunchpad: LaunchpadFields
  deepDraftReview: DeepDraftReviewModel
  seedIdea: string
  foundationAccepted: boolean
}) {
  const {
    projectSeed,
    payloadData,
    payloadLaunchpad,
    deepDraftReview,
    seedIdea,
    foundationAccepted,
  } = args
  const readiness = evaluateLaunchpadReadiness(payloadLaunchpad, projectSeed, payloadData.length_target)
  const seedWithLaunchpad = buildLaunchpadSeedPatch(projectSeed || {}, payloadLaunchpad, readiness.risks)
  const foundation = buildDeepDraftFoundationScore({
    seed: seedWithLaunchpad,
    launchpad: payloadLaunchpad,
    review: deepDraftReview,
    lengthTarget: payloadData.length_target,
  })
  return {
    title: payloadData.title,
    genre: payloadData.genre || '',
    sub_genres: payloadData.sub_genres || [],
    length_target: payloadData.length_target || 'medium',
    target_audience: payloadData.target_audience || '',
    style_tags: payloadData.style_tags || [],
    commercial_tags: payloadData.commercial_tags || [],
    synopsis: payloadData.synopsis || payloadLaunchpad.reader_promise || '',
    status: 'draft',
    reference_config: {
      project_seed: {
        ...seedWithLaunchpad,
        raw_idea: seedIdea,
        derived_at: new Date().toISOString(),
      },
      oh_story_controls: {
        female_audience_mode: payloadData.female_audience_mode || 'auto',
      },
      foundation_score: foundation,
      foundation_accepted: foundationAccepted || foundation.recommendCreate,
      writing_bible: projectSeed?.writing_bible || {},
      commercial_positioning: {
        reader_promise: payloadLaunchpad.reader_promise || projectSeed?.logline || projectSeed?.synopsis || '',
        selling_points: asStringArray(projectSeed?.commercial_positioning?.selling_points).length
          ? asStringArray(projectSeed?.commercial_positioning?.selling_points)
          : asStringArray(projectSeed?.commercial_tags),
        seed: Boolean(projectSeed),
      },
    },
    auto_materialize_seed: Boolean(projectSeed),
  }
}

export function buildFinalizedSeedCreatePayload(args: {
  projectSeed: any
  data: any
  launchpad: LaunchpadFields
  deepDraftReview: DeepDraftReviewModel
  seedIdea: string
  foundationAccepted: boolean
}) {
  const {
    projectSeed,
    data,
    launchpad,
    deepDraftReview,
    seedIdea,
    foundationAccepted,
  } = args
  const normalizedSeed = normalizeProjectSeedForUi(projectSeed)
  const extractedLaunchpad = extractLaunchpadFieldsFromSeed(normalizedSeed)
  const payloadData = {
    title: String(normalizedSeed.title || data.title || normalizedSeed.logline || '').trim().slice(0, 32),
    genre: pickGenre(normalizedSeed.genre || data.genre),
    sub_genres: asStringArray(normalizedSeed.sub_genres).length ? asStringArray(normalizedSeed.sub_genres) : data.sub_genres,
    length_target: normalizeLengthTarget(normalizedSeed.length_target || data.length_target),
    target_audience: String(normalizedSeed.target_audience || data.target_audience || '').trim(),
    female_audience_mode: data.female_audience_mode || 'auto',
    style_tags: asStringArray(normalizedSeed.style_tags).length ? asStringArray(normalizedSeed.style_tags).slice(0, 5) : data.style_tags,
    commercial_tags: asStringArray(normalizedSeed.commercial_tags).length ? asStringArray(normalizedSeed.commercial_tags).slice(0, 3) : data.commercial_tags,
    synopsis: String(normalizedSeed.synopsis || normalizedSeed.logline || data.synopsis || '').trim().slice(0, 500),
  }
  const payloadLaunchpad = {
    reader_promise: extractedLaunchpad.reader_promise || launchpad.reader_promise,
    core_selling_point: extractedLaunchpad.core_selling_point || launchpad.core_selling_point,
    protagonist_situation: extractedLaunchpad.protagonist_situation || launchpad.protagonist_situation,
    protagonist_pressure: extractedLaunchpad.protagonist_pressure || launchpad.protagonist_pressure,
    opening_hook: extractedLaunchpad.opening_hook || launchpad.opening_hook,
    mainline_goal: extractedLaunchpad.mainline_goal || launchpad.mainline_goal,
    long_term_conflict: extractedLaunchpad.long_term_conflict || launchpad.long_term_conflict,
    growth_engine: extractedLaunchpad.growth_engine || launchpad.growth_engine,
    volume_direction: extractedLaunchpad.volume_direction || launchpad.volume_direction,
    expandable_assets: extractedLaunchpad.expandable_assets || launchpad.expandable_assets,
    future100_note: extractedLaunchpad.future100_note || launchpad.future100_note,
    first_writing_task: extractedLaunchpad.first_writing_task || launchpad.first_writing_task,
    first30_plan: {
      chapters_1_3: extractedLaunchpad.first30_plan.chapters_1_3 || launchpad.first30_plan.chapters_1_3,
      chapters_4_10: extractedLaunchpad.first30_plan.chapters_4_10 || launchpad.first30_plan.chapters_4_10,
      chapters_11_30: extractedLaunchpad.first30_plan.chapters_11_30 || launchpad.first30_plan.chapters_11_30,
    },
  }
  return buildCreatePayload({
    projectSeed: normalizedSeed,
    payloadData,
    payloadLaunchpad,
    deepDraftReview,
    seedIdea,
    foundationAccepted,
  })
}
