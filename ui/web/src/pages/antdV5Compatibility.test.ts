import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

const migratedPages = [
  'Dashboard.tsx',
  'Assets/index.tsx',
  'Assets/Create.tsx',
  'Assets/Detail.tsx',
  'Assets/Edit.tsx',
  'Assets/WorkflowConfig.tsx',
  'Keys/index.tsx',
  'ModelManager.tsx',
  'Providers/index.tsx',
]

function pageSource(file: string) {
  return readFileSync(join(import.meta.dir, file), 'utf8')
}

describe('Ant Design v5 compatibility for migrated management pages', () => {
  test.each(migratedPages)('%s avoids deprecated card bodyStyle and Card bordered props', file => {
    const source = pageSource(file)

    expect(source).not.toContain('bodyStyle=')
    expect(source).not.toMatch(/<Card[^\n>]*\bbordered=\{false\}/)
  })

  test.each(['Keys/index.tsx', 'ModelManager.tsx'])('%s avoids deprecated destroyOnClose', file => {
    const source = pageSource(file)

    expect(source).not.toContain('destroyOnClose')
  })

  test('provider drawer uses current styles API instead of headerStyle/bodyStyle', () => {
    const source = pageSource('Providers/index.tsx')

    expect(source).not.toContain('headerStyle=')
    expect(source).not.toContain('bodyStyle=')
    expect(source).toContain('styles={{')
    expect(source).toContain('header: { borderBottom:')
    expect(source).toContain('body: { padding:')
  })
})
