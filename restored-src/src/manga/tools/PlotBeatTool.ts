import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { generatePlotBeat } from '../services/plotService.js'

const PLOT_BEAT_TOOL_NAME = 'PlotBeat'

const inputSchema = lazySchema(() =>
  z.strictObject({
    episodeId: z.string().min(1),
    title: z.string().min(1),
    premise: z.string().min(1),
    beatFramework: z.enum(['three-act', 'five-act']).optional(),
    targetLength: z.number().int().positive().optional(),
  }),
)

type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    episodeJsonPath: z.string(),
    scriptPath: z.string(),
    beatCount: z.number().int().nonnegative(),
    sceneCount: z.number().int().nonnegative(),
  }),
)

type OutputSchema = ReturnType<typeof outputSchema>

type Output = z.infer<OutputSchema>

export const PlotBeatTool = buildTool({
  name: PLOT_BEAT_TOOL_NAME,
  searchHint: 'generate episode beats and scene outline',
  maxResultSizeChars: 100_000,
  async description() {
    return 'Generate episode beat structure and scene outline from a premise.'
  },
  async prompt() {
    return 'Use this tool to create episode beats/scenes and write script scaffold files.'
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
    return 'PlotBeat'
  },
  renderToolUseMessage() {
    return null
  },
  toAutoClassifierInput(input) {
    return `${input.episodeId} ${input.beatFramework ?? 'three-act'}`
  },
  async call(input) {
    const result = await generatePlotBeat(input)
    return {
      data: {
        episodeJsonPath: result.episodeJsonPath,
        scriptPath: result.scriptPath,
        beatCount: result.episode.beats.length,
        sceneCount: result.episode.scenes.length,
      },
    }
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    const data = content as Output
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: [
        `Plot beat generated`,
        `Episode JSON: ${data.episodeJsonPath}`,
        `Script: ${data.scriptPath}`,
        `Beats: ${data.beatCount}`,
        `Scenes: ${data.sceneCount}`,
      ].join('\n'),
    }
  },
} satisfies ToolDef<InputSchema, Output>)
