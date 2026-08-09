import { describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPromptCompiler, SkillCompilerError } from './compiler'
import { computeCompileInputHash, createCompileCache } from './compile-cache'

const skill = (rootDir: string, compatibility: any = 'prompt_ready'): any => ({ packId: 'pack-a', directoryName: 'h3', name: 'h3', description: 'prompt', arguments: [], userInvocable: true, triggerWords: [], mediaModes: ['text_to_video'], compatibility, revision: 'a'.repeat(40), rootDir, body: 'Write a cinematic prompt.', references: ['references/base.txt'] })

describe('prompt compiler', () => {
  test('leading qualified command wins over selector fields', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mf-compiler-'))
    await mkdir(join(root, 'references'))
    await writeFile(join(root, 'references/base.txt'), 'BASE_GUIDE')
    const queries: any[] = []
    const compiler = createPromptCompiler({
      registry: { resolve: async (query: any) => { queries.push(query); return { ...skill(root), packId: 'pack-a', name: 'h3' } } } as any,
      readModels: async () => [],
    })
    await expect(compiler({ skillName: 'wrong', packId: 'wrong-pack', rawPrompt: '/pack-a:h3 hero', mode: 'text_to_video', incomingAssets: [], nodeParams: {}, activeWorkspace: root, compilerModelId: 1 })).rejects.toThrow(expect.objectContaining({ code: 'SKILL_COMPILER_MODEL_INCOMPATIBLE' }))
    expect(queries[0]).toMatchObject({ packId: 'pack-a', name: 'h3' })
  })

  test('empty prompt in a valid JSON result is typed as empty', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mf-compiler-'))
    await mkdir(join(root, 'references'))
    await writeFile(join(root, 'references/base.txt'), 'BASE_GUIDE')
    const compiler = createPromptCompiler({ registry: { resolve: async () => skill(root) } as any, readModels: async () => [{ id: 8, model_name: 'chat', provider: 'x', display_name: 'chat', capabilities: { chat: true } } as any], executeWithRuntimeModel: async () => ({ content: JSON.stringify({ skill_name: 'h3', skill_version: 'v1', mode: 'text_to_video', prompt: ' ', negative_prompt: '', parameters: {}, references_used: [], warnings: [] }) }) })
    await expect(compiler({ skillName: 'h3', rawPrompt: 'x', mode: 'text_to_video', incomingAssets: [], nodeParams: {}, activeWorkspace: root, compilerModelId: 8 })).rejects.toThrow(expect.objectContaining({ code: 'SKILL_RESULT_EMPTY' }))
  })

  test('does not sort source asset lineage ids in cache input', () => {
    const base: any = { packId: 'p', revision: 'r', skillName: 's', rawPrompt: 'x', mode: 'text_to_video', incomingAssets: [{ type: 'image', source_asset_ids: [2, 1], url: 'https://x/a.png' }], nodeParams: {} }
    expect(computeCompileInputHash(base)).not.toBe(computeCompileInputHash({ ...base, incomingAssets: [{ ...base.incomingAssets[0], source_asset_ids: [1, 2] }] }))
  })

  test('does not let a cache hit bypass current model capability checks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mf-compiler-'))
    await mkdir(join(root, 'references'))
    await writeFile(join(root, 'references/base.txt'), 'BASE_GUIDE')
    const cache = createCompileCache()
    const input: any = { skillName: 'h3', rawPrompt: 'hero', mode: 'text_to_video', incomingAssets: [{ type: 'image', url: 'https://x/a.png' }], nodeParams: {}, activeWorkspace: root, compilerModelId: 9 }
    const execute = async () => ({ content: JSON.stringify({ skill_name: 'h3', skill_version: 'a'.repeat(40), mode: 'text_to_video', prompt: 'PROMPT', negative_prompt: '', parameters: {}, references_used: ['references/base.txt'], warnings: [] }) })
    await createPromptCompiler({ registry: { resolve: async () => skill(root) } as any, cache, readModels: async () => [{ id: 9, model_name: 'chat', provider: 'x', display_name: 'chat', capabilities: { chat: true, vision: true } } as any], executeWithRuntimeModel: execute })(input)
    await expect(createPromptCompiler({ registry: { resolve: async () => skill(root) } as any, cache, readModels: async () => [{ id: 9, model_name: 'chat', provider: 'x', display_name: 'chat', capabilities: { chat: true, vision: false } } as any], executeWithRuntimeModel: execute })(input)).rejects.toThrow(expect.objectContaining({ code: 'SKILL_COMPILER_VISION_REQUIRED' }))
  })

  test('redacts secrets and internal fields in every text model-bound part', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mf-compiler-'))
    await mkdir(join(root, 'references'))
    await writeFile(join(root, 'references/base.txt'), 'BASE_GUIDE')
    let request: any
    const compiler = createPromptCompiler({ registry: { resolve: async () => ({ ...skill(root), arguments: [{ name: 'style' }] }) } as any, readModels: async () => [{ id: 10, model_name: 'chat', provider: 'x', display_name: 'chat', capabilities: { chat: true, vision: true } } as any], executeWithRuntimeModel: async (_w, req) => { request = req; return { content: JSON.stringify({ skill_name: 'h3', skill_version: 'a'.repeat(40), mode: 'text_to_video', prompt: 'ok', negative_prompt: '', parameters: {}, references_used: [], warnings: [] }) } } })
    await compiler({ skillName: 'h3', rawPrompt: `${root}/private ${encodeURIComponent(root)}/private sk-test-secret-token activeWorkspace`, mode: 'text_to_video', incomingAssets: [{ type: 'prompt', content: `Bearer abc ${encodeURIComponent(root)}` }, { type: 'image', url: `https://x/a.png?access_token=secret&auth=secret2&signature=secret3&sig=secret4&X-Amz-Credential=secret5&workspace=${encodeURIComponent(root)}` }], nodeParams: { cameraParams: { api_key: 'sk-another-secret', access_token: 'access-secret', auth: 'auth-secret', activeWorkspace: root } }, arguments: { style: `${root}/style` }, activeWorkspace: root, compilerModelId: 10 })
    const serialized = JSON.stringify(request)
    expect(serialized).not.toContain(root)
    expect(serialized).not.toContain(encodeURIComponent(root))
    expect(serialized).not.toContain('sk-test-secret-token')
    expect(serialized).not.toContain('sk-another-secret')
    expect(serialized).not.toContain('Bearer abc')
    expect(serialized).not.toContain('activeWorkspace')
    expect(serialized).not.toContain('secret2')
    expect(serialized).not.toContain('secret3')
    expect(serialized).not.toContain('secret4')
    expect(serialized).not.toContain('secret5')
    expect(serialized).not.toContain('access-secret')
    expect(serialized).not.toContain('auth-secret')
    expect(serialized).toContain('image_url')
  })

  test('rejects a result version that is not the locked revision', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mf-compiler-'))
    await mkdir(join(root, 'references'))
    await writeFile(join(root, 'references/base.txt'), 'BASE_GUIDE')
    const compiler = createPromptCompiler({ registry: { resolve: async () => skill(root) } as any, readModels: async () => [{ id: 11, model_name: 'chat', provider: 'x', display_name: 'chat', capabilities: { chat: true } } as any], executeWithRuntimeModel: async () => ({ content: JSON.stringify({ skill_name: 'h3', skill_version: 'other', mode: 'text_to_video', prompt: 'ok', negative_prompt: '', parameters: {}, references_used: [], warnings: [] }) }) })
    await expect(compiler({ skillName: 'h3', rawPrompt: 'x', mode: 'text_to_video', incomingAssets: [], nodeParams: {}, activeWorkspace: root, compilerModelId: 11 })).rejects.toThrow(expect.objectContaining({ code: 'SKILL_RESULT_INVALID' }))
  })

  test('builds bounded request and validates a structured result', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mf-compiler-'))
    await mkdir(join(root, 'references'))
    await writeFile(join(root, 'references/base.txt'), 'BASE_GUIDE')
    const calls: any[] = []
    const compiler = createPromptCompiler({
      registry: { resolve: async () => skill(root) } as any,
      readModels: async () => [{ id: 7, model_name: 'chat', provider: 'x', display_name: 'chat', capabilities: { chat: true, vision: true } } as any],
      executeWithRuntimeModel: async (_workspace: string, request: any) => {
        calls.push(request)
        return { content: JSON.stringify({ skill_name: 'h3', skill_version: 'a'.repeat(40), mode: 'text_to_video', prompt: 'PROMPT', negative_prompt: 'bad', parameters: { size: 'small' }, references_used: ['references/base.txt'], warnings: [] }) }
      },
    })
    const output = await compiler({ skillName: 'h3', rawPrompt: 'hero', mode: 'text_to_video', incomingAssets: [{ type: 'prompt', content: 'asset text' }], nodeParams: { size: 'small', secret: 'omit' }, activeWorkspace: root, compilerModelId: 7 })
    expect(output.result.prompt).toContain('PROMPT')
    expect(calls).toHaveLength(1)
    expect(JSON.stringify(calls[0])).toContain('BASE_GUIDE')
    expect(JSON.stringify(calls[0])).not.toContain('secret')
  })

  test('requires vision for image inputs and caches identical input', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mf-compiler-'))
    await mkdir(join(root, 'references'))
    await writeFile(join(root, 'references/base.txt'), 'BASE_GUIDE')
    const calls: any[] = []
    const compiler = createPromptCompiler({ registry: { resolve: async () => skill(root) } as any, readModels: async () => [{ id: 1, model_name: 'chat', provider: 'x', display_name: 'chat', capabilities: { chat: true, vision: false } } as any], executeWithRuntimeModel: async () => { calls.push(1); return { content: '{}' } } })
    await expect(compiler({ skillName: 'h3', rawPrompt: 'x', mode: 'text_to_video', incomingAssets: [{ type: 'image', url: 'https://x/a.png' }], nodeParams: {}, activeWorkspace: root, compilerModelId: 1 })).rejects.toThrow(expect.objectContaining({ code: 'SKILL_COMPILER_VISION_REQUIRED' }))
    expect(computeCompileInputHash({ packId: 'p', revision: 'r', skillName: 's', rawPrompt: 'x', mode: 'text_to_video', incomingAssets: [], nodeParams: {} })).toHaveLength(64)
    expect(calls).toHaveLength(0)
  })

  test('exports typed error', () => expect(new SkillCompilerError('SKILL_RESULT_EMPTY', 'empty')).toBeInstanceOf(Error))
})
