import apiClient from './client'
import type { APIKey, APIKeyCreate, APIKeyUpdate } from '../types/key'

export const keyApi = {
  getAll: (params?: { provider?: string; is_active?: boolean }) =>
    apiClient.get<APIKey[]>('/keys', { params }),

  get: (id: number) => apiClient.get<APIKey>(`/keys/${id}`),

  create: (data: APIKeyCreate) => apiClient.post('/keys', data),

  update: (id: number, data: APIKeyUpdate) =>
    apiClient.put(`/keys/${id}`, data),

  delete: (id: number) => apiClient.delete(`/keys/${id}`),

  test: (id: number) => apiClient.post<{ valid: boolean; quota_remaining?: number; message?: string }>(`/keys/${id}/test`),

  syncModels: (keyId: number) => apiClient.post(`/keys/${keyId}/sync-models`),
}
