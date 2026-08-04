import { types } from 'node:util'
import type { LLMResponse } from '../../llm/types'
import { McpError } from '../../mcp/errors'
import { STRUCTURED_REVIEW_CHECK_FIELDS } from '../quality/structured-review-fields'
import type {
  ChapterStageResponseContract,
  ChapterTaskStage,
} from './types'

type ContractValidator = (content: string) => unknown

function invalid(stage: ChapterTaskStage, contract: ChapterStageResponseContract): never {
  throw new McpError(
    'MCP_STAGE_CONTRACT_INVALID',
    `MCP stage ${stage} 返回结果不符合 ${contract} 契约`,
    { stage, response_contract: contract },
  )
}

function plainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  try {
    return !types.isProxy(value) && Object.getPrototypeOf(value) === Object.prototype
  } catch {
    return false
  }
}

function ownDataValue(value: Record<string, unknown>, field: string) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, field)
    return descriptor && 'value' in descriptor ? descriptor.value : undefined
  } catch {
    return undefined
  }
}

function parseJsonObject(content: string) {
  const trimmed = content.trim()
  const candidate = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1]?.trim() || trimmed
  const parsed: unknown = JSON.parse(candidate)
  if (!plainObject(parsed)) throw new TypeError('JSON object required')
  return parsed
}

function proseValue(content: string): unknown {
  const trimmed = content.trim()
  if (!trimmed) throw new TypeError('non-empty prose required')
  try {
    const parsed = parseJsonObject(trimmed)
    const directSnake = ownDataValue(parsed, 'chapter_text')
    const directCamel = ownDataValue(parsed, 'chapterText')
    const direct = typeof directSnake === 'string'
      ? directSnake
      : typeof directCamel === 'string'
        ? directCamel
        : ''
    if (direct.trim()) return parsed
    const snakeChapters = ownDataValue(parsed, 'prose_chapters')
    const camelChapters = ownDataValue(parsed, 'proseChapters')
    const chapters = Array.isArray(snakeChapters)
      ? snakeChapters
      : Array.isArray(camelChapters)
        ? camelChapters
        : []
    if (chapters.some(item => {
      if (!plainObject(item)) return false
      const snakeText = ownDataValue(item, 'chapter_text')
      const camelText = ownDataValue(item, 'chapterText')
      return (typeof snakeText === 'string' && Boolean(snakeText.trim()))
        || (typeof camelText === 'string' && Boolean(camelText.trim()))
    })) return parsed
    throw new TypeError('prose wrapper required')
  } catch (error) {
    if (error instanceof SyntaxError) return trimmed
    throw error
  }
}

function finiteScore(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
}

function validateProse(content: string) {
  return proseValue(content)
}

function validateReadability(content: string) {
  const value = parseJsonObject(content)
  const readabilityScore = ownDataValue(value, 'readability_score')
  const score = ownDataValue(value, 'score')
  const passed = ownDataValue(value, 'passed')
  if (!finiteScore(readabilityScore ?? score) || typeof passed !== 'boolean') {
    throw new TypeError('readability verdict required')
  }
  for (const field of ['issues', 'suggestions']) {
    const report = ownDataValue(value, field)
    if (report !== undefined && !Array.isArray(report)) {
      throw new TypeError('readability report must be an array')
    }
  }
  return value
}

function validateQualityReview(content: string) {
  const value = parseJsonObject(content)
  if (!finiteScore(ownDataValue(value, 'score'))
    || typeof ownDataValue(value, 'publishable') !== 'boolean') {
    throw new TypeError('quality verdict required')
  }
  for (const field of ['findings', 'blocking_findings', 'advisory_findings']) {
    const findings = ownDataValue(value, field)
    if (findings !== undefined && !Array.isArray(findings)) {
      throw new TypeError('quality findings must be arrays')
    }
  }
  return value
}

const STRUCTURED_REVIEW_ARRAY_FIELDS = new Set([
  ...STRUCTURED_REVIEW_CHECK_FIELDS.flatMap(fields => fields),
  'continuity_checks',
  'continuityChecks',
  'delivery_risk_receipts',
  'deliveryRiskReceipts',
])

const STRUCTURED_REVIEW_AUXILIARY_ARRAY_FIELDS = new Set(['issues', 'findings'])

function nonEmptyString(value: unknown) {
  return typeof value === 'string' && Boolean(value.trim())
}

const STRUCTURED_REVIEW_FIELD_VERDICT_MARKERS: Readonly<Record<string, readonly string[]>> = {
  status_filter_receipts: ['used_in_chapter', 'usedInChapter'],
  statusFilterReceipts: ['used_in_chapter', 'usedInChapter'],
}

function structuredReviewEntry(field: string, value: unknown) {
  if (!plainObject(value)) return false
  const status = ownDataValue(value, 'status') ?? ownDataValue(value, 'state')
  const delivered = ownDataValue(value, 'delivered')
  const hasFieldVerdict = (STRUCTURED_REVIEW_FIELD_VERDICT_MARKERS[field] || [])
    .some(marker => typeof ownDataValue(value, marker) === 'boolean')
  const hasVerdict = nonEmptyString(status) || typeof delivered === 'boolean' || hasFieldVerdict
  const reportFields = [
    'key', 'label', 'evidence', 'fix', 'remaining_risk', 'remainingRisk',
    'risk_item', 'riskItem', 'required_action', 'requiredAction',
    'quality_focus', 'qualityFocus', 'acceptance_test', 'acceptanceTest',
  ]
  return hasVerdict && reportFields.some(field => nonEmptyString(ownDataValue(value, field)))
}

function auxiliaryReviewEntry(value: unknown) {
  if (nonEmptyString(value)) return true
  if (!plainObject(value)) return false
  return ['key', 'message', 'issue', 'finding', 'evidence', 'suggestion', 'required_change']
    .some(field => nonEmptyString(ownDataValue(value, field)))
}

function validateStructuredReview(content: string) {
  const value = parseJsonObject(content)
  const passed = ownDataValue(value, 'passed')
  const score = ownDataValue(value, 'score')
  const needsRevision = ownDataValue(value, 'needs_revision') ?? ownDataValue(value, 'needsRevision')
  if (passed !== undefined && typeof passed !== 'boolean') {
    throw new TypeError('structured review verdict must be a boolean')
  }
  if (score !== undefined && !finiteScore(score)) {
    throw new TypeError('structured review score must be finite')
  }
  if (needsRevision !== undefined && typeof needsRevision !== 'boolean') {
    throw new TypeError('structured review revision verdict must be a boolean')
  }
  let meaningfulEntries = 0
  for (const field of STRUCTURED_REVIEW_ARRAY_FIELDS) {
    const report = ownDataValue(value, field)
    if (report === undefined) continue
    if (!Array.isArray(report) || !report.every(entry => structuredReviewEntry(field, entry))) {
      throw new TypeError('recognized structured review entries required')
    }
    meaningfulEntries += report.length
  }
  for (const field of STRUCTURED_REVIEW_AUXILIARY_ARRAY_FIELDS) {
    const report = ownDataValue(value, field)
    if (report === undefined) continue
    if (!Array.isArray(report) || !report.every(auxiliaryReviewEntry)) {
      throw new TypeError('structured review issue entries required')
    }
    meaningfulEntries += report.length
  }
  if (meaningfulEntries === 0) throw new TypeError('structured review arrays required')
  return value
}

function validateEditorReport(content: string) {
  const value = parseJsonObject(content)
  const passed = ownDataValue(value, 'passed')
  const score = ownDataValue(value, 'score')
  const issues = ownDataValue(value, 'issues')
  const suggestions = ownDataValue(value, 'suggestions')
  if (passed !== undefined && typeof passed !== 'boolean') {
    throw new TypeError('editor verdict must be a boolean')
  }
  if (score !== undefined && !finiteScore(score)) {
    throw new TypeError('editor score must be finite')
  }
  if (issues !== undefined && !Array.isArray(issues)) {
    throw new TypeError('editor issues must be an array')
  }
  if (suggestions !== undefined && !Array.isArray(suggestions)) {
    throw new TypeError('editor suggestions must be an array')
  }
  const hasVerdict = typeof passed === 'boolean' || finiteScore(score)
  const hasReport = Array.isArray(issues) || Array.isArray(suggestions)
  if (!hasVerdict && !hasReport) throw new TypeError('editor report required')
  return value
}

function validateStoryState(content: string) {
  const value = parseJsonObject(content)
  const snakeDelta = ownDataValue(value, 'state_delta')
  const camelDelta = ownDataValue(value, 'stateDelta')
  if ((snakeDelta !== undefined && !plainObject(snakeDelta))
    || (camelDelta !== undefined && !plainObject(camelDelta))) {
    throw new TypeError('Story State delta object required')
  }
  const delta = plainObject(snakeDelta) ? snakeDelta : plainObject(camelDelta) ? camelDelta : value
  const plainCollection = (candidate: unknown) => Array.isArray(candidate)
    && candidate.every(item => nonEmptyString(item)
      || (plainObject(item) && Object.keys(item).length > 0))
  const timeline = (candidate: unknown) => Array.isArray(candidate)
    && candidate.every(item => nonEmptyString(item)
      || (plainObject(item) && Object.keys(item).length > 0))
  const progressSummary = (candidate: unknown) => nonEmptyString(candidate)
    || (plainObject(candidate) && Object.keys(candidate).length > 0)
  const fields: Array<{
    aliases: readonly string[]
    validate: (candidate: unknown) => boolean
  }> = [
    { aliases: ['current_time', 'currentTime'], validate: nonEmptyString },
    { aliases: ['character_positions', 'characterPositions'], validate: plainObject },
    { aliases: ['character_relationships', 'characterRelationships'], validate: plainObject },
    { aliases: ['relationship_graph', 'relationshipGraph'], validate: plainObject },
    { aliases: ['known_secrets', 'knownSecrets'], validate: plainObject },
    { aliases: ['secret_visibility', 'secretVisibility'], validate: plainObject },
    { aliases: ['item_ownership', 'itemOwnership'], validate: plainObject },
    { aliases: ['resource_status', 'resourceStatus'], validate: plainObject },
    { aliases: ['foreshadowing_status', 'foreshadowingStatus'], validate: plainObject },
    { aliases: ['payoff_queue', 'payoffQueue'], validate: plainCollection },
    { aliases: ['active_locations', 'activeLocations'], validate: plainCollection },
    { aliases: ['open_questions', 'openQuestions'], validate: plainCollection },
    { aliases: ['next_chapter_priorities', 'nextChapterPriorities'], validate: plainCollection },
    { aliases: ['timeline'], validate: timeline },
    { aliases: ['progress_summary', 'progressSummary'], validate: progressSummary },
  ]
  let recognizedFields = 0
  for (const field of fields) {
    for (const alias of field.aliases) {
      if (!Object.prototype.hasOwnProperty.call(delta, alias)) continue
      recognizedFields += 1
      if (!field.validate(ownDataValue(delta, alias))) {
        throw new TypeError(`Invalid Story State field: ${alias}`)
      }
    }
  }
  if (recognizedFields === 0) {
    throw new TypeError('Story State delta required')
  }
  return value
}

const validators = {
  draft_prose: validateProse,
  word_target_prose: validateProse,
  editor_rewrite_prose: validateProse,
  meme_polish_prose: validateProse,
  readability_json: validateReadability,
  humanize_prose: validateProse,
  quality_review_json: validateQualityReview,
  structured_review_json: validateStructuredReview,
  revision_prose: validateProse,
  editor_report_json: validateEditorReport,
  story_state_json: validateStoryState,
} satisfies Record<ChapterStageResponseContract, ContractValidator>

export function validateMcpStageResponse(
  stage: ChapterTaskStage,
  contract: ChapterStageResponseContract,
  response: LLMResponse,
): LLMResponse {
  try {
    if (!plainObject(response)) return invalid(stage, contract)
    const content = ownDataValue(response, 'content')
    if (typeof content !== 'string') return invalid(stage, contract)
    const validator = Object.prototype.hasOwnProperty.call(validators, contract)
      ? validators[contract]
      : undefined
    if (typeof validator !== 'function') return invalid(stage, contract)
    return { content, output: validator(content) }
  } catch (error) {
    if (error instanceof McpError && error.code === 'MCP_STAGE_CONTRACT_INVALID') throw error
    return invalid(stage, contract)
  }
}
