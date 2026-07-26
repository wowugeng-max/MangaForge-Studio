import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises'
import { join, resolve } from 'path'
import { tmpdir } from 'os'
import {
  resolveFingerprintContract,
  resolveFingerprintContractInfo,
  resolveFingerprintLibRoots,
} from './fingerprint-contract-resolver'
import { BUILTIN_CONTRACT_SET, getContractSetsIndexPath } from '../fingerprint-contract-store'

let dirs: string[] = []

function contractJson(name: string, taMax: number) {
  return JSON.stringify({
    version: 1,
    name,
    built_from: ['s1'],
    target: {
      cv_para: [0.5, 0.7],
      single_sentence_para_ratio: [0.8, 0.97],
      two_sentence_para_ratio: [0.02, 0.15],
      dialogue_para_ratio: [0.1, 0.33],
      max_mid_streak_max: 6,
      template_contrast_per_1k_max: 1,
      stock_adverb_per_1k_max: 1.5,
      clinical_hit_per_1k_max: 0.5,
      subject_ta_opener_ratio_max: taMax,
    },
    avoid: ['a'],
    prefer: ['p'],
    prompt_directives: [`他/姓名起句占比 ≤${taMax}；优先物件/触感/半截对白起句。`],
  })
}

/** 造一个假仓库：<root>/ui/server 作为 cwd，<root>/workspace/fingerprint-lib 作为库。 */
async function tempRepo() {
  const root = await mkdtemp(join(tmpdir(), 'mangaforge-fp-resolver-'))
  dirs.push(root)
  const cwd = join(root, 'ui', 'server')
  const lib = join(root, 'workspace', 'fingerprint-lib')
  await mkdir(cwd, { recursive: true })
  await mkdir(join(lib, 'contracts', 'by-genre'), { recursive: true })
  await writeFile(join(lib, 'contracts', 'active-contract.json'), contractJson('builtin_global', 0.35), 'utf8')
  await writeFile(join(lib, 'contracts', 'by-genre', 'urban.json'), contractJson('builtin_urban', 0.3), 'utf8')
  return { root, cwd, lib }
}

afterEach(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })))
  dirs = []
})

describe('fingerprint contract resolver', () => {
  test('defaults to the builtin global contract when no selection exists', async () => {
    const { cwd } = await tempRepo()
    expect(resolveFingerprintContract({ cwd })?.name).toBe('builtin_global')
    const info = resolveFingerprintContractInfo({ cwd })
    expect(info?.set_id).toBe('builtin')
    expect(info?.locked).toBe(false)
  })

  test('uses the selected set global contract', async () => {
    const { cwd, lib } = await tempRepo()
    await mkdir(join(lib, 'contract-sets', 'set-a'), { recursive: true })
    await writeFile(join(lib, 'contract-sets', 'set-a', 'active-contract.json'), contractJson('set_a_global', 0.4), 'utf8')
    await writeFile(join(lib, 'contract-selection.json'), JSON.stringify({ active_set_id: 'set-a' }), 'utf8')
    expect(resolveFingerprintContract({ cwd })?.name).toBe('set_a_global')
    expect(resolveFingerprintContractInfo({ cwd })?.set_id).toBe('set-a')
  })

  test('genre picks the per-genre contract inside the active set', async () => {
    const { cwd } = await tempRepo()
    expect(resolveFingerprintContract({ cwd, genre: '都市' })?.name).toBe('builtin_urban')
  })

  test('locked contract overrides genre selection', async () => {
    const { cwd, lib } = await tempRepo()
    await writeFile(
      join(lib, 'contract-selection.json'),
      JSON.stringify({ active_set_id: 'builtin', locked: { set_id: 'builtin', key: 'active' } }),
      'utf8',
    )
    expect(resolveFingerprintContract({ cwd, genre: '都市' })?.name).toBe('builtin_global')
    expect(resolveFingerprintContractInfo({ cwd })?.locked).toBe(true)
  })

  test('falls back to builtin when the selected set is missing', async () => {
    const { cwd, lib } = await tempRepo()
    await writeFile(join(lib, 'contract-selection.json'), JSON.stringify({ active_set_id: 'ghost-set' }), 'utf8')
    expect(resolveFingerprintContract({ cwd })?.name).toBe('builtin_global')
    expect(resolveFingerprintContractInfo({ cwd })?.set_id).toBe('builtin')
  })

  test('returns null when nothing is resolvable', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'mangaforge-fp-empty-'))
    dirs.push(empty)
    expect(resolveFingerprintContract({ cwd: empty })).toBe(null)
    expect(resolveFingerprintContractInfo({ cwd: empty })).toBe(null)
  })

  test('locked set that does not exist falls back to the active set and reports locked=false', async () => {
    const { cwd, lib } = await tempRepo()
    await mkdir(join(lib, 'contract-sets', 'set-a'), { recursive: true })
    await writeFile(join(lib, 'contract-sets', 'set-a', 'active-contract.json'), contractJson('set_a_global', 0.4), 'utf8')
    await writeFile(
      join(lib, 'contract-selection.json'),
      JSON.stringify({ active_set_id: 'set-a', locked: { set_id: 'ghost-set', key: 'active' } }),
      'utf8',
    )
    const info = resolveFingerprintContractInfo({ cwd })
    expect(info?.contract_name).toBe('set_a_global')
    expect(info?.set_id).toBe('set-a')
    expect(info?.locked).toBe(false)
  })

  test('locked genre file missing falls back to the same locked set global contract, not active_set_id', async () => {
    const { cwd, lib } = await tempRepo()
    await mkdir(join(lib, 'contract-sets', 'set-a'), { recursive: true })
    await writeFile(join(lib, 'contract-sets', 'set-a', 'active-contract.json'), contractJson('set_a_global', 0.4), 'utf8')
    await writeFile(
      join(lib, 'contract-selection.json'),
      JSON.stringify({ active_set_id: 'builtin', locked: { set_id: 'set-a', key: 'urban' } }),
      'utf8',
    )
    const info = resolveFingerprintContractInfo({ cwd })
    expect(info?.contract_name).toBe('set_a_global')
    expect(info?.set_id).toBe('set-a')
    expect(info?.locked).toBe(true)
  })

  test('locked genre file that exists is used and reported as locked', async () => {
    const { cwd, lib } = await tempRepo()
    await mkdir(join(lib, 'contract-sets', 'set-a', 'by-genre'), { recursive: true })
    await writeFile(join(lib, 'contract-sets', 'set-a', 'active-contract.json'), contractJson('set_a_global', 0.4), 'utf8')
    await writeFile(join(lib, 'contract-sets', 'set-a', 'by-genre', 'urban.json'), contractJson('set_a_urban', 0.25), 'utf8')
    await writeFile(
      join(lib, 'contract-selection.json'),
      JSON.stringify({ active_set_id: 'builtin', locked: { set_id: 'set-a', key: 'urban' } }),
      'utf8',
    )
    const info = resolveFingerprintContractInfo({ cwd })
    expect(info?.contract_name).toBe('set_a_urban')
    expect(info?.set_id).toBe('set-a')
    expect(info?.locked).toBe(true)
    expect(info?.genre_slug).toBe('urban')
  })

  test('reports genre_slug as null when falling back to the global contract because the genre file is missing', async () => {
    const { cwd, lib } = await tempRepo()
    await mkdir(join(lib, 'contract-sets', 'set-a'), { recursive: true })
    await writeFile(join(lib, 'contract-sets', 'set-a', 'active-contract.json'), contractJson('set_a_global', 0.4), 'utf8')
    await writeFile(join(lib, 'contract-selection.json'), JSON.stringify({ active_set_id: 'set-a' }), 'utf8')
    const info = resolveFingerprintContractInfo({ cwd, genre: '都市' })
    expect(info?.contract_name).toBe('set_a_global')
    expect(info?.genre_slug).toBe(null)
  })

  test('reports the resolved genre slug when a genre-specific contract is actually used', async () => {
    const { cwd } = await tempRepo()
    const info = resolveFingerprintContractInfo({ cwd, genre: '都市' })
    expect(info?.contract_name).toBe('builtin_urban')
    expect(info?.genre_slug).toBe('urban')
  })

  test('set_label defaults to the builtin label when no selection exists', async () => {
    const { cwd } = await tempRepo()
    const info = resolveFingerprintContractInfo({ cwd })
    expect(info?.set_id).toBe('builtin')
    expect(info?.set_label).toBe(BUILTIN_CONTRACT_SET.label)
  })

  test('set_label reflects the registered label of the active custom contract set', async () => {
    const { cwd, lib } = await tempRepo()
    await mkdir(join(lib, 'contract-sets', 'set-a'), { recursive: true })
    await writeFile(join(lib, 'contract-sets', 'set-a', 'active-contract.json'), contractJson('set_a_global', 0.4), 'utf8')
    await writeFile(
      getContractSetsIndexPath(lib),
      JSON.stringify([{ id: 'set-a', label: '离线重拟合 A' }]),
      'utf8',
    )
    await writeFile(join(lib, 'contract-selection.json'), JSON.stringify({ active_set_id: 'set-a' }), 'utf8')
    const info = resolveFingerprintContractInfo({ cwd })
    expect(info?.set_id).toBe('set-a')
    expect(info?.set_label).toBe('离线重拟合 A')
  })

  test('resolveFingerprintLibRoots does not add the active workspace when cwd is passed explicitly', async () => {
    const { cwd } = await tempRepo()
    const roots = resolveFingerprintLibRoots(cwd)
    expect(roots[0]).toBe(resolve(cwd, '../../workspace/fingerprint-lib'))
    expect(roots).toEqual([
      resolve(cwd, '../../workspace/fingerprint-lib'),
      resolve(cwd, '../../../workspace/fingerprint-lib'),
      resolve(cwd, 'workspace/fingerprint-lib'),
    ])
  })
})
