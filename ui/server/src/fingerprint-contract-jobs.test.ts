import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  createFingerprintContractJob,
  getFingerprintContractJob,
  hasRunningFingerprintContractJob,
  loadRefitSamples,
  readSamplesStatus,
  resetFingerprintContractJobsForTest,
  runOfflineRefitJob,
} from './fingerprint-contract-jobs'
import { readContractSets } from './fingerprint-contract-store'

let dirs: string[] = []

function builtinContractJson() {
  return JSON.stringify({
    version: 1,
    name: 'qidian_free_rank_human',
    built_from: ['old'],
    target: {
      cv_para: [0.5, 0.7],
      single_sentence_para_ratio: [0.8, 0.97],
      two_sentence_para_ratio: [0.02, 0.15],
      dialogue_para_ratio: [0.1, 0.33],
      max_mid_streak_max: 6,
      template_contrast_per_1k_max: 1,
      stock_adverb_per_1k_max: 1.5,
      clinical_hit_per_1k_max: 0.5,
      subject_ta_opener_ratio_max: 0.312,
    },
    avoid: ['禁对仗宣判句', '禁章末电影定格'],
    prefer: ['短触感一句一段'],
    prompt_directives: [
      '【朱雀叙事硬门槛 · 合同层 · 高于统计形态】',
      '他/姓名起句占比 ≤0.312；优先物件/触感/半截对白起句。',
      '禁止章末电影定格（空气凝固）。',
    ],
    narrative_hard: { bans: ['多体同构复检'], must_deliver: ['当面短对白推责'], zero_family_keys: ['hw_symmetry_pipeline'] },
  })
}

function sampleText(seed: number) {
  const paras: string[] = []
  for (let i = 0; i < 30; i += 1) {
    if (i % 4 === 0) paras.push('“先别动。”他把手电递过去。')
    else paras.push(`他伸手摸了一下门框第${seed}-${i}道。`)
  }
  return `${paras.join('\n\n')}\n`
}

async function tempLib(sampleCount = 4) {
  const lib = await mkdtemp(join(tmpdir(), 'mangaforge-fp-jobs-'))
  dirs.push(lib)
  await mkdir(join(lib, 'contracts', 'by-genre'), { recursive: true })
  await writeFile(join(lib, 'contracts', 'active-contract.json'), builtinContractJson(), 'utf8')
  if (sampleCount > 0) {
    await mkdir(join(lib, 'human', 'urban'), { recursive: true })
    for (let i = 0; i < sampleCount; i += 1) {
      await writeFile(join(lib, 'human', 'urban', `human_qd_${i}.txt`), sampleText(i), 'utf8')
    }
  }
  return lib
}

afterEach(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })))
  dirs = []
})

// jobs live in a process-wide singleton map, so a job left behind by one test (e.g. still
// queued) would otherwise leak into later tests in this file or other test files.
afterEach(() => {
  resetFingerprintContractJobsForTest()
})

describe('fingerprint contract generation job', () => {
  test('readSamplesStatus reports availability and per-genre counts', async () => {
    const lib = await tempLib(3)
    const status = await readSamplesStatus(lib)
    expect(status.available).toBe(true)
    expect(status.count).toBe(3)
    expect(status.by_genre.urban).toBe(3)
  })

  test('readSamplesStatus marks unavailable when the corpus is missing', async () => {
    const lib = await tempLib(0)
    const status = await readSamplesStatus(lib)
    expect(status.available).toBe(false)
    expect(status.count).toBe(0)
  })

  test('loadRefitSamples derives genre from the directory name', async () => {
    const lib = await tempLib(2)
    const samples = await loadRefitSamples(lib)
    expect(samples.length).toBe(2)
    expect(samples[0].genre).toBe('urban')
    expect(samples[0].text.length).toBeGreaterThan(50)
  })

  test('runOfflineRefitJob writes a new set that inherits builtin prose', async () => {
    const lib = await tempLib(4)
    const result = await runOfflineRefitJob({ libRoot: lib, setId: 'set-test', label: '测试集', notes: 'n' })
    expect(result.sample_count).toBe(4)
    const written = JSON.parse(await readFile(join(lib, 'contract-sets', 'set-test', 'active-contract.json'), 'utf8'))
    const builtin = JSON.parse(builtinContractJson())
    expect(written.avoid).toEqual(builtin.avoid)
    expect(written.prefer).toEqual(builtin.prefer)
    expect(written.narrative_hard).toEqual(builtin.narrative_hard)
    expect(written.prompt_directives.length).toBe(builtin.prompt_directives.length)
    expect(written.prompt_directives).toContain('禁止章末电影定格（空气凝固）。')
    const sets = await readContractSets(lib)
    expect(sets.map((s) => s.id)).toEqual(['builtin', 'set-test'])
    expect(sets[1].sample_count).toBe(4)
    const meta = JSON.parse(await readFile(join(lib, 'contract-sets', 'set-test', 'meta.json'), 'utf8'))
    expect(meta.mode).toBe('offline_refit')
  })

  test('runOfflineRefitJob fails clearly when there are no samples', async () => {
    const lib = await tempLib(0)
    await expect(runOfflineRefitJob({ libRoot: lib, setId: 'set-x', label: 'x', notes: '' })).rejects.toThrow(/样本/)
  })

  test('runOfflineRefitJob rejects setId "builtin" and leaves the real contract untouched', async () => {
    const lib = await tempLib(4)
    const contractPath = join(lib, 'contracts', 'active-contract.json')
    const before = await readFile(contractPath, 'utf8')
    await expect(
      runOfflineRefitJob({ libRoot: lib, setId: 'builtin', label: '覆盖测试', notes: '' }),
    ).rejects.toThrow(/只读/)
    const after = await readFile(contractPath, 'utf8')
    expect(after).toBe(before)
  })

  test('runOfflineRefitJob rejects a setId that already exists and preserves the first set', async () => {
    const lib = await tempLib(4)
    const first = await runOfflineRefitJob({ libRoot: lib, setId: 'set-dup', label: '第一次', notes: 'first' })
    expect(first.sample_count).toBe(4)
    const contractPath = join(lib, 'contract-sets', 'set-dup', 'active-contract.json')
    const before = await readFile(contractPath, 'utf8')
    const setsBefore = await readContractSets(lib)
    await expect(
      runOfflineRefitJob({ libRoot: lib, setId: 'set-dup', label: '第二次', notes: 'second' }),
    ).rejects.toThrow(/set-dup/)
    const after = await readFile(contractPath, 'utf8')
    expect(after).toBe(before)
    const setsAfter = await readContractSets(lib)
    expect(setsAfter).toEqual(setsBefore)
  })

  test('listSampleFiles ignores a directory named like a sample file', async () => {
    const lib = await tempLib(2)
    await mkdir(join(lib, 'human', 'urban', 'fake.txt'), { recursive: true })
    const status = await readSamplesStatus(lib)
    const samples = await loadRefitSamples(lib)
    expect(status.count).toBe(2)
    expect(status.by_genre.urban).toBe(2)
    expect(samples.length).toBe(status.count)
  })

  test('createFingerprintContractJob rejects a duplicate id', () => {
    createFingerprintContractJob('offline_refit', 'dup-job-id-test')
    expect(() => createFingerprintContractJob('offline_refit', 'dup-job-id-test')).toThrow(/dup-job-id-test/)
  })

  test('resetFingerprintContractJobsForTest clears the job map', () => {
    const job = createFingerprintContractJob('offline_refit', 'reset-job-id-test')
    expect(hasRunningFingerprintContractJob()).toBe(true)
    resetFingerprintContractJobsForTest()
    expect(hasRunningFingerprintContractJob()).toBe(false)
    expect(getFingerprintContractJob(job.id)).toBe(null)
  })
})
