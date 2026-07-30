import { resolve } from 'node:path'

export function canonicalFilesystemIdentity(value: string) {
  return resolve(value)
}
