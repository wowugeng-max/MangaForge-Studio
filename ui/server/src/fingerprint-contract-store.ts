import { readFile, writeFile, mkdir } from 'fs/promises'
import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'
import { join, dirname } from 'path'

export type FingerprintContractSetMode = 'builtin' | 'offline_refit' | 'online_fetch'

export type FingerprintContractSetRecord = {
  id: string
  label: string
  created_at: string
  mode: FingerprintContractSetMode
  sample_count: number
  notes: string
  source_set_id?: string
}

export type FingerprintContractSelection = {
  active_set_id: string
  locked?: { set_id: string; key: string } | null
}

export const BUILTIN_CONTRACT_SET_ID = 'builtin'

export const BUILTIN_CONTRACT_SET: FingerprintContractSetRecord = {
  id: BUILTIN_CONTRACT_SET_ID,
  label: '内置合同（随仓库）',
  created_at: '',
  mode: 'builtin',
  sample_count: 0,
  notes: '仓库自带、已入库的拟合合同；只读且不可删除。',
}

export function getFingerprintLibRoot(repoRoot: string) {
  return join(repoRoot, 'workspace', 'fingerprint-lib')
}

/** Route layer helper: getWorkspace() already returns <repo>/workspace. */
export function getFingerprintLibRootFromWorkspace(activeWorkspace: string) {
  return join(activeWorkspace, 'fingerprint-lib')
}

export function getContractSetsIndexPath(libRoot: string) {
  return join(libRoot, 'contract-sets', 'index.json')
}

export function getContractSelectionPath(libRoot: string) {
  return join(libRoot, 'contract-selection.json')
}

export function getContractSetDir(libRoot: string, setId: string) {
  if (setId === BUILTIN_CONTRACT_SET_ID) return join(libRoot, 'contracts')
  return join(libRoot, 'contract-sets', setId)
}

const MODES: FingerprintContractSetMode[] = ['builtin', 'offline_refit', 'online_fetch']

// Shared by read and write sides so a stray null/string/number/array in the
// index can't slip past optional chaining and get normalized into a ghost record.
function isPlainRecord(value: any): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function normalizeContractSetRecord(raw: any): FingerprintContractSetRecord {
  const id = String(raw?.id ?? '').trim() || `set-${randomUUID()}`
  const mode = MODES.includes(String(raw?.mode) as FingerprintContractSetMode)
    ? (String(raw?.mode) as FingerprintContractSetMode)
    : 'offline_refit'
  const record: FingerprintContractSetRecord = {
    id,
    label: String(raw?.label ?? raw?.name ?? id),
    created_at: String(raw?.created_at ?? raw?.createdAt ?? new Date().toISOString()),
    mode,
    sample_count: Number(raw?.sample_count ?? raw?.sampleCount ?? 0) || 0,
    notes: String(raw?.notes ?? ''),
  }
  const source = raw?.source_set_id ?? raw?.sourceSetId
  if (source) record.source_set_id = String(source)
  return record
}

export async function readContractSets(libRoot: string): Promise<FingerprintContractSetRecord[]> {
  let stored: any[] = []
  try {
    const raw = JSON.parse(await readFile(getContractSetsIndexPath(libRoot), 'utf8'))
    if (Array.isArray(raw)) stored = raw
  } catch {
    stored = []
  }
  return [
    BUILTIN_CONTRACT_SET,
    ...stored
      .filter(isPlainRecord)
      .map(normalizeContractSetRecord)
      .filter((record) => record.id !== BUILTIN_CONTRACT_SET_ID),
  ]
}

export function readContractSetsSync(libRoot: string): FingerprintContractSetRecord[] {
  let stored: any[] = []
  try {
    const raw = JSON.parse(readFileSync(getContractSetsIndexPath(libRoot), 'utf8'))
    if (Array.isArray(raw)) stored = raw
  } catch {
    stored = []
  }
  return [
    BUILTIN_CONTRACT_SET,
    ...stored
      .filter(isPlainRecord)
      .map(normalizeContractSetRecord)
      .filter((record) => record.id !== BUILTIN_CONTRACT_SET_ID),
  ]
}

export async function writeContractSets(libRoot: string, sets: FingerprintContractSetRecord[]) {
  const path = getContractSetsIndexPath(libRoot)
  await mkdir(dirname(path), { recursive: true })
  // Normalize before filtering/deduping so records missing an id still get one
  // instead of being silently dropped, mirroring the map->filter order readContractSets uses.
  // Non-plain-record entries (null/undefined/string/number/array) are rejected up front, since
  // normalizeContractSetRecord's optional chaining would otherwise turn them into
  // fully-formed ghost records instead of skipping them.
  const byId = new Map<string, FingerprintContractSetRecord>()
  for (const raw of sets) {
    if (!isPlainRecord(raw)) continue
    const record = normalizeContractSetRecord(raw)
    if (record.id === BUILTIN_CONTRACT_SET_ID) continue
    byId.set(record.id, record)
  }
  const persisted = [...byId.values()]
  await writeFile(path, `${JSON.stringify(persisted, null, 2)}\n`, 'utf8')
}

function normalizeSelection(raw: any): FingerprintContractSelection {
  const activeSetId = String(raw?.active_set_id ?? raw?.activeSetId ?? '').trim() || BUILTIN_CONTRACT_SET_ID
  const lockedRaw = raw?.locked
  const locked = lockedRaw && String(lockedRaw?.set_id ?? lockedRaw?.setId ?? '').trim()
    ? { set_id: String(lockedRaw.set_id ?? lockedRaw.setId), key: String(lockedRaw?.key ?? 'active') || 'active' }
    : null
  return { active_set_id: activeSetId, locked }
}

export async function readContractSelection(libRoot: string): Promise<FingerprintContractSelection> {
  try {
    return normalizeSelection(JSON.parse(await readFile(getContractSelectionPath(libRoot), 'utf8')))
  } catch {
    return { active_set_id: BUILTIN_CONTRACT_SET_ID, locked: null }
  }
}

export function readContractSelectionSync(libRoot: string): FingerprintContractSelection {
  try {
    return normalizeSelection(JSON.parse(readFileSync(getContractSelectionPath(libRoot), 'utf8')))
  } catch {
    return { active_set_id: BUILTIN_CONTRACT_SET_ID, locked: null }
  }
}

export async function writeContractSelection(libRoot: string, selection: FingerprintContractSelection) {
  const path = getContractSelectionPath(libRoot)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(normalizeSelection(selection), null, 2)}\n`, 'utf8')
}
