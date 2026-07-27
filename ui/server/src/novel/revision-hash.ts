import { createHash } from 'crypto'

export function revisionTextHash(text: string) {
  return createHash('sha256').update(String(text || '')).digest('hex')
}
