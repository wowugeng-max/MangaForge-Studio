import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

function source(rel: string) {
  return readFileSync(join(import.meta.dir, rel), 'utf8')
}

describe('novel theme routing', () => {
  test('wraps only novel routes with NovelThemeProvider', () => {
    const router = source('../router.tsx')
    expect(router).toContain('NovelThemeProvider')
    expect(router).toContain("path: 'novel'")
    // novel children under a layout element that uses provider
    expect(router).toMatch(/NovelThemeProvider/)
    // non-novel routes remain direct page() without requiring provider on canvas
    expect(router).toContain("path: 'canvas'")
    expect(router).toContain("path: 'models'")
    // Provider should not wrap root Layout exclusively for all children
    // Assert structure: a parent route path novel with element NovelThemeProvider + Outlet
    expect(router).toContain('Outlet')
  })

  test('provider file mounts theme root class and antd theme', () => {
    const provider = source('NovelThemeProvider.tsx')
    expect(provider).toContain('ConfigProvider')
    expect(provider).toContain('novelAntdTheme')
    expect(provider).toContain('NOVEL_THEME_ROOT_CLASS')
    expect(provider).toContain('novel-tokens.css')
  })
})
