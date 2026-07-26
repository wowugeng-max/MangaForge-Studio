import { describe, expect, test } from 'bun:test'
import { resolveAutoConnectHandle } from './autoConnect'

describe('resolveAutoConnectHandle', () => {
  test('display accepts anything on in', () => {
    expect(resolveAutoConnectHandle('text', 'display')).toBe('in')
    expect(resolveAutoConnectHandle('image', 'display')).toBe('in')
  })
  test('generate maps image to image port, others to text', () => {
    expect(resolveAutoConnectHandle('image', 'generate')).toBe('image')
    expect(resolveAutoConnectHandle('text', 'generate')).toBe('text')
    expect(resolveAutoConnectHandle('any', 'generate')).toBe('text')
  })
  test('comfy engine only accepts workflow', () => {
    expect(resolveAutoConnectHandle('workflow', 'comfyUIEngine')).toBe('in')
    expect(resolveAutoConnectHandle('text', 'comfyUIEngine')).toBeNull()
  })
  test('loadAsset has no inputs', () => {
    expect(resolveAutoConnectHandle('text', 'loadAsset')).toBeNull()
  })
})
