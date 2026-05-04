import apiClient from './client'

export const modelApi = {
  list: (params?: { key_id?: number; mode?: string }) => apiClient.get('/models/', { params }),
  getByKeyId: (keyId: number, mode?: string) => apiClient.get('/models/', { params: { key_id: keyId, mode } }),
  create: (data: any) => apiClient.post('/models/', data),
  update: (id: number, data: any) => apiClient.put(`/models/${id}`, data),
  delete: (id: number) => apiClient.delete(`/models/${id}`),
  test: (id: number) => apiClient.post(`/models/${id}/test`),
  bulkUpdateUiParams: (payload: { api_key_id: number; capability: string; ui_params_array: any[] }) => apiClient.put('/models/bulk/ui-params', payload),
  toggleFavorite: (id: number, is_favorite: boolean) => apiClient.patch(`/models/${id}/favorite`, { is_favorite }),
}
