import { describe, expect, test } from 'bun:test'
import apiClient from '../../api/client'
import { chapterSourceApi, type ChapterGenerationSourceView } from '../../api/mcp'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  confirmedAuthorityState,
  createChapterSourceOperationFence,
  StaleChapterSourceOperationError,
} from './chapterGenerationSourceModel'
import {
  buildEditorRevisionConfigPayload,
  isEditorRevisionTimeoutValid,
  isStoryStateMaxTokensValid,
  normalizeProjectEditorRevisionTimeout,
  normalizeProjectStoryStateMaxTokens,
} from './ProjectSettingsModal'

describe('project settings editor revision timeout', () => {
  test('hydrates defaults and builds the dedicated API payload', () => {
    expect(normalizeProjectEditorRevisionTimeout(undefined)).toBe(600)
    expect(normalizeProjectEditorRevisionTimeout(420.9)).toBe(420)
    expect(normalizeProjectEditorRevisionTimeout(900)).toBe(600)
    expect(buildEditorRevisionConfigPayload(420, 12000)).toEqual({
      config: { timeout_seconds: 420, story_state_max_tokens: 12000 },
    })
  })

  test('normalizes and validates the story state output budget', () => {
    expect(normalizeProjectStoryStateMaxTokens(undefined)).toBe(9000)
    expect(normalizeProjectStoryStateMaxTokens(300000)).toBe(262144)
    expect(isStoryStateMaxTokensValid(1000)).toBe(true)
    expect(isStoryStateMaxTokensValid(64000.5)).toBe(false)
  })

  test('rejects blank, fractional, and out-of-range user input', () => {
    expect(isEditorRevisionTimeoutValid(null)).toBe(false)
    expect(isEditorRevisionTimeoutValid(59)).toBe(false)
    expect(isEditorRevisionTimeoutValid(420.5)).toBe(false)
    expect(isEditorRevisionTimeoutValid(600)).toBe(true)
    expect(() => buildEditorRevisionConfigPayload(601, 12000)).toThrow('invalid editor revision timeout')
    expect(() => buildEditorRevisionConfigPayload(420, 999)).toThrow('invalid story state max tokens')
  })

  test('wires project settings into the top-bar menu and dedicated endpoints', () => {
    const modal = readFileSync(join(import.meta.dir, 'ProjectSettingsModal.tsx'), 'utf8')
    const topbar = readFileSync(join(import.meta.dir, 'shell/workspace-topbar.tsx'), 'utf8')
    expect(topbar).toContain("label: '项目设置'")
    expect(topbar).toContain('<ProjectSettingsModal')
    expect(modal).toContain('/editor-revision-config')
    expect(modal).toContain('单次模型调用超时')
    expect(modal).toContain('min={60}')
    expect(modal).toContain('max={600}')
    expect(modal).toContain('故事状态输出上限')
    expect(modal).toContain('min={1000}')
    expect(modal).toContain('max={262144}')
    expect(modal).toContain('step={512}')
    expect(modal).toContain('> 64_000')
  })

  test('keeps save disabled when the current project setting fails to load', () => {
    const modal = readFileSync(join(import.meta.dir, 'ProjectSettingsModal.tsx'), 'utf8')
    expect(modal).toContain('const [loadFailed, setLoadFailed]')
    expect(modal).toContain('setLoadFailed(true)')
    expect(modal).toContain('disabled={loading || loadFailed ||')
  })

  test('mounts one shared authority control before the MCP binding section', () => {
    const modal = readFileSync(join(import.meta.dir, 'ProjectSettingsModal.tsx'), 'utf8')
    const panel = readFileSync(join(import.meta.dir, 'McpGenerationSourcePanel.tsx'), 'utf8')
    const topbar = readFileSync(join(import.meta.dir, 'shell/workspace-topbar.tsx'), 'utf8')
    const controlIndex = modal.indexOf('<ChapterGenerationSourceControl')
    const dividerIndex = modal.indexOf('<Divider', controlIndex)
    const panelIndex = modal.indexOf('<McpGenerationSourcePanel', dividerIndex)
    expect(controlIndex).toBeGreaterThan(0)
    expect(modal).toContain('当前章节来源')
    expect(dividerIndex).toBeGreaterThan(controlIndex)
    expect(modal).toContain('MCP 绑定配置')
    expect(panelIndex).toBeGreaterThan(dividerIndex)
    expect(panel).toContain('测试绑定')
    expect(panel).toContain('保存绑定')
    expect(panel).toContain('新建 MangaForge Agent')
    expect(panel).toContain('await actions.createAgent({')
    const createAgentHandler = panel.slice(panel.indexOf('  const createAgent = async () => {'), panel.indexOf('\n\n  if (loading)'))
    expect(createAgentHandler).not.toContain("    setBindingError('')")
    expect(createAgentHandler).toContain("onStarted: () => setBindingError('')")
    expect(panel).toContain('Popconfirm')
    expect(panel).toContain('MCP 区域加载失败')
    expect(panel).not.toContain('if (loadError) return')
    const metadataEffect = panel.slice(panel.indexOf('  useEffect(() => {'), panel.indexOf('  const selectServer'))
    expect(metadataEffect).toContain('setServers([])')
    expect(metadataEffect).toContain('setKeys([])')
    expect(metadataEffect).toContain('setAgents([])')
    expect(panel).toContain('Buda 模型')
    expect(panel).toContain('Auto（Buda / Agent 默认）')
    expect(panel).toContain('placeholder="例如：账号支持的模型标识"')
    expect(panel).toContain('保存绑定不会启用 MCP；章节来源需单独切换')
    expect(panel).not.toContain('<Radio.Group')
    expect(panel).not.toContain('value="model"')
    expect(topbar).toContain('<ChapterGenerationSourceControl')
    expect(topbar).not.toContain('<McpGenerationSourceStatus')
    expect(topbar).not.toContain('className="novel-workspace-model-select"')
    expect(topbar).toContain('onOpenSettings={() => setProjectSettingsOpen(true)}')
  })
})

function sourceView(active: 'model' | 'mcp' = 'model'): ChapterGenerationSourceView {
  const mcp = {
    server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent-1', model: 'model-x',
  }
  return {
    ok: true,
    source: { version: 'chapter_generation_source_v1', active, model: { model_id: 217 }, mcp },
    fingerprint: `sha256:${active === 'model' ? '1'.repeat(64) : '2'.repeat(64)}`,
    locked: false,
    display: { active, model_id: 217, mcp },
  }
}

async function sourceFailure(kind: 'transport' | 'definite', code = 'GENERATION_SOURCE_BUSY') {
  const original = apiClient.put
  ;(apiClient as any).put = kind === 'transport'
    ? async () => { throw new Error('private transport cause') }
    : async () => ({ status: 409, data: { error_code: code, error: 'private server cause' } })
  try {
    await chapterSourceApi.saveMcp(999, sourceView().source.mcp!)
  } catch (error) {
    return error
  } finally {
    ;(apiClient as any).put = original
  }
  throw new Error('expected failure')
}

describe('MCP binding panel authoritative callers', () => {
  test('aborts superseded panel metadata requests so late key responses cannot overwrite the latest binding', async () => {
    const panel = await import('./McpGenerationSourcePanel') as Record<string, any>
    expect(typeof panel.createMcpPanelRequestGate).toBe('function')
    if (typeof panel.createMcpPanelRequestGate !== 'function') return
    const gate = panel.createMcpPanelRequestGate()
    const first = gate.begin()
    expect(first.signal.aborted).toBe(false)
    const second = gate.begin()
    expect(first.signal.aborted).toBe(true)
    expect(gate.isCurrent(first)).toBe(false)
    expect(gate.isCurrent(second)).toBe(true)
    gate.invalidate()
    expect(second.signal.aborted).toBe(true)
    expect(gate.isCurrent(second)).toBe(false)
  })

  test('invalidates panel action tokens permanently on unmount', async () => {
    const panel = await import('./McpGenerationSourcePanel') as Record<string, any>
    expect(typeof panel.createMcpPanelLifecycleGate).toBe('function')
    if (typeof panel.createMcpPanelLifecycleGate !== 'function') return
    const lifecycle = panel.createMcpPanelLifecycleGate()
    const token = lifecycle.begin()
    expect(() => lifecycle.assertCurrent(token)).not.toThrow()
    lifecycle.unmount()
    expect(() => lifecycle.assertCurrent(token)).toThrow()
    expect(() => lifecycle.begin()).toThrow()
  })

  test('silently drops a binding action whose shared project token is stale before begin', async () => {
    const panel = await import('./McpGenerationSourcePanel') as Record<string, any>
    expect(typeof panel.createMcpGenerationSourcePanelActions).toBe('function')
    if (typeof panel.createMcpGenerationSourcePanelActions !== 'function') return
    let calls = 0
    const notifications: string[] = []
    const actions = panel.createMcpGenerationSourcePanelActions({
      projectId: 1,
      getAuthority: () => confirmedAuthorityState(sourceView()),
      beginSourceOperation: () => { throw new StaleChapterSourceOperationError() },
      assertSourceOperationCurrent: () => {},
      onAuthorityChange: () => {},
      onTestedFingerprintChange: () => {},
      onPendingChange: () => {},
      notifySuccess: text => notifications.push(text),
      notifyError: text => notifications.push(text),
      api: { testMcp: async () => { calls += 1; return { ok: true } } },
    })
    await expect(actions.testBinding(sourceView().source.mcp!, 'fingerprint')).resolves.toBeUndefined()
    expect({ calls, notifications }).toEqual({ calls: 0, notifications: [] })
  })

  test('creates an Agent behind the shared fence and drops same-project reload side effects', async () => {
    const panel = await import('./McpGenerationSourcePanel') as Record<string, any>
    const fence = createChapterSourceOperationFence()
    fence.enterProject(1, 101)
    let resolveCreate!: (agent: { id: string }) => void
    const createRequest = new Promise<{ id: string }>(resolve => { resolveCreate = resolve })
    let pending = false
    let refreshCalls = 0
    let confirmedAgentId = ''
    const notifications: string[] = []
    const actions = panel.createMcpGenerationSourcePanelActions({
      projectId: 1,
      getAuthority: () => confirmedAuthorityState(sourceView()),
      beginSourceOperation: () => fence.begin(1, 101),
      assertSourceOperationCurrent: (token: any) => fence.assertCurrent(token),
      onAuthorityChange: () => {},
      onTestedFingerprintChange: () => {},
      onPendingChange: (value: boolean) => { pending = value },
      notifySuccess: text => notifications.push(text),
      notifyError: text => notifications.push(text),
    })
    expect(typeof actions.createAgent).toBe('function')
    if (typeof actions.createAgent !== 'function') return

    const operation = actions.createAgent({
      request: () => createRequest,
      refreshAgents: async () => { refreshCalls += 1; return true },
      onAgentConfirmed: (id: string) => { confirmedAgentId = id },
    })
    expect(pending).toBe(true)
    fence.enterProject(1, 102)
    pending = false
    resolveCreate({ id: 'stale-agent' })
    await operation

    expect({ pending, refreshCalls, confirmedAgentId, notifications }).toEqual({
      pending: false,
      refreshCalls: 0,
      confirmedAgentId: '',
      notifications: [],
    })
  })

  test('drops a pending Agent result after panel unmount without refresh, setters, or notifications', async () => {
    const panel = await import('./McpGenerationSourcePanel') as Record<string, any>
    expect(typeof panel.createMcpPanelLifecycleGate).toBe('function')
    if (typeof panel.createMcpPanelLifecycleGate !== 'function') return
    const sourceFence = createChapterSourceOperationFence()
    sourceFence.enterProject(1, 101)
    const lifecycle = panel.createMcpPanelLifecycleGate()
    let resolveCreate!: (agent: { id: string }) => void
    const createRequest = new Promise<{ id: string }>(resolve => { resolveCreate = resolve })
    let pending = false
    const pendingTransitions: boolean[] = []
    let started = 0
    let refreshCalls = 0
    let confirmedAgentId = ''
    const notifications: string[] = []
    const actions = panel.createMcpGenerationSourcePanelActions({
      projectId: 1,
      getAuthority: () => confirmedAuthorityState(sourceView()),
      beginSourceOperation: () => sourceFence.begin(1, 101),
      assertSourceOperationCurrent: (token: any) => sourceFence.assertCurrent(token),
      beginPanelLifecycle: () => lifecycle.begin(),
      assertPanelLifecycleCurrent: (token: any) => lifecycle.assertCurrent(token),
      onAuthorityChange: () => {},
      onTestedFingerprintChange: () => {},
      onPendingChange: (value: boolean) => { pending = value; pendingTransitions.push(value) },
      notifySuccess: text => notifications.push(text),
      notifyError: text => notifications.push(text),
    })
    const operation = actions.createAgent({
      request: () => createRequest,
      onStarted: () => { started += 1 },
      refreshAgents: async () => { refreshCalls += 1; return true },
      onAgentConfirmed: (id: string) => { confirmedAgentId = id },
    })
    expect({ pending, started }).toEqual({ pending: true, started: 1 })
    lifecycle.unmount()
    resolveCreate({ id: 'stale-agent' })
    await operation
    expect({ pending, pendingTransitions, refreshCalls, confirmedAgentId, notifications }).toEqual({
      pending: false,
      pendingTransitions: [true, false],
      refreshCalls: 0,
      confirmedAgentId: '',
      notifications: [],
    })
  })

  test('calls the chapter MCP test endpoint with {mcp} and never legacy source callers', async () => {
    const panel = await import('./McpGenerationSourcePanel') as Record<string, any>
    expect(typeof panel.createMcpGenerationSourcePanelActions).toBe('function')
    if (typeof panel.createMcpGenerationSourcePanelActions !== 'function') return
    const binding = sourceView().source.mcp!
    const calls: Array<[string, unknown]> = []
    const fence = createChapterSourceOperationFence()
    fence.enterProject(1, 101)
    let tested = ''
    let legacyCalls = 0
    const actions = panel.createMcpGenerationSourcePanelActions({
      projectId: 1,
      getAuthority: () => confirmedAuthorityState(sourceView()),
      beginSourceOperation: () => fence.begin(1, 101),
      assertSourceOperationCurrent: (token: any) => fence.assertCurrent(token),
      onAuthorityChange: () => {},
      onTestedFingerprintChange: (value: string) => { tested = value },
      onPendingChange: () => {},
      notifySuccess: () => {},
      notifyError: () => {},
      api: {
        testMcp: async (projectId: number, mcp: unknown) => {
          calls.push(['testMcp', { projectId, body: { mcp } }])
          return { ok: true }
        },
        testProjectSource: async () => { legacyCalls += 1 },
        saveProjectSource: async () => { legacyCalls += 1 },
      },
    })
    await actions.testBinding(binding, 'fingerprint-1')
    expect(calls).toEqual([['testMcp', { projectId: 1, body: { mcp: binding } }]])
    expect(tested).toBe('fingerprint-1')
    expect(legacyCalls).toBe(0)
  })

  test('shows a fixed MCP test failure without exposing the underlying cause', async () => {
    const panel = await import('./McpGenerationSourcePanel') as Record<string, any>
    expect(typeof panel.createMcpGenerationSourcePanelActions).toBe('function')
    if (typeof panel.createMcpGenerationSourcePanelActions !== 'function') return
    const fence = createChapterSourceOperationFence()
    fence.enterProject(1, 101)
    const errors: string[] = []
    const actions = panel.createMcpGenerationSourcePanelActions({
      projectId: 1,
      getAuthority: () => confirmedAuthorityState(sourceView()),
      beginSourceOperation: () => fence.begin(1, 101),
      assertSourceOperationCurrent: (token: any) => fence.assertCurrent(token),
      onAuthorityChange: () => {},
      onTestedFingerprintChange: () => {},
      onPendingChange: () => {},
      notifySuccess: () => {},
      notifyError: text => errors.push(text),
      api: { testMcp: async () => { throw new Error('private provider failure cause') } },
    })
    await actions.testBinding(sourceView().source.mcp!, 'fingerprint')
    expect(errors).toEqual(['MCP 绑定测试失败'])
    expect(errors.join(' ')).not.toContain('private provider')
  })

  test('saveMcp updates controlled authority without activating MCP', async () => {
    const panel = await import('./McpGenerationSourcePanel') as Record<string, any>
    expect(typeof panel.createMcpGenerationSourcePanelActions).toBe('function')
    if (typeof panel.createMcpGenerationSourcePanelActions !== 'function') return
    const binding = sourceView().source.mcp!
    const response = sourceView('model')
    let authority = confirmedAuthorityState(sourceView('model'))
    const calls: Array<[string, unknown]> = []
    const fence = createChapterSourceOperationFence()
    fence.enterProject(1, 101)
    const actions = panel.createMcpGenerationSourcePanelActions({
      projectId: 1,
      getAuthority: () => authority,
      beginSourceOperation: () => fence.begin(1, 101),
      assertSourceOperationCurrent: (token: any) => fence.assertCurrent(token),
      onAuthorityChange: (next: any) => { authority = next },
      onTestedFingerprintChange: () => {},
      onPendingChange: () => {},
      notifySuccess: () => {},
      notifyError: () => {},
      api: {
        saveMcp: async (projectId: number, mcp: unknown) => {
          calls.push(['saveMcp', { projectId, body: { mcp } }])
          return response
        },
        get: async () => { throw new Error('GET must not run after a definite response') },
        activate: async () => { throw new Error('save binding must not activate MCP') },
      },
    })
    await actions.saveBinding(binding)
    expect(calls).toEqual([['saveMcp', { projectId: 1, body: { mcp: binding } }]])
    expect(authority.source?.source.active).toBe('model')
  })

  test('finishes authoritative save success and one-GET reconciliation after panel unmount', async () => {
    const panel = await import('./McpGenerationSourcePanel') as Record<string, any>
    const transport = await sourceFailure('transport')
    for (const scenario of ['definitive', 'transport'] as const) {
      const sourceFence = createChapterSourceOperationFence()
      sourceFence.enterProject(1, 101)
      const lifecycle = panel.createMcpPanelLifecycleGate()
      let authority = confirmedAuthorityState(sourceView('model'))
      let resolveMutation!: (source: ChapterGenerationSourceView) => void
      const mutation = new Promise<ChapterGenerationSourceView>(resolve => { resolveMutation = resolve })
      let reads = 0
      const pendingTransitions: boolean[] = []
      const notifications: string[] = []
      const actions = panel.createMcpGenerationSourcePanelActions({
        projectId: 1,
        getAuthority: () => authority,
        beginSourceOperation: () => sourceFence.begin(1, 101),
        assertSourceOperationCurrent: (token: any) => sourceFence.assertCurrent(token),
        beginPanelLifecycle: () => lifecycle.begin(),
        assertPanelLifecycleCurrent: (token: any) => lifecycle.assertCurrent(token),
        onAuthorityChange: (next: any) => { authority = next },
        onTestedFingerprintChange: () => {},
        onPendingChange: (value: boolean) => pendingTransitions.push(value),
        notifySuccess: text => notifications.push(text),
        notifyError: text => notifications.push(text),
        api: {
          saveMcp: async () => {
            if (scenario === 'transport') throw transport
            return mutation
          },
          get: async () => { reads += 1; return sourceView('mcp') },
        },
      })
      const operation = actions.saveBinding(sourceView().source.mcp!)
      lifecycle.unmount()
      if (scenario === 'definitive') resolveMutation(sourceView('mcp'))
      await operation
      expect({
        scenario,
        active: authority.source?.source.active,
        reads,
        pendingTransitions,
        notifications,
      }).toEqual({
        scenario,
        active: 'mcp',
        reads: scenario === 'transport' ? 1 : 0,
        pendingTransitions: [true, false],
        notifications: [],
      })
    }
  })

  test('saveMcp definite failure preserves confirmed authority and performs zero GETs', async () => {
    const panel = await import('./McpGenerationSourcePanel') as Record<string, any>
    expect(typeof panel.createMcpGenerationSourcePanelActions).toBe('function')
    if (typeof panel.createMcpGenerationSourcePanelActions !== 'function') return
    const definite = await sourceFailure('definite', 'GENERATION_SOURCE_BUSY')
    const initial = confirmedAuthorityState(sourceView('model'))
    let authority = initial
    let reads = 0
    const errors: string[] = []
    const fence = createChapterSourceOperationFence()
    fence.enterProject(1, 101)
    const actions = panel.createMcpGenerationSourcePanelActions({
      projectId: 1,
      getAuthority: () => authority,
      beginSourceOperation: () => fence.begin(1, 101),
      assertSourceOperationCurrent: (token: any) => fence.assertCurrent(token),
      onAuthorityChange: (next: any) => { authority = next },
      onTestedFingerprintChange: () => {},
      onPendingChange: () => {},
      notifySuccess: () => {},
      notifyError: text => errors.push(text),
      api: {
        saveMcp: async () => { throw definite },
        get: async () => { reads += 1; return sourceView('mcp') },
      },
    })
    await actions.saveBinding(sourceView().source.mcp!)
    expect(authority).toBe(initial)
    expect(reads).toBe(0)
    expect(errors).toEqual(['章节来源正在被生成任务使用，请等待当前任务结束后再修改'])
  })

  test('saveMcp performs one ambiguous reconciliation, enters unknown, and uses one explicit shared refresh to recover', async () => {
    const panel = await import('./McpGenerationSourcePanel') as Record<string, any>
    const control = await import('./ChapterGenerationSourceControl') as Record<string, any>
    expect(typeof panel.createMcpGenerationSourcePanelActions).toBe('function')
    expect(typeof control.createChapterGenerationSourceActions).toBe('function')
    if (typeof panel.createMcpGenerationSourcePanelActions !== 'function'
      || typeof control.createChapterGenerationSourceActions !== 'function') return
    const transport = await sourceFailure('transport')
    let authority = confirmedAuthorityState(sourceView('model'))
    let saveCalls = 0
    let reads = 0
    let recover = false
    const fence = createChapterSourceOperationFence()
    fence.enterProject(1, 101)
    const common = {
      projectId: 1,
      getAuthority: () => authority,
      beginSourceOperation: () => fence.begin(1, 101),
      assertSourceOperationCurrent: (token: any) => fence.assertCurrent(token),
      onAuthorityChange: (next: any) => { authority = next },
      onPendingChange: () => {},
      notifyError: () => {},
      api: {
        saveMcp: async () => { saveCalls += 1; throw transport },
        get: async () => {
          reads += 1
          if (!recover) throw new Error('private authority cause')
          return sourceView('mcp')
        },
      },
    }
    const panelActions = panel.createMcpGenerationSourcePanelActions({
      ...common,
      onTestedFingerprintChange: () => {},
      notifySuccess: () => {},
    })
    await panelActions.saveBinding(sourceView().source.mcp!)
    expect({ saveCalls, reads }).toEqual({ saveCalls: 1, reads: 1 })
    expect(authority.authorityUnknown).toBe(true)

    recover = true
    const controlActions = control.createChapterGenerationSourceActions({
      ...common,
      selectedModelId: 217,
      onSelectedModelConfirmed: () => {},
      onOpenSettings: () => {},
    })
    await controlActions.refresh()
    expect({ saveCalls, reads }).toEqual({ saveCalls: 1, reads: 2 })
    expect(authority.authorityUnknown).toBe(false)
    expect(authority.source?.source.active).toBe('mcp')
  })

  test('drops stale save success, definite error, and reconciliation outcomes after switching projects', async () => {
    const panel = await import('./McpGenerationSourcePanel') as Record<string, any>
    expect(typeof panel.createMcpGenerationSourcePanelActions).toBe('function')
    if (typeof panel.createMcpGenerationSourcePanelActions !== 'function') return
    for (const scenario of ['mutation_success', 'http_error', 'reconcile_success', 'reconcile_failure']) {
      let resolveMutation!: (value: ChapterGenerationSourceView) => void
      let rejectMutation!: (error: unknown) => void
      let resolveRead!: (value: ChapterGenerationSourceView) => void
      let rejectRead!: (error: unknown) => void
      const mutation = new Promise<ChapterGenerationSourceView>((resolve, reject) => {
        resolveMutation = resolve
        rejectMutation = reject
      })
      const read = new Promise<ChapterGenerationSourceView>((resolve, reject) => {
        resolveRead = resolve
        rejectRead = reject
      })
      const transport = await sourceFailure('transport')
      const definite = await sourceFailure('definite', 'MCP_BINDING_INVALID')
      const fence = createChapterSourceOperationFence()
      fence.enterProject(1, 101)
      let authority: any = confirmedAuthorityState(sourceView('model'))
      let authorityProject = 'A'
      let testedFingerprint = 'A'
      let pending = false
      const notifications: string[] = []
      let reads = 0
      const actions = panel.createMcpGenerationSourcePanelActions({
        projectId: 1,
        getAuthority: () => authority,
        beginSourceOperation: () => fence.begin(1, 101),
        assertSourceOperationCurrent: (token: any) => fence.assertCurrent(token),
        onAuthorityChange: (next: any) => { authority = next; authorityProject = 'A' },
        onTestedFingerprintChange: (value: string) => { testedFingerprint = value },
        onPendingChange: (value: boolean) => { pending = value },
        notifySuccess: value => notifications.push(value),
        notifyError: value => notifications.push(value),
        api: {
          saveMcp: async () => {
            if (scenario.startsWith('reconcile')) throw transport
            return mutation
          },
          get: async () => { reads += 1; return read },
        },
      })
      const operation = actions.saveBinding(sourceView().source.mcp!)
      if (scenario.startsWith('reconcile')) {
        await Promise.resolve()
        await Promise.resolve()
        expect(reads).toBe(1)
      }
      fence.enterProject(2, 202)
      authority = confirmedAuthorityState(sourceView('model'))
      authorityProject = 'B'
      testedFingerprint = 'B'
      pending = false
      notifications.splice(0)
      if (scenario === 'mutation_success') resolveMutation(sourceView('mcp'))
      else if (scenario === 'http_error') rejectMutation(definite)
      else if (scenario === 'reconcile_success') resolveRead(sourceView('mcp'))
      else rejectRead(new Error('private authority cause'))
      await operation
      expect({ authorityProject, notifications, testedFingerprint, pending }).toEqual({
        authorityProject: 'B', notifications: [], testedFingerprint: 'B', pending: false,
      })
    }
  })

  test('disables binding controls for busy, locked, pending, and authority unknown', async () => {
    const panel = await import('./McpGenerationSourcePanel') as Record<string, any>
    expect(typeof panel.mcpBindingControlsDisabled).toBe('function')
    if (typeof panel.mcpBindingControlsDisabled !== 'function') return
    expect(panel.mcpBindingControlsDisabled({ authority: confirmedAuthorityState(sourceView()), locallyBusy: false, pending: false })).toBe(false)
    expect(panel.mcpBindingControlsDisabled({ authority: confirmedAuthorityState(sourceView()), locallyBusy: true, pending: false })).toBe(true)
    expect(panel.mcpBindingControlsDisabled({ authority: confirmedAuthorityState({ ...sourceView(), locked: true }), locallyBusy: false, pending: false })).toBe(true)
    expect(panel.mcpBindingControlsDisabled({ authority: confirmedAuthorityState(sourceView()), locallyBusy: false, pending: true })).toBe(true)
    const unknown = {
      source: sourceView(), authorityUnknown: true, reconciliationRequired: true, diagnostic: new Error('private'),
    }
    expect(panel.mcpBindingControlsDisabled({ authority: unknown, locallyBusy: false, pending: false })).toBe(true)
  })
})
