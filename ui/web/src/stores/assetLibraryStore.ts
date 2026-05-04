import { create } from 'zustand'
import apiClient from '../api/client'

export interface Asset {
  id: number
  type: 'image' | 'prompt' | 'video' | 'workflow' | 'node_config' | 'node_template'
  name: string
  description?: string
  thumbnail?: string
  tags?: string[]
  data: any
  project_id?: number | null
}

interface AssetLibraryState {
  assets: Asset[]
  loading: boolean
  filterType: string
  searchText: string
  scope: 'project' | 'global'
  currentProjectId?: number
  setScope: (scope: 'project' | 'global') => void
  fetchAssets: (projectId?: number) => Promise<void>
  createAsset: (payload: any) => Promise<Asset>
  updateAsset: (id: number, payload: any) => Promise<void>
  deleteAsset: (id: number) => Promise<void>
  setFilterType: (type: string) => void
  setSearchText: (text: string) => void
}

export const useAssetLibraryStore = create<AssetLibraryState>((set, get) => ({
  assets: [],
  loading: false,
  filterType: '',
  searchText: '',
  scope: 'project',
  currentProjectId: undefined,
  setScope: scope => set({ scope }),
  fetchAssets: async (projectId?: number) => {
    set({ loading: true, currentProjectId: projectId })
    try {
      const { scope } = get()
      const url = scope === 'global' ? '/assets/?is_global=true' : projectId ? `/assets/?project_id=${projectId}` : '/assets/'
      const res = await apiClient.get(url)
      set({ assets: Array.isArray(res.data) ? res.data : [] })
    } finally {
      set({ loading: false })
    }
  },
  createAsset: async (payload: any) => {
    const res = await apiClient.post('/assets/', payload)
    await get().fetchAssets(get().currentProjectId)
    return res.data
  },
  updateAsset: async (id: number, payload: any) => {
    await apiClient.put(`/assets/${id}`, payload)
    await get().fetchAssets(get().currentProjectId)
  },
  deleteAsset: async (id: number) => {
    await apiClient.delete(`/assets/${id}`)
    await get().fetchAssets(get().currentProjectId)
  },
  setFilterType: type => set({ filterType: type }),
  setSearchText: text => set({ searchText: text }),
}))
