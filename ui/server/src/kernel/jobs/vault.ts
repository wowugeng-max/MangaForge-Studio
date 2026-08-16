// ui/server/src/kernel/jobs/vault.ts
import { copyFileSync, mkdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { kernelVaultDir } from '../paths'
import type { HarvestedArtifact } from '../projection/snapshot'
import { insertKernelArtifact } from './repo'

export function persistCandidateArtifacts(ws: string, candidateId: string, artifacts: HarvestedArtifact[]) {
  const registered: Array<{ artifact_id: string; rel_path: string; artifact_kind: string; vault_path: string }> = []
  for (const artifact of artifacts) {
    const artifactId = `art-${crypto.randomUUID()}`
    const dir = join(kernelVaultDir(ws), artifactId)
    mkdirSync(dir, { recursive: true })
    const vaultPath = join(dir, basename(artifact.rel_path))
    copyFileSync(artifact.copied_path, vaultPath)
    insertKernelArtifact(ws, {
      id: artifactId, candidate_id: candidateId, artifact_kind: artifact.artifact_kind,
      rel_path: artifact.rel_path, sha256: artifact.sha256, byte_size: artifact.byte_size, vault_path: vaultPath,
    })
    registered.push({ artifact_id: artifactId, rel_path: artifact.rel_path, artifact_kind: artifact.artifact_kind, vault_path: vaultPath })
  }
  return registered
}
