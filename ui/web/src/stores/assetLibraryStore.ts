import { create } from 'zustand'
import apiClient from '../api/client'
import type { Asset } from '../types/asset'

export type { Asset }

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

function normalizeAssetList(data: any): Asset[] {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.assets)) return data.assets
  return []
}

function normalizeAsset(data: any): Asset {
  return data?.asset || data
}

const CANVAS_ASSET_TYPES = new Set(['image', 'prompt', 'video', 'workflow', 'node_config', 'node_template', 'character'])

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
      set({ assets: normalizeAssetList(res.data).filter(asset => CANVAS_ASSET_TYPES.has(asset.type)) })
    } finally {
      set({ loading: false })
    }
  },
  createAsset: async (payload: any) => {
    const res = await apiClient.post('/assets/', payload)
    await get().fetchAssets(get().currentProjectId)
    return normalizeAsset(res.data)
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
