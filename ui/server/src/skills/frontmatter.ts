import { basename, dirname, sep } from 'node:path'

import { parse as parseYaml } from 'yaml'

import type {
  CanvasMediaMode,
  ParsedSkillDocument,
  SkillArgumentSpec,
  SkillCompatibility,
  SkillManifest,
} from './types'

export type SkillParseErrorCode =
  | 'SKILL_FRONTMATTER_INVALID'
  | 'SKILL_FRONTMATTER_MISSING'
  | 'SKILL_FILE_TOO_LARGE'

export class SkillParseError extends Error {
  readonly code: SkillParseErrorCode
  readonly filePath?: string

  constructor(code: SkillParseErrorCode, message: string, filePath?: string) {
    super(message)
    this.name = 'SkillParseError'
    this.code = code
    this.filePath = filePath
  }
}

type Frontmatter = Record<string, unknown>

const MEDIA_MODES = new Set<CanvasMediaMode>([
  'chat',
  'vision',
  'text_to_image',
  'image_to_image',
  'text_to_video',
  'image_to_video',
])

const COMPATIBILITIES = new Set<SkillCompatibility>([
  'prompt_ready',
  'prompt_partial',
  'workflow_only',
  'invalid',
])

function valueFor(frontmatter: Frontmatter, ...names: string[]): unknown {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(frontmatter, name)) return frontmatter[name]
  }
  return undefined
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function stringList(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false
  }
  return fallback
}

function argumentsList(value: unknown): SkillArgumentSpec[] {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : []
  const result: SkillArgumentSpec[] = []
  for (const item of values) {
    if (typeof item === 'string' && item.trim()) {
      result.push({ name: item.trim() })
      continue
    }
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const argument = item as Record<string, unknown>
    const name = optionalString(argument.name)
    if (!name) continue
    const parsed: SkillArgumentSpec = { name }
    const description = optionalString(argument.description)
    const defaultValue = optionalString(argument.default)
    if (description) parsed.description = description
    if (typeof argument.required === 'boolean') parsed.required = argument.required
    if (defaultValue) parsed.default = defaultValue
    result.push(parsed)
  }
  return result
}

function inferPackId(filePath: string, frontmatter: Frontmatter): string {
  const explicit = optionalString(valueFor(frontmatter, 'packId', 'pack_id', 'pack-id'))
  if (explicit) return explicit
  const segments = filePath.split(/[\\/]+/)
  const skillsIndex = segments.lastIndexOf('skills')
  if (skillsIndex > 0) return segments[skillsIndex - 1] || 'local'
  return basename(dirname(filePath)) || 'local'
}

function extractExplicitReferences(body: string): string[] {
  const references = new Set<string>()
  const add = (candidate: string) => {
    const clean = candidate.trim().replace(/^<|>$/g, '').split(/[?#]/, 1)[0]
    if (/^references\/[A-Za-z0-9._@+\-/]+$/.test(clean) && !clean.split('/').includes('..')) {
      references.add(clean)
    }
  }

  for (const match of body.matchAll(/\]\(\s*(<?references\/[^\s)>]+>?)(?:\s+["'][^"']*["'])?\s*\)/g)) {
    if (match[1]) add(match[1])
  }
  for (const match of body.matchAll(/`(references\/[^`\r\n]+)`/g)) {
    if (match[1]) add(match[1])
  }
  return [...references].sort()
}

function splitFrontmatter(raw: string, filePath: string): { frontmatter: Frontmatter; body: string } {
  const normalized = raw.startsWith('\uFEFF') ? raw.slice(1) : raw
  const match = normalized.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/)
  if (!match) {
    throw new SkillParseError(
      'SKILL_FRONTMATTER_MISSING',
      `SKILL.md is missing a complete YAML frontmatter block: ${filePath}`,
      filePath,
    )
  }

  let parsed: unknown
  try {
    parsed = parseYaml(match[1] ?? '')
  } catch (error) {
    throw new SkillParseError(
      'SKILL_FRONTMATTER_INVALID',
      `Invalid YAML frontmatter in ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      filePath,
    )
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new SkillParseError(
      'SKILL_FRONTMATTER_INVALID',
      `YAML frontmatter in ${filePath} must be a mapping`,
      filePath,
    )
  }
  return { frontmatter: parsed as Frontmatter, body: normalized.slice(match[0].length) }
}

export function parseSkillDocument(raw: string, filePath: string): ParsedSkillDocument {
  if (Buffer.byteLength(raw, 'utf8') > 256 * 1024) {
    throw new SkillParseError(
      'SKILL_FILE_TOO_LARGE',
      `SKILL.md exceeds 262144 bytes: ${filePath}`,
      filePath,
    )
  }
  const { frontmatter, body } = splitFrontmatter(raw, filePath)
  const metadata =
    frontmatter.metadata && typeof frontmatter.metadata === 'object' && !Array.isArray(frontmatter.metadata)
      ? frontmatter.metadata as Frontmatter
      : undefined
  const valueForWithMetadata = (...names: string[]): unknown =>
    valueFor(frontmatter, ...names) ?? (metadata ? valueFor(metadata, ...names) : undefined)
  const name = optionalString(frontmatter.name)
  if (!name) {
    throw new SkillParseError(
      'SKILL_FRONTMATTER_INVALID',
      `YAML frontmatter in ${filePath} requires a non-empty name`,
      filePath,
    )
  }

  const mediaModes = stringList(valueForWithMetadata('mediaModes', 'media_modes', 'media-modes')).filter(
    (mode): mode is CanvasMediaMode => MEDIA_MODES.has(mode as CanvasMediaMode),
  )
  const requestedCompatibility = optionalString(frontmatter.compatibility) as SkillCompatibility | undefined
  const compatibility = requestedCompatibility && COMPATIBILITIES.has(requestedCompatibility)
    ? requestedCompatibility
    : 'prompt_ready'
  const rootDir = dirname(filePath)

  const manifest: SkillManifest = {
    packId: inferPackId(filePath, frontmatter),
    directoryName: basename(rootDir),
    name,
    description: optionalString(frontmatter.description) ?? '',
    whenToUse: optionalString(valueFor(frontmatter, 'whenToUse', 'when_to_use', 'when-to-use')),
    arguments: argumentsList(frontmatter.arguments),
    argumentHint: optionalString(valueFor(frontmatter, 'argumentHint', 'argument_hint', 'argument-hint')),
    userInvocable: booleanValue(
      valueFor(frontmatter, 'userInvocable', 'user_invocable', 'user-invocable'),
      true,
    ),
    triggerWords: stringList(valueForWithMetadata('triggerWords', 'trigger_words', 'trigger-words')),
    mediaModes,
    compatibility,
    compatibilityReason: optionalString(
      valueFor(frontmatter, 'compatibilityReason', 'compatibility_reason', 'compatibility-reason'),
    ),
    revision: optionalString(valueFor(frontmatter, 'revision', 'version')) ?? 'unknown',
    sourceUrl: optionalString(valueFor(frontmatter, 'sourceUrl', 'source_url', 'source-url')),
    rootDir: rootDir.split(sep).join('/'),
    body,
    references: extractExplicitReferences(body),
    displayName: optionalString(valueFor(frontmatter, 'displayName', 'display_name', 'display-name')),
    shortDescription: optionalString(
      valueFor(frontmatter, 'shortDescription', 'short_description', 'short-description'),
    ),
    defaultPrompt: optionalString(valueFor(frontmatter, 'defaultPrompt', 'default_prompt', 'default-prompt')),
  }
  return { manifest, references: manifest.references }
}

export type OpenAIMetadata = {
  displayName?: string
  shortDescription?: string
  defaultPrompt?: string
}

export function readOpenAIMetadata(raw: string): OpenAIMetadata {
  let parsed: unknown
  try {
    parsed = parseYaml(raw)
  } catch (error) {
    throw new SkillParseError(
      'SKILL_FRONTMATTER_INVALID',
      `Invalid OpenAI skill metadata: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  const document = parsed as Record<string, unknown>
  const source = document.interface && typeof document.interface === 'object' && !Array.isArray(document.interface)
    ? document.interface as Record<string, unknown>
    : document
  const result: OpenAIMetadata = {}
  const displayName = optionalString(source.display_name)
  const shortDescription = optionalString(source.short_description)
  const defaultPrompt = optionalString(source.default_prompt)
  if (displayName) result.displayName = displayName
  if (shortDescription) result.shortDescription = shortDescription
  if (defaultPrompt) result.defaultPrompt = defaultPrompt
  return result
}
