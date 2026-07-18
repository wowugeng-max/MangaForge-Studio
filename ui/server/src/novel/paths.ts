import { join } from 'path'

export function getNovelStorePath(activeWorkspace: string) { return join(activeWorkspace, 'novel-store.json') }

export function getNovelDbPath(activeWorkspace: string) { return join(activeWorkspace, 'novel.sqlite') }

export function dbPathFromEnv() { const raw = process.env.SQLITE_DATABASE_URL || process.env.DATABASE_URL || ''; if (!raw) return ''; if (raw.startsWith('file:')) return raw.slice(5).split('?', 1)[0]; return raw }

export function boundedTimeout(value: any, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(minimum, Math.min(maximum, Math.floor(parsed))) : fallback
}

export function sqliteBusyTimeoutMs() { return boundedTimeout(process.env.NOVEL_SQLITE_BUSY_TIMEOUT_MS, 5000, 25, 30000) }

export function mutationLockTimeoutMs() { return boundedTimeout(process.env.NOVEL_MUTATION_LOCK_TIMEOUT_MS, 15000, 25, 60000) }
