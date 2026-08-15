// ui/server/src/kernel/codex/session.ts
import { spawnCodexRpc, type CodexRpcClient, type RpcEventSink } from './rpc'

const SANDBOX_MAP: Record<string, string> = {
  'workspace-write': 'workspaceWrite',
  'read-only': 'readOnly',
  'danger-full-access': 'dangerFullAccess',
}

export function mapContractSandbox(sandbox: string): string {
  return SANDBOX_MAP[sandbox] || sandbox
}

export type CodexSession = {
  threadId: string
  listSkills(): Promise<Array<{ name: string; path: string }>>
  runTurn(input: { text: string; skill?: { name: string; path: string }; idleTimeoutMs?: number; hardTimeoutMs?: number }): Promise<{ turnId: string; lastAgentMessage: string; completedParams: any }>
  interrupt(turnId: string): Promise<void>
  close(): void
}

function isAgentMessageItem(item: any): boolean {
  return item && (item.type === 'agentMessage' || item.type === 'agent_message') && typeof item.text === 'string'
}

export async function startCodexSession(input: {
  binary: string
  projectDir: string
  codexHome: string
  envKey: string
  appVersion?: string
  sandbox?: string
  argv?: string[]
  sink?: RpcEventSink
  extraEnv?: Record<string, string>
}): Promise<CodexSession> {
  const rpc: CodexRpcClient = spawnCodexRpc({
    argv: input.argv ?? [input.binary, 'app-server', '--ignore-user-config'],
    cwd: input.projectDir,
    env: { CODEX_HOME: input.codexHome, MANGAFORGE_CODEX_KEY: input.envKey, ...(input.extraEnv || {}) },
    sink: input.sink,
  })
  await rpc.request('initialize', {
    clientInfo: { name: 'mangaforge', title: 'MangaForge Studio', version: input.appVersion || 'dev' },
  })
  rpc.notify('initialized')
  const threadResult = await rpc.request('thread/start', {
    cwd: input.projectDir,
    sandbox: mapContractSandbox(input.sandbox || 'workspace-write'),
    approvalPolicy: 'never',
  })
  const threadId = String(threadResult?.threadId ?? threadResult?.thread?.id ?? '')
  if (!threadId) {
    rpc.kill()
    throw Object.assign(new Error('thread/start returned no thread id'), { code: 'ENGINE_FAILED' })
  }

  return {
    threadId,
    async listSkills() {
      const result = await rpc.request('skills/list', { cwds: [input.projectDir] })
      const rows = Array.isArray(result?.skills) ? result.skills : Array.isArray(result?.data) ? result.data : []
      return rows
        .map((row: any) => ({ name: String(row?.name || ''), path: String(row?.path || '') }))
        .filter((row: any) => row.name)
    },
    async runTurn({ text, skill, idleTimeoutMs = 120_000, hardTimeoutMs = 1_800_000 }) {
      const inputItems: any[] = [{ type: 'text', text }]
      if (skill) inputItems.push({ type: 'skill', name: skill.name, path: skill.path })
      // 状态与 collector 必须在发 turn/start 之前就位：
      // 应答行与后续通知行可能挤进同一次 stdout 读取（质量评审 40 次试验实测过 miss），
      // 事后注册的 waiter 会错过终局事件，事后声明的 let 会在 collector 里触发 TDZ。
      let lastAgentMessage = ''
      let lastActivity = Date.now()
      let completedParams: any = null
      let resolveCompleted!: (params: any) => void
      const completed = new Promise<any>(resolve => { resolveCompleted = resolve })
      const collector = (method: string, params: any) => {
        if (String(params?.threadId || '') === threadId || method.startsWith('item/')) lastActivity = Date.now()
        if (method.startsWith('item/') && isAgentMessageItem(params?.item)) lastAgentMessage = params.item.text
        if (method === 'turn/completed' && String(params?.threadId || '') === threadId && !completedParams) {
          completedParams = params
          resolveCompleted(params)
        }
      }
      rpc.onNotification(collector)
      const turnResult = await rpc.request('turn/start', { threadId, input: inputItems })
      const turnId = String(turnResult?.turnId ?? turnResult?.turn?.id ?? '')
      const hardDeadline = Date.now() + hardTimeoutMs

      while (true) {
        if (completedParams) return { turnId, lastAgentMessage, completedParams }
        const idleRemaining = lastActivity + idleTimeoutMs - Date.now()
        const hardRemaining = hardDeadline - Date.now()
        const budget = Math.min(idleRemaining, hardRemaining)
        if (budget <= 0) {
          try { await rpc.request('turn/interrupt', { threadId, turnId }, 2000) } catch { /* 进程可能已死 */ }
          throw Object.assign(new Error('turn timeout'), { code: 'ENGINE_FAILED' })
        }
        // 让 completed 与预算切片竞速；醒来后回到循环重算预算（collector 可能刷新过 lastActivity）
        await Promise.race([completed, new Promise(resolve => setTimeout(resolve, Math.min(budget, 1000)))])
      }
    },
    async interrupt(turnId: string) {
      await rpc.request('turn/interrupt', { threadId, turnId })
    },
    close() {
      rpc.kill()
    },
  }
}
