import apiClient from './client'

export interface ProjectCreate {
  name: string
  description?: string
  tags?: string[]
}

export const projectApi = {
  getAll: () => apiClient.get('/projects'),

  getById: (id: number) => apiClient.get(`/projects/${id}`),

  create: (data: ProjectCreate) => apiClient.post('/projects', data),

  update: (id: number, data: Partial<ProjectCreate>) => apiClient.put(`/projects/${id}`, data),

  delete: (id: number) => apiClient.delete(`/projects/${id}`),
}
