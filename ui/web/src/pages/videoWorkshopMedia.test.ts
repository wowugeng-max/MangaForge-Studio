import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

function source(file: string) {
  return readFileSync(join(import.meta.dir, file), 'utf8')
}

describe('VideoWorkshop media URL compatibility', () => {
  test('uses the shared asset media URL builder for generated video previews', () => {
    const page = source('VideoWorkshop/index.tsx')

    expect(page).toContain("import { buildAssetMediaUrl } from '../../utils/assetMedia'")
    expect(page).toContain('return buildAssetMediaUrl(value)')
    expect(page).not.toContain("new URL(value.startsWith('/') ? value : `/api/assets/media/${encodeURIComponent(value)}`")
  })
})
