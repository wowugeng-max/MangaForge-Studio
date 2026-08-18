import type {
  CreateKernelJobInput,
  KernelApiError,
  KernelContractListItem,
  KernelJobDetail,
  KernelRequest,
} from './types'
import { CHAPTER_KERNEL_VERBS } from './types'

export { CHAPTER_KERNEL_VERBS }
export type {
  CreateKernelJobInput,
  KernelApiError,
  KernelContractListItem,
  KernelJobAction,
  KernelJobDetail,
  KernelJobProgress,
  KernelRequest,
} from './types'

function fail(status: number, data: any, fallback = 'UNKNOWN'): KernelApiError {
  return {
    ok: false,
    status,
    code: String(data?.code || fallback),
    message: String(data?.error || data?.message || ''),
  }
}

export function createKernelJobApi(request: KernelRequest) {
  return {
    async createJob(input: CreateKernelJobInput): Promise<{ ok: true; jobId: string } | KernelApiError> {
      const body: Record<string, unknown> = {
        project_id: input.projectId,
        subject_type: 'chapter',
        subject_id: input.chapterId,
        verb: CHAPTER_KERNEL_VERBS[input.action],
        model_id: input.modelId,
      }
      if (input.contractIds?.length) body.contract_ids = input.contractIds
      const { status, data } = await request('POST', '/kernel/jobs', body)
      const jobId = String(data?.job?.id || '')
      if (status >= 200 && status < 300 && jobId) return { ok: true, jobId }
      return fail(status, data)
    },

    async getJob(jobId: string): Promise<KernelJobDetail | KernelApiError> {
      const { status, data } = await request('GET', `/kernel/jobs/${jobId}`)
      if (status >= 200 && status < 300 && data?.ok && data?.job) return data as KernelJobDetail
      return fail(status, data, 'JOB_NOT_FOUND')
    },

    async cancelJob(jobId: string): Promise<{ ok: true } | KernelApiError> {
      const { status, data } = await request('POST', `/kernel/jobs/${jobId}/cancel`)
      if (status >= 200 && status < 300 && data?.ok !== false) return { ok: true }
      return fail(status, data)
    },

    async commitJob(jobId: string, candidateId: string): Promise<{ ok: true; commits: unknown[] } | KernelApiError> {
      const { status, data } = await request('POST', `/kernel/jobs/${jobId}/commit`, { candidate_id: candidateId })
      if (status >= 200 && status < 300 && data?.ok !== false) return { ok: true, commits: data?.commits || [] }
      return fail(status, data)
    },

    async getArtifactContent(artifactId: string): Promise<
      | { ok: true; content: string; truncated: boolean; artifact: { id: string; rel_path: string; artifact_kind: string } }
      | KernelApiError
    > {
      const { status, data } = await request('GET', `/kernel/artifacts/${artifactId}/content`)
      if (status >= 200 && status < 300 && data?.ok) {
        return {
          ok: true,
          content: String(data.content || ''),
          truncated: Boolean(data.truncated),
          artifact: data.artifact || { id: artifactId, rel_path: '', artifact_kind: '' },
        }
      }
      return fail(status, data, 'ARTIFACT_NOT_FOUND')
    },

    async listContracts(): Promise<{ ok: true; contracts: KernelContractListItem[] } | { ok: false; message: string }> {
      const { status, data } = await request('GET', '/kernel/contracts')
      if (status >= 200 && status < 300 && data?.ok) {
        return { ok: true, contracts: Array.isArray(data.contracts) ? data.contracts : [] }
      }
      return { ok: false, message: String(data?.error || data?.message || 'CONTRACTS_UNAVAILABLE') }
    },
  }
}

export function axiosKernelRequest(apiClient: { request: (config: any) => Promise<any> }): KernelRequest {
  return async (method, path, body) => {
    const res = await apiClient.request({
      method,
      url: path,
      data: body,
      validateStatus: () => true,
    })
    return { status: Number(res?.status || 0), data: res?.data }
  }
}
