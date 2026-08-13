import { describe, expect, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { normalizeUploadFilename, uploadAssetBufferDeduped } from './asset-upload'

describe('asset upload filename normalization', () => {
  test('keeps same-millisecond uploads from overwriting identical filenames', () => {
    const originalNow = Date.now
    Date.now = () => 1700000000000
    try {
      const first = normalizeUploadFilename('shot.png')
      const second = normalizeUploadFilename('shot.png')

      expect(first).not.toBe(second)
      expect(first).toEndWith('-shot.png')
      expect(second).toEndWith('-shot.png')
    } finally {
      Date.now = originalNow
    }
  })
})

describe('content-addressed asset uploads', () => {
  test('reuses one file for identical bytes and derives only a safe extension from the name', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-upload-dedupe-'))

    const first = await uploadAssetBufferDeduped(workspace, 'reference-1.png', Buffer.from('same-bytes'))
    const repeated = await uploadAssetBufferDeduped(workspace, 'reference-9.png', Buffer.from('same-bytes'))
    const different = await uploadAssetBufferDeduped(workspace, 'reference-1.png', Buffer.from('different-bytes'))
    const hostile = await uploadAssetBufferDeduped(workspace, '../../evil.sh.png', Buffer.from('same-bytes'))
    const extensionless = await uploadAssetBufferDeduped(workspace, 'no-extension', Buffer.from('same-bytes'))

    expect(repeated).toBe(first)
    expect(hostile).toBe(first)
    expect(different).not.toBe(first)
    expect(basename(first)).toMatch(/^ref-[0-9a-f]{32}\.png$/)
    expect(basename(different)).toMatch(/^ref-[0-9a-f]{32}\.png$/)
    expect(basename(extensionless)).toMatch(/^ref-[0-9a-f]{32}$/)
  })
})
