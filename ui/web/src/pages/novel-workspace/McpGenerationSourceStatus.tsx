import React, { useEffect, useState } from 'react'
import { ApiOutlined, WarningOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import {
  mcpApi,
  type McpAgentSummary,
  type McpPublicKey,
  type McpServerRecord,
  type ProseGenerationSourceConfig,
} from '../../api/mcp'
import {
  buildMcpSourceStatus,
  loadMcpSourceStatusSnapshot,
} from './mcpGenerationSourceStatusModel'

export function McpGenerationSourceStatus({
  projectId,
  initialSource,
  refreshKey,
  onOpenSettings,
}: {
  projectId: number
  initialSource?: ProseGenerationSourceConfig | null
  refreshKey: number
  onOpenSettings: () => void
}) {
  const [source, setSource] = useState<ProseGenerationSourceConfig | null>(initialSource || null)
  const [servers, setServers] = useState<McpServerRecord[]>([])
  const [keys, setKeys] = useState<McpPublicKey[]>([])
  const [agents, setAgents] = useState<McpAgentSummary[]>([])
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    setSource(initialSource || null)
  }, [projectId, initialSource])

  useEffect(() => {
    if (!projectId) return
    let active = true
    setLoadFailed(false)
    setServers([])
    setKeys([])
    setAgents([])

    void loadMcpSourceStatusSnapshot({
      projectId,
      isActive: () => active,
      onSource: nextSource => setSource(nextSource),
      loadSource: async nextProjectId => (
        await mcpApi.getProjectSource(nextProjectId)
      ).data.source,
      loadServers: async () => (await mcpApi.listServers()).data || [],
      loadKeys: async () => (await mcpApi.listKeys()).data || [],
      loadAgents: async nextSource => {
        if (nextSource.type !== 'mcp') return []
        const response = await mcpApi.listProjectAgents(
          projectId,
          nextSource.mcp.server_id,
          nextSource.mcp.key_id,
        )
        return response.data.agents || []
      },
    }).then(snapshot => {
      if (!snapshot || !active) return
      setServers(snapshot.servers)
      setKeys(snapshot.keys)
      setAgents(snapshot.agents)
      setLoadFailed(snapshot.loadFailed)
    }).catch(() => {
      if (active) setLoadFailed(true)
    })

    return () => {
      active = false
    }
  }, [projectId, refreshKey])

  const status = buildMcpSourceStatus({ source, servers, keys, agents, loadFailed })

  return (
    <Tooltip title={`${status.detail}。点击打开项目设置。`}>
      <Button
        type="text"
        size="small"
        className={`novel-workspace-source-status is-${status.kind}${status.available ? '' : ' is-unavailable'}`}
        icon={status.available ? <ApiOutlined /> : <WarningOutlined />}
        onClick={onOpenSettings}
      >
        <span>{status.label}</span>
      </Button>
    </Tooltip>
  )
}
