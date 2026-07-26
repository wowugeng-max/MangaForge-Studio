import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  BUILTIN_CONTRACT_SET,
  getContractSetDir,
  getContractSetsIndexPath,
  getContractSelectionPath,
  getFingerprintLibRoot,
  getFingerprintLibRootFromWorkspace,
  normalizeContractSetRecord,
  readContractSelection,
  readContractSelectionSync,
  readContractSets,
  readContractSetsSync,
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

  test('readContractSets assigns distinct ids to multiple records missing an id', async () => {
    const lib = await tempLib()
    await mkdir(join(lib, 'contract-sets'), { recursive: true })
    await writeFile(
      getContractSetsIndexPath(lib),
      JSON.stringify([{ label: 'legacy A' }, { label: 'legacy B' }, { label: 'legacy C' }]),
      'utf8',
    )
    // Freeze Date.now so a timestamp-based id fallback would deterministically
    // collide across all three records processed within the same map() call.
    const originalNow = Date.now
    Date.now = () => 1234567890000
    try {
      const sets = await readContractSets(lib)
      const nonBuiltinIds = sets.filter((s) => s.id !== BUILTIN_CONTRACT_SET.id).map((s) => s.id)
      expect(nonBuiltinIds.length).toBe(3)
      expect(new Set(nonBuiltinIds).size).toBe(3)
    } finally {
      Date.now = originalNow
    }
  })

  test('writeContractSets dedupes records sharing an id, keeping the later one', async () => {
    const lib = await tempLib()
    await writeContractSets(lib, [
      normalizeContractSetRecord({ id: 'set-dup', label: 'first', sample_count: 1 }),
      normalizeContractSetRecord({ id: 'set-dup', label: 'second', sample_count: 2 }),
    ])
    const raw = JSON.parse(await readFile(getContractSetsIndexPath(lib), 'utf8'))
    expect(raw.length).toBe(1)
    expect(raw[0].id).toBe('set-dup')
    expect(raw[0].label).toBe('second')
    expect(raw[0].sample_count).toBe(2)
  })

  test('writeContractSets keeps records missing an id instead of dropping them', async () => {
    const lib = await tempLib()
    await writeContractSets(lib, [{ label: 'no id yet' } as any])
    const raw = JSON.parse(await readFile(getContractSetsIndexPath(lib), 'utf8'))
    expect(raw.length).toBe(1)
    expect(typeof raw[0].id).toBe('string')
    expect(raw[0].id.length).toBeGreaterThan(0)
  })

  test('writeContractSets persists an empty array for null/undefined entries', async () => {
    const lib = await tempLib()
    await writeContractSets(lib, [null, undefined] as any)
    const raw = JSON.parse(await readFile(getContractSetsIndexPath(lib), 'utf8'))
    expect(raw).toEqual([])
  })

  test('writeContractSets drops null entries but still keeps a valid record and an id-less one', async () => {
    const lib = await tempLib()
    await writeContractSets(lib, [
      normalizeContractSetRecord({ id: 'set-valid', label: 'Valid' }),
      null,
      { label: 'no id yet' },
    ] as any)
    const raw = JSON.parse(await readFile(getContractSetsIndexPath(lib), 'utf8'))
    expect(raw.length).toBe(2)
    const valid = raw.find((r: any) => r.id === 'set-valid')
    expect(valid?.label).toBe('Valid')
    const idLess = raw.find((r: any) => r.id !== 'set-valid')
    expect(typeof idLess?.id).toBe('string')
    expect(idLess?.id.length).toBeGreaterThan(0)
    expect(idLess?.label).toBe('no id yet')
  })

  test('writeContractSets drops non-object entries like strings and numbers', async () => {
    const lib = await tempLib()
    await writeContractSets(lib, ['garbage', 42] as any)
    const raw = JSON.parse(await readFile(getContractSetsIndexPath(lib), 'utf8'))
    expect(raw).toEqual([])
  })

  test('writeContractSets drops array entries instead of turning them into ghost records', async () => {
    const lib = await tempLib()
    await writeContractSets(lib, [[1, 2, 3]] as any)
    const raw = JSON.parse(await readFile(getContractSetsIndexPath(lib), 'utf8'))
    expect(raw).toEqual([])
  })

  test('readContractSets drops non-object stored entries instead of turning them into ghost records', async () => {
    const lib = await tempLib()
    await mkdir(join(lib, 'contract-sets'), { recursive: true })
    await writeFile(
      getContractSetsIndexPath(lib),
      JSON.stringify([null, 'garbage', 42, [1, 2, 3]]),
      'utf8',
    )
    const sets = await readContractSets(lib)
    expect(sets.length).toBe(1)
    expect(sets[0].id).toBe(BUILTIN_CONTRACT_SET.id)
  })

  test('readContractSets keeps valid stored records while dropping null entries among them', async () => {
    const lib = await tempLib()
    await mkdir(join(lib, 'contract-sets'), { recursive: true })
    await writeFile(
      getContractSetsIndexPath(lib),
      JSON.stringify([{ id: 'set-valid', label: 'Valid' }, null, { label: 'no id yet' }]),
      'utf8',
    )
    const sets = await readContractSets(lib)
    const nonBuiltin = sets.filter((s) => s.id !== BUILTIN_CONTRACT_SET.id)
    expect(nonBuiltin.length).toBe(2)
    const valid = nonBuiltin.find((s) => s.id === 'set-valid')
    expect(valid?.label).toBe('Valid')
    const idLess = nonBuiltin.find((s) => s.id !== 'set-valid')
    expect(typeof idLess?.id).toBe('string')
    expect(idLess?.id.length).toBeGreaterThan(0)
    expect(idLess?.label).toBe('no id yet')
  })

  test('source_set_id round-trips through write and read', async () => {
    const lib = await tempLib()
    await writeContractSets(lib, [
      normalizeContractSetRecord({ id: 'set-c', label: 'C', source_set_id: 'set-a' }),
    ])
    const sets = await readContractSets(lib)
    const found = sets.find((s) => s.id === 'set-c')
    expect(found?.source_set_id).toBe('set-a')
  })

  test('readContractSetsSync returns builtin first even when index is missing', async () => {
    const lib = await tempLib()
    const sets = readContractSetsSync(lib)
    expect(sets.length).toBe(1)
    expect(sets[0].id).toBe('builtin')
    expect(sets[0].mode).toBe('builtin')
  })

  test('readContractSetsSync keeps builtin first and normalizes stored records', async () => {
    const lib = await tempLib()
    await mkdir(join(lib, 'contract-sets'), { recursive: true })
    await writeFile(
      getContractSetsIndexPath(lib),
      JSON.stringify([{ id: 'set-a', label: '离线重拟合 A' }]),
      'utf8',
    )
    const sets = readContractSetsSync(lib)
    expect(sets.map((s) => s.id)).toEqual(['builtin', 'set-a'])
    expect(sets[1].mode).toBe('offline_refit')
    expect(sets[1].sample_count).toBe(0)
    expect(typeof sets[1].created_at).toBe('string')
  })

  test('readContractSetsSync drops non-object stored entries instead of turning them into ghost records', async () => {
    const lib = await tempLib()
    await mkdir(join(lib, 'contract-sets'), { recursive: true })
    await writeFile(
      getContractSetsIndexPath(lib),
      JSON.stringify([null, 'garbage', 42, [1, 2, 3]]),
      'utf8',
    )
    const sets = readContractSetsSync(lib)
    expect(sets.length).toBe(1)
    expect(sets[0].id).toBe(BUILTIN_CONTRACT_SET.id)
  })

  test('getFingerprintLibRoot joins workspace/fingerprint-lib under the repo root', () => {
    expect(getFingerprintLibRoot('/repo')).toBe(join('/repo', 'workspace', 'fingerprint-lib'))
  })

  test('getFingerprintLibRootFromWorkspace joins fingerprint-lib under the workspace dir', () => {
    expect(getFingerprintLibRootFromWorkspace('/repo/workspace')).toBe(join('/repo/workspace', 'fingerprint-lib'))
  })
})
