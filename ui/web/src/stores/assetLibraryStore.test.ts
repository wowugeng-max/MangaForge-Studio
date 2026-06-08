import { afterEach, describe, expect, mock, test } from 'bun:test'
import apiClient from '../api/client'
import { useAssetLibraryStore, type Asset } from './assetLibraryStore'

const originalGet = apiClient.get
const originalPost = apiClient.post

function resetStore() {
  useAssetLibraryStore.setState({
    assets: [],
    loading: false,
    filterType: '',
    searchText: '',
    scope: 'project',
    currentProjectId: undefined,
  })
}

describe('assetLibraryStore API compatibility', () => {
  afterEach(() => {
    apiClient.get = originalGet
    apiClient.post = originalPost
    resetStore()
  })

  test('fetchAssets accepts the TS server assets envelope', async () => {
    const roleAsset: Asset = {
      id: 7,
      type: 'prompt',
      name: 'SystemRole',
      tags: ['SystemRole'],
      data: { content: 'role prompt' },
      project_id: null,
    }
    apiClient.get = mock(async () => ({ data: { assets: [roleAsset] } })) as any

    await useAssetLibraryStore.getState().fetchAssets()

    expect(useAssetLibraryStore.getState().assets).toEqual([roleAsset])
  })

  test('fetchAssets keeps the canvas asset library limited to supported visual asset types', async () => {
    const imageAsset: Asset = {
      id: 9,
      type: 'image',
      name: '角色图',
      data: { file_path: 'assets/role.png' },
      project_id: null,
    }
    apiClient.get = mock(async () => ({
      data: {
        assets: [
          imageAsset,
          { id: 10, type: 'novel_chapter', name: '第一章', data: { content: '正文' }, project_id: null },
          { id: 11, type: 'storyline', name: '主线', data: {}, project_id: null },
        ],
      },
    })) as any

    await useAssetLibraryStore.getState().fetchAssets()

    expect(useAssetLibraryStore.getState().assets).toEqual([imageAsset])
  })

  test('fetchAssets keeps character assets visible for upstream asset compatibility', async () => {
    const characterAsset = {
      id: 12,
      type: 'character',
      name: '沈墨',
      description: '沉默的赏金猎人',
      data: { core_prompt: '冷静、克制、擅长观察' },
      project_id: null,
    }
    apiClient.get = mock(async () => ({
      data: {
        assets: [
          characterAsset,
          { id: 13, type: 'storyline', name: '主线', data: {}, project_id: null },
        ],
      },
    })) as any

    await useAssetLibraryStore.getState().fetchAssets()

    expect(useAssetLibraryStore.getState().assets).toEqual([characterAsset])
  })

  test('createAsset returns the created asset when the API response is wrapped', async () => {
    const created: Asset = {
      id: 8,
      type: 'prompt',
      name: '提示词优化大师',
      tags: ['SystemRole'],
      data: { content: 'prompt' },
      project_id: null,
    }
    apiClient.post = mock(async () => ({ data: { asset: created, assets: [created] } })) as any
    apiClient.get = mock(async () => ({ data: { assets: [created] } })) as any

    const result = await useAssetLibraryStore.getState().createAsset({
      type: 'prompt',
      name: created.name,
      data: created.data,
      tags: created.tags,
      project_id: null,
    })

    expect(result).toEqual(created)
    expect(useAssetLibraryStore.getState().assets).toEqual([created])
  })
})
