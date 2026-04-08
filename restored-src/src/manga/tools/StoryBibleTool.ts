import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { CharacterSchema } from '../schemas/character.js'
import { createOrUpdateStoryBible } from '../services/bibleService.js'

const STORY_BIBLE_TOOL_NAME = 'StoryBible'

const inputSchema = lazySchema(() =>
  z.strictObject({
    seriesTitle: z.string().min(1),
    genre: z.string().min(1),
    tone: z.string().min(1),
    themes: z.array(z.string().min(1)).optional(),
    targetAudience: z.string().optional(),
    styleGuide: z.string().optional(),
    characters: z.array(CharacterSchema).min(1),
  }),
)

type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    seriesPath: z.string(),
    styleGuidePath: z.string(),
    characterPaths: z.array(z.string()),
  }),
)

type OutputSchema = ReturnType<typeof outputSchema>

type Output = z.infer<OutputSchema>

export const StoryBibleTool = buildTool({
  name: STORY_BIBLE_TOOL_NAME,
  searchHint: 'create and update series bible',
  maxResultSizeChars: 100_000,
  async description() {
    return 'Create or update manga series bible files, including character cards.'
  },
  async prompt() {
    return 'Use this tool to initialize or update .story-project series and character bible files.'
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
    return 'StoryBible'
  },
  renderToolUseMessage() {
    return null
  },
  toAutoClassifierInput(input) {
    return `${input.seriesTitle} (${input.characters.length} characters)`
  },
  async call(input) {
    const result = await createOrUpdateStoryBible(input)
    return { data: result }
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    const data = content as Output
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: [
        `Story bible updated.`,
        `Series: ${data.seriesPath}`,
        `Style Guide: ${data.styleGuidePath}`,
        `Characters: ${data.characterPaths.length}`,
      ].join('\n'),
    }
  },
} satisfies ToolDef<InputSchema, Output>)
