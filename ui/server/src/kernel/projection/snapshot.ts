import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync, lstatSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import type { KernelContract } from '../contracts/schema'
import { renderKernelTemplate, type KernelPromptVars } from '../template'

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function walkFiles(root: string, dir: string, out: string[]) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stats = lstatSync(full)
    if (stats.isSymbolicLink()) continue
    if (stats.isDirectory()) walkFiles(root, full, out)
    else if (stats.isFile()) out.push(relative(root, full))
  }
}

export function writeKernelSnapshot(projectDir: string, snapshotDir: string): Record<string, string> {
  const relPaths: string[] = []
  walkFiles(projectDir, projectDir, relPaths)
  const manifest: Record<string, string> = {}
  for (const relPath of relPaths.sort()) {
    manifest[relPath] = sha256(readFileSync(join(projectDir, relPath)))
  }
  mkdirSync(snapshotDir, { recursive: true })
  writeFileSync(join(snapshotDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  return manifest
}

function globToRegExp(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, '(?:.+/)?')
    .replace(/\*\*/g, '.+')
    .replace(/\*/g, '[^/]*')
  return new RegExp(`^${escaped}$`)
}

function detectNestedWriteRoot(relPaths: string[], writeScope: string[]): string | null {
  if (relPaths.some(rel => writeScope.some(scope => rel.startsWith(scope)))) return null
  const roots = new Set<string>()
  for (const rel of relPaths) {
    const slash = rel.indexOf('/')
    if (slash <= 0) continue
    const rest = rel.slice(slash + 1)
    if (writeScope.some(scope => rest.startsWith(scope))) roots.add(rel.slice(0, slash))
  }
  if (roots.size !== 1) return null
  const root = [...roots][0]
  return root.startsWith('.') ? null : root
}

export type HarvestedArtifact = {
  rel_path: string
  artifact_kind: string
  sha256: string
  byte_size: number
  copied_path: string
}

export function harvestKernelArtifacts(input: {
  projectDir: string
  artifactsDir: string
  manifest: Record<string, string>
  contract: KernelContract
  vars: KernelPromptVars
}): {
  artifacts: HarvestedArtifact[]
  warnings: Array<{ warning: 'write_outside_scope'; rel_path: string }>
  missingRequired: string[]
} {
  const { projectDir, artifactsDir, manifest, contract, vars } = input
  const writeScope = contract.write_scope.map(prefix => renderKernelTemplate(prefix, vars))
  const ignore = (contract.ignore || []).map(prefix => renderKernelTemplate(prefix, vars))
  const outputs = contract.outputs.map(output => ({
    ...output,
    renderedGlob: renderKernelTemplate(output.glob, vars),
    pattern: globToRegExp(renderKernelTemplate(output.glob, vars)),
    hits: 0,
  }))

  const relPaths: string[] = []
  walkFiles(projectDir, projectDir, relPaths)
  const bookRoot = detectNestedWriteRoot(relPaths, writeScope)

  const artifacts: HarvestedArtifact[] = []
  const warnings: Array<{ warning: 'write_outside_scope'; rel_path: string }> = []

  for (const relPath of relPaths.sort()) {
    const logicalPath = bookRoot && relPath.startsWith(`${bookRoot}/`)
      ? relPath.slice(bookRoot.length + 1)
      : relPath
    const bytes = readFileSync(join(projectDir, relPath))
    const digest = sha256(bytes)
    if (manifest[relPath] === digest) continue
    if (ignore.some(prefix => logicalPath.startsWith(prefix) || relPath.startsWith(prefix))) continue
    if (!writeScope.some(prefix => logicalPath.startsWith(prefix))) {
      warnings.push({ warning: 'write_outside_scope', rel_path: relPath })
      continue
    }
    const output = outputs.find(candidate => candidate.pattern.test(logicalPath))
    if (output) output.hits += 1
    const copied = join(artifactsDir, logicalPath)
    mkdirSync(dirname(copied), { recursive: true })
    copyFileSync(join(projectDir, relPath), copied)
    artifacts.push({
      rel_path: logicalPath,
      artifact_kind: output ? output.artifact_kind : 'attachment',
      sha256: digest,
      byte_size: bytes.byteLength,
      copied_path: copied,
    })
  }

  const missingRequired = outputs.filter(output => output.required && output.hits === 0).map(output => output.renderedGlob)
  return { artifacts, warnings, missingRequired }
}
