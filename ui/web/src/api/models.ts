import apiClient from './client'

export const modelApi = {
  getByKeyId: (keyId: number) => {
    return apiClient.get('/models', { params: { api_key_id: keyId } })
  },

  create: (data: unknown) => apiClient.post('/models', data),

  update: (id: number, data: unknown) => apiClient.put(`/models/${id}`, data),

  delete: (id: number) => apiClient.delete(`/models/${id}`),

  test: (id: number) => apiClient.post(`/models/${id}/test`),

  bulkUpdateUiParams: (payload: { api_key_id: number; capability: string; ui_params_array: unknown[] }) =>
    apiClient.post('/models/bulk-ui-params', payload),

  toggleFavorite: (id: number, is_favorite: boolean) =>
    apiClient.post(`/models/${id}/favorite`, { is_favorite }),
}
