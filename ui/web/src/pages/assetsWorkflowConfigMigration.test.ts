import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('WorkflowConfig ComfyForge migration', () => {
  test('accepts both upstream bare asset payloads and MangaForge TS asset envelopes', () => {
    const source = readFileSync(join(import.meta.dir, 'Assets', 'WorkflowConfig.tsx'), 'utf8')

    expect(source).toContain('const asset = res.data?.asset || res.data')
    expect(source).toContain("if (asset.type !== 'workflow')")
    expect(source).toContain('setAssetName(asset.name)')
    expect(source).toContain('setProjectId(asset.project_id)')
  })

  test('preselects project scope from projectId query when creating workflow assets', () => {
    const source = readFileSync(join(import.meta.dir, 'Assets', 'WorkflowConfig.tsx'), 'utf8')

    expect(source).toContain("const requestedProjectId = searchParams.get('projectId')")
    expect(source).toContain('const parsedProjectId = requestedProjectId ? Number(requestedProjectId) : undefined')
    expect(source).toContain('Number.isFinite(parsedProjectId) ? parsedProjectId : undefined')
    expect(source).toContain('useState<number | undefined>(initialProjectId)')
  })

  test('preserves workflow asset metadata when saving through the full editor', () => {
    const source = readFileSync(join(import.meta.dir, 'Assets', 'WorkflowConfig.tsx'), 'utf8')

    expect(source).toContain('function pickWorkflowAssetMetadata')
    expect(source).toContain('const [originalWorkflowData, setOriginalWorkflowData]')
    expect(source).toContain('setOriginalWorkflowData(asset.data)')
    expect(source).toContain('data: { ...pickWorkflowAssetMetadata(originalWorkflowData), workflow_json: workflowJson, parameters: parameters }')
  })
})
