import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { generatePromptPack } from '../services/promptService.js'

const PROMPT_PACK_TOOL_NAME = 'PromptPack'

const inputSchema = lazySchema(() =>
  z.strictObject({
    episodeId: z.string().min(1),
    stylePreset: z.string().min(1),
    consistencyLevel: z.enum(['low', 'medium', 'high']).optional(),
  }),
)

type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    promptPackPath: z.string(),
    promptMarkdownPath: z.string(),
    shotCount: z.number().int().nonnegative(),
  }),
)

type OutputSchema = ReturnType<typeof outputSchema>

type Output = z.infer<OutputSchema>

export const PromptPackTool = buildTool({
  name: PROMPT_PACK_TOOL_NAME,
  searchHint: 'generate image prompt packs from storyboard shots',
  maxResultSizeChars: 100_000,
  async description() {
    return 'Generate per-shot image prompts from an episode storyboard.'
  },
  async prompt() {
    return 'Use this tool after storyboard generation to create prompts json and markdown files.'
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  isConcurrencySafe() {
    return false
  },
  isReadOnly() {
    return false
  },
  userFacingName() {
    return 'PromptPack'
  },
  renderToolUseMessage() {
    return null
  },
  toAutoClassifierInput(input) {
    return `${input.episodeId} ${input.stylePreset}`
  },
  async call(input) {
    const result = await generatePromptPack(input)
    return { data: result }
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    const data = content as Output
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: [
        'Prompt pack generated',
        `Prompt JSON: ${data.promptPackPath}`,
        `Prompt Markdown: ${data.promptMarkdownPath}`,
        `Shots: ${data.shotCount}`,
      ].join('\n'),
    }
  },
} satisfies ToolDef<InputSchema, Output>)
