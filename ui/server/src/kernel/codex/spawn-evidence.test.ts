// ui/server/src/kernel/codex/spawn-evidence.test.ts
import { describe, expect, test } from 'bun:test'
import { extractSpawnEvidence } from './spawn-evidence'

describe('extractSpawnEvidence', () => {
  test('collects subagent threads and agent hints, ignores main thread and sends', () => {
    const events = [
      { direction: 'send', message: { method: 'thread/started', params: { threadId: 'x', parentThreadId: 'main' } } },
      { direction: 'recv', message: { method: 'thread/started', params: { threadId: 'main' } } },
      { direction: 'recv', message: { method: 'thread/started', params: { threadId: 'sub-1', parentThreadId: 'main', agent: 'story-architect' } } },
      { direction: 'recv', message: { method: 'thread/started', params: { thread: { id: 'sub-2', parentThreadId: 'main' } } } },
      { direction: 'recv', message: { method: 'item/completed', params: { item: { type: 'agentMessage', text: 'x', agent: 'narrative-writer' } } } },
    ]
    const evidence = extractSpawnEvidence(events as any)
    expect(evidence.subagent_threads).toEqual([
      { thread_id: 'sub-1', parent_thread_id: 'main', agent: 'story-architect' },
      { thread_id: 'sub-2', parent_thread_id: 'main', agent: '' },
    ])
    expect(evidence.agent_hints).toEqual(['story-architect', 'narrative-writer'])
  })

  test('empty events -> empty evidence', () => {
    expect(extractSpawnEvidence([])).toEqual({ subagent_threads: [], agent_hints: [] })
  })

  test('collects Codex 0.147 collabAgentToolCall spawnAgent receiver threads', () => {
    const evidence = extractSpawnEvidence([
      {
        direction: 'recv',
        message: {
          method: 'item/started',
          params: {
            item: {
              type: 'collabAgentToolCall',
              tool: 'spawnAgent',
              senderThreadId: 'main',
              receiverThreadIds: ['sub-3'],
              prompt: 'OK',
            },
          },
        },
      },
      {
        direction: 'recv',
        message: {
          method: 'item/completed',
          params: {
            item: {
              type: 'collabAgentToolCall',
              tool: 'wait',
              senderThreadId: 'main',
              receiverThreadIds: ['sub-3'],
            },
          },
        },
      },
    ] as any)
    expect(evidence.subagent_threads).toEqual([
      { thread_id: 'sub-3', parent_thread_id: 'main', agent: '' },
    ])
  })
})
