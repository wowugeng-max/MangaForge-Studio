import { readFile, writeFile, mkdir, readdir, stat } from 'fs/promises'
import { join, basename } from 'path'
import {
  BUILTIN_CONTRACT_SET_ID,
  getContractSetDir,
  normalizeContractSetRecord,
  readContractSets,
  writeContractSets,
  type FingerprintContractSetMode,
} from './fingerprint-contract-store'
import { refitContractFromSamples, refitGenreContracts, type RefitSampleInput } from './novel-writing/fingerprint-contract-refit'
import type { FingerprintContract } from './novel-writing/prose-fingerprint-lib'

export type FingerprintContractJob = {
  id: string
  mode: 'offline_refit' | 'online_fetch'
  status: 'queued' | 'running' | 'completed' | 'failed'
  progress: string
  error?: string
  set_id?: string
  created_at: string
}

const jobs = new Map<string, FingerprintContractJob>()

export function createFingerprintContractJob(mode: FingerprintContractJob['mode'], id: string): FingerprintContractJob {
  if (jobs.has(id)) throw new Error(`任务 id 已存在，无法覆盖历史状态：${id}`)
  const job: FingerprintContractJob = { id, mode, status: 'queued', progress: '排队中', created_at: new Date().toISOString() }
  jobs.set(id, job)
  return job
}

export function getFingerprintContractJob(id: string) {
  return jobs.get(id) || null
}

export function updateFingerprintContractJob(id: string, patch: Partial<FingerprintContractJob>) {
  const job = jobs.get(id)
  if (!job) return null
  Object.assign(job, patch)
  return job
}

export function hasRunningFingerprintContractJob() {
  return [...jobs.values()].some((job) => job.status === 'queued' || job.status === 'running')
}

async function listSampleFiles(libRoot: string): Promise<Array<{ abs: string; genre: string }>> {
  const humanRoot = join(libRoot, 'human')
  const out: Array<{ abs: string; genre: string }> = []
  let genres: string[] = []
  try {
    genres = await readdir(humanRoot)
  } catch {
    return out
  }
  for (const genre of genres) {
    if (genre.startsWith('.')) continue
    const dir = join(humanRoot, genre)
    try {
      if (!(await stat(dir)).isDirectory()) continue
      for (const file of await readdir(dir)) {
        if (!file.endsWith('.txt')) continue
        const abs = join(dir, file)
        try {
          if (!(await stat(abs)).isFile()) continue
        } catch {
          continue
        }
        out.push({ abs, genre })
      }
    } catch {
      continue
    }
  }
  return out
}

export async function readSamplesStatus(libRoot: string) {
  const files = await listSampleFiles(libRoot)
  const byGenre: Record<string, number> = {}
  for (const file of files) byGenre[file.genre] = (byGenre[file.genre] || 0) + 1
  return { available: files.length > 0, count: files.length, by_genre: byGenre }
}

export async function loadRefitSamples(libRoot: string): Promise<RefitSampleInput[]> {
  const files = await listSampleFiles(libRoot)
  const out: RefitSampleInput[] = []
  for (const file of files) {
    try {
      out.push({ id: basename(file.abs).replace(/\.txt$/, ''), genre: file.genre, text: await readFile(file.abs, 'utf8') })
    } catch {
      continue
    }
  }
  return out
}

async function readContractFile(path: string): Promise<FingerprintContract | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as FingerprintContract
  } catch {
    return null
  }
}

export async function runOfflineRefitJob(input: {
  libRoot: string
  setId: string
  label: string
  notes: string
  onProgress?: (text: string) => void
}) {
  if (input.setId === BUILTIN_CONTRACT_SET_ID) {
    throw new Error('setId 不能为 builtin：内置合同只读，不可作为离线重拟合的写入目标')
  }
  const existingSets = await readContractSets(input.libRoot)
  if (existingSets.some((set) => set.id === input.setId)) {
    throw new Error(`合同集 id 已存在，拒绝覆盖：${input.setId}`)
  }

  const report = (text: string) => input.onProgress?.(text)
  report('读取内置合同')
  const builtinDir = getContractSetDir(input.libRoot, BUILTIN_CONTRACT_SET_ID)
  const builtin = await readContractFile(join(builtinDir, 'active-contract.json'))
  if (!builtin) throw new Error('内置合同缺失，无法继承散文字段（contracts/active-contract.json）')

  report('加载本地样本')
  const samples = await loadRefitSamples(input.libRoot)
  if (!samples.length) {
    throw new Error(`本地样本库为空：${join(input.libRoot, 'human')} 下没有 .txt 样章，离线重拟合无法进行`)
  }

  report(`拟合全局合同（${samples.length} 条样本）`)
  const globalContract = refitContractFromSamples({ samples, builtin, name: builtin.name })

  report('拟合题材合同')
  const genreBuiltins: Record<string, FingerprintContract> = {}
  try {
    for (const file of await readdir(join(builtinDir, 'by-genre'))) {
      if (!file.endsWith('.json')) continue
      const contract = await readContractFile(join(builtinDir, 'by-genre', file))
      if (contract) genreBuiltins[file.replace(/\.json$/, '')] = contract
    }
  } catch {
    // by-genre is optional
  }
  const genreContracts = refitGenreContracts({ samples, builtin, genreBuiltins })

  report('写入合同集')
  const setDir = getContractSetDir(input.libRoot, input.setId)
  await mkdir(join(setDir, 'by-genre'), { recursive: true })
  await writeFile(join(setDir, 'active-contract.json'), `${JSON.stringify(globalContract, null, 2)}\n`, 'utf8')
  for (const [slug, contract] of Object.entries(genreContracts)) {
    await writeFile(join(setDir, 'by-genre', `${slug}.json`), `${JSON.stringify(contract, null, 2)}\n`, 'utf8')
  }
  const mode: FingerprintContractSetMode = 'offline_refit'
  await writeFile(
    join(setDir, 'meta.json'),
    `${JSON.stringify({ mode, sample_count: samples.length, genre_count: Object.keys(genreContracts).length, created_at: new Date().toISOString(), inherited_prose_from: BUILTIN_CONTRACT_SET_ID }, null, 2)}\n`,
    'utf8',
  )

  await writeContractSets(input.libRoot, [
    ...existingSets,
    normalizeContractSetRecord({
      id: input.setId,
      label: input.label,
      mode,
      sample_count: samples.length,
      notes: input.notes,
      source_set_id: BUILTIN_CONTRACT_SET_ID,
      created_at: new Date().toISOString(),
    }),
  ])
  report('完成')
  return { set_id: input.setId, sample_count: samples.length }
}
