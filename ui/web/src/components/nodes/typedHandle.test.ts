import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { resolveTypedHandleTop, COLLAPSED_HANDLE_TOP } from './TypedHandle'

function source(file: string) {
  return readFileSync(join(import.meta.dir, file), 'utf8')
}

describe('TypedHandle', () => {
  test('collapsed handles snap to the header center', () => {
    expect(resolveTypedHandleTop(true, 70)).toBe(COLLAPSED_HANDLE_TOP)
    expect(resolveTypedHandleTop(true, undefined)).toBe(COLLAPSED_HANDLE_TOP)
  })

  test('expanded handles keep explicit top or default to 50%', () => {
    expect(resolveTypedHandleTop(false, 70)).toBe(70)
    expect(resolveTypedHandleTop(undefined, 110)).toBe(110)
    expect(resolveTypedHandleTop(false, undefined)).toBe('50%')
  })

  test('handles render outside BaseNode children so collapse keeps them mounted', () => {
    const generate = source('GenerateNode.tsx')
    const display = source('DisplayNode.tsx')
    const loadAsset = source('LoadAssetNode.tsx')
    const comfy = source('ComfyUIEngineNode.tsx')

    for (const code of [generate, display, loadAsset, comfy]) {
      expect(code).toContain('TypedHandle')
    }
    // Handle 必须位于 <BaseNode> 之外（fragment 顶层），不再作为 children 首元素
    expect(generate).toContain('{renderDynamicHandles()}\n      <BaseNode')
    expect(display).toContain('<BaseNode {...props} data={{ ...data, label:')
    expect(comfy).toContain('{renderParameterHandles()}\n      <BaseNode')
  })

  test('collapse keeps a hover style hook for handles', () => {
    const css = readFileSync(join(import.meta.dir, '../../global.css'), 'utf8')
    expect(css).toContain('.typed-handle:hover')
  })
})
