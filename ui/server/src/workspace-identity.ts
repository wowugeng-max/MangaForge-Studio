import { realpathSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'

export function canonicalFilesystemIdentity(value: string) {
  const absolute = resolve(value)
  const suffix: string[] = []
  let candidate = absolute
  while (true) {
    try {
      const physical = realpathSync.native(candidate)
      return suffix.length ? join(physical, ...suffix.reverse()) : physical
    } catch {}
    const parent = dirname(candidate)
    if (parent === candidate) return absolute
    suffix.push(basename(candidate))
    candidate = parent
  }
}
