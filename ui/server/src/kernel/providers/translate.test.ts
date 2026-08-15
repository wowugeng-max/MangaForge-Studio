import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildCodexConfigToml, writeCodexHome } from './translate'

const agents = [
  { name: 'story-architect', configFile: '/proj/.codex/agents/story-architect.toml' },
  { name: 'consistency-checker', configFile: '/proj/.codex/agents/consistency-checker.toml' },
]

describe('buildCodexConfigToml', () => {
  test('codex_responses -> wire_api responses with headers, agents, memories off', () => {
    const result = buildCodexConfigToml({
      provider: { id: 'jun', api_format: 'codex_responses', default_base_url: 'https://muyuan.do/v1', custom_headers: { 'User-Agent': 'Codex Desktop/0.142.0' } },
      model: { model_name: 'gpt-5.2' },
      agents, supportsChatWireApi: false,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.toml).toContain('model = "gpt-5.2"')
    expect(result.toml).toContain('model_provider = "jun"')
    expect(result.toml).toContain('wire_api = "responses"')
    expect(result.toml).toContain('env_key = "MANGAFORGE_CODEX_KEY"')
    expect(result.toml).toContain('[model_providers.jun.http_headers]')
    expect(result.toml).toContain('"User-Agent" = "Codex Desktop/0.142.0"')
    expect(result.toml).toContain('[agents.story-architect]')
    expect(result.toml).toContain('config_file = "/proj/.codex/agents/story-architect.toml"')
    expect(result.toml).toContain('generate_memories = false')
    expect(result.toml).toContain('use_memories = false')
  })

  test('openai_compatible without chat support -> PROVIDER_TRANSLATE_FAILED', () => {
    const result = buildCodexConfigToml({
      provider: { id: 'gemini', api_format: 'openai_compatible', default_base_url: 'https://goai.example/v1' },
      model: { model_name: 'gemini-3.5-flash' }, agents, supportsChatWireApi: false,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error_code).toBe('PROVIDER_TRANSLATE_FAILED')
  })

  test('openai_compatible with pinned chat support -> wire_api chat', () => {
    const result = buildCodexConfigToml({
      provider: { id: 'gemini', api_format: 'openai_compatible', default_base_url: 'https://goai.example/v1' },
      model: { model_name: 'gemini-3.5-flash' }, agents, supportsChatWireApi: true,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.toml).toContain('wire_api = "chat"')
  })
})

describe('writeCodexHome', () => {
  test('resolves model->provider from workspace stores and writes config.toml', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'translate-ws-'))
    writeFileSync(join(ws, 'providers.json'), JSON.stringify([
      { id: 'any', display_name: 'anyrouter', service_type: 'llm', api_format: 'codex_responses', auth_type: 'bearer', response_mode: 'stream', supported_modalities: ['chat'], default_base_url: 'https://anyrouter.top/v1', is_active: true, icon: '', endpoints: {}, custom_headers: {} },
    ]))
    writeFileSync(join(ws, 'models.json'), JSON.stringify([
      { id: 217, api_key_id: 5, provider: 'any', display_name: 'm', model_name: 'gpt-5.2', capabilities: { chat: true }, health_status: 'healthy' },
    ]))
    const jobDir = mkdtempSync(join(tmpdir(), 'translate-job-'))
    const result = await writeCodexHome({ workspace: ws, jobDir, modelId: 217, agents, supportsChatWireApi: false })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.providerId).toBe('any')
    expect(existsSync(result.configPath)).toBe(true)
    expect(readFileSync(result.configPath, 'utf8')).toContain('model_provider = "any"')
  })

  test('unknown model id -> CONTRACT_INVALID error shape', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'translate-ws-'))
    writeFileSync(join(ws, 'providers.json'), '[]')
    writeFileSync(join(ws, 'models.json'), '[]')
    const result = await writeCodexHome({ workspace: ws, jobDir: mkdtempSync(join(tmpdir(), 'translate-job-')), modelId: 999, agents: [], supportsChatWireApi: false })
    expect(result.ok).toBe(false)
  })
})
