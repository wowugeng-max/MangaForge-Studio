// ui/server/src/kernel/codex/spawn-evidence.ts
export type SpawnEvidence = {
  subagent_threads: Array<{ thread_id: string; parent_thread_id: string; agent: string }>
  agent_hints: string[]
}

export function extractSpawnEvidence(events: Array<{ direction: string; message: any }>): SpawnEvidence {
  const subagentThreads: SpawnEvidence['subagent_threads'] = []
  const seen = new Set<string>()
  const agentHints: string[] = []
  const pushHint = (name: unknown) => {
    const hint = String(name || '')
    if (hint && !agentHints.includes(hint)) agentHints.push(hint)
  }
  const pushThread = (threadId: string, parentThreadId: string, agent: string) => {
    if (!threadId || !parentThreadId || seen.has(threadId)) return
    seen.add(threadId)
    subagentThreads.push({ thread_id: threadId, parent_thread_id: parentThreadId, agent })
    pushHint(agent)
  }
  for (const event of events || []) {
    if (event?.direction !== 'recv') continue
    const method = String(event?.message?.method || '')
    const params = event?.message?.params || {}
    if (method === 'thread/started') {
      const parent = String(params.parentThreadId ?? params.thread?.parentThreadId ?? '')
      const threadId = String(params.threadId ?? params.thread?.id ?? '')
      const agent = String(params.agent ?? params.agentType ?? '')
      pushThread(threadId, parent, agent)
    }
    if (method.startsWith('item/')) {
      const item = params?.item || {}
      pushHint(item.agent)
      if (item.type === 'collabAgentToolCall' && item.tool === 'spawnAgent') {
        const parent = String(item.senderThreadId || '')
        for (const id of Array.isArray(item.receiverThreadIds) ? item.receiverThreadIds : []) {
          pushThread(String(id || ''), parent, String(item.agent || item.agentType || ''))
        }
      }
    }
  }
  return { subagent_threads: subagentThreads, agent_hints: agentHints }
}
