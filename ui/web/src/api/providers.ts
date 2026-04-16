// frontend-react/src/api/providers.ts
import apiClient from './client'

export interface ProviderData {
  id: string
  display_name: string
  service_type: string
  api_format: string
  auth_type: string
  supported_modalities: string[]
  default_base_url?: string
  is_active: boolean
  icon?: string
  endpoints?: Record<string, string>
  custom_headers?: Record<string, string>
}

export const providerApi = {
  getAll: (service_type?: string) => apiClient.get<ProviderData[]>('/providers', { params: { service_type } }),
  create: (data: Partial<ProviderData>) => apiClient.post('/providers', data),
  update: (id: string, data: Partial<ProviderData>) => apiClient.put(`/providers/${id}`, data),
  delete: (id: string) => apiClient.delete(`/providers/${id}`),
}
