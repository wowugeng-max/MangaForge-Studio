import { describe, expect, test } from 'bun:test'
import { resolveBudaTools } from './buda-tool-map'

describe('Buda tool discovery', () => {
  test('prefers documented operation aliases', () => {
    const tools = [
      'listApiAgents',
      'apiClaw.createApiAgent',
      'apiClaw.listApiAgentDriveFiles',
      'apiClaw.upsertApiAgentDriveFile',
      'apiClaw.apiAgentDriveText',
      'apiClaw.createApiAgentSession',
      'apiClaw.getApiAgentSession',
      'apiClaw.postApiAgentSessionMessage',
      'apiClaw.cancelApiAgentSessionRun',
    ].map(name => ({ name, inputSchema: { type: 'object' } }))

    expect(resolveBudaTools(tools as any)).toEqual({
      listAgents: 'listApiAgents',
      createAgent: 'apiClaw.createApiAgent',
      listDriveFiles: 'apiClaw.listApiAgentDriveFiles',
      upsertDriveFile: 'apiClaw.upsertApiAgentDriveFile',
      readDriveText: 'apiClaw.apiAgentDriveText',
      createSession: 'apiClaw.createApiAgentSession',
      getSession: 'apiClaw.getApiAgentSession',
      sendSessionMessage: 'apiClaw.postApiAgentSessionMessage',
      cancelSession: 'apiClaw.cancelApiAgentSessionRun',
    })
  })

  test('rejects production when one required capability is missing', () => {
    expect(() => resolveBudaTools([
      { name: 'apiClaw.listApiAgents', inputSchema: {} },
    ] as any)).toThrow(expect.objectContaining({ code: 'MCP_CAPABILITY_MISSING' }))
  })
})
