import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  BUILTIN_CONTRACT_SET,
  getContractSetDir,
  getContractSetsIndexPath,
  getContractSelectionPath,
  normalizeContractSetRecord,
  readContractSelection,
  readContractSelectionSync,
  readContractSets,
  writeContractSelection,
  writeContractSets,
} from './fingerprint-contract-store'

let dirs: string[] = []
async function tempLib() {
  const dir = await mkdtemp(join(tmpdir(), 'mangaforge-fp-store-'))
  dirs.push(dir)
  await mkdir(join(dir, 'contracts'), { recursive: true })
  return dir
}
afterEach(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })))
  dirs = []
})

describe('fingerprint contract store', () => {
  test('readContractSets returns builtin first even when index is missing', async () => {
    const lib = await tempLib()
    const sets = await readContractSets(lib)
    expect(sets.length).toBe(1)
    expect(sets[0].id).toBe('builtin')
    expect(sets[0].mode).toBe('builtin')
  })

  test('readContractSets keeps builtin first and normalizes stored records', async () => {
    const lib = await tempLib()
    await mkdir(join(lib, 'contract-sets'), { recursive: true })
    await writeFile(
      getContractSetsIndexPath(lib),
      JSON.stringify([{ id: 'set-a', label: '离线重拟合 A' }]),
      'utf8',
    )
    const sets = await readContractSets(lib)
    expect(sets.map((s) => s.id)).toEqual(['builtin', 'set-a'])
    expect(sets[1].mode).toBe('offline_refit')
    expect(sets[1].sample_count).toBe(0)
    expect(typeof sets[1].created_at).toBe('string')
  })

  test('writeContractSets never persists the builtin virtual entry', async () => {
    const lib = await tempLib()
    await writeContractSets(lib, [
      BUILTIN_CONTRACT_SET,
      normalizeContractSetRecord({ id: 'set-b', label: 'B', mode: 'online_fetch', sample_count: 12 }),
    ])
    const raw = JSON.parse(await readFile(getContractSetsIndexPath(lib), 'utf8'))
    expect(raw.map((r: any) => r.id)).toEqual(['set-b'])
  })

  test('selection defaults to builtin and round-trips through disk', async () => {
    const lib = await tempLib()
    expect((await readContractSelection(lib)).active_set_id).toBe('builtin')
    await writeContractSelection(lib, { active_set_id: 'set-a', locked: { set_id: 'set-a', key: 'active' } })
    const loaded = await readContractSelection(lib)
    expect(loaded.active_set_id).toBe('set-a')
    expect(loaded.locked).toEqual({ set_id: 'set-a', key: 'active' })
    expect(readContractSelectionSync(lib).active_set_id).toBe('set-a')
  })

  test('selection falls back to builtin when the file is corrupt', async () => {
    const lib = await tempLib()
    await writeFile(getContractSelectionPath(lib), '{ not json', 'utf8')
    expect((await readContractSelection(lib)).active_set_id).toBe('builtin')
    expect(readContractSelectionSync(lib).locked).toBe(null)
  })

  test('getContractSetDir points builtin at the tracked contracts dir', async () => {
    const lib = await tempLib()
    expect(getContractSetDir(lib, 'builtin')).toBe(join(lib, 'contracts'))
    expect(getContractSetDir(lib, 'set-a')).toBe(join(lib, 'contract-sets', 'set-a'))
  })
})
