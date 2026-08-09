import { lstat, mkdir, readFile, realpath, rename, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { join, resolve } from 'node:path'

export type SkillSettings = { skill_compiler_model_id: number | null }
const DEFAULT_SETTINGS: SkillSettings = { skill_compiler_model_id: null }

function settingsPath(workspace: string): string { return join(resolve(workspace), '.mangaforge', 'skill-settings.json') }

async function assertNoSymlinkComponents(path: string): Promise<string> {
  const absolute = resolve(path)
  const info = await lstat(absolute)
  if (info.isSymbolicLink()) throw new TypeError(`Symlink path component is not allowed: ${absolute}`)
  return realpath(absolute)
}

export async function readSkillSettings(workspace: string): Promise<SkillSettings> {
  try {
    const path = settingsPath(workspace)
    await assertNoSymlinkComponents(resolve(workspace))
    const directoryInfo = await lstat(join(resolve(workspace), '.mangaforge')).catch(() => undefined)
    if (directoryInfo?.isSymbolicLink()) return { ...DEFAULT_SETTINGS }
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
  const workspaceRoot = resolve(workspace)
  await assertNoSymlinkComponents(workspaceRoot)
  const directory = join(workspaceRoot, '.mangaforge')
  try {
    const info = await lstat(directory)
    if (info.isSymbolicLink() || !info.isDirectory()) throw new TypeError('Skill settings directory is not a regular directory')
  } catch (error: any) {
    if (error?.code !== 'ENOENT') throw error
    await mkdir(directory)
  }
  const target = join(directory, 'skill-settings.json')
  try {
    const info = await lstat(target)
    if (info.isSymbolicLink() || !info.isFile()) throw new TypeError('skill-settings.json must be a regular file')
  } catch (error: any) {
    if (error?.code !== 'ENOENT') throw error
  }
  const temporary = join(directory, `.skill-settings.${process.pid}.${randomBytes(6).toString('hex')}.tmp`)
  try {
    await lstat(temporary)
    throw new TypeError('temporary Skill settings path already exists')
  } catch (error: any) {
    if (error?.code !== 'ENOENT') throw error
  }
  await writeFile(temporary, `${JSON.stringify({ skill_compiler_model_id: skillCompilerModelId }, null, 2)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
  await rename(temporary, target)
  return { skill_compiler_model_id: skillCompilerModelId }
}
