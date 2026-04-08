import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { EpisodeSceneSchema } from '../schemas/episode.js'
import { generateStoryboard } from '../services/storyboardService.js'

const STORYBOARD_TOOL_NAME = 'Storyboard'

const inputSchema = lazySchema(() =>
  z.strictObject({
    episodeId: z.string().min(1),
    title: z.string().min(1),
    scenes: z.array(EpisodeSceneSchema).default([]),
    panelTarget: z.number().int().positive().optional(),
    stylePreset: z.string().optional(),
  }),
)

type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    storyboardPath: z.string(),
    shotCount: z.number().int().nonnegative(),
  }),
)

type OutputSchema = ReturnType<typeof outputSchema>

type Output = z.infer<OutputSchema>

export const StoryboardTool = buildTool({
  name: STORYBOARD_TOOL_NAME,
  searchHint: 'generate structured episode storyboard',
  maxResultSizeChars: 100_000,
  async description() {
    return 'Generate a storyboard JSON file for a manga episode.'
  },
  async prompt() {
    return 'Use this tool to transform episode scene summaries into shot-level storyboard JSON.'
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
    return 'Storyboard'
  },
  renderToolUseMessage() {
    return null
  },
  toAutoClassifierInput(input) {
    return `${input.episodeId} panels:${input.panelTarget ?? 12}`
  },
  async call(input) {
    const result = await generateStoryboard(input)
    return {
      data: {
        storyboardPath: result.storyboardPath,
        shotCount: result.shotCount,
      },
    }
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    const data = content as Output
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: `Storyboard generated\nPath: ${data.storyboardPath}\nShots: ${data.shotCount}`,
    }
  },
} satisfies ToolDef<InputSchema, Output>)
