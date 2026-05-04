import apiClient from './client'

export type AssetRecord = {
  id: number
  name: string
  type: string
  description?: string
  tags?: string[]
  updated_at?: string
}

export const assetsApi = {
  getAll: () => apiClient.get('/assets'),
  create: (payload: Omit<AssetRecord, 'id' | 'updated_at'>) => apiClient.post('/assets', payload),
  update: (id: number, payload: Partial<AssetRecord>) => apiClient.put(`/assets/${id}`, payload),
  delete: (id: number) => apiClient.delete(`/assets/${id}`),
}
