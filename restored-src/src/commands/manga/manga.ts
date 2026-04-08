import { getCwd } from '../../utils/cwd.js'
import type { LocalCommandResult, ToolUseContext } from '../../types/command.js'
import { initializeStoryProject } from '../../manga/services/fileStore.js'
import { getStoryProjectPaths } from '../../manga/services/projectPaths.js'

function helpText(): string {
  return [
    'Usage: /manga <init|status|help>',
    '',
    '  init   Initialize .story-project workspace',
    '  status Show workspace paths',
    '  help   Show this message',
  ].join('\n')
}

export async function call(
  args: string,
  _context: ToolUseContext,
): Promise<LocalCommandResult> {
  const sub = args.trim().split(/\s+/).filter(Boolean)[0] ?? 'help'

  if (sub === 'help') {
    return { type: 'text', value: helpText() }
  }

  if (sub === 'init') {
    const paths = await initializeStoryProject(getCwd())
    return {
      type: 'text',
      value: [
        'Manga workspace initialized.',
        `Root: ${paths.rootDir}`,
        `Characters: ${paths.charactersDir}`,
        `Episodes: ${paths.episodesDir}`,
      ].join('\n'),
    }
  }

  if (sub === 'status') {
    const paths = getStoryProjectPaths(getCwd())
    return {
      type: 'text',
      value: [
        'Manga workspace status:',
        `Root: ${paths.rootDir}`,
        `Series: ${paths.seriesFile}`,
        `Style Guide: ${paths.styleGuideFile}`,
        `Characters: ${paths.charactersDir}`,
        `Episodes: ${paths.episodesDir}`,
      ].join('\n'),
    }
  }

  return {
    type: 'text',
    value: `Unknown subcommand: ${sub}\n\n${helpText()}`,
  }
}
