import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('assets API type compatibility', () => {
  test('reuses the shared migrated Asset type instead of a narrow local record', () => {
    const source = readFileSync(join(import.meta.dir, 'assets.ts'), 'utf8')

    expect(source).toContain("import type { Asset } from '../types/asset'")
    expect(source).toContain('export type AssetRecord = Asset')
    expect(source).toContain("Omit<AssetRecord, 'id' | 'updated_at' | 'created_at'>")
    expect(source).toContain('export type AssetListParams =')
    expect(source).toContain('project_id?: number')
    expect(source).toContain('is_global?: boolean')
    expect(source).toContain("getAll: (params?: AssetListParams) => apiClient.get('/assets/', { params })")
    expect(source).toContain("create: (payload: Omit<AssetRecord, 'id' | 'updated_at' | 'created_at'>) => apiClient.post('/assets/', payload)")
  })
})
