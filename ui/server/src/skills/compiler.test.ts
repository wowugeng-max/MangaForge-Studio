import { describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPromptCompiler, SkillCompilerError } from './compiler'
import { computeCompileInputHash } from './compile-cache'

const skill = (rootDir: string, compatibility: any = 'prompt_ready'): any => ({ packId: 'pack-a', directoryName: 'h3', name: 'h3', description: 'prompt', arguments: [], userInvocable: true, triggerWords: [], mediaModes: ['text_to_video'], compatibility, revision: 'a'.repeat(40), rootDir, body: 'Write a cinematic prompt.', references: ['references/base.txt'] })

describe('prompt compiler', () => {
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
