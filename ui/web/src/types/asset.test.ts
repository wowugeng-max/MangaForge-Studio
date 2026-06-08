import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('shared asset type migration coverage', () => {
  test('covers upstream and migrated asset variants plus lineage fields', () => {
    const source = readFileSync(join(import.meta.dir, 'asset.ts'), 'utf8')

    expect(source).toContain("'node_config'")
    expect(source).toContain("'node_template'")
    expect(source).toContain("'character'")
    expect(source).toContain('version?: number')
    expect(source).toContain('parent_id?: number | null')
    expect(source).toContain('source_asset_ids?: number[] | null')
    expect(source).toContain('project_id?: number | null')
  })
})
