import { existsSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import {
  BUILTIN_CONTRACT_SET,
  BUILTIN_CONTRACT_SET_ID,
  getContractSetDir,
  readContractSelectionSync,
  readContractSetsSync,
} from '../fingerprint-contract-store'
import { normalizeFingerprintGenreSlug, type FingerprintContract } from './prose-fingerprint-lib'

export type ResolvedFingerprintContractInfo = {
  set_id: string
  set_label: string
  contract_name: string
  contract_path: string
  locked: boolean
  genre_slug: string | null
}

/** Repo-relative fingerprint-lib roots (server cwd is <repo>/ui/server in dev). */
export function resolveFingerprintLibRoots(cwd = process.cwd()): string[] {
  return [
    resolve(cwd, '../../workspace/fingerprint-lib'),
    resolve(cwd, '../../../workspace/fingerprint-lib'),
    resolve(cwd, 'workspace/fingerprint-lib'),
  ]
}

function readContract(path: string): FingerprintContract | null {
  try {
    if (!existsSync(path)) return null
    return JSON.parse(readFileSync(path, 'utf8')) as FingerprintContract
  } catch {
    return null
  }
}

type FingerprintContractCandidate = { path: string; locked: boolean; genreSlug: string | null }

/**
 * Candidates in priority order: locked genre/global contract > locked set's own
 * global contract (keeps a locked set isolated when its genre file is missing,
 * instead of spilling over into active_set_id) > active set genre > active set
 * global > builtin genre > builtin global.
 */
function candidatesForRoot(libRoot: string, genre?: string | null): FingerprintContractCandidate[] {
  const selection = readContractSelectionSync(libRoot)
  const slug = genre ? normalizeFingerprintGenreSlug(genre) : null
  const out: FingerprintContractCandidate[] = []
  if (selection.locked?.set_id) {
    const dir = getContractSetDir(libRoot, selection.locked.set_id)
    const key = selection.locked.key || 'active'
    if (key === 'active') {
      out.push({ path: join(dir, 'active-contract.json'), locked: true, genreSlug: null })
    } else {
      out.push({ path: join(dir, 'by-genre', `${key}.json`), locked: true, genreSlug: key })
      out.push({ path: join(dir, 'active-contract.json'), locked: true, genreSlug: null })
    }
  }
  const activeDir = getContractSetDir(libRoot, selection.active_set_id)
  if (slug) out.push({ path: join(activeDir, 'by-genre', `${slug}.json`), locked: false, genreSlug: slug })
  out.push({ path: join(activeDir, 'active-contract.json'), locked: false, genreSlug: null })
  const builtinDir = getContractSetDir(libRoot, BUILTIN_CONTRACT_SET_ID)
  if (slug) out.push({ path: join(builtinDir, 'by-genre', `${slug}.json`), locked: false, genreSlug: slug })
  out.push({ path: join(builtinDir, 'active-contract.json'), locked: false, genreSlug: null })
  return out
}

function setIdForPath(libRoot: string, path: string): string {
  const marker = join(libRoot, 'contract-sets')
  if (!path.startsWith(marker)) return BUILTIN_CONTRACT_SET_ID
  const rest = path.slice(marker.length).replace(/^[\\/]+/, '')
  return rest.split(/[\\/]/)[0] || BUILTIN_CONTRACT_SET_ID
}

export function resolveFingerprintContractInfo(
  options: { cwd?: string; genre?: string | null } = {},
): ResolvedFingerprintContractInfo | null {
  const cwd = options.cwd || process.cwd()
  for (const libRoot of resolveFingerprintLibRoots(cwd)) {
    for (const candidate of candidatesForRoot(libRoot, options.genre)) {
      const contract = readContract(candidate.path)
      if (!contract) continue
      const setId = setIdForPath(libRoot, candidate.path)
      const setRecord = readContractSetsSync(libRoot).find((set) => set.id === setId)
      return {
        set_id: setId,
        set_label: setRecord?.label ?? BUILTIN_CONTRACT_SET.label,
        contract_name: String(contract.name || ''),
        contract_path: candidate.path,
        locked: candidate.locked,
        genre_slug: candidate.genreSlug,
      }
    }
  }
  return null
}

export function resolveFingerprintContract(
  options: { cwd?: string; genre?: string | null } = {},
): FingerprintContract | null {
  const info = resolveFingerprintContractInfo(options)
  return info ? readContract(info.contract_path) : null
}
