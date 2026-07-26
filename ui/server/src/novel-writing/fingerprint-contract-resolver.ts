import { existsSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import { BUILTIN_CONTRACT_SET_ID, getContractSetDir, readContractSelectionSync } from '../fingerprint-contract-store'
import { normalizeFingerprintGenreSlug, type FingerprintContract } from './prose-fingerprint-lib'

export type ResolvedFingerprintContractInfo = {
  set_id: string
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

function candidatePathsForRoot(libRoot: string, genre?: string | null): string[] {
  const selection = readContractSelectionSync(libRoot)
  const slug = genre ? normalizeFingerprintGenreSlug(genre) : null
  const out: string[] = []
  if (selection.locked?.set_id) {
    const dir = getContractSetDir(libRoot, selection.locked.set_id)
    const key = selection.locked.key || 'active'
    out.push(key === 'active' ? join(dir, 'active-contract.json') : join(dir, 'by-genre', `${key}.json`))
  }
  const activeDir = getContractSetDir(libRoot, selection.active_set_id)
  if (slug) out.push(join(activeDir, 'by-genre', `${slug}.json`))
  out.push(join(activeDir, 'active-contract.json'))
  const builtinDir = getContractSetDir(libRoot, BUILTIN_CONTRACT_SET_ID)
  if (slug) out.push(join(builtinDir, 'by-genre', `${slug}.json`))
  out.push(join(builtinDir, 'active-contract.json'))
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
  const slug = options.genre ? normalizeFingerprintGenreSlug(options.genre) : null
  for (const libRoot of resolveFingerprintLibRoots(cwd)) {
    const selection = readContractSelectionSync(libRoot)
    for (const path of candidatePathsForRoot(libRoot, options.genre)) {
      const contract = readContract(path)
      if (!contract) continue
      return {
        set_id: setIdForPath(libRoot, path),
        contract_name: String(contract.name || ''),
        contract_path: path,
        locked: Boolean(selection.locked?.set_id),
        genre_slug: slug,
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
