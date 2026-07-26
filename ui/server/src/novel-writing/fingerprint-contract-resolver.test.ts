import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { resolveFingerprintContract, resolveFingerprintContractInfo } from './fingerprint-contract-resolver'

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
})
