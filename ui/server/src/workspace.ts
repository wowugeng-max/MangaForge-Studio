import { mkdir, readFile, writeFile, access } from 'fs/promises'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

export function getServerRoot() {
  // Use the actual file location instead of process.cwd(),
  // because bun/node resolves cwd from the shell, not from the script path.
  const __dirname = dirname(fileURLToPath(import.meta.url))
  return resolve(__dirname, '..')
}

export function getDefaultWorkspace() {
  return resolve(getServerRoot(), '..', '..', 'workspace')
}

export function getWorkspaceConfigPath() {
  return join(getServerRoot(), '.workspace-config.json')
}

export function getTemplateStorePath() {
  return join(getServerRoot(), '.templates.json')
}

export async function ensureWorkspaceStructure(activeWorkspace: string) {
  const storyRoot = join(activeWorkspace, '.story-project')
  const episodesDir = join(storyRoot, 'episodes')
  await mkdir(activeWorkspace, { recursive: true })
  await mkdir(storyRoot, { recursive: true })
  await mkdir(episodesDir, { recursive: true })
}

export async function loadActiveWorkspace(): Promise<string> {
  const workspaceConfigPath = getWorkspaceConfigPath()
  const defaultWorkspace = getDefaultWorkspace()
  try {
    const raw = await readFile(workspaceConfigPath, 'utf8')
    const data = JSON.parse(raw) as { activeWorkspace?: string }
    if (!data.activeWorkspace) return defaultWorkspace
    try {
      await access(data.activeWorkspace)
      return data.activeWorkspace
    } catch {
      return defaultWorkspace
    }
  } catch {
    return defaultWorkspace
  }
}

export async function saveActiveWorkspace(activeWorkspace: string) {
  await writeFile(getWorkspaceConfigPath(), `${JSON.stringify({ activeWorkspace }, null, 2)}\n`, 'utf8')
}
