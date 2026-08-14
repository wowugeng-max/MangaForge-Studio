import { createHash } from 'node:crypto'

export function ohStoryChapterTextHash(text: string): string {
  return createHash('sha256').update(String(text ?? ''), 'utf8').digest('hex')
}
