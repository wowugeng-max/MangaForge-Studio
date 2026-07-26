import { describe, expect, test } from 'bun:test'
import { resolveAgentPreferredModelId } from './executor'
import { buildAgentMessages } from './executor-helpers'

describe('resolveAgentPreferredModelId', () => {
  const project: any = {
    reference_config: {
      model_strategy: {
        preferred_model_id: 128,
        stages: {
          incubation: { model_id: 129 },
          outline: { model_id: 130 },
          draft: { model_id: 131 },
          review: { model_id: 132 },
        },
      },
    },
  }

  test('keeps explicit model id when provided', () => {
    expect(resolveAgentPreferredModelId('market-agent', project, '27')).toBe(27)
  })

  test('routes incubation agents to incubation stage model', () => {
    expect(resolveAgentPreferredModelId('market-agent', project)).toBe(129)
    expect(resolveAgentPreferredModelId('world-agent', project)).toBe(129)
    expect(resolveAgentPreferredModelId('character-agent', project)).toBe(129)
  })

  test('routes outline agents to outline stage model', () => {
    expect(resolveAgentPreferredModelId('outline-agent', project)).toBe(130)
    expect(resolveAgentPreferredModelId('detail-outline-agent', project)).toBe(130)
    expect(resolveAgentPreferredModelId('continuity-check-agent', project)).toBe(130)
  })

  test('falls back to preferred model id when stage model is missing', () => {
    expect(resolveAgentPreferredModelId('unknown-agent', project)).toBe(128)
  })
})

describe('buildAgentMessages system prompt injections', () => {
  const project: any = {
    title: '测试作品',
    genre: '玄幻',
    reference_config: {},
  }
  const context: any = {
    task: '写第1章正文',
    memoryInjectionText: 'MEMORY_FACT_主角已在第3章突破金丹期',
    knowledgeInjectionText: '\n\nKNOWLEDGE_REF_写作技巧参考段',
    upstreamContext: { 'outline-agent': { volume: 'UPSTREAM_第一卷章纲' } },
  }

  const expectInjectedSections = (system: string) => {
    expect(system).toContain('【作品信息】') // styleGuardrails
    expect(system).toContain('MEMORY_FACT_主角已在第3章突破金丹期') // 记忆宫殿注入
    expect(system).toContain('KNOWLEDGE_REF_写作技巧参考段') // 知识库注入
    expect(system).toContain('前置 Agent 输出') // upstreamContext
  }

  test('prose-agent system keeps styleGuardrails/memory/knowledge/upstream sections', () => {
    const [systemMsg] = buildAgentMessages('prose-agent', project, context)
    expect(systemMsg.role).toBe('system')
    const system = String(systemMsg.content)
    expect(system).toContain('【角色设定 · 资深网文作者】') // prose-agent persona 分支保留
    expectInjectedSections(system)
  })

  test('non-prose agent system keeps styleGuardrails/memory/knowledge/upstream sections', () => {
    const [systemMsg] = buildAgentMessages('world-agent', project, context)
    expect(systemMsg.role).toBe('system')
    const system = String(systemMsg.content)
    expectInjectedSections(system)
  })
})
