import { CharacterSchema, type Character } from '../schemas/character.js'
import {
  initializeStoryProject,
  writeMarkdownFile,
  writeYamlFile,
} from './fileStore.js'
import {
  getCharacterFilePath,
  getStoryProjectPaths,
} from './projectPaths.js'

export type SeriesBible = {
  seriesTitle: string
  genre: string
  tone: string
  themes: string[]
  targetAudience?: string
  updatedAt: string
}

export type CreateStoryBibleInput = {
  seriesTitle: string
  genre: string
  tone: string
  themes?: string[]
  targetAudience?: string
  styleGuide?: string
  characters: Character[]
  baseDir?: string
}

export type CreateStoryBibleResult = {
  seriesPath: string
  styleGuidePath: string
  characterPaths: string[]
}

export async function createOrUpdateStoryBible(
  input: CreateStoryBibleInput,
): Promise<CreateStoryBibleResult> {
  const paths = await initializeStoryProject(input.baseDir)

  const now = new Date().toISOString()
  const series: SeriesBible = {
    seriesTitle: input.seriesTitle,
    genre: input.genre,
    tone: input.tone,
    themes: input.themes ?? [],
    targetAudience: input.targetAudience,
    updatedAt: now,
  }

  await writeYamlFile(paths.seriesFile, series)

  const styleGuide =
    input.styleGuide ??
    [`# ${input.seriesTitle} Style Guide`, '', '- Visual Tone:', '- Character Consistency:', '- Panel Rhythm:'].join('\n')
  await writeMarkdownFile(paths.styleGuideFile, `${styleGuide}\n`)

  const characterPaths: string[] = []
  for (const draft of input.characters) {
    const character = CharacterSchema.parse(draft)
    const filePath = getCharacterFilePath(character.id, input.baseDir)
    await writeYamlFile(filePath, character)
    characterPaths.push(filePath)
  }

  return {
    seriesPath: getStoryProjectPaths(input.baseDir).seriesFile,
    styleGuidePath: getStoryProjectPaths(input.baseDir).styleGuideFile,
    characterPaths,
  }
}
