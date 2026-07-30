import { McpError } from '../../mcp/errors'
import { resolveProseGenerationSource } from './source-config'
import type { GenerationSource } from './types'

export function createGenerationSourceResolver(input: {
  modelSource: GenerationSource
  mcpSource?: GenerationSource
}) {
  return {
    resolve(project: any, options: any = {}) {
      const configured = resolveProseGenerationSource(project)
      const override = options?.generation_source_override === 'model' ? 'model' : null
      if (override === 'model' || configured.type === 'model') {
        return {
          source: input.modelSource,
          configured_type: configured.type,
          resolved_type: 'model' as const,
          override,
        }
      }
      if (!input.mcpSource) {
        throw new McpError('MCP_BINDING_INVALID', '服务端未配置 MCP Runtime，无法执行项目绑定的 MCP 正文源')
      }
      return {
        source: input.mcpSource,
        configured_type: configured.type,
        resolved_type: 'mcp' as const,
        override,
      }
    },
  }
}
