import { lstat, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { join, resolve } from 'node:path'

export type SkillSettings = { skill_compiler_model_id: number | null }
const DEFAULT_SETTINGS: SkillSettings = { skill_compiler_model_id: null }

function settingsPath(workspace: string): string { return join(resolve(workspace), '.mangaforge', 'skill-settings.json') }

export async function readSkillSettings(workspace: string): Promise<SkillSettings> {
  try {
    const path = settingsPath(workspace)
    if ((await lstat(path)).isSymbolicLink()) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>
    const value = parsed?.skill_compiler_model_id
    if (value === null || value === undefined) return { ...DEFAULT_SETTINGS }
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return { skill_compiler_model_id: value }
    return { ...DEFAULT_SETTINGS }
  } catch { return { ...DEFAULT_SETTINGS } }
}

export async function writeSkillSettings(workspace: string, skillCompilerModelId: number | null): Promise<SkillSettings> {
  if (skillCompilerModelId !== null && (!Number.isSafeInteger(skillCompilerModelId) || skillCompilerModelId < 0)) throw new TypeError('skill_compiler_model_id must be a non-negative integer or null')
  const directory = join(resolve(workspace), '.mangaforge')
  await mkdir(directory, { recursive: true })
  const target = join(directory, 'skill-settings.json')
  try {
    if ((await lstat(target)).isSymbolicLink()) throw new TypeError('skill-settings.json may not be a symlink')
  } catch (error: any) {
    if (error?.code !== 'ENOENT') throw error
  }
  const temporary = join(directory, `.skill-settings.${process.pid}.${randomBytes(6).toString('hex')}.tmp`)
  await writeFile(temporary, `${JSON.stringify({ skill_compiler_model_id: skillCompilerModelId }, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  await rename(temporary, target)
  return { skill_compiler_model_id: skillCompilerModelId }
}
