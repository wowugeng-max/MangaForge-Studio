import React, { useEffect, useMemo, useState } from 'react'
import { Tag, Typography } from 'antd'
import { FileTextOutlined, PictureOutlined, VideoCameraOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import { buildAssetMediaUrl } from '../utils/assetMedia'

const { Text } = Typography

type LineageBinding = {
  type?: string
  url?: string
  content?: string
  source_asset_ids?: number[]
}

type LineageAssetSummary = {
  name: string
  type: string
} | null

/** 汇总资产血缘涉及的全部上游资产 id(顶层 + data + 各参考绑定)。 */
export function collectLineageAssetIds(data: any, topLevelIds?: unknown): number[] {
  const ids = new Set<number>()
  const push = (value: unknown) => {
    if (!Array.isArray(value)) return
    for (const item of value) {
      const id = Number(item)
      if (Number.isFinite(id) && id > 0) ids.add(id)
    }
  }
  push(topLevelIds)
  push(data?.source_asset_ids)
  if (Array.isArray(data?.reference_bindings)) {
    for (const binding of data.reference_bindings) push((binding as LineageBinding)?.source_asset_ids)
  }
  return Array.from(ids)
}

function lineageTypeIcon(type: string) {
  if (type === 'image') return <PictureOutlined />
  if (type === 'video') return <VideoCameraOutlined />
  return <FileTextOutlined />
}

/**
 * AI 生成溯源里的血缘区块:展示上游资产(可点击跳转)与生成时的参考素材。
 * 上游资产名称按 id 逐个拉取,避免依赖当前页面是否加载过资产列表。
 */
export default function AssetLineagePanel({ data, sourceAssetIds, fontSize = 11 }: {
  data: any
  sourceAssetIds?: unknown
  fontSize?: number
}) {
  const navigate = useNavigate()
  const upstreamIds = useMemo(() => collectLineageAssetIds(data, sourceAssetIds), [data, sourceAssetIds])
  const bindings: LineageBinding[] = Array.isArray(data?.reference_bindings) ? data.reference_bindings : []
  const [summaries, setSummaries] = useState<Record<number, LineageAssetSummary>>({})

  useEffect(() => {
    let cancelled = false
    for (const id of upstreamIds) {
      if (summaries[id] !== undefined) continue
      apiClient.get(`/assets/${id}`)
        .then(res => {
          if (cancelled) return
          const asset = res.data?.asset || res.data
          setSummaries(prev => ({ ...prev, [id]: asset?.name ? { name: String(asset.name), type: String(asset.type || '') } : null }))
        })
        .catch(() => {
          if (!cancelled) setSummaries(prev => ({ ...prev, [id]: null }))
        })
    }
    return () => { cancelled = true }
    // summaries 仅作为已请求缓存,不加入依赖以免重复拉取
  }, [upstreamIds])

  if (!upstreamIds.length && !bindings.length) return null

  const labelStyle: React.CSSProperties = { fontSize: fontSize - 1 }
  const mediaBindings = bindings.filter(binding => binding.url && (binding.type === 'image' || binding.type === 'video'))

  return <>
    {upstreamIds.length > 0 && <div style={{ marginTop: 6 }}>
      <Text type="secondary" style={labelStyle}>上游资产</Text>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
        {upstreamIds.map(id => {
          const summary = summaries[id]
          return <Tag
            key={id}
            color={summary === null ? 'default' : 'geekblue'}
            icon={summary ? lineageTypeIcon(summary.type) : undefined}
            style={{ fontSize, margin: 0, cursor: 'pointer' }}
            onClick={() => navigate(`/assets/${id}`)}
          >
            #{id} {summary === undefined ? '…' : summary === null ? '(不可用)' : summary.name}
          </Tag>
        })}
      </div>
    </div>}
    {mediaBindings.length > 0 && <div style={{ marginTop: 6 }}>
      <Text type="secondary" style={labelStyle}>参考素材</Text>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
        {mediaBindings.map((binding, index) => binding.type === 'image'
          ? <img
              key={index}
              src={buildAssetMediaUrl(String(binding.url))}
              alt={`参考图 ${index + 1}`}
              title={`参考图 ${index + 1}`}
              style={{ width: 44, height: 44, borderRadius: 4, objectFit: 'cover', border: '1px solid #d9d9d9' }}
            />
          : <Tag key={index} icon={<VideoCameraOutlined />} style={{ fontSize, margin: 0 }}>参考视频 {index + 1}</Tag>)}
      </div>
    </div>}
  </>
}
