import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { novelUiTokens, novelAntdTheme, NOVEL_THEME_ROOT_CLASS } from './novelUiTokens'
import { crystalBtnClass, inferCrystalBtnKind } from './crystalBtn'

describe('novelUiTokens', () => {
  test('exports approved color and control values', () => {
    expect(novelUiTokens.color.primary).toBe('#1677ff')
    expect(novelUiTokens.color.success).toBe('#16a34a')
    expect(novelUiTokens.color.warning).toBe('#d97706')
    expect(novelUiTokens.color.danger).toBe('#dc2626')
    expect(novelUiTokens.color.border).toBe('#e8eef5')
    expect(novelUiTokens.radius.md).toBe(8)
    expect(novelUiTokens.radius.pill).toBe(999)
    expect(novelUiTokens.control.heightSm).toBe(28)
    expect(novelUiTokens.control.heightMd).toBe(32)
    expect(novelUiTokens.font.weight.bold).toBe(700)
    expect(novelUiTokens.progress.heightSm).toBe(6)
    expect(NOVEL_THEME_ROOT_CLASS).toBe('novel-theme-root')
  })

  test('novelAntdTheme maps core tokens for Button Progress Tag Card', () => {
    expect(novelAntdTheme.token?.colorPrimary).toBe('#1677ff')
    expect(novelAntdTheme.token?.borderRadius).toBe(8)
    expect(novelAntdTheme.token?.controlHeight).toBe(32)
    expect(novelAntdTheme.token?.controlHeightSM).toBe(28)
    expect(novelAntdTheme.components?.Button).toBeTruthy()
    expect(novelAntdTheme.components?.Progress).toBeTruthy()
    expect(novelAntdTheme.components?.Tag).toBeTruthy()
    expect(novelAntdTheme.components?.Card).toBeTruthy()
  })

  test('css variables file defines novel-theme-root and key vars', () => {
    const css = readFileSync(join(import.meta.dir, 'novel-tokens.css'), 'utf8')
    expect(css).toContain('.novel-theme-root')
    expect(css).toContain('--novel-color-primary: #1677ff')
    expect(css).toContain('--novel-control-height-md: 32px')
    expect(css).toContain('--novel-radius-md: 8px')
    expect(css).toContain('--novel-progress-height-sm: 6px')
    expect(css).toContain('novel-btn-crystal-model')
    expect(css).toContain('novel-btn-crystal-local')
    expect(css).toContain('novel-btn-crystal-display')
  })

  test('crystal button helper maps labels to model/local/display', () => {
    expect(inferCrystalBtnKind('模型提炼设定')).toBe('model')
    expect(inferCrystalBtnKind('保存本章调用')).toBe('local')
    expect(inferCrystalBtnKind('刷新')).toBe('display')
    expect(crystalBtnClass('model')).toContain('novel-btn-crystal-model')
  })
})
