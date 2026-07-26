import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { getDefaultWorkspace, loadActiveWorkspaceSync } from './workspace'

let dirs: string[] = []

afterEach(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })))
  dirs = []
})

async function tempDir() {
  const dir = await mkdtemp(join(tmpdir(), 'mangaforge-workspace-sync-'))
  dirs.push(dir)
  return dir
}

describe('loadActiveWorkspaceSync', () => {
  test('falls back to the default workspace when the config file does not exist', async () => {
    const dir = await tempDir()
    const configPath = join(dir, 'missing.json')
    expect(loadActiveWorkspaceSync(configPath)).toBe(getDefaultWorkspace())
  })

  test('returns the configured active workspace when the config file is valid and the path exists', async () => {
    const dir = await tempDir()
    const workspace = join(dir, 'my-workspace')
    await mkdir(workspace, { recursive: true })
    const configPath = join(dir, 'config.json')
    await writeFile(configPath, JSON.stringify({ activeWorkspace: workspace }), 'utf8')
    expect(loadActiveWorkspaceSync(configPath)).toBe(workspace)
  })

  test('falls back to the default workspace when the config JSON is corrupt', async () => {
    const dir = await tempDir()
    const configPath = join(dir, 'config.json')
    await writeFile(configPath, '{ not valid json', 'utf8')
    expect(loadActiveWorkspaceSync(configPath)).toBe(getDefaultWorkspace())
  })

  test('falls back to the default workspace when activeWorkspace is missing from the config', async () => {
    const dir = await tempDir()
    const configPath = join(dir, 'config.json')
    await writeFile(configPath, JSON.stringify({}), 'utf8')
    expect(loadActiveWorkspaceSync(configPath)).toBe(getDefaultWorkspace())
  })

  test('falls back to the default workspace when the configured path does not exist', async () => {
    const dir = await tempDir()
    const configPath = join(dir, 'config.json')
    await writeFile(configPath, JSON.stringify({ activeWorkspace: join(dir, 'ghost') }), 'utf8')
    expect(loadActiveWorkspaceSync(configPath)).toBe(getDefaultWorkspace())
  })
})
