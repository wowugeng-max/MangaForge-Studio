export interface Asset {
  id: number
  type: 'image' | 'prompt' | 'video' | 'workflow' | 'node_config' | 'node_template' | 'character'
  name: string
  description?: string
  thumbnail?: string
  tags?: string[]
  data: any
  project_id?: number | null
  version?: number
  created_at?: string
  updated_at?: string
  parent_id?: number | null
  source_asset_ids?: number[] | null
  file_path?: string
}
