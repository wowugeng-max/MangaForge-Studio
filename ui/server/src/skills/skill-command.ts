import type { SkillArgumentSpec, SkillManifest } from './types'

export type ParsedSkillCommand = { packId?: string; name: string; argumentsText: string }

export type SkillArgumentErrorCode = 'SKILL_ARGUMENT_UNKNOWN' | 'SKILL_ARGUMENT_REQUIRED' | 'SKILL_ARGUMENT_INVALID'

export class SkillArgumentError extends Error {
  readonly code: SkillArgumentErrorCode
  constructor(code: SkillArgumentErrorCode, message: string) {
    super(message)
    this.name = 'SkillArgumentError'
    this.code = code
  }
}

const token = '[A-Za-z0-9][A-Za-z0-9._-]*'
const commandPattern = new RegExp(`^\\/(${token})(?::(${token}))?(?:[ \\t]+([\\s\\S]*))?$`)

/** Parse an explicit leading invocation. Ordinary prose is deliberately untouched. */
export function parseSkillCommand(input: string): ParsedSkillCommand | null {
  if (typeof input !== 'string') return null
  const match = input.match(commandPattern)
  if (!match) return null
  return match[2]
    ? { packId: match[1], name: match[2], argumentsText: match[3] ?? '' }
    : { name: match[1], argumentsText: match[3] ?? '' }
}

function splitArguments(text: string): string[] {
  const parts: string[] = []
  const pattern = /(?:[^\s"']+|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')+/g
  for (const match of text.matchAll(pattern)) parts.push(match[0])
  return parts
}

function unquote(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1)
  return value
}

/** Resolve key=value/--key value arguments, applying manifest defaults. */
export function resolveSkillArguments(manifest: Pick<SkillManifest, 'arguments'>, argumentsText = '', supplied: Record<string, string> = {}): Record<string, string> {
  const specs = Array.isArray(manifest.arguments) ? manifest.arguments : []
  const byName = new Map(specs.map((item) => [item.name, item]))
  const result: Record<string, string> = {}
  for (const spec of specs) if (spec.default !== undefined) result[spec.name] = String(spec.default)
  for (const [name, value] of Object.entries(supplied)) {
    if (!byName.has(name)) throw new SkillArgumentError('SKILL_ARGUMENT_UNKNOWN', `Unknown Skill argument: ${name}`)
    result[name] = String(value)
  }
  const parts = splitArguments(argumentsText.trim())
  let index = 0
  while (index < parts.length) {
    const part = parts[index]
    let name = ''
    let value: string | undefined
    if (part.startsWith('--')) {
      const eq = part.indexOf('=')
      if (eq > 2) { name = part.slice(2, eq); value = unquote(part.slice(eq + 1)) }
      else { name = part.slice(2); value = index + 1 < parts.length ? unquote(parts[index + 1]) : undefined; if (value !== undefined) index += 1 }
    } else {
      const eq = part.indexOf('=')
      if (eq > 0) { name = part.slice(0, eq); value = unquote(part.slice(eq + 1)) }
      else {
        // A free remainder is the prompt when no declared arguments exist; otherwise
        // assign positional values in declaration order.
        if (!specs.length) break
        const positional = specs.filter((spec) => result[spec.name] === undefined)[0]
        if (!positional) throw new SkillArgumentError('SKILL_ARGUMENT_UNKNOWN', `Unexpected Skill argument: ${part}`)
        name = positional.name; value = unquote(part)
      }
    }
    if (!name || !byName.has(name)) throw new SkillArgumentError('SKILL_ARGUMENT_UNKNOWN', `Unknown Skill argument: ${name || part}`)
    if (value === undefined || value === '') throw new SkillArgumentError('SKILL_ARGUMENT_INVALID', `Missing value for Skill argument: ${name}`)
    result[name] = value
    index += 1
  }
  for (const spec of specs) if (spec.required && (result[spec.name] === undefined || result[spec.name] === '')) throw new SkillArgumentError('SKILL_ARGUMENT_REQUIRED', `Missing required Skill argument: ${spec.name}`)
  return result
}
