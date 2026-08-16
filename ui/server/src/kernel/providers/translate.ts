import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readModels } from '../../model-store'
import { readProviders } from '../../provider-store'

const ENV_KEY_NAME = 'MANGAFORGE_CODEX_KEY'

function tomlString(value: string): string {
  return JSON.stringify(String(value ?? ''))
}

export function buildCodexConfigToml(input: {
  provider: { id: string; api_format: string; default_base_url: string; custom_headers?: Record<string, string> }
  model: { model_name: string; reasoning_effort?: string }
  agents: Array<{ name: string; configFile: string }>
  supportsChatWireApi: boolean
}): { ok: true; toml: string } | { ok: false; error_code: 'PROVIDER_TRANSLATE_FAILED'; message: string } {
  const { provider, model, agents, supportsChatWireApi } = input
  let wireApi: 'responses' | 'chat'
  if (provider.api_format === 'codex_responses') wireApi = 'responses'
  else if (provider.api_format === 'openai_compatible') {
    if (!supportsChatWireApi) {
      return { ok: false, error_code: 'PROVIDER_TRANSLATE_FAILED', message: `provider ${provider.id} needs wire_api="chat" but the pinned codex release does not support it` }
    }
    wireApi = 'chat'
  } else {
    return { ok: false, error_code: 'PROVIDER_TRANSLATE_FAILED', message: `unsupported api_format: ${provider.api_format}` }
  }

  const lines: string[] = [
    `model = ${tomlString(model.model_name)}`,
    `model_provider = ${tomlString(provider.id)}`,
  ]
  if (model.reasoning_effort) lines.push(`model_reasoning_effort = ${tomlString(model.reasoning_effort)}`)
  lines.push(
    '',
    `[model_providers.${provider.id}]`,
    `name = ${tomlString(provider.id)}`,
    `base_url = ${tomlString(provider.default_base_url)}`,
    `env_key = ${tomlString(ENV_KEY_NAME)}`,
    `wire_api = ${tomlString(wireApi)}`,
  )
  const headers = Object.entries(provider.custom_headers || {})
  if (headers.length) {
    lines.push('', `[model_providers.${provider.id}.http_headers]`)
    for (const [key, value] of headers) lines.push(`${tomlString(key)} = ${tomlString(value)}`)
  }
  for (const agent of agents) {
    lines.push('', `[agents.${agent.name}]`, `description = ${tomlString(`oh-story reviewer role ${agent.name}`)}`, `config_file = ${tomlString(agent.configFile)}`)
  }
  lines.push('', '[memories]', 'generate_memories = false', 'use_memories = false', '')
  return { ok: true, toml: lines.join('\n') }
}

export async function writeCodexHome(input: {
  workspace: string
  jobDir: string
  modelId: number
  agents: Array<{ name: string; configFile: string }>
  supportsChatWireApi: boolean
}): Promise<
  | { ok: true; configPath: string; providerId: string }
  | { ok: false; error_code: 'PROVIDER_TRANSLATE_FAILED' | 'CONTRACT_INVALID'; message: string }
> {
  const models = await readModels(input.workspace)
  const model = models.find((item: any) => Number(item.id) === Number(input.modelId))
  if (!model) return { ok: false, error_code: 'CONTRACT_INVALID', message: `model ${input.modelId} not found` }
  const providers = await readProviders(input.workspace)
  const provider = providers.find((item: any) => String(item.id) === String((model as any).provider))
  if (!provider) return { ok: false, error_code: 'PROVIDER_TRANSLATE_FAILED', message: `provider ${(model as any).provider} not found` }
  const built = buildCodexConfigToml({
    provider: provider as any,
    model: {
      model_name: String((model as any).model_name || ''),
      reasoning_effort: String((model as any).context_ui_params?.reasoning_effort || (model as any).context_ui_params?.model_reasoning_effort || '').trim() || undefined,
    },
    agents: input.agents,
    supportsChatWireApi: input.supportsChatWireApi,
  })
  if (!built.ok) return built
  const homeDir = join(input.jobDir, 'codex-home')
  mkdirSync(homeDir, { recursive: true })
  const configPath = join(homeDir, 'config.toml')
  writeFileSync(configPath, built.toml)
  return { ok: true, configPath, providerId: String((provider as any).id) }
}
