// ui/server/src/kernel/codex/spawn-evidence.ts
export type SpawnEvidence = {
  subagent_threads: Array<{ thread_id: string; parent_thread_id: string; agent: string }>
  agent_hints: string[]
}

export function extractSpawnEvidence(events: Array<{ direction: string; message: any }>): SpawnEvidence {
  const subagentThreads: SpawnEvidence['subagent_threads'] = []
  const agentHints: string[] = []
  const pushHint = (name: unknown) => {
    const hint = String(name || '')
    if (hint && !agentHints.includes(hint)) agentHints.push(hint)
  }
  for (const event of events || []) {
    if (event?.direction !== 'recv') continue
    const method = String(event?.message?.method || '')
    const params = event?.message?.params || {}
    if (method === 'thread/started') {
      const parent = String(params.parentThreadId ?? params.thread?.parentThreadId ?? '')
      if (!parent) continue
      const threadId = String(params.threadId ?? params.thread?.id ?? '')
      const agent = String(params.agent ?? params.agentType ?? '')
      subagentThreads.push({ thread_id: threadId, parent_thread_id: parent, agent })
      pushHint(agent)
    }
    if (method.startsWith('item/')) pushHint(params?.item?.agent)
  }
  return { subagent_threads: subagentThreads, agent_hints: agentHints }
}
