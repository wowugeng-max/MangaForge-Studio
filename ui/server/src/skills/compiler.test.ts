import { describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPromptCompiler, SkillCompilerError } from './compiler'
import { computeCompileInputHash, createCompileCache } from './compile-cache'
import { parseSkillDocument, readOpenAIMetadata } from './frontmatter'
import { classifySkillCompatibility } from './registry'
import { writeSkillSettings } from './settings'
import type { CanvasMediaMode, CanvasReferenceAsset } from './types'

const skill = (rootDir: string, compatibility: any = 'prompt_ready'): any => ({ packId: 'pack-a', directoryName: 'h3', name: 'h3', description: 'prompt', arguments: [], userInvocable: true, triggerWords: [], mediaModes: ['text_to_video'], compatibility, revision: 'a'.repeat(40), rootDir, body: 'Write a cinematic prompt.', references: ['references/base.txt'] })

const H3_REVISION = 'b7227fa6a6206e9fb30562383d39e53cf3866a48'
const H3_NEGATIVE_PROMPT = 'no deformed hands; no watermark: preserve punctuation / spacing'
const H3_BASE_PROMPT = [
  'integrated_multimodal_description: [Shot 1] Live-action, cinematic, the baker opens the shutters. [Shot 2] At 00:03.500, the camera cuts to steam rising from the bread.',
  'overall_soundscape: Wooden shutters scrape open while trays clink softly.',
  'non_diegetic_music: Sparse piano notes at a slow tempo.',
].join('\n\n')
const H3_I2VA_PROMPT = [
  'For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.',
  'integrated_multimodal_description: [Shot 1] The woman in <Picture 1> lifts her gaze. [Shot 2] At 00:04.250, the shot cuts to her reflection.',
  'overall_soundscape: Train wheels keep a steady metallic rhythm.',
  'non_diegetic_music: Sustained cello notes at a slow tempo.',
].join('\n\n')
const H3_FL2VA_PROMPT = [
  'How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 1) aligns with the 8.00-second mark of the target video.',
  'integrated_multimodal_description: [Shot 1] The cyclist moves continuously from Picture 1 to Picture 2.',
  'overall_soundscape: Rain falls steadily on the pavement.',
  'non_diegetic_music: N/A',
].join('\n\n')
const H3_L2VA_PROMPT = [
  'How the reference pictures align with the target video — <Picture 1> (from [Shot 1]) aligns with the 6.00-second mark of the target video.',
  'integrated_multimodal_description: [Shot 1] The glass falls and settles into <Picture 1> at the end.',
  'overall_soundscape: The glass breaks with a sharp crash.',
  'non_diegetic_music: A low electronic pulse ends immediately.',
].join('\n\n')
const H3_REF2VA_PROMPT = [
  'subject_definitions:\n<Subject 1> is the baker from <Picture 1>.\n<Video 1> supplies the cut structure.\n<Audio 1> is the room-tone reference.',
  'summary:\n[reference generation + audio reference] The target video follows <Subject 1>.',
  'retention_analysis:\n<Subject 1> (appears in [Shot 1], [Shot 2]): fully_preserved - identity and clothing are retained.\n<Audio 1>: reference - room tone guides the target ambience.',
  'detailed_description:\n[Shot 1] <Subject 1> opens the bakery.\n[Shot 2] At 00:03.000, the shot cuts to <Picture 1> while <Video 1> guides the pacing.',
  'overall_soundscape:\nThe ambience referenced from <Audio 1> continues throughout.',
  'non_diegetic_music:\nN/A',
].join('\n\n')

const h3Cases: Array<{
  resultMode: CanvasMediaMode | 'T2VA' | 'I2VA' | 'FL2VA' | 'L2VA' | 'Ref2VA'
  expectedMode: Extract<CanvasMediaMode, 'text_to_video' | 'image_to_video'>
  prompt: string
  orderedFields: string[]
}> = [
  { resultMode: 'text_to_video', expectedMode: 'text_to_video', prompt: H3_BASE_PROMPT, orderedFields: ['integrated_multimodal_description:', 'overall_soundscape:', 'non_diegetic_music:'] },
  { resultMode: 'image_to_video', expectedMode: 'image_to_video', prompt: H3_I2VA_PROMPT, orderedFields: ['integrated_multimodal_description:', 'overall_soundscape:', 'non_diegetic_music:'] },
  { resultMode: 'T2VA', expectedMode: 'text_to_video', prompt: H3_BASE_PROMPT, orderedFields: ['integrated_multimodal_description:', 'overall_soundscape:', 'non_diegetic_music:'] },
  { resultMode: 'I2VA', expectedMode: 'image_to_video', prompt: H3_I2VA_PROMPT, orderedFields: ['integrated_multimodal_description:', 'overall_soundscape:', 'non_diegetic_music:'] },
  { resultMode: 'FL2VA', expectedMode: 'image_to_video', prompt: H3_FL2VA_PROMPT, orderedFields: ['integrated_multimodal_description:', 'overall_soundscape:', 'non_diegetic_music:'] },
  { resultMode: 'L2VA', expectedMode: 'image_to_video', prompt: H3_L2VA_PROMPT, orderedFields: ['integrated_multimodal_description:', 'overall_soundscape:', 'non_diegetic_music:'] },
  { resultMode: 'Ref2VA', expectedMode: 'image_to_video', prompt: H3_REF2VA_PROMPT, orderedFields: ['subject_definitions:', 'summary:', 'retention_analysis:', 'detailed_description:', 'overall_soundscape:', 'non_diegetic_music:'] },
]

const h3PromptSkill = (rootDir: string): any => ({
  ...skill(rootDir),
  directoryName: 'h3-prompt-writing',
  name: 'h3-prompt-writing',
  mediaModes: ['text_to_video', 'image_to_video'],
})

async function compilerRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'mf-compiler-'))
  await mkdir(join(root, 'references'))
  await writeFile(join(root, 'references/base.txt'), 'BASE_GUIDE')
  return root
}

function compilerResult(mode: CanvasMediaMode | 'T2VA' | 'I2VA' | 'FL2VA' | 'L2VA' | 'Ref2VA', overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    skill_name: 'h3-prompt-writing',
    skill_version: 'a'.repeat(40),
    mode,
    prompt: 'compiled prompt',
    negative_prompt: '',
    parameters: {},
    references_used: ['references/base.txt'],
    warnings: [],
    ...overrides,
  })
}

describe('prompt compiler', () => {
  test('compiles all nine ordered images with deterministic labels and compiler-owned provenance', async () => {
    const root = await compilerRoot()
    const calls: any[] = []
    const compiler = createPromptCompiler({
      registry: { resolve: async () => h3PromptSkill(root) } as any,
      readModels: async () => [{ id: 7, model_name: 'chat', provider: 'x', display_name: 'chat', capabilities: { chat: true, vision: true } } as any],
      executeWithRuntimeModel: async (_workspace, request) => {
        calls.push(request)
        return {
          content: compilerResult('Ref2VA', {
            reference_bindings: [{ reference_id: 'model-invented-reference' }],
            reference_mode_hint: 'T2VA',
          }),
        }
      },
    })
    const incomingAssets: CanvasReferenceAsset[] = Array.from({ length: 9 }, (_, index) => ({
      type: 'image',
      url: `/api/assets/media/ref-${index + 1}.png`,
      reference_index: index + 1,
      reference_id: `reference-${index + 1}`,
      reference_role: index === 0 ? 'first_frame' : index === 8 ? 'last_frame' : 'character',
      source_asset_ids: [index + 1, index + 101],
    }))

    const output = await compiler({
      skillName: 'h3-prompt-writing', rawPrompt: 'multi-reference shot', mode: 'image_to_video', incomingAssets,
      nodeParams: {}, activeWorkspace: root, compilerModelId: 7,
    })

    expect(calls).toHaveLength(1)
    const userParts = calls[0].messages[1].content as any[]
    const serialized = JSON.stringify(userParts)
    expect(serialized).toContain('REFERENCE MODE HINT: Ref2VA')
    expect(serialized).toContain('REFERENCE IMAGE 1\\nROLE: first_frame\\nSOURCE ASSET IDS: [1,101]')
    expect(serialized).toContain('REFERENCE IMAGE 9\\nROLE: last_frame\\nSOURCE ASSET IDS: [9,109]')
    expect(userParts.filter((part) => part.type === 'image_url').map((part) => part.image_url.url)).toEqual(
      incomingAssets.map((asset) => asset.url),
    )
    expect(output.result.reference_bindings).toEqual(incomingAssets.map((asset, index) => ({
      reference_index: index + 1,
      reference_id: `reference-${index + 1}`,
      reference_role: asset.reference_role,
      type: 'image',
      url: asset.url,
      source_asset_ids: [index + 1, index + 101],
    })))
    expect(output.result.reference_mode_hint).toBe('Ref2VA')
    expect(output.result.mode).toBe('image_to_video')
  })

  test('derives H3 hints for first, first-last, last, and text-only references', async () => {
    const root = await compilerRoot()
    const scenarios: Array<{
      name: string
      mode: Extract<CanvasMediaMode, 'text_to_video' | 'image_to_video'>
      resultMode: 'T2VA' | 'I2VA' | 'FL2VA' | 'L2VA'
      expectedHint: 'T2VA' | 'I2VA' | 'FL2VA' | 'L2VA'
      assets: CanvasReferenceAsset[]
    }> = [
      {
        name: 'first', mode: 'image_to_video', resultMode: 'I2VA', expectedHint: 'I2VA',
        assets: [{ type: 'image', url: '/first.png', reference_role: 'first_frame', source_asset_ids: [1] }],
      },
      {
        name: 'first-last', mode: 'image_to_video', resultMode: 'FL2VA', expectedHint: 'FL2VA',
        assets: [
          { type: 'image', url: '/first.png', reference_role: 'first_frame', source_asset_ids: [1] },
          { type: 'image', url: '/last.png', reference_role: 'last_frame', source_asset_ids: [2] },
        ],
      },
      {
        name: 'last', mode: 'image_to_video', resultMode: 'L2VA', expectedHint: 'L2VA',
        assets: [{ type: 'image', url: '/last.png', reference_role: 'last_frame', source_asset_ids: [2] }],
      },
      {
        name: 'text-only', mode: 'text_to_video', resultMode: 'T2VA', expectedHint: 'T2VA',
        assets: [{ type: 'prompt', content: 'keep the costume silhouette', reference_role: 'prompt_context', source_asset_ids: [31, 32] }],
      },
    ]

    for (const scenario of scenarios) {
      const calls: any[] = []
      const compiler = createPromptCompiler({
        registry: { resolve: async () => h3PromptSkill(root) } as any,
        readModels: async () => [{ id: 8, model_name: 'chat', provider: 'x', display_name: 'chat', capabilities: { chat: true, vision: true } } as any],
        executeWithRuntimeModel: async (_workspace, request) => {
          calls.push(request)
          return { content: compilerResult(scenario.resultMode) }
        },
      })
      const output = await compiler({
        skillName: 'h3-prompt-writing', rawPrompt: scenario.name, mode: scenario.mode, incomingAssets: scenario.assets,
        nodeParams: {}, activeWorkspace: root, compilerModelId: 8,
      })

      expect(JSON.stringify(calls[0].messages[1].content)).toContain(`REFERENCE MODE HINT: ${scenario.expectedHint}`)
      expect(output.result.reference_mode_hint).toBe(scenario.expectedHint)
      expect(output.result.mode).toBe(scenario.mode)
      if (scenario.name === 'text-only') {
        expect(JSON.stringify(calls[0].messages[1].content)).toContain('REFERENCE TEXT 1\\nROLE: prompt_context\\nSOURCE ASSET IDS: [31,32]')
        expect(JSON.stringify(calls[0].messages[1].content)).toContain('keep the costume silhouette')
      }
    }
  })

  test('rejects excessive and reserved media references before model lookup or execution', async () => {
    const root = await compilerRoot()
    let modelReads = 0
    let executions = 0
    const compiler = createPromptCompiler({
      registry: { resolve: async () => h3PromptSkill(root) } as any,
      readModels: async () => { modelReads += 1; return [] },
      executeWithRuntimeModel: async () => { executions += 1; return { content: compilerResult('image_to_video') } },
    })
    const common = { skillName: 'h3-prompt-writing', rawPrompt: 'references', mode: 'image_to_video' as const, nodeParams: {}, activeWorkspace: root, compilerModelId: 9 }

    await expect(compiler({
      ...common,
      incomingAssets: Array.from({ length: 10 }, (_, index) => ({ type: 'image' as const, url: `/ref-${index}.png` })),
    })).rejects.toThrow(expect.objectContaining({ code: 'REFERENCE_LIMIT_EXCEEDED' }))
    for (const type of ['video', 'audio'] as const) {
      await expect(compiler({ ...common, incomingAssets: [{ type, url: `/reference.${type}` }] }))
        .rejects.toThrow(expect.objectContaining({ code: 'REFERENCE_MEDIA_UNSUPPORTED' }))
    }
    expect(modelReads).toBe(0)
    expect(executions).toBe(0)
  })

  test('uses canonical roles, order, ids, and lineage in cache keys and cached audit metadata', async () => {
    const root = await compilerRoot()
    const cache = createCompileCache()
    let executions = 0
    const compiler = createPromptCompiler({
      registry: { resolve: async () => h3PromptSkill(root) } as any,
      cache,
      readModels: async () => [{ id: 10, model_name: 'chat', provider: 'x', display_name: 'chat', capabilities: { chat: true, vision: true } } as any],
      executeWithRuntimeModel: async () => { executions += 1; return { content: compilerResult('image_to_video') } },
    })
    const references: CanvasReferenceAsset[] = [
      { type: 'image', url: '/a.png', reference_index: 1, reference_id: 'hero', reference_role: 'first_frame', source_asset_ids: [11, 12] },
      { type: 'image', url: '/b.png', reference_index: 2, reference_id: 'environment', reference_role: 'last_frame', source_asset_ids: [21, 22] },
    ]
    const base = { skillName: 'h3-prompt-writing', rawPrompt: 'cache me', mode: 'image_to_video' as const, nodeParams: {}, activeWorkspace: root, compilerModelId: 10 }
    const first = await compiler({ ...base, incomingAssets: references })
    const identical = await compiler({ ...base, incomingAssets: references.map((asset) => ({ ...asset, source_asset_ids: [...(asset.source_asset_ids ?? [])] })) })
    const variants: CanvasReferenceAsset[][] = [
      [references[1]!, references[0]!],
      [{ ...references[0]!, reference_role: 'character' }, references[1]!],
      [{ ...references[0]!, reference_id: 'different-hero' }, references[1]!],
      [{ ...references[0]!, source_asset_ids: [12, 11] }, references[1]!],
    ]

    expect(first.cached).toBe(false)
    expect(identical.cached).toBe(true)
    expect(identical.inputHash).toBe(first.inputHash)
    expect(first.result.reference_bindings).toEqual(references)
    expect(first.result.reference_mode_hint).toBe('FL2VA')
    expect(identical.result.reference_bindings).toEqual(first.result.reference_bindings)
    for (const variant of variants) {
      const output = await compiler({ ...base, incomingAssets: variant })
      expect(output.inputHash).not.toBe(first.inputHash)
      expect(output.cached).toBe(false)
    }
    expect(executions).toBe(1 + variants.length)
  })

  test('keys cached compiles by the explicit effective compiler model', async () => {
    const root = await compilerRoot()
    const modelCalls: number[] = []
    const compiler = createPromptCompiler({
      registry: { resolve: async () => h3PromptSkill(root) } as any,
      cache: createCompileCache(),
      readModels: async () => [
        { id: 1, model_name: 'compiler-one', provider: 'x', display_name: 'Compiler One', capabilities: { chat: true } } as any,
        { id: 2, model_name: 'compiler-two', provider: 'x', display_name: 'Compiler Two', capabilities: { chat: true } } as any,
      ],
      executeWithRuntimeModel: async (_workspace, _request, modelId) => {
        modelCalls.push(Number(modelId))
        return { content: compilerResult('text_to_video', { prompt: `compiled by model ${modelId}` }) }
      },
    })
    const input = {
      skillName: 'h3-prompt-writing', rawPrompt: 'model-specific cache', mode: 'text_to_video' as const,
      incomingAssets: [], nodeParams: {}, activeWorkspace: root,
    }

    const first = await compiler({ ...input, compilerModelId: 1 })
    const repeated = await compiler({ ...input, compilerModelId: 1 })
    const secondModel = await compiler({ ...input, compilerModelId: 2 })

    expect(modelCalls).toEqual([1, 2])
    expect(first).toMatchObject({ cached: false, compilerModelId: 1, result: { prompt: 'compiled by model 1' } })
    expect(repeated).toMatchObject({ cached: true, compilerModelId: 1, result: { prompt: 'compiled by model 1' } })
    expect(repeated.inputHash).toBe(first.inputHash)
    expect(secondModel).toMatchObject({ cached: false, compilerModelId: 2, result: { prompt: 'compiled by model 2' } })
    expect(secondModel.inputHash).not.toBe(first.inputHash)
  })

  test('re-reads the configured compiler model before generating the cache key', async () => {
    const root = await compilerRoot()
    const modelCalls: number[] = []
    const compiler = createPromptCompiler({
      registry: { resolve: async () => h3PromptSkill(root) } as any,
      cache: createCompileCache(),
      readModels: async () => [
        { id: 1, model_name: 'compiler-one', provider: 'x', display_name: 'Compiler One', capabilities: { chat: true } } as any,
        { id: 2, model_name: 'compiler-two', provider: 'x', display_name: 'Compiler Two', capabilities: { chat: true } } as any,
      ],
      executeWithRuntimeModel: async (_workspace, _request, modelId) => {
        modelCalls.push(Number(modelId))
        return { content: compilerResult('text_to_video', { prompt: `compiled by model ${modelId}` }) }
      },
    })
    const input = {
      skillName: 'h3-prompt-writing', rawPrompt: 'configured model cache', mode: 'text_to_video' as const,
      incomingAssets: [], nodeParams: {}, activeWorkspace: root,
    }

    await writeSkillSettings(root, 1)
    const first = await compiler(input)
    await writeSkillSettings(root, 2)
    const second = await compiler(input)
    const repeatedSecond = await compiler(input)

    expect(modelCalls).toEqual([1, 2])
    expect(first).toMatchObject({ cached: false, compilerModelId: 1, result: { prompt: 'compiled by model 1' } })
    expect(second).toMatchObject({ cached: false, compilerModelId: 2, result: { prompt: 'compiled by model 2' } })
    expect(second.inputHash).not.toBe(first.inputHash)
    expect(repeatedSecond).toMatchObject({ cached: true, compilerModelId: 2, result: { prompt: 'compiled by model 2' } })
    expect(repeatedSecond.inputHash).toBe(second.inputHash)
  })

  test('rebuilds cached provenance after a caller mutates the first returned audit metadata', async () => {
    const root = await compilerRoot()
    const cache = createCompileCache()
    let executions = 0
    const compiler = createPromptCompiler({
      registry: { resolve: async () => h3PromptSkill(root) } as any,
      cache,
      readModels: async () => [{ id: 11, model_name: 'chat', provider: 'x', display_name: 'chat', capabilities: { chat: true, vision: true } } as any],
      executeWithRuntimeModel: async () => { executions += 1; return { content: compilerResult('image_to_video') } },
    })
    const references: CanvasReferenceAsset[] = [
      { type: 'image', url: '/first.png', reference_id: 'first', reference_role: 'first_frame', source_asset_ids: [41, 42] },
      { type: 'image', url: '/last.png', reference_id: 'last', reference_role: 'last_frame', source_asset_ids: [51, 52] },
    ]
    const input = {
      skillName: 'h3-prompt-writing', rawPrompt: 'immutable cache audit', mode: 'image_to_video' as const,
      incomingAssets: references, nodeParams: {}, activeWorkspace: root, compilerModelId: 11,
    }

    const first = await compiler(input)
    const exposedBindings = first.result.reference_bindings!
    exposedBindings[0]!.reference_id = 'caller-mutated'
    exposedBindings[0]!.reference_role = 'style'
    exposedBindings[0]!.source_asset_ids![0] = 999
    exposedBindings.push({
      reference_index: 99,
      reference_id: 'caller-added',
      reference_role: 'general',
      type: 'image',
      url: '/caller-added.png',
      source_asset_ids: [999],
    })

    const cached = await compiler(input)

    expect(cached.cached).toBe(true)
    expect(cached.result.reference_bindings).toEqual([
      { type: 'image', url: '/first.png', reference_index: 1, reference_id: 'first', reference_role: 'first_frame', source_asset_ids: [41, 42] },
      { type: 'image', url: '/last.png', reference_index: 2, reference_id: 'last', reference_role: 'last_frame', source_asset_ids: [51, 52] },
    ])
    expect(cached.result.reference_bindings).not.toBe(exposedBindings)
    expect(cached.result.reference_bindings?.[0]?.source_asset_ids).not.toBe(exposedBindings[0]?.source_asset_ids)
    expect(executions).toBe(1)
  })

  test('compiles the public H3 fixture deterministically across MangaForge modes and H3 sub-mode aliases', async () => {
    const root = join(import.meta.dir, 'fixtures', 'h3-prompt-writing')
    const skillPath = join(root, 'SKILL.md')
    const raw = await readFile(skillPath, 'utf8')
    const parsed = parseSkillDocument(raw, skillPath)
    const classification = classifySkillCompatibility(parsed.manifest, raw)
    const metadata = readOpenAIMetadata(await readFile(join(root, 'agents', 'openai.yaml'), 'utf8'))
    const fixtureSkill = {
      ...parsed.manifest,
      ...classification,
      packId: 'MiniMax-H3',
      revision: H3_REVISION,
      sourceUrl: 'https://github.com/MiniMax-AI/MiniMax-H3',
    }

    expect(parsed.manifest.mediaModes).toEqual([])
    expect(fixtureSkill.mediaModes).toEqual(['text_to_video', 'image_to_video'])
    expect(fixtureSkill.references).toEqual(['references/base-en.txt', 'references/ref-en.txt'])
    expect(metadata).toEqual({
      displayName: 'MiniMax H3 Prompt Writing',
      shortDescription: 'Write H3 base and full-reference video prompts',
      defaultPrompt: 'Use $h3-prompt-writing to rewrite this multimodal request into a MiniMax H3 generation prompt.',
    })

    for (const [index, scenario] of h3Cases.entries()) {
      const requests: any[] = []
      const compiler = createPromptCompiler({
        registry: {
          resolve: async (query: any) => {
            expect(query).toMatchObject({ packId: 'MiniMax-H3', name: 'h3-prompt-writing', mode: scenario.expectedMode, readyOnly: true })
            return fixtureSkill
          },
        } as any,
        readModels: async () => [{
          id: 21,
          model_name: 'fixture-compiler',
          provider: 'fixture',
          display_name: 'Fixture Compiler',
          capabilities: { chat: true, vision: true, negative_prompt: true },
        } as any],
        executeWithRuntimeModel: async (_workspace, request) => {
          requests.push(request)
          return {
            content: JSON.stringify({
              skill_name: 'h3-prompt-writing',
              skill_version: H3_REVISION,
              mode: scenario.resultMode,
              prompt: scenario.prompt,
              negative_prompt: H3_NEGATIVE_PROMPT,
              parameters: {},
              references_used: ['references/base-en.txt', 'references/ref-en.txt'],
              warnings: [],
            }),
          }
        },
      })

      const output = await compiler({
        packId: 'MiniMax-H3',
        skillName: 'h3-prompt-writing',
        rawPrompt: `${scenario.resultMode} deterministic fixture prompt ${index}`,
        mode: scenario.expectedMode,
        incomingAssets: scenario.expectedMode === 'image_to_video'
          ? [{ type: 'image', url: '/api/assets/media/assets%2Fh3-fixture.png', source_asset_ids: [42] }]
          : [],
        nodeParams: { aspect_ratio: '16:9' },
        activeWorkspace: '/fixture-workspace',
        compilerModelId: 21,
      })

      expect(requests).toHaveLength(1)
      const system = String(requests[0].messages[0].content)
      expect(system).toContain('REFERENCE references/base-en.txt\nH3_BASE_GUIDE_CONTRACT')
      expect(system).toContain('REFERENCE references/ref-en.txt\nH3_REF_GUIDE_CONTRACT')
      expect(system.indexOf('REFERENCE references/base-en.txt')).toBeLessThan(system.indexOf('REFERENCE references/ref-en.txt'))
      expect(JSON.stringify(requests[0].messages[1].content)).toContain(`MODE: ${scenario.expectedMode}`)
      expect(output.result.mode).toBe(scenario.expectedMode)
      expect(output.result.prompt).toBe(scenario.prompt)
      expect(output.result.negative_prompt).toBe(H3_NEGATIVE_PROMPT)
      expect(output.result.references_used).toEqual(['references/base-en.txt', 'references/ref-en.txt'])
      for (let fieldIndex = 1; fieldIndex < scenario.orderedFields.length; fieldIndex += 1) {
        expect(output.result.prompt.indexOf(scenario.orderedFields[fieldIndex - 1])).toBeLessThan(output.result.prompt.indexOf(scenario.orderedFields[fieldIndex]))
      }
      expect(output.result.prompt).toMatch(scenario.resultMode === 'Ref2VA' ? /\[Shot 2\] At 00:03\.000,/ : /(?:0\.00-second|0\.00 seconds|00:03\.500|00:04\.250|8\.00-second|6\.00-second)/)
    }
  })

  test('compiles the public H3 fixture with stable ordered multi-reference hashes and distinct reordered hashes', async () => {
    const root = join(import.meta.dir, 'fixtures', 'h3-prompt-writing')
    const skillPath = join(root, 'SKILL.md')
    const raw = await readFile(skillPath, 'utf8')
    const parsed = parseSkillDocument(raw, skillPath)
    const fixtureSkill = {
      ...parsed.manifest,
      ...classifySkillCompatibility(parsed.manifest, raw),
      packId: 'MiniMax-H3',
      revision: H3_REVISION,
      sourceUrl: 'https://github.com/MiniMax-AI/MiniMax-H3',
    }
    const requests: any[] = []
    const compiler = createPromptCompiler({
      registry: { resolve: async () => fixtureSkill } as any,
      cache: createCompileCache(),
      readModels: async () => [{
        id: 23,
        model_name: 'fixture-compiler',
        provider: 'fixture',
        display_name: 'Fixture Compiler',
        capabilities: { chat: true, vision: true, negative_prompt: true },
      } as any],
      executeWithRuntimeModel: async (_workspace, request) => {
        requests.push(request)
        return {
          content: JSON.stringify({
            skill_name: 'h3-prompt-writing',
            skill_version: H3_REVISION,
            mode: 'Ref2VA',
            prompt: H3_REF2VA_PROMPT,
            negative_prompt: H3_NEGATIVE_PROMPT,
            parameters: {},
            references_used: ['references/base-en.txt', 'references/ref-en.txt'],
            warnings: [],
          }),
        }
      },
    })
    const orderedAssets: CanvasReferenceAsset[] = [
      { type: 'image', url: '/api/assets/media/assets%2Ffirst.png', source_asset_ids: [42], reference_index: 1, reference_role: 'first_frame' },
      { type: 'image', url: '/api/assets/media/assets%2Fcharacter.png', source_asset_ids: [43], reference_index: 2, reference_role: 'character' },
      { type: 'image', url: '/api/assets/media/assets%2Flast.png', source_asset_ids: [44], reference_index: 3, reference_role: 'last_frame' },
    ]
    const baseInput = {
      packId: 'MiniMax-H3',
      skillName: 'h3-prompt-writing',
      rawPrompt: 'Build a coherent bakery sequence from the ordered references.',
      mode: 'image_to_video' as const,
      nodeParams: { aspect_ratio: '16:9' },
      activeWorkspace: '/fixture-multi-reference-workspace',
      compilerModelId: 23,
    }

    const first = await compiler({ ...baseInput, incomingAssets: orderedAssets })
    const repeated = await compiler({
      ...baseInput,
      incomingAssets: orderedAssets.map(asset => ({ ...asset, source_asset_ids: [...(asset.source_asset_ids ?? [])] })),
    })
    const reorderedAssets = [orderedAssets[2]!, orderedAssets[1]!, orderedAssets[0]!].map(asset => ({
      ...asset,
      source_asset_ids: [...(asset.source_asset_ids ?? [])],
    }))
    const reordered = await compiler({ ...baseInput, incomingAssets: reorderedAssets })

    expect(requests).toHaveLength(2)
    for (const request of requests) {
      const system = String(request.messages[0].content)
      expect(system).toContain('REFERENCE references/base-en.txt\nH3_BASE_GUIDE_CONTRACT')
      expect(system).toContain('REFERENCE references/ref-en.txt\nH3_REF_GUIDE_CONTRACT')
    }
    const firstUserParts = requests[0].messages[1].content as any[]
    expect(firstUserParts.filter(part => part.type === 'image_url').map(part => part.image_url.url)).toEqual(
      orderedAssets.map(asset => asset.url),
    )
    expect(JSON.stringify(firstUserParts)).toContain('REFERENCE IMAGE 1\\nROLE: first_frame\\nSOURCE ASSET IDS: [42]')
    expect(JSON.stringify(firstUserParts)).toContain('REFERENCE IMAGE 2\\nROLE: character\\nSOURCE ASSET IDS: [43]')
    expect(JSON.stringify(firstUserParts)).toContain('REFERENCE IMAGE 3\\nROLE: last_frame\\nSOURCE ASSET IDS: [44]')
    expect((requests[1].messages[1].content as any[]).filter(part => part.type === 'image_url').map(part => part.image_url.url)).toEqual(
      reorderedAssets.map(asset => asset.url),
    )
    expect(first.inputHash).toMatch(/^[0-9a-f]{64}$/)
    expect(repeated.inputHash).toBe(first.inputHash)
    expect(repeated.cached).toBe(true)
    expect(reordered.inputHash).not.toBe(first.inputHash)
    expect(reordered.cached).toBe(false)
    expect(first.result).toMatchObject({
      mode: 'image_to_video',
      references_used: ['references/base-en.txt', 'references/ref-en.txt'],
      reference_mode_hint: 'Ref2VA',
    })
    expect(first.result.reference_bindings).toEqual([
      { type: 'image', url: '/api/assets/media/assets%2Ffirst.png', source_asset_ids: [42], reference_index: 1, reference_id: 'reference-1', reference_role: 'first_frame' },
      { type: 'image', url: '/api/assets/media/assets%2Fcharacter.png', source_asset_ids: [43], reference_index: 2, reference_id: 'reference-2', reference_role: 'character' },
      { type: 'image', url: '/api/assets/media/assets%2Flast.png', source_asset_ids: [44], reference_index: 3, reference_id: 'reference-3', reference_role: 'last_frame' },
    ])
  })

  test('does not treat H3 sub-mode aliases as generic Canvas media modes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mf-compiler-'))
    await mkdir(join(root, 'references'))
    await writeFile(join(root, 'references/base.txt'), 'BASE_GUIDE')
    const requests: any[] = []
    const compiler = createPromptCompiler({
      registry: { resolve: async () => ({ ...skill(root), name: 'other-video-prompt' }) } as any,
      readModels: async () => [{ id: 22, model_name: 'chat', provider: 'x', display_name: 'chat', capabilities: { chat: true } } as any],
      executeWithRuntimeModel: async (_workspace, request) => {
        requests.push(request)
        return {
          content: JSON.stringify({
            skill_name: 'other-video-prompt', skill_version: 'a'.repeat(40), mode: 'T2VA', prompt: 'prompt',
            negative_prompt: '', parameters: {}, references_used: [], warnings: [],
          }),
        }
      },
    })

    await expect(compiler({
      skillName: 'other-video-prompt', rawPrompt: 'x', mode: 'text_to_video', incomingAssets: [], nodeParams: {},
      activeWorkspace: root, compilerModelId: 22,
    })).rejects.toThrow(expect.objectContaining({ code: 'SKILL_MODE_INCOMPATIBLE' }))
    expect(JSON.stringify(requests[0].messages[1].content)).not.toContain('REFERENCE MODE HINT')
  })

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
    const compiler = createPromptCompiler({ registry: { resolve: async () => ({ ...skill(root), arguments: [{ name: 'style' }, { name: 'token' }] }) } as any, readModels: async () => [{ id: 10, model_name: 'chat', provider: 'x', display_name: 'chat', capabilities: { chat: true, vision: true } } as any], executeWithRuntimeModel: async (_w, req) => { request = req; return { content: JSON.stringify({ skill_name: 'h3', skill_version: 'a'.repeat(40), mode: 'text_to_video', prompt: 'ok', negative_prompt: '', parameters: {}, references_used: [], warnings: [] }) } } })
    await compiler({ skillName: 'h3', rawPrompt: `${root}/private ${encodeURIComponent(root).toLowerCase()}/private access_token=RAW_SECRET auth=RAW_AUTH signature=RAW_SIGNATURE sk-test-secret-token activeWorkspace`, mode: 'text_to_video', incomingAssets: [{ type: 'prompt', content: `Bearer abc ${encodeURIComponent(root)}` }, { type: 'image', url: `https://x/a.png?access_token=secret&auth=secret2&signature=secret3&sig=secret4&X-Amz-Credential=secret5&workspace=${encodeURIComponent(root)}` }], nodeParams: { cameraParams: { api_key: 'sk-another-secret', access_token: 'access-secret', auth: 'auth-secret', activeWorkspace: root } }, arguments: { style: `${root}/style`, token: 'SECRET' }, activeWorkspace: root, compilerModelId: 10 })
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
    expect(serialized).not.toContain('SECRET')
    expect(serialized).not.toContain('RAW_SECRET')
    expect(serialized).not.toContain('RAW_AUTH')
    expect(serialized).not.toContain('RAW_SIGNATURE')
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
