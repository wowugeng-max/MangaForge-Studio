import apiClient from './client'
import type { Asset } from '../types/asset'

export type AssetRecord = Asset
export type AssetListParams = {
  project_id?: number
  is_global?: boolean
  type?: AssetRecord['type'] | string
  skip?: number
  limit?: number
}

export const assetsApi = {
  getAll: (params?: AssetListParams) => apiClient.get('/assets/', { params }),
  create: (payload: Omit<AssetRecord, 'id' | 'updated_at' | 'created_at'>) => apiClient.post('/assets/', payload),
  update: (id: number, payload: Partial<AssetRecord>) => apiClient.put(`/assets/${id}`, payload),
  delete: (id: number) => apiClient.delete(`/assets/${id}`),
}
