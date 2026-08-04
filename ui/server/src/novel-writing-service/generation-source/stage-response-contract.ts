import { types } from 'node:util'
import type { LLMResponse } from '../../llm/types'
import { McpError } from '../../mcp/errors'
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

function validateStructuredReview(content: string) {
  const value = parseJsonObject(content)
  const entries = Object.entries(value)
  if (!entries.length || !entries.some(([, field]) => Array.isArray(field))) {
    throw new TypeError('structured review arrays required')
  }
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
  const delta = plainObject(snakeDelta)
    ? snakeDelta
    : plainObject(camelDelta)
      ? camelDelta
      : value
  const fields = [
    'current_time', 'currentTime', 'character_positions', 'characterPositions',
    'open_questions', 'openQuestions', 'next_chapter_priorities',
    'nextChapterPriorities', 'timeline', 'progress_summary', 'progressSummary',
  ]
  if (!fields.some(field => Object.prototype.hasOwnProperty.call(delta, field))) {
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
