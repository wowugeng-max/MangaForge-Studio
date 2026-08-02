import { resolve } from 'node:path'
import { canonicalFilesystemIdentity } from '../../workspace-identity'
import { withMcpWorkspaceMutation } from '../../mcp/workspace-coordinator'
import { ChapterGenerationSourceError } from './errors'

export type ChapterSourceLease = {
  readonly taskId: string
  readonly projectId: number
  release(): Promise<void>
}

const WORKSPACE_IDENTITY_DETAIL_MAX_CHARS = 512

function assertProjectId(projectId: number) {
  if (!Number.isSafeInteger(projectId) || projectId <= 0) {
    throw new RangeError('projectId 必须是正安全整数')
  }
}

type WorkspaceIdentities = {
  lexical: string
  canonical: string
}

type ActiveChapterSourceLease = {
  readonly token: symbol
  readonly projectId: number
  readonly lexicalWorkspace: string
  readonly canonicalWorkspaceAtAcquire: string
}

function workspaceIdentities(workspaceInput: string): WorkspaceIdentities {
  const lexical = resolve(workspaceInput)
  return {
    lexical,
    canonical: canonicalFilesystemIdentity(lexical),
  }
}

function boundedWorkspaceIdentity(identity: string) {
  return identity.slice(0, WORKSPACE_IDENTITY_DETAIL_MAX_CHARS)
}

function identitiesOverlap(candidate: WorkspaceIdentities, active: ActiveChapterSourceLease) {
  const currentCanonical = canonicalFilesystemIdentity(active.lexicalWorkspace)
  return candidate.lexical === active.lexicalWorkspace
    || candidate.lexical === active.canonicalWorkspaceAtAcquire
    || candidate.lexical === currentCanonical
    || candidate.canonical === active.lexicalWorkspace
    || candidate.canonical === active.canonicalWorkspaceAtAcquire
    || candidate.canonical === currentCanonical
}

export class ChapterSourceLeaseRegistry {
  private readonly active = new Map<symbol, ActiveChapterSourceLease>()

  private findActive(workspace: WorkspaceIdentities, projectId: number) {
    for (const active of this.active.values()) {
      if (active.projectId === projectId && identitiesOverlap(workspace, active)) return active
    }
    return undefined
  }

  isActive(workspaceInput: string, projectId: number): boolean {
    assertProjectId(projectId)
    return Boolean(this.findActive(workspaceIdentities(workspaceInput), projectId))
  }

  async acquire(workspaceInput: string, projectId: number, taskId: string): Promise<ChapterSourceLease> {
    assertProjectId(projectId)
    const initialWorkspace = workspaceIdentities(workspaceInput)
    return withMcpWorkspaceMutation(initialWorkspace.canonical, async () => {
      const acquiredWorkspace = workspaceIdentities(initialWorkspace.lexical)
      if (acquiredWorkspace.canonical !== initialWorkspace.canonical) {
        throw new ChapterGenerationSourceError(
          'GENERATION_SOURCE_CHANGED',
          '章节来源工作区身份已变化，请重试',
          {
            initial_workspace_identity: boundedWorkspaceIdentity(initialWorkspace.canonical),
            current_workspace_identity: boundedWorkspaceIdentity(acquiredWorkspace.canonical),
          },
        )
      }
      if (this.findActive(acquiredWorkspace, projectId)) {
        throw new ChapterGenerationSourceError(
          'GENERATION_SOURCE_BUSY',
          '当前章节任务正在运行，结束后可切换来源',
          { project_id: projectId },
        )
      }

      const token = Symbol('chapter-source-lease')
      let releasePromise: Promise<void> | undefined
      const release = () => {
        if (releasePromise) return releasePromise
        const operation = withMcpWorkspaceMutation(acquiredWorkspace.canonical, async () => {
          this.active.delete(token)
        })
        releasePromise = operation.catch(error => {
          if (this.active.has(token)) releasePromise = undefined
          throw error
        })
        return releasePromise
      }

      const lease = Object.freeze({ taskId, projectId, release })
      this.active.set(token, {
        token,
        projectId,
        lexicalWorkspace: acquiredWorkspace.lexical,
        canonicalWorkspaceAtAcquire: acquiredWorkspace.canonical,
      })
      return lease
    })
  }
}
