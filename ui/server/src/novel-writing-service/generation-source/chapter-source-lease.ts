import { canonicalFilesystemIdentity } from '../../workspace-identity'
import { withMcpWorkspaceMutation } from '../../mcp/workspace-coordinator'
import { ChapterGenerationSourceError } from './errors'

export type ChapterSourceLease = {
  readonly taskId: string
  readonly projectId: number
  release(): Promise<void>
}

function assertProjectId(projectId: number) {
  if (!Number.isSafeInteger(projectId) || projectId <= 0) {
    throw new RangeError('projectId 必须是正安全整数')
  }
}

function activeKey(canonicalWorkspace: string, projectId: number) {
  return `${canonicalWorkspace}\0${projectId}`
}

export class ChapterSourceLeaseRegistry {
  private readonly active = new Set<string>()

  async isActive(workspaceInput: string, projectId: number): Promise<boolean> {
    assertProjectId(projectId)
    const canonicalWorkspace = canonicalFilesystemIdentity(workspaceInput)
    const key = activeKey(canonicalWorkspace, projectId)
    return withMcpWorkspaceMutation(canonicalWorkspace, async () => this.active.has(key))
  }

  async acquire(workspaceInput: string, projectId: number, taskId: string): Promise<ChapterSourceLease> {
    assertProjectId(projectId)
    const canonicalWorkspace = canonicalFilesystemIdentity(workspaceInput)
    const key = activeKey(canonicalWorkspace, projectId)
    return withMcpWorkspaceMutation(canonicalWorkspace, async () => {
      if (this.active.has(key)) {
        throw new ChapterGenerationSourceError(
          'GENERATION_SOURCE_BUSY',
          '当前章节任务正在运行，结束后可切换来源',
          { project_id: projectId },
        )
      }
      this.active.add(key)

      let releasePromise: Promise<void> | undefined
      const release = () => {
        if (releasePromise) return releasePromise
        releasePromise = withMcpWorkspaceMutation(canonicalWorkspace, async () => {
          this.active.delete(key)
        })
        return releasePromise
      }

      return Object.freeze({ taskId, projectId, release })
    })
  }
}
