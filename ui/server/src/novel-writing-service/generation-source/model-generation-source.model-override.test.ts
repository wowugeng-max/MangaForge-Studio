import { describe, expect, test } from 'bun:test'
import { ModelGenerationSource } from './model-generation-source'

const project = { id: 5, title: '模型覆盖' }

function makeSource(agentOptions: any[]) {
  return new ModelGenerationSource({
    modelId: 217,
    provenance: {
      task_id: 'task-model-override', project_id: 5, chapter_id: 12,
      source: 'model', source_fingerprint: `sha256:${'a'.repeat(64)}`,
      authority_fingerprint: `sha256:${'a'.repeat(64)}`,
      context_version: `sha256:${'b'.repeat(64)}`,
    },
    generateChapterProse: async () => ({}),
    executeAgent: async (_agentId: string, _project: any, _context: any, options: any) => {
      agentOptions.push(options)
      return { content: '{}', parsed: {} }
    },
    recordStage: async (_stage, _request, operation) => operation({
      artifactId: 0, attempt: 0, attachRemoteIdentity: async () => {},
    }),
  })
}

describe('ModelGenerationSource executeAgent model override', () => {
  test('uses the caller model when options.modelId is a positive integer string', async () => {
    const agentOptions: any[] = []
    const source = makeSource(agentOptions)
    await source.executeAgent('humanize', 'humanize_prose', 'prose-agent', project, { task: '润色' }, {
      modelId: '317',
    })
    expect(agentOptions.map(options => options.modelId)).toEqual(['317'])
  })

  test('keeps the pinned model when options.modelId is absent', async () => {
    const agentOptions: any[] = []
    const source = makeSource(agentOptions)
    await source.executeAgent('humanize', 'humanize_prose', 'prose-agent', project, { task: '润色' }, {})
    expect(agentOptions.map(options => options.modelId)).toEqual(['217'])
  })

  test('keeps the pinned model when options.modelId is invalid', async () => {
    const agentOptions: any[] = []
    const source = makeSource(agentOptions)
    await source.executeAgent('humanize', 'humanize_prose', 'prose-agent', project, { task: '润色' }, {
      modelId: 'abc',
    })
    await source.executeAgent('humanize', 'humanize_prose', 'prose-agent', project, { task: '润色' }, {
      modelId: '0',
    })
    expect(agentOptions.map(options => options.modelId)).toEqual(['217', '217'])
  })
})
