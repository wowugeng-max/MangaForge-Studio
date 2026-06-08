import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('project API ComfyForge compatibility', () => {
  test('keeps upstream skip and limit parameters on project listing', () => {
    const source = readFileSync(join(import.meta.dir, 'projects.ts'), 'utf8')

    expect(source).toContain('getAll: (skip = 0, limit = 100)')
    expect(source).toContain("apiClient.get('/projects/', { params: { skip, limit } })")
    expect(source).toContain("create: (data: ProjectCreate) => apiClient.post('/projects/', data)")
  })
})
