import React, { useEffect, useState } from 'react'
import { ApiOutlined, WarningOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import {
  mcpApi,
  type ChapterGenerationSourceState,
  type McpAgentSummary,
  type McpPublicKey,
  type McpServerRecord,
} from '../../api/mcp'
import {
  buildMcpSourceStatus,
  loadMcpSourceStatusMetadata,
} from './mcpGenerationSourceStatusModel'

type McpBinding = NonNullable<ChapterGenerationSourceState['mcp']>

export function McpGenerationSourceStatus({
  projectId,
  binding,
  active,
  compact,
  disabled,
  onOpenSettings,
}: {
  projectId: number
  binding: McpBinding
  active: boolean
  compact: boolean
  disabled?: boolean
  onOpenSettings: () => void
}) {
  const [servers, setServers] = useState<McpServerRecord[]>([])
  const [keys, setKeys] = useState<McpPublicKey[]>([])
  const [agents, setAgents] = useState<McpAgentSummary[]>([])
  const [loadFailed, setLoadFailed] = useState(false)
  const bindingIdentity = [
    binding.server_id,
    binding.key_id,
    binding.adapter_id,
    binding.agent_id,
    binding.model,
  ].join('\u0000')

  useEffect(() => {
    if (!projectId) return
    let current = true
    setLoadFailed(false)
    setServers([])
    setKeys([])
    setAgents([])
    void loadMcpSourceStatusMetadata({
      binding,
      isActive: () => current,
      loadServers: async () => (await mcpApi.listServers()).data || [],
      loadKeys: async () => (await mcpApi.listKeys()).data || [],
      loadAgents: async controlledBinding => {
        const response = await mcpApi.listProjectAgents(
          projectId,
          controlledBinding.server_id,
          controlledBinding.key_id,
        )
        return response.data.agents || []
      },
    }).then(metadata => {
      if (!metadata || !current) return
      setServers(metadata.servers)
      setKeys(metadata.keys)
      setAgents(metadata.agents)
      setLoadFailed(metadata.loadFailed)
    }).catch(() => {
      if (current) setLoadFailed(true)
    })
    return () => { current = false }
  }, [projectId, bindingIdentity])

  const status = buildMcpSourceStatus({ binding, active, servers, keys, agents, loadFailed })
  return (
    <Tooltip title={`${status.detail}。点击打开项目设置。`}>
      <Button
        aria-label={status.detail}
        type="text"
        size="small"
        disabled={disabled}
        className={`novel-workspace-source-status is-mcp${active ? ' is-active' : ' is-inactive'}${status.available ? '' : ' is-unavailable'}`}
        icon={status.available ? <ApiOutlined /> : <WarningOutlined />}
        onClick={onOpenSettings}
      >
        <span>{compact ? `${binding.server_id} MCP · ${active ? '已启用' : '已停用'}` : status.label}</span>
      </Button>
    </Tooltip>
  )
}
