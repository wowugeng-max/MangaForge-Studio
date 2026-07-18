import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into workspaceUiShell.a/b.test.ts; shared source helpers in workspaceUiShellSource.ts

describe('commercial writing workspace UI shell monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'workspaceUiShell.a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'workspaceUiShell.b.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'workspaceUiShellSource.ts'))).toBe(true)
  })
})
