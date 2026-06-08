import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('AssetCreate ComfyForge migration', () => {
  test('supports full creation of node config and node template assets', () => {
    const source = readFileSync(join(import.meta.dir, 'Assets', 'Create.tsx'), 'utf8')

    expect(source).toContain("assetType === 'node_config'")
    expect(source).toContain("assetType === 'node_template'")
    expect(source).toContain("case 'node_config':")
    expect(source).toContain("case 'node_template':")
    expect(source).toContain('nodeType: values.nodeType')
    expect(source).toContain('config: values.config ? JSON.parse(values.config) : {}')
    expect(source).toContain('nodes: values.nodes ? JSON.parse(values.nodes) : []')
    expect(source).toContain('edges: values.edges ? JSON.parse(values.edges) : []')
    expect(source).toContain('Radio.Button value="node_config"')
    expect(source).toContain('Radio.Button value="node_template"')
  })
})
