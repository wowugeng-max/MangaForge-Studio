import { describe, expect, test } from 'bun:test'
import { resolveBudaTools } from './buda-tool-map'
import * as budaToolMap from './buda-tool-map'

const buildBudaToolArguments = (budaToolMap as any).buildBudaToolArguments
  || ((_operation: string, _toolName: string, args: Record<string, unknown>) => args)

describe('Buda tool discovery', () => {
  test('the stage-production source never resolves sendSessionMessage', () => {
    const resolvedToolCapabilities = Object.keys(resolveBudaTools([
      'api_claw_list_api_agents',
      'api_claw_create_api_agent',
      'api_claw_list_api_agent_drive_files',
      'api_claw_upsert_api_agent_drive_file',
      'api_claw_api_agent_drive_text',
      'api_claw_create_api_agent_session',
      'api_claw_get_api_agent_session',
      'api_claw_post_api_agent_session_message',
      'api_claw_cancel_api_agent_session_run',
    ].map(name => ({ name, inputSchema: { type: 'object' } })) as any))
    expect(resolvedToolCapabilities).not.toContain('sendSessionMessage')
  })

  test('maps the live Buda snake-case MCP tool names', () => {
    const tools = [
      'api_claw_list_api_agents',
      'api_claw_create_api_agent',
      'api_claw_list_api_agent_drive_files',
      'api_claw_upsert_api_agent_drive_file',
      'api_claw_api_agent_drive_text',
      'api_claw_create_api_agent_session',
      'api_claw_get_api_agent_session',
      'api_claw_post_api_agent_session_message',
      'api_claw_cancel_api_agent_session_run',
    ].map(name => ({ name, inputSchema: { type: 'object' } }))

    expect(resolveBudaTools(tools as any)).toEqual({
      listAgents: 'api_claw_list_api_agents',
      createAgent: 'api_claw_create_api_agent',
      listDriveFiles: 'api_claw_list_api_agent_drive_files',
      upsertDriveFile: 'api_claw_upsert_api_agent_drive_file',
      readDriveText: 'api_claw_api_agent_drive_text',
      createSession: 'api_claw_create_api_agent_session',
      getSession: 'api_claw_get_api_agent_session',
      cancelSession: 'api_claw_cancel_api_agent_session_run',
    })
  })

  test('wraps live Buda arguments in the advertised OpenAPI params and body envelopes', () => {
    expect(buildBudaToolArguments('listDriveFiles', 'api_claw_list_api_agent_drive_files', {
      agentId: 'agent-1',
      path: '/mangaforge',
    })).toEqual({ params: { agentId: 'agent-1' }, query: { path: '/mangaforge' } })
    expect(buildBudaToolArguments('upsertDriveFile', 'api_claw_upsert_api_agent_drive_file', {
      agentId: 'agent-1',
      path: '/mangaforge/story.md',
      content: 'story',
      mimeType: 'text/markdown',
    })).toEqual({
      params: { agentId: 'agent-1' },
      body: { path: '/mangaforge/story.md', content: 'story', mimeType: 'text/markdown' },
    })
    expect(buildBudaToolArguments('readDriveText', 'api_claw_api_agent_drive_text', {
      agentId: 'agent-1',
      filePath: '/mangaforge/story.md',
      maxBytes: 5_000_000,
    })).toEqual({
      params: { agentId: 'agent-1' },
      body: { filePath: '/mangaforge/story.md', maxBytes: 5_000_000 },
    })
    expect(buildBudaToolArguments('createSession', 'api_claw_create_api_agent_session', {
      agentId: 'agent-1',
      message: 'prepare',
      title: 'chapter',
      mode: 'agent',
      startRun: false,
    })).toEqual({
      params: { agentId: 'agent-1' },
      body: { message: 'prepare', title: 'chapter', mode: 'agent', startRun: false },
    })
    expect(buildBudaToolArguments('getSession', 'api_claw_get_api_agent_session', {
      agentId: 'agent-1',
      sessionId: 'session-1',
    })).toEqual({ params: { agentId: 'agent-1', sessionId: 'session-1' } })
    expect(buildBudaToolArguments('cancelSession', 'api_claw_cancel_api_agent_session_run', {
      agentId: 'agent-1',
      sessionId: 'session-1',
    })).toEqual({ params: { agentId: 'agent-1', sessionId: 'session-1' } })
    expect(buildBudaToolArguments('createAgent', 'api_claw_create_api_agent', {
      spaceId: 'space-1',
      name: 'Writer',
      emoji: '✍️',
      instructions: 'Write novels.',
    })).toEqual({ body: { spaceId: 'space-1', name: 'Writer', emoji: '✍️', instructions: 'Write novels.' } })
  })

  for (const model of ['claude-sonnet', ''] as const) {
    test(`${model ? 'preserves an explicit model' : 'fully omits Auto model'} in live Session envelopes`, () => {
      const modelArguments = model ? { model } : {}
      const created = buildBudaToolArguments('createSession', 'api_claw_create_api_agent_session', {
        agentId: 'agent-1',
        message: 'prepare',
        mode: 'agent',
        ...modelArguments,
        startRun: false,
      })
      expect(Object.prototype.hasOwnProperty.call(created.body, 'model')).toBe(Boolean(model))
      if (model) {
        expect(created.body.model).toBe(model)
      }
    })
  }

  test('keeps legacy Buda tool arguments flat', () => {
    const args = { agentId: 'agent-1', sessionId: 'session-1' }
    expect(buildBudaToolArguments('getSession', 'apiClaw.getApiAgentSession', args)).toEqual(args)
  })

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
      cancelSession: 'apiClaw.cancelApiAgentSessionRun',
    })
  })

  test('rejects production when one required capability is missing', () => {
    expect(() => resolveBudaTools([
      { name: 'apiClaw.listApiAgents', inputSchema: {} },
    ] as any)).toThrow(expect.objectContaining({ code: 'MCP_CAPABILITY_MISSING' }))
  })

  test('does not require Agent creation capability for normal generation', () => {
    const tools = [
      'apiClaw.listApiAgents',
      'apiClaw.listApiAgentDriveFiles',
      'apiClaw.upsertApiAgentDriveFile',
      'apiClaw.apiAgentDriveText',
      'apiClaw.createApiAgentSession',
      'apiClaw.getApiAgentSession',
      'apiClaw.postApiAgentSessionMessage',
      'apiClaw.cancelApiAgentSessionRun',
    ].map(name => ({ name, inputSchema: { type: 'object' } }))

    expect(resolveBudaTools(tools as any)).not.toHaveProperty('createAgent')
    expect(() => resolveBudaTools(tools as any, { requireCreateAgent: true })).toThrow(expect.objectContaining({
      code: 'MCP_CAPABILITY_MISSING',
    }))
  })
})
