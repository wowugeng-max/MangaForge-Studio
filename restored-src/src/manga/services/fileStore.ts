import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname } from 'path'
import { parseYaml } from '../../utils/yaml.js'
import { getStoryProjectPaths, type StoryProjectPaths } from './projectPaths.js'

function stringifyYaml(value: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('yaml') as typeof import('yaml')).stringify(value)
}

async function ensureParentDir(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
}

export async function initializeStoryProject(
  baseDir?: string,
): Promise<StoryProjectPaths> {
  const paths = getStoryProjectPaths(baseDir)
  await mkdir(paths.rootDir, { recursive: true })
  await mkdir(paths.charactersDir, { recursive: true })
  await mkdir(paths.episodesDir, { recursive: true })
  return paths
}

export async function readYamlFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, 'utf8')
    return parseYaml(content) as T
  } catch {
    return null
  }
}

export async function writeYamlFile(
  filePath: string,
  data: unknown,
): Promise<void> {
  await ensureParentDir(filePath)
  await writeFile(filePath, stringifyYaml(data), 'utf8')
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, 'utf8')
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

export async function writeJsonFile(
  filePath: string,
  data: unknown,
): Promise<void> {
  await ensureParentDir(filePath)
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

export async function writeMarkdownFile(
  filePath: string,
  content: string,
): Promise<void> {
  await ensureParentDir(filePath)
  await writeFile(filePath, content, 'utf8')
}
