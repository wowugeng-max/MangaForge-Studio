import { join } from 'path'

type ArgMap = Map<string, string>

function parseArgMap(argv: string[]): ArgMap {
  const map = new Map<string, string>()
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [rawKey, ...rest] = arg.slice(2).split('=')
    if (!rawKey) continue
    map.set(rawKey, rest.join('='))
  }
  return map
}

const args = parseArgMap(process.argv.slice(2))

export function getArgString(name: string, defaultValue?: string): string | undefined {
  const value = args.get(name)
  if (value === undefined || value === '') return defaultValue
  return value
}

export function getArgNumber(name: string, defaultValue?: number): number | undefined {
  const raw = getArgString(name)
  if (raw === undefined) return defaultValue
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : defaultValue
}

export function getWorkspace(): string {
  const workspace = getArgString('workspace')
  if (workspace) return workspace
  return join(process.cwd(), '.smoke-workspace')
}
