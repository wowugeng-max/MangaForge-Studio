import apiClient from './client'

export const fingerprintContractApi = {
  list: () => apiClient.get('/fingerprint-contracts'),
  active: () => apiClient.get('/fingerprint-contracts/active'),
  samplesStatus: () => apiClient.get('/fingerprint-contracts/samples-status'),
  generate: (body: { mode: 'offline_refit' | 'online_fetch'; label?: string; notes?: string }) =>
    apiClient.post('/fingerprint-contracts/generate', body),
  job: (jobId: string) => apiClient.get(`/fingerprint-contracts/jobs/${jobId}`),
  putSelection: (body: { active_set_id?: string; locked?: { set_id: string; key: string } | null }) =>
    apiClient.put('/fingerprint-contracts/selection', body),
  scores: (setId?: string) => apiClient.get('/fingerprint-contracts/scores', { params: { set_id: setId } }),
  detail: (id: string) => apiClient.get(`/fingerprint-contracts/${id}`),
  remove: (id: string) => apiClient.delete(`/fingerprint-contracts/${id}`),
}
