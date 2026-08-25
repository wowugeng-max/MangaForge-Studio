import { describe, expect, test } from 'bun:test'
import * as React from 'react'
import { Button, Input, Select, Tooltip, message } from 'antd'
import apiClient from '../../api/client'
import { chapterSourceApi, mcpApi, type ChapterGenerationSourceView } from '../../api/mcp'
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
  writingSkillInstallErrorMessage,
} from './ProjectSettingsModal'

type PanelDependencyList = readonly unknown[] | undefined
type PanelEffect = () => void | (() => void)
type PanelHookCell =
  | { kind: 'state'; value: unknown; setter: (next: unknown) => void }
  | { kind: 'ref'; value: { current: unknown } }
  | { kind: 'memo'; value: unknown; deps: PanelDependencyList }
  | { kind: 'effect'; deps: PanelDependencyList; cleanup?: () => void }

function panelDependenciesEqual(left: PanelDependencyList, right: PanelDependencyList) {
  if (!left || !right || left.length !== right.length) return false
  return left.every((value, index) => Object.is(value, right[index]))
}

const panelDispatcherRef = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher

class PanelHookHarness<T> {
  value!: T
  private readonly cells: PanelHookCell[] = []
  private readonly pendingEffects: Array<{ index: number; effect: PanelEffect; deps: PanelDependencyList }> = []
  private cursor = 0
  private dirty = false
  private flushing = false
  private mounted = false

  private readonly dispatcher = {
    useState: (initial: unknown) => this.useState(initial),
    useRef: (initial: unknown) => this.useRef(initial),
    useMemo: (factory: () => unknown, deps: PanelDependencyList) => this.useMemo(factory, deps),
    useEffect: (effect: PanelEffect, deps: PanelDependencyList) => this.useEffect(effect, deps),
  }

  constructor(private readonly renderComponent: () => T) {}

  mount() {
    this.mounted = true
    this.requestRender()
  }

  update() {
    this.requestRender()
  }

  unmount() {
    if (!this.mounted) return
    this.mounted = false
    for (const cell of this.cells) {
      if (cell?.kind === 'effect') cell.cleanup?.()
    }
  }

  private requestRender() {
    if (!this.mounted) return
    this.dirty = true
    if (!this.flushing) this.flush()
  }

  private flush() {
    this.flushing = true
    let passes = 0
    try {
      while (this.dirty) {
        if (++passes > 50) throw new Error('panel hook harness exceeded render limit')
        this.dirty = false
        this.cursor = 0
        this.pendingEffects.length = 0
        const previousDispatcher = panelDispatcherRef.current
        panelDispatcherRef.current = this.dispatcher
        try {
          this.value = this.renderComponent()
        } finally {
          panelDispatcherRef.current = previousDispatcher
        }
        this.flushEffects()
      }
    } finally {
      this.flushing = false
    }
  }

  private flushEffects() {
    for (const pending of this.pendingEffects) {
      const previous = this.cells[pending.index]
      if (previous?.kind === 'effect') previous.cleanup?.()
      const next: PanelHookCell = { kind: 'effect', deps: pending.deps }
      this.cells[pending.index] = next
      const cleanup = pending.effect()
      if (typeof cleanup === 'function') next.cleanup = cleanup
    }
  }

  private useState(initial: unknown) {
    const index = this.cursor++
    let cell = this.cells[index]
    if (!cell) {
      const stateCell: Extract<PanelHookCell, { kind: 'state' }> = {
        kind: 'state',
        value: typeof initial === 'function' ? (initial as () => unknown)() : initial,
        setter: (next) => {
          const nextValue = typeof next === 'function'
            ? (next as (current: unknown) => unknown)(stateCell.value)
            : next
          if (Object.is(nextValue, stateCell.value)) return
          stateCell.value = nextValue
          this.requestRender()
        },
      }
      cell = stateCell
      this.cells[index] = cell
    }
    if (cell.kind !== 'state') throw new Error(`panel hook ${index} changed type`)
    return [cell.value, cell.setter]
  }

  private useRef(initial: unknown) {
    const index = this.cursor++
    let cell = this.cells[index]
    if (!cell) {
      cell = { kind: 'ref', value: { current: initial } }
      this.cells[index] = cell
    }
    if (cell.kind !== 'ref') throw new Error(`panel hook ${index} changed type`)
    return cell.value
  }

  private useMemo(factory: () => unknown, deps: PanelDependencyList) {
    const index = this.cursor++
    let cell = this.cells[index]
    if (!cell || cell.kind !== 'memo' || !panelDependenciesEqual(cell.deps, deps)) {
      cell = { kind: 'memo', value: factory(), deps }
      this.cells[index] = cell
    }
    return cell.value
  }

  private useEffect(effect: PanelEffect, deps: PanelDependencyList) {
    const index = this.cursor++
    const cell = this.cells[index]
    if (cell?.kind === 'effect' && panelDependenciesEqual(cell.deps, deps)) return
    this.pendingEffects.push({ index, effect, deps })
  }
}

function deferredPanelResponse<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

async function flushPanelPromises() {
  for (let index = 0; index < 12; index += 1) await Promise.resolve()
}

function panelElements(root: React.ReactNode) {
  const elements: Array<React.ReactElement<Record<string, any>>> = []
  const visit = (node: React.ReactNode) => {
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }
    if (!React.isValidElement<Record<string, any>>(node)) return
    elements.push(node)
    visit(node.props.children)
  }
  visit(root)
  return elements
}

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

  test('explains writing-skill install failures instead of showing the raw error code', () => {
    expect(writingSkillInstallErrorMessage({
      response: { data: { error_code: 'SKILL_MD_MISSING', error: 'Repository root has no SKILL.md' } },
    })).toContain('仓库里没有可用的 SKILL.md')
    expect(writingSkillInstallErrorMessage({
      response: { data: { error_code: 'SKILL_MD_MISSING' } },
    })).toContain('最多四层子目录')
    expect(writingSkillInstallErrorMessage({
      response: { data: { error_code: 'DOWNLOAD_FAILED', error: 'Archive download failed: 404' } },
    })).toContain('无法下载该 GitHub 仓库')
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
    expect(modal).toContain('/writing-skills-config')
    expect(modal).toContain('去 AI 味写作 skill')
    expect(modal).toContain('BUILTIN_WRITING_SKILL_CATALOG')
    expect(modal).toContain('skill.label')
    expect(modal).toContain('fiction_humanizer_mode')
    expect(modal).toContain('精修')
    expect(modal).toContain('重写')
    expect(modal).toContain('onWritingSkillsSaved?.(')
    expect(modal).toContain('/writing-skills/catalog')
    expect(modal).toContain('normalizeWritingSkillCatalog')
    expect(modal).toContain('filterWritingSkillCatalog')
    expect(modal).toContain('filteredWritingSkills.map(skill =>')
    expect(modal).toContain('aria-label="过滤写作 skill"')
    expect(modal).toContain('aria-label="写作 skill 列表"')
    expect(modal).toContain('overflowY')
    expect(modal).toContain('skill.supports_mode')
    expect(modal).toContain('skill.builtin')
    expect(modal).toContain('skill.revision.slice(0, 7)')
    expect(modal).toContain('Popconfirm')
    expect(modal).toContain('卸载')
    expect(modal).toContain('从 GitHub 安装')
    expect(modal).toContain('/novel/writing-skills/install')
    expect(modal).toContain('/novel/writing-skills/${')
    expect(modal).toContain('writingSkillInstallErrorMessage')
    expect(modal).toContain('仓库里没有可用的 SKILL.md')
    expect(modal).toContain('catalogWriteSeq')
    expect(modal).toContain('onWritingSkillsCatalogChange')
    expect(modal).toContain('catalogFresh && catalogResponse != null')
    expect(modal).toContain('disabled={loading || installing}')
    expect(topbar).toContain('onWritingSkillsCatalogChange={setWritingSkillsCatalog}')
  })

  test('adds a project-level writing skill model select saved through the same PUT', () => {
    const modal = readFileSync(join(import.meta.dir, 'ProjectSettingsModal.tsx'), 'utf8')
    expect(modal).toContain('aria-label="写作skill模型"')
    expect(modal).toContain('跟随项目模型')
    expect(modal).toContain('writingSkillsModelId')
    expect(modal).toContain('normalizeWritingSkillsModelId')
    expect(modal).toContain('skills.data?.config?.model_id')
    expect(modal).toContain('writingSkillsSettingsPayload(')
    expect(modal).toContain('...modelOptions')
  })

  test('settings source has 内核合同 and GitHub install does not start adapt_pack', () => {
    const modal = readFileSync(join(import.meta.dir, 'ProjectSettingsModal.tsx'), 'utf8')
    expect(modal).toContain('内核合同')
    expect(modal).toContain('适配合同')
    const installFn = modal.slice(modal.indexOf('const installWritingSkill'), modal.indexOf('const uninstallWritingSkill'))
    expect(installFn).not.toContain('adapt_pack')
    expect(installFn).not.toContain('/kernel/jobs')
    expect(installFn).toContain('/novel/writing-skills/install')
    expect(modal).not.toContain("KERNEL_DEFAULT_PICKER_VERBS") // 选择器数组在 helper 文件
    const kernelBlock = modal.slice(modal.indexOf('内核合同'), modal.indexOf('去 AI 味写作 skill'))
    expect(kernelBlock).toContain('installedAdaptTargets')
    expect(kernelBlock).not.toContain('writingSkillsModelId')
    expect(kernelBlock).toContain('selectedModelId')
    expect(kernelBlock).toContain('保存默认绑定')
    expect(kernelBlock).toContain('adapt.resume')
    expect(kernelBlock).toMatch(/disabled=\{[^}]*awaiting_selection/)
    const skillSelect = kernelBlock.slice(
      kernelBlock.indexOf('aria-label="适配写作 skill"'),
      kernelBlock.indexOf('适配合同'),
    )
    expect(skillSelect).toContain('setAdaptSkillId')
    expect(skillSelect).toContain('adapt.resume')
    expect(modal).toContain('reloadContractsAfterAdaptCommit')
    const adoptFn = modal.slice(modal.indexOf('const adoptAdaptPack'), modal.indexOf('const filteredWritingSkills'))
    expect(adoptFn).toContain('adapt.commit')
    expect(adoptFn).toContain('reloadContractsAfterAdaptCommit')
    expect(adoptFn).toContain('listContracts')
    expect(adoptFn).not.toContain('putVerbDefaults')
    const saveFn = modal.slice(modal.indexOf('const save = async'), modal.indexOf('return ('))
    expect(saveFn).not.toContain('putVerbDefaults')
    expect(modal.indexOf('内核合同')).toBeGreaterThan(modal.indexOf('质检与修订'))
    expect(modal.indexOf('内核合同')).toBeLessThan(modal.indexOf('去 AI 味写作 skill'))
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

  test('passes the request-gate signal and bounded timeout to real metadata APIs and aborts superseded or closed requests', async () => {
    const panel = await import('./McpGenerationSourcePanel') as Record<string, any>
    const apiModule = await import('../../api/mcp') as Record<string, any>
    const originalGet = apiClient.get
    const metadataConfigs: any[] = []
    const agentRequests: Array<ReturnType<typeof deferredPanelResponse<any>> & { config: any }> = []
    let agentCalls = 0
    let abortRejects = 0
    apiClient.get = (async (url: string, config: any) => {
      if (url === '/mcp/servers') {
        metadataConfigs.push(config)
        return { data: [{
          id: 'buda', display_name: 'Buda', transport: 'streamable_http', url: 'https://mcp.invalid',
          auth_type: 'bearer', adapter_id: 'buda', is_active: true,
          startup_timeout_ms: 1_000, tool_timeout_ms: 1_000, generation_timeout_ms: 1_000,
          poll_initial_ms: 100, poll_max_ms: 1_000, enabled_tools: [], custom_headers: [],
        }] }
      }
      if (url === '/mcp/keys') {
        metadataConfigs.push(config)
        return { data: [{
          id: 3, mcp_server_id: 'buda', description: 'Primary', is_active: true, priority: 0,
          success_count: 0, failure_count: 0, masked_key: '****', has_key: true, bound_projects: [],
        }] }
      }
      if (url.endsWith('/prose-generation-source/agents')) {
        agentCalls += 1
        if (agentCalls === 1) {
          metadataConfigs.push(config)
          return { data: { agents: [{ id: 'agent-1', name: 'Agent One' }] } }
        }
        const pending = deferredPanelResponse<any>()
        const request = { ...pending, config }
        agentRequests.push(request)
        config?.signal?.addEventListener('abort', () => {
          abortRejects += 1
          pending.reject(new Error('metadata request aborted'))
        }, { once: true })
        return pending.promise
      }
      throw new Error(`unexpected metadata GET: ${url}`)
    }) as any

    const fence = createChapterSourceOperationFence()
    fence.enterProject(1, 101)
    let props = {
      open: true,
      projectId: 1,
      authority: confirmedAuthorityState(sourceView()),
      locallyBusy: false,
      beginSourceOperation: () => fence.begin(1, 101),
      assertSourceOperationCurrent: (token: any) => fence.assertCurrent(token),
      onAuthorityChange: () => {},
      pending: false,
      onPendingChange: () => {},
    }
    const harness = new PanelHookHarness<React.ReactNode>(() => panel.McpGenerationSourcePanel(props))
    const refreshButton = () => {
      const button = panelElements(harness.value).find(element => (
        element.type === Button && element.props.children === '刷新 Agents'
      ))
      if (!button) throw new Error('refresh button was not rendered')
      return button
    }

    try {
      harness.mount()
      await flushPanelPromises()
      const firstRefresh = refreshButton().props.onClick()
      const secondRefresh = refreshButton().props.onClick()
      await flushPanelPromises()
      const [first, second] = agentRequests
      if (!first.config?.signal?.aborted) first.resolve({ data: { agents: [] } })
      second.resolve({ data: { agents: [{ id: 'agent-1', name: 'Agent One' }] } })
      await Promise.all([firstRefresh, secondRefresh])
      await flushPanelPromises()
      const loadingAfterSupersede = refreshButton().props.loading

      const closingRefresh = refreshButton().props.onClick()
      const closingRequest = agentRequests[2]
      props = { ...props, open: false }
      harness.update()
      await flushPanelPromises()
      if (!closingRequest.config?.signal?.aborted) closingRequest.resolve({ data: { agents: [] } })
      await closingRefresh
      await flushPanelPromises()

      const initialSignal = metadataConfigs[0]?.signal
      expect({
        boundedTimeout: apiModule.CHAPTER_SOURCE_UI_REQUEST_TIMEOUT_MS,
        initialSignals: metadataConfigs.map(config => config?.signal),
        initialTimeouts: metadataConfigs.map(config => config?.timeout),
        refreshSignals: agentRequests.map(request => request.config?.signal instanceof AbortSignal),
        firstAborted: first.config?.signal?.aborted,
        secondAborted: second.config?.signal?.aborted,
        closeAborted: closingRequest.config?.signal?.aborted,
        abortRejects,
        loadingAfterSupersede,
        loadingAfterClose: refreshButton().props.loading,
      }).toEqual({
        boundedTimeout: 120_000,
        initialSignals: [initialSignal, initialSignal, initialSignal],
        initialTimeouts: [120_000, 120_000, 120_000],
        refreshSignals: [true, true, true],
        firstAborted: true,
        secondAborted: false,
        closeAborted: true,
        abortRejects: 2,
        loadingAfterSupersede: false,
        loadingAfterClose: false,
      })
    } finally {
      for (const request of agentRequests) request.resolve({ data: { agents: [] } })
      harness.unmount()
      apiClient.get = originalGet
    }
  })

  test('aborts create and test exactly once with the panel lifecycle signal and clears shared pending', async () => {
    const panel = await import('./McpGenerationSourcePanel') as Record<string, any>
    const apiModule = await import('../../api/mcp') as Record<string, any>
    const originalPost = apiClient.post
    const outcomes: any[] = []
    try {
      for (const kind of ['create', 'test'] as const) {
        const fence = createChapterSourceOperationFence()
        fence.enterProject(1, 101)
        const lifecycle = panel.createMcpPanelLifecycleGate()
        const request = deferredPanelResponse<any>()
        const pending: boolean[] = []
        const tested: string[] = []
        const notifications: string[] = []
        let calls = 0
        let refreshCalls = 0
        let confirmedCalls = 0
        let config: any
        apiClient.post = (async (_url: string, _body: unknown, options: any) => {
          calls += 1
          config = options
          options?.signal?.addEventListener('abort', () => request.reject(new Error(`${kind} aborted`)), { once: true })
          return request.promise
        }) as any
        const actions = panel.createMcpGenerationSourcePanelActions({
          projectId: 1,
          getAuthority: () => confirmedAuthorityState(sourceView()),
          beginSourceOperation: () => fence.begin(1, 101),
          assertSourceOperationCurrent: (token: any) => fence.assertCurrent(token),
          beginPanelLifecycle: () => lifecycle.begin(),
          assertPanelLifecycleCurrent: (token: any) => lifecycle.assertCurrent(token),
          onAuthorityChange: () => {},
          onTestedFingerprintChange: (value: string) => tested.push(value),
          onPendingChange: (value: boolean) => pending.push(value),
          notifySuccess: (text: string) => notifications.push(text),
          notifyError: (text: string) => notifications.push(text),
        })
        const operation = kind === 'test'
          ? actions.testBinding(sourceView().source.mcp!, 'tested')
          : actions.createAgent({
              request: async (options: any) => (
                await mcpApi.createProjectAgent(1, {
                  server_id: 'buda', key_id: 3, name: 'Agent One',
                }, options)
              ).data.agent,
              refreshAgents: async () => { refreshCalls += 1; return true },
              onAgentConfirmed: () => { confirmedCalls += 1 },
            })
        await Promise.resolve()
        if (kind === 'create') lifecycle.invalidate()
        else lifecycle.unmount()
        if (!config?.signal?.aborted) request.reject(new Error(`${kind} fallback rejection`))
        await operation
        outcomes.push({
          kind,
          timeoutConstant: apiModule.CHAPTER_SOURCE_UI_REQUEST_TIMEOUT_MS,
          signal: config?.signal instanceof AbortSignal,
          aborted: config?.signal?.aborted,
          timeout: config?.timeout,
          calls,
          pending,
          tested,
          notifications,
          refreshCalls,
          confirmedCalls,
        })
      }
    } finally {
      apiClient.post = originalPost
    }

    expect(outcomes).toEqual([
      {
        kind: 'create', timeoutConstant: 120_000, signal: true, aborted: true, timeout: 120_000,
        calls: 1, pending: [true, false], tested: [], notifications: [], refreshCalls: 0, confirmedCalls: 0,
      },
      {
        kind: 'test', timeoutConstant: 120_000, signal: true, aborted: true, timeout: 120_000,
        calls: 1, pending: [true, false], tested: [], notifications: [], refreshCalls: 0, confirmedCalls: 0,
      },
    ])
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

  test('keeps close-during-save authoritative work un-aborted but bounded through one reconciliation GET', async () => {
    const panel = await import('./McpGenerationSourcePanel') as Record<string, any>
    const transport = await sourceFailure('transport')
    const fence = createChapterSourceOperationFence()
    fence.enterProject(1, 101)
    const lifecycle = panel.createMcpPanelLifecycleGate()
    const mutation = deferredPanelResponse<ChapterGenerationSourceView>()
    const authorityRead = deferredPanelResponse<ChapterGenerationSourceView>()
    let authority = confirmedAuthorityState(sourceView('model'))
    const pending: boolean[] = []
    const notifications: string[] = []
    const tested: string[] = []
    let mutationCalls = 0
    let readCalls = 0
    let mutationOptions: any
    let readOptions: any
    const actions = panel.createMcpGenerationSourcePanelActions({
      projectId: 1,
      getAuthority: () => authority,
      beginSourceOperation: () => fence.begin(1, 101),
      assertSourceOperationCurrent: (token: any) => fence.assertCurrent(token),
      beginPanelLifecycle: () => lifecycle.begin(),
      assertPanelLifecycleCurrent: (token: any) => lifecycle.assertCurrent(token),
      onAuthorityChange: (next: any) => { authority = next },
      onTestedFingerprintChange: (value: string) => tested.push(value),
      onPendingChange: (value: boolean) => pending.push(value),
      notifySuccess: (text: string) => notifications.push(text),
      notifyError: (text: string) => notifications.push(text),
      api: {
        saveMcp: async (_projectId: number, _mcp: unknown, options: any) => {
          mutationCalls += 1
          mutationOptions = options
          return mutation.promise
        },
        get: async (_projectId: number, options: any) => {
          readCalls += 1
          readOptions = options
          return authorityRead.promise
        },
      },
    })

    const operation = actions.saveBinding(sourceView().source.mcp!)
    lifecycle.unmount()
    mutation.reject(transport)
    await flushPanelPromises()
    expect(readCalls).toBe(1)
    authorityRead.resolve(sourceView('mcp'))
    await operation

    expect({
      mutationCalls,
      readCalls,
      mutationSignal: mutationOptions?.signal,
      mutationTimeout: mutationOptions?.timeout,
      readSignal: readOptions?.signal,
      readTimeout: readOptions?.timeout,
      active: authority.source?.source.active,
      pending,
      notifications,
      tested,
    }).toEqual({
      mutationCalls: 1,
      readCalls: 1,
      mutationSignal: undefined,
      mutationTimeout: 120_000,
      readSignal: undefined,
      readTimeout: 120_000,
      active: 'mcp',
      pending: [true, false],
      notifications: [],
      tested: [],
    })
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

  test('locks the real binding panel while Agents refresh and restores it after the request settles', async () => {
    const panel = await import('./McpGenerationSourcePanel') as Record<string, any>
    const refreshResponse = deferredPanelResponse<{ data: { agents: Array<{ id: string; name: string }> } }>()
    const originals = {
      listServers: mcpApi.listServers,
      listKeys: mcpApi.listKeys,
      listProjectAgents: mcpApi.listProjectAgents,
      createProjectAgent: mcpApi.createProjectAgent,
      testMcp: chapterSourceApi.testMcp,
      saveMcp: chapterSourceApi.saveMcp,
      messageSuccess: message.success,
    }
    let agentReads = 0
    let testCalls = 0
    let saveCalls = 0
    let createCalls = 0
    ;(mcpApi as any).listServers = async () => ({ data: [{
      id: 'buda',
      display_name: 'Buda',
      transport: 'streamable_http',
      url: 'https://mcp.invalid',
      auth_type: 'bearer',
      adapter_id: 'buda',
      is_active: true,
      startup_timeout_ms: 1_000,
      tool_timeout_ms: 1_000,
      generation_timeout_ms: 1_000,
      poll_initial_ms: 100,
      poll_max_ms: 1_000,
      enabled_tools: [],
      custom_headers: [],
    }] })
    ;(mcpApi as any).listKeys = async () => ({ data: [{
      id: 3,
      mcp_server_id: 'buda',
      description: 'Primary',
      is_active: true,
      priority: 0,
      success_count: 0,
      failure_count: 0,
      masked_key: '****',
      has_key: true,
      bound_projects: [],
    }] })
    ;(mcpApi as any).listProjectAgents = async () => {
      agentReads += 1
      if (agentReads === 1) return { data: { agents: [{ id: 'agent-1', name: 'Agent One' }] } }
      return refreshResponse.promise
    }
    ;(mcpApi as any).createProjectAgent = async () => {
      createCalls += 1
      return { data: { ok: true, agent: { id: 'agent-2', name: 'Agent Two' } } }
    }
    ;(chapterSourceApi as any).testMcp = async () => {
      testCalls += 1
      return { ok: true }
    }
    ;(chapterSourceApi as any).saveMcp = async () => {
      saveCalls += 1
      return sourceView()
    }
    ;(message as any).success = () => {}

    const fence = createChapterSourceOperationFence()
    fence.enterProject(1, 101)
    const authority = confirmedAuthorityState(sourceView())
    const harness = new PanelHookHarness<React.ReactNode>(() => panel.McpGenerationSourcePanel({
      open: true,
      projectId: 1,
      authority,
      locallyBusy: false,
      beginSourceOperation: () => fence.begin(1, 101),
      assertSourceOperationCurrent: (token: any) => fence.assertCurrent(token),
      onAuthorityChange: () => {},
      pending: false,
      onPendingChange: () => {},
    }))
    const findControl = (
      elements: Array<React.ReactElement<Record<string, any>>>,
      type: unknown,
      predicate: (props: Record<string, any>) => boolean,
    ) => {
      const element = elements.find(candidate => candidate.type === type && predicate(candidate.props))
      if (!element) throw new Error('expected binding control was not rendered')
      return element
    }
    const controls = () => {
      const elements = panelElements(harness.value)
      return {
        elements,
        server: findControl(elements, Select, props => props.style?.width === 220),
        account: findControl(elements, Select, props => props.style?.width === 240),
        adapter: findControl(elements, Input, props => props.readOnly === true),
        model: findControl(elements, Input, props => props.placeholder === '例如：账号支持的模型标识'),
        agent: findControl(elements, Select, props => props.style?.width === 330),
        agentName: findControl(elements, Input, props => props.placeholder === 'Agent 名称'),
        spaceId: findControl(elements, Input, props => props.placeholder === 'Space ID（需要时填写）'),
        refresh: findControl(elements, Button, props => props.children === '刷新 Agents'),
        test: findControl(elements, Button, props => props.children === '测试绑定'),
        save: findControl(elements, Button, props => props.children === '保存绑定'),
        create: findControl(elements, Button, props => props.children === '新建 MangaForge Agent'),
      }
    }
    const disabledSnapshot = (current: ReturnType<typeof controls>) => ({
      server: current.server.props.disabled,
      account: current.account.props.disabled,
      adapter: current.adapter.props.disabled,
      model: current.model.props.disabled,
      agent: current.agent.props.disabled,
      agentName: current.agentName.props.disabled,
      spaceId: current.spaceId.props.disabled,
      refresh: current.refresh.props.disabled,
      test: current.test.props.disabled,
      save: current.save.props.disabled,
      create: current.create.props.disabled,
    })

    try {
      harness.mount()
      await flushPanelPromises()
      await controls().test.props.onClick()
      await flushPanelPromises()
      const beforeRefresh = disabledSnapshot(controls())

      const refreshOperation = controls().refresh.props.onClick()
      const locked = controls()
      const whileRefreshing = disabledSnapshot(locked)
      const busyReason = locked.elements.some(element => (
        element.type === Tooltip
        && element.props.title === '当前章节任务正在运行，结束后可切换来源'
      ))
      await locked.test.props.onClick()
      await locked.save.props.onClick()
      const submissionsWhileRefreshing = { testCalls, saveCalls, createCalls }

      refreshResponse.resolve({ data: { agents: [{ id: 'agent-1', name: 'Agent One' }] } })
      await refreshOperation
      await flushPanelPromises()
      const afterRefresh = disabledSnapshot(controls())

      const enabled = {
        server: false,
        account: false,
        adapter: false,
        model: false,
        agent: false,
        agentName: false,
        spaceId: false,
        refresh: false,
        test: false,
        save: false,
        create: false,
      }
      const disabled = Object.fromEntries(Object.keys(enabled).map(key => [key, true]))
      expect({ beforeRefresh, whileRefreshing, busyReason, submissionsWhileRefreshing, afterRefresh }).toEqual({
        beforeRefresh: enabled,
        whileRefreshing: disabled,
        busyReason: true,
        submissionsWhileRefreshing: { testCalls: 1, saveCalls: 0, createCalls: 0 },
        afterRefresh: enabled,
      })
    } finally {
      harness.unmount()
      ;(mcpApi as any).listServers = originals.listServers
      ;(mcpApi as any).listKeys = originals.listKeys
      ;(mcpApi as any).listProjectAgents = originals.listProjectAgents
      ;(mcpApi as any).createProjectAgent = originals.createProjectAgent
      ;(chapterSourceApi as any).testMcp = originals.testMcp
      ;(chapterSourceApi as any).saveMcp = originals.saveMcp
      ;(message as any).success = originals.messageSuccess
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
