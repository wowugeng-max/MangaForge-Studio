import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { buildStudioMangaApiBase } from './studioHomeApi'

describe('StudioHome API compatibility helpers', () => {
  test('builds the legacy manga API base from the configured backend API base', () => {
    expect(buildStudioMangaApiBase('http://127.0.0.1:18787/api')).toBe('http://127.0.0.1:18787/api/manga')
    expect(buildStudioMangaApiBase('http://127.0.0.1:18787/api/')).toBe('http://127.0.0.1:18787/api/manga')
  })

  test('StudioHome does not pin legacy requests to localhost:8787', () => {
    const source = readFileSync(join(import.meta.dir, 'StudioHome.tsx'), 'utf8')
    expect(source).toContain('buildStudioMangaApiBase')
    expect(source).not.toContain("const api = 'http://localhost:8787/api/manga'")
  })
})
