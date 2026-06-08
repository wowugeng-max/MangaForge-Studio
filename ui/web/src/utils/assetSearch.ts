type SearchableAsset = {
  name?: string
  description?: string
  data?: Record<string, any>
}

function includesQuery(value: unknown, query: string) {
  return String(value || '').toLowerCase().includes(query)
}

export function assetMatchesSearch(asset: SearchableAsset, searchText: string) {
  const query = String(searchText || '').trim().toLowerCase()
  if (!query) return true
  return [
    asset.name,
    asset.description,
    asset.data?.content,
    asset.data?.core_prompt,
    asset.data?.negative_prompt,
  ].some(value => includesQuery(value, query))
}
