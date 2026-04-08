import { join } from 'path'
import {
  STORY_PROJECT_DIR,
  STORY_PROJECT_PATHS,
} from '../constants.js'

export type StoryProjectPaths = {
  rootDir: string
  seriesFile: string
  styleGuideFile: string
  charactersDir: string
  episodesDir: string
}

export function getStoryProjectRoot(baseDir?: string): string {
  return join(baseDir ?? process.cwd(), STORY_PROJECT_DIR)
}

export function getStoryProjectPaths(baseDir?: string): StoryProjectPaths {
  const rootDir = getStoryProjectRoot(baseDir)

  return {
    rootDir,
    seriesFile: join(rootDir, STORY_PROJECT_PATHS.seriesFile),
    styleGuideFile: join(rootDir, STORY_PROJECT_PATHS.styleGuideFile),
    charactersDir: join(rootDir, STORY_PROJECT_PATHS.charactersDir),
    episodesDir: join(rootDir, STORY_PROJECT_PATHS.episodesDir),
  }
}

export function getCharacterFilePath(characterId: string, baseDir?: string): string {
  const paths = getStoryProjectPaths(baseDir)
  return join(paths.charactersDir, `${characterId}.yaml`)
}

export function getEpisodeScriptPath(episodeId: string, baseDir?: string): string {
  const paths = getStoryProjectPaths(baseDir)
  return join(paths.episodesDir, `${episodeId}.script.md`)
}

export function getEpisodeStoryboardPath(
  episodeId: string,
  baseDir?: string,
): string {
  const paths = getStoryProjectPaths(baseDir)
  return join(paths.episodesDir, `${episodeId}.storyboard.json`)
}

export function getEpisodeExportPath(
  episodeId: string,
  extension: 'json' | 'md' | 'csv' | 'zip',
  baseDir?: string,
): string {
  const paths = getStoryProjectPaths(baseDir)
  return join(paths.episodesDir, `${episodeId}.export.${extension}`)
}
