import apiClient from './client'
import type { APIKey, APIKeyCreate, APIKeyUpdate } from '../types/key'

export const keyApi = {
  getAll: (params?: { provider?: string; is_active?: boolean }) => apiClient.get<APIKey[]>('/keys/', { params }),
  get: (id: number) => apiClient.get<APIKey>(`/keys/${id}`),
  create: (data: APIKeyCreate) => apiClient.post<APIKey>('/keys/', data),
  update: (id: number, data: APIKeyUpdate) => apiClient.put<APIKey>(`/keys/${id}`, data),
  delete: (id: number) => apiClient.delete(`/keys/${id}`),
  test: (id: number) => apiClient.post<{ valid: boolean; quota_remaining?: number; message?: string; error?: string; retryable?: boolean; retry_after?: number }>(`/keys/${id}/test`),
  testAll: () => apiClient.post('/keys/test-all'),
  syncModels: (keyId: number) => apiClient.post(`/models/sync/${keyId}`),
}
