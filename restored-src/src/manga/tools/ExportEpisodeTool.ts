import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { SUPPORTED_EXPORT_FORMATS } from '../constants.js'
import { exportEpisode } from '../services/exportService.js'

const EXPORT_EPISODE_TOOL_NAME = 'ExportEpisode'

const inputSchema = lazySchema(() =>
  z.strictObject({
    episodeId: z.string().min(1),
    format: z.enum(SUPPORTED_EXPORT_FORMATS),
    includePrompts: z.boolean().default(true),
    includeDialogue: z.boolean().default(true),
  }),
)

type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    episodeId: z.string().min(1),
    format: z.enum(SUPPORTED_EXPORT_FORMATS),
    outputPath: z.string().min(1),
    generatedAt: z.string().datetime(),
  }),
)

type OutputSchema = ReturnType<typeof outputSchema>

type Output = z.infer<OutputSchema>

export const ExportEpisodeTool = buildTool({
  name: EXPORT_EPISODE_TOOL_NAME,
  searchHint: 'export episode production files',
  maxResultSizeChars: 100_000,
  async description() {
    return 'Export episode assets from storyboard data into production-ready files.'
  },
  async prompt() {
    return 'Use this tool to export storyboard episode data to json/md/csv formats.'
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
    return 'ExportEpisode'
  },
  renderToolUseMessage() {
    return null
  },
  toAutoClassifierInput(input) {
    return `${input.episodeId}.${input.format}`
  },
  async call(input) {
    const result = await exportEpisode(input)
    return { data: result }
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    const data = content as Output
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: `Export completed\nEpisode: ${data.episodeId}\nFormat: ${data.format}\nPath: ${data.outputPath}`,
    }
  },
} satisfies ToolDef<InputSchema, Output>)
